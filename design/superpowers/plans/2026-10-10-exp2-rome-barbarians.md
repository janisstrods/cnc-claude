# Expansion #2 — Rome & the Barbarians Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Scale note (same convention as the Expansion #1 plan): engine tasks are TDD with concrete tests and exact interfaces;
> delegated tasks (data, art, AI) are specified by file ownership, interfaces and acceptance criteria.

**Goal:** Add the 23 Expansion #2 battles (201–223) with the Barbarian light chariot, the Marius legions, the Tenth
Legion, Caesar and Spartacus, battle objectives, Rolling Fire, separate commands, new terrain, per-army art and AI
support, without changing base-game or Expansion #1 play.

**Architecture:** Battle objectives (capture, hold, majority, section clear, exit) become data read by engine, AI and
UI through `src/engine/objectives.ts`; the base camp and exit rules move onto it (golden games prove no drift). Unit
abilities stay table/elite/leader-trait data, extended with a side-wide legion stamp. Terrain may change during play
through one copy-on-write helper. Art gets a per-kit table before new kits are added.

**Tech Stack:** TypeScript 5 (strict), React 18, Vite 5, Vitest. No new dependencies.

**Spec:** `design/superpowers/specs/2026-10-10-exp2-exp3-rome-design.md`. Research: `design/exp2-survey.md`,
`design/exp2-rulings.md` (its Decisions table is binding unless the spec overrides it).

## Global Constraints

- Work only in the worktree `.claude/worktrees/exp2` (branch `exp2-rome-barbarians`); the art track works in
  `.claude/worktrees/exp2-art` (branch `exp2-art`, branched after Task 1, merged back in Task 18). Other sessions edit
  `main` in the main checkout: never touch it. Merge `main` into the branch regularly (`git merge main`).
- Several agents share a worktree: commit with explicit paths (`git commit <paths> -m …`), never `git add -A`.
- `docs/` is generated build output: do not edit or commit it until the release task.
- No GMT artwork or verbatim GMT text in the app; briefing texts are original, special rules paraphrased. Official map
  images are used only for transcription and verification in the scratchpad, never bundled.
- Engine (`src/engine/**`) stays pure TS (no DOM/React) and deterministic given `state.rng`.
- The AI never reads the opponent's hand, the deck order or the live RNG.
- Base-game and Expansion #1 behaviour must not change: `tests/golden` stays green with **unchanged fixtures** through
  every engine task; `tests/rules/exp1-*.test.ts` keep their expectations (only their setup syntax may change);
  `tests/art/looks.test.ts` and `tests/terrain/base-boards.test.ts` pins stay identical. `ENGINE_VERSION` in
  `src/ui/game/controller.ts` is not bumped.
- Commits: author `Janis Strods <jstrods@gmail.com>` (already the repo's local config); message ends with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Rules guesses are marked **[Interp]** in `design/rules-reference.md`, with the ruling source when one exists.
- Test commands: `npx vitest run <path>` for one file, `npm test` for all (~80–100 s), `npm run typecheck`.
- Hex coordinates: `hexId(r, c) = r * 13 + c`; row 0 is the top edge; even rows have 13 hexes (c 0–12), odd rows 12
  (c 0–11) shifted right (odd-r layout). Side `top` owns row 0 as its baseline, `bottom` row 8.

---

## File map

```
src/engine/types.ts         + UnitType BCH, TerrainType ditch, Blocks bar, new ArmyLooks, EliteId tenthLegion,
                              LeaderTrait forcedMarch/spartacusDice, Unit.legion/command, Leader.command,
                              ObjectiveDef/ObjectiveState, Decision chooseCommand, Answer rollingFire,
                              events objective/terrainChanged, SpecialRuleId veryHills, ScenarioSpecial additions
src/engine/units.ts         BCH row; abilities helpers hasPilum/canMarch/fireMoveLimit/rangedBaseDice
src/engine/elites.ts        tenthLegion preset; EliteAbility pilum/march; rangeOf includes pilum
src/engine/objectives.ts    NEW: objective setup resolution, scoring, bannerTotal, held banners, exits
src/engine/setup.ts         new scenario fields + validation; legion stamp; objectives; commands; ambush config
src/engine/flow.ts          objectives hooks; turn-start capture; ambush triggers; Rolling Fire; last-row retreat;
                              Spartacus dice; chooseCommand
src/engine/movement.ts      march / Caesar limits; exits from objectives; ditch; very steep hills
src/engine/combat.ts        pilum dice; very steep hill caps
src/engine/terrain.ts       ditch; setTerrain (copy-on-write)
src/engine/orders.ts        one command per card
src/engine/legal.ts         randomAnswer for chooseCommand and rollingFire
src/scenarios/index.ts      ScenarioJson fields; expansion 'exp2'; EXTRA 010/011 objectives
src/scenarios/exp2-texts.ts NEW briefing texts 201–223
src/scenarios/data/2xx.json NEW (23 files)
src/art/**, src/dev/**      kit table, bar blocks, celtic/germanic/lateRoman kits, looks, figures   (art track)
src/ui/terrain/**           ditch, coast ford, removable tiles, objective markers                    (art track)
src/ui/**                   picker tab, banner track, prompts, tooltips, rules reference
src/ai/**                   objectives, new units/rules, policies, personalities, voice
tests/rules/exp2-*.test.ts  NEW rules tests;  tests/scenarios/exp2.test.ts NEW;  tests/ai/exp2.test.ts NEW
design/rules-reference.md   §18 (Expansion #2/#3 shared rules), §19 (Expansion #2 battles)
design/exp2-scenario-notes.md, design/exp2-ai-balance.md  NEW
```

---

## Phase 1 — Foundations

### Task 1: Types scaffold and the Barbarian light chariot (engine)

**Files:** Modify `src/engine/types.ts`, `src/engine/units.ts`, `src/art/palettes.ts` (temporary fallbacks only),
`src/art/token.tsx`, `src/art/icon.tsx`, `src/ai/values.ts`, `src/ai/voice.ts`, `src/dev/ArtGallery.tsx` (exhaustive
records only). Test: `tests/rules/exp2-units.test.ts` (new).

**Produces:**

```ts
// types.ts
export type UnitType = … | 'BCH';
export const BLOCKS = ['rom', 'car', 'grk', 'eas', 'bar', 'gry'] as const;   // gry: grey Roman (210 Lentulus' command)
export const ARMY_LOOKS = [ …existing…, 'gallic', 'germanic', 'slave', 'belgic', 'briton', 'marian' ] as const;
// units.ts
BCH: U({ type: 'BCH', name: 'Barbarian Chariots', cls: 'light', whiteBorder: true, foot: false, infantry: false,
  mounted: true, cavalry: false, chariot: true, blocks: 3, move: 3, moveBattle: 3, cc: 2, ccBack: 2, range: 0, retreat: 3,
  swordHits: true, evade: 'always', elephantDiceAgainst: 2, swordIgnore: 1, fullStrengthBonus: true,
  frightenedBy: ['EL', 'CAM'], noRally: true }),
```

Temporary art fallbacks so the app builds (the art track replaces them): `BLOCK_COLORS.bar` = a mid green
(`edge #2f7d3a`, shades derived like the others), `BLOCK_COLORS.gry` = a mid grey (`edge #7d8288`), `LOOKS` entries for the six new looks reuse the `carthaginian` (Barbarian
looks) and `roman` (`marian`) definitions with their own `look` id; `BCH` draws with the HCH figure; `TYPE_WEIGHT.BCH =
0.62`; voice/gallery records get a `BCH` entry ("chariots").

- [ ] **Step 1:** Write `tests/rules/exp2-units.test.ts` → `describe('Barbarian light chariot (BCH)')` using
  `tests/rules/helpers.ts` (bottom attacker at (5,6), top defender at (4,6), `forceDice` to script faces):
  - attacking at full strength rolls 3 dice; after losing a block, 2 (`combatDice(events, 'close')`);
  - battling back at full strength rolls 3 (fullAtStart), and a full-strength BCH may ignore 1 flag
    (`ignorableFlags` = 1 with no leader/support);
  - an HI attacking a BCH with faces `['swords','swords','light','flag','flag']` scores 2 hits (1 sword ignored + light);
  - BCH attacking an HI scores swords (`['swords','heavy','light']` → 2 hits);
  - it may evade an HI attack (`canEvadeType('BCH','HI')`), moves 3 and battles (`pieceMoves` reaches distance 3 with
    `canBattle`), has no ranged targets, retreats 3 per flag, 4 per flag rolled by an elephant;
  - after eliminating a defender: momentum then bonus combat offered, no `cavalryExtra` decision;
  - ordered by Order Light Troops and Order Mounted; `UNIT_STATS.BCH.noRally`; `escapeDice` 3 at full, 2 after a loss;
  - an elephant attacking it rolls 2.
- [ ] **Step 2:** `npx vitest run tests/rules/exp2-units.test.ts` → FAIL (type unknown).
- [ ] **Step 3:** Implement the types, row and fallbacks above. `npm run typecheck` drives the exhaustive records.
- [ ] **Step 4:** `npx vitest run tests/rules/exp2-units.test.ts` → PASS; `npm test` → PASS (golden unchanged, art pins
  unchanged); `npm run typecheck` → clean.
- [ ] **Step 5:** Commit `feat(engine): Barbarian light chariots; Expansion #2 type scaffold`.

### Task 2: Rules reference §18–§19 (lead)

**Files:** `design/rules-reference.md`.

- [ ] Add **§18 Expansions #2 and #3: units, abilities, objectives and terrain** — BCH table (Task 1 values); pilum,
  march, legions (Marius/Julian), Tenth Legion; Caesar (`ccBonus` + `forcedMarch`) and Spartacus (`spartacusDice`);
  objectives (capture/hold/majority/sectionClear/exit, exactly as spec §1.3); ambush reserve configuration; separate
  commands; Rolling Fire; last-row retreat; ditch, very steep hills, sea as ford, removable tiles and rampart breakers.
  Every [Interp] carries its source row from `design/exp2-rulings.md`. Also record in §4 the site-FAQ alternative order
  for the camp −1 die (spec "Rulings that differ").
- [ ] Add **§19 Expansion #2 battles (201–223)**: one bullet per battle with its special rules (from
  `design/exp2-survey.md` + rulings decisions: 203 4 banners, 218 6, 222 Romans first, 201–205 red Roman blocks, no
  Marius there).
