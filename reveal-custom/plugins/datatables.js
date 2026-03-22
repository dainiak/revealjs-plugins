/*
    Plugin for embedding interactive DataTables in reveal.js presentations
*/

const RevealDataTables = {
    id: 'datatables',
    init: async (reveal) => {
        let options = reveal.getConfig().datatables || {};

        // Default URLs for jQuery and DataTables
        const defaultUrls = {
            jquery: 'https://code.jquery.com/jquery-4.0.0.min.js',
            dtCss: 'https://cdn.datatables.net/2.3.7/css/dataTables.dataTables.min.css',
            dtJs: 'https://cdn.datatables.net/2.3.7/js/dataTables.min.js'
        };

        options.urls = Object.assign({}, defaultUrls, options.urls || {});

        const defaultDtOptions = {
            paging: false,
            searching: false,
            info: false,
            ordering: true,
            scrollX: true,
            autoWidth: false,
            // --- NEW: Handle fragidx-k classes automatically ---
            createdRow: function(row, data, dataIndex) {
                // Iterate over all cells in the row being created
                $('td', row).each(function() {
                    const cell = $(this);
                    // Check if class contains 'fragidx-N'
                    const className = cell.attr('class');
                    if (className) {
                        const match = className.match(/fragidx-(\d+)/);
                        if (match) {
                            // Convert to standard Reveal.js fragment attributes
                            cell.addClass('fragment');
                            cell.attr('data-fragment-index', match[1]);
                        }
                    }
                });
            }
        };
        options.dtOptions = Object.assign({}, defaultDtOptions, options.dtOptions || {});

        function loadScript(params) {
            return new Promise((resolve) => {
                if (params.condition !== undefined &&
                    !(params.condition === true || typeof params.condition == 'function' && params.condition.call())) {
                    return resolve();
                }
                if (params.type === undefined)
                    params.type = (params.url && params.url.match(/\.css[^.]*$/)) ? 'text/css' : 'text/javascript';

                let element;
                if (params.type === 'text/css') {
                    element = document.createElement('link');
                    element.rel = 'stylesheet';
                    element.type = 'text/css';
                    element.href = params.url;
                } else {
                    element = document.createElement('script');
                    element.type = params.type || 'text/javascript';
                    element.src = params.url;
                }
                element.onload = resolve;
                document.head.appendChild(element);
            });
        }

        function applyThemeFixes() {
            const isDark = document.querySelector('[href*="black.css"],[href*="league.css"],[href*="night.css"],[href*="moon.css"],[href*="dracula.css"],[href*="blood.css"]');

            let customCss = `
                /* Base Styles */
                table.dataTable { font-size: inherit; width: 100% !important; }
                .dataTables_scrollHeadInner { width: 100% !important; }
                table.dataTable td { border-bottom: 1px solid rgba(255,255,255,0.2) !important; }

                /* Taller Header */
                table.dataTable thead th {
                    font-family: 'Aptos Display', sans-serif !important; /* Set Font Here */
                    font-weight: 600; /* Optional: Makes Aptos Display look a bit sharper */
                    padding-top: 15px !important;
                    padding-bottom: 15px !important;
                    vertical-align: middle !important;
                    border-bottom: 1px solid rgba(255,255,255,0.2) !important;
                }

                /* Sorting Icons */
                table.dataTable thead > tr > th .dt-column-order { display: none; }
                table.dataTable thead > tr > th.dt-ordering-asc .dt-column-order,
                table.dataTable thead > tr > th.dt-ordering-desc .dt-column-order {
                    display: inline-block;
                    opacity: 1 !important;
                }
                table.dataTable thead > tr > th.dt-ordering-asc .dt-column-order::before,
                table.dataTable thead > tr > th.dt-ordering-desc .dt-column-order::after {
                    opacity: 1 !important;
                }
            `;

            if (isDark) {
                customCss += `
                    .reveal table.dataTable tbody tr { background-color: transparent !important; color: inherit; }
                    .reveal table.dataTable thead th { color: inherit; }
                    .reveal table.dataTable.stripe tbody tr.odd,
                    .reveal table.dataTable.display tbody tr.odd { background-color: rgba(255,255,255,0.05) !important; }
                    .reveal table.dataTable.stripe tbody tr.even,
                    .reveal table.dataTable.display tbody tr.even { background-color: transparent !important; }
                    .reveal table.dataTable.hover tbody tr:hover,
                    .reveal table.dataTable.display tbody tr:hover { background-color: rgba(255,255,255,0.1) !important; }
                `;
            }
            let style = document.createElement('style');
            style.type = 'text/css';
            style.appendChild(document.createTextNode(customCss));
            document.head.appendChild(style);
        }

        const tables = reveal.getSlidesElement().querySelectorAll('table[data-interactive-table]');

        if (tables.length > 0) {
            // Load jQuery and DataTables CSS in parallel, then DataTables JS (depends on jQuery)
            await Promise.all([
                loadScript({ url: options.urls.jquery, condition: !window.jQuery }),
                loadScript({ url: options.urls.dtCss, type: 'text/css', condition: !document.querySelector('link[href="' + options.urls.dtCss + '"]') })
            ]);
            await loadScript({ url: options.urls.dtJs, condition: !window.DataTable });

            applyThemeFixes();

            tables.forEach(function (tableEl) {
                const explicitWidth = tableEl.style.width || tableEl.getAttribute('width');
                const explicitHeight = tableEl.style.height || tableEl.getAttribute('height');

                let instanceOptions = Object.assign({}, options.dtOptions);

                if (explicitHeight) {
                    instanceOptions.scrollY = explicitHeight;
                    instanceOptions.scrollCollapse = true;
                    instanceOptions.paging = false;
                }

                const dt = $(tableEl).DataTable(instanceOptions);

                if (explicitWidth) {
                    $(tableEl).closest('.dataTables_wrapper').css('width', explicitWidth).css('margin', '0 auto');
                }
            });

            reveal.on('slidechanged', event => {
                $(event.currentSlide).find('table.dataTable').each(function() {
                    $(this).DataTable().columns.adjust().draw();
                });
            });
        }
    }
};
