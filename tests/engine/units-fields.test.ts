// Unit ability fields of the base-game unit table (rules-reference §2). These values must reproduce the
// behaviour the engine had when the abilities were literal type checks.
import { describe, expect, it } from 'vitest';
import {
  UNIT_STATS, UNIT_TYPES, elephantDiceVs, escapeDice, frightens, isLightFoot,
  type Unit, type UnitStats, type UnitType,
} from '../../src/engine';

type AbilityField =
  | 'elephantTable' | 'elephantDiceAgainst' | 'ignoreAllSwords' | 'swordIgnore' | 'frightenedBy' | 'vsMountedIgnoreHit'
  | 'vsMountedIgnoreFlag' | 'momentumExtraHex' | 'fullStrengthBonus' | 'chargeMove' | 'noFireAfterMove' | 'lightFoot'
  | 'forestFighter' | 'noRally' | 'noLeaderBenefit' | 'doubleTimeMove' | 'mountedChargeMove';
type Abilities = Pick<UnitStats, AbilityField>;

const NONE: Omit<Abilities, 'elephantDiceAgainst'> = {
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
};

const EXPECTED: Record<UnitType, Abilities> = {
  LI: { ...NONE, elephantDiceAgainst: 2, lightFoot: true, forestFighter: true },
  LB: { ...NONE, elephantDiceAgainst: 2, lightFoot: true, forestFighter: true },
  LS: { ...NONE, elephantDiceAgainst: 2, lightFoot: true, forestFighter: true },
  AX: { ...NONE, elephantDiceAgainst: 3, noFireAfterMove: 2, lightFoot: true, forestFighter: true, doubleTimeMove: 2 },
  WA: { ...NONE, elephantDiceAgainst: 3, fullStrengthBonus: true, chargeMove: true, forestFighter: true, doubleTimeMove: 3 },
  MI: { ...NONE, elephantDiceAgainst: 4, doubleTimeMove: 2 },
  HI: { ...NONE, elephantDiceAgainst: 5, doubleTimeMove: 2 },
  LC: { ...NONE, elephantDiceAgainst: 2, frightenedBy: ['EL'], momentumExtraHex: true },
  MC: { ...NONE, elephantDiceAgainst: 3, frightenedBy: ['EL'], momentumExtraHex: true },
  HC: { ...NONE, elephantDiceAgainst: 4, frightenedBy: ['EL'], momentumExtraHex: true, mountedChargeMove: true },
  EL: {
    ...NONE, elephantDiceAgainst: 3, elephantTable: true, ignoreAllSwords: true, vsMountedIgnoreHit: 'heavy',
    vsMountedIgnoreFlag: true, noRally: true, noLeaderBenefit: true, mountedChargeMove: true,
  },
  HCH: { ...NONE, elephantDiceAgainst: 3, swordIgnore: 1, frightenedBy: ['EL'], noRally: true, mountedChargeMove: true },
};

function unit(type: UnitType, blocks?: number): Unit {
  const max = UNIT_STATS[type].blocks;
  return { id: 'u1', side: 'bottom', type, hex: 0, blocks: blocks ?? max, maxBlocks: max };
}

describe('unit ability fields (base game)', () => {
  it('the expectations cover every base unit type', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...UNIT_TYPES].sort());
  });

  for (const t of UNIT_TYPES) {
    it(`${t} ability fields`, () => {
      for (const [field, value] of Object.entries(EXPECTED[t])) {
        expect(UNIT_STATS[t][field as AbilityField], `${t}.${field}`).toEqual(value);
      }
    });
  }

  it('elephantDiceVs reads elephantDiceAgainst', () => {
    for (const t of UNIT_TYPES) expect(elephantDiceVs(t), t).toBe(UNIT_STATS[t].elephantDiceAgainst);
  });
});

describe('unit ability helpers', () => {
  it('escapeDice: normal attack dice, elephants 1, full-strength warriors +1', () => {
    expect(escapeDice(unit('EL'))).toBe(1);
    expect(escapeDice(unit('WA'))).toBe(4);
    expect(escapeDice(unit('WA', 3))).toBe(3);
    expect(escapeDice(unit('HI'))).toBe(5);
    expect(escapeDice(unit('HCH'))).toBe(4);
    expect(escapeDice(unit('LC'))).toBe(2);
  });

  it('isLightFoot: LI, LB, LS and AX only', () => {
    const light = UNIT_TYPES.filter((t) => isLightFoot(unit(t)));
    expect(light.sort()).toEqual(['AX', 'LB', 'LI', 'LS']);
  });

  it('frightens: elephants frighten cavalry and chariots only', () => {
    const frightened = UNIT_TYPES.filter((t) => frightens(unit('EL'), unit(t)));
    expect(frightened.sort()).toEqual(['HC', 'HCH', 'LC', 'MC']);
    for (const t of UNIT_TYPES) {
      if (t !== 'EL') expect(UNIT_TYPES.some((v) => frightens(unit(t), unit(v))), t).toBe(false);
    }
  });
});
