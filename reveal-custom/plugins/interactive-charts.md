# RevealInteractiveCharts

A [Reveal.js](https://revealjs.com/) plugin that embeds Vega-Lite, Plotly, and Bokeh charts into slides, plus drives Vega and Plotly charts from reveal.js fragments — scripted scene-by-scene narration of the data with no in-chart clicks during the talk. Supersedes the older `bokeh.js`, `plotly.js`, and `vega-embed.js` plugins.

**Author:** Alex Dainiak
**GitHub:** https://github.com/dainiak/revealjs-plugins/


## Setup

Include the plugin script and register it with Reveal:

```html
<script src="reveal-custom/plugins/interactive-charts.js"></script>
<script>
    Reveal.initialize({
        charts: { /* options */ },
        plugins: [RevealInteractiveCharts]
    });
</script>
```

External libraries (Vega, Vega-Lite, Vega-Embed, Plotly, Bokeh) are loaded lazily from CDN at first use — no npm install or build step needed. The three Vega scripts are fetched in parallel (with `script.async = false` to preserve execution order), so cold-load is one round-trip, not three.

Plugin-init order matters when using `RevealHighlightAce` for line-anchor cofiring (see [Cofiring with code line anchors](#cofiring-with-code-line-anchors)) — list `RevealInteractiveCharts` **before** `RevealHighlightAce` so the chart proxies exist before highlight-ace looks for them.


## Configuration

All options live under the `charts` key in `Reveal.initialize()`. Every field is optional; the legacy top-level keys `bokeh`, `plotly`, `vega` are still honoured for backwards compatibility.

```js
Reveal.initialize({
    charts: {
        vega:   { /* vega options */ },
        plotly: { /* plotly options */ },
        bokeh:  { /* bokeh options */ }
    }
});
```

| Backend | Option | Type | Default | Description |
|---|---|---|---|---|
| any | `chartSrcAttribute` | string | `data-vega` / `data-plotly` / `data-bokeh` | DOM attribute that identifies a chart container of this backend. |
| any | `scrolling` | string | `"no"` | `scrolling` attribute applied to iframe containers. |
| vega | `vegaOptions` | object | see below | Options forwarded to `vegaEmbed(el, spec, opts)`. |
| vega | `urls.vega` | string | jsDelivr `vega@6.2.0` | Override the Vega script URL. |
| vega | `urls.vegaLite` | string | jsDelivr `vega-lite@6.4.2` | Override the Vega-Lite script URL. |
| vega | `urls.vegaEmbed` | string | jsDelivr `vega-embed@7.1.0` | Override the Vega-Embed script URL. |
| vega | `urls.customIframeEmbedder` | string | `null` | Optional script loaded inside Vega iframes; if set, it must expose a global `vegaEmbedCustom(el, url, opts)`. |
| vega | `urls.customIframeCss` | string | `null` | Optional stylesheet loaded inside Vega iframes. |
| plotly | `urls.plotly` | string | `cdn.plot.ly/plotly-3.4.0.min.js` | Override the Plotly script URL. |
| bokeh | `urls.bokeh` | string | `cdn.bokeh.org/bokeh-3.9.0.min.js` | Override the Bokeh script URL. |

Default `vegaOptions`:

```js
{
    mode: "vega-lite",
    theme: "auto",        // "dark" if a dark Reveal theme is loaded, else "default"
    renderer: "svg",
    actions: false,
    tooltip: { theme: "fivethirtyeight" }
}
```


## Activation

Mark any container element with the per-backend attribute. Two container types are supported:

| Container | Effect |
|---|---|
| `<div data-vega="...">` etc. | Chart renders directly into the div. **Recommended for most cases.** Fragment-driven narration only works in this mode. |
| `<iframe data-vega="...">` etc. | Chart renders inside a sandbox iframe via `srcdoc`. Useful when a chart's CSS or globals would conflict with the slide deck. Fragment-driven narration is **not** wired up for iframes. |

```html
<!-- div mode (preferred) -->
<div class="r-stretch" data-vega="img/chart.json"></div>

<!-- iframe mode -->
<iframe data-plotly="img/chart.json"></iframe>
```


## Spec sources

For each backend, the chart spec can come from one of three places:

| Source | Example |
|---|---|
| URL | `<div data-vega="img/chart.json"></div>` |
| Inline `<script type="application/json" class="vega-spec">` (or `plotly-spec`) child | `<div data-vega>...child...</div>` |
| (Vega-Lite only) The inline `<script class="vega-spec">` *can* also live inside a sibling — the plugin checks the `data-vega` attribute first, then a child `<script>`. |

URL specs are fetched at plugin-init time so the plugin can read `usermeta.revealFragments` (see below) before lazy-rendering kicks in. The fetched spec is cached and reused — no duplicate network call.

```html
<!-- Inline spec, no external file -->
<div class="r-stretch" data-vega>
    <script type="application/json" class="vega-spec">
        {
            "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
            "data":     {"values": [...]},
            "mark":     "bar",
            "encoding": { "x": {...}, "y": {...} }
        }
    </script>
</div>
```


## Fragment-driven narration

Vega and Plotly chart containers can be wired to a list of fragment entries. Each entry has the shape `{at: K, ...action}`. As reveal advances through the slide, the plugin merges all entries with `at <= currentIndex` over a captured baseline and applies the merged state to the chart.

The fragment list can live in **two equivalent places** — pick whichever reads better. The plugin checks both; the sibling-`<script>` form wins if both are present.

### A. Sibling `<script class="vega-fragments">` block

Good for hand-authored slides where you want fragments visible alongside the markup.

```html
<div class="r-stretch" data-vega>
    <script type="application/json" class="vega-spec">
        { ... vega-lite spec with named params ... }
    </script>
    <script type="application/json" class="vega-fragments">
        [
            { "at": 1, "signals": { "highlight_cats": ["A"] } },
            { "at": 2, "signals": { "highlight_cats": ["A", "B"] } },
            { "at": 3, "signals": { "highlight_cats": [] } }
        ]
    </script>
</div>
```

The class name is per-backend: `vega-fragments` for Vega, `plotly-fragments` for Plotly.

### B. `usermeta.revealFragments` inside the spec

Good for Altair-generated specs — keeps the whole story in one self-contained JSON file.

```json
{
    "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
    "data":     {...},
    "params":   [...],
    "encoding": {...},
    "usermeta": {
        "revealFragments": [
            { "at": 1, "signals": { "highlight_cats": ["A"] } },
            { "at": 2, "signals": { "highlight_cats": ["A", "B"] } },
            { "at": 3, "signals": { "highlight_cats": [] } }
        ]
    }
}
```

`usermeta` is a Vega-Lite-blessed escape hatch for "metadata the renderer ignores, available to the host app." Plotly's JSON tolerates the same key. The slide markup collapses to a single line:

```html
<div class="r-stretch" data-vega="img/chart.json"></div>
```

### Authoring from Altair (Python)

```python
chart = (
    alt.Chart(df).mark_circle()
    .encode(...)
    .add_params(highlight)
    .properties(usermeta={
        "revealFragments": [
            {"at": 1, "signals": {"highlight_cats": ["A"]}},
            {"at": 2, "signals": {"highlight_cats": ["A", "B"]}},
            {"at": 3, "signals": {"highlight_cats": []}},
        ]
    })
    .save("img/chart.json")
)
```


## Entry shape

Every entry needs an integer `at` key. The other keys depend on the backend.

### Vega entries

| Key | Type | Effect |
|---|---|---|
| `at` | int | Fragment index. Author-side 1-based; the proxy lands at `data-fragment-index="K"` and reveal renumbers contiguously when sorting (so two entries with `at: 1` and `at: 2` end up at indices 0 and 1 if no other slide fragments exist — see [Pre-injected proxies and cofiring](#pre-injected-proxies-and-cofiring) for the why). |
| `signals` | object | `{signalName: value, ...}` — pushed into the Vega view via `view.signal(name, value); view.runAsync()`. |

The cleanest authoring pattern in Vega-Lite is to declare a `param` (an array, string, or number) and reference it from a `condition.test` expression in the encoding:

```json
{
    "params": [{"name": "highlight_cats", "value": []}],
    "encoding": {
        "color": {
            "field": "Category", "type": "nominal",
            "legend": {
                "symbolOpacity": {
                    "expr": "length(highlight_cats) == 0 || indexof(highlight_cats, datum.value) >= 0 ? 1 : 0.25"
                }
            }
        },
        "opacity": {
            "condition": {
                "test": "length(highlight_cats) == 0 || indexof(highlight_cats, datum.Category) >= 0",
                "value": 1.0
            },
            "value": 0.25
        }
    }
}
```

The same `condition.test` expression on `legend.symbolOpacity` (with `datum.value` in place of `datum.<field>`) makes the legend swatches react to the selection too.

> **Note on Vega-Lite selections.** `selection_point` / `selection_interval` *do* expose signals, but their internal shapes (`*_tuple`, `*_tuple_fields`) are awkward to set programmatically. The plain-`param` + `condition.test` recipe above sidesteps that and works with every Vega-Lite mark.

### Plotly entries

| Key | Type | Effect |
|---|---|---|
| `at` | int | Fragment index (same semantics as Vega). |
| `restyle` | object | `{path: value, ...}` — passed to `Plotly.restyle(graphDiv, update)`. Per-trace values use positional arrays: `{"opacity": [1, 0.25, 0.25, 0.25]}` sets trace 0 to 1.0, trace 1 to 0.25, etc. A scalar applies to all traces. |
| `relayout` | object | `{path: value, ...}` — passed to `Plotly.relayout(graphDiv, update)`. Path syntax accepts dotted (`marker.opacity`) and bracketed (`shapes[0].y0`) forms. |

```json
{
    "data": [
        {"type": "bar", "name": "North", "opacity": 1, ...},
        {"type": "bar", "name": "South", "opacity": 1, ...}
    ],
    "layout": {...},
    "usermeta": {
        "revealFragments": [
            {"at": 1, "restyle": {"opacity": [1, 0.25]}},
            {"at": 2, "restyle": {"opacity": [0.25, 1]}},
            {"at": 3, "restyle": {"opacity": [1, 1]}}
        ]
    }
}
```

Trace-level `opacity` (vs `marker.opacity`) dims the legend swatch as well as the trace itself. For axis-range sweeps, annotation moves, or shape changes, use `relayout`:

```json
{"at": 2, "relayout": {"xaxis.range": [0, 50], "shapes[0].y0": 30}}
```


## Cumulative-merge semantics

Each entry is a **complete state spec for the keys it touches**, not a delta. State is computed cumulatively:

1. At chart render time the plugin captures a **baseline** for every signal/path that any fragment entry mentions. For Vega this is `view.signal(name)`; for Plotly it's `gd.data[i].path` (per trace) or `gd.layout.path`.
2. At fragment K, the plugin starts from the baseline and overlays every entry with `at <= K`, in order. The last-write-wins merge is the active state.
3. Going backwards re-merges with smaller K — the previous-fragment state is reconstructed from the baseline + earlier entries, not by undoing the later one.

This means revisits and out-of-order navigation always converge to the right state. The trade-off: each entry must specify a complete value (you can't "incrementally add to an array" — write the full array each time).

### Reset entries

To return to baseline, write an entry with the baseline value explicitly:

```json
{ "at": 5, "signals": { "highlight_cats": [] } }
```

For Plotly:

```json
{ "at": 5, "restyle": { "opacity": [1, 1, 1, 1] } }
```


## Pre-injected proxies and cofiring

For each distinct `at` value, the plugin pre-injects one invisible `<span class="fragment fx-chart-proxy">` proxy at plugin-init time, **before** reveal.js sorts the slide. The proxy lives in the chart container's *parent* element (not inside the chart div, where the renderer would clobber it on `innerHTML = ""`).

This pre-injection is what makes co-firing with bullets work correctly. Reveal's `fragments.sort()` rewrites every fragment's `data-fragment-index` to a contiguous 0..N-1 range. If proxies arrived *after* sort, they'd land 1+ clicks out of phase with author-numbered bullets. Because they're present at sort time, both proxies and bullets at the same `data-fragment-index="K"` get bucketed and renumbered together.

```html
<section>
    <div data-vega>
        <script type="application/json" class="vega-spec">{...}</script>
        <script type="application/json" class="vega-fragments">
            [
                {"at": 1, "signals": {"focus": "Reason"}},
                {"at": 2, "signals": {"focus": "Tool"}},
                {"at": 3, "signals": {"focus": "Answer"}}
            ]
        </script>
    </div>
    <ul>
        <li class="fragment" data-fragment-index="1">Reasoning is fast.</li>
        <li class="fragment" data-fragment-index="2">Tool calls dominate latency.</li>
        <li class="fragment" data-fragment-index="3">Final answer.</li>
    </ul>
</section>
```

Three clicks total. Each click reveals one bullet *and* shifts the chart focus.


## Cofiring with code line anchors

When the slide also displays its own fragment script as a code block (highlighted via `RevealHighlightAce`), `# @K` line anchors line up with the chart proxies if `K` matches the entry's `at` value:

```html
<pre><code data-language="html" data-dedent>{"at": 1, "signals": {"focus": "Reason"}},  # @1
{"at": 2, "signals": {"focus": "Tool"}},     # @2
{"at": 3, "signals": {"focus": "Answer"}}    # @3</code></pre>
```

Internally `RevealHighlightAce` looks for an existing `.fragment[data-fragment-index="K"]` on the slide and *piggybacks* on it instead of inserting a new fragment. With `RevealInteractiveCharts` listed before `RevealHighlightAce` in the `plugins:` array, the chart proxies are already in place — so each click drives the chart state and lights up the matching code line in one step, no extra clicks.


## Lazy rendering

Chart `<div>` containers render lazily — the chart for slide N is only built the first time slide N becomes current (via `slidechanged`). Two reasons:

1. **Container sizing.** Reveal sets non-current slides to `display: none`, which means their containers measure 0×0. Vega and Plotly both honour `"width": "container"` / responsive sizing by reading those measurements at render time, and a 0×0 measurement produces a permanently-blank chart that doesn't recover when the slide later becomes visible.
2. **CPU contention.** A deck with many charts would otherwise compile every spec in parallel at init time, blocking the initial paint for several seconds.

Iframe containers and the older Bokeh code path render eagerly — only the lazy mode is wired for the two backends that participate in fragment narration.

The implication for authors: don't rely on chart initialization having completed before slide N is shown. If the chart needs a non-trivial first-paint (large dataset, complex spec), the user will see a brief blank container on first arrival.


## URL specs vs inline specs

| Author intent | Pick |
|---|---|
| Quick demo, spec is short | Inline `<script class="vega-spec">` — no extra file to manage |
| Real lecture; spec is generated by Altair / Plotly Express | URL form — `<div data-vega="img/chart.json"></div>`, with fragments inside `usermeta.revealFragments` |
| Spec needs to be re-used across decks | URL form |
| Spec needs custom CSS / global isolation | Iframe form (loses fragment narration) |
| Slim spec inline (LLM-friendly), but data lives separately | See [Decoupling data from spec](#decoupling-data-from-spec) |


## Decoupling data from spec

Often the *spec* is short enough to author / hand-edit / paste-into-an-LLM inline, but the *dataset* is a few hundred KB of JSON that would bloat the slide HTML. The plugin offers two ways to keep them apart, on top of Vega-Lite's native `data.url`.

### Option 1 (Vega-Lite only): native `data.url`

If you don't need anything beyond what Vega-Lite already provides, just point at the file from inside the spec — vega-embed fetches it. **No plugin features needed.**

```html
<div class="r-stretch" data-vega>
    <script type="application/json" class="vega-spec">
        {
            "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
            "data": { "url": "img/dataset.json" },
            "mark": "bar",
            "encoding": { "x": {"field": "cat"}, "y": {"field": "val", "type": "quantitative"} }
        }
    </script>
</div>
```

CSV/TSV works the same way: `{"url": "x.csv", "format": {"type": "csv"}}`. This is the right answer for most Vega-only decks.

### Option 2: plugin-managed sidecar (use this when…)

- You're using **Plotly** (no native `data.url` mechanism).
- One dataset is **shared across multiple charts** and you want one network fetch (the plugin caches by URL; vega-embed and the browser may not, especially under `file://`).
- You want **named datasets** wired into a `datasets` block.
- You want symmetry with the `revealFragments` sibling-script idiom.

Two entry points, both backward-compatible:

#### Container attribute (single, unnamed)

```html
<div data-vega data-vega-data="img/sales.json">
    <script type="application/json" class="vega-spec">
        { "data": {}, "mark": "bar", "encoding": {...} }
    </script>
</div>
```

The fetched JSON is injected as `spec.data.values` (preserving any existing `data.format`).

#### Sibling `<script class="vega-data">` (multi, named, optionally inline)

```html
<div data-vega>
    <script type="application/json" class="vega-spec">
        {
            "data": { "name": "rows" },
            "datasets": { "meta": [] },
            "transform": [{"lookup": "id", "from": {"data": {"name": "meta"}, "key": "id"}}],
            "mark": "circle", "encoding": {...}
        }
    </script>
    <script type="application/json" class="vega-data" data-name="rows" data-src="img/rows.json"></script>
    <script type="application/json" class="vega-data" data-name="meta">
        [ {"id": 1, "label": "A"}, {"id": 2, "label": "B"} ]
    </script>
</div>
```

Each named entry is written to `spec.datasets[name]`. If `data-src` is set the file is fetched (cached); otherwise the script's text content is parsed as JSON. Always set `type="application/json"` so browsers don't try to execute the inline form as JavaScript.

#### Plotly variant

Same pattern with `data-plotly-data` / `<script class="plotly-data">`. Because Plotly traces interleave data and presentation, sidecar entries usually carry a `data-path` to write at a specific location:

```html
<div data-plotly>
    <script type="application/json" class="plotly-spec">
        { "data": [{"type": "scatter", "mode": "markers"}], "layout": {...} }
    </script>
    <script type="application/json" class="plotly-data" data-path="data[0].x" data-src="img/x.json"></script>
    <script type="application/json" class="plotly-data" data-path="data[0].y" data-src="img/y.json"></script>
</div>
```

Path syntax is the same dotted/bracketed form used by `restyle` entries (`data[0].x`, `marker.opacity`, `shapes[0].y0`). Without `data-path` the fetched JSON replaces `spec.data` wholesale (i.e., the whole trace array).

#### Interaction with fragment narration

Datasets are injected into the spec **before** the chart renders, so the cumulative-merge baseline (captured at render time) reflects the merged data. You can decouple data, spec, and fragments all at once:

```html
<div data-vega data-vega-data="img/sales.json">
    <script type="application/json" class="vega-spec">{ ... }</script>
    <script type="application/json" class="vega-fragments">[ ... ]</script>
</div>
```

#### Notes and limits

- **JSON only.** The plugin-managed sidecar parses with `response.json()`. For CSV / TSV / Arrow, use Vega-Lite's native `data.url` + `data.format`.
- **Override semantics.** A sidecar always wins: an unnamed Vega sidecar replaces `spec.data.values` even if the spec already had `data.url`. This is intentional — the sidecar is the explicit author signal of "here's the data."
- **Cache lifetime.** The URL → Promise cache is module-scoped, so it persists across slide navigation but is reset on a full page reload.


## Bokeh

Bokeh charts are rendered (via either `<div data-bokeh>` or `<iframe data-bokeh>`) but **fragment-driven narration is not wired up for Bokeh**. Bokeh's standalone JSON model assumes server-driven interactivity; client-side mutation requires walking the embed-result root graph, finding models by name, and emitting model-change events — substantially more code than the Vega/Plotly hooks. Until a concrete deck needs it, only the `data-bokeh="..."` rendering path is supported.


## Per-element attributes

| Attribute | Container | Description |
|---|---|---|
| `data-vega="..."` / `data-plotly="..."` / `data-bokeh="..."` | div / iframe | Spec source URL. May be empty for `data-vega` / `data-plotly` div mode if a child `<script class="*-spec">` is present. |
| `data-vega-data="..."` / `data-plotly-data="..."` | div | Single-dataset URL injected into the spec at preInject time. See [Decoupling data from spec](#decoupling-data-from-spec). |
| `data-override-width="N"` | Vega div | Override SVG/canvas width to N pixels after embed. |
| `data-override-height="N"` | Vega div | Override SVG/canvas height to N pixels after embed. |
| `scrolling="..."` | iframe | Standard iframe attribute. Defaults to backend's `scrolling` config. |


## Class hooks

Stable contract for CSS targeting and debugging:

| Selector | Applied to |
|---|---|
| `span.fx-chart-proxy` | The invisible fragment proxies injected by the plugin (one per distinct `at`). They live as direct children of each chart container's parent element. |
| `div[data-vega]`, `div[data-plotly]`, `div[data-bokeh]` | Chart containers. |
| `iframe[data-vega]`, etc. | Iframe chart containers. |


## Notes and limitations

- **`usermeta.revealFragments` priority.** If both a sibling `<script class="*-fragments">` and `usermeta.revealFragments` are present, the sibling wins. Mixing the two on the same chart is allowed but discouraged — pick one source per chart for clarity.
- **Plotly path syntax.** `restyle` keys use Plotly's standard dotted/bracketed path syntax (`marker.opacity`, `shapes[0].y0`, `xaxis.range`). For per-trace-array values, the outer array is positional over traces; if you want one trace to receive a literal-array value, wrap it: `{"x": [[1,2,3]]}` sets trace 0's `x` to `[1,2,3]`, while `{"x": [1, 2, 3]}` sets traces 0/1/2 to scalars.
- **Vega selections.** Programmatically driving `selection_point` / `selection_interval` via `signals` requires setting the internal `*_tuple` shape, which is awkward and version-fragile. Prefer plain `param` + `condition.test` (see the [Vega entries](#vega-entries) section).
- **Bokeh narration.** Not implemented — see [Bokeh](#bokeh).
- **Range modifiers on `at`.** Only single integers are supported. The mermaid + highlight-ace anchor grammar (`K+`, `K-`, `K..M`, `start`) isn't ported; use multiple entries to express on/off transitions.
- **Iframe mode + fragments.** Iframes are sandboxed via `srcdoc`; the plugin has no view-handle into them and doesn't wire fragment listeners.


## Demo

A standalone demo deck exercising every feature lives at `demo-charts/index.html`:

- Inline spec authoring
- Highlight-by-category (single + cumulative)
- Numeric threshold sweep
- Co-firing with bullets
- `usermeta.revealFragments` form
- URL spec generated from Altair
- Plotly chart with `restyle`-driven trace highlighting
- Code line anchors (`# @K`) cofiring with chart fragments
