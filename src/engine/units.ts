// Unit type table (rules-reference §2).
import type { UnitClass, UnitType } from './types';

export type EvadeRule = 'always' | 'vsFootHeavyMounted' | 'vsFootElephant' | 'never';

export interface UnitStats {
  type: UnitType;
  name: string;
  cls: UnitClass;
  /** Symbol drawn with a white border (AX, WA). */
  whiteBorder: boolean;
  foot: boolean;
  mounted: boolean;
  /** Cavalry proper (LC, MC, HC) - special momentum advance; elephants/chariots are mounted but not cavalry. */
  cavalry: boolean;
  chariot: boolean;
  blocks: number;
  /** Normal maximum movement. */
  move: number;
  /** Maximum hexes it may move and still battle (normal orders). */
  moveBattle: number;
  /** Close combat dice when attacking (EL: 0 = special table). */
  cc: number;
  /** Close combat dice when battling back / First Strike. */
  ccBack: number;
  /** Ranged weapon range in hexes (0 = none). */
  range: number;
  /** Hexes retreated per flag. */
  retreat: number;
  /** Scores hits with sword symbols in close combat. */
  swordHits: boolean;
  evade: EvadeRule;
}

const U = (s: UnitStats) => s;

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  LI: U({ type: 'LI', name: 'Light Infantry', cls: 'light', whiteBorder: false, foot: true, mounted: false, cavalry: false, chariot: false, blocks: 4, move: 2, moveBattle: 2, cc: 2, ccBack: 2, range: 2, retreat: 2, swordHits: false, evade: 'always' }),
  LB: U({ type: 'LB', name: 'Light Bow Infantry', cls: 'light', whiteBorder: false, foot: true, mounted: false, cavalry: false, chariot: false, blocks: 4, move: 2, moveBattle: 2, cc: 2, ccBack: 2, range: 3, retreat: 2, swordHits: false, evade: 'always' }),
  LS: U({ type: 'LS', name: 'Light Sling Infantry', cls: 'light', whiteBorder: false, foot: true, mounted: false, cavalry: false, chariot: false, blocks: 4, move: 2, moveBattle: 2, cc: 2, ccBack: 2, range: 3, retreat: 2, swordHits: false, evade: 'always' }),
  AX: U({ type: 'AX', name: 'Auxilia', cls: 'light', whiteBorder: true, foot: true, mounted: false, cavalry: false, chariot: false, blocks: 4, move: 2, moveBattle: 1, cc: 3, ccBack: 3, range: 2, retreat: 1, swordHits: true, evade: 'never' }),
  WA: U({ type: 'WA', name: 'Warriors', cls: 'medium', whiteBorder: true, foot: true, mounted: false, cavalry: false, chariot: false, blocks: 4, move: 2, moveBattle: 2, cc: 3, ccBack: 3, range: 0, retreat: 2, swordHits: true, evade: 'never' }),
  MI: U({ type: 'MI', name: 'Medium Infantry', cls: 'medium', whiteBorder: false, foot: true, mounted: false, cavalry: false, chariot: false, blocks: 4, move: 1, moveBattle: 1, cc: 4, ccBack: 4, range: 0, retreat: 1, swordHits: true, evade: 'never' }),
  HI: U({ type: 'HI', name: 'Heavy Infantry', cls: 'heavy', whiteBorder: false, foot: true, mounted: false, cavalry: false, chariot: false, blocks: 4, move: 1, moveBattle: 1, cc: 5, ccBack: 5, range: 0, retreat: 1, swordHits: true, evade: 'never' }),
  LC: U({ type: 'LC', name: 'Light Cavalry', cls: 'light', whiteBorder: false, foot: false, mounted: true, cavalry: true, chariot: false, blocks: 3, move: 4, moveBattle: 4, cc: 2, ccBack: 2, range: 2, retreat: 4, swordHits: false, evade: 'always' }),
  MC: U({ type: 'MC', name: 'Medium Cavalry', cls: 'medium', whiteBorder: false, foot: false, mounted: true, cavalry: true, chariot: false, blocks: 3, move: 3, moveBattle: 3, cc: 3, ccBack: 3, range: 0, retreat: 3, swordHits: true, evade: 'vsFootHeavyMounted' }),
  HC: U({ type: 'HC', name: 'Heavy Cavalry', cls: 'heavy', whiteBorder: false, foot: false, mounted: true, cavalry: true, chariot: false, blocks: 3, move: 2, moveBattle: 2, cc: 4, ccBack: 4, range: 0, retreat: 2, swordHits: true, evade: 'vsFootElephant' }),
  EL: U({ type: 'EL', name: 'Elephants', cls: 'heavy', whiteBorder: false, foot: false, mounted: true, cavalry: false, chariot: false, blocks: 2, move: 2, moveBattle: 2, cc: 0, ccBack: 0, range: 0, retreat: 1, swordHits: true, evade: 'never' }),
  HCH: U({ type: 'HCH', name: 'Heavy Chariots', cls: 'heavy', whiteBorder: false, foot: false, mounted: true, cavalry: false, chariot: true, blocks: 2, move: 2, moveBattle: 2, cc: 4, ccBack: 3, range: 0, retreat: 2, swordHits: true, evade: 'vsFootElephant' }),
};

export const UNIT_TYPES = Object.keys(UNIT_STATS) as UnitType[];

export function stats(t: UnitType): UnitStats {
  return UNIT_STATS[t];
}

/** Elephants roll this many dice against (or battling back against) a unit of type t. */
export function elephantDiceVs(t: UnitType): number {
  if (t === 'EL' || t === 'WA' || t === 'HCH') return 3;
  return UNIT_STATS[t].cc;
}

/** Can a unit of type `defender` evade a close combat from `attacker`? */
export function canEvadeType(defender: UnitType, attacker: UnitType): boolean {
  const d = UNIT_STATS[defender];
  const a = UNIT_STATS[attacker];
  switch (d.evade) {
    case 'always':
      return true;
    case 'never':
      return false;
    case 'vsFootHeavyMounted':
      return a.foot || (a.mounted && a.cls === 'heavy');
    case 'vsFootElephant':
      return a.foot || attacker === 'EL';
  }
}

export function hasRanged(t: UnitType): boolean {
  return UNIT_STATS[t].range > 0;
}

/** Units that may battle after moving into a forest. */
export function forestFighter(t: UnitType): boolean {
  return t === 'LI' || t === 'LB' || t === 'LS' || t === 'AX' || t === 'WA';
}
