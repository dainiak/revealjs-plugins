/*
    Plugin for fragment-orchestrated tables in reveal.js.

    Activation: <table data-interactive-table>...</table>

    Two independent timelines, both attached to the table itself:

      data-sort      = step ("|" step)*
      sort step      = colspec ("," colspec)* "@" idx
      colspec        = <1-based col index> (" asc" | " desc")?      (default asc)

      data-highlight = step ("|" step)*
      highlight step = target ("," target)* "@" idx
      target         = <row-range>
                     | <row-range> ":" <col-range>
                     | ":" <col-range>
      row/col range  = <int> | <int> "-" <int>

    Each step is a complete state spec. The active state per timeline is
    the most-recent-visible checkpoint; on revert below the lowest step,
    sort returns to authored order and highlights clear.

    Cells/rows with class "fragidx-N" continue to be promoted to reveal
    fragments (legacy behavior carried over from the old datatables plugin).

    Headers are click-to-sortable when no data-sort attribute is present;
    override with data-sortable-headers="true" or "false" on the table.

    Data sources: in addition to authored <thead>/<tbody>, a table can be
    populated from an embedded data block. Supported MIME types:

      <script type="application/json">{...}</script>   pandas-style JSON
      <script type="text/csv">...</script>             comma-separated values
      <script type="text/tsv">...</script>             tab-separated values

    JSON accepts pandas to_json orientations: split, records, columns,
    index, and a bare values matrix. CSV/TSV treat the first row as
    headers and support quoted fields with "" as an escaped quote.

    Cell and header values are written via innerHTML, so values may
    carry inline markup such as <strong>, <em>, <code>, <br>. Use HTML
    entities (&lt;, &amp;) when you need literal special characters.

    Set data-fragment-rows on the <table> to add class="fragment" to
    every body row generated from embedded data — useful for staged
    row-by-row reveals of comparison tables.
*/

