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
	Modifiez le fichier de configuration param.js pour ajouter ou supprimer des catégories d'annotations
	L'intégration dans une page se fait en ajoutant le code html de annotation_app.html (voir l'exemple)
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

const annotationSet:Annotation[] = [];

/*
	definition de l'application
*/
var annotationApp = new Vue({
	el : "#annotation-app",
	props: {
		categories: param.categories,
		target: param.target,
		post_adress: param.post_adress,
		message_submit: ""
	},
	methods: {
		submit_annotations: () => {
			Vue.http.post(annotationApp.post_adress, annotationSet).then((response) => {
		    // TODO success callback
		  }, (response) => {
		    annotationApp.message_submit = "(Error)"
		  });
		}
	}
})


/*
	recupération de la config de param.js
*/
let color:any = {}
let hotkey:any = {}
;(param.categories as Array<any>).map(e => {color[e.name] = e.color; hotkey[e.hotkey] = e.name})

document.addEventListener("keypress", (e:KeyboardEvent) => {
	if (hotkey[e.key])
		wrappe_selection(hotkey[e.key])
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
	console.log(annotationSet.indexOf(tag.annotation))
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
		
        while (isw(regLetter))
       		sel.modify("move", d2, "character")
       	while (!isw(regLetter))
       		sel.modify("move", d1, "character")


       	sel.extend(endNode, endOffset)
       	text = " " + endNode.textContent + " "
       	isw = (reg:RegExp) => reg.test(text[sel.focusOffset+m2])
        while (isw(regLetter))
       		sel.modify("extend", d1, "character")
       	while (!isw(regLetter))
       		sel.modify("extend", d2, "character")
    }
}

document.addEventListener("mouseup", snapSelectionToWord)
setInterval(snapSelectionToWord, 100)

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
	let cleanString = sel.toString()
	sel.removeAllRanges()
 	let words = cleanString.match(regWord)
	let first_word = words[0]
	let ranges = wos.findSimilarRanges(cleanString)

	for (let range of ranges) {
		let tag = getParentTag(range.startContainer)
		if (tag != null) {
			if (tag.textContent == range.toString()) {
				TagWrapper(type, tag)
				tag.annotation.type = type
			}
			continue
		}
		tag = TagWrapper(type, null)
		range.surroundContents(tag)
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