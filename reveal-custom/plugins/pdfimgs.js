const RevealPDFJS = {
		id: 'pdfjs',
		init: (reveal) => {
			let options = reveal.getConfig().pdfjs || {};

			options = {
				pdfjsUrl: options.pdfjsUrl || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js',
				pdfjsWorkerUrl: options.pdfjsWorkerUrl || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js'
			};

			function loadScript(url, callback) {
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

			loadScript(options.pdfjsUrl, function(){
				window.pdfjsLib.GlobalWorkerOptions.workerSrc = options.pdfjsWorkerUrl;

				reveal.addEventListener('slidechanged', function (event) {
					let canvases = event.currentSlide.querySelectorAll("canvas[data-pdf]:not([data-pdf-rendered])");
					for (let canvas of canvases) {
						let url = canvas.getAttribute('data-pdf');
						let pageNumber = parseInt(canvas.getAttribute('data-page') || '1');
						let pageNumbers = [4,5,6,7];

						window.pdfjsLib.getDocument(url).promise.then(function (pdfDocument) {



							pdfDocument.getPage(pageNumber).then(function (pdfPage) {
								let viewport = pdfPage.getViewport({scale: 3});
								console.log(viewport);
								canvas.width = Math.floor(viewport.width);
								canvas.height = Math.floor(viewport.height);
								let canvasStyle = window.getComputedStyle(canvas);
								let canvasWidth = parseFloat(canvasStyle.width);
								let canvasHeight = parseFloat(canvasStyle.height);
								let scaling = Math.min( canvasWidth / canvas.width, canvasHeight / canvas.height);
								canvas.style.width = canvas.width * scaling + 'px';
								canvas.style.height = canvas.height * scaling + 'px';

								let renderContext = {
									canvasContext: canvas.getContext('2d'),
									viewport: viewport
								};
								pdfPage.render(renderContext);
								canvas.dataset.pdfRendered = 'true';
							});
						});
					}
				});
			});
		}
};