const RevealInteractiveTable = {
	id: "interactive-table",
	init: async (reveal) => {
		const options = reveal.getConfig().interactiveTable || {};
		const animationMs = options.animationMs ?? 400;

		injectStyles(animationMs);

		const tableData = new WeakMap();

		for (const table of reveal.getSlidesElement().querySelectorAll("table[data-interactive-table]")) {
			initTable(table);
		}

		reveal.addEventListener("ready", refreshCurrentSlide);
		reveal.addEventListener("slidechanged", refreshCurrentSlide);
		reveal.addEventListener("fragmentshown", refreshCurrentSlide);
		reveal.addEventListener("fragmenthidden", refreshCurrentSlide);

		function refreshCurrentSlide() {
			const slide = reveal.getCurrentSlide();
			if (!slide) return;
			for (const t of slide.querySelectorAll("table[data-interactive-table]")) {
				if (tableData.has(t)) applyActiveState(t);
			}
		}

		function injectStyles(ms) {
			// All visual properties are exposed as CSS custom properties with sensible
			// defaults via `var(--name, fallback)`. Override at any level (`.reveal`,
			// per-slide `<section>`, per-table `style="..."`) without specificity tricks.
			const css = `
				table[data-interactive-table] { border-collapse: collapse; }
				table[data-interactive-table] thead th[data-sortable] {
					cursor: pointer;
					user-select: none;
				}
				table[data-interactive-table] thead th[data-sortable]::after {
					content: " \\2195";
					opacity: var(--it-sort-glyph-inactive-opacity, 0.25);
					font-size: 0.8em;
				}
				table[data-interactive-table] thead th[data-sort-active="asc"]::after {
					content: " \\25B2";
					opacity: 1;
				}
				table[data-interactive-table] thead th[data-sort-active="desc"]::after {
					content: " \\25BC";
					opacity: 1;
				}
				table[data-interactive-table] tbody tr {
					transition: transform var(--it-anim-ms, ${ms}ms) var(--it-anim-ease, cubic-bezier(0.4, 0, 0.2, 1));
				}
				table[data-interactive-table].it-has-highlights tbody td:not(.fragment) {
					opacity: var(--it-dim-opacity, 0.3);
					transition:
						opacity var(--it-fade-ms, 0.25s) ease,
						background-color var(--it-fade-ms, 0.25s) ease,
						box-shadow var(--it-fade-ms, 0.25s) ease;
				}
				table[data-interactive-table].it-has-highlights tbody tr.it-row-lit td:not(.fragment),
				table[data-interactive-table].it-has-highlights tbody td.it-cell-lit:not(.fragment) {
					opacity: 1;
				}
				table[data-interactive-table] tbody tr.it-row-lit td {
					background-color: var(--it-row-lit-bg, rgba(255, 220, 100, 0.15));
				}
				table[data-interactive-table] tbody td.it-cell-lit {
					background-color: var(--it-cell-lit-bg, rgba(255, 220, 100, 0.28));
					box-shadow: inset 0 0 0 var(--it-cell-lit-border-width, 2px) var(--it-cell-lit-border, rgba(255, 200, 60, 0.7));
				}
			`;
			const style = document.createElement("style");
			style.textContent = css;
			document.head.appendChild(style);
		}

		function initTable(table) {
			buildFromEmbeddedData(table);

			const tbody = table.tBodies[0];
			if (!tbody) return;

			// Promote `class="fragidx-N"` on any descendant to a real reveal fragment.
			for (const el of table.querySelectorAll("[class*='fragidx-']")) {
				const m = el.className.match(/fragidx-(\d+)/);
				if (m) {
					el.classList.add("fragment");
					el.setAttribute("data-fragment-index", m[1]);
				}
			}

			const authoredOrder = Array.from(tbody.children);

			const sortAttr = table.getAttribute("data-sort") || "";
			const highlightAttr = table.getAttribute("data-highlight") || "";
			const sortCheckpoints = parseSortTimeline(sortAttr);
			const highlightCheckpoints = parseHighlightTimeline(highlightAttr);

			const slide = table.closest("section");
			const indices = new Set();
			for (const c of sortCheckpoints) indices.add(c.idx);
			for (const c of highlightCheckpoints) indices.add(c.idx);
			const triggersByIdx = ensureFragmentTriggers(slide, table, indices);
			for (const c of sortCheckpoints) c.trigger = triggersByIdx.get(c.idx);
			for (const c of highlightCheckpoints) c.trigger = triggersByIdx.get(c.idx);

			// Click-to-sort: enabled by default unless the table is scripted via
			// data-sort, which would conflict with manual overrides.
			const headerOverride = table.getAttribute("data-sortable-headers");
			const allowClick = headerOverride === "true" || (headerOverride !== "false" && sortCheckpoints.length === 0);
			if (allowClick && table.tHead?.rows[0]) {
				const ths = table.tHead.rows[0].cells;
				for (let i = 0; i < ths.length; i++) {
					const th = ths[i];
					th.setAttribute("data-sortable", "");
					th.addEventListener("click", () => handleHeaderClick(table, i + 1));
				}
			}

			tableData.set(table, {
				tbody,
				authoredOrder,
				sortCheckpoints,
				highlightCheckpoints,
				clickSort: null,
				appliedSortKey: null,
				appliedHighlightKey: null,
				firstApply: true,
			});
		}

		function buildFromEmbeddedData(table) {
			const script = table.querySelector(
				'script[type="application/json"], script[type="text/csv"], script[type="text/tsv"]',
			);
			if (!script) return;

			const type = script.getAttribute("type");
			const text = script.textContent;
			let result;
			try {
				if (type === "application/json") result = parseJsonTable(JSON.parse(text));
				else result = parseDelimited(text, type === "text/tsv" ? "\t" : ",");
			} catch (e) {
				console.error("[interactive-table] failed to parse embedded data:", e);
				return;
			}
			if (!result) return;

			// Clobber any pre-existing structural rows so the embedded data is the
			// single source of truth. The script tag itself is removed too.
			while (table.tHead) table.removeChild(table.tHead);
			while (table.tBodies.length) table.removeChild(table.tBodies[0]);
			script.remove();

			const fragmentRows = table.hasAttribute("data-fragment-rows");

			const thead = document.createElement("thead");
			const headRow = document.createElement("tr");
			for (const col of result.columns) {
				const th = document.createElement("th");
				th.innerHTML = col == null ? "" : String(col);
				headRow.appendChild(th);
			}
			thead.appendChild(headRow);
			table.appendChild(thead);

			const tbody = document.createElement("tbody");
			for (const row of result.rows) {
				const tr = document.createElement("tr");
				if (fragmentRows) tr.classList.add("fragment");
				for (let i = 0; i < result.columns.length; i++) {
					const td = document.createElement("td");
					const v = row[i];
					td.innerHTML = v == null ? "" : String(v);
					tr.appendChild(td);
				}
				tbody.appendChild(tr);
			}
			table.appendChild(tbody);
		}

		function parseJsonTable(data) {
			// Pandas to_json orientations:
			//   split   = { columns: [...], data: [[...]], index?: [...] }
			//   records = [{col: v, ...}, ...]
			//   columns = { col: { rowKey: v, ... }, ... }   (pandas default)
			//   index   = { rowKey: { col: v, ... }, ... }
			//   values  = [[...], [...]]  (no header → synthetic column names)
			if (Array.isArray(data)) {
				if (data.length === 0) return { columns: [], rows: [] };
				if (Array.isArray(data[0])) {
					const ncols = data[0].length;
					const columns = Array.from({ length: ncols }, (_, i) => String(i));
					return { columns, rows: data };
				}
				const columns = [];
				const seen = new Set();
				for (const rec of data) {
					if (rec && typeof rec === "object") {
						for (const k of Object.keys(rec)) {
							if (!seen.has(k)) {
								seen.add(k);
								columns.push(k);
							}
						}
					}
				}
				const rows = data.map((rec) => columns.map((c) => (rec ? rec[c] : null)));
				return { columns, rows };
			}

			if (!data || typeof data !== "object") throw new Error("JSON root must be array or object");

			if (data.orient && data.data !== undefined) {
				if (data.orient === "index") return parseDictOfDicts(data.data, true);
				return parseJsonTable(data.data);
			}

			if (Array.isArray(data.columns) && Array.isArray(data.data)) {
				return { columns: data.columns.map(String), rows: data.data };
			}

			// Plain dict-of-dicts. Distinguishing columns vs index orientation isn't
			// always possible — use pandas' default (orient='columns'): outer keys
			// are column names, inner keys are row labels. To force the index form,
			// supply { orient: "index", data: {...} }.
			return parseDictOfDicts(data, false);
		}

		function parseDictOfDicts(data, transpose) {
			const outerKeys = Object.keys(data);
			if (outerKeys.length === 0) return { columns: [], rows: [] };
			const innerKeySet = new Set();
			const innerKeys = [];
			for (const k of outerKeys) {
				const inner = data[k];
				if (inner && typeof inner === "object" && !Array.isArray(inner)) {
					for (const ik of Object.keys(inner)) {
						if (!innerKeySet.has(ik)) {
							innerKeySet.add(ik);
							innerKeys.push(ik);
						}
					}
				}
			}
			if (transpose) {
				// orient='index': outer = row labels, inner = column names
				const rows = outerKeys.map((rk) => innerKeys.map((cn) => (data[rk] ? data[rk][cn] : null)));
				return { columns: innerKeys, rows };
			}
			// orient='columns': outer = column names, inner = row labels
			const rows = innerKeys.map((rk) => outerKeys.map((cn) => (data[cn] ? data[cn][rk] : null)));
			return { columns: outerKeys, rows };
		}

		function parseDelimited(text, delim) {
			const dedented = dedent(text);
			const rows = [];
			let row = [];
			let cell = "";
			let inQuotes = false;
			for (let i = 0; i < dedented.length; i++) {
				const ch = dedented[i];
				if (inQuotes) {
					if (ch === '"') {
						if (dedented[i + 1] === '"') {
							cell += '"';
							i++;
						} else {
							inQuotes = false;
						}
					} else {
						cell += ch;
					}
				} else if (ch === '"' && cell === "") {
					inQuotes = true;
				} else if (ch === delim) {
					row.push(cell);
					cell = "";
				} else if (ch === "\n" || ch === "\r") {
					row.push(cell);
					rows.push(row);
					row = [];
					cell = "";
					if (ch === "\r" && dedented[i + 1] === "\n") i++;
				} else {
					cell += ch;
				}
			}
			if (cell !== "" || row.length > 0) {
				row.push(cell);
				rows.push(row);
			}
			const nonEmpty = rows.filter((r) => !(r.length === 1 && r[0] === ""));
			if (nonEmpty.length === 0) return { columns: [], rows: [] };
			return { columns: nonEmpty[0], rows: nonEmpty.slice(1) };
		}

		function dedent(text) {
			const lines = text.replace(/^\n+|\s+$/g, "").split("\n");
			let minIndent = Infinity;
			for (const line of lines) {
				if (line.trim() === "") continue;
				const m = line.match(/^[ \t]*/);
				const indent = m ? m[0].length : 0;
				if (indent < minIndent) minIndent = indent;
			}
			if (!isFinite(minIndent)) minIndent = 0;
			return lines.map((l) => l.slice(minIndent)).join("\n");
		}

		function ensureFragmentTriggers(slide, table, indices) {
			const map = new Map();
			if (!slide || indices.size === 0) return map;

			const existingByIdx = new Map();
			for (const f of slide.querySelectorAll(".fragment[data-fragment-index]")) {
				const idx = parseInt(f.getAttribute("data-fragment-index"));
				if (!Number.isFinite(idx)) continue;
				if (!existingByIdx.has(idx)) existingByIdx.set(idx, []);
				existingByIdx.get(idx).push(f);
			}

			let insertAfter = table;
			for (const idx of [...indices].sort((a, b) => a - b)) {
				const existing = existingByIdx.get(idx);
				if (existing && existing.length) {
					map.set(idx, existing[0]);
				} else {
					const trigger = document.createElement("span");
					trigger.className = "fragment";
					trigger.setAttribute("data-fragment-index", String(idx));
					trigger.style.display = "none";
					insertAfter.parentNode.insertBefore(trigger, insertAfter.nextSibling);
					insertAfter = trigger;
					map.set(idx, trigger);
				}
			}
			return map;
		}

		function parseSortTimeline(str) {
			if (!str.trim()) return [];
			const out = [];
			for (const part of str.split("|")) {
				const trimmed = part.trim();
				if (!trimmed) continue;
				const at = trimmed.match(/@\s*(\d+)\s*$/);
				if (!at) continue;
				const idx = parseInt(at[1]);
				const head = trimmed.slice(0, at.index).trim();
				const colspecs = [];
				if (head) {
					for (const c of head.split(",")) {
						const m = c.trim().match(/^(\d+)(?:\s+(asc|desc))?$/i);
						if (!m) continue;
						colspecs.push({ col: parseInt(m[1]), dir: (m[2] || "asc").toLowerCase() });
					}
				}
				out.push({ idx, spec: colspecs });
			}
			return out;
		}

		function parseHighlightTimeline(str) {
			if (!str.trim()) return [];
			const out = [];
			for (const part of str.split("|")) {
				const trimmed = part.trim();
				if (!trimmed) continue;
				const at = trimmed.match(/@\s*(\d+)\s*$/);
				if (!at) continue;
				const idx = parseInt(at[1]);
				const head = trimmed.slice(0, at.index).trim();
				const targets = [];
				if (head) {
					for (const t of head.split(",")) {
						const target = parseHighlightTarget(t.trim());
						if (target) targets.push(target);
					}
				}
				out.push({ idx, spec: targets });
			}
			return out;
		}

		function parseHighlightTarget(s) {
			if (!s) return null;
			const colonIdx = s.indexOf(":");
			if (colonIdx < 0) {
				const rows = parseRange(s);
				return rows ? { rows, cols: null } : null;
			}
			const rowsStr = s.slice(0, colonIdx).trim();
			const colsStr = s.slice(colonIdx + 1).trim();
			const cols = parseRange(colsStr);
			if (!cols) return null;
			if (!rowsStr) return { rows: null, cols };
			const rows = parseRange(rowsStr);
			return rows ? { rows, cols } : null;
		}

		function parseRange(s) {
			const m = s.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
			if (!m) return null;
			const a = parseInt(m[1]);
			const b = m[2] !== undefined ? parseInt(m[2]) : a;
			return { start: Math.min(a, b), end: Math.max(a, b) };
		}

		function handleHeaderClick(table, col) {
			const data = tableData.get(table);
			if (!data) return;
			const cur = data.clickSort;
			let next;
			if (!cur || cur.col !== col) next = { col, dir: "asc" };
			else if (cur.dir === "asc") next = { col, dir: "desc" };
			else next = null;
			data.clickSort = next;
			applyActiveState(table);
		}

		function pickActive(checkpoints) {
			let best = null;
			for (const c of checkpoints) {
				if (c.trigger?.classList.contains("visible")) {
					if (!best || c.idx > best.idx) best = c;
				}
			}
			return best;
		}

		function applyActiveState(table) {
			const data = tableData.get(table);
			if (!data) return;

			const activeSort = pickActive(data.sortCheckpoints);
			const sortSpec = activeSort ? activeSort.spec : data.clickSort ? [data.clickSort] : null;

			const activeHighlight = pickActive(data.highlightCheckpoints);
			const highlightSpec = activeHighlight ? activeHighlight.spec : null;

			const sortKey = JSON.stringify(sortSpec);
			const highlightKey = JSON.stringify(highlightSpec);

			if (sortKey !== data.appliedSortKey) {
				applySort(table, sortSpec, !data.firstApply);
				updateSortIndicators(table, sortSpec);
				data.appliedSortKey = sortKey;
			}
			if (highlightKey !== data.appliedHighlightKey) {
				applyHighlights(table, highlightSpec);
				data.appliedHighlightKey = highlightKey;
			}
			data.firstApply = false;
		}

		function applySort(table, sortSpec, animate) {
			const data = tableData.get(table);
			const tbody = data.tbody;
			const liveRows = Array.from(tbody.children);

			const target =
				!sortSpec || sortSpec.length === 0
					? data.authoredOrder.slice()
					: data.authoredOrder.slice().sort(makeComparator(sortSpec));

			// Skip when nothing changes.
			let identical = liveRows.length === target.length;
			if (identical) {
				for (let i = 0; i < liveRows.length; i++) {
					if (liveRows[i] !== target[i]) {
						identical = false;
						break;
					}
				}
			}
			if (identical) return;

			if (!animate) {
				for (const r of target) tbody.appendChild(r);
				return;
			}

			const oldRects = new Map();
			for (const r of liveRows) oldRects.set(r, r.getBoundingClientRect());

			for (const r of target) tbody.appendChild(r);

			requestAnimationFrame(() => {
				for (const r of target) {
					const oldRect = oldRects.get(r);
					if (!oldRect) continue;
					const newRect = r.getBoundingClientRect();
					const dy = oldRect.top - newRect.top;
					if (dy === 0) continue;
					r.style.transition = "none";
					r.style.transform = `translateY(${dy}px)`;
					// Force reflow so the inverted transform is committed before we play.
					void r.offsetHeight;
					r.style.transition = "";
					r.style.transform = "";
				}
			});
		}

		function makeComparator(sortSpec) {
			// Extract the first signed decimal that appears in the cell. This handles
			// currency, units, and approximation marks consistently:
			//   "~$0.005" → 0.005   "$180" → 180   "2–5s" → 2   "—" → NaN
			// parseFloat alone fails on prefixes ($, ~), and localeCompare with
			// numeric:true would treat 0.5 vs 0.10 as equal (period resets the digit run).
			const NUM_RE = /[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/;
			const extractNumber = (s) => {
				const m = s.match(NUM_RE);
				return m ? parseFloat(m[0]) : NaN;
			};
			return (a, b) => {
				for (const { col, dir } of sortSpec) {
					const i = col - 1;
					const av = (a.children[i]?.textContent ?? "").trim();
					const bv = (b.children[i]?.textContent ?? "").trim();
					const aNum = extractNumber(av);
					const bNum = extractNumber(bv);
					const aMissing = isNaN(aNum);
					const bMissing = isNaN(bNum);

					// Empty / non-numeric cells always sort to the end, regardless of
					// direction — early-return so the dir flip below doesn't apply.
					if (aMissing && !bMissing) return 1;
					if (!aMissing && bMissing) return -1;

					let result;
					if (!aMissing) {
						result = aNum - bNum;
					} else {
						result = av.localeCompare(bv, undefined, { numeric: true });
					}
					if (result !== 0) return dir === "desc" ? -result : result;
				}
				return 0;
			};
		}

		function updateSortIndicators(table, sortSpec) {
			const ths = table.tHead?.rows[0]?.cells;
			if (!ths) return;
			for (const th of ths) th.removeAttribute("data-sort-active");
			if (!sortSpec || sortSpec.length === 0) return;
			for (const { col, dir } of sortSpec) {
				const th = ths[col - 1];
				if (th) th.setAttribute("data-sort-active", dir);
			}
		}

		function applyHighlights(table, spec) {
			const tbody = table.tBodies[0];
			if (!tbody) return;
			for (const tr of tbody.rows) {
				tr.classList.remove("it-row-lit");
				for (const td of tr.cells) td.classList.remove("it-cell-lit");
			}

			if (!spec || spec.length === 0) {
				table.classList.remove("it-has-highlights");
				return;
			}
			table.classList.add("it-has-highlights");

			const rows = tbody.rows;
			for (const target of spec) {
				if (target.cols === null) {
					for (let r = target.rows.start; r <= target.rows.end; r++) {
						rows[r - 1]?.classList.add("it-row-lit");
					}
				} else if (target.rows === null) {
					for (let r = 0; r < rows.length; r++) {
						for (let c = target.cols.start; c <= target.cols.end; c++) {
							rows[r].cells[c - 1]?.classList.add("it-cell-lit");
						}
					}
				} else {
					for (let r = target.rows.start; r <= target.rows.end; r++) {
						const tr = rows[r - 1];
						if (!tr) continue;
						for (let c = target.cols.start; c <= target.cols.end; c++) {
							tr.cells[c - 1]?.classList.add("it-cell-lit");
						}
					}
				}
			}
		}
	},
};
