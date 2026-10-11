// AI-vs-AI balance runs with behaviour counters for the Expansion #1, #2 and #3 units and rules.
// Usage: npx vite-node scripts/ai-balance.ts -- [--scenarios 101,110 | --expansion exp2 | --expansion exp3] [--games 2] [--a tribune]
//        [--b tribune] [--scale 0.5] [--shard 0/4] [--seedOffset 0] [--json out.json] [--persTop veteran] [--persBottom veteran]
//   Each game is played once per side assignment (A as bottom, then A as top), so with --a = --b the win rates
//   measure the battle's balance; with --a tribune --b recruit they measure strength. Without --scenarios every battle of
//   --expansion (default exp1) is played. The counters flag silly play: war machines abandoned, moved or left adjacent
//   to the enemy; light bow cavalry closing on heavy units; camels attacking horses; leaders lost in Hellespont; decision
//   times; AI answers replaced by the fallback (AI bugs). Expansion #2 battles add their own counters (`X2`, below):
//   Rolling Fire, exits, camps captured, held banners, pilum throws, 2-hex infantry moves with Caesar, commands named,
//   ambush entries, last-row losses, ramparts broken. Expansion #3 battles count those too, and their own (`X3`, below):
//   city walls climbed, assaulted and defended with the first strike, dice-order turns and faces, the victims of their flags
//   and swords, forced placements, reinforcements entered, ships taken, leader exits, immobile units moved (always 0).
//   Banners are banner totals (permanent + held; the same as permanent banners outside Expansions #2 and #3). Decision
//   times are the turn plans: the card decisions, and a dice-order side's order assignment (310).
import { writeFileSync } from 'node:fs';
import {
  GameDriver, OFF_BOARD, UNIT_STATS, areAdjacent, bannerTotal, canFireAt, cloneState, createGame, diceOrderPieces, hasPilum, heldBanners,
  isWall, leaderHas, modsFor, other, retreatOptions, retreatPerFlag, validateDiceOrders, type Answer, type Decision, type DieFace,
  type GameEvent, type GameState, type Side, type Unit,
} from '../src/engine';
import { SCENARIOS, scenarioById } from '../src/scenarios';
import { personalityById, personalityFor, type AiOptions, type Difficulty } from '../src/ai';
import { Occ } from '../src/ai/board';
import { shotValue } from '../src/ai/estimate';
import { arg, jobSeed, lcg, playAiGame, shardJobs } from './lib';

const A = arg('a', 'tribune') as Difficulty;
const B = arg('b', 'tribune') as Difficulty;
const games = Number(arg('games', '1'));
const scale = Number(arg('scale', '0.5'));
const expansion = arg('expansion', 'exp1');
const scen = arg('scenarios', SCENARIOS.filter((s) => s.expansion === expansion).map((s) => s.id).join(',')).split(',');
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
  /** AI answers that were illegal (or threw) and were replaced by a fallback (`AiMemory.fallbacks`): AI bugs. */
  aiFallbacks: number;
}
const zero = (): Counters => ({
  hwmEvade: 0, hwmAbandoned: 0, hwmEliminated: 0, hwmMoves: 0, hwmShots: 0, hwmClose: 0, hwmAdjacentTurns: 0, hwmTurns: 0,
  hwmCould: 0, hwmCouldFired: 0, hwmCouldOrdered: 0, hwmOrderedFired: 0, hwmCouldEV: 0, hwmFiredEV: 0,
  lbcShots: 0, lbcClose: 0, lbcCloseVsHeavy: 0, camClose: 0, camCloseVsHorse: 0, leadersKilled: 0, aiFallbacks: 0,
});

/**
 * Expansion #2 counters (added to a game's counters in Expansion #2 battles only, so Expansion #1 output is unchanged).
 * Rolling Fire: uses, rolls against enemy and own units; exits; turn-start / stop captures; held banners summed over the
 * turn ends (top, bottom) and wins whose total included held banners; pilum throws; 2-hex infantry moves ending on
 * Caesar's hex (his forced march, also Double Time) and the Tenth Legion's 2-hex moves; commands named; ambush entries;
 * units lost to last-row retreat; ramparts broken.
 */
