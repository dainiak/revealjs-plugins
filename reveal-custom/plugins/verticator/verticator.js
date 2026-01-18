/*
    A mod of compiled https://github.com/Martinomagnifico/reveal.js-verticator
    @author: Martijn De Jongh (Martino), martijn.de.jongh@gmail.com
    https://github.com/martinomagnifico
    Version 1.3.1.mod by Alex Dainiak
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Verticator = factory());
})(this, (function () {
    'use strict';

    const defaultConfig = {
        themetag: 'h1',
        color: '',
        inversecolor: '',
        skipuncounted: false,
        clickable: true,
        position: 'auto',
        offset: '3vmin',
        autogenerate: true,
        tooltip: false,
        scale: 1,
        cssautoload: true,
        csspath: '',
        plaintextonly: false
    };

    const CONSTANTS = {
        lightClass: 'has-light-background',
        darkClass: 'has-dark-background',
        themeColorVar: '--c-theme-color',
        vertiColorVar: '--v-color',
        forceColorVar: '--v-forcecolor',
        activeClass: 'active'
    };

    /**
     * Helper: Load CSS dynamically
     */
    const loadCSS = (config, pluginId) => {
        if (!config.cssautoload || config.csspath === false) return;

        const path = config.csspath || (function () {
            const script = document.querySelector(`script[src$="${pluginId}.js"]`);
            return script ? script.src.replace(/\.js$/, '.css') : `plugin/${pluginId}/${pluginId}.css`;
        })();

        if (!document.querySelector(`link[href="${path}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = path;
            document.head.appendChild(link);
        }
    };

    /**
     * Helper: Get base index (0 or 1)
     */
    const getIndexBase = (deck) => deck.getConfig().hashOneBasedIndex ? 1 : 0;

    /**
     * Helper: Determine tooltip text
     */
    const getTooltip = (element, config) => {
        if (element.dataset.verticatorTooltip === 'none' || element.classList.contains('no-verticator-tooltip')) return null;

        // 1. Explicit text in config
        if (typeof config.tooltip === 'string' && config.tooltip !== 'auto' && config.tooltip !== 'true') {
            return element.getAttribute(config.tooltip) || null;
        }

        // 2. Auto-detection
        if (config.tooltip === true || config.tooltip === 'auto' || config.tooltip === 'true') {
            // Check data attributes
            // MODIFICATION: Check for data-menu-title
            if (element.getAttribute('data-menu-title')) return element.getAttribute('data-menu-title');
            if (element.getAttribute('data-name')) return element.getAttribute('data-name');
            if (element.getAttribute('title')) return element.getAttribute('title');

            // Check headings
            const heading = element.querySelector('h1, h2, h3, h4');
            if (heading && heading.textContent) return heading.textContent;
        }
        return null;
    };

    /**
     * Main Plugin Class
     */
    class VerticatorPlugin {
        constructor(deck, options) {
            this.deck = deck;
            this.config = Object.assign({}, defaultConfig, options);
            this.revealElem = deck.getRevealElement();
            this.verticatorElem = null;
            this.colors = {};
            this.currentSlide = null;

            // State for direction detection
            this.lastIndexH = 0;
            this.lastIndexV = 0;
        }

        init() {
            // Load CSS
            loadCSS(this.config, 'verticator');

            // Setup UI
            this.setupElement();
            if (!this.verticatorElem) return;

            // Setup Theme Colors
            this.setupColors();

            // Setup Position & Scale
            this.updateScaleAndPosition();

            // Initial Render
            // We verify slide exists to avoid initialization errors
            const currentSlide = this.deck.getCurrentSlide();
            if (currentSlide) {
                this.onSlideChange(currentSlide);
            } else {
                // If plugin loads before Reveal is ready, wait for ready event
                this.deck.on('ready', (event) => {
                    this.onSlideChange(event.currentSlide);
                });
            }

            // Bind Events
            this.bindEvents();
        }

        setupElement() {
            this.verticatorElem = this.revealElem.querySelector('ul.verticator');
            if (!this.verticatorElem && this.config.autogenerate) {
                this.verticatorElem = document.createElement('ul');
                this.verticatorElem.classList.add('verticator');
                if (!this.config.clickable) this.verticatorElem.classList.add('no-click');
                this.revealElem.insertBefore(this.verticatorElem, this.revealElem.firstChild);
            }
        }

        setupColors() {
            // Create a temporary section to read computed styles
            const tempSection = document.createElement('section');
            const tempSubject = document.createElement(this.config.themetag);

            // Force light theme calculation
            tempSection.className = CONSTANTS.lightClass;
            this.revealElem.querySelector('.slides').appendChild(tempSection).appendChild(tempSubject);

            const lightColor = getComputedStyle(tempSubject).color;

            // Force dark theme calculation
            tempSection.className = CONSTANTS.darkClass;
            const darkColor = getComputedStyle(tempSubject).color;

            tempSection.remove();

            // Store colors
            this.colors = {
                regular: lightColor,
                inverse: darkColor,
                verticatorRegular: this.config.color || lightColor,
                verticatorInverse: this.config.inversecolor || this.config.oppositecolor || darkColor
            };

            // Set default variable
            if (this.config.color) {
                this.verticatorElem.style.setProperty(CONSTANTS.vertiColorVar, this.colors.verticatorRegular);
            }
        }

        updateScaleAndPosition() {
            // Position
            let pos = this.config.position;
            if (pos === 'auto') pos = this.deck.getConfig().rtl ? 'left' : 'right';

            this.verticatorElem.classList.remove('left', 'right');
            this.verticatorElem.classList.add(pos);
            this.verticatorElem.style[pos === 'left' ? 'left' : 'right'] = this.config.offset;

            // Scale logic
            const applyScale = () => {
                const revealScale = this.deck.getScale();
                const userScale = Math.min(Math.max(this.config.scale, 0.5), 2);
                const totalScale = revealScale > 1 ? revealScale * userScale : userScale;

                this.verticatorElem.style.setProperty('--verticator-scale', totalScale.toFixed(2));
                this.verticatorElem.style.setProperty('--verticator-tooltip-scale', (1 / Math.sqrt(totalScale)).toFixed(2));
            };

            applyScale();
            this.deck.on('resize', applyScale);
        }

        bindEvents() {
            this.deck.on('slidechanged', (event) => {
                const indices = this.deck.getIndices();
                const hasChangedH = indices.h !== this.lastIndexH;
                const hasChangedV = indices.v !== this.lastIndexV;

                // If horizontal changed or it's a new stack, regenerate bullets
                if (hasChangedH || (hasChangedV && !this.verticatorElem.classList.contains('visible'))) {
                    this.onSlideChange(event.currentSlide);
                } else {
                    // Just update active bullet
                    this.activateBullet(indices.v);
                }

                this.updateColors(event.currentSlide);

                this.lastIndexH = indices.h;
                this.lastIndexV = indices.v;
            });

            // Observer for dark/light class changes on the viewport (Reveal.js 4+)
            const observer = new MutationObserver((mutations) => {
                for (const m of mutations) {
                    if (m.attributeName === 'class') {
                        this.updateColors(this.deck.getCurrentSlide());
                    }
                }
            });

            observer.observe(this.revealElem, { attributes: true, attributeFilter: ['class'] });
        }

        onSlideChange(currentSlide) {
            // SAFETY CHECK: Ensure slide exists
            if (!currentSlide) return;

            const parent = currentSlide.parentNode;

            // Check if we are in a vertical stack
            const isVerticalStack = parent.tagName === 'SECTION' && parent.classList.contains('stack');
            const sections = isVerticalStack ? Array.from(parent.querySelectorAll('section')) : [];

            // Filter uncounted slides
            const visibleSections = sections.filter(section => {
                return !(this.config.skipuncounted && section.getAttribute('data-visibility') === 'uncounted');
            });

            if (visibleSections.length < 2) {
                this.verticatorElem.classList.remove('visible');
                this.verticatorElem.innerHTML = '';
                return;
            }

            // Generate Bullets
            const indexBase = getIndexBase(this.deck);
            const currentHIndex = this.deck.getIndices().h;

            let html = '';
            visibleSections.forEach((section, index) => {
                // Find original index in parent to ensure links work correctly even if some are skipped
                const realIndex = Array.from(parent.children).indexOf(section);
                const tooltip = getTooltip(section, this.config);
                const link = this.config.clickable ? `href="#/${currentHIndex + indexBase}/${realIndex + indexBase}"` : '';
                const tooltipHtml = tooltip ? `<div class="tooltip"><span>${tooltip}</span></div>` : '';
                const dataName = tooltip ? `data-name="${tooltip}"` : '';

                html += `<li data-index="${realIndex + indexBase}"><a ${link} ${dataName}></a>${tooltipHtml}</li>`;
            });

            this.verticatorElem.innerHTML = `<div class="verticator-holder">${html}</div>`;
            this.verticatorElem.classList.add('visible');

            this.activateBullet(this.deck.getIndices().v);
            this.updateColors(currentSlide);
        }

        activateBullet(vIndex) {
            const indexBase = getIndexBase(this.deck);
            const bullets = Array.from(this.verticatorElem.querySelectorAll('li'));

            bullets.forEach(li => li.classList.remove(CONSTANTS.activeClass));

            // Find closest match (handling potential skipped indices)
            let activeLi = null;
            for (const li of bullets) {
                if (parseInt(li.dataset.index, 10) <= vIndex + indexBase) {
                    activeLi = li;
                }
            }
            if (activeLi) activeLi.classList.add(CONSTANTS.activeClass);
        }

        updateColors(currentSlide) {
            // SAFETY CHECK: Ensure slide exists
            if (!currentSlide) return;

            const revealClasses = this.revealElem.classList;
            const parent = currentSlide.parentNode;

            // 1. Determine if we need inverse colors
            let isDark = revealClasses.contains(CONSTANTS.darkClass);
            let isLight = revealClasses.contains(CONSTANTS.lightClass);

            // Check stack specific classes
            if (parent.classList.contains(CONSTANTS.darkClass)) isDark = true;
            if (parent.classList.contains(CONSTANTS.lightClass)) isLight = true;

            const useInverse = isDark || (revealClasses.contains('has-dark-background') && !isLight);

            if (useInverse) {
                if (this.config.inversecolor || this.config.oppositecolor) {
                    this.verticatorElem.style.setProperty(CONSTANTS.vertiColorVar, this.colors.verticatorInverse);
                } else {
                    this.verticatorElem.style.removeProperty(CONSTANTS.vertiColorVar);
                }
            } else {
                if (this.config.color) {
                    this.verticatorElem.style.setProperty(CONSTANTS.vertiColorVar, this.colors.verticatorRegular);
                } else {
                    this.verticatorElem.style.removeProperty(CONSTANTS.vertiColorVar);
                }
            }

            // 2. Handle Force Colors (per slide overrides)
            const slideOverride = currentSlide.dataset.verticator || parent.dataset.verticator;

            if (slideOverride) {
                if (slideOverride === 'regular') {
                    this.verticatorElem.style.setProperty(CONSTANTS.forceColorVar, this.colors.verticatorRegular);
                } else if (slideOverride === 'inverse') {
                    this.verticatorElem.style.setProperty(CONSTANTS.forceColorVar, this.colors.verticatorInverse);
                } else {
                    this.verticatorElem.style.setProperty(CONSTANTS.forceColorVar, slideOverride);
                }
            } else {
                this.verticatorElem.style.removeProperty(CONSTANTS.forceColorVar);
            }
        }
    }

    // Reveal.js Plugin Interface
    return () => ({
        id: 'verticator',
        init: (deck) => {
            const plugin = new VerticatorPlugin(deck, deck.getConfig().verticator || {});
            plugin.init();
        }
    });

}));