// Movement & terrain (rules-reference §6, §7) driven through the public API.
import { beforeEach, describe, expect, it } from 'vitest';
import { OFF_BOARD, battleTargets, distance, pieceMoves, validateOrders, type CardKind, type TerrainType, type UnitType } from '../../src/engine';
import { H, build, ev, forceDice, leaderId, must, play, u, type Pos } from './helpers';

beforeEach(() => forceDice([]));

/** Order a single unit and return its move targets. */
function movesOf(p: Pos, id: string, card: CardKind = 'order4C', pieces?: string[]) {
  const s = build(p);
  const d = play(s, card, pieces ?? [id]);
  return { d, moves: pieceMoves(d.state, id) };
}

const maxDist = (moves: { dist: number }[]) => Math.max(0, ...moves.map((m) => m.dist));
const hexes = (moves: { hex: number }[]) => moves.map((m) => m.hex);

describe('movement allowances on open ground', () => {
  const table: [UnitType, number][] = [
    ['LI', 2], ['LB', 2], ['LS', 2], ['AX', 2], ['WA', 1], ['MI', 1], ['HI', 1],
    ['LC', 4], ['MC', 3], ['HC', 2], ['EL', 2], ['HCH', 2],
  ];
  for (const [t, max] of table) {
    it(`${t} moves up to ${max}${t === 'WA' ? ' when not charging' : ''}`, () => {
      const { moves } = movesOf({ units: [{ side: 'bottom', type: t, at: [4, 6] }] }, 'u1');
      expect(maxDist(moves)).toBe(max);
    });
  }
  it('every unit may battle after its full move except auxilia moving 2', () => {
    for (const [t] of table) {
      const { moves } = movesOf({ units: [{ side: 'bottom', type: t, at: [4, 6] }] }, 'u1');
      for (const m of moves) {
        const expected = !(t === 'AX' && m.dist === 2);
        expect({ t, dist: m.dist, can: m.canBattle }).toEqual({ t, dist: m.dist, can: expected });
      }
    }
  });
});

describe('blocking pieces', () => {
  it('units may not enter or pass enemy units, enemy leaders or friendly units', () => {
    const { moves } = movesOf({
      units: [{ side: 'bottom', type: 'HC', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [5, 5] }, { side: 'top', type: 'MI', at: [6, 7] }],
      leaders: [{ side: 'top', at: [5, 6] }],
    }, 'u1');
    const hs = hexes(moves);
    expect(hs).not.toContain(H(5, 5));
    expect(hs).not.toContain(H(5, 6));
    expect(hs).not.toContain(H(6, 7));
    expect(hs).not.toContain(H(4, 6)); // only reachable through (5,5)/(5,6)
  });
  it('a unit without a leader may enter a lone friendly leader hex, stops there and the leader attaches', () => {
    const { d, moves } = movesOf({
      units: [{ side: 'bottom', type: 'HC', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [5, 5] }],
      leaders: [{ side: 'bottom', at: [5, 6] }],
    }, 'u1');
    const m = moves.find((x) => x.hex === H(5, 6));
    expect(m).toBeTruthy();
    expect(hexes(moves)).not.toContain(H(4, 6)); // cannot continue through the leader
    must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
    expect(d.state.leaders[0].hex).toBe(H(5, 6));
    // moving with the unit later would carry the leader: it is attached now
  });
  it('a unit with an attached leader may not enter a lone friendly leader hex', () => {
    const { moves } = movesOf({
      units: [{ side: 'bottom', type: 'HC', at: [6, 6] }],
      leaders: [{ side: 'bottom', at: [6, 6] }, { side: 'bottom', at: [5, 6] }],
    }, 'u1');
    expect(hexes(moves)).not.toContain(H(5, 6));
  });
  it('an attached leader moves with his unit', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HC', at: [6, 6] }], leaders: [{ side: 'bottom', at: [6, 6] }] });
    const d = play(s, 'order4C', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(4, 6) });
    expect(d.state.leaders[0].hex).toBe(H(4, 6));
  });
  it('units never move off the board in a normal scenario', () => {
    const { moves } = movesOf({ units: [{ side: 'bottom', type: 'LC', at: [0, 6] }] }, 'u1');
    expect(hexes(moves)).not.toContain(OFF_BOARD);
  });
});

