// Battle objectives (rules-reference §18.4): the objectives core that replaced the camp capture of 011 Baecula / 114
// Gabiene and the exit of 010 Castulo. The Expansion #2 objective kinds are added on top of this core.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  OFF_BOARD, bannerTotal, capturableAt, cloneState, createGame, exitHexes, forceDice, pieceMoves,
  type GameEvent,
} from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { H, build, ev, giveCard, must, passTurn, play, setupOf, u, type Pos } from './helpers';

beforeEach(() => forceDice([]));

const banners = (es: GameEvent[]) => es.filter((e) => e.t === 'banner');
const logs = (es: GameEvent[]) => es.flatMap((e) => (e.t === 'log' ? [e.text] : []));

/** Two camps the Romans (bottom) capture by stopping on them (every camp on the board by default). */
const CAMPS: Pos = {
  objectives: [{ kind: 'capture', side: 'bottom' }],
  terrain: [{ at: [2, 6], t: 'camp' }, { at: [2, 7], t: 'camp' }],
  units: [{ side: 'bottom', type: 'MI', at: [3, 6] }, { side: 'bottom', type: 'MI', at: [3, 7] }],
};

/** 010-style exit: Roman (bottom) units may leave over row 0 from (0,6) and (0,7) only. */
const EXIT: Pos = { objectives: [{ kind: 'exit', side: 'bottom', hexes: [[0, 6], [0, 7]] }] };

