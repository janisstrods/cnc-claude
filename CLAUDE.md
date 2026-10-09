# Commands & Colors: Ancients — notes for Claude

Browser game: TypeScript + Vite + React, pure rules engine in `src/engine`, AI in `src/ai` (Web Worker).

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server on http://localhost:5173 (launch config `dev`) |
| `npm test` | All Vitest tests (engine, rules, AI; ~25 s) |
| `npm run typecheck` | `tsc --noEmit -p .` |
| `npm run build` | Type-check, then build the static site into `docs/` |

Slow opt-in AI matches: `npx vite-node scripts/ai-match.ts -- --a tribune --b recruit --games 2` (see the file header for flags).

## Publishing (GitHub Pages)

- Repo: https://github.com/janisstrods/cnc-claude. Live site: https://strods.work/cnc-claude/.
- Pages serves **`main` branch, `/docs` folder**. `docs/` is generated build output: never hand-edit it, and never put notes there (design notes live in `design/`).
- To publish a change: `npm run build`, then commit the source changes **together with the regenerated `docs/`**, then `git push`. Pages updates about a minute later.
- `docs/.nojekyll` comes from `public/.nojekyll`; keep it.
- `vite.config.ts` uses `base: './'` and routes are hash-based (`#/...`) so the site works under `/cnc-claude/`. Do not introduce absolute asset paths (`/assets/...`).
- To check the built site under the sub-path locally: run `npm run build`, then start the `pages-preview` launch config (http://localhost:4173/cnc-claude/).
- **No GitHub Actions:** the push token lacks the `workflow` scope, so a push that adds `.github/workflows/*` is rejected.
- **Pushing:** use HTTPS with the macOS keychain credential. The `gh` CLI and SSH keys are not set up.

## Development shortcuts

- Dev-only routes: `#/play/<scenario>/<top|bottom>/<recruit|tribune|consul>[/<seed>]` and `#/gallery/art|terrain|kit`.
- In dev, `window.__cca` is the GameController. `__cca.autoAnswer()` plays a random legal move for the human, and `__cca.setSpeed(4)` speeds up animations.

## Rules and docs

- `design/rules-reference.md` is the authoritative condensed rules. Rules tests in `tests/rules` are written from it.
- `design/superpowers/` holds the original design spec and implementation plan.
