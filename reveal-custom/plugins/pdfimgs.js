const RevealPDFJS = {
		id: 'pdfjs',
		init: (reveal) => {
			let options = reveal.getConfig().pdfjs || {};

			options = {
				pdfjsUrl: options.pdfjsUrl || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js',
				pdfjsWorkerUrl: options.pdfjsWorkerUrl || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js'
			};

			function parsePageNumbers(s, totalPages){
				let pages = [];

				if(!s)
					return [];

				for(let range of s.split(',')) {
					let numPair = range.split('-');
					if(numPair.length === 1)
						pages.push(parseInt(numPair[0]));
					else {
						let startPage = numPair[0] === '' ? 1 : parseInt(numPair[0]);
						let endPage = numPair[1] === '' ? totalPages : Math.min(totalPages, parseInt(numPair[1]));
						for(let i = startPage; i <= endPage; i++)
							pages.push(i);
					}
				}

				return pages;
			}

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

						window.pdfjsLib.getDocument(url).promise.then(function (pdfDocument) {
							let pageNumbers =
								canvas.hasAttribute('data-page')
									?
									[parseInt(canvas.getAttribute('data-page') || '0')]
									:
									parsePageNumbers(
										canvas.getAttribute('data-pages') || '1',
										pdfDocument.numPages
									);

							if(pageNumbers.length === 1) {
								pdfDocument.getPage(pageNumbers[0]).then(function (pdfPage) {
									let viewport = pdfPage.getViewport({scale: 3});
									canvas.width = Math.floor(viewport.width);
									canvas.height = Math.floor(viewport.height);
									let canvasStyle = window.getComputedStyle(canvas);
									let canvasWidth = parseFloat(canvasStyle.width);
									let canvasHeight = parseFloat(canvasStyle.height);
									let scaling = Math.min(canvasWidth / canvas.width, canvasHeight / canvas.height);
									canvas.style.width = canvas.width * scaling + 'px';
									canvas.style.height = canvas.height * scaling + 'px';

									let renderContext = {
										canvasContext: canvas.getContext('2d'),
										viewport: viewport
									};
									pdfPage.render(renderContext);
									canvas.dataset.pdfRendered = 'true';
								});
							}
							else {
								let div = document.createElement('div');
								for(let key in canvas.dataset)
									div.dataset[key] = canvas.dataset[key];

								div.style.width = canvas.style.width;
								div.style.height = canvas.style.height;
								div.style.overflowY = 'scroll';
								div.classList = canvas.classList;
								canvas.parentNode.insertBefore(div, canvas);
								canvas.parentNode.removeChild(canvas);
								canvas = null;

								for(let pageNumber of pageNumbers)
									pdfDocument.getPage(pageNumber).then(function (pdfPage) {
										let viewport = pdfPage.getViewport({scale: 3});
										let canvas = document.createElement('canvas');
										canvas.width = Math.floor(viewport.width);
										canvas.height = Math.floor(viewport.height);
										canvas.style.width = '100%';
										div.appendChild(canvas);

										let renderContext = {
											canvasContext: canvas.getContext('2d'),
											viewport: viewport
										};
										pdfPage.render(renderContext);
										canvas.dataset.pdfRendered = 'true';
									});
							}
						});
					}
				});
			});
		}
};