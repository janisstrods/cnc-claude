import { GameDriver, createGame, randomAnswer, type GameEvent } from '../../src/engine';
import { SCENARIOS } from '../../src/scenarios';
import { PERSONALITIES, chooseAnswer, newMemory, type AiOptions } from '../../src/ai';

export interface Golden { id: string; hash: string; answers: number; winner: string }

function fnv(str: string, h = 0x811c9dc5): number {
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hashEvents(h: number, evs: GameEvent[]): number { for (const e of evs) h = fnv(JSON.stringify(e), h); return h; }

/** Random-legal games: engine only. */
function randomGame(scId: string, seed: number): Golden {
  const sc = SCENARIOS.find((x) => x.id === scId)!;
  const d = new GameDriver(createGame(sc.setup, seed));
  const rnd = mulberry(seed);
  let h = hashEvents(0x811c9dc5, d.drainEvents().map((q) => q.e));
  let steps = 0;
  while (!d.over && steps++ < 20000) { d.answer(randomAnswer(d.state, d.pending!, rnd)); h = hashEvents(h, d.drainEvents().map((q) => q.e)); }
  return { id: `rnd-${scId}-${seed}`, hash: h.toString(16), answers: d.answers.length, winner: String(d.state.winner) };
}

/** Deterministic AI-vs-AI games (recruit settings, small budget) — guards the AI-estimator rework. */
function aiGame(scId: string, seed: number): Golden {
  const sc = SCENARIOS.find((x) => x.id === scId)!;
  const d = new GameDriver(createGame(sc.setup, seed));
  const mem = { top: newMemory(), bottom: newMemory() };
  const opt = (side: 'top' | 'bottom'): AiOptions => ({ side, difficulty: 'recruit', personality: PERSONALITIES[5], seed: seed + (side === 'top' ? 1 : 2), deterministic: true, budgetScale: 0.2 });
  let h = hashEvents(0x811c9dc5, d.drainEvents().map((q) => q.e));
  let steps = 0;
  while (!d.over && steps++ < 4000) {
    const side = d.pending!.side;
    const { answer } = chooseAnswer(d.state, d.pending!, opt(side), mem[side]);
    if (!d.answer(answer)) throw new Error(`AI answer rejected: ${d.lastError}`);
    h = hashEvents(h, d.drainEvents().map((q) => q.e));
  }
  return { id: `ai-${scId}-${seed}`, hash: h.toString(16), answers: d.answers.length, winner: String(d.state.winner) };
}

export const RANDOM_GAMES: [string, number][] = [['001', 11], ['002', 12], ['003', 13], ['005', 15], ['006', 16], ['007', 17], ['009', 19], ['010', 20], ['011', 21], ['015', 25]];
export const AI_GAMES: [string, number][] = [['002', 31], ['007', 32], ['010', 33]];

export function goldenGames(): Golden[] {
  return [...RANDOM_GAMES.map(([s, n]) => randomGame(s, n)), ...AI_GAMES.map(([s, n]) => aiGame(s, n))];
}