describe('terrain and movement', () => {
  const t = (at: [number, number], tt: TerrainType, ford?: boolean) => ({ at, t: tt, ford });
  it('forest, marsh and fordable river stop all units on entry', () => {
    for (const [tt, ford] of [['forest', false], ['marsh', false], ['river', true]] as [TerrainType, boolean][]) {
      const { moves } = movesOf({ units: [{ side: 'bottom', type: 'LC', at: [6, 6] }], terrain: [t([5, 6], tt, ford)] }, 'u1');
      expect(moves.find((m) => m.hex === H(5, 6))).toBeTruthy();
      for (const m of moves) expect(m.path.slice(0, -1)).not.toContain(H(5, 6));
    }
  });
  it('broken ground stops mounted units but not foot units', () => {
    const terrain = [t([5, 5], 'broken'), t([5, 6], 'broken')];
    const lc = movesOf({ units: [{ side: 'bottom', type: 'LC', at: [6, 6] }], terrain }, 'u1').moves;
    for (const m of lc) expect(m.path.slice(0, -1).filter((h) => h === H(5, 5) || h === H(5, 6))).toEqual([]);
    const li = movesOf({ units: [{ side: 'bottom', type: 'LI', at: [6, 6] }], terrain }, 'u1').moves;
    const via = li.find((m) => m.hex === H(4, 6));
    expect(via?.dist).toBe(2);
  });
  it('river (not fordable), lake and steep hills are impassable', () => {
    const { moves } = movesOf({
      units: [{ side: 'bottom', type: 'LC', at: [6, 6] }],
      terrain: [t([5, 5], 'river'), t([5, 6], 'lake'), t([6, 7], 'steep')],
    }, 'u1');
    const hs = hexes(moves);
    expect(hs).not.toContain(H(5, 5));
    expect(hs).not.toContain(H(5, 6));
    expect(hs).not.toContain(H(6, 7));
  });
  it('leaving a marsh hex: the move may only be 1 hex', () => {
    const { moves } = movesOf({ units: [{ side: 'bottom', type: 'LC', at: [5, 6] }], terrain: [t([5, 6], 'marsh')] }, 'u1');
    expect(maxDist(moves)).toBe(1);
  });
  it('a lone leader leaving a marsh hex may only move 1 hex', () => {
    const s = build({ leaders: [{ side: 'bottom', at: [5, 6] }], terrain: [t([5, 6], 'marsh')] });
    const L = leaderId(s, 0);
    const d = play(s, 'order4C', [L]);
    expect(maxDist(pieceMoves(d.state, L))).toBe(1);
  });
  it('hills do not restrict movement', () => {
    const { moves } = movesOf({ units: [{ side: 'bottom', type: 'LC', at: [6, 6] }], terrain: [t([5, 6], 'hill'), t([4, 6], 'hill')] }, 'u1');
    expect(maxDist(moves)).toBe(4);
    expect(moves.find((m) => m.hex === H(4, 6))?.dist).toBe(2);
  });
});

describe('battling after moving into terrain', () => {
  const into = (type: UnitType, tt: TerrainType, ford = false) => {
    const { moves } = movesOf({
      units: [{ side: 'bottom', type, at: [5, 6] }, { side: 'top', type: 'MI', at: [3, 6] }],
      terrain: [{ at: [4, 6], t: tt, ford }],
    }, 'u1');
    return moves.find((m) => m.hex === H(4, 6))!.canBattle;
  };
  it('forest: only LI, LB, LS, AX and WA may battle the turn they enter', () => {
    for (const ty of ['LI', 'LB', 'LS', 'AX', 'WA'] as UnitType[]) expect([ty, into(ty, 'forest')]).toEqual([ty, true]);
    for (const ty of ['MI', 'HI', 'LC', 'MC', 'HC', 'EL', 'HCH'] as UnitType[]) expect([ty, into(ty, 'forest')]).toEqual([ty, false]);
  });
  it('broken ground: foot may battle, mounted may not', () => {
    for (const ty of ['LI', 'AX', 'WA', 'MI', 'HI'] as UnitType[]) expect([ty, into(ty, 'broken')]).toEqual([ty, true]);
    for (const ty of ['LC', 'MC', 'HC', 'EL', 'HCH'] as UnitType[]) expect([ty, into(ty, 'broken')]).toEqual([ty, false]);
  });
  it('marsh, fordable river and hill: units may battle after entering', () => {
    for (const ty of ['MI', 'HC'] as UnitType[]) {
      expect(into(ty, 'river', true)).toBe(true);
      expect(into(ty, 'hill')).toBe(true);
    }
    expect(into('HI', 'marsh')).toBe(true);
  });
});

