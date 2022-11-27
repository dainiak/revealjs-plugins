/*
    Inking plugin for reveal.js

    Plugin author: Alex Dainiak, Assoc. Prof. at Moscow Institute of Physics and Technology: https://mipt.ru/english/
    Web: www.dainiak.com
    Email: dainiak@gmail.com

    Plugin development was supported by a Vladimir Potanin Foundation grant: http://english.fondpotanin.ru/

    The plugin is powered by:
        Reveal.js:   https://github.com/hakimel/reveal.js     (MIT license)
        Fabric.js:   https://github.com/kangax/fabric.js      (MIT license)
        MathJax:     https://github.com/mathjax/MathJax       (Apache-2.0 license)
*/

const RevealInking = {
    id: 'inking',
    init: (reveal) => {
        let options = reveal.getConfig().inking || {};

        options.canvasAboveControls = !!(options.canvasAboveControls);
        let controlsVisible = options.controls !== false;
        options.controls = options.controls || {};
        options.controls = {
            visible: controlsVisible,
            color: options.controls.color || '#444444',
            activeColor: options.controls.activeColor || '#00ffff',
            shadow: options.controls.shadow || '0 0 5px black',
            opacity: options.controls.opacity || 1,
            colorChoosersAlwaysVisible: options.controls.colorChoosersAlwaysVisible !== false
        };

        options.ink = options.ink || {};
        options.ink = {
            colors: options.ink.color || options.ink.colors || [
                'rgb(250,250,250)',
                'rgb(250,0,0)',
                'rgb(0,250,0)',
                'rgb(0,0,250)',
                'rgb(0,0,0)'
            ],
            shadow: options.ink.shadow !== undefined ? options.ink.shadow : 'rgb(50,50,50)'
        };
        let currentInkColor = Array.isArray(options.ink.colors) ? options.ink.colors[0] : options.ink.colors;

        let mathEnabled = options.math !== false;
        options.math = options.math || {};
        options.math = {
            enabled: mathEnabled,
            color: options.math.color || 'rgb(250,250,250)',
            shadow: options.math.shadow || false,
            scaleToSlideText: options.math.scaleToSlideText !== false,
            displayStyle: options.math.displayStyle !== false,
            scaling: options.math.scaling || 1,
            preamble: (options.math && options.math.preamble) ? ('{' + options.math.preamble + '}') : ''
        };

        let spotlightEnabled = options.spotlight !== false;
        options.spotlight = options.spotlight || {};
        options.spotlight = {
            enabled: spotlightEnabled,
            backgroundOpacity: options.spotlight.backgroundOpacity || 0.5,
            radius: options.spotlight.radius || 100
        };

        options.inkingCanvasContent = options.inkingCanvasContent || null;

        let mousePosition = {};

        let canvasElement = null;
        let canvas = null;
        let currentCanvasSlide = null;

        let canvasVisibleBeforeRevealOverview = null;

        options.hotkeys = options.hotkeys || {};
        options.hotkeys = {
            draw: options.hotkeys.draw || 'Control',
            erase: options.hotkeys.erase || 'Shift',
            toggleCanvas: options.hotkeys.toggleCanvas || 'q',
            insertMath: options.hotkeys.insertMath || '=',
            delete: options.hotkeys.delete || 'Delete',
            clear: options.hotkeys.clear || '-',
            serializeCanvas: options.hotkeys.serializeCanvas || 'z',
            spotlight: options.hotkeys.spotlight || 'x'
        };

        let currentMathImage = null;
        let isInDeletionMode = false;
        let isMouseLeftButtonDown = false;
        let mathRenderingDiv = null;
        let spotlight = null;
        let spotlightBackground = null;

        let inkControlButtons = {
            pencil: null,
            erase: null,
            formula: null,
            clear: null,
            hideCanvas: null,
            serializeCanvas: null
        };

        let needToLoadOwnMath = options.math.enabled && (reveal.getPlugin('math') || {}).renderer !== 'mathjax' && !(window.MathJax || {}).version;

        let scriptsToLoad = [
            {
                content: '.ink-controls {position: fixed;bottom: 10px;right: 200px;cursor: default;'
                    + (options.controls.color ? 'color: ' + options.controls.color + ';' : '')
                    + (options.controls.visible ? '' : 'display: none;')
                    + (options.controls.opacity ? 'opacity: ' + options.controls.opacity + ';' : '')
                    + 'z-index: 130;}'
                    + '.ink-control-button {float: left;display: inline;font-size: 20pt;padding-left: 10pt; padding-right: 10pt;}'
                    + '.ink-color:before {content: "\u25A0"} '
                    + '.ink-pencil:before {content: "\u270E"} '
                    + '.ink-erase:before {content: "\u2421"} '
                    + '.ink-formula:before {content: "\u2211"} '
                    + '.ink-clear:before {content: "\u239A"} '
                    + '.ink-hidecanvas:before {content: "\u22A0"} '
                    + '.ink-serializecanvas:before {content: "\u2B07"} ',
                type: 'text/css'
            }, {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.2.4/fabric.min.js',
                condition: !window.fabric
            },
            {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg-full.min.js',
                condition: needToLoadOwnMath
            }
        ];

        if(needToLoadOwnMath) {
            window.MathJax = {
                options: {
                    renderActions: {
                        addMenu: [0, '', '']
                    },
                    skipHtmlTags: [
                        "svg",
                        "script",
                        "noscript",
                        "style",
                        "textarea",
                        "pre",
                        "code"
                    ]
                },
                startup: {
                    typeset: false,
                    ready: () => {
                        window.MathJax.startup.defaultReady();
                    }
                },
                svg: {
                    fontCache: "none"
                },
                tex: {
                    inlineMath: [["\\(", "\\)"]],
                    displayMath: [["\\[", "\\]"]],
                    macros: {

                    }
                }
            };
        }

        function isMathImage(fabricObject){
            return fabricObject && fabricObject.mathMetadata !== undefined;
        }

        function addInkingControls(){
            let controls = document.createElement( 'aside' );
            controls.classList.add( 'ink-controls' );

            let colorControls = '';

            if(Array.isArray(options.ink.colors)) {
                for(let color of options.ink.colors){
                    color = color.trim();
                    if(color) {
                        colorControls += '<div class="ink-color ink-control-button" style="color: ' + color + '"></div>';
                    }
                }
            }

            controls.innerHTML =
                colorControls
                + '<div class="loading-progress ink-control-button"></div>'
                + '<div class="ink-pencil ink-control-button"></div>'
                + '<div class="ink-erase ink-control-button"></div>'
                + (options.math.enabled ? '<div class="ink-formula ink-control-button"></div>' : '')
                + '<div class="ink-clear ink-control-button"></div>'
                + '<div class="ink-hidecanvas ink-control-button"></div>'
                + '<div class="ink-serializecanvas ink-control-button"></div>';

            reveal.getViewportElement().appendChild(controls);

            inkControlButtons.progressIndicator = controls.querySelector('.loading-progress');
            inkControlButtons.pencil = controls.querySelector('.ink-pencil');
            inkControlButtons.erase = controls.querySelector('.ink-erase');
            inkControlButtons.formula = controls.querySelector('.ink-formula');
            inkControlButtons.clear = controls.querySelector('.ink-clear');
            inkControlButtons.hideCanvas = controls.querySelector('.ink-hidecanvas');
            inkControlButtons.serializeCanvas = controls.querySelector('.ink-serializecanvas');
            inkControlButtons.colorChoosers = controls.querySelectorAll('.ink-color');
        }

        function toggleControlButton(controlButton, on) {
            controlButton.style.textShadow = on ? options.controls.shadow : '';
            controlButton.style.color = on ? options.controls.activeColor : options.controls.color;
        }

        function toggleColorChoosers(b) {
            if(options.controls.colorChoosersAlwaysVisible && !b)
                return;

            for(let element of inkControlButtons.colorChoosers)
                element.style.visibility = (b ? 'visible' : 'hidden');
        }

        function incrementLoadingQueue(s){
            if(s)
                console.log('Loading resource: ' + s);
            inkControlButtons.progressIndicator.appendChild(document.createTextNode('\u25a2'));
        }

        function decrementLoadingQueue(){
            inkControlButtons.progressIndicator.removeChild(inkControlButtons.progressIndicator.lastChild);
        }

        function setCanvasObjectDefaults(fabricObject){
            fabricObject.set({
                lockScalingFlip: true,
                centeredScaling: true,
                hasBorders: true,
                hasControls: true,
                cornerStyle: 'circle', // or 'rect'
                cornerSize: 10,
                // borderColor: '#ff0000',
                // cornerColor: 'rgba(0,255,0,0.2)',
                // cornerStrokeColor: '#000000',
            });

            fabricObject.setControlsVisibility({mtr: false, mt: false, mb: false, ml: false, mr: false});
        }

        function setMathImageDefaults(fabricObject) {
            setCanvasObjectDefaults(fabricObject);

            if(options.math.shadow)
                fabricObject.set({
                    'shadow': new window.fabric.Shadow({
                        blur: 10,
                        offsetX: 1,
                        offsetY: 1,
                        color: options.math.shadow === true ? 'rgba(0,0,0,1)' : options.math.shadow
                    })
                });

            fabricObject.set({
                lockScalingFlip: true,
                hasBorders: true,
                centeredScaling: true
            });
            fabricObject.setControlsVisibility({mtr: false, mt: false, mb: false, ml: false, mr: false});
        }

        function resetMainCanvasDomNode() {
            let viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            let viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
            let bottomPadding = 0;
            let controlsComputerStyle = window.getComputedStyle(document.querySelector('.controls'));
            if (options.canvasAboveControls)
                bottomPadding = parseInt(controlsComputerStyle.height) + parseInt(controlsComputerStyle.bottom);

            if(canvas)
                canvas.dispose();

            canvasElement = document.querySelector('#revealjs_inking_canvas');
            if (!canvasElement) {
                canvasElement = document.createElement('canvas');
                reveal.getViewportElement().appendChild(canvasElement);
            }
            canvasElement.id = 'revealjs_inking_canvas';
            canvasElement.willReadFrequently = true;
            canvasElement.style.position = 'fixed';
            canvasElement.style.left = '0px';
            canvasElement.style.width = '100%';
            canvasElement.style.top = '0px';
            canvasElement.style.bottom = bottomPadding.toString() + 'px';
            canvasElement.style.zIndex = controlsComputerStyle.zIndex;
            canvasElement.width = viewportWidth;
            canvasElement.height = viewportHeight - bottomPadding;

            canvas = new window.fabric.Canvas(canvasElement, {
                perPixelTargetFind: true,
                renderOnAddRemove: true,
                uniformScaling: true
            });

            canvas.upperCanvasEl.style.position = 'fixed';
            canvas.lowerCanvasEl.style.position = 'fixed';
            canvas.freeDrawingBrush.width = 2;

            if(options.ink.shadow)
                canvas.freeDrawingBrush.shadow = new window.fabric.Shadow({
                    blur: 10,
                    offsetX: 1,
                    offsetY: 1,
                    color: options.ink.shadow
                })
            else
                canvas.freeDrawingBrush.shadow = null;

            canvas.targetFindTolerance = 3;
        }

        function createSpotlight(){
            if(!options.spotlight.enabled)
                return;
            if(spotlight)
                destroySpotlight();

            spotlight = new window.fabric.Circle({
                radius: options.spotlight.radius,
                left: mousePosition.x - options.spotlight.radius,
                top: mousePosition.y - options.spotlight.radius,
                fill: "white",
                cursor: "none",
                opacity: 1,
                globalCompositeOperation: 'destination-out',
                hasControls: false,
                hasBorders: false,
                selectable: false,
                evented: false
            });
            spotlightBackground = new window.fabric.Rect({
                left: 0,
                top: 0,
                width: canvas.width,
                height: canvas.height,
                fill: "black",
                opacity: options.spotlight.backgroundOpacity,
                hasControls: false,
                hasBorders: false,
                selectable: false,
                evented: false
            });

            canvas.selection = false;
            canvas.defaultCursor = 'none';
            canvas.add(spotlightBackground);
            canvas.add(spotlight);
        }

        function destroySpotlight(){
            if(!(options.spotlight.enabled && spotlight))
                return;
            canvas.remove(spotlight);
            canvas.remove(spotlightBackground);
            spotlight = spotlightBackground = null;
            canvas.selection = true;
            canvas.defaultCursor = null;
        }

        function isCanvasVisible(){
            return document.querySelector('.canvas-container').style.display !== 'none';
        }

        function toggleCanvas(on){
            let cContainer = document.querySelector('.canvas-container');
            on = typeof(on) === 'boolean' ? on : !isCanvasVisible();

            if(on){
                toggleControlButton(inkControlButtons.hideCanvas, false);
                cContainer.style.display = 'block';
            }
            else {
                destroySpotlight();
                cContainer.style.display = 'none';
                toggleControlButton(inkControlButtons.hideCanvas, true);
            }
        }

        function enterDrawingMode(){
            canvas.freeDrawingBrush.color = currentInkColor;
            canvas.isDrawingMode = true;
            toggleControlButton(inkControlButtons.pencil, true);
            inkControlButtons.pencil.style.color = currentInkColor;
            toggleColorChoosers(true);
        }
        function leaveDrawingMode(){
            canvas.isDrawingMode = false;
            toggleControlButton(inkControlButtons.pencil, false);
            toggleColorChoosers(false);
        }
        function toggleDrawingMode() {
            if(canvas.isDrawingMode)
                leaveDrawingMode();
            else {
                leaveDeletionMode();
                enterDrawingMode();
            }
        }

        function enterDeletionMode(){
            leaveDrawingMode();
            if(isInDeletionMode)
                return;

            isInDeletionMode = true;
            canvas.isDrawingMode = false;
            canvas.selection = false;
            toggleControlButton(inkControlButtons.erase, true);
        }
        function leaveDeletionMode(){
            if(!isInDeletionMode)
                return;
            isInDeletionMode = false;
            canvas.selection = true;
            toggleControlButton(inkControlButtons.erase, false);
        }

        function addMathImageEventListeners(img){
            let mathColor = img.mathMetadata.color;
            img.on('selected', function () {
                if(canvas.getActiveObject() !== img)
                    return;
                currentMathImage = img;
                if(mathColor) {
                    toggleControlButton(inkControlButtons.formula, true);
                    inkControlButtons.formula.style.textShadow = '0 0 10px ' + mathColor;
                }
            });

            img.on('mousedblclick', function () {
                currentMathImage = img;
                createNewFormulaWithQuery();
            });
        }

        function createNewFormulaWithQuery(){
            let currentFormula = null;
            let currentMathColor = null;
            let targetLeft = (mousePosition.x > 10 ? mousePosition.x : 10);
            let targetTop = (mousePosition.y > 10 ? mousePosition.y : 10);
            let targetAngle = null;
            let targetScaleX = null;
            let targetScaleY = null;

            if(currentMathImage && canvas.getActiveObject() === currentMathImage){
                targetLeft = currentMathImage.left;
                targetTop = currentMathImage.top;
                targetAngle = currentMathImage.angle;
                targetScaleX = currentMathImage.scaleX / currentMathImage.mathMetadata.originalScaleX;
                targetScaleY = currentMathImage.scaleY / currentMathImage.mathMetadata.originalScaleY;
                currentMathColor = currentMathImage.mathMetadata.color;
                currentFormula = currentMathImage.mathMetadata.texSrc;
            }

            let mathColor = (currentFormula && currentMathColor) || (options.math.color === 'ink' ? currentInkColor : options.math.color);
            toggleControlButton(inkControlButtons.formula, true);
            inkControlButtons.formula.style.textShadow = '0 0 10px ' + mathColor;

            if(!mathRenderingDiv) {
                mathRenderingDiv = document.createElement('div');
                mathRenderingDiv.style.position = 'fixed';
                mathRenderingDiv.style.top = '0px';
                mathRenderingDiv.style.left = '0px';
                mathRenderingDiv.style.opacity = '0';
                document.body.appendChild(mathRenderingDiv);
            }

            let currentFontSize = window.getComputedStyle(reveal.getCurrentSlide()).fontSize.toString();
            if(options.math.scaleToSlideText) {
                currentFontSize = currentFontSize.replace(
                    /^\d+/,
                    Math.round(reveal.getScale() * parseInt(currentFontSize)).toString()
                )
            }
            mathRenderingDiv.style.fontSize = currentFontSize;

            let formula = (prompt('Enter a formula', currentFormula || '') || '').trim();

            if(!formula) {
                toggleControlButton(inkControlButtons.formula, false);
                return;
            }

            if (currentMathImage) {
                canvas.remove(currentMathImage);
                currentMathImage = null;
            }

            mathRenderingDiv.innerHTML = '';
            if(!window.MathJax) {
                console.warn('MathJax not loaded. Cannot create math formula on inking canvas.');
                return;
            }
            let mjMetrics = window.MathJax.getMetricsFor(mathRenderingDiv, options.math.displayStyle);

            let svg = window.MathJax.tex2svg(
                options.math.preamble + formula,
                mjMetrics
            );

            if(!svg)
                return;

            mathRenderingDiv.appendChild(svg);
            svg = mathRenderingDiv.querySelector('svg');
            let svgHeight = svg.height.baseVal.value;
            let svgString = svg.outerHTML;
            mathRenderingDiv.innerHTML = '';

            window.fabric.loadSVGFromString(svgString, function(objects, extraInfo) {
                for(let obj of objects)
                    obj.set({fill: mathColor});

                let img = window.fabric.util.groupSVGElements(objects, extraInfo).setCoords();

                img.scaleToHeight(svgHeight * options.math.scaling);

                img.set({
                    mathMetadata: {
                        'texSrc': formula,
                        'color': mathColor,
                        'originalScaleX': img.scaleX,
                        'originalScaleY': img.scaleY
                    }
                });

                if(targetScaleX)
                    img.set({scaleX: img.scaleX * targetScaleX, scaleY: img.scaleY * targetScaleY});

                if(targetAngle)
                    img.set({angle: targetAngle});

                img.set({left: targetLeft, top: targetTop});

                setMathImageDefaults(img);
                addMathImageEventListeners(img);

                canvas.add(img);
                canvas.setActiveObject(img);
            });
        }///createFormulaWithQuery

        function getMathEnrichedCanvasObject(){
            return canvas.toObject(['mathMetadata']);
        }
        function getMathEnrichedCanvasJSON(){
            return JSON.stringify(getMathEnrichedCanvasObject());
        }

        function loadCanvasFromMathEnrichedObject(serializedCanvas){
            canvas.loadFromJSON(serializedCanvas, function() {
                let objects = canvas.getObjects();
                if (!objects.length)
                    return;
                objects.forEach(function (obj) {
                    if(isMathImage(obj) && options.math.enabled) {
                        setMathImageDefaults(obj);
                        addMathImageEventListeners(obj);
                    }
                    else
                        setCanvasObjectDefaults(obj);
                });
            });
        }

        function loadCanvasFromMathEnrichedJSON(s){
            loadCanvasFromMathEnrichedObject(JSON.parse(s));
        }

        function addInkingControlsEventListeners() {
            inkControlButtons.pencil.addEventListener('click', toggleDrawingMode);
            inkControlButtons.erase.addEventListener('click',function(){
                isInDeletionMode ? leaveDeletionMode() : enterDeletionMode();
            });

            inkControlButtons.clear.addEventListener('mousedown', function () {
                toggleControlButton(inkControlButtons.clear, true);
                setTimeout(() => {toggleControlButton(inkControlButtons.clear, false)}, 200);
                canvas.clear();
            });

            inkControlButtons.hideCanvas.addEventListener('click', toggleCanvas);
            inkControlButtons.serializeCanvas.addEventListener('click', serializeCanvasToFile);
            options.math.enabled ? inkControlButtons.formula.addEventListener('click', createNewFormulaWithQuery) : null;

            function inkColorButtonOnMouseDowm(event){
                let btn = event.target;
                currentInkColor = btn.style.color;
                canvas.freeDrawingBrush.color = currentInkColor;
                if(canvas.isDrawingMode) {
                    toggleControlButton(inkControlButtons.pencil, true);
                    inkControlButtons.pencil.style.color = currentInkColor;
                }
                btn.style.textShadow = '0 0 20px ' + btn.style.color;
                setTimeout( function(){btn.style.textShadow = '';}, 200 );
            }
            for(let element of inkControlButtons.colorChoosers)
                element.addEventListener('mousedown', inkColorButtonOnMouseDowm);
        }///addInkingControlsEventListeners

        function addCanvasEventListeners() {
            canvas.on('mouse:down', function (eventInfo) {
                isMouseLeftButtonDown = true;
                mousePosition.x = eventInfo.e.layerX;
                mousePosition.y = eventInfo.e.layerY;
                if (options.spotlight.enabled && eventInfo.e.altKey)
                    createSpotlight()
                else if (isMathImage(eventInfo.target))
                    currentMathImage = eventInfo.target;
            });
            canvas.on('mouse:up', function (eventInfo) {
                isMouseLeftButtonDown = false;
                if (options.spotlight.enabled && eventInfo.e.altKey)
                    destroySpotlight();
            });

            canvas.on('mouse:move', function (eventInfo) {
                mousePosition.x = eventInfo.e.layerX;
                mousePosition.y = eventInfo.e.layerY;
                if(!spotlight)
                    return;
                spotlight.set({
                    left: mousePosition.x - spotlight.radius,
                    top: mousePosition.y - spotlight.radius
                });
                canvas.renderAll();
            });

            canvas.on('mouse:over', function (evt) {
                if (isInDeletionMode && isMouseLeftButtonDown)
                    canvas.remove(evt.target);
            });

            canvas.on('object:added', function (evt) {
                if(!isMathImage(evt.target))
                    setCanvasObjectDefaults(evt.target)
            });

            canvas.on('selection:cleared', function () {
                if(!currentMathImage)
                    return;
                currentMathImage = null;
                toggleControlButton(inkControlButtons.formula, false);
            });

            document.querySelector('.canvas-container').oncontextmenu = function(){return false};
        }///addCanvasEventListeners

        function documentKeyDownEventHandler(event){
            if(reveal.aceEditorActive)
                return;

            if(options.spotlight.enabled && event.key === options.hotkeys.spotlight){
                if(spotlight)
                    destroySpotlight();
                else{
                    if(!isCanvasVisible())
                        toggleCanvas();

                    createSpotlight();
                }
                return;
            }

            switch(event.key){
                case options.hotkeys.toggleCanvas: toggleCanvas(); break;
                case options.hotkeys.clear: if(isCanvasVisible()) canvas.clear(); break;
                case options.hotkeys.serializeCanvas: if(isCanvasVisible()) serializeCanvasToFile(); break;
                case options.hotkeys.draw: if(isCanvasVisible()) enterDrawingMode(); break;
                case options.hotkeys.erase: if(isCanvasVisible()) {enterDeletionMode(); canvas.selection = false;} break;
            }
        }

        function documentKeyUpEventHandler(event){
            if(
                options.math.enabled
                && event.key === options.hotkeys.insertMath
                && isCanvasVisible()
            ) {
                createNewFormulaWithQuery();
            }

            if(event.key === options.hotkeys.draw) {
                canvasElement.dispatchEvent(new MouseEvent('mouseup', {
                    'view': window,
                    'bubbles': true,
                    'cancelable': true
                }));
                leaveDrawingMode();
            }
            if(event.key === options.hotkeys.erase)
                leaveDeletionMode();

            if(event.key === options.hotkeys.delete) {
                if(!canvas.getActiveObjects())
                    return;
                canvas.getActiveObjects().forEach(function (obj) {
                    canvas.remove(obj);
                });
                canvas.discardActiveObject();
            }
        }
        function addDocumentEventListeners(){
            document.addEventListener( 'keydown', documentKeyDownEventHandler);
            document.addEventListener( 'keyup', documentKeyUpEventHandler);
        }

        function addRevealEventListeners(){
            reveal.addEventListener('overviewshown', function () {
                canvasVisibleBeforeRevealOverview = isCanvasVisible();
                toggleCanvas(false);
            });

            reveal.addEventListener('overviewhidden', function () {
                let slide = reveal.getCurrentSlide();
                if(slide.hasAttribute('data-show-inking-canvas') ||
                    canvasVisibleBeforeRevealOverview && !slide.hasAttribute('data-hide-inking-canvas'))
                    toggleCanvas(true);
            });

            reveal.addEventListener('slidechanged', function(event){
                destroySpotlight();
                leaveDeletionMode();

                let slide = event.previousSlide;

                if(!currentCanvasSlide || currentCanvasSlide === slide || !currentCanvasSlide && !slide.dataset.inkingCanvasContent) {
                    slide.dataset.inkingCanvasContent = canvas.getObjects().length > 0 ? getMathEnrichedCanvasJSON() : null;
                    canvas.clear();
                }

                setTimeout(function(){
                    let slide = reveal.getCurrentSlide();
                    slide.hasAttribute('data-hide-inking-canvas') ? toggleCanvas(false) : null;
                    slide.hasAttribute('data-show-inking-canvas') ? toggleCanvas(true) : null;

                    if(!slide.dataset.inkingCanvasContent)
                        return;

                    loadCanvasFromMathEnrichedJSON(slide.dataset.inkingCanvasContent);
                    slide.dataset.inkingCanvasContent = null;

                    if(slide.inkingObjectsPreload){
                        for(let obj of slide.inkingObjectsPreload)
                            canvas.add(obj);

                        slide.inkingObjectsPreload = null;
                    }

                    currentCanvasSlide = slide;
                }, parseInt(window.getComputedStyle(slide).transitionDuration) || 800);
            });
        }///addRevealEventListeners

        function serializeCanvasToFile(){
            function download(filename, text) {
                let element = document.createElement('a');
                element.style.display = 'none';

                element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
                element.setAttribute('download', filename);

                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
            }

            destroySpotlight();

            if(confirm("Save current slide to SVG? (Press Cancel to save current or all slides to JSON.)"))
                return download('canvas.svg', canvas.toSVG());

            if(!confirm("Save all slides content? (Press Cancel to save only the current slide.)"))
                return download('canvas.json', getMathEnrichedCanvasJSON());

            reveal.getCurrentSlide().dataset.inkingCanvasContent = getMathEnrichedCanvasJSON();
            let allSlidesContent = [];

            reveal.getSlidesElement().querySelectorAll('section').forEach(function(slide, slideNumber){
                if(slide.dataset.inkingCanvasContent) {
                    let slideContent = {inkingCanvasContent: JSON.parse(slide.dataset.inkingCanvasContent)};
                    if(slide.id)
                        slideContent.slideId = slide.id;
                    else
                        slideContent.slideNumber = slideNumber;
                    allSlidesContent.push(slideContent);
                }
            });

            return download('all_slides.json', JSON.stringify(allSlidesContent));
        }///serializeCanvasToFile

        function loadSVGFromURL(slide, url, loadAsGroup){
            incrementLoadingQueue();
            window.fabric.loadSVGFromURL(
                url,
                function(objects) {
                    decrementLoadingQueue();
                    if(!objects)
                        return;

                    if(loadAsGroup && objects.length > 1)
                        objects = [new window.fabric.Group(objects)];
                    else
                        for(let obj of objects)
                            setCanvasObjectDefaults(obj);

                    if(slide === reveal.getCurrentSlide())
                        for(let obj of objects)
                            canvas.add(obj);
                    else if(!slide.inkingObjectsPreload)
                        slide.inkingObjectsPreload = objects;
                    else
                        for(let obj of objects)
                            slide.inkingObjectsPreload.push(obj);
                }
            )
        }

        function sendAjaxRequest(url, params, callback){
            let xhr = new XMLHttpRequest();

            xhr.onreadystatechange = function( xhr, url, params  ) {
                return function() {
                    if ( xhr.readyState !== 4 )
                        return;

                    if (!
                        (( xhr.status >= 200 && xhr.status < 300 ) ||
                            ( xhr.status === 0 && xhr.responseText !== '')
                        )) {
                        console.warn(
                            'ERROR: The attempt to fetch ' + url +
                            ' failed with HTTP status ' + xhr.status + '.'
                        );

                        return;
                    }

                    callback(xhr.responseText.trim(), params)
                };
            }( xhr, url, params );

            xhr.open( "GET", url, false );
            try {
                xhr.send();
            }
            catch ( e ) {
                console.warn(
                    'Failed to get the file ' + url +
                    '. Make sure that the presentation and the file are served by a ' +
                    'HTTP server and the file can be found there. ' + e
                );
            }
        }

        function loadGlobalPredefinedCanvasContent(){
            function loadMultipleSlides(arrayOfContent, slides) {
                for(let c of arrayOfContent) {
                    let slide;
                    if (c.slideId)
                        slide = document.getElementById(c.slideId);
                    else if(c.slideNumber && slides && c.slideNumber < slides.length)
                        slide = slides[c.slideNumber];

                    if (slide && !slide.dataset.inkingCanvasSrc && c.inkingCanvasContent)
                        slide.dataset.inkingCanvasContent = JSON.stringify(c.inkingCanvasContent);
                }
            }

            let slides = reveal.getSlidesElement().querySelectorAll('section');

            if(Array.isArray(options.inkingCanvasContent)) {
                loadMultipleSlides(options.inkingCanvasContent);
                return;
            }

            if(typeof options.inkingCanvasContent !== "string") {
                for(let slide of slides)
                    slide.dataset.inkingCanvasContent = JSON.stringify(options.inkingCanvasContent);
                return;
            }

            if(options.inkingCanvasContent.toLowerCase().endsWith('.json')){
                let url = options.inkingCanvasContent;
                sendAjaxRequest(url, slides, function (response, slides){
                    if(response.startsWith('{'))
                        for (let slide of slides)
                            slide.dataset.inkingCanvasContent = response;
                    else
                        loadMultipleSlides(JSON.parse(response));
                });
                return;
            }

            for(let slide of slides)
                slide.dataset.inkingCanvasContent = options.inkingCanvasContent;
        }

        function loadPredefinedCanvasContent(){
            if(options.inkingCanvasContent)
                loadGlobalPredefinedCanvasContent();

            let wasCanvasVisible = isCanvasVisible();
            let savedCanvasContent = getMathEnrichedCanvasJSON();
            if(wasCanvasVisible){
                toggleCanvas(false);
            }
            for(let slide of reveal.getSlidesElement().querySelectorAll('section[data-inking-canvas-src]')) {
                let inkingCanvasSrc = slide.dataset.inkingCanvasSrc;
                if(!inkingCanvasSrc)
                    continue;
                if(inkingCanvasSrc.toLowerCase().endsWith('.json')) {
                    incrementLoadingQueue();
                    sendAjaxRequest(inkingCanvasSrc, slide, function (response, slide){
                        slide.dataset.inkingCanvasContent = response;
                        decrementLoadingQueue();
                    });
                    continue;
                }

                if(!(inkingCanvasSrc.toLowerCase().endsWith('.svg') || inkingCanvasSrc.toLowerCase().endsWith('.svg:split')))
                    continue;

                let filenames = inkingCanvasSrc.split('::');
                let path = '';

                if(filenames[0].endsWith('/')){
                    path = filenames[0];
                    filenames = filenames.slice(1, filenames.length);
                }

                canvas.clear();
                for(let filename of filenames){
                    let makeGroup = true;
                    if(filename.toLowerCase().endsWith(':split')){
                        filename = filename.slice(0, filename.length-':split'.length);
                        makeGroup = false;
                    }
                    loadSVGFromURL(slide, path + filename, makeGroup);
                }

                slide.dataset.inkingCanvasContent = getMathEnrichedCanvasJSON();
            }

            if(wasCanvasVisible)
                toggleCanvas(true);

            loadCanvasFromMathEnrichedJSON(savedCanvasContent);
        }///loadPredefinedCanvasContent

        function loadScript(params, extraCallback) {
            if(params.condition !== undefined
                && !(params.condition === true || typeof params.condition == 'function' && params.condition.call())) {
                return extraCallback ? extraCallback.call() : false;
            }

            if(params.type === undefined)
                params.type = (params.url && params.url.match(/\.css[^.]*$/)) ? 'text/css' : 'text/javascript';

            let script;

            if( params.type === 'text/css' ){
                if(params.content){
                    script = document.createElement('style');
                    script.textContent = params.content;
                }
                else {
                    script = document.createElement('link');
                    script.rel = 'stylesheet';
                    script.type = 'text/css';
                    script.href = params.url;
                }
            }
            else {
                script = document.createElement('script');
                script.type = params.type || 'text/javascript';
                if(params.content) {
                    script.textContent = params.content;
                }
                else
                    script.src = params.url;
            }

            if(params.content){
                document.querySelector('head').appendChild( script );
                if(params.callback)
                    params.callback.call();

                if(extraCallback)
                    extraCallback.call();
            }
            else {
                script.onload = function(){
                    if(params.callback)
                        params.callback.call();
                    if(extraCallback)
                        extraCallback.call();
                };

                document.querySelector( 'head' ).appendChild( script );
            }
        }///loadScript

        function loadScripts( scripts, callback ) {
            if(!scripts || scripts.length === 0) {
                if (typeof callback !== 'function')
                    return;
                if(reveal.isReady()) {
                    callback.call();
                    callback = null;
                }
                else
                    reveal.addEventListener('ready', function () {
                        callback.call();
                        callback = null;
                    });

                return;
            }

            let script = scripts.splice(0, 1)[0];
            loadScript(script, function () {
                loadScripts(scripts, callback);
            });
        }

        loadScripts(scriptsToLoad, function () {
            window.addEventListener('load', function() {
                // This is important for MathJax equations to serialize well into fabric.js
                window.fabric.Object.NUM_FRACTION_DIGITS = 5;

                resetMainCanvasDomNode();
                addInkingControls();
                toggleColorChoosers(false);
                loadPredefinedCanvasContent();

                let slide = reveal.getCurrentSlide();
                if(slide.dataset.inkingCanvasContent){
                    setTimeout(function(){
                        loadCanvasFromMathEnrichedJSON(slide.dataset.inkingCanvasContent);
                    }, parseInt(window.getComputedStyle(slide).transitionDuration) || 800);
                }

                addDocumentEventListeners();
                addCanvasEventListeners();
                addRevealEventListeners();
                addInkingControlsEventListeners();

                window.addEventListener('resize', function () {
                    let isVisible = isCanvasVisible();
                    destroySpotlight();
                    leaveDeletionMode();
                    let serializedCanvas = getMathEnrichedCanvasObject();
                    resetMainCanvasDomNode();
                    loadCanvasFromMathEnrichedObject(serializedCanvas);
                    addCanvasEventListeners();
                    toggleCanvas(isVisible);
                });
            });
        });

        return true;
    }
};