/**
 * Reveal.js menu plugin
 * MIT licensed
 * (c) Greg Denehy 2020
 * Modernized & Refactored by Alex Dainiak, 2026
 */

const RevealMenu = (() => {
    'use strict';

    const Plugin = {
        id: 'menu',

        init: (deck) => {
            let config = deck.getConfig();
            let options = config.menu || {};

            // DOM & Utility Helpers
            const select = (selector, el = document) => el.querySelector(selector);
            const selectAll = (selector, el = document) => Array.from(el.querySelectorAll(selector));
            const create = (tagName, attrs, content) => {
                const el = document.createElement(tagName);
                if (attrs) {
                    Object.keys(attrs).forEach(key => el.setAttribute(key, attrs[key]));
                }
                if (content) el.innerHTML = content;
                return el;
            };

            // Configuration Init
            const scriptPath = () => {
                const script = document.currentScript || document.querySelector('script[src$="menu.js"]');
                if (script) {
                    return script.src.slice(0, script.src.lastIndexOf('/') + 1);
                }
                return 'plugin/menu/';
            };

            options.path = options.path || scriptPath();
            if (!options.path.endsWith('/')) options.path += '/';

            const defaults = {
                side: 'left',
                numbers: false,
                titleSelector: 'h1, h2, h3, h4, h5',
                hideMissingTitles: false,
                useTextContentForMissingTitles: false,
                markers: true,
                themesPath: 'dist/theme/',
                themes: false, // Explicitly set themes or false
                transitions: false,
                openButton: true,
                openSlideNumber: false,
                keyboard: true,
                sticky: false,
                autoOpen: true,
                delayInit: false,
                openOnInit: false,
                loadIcons: true,
                custom: []
            };

            // Merge defaults
            options = {...defaults, ...options};
            if (!options.themesPath.endsWith('/')) options.themesPath += '/';

            if (options.themes === true) {
                options.themes = [
                    {name: 'Black', theme: options.themesPath + 'black.css'},
                    {name: 'White', theme: options.themesPath + 'white.css'},
                    {name: 'League', theme: options.themesPath + 'league.css'},
                    {name: 'Sky', theme: options.themesPath + 'sky.css'},
                    {name: 'Beige', theme: options.themesPath + 'beige.css'},
                    {name: 'Simple', theme: options.themesPath + 'simple.css'},
                    {name: 'Serif', theme: options.themesPath + 'serif.css'},
                    {name: 'Blood', theme: options.themesPath + 'blood.css'},
                    {name: 'Night', theme: options.themesPath + 'night.css'},
                    {name: 'Moon', theme: options.themesPath + 'moon.css'},
                    {name: 'Solarized', theme: options.themesPath + 'solarized.css'}
                ];
            }

            if (options.transitions === true) {
                options.transitions = ['None', 'Fade', 'Slide', 'Convex', 'Concave', 'Zoom'];
            }

            // State
            let initialised = false;
            let mouseSelectionEnabled = true;
            let buttons = 0;

            // --- Core Functions ---

            const loadResource = (url, type, callback) => {
                const head = document.querySelector('head');
                let resource;

                if (type === 'script') {
                    resource = document.createElement('script');
                    resource.type = 'text/javascript';
                    resource.src = url;
                } else if (type === 'stylesheet') {
                    resource = document.createElement('link');
                    resource.rel = 'stylesheet';
                    resource.href = url;
                }

                const finish = () => {
                    if (typeof callback === 'function') {
                        callback.call();
                        callback = null;
                    }
                };

                resource.onload = finish;
                head.appendChild(resource);
            };

            const disableMouseSelection = () => {
                mouseSelectionEnabled = false;
            };

            const reenableMouseSelection = () => {
                const menu = select('nav.slide-menu');
                menu.addEventListener('mousemove', function fn() {
                    menu.removeEventListener('mousemove', fn);
                    mouseSelectionEnabled = true;
                });
            };

            // Scroll & Visibility
            const getOffset = (el) => {
                let _x = 0;
                let _y = 0;
                while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
                    _x += el.offsetLeft - el.scrollLeft;
                    _y += el.offsetTop - el.scrollTop;
                    el = el.offsetParent;
                }
                return {top: _y, left: _x};
            };

            const visibleOffset = (el) => {
                const offsetFromTop = getOffset(el).top - el.offsetParent.offsetTop;
                if (offsetFromTop < 0) return -offsetFromTop;
                const offsetFromBottom = el.offsetParent.offsetHeight - (el.offsetTop - el.offsetParent.scrollTop + el.offsetHeight);
                if (offsetFromBottom < 0) return offsetFromBottom;
                return 0;
            };

            const keepVisible = (el) => {
                const offset = visibleOffset(el);
                if (offset) {
                    disableMouseSelection();
                    el.scrollIntoView(offset > 0);
                    reenableMouseSelection();
                }
            };

            // Selection & Interaction
            const selectItem = (el) => {
                el.classList.add('selected');
                keepVisible(el);
                if (options.sticky && options.autoOpen) openItem(el);
            };

            const openItem = (item, force) => {
                const h = parseInt(item.getAttribute('data-slide-h'));
                const v = parseInt(item.getAttribute('data-slide-v'));
                const theme = item.getAttribute('data-theme');
                const highlightTheme = item.getAttribute('data-highlight-theme');
                const transition = item.getAttribute('data-transition');

                if (!isNaN(h) && !isNaN(v)) {
                    deck.slide(h, v);
                }

                if (theme) changeStylesheet('theme', theme);
                if (highlightTheme) changeStylesheet('highlight-theme', highlightTheme);
                if (transition) deck.configure({transition});

                const link = select('a', item);
                if (link) {
                    if (
                        force ||
                        !options.sticky ||
                        (options.autoOpen && link.href.startsWith('#')) ||
                        link.href.startsWith(window.location.origin + window.location.pathname + '#')
                    ) {
                        link.click();
                    }
                }
                closeMenu();
            };

            const clicked = (event) => {
                if (event.target.nodeName !== 'A') {
                    event.preventDefault();
                }
                openItem(event.currentTarget);
            };

            const highlightCurrentSlide = () => {
                const state = deck.getState();
                selectAll('li.slide-menu-item, li.slide-menu-item-vertical').forEach((item) => {
                    item.classList.remove('past', 'active', 'future');

                    const h = parseInt(item.getAttribute('data-slide-h'));
                    const v = parseInt(item.getAttribute('data-slide-v'));

                    if (h < state.indexh || (h === state.indexh && v < state.indexv)) {
                        item.classList.add('past');
                    } else if (h === state.indexh && v === state.indexv) {
                        item.classList.add('active');
                    } else {
                        item.classList.add('future');
                    }
                });
            };

            const matchRevealStyle = () => {
                const revealStyle = window.getComputedStyle(select('.reveal'));
                const element = select('.slide-menu');
                if (element) element.style.fontFamily = revealStyle.fontFamily;
            };

            const changeStylesheet = (id, href) => {
                const stylesheet = select('link#' + id);
                const parent = stylesheet.parentElement;
                const sibling = stylesheet.nextElementSibling;
                stylesheet.remove();

                const newStylesheet = stylesheet.cloneNode();
                newStylesheet.setAttribute('href', href);
                newStylesheet.onload = () => matchRevealStyle();
                parent.insertBefore(newStylesheet, sibling);
            };

            // --- Menu UI Management ---

            const openMenu = (event) => {
                if (event) event.preventDefault();
                if (!isOpen()) {
                    select('body').classList.add('slide-menu-active');
                    select('.reveal').classList.add('has-' + options.effect + '-' + options.side);
                    select('.slide-menu').classList.add('active');
                    select('.slide-menu-overlay').classList.add('active');

                    // Active Theme
                    if (options.themes) {
                        selectAll('div[data-panel="Themes"] li').forEach(i => i.classList.remove('active'));
                        selectAll('li[data-theme="' + select('link#theme').getAttribute('href') + '"]').forEach(i => i.classList.add('active'));
                    }

                    // Active Transition
                    if (options.transitions) {
                        selectAll('div[data-panel="Transitions"] li').forEach(i => i.classList.remove('active'));
                        selectAll('li[data-transition="' + config.transition + '"]').forEach(i => i.classList.add('active'));
                    }

                    // Sync Selection
                    const items = selectAll('.slide-menu-panel li.active');
                    items.forEach(i => {
                        i.classList.add('selected');
                        keepVisible(i);
                    });
                }
            };

            const closeMenu = (event, force) => {
                if (event) event.preventDefault();
                if (!options.sticky || force) {
                    select('body').classList.remove('slide-menu-active');
                    select('.reveal').classList.remove('has-' + options.effect + '-' + options.side);
                    select('.slide-menu').classList.remove('active');
                    select('.slide-menu-overlay').classList.remove('active');
                    selectAll('.slide-menu-panel li.selected').forEach(i => i.classList.remove('selected'));
                }
            };

            const toggleMenu = (event) => {
                if (isOpen()) closeMenu(event, true);
                else openMenu(event);
            };

            const isOpen = () => select('body').classList.contains('slide-menu-active');

            const openPanel = (event, ref) => {
                openMenu(event);
                let panel = ref;
                if (typeof ref !== 'string') {
                    panel = event.currentTarget.getAttribute('data-panel');
                }

                const activeBtn = select('.slide-menu-toolbar > li.active-toolbar-button');
                if (activeBtn) activeBtn.classList.remove('active-toolbar-button');

                select('li[data-panel="' + panel + '"]').classList.add('active-toolbar-button');

                const activePanel = select('.slide-menu-panel.active-menu-panel');
                if (activePanel) activePanel.classList.remove('active-menu-panel');

                select('div[data-panel="' + panel + '"]').classList.add('active-menu-panel');
            };

            const nextPanel = () => {
                const currentId = parseInt(select('.active-toolbar-button').getAttribute('data-button'));
                const next = (currentId + 1) % buttons;
                openPanel(null, select('.toolbar-panel-button[data-button="' + next + '"]').getAttribute('data-panel'));
            };

            const prevPanel = () => {
                const currentId = parseInt(select('.active-toolbar-button').getAttribute('data-button'));
                let next = currentId - 1;
                if (next < 0) next = buttons - 1;
                openPanel(null, select('.toolbar-panel-button[data-button="' + next + '"]').getAttribute('data-panel'));
            };

            // --- Initialization ---

            const initMenu = () => {
                if (initialised) return;

                const parent = select('.reveal').parentElement;
                const top = create('div', {class: 'slide-menu-wrapper'});
                parent.appendChild(top);

                const panels = create('nav', {class: 'slide-menu slide-menu--' + options.side});
                if (typeof options.width === 'string') {
                    if (['normal', 'wide', 'third', 'half', 'full'].includes(options.width)) {
                        panels.classList.add('slide-menu--' + options.width);
                    } else {
                        panels.classList.add('slide-menu--custom');
                        panels.style.width = options.width;
                    }
                }
                top.appendChild(panels);
                matchRevealStyle();

                const overlay = create('div', {class: 'slide-menu-overlay'});
                top.appendChild(overlay);
                overlay.onclick = () => closeMenu(null, true);

                const toolbar = create('ol', {class: 'slide-menu-toolbar'});
                select('.slide-menu').appendChild(toolbar);

                const addToolbarButton = (title, ref, icon, style, fn, active) => {
                    const attrs = {
                        'data-button': '' + buttons++,
                        class: 'toolbar-panel-button' + (active ? ' active-toolbar-button' : '')
                    };
                    if (ref) attrs['data-panel'] = ref;

                    const button = create('li', attrs);
                    const iconEl = icon.startsWith('fa-') ? create('i', {class: style + ' ' + icon}) : create('i', {}, icon);

                    button.appendChild(iconEl);
                    button.appendChild(create('br'));
                    button.appendChild(create('span', {class: 'slide-menu-toolbar-label'}, title));
                    button.onclick = fn;
                    toolbar.appendChild(button);
                    return button;
                };

                addToolbarButton('Slides', 'Slides', 'fa-images', 'fas', openPanel, true);

                if (options.custom) {
                    options.custom.forEach((element, index) => {
                        addToolbarButton(element.title, 'Custom' + index, element.icon, null, openPanel);
                    });
                }

                if (options.themes) addToolbarButton('Themes', 'Themes', 'fa-adjust', 'fas', openPanel);
                if (options.transitions) addToolbarButton('Transitions', 'Transitions', 'fa-sticky-note', 'fas', openPanel);

                // Close Button
                const closeBtn = create('li', {id: 'close', class: 'toolbar-panel-button'});
                closeBtn.appendChild(create('i', {class: 'fas fa-times'}));
                closeBtn.appendChild(create('br'));
                closeBtn.appendChild(create('span', {class: 'slide-menu-toolbar-label'}, 'Close'));
                closeBtn.onclick = () => closeMenu(null, true);
                toolbar.appendChild(closeBtn);

                // --- Slide Links Generator ---
                const generateItem = (type, section, i, h, v) => {
                    let link = '/#/' + h;
                    if (typeof v === 'number' && !isNaN(v)) link += '/' + v;

                    const text = (selector, parent) => {
                        if (selector === '') return null;
                        const el = parent ? select(selector, section) : select(selector);
                        return el ? el.textContent : null;
                    };

                    let title = section.getAttribute('data-menu-title') ||
                        text('.menu-title', section) ||
                        text(options.titleSelector, section);

                    if (!title && options.useTextContentForMissingTitles) {
                        title = section.textContent.trim();
                        if (title) {
                            title = title.split('\n')
                                .map(t => t.trim())
                                .join(' ')
                                .trim()
                                .replace(/^(.{16}[^\s]*).*/, '$1')
                                .replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;')
                                .replace(/"/g, '&quot;')
                                .replace(/'/g, '&#039;') + '...';
                        }
                    }

                    if (!title) {
                        if (options.hideMissingTitles) return null;
                        type += ' no-title';
                        title = 'Slide ' + (i + 1);
                    }

                    const item = create('li', {
                        class: type,
                        'data-item': i,
                        'data-slide-h': h,
                        'data-slide-v': v === undefined ? 0 : v
                    });

                    if (options.markers) {
                        item.appendChild(create('i', {class: 'fas fa-check-circle fa-fw past'}));
                        item.appendChild(create('i', {class: 'fas fa-arrow-alt-circle-right fa-fw active'}));
                        item.appendChild(create('i', {class: 'far fa-circle fa-fw future'}));
                    }

                    if (options.numbers) {
                        const value = [];
                        let format = 'h.v';
                        if (typeof options.numbers === 'string') format = options.numbers;
                        else if (typeof config.slideNumber === 'string') format = config.slideNumber;

                        switch (format) {
                            case 'c':
                                value.push(i + 1);
                                break;
                            case 'c/t':
                                value.push(i + 1, '/', deck.getTotalSlides());
                                break;
                            case 'h/v':
                                value.push(h + 1);
                                if (typeof v === 'number' && !isNaN(v)) value.push('/', v + 1);
                                break;
                            default:
                                value.push(h + 1);
                                if (typeof v === 'number' && !isNaN(v)) value.push('.', v + 1);
                        }
                        item.appendChild(create('span', {class: 'slide-menu-item-number'}, value.join('') + '. '));
                    }

                    item.appendChild(create('span', {class: 'slide-menu-item-title'}, title));
                    return item;
                };

                const createSlideMenu = () => {
                    if (!document.querySelector('section[data-markdown]:not([data-markdown-parsed])')) {
                        const panel = create('div', {
                            'data-panel': 'Slides',
                            class: 'slide-menu-panel active-menu-panel'
                        });
                        panel.appendChild(create('ul', {class: 'slide-menu-items'}));
                        panels.appendChild(panel);

                        const items = select('.slide-menu-panel[data-panel="Slides"] > .slide-menu-items');
                        let slideCount = 0;

                        selectAll('.slides > section').forEach((section, h) => {
                            const subsections = selectAll('section', section);

                            if (subsections.length > 0) {
                                // 1. Create a top-level entry for the Wrapper Section
                                const wrapperItem = generateItem('slide-menu-item', section, slideCount, h);
                                if (wrapperItem) {
                                    items.appendChild(wrapperItem);
                                    slideCount++;
                                }

                                // 2. Create nested entries for ALL children (including the first one)
                                subsections.forEach((subsection, v) => {
                                    const item = generateItem('slide-menu-item-vertical', subsection, slideCount, h, v);
                                    if (item) {
                                        items.appendChild(item);
                                        slideCount++;
                                    }
                                });
                            } else {
                                // Standard flat slide
                                const item = generateItem('slide-menu-item', section, slideCount, h);
                                if (item) {
                                    items.appendChild(item);
                                    slideCount++;
                                }
                            }
                        });

                        selectAll('.slide-menu-item, .slide-menu-item-vertical').forEach(i => i.onclick = clicked);
                        highlightCurrentSlide();
                    } else {
                        setTimeout(createSlideMenu, 100);
                    }
                };

                createSlideMenu();
                deck.addEventListener('slidechanged', highlightCurrentSlide);

                // --- Custom Panels ---
                if (options.custom) {
                    const loadCustomPanelContent = async (panel, url) => {
                        try {
                            const response = await fetch(url);
                            if (!response.ok) throw new Error(response.statusText);
                            const text = await response.text();
                            panel.innerHTML = text;
                            enableCustomLinks(panel);
                        } catch (error) {
                            const msg = '<p>ERROR: The attempt to fetch ' + url + ' failed.</p>' +
                                '<p>Status: ' + error.message + '</p>' +
                                '<p>Remember that you need to serve the presentation HTML from a HTTP server.</p>';
                            panel.innerHTML = msg;
                        }
                    };

                    const enableCustomLinks = (panel) => {
                        selectAll('ul.slide-menu-items li.slide-menu-item', panel).forEach((item, i) => {
                            item.setAttribute('data-item', i + 1);
                            item.onclick = clicked;
                            item.addEventListener('mouseenter', handleMouseHighlight);
                        });
                    };

                    options.custom.forEach((element, index) => {
                        const panel = create('div', {
                            'data-panel': 'Custom' + index,
                            class: 'slide-menu-panel slide-menu-custom-panel'
                        });
                        if (element.content) {
                            panel.innerHTML = element.content;
                            enableCustomLinks(panel);
                        } else if (element.src) {
                            loadCustomPanelContent(panel, element.src);
                        }
                        panels.appendChild(panel);
                    });
                }

                // --- Themes & Transitions Panels ---
                if (options.themes) {
                    const panel = create('div', {class: 'slide-menu-panel', 'data-panel': 'Themes'});
                    panels.appendChild(panel);
                    const menu = create('ul', {class: 'slide-menu-items'});
                    panel.appendChild(menu);

                    options.themes.forEach((t, i) => {
                        const attrs = {class: 'slide-menu-item', 'data-item': '' + (i + 1)};
                        if (t.theme) attrs['data-theme'] = t.theme;
                        if (t.highlightTheme) attrs['data-highlight-theme'] = t.highlightTheme;

                        const item = create('li', attrs, t.name);
                        menu.appendChild(item);
                        item.onclick = clicked;
                    });
                }

                if (options.transitions) {
                    const panel = create('div', {class: 'slide-menu-panel', 'data-panel': 'Transitions'});
                    panels.appendChild(panel);
                    const menu = create('ul', {class: 'slide-menu-items'});
                    panel.appendChild(menu);

                    options.transitions.forEach((name, i) => {
                        const item = create('li', {
                            class: 'slide-menu-item',
                            'data-transition': name.toLowerCase(),
                            'data-item': '' + (i + 1)
                        }, name);
                        menu.appendChild(item);
                        item.onclick = clicked;
                    });
                }

                // --- Buttons & Mouse Interaction ---
                if (options.openButton) {
                    const div = create('div', {class: 'slide-menu-button'});
                    const link = create('a', {href: '#'});
                    link.appendChild(create('i', {class: 'fas fa-bars'}));
                    div.appendChild(link);
                    select('.reveal').appendChild(div);
                    div.onclick = openMenu;
                }

                if (options.openSlideNumber) {
                    const slideNumber = select('div.slide-number');
                    if (slideNumber) slideNumber.onclick = openMenu;
                }

                const handleMouseHighlight = (event) => {
                    if (mouseSelectionEnabled) {
                        selectAll('.active-menu-panel .slide-menu-items li.selected').forEach(i => i.classList.remove('selected'));
                        event.currentTarget.classList.add('selected');
                    }
                };

                selectAll('.slide-menu-panel .slide-menu-items li').forEach(item => {
                    item.addEventListener('mouseenter', handleMouseHighlight);
                });

                // --- Keyboard Handling ---
                if (options.keyboard) {
                    document.addEventListener('keydown', onDocumentKeyDown, false);

                    window.addEventListener('message', (event) => {
                        let data;
                        try {
                            data = JSON.parse(event.data);
                        } catch (e) {
                        }
                        if (data && data.method === 'triggerKey') {
                            onDocumentKeyDown({
                                keyCode: data.args[0], stopImmediatePropagation: () => {
                                }
                            });
                        }
                    });

                    const userCondition = config.keyboardCondition;
                    config.keyboardCondition = (event) => {
                        const defaultCond = !isOpen() || event.keyCode === 77;
                        return (typeof userCondition === 'function') ? userCondition(event) && defaultCond : defaultCond;
                    };

                    deck.addKeyBinding({keyCode: 77, key: 'M', description: 'Toggle menu'}, toggleMenu);
                }

                if (options.openOnInit) openMenu();
                initialised = true;
            };

            // Keyboard Event Listener (Kept external to init to allow removal if needed, but scoped to Module)
            const onDocumentKeyDown = (event) => {
                if (isOpen()) {
                    event.stopImmediatePropagation();

                    const activePanelItems = '.active-menu-panel .slide-menu-items li';
                    const getSelected = () => select(activePanelItems + '.selected') || select(activePanelItems + '.active');
                    const clearSelection = () => selectAll(activePanelItems).forEach(item => item.classList.remove('selected'));

                    switch (event.keyCode) {
                        case 72:
                        case 37: // h, left
                            prevPanel();
                            break;
                        case 76:
                        case 39: // l, right
                            nextPanel();
                            break;
                        case 75:
                        case 38: // k, up
                        {
                            const currItem = getSelected();
                            if (currItem) {
                                clearSelection();
                                const prevIndex = parseInt(currItem.getAttribute('data-item')) - 1;
                                const nextItem = select('.active-menu-panel .slide-menu-items li[data-item="' + prevIndex + '"]') || currItem;
                                selectItem(nextItem);
                            } else {
                                const item = select(activePanelItems + '.slide-menu-item');
                                if (item) selectItem(item);
                            }
                        }
                            break;
                        case 74:
                        case 40: // j, down
                        {
                            const currItem = getSelected();
                            if (currItem) {
                                clearSelection();
                                const nextIndex = parseInt(currItem.getAttribute('data-item')) + 1;
                                const nextItem = select('.active-menu-panel .slide-menu-items li[data-item="' + nextIndex + '"]') || currItem;
                                selectItem(nextItem);
                            } else {
                                const item = select(activePanelItems + '.slide-menu-item');
                                if (item) selectItem(item);
                            }
                        }
                            break;
                        case 36: // home
                            clearSelection();
                            const firstItem = select(activePanelItems + ':first-of-type');
                            if (firstItem) {
                                firstItem.classList.add('selected');
                                keepVisible(firstItem);
                            }
                            break;
                        case 35: // end
                            clearSelection();
                            const lastItem = select('.active-menu-panel .slide-menu-items:last-of-type li:last-of-type');
                            if (lastItem) {
                                lastItem.classList.add('selected');
                                keepVisible(lastItem);
                            }
                            break;
                        case 32:
                        case 13: // space, return
                            const currItem = select(activePanelItems + '.selected');
                            if (currItem) openItem(currItem, true);
                            break;
                        case 27: // esc
                            closeMenu(null, true);
                            break;
                    }
                }
            };

            const loadPlugin = () => {
                // Speaker notes compatibility check
                if (deck.isSpeakerNotes() && window.location.search.endsWith('controls=false')) return;

                if (!options.delayInit) initMenu();

                // Dispatch ready event
                const event = document.createEvent('HTMLEvents', 1, 2);
                event.initEvent('menu-ready', true, true);
                document.querySelector('.reveal').dispatchEvent(event);
            };

            loadPlugin();

        },

        toggle: () => {
            // Allow external toggling: RevealMenu.toggle()
            const body = document.querySelector('body');
            if (body.classList.contains('slide-menu-active')) {
                body.classList.remove('slide-menu-active');
                document.querySelector('.slide-menu').classList.remove('active');
                document.querySelector('.slide-menu-overlay').classList.remove('active');
            } else {
                // We can't easily open from here without the 'event' object logic
                // inside the closure, but we can trigger the button click if it exists.
                const btn = document.querySelector('.slide-menu-button');
                if (btn) btn.click();
            }
        },

        isMenuInitialised: () => true
    };

    return Plugin;
})();