# Expansion #1 — Greece & Eastern Kingdoms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Scale note (same convention as `2026-10-09-cnc-ancients.md`): engine tasks are done by the lead with TDD and concrete
> tests; delegated tasks (data, art, AI tuning) are specified by exact file ownership, interfaces and acceptance criteria.

**Goal:** Add the 24 Expansion #1 battles (101–124) with their units, terrain, elites, leader traits, scenario rules,
per-army art and AI support, without changing base-game play.

**Architecture:** Unit/elite/leader abilities become data (`UNIT_STATS` fields, `ELITES`, leader `traits`) read by the
engine, AI and UI through shared helpers; `Faction` splits into `blocks` (side colour) and `look` (figure kit + palette).
New rules are added on top of that rework with TDD from `design/rules-reference.md` §15–§17. Scenario data is
transcribed from the official maps and verified side by side.

**Tech Stack:** TypeScript 5 (strict), React 18, Vite 5, Vitest. No new dependencies.

**Spec:** `design/superpowers/specs/2026-10-09-exp1-greece-eastern-kingdoms-design.md`.

## Global Constraints

- Work only in the worktree `.claude/worktrees/exp1` on branch `exp1-greece-eastern-kingdoms`. Other sessions edit `main`
  in the main checkout: never touch it. Merge `main` into the branch regularly (`git merge main`).
- `docs/` is generated build output: do not edit or commit it until the final release task.
- No GMT artwork or verbatim GMT text in the app; scenario texts are original summaries, special rules paraphrased.
  Official map images are used only by the dev-only comparison route, loaded from commandsandcolors.net at dev time.
- Engine (`src/engine/**`) stays pure TS (no DOM/React) and deterministic given `state.rng`.
- The AI never reads the opponent's hand, the deck order or the live RNG.
- Base-game behaviour must not change: golden-game test (Task 1) stays green through Phase 1; base scenario setups
  are untouched; `ENGINE_VERSION` in `src/ui/game/controller.ts` is bumped only if base-game replays change (they must not).
- Commits: author `Janis Strods <jstrods@gmail.com>`; message ends with the `Co-Authored-By` line from the session.
- Rules guesses are marked **[Interp]** in `design/rules-reference.md`, with the ruling source when one exists.
- Test commands: `npx vitest run <path>` for one file, `npm test` for all, `npm run typecheck`.

---

## File map

```
src/engine/types.ts        + UnitType LBC/HWM/CAM, TerrainType sea/rampart, Blocks, ArmyLook, EliteId, LeaderTrait,
                             Unit.elite, Leader.traits, PlayerState.blocks/look, GameState.noCap/facing,
                             SpecialRuleId additions, ScenarioSpecial additions, Decision placeLeader, events
src/engine/units.ts        ability fields + helpers (single source of unit rules for engine, AI, UI)
src/engine/elites.ts       NEW: ELITES table + helpers (rangeOf, helmetsAlwaysHit, eliteFlagIgnores, eliteSwordIgnores)
src/engine/combat.ts       dice/scoring/flags via helpers; rampart; Alexander; Tactical Flexibility; Fright
src/engine/terrain.ts      sea, rampart, no-cap fords
src/engine/movement.ts     limits via fields; HWM terrain; LBC
src/engine/orders.ts       troop membership via fields; attachedOnly leadership
src/engine/retreat.ts      evade rules via fields
src/engine/flow.ts         HWM evade removal, leader loss card, all-leaders sudden death, leader placement, camps
src/engine/setup.ts        new scenario fields, validation
src/engine/legal.ts        randomAnswer for placeLeader
src/scenarios/index.ts     blocks/look/expansion/options/elite/traits/campCapture; EXTRA texts for 101–124
src/scenarios/data/1xx.json NEW (24 files)
src/art/**                 looks, kits, new figures, elite looks, block colours
src/ui/terrain/**          sea coast, rampart art
src/ui/screens/Menus.tsx   picker tabs, optional rules
src/ui/game/**             placement prompt, card-loss toast, tooltips via fields, faction→blocks/look
src/ui/screens/RulesReference.tsx  new sections
src/dev/ScenarioCompare.tsx NEW dev route #/gallery/scenario/<id>
src/ai/**                  helpers instead of literals; values; policies; placement; personalities; voice
tests/golden/              NEW golden-game fixtures + test
tests/rules/exp1-*.test.ts NEW rules tests
tests/scenarios/exp1.test.ts NEW setup manifest tests
design/rules-reference.md  §15–§17
design/exp1-scenario-notes.md NEW transcription decisions
```

---

## Phase 0 — Baseline

### Task 1: Golden-game test (before any rework)

**Files:** Create `tests/golden/golden.test.ts`, `tests/golden/record.ts`, `tests/golden/fixtures.json`.

**Interfaces:** Produces `goldenGames(): { id: string; hash: string; answers: number; winner: string }[]` in `record.ts`.

- [ ] **Step 1:** Write `tests/golden/record.ts`: plays a fixed list of games and hashes their event streams.

