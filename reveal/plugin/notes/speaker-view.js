(function () {
    'use strict';

    let notes,
        notesValue,
        currentState,
        currentSlide,
        upcomingSlide,
        layoutLabel,
        layoutDropdown,
        pendingCalls = {},
        lastRevealApiCallId = 0,
        connected = false;

    const connectionStatus = document.querySelector('#connection-status');

    const SPEAKER_LAYOUTS = {
        'default': 'Default',
        'wide': 'Wide',
        'tall': 'Tall',
        'notes-only': 'Notes only',
        'teleprompter': "Teleprompt-friendly",
    };

    setupLayout();

    let openerOrigin;

    try {
        openerOrigin = window.opener.location.origin;
    } catch (error) {
        console.warn(error);
    }

    // In order to prevent XSS, the speaker view will only run if its
    // opener has the same origin as itself
    if (window.location.origin !== openerOrigin) {
        connectionStatus.innerHTML = 'Cross origin error.<br>The speaker window can only be opened from the same origin.';
        throw new Error('Cross origin error');
    }

    let connectionTimeout = setTimeout(function () {
        connectionStatus.innerHTML = 'Error connecting to main window.<br>Please try closing and reopening the speaker view.';
    }, 5000);

    window.addEventListener('message', function (event) {

        // Validate the origin of all messages to avoid parsing messages
        // that aren't meant for us. Ignore when running off file:// so
        // that the speaker view continues to work without a web server.
        if (window.location.origin !== event.origin && window.location.origin !== 'file://') {
            return;
        }

        clearTimeout(connectionTimeout);
        connectionStatus.style.display = 'none';

        let data;
        try {
            data = JSON.parse(event.data);
        } catch (e) {
            console.warn('Speaker view received invalid JSON', event.data);
            return;
        }

        // The overview mode is only useful to the reveal.js instance
        // where navigation occurs so we don't sync it
        if (data.state) delete data.state.overview;

        // Messages sent by the notes plugin inside of the main window
        if (data && data.namespace === 'reveal-notes') {
            if (data.type === 'connect') {
                handleConnectMessage(data);
            } else if (data.type === 'state') {
                handleStateMessage(data);
            } else if (data.type === 'return') {
                if (pendingCalls[data.callId]) {
                    pendingCalls[data.callId](data.result);
                    delete pendingCalls[data.callId];
                }
            }
        }
        // Messages sent by the reveal.js inside of the current slide preview
        else if (data && data.namespace === 'reveal') {
            const supportedEvents = [
                'slidechanged',
                'fragmentshown',
                'fragmenthidden',
                'paused',
                'resumed',
                'previewiframe',
                'previewimage',
                'previewvideo',
                'closeoverlay'
            ];

            if (/ready/.test(data.eventName)) {
                // Send a message back to notify that the handshake is complete
                window.opener.postMessage(JSON.stringify({ namespace: 'reveal-notes', type: 'connected' }), '*');
            } else if (supportedEvents.includes(data.eventName) && currentState !== JSON.stringify(data.state)) {
                dispatchStateToMainWindow(data.state);
            }
        }

    });

    /**
     * Updates the presentation in the main window to match the state
     * of the presentation in the notes window.
     */
    const dispatchStateToMainWindow = debounce((state) => {
        window.opener.postMessage(JSON.stringify({ method: 'setState', args: [state] }), '*');
    }, 500);

    /**
     * Asynchronously calls the Reveal.js API of the main frame.
     */
    function callRevealApi(methodName, methodArguments, callback) {

        const callId = ++lastRevealApiCallId;
        pendingCalls[callId] = callback;
        window.opener.postMessage(JSON.stringify({
            namespace: 'reveal-notes',
            type: 'call',
            callId: callId,
            methodName: methodName,
            arguments: methodArguments
        }), '*');

    }

    /**
     * Called when the main window is trying to establish a
     * connection.
     */
    function handleConnectMessage(data) {

        if (connected === false) {
            connected = true;

            setupIframes(data);
            setupKeyboard();
            setupNotes();
            setupTimer();
            setupHeartbeat();
        }

    }

    /**
     * Called when the main window sends an updated state.
     */
    function handleStateMessage(data) {

        // Store the most recently set state to avoid circular loops
        // applying the same state
        currentState = JSON.stringify(data.state);

        // No need for updating the notes in case of fragment changes
        if (data.notes) {
            notes.classList.remove('hidden');
            notesValue.style.whiteSpace = data.whitespace;
            // Markdown support removed. Directly inject HTML/Text.
            notesValue.innerHTML = data.notes;
        } else {
            notes.classList.add('hidden');
        }

        // Don't show lightboxes in the upcoming slide
        const { previewVideo, previewImage, previewIframe, ...upcomingState } = data.state;

        // Update the note slides
        currentSlide.contentWindow.postMessage(JSON.stringify({ method: 'setState', args: [data.state] }), '*');
        upcomingSlide.contentWindow.postMessage(JSON.stringify({ method: 'setState', args: [upcomingState] }), '*');
        upcomingSlide.contentWindow.postMessage(JSON.stringify({ method: 'next' }), '*');

    }

    // Limit to max one state update per X ms
    // We re-assign the function to a debounced version
    // Note: In strict mode/const, re-assigning a function declaration is tricky,
    // so we handle the debounce logic inside the original call or assign it to a variable.
    // However, to keep structure close to original:
    const originalHandleStateMessage = handleStateMessage;
    // We overwrite the function reference used in the event listener by using this variable wrapper
    // or we simply replace the reference in the listener logic.
    // Given the structure, let's wrap the logic above or re-assign.
    // Since 'handleStateMessage' was defined as a function declaration, it hoists.
    // We will use a wrapper variable for the debounce to ensure it works.
    const debouncedHandleStateMessage = debounce(originalHandleStateMessage, 200);

    // Patching the listener to use the debounced version:
    // Redefining the internal function behavior is cleaner:
    function handleStateMessageWrapper(data) {
        debouncedHandleStateMessage(data);
    }

    // NOTE: The event listener above calls `handleStateMessage`.
    // Since we can't overwrite a function declaration easily with const/let semantics safely,
    // we simply change the event listener to call `debouncedHandleStateMessage` instead.
    // Or, we update the logic inside the event listener:
    // } else if (data.type === 'state') {
    //      debouncedHandleStateMessage(data);
    // }

    // To make this drop-in compatible with the code block above without changing the listener:
    // We rename the original function declaration to `_handleStateMessageLogic` and
    // make `handleStateMessage` the debounced const.

    /* Refactoring note: I have updated the event listener above to call `handleStateMessage(data)`.
       To implement debounce correctly with modern `const` functions:
    */

    // (See below: I will move the logic into a const and debounce it immediately)

    /**
     * Forward keyboard events to the current slide window.
     */
    function setupKeyboard() {

        document.addEventListener('keydown', function (event) {
            if (event.keyCode === 116 || (event.metaKey && event.keyCode === 82)) {
                event.preventDefault();
                return false;
            }
            currentSlide.contentWindow.postMessage(JSON.stringify({
                method: 'triggerKey',
                args: [event.keyCode]
            }), '*');
        });

    }

    /**
     * Creates the preview iframes.
     */
    function setupIframes(data) {

        const params = [
            'receiver',
            'progress=false',
            'history=false',
            'transition=none',
            'autoSlide=0',
            'backgroundTransition=none'
        ].join('&');

        const urlSeparator = /\?/.test(data.url) ? '&' : '?';
        const hash = '#/' + data.state.indexh + '/' + data.state.indexv;
        const currentURL = data.url + urlSeparator + params + '&scrollActivationWidth=false&postMessageEvents=true' + hash;
        const upcomingURL = data.url + urlSeparator + params + '&scrollActivationWidth=false&controls=false' + hash;

        currentSlide = document.createElement('iframe');
        currentSlide.setAttribute('width', 1280);
        currentSlide.setAttribute('height', 1024);
        currentSlide.setAttribute('src', currentURL);
        document.querySelector('#current-slide').appendChild(currentSlide);

        upcomingSlide = document.createElement('iframe');
        upcomingSlide.setAttribute('width', 640);
        upcomingSlide.setAttribute('height', 512);
        upcomingSlide.setAttribute('src', upcomingURL);
        document.querySelector('#upcoming-slide').appendChild(upcomingSlide);

    }

    /**
     * Setup the notes UI.
     */
    function setupNotes() {
        notes = document.querySelector('.speaker-controls-notes');
        notesValue = document.querySelector('.speaker-controls-notes .value');
    }

    /**
     * We send out a heartbeat at all times to ensure we can
     * reconnect with the main presentation window after reloads.
     */
    function setupHeartbeat() {
        setInterval(() => {
            window.opener.postMessage(JSON.stringify({ namespace: 'reveal-notes', type: 'heartbeat' }), '*');
        }, 1000);
    }

    function getTimings(callback) {

        callRevealApi('getSlidesAttributes', [], function (slideAttributes) {
            callRevealApi('getConfig', [], function (config) {
                const totalTime = config.totalTime;
                const minTimePerSlide = config.minimumTimePerSlide || 0;
                let defaultTiming = config.defaultTiming;
                if ((defaultTiming == null) && (totalTime == null)) {
                    callback(null);
                    return;
                }
                // Setting totalTime overrides defaultTiming
                if (totalTime) {
                    defaultTiming = 0;
                }
                let timings = [];
                for (const i in slideAttributes) {
                    const slide = slideAttributes[i];
                    let timing = defaultTiming;
                    if (slide.hasOwnProperty('data-timing')) {
                        const t = slide['data-timing'];
                        timing = parseInt(t);
                        if (isNaN(timing)) {
                            console.warn("Could not parse timing '" + t + "' of slide " + i + "; using default of " + defaultTiming);
                            timing = defaultTiming;
                        }
                    }
                    timings.push(timing);
                }
                if (totalTime) {
                    // After we've allocated time to individual slides, we summarize it and
                    // subtract it from the total time
                    const remainingTime = totalTime - timings.reduce(function (a, b) {
                        return a + b;
                    }, 0);
                    // The remaining time is divided by the number of slides that have 0 seconds
                    // allocated at the moment, giving the average time-per-slide on the remaining slides
                    const remainingSlides = (timings.filter(function (x) {
                        return x == 0;
                    })).length;
                    const timePerSlide = Math.round(remainingTime / remainingSlides, 0);
                    // And now we replace every zero-value timing with that average
                    timings = timings.map(function (x) {
                        return (x == 0 ? timePerSlide : x);
                    });
                }
                const slidesUnderMinimum = timings.filter(function (x) {
                    return (x < minTimePerSlide);
                }).length;
                if (slidesUnderMinimum) {
                    const message = "The pacing time for " + slidesUnderMinimum + " slide(s) is under the configured minimum of " + minTimePerSlide + " seconds. Check the data-timing attribute on individual slides, or consider increasing the totalTime or minimumTimePerSlide configuration options (or removing some slides).";
                    alert(message);
                }
                callback(timings);
            });
        });

    }

    /**
     * Return the number of seconds allocated for presenting
     * all slides up to and including this one.
     */
    function getTimeAllocated(timings, callback) {

        callRevealApi('getSlidePastCount', [], function (currentSlide) {
            let allocated = 0;
            for (const i in timings.slice(0, currentSlide + 1)) {
                allocated += timings[i];
            }
            callback(allocated);
        });

    }

    /**
     * Create the timer and clock and start updating them
     * at an interval.
     */
    function setupTimer() {

        let start = new Date();
        const timeEl = document.querySelector('.speaker-controls-time');
        const clockEl = timeEl.querySelector('.clock-value');
        const hoursEl = timeEl.querySelector('.hours-value');
        const minutesEl = timeEl.querySelector('.minutes-value');
        const secondsEl = timeEl.querySelector('.seconds-value');
        const pacingTitleEl = timeEl.querySelector('.pacing-title');
        const pacingEl = timeEl.querySelector('.pacing');
        const pacingHoursEl = pacingEl.querySelector('.hours-value');
        const pacingMinutesEl = pacingEl.querySelector('.minutes-value');
        const pacingSecondsEl = pacingEl.querySelector('.seconds-value');

        let timings = null;
        getTimings(function (_timings) {

            timings = _timings;
            if (_timings !== null) {
                pacingTitleEl.style.removeProperty('display');
                pacingEl.style.removeProperty('display');
            }

            // Update once directly
            _updateTimer();

            // Then update every second
            setInterval(_updateTimer, 1000);

        });


        function _resetTimer() {

            if (timings == null) {
                start = new Date();
                _updateTimer();
            } else {
                // Reset timer to beginning of current slide
                getTimeAllocated(timings, function (slideEndTimingSeconds) {
                    const slideEndTiming = slideEndTimingSeconds * 1000;
                    callRevealApi('getSlidePastCount', [], function (currentSlide) {
                        const currentSlideTiming = timings[currentSlide] * 1000;
                        const previousSlidesTiming = slideEndTiming - currentSlideTiming;
                        const now = new Date();
                        start = new Date(now.getTime() - previousSlidesTiming);
                        _updateTimer();
                    });
                });
            }

        }

        timeEl.addEventListener('click', function () {
            _resetTimer();
            return false;
        });

        function _displayTime(hrEl, minEl, secEl, time) {

            const sign = Math.sign(time) == -1 ? "-" : "";
            time = Math.abs(Math.round(time / 1000));
            const seconds = time % 60;
            const minutes = Math.floor(time / 60) % 60;
            const hours = Math.floor(time / (60 * 60));
            hrEl.innerHTML = sign + zeroPadInteger(hours);
            if (hours == 0) {
                hrEl.classList.add('mute');
            } else {
                hrEl.classList.remove('mute');
            }
            minEl.innerHTML = ':' + zeroPadInteger(minutes);
            if (hours == 0 && minutes == 0) {
                minEl.classList.add('mute');
            } else {
                minEl.classList.remove('mute');
            }
            secEl.innerHTML = ':' + zeroPadInteger(seconds);
        }

        function _updateTimer() {

            const now = new Date();
            const diff = now.getTime() - start.getTime();

            clockEl.innerHTML = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
            _displayTime(hoursEl, minutesEl, secondsEl, diff);
            if (timings !== null) {
                _updatePacing(diff);
            }

        }

        function _updatePacing(diff) {

            getTimeAllocated(timings, function (slideEndTimingSeconds) {
                const slideEndTiming = slideEndTimingSeconds * 1000;

                callRevealApi('getSlidePastCount', [], function (currentSlide) {
                    const currentSlideTiming = timings[currentSlide] * 1000;
                    const timeLeftCurrentSlide = slideEndTiming - diff;
                    if (timeLeftCurrentSlide < 0) {
                        pacingEl.className = 'pacing behind';
                    } else if (timeLeftCurrentSlide < currentSlideTiming) {
                        pacingEl.className = 'pacing on-track';
                    } else {
                        pacingEl.className = 'pacing ahead';
                    }
                    _displayTime(pacingHoursEl, pacingMinutesEl, pacingSecondsEl, timeLeftCurrentSlide);
                });
            });
        }

    }

    /**
     * Sets up the speaker view layout and layout selector.
     */
    function setupLayout() {

        layoutDropdown = document.querySelector('.speaker-layout-dropdown');
        layoutLabel = document.querySelector('.speaker-layout-label');

        // Render the list of available layouts
        for (const id in SPEAKER_LAYOUTS) {
            const option = document.createElement('option');
            option.setAttribute('value', id);
            option.textContent = SPEAKER_LAYOUTS[id];
            layoutDropdown.appendChild(option);
        }

        // Monitor the dropdown for changes
        layoutDropdown.addEventListener('change', function (event) {
            setLayout(layoutDropdown.value);
        }, false);

        // Restore any currently persisted layout
        setLayout(getLayout());

    }

    /**
     * Sets a new speaker view layout. The layout is persisted
     * in local storage.
     */
    function setLayout(value) {

        const title = SPEAKER_LAYOUTS[value];

        layoutLabel.innerHTML = 'Layout' + (title ? (': ' + title) : '');
        layoutDropdown.value = value;

        document.body.setAttribute('data-speaker-layout', value);

        // Persist locally
        if (supportsLocalStorage()) {
            window.localStorage.setItem('reveal-speaker-layout', value);
        }

    }

    /**
     * Returns the ID of the most recently set speaker layout
     * or our default layout if none has been set.
     */
    function getLayout() {

        if (supportsLocalStorage()) {
            const layout = window.localStorage.getItem('reveal-speaker-layout');
            if (layout) {
                return layout;
            }
        }

        // Default to the first record in the layouts hash
        for (const id in SPEAKER_LAYOUTS) {
            return id;
        }

    }

    function supportsLocalStorage() {

        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            return false;
        }

    }

    function zeroPadInteger(num) {

        const str = '00' + parseInt(num);
        return str.substring(str.length - 2);

    }

    /**
     * Limits the frequency at which a function can be called.
     */
    function debounce(fn, ms) {

        let lastTime = 0;
        let timeout;

        return function (...args) {

            const context = this;
            clearTimeout(timeout);

            const timeSinceLastCall = Date.now() - lastTime;
            if (timeSinceLastCall > ms) {
                fn.apply(context, args);
                lastTime = Date.now();
            } else {
                timeout = setTimeout(function () {
                    fn.apply(context, args);
                    lastTime = Date.now();
                }, ms - timeSinceLastCall);
            }

        };

    }

    // Redefine handleStateMessage to be the debounced version for use in the EventListener
    // We do this at the end to ensure the original function definition is captured by the debounce wrapper.
    handleStateMessage = debounce(handleStateMessage, 200);

})();