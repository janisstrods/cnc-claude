// Helpers for tests that drive a GameController (src/ui/game/controller.ts). The controller paces its events with
// timers and plays the computer's turns itself, so a test that waits for it on the real clock, against an opponent
// that plays by Math.random, depends on the machine's speed and on luck:
//   - a poll with a fixed number of tries gives up silently when a computer turn takes longer than the tries cover
//     (a random-playing opponent's whole turn takes 1-2.5 s of animations, more under load), and the test then reads
//     whatever stale state the view had;
//   - what the computer happened to do while the test waited (an attack leaves a "-1" flash on the board for 1.5 s)
//     is still on the board when the test reads it.
// Here the clock is fake (the test registers `useFakeClock()` for the describe and every wait advances it by an
// explicit amount, so nothing depends on how fast the machine is), the opponent is seeded (the game it plays is the
// same every run), and a wait that cannot succeed fails loudly instead of returning.
import { afterEach, beforeEach, vi } from 'vitest';
import { randomAnswer, type Decision, type GameEvent, type GameState, type QueuedEvent } from '../../src/engine';
import type { GameController } from '../../src/ui/game/controller';
import type { Opponent } from '../../src/ui/game/opponent';
import { rng } from '../../src/ui/terrain/noise';

/** Fake timers for each test of the describe it is called in (the controller's sleeps, toasts and flash timers). */
export function useFakeClock() {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
}

/** The computer opponent of the tests: random legal answers from a seeded generator, so a game replays the same way every run. */
export class SeededOpponent implements Opponent {
  private readonly next: () => number;
  constructor(seed = 7) {
    this.next = rng(seed);
  }
  async decide(state: GameState, decision: Decision) {
    return { answer: randomAnswer(state, decision, this.next) };
  }
  dispose() {}
}

/** Fake milliseconds per step while the controller plays on its own: longer than a hurried sleep, shorter than any pause. */
const STEP_MS = 50;
/** Steps (STEP_MS each) before a wait is given up as stuck: 200 s of fake time, far more than a battle turn's animations. */
const MAX_STEPS = 4000;

/**
 * Let the controller play on (the computer's turns, with the animations skipped as far as `hurry` can) until the human has a
 * decision to take. Needs `useFakeClock()`. Throws if the battle ends, the game loop fails or nothing comes: it never
 * returns with the human's decision missing.
 */
export async function runToHuman(c: GameController): Promise<void> {
  for (let i = 0; i < MAX_STEPS; i++) {
    if (c.view.pending) return;
    if (c.view.fatal) throw new Error(`the game loop failed: ${c.view.error}`);
    if (c.view.over) throw new Error('the battle ended before the human had a decision');
    c.hurry();
    await vi.advanceTimersByTimeAsync(STEP_MS);
  }
  throw new Error(`the human has no decision after ${MAX_STEPS * STEP_MS / 1000} s of fake time`);
}

/**
 * The controller's animation of one engine event, as `(event, state after it)`. The returned promise settles once the
 * animation is over. Its pauses are skipped with `hurry`, which makes each a zero-length timer; the fake clock runs one of
 * those when it moves by 1 ms, so the clock moves 1 ms per pause and no more: a flash or a toast keeps its full time.
 * The animation's first part, before its first pause, has run when the call returns, so a test may look at the board
 * mid-animation before it awaits the promise. Needs `useFakeClock()`.
 */
export function eventPlayer(c: GameController) {
  const animate = (c as unknown as { animate(q: QueuedEvent): Promise<void> }).animate.bind(c);
  return async (e: GameEvent, state: GameState): Promise<void> => {
    c.hurry();
    let over = false;
    const played = animate({ e, state }).then(() => {
      over = true;
    });
    for (let i = 0; i < MAX_STEPS && !over; i++) await vi.advanceTimersByTimeAsync(1);
    if (!over) throw new Error(`the animation of the event ${e.t} did not finish`);
    await played;
  };
}

/**
 * What the next change to the controller's view adds to the log and the board: read `after()` once the change is done.
 * Only the lines and flashes that did not exist when this was called count, so whatever the computer's earlier play left
 * on the board (a damage flash lives 1.5 s) cannot be mistaken for the change's own.
 */
export function newSince(c: GameController) {
  const lastLog = c.view.log.reduce((m, l) => Math.max(m, l.id), 0);
  const flashes = new Set(c.view.flashes.map((f) => f.id));
  return () => ({
    log: c.view.log.filter((l) => l.id > lastLog).map((l) => l.text),
    flashes: c.view.flashes.filter((f) => !flashes.has(f.id)),
  });
}
