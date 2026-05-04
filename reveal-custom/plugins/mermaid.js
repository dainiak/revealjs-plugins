/*
    Plugin for embedding mermaid.js diagrams in reveal.js presentations
    GitHub: https://github.com/dainiak/revealjs-plugins/

    Author: Alex Dainiak
    Web: www.dainiak.com
    Email: dainiak@gmail.com

    Processing rules can be added to post-process the diagram SVG DOM subtree.
    One can set the id, set or remove classes, or set attributes on the SVG elements. In any combinations:
        %%% someCssSelector -> #cssIdToSet .css-class-to-set !.class-to-remove [some-property-to-set=newValue]
    If the `->` arrow is used then the modifications are applied to the element itself.
    If the `^->` arrow is used then the element is wrapped with a g element and modifications are applied to this g.
    If the `_->` arrow is used then a single g is added as the only new child of the element and the modifications are applied to this g. All the former children are moved inside this g.
    You can use [n] right after the selector to target a specific element in the list of matching elements. Works even when `:nth-child` does not.
    Examples:
        %% Apply .fragment class to the first of the mermaid nodes:
        %%% g.node[1] -> .fragment

        %% Make the "Start" node a fragment step and red
        %%% rect[id*="A"] _-> .fragment .fade-up [data-fragment-index=1]

        %% Remove default class and add new one
        %%% #D -> !.node .end-state
 */

