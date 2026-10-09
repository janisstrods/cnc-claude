# Commands & Colors: Ancients — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Scale note: this is a large project. Engine tasks are authored by the lead directly (TDD); delegated tasks are
> specified by exact file ownership, interfaces and acceptance criteria instead of pre-written code.

**Goal:** A fully playable browser version of Commands & Colors: Ancients (base game, 15 scenarios) vs a strong AI,
with original illustrated-miniature art.

**Architecture:** Pure TS rules engine (generator-based turn flow yielding decisions, seeded RNG, replayable), AI in a
Web Worker (Monte-Carlo plan search + heuristics), React + SVG UI. See `docs/superpowers/specs/2026-10-09-cnc-ancients-design.md`
and the rules spec `docs/rules-reference.md`.

**Tech Stack:** Vite 5, React 18, TypeScript 5 (strict), Vitest, @fontsource/cinzel, @fontsource/eb-garamond.

## Global Constraints

- No GMT artwork or verbatim GMT text in the app (card/scenario texts are paraphrased; setups are data).
- Engine (`src/engine/**`) must not import React/DOM; must be deterministic given state.rng.
- AI must never read the opponent's hand, the deck order, or reuse the live RNG (simulations reseed).
- Only legal options are offered by the UI; engine validates every answer and throws on illegal ones.
- Each delegated agent edits only the files/dirs it owns; agents do not commit (lead commits).
- Third-party assets must be OFL/CC0/CC-BY and listed in `src/ui/Credits.tsx` + `CREDITS.md`.

---

## File map

```
index.html, vite.config.ts, tsconfig.json, package.json
src/main.tsx                     app entry
src/engine/types.ts              all shared engine types (lead)          <- contract for everyone
src/engine/rng.ts                mulberry32 seeded RNG + dice roll
src/engine/hex.ts                coords, neighbours, distance, sections, LOS geometry
src/engine/units.ts              UNIT_STATS table + helpers
src/engine/terrain.ts            TERRAIN table + helpers
src/engine/cards.ts              CARD_DEFS (60 cards), deck build, texts
src/engine/setup.ts              scenario -> GameState
src/engine/query.ts              board queries: pieceAt, adjacency, support, sections
src/engine/movement.ts           reachable hexes for units/leaders, move application
src/engine/orders.ts             order legality per card, auto-order cards
src/engine/combat.ts             dice counts, hit scoring, ranged/close combat resolution (generators)
src/engine/retreat.ts            retreat/evade options, rampage, leader evade/escape
src/engine/flow.ts               turn generator + game loop + special rules hooks
src/engine/driver.ts             GameDriver: runs generator, records answers, replay/undo, event queue
src/engine/index.ts              public API barrel
src/scenarios/data/*.json        15 transcribed scenarios
src/scenarios/index.ts           ScenarioDef list + text (original summaries)
src/art/**                       miniature figures + palettes (agent A)
src/ui/terrain/**                terrain + board art (agent B)
src/ui/kit/**                    cards, dice, banners, buttons, panels (agent C)
src/ui/**                        screens, board interaction, prompts (lead)
src/ai/**                        AI (agent D)
tests/engine/*.test.ts           lead TDD tests
tests/rules/*.test.ts            independent rules tests (agent E)
```

## Phase 0 — Scaffold (lead)

### Task 0.1: Project scaffold
- [ ] Create Vite React-TS project files manually (package.json, tsconfig, vite.config with worker + vitest config, index.html).
- [ ] Install: react, react-dom, typescript, vite, @vitejs/plugin-react, vitest, @fontsource/cinzel, @fontsource/eb-garamond.
- [ ] `npm run build` and `npx vitest run` succeed on an empty smoke test. Commit.

## Phase 1 — Engine contract (lead)

### Task 1.1: `src/engine/types.ts`
Defines: `Side, UnitType, UnitClass, TerrainType, Faction, SectionName, DieFace, HexId (number = r*13+c),
Unit, Leader, PlayerState, GameState, CardKind, CardDef, Decision (union), Answer (union), GameEvent (union)`.
Exact definitions live in the file; they are the contract for all agents. Commit before launching Phase 2 agents.

## Phase 2 — Parallel agents (after Task 1.1)

