// The controller asks an opponent that thinks off the main thread (the AI's Web Worker) for its decision before it plays
// the events that lead to it, and waits for the answer only after them. The battle must be the very same as when the
// opponent is asked after the animations (the same decisions, on the same states, in the same order); asking does not
// turn the "thinking" indicator on, the minimum think time still runs from the end of the animations, and a dispose while
// the opponent thinks stays quiet.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cloneState, other, randomAnswer, type Decision, type GameState, type Side } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { GameController, newSessionConfig, type SessionConfig, type ViewState } from '../../src/ui/game/controller';
import type { Opponent } from '../../src/ui/game/opponent';
import { rng } from '../../src/ui/terrain/noise';
import { SeededOpponent, runToHuman } from './controller-helpers';

/** The seeded opponent of the tests, recording what it is asked and when; `usingWorker` as the AI client reports it. */
class Recorder implements Opponent {
  /** `answers`: how many answers the battle had then; `thinking`: whether the indicator was on. */
  readonly asked: { decision: Decision; state: GameState; at: number; answers: number; thinking: boolean }[] = [];
  private readonly inner = new SeededOpponent();
  controller: GameController | null = null;
  constructor(readonly usingWorker: boolean) {}
  decide(state: GameState, decision: Decision) {
    const c = this.controller;
    this.asked.push({ decision, state: cloneState(state), at: Date.now(), answers: c?.driver.answers.length ?? 0, thinking: !!c?.view.aiThinking });
    return this.inner.decide(state, decision);
  }
  dispose() {}
}

/** A battle where the computer moves first: 001 with the human on the side that moves second. */
function config(): SessionConfig {
  const human: Side = other(scenarioById('001').setup.first);
  return { ...newSessionConfig('001', human, 'recruit'), seed: 9 };
}

/** Minimum think time of a decision at normal speed (the controller's `minThink`). */
const minThink = (d: Decision) => (d.kind === 'playCard' ? 700 : d.kind === 'move' || d.kind === 'battle' ? 260 : 150);

// the times the controller starts to wait for the computer (it sets "thinking" on then, for each of its decisions)
const proto = GameController.prototype as unknown as { set(p: Partial<ViewState>): void };
const set = proto.set;
let waits: number[] = [];
afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Play `humanDecisions` of the human's decisions (seeded random answers) at normal speed, the fake clock moving 10 ms at a
 * time, with the animations played in full. Returns the controller, its opponent, the times it started to wait for the
 * computer, and the time each answer was taken (with its side).
 */
async function play(usingWorker: boolean, humanDecisions: number) {
  waits = [];
  vi.spyOn(proto, 'set').mockImplementation(function (this: unknown, p: Partial<ViewState>) {
    if (p.aiThinking === true) waits.push(Date.now());
    set.call(this, p);
  });
  const opp = new Recorder(usingWorker);
  const c = new GameController(config(), opp);
  opp.controller = c;
  const answered: { at: number; side: Side }[] = [];
  let n = c.driver.answers.length;
  const sides: Side[] = [];
  c.subscribe(() => {
    while (n < c.driver.answers.length) answered.push({ at: Date.now(), side: sides[n++] ?? c.opponentSide() });
  });
  const human = rng(11);
  try {
    for (let i = 0; i < humanDecisions; i++) {
      for (let k = 0; k < 60000 && !c.view.pending; k++) {
        if (c.view.fatal || c.view.over) throw new Error(`the battle stopped: ${c.view.error ?? 'over'}`);
        await vi.advanceTimersByTimeAsync(10);
      }
      const d = c.view.pending!;
      expect(d.side).toBe(c.config.humanSide);
      sides[c.driver.answers.length] = d.side;
      c.answer(randomAnswer(c.driver.state, d, human));
    }
    await runToHuman(c);
  } finally {
    c.dispose();
  }
  return { c, opp, waits: [...waits], answered, humanAt: (i: number) => sides[i] === c.config.humanSide };
}

describe('the computer is asked while the board animates', () => {
  // the fake clock of controller-helpers, with performance.now too: the controller measures the think time with it
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('the battle is the same as when it is asked after the animations: same decisions, states and order', async () => {
    const after = await play(false, 12);
    const ahead = await play(true, 12);
    expect(ahead.c.driver.answers).toEqual(after.c.driver.answers);
    expect(ahead.opp.asked.map((x) => [x.decision, x.state])).toEqual(after.opp.asked.map((x) => [x.decision, x.state]));
    // asked once per decision of the computer's
    const aiAnswers = ahead.answered.filter((x) => x.side !== ahead.c.config.humanSide).length;
    expect(ahead.opp.asked.length).toBe(aiAnswers);
    expect(aiAnswers).toBeGreaterThan(5);
  });

  it('it is asked before the animations end; the wait and its minimum time come after them, "thinking" as before', async () => {
    const { c, opp, waits, answered, humanAt } = await play(true, 12);
    const ai = answered.filter((x) => x.side !== c.config.humanSide);
    expect(ai.length).toBe(opp.asked.length);
    expect(waits.length).toBe(opp.asked.length);
    let early = 0;
    opp.asked.forEach((q, i) => {
      expect(waits[i], `ask ${i}`).toBeGreaterThanOrEqual(q.at);
      if (waits[i] > q.at) early++;
      expect(ai[i].at - waits[i], `ask ${i} (${q.decision.kind})`).toBeGreaterThanOrEqual(minThink(q.decision));
      // asking does not put the indicator on: after the human's answer (or at the start) it is still off
      if (q.answers === 0 || humanAt(q.answers - 1)) expect(q.thinking, `ask ${i}`).toBe(false);
    });
    // most decisions follow animated events (the cards and moves before them), so they were asked well before the wait
    expect(early).toBeGreaterThan(opp.asked.length / 2);
  });

  it('a dispose while the opponent thinks during the animations ends the loop quietly', async () => {
    let reject: ((e: Error) => void) | null = null;
    const opp: Opponent & { asked: number } = {
      usingWorker: true,
      asked: 0,
      decide() {
        opp.asked++;
        // like the AI client: never answers, rejects on dispose
        return new Promise((_, rej) => {
          reject = rej;
        });
      },
      dispose() {
        reject?.(new Error('AiClient disposed'));
      },
    };
    const c = new GameController(config(), opp);
    // asked at once, then disposed while the battle's opening events play; the rejection must be handled (Vitest fails the
    // run on an unhandled one)
    expect(opp.asked).toBe(1);
    expect(c.view.aiThinking).toBe(false);
    c.dispose();
    await vi.advanceTimersByTimeAsync(20000);
    expect(opp.asked).toBe(1);
    expect(c.view.pending).toBeNull();
    expect(c.view.fatal).toBe(false);
  });
});
