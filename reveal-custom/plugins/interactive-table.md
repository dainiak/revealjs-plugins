# RevealInteractiveTable

A [Reveal.js](https://revealjs.com/) plugin for fragment-orchestrated tables: scripted sorting and cell/row/column highlighting tied to slide clicks. Zero dependencies — no build step, no jQuery.

**Author:** Alex Dainiak
**GitHub:** https://github.com/dainiak/revealjs-plugins/


## Setup

Include the plugin script and register it with Reveal:

```html
<script src="reveal-custom/plugins/interactive-table.js"></script>
<script>
    Reveal.initialize({
        interactiveTable: { /* options */ },
        plugins: [RevealInteractiveTable]
    });
</script>
```


## Configuration

All options are passed under the `interactiveTable` key in `Reveal.initialize()`. Every option has a sensible default.

| Option | Type | Default | Description |
|---|---|---|---|
| `animationMs` | number | `400` | Duration of the FLIP row-reorder animation when a sort is applied. |


## Activation

Add `data-interactive-table` to any `<table>` you want the plugin to manage. The table needs an explicit `<thead>` with header cells and a `<tbody>` with data rows.

```html
<table data-interactive-table>
    <thead>
        <tr><th>Model</th><th>Latency (ms)</th><th>Quality</th></tr>
    </thead>
    <tbody>
        <tr><td>Haiku 4.5</td>   <td>180</td><td>7.8</td></tr>
        <tr><td>Sonnet 4.6</td>  <td>420</td><td>8.9</td></tr>
        <tr><td>Opus 4.7</td>    <td>900</td><td>9.6</td></tr>
    </tbody>
</table>
```

With no other attributes, headers become click-to-sortable: first click sorts ascending, second click descending, third click clears.


## Per-Table Attributes

| Attribute | Description |
|---|---|
| `data-sort="..."` | Scripted sort timeline, tied to fragment indices. See [Sort Timeline](#sort-timeline). |
| `data-highlight="..."` | Scripted highlight timeline, tied to fragment indices. See [Highlight Timeline](#highlight-timeline). |
| `data-sortable-headers="true"` / `"false"` | Force-enable or disable click-to-sort. Default: enabled when no `data-sort` is present, disabled when scripted. |
| `data-fragment-rows` | When set, every body row generated from an embedded data block gets `class="fragment"` so rows reveal one fragment at a time. Has no effect on hand-authored `<tbody>` rows. |


## Embedded Data Sources

Instead of writing out `<thead>` and `<tbody>` by hand, you can drop a single `<script>` block inside the `<table>` and the plugin will build the DOM for you. Three MIME types are recognized:

| Script type | Content |
|---|---|
| `application/json` | Pandas-style JSON (see [JSON formats](#json-formats) below) |
| `text/csv` | Comma-separated values, first row is the header |
| `text/tsv` | Tab-separated values, first row is the header |

The script tag is removed after parsing. Anything else inside the `<table>` (a stray `<thead>` or `<tbody>` you forgot to remove) is also clobbered — the embedded data is the single source of truth. After construction, `data-sort`, `data-highlight`, click-to-sort, and `fragidx-N` continue to work exactly as with hand-written tables.

Indentation is auto-stripped from CSV/TSV content, so you can keep your HTML source pretty-printed without polluting cell values.

### JSON formats

The parser accepts every orientation that `pandas.DataFrame.to_json()` produces:

```json
// orient="split"  — explicit columns + data matrix
{
    "columns": ["Country", "Population", "GDP"],
    "data":    [["USA", 331.9, 25.46], ["China", 1412.0, 17.96]]
}

// orient="records"  — array of row objects (column order from first object)
[
    {"Country": "USA",   "Population": 331.9,  "GDP": 25.46},
    {"Country": "China", "Population": 1412.0, "GDP": 17.96}
]

// orient="columns"  (pandas default)  — outer keys = columns, inner keys = row labels
{
    "Country":    {"0": "USA",   "1": "China"},
    "Population": {"0":  331.9,  "1": 1412.0},
    "GDP":        {"0":  25.46,  "1":   17.96}
}

// Bare values matrix — synthesizes "0", "1", … as column names
[[331.9, 25.46], [1412.0, 17.96]]
```

To force the `index` orientation (outer keys are row labels), wrap the payload:

```json
{
    "orient": "index",
    "data":   {"USA": {"Population": 331.9}, "China": {"Population": 1412.0}}
}
```

### CSV / TSV examples

```html
<table data-interactive-table data-sort="3 desc @1">
    <script type="text/csv">
        Author,Country,Books
        Murakami,Japan,14
        Borges,Argentina,21
        Calvino,Italy,17
    </script>
</table>

<table data-interactive-table>
    <script type="text/tsv">
Model	Latency (ms)	Quality
Haiku 4.5	180	7.8
Sonnet 4.6	420	8.9
    </script>
</table>
```

Quoting follows RFC 4180 — a field that contains a delimiter, newline, or quote must be wrapped in `"..."`, and a literal `"` inside such a field is doubled (`""`).

### Inline markup in cell values

Generated cells and headers are written via `innerHTML`, so values may carry inline markup:

```html
<table data-interactive-table>
    <script type="application/json">
        [
            {"Model": "<strong>Opus 4.7</strong>", "Use": "Hard reasoning"},
            {"Model": "Haiku 4.5",                "Use": "Fast classification"}
        ]
    </script>
</table>
```

Inside `<script>` blocks the HTML parser keeps content as raw text, so `<strong>...</strong>` survives intact through `JSON.parse` / CSV parsing and is rendered when assigned to the cell. To put a literal `<` in cell text, escape it as `&lt;` — the HTML parser decodes the entity before the value reaches the cell.

### Row-fragment reveals

Add `data-fragment-rows` to any data-driven table to make every body row appear as a separate reveal fragment:

```html
<table data-interactive-table data-fragment-rows>
    <script type="text/csv">
        Scenario,Verdict,Why
        Field extraction,No,Structured output
        Algorithmic problems,Yes,Stepwise decomposition
        Multi-turn chat,Hybrid,Latency hurts UX
    </script>
</table>
```


## Sort Timeline

`data-sort` describes a sequence of sort states, one per fragment index. The active state at any moment is the most-recent-visible step's spec; reverting below the lowest index restores the authored row order.

### Grammar

```
data-sort = step ("|" step)*
step      = colspec ("," colspec)* "@" idx
colspec   = <1-based col index> (" asc" | " desc")?
```

- Direction defaults to `asc` if omitted.
- An empty step (e.g. `@3` with no colspecs) reverts to authored order at that fragment.
- Multiple colspecs per step give a multi-key sort (first key dominates, ties break on the next).

### Examples

```html
<!-- Single-step sort: ascending by column 2, applied at fragment 1 -->
<table data-interactive-table data-sort="2 asc @1">...</table>

<!-- Toggle direction across fragments -->
<table data-interactive-table data-sort="2 asc @1 | 2 desc @2 | @3">...</table>

<!-- Multi-key sort: column 3 desc, ties broken by column 1 asc -->
<table data-interactive-table data-sort="3 desc, 1 asc @1">...</table>
```

### Animation

Row reordering uses the FLIP technique — rows animate smoothly from old to new positions in `animationMs` (default 400 ms) with a `cubic-bezier(0.4, 0, 0.2, 1)` ease.

### Numeric vs text sorting

Per column, numeric vs text comparison is auto-detected from the cell values: if every non-empty cell parses as a number, the column sorts numerically. Otherwise it falls back to `localeCompare(..., { numeric: true })` for natural string sort.


## Highlight Timeline

`data-highlight` describes a sequence of highlight states. When any highlights are active, all non-highlighted body cells dim to 30% opacity. Highlighted rows get a soft yellow tint; explicitly highlighted cells get a stronger tint plus an inset border.

### Grammar

```
data-highlight = step ("|" step)*
step           = target ("," target)* "@" idx
target         = <row-range>
               | <row-range> ":" <col-range>
               | ":" <col-range>
row/col range  = <int> | <int> "-" <int>
```

- Indices are 1-based for both rows and columns.
- An empty step (`@N` with no targets) clears highlights at that fragment.

### Targets at a glance

| Target | Means |
|---|---|
| `1`           | row 1 (entire row) |
| `1-3`         | rows 1 through 3 |
| `2:4`         | cell at row 2, column 4 |
| `2:3-5`       | cells in row 2, columns 3 through 5 |
| `1-3:4`       | cells in rows 1 through 3, column 4 |
| `1-3:2-4`     | cell rectangle |
| `:4`          | entire column 4 |
| `:2-4`        | entire columns 2 through 4 |

### Examples

```html
<!-- Light up rows cumulatively across three fragments -->
<table data-interactive-table data-highlight="1 @1 | 1-2 @2 | 1-3 @3">...</table>

<!-- One cell, then a column, then a rectangle -->
<table data-interactive-table data-highlight="2:3 @1 | :2 @2 | 2-4:2-3 @3">...</table>

<!-- Combine row and cell highlights in one step -->
<table data-interactive-table data-highlight="1, 3:4 @1">...</table>
```


## Independent Timelines

`data-sort` and `data-highlight` are tracked as two **independent** timelines. The active state per timeline is the most-recent-visible checkpoint; missing steps in one timeline don't reset state in the other.

```html
<!-- Sort applied once at @1, then highlights change at every step.
     The sort persists through @2 and @3 without restating it. -->
<table data-interactive-table
       data-sort="2 desc @1"
       data-highlight="1 @1 | 1-2 @2 | 3 @3">
    ...
</table>
```

Each step is a **complete state spec**, not a delta. At step 2, highlighting "rows 1-2" replaces step 1's highlight wholesale — even if step 1 had highlighted other cells. Reverting below the lowest indexed step in a timeline restores its empty/default state (authored order, no highlights).


## Coordinating with Other Slide Fragments

Because timeline indices map to literal `data-fragment-index` values, you can step the table state in lockstep with bullets, callouts, or any other reveal fragment. Give the sibling fragments matching `data-fragment-index` attributes:

```html
<section>
    <ul>
        <li class="fragment" data-fragment-index="1">Sort by latency: lightest first</li>
        <li class="fragment" data-fragment-index="2">Sort by quality: strongest first</li>
    </ul>
    <table data-interactive-table
           data-sort="2 asc @1 | 3 desc @2"
           data-highlight="1-2 @1 | 1 @2">
        ...
    </table>
</section>
```

Each fragment advance reveals one bullet and applies its matching table state in a single step. Internally the plugin piggybacks on existing fragments at the requested indices when present, otherwise it inserts a hidden trigger after the table.


## Click-to-Sort

When no `data-sort` attribute is present, every header becomes click-to-sortable:

- 1st click: sort ascending by that column
- 2nd click on same column: descending
- 3rd click: clear sort, restore authored order
- Click another column: ascending by that column

Sort indicators (`▲` / `▼`) are added to the active header. To disable click-to-sort even on unscripted tables, set `data-sortable-headers="false"`. To force it on alongside a scripted timeline, set `data-sortable-headers="true"` (manual clicks then act as a transient override that the next fragment event overwrites).


## Legacy `fragidx-N` on Cells

Cells (or rows) carrying `class="fragidx-N"` are promoted to reveal fragments — they appear at fragment N just like `<element class="fragment" data-fragment-index="N">`. This carries over the behavior of the old `datatables.js` plugin and is useful for staged data reveal independent of sort/highlight scripting:

```html
<table data-interactive-table>
    <thead><tr><th>Step</th><th>Result</th></tr></thead>
    <tbody>
        <tr><td>Initial</td>     <td class="fragidx-1">42</td></tr>
        <tr><td>After tuning</td><td class="fragidx-2">61</td></tr>
        <tr><td>After caching</td><td class="fragidx-3">78</td></tr>
    </tbody>
</table>
```

Fragment-promoted cells are excluded from the highlight-timeline dimming (so reveal's own visibility transitions aren't fought by the plugin's opacity rules).


## Theming

All visual properties are exposed as CSS custom properties with sensible defaults. Override them at any inheritance level — globally on `.reveal`, per-slide on a `<section>`, or per-table via `style="..."` — no specificity tricks needed.

| Variable | Default | Purpose |
|---|---|---|
| `--it-row-lit-bg` | `rgba(255, 220, 100, 0.15)` | Background tint for cells in a highlighted row (`tr.it-row-lit > td`) |
| `--it-cell-lit-bg` | `rgba(255, 220, 100, 0.28)` | Background tint for an individually highlighted cell (`td.it-cell-lit`) |
| `--it-cell-lit-border` | `rgba(255, 200, 60, 0.7)` | Color of the inset border on a highlighted cell |
| `--it-cell-lit-border-width` | `2px` | Width of the inset border on a highlighted cell |
| `--it-dim-opacity` | `0.3` | Opacity of non-highlighted cells when any highlight is active |
| `--it-anim-ms` | `400ms` (or `animationMs` config value) | Sort row-reorder animation duration |
| `--it-anim-ease` | `cubic-bezier(0.4, 0, 0.2, 1)` | Sort row-reorder easing curve |
| `--it-fade-ms` | `0.25s` | Duration of opacity / background-color / box-shadow transitions |
| `--it-sort-glyph-inactive-opacity` | `0.25` | Opacity of the `↕` glyph on click-to-sort headers when the column isn't the active sort key |

### Examples

Match a blue accent theme globally:

```css
.reveal {
    --it-row-lit-bg: rgba(80, 160, 255, 0.18);
    --it-cell-lit-bg: rgba(80, 160, 255, 0.32);
    --it-cell-lit-border: rgba(60, 140, 240, 0.7);
}
```

Slow the sort animation and dim more aggressively for one slide:

```html
<section style="--it-anim-ms: 700ms; --it-dim-opacity: 0.18;">
    <table data-interactive-table data-sort="2 desc @1">...</table>
</section>
```

Stronger highlight, no border, on a single table:

```html
<table data-interactive-table
       style="--it-cell-lit-bg: rgba(255, 80, 80, 0.4); --it-cell-lit-border-width: 0;"
       data-highlight="2:3 @1">...</table>
```

### Class hooks

If a CSS variable doesn't cover what you need, target these classes/attributes directly. They're stable contract:

| Selector | Applied when |
|---|---|
| `tr.it-row-lit` | The row is in the active highlight spec as a whole-row target |
| `td.it-cell-lit` | The cell is in the active highlight spec as a cell, column, or rectangle target |
| `table.it-has-highlights` | At least one highlight target is active on this table (drives the dim-non-lit behavior) |
| `th[data-sortable]` | Header is click-to-sortable |
| `th[data-sort-active="asc"]` / `="desc"` | Header is the active sort key |


## Notes and Limitations

- Sort and highlight indices reference 1-based **column positions**, not header text. Reordering columns in source means updating the indices.
- The plugin only sorts `<tbody>` rows. The first `<tbody>` is used; further `<tbody>` elements are ignored.
- Avoid `colspan` / `rowspan` inside `<tbody>` — column indexing is by `<td>` position, which colspan distorts.
- Highlight dimming uses `:not(.fragment)` so reveal-fragment cells aren't affected. If you need both fragment-driven and highlight-driven visibility on the same column, prefer the highlight timeline.


## Demo

A standalone demo deck exercising every feature lives at `interactive-table-demo/index.html` in this repository.
