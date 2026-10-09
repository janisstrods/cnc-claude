import type { SessionConfig } from './controller';
import { RandomOpponent, type Opponent } from './opponent';

/** Create the computer opponent for a session. */
export function makeOpponent(_config: SessionConfig): Opponent {
  return new RandomOpponent();
}