```ts
import { GameDriver, createGame, randomAnswer, type GameEvent } from '../../src/engine';
import { SCENARIOS } from '../../src/scenarios';
import { PERSONALITIES, chooseAnswer, newMemory, type AiOptions } from '../../src/ai';

export interface Golden { id: string; hash: string; answers: number; winner: string }

function fnv(str: string, h = 0x811c9dc5): number {
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hashEvents(h: number, evs: GameEvent[]): number { for (const e of evs) h = fnv(JSON.stringify(e), h); return h; }

/** Random-legal games: engine only. */
function randomGame(scId: string, seed: number): Golden {
  const sc = SCENARIOS.find((x) => x.id === scId)!;
  const d = new GameDriver(createGame(sc.setup, seed));
  const rnd = mulberry(seed);
  let h = hashEvents(0x811c9dc5, d.drainEvents().map((q) => q.e));
  let steps = 0;
  while (!d.over && steps++ < 20000) { d.answer(randomAnswer(d.state, d.pending!, rnd)); h = hashEvents(h, d.drainEvents().map((q) => q.e)); }
  return { id: `rnd-${scId}-${seed}`, hash: h.toString(16), answers: d.answers.length, winner: String(d.state.winner) };
}

/** Deterministic AI-vs-AI games (recruit settings, small budget) — guards the AI-estimator rework. */
function aiGame(scId: string, seed: number): Golden {
  const sc = SCENARIOS.find((x) => x.id === scId)!;
  const d = new GameDriver(createGame(sc.setup, seed));
  const mem = { top: newMemory(), bottom: newMemory() };
  const opt = (side: 'top' | 'bottom'): AiOptions => ({ side, difficulty: 'recruit', personality: PERSONALITIES[5], seed: seed + (side === 'top' ? 1 : 2), deterministic: true, budgetScale: 0.2 });
  let h = hashEvents(0x811c9dc5, d.drainEvents().map((q) => q.e));
  let steps = 0;
  while (!d.over && steps++ < 4000) {
    const side = d.pending!.side;
    const { answer } = chooseAnswer(d.state, d.pending!, opt(side), mem[side]);
    if (!d.answer(answer)) throw new Error(`AI answer rejected: ${d.lastError}`);
    h = hashEvents(h, d.drainEvents().map((q) => q.e));
  }
  return { id: `ai-${scId}-${seed}`, hash: h.toString(16), answers: d.answers.length, winner: String(d.state.winner) };
}

export const RANDOM_GAMES: [string, number][] = [['001', 11], ['002', 12], ['003', 13], ['005', 15], ['006', 16], ['007', 17], ['009', 19], ['010', 20], ['011', 21], ['015', 25]];
export const AI_GAMES: [string, number][] = [['002', 31], ['007', 32], ['010', 33]];

export function goldenGames(): Golden[] {
  return [...RANDOM_GAMES.map(([s, n]) => randomGame(s, n)), ...AI_GAMES.map(([s, n]) => aiGame(s, n))];
}
```

- [ ] **Step 2:** Write `tests/golden/golden.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import fixtures from './fixtures.json';
import { goldenGames } from './record';

describe('golden games (base-game behaviour is unchanged)', () => {
  it('replays every recorded game with identical events', () => {
    const now = goldenGames();
    for (const g of now) {
      const f = (fixtures as typeof now).find((x) => x.id === g.id);
      expect(f, g.id).toBeDefined();
      expect(g, g.id).toEqual(f);
    }
  }, 300_000);
});
```

- [ ] **Step 3:** Generate fixtures once from the unchanged code:
  `npx vite-node -e "import('./tests/golden/record.ts').then(m=>console.log(JSON.stringify(m.goldenGames(),null,1)))" > tests/golden/fixtures.json`
  (if `vite-node -e` is unavailable, add `scripts/golden-record.ts` that prints the JSON and run
  `npx vite-node scripts/golden-record.ts > tests/golden/fixtures.json`).
- [ ] **Step 3b (saves):** also write `tests/golden/save-fixture.json` = `{ scenarioId: '007', seed: 17, answers }`
  holding the first 60 answers of `rnd-007-17`, and add a test that rebuilds it with
  `GameDriver.replay(createGame(scenarioById('007').setup, 17), answers)` without throwing (a saved game is exactly
  config + answers, so this is the save-compatibility check).
- [ ] **Step 4:** `npx vitest run tests/golden` → PASS. Run it twice to confirm it is stable.
- [ ] **Step 5:** Commit `test: golden-game fixtures guarding base-game behaviour`.

Note: after merging `main` changes that alter the AI (other sessions), regenerate only the `ai-*` entries and say so in
the merge commit. During Phase 1 the fixtures must not be regenerated.

---

## Phase 1 — Rework (no behaviour change; lead)

Gate for every Phase 1 task: `npm test` (incl. golden) and `npm run typecheck` green before commit.

### Task 2: Unit ability fields and helpers (engine)

**Files:** Modify `src/engine/units.ts`, `combat.ts`, `flow.ts`, `movement.ts`, `orders.ts`, `retreat.ts`.
Test: `tests/engine/units-fields.test.ts` (new).

**Produces** (in `units.ts`, exported via `src/engine/index.ts`):

