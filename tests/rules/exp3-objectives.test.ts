// Expansion #3 scenario mechanics outside the units (rules-reference §18.4, §18.8, §20): hand growth (006 Trasimenus,
// 313 Brindisi Raid) and the objective additions (ship markers, single-side majority, leader exits, the hill a removed camp
// leaves). The data shapes follow the scenario files src/scenarios/data/309, 311, 313 and 317.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  GameDriver, OFF_BOARD, ROWS, COLS, SPECIAL_RULE_IDS, bannerTotal, cloneState, createGame, exitAllows, exitHexes, forceDice, heldBanners,
  pieceMoves, sectionsOf, type GameEvent, type Side, type UnitType,
} from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { H, build, ev, giveCard, leaderId, must, noFirstStrike, passTurn, play, setupOf, u, type Pos } from './helpers';

beforeEach(() => forceDice([]));

const commands = (es: GameEvent[]) => es.flatMap((e) => (e.t === 'command' ? [{ side: e.side, command: e.command }] : []));

/**
 * Play `turns` turns doing nothing and report, after each turn, the hand size of the side that played it and the `command`
 * events of that turn.
 */
function passTurns(d: GameDriver, turns: number) {
  const out: { side: Side; hand: number; command: number; events: ReturnType<typeof commands> }[] = [];
  for (let i = 0; i < turns; i++) {
    const side = d.state.active;
    passTurn(d);
    out.push({ side, hand: d.state.players[side].hand.length, command: d.state.players[side].command, events: commands(ev(d)) });
  }
  return out;
}

describe('hand growth (§18.8)', () => {
  /** 313-shaped: the bottom side (Caesarians) starts with 2 cards and grows to 5. */
  const BRINDISI: Pos = { cards: 5, initialCommand: { bottom: 2 }, handGrowth: { side: 'bottom', to: 5 } };

  it('313: Command 2 -> 3 -> 4 -> 5, drawing 2 after each of the first three turns, then 1 as usual', () => {
    const s = build(BRINDISI);
    noFirstStrike(s);
    expect(s.special.handGrowth).toEqual({ side: 'bottom', to: 5 });
    expect([s.players.bottom.hand.length, s.players.bottom.command]).toEqual([2, 2]);
    const d = new GameDriver(s);
    const turns = passTurns(d, 10).filter((t) => t.side === 'bottom');
    expect(turns.map((t) => t.hand)).toEqual([3, 4, 5, 5, 5]);
    expect(turns.map((t) => t.command)).toEqual([3, 4, 5, 5, 5]);
    expect(turns.map((t) => t.events)).toEqual([
      [{ side: 'bottom', command: 3 }], [{ side: 'bottom', command: 4 }], [{ side: 'bottom', command: 5 }], [], [],
    ]);
  });

  it('only the named side grows; the other side draws 1 and keeps its Command', () => {
    const s = build(BRINDISI);
    noFirstStrike(s);
    const d = new GameDriver(s);
    const top = passTurns(d, 8).filter((t) => t.side === 'top');
    expect(top.map((t) => [t.hand, t.command, t.events])).toEqual(Array(4).fill([5, 5, []]));
    // the growth belongs to the data, not to the Roman army or to the bottom of the board
    const s2 = build({ cards: 3, handGrowth: { side: 'top', to: 4 } });
    noFirstStrike(s2);
    const turns = passTurns(new GameDriver(s2), 4);
    expect(turns.map((t) => [t.side, t.hand, t.command])).toEqual([['bottom', 3, 3], ['top', 4, 4], ['bottom', 3, 3], ['top', 4, 4]]);
    expect(turns.map((t) => t.events)).toEqual([[], [{ side: 'top', command: 4 }], [], []]);
  });

  it('a side whose Command is already at or above `to` never grows', () => {
    const s = build({ cards: 5, handGrowth: { side: 'bottom', to: 5 } });
    noFirstStrike(s);
    const turns = passTurns(new GameDriver(s), 4).filter((t) => t.side === 'bottom');
    expect(turns.map((t) => [t.hand, t.command, t.events])).toEqual([[5, 5, []], [5, 5, []]]);
  });

  it('the growth reads the current Command, not the number of turns played', () => {
    // a Command lowered by anything else (a lost leader in 112) grows back to `to` with the extra draws
    const s = build({ cards: 4, handGrowth: { side: 'bottom', to: 4 } });
    noFirstStrike(s);
    s.players.bottom.command = 3;
    s.players.bottom.hand.pop();
    s.special.turnsDone.bottom = 7;
    const turns = passTurns(new GameDriver(s), 2).filter((t) => t.side === 'bottom');
    expect(turns.map((t) => [t.hand, t.command])).toEqual([[4, 4]]);
  });

  it('006 Trasimenus: the Romans (bottom) grow 2 -> 3 -> 4 through hand growth data, not a rule', () => {
    const sc = scenarioById('006');
    expect(sc.setup.handGrowth).toEqual({ side: 'bottom', to: 4 });
    expect(sc.setup.rules).toEqual([]);
    expect(SPECIAL_RULE_IDS as readonly string[]).not.toContain('trasimenusHand');
    expect(sc.setup.initialCommand).toEqual({ bottom: 2 });
    const s = createGame(sc.setup, 7);
    expect(s.special.handGrowth).toEqual({ side: 'bottom', to: 4 });
    noFirstStrike(s);
    const turns = passTurns(new GameDriver(s), 8).filter((t) => t.side === 'bottom');
    expect(turns.map((t) => t.hand)).toEqual([3, 4, 4, 4]);
    expect(turns.map((t) => t.events)).toEqual([[{ side: 'bottom', command: 3 }], [{ side: 'bottom', command: 4 }], [], []]);
  });

  it('no other battle has hand growth', () => {
    expect(createGame(setupOf({}), 1).special.handGrowth).toBeNull();
    expect(createGame(scenarioById('007').setup, 1).special.handGrowth).toBeNull();
  });

  it('cloneState keeps the hand growth; a game played from the clone grows without changing it', () => {
    const s = build(BRINDISI);
    noFirstStrike(s);
    const c = cloneState(s);
    expect(c.special.handGrowth).toEqual({ side: 'bottom', to: 5 });
    const d = new GameDriver(c);
    passTurns(d, 2);
    expect(d.state.players.bottom.command).toBe(3);
    expect([c.players.bottom.command, s.players.bottom.command]).toEqual([2, 2]);
    expect(cloneState(d.state).special.handGrowth).toEqual({ side: 'bottom', to: 5 });
  });

  it('setup validates the hand growth', () => {
    const game = (handGrowth: unknown) => () => createGame(setupOf({ handGrowth: handGrowth as Pos['handGrowth'] }), 1);
    expect(game({ side: 'bottom', to: 4 })).not.toThrow();
    expect(game({ side: 'left', to: 4 })).toThrow(/^handGrowth: unknown side left \(qa\)$/);
    expect(game({ side: 'bottom', to: 0 })).toThrow(/^handGrowth: to must be a whole number, 1 or more \(qa\)$/);
    expect(game({ side: 'bottom', to: 2.5 })).toThrow(/handGrowth: to must be a whole number/);
    expect(game({ side: 'bottom' })).toThrow(/handGrowth: to must be a whole number/);
    expect(game(5)).toThrow(/^handGrowth must be an object \(qa\)$/);
    expect(game(null)).toThrow(/^handGrowth must be an object \(qa\)$/);
    expect(() => createGame(setupOf({ rules: ['trasimenusHand' as never] }), 1)).toThrow(/unknown special rule trasimenusHand/);
  });
});

