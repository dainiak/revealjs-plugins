/*
    Reveal.js alternative highlighting plugin based on ACE editor
    Author: Alex Dainiak
    Web: www.dainiak.com
    Email: dainiak@gmail.com
 */

const RevealHighlightAce = {
	id: 'highlight-ace',
	init: (reveal) => {
		let options = reveal.getConfig().highlighting || {};
		options = {
			theme: options.theme || 'twilight',
			language: options.language || 'python',
			aceMainUrl: options.aceMainUrl || 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/ace.min.js',
			aceBasePath: options.aceBasePath || 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/',
			aceStaticHighlighterUrl: options.aceStaticHighlighterUrl || 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/ext-static_highlight.min.js',
			editorInPlace: options.editorInPlace !== false,
			closeEditorOnBlur: options.closeEditorOnBlur,
			mouseclickModifierKey: options.mouseclickModifierKey,
			editorDefaultFontSize: options.editorDefaultFontSize,
			selector: options.selector || 'pre code',
		};


		function attachAce(codeElement) {
			let aceTheme = 'ace/theme/' + (codeElement.hasAttribute('data-theme') ? codeElement.getAttribute('data-theme') : options.theme);
			let aceMode = 'ace/mode/' + (codeElement.hasAttribute('data-language') ? codeElement.getAttribute('data-language') : options.language);
			let highlight = ace.require('ace/ext/static_highlight');
			let aceStaticStyle = null;

			function doStaticHighlight(element) {
				highlight(element, {
					mode: aceMode,
					theme: aceTheme,
					startLineNumber: 1,
					showGutter: true,
					showPrintMargin: false,
					maxLines: Infinity,
					trim: element.hasAttribute( 'data-trim' )
				}, function () {
					if(!aceStaticStyle) {
						aceStaticStyle = document.querySelector('style#ace_highlight');
						aceStaticStyle.innerHTML = aceStaticStyle.innerHTML.replace(/\bfont-size:[^;]+;/, '');
					}
				});
			}

			function destroyEditor(editor) {
				editor.container.style.transition = '0.4s ease';
				editor.container.style.opacity = '0';
				setTimeout(function () {
					if(editor.container.parentNode){
						editor.container.parentNode.removeChild(editor.container);
					}
					editor.destroy();
				}, 400);
			}
			function destroyEditorSavingChanges(editor) {
				editor.originalCodeElement.textContent = editor.getValue();
				editor.originalCodeElement.setAttribute('data-raw-code', editor.getValue());
				doStaticHighlight(editor.originalCodeElement);
				reveal.layout();
				destroyEditor(editor);
			}

			ace.require('ace/commands/default_commands').commands.push({
				name: 'Return to slideshow discarding changes',
				bindKey: 'Esc',
				exec: destroyEditor
			});
			ace.require('ace/commands/default_commands').commands.push({
				name: 'Return to slideshow saving changes',
				bindKey: 'Ctrl+Enter',
				exec: destroyEditorSavingChanges
			});

			codeElement.setAttribute('data-raw-code', codeElement.textContent);
			doStaticHighlight(codeElement);

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

					if(codeElement.hasAttribute('data-editor-inplace') || options.editorInPlace) {
						let rect = codeElement.getBoundingClientRect();
						editorDiv.style.height = rect.height + 'px';
						editorDiv.style.width = rect.width + 'px';
						editorDiv.style.top = rect.top + 'px';
						editorDiv.style.left = rect.left + 'px';
					}
					else {
						editorDiv.style.width = '100%';
						editorDiv.style.height = '100%';
						editorDiv.style.left = '0px';
						editorDiv.style.top = '0px';
					}

					editorDiv.style.zIndex = window.getComputedStyle(document.querySelector('.controls')).zIndex;
					document.body.appendChild(editorDiv);

					editor = ace.edit(editorDiv);
					editor.commands.removeCommands(["gotoline", "find"]);

					editor.isInPlace = codeElement.hasAttribute('data-editor-inplace') || options.editorInPlace;
					editor.$blockScrolling = Infinity; // To disable annoying ACE warning
					let value = codeElement.hasAttribute('data-raw-code') ? codeElement.getAttribute('data-raw-code') : codeElement.textContent;
					if (codeElement.hasAttribute( 'data-trim' )) {
						value = value.trim();
					}
					editor.setValue(value);
					editor.setOptions({
						theme: aceTheme,
						mode: aceMode,
						wrap: true,
						showGutter: true,
						fadeFoldWidgets: false,
						showPrintMargin: false,
						highlightActiveLine: true
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
			ace.config.set('basePath', options.aceBasePath);

			for(let node of document.querySelectorAll(options.selector))
				attachAce(node);
		})});

		return true;
	}
};