```ts
export interface UnitStats {
  // existing fields unchanged ...
  /** Rolls close combat by the elephant table (dice = what the target would roll). */
  elephantTable: boolean;
  /** Dice an elephant rolls against this unit type. */
  elephantDiceAgainst: number;
  /** Ignores every sword hit in close combat (and swords against it are not re-rolled by elephants). */
  ignoreAllSwords: boolean;
  /** Sword hits ignored in close combat (HCH 1). */
  swordIgnore: number;
  /** Strikers of these types make this unit retreat +1 hex per flag. */
  frightenedBy: UnitType[];
  /** When a cavalry or chariot unit rolls against it in close combat: ignores 1 hit of this class (null = none) and 1 flag. */
  vsMountedIgnoreHit: UnitClass | 'any' | null;
  vsMountedIgnoreFlag: boolean;
  /** After an initial successful close combat: momentum advance plus 1 more hex. */
  momentumExtraHex: boolean;
  /** +1 die and may ignore 1 flag at full strength (warriors). */
  fullStrengthBonus: boolean;
  /** Moves 1, or 2 if it then close combats (warriors). */
  chargeMove: boolean;
  /** Cannot fire after moving this many hexes (AX 2; 99 = no limit). */
  noFireAfterMove: number;
  /** Light foot: may pass through friends with Order Light Troops / Move-Fire-Move. */
  lightFoot: boolean;
  /** May battle after entering a forest. */
  forestFighter: boolean;
  /** Cannot be rallied. */
  noRally: boolean;
  /** Gains nothing from leaders (no helmet hits, no bolster, no support received). */
  noLeaderBenefit: boolean;
  /** Double Time: max hexes (null = no change). */
  doubleTimeMove: number | null;
  /** Mounted Charge: may move 3 and battle. */
  mountedChargeMove: boolean;
}

export function eliteOf(u: Unit): EliteDef | null;            // from elites.ts
export function ccBase(u: Unit, role: StrikeRole): number;     // cc / ccBack, not elephants
export function escapeDice(u: Unit): number;                    // moved from flow.ts
export function canBattleBackDice(u: Unit): number;             // = ccBack (+WA full)
export function isLightFoot(u: Unit): boolean;
export function frightens(striker: Unit, target: Unit): boolean; // target.frightenedBy includes striker.type
```

Base values (must reproduce current behaviour exactly):
`elephantTable` EL only; `elephantDiceAgainst` LI/LB/LS/LC 2, AX 3, MI 4, HI 5, MC 3, HC 4, EL/WA/HCH 3;
`ignoreAllSwords` EL; `swordIgnore` HCH 1; `frightenedBy` LC/MC/HC/HCH `['EL']`; `vsMountedIgnoreHit` EL `'heavy'`,
`vsMountedIgnoreFlag` EL; `momentumExtraHex` LC/MC/HC; `fullStrengthBonus`, `chargeMove` WA; `noFireAfterMove` AX 2,
others 99; `lightFoot` LI/LB/LS/AX; `forestFighter` LI/LB/LS/AX/WA; `noRally` EL/HCH; `noLeaderBenefit` EL;
`doubleTimeMove` WA 3, MI/HI/AX 2; `mountedChargeMove` HC/EL/HCH.

- [ ] **Step 1:** Write `tests/engine/units-fields.test.ts` asserting the table values above (one `expect` per field per
  type) and that `elephantDiceVs(t) === UNIT_STATS[t].elephantDiceAgainst` for all base types.
- [ ] **Step 2:** Run it: FAIL (fields missing).
- [ ] **Step 3:** Add the fields and helpers. Replace every literal type check in the engine:
  - `combat.ts`: `closeCombatDice` (elephant table, WA bonus), `swordIgnores` (EL/HCH), `redIgnores` → `vsMountedIgnores`,
    `helmetsCount` (noLeaderBenefit), `ignorableFlags` (EL branch, WA), `retreatPerFlag` (frightens), `closeHitChance`.
  - `flow.ts`: `escapeDice` (move to units.ts), `retreatUnit` (`u.type === 'EL'` → `UNIT_STATS[u.type].elephantTable`
    for rampage), `rollClose` (elephant re-rolls), `momentum` (`st.cavalry` → `momentumExtraHex`; bonus eligibility WA →
    `chargeMove`), `battleTargets` (AX → `noFireAfterMove`).
  - `movement.ts`: `unitMoveLimits` (WA, doubleTime, mountedCharge), `lightFoot`, AX ranged-after-2 check.
  - `orders.ts`: rally exclusion (`noRally`).
  - `units.ts`: `forestFighter(t)` reads the field; `elephantDiceVs` reads `elephantDiceAgainst`.
  Verify with `grep -nE "type === '(LI|LB|LS|AX|WA|MI|HI|LC|MC|HC|EL|HCH)'" src/engine` → no matches outside `units.ts`.
- [ ] **Step 4:** `npm test` (golden included) and `npm run typecheck` → PASS.
- [ ] **Step 5:** Commit `refactor(engine): unit abilities as table fields`.

### Task 3: Elite units replace `sacredBand`

**Files:** Create `src/engine/elites.ts`; modify `types.ts`, `setup.ts`, `combat.ts`, `src/scenarios/index.ts` (002 patch),
`tests/rules/helpers.ts` (Pos `sacredBand` → `elite`), `src/ai/values.ts`, `src/ai/estimate.ts`, `src/ai/evaluate.ts`,
`src/ui/game/Board.tsx`, `src/art/token.tsx` (prop `elite?: EliteId` instead of `sacredBand?: boolean`).

**Produces:**

```ts
// types.ts
export type EliteId = 'carthSacredBand' | 'thebanSacredBand' | 'silverShields' | 'companions' | 'immortals' | 'bowAuxilia';
export interface Unit { /* ... */ elite?: EliteId } // `sacredBand` removed
// elites.ts
export type EliteAbility = 'helmetHits' | 'ignoreFlag' | 'ignoreSword' | 'ranged';
export interface EliteDef { id: EliteId; name: string; abilities: EliteAbility[]; range?: number; types: UnitType[] }
export const ELITES: Record<EliteId, EliteDef>;
export function eliteHas(u: Unit, a: EliteAbility): boolean;
export function rangeOf(u: Unit): number;        // max(UNIT_STATS.range, elite range)
export function canShoot(u: Unit): boolean;      // rangeOf(u) > 0
```

