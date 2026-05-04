/*
    Reveal.js plugin: `fragidx-K` shorthand for fragment + data-fragment-index=K.

    An element carrying a class of the form `fragidx-<value>` is promoted to a
    Reveal.js fragment: the `fragment` class is added and `data-fragment-index`
    is set to <value> (unless the attribute is already present).

    Configurable via Reveal.initialize({ fragmentIndex: { prefix: 'fragidx-' } }).

    Idempotent: safe to run alongside other plugins (math.js, mermaid.js,
    datatables.js) that also convert `fragidx-*` inside their own rendered
    content.
*/

const RevealFragmentIndex = {
	id: "fragmentindex",
	init: (reveal) => {
		const options = reveal.getConfig().fragmentIndex || {};
		const prefix = options.prefix || "fragidx-";
		const selector = `[class*="${prefix}"]`;

		function promote(root) {
			if (!root) return;
			for (const el of root.querySelectorAll(selector)) {
				let idx = null;
				for (const cls of el.classList) {
					if (cls.startsWith(prefix)) {
						idx = cls.slice(prefix.length);
						break;
					}
				}
				if (idx === null || idx === "") continue;
				el.classList.add("fragment");
				if (!el.hasAttribute("data-fragment-index")) el.setAttribute("data-fragment-index", idx);
			}
		}

		promote(reveal.getSlidesElement());
		reveal.on("ready", () => promote(reveal.getSlidesElement()));
	},
};
