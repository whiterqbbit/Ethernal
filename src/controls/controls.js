//prettier-ignore
import { viewPosX, viewPosY, changeViewPos, increaseZoom, decreaseZoom, toggleZoom} from '../display/view';
import { renderWidth, renderHeight, canvas } from '../display/displayLoop';
import { displayFAQ, FAQ, FAQType, exitFAQ } from '../display/FAQ';
import { GUICatalog } from '../display/GUI';
import Const from '../constants';
import { mobileEventListener } from './mobileControls';
import { openLink } from '../utils/web3';
import { saveToEthernity, importImage } from '../utils/imageManager';
import { convertToMonolithPos, mousePosInGrid, isInCircle, isInSquare } from '../utils/conversions';
import { playSound, toggleMute } from '../assets/sounds';
import { eraseAllPixel, increaseMonolithHeight } from '../monolith/monolith';
import { undo, redo } from '../monolith/undoStack';
import { brushSwitch, startUsingTool, colorSwitch, selectBrush } from '../monolith/tools';
import { introState, skipIntro } from '../intro';

export const deviceType =
    renderWidth / renderHeight < 0.65
        ? 'mobile'
        : /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(navigator.userAgent)
        ? 'tablet'
        : /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
              navigator.userAgent
          )
        ? 'mobile'
        : 'desktop';

//prettier-ignore
document.addEventListener('contextmenu', (e) => { e.preventDefault(); }, false);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && introState) skipIntro();
});

export function skipManager(e) {
    if (!introState) return;
    if (isInSquare(mousePosInGrid(e), 0, 81, 0, 47, 'skipIntro', 'GUICatalog')) {
        skipIntro();
        console.log('Clicked on skipIntro');
    }
}

export let pointer = { x: 0, y: 0 };

//prettier-ignore
export function unlockControls() {
    document.addEventListener('keydown', (e) => { keyManager(e) });
    document.addEventListener('mousemove', (e) => { pointer = mousePosInGrid({ x: e.x, y: e.y });});
    if (deviceType === 'mobile') mobileEventListener();
    else canvas.onmousedown = clickManager;
}

export function unlockScroll() {
    document.addEventListener(
        'wheel',
        (e) => {
            scrollManager(e);
        },
        { passive: false }
    );
}

//prettier-ignore
function keyManager(e){
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {undo(); return}
    if ((e.metaKey || e.ctrlKey ) && (e.key === 'Z' || e.key === 'y')) {redo(); return}
    if (e.key === 'x') eraseAllPixel();
    if (e.key === 'c') console.log('Total H', Const.COLUMNS, 'Total W', Const.LINES, 'render W', renderWidth, 'render H', renderHeight, 'viewPosX', viewPosX, 'viewPosY', viewPosY, '\nE : Brush Switch \nX : Erase All \nI : Import \nL : Mute \nK : Pause music \nP : Grow Monolith \nR : GIGA tool \nT : Go to top');
    if (e.key === 'e') brushSwitch();
    if (e.key === 'i') importImage();
    if (e.key === 'r') { selectBrush('giga'); playSound('kick', 50); }
    if (e.key === 'p') { increaseMonolithHeight(1100); }
    if (e.key === 't') { changeViewPos(0, 999999); }
    if (e.key === '+') increaseZoom();
    if (e.key === '-') decreaseZoom();

    switch (e.code || e.key || e.keyCode) {
        case 'KeyW':
        case 'ArrowUp':
        case 'Numpad8':
        case 38: // keyCode for arrow up
        changeViewPos(0, 6)
        break;

        case 'KeyA':
        case 'ArrowLeft':
        case 'Numpad4':
        case 37: // keyCode for arrow left
        changeViewPos(-6, 0)
        break;

        case 'KeyS':
        case 'ArrowDown':
        case 'Numpad5':
        case 'Numpad2':
        case 40: // keyCode for arrow down
        changeViewPos(0, -6)
        break;

        case 'KeyD':
        case 'ArrowRight':
        case 'Numpad6':
        case 39: // keyCode for arrow right
        changeViewPos(6, 0)
        break;

        case 'KeyZ':
        toggleZoom();
        playSound('click6');
        break;

        case 'KeyM':
            toggleMute();
            break;
    
      }
}