Only `carthSacredBand` is used in Phase 1 (`helmetHits`, `ignoreFlag`, types `['HI']`); the other presets are added in
Task 9. `hasRanged(t)` callers that hold a unit switch to `canShoot(u)`; the AI weight uses
`unitWeight(u) = TYPE_WEIGHT[u.type] * (u.elite ? ELITE_WEIGHT[u.elite] : 1)` with `carthSacredBand: 1.25`.

- [ ] **Step 1:** Update `tests/rules/helpers.ts` Pos to `elite?: EliteId` and the Sacred Band tests to
  `elite: 'carthSacredBand'`; add a unit test in `tests/engine/units-fields.test.ts`:
  `eliteHas({...hi, elite:'carthSacredBand'}, 'helmetHits') === true`, `rangeOf` of a plain LI = 2.
- [ ] **Step 2:** Run: FAIL (types).
- [ ] **Step 3:** Implement; replace every `sacredBand` read (`grep -rn sacredBand src tests` → only `carthSacredBand`).
- [ ] **Step 4:** `npm test` + typecheck → PASS (golden unchanged).
- [ ] **Step 5:** Commit `refactor: elite units table (Sacred Band becomes a preset)`.

### Task 4: Blocks and looks replace `Faction`

**Files:** `src/engine/types.ts`, `setup.ts`, `src/scenarios/index.ts` + `data/001–015.json`, `src/art/palettes.ts`,
`src/art/*.tsx` (kit selection), `src/ui/kit/BannerTrack.tsx`, `src/ui/game/Board.tsx`, `GameScreen.tsx`,
`src/ui/screens/Menus.tsx`, `src/dev/ArtGallery.tsx`, `src/ai/voice.ts`, `tests/rules/helpers.ts`, `tests/**` setups.

**Produces:**

```ts
export type Blocks = 'rom' | 'car' | 'grk' | 'eas';
export type ArmyLook =
  | 'roman' | 'carthaginian' | 'syracusan'
  | 'athenian' | 'theban' | 'spartan' | 'phocian' | 'macedonian' | 'antigonid' | 'epirote'
  | 'craterus' | 'eumenes' | 'antigonus' | 'seleucid' | 'ptolemaic' | 'persian' | 'scythian' | 'indian' | 'mauryan';
export interface SideSetup { army: string; blocks: Blocks; look: ArmyLook; commander: string; cards: number }
export interface PlayerState { /* ... */ blocks: Blocks; look: ArmyLook } // `faction` removed
// art
export type Kit = 'roman' | 'punic' | 'greek' | 'macedonian' | 'persian' | 'scythian' | 'indian';
export const LOOKS: Record<ArmyLook, { kit: Kit; palette: Palette }>;
export const BLOCK_COLORS: Record<Blocks, { edge: string; edgeShade: string; edgeLight: string; banner: string; bannerShade: string }>;
// components take { look, blocks } instead of { faction }
```

Phase 1 mapping: base JSON gets per side `"blocks"` = current `"blocks"` value (`rom`/`car`) and `"look"`
(`roman`, `carthaginian`, or `syracusan` for the Syracusan army). Palettes: `roman` = today's `rome`, `carthaginian` =
`carthage`, `syracusan` = `syracuse`; block colours `rom` = today's Roman base edge, `car` = Carthaginian; `syracusan`
look keeps drawing with `rom` blocks in base scenarios, so appearance is identical. Only those three looks exist in
Phase 1 (`LOOKS` is `Partial` until Task 15 adds the rest). `romanSide(s)` in `flow.ts` keeps using `army === 'Roman'`.

- [ ] **Step 1:** Change types; fix compile errors file by file (`npm run typecheck` drives the list).
- [ ] **Step 2:** Screenshot `#/gallery/art` and a base battle (e.g. `#/play/001/bottom/recruit/1`) before and after on
  the dev server (port 5174, see Task 20) and compare: identical colours and figures.
- [ ] **Step 3:** `npm test` + typecheck → PASS.
- [ ] **Step 4:** Commit `refactor: split faction into blocks (side colour) and look (figure kit)`.

### Task 5: AI and UI read the shared helpers

**Files:** `src/ai/estimate.ts`, `board.ts`, `evaluate.ts`, `policies.ts`, `src/ui/game/uiModel.ts`,
`src/ui/screens/RulesReference.tsx`.

- [ ] **Step 1:** Replace literal checks with the Task 2/3 helpers and fields (examples: `t.type === 'EL'` →
  `UNIT_STATS[t.type].elephantTable` / `ignoreAllSwords`; `u.type === 'WA' && full` → `fullStrengthBonus`; `e.type !== 'LC'`
  → `!UNIT_STATS[e.type].mounted`; AX range rule → `noFireAfterMove`; `hasRanged(u.type)` → `canShoot(u)`;
  `st.sacredBand` → `eliteHas(u, 'helmetHits')`). Tooltip and reference lines are generated from fields (e.g.
  "Ignores 1 sword hit" from `swordIgnore`, "battling back 3" from `ccBack`).
- [ ] **Step 2:** `grep -rnE "type (===|!==) '(LI|LB|LS|AX|WA|MI|HI|LC|MC|HC|EL|HCH)'" src` → matches only in `units.ts`
  and art (figure drawing may branch on type).
- [ ] **Step 3:** `npm test` (golden AI games must be identical) + typecheck → PASS.
- [ ] **Step 4:** Commit `refactor(ai,ui): read unit abilities from the shared table`.

---

## Phase 2 — Rules (lead, TDD)

