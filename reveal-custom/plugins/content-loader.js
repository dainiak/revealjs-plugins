/*
  ContentLoader
  [Author: ] Alex Dainiak
  Heavily based on External.js and anything.js
      External.js authors:
          Jan Schoepke (https://github.com/janschoepke/reveal_external)
          Thomas Weinert (https://github.com/ThomasWeinert)
          Cal Evans (https://github.com/calevans/external)
      Anything.js author:
          Asvin Goel (https://github.com/rajgoel/reveal.js-plugins/)

  Released under the MIT license

  Load external files into a reveal.js presentation.
 
  This is a reveal.js plugin to load external html files. It replaces the
  content of any element with a data-inner-html='file.ext#cssselector' with the contents
  part of file.ext specified by the selector. If you use
  data-outer-html='file.ext#selector' the container element itself will get
  replaced.
 
  Relative paths in 'src' attributes in the loaded fragments will get prefixed
  with the path.
 */

const RevealContentLoader = {
    id: 'contentloader',
    init: (reveal) => {
        let pdfjsVersion = '3.7.107';
        let options = reveal.getConfig().contentLoader || {};
        options = {
            async: !!options.async,
            mapAttributes: (options.mapAttributes instanceof Array) ? options.mapAttributes : ['src', 'data-background-image', 'data-background-iframe', 'data-src'],
            inherit: {
                attributes: (options.inherit || {}).attributes !== false,
                classList:  (options.inherit || {}).classList !== false,
                style: (options.inherit || {}).style !== false
            },
            pdf: {
                enabled: options.pdf === true || options.pdf && options.pdf.enabled === true,
                preload: options.pdf && options.pdf.preload,
                pdfjsUrl: options.pdf && options.pdf.pdfjsUrl || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + pdfjsVersion + '/pdf.min.js',
                pdfjsWorkerUrl: options.pdf && options.pdf.pdfjsWorkerUrl || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + pdfjsVersion + '/pdf.worker.min.js'
            },
            actions: options.actions || []
        };

        /*
        The function is used tu update the options objects for the actions.
         */
        function updateRecursively(objTo, objFrom) {
            for (let p in objFrom)
                if (typeof objTo[p] === 'object' && typeof objFrom[p] === 'object')
                    updateRecursively(objTo[p], objFrom[p]);
                else if (objTo[p] === undefined)
                    objTo[p] = objFrom[p];
        }

        function unEscape(htmlStr) {
            htmlStr = htmlStr.replace(/&lt;/g , "<");
            htmlStr = htmlStr.replace(/&gt;/g , ">");
            htmlStr = htmlStr.replace(/&quot;/g , "\"");
            htmlStr = htmlStr.replace(/&#39;/g , "\'");
            htmlStr = htmlStr.replace(/&amp;/g , "&");
            return htmlStr;
        }

        /*
        Parse a description of an action inside an html contents string.
         */
        function parseAction(str) {
            str = str.trim();
            let hasDetectedAction = false;
            let m = str.match(/^<!--(.*)-->$/s);
            if (m) {
                str = m[1].trim();
                hasDetectedAction = true;
            }
            m = str.match(/^<script[^>]*>(.*)<\/script>$/s);
            if (m) {
                str = m[1].trim();
                m = str.match(/^\/\*(.*)\*\/$/s);
                if (m) {
                    str = m[1].trim();
                    hasDetectedAction = true;
                }
            }

            str = str.trim();
            if(str.startsWith('function ')){
                hasDetectedAction = true;
            }

            if (!hasDetectedAction)
                return null;

            try {
                return new Function('return ' + str)();
            } catch (e) {
                try {
                    return new Function('return ' + unEscape(str))();
                }
                catch(e) {
                    console.warn('RevealContentLoader: Was unable to parse action: "' + str + '". Error: ' + e);
                    return null;
                }
            }
        }


        function attachLoadedNodes(targetNode, loadedNodes, path, replacementType) {
            targetNode.innerHTML = '';
            let prependPath = (src, path) => path && src && src.startsWith('.') ? (path + '/' + src) : src;

            for (let node of loadedNodes) {
                if (node instanceof Element)
                    for (let attributeName of options.mapAttributes) {
                        if (node.getAttribute(attributeName))
                            node.setAttribute(
                                attributeName,
                                prependPath(node.getAttribute(attributeName), path)
                            );

                        for (let descendant of node.querySelectorAll('[' + attributeName + ']'))
                            descendant.setAttribute(
                                attributeName,
                                prependPath(descendant.getAttribute(attributeName), path)
                            );
                    }

                if (loadedNodes.length === 1 && replacementType === 'outer-html' && (node instanceof Element)) {
                    if (options.inherit.classList && targetNode.classList)
                        for (let cssClass of targetNode.classList)
                            node.classList.add(cssClass);

                    if (options.inherit.dataset && targetNode.dataset)
                        for (let key in targetNode.dataset)
                            if (!(['innerHtml', 'outerHtml', 'innerText', 'outerText'].includes(key)))
                                node.dataset[key] = targetNode.dataset[key];

                    if (options.inherit.style && targetNode.style)
                        for(let property of targetNode.style) {
                            node.style.setProperty(property, targetNode.style[property]);
                        }
                }

                node = document.importNode(node, true);
                if (replacementType.startsWith('outer'))
                    targetNode.parentNode.insertBefore(node, targetNode)
                else
                    targetNode.appendChild(node);

                if (options.async) {
                    reveal.sync();
                    reveal.setState(reveal.getState());
                }

                if (node instanceof Element)
                    loadExternalElementsInside(node, path);
            }

            if (replacementType.startsWith('outer'))
                targetNode.parentNode.removeChild(targetNode);
        }


        function loadExternalNode(targetNode, path) {
            let url = targetNode.getAttribute('data-inner-html') || targetNode.getAttribute('data-outer-html') || targetNode.getAttribute('data-inner-text') || targetNode.getAttribute('data-outer-text');
            let replacementType;
            for (replacementType of ['inner-html', 'inner-text', 'outer-html', 'outer-text'])
                if (targetNode.hasAttribute('data-' + replacementType))
                    break;

            if (url === null || url === '') {
                let loadedNodes;

                try {
                    let data = parseAction(targetNode.innerHTML);
                    if (typeof data === 'function')
                        data = data(targetNode, reveal);

                    if (data instanceof Array)
                        loadedNodes = data;
                    else if (data instanceof Element)
                        loadedNodes = [data];
                    else if (typeof data === 'string' && replacementType.endsWith('html'))
                        loadedNodes = (new DOMParser).parseFromString(
                            data, 'text/html'
                        ).querySelector('body').childNodes;
                    else
                        loadedNodes = [document.createTextNode(data.toString())];
                } catch (e) {
                    console.warn('RevealContentLoader error: found neither a valid url nor parseable action, error while action parsing: ' + e);
                }
                attachLoadedNodes(targetNode, loadedNodes, path, replacementType);
                return;
            }


            url = url.trim();
            let selector = '';
            if (replacementType.endsWith('html')) {
                let regexp = url.match(/^([^#]+)(?:#(.+))?$/);
                url = regexp[1];
                selector = regexp[2] || '';
            }

            url = (path ? path + '/' : '') + url;

            let xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function (xhr, targetNode, url, selector, replacementType) {
                return function () {
                    if (xhr.readyState !== 4)
                        return;

                    if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 0 && xhr.responseText !== ''))
                        return console.warn(
                            'RevealContentLoader: The attempt to fetch ' + url +
                            ' failed with HTTP status ' + xhr.status + '.'
                        );

                    let path = url.substring(0, url.lastIndexOf('/'));
                    let loadedNodes;

                    if (replacementType.endsWith('text')) {
                        loadedNodes = [document.createTextNode(xhr.responseText)];
                    }
                    else {
                        let html = (new DOMParser).parseFromString(xhr.responseText, 'text/html');
                        if (!html)
                            return console.warn('RevealContentLoader: Could not parse HTML ' + url);

                        loadedNodes = selector ? html.querySelectorAll(selector) : html.querySelector('body').childNodes;
                    }

                    attachLoadedNodes(targetNode, loadedNodes, path, replacementType);
                };
            }(xhr, targetNode, url, selector, replacementType);

            xhr.open('GET', url, options.async);
            try {
                xhr.send();
            } catch (e) {
                console.warn('RevealContentLoader: Failed to get the file ' + url + '\nException: ' + e);
            }
        }

        function loadExternalElementsInside(container, path) {
            path = path || '';
            if (container instanceof Element && (container.hasAttribute('data-inner-html') || container.hasAttribute('data-outer-html') || container.hasAttribute('data-inner-text') || container.hasAttribute('data-outer-text')))
                loadExternalNode(container, path);
            else
                for (let node of container.querySelectorAll('[data-inner-html],[data-outer-html],[data-inner-text],[data-outer-text]'))
                    loadExternalNode(node, path);
        }

        function performActions(rootElement) {
            for (let action of options.actions)
                for (let element of rootElement.querySelectorAll(action.selector)) {
                    let elementActionParams = parseAction(element.innerHTML) || {};
                    if (typeof elementActionParams === 'function')
                        elementActionParams = {init: elementActionParams}

                    if (elementActionParams.init && action.init)
                        elementActionParams.defaultInit = action.init

                    if (elementActionParams)
                        updateRecursively(elementActionParams, action);

                    if (typeof elementActionParams.init === 'function')
                        elementActionParams.init(element, elementActionParams, reveal);
                }
        }

        function parsePageNumbers(s, totalPages) {
            let pages = [];

            if (!s)
                return [];

            for (let range of s.split(/[,;]+/)) {
                let numPair = range.split('-');
                if (numPair.length === 1)
                    pages.push(parseInt(numPair[0]));
                else {
                    let startPage = numPair[0] === '' ? 1 : parseInt(numPair[0]);
                    let endPage = numPair[1] === '' ? totalPages : Math.min(totalPages, parseInt(numPair[1]));
                    for (let i = startPage; i <= endPage; i++)
                        pages.push(i);
                }
            }

            return pages;
        }

        function renderPdfCanvases(canvases) {
            for (let canvas of canvases) {
                let url = canvas.getAttribute('data-pdf');

                window.pdfjsLib.getDocument(url).promise.then(function (pdfDocument) {
                    let pageNumbers =
                        canvas.hasAttribute('data-page')
                            ?
                            [parseInt(canvas.getAttribute('data-page') || '0')]
                            :
                            parsePageNumbers(
                                canvas.getAttribute('data-pages') || '1',
                                pdfDocument.numPages
                            );

                    if (pageNumbers.length === 1) {
                        pdfDocument.getPage(pageNumbers[0]).then(function (pdfPage) {
                            let viewport = pdfPage.getViewport({scale: 3});
                            canvas.width = Math.floor(viewport.width);
                            canvas.height = Math.floor(viewport.height);
                            let canvasStyle = window.getComputedStyle(canvas);
                            let canvasWidth = parseFloat(canvasStyle.width);
                            let canvasHeight = parseFloat(canvasStyle.height);
                            let scaling = Math.min(canvasWidth / canvas.width, canvasHeight / canvas.height);
                            canvas.style.width = canvas.width * scaling + 'px';
                            canvas.style.height = canvas.height * scaling + 'px';

                            let renderContext = {
                                canvasContext: canvas.getContext('2d'),
                                viewport: viewport
                            };
                            pdfPage.render(renderContext);
                            canvas.dataset.pdfRendered = 'true';
                            performActions(canvas.parentNode);
                        });
                    } else {
                        let div = document.createElement('div');
                        for (let key in canvas.dataset)
                            div.dataset[key] = canvas.dataset[key];

                        div.style.width = canvas.style.width;
                        div.style.height = canvas.style.height;
                        div.style.overflowY = 'scroll';
                        div.classList = canvas.classList;
                        canvas.parentNode.insertBefore(div, canvas);
                        canvas.parentNode.removeChild(canvas);
                        canvas = null;

                        for (let pageNumber of pageNumbers) {
                            canvas = document.createElement('canvas');
                            canvas.style.width = '100%';
                            div.appendChild(canvas);

                            ((canvas) => {
                                pdfDocument.getPage(pageNumber).then(function (pdfPage) {
                                    let viewport = pdfPage.getViewport({scale: 3});
                                    canvas.width = Math.floor(viewport.width);
                                    canvas.height = Math.floor(viewport.height);

                                    let renderContext = {
                                        canvasContext: canvas.getContext('2d'),
                                        viewport: viewport
                                    };
                                    pdfPage.render(renderContext);
                                    canvas.dataset.pdfRendered = 'true';
                                });
                            })(canvas);
                        }

                        performActions(div.parentNode);
                    }
                });
            }
        }

        function loadScript(url, callback) {
            let head = document.querySelector('head');
            let script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = url;

            script.onload = function () {
                callback.call();
                callback = null;
            };

            head.appendChild(script);
        }


        /*
            Main actions and PDF
        */

        let revealViewport = reveal.getViewportElement();
        loadExternalElementsInside(revealViewport);
        performActions(revealViewport);

        if (options.pdf.enabled && revealViewport.querySelectorAll('canvas[data-pdf]'))
            loadScript(options.pdf.pdfjsUrl, function () {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = options.pdf.pdfjsWorkerUrl;
                let selector = 'canvas[data-pdf]:not([data-pdf-rendered])';

                if(options.pdf.preload)
                    renderPdfCanvases(
                        revealViewport.querySelectorAll(selector)
                    )
                else {
                    reveal.addEventListener('slidechanged', event => renderPdfCanvases(event.currentSlide.querySelectorAll(selector)));
                    renderPdfCanvases(reveal.getCurrentSlide().querySelectorAll(selector));
                }
            });
    }
};