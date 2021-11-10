/*
    Live webcam picture-in-picture plugin for reveal.js.
    Inspired by: http://vxlabs.com/2013/10/11/impress-js-with-embedded-live-webcam/
    Plugin author: Alex Dainiak
    Web: https://github.com/dainiak
    Email: dainiak@gmail.com
 */

const RevealWebcam = {
    id: 'webcam',
    init: (reveal) => {
        let revealViewport = reveal.getViewportElement();

        let options = reveal.getConfig().webcam || {};
        options = {
            keys: {
                toggle: options.keys && options.keys.toggle || 'c',
                fullscreen: options.keys && options.keys.fullscreen || 'C'
            },
            fullscreen: {
                enabled: (options.fullscreen && options.fullscreen.enabled) !== false,
                opacity: options.fullscreen && options.fullscreen.opacity || '1.0',
                shrinkOnOverview: (options.fullscreen && options.fullscreen.shrinkOnOverview) !== false,
                horizontalPadding: (options.fullscreen && options.fullscreen.horizontalPadding) !== undefined ? options.fullscreen.horizontalPadding: 20,
                verticalPadding: (options.fullscreen && options.fullscreen.verticalPadding) !== undefined ? options.fullscreen.verticalPadding: 20
            },
            sidecam: {
                enabled: (options.sidecam && options.sidecam.enabled) !== false,
                style: {
                    left: '20px',
                    top: '20px',
                    height: '100px',
                    position: 'absolute',
                    transition: '0.5s ease',
                    opacity: '0.3',
                    'z-index': '100'
                }
            }
        };

        let currentlyFullscreen = false;
        let currentlyHidden = false;

        let permanentCam = reveal.getViewportElement().querySelector('video.webcam.permanent');
        if(!permanentCam && options.sidecam.enabled) {
            permanentCam = document.createElement('video');
            permanentCam.classList.add('webcam');
            permanentCam.classList.add('permanent');
            for(let attr in options.sidecam.style)
                permanentCam.style.setProperty(attr, options.sidecam.style[attr]);

            reveal.getViewportElement().appendChild(permanentCam);
        }

        function shrinkWebcamVideo() {
            if (!permanentCam)
                return;
            if (!currentlyHidden && permanentCam.hasAttribute('data-webcam-old-opacity'))
                permanentCam.style.opacity = permanentCam.getAttribute('data-webcam-old-opacity');

            for(let attr of ['left', 'right', 'top', 'bottom', 'width', 'height']){
                if (permanentCam.hasAttribute('data-webcam-old-'+attr))
                    permanentCam.style.setProperty(attr, permanentCam.getAttribute('data-webcam-old-'+attr));
            }
        }

        function expandWebcamVideo() {
            if (!permanentCam)
                return;
            let viewportWidth = revealViewport.clientWidth;
            let viewportHeight = revealViewport.clientHeight;

            let videoHeight = permanentCam.videoHeight;
            let videoWidth = permanentCam.videoWidth;
            // If video size is completely specified by user take this as canonical video dimensions
            if (permanentCam.style.width && permanentCam.style.height) {
                videoHeight = parseInt(permanentCam.style.height);
                videoWidth = parseInt(permanentCam.style.width);
            }

            let wRatio = (videoWidth + 2 * options.fullscreen.horizontalPadding) / viewportWidth;
            let hRatio = (videoHeight + 2 * options.fullscreen.verticalPadding) / viewportHeight;

            if (!currentlyHidden) {
                if (!permanentCam.hasAttribute('data-webcam-old-opacity')) {
                    permanentCam.setAttribute('data-webcam-old-opacity', permanentCam.style.opacity);
                }
                permanentCam.style.opacity = options.fullscreen.opacity;
            }

            let newVideoWidth, newVideoHeight, horizontalPadding, verticalPadding;
            if (wRatio > hRatio) {
                newVideoWidth = Math.round(viewportWidth - 2 * options.fullscreen.horizontalPadding);
                newVideoHeight = Math.round(newVideoWidth * videoHeight / videoWidth);
                horizontalPadding = options.fullscreen.horizontalPadding;
                verticalPadding = Math.round(0.5 * (viewportHeight - newVideoHeight));
            } else {
                newVideoHeight = Math.round(viewportHeight - 2 * options.fullscreen.verticalPadding);
                newVideoWidth = Math.round(newVideoHeight * videoWidth / videoHeight);
                horizontalPadding = Math.round(0.5 * (viewportWidth - newVideoWidth));
                verticalPadding = options.fullscreen.verticalPadding;
            }

            let newVideoElementStyle = {
                left: horizontalPadding,
                right: horizontalPadding,
                top: verticalPadding,
                bottom: verticalPadding,
                height: newVideoHeight,
                width: newVideoWidth
            };

            for(let attr of ['left', 'right', 'top', 'bottom', 'width', 'height']){
                if (permanentCam.style[attr]) {
                    permanentCam.setAttribute('data-webcam-old-' + attr, permanentCam.style[attr]);
                    permanentCam.style.setProperty(attr, newVideoElementStyle[attr].toString() + 'px');
                }
            }
        }

        reveal.addEventListener('ready', function () {
            if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
                console.warn('Couldn\'t retrieve webcam video: feature unsupported by your browser');
                return;
            }
            navigator.mediaDevices.getUserMedia({video: true}).then(function (localMediaStream) {
                for (let webcamContainer of revealViewport.querySelectorAll('video.webcam')) {
                    webcamContainer.srcObject = localMediaStream;
                    webcamContainer.setAttribute('autoplay', 'true');
                    webcamContainer.setAttribute('data-autoplay', 'true');
                }

                if (!permanentCam)
                    return;

                permanentCam.srcObject = localMediaStream;
                permanentCam.setAttribute('autoplay', 'true');
                if (options.fullscreen.shrinkOnOverview) {
                    reveal.addEventListener('overviewshown', function () {
                        if (currentlyFullscreen && !currentlyHidden) {
                            shrinkWebcamVideo();
                            currentlyFullscreen = false;
                        }
                    });
                }

                document.addEventListener('keydown', function (event) {
                    if (document.querySelector(':focus') !== null || event.altKey || event.ctrlKey || event.metaKey)
                        return;

                    let config = reveal.getConfig();
                    if(config.keyboardCondition === 'focused' && ! reveal.isFocused())
                        return true;
                    if(config.keyboardCondition === 'function' && config.keyboardCondition(event) === false ) {
                        return true;
                    }

                    if (event.key === options.keys.toggle && options.sidecam.enabled || event.key === options.keys.fullscreen && options.fullscreen.enabled) {
                        event.preventDefault();

                        if (event.key === options.keys.fullscreen) {
                            currentlyFullscreen ? shrinkWebcamVideo() : expandWebcamVideo();
                            currentlyFullscreen = !currentlyFullscreen;
                        } else {
                            if (currentlyHidden) {
                                permanentCam.style.opacity = currentlyFullscreen ? options.fullscreen.opacity : permanentCam.getAttribute('data-webcam-old-opacity');
                                currentlyHidden = false;
                            }
                            else {
                                if (!permanentCam.hasAttribute('data-webcam-old-opacity')) {
                                    permanentCam.setAttribute('data-webcam-old-opacity', permanentCam.style.opacity);
                                }

                                permanentCam.style.opacity = '0';
                                currentlyHidden = true;
                            }
                        }
                    }
                }, false);
            }).catch(
                function (err) {
                    console.warn(err);
                }
            );
        });
    }
};
