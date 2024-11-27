const snapRegions = [] // for the drag snap checks

 // for all the shapes can check/manage what they're linked to when snapped
 //
 // structure: [[<Instruction | InstructionNode>, <Instruction | InstructionNode>]
const snappedPairs = []

/**
 * @typedef {import('./shapes.mjs').Instruction} Instruction
 * @typedef {import('./shapes.mjs').InstructionNode} InstructionNode
 */

/**
 * Register a snapped pair of Instruction and Node
 * @param {(Instruction|InstructionNode)} pairA - One side of the snap (order doesn't matter)
 * @param {(Instruction|InstructionNode)} pairB - Other side of the snap (order doesn't matter)
 */
export const snapPair = (pairA, pairB) => {
    const details = checkSnapDetails(pairA, pairB);

    // TODO: handle the other cases where either one side, or both, are already snapped
    //       to something

    if (details.a.isSnapped === false && details.b.isSnapped === false) {
        let success = false;

        if (pairA.type === 'InstructionNode') {
            success = pairA.onSnap(pairB)
        } else if (pairB.type === 'InstructionNode') {
            success = pairB.onSnap(pairA)
        }

        if (success === true) {
            snappedPairs.push([pairA, pairB])
        }

        return success;
    }

    return true;
}

export const unSnap = (instructionOrNode) => {
    const details = checkSnapDetails(instructionOrNode);

    if (details.a.isSnapped) {
        let success = false;

        if (instructionOrNode.type === 'Instruction') {
            success = details.a.snappedTo.onUnSnap()
        } else {
            success = instructionOrNode.onUnSnap()
        }

        if (success === true) {
            snappedPairs.splice(details.a.snapIndex, 1)
        }
    }

    return true;
}

export const getSnappedPair = (instructionOrNode) => {
    const details = checkSnapDetails(instructionOrNode);

    if (details.a.isSnapped === true) {
        return details.a.snappedTo;
    }

    return undefined;
}

const checkSnapDetails = (a, b = undefined) => {
    const details = {
        a: {
            isSnapped: false,
            snappedTo: undefined,
            snapIndex: -1
        },
        b: {
            isSnapped: false,
            snappedTo: undefined,
            snapIndex: -1
        }
    }

    for (let i = 0; i < snappedPairs.length; i++) {
        const [pairA, pairB] = snappedPairs[i];

        if (pairA === a) {
            details.a.isSnapped = true;
            details.a.snappedTo = pairB;
            details.a.snapIndex = i;
        }

        if (pairB === a) {
            details.a.isSnapped = true;
            details.a.snappedTo = pairA;
            details.a.snapIndex = i;
        }

        if (b === undefined) {
            if (details.a.isSnapped === true) {
                break;
            }
        } else {
            if (pairA === b) {
                details.b.isSnapped = true;
                details.b.snappedTo = pairB;
                details.b.snapIndex = i;
            }
    
            if (pairB === b) {
                details.b.isSnapped = true;
                details.b.snappedTo = pairA;
                details.b.snapIndex = i;
            }
    
            if (details.a.isSnapped === true && details.b.isSnapped === true) {
                break;
            }
        }
    }

    return details;
}

/**
 * Enable this Region
 */
function enableRegion() {
    this.enabled = true;
}

/**
 * Disable this Region
 */
function disableRegion() {
    this.enabled = false;
}

/**
 * Move this Region's location
 * @param {number} x
 * @param {number} y
 */
function moveRegion(x, y) {
    this.x = x;
    this.y = y;
}

/**
 * Delete this Region
 */
function deleteRegion() {
    snapRegions.splice(snapRegions.indexOf(this), 1)
}

/**
 * Create a Snap Region. 
 * Instructions being dragged around will check against these
 * to look for what to snap to.
 * @param {number} x 
 * @param {number} y 
 * @param {number} width 
 * @param {number} height 
 * @param {InstructionNode} node 
 */
export const createSnapRegion = (x, y, width, height, node) => {
    const region = { x, y, width, height, node, enabled: true };

    const controls = {
        /** @type {enableRegion} */
        enableRegion: enableRegion.bind(region),
        /** @type {disableRegion} */
        disableRegion: disableRegion.bind(region),
        /** @type {moveRegion} */
        moveRegion: moveRegion.bind(region),
        /** @type {deleteRegion} */
        deleteRegion: deleteRegion.bind(region)
    }

    snapRegions.push(region)

    return controls;
}

export const doesItSnap = (sX, sY, snapOffsetX, snapOffsetY) => {
    for (const { x, y, width, height, enabled, node } of snapRegions) {
        if (enabled !== true) continue;

        if (
               sX + snapOffsetX > x 
            && sX + snapOffsetX < x + width 
            && sY + snapOffsetY > y 
            && sY + snapOffsetY < y + height
        ) {
            return { x, y, itSnapped: true, node }
        }
    }

    return { x: sX, y: sY, itSnapped: false }
}