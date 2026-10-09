// Close combat: dice counts (§2, §4), terrain caps, card bonuses, hit scoring (§3).
import { beforeEach, describe, expect, it } from 'vitest';
import { UNIT_STATS, scoreClose, type CardKind, type DieFace, type TerrainType, type UnitClass, type UnitType } from '../../src/engine';
import { H, build, combatDice, ev, forceDice, forcedDiceLeft, must, n, play, toBattle, u, type Pos } from './helpers';

beforeEach(() => forceDice([]));

const CLASSES: UnitClass[] = ['light', 'medium', 'heavy'];
/** A die face that scores nothing against either class (and is not a flag / sword / helmet). */
function miss(a: UnitType, b: UnitType): DieFace {
  const ca = UNIT_STATS[a].cls;
  const cb = UNIT_STATS[b].cls;
  return CLASSES.find((c) => c !== ca && c !== cb)!;
}

interface Duel {
  atk: UnitType;
  def: UnitType;
  atkT?: TerrainType;
  defT?: TerrainType;
  atkFord?: boolean;
  defFord?: boolean;
  card?: CardKind;
  atkBlocks?: number;
  defBlocks?: number;
}

/** Bottom attacker at (5,6) attacks top defender at (4,6); all dice miss. Returns attack / battle-back dice counts. */
function duel(o: Duel): { attack?: number; back?: number } {
  const terrain: Pos['terrain'] = [];
  if (o.atkT) terrain.push({ at: [5, 6], t: o.atkT, ford: o.atkFord });
  if (o.defT) terrain.push({ at: [4, 6], t: o.defT, ford: o.defFord });
  const s = build({
    units: [
      { side: 'bottom', type: o.atk, at: [5, 6], blocks: o.atkBlocks },
      { side: 'top', type: o.def, at: [4, 6], blocks: o.defBlocks },
    ],
    terrain,
  });
  const card = o.card ?? 'order4C';
  const d = play(s, card, card === 'clash' ? undefined : ['u1']);
  if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
  expect(d.pending?.kind).toBe('battle');
  ev(d);
  forceDice(n(miss(o.atk, o.def), 30));
  must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: 'stand' });
  const e = ev(d);
  return { attack: combatDice(e, 'close'), back: combatDice(e, 'battleBack') };
}

describe('base close combat dice per unit type (attacking, open ground)', () => {
  const table: [UnitType, number][] = [
    ['LI', 2], ['LB', 2], ['LS', 2], ['AX', 3], ['WA', 4], ['MI', 4], ['HI', 5],
    ['LC', 2], ['MC', 3], ['HC', 4], ['HCH', 4],
  ];
  for (const [t, dice] of table) {
    it(`${t} attacks with ${dice}${t === 'WA' ? ' (full strength +1)' : ''}`, () => {
      expect(duel({ atk: t, def: 'MI' }).attack).toBe(dice);
    });
  }
  it('damaged warriors attack with 3', () => {
    expect(duel({ atk: 'WA', def: 'MI', atkBlocks: 3 }).attack).toBe(3);
  });
  it('number of blocks does not change dice (1-block heavy infantry still rolls 5)', () => {
    expect(duel({ atk: 'HI', def: 'MI', atkBlocks: 1 }).attack).toBe(5);
  });
  it('heavy chariot battles back with 3, other units battle back with their normal dice', () => {
    expect(duel({ atk: 'MI', def: 'HCH' }).back).toBe(3);
    expect(duel({ atk: 'MI', def: 'HI' }).back).toBe(5);
    expect(duel({ atk: 'MI', def: 'AX' }).back).toBe(3);
    expect(duel({ atk: 'MI', def: 'WA' }).back).toBe(4);
    expect(duel({ atk: 'MI', def: 'WA', defBlocks: 2 }).back).toBe(3);
  });
});

