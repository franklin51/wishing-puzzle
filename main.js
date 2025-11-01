// Wishing Puzzle — minimal Canvas starter
// - Scene layout (left photo placeholder, right cake+27 candles, bottom stack)
// - Top-of-stack drag for mini cards with snap-to-grid
// - Candle progress rendering and state machine hooks

import { createStore } from './scripts/state/store.mjs';
import { initCardInteractions } from './scripts/interactions/cards.js';
import { createBlowDetector } from './scripts/interactions/blowDetector.js';

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const exportCanvas = document.getElementById('exportCanvas');
const wishesPanel = document.getElementById('wishesPanel');
const capturePanel = document.getElementById('capturePanel');
const progressText = document.getElementById('progressText');
const btnStart = document.getElementById('btnStart');
const btnNext = document.getElementById('btnNext');
const btnReset = document.getElementById('btnReset');
const wishCountdown = document.getElementById('wishCountdown');
const btnWishSkip = document.getElementById('btnWishSkip');
const video = document.getElementById('video');
const captureStatusText = document.getElementById('captureStatusText');
const listeningIndicator = document.getElementById('listeningIndicator');
const listeningLevelBar = document.getElementById('listeningLevelBar');

// ---- State ----
const STATE = { INTRO: 'intro', ARRANGE: 'arrange', WISHES: 'wishes', BLOW: 'blow', CAPTURE: 'capture', EXPORT: 'export' };
let state = STATE.INTRO;

const GRID = 12; // snap grid in px
const CARD_WIDTH = 176;
const CARD_HEIGHT = 56;
const DEG2RAD = Math.PI / 180;
const CAKE_RIM = {
    centerYOffset: 0.4, // proportion of cake height where the ellipse center sits
    radiusXRatio: 0.35,
    radiusYRatio: 0.25,
    angleStartDeg: 20,
    angleEndDeg: 350,
    perspectiveDropRatio: 0.05,
};
const LAYOUT = {
    margin: 24,
    heroPadding: 48,
    stackShiftX: 120,
    stackRightPadding: 24,
    cakeGap: 72,
    rightMargin: 56,
    cakeHeight: 260,
    cakeBaselineOffset: 32,
    heroImageOffsetX: -60,
    heroImageOffsetY: 140,
};
const BOBO = {
    widthRatio: 0.28,
    maxHeightRatio: 0.72,
    gapRatio: 0.036,
    baselineOffsetRatio: 0,
};
const WISH_HINT_DURATION_MS = 5000;
const CAKE_TAP_THRESHOLD = 3;
const CAKE_TAP_WINDOW_MS = 1500;
const BLOW_BASELINE_SAMPLE_LIMIT = 60;
const BLOW_NOISE_BUFFER = 0.015;
const BLOW_TARGET_DELTA = 0.18;
const BLOW_PROGRESS_COMPLETE = 0.98;
const BLOW_AUTOFINISH_DELAY_MS = 900;
const store = createStore();
const blowDetector = createBlowDetector();
let cards = [];
let cakeLayout = null;
let dataReady = false;
let unsubscribeStore = null;
let cardInteractions = null;
let progressOverride = null;
let wishHintActive = false;
let wishCountdownInterval = null;
let wishHintTimeout = null;
let cakeTapCount = 0;
let cakeTapResetTimeout = null;
let blowStartPromise = null;
let blowStartToken = null;
let blowListening = false;
let blowStageActive = false;
let blowBaseline = 0;
let blowBaselineSamples = 0;
let blowProgress = 0;
let blowDetectionFailed = false;
let cameraStream = null;
let cameraActive = false;
let capturedPhoto = null;
let capturePanelHideTimeout = null;

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

function buildCardModel(text, index) {
    const card = {
        id: index,
        text,
        bg: bgVariants[index % bgVariants.length],
        placed: false,
        x: scene.stack.x + 14 + index * 0.6,
        y: scene.stack.y + 10 + index * 0.45,
        w: CARD_WIDTH,
        h: CARD_HEIGHT,
        z: index + 1,
    };
    positionCardAtStack(card, index);
    return card;
}

