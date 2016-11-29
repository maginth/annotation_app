//	                                               (\_/)
//	  /\_/\                                        (^ç^)
//	w( °u° )                                        ) (
//	|(~~~~~)        /|/|  __   _  `  __  /-/)   ___/(_)\__
//	|(")_(")~>    (/   |_(_/(_( )_|_//(_/_/\_      "w w"
//	                           / 
//	                          (_)
// Mathieu Guinin
// math.guin@gmail.com
// (+33)625759475
/*
    annotationSet : liste des annotation envoyé au serveur en json par annotationApp.submit_annotations
    – mot : premier mot de l’annotation (string)
    – nocc : numéro de l’occurence du mot (/!\ lowercase avec accent /!\) (le « combientième » mot dans le texte)
    – longueur : nombre de mots de l’annotation
    – type : par exemple « avocat »
*/
var Annotation = (function () {
    function Annotation() {
    }
    return Annotation;
}());
var annotationSet = [];
/*
    definition de l'application
*/
var annotationApp = new Vue({
    el: "#annotation-app",
    data: {
        categories: param.categories,
        message_submit: ""
    },
    methods: {
        submit_annotations: function () {
            var json_annotations = JSON.stringify(annotationSet);
            Vue.http.post(annotationApp.post_adress, json_annotations).then(function (response) {
                annotationApp.message_submit = "(Success)";
                refresh(JSON.parse(response) || {});
            }, function (response) {
                annotationApp.message_submit = "(Error)";
                annotationOverlay.visible = true;
                annotationOverlay.json_annotations = json_annotations;
                annotationOverlay.post_adress = param.post_adress;
                annotationOverlay.refresh_data = '\n{\n\
        "html" : "le nouveau text à charger",\n\
        "annotations" : [{"mot": "nouveau", "nocc": 1, "longueur": 2, "type": "loi"}]\n\}';
                enterAction = annotationOverlay.refresh;
            });
        }
    }
});
/*
    Overlay pour manipuler manuellement les donnés en cas d'erreur d'envoie des annotations
*/
var annotationOverlay = new Vue({
    el: "#annotation-overlay",
    data: {
        visible: false,
        post_adress: "",
        json_annotation: ""
    },
    methods: {
        refresh: function () {
            try {
                var parsed = JSON.parse(this.refresh_data);
            }
            catch (e) {
                alert("erreur de syntax json");
            }
            refresh(parsed);
            this.visible = false;
            enterAction = annotationApp.submit_annotations;
        }
    }
});
/*
    ajoute l'annotation à la liste et surligne les mots
*/
function loadAnnotation(annotation, target) {
    try {
        var wos = new WordOffsets(target);
        var range = document.createRange();
        var wordIndex = wos.getWordIndex(annotation);
        var start = wos.wordOffsets[wordIndex];
        var end = wos.wordOffsets[wordIndex + annotation.longueur - 1];
        range.setStart(start.node, start.offsetNode);
        range.setEnd(end.node, end.offsetNode + end.word.length);
        wrappe_range(annotation.type, range);
        annotationSet.push(annotation);
    }
    catch (e) {
        console.error("annotation can't be loaded", annotation);
    }
}
/*
    charge le text et les annotation fournis dans data
*/
function refresh(data) {
    var target = document.querySelector(param.target);
    if (data.html) {
        target.innerHTML = data.html;
        annotationSet = [];
    }
    if (data.annotations) {
        for (var _i = 0, _a = data.annotations; _i < _a.length; _i++) {
            var annotation = _a[_i];
            loadAnnotation(annotation, target);
        }
    }
}
/*
    scroll to the app
*/
window.addEventListener("load", function (e) { return window.location.hash = "#annotation-app"; });
/*
    recupération de la config de param.js
*/
var color = {};
var hotkey = {};
param.categories.map(function (e) { color[e.name] = e.color; hotkey[e.hotkey] = e.name; });
var enterAction = annotationApp.submit_annotations;
document.addEventListener("keypress", function (e) {
    if (hotkey[e.key])
        wrappe_selection(hotkey[e.key]);
    if (e.keyCode == 13)
        enterAction();
});
/*
    définition de la plage de caractères que peut contenir un mot pour les délimiter
*/
var regWord = /[\wáàâäãåçéèêëíìîïñóòôöõúùûüýÿæœÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸÆŒ]+/g;
var regLetter = /[\wáàâäãåçéèêëíìîïñóòôöõúùûüýÿæœÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸÆŒ]/;
/*
    élements html pour surligner le text
*/
function TagWrapper(type, tag) {
    var res = tag || document.createElement("span");
    res.isAnnotationTag = true;
    res.className = "tag_wrapper " + type;
    res.style.backgroundColor = color[type];
    res.onclick = function () { return removeTag(res); };
    return res;
}
function removeTag(tag) {
    annotationSet.splice(annotationSet.indexOf(tag.annotation), 1);
    tag.outerHTML = tag.innerHTML;
}
/*
    l'ensemble du contenu de param.taget est découpé en mot et nettoyé de la ponctuation pour une recherche aisé
    la correspondance avec le contenu html est conservé grace aux attributs node et offsetNode
*/
var WordOffset = (function () {
    function WordOffset() {
    }
    return WordOffset;
}());
var WordOffsets = (function () {
    function WordOffsets(root) {
        this.wordOffsets = [];
        this.noccs = {};
        this.initNodeOffests(root, 0);
        this.cleanText = " " + this.wordOffsets.map(function (w) { return w.word; }).join("  ") + " ";
    }
    // browse words in a text node and register their metadata in wordOffsets
    WordOffsets.prototype.initWordOffsets = function (node, offset) {
        var capture;
        while (capture = regWord.exec(node.textContent)) {
            var word = capture.toString().toLowerCase();
            var nocc = this.noccs[word] = (this.noccs[word] || 0) + 1;
            this.wordOffsets.push({ word: word, node: node, offsetNode: capture.index, offset: offset, nocc: nocc });
            offset += word.length + 2; // +2 the word will be surounded by two spaces in cleanText
        }
        return offset;
    };
    // browse all text nodes in depth
    WordOffsets.prototype.initNodeOffests = function (node, offset) {
        if (node.nodeType == Node.TEXT_NODE) {
            return this.initWordOffsets(node, offset);
        }
        else {
            var childs = node.childNodes;
            for (var i = 0; i < childs.length; i++)
                offset = this.initNodeOffests(childs[i], offset);
            return offset;
        }
    };
    WordOffsets.prototype.getWordOffset = function (offset) {
        var prev;
        for (var _i = 0, _a = this.wordOffsets; _i < _a.length; _i++) {
            var w = _a[_i];
            if (offset < w.offset)
                return prev;
            prev = w;
        }
        return prev;
    };
    WordOffsets.prototype.getWordIndex = function (annotation) {
        var word = annotation.mot.toLowerCase();
        for (var index in this.wordOffsets) {
            var wo = this.wordOffsets[index];
            if (wo.nocc == annotation.nocc && wo.word == word)
                return parseInt(index);
        }
        return null;
    };
    WordOffsets.prototype.getRange = function (offset1, offset2) {
        var start = this.getWordOffset(offset1), end = this.getWordOffset(offset2 - 1);
        var range = document.createRange();
        range.setStart(start.node, start.offsetNode);
        range.setEnd(end.node, end.offsetNode + end.word.length);
        range.wordOffset = start;
        return range;
    };
    WordOffsets.prototype.findSimilarRanges = function (selection) {
        var words = selection.match(regWord);
        var ranges = [];
        if (words != null) {
            var pattern = new RegExp(" " + words.join("  ") + " ", "ig");
            var capture = void 0;
            while (capture = pattern.exec(this.cleanText))
                ranges.push(this.getRange(capture.index, capture.index + capture[0].length));
        }
        return ranges;
    };
    return WordOffsets;
}());
/*
    ajuste la selection au mots les plus proches
*/
function snapSelectionToWord() {
    var sel;
    // Check for existence of window.getSelection() and that it has a
    // modify() method. IE 9 has both selection APIs but no modify() method.
    sel = window.getSelection();
    if (!sel.isCollapsed) {
        var _a = ["forward", "backward", 1, 0], d1 = _a[0], d2 = _a[1], m1_1 = _a[2], m2_1 = _a[3];
        // Detect if selection is backwards
        var range = document.createRange();
        range.setStart(sel.anchorNode, sel.anchorOffset);
        range.setEnd(sel.focusNode, sel.focusOffset);
        if (range.collapsed)
            _b = [d2, d1, m2_1, m1_1], d1 = _b[0], d2 = _b[1], m1_1 = _b[2], m2_1 = _b[3];
        range.detach();
        var text_1 = " " + sel.anchorNode.textContent + " ";
        var isw = function (reg) { return reg.test(text_1[sel.anchorOffset + m1_1]); };
        var endNode = sel.focusNode, endOffset = sel.focusOffset;
        sel.collapse(sel.anchorNode, sel.anchorOffset);
        for (var i = sel.anchorOffset + m1_1; i >= 0 && i < text_1.length && !isw(regLetter); i += m1_1 - m2_1)
            sel.modify("move", d1, "character");
        for (var i = sel.anchorOffset; i >= 0 && i < text_1.length && regLetter.test(text_1[i]); i -= m1_1 - m2_1)
            sel.modify("move", d2, "character");
        sel.extend(endNode, endOffset);
        text_1 = " " + endNode.textContent + " ";
        isw = function (reg) { return reg.test(text_1[sel.focusOffset + m2_1]); };
        for (var i = sel.focusOffset + m2_1; i >= 0 && i < text_1.length - 1 && isw(regLetter); i += m1_1 - m2_1)
            sel.modify("extend", d1, "character");
        for (var i = sel.focusOffset + m2_1; i >= 0 && i < text_1.length - 1 && !isw(regLetter); i -= m1_1 - m2_1)
            sel.modify("extend", d2, "character");
    }
    var _b;
}
document.addEventListener("mouseup", snapSelectionToWord);
/*
    permet de vérifié que le contenu n'est pas déjà suligné (= dans un tag)
*/
function getParentTag(el) {
    if (el) {
        if (el.isAnnotationTag)
            return el;
        else
            return getParentTag(el.parentNode);
    }
    return null;
}
/*
    excécute la recherche sur la base du text sélectionné et surligne tous les fragments similaires
    une annotation est créé ou mise à jour pour chaque fragment trouvé
*/
function wrappe_selection(type) {
    var wos = new WordOffsets(document.querySelector(param.target));
    var sel = window.getSelection();
    if (sel.isCollapsed)
        return;
    var cleanString = sel.toString().toLowerCase();
    sel.removeAllRanges();
    var words = cleanString.match(regWord);
    var first_word = words[0];
    var ranges = wos.findSimilarRanges(cleanString);
    for (var _i = 0, ranges_1 = ranges; _i < ranges_1.length; _i++) {
        var range = ranges_1[_i];
        var tag = wrappe_range(type, range);
        if (tag) {
            var annotation = {
                mot: first_word,
                nocc: range.wordOffset.nocc,
                longueur: words.length,
                type: type
            };
            tag.annotation = annotation;
            annotationSet.push(annotation);
        }
    }
}
function wrappe_range(type, range) {
    var tag = getParentTag(range.startContainer);
    if (tag != null) {
        if (tag.textContent == range.toString()) {
            TagWrapper(type, tag);
            tag.annotation.type = type;
        }
        return tag;
    }
    tag = TagWrapper(type, null);
    try {
        range.surroundContents(tag);
    }
    catch (e) {
        if (range.endContainer.textContent.length == range.endOffset)
            range.setEndAfter(range.endContainer.parentNode);
        if (range.startOffset == 0)
            range.setStartBefore(range.startContainer.parentNode);
        range.surroundContents(tag);
    }
    return tag;
}