interface X2 {
  rollingFire: number; rollingFireVsEnemy: number; rollingFireVsOwn: number; exits: number; camps: number;
  heldTop: number; heldBottom: number; heldWins: number; pilumShots: number; caesarMarches: number; marches: number;
  chooseCommand: number; ambush: number; lastRow: number; ramparts: number;
}
const zeroX2 = (): X2 => ({
  rollingFire: 0, rollingFireVsEnemy: 0, rollingFireVsOwn: 0, exits: 0, camps: 0, heldTop: 0, heldBottom: 0, heldWins: 0,
  pilumShots: 0, caesarMarches: 0, marches: 0, chooseCommand: 0, ambush: 0, lastRow: 0, ramparts: 0,
});

/**
 * Expansion #3 counters (Expansion #3 battles only). City walls: units climbing onto a wall hex (move or momentum advance),
 * close combats against a unit on a wall (by mounted units too), first strikes from a wall. Dice orders (310): order turns,
 * faces rolled, faces that could order a piece together (`usableFaces`), faces used; flag and swords victims chosen, flag
 * victims whose retreat was blocked (and of them, ones chosen although a unit with a free retreat existed), swords victims
 * on their last block (and avoidably so). Forced placements made, and of them on the first offered hex; reinforcement units
 * entered; ships taken; leader exits (317); moves of immobile units (306, never expected).
 */
interface X3 {
  wallClimbs: number; wallAssaults: number; wallAssaultsMounted: number; wallFirstStrikes: number;
  diceTurns: number; diceFaces: number; diceFacesUsable: number; diceFacesUsed: number;
  victims: number; victimsBlocked: number; victimsBlockedAvoidable: number; victimsLastBlock: number; victimsLastBlockAvoidable: number;
  placements: number; placementsFirst: number; reinforcements: number; ships: number; leaderExits: number; immobileMoves: number;
}
const zeroX3 = (): X3 => ({
  wallClimbs: 0, wallAssaults: 0, wallAssaultsMounted: 0, wallFirstStrikes: 0, diceTurns: 0, diceFaces: 0, diceFacesUsable: 0,
  diceFacesUsed: 0, victims: 0, victimsBlocked: 0, victimsBlockedAvoidable: 0, victimsLastBlock: 0, victimsLastBlockAvoidable: 0,
  placements: 0, placementsFirst: 0, reinforcements: 0, ships: 0, leaderExits: 0, immobileMoves: 0,
});

/** The most faces of a dice-order roll that can order a piece together (two equal faces need two units; a helmet's unit). */
function usableFaces(s: GameState, side: Side, faces: DieFace[]): number {
  let best = 0;
  const ids: (string | null)[] = faces.map(() => null);
  const walk = (i: number, n: number) => {
    if (i === faces.length) {
      if (!validateDiceOrders(s, side, faces, ids)) best = Math.max(best, n);
      return;
    }
    ids[i] = null;
    walk(i + 1, n);
    for (const id of diceOrderPieces(s, side, faces[i])) {
      ids[i] = id;
      walk(i + 1, n + 1);
    }
    ids[i] = null;
  };
  walk(0, 0);
  return best;
}

/** Count one decision and its answer for the Expansion #3 counters (before the answer is applied). */
function countX3Decision(x: X3, s: GameState, dec: Decision, ans: Answer) {
  if (dec.kind === 'diceOrders' && ans.kind === 'assign') {
    x.diceTurns++;
    x.diceFaces += dec.faces.length;
    x.diceFacesUsable += usableFaces(s, dec.side, dec.faces);
    x.diceFacesUsed += ans.ids.filter((id) => id !== null).length;
  } else if (dec.kind === 'diceVictim' && ans.kind === 'choose') {
    x.victims++;
    const units = dec.options.map((id) => s.units.find((u) => u.id === id)!);
    const u = units[ans.index];
    if (dec.face === 'flag') {
      const blocked = (v: Unit) => Math.min(...retreatOptions(s, v, retreatPerFlag(v, null)).map((o) => o.losses)) > 0;
      if (blocked(u)) {
        x.victimsBlocked++;
        if (units.some((v) => !blocked(v))) x.victimsBlockedAvoidable++;
      }
    } else if (u.blocks === 1) {
      x.victimsLastBlock++;
      if (units.some((v) => v.blocks > 1)) x.victimsLastBlockAvoidable++;
    }
  } else if (dec.kind === 'placeUnit' && ans.kind === 'hex') {
    x.placements++;
    if (ans.hex === dec.options[0]) x.placementsFirst++;
  }
}

