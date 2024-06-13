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
	init: (reveal) => {
		let aceVersion = '1.35.0';
		let options = reveal.getConfig().highlighting || {};
		options = {
			theme: options.theme || 'twilight',
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
			trim: options.trim !== false
		};
		reveal.getConfig().highlighting = options;

		let aceStaticStyle = null;

		function doStaticHighlight(element, customOptions) {
			customOptions ||= {};
			let options = reveal.getConfig().highlighting;
			let aceTheme = customOptions.theme || (element.hasAttribute('data-theme') ? element.getAttribute('data-theme') : options.theme);
			let aceMode = customOptions.language || (element.hasAttribute('data-language') ? element.getAttribute('data-language') : options.language);
			let trim = customOptions.trim !== undefined ? customOptions.trim : (
				element.hasAttribute( 'data-trim' ) || options.trim
			);
			if(element.dataset.reserveLines){
				trim = false;
				let reservedLines = parseInt(element.dataset.reserveLines);
				let additionalText = '';
				for(let existingLines = element.textContent.split('\n').length; existingLines < reservedLines; ++existingLines)
					additionalText += '\n';
				element.textContent += additionalText;
			}
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
				wrap: true,
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

			codeElement.setAttribute('data-raw-code', codeElement.textContent);
			doStaticHighlight(codeElement, customOptions);

			if(codeElement.contentEditable && codeElement.contentEditable !== 'inherit') {
				codeElement.contentEditable = 'false';

				codeElement.onclick = function (event) {
					if( options.mouseclickModifierKey && !event[options.mouseclickModifierKey+'Key']) {
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
					if(codeElement.hasAttribute( 'data-trim' ))
						sourceCode = sourceCode.trim();

					editor.setValue(sourceCode);

					editor.setOptions({
						theme: aceTheme,
						mode: aceMode,
						wrap: true,
						showGutter: true,
						fadeFoldWidgets: false,
						showFoldWidgets: false,
						showPrintMargin: false,
						highlightActiveLine: true,
						fontSize: parseFloat(window.getComputedStyle(codeElement).fontSize) * scale || options.fontSize
					});
					let fontSize = codeElement['data-ace-font-size'] || options.editorDefaultFontSize;
					if(fontSize)
						editor.setOptions({fontSize: fontSize});

					editor.originalCodeElement = codeElement;
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

		function loadScript( url, callback ) {
			let head = document.querySelector( 'head' );
			let script = document.createElement( 'script' );
			script.type = 'text/javascript';
			script.src = url;

			script.onload = function() {
				callback.call();
				callback = null;
			};

			head.appendChild( script );
		}

		loadScript(options.aceMainUrl, function(){ loadScript(options.aceStaticHighlighterUrl, function(){
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
		})});

		return true;
	}
};