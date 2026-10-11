// Scenario data is validated when a game is built (spec "Error handling"): unknown ids and impossible positions throw,
// and the error names the scenario. Every shipped scenario passes.
import { describe, expect, it } from 'vitest';
import {
  ARMY_LOOKS, BLOCKS, SPECIAL_RULE_IDS, createGame, type ArmyLook, type Blocks, type ScenarioSetup, type Side, type SpecialRuleId,
  type TerrainType, type UnitType,
} from '../../src/engine';
import { LOOKS, BLOCK_COLORS } from '../../src/art/palettes';
import { SCENARIOS } from '../../src/scenarios';
import { setupOf, type Pos } from './helpers';

/** A legal little battle: a Roman MI and a leader on it, a Carthaginian MI far away. */
const OK: Pos = {
  units: [
    { side: 'bottom', type: 'MI', at: [6, 6] },
    { side: 'top', type: 'MI', at: [2, 6] },
  ],
  leaders: [{ side: 'bottom', name: 'Scipio', at: [6, 6] }],
};
const build = (st: ScenarioSetup) => () => createGame(st, 1);
/** The setup of `OK` with a change. */
const changed = (f: (st: ScenarioSetup) => void, p: Pos = OK): ScenarioSetup => {
  const st = setupOf(p);
  f(st);
  return st;
};

