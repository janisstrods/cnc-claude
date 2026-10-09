// Unit type table (rules-reference §2).
import type { Unit, UnitClass, UnitType } from './types';

export type EvadeRule = 'always' | 'vsFootHeavyMounted' | 'vsFootElephant' | 'never';

export interface UnitStats {
  type: UnitType;
  name: string;
  cls: UnitClass;
  /** Symbol drawn with a white border (AX, WA). */
  whiteBorder: boolean;
  foot: boolean;
  mounted: boolean;
  /** Cavalry proper (LC, MC, HC); elephants/chariots are mounted but not cavalry. */
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

/** Ability fields a table row may leave out (it then has none of these abilities). */
type OptionalAbilities = Pick<UnitStats,
  | 'elephantTable' | 'ignoreAllSwords' | 'swordIgnore' | 'frightenedBy' | 'vsMountedIgnoreHit' | 'vsMountedIgnoreFlag'
  | 'momentumExtraHex' | 'fullStrengthBonus' | 'chargeMove' | 'noFireAfterMove' | 'lightFoot' | 'forestFighter' | 'noRally'
  | 'noLeaderBenefit' | 'doubleTimeMove' | 'mountedChargeMove'>;

const noAbilities = (): OptionalAbilities => ({
  elephantTable: false,
  ignoreAllSwords: false,
  swordIgnore: 0,
  frightenedBy: [],
  vsMountedIgnoreHit: null,
  vsMountedIgnoreFlag: false,
  momentumExtraHex: false,
  fullStrengthBonus: false,
  chargeMove: false,
  noFireAfterMove: 99,
  lightFoot: false,
  forestFighter: false,
  noRally: false,
  noLeaderBenefit: false,
  doubleTimeMove: null,
  mountedChargeMove: false,
});

const U = (s: Omit<UnitStats, keyof OptionalAbilities> & Partial<OptionalAbilities>): UnitStats => ({ ...noAbilities(), ...s });

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  LI: U({ type: 'LI', name: 'Light Infantry', cls: 'light', whiteBorder: false, foot: true, mounted: false, cavalry: false, chariot: false, blocks: 4, move: 2, moveBattle: 2, cc: 2, ccBack: 2, range: 2, retreat: 2, swordHits: false, evade: 'always',
    elephantDiceAgainst: 2, lightFoot: true, forestFighter: true }),
  LB: U({ type: 'LB', name: 'Light Bow Infantry', cls: 'light', whiteBorder: false, foot: true, mounted: false, cavalry: false, chariot: false, blocks: 4, move: 2, moveBattle: 2, cc: 2, ccBack: 2, range: 3, retreat: 2, swordHits: false, evade: 'always',
    elephantDiceAgainst: 2, lightFoot: true, forestFighter: true }),
  LS: U({ type: 'LS', name: 'Light Sling Infantry', cls: 'light', whiteBorder: false, foot: true, mounted: false, cavalry: false, chariot: false, blocks: 4, move: 2, moveBattle: 2, cc: 2, ccBack: 2, range: 3, retreat: 2, swordHits: false, evade: 'always',
    elephantDiceAgainst: 2, lightFoot: true, forestFighter: true }),
  AX: U({ type: 'AX', name: 'Auxilia', cls: 'light', whiteBorder: true, foot: true, mounted: false, cavalry: false, chariot: false, blocks: 4, move: 2, moveBattle: 1, cc: 3, ccBack: 3, range: 2, retreat: 1, swordHits: true, evade: 'never',
    elephantDiceAgainst: 3, noFireAfterMove: 2, lightFoot: true, forestFighter: true, doubleTimeMove: 2 }),
  WA: U({ type: 'WA', name: 'Warriors', cls: 'medium', whiteBorder: true, foot: true, mounted: false, cavalry: false, chariot: false, blocks: 4, move: 2, moveBattle: 2, cc: 3, ccBack: 3, range: 0, retreat: 2, swordHits: true, evade: 'never',
    elephantDiceAgainst: 3, fullStrengthBonus: true, chargeMove: true, forestFighter: true, doubleTimeMove: 3 }),
  MI: U({ type: 'MI', name: 'Medium Infantry', cls: 'medium', whiteBorder: false, foot: true, mounted: false, cavalry: false, chariot: false, blocks: 4, move: 1, moveBattle: 1, cc: 4, ccBack: 4, range: 0, retreat: 1, swordHits: true, evade: 'never',
    elephantDiceAgainst: 4, doubleTimeMove: 2 }),
  HI: U({ type: 'HI', name: 'Heavy Infantry', cls: 'heavy', whiteBorder: false, foot: true, mounted: false, cavalry: false, chariot: false, blocks: 4, move: 1, moveBattle: 1, cc: 5, ccBack: 5, range: 0, retreat: 1, swordHits: true, evade: 'never',
    elephantDiceAgainst: 5, doubleTimeMove: 2 }),
  LC: U({ type: 'LC', name: 'Light Cavalry', cls: 'light', whiteBorder: false, foot: false, mounted: true, cavalry: true, chariot: false, blocks: 3, move: 4, moveBattle: 4, cc: 2, ccBack: 2, range: 2, retreat: 4, swordHits: false, evade: 'always',
    elephantDiceAgainst: 2, frightenedBy: ['EL'], momentumExtraHex: true }),
  MC: U({ type: 'MC', name: 'Medium Cavalry', cls: 'medium', whiteBorder: false, foot: false, mounted: true, cavalry: true, chariot: false, blocks: 3, move: 3, moveBattle: 3, cc: 3, ccBack: 3, range: 0, retreat: 3, swordHits: true, evade: 'vsFootHeavyMounted',
    elephantDiceAgainst: 3, frightenedBy: ['EL'], momentumExtraHex: true }),
  HC: U({ type: 'HC', name: 'Heavy Cavalry', cls: 'heavy', whiteBorder: false, foot: false, mounted: true, cavalry: true, chariot: false, blocks: 3, move: 2, moveBattle: 2, cc: 4, ccBack: 4, range: 0, retreat: 2, swordHits: true, evade: 'vsFootElephant',
    elephantDiceAgainst: 4, frightenedBy: ['EL'], momentumExtraHex: true, mountedChargeMove: true }),
  EL: U({ type: 'EL', name: 'Elephants', cls: 'heavy', whiteBorder: false, foot: false, mounted: true, cavalry: false, chariot: false, blocks: 2, move: 2, moveBattle: 2, cc: 0, ccBack: 0, range: 0, retreat: 1, swordHits: true, evade: 'never',
    elephantDiceAgainst: 3, elephantTable: true, ignoreAllSwords: true, vsMountedIgnoreHit: 'heavy', vsMountedIgnoreFlag: true,
    noRally: true, noLeaderBenefit: true, mountedChargeMove: true }),
  HCH: U({ type: 'HCH', name: 'Heavy Chariots', cls: 'heavy', whiteBorder: false, foot: false, mounted: true, cavalry: false, chariot: true, blocks: 2, move: 2, moveBattle: 2, cc: 4, ccBack: 3, range: 0, retreat: 2, swordHits: true, evade: 'vsFootElephant',
    elephantDiceAgainst: 3, swordIgnore: 1, frightenedBy: ['EL'], noRally: true, mountedChargeMove: true }),
};

export const UNIT_TYPES = Object.keys(UNIT_STATS) as UnitType[];

export function stats(t: UnitType): UnitStats {
  return UNIT_STATS[t];
}

/** Elephants roll this many dice against (or battling back against) a unit of type t. */
export function elephantDiceVs(t: UnitType): number {
  return UNIT_STATS[t].elephantDiceAgainst;
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
  return UNIT_STATS[t].forestFighter;
}

/** Normal close-combat dice of a unit (used for leader escape): attacking dice, no terrain, no card bonus. */
export function escapeDice(u: Unit): number {
  const st = UNIT_STATS[u.type];
  if (st.elephantTable) return 1;
  let d = st.cc;
  if (st.fullStrengthBonus && u.blocks === u.maxBlocks) d += 1;
  return d;
}

/** Light foot (LI, LB, LS, AX): may pass through friends with Order Light Troops / Move-Fire-Move. */
export function isLightFoot(u: Unit): boolean {
  return UNIT_STATS[u.type].lightFoot;
}

/** Do `striker`'s flags make `target` retreat +1 hex per flag? */
export function frightens(striker: Unit, target: Unit): boolean {
  return UNIT_STATS[target.type].frightenedBy.includes(striker.type);
}
