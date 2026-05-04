# Reveal.js plugin collection

A collection of [Reveal.js](https://revealjs.com/) plugins built up over the years for use in lecture-style decks.

## Showcase

- **Gateway deck**: [`index.html`](index.html) — one slide per plugin with live taste of each.
- Per-plugin demo decks (full feature tour for each):
  - [`demo-mermaid/`](demo-mermaid/index.html) — Mermaid diagrams + the `%%! show / highlight / dim / accent / spotlight` directive DSL
  - [`demo-ace/`](demo-ace/index.html) — `highlight-ace` line anchors (`# @N`)
  - [`demo-charts/`](demo-charts/index.html) — fragment-driven Vega-Lite & Plotly charts
  - [`demo-tables/`](demo-tables/index.html) — fragment-driven sort + cell highlighting
  - [`demo-math/`](demo-math/index.html) — MathJax, fragments inside formulas, math in SVG
  - [`demo-inking/`](demo-inking/index.html) — interactive whiteboard
  - [`demo-pyodide/`](demo-pyodide/index.html) — in-browser Python execution
  - [`demo-content-loader/`](demo-content-loader/index.html) — load HTML / text / PDF / SVG into slides

Live: <https://dainiak.github.io/revealjs-plugins/>.

## Layout

```
reveal/                    # stock reveal.js (6.x), checked in
reveal-custom/
    css/                   # extras.css, progress-bar.css
    plugins/               # the plugin set
    themes/                # bonus themes (solarized-mod)
demo-*/                    # per-plugin demo decks
index.html                 # gateway showcase deck
```

## Usage

No build step. Drop `reveal/`, `reveal-custom/` into your repo, register the plugins you want in
`Reveal.initialize({ plugins: [...] })`, and load each plugin's `<script>` tag in the page.

A typical setup looks like:

```html
<link rel="stylesheet" href="reveal/dist/reveal.css">
<link rel="stylesheet" href="reveal/dist/theme/black.css">
<link rel="stylesheet" href="reveal-custom/css/extras.css">

<div class="reveal"><div class="slides">
    <!-- ...slides... -->
</div></div>

<script src="reveal/dist/reveal.js"></script>
<script src="reveal-custom/plugins/mermaid.js"></script>
<script src="reveal-custom/plugins/highlight-ace.js"></script>
<script>
    Reveal.initialize({
        plugins: [RevealMermaid, RevealHighlightAce],
        highlighting: { theme: 'monokai', language: 'python' },
    });
</script>
```

Heavy third-party libraries (Mermaid, KaTeX, MathJax, Vega, Pyodide, ACE) are loaded from CDN at runtime, not
bundled.

## Author

[Alex Dainiak](https://www.dainiak.com) — `dainiak@gmail.com`
