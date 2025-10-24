// Wishing Puzzle — minimal Canvas starter
// - Scene layout (left photo placeholder, right cake+27 candles, bottom stack)
// - Top-of-stack drag for mini cards with snap-to-grid
// - Candle progress rendering and state machine hooks

import { createStore } from './scripts/state/store.mjs';
import { initCardInteractions } from './scripts/interactions/cards.js';

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const exportCanvas = document.getElementById('exportCanvas');
const wishesPanel = document.getElementById('wishesPanel');
const capturePanel = document.getElementById('capturePanel');
const progressText = document.getElementById('progressText');
const btnStart = document.getElementById('btnStart');
const btnNext = document.getElementById('btnNext');
const btnReset = document.getElementById('btnReset');
const btnWishesOk = document.getElementById('btnWishesOk');
const wish1 = document.getElementById('wish1');
const wish2 = document.getElementById('wish2');
const wish3 = document.getElementById('wish3');
const btnCapture = document.getElementById('btnCapture');
const btnCloseCapture = document.getElementById('btnCloseCapture');
const video = document.getElementById('video');

// ---- State ----
const STATE = { INTRO: 'intro', ARRANGE: 'arrange', WISHES: 'wishes', BLOW: 'blow', CAPTURE: 'capture', EXPORT: 'export' };
let state = STATE.INTRO;

const GRID = 12; // snap grid in px
const DEFAULT_TOTAL_CARDS = 27;
const store = createStore({ totalCards: DEFAULT_TOTAL_CARDS });
store.initializeDeck(DEFAULT_TOTAL_CARDS);
const TOTAL_CARDS = store.getState().totalCards;

// Positions are computed relative to scene rects
let scene = {
    w: canvas.width,
    h: canvas.height,
    hero: { x: 24, y: 24, w: 1232, h: 672 },
    left: { x: 72, y: 72, w: 680, h: 592 },
    right: { x: 800, y: 120, w: 360, h: 520 },
    stack: { x: 72, y: 656, w: 680, h: 72 },
};

// Cards dataset — uniform styling with slight bg variations
const bgVariants = ['#fffdf8', '#fff8f1', '#fffaf4', '#fff6ed'];
let cards = Array.from({ length: TOTAL_CARDS }, (_, i) => ({
    id: i,
    text: `Card ${i + 1}`, // TODO: replace with real copy
    bg: bgVariants[i % bgVariants.length],
    placed: false,
    x: scene.stack.x + 8 + i * 0.8, // slight offset to show stack
    y: scene.stack.y + 8 + i * 0.5,
    w: 190,
    h: 48,
    z: i + 1, // stack order
}));
cards.forEach((card, index) => positionCardAtStack(card, index));

function positionCardAtStack(card, index) {
    card.x = scene.stack.x + 12 + index * 0.6;
    card.y = scene.stack.y + 6 + index * 0.4;
}

const heroImage = new Image();
let heroImageLoaded = false;
heroImage.src = 'images/hero-jenny.png';
heroImage.onload = () => {
    heroImageLoaded = true;
    drawScene();
};
heroImage.onerror = (err) => {
    console.warn('Failed to load hero background image', err);
};

const cardTexture = new Image();
let cardTextureLoaded = false;
let cardTexturePattern = null;
cardTexture.src = 'images/card-paper.png';
cardTexture.onload = () => {
    cardTextureLoaded = true;
    cardTexturePattern = ctx.createPattern(cardTexture, 'repeat');
    drawScene();
};
cardTexture.onerror = (err) => {
    console.warn('Failed to load card texture image', err);
};

function handleStoreUpdate() {
    syncCardsFromStore();
    setProgress();
    drawScene();
}

function syncCardsFromStore() {
    const stateSnapshot = store.getState();
    stateSnapshot.cards.forEach((entry, index) => {
        if (!cards[index]) return;
        cards[index].placed = entry.status === 'placed';
    });
}

function setProgress() {
    const { candlesLit, totalCards } = store.getState();
    progressText.textContent = `Candles: ${candlesLit} / ${totalCards}`;
    btnNext.disabled = !(candlesLit === totalCards && state === STATE.ARRANGE);
}

store.subscribe(handleStoreUpdate);

