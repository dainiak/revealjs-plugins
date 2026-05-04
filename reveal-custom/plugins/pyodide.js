/*
    In-browser python code blocks execution for Reveal.js using Pyodide
    GitHub: https://github.com/dainiak/revealjs-plugins/

    Author: Alex Dainiak
    Web: www.dainiak.com
    Email: dainiak@gmail.com
 */

const RevealPyodide = {
	id: "pyodide",
	init: (reveal) => {
		const pyodideVersion = "0.29.0";
		let options = reveal.getConfig().pyodide || {};
		options = {
			pyodideUrl: options.pyodideUrl || `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/pyodide.js`,
			pyodideBaseUrl: options.pyodideBaseUrl || `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`,
			preloadPackages: options.preloadPackages || [],
		};

		const workerSource = `
			let pyodide = null;
			let stdoutBuffer = "";

			self.onmessage = async (event) => {
				const msg = event.data;
				if (msg.type === "init") {
					importScripts(msg.pyodideUrl);
					pyodide = await self.loadPyodide({ indexURL: msg.pyodideBaseUrl });
					pyodide.setStdout({ batched: (line) => { stdoutBuffer += line + "\\n"; } });
					pyodide.setStderr({ batched: (line) => { stdoutBuffer += line + "\\n"; } });
					if (msg.preloadPackages && msg.preloadPackages.length) {
						await pyodide.loadPackage(msg.preloadPackages);
					}
					self.postMessage({ type: "ready" });
				} else if (msg.type === "run") {
					stdoutBuffer = "";
					let result = "";
					try {
						await pyodide.loadPackagesFromImports(msg.code);
						const value = pyodide.runPython(msg.code);
						if (value !== undefined && value !== null) result = value.toString();
					} catch (e) {
						result = e.toString();
					}
					const stdout = stdoutBuffer;
					stdoutBuffer = "";
					self.postMessage({ type: "result", id: msg.id, stdout, result });
				}
			};
		`;

		const workerUrl = URL.createObjectURL(new Blob([workerSource], { type: "application/javascript" }));
		const worker = new Worker(workerUrl);

		const pendingExecutions = new Map();
		let nextExecutionId = 0;

		const workerReady = new Promise((resolve) => {
			const handler = (event) => {
				if (event.data.type === "ready") {
					worker.removeEventListener("message", handler);
					resolve();
				}
			};
			worker.addEventListener("message", handler);
		});

		worker.addEventListener("message", (event) => {
			const msg = event.data;
			if (msg.type !== "result") return;
			const cb = pendingExecutions.get(msg.id);
			if (cb) {
				pendingExecutions.delete(msg.id);
				cb(msg);
			}
		});

		worker.postMessage({
			type: "init",
			pyodideUrl: options.pyodideUrl,
			pyodideBaseUrl: options.pyodideBaseUrl,
			preloadPackages: options.preloadPackages,
		});

		function runPythonInWorker(code) {
			return new Promise((resolve) => {
				const id = nextExecutionId++;
				pendingExecutions.set(id, resolve);
				worker.postMessage({ type: "run", id, code });
			});
		}

		function runPythonCodeInElement(element) {
			if (!element.hasAttribute("data-language") || element.getAttribute("data-language") !== "python") return;

			element.removeAttribute("data-run-with-deck");
			element.removeAttribute("data-run-with-slide");

			let out = element.pythonOutputElement;
			if (!out && element.dataset.stdout) {
				out = document.querySelector(element.dataset.stdout);
			}
			if (!out) {
				let p = element;
				while (["pre", "code"].indexOf(p.parentNode.tagName.toLowerCase()) !== -1) {
					p = p.parentNode;
				}

				out = document.createElement("pre");
				if (element.hasAttribute("data-output-as-fragment")) out.classList.add("fragment");

				p.insertAdjacentElement("afterend", out);
				let codeElement = document.createElement("code");
				out.appendChild(codeElement);
				out = codeElement;
				element.pythonOutputElement = out;
			}

			const code = element.textContent;
			workerReady
				.then(() => runPythonInWorker(code))
				.then(({ stdout, result }) => {
					let textContent = stdout || "";
					if (textContent.length && result.length && !textContent.endsWith("\n")) textContent += "\n";
					textContent += result;
					out.textContent = textContent;

					if (Reveal.getPlugin("highlight-ace") && reveal.highlightBlockWithAce) {
						reveal.highlightBlockWithAce(out, {
							theme: element.dataset["theme"],
							language: "text",
							showGutter: false,
						});
						element.setAttribute("data-raw-code", code);
					}
				});
		}

		reveal.runPythonCodeInElement = runPythonCodeInElement;

		reveal.on("slidetransitionend", function (event) {
			event.currentSlide
				.querySelectorAll('[data-language="python"][data-run-with-slide]')
				.forEach(runPythonCodeInElement);
		});

		function runWithDeck() {
			reveal
				.getSlidesElement()
				.querySelectorAll('[data-language="python"][data-run-with-deck]')
				.forEach(runPythonCodeInElement);
			reveal.layout();
		}
		if (reveal.isReady()) runWithDeck();
		else reveal.on("ready", runWithDeck);

		reveal
			.getSlidesElement()
			.querySelectorAll('[data-language="python"][data-run-on-edit]')
			.forEach((element) => {
				element.addEventListener("codeupdated", () => {
					runPythonCodeInElement(element);
				});
			});

		return true;
	},
};
