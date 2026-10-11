// The computer opponent as seen by the UI controller.
import { randomAnswer, type Answer, type Decision, type GameState } from '../../engine';

export interface Opponent {
  decide(state: GameState, decision: Decision): Promise<{ answer: Answer; say?: string }>;
  dispose(): void;
  /**
   * True while decisions are computed off the main thread (the AI's Web Worker): only then is the opponent asked while the
   * board still animates the events before its decision, which an in-thread computation would stall.
   */
  readonly usingWorker?: boolean;
}

/** Fallback opponent that plays random legal moves. */
export class RandomOpponent implements Opponent {
  async decide(state: GameState, decision: Decision) {
    return { answer: randomAnswer(state, decision, Math.random) };
  }
  dispose() {}
}
