# Repository Guidelines

## Project Structure & Module Organization
The interactive card ships as a static bundle. `index.html` wires the Canvas scene and overlay panels, `main.js` drives rendering and state changes, and `style.css` holds layout tokens. `card.js` stores the 27-card copy (Traditional Chinese) and must stay aligned with the `TOTAL_CARDS` constant. Experience design notes live in `docs/`; update them when the flow or art direction shifts.

## Build, Test, and Development Commands
Use a local HTTPS-capable server so camera capture works. Recommended commands:
- `python3 -m http.server 4173`
- `npx serve --listen 4173`
Launch them from the repository root, then open `http://localhost:4173/`. Opening `index.html` via the filesystem is fine for quick layout checks, but the capture panel will be blocked.

## Coding Style & Naming Conventions
Follow the existing four-space indentation and trailing semicolons in `main.js`. Prefer `const` for stable bindings and descriptive DOM handles (`wishesPanel`, `progressText`). Helper functions stay in lowerCamelCase, while state enums use SCREAMING_SNAKE_CASE. Inline comments should document interaction intent, not implementation. Run `npx prettier --write index.html main.js style.css` before committing if you touch layout or canvas code.

## Testing Guidelines
No automated harness exists yet. Exercise the flow manually on desktop Chrome and Safari: verify card dragging, candle progression, and capture modal close paths. Check that `TOTAL_CARDS` matches the dataset and that no console errors appear. After asset changes, re-test on a throttled network so the canvas still initializes within one second.

## Commit & Pull Request Guidelines
The history follows Conventional Commits (`chore: ...`, `feat: ...`), so keep subjects short (<=72 chars) and present tense. Limit each PR to a focused interaction or styling change, include a GIF or screenshot of the updated scene, and link the relevant GitHub issue or doc section. Call out any new browser or permission requirements so reviewers can replicate the setup.

## Workflow Notes
- Commit after each scoped step in the implementation plan before proceeding to the next task.
