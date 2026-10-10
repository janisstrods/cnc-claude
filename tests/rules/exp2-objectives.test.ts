// Battle objectives (rules-reference §18.4, §18.6): the objectives core that replaced the camp capture of 011 Baecula /
// 114 Gabiene and the exit of 010 Castulo, and the Expansion #2 objectives on top of it (turn-start captures with banner
// sequences, `together` and removed camps; hold; majority; section clear; exit unit filters).
import { beforeEach, describe, expect, it } from 'vitest';
import {
  GameDriver, OFF_BOARD, bannerTotal, capturableAt, cloneState, createGame, exitHexes, forceDice, heldBanners, pieceMoves,
  setTerrain, type GameEvent,
} from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { H, build, ev, giveCard, must, passTurn, play, setupOf, u, type Pos } from './helpers';

beforeEach(() => forceDice([]));

const banners = (es: GameEvent[]) => es.filter((e) => e.t === 'banner');
const logs = (es: GameEvent[]) => es.flatMap((e) => (e.t === 'log' ? [e.text] : []));
const helds = (es: GameEvent[]) => es.filter((e) => e.t === 'held');
const changed = (es: GameEvent[]) => es.filter((e) => e.t === 'terrainChanged');
const plain = (...hexes: number[]) => hexes.map((hex) => ({ t: 'terrainChanged', hex, terrain: 'plain' }));

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
    expect(game({ objectives: [{ kind: 'capture', side: 'bottom', hexes: [[4, 6]] }] })).toThrow(/^capture objective: 4,6 is not a camp or rampart \(qa\)$/);
    expect(game({ objectives: [{ kind: 'capture', side: 'bottom', banners: [] }] })).toThrow(/banners/);
    expect(game({ objectives: [{ kind: 'exit', side: 'bottom', hexes: [[4, 6]] }] })).toThrow(/^exit objective: 4,6 is not an edge hex \(qa\)$/);
    expect(game({ objectives: [{ kind: 'exit', side: 'bottom', hexes: [] }] })).toThrow(/at least one hex/);
    expect(game({ objectives: [{ kind: 'exit', side: 'left' as 'top', hexes: [[0, 6]] }] })).toThrow(/unknown side left/);
    expect(game({ terrain: [], objectives: [{ kind: 'capture', side: 'bottom' }] })).toThrow(/at least one hex/);
  });
});

