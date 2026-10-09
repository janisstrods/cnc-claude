// Board queries shared by rules, AI and UI.
import { areAdjacent, neighbours } from './hex';
import { UNIT_STATS } from './units';
import type { GameState, HexId, Leader, Side, Unit, UnitClass } from './types';

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

export function pieceHex(s: GameState, id: string): HexId | undefined {
  return isLeaderId(id) ? leaderById(s, id)?.hex : unitById(s, id)?.hex;
}

export function pieceSide(s: GameState, id: string): Side | undefined {
  return isLeaderId(id) ? leaderById(s, id)?.side : unitById(s, id)?.side;
}

/** Leader attached to (sharing the hex of) a unit. */
export function attachedLeader(s: GameState, u: Unit): Leader | undefined {
  if (u.hex < 0) return undefined;
  for (const l of s.leaders) if (l.hex === u.hex && l.side === u.side) return l;
  return undefined;
}

/** Unit a leader is attached to, if any. */
export function leaderUnit(s: GameState, l: Leader): Unit | undefined {
  if (l.hex < 0) return undefined;
  for (const u of s.units) if (u.hex === l.hex && u.side === l.side) return u;
  return undefined;
}

export function isLoneLeader(s: GameState, l: Leader): boolean {
  return l.hex >= 0 && !leaderUnit(s, l);
}

export function unitClass(u: Unit): UnitClass {
  return UNIT_STATS[u.type].cls;
}

/** True if any enemy unit (not leader) is adjacent to hex h, from `side`'s point of view. */
export function enemyUnitAdjacent(s: GameState, h: HexId, side: Side): boolean {
  for (const u of s.units) if (u.side !== side && u.hex >= 0 && areAdjacent(u.hex, h)) return true;
  return false;
}

/** Enemy unit or enemy leader adjacent to h (used for the warrior charge rule). */
export function enemyPieceAdjacent(s: GameState, h: HexId, side: Side): boolean {
  if (enemyUnitAdjacent(s, h, side)) return true;
  for (const l of s.leaders) if (l.side !== side && l.hex >= 0 && areAdjacent(l.hex, h)) return true;
  return false;
}

export function adjacentEnemyUnits(s: GameState, h: HexId, side: Side): Unit[] {
  return s.units.filter((u) => u.side !== side && u.hex >= 0 && areAdjacent(u.hex, h));
}

/** Friendly units + lone friendly leaders adjacent to unit u (support for bolster morale). */
export function supportCount(s: GameState, u: Unit): number {
  let n = 0;
  for (const h of neighbours(u.hex)) {
    const v = unitAt(s, h);
    if (v) {
      if (v.side === u.side) n++;
      continue;
    }
    const l = leaderAt(s, h);
    if (l && l.side === u.side) n++;
  }
  return n;
}

/** A friendly leader attached to or adjacent to hex h (for leader helmet hits). */
export function leaderNear(s: GameState, h: HexId, side: Side): boolean {
  for (const l of s.leaders) {
    if (l.side !== side || l.hex < 0) continue;
    if (l.hex === h || areAdjacent(l.hex, h)) return true;
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
