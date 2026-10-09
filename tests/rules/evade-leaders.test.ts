// Evade (§9.3), leaders: casualty checks, lone leaders, leader evade & escape (§11).
import { beforeEach, describe, expect, it } from 'vitest';
import { UNIT_STATS, evadeOptions, leaderEvadeOptions, rowOf, type DieFace, type UnitType } from '../../src/engine';
import { H, build, combatDice, ev, forceDice, forcedDiceLeft, leaderId, must, n, rolls, toBattle, u, type Pos } from './helpers';

beforeEach(() => forceDice([]));

function attackOn(atk: UnitType, def: UnitType, extra: Partial<Pos> = {}) {
  const s = build({ ...extra, units: [{ side: 'bottom', type: atk, at: [5, 6] }, { side: 'top', type: def, at: [4, 6] }, ...(extra.units ?? [])] });
  const d = toBattle(s, 'order4C', ['u1']);
  // if the attack resolves immediately (no defend decision), make every die a miss
  const cls = [UNIT_STATS[atk].cls, UNIT_STATS[def].cls];
  forceDice(n((['light', 'medium', 'heavy'] as DieFace[]).find((f) => !cls.includes(f as never))!, 40));
  must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  return d;
}
const canEvade = (atk: UnitType, def: UnitType) => {
  const d = attackOn(atk, def);
  return d.pending?.kind === 'defend' && d.pending.canEvade;
};

describe('evade eligibility', () => {
  it('light units without white border (LI, LB, LS, LC) may always evade', () => {
    for (const def of ['LI', 'LB', 'LS', 'LC'] as UnitType[]) {
      for (const atk of ['HI', 'LC', 'HC', 'EL', 'MC'] as UnitType[]) expect([def, atk, canEvade(atk, def)]).toEqual([def, atk, true]);
    }
  });
  it('medium cavalry evades foot and heavy mounted (HC, EL, HCH) but not LC or MC', () => {
    for (const atk of ['LI', 'AX', 'MI', 'HI', 'WA', 'HC', 'EL', 'HCH'] as UnitType[]) expect([atk, canEvade(atk, 'MC')]).toEqual([atk, true]);
    for (const atk of ['LC', 'MC'] as UnitType[]) expect([atk, canEvade(atk, 'MC')]).toEqual([atk, false]);
  });
  it('heavy cavalry and heavy chariots evade foot and elephants only', () => {
    for (const def of ['HC', 'HCH'] as UnitType[]) {
      for (const atk of ['LI', 'MI', 'HI', 'WA', 'EL'] as UnitType[]) expect([def, atk, canEvade(atk, def)]).toEqual([def, atk, true]);
      for (const atk of ['LC', 'MC', 'HC', 'HCH'] as UnitType[]) expect([def, atk, canEvade(atk, def)]).toEqual([def, atk, false]);
    }
  });
  it('auxilia, medium/heavy infantry, warriors and elephants never evade', () => {
    for (const def of ['AX', 'MI', 'HI', 'WA', 'EL'] as UnitType[]) {
      for (const atk of ['LI', 'HI', 'LC'] as UnitType[]) expect([def, atk, canEvade(atk, def)]).toEqual([def, atk, false]);
    }
  });
  it('no evade if both rear hexes are blocked (units, lone enemy leader, impassable)', () => {
    const d1 = attackOn('HI', 'LI', { units: [{ side: 'top', type: 'MI', at: [3, 5] }, { side: 'bottom', type: 'MI', at: [3, 6] }] });
    expect(d1.pending?.kind === 'defend' && d1.pending.canEvade).toBe(false);
    const d2 = attackOn('HI', 'LI', { leaders: [{ side: 'bottom', at: [3, 5] }], terrain: [{ at: [3, 6], t: 'lake' }] });
    expect(d2.pending?.kind === 'defend' && d2.pending.canEvade).toBe(false);
  });
  it('no evade from the own baseline (board edge)', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [1, 6] }, { side: 'top', type: 'LI', at: [0, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    must(d, { kind: 'attack', unit: 'u1', target: H(0, 6) });
    expect(d.pending?.kind === 'defend' && d.pending.canEvade).toBe(false);
  });
});

