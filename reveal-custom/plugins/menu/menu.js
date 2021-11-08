/*
 * Reveal.js menu plugin
 * MIT licensed
 * (c) Greg Denehy 2015
 */

const RevealMenu = {
	id: 'menu',
	init: (reveal) => {
		let revealViewport = reveal.getViewportElement();
		let config = reveal.getConfig();
		let options = config.menu || {};
		if(!options.path) {
			if (document.currentScript) {
				options.path = document.currentScript.src.slice(0, -7);
			} else {
				let sel = document.querySelector('script[src$="menu.js"]');
				options.path = sel ? sel.src.slice(0, -"menu.js".length) : 'plugin/menu/';
			}
		}
		if (!options.path.endsWith('/')) {
			options.path += '/';
		}

		options.loadIcons = (options.loadIcons !== false);
		options.side = options.side || 'left';	// 'left' or 'right'
		options.numbers = options.numbers || false;
		options.custom = options.custom || false;
		options.titleSelector = options.titleSelector || 'h1, h2, h3, h4, h5';
		options.hideMissingTitles = options.hideMissingTitles || false;
		options.useTextContentForMissingTitles = options.useTextContentForMissingTitles || false;
		options.markers = options.markers !== undefined ? options.markers : true;
		options.themesPath = typeof options.themesPath === 'string' ? options.themesPath : 'css/theme/';
		if (!options.themesPath.endsWith('/')) options.themesPath += '/';
		options.themes = document.querySelector('link#theme') ? options.themes : false;
		if (options.themes === true) {
			options.themes = [
				{ name: 'Black', theme: options.themesPath + 'black.css' },
				{ name: 'White', theme: options.themesPath + 'white.css' },
				{ name: 'League', theme: options.themesPath + 'league.css' },
				{ name: 'Sky', theme: options.themesPath + 'sky.css' },
				{ name: 'Beige', theme: options.themesPath + 'beige.css' },
				{ name: 'Simple', theme: options.themesPath + 'simple.css' },
				{ name: 'Serif', theme: options.themesPath + 'serif.css' },
				{ name: 'Blood', theme: options.themesPath + 'blood.css' },
				{ name: 'Night', theme: options.themesPath + 'night.css' },
				{ name: 'Moon', theme: options.themesPath + 'moon.css' },
				{ name: 'Solarized', theme: options.themesPath + 'solarized.css' }
			];
		} else if (!Array.isArray(options.themes)) {
			options.themes = false;
		}
		options.transitions = options.transitions || false;

		if (options.transitions === true) {
			options.transitions = ['None', 'Fade', 'Slide', 'Convex', 'Concave', 'Zoom'];
		} else if (options.transitions !== false && (!Array.isArray(options.transitions) || !options.transitions.every(function(e) { return typeof e === "string" }))) {
			console.error("reveal.js-menu error: transitions config value must be 'true' or an array of strings, eg ['None', 'Fade', 'Slide')");
			options.transitions = false;
		}

		options.openButton = options.openButton !== undefined ? options.openButton : true;
		options.openSlideNumber = options.openSlideNumber || false;
		options.keyboard = options.keyboard !== undefined ? options.keyboard : true;
		options.autoOpen = options.autoOpen !== undefined ? options.autoOpen : true;
		options.sticky = options.sticky || false;
		options.delayInit = options.delayInit || false;
		options.openOnInit = options.openOnInit || false;


		function createDomNode(tagName, attrs, content) {
			let el = document.createElement(tagName);
			if (attrs)
				for(let attrName of Object.getOwnPropertyNames(attrs)) {
					el.setAttribute(attrName, attrs[attrName]);
				}

			if (content) el.innerHTML = content;
			return el;
		}


		let initialised = false;

		// do not load the menu in the upcoming slide panel in the speaker notes
		if (reveal.isSpeakerNotes() && window.location.search.endsWith('controls=false')) {
			return;
		}

		let mouseSelectionEnabled = true;
		function disableMouseSelection() {
			mouseSelectionEnabled = false;
		}

		function reenableMouseSelection() {
			// wait until the mouse has moved before re-enabling mouse selection
			// to avoid selections on scroll
			revealViewport.querySelector(
				'nav.rmenu'
			).addEventListener('mousemove', function fn() {
				revealViewport.querySelector('nav.rmenu').removeEventListener('mousemove', fn);
				//XXX this should select the item under the mouse
				mouseSelectionEnabled = true;
			});
		}


		function getOffset(el) {
			let x = 0;
			let y = 0;
			while(el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
				x += el.offsetLeft - el.scrollLeft;
				y += el.offsetTop - el.scrollTop;
				el = el.offsetParent;
			}
			return { top: y, left: x };
		}

		function getVisibleOffset(el) {
			let offsetFromTop = getOffset(el).top - el.offsetParent.offsetTop;
			if (offsetFromTop < 0)
				return -offsetFromTop
			let offsetFromBottom = el.offsetParent.offsetHeight - (el.offsetTop - el.offsetParent.scrollTop + el.offsetHeight);
			if (offsetFromBottom < 0)
				return offsetFromBottom;
			return 0;
		}

		function keepVisible(el) {
			let offset = getVisibleOffset(el);
			if (offset) {
				disableMouseSelection();
				el.scrollIntoView(offset > 0);
				reenableMouseSelection();
			}
		}

		// function scrollItemToTop(el) {
		// 	disableMouseSelection();
		// 	el.offsetParent.scrollTop = el.offsetTop;
		// 	reenableMouseSelection();
		// }
		//
		// function scrollItemToBottom(el) {
		// 	disableMouseSelection();
		// 	el.offsetParent.scrollTop = el.offsetTop - el.offsetParent.offsetHeight + el.offsetHeight
		// 	reenableMouseSelection();
		// }

		function deselectAllMenuItems() {
			for(let item of revealViewport.querySelectorAll('.active-menu-panel .rmenu-items li.selected')) {
				item.classList.remove('selected');
			}
		}

		function selectMenuItem(el) {
			deselectAllMenuItems();
			el.classList.add('selected');
			keepVisible(el);
			if (options.autoOpen && options.sticky)
				openMenuItem(el, !options.sticky);
		}

		function getSlideMenuItem(h, v) {
			return revealViewport.querySelector(
				'.active-menu-panel .rmenu-items li[data-slide-h="' + h + '"][data-slide-v="' + v + '"]'
			);
		}

		function getMenuItem(itemIndex) {
			return revealViewport.querySelector(
				'.active-menu-panel .rmenu-items li[data-item-index="' + itemIndex + '"]'
			);
		}

		function forAllNodes(selector, parent, callback) {
			Array.prototype.slice.call((parent || document).querySelectorAll(selector)).forEach(callback);
		}

		function getSelectedMenuItem() {
			return revealViewport.querySelector(
				'.active-menu-panel .rmenu-items li.selected'
			) || revealViewport.querySelector(
				'.active-menu-panel .rmenu-items li.active'
			);
		}
		function onDocumentKeyDown(event) {
			if(config.keyboardCondition === 'focused' && !reveal.isFocused())
				return true;
			let currItem = null;
			let item = null;
			if (isOpen()) {
				event.stopImmediatePropagation();
				switch( event.key ) {
					case 'm':
						// toggleMenu();
						break;
					case 'ArrowLeft':
						prevPanel();
						break;
					case 'ArrowRight':
						nextPanel();
						break;

					case 'ArrowUp':
					case 'ArrowDown':
					case 'PageUp':
					case 'PageDown':
						currItem = getSelectedMenuItem();
						deselectAllMenuItems();

						if (!currItem) {
							currItem = revealViewport.querySelector('.active-menu-panel .rmenu-items li.rmenu-item');
							if (currItem) {
								selectMenuItem(currItem);
							}
							break;
						}

						let nextItem;
						let h = parseInt(currItem.getAttribute('data-slide-h'));
						let v = parseInt(currItem.getAttribute('data-slide-v'));


						if(!isNaN(h) && !isNaN(v)) {
							if(event.key === 'PageUp' || event.key === 'ArrowUp' && event.ctrlKey) {
								if (v > 1) {
									nextItem = getSlideMenuItem(h, 0);
								} else if (h > 1) {
									nextItem = getSlideMenuItem(h - 1, 0);
								}
							}
							else if(event.key === 'PageDown' || event.key === 'ArrowDown' && event.ctrlKey) {
								nextItem = getSlideMenuItem(h + 1, 0);
							}
							else {
								nextItem = getMenuItem(
									parseInt(currItem.getAttribute('data-item-index'))
									+
									((event.key === 'ArrowUp' || event.key === 'PageUp') ? -1 : 1)
								);
							}
						}
						else {
							nextItem = getMenuItem(
								parseInt(currItem.getAttribute('data-item-index'))
								+
								((event.key === 'ArrowUp' || event.key === 'PageUp') ? -1 : 1)
							);
						}
						nextItem  = nextItem || currItem;
						selectMenuItem(nextItem);
						keepVisible(nextItem);
						break;

					case 'Home':
					case 'End':
						deselectAllMenuItems();

						item = revealViewport.querySelector(
							'.active-menu-panel .rmenu-items li:'
							+
							(event.key === 'Home' ? 'first' : 'last')
							+
							'-of-type'
						);

						if (item) {
							item.classList.add('selected');
							keepVisible(item);
						}
						break;

					case ' ': case 'Enter':
						currItem = revealViewport.querySelector('.active-menu-panel .rmenu-items li.selected');
						if (currItem) {
							openMenuItem(currItem, true);
						}
						break;

					case 'Escape': closeMenu(null, true); break;
				}
			}
		}

		if (options.keyboard) {
			reveal.addKeyBinding( { keyCode: 77, key: 'M', description: 'Toggle menu' }, function() {
				toggleMenu();
			} );

			document.addEventListener('keydown', onDocumentKeyDown, false);

			// handle key presses within speaker notes
			window.addEventListener( 'message', function( event ) {
				let data;
				try {
					data = JSON.parse( event.data );
				} catch (e) {
				}
				if (data && data.method === 'triggerKey') {
					onDocumentKeyDown( { keyCode: data.args[0], stopImmediatePropagation: function() {} } );
				}
			});

			// // Prevent reveal from processing keyboard events when the menu is open
			// if (config.keyboardCondition && typeof config.keyboardCondition === 'function') {
			// 	// combine user defined keyboard condition with the menu's own condition
			// 	let userCondition = config.keyboardCondition;
			// 	config.keyboardCondition = function() {
			// 		return userCondition() && !isOpen();
			// 	};
			// } else {
			// 	config.keyboardCondition = function() { return !isOpen(); }
			// }
		}


		//
		// Utility functions
		//

		function openMenu(event) {
			if (event) event.preventDefault();
			if (isOpen()) {
				return;
			}
			revealViewport.classList.add('rmenu-active');
			revealViewport.classList.add('has-' + options.effect + '-' + options.side);
			revealViewport.querySelector('.rmenu').classList.add('active');
			revealViewport.querySelector('.rmenu-overlay').classList.add('active');

			// identify active theme
			if (options.themes) {
				for(let i of revealViewport.querySelectorAll('div[data-panel="Themes"] li')) {
					i.classList.remove('active')
				}
				let currentThemeLink = document.querySelector('link#theme').getAttribute('href');
				for(let i of revealViewport.querySelectorAll('li[data-theme="' + currentThemeLink + '"]')) {
					i.classList.add('active')
				}
			}

			// identify active transition
			if (options.transitions) {
				forAllNodes('div[data-panel="Transitions"] li', null, function(i) {
					i.classList.remove('active')
				});
				forAllNodes('li[data-transition="' + reveal.getConfig().transition + '"]', null, function(i) {
					i.classList.add('active')
				});
			}

			// set item selections to match active items
			forAllNodes('.rmenu-panel li.active', null, function(i) {
				i.classList.add('selected');
				keepVisible(i);
			});
		}

		function closeMenu(event, force) {
			if (event) event.preventDefault();
			if (!options.sticky || force) {
				revealViewport.classList.remove('rmenu-active');
				revealViewport.classList.remove('has-' + options.effect + '-' + options.side);
				revealViewport.querySelector('.rmenu').classList.remove('active');
				revealViewport.querySelector('.rmenu-overlay').classList.remove('active');
				deselectAllMenuItems();
			}
		}

		function toggleMenu(event) {
			if (isOpen()) {
				closeMenu(event, true);
			} else {
				openMenu(event);
			}
		}

		function isOpen() {
			return revealViewport.classList.contains('rmenu-active');
		}

		function openPanel(event, ref) {
			openMenu(event);
			let panel = ref;
			if (typeof ref !== "string") {
				panel = event.currentTarget.getAttribute('data-panel');
			}
			revealViewport.querySelector('.rmenu-toolbar > li.active-toolbar-button').classList.remove('active-toolbar-button');
			revealViewport.querySelector('li[data-panel="' + panel + '"]').classList.add('active-toolbar-button');
			revealViewport.querySelector('.rmenu-panel.active-menu-panel').classList.remove('active-menu-panel');
			revealViewport.querySelector('div[data-panel="' + panel + '"]').classList.add('active-menu-panel');
		}

		function nextPanel() {
			let next = (parseInt(revealViewport.querySelector('.active-toolbar-button').getAttribute('data-button')) + 1) % nButtonsTotal;
			openPanel(null, revealViewport.querySelector('.toolbar-panel-button[data-button="' + next + '"]').getAttribute('data-panel'));
		}

		function prevPanel() {
			let next = parseInt(revealViewport.querySelector('.active-toolbar-button').getAttribute('data-button')) - 1;
			if (next < 0) {
				next = nButtonsTotal - 1;
			}
			openPanel(null, revealViewport.querySelector('.toolbar-panel-button[data-button="' + next + '"]').getAttribute('data-panel'));
		}

		function openMenuItem(item, force) {
			let h = parseInt(item.getAttribute('data-slide-h'));
			let v = parseInt(item.getAttribute('data-slide-v'));
			let theme = item.getAttribute('data-theme');
			let transition = item.getAttribute('data-transition');
			if (!isNaN(h) && !isNaN(v)) {
				reveal.slide(h, v);
				closeMenu();
			} else if (theme) {
				// take note of the previous theme and remove it, then create a new stylesheet reference and insert it
				// this is required to force a load event so we can change the menu style to match the new style
				let stylesheet = document.querySelector('link#theme');
				let parent = stylesheet.parentElement;
				let sibling = stylesheet.nextElementSibling;
				stylesheet.remove();

				let newStylesheet = stylesheet.cloneNode();
				newStylesheet.setAttribute('href', theme);
				newStylesheet.onload = function() { matchRevealStyle() };
				parent.insertBefore(newStylesheet, sibling);

				closeMenu();
				reveal.layout();
			} else if (transition) {
				reveal.configure({ transition: transition });
				closeMenu();
			} else {
				let link = item.querySelector('a');
				if (link) {
					if (force || !options.sticky || (options.autoOpen && link.href.startsWith('#') || link.href.startsWith(window.location.origin + window.location.pathname + '#'))) {
						link.click();
					}
				}
				closeMenu();
			}
		}

		function clicked(event) {
			if (event.target.nodeName !== "A") {
				event.preventDefault();
			}
			openMenuItem(event.currentTarget);
		}

		function highlightCurrentSlide() {
			let state = reveal.getState();
			forAllNodes('li.rmenu-item, li.rmenu-item-vertical', null, function(item) {
				item.classList.remove('past');
				item.classList.remove('active');
				item.classList.remove('future');

				let h = parseInt(item.getAttribute('data-slide-h'));
				let v = parseInt(item.getAttribute('data-slide-v'));
				if (h < state.indexh || (h === state.indexh && v < state.indexv)) {
					item.classList.add('past');
				}
				else if (h === state.indexh && v === state.indexv) {
					item.classList.add('active');
				}
				else {
					item.classList.add('future');
				}
			});
		}

		function matchRevealStyle() {
			let revealStyle = window.getComputedStyle(reveal.getRevealElement());
			let element = revealViewport.querySelector('.rmenu');
			element.style.fontFamily = revealStyle.fontFamily;
			//XXX could adjust the complete menu style to match the theme, ie colors, etc
		}

		let nButtonsTotal = 0;
		function init() {
			if (!initialised) {
				let parent = reveal.getViewportElement();
				let top = createDomNode('div', { 'class': 'rmenu-wrapper'});
				parent.appendChild(top);
				let panels = createDomNode('nav', { 'class': 'rmenu rmenu--' + options.side});
				if (typeof options.width === 'string') {
					if (['normal', 'wide', 'third', 'half', 'full'].indexOf(options.width) !== -1) {
						panels.classList.add('rmenu--' + options.width);
					}
					else {
						panels.classList.add('rmenu--custom');
						panels.style.width = options.width;
					}
				}
				top.appendChild(panels);
				matchRevealStyle();
				let overlay = createDomNode('div', { 'class': 'rmenu-overlay'});
				top.appendChild(overlay);
				overlay.onclick = function() { closeMenu(null, true) };

				let toolbar = createDomNode('ol', {'class': 'rmenu-toolbar'});
				revealViewport.querySelector('.rmenu').appendChild(toolbar);

				function addToolbarButton(title, ref, icon, style, fn, active) {
					let attrs = {
						'data-button': '' + (nButtonsTotal++),
						'class': 'toolbar-panel-button' + (active ? ' active-toolbar-button' : '')
					};
					if (ref) {
						attrs['data-panel'] = ref;
					}
					let button = createDomNode('li', attrs);

					if (icon.startsWith('fa-')) {
						button.appendChild(createDomNode('i', {'class': style + ' ' + icon}));
					} else {
						button.innerHTML = icon + '</i>';
					}
					button.appendChild(createDomNode('br'), button.querySelector('i'));
					button.appendChild(createDomNode('span', {'class': 'rmenu-toolbar-label'}, title), button.querySelector('i'));
					button.onclick = fn;
					toolbar.appendChild(button);
					return button;
				}

				addToolbarButton('Slides', 'Slides', 'fa-images', 'fas', openPanel, true);

				if (options.custom) {
					options.custom.forEach(function(element, index) {
						addToolbarButton(element.title, 'Custom' + index, element.icon, null, openPanel);
					});
				}

				if (options.themes) {
					addToolbarButton('Themes', 'Themes', 'fa-adjust', 'fas', openPanel);
				}
				if (options.transitions) {
					addToolbarButton('Transitions', 'Transitions', 'fa-sticky-note', 'fas', openPanel);
				}
				let button = createDomNode('li', {id: 'close', 'class': 'toolbar-panel-button'});
				button.appendChild(createDomNode('i', {'class': 'fas fa-times'}));
				button.appendChild(createDomNode('br'));
				button.appendChild(createDomNode('span', {'class': 'rmenu-toolbar-label'}, 'Close'));
				button.onclick = function() { closeMenu(null, true) };
				toolbar.appendChild(button);

				//
				// Slide links
				//
				function generateSlideLinkMenuItem(type, section, i, h, v) {
					function text(selector, parent) {
						let el = (parent ? section.querySelector(selector) : revealViewport.querySelector(selector));
						if (el) return el.textContent;
						return null;
					}
					let title = section.getAttribute('data-menu-title') ||
						text('.menu-title', section) ||
						text(options.titleSelector, section);

					if (!title && options.useTextContentForMissingTitles) {
						// attempt to figure out a title based on the text in the slide
						title = section.textContent.trim();
						if (title) {
							title = title.split('\n')
								.map(function(t) { return t.trim() }).join(' ').trim()
								.replace(/^(.{16}[^\s]*).*/, "$1") // limit to 16 chars plus any consecutive non-whitespace chars (to avoid breaking words)
								.replace(/&/g, "&amp;")
								.replace(/</g, "&lt;")
								.replace(/>/g, "&gt;")
								.replace(/"/g, "&quot;")
								.replace(/'/g, "&#039;") + '...';
						}
					}

					if (!title) {
						if (options.hideMissingTitles) return '';
						type += ' no-title';
						title = "Slide " + i;
					}

					let item = createDomNode('li', {
						class: type,
						'data-item-index': i,
						'data-slide-h': h,
						'data-slide-v': (v === undefined ? 0 : v)
					});

					if (options.markers) {
						item.appendChild(createDomNode('i', {class: 'fas fa-check-circle fa-fw past'}));
						item.appendChild(createDomNode('i', {class: 'fas fa-arrow-alt-circle-right fa-fw active'}));
						item.appendChild(createDomNode('i', {class: 'far fa-circle fa-fw future'}));
					}

					if (options.numbers) {
						// Number formatting taken from reveal.js
						let value = [];
						let format = 'h.v';

						// Check if a custom number format is available
						if( typeof options.numbers === 'string' ) {
							format = options.numbers;
						}
						else if (typeof config.slideNumber === 'string') {
							// Take user defined number format for slides
							format = config.slideNumber;
						}

						switch( format ) {
							case 'c':
								value.push( i );
								break;
							case 'c/t':
								value.push( i, '/', reveal.getTotalSlides() );
								break;
							case 'h/v':
								value.push( h + 1 );
								if( typeof v === 'number' && !isNaN( v ) ) value.push( '/', v + 1 );
								break;
							default:
								value.push( h + 1 );
								if( typeof v === 'number' && !isNaN( v ) ) value.push( '.', v + 1 );
						}

						item.appendChild(createDomNode('span', {class: 'rmenu-item-number'}, value.join('') + '. '));
					}

					item.appendChild(createDomNode('span', {class: 'rmenu-item-title'}, title));

					return item;
				}

				function createSlideMenu() {
					if ( !revealViewport.querySelector('section[data-markdown]:not([data-markdown-parsed])') ) {
						let panel = createDomNode('div', {
							'data-panel': 'Slides',
							'class': 'rmenu-panel active-menu-panel'
						});
						panel.appendChild(createDomNode('ul', {class: "rmenu-items"}));
						panels.appendChild(panel);
						let items = revealViewport.querySelector('.rmenu-panel[data-panel="Slides"] > .rmenu-items');
						let slideCount = 0;
						forAllNodes('.slides > section', null, function(section, h) {
							if (section.querySelector('section')) {
								forAllNodes('section', section,function(subsection, v) {
									let type = (v === 0 ? 'rmenu-item' : 'rmenu-item-vertical');
									let item = generateSlideLinkMenuItem(type, subsection, slideCount, h, v);
									if (item) {
										slideCount++;
										items.appendChild(item);
									}
								});
							} else {
								let item = generateSlideLinkMenuItem('rmenu-item', section, slideCount, h);
								if (item) {
									slideCount++;
									items.appendChild(item);
								}
							}
						});
						for(let i of revealViewport.querySelectorAll('.rmenu-item, .rmenu-item-vertical')) {
							i.onclick = clicked;
						}
						highlightCurrentSlide();
					}
					else {
						// wait for markdown to be loaded and parsed
						setTimeout( createSlideMenu, 100 );
					}
				}

				createSlideMenu();
				reveal.addEventListener('slidechanged', highlightCurrentSlide);

				//
				// Custom menu panels
				//
				if (options.custom) {
					function xhrSuccess () {
						if (this.status >= 200 && this.status < 300) {
							this.panel.innerHTML = this.responseText;
							enableCustomLinks(this.panel);
						}
						else {
							showErrorMsg(this)
						}
					}
					function xhrError () {
						showErrorMsg(this)
					}
					function loadCustomPanelContent (panel, sURL) {
						let oReq = new XMLHttpRequest();
						oReq.panel = panel;
						oReq.arguments = Array.prototype.slice.call(arguments, 2);
						oReq.onload = xhrSuccess;
						oReq.onerror = xhrError;
						oReq.open("get", sURL, true);
						oReq.send(null);
					}
					function enableCustomLinks(panel) {
						forAllNodes('ul.rmenu-items li.rmenu-item', panel, function(item, i) {
							item.setAttribute('data-item-index', i+1);
							item.onclick = clicked;
							item.addEventListener("mouseenter", handleMouseHighlight);
						});
					}

					function showErrorMsg(response) {
						response.panel.innerHTML =  '<p>ERROR: The attempt to fetch ' + response.responseURL + ' failed with HTTP status ' +
							response.status + ' (' + response.statusText + ').</p>' +
							'<p>Remember that you need to serve the presentation HTML from a HTTP server.</p>';
					}

					options.custom.forEach(function(element, index) {
						let panel = createDomNode('div', {
							'data-panel': 'Custom' + index,
							class: 'rmenu-panel rmenu-custom-panel'
						});
						if (element.content) {
							panel.innerHTML = element.content;
							enableCustomLinks(panel);
						}
						else if (element.src) {
							loadCustomPanelContent(panel, element.src);
						}
						panels.appendChild(panel);
					})
				}

				//
				// Themes
				//
				if (options.themes) {
					let panel = createDomNode('div', {
						class: 'rmenu-panel',
						'data-panel': 'Themes'
					});
					panels.appendChild(panel);
					let menu = createDomNode('ul', {class: 'rmenu-items'});
					panel.appendChild(menu);
					options.themes.forEach(function(t, i) {
						let item = createDomNode('li', {
							class: 'rmenu-item',
							'data-theme': t.theme,
							'data-item-index': ''+(i+1)
						}, t.name);
						menu.appendChild(item);
						item.onclick = clicked;
					})
				}

				//
				// Transitions
				//
				if (options.transitions) {
					let panel = createDomNode('div', {
						class: 'rmenu-panel',
						'data-panel': 'Transitions'
					});
					panels.appendChild(panel);
					let menu = createDomNode('ul', {class: 'rmenu-items'});
					panel.appendChild(menu);
					options.transitions.forEach(function(name, i) {
						let item = createDomNode('li', {
							class: 'rmenu-item',
							'data-transition': name.toLowerCase(),
							'data-item-index': ''+(i+1)
						}, name);
						menu.appendChild(item);
						item.onclick = clicked;
					})
				}

				//
				// Open menu options
				//
				if (options.openButton) {
					// add menu button
					let div = createDomNode('div', {class: 'rmenu-button'});
					let link = createDomNode('a', {href: '#'});
					link.appendChild(createDomNode('i', {class: 'fas fa-bars'}));
					div.appendChild(link);
					revealViewport.appendChild(div);
					div.onclick = openMenu;
				}

				if (options.openSlideNumber && revealViewport.querySelector('div.slide-number')) {
					// wrap slide number in link
					revealViewport.querySelector('div.slide-number').onclick = openMenu;
				}

				//
				// Handle mouse overs
				//
				for(let item of revealViewport.querySelectorAll('.rmenu-panel .rmenu-items li')){
					item.addEventListener("mouseenter", handleMouseHighlight);
				}

				function handleMouseHighlight(event) {
					if (mouseSelectionEnabled) {
						selectMenuItem(event.currentTarget);
					}
				}
			}
			if (options.openOnInit) {
				openMenu();
			}
			initialised = true;
		}


		if (!options.delayInit) {
			init();
		}

		/**
		 * Dispatches an event of the specified type from the
		 * reveal DOM element.
		 */
		function dispatchEvent( type, args ) {
			let event = document.createEvent( 'HTMLEvents');
			event.initEvent( type, true, true );
			Object.assign( event, args );
			revealViewport.dispatchEvent( event );

			// If we're in an iframe, post each reveal.js event to the
			// parent window. Used by the notes plugin
			if( config.postMessageEvents && window.parent !== window.self ) {
				window.parent.postMessage( JSON.stringify({ namespace: 'reveal', eventName: type, state: reveal.getState() }), '*' );
			}
		}

		dispatchEvent('menu-ready');
	}
};

// export default () => RevealMenu;