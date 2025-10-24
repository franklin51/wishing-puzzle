// Wishing Puzzle — minimal Canvas starter
// - Scene layout (left photo placeholder, right cake+27 candles, bottom stack)
// - Top-of-stack drag for mini cards with snap-to-grid
// - Candle progress rendering and state machine hooks

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
const TOTAL_CARDS = 27;

// Positions are computed relative to scene rects
let scene = {
    w: canvas.width,
    h: canvas.height,
    left: { x: 40, y: 40, w: 720, h: 640 },
    right: { x: 800, y: 40, w: 440, h: 640 },
    stack: { x: 40, y: 600, w: 720, h: 80 },
};

// Cards dataset — uniform styling with slight bg variations
const bgVariants = ['#fffdf8', '#fff8f1', '#fffaf4', '#fff6ed'];
let cards = Array.from({ length: TOTAL_CARDS }, (_, i) => ({
    id: i + 1,
    text: `Card ${i + 1}`, // TODO: replace with real copy
    bg: bgVariants[i % bgVariants.length],
    placed: false,
    x: scene.stack.x + 8 + i * 0.8, // slight offset to show stack
    y: scene.stack.y + 8 + i * 0.5,
    w: 220,
    h: 64,
    z: i + 1, // stack order
}));

let candlesLit = 0;
let dragging = null; // {card, dx, dy}

function setProgress() {
    progressText.textContent = `Candles: ${candlesLit} / ${TOTAL_CARDS}`;
    btnNext.disabled = !(candlesLit === TOTAL_CARDS && state === STATE.ARRANGE);
}

function snap(n) { return Math.round(n / GRID) * GRID; }

function rectContains(r, x, y) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function layout() {
    // Keep base 16:9 internal resolution; canvas CSS scales responsively
    canvas.width = 1280; canvas.height = 720;
    scene.w = canvas.width; scene.h = canvas.height;
    scene.left = { x: 40, y: 40, w: 720, h: 640 };
    scene.right = { x: 800, y: 40, w: 440, h: 640 };
    scene.stack = { x: 40, y: 600, w: 720, h: 80 };
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

function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // left panel — photo placeholder
    drawRoundedRect(scene.left.x, scene.left.y, scene.left.w, scene.left.h, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    ctx.strokeStyle = '#e0d8cd';
    ctx.lineWidth = 2; ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#b0a79d';
    ctx.fillRect(scene.left.x + 24, scene.left.y + 24, scene.left.w - 48, scene.left.h - 48);
    ctx.restore();
    ctx.fillStyle = '#7a756d';
    ctx.font = '18px system-ui';
    ctx.fillText('合照（半透明背景）', scene.left.x + 28, scene.left.y + 48);

    // right panel — cake + candles
    drawCake();

    // stack shadow area
    drawRoundedRect(scene.stack.x, scene.stack.y, scene.stack.w, scene.stack.h, 12);
    ctx.fillStyle = '#efe6da'; ctx.fill();

    // placed cards first
    const placed = cards.filter(c => c.placed).sort((a, b) => a.z - b.z);
    for (const card of placed) drawCard(card);

    // stack (unplaced) — only show a few top edges visually
    const unplaced = cards.filter(c => !c.placed).sort((a, b) => a.z - b.z);
    for (const card of unplaced) drawCard(card, true);

    // dragging card on top
    if (dragging) drawCard(dragging.card);
}

function drawCake() {
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
    let lit = 0;
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
    drawRoundedRect(x, y, card.w, card.h, 10);
    ctx.fillStyle = card.bg; ctx.fill();
    ctx.strokeStyle = '#d9d1c8'; ctx.lineWidth = 1.5; ctx.stroke();

    // subtle header strip
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(x, y, card.w, 18);

    // text
    ctx.fillStyle = '#444';
    ctx.font = '15px system-ui';
    ctx.fillText(card.text, x + 12, y + 36);
}

// ---- Input / Drag ----
canvas.addEventListener('pointerdown', (e) => {
    const p = getPointer(e);
    if (state === STATE.INTRO) return;

    // only the top unplaced card is draggable
    const topUnplaced = cards.filter(c => !c.placed).sort((a, b) => b.z - a.z)[0];
    if (topUnplaced && rectContains({ x: topUnplaced.x, y: topUnplaced.y, w: topUnplaced.w, h: topUnplaced.h }, p.x, p.y)) {
        dragging = { card: topUnplaced, dx: p.x - topUnplaced.x, dy: p.y - topUnplaced.y };
    } else {
        // allow dragging already-placed cards for repositioning
        const placedTop = cards.filter(c => c.placed && rectContains({ x: c.x, y: c.y, w: c.w, h: c.h }, p.x, p.y)).sort((a, b) => b.z - a.z)[0];
        if (placedTop) {
            dragging = { card: placedTop, dx: p.x - placedTop.x, dy: p.y - placedTop.y };
        }
    }
});

canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = getPointer(e);
    const c = dragging.card;
    c.x = p.x - dragging.dx;
    c.y = p.y - dragging.dy;
    drawScene();
});

canvas.addEventListener('pointerup', () => {
    if (!dragging) return;
    const c = dragging.card;
    // snap and mark placed if it was from stack region
    c.x = snap(c.x);
    c.y = snap(c.y);

    if (!c.placed) {
        c.placed = true;
        candlesLit = Math.min(TOTAL_CARDS, candlesLit + 1);
        setProgress();
        if (candlesLit === TOTAL_CARDS) {
            btnNext.disabled = false;
        }
    }
    // bring to top
    const maxZ = Math.max(...cards.map(k => k.z));
    c.z = maxZ + 1;
    dragging = null;
    drawScene();
});

function getPointer(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
}

// ---- Flow buttons ----
btnStart.addEventListener('click', () => {
    if (state === STATE.INTRO) { state = STATE.ARRANGE; btnStart.disabled = true; }
});

btnNext.addEventListener('click', () => {
    if (state === STATE.ARRANGE && candlesLit === TOTAL_CARDS) {
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
    candlesLit = 0;
    cards.forEach((c, i) => {
        c.placed = false;
        c.x = scene.stack.x + 8 + i * 0.8;
        c.y = scene.stack.y + 8 + i * 0.5;
        c.z = i + 1;
    });
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

// ---- Init ----
layout();
setProgress();
drawScene();

window.addEventListener('resize', () => {
    // Canvas intrinsic size stays; CSS scales. Only re-render.
    drawScene();
});