// ---------------------------------------------------------------------------------------------
// Objectives (§18.4)

const banners = (es: GameEvent[]) => es.filter((e) => e.t === 'banner');
const logs = (es: GameEvent[]) => es.flatMap((e) => (e.t === 'log' ? [e.text] : []));
const helds = (es: GameEvent[]) => es.filter((e) => e.t === 'held');
const changed = (es: GameEvent[]) => es.filter((e) => e.t === 'terrainChanged');

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
function fromTurnStart(es: GameEvent[], side: Side): GameEvent[] {
  const i = es.map((e) => e.t === 'turnStart' && e.side === side).lastIndexOf(true);
  expect(i).toBeGreaterThanOrEqual(0);
  return es.slice(i);
}

describe('ship markers (313, §18.4)', () => {
  const TOP_TEXT = 'The Pompeians seize a Caesarian transport in Brindisi harbour!';
  const BOTTOM_TEXT = "The Caesarians take a Pompeian marines' landing beach!";
  /** The marker hexes of 313 are coast fords (a ford is a river hex a unit can stand on). */
  const coast = (cols: number[]): Pos['terrain'] => cols.map((c) => ({ at: [0, c] as [number, number], t: 'sea' as const, ford: true }));
  const SHIPS: Pos = {
    first: 'top',
    terrain: coast([0, 1, 2, 3, 8, 9, 10, 11]),
    objectives: [
      { kind: 'capture', side: 'top', hexes: [[0, 8], [0, 9], [0, 10], [0, 11]], when: 'turnStart', marker: 'ship', text: TOP_TEXT },
      { kind: 'capture', side: 'bottom', hexes: [[0, 0], [0, 1], [0, 2], [0, 3]], when: 'turnStart', marker: 'ship', text: BOTTOM_TEXT },
    ],
  };

  it('a unit on a marker hex at the start of its side\'s turn takes it: 1 permanent banner, nothing removed', () => {
    const s = build({ ...SHIPS, units: [
      { side: 'top', type: 'MI', at: [0, 9] }, { side: 'bottom', type: 'MI', at: [0, 2] }, { side: 'top', type: 'MI', at: [4, 6] },
    ] });
    const d = new GameDriver(s);
    expect(ev(d)).toEqual([
      { t: 'turnStart', side: 'top', turn: 1 },
      { t: 'log', text: TOP_TEXT, side: 'top' },
      { t: 'banner', side: 'top', total: 1, reason: 'ship taken' },
    ]);
    expect(d.state.special.objState[0].taken).toEqual([H(0, 9)]);
    expect(d.state.players.top.banners).toBe(1);
    // the marker is taken, the hex is not changed
    expect(d.state.terrain[H(0, 9)]).toBe('river');
    expect(d.state.fords[H(0, 9)]).toBe(true);
    expect(d.pending).toEqual({ kind: 'playCard', side: 'top' });
    // the other side takes its own marker at its own turn start
    passTurn(d); // top
    expect(fromTurnStart(ev(d), 'bottom')).toEqual([
      { t: 'turnStart', side: 'bottom', turn: 2 },
      { t: 'log', text: BOTTOM_TEXT, side: 'bottom' },
      { t: 'banner', side: 'bottom', total: 1, reason: 'ship taken' },
    ]);
    expect(changed(ev(d))).toEqual([]);
  });

  it('only the capturing side takes a marker; a marker is taken once, and each marker hex scores once', () => {
    const s = build({ ...SHIPS, units: [
      { side: 'bottom', type: 'MI', at: [0, 9] }, { side: 'top', type: 'MI', at: [0, 10] }, { side: 'top', type: 'MI', at: [1, 11] },
      { side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'MI', at: [4, 6] },
    ] });
    // the bottom unit on the top side's marker takes nothing; the top unit on (0,10) takes that marker
    const d = new GameDriver(s);
    expect(banners(ev(d))).toEqual([{ t: 'banner', side: 'top', total: 1, reason: 'ship taken' }]);
    expect(d.state.special.objState[0].taken).toEqual([H(0, 10)]);
    // a second top unit steps onto the marker (0,11): taken at the next top turn start, and (0,10) is not taken twice
    turn(d, 'orderMedium', ['u3']);
    must(d, { kind: 'move', piece: 'u3', to: H(0, 11) });
    expect(banners(ev(d))).toEqual([]);
    endTurn(d);
    passTurn(d); // bottom
    const es = fromTurnStart(ev(d), 'top');
    expect(logs(es)).toEqual([TOP_TEXT]);
    expect(banners(es)).toEqual([{ t: 'banner', side: 'top', total: 2, reason: 'ship taken' }]);
    expect(d.state.special.objState[0].taken).toEqual([H(0, 10), H(0, 11)]);
    expect(d.state.special.objState[1].taken).toEqual([]);
  });

  it('a marker blocks nothing: an enemy unit may stand on it, and takes nothing there', () => {
    const s = build({ ...SHIPS, first: 'bottom', units: [{ side: 'bottom', type: 'MI', at: [1, 9] }, { side: 'top', type: 'MI', at: [4, 6] }] });
    const d = play(s, 'orderMedium', ['u1']);
    ev(d);
    expect(pieceMoves(d.state, 'u1').map((m) => m.hex)).toContain(H(0, 9));
    must(d, { kind: 'move', piece: 'u1', to: H(0, 9) }); // the Caesarian walks onto a Caesarian transport's marker of the Pompeians
    expect(u(d, 'u1')?.hex).toBe(H(0, 9));
    endTurn(d);
    passTurn(d); // top
    const es = ev(d);
    expect(banners(es)).toEqual([]);
    expect(d.state.special.objState.map((o) => o.taken)).toEqual([[], []]);
    expect(d.state.terrain[H(0, 9)]).toBe('river');
  });

  it('a marker capture can end the battle at once', () => {
    const s = build({ ...SHIPS, banners: 1, units: [{ side: 'top', type: 'MI', at: [0, 9] }, { side: 'bottom', type: 'MI', at: [6, 6] }] });
    const d = new GameDriver(s);
    expect(ev(d)).toEqual([
      { t: 'turnStart', side: 'top', turn: 1 },
      { t: 'log', text: TOP_TEXT, side: 'top' },
      { t: 'banner', side: 'top', total: 1, reason: 'ship taken' },
      { t: 'victory', winner: 'top', reason: 'Carthaginian captured 1 banners' },
    ]);
    expect(d.pending).toBeNull();
  });

  it('setup: any passable terrain is allowed under a marker; impassable terrain, `remove` and unknown markers are not', () => {
    const marked = (terrain: Pos['terrain'], extra: Record<string, unknown> = {}): Pos => ({
      terrain, objectives: [{ kind: 'capture', side: 'bottom', hexes: [[4, 6]], when: 'turnStart', marker: 'ship', ...extra } as never],
    });
    for (const t of ['plain', 'hill', 'forest', 'marsh', 'broken', 'camp', 'rampart', 'ditch'] as const) {
      const p = marked(t === 'rampart' ? [{ at: [4, 6], t, faces: 'top' }] : [{ at: [4, 6], t }]);
      expect(createGame(setupOf(p), 1).special.objectives[0], t).toMatchObject({ kind: 'capture', hexes: [H(4, 6)], marker: 'ship' });
    }
    expect(createGame(setupOf(marked([{ at: [4, 6], t: 'river', ford: true }])), 1).special.objectives[0]).toMatchObject({ marker: 'ship' });
    expect(createGame(setupOf(marked([{ at: [4, 6], t: 'sea', ford: true }])), 1).special.objectives[0]).toMatchObject({ marker: 'ship' });
    for (const t of ['river', 'sea', 'lake', 'steep'] as const) {
      expect(() => createGame(setupOf(marked([{ at: [4, 6], t }])), 1), t).toThrow(/^capture objective: 4,6 is impassable \(qa\)$/);
    }
    expect(() => createGame(setupOf(marked([], { remove: true })), 1)).toThrow(/^capture objective: a ship marker cannot be removed \(qa\)$/);
    expect(() => createGame(setupOf(marked([], { marker: 'plane' })), 1)).toThrow(/^capture objective: unknown marker plane \(qa\)$/);
    expect(() => createGame(setupOf(marked([], { hexes: [] })), 1)).toThrow(/at least one hex/);
    expect(() => createGame(setupOf(marked([], { hexes: [[0, 12], [9, 0]] })), 1)).toThrow(/off the board/);
    // a plain hex without a marker is still not a camp
    expect(() => createGame(setupOf({ objectives: [{ kind: 'capture', side: 'bottom', hexes: [[4, 6]] }] }), 1)).toThrow(/is not a camp or rampart/);
  });

  it('the resolved objective: the marker is only there when set, and the default text names the ship', () => {
    const plainDef = createGame(setupOf({ terrain: [{ at: [2, 6], t: 'camp' }], objectives: [{ kind: 'capture', side: 'bottom' }] }), 1).special.objectives[0];
    expect('marker' in plainDef).toBe(false);
    const def = createGame(setupOf({ objectives: [{ kind: 'capture', side: 'bottom', hexes: [[4, 7], [4, 6]], when: 'turnStart', marker: 'ship' }] }), 1)
      .special.objectives[0];
    expect(def).toEqual({
      kind: 'capture', side: 'bottom', hexes: [H(4, 6), H(4, 7)], when: 'turnStart', banners: [1], together: 0, remove: false,
      marker: 'ship', text: 'The Roman army seizes a ship.',
    });
  });
});

