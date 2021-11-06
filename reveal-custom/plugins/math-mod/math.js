const RevealMath = {
    id: 'math',
    init: (reveal) => {
        let options = reveal.getConfig().math || {};
        options = {
            svg: {
                enabled: (options.svg !== false) && (options.svg && options.svg.enabled !== false),
                mathScale: options.svg && options.svg.mathScale || 0.0015,
                fixedScale: options.svg && options.svg.fixedScale ? options.svg.fixedScale: false,
                escapeClipping: !!(options.svg && options.svg.escapeClipping),
                defaultAlignment: options.svg && options.svg.defaultAlignment || 'C',
                defaultVerticalAlignment: options.svg && options.svg.defaultVerticalAlignment || 'B',
                inheritAttributes: options.svg && options.svg.inheritAttributes || ['fill', 'stroke', 'fill-opacity', 'id', 'classlist'],
                inheritRecursively: options.svg && options.svg.inheritRecursively || false
            },
            fragments: {
                enabled: (options.fragments && options.fragments.enabled) !== false,
                resetIndicesAfterTypeset: (options.fragments && options.fragments.resetIndicesAfterTypeset) !== false,
                builtinTexMacros: (options.fragments && options.fragments.builtinTexMacros) !== false,
                cssIndices: (options.fragments && options.fragments.cssIndices) !== false,
                maxFragments: options.fragments && options.fragments.maxFragments || 20,
                indexClassPrefix: (options.fragments && options.fragments.indexClassPrefix) || 'fragidx-'
            },
            mathjaxUrl: options.mathjaxUrl || 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.0/es5/tex-svg-full.min.js',
            macros: options.macros || {},
            delimiters: {
                inline: options.delimiters && options.delimiters.inline || [["\\(", "\\)"]],
                display: options.delimiters && options.delimiters.display || [["\\[", "\\]"]],
            },
            ignore: {
                tags: options.ignore && options.ignore.tags || [
                    "svg",
                    "script",
                    "noscript",
                    "style",
                    "textarea",
                    "pre",
                    "code"
                ],
                classes: options.ignore && options.ignore.classes || false,
                classesRegExp: options.ignore && options.ignore.classesRegExp || false
            },
            process: {
                classesRegExp:options.process && options.process.classesRegExp || false
            },
            preamble: options.preamble || false
        };

        window.MathJax = {
            options: {
                renderActions: {
                    addMenu: [0, '', '']
                },
                skipHtmlTags: options.ignore.tags
            },
            startup: {
                typeset: false,
                ready: () => {
                    MathJax.startup.defaultReady();
                    reveal.typesetMath();
                }
            },
            svg: {
                fontCache: "none",
                mtextInheritFont: (options.mtextInheritFont === true)
            },
            tex: {
                inlineMath: options.delimiters.inline,
                displayMath: options.delimiters.display,
                macros: {}
            }
        };

        if(options.ignore.classes){
            let regexp = options.ignore.classes.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
            options.ignore.classesRegExp = options.ignore.classesRegExp ? ('(' + options.ignore.classesRegExp + ')|' + regexp) : regexp;
        }
        if(options.ignore.classesRegExp)
            window.mathjax.options.ignoreHtmlClass = options.ignore.classesRegExp;
        if(options.process.classesRegExp)
            window.mathjax.options.processHtmlClass = options.process.classesRegExp;

        Object.assign(window.MathJax.tex.macros, options.macros);

        if(options.fragments.enabled && options.fragments.builtinTexMacros){
            Object.assign(window.MathJax.tex.macros, {
                fragidx: ["\\class{fragment " + options.fragments.indexClassPrefix + "#1}{#2}", 2],
                sfragidx: ["\\class{fragment fade-in-then-semi-out " + options.fragments.indexClassPrefix + "#1}{#2}", 2],
                vfragidx: ["\\rlap{\\class{fragment fade-in-then-out " + options.fragments.indexClassPrefix + "#1}{#2}}", 2],
                next: ["\\class{fragment}{#1}", 1],
                step: ["\\class{fragment fade-in-then-semi-out}{#1}", 1],
                vstep: ["\\rlap{\\class{fragment fade-in-then-out}{#1}}", 1]
            });
        }

        function typesetMathInSVG() {
            function getTargetProperties(node){
                let properties = {
                    id: null,
                    classList: [],
                    x: 0,
                    y: 0,
                    fontSize: 20,
                    style: {}
                };
                for(let coord of ['x', 'y']) {
                    let t = node;
                    properties[coord] = 0;
                    while (!t.hasAttribute(coord)) {
                        if (t.hasAttribute('d'+coord))
                            properties.x += +t.getAttribute('d'+coord);
                        t = t.parentNode;
                    }
                    properties[coord] += +t.getAttribute(coord);
                }

                let t = node;
                while (!t.style.fontSize && ['text', 'tspan'].includes((t.parentNode || {}).tagName)) {
                    t = t.parentNode;
                }
                let fontSize = t.style.fontSize;
                properties.fontSize = fontSize ? +(fontSize.replace('px', '')) : 20

                let defaultStyle = {
                    'fill': '#000000',
                    'stroke': '#000000',
                    'fill-opacity': '1'
                };

                for(let property of options.svg.inheritAttributes){
                    t = node;
                    while(!t.style.getPropertyValue(property) && ['text', 'tspan'].includes((t.parentNode || {}).tagName)) {
                        t = t.parentNode;
                    }

                    let value = t.style.getPropertyValue(property) || defaultStyle[property];
                    if(value !== '' && value !== undefined){
                        properties.style[property] = value;
                    }
                }

                if(options.svg.inheritAttributes.includes('classlist') || options.svg.inheritAttributes.includes('classList')){
                    t = node;
                    properties.classList = Array.from(t.classList);
                    while(['text', 'tspan'].includes((t.parentNode || {}).tagName)) {
                        t = t.parentNode;
                        Array.prototype.push.apply(properties.classList, Array.from(t.classList));
                    }
                }

                t = node;
                while(!t.hasAttribute('id') && ['text', 'tspan'].includes((t.parentNode || {}).tagName)){
                    t = t.parentNode;
                }
                if(t.hasAttribute('id')){
                    properties.id = t.getAttribute('id');
                }

                return properties;
            }

            function createBasicSvgMathNode(textNode){
                let regexpInline = /^\s*([LCRBMT]{0,2})\s*\\\((.*)\\\)\s*$/i;
                let regexpDisplay = /^\s*([LCRBMT]{0,2})\s*\\\[(.*)\\]\s*$/i;
                let math = textNode.textContent.match(regexpInline);
                let displayMath = textNode.textContent.match(regexpDisplay);
                let isDisplay = false;
                if(displayMath){
                    isDisplay = true;
                    math = displayMath;
                }
                if(!math) {
                    return null;
                }

                let hAlignment = (math[1].match(/[LCR]/i) || options.svg.defaultAlignment || 'L')[0].toUpperCase();
                let vAlignment = (math[1].match(/[BMT]/i) || options.svg.defaultVerticalAlignment || 'B')[0].toUpperCase();
                let mathMarkup = math[2];
                let svgMath = MathJax.tex2svg(
                    mathMarkup,
                    MathJax.getMetricsFor(textNode, isDisplay)
                );

                if(!svgMath){
                    return null;
                }
                svgMath = svgMath.querySelector('svg');

                return {
                    width: svgMath.viewBox.baseVal.width,
                    height: svgMath.viewBox.baseVal.height,
                    hAlignment: hAlignment,
                    vAlignment: vAlignment,
                    gNode: svgMath.querySelector('g').cloneNode(true)
                }
            }

            function createSvgMathNode(textNode) {
                let svgMath = createBasicSvgMathNode(textNode);
                if(!svgMath){
                    return null;
                }

                let targetProperties = getTargetProperties(textNode);
                let scale = options.svg.fixedScale || options.svg.mathScale * targetProperties.fontSize;

                let x0 = targetProperties.x;
                let y0 = targetProperties.y;
                let x1 = (svgMath.hAlignment === 'L' ? 0 : -svgMath.width) * (svgMath.hAlignment === 'C' ? 0.5 : 1.0);
                let y1 = (svgMath.vAlignment === 'B' ? 0 : -svgMath.height) * (svgMath.vAlignment === 'M' ? 0.5 : 1.0);

                let gNode = svgMath.gNode;
                gNode.setAttribute(
                    'transform',
                    'translate('+x0+' '+y0+')' + ' scale('+scale+') translate('+x1+' '+y1+')' + ' matrix(1 0 0 -1 0 0)'
                );

                for(let property in targetProperties.style){
                    let value = targetProperties.style[property];
                    if(!value) {
                        continue;
                    }
                    gNode.style.setProperty(property, value);
                    if(options.svg.inheritRecursively) {
                        for (let g of gNode.querySelectorAll('g,path')) {
                            g.style.setProperty(property, value);
                        }
                    }
                }

                for(let cssClass of targetProperties.classList){
                    gNode.classList.add(cssClass);
                }
                if(targetProperties.id){
                    gNode.id = targetProperties.id;
                }

                return gNode;
            }

            for(let textNode of document.querySelectorAll('svg text')) {
                let hadMathInside = false;
                let nodesForRemoval = [];
                for(let tspanNode of textNode.getElementsByTagName('tspan')) {
                    let gNode = createSvgMathNode(tspanNode);
                    if(!gNode){
                        continue;
                    }
                    hadMathInside = true;
                    textNode.parentNode.insertBefore(gNode, textNode);
                    nodesForRemoval.push(tspanNode);
                }

                let gNode = createSvgMathNode(textNode);
                if(gNode) {
                    hadMathInside = true;
                    textNode.parentNode.insertBefore(gNode, textNode);
                    nodesForRemoval.push(textNode);
                }

                if(options.svg.escapeClipping && hadMathInside){
                    textNode.parentNode.removeAttribute('clip-path');
                }

                for(let node of nodesForRemoval)
                    if(node && node.parentNode && node.parentNode.removeChild)
                        node.parentNode.removeChild(node);
            }
        }


        function typesetMath() {
            if(options.preamble && (typeof(options.preamble) === 'string' || options.preamble === true)){
                let scriptSelector = options.preamble === true ? '' : options.preamble;
                scriptSelector = (scriptSelector.startsWith('script') ? '' : 'script[type="text/latex"]') + scriptSelector;
                let script = document.querySelector(scriptSelector);
                let preamble = script ? script.innerText : options.preamble;
                preamble = preamble.replace(/(?!\\)%.*$/mg, '');
                MathJax.tex2svg(preamble);
            }

            MathJax.typeset();
            if(options.svg.enabled) {
                typesetMathInSVG();
            }

            for(let fragment of document.querySelectorAll( 'mjx-assistive-mml .fragment' ))
                fragment.classList.remove('fragment')

            if(options.fragments.enabled){
                for(let node of document.querySelectorAll('.slides .auto-fragmentize')){
                    for(let child of node.children) {
                        child.classList.add('fragment');
                    }
                }
            }

            if(options.fragments.enabled && (options.fragments.resetIndicesAfterTypeset || options.fragments.cssIndices)) {
                let cssQuery = '';
                for(let i = 1; i < options.fragments.maxFragments; ++i){
                    cssQuery += (cssQuery ? ',.' : '.') + options.fragments.indexClassPrefix + i.toString();
                }

                for(let slide of reveal.getSlides()){
                    let numFragmentsWithCssIndex = slide.querySelectorAll(cssQuery).length;
                    if(numFragmentsWithCssIndex > 0 && options.fragments.cssIndices || options.fragments.resetIndicesAfterTypeset){
                        for(let fragment of slide.querySelectorAll('.fragment[data-fragment-index]')) {
                            fragment.removeAttribute('data-fragment-index');
                        }
                    }

                    if(options.fragments.cssIndices) {
                        for (let i = 1; numFragmentsWithCssIndex > 0; ++i) {
                            let fragments = slide.querySelectorAll('.' + options.fragments.indexClassPrefix + i.toString());
                            for (let fragment of fragments) {
                                fragment.classList.add('fragment');
                                fragment.setAttribute('data-fragment-index', i.toString());
                                numFragmentsWithCssIndex -= 1;
                            }
                        }
                    }
                }
            }

            reveal.layout();
        }

        reveal.typesetMath = typesetMath;

        let mathJaxScript = document.createElement('script');
        mathJaxScript.src = options.mathjaxUrl;
        mathJaxScript.async = true;
        document.head.appendChild(mathJaxScript);

        return true;
    }
};
