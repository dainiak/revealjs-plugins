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
                opacity: options.fullscreen && options.fullscreen.opacity || '1.0',
                shrinkOnOverview: (options.fullscreen && options.fullscreen.shrinkOnOverview) !== false,
                horizontalPadding: (options.fullscreen && options.fullscreen.horizontalPadding) !== undefined ? options.fullscreen.horizontalPadding: 20,
                verticalPadding: (options.fullscreen && options.fullscreen.verticalPadding) !== undefined ? options.fullscreen.verticalPadding: 20
            }
        };

        let currentlyFullscreen = false;
        let currentlyHidden = false;

        let video = reveal.getViewportElement().querySelector('video.webcam.permanent');
        if(!video) {
            video = document.createElement('video');
            video.classList.add('webcam');
            video.classList.add('permanent');
            video.style.left = '20px';
            video.style.top = '20px';
            video.style.height = '100px';
            video.style.position = 'absolute';
            video.style.zIndex = '100';
            video.style.transition = '0.5s ease';
            video.style.opacity = '0.3';
            reveal.getViewportElement().appendChild(video);
        }

        function shrinkWebcamVideo(videoElement) {
            if (!currentlyHidden && videoElement.hasAttribute('data-webcam-old-opacity'))
                videoElement.style.opacity = videoElement.getAttribute('data-webcam-old-opacity');

            for(let attr of ['left', 'right', 'top', 'bottom', 'width', 'height']){
                if (videoElement.hasAttribute('data-webcam-old-'+attr))
                    videoElement.style[attr] = videoElement.getAttribute('data-webcam-old-'+attr);
            }
        }

        function expandWebcamVideo(videoElement) {
            let viewportWidth = revealViewport.clientWidth;
            let viewportHeight = revealViewport.clientHeight;

            let videoHeight = videoElement.videoHeight;
            let videoWidth = videoElement.videoWidth;
            // If video size is completely specified by user take this as canonical video dimensions
            if (videoElement.style.width && videoElement.style.height) {
                videoHeight = parseInt(videoElement.style.height);
                videoWidth = parseInt(videoElement.style.width);
            }

            let wRatio = (videoWidth + 2 * options.fullscreen.horizontalPadding) / viewportWidth;
            let hRatio = (videoHeight + 2 * options.fullscreen.verticalPadding) / viewportHeight;

            if (!currentlyHidden) {
                if (!videoElement.hasAttribute('data-webcam-old-opacity')) {
                    videoElement.setAttribute('data-webcam-old-opacity', videoElement.style.opacity);
                }
                videoElement.style.opacity = options.fullscreen.opacity;
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
                if (videoElement.style[attr]) {
                    videoElement.setAttribute('data-webcam-old-' + attr, videoElement.style[attr]);
                    videoElement.style[attr] = newVideoElementStyle[attr].toString() + 'px';
                }
            }
        }

        reveal.addEventListener('ready', function () {
            if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
                console.warn('Couldn\'t retrieve webcam video: feature unsupported by your browser');
                return;
            }
            navigator.mediaDevices.getUserMedia({video: true}).then(function (localMediaStream) {
                let webcamContainers = revealViewport.querySelectorAll('video.webcam');
                for (let i = 0; i < webcamContainers.length; ++i) {
                    webcamContainers[i].srcObject = localMediaStream;
                    webcamContainers[i].setAttribute('autoplay', 'true');
                    webcamContainers[i].setAttribute('data-autoplay', 'true');
                }

                let permanentCam = revealViewport.querySelector('video.webcam.permanent');
                if (permanentCam) {
                    permanentCam.srcObject = localMediaStream;
                    permanentCam.setAttribute('autoplay', 'true');
                    if (options.fullscreen.shrinkOnOverview) {
                        reveal.addEventListener('overviewshown', function () {
                            if (currentlyFullscreen && !currentlyHidden) {
                                shrinkWebcamVideo(permanentCam);
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

                        if ([options.keys.toggle, options.keys.fullscreen].includes(event.key)) {
                            event.preventDefault();

                            if (event.key === options.keys.fullscreen) {
                                currentlyFullscreen ? shrinkWebcamVideo(permanentCam) : expandWebcamVideo(permanentCam);
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
                }
            }).catch(
                function (err) {
                    console.warn(err);
                }
            );
        });
    }
};

// export default () => RevealWebcam;