describe('single-side majority (309 hillock, §18.4)', () => {
  const TEXT = "Caesar's men hold the hillock.";
  const hillock: [number, number][] = [[3, 4], [3, 5], [3, 6]];
  const HILLOCK: Pos = {
    objectives: [{ kind: 'majority', sides: ['bottom'], hexes: hillock, banners: 1, when: 'always', text: TEXT }],
    terrain: hillock.map((at) => ({ at, t: 'hill' as const })),
  };

  it('the listed side holds the banner while it has strictly more units there; ties and the enemy lead give it to nobody', () => {
    const s = build({ ...HILLOCK, units: [
      { side: 'bottom', type: 'MI', at: [4, 5] }, { side: 'bottom', type: 'MI', at: [4, 6] }, { side: 'top', type: 'MI', at: [2, 5] },
    ] });
    const d = play(s, 'orderMedium', ['u1', 'u2']);
    expect(helds(ev(d))).toEqual([]);
    must(d, { kind: 'move', piece: 'u1', to: H(3, 5) }); // 1 against 0
    expect(helds(ev(d))).toEqual([{ t: 'held', side: 'bottom', held: 1, total: 1, reason: TEXT }]);
    expect(bannerTotal(d.state, 'bottom')).toBe(1);
    endTurn(d);
    turn(d, 'orderMedium', ['u3']); // top
    must(d, { kind: 'move', piece: 'u3', to: H(3, 4) }); // 1 against 1: lost at once
    expect(helds(ev(d))).toEqual([{ t: 'held', side: 'bottom', held: 0, total: 0, reason: TEXT }]);
    endTurn(d);
    turn(d, 'orderMedium', ['u2']); // bottom
    must(d, { kind: 'move', piece: 'u2', to: H(3, 6) }); // 2 against 1
    expect(helds(ev(d))).toEqual([{ t: 'held', side: 'bottom', held: 1, total: 1, reason: TEXT }]);
    expect(d.state.special.objState[0].held).toEqual({ top: 0, bottom: 1 });
  });

  it('the other side never holds it, however many units it has there; lone leaders do not count', () => {
    const s = build({ ...HILLOCK, first: 'top', units: [
      { side: 'top', type: 'MI', at: [3, 4] }, { side: 'top', type: 'MI', at: [3, 5] }, { side: 'bottom', type: 'MI', at: [8, 6] },
    ], leaders: [{ side: 'bottom', at: [3, 6] }] });
    const d = new GameDriver(s);
    expect(helds(ev(d))).toEqual([]);
    expect(heldBanners(d.state, 'top')).toBe(0);
    expect(heldBanners(d.state, 'bottom')).toBe(0);
    passTurn(d);
    passTurn(d);
    expect(helds(ev(d))).toEqual([]);
  });

  it('with the units already there the banner is held from the first turn start on; a removal counts at once', () => {
    const s = build({ ...HILLOCK, units: [
      { side: 'bottom', type: 'MI', at: [3, 5], blocks: 1 }, { side: 'top', type: 'MI', at: [2, 5] }, { side: 'bottom', type: 'MI', at: [8, 6] },
    ] });
    const d = new GameDriver(s);
    expect(helds(ev(d))).toEqual([{ t: 'held', side: 'bottom', held: 1, total: 1, reason: TEXT }]);
    passTurn(d); // bottom
    // the top unit attacks the last block off the hillock unit: the banner goes with it, before the enemy's banner
    forceDice(['medium', 'light', 'light', 'light']);
    turn(d, 'orderMedium', ['u2']);
    must(d, { kind: 'endMove' });
    must(d, { kind: 'attack', unit: 'u2', target: H(3, 5) });
    const es = ev(d).filter((e) => e.t === 'eliminated' || e.t === 'held' || e.t === 'banner');
    expect(es).toEqual([
      { t: 'eliminated', id: 'u1' },
      { t: 'held', side: 'bottom', held: 0, total: 0, reason: TEXT },
      { t: 'banner', side: 'top', total: 1, reason: 'unit eliminated' },
    ]);
  });

  it("'turnEnd' with one side: decided at the end of every player turn", () => {
    const s = build({
      objectives: [{ kind: 'majority', sides: ['bottom'], hexes: hillock, banners: 2, when: 'turnEnd', text: TEXT }],
      terrain: hillock.map((at) => ({ at, t: 'hill' as const })),
      units: [{ side: 'bottom', type: 'MI', at: [4, 5] }, { side: 'top', type: 'MI', at: [8, 6] }, { side: 'bottom', type: 'MI', at: [8, 3] }],
    });
    const d = play(s, 'orderMedium', ['u1', 'u3']); // u3 keeps the turn open after u1 has moved
    must(d, { kind: 'move', piece: 'u1', to: H(3, 5) });
    expect(helds(ev(d))).toEqual([]);
    endTurn(d);
    expect(helds(ev(d))).toEqual([{ t: 'held', side: 'bottom', held: 2, total: 2, reason: TEXT }]);
  });
});

