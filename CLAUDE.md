# Commands & Colors: Ancients — notes for Claude

Browser game: TypeScript + Vite + React, pure rules engine in `src/engine`, AI in `src/ai` (Web Worker).

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server on http://localhost:5173 (launch config `dev`) |
| `npm test` | All Vitest tests (engine, rules, scenarios, art, terrain, UI, AI, golden games; ~2570 tests, ~75 s) |
| `npm run typecheck` | `tsc --noEmit -p .` |
| `npm run build` | Type-check, then build the static site into `docs/` |

Slow opt-in AI matches: `npx vite-node scripts/ai-match.ts -- --a tribune --b recruit --games 2` (see the file header for flags).
Expansion #1 AI-vs-AI balance runs with behaviour counters: `npx vite-node scripts/ai-balance.ts -- --scenarios 101,110 --games 2`
(see the file header; results are logged in `design/exp1-ai-balance.md` and, for 201–223 and 301–319,
`design/exp2-ai-balance.md` and `design/exp3-ai-balance.md`; `--expansion exp2|exp3` picks a box).

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

- Battles: `001`–`015` (base game), `101`–`124` (Expansion #1, *Greece & Eastern Kingdoms*), `201`–`223` (Expansion #2,
  *Rome & the Barbarians*) and `301`–`319` (Expansion #3, *The Roman Civil Wars*; no Epic battles), data in
  `src/scenarios/data/<id>.json`.
- Dev-only routes: `#/play/<scenario>/<top|bottom>/<recruit|tribune|consul>[/<seed>]` (e.g. `#/play/109/top/tribune`) and `#/gallery/art|terrain|kit|history`.
- In dev, `window.__cca` is the GameController. `__cca.autoAnswer()` plays a random legal move for the human, and `__cca.setSpeed(4)` speeds up animations.
- Browser tests must be silent: before playing on a dev-server origin, run `localStorage.setItem('cca-muted','1'); location.reload()`
  (the flag is per origin, so each port needs it).

## Where things live

- One table per kind of thing: `UNIT_STATS` (`src/engine/units.ts`), `ELITES` (`elites.ts`), `TERRAIN_STATS` (`terrain.ts`)
  and `EXPANSIONS` (`expansions.ts`). A new unit type, elite or terrain is a row there, and the compiler then asks for its
  art (`FIGURE_KIND` and the slot tables in `src/art/token.tsx`; device, shield and helmet renderers in `src/art/parts.tsx`
  and `exp2/exp3-parts.tsx`). A new expansion is an `EXPANSIONS` row plus its battle files and its texts module.
- Battle rules are data: the scenario JSON → `ScenarioSetup` (`src/engine/setup.ts`) → `GameState.scenario` (readonly,
  shared by `cloneState`). Play state lives in `GameState.special` (copied). A rule that falls on one side names it in the
  data; it never goes by army name.
- Turn engine, bottom layer first (each module imports only earlier ones): `options.ts` (pure queries of the turn's
  options and the move/battle validators), `decisions.ts` (`ask`, `answerError`, the one answer check the AI also uses),
  `casualties.ts`, `attacks.ts`, `phases.ts`, `flow.ts`.
- The AI calls the engine's rules, passing its `Occ` board index as a `PieceIndex` (`src/engine/query.ts`) rather than
  copying them. Deliberate approximations in `src/ai/board.ts` say so in a comment.
- Test kits: `tests/rules/helpers.ts` (`build`/`setupOf` pass `ScenarioSetup` fields through), `tests/ai/helpers.ts`,
  `tests/scenarios/helpers.ts`, `tests/support/rng.ts`. Scripts share `scripts/lib.ts`. Long AI tests go in
  `*.slow.test.ts` files, which a sequencer in `vite.config.ts` starts first.

## Rules and docs

- `design/rules-reference.md` is the authoritative condensed rules. Rules tests in `tests/rules` are written from it.
  §15–§17 cover Expansion #1 (new units; sea, rampart and uncapped fords; elites, leader traits and scenario rules).
  §18 covers the Expansion #2/#3 mechanics (Barbarian chariot, pilum, march and legions, Caesar, Spartacus, battle
  objectives, ambush reserves, separate commands, Rolling Fire, ditch, very steep hills; for Expansion #3 §18.7–§18.11:
  city walls, hills under camps and walls, steep slopes, hand growth, reinforcements with fixed entry and forced
  placement, dice orders, immobile units), §19 the battles 201–223 and §20 the battles 301–319.
- `design/exp1-*.md`: Expansion #1 scenario survey (`exp1-survey.md`), rulings research (`exp1-rulings.md`),
  scenario transcription notes (`exp1-scenario-notes.md`) and AI calibration and balance log (`exp1-ai-balance.md`).
- `design/exp2-*.md` and `design/exp3-*.md`: the same survey / rulings / notes / balance documents for Expansions #2
  and #3. Expansion #3's verified transcription notes are in `design/exp3-data/`; its plan is
  `design/superpowers/plans/2026-10-10-exp3-roman-civil-wars.md`.
- `design/superpowers/` holds the design specs and implementation plans.
- Battle objectives (camp captures, held banners, majority, section clear, exits) are data (`objectives` in the scenario
  JSON) handled by `src/engine/objectives.ts`, `held.ts` and `banners.ts`; victory counts `bannerTotal` (permanent +
  held). Terrain may change during play only through `setTerrain` (copy-on-write; `cloneState` shares the arrays).

## Battle histories

- The History dialog (briefing and in-game header) shows three slides per battle from `src/history/battles/<id>.ts`:
  context and armies, a schematic map in 1–4 phases, outcome and consequences. Format: `src/history/types.ts`;
  worked example: `battles/007.ts`; spec: `design/superpowers/specs/2026-10-10-battle-history-design.md`.
- A battle without a file simply has no History button, so new expansions add their `2xx`/`3xx` files when ready;
  `COVERED` in `tests/history/history.test.ts` lists the expansions whose battles must all have one.
- Check one: `npx vite-node scripts/history-check.ts -- 007` (validator and word counts); look at it with
  `scripts/history-shot.sh 007 <dir>` against a running dev server (`#/gallery/history/007`), reading every tile.
  `#/gallery/history/maps[/101-124]` is a contact sheet of every map phase, for checking many battles at once.
- Texts are original prose in British spelling, hedged where the sources are uncertain, with ancient sources cited.

## Golden fixtures

- `tests/golden` replays recorded games (random-play games of the base battles plus a few AI games) and checks every
  event, so base-game behaviour cannot drift unnoticed. Never hand-edit `tests/golden/*.json`.
- Regenerate only the `ai-*` entries, and only after a deliberate AI change:
  `npx vite-node scripts/golden-record.ts > tests/golden/fixtures.json`, then check that the `rnd-*` entries are unchanged.
- `tests/art/looks.test.ts` pins a hash of the base armies' rendered art: base looks must keep drawing identically.
