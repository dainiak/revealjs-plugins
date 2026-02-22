/*
    Plugin for embedding interactive Plotly charts in reveal.js presentations.

 */
const RevealPlotly = {
    id: 'plotly',
    init: async (reveal) => {
        let options = reveal.getConfig().plotly || {};
        options = {
            chartSrcAttribute: options.chartSrcAttribute || 'data-plotly',
            scrolling: options.scrolling || 'no',
            urls: {
                // Default to the stable 2.x release (compatible with Python 5.x - 6.x)
                plotly: options.urls && options.urls.plotly || 'https://cdn.plot.ly/plotly-3.3.1.min.js',
            }
        };

        function loadScript(params) {
            return new Promise((resolve) => {
                if (params.condition !== undefined
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

        function preparePlotlyItem(item) {
            if (!item.config) item.config = {};
            // Ensure the chart resizes with the window/slide
            if (item.config.responsive === undefined) item.config.responsive = true;
            return item;
        }

        // 1. Handle IFRAME embeds (Sandbox Mode)
        reveal.getSlidesElement().querySelectorAll('iframe[' + options.chartSrcAttribute + ']').forEach(function (iframe) {
            let chartFilename = iframe.getAttribute(options.chartSrcAttribute);
            iframe.scrolling = iframe.scrolling || options.scrolling;

            if(!iframe.style.width) iframe.style.width = "100%";
            if(!iframe.style.height) iframe.style.height = "100%";
            iframe.style.border = "none";

            iframe.srcdoc =
                '<!DOCTYPE html>'
                + '<head>'
                + '<script src="' + options.urls.plotly + '"></scr' + 'ipt>'
                + '<style>'
                + '  html,body { width:100%; height:100%; margin:0; overflow:hidden; }'
                + '  .plotly-graph-div { width: 100% !important; height: 100% !important; }'
                + '</style>'
                + '</head>'
                + '<body>'
                + '<div id="vis" class="plotly-graph-div"></div>'
                + '<script>'
                + '  fetch("' + chartFilename + '")'
                + '    .then(r => r.json())'
                + '    .then(item => {'
                + '       item = ' + preparePlotlyItem.toString() + '(item);'
                + '       Plotly.newPlot("vis", item.data, item.layout, item.config).then(function() {'
                + '           if(item.frames) Plotly.addFrames("vis", item.frames);'
                + '       });'
                + '    });'
                + '</scr' + 'ipt>'
                + '</body>';
        });

        // 2. Handle DIV embeds (Direct Mode - Recommended)
        let plotlyDivs = reveal.getSlidesElement().querySelectorAll('div[' + options.chartSrcAttribute + ']');
        if (plotlyDivs.length) {
            await loadScript({
                url: options.urls.plotly,
                condition: !window.Plotly && !document.querySelector('script[src="' + options.urls.plotly + '"]')
            });

            plotlyDivs.forEach(function (element) {
                const url = element.getAttribute(options.chartSrcAttribute);

                if (!element.id) element.id = "plotly-plot-" + Math.random().toString(36).substr(2, 9);

                // CSS: Force container to take up space
                element.style.width = "100%";
                element.style.height = "100%";
                element.style.display = "block";

                fetch(url)
                    .then(response => response.json())
                    .then(item => {
                        const fixedItem = preparePlotlyItem(item);

                        // Initialize the plot with Data and Layout
                        Plotly.newPlot(element.id, fixedItem.data, fixedItem.layout, fixedItem.config)
                            .then(function() {
                                // --- THE CRITICAL FIX ---
                                // Explicitly register the frames so the "Play" button can find them.
                                if (fixedItem.frames) {
                                    Plotly.addFrames(element.id, fixedItem.frames);
                                }

                                // Resize immediately if visible to fix 0x0 glitches
                                if(element.offsetParent !== null) {
                                    Plotly.Plots.resize(element.id);
                                }
                            });
                    })
                    .catch(err => console.error("Error loading Plotly plot:", err));
            });
        }

        // 3. Force Redraw on Slide Change
        // Fixes issues where charts render with 0 height while hidden
        reveal.addEventListener('slidechanged', function(event) {
            let currentSlide = event.currentSlide;
            let plots = currentSlide.querySelectorAll('div.js-plotly-plot');

            plots.forEach(function(plot) {
                Plotly.Plots.resize(plot);
            });
        });

        // 4. Handle PDF Export
        reveal.addEventListener('pdf-ready', function() {
            let plots = document.querySelectorAll('div.js-plotly-plot');
            plots.forEach(function(plot){ Plotly.Plots.resize(plot); });
        });
    }
};
