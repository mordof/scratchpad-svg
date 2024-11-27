import { makeSVG, makeInstruction } from './scratchpad.mjs'

const container = document.getElementById("scratchpad");

const width = container.clientWidth;
const height = container.clientHeight;

container.appendChild(
    makeSVG({ 
        style: {
            display: 'inline-block',
            width: `${width}px`,
            height: `${height}px`,
        },
        viewBox: `0 0 ${width} ${height}`,
        width: width, 
        height: height,
        version: '1.1'
    })
)

makeInstruction('When !c2f is typed...', 'yellow', 20, 20, true, false)

let inst = makeInstruction('/me {param} C is {result} F.', '#cccc00', 200, 200, true)

inst.setStrokeSize(1)

// setTimeout(() => {
//     inst.setStrokeSize(3)
// }, 5000)

makeInstruction('/me {param} C is {result} F.', 'cyan', 100, 100, false)
