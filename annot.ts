declare var Vue: any

class Annotation {
	mot: string
	nocc: number
	longueur: number
	type: AnnotationType
}

const annotationSet:Annotation[] = [];

function TagWrapper(type:string) {
	let res:any = document.createElement("span")
	res.className = "tag_wrapper " + type
	res.style.backgroundColor = annotationColor[type]
	res.onclick = () => removeTag(res)
	return res
}

function removeTag(tag) {
	annotationSet.splice(annotationSet.indexOf(tag.annotation))
	tag.outerHTML = tag.innerHTML
}

type AnnotationType = string

let annotationColor = {
	avocat: "Red",
	partie: "Green",
	loi: "Blue"
}

function snapSelectionToWord() {
    var sel;

    // Check for existence of window.getSelection() and that it has a
    // modify() method. IE 9 has both selection APIs but no modify() method.
    sel = window.getSelection();
    if (!sel.isCollapsed) {

        // Detect if selection is backwards
        var range = document.createRange();
        range.setStart(sel.anchorNode, sel.anchorOffset);
        range.setEnd(sel.focusNode, sel.focusOffset);
        var backwards = range.collapsed;
        range.detach();

        // modify() works on the focus of the selection
        var endNode = sel.focusNode, endOffset = sel.focusOffset;
        sel.collapse(sel.anchorNode, sel.anchorOffset);
        if (backwards) {
            sel.modify("move", "backward", "character");
            sel.modify("move", "forward", "word");
            sel.extend(endNode, endOffset);
            sel.modify("extend", "forward", "character");
            sel.modify("extend", "backward", "word");

        } else {
            sel.modify("move", "forward", "character");
            sel.modify("move", "backward", "word");
            sel.extend(endNode, endOffset);
            sel.modify("extend", "backward", "character");
            sel.modify("extend", "forward", "word");
            sel.modify("extend", "backward", "character");
        }
    }
}

function nocc(word:string, wrapper:HTMLElement, root: HTMLElement) {
	let range = document.createRange()
    range.setStart(root, 0)
    range.setEnd(wrapper, 0)

    return (range.toString().match(/\w+/) || []).filter(x => x == word).length
}


function wrappe_selection(type:AnnotationType, root: HTMLElement) {
	let cleanString = window.getSelection().toString().match(/\w.*\w|\w/)[0]
 	let words = cleanString.match(/\w+/g)
	let first_word = words[0]
	let ranges = []
	findAllRanges(new RegExp("\\W" + cleanString + "\\W", "g"), root, ranges)
	for (let range of ranges) {
		let tag = TagWrapper(type)
		range.surroundContents(tag)
		let annotation = {
			mot: first_word,
			nocc: nocc(first_word, tag, root),
			longueur: words.length,
			type
		}
		tag.annotation = annotation
		annotationSet.push(annotation)
	}
}

class WordOffset {
	word:string
	node:Node
	offsetNode:number
	offset:number
	nocc:number

	toString() {
		return this.word
	}
}

class WordOffsets {
	wordOffsets:WordOffset[] = []
	cleanText:string
	noccs:any = {}

	constructor(root:Node) {
		this.initNodeOffests(root, 0)
		this.cleanText = " " + this.wordOffsets.join("  ") + " "
	}

	initWordOffsets(node:Node, offset:number) {
		let capture:RegExpExecArray
		let pattern = /\w+/g
		while(capture = pattern.exec(node.textContent)) {
			let word:string = capture.toString()
			let nocc = this.noccs[word] = (this.noccs[word] || 0) + 1
			this.wordOffsets.push({word, node, offsetNode: capture.index, offset, nocc})
			offset += word.length + 2 // +2 the word will be surounded by two spaces in cleanText
		}
		return offset
	}

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
		for (let n:WordOffset of this.wordOffsets) {
			if (offset < n.offset)
				return prev
			prev = n
		}
		return null
	}
}

function findAllRanges(pattern:RegExp, inside:Node, res:Range[]) {
	if (inside.nodeType == Node.TEXT_NODE) {
		let capture:RegExpExecArray
		let text = inside.textContent
		while(capture = pattern.exec(text)) {
			let range = document.createRange()
			range.setStart(inside, capture.index + 1)
			range.setEnd(inside, capture.index + pattern.source.length - 1)
			res.push(range)
		}
	} else {
		let childs = inside.childNodes
		for (let i=0; i < childs.length; i++)
			findAllRanges(pattern, childs[i], res)
	}
}

document.addEventListener("mouseup", snapSelectionToWord)

document.addEventListener("keypress", (e:KeyboardEvent) => {
	let type = {1: "avocat", 2: "partie", 3: "loi"}[e.key]
	if (type)
		wrappe_selection(type, document.body)
})