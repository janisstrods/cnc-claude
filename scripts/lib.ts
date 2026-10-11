// Shared plumbing for the dev scripts (scripts/ai-*.ts): command-line flags, the scripts' fallback generator, the
// tournament job list, and the AI-vs-AI game loop.
import { GameDriver, randomAnswer, type Answer, type Decision, type GameEvent, type Side } from '../src/engine';
import { chooseAnswer, newMemory, type AiMemory, type AiOptions } from '../src/ai';

/** The value after `--name` on the command line, or `def`. */
export function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

/** Is `--name` on the command line? */
export const flag = (name: string) => process.argv.includes(`--${name}`);

/** `--shard i/n`: this run plays the jobs i, i + n, i + 2n... (default 0/1, every job). */
export const shardArg = (): [number, number] => arg('shard', '0/1').split('/').map(Number) as [number, number];

/** The scripts' small seeded generator of floats in [0, 1) (random players, rejected-answer fallbacks). */
export function lcg(seed: number): () => number {
  let r = seed;
  return () => { r = (r * 1103515245 + 12345) % 2147483648; return r / 2147483648; };
}

/** One game of a tournament: a battle, the side side A plays, and the game's number. */
export interface Job { sc: string; aSide: Side; g: number }

/** Every battle `games` times, A as bottom and then as top, as `--shard` shares them out (ai-match, ai-balance). */
export function shardJobs(scenarios: string[], games: number): Job[] {
  const [shard, shards] = shardArg();
  const jobs: Job[] = [];
  for (const sc of scenarios) for (let g = 0; g < games; g++) for (const aSide of ['bottom', 'top'] as Side[]) jobs.push({ sc, aSide, g });
  return jobs.filter((_, i) => i % shards === shard);
}

/** A job's game seed (`--seedOffset` shifts the games to fresh seeds). */
export const jobSeed = (job: Job, seedOffset: number) => 1000 * Number(job.sc) + 17 * (job.g + seedOffset) + (job.aSide === 'top' ? 7 : 0);

export interface PlayHooks {
  /** The last turn played (default: no limit). */
  maxTurn?: number;
  /** Before each decision is answered. */
  before?: (dec: Decision) => void;
  /** An answer for the decision instead of its side's AI (undefined: the AI answers). */
  answer?: (dec: Decision) => Answer | undefined;
  /** The thinking time of an AI turn plan: a card decision, or a dice-order side's assignment of its order dice (310). */
  planMs?: (side: Side, ms: number) => void;
  /** Once the answer is chosen, before it is applied (`ai`: the AI's full result and memory, when the AI chose it). */
  chosen?: (dec: Decision, ans: Answer, ai?: { say?: string; mem: AiMemory }) => void;
  /** A rejected answer (`d.lastError` says why); with `fallback`, a random legal answer from it then replaces it. */
  rejected?: (dec: Decision, ans: Answer) => void;
  fallback?: () => number;
  /** After each answer, with the events it produced. */
  after?: (dec: Decision, events: GameEvent[]) => void;
}

/**
 * Play the game in `d` to the end (or past `maxTurn`, or 20000 decisions): each side's AI (`opts`, a memory per side)
 * answers its decisions unless `hooks.answer` does. Returns the memories.
 */
export function playAiGame(d: GameDriver, opts: Record<Side, AiOptions>, hooks: PlayHooks = {}): Record<Side, AiMemory> {
  const mems = { top: newMemory(), bottom: newMemory() };
  const maxTurn = hooks.maxTurn ?? Infinity;
  let steps = 0;
  while (!d.over && steps++ < 20000 && d.state.turn.number <= maxTurn) {
    const dec = d.pending!;
    hooks.before?.(dec);
    let ans = hooks.answer?.(dec);
    if (ans) hooks.chosen?.(dec, ans);
    else {
      const mem = mems[dec.side];
      const t0 = hooks.planMs ? performance.now() : 0;
      const res = chooseAnswer(d.state, dec, opts[dec.side], mem);
      if (hooks.planMs && (dec.kind === 'playCard' || dec.kind === 'diceOrders')) hooks.planMs(dec.side, performance.now() - t0);
      ans = res.answer;
      hooks.chosen?.(dec, ans, { say: res.say, mem });
    }
    if (!d.answer(ans)) {
      hooks.rejected?.(dec, ans);
      if (hooks.fallback) d.answer(randomAnswer(d.state, d.pending!, hooks.fallback));
    }
    const events = d.drainEvents().map((q) => q.e);
    hooks.after?.(dec, events);
  }
  return mems;
}
