import { beforeEach, describe, expect, it } from 'vitest';
import {
  CARD_DEFS, CARD_LIST, battleTargets, closeCombatDice, distance, evadeOptions, forceDice, forcedDiceLeft, hexId, ignorableFlags,
  lineOfSight, neighbours, pieceMoves, rangedDice, rearHexes, retreatOptions, scoreClose, sectionsOf, unitMoves, validateOrders,
  leaderEvadeOptions, elephantRetreatOptions,
} from '../../src/engine';
import { H, drive, giveCard, must, noFirstStrike, state } from './helpers';

beforeEach(() => forceDice([]));

describe('hex grid', () => {
  it('neighbours and distance', () => {
    expect(neighbours(H(0, 0)).sort()).toEqual([H(0, 1), H(1, 0)].sort());
    expect(neighbours(H(4, 6))).toHaveLength(6);
    expect(neighbours(H(1, 11))).toHaveLength(5);
    expect(distance(H(0, 0), H(0, 12))).toBe(12);
    expect(distance(H(0, 0), H(8, 0))).toBe(8);
    expect(distance(H(4, 4), H(3, 4))).toBe(1);
    expect(distance(H(4, 4), H(3, 3))).toBe(1);
    expect(distance(H(3, 3), H(4, 4))).toBe(1);
  });
  it('sections from each side, dotted-line hexes in two sections', () => {
    expect(sectionsOf(H(0, 4), 'bottom')).toEqual(['left', 'center']);
    expect(sectionsOf(H(1, 3), 'bottom')).toEqual(['left']);
    expect(sectionsOf(H(1, 4), 'bottom')).toEqual(['center']);
    expect(sectionsOf(H(2, 8), 'bottom')).toEqual(['center', 'right']);
    expect(sectionsOf(H(0, 0), 'top')).toEqual(['right']);
    expect(sectionsOf(H(0, 12), 'top')).toEqual(['left']);
  });
  it('rear hexes toward own side', () => {
    expect(rearHexes(H(4, 4), 'bottom').sort()).toEqual([H(5, 3), H(5, 4)].sort());
    expect(rearHexes(H(4, 4), 'top').sort()).toEqual([H(3, 3), H(3, 4)].sort());
    expect(rearHexes(H(8, 4), 'bottom')).toEqual([]);
    expect(rearHexes(H(4, 0), 'bottom')).toEqual([H(5, 0)]);
  });
});

describe('line of sight', () => {
  it('is blocked by a unit in between, not by the target hex terrain', () => {
    const s = state({
      units: [
        { side: 'bottom', type: 'LB', at: [4, 2] },
        { side: 'top', type: 'MI', at: [4, 5] },
        { side: 'top', type: 'MI', at: [4, 3] },
      ],
      terrain: [{ at: [4, 5], t: 'forest' }],
    });
    expect(lineOfSight(s, H(4, 2), H(4, 5))).toBe(false);
    s.units.pop();
    expect(lineOfSight(s, H(4, 2), H(4, 5))).toBe(true);
  });
  it('along a hexside it is blocked only if both sides are obstructed', () => {
    const s = state({
      units: [
        { side: 'bottom', type: 'LB', at: [4, 4] },
        { side: 'top', type: 'MI', at: [2, 4] },
        { side: 'top', type: 'LI', at: [3, 3] },
      ],
    });
    expect(lineOfSight(s, H(4, 4), H(2, 4))).toBe(true);
    s.units.push({ ...s.units[2], id: 'u99', hex: H(3, 4) });
    expect(lineOfSight(s, H(4, 4), H(2, 4))).toBe(false);
  });
  it('forest and hills block; same hill is a plateau', () => {
    const s = state({
      units: [{ side: 'bottom', type: 'LB', at: [4, 2] }],
      terrain: [{ at: [4, 3], t: 'forest' }],
    });
    expect(lineOfSight(s, H(4, 2), H(4, 4))).toBe(false);
    const h = state({ terrain: [{ at: [4, 2], t: 'hill' }, { at: [4, 3], t: 'hill' }, { at: [4, 4], t: 'hill' }] });
    expect(lineOfSight(h, H(4, 2), H(4, 4))).toBe(true);
    expect(lineOfSight(h, H(4, 1), H(4, 4))).toBe(false);
  });
});

