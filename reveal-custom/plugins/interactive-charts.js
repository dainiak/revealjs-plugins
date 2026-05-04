/*
    Interactive charts plugin for reveal.js.
    Supersedes bokeh.js, plotly.js and vega-embed.js.

    Recognised attributes in slide markup:
        <div data-bokeh="chart.json"></div>      or <iframe data-bokeh="chart.json"></iframe>
        <div data-plotly="chart.json"></div>     or <iframe data-plotly="chart.json"></iframe>
        <div data-vega="spec.json"></div>        or <iframe data-vega="spec.json"></iframe>

    Vega and Plotly charts both support inline specs and fragment-driven scripted
    narration. The fragment list can live in two places — pick whichever reads better:

    A. Sibling `<script type="application/json" class="vega-fragments">` block
       (good for hand-authored slides, where fragments stay visible alongside markup):

        <div class="r-stretch" data-vega>
            <script type="application/json" class="vega-spec">
                { ... vega-lite spec with named params (e.g. "highlight_cats") ... }
            </script>
            <script type="application/json" class="vega-fragments">
                [
                    { "at": 1, "signals": { "highlight_cats": ["A"] } },
                    { "at": 2, "signals": { "highlight_cats": ["A", "B"] } },
                    { "at": 3, "signals": { "highlight_cats": [] } }
                ]
            </script>
        </div>

    B. Inside the spec under `usermeta.revealFragments` (good for Altair-generated
       specs — keeps everything in one self-contained JSON file):

        {
            "$schema": "...", "data": {...}, "params": [...], "encoding": {...},
            "usermeta": {
                "revealFragments": [
                    { "at": 1, "signals": { "highlight_cats": ["A"] } }
                ]
            }
        }

    Plotly uses the same two paths with `class="plotly-fragments"` and the same
    `usermeta.revealFragments` location. Plotly entries use `restyle` and `relayout`
    instead of `signals` — they map directly to Plotly.restyle / Plotly.relayout:

        { "at": 1, "restyle": { "marker.opacity": [1, 0.25, 0.25, 0.25] } }
        { "at": 2, "relayout": { "shapes[0].y0": 30 } }

    Datasets can also be decoupled from the spec — useful when the dataset is large
    and the spec is short enough to live inline (and be edited by an LLM):

        <div data-vega data-vega-data="img/sales.json">
            <script type="application/json" class="vega-spec">
                { "data": {}, "mark": "bar", "encoding": {...} }
            </script>
        </div>

        <div data-vega>
            <script type="application/json" class="vega-spec">
                { "data": {"name": "rows"}, "datasets": {"meta": []}, ... }
            </script>
            <script type="application/json" class="vega-data" data-name="rows" data-src="img/rows.json"></script>
            <script type="application/json" class="vega-data" data-name="meta">[{"id": 1}, {"id": 2}]</script>
        </div>

    Vega: unnamed → spec.data.values; named → spec.datasets[name].
    Plotly: container attr or unnamed sibling → spec.data; sibling with data-path
    writes the fetched value at that dotted/bracketed path.

    Each fragment entry:
        - `at`: required, integer fragment index (matches reveal.js `data-fragment-index`).
        - vega: `signals: {name: value, ...}` pushed via view.signal() + view.runAsync().
        - plotly: `restyle: {path: value}` and/or `relayout: {path: value}`.

    State is cumulative: at fragment K the plugin merges all entries with `at <= K`
    over a captured baseline. Going backward re-merges with smaller K, so revisits
    work. The plugin auto-injects one invisible `.fragment` proxy per distinct `at`
    at init time (before reveal sorts the slide), so the chart's reveals contribute
    beats to reveal.js without any extra markup AND co-fire correctly with bullets.

    Configuration (all fields optional) — read from either of:
        reveal.getConfig().charts = { bokeh: {...}, plotly: {...}, vega: {...} }
        reveal.getConfig().bokeh  = {...}   // legacy, still honoured
        reveal.getConfig().plotly = {...}   // legacy
        reveal.getConfig().vega   = {...}   // legacy

    Author: Alex Dainiak
    GitHub: https://github.com/dainiak/revealjs-plugins/
 */

