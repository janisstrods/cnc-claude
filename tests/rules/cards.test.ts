// Command cards (rules-reference §6, §12).
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CARD_LIST, closeCombatDice, orderLimit, pieceMoves, sectionsOf, validateOrders, type CardKind, type Side,
} from '../../src/engine';
import { H, build, combatDice, ev, forceDice, forcedDiceLeft, giveCard, leaderId, must, n, noFirstStrike, play, u, type Pos } from './helpers';
import { GameDriver } from '../../src/engine';

beforeEach(() => forceDice([]));

describe('deck composition (60 cards)', () => {
  const expected: Record<CardKind, number> = {
    order2L: 3, order2C: 4, order2R: 3, order3L: 3, order3C: 4, order3R: 3, order4L: 1, order4C: 1, order4R: 1,
    outFlanked: 2, coordinated: 2, orderLight: 4, orderMedium: 3, orderHeavy: 2, orderMounted: 1,
    inspiredL: 1, inspiredC: 1, inspiredR: 1, leadershipAny: 3,
    clash: 1, counterAttack: 2, darken: 1, doubleTime: 2, firstStrike: 1, spartacus: 1, lineCommand: 4, mountedCharge: 2,
    moveFireMove: 2, rally: 1,
  };
  it('has exactly the listed counts', () => {
    expect(CARD_LIST).toHaveLength(60);
    const counts: Record<string, number> = {};
    for (const k of CARD_LIST) counts[k] = (counts[k] ?? 0) + 1;
    expect(counts).toEqual(expected);
  });
  it('group sizes: 27 section, 10 troop, 6 leadership, 17 tactic', () => {
    const g = (ks: CardKind[]) => CARD_LIST.filter((k) => ks.includes(k)).length;
    expect(g(['order2L', 'order2C', 'order2R', 'order3L', 'order3C', 'order3R', 'order4L', 'order4C', 'order4R', 'outFlanked', 'coordinated'])).toBe(27);
    expect(g(['orderLight', 'orderMedium', 'orderHeavy', 'orderMounted'])).toBe(10);
    expect(g(['inspiredL', 'inspiredC', 'inspiredR', 'leadershipAny'])).toBe(6);
    expect(g(['clash', 'counterAttack', 'darken', 'doubleTime', 'firstStrike', 'spartacus', 'lineCommand', 'mountedCharge', 'moveFireMove', 'rally'])).toBe(17);
  });
});

describe('sections', () => {
  it('bottom player: left x2<=8, centre 8..16, right >=16; dotted hexes in two sections', () => {
    expect(sectionsOf(H(6, 3), 'bottom')).toEqual(['left']);
    expect(sectionsOf(H(6, 4), 'bottom')).toEqual(['left', 'center']);
    expect(sectionsOf(H(7, 3), 'bottom')).toEqual(['left']);
    expect(sectionsOf(H(7, 4), 'bottom')).toEqual(['center']);
    expect(sectionsOf(H(7, 7), 'bottom')).toEqual(['center']);
    expect(sectionsOf(H(6, 8), 'bottom')).toEqual(['center', 'right']);
    expect(sectionsOf(H(7, 8), 'bottom')).toEqual(['right']);
  });
  it("top player's left is the bottom player's right", () => {
    expect(sectionsOf(H(2, 11), 'top')).toEqual(['left']);
    expect(sectionsOf(H(2, 1), 'top')).toEqual(['right']);
    expect(sectionsOf(H(2, 8), 'top')).toEqual(['left', 'center']);
  });
});

