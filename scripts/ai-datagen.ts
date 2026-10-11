// Self-play data for calibrating the evaluation (position features + final result), one JSON row per line.
// Usage: npx vite-node scripts/ai-datagen.ts -- --games 20 --shard 0/6 --out data.jsonl [--scale 0.2]
import { appendFileSync, writeFileSync } from 'node:fs';
import { GameDriver, createGame, type Side } from '../src/engine';
import { SCENARIOS } from '../src/scenarios';
import { PERSONALITIES, type AiOptions } from '../src/ai';
import { rawFeatures } from '../src/ai/evaluate';
import { NEUTRAL_W } from '../src/ai/values';
import { arg, playAiGame, shardArg } from './lib';

const games = Number(arg('games', '10'));
const [shard, shards] = shardArg();
const out = arg('out', 'data.jsonl');
const scale = Number(arg('scale', '0.2'));
const diff = arg('diff', 'tribune') as AiOptions['difficulty'];
writeFileSync(out, '');
for (let g = shard; g < games * shards; g += shards) {
  const sc = SCENARIOS[g % SCENARIOS.length];
  const seed = 7919 * g + 13;
  const d = new GameDriver(createGame(sc.setup, seed));
  const opts: Record<Side, AiOptions> = {
    top: { side: 'top', difficulty: diff, personality: PERSONALITIES[(g * 7) % PERSONALITIES.length], seed: seed + 1, budgetScale: scale },
    bottom: { side: 'bottom', difficulty: diff, personality: PERSONALITIES[(g * 3 + 1) % PERSONALITIES.length], seed: seed + 2, budgetScale: scale },
  };
  const rows: { f: Record<string, number>; side: Side; turn: number }[] = [];
  playAiGame(d, opts, {
    before: (dec) => {
      if (dec.kind !== 'playCard') return;
      const s = d.state;
      const mover = dec.side;
      const other: Side = mover === 'top' ? 'bottom' : 'top';
      rows.push({ f: rawFeatures(s, mover, mover, NEUTRAL_W), side: mover, turn: s.turn.number });
      rows.push({ f: rawFeatures(s, other, mover, NEUTRAL_W), side: other, turn: s.turn.number });
    },
  });
  const w = d.state.winner;
  if (w !== 'top' && w !== 'bottom') continue;
  const lines = rows.map((r) => JSON.stringify({ sc: sc.id, side: r.side, turn: r.turn, y: r.side === w ? 1 : 0, f: r.f })).join('\n');
  appendFileSync(out, lines + '\n');
  console.log(`game ${g} ${sc.id} winner ${w} turns ${d.state.turn.number}`);
}
