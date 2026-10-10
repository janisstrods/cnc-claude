// AI-vs-AI balance runs with behaviour counters for the Expansion #1 units and rules.
// Usage: npx vite-node scripts/ai-balance.ts -- [--scenarios 101,110] [--games 2] [--a tribune] [--b tribune]
//        [--scale 0.5] [--shard 0/4] [--seedOffset 0] [--json out.json] [--persTop veteran] [--persBottom veteran]
//   Each game is played once per side assignment (A as bottom, then A as top), so with --a = --b the win rates
//   measure the battle's balance; with --a tribune --b recruit they measure strength. The counters flag silly play:
//   war machines abandoned, moved or left adjacent to the enemy; light bow cavalry closing on heavy units; camels
//   attacking horses; leaders lost in Hellespont; decision times.
import { writeFileSync } from 'node:fs';
import {
  GameDriver, UNIT_STATS, areAdjacent, canFireAt, cloneState, createGame, modsFor, randomAnswer, type GameState, type Side, type Unit,
} from '../src/engine';
import { SCENARIOS } from '../src/scenarios';
import { chooseAnswer, newMemory, personalityById, personalityFor, type AiOptions, type Difficulty } from '../src/ai';
import { Occ } from '../src/ai/board';
import { shotValue } from '../src/ai/estimate';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const A = arg('a', 'tribune') as Difficulty;
const B = arg('b', 'tribune') as Difficulty;
const games = Number(arg('games', '1'));
const scale = Number(arg('scale', '0.5'));
const scen = arg('scenarios', SCENARIOS.filter((s) => Number(s.id) > 100).map((s) => s.id).join(',')).split(',');
const [shard, shards] = arg('shard', '0/1').split('/').map(Number);
const seedOffset = Number(arg('seedOffset', '0'));
const jsonOut = arg('json', '');
// experiments: force a temperament on a side (default: the commander's own, personalityFor)
const persBy: Record<Side, string> = { top: arg('persTop', ''), bottom: arg('persBottom', '') };

interface Counters {
  hwmEvade: number; hwmAbandoned: number; hwmEliminated: number; hwmMoves: number; hwmShots: number; hwmClose: number;
  hwmAdjacentTurns: number; hwmTurns: number;
  /** Own turns starting with a war machine that has a target in range and sight, and how many of those it fired. */
  hwmCould: number; hwmCouldFired: number;
  /** ...of those, turns it was ordered, and fired when ordered. */
  hwmCouldOrdered: number; hwmOrderedFired: number;
  /** The AI's value (banners) of the best shot those machines had at the start of the turn, and of the ones it fired. */
  hwmCouldEV: number; hwmFiredEV: number;
  lbcShots: number; lbcClose: number; lbcCloseVsHeavy: number;
  camClose: number; camCloseVsHorse: number;
  leadersKilled: number;
}
const zero = (): Counters => ({
  hwmEvade: 0, hwmAbandoned: 0, hwmEliminated: 0, hwmMoves: 0, hwmShots: 0, hwmClose: 0, hwmAdjacentTurns: 0, hwmTurns: 0,
  hwmCould: 0, hwmCouldFired: 0, hwmCouldOrdered: 0, hwmOrderedFired: 0, hwmCouldEV: 0, hwmFiredEV: 0,
  lbcShots: 0, lbcClose: 0, lbcCloseVsHeavy: 0, camClose: 0, camCloseVsHorse: 0, leadersKilled: 0,
});

interface GameResult {
  sc: string; aSide: Side; seed: number; winner: string; banners: [number, number]; turns: number; reason: string;
  msA: number[]; msB: number[]; c: Counters;
  /** Leaders killed, by name (Alexander's fate, Hellespont). */
  killed: string[];
  /** War machine evades: attacker type and the machine's blocks. */
  hwmEvades: string[];
}

