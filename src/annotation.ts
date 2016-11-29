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
	Cette application utilise Vue.js 2
	Modifiez le fichier de configuration config.js pour ajouter ou supprimer des catégories d'annotations
	L'intégration dans une page se fait en ajoutant le code html de annotation_app_template.html (voir l'exemple)
*/
declare var Vue: any
declare var param:any
/*
	annotationSet : liste des annotation envoyé au serveur en json par annotationApp.submit_annotations
	– mot : premier mot de l’annotation (string)
	– nocc : numéro de l’occurence du mot (/!\ lowercase avec accent /!\) (le « combientième » mot dans le texte)
	– longueur : nombre de mots de l’annotation
	– type : par exemple « avocat »
*/
class Annotation {
	mot: string
	nocc: number
	longueur: number
	type: AnnotationType
}

let annotationSet:Annotation[] = [];

/*
	definition de l'application
*/
var annotationApp = new Vue({
	el : "#annotation-app",
	data: {
		categories: param.categories,
		message_submit: ""
	},
	methods: {
		submit_annotations: function() {
			let json_annotations = JSON.stringify(annotationSet)
			Vue.http.post(annotationApp.post_adress, json_annotations).then((response) => {

				if (response.status >= 200 && response.status < 207) {
				    annotationApp.message_submit = "(Success)"
				    try {
				    	var parsed = JSON.parse(response)
				    } catch(e) {
				    	errorNetwork()
				    }
		    		refresh(parsed)
				}
			    else
			    	errorNetwork()

		  }, (response) => {
		    errorNetwork()
		  });
		}
	}
})

function errorNetwork() {
	let ovl = annotationOverlay
	annotationApp.message_submit = "(Error)"

    ovl.visible = true
    ovl.json_annotations = JSON.stringify(annotationSet)
    ovl.post_adress = param.post_adress
	ovl.refresh_data = '\n{\n\
"html" : "le nouveau text à charger",\n\
"annotations" : [{"mot": "nouveau", "nocc": 1, "longueur": 2, "type": "loi"}]\n\}'

	enterAction = ovl.refresh
}
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
		refresh: function() {
			try {
				var parsed = JSON.parse(this.refresh_data)
			} catch(e) {
				alert("erreur de syntax json")
			}
			refresh(parsed)
			this.visible = false
			enterAction = annotationApp.submit_annotations
		}
	}
})

/*
	ajoute l'annotation à la liste et surligne les mots
*/ 
function loadAnnotation(annotation:Annotation, target:Node) {

	try {
		let wos = new WordOffsets(target)
		let range = document.createRange()

		var wordIndex = wos.getWordIndex(annotation)
		let start = wos.wordOffsets[wordIndex]
		let end = wos.wordOffsets[wordIndex + annotation.longueur - 1]
		range.setStart(start.node, start.offsetNode)
		range.setEnd(end.node, end.offsetNode + end.word.length)
		wrappe_range(annotation.type, range)
		annotationSet.push(annotation)
	} catch (e) {
		console.error("annotation can't be loaded", annotation)
	}
}

/*
	charge le text et les annotation fournis dans data
*/
function refresh(data) {
	let target = document.querySelector(param.target)
	if (data.html) {
		target.innerHTML = data.html
		annotationSet = []
	}
	if (data.annotations) {
		for (let annotation of data.annotations) {
			loadAnnotation(annotation, target)
		}
	}
}

/*
	scroll to the app
*/
window.addEventListener("load", e => window.location.hash = "#annotation-app")


/*
	recupération de la config de param.js
*/
let color:any = {}
let hotkey:any = {}
;(param.categories as Array<any>).map(e => {
	color[e.name] = e.color
	hotkey[e.hotkey] = e.name
})

let enterAction = annotationApp.submit_annotations

document.addEventListener("keypress", (e:KeyboardEvent) => {
	if (hotkey[e.key])
		wrappe_selection(hotkey[e.key])
	if (e.keyCode == 13)
		enterAction()
})

/*
	définition de la plage de caractères que peut contenir un mot pour les délimiter
*/
const regWord = /[\wáàâäãåçéèêëíìîïñóòôöõúùûüýÿæœÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸÆŒ]+/g
const regLetter = /[\wáàâäãåçéèêëíìîïñóòôöõúùûüýÿæœÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸÆŒ]/

/*
	élements html pour surligner le text
*/
function TagWrapper(type:string, tag) {
	let res:any = tag || document.createElement("span")
	res.isAnnotationTag = true
	res.className = "tag_wrapper " + type
	res.style.backgroundColor = color[type]
	res.onclick = () => removeTag(res)
	return res
}

function removeTag(tag) {
	annotationSet.splice(annotationSet.indexOf(tag.annotation), 1)
	tag.outerHTML = tag.innerHTML
}

type AnnotationType = string

/*
	l'ensemble du contenu de param.taget est découpé en mot et nettoyé de la ponctuation pour une recherche aisé
	la correspondance avec le contenu html est conservé grace aux attributs node et offsetNode
*/
class WordOffset {
	word:string
	node:Node
	offsetNode:number
	offset:number
	nocc:number
}

class WordOffsets {
	wordOffsets:WordOffset[] = []
	cleanText:string
	noccs:any = {}

	constructor(root:Node) {
		this.initNodeOffests(root, 0)
		this.cleanText = " " + this.wordOffsets.map(w => w.word).join("  ") + " "
	}

