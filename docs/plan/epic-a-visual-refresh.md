# Epic A Visual Refresh Plan (A5–A8)

## Objectives
- Expand the canvas scene to integrate the new hero artwork (`Jenny.png`) and ensure the cake sits within the same background plane.
- Restyle mini cards and cake elements so the refreshed background remains visible while maintaining readability and performance.
- Load card copy from structured data to align visuals with the 27-card dataset.

## Scope
1. **A5 Scene Background Composite**
   - Add `images/Jenny.png` (temporary asset) and scale the left background so the cake remains in frame.
   - Adjust canvas layout constants to maintain 16:9 while widening the background imagery.
   - Introduce a simple preloader/fallback color for the background asset.
2. **A6 Card Transparency & Styling**
   - Update card fill/outline/shadow to use semi-transparent layers.
   - Verify contrast for text (potentially add subtle backdrop blur or stronger text color).
3. **A7 2.5D Cake & Candle Layout**
   - Redraw cake with an oval top layer and slimmer candles (27 total) positioned along the ellipse.
   - Update flame rendering to match new candle size and add subtle shading for depth.
4. **A8 Card Content Dataset**
   - Move card copy into `data/cards.json` (new file) and load via fetch/import.
   - Shrink card dimensions to match the new background scale; ensure drag/snap still works.

## Work Breakdown
1. **Asset Setup & Layout**
   - Place `Jenny.png` under `images/` and update build references.
   - Tweak scene layout constants in `main.js` so background + cake share a unified region.
2. **Background Rendering**
   - Draw the hero image onto the canvas before cards/cake; add loading guard.
   - Adjust stack/canvas colors to complement the new art.
3. **Card Styling**
   - Modify card drawing routine to use rgba fills, new stroke color, and optional blur overlay.
   - Re-test drag/drop readability against the new background.
4. **Cake Redraw**
   - Replace current rectangle cake with layered shapes representing a 2.5D perspective.
   - Redistribute 27 candles along the top ellipse; ensure lighting animation functions.
5. **Card Dataset Integration**
   - Convert `card.js` dataset to JSON; ensure `TOTAL_CARDS` stays in sync.
   - Update store initialization to pull card copy from the dataset and scale card size.
6. **QA & Docs**
   - Run `node scripts/dev/run-features.mjs` and manual Chrome/Safari passes focusing on readability + performance.
   - Update roadmap/test notes as needed.

## Risks & Mitigations
- **Large Image Performance**: If the hero asset impacts load time, consider generating a web-optimized version or lazy-load after initial paint.
- **Text Legibility**: Semi-transparent cards may reduce contrast; be ready to introduce drop shadows or darker text color.
- **Canvas Scaling**: Layout tweaks might affect pointer math; validate drag snap points after resizing.

## Definition of Done
- Background image appears behind cards and cake without layout overlap issues.
- Cards are semi-transparent yet legible; drag/drop works with updated sizing.
- Cake shows 27 slim candles on an oval top with updated flame animation.
- Card text loads from structured data (`data/cards.json`), matching `TOTAL_CARDS`.
- BDD suite stays green and manual Chrome/Safari tests pass with no console errors.