interface Job { sc: string; aSide: Side; g: number }
const jobs: Job[] = [];
for (const sc of scen) for (let g = 0; g < games; g++) for (const aSide of ['bottom', 'top'] as Side[]) jobs.push({ sc, aSide, g });
const mine = jobs.filter((_, i) => i % shards === shard);

function endOfTurn(s: GameState, side: Side, c: Counters) {
  for (const u of s.units) {
    if (u.side !== side || u.hex < 0 || u.type !== 'HWM') continue;
    c.hwmTurns++;
    if (s.units.some((e) => e.side !== side && e.hex >= 0 && areAdjacent(e.hex, u.hex))) c.hwmAdjacentTurns++;
  }
}

const results: GameResult[] = [];
for (const job of mine) {
  const info = SCENARIOS.find((x) => x.id === job.sc)!;
  const seed = 1000 * Number(job.sc) + 17 * (job.g + seedOffset) + (job.aSide === 'top' ? 7 : 0);
  const d = new GameDriver(createGame(info.setup, seed));
  const bSide: Side = job.aSide === 'top' ? 'bottom' : 'top';
  const mk = (side: Side, diff: Difficulty): AiOptions => ({
    side, difficulty: diff, seed: seed * 3 + (side === 'top' ? 1 : 2), budgetScale: scale,
    personality: persBy[side] ? personalityById(persBy[side]) : personalityFor(info.setup[side].commander, info.setup[side].army),
  });
  const opt = { [job.aSide]: mk(job.aSide, A), [bSide]: mk(bSide, B) } as Record<Side, AiOptions>;
  const mem = { top: newMemory(), bottom: newMemory() };
  const c = zero();
  const killed: string[] = [];
  const hwmEvades: string[] = [];
  const ms: Record<Side, number[]> = { top: [], bottom: [] };
  let r = seed;
  const rnd = () => { r = (r * 1103515245 + 12345) % 2147483648; return r / 2147483648; };
  let steps = 0;
  let turnSide: Side | null = null;
  let could = new Set<string>();
  const fired = new Set<string>();
  const couldEV = new Map<string, number>();
  const ordered = new Set<string>();
  const known = new Map<string, Unit>();
  for (const u of d.state.units) known.set(u.id, { ...u });
  const names = new Map(d.state.leaders.map((l) => [l.id, l.name]));
  /** Close the turn that just ended: machine-turn counters and the fire tally of machines that could shoot. */
  const closeTurn = () => {
    if (turnSide) endOfTurn(d.state, turnSide, c);
    for (const id of could) {
      if (fired.has(id)) {
        c.hwmCouldFired++;
        c.hwmFiredEV += couldEV.get(id) ?? 0;
      }
      if (ordered.has(id)) {
        c.hwmCouldOrdered++;
        if (fired.has(id)) c.hwmOrderedFired++;
      }
    }
    could = new Set();
    couldEV.clear();
  };
  while (!d.over && steps++ < 20000 && d.state.turn.number <= 200) {
    const dec = d.pending!;
    if (dec.kind === 'playCard') {
      closeTurn();
      turnSide = dec.side;
      fired.clear();
      ordered.clear();
      could = new Set(d.state.units.filter((u) => u.side === dec.side && u.hex >= 0 && u.type === 'HWM' &&
        d.state.units.some((e) => e.side !== dec.side && e.hex >= 0 && canFireAt(d.state, u, e.hex))).map((u) => u.id));
      c.hwmCould += could.size;
      if (could.size) {
        // the machine's best shot as an ordered unit sees it (an ordinary order card's modifiers)
        const sv = cloneState(d.state);
        sv.active = dec.side;
        sv.turn.mods = modsFor('order2C');
        const occ = new Occ(sv);
        for (const id of could) {
          const ev = shotValue(sv, occ, sv.units.find((u) => u.id === id)!, 0);
          couldEV.set(id, ev);
          c.hwmCouldEV += ev;
        }
      }
    }
    for (const u of d.state.units) known.set(u.id, { ...u });
    const t0 = performance.now();
    const ans = chooseAnswer(d.state, dec, opt[dec.side], mem[dec.side]).answer;
    if (dec.kind === 'playCard') ms[dec.side].push(performance.now() - t0);
    if (dec.kind === 'defend' && ans.kind === 'defend' && ans.choice === 'evade' && known.get(dec.target)?.type === 'HWM') {
      c.hwmEvade++;
      hwmEvades.push(`${known.get(dec.attacker)?.type}>${known.get(dec.target)?.blocks}`);
    }
    if (!d.answer(ans)) {
      console.log(`REJECT ${job.sc} ${dec.kind} ${d.lastError} ${JSON.stringify(ans)}`);
      d.answer(randomAnswer(d.state, d.pending!, rnd));
    }
    for (const { e } of d.drainEvents()) {
      if (e.t === 'removed' && known.get(e.id)?.type === 'HWM') c.hwmAbandoned++;
      else if (e.t === 'eliminated' && known.get(e.id)?.type === 'HWM') c.hwmEliminated++;
      else if (e.t === 'move' && e.path.length >= 2 && known.get(e.id)?.type === 'HWM') c.hwmMoves++;
      else if (e.t === 'ordered') for (const id of e.ids) ordered.add(id);
      else if (e.t === 'leaderKilled') {
        c.leadersKilled++;
        killed.push(names.get(e.id) ?? e.id);
      }
      else if (e.t === 'combat') {
        const a = known.get(e.attacker);
        const t = known.get(e.target);
        if (!a) continue;
        const close = e.purpose === 'close' || e.purpose === 'evade';
        if (a.type === 'HWM') {
          if (e.purpose === 'ranged') {
            c.hwmShots++;
            fired.add(a.id);
          }
          else if (close) c.hwmClose++;
        } else if (a.type === 'LBC') {
          if (e.purpose === 'ranged') c.lbcShots++;
          else if (close) {
            c.lbcClose++;
            if (t && UNIT_STATS[t.type].cls === 'heavy') c.lbcCloseVsHeavy++;
          }
        } else if (a.type === 'CAM' && close) {
          c.camClose++;
          if (t && (UNIT_STATS[t.type].cavalry || UNIT_STATS[t.type].chariot)) c.camCloseVsHorse++;
        }
      }
    }
  }
  closeTurn(); // the last turn (the battle ended in it, or the turn cap) counts too
  const w = d.state.winner;
  const ps = d.state.players;
  const res: GameResult = {
    sc: job.sc, aSide: job.aSide, seed, winner: w === null ? 'none' : String(w), banners: [ps.bottom.banners, ps.top.banners],
    turns: d.state.turn.number, reason: d.state.winReason, msA: ms[job.aSide], msB: ms[bSide], c, killed, hwmEvades,
  };
  results.push(res);
  const avg = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);
  const nz = Object.entries(c).filter(([, v]) => v).map(([k, v]) => `${k}=${Number.isInteger(v) ? v : v.toFixed(2)}`).join(' ');
  console.log(`${job.sc} A(${A})=${job.aSide} winner=${res.winner}${w === job.aSide ? '(A)' : w === bSide ? '(B)' : ''} ` +
    `bottom-top ${res.banners[0]}-${res.banners[1]} turns=${res.turns} msA=${avg(ms[job.aSide]).toFixed(0)} msB=${avg(ms[bSide]).toFixed(0)} ${nz}` +
    `${killed.length ? ` killed=${killed.join('/')}` : ''}${hwmEvades.length ? ` hwmEvades=${hwmEvades.join('/')}` : ''}${/leaders have fallen/.test(res.reason) ? ' (all leaders fell)' : ''}`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results));
const aW = results.filter((x) => x.winner === x.aSide).length;
const bW = results.filter((x) => x.winner !== 'none' && x.winner !== 'draw' && x.winner !== x.aSide).length;
console.log(`RESULT A=${A} wins ${aW}, B=${B} wins ${bW}, games ${results.length}`);