describe('warriors', () => {
  it('may move 2 only when ending adjacent to an enemy unit, and must then close combat', () => {
    const s = build({ units: [{ side: 'bottom', type: 'WA', at: [6, 6] }, { side: 'top', type: 'MI', at: [3, 6] }] });
    const d = play(s, 'order4C', ['u1']);
    const two = pieceMoves(d.state, 'u1').filter((m) => m.dist === 2);
    expect(two.length).toBeGreaterThan(0);
    for (const m of two) {
      expect(distance(m.hex, H(3, 6))).toBe(1);
      expect(m.mustBattle).toBe(true);
    }
    must(d, { kind: 'move', piece: 'u1', to: H(4, 6) });
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    expect(d.pending?.kind).toBe('battle');
    expect(d.answer({ kind: 'endBattle' })).toBe(false); // charge is compulsory
  });
  it('a 2-hex charge may also end adjacent to a lone enemy leader', () => {
    const s = build({ units: [{ side: 'bottom', type: 'WA', at: [6, 6] }], leaders: [{ side: 'top', at: [3, 6] }] });
    const d = play(s, 'order4C', ['u1']);
    const two = pieceMoves(d.state, 'u1').filter((m) => m.dist === 2);
    expect(two.map((m) => m.hex)).toContain(H(4, 6));
  });
  it('warriors moving 1 do not have to battle', () => {
    const s = build({ units: [{ side: 'bottom', type: 'WA', at: [5, 6] }, { side: 'top', type: 'MI', at: [3, 6] }] });
    const d = play(s, 'order4C', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(4, 6) });
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    expect(d.pending?.kind).toBe('battle');
    expect(d.answer({ kind: 'endBattle' })).toBe(true);
  });
});

describe('Order Light Troops / Move-Fire-Move pass-through', () => {
  const wall: Pos['units'] = [
    { side: 'bottom', type: 'LI', at: [6, 6] }, // u1
    { side: 'bottom', type: 'MI', at: [5, 5] }, // u2
    { side: 'bottom', type: 'MI', at: [5, 6] }, // u3
  ];
  it('light foot may pass through (not end on) friendly units with Order Light Troops', () => {
    const { moves } = movesOf({ units: wall }, 'u1', 'orderLight');
    expect(hexes(moves)).toContain(H(4, 6));
    expect(hexes(moves)).not.toContain(H(5, 5));
    expect(hexes(moves)).not.toContain(H(5, 6));
  });
  it('auxilia pass through as well; light cavalry does not', () => {
    const ax = movesOf({ units: [{ ...wall[0], type: 'AX' }, wall[1], wall[2]] }, 'u1', 'orderLight').moves;
    expect(hexes(ax)).toContain(H(4, 6));
    const lc = movesOf({ units: [{ ...wall[0], type: 'LC' }, wall[1], wall[2]] }, 'u1', 'orderLight').moves;
    const via = lc.find((m) => m.hex === H(4, 6));
    if (via) for (const h of via.path) expect([H(5, 5), H(5, 6)]).not.toContain(h);
  });
  it('light foot pass through friendly units with Move-Fire-Move', () => {
    const { moves } = movesOf({ units: wall }, 'u1', 'moveFireMove');
    expect(hexes(moves)).toContain(H(4, 6));
  });
  it('no pass-through with a section card', () => {
    const { moves } = movesOf({ units: wall }, 'u1', 'order4C');
    expect(hexes(moves)).not.toContain(H(4, 6));
  });
  it('no pass-through enemy units', () => {
    const { moves } = movesOf({
      units: [wall[0], { side: 'top', type: 'MI', at: [5, 5] }, { side: 'top', type: 'MI', at: [5, 6] }],
    }, 'u1', 'orderLight');
    expect(hexes(moves)).not.toContain(H(4, 6));
  });
});

