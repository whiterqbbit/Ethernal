import { convertToMonolithPos, monolith } from './monolith';
import { imageCatalog, animationCatalog } from '../assets/imageData';
import Const from './constants';
import { renderHeight, renderWidth, viewPosX, viewPosY, pointer, deviceType } from '../main';
import { tool, Tool } from './tools';

// var previousViewPosY;
// var previousViewPosX;
// var previousLandscape;
let activateOnce = 0;
var clock = 0;
setInterval(() => {
    clock += 100;
}, 100);

function frameInClock(anim) {
    let frame = 0;
    let delaySum = 0;
    while (delaySum < clock % anim.totalDelay) {
        delaySum += anim.frames[frame].delay;
        frame++;
    }
    if (frame >= Object.keys(anim.frames).length) frame = 0;
    return frame;
}

export function assemble() {
    let displayArray = [];
    let layersToDisplay = [];

    // Push Tooltip on pancarte
    if (isInSquare(180, 187, 14, 18, pointer.x, pointer.y)) {
        layersToDisplay.push({
            name: 'menu',
            colorsArray: imageCatalog.menu.decodedYX,
            startY: Math.floor(-(renderHeight + viewPosY - imageCatalog.menu.height - 50)),
            startX: Math.floor(-(Const.COLUMNS - imageCatalog.menu.width) / 2),
        });
    }

    // Push GUI to layersToDisplay
    layersToDisplay.push({
        name: 'palette',
        colorsArray: imageCatalog.palette.decodedYX,
        startY: Math.floor(-(renderHeight - imageCatalog.palette.height) / Const.GUI_RELATIVE_Y),
        startX: Math.floor(-(renderWidth - imageCatalog.palette.width) / Const.GUI_RELATIVE_X),
    });

    layersToDisplay.push({
        name: 'selector1',
        colorsArray: imageCatalog.selector1.decodedYX,
        startY: imageCatalog.selector1.startY,
        startX: imageCatalog.selector1.startX,
    });

    if (deviceType !== 'mobile') {
        layersToDisplay.push({
            name: 'selector2',
            colorsArray: imageCatalog.selector2.decodedYX,
            startY: imageCatalog.selector2.startY,
            startX: imageCatalog.selector2.startX,
        });
    }

    //Push animations to layersToDisplay
    for (let animation in animationCatalog) {
        const thisAnim = animationCatalog[animation];
        layersToDisplay.push({
            name: thisAnim.name,
            colorsArray: thisAnim.frames[frameInClock(thisAnim)].buffer,
            startY: thisAnim.startY - viewPosY - renderHeight,
            startX: viewPosX - thisAnim.startX,
        });
    }

    // Push monolith to layersToDisplay
    layersToDisplay.push({
        name: 'monolith',
        colorsArray: monolith,
        startY: Const.MONOLITH_LINES + Const.MARGIN_BOTTOM - viewPosY - renderHeight,
        startX: viewPosX - Const.MARGIN_LEFT,
    });

    // if (previousViewPosY !== viewPosY || previousViewPosX !== viewPosX || force) {
    for (let layer in imageCatalog) {
        const thisLayer = imageCatalog[layer];
        const parallaxOffset = Math.floor(thisLayer.parallax * viewPosY);

        if (thisLayer.type == 'GUI') continue;
        if (thisLayer.startY - thisLayer.height - parallaxOffset > viewPosY + renderHeight) continue; // If the layer above render, skip it
        if (Const.LINES - thisLayer.startY + parallaxOffset > Const.LINES - viewPosY) continue; // If the layer under render, skip it

        layersToDisplay.push({
            name: thisLayer.name,
            colorsArray: thisLayer.decodedYX,
            startY: thisLayer.startY - parallaxOffset - viewPosY - renderHeight,
            startX: viewPosX - thisLayer.startX,
        });
    }
    //     previousViewPosY = viewPosY;
    //     previousViewPosX = viewPosX;
    // } else {
    // If viewPos didn't change, push previous landscape
    // displayArray = previousLandscape;
    // }
    // console.log('layersToDisplay', layersToDisplay);
    for (let y = 0; y < renderHeight; y++) {
        for (let x = 0; x < renderWidth; x++) {
            for (let layer of layersToDisplay) {
                const array = layer.colorsArray;
                const startY = layer.startY;
                const startX = layer.startX;

                if (startY + y < 0 || startX + x < 0) continue; // If pixel is out of bounds in this layer, skip it
                const pixel = array[startY + y]?.[startX + x];
                if (!pixel) continue;
                if (layer.name === 'monolith') {
                    displayArray.push(pixel.color[0], pixel.color[1], pixel.color[2], 255);
                    if (pixel.transitionCount % 10 !== 0) pixel.transition();
                } else displayArray.push(pixel[0], pixel[1], pixel[2], 255);
                break;
            }
            // if no color found, set to default sky color
            if (!displayArray[(y * renderWidth + x) * 4 + 3]) {
                displayArray.push(...Const.SKY_COLOR, 255);
            }
        }
    }

    // if (activateOnce === 0) console.log('displayArray', displayArray);
    // previousLandscape = displayArray;

    // Add the pointer
    addPointer(displayArray, layersToDisplay);

    activateOnce++;
    return displayArray;
}

