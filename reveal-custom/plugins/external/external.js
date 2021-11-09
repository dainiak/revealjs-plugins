/*
  external.js
  [Author: ] Alex Dainiak
  Based on external.js and anything.js
  External.js authors:
      Jan Schoepke (https://github.com/janschoepke/reveal_external)
      Thomas Weinert (https://github.com/ThomasWeinert)
      Cal Evans (https://github.com/calevans/external)
  Anything.js author:
        Asvin Goel (https://github.com/rajgoel/reveal.js-plugins/)

  Released under the MIT license

  Load external files into a reveal.js presentation.
 
  This is a reveal.js plugin to load external html files. It replaces the
  content of any element with a data-inner-html='file.ext#selector' with the contents
  part of file.ext specified by the selector. If you use
  data-outer-html='file.ext#selector' the container element itself will get
  replaced.
 
  Relative paths in 'src' attributes in the loaded fragments will get prefixed
  with the path.
 
  external: {
    async: false,
    mapAttributes: ['src'],
    inherit: {
        attributes: true,
        classes: true,
        style: true
    }
  }
 */

const RevealExternal = {
    id: 'external',
    init: (reveal) => {
        let options = reveal.getConfig().external || {};
        options = {
            async: !!options.async,
            /*
              This will prefix the attributes (by default 'src') in the loaded
              HTML with the path if they are relative paths (start with a dot).
             */
            mapAttributes: (options.mapAttributes instanceof Array) ? options.mapAttributes : ['src', 'data-background-image', 'data-background-iframe', 'data-src'],
            inherit: {
                attributes: true,
                classList: true,
                style: true
            },
            actions: options.actions || []
        };


        function updateRecursively(obj1, obj2) {
            for(let p in obj2)
                if(typeof obj1[p] === 'object' && typeof obj2[p] === 'object')
                    updateRecursively(obj1[p], obj2[p]);
                else if(obj1[p] === undefined)
                    obj1[p] = obj2[p];
        }

        function parseAction(str) {
            str = str.trim();
            let hasDetectedAction = false;
            let m = str.match(/^<!--(.*)-->$/s);
            if(m) {
                str = m[1].trim();
                hasDetectedAction = true;
            }
            m = str.match(/^\s*<script[^>]*>(.*)<\/script>\s*$/s);
            if(m) {
                str = m[1].trim();
                m = str.match(/^\s*\/\*(.*)\*\/\s*$/s);
                if(m) {
                    str = m[1].trim();
                    hasDetectedAction = true;
                }
            }

            if(!hasDetectedAction)
                return null;

            try {
                return new Function('return ' + str)();
            } catch (e) {
                console.warn('RevealExternal: Was unable to parse action: "' + str + '". Error: ' + e);
                return null;
            }
        }


        function prependPath(src, path) {
            return (path && src.startsWith('.') ? path + '/' : '') + src;
        }

        function convertUrls(container, path) {
            if (!(container instanceof Element))
                return;

            for (let attributeName of options.mapAttributes) {
                if(container.getAttribute(attributeName))
                    container.setAttribute(
                        attributeName,
                        prependPath(container.getAttribute(attributeName), path)
                    );

                for(let node of container.querySelectorAll('[' + attributeName + ']'))
                    node.setAttribute(
                        attributeName,
                        prependPath(node.getAttribute(attributeName), path)
                    );
            }
        }

        function attachLoadedNodes(targetNode, loadedNodes, path, replacementType){
            targetNode.innerHTML = '';

            for(let node of loadedNodes) {
                convertUrls(node, path);
                // Usage example:
                // <svg class='fragment' data-outer-html='myfile.svg#svg'></svg>
                if(loadedNodes.length === 1 && replacementType === 'outer-html' && (node instanceof Element)) {
                    if(options.inherit.classList && targetNode.classList)
                        for(let cssClass of targetNode.classList)
                            node.classList.add(cssClass);

                    if(options.inherit.dataset && targetNode.dataset)
                        for(let key in targetNode.dataset)
                            if(!(['innerHtml', 'outerHtml', 'innerText', 'outerText'].includes(key)))
                                node.dataset[key] = targetNode.dataset[key];

                    if(options.inherit.style && targetNode.style)
                        node.style = targetNode.style;
                }

                node = document.importNode(node, true);
                if(replacementType === 'outer-html' || replacementType === 'outer-text')
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

            if (replacementType === 'outer-html' || replacementType === 'outer-text')
                targetNode.parentNode.removeChild(targetNode);
        }


        function loadExternalNode(targetNode, path) {
            let url = targetNode.getAttribute('data-inner-html') || targetNode.getAttribute('data-outer-html') || targetNode.getAttribute('data-inner-text');
            let replacementType = null;
            for(replacementType of ['inner-html', 'inner-text', 'outer-html', 'outer-text'])
                if(targetNode.hasAttribute('data-' + replacementType))
                    break;

            url = url.trim();
            let selector = '';
            if(replacementType === 'inner-html' || replacementType === 'outer-html') {
                let regexp = url.match(/^([^#]+)(?:#(.+))?$/);
                url = regexp[1];
                selector = regexp[2] || '';
            }

            if(url === '' && selector === ''){
                let data = parseAction(targetNode.innerHTML);
                let loadedNodes;
                if(typeof data === 'function')
                    data = data(targetNode);

                if(Array.isArray(action))
                    loadedNodes = data;
                else if(data instanceof Element || data instanceof Text){
                    loadedNodes = [data];
                }
            }

            url = (path ? path + '/' : '') + url;
            
            let xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function (xhr, targetNode, url, selector, replacementType) {
                return function () {
                    if (xhr.readyState !== 4)
                        return;

                    if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 0 && xhr.responseText !== ''))
                        return console.warn(
                            'RevealExternal: The attempt to fetch ' + url +
                            ' failed with HTTP status ' + xhr.status + '.'
                        );


                    let path = url.substr(0, url.lastIndexOf('/'));
                    let loadedNodes;

                    if(replacementType === 'inner-text' || replacementType === 'outer-text') {
                        loadedNodes = [document.createTextNode(xhr.responseText)];
                    }
                    else {
                        let html = (new DOMParser).parseFromString(xhr.responseText, 'text/html');
                        if (!html)
                            return console.warn('RevealExternal: Could not parse HTML ' + url);

                        loadedNodes = selector ? html.querySelectorAll(selector) : html.querySelector('body').childNodes;
                    }

                    attachLoadedNodes(targetNode, loadedNodes, path, replacementType);
                };
            }(xhr, targetNode, url, selector, replacementType);

            xhr.open('GET', url, options.async);
            try {
                xhr.send();
            } catch (e) {
                console.warn('RevealExternal: Failed to get the file ' + url + '\nException: ' + e);
            }
        }

        function loadExternalElementsInside(container, path) {
            path = path || '';
            if (container instanceof Element && (container.hasAttribute('data-inner-html') || container.hasAttribute('data-outer-html') || container.hasAttribute('data-inner-text')))
                loadExternalNode(container, path);
            else
                for(let node of container.querySelectorAll('[data-inner-html],[data-outer-html],[data-inner-text]'))
                    loadExternalNode(node, path);
        }


        loadExternalElementsInside(reveal.getViewportElement());

        for(let action of options.actions)
            for(let element of document.querySelectorAll(action.selector)){
                let elementActionParams = parseAction(element.innerHTML) || {};
                if(typeof elementActionParams === 'function')
                    elementActionParams = {
                        init:  elementActionParams
                    }

                if(elementActionParams)
                    updateRecursively(elementActionParams, action);
                if(typeof elementActionParams.init === 'function')
                    elementActionParams.init(element, elementActionParams);
            }
    }
};