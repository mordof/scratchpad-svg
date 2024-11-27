import { createSnapRegion, getSnappedPair } from "./snapRegions.mjs";

let parentSVG;

const getGroupPos = (group) => {
    return {
        x: parseInt(group.getAttribute('data-x'), 10),
        y: parseInt(group.getAttribute('data-y'), 10)
    }
}

const setGroupPos = (group, x, y) => {
    group.setAttribute('data-x', x)
    group.setAttribute('data-y', y)
    group.setAttribute('transform', `translate(${x}, ${y})`)
}

const getGroupDraggingStartPos = (group) => {
    return {
        x: parseInt(group.getAttribute('data-start-x'), 10),
        y: parseInt(group.getAttribute('data-start-y'), 10)
    }
}

const setGroupDragging = (group) => {
    group.setAttribute('data-dragging', 'true')
    const { x, y } = getGroupPos(group)
    group.setAttribute('data-start-x', x)
    group.setAttribute('data-start-y', y)
}

const clearGroupDragging = (group) => {
    group.removeAttribute('data-dragging')
    group.removeAttribute('data-start-x')
    group.removeAttribute('data-start-y')
}

export const applyAttrs = (el, attrs) => {
    for (const [key, val] of Object.entries(attrs)) {
        if (key === 'style') {
            for (const [sKey, sVal] of Object.entries(val)) {
                el.style[sKey] = sVal
            }
        } else if (key === 'text') {
            el.textContent = val;
        } else {
            el.setAttribute(key, val);
        }
    }
}

export const setSVG = (svg) => {
    parentSVG = svg;
}

export const make = (ele, attrs, parent) => {
    const el = document.createElementNS(parentSVG.namespaceURI, ele)
    applyAttrs(el, attrs)

    if (parent === undefined) {
        parentSVG.appendChild(el)
    } else {
        parent.appendChild(el)
    }
    
    return el;
}

const group = (x, y, draggable = false) => {
    const g = make('g', {
        transform: `translate(${x}, ${y})`,
        'data-x': x,
        'data-y': y,
        'data-draggable': draggable,
        style: {
            'user-select': 'none',
            display: 'inline-block',
            cursor: draggable ? 'grab' : 'inherit'
        }
    })

    return g;
}

const banner = {
    width: 400,
    height: 30
}

const nestedWidth = 12;
const nestedTailHeight = 12;
const snapRegionWidth = 20;

const arc = {
    width: 18,
    top: 4,
    bottom: 26
}

/**
 * Makes an InstructionNode
 * @class
 */
export class InstructionNode {
    isTail;
    height;
    color;
    parent;
    g;

    y;
    snapRegion;

    fillPath;
    strokePath;

    type = 'InstructionNode';

    isRemoved = false;

    constructor(parentInstruction, height, color, isTail = false) {
        this.isTail = isTail;
        this.height = height;
        this.color = color;
        this.parent = parentInstruction;

        let g = group(0, 0, false)

        this.g = g;

        this.parent.g.appendChild(g)

        // fill node
        this.fillPath = make('path', {
            fill: color,
            d: this.getFillPath(1)
        }, g)

        // stroke node
        this.strokePath = make('path', {
            fill: '#00000000',
            stroke: 'black', 
            'stroke-width': 1,
            d: this.getStrokePath(1)
        }, g)

        this.snapRegion = createSnapRegion(0, 0, snapRegionWidth, banner.height, this)
    }

    deconstructor() {
        if (this.isRemoved === true) return;

        this.snapRegion.deleteRegion()

        this.parent.g.removeChild(this.g)

        this.isRemoved = true;
    }

    onSnap(instruction) {
        return this.parent.onSnap(this, instruction)
    }

    onUnSnap() {
        return this.parent.onUnSnap(this)
    }

    updateNodeShape(height, isTail) {
        this.height = height;
        this.isTail = isTail === undefined ? this.isTail : isTail;

        applyAttrs(this.fillPath, {
            d: this.getFillPath(1)
        })

        applyAttrs(this.strokePath, {
            d: this.getStrokePath(1)
        })
    }

