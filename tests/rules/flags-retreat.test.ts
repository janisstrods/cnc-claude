// Flags, bolster morale, retreats and elephant rampage (rules-reference §10).
import { beforeEach, describe, expect, it } from 'vitest';
import { ignorableFlags, retreatOptions, retreatPerFlag, rowOf, type DieFace, type UnitType } from '../../src/engine';
import { H, build, forceDice, forcedDiceLeft, must, n, toBattle, u, type Pos } from './helpers';

beforeEach(() => forceDice([]));

/** Bottom HI (u1) at (5,6) attacks the top unit (u2) at (4,6) with the given dice. */
function hiAttack(p: Omit<Pos, 'units'> & { def: UnitType; defBlocks?: number; extra?: Pos['units'] }, dice: DieFace[]) {
  const s = build({
    ...p,
    units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: p.def, at: [4, 6], blocks: p.defBlocks }, ...(p.extra ?? [])],
  });
  const d = toBattle(s, 'order4C', ['u1']);
  forceDice(dice);
  must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: 'stand' });
  return d;
}

describe('retreat distance per flag', () => {
  const S = (type: UnitType) => build({ units: [{ side: 'top', type, at: [4, 6] }] }).units[0];
  const table: [UnitType, number][] = [
    ['LI', 2], ['LB', 2], ['LS', 2], ['AX', 1], ['WA', 2], ['MI', 1], ['HI', 1], ['LC', 4], ['MC', 3], ['HC', 2], ['EL', 1], ['HCH', 2],
  ];
  for (const [t, r] of table) {
    it(`${t} retreats ${r} per flag`, () => {
      expect(retreatPerFlag(S(t), S('HI'))).toBe(r);
    });
  }
  it('cavalry and chariots retreat 1 extra hex per flag when the flags were rolled by an elephant', () => {
    expect(retreatPerFlag(S('LC'), S('EL'))).toBe(5);
    expect(retreatPerFlag(S('MC'), S('EL'))).toBe(4);
    expect(retreatPerFlag(S('HC'), S('EL'))).toBe(3);
    expect(retreatPerFlag(S('HCH'), S('EL'))).toBe(3);
    expect(retreatPerFlag(S('MI'), S('EL'))).toBe(1);
    expect(retreatPerFlag(S('EL'), S('EL'))).toBe(1);
  });
  it('auxilia retreat only 1 hex per flag (flow)', () => {
    const d = hiAttack({ def: 'AX' }, ['flag', ...n('medium', 4)]);
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(rowOf(u(d, 'u2')!.hex)).toBe(3);
  });
  it('light cavalry retreats 4 hexes per flag (flow)', () => {
    const d = hiAttack({ def: 'LC' }, ['flag', ...n('medium', 4)]);
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(rowOf(u(d, 'u2')!.hex)).toBe(0);
    expect(u(d, 'u2')!.blocks).toBe(3);
  });
  it('heavy cavalry hit by an elephant flag retreats 3 hexes (flow)', () => {
    const s = build({ units: [{ side: 'bottom', type: 'EL', at: [5, 6] }, { side: 'top', type: 'HC', at: [4, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['flag', 'light', 'light', 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: 'stand' });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(rowOf(u(d, 'u2')!.hex)).toBe(1);
  });
});

describe('bolster morale (ignorable flags)', () => {
  const flag5: DieFace[] = ['flag', ...n('light', 4)];
  it('attached leader: 1', () => {
    const d = hiAttack({ def: 'MI', leaders: [{ side: 'top', at: [4, 6] }] }, flag5);
    expect(d.pending).toMatchObject({ kind: 'ignoreFlags', max: 1 });
  });
  it('two adjacent friendly units: 1; a single supporting unit: none', () => {
    const d = hiAttack({ def: 'MI', extra: [{ side: 'top', type: 'MI', at: [4, 5] }, { side: 'top', type: 'MI', at: [4, 7] }] }, flag5);
    expect(d.pending).toMatchObject({ kind: 'ignoreFlags', max: 1 });
    const d2 = hiAttack({ def: 'MI', extra: [{ side: 'top', type: 'MI', at: [4, 5] }] }, flag5);
    expect(d2.pending?.kind).toBe('retreat');
  });
  it('lone friendly leaders count as support', () => {
    const d = hiAttack({ def: 'MI', leaders: [{ side: 'top', at: [4, 5] }, { side: 'top', at: [4, 7] }] }, flag5);
    expect(d.pending).toMatchObject({ kind: 'ignoreFlags', max: 1 });
  });
  it('enemy units adjacent do not count as support', () => {
    const d = hiAttack({ def: 'MI', extra: [{ side: 'bottom', type: 'MI', at: [4, 5] }, { side: 'bottom', type: 'MI', at: [4, 7] }] }, flag5);
    expect(d.pending?.kind).toBe('retreat');
  });
  it('foot unit on a fortified camp: 1; mounted unit on a camp: none', () => {
    const d = hiAttack({ def: 'MI', terrain: [{ at: [4, 6], t: 'camp' }] }, flag5);
    expect(d.pending).toMatchObject({ kind: 'ignoreFlags', max: 1 });
    const d2 = hiAttack({ def: 'HC', terrain: [{ at: [4, 6], t: 'camp' }] }, ['flag', ...n('light', 4)]);
    expect(d2.pending?.kind).toBe('retreat');
  });
  it('full-strength warriors: 1; damaged warriors: none', () => {
    expect(hiAttack({ def: 'WA' }, flag5).pending).toMatchObject({ kind: 'ignoreFlags', max: 1 });
    expect(hiAttack({ def: 'WA', defBlocks: 3 }, flag5).pending?.kind).toBe('retreat');
  });
  it('warriors at full strength at the start of the combat may still ignore a flag after losing a block in it', () => {
    const d = hiAttack({ def: 'WA' }, ['medium', 'flag', ...n('light', 3)]);
    expect(u(d, 'u2')!.blocks).toBe(3);
    expect(d.pending).toMatchObject({ kind: 'ignoreFlags', max: 1 });
  });
  it('sources stack: attached leader + two supporting units = 2', () => {
    const d = hiAttack({
      def: 'MI', leaders: [{ side: 'top', at: [4, 6] }],
      extra: [{ side: 'top', type: 'MI', at: [4, 5] }, { side: 'top', type: 'MI', at: [4, 7] }],
    }, ['flag', 'flag', ...n('light', 3)]);
    expect(d.pending).toMatchObject({ kind: 'ignoreFlags', flags: 2, max: 2 });
  });
  it('the number of ignorable flags never exceeds the flags rolled', () => {
    const d = hiAttack({
      def: 'MI', leaders: [{ side: 'top', at: [4, 6] }],
      extra: [{ side: 'top', type: 'MI', at: [4, 5] }, { side: 'top', type: 'MI', at: [4, 7] }],
    }, flag5);
    expect(d.pending).toMatchObject({ kind: 'ignoreFlags', flags: 1, max: 1 });
  });
  it('ignoring is optional: accepting the flag means retreating', () => {
    const d = hiAttack({ def: 'MI', leaders: [{ side: 'top', at: [4, 6] }] }, flag5);
    must(d, { kind: 'ignoreFlags', count: 0 });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(rowOf(u(d, 'u2')!.hex)).toBe(3);
    expect(d.state.leaders[0].hex).toBe(u(d, 'u2')!.hex); // attached leader retreats with the unit
  });
  it('ignoring a flag keeps the unit in place and it battles back', () => {
    const d = hiAttack({ def: 'MI', leaders: [{ side: 'top', at: [4, 6] }] }, [...flag5, ...n('light', 4)]);
    must(d, { kind: 'ignoreFlags', count: 1 });
    expect(u(d, 'u2')!.hex).toBe(H(4, 6));
    expect(forcedDiceLeft()).toBe(0); // 4 battle-back dice were rolled
  });
  it('a leader killed by the casualty check gives no bolster', () => {
    const d = hiAttack({ def: 'MI', leaders: [{ side: 'top', at: [4, 6] }] }, ['medium', 'flag', ...n('light', 3), 'leader', 'leader']);
    expect(d.state.leaders).toHaveLength(0);
    expect(d.state.players.bottom.banners).toBe(1);
    expect(d.pending?.kind).toBe('retreat');
  });
  it('a leader surviving the casualty check still bolsters', () => {
    const d = hiAttack({ def: 'MI', leaders: [{ side: 'top', at: [4, 6] }] }, ['medium', 'flag', ...n('light', 3), 'leader', 'flag']);
    expect(d.state.leaders).toHaveLength(1);
    expect(d.pending).toMatchObject({ kind: 'ignoreFlags', max: 1 });
  });
  it('elephants never receive support or leader bolster; versus cavalry/chariots they ignore 1 flag', () => {
    const s = build({
      units: [
        { side: 'top', type: 'EL', at: [4, 6] }, { side: 'top', type: 'MI', at: [4, 5] }, { side: 'top', type: 'MI', at: [4, 7] },
        { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'bottom', type: 'HC', at: [5, 5] }, { side: 'bottom', type: 'HCH', at: [6, 6] },
        { side: 'bottom', type: 'LC', at: [6, 7] },
      ],
      leaders: [{ side: 'top', at: [4, 6] }],
    });
    const [el, , , hi, hc, hch, lc] = s.units;
    const ctx = (striker: typeof hi, kind: 'close' | 'ranged' = 'close') => ({ kind, striker, leaderAlive: true, fullAtStart: true });
    expect(ignorableFlags(s, el, ctx(hi))).toBe(0);
    expect(ignorableFlags(s, el, ctx(hc))).toBe(1);
    expect(ignorableFlags(s, el, ctx(hch))).toBe(1);
    expect(ignorableFlags(s, el, ctx(lc))).toBe(1);
    expect(ignorableFlags(s, el, ctx(lc, 'ranged'))).toBe(0);
  });
  it('Sacred Band ignores 1 flag', () => {
    const d = hiAttack({ def: 'HI' }, flag5);
    expect(d.pending?.kind).toBe('retreat');
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6], sacredBand: true }] });
    const d2 = toBattle(s, 'order4C', ['u1']);
    forceDice(['flag', ...n('light', 4)]);
    must(d2, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d2.pending).toMatchObject({ kind: 'ignoreFlags', max: 1 });
  });
});

