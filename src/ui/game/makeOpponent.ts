import { AiClient } from '../../ai/client';
import { personalityById, personalityFor, type Personality } from '../../ai';
import { other } from '../../engine';
import { scenarioById } from '../../scenarios';
import type { SessionConfig } from './controller';
import type { Opponent } from './opponent';

/** The computer general's temperament for a session (explicit choice, else the historical default). */
export function opponentPersonality(config: SessionConfig): Personality {
  if (config.personality) return personalityById(config.personality);
  const side = other(config.humanSide);
  const army = scenarioById(config.scenarioId).setup[side];
  return personalityFor(army.commander, army.army);
}

/** Create the computer opponent for a session (runs in a Web Worker, with in-thread fallback). */
export function makeOpponent(config: SessionConfig): Opponent {
  return new AiClient({
    side: other(config.humanSide),
    difficulty: config.difficulty,
    personality: opponentPersonality(config),
  });
}
