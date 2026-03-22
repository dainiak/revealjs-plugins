/*
    Reveal.js alternative highlighting plugin based on ACE editor
    GitHub: https://github.com/dainiak/revealjs-plugins/

    Author: Alex Dainiak
    Web: www.dainiak.com
    Email: dainiak@gmail.com
    Available modes and themes for ACE editor can be tested here: https://ace.c9.io/build/kitchen-sink.html
 */

const RevealHighlightAce = {
	id: 'highlight-ace',
	init: async (reveal) => {
		let aceVersion = '1.43.2';
		let options = reveal.getConfig().highlighting || {};
		options = {
			theme: options.theme || 'auto',
			language: options.language || 'python',
			aceMainUrl: options.aceMainUrl || `https://cdnjs.cloudflare.com/ajax/libs/ace/${aceVersion}/ace.min.js`,
			aceBasePath: options.aceBasePath || `https://cdnjs.cloudflare.com/ajax/libs/ace/${aceVersion}/`,
			aceStaticHighlighterUrl: options.aceStaticHighlighterUrl || `https://cdnjs.cloudflare.com/ajax/libs/ace/${aceVersion}/ext-static_highlight.min.js`,
			editorInPlace: options.editorInPlace !== false,
			closeEditorOnBlur: options.closeEditorOnBlur,
			mouseclickModifierKey: options.mouseclickModifierKey,
			editorDefaultFontSize: options.editorDefaultFontSize,
			selector: options.selector || 'pre code',
			fontSize: '20px',
			showGutter: options.showGutter !== false,
			trim: options.trim !== false,
			dedent: options.dedent !== false
		};

		if((options.theme || 'auto') === 'auto') {
			options.theme = 'chrome';
			if(document.querySelector(
				'[href*="black.css"],[href*="league.css"],[href*="night.css"],[href*="moon.css"],[href*="dracula.css"],[href*="blood.css"]'
			)) {
				options.theme = 'monokai';
			}
		}

		reveal.getConfig().highlighting = options;

		let aceStaticStyle = null;

		// Inject CSS for line highlighting
		let highlightStyle = document.createElement('style');
		highlightStyle.textContent = `
			.ace_static_highlight.ace-has-line-highlights .ace_line {
				opacity: 0.3;
				transition: opacity 0.3s ease;
			}
			.ace_static_highlight.ace-has-line-highlights .ace_line.ace-highlight-line {
				opacity: 1;
			}
			.ace_static_highlight.ace-has-line-highlights .ace_gutter-cell {
				opacity: 0.3;
				transition: opacity 0.3s ease;
			}
			.ace_static_highlight.ace-has-line-highlights .ace_gutter-cell.ace-highlight-line {
				opacity: 1;
			}
		`;
		document.head.appendChild(highlightStyle);

		function parseLineNumberRanges(str) {
			if (!str || !str.trim()) return [];
			return str.split('|').map(group => {
				let fragmentIndex = null;
				const atMatch = group.match(/@(\d+)\s*$/);
				if (atMatch) {
					fragmentIndex = parseInt(atMatch[1]);
					group = group.slice(0, atMatch.index);
				}
				const ranges = group.split(',').map(range => {
					const parts = range.trim().split('-');
					const start = parseInt(parts[0]);
					const end = parts.length > 1 ? parseInt(parts[1]) : start;
					return { start, end };
				});
				return { ranges, fragmentIndex };
			});
		}

		function applyLineHighlightGroup(codeElement, ranges) {
			const aceContainer = codeElement.querySelector('.ace_static_highlight') || codeElement;
			const lines = aceContainer.querySelectorAll('.ace_line');
			const gutterCells = aceContainer.querySelectorAll('.ace_gutter-cell');
			const hasHighlight = ranges && ranges.length > 0;

			aceContainer.classList.toggle('ace-has-line-highlights', hasHighlight);

			lines.forEach((line, i) => {
				const lineNum = i + 1;
				let highlighted = false;
				if (ranges) {
					for (const range of ranges) {
						if (lineNum >= range.start && lineNum <= range.end) {
							highlighted = true;
							break;
						}
					}
				}
				line.classList.toggle('ace-highlight-line', highlighted);
			});

			gutterCells.forEach((cell, i) => {
				const lineNum = i + 1;
				let highlighted = false;
				if (ranges) {
					for (const range of ranges) {
						if (lineNum >= range.start && lineNum <= range.end) {
							highlighted = true;
							break;
						}
					}
				}
				cell.classList.toggle('ace-highlight-line', highlighted);
			});

			// Scroll highlighted lines into view within the code block
			if (hasHighlight) {
				const highlighted = aceContainer.querySelectorAll('.ace_line.ace-highlight-line');
				if (highlighted.length > 0) {
					const scrollParent = codeElement;
					const first = highlighted[0];
					const last = highlighted[highlighted.length - 1];
					const groupTop = first.offsetTop;
					const groupBottom = last.offsetTop + last.offsetHeight;
					const groupHeight = groupBottom - groupTop;
					const visibleTop = scrollParent.scrollTop;
					const visibleHeight = scrollParent.clientHeight;
					if (groupTop < visibleTop || groupBottom > visibleTop + visibleHeight) {
						let targetTop;
						if (groupHeight <= visibleHeight) {
							// Center the group vertically
							targetTop = groupTop - (visibleHeight - groupHeight) / 2;
						} else {
							// Group taller than viewport: align first line to top
							targetTop = groupTop;
						}
						scrollParent.scrollTo({
							top: Math.max(0, targetTop),
							behavior: 'smooth'
						});
					}
				}
			}
		}

		function setupLineHighlights(codeElement) {
			const lineNumbersAttr = codeElement.getAttribute('data-line-numbers');
			if (lineNumbersAttr === null || lineNumbersAttr === '') return;

			const groups = parseLineNumberRanges(lineNumbersAttr);
			if (groups.length === 0) return;

			if (groups.length === 1 && groups[0].fragmentIndex === null) {
				applyLineHighlightGroup(codeElement, groups[0].ranges);
				return;
			}

			// Multiple groups: create fragment triggers for step-through
			const slide = codeElement.closest('section');
			const pre = codeElement.closest('pre') || codeElement;

			const hasExplicitIndices = groups.some(g => g.fragmentIndex !== null);

			if (hasExplicitIndices) {
				// Explicit @indices: piggyback on existing slide fragments.
				// For indices with no matching fragment already on the slide, create hidden triggers.
				const indexToRanges = new Map();
				for (const group of groups)
					indexToRanges.set(group.fragmentIndex, group.ranges);

				const existingIndices = new Set();
				for (const frag of slide.querySelectorAll('.fragment[data-fragment-index]')) {
					existingIndices.add(parseInt(frag.getAttribute('data-fragment-index')));
				}

				let insertAfter = pre;
				for (const [idx] of indexToRanges) {
					if (existingIndices.has(idx)) continue;
					const trigger = document.createElement('span');
					trigger.className = 'fragment';
					trigger.setAttribute('data-fragment-index', String(idx));
					trigger.style.display = 'none';
					insertAfter.parentNode.insertBefore(trigger, insertAfter.nextSibling);
					insertAfter = trigger;
				}

				reveal.addEventListener('fragmentshown', function (event) {
					for (const fragment of event.fragments) {
						if (!slide.contains(fragment)) continue;
						const idx = parseInt(fragment.getAttribute('data-fragment-index'));
						if (indexToRanges.has(idx))
							applyLineHighlightGroup(codeElement, indexToRanges.get(idx));
					}
				});

				reveal.addEventListener('fragmenthidden', function (event) {
					for (const fragment of event.fragments) {
						if (!slide.contains(fragment)) continue;
						const idx = parseInt(fragment.getAttribute('data-fragment-index'));
						if (!indexToRanges.has(idx)) continue;
						// Find the highest still-visible index in our map
						let prevRanges = null;
						for (const f of slide.querySelectorAll('.fragment.visible')) {
							const fIdx = parseInt(f.getAttribute('data-fragment-index'));
							if (indexToRanges.has(fIdx) && f !== fragment)
								prevRanges = indexToRanges.get(fIdx);
						}
						applyLineHighlightGroup(codeElement, prevRanges);
					}
				});
			} else {
				// Auto-assigned indices: create hidden fragment triggers
				let maxFragmentIndex = -1;
				for (const frag of slide.querySelectorAll('.fragment[data-fragment-index]')) {
					const idx = parseInt(frag.getAttribute('data-fragment-index'));
					if (!isNaN(idx) && idx > maxFragmentIndex)
						maxFragmentIndex = idx;
				}
				let autoIndex = maxFragmentIndex + 1;

				const fragments = [];
				let insertAfter = pre;

				for (let i = 0; i < groups.length; i++) {
					const trigger = document.createElement('span');
					trigger.className = 'fragment';
					trigger.setAttribute('data-fragment-index', String(autoIndex++));
					trigger.style.display = 'none';
					trigger._aceLineRanges = groups[i].ranges;
					trigger._aceCodeElement = codeElement;
					insertAfter.parentNode.insertBefore(trigger, insertAfter.nextSibling);
					insertAfter = trigger;
					fragments.push(trigger);
				}

				reveal.addEventListener('fragmentshown', function (event) {
					for (const fragment of event.fragments) {
						if (fragment._aceCodeElement === codeElement)
							applyLineHighlightGroup(codeElement, fragment._aceLineRanges);
					}
				});

				reveal.addEventListener('fragmenthidden', function (event) {
					for (const fragment of event.fragments) {
						if (fragment._aceCodeElement !== codeElement) continue;
						let prevGroup = null;
						for (const f of fragments) {
							if (f.classList.contains('visible') && f !== fragment)
								prevGroup = f._aceLineRanges;
						}
						applyLineHighlightGroup(codeElement, prevGroup);
					}
				});
			}
		}

		function dedentString(str) {
			const TAB_WIDTH = 4;
			const lines = str.split(/\r?\n/);
			let minIndent = Infinity;

			for (const line of lines) {
				if (!line.trim()) continue;
				let width = 0;
				for (const char of line) {
					if (char === ' ') width++;
					else if (char === '\t') width += TAB_WIDTH;
					else break;
				}
				if (width < minIndent) minIndent = width;
			}

			if (minIndent === Infinity) minIndent = 0;

			return lines.map(line => {
				let width = 0, i = 0;
				for (; i < line.length; i++) {
					if (width >= minIndent) break;
					const char = line[i];
					if (char === ' ') width++;
					else if (char === '\t') width += TAB_WIDTH;
					else break;
				}
				return ' '.repeat(Math.max(0, width - minIndent)) + line.slice(i);
			}).join('\n');
		}

		function doStaticHighlight(element, customOptions) {
			customOptions ||= {};
			let options = reveal.getConfig().highlighting;
			let aceTheme = customOptions.theme || (element.hasAttribute('data-theme') ? element.getAttribute('data-theme') : options.theme);
			let aceMode = customOptions.language || (element.hasAttribute('data-language') ? element.getAttribute('data-language') : options.language);
			let trim = customOptions.trim !== undefined ? customOptions.trim : (
				element.hasAttribute( 'data-trim' ) || options.trim
			);
			let dedent = element.hasAttribute( 'data-dedent' ) ||  options.dedent;

			if(element.dataset.reserveLines){
				trim = false;
				let reservedLines = parseInt(element.dataset.reserveLines);
				let additionalText = '';
				for(let existingLines = element.textContent.split('\n').length; existingLines < reservedLines; ++existingLines)
					additionalText += '\n';
				element.textContent += additionalText;
			}

			if(dedent)
				element.textContent = dedentString(element.textContent);

			let showGutter =
				element.hasAttribute('data-line-numbers')
				|| (customOptions.showGutter !== undefined ? customOptions.showGutter : options.showGutter);

			let highlight = window.ace && window.ace.require('ace/ext/static_highlight');
			highlight(element, {
				mode: 'ace/mode/' + aceMode,
				theme: 'ace/theme/' + aceTheme,
				startLineNumber: 1,
				showGutter: showGutter,
				fadeFoldWidgets: false,
				showFoldWidgets: false,
				wrap: true, /* indentedSoftWrap: true does not work in static highlight mode */
				showPrintMargin: false,
				maxLines: Infinity,
				trim: trim
			}, function () {
				if(!aceStaticStyle) {
					aceStaticStyle = document.querySelector('style#ace_highlight');
					aceStaticStyle.innerHTML = aceStaticStyle.innerHTML.replace(/\bfont-size:[^;]+;/, '');
				}
			});
		}

		function destroyEditor(editor, changesSaved) {
			editor.container.style.transition = '0.4s ease';
			editor.container.style.opacity = '0';
			setTimeout(function () {
				if(editor.container.parentNode){
					editor.container.parentNode.removeChild(editor.container);
				}
				editor.destroy();
				reveal.aceEditorActive = false;
				if(changesSaved)
					editor.originalCodeElement.dispatchEvent(new Event('codeupdated'));
			}, 400);
		}

		function destroyEditorSavingChanges(editor) {
			let codeElement = editor.originalCodeElement;
			codeElement.textContent = editor.getValue();
			codeElement.setAttribute('data-raw-code', editor.getValue());
			doStaticHighlight(codeElement);
			reveal.layout();
			destroyEditor(editor, true);
		}

		function attachAce(codeElement, customOptions) {
			let aceTheme = 'ace/theme/' + (codeElement.hasAttribute('data-theme') ? codeElement.getAttribute('data-theme') : options.theme);
			let aceMode = 'ace/mode/' + (codeElement.hasAttribute('data-language') ? codeElement.getAttribute('data-language') : options.language);
			let trim = options.trim !== undefined ? options.trim : (
				codeElement.hasAttribute( 'data-trim' ) || options.trim
			);
			let dedent = codeElement.hasAttribute( 'data-dedent' ) ||  options.dedent;

			if(codeElement.dataset.reserveLines){
				trim = false;
				let reservedLines = parseInt(codeElement.dataset.reserveLines);
				let additionalText = '';
				for(let existingLines = codeElement.textContent.split('\n').length; existingLines < reservedLines; ++existingLines)
					additionalText += '\n';
				codeElement.textContent += additionalText;
			}

			if(dedent)
				codeElement.textContent = dedentString(codeElement.textContent);

			if(trim) {
				codeElement.textContent = codeElement.textContent.trim();
			}

			codeElement.setAttribute('data-raw-code', codeElement.textContent);
			doStaticHighlight(codeElement, customOptions);
			setupLineHighlights(codeElement);

			if(codeElement.contentEditable && codeElement.contentEditable !== 'inherit') {
				codeElement.contentEditable = 'false';

				codeElement.onclick = function (event) {
					if(options.mouseclickModifierKey && !event[options.mouseclickModifierKey+'Key']) {
						return;
					}
					let editor = null;
					let editorDiv = document.createElement('div');
					editorDiv.style.position = 'fixed';
					editorDiv.style.opacity = '0';

					let isFullscreen = codeElement.hasAttribute('data-editor-fullscreen') ||
						(!codeElement.hasAttribute('data-editor-in-place') && !options.editorInPlace);

					let codeElementStyle = window.getComputedStyle(codeElement);

					let rect = codeElement.getBoundingClientRect();
					let padding = {};
					for(let s of ['left', 'right', 'top', 'bottom'])
						padding[s] = parseFloat(codeElementStyle.getPropertyValue('padding-'+s))

					let scale = reveal.getScale();

					editorDiv.style.height = isFullscreen ? '100%' : (rect.height - padding.top - padding.bottom) + 'px';
					editorDiv.style.width = isFullscreen ? '100%' : (rect.width - padding.left - padding.right) + 'px';
					editorDiv.style.top = isFullscreen ? '0px' : (rect.top + padding.top) + 'px';
					editorDiv.style.left = isFullscreen ? '0px' : (rect.left + padding.left) + 'px';
					let revealViewport = reveal.getViewportElement();
					editorDiv.style.zIndex = window.getComputedStyle(revealViewport.querySelector('.controls')).zIndex;
					revealViewport.appendChild(editorDiv);

					editor = window.ace.edit(editorDiv);
					editor.commands.removeCommands(["gotoline", "find"]);
					reveal.aceEditorActive = true;

					let sourceCode = codeElement.hasAttribute('data-raw-code') ? codeElement.getAttribute('data-raw-code') : codeElement.textContent;
					editor.setValue(sourceCode);

					editor.setOptions({
						theme: aceTheme,
						mode: aceMode,
						wrap: true,
						indentedSoftWrap: true,
						showGutter: true,
						fadeFoldWidgets: false,
						showFoldWidgets: false,
						showPrintMargin: false,
						highlightActiveLine: true,
						// readOnly: true,
						// highlightActiveLine: false,
						// highlightGutterLine: false,
						fontSize: parseFloat(window.getComputedStyle(codeElement).fontSize) * scale || options.fontSize
					});
					let fontSize = codeElement['data-ace-font-size'] || options.editorDefaultFontSize;
					if(fontSize)
						editor.setOptions({fontSize: fontSize});

					editor.originalCodeElement = codeElement;

					editor.getSession().setOption("indentedSoftWrap", true);

					editor.focus();
					if(options.closeEditorOnBlur)
						editor.on('blur', function(){destroyEditor(editor)});

					reveal.addEventListener('slidechanged', function(){destroyEditor(editor)});
					reveal.addEventListener('overviewshown', function(){destroyEditor(editor)});
					editor.resize();
					editor.gotoLine(1);
					editorDiv.style.transition = '0.5s ease';
					editorDiv.style.opacity = '1';
				}
			}
		}

		reveal.highlightBlockWithAce = attachAce;

		function loadScript(url) {
			return new Promise((resolve) => {
				let script = document.createElement('script');
				script.type = 'text/javascript';
				script.src = url;
				script.onload = resolve;
				document.querySelector('head').appendChild(script);
			});
		}

		// ACE static highlighter depends on ACE core — must load sequentially
		await loadScript(options.aceMainUrl);
		await loadScript(options.aceStaticHighlighterUrl);

		window.ace.config.set('basePath', options.aceBasePath);

		window.ace.require('ace/commands/default_commands').commands.push({
			name: 'Return to slideshow discarding changes',
			bindKey: 'Esc',
			exec: destroyEditor
		});

		window.ace.require('ace/commands/default_commands').commands.push({
			name: 'Return to slideshow saving changes',
			bindKey: 'Ctrl+Enter',
			exec: destroyEditorSavingChanges
		});

		for(let node of reveal.getSlidesElement().querySelectorAll(options.selector))
			attachAce(node);

		for(let scriptEl of reveal.getSlidesElement().querySelectorAll('script[data-highlight]')) {
			let language = options.language;
			let type = scriptEl.getAttribute('type') || '';
			if(type.startsWith('text/'))
				language = type.substring(5);

			let pre = document.createElement('pre');
			let code = document.createElement('code');

			for(let attr of scriptEl.attributes) {
				if(attr.name !== 'type' && attr.name !== 'data-highlight')
					code.setAttribute(attr.name, attr.value);
			}

			if(!code.hasAttribute('data-language'))
				code.setAttribute('data-language', language);

			code.textContent = scriptEl.textContent;
			pre.appendChild(code);
			scriptEl.parentNode.replaceChild(pre, scriptEl);
			attachAce(code);
		}
	}
};