describe('section cards', () => {
  const s = build({
    units: [
      { side: 'bottom', type: 'MI', at: [6, 0] }, { side: 'bottom', type: 'MI', at: [6, 1] }, { side: 'bottom', type: 'MI', at: [6, 2] },
      { side: 'bottom', type: 'MI', at: [6, 3] }, { side: 'bottom', type: 'MI', at: [6, 4] }, // u5 dotted L/C
      { side: 'bottom', type: 'MI', at: [6, 5] }, { side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [6, 7] },
      { side: 'bottom', type: 'MI', at: [6, 8] }, // u9 dotted C/R
      { side: 'bottom', type: 'MI', at: [6, 9] }, { side: 'bottom', type: 'MI', at: [6, 10] }, { side: 'bottom', type: 'MI', at: [6, 11] },
      { side: 'bottom', type: 'MI', at: [6, 12] },
    ],
    leaders: [{ side: 'bottom', at: [7, 1] }],
  });
  const v = (k: CardKind, ids: string[]) => validateOrders(s, 'bottom', k, ids);
  it('Order Two/Three/Four Units: that many in the named section', () => {
    expect(v('order2L', ['u1', 'u2'])).toBeNull();
    expect(v('order2L', ['u1', 'u2', 'u3'])).not.toBeNull();
    expect(v('order3L', ['u1', 'u2', 'u3'])).toBeNull();
    expect(v('order3L', ['u1', 'u2', 'u3', 'u4'])).not.toBeNull();
    expect(v('order4L', ['u1', 'u2', 'u3', 'u4'])).toBeNull();
    expect(v('order4L', ['u1', 'u2', 'u3', 'u4', 'u5'])).not.toBeNull();
    expect(v('order2C', ['u6', 'u7'])).toBeNull();
    expect(v('order2C', ['u1'])).not.toBeNull();
    expect(v('order3R', ['u10', 'u11', 'u12'])).toBeNull();
  });
  it('dotted-line hexes may be ordered from either section', () => {
    expect(v('order2L', ['u5', 'u1'])).toBeNull();
    expect(v('order2C', ['u5', 'u9'])).toBeNull();
    expect(v('order2R', ['u9', 'u13'])).toBeNull();
  });
  it('fewer pieces than orders is fine (extra orders are lost)', () => {
    expect(v('order4C', ['u6'])).toBeNull();
  });
  it('Out Flanked: 2 left + 2 right, not 3 in one section, none in the centre', () => {
    expect(v('outFlanked', ['u1', 'u2', 'u12', 'u13'])).toBeNull();
    expect(v('outFlanked', ['u1', 'u2', 'u3'])).not.toBeNull();
    expect(v('outFlanked', ['u7'])).not.toBeNull();
    expect(v('outFlanked', ['u5', 'u1', 'u9', 'u13'])).toBeNull(); // dotted hexes count for left / right
  });
  it('Coordinated Attack: one in each section', () => {
    expect(v('coordinated', ['u1', 'u7', 'u13'])).toBeNull();
    expect(v('coordinated', ['u1', 'u2'])).not.toBeNull();
    expect(v('coordinated', ['u5', 'u9', 'u13'])).toBeNull(); // u5 as left or centre, u9 as centre
  });
  it('section cards may order leaders; a leader costs one order in his section', () => {
    const L = leaderId(s, 0);
    expect(v('order2L', [L, 'u1'])).toBeNull();
    expect(v('order2L', [L, 'u1', 'u2'])).not.toBeNull();
    expect(v('order2C', [L])).not.toBeNull();
  });
  it('the top player uses his own sections', () => {
    const t = build({ units: [{ side: 'top', type: 'MI', at: [2, 11] }, { side: 'top', type: 'MI', at: [2, 1] }] });
    expect(validateOrders(t, 'top', 'order2L', ['u1'])).toBeNull();
    expect(validateOrders(t, 'top', 'order2L', ['u2'])).not.toBeNull();
    expect(validateOrders(t, 'top', 'order2R', ['u2'])).toBeNull();
  });
});

