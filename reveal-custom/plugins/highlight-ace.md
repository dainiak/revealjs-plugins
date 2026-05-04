# RevealHighlightAce

A [Reveal.js](https://revealjs.com/) plugin that provides syntax highlighting and an interactive code editor powered by the [ACE editor](https://ace.c9.io/). ACE is loaded from CDN at runtime — no build step or npm install required.

**Author:** Alex Dainiak
**GitHub:** https://github.com/dainiak/revealjs-plugins/


## Setup

Include the plugin script and register it with Reveal:

```html
<script src="reveal-custom/plugins/highlight-ace.js"></script>
<script>
    Reveal.initialize({
        highlighting: { /* options */ },
        plugins: [RevealHighlightAce]
    });
</script>
```


## Configuration

All options are passed under the `highlighting` key in `Reveal.initialize()`. Every option has a sensible default.

| Option | Type | Default | Description |
|---|---|---|---|
| `theme` | string | `'auto'` | ACE theme name. `'auto'` picks `'chrome'` for light Reveal themes and `'monokai'` for dark ones (`black`, `league`, `night`, `moon`, `dracula`, `blood`). See [ACE themes](https://ace.c9.io/build/kitchen-sink.html). |
| `language` | string | `'python'` | Default ACE mode (language) used when no `data-language` attribute is present on the code element. |
| `showGutter` | boolean | `true` | Show line-number gutter by default. Can be overridden per block with `data-line-numbers`. |
| `trim` | boolean | `true` | Trim leading/trailing whitespace from code blocks. Can be overridden per block with `data-trim`. |
| `dedent` | boolean | `true` | Remove common leading indentation from code blocks. Can be overridden per block with `data-dedent`. |
| `lineAnchors` | boolean | `true` | Process `# @N` anchor comments in every code block. Can be overridden per block with `data-line-anchors="false"` to skip a single block. |
| `relativeIndexing` | boolean | `false` | Treat numeric anchors as group labels with implicit DOM-order ordering (instead of absolute `data-fragment-index` values) for every code block. Can be overridden per block with `data-relative-indexing` / `data-relative-indexing="false"`. |
| `editorInPlace` | boolean | `true` | When opening the live editor, overlay it on top of the code block. If `false`, the editor opens fullscreen. |
| `closeEditorOnBlur` | boolean | `undefined` | If `true`, the live editor closes when it loses focus. |
| `mouseclickModifierKey` | string | `undefined` | Require a modifier key to open the live editor on click. Accepts `'ctrl'`, `'alt'`, `'shift'`, or `'meta'`. If unset, a plain click opens the editor. |
| `editorDefaultFontSize` | string/number | `undefined` | Font size for the live editor. |
| `selector` | string | `'pre code'` | CSS selector for elements to highlight. |
| `customModes` | array | `[]` | Custom ACE mode definitions to load. See [Custom Language Modes](#custom-language-modes). |
| `aceMainUrl` | string | cdnjs | Override URL for `ace.min.js`. |
| `aceBasePath` | string | cdnjs | Override base path for ACE resources. |
| `aceStaticHighlighterUrl` | string | cdnjs | Override URL for the ACE static highlight extension. |


## Code Blocks

### `<script data-highlight>` (preferred)

A standalone `<script data-highlight>` tag is the preferred way to add a code block. No `<pre><code>` wrapper is needed — the plugin automatically generates it. This also avoids having to escape HTML-special characters (`<`, `>`, `&`).

The language is inferred from the `type` attribute (`text/<language>`):

```html
<script data-highlight type="text/python">
    import sys
    if __name__ == "__main__":
        for arg in sys.argv[1:]:
            print(f"arg: {arg}")
</script>
```

If `type` is omitted or doesn't start with `text/`, the global `language` default is used.

All `data-*` attributes on the `<script>` are forwarded to the generated `<code>` element (e.g. `data-theme`, `data-line-numbers`, `contenteditable`).

### `<pre><code>` (legacy)

Also supported for backwards compatibility. Use the `data-language` attribute to set the language:

```html
<pre><code data-language="sql">
SELECT * FROM users WHERE active = true;
</code></pre>
```

Note that with this approach, HTML-special characters (`<`, `>`, `&`) must be escaped as `&lt;`, `&gt;`, `&amp;`.


## Per-Block Attributes

These attributes can be placed on the `<code>` element or directly on the `<script data-highlight>` element:

| Attribute | Description |
|---|---|
| `data-language="..."` | Override the language for this block (any [ACE mode name](https://ace.c9.io/build/kitchen-sink.html)). |
| `data-theme="..."` | Override the ACE theme for this block. |
| `data-trim` | Trim leading/trailing whitespace. |
| `data-dedent` / `data-dedent="false"` | Force-enable or disable dedent for one block, overriding the global `dedent` default. |
| `data-line-numbers="..."` | Show line numbers and optionally highlight specific lines. See [Line Highlighting](#line-highlighting). |
| `data-line-anchors` | Build the highlight spec from inline anchor comments in the code. On globally by default; set `data-line-anchors="false"` to skip anchor processing for a single block. See [Line Anchors](#line-anchors). |
| `data-relative-indexing` | Treat numeric anchors as group labels with implicit DOM-order ordering instead of absolute `data-fragment-index` values. Off globally by default; presence (or `="true"`) turns it on for one block, `="false"` forces it off if the global default is on. See [Relative indexing](#relative-indexing). |
| `data-reserve-lines="N"` | Pad the code block to at least N lines (useful for consistent sizing when code will be updated live). |
| `contenteditable="true"` | Enable the interactive live editor on click. |
| `data-editor-in-place` | Force the live editor to overlay in-place (not fullscreen). |
| `data-editor-fullscreen` | Force the live editor to open fullscreen. |


## Line Highlighting

The `data-line-numbers` attribute enables the line-number gutter and supports highlighting specific lines. Non-highlighted lines are dimmed to 30% opacity with a smooth transition.

### Static highlighting

Highlight a fixed set of lines:

```html
<script data-highlight type="text/python" data-line-numbers="3,5-7">
    ...
</script>
```

This highlights line 3 and lines 5 through 7.

### Step-through with Reveal.js fragments

Separate groups with `|` to create fragment steps. Each group is revealed on the next fragment advance:

```html
<script data-highlight type="text/python" data-line-numbers="1-3|5-7|9-12">
    ...
</script>
```

- Initially no lines are highlighted (gutter is shown).
- First fragment step highlights lines 1-3.
- Second step highlights lines 5-7 (lines 1-3 dim).
- Third step highlights lines 9-12.

Fragment indices are auto-assigned, starting after any existing fragments on the slide.

### Explicit fragment indices

Sync line highlights with specific fragment indices using `@<list>`. The list is a single index, a range, or a comma-separated mix:

```html
<script data-highlight type="text/python" data-line-numbers="1-3@0|5-7@2|9-12@3">
    ...
</script>
```

This ties each highlight group to a specific `data-fragment-index`, allowing coordination with other fragment elements on the same slide.

A group can also claim **multiple** fragment indices, so the same lines stay highlighted across several steps:

```html
<script data-highlight type="text/python" data-line-numbers="1@1,2,3|2@1|3@2|4@3">
    ...
</script>
```

Here line 1 is highlighted at fragments 1, 2, and 3 (e.g. a function header), while lines 2/3/4 light up one at a time. When several groups claim the same index, the plugin unions their ranges into a single highlight per fragment.

### Scroll behavior

When highlighted lines are outside the visible area of a scrollable code block, the block automatically scrolls to center the highlighted group.


## Line Anchors

`data-line-numbers="1-3|5-7|9-12"` requires authors (human or LLM) to count lines and keep the ranges in sync with every edit. `data-line-anchors` replaces that with an inline, line-local tag:

```html
<script data-highlight type="text/python" data-line-anchors>
    import json                          # @1

    with open("data.json") as f:         # @2
        data = json.load(f)              # @2

    for user in data["users"]:           # @3
        print(user["name"])              # @3
</script>
```

Each line that should be part of a highlight group gets a trailing comment `<prefix> @<idx>`. Anchors are **absolute `data-fragment-index` values** — `@2` means fragment 2 on the slide, regardless of source order or any other fragments around the code block. This lets you coordinate code highlights with explicitly indexed bullets or other slide fragments.

The anchor comments are stripped before highlighting — both from the rendered code and from `data-raw-code`, so copy-paste yields clean, executable source.

The attribute is presence-only; no value is required.

### Multi-index numeric anchors

A numeric anchor can be a comma-separated list of indices and ranges, so a single line can belong to several fragment steps. Typical use: keep a function header highlighted across several steps while the body lights up one chunk at a time.

```html
<script data-highlight type="text/python" data-line-anchors>
    def total(items, tax_rate):          # @1,2,3
        subtotal = sum(items)            # @1
        tax = subtotal * tax_rate        # @2
        return subtotal + tax            # @3
</script>
```

Ranges are also supported (`@1..3` is shorthand for `@1,2,3`) and can be combined with single indices. The example below keeps the connection setup lit through three steps, walks the body line by line, then lights up the teardown at step 4:

```html
<script data-highlight type="text/python" data-line-anchors>
    conn = sqlite3.connect("app.db")     # @1..3
    cur = conn.cursor()                  # @1..3

    cur.execute("SELECT id FROM users")  # @1
    ids = [row[0] for row in cur]        # @2
    print(f"{len(ids)} users")           # @3

    conn.close()                         # @4
</script>
```

You can also skip indices to coordinate with non-adjacent slide fragments — `@1..2,4` means "fragments 1, 2, and 4":

```html
<script data-highlight type="text/python" data-line-anchors>
    def pipeline(rows):                  # @1..2,4
        cleaned = drop_nulls(rows)       # @1
        normalized = normalize(cleaned)  # @2
        enriched = add_geo(normalized)   # @3
        return persist(enriched)         # @4
</script>
```

If multiple groups claim the same fragment index, the plugin unions their ranges into a single highlight per fragment.

### Sticky and slide-load tokens

Three open-ended tokens cover the common "before / beyond this step" patterns. The grammar mirrors the [mermaid directive DSL](mermaid-directives.md), so the same range vocabulary works across both plugins.

- **`@K+`** (sticky-from) — line stays highlighted from step K through every later code-block trigger. Use for config / anchors that should remain visible while later steps light up.
- **`@K-`** (sticky-to) — line is on at slide load and through step K, off at K+1. Inserts a hidden off-trigger at K+1 if no other anchor lives there (one extra click). Use for "starting state, dropped after step K."
- **`@!`** (slide-load only) — cleared by the first code-block fragment. Use for one-line context (a goal, an input format) that orients the viewer before the implementation walks itself through.

Tokens compose via comma: `@!,3+` means "lit at slide load, off at steps 1–2, lit again from step 3 onwards."

```html
<script data-highlight type="text/python" data-line-anchors>
    DEBUG = True                              # @1+

    def fetch(url):                           # @2
        if DEBUG: print(f"GET {url}")         # @2
        return http.get(url)                  # @2

    def save(record):                         # @3
        if DEBUG: print(f"SAVE {record}")     # @3
        db.write(record)                      # @3
</script>
```

`DEBUG` appears at step 1 and stays lit through steps 2 and 3, co-highlighted with each new function as it's introduced. Without the `+`, `DEBUG` would go off at step 2.

Live demo of all three tokens: `demo-ace/index.html` (slides 6–8).

### Coordinating with other slide fragments

Because anchors map to literal `data-fragment-index` values, you can step a code highlight in lockstep with bullets, callouts, or any other reveal fragment on the same slide. Give the sibling fragments matching `data-fragment-index` attributes:

```html
<section>
    <ul>
        <li class="fragment" data-fragment-index="1">Open the file</li>
        <li class="fragment" data-fragment-index="2">Filter active users</li>
        <li class="fragment" data-fragment-index="3">Print their names</li>
    </ul>
    <script data-highlight type="text/python" data-line-anchors>
        with open("users.json") as f:    # @1
            data = json.load(f)          # @1

        active = [u for u in data        # @2
                  if u["active"]]        # @2

        for u in active:                 # @3
            print(u["name"])             # @3
    </script>
</section>
```

Each fragment advance reveals one bullet and applies its matching code highlight in a single step.

### Relative indexing

Add `data-relative-indexing` (presence-only, or `="true"`) to opt out of absolute fragment indexing for a single block. Anchors then act as group labels and triggers are inserted without `data-fragment-index`, so reveal sorts them in DOM order alongside any unindexed siblings. To make this the default for the whole deck, set `relativeIndexing: true` in the global `highlighting` config — individual blocks can then opt back into absolute indexing with `data-relative-indexing="false"`.

Use this when a code block is nested inside a `<li class="fragment">` (or sits next to other unindexed fragments) and you want the highlight steps to interleave with the surrounding fragments rather than jump ahead of them:

```html
<ul>
    <li class="fragment">
        Wrap each agent with retry logic
        <script data-highlight type="text/python" data-line-anchors data-relative-indexing>
            from tenacity import retry, stop_after_attempt  # @1

            @retry(stop=stop_after_attempt(3))              # @2
            def researcher_node(state):                     # @2
                return research_agent.invoke(state)         # @2
        </script>
    </li>
    <li class="fragment">Escalate to supervisor on failure</li>
</ul>
```

Step order: bullet 1 appears → `@1` highlights → `@2` highlights → bullet 2 appears. Without `data-relative-indexing`, the two code-highlight steps would jump ahead of bullet 1.

Multi-index syntax (`@3,5..7`) is parsed but doesn't make much sense in relative mode — stick to plain `@1 @2 @3` here. Sticky tokens (`@K+`, `@K-`, `@!`) lose their semantics under `data-relative-indexing` since the mode strips the anchor body and treats every group as DOM-ordered; use absolute indexing if you need slide-load or sticky behavior.

### Supported comment prefixes

The anchor must come after a line comment marker. These are recognised:

| Prefix | Typical languages |
|---|---|
| `#` | Python, Ruby, Bash, YAML, TOML, R |
| `//` | JavaScript, TypeScript, C/C++, Java, Rust, Go, Swift |
| `--` | SQL, Haskell, Lua |
| `;` | Lisp, Clojure, Assembly |
| `%` | MiniZinc, Prolog, MATLAB, LaTeX |

### Anchor syntax rules

- Anchor body grammar (K, M ∈ ℕ):
  ```
  token := "!" | K | K..M | K+ | K-
  body  := token ("," token)*
  ```
  Examples: `1`, `3,5..7`, `2..4,6`, `!,3+`, `5-,7..9`.
- The `-` suffix is exclusively the sticky-to marker — there is no `K-M` legacy form for ranges in anchor bodies. Range is always `K..M`. (Note: the line-range portion of `data-line-numbers="1-4|5-8@2"` before the `@` separator still uses `-`; that's a different syntactic position.)
- Only whitespace is allowed between the comment prefix and `@`, and between the body and end of line. This keeps strings like `# explains @foo` from being misinterpreted as anchors.
- If a line consists *only* of an anchor comment (no code before it), the line is dropped entirely — useful for keeping the source clean when nothing else belongs to that line.
- If both `data-line-anchors` and `data-line-numbers="..."` are set, the computed spec from anchors wins.

### Precedence vs `data-line-numbers`

Prefer `data-line-anchors` — numeric anchors bind to specific `data-fragment-index` values just like the `data-line-numbers="...@N"` form, so coordinating with other slide fragments works either way. Fall back to `data-line-numbers` only when the code is generated/templated and inline anchors aren't practical.


## Interactive Live Editor

When a code block has `contenteditable="true"`, clicking it opens a full ACE editor overlay. This provides a complete editing experience with syntax highlighting, auto-indent, and code folding.

```html
<script data-highlight type="text/python" contenteditable="true">
    def greet(name):
        return f"Hello, {name}!"
</script>
```

### Editor keyboard shortcuts

| Key | Action |
|---|---|
| `Esc` | Close editor, discard changes |
| `Ctrl+Enter` | Close editor, save changes back to the slide |

After saving, the code block is re-highlighted and a `codeupdated` event is dispatched on the `<code>` element.

### Editor behavior

- The editor opens in-place by default (overlaying the code block). Use `data-editor-fullscreen` to open fullscreen, or set `editorInPlace: false` globally.
- If `mouseclickModifierKey` is set (e.g. `'ctrl'`), the editor only opens on Ctrl+click.
- The editor closes automatically on slide change or overview mode.


## Custom Language Modes

ACE includes modes for most common languages. For languages ACE doesn't support, you can register custom modes via the `customModes` option.

### Writing a custom mode

Create a JS file that defines an ACE mode using `ace.define()`. The file must be wrapped in an IIFE to safely reference `ace` (which is loaded dynamically):

```js
(function () {
var aceObj = (typeof ace !== 'undefined') ? ace : window.ace;

aceObj.define("ace/mode/mylang_highlight_rules",
    ["require", "exports", "module", "ace/lib/oop", "ace/mode/text_highlight_rules"],
    function (require, exports, module) {
        var oop = require("ace/lib/oop");
        var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;

        var MyLangHighlightRules = function () {
            this.$rules = {
                start: [
                    { token: "keyword", regex: "\\b(?:if|else|while|return)\\b" },
                    { token: "comment.line", regex: "#.*$" },
                    { token: "constant.numeric", regex: "\\b\\d+\\b" },
                    { token: "string", regex: '"[^"]*"' }
                ]
            };
            this.normalizeRules();
        };
        oop.inherits(MyLangHighlightRules, TextHighlightRules);
        exports.MyLangHighlightRules = MyLangHighlightRules;
    }
);

aceObj.define("ace/mode/mylang",
    ["require", "exports", "module", "ace/lib/oop", "ace/mode/text", "ace/mode/mylang_highlight_rules"],
    function (require, exports, module) {
        var oop = require("ace/lib/oop");
        var TextMode = require("ace/mode/text").Mode;
        var MyLangHighlightRules = require("ace/mode/mylang_highlight_rules").MyLangHighlightRules;

        var Mode = function () {
            this.HighlightRules = MyLangHighlightRules;
        };
        oop.inherits(Mode, TextMode);

        (function () {
            this.lineCommentStart = "#";
            this.$id = "ace/mode/mylang";
        }).call(Mode.prototype);

        exports.Mode = Mode;
    }
);
})();
```

**Important:** Only depend on modules bundled in `ace.min.js` (`ace/lib/oop`, `ace/mode/text`, `ace/mode/text_highlight_rules`, `ace/range`). Modules like `ace/mode/folding/cstyle` are loaded on-demand from CDN and won't be available synchronously.

### Registering custom modes

Pass the script URL (or a registration function) in the `customModes` array:

```js
Reveal.initialize({
    highlighting: {
        customModes: ['path/to/ace-mode-mylang.js']
    },
    plugins: [RevealHighlightAce]
});
```

The plugin loads custom mode scripts after ACE is ready but before any code blocks are highlighted.

Each entry in `customModes` can be:
- A **string** (URL) — loaded as a `<script>` tag.
- A **function** — called with `window.ace` as the argument, for inline registration.

### Using a custom mode in slides

```html
<script data-highlight type="text/mylang">
    if x > 0
        return x  # positive
</script>
```

### Included custom mode: MiniZinc

The file `ace-mode-minizinc.js` (next to `highlight-ace.js`) provides a comprehensive MiniZinc mode covering keywords, types, built-in functions, global constraints, annotations, operators, string interpolation, and comments.

```js
highlighting: {
    customModes: ['reveal-custom/plugins/ace-mode-minizinc.js']
}
```


## Programmatic API

The plugin exposes a function on the Reveal instance for highlighting elements from other plugins or custom code:

```js
// After Reveal has initialized:
reveal.highlightBlockWithAce(codeElement, {
    language: 'javascript',
    theme: 'monokai',
    showGutter: true,
    trim: true
});
```

All options are optional and fall back to the global configuration.