describe('movement', () => {
  it('medium infantry moves 1, light cavalry 4; units block', () => {
    const s = state({ units: [{ side: 'bottom', type: 'MI', at: [4, 4] }, { side: 'bottom', type: 'LC', at: [6, 6] }, { side: 'top', type: 'HI', at: [3, 4] }] });
    s.turn.ordered.u1 = { id: 'u1', isLeader: false, startHex: H(4, 4), moved: 0, moveDone: false, move2Done: false, battlesLeft: 1, canBattle: true, mustBattle: false, enteredHexThisTurn: false, attachedThisTurn: false };
    const mi = unitMoves(s, 'u1');
    expect(mi.map((m) => m.hex)).not.toContain(H(3, 4));
    expect(mi).toHaveLength(5);
    const lc = unitMoves(s, 'u2');
    expect(Math.max(...lc.map((m) => m.dist))).toBe(4);
  });
  it('forest stops movement; non-forest units cannot battle after entering', () => {
    const s = state({ units: [{ side: 'bottom', type: 'LC', at: [6, 6] }, { side: 'bottom', type: 'LI', at: [6, 2] }], terrain: [{ at: [5, 6], t: 'forest' }, { at: [5, 2], t: 'forest' }] });
    const lc = unitMoves(s, 'u1');
    const f = lc.find((m) => m.hex === H(5, 6))!;
    expect(f.canBattle).toBe(false);
    // cannot pass through the forest hex: 4,6 only reachable around it
    expect(lc.find((m) => m.hex === H(4, 6))!.path).not.toContain(H(5, 6));
    const li = unitMoves(s, 'u2');
    expect(li.find((m) => m.hex === H(5, 2))!.canBattle).toBe(true);
  });
  it('impassable river, fordable river stops', () => {
    const s = state({ units: [{ side: 'bottom', type: 'LI', at: [6, 4] }], terrain: [{ at: [5, 3], t: 'river' }, { at: [5, 4], t: 'river', ford: true }] });
    const m = unitMoves(s, 'u1');
    expect(m.map((x) => x.hex)).not.toContain(H(5, 3));
    expect(m.map((x) => x.hex)).toContain(H(5, 4));
    // 4,4 is reachable only around, not through the ford
    const via = m.find((x) => x.hex === H(4, 4));
    if (via) expect(via.path).not.toContain(H(5, 4));
  });
  it('warriors may move 2 only to charge into combat', () => {
    const s = state({ units: [{ side: 'bottom', type: 'WA', at: [6, 4] }, { side: 'top', type: 'MI', at: [3, 4] }] });
    const m = unitMoves(s, 'u1');
    const two = m.filter((x) => x.dist === 2);
    expect(two.length).toBeGreaterThan(0);
    for (const t of two) {
      expect(t.mustBattle).toBe(true);
      expect(distance(t.hex, H(3, 4))).toBe(1);
    }
  });
  it('auxilia moving 2 cannot battle', () => {
    const s = state({ units: [{ side: 'bottom', type: 'AX', at: [6, 4] }] });
    const m = unitMoves(s, 'u1');
    expect(m.filter((x) => x.dist === 2).every((x) => !x.canBattle)).toBe(true);
    expect(m.filter((x) => x.dist === 1).every((x) => x.canBattle)).toBe(true);
  });
});