function layout() {
    // Keep base 16:9 internal resolution; canvas CSS scales responsively
    canvas.width = 1280; canvas.height = 720;
    scene.w = canvas.width; scene.h = canvas.height;
    const margin = 24;
    const heroPadding = 48;
    const stackHeight = 72;
    scene.hero = { x: margin, y: margin, w: scene.w - margin * 2, h: scene.h - margin * 2 };
    scene.left = {
        x: scene.hero.x + heroPadding,
        y: scene.hero.y + heroPadding,
        w: 680,
        h: scene.hero.h - heroPadding * 2 - (stackHeight - 24),
    };
    scene.stack = {
        x: scene.left.x,
        y: scene.hero.y + scene.hero.h - stackHeight - heroPadding / 2,
        w: scene.left.w,
        h: stackHeight,
    };
    const cakeGap = 72;
    const rightMargin = 56;
    const rightX = scene.left.x + scene.left.w + cakeGap;
    scene.right = {
        x: rightX,
        y: scene.hero.y + 96,
        w: scene.hero.x + scene.hero.w - rightX - rightMargin,
        h: scene.hero.h - 180,
    };
    cards.forEach((card, index) => {
        if (!card.placed) positionCardAtStack(card, index);
    });
}

function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawHeroBackdrop() {
    const hero = scene.hero;
    if (!hero) return;

    ctx.save();
    drawRoundedRect(hero.x, hero.y, hero.w, hero.h, 28);
    ctx.clip();
    const gradient = ctx.createLinearGradient(hero.x, hero.y, hero.x + hero.w, hero.y);
    gradient.addColorStop(0, 'rgba(255,248,242,0.96)');
    gradient.addColorStop(0.55, 'rgba(248,234,219,0.98)');
    gradient.addColorStop(1, 'rgba(249,239,226,0.98)');
    ctx.fillStyle = gradient;
    ctx.fillRect(hero.x, hero.y, hero.w, hero.h);

    if (heroImageLoaded) {
        const padding = 36;
        const availableHeight = hero.h - padding * 2;
        const availableWidth = hero.w * 0.55;
        let drawWidth = availableHeight * (heroImage.width / heroImage.height);
        let drawHeight = availableHeight;
        if (drawWidth > availableWidth) {
            drawWidth = availableWidth;
            drawHeight = drawWidth * (heroImage.height / heroImage.width);
        }
        const imgX = hero.x + padding;
        const imgY = hero.y + hero.h - padding - drawHeight;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(heroImage, imgX, imgY, drawWidth, drawHeight);
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2;
    drawRoundedRect(hero.x, hero.y, hero.w, hero.h, 28);
    ctx.stroke();
    ctx.restore();
}

function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f5ede3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawHeroBackdrop();

    // right panel — cake + candles
    drawCake();

    // stack shadow area
    // stack shadow hint (subtle shadow only, no fill)
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    drawRoundedRect(scene.stack.x, scene.stack.y + 4, scene.stack.w, scene.stack.h - 12, 12);
    ctx.fill();
    ctx.restore();

    // placed cards first
    const placed = cards.filter(c => c.placed).sort((a, b) => a.z - b.z);
    for (const card of placed) drawCard(card);

    // stack (unplaced) — only show a few top edges visually
    const unplaced = cards.filter(c => !c.placed).sort((a, b) => a.z - b.z);
    for (const card of unplaced) drawCard(card, true);

}

