// Self-play data for calibrating the evaluation (position features + final result), one JSON row per line.
// Usage: npx vite-node scripts/ai-datagen.ts -- --games 20 --shard 0/6 --out data.jsonl [--scale 0.2]
import { appendFileSync, writeFileSync } from 'node:fs';
import { GameDriver, createGame, type Side } from '../src/engine';
import { SCENARIOS } from '../src/scenarios';
import { PERSONALITIES, chooseAnswer, newMemory, type AiOptions } from '../src/ai';
import { rawFeatures } from '../src/ai/evaluate';
import { NEUTRAL_W } from '../src/ai/values';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const games = Number(arg('games', '10'));
const [shard, shards] = arg('shard', '0/1').split('/').map(Number);
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
  const mems = { top: newMemory(), bottom: newMemory() };
  const rows: { f: Record<string, number>; side: Side; turn: number }[] = [];
  let steps = 0;
  while (!d.over && steps++ < 20000) {
    const dec = d.pending!;
    if (dec.kind === 'playCard') {
      const s = d.state;
      const mover = dec.side;
      const other: Side = mover === 'top' ? 'bottom' : 'top';
      rows.push({ f: rawFeatures(s, mover, mover, NEUTRAL_W), side: mover, turn: s.turn.number });
      rows.push({ f: rawFeatures(s, other, mover, NEUTRAL_W), side: other, turn: s.turn.number });
    }
    const r = chooseAnswer(d.state, dec, opts[dec.side], mems[dec.side]);
    d.answer(r.answer);
  }
  const w = d.state.winner;
  if (w !== 'top' && w !== 'bottom') continue;
  const lines = rows.map((r) => JSON.stringify({ sc: sc.id, side: r.side, turn: r.turn, y: r.side === w ? 1 : 0, f: r.f })).join('\n');
  appendFileSync(out, lines + '\n');
  console.log(`game ${g} ${sc.id} winner ${w} turns ${d.state.turn.number}`);
}