describe('troop cards', () => {
  const all = build({
    units: [
      { side: 'bottom', type: 'LI', at: [6, 0] }, { side: 'bottom', type: 'LB', at: [6, 1] }, { side: 'bottom', type: 'LS', at: [6, 2] },
      { side: 'bottom', type: 'AX', at: [6, 3] }, { side: 'bottom', type: 'LC', at: [6, 4] }, { side: 'bottom', type: 'WA', at: [6, 5] },
      { side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'bottom', type: 'MC', at: [6, 7] }, { side: 'bottom', type: 'HI', at: [6, 8] },
      { side: 'bottom', type: 'HC', at: [6, 9] }, { side: 'bottom', type: 'EL', at: [6, 10] }, { side: 'bottom', type: 'HCH', at: [6, 11] },
    ],
    leaders: [{ side: 'bottom', at: [7, 1] }],
  });
  const v = (k: CardKind, ids: string[]) => validateOrders(all, 'bottom', k, ids);
  const ok = (k: CardKind, ids: string[]) => ids.filter((id) => v(k, [id]) === null);
  const every = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9', 'u10', 'u11', 'u12'];
  it('Order Light Troops: LI, LB, LS, AX, LC', () => {
    expect(ok('orderLight', every)).toEqual(['u1', 'u2', 'u3', 'u4', 'u5']);
  });
  it('Order Medium Troops: WA, MI, MC', () => {
    expect(ok('orderMedium', every)).toEqual(['u6', 'u7', 'u8']);
  });
  it('Order Heavy Troops: HI, HC, EL, HCH', () => {
    expect(ok('orderHeavy', every)).toEqual(['u9', 'u10', 'u11', 'u12']);
  });
  it('Order Mounted: LC, MC, HC, EL, HCH and leaders', () => {
    expect(ok('orderMounted', every)).toEqual(['u5', 'u8', 'u10', 'u11', 'u12']);
    expect(v('orderMounted', [leaderId(all, 0)])).toBeNull();
  });
  it('troop cards order at most Command units (5)', () => {
    expect(v('orderLight', ['u1', 'u2', 'u3', 'u4', 'u5'])).toBeNull();
    const six = build({ units: Array.from({ length: 6 }, (_, i) => ({ side: 'bottom' as Side, type: 'LI' as const, at: [6, i * 2] as [number, number] })) });
    expect(validateOrders(six, 'bottom', 'orderLight', ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'])).not.toBeNull();
    const three = build({ cards: 3, units: Array.from({ length: 4 }, (_, i) => ({ side: 'bottom' as Side, type: 'MI' as const, at: [6, i * 2] as [number, number] })) });
    expect(validateOrders(three, 'bottom', 'orderMedium', ['u1', 'u2', 'u3'])).toBeNull();
    expect(validateOrders(three, 'bottom', 'orderMedium', ['u1', 'u2', 'u3', 'u4'])).not.toBeNull();
  });
  it('"1 unit of your choice" only when no unit of that kind is on the board', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 1] }, { side: 'bottom', type: 'LI', at: [6, 4] }], leaders: [{ side: 'bottom', at: [7, 1] }] });
    expect(validateOrders(s, 'bottom', 'orderHeavy', ['u1'])).toBeNull();
    expect(validateOrders(s, 'bottom', 'orderHeavy', ['u1', 'u2'])).not.toBeNull();
    expect(validateOrders(s, 'bottom', 'orderHeavy', [leaderId(s, 0)])).not.toBeNull(); // never a leader
    expect(validateOrders(s, 'bottom', 'orderLight', ['u1'])).not.toBeNull(); // has light units
    expect(validateOrders(s, 'bottom', 'orderMounted', ['u2'])).toBeNull();
    expect(validateOrders(s, 'bottom', 'orderMounted', [leaderId(s, 0)])).not.toBeNull();
  });
  it('Order Mounted may detach an attached leader (he moves alone)', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HC', at: [6, 6] }], leaders: [{ side: 'bottom', at: [6, 6] }] });
    const L = leaderId(s, 0);
    const d = play(s, 'orderMounted', [L]);
    expect(pieceMoves(d.state, L).length).toBeGreaterThan(0);
    must(d, { kind: 'move', piece: L, to: H(6, 3) });
    expect(u(d, 'u1')!.hex).toBe(H(6, 6));
  });
});