function addPointer(displayArray, layersToDisplay) {
    if (tool === Tool.SMOL) {
        whiten(displayArray, pointer.y, pointer.x, layersToDisplay);
    } else if (tool === Tool.BIG) {
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                whiten(displayArray, pointer.y + j, pointer.x + i, layersToDisplay);
            }
        }
        whiten(displayArray, pointer.y, pointer.x, layersToDisplay);
    } else if (tool === Tool.HUGE) {
        for (let i = -3; i <= 3; i++) {
            for (let j = -1; j <= 1; j++) {
                whiten(displayArray, pointer.y + j, pointer.x + i, layersToDisplay);
                whiten(displayArray, pointer.y + i, pointer.x + j, layersToDisplay);
            }
        }
        for (let i = -2; i <= 2; i++) {
            for (let j = -2; j <= 2; j++) whiten(displayArray, pointer.y + i, pointer.x + j, layersToDisplay);
        }
    } else if (tool === Tool.GIGA) {
        for (let i = -20; i <= 20; i++) {
            for (let j = -20; j <= 20; j++) {
                whiten(displayArray, pointer.y + j, pointer.x + i, layersToDisplay);
            }
        }
        for (let i = -15; i <= 15; i++) {
            for (let j = -15; j <= 15; j++) {
                whiten(displayArray, pointer.y + j, pointer.x + i, layersToDisplay);
            }
        }
        for (let i = -8; i <= 8; i++) {
            for (let j = -5; j <= 5; j++) {
                whiten(displayArray, pointer.y + j, pointer.x + i, layersToDisplay);
                whiten(displayArray, pointer.y + i, pointer.x + j, layersToDisplay);
            }
        }
        for (let i = -2; i <= 2; i++) {
            for (let j = -2; j <= 2; j++) whiten(displayArray, pointer.y + i, pointer.x + j, layersToDisplay);
        }
        whiten(displayArray, pointer.y, pointer.x, layersToDisplay);
    }
}

function whiten(displayArray, y, x, layersToDisplay) {
    if (x < 0 || x >= renderWidth) return;
    const displayPos = (y * renderWidth + x) * 4;
    const monolithPos = convertToMonolithPos({ x: x, y: y });
    // If not on the monolith or being put off the screen during the zoom return
    if (!monolithPos || displayPos > displayArray.length) return;
    // If not editable return
    if (!monolith[monolithPos.y]?.[monolithPos.x].isEditable(0)) return;
    // If on the GUI, return
    for (let layer of layersToDisplay) {
        if (['palette', 'selector1', 'selector2'].includes(layer.name)) {
            if (layer.colorsArray[layer.startY + y]?.[layer.startX + x]) return;
        }
    }
    displayArray[displayPos] += (255 - displayArray[displayPos]) / 3;
    displayArray[displayPos + 1] += (255 - displayArray[displayPos + 1]) / 3;
    displayArray[displayPos + 2] += (255 - displayArray[displayPos + 2]) / 3;
}

function isInSquare(xmin, xmax, ymin, ymax, pointerX, pointerY) {
    let pos = absolutePosition(pointerX, pointerY);
    if (pos.x >= xmin && pos.x <= xmax && pos.y >= ymin && pos.y <= ymax) return true;
    return false;
}

function absolutePosition(pointerX, pointerY) {
    return {
        x: viewPosX + pointerX,
        y: renderHeight - pointerY + viewPosY,
    };
}