### Task 6: Rules reference §15–§17

**Files:** `design/rules-reference.md`.

- [ ] Add §15 *Expansion #1 units* (LBC, HWM, CAM tables and text as in the spec 1.2, with the rulings),
  §16 *Expansion #1 terrain* (sea, rampart, no-cap ford, impassable hills), §17 *Expansion #1 elites, leader traits and
  scenario rules* (every scenario 101–124 with its special rules). Mark every guess **[Interp]** with its source from
  `design/exp1-rulings.md` (the rulings research, committed alongside). Commit `docs: rules reference for Expansion #1`.

### Task 7: New unit types LBC and CAM

**Files:** `src/engine/types.ts` (`UnitType` += `'LBC' | 'CAM'`), `units.ts` rows, `combat.ts` (`vsMountedIgnoreHit` for
CAM), `src/ai/values.ts` (`TYPE_WEIGHT` LBC 0.6, CAM 0.72 — temporary until Task 18), art fallbacks (Task 15 replaces).
Test: `tests/rules/exp1-units.test.ts`.

Rows: `LBC: { cls:'light', mounted, cavalry, blocks:3, move:4, moveBattle:4, cc:2, ccBack:2, range:3, retreat:4,
swordHits:false, evade:'always', momentumExtraHex:true, frightenedBy:['EL','CAM'], elephantDiceAgainst:2 }`;
`CAM: { cls:'medium', mounted, cavalry:false, chariot:false, blocks:3, move:3, moveBattle:3, cc:3, ccBack:2, range:0,
retreat:3, swordHits:true, evade:'vsFootHeavyMounted', vsMountedIgnoreHit:'medium', vsMountedIgnoreFlag:false,
elephantDiceAgainst:3 }`; add `'CAM'` to `frightenedBy` of LC, MC, **HC**, HCH and LBC (every cavalry and chariot type —
living rules). `ccBack` 2 is used for battle back and First Strike (already the engine's convention). Camel escape dice
for a leader passing through: 3 (`escapeDice` uses `cc`).

Tests (use `tests/rules/helpers.ts`; bottom attacker at (5,6), top defender at (4,6); `forceDice` to script faces):
- [ ] LBC attack dice 2; battle back 2; swords miss; ranged range 3 with 2 dice still and 1 after moving; can fire at
  distance 3, not 4; may always evade; after an eliminated defender: momentum prompt, then `cavalryExtra` prompt;
  after a *bonus* combat no `cavalryExtra`; ordered by Order Light Troops and Order Mounted; retreats 4 per flag and
  5 per flag against an elephant or camel striker.
- [ ] CAM: attack 3 dice, battle back 2, First Strike 2; MC attacking a camel with faces `['medium','medium']` scores 1
  hit (one ignored); an HI attacking it with the same faces scores 2; a camel's flag never gets ignored *by* the camel
  rule (no flag-ignore vs cavalry); LC and HC hit by a camel's flag retreat (4+1) and (2+1) hexes per flag; camel may
  evade an HI attack but not an MC attack; elephants roll 3 against camels; momentum then bonus combat offered, no
  cavalry extra hex.
- [ ] Each test FAILS first, then implement, then PASS. `npm test` green. Commit `feat(engine): light bow cavalry and camels`.

### Task 8: Heavy war machine (HWM)

**Files:** `types.ts` (`'HWM'`), `units.ts` (row + fields `warMachine: true`, `ccOnlyIfStill`, `noMomentum`,
`evadeRemoves`, `forbiddenTerrain: ['broken','marsh']`), `movement.ts` (forbidden terrain, battle-after-move false),
`flow.ts` (evade removal without banner; no momentum), `retreat.ts` (forbidden terrain in retreat/evade),
`combat.ts`/`battleTargets` (CC only if not moved; ranged not after moving). Test: `tests/rules/exp1-hwm.test.ts`.

Row: `HWM: { cls:'heavy', foot:true, mounted:false, blocks:2, move:1, moveBattle:0, cc:2, ccBack:2, range:6,
retreat:1, swordHits:false, evade:'always', noFireAfterMove:1, elephantDiceAgainst:2, doubleTimeMove:null,
lightFoot:false, forestFighter:false, noRally:false }` (rulings: `design/exp1-rulings.md` Q14).

- [ ] Tests: fires at range 6 with 2 dice if it did not move, normal line of sight, not at an adjacent unit; no battle
  at all after moving 1; CC 2 dice only when it did not move, swords miss; battles back with 2; cannot enter broken
  ground or marsh (not in `unitMoves`, not a retreat/evade hex); when attacked it may evade only if it has a 1–2 hex evade
  path, the attacker rolls and only red squares hit; if it survives it makes the evade move and then leaves the board with
  **no banner** (event `{ t: 'removed', id, reason: 'war machine abandoned' }`), banner count unchanged; eliminated by
  hits → banner; never offered momentum or bonus combat (even with a leader attached); ordered by Order Heavy Troops and
  Line Command; in a Double Time group it moves only 1; Darken the Sky fires twice; can be rallied.
- [ ] Fail → implement → pass; commit `feat(engine): heavy war machines`.

### Task 9: Elite presets and leader traits

**Files:** `elites.ts` (all presets), `types.ts` (`LeaderTrait = 'ccBonus' | 'attachedOnly'`, `Leader.traits?`),
`setup.ts` (leaders accept `traits`, units accept `elite`; validate `ELITES[id].types` includes the unit type),
`combat.ts` (`closeCombatDice` +1 for `ccBonus` leader attached — after caps, all roles; `helmetsCount` honours
`attachedOnly`: an attachedOnly leader counts only for his own unit; `eliteHas` sword/flag ignores),
`orders.ts` (Leadership cards with an `attachedOnly` leader: legal orders are exactly {leader, his unit}),
`flow.ts`/`combat.ts` `rangeOf/canShoot` for ranged elites. Test: `tests/rules/exp1-elites.test.ts`.

- [ ] Tests: Theban Sacred Band MI scores helmets with no leader near and may ignore 1 flag; Silver Shields HI same;
  Companions MC ignore 1 sword hit (`['swords','swords']` from an HI → 1 hit) and may ignore 1 flag; Immortals MI fire at
  range 3 (2 dice still, 1 moved) and still close combat with 4; bow auxilia fire at range 3 but not after moving 2;
  Alexander attached: MC attacks with 4, battles back with 4 (or per ruling), on a hill-cap 2 → 3; a unit merely
  adjacent to Alexander gets no bonus; satrap `attachedOnly`: an adjacent unit's helmets miss, the attached unit's hit;
  Leadership Any Section on a satrap orders only him + his unit; attached satrap still gives 1 flag-ignore.
- [ ] Fail → implement → pass; commit `feat(engine): elite units and leader traits`.

### Task 10: Terrain — sea, rampart, no-cap ford

**Files:** `types.ts` (`TerrainType` += `'sea' | 'rampart'`; `GameState.noCap: boolean[]`, `GameState.rampart:
number[]` — 6-bit mask per hex, bit i = neighbour direction i of `hex.ts` (E, NE, NW, W, SW, SE)), `setup.ts` (terrain
entries `ford?: boolean | 'nocap'`, `faces?: Side`, `edges?: ('E'|'NE'|'NW'|'W'|'SW'|'SE')[]`; `faces:'top'` = NW+NE,
`faces:'bottom'` = SW+SE), `hex.ts` (`directionTo(from, to): number` for neighbours; `sideCrossed(target, firer):
number[]` = the hexside(s) of `target` the centre line to `firer` passes through — two when it passes exactly through a
corner), `terrain.ts` (`sea` = lake rules; `rampartProtects(s, defHex, fromHex): boolean`), `combat.ts` (`swordIgnores`
+1 and `ignorableFlags` +1 for a foot defender attacked in close combat across a protected edge; ranged: +1
flag-ignore when the line enters through a protected edge — corner case: either edge protected **[Interp]**),
`src/ui/terrain` names. Test: `tests/rules/exp1-terrain.test.ts`. Rulings: `design/exp1-rulings.md` Q16.

- [ ] Tests: sea impassable for move/retreat/evade/leader evade, does not block LOS; foot unit on a rampart attacked
  from a front neighbour ignores 1 sword (an elephant does not re-roll it) and may ignore +1 flag; attacked from a
  side/rear neighbour → no benefit; a 3-edge corner piece protects its third edge; the rampart unit attacking out gets no
  bonus or penalty;
  mounted unit on a rampart → no benefit; ranged from in front → +1 flag-ignore only; rampart doesn't stop movement or
  block LOS; Pinarus-style no-cap ford: entering stops, CC dice not capped (HI attacks with 5 from a no-cap ford),
  ranged from it not capped.
- [ ] Fail → implement → pass; commit `feat(engine): sea, rampart and uncapped fords`.

### Task 11: Scenario rules

**Files:** `types.ts` (`SpecialRuleId` += `'leaderLossCostsCard' | 'allLeadersSuddenDeath' | 'frightAtFirstSight' |
'tacticalFlexibility' | 'campCapture'`, remove `'baeculaCamps'`; `ScenarioSpecial.campCapture: { side: Side; hexes:
HexId[] } | null`; events `{ t: 'cardLost'; side: Side; card: number }`), `setup.ts` (`ScenarioSetup.campCapture?`,
`options?: { tacticalFlexibility?: boolean }` → only adds the rule id when true), `flow.ts`, `combat.ts`,
`src/scenarios/index.ts` (011 uses `campCapture: { side: 'bottom' }` = all camp hexes), `src/ai/moves.ts`,
`src/ai/evaluate.ts`, `src/ai/policies.ts` (camp logic reads `special.campCapture`). Test: `tests/rules/exp1-scenario-rules.test.ts`.

- [ ] `leaderLossCostsCard`: leader killed on own turn → `command` −1, no draw at end of that turn; killed on the
  opponent's turn → `command` −1 and one random card (seeded `randInt`) leaves the hand to the discard with `cardLost`.
  Tests for both, plus two losses in one turn; a leader evading off his baseline changes nothing.
- [ ] `allLeadersSuddenDeath`: track `special.leadersLost: Record<Side, number>` and the starting count; when a side's
  eliminated count reaches its starting count → immediate victory for the other side with reason; a leader who evaded off
  the board means it can no longer trigger.
- [ ] `frightAtFirstSight`: Roman (army `Roman`) foot unit with attached leader and 2 supports takes 1 flag from an
  elephant → must retreat (max ignorable 0); same unit vs an HI flag → may ignore; elephant flags while battling back,
  in bonus combat and on First Strike also count.
- [ ] `tacticalFlexibility`: non-Roman HI with < 2 supports, not on broken ground, battling back vs Roman MI/HI rolls 3
  (also vs their bonus attack); supported → 5; on broken ground → normal (capped) dice; vs Roman AX → 5; First Strike →
  5; option off → 5.
- [ ] `campCapture`: Gabiene-style — side top stopping on the listed camp hex gains 1 banner once; passing through does
  not; Baecula unchanged (golden + existing Baecula tests).
- [ ] Fail → implement → pass; commit `feat(engine): Expansion #1 scenario rules`.

### Task 12: Leader placement phase (Asculum)

**Files:** `types.ts` (`SpecialRuleId` += `'leaderPlacement'`; Decision `{ kind: 'placeLeader'; side: Side; leader:
string; options: HexId[] }`; event `{ t: 'leaderPlaced'; id: string; hex: HexId }`; `ScenarioSpecial.unplaced:
string[]`), `setup.ts` (leaders listed under `placeLeaders: { side, name }[]` start at `OFF_BOARD` and go to
`special.unplaced` in placement order), `flow.ts` (`gameFlow`: before the first `turnFlow`, while `unplaced` is
non-empty ask `placeLeader` for each; options = own unit hexes without a leader plus every empty passable hex — RAW,
`design/exp1-rulings.md` Q11), `legal.ts` (`randomAnswer`
picks a random option), `src/ai/index.ts` (temporary: first option; Task 19 adds the real policy). Test:
`tests/rules/exp1-placement.test.ts`.

- [ ] Tests: decisions come Roman, Roman, Epirote, Epirote before the first `playCard`; an illegal hex (enemy unit, other
  leader, impassable) is rejected; a leader placed on a unit is attached; a leader placed on an empty hex stands alone;
  replay through `GameDriver.replay` reproduces the placements.
- [ ] Fail → implement → pass; commit `feat(engine): pre-battle leader placement`.

---

## Phase 3 — Battle data (delegated; lead reviews)

### Task 13: Scenario format, loader validation, compare route, manifest test

**Files:** `src/scenarios/index.ts` (ScenarioJson: `blocks`, `look`, `expansion`, `options`, `campCapture`, unit
`elite`, leader `traits`, terrain `t: 'sea'|'rampart'`, `ford: true|'nocap'`, `faces`, `placeLeaders`), `src/engine/setup.ts`
(validation errors name the scenario id), `src/dev/ScenarioCompare.tsx` + route in `src/ui/App.tsx` (dev only:
`import.meta.env.DEV`), `tests/scenarios/exp1.test.ts`, `tests/scenarios/manifest.ts`.

`ScenarioCompare` renders `SetupPreview` for the scenario next to
`<img src="https://www.commandsandcolors.net/ancients/images/stories/CCA_maps/${id}.jpg">` (102 uses `102-Himera.jpg`)
with hex coordinate labels toggle; it must not be reachable in production builds.

Manifest entry per scenario: `{ id, banners, cards: {top, bottom}, first, blocks: {top, bottom}, leaders: {top: n,
bottom: n}, units: { top: Partial<Record<UnitType, number>>, bottom: ... }, elites: [{ side, elite, type }] }` — values
from the survey (`design/exp1-scenario-notes.md`).

- [ ] Test asserts for each manifest entry: setup builds; counts match; elites on listed types; every unit on a passable
  hex; one piece per hex; leader names unique per side; rampart `faces` points away from its own baseline; a lone
  leader at setup (102 Hamilcar) is allowed and stays on its hex.
- [ ] Commit `feat(scenarios): Expansion #1 data format, validation, dev compare route`.

### Task 14: Transcribe 101–124 (two agents in parallel) and verify (third agent)

**Agent T1 owns** `src/scenarios/data/101.json`–`112.json`; **agent T2 owns** `113.json`–`124.json`; both append their
rows to `design/exp1-scenario-notes.md` (separate sections) and to `tests/scenarios/manifest.ts` (separate arrays).
Lead adds the `EXTRA` texts (blurb, specialText, hint, rules) in `src/scenarios/index.ts`.

Method: download the map to the scratchpad, read hex rows top to bottom using the odd-r layout (row 0 = top, even rows
13 hexes, odd rows 12 shifted right), record terrain, units (type, side, r, c), leaders (name, r, c), elites, rampart
edges; cross-check per-type counts with the page's unit table; conflicts → official errata first (spec "Rulings" table:
Granicus MI 2 / MC 3 with the satraps on MC; Magnesia Greek blocks + camel; Himera's Eumachus MC Syracusan; Beneventum
leader Dentatus; Gaugamela 331 BC; Asculum 6 banners), then map for positions, table for counts; noted with reason.
For 122–124 also read GMT's Bonus Pack #2 PDF maps (https://s3-us-west-2.amazonaws.com/gmtwebsiteassets/cca/CCBonusPack-2.pdf).

