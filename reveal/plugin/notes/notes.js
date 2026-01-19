(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.RevealNotes = factory());
})(this, (function () {
    'use strict';

    const Plugin = () => {
        let connectInterval;
        let speakerWindow = null;
        let deck;

        /**
         * Determine the path of the current script so we can find
         * the sibling HTML/CSS files.
         */
        function getPluginPath() {
            const script = document.currentScript || document.querySelector('script[src$="notes.js"]');
            if (script) {
                const path = script.src;
                return path.substring(0, path.lastIndexOf('/') + 1);
            }
            // Fallback default
            return 'plugin/notes/';
        }

        /**
         * Opens a new speaker view window.
         */
        function openSpeakerWindow() {
            // If a window is already open, focus it
            if (speakerWindow && !speakerWindow.closed) {
                speakerWindow.focus();
            } else {
                speakerWindow = window.open('about:blank', 'reveal.js - Notes', 'width=1100,height=700');

                if (!speakerWindow) {
                    alert('Speaker view popup failed to open. Please make sure popups are allowed and reopen the speaker view.');
                    return;
                }

                // Load the HTML from disk instead of a hardcoded string
                const pluginPath = getPluginPath();
                fetch(pluginPath + 'speaker-view.html')
                    .then(response => {
                        if (!response.ok) throw new Error("Could not find speaker-view.html");
                        return response.text();
                    })
                    .then(html => {
                        // We need to ensure the HTML knows where to find its CSS/JS
                        // by injecting a base tag or assuming relative paths work
                        // if the server allows it.
                        // A robust way for 'about:blank' popups is to write the content
                        // and manually inject the correct paths for assets.

                        speakerWindow.document.write(html);

                        // Fix relative paths for CSS/JS in the popup
                        const head = speakerWindow.document.head;

                        // Inject CSS
                        const link = speakerWindow.document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = pluginPath + 'speaker-view.css';
                        head.appendChild(link);

                        // Inject JS
                        const script = speakerWindow.document.createElement('script');
                        script.src = pluginPath + 'speaker-view.js';
                        head.appendChild(script);

                        connect();
                    })
                    .catch(error => {
                        console.error('Error loading speaker view:', error);
                        speakerWindow.document.write('Error loading speaker-view.html. Check console.');
                    });
            }
        }

        /**
         * Reconnect with an existing speaker view window.
         */
        function reconnectSpeakerWindow(reconnectWindow) {
            if (speakerWindow && !speakerWindow.closed) {
                speakerWindow.focus();
            } else {
                speakerWindow = reconnectWindow;
                window.addEventListener('message', onPostMessage);
                onConnected();
            }
        }

        /**
         * Connect to the notes window through a postmessage handshake.
         */
        function connect() {
            const presentationURL = deck.getConfig().url;
            const url = typeof presentationURL === 'string' ? presentationURL : window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search;

            connectInterval = setInterval(function () {
                speakerWindow.postMessage(JSON.stringify({
                    namespace: 'reveal-notes',
                    type: 'connect',
                    state: deck.getState(),
                    url
                }), '*');
            }, 500);
            window.addEventListener('message', onPostMessage);
        }

        function callRevealApi(methodName, methodArguments, callId) {
            let result = deck[methodName].apply(deck, methodArguments);
            speakerWindow.postMessage(JSON.stringify({
                namespace: 'reveal-notes',
                type: 'return',
                result,
                callId
            }), '*');
        }

        /**
         * Posts the current slide data to the notes window.
         * MARKDOWN SUPPORT REMOVED
         */
        function post(event) {
            let slideElement = deck.getCurrentSlide(),
                notesElements = slideElement.querySelectorAll('aside.notes'),
                fragmentElement = slideElement.querySelector('.current-fragment');

            let messageData = {
                namespace: 'reveal-notes',
                type: 'state',
                notes: '',
                whitespace: 'normal',
                state: deck.getState()
            };

            // Look for notes defined in a slide attribute
            if (slideElement.hasAttribute('data-notes')) {
                messageData.notes = slideElement.getAttribute('data-notes');
                messageData.whitespace = 'pre-wrap';
            }

            // Look for notes defined in a fragment
            if (fragmentElement) {
                let fragmentNotes = fragmentElement.querySelector('aside.notes');
                if (fragmentNotes) {
                    messageData.notes = fragmentNotes.innerHTML;
                    // Ignore other slide notes
                    notesElements = null;
                } else if (fragmentElement.hasAttribute('data-notes')) {
                    messageData.notes = fragmentElement.getAttribute('data-notes');
                    messageData.whitespace = 'pre-wrap';
                    // In case there are slide notes
                    notesElements = null;
                }
            }

            // Look for notes defined in an aside element
            if (notesElements && notesElements.length) {
                notesElements = Array.from(notesElements).filter(notesElement => notesElement.closest('.fragment') === null);
                messageData.notes = notesElements.map(notesElement => notesElement.innerHTML).join('\n');
            }

            speakerWindow.postMessage(JSON.stringify(messageData), '*');
        }

        function isSameOriginEvent(event) {
            try {
                return window.location.origin === event.source.location.origin;
            } catch (error) {
                return false;
            }
        }

        function onPostMessage(event) {
            if (isSameOriginEvent(event)) {
                try {
                    let data = JSON.parse(event.data);
                    if (data && data.namespace === 'reveal-notes' && data.type === 'connected') {
                        clearInterval(connectInterval);
                        onConnected();
                    } else if (data && data.namespace === 'reveal-notes' && data.type === 'call') {
                        callRevealApi(data.methodName, data.arguments, data.callId);
                    }
                } catch (e) {
                }
            }
        }

        function onConnected() {
            deck.on('slidechanged', post);
            deck.on('fragmentshown', post);
            deck.on('fragmenthidden', post);
            deck.on('overviewhidden', post);
            deck.on('overviewshown', post);
            deck.on('paused', post);
            deck.on('resumed', post);
            deck.on('previewiframe', post);
            deck.on('previewimage', post);
            deck.on('previewvideo', post);
            deck.on('closeoverlay', post);
            post();
        }

        return {
            id: 'notes',
            init: function (reveal) {
                deck = reveal;
                if (!/receiver/i.test(window.location.search)) {
                    if (window.location.search.match(/(\?|\&)notes/gi) !== null) {
                        openSpeakerWindow();
                    } else {
                        window.addEventListener('message', event => {
                            if (!speakerWindow && typeof event.data === 'string') {
                                let data;
                                try {
                                    data = JSON.parse(event.data);
                                } catch (error) {
                                }
                                if (data && data.namespace === 'reveal-notes' && data.type === 'heartbeat') {
                                    reconnectSpeakerWindow(event.source);
                                }
                            }
                        });
                    }

                    deck.addKeyBinding({
                        keyCode: 83,
                        key: 'S',
                        description: 'Speaker notes view'
                    }, function () {
                        openSpeakerWindow();
                    });
                }
            },
            open: openSpeakerWindow
        };
    };

    return Plugin;

}));