//prettier-ignore
export function clickManager(e) {
    let mousePos = mousePosInGrid(e);
    console.log('Click', mousePos);

    if (FAQ) {
        if (isInSquare(mousePos, 0, GUICatalog.quitFAQ.img.width, 0, GUICatalog.quitFAQ.img.height, 'quitFAQ', 'GUICatalog')) {
            console.log('isInSquare');
            exitFAQ()
        } else if (isInSquare(mousePos, 70, 293, 380, 400, 'FAQ', 'FAQCatalog')){
            window.open('https://metamask.io/download/', '_blank');
        } else if (isInSquare(mousePos, 61, 312, 785, 802, 'FAQ', 'FAQCatalog')){
            window.open('https://faucets.chain.link/', '_blank');
        }
    } else if (GUICatalog.share.display) {
        if (!isInSquare(mousePos, 0, GUICatalog.share.img.width, 0, GUICatalog.share.img.height, 'share', 'GUICatalog')) {
            GUICatalog.share.display = false;
        } else {
            // console.log('img', GUICatalog.share.x, GUICatalog.share.y);
            if (isInSquare(mousePos, 15, 115, 30, 146, 'share', 'GUICatalog')) {
                console.log('Clicked on OpenSea');
                openLink('opensea');
            } else if (isInSquare(mousePos, 122, 215, 30, 144, 'share', 'GUICatalog')) {
                console.log('Clicked on Share');
                openLink('twitter');
            }
        }
    } else if (isInSquare(mousePos, 0, GUICatalog.palette.img.width, 0, GUICatalog.palette.img.height, 'palette', 'GUICatalog')) {
        console.log('Clicked on the GUI');
        // get palette info
        const info = GUICatalog.palette.info;
        // check for each circle if the click is in
        for (let i = 1; i <= 16; i++) {
            const row = i > 8 ? 2 : 1;
            const column = i > 8 ? i - 8 : i;
            if (isInCircle(mousePos, info[`row${row}Y`], info.offsetX + info.spaceX * column, info.smolRadius, 'palette', 'GUICatalog')) colorSwitch(e, i);
        }

        if (isInCircle(mousePos, info.bigY, info.bigX2, info.bigRadius, 'palette', 'GUICatalog')) saveToEthernity();
        else if (isInCircle(mousePos, info.bigY, info.bigX1, info.bigRadius, 'palette', 'GUICatalog')) brushSwitch();

    } else if (isInCircle(mousePos, 38, 74, 13, 'planLogos', 'imageCatalog')) {
        console.log('Discord !');
        window.open('https://discord.gg/QQQQQQQQ', '_blank');
    } else if (isInCircle(mousePos, 72, 72, 13, 'planLogos', 'imageCatalog')) {
        console.log('GitHub !');
        window.open('https://github.com/laguerrepiece/moonolith', '_blank');
    } else if (isInCircle(mousePos, 58, 116, 15, 'planLogos', 'imageCatalog')) {
        console.log('FAQ !');
        displayFAQ('FAQ')
        // window.open('https://medium.com/', '_blank');
    } else if (convertToMonolithPos(mousePos)) {
        // clicked on monolith
        console.log('monolithPos', mousePos);
        startUsingTool(e, mousePos);
    }
}

let scrollInformation = {
    lastScrollDown: Date.now(),
    lastScrollUp: Date.now(),
    consecutiveDown: 0,
    consecutiveUp: 0,
    upInertia: 0,
    downInertia: 0,
    lastDirUp: false,
    inertiaEvents: [],
};

function scrollManager(e) {
    if (e.ctrlKey == true || e.metaKey == true) { // si ctrl + molette on zoom 
        e.preventDefault();
        if (e.deltaY < 0) increaseZoom();
        else if (e.deltaY > 0) decreaseZoom();
        return;
    }
    let now = Date.now();
    if (e.deltaY > 0) { // scroll vers le bas
        if (now - scrollInformation.lastScrollDown < 500 && now - scrollInformation.lastScrollDown > 50) { // si on a scroll dans la derniere demie sec
            scrollInformation.consecutiveDown++; // on compte le nombre de scrolls consécutifs
            scrollInformation.downInertia++; // on applique de l'inertie
        } else {
            scrollInformation.consecutiveDown = 0; // sinon reset du compteurs
        }
        scrollInformation.lastScrollDown = now;
        changeViewPos(0, -6 - parseInt(scrollInformation.consecutiveDown / 5) * 2);
        if (scrollInformation.lastDirUp) {
            clearInertia();
            scrollInformation.lastDirUp = false;
        }
    } else { // scroll vers le haut
            if (now - scrollInformation.lastScrollUp < 500 && now - scrollInformation.lastScrollUp > 50) {
            scrollInformation.consecutiveUp++;
            scrollInformation.upInertia++;
        } else {
            scrollInformation.consecutiveUp = 0;
        }
        scrollInformation.lastScrollUp = now;
        changeViewPos(0, 6 + parseInt(scrollInformation.consecutiveUp / 5) * 2);
        if (!scrollInformation.lastDirUp) {
            clearInertia();
            scrollInformation.lastDirUp = true;
        }
    }
    scrollInformation.inertiaEvents.push(
        setTimeout(function () {
            inertia(scrollInformation.consecutiveUp, scrollInformation.consecutiveDown);
        }, 10)
    );
    if (viewPosY == -30 || viewPosY == Const.LINES - renderHeight) {
        clearInertia();
    }
}

function clearInertia() {
    scrollInformation.inertiaEvents.forEach((event) => {
        clearTimeout(event);
    });
}

function inertia(consecutiveUp, consecutiveDown) {
    if (
        scrollInformation.upInertia > 6 &&
        consecutiveUp === scrollInformation.consecutiveUp &&
        scrollInformation.lastDirUp &&
        scrollInformation.upInertia != scrollInformation.consecutiveUp
    ) {
        for (let i = parseInt(scrollInformation.consecutiveUp); i > 0; i--) {
            setTimeout(function () {
                if (scrollInformation.lastDirUp) {
                    //console.log('Into intertia:', i);
                    changeViewPos(0, 1);
                }
            }, i * 25);
        }
        scrollInformation.upInertia = 0;
    }
    if (
        scrollInformation.downInertia > 7 &&
        consecutiveDown == scrollInformation.consecutiveDown &&
        !scrollInformation.lastDirUp
    ) {
        for (let i = parseInt(scrollInformation.consecutiveDown); i > 0; i--) {
            setTimeout(function () {
                if (!scrollInformation.lastDirUp) {
                    //console.log('Into intertia:', i);
                    changeViewPos(0, -1);
                }
            }, i * 25);
        }
        scrollInformation.downInertia = 0;
    }
}