function positionCardAtStack(card, index) {
    const baseX = scene.stack.x + 18 + index * 0.55;
    const maxX = scene.stack.x + scene.stack.w - card.w - 12;
    card.x = Math.min(baseX, maxX);
    card.y = scene.stack.y + 10 + index * 0.35;
}

const heroImage = new Image();
let heroImageLoaded = false;
heroImage.src = 'images/kuoka.png';
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

const cakeImage = new Image();
let cakeImageLoaded = false;
cakeImage.src = 'images/cake.png';
cakeImage.onload = () => {
    cakeImageLoaded = true;
    drawScene();
};
cakeImage.onerror = (err) => {
    console.warn('Failed to load cake image', err);
};

const boboImage = new Image();
let boboImageLoaded = false;
boboImage.src = 'images/bobo.png';
boboImage.onload = () => {
    boboImageLoaded = true;
    drawScene();
};
boboImage.onerror = (err) => {
    console.warn('Failed to load bobo companion image', err);
};

function handleStoreUpdate() {
    if (!dataReady || !cards.length) return;
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
    if (progressOverride) {
        progressText.textContent = progressOverride;
    } else {
        progressText.textContent = `Candles: ${candlesLit} / ${totalCards}`;
    }
    btnNext.disabled = !(candlesLit === totalCards && state === STATE.ARRANGE);
}

function setProgressMessage(message) {
    progressOverride = message;
    progressText.textContent = message;
}

function clearProgressMessage() {
    progressOverride = null;
    setProgress();
}

function layout() {
    // Keep base 16:9 internal resolution; canvas CSS scales responsively
    canvas.width = 1280; canvas.height = 720;
    scene.w = canvas.width; scene.h = canvas.height;
    const margin = LAYOUT.margin;
    const heroPadding = LAYOUT.heroPadding;
    const stackHeight = CARD_HEIGHT + 20;
    scene.hero = { x: margin, y: margin, w: scene.w - margin * 2, h: scene.h - margin * 2 };
    scene.left = {
        x: scene.hero.x + heroPadding,
        y: scene.hero.y + heroPadding,
        w: 680,
        h: scene.hero.h - heroPadding * 2 - (stackHeight - 24),
    };
    scene.stack = {
        x: scene.left.x + LAYOUT.stackShiftX,
        y: scene.hero.y + scene.hero.h - stackHeight - heroPadding / 2,
        w: scene.left.w - LAYOUT.stackShiftX - LAYOUT.stackRightPadding,
        h: stackHeight,
    };
    const rightX = scene.left.x + scene.left.w + LAYOUT.cakeGap;
    const stackBaseline = scene.stack.y + scene.stack.h;
    const cakeHeight = LAYOUT.cakeHeight;
    const desiredCakeY = stackBaseline - cakeHeight + LAYOUT.cakeBaselineOffset;
    const minCakeY = scene.hero.y + heroPadding;
    const maxCakeY = scene.hero.y + scene.hero.h - cakeHeight - heroPadding / 2;
    scene.right = {
        x: rightX,
        y: Math.min(maxCakeY, Math.max(minCakeY, desiredCakeY)),
        w: scene.hero.x + scene.hero.w - rightX - LAYOUT.rightMargin,
        h: cakeHeight,
    };
    cards.forEach((card, index) => {
        if (!card.placed) positionCardAtStack(card, index);
    });
    updateCapturePanelPosition();
}

