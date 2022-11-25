/*
    In-browser python code blocks execution for Reveal.js using Pyodide
    Author: Alex Dainiak
    Web: www.dainiak.com
    Email: dainiak@gmail.com
 */

const RevealPyodide = {
    id: 'pyodide',
    init: (reveal) => {
        let pyodideVersion = '0.21.3';
        let options = reveal.getConfig().pyodide || {};
        options = {
            pyodideUrl: options.pyodideUrl || 'https://cdn.jsdelivr.net/pyodide/v' + pyodideVersion + '/full/pyodide.js',
            pyodideBaseUrl: options.pyodideBaseUrl || 'https://cdn.jsdelivr.net/pyodide/v' + pyodideVersion + '/full/',
            preloadPackages: options.preloadPackages || []
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

        loadScript(options.pyodideUrl, async function(){
            let stdoutBuffer = null;
            function stdout(line) {
                if(stdoutBuffer !== null)
                    stdoutBuffer += line + '\n';
                else
                    console.log(line);
            }

            let pyodide = await window.loadPyodide({
                indexURL : options.pyodideBaseUrl,
                stdout: stdout
            });

            options.preloadPackages.forEach((packageName) => {
                pyodide.loadPackage(packageName);
            });


            function runPythonCodeInElement(element) {
                if(!element.hasAttribute('data-language') || element.getAttribute('data-language') !== 'python')
                    return;

                element.removeAttribute('data-run-with-deck');
                element.removeAttribute('data-run-with-slide');

                let out = element.pythonOutputElement;
                if(!out && element.dataset.stdout) {
                    out = document.querySelector(element.dataset.stdout);
                }
                if(!out) {
                    let p = element;
                    while (['pre', 'code'].indexOf(p.parentNode.tagName.toLowerCase()) !== -1) {
                        p = p.parentNode;
                    }

                    out = document.createElement('pre');
                    if (element.hasAttribute('data-output-as-fragment'))
                        out.classList.add('fragment');

                    p.insertAdjacentElement('afterend', out);
                    let codeElement = document.createElement('code');
                    out.appendChild(codeElement);
                    out = codeElement;
                    element.pythonOutputElement = out;
                }

                stdoutBuffer = '';
                let executionResult;
                try {
                    executionResult = pyodide.runPython(element.textContent, {stdout: stdout}) || '';
                } catch (e) {
                    executionResult = e.toString();
                }

                let textContent = stdoutBuffer;
                if(textContent.length && executionResult.length && !textContent.endsWith('\n'))
                    textContent += '\n';
                textContent += executionResult;
                stdoutBuffer = null;

                out.textContent = textContent;

                if (Reveal.getPlugin('highlight-ace') && reveal.highlightBlockWithAce) {
                    reveal.highlightBlockWithAce(out, {theme: element.dataset['theme'], language: 'text', showGutter: false})
                    element.setAttribute('data-raw-code', element.textContent);
                }
            }

            reveal.runPythonCodeInElement = runPythonCodeInElement;

            reveal.on('slidetransitionend', function(event) {
                event.currentSlide.querySelectorAll('[data-language="python"][data-run-with-slide]').forEach(runPythonCodeInElement);
            });

            function runWithDeck(){
                reveal.getSlidesElement().querySelectorAll('[data-language="python"][data-run-with-deck]').forEach(runPythonCodeInElement);
                reveal.layout();
            }
            if(reveal.isReady())
                runWithDeck();
            else
                reveal.on('ready', runWithDeck);

            reveal.getSlidesElement().querySelectorAll('[data-language="python"][data-run-on-edit]').forEach((element)=>{
                element.addEventListener('codeupdated', () => {runPythonCodeInElement(element)});
            });
        });

        return true;
    }
};