describe('dice counts', () => {
  it('base dice, forest cap, hills, camp, warriors, elephants', () => {
    const s = state({
      units: [
        { side: 'bottom', type: 'HI', at: [5, 4] }, // u1
        { side: 'top', type: 'LI', at: [4, 4] }, // u2
        { side: 'bottom', type: 'WA', at: [5, 6] }, // u3
        { side: 'top', type: 'MI', at: [4, 6] }, // u4
        { side: 'bottom', type: 'EL', at: [5, 8] }, // u5
        { side: 'top', type: 'HI', at: [4, 8] }, // u6
      ],
    });
    const [hi, li, wa, mi, el, thi] = s.units;
    const o = { role: 'attack' as const, fullAtStart: true, ordered: false };
    expect(closeCombatDice(s, hi, li, o)).toBe(5);
    expect(closeCombatDice(s, wa, mi, o)).toBe(4);
    expect(closeCombatDice(s, wa, mi, { ...o, fullAtStart: false })).toBe(3);
    expect(closeCombatDice(s, el, thi, o)).toBe(5);
    expect(closeCombatDice(s, el, mi, o)).toBe(4);
    s.terrain[H(4, 4)] = 'forest';
    expect(closeCombatDice(s, hi, li, o)).toBe(2);
    s.terrain[H(4, 4)] = 'hill';
    expect(closeCombatDice(s, hi, li, o)).toBe(2); // uphill
    s.terrain[H(5, 4)] = 'hill';
    expect(closeCombatDice(s, hi, li, o)).toBe(3); // hill to hill, foot
    s.terrain[H(4, 4)] = 'plain';
    expect(closeCombatDice(s, hi, li, o)).toBe(3); // downhill foot
    s.terrain[H(5, 4)] = 'camp';
    expect(closeCombatDice(s, hi, li, o)).toBe(4); // camp -1
  });
  it('card bonus is added after the terrain cap', () => {
    const s = state({ units: [{ side: 'bottom', type: 'HI', at: [5, 4] }, { side: 'top', type: 'LI', at: [4, 4] }], terrain: [{ at: [4, 4], t: 'forest' }] });
    s.turn.mods.ccBonus = 2;
    expect(closeCombatDice(s, s.units[0], s.units[1], { role: 'attack', fullAtStart: true, ordered: true })).toBe(4);
    expect(closeCombatDice(s, s.units[0], s.units[1], { role: 'bonus', fullAtStart: true, ordered: true })).toBe(2);
  });
  it('heavy chariots battle back with 3', () => {
    const s = state({ units: [{ side: 'bottom', type: 'HCH', at: [5, 4] }, { side: 'top', type: 'MI', at: [4, 4] }] });
    expect(closeCombatDice(s, s.units[0], s.units[1], { role: 'attack', fullAtStart: true, ordered: false })).toBe(4);
    expect(closeCombatDice(s, s.units[0], s.units[1], { role: 'back', fullAtStart: true, ordered: false })).toBe(3);
  });
  it('ranged: 2 dice standing, 1 after moving, max 1 into forest', () => {
    const s = state({ units: [{ side: 'bottom', type: 'LB', at: [6, 4] }, { side: 'top', type: 'MI', at: [4, 4] }] });
    expect(rangedDice(s, s.units[0], H(4, 4), 0, false)).toBe(2);
    expect(rangedDice(s, s.units[0], H(4, 4), 1, false)).toBe(1);
    s.terrain[H(4, 4)] = 'forest';
    expect(rangedDice(s, s.units[0], H(4, 4), 0, false)).toBe(1);
  });
});