describe('leadership cards', () => {
  // leader attached to u1 at (6,2) (left); chain of MI along row 6
  const chain: Pos = {
    units: [
      { side: 'bottom', type: 'MI', at: [6, 2] }, { side: 'bottom', type: 'MI', at: [6, 3] }, { side: 'bottom', type: 'MI', at: [6, 4] },
      { side: 'bottom', type: 'MI', at: [6, 5] }, { side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [6, 7] },
      { side: 'bottom', type: 'MI', at: [8, 11] },
    ],
    leaders: [{ side: 'bottom', at: [6, 2] }, { side: 'bottom', at: [7, 9] }],
  };
  const s = build(chain);
  const L = leaderId(s, 0);
  const v = (k: CardKind, ids: string[]) => validateOrders(s, 'bottom', k, ids);
  it('Inspired Left: leader in the left section, his unit and up to 4 more linked units (chain may leave the section)', () => {
    expect(v('inspiredL', [L, 'u1', 'u2', 'u3', 'u4', 'u5'])).toBeNull();
    expect(v('inspiredL', [L, 'u1', 'u2', 'u3', 'u4', 'u5', 'u6'])).not.toBeNull();
  });
  it('Inspired Centre/Right: the leader must be in the named section', () => {
    expect(v('inspiredC', [L, 'u1', 'u2'])).not.toBeNull();
    expect(v('inspiredR', [L, 'u1'])).not.toBeNull();
  });
  it('Leadership Any Section: up to 3 more linked units', () => {
    expect(v('leadershipAny', [L, 'u1', 'u2', 'u3', 'u4'])).toBeNull();
    expect(v('leadershipAny', [L, 'u1', 'u2', 'u3', 'u4', 'u5'])).not.toBeNull();
  });
  it('the chain must be linked: every ordered unit adjacent to another ordered piece, starting next to the leader', () => {
    expect(v('leadershipAny', [L, 'u1', 'u3'])).not.toBeNull();
    expect(v('leadershipAny', [L, 'u1', 'u7'])).not.toBeNull();
  });
  it('a leader may not detach on a Leadership card (his unit must be part of the order)', () => {
    expect(v('leadershipAny', [L, 'u2'])).not.toBeNull();
  });
  it('a lone leader may command a chain', () => {
    const t = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [6, 7] }], leaders: [{ side: 'bottom', at: [6, 5] }] });
    expect(validateOrders(t, 'bottom', 'leadershipAny', [leaderId(t, 0), 'u1', 'u2'])).toBeNull();
  });
  it('fallback: 1 unit of choice (Inspired: in that section; Any: anywhere)', () => {
    expect(v('inspiredR', ['u7'])).toBeNull();
    expect(v('inspiredR', ['u1'])).not.toBeNull();
    expect(v('leadershipAny', ['u7'])).toBeNull();
    expect(v('leadershipAny', ['u1', 'u7'])).not.toBeNull();
  });
  it('the commanding leader moves with his unit (no separate move)', () => {
    const t = build(chain);
    const d = play(t, 'inspiredL', [leaderId(t, 0), 'u1', 'u2']);
    expect(pieceMoves(d.state, leaderId(t, 0))).toEqual([]);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 2) });
    expect(d.state.leaders[0].hex).toBe(H(5, 2));
  });
});

describe('Line Command and Double Time groups', () => {
  const s = build({ units: [
    { side: 'bottom', type: 'MI', at: [6, 0] }, { side: 'bottom', type: 'MI', at: [6, 1] }, { side: 'bottom', type: 'MI', at: [6, 2] },
    { side: 'bottom', type: 'MI', at: [6, 3] }, { side: 'bottom', type: 'MI', at: [6, 4] }, { side: 'bottom', type: 'MI', at: [6, 5] },
    { side: 'bottom', type: 'HC', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [6, 9] },
  ] });
  const v = (k: CardKind, ids: string[]) => validateOrders(s, 'bottom', k, ids);
  it('Line Command: any number of linked foot units, across sections; no mounted; must be linked', () => {
    expect(v('lineCommand', ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'])).toBeNull();
    expect(v('lineCommand', ['u8'])).toBeNull();
    expect(v('lineCommand', ['u6', 'u7'])).not.toBeNull();
    expect(v('lineCommand', ['u1', 'u3'])).not.toBeNull();
  });
  it('Double Time: at most 4 linked foot units', () => {
    expect(v('doubleTime', ['u1', 'u2', 'u3', 'u4'])).toBeNull();
    expect(v('doubleTime', ['u1', 'u2', 'u3', 'u4', 'u5'])).not.toBeNull();
  });
  it('no foot units: order 1 unit of choice', () => {
    const t = build({ units: [{ side: 'bottom', type: 'HC', at: [6, 6] }, { side: 'bottom', type: 'LC', at: [6, 8] }] });
    expect(validateOrders(t, 'bottom', 'lineCommand', ['u1'])).toBeNull();
    expect(validateOrders(t, 'bottom', 'doubleTime', ['u1', 'u2'])).not.toBeNull();
  });
});

describe('order limits (UI counter)', () => {
  const s = build({
    units: [{ side: 'bottom', type: 'MI', at: [6, 2] }, { side: 'bottom', type: 'MI', at: [6, 3] }, { side: 'bottom', type: 'LI', at: [6, 6] }],
    leaders: [{ side: 'bottom', at: [6, 2] }, { side: 'bottom', at: [7, 5] }],
  });
  const lim = (k: CardKind, ids: string[] = []) => orderLimit(s, 'bottom', k, ids);
  it('section cards: the orders printed on the card', () => {
    expect(lim('order3L')).toBe(3);
    expect(lim('outFlanked')).toBe(4);
    expect(lim('coordinated')).toBe(3);
  });
  it('troop cards: Command, or 1 when no unit of that kind', () => {
    expect(lim('orderLight')).toBe(5);
    expect(lim('orderHeavy')).toBe(1);
  });
  it('groups: Double Time 4, Line Command unbounded', () => {
    expect(lim('doubleTime')).toBe(4);
    expect(lim('lineCommand')).toBeNull();
  });
  it('leadership: unknown until a leader is chosen, then leader + his unit + chain', () => {
    expect(lim('leadershipAny')).toBeNull();
    expect(lim('leadershipAny', [leaderId(s, 0)])).toBe(5);
    expect(lim('leadershipAny', [leaderId(s, 1)])).toBe(4);
    expect(lim('inspiredL', [leaderId(s, 0)])).toBe(6);
    expect(lim('inspiredR', [leaderId(s, 0)])).toBeNull(); // leader outside the named section
  });
});

describe('Clash of Shields', () => {
  it('orders every unit adjacent to an enemy unit (not those next to a lone enemy leader only)', () => {
    const s = build({
      units: [
        { side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'bottom', type: 'MI', at: [5, 2] }, { side: 'bottom', type: 'MI', at: [7, 9] },
        { side: 'top', type: 'MI', at: [4, 6] },
      ],
      leaders: [{ side: 'top', at: [4, 2] }],
    });
    const d = play(s, 'clash');
    expect(Object.keys(d.state.turn.ordered)).toEqual(['u1']);
  });
  it('+2 dice in the initial close combat, not on battle back by the enemy in his own turn', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }] });
    const d = play(s, 'clash');
    expect(closeCombatDice(d.state, d.state.units[0], d.state.units[1], { role: 'attack', fullAtStart: true, ordered: true })).toBe(6);
    expect(closeCombatDice(d.state, d.state.units[1], d.state.units[0], { role: 'back', fullAtStart: true, ordered: false })).toBe(5);
  });
});