function updateCapturePanelPosition() {
    if (!capturePanel || !scene.hero) return;
    const hero = scene.hero;
    const targetX = hero.x + hero.w / 2;
    const targetY = hero.y + hero.h / 2;
    const leftPercent = (targetX / canvas.width) * 100;
    const topPercent = (targetY / canvas.height) * 100;
    console.log('[capturePanel] position', {
        targetX,
        targetY,
        leftPercent,
        topPercent,
    });
    capturePanel.style.setProperty('--capture-panel-left', `${leftPercent}%`);
    capturePanel.style.setProperty('--capture-panel-top', `${topPercent}%`);
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
        const padding = 10;
        const availableHeight = hero.h - padding * 2;
        const availableWidth = hero.w * 0.7;
        let drawWidth = availableHeight * (heroImage.width / heroImage.height);
        let drawHeight = availableHeight;
        if (drawWidth > availableWidth) {
            drawWidth = availableWidth;
            drawHeight = drawWidth * (heroImage.height / heroImage.width);
        }
        const imgX = hero.x + padding + LAYOUT.heroImageOffsetX;
        const imgY = hero.y + hero.h - padding - drawHeight + LAYOUT.heroImageOffsetY;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(heroImage, imgX, imgY, drawWidth, drawHeight);
        ctx.globalAlpha = 1;
    }

    const creaseCenter = hero.x + hero.w / 2;
    const creaseHalfWidth = 14;
    const creaseGradient = ctx.createLinearGradient(creaseCenter - creaseHalfWidth, hero.y, creaseCenter + creaseHalfWidth, hero.y);
    creaseGradient.addColorStop(0, 'rgba(180,161,141,0.05)');
    creaseGradient.addColorStop(0.44, 'rgba(180,161,141,0.18)');
    creaseGradient.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    creaseGradient.addColorStop(0.56, 'rgba(150,130,110,0.25)');
    creaseGradient.addColorStop(1, 'rgba(150,130,110,0.08)');
    ctx.fillStyle = creaseGradient;
    ctx.fillRect(creaseCenter - creaseHalfWidth, hero.y, creaseHalfWidth * 2, hero.h);

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(creaseCenter + 4, hero.y + 18, 1.5, hero.h - 36);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(creaseCenter - 3, hero.y + 12, 2, hero.h - 24);
    ctx.globalAlpha = 1;
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
    drawBobo();
    drawCapturedPhoto();

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
    const stateSnapshot = store.getState();
    const candlesLit = stateSnapshot.candlesLit;
    const { x, y, w, h } = scene.right;
    const centerX = x + w / 2;
    cakeLayout = null;
    let cakeWidth = w * 0.9;
    let cakeHeight = cakeWidth * (cakeImage.height / cakeImage.width);
    // if (cakeHeight > h) {
    //     const scale = h / cakeHeight;
    //     cakeHeight *= scale;
    //     cakeWidth *= scale;
    // }
    const cakeX = centerX - cakeWidth / 2;
    const cakeY = y + h - cakeHeight;
    cakeLayout = { x: cakeX, y: cakeY, w: cakeWidth, h: cakeHeight, centerX };

    if (cakeImageLoaded) {
        ctx.drawImage(cakeImage, cakeX, cakeY, cakeWidth, cakeHeight);
    } else {
        ctx.fillStyle = '#f0cbb0';
        drawRoundedRect(cakeX, cakeY, cakeWidth, cakeHeight, 18);
        ctx.fill();
    }

    const candleCount = dataReady ? stateSnapshot.totalCards : cards.length;
    const ellipseCenterY = cakeY + cakeHeight * CAKE_RIM.centerYOffset;
    const candleRadiusX = cakeWidth * CAKE_RIM.radiusXRatio;
    const candleRadiusY = cakeHeight * CAKE_RIM.radiusYRatio;
    const startAngle = CAKE_RIM.angleStartDeg * DEG2RAD;
    const endAngle = CAKE_RIM.angleEndDeg * DEG2RAD;
    const angleSpan = endAngle - startAngle;
    const perspectiveDrop = cakeHeight * CAKE_RIM.perspectiveDropRatio;
    const stemHeight = Math.min(36, cakeHeight * 0.32);
    for (let i = 0; i < candleCount; i += 1) {
        const progress = candleCount > 1 ? i / (candleCount - 1) : 0.5;
        const angle = startAngle + angleSpan * progress;
        const cx = centerX + Math.cos(angle) * candleRadiusX;
        let cy = ellipseCenterY + Math.sin(angle) * candleRadiusY;
        cy += perspectiveDrop * -Math.sin(angle);
        const stemWidth = 3.2;
        ctx.fillStyle = '#d64a3b';
        ctx.fillRect(cx - stemWidth / 2, cy - stemHeight, stemWidth, stemHeight);

        const isLit = i + 1 <= candlesLit;
        ctx.save();
        if (isLit) {
            ctx.shadowColor = 'rgba(255,160,80,.65)';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#ffb860';
            ctx.beginPath();
            ctx.ellipse(cx, cy - stemHeight, 5, 9, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#f2a39c';
            ctx.beginPath();
            ctx.ellipse(cx, cy - stemHeight + 2, 4, 4, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

function drawBobo() {
    if (!boboImageLoaded || !cakeLayout) return;
    const { x, y, w, h } = scene.right;
    const aspect = boboImage.width && boboImage.height ? boboImage.width / boboImage.height : 420 / 560;
    let width = w * BOBO.widthRatio;
    let height = width / aspect;
    const maxHeight = h * BOBO.maxHeightRatio;
    if (height > maxHeight) {
        const scale = maxHeight / height;
        height = maxHeight;
        width *= scale;
    }

    const gap = w * BOBO.gapRatio;
    const baseline = cakeLayout.y + cakeLayout.h;
    const baselineOffset = h * BOBO.baselineOffsetRatio;
    const rawX = cakeLayout.x - gap - width;
    const minX = scene.right.x - width - w * 0.25;
    const boboX = Math.max(minX, rawX);
    const boboY = baseline - height + baselineOffset;

    ctx.drawImage(boboImage, boboX, boboY, width, height);
}

function drawCapturedPhoto() {
    if (!capturedPhoto || !capturedPhoto.image || !scene.right) return;
    const photo = capturedPhoto.image;
    const panel = scene.right;
    const aspect = photo.width && photo.height ? photo.width / photo.height : 4 / 3;
    const maxPhotoWidth = Math.min(panel.w * 1.1, 540);
    let photoWidth = maxPhotoWidth;
    let photoHeight = photoWidth / aspect;
    const maxPhotoHeight = Math.min(panel.h, 480);
    if (photoHeight > maxPhotoHeight) {
        photoHeight = maxPhotoHeight;
        photoWidth = photoHeight * aspect;
    }
    const paddingSide = 16;
    const paddingTop = 16;
    const paddingBottom = 34;
    const frameWidth = photoWidth + paddingSide * 2;
    const frameHeight = photoHeight + paddingTop + paddingBottom;
    const hero = scene.hero;
    const seamX = hero.x + hero.w / 2;
    const rightEdge = hero.x + hero.w;
    const rightHalfCenterX = seamX + (rightEdge - seamX) / 2;
    const minFrameX = seamX + 16;
    const maxFrameX = rightEdge - frameWidth - 16;
    let frameX = rightHalfCenterX - frameWidth / 2;
    frameX = Math.max(minFrameX, Math.min(maxFrameX, frameX));
    const baseCenterY = hero.y + hero.h * 0.42;
    const cakeTop = cakeLayout ? cakeLayout.y : panel.y + panel.h * 0.65;
    const minFrameY = hero.y + 24;
    const maxFrameY = cakeTop - frameHeight - 36;
    let frameY = baseCenterY - frameHeight / 2;
    frameY = Math.max(minFrameY, Math.min(maxFrameY, frameY));

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.14)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    drawRoundedRect(frameX, frameY, frameWidth, frameHeight, 18);
    ctx.fill();
    ctx.restore();

    const photoX = frameX + paddingSide;
    const photoY = frameY + paddingTop;
    ctx.save();
    drawRoundedRect(photoX, photoY, photoWidth, photoHeight, 16);
    ctx.clip();
    ctx.drawImage(photo, photoX, photoY, photoWidth, photoHeight);
    ctx.restore();

    ctx.fillStyle = 'rgba(63, 53, 44, 0.74)';
    ctx.font = '600 14px "Noto Sans TC", "PingFang TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('我們一起吹蠟燭', frameX + frameWidth / 2, frameY + frameHeight - 14);
    ctx.textAlign = 'left';
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
    ctx.font = '500 20px "Noto Sans TC", "PingFang TC", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255,255,255,0.85)';
    ctx.shadowBlur = 5;
    const lines = wrapCardText(card.text, card.w - 32, ctx);
    const lineHeight = 24;
    const startY = y + card.h / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
        ctx.fillText(line, x + card.w / 2, startY + index * lineHeight);
    });
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
}

function wrapCardText(text, maxWidth, context) {
    if (!text) return [''];
    const lines = [];
    let current = '';
    for (const char of text) {
        const testLine = current + char;
        if (context.measureText(testLine).width > maxWidth && current) {
            lines.push(current);
            current = char;
        } else {
            current = testLine;
        }
    }
    if (current) lines.push(current);
    return lines;
}

// interactions wired below

// ---- Flow buttons ----
btnStart.addEventListener('click', () => {
    if (state === STATE.INTRO) { state = STATE.ARRANGE; btnStart.disabled = true; }
});

btnNext.addEventListener('click', () => enterWishStage());

btnReset.addEventListener('click', () => resetAll());

if (btnWishSkip) {
    btnWishSkip.addEventListener('click', () => {
        completeWishHint(true);
    });
}

function enterWishStage() {
    if (state !== STATE.ARRANGE) return;
    const { candlesLit, totalCards } = store.getState();
    if (candlesLit !== totalCards) return;
    state = STATE.WISHES;
    btnNext.disabled = true;
    cakeTapCount = 0;
    clearCakeTapTimer();
    blowStageActive = false;
    blowProgress = 0;
    showWishHintOverlay();
}

function showWishHintOverlay() {
    if (wishHintActive) return;
    wishHintActive = true;
    resetWishCountdownDisplay();
    setProgressMessage('準備吹蠟燭');
    wishesPanel.classList.remove('hidden');
    startWishHintCountdown(WISH_HINT_DURATION_MS);
    startBlowDetection();
}

function startWishHintCountdown(durationMs) {
    stopWishHintTimers();
    let remainingSeconds = Math.ceil(durationMs / 1000);
    updateWishCountdownDisplay(remainingSeconds);
    wishHintTimeout = window.setTimeout(() => {
        completeWishHint(false);
    }, durationMs);
    wishCountdownInterval = window.setInterval(() => {
        remainingSeconds -= 1;
        if (remainingSeconds <= 0) {
            updateWishCountdownDisplay(0);
            completeWishHint(false);
            return;
        }
        updateWishCountdownDisplay(remainingSeconds);
    }, 1000);
}

function stopWishHintTimers() {
    if (wishHintTimeout) {
        window.clearTimeout(wishHintTimeout);
        wishHintTimeout = null;
    }
    if (wishCountdownInterval) {
        window.clearInterval(wishCountdownInterval);
        wishCountdownInterval = null;
    }
}

function updateWishCountdownDisplay(value) {
    if (!wishCountdown) return;
    wishCountdown.textContent = String(value);
}

function resetWishCountdownDisplay() {
    updateWishCountdownDisplay(Math.ceil(WISH_HINT_DURATION_MS / 1000));
}

function completeWishHint(manual = false) {
    if (!wishHintActive) return;
    stopWishHintTimers();
    hideWishHintOverlay();
    enterBlowStage(manual);
}

function hideWishHintOverlay() {
    wishHintActive = false;
    if (wishesPanel) {
        wishesPanel.classList.add('hidden');
    }
    resetWishCountdownDisplay();
}

async function enterBlowStage(manualTrigger = false) {
    state = STATE.BLOW;
    if (manualTrigger) {
        stopBlowDetection();
        stopCameraPreview(true);
        clearProgressMessage();
        transitionToCaptureStage();
        return;
    }
    blowProgress = 0;
    blowStageActive = false;
    setProgressMessage('吹蠟燭中...');
    try {
        const started = await startBlowDetection();
        if (!started) {
            blowDetectionFailed = true;
            setProgressMessage('麥克風不可用，幫你跳過吹蠟燭');
            stopCameraPreview(true);
            window.setTimeout(() => {
                clearProgressMessage();
                transitionToCaptureStage();
            }, 1000);
            return;
        }
        const cameraReady = await startCameraPreview();
        if (!cameraReady) {
            setCaptureStatus('相機不可用');
        } else {
            setCaptureStatus('吹蠟燭時會自動拍攝');
        }
        blowStageActive = true;
    } catch (error) {
        blowDetectionFailed = true;
        console.error('Unable to enter blow stage', error);
        setProgressMessage('麥克風不可用，幫你跳過吹蠟燭');
        stopCameraPreview(true);
        window.setTimeout(() => {
            clearProgressMessage();
            transitionToCaptureStage();
        }, 1000);
    }
}

function transitionToCaptureStage() {
    stopBlowDetection();
    state = STATE.CAPTURE;
    clearProgressMessage();
}

function startBlowDetection() {
    if (blowListening) {
        showListeningIndicator();
        return Promise.resolve(true);
    }
    if (blowStartPromise) {
        return blowStartPromise;
    }
    blowBaseline = 0;
    blowBaselineSamples = 0;
    blowProgress = 0;
    blowDetectionFailed = false;
    const token = {};
    blowStartToken = token;
    blowStartPromise = blowDetector
        .start(handleAudioLevel)
        .then(() => {
            if (blowStartToken !== token) {
                return false;
            }
            blowListening = true;
            showListeningIndicator();
            return true;
        })
        .catch((error) => {
            console.error('Microphone start failed', error);
            if (blowStartToken === token) {
                blowDetectionFailed = true;
            }
            hideListeningIndicator();
            return false;
        })
        .finally(() => {
            if (blowStartToken === token) {
                blowStartToken = null;
            }
            blowStartPromise = null;
        });
    return blowStartPromise;
}

function stopBlowDetection() {
    blowStageActive = false;
    blowProgress = 0;
    blowBaseline = 0;
    blowBaselineSamples = 0;
    if (blowStartPromise) {
        blowStartToken = null;
    }
    if (blowListening || blowStartPromise) {
        try {
            blowDetector.stop();
        } catch (error) {
            console.warn('Failed to stop microphone stream', error);
        }
    }
    blowListening = false;
    blowStartPromise = null;
    hideListeningIndicator();
}

function handleAudioLevel(level) {
    let indicatorLevel = Math.min(1, level * 1.4);
    if (!blowStageActive) {
        if (blowBaselineSamples < BLOW_BASELINE_SAMPLE_LIMIT) {
            blowBaseline = blowBaselineSamples === 0 ? level : blowBaseline * 0.85 + level * 0.15;
            blowBaselineSamples += 1;
        }
        updateListeningIndicatorLevel(indicatorLevel);
        return;
    }
    const baseline = blowBaselineSamples > 0 ? blowBaseline : 0.02;
    const floor = baseline + BLOW_NOISE_BUFFER;
    const delta = Math.max(0, level - floor);
    const normalized = Math.max(0, Math.min(1, delta / Math.max(BLOW_TARGET_DELTA, 0.0001)));
    indicatorLevel = Math.max(indicatorLevel, normalized);
    updateListeningIndicatorLevel(indicatorLevel);
    if (normalized > blowProgress + 0.002) {
        blowProgress = normalized;
        updateCandlesForProgress(blowProgress);
    }
}

function updateCandlesForProgress(progressValue) {
    const snapshot = store.getState();
    const total = snapshot.totalCards;
    const target = Math.max(0, Math.round(total * (1 - progressValue)));
    if (target < snapshot.candlesLit) {
        store.setCandlesLit(target);
    }
    if (target <= 0 || progressValue >= BLOW_PROGRESS_COMPLETE) {
        finishBlowStage();
    }
}

function finishBlowStage() {
    if (!blowStageActive) return;
    blowStageActive = false;
    setProgressMessage('蠟燭已熄滅！');
    setCaptureStatus('捕捉中...');
    autoCapturePhoto();
    stopBlowDetection();
    window.setTimeout(() => {
        clearProgressMessage();
        transitionToCaptureStage();
    }, BLOW_AUTOFINISH_DELAY_MS);
}

function showListeningIndicator() {
    if (!listeningIndicator) return;
    listeningIndicator.classList.remove('hidden');
}

function hideListeningIndicator() {
    if (listeningIndicator) {
        listeningIndicator.classList.add('hidden');
    }
    updateListeningIndicatorLevel(0);
}

function updateListeningIndicatorLevel(value) {
    if (!listeningLevelBar) return;
    const clamped = Math.max(0, Math.min(1, value));
    listeningLevelBar.style.width = `${Math.round(clamped * 100)}%`;
}

function handleCanvasPointerTap(event) {
    if (state !== STATE.ARRANGE) return;
    if (!cakeLayout) return;
    const pointer = getCanvasPointer(event);
    if (!isPointerInCakeArea(pointer)) return;
    cakeTapCount += 1;
    resetCakeTapTimer();
    if (cakeTapCount >= CAKE_TAP_THRESHOLD) {
        cakeTapCount = 0;
        clearCakeTapTimer();
        enterWishStage();
    }
}

function getCanvasPointer(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
}

function isPointerInCakeArea(pointer) {
    const { x, y, w, h } = cakeLayout;
    return pointer.x >= x && pointer.x <= x + w && pointer.y >= y && pointer.y <= y + h;
}

function resetCakeTapTimer() {
    clearCakeTapTimer();
    cakeTapResetTimeout = window.setTimeout(() => {
        cakeTapCount = 0;
        cakeTapResetTimeout = null;
    }, CAKE_TAP_WINDOW_MS);
}

function clearCakeTapTimer() {
    if (!cakeTapResetTimeout) return;
    window.clearTimeout(cakeTapResetTimeout);
    cakeTapResetTimeout = null;
}

canvas.addEventListener('pointerdown', handleCanvasPointerTap);

function resetAll() {
    state = STATE.INTRO;
    stopWishHintTimers();
    hideWishHintOverlay();
    clearProgressMessage();
    cakeTapCount = 0;
    clearCakeTapTimer();
    stopBlowDetection();
    blowDetectionFailed = false;
    stopCameraPreview(true);
    capturedPhoto = null;
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
async function startCameraPreview() {
    if (!capturePanel || !video) return false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCaptureStatus('相機不可用');
        return false;
    }
    if (cameraActive) {
        capturePanel.classList.remove('hidden');
        if (capturePanelHideTimeout) {
            window.clearTimeout(capturePanelHideTimeout);
            capturePanelHideTimeout = null;
        }
        return true;
    }
    try {
        const constraints = {
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 },
            },
            audio: false,
        };
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = cameraStream;
        video.muted = true;
        const playPromise = video.play();
        if (playPromise && typeof playPromise.then === 'function') {
            await playPromise.catch(() => { });
        }
        cameraActive = true;
        capturePanel.classList.remove('hidden');
        updateCapturePanelPosition();
        if (capturePanelHideTimeout) {
            window.clearTimeout(capturePanelHideTimeout);
            capturePanelHideTimeout = null;
        }
        setCaptureStatus('等待吹蠟燭');
        return true;
    } catch (error) {
        console.error('Unable to access camera', error);
        setCaptureStatus('相機不可用');
        cameraActive = false;
        if (cameraStream) {
            cameraStream.getTracks().forEach((track) => track.stop());
            cameraStream = null;
        }
        if (capturePanel) {
            capturePanel.classList.add('hidden');
        }
        return false;
    }
}