describe('objectives core', () => {
  it("a 'stop' capture scores once per hex, with the default text and reason", () => {
    const d = play(build(CAMPS), 'order2C', ['u1', 'u2']);
    ev(d);
    expect(capturableAt(d.state, 'bottom', H(2, 6))).toBe(true);
    expect(capturableAt(d.state, 'top', H(2, 6))).toBe(false);
    must(d, { kind: 'move', piece: 'u1', to: H(2, 6) });
    let es = ev(d);
    expect(logs(es)).toEqual(['The Roman army captures a Carthaginian camp!']);
    expect(banners(es)).toEqual([{ t: 'banner', side: 'bottom', total: 1, reason: 'camp captured' }]);
    expect(capturableAt(d.state, 'bottom', H(2, 6))).toBe(false);
    must(d, { kind: 'move', piece: 'u2', to: H(2, 7) });
    expect(banners(ev(d))).toEqual([{ t: 'banner', side: 'bottom', total: 2, reason: 'camp captured' }]);
    expect(d.state.special.objState[0].taken).toEqual([H(2, 6), H(2, 7)]);
    while (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    while (d.pending?.kind === 'battle') must(d, { kind: 'endBattle' });
    passTurn(d); // top
    // a taken camp scores nothing more: u1 leaves it and u2 steps onto it
    const card = giveCard(d.state, 'bottom', 'order2C');
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1', 'u2'] });
    must(d, { kind: 'move', piece: 'u1', to: H(1, 6) });
    must(d, { kind: 'move', piece: 'u2', to: H(2, 6) });
    es = ev(d);
    expect(banners(es)).toEqual([]);
    expect(logs(es)).toEqual([]);
    expect(d.state.players.bottom.banners).toBe(2);
  });

  it('bannerTotal is the permanent banners while nothing is held', () => {
    const s = build(CAMPS);
    expect([bannerTotal(s, 'top'), bannerTotal(s, 'bottom')]).toEqual([0, 0]);
    const d = play(s, 'order2C', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(2, 6) });
    expect(d.state.special.objState[0].held).toEqual({ top: 0, bottom: 0 });
    expect([bannerTotal(d.state, 'top'), bannerTotal(d.state, 'bottom')]).toEqual([0, 1]);
    expect(bannerTotal(d.state, 'bottom')).toBe(d.state.players.bottom.banners);
  });

  it('banners per capture follow the list in order (the last value repeats)', () => {
    const s = build({ ...CAMPS, objectives: [{ kind: 'capture', side: 'bottom', banners: [0, 2], text: 'Camp!' }] });
    const d = play(s, 'order2C', ['u1', 'u2']);
    ev(d);
    must(d, { kind: 'move', piece: 'u1', to: H(2, 6) });
    let es = ev(d);
    expect(logs(es)).toEqual(['Camp!']);
    expect(banners(es)).toEqual([]);
    must(d, { kind: 'move', piece: 'u2', to: H(2, 7) });
    es = ev(d);
    expect(banners(es).map((e) => e.t === 'banner' && e.total)).toEqual([1, 2]);
    expect(d.state.players.bottom.banners).toBe(2);
  });

  it("an 'exit' objective offers OFF_BOARD from a listed hex; the unit and its leader leave for 1 banner", () => {
    const s = build({
      ...EXIT, units: [{ side: 'bottom', type: 'MI', at: [0, 6] }, { side: 'top', type: 'MI', at: [4, 6] }],
      leaders: [{ side: 'bottom', name: 'Scipio', at: [0, 6] }],
    });
    expect(exitHexes(s, s.units[0])).toEqual([H(0, 6), H(0, 7)]);
    expect(exitHexes(s, s.units[1])).toEqual([]);
    const d = play(s, 'order2C', ['u1']);
    ev(d);
    const exit = pieceMoves(d.state, 'u1').find((m) => m.hex === OFF_BOARD);
    expect(exit).toMatchObject({ dist: 1, path: [H(0, 6), OFF_BOARD], canBattle: false });
    must(d, { kind: 'move', piece: 'u1', to: OFF_BOARD });
    const es = ev(d);
    expect(es.find((e) => e.t === 'move')).toEqual({ t: 'move', id: 'u1', path: [H(0, 6), OFF_BOARD] });
    expect(logs(es)).toEqual(['Roman Medium Infantry breaks through and exits the battlefield!']);
    expect(banners(es)).toEqual([{ t: 'banner', side: 'bottom', total: 1, reason: 'unit exited' }]);
    expect(u(d, 'u1')).toBeUndefined();
    expect(d.state.leaders.filter((l) => l.side === 'bottom')).toEqual([]);
    expect(d.state.special.leadersEliminated).toEqual({ top: 0, bottom: 0 }); // left the board, not eliminated
    expect(d.state.players.top.banners).toBe(0);
  });

  it('no exit from an unlisted row-0 hex; an exit from a reached listed hex counts as one more hex', () => {
    // (0,8) is on row 0 but not listed; medium infantry would need 2 hexes to leave from (0,7)
    const d1 = play(build({ ...EXIT, units: [{ side: 'bottom', type: 'MI', at: [0, 8] }] }), 'order2C', ['u1']);
    expect(pieceMoves(d1.state, 'u1').map((m) => m.hex)).not.toContain(OFF_BOARD);
    // light cavalry from (0,9): (0,8), (0,7), off = 3 hexes
    const d2 = play(build({ ...EXIT, units: [{ side: 'bottom', type: 'LC', at: [0, 9] }] }), 'order2R', ['u1']);
    const exit = pieceMoves(d2.state, 'u1').find((m) => m.hex === OFF_BOARD);
    expect(exit?.dist).toBe(3);
    expect(exit?.path.slice(-2)).toEqual([H(0, 7), OFF_BOARD]);
    // the other side never exits
    const d3 = play(build({ ...EXIT, first: 'top', units: [{ side: 'top', type: 'MI', at: [0, 6] }] }), 'order2C', ['u1']);
    expect(pieceMoves(d3.state, 'u1').map((m) => m.hex)).not.toContain(OFF_BOARD);
  });

  it('010 Castulo: the exit hexes are the Carthaginian baseline in the Roman centre and right sections', () => {
    const sc = scenarioById('010');
    expect(sc.setup.rules).toEqual(['castulo']);
    const cols = [4, 5, 6, 7, 8, 9, 10, 11, 12];
    expect(sc.setup.objectives).toEqual([{ kind: 'exit', side: 'bottom', hexes: cols.map((c) => [0, c]) }]);
    const s = createGame(sc.setup, 1);
    expect(s.special.objectives).toEqual([{
      kind: 'exit', side: 'bottom', hexes: cols.map((c) => H(0, c)), units: 'any', leadersScore: false,
      text: 'Roman {unit} breaks through and exits the battlefield!',
    }]);
  });

  it('cloneState shares the objectives and copies their state', () => {
    const s = build(CAMPS);
    const c = cloneState(s);
    expect(c.special.objectives).toBe(s.special.objectives);
    c.special.objState[0].taken.push(H(2, 6));
    c.special.objState[0].held.bottom = 1;
    expect(s.special.objState).toEqual([{ taken: [], held: { top: 0, bottom: 0 }, sections: [] }]);
  });

  it('setup validates the objectives', () => {
    const game = (p: Pos) => () => createGame(setupOf({ ...CAMPS, ...p }), 1);
    expect(game({ objectives: [{ kind: 'capture', side: 'bottom', hexes: [[4, 6]] }] })).toThrow(/^capture objective: 4,6 is not a camp \(qa\)$/);
    expect(game({ objectives: [{ kind: 'capture', side: 'bottom', banners: [] }] })).toThrow(/banners/);
    expect(game({ objectives: [{ kind: 'exit', side: 'bottom', hexes: [[4, 6]] }] })).toThrow(/^exit objective: 4,6 is not an edge hex \(qa\)$/);
    expect(game({ objectives: [{ kind: 'exit', side: 'bottom', hexes: [] }] })).toThrow(/at least one hex/);
    expect(game({ objectives: [{ kind: 'exit', side: 'left' as 'top', hexes: [[0, 6]] }] })).toThrow(/unknown side left/);
    expect(game({ terrain: [], objectives: [{ kind: 'capture', side: 'bottom' }] })).toThrow(/at least one hex/);
  });
});
