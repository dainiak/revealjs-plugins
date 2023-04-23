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

        reveal.getSlidesElement().querySelectorAll(
            'iframe[' + options.chartSrcAttribute + ']'
        ).forEach(function(iframe){
            let chartFilename = iframe.getAttribute(options.chartSrcAttribute);
            iframe.scrolling = iframe.scrolling || options.scrolling;
            iframe.srcdoc =
                '<head><script src="https://cdnjs.cloudflare.com/ajax/libs/vega/5.24.0/vega.min.js"></scr' + 'ipt><script src="https://cdnjs.cloudflare.com/ajax/libs/vega-lite/5.7.1/vega-lite.min.js"></scr' + 'ipt><script src="https://cdnjs.cloudflare.com/ajax/libs/vega-embed/6.22.1/vega-embed.min.js"></scr' + 'ipt></head>'
                + '<body style="display:flex;justify-content:center;align-items:center;width:99vw;height:99vh;"><script>vegaEmbed("body", "'
                + chartFilename
                + '", '
                + JSON.stringify(options.vegaOptions)
                + ');</scr' + 'ipt></body>';
        });

        return true;
    }
};