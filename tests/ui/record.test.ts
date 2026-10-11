// The player's battle record (Triumphs): results per battle, side and opponent level, the medals they earn, the totals,
// storage, export and import, and the controller recording a finished battle once.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameDriver, other, randomAnswer, type Side } from '../../src/engine';
import { SCENARIOS } from '../../src/scenarios';
import { GameController, initialState, newSessionConfig } from '../../src/ui/game/controller';
import {
  addResult, beatenLevels, exportRecord, importRecord, loadRecord, mergeRecords, outcomeFor, parseRecord, recordFinished,
  recordTotals, saveRecord, sideStanding, sideTally, type BattleRecord,
} from '../../src/ui/record';
import { mulberry32 } from '../support/rng';
import { SeededOpponent, useFakeClock } from './controller-helpers';

/** A Map-backed localStorage for the node test environment. */
export function stubStorage(): Map<string, string> {
  const m = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
  };
  return m;
}

afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('battle record', () => {
  it('counts results per battle, side and level, without changing the record it was given', () => {
    const empty: BattleRecord = {};
    const one = addResult(empty, '001', 'bottom', 'tribune', 'won');
    const two = addResult(one, '001', 'bottom', 'tribune', 'lost');
    expect(empty).toEqual({});
    expect(one['001'].bottom!.tribune).toEqual({ won: 1, lost: 0, draw: 0 });
    expect(two['001'].bottom!.tribune).toEqual({ won: 1, lost: 1, draw: 0 });
    expect(two['001'].top).toBeUndefined();
    const three = addResult(addResult(two, '001', 'bottom', 'consul', 'draw'), '001', 'top', 'recruit', 'lost');
    expect(sideTally(three, '001', 'bottom')).toEqual({ won: 1, lost: 1, draw: 1 });
    expect(sideTally(three, '001', 'top')).toEqual({ won: 0, lost: 1, draw: 0 });
    expect(sideTally(three, '002', 'top')).toEqual({ won: 0, lost: 0, draw: 0 });
  });

  it('a side’s medal is the hardest level beaten from it', () => {
    let r: BattleRecord = {};
    expect(sideStanding(r, '007', 'top')).toBe('none');
    r = addResult(r, '007', 'top', 'consul', 'lost');
    expect(sideStanding(r, '007', 'top')).toBe('fought');
    r = addResult(r, '007', 'top', 'recruit', 'draw');
    expect(sideStanding(r, '007', 'top')).toBe('fought');
    r = addResult(r, '007', 'top', 'recruit', 'won');
    expect(sideStanding(r, '007', 'top')).toBe('bronze');
    r = addResult(r, '007', 'top', 'consul', 'won');
    expect(sideStanding(r, '007', 'top')).toBe('gold');
    r = addResult(r, '007', 'top', 'tribune', 'won');
    expect(sideStanding(r, '007', 'top')).toBe('gold');
    expect(beatenLevels(r, '007', 'top')).toEqual(['recruit', 'tribune', 'consul']);
    expect(sideStanding(r, '007', 'bottom')).toBe('none');
  });

  it('the outcome is the human’s', () => {
    expect(outcomeFor('top', 'top')).toBe('won');
    expect(outcomeFor('top', 'bottom')).toBe('lost');
    expect(outcomeFor('bottom', 'draw')).toBe('draw');
  });

  it('totals count each side once, by its best medal, and every battle fought from either side', () => {
    let r: BattleRecord = {};
    r = addResult(r, '001', 'bottom', 'recruit', 'won');
    r = addResult(r, '001', 'bottom', 'consul', 'won');
    r = addResult(r, '001', 'top', 'tribune', 'won');
    r = addResult(r, '002', 'top', 'tribune', 'lost');
    r = addResult(r, '101', 'top', 'recruit', 'won');
    const base = SCENARIOS.filter((s) => s.expansion === 'base').map((s) => s.id);
    expect(recordTotals(r, base)).toEqual({ gold: 1, silver: 1, bronze: 0, fought: 2, battles: 15, sides: 30 });
    expect(recordTotals(r, SCENARIOS.map((s) => s.id))).toEqual({
      gold: 1, silver: 1, bronze: 1, fought: 3, battles: SCENARIOS.length, sides: 2 * SCENARIOS.length,
    });
  });

  it('merging takes the larger count of each, so merging the same record again changes nothing', () => {
    let a: BattleRecord = {};
    a = addResult(a, '001', 'bottom', 'recruit', 'won');
    a = addResult(a, '001', 'bottom', 'recruit', 'won');
    let b: BattleRecord = {};
    b = addResult(b, '001', 'bottom', 'recruit', 'lost');
    b = addResult(b, '001', 'bottom', 'recruit', 'won');
    b = addResult(b, '205', 'top', 'consul', 'won');
    const m = mergeRecords(a, b);
    expect(m['001'].bottom!.recruit).toEqual({ won: 2, lost: 1, draw: 0 });
    expect(m['205'].top!.consul).toEqual({ won: 1, lost: 0, draw: 0 });
    expect(mergeRecords(m, b)).toEqual(m);
    expect(mergeRecords(m, a)).toEqual(m);
  });

  it('parsing keeps what is well formed and drops the rest', () => {
    expect(parseRecord(null)).toBeNull();
    expect(parseRecord('x')).toBeNull();
    expect(parseRecord([])).toBeNull();
    const r = parseRecord({
      '001': { bottom: { tribune: { won: 2, lost: 1.5, draw: -3 }, emperor: { won: 9 } }, middle: { recruit: { won: 1 } } },
      '999': { top: { consul: { won: 1 } } },
      abc: { top: { consul: { won: 1 } } },
      '002': 'nonsense',
      '003': { top: { recruit: { won: 0, lost: 0, draw: 0 } } },
    });
    expect(r).toEqual({
      '001': { bottom: { tribune: { won: 2, lost: 0, draw: 0 } } },
      '999': { top: { consul: { won: 1, lost: 0, draw: 0 } } },
    });
  });

  it('is kept in storage, and is empty without it', () => {
    expect(loadRecord()).toEqual({}); // no localStorage at all
    saveRecord(addResult({}, '001', 'top', 'consul', 'won')); // dropped
    const m = stubStorage();
    expect(loadRecord()).toEqual({});
    const r = addResult({}, '108', 'bottom', 'tribune', 'won');
    saveRecord(r);
    expect(JSON.parse(m.get('cca-record-v1')!)).toEqual({ version: 1, battles: r });
    expect(loadRecord()).toEqual(r);
    m.set('cca-record-v1', '{not json');
    expect(loadRecord()).toEqual({});
    m.set('cca-record-v1', JSON.stringify({ version: 2, battles: r }));
    expect(loadRecord()).toEqual({});
  });

  it('recording a finished battle reports a medal only when it improves the side’s', () => {
    stubStorage();
    expect(recordFinished('015', 'top', 'tribune', 'lost')).toBeNull();
    expect(recordFinished('015', 'top', 'tribune', 'won')).toBe('silver');
    expect(recordFinished('015', 'top', 'tribune', 'won')).toBeNull();
    expect(recordFinished('015', 'top', 'recruit', 'won')).toBeNull();
    expect(recordFinished('015', 'top', 'consul', 'draw')).toBeNull();
    expect(recordFinished('015', 'top', 'consul', 'won')).toBe('gold');
    expect(recordFinished('015', 'bottom', 'recruit', 'won')).toBe('bronze');
    expect(sideTally(loadRecord(), '015', 'top')).toEqual({ won: 4, lost: 1, draw: 1 });
  });

  it('exports to a dated file and imports it back; other files are refused', () => {
    const r = addResult(addResult({}, '301', 'top', 'consul', 'won'), '012', 'bottom', 'recruit', 'lost');
    const file = exportRecord(r, new Date(2026, 9, 11, 12));
    expect(file.name).toBe('cca-triumphs-2026-10-11.json');
    const parsed = JSON.parse(file.text);
    expect(parsed.game).toBe('cca-triumphs');
    expect(parsed.version).toBe(1);
    expect(importRecord(file.text)).toEqual(r);
    expect(importRecord('{"version":1,"battles":{}}')).toBeNull();
    expect(importRecord(JSON.stringify({ version: 1, engine: 2, config: {}, answers: [] }))).toBeNull();
    expect(importRecord('not json')).toBeNull();
    expect(importRecord(JSON.stringify({ game: 'cca-triumphs', version: 1, battles: {} }))).toEqual({});
  });
});