describe('elephant dice table (attack and battle back)', () => {
  const table: [UnitType, number][] = [
    ['LI', 2], ['LB', 2], ['LS', 2], ['LC', 2], ['AX', 3], ['MI', 4], ['HI', 5], ['MC', 3], ['HC', 4], ['EL', 3], ['WA', 3], ['HCH', 3],
  ];
  for (const [t, dice] of table) {
    it(`elephant attacking ${t} rolls ${dice}`, () => {
      expect(duel({ atk: 'EL', def: t }).attack).toBe(dice);
    });
    it(`elephant battling back against ${t} rolls ${dice}`, () => {
      expect(duel({ atk: t, def: 'EL' }).back).toBe(dice);
    });
  }
  it('elephant battle back ignores the attacker\'s bonus dice (full-strength warriors 4 -> elephant 3)', () => {
    const r = duel({ atk: 'WA', def: 'EL' });
    expect(r.attack).toBe(4);
    expect(r.back).toBe(3);
  });
  it('elephant battle back ignores Clash of Shields bonus of the attacker (HI 5+2 -> elephant 5)', () => {
    const r = duel({ atk: 'HI', def: 'EL', card: 'clash' });
    expect(r.attack).toBe(7);
    expect(r.back).toBe(5);
  });
  it('elephant attacking a lone leader rolls 1 die', () => {
    const s = build({ units: [{ side: 'bottom', type: 'EL', at: [5, 6] }], leaders: [{ side: 'top', at: [4, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(['flag', 'flag', 'flag', 'flag']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(combatDice(ev(d), 'close')).toBe(1);
  });
});

describe('terrain caps in close combat', () => {
  it('defender in forest: max 2 both ways', () => {
    expect(duel({ atk: 'HI', def: 'MI', defT: 'forest' })).toEqual({ attack: 2, back: 2 });
  });
  it('attacker in forest: max 2 both ways', () => {
    expect(duel({ atk: 'HI', def: 'MI', atkT: 'forest' })).toEqual({ attack: 2, back: 2 });
  });
  it('marsh (either hex): max 2', () => {
    expect(duel({ atk: 'HI', def: 'MI', defT: 'marsh' })).toEqual({ attack: 2, back: 2 });
    expect(duel({ atk: 'HC', def: 'HI', atkT: 'marsh' })).toEqual({ attack: 2, back: 2 });
  });
  it('fordable river (either hex): max 2', () => {
    expect(duel({ atk: 'HI', def: 'MI', defT: 'river', defFord: true })).toEqual({ attack: 2, back: 2 });
    expect(duel({ atk: 'HI', def: 'MI', atkT: 'river', atkFord: true })).toEqual({ attack: 2, back: 2 });
  });
  it('broken ground (either hex): max 2 for foot and mounted', () => {
    expect(duel({ atk: 'HI', def: 'MI', defT: 'broken' })).toEqual({ attack: 2, back: 2 });
    expect(duel({ atk: 'HC', def: 'MI', atkT: 'broken' })).toEqual({ attack: 2, back: 2 });
  });
  it('attacking uphill: max 2 for any unit; the defender battles back downhill (foot max 3)', () => {
    expect(duel({ atk: 'HI', def: 'MI', defT: 'hill' })).toEqual({ attack: 2, back: 3 });
    expect(duel({ atk: 'HC', def: 'HI', defT: 'hill' })).toEqual({ attack: 2, back: 3 });
  });
  it('mounted defender on a hill battles back downhill with max 2', () => {
    expect(duel({ atk: 'HI', def: 'HC', defT: 'hill' })).toEqual({ attack: 2, back: 2 });
  });
  it('attacking downhill: foot max 3, mounted max 2; defender battles back uphill max 2', () => {
    expect(duel({ atk: 'HI', def: 'MI', atkT: 'hill' })).toEqual({ attack: 3, back: 2 });
    expect(duel({ atk: 'HC', def: 'MI', atkT: 'hill' })).toEqual({ attack: 2, back: 2 });
  });
  it('hill to hill: foot max 3, mounted max 2', () => {
    expect(duel({ atk: 'HI', def: 'MI', atkT: 'hill', defT: 'hill' })).toEqual({ attack: 3, back: 3 });
    expect(duel({ atk: 'HC', def: 'HI', atkT: 'hill', defT: 'hill' })).toEqual({ attack: 2, back: 3 });
  });
  it('a cap above the base dice changes nothing (light infantry downhill still 2)', () => {
    expect(duel({ atk: 'LI', def: 'MI', atkT: 'hill' }).attack).toBe(2);
  });
  it('fortified camp: a unit on a camp rolls 1 fewer die (attacking and battling back)', () => {
    expect(duel({ atk: 'HI', def: 'MI', atkT: 'camp' })).toEqual({ attack: 4, back: 4 });
    expect(duel({ atk: 'MI', def: 'HI', defT: 'camp' })).toEqual({ attack: 4, back: 4 });
  });
  it('camp penalty applies after the terrain cap (camp attacker into forest: 2-1 = 1)', () => {
    expect(duel({ atk: 'HI', def: 'MI', atkT: 'camp', defT: 'forest' }).attack).toBe(1);
  });
});

describe('card bonuses are added after caps and only for the ordered attacker', () => {
  it('Clash of Shields: +2 on top of the forest cap (2+2 = 4); defender battles back without bonus', () => {
    expect(duel({ atk: 'HI', def: 'MI', defT: 'forest', card: 'clash' })).toEqual({ attack: 4, back: 2 });
  });
  it('Clash of Shields on open ground: HI 7', () => {
    expect(duel({ atk: 'HI', def: 'MI', card: 'clash' }).attack).toBe(7);
  });
  it('Mounted Charge: +1 (HC 5 on open ground, 3 into forest)', () => {
    expect(duel({ atk: 'HC', def: 'MI', card: 'mountedCharge' }).attack).toBe(5);
    expect(duel({ atk: 'HC', def: 'MI', defT: 'forest', card: 'mountedCharge' }).attack).toBe(3);
  });
  it('Mounted Charge: elephant gets +1 over its table value', () => {
    expect(duel({ atk: 'EL', def: 'MI', card: 'mountedCharge' }).attack).toBe(5);
  });
  it('camp then card bonus: HI on camp with Clash of Shields = 5-1+2 = 6', () => {
    expect(duel({ atk: 'HI', def: 'MI', atkT: 'camp', card: 'clash' }).attack).toBe(6);
  });
});

describe('hit scoring in close combat', () => {
  const s = build({
    units: [
      { side: 'bottom', type: 'LI', at: [5, 2] }, // u1
      { side: 'bottom', type: 'LB', at: [5, 4] }, // u2
      { side: 'bottom', type: 'LS', at: [5, 6] }, // u3
      { side: 'bottom', type: 'LC', at: [5, 8] }, // u4
      { side: 'bottom', type: 'AX', at: [5, 10] }, // u5
      { side: 'top', type: 'MI', at: [3, 2] }, // u6
      { side: 'top', type: 'HCH', at: [3, 6] }, // u7
      { side: 'top', type: 'EL', at: [3, 10] }, // u8
      { side: 'bottom', type: 'HI', at: [7, 2] }, // u9
      { side: 'bottom', type: 'HC', at: [7, 6] }, // u10
      { side: 'bottom', type: 'HCH', at: [7, 10] }, // u11
      { side: 'top', type: 'HI', at: [1, 2] }, // u12 on camp
      { side: 'top', type: 'HC', at: [1, 6] }, // u13 on camp
    ],
    terrain: [{ at: [1, 2], t: 'camp' }, { at: [1, 6], t: 'camp' }],
  });
  const U = (id: string) => s.units.find((x) => x.id === id)!;
  it('light units without white border (LI, LB, LS, LC) never hit with swords; auxilia do', () => {
    for (const id of ['u1', 'u2', 'u3', 'u4']) expect(scoreClose(s, U(id), U('u6'), ['swords', 'swords'], false).hits).toBe(0);
    expect(scoreClose(s, U('u5'), U('u6'), ['swords', 'swords'], false).hits).toBe(2);
  });
  it('class symbol hits regardless of white border; non-matching symbols miss', () => {
    expect(scoreClose(s, U('u9'), U('u6'), ['medium', 'light', 'heavy'], false).hits).toBe(1);
  });
  it('helmets hit only with a friendly leader attached/adjacent', () => {
    expect(scoreClose(s, U('u9'), U('u6'), ['leader', 'leader'], false).hits).toBe(0);
    expect(scoreClose(s, U('u9'), U('u6'), ['leader', 'leader'], true).hits).toBe(2);
  });
  it('flags never hit; they are counted', () => {
    const r = scoreClose(s, U('u9'), U('u6'), ['flag', 'flag', 'medium'], true);
    expect(r.hits).toBe(1);
    expect(r.flags).toBe(2);
  });
  it('heavy chariot ignores one sword hit', () => {
    expect(scoreClose(s, U('u9'), U('u7'), ['swords', 'swords', 'swords'], false).hits).toBe(2);
  });
  it('foot unit on a fortified camp ignores one sword; mounted unit on a camp does not', () => {
    expect(scoreClose(s, U('u10'), U('u12'), ['swords', 'swords'], false).hits).toBe(1);
    expect(scoreClose(s, U('u9'), U('u13'), ['swords', 'swords'], false).hits).toBe(2);
  });
  it('elephants ignore all sword hits', () => {
    expect(scoreClose(s, U('u9'), U('u8'), ['swords', 'swords', 'heavy'], false).hits).toBe(1);
  });
  it('elephant ignores one red square from cavalry and chariots, not from infantry', () => {
    expect(scoreClose(s, U('u10'), U('u8'), ['heavy', 'heavy'], false).hits).toBe(1);
    expect(scoreClose(s, U('u11'), U('u8'), ['heavy', 'heavy'], false).hits).toBe(1);
    expect(scoreClose(s, U('u9'), U('u8'), ['heavy', 'heavy'], false).hits).toBe(2);
    expect(scoreClose(s, U('u4'), U('u8'), ['heavy'], false).hits).toBe(0); // LC is cavalry
  });
});

describe('hit scoring through the turn flow', () => {
  it('helmets score with an adjacent (not attached) friendly leader', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }],
      leaders: [{ side: 'bottom', at: [5, 7] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['leader', 'leader', 'light', 'light', ...n('light', 5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')!.blocks).toBe(2);
  });
  it('an enemy leader adjacent does not make helmets score', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }],
      leaders: [{ side: 'top', at: [4, 7] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['leader', 'leader', 'light', 'light', ...n('light', 5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')!.blocks).toBe(4);
  });
  it('elephants never score helmets, even with an attached leader', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'EL', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }],
      leaders: [{ side: 'bottom', at: [5, 6] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['leader', 'leader', 'leader', 'leader', ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')!.blocks).toBe(4);
  });
  it('elephant re-rolls each sword hit until no sword; re-rolled flags count', () => {
    const s = build({ units: [{ side: 'bottom', type: 'EL', at: [5, 6] }, { side: 'top', type: 'LI', at: [4, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending?.kind).toBe('defend');
    // 2 dice vs LI: light + swords; sword re-rolled -> swords; re-rolled -> flag. 1+2 hits = 3, 1 flag -> retreat 2
    forceDice(['light', 'swords', 'swords', 'flag']);
    must(d, { kind: 'defend', choice: 'stand' });
    const li = u(d, 'u2')!;
    expect(li.blocks).toBe(1);
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(li.hex === H(2, 5) || li.hex === H(2, 6) || li.hex === H(2, 7)).toBe(true);
    expect(forcedDiceLeft()).toBe(0);
  });
  it('elephant does not re-roll a sword that the target ignores (heavy chariot)', () => {
    const s = build({ units: [{ side: 'bottom', type: 'EL', at: [5, 6] }, { side: 'top', type: 'HCH', at: [4, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    // 3 dice vs HCH: swords (ignored, not re-rolled), swords (hit, re-rolled -> light), light; HCH battles back 3 misses
    forceDice(['swords', 'swords', 'light', 'light', 'light', 'light', 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: 'stand' });
    expect(u(d, 'u2')!.blocks).toBe(1);
    expect(forcedDiceLeft()).toBe(0);
  });
  it('elephant vs elephant: swords are ignored and not re-rolled', () => {
    const s = build({ units: [{ side: 'bottom', type: 'EL', at: [5, 6] }, { side: 'top', type: 'EL', at: [4, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['swords', 'swords', 'swords', 'light', 'light', 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')!.blocks).toBe(2);
    expect(forcedDiceLeft()).toBe(0);
  });
  it('Sacred Band scores helmets without any leader', () => {
    const s = build({
      units: [{ side: 'top', type: 'HI', at: [4, 6], sacredBand: true }, { side: 'bottom', type: 'MI', at: [5, 6] }],
      first: 'top',
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['leader', 'leader', 'light', 'light', 'light', ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
    expect(u(d, 'u2')!.blocks).toBe(2);
  });
});

describe('warriors full-strength bonus across combats', () => {
  it('a full-strength warrior that loses blocks battles back with 4; attacked again the same turn it battles back with 3', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'bottom', type: 'MI', at: [5, 7] }, { side: 'top', type: 'WA', at: [4, 7] },
    ] });
    const d = toBattle(s, 'order4C', ['u1', 'u2']);
    ev(d);
    forceDice(['medium', ...n('light', 4), ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 7) });
    expect(u(d, 'u3')!.blocks).toBe(3);
    expect(combatDice(ev(d), 'battleBack')).toBe(4);
    forceDice([...n('light', 4), ...n('light', 3)]);
    must(d, { kind: 'attack', unit: 'u2', target: H(4, 7) });
    expect(combatDice(ev(d), 'battleBack')).toBe(3);
  });
});

describe('elephant against a foot unit on a fortified camp (official example)', () => {
  it('the first sword is ignored and not re-rolled; the second sword hits and is re-rolled', () => {
    const s = build({ units: [{ side: 'bottom', type: 'EL', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }], terrain: [{ at: [4, 6], t: 'camp' }] });
    const d = toBattle(s, 'order4C', ['u1']);
    // EL vs MI: 4 dice -> swords (ignored), swords (hit, re-roll -> medium hit), light, light; MI battles back with 4-1 = 3
    forceDice(['swords', 'swords', 'light', 'light', 'medium', ...n('light', 3)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')!.blocks).toBe(2);
    expect(forcedDiceLeft()).toBe(0);
  });
});