describe('Darken the Sky / Mounted Charge / Move-Fire-Move fallbacks', () => {
  it('Darken the Sky with no missile units: order 1 unit of your choice (it may move)', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [6, 2] }] });
    const d = play(s, 'darken', ['u1']);
    expect(Object.keys(d.state.turn.ordered)).toEqual(['u1']);
    expect(pieceMoves(d.state, 'u1').length).toBeGreaterThan(0);
  });
  it('Mounted Charge with no mounted units: order 1 unit of your choice', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [6, 2] }] });
    expect(validateOrders(s, 'bottom', 'mountedCharge', ['u1'])).toBeNull();
    expect(validateOrders(s, 'bottom', 'mountedCharge', ['u1', 'u2'])).not.toBeNull();
  });
  it('Move-Fire-Move: light units up to Command', () => {
    const s = build({ units: [{ side: 'bottom', type: 'LI', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [6, 2] }, { side: 'bottom', type: 'LC', at: [6, 9] }] });
    expect(validateOrders(s, 'bottom', 'moveFireMove', ['u1', 'u3'])).toBeNull();
    expect(validateOrders(s, 'bottom', 'moveFireMove', ['u2'])).not.toBeNull();
  });
});

describe('Rally', () => {
  function rally(p: Pos, faces: Parameters<typeof forceDice>[0]) {
    const s = build(p);
    forceDice(faces);
    return play(s, 'rally');
  }
  const base: Pos = {
    units: [
      { side: 'bottom', type: 'MI', at: [6, 6], blocks: 2 }, // u1 with leader
      { side: 'bottom', type: 'LI', at: [6, 7], blocks: 2 }, // u2 adjacent
      { side: 'bottom', type: 'EL', at: [5, 6], blocks: 1 }, // u3 adjacent, never rallied
      { side: 'bottom', type: 'HCH', at: [5, 5], blocks: 1 }, // u4 adjacent, never rallied
      { side: 'bottom', type: 'HI', at: [6, 2], blocks: 2 }, // u5 far from leaders
      { side: 'bottom', type: 'HI', at: [6, 5] }, // u6 adjacent, full strength
    ],
    leaders: [{ side: 'bottom', at: [6, 6] }],
  };
  it('rolls Command dice and asks for an assignment', () => {
    const d = rally(base, ['medium', 'light', 'heavy', 'flag', 'swords']);
    expect(d.pending).toMatchObject({ kind: 'rally', faces: ['medium', 'light', 'heavy', 'flag', 'swords'] });
  });
  it('class symbols restore a block to a damaged unit of that class in/adjacent to a leader; rallied units are ordered', () => {
    const d = rally(base, ['medium', 'light', 'heavy', 'flag', 'swords']);
    must(d, { kind: 'assign', ids: ['u1', 'u2', null, null, null] });
    expect(u(d, 'u1')!.blocks).toBe(3);
    expect(u(d, 'u2')!.blocks).toBe(3);
    expect(Object.keys(d.state.turn.ordered).sort()).toEqual(['u1', 'u2']);
  });
  it('a symbol must match the class; flags and swords rally nothing', () => {
    const d = rally(base, ['medium', 'light', 'heavy', 'flag', 'swords']);
    expect(d.answer({ kind: 'assign', ids: ['u2', null, null, null, null] })).toBe(false);
    expect(d.answer({ kind: 'assign', ids: [null, null, null, 'u1', null] })).toBe(false);
  });
  it('elephants and heavy chariots may never be rallied; units away from leaders neither', () => {
    const d = rally(base, ['heavy', 'leader', 'leader', 'heavy', 'heavy']);
    expect(d.answer({ kind: 'assign', ids: ['u3', null, null, null, null] })).toBe(false);
    expect(d.answer({ kind: 'assign', ids: [null, 'u4', null, null, null] })).toBe(false);
    expect(d.answer({ kind: 'assign', ids: ['u5', null, null, null, null] })).toBe(false);
  });
  it('helmets rally any class; never above starting strength; several blocks to one unit allowed', () => {
    const d = rally(base, ['leader', 'leader', 'leader', 'flag', 'flag']);
    expect(d.answer({ kind: 'assign', ids: ['u1', 'u1', 'u1', null, null] })).toBe(false);
    must(d, { kind: 'assign', ids: ['u1', 'u1', null, null, null] });
    expect(u(d, 'u1')!.blocks).toBe(4);
  });
  it('a full-strength unit next to a leader is not rallied and not ordered', () => {
    const d = rally(base, ['heavy', 'flag', 'flag', 'flag', 'flag']);
    expect(d.answer({ kind: 'assign', ids: ['u6', null, null, null, null] })).toBe(false);
    must(d, { kind: 'assign', ids: [null, null, null, null, null] });
    expect(Object.keys(d.state.turn.ordered)).toEqual([]);
  });
  it('no leaders: order 1 unit of your choice', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 6], blocks: 2 }] });
    const d = play(s, 'rally', ['u1']);
    expect(Object.keys(d.state.turn.ordered)).toEqual(['u1']);
    expect(u(d, 'u1')!.blocks).toBe(2);
  });
});