    getFillPath(strokeSize) {
        return `
            M 0 -${strokeSize / 2}
            L ${nestedWidth} -${strokeSize / 2}
            L ${nestedWidth} ${arc.top}
            A 1 1 0 0 1 ${nestedWidth} ${arc.bottom}
            L ${nestedWidth} ${banner.height}
            L ${nestedWidth} ${this.height}
            L 0 ${this.height}
            L 0 -${strokeSize / 2}
        `
    }

    getStrokePath(strokeSize) {
        return `
            M 0 -${strokeSize / 2}
            L 0 ${this.height}
            ${this.isTail === true ? 'L' : 'M'} ${nestedWidth} ${this.height}
            L ${nestedWidth} ${arc.bottom}
            A 1 1 0 0 0 ${nestedWidth} ${arc.top}
            L ${nestedWidth} -${strokeSize / 2}
        `
    }

    setStrokeSize(size) {
        applyAttrs(this.fillPath, {
            d: this.getFillPath(size)
        })
        applyAttrs(this.strokePath, {
            'stroke-width': size,
            d: this.getStrokePath(size)
        })
    }

    updateNodeGlobalPosition() {
        const { x, y } = getGroupPos(this.parent.g)

        this.snapRegion.moveRegion(x + nestedWidth, y + this.y)

        const pair = getSnappedPair(this)

        if (pair !== undefined) {
            pair.setPos(x + nestedWidth, y + this.y)
        }
    }

    setPos(y) {
        this.y = y;
        setGroupPos(this.g, 0, this.y)

        this.updateNodeGlobalPosition();
    }

    getHeight() {
        return this.height;
    }

    markDragging() {
        this.snapRegion.disableRegion()

        const pair = getSnappedPair(this)

        if (pair !== undefined) {
            pair.markDragging()
        }
    }

    clearDragging() {
        this.snapRegion.enableRegion()

        const pair = getSnappedPair(this)

        if (pair !== undefined) {
            pair.clearDragging()
        }
    }
}

/**
 * Makes an Instruction
 * asdf
 * @class
 */
export class Instruction {
    nodes = [];
    g;
    draggable;
    hasNodes;

    color;
    strokePath;

    type = 'Instruction';

    constructor(text, color, hasNodes, draggable = true) {
        const g = group(0, 0, draggable)
        this.g = g;
        this.color = color;
        this.draggable = draggable;
        this.hasNodes = hasNodes;

        const hG = group(0, 0, false)
        g.appendChild(hG)
    
        // fill the banner header
        make('path', {
            fill: color,
            d: `
                M 0 0
                L ${banner.width} 0
                L ${banner.width} ${banner.height}
                L 0 ${banner.height}
                ${draggable 
                    ? `
                        L 0 ${arc.bottom}
                        A 1 1 0 0 0 0 ${arc.top}
                        L 0 0
                      `
                    : 'L 0 0'
                }
            `
        }, hG)
    
        // stroke the banner header
        this.strokePath = make('path', {
            fill: '#00000000',
            stroke: '#000000',
            'stroke-width': 1,
            d: this.getStrokePathData(1)
        }, hG)
    
        if (hasNodes) {
            const snapRegionsUsed = 0
            let offsetHeight = 0;
    
            // DO THE SNAP REGIONS THAT ARE CURRENTLY OCCUPIED
            for (let snapRegion = 1; snapRegion < snapRegionsUsed + 1; snapRegion++) {
                let contentHeight = (Math.random() * 60) | 0 + 10;

                let node = new InstructionNode(this, contentHeight + banner.height, color)
                node.setPos(banner.height + offsetHeight)

                this.nodes.push(node)

                offsetHeight += node.height
            }

            let node = new InstructionNode(this, nestedTailHeight + banner.height, color, true)
            node.setPos(banner.height + offsetHeight)

            this.nodes.push(node)
        }
    
        if (draggable === true) {
            // little dotted banner thing to indicate it can be dragged
            make('rect', {
                x: 20,
                y: 9,
                width: 6,
                height: 12,
                fill: 'url(#dots)'
            }, g)
    
            // Arrow (for when it's in favourites or the current tray)
            // make('path', {
    
            //     fill: 'black',
            //     d: `
            //         M 0 4
            //         L 8 0
            //         L 8 8
            //         Z
            //     `
            // }, g).setAttribute('transform', `translate(18, 10)`)
        }
        
        make('text', {
            x: draggable === true ? 32 : 20, y: 20,
            fill: 'black',
            text: text
        }, g)
    }

