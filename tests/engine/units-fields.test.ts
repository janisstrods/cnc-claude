// Unit ability fields of the base-game unit table (rules-reference §2). These values must reproduce the
// behaviour the engine had when the abilities were literal type checks.
import { describe, expect, it } from 'vitest';
import {
  ELITES, UNIT_STATS, UNIT_TYPES, bonusCombatEligible, canShoot, createGame, eliteHas, elephantDiceVs, escapeDice, frightens, isLightFoot, rangeOf,
  type ScenarioSetup, type Unit, type UnitStats, type UnitType,
} from '../../src/engine';
import { setupOf } from './helpers';

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

  it('bonusCombatEligible: warriors and mounted units always, other foot only with an attached leader', () => {
    for (const t of ['WA', 'MC', 'EL'] as const) {
      expect(bonusCombatEligible(UNIT_STATS[t], false), `${t} without leader`).toBe(true);
      expect(bonusCombatEligible(UNIT_STATS[t], true), `${t} with leader`).toBe(true);
    }
    expect(bonusCombatEligible(UNIT_STATS.HI, false)).toBe(false);
    expect(bonusCombatEligible(UNIT_STATS.HI, true)).toBe(true);
    expect(bonusCombatEligible(UNIT_STATS.LI, false)).toBe(false);
  });

  it('frightens: elephants frighten cavalry and chariots only', () => {
    const frightened = UNIT_TYPES.filter((t) => frightens(unit('EL'), unit(t)));
    expect(frightened.sort()).toEqual(['HC', 'HCH', 'LC', 'MC']);
    for (const t of UNIT_TYPES) {
      if (t !== 'EL') expect(UNIT_TYPES.some((v) => frightens(unit(t), unit(v))), t).toBe(false);
    }
  });
});

describe('elite units', () => {
  it('eliteHas: the Sacred Band has helmetHits and ignoreFlag; plain units and other abilities do not', () => {
    const sb: Unit = { ...unit('HI'), elite: 'carthSacredBand' };
    expect(eliteHas(sb, 'helmetHits')).toBe(true);
    expect(eliteHas(sb, 'ignoreFlag')).toBe(true);
    expect(eliteHas(sb, 'ignoreSword')).toBe(false);
    expect(eliteHas(sb, 'ranged')).toBe(false);
    for (const t of UNIT_TYPES) {
      for (const a of ['helmetHits', 'ignoreFlag', 'ignoreSword', 'ranged'] as const) expect(eliteHas(unit(t), a), `${t}.${a}`).toBe(false);
    }
  });

  it('the Sacred Band preset is a Carthaginian heavy-infantry elite', () => {
    expect(ELITES.carthSacredBand).toMatchObject({ id: 'carthSacredBand', name: 'Sacred Band', abilities: ['helmetHits', 'ignoreFlag'], types: ['HI'] });
  });

  it('rangeOf / canShoot reproduce the base-game range of every unit type (no elite is ranged yet)', () => {
    expect(rangeOf(unit('LI'))).toBe(2);
    for (const t of UNIT_TYPES) {
      expect(rangeOf(unit(t)), t).toBe(UNIT_STATS[t].range);
      expect(canShoot(unit(t)), t).toBe(UNIT_STATS[t].range > 0);
    }
    expect(rangeOf({ ...unit('HI'), elite: 'carthSacredBand' })).toBe(0);
    expect(canShoot({ ...unit('HI'), elite: 'carthSacredBand' })).toBe(false);
  });
});

describe('elite units in a scenario setup', () => {
  const at = (type: UnitType, elite?: ScenarioSetup['units'][number]['elite']): ScenarioSetup => {
    const base = setupOf({ units: [{ side: 'top', type, at: [4, 6] }] });
    return { ...base, units: [{ ...base.units[0], elite }] };
  };

  it('createGame puts the elite on the unit; plain units have none', () => {
    const s = createGame(at('HI', 'carthSacredBand'), 1);
    expect(s.units[0].elite).toBe('carthSacredBand');
    expect(createGame(at('HI'), 1).units[0].elite).toBeUndefined();
    expect('elite' in createGame(at('HI'), 1).units[0]).toBe(false);
  });

  it('createGame rejects an elite on a unit type the preset does not allow', () => {
    expect(() => createGame(at('LI', 'carthSacredBand'), 1)).toThrow(/Sacred Band.*cannot be a LI unit/);
  });
});