describe('I Am Spartacus', () => {
  function sparta(p: Pos, faces: Parameters<typeof forceDice>[0]) {
    const s = build(p);
    forceDice(faces);
    return play(s, 'spartacus');
  }
  const p: Pos = {
    units: [
      { side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'bottom', type: 'LI', at: [6, 2] }, { side: 'bottom', type: 'HC', at: [6, 10] },
      { side: 'top', type: 'HI', at: [4, 6] },
    ],
    leaders: [{ side: 'bottom', at: [6, 10] }],
  };
  it('each class symbol orders one unit of that class; helmets any unit or leader; flags and swords nothing', () => {
    const d = sparta(p, ['medium', 'leader', 'leader', 'flag', 'swords']);
    expect(d.pending?.kind).toBe('spartacus');
    expect(d.answer({ kind: 'assign', ids: ['u2', null, null, null, null] })).toBe(false); // LI is not medium
    expect(d.answer({ kind: 'assign', ids: [null, null, null, 'u2', null] })).toBe(false); // flag orders nothing
    expect(d.answer({ kind: 'assign', ids: ['u1', 'u1', null, null, null] })).toBe(false); // only one order per piece
    must(d, { kind: 'assign', ids: ['u1', 'u2', leaderId(d.state, 0), null, null] });
    expect(Object.keys(d.state.turn.ordered).sort()).toEqual([leaderId(d.state, 0), 'u1', 'u2'].sort());
  });
  it('a helmet may order an attached leader, who may then detach and move alone', () => {
    const d = sparta(p, ['leader', 'flag', 'flag', 'flag', 'flag']);
    const L = leaderId(d.state, 0);
    must(d, { kind: 'assign', ids: [L, null, null, null, null] });
    expect(pieceMoves(d.state, L).length).toBeGreaterThan(0);
  });
  it('ordered units roll 1 extra die in close combat', () => {
    const d = sparta(p, ['medium', 'flag', 'flag', 'flag', 'flag']);
    must(d, { kind: 'assign', ids: ['u1', null, null, null, null] });
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    ev(d);
    forceDice(n('light', 10));
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(combatDice(ev(d), 'close')).toBe(5);
  });
  it('afterwards the deck and discards (incl. this card) are reshuffled before drawing; hands are kept', () => {
    const s = build(p);
    s.discard.push(s.deck.pop()!, s.deck.pop()!, s.deck.pop()!);
    noFirstStrike(s);
    const card = giveCard(s, 'bottom', 'spartacus');
    const topHand = [...s.players.top.hand];
    forceDice(n('flag', 5));
    const d = new GameDriver(s);
    must(d, { kind: 'playCard', card });
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(d.state.discard).toEqual([]);
    expect(d.state.players.top.hand).toEqual(topHand);
    expect(d.state.players.bottom.hand).toHaveLength(5);
    expect(d.state.deck.length + d.state.players.bottom.hand.length + d.state.players.top.hand.length).toBe(60);
  });
});