/** Count one engine event for the Expansion #3 counters (`known`: the units as they stood before the answer). */
function countX3(x: X3, s: GameState, e: GameEvent, known: Map<string, Unit>) {
  if ((e.t === 'move' || e.t === 'advance') && known.has(e.id)) {
    const end = e.path[e.path.length - 1];
    if (end >= 0 && isWall(s, end) && e.path.length >= 2) x.wallClimbs++;
    if (e.t === 'move' && known.get(e.id)!.immobile && e.path.length >= 2) x.immobileMoves++;
  } else if (e.t === 'combat' && (e.purpose === 'close' || e.purpose === 'bonus')) {
    const t = known.get(e.target);
    const a = known.get(e.attacker);
    if (t && t.hex >= 0 && isWall(s, t.hex) && a) {
      x.wallAssaults++;
      if (!UNIT_STATS[a.type].infantry) x.wallAssaultsMounted++;
    }
  } else if (e.t === 'log' && /strikes first from the wall/.test(e.text)) x.wallFirstStrikes++;
  else if (e.t === 'reserveEnter') x.reinforcements++;
  else if (e.t === 'banner' && e.reason === 'ship taken') x.ships++;
  else if (e.t === 'banner' && e.reason === 'leader exited') x.leaderExits++;
}

interface GameResult {
  sc: string; aSide: Side; seed: number; winner: string; banners: [number, number]; turns: number; reason: string;
  msA: number[]; msB: number[]; c: Counters & Partial<X2> & Partial<X3>;
  /** Leaders killed, by name (Alexander's fate, Hellespont). */
  killed: string[];
  /** War machine evades: attacker type and the machine's blocks. */
  hwmEvades: string[];
}

const mine = shardJobs(scen, games);

function endOfTurn(s: GameState, side: Side, c: Counters) {
  for (const u of s.units) {
    if (u.side !== side || u.hex < 0 || u.type !== 'HWM') continue;
    c.hwmTurns++;
    if (s.units.some((e) => e.side !== side && e.hex >= 0 && areAdjacent(e.hex, u.hex))) c.hwmAdjacentTurns++;
  }
}

/** Count one engine event for the Expansion #2 counters (`terrainBefore`: the terrain before the answer). */
function countX2(x: X2, s: GameState, e: GameEvent, known: Map<string, Unit>, terrainBefore: GameState['terrain']) {
  if (e.t === 'combat') {
    const a = known.get(e.attacker);
    const t = known.get(e.target);
    if (e.purpose === 'rollingFire' && a && t) {
      if (t.side === a.side) x.rollingFireVsOwn++;
      else x.rollingFireVsEnemy++;
    } else if (e.purpose === 'ranged' && a && hasPilum(a) && UNIT_STATS[a.type].range === 0) x.pilumShots++;
  } else if (e.t === 'move' && known.has(e.id)) {
    const u = known.get(e.id)!;
    if (e.path[e.path.length - 1] === OFF_BOARD) x.exits++;
    else if (e.path.length === 3 && UNIT_STATS[u.type].infantry) {
      const end = e.path[2];
      if (s.leaders.some((l) => l.hex === end && l.side === u.side && leaderHas(l, 'forcedMarch'))) x.caesarMarches++;
      else if (u.elite === 'tenthLegion' || u.legion === 'julian') x.marches++;
    }
  } else if (e.t === 'reserveEnter') x.ambush++;
  else if (e.t === 'log' && /no ground left to retreat/.test(e.text)) x.lastRow++;
  else if (e.t === 'terrainChanged' && terrainBefore[e.hex] === 'rampart' && e.terrain === 'plain' &&
    !s.special.objectives.some((o) => o.kind === 'capture' && o.hexes.includes(e.hex))) x.ramparts++;
}

