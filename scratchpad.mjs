import { doesItSnap, snapPair, unSnap } from "./snapRegions.mjs";
import { make, Instruction, setSVG, applyAttrs } from "./shapes.mjs";

let svg;

let offsetX = 0;
let offsetY = 0;

let dragging;

export const makeSVG = (attrs) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    applyAttrs(el, attrs)

    svg = el;

    setSVG(svg);

    const defs = make('defs', {})

    make('rect', {
        x: 0,
        y: 0,
        width: 1.3,
        height: 1.3,
        fill: 'black'
    }, make('pattern', {
        id: 'dots',
        height: 3,
        width: 3,
        patternUnits: 'userSpaceOnUse'
    }, defs))

    svg.onmousemove = (e) => {
        if (dragging === undefined) return;

        const { x: dX, y: dY } = dragging.getDraggingPos()

        let x = e.offsetX - offsetX + dX
        let y = e.offsetY - offsetY + dY

        const { x: newX, y: newY, itSnapped, node } = doesItSnap(x, y, 10, 15)

        if (itSnapped === true) {
            snapPair(node, dragging)
        } else {
            unSnap(dragging)
        }

        dragging.setPos(newX, newY)
    }
    
    svg.onmouseup = (e) => {
        if (dragging === undefined) return;

        dragging.clearDragging()
        dragging = undefined;

        svg.style.cursor = "default"
    }
    
    return el;
}

export const makeInstruction = (text, color, x, y, hasNodes, draggable = true) => {
    const instr = new Instruction(text, color, hasNodes, draggable)

    instr.setPos(x, y)
    if (draggable === true) {
        instr.setMouseDown((e) => {
            // set the instruction we're dragging
            dragging = instr

            // instr.g is already in svg, but moving it to the end means it'll draw above
            // everything else
            svg.appendChild(instr.g)

            // record the mouse offset from the instruction
            offsetX = e.offsetX;
            offsetY = e.offsetY;

            // mark the instruction as being dragged
            instr.markDragging();

            svg.style.cursor = "grabbing";
        })
    }

    return instr
}

