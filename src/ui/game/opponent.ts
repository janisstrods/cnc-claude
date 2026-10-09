// The computer opponent as seen by the UI controller.
import { randomAnswer, type Answer, type Decision, type GameState } from '../../engine';

export interface Opponent {
  decide(state: GameState, decision: Decision): Promise<{ answer: Answer; say?: string }>;
  dispose(): void;
}

/** Fallback opponent that plays random legal moves. */
export class RandomOpponent implements Opponent {
  async decide(state: GameState, decision: Decision) {
    return { answer: randomAnswer(state, decision, Math.random) };
  }
  dispose() {}
}
