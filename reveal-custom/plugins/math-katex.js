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
		let katexVersion = '0.16.4';
		let options = reveal.getConfig().math || {};
		options = {
			urls: {
				katex: options.urls && options.urls.katex || 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/' + katexVersion + '/katex.min.js',
				css: options.urls && options.urls.css || 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/' + katexVersion + '/katex.min.css',
				autorender: options.urls && options.urls.autorender || 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/' + katexVersion + '/contrib/auto-render.min.js'
			},
			fragments: {
				enabled: (options.fragments && options.fragments.enabled) !== false,
				resetIndicesAfterTypeset: (options.fragments && options.fragments.resetIndicesAfterTypeset) !== false,
				builtinTexMacros: (options.fragments && options.fragments.builtinTexMacros) !== false,
				cssIndices: (options.fragments && options.fragments.cssIndices) !== false,
				maxFragments: options.fragments && options.fragments.maxFragments || 20,
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
				"\\fragidx": "\\htmlClass{fragment " + options.fragments.indexClassPrefix + "#1}{#2}",
				"\\sfragidx": "\\htmlClass{fragment fade-in-then-semi-out " + options.fragments.indexClassPrefix + "#1}{#2}",
				"\\vfragidx": "\\rlap{\\htmlClass{fragment fade-in-then-out " + options.fragments.indexClassPrefix + "#1}{#2}}",
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
					&& !document.querySelector('script[src="' + options.urls.katex + '"]')
			}, {
				url:
				options.urls.katex,
				condition:
					!window.katex
					&& !document.querySelector('script[src="' + options.urls.katex + '"]')
			},{
				url:
				options.urls.autorender,
				condition:
					!window.renderMathInElement
					&& !document.querySelector('script[src="' + options.urls.autorender + '"]')
			}
		];

		function renderMath() {
			window.addEventListener('load', function(){
				if(options.preamble && (typeof(options.preamble) === 'string' || options.preamble === true) || options.mathjaxCompatibility){
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


				if(options.fragments.enabled && (options.fragments.resetIndicesAfterTypeset || options.fragments.cssIndices)) {
					let cssSelector = '';
					for(let i = 1; i < options.fragments.maxFragments; ++i){
						cssSelector += (cssSelector ? ',.' : '.') + options.fragments.indexClassPrefix + i.toString();
					}

					for(let slide of reveal.getSlides()){
						let numFragmentsWithCssIndex = slide.querySelectorAll(cssSelector).length;
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
				document.querySelector('head').appendChild( script );
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