- [ ] Commit `docs: rules reference for Expansion #2`.

### Task 3: Objectives replace camp capture and the Castulo exit (rework, no behaviour change)

**Files:** Create `src/engine/objectives.ts`; modify `types.ts`, `setup.ts`, `flow.ts`, `movement.ts`, `index.ts`
(exports), `src/scenarios/index.ts` (010/011 EXTRA, 114 JSON loader), `src/scenarios/data/114.json`,
`tests/rules/helpers.ts` (Pos `objectives` replaces `campCapture`), `tests/rules/exp1-scenario-rules.test.ts` (setup
syntax only), `src/ai/moves.ts`, `src/ai/policies.ts`, `src/ai/evaluate.ts`, `src/ai/index.ts` (read the new helpers).
Test: `tests/rules/exp2-objectives.test.ts` (new) + the existing Baecula/Gabiene/Castulo tests + golden.

**Produces:**

```ts
// types.ts
export type ObjectiveDef =
  | { kind: 'capture'; side: Side; hexes: HexId[]; when: 'stop' | 'turnStart'; banners: number[]; together: number;
      remove: boolean; text: string }
  | { kind: 'hold'; side: Side; hexes: HexId[]; max: number; text: string }
  | { kind: 'majority'; sides: Side[]; hexes: HexId[]; banners: number; when: 'turnEnd' | 'always'; text: string }
  | { kind: 'sectionClear'; side: Side; text: string }
  | { kind: 'exit'; side: Side; hexes: HexId[]; units: 'any' | 'foot' | 'cavalry'; leadersScore: boolean; text: string };
export interface ObjectiveState {
  /** capture: hexes captured so far, in order. */
  taken: HexId[];
  /** hold / majority / sectionClear: banners this objective gives each side right now. */
  held: Record<Side, number>;
  /** sectionClear: sections currently scored. */
  sections: SectionName[];
}
// ScenarioSpecial: `campCapture` and `campsCaptured` are removed; added:
objectives: ObjectiveDef[];      // immutable during play (cloneState shares it)
objState: ObjectiveState[];      // cloneState deep-copies it
// GameEvent additions:
| { t: 'held'; side: Side; held: number; total: number; reason: string }   // a side's held banners changed
| { t: 'terrainChanged'; hex: HexId; terrain: TerrainType }
// setup.ts
export type ObjectiveSetup =
  | { kind: 'capture'; side: Side; hexes?: [number, number][]; when?: 'stop' | 'turnStart'; banners?: number[];
      together?: number; remove?: boolean; text?: string }
  | { kind: 'hold'; side: Side; hexes: [number, number][]; max?: number; text?: string }
  | { kind: 'majority'; sides: Side[]; hexes: [number, number][]; banners: number; when: 'turnEnd' | 'always'; text?: string }
  | { kind: 'sectionClear'; side: Side; text?: string }
  | { kind: 'exit'; side: Side; hexes: [number, number][]; units?: 'any' | 'foot' | 'cavalry'; leadersScore?: boolean; text?: string };
ScenarioSetup.objectives?: ObjectiveSetup[];   // replaces campCapture; rule id 'campCapture' removed from SPECIAL_RULE_IDS
// objectives.ts
export function resolveObjectives(setup: ScenarioSetup, terrain: TerrainType[], players: GameState['players']): ObjectiveDef[];
export function bannerTotal(s: GameState, side: Side): number;              // permanent + Σ held
export function capturableAt(s: GameState, side: Side, h: HexId): boolean;  // a 'stop' capture would score here now
export function exitHexes(s: GameState, u: Unit): HexId[];                   // hexes u may step off the board from
export function captureOnStop(s: GameState, ctx: FlowCtx, u: Unit): void;    // replaces flow.captureCamp
export function exitUnit(s: GameState, ctx: FlowCtx, u: Unit): void;         // replaces the Castulo branch of doMove
```

