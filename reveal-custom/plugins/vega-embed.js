/*
    Plugin for embedding interactive vega charts in reveal.js presentations
    GitHub: https://github.com/dainiak/revealjs-plugins/

    Author: Alex Dainiak
    Web: www.dainiak.com
    Email: dainiak@gmail.com
 */

const RevealVega = {
    id: 'vega',
    init: async (reveal) => {
        let options = reveal.getConfig().vega || {};
        options = {
            chartSrcAttribute: options.chartSrcAttribute || 'data-vega',
            scrolling: options.scrolling || 'no',
            urls: {
				vega: options.urls && options.urls.vega || 'https://cdn.jsdelivr.net/npm/vega@6.2.0/build/vega.min.js',
				vegaLite: options.urls && options.urls.vegaLite || 'https://cdn.jsdelivr.net/npm/vega-lite@6.4.2/build/vega-lite.min.js',
				vegaEmbed: options.urls && options.urls.vegaEmbed || 'https://cdn.jsdelivr.net/npm/vega-embed@7.1.0/build/vega-embed.min.js',
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
                + (options.urls.customIframeEmbedder ? 'ipt><script src="' + options.urls.customIframeEmbedder + '"></scr' : '')
				+ 'ipt>'
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

        function loadScript(params) {
            return new Promise((resolve) => {
                if(params.condition !== undefined
                    && !(params.condition === true || typeof params.condition == 'function' && params.condition.call())) {
                    return resolve();
                }

                let script = document.createElement('script');
                script.type = params.type || 'text/javascript';
                script.src = params.url;
                script.onload = resolve;
                document.querySelector('head').appendChild(script);
            });
        }

        let vegaDivs = reveal.getSlidesElement().querySelectorAll('div[' + options.chartSrcAttribute + ']');
        if(vegaDivs.length) {
            // vega-lite depends on vega, vega-embed depends on both — must load sequentially
            for (const s of scriptsToLoad)
                await loadScript(s);

            vegaDivs.forEach(function(vegaDivElement){
                window.vegaEmbed(
                    vegaDivElement,
                    vegaDivElement.getAttribute(options.chartSrcAttribute),
                    options.vegaOptions
                ).then(function(result) {
                    const containerDiv = result.view._el;

                    const newWidth = vegaDivElement.dataset.overrideWidth;
                    const newHeight = vegaDivElement.dataset.overrideHeight;
                    if(newWidth || newHeight) {
                        const svgElement = containerDiv.querySelector('svg');
                        if(svgElement) {
                            if(newWidth)
                                svgElement.width.baseVal.value = newWidth;
                            if (newHeight)
                                svgElement.height.baseVal.value = newHeight;
                        }
                        else {
                            const canvasElement = containerDiv.querySelector('canvas');
                            if(canvasElement) {
                                if (newWidth)
                                    canvasElement.style.width = newWidth + "px";
                                if (newHeight)
                                    canvasElement.style.height = newHeight + "px";
                            }
                        }
                    }
                })
            });
        }
    }
};
