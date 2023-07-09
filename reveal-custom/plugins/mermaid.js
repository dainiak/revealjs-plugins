/*
    Plugin for embedding mermaid.js diagrams in reveal.js presentations
    Author: Alex Dainiak
    Web: www.dainiak.com
    Email: dainiak@gmail.com
 */

const RevealMermaid = {
    id: 'mermaid',
    init: (reveal) => {
        let options = reveal.getConfig().mermaid || {};
        options = {
            mathInLabels: options.mathInLabels !== false,
            urls: options.urls || {
                mermaid: options.urls && options.urls.mermaid || 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js',
                katex: options.urls && options.urls.katex || 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.js',
                katexCss: options.urls && options.urls.katexCss || 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.css',
            },
            selectors: {
                container: options.selectors && options.selectors.container || '[data-mermaid]',
                script: options.selectors && options.selectors.script || 'script[type="text/mermaid"]',
            },
            css: {
                enabled: (options.css && options.css.enabled) !== false,
                cssIndices: (options.css && options.css.cssIndices) !== false,
                indexClassPrefix: (options.css && options.css.indexClassPrefix) || 'fragidx-',
                substituteClasses: (options.css && options.css.substituteClasses) || {},
                setClassCommand: (options.css && options.css.setClassCommand) || 'setClass',
                setAttributeCommand: (options.css && options.css.setAttributeCommand) || 'setAttribute',
            },
            overflowVisible: options.overflowVisible !== false,
            mermaidInit: options.mermaidInit || { startOnLoad: false, theme: 'auto' }
        };


        let scriptsToLoad = [
            {
                url: options.urls.mermaid,
                condition:
                    !window.mermaid
                    && !document.querySelector('script[src="' + options.mermaidUrl + '"]')
            }, {
                url: options.urls.katex,
                condition:
                    options.mathInLabels
                    && !window.katex
                    && !document.querySelector('script[src="' + options.katexUrl + '"]')
            },{
                url: options.urls.katexCss,
                type: 'text/css',
                condition:
                    !window.vegaEmbed
                    && !window.katex
            }
        ];

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
                if( params.content )
                    script.textContent = params.content;
                else
                    script.src = params.url;
            }

            if(params.content){
                document.querySelector('head').appendChild(script);
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

                document.querySelector( 'head' ).appendChild(script);
            }
        }

        function loadScripts(scripts, callback) {
            if(!scripts || scripts.length === 0) {
                if (typeof callback === 'function') {
                    if(reveal.isReady()) {
                        callback.call();
                        callback = null;
                    }
                    else {
                        reveal.addEventListener('ready', function () {
                            callback.call();
                            callback = null;
                        });
                    }
                }
                return;
            }

            let script = scripts.splice(0, 1)[0];
            loadScript(script, function () {
                loadScripts(scripts, callback);
            });
        }


        if(!reveal.getSlidesElement().querySelector(options.selectors.container))
            return;


        loadScripts(scriptsToLoad, function () {
            if((options.mermaidInit.theme || 'auto') === 'auto') {
                options.mermaidInit.theme = 'default';
                if(document.querySelector(
                    '[href*="black.css"],[href*="league.css"],[href*="night.css"],[href*="moon.css"],[href*="dracula.css"],[href*="blood.css"]'
                )) {
                    options.mermaidInit.theme = 'dark';
                }
            }

            window.mermaid.initialize(options.mermaidInit);
            let cssClassRegExp = RegExp('^\\s*' + options.css.setClassCommand + '\\s+(.*?)$', 'gmi');
            let attrRegExp = RegExp('^\\s*' + options.css.setAttributeCommand + '\\s+(.*?)$', 'gmi');

            reveal.getSlidesElement().querySelectorAll(options.selectors.container).forEach(async (mermaidContainer) => {
                const parent = mermaidContainer.parentNode;
                const newDiv = document.createElement('div');
                parent.insertBefore(newDiv, mermaidContainer);

                if(!mermaidContainer.id)
                    mermaidContainer.id = `mermaid-${Math.floor(Math.random() * 1000000)}`;

                let graphDefinition = mermaidContainer.querySelector(options.selectors.script).innerHTML;

                let extraClasses = [];
                if(options.css.enabled && options.css.setClassCommand) {
                    graphDefinition = graphDefinition.replace(cssClassRegExp, (m, s) => {
                        s = s.trim();
                        let selector;
                        let classNames;

                        if(s.startsWith('"')) {
                            s = s.substring(1, s.length - 1);
                            [selector, s] = s.split('"');
                            classNames = s.split(/\s+/g);
                        }
                        else
                            [selector, ...classNames] = s.split(/\s+/g);

                        extraClasses.push([selector, classNames]);
                        return "";
                    });
                }

                let extraAttributes = [];
                if(options.css.enabled && options.css.setAttributeCommand) {
                    graphDefinition = graphDefinition.replace(attrRegExp, (m, s) => {
                        s = s.trim();
                        let selector;
                        let attributeName;

                        if(s.startsWith('"')) {
                            s = s.substring(1, s.length - 1);
                            selector = s.substring(0, s.indexOf('"'));
                            s = s.substring(s.indexOf('"') + 1).trim();
                        }
                        else {
                            selector = s.substring(0, s.indexOf(' '));
                            s = s.substring(s.indexOf(' ') + 1).trim();
                        }

                        attributeName = s.substring(0, s.indexOf(' '));
                        s = s.substring(s.indexOf(' ') + 1).trim();

                        extraAttributes.push([selector, attributeName, s]);
                        return "";
                    });
                }

                if(options.mathInLabels) {
                    graphDefinition = graphDefinition.replace(/\\([(\[]).*?\\([)\]])/g, (s) => {
                        let output = window.katex.renderToString(s.substring(2, s.length - 2), {
                            output: 'html',
                            displayMode: s[1] === '['
                        });
                        return output.replaceAll('"', "'");
                    });
                }

                const { svg } = await window.mermaid.render(mermaidContainer.id, graphDefinition);
                newDiv.innerHTML = svg;

                if(options.overflowVisible) {
                    let selector = options.overflowVisible === '*' ? '*' : 'foreignObject';
                    newDiv.querySelectorAll(selector).forEach((obj) => {
                        obj.setAttribute('overflow', 'visible');
                    });
                }

                if(options.css.enabled) {
                    if(options.css.substituteClasses) {
                        for(let className in options.css.substituteClasses) {
                            newDiv.querySelectorAll('.' + className).forEach((element) => {
                                element.classList.remove(className);
                                let newClass = options.css.substituteClasses[className];
                                if(typeof newClass === 'string')
                                    newClass && element.classList.add(newClass)
                                else for(let newClassName of newClass)
                                    newClassName && element.classList.add(newClassName)
                            });
                        }
                    }

                    let addClasses = (element, classNames) => {
                        element && classNames && classNames.map((className) => {
                            className && element.classList.add(className)
                        });
                    };

                    newDiv.querySelectorAll('*').forEach((node) => {
                        Array.from(node.classList).forEach((className) => {
                            if (className.indexOf('..') > -1) {
                                let [nodeStyles, labelStyles] = className.split('..');
                                node.classList.remove(className);
                                addClasses(node, nodeStyles.split('.'));
                                labelStyles && addClasses(node.querySelector('div'), labelStyles.split('.'));
                            } else if (className.indexOf('.') > -1) {
                                node.classList.remove(className);
                                addClasses(node, className.split('.'));
                            }
                        });

                        if(node.tagName.toLowerCase() === 'span' && node.innerHTML.indexOf(':::') > -1) {
                            let [nodeHTML, classPart] = node.innerHTML.split(':::');
                            node.innerHTML = nodeHTML;
                            let [nodeStyles, labelStyles] = classPart.split('..');
                            addClasses(node.closest('div'), nodeStyles.split('.'));
                            labelStyles && addClasses(node, labelStyles.split('.'));
                        }
                    });

                    if(extraClasses.length > 0) {
                        for(let [selector, classNames] of extraClasses) {
                            newDiv.querySelectorAll(selector).forEach((element) => {
                                addClasses(element, classNames);
                            });
                        }
                    }

                    if(extraAttributes.length > 0) {
                        for(let [selector, attr, value] of extraAttributes) {
                            newDiv.querySelectorAll(selector).forEach((element) => {
                                element.setAttribute(attr, value);
                            });
                        }
                    }
                }

                if(options.css.cssIndices) {
                    let cssSelector = '[class*="' + options.css.indexClassPrefix + '"]';

                    for(let slide of reveal.getSlides()){
                        let fragmentsWithCssIndex = slide.querySelectorAll(cssSelector);
                        if(fragmentsWithCssIndex.length > 0 && options.css.cssIndices || options.css.resetIndicesAfterTypeset)
                            for(let fragment of slide.querySelectorAll('.fragment[data-fragment-index]'))
                                fragment.removeAttribute('data-fragment-index');

                        if(options.css.cssIndices)
                            for (let fragment of fragmentsWithCssIndex) {
                                let s = fragment.getAttribute('class');
                                s = s.substring(
                                    s.indexOf(options.css.indexClassPrefix) + options.css.indexClassPrefix.length
                                );
                                s = s.substring(0, Math.max(s.indexOf(' '), s.length));
                                fragment.classList.add('fragment');
                                fragment.setAttribute('data-fragment-index', s);
                            }
                    }
                }
            });
            reveal.layout();
        });

        return true;
    }
};