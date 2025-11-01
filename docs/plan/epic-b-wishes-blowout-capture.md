# Epic B — Wishes, Blowout, Capture Plan

## Context & Goals
- Epic B covers the post-card flow: displaying a wishes prompt, detecting the candle blowout via microphone input, and grabbing a celebratory photo once the blowout succeeds.
- The current implementation (see `main.js`) still exposes three wish input fields (`wishesPanel`) and immediately jumps from `STATE.BLOW` to `STATE.CAPTURE`. There is a TODO where microphone detection should start.
- Requirements update the flow (see `docs/birthday_card_prd.md`) so the user is not typing wishes. Instead, we show a five-second hint encouraging wishes, start listening to the microphone during that hint, and surface the camera preview at the top-right above the cake while listening. The camera should capture the frame when the candles extinguish.

## Deliverables
1. Replace the text-input-based wish stage with a timed hint overlay (Traditional Chinese) that hands off into the blowout flow automatically.
2. Integrate microphone analysis that gradually extinguishes candles based on blow intensity and stops listening when the blowout completes.
3. Capture a front-camera frame at the moment the candles finish extinguishing and render the captured photo within the hero scene (right panel).
4. Update documentation (`docs/birthday_card_prd.md`, roadmap notes if needed) so the defined flow matches the shipped experience.

## Step-by-Step Implementation Plan

### Step 1 — Refine Wish Hint Overlay (B1: Wish Panel)
1. Update `index.html` to remove the three wish `<input>` fields and replace the panel copy with a succinct hint (e.g., 「請默念三個願望…」) plus an optional subtle progress indicator (countdown dots or progress bar). Keep the overlay element so the stage remains consistent.
2. Refresh `style.css` for the new concise hint layout (centered text, countdown badge), and ensure accessibility (aria-live or role guidance).
3. In `main.js`, adjust the state machine:
   - When `btnNext` triggers the wishes stage, show the hint overlay, start a five-second countdown timer, and call a new `beginWishHint()` helper to encapsulate the timer + microphone kick-off.
   - Ensure the overlay auto-hides after the countdown without requiring user interaction. Provide a skip-safe guard (e.g., allow the user to click to proceed).
4. Update progress messaging so the HUD communicates that the card phase is complete (e.g., temporarily swap the counter text to「準備吹蠟燭」while the hint runs) without losing the underlying candle count state.
5. Add an alternate trigger for entering the wish hint: keep `btnNext` wired for now, but also detect when the user taps the cake three times in succession and invoke the same transition handler. Document this so the button can be removed in a future pass once the new trigger is validated.

### Step 2 — Microphone-Driven Candle Blowout (B2: Candle Blowout)
1. Create a dedicated module (e.g., `scripts/interactions/blowDetector.js`) that wraps microphone permission prompts, `AudioContext`, `MediaStream`, and amplitude sampling via `getUserMedia({ audio: true })`. Expose methods: `start(onLevelChange)`, `stop()`, and `calibrate()` if needed.
2. Within the detector, compute RMS/peak amplitude per animation frame (`requestAnimationFrame`) and translate it into a normalized 0–1 intensity. Apply smoothing (moving average) to avoid flicker.
3. Enhance the state store (`scripts/state/store.mjs`) with a method such as `setCandleBlowProgress(progress)` that updates `candlesLit` independent of placed cards. Ensure the normalization logic preserves existing behaviour when progress is not set and add guard rails on `candlesLit`.
4. In `main.js`, hook the blow detector:
   - Start listening when the wish hint overlay appears; show a small “listening” indicator near the cake.
   - Map microphone intensity to candle extinguish count: derive `candlesToExtinguish = Math.round(totalCandles * progress)` where progress is capped at 1. Update the store to reduce candle flames accordingly; do not re-light candles once extinguished.
   - Detect completion once `candlesLit === 0` (or a defined minimum) and signal the next stage by stopping the microphone stream and resolving the blowout promise.
5. Handle permission and error states gracefully (fallback message, manual “blow out” button that forces completion as a last resort).

### Step 3 — Capture Moment & Render Preview (B3: Front Camera Capture)
1. Adjust the DOM to host a camera preview container anchored above the cake on the right side:
   - Repurpose `capturePanel` into an inline panel or create a new `preview` `<div>` inside the main stage overlay positioned with CSS to sit above the cake while the mic listens.
   - Ensure responsive styling so it does not occlude candles; fall back to center overlay on narrow viewports.
2. Modify `openCamera()` to request the front-facing camera (`facingMode: 'user'`), start the stream immediately when the blowout stage begins, and render the live video into the new preview window.
3. Synchronize blowout completion with capture:
   - When the microphone logic determines the candles are fully extinguished, grab a frame (reuse `captureFrameFromVideo`) without requiring the “拍照” button and close the preview once the frame is stored.
   - Store the captured image in state (or a module-level variable) for later export.
4. Render the captured photo on the canvas:
   - Decide on placement (e.g., right panel above the cake or pinned to the hero fold) and add a draw helper (`drawCapturedPhoto()`) invoked inside `drawScene()`.
   - Include a styled frame/border to match the storybook aesthetic.
5. Update export handling so the stored photo is drawn both on-screen and when saving via `exportImage()`.

### Step 4 — Documentation & Resilience
1. Revise `docs/birthday_card_prd.md` flow sections (Wish Stage, Blow Candle Stage, Photo Capture Stage) to reflect the hint-based wish prompt, automatic microphone activation, inline preview, and auto-capture moment.
2. Add any new configuration or fallback guidance to `docs/features/roadmap.md` (Epic B notes, bullet statuses) once work progresses.
3. Document microphone/camera permission handling and fallback UX in `docs/architecture.md` or a new note if gaps exist.

### Step 5 — Verification & QA
1. Manual browser QA checklist (Chrome + Safari desktop):
   - Drag cards to completion; confirm wish hint shows for five seconds and mic indicator appears.
   - Speak/blow to test partial candle extinguish (confirm audio threshold scaling).
   - Confirm photo preview appears in the right panel during listening, frame captured automatically, and stream stops afterwards.
2. Exercise permission-denied scenarios (mic/camera blocked) to ensure fallback path (manual button or message) still allows progression.
3. Run `npx prettier --write index.html main.js style.css` after changes and check for lint errors or console warnings.

## Open Questions / Assumptions
- Candle extinguish granularity: assuming we extinguish from full lit count down to zero; confirm if partial (e.g., 50%) should leave remaining candles flickering or gradually re-light if the user stops blowing.
- Export pipeline currently mirrors the on-canvas state; verify whether the captured photo should also show in the exported PNG/PDF with identical styling.
- Determine whether we need a calibration step for microphone sensitivity or if a fixed threshold suffices for the birthday scenario environment.