/** End the active side's movement and battle phases without doing anything more. */
function endTurn(d: GameDriver) {
  while (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
  while (d.pending?.kind === 'battle') must(d, { kind: 'endBattle' });
}

/** Play a card of `kind` for the active side of a running game and order `pieces`. */
function turn(d: GameDriver, kind: Parameters<typeof giveCard>[2], pieces: string[]) {
  const card = giveCard(d.state, d.state.active, kind);
  must(d, { kind: 'playCard', card });
  if (d.pending?.kind === 'orders') must(d, { kind: 'orders', pieces });
}

/** Events from the latest turnStart of `side` on. */
function fromTurnStart(es: GameEvent[], side: 'top' | 'bottom'): GameEvent[] {
  const i = es.map((e) => e.t === 'turnStart' && e.side === side).lastIndexOf(true);
  expect(i).toBeGreaterThanOrEqual(0);
  return es.slice(i);
}

const THREE_CAMPS: Pos['terrain'] = [{ at: [2, 2], t: 'camp' }, { at: [2, 6], t: 'camp' }, { at: [2, 10], t: 'camp' }];

/** 201 Clusium: the Romans (bottom) take Gallic camps at the start of their turn; the third one scores; camps are removed. */
const CLUSIUM_TEXT = 'The Romans burn a Gallic camp.';
const CLUSIUM: Pos = {
  objectives: [{ kind: 'capture', side: 'bottom', when: 'turnStart', banners: [0, 0, 1], remove: true, text: CLUSIUM_TEXT }],
  terrain: THREE_CAMPS,
};

/** 211-style: two of the three camps occupied at once give 1 banner, and all three are taken and removed. */
const TOGETHER_TEXT = 'The slave camps are overrun.';
const TOGETHER: Pos = {
  objectives: [{ kind: 'capture', side: 'bottom', when: 'turnStart', together: 2, remove: true, text: TOGETHER_TEXT }],
  terrain: THREE_CAMPS,
};

/** 204-style: either camp held by a bottom unit gives 1 banner, at most 1. */
const HOLD_TEXT = 'The slaves hold a Roman camp.';
const HOLD: Pos = {
  objectives: [{ kind: 'hold', side: 'bottom', hexes: [[2, 4], [2, 8]], max: 1, text: HOLD_TEXT }],
  terrain: [{ at: [2, 4], t: 'camp' }, { at: [2, 8], t: 'camp' }],
};

describe('Expansion #2 objectives', () => {
  it("201 'turnStart' capture: a unit on a camp at the start of its side's turn takes it (removed, no banner yet)", () => {
    const s = build({ ...CLUSIUM, units: [{ side: 'bottom', type: 'MI', at: [2, 6] }, { side: 'bottom', type: 'LC', at: [4, 1] }] });
    const d = play(s, 'order2L', ['u2']);
    let es = ev(d);
    expect(es.slice(0, 3)).toEqual([
      { t: 'turnStart', side: 'bottom', turn: 1 }, { t: 'log', text: CLUSIUM_TEXT, side: 'bottom' }, ...plain(H(2, 6)),
    ]);
    expect(es[3].t).toBe('cardPlayed'); // before the card
    expect(banners(es)).toEqual([]);
    expect(d.state.terrain[H(2, 6)]).toBe('plain');
    expect(s.terrain[H(2, 6)]).toBe('camp'); // copy-on-write: the state the game started from keeps its camp
    expect(d.initial.terrain[H(2, 6)]).toBe('camp');
    expect(d.state.special.objState[0].taken).toEqual([H(2, 6)]);
    // the light cavalry rides through the camp at (2,2): passing through takes nothing
    must(d, { kind: 'move', piece: 'u2', to: H(1, 2) });
    expect(ev(d).find((e) => e.t === 'move')).toEqual({ t: 'move', id: 'u2', path: [H(4, 1), H(3, 1), H(2, 2), H(1, 2)] });
    endTurn(d);
    passTurn(d); // top
    es = fromTurnStart(ev(d), 'bottom');
    expect(logs(es)).toEqual([]);
    expect(changed(es)).toEqual([]);
    // stopping on a camp takes nothing until the next turn start of the side
    turn(d, 'order2L', ['u2']);
    must(d, { kind: 'move', piece: 'u2', to: H(2, 2) });
    expect(logs(ev(d))).toEqual([]);
    endTurn(d);
    expect(logs(ev(d))).toEqual([]); // nothing at the top side's turn start
    passTurn(d); // top
    es = fromTurnStart(ev(d), 'bottom');
    expect(es.slice(1, 3)).toEqual([{ t: 'log', text: CLUSIUM_TEXT, side: 'bottom' }, ...plain(H(2, 2))]);
    expect(banners(es)).toEqual([]); // the second camp scores 0 too
    expect(d.state.special.objState[0].taken).toEqual([H(2, 6), H(2, 2)]);
    expect(d.state.terrain[H(2, 2)]).toBe('plain');
  });

  it("201: captures in one turn start follow the banner list in hex order; only the third scores", () => {
    const s = build({ ...CLUSIUM, units: [[2, 2], [2, 6], [2, 10]].map(([r, c]) => ({ side: 'bottom' as const, type: 'MI' as const, at: [r, c] as [number, number] })) });
    const d = new GameDriver(s);
    const log = { t: 'log', text: CLUSIUM_TEXT, side: 'bottom' };
    expect(ev(d)).toEqual([
      { t: 'turnStart', side: 'bottom', turn: 1 },
      log, ...plain(H(2, 2)), log, ...plain(H(2, 6)), log, ...plain(H(2, 10)),
      { t: 'banner', side: 'bottom', total: 1, reason: 'camp captured' },
    ]);
    expect(d.pending).toEqual({ kind: 'playCard', side: 'bottom' });
    expect(d.state.terrain.filter((t) => t === 'camp')).toEqual([]);
  });

  it("211 'together: 2': one occupied camp takes nothing; two at a turn start give 1 banner and take all three", () => {
    const s = build({ ...TOGETHER, units: [{ side: 'bottom', type: 'MI', at: [2, 6] }, { side: 'bottom', type: 'MI', at: [3, 9] }] });
    const d = play(s, 'order2R', ['u2']);
    let es = ev(d);
    expect(logs(es)).toEqual([]);
    expect(changed(es)).toEqual([]);
    must(d, { kind: 'move', piece: 'u2', to: H(2, 10) });
    endTurn(d);
    passTurn(d); // top
    es = fromTurnStart(ev(d), 'bottom');
    expect(es.slice(1)).toEqual([
      { t: 'log', text: TOGETHER_TEXT, side: 'bottom' }, ...plain(H(2, 2), H(2, 6), H(2, 10)),
      { t: 'banner', side: 'bottom', total: 1, reason: 'camp captured' },
    ]);
    expect(d.state.special.objState[0].taken).toEqual([H(2, 2), H(2, 6), H(2, 10)]);
    // nothing is left to take
    turn(d, 'order2L', []);
    endTurn(d);
    passTurn(d);
    es = fromTurnStart(ev(d), 'bottom');
    expect(logs(es)).toEqual([]);
    expect(d.state.players.bottom.banners).toBe(1);
  });

  it('a replay reproduces the removed camps and leaves the starting state alone', () => {
    const s = build({ ...TOGETHER, units: [[2, 6], [2, 10]].map(([r, c]) => ({ side: 'bottom' as const, type: 'MI' as const, at: [r, c] as [number, number] })) });
    const d = play(s, 'order2C', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(1, 6) }); // over the removed camp's open ground
    endTurn(d);
    expect(d.pending).toEqual({ kind: 'playCard', side: 'top' });
    const r = GameDriver.replay(d.initial, d.answers);
    expect(r.state.terrain).toEqual(d.state.terrain);
    expect([H(2, 2), H(2, 6), H(2, 10)].map((h) => r.state.terrain[h])).toEqual(['plain', 'plain', 'plain']);
    expect(r.state.special.objState).toEqual(d.state.special.objState);
    expect(r.state.units).toEqual(d.state.units);
    expect([H(2, 2), H(2, 6), H(2, 10)].map((h) => d.initial.terrain[h])).toEqual(['camp', 'camp', 'camp']);
  });

  it("221 'banners [2]': one capture scores 2 at once, and reaching the target ends the battle in that step", () => {
    const s = build({
      first: 'top', banners: 3, topArmy: 'German',
      objectives: [{ kind: 'capture', side: 'top', when: 'turnStart', banners: [2], text: 'The Germans storm the Roman camp!' }],
      terrain: [{ at: [7, 6], t: 'camp' }],
      units: [{ side: 'top', type: 'WA', at: [7, 6] }],
    });
    s.players.top.banners = 1;
    const d = new GameDriver(s);
    const es = ev(d);
    expect(banners(es)).toEqual([
      { t: 'banner', side: 'top', total: 2, reason: 'camp captured' },
      { t: 'banner', side: 'top', total: 3, reason: 'camp captured' },
    ]);
    expect(es.at(-1)).toEqual({ t: 'victory', winner: 'top', reason: 'German captured 3 banners' });
    expect(d.pending).toBeNull();
    expect(d.state.terrain[H(7, 6)]).toBe('camp'); // no `remove`
  });

  it('215: a capture objective per side, on a camp and on a rampart standing in for a camp (removed: plain, mask 0)', () => {
    const s = build({
      objectives: [
        { kind: 'capture', side: 'bottom', hexes: [[2, 6]], when: 'turnStart', remove: true, text: 'The Romans take the Belgic camp.' },
        { kind: 'capture', side: 'top', hexes: [[6, 6]], when: 'turnStart', remove: true, text: 'The Belgae take the unfinished camp.' },
      ],
      terrain: [{ at: [2, 6], t: 'camp' }, { at: [6, 6], t: 'rampart', faces: 'top' }],
      units: [{ side: 'bottom', type: 'MI', at: [2, 6] }, { side: 'top', type: 'WA', at: [6, 6] }],
    });
    const mask = s.rampart[H(6, 6)];
    expect(mask).toBeGreaterThan(0);
    const d = new GameDriver(s);
    let es = ev(d);
    expect(logs(es)).toEqual(['The Romans take the Belgic camp.']);
    expect(changed(es)).toEqual(plain(H(2, 6)));
    expect(banners(es)).toEqual([{ t: 'banner', side: 'bottom', total: 1, reason: 'camp captured' }]);
    passTurn(d); // bottom
    es = fromTurnStart(ev(d), 'top');
    expect(es.slice(1)).toEqual([
      { t: 'log', text: 'The Belgae take the unfinished camp.', side: 'top' }, ...plain(H(6, 6)),
      { t: 'banner', side: 'top', total: 1, reason: 'camp captured' },
    ]);
    expect(d.state.terrain[H(6, 6)]).toBe('plain');
    expect(d.state.rampart[H(6, 6)]).toBe(0);
    expect(s.rampart[H(6, 6)]).toBe(mask);
    expect(s.terrain[H(6, 6)]).toBe('rampart');
  });

  it("204 'hold' max 1: entering a listed camp holds 1 banner at once (during movement); a second camp holds no more", () => {
    const s = build({ ...HOLD, units: [{ side: 'bottom', type: 'MI', at: [3, 4] }, { side: 'bottom', type: 'MI', at: [3, 7] }] });
    const d = play(s, 'order2C', ['u1', 'u2']);
    expect(helds(ev(d))).toEqual([]);
    must(d, { kind: 'move', piece: 'u1', to: H(2, 4) });
    const es = ev(d);
    expect(es.map((e) => e.t)).toEqual(['move', 'held']);
    expect(helds(es)).toEqual([{ t: 'held', side: 'bottom', held: 1, total: 1, reason: HOLD_TEXT }]);
    expect([heldBanners(d.state, 'bottom'), bannerTotal(d.state, 'bottom'), d.state.players.bottom.banners]).toEqual([1, 1, 0]);
    must(d, { kind: 'move', piece: 'u2', to: H(2, 8) });
    expect(helds(ev(d))).toEqual([]);
    expect(bannerTotal(d.state, 'bottom')).toBe(1);
  });

  it("204 'hold': the banner goes when the unit is eliminated (before the enemy's banner) or retreats off the hex", () => {
    const s = build({
      ...HOLD, first: 'top',
      units: [{ side: 'bottom', type: 'MI', at: [2, 4], blocks: 1 }, { side: 'top', type: 'HI', at: [1, 4] }],
    });
    const d = play(s, 'order2C', ['u2']);
    // the unit standing on a camp from the start holds it from the first turn start on
    expect(helds(ev(d))).toEqual([{ t: 'held', side: 'bottom', held: 1, total: 1, reason: HOLD_TEXT }]);
    must(d, { kind: 'endMove' });
    forceDice(['medium', 'light', 'light', 'light', 'light']);
    must(d, { kind: 'attack', unit: 'u2', target: H(2, 4) });
    const es = ev(d).filter((e) => e.t === 'eliminated' || e.t === 'held' || e.t === 'banner');
    expect(es).toEqual([
      { t: 'eliminated', id: 'u1' },
      { t: 'held', side: 'bottom', held: 0, total: 0, reason: HOLD_TEXT },
      { t: 'banner', side: 'top', total: 1, reason: 'unit eliminated' },
    ]);

    // retreat: the held banner is lost as soon as the retreat ends, before the attacker's momentum
    const s2 = build({
      ...HOLD, first: 'top',
      units: [{ side: 'bottom', type: 'MI', at: [2, 4] }, { side: 'top', type: 'HI', at: [1, 4] }],
    });
    const d2 = play(s2, 'order2C', ['u2']);
    ev(d2);
    must(d2, { kind: 'endMove' });
    forceDice(['flag', 'light', 'light', 'light', 'light']);
    must(d2, { kind: 'attack', unit: 'u2', target: H(2, 4) });
    must(d2, { kind: 'ignoreFlags', count: 0 }); // a foot unit on a camp could ignore it
    if (d2.pending?.kind === 'retreat') must(d2, { kind: 'choose', index: 0 });
    const es2 = ev(d2);
    const types = es2.map((e) => e.t);
    expect(types.indexOf('held')).toBe(types.indexOf('retreat') + 1);
    expect(helds(es2)).toEqual([{ t: 'held', side: 'bottom', held: 0, total: 0, reason: HOLD_TEXT }]);
    expect(d2.pending?.kind).toBe('momentum');
  });

  it('a total reaching the target through a held banner ends the battle at once', () => {
    const s = build({ ...HOLD, banners: 3, units: [{ side: 'bottom', type: 'MI', at: [3, 4] }, { side: 'bottom', type: 'MI', at: [3, 7] }] });
    s.players.bottom.banners = 2;
    const d = play(s, 'order2C', ['u1', 'u2']);
    ev(d);
    must(d, { kind: 'move', piece: 'u1', to: H(2, 4) });
    expect(ev(d)).toEqual([
      { t: 'move', id: 'u1', path: [H(3, 4), H(2, 4)] },
      { t: 'held', side: 'bottom', held: 1, total: 3, reason: HOLD_TEXT },
      { t: 'victory', winner: 'bottom', reason: 'Roman captured 3 banners' },
    ]);
    expect(d.pending).toBeNull();
    expect(d.state.winner).toBe('bottom');
  });

  it("222 'hold' max 2 on three rampart hexes", () => {
    const s = build({
      objectives: [{ kind: 'hold', side: 'bottom', hexes: [[2, 4], [2, 5], [2, 6]], max: 2, text: 'The Romans hold the rampart.' }],
      terrain: [[2, 4], [2, 5], [2, 6]].map(([r, c]) => ({ at: [r, c] as [number, number], t: 'rampart' as const, faces: 'bottom' as const })),
      units: [[3, 4], [3, 5], [3, 6]].map(([r, c]) => ({ side: 'bottom' as const, type: 'MI' as const, at: [r, c] as [number, number] })),
    });
    const d = play(s, 'order3C', ['u1', 'u2', 'u3']);
    ev(d);
    const heldAfter = (piece: string, to: number) => {
      must(d, { kind: 'move', piece, to });
      return helds(ev(d)).map((e) => e.t === 'held' && e.held);
    };
    expect(heldAfter('u1', H(2, 4))).toEqual([1]);
    expect(heldAfter('u2', H(2, 5))).toEqual([2]);
    expect(heldAfter('u3', H(2, 6))).toEqual([]);
    expect(d.state.special.objState[0].held).toEqual({ top: 0, bottom: 2 });
  });

  it("202 'majority' at each turn end: the side with more units holds 2; it transfers; a tie gives nobody; lone leaders don't count", () => {
    const TEXT = 'Control of the hills';
    const hills = [2, 3, 4, 5, 6, 7, 8].map((c) => ({ at: [4, c] as [number, number], t: 'hill' as const }));
    const s = build({
      objectives: [{ kind: 'majority', sides: ['top', 'bottom'], hexes: hills.map((h) => h.at), banners: 2, when: 'turnEnd', text: TEXT }],
      terrain: hills,
      units: [
        { side: 'bottom', type: 'MI', at: [4, 4] }, { side: 'top', type: 'MI', at: [4, 6] }, { side: 'bottom', type: 'MI', at: [5, 4] },
        { side: 'top', type: 'MI', at: [3, 6] }, { side: 'top', type: 'MI', at: [3, 7] }, { side: 'bottom', type: 'MI', at: [5, 2] },
      ],
      leaders: [{ side: 'top', at: [4, 2] }],
    });
    const d = play(s, 'order2C', ['u3']);
    expect(helds(ev(d))).toEqual([]); // 1 against 1
    must(d, { kind: 'move', piece: 'u3', to: H(4, 5) });
    expect(helds(ev(d))).toEqual([]); // decided at the turn end only
    endTurn(d);
    expect(helds(ev(d))).toEqual([{ t: 'held', side: 'bottom', held: 2, total: 2, reason: TEXT }]);
    // top: 3 against 2, the banners pass to the top side at its turn end
    turn(d, 'order2C', ['u4', 'u5']);
    must(d, { kind: 'move', piece: 'u4', to: H(4, 7) });
    expect(helds(ev(d))).toEqual([]);
    must(d, { kind: 'move', piece: 'u5', to: H(4, 8) }); // no battle: the turn ends at once
    const es = ev(d);
    expect(helds(es)).toEqual([
      { t: 'held', side: 'bottom', held: 0, total: 0, reason: TEXT },
      { t: 'held', side: 'top', held: 2, total: 2, reason: TEXT },
    ]);
    const types = es.map((e) => e.t);
    expect(types.indexOf('held')).toBeGreaterThan(types.lastIndexOf('move')); // at the turn end
    expect(types.indexOf('held')).toBeLessThan(types.indexOf('draw')); // before the draw
    // bottom: 3 against 3 (the lone top leader on a hill does not count): nobody holds them
    turn(d, 'order2L', ['u6']);
    must(d, { kind: 'move', piece: 'u6', to: H(4, 3) });
    endTurn(d);
    expect(helds(ev(d))).toEqual([{ t: 'held', side: 'top', held: 0, total: 0, reason: TEXT }]);
    expect(d.state.special.objState[0].held).toEqual({ top: 0, bottom: 0 });
  });

  it("'majority' 'always' changes hands at once", () => {
    const s = build({
      objectives: [{ kind: 'majority', sides: ['bottom'], hexes: [[4, 4], [4, 5]], banners: 1, when: 'always', text: 'The ridge' }],
      terrain: [{ at: [4, 4], t: 'hill' }, { at: [4, 5], t: 'hill' }],
      units: [{ side: 'bottom', type: 'MI', at: [5, 4] }],
    });
    const d = play(s, 'order2C', ['u1']);
    ev(d);
    must(d, { kind: 'move', piece: 'u1', to: H(4, 4) });
    expect(helds(ev(d))).toEqual([{ t: 'held', side: 'bottom', held: 1, total: 1, reason: 'The ridge' }]);
  });

  it("219 'sectionClear': each section free of enemy units at the side's turn end scores 1; an enemy entering takes it away at once", () => {
    const TEXT = 'A section is clear of Britons.';
    const s = build({
      objectives: [{ kind: 'sectionClear', side: 'bottom', text: TEXT }],
      units: [{ side: 'top', type: 'LC', at: [1, 11] }, { side: 'bottom', type: 'MI', at: [7, 6] }],
      leaders: [{ side: 'top', at: [2, 1] }], // a lone leader does not count
    });
    const d = new GameDriver(s);
    expect(helds(ev(d))).toEqual([]);
    passTurn(d); // bottom
    expect(helds(ev(d))).toEqual([{ t: 'held', side: 'bottom', held: 2, total: 2, reason: TEXT }]);
    expect(d.state.special.objState[0].sections).toEqual(['left', 'center']);
    // the Briton cavalry rides into the centre: that banner is lost during the move (and nothing changes at the
    // top side's turn end, which follows at once)
    turn(d, 'order2L', ['u1']);
    ev(d);
    must(d, { kind: 'move', piece: 'u1', to: H(1, 7) });
    const es = ev(d);
    expect(es.slice(0, 2).map((e) => e.t)).toEqual(['move', 'held']);
    expect(helds(es)).toEqual([{ t: 'held', side: 'bottom', held: 1, total: 1, reason: TEXT }]);
    // the right section is clear now: scored at the bottom side's next turn end
    passTurn(d);
    expect(helds(ev(d))).toEqual([{ t: 'held', side: 'bottom', held: 2, total: 2, reason: TEXT }]);
    expect(d.state.special.objState[0].sections).toEqual(['left', 'right']);
  });

  it("'sectionClear': a unit on a boundary hex is in both sections", () => {
    // (2,4) is on the line between the left and centre sections
    const s = build({ objectives: [{ kind: 'sectionClear', side: 'bottom' }], units: [{ side: 'top', type: 'MI', at: [2, 4] }] });
    const d = play(s, 'order2L', []);
    endTurn(d);
    expect(helds(ev(d)).map((e) => e.t === 'held' && e.held)).toEqual([1]);
    expect(d.state.special.objState[0].sections).toEqual(['right']);
  });

  it("212 'exit' units 'foot': a cavalry unit on an exit hex gets no exit move, a foot unit does ('cavalry' the reverse)", () => {
    const exit = (units: 'foot' | 'cavalry'): Pos => ({
      first: 'top', objectives: [{ kind: 'exit', side: 'top', hexes: [[8, 5], [8, 6]], units }],
      units: [{ side: 'top', type: 'MC', at: [8, 5] }, { side: 'top', type: 'AX', at: [8, 6] }],
    });
    const d = play(build(exit('foot')), 'order2C', ['u1', 'u2']);
    expect(pieceMoves(d.state, 'u1').map((m) => m.hex)).not.toContain(OFF_BOARD);
    expect(pieceMoves(d.state, 'u2').map((m) => m.hex)).toContain(OFF_BOARD);
    const s = build(exit('cavalry'));
    expect(exitHexes(s, s.units[0])).toEqual([H(8, 5), H(8, 6)]);
    expect(exitHexes(s, s.units[1])).toEqual([]);
  });

  it('cloneState copies the objective state, and setTerrain on a clone leaves the original alone', () => {
    const s = build({ ...HOLD, terrain: [...HOLD.terrain!, { at: [5, 5], t: 'rampart', faces: 'top' }] });
    const c = cloneState(s);
    c.special.objState[0].held.bottom = 1;
    c.special.objState[0].sections.push('left');
    expect(s.special.objState).toEqual([{ taken: [], held: { top: 0, bottom: 0 }, sections: [] }]);
    const es: GameEvent[] = [];
    const mask = s.rampart[H(5, 5)];
    setTerrain(c, { emit: (e) => es.push(e) }, H(5, 5), 'plain');
    setTerrain(c, { emit: (e) => es.push(e) }, H(2, 4), 'plain');
    expect(es).toEqual(plain(H(5, 5), H(2, 4)));
    expect([c.terrain[H(5, 5)], c.rampart[H(5, 5)], c.terrain[H(2, 4)]]).toEqual(['plain', 0, 'plain']);
    expect([s.terrain[H(5, 5)], s.rampart[H(5, 5)], s.terrain[H(2, 4)]]).toEqual(['rampart', mask, 'camp']);
    const terrainBefore = c.terrain;
    const rampartBefore = c.rampart;
    setTerrain(c, { emit: () => {} }, H(2, 8), 'plain'); // no rampart there: only the terrain is copied
    expect(c.terrain).not.toBe(terrainBefore);
    expect(c.rampart).toBe(rampartBefore);
  });

  it('an exit from a hex reached during the move: the unit walks to the exit hex and leaves from there', () => {
    const s = build({ ...EXIT, units: [{ side: 'bottom', type: 'LC', at: [0, 9] }] });
    const d = play(s, 'order2R', ['u1']);
    ev(d);
    must(d, { kind: 'move', piece: 'u1', to: OFF_BOARD });
    const es = ev(d);
    expect(es.find((e) => e.t === 'move')).toEqual({ t: 'move', id: 'u1', path: [H(0, 9), H(0, 8), H(0, 7), OFF_BOARD] });
    expect(logs(es)).toEqual(['Roman Light Cavalry breaks through and exits the battlefield!']);
    expect(banners(es)).toEqual([{ t: 'banner', side: 'bottom', total: 1, reason: 'unit exited' }]);
    expect(u(d, 'u1')).toBeUndefined();
  });

  it('setup validates the Expansion #2 objectives', () => {
    const game = (p: Pos) => () => createGame(setupOf({ ...CAMPS, ...p }), 1);
    const ok = (p: Pos) => createGame(setupOf({ ...CAMPS, ...p }), 1).special.objectives;
    expect(game({ objectives: [{ kind: 'exit', side: 'bottom', hexes: [[0, 6]], leadersScore: true }] }))
      .toThrow(/^exit objective: leadersScore is not supported yet \(qa\)$/);
    expect(game({ objectives: [{ kind: 'bogus' } as never] })).toThrow(/^unknown objective kind bogus \(qa\)$/);
    expect(game({ objectives: [{ kind: 'capture', side: 'bottom', together: 2 }] })).toThrow(/together needs when 'turnStart'/);
    expect(game({ objectives: [{ kind: 'capture', side: 'bottom', when: 'turnStart', together: 3 }] })).toThrow(/together/);
    expect(game({ objectives: [{ kind: 'capture', side: 'bottom', when: 'later' as 'stop' }] })).toThrow(/unknown when later/);
    expect(game({ objectives: [{ kind: 'capture', side: 'bottom', hexes: [[4, 6]] }] })).toThrow(/4,6 is not a camp or rampart/);
    expect(game({ objectives: [{ kind: 'exit', side: 'bottom', hexes: [[0, 6]], units: 'elephants' as 'any' }] })).toThrow(/unknown units elephants/);
    expect(game({ objectives: [{ kind: 'hold', side: 'bottom', hexes: [] }] })).toThrow(/at least one hex/);
    expect(game({ objectives: [{ kind: 'hold', side: 'bottom', hexes: [[2, 6]], max: 0 }] })).toThrow(/max/);
    expect(game({ objectives: [{ kind: 'majority', sides: [], hexes: [[2, 6]], banners: 2, when: 'turnEnd' }] })).toThrow(/sides/);
    expect(game({ objectives: [{ kind: 'majority', sides: ['top', 'top'], hexes: [[2, 6]], banners: 2, when: 'turnEnd' }] })).toThrow(/sides/);
    expect(game({ objectives: [{ kind: 'majority', sides: ['top'], hexes: [[2, 6]], banners: 0, when: 'turnEnd' }] })).toThrow(/banners/);
    expect(game({ objectives: [{ kind: 'majority', sides: ['top'], hexes: [[2, 6]], banners: 1, when: 'never' as 'always' }] })).toThrow(/when/);
    expect(game({ objectives: [{ kind: 'sectionClear', side: 'middle' as 'top' }] })).toThrow(/unknown side middle/);
    // defaults
    expect(ok({ objectives: [{ kind: 'hold', side: 'bottom', hexes: [[2, 7], [2, 6]] }] })).toEqual([
      { kind: 'hold', side: 'bottom', hexes: [H(2, 6), H(2, 7)], max: 2, text: 'The Roman army holds an objective.' },
    ]);
    expect(ok({ objectives: [{ kind: 'sectionClear', side: 'bottom' }] })).toEqual([
      { kind: 'sectionClear', side: 'bottom', text: 'The Roman army has cleared a section of the enemy.' },
    ]);
    expect(ok({ objectives: [{ kind: 'majority', sides: ['bottom', 'top'], hexes: [[2, 6]], banners: 2, when: 'turnEnd' }] })).toEqual([
      { kind: 'majority', sides: ['bottom', 'top'], hexes: [H(2, 6)], banners: 2, when: 'turnEnd', text: 'Control of the objective hexes.' },
    ]);
    expect(ok({ objectives: [{ kind: 'capture', side: 'bottom', when: 'turnStart', together: 2, remove: true }] })[0])
      .toMatchObject({ when: 'turnStart', together: 2, remove: true, banners: [1] });
  });
});
