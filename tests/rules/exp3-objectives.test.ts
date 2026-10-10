// Expansion #3 scenario mechanics outside the units (rules-reference §18.4, §18.8, §20): hand growth (006 Trasimenus,
// 313 Brindisi Raid) and the objective additions (ship markers, single-side majority, leader exits, the hill a removed camp
// leaves). The data shapes follow the verified files design/exp3-data/309, 311, 313 and 317.
import { beforeEach, describe, expect, it } from 'vitest';
import { GameDriver, SPECIAL_RULE_IDS, cloneState, createGame, forceDice, type GameEvent, type Side } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { build, ev, noFirstStrike, passTurn, setupOf, type Pos } from './helpers';

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
