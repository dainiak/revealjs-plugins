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
            color: options.controls.color || 'rgb(0,0,0)',
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
        let isInEraseMode = false;
        let isMouseLeftButtonDown = false;
        let mathRenderingDiv = null;
        let spotlight = null;
        let spotlightBackground = null;

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
                url: 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/460/fabric.min.js',
                condition: !window.fabric
            },
            {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.0/es5/tex-svg-full.min.js',
                condition: options.math.enabled && !reveal.getConfig().math && (!window.MathJax || !window.MathJax.version)
            }
        ];

        if(options.math.enabled && !reveal.getConfig().math && (!window.MathJax || !window.MathJax.version)) {
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
                        bbA: "{\\mathbb{A}}",
                        bbB: "{\\mathbb{B}}",
                        bbF: "{\\mathbb{F}}",
                        bbN: "{\\mathbb{N}}",
                        bbP: "{\\mathbb{P}}",
                        bbQ: "{\\mathbb{Q}}",
                        bbR: "{\\mathbb{R}}",
                        bbZ: "{\\mathbb{Z}}",
                        calA: "{\\mathcal{A}}",
                        calB: "{\\mathcal{B}}",
                        calC: "{\\mathcal{C}}",
                        calD: "{\\mathcal{D}}",
                        calF: "{\\mathcal{F}}",
                        calG: "{\\mathcal{G}}",
                        calI: "{\\mathcal{I}}",
                        calM: "{\\mathcal{M}}",
                        calN: "{\\mathcal{N}}",
                        calO: "{\\mathcal{O}}",
                        calR: "{\\mathcal{R}}",
                        calS: "{\\mathcal{S}}",
                        bfA: "{\\mathbf{A}}",
                        bfa: "{\\mathbf{a}}",
                        bfb: "{\\mathbf{b}}",
                        bfc: "{\\mathbf{c}}",
                        bfe: "{\\mathbf{e}}",
                        bfw: "{\\mathbf{w}}",
                        bfx: "{\\mathbf{x}}",
                        bfy: "{\\mathbf{y}}",
                        bfz: "{\\mathbf{z}}",
                        floor: ["{\\left\\lfloor #1 \\right\\rfloor}", 1],
                        ceil: ["{\\left\\lceil #1 \\right\\rceil}", 1],
                        le: "\\leqslant",
                        ge: "\\geqslant",
                        hat: "\\widehat",
                        emptyset: "\\varnothing",
                        epsilon: "\\varepsilon"
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
                + '<div class="ink-pencil ink-control-button"></div>'
                + '<div class="ink-erase ink-control-button"></div>'
                + (options.math.enabled ? '<div class="ink-formula ink-control-button"></div>' : '')
                + '<div class="ink-clear ink-control-button"></div>'
                + '<div class="ink-hidecanvas ink-control-button"></div>'
                + '<div class="ink-serializecanvas ink-control-button"></div>';
            document.body.appendChild( controls );
        }

        function toggleColorChoosers(b) {
            if(options.controls.colorChoosersAlwaysVisible && !b) {
                return;
            }
            for(let element of document.querySelectorAll('.ink-color')) {
                element.style.visibility = (b ? 'visible' : 'hidden');
            }
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

            fabricObject.setControlsVisibility({
                mtr: false,
                mt: false,
                mb: false,
                ml: false,
                mr: false
            });
        }

        function setMathImageDefaults(fabricObject) {
            setCanvasObjectDefaults(fabricObject);

            if (options.math.shadow) {
                fabricObject.set({
                    'shadow': new window.fabric.Shadow({
                        blur: 10,
                        offsetX: 1,
                        offsetY: 1,
                        color: options.math.shadow === true ? 'rgba(0,0,0,1)' : options.math.shadow
                    })
                });
            }

            fabricObject.set({
                lockScalingFlip: true,
                hasBorders: true,
                centeredScaling: true
            });
            fabricObject.setControlsVisibility({
                mtr: false,
                mt: false,
                mb: false,
                ml: false,
                mr: false
            });
        }

        function resetMainCanvasDomNode() {
            let viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            let viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
            let bottomPadding = 0;
            if (options.canvasAboveControls){
                bottomPadding = parseInt(window.getComputedStyle(document.querySelector('.controls')).height) + parseInt(window.getComputedStyle(document.querySelector('.controls')).bottom);
            }

            if(canvas)
                canvas.dispose();

            canvasElement = document.querySelector('#revealjs_inking_canvas');
            if (!canvasElement) {
                canvasElement = document.createElement('canvas');
                document.body.appendChild(canvasElement);
            }
            canvasElement.id = 'revealjs_inking_canvas';
            canvasElement.style.position = 'fixed';
            canvasElement.style.left = '0px';
            canvasElement.style.top = '0px';
            canvasElement.style.bottom = bottomPadding.toString() + 'px';
            canvasElement.style.width = '100%';
            canvasElement.style.zIndex = window.getComputedStyle(document.querySelector('.controls')).zIndex;
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
                hasControls: false,
                hasBorders: false,
                selectable: false,
                evented: false,
                fill: "white",
                cursor: "none",
                opacity: 1,
                globalCompositeOperation: 'destination-out',
            });
            spotlightBackground = new window.fabric.Rect({
                left: 0,
                top: 0,
                width: canvas.width,
                height: canvas.height,
                fill: "black",
                hasControls: false,
                hasBorders: false,
                evented: false,
                selectable: false,
                opacity: options.spotlight.backgroundOpacity
            });

            canvas.selection = false;
            canvas.defaultCursor = 'none';
            canvas.add(spotlightBackground);
            canvas.add(spotlight);
        }

        function destroySpotlight(){
            if(options.spotlight.enabled && spotlight) {
                canvas.remove(spotlight);
                canvas.remove(spotlightBackground);
                spotlight = null;
                spotlightBackground = null;
                canvas.selection = true;
                canvas.defaultCursor = null;
            }
        }

        function isCanvasVisible(){
            let cContainer = document.querySelector('.canvas-container');
            return !(cContainer.style.display === 'none');
        }

        function toggleCanvas(on){
            let cContainer = document.querySelector('.canvas-container');

            if(on !== true && on !== false)
                on = !isCanvasVisible();

            if (on){
                document.querySelector('.ink-hidecanvas').style.textShadow = '';
                cContainer.style.display = 'block';
            }
            else {
                destroySpotlight();
                cContainer.style.display = 'none';
                document.querySelector('.ink-hidecanvas').style.textShadow = options.controls.shadow;
            }
        }

        function toggleDrawingMode() {
            if (canvas.isDrawingMode)
                leaveDrawingMode();
            else {
                leaveDeletionMode();
                enterDrawingMode();
            }
        }
        function enterDrawingMode(){
            canvas.freeDrawingBrush.color = currentInkColor;
            canvas.isDrawingMode = true;
            document.querySelector('.ink-pencil').style.textShadow = '0 0 10px ' + currentInkColor;
            toggleColorChoosers(true);
        }
        function leaveDrawingMode() {
            canvas.isDrawingMode = false;
            document.querySelector('.ink-pencil').style.textShadow = '';
            toggleColorChoosers(false);
        }

        function enterDeletionMode(){
            leaveDrawingMode();

            if(!isInEraseMode) {
                canvas.isDrawingMode = false;
                isInEraseMode = true;
                canvas.selection = false;
                document.querySelector('.ink-erase').style.textShadow = options.controls.shadow;
            }
        }

        function leaveDeletionMode(){
            if (isInEraseMode) {
                isInEraseMode = false;
                canvas.selection = true;
                document.querySelector('.ink-erase').style.textShadow = '';
            }
        }

        function addMathImageEventListeners(img){
            let mathColor = img.mathMetadata.color;
            img.on('selected', function () {
                if(canvas.getActiveObject() === img) {
                    currentMathImage = img;
                    if(mathColor) {
                        document.querySelector('.ink-formula').style.textShadow = '0 0 10px ' + mathColor;
                    }
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
            document.querySelector('.ink-formula').style.textShadow = '0 0 10px ' + mathColor;

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

            if(formula) {
                if (currentMathImage) {
                    canvas.remove(currentMathImage);
                    currentMathImage = null;
                }

                mathRenderingDiv.innerHTML = '';
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

                window.fabric.loadSVGFromString(
                    svgString,
                    function(objects, extraInfo) {
                        for(let obj of objects)
                            obj.set({
                                fill: mathColor
                            });

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
                            img.set({
                                scaleX: img.scaleX * targetScaleX,
                                scaleY: img.scaleY * targetScaleY,
                            });

                        if(targetAngle)
                            img.set({
                                angle: targetAngle
                            });

                        img.set({
                            left: targetLeft,
                            top: targetTop
                        });

                        setMathImageDefaults(img);
                        addMathImageEventListeners(img);

                        canvas.add(img);
                        canvas.setActiveObject(img);
                    }
                );
            }
            else {
                document.querySelector('.ink-formula').style.textShadow = '';
            }
        }

        function getMathEnrichedCanvasObject(){
            return canvas.toObject(['mathMetadata']);
        }
        function getMathEnrichedCanvasJSON(){
            return JSON.stringify(getMathEnrichedCanvasObject());
        }

        function loadCanvasFromMathEnrichedObject(serializedCanvas){
            canvas.loadFromJSON(serializedCanvas, function() {
                let objects = canvas.getObjects();
                if (objects.length) {
                    objects.forEach(function (obj) {
                        if (isMathImage(obj) && options.math.enabled) {
                            setMathImageDefaults(obj);
                            addMathImageEventListeners(obj);
                        }
                        else
                            setCanvasObjectDefaults(obj);
                    });
                }
            });
        }
        function loadCanvasFromMathEnrichedJSON(s){
            loadCanvasFromMathEnrichedObject(JSON.parse(s));
        }

        function addInkingControlsEventListeners() {
            document.querySelector('.ink-pencil').addEventListener('click',
                toggleDrawingMode
            );

            document.querySelector('.ink-erase').addEventListener('click',function(){
                if (isInEraseMode)
                    leaveDeletionMode();
                else
                    enterDeletionMode();
            });

            document.querySelector('.ink-clear').addEventListener('mousedown', function (event) {
                let btn = event.target;
                btn.style.textShadow = options.controls.shadow;
                setTimeout(function () {
                    btn.style.textShadow = '';
                }, 200);
                canvas.clear();
            });

            for(let element of document.querySelectorAll('.ink-color')){
                element.addEventListener('mousedown', function(event){
                    let btn = event.target;
                    currentInkColor = btn.style.color;
                    canvas.freeDrawingBrush.color = currentInkColor;
                    if(canvas.isDrawingMode) {
                        document.querySelector('.ink-pencil').style.textShadow = '0 0 10px ' + currentInkColor;
                    }
                    btn.style.textShadow = '0 0 20px ' + btn.style.color;
                    setTimeout( function(){btn.style.textShadow = '';}, 200 );
                });
            }

            document.querySelector('.ink-hidecanvas').addEventListener(
                'click',
                toggleCanvas
            );

            document.querySelector('.ink-serializecanvas').addEventListener(
                'click',
                serializeCanvasToFile
            );

            if(options.math.enabled) {
                document.querySelector('.ink-formula').addEventListener(
                    'click',
                    createNewFormulaWithQuery
                );
            }
        }

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
                if (spotlight) {
                    spotlight.set({
                        left: mousePosition.x - spotlight.radius,
                        top: mousePosition.y - spotlight.radius
                    });
                    canvas.renderAll();
                }
            });

            canvas.on('mouse:over', function (evt) {
                if (isInEraseMode && isMouseLeftButtonDown)
                    canvas.remove(evt.target);
            });

            canvas.on('object:added', function (evt) {
                if(!isMathImage(evt.target))
                    setCanvasObjectDefaults(evt.target)
            });

            canvas.on('selection:cleared', function () {
                if (currentMathImage) {
                    currentMathImage = null;
                    document.querySelector('.ink-formula').style.textShadow = '';
                }
            });

            document.querySelector('.canvas-container').oncontextmenu = function(){return false};
        }

        function addDocumentEventListeners(){
            document.addEventListener( 'keydown', function(event){
                if(options.spotlight.enabled && event.key === options.hotkeys.spotlight){
                    if(spotlight)
                        destroySpotlight();
                    else{
                        if(!isCanvasVisible())
                            toggleCanvas();

                        createSpotlight();
                    }
                }

                if(event.key === options.hotkeys.draw) {
                    if(!isCanvasVisible())
                        return;

                    enterDrawingMode();
                }
                if(event.key === options.hotkeys.erase){
                    if(!isCanvasVisible())
                        return;

                    enterDeletionMode();
                    canvas.selection = false;
                }

                if(event.key === options.hotkeys.toggleCanvas )
                    toggleCanvas();

                if(event.key === options.hotkeys.clear)
                    canvas.clear();

                if(event.key === options.hotkeys.serializeCanvas)
                    serializeCanvasToFile();

            });

            document.addEventListener( 'keyup', function(evt){
                if(
                    options.math.enabled
                    && evt.key === options.hotkeys.insertMath
                    && isCanvasVisible()
                ) {
                    createNewFormulaWithQuery();
                }

                if(evt.key === options.hotkeys.draw) {
                    canvasElement.dispatchEvent(new MouseEvent('mouseup', {
                        'view': window,
                        'bubbles': true,
                        'cancelable': true
                    }));
                    leaveDrawingMode();
                }
                if(evt.key === options.hotkeys.erase)
                    leaveDeletionMode();

                if(evt.key === options.hotkeys.delete) {
                    if(canvas.getActiveObjects()) {
                        canvas.getActiveObjects().forEach(function (obj) {
                            canvas.remove(obj);
                        });
                        canvas.discardActiveObject();
                    }
                }
            });
        }

        function addRevealEventListeners(){
            reveal.addEventListener('overviewshown', function () {
                canvasVisibleBeforeRevealOverview = isCanvasVisible();
                toggleCanvas(false);
            });

            reveal.addEventListener('overviewhidden', function () {
                if(canvasVisibleBeforeRevealOverview) {
                    canvasVisibleBeforeRevealOverview = false;
                    toggleCanvas(true);
                }
            });


            reveal.addEventListener('slidechanged', function(event){
                destroySpotlight();
                leaveDeletionMode();

                let slide = event.previousSlide;

                if(currentCanvasSlide === slide || !currentCanvasSlide && !slide.dataset.inkingCanvasContent) {
                    slide.dataset.inkingCanvasContent = canvas.getObjects().length > 0 ? getMathEnrichedCanvasJSON() : null;
                    canvas.clear();
                }
            });

            reveal.addEventListener('slidetransitionend', function(event){
                let slide = event.currentSlide;
                if(slide !== reveal.getCurrentSlide() || !slide.dataset.inkingCanvasContent)
                    return;

                loadCanvasFromMathEnrichedJSON(slide.dataset.inkingCanvasContent);
                slide.dataset.inkingCanvasContent = null;

                if(slide.inkingObjectsPreload){
                    for(let obj of slide.inkingObjectsPreload)
                        canvas.add(obj);

                    slide.inkingObjectsPreload = null;
                }

                currentCanvasSlide = slide;
            });
        }


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

            Array.from(
                document.querySelectorAll('.reveal .slides section')
            ).forEach(function(slide, slideNumber){
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
        }

        function loadSVGFromURL(slide, url, loadAsGroup){
            window.fabric.loadSVGFromURL(
                url,
                function (objects) {
                    if(!objects)
                        return;

                    let objectsToAdd = objects;
                    if(loadAsGroup && objects.length > 1)
                        objectsToAdd = [new window.fabric.Group(objects)];
                    else
                        for(let obj of objectsToAdd)
                            setCanvasObjectDefaults(obj);

                    if(slide === reveal.getCurrentSlide())
                        for(let obj of objectsToAdd)
                            canvas.add(obj);
                    else if(!slide.inkingObjectsPreload)
                        slide.inkingObjectsPreload = objectsToAdd;
                    else
                        for(let obj of objectsToAdd)
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
                        console.log(
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
                console.log(
                    'Failed to get the file ' + url +
                    '. Make sure that the presentation and the file are served by a ' +
                    'HTTP server and the file can be found there. ' + e
                );
            }
        }


        function loadPredefinedCanvasContent(){
            if(options.inkingCanvasContent) {
                let slides = document.querySelectorAll('.reveal .slides section');
                function loadMultipleSlides(arrayOfContent) {
                    for (let c of arrayOfContent) {
                        let slide;
                        if (c.slideId) {
                            slide = document.getElementById(c.slideId);
                        } else if (c.slideNumber) {
                            if (slides && c.slideNumber < slides.length) {
                                slide = slides[c.slideNumber];
                            }
                        }
                        if (slide && !slide.dataset.inkingCanvasSrc && c.inkingCanvasContent) {
                            slide.dataset.inkingCanvasContent = JSON.stringify(c.inkingCanvasContent);
                        }
                    }
                }

                if (Array.isArray(options.inkingCanvasContent)) {
                    loadMultipleSlides(options.inkingCanvasContent);
                }
                else if (typeof options.inkingCanvasContent === "string"){
                    if(options.inkingCanvasContent.toLowerCase().endsWith('.json')){
                        let url = options.inkingCanvasContent;
                        sendAjaxRequest(url, slides, function (response, slides){
                            if(response.startsWith('{')) {
                                for (let slide of slides)
                                    slide.dataset.inkingCanvasContent = response;
                            }
                            else {
                                loadMultipleSlides(JSON.parse(response));
                            }
                        });
                    }
                    else {
                        for(let slide of slides){
                            slide.dataset.inkingCanvasContent = options.inkingCanvasContent;
                        }
                    }
                }
                else {
                    let slides = document.querySelectorAll('.reveal .slides section');
                    for(let slide of slides){
                        slide.dataset.inkingCanvasContent = JSON.stringify(options.inkingCanvasContent);
                    }
                }
            }

            let wasCanvasVisible = isCanvasVisible();
            let savedCanvasContent = getMathEnrichedCanvasJSON();
            if(wasCanvasVisible){
                toggleCanvas(false);
            }
            for(let slide of document.querySelectorAll('section[data-inking-canvas-src]')) {
                let inkingCanvasSrc = slide.dataset.inkingCanvasSrc;
                if(!inkingCanvasSrc)
                    continue;
                if(inkingCanvasSrc.toLowerCase().endsWith('.svg') || inkingCanvasSrc.toLowerCase().endsWith('.svg:split')) {
                    let tokens = inkingCanvasSrc.split('::');
                    let path = '';
                    let filenames = tokens;

                    if(tokens[0].endsWith('/')){
                        path = tokens[0] ;
                        filenames = tokens.slice(1, tokens.length);
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
                else if(inkingCanvasSrc.toLowerCase().endsWith('.json')) {
                    sendAjaxRequest(inkingCanvasSrc, slide, function (response, slide){
                        slide.dataset.inkingCanvasContent = xhr.responseText;
                    });
                }
            }

            if(wasCanvasVisible)
                toggleCanvas(true);

            loadCanvasFromMathEnrichedJSON(savedCanvasContent);
        }

        function loadScript(params, extraCallback) {
            if(params.condition !== undefined
                && !(params.condition === true || typeof params.condition == 'function' && params.condition.call())) {
                return extraCallback ? extraCallback.call() : false;
            }

            if( params.type === undefined )
                params.type = (params.url && params.url.match(/\.css[^.]*$/)) ? 'text/css' : 'text/javascript';

            let script;

            if( params.type === 'text/css' ){
                if( params.content ){
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
                if( params.content ) {
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
        }

        function loadScripts( scripts, callback ) {
            if(!scripts || scripts.length === 0) {
                if (typeof callback === 'function') {
                    if(reveal.isReady()) {
                        callback.call();
                        callback = null;
                    }
                    else
                        reveal.addEventListener('ready', function () {
                            callback.call();
                            callback = null;
                        });
                }
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