const results: GameResult[] = [];
for (const job of mine) {
  const info = scenarioById(job.sc);
  const seed = jobSeed(job, seedOffset);
  const d = new GameDriver(createGame(info.setup, seed));
  const bSide = other(job.aSide);
  const mk = (side: Side, diff: Difficulty): AiOptions => ({
    side, difficulty: diff, seed: seed * 3 + (side === 'top' ? 1 : 2), budgetScale: scale,
    personality: persBy[side] ? personalityById(persBy[side]) : personalityFor(info.setup[side].commander, info.setup[side].army),
  });
  const opt = { [job.aSide]: mk(job.aSide, A), [bSide]: mk(bSide, B) } as Record<Side, AiOptions>;
  const c = zero();
  // the Expansion #2 counters serve Expansion #3 too (pilum, march, Caesar, exits, captures, held banners, commands)
  const x2 = info.expansion === 'exp2' || info.expansion === 'exp3' ? zeroX2() : null;
  const x3 = info.expansion === 'exp3' ? zeroX3() : null;
  const takenNow = () => d.state.special.objState.reduce((n, st) => n + st.taken.length, 0);
  let taken = takenNow();
  const killed: string[] = [];
  const hwmEvades: string[] = [];
  const ms: Record<Side, number[]> = { top: [], bottom: [] };
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
    if (x2 && turnSide) {
      x2.heldTop += heldBanners(d.state, 'top');
      x2.heldBottom += heldBanners(d.state, 'bottom');
    }
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
  let terrainBefore = d.state.terrain;
  const mems = playAiGame(d, opt, {
    maxTurn: 200,
    before: (dec) => {
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
      if (x2) {
        const now = takenNow();
        if (now > taken) x2.camps += now - taken;
        taken = now;
      }
    },
    planMs: (side, t) => ms[side].push(t),
    chosen: (dec, ans) => {
      if (x3) countX3Decision(x3, d.state, dec, ans);
      if (x2 && ans.kind === 'rollingFire') x2.rollingFire++;
      if (x2 && dec.kind === 'chooseCommand') x2.chooseCommand++;
      terrainBefore = d.state.terrain;
      if (dec.kind === 'defend' && ans.kind === 'defend' && ans.choice === 'evade' && known.get(dec.target)?.type === 'HWM') {
        c.hwmEvade++;
        hwmEvades.push(`${known.get(dec.attacker)?.type}>${known.get(dec.target)?.blocks}`);
      }
    },
    rejected: (dec, ans) => console.log(`REJECT ${job.sc} ${dec.kind} ${d.lastError} ${JSON.stringify(ans)}`),
    fallback: lcg(seed),
    after: (_, events) => {
      for (const e of events) {
        if (x2) countX2(x2, d.state, e, known, terrainBefore);
        if (x3) countX3(x3, d.state, e, known);
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
    },
  });
  c.aiFallbacks = (mems.top.fallbacks ?? 0) + (mems.bottom.fallbacks ?? 0);
  closeTurn(); // the last turn (the battle ended in it, or the turn cap) counts too
  if (x2) x2.camps += takenNow() - taken; // a capture that ended the battle
  const w = d.state.winner;
  if (x2 && (w === 'top' || w === 'bottom') && heldBanners(d.state, w) > 0) x2.heldWins++;
  const res: GameResult = {
    sc: job.sc, aSide: job.aSide, seed, winner: w === null ? 'none' : String(w),
    banners: [bannerTotal(d.state, 'bottom'), bannerTotal(d.state, 'top')],
    turns: d.state.turn.number, reason: d.state.winReason, msA: ms[job.aSide], msB: ms[bSide], c: { ...c, ...(x2 ?? {}), ...(x3 ?? {}) }, killed, hwmEvades,
  };
  results.push(res);
  const avg = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);
  const nz = Object.entries(res.c).filter(([, v]) => v).map(([k, v]) => `${k}=${Number.isInteger(v) ? v : v.toFixed(2)}`).join(' ');
  console.log(`${job.sc} A(${A})=${job.aSide} winner=${res.winner}${w === job.aSide ? '(A)' : w === bSide ? '(B)' : ''} ` +
    `bottom-top ${res.banners[0]}-${res.banners[1]} turns=${res.turns} msA=${avg(ms[job.aSide]).toFixed(0)} msB=${avg(ms[bSide]).toFixed(0)} ${nz}` +
    `${killed.length ? ` killed=${killed.join('/')}` : ''}${hwmEvades.length ? ` hwmEvades=${hwmEvades.join('/')}` : ''}${/leaders have fallen/.test(res.reason) ? ' (all leaders fell)' : ''}`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results));
const aW = results.filter((x) => x.winner === x.aSide).length;
const bW = results.filter((x) => x.winner !== 'none' && x.winner !== 'draw' && x.winner !== x.aSide).length;
console.log(`RESULT A=${A} wins ${aW}, B=${B} wins ${bW}, games ${results.length}`);