**Verifier agent V owns nothing in `src/`**: for each battle opens `#/gallery/scenario/<id>` on the dev server and the
map image, compares hex by hex, writes discrepancies to `design/exp1-verification.md`; transcribers fix; repeat until
the file lists none. Acceptance: `npx vitest run tests/scenarios` green; verification file shows all 24 "match".
Commit per agent batch.

---

## Phase 4 — Art (delegated)

### Task 15: Kits, looks and block colours

**Agent A owns** `src/art/palettes.ts`, `src/art/parts.tsx`, `src/art/foot.tsx`, `src/art/mounted.tsx`,
`src/art/leader.tsx`, `src/dev/ArtGallery.tsx`.

Produces full `LOOKS` (19 looks) and `BLOCK_COLORS` (`grk` light blue, `eas` ochre-tan; checked for contrast against
`rom` red, `car` purple and the board green), kits `macedonian` (sarissa phalanx HI, hypaspist MI, Thracian/Boeotian
helmets, linothorax), `persian` (tiara, spara, scale), `scythian` (pointed cap, gorytos, trousers), `indian`
(turban, longbow, dhoti), Greek hoplite variants (Spartan red cloaks/lambda, Theban club). Acceptance: the gallery shows
every look × every unit type it fields × block colours; figures readable at 85 px hex width; lead reviews screenshots.

