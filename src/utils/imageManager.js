import { UPNG } from './upmc';
import Const from '../models/constants';
import { monolith, eraseAllPixel, drawPixel, monolithIndexes } from '../models/monolith';
import { chunkCreator, importedChunks } from '../utils/web3';
import { runeCornerInfo, runeSideInfo } from '../utils/runeAnims';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { animCatalog } from '../models/display';
import { runeNumber } from '../main';

export let chunkStock = [];
export let chunksToAnimateInfo = [];

function saveToEthernity() {
    monolithToBase64().then((data) => {
        chunkCreator(data);
    });
}

export async function parseAPNG() {
    //Imports a few layers of animation
    let importedAnimations = 0;
    let animations = Object.keys(animCatalog);

    for (let i = animations.length - 1; i >= 0; i--) {
        decodeAndFormatAnimation(animations[i]);
        importedAnimations++;
    }

    runeCornerInfo.buffer = parsePNG(runeCornerInfo);
    runeSideInfo.buffer = parsePNG(runeSideInfo);
}

export async function parsePNG(info) {
    info.decoded = await ApngToBuffer(base64ToBuffer(info.base64)).catch(console.error);
    console.log('info.decoded', info, info.decoded);
}

async function decodeAndFormatAnimation(index) {
    let thisAnim = animCatalog[index];
    let decoded = await ApngToBuffer(base64ToBuffer(thisAnim.base64)).catch(console.error);
    thisAnim.frames = decoded.frames;
    thisAnim.delay = decoded.delay;
    thisAnim.totalDelay = decoded.delay.reduce((a, b) => a + b, 0);
    thisAnim.width = decoded.width;
    thisAnim.height = decoded.height;
    delete thisAnim.base64;
    console.log(thisAnim);
}

export async function ApngToBuffer(buffer) {
    return new Promise((resolve) => {
        buffer = UPNG.decode(buffer);
        resolve(buffer);
    }).then((buffer) => {
        // console.log('buffer, UPNG.decode output', buffer);
        const RGB8 = UPNG.toRGBA8(buffer);
        let framesArray = [];
        let delayArray = [];
        for (let frame = 0; frame < buffer.frames.length; frame++) {
            delayArray.push(buffer.frames[frame].delay);
            framesArray.push(new Uint8Array(RGB8[frame]));
        }
        return {
            decodedYX: new Uint8Array(RGB8[0]),
            frames: framesArray,
            delay: delayArray,
            height: buffer.height,
            width: buffer.width,
        };
    });
}

function pngToBufferToRGBA8(buffer) {
    return new Promise((resolve) => {
        buffer = UPNG.decode(buffer);
        resolve(buffer);
    }).then((buffer) => {
        return { buffer: new Uint8Array(UPNG.toRGBA8(buffer)[0]), width: buffer.width, height: buffer.height };
    });
}

function pngToBufferToRGB(buffer) {
    return new Promise((resolve) => {
        buffer = UPNG.decode(buffer);
        resolve(buffer);
    }).then((buffer) => {
        return { buffer: buffer.data, width: buffer.width, height: buffer.height };
    });
}

async function prepareBufferForApi(data) {
    let pixArray = new Uint8Array(base64ToBuffer(decompressFromUTF16(data)));
    pixArray = Array.from(pixArray);
    let width = pixArray.shift();
    let height = pixArray.shift();
    pixArray = decode4bitsArray(pixArray);
    while (pixArray[pixArray.length - 1] === 0) {
        // virer les 0 de la fin
        pixArray.pop();
    }

    let colors = [];
    pixArray.forEach((pix) => {
        colors.push(Const.PALETTE[pix]);
    });
    return [colors, width, height];
}

async function bufferOnMonolith(data) {
    //console.log(LZString.decompressFromUTF16(data.buffer));
    let pixArray = new Uint8Array(base64ToBuffer(decompressFromUTF16(data.buffer)));
    pixArray = Array.from(pixArray);
    const width = pixArray.shift();
    const height = pixArray.shift();
    pixArray = decode4bitsArray(pixArray);
    while (pixArray[pixArray.length - 1] === 0) {
        // virer les 0 de la fin
        pixArray.pop();
    }
    // Stocke les données du chunk pour qu'elles puissent être utilisées par les animations
    chunkStock[data.zIndex] = {
        x: data.x,
        y: data.y,
        paid: data.paid,
        width: width,
        height: height,
        alreadyRuned: false,
    };

    // Si le chunk est digne d'être animé, l'envoie dans chunkToAnimateInfo
    if ((data.zIndex <= importedChunks && !runeNumber) || data.zIndex === runeNumber) {
        chunksToAnimateInfo.push([data.zIndex, data.y + height / 2]);
    }

    let pixelDrawn = 0;
    let p = 0;
    for (let y = data.y; y < data.yMaxLegal; y++) {
        for (let x = data.x; x < width + data.x; x++) {
            if (y >= data.yMaxLegal) return;
            if (pixelDrawn >= data.paid) return;
            if (x < 0 || x >= Const.MONOLITH_COLUMNS || y < 0 || y >= Const.MONOLITH_LINES) continue;
            if (pixArray[p] > 0) {
                drawPixel(x, y, data.zIndex, Const.PALETTE[pixArray[p]]);
                pixelDrawn++;
            }
            p++;
        }
    }
}

