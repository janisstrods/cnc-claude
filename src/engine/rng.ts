// Deterministic RNG (mulberry32). The state lives in GameState.rng so games replay exactly.
import type { DieFace, GameState } from './types';

export const DIE_FACES: DieFace[] = ['light', 'medium', 'heavy', 'leader', 'flag', 'swords'];

/** Advance the generator stored in `s` and return a float in [0, 1). */
export function random(s: { rng: number; rngCalls: number }): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  s.rngCalls++;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(s: { rng: number; rngCalls: number }, n: number): number {
  return Math.floor(random(s) * n);
}

let forced: DieFace[] = [];

/** Test hook: the next dice rolled (anywhere) will be these faces, in order. */
export function forceDice(faces: DieFace[]): void {
  forced = [...faces];
}

export function forcedDiceLeft(): number {
  return forced.length;
}

export function rollDie(s: GameState): DieFace {
  if (forced.length) {
    s.rngCalls++;
    return forced.shift()!;
  }
  return DIE_FACES[randInt(s, 6)];
}

export function rollDice(s: GameState, n: number): DieFace[] {
  const out: DieFace[] = [];
  for (let i = 0; i < n; i++) out.push(rollDie(s));
  return out;
}

export function shuffle<T>(s: { rng: number; rngCalls: number }, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(s, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Make a fresh seed from Math.random (used for new games and AI simulations, never inside the engine). */
export function freshSeed(): number {
  return (Math.random() * 4294967296) >>> 0;
}