### Task 16: New figures and elite looks

**Agent B owns** `src/art/elephant.tsx`, `src/art/chariot.tsx`, new `src/art/camel.tsx`, `src/art/machine.tsx`,
`src/art/token.tsx` (dispatch for LBC/HWM/CAM, elite marker), `src/art/icon.tsx`.

Produces: LBC horse archers (scythian, persian, macedonian, seleucid), camel archer, HWM bolt-thrower + crew
(macedonian, roman), elephants for indian/seleucid/ptolemaic/epirote/macedonian/roman, chariots for persian/indian/
seleucid, Roman HC; elite looks for the six presets (kit details + gold standard). Acceptance as Task 15.

### Task 17: Terrain art — sea coast and rampart

**Agent C owns** `src/ui/terrain/water.tsx` (sea), new `src/ui/terrain/rampart.tsx`, `src/ui/terrain/BoardArt.tsx`,
`TerrainIcon.tsx`, `src/dev/TerrainGallery.tsx`.

Produces: `sea` painted as coastline (beach band along land edges, surf, open water), consistent with the lake style;
`rampart` as an earth bank + stakes along the two forward hexsides per `facing`, readable when the board is flipped.
`BoardArt` takes `facing` and `noCap` (fords drawn as today). Acceptance: gallery and maps 101/102/108/118 look right.