describe('scenario data validation', () => {
  it('the reference position and all 81 shipped scenarios build', () => {
    expect(build(setupOf(OK))).not.toThrow();
    expect(SCENARIOS).toHaveLength(81);
    for (const sc of SCENARIOS) expect(() => createGame(sc.setup, 1), sc.id).not.toThrow();
  });

  it('the id lists are the types: every look and block set has art, and every rule a scenario uses is listed', () => {
    expect([...ARMY_LOOKS].sort()).toEqual(Object.keys(LOOKS).sort());
    expect([...BLOCKS].sort()).toEqual(Object.keys(BLOCK_COLORS).sort());
    for (const sc of SCENARIOS) for (const r of sc.setup.rules) expect(SPECIAL_RULE_IDS, sc.id).toContain(r);
  });

  it('an unknown unit type, on the board or in reserve', () => {
    expect(build(changed((st) => { st.units[1].type = 'XX' as UnitType; }))).toThrow(/^unknown unit type XX at 2,6 \(test\)$/);
    expect(build(changed((st) => { st.units[1].type = 'constructor' as UnitType; }))).toThrow(/unknown unit type constructor/);
    expect(build(changed((st) => { st.reserves = [{ side: 'top', type: 'YY' as UnitType }]; }))).toThrow(/^unknown unit type YY in reserve \(test\)$/);
  });

  it("an unknown terrain type (and 'void', which marks the hexes off the board)", () => {
    for (const t of ['jungle', 'void', 'toString']) {
      expect(build(changed((st) => { st.terrain = [{ r: 4, c: 4, t: t as TerrainType }]; }))).toThrow(new RegExp(`^unknown terrain ${t} at 4,4 \\(test\\)$`));
    }
  });

  it('an unknown special rule', () => {
    expect(build(changed((st) => { st.rules = ['veryHills', 'dragons' as SpecialRuleId]; }))).toThrow(/^unknown special rule dragons \(test\)$/);
  });

  it('a starting Command (`initialCommand`) names sides, each a whole number from 1', () => {
    expect(build(changed((st) => { st.initialCommand = { bottom: 2 }; }))).not.toThrow();
    expect(build(changed((st) => { st.initialCommand = 2 as ScenarioSetup['initialCommand']; }))).toThrow(/^initialCommand must be an object of sides \(test\)$/);
    expect(build(changed((st) => { st.initialCommand = { left: 2 } as ScenarioSetup['initialCommand']; }))).toThrow(/^initialCommand: unknown side left \(test\)$/);
    expect(build(changed((st) => { st.initialCommand = { top: 0 }; }))).toThrow(/^initialCommand: top must be a whole number, 1 or more \(test\)$/);
  });

  it('a Command bonus (009) names a side, banner count, Command, cards to draw and its text', () => {
    const ok = { side: 'bottom' as const, atBanners: 3, command: 6, draw: 2, text: 'Six cards.' };
    const bonus = (b: unknown) => build(changed((st) => { st.commandBonus = b as ScenarioSetup['commandBonus']; }));
    expect(createGame(changed((st) => { st.commandBonus = ok; }), 1).special.commandBonus).toEqual(ok);
    expect(bonus([ok])).toThrow(/^commandBonus must be an object \(test\)$/);
    expect(bonus({ ...ok, side: 'left' })).toThrow(/^commandBonus: unknown side left \(test\)$/);
    expect(bonus({ ...ok, atBanners: 0 })).toThrow(/^commandBonus: atBanners must be a whole number, 1 or more \(test\)$/);
    expect(bonus({ ...ok, command: 2.5 })).toThrow(/^commandBonus: command must be a whole number, 1 or more \(test\)$/);
    expect(bonus({ ...ok, draw: -1 })).toThrow(/^commandBonus: draw must be a whole number, 0 or more \(test\)$/);
    expect(bonus({ ...ok, text: undefined })).toThrow(/^commandBonus: text must be a string \(test\)$/);
  });

  it('a one-army rule names a known side (Fright at First Sight, Tactical Flexibility)', () => {
    expect(build(changed((st) => { st.frightAtFirstSight = 'left' as Side; }))).toThrow(/^frightAtFirstSight: unknown side left \(test\)$/);
    expect(build(changed((st) => { st.tacticalFlexibility = 'roman' as Side; }))).toThrow(/^tacticalFlexibility: unknown side roman \(test\)$/);
  });

  it('the sacred leader (010) must be a leader of the side named', () => {
    expect(createGame(changed((st) => { st.sacredLeader = { side: 'bottom', name: 'Scipio' }; }), 1).special.sacredLeaderId).toBe('L3');
    expect(build(changed((st) => { st.sacredLeader = { side: 'top', name: 'Scipio' }; }))).toThrow(/^sacredLeader Scipio is no leader of the top army \(test\)$/);
    expect(build(changed((st) => { st.sacredLeader = { side: 'bottom', name: 'Publius' }; }))).toThrow(/^sacredLeader Publius is no leader of the bottom army \(test\)$/);
  });

  it('unknown blocks', () => {
    expect(build(changed((st) => { st.top.blocks = 'xyz' as Blocks; }))).toThrow(/^top army: unknown blocks xyz \(test\)$/);
    expect(build(changed((st) => { st.bottom.blocks = 'constructor' as Blocks; }))).toThrow(/^bottom army: unknown blocks constructor \(test\)$/);
  });

  it('an unknown look', () => {
    expect(build(changed((st) => { st.bottom.look = 'klingon' as ArmyLook; }))).toThrow(/^bottom army: unknown look klingon \(test\)$/);
  });

  it('two units on one hex', () => {
    expect(build(changed((st) => { st.units[1].r = 6; }))).toThrow(/^two units on 6,6 \(test\)$/);
  });

  it('two leaders on one hex', () => {
    expect(build(changed((st) => { st.leaders.push({ side: 'bottom', name: 'Laelius', r: 6, c: 6 }); }))).toThrow(/^two leaders on 6,6 \(Laelius\) \(test\)$/);
  });

  it('a leader on an enemy unit (on his own unit or alone he is fine)', () => {
    expect(build(changed((st) => { st.leaders[0].r = 2; }))).toThrow(/^leader Scipio on an enemy unit at 2,6 \(test\)$/);
    expect(build(changed((st) => { st.leaders[0].r = 4; }))).not.toThrow();
  });

  it('a unit (or a leader) on an impassable hex: a river without a ford, lake, sea, steep hills', () => {
    const on = (t: TerrainType, ford?: boolean) => changed((st) => { st.terrain = [{ r: 2, c: 6, t, ford }]; });
    expect(build(on('river'))).toThrow(/^MI unit on impassable river at 2,6 \(test\)$/);
    expect(build(on('river', false))).toThrow(/impassable river/);
    expect(build(on('river', true))).not.toThrow(); // a ford is passable
    for (const t of ['lake', 'sea', 'steep'] as TerrainType[]) expect(build(on(t)), t).toThrow(new RegExp(`^MI unit on impassable ${t} at 2,6 \\(test\\)$`));
    const lone = changed((st) => {
      st.leaders[0].r = 4;
      st.terrain = [{ r: 4, c: 6, t: 'lake' }];
    });
    expect(build(lone)).toThrow(/^leader Scipio on impassable lake at 4,6 \(test\)$/);
  });

  it('a unit on terrain its type may not enter (a war machine on broken ground or marsh)', () => {
    const hwm = (t: TerrainType) => changed((st) => {
      st.units[1].type = 'HWM';
      st.terrain = [{ r: 2, c: 6, t }];
    });
    expect(build(hwm('broken'))).toThrow(/^HWM unit on broken at 2,6, which it may not enter \(test\)$/);
    expect(build(hwm('marsh'))).toThrow(/^HWM unit on marsh at 2,6, which it may not enter \(test\)$/);
    expect(build(hwm('hill'))).not.toThrow();
  });

  it("a ford that is not true, false or 'nocap'", () => {
    const ford = (v: unknown) => changed((st) => { st.terrain = [{ r: 4, c: 4, t: 'river', ford: v as boolean }]; });
    expect(build(ford('yes'))).toThrow(/^ford at 4,4 must be true, false or 'nocap' \(not yes\) \(test\)$/);
    expect(build(ford(1))).toThrow(/ford at 4,4 must be/);
    for (const v of [true, false, undefined, 'nocap']) expect(build(ford(v)), String(v)).not.toThrow();
  });
});
