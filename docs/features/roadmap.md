# Feature Roadmap

## Epic A · Canvas Interaction Core
- **A1 Scene Layout & Scaling** (Done): Canvas stays 16:9, resizes with viewport without stretching; safe area guides stay aligned.
- **A2 Card Stack Drag & Snap** (Done): Only the top unplaced card can be dragged; placed cards can reorder; drop snaps to grid and lights one candle via shared store/interactions.
- **A3 Candle Progress + HUD** (Done): One candle lights per card placed; 27/27 unlocks the next phase; HUD mirrors progress count from store state.
- **A5 Scene Background Composite** (Done): Stretch the scene so the cake sits within the hero background; blend `Jenny.png` (temporary asset) into the left panel and adjust canvas widths.
- **A6 Card Transparency & Styling** (Done): Apply semi-transparent fills/frames so stacked cards reveal the hero art while staying readable.
- **A7 2.5D Cake & Candle Layout**: Redesign cake with an oval top, slimmer 27-candle grid, and updated flame animation matching the new perspective.
- **A8 Card Content Dataset** (In Progress): Cards shrink slightly and now load copy from `card.js` at runtime, keeping the dataset aligned with the store.
- **A4 Motion Polish**: Drag-out scaling, landing easing, and subtle flame jitter all render at a locked 60fps, tuned after the visual refresh.

## Epic B · Wishes, Blowout, Capture
- **B1 Wish Panel**: Three-column input with sticker slot; submit writes text and sticker to the active card.
- **B2 Candle Blowout**: Microphone threshold extinguishes candles; UI signals threshold state and offers a manual fallback if denied.
- **B3 Front Camera Capture**: 3-2-1 countdown, capture uses front camera, and places the frame on the left card panel.

## Epic C · Output & Assets
- **C1 High-Res Export**: Export delivers 1920×1080 PNG and A4 PDF; `exportCanvas` composes all layers correctly.
- **C2 Card Styling**: Cards share consistent margins and 3–4 subtle backgrounds; shuffled order preserves visual balance.
- **C3 Audio Bed**: Background music + SFX respect volume controls; permission denials fail gracefully.

## Epic D · Content & Resilience
- **D1 Copy Dataset**: 27-line copy loads from JSON so text changes avoid code edits; font stacks include fallbacks.
- **D2 Access & Privacy Notices**: Clear microphone/camera rationale with decline handling; fallback UX remains functional.
- **D3 QA Edge Cases**: Any stage can hard reset without corrupting state; rapid drag/drop stays error-free.

## Next Steps · BDD Sprint Kickoff
- **State Store Scenarios** (Done): Gherkin coverage in `features/card-progress.feature`; store implemented in `scripts/state/store.mjs`.
- **Module Bootstrap Scenario** (Done): `index.html` + `main.js` load as ES modules with store wiring verified.
- **Card Interaction Scenario** (Done): Drag controller lives in `scripts/interactions/cards.js`, passing BDD + manual Chrome/Safari checks.