function stopCameraPreview(forceHide = false) {
    if (capturePanelHideTimeout) {
        window.clearTimeout(capturePanelHideTimeout);
        capturePanelHideTimeout = null;
    }
    if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        cameraStream = null;
    }
    if (video && video.srcObject) {
        video.srcObject = null;
    }
    cameraActive = false;
    if (forceHide && capturePanel) {
        capturePanel.classList.add('hidden');
    }
}

function scheduleCapturePanelHide(delay = 1400) {
    if (!capturePanel) return;
    if (capturePanelHideTimeout) {
        window.clearTimeout(capturePanelHideTimeout);
    }
    capturePanelHideTimeout = window.setTimeout(() => {
        capturePanel.classList.add('hidden');
        capturePanelHideTimeout = null;
    }, delay);
}

function setCaptureStatus(message) {
    if (captureStatusText) {
        captureStatusText.textContent = message;
    }
}

async function autoCapturePhoto() {
    if (!video) return;
    try {
        const frame = await captureFrameFromVideo(video);
        if (frame) {
            capturedPhoto = { image: frame };
            setCaptureStatus('已捕捉這一刻');
            drawScene();
        } else {
            capturedPhoto = null;
            setCaptureStatus('未能捕捉影像');
        }
    } catch (error) {
        console.warn('Failed to capture photo', error);
        capturedPhoto = null;
        setCaptureStatus('未能捕捉影像');
    } finally {
        stopCameraPreview();
        scheduleCapturePanelHide();
    }
}

