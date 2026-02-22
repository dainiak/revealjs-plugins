const RevealCrossOut = {
    id: 'crossout',
    init: (reveal) => {
        const config = reveal.getConfig().crossout || {};
        const options = {
            color: config.color || 'rgba(220, 20, 60, 1)', // Default Crimson
            thickness: config.thickness || 8,               // Stroke width
            duration: config.duration || '0.3s',            // Animation speed
            zIndex: config.zIndex || 10,                    // Layer order
            opacity: config.opacity !== undefined ? config.opacity : 1.0 // Opacity
        };

        function injectStyles() {
            const styleId = 'reveal-crossout-styles';
            if (document.getElementById(styleId)) return;

            const css = `
                .cross-out-wrapper {
                    position: relative;
                    vertical-align: middle;
                }
                
                .cross-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: ${options.zIndex};
                }

                .cross-overlay svg {
                    width: 100%;
                    height: 100%;
                    fill: none;
                    stroke: ${options.color};
                    stroke-width: ${options.thickness};
                    stroke-linecap: round;
                    filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.3));
                }

                .cross-overlay.fragment {
                    opacity: 0;
                    transform: scale(2);
                    transition: all ${options.duration} cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                .cross-overlay.fragment.visible {
                    opacity: ${options.opacity}; /* Applies the global opacity config */
                    transform: scale(1);
                }
            `;

            const style = document.createElement('style');
            style.id = styleId;
            style.type = 'text/css';
            style.appendChild(document.createTextNode(css));
            document.head.appendChild(style);
        }

        function processElements() {
            const targets = reveal.getSlidesElement().querySelectorAll('[data-cross-out]');

            targets.forEach(target => {
                if (target.parentNode.classList.contains('cross-out-wrapper')) return;

                const wrapper = document.createElement('div');
                wrapper.classList.add('cross-out-wrapper');

                const targetStyle = window.getComputedStyle(target);
                if (targetStyle.display === 'inline' || target.tagName === 'SPAN') {
                    wrapper.style.display = 'inline-flex';
                } else {
                    wrapper.style.display = 'inline-block';
                }

                target.parentNode.insertBefore(wrapper, target);
                wrapper.appendChild(target);

                const cross = document.createElement('div');
                cross.classList.add('cross-overlay', 'fragment');

                const crossOutValue = target.getAttribute('data-cross-out');

                if (crossOutValue && crossOutValue.trim() !== "") {
                    cross.setAttribute('data-fragment-index', crossOutValue);
                    cross.classList.add(`fragidx-${crossOutValue}`);
                } else if (target.hasAttribute('data-fragment-index')) {
                    cross.setAttribute('data-fragment-index', target.getAttribute('data-fragment-index'));
                }

                cross.innerHTML = `
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M10,10 L90,90 M90,10 L10,90" />
                    </svg>
                `;

                wrapper.appendChild(cross);
            });
        }

        injectStyles();
        processElements();

        return true;
    }
};