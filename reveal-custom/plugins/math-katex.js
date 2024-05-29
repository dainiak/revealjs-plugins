/*
    Reveal.js alternative math plugin powered by KaTeX
    Author: Alex Dainiak
    Web: www.dainiak.com
    Email: dainiak@gmail.com
 */

const RevealMath = {
	id: 'math',
	renderer: 'katex',
	init: (reveal) => {
		let katexVersion = '0.16.10';
		let options = reveal.getConfig().math || {};
		options = {
			urls: {
				katex: options.urls && options.urls.katex || `https://cdn.jsdelivr.net/npm/katex@${katexVersion}/dist/katex.min.js`,
				css: options.urls && options.urls.css || `https://cdn.jsdelivr.net/npm/katex@${katexVersion}/dist/katex.min.css`,
				autorender: options.urls && options.urls.autorender || `https://cdn.jsdelivr.net/npm/katex@${katexVersion}/dist/contrib/auto-render.min.js`
			},
			svg: {
				enabled: (options.svg !== false) && (options.svg && options.svg.enabled !== false),
				mathScale: options.svg && options.svg.mathScale || 0.2,
				fixedScale: options.svg && options.svg.fixedScale ? options.svg.fixedScale: false,
				escapeClipping: !!(options.svg && options.svg.escapeClipping),
				defaultAlignment: options.svg && options.svg.defaultAlignment || 'C',
				defaultVerticalAlignment: options.svg && options.svg.defaultVerticalAlignment || 'B',
				inheritAttributes: options.svg && options.svg.inheritAttributes || ['id', 'classlist'],
				inheritRecursively: options.svg && options.svg.inheritRecursively || false
			},
			fragments: {
				enabled: (options.fragments && options.fragments.enabled) !== false,
				resetIndicesAfterTypeset: (options.fragments && options.fragments.resetIndicesAfterTypeset) !== false,
				builtinTexMacros: (options.fragments && options.fragments.builtinTexMacros) !== false,
				cssIndices: (options.fragments && options.fragments.cssIndices) !== false,
				indexClassPrefix: (options.fragments && options.fragments.indexClassPrefix) || 'fragidx-'
			},
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
				classes: options.ignore && options.ignore.classes || false
			},
			mathjaxCompatibility: options.mathjaxCompatibility !== false,
			macros: options.macros || {},
			preamble: options.preamble || false
		};

		let macros = {};

		for(let macroName in options.macros){
			let macroDefinition = options.macros[macroName];
			if(macroDefinition instanceof Array)
				macroDefinition = macroDefinition[0];
			if(!macroName.startsWith('\\'))
				macroName = '\\' + macroName;
			macros[macroName] = macroDefinition;
		}
		if(options.fragments.enabled && options.fragments.builtinTexMacros){
			Object.assign(macros, {
				"\\fragidx": `\\htmlClass{fragment ${options.fragments.indexClassPrefix}#1}{#2}`,
				"\\sfragidx": `\\htmlClass{fragment fade-in-then-semi-out ${options.fragments.indexClassPrefix}#1}{#2}`,
				"\\vfragidx": `\\rlap{\\htmlClass{fragment fade-in-then-out ${options.fragments.indexClassPrefix}#1}{#2}}`,
				"\\next": "\\htmlClass{fragment}{#1}",
				"\\step": "\\htmlClass{fragment fade-in-then-semi-out}{#1}",
				"\\vstep": "\\rlap{\\htmlClass{fragment fade-in-then-out}{#1}}"
			});
		}

		let delimiters = [];
		for (let pair of options.delimiters.display) // Making sure $$…$$ is pushed before $…$
			delimiters.push({left: pair[0], right: pair[1], display: true});
		for (let pair of options.delimiters.inline)
			delimiters.push({left: pair[0], right: pair[1], display: false});


		let scriptsToLoad = [
			{
				url:
				options.urls.css,
				condition:
					!window.katex
					&& !document.querySelector(`script[src="${options.urls.katex}"]`)
			}, {
				url:
				options.urls.katex,
				condition:
					!window.katex
					&& !document.querySelector(`script[src="${options.urls.katex}"]`)
			},{
				url:
				options.urls.autorender,
				condition:
					!window.renderMathInElement
					&& !document.querySelector(`script[src="${options.urls.autorender}"]`)
			}
		];

		function typesetMathInSVG(renderOptions) {
			function getTargetProperties(node){
				let properties = {
					id: null,
					classList: [],
					x: 0,
					y: 0,
					fontSize: 20,
					style: {}
				};

				function fixPx(value){
					if(value === null || value === undefined)
						return null;
					if(typeof(value) === 'number')
						return value;
					if(typeof(value) === 'string'){
						value = value.replace('px', '');
						return parseFloat(value);
					}
					return null;
				}

				let t = node;
				properties.x = fixPx(node.getAttribute('x')) || node.getBBox().x;
				properties.y = fixPx(node.getAttribute('y')) || node.getBBox().y;
				while(t.tagName !== 'svg') {
					let transform = t.getAttribute('transform')
					let match;
					if(transform) {
						match = transform.match(/translate\(\s*(-?[\d.]*)\s*[,]?\s*(-?[\d.]*)\s*/);
					}

					if(match && match.length >= 2) {
						properties.x += parseFloat(match[1]);
						properties.y += parseFloat(match[2]);
					}

					if (t.hasAttribute('dx'))
						properties.x += +fixPx(t.getAttribute('dx'));
					if (t.hasAttribute('dy'))
						properties.y += +fixPx(t.getAttribute('dy'));
					t = t.parentNode;
				}

				t = node;
				while (!t.style.fontSize && ['text', 'tspan'].includes((t.parentNode || {}).tagName)) {
					t = t.parentNode;
				}
				let fontSize = t.style.fontSize;
				properties.fontSize = fontSize ? +(fixPx(fontSize)) : 20

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

			function setTransform(node, params) {
				let katexSpan = foreignObjectNode.querySelector('span.katex');
				let width = katexSpan.getBoundingClientRect().width;
				let height = katexSpan.getBoundingClientRect().height;
				let x1 = (params.hAlignment === 'L' ? 0 : -width) * (params.hAlignment === 'C' ? 0.5 : 1.0);
				let y1 = (params.vAlignment === 'B' ? 0 : height) * (params.vAlignment === 'M' ? 0.5 : 1.0);
				node.setAttribute('width', width.toString());
				node.setAttribute('height', height.toString());
				node.setAttribute('overflow', 'visible');
				node.setAttribute(
					'transform',
					`translate(${params.x0} ${params.y0}) scale(${params.scale}) translate(${x1} ${y1})`
				);
			}

			function createSvgMathNode(textNode) {
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
					return {
						foreignObjectNode: null,
						x0: undefined,
						y0: undefined,
						scale: undefined,
						hAlignment: undefined,
						vAlignment: undefined
					};
				}

				let foreignObjectNode = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');

				let katexOptions = {
					output: 'html',
					displayMode: isDisplay
				};
				Object.assign(katexOptions, renderOptions);

				foreignObjectNode.innerHTML = window.katex.renderToString(math[2], katexOptions);


				// foreignObjectNode.style.zIndex = 1000;
				foreignObjectNode.setAttribute('width', '100%');
				foreignObjectNode.setAttribute('height', '100%');

				let targetProperties = getTargetProperties(textNode);
				let x0 = targetProperties.x;
				let y0 = targetProperties.y;
				let scale = options.svg.mathScale;
				let hAlignment = (math[1].match(/[LCR]/i) || options.svg.defaultAlignment || 'L')[0].toUpperCase();
				let vAlignment = (math[1].match(/[BMT]/i) || options.svg.defaultVerticalAlignment || 'T')[0].toUpperCase();
				foreignObjectNode.setAttribute(
					'transform',
					'translate('+x0+' '+y0+')' + ' scale('+scale+')'
				);

				foreignObjectNode.setAttribute('width', '100%');
				foreignObjectNode.setAttribute('height', '100%');

				for(let property in targetProperties.style){
					let value = targetProperties.style[property];
					if(!value) {
						continue;
					}
					foreignObjectNode.style.setProperty(property, value);
				}

				for(let cssClass of targetProperties.classList){
					foreignObjectNode.classList.add(cssClass);
				}
				if(targetProperties.id){
					foreignObjectNode.id = targetProperties.id;
				}

				return {foreignObjectNode, x0, y0, scale, hAlignment, vAlignment};
			}

			for(let textNode of reveal.getSlidesElement().querySelectorAll('svg text')) {
				let hadMathInside = false;
				let nodesForRemoval = [];
				for(let tspanNode of textNode.getElementsByTagName('tspan')) {
					let {foreignObjectNode, x0, y0, scale, hAlignment, vAlignment} = createSvgMathNode(tspanNode);
					if(!foreignObjectNode){
						continue;
					}
					hadMathInside = true;
					textNode.parentNode.insertBefore(foreignObjectNode, textNode);
					setTransform(foreignObjectNode, {
						x0, y0, scale, hAlignment, vAlignment
					});

					nodesForRemoval.push(tspanNode);
				}

				for(let node of nodesForRemoval)
					if(node && node.parentNode && node.parentNode.removeChild)
						node.parentNode.removeChild(node);

				nodesForRemoval = [];

				let {foreignObjectNode, x0, y0, scale, hAlignment, vAlignment} = createSvgMathNode(textNode);
				if(foreignObjectNode) {
					hadMathInside = true;
					textNode.parentNode.insertBefore(foreignObjectNode, textNode);
					setTransform(foreignObjectNode, {
						x0, y0, scale, hAlignment, vAlignment
					});

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

		function renderMath() {
			window.addEventListener('load', function(){
				if(options.preamble && (typeof(options.preamble) === 'string' || options.preamble === true)){
					let scriptSelector = options.preamble === true ? '' : options.preamble;
					scriptSelector = (scriptSelector.startsWith('script') ? '' : 'script[type="text/latex"]') + scriptSelector;
					let script = document.querySelector(scriptSelector);
					let preamble = script ? script.innerText : options.preamble;
					preamble = preamble.replace(/(?!\\)%.*$/mg, '');

					if(options.mathjaxCompatibility) {
						preamble = preamble.replace(/\\DeclareMathOperator{(\\[^}]+)}{([^\n+]+)}/g, "\\newcommand{$1}{\\operatorname{$2}}");
						preamble += '\n\\newcommand{\\class}[2]{\\htmlClass{#1}{#2}}';
						preamble += '\n\\newcommand{\\style}[2]{\\htmlStyle{#1}{#2}}';
						preamble += '\n\\newcommand{\\cssId}[2]{\\htmlId{#1}{#2}}';
					}

					try {
						window.katex.renderToString(preamble, {
							macros: macros,
							throwOnError: true,
							globalGroup: true,
							strict: false,
							trust: true
						});
					}
					catch (error){
						console.warn("KaTeX error while loading the preamble: " + error.toString().replace("ParseError: KaTeX parse error: ", ""));
					}
				}

				let renderOptions = {
					delimiters: delimiters,
					strict: false,
					trust: true,
					throwOnError: false,
					macros: macros,
					ignoredTags: options.ignore.tags
				};
				if(options.ignore.classes){
					renderOptions.ignoredClasses = options.ignore.classes
				}
				window.renderMathInElement(reveal.getViewportElement(), renderOptions);

				typesetMathInSVG(renderOptions);


				if(options.fragments.enabled && (options.fragments.resetIndicesAfterTypeset || options.fragments.cssIndices)) {
					let cssSelector = `[class*="${options.fragments.indexClassPrefix}"]`;

					for(let slide of reveal.getSlides()){
						let fragmentsWithCssIndex = slide.querySelectorAll(cssSelector);
						if(fragmentsWithCssIndex.length > 0 && options.fragments.cssIndices || options.fragments.resetIndicesAfterTypeset)
							for(let fragment of slide.querySelectorAll('.fragment[data-fragment-index]'))
								fragment.removeAttribute('data-fragment-index');

						if(options.fragments.cssIndices)
							for (let fragment of fragmentsWithCssIndex) {
								let s = fragment.getAttribute('class');
								s = s.substring(
									s.indexOf(options.fragments.indexClassPrefix) + options.fragments.indexClassPrefix.length
								);
								s = s.substring(0, Math.max(s.indexOf(' '), s.length));
								fragment.classList.add('fragment');
								fragment.setAttribute('data-fragment-index', s);
							}
					}
				}

				reveal.layout();
			});
		}


		function loadScript(params, extraCallback) {
			if(params.condition !== undefined
				&& !(params.condition === true || typeof params.condition == 'function' && params.condition.call())) {
				return extraCallback ? extraCallback.call() : false;
			}

			if( params.type === undefined ) {
				params.type = (params.url && params.url.match(/\.css[^.]*$/)) ? 'text/css' : 'text/javascript';
			}

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
				else {
					script.src = params.url;
				}
			}

			if(params.content){
				document.querySelector('head').appendChild(script);
				if(params.callback) {
					params.callback.call();
				}
				if(extraCallback) {
					extraCallback.call();
				}
			}
			else {
				script.onload = function(){
					if(params.callback) {
						params.callback.call();
					}
					if(extraCallback) {
						extraCallback.call();
					}
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

		loadScripts(scriptsToLoad, renderMath);

		return true;
	}
};