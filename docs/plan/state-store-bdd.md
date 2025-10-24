# State Store BDD Sprint Plan

## Objective
Deliver a modular state store that supports the 27-card interaction loop and unlocks Epic A scenarios by driving development with Gherkin-based behavior specs.

## Scope
- Card placement, candle progress, and reset flows modeled in the store.
- Module bootstrap adjustments for ES module loading and canvas init.
- Drag-and-snap interaction refactor anchored to BDD scenarios.

## Deliverables
1. Gherkin feature files covering card placement, candle increments, and reset behaviors.
2. Minimal Node runner (or script) to execute scenarios manually.
3. `scripts/state/store.js` implementation satisfying the specs.
4. Updated `main.js`/`index.html` bootstrap aligned with the store contract.
5. Refactored drag/drop logic in `scripts/interactions/cards.js` validated via scenarios + manual Chrome/Safari smoke test.

## Work Breakdown
1. **Author Scenarios**
   - Draft `features/card-progress.feature` with Given/When/Then for top-card drag, candle lighting, and reset.
   - Add acceptance notes for edge cases (double drag, rapid reset) mapped to Epic D3.
2. **Build Test Harness**
   - Add `scripts/dev/run-features.js` to parse and execute scenarios; wire simple step definitions.
   - Document usage in `README.md` dev section.
3. **Implement Store**
   - Create `scripts/state/store.js` with immutable state snapshot + subscription API.
   - Add actions: `initializeDeck`, `dragCard`, `placeCard`, `resetSession`.
4. **Wire Bootstrap**
   - Convert `index.html` script tag to `type="module"`; ensure `main.js` exports init.
   - Update `main.js` to consume store and delegate to canvas/interactions modules.
5. **Refactor Card Interactions**
   - Move drag/drop logic into `scripts/interactions/cards.js` using store actions.
   - Verify scenarios pass; run manual Chrome/Safari tests for candle progression.

## Risks & Mitigations
- **Gherkin Runner Complexity**: keep harness lightweight; if parsing stalls, use tagged JSON scenarios instead.
- **Permission Hooks**: store should mock microphone/camera states; defer full media integration to later epics.
- **Regression Surface**: schedule manual regression after refactor with existing QA checklist.

## Definition of Done
- Gherkin scenarios green via CLI.
- Manual drag/drop + candle progression verified in Chrome and Safari with no console errors.
- Documentation updated (`docs/architecture.md`, `README.md`) to reflect store module usage.