describe('evade resolution', () => {
  function evade(atk: UnitType, def: UnitType, dice: DieFace[], extra: Partial<Pos> = {}) {
    const d = attackOn(atk, def, extra);
    expect(d.pending).toMatchObject({ kind: 'defend', canEvade: true });
    ev(d);
    forceDice(dice);
    must(d, { kind: 'defend', choice: 'evade' });
    return d;
  }
  it('attacker rolls its normal dice; only matching class symbols hit (swords, helmets, flags ignored)', () => {
    const d = evade('HI', 'LI', ['light', 'swords', 'leader', 'flag', 'heavy'], { leaders: [{ side: 'bottom', at: [5, 6] }] });
    const e = ev(d);
    expect(combatDice(e, 'evade')).toBe(5);
    expect(u(d, 'u2')!.blocks).toBe(3);
  });
  it('the evader moves 2 hexes toward its own side; no battle back, no momentum advance', () => {
    const d = evade('HI', 'LI', n('medium', 5));
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(rowOf(u(d, 'u2')!.hex)).toBe(2);
    expect(u(d, 'u1')!.hex).toBe(H(5, 6));
    expect(forcedDiceLeft()).toBe(0);
    expect(d.pending?.kind).toBe('playCard'); // no momentum decision
  });
  it('an evader eliminated by the evade roll gives a banner, but no momentum advance', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'LI', at: [4, 6], blocks: 2 }] });
    const d2 = toBattle(s, 'order4C', ['u1']);
    must(d2, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    forceDice(['light', 'light', 'medium', 'medium', 'medium']);
    must(d2, { kind: 'defend', choice: 'evade' });
    expect(u(d2, 'u2')).toBeUndefined();
    expect(d2.state.players.bottom.banners).toBe(1);
    expect(d2.pending?.kind).toBe('playCard');
    expect(u(d2, 'u1')!.hex).toBe(H(5, 6));
  });
  it('evade is 1 hex only when that is the only possibility', () => {
    const s = build({ units: [{ side: 'top', type: 'LI', at: [4, 6] }, { side: 'top', type: 'MI', at: [2, 5] }, { side: 'top', type: 'MI', at: [2, 6] }, { side: 'top', type: 'MI', at: [2, 7] }] });
    expect(evadeOptions(s, s.units[0]).map((o) => o.path.length)).toEqual([1, 1]);
    const s2 = build({ units: [{ side: 'top', type: 'LI', at: [4, 6] }, { side: 'top', type: 'MI', at: [2, 5] }, { side: 'top', type: 'MI', at: [2, 6] }] });
    const o2 = evadeOptions(s2, s2.units[0]);
    expect(o2.every((o) => o.path.length === 2)).toBe(true);
    expect(o2.map((o) => o.end)).toEqual([H(2, 7)]);
  });
  it('evading next to the own baseline: 1 hex', () => {
    const s = build({ units: [{ side: 'top', type: 'LC', at: [1, 6] }] });
    const o = evadeOptions(s, s.units[0]);
    expect(o.length).toBeGreaterThan(0);
    expect(o.every((x) => x.path.length === 1)).toBe(true);
  });
  it('an evader entering a lone friendly leader hex stops there and the leader attaches', () => {
    const d = evade('HI', 'LI', n('medium', 5), { leaders: [{ side: 'top', at: [3, 5] }], units: [{ side: 'bottom', type: 'MI', at: [3, 6] }] });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(u(d, 'u2')!.hex).toBe(H(3, 5));
    expect(d.state.leaders[0].hex).toBe(H(3, 5));
  });
  it('an evader with an attached leader that takes a hit makes a 2-dice leader check', () => {
    const d = evade('HI', 'LI', ['light', ...n('medium', 4), 'leader', 'leader'], { leaders: [{ side: 'top', at: [4, 6] }] });
    expect(d.state.leaders).toHaveLength(0);
    expect(d.state.players.bottom.banners).toBe(1);
  });
  it('evading through a marsh hex rolls the marsh check', () => {
    const d = evade('HI', 'LI', [...n('medium', 5), 'light'], {
      terrain: [{ at: [3, 5], t: 'marsh' }], units: [{ side: 'bottom', type: 'MI', at: [3, 6] }],
    });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(u(d, 'u2')!.blocks).toBe(3);
    expect(forcedDiceLeft()).toBe(0);
  });
  it('an elephant does not re-roll swords against an evading unit', () => {
    const d = evade('EL', 'LI', ['swords', 'swords']);
    expect(forcedDiceLeft()).toBe(0);
    expect(u(d, 'u2')!.blocks).toBe(4);
  });
  it('the evade roll uses the terrain-capped dice (defender in forest: 2)', () => {
    const d2 = attackOn('HI', 'LI', { terrain: [{ at: [4, 6], t: 'forest' }] });
    ev(d2);
    forceDice(n('medium', 5));
    must(d2, { kind: 'defend', choice: 'evade' });
    expect(combatDice(ev(d2), 'evade')).toBe(2);
  });
});