const RevealMermaid = {
	id: "mermaid",
	init: async (reveal) => {
		const katexVersion = "0.16.45";
		const mermaidVersion = "11.14.0";
		let options = reveal.getConfig().mermaid || {};
		options = {
			mathInLabels: options.mathInLabels !== false,
			urls: options.urls || {
				mermaid:
					(options.urls && options.urls.mermaid) ||
					`https://cdn.jsdelivr.net/npm/mermaid@${mermaidVersion}/dist/mermaid.min.js`,
				katex:
					(options.urls && options.urls.katex) ||
					`https://cdn.jsdelivr.net/npm/katex@${katexVersion}/dist/katex.min.js`,
				katexCss:
					(options.urls && options.urls.katexCss) ||
					`https://cdn.jsdelivr.net/npm/katex@${katexVersion}/dist/katex.min.css`,
			},
			selectors: {
				container: (options.selectors && options.selectors.container) || "[data-mermaid]",
				script: (options.selectors && options.selectors.script) || 'script[type="text/mermaid"]',
			},
			overflowVisible: options.overflowVisible === undefined ? true : options.overflowVisible,
			mermaidInit: options.mermaidInit || {
				startOnLoad: false,
				theme: "auto",
				suppressErrorRendering: true,
			},
			iconPacks: options.iconPacks || [],
			css: {
				enabled: options?.css?.enabled !== false,
				cssIndices: options?.css?.cssIndices !== false,
				indexClassPrefix: options?.css?.indexClassPrefix || "fragidx-",
				autoEdgeFragidx: options?.css?.autoEdgeFragidx !== false,
				debug: options?.css?.debug || false,
			},
		};

		// Registry of runtime fx verbs for the directive DSL (`%%! verb T at R`).
		// Each entry: {cls, css}. The plugin's fragment listener toggles `cls`
		// on the targeted SVG element while the verb's range is active; `css`
		// is the default style block injected at init time.
		//
		// To add a new verb, append an entry here. The directive parser
		// (`verb in FX_VERBS`), the listener (FX_CLASSES / verbToClass), and
		// the injected stylesheet all derive from this object — one place.
		//
		// Decks override per-verb appearance by setting CSS variables (e.g.
		// `--fx-highlight-glow`) in their own <style>, or by writing
		// `.fx-<verb> { ... }` rules with higher specificity.
		//
		// !important is necessary because mermaid's own theme CSS uses
		// high-specificity selectors like `#<svg-id> .node rect { ... }`
		// (1,1,1). Our class-based selectors are (0,1,1) and would lose
		// otherwise. Edge labels are HTML <p> inside <foreignObject>, not SVG
		// shapes — they need their own selectors.

		// Common selector list for "the dimmable / spotlightable graphics in a
		// mermaid SVG". Used by the `spotlight` verb's :has()-based inverted-dim
		// rule. Enumerates the elements the resolver tags across diagram types
		// (flowchart, classDiagram, erDiagram, stateDiagram, sequenceDiagram,
		// timeline) so the dim acts on a stable, atom-aligned set rather than
		// "every g in the SVG" (which would compound opacity weirdly).
		const SPOTLIGHT_DIM_SELECTOR = [
			"g.node",
			"g.cluster",
			"g.edgePath",
			"g.edgeLabel",
			"path.flowchart-link",
			"rect.actor",
			"text.actor",
			"line.actor-line",
			"line.messageLine0",
			"line.messageLine1",
			"path.messageLine0",
			"path.messageLine1",
			"text.messageText",
			"g.note",
			"rect.note",
			"text.noteText",
			"polygon.labelBox",
			"text.labelText",
			"text.loopText",
			"rect.activation0",
			"rect.activation1",
			"rect.activation2",
			// gantt
			"rect.task",
			"text.taskText",
			"text.taskTextOutsideRight",
			"text.taskTextOutsideLeft",
			"text.sectionTitle",
			"rect.section",
			// sankey: g.node already covered above; the link wrapper carries the path.
			"g.link",
			// gitGraph
			"circle.commit",
			"line.branch",
			"g.branchLabel",
			"path.arrow",
			"g.commit-labels",
			"text.commit-label",
			"polygon.tag-label-bkg",
			"text.tag-label",
		].join(", ");

		const FX_VERBS = {
			// Color-agnostic emphasis: a soft halo (drop-shadow) plus a small
			// stroke-width bump and bold label text. Works regardless of the
			// element's existing fill/stroke — the previous color-swap variant
			// was invisible whenever the node was already that color.
			//
			// drop-shadow on the wrapping <g> (or directly on a <path> for
			// edges) renders an additive glow that survives any underlying
			// theme. Recolour per deck via --fx-highlight-glow.
			highlight: {
				cls: "fx-highlight",
				css: `
					.fx-highlight {
						filter: drop-shadow(0 0 5px var(--fx-highlight-glow, rgba(255, 90, 70, 0.9)));
						transition: filter 0.3s;
					}
					.fx-highlight :is(rect, polygon, ellipse, circle, path),
					path.fx-highlight {
						stroke-width: var(--fx-highlight-width, 3px) !important;
						transition: stroke-width 0.3s, filter 0.3s;
					}
					.fx-highlight :is(foreignObject p, .edgeLabel p, .nodeLabel p, text) {
						font-weight: bold !important;
						transition: font-weight 0.3s;
					}
				`,
			},
			accent: {
				cls: "fx-accent",
				css: `
					.fx-accent {
						filter: drop-shadow(0 0 5px var(--fx-accent-glow, rgba(70, 150, 240, 0.9)));
						transition: filter 0.3s;
					}
					.fx-accent :is(rect, polygon, ellipse, circle, path),
					path.fx-accent {
						stroke-width: var(--fx-accent-width, 3px) !important;
						transition: stroke-width 0.3s, filter 0.3s;
					}
					.fx-accent :is(foreignObject p, .edgeLabel p, .nodeLabel p, text) {
						font-weight: bold !important;
						transition: font-weight 0.3s;
					}
				`,
			},
			dim: {
				cls: "fx-dim",
				css: `
					.fx-dim {
						opacity: var(--fx-dim-opacity, 0.35) !important;
						transition: opacity 0.3s;
					}
				`,
			},
			// Inverted-dim model: the spotlit element gets a strong halo and
			// every other "first-class" graphic in the same SVG fades out.
			// Implemented purely in CSS via :has() — no extra JS plumbing,
			// scope is automatically the containing <svg>. Elements that
			// merely *contain* a spotlit descendant (e.g. a cluster wrapping
			// a spotlit node) stay full-opacity, otherwise SVG opacity would
			// cascade-multiply and dim the spotlit element itself.
			spotlight: {
				cls: "fx-spotlight",
				css: `
					.fx-spotlight {
						filter: drop-shadow(0 0 7px var(--fx-spotlight-glow, rgba(255, 200, 60, 0.95)));
						transition: filter 0.3s, opacity 0.3s;
					}
					.fx-spotlight :is(rect, polygon, ellipse, circle, path),
					path.fx-spotlight {
						stroke-width: var(--fx-spotlight-width, 3px) !important;
						transition: stroke-width 0.3s, filter 0.3s;
					}
					.fx-spotlight :is(foreignObject p, .edgeLabel p, .nodeLabel p, text) {
						font-weight: bold !important;
						transition: font-weight 0.3s;
					}
					svg:has(.fx-spotlight) :is(${SPOTLIGHT_DIM_SELECTOR}):not(.fx-spotlight):not(:has(.fx-spotlight)) {
						opacity: var(--fx-spotlight-other-opacity, 0.18) !important;
						transition: opacity 0.3s;
					}
				`,
			},
		};
		const fxStyles = Object.values(FX_VERBS)
			.map((v) => v.css)
			.join("\n");

		let scriptsToLoad = [
			{
				url: options.urls.mermaid,
				condition: !window.mermaid && !document.querySelector(`script[src="${options.mermaidUrl}"]`),
			},
			{
				url: options.urls.katex,
				condition:
					options.mathInLabels && !window.katex && !document.querySelector(`script[src="${options.katexUrl}"]`),
			},
			{
				url: options.urls.katexCss,
				type: "text/css",
				condition: !window.vegaEmbed && !window.katex,
			},
			{
				type: "text/css",
				content: fxStyles,
			},
		];

		function loadScript(params) {
			return new Promise((resolve) => {
				if (
					params.condition !== undefined &&
					!(params.condition === true || (typeof params.condition == "function" && params.condition.call()))
				) {
					return resolve();
				}

				if (params.type === undefined)
					params.type = params.url && params.url.match(/\.css[^.]*$/) ? "text/css" : "text/javascript";

				let element;

				if (params.type === "text/css") {
					if (params.content) {
						element = document.createElement("style");
						element.textContent = params.content;
					} else {
						element = document.createElement("link");
						element.rel = "stylesheet";
						element.type = "text/css";
						element.href = params.url;
					}
				} else {
					element = document.createElement("script");
					element.type = params.type || "text/javascript";
					if (params.content) element.textContent = params.content;
					else element.src = params.url;
				}

				if (params.content) {
					document.querySelector("head").appendChild(element);
					resolve();
				} else {
					element.onload = resolve;
					document.querySelector("head").appendChild(element);
				}
			});
		}

		if (!reveal.getSlidesElement().querySelector(options.selectors.container)) return;

		// Load mermaid, katex, and katex CSS in parallel (they are independent)
		await Promise.all(scriptsToLoad.map((s) => loadScript(s)));

		if ((options.mermaidInit.theme || "auto") === "auto") {
			options.mermaidInit.theme = "default";
			if (
				document.querySelector(
					'[href*="black.css"],[href*="league.css"],[href*="night.css"],[href*="moon.css"],[href*="dracula.css"],[href*="blood.css"]',
				)
			) {
				options.mermaidInit.theme = "dark";
			}
		}

		window.mermaid.initialize(options.mermaidInit);

		if (options.iconPacks) {
			for (let packName in options.iconPacks) {
				window.mermaid.registerIconPacks([
					{
						name: packName,
						loader: () => fetch(options.iconPacks[packName]).then((res) => res.json()),
					},
				]);
			}
		}

		function dedentAndTrim(str) {
			const TAB_WIDTH = 4;
			const lines = str.split(/\r?\n/);
			let minIndent = Infinity;

			for (const line of lines) {
				if (!line.trim()) continue;
				let width = 0;
				for (const char of line) {
					if (char === " ") width++;
					else if (char === "\t") width += TAB_WIDTH;
					else break;
				}
				if (width < minIndent) minIndent = width;
			}

			if (minIndent === Infinity) minIndent = 0;

			return lines
				.map((line) => {
					let width = 0,
						i = 0;
					for (; i < line.length; i++) {
						if (width >= minIndent) break;
						const char = line[i];
						if (char === " ") width++;
						else if (char === "\t") width += TAB_WIDTH;
						else break;
					}
					return " ".repeat(Math.max(0, width - minIndent)) + line.slice(i);
				})
				.join("\n")
				.trim();
		}

		const mermaidContainers = Array.from(reveal.getSlidesElement().querySelectorAll(options.selectors.container));

		const renderPromises = mermaidContainers.map(async (mermaidContainer) => {
			const parent = mermaidContainer.parentNode;
			const newDiv = document.createElement("div");
			parent.insertBefore(newDiv, mermaidContainer);

			const mermaidScript = mermaidContainer.querySelector("script");
			if (mermaidScript) {
				mermaidScript.textContent = dedentAndTrim(mermaidScript.textContent);
			}

			if (!mermaidContainer.id) mermaidContainer.id = `mermaid-${Math.floor(Math.random() * 1000000)}`;

			let graphDefinition;
			const mermaidAttrValue = mermaidContainer.getAttribute("data-mermaid");
			if (mermaidAttrValue && mermaidAttrValue.trim() !== "") {
				try {
					const response = await fetch(mermaidAttrValue.trim());
					if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
					graphDefinition = await response.text();
				} catch (error) {
					console.warn(`Mermaid Plugin: Failed to fetch diagram from "${mermaidAttrValue}":`, error);
					mermaidContainer.remove();
					return;
				}
			} else {
				const scriptEl = mermaidContainer.querySelector(options.selectors.script);
				if (!scriptEl) {
					console.warn("Mermaid Plugin: No script element or data-mermaid path found in container", mermaidContainer);
					mermaidContainer.remove();
					return;
				}
				graphDefinition = scriptEl.innerHTML;
			}
			let renderRules = [];

			// Detect diagram type from the first non-comment line. Used by directive
			// routing (show needs post-render tagging on diagrams that don't accept
			// `class A fragidx-N` statements) and by the per-diagram alias/structural
			// resolvers built after render.
			const detectDiagramType = (src) => {
				for (const raw of src.split(/\r?\n/)) {
					const line = raw.replace(/%%.*$/, "").trim();
					if (!line) continue;
					if (/^(flowchart|graph)\b/.test(line)) return "flowchart";
					if (/^classDiagram/.test(line)) return "classDiagram";
					if (/^erDiagram/.test(line)) return "erDiagram";
					if (/^stateDiagram/.test(line)) return "stateDiagram";
					if (/^sequenceDiagram/.test(line)) return "sequenceDiagram";
					if (/^mindmap/.test(line)) return "mindmap";
					if (/^timeline/.test(line)) return "timeline";
					if (/^gantt\b/.test(line)) return "gantt";
					if (/^sankey-?beta\b/i.test(line)) return "sankey";
					if (/^gitGraph\b/.test(line)) return "gitGraph";
					return "other";
				}
				return "other";
			};
			const diagramType = detectDiagramType(graphDefinition);
			// Diagrams whose mermaid grammar rejects `class A fragidx-N`
			// statements OR whose user-meaningful targets aren't bare node IDs
			// in the source (so `show msg:1` cannot translate to a pre-compile
			// `class` statement). On these the `show` verb routes through
			// post-render tagging — the same pipeline as `fragment` — using
			// the alias map built per diagram type.
			const showNeedsPostRender =
				diagramType === "mindmap" ||
				diagramType === "timeline" ||
				diagramType === "sequenceDiagram" ||
				diagramType === "gantt" ||
				diagramType === "sankey" ||
				diagramType === "gitGraph";

			// 1. Extract Custom CSS Logic
			// Regex matches: selector + (one of ->, ^->, _->) + assignment
			const ruleRegex = /^\s*%%%\s+(.+?)\s+([\^_]?->)\s+(.+?)\s*$/gm;

			graphDefinition = graphDefinition.replace(ruleRegex, (match, selector, arrow, assignment) => {
				renderRules.push({
					selector,
					assignment,
					type: arrow,
				});
				return match;
			});

			// 1b. Extract %%! directives. Format: `%%! verb target at <range>`.
			//
			// Verbs and what `at K` means for each:
			//   show X at K       — node X (named) appears at step K. Single-K, node
			//                       IDs only. Translates to a mermaid `class X fragidx-K`
			//                       statement so auto-edge-fragidx propagation makes
			//                       incident edges wait for X.
			//   fragment T at K   — any resolvable target (node, edge, edge-arrow,
			//                       edge-label, subgraph cluster) becomes a reveal.js
			//                       fragment at step K. Use for atoms `class` can't
			//                       reach (edges, labels) or to override the auto-edge-
			//                       fragidx default. Single-K, same atom grammar as
			//                       the runtime fx verbs.
			//   highlight T at R  — runtime fx-highlight on T over range R.
			//   dim T at R        — runtime fx-dim on T over range R.
			//   accent T at R     — runtime fx-accent on T over range R.
			//   spotlight T at R  — runtime fx-spotlight on T over range R, plus
			//                       inverted-dim on every other first-class graphic
			//                       in the same SVG (CSS :has() rule).
			//
			// Range R for the runtime fx verbs:
			//   K        transient: active only on step K (uses .current-fragment)
			//   K+       sticky-from: active when step >= K
			//   K-       sticky-to:   active until step K (on at slide load)
			//   K..M     closed range: active when K <= step <= M
			//   start    transient at slide-load (before any fragment fires)
			//   start+   always active (slide-load through end of slide)
			//   start..K equivalent to K-
			// All step indices are relative to the slide's other fragments —
			// reveal.js renormalises data-fragment-index values to a contiguous
			// 0-based sequence at runtime, so the K you write is relative to
			// other fragments on the slide.
			//
			// show/fragment translate to fragidx-K classes on SVG elements
			// (handled by the existing fragidx pipeline + cssIndices pass).
			// The runtime fx verbs (highlight/dim/accent/spotlight) are encoded
			// as directive metadata + proxy fragments at boundary indices; the
			// listener computes per-directive active state from proxy visibility.
			const directiveRegex = /^[\t ]*%%!\s+(\w+)\s+(.+?)\s+at\s+(start(?:\+|-|\.\.\d+)?|\d+(?:\+|-|\.\.\d+)?)\s*$/gm;
			// fxDirectives: {verb, target, transient, onIdx, offIdx} — the runtime
			//   verbs. onIdx/offIdx are user-written K values (or undefined).
			//   transient=true means .current-fragment semantics (lit only on the
			//   exact step its ON proxy occupies).
			// fragmentDirectives: {target, idx} — applied post-render by tagging
			//   resolved SVG elements with fragidx-K so the cssIndices pass picks
			//   them up.
			const fxDirectives = [];
			const fragmentDirectives = [];
			const revealAdditions = [];
			graphDefinition = graphDefinition.replace(directiveRegex, (match, verb, target, atRange) => {
				// Parse the range into {transient, onIdx, offIdx}.
				let transient = false,
					onIdx,
					offIdx;
				const m = atRange.match(/^(start|\d+)\.\.(\d+)$/);
				if (m) {
					// closed range: start..end
					if (m[1] === "start") {
						offIdx = parseInt(m[2], 10) + 1; // sticky-to behavior
					} else {
						const s = parseInt(m[1], 10);
						const e = parseInt(m[2], 10);
						if (s > e) {
							console.warn(`Mermaid directive: invalid range '${atRange}'`);
							return "";
						}
						onIdx = s;
						offIdx = e + 1;
					}
				} else if (/\+$/.test(atRange)) {
					// sticky-from
					if (atRange.startsWith("start")) {
						/* always-on: no proxies */
					} else onIdx = parseInt(atRange, 10);
				} else if (/-$/.test(atRange)) {
					// sticky-to
					offIdx = parseInt(atRange, 10) + 1;
				} else if (atRange === "start") {
					// transient at slide-load
					transient = true;
					offIdx = 0;
				} else {
					// transient at K
					transient = true;
					onIdx = parseInt(atRange, 10);
				}

				const trimmedTarget = target.trim();
				if (verb === "show") {
					// `show X at K` — node X (or, on diagrams with structural
					// targets like timeline, a section/period/event) appears at
					// step K. On flowchart/classDiagram/erDiagram/stateDiagram
					// this rewrites to `class X fragidx-K` (mermaid statement,
					// pre-compile) so auto-edge propagation works. On mindmap
					// and timeline mermaid rejects `class` statements, so we
					// route `show` through the same post-render fragidx tagging
					// as `fragment`. The atom grammar is correspondingly wider
					// for those — same as `fragment`/`highlight`.
					if (atRange === "start" || /\+|\-|\.\./.test(atRange)) {
						console.warn(`Mermaid directive: 'show' only supports 'at K' (single step), not '${atRange}'`);
						return "";
					}
					const k = parseInt(atRange, 10);
					if (showNeedsPostRender) {
						fragmentDirectives.push({ target: trimmedTarget, idx: k, structural: true });
					} else {
						// Bare node names only — edge/label atoms (e.g. `A->B`) are
						// runtime-only post-render tagging. Hyphenated IDs like
						// `User-Agent` ARE allowed: mermaid accepts them in
						// `class A-B fragidx-N` statements.
						const names = trimmedTarget.split(/\s*,\s*/).filter((n) => /^\w+(?:-\w+)*$/.test(n));
						for (const n of names) revealAdditions.push(`class ${n} fragidx-${k}`);
					}
				} else if (verb === "fragment") {
					// `fragment T at K` — post-render tagging: resolves T via the
					// shared atom resolver (same grammar as highlight/dim/accent)
					// and adds fragidx-K directly to each resolved SVG element.
					// The cssIndices pass turns that into native .fragment +
					// data-fragment-index. Use this for edges/labels/subgraphs
					// (where `show` can't reach) or to override auto-edge-fragidx.
					if (atRange === "start" || /\+|\-|\.\./.test(atRange)) {
						console.warn(`Mermaid directive: 'fragment' only supports 'at K' (single step), not '${atRange}'`);
						return "";
					}
					fragmentDirectives.push({ target: trimmedTarget, idx: parseInt(atRange, 10) });
				} else if (verb in FX_VERBS) {
					fxDirectives.push({ verb, target: trimmedTarget, transient, onIdx, offIdx });
				} else {
					console.warn(`Mermaid directive: unknown verb '${verb}' in '${match.trim()}'`);
				}
				return ""; // strip directives from source
			});
			if (revealAdditions.length > 0) {
				graphDefinition = graphDefinition.trimEnd() + "\n" + revealAdditions.join("\n") + "\n";
			}

			// 2. Handle Math in Labels
			if (options.mathInLabels) {
				graphDefinition = graphDefinition.replace(/\\([(\[]).*?\\([)\]])/g, (s) => {
					let output = window.katex.renderToString(s.substring(2, s.length - 2), {
						output: "html",
						displayMode: s[1] === "[",
					});
					return output.replaceAll('"', "'");
				});
			}

			// 3. Render Mermaid
			try {
				await window.mermaid.parse(graphDefinition, { suppressErrors: false });
			} catch (error) {
				console.warn(`Mermaid diagram failed to parse:\n\n${graphDefinition}\n\nError: `, error);
				mermaidContainer.remove();
				return;
			}

			let svg;
			try {
				({ svg } = await window.mermaid.render(mermaidContainer.id, graphDefinition));
			} catch (error) {
				console.warn(`Mermaid diagram failed to render:\n\n${graphDefinition}\n\nError: `, error);
				mermaidContainer.remove();
				return;
			}
			newDiv.outerHTML = svg;
			const svgElement = parent.querySelector(`#${mermaidContainer.id}`);

			// Copy classes and styles from container
			svgElement.classList += " " + mermaidContainer.classList;
			const hasStretchClass = mermaidContainer.classList.contains("r-stretch");
			if (hasStretchClass) {
				svgElement.style.width = "";
				svgElement.style.height = "";
				svgElement.style.maxWidth = "";
				svgElement.style.maxHeight = "";
				svgElement.style.minWidth = "";
				svgElement.style.minHeight = "";
			}
			for (const prop of mermaidContainer.style) {
				const value = mermaidContainer.style.getPropertyValue(prop);
				if (value && value.trim() !== "") {
					svgElement.style.setProperty(prop, value);
				}
			}
			mermaidContainer.remove();

			// 4. Handle Overflow
			if (options.overflowVisible) {
				let selector = options.overflowVisible === "*" ? "*" : "foreignObject";
				svgElement.querySelectorAll(selector).forEach((obj) => {
					obj.setAttribute("overflow", "visible");
				});
			}

			// 5. Apply Custom CSS Logic
			if (options.css.enabled && renderRules.length > 0) {
				const svgNS = "http://www.w3.org/2000/svg";

				renderRules.forEach(({ selector, assignment, type }) => {
					try {
						selector = selector.trim();
						let indexPart = null;
						if (/.*\[\d+]$/.exec(selector)) {
							const digitPart = /\[\d+]$/.exec(selector)[0];
							indexPart = parseInt(digitPart.match(/\d+/)[0]);
							selector = selector.replace(/\[\d+]$/, "");
						}

						const targets = svgElement.querySelectorAll(selector);
						targets.forEach((el, idx) => {
							if (indexPart !== null && idx + 1 !== indexPart) return;

							if (options.css.debug) {
								console.log(selector, idx + 1, type, el);
							}

							let modificationTarget = el;

							// --- LOGIC FOR ARROW TYPES ---
							if (type === "^->") {
								// 1. OUTER WRAPPER
								// Wraps the element in a new <g> and modifies the <g>
								const wrapper = document.createElementNS(svgNS, "g");
								el.parentNode.insertBefore(wrapper, el);
								wrapper.appendChild(el);
								modificationTarget = wrapper;
							} else if (type === "_->") {
								// 2. INNER WRAPPER
								// Creates a new <g> inside the element, moves all children into it,
								// and modifies that new internal <g>
								const innerGroup = document.createElementNS(svgNS, "g");

								// Move all existing children of 'el' into 'innerGroup'
								while (el.firstChild) {
									innerGroup.appendChild(el.firstChild);
								}

								el.appendChild(innerGroup);
								modificationTarget = innerGroup;
							}
							// Default '->' falls through here, keeping modificationTarget = el

							const tokens = assignment.match(/(\[.+?\])|(\S+)/g) || [];

							tokens.forEach((token) => {
								if (token.startsWith(".")) {
									modificationTarget.classList.add(token.substring(1));
								} else if (token.startsWith("!.")) {
									modificationTarget.classList.remove(token.substring(2));
								} else if (token.startsWith("#")) {
									modificationTarget.id = token.substring(1);
								} else if (token.startsWith("[")) {
									const content = token.substring(1, token.length - 1);
									const eqIndex = content.indexOf("=");

									if (eqIndex > -1) {
										const key = content.substring(0, eqIndex).trim();
										let val = content.substring(eqIndex + 1).trim();

										if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
											val = val.substring(1, val.length - 1);
										}

										modificationTarget.setAttribute(key, val);
									} else {
										modificationTarget.setAttribute(content, "");
									}
								}
							});
						});
					} catch (e) {
						console.warn(`Mermaid Plugin: Failed to apply selector "${selector}".`, e);
					}
				});
			}

			// Infer edge fragidxs from endpoints (backwards-compatible — only
			// touches edges that don't already carry a fragidx class from an
			// explicit %%% rule or inline :::fragidx-N on the edge).
			//
			// Reads endpoint fragidxs from the corresponding g.node classes,
			// parsed from the per-diagram-type SVG id scheme:
			//   flowchart  g.node#flowchart-<srcId>-<seq>    path.flowchart-link#L_<src>_<tgt>_<n>
			//   class      g.node#classId-<srcId>-<seq>      path.relation#id_<src>_<tgt>_<n>
			//   ER         g.node#entity-<srcId>-<seq>       path.relationshipLine#id_entity-<src>-<seq>_entity-<tgt>-<seq>_<n>
			//   mindmap    g.node#node_<n>                    path.edge#edge_<srcN>_<tgtN>
			// Edges whose endpoints can't be extracted (e.g. sequence, state)
			// are left untouched — authors still use %%% for those.
			// SVG resolver setup — shared by the autoEdgeFragidx propagation,
			// the `fragment` directive application, and the fx directive
			// resolution pass that follows.
			// At runtime mermaid prefixes every element's id with the container's
			// id (e.g. "mermaid-298348-flowchart-Models-0"). mmdc-compiled SVGs
			// don't carry this prefix, which is why bare `^flowchart-...$` patterns
			// worked in the verifier but failed silently in the browser. Strip
			// the prefix here.
			const prefix = options.css.indexClassPrefix;
			const fiRegex = new RegExp(`\\b${prefix}(\\d+)\\b`);
			const idPrefix = svgElement.id ? svgElement.id + "-" : "";
			const stripPrefix = (id) => (idPrefix && id && id.startsWith(idPrefix) ? id.slice(idPrefix.length) : id || "");

			// Endpoint catalog (independent of fragidx class state) — used by
			// resolveEndpoints. Includes both nodes (g.node) and subgraph
			// clusters (g.cluster), since edges can connect to either.
			const nodePatterns = [/^flowchart-(.+)-\d+$/, /^classId-(.+)-\d+$/, /^entity-(.+)-\d+$/, /^(node_\d+)$/];
			const endpointKeysAll = new Set();
			svgElement.querySelectorAll("g.node").forEach((el) => {
				const rawId = stripPrefix(el.getAttribute("id"));
				for (const p of nodePatterns) {
					const im = rawId.match(p);
					if (im) {
						endpointKeysAll.add(im[1]);
						break;
					}
				}
			});
			svgElement.querySelectorAll("g.cluster").forEach((el) => {
				const id = stripPrefix(el.getAttribute("id"));
				if (id) endpointKeysAll.add(id);
			});

			// Resolve an edge's (src, tgt) keys against the set of real nodes.
			// The canonical regex split is non-greedy (e.g. /^L_(.+?)_(.+?)_\d+$/),
			// which mis-splits when node IDs contain underscores. Three failure
			// modes are handled here:
			//   (a) mermaid built-in IDs like __start__ produce L___start___A_0
			//   (b) user node IDs containing _ (research_sub) produce ambiguous splits
			//   (c) self-loops produce <node>-cyclic-special-<n> which the canonical
			//       regex doesn't match at all
			// All three would otherwise leave the edge without a fragidx class,
			// causing the edge to be visible at slide load while endpoints wait —
			// a "dangling arc" defect.
			const edgeTypes = [
				{
					sel: "path.flowchart-link",
					re: /^L_(.+?)_(.+?)_\d+$/,
					splitRe: /^L_(.+)_\d+$/,
					selfLoopRe: /^(.+)-cyclic-special-/,
				},
				{
					sel: "path.relation",
					re: /^id_(.+?)_(.+?)_\d+$/,
					splitRe: /^id_(.+)_\d+$/,
				},
				{ sel: "path.relationshipLine", re: /^id_entity-(.+?)-\d+_entity-(.+?)-\d+_\d+$/ },
				{ sel: "path.edge", re: /^edge_(\d+)_(\d+)$/, prefix: "node_" },
			];
			const hasFragidxClass = (el) => fiRegex.test(el.getAttribute("class") || "");
			const sortedEndpointKeys = [...endpointKeysAll].sort((a, b) => b.length - a.length);
			const resolveEndpoints = (rawId, et) => {
				// Try the canonical regex first.
				const m = rawId.match(et.re);
				if (m) {
					const s = et.prefix ? et.prefix + m[1] : m[1];
					const t = et.prefix ? et.prefix + m[2] : m[2];
					if (endpointKeysAll.has(s) && endpointKeysAll.has(t)) return [s, t];
				}
				// Self-loop pattern (flowcharts only, in current mermaid).
				if (et.selfLoopRe) {
					const sl = rawId.match(et.selfLoopRe);
					if (sl && endpointKeysAll.has(sl[1])) return [sl[1], sl[1]];
				}
				// Longest-prefix split: walk known endpoint keys (longest first)
				// and pick the first split where both halves are real endpoints.
				if (et.splitRe) {
					const sp = rawId.match(et.splitRe);
					if (sp) {
						const middle = sp[1];
						for (const k of sortedEndpointKeys) {
							if (middle.startsWith(k + "_")) {
								const rest = middle.slice(k.length + 1);
								if (endpointKeysAll.has(rest)) return [k, rest];
							}
						}
					}
				}
				return [null, null];
			};

			// Atom-to-element resolver — used by both `fragment` and the
			// runtime fx verbs (highlight/dim/accent). They share the same
			// target grammar, so build elById and edgeIndex once.
			const elById = new Map();
			svgElement.querySelectorAll("g.node").forEach((el) => {
				const rawId = stripPrefix(el.getAttribute("id"));
				for (const p of nodePatterns) {
					const im = rawId.match(p);
					if (im) {
						elById.set(im[1], el);
						break;
					}
				}
			});
			svgElement.querySelectorAll("g.cluster").forEach((el) => {
				const id = stripPrefix(el.getAttribute("id"));
				if (id) elById.set(id, el);
			});

			const edgeIndex = [];
			for (const et of edgeTypes) {
				const edges = svgElement.querySelectorAll(et.sel);
				const labels = et.sel === "path.edge" ? null : svgElement.querySelectorAll("g.edgeLabel");
				edges.forEach((edgeEl, i) => {
					const rawId = stripPrefix(edgeEl.getAttribute("id"));
					const [src, tgt] = resolveEndpoints(rawId, et);
					if (!src || !tgt) return;
					const cls = edgeEl.getAttribute("class") || "";
					let arrowStyle = "-->";
					if (cls.includes("edge-pattern-dashed") || cls.includes("edge-pattern-dotted")) arrowStyle = "-.->";
					else if (cls.includes("edge-thickness-thick")) arrowStyle = "==>";
					const labelEl = labels ? labels[i] : null;
					const labelText = labelEl ? (labelEl.textContent || "").trim() : "";
					edgeIndex.push({ src, tgt, pathEl: edgeEl, labelEl, arrowStyle, labelText });
				});
			}

			// Per-diagram-type alias and structural-target augmentation.
			//
			// Some mermaid diagrams don't expose source-level identifiers in
			// their SVG output, which makes the canonical resolveTarget unable
			// to address user-meaningful elements:
			//
			//   mindmap  — node SVG ids are sequential (`node_0`, `node_1`, ...)
			//              regardless of source label. Without help, a directive
			//              `highlight Frontend at 3` resolves to nothing. Fix:
			//              parse the source, walk the indentation tree to recover
			//              the order in which mermaid assigns ids, register each
			//              source token + slugified label as an alias for the
			//              corresponding `node_N`. Edges between named nodes
			//              already exist as `edge_<srcN>_<tgtN>` in edgeIndex —
			//              they become reachable once the alias is in place.
			//
			//   timeline — there are *no* source-level identifiers at all. Items
			//              are just positioned <g> elements (taskWrapper for
			//              periods, eventWrapper for events, anonymous group for
			//              section header). Fix: walk the SVG in DOM order,
			//              register synthetic structural targets `section:N`,
			//              `period:N`, `event:N` (1-based, with `s:`/`p:`/`e:`
			//              short forms), plus parallel slug-form aliases derived
			//              from source labels. For `show`/`fragment` on a section
			//              or period target, the applier also tags descendants
			//              (period taskWrappers + their lineWrappers + events),
			//              so the natural narrative "show this section" reveals
			//              the entire column at once. The fx verbs
			//              (highlight/dim/accent) keep targeting only the named
			//              element — decoration is intentionally narrow.
			// CamelCase slugify: each word's first letter goes uppercase before
			// concatenation. Picks the form a user is most likely to write —
			// "Vacuum tubes" → "VacuumTubes", "Mainframe Era" → "MainframeEra",
			// "1950" → "1950". Single bare words stay verbatim.
			const slugify = (s) => {
				if (!s) return "";
				const words = s
					.trim()
					.split(/[^A-Za-z0-9]+/)
					.filter(Boolean);
				if (words.length === 0) return "";
				return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
			};
			const nameAlias = new Map();
			// Targets whose `show`/`fragment` semantics include descendants.
			// Keys are post-alias element keys (`_tl:section:N`, `_tl:period:N`).
			// Used by timeline section/period: "show this section" cascades to
			// the section's periods, lineWrappers, and events. Fires only for
			// `show`/`fragment` (the wide-fragment verbs). The fx verbs
			// (highlight/dim/accent) intentionally stay narrow and ignore this.
			const structuralDescendants = new Map();
			// Co-elements: post-alias key → list of SVG elements that should
			// always be tagged together with the primary element returned by
			// `elById.get(key)`. Differs from `structuralDescendants` in that
			// co-elements fire for *every* verb — they're conceptually part of
			// the same target, not nested children that only the wide-fragment
			// verbs should reach. Used by sequence diagrams where a "message"
			// is the line + its label text in DOM, an "actor" is the lifeline
			// + the top/bottom rects + the top/bottom text labels, and a
			// "note" is the wrapping g + its rect + its text.
			const coElements = new Map();

			const parseMindmapNode = (text) => {
				const t = text.trim();
				const shapes = [
					/^(\w+)\[([^\]]+)\]$/,
					/^(\w+)\(\(([^)]+)\)\)$/,
					/^(\w+)\(([^)]+)\)$/,
					/^(\w+)\)\)([^(]+)\(\($/,
					/^(\w+)\)([^(]+)\($/,
					/^(\w+)\{\{([^}]+)\}\}$/,
					/^(\w+)\{([^}]+)\}$/,
				];
				for (const re of shapes) {
					const m = t.match(re);
					if (m) return { id: m[1], label: m[2].trim() };
				}
				if (/^\w+$/.test(t)) return { id: t, label: t };
				return { id: null, label: t };
			};

			if (diagramType === "mindmap") {
				// Walk source lines, assigning sequential node_N in tree order.
				// Mermaid's own node-id assignment follows the same order
				// (verified by rendering test fixtures), so we stay in sync
				// with the compiled SVG without needing to re-parse it.
				const rawLines = graphDefinition.split(/\r?\n/);
				let inDiagram = false;
				let nodeIdx = -1;
				for (const line of rawLines) {
					const stripped = line.replace(/%%.*$/, "");
					if (!stripped.trim()) continue;
					if (!inDiagram) {
						if (/^\s*mindmap\b/.test(stripped)) inDiagram = true;
						continue;
					}
					const content = stripped.trim();
					if (!content) continue;
					const { id, label } = parseMindmapNode(content);
					nodeIdx++;
					const nodeId = `node_${nodeIdx}`;
					if (id) nameAlias.set(id, nodeId);
					if (label) {
						const labelSlug = slugify(label);
						if (labelSlug && labelSlug !== id) nameAlias.set(labelSlug, nodeId);
					}
				}
			} else if (diagramType === "timeline") {
				// Walk top-level <g> children of the SVG to identify section
				// headers, periods, and events. Section headers are anonymous
				// <g> wrappers (no class) whose first child is a
				// `<g class="timeline-node section-...">`. Periods and events
				// have explicit `taskWrapper` / `eventWrapper` classes.
				const sections = [];
				let curSec = null;
				let curPer = null;
				const topChildren = Array.from(svgElement.querySelectorAll(":scope > g"));
				for (const el of topChildren) {
					const cls = el.getAttribute("class") || "";
					if (cls.includes("taskWrapper")) {
						if (!curSec) {
							curSec = { headerEl: null, periods: [] };
							sections.push(curSec);
						}
						// `lineEls` is an array (not a single element): mermaid
						// occasionally emits multiple `<g class="lineWrapper">`
						// siblings between the period's taskWrapper and the
						// next boundary (observed e.g. on the last period of a
						// section — two lineWrappers, one before and one after
						// the trailing event). All of them belong to this
						// period and must be tagged together; using a single
						// slot orphans whichever lineWrapper isn't last in DOM
						// order, leaving it visible at slide load.
						curPer = { taskEl: el, lineEls: [], eventEls: [] };
						curSec.periods.push(curPer);
					} else if (cls.includes("lineWrapper")) {
						// Mermaid emits two kinds of `<g class="lineWrapper">`:
						// per-period **vertical** dashed connectors (x1==x2)
						// that genuinely belong to one period, and a single
						// final **horizontal** axis arrow (y1==y2) that spans
						// the entire chart and represents the timeline's spine.
						// The axis is structural framing — like an X-axis on a
						// plot — so it should be visible from slide load
						// regardless of any `show section/period` directives.
						// Detect horizontal orientation on the inner <line> and
						// skip period attachment so it remains untagged.
						const innerLine = el.querySelector(":scope > line");
						if (innerLine) {
							const dx = Math.abs(
								parseFloat(innerLine.getAttribute("x2") || "0") - parseFloat(innerLine.getAttribute("x1") || "0"),
							);
							const dy = Math.abs(
								parseFloat(innerLine.getAttribute("y2") || "0") - parseFloat(innerLine.getAttribute("y1") || "0"),
							);
							if (dx > dy) continue;
						}
						if (curPer) curPer.lineEls.push(el);
					} else if (cls.includes("eventWrapper")) {
						if (curPer) curPer.eventEls.push(el);
					} else if (!cls && el.querySelector(":scope > g.timeline-node")) {
						curSec = { headerEl: el, periods: [] };
						sections.push(curSec);
						curPer = null;
					}
				}

				// Parse the source so slug aliases line up with DOM order.
				const srcSections = [];
				let pSec = null;
				let pPer = null;
				let inDiag = false;
				for (const raw of graphDefinition.split(/\r?\n/)) {
					const stripped = raw.replace(/%%.*$/, "");
					const t = stripped.trim();
					if (!t) continue;
					if (!inDiag) {
						if (/^timeline\b/.test(t)) inDiag = true;
						continue;
					}
					if (/^title\s/i.test(t)) continue;
					const sm = t.match(/^section\s+(.+)$/i);
					if (sm) {
						pSec = { name: sm[1].trim(), periods: [] };
						srcSections.push(pSec);
						pPer = null;
						continue;
					}
					if (!pSec) {
						pSec = { name: "", periods: [] };
						srcSections.push(pSec);
					}
					if (/^:/.test(t)) {
						if (pPer) pPer.events.push(t.replace(/^:\s*/, "").trim());
						continue;
					}
					const colonIdx = t.indexOf(":");
					if (colonIdx !== -1) {
						pPer = { label: t.slice(0, colonIdx).trim(), events: [] };
						pSec.periods.push(pPer);
						const ev = t.slice(colonIdx + 1).trim();
						if (ev) pPer.events.push(ev);
					} else {
						pPer = { label: t, events: [] };
						pSec.periods.push(pPer);
					}
				}

				let periodCounter = 0;
				let eventCounter = 0;
				sections.forEach((sec, sIdx) => {
					const sN = sIdx + 1;
					const srcSec = srcSections[sIdx] || { name: "", periods: [] };
					if (sec.headerEl) {
						const key = `_tl:section:${sN}`;
						elById.set(key, sec.headerEl);
						nameAlias.set(`section:${sN}`, key);
						nameAlias.set(`s:${sN}`, key);
						const slugName = slugify(srcSec.name);
						if (slugName) {
							nameAlias.set(`section:${slugName}`, key);
							nameAlias.set(`s:${slugName}`, key);
						}
						const desc = [];
						for (const p of sec.periods) {
							desc.push(p.taskEl);
							for (const l of p.lineEls) desc.push(l);
							for (const e of p.eventEls) desc.push(e);
						}
						structuralDescendants.set(key, desc);
					}
					sec.periods.forEach((per, pIdx) => {
						periodCounter++;
						const srcPer = srcSec.periods[pIdx] || { label: "", events: [] };
						const periodKey = `_tl:period:${periodCounter}`;
						elById.set(periodKey, per.taskEl);
						nameAlias.set(`period:${periodCounter}`, periodKey);
						nameAlias.set(`p:${periodCounter}`, periodKey);
						const periodSlug = slugify(srcPer.label);
						if (periodSlug) {
							nameAlias.set(`period:${periodSlug}`, periodKey);
							nameAlias.set(`p:${periodSlug}`, periodKey);
						}
						const periodDesc = [];
						for (const l of per.lineEls) periodDesc.push(l);
						for (const e of per.eventEls) periodDesc.push(e);
						structuralDescendants.set(periodKey, periodDesc);

						per.eventEls.forEach((evEl, eIdx) => {
							eventCounter++;
							const evKey = `_tl:event:${eventCounter}`;
							elById.set(evKey, evEl);
							nameAlias.set(`event:${eventCounter}`, evKey);
							nameAlias.set(`e:${eventCounter}`, evKey);
							const evText = srcPer.events[eIdx] || "";
							const evSlug = slugify(evText);
							if (evSlug) {
								nameAlias.set(`event:${evSlug}`, evKey);
								nameAlias.set(`e:${evSlug}`, evKey);
							}
						});
					});
				});
			} else if (diagramType === "sequenceDiagram") {
				// Sequence diagrams have two "what is in the SVG" gaps that
				// the directive resolver needs to bridge:
				//
				//   1. Mermaid's source uses participant ids (`App`, `API`)
				//      and message arrows (`A->>B: text`). The compiled SVG
				//      uses class-only elements: `text.messageText` /
				//      `line.messageLine0` (solid arrow) / `line.messageLine1`
				//      (dashed arrow) / `path.messageLine0`-`1` (self-message
				//      curves) / `rect.actor.actor-top` and `actor-bottom`
				//      (drawn at top AND bottom of each lifeline) /
				//      `text.actor.actor-box` (matching labels) / `.actor-line`
				//      (vertical lifeline; ids are stable: `actor0`..`actorN-1`
				//      in source order). None of those carry the source-level
				//      participant id, so a directive `show App at 1` cannot
				//      target anything without a built alias map.
				//
				//   2. A "message" is two DOM siblings — the arrow line and
				//      the label text — emitted in DOM order as
				//      (text, line) pairs in source order. The label must
				//      animate together with its arrow, otherwise the label
				//      strands at slide load. Same shape for actors (top
				//      rect+text + bottom rect+text + lifeline) and notes
				//      (wrapping g + rect.note + text.noteText).
				//
				// Solution: parse the source for participants/messages/notes
				// in source order; walk the SVG to find the matching DOM
				// elements; register the primary element under a synthetic
				// `_seq:*` key in elById; register the rest as co-elements so
				// the resolver returns them all together for every verb.
				const srcParticipants = []; // {id, alias} per participant in source order
				const srcMessages = []; // {srcId, tgtId, arrow, text} per message in source order
				const srcNotes = []; // {actors, text} per note in source order
				// Block-aware bookkeeping. Each block records which messages /
				// notes / activations live inside it (transitively, so a
				// message in `alt > rect` is in both blocks). The aliases
				// `loop:N`, `alt:N`, `opt:N`, `par:N`, `critical:N`,
				// `break:N`, `rect:N` (1-based by source order per type) and
				// the type-agnostic `block:N` are registered against
				// synthetic keys in coElements so resolving any of them
				// returns the whole block region (label + branch captions +
				// inner messages + inner notes).
				const srcBlocks = [];
				const srcActivations = []; // {actorId} per `activate A` line, source order
				const blockStack = [];
				// Block types that produce a polygon.labelBox + text.labelText
				// pair in the SVG. `rect rgb(...)` does not.
				const labeledBlockTypes = new Set(["loop", "alt", "opt", "par", "critical", "break"]);

				let inDiagSeq = false;
				for (const raw of graphDefinition.split(/\r?\n/)) {
					const line = raw.replace(/%%.*$/, "").trim();
					if (!line) continue;
					if (!inDiagSeq) {
						if (/^sequenceDiagram\b/.test(line)) inDiagSeq = true;
						continue;
					}
					// `participant <id>` or `participant <id> as <label>`;
					// `actor` is mermaid's stick-figure variant — same syntax.
					let m = line.match(/^(?:participant|actor)\s+([A-Za-z0-9_]+)(?:\s+as\s+(.+?))?\s*$/);
					if (m) {
						srcParticipants.push({ id: m[1], alias: (m[2] || m[1]).trim() });
						continue;
					}
					// Note over A[, B]: text  /  Note left of A: text  /  Note right of A: text
					m = line.match(/^Note\s+(?:over\s+([A-Za-z0-9_,\s]+?)|(?:left|right)\s+of\s+([A-Za-z0-9_]+))\s*:\s*(.+)$/i);
					if (m) {
						const actors = m[1] ? m[1].split(/\s*,\s*/).filter(Boolean) : m[2] ? [m[2]] : [];
						const noteIdx = srcNotes.length;
						srcNotes.push({ actors, text: m[3] });
						for (const bIdx of blockStack) srcBlocks[bIdx].notes.push(noteIdx);
						continue;
					}
					// `activate A` records an activation rect on actor A's
					// lifeline. `deactivate A` doesn't produce a separate SVG
					// element — it just closes the existing activation —
					// so we ignore it here.
					m = line.match(/^activate\s+([A-Za-z0-9_]+)\s*$/);
					if (m) {
						const actIdx = srcActivations.length;
						srcActivations.push({ actorId: m[1] });
						for (const bIdx of blockStack) srcBlocks[bIdx].activations.push(actIdx);
						continue;
					}
					if (/^(deactivate|autonumber|title)\b/.test(line)) continue;
					// Block open: loop / alt / opt / par / critical / break / rect.
					m = line.match(/^(loop|alt|opt|par|critical|break|rect)\b\s*(.*)$/);
					if (m) {
						const type = m[1];
						const captionMain = m[2].trim();
						const idxByType = srcBlocks.filter((b) => b.type === type).length + 1;
						const block = {
							type,
							idxByType,
							captionMain, // first branch caption (may be empty)
							branchCaptions: [], // per-branch captions in source order (may include empty strings; only non-empty produce loopText elements)
							messages: [],
							notes: [],
							activations: [],
							childBlocks: [],
							parent: blockStack.length > 0 ? blockStack[blockStack.length - 1] : null,
						};
						const blockIdx = srcBlocks.length;
						srcBlocks.push(block);
						if (block.parent !== null) srcBlocks[block.parent].childBlocks.push(blockIdx);
						blockStack.push(blockIdx);
						continue;
					}
					// Branch within an open block: else (alt) / and (par) / option (critical).
					m = line.match(/^(else|and|option)\b\s*(.*)$/);
					if (m && blockStack.length > 0) {
						srcBlocks[blockStack[blockStack.length - 1]].branchCaptions.push(m[2].trim());
						continue;
					}
					if (/^end\b/.test(line)) {
						if (blockStack.length > 0) blockStack.pop();
						continue;
					}
					// Message: A<arrow>B: text. Sequence-style arrow set.
					// Order matters in alternation: longest forms first so
					// `-->>` matches before `-->`, etc.
					m = line.match(
						/^([A-Za-z0-9_]+)\s*(-->>|->>|-->|->|-\.->|--x|-x|--\)|-\)|==>)\s*([A-Za-z0-9_]+)\s*:\s*(.+)$/,
					);
					if (m) {
						const msgIdx = srcMessages.length;
						srcMessages.push({ srcId: m[1], tgtId: m[3], arrow: m[2], text: m[4].trim() });
						for (const bIdx of blockStack) srcBlocks[bIdx].messages.push(msgIdx);
					}
				}

				// Slug aliases for participants — `actor:Slug` and bare-name
				// resolution for A->B atoms, where A may be the participant
				// id ("App") or the slugified `as` label ("YourApplication").
				for (const p of srcParticipants) {
					const slug = slugify(p.alias);
					if (slug && slug !== p.id) {
						nameAlias.set(slug, p.id);
					}
				}

				// Walk the SVG. Messages live as (text, line|path) pairs in
				// DOM order, source order. Self-messages use `path.messageLine*`
				// instead of `line.*` (curved arc). The combined selector
				// captures both, ordered by document order — pair index 2i is
				// the text, 2i+1 is the line/path.
				const msgRelEls = svgElement.querySelectorAll(
					"text.messageText, line.messageLine0, line.messageLine1, path.messageLine0, path.messageLine1",
				);
				const msgPairs = []; // {textEl, lineEl, idx}
				for (let i = 0; i + 1 < msgRelEls.length; i += 2) {
					const a = msgRelEls[i];
					const b = msgRelEls[i + 1];
					// Defensive: only treat as a pair if it's text-then-line/path.
					if (a.tagName.toLowerCase() === "text" && b.tagName.toLowerCase() !== "text") {
						msgPairs.push({ textEl: a, lineEl: b, idx: msgPairs.length + 1 });
					}
				}
				msgPairs.forEach((p) => {
					const key = `_seq:msg:${p.idx}`;
					elById.set(key, p.lineEl);
					coElements.set(key, [p.textEl]);
					nameAlias.set(`msg:${p.idx}`, key);
					nameAlias.set(`m:${p.idx}`, key);
					const srcMsg = srcMessages[p.idx - 1];
					if (srcMsg) {
						const slug = slugify(srcMsg.text);
						if (slug) {
							nameAlias.set(`msg:${slug}`, key);
							nameAlias.set(`m:${slug}`, key);
						}
						// Also expose the message as an edge in edgeIndex so
						// `App->API` style atoms resolve through the existing
						// edge-resolution path. The atomRegex already accepts
						// the sequence arrow set; arrowStyle is recorded as
						// the source-form so explicit arrows like `App-->>API`
						// can filter on style. Plain `->` stays the wildcard.
						edgeIndex.push({
							src: srcMsg.srcId,
							tgt: srcMsg.tgtId,
							pathEl: p.lineEl,
							labelEl: p.textEl,
							arrowStyle: srcMsg.arrow,
							labelText: srcMsg.text,
						});
					}
				});

				// Notes: each is a top-level `g` wrapping `rect.note` +
				// `text.noteText`. Walk by `rect.note` and step up to its
				// parent g, which is the cohesive unit to fragment.
				const noteRects = svgElement.querySelectorAll("rect.note");
				noteRects.forEach((rectEl, i) => {
					const wrapG = rectEl.parentNode;
					const idx = i + 1;
					const key = `_seq:note:${idx}`;
					// Tag the wrapper plus the inner rect+text so reveal's
					// `.fragment:not(.visible)` styling reaches every part of
					// the note even if the wrapper itself wouldn't fade.
					elById.set(key, wrapG);
					const textEl = wrapG.querySelector("text.noteText");
					coElements.set(key, [rectEl, textEl].filter(Boolean));
					nameAlias.set(`note:${idx}`, key);
					nameAlias.set(`n:${idx}`, key);
					const srcNote = srcNotes[i];
					if (srcNote) {
						const slug = slugify(srcNote.text);
						if (slug) {
							nameAlias.set(`note:${slug}`, key);
							nameAlias.set(`n:${slug}`, key);
						}
					}
				});

				// Actors: lifelines have stable ids `actor0`..`actorN-1` in
				// source order. Each actor also has top + bottom rects
				// (`rect.actor.actor-top` / `rect.actor.actor-bottom`) and
				// matching `text.actor.actor-box` labels at top + bottom.
				// Group rects/texts to lifelines by horizontal position
				// (rect center x ≈ lifeline x; text x is anchored at center).
				const lifelineByIdx = new Map(); // 0-based actor idx → {el, x}
				svgElement.querySelectorAll(".actor-line").forEach((ll) => {
					const id = ll.getAttribute("id") || "";
					const lm = id.match(/^actor(\d+)$/);
					if (!lm) return;
					const idx = parseInt(lm[1], 10);
					const x = parseFloat(ll.getAttribute("x1") || ll.getAttribute("x") || "0");
					lifelineByIdx.set(idx, { el: ll, x });
				});
				const actorElsByIdx = new Map();
				for (const idx of lifelineByIdx.keys()) actorElsByIdx.set(idx, []);
				const nearestLifelineIdx = (cx) => {
					let bestIdx = -1;
					let bestDist = Infinity;
					for (const [idx, info] of lifelineByIdx) {
						const d = Math.abs(cx - info.x);
						if (d < bestDist) {
							bestDist = d;
							bestIdx = idx;
						}
					}
					return bestDist < 200 ? bestIdx : -1;
				};
				svgElement.querySelectorAll("rect.actor").forEach((rectEl) => {
					const x = parseFloat(rectEl.getAttribute("x") || "0");
					const w = parseFloat(rectEl.getAttribute("width") || "0");
					const idx = nearestLifelineIdx(x + w / 2);
					if (idx !== -1) actorElsByIdx.get(idx).push(rectEl);
				});
				svgElement.querySelectorAll("text.actor").forEach((textEl) => {
					const x = parseFloat(textEl.getAttribute("x") || "0");
					const idx = nearestLifelineIdx(x);
					if (idx !== -1) actorElsByIdx.get(idx).push(textEl);
				});
				for (const [idx, info] of lifelineByIdx) {
					const sN = idx + 1;
					const key = `_seq:actor:${sN}`;
					elById.set(key, info.el);
					coElements.set(key, actorElsByIdx.get(idx) || []);
					nameAlias.set(`actor:${sN}`, key);
					nameAlias.set(`a:${sN}`, key);
					const srcP = srcParticipants[idx];
					if (srcP) {
						nameAlias.set(`actor:${srcP.id}`, key);
						nameAlias.set(`a:${srcP.id}`, key);
						const slug = slugify(srcP.alias);
						if (slug && slug !== srcP.id) {
							nameAlias.set(`actor:${slug}`, key);
							nameAlias.set(`a:${slug}`, key);
						}
					}
				}

				// Blocks (loop / alt / opt / par / critical / break / rect)
				// and activations. SVG layout for blocks:
				//   • polygon.labelBox + text.labelText — one pair per
				//     LABELED block in source order (rect blocks have no
				//     labelBox).
				//   • text.loopText — one per *non-empty* branch caption
				//     across all blocks in source order (main caption +
				//     branch headers like `else …`, `and …`, `option …`).
				//     Branches with no caption (e.g. bare `and` in a `par`)
				//     do not produce a loopText.
				//   • line.loopLine — frame borders (decorative; left
				//     always-visible so the block region is anchored
				//     visually before its contents reveal).
				// SVG layout for activations: rect.activation0 (and .1) —
				// one per `activate A` line, in source order.
				const labelBoxes = svgElement.querySelectorAll("polygon.labelBox");
				const labelTexts = svgElement.querySelectorAll("text.labelText");
				const loopTexts = svgElement.querySelectorAll("text.loopText");
				const activationRects = svgElement.querySelectorAll(
					"rect.activation0, rect.activation1, rect[class*='activation']",
				);
				let labelCursor = 0;
				let captionCursor = 0;
				const allBlockKey = (n) => `_seq:block:${n}`;
				srcBlocks.forEach((block, bIdx) => {
					const blockN = bIdx + 1;
					const groupEls = [];
					if (labeledBlockTypes.has(block.type)) {
						if (labelCursor < labelBoxes.length) groupEls.push(labelBoxes[labelCursor]);
						if (labelCursor < labelTexts.length) groupEls.push(labelTexts[labelCursor]);
						labelCursor++;
					}
					// Main caption (only if non-empty produces a loopText).
					if (block.captionMain && captionCursor < loopTexts.length) {
						groupEls.push(loopTexts[captionCursor]);
						captionCursor++;
					}
					// Branch captions (only non-empty produce loopText elements).
					for (const c of block.branchCaptions) {
						if (c && captionCursor < loopTexts.length) {
							groupEls.push(loopTexts[captionCursor]);
							captionCursor++;
						}
					}
					// Inner messages: pull line+text via the msg:N
					// registrations we already made above. Look up the
					// primary element and any co-elements so the whole
					// message animates with the block.
					for (const mIdx of block.messages) {
						const msgKey = `_seq:msg:${mIdx + 1}`;
						const primary = elById.get(msgKey);
						if (primary) groupEls.push(primary);
						for (const co of coElements.get(msgKey) || []) groupEls.push(co);
					}
					// Inner notes: same pattern.
					for (const nIdx of block.notes) {
						const noteKey = `_seq:note:${nIdx + 1}`;
						const primary = elById.get(noteKey);
						if (primary) groupEls.push(primary);
						for (const co of coElements.get(noteKey) || []) groupEls.push(co);
					}
					// Inner activations: one rect per activate.
					for (const aIdx of block.activations) {
						if (aIdx < activationRects.length) groupEls.push(activationRects[aIdx]);
					}

					// Register this block under both type-specific
					// (`loop:N`, `alt:N`, …) and type-agnostic (`block:N`)
					// keys. The first SVG element acts as the elById primary
					// (semantically arbitrary for blocks — what matters is
					// that all groupEls fragment together via coElements).
					if (groupEls.length > 0) {
						const key = `_seq:block:${blockN}`;
						elById.set(key, groupEls[0]);
						coElements.set(key, groupEls.slice(1));
						nameAlias.set(`block:${blockN}`, key);
						nameAlias.set(`b:${blockN}`, key);
						nameAlias.set(`${block.type}:${block.idxByType}`, key);
					}
				});

				// Activation rectangles individually addressable via
				// `activation:N` / `act:N`. Useful when you want the
				// activation rectangle to appear with a specific message
				// rather than with its enclosing block.
				activationRects.forEach((el, i) => {
					const idx = i + 1;
					const key = `_seq:activation:${idx}`;
					elById.set(key, el);
					nameAlias.set(`activation:${idx}`, key);
					nameAlias.set(`act:${idx}`, key);
				});
			} else if (diagramType === "gantt") {
				// Gantt: tasks already carry source-level ids on the rect
				// (`<rect id="a1" class="task task0"/>`); their labels live in
				// `<text id="<id>-text">`. Section index is encoded in the
				// class as `taskN` / `sectionTitleN` / `section sectionN`,
				// matching source order (0-based). Milestones are tasks whose
				// class list also contains `milestone`.
				//
				// Source parsing: build srcSections so we can register slug
				// aliases for section names and task labels. The structural
				// matching (which task belongs to which section, etc.) is done
				// directly from the SVG class number, not from the source —
				// SVG is the source of truth for what mermaid actually drew.
				const srcSections = []; // [{name, tasks: [{label, id}]}]
				let curSec = null;
				let inDiagG = false;
				const GANTT_DIRECTIVES =
					/^(?:title|dateFormat|axisFormat|tickInterval|excludes?|todayMarker|inclusiveEndDates|topAxis|displayMode|weekday|click)\b/i;
				const STATUS_TOKENS = new Set(["active", "done", "crit", "milestone"]);
				for (const raw of graphDefinition.split(/\r?\n/)) {
					const line = raw.replace(/%%.*$/, "").trim();
					if (!line) continue;
					if (!inDiagG) {
						if (/^gantt\b/.test(line)) inDiagG = true;
						continue;
					}
					if (GANTT_DIRECTIVES.test(line)) continue;
					const sm = line.match(/^section\s+(.+)$/i);
					if (sm) {
						curSec = { name: sm[1].trim(), tasks: [] };
						srcSections.push(curSec);
						continue;
					}
					// Task line: `Label : segments,...`. The id (when explicit)
					// is the first segment that is a bare \w+ identifier and
					// not a status token / `after X` / a date or duration.
					const tm = line.match(/^(.+?)\s*:\s*(.+)$/);
					if (!tm) continue;
					const label = tm[1].trim();
					const segments = tm[2].split(/\s*,\s*/);
					let id = null;
					for (const seg of segments) {
						const s = seg.trim();
						if (!s) continue;
						if (STATUS_TOKENS.has(s.toLowerCase())) continue;
						if (/^after\s+/i.test(s)) continue;
						if (/^until\s+/i.test(s)) continue;
						if (/^\d/.test(s)) continue;
						if (/^\w+$/.test(s)) {
							id = s;
							break;
						}
					}
					if (!curSec) {
						curSec = { name: "", tasks: [] };
						srcSections.push(curSec);
					}
					curSec.tasks.push({ label, id });
				}

				// Walk SVG tasks in DOM order. Each rect.task is one task,
				// regardless of milestone status (milestone is a sub-class).
				// At runtime mermaid prefixes element ids with the container's
				// id (e.g. `mermaid-488680-a1` for source id `a1`); strip it
				// so user-written `a1` resolves. The matching label `<text>`
				// uses the prefixed id verbatim — query with the full id.
				const taskRects = svgElement.querySelectorAll("rect.task");
				let milestoneCounter = 0;
				const taskKeysByRect = new Map();
				taskRects.forEach((rectEl, i) => {
					const taskN = i + 1;
					const fullId = rectEl.getAttribute("id") || "";
					const sourceId = stripPrefix(fullId);
					const cls = rectEl.getAttribute("class") || "";
					const labelEl = fullId ? svgElement.querySelector(`text[id="${fullId}-text"]`) : null;
					const key = `_gantt:task:${taskN}`;
					elById.set(key, rectEl);
					coElements.set(key, labelEl ? [labelEl] : []);
					nameAlias.set(`task:${taskN}`, key);
					nameAlias.set(`t:${taskN}`, key);
					if (sourceId) nameAlias.set(sourceId, key);
					if (cls.includes("milestone")) {
						milestoneCounter++;
						nameAlias.set(`milestone:${milestoneCounter}`, key);
						nameAlias.set(`m:${milestoneCounter}`, key);
					}
					taskKeysByRect.set(rectEl, key);
				});

				// Sections: text.sectionTitle in source order. Section bars
				// `rect.section.sectionN` and tasks `rect.task.taskN` are
				// matched by the class index (0-based) which mermaid assigns
				// in source order.
				const sectionTitles = svgElement.querySelectorAll("text.sectionTitle");
				sectionTitles.forEach((titleEl, sIdx) => {
					const sN = sIdx + 1;
					const key = `_gantt:section:${sN}`;
					elById.set(key, titleEl);
					nameAlias.set(`section:${sN}`, key);
					nameAlias.set(`s:${sN}`, key);
					const desc = [];
					svgElement.querySelectorAll(`rect.section.section${sIdx}`).forEach((el) => desc.push(el));
					const sectionTasks = svgElement.querySelectorAll(`rect.task.task${sIdx}`);
					sectionTasks.forEach((rectEl) => {
						desc.push(rectEl);
						const tFullId = rectEl.getAttribute("id") || "";
						if (tFullId) {
							const lbl = svgElement.querySelector(`text[id="${tFullId}-text"]`);
							if (lbl) desc.push(lbl);
						}
					});
					structuralDescendants.set(key, desc);
					const srcSec = srcSections[sIdx];
					if (srcSec) {
						const slug = slugify(srcSec.name);
						if (slug) {
							nameAlias.set(`section:${slug}`, key);
							nameAlias.set(`s:${slug}`, key);
						}
						// Pair source tasks with SVG tasks in this section
						// (DOM order = source order within section) so we can
						// register slug aliases by task label.
						sectionTasks.forEach((rectEl, tIdx) => {
							const srcTask = srcSec.tasks[tIdx];
							if (!srcTask) return;
							const labelSlug = slugify(srcTask.label);
							const taskKey = taskKeysByRect.get(rectEl);
							if (labelSlug && taskKey) {
								nameAlias.set(`task:${labelSlug}`, taskKey);
								nameAlias.set(`t:${labelSlug}`, taskKey);
							}
						});
					}
				});
			} else if (diagramType === "sankey") {
				// Sankey: nodes are deduped by first-appearance source order
				// and rendered as `<g class="node" id="node-N">` with N starting
				// at 1. Labels live in a parallel `<g class="node-labels">` —
				// `<text>` children in the same order. Flows are `<g class="link">`
				// inside `<g class="links">` in source order. None of these
				// carry source-level identifiers in their attributes, so we
				// build the alias map by parsing the source.
				const srcFlows = []; // [{src, tgt}]
				const srcNodeOrder = []; // dedup-ordered list of node names
				const seenNodes = new Set();
				const addNode = (n) => {
					if (n && !seenNodes.has(n)) {
						seenNodes.add(n);
						srcNodeOrder.push(n);
					}
				};
				let inDiagSk = false;
				for (const raw of graphDefinition.split(/\r?\n/)) {
					const line = raw.replace(/%%.*$/, "").trim();
					if (!line) continue;
					if (!inDiagSk) {
						if (/^sankey-?beta\b/i.test(line)) inDiagSk = true;
						continue;
					}
					// CSV row. Quoted names allowed but rare; split on commas
					// outside quotes is overkill — use a simple split and
					// strip surrounding quotes if any.
					const parts = line.split(",").map((s) => s.trim().replace(/^"(.*)"$/, "$1"));
					if (parts.length < 3) continue;
					const [src, tgt] = parts;
					addNode(src);
					addNode(tgt);
					srcFlows.push({ src, tgt });
				}

				// Walk SVG nodes — `g.node` in DOM order pairs with source
				// dedup order. Labels in `g.node-labels > text` are in the
				// same order.
				const nodeEls = svgElement.querySelectorAll("g.node");
				const labelEls = Array.from(svgElement.querySelectorAll("g.node-labels > text"));
				nodeEls.forEach((nodeEl, i) => {
					const name = srcNodeOrder[i];
					if (!name) return;
					const key = `_sankey:node:${name}`;
					elById.set(key, nodeEl);
					coElements.set(key, labelEls[i] ? [labelEls[i]] : []);
					// Bare-name resolution: directives can write `Coal`,
					// `Electricity`, etc. directly.
					nameAlias.set(name, key);
					const slug = slugify(name);
					if (slug && slug !== name) nameAlias.set(slug, key);
				});

				// Walk SVG flows — `g.link` in DOM order pairs with source order.
				const linkEls = svgElement.querySelectorAll("g.link");
				linkEls.forEach((linkEl, i) => {
					const flowN = i + 1;
					const key = `_sankey:flow:${flowN}`;
					elById.set(key, linkEl);
					nameAlias.set(`flow:${flowN}`, key);
					nameAlias.set(`f:${flowN}`, key);
					// Register the flow as an edge so `Source->Target` atoms
					// resolve through the canonical edge resolver. The
					// edgeIndex src/tgt must match what `aliasOf(srcName)`
					// returns — i.e. the synthetic `_sankey:node:*` key — so
					// edge filtering and direct-lookup share the same name
					// space. The wrapper g is what carries the visual weight;
					// tag it so a label-less verb still hits the path inside.
					const srcFlow = srcFlows[i];
					if (srcFlow) {
						edgeIndex.push({
							src: nameAlias.get(srcFlow.src) || srcFlow.src,
							tgt: nameAlias.get(srcFlow.tgt) || srcFlow.tgt,
							pathEl: linkEl,
							labelEl: null,
							arrowStyle: "->",
							labelText: "",
						});
					}
				});
			} else if (diagramType === "gitGraph") {
				// gitGraph: commits are `<circle class="commit <id> commitN"/>`
				// where N is the branch index. Merge commits emit TWO circles
				// at the same coordinates — outer + inner with `commit-merge`
				// class — and have no commit-label by default. Branches are
				// `<line class="branch branchN"/>` plus a label group.
				// Tags emit polygon + circle.tag-hole + text triples. Arrows
				// connect commits as `<path class="arrow arrowN"/>`. None of
				// these carry stable source ids on attributes (the `id` of a
				// merge circle is auto-generated and changes between runs),
				// so the resolver is built from source-order parsing.
				const srcCommits = []; // [{kind: "commit"|"merge"|"cherry", id, tag}]
				const srcBranches = ["main"]; // branch 0 is implicit
				const srcTags = []; // [{name, commitIdx}]
				let inDiagGg = false;
				for (const raw of graphDefinition.split(/\r?\n/)) {
					const line = raw.replace(/%%.*$/, "").trim();
					if (!line) continue;
					if (!inDiagGg) {
						if (/^gitGraph\b/.test(line)) inDiagGg = true;
						continue;
					}
					// Branch creation
					let m = line.match(/^branch\s+(\S+)/);
					if (m) {
						srcBranches.push(m[1]);
						continue;
					}
					if (/^checkout\s+/.test(line)) continue;
					// commit / merge / cherry-pick — possibly with `id: "..."`
					// and / or `tag: "..."`. The tokens may appear in either
					// order; pull them out individually.
					const isCommit = /^commit\b/.test(line);
					const mergeMatch = line.match(/^merge\s+(\S+)/);
					const cherryMatch = line.match(/^cherry-pick\b/);
					if (isCommit || mergeMatch || cherryMatch) {
						const idMatch = line.match(/\bid:\s*"([^"]+)"/);
						const tagMatch = line.match(/\btag:\s*"([^"]+)"/);
						const kind = mergeMatch ? "merge" : cherryMatch ? "cherry" : "commit";
						const commitIdx = srcCommits.length;
						srcCommits.push({ kind, id: idMatch ? idMatch[1] : null, tag: tagMatch ? tagMatch[1] : null });
						if (tagMatch) srcTags.push({ name: tagMatch[1], commitIdx });
						continue;
					}
				}

				// Walk circles in DOM order. Each non-merge commit is one
				// circle; each merge is two consecutive circles at the same
				// coordinates (outer + commit-merge inner). Group them.
				// Use descendant selector throughout: mermaid emits an empty
				// `<g class="commit-bullets">` placeholder before the populated
				// one, and labels live nested under unclassed wrapper `<g>`s
				// inside `g.commit-labels`. Direct-child selectors miss them.
				const allCircles = Array.from(svgElement.querySelectorAll("g.commit-bullets circle.commit"));
				const commitGroups = []; // [[circle, ...]] - one entry per logical commit
				for (let i = 0; i < allCircles.length; i++) {
					const c = allCircles[i];
					const cls = c.getAttribute("class") || "";
					if (cls.includes("commit-merge")) {
						// Attach to previous group
						if (commitGroups.length > 0) commitGroups[commitGroups.length - 1].push(c);
					} else {
						commitGroups.push([c]);
					}
				}

				// Walk commit labels — fewer than commits when merges are
				// present (default theme suppresses merge labels). Pair by
				// proximity: for each label, find the closest non-merge
				// commit circle by cx coordinate.
				const labelTexts = Array.from(svgElement.querySelectorAll("g.commit-labels text.commit-label"));
				const labelBkgs = Array.from(svgElement.querySelectorAll("g.commit-labels rect.commit-label-bkg"));
				const labelByCommit = new Map(); // commitIdx → [bkgEl, textEl]
				labelTexts.forEach((labelEl, lIdx) => {
					const lx = parseFloat(labelEl.getAttribute("x") || "0");
					let bestIdx = -1;
					let bestDist = Infinity;
					commitGroups.forEach((grp, cIdx) => {
						const c = grp[0];
						if ((c.getAttribute("class") || "").includes("commit-merge")) return;
						const cx = parseFloat(c.getAttribute("cx") || "0");
						const d = Math.abs(cx - lx);
						if (d < bestDist) {
							bestDist = d;
							bestIdx = cIdx;
						}
					});
					if (bestIdx !== -1 && !labelByCommit.has(bestIdx)) {
						labelByCommit.set(bestIdx, [labelBkgs[lIdx], labelEl].filter(Boolean));
					}
				});

				// Register commits.
				let mergeCounter = 0;
				commitGroups.forEach((grp, cIdx) => {
					const commitN = cIdx + 1;
					const key = `_git:commit:${commitN}`;
					elById.set(key, grp[0]);
					const cos = grp.slice(1).concat(labelByCommit.get(cIdx) || []);
					coElements.set(key, cos);
					nameAlias.set(`commit:${commitN}`, key);
					nameAlias.set(`c:${commitN}`, key);
					const srcC = srcCommits[cIdx];
					if (srcC) {
						if (srcC.id) {
							nameAlias.set(`commit:${srcC.id}`, key);
							nameAlias.set(`c:${srcC.id}`, key);
							const slug = slugify(srcC.id);
							if (slug && slug !== srcC.id) {
								nameAlias.set(`commit:${slug}`, key);
								nameAlias.set(`c:${slug}`, key);
							}
						}
						if (srcC.kind === "merge") {
							mergeCounter++;
							nameAlias.set(`merge:${mergeCounter}`, key);
						}
					}
				});

				// Branches — `line.branch` in source order; `branch0` is the
				// implicit main, `branch1` is the first explicit `branch`,
				// etc. The label group is the next sibling g.branchLabel.
				const branchLines = Array.from(svgElement.querySelectorAll("line.branch"));
				const branchLabelGroups = Array.from(svgElement.querySelectorAll("g.branchLabel"));
				const branchLabelBkgs = Array.from(svgElement.querySelectorAll("rect.branchLabelBkg"));
				branchLines.forEach((lineEl, bIdx) => {
					const bN = bIdx + 1;
					const key = `_git:branch:${bN}`;
					elById.set(key, lineEl);
					const cos = [];
					if (branchLabelGroups[bIdx]) cos.push(branchLabelGroups[bIdx]);
					if (branchLabelBkgs[bIdx]) cos.push(branchLabelBkgs[bIdx]);
					coElements.set(key, cos);
					nameAlias.set(`branch:${bN}`, key);
					const name = srcBranches[bIdx];
					if (name) {
						nameAlias.set(`branch:${name}`, key);
						const slug = slugify(name);
						if (slug && slug !== name) nameAlias.set(`branch:${slug}`, key);
					}
				});

				// Tags — polygon.tag-label-bkg + circle.tag-hole + text.tag-label
				// triples in source order.
				const tagBkgs = Array.from(svgElement.querySelectorAll("polygon.tag-label-bkg"));
				const tagHoles = Array.from(svgElement.querySelectorAll("circle.tag-hole"));
				const tagTexts = Array.from(svgElement.querySelectorAll("text.tag-label"));
				tagBkgs.forEach((bkg, tIdx) => {
					const tN = tIdx + 1;
					const key = `_git:tag:${tN}`;
					elById.set(key, bkg);
					const cos = [];
					if (tagHoles[tIdx]) cos.push(tagHoles[tIdx]);
					if (tagTexts[tIdx]) cos.push(tagTexts[tIdx]);
					coElements.set(key, cos);
					nameAlias.set(`tag:${tN}`, key);
					const srcTag = srcTags[tIdx];
					if (srcTag) {
						nameAlias.set(`tag:${srcTag.name}`, key);
						const slug = slugify(srcTag.name);
						if (slug && slug !== srcTag.name) nameAlias.set(`tag:${slug}`, key);
					}
				});

				// Arrows — connector paths between commits, in DOM order.
				// We don't try to map them to (src,tgt) commit pairs here:
				// merges produce extra arrows, branch divergence produces
				// curved arcs, and the visual narrative usually wants
				// commits to drive the staging anyway. Authors who want a
				// specific arrow at a step use `%%! fragment arrow:N at K`.
				const arrowEls = Array.from(svgElement.querySelectorAll("path.arrow"));
				arrowEls.forEach((el, i) => {
					const aN = i + 1;
					const key = `_git:arrow:${aN}`;
					elById.set(key, el);
					nameAlias.set(`arrow:${aN}`, key);
				});
			}

			// Node-name component: `\w+(?:-\w+)*` — accepts hyphens *between*
			// word characters (User-Agent, API-Gateway, my-service-2) but not
			// at the boundary, so the regex doesn't greedily eat the leading
			// hyphen of an arrow form. Backtracking handles the ambiguous
			// case: for "A-xB" (sequence x-arrow), the engine tries to
			// extend "A" with "-xB", finds no arrow can follow, backtracks,
			// and re-parses as A→arrow `-x`→B.
			// Mermaid built-ins like __start__/__end__ work fine since \w covers _.
			//
			// Arrow alternation order matters — longer forms before their
			// prefixes so e.g. `-->>` (sequence response) matches before
			// `-->` (flowchart edge) and `->>` (sequence sync) before `->`
			// (flowchart wildcard arrow). Plain `->` keeps its existing role
			// as the wildcard arrow style for atom matching across all
			// diagram types.
			const atomRegex =
				/^(\w+(?:-\w+)*)\s*(-->>|->>|-->|-\.->|==>|--x|--o|--\)|-\)|-x|->)\s*(\w+(?:-\w+)*)(?:\(([\w]+)\))?(?:\[([^\]]+)\])?$/;
			// Prefix-form atom: section:N, period:Slug, msg:1, actor:App,
			// note:n2, block:1, loop:1, alt:2, m:3, a:1, e:3, b:1,
			// s:MainframeEra, … nameAlias maps these to internal `_tl:*`
			// (timeline) and `_seq:*` (sequence) keys registered in elById.
			// The regex is the gate that tells resolveTarget to NOT fall
			// through to the edge regex when the atom is structural —
			// otherwise a malformed `msg:foo` could be silently mis-parsed
			// as a node name.
			const prefixAtomRegex =
				/^(?:section|s|period|p|event|e|msg|m|actor|a|note|n|block|b|loop|alt|opt|par|critical|break|rect|activation|act|task|t|milestone|flow|f|commit|c|merge|branch|tag|arrow):[\w]+$/;
			const aliasOf = (name) => nameAlias.get(name) || name;
			const resolveTarget = (atom) => {
				const direct = aliasOf(atom);
				if (elById.has(direct)) {
					// Co-elements (sequence msg = line+text, actor = lifeline+
					// rects+labels, note = wrapper+rect+text) are unfolded
					// here so every downstream verb — show / fragment /
					// highlight / dim / accent — naturally tags or fx-classes
					// the whole conceptual unit. Each entry carries the same
					// `key` so structural-descendants logic (timeline only)
					// still pivots correctly off the primary.
					const entries = [{ el: elById.get(direct), kind: "node", key: direct }];
					const cos = coElements.get(direct);
					if (cos) {
						for (const co of cos) entries.push({ el: co, kind: "node", key: direct });
					}
					return entries;
				}
				if (prefixAtomRegex.test(atom)) return []; // prefix form that didn't resolve — skip the edge regex
				const edgeMatch = atom.match(atomRegex);
				if (!edgeMatch) return [];
				const [, srcName, arrow, tgtName, part, qualifier] = edgeMatch;
				const srcKey = aliasOf(srcName);
				const tgtKey = aliasOf(tgtName);
				let candidates = edgeIndex.filter((e) => e.src === srcKey && e.tgt === tgtKey);
				if (arrow !== "->") candidates = candidates.filter((e) => e.arrowStyle === arrow);
				if (qualifier) {
					const labelMatch = qualifier.match(/^label="(.+)"$/);
					const indexMatch = qualifier.match(/^(\d+)$/);
					if (labelMatch) candidates = candidates.filter((e) => e.labelText.includes(labelMatch[1]));
					else if (indexMatch) {
						const idx = parseInt(indexMatch[1], 10);
						candidates = idx < candidates.length ? [candidates[idx]] : [];
					}
				}
				const out = [];
				for (const c of candidates) {
					if (part === "label" && c.labelEl) out.push({ el: c.labelEl, kind: "edge-label" });
					else if (part === "arrow") out.push({ el: c.pathEl, kind: "edge-arrow" });
					else {
						out.push({ el: c.pathEl, kind: "edge-arrow" });
						if (c.labelEl) out.push({ el: c.labelEl, kind: "edge-label" });
					}
				}
				return out;
			};

			// Apply `fragment` directives — each adds fragidx-K directly to
			// its resolved SVG element(s). The cssIndices pass below converts
			// fragidx-K to native .fragment + data-fragment-index. This runs
			// before nodeFragidx is built so any nodes tagged here participate
			// in auto-edge-fragidx propagation.
			//
			// Structural-descendant expansion: directives flagged with
			// `structural: true` (currently `show` rerouted from mindmap/timeline,
			// where mermaid's `class` statement isn't accepted) and whose
			// resolved key has descendants registered in structuralDescendants
			// also tag those descendants. Concretely: `show section:1 at K` on
			// a timeline reveals the section header AND its periods + lines +
			// events at step K. `fragment` directives originating from explicit
			// user `%%! fragment` lines are not structural — they tag exactly
			// the resolved element, matching the documented narrow semantics.
			if (fragmentDirectives.length > 0) {
				for (const fd of fragmentDirectives) {
					for (const atomRaw of fd.target.split(/\s*,\s*/)) {
						const atom = atomRaw.trim();
						if (!atom) continue;
						const resolved = resolveTarget(atom);
						if (resolved.length === 0) {
							console.warn(`Mermaid directive: target '${atom}' did not resolve in '${mermaidContainer.id}'`);
							continue;
						}
						// Strip any pre-existing fragidx-N before adding the new
						// one so later directives in source order override
						// earlier ones (the cssIndices pass below only honors
						// the first fragidx-N it sees on an element). This lets
						// the natural authoring pattern — "show whole section
						// at step 2, but promote one specific event to step 7"
						// — work as written.
						const stripFragidx = (el) => {
							const cl = el.classList;
							for (const c of [...cl]) if (c.startsWith(prefix)) cl.remove(c);
						};
						for (const r of resolved) {
							stripFragidx(r.el);
							r.el.classList.add(prefix + fd.idx);
							if (fd.structural && r.key && structuralDescendants.has(r.key)) {
								for (const d of structuralDescendants.get(r.key)) {
									stripFragidx(d);
									d.classList.add(prefix + fd.idx);
								}
							}
						}
					}
				}
			}

			// Presence vs fragidx-0 are distinct: a node without any
			// fragidx class is always visible from slide load, whereas
			// fragidx-0 means "appears at the first fragment step".
			// Only nodes with an explicit fragidx class go into nodeFragidx.
			// Built AFTER `fragment` directives so post-render fragidx-K
			// additions are reflected in auto-edge propagation.
			const nodeFragidx = new Map();
			svgElement.querySelectorAll("g.node").forEach((el) => {
				const m = (el.getAttribute("class") || "").match(fiRegex);
				if (!m) return;
				const id = stripPrefix(el.getAttribute("id"));
				for (const p of nodePatterns) {
					const idm = id.match(p);
					if (idm) {
						nodeFragidx.set(idm[1], parseInt(m[1], 10));
						break;
					}
				}
			});
			const clusterFragidx = new Map();
			svgElement.querySelectorAll("g.cluster").forEach((el) => {
				const id = stripPrefix(el.getAttribute("id"));
				if (!id) return;
				const m = (el.getAttribute("class") || "").match(fiRegex);
				if (m) clusterFragidx.set(id, parseInt(m[1], 10));
			});
			const getEndpointFragidx = (key) =>
				nodeFragidx.has(key) ? nodeFragidx.get(key) : clusterFragidx.has(key) ? clusterFragidx.get(key) : null;

			// Pass 1: autoEdgeFragidx propagation. For every edge that doesn't
			// already carry a fragidx class, infer one from its endpoints' max
			// fragidx so the edge waits for both endpoints. Prevents dangling
			// arcs.
			if (options.css.enabled && options.css.autoEdgeFragidx) {
				for (const et of edgeTypes) {
					const edges = svgElement.querySelectorAll(et.sel);
					const labels = et.sel === "path.edge" ? null : svgElement.querySelectorAll("g.edgeLabel");
					edges.forEach((edgeEl, i) => {
						if (hasFragidxClass(edgeEl)) return;
						const rawId = stripPrefix(edgeEl.getAttribute("id"));
						const [srcKey, tgtKey] = resolveEndpoints(rawId, et);
						if (!srcKey || !tgtKey) return;
						const sFi = getEndpointFragidx(srcKey);
						const tFi = getEndpointFragidx(tgtKey);
						// If neither endpoint has a fragidx class, both are
						// always-visible; the edge stays always-visible too.
						if (sFi === null && tFi === null) return;
						const fi = Math.max(sFi ?? 0, tFi ?? 0);
						edgeEl.classList.add(prefix + fi);
						if (labels && labels[i] && !hasFragidxClass(labels[i])) {
							labels[i].classList.add(prefix + fi);
						}
					});
				}
			}

			if (options.css.enabled && options.css.cssIndices) {
				const cssSelector = '[class*="' + options.css.indexClassPrefix + '"]';
				const fragmentsWithCssIndex = svgElement.querySelectorAll(cssSelector);

				for (let fragment of fragmentsWithCssIndex) {
					let s = fragment.getAttribute("class");
					s = s.substring(s.indexOf(options.css.indexClassPrefix) + options.css.indexClassPrefix.length);
					s = s.substring(0, Math.max(s.indexOf(" "), s.length));
					fragment.classList.add("fragment");
					fragment.setAttribute("data-fragment-index", s);
				}
			}

			// Apply runtime fx directives (highlight/dim/accent) — uses the
			// shared resolveTarget. For each directive, records metadata as
			// JSON on the SVG (so the listener can find always-on directives
			// that have no proxies) and inserts 0–2 proxy
			// <span class="fragment fx-proxy"> elements at boundary indices,
			// each tagged with data-fx-directive-id and data-fx-role="on"|"off":
			//   transient `at K`        → ON proxy at K (no OFF; uses .current-fragment)
			//   transient `at start`    → OFF proxy at 0 (active until first click)
			//   sticky-from `at K+`     → ON proxy at K
			//   sticky-from `at start+` → no proxies (always-on)
			//   sticky-to   `at K-`     → OFF proxy at K+1
			//   range       `at K..M`   → ON at K, OFF at M+1
			if (fxDirectives.length > 0) {
				let nextFxId = 0;
				let nextDirId = 0;
				const elFxId = new Map();
				const directiveList = [];
				const proxiesToInsert = [];
				for (const d of fxDirectives) {
					const atoms = d.target.split(/\s*,\s*/);
					for (const atomRaw of atoms) {
						const atom = atomRaw.trim();
						if (!atom) continue;
						const resolved = resolveTarget(atom);
						if (resolved.length === 0) {
							console.warn(`Mermaid directive: target '${atom}' did not resolve in '${mermaidContainer.id}'`);
							continue;
						}
						for (const r of resolved) {
							let fxId = elFxId.get(r.el);
							if (!fxId) {
								fxId = `${mermaidContainer.id}-fx${nextFxId++}`;
								elFxId.set(r.el, fxId);
								r.el.setAttribute("data-fx-id", fxId);
							}
							const directiveId = `${mermaidContainer.id}-d${nextDirId++}`;
							directiveList.push({ id: directiveId, targetId: fxId, verb: d.verb, transient: d.transient });
							if (d.onIdx !== undefined) {
								proxiesToInsert.push({ idx: d.onIdx, role: "on", directiveId });
							}
							if (d.offIdx !== undefined) {
								proxiesToInsert.push({ idx: d.offIdx, role: "off", directiveId });
							}
						}
					}
				}
				if (directiveList.length > 0) {
					svgElement.setAttribute("data-fx-directives", JSON.stringify(directiveList));
				}
				const ownerDoc = svgElement.ownerDocument;
				for (const p of proxiesToInsert) {
					const proxy = ownerDoc.createElement("span");
					proxy.className = "fragment fx-proxy";
					proxy.setAttribute("data-fragment-index", String(p.idx));
					proxy.setAttribute("data-fx-directive-id", p.directiveId);
					proxy.setAttribute("data-fx-role", p.role);
					proxy.style.display = "none";
					svgElement.parentNode.insertBefore(proxy, svgElement);
				}
			}

			if (hasStretchClass) svgElement.style.height = "100%";
		});

		await Promise.all(renderPromises);
		reveal.layout();

		// Runtime listener.
		// Each diagram's directives live as JSON in `data-fx-directives` on its
		// SVG. Each directive may have 0–2 proxy fragments tagged with
		// `data-fx-directive-id` and `data-fx-role="on"|"off"`. Reveal.js sorts
		// and renumbers fragment indices to a contiguous 0-based sequence at
		// runtime — we don't compare absolute step numbers; we look at proxy
		// visibility (.visible / .current-fragment) which is intrinsic.
		//
		// Active rule per directive:
		//   transient: (no ON OR ON.current-fragment) AND (no OFF OR !OFF.visible)
		//   sticky:    (no ON OR ON.visible)          AND (no OFF OR !OFF.visible)
		// "no ON, no OFF" → always active (e.g. `at start+`).
		const FX_CLASSES = Object.values(FX_VERBS).map((v) => v.cls);
		const verbToClass = Object.fromEntries(Object.entries(FX_VERBS).map(([v, e]) => [v, e.cls]));
		const updateFxOnSlide = (slideEl) => {
			if (!slideEl) return;
			const targetActive = new Map(); // fxId -> Set of active fx-* classes
			slideEl.querySelectorAll("svg[data-fx-directives]").forEach((svg) => {
				let directives;
				try {
					directives = JSON.parse(svg.getAttribute("data-fx-directives"));
				} catch {
					return;
				}
				if (!Array.isArray(directives)) return;
				for (const d of directives) {
					const cls = verbToClass[d.verb];
					if (!cls) continue;
					const proxies = slideEl.querySelectorAll(`.fx-proxy[data-fx-directive-id="${d.id}"]`);
					let onProxy = null,
						offProxy = null;
					for (const p of proxies) {
						if (p.getAttribute("data-fx-role") === "on") onProxy = p;
						else if (p.getAttribute("data-fx-role") === "off") offProxy = p;
					}
					const onActive =
						!onProxy ||
						(d.transient ? onProxy.classList.contains("current-fragment") : onProxy.classList.contains("visible"));
					const offActive = !offProxy || !offProxy.classList.contains("visible");
					if (!(onActive && offActive)) continue;
					if (!targetActive.has(d.targetId)) targetActive.set(d.targetId, new Set());
					targetActive.get(d.targetId).add(cls);
				}
			});
			slideEl.querySelectorAll("[data-fx-id]").forEach((target) => {
				const active = targetActive.get(target.getAttribute("data-fx-id")) || new Set();
				for (const cls of FX_CLASSES) target.classList.toggle(cls, active.has(cls));
			});
		};
		const updateAllSlides = () => reveal.getRevealElement().querySelectorAll("section").forEach(updateFxOnSlide);
		updateAllSlides();
		reveal.on("ready", updateAllSlides);
		reveal.on("fragmentshown", (e) => updateFxOnSlide(e.fragment.closest("section")));
		reveal.on("fragmenthidden", (e) => updateFxOnSlide(e.fragment.closest("section")));
		reveal.on("slidechanged", (e) => updateFxOnSlide(e.currentSlide));
	},
};