describe('Counter Attack', () => {
  function afterOpponent(kind: CardKind, pieces: string[], p: Pos) {
    const s = build({ ...p, first: 'bottom' });
    noFirstStrike(s);
    const c1 = giveCard(s, 'bottom', kind);
    const c2 = giveCard(s, 'top', 'counterAttack');
    const d = new GameDriver(s);
    must(d, { kind: 'playCard', card: c1 });
    if (d.pending?.kind === 'orders') must(d, { kind: 'orders', pieces });
    while (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    while (d.pending?.kind === 'battle') must(d, { kind: 'endBattle' });
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    must(d, { kind: 'playCard', card: c2 });
    return d;
  }
  const p: Pos = { units: [{ side: 'bottom', type: 'MI', at: [6, 1] }, { side: 'bottom', type: 'LI', at: [6, 6] }, { side: 'top', type: 'MI', at: [2, 6] }] };
  it('mirrors section cards (left <-> right)', () => {
    expect(afterOpponent('order3L', ['u1'], p).pending).toMatchObject({ kind: 'orders', card: 'order3R', mirrored: true });
    expect(afterOpponent('order2R', [], p).pending).toMatchObject({ kind: 'orders', card: 'order2L' });
    expect(afterOpponent('order3C', [], p).pending).toMatchObject({ kind: 'orders', card: 'order3C' });
  });
  it('mirrors Inspired Leadership; Leadership Any Section stays any section', () => {
    expect(afterOpponent('inspiredL', [], p).pending).toMatchObject({ kind: 'orders', card: 'inspiredR' });
    expect(afterOpponent('leadershipAny', [], p).pending).toMatchObject({ kind: 'orders', card: 'leadershipAny' });
  });
  it('copies troop/tactic cards; the counter-attacker is bound by the "none -> 1 unit" rule himself', () => {
    const d = afterOpponent('orderHeavy', ['u1'], p); // bottom has no heavy -> 1 unit
    expect(d.pending).toMatchObject({ kind: 'orders', card: 'orderHeavy' });
    // top has no heavy units either -> 1 unit of choice
    expect(validateOrders(d.state, 'top', 'orderHeavy', ['u3'])).toBeNull();
  });
  it('cannot copy First Strike (played on the own turn it has no effect; Counter Attack then orders nothing)', () => {
    const d = afterOpponent('firstStrike', [], p);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
  });
});

describe('First Strike', () => {
  function fs(atk: Pos['units'], hits: Parameters<typeof forceDice>[0]) {
    const s = build({ units: atk });
    noFirstStrike(s);
    giveCard(s, 'top', 'firstStrike');
    const card = giveCard(s, 'bottom', 'order4C');
    const d = new GameDriver(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1'] });
    must(d, { kind: 'endMove' });
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending).toMatchObject({ kind: 'defend', canFirstStrike: true });
    ev(d);
    forceDice(hits);
    must(d, { kind: 'defend', choice: 'firstStrike' });
    return d;
  }
  it('the defender battles first with its battle-back dice (heavy chariot: 3)', () => {
    const d = fs([{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HCH', at: [4, 6] }], [...n('light', 3), ...n('light', 4)]);
    const e = ev(d);
    expect(combatDice(e, 'firstStrike')).toBe(3);
    expect(combatDice(e, 'close')).toBe(4);
  });
  it('if the attacker survives in place it attacks normally and the defender does not battle back', () => {
    const d = fs([{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }], [...n('medium', 1), ...n('light', 4), ...n('light', 4), 'medium']);
    expect(u(d, 'u1')!.blocks).toBe(3);
    expect(forcedDiceLeft()).toBe(1); // no battle back roll
    const e = ev(d);
    expect(combatDice(e, 'battleBack')).toBeUndefined();
  });
  it('if the attacker retreats, the attack is over', () => {
    const d = fs([{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }], ['flag', ...n('light', 4), ...n('light', 4)]);
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(u(d, 'u1')!.hex).not.toBe(H(5, 6));
    expect(u(d, 'u2')!.blocks).toBe(4);
    expect(forcedDiceLeft()).toBe(4);
  });
  it('the First Strike unit gets no momentum advance; the attacker that wins does', () => {
    const d = fs([{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }], [...n('light', 4), 'medium', ...n('light', 4)]);
    expect(u(d, 'u2')).toBeUndefined();
    expect(d.pending).toMatchObject({ kind: 'momentum', side: 'bottom' });
  });
  it('the First Strike player draws his replacement card first', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }] });
    noFirstStrike(s);
    giveCard(s, 'top', 'firstStrike');
    const card = giveCard(s, 'bottom', 'order4C');
    const d = new GameDriver(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1'] });
    must(d, { kind: 'endMove' });
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    const deck = [...d.state.deck];
    const first = deck[deck.length - 1];
    const second = deck[deck.length - 2];
    forceDice([...n('light', 5), ...n('light', 4)]);
    must(d, { kind: 'defend', choice: 'firstStrike' });
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(d.state.players.top.hand).toContain(first);
    expect(d.state.players.bottom.hand).toContain(second);
    expect(d.state.players.top.hand).toHaveLength(5);
    expect(d.state.players.bottom.hand).toHaveLength(5);
  });
  it('First Strike played on the own turn has no effect', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [5, 6] }] });
    const d = play(s, 'firstStrike');
    expect(Object.keys(d.state.turn.ordered)).toEqual([]);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
  });
});

