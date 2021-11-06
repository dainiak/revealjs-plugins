/*
  external.js
  [Author: ] Alex Dainiak
  Actual original authors:
      Jan Schoepke <janschoepke@me.com>
      Thomas Weinert (https://github.com/ThomasWeinert)
      Cal Evans

  Released under the MIT license

  Load external files into a reveal.js presentation.
 
  This is a reveal.js plugin to load external html files. It replaces the
  content of any element with a data-external='file.ext#selector' with the contents
  part of file.ext specified by the selector. If you use
  data-external-replace='file.ext#selector' the container element itself will get
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
            }
        };

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

        function loadExternalNode(targetNode, path) {
            let url = targetNode.getAttribute('data-external') || targetNode.getAttribute('data-external-replace');
            if (!url)
                return console.warn('RevealExternal: no valid url found while processing data-external or data-external-replace on an element');

            let regexp = url.match(/^([^#]+)(?:#(.+))?$/);
            url = (path ? path + '/' : '') + (regexp[1] || '');
            let cssQuery = regexp[2] || '';
            let isReplace = targetNode.hasAttribute('data-external-replace');
            
            let xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function (xhr, targetNode, url, cssQuery, isReplace) {
                return function () {
                    if (xhr.readyState !== 4)
                        return;

                    if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 0 && xhr.responseText !== ''))
                        return console.warn(
                            'RevealExternal: The attempt to fetch ' + url +
                            ' failed with HTTP status ' + xhr.status + '.'
                        );

                    let path = url.substr(0, url.lastIndexOf('/'));
                    let html = (new DOMParser).parseFromString(xhr.responseText, 'text/html');
                    if(!html)
                        return console.warn('RevealExternal: Could not parse HTML ' + url);

                    let loadedNodes = cssQuery ? html.querySelectorAll(cssQuery) : html.querySelector('body').childNodes;
                    targetNode.innerHTML = '';

                    for(let node of loadedNodes) {
                        convertUrls(node, path);
                        // Usage example:
                        // <svg class='fragment' data-external-replace='myfile.svg#svg'></svg>
                        if(loadedNodes.length === 1 && isReplace) {
                            if(options.inherit.classList && targetNode.classList)
                                for(let cssClass of targetNode.classList)
                                    node.classList.add(cssClass);

                            if(options.inherit.dataset && targetNode.dataset)
                                for(let key in targetNode.dataset)
                                    if(!(['external', 'externalReplace'].includes(key)))
                                        node.dataset[key] = targetNode.dataset[key];

                            if(options.inherit.style && targetNode.style)
                                node.style = targetNode.style;
                        }

                        node = document.importNode(node, true);
                        if(isReplace)
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

                    if (isReplace)
                        targetNode.parentNode.removeChild(targetNode);
                };
            }(xhr, targetNode, url, cssQuery, isReplace);

            xhr.open('GET', url, options.async);
            try {
                xhr.send();
            } catch (e) {
                console.warn('RevealExternal: Failed to get the file ' + url + '\nException: ' + e);
            }
        }

        function loadExternalElementsInside(container, path) {
            path = path || '';
            if (container instanceof Element && (container.getAttribute('data-external') || container.getAttribute('data-external-replace')))
                loadExternalNode(container, path);
            else
                for(let node of container.querySelectorAll('[data-external],[data-external-replace]'))
                    loadExternalNode(node, path);
        }

        loadExternalElementsInside(reveal.getViewportElement());
    }
};