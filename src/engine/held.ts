// Held banners (rules-reference §18.4): the banners `hold`, `majority` and `sectionClear` objectives give a side right
// now, kept in `ObjectiveState.held`. Pure state, recomputed from the units on the board (only units count, never lone
// leaders); the `held` events and the victory check are banners.ts's (`updateHeld`), which every banner goes through.
// This module sits below banners.ts in the import graph.
import { sectionsOf } from './hex';
import { unitOn, type PieceIndex } from './query';
import {
  SECTIONS, SIDES, type GameState, type HexId, type ObjectiveOf, type ObjectiveState, type SectionName, type Side,
} from './types';

/** Banners `side` holds right now through its objectives (hold, majority, section clear); lost again when they lapse. */
export function heldBanners(s: GameState, side: Side): number {
  let n = 0;
  for (const o of s.special.objState) n += o.held[side];
  return n;
}

/** Held banners of every objective, per side (to compare after a change). */
export function heldSnapshot(s: GameState): Record<Side, number>[] {
  return s.special.objState.map((st) => ({ ...st.held }));
}

/** Units of `side` on `hexes` (`at`: see PieceIndex). */
export function unitsOn(s: GameState, hexes: readonly HexId[], side: Side, at?: PieceIndex): number {
  let n = 0;
  for (const h of hexes) if (unitOn(s, h, at)?.side === side) n++;
  return n;
}

/** Is there a unit of `side`'s enemy in section `sec` (from `side`'s point of view; a boundary hex is in both)? */
function enemyIn(s: GameState, side: Side, sec: SectionName): boolean {
  return s.units.some((u) => u.side !== side && u.hex >= 0 && sectionsOf(u.hex, side).includes(sec));
}

/**
 * The side of `o.sides` with strictly more units on the hexes, or null (a tie, or the leader is not in `sides`). `at`: see
 * PieceIndex.
 */
export function majorityHolder(s: GameState, o: ObjectiveOf<'majority'>, at?: PieceIndex): Side | null {
  const top = unitsOn(s, o.hexes, 'top', at);
  const bottom = unitsOn(s, o.hexes, 'bottom', at);
  const lead: Side | null = top > bottom ? 'top' : bottom > top ? 'bottom' : null;
  return lead && o.sides.includes(lead) ? lead : null;
}

function setMajority(st: ObjectiveState, o: ObjectiveOf<'majority'>, holder: Side | null) {
  for (const side of SIDES) st.held[side] = side === holder ? o.banners : 0;
}

/**
 * The held banners decided by positions alone (X2 Q9a–c): `hold` (1 per listed hex a unit of the side stands on, at most
 * `max`), `majority` 'always', and the `sectionClear` sections an enemy unit now stands in (lost).
 */
export function refreshHeld(s: GameState): void {
  const { objectives, objState } = s.special;
  for (let i = 0; i < objectives.length; i++) {
    const o = objectives[i];
    const st = objState[i];
    if (o.kind === 'hold') st.held[o.side] = Math.min(o.max, unitsOn(s, o.hexes, o.side));
    else if (o.kind === 'majority' && o.when === 'always') setMajority(st, o, majorityHolder(s, o));
    else if (o.kind === 'sectionClear') {
      st.sections = st.sections.filter((sec) => !enemyIn(s, o.side, sec));
      st.held[o.side] = st.sections.length;
    }
  }
}

/**
 * The held banners decided at the end of `side`'s turn (X2 Q9b–c): every `majority` 'turnEnd' objective goes to the side
 * with more units on its hexes (a tie: nobody), and each `sectionClear` objective of `side` scores every section without
 * an enemy unit.
 */
export function turnEndHeld(s: GameState, side: Side): void {
  const { objectives, objState } = s.special;
  for (let i = 0; i < objectives.length; i++) {
    const o = objectives[i];
    if (o.kind === 'majority' && o.when === 'turnEnd') setMajority(objState[i], o, majorityHolder(s, o));
    else if (o.kind === 'sectionClear' && o.side === side) {
      objState[i].sections = SECTIONS.filter((sec) => !enemyIn(s, side, sec));
      objState[i].held[side] = objState[i].sections.length;
    }
  }
}