describe('recording a battle when it ends', () => {
  useFakeClock();

  /** The answers of a battle played to the end by random legal moves on both sides, and its winner. */
  function finishedGame(scenarioId: string, seed: number) {
    const cfg = newSessionConfig(scenarioId, 'bottom', 'consul');
    cfg.seed = seed;
    const d = new GameDriver(initialState(cfg));
    const rnd = mulberry32(seed);
    for (let i = 0; !d.over && i < 20000; i++) d.answer(randomAnswer(d.state, d.pending!, rnd));
    expect(d.over).toBe(true);
    expect(d.state.winner).not.toBe('draw');
    return { seed, answers: d.answers, winner: d.state.winner as Side };
  }

  /** A controller resuming that battle from its last answer, with the human on `side`, run until it shows the end. */
  async function replayEnd(game: ReturnType<typeof finishedGame>, side: Side) {
    const cfg = newSessionConfig('002', side, 'consul');
    cfg.seed = game.seed;
    const c = new GameController(cfg, new SeededOpponent(), game.answers);
    for (let i = 0; i < 400 && !c.view.over; i++) {
      c.hurry();
      await vi.advanceTimersByTimeAsync(50);
    }
    expect(c.view.over?.winner).toBe(game.winner);
    return c;
  }

  it('records a won battle once, with its new medal', async () => {
    const storage = stubStorage();
    const game = finishedGame('002', 12);
    const c = await replayEnd(game, game.winner);
    expect(sideTally(loadRecord(), '002', game.winner)).toEqual({ won: 1, lost: 0, draw: 0 });
    expect(c.view.over?.newMedal).toBe('gold');
    // the loop running again after the end records nothing more, and keeps the medal shown
    (c as unknown as { run(): void }).run();
    await vi.advanceTimersByTimeAsync(500);
    expect(sideTally(loadRecord(), '002', game.winner)).toEqual({ won: 1, lost: 0, draw: 0 });
    expect(c.view.over?.newMedal).toBe('gold');
    c.dispose();
    expect(storage.has('cca-autosave-v1')).toBe(false);
  });

  it('records a lost battle, with no medal', async () => {
    stubStorage();
    const game = finishedGame('002', 12);
    const loser = other(game.winner);
    const c = await replayEnd(game, loser);
    expect(sideTally(loadRecord(), '002', loser)).toEqual({ won: 0, lost: 1, draw: 0 });
    expect(sideStanding(loadRecord(), '002', loser)).toBe('fought');
    expect(c.view.over?.newMedal).toBeUndefined();
    c.dispose();
  });
});