	// browse words in a text node and register their metadata in wordOffsets
	initWordOffsets(node:Node, offset:number) {
		let capture:RegExpExecArray
		while(capture = regWord.exec(node.textContent)) {
			let word:string = capture.toString().toLowerCase()
			let nocc = this.noccs[word] = (this.noccs[word] || 0) + 1
			this.wordOffsets.push({word, node, offsetNode: capture.index, offset, nocc})
			offset += word.length + 2 // +2 the word will be surounded by two spaces in cleanText
		}
		return offset
	}

	// browse all text nodes in depth
	initNodeOffests(node:Node, offset:number) {
		if (node.nodeType == Node.TEXT_NODE) {
			return this.initWordOffsets(node, offset)
		} else {
			let childs = node.childNodes
			for (let i=0; i < childs.length; i++)
				offset = this.initNodeOffests(childs[i], offset)
			return offset
		}
	}

	getWordOffset(offset) {
		let prev:WordOffset
		for (let w of this.wordOffsets) {
			if (offset < w.offset)
				return prev
			prev = w
		}
		return prev
	}

	getWordIndex(annotation:Annotation):number {
		let word = annotation.mot.toLowerCase()
		for (let index in this.wordOffsets) {
			let wo = this.wordOffsets[index]
			if (wo.nocc == annotation.nocc && wo.word == word)
				return parseInt(index)
		}
		return null
	}

	getRange(offset1, offset2) {
		let start = this.getWordOffset(offset1),
			end   = this.getWordOffset(offset2 - 1)

		let range = document.createRange()
		range.setStart(start.node, start.offsetNode)
		range.setEnd(end.node, end.offsetNode + end.word.length)
		;(<any> range).wordOffset = start
		return range
	}

	findSimilarRanges(selection:string) {
		let words = selection.match(regWord)
		let ranges:Range[] = []
		if (words != null)
		{
			let pattern = new RegExp(" " + words.join("  ") + " ", "ig")
			let capture:RegExpExecArray
			while(capture = pattern.exec(this.cleanText))
				ranges.push(this.getRange(capture.index, capture.index + capture[0].length))
		}
		return ranges
	}
}


/*
	ajuste la selection au mots les plus proches
*/
function snapSelectionToWord() {
    var sel;

    // Check for existence of window.getSelection() and that it has a
    // modify() method. IE 9 has both selection APIs but no modify() method.
    sel = window.getSelection();
    if (!sel.isCollapsed) {

        let [d1, d2, m1, m2] = ["forward", "backward", 1 , 0]

        // Detect if selection is backwards
        var range = document.createRange();
        range.setStart(sel.anchorNode, sel.anchorOffset);
        range.setEnd(sel.focusNode, sel.focusOffset);
        if (range.collapsed)
        	[d1, d2, m1, m2] = [d2, d1, m2, m1]
        range.detach();

        let text = " " + sel.anchorNode.textContent + " "
        
        var isw = (reg:RegExp) => reg.test(text[sel.anchorOffset+m1])

        let endNode = sel.focusNode, endOffset = sel.focusOffset
		sel.collapse(sel.anchorNode, sel.anchorOffset)
		
       	for (let i = sel.anchorOffset+m1; i >= 0 && i < text.length && !isw(regLetter); i += m1-m2)
       		sel.modify("move", d1, "character")
        for (let i = sel.anchorOffset; i >= 0 && i < text.length && regLetter.test(text[i]); i -= m1-m2)
       		sel.modify("move", d2, "character")

       	sel.extend(endNode, endOffset)
       	text = " " + endNode.textContent + " "
       	isw = (reg:RegExp) => reg.test(text[sel.focusOffset+m2])
        for (let i = sel.focusOffset+m2; i >= 0 && i < text.length-1 && isw(regLetter); i += m1-m2)
       		sel.modify("extend", d1, "character")
       	for (let i = sel.focusOffset+m2; i >= 0 && i < text.length-1 && !isw(regLetter); i -= m1-m2)
       		sel.modify("extend", d2, "character")
    }
}

document.addEventListener("mouseup", snapSelectionToWord)

/*
	permet de vérifié que le contenu n'est pas déjà suligné (= dans un tag)
*/
function getParentTag(el) {
	if (el) {
		if (el.isAnnotationTag)
			return el
		else
			return getParentTag(el.parentNode)
	}
	return null
}

/*
	excécute la recherche sur la base du text sélectionné et surligne tous les fragments similaires
	une annotation est créé ou mise à jour pour chaque fragment trouvé
*/
function wrappe_selection(type:AnnotationType) {
	let wos = new WordOffsets(document.querySelector(param.target))
	let sel = window.getSelection()
	if (sel.isCollapsed)
		return
	let cleanString = sel.toString().toLowerCase()
	sel.removeAllRanges()
 	let words = cleanString.match(regWord)
	let first_word = words[0]
	let ranges = wos.findSimilarRanges(cleanString)

	for (let range of ranges) {
		
		let tag = wrappe_range(type, range)
		if (tag) {
			let annotation = {
				mot: first_word,
				nocc: (<any> range).wordOffset.nocc,
				longueur: words.length,
				type
			}
			tag.annotation = annotation
			annotationSet.push(annotation)
		}
	}
}

function wrappe_range(type, range) {
	let tag = getParentTag(range.startContainer)
	if (tag != null) {
		if (tag.textContent == range.toString()) {
			TagWrapper(type, tag)
			tag.annotation.type = type
		}
		return tag
	}
	tag = TagWrapper(type, null)
	try {
		range.surroundContents(tag)
	} catch(e) {
		if (range.endContainer.textContent.length == range.endOffset)
			range.setEndAfter(range.endContainer.parentNode)
		if (range.startOffset == 0)
			range.setStartBefore(range.startContainer.parentNode)
		range.surroundContents(tag)
	}
	return tag
}