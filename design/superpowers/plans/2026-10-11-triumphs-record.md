# Triumphs (battle record) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remember every finished battle per battle × side × opponent level, and show it as bronze/silver/gold medals
in the battle picker, on the main menu and in a Triumphs dialog, with export/import of the record.

**Architecture:** A pure record module (`src/ui/record.ts`) over `localStorage` (key `cca-record-v1`); the game
controller records a battle once when it ends and reports a newly earned medal in `view.over`; the screens read the
record and draw medals with one `Medal` SVG component.

**Tech Stack:** TypeScript, React 18, Vite, Vitest (node environment; render tests use `renderToStaticMarkup`).

Spec: `design/superpowers/specs/2026-10-11-triumphs-record-design.md`.

## Global Constraints

- Storage only through `storage` (`src/ui/storage.ts`); every read tolerates missing or malformed data.
- Medals: Recruit → bronze, Tribune → silver, Consul → gold; a side's medal is the hardest level beaten from it.
- Only finished battles count; a battle is recorded once.
- Side order everywhere: bottom army first, then top (as the briefing's "Command the" buttons).
- British spelling in UI text. No absolute asset paths. `docs/` is build output only.
- Release v1.6.0 "Pydna" in `src/version.ts`, `package.json` and the root of `package-lock.json`.

---

### Task 1: Record module

**Files:**
- Create: `src/ui/record.ts`
- Test: `tests/ui/record.test.ts`

**Interfaces — Produces:**
```ts
export type Outcome = 'won' | 'lost' | 'draw';
export type Medal = 'bronze' | 'silver' | 'gold';
export type Standing = Medal | 'fought' | 'none';
export interface Tally { won: number; lost: number; draw: number }
export type BattleResults = Partial<Record<Side, Partial<Record<Difficulty, Tally>>>>;
export type BattleRecord = Record<string, BattleResults>;
export const LEVELS: readonly Difficulty[];                 // recruit, tribune, consul
export const MEDAL_FOR: Record<Difficulty, Medal>;
export function isMedal(s: Standing): s is Medal;
export function outcomeFor(humanSide: Side, winner: Side | 'draw'): Outcome;
export function addResult(rec: BattleRecord, battleId: string, side: Side, level: Difficulty, outcome: Outcome): BattleRecord;
export function sideTally(rec: BattleRecord, battleId: string, side: Side): Tally;
export function beatenLevels(rec: BattleRecord, battleId: string, side: Side): Difficulty[];
export function sideStanding(rec: BattleRecord, battleId: string, side: Side): Standing;
export interface Totals { gold: number; silver: number; bronze: number; fought: number; battles: number; sides: number }
export function recordTotals(rec: BattleRecord, battleIds: readonly string[]): Totals;
export function mergeRecords(a: BattleRecord, b: BattleRecord): BattleRecord;
export function parseRecord(raw: unknown): BattleRecord | null;
export function loadRecord(): BattleRecord;
export function saveRecord(rec: BattleRecord): void;
export function recordFinished(battleId: string, side: Side, level: Difficulty, outcome: Outcome): Medal | null;
export function exportRecord(rec: BattleRecord, now?: Date): { name: string; text: string };
export function importRecord(text: string): BattleRecord | null;
```

- [ ] Step 1: write `tests/ui/record.test.ts` covering: `addResult` counts and does not mutate its input; `sideStanding`
  gives none → fought → bronze → gold and keeps gold after a later Recruit win; `beatenLevels` in level order;
  `recordTotals` counts each side once by its best medal and battles fought from either side, ignoring ids not asked
  for; `mergeRecords` takes maxima and merging twice changes nothing; `parseRecord` drops bad sides, levels, ids and
  counts and returns null for non-objects; `loadRecord`/`saveRecord` round trip through a Map-backed `localStorage`
  stub and an empty record without storage; `recordFinished` returns the medal only when it improves;
  `exportRecord`/`importRecord` round trip and reject other JSON.
- [ ] Step 2: run `npx vitest run tests/ui/record.test.ts`; expect failures (module missing).
- [ ] Step 3: implement `src/ui/record.ts`.
- [ ] Step 4: run the test again; expect PASS.
- [ ] Step 5: commit `src/ui/record.ts tests/ui/record.test.ts`.

### Task 2: Record at battle end, and the new medal in the result dialog

**Files:**
- Modify: `src/ui/game/controller.ts` (ViewState.over gains `newMedal?: Medal`; `pump` records once)
- Modify: `src/ui/game/BattleResult.tsx` (a "New medal" line), `src/ui/game/game.css`
- Test: `tests/ui/record.test.ts` (controller + result dialog cases)

**Interfaces — Consumes:** `recordFinished`, `outcomeFor`, `Medal` (Task 1); `Medal` component (Task 3 — the line
uses it, so Task 3's component file is created first in this task if executed out of order).

- [ ] Step 1: tests: a `GameController` built with the answers of a random finished game (GameDriver + `randomAnswer`
  with a seeded generator) and a `SeededOpponent` reaches `view.over`, and the stored record then holds exactly one
  result for that battle, side and level; a win reports `newMedal`; `BattleResult` with `over.newMedal` renders
  "New medal" and the metal; without it renders no such line.
- [ ] Step 2: run, expect failures.
- [ ] Step 3: in `pump`, when the battle is over: `const newMedal = this.recorded ? null : recordFinished(...)`, set
  `this.recorded = true`, and put `newMedal ?? undefined` into `over`. In `BattleResult`, after the turns line:
  `<p className="victory-medal"><Medal standing={m} size={26}/> New medal: {m}, for beating the {Level} as the {army}</p>`.
- [ ] Step 4: run, expect PASS; commit.

### Task 3: Medal art and the picker

**Files:**
- Create: `src/ui/screens/Medal.tsx` (`Medal`, `MedalPair`, `standingText`)
- Modify: `src/ui/screens/Menus.tsx` (`ScenarioSelect`: rows, tabs, choose buttons, `initialBattle` prop),
  `src/ui/screens/screens.css`
- Test: `tests/ui/record.test.ts` (render cases)

**Interfaces — Produces:**
```ts
export function Medal(p: { standing: Standing; size?: number; faint?: boolean; className?: string }): JSX.Element;
export function MedalPair(p: { rec: BattleRecord; sc: ScenarioInfo; size?: number; className?: string }): JSX.Element;
export function standingText(s: Standing): string;  // 'gold (beat the Consul)' … 'not fought yet'
ScenarioSelect props: { onBack; onStart; initialBattle?: string }
```

- [ ] Step 1: tests with a stubbed record: the picker row for the battle shows two medals with the label
  "Syracusan: gold (beat the Consul) · Carthaginian: not fought yet"; the tab shows its medal count; the side button
  carries the medal; the Consul button's medal is not faint when beaten from the chosen side, the others faint;
  `initialBattle: '109'` opens on Gaugamela with the Greece tab selected.
- [ ] Step 2: run, expect failures.
- [ ] Step 3: implement `Medal.tsx`; wire `ScenarioSelect` (record loaded once with `useState(loadRecord)`); CSS:
  `.scen-item` columns `38px minmax(0, 1fr) auto`, `.scen-hint` column 2, `.scen-medals` column 3 row 2;
  `.choice` `position: relative` with `.choice-medal` top-right.
- [ ] Step 4: run, expect PASS; commit.

### Task 4: Triumphs on the main menu

**Files:**
- Create: `src/ui/screens/Triumphs.tsx` (`MedalTally`, `TriumphsDialog`)
- Modify: `src/ui/screens/Menus.tsx` (`MainMenu`: Triumphs button, tally, dialog; `onNew(battleId?)`),
  `src/ui/App.tsx` (select screen carries the battle id), `src/ui/screens/screens.css`
- Test: `tests/ui/record.test.ts` (menu and dialog renders)

**Interfaces — Consumes:** Tasks 1 and 3. **Produces:** `MainMenu` prop `onNew: (battleId?: string) => void`.

- [ ] Step 1: tests: the menu shows a Triumphs button always and the tally line only with a record
  ("gold 1 · silver 0 · bronze 1 · 2 of 81 battles fought"); the dialog lists every battle of every box with a
  `MedalPair`, per-box tallies, Save record and Load record.
- [ ] Step 2: run, expect failures.
- [ ] Step 3: implement. Save: `exportRecord` → Blob → temporary `<a download>`. Load: hidden file input →
  `file.text()` → `importRecord` → `mergeRecords` → `saveRecord` → state, with a status line.
- [ ] Step 4: run, expect PASS; commit.

### Task 5: Release, verification and publish

- [ ] Add v1.6.0 "Pydna" to `RELEASES`, `package.json`, `package-lock.json`.
- [ ] `npm run typecheck`, `npm test`.
- [ ] Browser check on a worktree dev server (seeded record): menu tally, Triumphs dialog, click-through to the picker,
  picker rows/tabs/buttons, save and load; screenshots.
- [ ] `npm run build`; commit source and `docs/`; fast-forward push to `main`.