describe('leader casualty checks', () => {
  /** Bottom HI attacks a top MI (blocks b) with an attached top leader. */
  function hitLeaderUnit(b: number, dice: DieFace[], extra: Partial<Pos> = {}) {
    const s = build({
      ...extra,
      units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: b }, ...(extra.units ?? [])],
      leaders: [{ side: 'top', at: [4, 6] }, ...(extra.leaders ?? [])],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(dice);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    return d;
  }
  it('unit loses blocks but survives: 2 dice, needs 2 helmets (1 helmet: survives)', () => {
    const d = hitLeaderUnit(4, ['medium', ...n('light', 4), 'leader', 'light', ...n('light', 4)]);
    expect(d.state.leaders).toHaveLength(1);
    expect(rolls(ev(d), 'leaderCheck')).toEqual([['leader', 'light']]);
  });
  it('no casualty check when the unit only takes flags and retreats normally', () => {
    const d = hitLeaderUnit(4, ['flag', ...n('light', 4)]);
    must(d, { kind: 'ignoreFlags', count: 0 });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(rolls(ev(d), 'leaderCheck')).toEqual([]);
  });
  it('flags only but a blocked retreat costs blocks: one 2-dice check', () => {
    const d = hitLeaderUnit(4, ['flag', ...n('light', 4), 'light', 'light', ...n('light', 4)], {
      units: [{ side: 'bottom', type: 'MI', at: [3, 5] }, { side: 'bottom', type: 'MI', at: [3, 6] }],
    });
    must(d, { kind: 'ignoreFlags', count: 0 });
    expect(u(d, 'u2')!.blocks).toBe(3);
    expect(rolls(ev(d), 'leaderCheck')).toHaveLength(1);
    expect(forcedDiceLeft()).toBe(0);
  });
  it('only one check per combat sequence (hits, then blocked retreat losses)', () => {
    const d = hitLeaderUnit(4, ['medium', 'flag', ...n('light', 3), 'light', 'light', ...n('light', 4)], {
      units: [{ side: 'bottom', type: 'MI', at: [3, 5] }, { side: 'bottom', type: 'MI', at: [3, 6] }],
    });
    must(d, { kind: 'ignoreFlags', count: 0 });
    expect(u(d, 'u2')!.blocks).toBe(2);
    expect(rolls(ev(d), 'leaderCheck')).toHaveLength(1);
    expect(forcedDiceLeft()).toBe(0);
  });
  it('attached unit eliminated: 1 die, a helmet kills the leader (2 banners)', () => {
    const d = hitLeaderUnit(1, ['medium', ...n('light', 4), 'leader']);
    expect(d.state.leaders).toHaveLength(0);
    expect(d.state.players.bottom.banners).toBe(2);
  });
  it('attached unit eliminated, no helmet: the leader must evade; then the attacker may advance', () => {
    const d = hitLeaderUnit(1, ['medium', ...n('light', 4), 'flag']);
    expect(d.pending?.kind).toBe('leaderEvade');
    must(d, { kind: 'choose', index: 0 });
    expect(d.state.leaders[0].hex === -1 || rowOf(d.state.leaders[0].hex) < 4).toBe(true);
    expect(d.pending).toMatchObject({ kind: 'momentum', hex: H(4, 6) });
    expect(d.state.players.bottom.banners).toBe(1);
  });
});

