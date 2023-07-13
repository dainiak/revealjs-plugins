/*
	A slight modification of the stock Reveal.js zooming plugin.
 */

let zoom = (function(){
	let zoomedCurrently = false;
	document.body.style.transition = 'transform 0.8s ease';

	/**
	 * Applies the CSS required to zoom in, prefers the use of CSS3
	 * transforms but falls back on zoom for IE.
	 *
	 * @param {Object} rect
	 * @param {Number} scale
	 */
	function magnify(rect, scale) {
		let scrollOffset = {
			x: window.scrollX !== undefined ? window.scrollX : window.pageXOffset,
			y: window.scrollY !== undefined ? window.scrollY : window.pageYOffset
		};

		// Ensure a width/height is set
		rect.width = rect.width || 1;
		rect.height = rect.height || 1;

		// Center the rect within the zoomed viewport
		rect.x -= ( window.innerWidth - ( rect.width * scale ) ) / 2;
		rect.y -= ( window.innerHeight - ( rect.height * scale ) ) / 2;

		if(scale === 1)
			document.body.style.transform = '';
		else {
			document.body.style.transformOrigin = scrollOffset.x +'px '+ scrollOffset.y +'px';
			document.body.style.transform = 'translate('+ -rect.x +'px,'+ -rect.y +'px) scale('+ scale +')';
		}


		zoomedCurrently = true;

		if( document.documentElement.classList )
			if( zoomedCurrently !== 1 )
				document.documentElement.classList.add( 'zoomed' );
			else
				document.documentElement.classList.remove( 'zoomed' );
	}


	return {
		/**
		 * Zooms in on either a rectangle or HTML element.
		 *
		 * @param {Object} options
		 *   - element: HTML element to zoom in on
		 *   OR
		 *   - x/y: coordinates in non-transformed space to zoom in on
		 *   - width/height: the portion of the screen to zoom in on
		 *   - scale: can be used instead of width/height to explicitly set scale
		 */
		to: function( options ) {

			// Due to an implementation limitation we can't zoom in
			// to another element without zooming out first
			if(zoomedCurrently) {
				zoom.out();
				return;
			}

			options.x = options.x || 0;
			options.y = options.y || 0;

			// If an element is set, that takes precedence
			if( !!options.element ) {
				// Space around the zoomed in element to leave on screen
				let padding = 20;
				let bounds = options.element.getBoundingClientRect();

				options.x = bounds.left - padding;
				options.y = bounds.top - padding;
				options.width = bounds.width + ( padding * 2 );
				options.height = bounds.height + ( padding * 2 );
			}

			let scale = Math.max( Math.min( window.innerWidth / options.width, window.innerHeight / options.height ), 1 );

			if( scale > 1 ) {
				options.x *= scale;
				options.y *= scale;
				magnify( options, scale );
			}
		},

		/**
		 * Resets the document zoom state to its default.
		 */
		out: function() {
			magnify( { x: 0, y: 0 }, 1 );
			zoomedCurrently = false;
		},

		// Alias
		magnify: function( options ) { this.to( options ) },
	}

})();

const RevealZoom = {
	id: 'zoom',
	init: (reveal) => {
		let options = reveal.getConfig().zooming || {};
		const explicitZoomables = !!options.explicitZoomables;
		const zoomKey = ( options.zoomKey || 'alt' ) + 'Key';
		const fullscreenKey = ( options.fullscreenKey || 'ctrl' ) + 'Key';

		let isEnabled = true;

		reveal.addEventListener('overviewshown', function () {
			let oldTransitionSettings = document.body.style.transition;
			document.body.style.transition = 'transform 0s';
			zoom.out();
			document.body.style.transition = oldTransitionSettings;
		});

		reveal.getViewportElement().addEventListener( 'mousedown', function( event ) {
			if( !((event[ zoomKey ] || event[ fullscreenKey ]) && isEnabled) )
				return;

			let zoomPadding = 20;
			let revealScale = reveal.getScale();

			let target = event.target;
			while (target)
			{
				if(target.tagName && target.tagName.toLowerCase() === 'section') {
					target = event.target;
					break;
				}
				if(target.classList && target.classList.contains('MathJax'))
					break;

				if(target.classList && (target.classList.contains('smallest-zoomable') || target.classList.contains('zoomable')) || target.hasAttribute && target.hasAttribute('data-smallest-zoomable'))
					break;

				target = target.parentNode;
			}

			if(!target || explicitZoomables && !target.classList.contains('smallest-zoomable') && !target.hasAttribute('data-smallest-zoomable') && !target.classList.contains('zoomable') && !target.hasAttribute('data-zoomable'))
				return;

			if(event[fullscreenKey] && document.fullscreenEnabled) {
				target.addEventListener('mousedown', function(evt){
					if(evt.target.fullscreenElement !== false && evt[zoomKey] && evt[fullscreenKey])
						document.exitFullscreen();
				});
				target.requestFullscreen();
				return;
			}


			event.preventDefault();

			let bounds = target.getBoundingClientRect();

			zoom.to({
				x: ( bounds.left * revealScale ) - zoomPadding,
				y: ( bounds.top * revealScale ) - zoomPadding,
				width: ( bounds.width * revealScale ) + ( zoomPadding * 2 ),
				height: ( bounds.height * revealScale ) + ( zoomPadding * 2 )
			});
		} );

		reveal.addEventListener('overviewshown', function() { isEnabled = false; });
		reveal.addEventListener('overviewhidden', function() { isEnabled = true; });
		reveal.addEventListener('ready', function () {
			for(let e of document.querySelectorAll('img,video,span,div,section'))
				e.removeAttribute('title')
		})
	}
};