describe('cards that change movement', () => {
  it('Line Command: each unit moves at most 1 hex (light infantry too); warriors cannot charge 2', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'LI', at: [6, 5] }, { side: 'bottom', type: 'WA', at: [6, 6] }, { side: 'top', type: 'MI', at: [3, 6] },
    ] });
    const d = play(s, 'lineCommand', ['u1', 'u2']);
    expect(maxDist(pieceMoves(d.state, 'u1'))).toBe(1);
    expect(maxDist(pieceMoves(d.state, 'u2'))).toBe(1);
  });
  it('Double Time: MI/HI/AX move 2 and battle; LI gains nothing; WA moves 2-3 and must battle', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'MI', at: [7, 3] }, { side: 'bottom', type: 'HI', at: [7, 4] }, { side: 'bottom', type: 'AX', at: [7, 5] },
      { side: 'bottom', type: 'LI', at: [7, 6] }, { side: 'top', type: 'HI', at: [2, 9] },
    ] });
    const d = play(s, 'doubleTime', ['u1', 'u2', 'u3', 'u4']);
    for (const id of ['u1', 'u2', 'u3']) {
      const m = pieceMoves(d.state, id);
      expect(maxDist(m)).toBe(2);
      expect(m.every((x) => x.canBattle)).toBe(true);
    }
    expect(maxDist(pieceMoves(d.state, 'u4'))).toBe(2);
  });
  it('Double Time: warriors may move 3 hexes but must then close combat', () => {
    const s = build({ units: [{ side: 'bottom', type: 'WA', at: [7, 6] }, { side: 'top', type: 'HI', at: [3, 6] }] });
    const d = play(s, 'doubleTime', ['u1']);
    const m = pieceMoves(d.state, 'u1');
    expect(maxDist(m)).toBe(3);
    for (const x of m.filter((x) => x.dist >= 2)) {
      expect(distance(x.hex, H(3, 6))).toBe(1);
      expect(x.mustBattle).toBe(true);
    }
  });
  it('Mounted Charge: HC, EL and HCH may move 3 and battle; MC stays 3, LC stays 4', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'HC', at: [6, 2] }, { side: 'bottom', type: 'EL', at: [6, 6] }, { side: 'bottom', type: 'HCH', at: [6, 10] },
      { side: 'bottom', type: 'MC', at: [8, 2] }, { side: 'bottom', type: 'LC', at: [8, 10] },
    ] });
    const d = play(s, 'mountedCharge', ['u1', 'u2', 'u3', 'u4', 'u5']);
    for (const id of ['u1', 'u2', 'u3']) {
      const m = pieceMoves(d.state, id);
      expect(maxDist(m)).toBe(3);
      expect(m.every((x) => x.canBattle)).toBe(true);
    }
    expect(maxDist(pieceMoves(d.state, 'u4'))).toBe(3);
    expect(maxDist(pieceMoves(d.state, 'u5'))).toBe(4);
  });
  it('Clash of Shields and Darken the Sky allow no movement', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }] });
    const d = play(s, 'clash');
    expect(pieceMoves(d.state, 'u1')).toEqual([]);
    const s2 = build({ units: [{ side: 'bottom', type: 'LB', at: [6, 6] }, { side: 'top', type: 'MI', at: [3, 6] }] });
    const d2 = play(s2, 'darken');
    expect(pieceMoves(d2.state, 'u1')).toEqual([]);
    expect(d2.pending?.kind).toBe('battle');
  });
});