describe('hit scoring', () => {
  it('light units do not hit with swords; heavy infantry does; helmets need a leader', () => {
    const s = state({ units: [{ side: 'bottom', type: 'LI', at: [5, 4] }, { side: 'top', type: 'MI', at: [4, 4] }, { side: 'bottom', type: 'HI', at: [5, 6] }] });
    const faces = ['medium', 'swords', 'leader', 'flag'] as const;
    expect(scoreClose(s, s.units[0], s.units[1], [...faces], false, 'attack').hits).toBe(1);
    expect(scoreClose(s, s.units[2], s.units[1], [...faces], false, 'attack').hits).toBe(2);
    expect(scoreClose(s, s.units[2], s.units[1], [...faces], true, 'attack').hits).toBe(3);
    expect(scoreClose(s, s.units[2], s.units[1], [...faces], true, 'attack').flags).toBe(1);
  });
  it('elephants ignore swords; chariots ignore one sword; elephants ignore one red from cavalry', () => {
    const s = state({ units: [{ side: 'bottom', type: 'HI', at: [5, 4] }, { side: 'top', type: 'EL', at: [4, 4] }, { side: 'top', type: 'HCH', at: [4, 6] }, { side: 'bottom', type: 'HC', at: [5, 8] }] });
    expect(scoreClose(s, s.units[0], s.units[1], ['swords', 'swords', 'heavy'], false, 'attack').hits).toBe(1);
    expect(scoreClose(s, s.units[0], s.units[2], ['swords', 'swords', 'heavy'], false, 'attack').hits).toBe(2);
    expect(scoreClose(s, s.units[3], s.units[1], ['heavy', 'heavy'], false, 'attack').hits).toBe(1);
  });
});

describe('flags', () => {
  it('leader, support, warriors and camp let a unit ignore flags', () => {
    const s = state({
      units: [{ side: 'top', type: 'WA', at: [4, 4] }, { side: 'top', type: 'MI', at: [4, 3] }, { side: 'top', type: 'MI', at: [4, 5] }],
      leaders: [{ side: 'top', at: [4, 4] }],
    });
    expect(ignorableFlags(s, s.units[0], { kind: 'close', striker: null, leaderAlive: true, fullAtStart: true })).toBe(3);
    expect(ignorableFlags(s, s.units[0], { kind: 'close', striker: null, leaderAlive: false, fullAtStart: false })).toBe(1);
  });
});

describe('retreat & evade', () => {
  it('retreat toward own side; blocked hexes cost blocks; lone friendly leader stops it', () => {
    const s = state({ units: [{ side: 'top', type: 'LI', at: [2, 4] }, { side: 'top', type: 'MI', at: [1, 3] }, { side: 'top', type: 'MI', at: [1, 4] }] });
    const o = retreatOptions(s, s.units[0], 2);
    expect(o).toHaveLength(1);
    expect(o[0].losses).toBe(2);
    s.units.splice(1, 1);
    const o2 = retreatOptions(s, s.units[0], 2);
    expect(o2.every((x) => x.losses === 0)).toBe(true);
    expect(o2.map((x) => x.end).sort()).toEqual([H(0, 3), H(0, 4)].sort());
    const t = state({ units: [{ side: 'top', type: 'LI', at: [2, 4] }], leaders: [{ side: 'top', at: [1, 3] }] });
    const o3 = retreatOptions(t, t.units[0], 2);
    expect(o3.find((x) => x.attachLeader)).toBeTruthy();
  });
  it('a unit on its baseline loses a block per hex', () => {
    const s = state({ units: [{ side: 'bottom', type: 'LI', at: [8, 4] }] });
    expect(retreatOptions(s, s.units[0], 2)[0].losses).toBe(2);
  });
  it('evade moves 2 hexes, 1 only when forced', () => {
    const s = state({ units: [{ side: 'top', type: 'LI', at: [2, 4] }, { side: 'top', type: 'MI', at: [0, 3] }, { side: 'top', type: 'MI', at: [0, 4] }, { side: 'top', type: 'MI', at: [0, 5] }] });
    const e = evadeOptions(s, s.units[0]);
    expect(e.every((x) => x.path.length === 1)).toBe(true);
    const free = state({ units: [{ side: 'top', type: 'LI', at: [2, 4] }] });
    expect(evadeOptions(free, free.units[0]).every((x) => x.path.length === 2)).toBe(true);
  });
  it('elephant retreat blocked by units damages the blockers', () => {
    const s = state({ units: [{ side: 'top', type: 'EL', at: [2, 4] }, { side: 'top', type: 'MI', at: [1, 3] }, { side: 'bottom', type: 'MI', at: [1, 4] }] });
    const o = elephantRetreatOptions(s, s.units[0], 1);
    expect(o[0].blockers.map((b) => b.id).sort()).toEqual(['u2', 'u3']);
    expect(o[0].losses).toBe(0);
  });
  it('leader evade can leave the board from his baseline and escape through enemies', () => {
    const s = state({ leaders: [{ side: 'bottom', at: [8, 4] }] });
    expect(leaderEvadeOptions(s, s.leaders[0]).some((o) => o.offBoard)).toBe(true);
    const t = state({ units: [{ side: 'top', type: 'MI', at: [5, 3] }, { side: 'top', type: 'MI', at: [5, 4] }], leaders: [{ side: 'bottom', at: [4, 4] }] });
    const opts = leaderEvadeOptions(t, t.leaders[0]);
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.every((o) => (o.escapes?.length ?? 0) === 1)).toBe(true);
  });
});

