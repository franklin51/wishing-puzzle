# Feature Roadmap

## Epic A · Canvas Interaction Core
- **A1 Scene Layout & Scaling**: Canvas stays 16:9, resizes with viewport without stretching; safe area guides stay aligned.
- **A2 Card Stack Drag & Snap**: Only the top unplaced card can be dragged; placed cards can reorder; drop snaps to grid and lights one candle.
- **A3 Candle Progress + HUD**: One candle lights per card placed; 27/27 unlocks the next phase; HUD mirrors progress count.
- **A4 Motion Polish**: Drag-out scaling, landing easing, and subtle flame jitter all render at a locked 60fps.

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
- **State Store Scenarios**: Capture Gherkin cases for card placement, candle increments, and resets; implement `scripts/state/store.js` to satisfy them.
- **Module Bootstrap Scenario**: Define Given/When/Then for loading `main.js` as an ES module; update `index.html` accordingly and verify canvas boot.
- **Card Interaction Scenario**: Write BDD steps for top-card drag, snap, and candle triggers; refactor logic into `scripts/interactions/cards.js` and ensure scenarios pass in Chrome/Safari.