---

## Phase 5 — UI (lead)

### Task 18 (UI): Picker tabs, optional rules, placement, card loss, tooltips, reference

**Files:** `src/ui/screens/Menus.tsx`, `screens.css`, `src/ui/game/controller.ts` (`SessionConfig.options`,
`createGame(sc.setup, seed, config.options)`), `GameScreen.tsx` (placeLeader prompt: highlight `options`, click to
place; `cardLost` toast/log), `uiModel.ts`, `RulesReference.tsx`, `src/ui/App.tsx` (dev route `#/play/<id>/...`
accepts 101–124).

- [ ] Picker tabs "Punic Wars" / "Greece & the East"; list shows official numbers; briefing "Optional rules" toggles
  (Tactical Flexibility, default on), saved in `localStorage('cca-options')` and the session config.
- [ ] Verify in the browser (dev server port 5174): every tab, a battle per tab, Asculum placement, Hellespont card loss
  (force via `__cca`), tooltips for LBC/HWM/CAM/elites/Alexander/rampart; screenshots. Commit `feat(ui): Expansion #1 screens`.

---

## Phase 6 — AI

### Task 19: AI support (agent D owns `src/ai/**` and `tests/ai/**`; lead reviews)

- Values: `TYPE_WEIGHT` LBC/HWM/CAM, `ELITE_WEIGHT` per preset, leader value × 1.5 with `ccBonus`; Hellespont:
  leaders valued like `SACRED_LEADER_VALUE` scaled by remaining leaders.
- Estimators: elite ranged, rampart protection, Alexander bonus, attachedOnly helmets, Fright, Tactical Flexibility,
  HWM rules (no fire after move, CC only if still), camel hit-ignore, LBC/camel fright — all via engine helpers.
- Policies: HWM evade when standing risks ≥ 1 expected block; HWM holds position; LBC skirmish; leader placement
  (score ≤ 12 candidate placements by evaluation after placing, pick best; deterministic in deterministic mode).
- Personalities `BY_NAME` for the new commanders (spec §4 mapping); voice troop names per kit.
- Tests: regress cases (HWM evades a lethal attack; LBC fires instead of closing vs HI; placement puts leaders with
  units, never alone; Hellespont AI keeps its last leader out of contact); `tests/ai/ai.test.ts` legality over all 39
  scenarios' first decisions.
- Acceptance: `npm test` green; `npx vite-node scripts/ai-match.ts -- --a tribune --b recruit --games 2` on a sample of
  6 new battles: tribune ≥ recruit overall; no stalls; average Tribune decision < 1.5 s.

---

## Phase 7 — Verification and release (lead)

### Task 20: Soak, balance log, browser pass

- [ ] `npm test` — soak covers all 39 scenarios automatically (it iterates `SCENARIOS`); keep total test time < 90 s
  (reduce games per new scenario to 2 if needed).
- [ ] AI-vs-AI balance log for the 24 battles (`scripts/ai-stats.ts`), noting lopsided ones in
  `design/exp1-scenario-notes.md` and re-checking their setups.
- [ ] Browser: add a local launch config `dev-exp1` (port 5174) in the worktree's `.claude/launch.json` (not committed);
  play the first turns of 6 battles (one per mechanic) and full Asculum placement; screenshots.

### Task 21: Release

- [ ] `git merge main` (resolve conflicts; regenerate `ai-*` golden entries only if `main` changed AI behaviour).
- [ ] `npm test`, `npm run typecheck`, `npm run build`; `pages-preview` check of `/cnc-claude/` (port 4173) incl. a
  101–124 battle.
- [ ] Update README (39 battles, Expansion #1 section) and CLAUDE.md (expansion notes).
- [ ] Merge the branch into `main` (fast-forward or merge commit) from the worktree via `git push . HEAD:main` only if
  `main` has no uncommitted changes in the main checkout that would conflict — otherwise coordinate; commit the
  regenerated `docs/`; `git push` (HTTPS keychain).