describe('leader movement', () => {
  it('a lone leader moves 1-3 hexes through friendly units and leaders but not onto another friendly leader', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'MI', at: [5, 5] }, { side: 'bottom', type: 'MI', at: [5, 6] }],
      leaders: [{ side: 'bottom', at: [6, 6] }, { side: 'bottom', at: [4, 6] }],
    });
    const L = leaderId(s, 0);
    const d = play(s, 'order4C', [L]);
    const m = pieceMoves(d.state, L);
    expect(maxDist(m)).toBe(3);
    expect(hexes(m)).not.toContain(H(4, 6)); // other friendly leader
    expect(hexes(m)).toContain(H(3, 6)); // through units and the other leader
    expect(m.find((x) => x.hex === H(5, 6))?.attachesTo).toBe('u2');
  });
  it('a lone leader may not enter hexes with enemy units or enemy leaders', () => {
    const s = build({
      units: [{ side: 'top', type: 'MI', at: [5, 6] }],
      leaders: [{ side: 'bottom', at: [6, 6] }, { side: 'top', at: [5, 5] }],
    });
    const L = leaderId(s, 0);
    const d = play(s, 'order4C', [L]);
    const hs = hexes(pieceMoves(d.state, L));
    expect(hs).not.toContain(H(5, 6));
    expect(hs).not.toContain(H(5, 5));
  });
  it('forest and broken ground stop a lone leader', () => {
    for (const tt of ['forest', 'broken'] as TerrainType[]) {
      const s = build({ leaders: [{ side: 'bottom', at: [6, 6] }], terrain: [{ at: [5, 5], t: tt }, { at: [5, 6], t: tt }] });
      const L = leaderId(s, 0);
      const d = play(s, 'order4C', [L]);
      const m = pieceMoves(d.state, L);
      for (const x of m) for (const h of x.path.slice(0, -1)) expect([H(5, 5), H(5, 6)]).not.toContain(h);
    }
  });
  it('a leader that joins an ordered unit that has not moved stops it from moving, but it may still battle', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }],
      leaders: [{ side: 'bottom', at: [6, 6] }],
    });
    const L = leaderId(s, 0);
    const d = play(s, 'order4C', [L, 'u1']);
    must(d, { kind: 'move', piece: L, to: H(5, 6) });
    expect(pieceMoves(d.state, 'u1')).toEqual([]);
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    expect(d.pending?.kind).toBe('battle');
    expect(battleTargets(d.state, 'u1').map((t) => t.hex)).toEqual([H(4, 6)]);
  });
  it('detach (section card): an attached leader moves away before his unit, then the unit moves', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HC', at: [6, 6] }], leaders: [{ side: 'bottom', at: [6, 6] }] });
    const L = leaderId(s, 0);
    const d = play(s, 'order4C', [L, 'u1']);
    must(d, { kind: 'move', piece: L, to: H(6, 4) });
    must(d, { kind: 'move', piece: 'u1', to: H(4, 6) });
    expect(d.state.leaders[0].hex).toBe(H(6, 4));
    expect(u(d, 'u1')!.hex).toBe(H(4, 6));
  });
  it('once the unit has moved, its attached leader can no longer detach', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HC', at: [6, 6] }], leaders: [{ side: 'bottom', at: [6, 6] }] });
    const L = leaderId(s, 0);
    const d = play(s, 'order4C', [L, 'u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
    expect(pieceMoves(d.state, L)).toEqual([]);
  });
  it('cards without the helmet (e.g. Order Heavy Troops) cannot order an attached leader separately', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HC', at: [6, 6] }], leaders: [{ side: 'bottom', at: [6, 6] }] });
    expect(validateOrders(s, 'bottom', 'orderHeavy', [leaderId(s, 0)])).not.toBeNull();
  });
});

describe('marsh checks on movement', () => {
  it('a unit entering a marsh rolls 1 die: its class symbol costs 1 block', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }], terrain: [{ at: [5, 6], t: 'marsh' }] });
    const d = play(s, 'order4C', ['u1']);
    forceDice(['medium']);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
    expect(u(d, 'u1')!.blocks).toBe(3);
  });
  it('a unit entering a marsh survives other symbols', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }], terrain: [{ at: [5, 6], t: 'marsh' }] });
    const d = play(s, 'order4C', ['u1']);
    forceDice(['swords']);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
    expect(u(d, 'u1')!.blocks).toBe(4);
  });
  it('a lone leader entering a marsh is eliminated on a helmet (banner to the opponent)', () => {
    const s = build({ leaders: [{ side: 'bottom', at: [6, 6] }], terrain: [{ at: [5, 6], t: 'marsh' }] });
    const L = leaderId(s, 0);
    const d = play(s, 'order4C', [L]);
    forceDice(['leader']);
    must(d, { kind: 'move', piece: L, to: H(5, 6) });
    expect(d.state.leaders).toHaveLength(0);
    expect(d.state.players.top.banners).toBe(1);
  });
  it('a unit eliminated by a marsh check gives a banner', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 6], blocks: 1 }], terrain: [{ at: [5, 6], t: 'marsh' }] });
    const d = play(s, 'order4C', ['u1']);
    forceDice(['medium']);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
    expect(u(d, 'u1')).toBeUndefined();
    expect(d.state.players.top.banners).toBe(1);
    ev(d);
  });
});