describe('retreat paths', () => {
  it('a blocked retreat costs 1 block per hex not retreated; the unit then battles back', () => {
    const d = hiAttack({ def: 'MI', extra: [{ side: 'bottom', type: 'MI', at: [3, 5] }, { side: 'bottom', type: 'MI', at: [3, 6] }] },
      ['flag', ...n('light', 4), ...n('light', 4)]);
    expect(u(d, 'u2')!.blocks).toBe(3);
    expect(u(d, 'u2')!.hex).toBe(H(4, 6));
    expect(forcedDiceLeft()).toBe(0); // battle back rolled
  });
  it('on its own baseline a unit loses 1 block per retreat hex', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [1, 6] }, { side: 'top', type: 'LI', at: [0, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['flag', ...n('medium', 4), ...n('medium', 2)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(0, 6) });
    expect(d.pending?.kind).not.toBe('defend'); // no evade possible from the baseline
    expect(u(d, 'u2')!.blocks).toBe(2);
  });
  it('a retreat that can avoid losses must do so', () => {
    const d = hiAttack({ def: 'LI', extra: [{ side: 'bottom', type: 'MI', at: [2, 5] }, { side: 'bottom', type: 'MI', at: [2, 6] }] },
      ['flag', ...n('medium', 4)]);
    if (d.pending?.kind === 'retreat') {
      expect(d.pending.options.every((o) => o.losses === 0)).toBe(true);
      must(d, { kind: 'choose', index: 0 });
    }
    expect(u(d, 'u2')!.hex).toBe(H(2, 7));
    expect(u(d, 'u2')!.blocks).toBe(4);
  });
  it('a lone friendly leader stops the retreat and attaches', () => {
    const d = hiAttack({ def: 'LI', leaders: [{ side: 'top', at: [3, 5] }], extra: [{ side: 'bottom', type: 'MI', at: [3, 6] }] },
      ['flag', ...n('medium', 4)]);
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: d.pending.options.findIndex((o) => o.end === H(3, 5)) });
    expect(u(d, 'u2')!.hex).toBe(H(3, 5));
    expect(u(d, 'u2')!.blocks).toBe(4);
  });
  it('a lone enemy leader blocks the retreat', () => {
    const d = hiAttack({ def: 'MI', leaders: [{ side: 'bottom', at: [3, 5] }], extra: [{ side: 'bottom', type: 'MI', at: [3, 6] }] },
      ['flag', ...n('light', 4), ...n('light', 4)]);
    expect(u(d, 'u2')!.hex).toBe(H(4, 6));
    expect(u(d, 'u2')!.blocks).toBe(3);
  });
  it('terrain does not stop a retreat (forest passed through)', () => {
    const d = hiAttack({ def: 'LI', terrain: [{ at: [3, 5], t: 'forest' }, { at: [3, 6], t: 'forest' }] }, ['flag', ...n('medium', 4)]);
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(rowOf(u(d, 'u2')!.hex)).toBe(2);
  });
  it('impassable terrain blocks a retreat', () => {
    const d = hiAttack({ def: 'MI', terrain: [{ at: [3, 5], t: 'lake' }, { at: [3, 6], t: 'river' }] }, ['flag', ...n('light', 4), ...n('light', 4)]);
    expect(u(d, 'u2')!.blocks).toBe(3);
  });
  it('a retreat into a marsh hex rolls the marsh check', () => {
    const d = hiAttack({ def: 'MI', terrain: [{ at: [3, 5], t: 'marsh' }], extra: [{ side: 'bottom', type: 'MI', at: [3, 6] }] },
      ['flag', ...n('light', 4), 'medium']);
    expect(u(d, 'u2')!.hex).toBe(H(3, 5));
    expect(u(d, 'u2')!.blocks).toBe(3);
  });
  it('retreats always go toward the own side, never sideways', () => {
    const s = build({ units: [{ side: 'top', type: 'LI', at: [4, 6] }, { side: 'bottom', type: 'MI', at: [3, 5] }, { side: 'bottom', type: 'MI', at: [3, 6] }] });
    const opts = retreatOptions(s, s.units[0], 2);
    expect(opts).toHaveLength(1);
    expect(opts[0].losses).toBe(2);
    expect(opts[0].path).toEqual([]);
  });
});