Defaults reproduce today's behaviour exactly: `capture` `when` defaults to `'stop'`, `hexes` to every camp hex,
`banners` to `[1]`, `together` 0, `remove` false, `text` to ``The ${army} army captures a ${enemy army} camp!``, banner
reason `'camp captured'`; `exit` `units` `'any'`, `text` ``${army} ${unit name} breaks through and exits the battlefield!``,
banner reason `'unit exited'`. 011 Baecula: `objectives: [{ kind: 'capture', side: 'bottom' }]` in EXTRA (rules no longer
list `campCapture`). 114 Gabiene JSON: its `campCapture` becomes the same shape inside `objectives` (loader accepts only
`objectives`). 010 Castulo: EXTRA `objectives: [{ kind: 'exit', side: 'bottom', hexes: <row-0 hexes in the bottom
side's centre or right section, computed with inSection exactly as movement.ts does today> }]`; rule `castulo` keeps only
the sudden-death leader. `gainBanner` checks victory with `bannerTotal`. The `banner` event's `total` is `bannerTotal`
(identical for these battles: nothing is held). Exit moves in `unitMoves` come from `exitHexes(s, u)` with the same
candidate rules as today (start hex or reached hex in the list, not into stopping terrain unless it is the start,
`dist + 1 <= max`, no attach). AI: `capturableCamp` → `capturableAt`; `rules.includes('castulo')` exit logic and
`special.campCapture` reads → the objectives.

- [ ] **Step 1:** In `tests/rules/helpers.ts` replace Pos `campCapture` with `objectives?: ScenarioSetup['objectives']`
  and update the Baecula/Gabiene tests' setup lines to `objectives: [{ kind: 'capture', side: …, hexes: … }]` (no other
  change). Write `tests/rules/exp2-objectives.test.ts` `describe('objectives core')`: a `capture`/`stop` objective
  scores once per hex with the default text; `bannerTotal` equals `players[side].banners` when nothing is held; a
  010-style `exit` objective offers an `OFF_BOARD` move only from listed hexes, removes the unit (and attached leader)
  and scores 1 with reason `'unit exited'`; an exit from an unlisted row-0 hex is not offered.
- [ ] **Step 2:** Run them → FAIL.
- [ ] **Step 3:** Implement. Remove `campCapture`, `campsCaptured`, `capturableCamp`, `captureCamp` and the Castulo
  branch; `grep -rn "campCapture\|campsCaptured\|capturableCamp" src tests` → only the new objective code and comments.
- [ ] **Step 4:** `npm test` → PASS with **unchanged** `tests/golden/fixtures.json` (010, 011 and the AI games replay
  identically); `npm run typecheck` clean.
- [ ] **Step 5:** Commit `refactor(engine): battle objectives replace camp capture and the Castulo exit`.

