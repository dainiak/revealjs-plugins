const RevealPDFJS = {
		id: 'pdfjs',
		init: (reveal) => {
			options = {
				pdfjsUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js',
				pdfjsWorkerUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js'
			};

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

			loadScript(options.pdfjsUrl, function(){
				window.pdfjsLib.GlobalWorkerOptions.workerSrc = options.pdfjsWorkerUrl;

				reveal.addEventListener('slidechanged', function (event) {
					let canvases = event.currentSlide.querySelectorAll("canvas[data-pdf]:not([data-pdf-rendered])");
					for (let i = 0; i < canvases.length; i++) {
						let canvas = canvases[i];
						let url = canvas.getAttribute('data-pdf');

						window.pdfjsLib.getDocument(url).promise.then(function (pdf) {
							pdf.getPage(1).then(function (page) {
								let scale = 1;
								let viewport = page.getViewport({ scale: scale });
								let outputScale = window.devicePixelRatio || 1;
								canvas.width = Math.floor(viewport.width * outputScale);
								canvas.height = Math.floor(viewport.height * outputScale);
								// canvas.style.width = Math.floor(viewport.width) + "px";
								// canvas.style.height =  Math.floor(viewport.height) + "px";
								let transform = outputScale !== 1
									? [outputScale, 0, 0, outputScale, 0, 0]
									: null;
								let renderContext = {
									canvasContext: canvas.getContext('2d'),
									transform: transform,
									viewport: viewport
								};
								page.render(renderContext);
								canvas.dataset.pdfRendered = 'true';
							});
						});
					}
				});
			});
		}
};