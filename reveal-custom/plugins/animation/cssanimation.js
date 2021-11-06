/*
    Reveal.js basic CSS animation plugin
    Author: Alex Dainiak
    Author's webpage: www.dainiak.com
    Email: dainiak@gmail.com
    Plugin is hosted on GitHub:
 */


(function() {
    if(!String.prototype.includes){
        String.prototype.includes = function(s){return this.indexOf(s) >= 0}
    }
    if(!String.prototype.startsWith){
        String.prototype.startsWith = function(s){return this.indexOf(s) === 0}
    }
    if(!String.prototype.endsWith){
        String.prototype.endsWith = function(s){return this.lastIndexOf(s) === this.length - s.length}
    }

    let defaultTransitionDuration =
        Reveal.getConfig().animation && Reveal.getConfig().animation.defaultTransitionDuration !== undefined ?
            Reveal.getConfig().animation.defaultTransitionDuration
        :
            null;

    let globalSubstitutions =
        Reveal.getConfig().animation && Reveal.getConfig().animation.macros ?
            Reveal.getConfig().animation && Reveal.getConfig().animation.macros
        :
            [];

    let animationAtomIdCounter = 0;

    function camelToDashed(s){
        return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }


    /*
        Function parses complex index notation like [1,2,4-9,18-] to explicit Array of numbers
        Means: 1, 2, 4,5,6,7,8,9, 18,19,…
        Returns Array filled with appropriate numbers.
     */
    function parseIndices(str){
        let indices = [];
        let tokens = str.split(',');
        for(let token of tokens){
            if(token.includes('-')){
                let s = token.split('-');
                let from = parseInt(s[0]);
                let to = s[1].trim();
                if(to){
                    to = parseInt(to);
                    for(let j = from; j <= to; ++j)
                        indices.push(j);
                }
                else
                    indices.push(-from);
            }
            else
                indices.push(parseInt(token));
        }

        return indices;
    }

    function isKeyword(s){
        return ['initially', 'during', 'delay', 'apply', 'reset', 'show', 'hide', 'execute', 'next', 'then', 'to', 'rewind', 'macro'].includes(s);
    }

    function detectKeywords(tokens){
        let preResult = [];
        for(let token of tokens)
            if(token.content || token.type === 'string')
                preResult.push(token);

        for( let i = 0; i < preResult.length; ++i)
            if( preResult[i].type === 'word'
                && isKeyword(preResult[i].content)
                && (i === 0
                    || (preResult[i-1].type !== 'keyword' || !['apply','to','execute','show','hide', 'macro'].includes(preResult[i-1].content))
                    && preResult[i-1].content !== ','
                    && preResult[i-1].content !== '='
                    && (i === preResult.length-1 || preResult[i+1].content !== '=')) ){
                preResult[i].type = 'keyword';
            }

        for( let i = preResult.length-1; i >= 0; --i)
            if( preResult[i].type !== 'string' && preResult[i].content === ';' && (i === preResult.length - 1 || preResult[i+1].type === 'keyword') )
                preResult[i].type = 'keyword';

        let result = [];
        for(let i = 0; i < preResult.length; ++i)
            if( !(preResult[i].content === ':' && i > 0 && preResult[i-1].type === 'keyword' && ['initially', 'next', 'then'].includes(preResult[i-1].content)))
                result.push(preResult[i]);

        return result;
    }


    /*
        Splits string into tokens
    */
    function tokenizeString(s, substitutions){
        let preResult = [{content: '', type: 'word'}];
        while(s){
            if(s.slice(0,2) === '/*'){
                let posEnd = s.indexOf('*/');
                if(posEnd === -1){
                    console.log('Unable to parse: a comment was not closed');
                    return {error: 'Unable to parse: a comment was not closed'};
                }
                s = s.slice(posEnd+2);
                preResult.push({content: '', type: 'word'});
            }
            else if(s[0] === '"' || s[0] === "'"){
                let quot = s.slice(0,3) === '"""' || s.slice(0,3) === "'''" ? s[0].repeat(3) : s[0];
                s = s.slice(quot.length);
                let posEnd = s.indexOf(quot);
                if(posEnd === -1){
                    console.log('Unable to parse: a string literal starting with ' + quot + ' was not closed');
                    return {error: 'Unable to parse: a string literal starting with ' + quot + ' was not closed'};
                }
                preResult.push({content: s.slice(0,posEnd), type: 'string'});
                preResult.push({content: '', type: 'word'});
                s = s.slice(posEnd+quot.length);
            }
            else if(s[0] === '[' && s.search(/^\[(\d+\s*(-\s*\d+)?\s*,)*(\d+\s*(-\s*\d*)?\s*)]/) === 0){
                let posEnd = s.indexOf(']');
                preResult.push({content: parseIndices(s.slice(1, posEnd).replace(/\s/g,'')), type: 'indices'});
                preResult.push({content: '', type: 'word'});
                s = s.slice(posEnd+1);
            }
            else if(s[0] === ',' || s[0] === ':' || s[0] === ';' || s[0] === '='){
                preResult.push({content: s[0], type: 'word'});
                preResult.push({content: '', type: 'word'});
                s = s.slice(1);
            }
            else if(s.search(/^\s+/) === 0){
                preResult.push({content: '', type: 'word'});
                let posNonSpace = s.search(/\S/);
                posNonSpace = posNonSpace >= 0 ? posNonSpace : s.length;
                s = s.slice(posNonSpace);
            }
            else{
                preResult[preResult.length-1].content += s[0];
                s = s.slice(1);
            }
        }

        let result = [];
        for( let i = 0; i < preResult.length; ++i){
            if(preResult[i].content || preResult[i].type === 'string'){
                result.push(preResult[i]);
            }
        }

        substitutions = substitutions ? substitutions : globalSubstitutions;

        let localSubstitutions = [];
        let resultWithoutMacroCommands = [];
        for (let i = 0; i < result.length; ++i){
            if(i <= result.length - 4 && result[i].type !== 'string' && result[i].content === 'macro'
                && ( result[i+1].type === 'string' || result[i+1].type === 'word' )
                && result[i+2].type !== 'string' && result[i+2].content === '='
                && result[i+3].type === 'string'){
                localSubstitutions.push([result[i+1].content, result[i+3].content]);
                i += 3;
            }
            else{
                resultWithoutMacroCommands.push(result[i]);
            }
        }

        substitutions = localSubstitutions.concat(substitutions);

        if(substitutions.length > 0) {
            let finalResult = [];
            substitutionLoop: for(let i = 0; i < resultWithoutMacroCommands.length; ++i){
                if(resultWithoutMacroCommands[i].type !== 'word'){
                    finalResult.push(resultWithoutMacroCommands[i]);
                }
                else{
                    for(let j = 0; j < substitutions.length; ++j){
                        if(resultWithoutMacroCommands[i].content === substitutions[j][0]){
                            let tokenList = tokenizeString(substitutions[j][1], substitutions);
                            for (let k = 0; k < tokenList.length; ++k){
                                finalResult.push(tokenList[k]);
                            }
                            continue substitutionLoop;
                        }
                    }
                    finalResult.push(resultWithoutMacroCommands[i]);
                }
            }

            return finalResult;
        }

        return resultWithoutMacroCommands;
    }


    function splitTokenList(list, keyword){
        let result = [];
        let lastSplitPos = -1;
        for(let i = 0; i < list.length; ++i){
            if(list[i].type === 'keyword' && list[i].content === keyword){
                result.push(list.slice(lastSplitPos+1, i));
                lastSplitPos = i;
            }
        }
        result.push(list.slice(lastSplitPos+1));
        return result;
    }

    function getTime(tokenList){
        let timeString = '';
        while( tokenList.length > 0 && timeString.search(/^\d+([.,]\d+)?m?s/) === -1 && ['word','string'].includes(tokenList[0].type)){
            timeString += tokenList[0].content;
            tokenList = tokenList.slice(1);
        }
        if(timeString.search(/^\d+([.,]\d+)?m?s/) === -1){
            timeString = '0';
        }

        timeString = timeString.replace(',', '.').toLowerCase();
        let time = parseFloat(timeString);
        if( !timeString.endsWith('ms') ){
            time *= 1000;
        }

        return { time: time, rest: tokenList };
    }

    /*
        Parses CSS queries with optional index filters (see also parseIndices function)
     */
    function getCssQuery(tokenList){
        let query = '';
        let indices;
        while(tokenList.length > 0 && ['word', 'string'].includes( tokenList[0].type)){
            if(query){
                query += ' ';
            }
            query += tokenList[0].content;
            tokenList = tokenList.slice(1);
        }

        if( tokenList.length > 0 && tokenList[0].type === 'indices' ){
            indices = tokenList[0].content;
            tokenList = tokenList.slice(1);
        }

        if(!query){
            query = '*';
        }
        return indices ? { query: query, rest: tokenList, indices: indices } : { query: query, rest: tokenList };
    }


    function getNextAnimationAtom(animationAtomScript){
        while( animationAtomScript.length > 0 &&
            (animationAtomScript[0].type !== 'keyword'
            || !['show','hide','execute','apply','reset'].includes(animationAtomScript[0].content))){
            animationAtomScript = animationAtomScript.slice(1);
        }
        if (animationAtomScript.length === 0 ){
            return {parsedAtom: null, rest: []};
        }

        let parsedAnimationAtom = {animationType: animationAtomScript[0].content};

        if( animationAtomScript[0].content === 'reset' ){
            parsedAnimationAtom.animationType = 'reset';
            let queryAndRest = getCssQuery(animationAtomScript.slice(1));
            animationAtomScript = queryAndRest.rest;
            parsedAnimationAtom.objectQueryString = queryAndRest.query;
            if(queryAndRest.indices){
                parsedAnimationAtom.objectQueryIndices = queryAndRest.indices;
            }
        }
        else if( ['show', 'hide'].includes(animationAtomScript[0].content) ){
            let queryAndRest = getCssQuery(animationAtomScript.slice(1));
            animationAtomScript = queryAndRest.rest;
            parsedAnimationAtom.objectQueryString = queryAndRest.query;
            if(queryAndRest.indices){
                parsedAnimationAtom.objectQueryIndices = queryAndRest.indices;
            }
        }
        else if( animationAtomScript[0].content === 'execute' ){
            animationAtomScript = animationAtomScript.slice(1);
            if(animationAtomScript.length > 0 ) {
                if (animationAtomScript[0].type === 'string') {
                    parsedAnimationAtom.code = animationAtomScript[0].content;
                }
                else if (animationAtomScript[0].type === 'word'){
                    parsedAnimationAtom.code = animationAtomScript[0].content + '();';
                }
                animationAtomScript = animationAtomScript.slice(1);
            }
        }
        else if( animationAtomScript[0].content === 'apply' ){
            parsedAnimationAtom.animationType = 'apply';
            animationAtomScript = animationAtomScript.slice(1);
            while( animationAtomScript.length > 0 && !['keyword','indices'].includes(animationAtomScript[0].type) ){
                while(animationAtomScript.length > 0 && animationAtomScript[0].content === ','){
                    animationAtomScript = animationAtomScript.slice(1);
                }
                if(animationAtomScript.length > 1 && animationAtomScript[1].content === '=' ){
                    let property = animationAtomScript[0].content;
                    let value = '';
                    animationAtomScript = animationAtomScript.slice(2);
                    if(animationAtomScript.length > 0 && animationAtomScript[0].type === 'string' ){
                        value = animationAtomScript[0].content;
                        animationAtomScript = animationAtomScript.slice(1);
                    }
                    else {
                        while( animationAtomScript.length > 0 && animationAtomScript[0].content !== ',' && ['string', 'word'].includes(animationAtomScript[0].type)
                            && (animationAtomScript.length === 1 || animationAtomScript[1].content !== '=') ){
                            if(value){
                                value += ' ';
                            }
                            value += animationAtomScript[0].content;
                            animationAtomScript = animationAtomScript.slice(1);
                        }
                    }

                    if(!parsedAnimationAtom.propertiesToAssign){
                        parsedAnimationAtom.propertiesToAssign = [];
                    }
                    parsedAnimationAtom.propertiesToAssign.push([property,value]);
                }
                else if(animationAtomScript.length > 0 && ['string', 'word'].includes(animationAtomScript[0].type)){
                    if(animationAtomScript[0].content.startsWith('-')){
                        if(!parsedAnimationAtom.classesToRemove){
                            parsedAnimationAtom.classesToRemove = [];
                        }
                        parsedAnimationAtom.classesToRemove.push(animationAtomScript[0].content.slice(1));
                    }
                    else if(animationAtomScript[0].content.startsWith('^')){
                        if(!parsedAnimationAtom.classesToToggle){
                            parsedAnimationAtom.classesToToggle = [];
                        }
                        parsedAnimationAtom.classesToToggle.push(animationAtomScript[0].content.slice(1));
                    }
                    else{
                        if(!parsedAnimationAtom.classesToAdd){
                            parsedAnimationAtom.classesToAdd = [];
                        }
                        parsedAnimationAtom.classesToAdd.push(animationAtomScript[0].content);
                    }
                    animationAtomScript = animationAtomScript.slice(1);
                }
                else {
                    animationAtomScript = animationAtomScript.slice(1);
                }
            }
            if (animationAtomScript.length > 0){
                if( animationAtomScript[0].content === 'to'){
                    animationAtomScript = animationAtomScript.slice(1);
                }
                let queryAndRest = getCssQuery(animationAtomScript);
                animationAtomScript = queryAndRest.rest;
                parsedAnimationAtom.objectQueryString = queryAndRest.query;
                if(queryAndRest.indices){
                    parsedAnimationAtom.objectQueryIndices = queryAndRest.indices;
                }
            }
        }

        if(animationAtomScript.length > 0 && animationAtomScript[0].content === 'during'){
            let timeAndRest = getTime(animationAtomScript.slice(1));
            parsedAnimationAtom.duration = timeAndRest.time;
            animationAtomScript = timeAndRest.rest;
        }

        if(animationAtomScript.length > 0 && animationAtomScript[0].content === 'delay'){
            let timeAndRest = getTime(animationAtomScript.slice(1));
            parsedAnimationAtom.delay = timeAndRest.time;
            animationAtomScript = timeAndRest.rest;
        }

       if(animationAtomScript.length > 1
            && animationAtomScript[0].type === 'keyword'
            && animationAtomScript[0].content === 'rewind'){
            animationAtomScript = animationAtomScript.slice(1);
            if(animationAtomScript.length > 1 && animationAtomScript[0].type === 'string'){
                parsedAnimationAtom.rewindScript = parseAnimationRawScript(detectKeywords(tokenizeString(animationAtomScript[0].content)));
                animationAtomScript = animationAtomScript.slice(1);
            }
        }

        return {parsedAtom: parsedAnimationAtom, rest: animationAtomScript}
    }


    /*
        Parses animation script that has to be performed on a single mouse click.
        Returns Array with single animation steps as elements. Steps are supposed to be performed
            one after another, each new step starts after previous finishes.
        Animation step is an array of "animation atoms". They must be performed simultaneously.
        Animation atom is an object containing all necessary information about what DOM nodes to alter
            and how to alter them.
     */
    function parseAnimationRawScript(rawScript){
        let sequenceStepScripts = splitTokenList(rawScript, 'then');
        let parsedAnimation = [];

        for(let i = 0; i < sequenceStepScripts.length; ++i){
            let sequenceStepScript = sequenceStepScripts[i];
            let parsedSequenceStep = [];
            while(sequenceStepScript.length > 0){
                let atomAndRest = getNextAnimationAtom(sequenceStepScript);
                let parsedAnimationAtom = atomAndRest.parsedAtom;
                if(parsedAnimationAtom){
                    parsedAnimationAtom.id = animationAtomIdCounter++;
                    parsedSequenceStep.push(parsedAnimationAtom);
                }
                sequenceStepScript = atomAndRest.rest;
            }

            parsedAnimation.push( parsedSequenceStep );
        }
        return parsedAnimation;
    }

    function getAnimationObjectsForAtom(animationAtom){
        let animationObjectsUnfiltered = scope.querySelectorAll( animationAtom.objectQueryString );
        let animationObjects = [];
        for(let j = 0; j < animationObjectsUnfiltered.length; ++j){
            if(!animationObjectsUnfiltered[j].classList.contains('custom-animation-carrier') && animationObjectsUnfiltered[j].tagName.toLowerCase() !== 'script'){
                animationObjects.push(animationObjectsUnfiltered[j]);
            }
        }
        if(animationObjects.length === 0 && animationAtom.objectQueryString === '*'){
            animationObjects = [scope];
        }
        return animationObjects;
    }

    /*
        Perform the animation.
     */
    function playAnimation(animationSequence, scope, ignoreDelay, noBackup){
        if( !scope ){
            scope = document;
        }
        for (let nStep = 0; nStep < animationSequence.length; ++nStep){
            let animationStepAtoms = animationSequence[nStep];
            let animationStepDuration = 0.0;
            for (let i = 0; i < animationStepAtoms.length; ++i){
                let animationAtom = animationStepAtoms[i];

                let totalAtomCompletionTime = 0.0;
                if(animationAtom.duration){
                    totalAtomCompletionTime += animationAtom.duration;
                }
                if(animationAtom.delay){
                    totalAtomCompletionTime += animationAtom.delay;
                }

                animationStepDuration = Math.max(animationStepDuration, totalAtomCompletionTime);

                if(animationAtom.delay > 0 && !ignoreDelay){
                    setTimeout(
                        function(){  playAnimation([[animationAtom]], scope, true)  },
                        animationAtom.delay
                    );
                    continue;
                }

                if (animationAtom.animationType === 'execute') {
                    eval(animationAtom.code);
                    continue;
                }

                let animationObjects = getAnimationObjectsForAtom(animationAtom);

                for (let j = 0; j < animationObjects.length; ++j){
                    if( animationAtom.objectQueryIndices && animationAtom.objectQueryIndices.indexOf(j) < 0
                        && (animationAtom.objectQueryIndices[animationAtom.objectQueryIndices.length-1] >= 0
                            || j < -animationAtom.objectQueryIndices[animationAtom.objectQueryIndices.length-1]) ){
                        continue;
                    }

                    let node = animationObjects[j];
                    let animationType = animationAtom.animationType;

                    if(animationAtom.duration !== undefined){
                        node.style.transitionDuration = animationAtom.duration.toString() + 'ms';
                    }
                    else if(defaultTransitionDuration){
                        node.style.transitionDuration = defaultTransitionDuration;
                    }

                    if(animationType === 'reset'){
                        for(let p in node.dataset){
                            if(p.startsWith('animationInitialBackup')){
                                let parameter = camelToDashed(p);
                                parameter = parameter.slice('animation-initial-backup-'.length);
                                if(parameter.startsWith('class-')){
                                    parameter = parameter.slice('class-'.length);
                                    if(node.dataset[p] === 'true'){
                                        node.classList.add(parameter);
                                    }
                                    else{
                                        node.classList.remove(parameter);
                                    }
                                }
                                else if(parameter.startsWith('general-')){
                                    parameter = parameter.slice('general-'.length);
                                    node.setAttribute(parameter, node.dataset[p]);
                                }
                                else{
                                    node.style[parameter] = node.dataset[p];
                                }
                            }
                            else if(p.search(/^dataAnimation\d+Backup/) === 0){
                                node.removeAttribute(camelToDashed(p));
                            }
                        }
                    }
                    if(animationType === 'show') {
                        animationType = 'apply';
                        animationAtom.propertiesToAssign = [];
                        if(node.style.visibility !== 'visible'){
                            animationAtom.propertiesToAssign.push(['visibility','visible']);
                        }
                        if(node.style.opacity === '0'){
                            animationAtom.propertiesToAssign.push(['opacity','1']);
                        }
                    }
                    if(animationType === 'hide') {
                        animationType = 'apply';
                        animationAtom.propertiesToAssign = [];
                        if(node.style.visibility !== 'hidden'){
                            if(animationAtom.duration > 0){
                                animationAtom.propertiesToAssign.push(['opacity','0']);
                            }
                            else{
                                animationAtom.propertiesToAssign.push(['visibility','hidden']);
                            }

                        }
                    }
                    if(animationType === 'apply'){
                        let classesToAdd = animationAtom.classesToAdd;
                        let classesToRemove = animationAtom.classesToRemove;
                        let classesToToggle = animationAtom.classesToToggle;
                        let propertiesToAssign = animationAtom.propertiesToAssign;
                        function backupClass(cls){
                            let bakupAttr = 'data-animation' + animationAtom.id.toString() + '-backup-class-' + cls;
                            if(!noBackup && !node.hasAttribute(bakupAttr)){
                                node.setAttribute(bakupAttr, node.classList.contains(cls));
                            }
                            let initialBackupAttr = 'data-animation-initial-backup-class-' + cls;
                            if(!noBackup && !node.hasAttribute(initialBackupAttr)){
                                node.setAttribute(initialBackupAttr, node.classList.contains(cls));
                            }
                        }
                        if(classesToAdd){
                            for(let k = 0; k < classesToAdd.length; ++k){
                                backupClass(classesToAdd[k]);
                                node.classList.add(classesToAdd[k]);
                            }
                        }
                        if(classesToRemove){
                            for(let k = 0; k < classesToRemove.length; ++k){
                                backupClass(classesToRemove[k]);
                                node.classList.remove(classesToRemove[k]);
                            }
                        }
                        if(classesToToggle){
                            for(let k = 0; k < classesToToggle.length; ++k){
                                backupClass(classesToToggle[k]);
                                if(node.classList.contains(classesToToggle[k])){
                                    node.classList.remove(classesToToggle[k]);
                                }
                                else {
                                    node.classList.add(classesToToggle[k]);
                                }
                            }
                        }
                        if(propertiesToAssign){
                            for(let k = 0; k < propertiesToAssign.length; ++k){
                                let property = propertiesToAssign[k][0];
                                let value = propertiesToAssign[k][1];
                                if(property[0] === '*'){
                                    property = property.slice(1);
                                    let backupAttr = 'data-animation' + animationAtom.id.toString() + '-backup-general-' + property;
                                    if(!noBackup && !node.hasAttribute(backupAttr)){
                                        node.setAttribute(backupAttr, node.getAttribute(property));
                                    }
                                    let initialBackupAttr = 'data-animation-initial-backup-general-' + property;
                                    if(!noBackup && !node.hasAttribute(initialBackupAttr)){
                                        node.setAttribute(initialBackupAttr, node.getAttribute(property));
                                    }
                                    node.setAttribute(property, value);
                                }
                                else{
                                    let backupAttr = 'data-animation' + animationAtom.id.toString() + '-backup-' + property;
                                    if(!noBackup && !node.hasAttribute(backupAttr)){
                                        node.setAttribute(backupAttr, node.style[property]);
                                    }
                                    let initialBackupAttr = 'data-animation-initial-backup-' + property;
                                    if(!noBackup && !node.hasAttribute(initialBackupAttr)){
                                        node.setAttribute(initialBackupAttr, node.style[property]);
                                    }
                                    node.style[property] = value;
                                }
                            }
                        }
                    }
                }
            }

            if(animationStepDuration > 0){
                let remainingSteps = animationSequence.slice(nStep + 1);
                setTimeout(
                    function(){  playAnimation(remainingSteps, scope, false)  },
                    animationStepDuration
                );
                return;
            }
        }
    }

    /*
        Reverse the animation.
    */
    function rewindAnimation(animationSequence, scope){
        for(let i = animationSequence.length-1; i >= 0 ; --i){
            for(let j = animationSequence[i].length-1; j >= 0 ; --j){
                let animationAtom = animationSequence[i][j];
                if(animationAtom.rewindScript){
                    playAnimation(animationAtom.rewindScript, scope, false, true);
                    continue;
                }

                let backupAttrPrefix = 'data-animation' + animationAtom.id.toString() + '-backup-';

                let animationObjects = getAnimationObjectsForAtom(animationAtom);

                for (let k = 0; k < animationObjects.length; ++k){
                    let node = animationObjects[k];
                    let oldTransitionDuration = node.style.transitionDuration;
                    node.style.transitionDuration = '0s';

                    if(['apply','show','hide'].includes(animationAtom.animationType)){
                        let classes = [];
                        if(animationAtom.classesToAdd){
                            classes = classes.concat(animationAtom.classesToAdd);
                        }
                        if(animationAtom.classesToRemove){
                            classes = classes.concat(animationAtom.classesToRemove);
                        }
                        if(animationAtom.classesToToggle){
                            classes = classes.concat(animationAtom.classesToToggle);
                        }

                        for(let m = 0; m < classes.length; ++m) {
                            let cls = classes[m];
                            if (node.getAttribute(backupAttrPrefix + 'class-' + cls) === 'false') {
                                node.classList.remove(cls);
                            }
                            if (node.getAttribute(backupAttrPrefix + 'class-' + cls) === 'true') {
                                node.classList.add(cls);
                            }
                        }

                        if(animationAtom.propertiesToAssign){
                            for(let m = 0; m < animationAtom.propertiesToAssign.length; ++m){
                                let property = animationAtom.propertiesToAssign[m][0];
                                if(property[0] === '*'){
                                    property = property.slice(1);
                                    if(node.hasAttribute(backupAttrPrefix + 'general-' + property)){
                                        node.setAttribute(property, node.getAttribute(backupAttrPrefix + 'general-' + property));
                                    }
                                }
                                else{
                                    if(node.hasAttribute(backupAttrPrefix + property)){
                                        node.style[property] = node.getAttribute(backupAttrPrefix + property);
                                    }
                                }
                            }
                        }
                    }

                    node.style.transitionDuration = oldTransitionDuration;
                }
            }
        }
    }

    function getParentSlide(node){
        while(node.tagName.toLowerCase() !== 'section' && node.tagName.toLowerCase() !== 'body'){
            node = node.parentNode;
        }
        return node;
    }

    function getFragmentForScript(scriptNode){
        if(scriptNode.hasAttribute('data-fragment')){
            let indexRegExp = /\[\s*\d+\s*]\s*$/;
            let query = scriptNode.getAttribute('data-fragment');
            let indexPosition = query.search(indexRegExp);
            if(indexPosition >= 0){
                let index = parseInt(query.slice(indexPosition + 1));
                query = query.replace(indexRegExp, '');
                query = query.replace(/\s*$/g, '');
                if(!query.endsWith('.fragment')){
                    query += '.fragment';
                }
                return getParentSlide(scriptNode).querySelectorAll(query)[index];
            }
            else{
                if(query){
                    if(!query.endsWith('.fragment')){
                       query += '.fragment';
                    }
                    return getParentSlide(scriptNode).querySelector(query);
                }
                if(scriptNode.parentNode.classList.contains('fragment')){
                    return scriptNode.parentNode;
                }
                let sibling = scriptNode.previousSibling;
                while( sibling && !sibling.classList ) {
                    sibling = sibling.previousSibling;
                }
                if(sibling && sibling.classList.contains('fragment')){
                    return sibling;
                }
                sibling = scriptNode.nextSibling;
                while( sibling && !sibling.classList ) {
                    sibling = sibling.nextSibling;
                }
                if(sibling && sibling.classList.contains('fragment')){
                    return sibling;
                }
            }
        }
        return null;
    }

    function createVirtualCarrierForAnimation(anim){
        let carrier = document.createElement('a');
        carrier.classList.add('fragment');
        carrier.classList.add('custom-animation-carrier');
        carrier['data-custom-animation-carrier'] = anim;
        return carrier;
    }

    function insertAfter(referenceNode, newNode){
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling)
    }

    function initializeAnimationsOnPage(){
        let animations = document.querySelectorAll('script[type="text/animation"]');
        let initialSettings = [];

        for(let animScriptDomElement of animations){
            let slide = getParentSlide(animScriptDomElement);
            let fragment = getFragmentForScript(animScriptDomElement);
            let animScripts = splitTokenList(detectKeywords(tokenizeString(animScriptDomElement.textContent)), 'next');

            for(let j = 0, lastAnimCarrier = animScriptDomElement; j < animScripts.length; ++j) {
                let animationRawScript = animScripts[j];
                if(j === 0 && animationRawScript.length > 0 && animationRawScript[0].content === 'initially'){
                    let animationScript = parseAnimationRawScript(animationRawScript.slice(1));
                    let scope = animScriptDomElement.parentNode;

                    initialSettings.push({
                        slide: slide,
                        animation: animationScript,
                        scope: scope
                    });
                    continue;
                }

                let animation = parseAnimationRawScript(animationRawScript);
                if(fragment && j === 0){
                        fragment['data-custom-animation-carrier'] = animation;
                        lastAnimCarrier = fragment;
                }
                else{
                    let newNode = createVirtualCarrierForAnimation(animation);
                    insertAfter(lastAnimCarrier, newNode);
                    lastAnimCarrier = newNode;
                }
            }
        }

        if(animations.length > 0){
            Reveal.addEventListener('fragmentshown', function (event) {
                if (event.fragment['data-custom-animation-carrier']){
                    playAnimation(event.fragment['data-custom-animation-carrier'], event.fragment.parentNode, false);
                }
            });
            Reveal.addEventListener('fragmenthidden', function (event) {
                if (event.fragment['data-custom-animation-carrier']){
                    rewindAnimation(event.fragment['data-custom-animation-carrier'], event.fragment.parentNode);
                }
            });

            if(initialSettings.length > 0){
                function initializer(event){
                    for(let i = 0; i < initialSettings.length; ++i){
                        if( event.currentSlide === initialSettings[i].slide ){
                            Reveal.navigateFragment(-1);
                            playAnimation(initialSettings[i].animation, initialSettings[i].scope, false);
                            break;
                        }
                    }
                }
                Reveal.addEventListener('slidechanged', initializer);
            }
        }
    }

    initializeAnimationsOnPage();
})();