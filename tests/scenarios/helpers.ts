// Shared plumbing for the expansion scenario suites (tests/scenarios/exp*.test.ts): battle lists, starting states, hex
// labels and terrain queries.
import { COLS, HEX_DIRS, createGame, hexId, rowOf, type GameState, type HexDir, type Side, type UnitType } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { MANIFEST, MANIFEST_EXP2, MANIFEST_EXP3 } from './manifest';

export const H = (r: number, c: number) => hexId(r, c);
export const EXP1 = Object.keys(MANIFEST).sort();
export const EXP2 = Object.keys(MANIFEST_EXP2).sort();
export const EXP3 = Object.keys(MANIFEST_EXP3).sort();
export const SIDES: Side[] = ['top', 'bottom'];

/** A battle's starting state. */
export const game = (id: string, seed = 1) => createGame(scenarioById(id).setup, seed);

/** The numbers a..b as strings. */
export const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));

/** A hex as 'r,c'. */
export const rc = (h: number) => `${rowOf(h)},${h - rowOf(h) * COLS}`;

/** The hexes r,a .. r,b as 'r,c' strings. */
export const cols = (r: number, a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => `${r},${a + i}`);
export const sorted = (xs: string[]) => [...xs].sort();

/** A union member without its `text` (Omit alone would flatten the union). */
export type NoText<T> = T extends unknown ? Omit<T, 'text'> : never;

export function unitCounts(s: GameState, side: Side): Partial<Record<UnitType, number>> {
  const n: Partial<Record<UnitType, number>> = {};
  for (const u of s.units) if (u.side === side) n[u.type] = (n[u.type] ?? 0) + 1;
  return n;
}

/** Protected hexsides of a rampart hex, by direction. */
export const edgesOf = (s: GameState, h: number): HexDir[] => HEX_DIRS.filter((_, i) => s.rampart[h] & (1 << i));

/** Every rampart hex as 'r,c' -> its protected hexsides, sorted and joined with '+'. */
export function rampartsOf(s: GameState): Record<string, string> {
  const out: Record<string, string> = {};
  s.terrain.forEach((t, h) => {
    if (t === 'rampart') out[rc(h)] = [...edgesOf(s, h)].sort().join('+');
  });
  return out;
}

/** The hexes of a terrain type as sorted 'r,c' strings. */
export function hexesOf(s: GameState, type: string): string[] {
  const out: string[] = [];
  s.terrain.forEach((t, h) => {
    if (t === type) out.push(rc(h));
  });
  return out.sort();
}