Not in this plan (Expansion #3 cycle): hand growth (313), `exit.leadersScore` (317), immobile units, dice orders,
forced placement, walls, hill-under, steep slopes. Their type fields may be declared but are not implemented here.

### Task 4: Ambush reserves configurable (rework + 206)

**Files:** `src/engine/setup.ts`, `types.ts`, `flow.ts`, `src/scenarios/index.ts` (005 keeps defaults),
`tests/rules/exp2-orders.test.ts` (new).

**Produces:**

```ts
ScenarioSetup.ambush?: { trigger?: CardKind[]; afterOwnTurns?: number; text?: string };
ScenarioSpecial.ambush: { trigger: CardKind[]; afterOwnTurns: number; text: string } | null;
// defaults (Trebbia, rule 'magoAmbush'): trigger = the four Leadership cards, afterOwnTurns 1,
// text "Ambush! Mago's hidden force strikes from the {section}." ({section} replaced)
export function ambushAvailable(s: GameState, side: Side, kind: CardKind | null): boolean; // reads special.ambush
```

`ambushSections(kind)` already returns all three sections for non-Inspired cards (so Order Light Troops lets the player
choose). 206 data: `rules: ['magoAmbush']`, `ambush: { trigger: ['inspiredL','inspiredC','inspiredR','leadershipAny','orderLight'], afterOwnTurns: 0, text: "Marius's hidden cohorts fall on the German rear from the {section}!" }`.

- [ ] **Step 1:** Tests (`describe('ambush reserve')`): with the 206 config the reserve may enter on the side's first
  turn with Order Light Troops (section chosen) and with Inspired Center (centre only); the Trebbia default still
  refuses the first turn and Order Light Troops; entering units retreat toward their own side (bottom reserve on row 0
  retreating takes row-1 hexes away from row 0 … i.e. toward row 8).
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** `npm test` PASS, golden unchanged (005 replays) →
  **Step 5:** commit `feat(engine): configurable ambush reserves (206 Aquae Sextiae)`.

---

## Phase 2 — Rules (TDD)

### Task 5: Pilum, march, Marius legions and the Tenth Legion

**Files:** `types.ts` (`Unit.legion?: 'marius' | 'julian'`; `EliteId` += `'tenthLegion'`), `elites.ts`
(`EliteAbility` += `'pilum' | 'march'`; preset `tenthLegion: { name: 'Tenth Legion', abilities: ['pilum','march'],
types: ['HI'] }`), `units.ts` (helpers), `setup.ts` (`ScenarioSetup.legions?: Partial<Record<Side,'marius'|'julian'>>`
stamps `legion` on every MI and HI of that side, board and reserve), `combat.ts` (`rangedDice` uses `rangedBaseDice`),
`flow.ts` (`battleTargets` uses `fireMoveLimit`), `movement.ts` (march). Test: `tests/rules/exp2-units.test.ts`.

**Produces:**

```ts
export function hasPilum(u: Unit): boolean;    // u.legion !== undefined || eliteHas(u, 'pilum')
export function canMarch(u: Unit): boolean;    // u.legion === 'julian' || eliteHas(u, 'march')
/** Ranged base dice before caps: pilum-only units (type range 0, no 'ranged' elite) always 1; others 2 still / 1 moved. */
export function rangedBaseDice(u: Unit, moved: number): number;
/** Hexes after which the unit may no longer fire: min(type noFireAfterMove, 2 for pilum units). */
export function fireMoveLimit(u: Unit): number;
// elites.rangeOf(u) = max(type range, elite range, hasPilum(u) ? 2 : 0)
// movement.unitMoveLimits: canMarch(u) → max = Math.max(max, 2) (battleMax unchanged), applied before the
// Line Command / marsh limits; with Double Time the result stays 2.
```

- [ ] **Step 1:** Tests (`describe('pilum and march')`):
  - a Marius MI (`legions: { bottom: 'marius' }`) fires at distance 2 with 1 die when still and 1 die after moving 1;
    cannot fire at distance 3, nor when an enemy is adjacent, nor after moving 2 (Double Time);
  - a top-side MI in the same battle (no legion for top) has no ranged target;
  - a Marius HI fires too (MI and HI, rulings Q2); an AX/LI keeps its own dice (2 still);
  - a pilum MI in a camp rolls 0 and so has no ranged target;
  - Darken the Sky orders a pilum MI and it fires twice; Order Light Troops does not order it;
  - an MI that fired cannot close combat in the same turn (battlesLeft 0) and vice versa;
  - Tenth Legion HI: fires like a pilum unit; may move 2 hexes but then has no battle (`canBattle` false at distance 2,
    true at 1); attacks with 5 dice after moving 1; retreats 1 per flag; with Double Time moves 2 and may battle, never 3;
  - `elite: 'tenthLegion'` on an MI is rejected at setup;
  - the Immortals (Expansion #1) still roll 2 still / 1 moved at range 3 (regression).
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** `npm test` PASS → **Step 5:** commit
  `feat(engine): pilum, march, Marius legions and the Tenth Legion`.

### Task 6: Caesar and Spartacus

**Files:** `types.ts` (`LeaderTrait` += `'forcedMarch' | 'spartacusDice'`), `query.ts` (`LEADER_TRAITS`),
`movement.ts`, `flow.ts` (`spartacusStep`). Test: `tests/rules/exp2-units.test.ts`.

- `forcedMarch`: in `unitMoveLimits`, when the unit (infantry only: `UNIT_STATS[t].infantry`) has an attached leader with
  `forcedMarch` at the start of its move: `max = Math.max(max, 2)` and `battleMax = Math.max(battleMax, 2)`, before the
  Line Command and marsh limits. `unitMoves` already knows `hasLeader` at the start hex: pass the leader so the limit is
  computed from the start position. Pilum units still cannot fire after 2 hexes (`fireMoveLimit`).
- `spartacusDice`: `spartacusStep` rolls `command + 2` dice when a leader of the playing side with that trait is on
  the board (`hex >= 0`); applies to a Counter Attack copying I Am Spartacus (the step runs for the effective kind).

- [ ] **Step 1:** Tests: Caesar (`traits: ['ccBonus','forcedMarch']`) attached to an MI: moves 2 and may battle, attacks
  with 4+1 = 5 dice, battles back with 5; on a hill-capped attack 2 → 3; attached to an HWM: no extra move; attached to
  an MC: no change (moves 3 anyway); a unit that moves onto Caesar's hex (attaches during the move) gets nothing that
  turn; Line Command still limits to 1; with Double Time an MI moves 2, never 3. Spartacus on the board: I Am Spartacus
  rolls command+2 dice (count the `roll` event faces); after Spartacus is eliminated it rolls `command`; the other side's
  I Am Spartacus rolls `command`.
- [ ] **Step 2–5:** FAIL → implement → `npm test` PASS → commit `feat(engine): Caesar's forced march and Spartacus' dice`.

### Task 7: Objectives for Expansion #2 (turn-start capture, hold, majority, section clear, exit filters) and removable tiles

**Files:** `objectives.ts`, `flow.ts` (hooks), `terrain.ts` (`setTerrain`), `movement.ts` (exit filter), `setup.ts`
(validation). Test: `tests/rules/exp2-objectives.test.ts`.

**Produces:**

```ts
// terrain.ts — copy-on-write so cloned states (AI search) never see another state's change
export function setTerrain(s: GameState, ctx: FlowCtx, h: HexId, t: TerrainType): void;
//   s.terrain = s.terrain.slice(); s.terrain[h] = t; if the hex had a rampart mask: s.rampart = s.rampart.slice(),
//   mask 0; emits { t: 'terrainChanged', hex: h, terrain: t }
// objectives.ts
export function turnStartObjectives(s: GameState, ctx: FlowCtx, side: Side): void; // before the playCard decision
export function turnEndObjectives(s: GameState, ctx: FlowCtx, side: Side): void;   // in endOfTurn, before the draw
export function updateHeld(s: GameState, ctx: FlowCtx): void;  // recompute hold / majority 'always' / sectionClear losses
export function heldBanners(s: GameState, side: Side): number;
```

Rules (spec §1.3; rulings Exp2 Q9): only units count; capture `turnStart` captures every untaken listed hex holding a
unit of `side` at the start of its turn; `banners[i]` for the (i+1)-th capture, last value repeating; `together: n`
captures only when ≥ n untaken listed hexes are occupied at once, scores `banners[0]` once and marks every listed hex
taken; `remove` turns a captured camp or rampart hex into plain via `setTerrain` (all listed hexes when `together`).
`hold`: 1 per occupied listed hex up to `max`. `majority` `turnEnd`: in `turnEndObjectives` of either side, the side in
`sides` with strictly more units on `hexes` holds `banners`, otherwise nobody. `sectionClear`: at `side`'s turn end each
section with no enemy unit (boundary hexes count for both sections, `sectionsOf`) is scored; `updateHeld` drops a
section as soon as an enemy unit stands in it. `exit` `units: 'foot'` = `UNIT_STATS.foot`, `'cavalry'` =
`UNIT_STATS.cavalry`. `updateHeld` runs after every `doMove`, after each close combat and ranged attack sequence
(after retreats/advances/bonus combat), after Rolling Fire, after ambush entry, and at turn start/end; it emits a `held`
event for each side whose held count changed (reason = the objective `text`), then checks victory when a total rose.
Victory: `bannerTotal >= bannersToWin` (a held banner lost later never undoes it).

- [ ] **Step 1:** Tests (`describe('Expansion #2 objectives')`), each with a minimal Pos:
  - 201-style `capture` `turnStart` `banners [0,0,1]` `remove`: a bottom unit standing on a listed camp at the start of
    the bottom turn → hex becomes plain (`terrainChanged`), no banner; third capture → 1 banner; a unit that moved onto a
    camp and off again in the same turn captured nothing;
  - 211-style `together: 2`: one occupied camp → nothing; two at turn start → 1 banner, all three hexes plain;
  - 221-style `banners [2]` → 2 banners at once (victory at target reached in that step);
  - 215-style two capture objectives (one per side) on a camp and a rampart hex: the rampart hex becomes plain with mask 0;
  - `hold` `max 1` (204): unit enters a listed camp → `held` +1 immediately (during movement), second camp → still 1;
    unit eliminated → held 0; victory reached through a held banner ends the game at once;
  - 222-style `hold max 2` on three rampart hexes;
  - `majority` `turnEnd` 2 banners (202): evaluated at each turn end, transfers, tie → none; lone leaders don't count;
  - `sectionClear` (219): at the bottom's turn end each section free of top units scores 1; a top unit moving into it on
    its turn removes it at once; a unit on a boundary hex blocks both sections;
  - `exit` `units: 'foot'` (212): a top MC on an exit hex gets no exit move; an AX does;
  - `cloneState` copies `objState` (mutating the clone leaves the original unchanged) and a `setTerrain` on a clone does
    not change the original's terrain;
  - a replay (`GameDriver.replay`) of a game with a removed camp reproduces the terrain.
- [ ] **Step 2–5:** FAIL → implement → `npm test` PASS (golden unchanged) → commit
  `feat(engine): Expansion #2 objectives and removable tiles`.

### Task 8: Separate commands (210)

**Files:** `types.ts` (`Unit.command?: string`, `Leader.command?: string`, `ScenarioSpecial.commands`, Decision
`{ kind: 'chooseCommand'; side: Side; options: string[] }` answered with `{ kind: 'choose', index }`), `setup.ts`
(`ScenarioSetup.commands?: { id: string; name: string; side: Side; blocks?: Blocks }[]`, unit/leader `command` validated
against it), `orders.ts`, `flow.ts`, `legal.ts`. Test: `tests/rules/exp2-orders.test.ts`.

Rules (rulings Exp2 Q7; spec §1.4): every unit ordered by one card belongs to one command when any unit of the playing
side has a command. `validateOrders` rejects mixed selections ("One card orders one army only."). A Leadership card on a
leader with a `command` orders only that command; leaders without one are unrestricted. Auto-order cards (Clash of
Shields, Darken the Sky) and dice cards (Rally, I Am Spartacus): when the eligible units span more than one command, the
engine first asks `chooseCommand` (options = command ids with an eligible unit, in data order), then orders/validates
within it. `eligiblePieces` is unchanged (UI narrows after the first pick). `randomAnswer` handles `chooseCommand`.

- [ ] Tests: section card ordering units of two commands → rejected; of one → accepted; Darken the Sky with archers in
  both commands asks `chooseCommand` and orders only the chosen command's shooters; with shooters in one command it
  asks nothing; I Am Spartacus assignment across commands is rejected; Line Command group within one command accepted,
  mixed rejected; a battle without commands is unaffected (existing tests). FAIL → implement → PASS → commit
  `feat(engine): separate commands, one per card (210 Picenum)`.

### Task 9: Rolling Fire (210)

**Files:** `types.ts` (Answer `{ kind: 'rollingFire'; unit: string; path: HexId[] }` in the battle decision; RollPurpose
`'rollingFire'`; `ScenarioSpecial.rollingFire: Side | null`), `setup.ts` (`ScenarioSetup.rollingFire?: Side`), `flow.ts`
(new `rollingFirePaths`, `rollingFire` generator; extract the hit/flag/retreat/leader-check part of `rangedAttack` into a
shared helper so both use it), `legal.ts`. Test: `tests/rules/exp2-orders.test.ts`.

**Produces:**

```ts
/** Legal Rolling Fire paths of an ordered unit right now (empty when it may not use it). */
export function rollingFirePaths(s: GameState, unitId: string): HexId[][];
```

Rules (rulings Exp2 Q6, [Interp] path length): eligible = ordered infantry unit of `special.rollingFire` side, on a hill,
`moved === 0`, `battlesLeft > 0`, `canBattle`, effective card not a Tactic card (`CARD_DEFS[kind].group !== 'tactic'`;
a Counter Attack copying a section card qualifies). Adjacent enemies do not prevent it. Path: from the unit's hex, each
step goes to one of the two neighbours one row nearer the enemy baseline (top side: SW/SE); it may not enter a hill,
void or impassable hex; it ends after the first hex that is not plain (that hex is included); otherwise it continues to
3 hexes; paths ending early only because no forward hex is legal are allowed; at least 1 hex. Resolution in path order:
each unit (friend or foe) is rolled 2 dice (`combat` + `roll` events, purpose `'rollingFire'`), only its class symbol
hits, flags make it retreat with **no** ignorable flags, no battle back; an attached leader takes the normal ranged
leader casualty check; a lone leader in the path evades at once toward his own side (existing leader-evade options).
Then the firing unit loses 1 block (leader check for its attached leader; enemy banner if eliminated). It uses the
unit's battle (`battlesLeft = 0`).

- [ ] Tests: offered only on a hill, not after moving, not with Darken the Sky (tactic) or I Am Spartacus, yes with a
  Counter Attack copying Order 3 Left; paths never enter hills and stop in a forest; 2 dice per unit in the path,
  faces `['medium','flag']` on a Roman MI → 1 hit + a retreat that cannot be ignored even with a leader and two supports;
  a friendly Slave unit in the path is also rolled; a lone Roman leader in the path evades; the firer loses 1 block
  afterwards and a 1-block firer is eliminated for a Roman banner; `randomAnswer` produces legal Rolling Fire answers.
  FAIL → implement → PASS → commit `feat(engine): Rolling Fire (210 Picenum)`.

### Task 10: Terrain and retreat rules: ditch, very steep hills, sea as ford, rampart breakers, last-row retreat

**Files:** `types.ts` (`TerrainType` += `'ditch'`; `SPECIAL_RULE_IDS` += `'veryHills'`; `ScenarioSpecial.rampartBreakers:
Side | null`, `lastRowRetreat: Side | null`), `terrain.ts` (`stopsAll` includes ditch; names), `setup.ts` (`{ t: 'sea',
ford: true }` → stored as `river` + ford; `TerrainSetup.art?: string` accepted and ignored by the engine;
`rampartBreakers?`, `lastRowRetreat?`), `movement.ts`, `combat.ts`, `flow.ts`, `retreat.ts`. Test:
`tests/rules/exp2-terrain.test.ts` (new).

Rules: **ditch** — every unit and lone leader stops on entering; nothing else (no caps, battle allowed, HWM may enter, no
LOS block). **veryHills** (223) — a unit moving from a non-hill hex onto a hill stops there and may not battle this turn
(`canBattle` false); a momentum advance onto a hill from a non-hill hex gives no bonus combat; close-combat caps replace
`capForHills`: striker not on a hill → target on a hill: 1; striker on a hill → target not on a hill: 2; hill to hill: 3;
bonuses add after (as today). **Sea as ford** — exactly fordable river. **rampartBreakers** — after every move, momentum
advance, retreat or evade of a unit of that side, each rampart hex on its path (destination included) becomes plain
(`setTerrain`). **lastRowRetreat** (214) — when a unit of that side takes a retreat (not an evade) whose chosen option
ends on its own baseline row with `losses > 0`, it is eliminated instead (enemy banner) — unless the retreat ended by
attaching to a leader.

- [ ] Tests: ditch stops MC/LI/leaders, MI may still attack out of it with full dice, HWM may enter; veryHills: MI moving
  plain→hill stops and cannot battle, hill→hill move may battle, caps 1/2/3 (HI attacking uphill rolls 1, +2 with Clash
  of Shields = 3), momentum up a hill gives no bonus combat; `{t:'sea', ford:true}` builds a fordable river hex
  (stop on entry, CC cap 2, ranged-from cap 1); rampartBreakers: a Roman unit moving through a rampart hex removes it
  (event + mask 0), a German unit does not; lastRowRetreat: a top unit on row 0 that must retreat 1 flag is eliminated
  and the bottom side scores; a top unit on row 1 that retreats 2 hexes (1 fulfilled, ends on row 0, 1 lost) is
  eliminated; evading from row 0 is unaffected; other battles unaffected. FAIL → implement → PASS → commit
  `feat(engine): ditch, very steep hills, coastal fords, rampart breakers, last-row retreat`.

---

## Phase 3 — Battle data

### Task 11: Transcription (two agents in parallel, scratchpad) and verification (two agents)

Starts right after Task 1 (needs only this plan's JSON format), in parallel with Phase 2. Agents own nothing in the repo.

**Agent T1 owns** `<scratchpad>/exp2-data/201.json`–`212.json`, **agent T2** `213.json`–`223.json`; each also writes
`<scratchpad>/exp2-data/notes-T1.md` / `notes-T2.md` (one section per battle: every judgement call and conflict with its
reason). Format (current ScenarioJson + Expansion #2 fields; omit absent optional fields):

```jsonc
{ "id": "215", "name": "River Sabis", "year": "57 BC", "expansion": "exp2",
  "top": { "army": "Belgic", "blocks": "bar", "look": "belgic", "commander": "Boduognatus", "cards": 5 },
  "bottom": { "army": "Roman", "blocks": "rom", "look": "marian", "commander": "Julius Caesar", "cards": 5 },
  "first": "top", "banners": 7,
  "rules": [],                                   // SpecialRuleId: 'magoAmbush' (206), 'veryHills' (223)
  "legions": { "bottom": "marius" },             // 206–223
  "objectives": [ { "kind": "capture", "side": "top", "hexes": [[8,6]], "when": "turnStart", "remove": true,
                    "text": "The Belgae overrun the Roman camp!" } ],
  "commands": [ { "id": "lentulus", "name": "Lentulus", "side": "bottom", "blocks": "gry" } ],     // 210 only
  "ambush": { "trigger": ["inspiredL","inspiredC","inspiredR","leadershipAny","orderLight"], "afterOwnTurns": 0,
              "text": "…{section}…" },        // 206 only
  "rollingFire": "top", "lastRowRetreat": "top", "rampartBreakers": "bottom",               // 210 / 214 / 223
  "terrain": [ { "r": 4, "c": 6, "t": "river", "ford": true }, { "r": 7, "c": 5, "t": "rampart", "faces": "top" },
               { "r": 6, "c": 3, "t": "rampart", "edges": ["W","NW"] }, { "r": 8, "c": 1, "t": "sea", "ford": true },
               { "r": 2, "c": 2, "t": "ditch" }, { "r": 0, "c": 0, "t": "camp" } ],
  "units": [ { "side": "bottom", "type": "HI", "r": 6, "c": 6, "elite": "tenthLegion", "command": "gellius" } ],
  "leaders": [ { "side": "bottom", "name": "Julius Caesar", "r": 6, "c": 6, "traits": ["ccBonus","forcedMarch"] } ],
  "reserves": [ { "side": "bottom", "type": "MI" } ], "reserveLeaders": [ { "side": "bottom", "name": "Marcellus" } ] }
```

Conventions: Barbarian armies on top with `blocks: "bar"`, Romans bottom `"rom"`; looks: Gauls `gallic`, Germanic
tribes `germanic`, Slaves `slave`, Belgae `belgic`, Britons `briton`, Romans 201–205 `roman`, 206–223 `marian`;
Caesar's traits `["ccBonus","forcedMarch"]`; Spartacus `["spartacusDice"]`; Tenth Legion HI `"elite": "tenthLegion"`;
army names: "Gallic", "Germanic", "Slave", "Belgic", "Briton", "Roman". Objectives, ambush, commands etc. per
`design/exp2-rulings.md` Decisions table and the survey (e.g. 201 capture bottom turnStart `[0,0,1]` remove; 202 majority
both sides all hill hexes 2 turnEnd; 204 hold top 2 camps max 1; 208 capture top turnStart remove; 210 commands
(Lentulus left of the hills, Gellius right; `blocks: "gry"` for Lentulus) + `rollingFire: "top"` + exit top row-8 hexes;
211 capture top turnStart together 2 remove; 212 exit top row-8 foot; 213 hold bottom camp; 214 hold top 2 camps max 1 +
`lastRowRetreat: "top"`; 215 two captures (each side, remove; the Roman camp is the unfinished rampart hex); 219
sectionClear bottom; 221 capture top `[2]` remove + exit bottom row-0; 222 hold bottom rampart hexes max 2, first
bottom; 223 `veryHills` + `rampartBreakers: "bottom"`). Ramparts list the hexsides that face the enemy as drawn (`faces`
or `edges`; 221 sideways faces). 217 seacoast hexes are `{ "t": "sea", "ford": true }`. Off-board reserves → `reserves`.
Unit counts must equal the page's unit table (`design/exp2-survey.md`); every mismatch goes in the notes.

Method (as Expansion #1): download each map (`https://www.commandsandcolors.net/ancients/images/stories/CCA_maps/<id>.jpg`)
into the scratchpad; calibrate the hex grid on base maps whose JSON is known (002 and 007 vs `src/scenarios/data`);
read hex rows top to bottom; record terrain, fords, rampart edges, camps, units (type, side, r, c), leaders, elites,
objective hexes. Check each file with a small script in the scratchpad (own code, no engine import needed): per-side
unit counts by type equal the survey's table, every piece on the board (even rows c 0–12, odd rows c 0–11), one unit
and one leader per hex at most, objective hexes on the board. The lead runs the real loader on them in Task 12.

**Verifier agents V1 (201–212) and V2 (213–223)** own `<scratchpad>/exp2-data/verify-V1.md` / `verify-V2.md`: redraw the
grid over fresh downloads (overlay the JSON on the image), compare every hex, edge, unit, leader, objective and the
header (sides, blocks, cards, first player, banners, year); list discrepancies; transcribers fix; repeat until both files
say "match" for every battle. Acceptance: both verify files list all battles as match.

### Task 12: Loader, import, briefing texts and setup tests (lead)

**Files:** `src/scenarios/index.ts` (`Expansion` += `'exp2'`; ScenarioJson + copy of `legions`, `objectives`,
`commands`, `ambush`, `rollingFire`, `lastRowRetreat`, `rampartBreakers`, unit `command`, terrain `art`), new
`src/scenarios/exp2-texts.ts` (`EXTRA_EXP2`: blurb, specialText, hint per battle — original wording), data files
`src/scenarios/data/201.json`–`223.json` (copied from the verified scratchpad files without notes),
`design/exp2-scenario-notes.md` (merged notes + verification summary), `tests/scenarios/manifest.ts` (+ 23 entries,
generated from the files then checked against the survey tables), `tests/scenarios/exp2.test.ts` (new, same checks as
`exp1.test.ts` plus: objective hexes on the board and of the right terrain for captures; commands referenced exist;
every legion side has MI/HI; Caesar/Spartacus traits present where the battle names them).

- [ ] Write `exp2.test.ts` against the manifest → FAIL; implement loader → copy data → PASS; `npm test` PASS; commit
  `feat(scenarios): the 23 Expansion #2 battles`.

---

## Phase 4 — Art (art track, worktree `.claude/worktrees/exp2-art`, branch `exp2-art` from Task 1's commit)

### Task 13: Kit table (rework, no visual change)

**Agent A owns** `src/art/**`, `src/dev/**`, `tests/art/**`.

Replace the kit and look literals in `foot.tsx`, `mounted.tsx`, `chariot.tsx`, `elephant.tsx`, `leader.tsx`,
`machine.tsx`, `parts.tsx` (`kit === …`, `p.look === …`, `baseCavalry`) with a `KITS: Record<Kit, KitDef>` table in a new
`src/art/kits.ts` (fields as needed: foot builder, cavalry builder, horse-archer dress, chariot style and crew dress,
elephant style and crew, leader helmet/crest/beard/horse, crew helmet, war-machine crew dress, wicker shields …) and
per-look overrides in `LookStyle` (e.g. the Seleucid elephant and HCH variants). Acceptance: `npx vitest run tests/art
tests/terrain` green with **unchanged** hashes; `grep -nE "kit (===|!==) '|look (===|!==) '" src/art` → no matches;
gallery screenshots before/after identical. Commit `refactor(art): kit table instead of kit literals`.

### Task 14: Barbarian and Marian looks, foot figures, leaders, blocks

**Agent A (continuing).** Produces: `BLOCK_COLORS.bar` (Barbarian green) and `BLOCK_COLORS.gry` (grey Roman), checked for contrast against
`rom` red, `car` purple, `grk` blue, `eas` tan, each other and the board green; a unit whose `command` names `blocks`
(210 Lentulus) draws its base edge in that colour (Token prop `edgeBlocks?: Blocks`); kits `celtic` (Gauls, Belgae, Britons: long oval/hexagonal shields
with painted devices, mail on nobles and bare-chested warriors, trousers, torcs, Montefortino/Coolus-type and horned
helmets on a few, carnyx standard; Britons with woad and fewer helmets), `germanic` (Suebian knot, framea spear, clubs,
hide cloaks, rectangular/hexagonal shields, mostly unarmoured), `lateRoman` (Marian legionaries: mail, Montefortino/
Coolus helmets with horsehair, curved oval scutum with thunderbolt/wing device, pilum; aquila standard); looks `gallic`,
`germanic`, `slave` (mixed figure variants per index: Thracian with sica and Thracian helmet, Gallic, Germanic, Italian
shepherd/gladiator), `belgic`, `briton`, `marian`; figures for every unit type these armies field (Barbarian LI, LB, LS,
AX, WA, MI, LC, MC; Roman LI, LB, LS, AX, MI, HI, WA (222 Germanic auxiliaries in Roman service), LC, MC); leaders:
Caesar (laurel wreath, red paludamentum, white horse) and Spartacus (Thracian helmet, sica) as named-leader looks;
Tenth Legion elite look (distinct shield device, eagle standard, gold marker). Gallery shows every new look × unit type.
Acceptance: base/Expansion #1 art hashes unchanged; figures readable at 85 px hex width; lead reviews screenshots.
Commits per look group.

### Task 15: Light chariots, cavalry and machines

**Agent B owns** `src/art/chariot.tsx`, `src/art/mounted.tsx`, `src/art/machine.tsx` (after Task 13 lands). Produces:
BCH light chariot (two small ponies, wicker car, driver + javelin warrior; celtic and briton variants with woad);
Barbarian LC/MC (celtic, germanic: bareback/simple saddles, spears, round/oval shields); Marian LC/MC (Roman/allied
cavalry); red Roman HWM (scorpion/ballista with lateRoman crew). Acceptance as Task 14.

### Task 16: Terrain art and objective markers

**Agent C owns** `src/ui/terrain/**`, `src/dev/TerrainGallery.tsx`, `tests/terrain/**` (new tests only).
Produces: `ditch` (dug trench with spoil bank, readable as "stops movement"); coastal ford (sea art with a beach and
ford stones; `BoardArtProps.art?: (string | undefined)[]` per hex, from the scenario setup terrain `art`); removable
tiles render from the current `terrain`/`rampart` (BoardArt already keys on its props; check memoisation); very steep
hills (`veryHills` battles: rockier, darker hill art via a `steepHills?: boolean` prop); an `ObjectiveMarkers` SVG layer
(`src/ui/terrain/objectives.tsx`) drawing capture targets (pennant), hold hexes (banner outline), exit edges (arrows on
the listed hexes' outer edge), majority areas (dashed outline) and section-clear (subtle section tint), each with the
owning side's block colour. Acceptance: gallery shows all; base boards' pins unchanged.

---

## Phase 5 — UI (lead)

### Task 17: Screens

**Files:** `src/ui/screens/picker.ts` (tab `{ id: 'exp2', label: 'Rome & the Barbarians' }`), `Menus.tsx`,
`src/ui/kit/BannerTrack.tsx` (held slots drawn hatched with a tooltip "held while occupied"), `src/ui/game/GameScreen.tsx`,
`Board.tsx`, `uiModel.ts`, `controller.ts` (events `held`, `terrainChanged`; state terrain to BoardArt), `RulesReference.tsx`
(Expansion #2 section), `src/ui/App.tsx` (dev route accepts 201–223). Test: `tests/ui/exp2-screens.test.ts` (new: picker
tab lists 23 battles in order; tooltips/rule lines for BCH, pilum, march, Tenth Legion, Caesar, Spartacus, ditch,
objectives; held banner count in the model).

- [ ] Rolling Fire: in the battle phase an eligible unit shows a "Rolling Fire" action; the player then clicks path hexes
  (legal next hexes highlighted; finishing early allowed only where the path must end); the answer is sent when the
  path is complete.
- [ ] `chooseCommand` prompt (buttons with command names); command badge on tokens (letter + command colour) and in
  tooltips; ordering feedback "One card orders one army only".
- [ ] Objective markers layer on the board, tooltips on objective hexes ("Roman camp: a Belgic unit here at the start of
  its turn captures it — 1 banner"), held banners on the track, log lines for `held`/`terrainChanged`.
- [ ] Verify in the browser (worktree dev server on a free port ≥ 5175, e.g. `npx vite --port 5175`): picker tab, one
  battle per mechanic (202, 206, 210, 214, 215, 217, 219, 222, 223), screenshots. Commit `feat(ui): Expansion #2 screens`.

### Task 18: Merge the art track

- [ ] In `.claude/worktrees/exp2`: `git merge exp2-art`; resolve; `npm test`, typecheck; screenshots of every new look
  in a battle. Commit (merge commit).

---

## Phase 6 — AI

### Task 19: AI support (agent D owns `src/ai/**`, `tests/ai/**`, `scripts/ai-*.ts`; lead reviews)

- Estimators/evaluation read the engine helpers: BCH (full-strength bonus, sword ignore), `hasPilum`/`rangedBaseDice`/
  `fireMoveLimit`, `canMarch`, Caesar's `forcedMarch` and `ccBonus`, Spartacus' dice (cardsense: I Am Spartacus is worth
  more with him alive), ditch, veryHills caps, rampart breakers, last-row retreat (retreat risk for the top side on 214).
- Objectives: evaluation adds `bannerTotal` (held banners valued slightly below permanent ones) and potential —
  turn-start captures (own unit standing on an untaken capture hex at the end of own turn, enemy units threatening
  own camps), hold hexes, majority margin on 202's hills, section-clear threats on 219, exits (eligible units' distance
  to exit hexes; exit moves are generated as `OFF_BOARD` moves like Castulo's).
- Policies: pilum fire vs close combat (fire when the close-combat value is lower or the target is out of reach);
  Rolling Fire (expected hits on enemies minus friendly hits minus the 1-block cost); `chooseCommand` (score each
  command's best order); ambush entry for 206 (reuse Trebbia's logic with the configured triggers).
- Check AI caches keyed by scenario that assume static terrain (`hillGroups`, distance maps): invalidate on
  `terrainChanged` or key them by the terrain array identity.
- Personalities `BY_NAME`: Caesar → strategist; Spartacus → lion; Crixus, Oenomaus → bull; Vercingetorix (later),
  Boiorix, Teutobod, Arminius → bull/fox; Marius, Crassus, Germanicus → strategist/shield; others by the existing table.
- Voice: troop names per new look ("the Gallic warband", "British chariots", "the Tenth Legion", "Spartacus' gladiators").
- Tests (`tests/ai/exp2.test.ts`): legality over every Expansion #2 battle's first decisions from both sides; regress
  cases — a pilum MI with an adjacent-free target fires rather than idles; Rolling Fire not chosen when it would hit
  only own units; the 204 AI keeps a unit on a held camp; 212 Slave foot use exits when adjacent to the edge; the 210 AI
  never sends a mixed-command order.
- Acceptance: `npm test` green; `npx vite-node scripts/ai-match.ts -- --a tribune --b recruit --games 2 --scenarios
  202,210,215,219` tribune ≥ recruit; no stalls; average Tribune decision < 1.5 s.

---

## Phase 7 — Verification and release

### Task 20: Soak, balance log, browser pass

- [ ] `npm test` — the soak iterates `SCENARIOS`, so it now covers 62 battles; keep total test time < 120 s (reduce games
  per new battle if needed).
- [ ] `npx vite-node scripts/ai-balance.ts -- --scenarios 201,…,223 --games 2` (sharded in parallel); write
  `design/exp2-ai-balance.md` (win rates per battle and side, behaviour counters); re-check the setup of any battle
  outside 20–80 % against the map and notes.
- [ ] Browser: play the first turns of 202, 206, 210, 214, 215, 217, 219, 222, 223; screenshots.

### Task 21: Release

- [ ] `git merge main` (regenerate only `ai-*` golden entries if `main` changed AI behaviour, saying so in the commit).
- [ ] `npm test`, `npm run typecheck`, `npm run build`; `npx vite preview --port 4174 --base /cnc-claude/` check of the
  built site incl. a 2xx battle (the `pages-preview` launch config belongs to the main checkout).
- [ ] README (62 battles, Expansion #2 section) and CLAUDE.md (battle ids 201–223, new docs) updated.
- [ ] Merge into `main`: if the main checkout has no uncommitted changes, fast-forward/merge there via
  `git push . exp2-rome-barbarians:main` from the worktree; otherwise push the branch to `origin/main` directly
  (`git push origin exp2-rome-barbarians:main`) after `git fetch` shows `origin/main` is an ancestor, and tell the user the
  main checkout's local `main` is behind. Commit the regenerated `docs/` with the release. `git push` (HTTPS keychain).
