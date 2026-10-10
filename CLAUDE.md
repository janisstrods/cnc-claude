# Commands & Colors: Ancients — notes for Claude

Browser game: TypeScript + Vite + React, pure rules engine in `src/engine`, AI in `src/ai` (Web Worker).

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server on http://localhost:5173 (launch config `dev`) |
| `npm test` | All Vitest tests (engine, rules, scenarios, art, terrain, UI, AI, golden games; ~1180 tests, ~80 s) |
| `npm run typecheck` | `tsc --noEmit -p .` |
| `npm run build` | Type-check, then build the static site into `docs/` |

Slow opt-in AI matches: `npx vite-node scripts/ai-match.ts -- --a tribune --b recruit --games 2` (see the file header for flags).
Expansion #1 AI-vs-AI balance runs with behaviour counters: `npx vite-node scripts/ai-balance.ts -- --scenarios 101,110 --games 2`
(see the file header; results are logged in `design/exp1-ai-balance.md`).

## Publishing (GitHub Pages)

- Repo: https://github.com/janisstrods/cnc-claude. Live site: https://strods.work/cnc-claude/.
- Pages serves **`main` branch, `/docs` folder**. `docs/` is generated build output: never hand-edit it, and never put notes there (design notes live in `design/`).
- To publish a change: `npm run build`, then commit the source changes **together with the regenerated `docs/`**, then `git push`. Pages updates about a minute later.
- Every publish is a release. Before building, add it at the top of `RELEASES` in `src/version.ts` and set the same number
  in `package.json` (and the root of `package-lock.json`). The main menu shows it in the lower-right corner, with the build time.
  Each release takes the name of a battle in the game that fits what it brings, never reused. Pick it yourself (the user
  likes a fitting, playful choice) and tell the user; there is no need to ask first.
- `docs/.nojekyll` comes from `public/.nojekyll`; keep it.
- `vite.config.ts` uses `base: './'` and routes are hash-based (`#/...`) so the site works under `/cnc-claude/`. Do not introduce absolute asset paths (`/assets/...`).
- To check the built site under the sub-path locally: run `npm run build`, then start the `pages-preview` launch config (http://localhost:4173/cnc-claude/).
- **No GitHub Actions:** the push token lacks the `workflow` scope, so a push that adds `.github/workflows/*` is rejected.
- **Pushing:** use HTTPS with the macOS keychain credential. The `gh` CLI and SSH keys are not set up.

## Development shortcuts

- Battles: `001`–`015` (base game) and `101`–`124` (Expansion #1, *Greece & Eastern Kingdoms*), data in `src/scenarios/data/<id>.json`.
- Dev-only routes: `#/play/<scenario>/<top|bottom>/<recruit|tribune|consul>[/<seed>]` (e.g. `#/play/109/top/tribune`) and `#/gallery/art|terrain|kit`.
- In dev, `window.__cca` is the GameController. `__cca.autoAnswer()` plays a random legal move for the human, and `__cca.setSpeed(4)` speeds up animations.

## Rules and docs

- `design/rules-reference.md` is the authoritative condensed rules. Rules tests in `tests/rules` are written from it.
  §15–§17 cover Expansion #1 (new units; sea, rampart and uncapped fords; elites, leader traits and scenario rules).
- `design/exp1-*.md`: Expansion #1 scenario survey (`exp1-survey.md`), rulings research (`exp1-rulings.md`),
  scenario transcription notes (`exp1-scenario-notes.md`) and AI calibration and balance log (`exp1-ai-balance.md`).
- `design/superpowers/` holds the original design spec and implementation plan.

## Battle histories

- The History dialog (briefing and in-game header) shows three slides per battle from `src/history/battles/<id>.ts`:
  context and armies, a schematic map in 1–4 phases, outcome and consequences. Format: `src/history/types.ts`;
  worked example: `battles/007.ts`; spec: `design/superpowers/specs/2026-10-10-battle-history-design.md`.
- A battle without a file simply has no History button, so new expansions add their `2xx`/`3xx` files when ready.
- Check one: `npx vite-node scripts/history-check.ts -- 007` (validator and word counts); look at it with
  `scripts/history-shot.sh 007 <dir>` against a running dev server (`#/gallery/history/007`), reading every tile.
- Texts are original prose in British spelling, hedged where the sources are uncertain, with ancient sources cited.

## Golden fixtures

- `tests/golden` replays recorded games (random-play games of the base battles plus a few AI games) and checks every
  event, so base-game behaviour cannot drift unnoticed. Never hand-edit `tests/golden/*.json`.
- Regenerate only the `ai-*` entries, and only after a deliberate AI change:
  `npx vite-node scripts/golden-record.ts > tests/golden/fixtures.json`, then check that the `rnd-*` entries are unchanged.
- `tests/art/looks.test.ts` pins a hash of the base armies' rendered art: base looks must keep drawing identically.