describe('orders', () => {
  it('section cards respect sections and counts, dotted hexes count for either', () => {
    const s = state({ units: [{ side: 'bottom', type: 'MI', at: [6, 1] }, { side: 'bottom', type: 'MI', at: [6, 4] }, { side: 'bottom', type: 'MI', at: [6, 6] }] });
    expect(validateOrders(s, 'bottom', 'order2L', ['u1', 'u2'])).toBeNull();
    expect(validateOrders(s, 'bottom', 'order2L', ['u1', 'u3'])).not.toBeNull();
    expect(validateOrders(s, 'bottom', 'coordinated', ['u1', 'u2'])).toBeNull();
    expect(validateOrders(s, 'bottom', 'order2C', ['u2', 'u3'])).toBeNull();
    expect(validateOrders(s, 'bottom', 'order2C', ['u1'])).not.toBeNull();
  });
  it('troop cards fall back to one unit only when none of that type exist', () => {
    const s = state({ units: [{ side: 'bottom', type: 'MI', at: [6, 1] }, { side: 'bottom', type: 'MI', at: [6, 4] }] });
    expect(validateOrders(s, 'bottom', 'orderHeavy', ['u1'])).toBeNull();
    expect(validateOrders(s, 'bottom', 'orderHeavy', ['u1', 'u2'])).not.toBeNull();
    expect(validateOrders(s, 'bottom', 'orderMedium', ['u1', 'u2'])).toBeNull();
  });
  it('leadership chain', () => {
    const s = state({
      units: [{ side: 'bottom', type: 'MI', at: [6, 4] }, { side: 'bottom', type: 'MI', at: [6, 5] }, { side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [6, 9] }],
      leaders: [{ side: 'bottom', at: [6, 4] }],
    });
    const L = s.leaders[0].id;
    expect(validateOrders(s, 'bottom', 'leadershipAny', [L, 'u1', 'u2', 'u3'])).toBeNull();
    expect(validateOrders(s, 'bottom', 'leadershipAny', [L, 'u1', 'u3'])).not.toBeNull(); // not linked
    expect(validateOrders(s, 'bottom', 'leadershipAny', [L, 'u2'])).not.toBeNull(); // leader may not detach
    expect(validateOrders(s, 'bottom', 'leadershipAny', ['u4'])).toBeNull(); // one unit of choice
  });
  it('line command needs a linked group of foot units', () => {
    const s = state({ units: [{ side: 'bottom', type: 'MI', at: [6, 4] }, { side: 'bottom', type: 'MI', at: [6, 5] }, { side: 'bottom', type: 'LC', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [6, 9] }] });
    expect(validateOrders(s, 'bottom', 'lineCommand', ['u1', 'u2'])).toBeNull();
    expect(validateOrders(s, 'bottom', 'lineCommand', ['u1', 'u4'])).not.toBeNull();
    expect(validateOrders(s, 'bottom', 'lineCommand', ['u3'])).not.toBeNull();
  });
  it('deck has 60 cards with the right counts', () => {
    expect(CARD_LIST).toHaveLength(60);
    const sum = Object.values(CARD_DEFS).reduce((a, d) => a + d.count, 0);
    expect(sum).toBe(60);
  });
});