### Task A: Miniature art (agent, owns `src/art/**`, `src/dev/ArtGallery.tsx`)
Produces:
```ts
export const FACTION_PALETTES: Record<Faction, Palette>;
export function UnitFigures(props: { type: UnitType; faction: Faction; blocks: number; maxBlocks: number;
  facing: 'left'|'right'; size: number /* hex width px */ }): JSX.Element; // <g>, centred at 0,0
export function LeaderFigure(props: { faction: Faction; facing: 'left'|'right'; size: number }): JSX.Element;
export function UnitIcon(props: { type: UnitType; faction: Faction; size: number }): JSX.Element; // single figure for UI
```
Acceptance: gallery page shows all 12 types x 3 factions x block counts; figures readable at 85px hex width;
silhouettes distinguish LI/LB/LS/AX/WA/MI/HI/LC/MC/HC/EL/HCH; screenshot reviewed by lead.

### Task B: Terrain & board art (agent, owns `src/ui/terrain/**`, `src/dev/TerrainGallery.tsx`)
Produces:
```ts
export const HEX: { size: number; w: number; h: number }; // pointy-top geometry used by the whole UI
export function hexCenter(r: number, c: number, flipped: boolean): { x: number; y: number };
export function BoardArt(props: { terrain: TerrainType[]; fords: boolean[]; flipped: boolean }): JSX.Element;
```
Acceptance: painted parchment/grass board with section lines, hills, forests, flowing connected rivers (fords visibly
different), lake, steep hills, camp, marsh, broken ground; renders all 15 scenario terrains; looks good flipped.

### Task C: UI kit (agent, owns `src/ui/kit/**`, `src/dev/KitGallery.tsx`)
Produces: `CardView({kind, selected, disabled, size, onClick})`, `CardBack`, `DieView({face, rolling, highlight})`,
`DiceTray({rolls})`, `BannerTrack({side, count, target, faction})`, `Button`, `Panel`, theme CSS variables.
Acceptance: all 24 card kinds render with title, section mini-map, icon and paraphrased text; dice show 6 symbols.

### Task D: AI (agent, after Phase 3 engine API is complete; owns `src/ai/**`, `tests/ai/**`)
Produces `chooseAnswer(state: GameState, decision: Decision, opts: AiOptions): Answer` + worker wrapper.
Acceptance: beats a random-legal-move player >90% over 40 games; AI-vs-AI completes all 15 scenarios without errors;
average decision time < 1.5 s at "Tribune".

### Task E: Independent rules tests (agent, after Phase 3; owns `tests/rules/**`)
Writes scenario-style tests derived only from `docs/rules-reference.md` (not from engine code) using `GameDriver`
and helper builders; reports failures to lead.

## Phase 3 — Engine implementation (lead, TDD)

Each task: write failing tests in `tests/engine/<name>.test.ts`, implement, pass, commit.
- [ ] 3.1 rng.ts + hex.ts (neighbours odd-r, distance, sections incl. shared hexes, LOS with edge rule)
- [ ] 3.2 units.ts + terrain.ts tables (values per rules-reference §2, §4, §7)
- [ ] 3.3 cards.ts (60 cards, counts per §12) + setup.ts (scenario -> state, shuffle, deal)
- [ ] 3.4 query.ts + movement.ts (stops, impassable, leaders, pass-through lights, battle-after-move flags)
- [ ] 3.5 orders.ts (every card's legality, auto-order cards, leadership chains, detach)
- [ ] 3.6 combat.ts dice counts (caps, camp, bonuses, elephants, warriors, chariots) + hit scoring
- [ ] 3.7 retreat.ts (retreat options, losses, leader attach, marsh, elephants rampage/blocked, evade, leader evade/escape)
- [ ] 3.8 flow.ts close combat sequence (evade/First Strike/battle back/momentum/cavalry extra/bonus), ranged, cards
       (Clash, Darken, MFM, Rally, Spartacus, Counter Attack), draw/reshuffle, victory, special rules
- [ ] 3.9 driver.ts (answers log, replay, undo-if-no-rng, event snapshots) + scenarios/index.ts

## Phase 4 — UI integration (lead)
- [ ] 4.1 App shell: title, scenario picker, side/difficulty, credits, rules reference
- [ ] 4.2 Board interaction: selection, reachable/target highlights, odds tooltip, flip
- [ ] 4.3 Hand + card play, order selection UX per card type, prompts for every Decision kind
- [ ] 4.4 Event animation queue (moves, dice tray, hits, retreats, banners), battle log, victory screen
- [ ] 4.5 AI worker integration, autosave/resume, undo move

## Phase 5 — Verification
- [ ] 5.1 Scenario setup visual check vs reference maps (all 15)
- [ ] 5.2 AI-vs-AI soak test, all scenarios, both sides
- [ ] 5.3 Review workflow (rules audit, AI review, UI review) -> fixes
- [ ] 5.4 Browser playthrough(s); final polish; README
