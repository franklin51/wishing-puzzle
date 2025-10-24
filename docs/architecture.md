# Architecture Plan

## Overview
The experience runs as a single-page canvas app bootstrapped by `index.html`. Rendering, state, and media access are handled by modular ES modules so we can evolve each feature slice independently while keeping performance tight for the 27-card flow.

## File & Module Layout
- `index.html`: minimal DOM shell with data-hook attributes, loads `main.js` as an ES module.
- `style.css`: entry file that `@import`s `styles/base.css`, `styles/layout.css`, and `styles/components.css` to isolate tokens from component rules.
- `main.js`: top-level controller that initializes shared services, mounts UI panels, and starts the render loop.
- `scripts/state/store.js`: single source of truth for card positions, candle progress, wish text, export status, and async permission flags. Exposes action helpers and subscribable selectors.
- `scripts/canvas/scene.js`: sets up the canvas, handles resize at 16:9, and renders cards, candles, and FX via `tick()` updates.
- `scripts/interactions/cards.js`: manages drag-and-snap rules, enforces top-card dragging, updates store, and signals candle increments.
- `scripts/interactions/candles.js`: drives candle ignition/extinguish states, including microphone sampling and fallback actions.
- `scripts/ui/panels.js`: wires HUD, wish panel, and capture modal; listens for store changes and dispatches actions.
- `scripts/ui/export.js`: wraps `exportCanvas` flow, composing layers for PNG (1920×1080) and A4 PDF outputs.
- `scripts/media/audio.js`: loads background music/SFX, applies volume controls, and handles permission denials gracefully.
- `scripts/media/camera.js`: manages 3-2-1 countdown, front-camera capture, and frame placement on the card.
- `scripts/data/cards.js`: loads `data/cards.json` (27 Traditional Chinese lines) and validates against `TOTAL_CARDS`.
- `scripts/dev/mockInput.js` (optional tooling): simulates drag/mic events to accelerate manual QA.

## Flow & Responsibilities
1. `index.html` bootstraps and hands control to `main.js` (module mode).
2. `main.js` initializes the store, binds UI panels, spins up canvas scene, and registers interaction controllers.
3. Controllers dispatch actions to the store; store emits updates that drive canvas redraw and DOM updates.
4. Media modules abstract browser APIs so permission prompts and fallbacks stay centralized.
5. Export and data modules ensure assets stay in sync with the 27-card dataset and roadmap deliverables.

## Next Implementation Steps
1. Implement `scripts/state/store.js` and migrate card/candle state to prove the pattern.
2. Update `index.html` to load `main.js` as an ES module and adjust bundling if needed.
3. Refactor drag/drop into `scripts/interactions/cards.js` and regression test candle progression in Chrome/Safari.
