/*
    Plugin for embedding interactive vega charts in reveal.js presentations
    Author: Alex Dainiak
    Web: www.dainiak.com
    Email: dainiak@gmail.com
 */

const RevealVega = {
    id: 'vega',
    init: (reveal) => {
        let options = reveal.getConfig().vega || {};
        options = {
            chartSrcAttribute: options.chartSrcAttribute || 'data-vega',
            scrolling: options.scrolling || 'no',
            urls: {
				vega: options.urls && options.urls.vega || 'https://cdnjs.cloudflare.com/ajax/libs/vega/5.26.1/vega.min.js',
				vegaLite: options.urls && options.urls.vegaLite || 'https://cdnjs.cloudflare.com/ajax/libs/vega-lite/5.16.3/vega-lite.min.js',
				vegaEmbed: options.urls && options.urls.vegaEmbed || 'https://cdnjs.cloudflare.com/ajax/libs/vega-embed/6.23.0/vega-embed.min.js',
                customIframeEmbedder: options.urls && options.urls.customIframeEmbedder || null,
                customIframeCss: options.urls && options.urls.customIframeCss || null
			},
            vegaOptions: options.vegaOptions || {
                mode: 'vega-lite',
                theme: 'auto',
                renderer: 'svg',
                actions: false,
                tooltip: {
                    theme: 'fivethirtyeight'
                }
            }
        };

        if((options.vegaOptions.theme || 'auto') === 'auto') {
            options.vegaOptions.theme = 'default';
            if(document.querySelector(
                '[href*="black.css"],[href*="league.css"],[href*="night.css"],[href*="moon.css"],[href*="dracula.css"],[href*="blood.css"]'
            )) {
                options.vegaOptions.theme = 'dark';
            }
        }

        let scriptsToLoad = [
			{
				url: options.urls.vega,
				condition:
					!window.vegaEmbed
					&& !document.querySelector('script[src="' + options.urls.vega + '"]')
			}, {
				url: options.urls.vegaLite,
				condition:
					!window.vegaEmbed
					&& !document.querySelector('script[src="' + options.urls.vegaLite + '"]')
			},{
				url: options.urls.vegaEmbed,
				condition:
					!window.vegaEmbed
					&& !document.querySelector('script[src="' + options.urls.vegaEmbed + '"]')
			}
		];

        reveal.getSlidesElement().querySelectorAll(
            'iframe[' + options.chartSrcAttribute + ']'
        ).forEach(function(iframe){
            let chartFilename = iframe.getAttribute(options.chartSrcAttribute);
            iframe.scrolling = iframe.scrolling || options.scrolling;
            iframe.srcdoc =
                '<head><script src="' + options.urls.vega + '"></scr' 
                + 'ipt><script src="' + options.urls.vegaLite + '"></scr' 
                + 'ipt><script src="' + options.urls.vegaEmbed + '"></scr'
                + (options.urls.customIframeEmbedder ? 'ipt><script src="' + options.urls.customIframeEmbedder + '"></scr' : '') + 'ipt>'
                + (options.urls.customIframeCss ? '<link rel="stylesheet" href="' + options.urls.customIframeCss + '">' : '')
                + '</head>'
                + '<body style="display:flex;justify-content:center;align-items:center;width:99vw;height:99vh;"><script>vegaEmbed' 
                + (options.urls.customIframeEmbedder ? 'Custom' : '')
                + '("body", "'
                + chartFilename
                + '", '
                + JSON.stringify(options.vegaOptions)
                + ');</scr' + 'ipt></body>';
        });

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

        let vegaDivs = reveal.getSlidesElement().querySelectorAll('div[' + options.chartSrcAttribute + ']');
        if(vegaDivs.length) {
            loadScripts(scriptsToLoad, function () {
                vegaDivs.forEach(function(element){
                    window.vegaEmbed(
                        element,
                        element.getAttribute(options.chartSrcAttribute),
                        options.vegaOptions
                    )
                });
            });
        }

        return true;
    }
};