async function captureFrameFromVideo(videoEl) {
    if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth || !videoEl.videoHeight) {
        return null;
    }
    const off = document.createElement('canvas');
    off.width = videoEl.videoWidth;
    off.height = videoEl.videoHeight;
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

function wireCardInteractions() {
    if (!cards.length || !canvas) return;
    if (cardInteractions && typeof cardInteractions.destroy === 'function') {
        cardInteractions.destroy();
    }
    cardInteractions = initCardInteractions({
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
}

function ensureStoreSubscription() {
    if (unsubscribeStore) return;
    unsubscribeStore = store.subscribe(handleStoreUpdate);
}

async function loadCardDataset() {
    const response = await fetch('card.js', { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Failed to fetch card dataset: ${response.status}`);
    }
    const raw = await response.json();
    if (!raw || !Array.isArray(raw.cards)) {
        throw new Error('Card dataset missing "cards" array.');
    }
    return raw.cards.map((entry, index) => {
        const text = typeof entry.text === 'string' ? entry.text.trim() : '';
        return { text, originalId: entry.id ?? index + 1, index };
    });
}

function applyCardDataset(dataset) {
    const normalized = dataset.map((entry, position) => {
        if (entry.originalId && entry.originalId - 1 !== position) {
            console.warn(`Card dataset id mismatch at position ${position}:`, entry.originalId);
        }
        return buildCardModel(entry.text || `Card ${position + 1}`, position);
    });
    cards = normalized;
    dataReady = true;
    ensureStoreSubscription();
    store.initializeDeck(cards.length);
    syncCardsFromStore();
    setProgress();
    drawScene();
    wireCardInteractions();
}

function renderDatasetError(error) {
    const message = typeof error === 'string' ? error : error?.message || 'Unable to load card dataset.';
    console.error(message);
    progressText.textContent = 'Card dataset failed to load.';
    btnStart.disabled = true;
    btnNext.disabled = true;
}

// ---- Init ----
export async function init() {
    layout();
    try {
        const dataset = await loadCardDataset();
        applyCardDataset(dataset);
    } catch (error) {
        renderDatasetError(error);
    }
    window.addEventListener('resize', handleResize);
}

init();
