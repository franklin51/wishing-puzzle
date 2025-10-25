# A10 · Bobo Companion Placement

## Objective
Integrate `images/bobo.png` as a supporting character alongside the cake while keeping the candle arc and cards readable.

## Implementation Plan
1. **Asset Prep**
   - Import `bobo.png` in `main.js`, mirroring the pattern used for `kuoka.png`.
   - Define sizing ratios relative to `scene.right` so the asset stays proportionate across viewports.
2. **Layout Pass**
   - Position Bobo just left of the cake by extending the right panel bounds or layering directly in `drawCake()`.
   - Add subtle drop shadow or blend adjustments so the figure sits naturally against the backdrop without overlapping candles.
3. **State & Interaction Check**
   - Ensure the added render order does not block card drag targets or hover hints.
   - Validate that export compositing and candle animations remain unaffected.
4. **QA Notes**
   - Manual smoke test on Chrome/Safari to verify responsive sizing and no aliasing.
   - Update `docs/features/roadmap.md` status once implemented.