describe('a removed camp leaves the hill under it (§18.4, §18.7)', () => {
  const TEXT = 'The Caesarians clear a Pompeian camp.';
  const CAMPS: Pos = {
    objectives: [{ kind: 'capture', side: 'bottom', hexes: [[2, 6], [2, 7]], when: 'turnStart', banners: [0, 1], remove: true, text: TEXT }],
    terrain: [{ at: [2, 6], t: 'camp' }, { at: [2, 7], t: 'camp' }],
    units: [{ side: 'bottom', type: 'MI', at: [2, 6] }, { side: 'bottom', type: 'MI', at: [2, 7] }],
  };

  it('every game has a hill-under flag per hex, all false unless the data says so; clones share it', () => {
    const s = build(CAMPS);
    expect(s.hillUnder).toHaveLength(ROWS * COLS);
    expect(s.hillUnder.every((x) => x === false)).toBe(true);
    expect(cloneState(s).hillUnder).toBe(s.hillUnder);
  });

  it('a removed camp with a hill under it becomes hill, one without becomes open ground', () => {
    const s = build(CAMPS);
    s.hillUnder[H(2, 6)] = true;
    const d = new GameDriver(s);
    const es = ev(d);
    expect(es.slice(1, 5)).toEqual([
      { t: 'log', text: TEXT, side: 'bottom' }, { t: 'terrainChanged', hex: H(2, 6), terrain: 'hill' },
      { t: 'log', text: TEXT, side: 'bottom' }, { t: 'terrainChanged', hex: H(2, 7), terrain: 'plain' },
    ]);
    expect(banners(es)).toEqual([{ t: 'banner', side: 'bottom', total: 1, reason: 'camp captured' }]); // 0, then 1
    expect([d.state.terrain[H(2, 6)], d.state.terrain[H(2, 7)]]).toEqual(['hill', 'plain']);
    expect(s.terrain[H(2, 6)]).toBe('camp'); // copy-on-write: the starting state keeps its camp
    expect(d.state.hillUnder[H(2, 6)]).toBe(true);
    // a replay reproduces it
    const r = GameDriver.replay(d.initial, d.answers);
    expect(r.state.terrain).toEqual(d.state.terrain);
  });

  it("'together' removes every listed camp at once, each leaving its own ground", () => {
    const s = build({ ...CAMPS, objectives: [{ ...CAMPS.objectives![0], together: 2, banners: [1] } as never] });
    s.hillUnder[H(2, 7)] = true;
    const d = new GameDriver(s);
    expect(changed(ev(d))).toEqual([
      { t: 'terrainChanged', hex: H(2, 6), terrain: 'plain' }, { t: 'terrainChanged', hex: H(2, 7), terrain: 'hill' },
    ]);
  });

  it('a camp that is not removed stays a camp whatever lies under it', () => {
    const s = build({ ...CAMPS, objectives: [{ ...CAMPS.objectives![0], remove: false } as never] });
    s.hillUnder[H(2, 6)] = true;
    const d = new GameDriver(s);
    expect(changed(ev(d))).toEqual([]);
    expect(d.state.terrain[H(2, 6)]).toBe('camp');
  });
});