describe('turn flow', () => {
  it('heavy infantry attacks, defender retreats, attacker advances', () => {
    const s = state({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }] });
    noFirstStrike(s);
    const card = giveCard(s, 'bottom', 'order2C');
    const d = drive(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1'] });
    expect(d.pending!.kind).toBe('move');
    must(d, { kind: 'endMove' });
    expect(d.pending!.kind).toBe('battle');
    forceDice(['medium', 'swords', 'flag', 'light', 'heavy']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    const mi = d.state.units.find((u) => u.id === 'u2')!;
    expect(mi.blocks).toBe(2);
    // MI retreats 1 hex toward the top
    if (d.pending!.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(mi.hex === H(3, 6) || mi.hex === H(3, 5)).toBe(true);
    expect(d.pending!.kind).toBe('momentum');
    must(d, { kind: 'yesno', yes: true });
    expect(d.state.units[0].hex).toBe(H(4, 6));
    // foot without a leader: no bonus combat; turn ends -> next player plays a card
    expect(d.pending!.kind).toBe('playCard');
    expect(d.pending!.side).toBe('top');
    expect(forcedDiceLeft()).toBe(0);
  });
  it('battle back when the defender holds', () => {
    const s = state({ units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }] });
    noFirstStrike(s);
    const card = giveCard(s, 'bottom', 'order2C');
    const d = drive(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1'] });
    must(d, { kind: 'endMove' });
    forceDice(['light', 'light', 'light', 'light', 'heavy', 'heavy', 'swords', 'flag', 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    // MI rolls 4 misses, HI battles back with 5: medium? none -> swords 1 hit + flag
    const mi = d.state.units.find((u) => u.id === 'u1')!;
    expect(mi.blocks).toBe(3);
    expect(d.pending).toMatchObject({ kind: 'retreat', side: 'bottom', unit: 'u1' });
    must(d, { kind: 'choose', index: 0 });
    expect([H(6, 6), H(6, 7)]).toContain(mi.hex);
  });
  it('light infantry may evade: only light symbols hit', () => {
    const s = state({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'LI', at: [4, 6] }] });
    noFirstStrike(s);
    const card = giveCard(s, 'bottom', 'order2C');
    const d = drive(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1'] });
    must(d, { kind: 'endMove' });
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending!.kind).toBe('defend');
    forceDice(['light', 'swords', 'flag', 'leader', 'heavy']);
    must(d, { kind: 'defend', choice: 'evade' });
    if (d.pending!.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    const li = d.state.units.find((u) => u.id === 'u2')!;
    expect(li.blocks).toBe(3);
    expect(distance(li.hex, H(4, 6))).toBe(2);
    expect(d.state.units[0].hex).toBe(H(5, 6)); // no momentum advance after evade
  });
  it('elephant sword hits are re-rolled', () => {
    const s = state({ units: [{ side: 'bottom', type: 'EL', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }] });
    noFirstStrike(s);
    const card = giveCard(s, 'bottom', 'order2C');
    const d = drive(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1'] });
    must(d, { kind: 'endMove' });
    // 4 dice vs MI: swords -> reroll swords -> reroll medium. Hits: 2 swords + 1 medium + medium = 4 -> eliminated
    forceDice(['swords', 'medium', 'light', 'light', 'swords', 'medium']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.state.units.find((u) => u.id === 'u2')).toBeUndefined();
    expect(d.state.players.bottom.banners).toBe(1);
  });
  it('lone leader attacked must evade or die', () => {
    const s = state({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }], leaders: [{ side: 'top', at: [4, 6] }] });
    noFirstStrike(s);
    const card = giveCard(s, 'bottom', 'order2C');
    const d = drive(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1'] });
    must(d, { kind: 'endMove' });
    forceDice(['leader', 'flag', 'flag', 'flag', 'flag']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.state.leaders).toHaveLength(0);
    expect(d.state.players.bottom.banners).toBe(1);
  });
  it('first strike: defender hits first', () => {
    const s = state({ units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }] });
    noFirstStrike(s);
    const card = giveCard(s, 'bottom', 'order2C');
    giveCard(s, 'top', 'firstStrike');
    const d = drive(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1'] });
    must(d, { kind: 'endMove' });
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending).toMatchObject({ kind: 'defend', canFirstStrike: true });
    forceDice(['medium', 'medium', 'medium', 'medium', 'light']);
    must(d, { kind: 'defend', choice: 'firstStrike' });
    expect(d.state.units.find((u) => u.id === 'u1')).toBeUndefined();
    expect(d.state.players.top.banners).toBe(1);
  });
  it('clash of shields orders all engaged units with +2 dice', () => {
    const s = state({ units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'bottom', type: 'MI', at: [7, 2] }, { side: 'top', type: 'HI', at: [4, 6] }] });
    noFirstStrike(s);
    const card = giveCard(s, 'bottom', 'clash');
    const d = drive(s);
    must(d, { kind: 'playCard', card });
    expect(Object.keys(d.state.turn.ordered)).toEqual(['u1']);
    expect(d.pending!.kind).toBe('battle');
    expect(pieceMoves(d.state, 'u1')).toHaveLength(0);
    expect(closeCombatDice(d.state, d.state.units[0], d.state.units[2], { role: 'attack', fullAtStart: true, ordered: true })).toBe(6);
  });
  it('ranged fire cannot target adjacent units or fire while engaged', () => {
    const s = state({ units: [{ side: 'bottom', type: 'LB', at: [6, 6] }, { side: 'top', type: 'MI', at: [4, 6] }, { side: 'top', type: 'MI', at: [5, 2] }] });
    noFirstStrike(s);
    const card = giveCard(s, 'bottom', 'orderLight');
    const d = drive(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1'] });
    must(d, { kind: 'endMove' });
    expect(battleTargets(d.state, 'u1').map((t) => t.kind)).toEqual(['ranged']);
  });
  it('counter attack mirrors the last card', () => {
    const s = state({ units: [{ side: 'bottom', type: 'MI', at: [6, 1] }, { side: 'top', type: 'MI', at: [2, 11] }, { side: 'top', type: 'MI', at: [2, 1] }] });
    noFirstStrike(s);
    const c1 = giveCard(s, 'bottom', 'order2L');
    const c2 = giveCard(s, 'top', 'counterAttack');
    const d = drive(s);
    must(d, { kind: 'playCard', card: c1 });
    must(d, { kind: 'orders', pieces: ['u1'] });
    must(d, { kind: 'endMove' });
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    must(d, { kind: 'playCard', card: c2 });
    expect(d.pending).toMatchObject({ kind: 'orders', card: 'order2R', mirrored: true });
    // top's right section is the bottom player's left: (2,1)
    must(d, { kind: 'orders', pieces: ['u3'] });
  });
  it('replay reproduces the same state; undo removes a move', () => {
    const s = state({ units: [{ side: 'bottom', type: 'MI', at: [6, 4] }, { side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'MI', at: [2, 4] }] });
    const card = giveCard(s, 'bottom', 'order2C');
    const d = drive(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1', 'u2'] });
    must(d, { kind: 'move', piece: 'u1', to: H(5, 4) });
    expect(d.canUndo()).toBe(true);
    const u = d.undo();
    expect(u.state.units[0].hex).toBe(H(6, 4));
    expect(u.pending!.kind).toBe('move');
  });
  it('cannot undo once the turn has passed to the other side', () => {
    const s = state({ units: [{ side: 'bottom', type: 'MI', at: [6, 4] }, { side: 'top', type: 'MI', at: [2, 4] }] });
    const card = giveCard(s, 'bottom', 'order2C');
    const d = drive(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1'] });
    must(d, { kind: 'move', piece: 'u1', to: H(5, 4) });
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(d.canUndo()).toBe(false);
  });
});
