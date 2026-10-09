// AI match runner / tournament.
// Usage: npx vite-node scripts/ai-match.ts -- --a tribune --b recruit [--games 2] [--scenarios 001,005] [--scale 1]
//        [--shard 0/4] [--random]   (--random: side B plays uniformly random legal answers)
import { GameDriver, createGame, randomAnswer, type Side } from '../src/engine';
import { SCENARIOS } from '../src/scenarios';
import { chooseAnswer, newMemory, personalityById, personalityFor, type AiMemory, type AiOptions, type Difficulty } from '../src/ai';
import { weightsFor } from '../src/ai/values';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const A = arg('a', 'tribune') as Difficulty;
const B = arg('b', 'recruit') as Difficulty;
const games = Number(arg('games', '1'));
const scale = Number(arg('scale', '1'));
const scaleB = Number(arg('scaleB', arg('scale', '1')));
const scen = arg('scenarios', SCENARIOS.map((s) => s.id).join(',')).split(',');
const [shard, shards] = arg('shard', '0/1').split('/').map(Number);
const randomB = flag('random');
const seedOffset = Number(arg('seedOffset', '0'));
// --tuneA '{"riskSelf":0.5}' --tuneB '{...}' : weight overrides; values in the form "*0.5" multiply the default.
const tuneA = arg('tuneA', '');
const tuneB = arg('tuneB', '');
const persA = arg('persA', '');
const persB = arg('persB', '');
const cfgA = arg('cfgA', '');
const cfgB = arg('cfgB', '');
function applyTune(o: AiOptions, spec: string) {
  if (!spec) return;
  const base = weightsFor(o.personality) as unknown as Record<string, number>;
  const raw = JSON.parse(spec) as Record<string, number | string>;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) out[k] = typeof v === 'string' && v.startsWith('*') ? base[k] * Number(v.slice(1)) : Number(v);
  o.tune = out;
}

interface Job { sc: string; aSide: Side; g: number }
const jobs: Job[] = [];
for (const sc of scen) for (let g = 0; g < games; g++) for (const aSide of ['bottom', 'top'] as Side[]) jobs.push({ sc, aSide, g });
const mine = jobs.filter((_, i) => i % shards === shard);

let aWins = 0;
let bWins = 0;
const timeA: number[] = [];
const timeB: number[] = [];
for (const job of mine) {
  const info = SCENARIOS.find((x) => x.id === job.sc)!;
  const seed = 1000 * Number(job.sc) + 17 * (job.g + seedOffset) + (job.aSide === 'top' ? 7 : 0);
  const d = new GameDriver(createGame(info.setup, seed));
  const bSide: Side = job.aSide === 'top' ? 'bottom' : 'top';
  const mk = (side: Side, diff: Difficulty, sc: number): AiOptions => ({
    side, difficulty: diff, personality: personalityFor(info.setup[side].commander, info.setup[side].army), seed: seed * 3 + (side === 'top' ? 1 : 2), budgetScale: sc,
  });
  const optA = mk(job.aSide, A, scale);
  const optB = mk(bSide, B, scaleB);
  if (persA) optA.personality = personalityById(persA);
  if (persB) optB.personality = personalityById(persB);
  applyTune(optA, tuneA);
  applyTune(optB, tuneB);
  if (cfgA) optA.cfgPatch = JSON.parse(cfgA);
  if (cfgB) optB.cfgPatch = JSON.parse(cfgB);
  const memA: AiMemory = newMemory();
  const memB: AiMemory = newMemory();
  let r = seed;
  const rnd = () => { r = (r * 1103515245 + 12345) % 2147483648; return r / 2147483648; };
  let steps = 0;
  let rejects = 0;
  while (!d.over && steps++ < 20000) {
    const dec = d.pending!;
    const isA = dec.side === job.aSide;
    let ans;
    if (!isA && randomB) ans = randomAnswer(d.state, dec, rnd);
    else {
      const t0 = performance.now();
      ans = chooseAnswer(d.state, dec, isA ? optA : optB, isA ? memA : memB).answer;
      if (dec.kind === 'playCard') (isA ? timeA : timeB).push(performance.now() - t0);
    }
    if (!d.answer(ans)) {
      rejects++;
      console.log(`REJECT ${job.sc} ${dec.kind} ${d.lastError} ${JSON.stringify(ans)}`);
      d.answer(randomAnswer(d.state, d.pending!, rnd));
    }
  }
  const w = d.state.winner;
  if (w === job.aSide) aWins++;
  else if (w === bSide) bWins++;
  const ps = d.state.players;
  console.log(`${job.sc} A(${A})=${job.aSide} vs B(${randomB ? 'random' : B}) -> ${w === job.aSide ? 'A' : w === bSide ? 'B' : 'none'} ` +
    `${ps[job.aSide].banners}-${ps[bSide].banners} turns=${d.state.turn.number}${rejects ? ` rejects=${rejects}` : ''}`);
}
const avg = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);
const max = (x: number[]) => (x.length ? Math.max(...x) : 0);
console.log(`RESULT A=${A} wins ${aWins}, B=${randomB ? 'random' : B} wins ${bWins}, games ${mine.length}`);
console.log(`TIME A playCard avg ${avg(timeA).toFixed(0)}ms max ${max(timeA).toFixed(0)}ms; B avg ${avg(timeB).toFixed(0)}ms max ${max(timeB).toFixed(0)}ms`);
