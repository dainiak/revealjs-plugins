/*
    Plugin for embedding mermaid.js diagrams in reveal.js presentations
    GitHub: https://github.com/dainiak/revealjs-plugins/

    Author: Alex Dainiak
    Web: www.dainiak.com
    Email: dainiak@gmail.com

    Processing rules can be added to post-process the diagram SVG DOM subtree.
    One can set the id, set or remove classes, or set attributes on the SVG elements. In any combinations:
        %%% someCssSelector -> #cssIdToSet .css-class-to-set !.class-to-remove [some-property-to-set=newValue]
    If the `->` arrow is used then the modifications are applied to the element itself.
    If the `^->` arrow is used then the element is wrapped with a g element and modifications are applied to this g.
    If the `_->` arrow is used then a single g is added as the only new child of the element and the modifications are applied to this g. All the former children are moved inside this g.
    You can use [n] right after the selector to target a specific element in the list of matching elements. Works even when `:nth-child` does not.
    Examples:
        %% Apply .fragment class to the first of the mermaid nodes:
        %%% g.node[1] -> .fragment

        %% Make the "Start" node a fragment step and red
        %%% rect[id*="A"] _-> .fragment .fade-up [data-fragment-index=1]

        %% Remove default class and add new one
        %%% #D -> !.node .end-state
 */