describe('lone leaders', () => {
  function attackLone(dice: DieFace[], extra: Partial<Pos> = {}, atk: UnitType = 'HI') {
    const s = build({ ...extra, units: [{ side: 'bottom', type: atk, at: [5, 6] }, ...(extra.units ?? [])], leaders: [{ side: 'top', at: [4, 6] }, ...(extra.leaders ?? [])] });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(dice);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    return d;
  }
  it('attacked in close combat: normal dice, one helmet kills (banner); no momentum advance', () => {
    const d = attackLone(['leader', ...n('flag', 4)]);
    expect(combatDice(ev(d), 'close')).toBe(5);
    expect(d.state.leaders).toHaveLength(0);
    expect(d.state.players.bottom.banners).toBe(1);
    expect(d.pending?.kind).toBe('playCard');
  });
  it('flags have no effect on a lone leader; not hit he must evade; no momentum and no battle back', () => {
    const d = attackLone(n('flag', 5));
    expect(d.pending?.kind).toBe('leaderEvade');
    must(d, { kind: 'choose', index: 0 });
    expect(d.pending?.kind).toBe('playCard');
    expect(u(d, 'u1')!.hex).toBe(H(5, 6));
    expect(d.state.players.bottom.banners).toBe(0);
  });
  it('a leader evades 1-3 hexes toward his own side through friendly pieces, never onto another friendly leader', () => {
    const s = build({
      units: [{ side: 'top', type: 'MI', at: [3, 5] }, { side: 'top', type: 'MI', at: [3, 6] }],
      leaders: [{ side: 'top', at: [4, 6] }, { side: 'top', at: [2, 6] }],
    });
    const o = leaderEvadeOptions(s, s.leaders[0]);
    const ends = o.map((x) => x.end);
    expect(ends).toContain(H(3, 5)); // ends on a friendly unit: attaches
    expect(ends).not.toContain(H(2, 6));
    expect(ends).toContain(H(1, 6)); // 3 hexes through units/leader
    for (const x of o) expect(x.path.length).toBeLessThanOrEqual(3);
    for (const x of o) if (x.end >= 0) expect(rowOf(x.end)).toBeLessThan(4);
  });
  it('a leader on his own baseline may evade off the board: removed without a banner', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [1, 6] }], leaders: [{ side: 'top', at: [0, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(n('flag', 5));
    must(d, { kind: 'attack', unit: 'u1', target: H(0, 6) });
    if (d.pending?.kind === 'leaderEvade') {
      const i = d.pending.options.findIndex((o) => o.offBoard);
      expect(i).toBeGreaterThanOrEqual(0);
      must(d, { kind: 'choose', index: i });
    }
    expect(d.state.leaders).toHaveLength(0);
    expect(d.state.players.bottom.banners).toBe(0);
  });
  it('a leader who cannot evade at all is eliminated (banner)', () => {
    const d = attackLone(n('flag', 5), { terrain: [{ at: [3, 5], t: 'lake' }, { at: [3, 6], t: 'steep' }] });
    expect(d.state.leaders).toHaveLength(0);
    expect(d.state.players.bottom.banners).toBe(1);
  });
  it('escape through an enemy unit: that unit rolls its normal attack dice, a helmet kills', () => {
    const d = attackLone(n('flag', 5), { units: [{ side: 'bottom', type: 'MI', at: [3, 5] }, { side: 'bottom', type: 'MI', at: [3, 6] }] });
    expect(d.pending?.kind).toBe('leaderEvade');
    if (d.pending?.kind !== 'leaderEvade') return;
    expect(d.pending.options.every((o) => (o.escapes?.length ?? 0) === 1)).toBe(true);
    ev(d);
    forceDice(['leader', 'light', 'light', 'light']);
    must(d, { kind: 'choose', index: 0 });
    expect(rolls(ev(d), 'escape')[0]).toHaveLength(4);
    expect(d.state.leaders).toHaveLength(0);
    expect(d.state.players.bottom.banners).toBe(1);
  });
  it('escape dice: full-strength warriors 4, heavy chariot 4, elephant 1 (normal attacking dice)', () => {
    for (const [t, dice] of [['WA', 4], ['HCH', 4], ['EL', 1]] as [UnitType, number][]) {
      const d = attackLone(n('flag', 5), { units: [{ side: 'bottom', type: t, at: [3, 5] }, { side: 'bottom', type: t, at: [3, 6] }] });
      if (d.pending?.kind !== 'leaderEvade') throw new Error('expected leader evade');
      ev(d);
      forceDice(n('flag', 4));
      must(d, { kind: 'choose', index: 0 });
      expect([t, rolls(ev(d), 'escape')[0]?.length]).toEqual([t, dice]);
    }
  });
  it('passing a lone enemy leader during an evade needs no escape roll', () => {
    const s = build({ leaders: [{ side: 'top', at: [4, 6] }, { side: 'bottom', at: [3, 5] }, { side: 'bottom', at: [3, 6] }] });
    const o = leaderEvadeOptions(s, s.leaders[0]);
    expect(o.length).toBeGreaterThan(0);
    expect(o.every((x) => (x.escapes?.length ?? 0) === 0)).toBe(true);
    expect(o.map((x) => x.end)).not.toContain(H(3, 5));
  });
  it('a leader can never end his evade on an enemy unit; three enemy hexes in a row = eliminated', () => {
    const units: Pos['units'] = [];
    for (const [r, c] of [[2, 6], [2, 7], [1, 5], [1, 6], [1, 7], [0, 5], [0, 6], [0, 7], [0, 8]] as [number, number][]) {
      units.push({ side: 'bottom', type: 'MI', at: [r, c] });
    }
    const s = build({ units, leaders: [{ side: 'top', at: [3, 6] }] });
    expect(leaderEvadeOptions(s, s.leaders[0])).toEqual([]);
  });
  it('a leader evading into a marsh hex is eliminated on a helmet', () => {
    const d = attackLone(n('flag', 5), { terrain: [{ at: [3, 5], t: 'marsh' }], units: [{ side: 'top', type: 'MI', at: [3, 6] }] });
    if (d.pending?.kind !== 'leaderEvade') throw new Error('expected leader evade');
    const i = d.pending.options.findIndex((o) => o.path[0] === H(3, 5));
    forceDice(['leader']);
    must(d, { kind: 'choose', index: i });
    expect(d.state.leaders).toHaveLength(0);
    expect(d.state.players.bottom.banners).toBe(1);
  });
  it('a leader alone cannot be ordered to battle', () => {
    const s = build({ units: [{ side: 'top', type: 'MI', at: [4, 6] }], leaders: [{ side: 'bottom', at: [5, 6] }] });
    const L = leaderId(s, 0);
    const d = toBattle(s, 'order4C', [L]);
    expect(d.pending?.kind).not.toBe('battle');
  });
});
