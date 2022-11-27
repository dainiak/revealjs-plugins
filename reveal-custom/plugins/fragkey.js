/*
    Reveal.js easy fragment toggling plugin
 */

let RevealFragKey = (function() {
	/*
		Copy of Reveal dispatchEvent code:
	 */
	function dispatchEvent( type, fragment ) {
		let event = document.createEvent('HTMLEvents', 1, 2);
		event.initEvent( type, true, true );
		event.fragment = fragment;
		document.querySelector( '.reveal' ).dispatchEvent( event );

		// If we're in an iframe, post each reveal.js event to the parent window. Used by the notes plugin
		if( Reveal.getConfig().postMessageEvents && window.parent !== window.self ) {
			window.parent.postMessage(
				JSON.stringify({ namespace: 'reveal', eventName: type, state: Reveal.getState() }),
				'*'
			);
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

		if(event.key === KEY_NEXT){
			event.preventDefault();
			waitForNavigation = true;
			return;
		}
		if(event.key === KEY_PREV){
			event.preventDefault();
			Reveal.navigateFragment(-1);
			waitForNavigation = false;
			return;
		}

		if(!(event.key >= '0' && event.key <= '9'))
			return;

		event.preventDefault();
		let i = parseInt(event.key);
		if(waitForNavigation){
			Reveal.navigateFragment(i);
			waitForNavigation = false;
		}
		else {
			let frag = Reveal.getCurrentSlide().querySelector('.fragment[data-fragment-index="' + i.toString() + '"]');
			if (frag && dispatchEvents)
				frag.classList.toggle('visible')
					? dispatchEvent('fragmentshown', frag)
					: dispatchEvent('fragmenthidden', frag);
		}
	}, false);
	return true;
})();