function monolithToBase64() {
    return new Promise((resolve) => {
        let { highLow, nbPix, pixelArray, pixelArray24bits } = gridToArray();
        let firstPix = highLow.lowY * Const.MONOLITH_COLUMNS + highLow.lowX;
        pixelArray.unshift(highLow.largeur);
        pixelArray.unshift(highLow.longueur);
        pixelArray = new Uint8Array(pixelArray);
        saveLocally(
            bufferToBase64(UPNG.encode([new Uint8Array(pixelArray24bits).buffer], highLow.longueur, highLow.largeur, 0))
        );
        let compressed = compressToUTF16(bufferToBase64(pixelArray.buffer));
        let pArray = new Uint8Array(base64ToBuffer(decompressFromUTF16(compressed)));
        resolve({ position: firstPix, ymax: highLow.highY, nbPix: nbPix, imgURI: compressed });
    });
}

function bufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function saveLocally(base64) {
    var elementA = document.createElement('a'); //On crée un element vide pour forcer le téléchargement
    elementA.setAttribute('href', 'data:image/png;base64,' + base64); // on met les données au bon format (base64)
    elementA.setAttribute('download', +new Date() + '.png'); // le nom du fichier
    elementA.style.display = 'none'; // on met l'elem invisible
    document.body.appendChild(elementA); //on crée l 'elem
    elementA.click(); // on télécharge
    document.body.removeChild(elementA); // on delete l'elem
}

function base64ToBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

function gridToArray() {
    let highLow = getHighLow();
    let pixelArray = [];
    let nbPix = 0;
    for (let y = highLow.lowY; y <= highLow.highY; y++) {
        for (let x = highLow.lowX; x <= highLow.highX; x++) {
            if (monolithIndexes[y][x] === 0) {
                const monolithPos = (y * Const.MONOLITH_COLUMNS + x) * 4;
                pixelArray.push(monolith[monolithPos], monolith[monolithPos + 1], monolith[monolithPos + 2], 255);
                nbPix++;
            } else {
                pixelArray.push(...[0, 0, 0, 0]);
            }
        }
    }
    let pixelArray24bits = pixelArray; // pour pouvoir save en couleur
    pixelArray = rgbaToColorArray(pixelArray); // convert array to the paletted format
    pixelArray = encode4bitsArray(pixelArray); // encode array with 4 bits per color
    return { highLow, nbPix, pixelArray, pixelArray24bits };
}

function getHighLow() {
    let lowX = Const.MONOLITH_COLUMNS,
        lowY = Const.MONOLITH_LINES,
        highX = 0,
        highY = 0;

    for (let y = 0; y < Const.MONOLITH_LINES; y++) {
        for (let x = 0; x < Const.MONOLITH_COLUMNS; x++) {
            if (monolithIndexes[y][x] === 0) {
                if (x < lowX) lowX = x;
                if (x > highX) highX = x;
                if (y < lowY) lowY = y;
                if (y > highY) highY = y;
            }
        }
    }
    let longueur = highX - lowX + 1;
    let largeur = highY - lowY + 1;
    return { lowX, lowY, highX, highY, longueur, largeur };
}
function rgbaToColorArray(array) {
    // [r, g, b, a, r, g, b, a] => [colordId, colorId]
    let converted = [];
    for (let i = 0; i < array.length; i += 4) {
        let rgb = [array[i], array[i + 1], array[i + 2]];
        const eq = (element) => element[0] == rgb[0] && element[1] == rgb[1] && element[2] == rgb[2];
        converted.push(Const.PALETTE.findIndex(eq));
    }
    return converted;
}
function addUintTo4bitArray(array, uint) {
    if (array.length == 0) {
        array.push(uint);
    } else if (array[array.length - 1] == 256) {
        array[array.length - 1] = uint;
    } else {
        array[array.length - 1] = array[array.length - 1] * 16 + uint;
        array.push(256);
    }
}
function encode4bitsArray(array) {
    let encoded = [];
    for (let i = 0; i < array.length; i++) {
        addUintTo4bitArray(encoded, array[i]);
    }
    if (array.length % 2 != 0) {
        encoded[Math.ceil(array.length / 2) - 1] *= 16;
    } else if (encoded[encoded.length - 1] == 256) encoded[encoded.length - 1] = 0;
    while (encoded.length % 4 != 0) {
        encoded.push(0);
    }
    return encoded;
}
function decode4bitsArray(array) {
    let decoded = [];
    let arrayEnd = array.length - 1;
    while (array[arrayEnd] == 0) {
        arrayEnd--;
    }
    for (let i = 0; i <= arrayEnd; i++) {
        decoded.push((array[i] - (array[i] % 16)) / 16);
        decoded.push(array[i] % 16);
    }
    return decoded;
}

export function moveDrawing(x, y) {
    //TODO : À BOUGER DANS TOOLS ?
    const drawing = gridToArray();

    eraseAllPixel();
    // if (outx > 127) outx = 127;
    // if (outx < 0) outx = 0;
    drawBuffer(
        drawing.saveArray,
        x,
        y,
        Const.FREE_DRAWING,
        Const.FREE_DRAWING,
        0,
        drawing.highLow.longueur,
        drawing.highLow.largeur
    );
}

export { saveToEthernity, base64ToBuffer, pngToBufferToRGBA8, pngToBufferToRGB, prepareBufferForApi, bufferOnMonolith };
