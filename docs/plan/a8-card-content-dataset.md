## A8 Card Content Dataset · Implementation Plan

1. **Data Loading Layer**
   - Load `card.js` asynchronously, parse the JSON payload, normalize ids to zero-based, and verify the dataset length before bootstrapping the app.
   - Drive `store.initializeDeck` with the loaded count instead of the current `DEFAULT_TOTAL_CARDS` constant.

2. **Card Bootstrapping & Store Sync**
   - Rebuild the runtime `cards` array after data load, combining text/background styling with geometry defaults and initial stack placement.
   - Keep `syncCardsFromStore` aligned so placement state coming from the store updates the new card objects cleanly.

3. **Dimension & Style Adjustments**
   - Shrink card width/height in `main.js`, adjust typography if needed, and ensure stack spacing/candle placement stay coherent with the new footprint.
   - Validate `drawCard` still clips and renders text without overflow once the new dimensions land.

4. **Interaction Wiring Update**
   - Move `initCardInteractions` into the data-load success path so the interactions module receives a populated card list and active store reference post-fetch.
   - Confirm drag/drop, snapping, and reordering preserve stack order with the dynamically injected data.

5. **Documentation & Regression Checklist**
   - Mark Epic A8 progress in `docs/features/roadmap.md` (and supporting design notes if layouts shift).
   - Run the manual smoke flow (card dragging, candle count, state transitions) in Chrome/Safari while watching for console or network errors from the new fetch pathway.