    getStrokePathData(strokeSize) {
        return `
            M -${strokeSize / 2} 0
            L ${banner.width} 0
            L ${banner.width} ${banner.height}
            ${this.hasNodes 
                ? `
                    L ${nestedWidth} ${banner.height}
                    M 0 ${banner.height}
                    ` 
                : `L 0 ${banner.height}`
            }
            ${this.draggable ?
                `
                    L 0 ${arc.bottom}
                    A 1 1 0 000 ${arc.top}
                ` : ''
            }
            L 0 0
        `
    }

    setStrokeSize(size) {
        applyAttrs(this.strokePath, {
            'stroke-width': size,
            d: this.getStrokePathData(size)
        })

        if (this.hasNodes === true) {
            for (let node of this.nodes) {
                node.setStrokeSize(size)
            }
        }
    }

    getHeight() {
        let height = banner.height;

        if (this.hasNodes === true) {
            for(let node of this.nodes) {
                height += node.getHeight()
            }
        }

        return height;
    }

    onSnap(node, instruction) {
        const pair = getSnappedPair(instruction);

        if (pair !== undefined && this.nodes.includes(pair)) {
            // we already have it paired to another node. don't allow it to jump.
            // the current behavior we expect is to unsnap, let it sit anywhere, re-arrange
            // whatever else is in the way, and snap it again.
            console.warn('Instruction snapping to a second node')
            return false;
        }

        const nodeIndex = this.nodes.indexOf(node)

        let newNode = new InstructionNode(this, node.height, this.color, node.isTail)

        newNode.setPos(node.y + node.height)
        this.nodes.splice(nodeIndex + 1, 0, newNode)

        node.updateNodeShape(instruction.getHeight(), false)

        this.recalculateNodePositions()

        return true;
    }

    onUnSnap(node) {
        const nodeIndex = this.nodes.indexOf(node)

        const nextNode = this.nodes[nodeIndex + 1]

        node.updateNodeShape(nextNode.height, nextNode.isTail)

        nextNode.deconstructor()

        this.nodes.splice(nodeIndex + 1, 1)

        this.recalculateNodePositions()

        return true;
    }

    setMouseDown(cb) {
        if (this.draggable === true) {
            this.g.onmousedown = cb
        }
    }

    setPos(x, y) {
        setGroupPos(this.g, x, y)

        if (this.hasNodes === true) {
            for(let node of this.nodes) {
                node.updateNodeGlobalPosition()
            }
        }
    }

    recalculateNodePositions() {
        // account for the current instruction height
        let top = banner.height;

        if (this.hasNodes === true) {
            for(let node of this.nodes) {
                node.setPos(top);
                top += node.getHeight();
            }
        }

        const pair = getSnappedPair(this)

        if (pair !== undefined) {
            pair.updateNodeShape(top);
            pair.parent.recalculateNodePositions()
        }
    }

    markDragging() {
        setGroupDragging(this.g)
        this.g.style.cursor = 'inherit'

        if (this.hasNodes === true) {
            for(let node of this.nodes) {
                node.markDragging()
            }
        }
    }

    clearDragging() {
        clearGroupDragging(this.g)
        this.g.style.cursor = 'grab'

        if (this.hasNodes === true) {
            for(let node of this.nodes) {
                node.clearDragging()
            }
        }
    }

    getDraggingPos() {
        return getGroupDraggingStartPos(this.g)
    }
}