describe('exits: side edges and leaders (311, 317, §18.4)', () => {
  const ROW0: [number, number][] = Array.from({ length: COLS }, (_, c) => [0, c]);
  const BREAKOUT_TEXT = 'Caesarians break out through the Numidian ring.';
  const BREAKOUT: Pos = { objectives: [{ kind: 'exit', side: 'bottom', hexes: ROW0, leadersScore: true, text: BREAKOUT_TEXT }] };
  const FAR_TOP: NonNullable<Pos['units']>[number] = { side: 'top', type: 'MI', at: [8, 6] };
  /** The move to OFF_BOARD among the moves of `id`. */
  const exitMove = (d: GameDriver, id: string) => pieceMoves(d.state, id).find((m) => m.hex === OFF_BOARD);
  /** The bottom side orders its first leader alone with the section card of the section he stands in. */
  function orderLeader(s: ReturnType<typeof build>): { d: GameDriver; L: string } {
    const L = leaderId(s, 0);
    const sec = sectionsOf(s.leaders[0].hex, 'bottom')[0];
    return { d: play(s, { left: 'order4L', center: 'order4C', right: 'order4R' }[sec] as 'order4C', [L]), L };
  }

  describe('311: cavalry leave over a side edge', () => {
    const VALLEY: Pos = {
      first: 'top', objectives: [{ kind: 'exit', side: 'top', hexes: [[4, 0], [5, 0]], units: 'cavalry', text: 'Pompeian horsemen ride out of the valley.' }],
    };

    it('the exit hexes may lie on the left edge, and cavalry (not chariots, elephants or camels) may use them', () => {
      const types: UnitType[] = ['LC', 'MC', 'HC', 'LBC', 'EL', 'HCH', 'BCH', 'CAM', 'MI', 'LI'];
      const s = build({ ...VALLEY, units: types.map((type, i) => ({ side: 'top' as const, type, at: [i % 2 ? 6 : 7, i] as [number, number] })) });
      const exits = s.units.filter((x) => exitHexes(s, x).length > 0).map((x) => x.type);
      expect(exits).toEqual(['LC', 'MC', 'HC', 'LBC']);
      expect(exitHexes(s, s.units[0])).toEqual([H(4, 0), H(5, 0)]);
      const o = s.special.objectives[0];
      if (o.kind !== 'exit') throw new Error('expected an exit objective');
      expect(s.units.filter((x) => exitAllows(o, x)).map((x) => x.type)).toEqual(['LC', 'MC', 'HC', 'LBC']);
      expect(() => build({ ...VALLEY, objectives: [{ kind: 'exit', side: 'top', hexes: [[4, 1]], units: 'cavalry' }] })).toThrow(/4,1 is not an edge hex/);
    });

    it('a horseman walks to the edge hex and rides off for a banner; foot units on the same hex have no exit', () => {
      const s = build({ ...VALLEY, units: [
        { side: 'top', type: 'LC', at: [4, 2] }, { side: 'top', type: 'MI', at: [5, 0] }, { side: 'bottom', type: 'MI', at: [8, 6] },
      ] });
      const d = play(s, 'orderMounted', ['u1']);
      ev(d);
      expect(exitMove(d, 'u1')).toMatchObject({ dist: 3, path: [H(4, 2), H(4, 1), H(4, 0), OFF_BOARD], canBattle: false });
      must(d, { kind: 'move', piece: 'u1', to: OFF_BOARD });
      const es = ev(d);
      expect(es.find((e) => e.t === 'move')).toEqual({ t: 'move', id: 'u1', path: [H(4, 2), H(4, 1), H(4, 0), OFF_BOARD] });
      expect(logs(es)).toEqual(['Pompeian horsemen ride out of the valley.']);
      expect(banners(es)).toEqual([{ t: 'banner', side: 'top', total: 1, reason: 'unit exited' }]);
      expect(u(d, 'u1')).toBeUndefined();
      const foot = play(build({ ...VALLEY, units: [{ side: 'top', type: 'MI', at: [5, 0] }] }), 'orderMedium', ['u1']);
      expect(exitMove(foot, 'u1')).toBeUndefined();
    });
  });

  describe('317: leaders score', () => {
    it('setup accepts `leadersScore`, resolves it into the objective and defaults to false', () => {
      const s = build({ ...BREAKOUT, units: [FAR_TOP] });
      expect(s.special.objectives[0]).toMatchObject({ kind: 'exit', side: 'bottom', units: 'any', leadersScore: true, text: BREAKOUT_TEXT });
      const off = build({ objectives: [{ kind: 'exit', side: 'bottom', hexes: ROW0 }] });
      expect(off.special.objectives[0]).toMatchObject({ leadersScore: false });
      expect(() => build({ objectives: [{ kind: 'exit', side: 'bottom', hexes: ROW0, leadersScore: 'yes' as never }] }))
        .toThrow(/^exit objective: leadersScore must be true or false \(qa\)$/);
    });

    it('a lone leader on a listed hex may exit: 1 banner, removed (not eliminated), no banner for the enemy', () => {
      const s = build({ ...BREAKOUT, units: [FAR_TOP, { side: 'bottom', type: 'MI', at: [6, 6] }], leaders: [{ side: 'bottom', name: 'Caesar', at: [0, 6] }] });
      const { d, L } = orderLeader(s);
      ev(d);
      expect(exitMove(d, L)).toMatchObject({ hex: OFF_BOARD, dist: 1, path: [H(0, 6), OFF_BOARD], canBattle: false, mustBattle: false });
      must(d, { kind: 'move', piece: L, to: OFF_BOARD });
      const es = ev(d);
      expect(es.find((e) => e.t === 'move')).toEqual({ t: 'move', id: L, path: [H(0, 6), OFF_BOARD] });
      expect(logs(es)).toEqual([BREAKOUT_TEXT]);
      expect(banners(es)).toEqual([{ t: 'banner', side: 'bottom', total: 1, reason: 'leader exited' }]);
      expect(es.some((e) => e.t === 'leaderKilled' || e.t === 'eliminated')).toBe(false);
      expect(d.state.leaders).toEqual([]);
      expect(d.state.special.leadersEliminated).toEqual({ top: 0, bottom: 0 });
      expect(d.state.players.top.banners).toBe(0);
      expect(d.state.players.bottom.banners).toBe(1);
      // the turn goes on without him
      endTurn(d);
      expect(d.pending).toEqual({ kind: 'playCard', side: 'top' });
    });

    it('the default text names the leader', () => {
      const s = build({
        objectives: [{ kind: 'exit', side: 'bottom', hexes: ROW0, leadersScore: true }],
        units: [FAR_TOP], leaders: [{ side: 'bottom', name: 'Caesar', at: [0, 6] }],
      });
      const { d, L } = orderLeader(s);
      ev(d);
      must(d, { kind: 'move', piece: L, to: OFF_BOARD });
      expect(logs(ev(d))).toEqual(['Roman Caesar breaks through and exits the battlefield!']);
    });

    it('the exit step is one of his 3 hexes: from two hexes away he can leave, from three he cannot', () => {
      const from = (at: [number, number]) => {
        const { d, L } = orderLeader(build({ ...BREAKOUT, units: [FAR_TOP], leaders: [{ side: 'bottom', at }] }));
        return exitMove(d, L);
      };
      const two = from([2, 6]);
      expect(two).toMatchObject({ dist: 3, canBattle: false });
      expect(two?.path).toHaveLength(4);
      expect(two?.path[0]).toBe(H(2, 6));
      expect(two?.path.at(-1)).toBe(OFF_BOARD);
      expect(from([3, 6])).toBeUndefined();
    });

    it('he exits only from a listed hex, only if the objective scores leaders, and only for his own side', () => {
      const three: Pos = { objectives: [{ kind: 'exit', side: 'bottom', hexes: [[0, 5], [0, 6], [0, 7]], leadersScore: true }], units: [FAR_TOP] };
      const at = (hex: [number, number], p: Pos = three) => {
        const { d, L } = orderLeader(build({ ...p, leaders: [{ side: 'bottom', at: hex }] }));
        return exitMove(d, L);
      };
      expect(at([0, 6])).toBeDefined();
      expect(at([0, 10])).toBeUndefined(); // on the edge, not listed, and too far from a listed one
      // without `leadersScore` (010, 212): units leave, leaders do not
      expect(at([0, 6], { objectives: [{ kind: 'exit', side: 'bottom', hexes: [[0, 6]] }], units: [FAR_TOP] })).toBeUndefined();
      // the other side's leader on the same hex
      const s = build({ ...three, first: 'top', units: [{ side: 'bottom', type: 'MI', at: [6, 6] }], leaders: [{ side: 'top', at: [0, 6] }] });
      const d = play(s, 'order4C', [leaderId(s, 0)]);
      expect(exitMove(d, leaderId(s, 0))).toBeUndefined();
    });

    it('terrain that stops a leader ends his move there: no exit through it, except from a hex he starts on; a marsh start allows 1 hex', () => {
      const gate: Pos = { objectives: [{ kind: 'exit', side: 'bottom', hexes: [[0, 6]], leadersScore: true }], units: [FAR_TOP], terrain: [{ at: [0, 6], t: 'forest' }] };
      const walk = orderLeader(build({ ...gate, leaders: [{ side: 'bottom', at: [1, 6] }] }));
      expect(pieceMoves(walk.d.state, walk.L).map((m) => m.hex)).toContain(H(0, 6)); // he can stop there
      expect(exitMove(walk.d, walk.L)).toBeUndefined(); // but not step off from it in the same move
      const start = orderLeader(build({ ...gate, leaders: [{ side: 'bottom', at: [0, 6] }] }));
      expect(exitMove(start.d, start.L)).toMatchObject({ dist: 1 });
      const marsh = (at: [number, number]) => {
        const { d, L } = orderLeader(build({ ...BREAKOUT, units: [FAR_TOP], leaders: [{ side: 'bottom', at }], terrain: [{ at, t: 'marsh' }] }));
        return exitMove(d, L);
      };
      expect(marsh([0, 6])).toMatchObject({ dist: 1 });
      expect(marsh([1, 6])).toBeUndefined(); // 2 hexes needed from a marsh
    });

    it('he walks through friends to reach the exit, but enemy units on every route block it', () => {
      const through = orderLeader(build({
        ...BREAKOUT, units: [FAR_TOP, { side: 'bottom', type: 'MI', at: [1, 6] }], leaders: [{ side: 'bottom', at: [2, 6] }],
      }));
      expect(exitMove(through.d, through.L)).toMatchObject({ dist: 3 });
      const blocked = orderLeader(build({
        ...BREAKOUT, units: [FAR_TOP, { side: 'top', type: 'MI', at: [1, 5] }, { side: 'top', type: 'MI', at: [1, 6] }],
        leaders: [{ side: 'bottom', at: [2, 6] }],
      }));
      expect(exitMove(blocked.d, blocked.L)).toBeUndefined();
    });

    it('a unit leaving with its attached leader scores 2: one for the unit, one for the leader', () => {
      const s = build({ ...BREAKOUT, units: [FAR_TOP, { side: 'bottom', type: 'MI', at: [0, 6] }], leaders: [{ side: 'bottom', name: 'Caesar', at: [0, 6] }] });
      const d = play(s, 'order4C', ['u2']);
      ev(d);
      must(d, { kind: 'move', piece: 'u2', to: OFF_BOARD });
      const es = ev(d);
      expect(es.filter((e) => e.t === 'banner' || e.t === 'log' || e.t === 'victory')).toEqual([
        { t: 'log', text: BREAKOUT_TEXT, side: 'bottom' },
        { t: 'banner', side: 'bottom', total: 1, reason: 'unit exited' },
        { t: 'banner', side: 'bottom', total: 2, reason: 'leader exited' },
      ]);
      expect(d.state.leaders).toEqual([]);
      expect(u(d, 'u2')).toBeUndefined();
      expect(d.state.special.leadersEliminated).toEqual({ top: 0, bottom: 0 });
      expect(d.state.players.top.banners).toBe(0);
    });

    it('without `leadersScore` a unit and its leader still score 1 (010, 212, 221)', () => {
      const s = build({
        objectives: [{ kind: 'exit', side: 'bottom', hexes: ROW0 }],
        units: [FAR_TOP, { side: 'bottom', type: 'MI', at: [0, 6] }], leaders: [{ side: 'bottom', at: [0, 6] }],
      });
      const d = play(s, 'order4C', ['u2']);
      ev(d);
      must(d, { kind: 'move', piece: 'u2', to: OFF_BOARD });
      expect(banners(ev(d))).toEqual([{ t: 'banner', side: 'bottom', total: 1, reason: 'unit exited' }]);
    });

    it('the battle ends at the banner that reaches the target: the unit, or the leader after it', () => {
      const exitWith = (target: number) => {
        const s = build({
          ...BREAKOUT, banners: target, units: [FAR_TOP, { side: 'bottom', type: 'MI', at: [0, 6] }], leaders: [{ side: 'bottom', at: [0, 6] }],
        });
        const d = play(s, 'order4C', ['u2']);
        ev(d);
        must(d, { kind: 'move', piece: 'u2', to: OFF_BOARD });
        return { d, es: ev(d).filter((e) => e.t === 'banner' || e.t === 'victory') };
      };
      const one = exitWith(1);
      expect(one.es).toEqual([
        { t: 'banner', side: 'bottom', total: 1, reason: 'unit exited' },
        { t: 'victory', winner: 'bottom', reason: 'Roman captured 1 banners' },
      ]);
      expect(one.d.state.players.bottom.banners).toBe(1);
      const two = exitWith(2);
      expect(two.es).toEqual([
        { t: 'banner', side: 'bottom', total: 1, reason: 'unit exited' },
        { t: 'banner', side: 'bottom', total: 2, reason: 'leader exited' },
        { t: 'victory', winner: 'bottom', reason: 'Roman captured 2 banners' },
      ]);
    });

    it('a lone leader\'s exit can end the battle too', () => {
      const s = build({ ...BREAKOUT, banners: 1, units: [FAR_TOP], leaders: [{ side: 'bottom', at: [0, 6] }] });
      const { d, L } = orderLeader(s);
      ev(d);
      must(d, { kind: 'move', piece: L, to: OFF_BOARD });
      expect(ev(d).filter((e) => e.t === 'banner' || e.t === 'victory')).toEqual([
        { t: 'banner', side: 'bottom', total: 1, reason: 'leader exited' },
        { t: 'victory', winner: 'bottom', reason: 'Roman captured 1 banners' },
      ]);
      expect(d.pending).toBeNull();
    });

    it('an exit counts the held banner it leaves first', () => {
      const s = build({
        objectives: [
          { kind: 'exit', side: 'bottom', hexes: ROW0, leadersScore: true },
          { kind: 'hold', side: 'bottom', hexes: [[0, 6]], text: 'The gate is held.' },
        ],
        units: [FAR_TOP, { side: 'bottom', type: 'MI', at: [0, 6] }], leaders: [{ side: 'bottom', at: [0, 6] }],
      });
      const d = play(s, 'order4C', ['u2']);
      expect(helds(ev(d))).toEqual([{ t: 'held', side: 'bottom', held: 1, total: 1, reason: 'The gate is held.' }]);
      must(d, { kind: 'move', piece: 'u2', to: OFF_BOARD });
      expect(ev(d).filter((e) => e.t === 'held' || e.t === 'banner')).toEqual([
        { t: 'held', side: 'bottom', held: 0, total: 0, reason: 'The gate is held.' },
        { t: 'banner', side: 'bottom', total: 1, reason: 'unit exited' },
        { t: 'banner', side: 'bottom', total: 2, reason: 'leader exited' },
      ]);
    });

    it('a replay reproduces a leader exit', () => {
      const s = build({ ...BREAKOUT, units: [FAR_TOP, { side: 'bottom', type: 'MI', at: [6, 6] }], leaders: [{ side: 'bottom', at: [0, 6] }] });
      const { d, L } = orderLeader(s);
      must(d, { kind: 'move', piece: L, to: OFF_BOARD });
      endTurn(d);
      const r = GameDriver.replay(d.initial, d.answers);
      expect(r.state.leaders).toEqual([]);
      expect(r.state.players.bottom.banners).toBe(1);
    });
  });
});
