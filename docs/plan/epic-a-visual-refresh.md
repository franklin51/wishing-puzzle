# Epic A Visual Refresh Plan (A5–A8)

## Objectives
- Expand the canvas scene to integrate the new hero artwork (`Jenny.png`) and ensure the cake sits within the same background plane.
- Restyle mini cards and cake elements so the refreshed background remains visible while maintaining readability and performance.
- Load card copy from structured data to align visuals with the 27-card dataset.

## Scope
1. **A5 Scene Background Composite (Done)**
   - Add `hero-jenny.png` and scale the left background so the cake remains in frame.
   - Adjust canvas layout constants to maintain 16:9 while widening the background imagery.
   - Introduce a simple preloader/fallback color for the background asset.
2. **A6 Card Transparency & Styling (Done)**
   - Update card fill/outline/shadow to use semi-transparent layers with paper texture.
   - Center card text using `Dancing Script` for a handwritten feel.
3. **A7 2.5D Cake & Candle Layout**
   - Redraw cake with an oval top layer and slimmer candles (27 total) positioned along the ellipse.
   - Update flame rendering to match new candle size and add subtle shading for depth.
4. **A8 Card Content Dataset**
   - Move card copy into `data/cards.json` (new file) and load via fetch/import.
   - Shrink card dimensions to match the new background scale; ensure drag/snap still works.

## Work Breakdown
1. **Asset Setup & Layout**
   - Place `hero-jenny.png` under `images/` and update build references. ✅
   - Tweak scene layout constants in `main.js` so background + cake share a unified region. ✅
2. **Background Rendering**
   - Draw the hero image onto the canvas before cards/cake; add loading guard. ✅
   - Adjust stack/canvas colors to complement the new art. ✅
3. **Card Styling**
   - Modify card drawing routine to use rgba fills, new stroke color, and texture overlay. ✅
   - Center card text with script font and drop shadow for readability. ✅
4. **Cake Redraw (Next)**
   - Lower the cake so its base aligns with the card stack baseline.
   - Replace the blocky cake with layered shapes (oval top, frosting rim, plate) to fake 2.5D depth.
   - Redistribute 27 smaller candles along the oval; keep flame animation responsive to state.
   - Add highlights/shadows for frosting, plate, and candle stems to increase delicacy.
5. **Card Dataset Integration**
   - Convert `card.js` dataset to JSON; ensure `TOTAL_CARDS` stays in sync.
   - Update store initialization to pull card copy from the dataset and scale card size.
6. **QA & Docs**
   - Run `node scripts/dev/run-features.mjs` and manual Chrome/Safari passes focusing on readability + performance.
   - Update roadmap/test notes as needed.

## Risks & Mitigations
- **Large Image Performance**: If the hero asset impacts load time, consider generating a web-optimized version or lazy-load after initial paint.
- **Text Legibility**: Semi-transparent cards may reduce contrast; already mitigated with drop shadow and center alignment.
- **Canvas Scaling**: Layout tweaks might affect pointer math; validate drag snap points after resizing.

## Definition of Done
- Background image appears behind cards and cake without layout overlap issues. ✅
- Cards are semi-transparent yet legible; drag/drop works with updated sizing. ✅
- Cake shows 27 slim candles on an oval top with updated flame animation.
- Cake sits lower (aligned with card stack) and looks more delicate via shading.
- Card text loads from structured data (`data/cards.json`), matching `TOTAL_CARDS`.
- BDD suite stays green and manual Chrome/Safari tests pass with no console errors.
