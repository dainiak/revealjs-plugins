/*
    Reveal.js easy fragment toggling plugin
    Author: Alex Dainiak
    Web: www.dainiak.com
    Email: dainiak@gmail.com
 */

var RevealFragKey = (function() {
	/*
		Copy of Reveal dispatchEvent code:
	 */
	function dispatchEvent( type, fragment ) {
		let event = document.createEvent('HTMLEvents', 1, 2);
		event.initEvent( type, true, true );
		event.fragment = fragment;
		document.querySelector( '.reveal' ).dispatchEvent( event );

		// If we're in an iframe, post each reveal.js event to the
		// parent window. Used by the notes plugin
		if( Reveal.getConfig().postMessageEvents && window.parent !== window.self ) {
			window.parent.postMessage( JSON.stringify({ namespace: 'reveal', eventName: type, state: Reveal.getState() }), '*' );
		}
	}


	let dispatchEvents = false;
	const KEY_NEXT = '=';
	const KEY_PREV = '-';
	let waitForNavigation = false;
	document.addEventListener('keydown', function(event){
		if( document.querySelector( ':focus' ) !== null
			|| event.shiftKey || event.altKey || event.ctrlKey || event.metaKey )
			return;

		if(event.key >= '0' && event.key <= '9'){
			event.preventDefault();
			let i = parseInt(event.key);
			if(waitForNavigation){
				Reveal.navigateFragment(i);
				waitForNavigation = false;
			}
			else {
				let frag = Reveal.getCurrentSlide().querySelector('.fragment[data-fragment-index="' + i.toString() + '"]');
				if (frag) {
					let isVisible = frag.classList.toggle('visible');

					if (dispatchEvents) {
						if (isVisible) {
							dispatchEvent('fragmentshown', frag);
						}
						else {
							dispatchEvent('fragmenthidden', frag);
						}
					}
				}
			}
		}
		else if(event.key === KEY_NEXT){
			event.preventDefault();
			waitForNavigation = true;
		}
		else if(event.key === KEY_PREV){
			event.preventDefault();
			Reveal.navigateFragment(-1);
			waitForNavigation = false;
		}
	}, false);
})();