const RevealInteractiveCharts = {
	id: "interactive-charts",
	init: async (reveal) => {
		const config = reveal.getConfig();
		const chartsConfig = config.charts || {};
		const bokehConfig = chartsConfig.bokeh || config.bokeh || {};
		const plotlyConfig = chartsConfig.plotly || config.plotly || {};
		const vegaConfig = chartsConfig.vega || config.vega || {};

		// Dynamically-inserted scripts default to async=true (execute in fetch-completion
		// order). We need ordered execution (vega-lite needs vega; vega-embed needs both),
		// but we want parallel network fetch — so set async=false. The browser then
		// downloads them concurrently and runs them in DOM-insertion order. For 3 vega
		// scripts (~1MB combined) this turns one slow round-trip per script into one
		// slow round-trip total.
		function loadScript(url) {
			return new Promise((resolve, reject) => {
				if (document.head.querySelector(`script[src="${url}"]`)) {
					resolve();
					return;
				}
				const script = document.createElement("script");
				script.type = "text/javascript";
				script.src = url;
				script.async = false;
				script.onload = () => resolve();
				script.onerror = () => reject(new Error("Failed to load " + url));
				document.head.appendChild(script);
			});
		}

		function loadScriptsSequentially(urls) {
			return Promise.all(urls.map(loadScript));
		}

		async function fetchJson(url) {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
			return response.json();
		}

		function uniqueId(prefix) {
			return prefix + "-" + Math.random().toString(36).slice(2, 11);
		}

		function applyContainerStyles(element) {
			if (!element.style.width) element.style.width = "100%";
			if (!element.style.height) element.style.height = "100%";
			element.style.display = "block";
		}

		// Iframes with srcdoc have base URL "about:srcdoc", so relative URLs break.
		// Injecting a <base href> tag keeps relative chart URLs and their assets working.
		const pageBaseHref = document.baseURI;

		function buildSrcdoc({ scripts = [], links = [], styles = "", bodyAttrs = "", bodyHtml = "", inlineScript = "" }) {
			const headParts = [
				`<base href="${pageBaseHref}">`,
				...scripts.map((s) => `<script src="${s}"><\/script>`),
				...links.map((h) => `<link rel="stylesheet" href="${h}">`),
				styles ? `<style>${styles}</style>` : "",
			].filter(Boolean);
			return `<!DOCTYPE html><head>
${headParts.join("\n")}
</head><body${bodyAttrs ? " " + bodyAttrs : ""}>
${bodyHtml}
${inlineScript ? `<script>${inlineScript}<\/script>` : ""}
</body>`;
		}

		async function processBackend(backend) {
			const scope = reveal.getSlidesElement();
			const iframes = scope.querySelectorAll(`iframe[${backend.attribute}]`);
			const divs = scope.querySelectorAll(`div[${backend.attribute}]`);

			iframes.forEach((iframe) => {
				if (!iframe.scrolling) iframe.scrolling = backend.scrolling;
				if (!iframe.style.width) iframe.style.width = "100%";
				if (!iframe.style.height) iframe.style.height = "100%";
				if (!iframe.style.border) iframe.style.border = "none";
				iframe.srcdoc = backend.buildIframeSrcdoc(iframe.getAttribute(backend.attribute));
			});

			if (!divs.length) return { divCount: 0, iframeCount: iframes.length };

			try {
				await loadScriptsSequentially(backend.scripts);
			} catch (err) {
				console.warn(`${backend.id}: script load failed`, err);
				return { divCount: 0, iframeCount: iframes.length };
			}

			await Promise.all(
				Array.from(divs).map(async (el) => {
					if (!el.id) el.id = uniqueId(backend.id + "-plot");
					applyContainerStyles(el);
					if (typeof backend.preInject === "function") {
						try {
							await backend.preInject(el);
						} catch (err) {
							console.warn(`${backend.id}: preInject failed`, el.id, err);
						}
					}
				}),
			);

			if (backend.lazy) {
				// Lazy rendering: only render charts whose slide is currently visible.
				// Reveal sets unloaded slides to `display: none`, which gives our
				// container 0×0 dimensions — vega then renders a blank 0×0 SVG and
				// never recovers. Deferring renderDiv until a slide becomes current
				// also spreads the CPU cost across navigation instead of blocking
				// the initial paint with N parallel vegaEmbed compilations.
				const pending = new WeakSet(divs);
				const renderSlideCharts = (slide) => {
					if (!slide) return;
					slide.querySelectorAll(`div[${backend.attribute}]`).forEach((el) => {
						if (!pending.has(el)) return;
						pending.delete(el);
						Promise.resolve(backend.renderDiv(el, el.getAttribute(backend.attribute))).catch((err) =>
							console.warn(`${backend.id}: failed to render`, el.id, err),
						);
					});
				};
				renderSlideCharts(reveal.getCurrentSlide());
				reveal.addEventListener("slidechanged", (e) => renderSlideCharts(e.currentSlide));
				reveal.addEventListener("ready", (e) => renderSlideCharts(e.currentSlide));
			} else {
				await Promise.all(
					Array.from(divs).map(async (el) => {
						try {
							await backend.renderDiv(el, el.getAttribute(backend.attribute));
						} catch (err) {
							console.warn(`${backend.id}: failed to render`, el.id, err);
						}
					}),
				);
			}

			return { divCount: divs.length, iframeCount: iframes.length };
		}

		// ---- Bokeh -------------------------------------------------------
		const bokehUrl =
			(bokehConfig.urls && bokehConfig.urls.bokeh) || "https://cdn.bokeh.org/bokeh/release/bokeh-3.9.0.min.js";

		function fixBokehItem(item) {
			if (!item.doc && item.roots) return { doc: item, root_id: Object.keys(item.roots)[0], version: item.version };
			return item;
		}

		const bokehBackend = {
			id: "bokeh",
			attribute: bokehConfig.chartSrcAttribute || "data-bokeh",
			scrolling: bokehConfig.scrolling || "no",
			scripts: [bokehUrl],
			renderDiv(element, url) {
				return fetchJson(url).then((item) => window.Bokeh.embed.embed_item(fixBokehItem(item), element.id));
			},
			buildIframeSrcdoc(url) {
				return buildSrcdoc({
					scripts: [bokehUrl],
					styles:
						"html,body{width:100%;height:100%;margin:0;overflow:hidden}" +
						".bk-root{width:100%!important;height:100%!important;display:flex;justify-content:center;align-items:center}",
					bodyHtml: '<div id="vis" class="bk-root"></div>',
					inlineScript:
						`fetch(${JSON.stringify(url)})` +
						`.then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})` +
						`.then(item=>{` +
						`if(!item.doc&&item.roots)item={doc:item,root_id:Object.keys(item.roots)[0],version:item.version};` +
						`Bokeh.embed.embed_item(item,"vis");` +
						`}).catch(e=>console.warn('bokeh iframe:',e));`,
				});
			},
		};

		// ---- Plotly ------------------------------------------------------
		const plotlyUrl = (plotlyConfig.urls && plotlyConfig.urls.plotly) || "https://cdn.plot.ly/plotly-3.4.0.min.js";

		function preparePlotlyItem(item) {
			if (!item.config) item.config = {};
			if (item.config.responsive === undefined) item.config.responsive = true;
			return item;
		}

		// ---- Plotly fragment state ---------------------------------------
		const plotlyCharts = new WeakMap();
		const plotlyPreInject = new WeakMap();

		function collectPlotlyPaths(fragments, kind) {
			const paths = new Set();
			for (const entry of fragments) {
				if (entry[kind]) Object.keys(entry[kind]).forEach((p) => paths.add(p));
			}
			return [...paths];
		}

		function captureRestyleBaseline(gd, paths) {
			const baseline = {};
			for (const path of paths) {
				baseline[path] = (gd.data || []).map((trace) => getNestedPath(trace, path));
			}
			return baseline;
		}

		function captureRelayoutBaseline(gd, paths) {
			const baseline = {};
			for (const path of paths) {
				baseline[path] = getNestedPath(gd.layout, path);
			}
			return baseline;
		}

		function applyPlotlyState(element) {
			const meta = plotlyCharts.get(element);
			if (!meta || !window.Plotly) return;
			const currentAt = currentVisibleAt(meta.proxies);
			const restyleMerged = { ...meta.baselineRestyle };
			const relayoutMerged = { ...meta.baselineRelayout };
			for (const entry of meta.fragments) {
				if (entry.at > currentAt) continue;
				if (entry.restyle) Object.assign(restyleMerged, entry.restyle);
				if (entry.relayout) Object.assign(relayoutMerged, entry.relayout);
			}
			if (Object.keys(restyleMerged).length) {
				try {
					window.Plotly.restyle(element, restyleMerged);
				} catch (e) {
					console.warn("plotly: restyle failed", e);
				}
			}
			if (Object.keys(relayoutMerged).length) {
				try {
					window.Plotly.relayout(element, relayoutMerged);
				} catch (e) {
					console.warn("plotly: relayout failed", e);
				}
			}
		}

		const plotlyBackend = {
			id: "plotly",
			attribute: plotlyConfig.chartSrcAttribute || "data-plotly",
			scrolling: plotlyConfig.scrolling || "no",
			scripts: [plotlyUrl],
			lazy: true,
			async preInject(element) {
				const url = element.getAttribute(this.attribute);
				let spec = url ? null : readInlineJson(element, "plotly-spec");
				if (!spec && url) {
					try {
						spec = await fetchJson(url);
					} catch (e) {
						console.warn(`plotly: failed to fetch spec ${url}`, e);
						return;
					}
				}
				if (!spec) return;
				const plotlyDatasets = await loadDatasets(element, "plotly");
				if (plotlyDatasets.length) injectPlotlyDatasets(spec, plotlyDatasets);
				const fragments = readFragmentScript(element, "plotly-fragments", spec);
				if (!fragments) {
					plotlyPreInject.set(element, { spec });
					return;
				}
				const indices = [...new Set(fragments.map((e) => e.at))].sort((a, b) => a - b);
				const proxies = injectChartProxies(element, indices);
				plotlyPreInject.set(element, { spec, fragments, proxies });
			},
			renderDiv(element, _url) {
				const pre = plotlyPreInject.get(element);
				if (!pre || !pre.spec) {
					console.warn("plotly: no spec source — set data-plotly='url' or add <script class='plotly-spec'>");
					return Promise.resolve();
				}
				const item = preparePlotlyItem(pre.spec);
				return window.Plotly.newPlot(element.id, item.data, item.layout, item.config).then(() => {
					if (item.frames) window.Plotly.addFrames(element.id, item.frames);
					if (element.offsetParent !== null) window.Plotly.Plots.resize(element.id);
					if (pre.fragments) {
						const restylePaths = collectPlotlyPaths(pre.fragments, "restyle");
						const relayoutPaths = collectPlotlyPaths(pre.fragments, "relayout");
						plotlyCharts.set(element, {
							fragments: pre.fragments,
							proxies: pre.proxies,
							baselineRestyle: captureRestyleBaseline(element, restylePaths),
							baselineRelayout: captureRelayoutBaseline(element, relayoutPaths),
						});
						applyPlotlyState(element);
					}
				});
			},
			buildIframeSrcdoc(url) {
				return buildSrcdoc({
					scripts: [plotlyUrl],
					styles:
						"html,body{width:100%;height:100%;margin:0;overflow:hidden}" +
						".plotly-graph-div{width:100%!important;height:100%!important}",
					bodyHtml: '<div id="vis" class="plotly-graph-div"></div>',
					inlineScript:
						`fetch(${JSON.stringify(url)})` +
						`.then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})` +
						`.then(item=>{` +
						`if(!item.config)item.config={};` +
						`if(item.config.responsive===undefined)item.config.responsive=true;` +
						`return Plotly.newPlot("vis",item.data,item.layout,item.config).then(()=>{` +
						`if(item.frames)Plotly.addFrames("vis",item.frames);` +
						`});` +
						`}).catch(e=>console.warn('plotly iframe:',e));`,
				});
			},
			postInit({ reveal, divCount }) {
				if (!divCount) return;
				const resize = (root) => {
					if (!window.Plotly) return;
					root.querySelectorAll("div.js-plotly-plot").forEach((p) => window.Plotly.Plots.resize(p));
				};
				reveal.addEventListener("slidechanged", (e) => resize(e.currentSlide));
				reveal.addEventListener("pdf-ready", () => resize(document));
				const updateSlide = (slide) => {
					if (!slide) return;
					slide.querySelectorAll(`div[${this.attribute}]`).forEach((el) => {
						if (plotlyCharts.has(el)) applyPlotlyState(el);
					});
				};
				const slideOf = (frag) => (frag && frag.closest ? frag.closest("section") : null);
				reveal.addEventListener("fragmentshown", (e) => updateSlide(slideOf(e.fragment)));
				reveal.addEventListener("fragmenthidden", (e) => updateSlide(slideOf(e.fragment)));
				reveal.addEventListener("slidechanged", (e) => updateSlide(e.currentSlide));
				updateSlide(reveal.getCurrentSlide());
			},
		};

		// ---- Vega --------------------------------------------------------
		const vegaUrls = {
			vega: (vegaConfig.urls && vegaConfig.urls.vega) || "https://cdn.jsdelivr.net/npm/vega@6.2.0/build/vega.min.js",
			vegaLite:
				(vegaConfig.urls && vegaConfig.urls.vegaLite) ||
				"https://cdn.jsdelivr.net/npm/vega-lite@6.4.2/build/vega-lite.min.js",
			vegaEmbed:
				(vegaConfig.urls && vegaConfig.urls.vegaEmbed) ||
				"https://cdn.jsdelivr.net/npm/vega-embed@7.1.0/build/vega-embed.min.js",
			customIframeEmbedder: (vegaConfig.urls && vegaConfig.urls.customIframeEmbedder) || null,
			customIframeCss: (vegaConfig.urls && vegaConfig.urls.customIframeCss) || null,
		};

		const vegaOpts = vegaConfig.vegaOptions || {
			mode: "vega-lite",
			theme: "auto",
			renderer: "svg",
			actions: false,
			tooltip: { theme: "fivethirtyeight" },
		};

		if ((vegaOpts.theme || "auto") === "auto") {
			vegaOpts.theme = document.querySelector(
				'[href*="black.css"],[href*="league.css"],[href*="night.css"],[href*="moon.css"],[href*="dracula.css"],[href*="blood.css"]',
			)
				? "dark"
				: "default";
		}

		// ---- Shared fragment infrastructure ------------------------------
		//
		// Both vega and plotly backends support reveal.js fragment-driven scripted
		// narration via a list of `{at: N, ...}` entries. The list comes from
		// either a sibling `<script type="application/json" class="...-fragments">`
		// block, or from `spec.usermeta.revealFragments` inside the chart spec.
		// The plugin pre-injects one invisible `.fragment` proxy per distinct `at`
		// at init time, so reveal's first sort sees them alongside any other
		// fragments on the slide. State is cumulative: at fragment K the plugin
		// merges all entries with `at <= K` over a captured baseline.

		function readInlineJson(element, className) {
			const node = element.querySelector(
				`:scope > script[type="application/json"].${className}, :scope > script.${className}[type="application/json"]`,
			);
			if (!node) return null;
			try {
				return JSON.parse(node.textContent);
			} catch (e) {
				console.warn(`charts: invalid JSON in <script class="${className}">`, e);
				return null;
			}
		}

		function cleanFragments(arr) {
			if (!Array.isArray(arr)) return null;
			const cleaned = arr.filter((entry) => entry && Number.isInteger(entry.at));
			return cleaned.length ? cleaned : null;
		}

		function readFragmentScript(element, siblingClass, spec) {
			// Priority: sibling <script> > spec.usermeta.revealFragments
			const sibling = cleanFragments(readInlineJson(element, siblingClass));
			if (sibling) return sibling;
			if (spec && spec.usermeta && Array.isArray(spec.usermeta.revealFragments)) {
				return cleanFragments(spec.usermeta.revealFragments);
			}
			return null;
		}

		function injectChartProxies(element, indices) {
			// Place proxies in the chart's PARENT (not the chart div itself) so they
			// survive the renderer wiping the container's innerHTML at render time.
			// They still live inside the slide section, so reveal sees them as fragments.
			const host = element.parentElement || element;
			const proxies = [];
			for (const idx of indices) {
				const span = document.createElement("span");
				span.className = "fragment fx-chart-proxy";
				span.dataset.fragmentIndex = String(idx);
				span.style.display = "none";
				span.setAttribute("aria-hidden", "true");
				host.appendChild(span);
				proxies.push({ at: idx, span });
			}
			return proxies;
		}

		function currentVisibleAt(proxies) {
			let currentAt = -1;
			for (const { at, span } of proxies) {
				if (span.classList.contains("visible") && at > currentAt) currentAt = at;
			}
			return currentAt;
		}

		// Resolve a Plotly-style path like "marker.opacity" or "shapes[0].y0".
		function getNestedPath(obj, path) {
			if (obj == null) return undefined;
			const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
			let cur = obj;
			for (const p of parts) {
				if (cur == null) return undefined;
				cur = cur[p];
			}
			return cur;
		}

		function setNestedPath(obj, path, value) {
			const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
			let cur = obj;
			for (let i = 0; i < parts.length - 1; i++) {
				const key = parts[i];
				if (cur[key] == null) cur[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
				cur = cur[key];
			}
			cur[parts[parts.length - 1]] = value;
		}

		// ---- Decoupled datasets (shared) ---------------------------------
		//
		// Two entry points for shipping the dataset separately from the spec:
		//   - container attribute  data-{vega|plotly}-data="url.json"  (single, unnamed)
		//   - sibling <script class="{vega|plotly}-data" data-name=… data-path=… data-src=…>
		//     with optional inline JSON content (URL is fetched if present, otherwise
		//     textContent is parsed).
		// Vega: unnamed → spec.data.values; named → spec.datasets[name].
		// Plotly: unnamed/attr → spec.data; pathed → setNestedPath(spec, path, value).
		// All fetches go through datasetCache so a dataset shared by N charts hits the
		// network once.
		const datasetCache = new Map();
		function fetchDatasetCached(url) {
			if (!datasetCache.has(url)) datasetCache.set(url, fetchJson(url));
			return datasetCache.get(url);
		}

		async function loadDatasets(element, kind) {
			const attrName = `data-${kind}-data`;
			const className = `${kind}-data`;
			const entries = [];
			const attrSrc = element.getAttribute(attrName);
			if (attrSrc) entries.push({ name: null, path: null, src: attrSrc, inline: null });
			element.querySelectorAll(`:scope > script.${className}`).forEach((node) => {
				const inline = node.textContent && node.textContent.trim() ? node.textContent : null;
				entries.push({
					name: node.getAttribute("data-name"),
					path: node.getAttribute("data-path"),
					src: node.getAttribute("data-src"),
					inline,
				});
			});
			if (!entries.length) return [];
			const resolved = await Promise.all(
				entries.map(async (e) => {
					try {
						if (e.inline) return { ...e, value: JSON.parse(e.inline) };
						if (e.src) return { ...e, value: await fetchDatasetCached(e.src) };
					} catch (err) {
						console.warn(`charts: failed to load ${kind}-data`, e.src || "(inline)", err);
					}
					return null;
				}),
			);
			return resolved.filter(Boolean);
		}

		function injectVegaDatasets(spec, datasets) {
			for (const { name, value } of datasets) {
				if (name) {
					if (!spec.datasets || typeof spec.datasets !== "object") spec.datasets = {};
					spec.datasets[name] = value;
				} else {
					const cur = spec.data && typeof spec.data === "object" && !Array.isArray(spec.data) ? spec.data : {};
					const { url: _u, values: _v, ...rest } = cur;
					spec.data = { ...rest, values: value };
				}
			}
		}

		function injectPlotlyDatasets(spec, datasets) {
			for (const { path, value } of datasets) {
				if (path) setNestedPath(spec, path, value);
				else spec.data = value;
			}
		}

		// ---- Vega fragment state -----------------------------------------
		const vegaCharts = new WeakMap();
		const vegaPreInject = new WeakMap();

		function captureVegaBaseline(view, fragments) {
			const names = new Set();
			for (const e of fragments) if (e.signals) Object.keys(e.signals).forEach((n) => names.add(n));
			const baseline = {};
			for (const n of names) {
				try {
					baseline[n] = view.signal(n);
				} catch (err) {
					console.warn(`vega: signal "${n}" missing in spec; baseline not captured`);
				}
			}
			return baseline;
		}

		function applyVegaState(element) {
			const meta = vegaCharts.get(element);
			if (!meta) return;
			const currentAt = currentVisibleAt(meta.proxies);
			const merged = { ...meta.baseline };
			for (const entry of meta.fragments) {
				if (entry.at > currentAt) continue;
				if (entry.signals) Object.assign(merged, entry.signals);
			}
			let dirty = false;
			for (const [name, value] of Object.entries(merged)) {
				try {
					meta.view.signal(name, value);
					dirty = true;
				} catch (err) {
					/* signal not in spec; ignore */
				}
			}
			if (dirty) meta.view.runAsync().catch(() => {});
		}

		const vegaBackend = {
			id: "vega",
			attribute: vegaConfig.chartSrcAttribute || "data-vega",
			scrolling: vegaConfig.scrolling || "no",
			scripts: [vegaUrls.vega, vegaUrls.vegaLite, vegaUrls.vegaEmbed],
			lazy: true,
			// Pre-inject fragment proxies at plugin init time, BEFORE any slide is sorted
			// by reveal.js. If we waited until lazy-render to inject them, reveal would
			// have already sorted the slide's other fragments (renumbering 1..N → 0..N-1
			// contiguously), and our late-arriving proxies would land 1 click out of phase
			// with co-fired bullets. URL specs are fetched here too (instead of inside
			// vegaEmbed) so we can read `usermeta.revealFragments` from the parsed spec.
			async preInject(element) {
				const url = element.getAttribute(this.attribute);
				let spec = url ? null : readInlineJson(element, "vega-spec");
				if (!spec && url) {
					try {
						spec = await fetchJson(url);
					} catch (e) {
						console.warn(`vega: failed to fetch spec ${url}`, e);
						return;
					}
				}
				if (!spec) return;
				const vegaDatasets = await loadDatasets(element, "vega");
				if (vegaDatasets.length) injectVegaDatasets(spec, vegaDatasets);
				const fragments = readFragmentScript(element, "vega-fragments", spec);
				if (!fragments) {
					vegaPreInject.set(element, { spec });
					return;
				}
				const indices = [...new Set(fragments.map((e) => e.at))].sort((a, b) => a - b);
				const proxies = injectChartProxies(element, indices);
				vegaPreInject.set(element, { spec, fragments, proxies });
			},
			renderDiv(element, _url) {
				const pre = vegaPreInject.get(element);
				const source = pre && pre.spec;
				if (!source) {
					console.warn("vega: no spec source — set data-vega='url' or add <script class='vega-spec'>");
					return Promise.resolve();
				}
				return window.vegaEmbed(element, source, vegaOpts).then((result) => {
					const newWidth = element.dataset.overrideWidth;
					const newHeight = element.dataset.overrideHeight;
					if (newWidth || newHeight) {
						const containerDiv = result.view._el;
						const svg = containerDiv.querySelector("svg");
						if (svg) {
							if (newWidth) svg.width.baseVal.value = newWidth;
							if (newHeight) svg.height.baseVal.value = newHeight;
						} else {
							const canvasEl = containerDiv.querySelector("canvas");
							if (canvasEl) {
								if (newWidth) canvasEl.style.width = newWidth + "px";
								if (newHeight) canvasEl.style.height = newHeight + "px";
							}
						}
					}
					if (pre.fragments) {
						const baseline = captureVegaBaseline(result.view, pre.fragments);
						vegaCharts.set(element, {
							view: result.view,
							fragments: pre.fragments,
							baseline,
							proxies: pre.proxies,
						});
						applyVegaState(element);
					}
				});
			},
			buildIframeSrcdoc(url) {
				const scripts = [vegaUrls.vega, vegaUrls.vegaLite, vegaUrls.vegaEmbed];
				if (vegaUrls.customIframeEmbedder) scripts.push(vegaUrls.customIframeEmbedder);
				const embedFn = vegaUrls.customIframeEmbedder ? "vegaEmbedCustom" : "vegaEmbed";
				return buildSrcdoc({
					scripts,
					links: vegaUrls.customIframeCss ? [vegaUrls.customIframeCss] : [],
					bodyAttrs: 'style="display:flex;justify-content:center;align-items:center;width:99vw;height:99vh"',
					inlineScript: `${embedFn}("body", ${JSON.stringify(url)}, ${JSON.stringify(vegaOpts)});`,
				});
			},
			postInit({ reveal, divCount }) {
				if (!divCount) return;
				const updateSlide = (slide) => {
					if (!slide) return;
					slide.querySelectorAll(`div[${this.attribute}]`).forEach((el) => {
						if (vegaCharts.has(el)) applyVegaState(el);
					});
				};
				const slideOf = (frag) => (frag && frag.closest ? frag.closest("section") : null);
				reveal.addEventListener("fragmentshown", (e) => updateSlide(slideOf(e.fragment)));
				reveal.addEventListener("fragmenthidden", (e) => updateSlide(slideOf(e.fragment)));
				reveal.addEventListener("slidechanged", (e) => updateSlide(e.currentSlide));
				updateSlide(reveal.getCurrentSlide());
			},
		};

		const backends = [bokehBackend, plotlyBackend, vegaBackend];
		const results = await Promise.all(backends.map(processBackend));

		backends.forEach((backend, i) => {
			if (typeof backend.postInit === "function") backend.postInit({ reveal, ...results[i] });
		});
	},
};