describe('elephant rampage and retreat', () => {
  it('before retreating, the elephant rolls 2 dice against every adjacent unit (friend and foe, attacker included)', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'EL', at: [4, 6] },
      { side: 'top', type: 'MI', at: [4, 7] }, { side: 'bottom', type: 'LI', at: [5, 5] },
    ] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['flag', ...n('light', 4), ...n('medium', 6)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u3')!.blocks).toBe(2); // medium symbols hit the friendly medium infantry
    expect(u(d, 'u1')!.blocks).toBe(4);
    expect(u(d, 'u4')!.blocks).toBe(4);
    expect(forcedDiceLeft()).toBe(0);
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(rowOf(u(d, 'u2')!.hex)).toBe(3);
  });
  it('rampage: a helmet eliminates an adjacent lone leader (banner)', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'EL', at: [4, 6] }], leaders: [{ side: 'bottom', at: [5, 5] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    // attack: flag + 4 misses; rampage: HI (2 dice), leader (2 dice) - all helmets
    forceDice(['flag', ...n('light', 4), ...n('leader', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.state.leaders).toHaveLength(0);
    expect(d.state.players.top.banners).toBe(1);
  });
  it('elephant retreat blocked by units: the blockers (friend and foe) lose blocks, the elephant does not and battles back', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'EL', at: [4, 6] },
      { side: 'top', type: 'MI', at: [3, 5] }, { side: 'bottom', type: 'MI', at: [3, 6] },
    ] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['flag', ...n('light', 4), ...n('light', 6), ...n('light', 5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')!.hex).toBe(H(4, 6));
    expect(u(d, 'u2')!.blocks).toBe(2);
    expect(u(d, 'u3')!.blocks).toBe(3);
    expect(u(d, 'u4')!.blocks).toBe(3);
    expect(forcedDiceLeft()).toBe(0); // elephant battled back with 5 dice
  });
  it('elephant retreat blocked by the board edge: the elephant loses blocks', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [1, 6] }, { side: 'top', type: 'EL', at: [0, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['flag', ...n('light', 4), ...n('light', 2), ...n('light', 5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(0, 6) });
    expect(u(d, 'u2')!.blocks).toBe(1);
  });
  it('elephant retreat blocked by a lone enemy leader: the leader is removed (banner)', () => {
    const s = build({
      units: [
        { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'EL', at: [4, 6] },
        { side: 'top', type: 'MI', at: [3, 6] }, { side: 'top', type: 'MI', at: [2, 6] },
      ],
      leaders: [{ side: 'bottom', at: [2, 5] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['flag', 'flag', ...n('light', 3), ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(u(d, 'u2')!.hex).toBe(H(3, 5));
    expect(d.state.leaders).toHaveLength(0);
    expect(d.state.players.top.banners).toBe(1);
    expect(u(d, 'u4')!.blocks).toBe(3);
  });
  it('an elephant retreating onto a lone friendly leader stops and the leader attaches', () => {
    const s = build({
      units: [
        { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'EL', at: [4, 6] },
        { side: 'top', type: 'MI', at: [3, 6] }, { side: 'top', type: 'MI', at: [2, 6] },
      ],
      leaders: [{ side: 'top', at: [2, 5] }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['flag', 'flag', ...n('light', 3), ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: d.pending.options.findIndex((o) => o.end === H(2, 5)) });
    expect(u(d, 'u2')!.hex).toBe(H(2, 5));
    expect(u(d, 'u2')!.blocks).toBe(2);
    expect(u(d, 'u4')!.blocks).toBe(4);
    expect(d.state.leaders[0].hex).toBe(H(2, 5));
  });
});
