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
                if(!element.classList.contains('language-python'))
                    return;

                let out = element.pythonOutputElement;
                if(!out && element.dataset.stdout) {
                    out = document.querySelector(element.dataset.stdout);
                }
                if(!out) {
                    let p = element;
                    while (['pre', 'code'].indexOf(p.parentNode.tagName.toLowerCase()) != -1) {
                        p = p.parentNode;
                    }

                    out = document.createElement('pre');
                    if (element.classList.contains('output-as-fragment'))
                        out.classList.add('fragment');

                    p.insertAdjacentElement('afterend', out);
                    element.pythonOutputElement = out;
                }

                element.classList.remove('run-with-deck');
                element.classList.remove('run-with-slide');
                stdoutBuffer = '';
                let executionResult = null;
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
                event.currentSlide.querySelectorAll('.language-python.run-with-slide').forEach(runPythonCodeInElement);
            });

            if(reveal.isReady()){
                reveal.getViewportElement().querySelectorAll('.language-python.run-with-deck').forEach(runPythonCodeInElement);
                reveal.layout();
            }
            else {
                reveal.on('ready', function () {
                    reveal.getViewportElement().querySelectorAll('.language-python.run-with-deck').forEach(runPythonCodeInElement);
                    reveal.layout();
                });
            }

            reveal.getViewportElement().querySelectorAll('.language-python.run-on-edit').forEach((element)=>{
                element.addEventListener('codeupdated', () => {runPythonCodeInElement(element)});
            });
        });

        return true;
    }
};