describe('more Counter Attack / First Strike', () => {
  it('a Counter Attack may itself be countered (copies the effective card back, mirrored again)', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 1] }, { side: 'top', type: 'MI', at: [2, 6] }] });
    noFirstStrike(s);
    const c1 = giveCard(s, 'bottom', 'order2L');
    const c2 = giveCard(s, 'top', 'counterAttack');
    const d = new GameDriver(s);
    must(d, { kind: 'playCard', card: c1 });
    must(d, { kind: 'orders', pieces: [] });
    must(d, { kind: 'playCard', card: c2 });
    expect(d.pending).toMatchObject({ kind: 'orders', card: 'order2R' });
    must(d, { kind: 'orders', pieces: [] });
    const c3 = giveCard(d.state, 'bottom', 'counterAttack');
    must(d, { kind: 'playCard', card: c3 });
    expect(d.pending).toMatchObject({ kind: 'orders', card: 'order2L' });
  });
  it('First Strike may be played against a bonus close combat', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'HC', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }, { side: 'top', type: 'MI', at: [3, 6] },
    ] });
    noFirstStrike(s);
    giveCard(s, 'top', 'firstStrike');
    const card = giveCard(s, 'bottom', 'order4C');
    const d = new GameDriver(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1'] });
    must(d, { kind: 'endMove' });
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending).toMatchObject({ kind: 'defend', canFirstStrike: true });
    forceDice(['medium', ...n('light', 3)]);
    must(d, { kind: 'defend', choice: 'stand' });
    must(d, { kind: 'yesno', yes: true });
    must(d, { kind: 'hex', hex: null });
    must(d, { kind: 'hex', hex: H(3, 6) });
    expect(d.pending).toMatchObject({ kind: 'defend', canFirstStrike: true });
  });
});

