/*
    Plugin for embedding interactive Bokeh charts in reveal.js presentations.
    GitHub: https://github.com/dainiak/revealjs-plugins/

    Author: Alex Dainiak
    Web: www.dainiak.com
    Email: dainiak@gmail.com
 */
const RevealBokeh = {
    id: 'bokeh',
    init: (reveal) => {
        let options = reveal.getConfig().bokeh || {};
        options = {
            chartSrcAttribute: options.chartSrcAttribute || 'data-bokeh',
            scrolling: options.scrolling || 'no',
            urls: {
                bokeh: options.urls && options.urls.bokeh || 'https://cdn.bokeh.org/bokeh/release/bokeh-3.8.2.min.js',
            }
        };

        let scriptsToLoad = [
            {
                url: options.urls.bokeh,
                condition: !window.Bokeh && !document.querySelector('script[src="' + options.urls.bokeh + '"]')
            }
        ];

        function loadScript(params, extraCallback) {
            if (params.condition !== undefined
                && !(params.condition === true || typeof params.condition == 'function' && params.condition.call())) {
                return extraCallback ? extraCallback.call() : false;
            }

            let script = document.createElement('script');
            script.type = params.type || 'text/javascript';
            script.src = params.url;
            script.onload = function () {
                if (params.callback) params.callback.call();
                if (extraCallback) extraCallback.call();
            };
            document.querySelector('head').appendChild(script);
        }

        function loadScripts(scripts, callback) {
            if (!scripts || scripts.length === 0) {
                if (typeof callback === 'function') {
                    if (reveal.isReady()) { callback.call(); }
                    else { reveal.addEventListener('ready', () => callback.call()); }
                }
                return;
            }
            let script = scripts.splice(0, 1)[0];
            loadScript(script, function () { loadScripts(scripts, callback); });
        }

        function fixBokehItem(item) {
            if (!item.doc && item.roots) {
                return { doc: item, root_id: Object.keys(item.roots)[0], version: item.version };
            }
            return item;
        }

        // 1. Handle IFRAME embeds (Sandbox Mode)
        reveal.getSlidesElement().querySelectorAll('iframe[' + options.chartSrcAttribute + ']').forEach(function (iframe) {
            let chartFilename = iframe.getAttribute(options.chartSrcAttribute);
            iframe.scrolling = iframe.scrolling || options.scrolling;

            // Ensure iframe takes full space of its container if not set
            if(!iframe.style.width) iframe.style.width = "100%";
            if(!iframe.style.height) iframe.style.height = "100%";

            iframe.srcdoc =
                '<!DOCTYPE html>'
                + '<head>'
                + '<script src="' + options.urls.bokeh + '"></scr' + 'ipt>'
                + '<style>'
                + '  html,body { width:100%; height:100%; margin:0; overflow:hidden; }'
                + '  .bk-root { width: 100% !important; height: 100% !important; display: flex; justify-content: center; align-items: center; }'
                + '</style>'
                + '</head>'
                + '<body>'
                + '<div id="vis" class="bk-root"></div>'
                + '<script>'
                + '  fetch("' + chartFilename + '")'
                + '    .then(r => r.json())'
                + '    .then(item => {'
                + '       item = ' + fixBokehItem.toString() + '(item);'
                + '       Bokeh.embed.embed_item(item, "vis");'
                + '    });'
                + '</scr' + 'ipt>'
                + '</body>';
        });

        // 2. Handle DIV embeds (Direct Mode)
        let bokehDivs = reveal.getSlidesElement().querySelectorAll('div[' + options.chartSrcAttribute + ']');
        if (bokehDivs.length) {
            loadScripts(scriptsToLoad, function () {
                bokehDivs.forEach(function (element) {
                    const url = element.getAttribute(options.chartSrcAttribute);

                    if (!element.id) element.id = "bokeh-plot-" + Math.random().toString(36).substr(2, 9);

                    // FORCE CSS: Ensure the container is big enough for "stretch_both" to work
                    element.style.width = "100%";
                    element.style.height = "100%";
                    // If using Reveal's r-stretch, it handles height, but we ensure display is block
                    element.style.display = "block";

                    fetch(url)
                        .then(response => response.json())
                        .then(item => {
                            const fixedItem = fixBokehItem(item);
                            Bokeh.embed.embed_item(fixedItem, element.id);
                        })
                        .catch(err => console.error("Error loading Bokeh plot:", err));
                });
            });
        }

        return true;
    }
};