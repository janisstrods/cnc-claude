// AI match runner / tournament.
// Usage: npx vite-node scripts/ai-match.ts -- --a tribune --b recruit [--games 2] [--scenarios 001,005] [--scale 1]
//        [--shard 0/4] [--random] [--bot greedy|turtle|sniper] [--det]
//   --random: side B plays uniformly random legal answers; --bot: side B is a scripted bot (tests/ai/bots.ts);
//   --det: deterministic AI (simulation counts bound the search). Opt-in regression check: tribune should beat the
//   greedy bot about 65% or more over 30 games. Strength A/Bs need a same-seed baseline (old-vs-old on the same
//   seeds): side and seed imbalance in this game is large.
import { GameDriver, bannerTotal, createGame, other, randomAnswer, type Side } from '../src/engine';
import { SCENARIOS, scenarioById } from '../src/scenarios';
import { personalityById, personalityFor, type AiOptions, type Difficulty } from '../src/ai';
import { weightsFor } from '../src/ai/values';
import { Bot, type Strategy } from '../tests/ai/bots';
import { arg, flag, jobSeed, lcg, playAiGame, shardJobs } from './lib';

const A = arg('a', 'tribune') as Difficulty;
const B = arg('b', 'recruit') as Difficulty;
const games = Number(arg('games', '1'));
const scale = Number(arg('scale', '1'));
const scaleB = Number(arg('scaleB', arg('scale', '1')));
const scen = arg('scenarios', SCENARIOS.map((s) => s.id).join(',')).split(',');
const randomB = flag('random');
const botB = arg('bot', '') as Strategy | '';
const det = flag('det');
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

const mine = shardJobs(scen, games);

let aWins = 0;
let bWins = 0;
const timeA: number[] = [];
const timeB: number[] = [];
for (const job of mine) {
  const info = scenarioById(job.sc);
  const seed = jobSeed(job, seedOffset);
  const d = new GameDriver(createGame(info.setup, seed));
  const bSide = other(job.aSide);
  const mk = (side: Side, diff: Difficulty, sc: number): AiOptions => ({
    side, difficulty: diff, personality: personalityFor(info.setup[side].commander, info.setup[side].army), seed: seed * 3 + (side === 'top' ? 1 : 2), budgetScale: sc,
    deterministic: det,
  });
  const optA = mk(job.aSide, A, scale);
  const optB = mk(bSide, B, scaleB);
  if (persA) optA.personality = personalityById(persA);
  if (persB) optB.personality = personalityById(persB);
  applyTune(optA, tuneA);
  applyTune(optB, tuneB);
  if (cfgA) optA.cfgPatch = JSON.parse(cfgA);
  if (cfgB) optB.cfgPatch = JSON.parse(cfgB);
  const rnd = lcg(seed);
  let rejects = 0;
  const bot = botB ? new Bot(botB, rnd) : null;
  playAiGame(d, { [job.aSide]: optA, [bSide]: optB } as Record<Side, AiOptions>, {
    maxTurn: 200,
    answer: (dec) => (dec.side === job.aSide ? undefined : bot ? bot.answer(d.state, dec) : randomB ? randomAnswer(d.state, dec, rnd) : undefined),
    planMs: (side, ms) => (side === job.aSide ? timeA : timeB).push(ms),
    rejected: (dec, ans) => {
      rejects++;
      console.log(`REJECT ${job.sc} ${dec.kind} ${d.lastError} ${JSON.stringify(ans)}`);
    },
    fallback: rnd,
  });
  const w = d.state.winner;
  if (w === job.aSide) aWins++;
  else if (w === bSide) bWins++;
  // banner totals: permanent + held (Expansion #2 objectives; the permanent banners elsewhere)
  console.log(`${job.sc} A(${A})=${job.aSide} vs B(${botB || (randomB ? 'random' : B)}) -> ${w === job.aSide ? 'A' : w === bSide ? 'B' : 'none'} ` +
    `${bannerTotal(d.state, job.aSide)}-${bannerTotal(d.state, bSide)} turns=${d.state.turn.number}${rejects ? ` rejects=${rejects}` : ''}`);
}
const avg = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);
const max = (x: number[]) => (x.length ? Math.max(...x) : 0);
console.log(`RESULT A=${A} wins ${aWins}, B=${botB || (randomB ? 'random' : B)} wins ${bWins}, games ${mine.length}`);
console.log(`TIME A turn plans (playCard, diceOrders) avg ${avg(timeA).toFixed(0)}ms max ${max(timeA).toFixed(0)}ms; B avg ${avg(timeB).toFixed(0)}ms max ${max(timeB).toFixed(0)}ms`);