function drawCake() {
    const { candlesLit } = store.getState();
    const { x, y, w, h } = scene.right;
    // cake base
    const baseY = y + h - 140;
    drawRoundedRect(x + 40, baseY - 80, w - 80, 80, 16);
    ctx.fillStyle = '#f3d2b6'; ctx.fill();
    ctx.fillStyle = '#e9b490'; ctx.fillRect(x + 40, baseY, w - 80, 60);

    // candles grid (27)
    const cols = 9, rows = 3; // 9x3 = 27
    const gapX = (w - 160) / (cols - 1);
    const gapY = 26;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cx = x + 80 + c * gapX;
            const cy = baseY - 100 - r * gapY;
            // stick
            ctx.fillStyle = '#c6b6a1';
            ctx.fillRect(cx - 3, cy, 6, 34);
            // flame
            const id = r * cols + c + 1;
            const isLit = id <= candlesLit;
            if (isLit) {
                ctx.save();
                ctx.shadowColor = 'rgba(255,150,60,.6)';
                ctx.shadowBlur = 12;
                ctx.fillStyle = '#ffb347';
                ctx.beginPath();
                ctx.ellipse(cx, cy, 6, 10, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                ctx.fillStyle = '#bdb7af';
                ctx.beginPath();
                ctx.arc(cx, cy + 4, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function drawCard(card, inStack = false) {
    const x = inStack ? card.x : card.x;
    const y = inStack ? card.y : card.y;
    const radius = 12;
    ctx.save();
    drawRoundedRect(x, y, card.w, card.h, radius);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillRect(x, y, card.w, card.h);
    if (cardTextureLoaded && cardTexturePattern) {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = cardTexturePattern;
        ctx.fillRect(x, y, card.w, card.h);
        ctx.globalAlpha = 1;
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(104,92,80,0.45)';
    ctx.lineWidth = 1.2;
    drawRoundedRect(x, y, card.w, card.h, radius);
    ctx.stroke();

    // text
    ctx.fillStyle = '#3f352c';
    ctx.font = '600 18px "Playfair Display", "Times New Roman", serif';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(card.text, x + 16, y + 24);
    ctx.shadowBlur = 0;
}

// interactions wired below

// ---- Flow buttons ----
btnStart.addEventListener('click', () => {
    if (state === STATE.INTRO) { state = STATE.ARRANGE; btnStart.disabled = true; }
});

btnNext.addEventListener('click', () => {
    if (state !== STATE.ARRANGE) return;
    const { candlesLit, totalCards } = store.getState();
    if (candlesLit === totalCards) {
        state = STATE.WISHES;
        wishesPanel.classList.remove('hidden');
    }
});

btnReset.addEventListener('click', () => resetAll());

btnWishesOk.addEventListener('click', () => {
    // TODO: render wishes to scene (stickers)
    wishesPanel.classList.add('hidden');
    state = STATE.BLOW;
    // TODO: start mic detection here
    // For now, go straight to capture
    state = STATE.CAPTURE;
    openCamera();
});

btnCloseCapture.addEventListener('click', () => {
    capturePanel.classList.add('hidden');
});

btnCapture.addEventListener('click', async () => {
    // Grab a frame and place to left panel area as a polaroid
    const frame = await captureFrameFromVideo(video);
    // Draw onto the main canvas immediately (simple version)
    const pad = 24;
    const w = scene.left.w - pad * 2;
    const h = (w * 3) / 4;
    ctx.drawImage(frame, scene.left.x + pad, scene.left.y + pad + 60, w, h);

    // TODO: store photo data for export composition
    state = STATE.EXPORT;
    await exportImage();
});

function resetAll() {
    state = STATE.INTRO;
    store.resetSession();
    cards.forEach((c, i) => {
        positionCardAtStack(c, i);
        c.z = i + 1;
    });
    syncCardsFromStore();
    btnStart.disabled = false;
    btnNext.disabled = true;
    setProgress();
    drawScene();
}

// ---- Camera helpers ----
async function openCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = stream;
        capturePanel.classList.remove('hidden');
    } catch (err) {
        alert('無法存取相機：' + err.message);
    }
}

async function captureFrameFromVideo(videoEl) {
    const off = document.createElement('canvas');
    off.width = videoEl.videoWidth || 640;
    off.height = videoEl.videoHeight || 480;
    const ictx = off.getContext('2d');
    ictx.drawImage(videoEl, 0, 0, off.width, off.height);
    const img = new Image();
    img.src = off.toDataURL('image/jpeg', 0.92);
    await img.decode();
    return img;
}

// ---- Export (JPG) ----
async function exportImage() {
    // Simple export: save current canvas content to image
    const link = document.createElement('a');
    link.download = `HappyBirthday_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function handleResize() {
    // Canvas intrinsic size stays; CSS scales. Only re-render.
    layout();
    drawScene();
}

// ---- Init ----
export function init() {
    layout();
    syncCardsFromStore();
    setProgress();
    drawScene();
    initCardInteractions({
        canvas,
        store,
        cards,
        gridSize: GRID,
        canInteract: () => state !== STATE.INTRO,
        onCardPlaced: () => {
            // store subscriber handles progress/text updates
        },
        drawScene,
    });
    window.addEventListener('resize', handleResize);
}

init();