const RevealMermaid = {
    id: 'mermaid',
    init: (reveal) => {
        const katexVersion = '0.16.27';
        const mermaidVersion = '11.12.2';
        let options = reveal.getConfig().mermaid || {};
        options = {
            mathInLabels: options.mathInLabels !== false,
            urls: options.urls || {
                mermaid: options.urls && options.urls.mermaid || `https://cdn.jsdelivr.net/npm/mermaid@${mermaidVersion}/dist/mermaid.min.js`,
                katex: options.urls && options.urls.katex || `https://cdn.jsdelivr.net/npm/katex@${katexVersion}/dist/katex.min.js`,
                katexCss: options.urls && options.urls.katexCss || `https://cdn.jsdelivr.net/npm/katex@${katexVersion}/dist/katex.min.css`,
            },
            selectors: {
                container: options.selectors && options.selectors.container || '[data-mermaid]',
                script: options.selectors && options.selectors.script || 'script[type="text/mermaid"]',
            },
            overflowVisible: options.overflowVisible === undefined ? true : options.overflowVisible,
            mermaidInit: options.mermaidInit || {
                startOnLoad: false,
                theme: 'auto',
                suppressErrorRendering: true
            },
            registerIconPack: options.registerIconPack || false,
            css: {
                enabled: options?.css?.enabled !== false,
                cssIndices: options?.css?.cssIndices !== false,
                indexClassPrefix: options?.css?.indexClassPrefix || 'fragidx-',
                debug: options?.css?.debug || false
            }
        };

        let scriptsToLoad = [
            {
                url: options.urls.mermaid,
                condition:
                    !window.mermaid
                    && !document.querySelector(`script[src="${options.mermaidUrl}"]`)
            }, {
                url: options.urls.katex,
                condition:
                    options.mathInLabels
                    && !window.katex
                    && !document.querySelector(`script[src="${options.katexUrl}"]`)
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

            if(options.registerIconPack)
                window.mermaid.registerIconPacks([
                    {
                        name: 'logos',
                        loader: () =>
                            fetch('https://unpkg.com/@iconify-json/logos@1/icons.json').then((res) => res.json()),
                    },
                ]);

            const mermaidContainers = Array.from(reveal.getSlidesElement().querySelectorAll(options.selectors.container));

            const renderPromises = mermaidContainers.map(async (mermaidContainer) => {
                const parent = mermaidContainer.parentNode;
                const newDiv = document.createElement('div');
                parent.insertBefore(newDiv, mermaidContainer);

                if(!mermaidContainer.id)
                    mermaidContainer.id = `mermaid-${Math.floor(Math.random() * 1000000)}`;

                let graphDefinition = mermaidContainer.querySelector(options.selectors.script).innerHTML;
                let renderRules = [];

                // 1. Extract Custom CSS Logic
                // Regex matches: selector + (one of ->, ^->, _->) + assignment
                const ruleRegex = /^\s*%%%\s+(.+?)\s+([\^_]?->)\s+(.+?)\s*$/gm;

                graphDefinition = graphDefinition.replace(ruleRegex, (match, selector, arrow, assignment) => {
                    renderRules.push({
                        selector,
                        assignment,
                        type: arrow
                    });
                    return match;
                });

                // 2. Handle Math in Labels
                if(options.mathInLabels) {
                    graphDefinition = graphDefinition.replace(/\\([(\[]).*?\\([)\]])/g, (s) => {
                        let output = window.katex.renderToString(s.substring(2, s.length - 2), {
                            output: 'html',
                            displayMode: s[1] === '['
                        });
                        return output.replaceAll('"', "'");
                    });
                }

                // 3. Render Mermaid
                try {
                    const isParseable = await window.mermaid.parse(graphDefinition, {suppressErrors: false});
                } catch (error) {
                    console.warn(`Mermaid diagram failed to parse:\n\n${graphDefinition}\n\nError: `, error);
                }

                const { svg } = await window.mermaid.render(mermaidContainer.id, graphDefinition);
                newDiv.outerHTML = svg;
                const svgElement = parent.querySelector(`#${mermaidContainer.id}`);

                // Copy classes and styles from container
                svgElement.classList += " " + mermaidContainer.classList;
                const hasStretchClass = mermaidContainer.classList.contains("r-stretch");
                if(hasStretchClass) {
                    svgElement.style.width = "";
                    svgElement.style.height = "";
                    svgElement.style.maxWidth = "";
                    svgElement.style.maxHeight = "";
                    svgElement.style.minWidth = "";
                    svgElement.style.minHeight = "";
                }
                for (const prop of mermaidContainer.style) {
                    const value = mermaidContainer.style.getPropertyValue(prop);
                    if (value && value.trim() !== '') {
                        svgElement.style.setProperty(prop, value);
                    }
                }
                mermaidContainer.remove();

                // 4. Handle Overflow
                if(options.overflowVisible) {
                    let selector = options.overflowVisible === '*' ? '*' : 'foreignObject';
                    svgElement.querySelectorAll(selector).forEach((obj) => {
                        obj.setAttribute('overflow', 'visible');
                    });
                }

                // 5. Apply Custom CSS Logic
                if (options.css.enabled && renderRules.length > 0) {
                    const svgNS = "http://www.w3.org/2000/svg";

                    renderRules.forEach(({ selector, assignment, type }) => {
                        try {
                            selector = selector.trim();
                            let indexPart = null;
                            if(/.*\[\d+]$/.exec(selector)) {
                                const digitPart = /\[\d+]$/.exec(selector)[0];
                                indexPart = parseInt(digitPart.match(/\d+/)[0]);
                                selector = selector.replace(/\[\d+]$/, '');
                            }

                            const targets = svgElement.querySelectorAll(selector);
                            targets.forEach((el, idx) => {
                                if(indexPart !== null && idx + 1 !== indexPart)
                                    return;

                                if(options.css.debug) {
                                    console.log(selector, idx + 1, type, el)
                                }

                                let modificationTarget = el;

                                // --- LOGIC FOR ARROW TYPES ---
                                if (type === '^->') {
                                    // 1. OUTER WRAPPER
                                    // Wraps the element in a new <g> and modifies the <g>
                                    const wrapper = document.createElementNS(svgNS, 'g');
                                    el.parentNode.insertBefore(wrapper, el);
                                    wrapper.appendChild(el);
                                    modificationTarget = wrapper;

                                } else if (type === '_->') {
                                    // 2. INNER WRAPPER
                                    // Creates a new <g> inside the element, moves all children into it,
                                    // and modifies that new internal <g>
                                    const innerGroup = document.createElementNS(svgNS, 'g');

                                    // Move all existing children of 'el' into 'innerGroup'
                                    while (el.firstChild) {
                                        innerGroup.appendChild(el.firstChild);
                                    }

                                    el.appendChild(innerGroup);
                                    modificationTarget = innerGroup;
                                }
                                // Default '->' falls through here, keeping modificationTarget = el

                                const tokens = assignment.match(/(\[.+?\])|(\S+)/g) || [];

                                tokens.forEach(token => {
                                    if (token.startsWith('.')) {
                                        modificationTarget.classList.add(token.substring(1));
                                    } else if (token.startsWith('!.')) {
                                        modificationTarget.classList.remove(token.substring(2));
                                    } else if (token.startsWith('#')) {
                                        modificationTarget.id = token.substring(1);
                                    } else if (token.startsWith('[')) {
                                        const content = token.substring(1, token.length - 1);
                                        const eqIndex = content.indexOf('=');

                                        if (eqIndex > -1) {
                                            const key = content.substring(0, eqIndex).trim();
                                            let val = content.substring(eqIndex + 1).trim();

                                            if ((val.startsWith('"') && val.endsWith('"')) ||
                                                (val.startsWith("'") && val.endsWith("'"))) {
                                                val = val.substring(1, val.length - 1);
                                            }

                                            modificationTarget.setAttribute(key, val);
                                        } else {
                                            modificationTarget.setAttribute(content, '');
                                        }
                                    }
                                });
                            });
                        } catch (e) {
                            console.warn(`Mermaid Plugin: Failed to apply selector "${selector}".`, e);
                        }
                    });
                }

                if(options.css.enabled && options.css.cssIndices) {
                    const cssSelector = '[class*="' + options.css.indexClassPrefix + '"]';
                    const fragmentsWithCssIndex = svgElement.querySelectorAll(cssSelector);
                    if(fragmentsWithCssIndex.length > 0 && options.css.cssIndices || options.css.resetIndicesAfterTypeset)
                        for(let fragment of svgElement.querySelectorAll('.fragment[data-fragment-index]'))
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

                if(hasStretchClass)
                    svgElement.style.height = '100%';
            });

            Promise.all(renderPromises).then(() => {
                reveal.layout();
            });
        });
        return true;
    }
};