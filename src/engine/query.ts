// Board queries shared by rules, AI and UI.
import { neighbours } from './hex';
import type { GameState, HexId, Leader, LeaderTrait, Side, Unit } from './types';

export function other(side: Side): Side {
  return side === 'top' ? 'bottom' : 'top';
}

export function unitAt(s: GameState, h: HexId): Unit | undefined {
  for (const u of s.units) if (u.hex === h) return u;
  return undefined;
}

export function leaderAt(s: GameState, h: HexId): Leader | undefined {
  for (const l of s.leaders) if (l.hex === h) return l;
  return undefined;
}

/**
 * The pieces by hex, for the rules that look at a hex and its neighbours (`at` parameters): the AI passes its occupancy
 * table (ai/board.ts `Occ`, one lookup per hex); without one the rules scan the state (`unitAt`, `leaderAt`). A hex
 * holds at most one unit and one leader, so both find the same pieces.
 */
export interface PieceIndex {
  readonly unit: readonly (Unit | null | undefined)[];
  readonly leader: readonly (Leader | null | undefined)[];
}

/** The unit on hex h (`at`: see PieceIndex). */
export function unitOn(s: GameState, h: HexId, at?: PieceIndex): Unit | null | undefined {
  return at ? at.unit[h] : unitAt(s, h);
}

/** The leader on hex h (`at`: see PieceIndex). */
export function leaderOn(s: GameState, h: HexId, at?: PieceIndex): Leader | null | undefined {
  return at ? at.leader[h] : leaderAt(s, h);
}

export function unitById(s: GameState, id: string): Unit | undefined {
  for (const u of s.units) if (u.id === id) return u;
  return undefined;
}

export function leaderById(s: GameState, id: string): Leader | undefined {
  for (const l of s.leaders) if (l.id === id) return l;
  return undefined;
}

export function isLeaderId(id: string): boolean {
  return id.startsWith('L');
}

/** The unit or leader with this id (leader ids start with L), on the board or off it; undefined once it is gone. */
export function pieceById(s: GameState, id: string): Unit | Leader | undefined {
  return isLeaderId(id) ? leaderById(s, id) : unitById(s, id);
}

/** Hex of the unit or leader with this id (`OFF_BOARD` while it waits off the board); undefined once it is gone. */
export function pieceHex(s: GameState, id: string): HexId | undefined {
  return pieceById(s, id)?.hex;
}

/** Leader attached to (sharing the hex of) a unit (`at`: see PieceIndex). */
export function attachedLeader(s: GameState, u: Unit, at?: PieceIndex): Leader | undefined {
  if (u.hex < 0) return undefined;
  const l = leaderOn(s, u.hex, at);
  return l && l.side === u.side ? l : undefined;
}

/** Unit a leader is attached to, if any. */
export function leaderUnit(s: GameState, l: Leader): Unit | undefined {
  if (l.hex < 0) return undefined;
  for (const u of s.units) if (u.hex === l.hex && u.side === l.side) return u;
  return undefined;
}

/** Every leader trait (§17.2, §18.3), for validating scenario data. */
export const LEADER_TRAITS: readonly LeaderTrait[] = ['ccBonus', 'attachedOnly', 'forcedMarch', 'spartacusDice'];

/** Does the leader have trait `t`? Ordinary leaders have none. */
export function leaderHas(l: Leader, t: LeaderTrait): boolean {
  return l.traits?.includes(t) ?? false;
}

export function isLoneLeader(s: GameState, l: Leader): boolean {
  return l.hex >= 0 && !leaderUnit(s, l);
}

/** True if any enemy unit (not leader) is adjacent to hex h, from `side`'s point of view (`at`: see PieceIndex). */
export function enemyUnitAdjacent(s: GameState, h: HexId, side: Side, at?: PieceIndex): boolean {
  for (const x of neighbours(h)) {
    const v = unitOn(s, x, at);
    if (v && v.side !== side) return true;
  }
  return false;
}

/** Friendly units + lone friendly leaders adjacent to unit u (support for bolster morale; `at`: see PieceIndex). */
export function supportCount(s: GameState, u: Unit, at?: PieceIndex): number {
  let n = 0;
  for (const h of neighbours(u.hex)) {
    const v = unitOn(s, h, at);
    if (v) {
      if (v.side === u.side) n++;
      continue;
    }
    const l = leaderOn(s, h, at);
    if (l && l.side === u.side) n++;
  }
  return n;
}

/**
 * A friendly leader attached to or adjacent to hex h (for leader helmet hits). An `attachedOnly` leader (a satrap, §17.2)
 * counts only for the unit he is attached to, i.e. only on his own hex. `at`: see PieceIndex.
 */
export function leaderNear(s: GameState, h: HexId, side: Side, at?: PieceIndex): boolean {
  if (h < 0) return false;
  const own = leaderOn(s, h, at);
  if (own && own.side === side) return true;
  for (const x of neighbours(h)) {
    const l = leaderOn(s, x, at);
    if (l && l.side === side && !leaderHas(l, 'attachedOnly')) return true;
  }
  return false;
}

export function unitsOf(s: GameState, side: Side): Unit[] {
  return s.units.filter((u) => u.side === side && u.hex >= 0);
}

export function leadersOf(s: GameState, side: Side): Leader[] {
  return s.leaders.filter((l) => l.side === side && l.hex >= 0);
}

/** Is the hex free of units and leaders? */
export function isEmptyHex(s: GameState, h: HexId): boolean {
  return !unitAt(s, h) && !leaderAt(s, h);
}
