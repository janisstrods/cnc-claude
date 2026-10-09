// Fast decision policies: battle choice, defence, flags, retreats, leader evasion, momentum, bonus combat, rally.
// Used both for live answers and inside Monte-Carlo simulations (for both sides).
import { closeCombatDice, retreatPerFlag } from '../engine/combat';
import { capturableCamp } from '../engine/flow';
import { neighbours } from '../engine/hex';
import { rallyCandidates, validateRally, validateSpartacus } from '../engine/orders';
import { leaderById, other, unitById } from '../engine/query';
import { retreatOptions, type ElephantRetreatOption } from '../engine/retreat';
import { rangeOf } from '../engine/elites';
import { terrainAt } from '../engine/terrain';
import { UNIT_STATS, bonusCombatEligible, escapeDice, forestFighter } from '../engine/units';
import {
  OFF_BOARD, type Answer, type Decision, type DieFace, type GameState, type HexId, type RetreatOption, type Side, type Unit,
} from '../engine/types';
import { Occ, attachedLeaderOcc, enemyUnitsAdjacent, hexDist } from './board';
import { pAnyHelmet } from './dice';
import {
  attackOptions, closeAttackEV, closeProfile, dmgValue, evadeEV, leaderAttackEV, momentumValue, standEV, strikeValue, type AttackOpt,
} from './estimate';
import { battered, evaluate } from './evaluate';
import { pieceBenefits } from './ordering';
import type { Rng } from './rand';
import { WIN_SCORE, blockVal, leaderVal, nextBanner, type Weights } from './values';

type D<K extends Decision['kind']> = Extract<Decision, { kind: K }>;

// ---------------------------------------------------------------------------
// battle
// ---------------------------------------------------------------------------

export function pickAttack(opts: AttackOpt[], W: Weights, rng?: Rng, noise = 0): AttackOpt | null {
  if (!opts.length) return null;
  const must = opts.filter((o) => o.must);
  const pool = must.length ? must : opts;
  let best: AttackOpt | null = null;
  let bestScore = -Infinity;
  for (const o of pool) {
    let sc = o.ev + (o.kind === 'ranged' ? 0.004 : 0) + 0.15 * o.pElim;
    if (noise && rng) sc += noise * rng.normal();
    if (sc > bestScore) {
      bestScore = sc;
      best = o;
    }
  }
  if (!best) return null;
  if (!must.length) {
    const thr = best.kind === 'ranged' ? 0.001 : W.attackThreshold - 0.08;
    if (bestScore < thr) return null;
  }
  return best;
}

/** Greedy battle phase choice: the attack with the best estimated value, or end the phase. */
export function greedyBattle(s: GameState, W: Weights, rng?: Rng, noise = 0): Answer {
  const best = pickAttack(attackOptions(s, W), W, rng, noise);
  if (!best) return { kind: 'endBattle' };
  return { kind: 'attack', unit: best.unit, target: best.target };
}

// ---------------------------------------------------------------------------
// defence
// ---------------------------------------------------------------------------

/**
 * Stand, evade or play First Strike. `fsKeepScale` scales the value of keeping First Strike for later (it shrinks the
 * longer the card has sat in hand and the fewer sound units are in contact to use it on).
 */
export function defendChoice(s: GameState, d: D<'defend'>, W: Weights, fsKeepScale = 1): 'stand' | 'evade' | 'firstStrike' {
  const a = unitById(s, d.attacker);
  const t = unitById(s, d.target);
  if (!a || !t) return 'stand';
  const occ = new Occ(s);
  const role = d.bonus ? 'bonus' : 'attack';
  const n = closeCombatDice(s, a, t, { role, fullAtStart: a.blocks === a.maxBlocks, ordered: true });
  const mom = momentumValue(s, occ, a, role, W);
  // values from the defender's point of view
  const stand = -standEV(s, occ, a, t, n, mom).ev;
  let best: 'stand' | 'evade' | 'firstStrike' = 'stand';
  let bestVal = stand;
  if (d.canEvade) {
    // evading abandons the line (neighbours lose support) but denies battle back and momentum
    const lineCost = 0.02 + 0.01 * enemyUnitsAdjacent(occ, t.hex, t.side);
    const ev = -evadeEV(s, occ, a, t, n).ev - lineCost + W.evadeBias;
    if (ev > bestVal) {
      best = 'evade';
      bestVal = ev;
    }
  }
  if (d.canFirstStrike) {
    const nb = closeCombatDice(s, t, a, { role: 'firstStrike', fullAtStart: t.blocks === t.maxBlocks, ordered: false });
    const fs = strikeValue(s, occ, t, a, closeProfile(s, occ, t, a, nb, 'firstStrike'), 'close');
    const pStop = Math.min(1, fs.pElim + fs.pRetreat);
    const after = standEV(s, occ, a, t, n, mom, 0).ev; // attacker strikes, no battle back
    const keep = 0.3 * W.retention * fsKeepScale;
    const val = fs.ev - (1 - pStop) * after - keep;
    if (val > bestVal + 0.02) {
      best = 'firstStrike';
      bestVal = val;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// trial helpers (temporarily move pieces, evaluate, restore)
// ---------------------------------------------------------------------------

/** Evaluate with unit u (and its attached leader) moved to `to` (OFF_BOARD = removed) and `loss` blocks lost. */
function evalUnitAt(s: GameState, u: Unit, to: HexId, loss: number, W: Weights, next: Side): number {
  const occ = new Occ(s);
  const l = attachedLeaderOcc(occ, u);
  const from = u.hex;
  const blocks = u.blocks;
  const lFrom = l?.hex;
  if (loss >= u.blocks) {
    // treat as eliminated
    u.hex = OFF_BOARD;
    if (l) l.hex = OFF_BOARD;
    const v = evaluate(s, u.side, next, W) - nextBanner(s, other(u.side)) - (l ? 0.2 : 0);
    u.hex = from;
    if (l) l.hex = lFrom!;
    return v;
  }
  u.hex = to;
  u.blocks = blocks - loss;
  if (l) l.hex = to;
  const v = evaluate(s, u.side, next, W);
  u.hex = from;
  u.blocks = blocks;
  if (l) l.hex = lFrom!;
  return v;
}

/** Choose a retreat / evade destination. */
export function chooseRetreat(s: GameState, d: D<'retreat'>, W: Weights): number {
  const u = unitById(s, d.unit);
  if (!u || d.options.length <= 1) return 0;
  const next = other(u.side);
  let best = 0;
  let bestV = -Infinity;
  d.options.forEach((o, i) => {
    let v = evalUnitAt(s, u, o.end, o.losses, W, next);
    const eo = o as ElephantRetreatOption;
    if (eo.blockers) {
      const occ = new Occ(s);
      for (const b of eo.blockers) {
        const bu = unitById(s, b.id);
        if (bu) v += (bu.side === u.side ? -1 : 1) * dmgValue(s, occ, bu, b.n, nextBanner(s, other(bu.side)));
        else {
          const bl = leaderById(s, b.id);
          if (bl) v += (bl.side === u.side ? -1 : 1) * (nextBanner(s, other(bl.side)) + leaderVal(s, bl));
        }
      }
    }
    for (const h of o.path) if (h >= 0 && terrainAt(s, h) === 'marsh') v -= blockVal(u) / 6;
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  });
  return best;
}

/**
 * Chance a lone leader standing on `h` survives the rest of the enemy's current battle phase: ordered enemy units that
 * can still battle and are adjacent (or in range), plus a unit that just won a close combat next to the hex the leader
 * is leaving (it may advance into it and make a bonus close combat against him).
 */
function survivesActiveTurn(s: GameState, l: { side: Side; hex: HexId }, h: HexId, from: HexId): number {
  if (s.active === l.side) return 1;
  let surv = 1;
  const occ = new Occ(s);
  for (const id in s.turn.ordered) {
    const op = s.turn.ordered[id];
    if (op.isLeader) continue;
    const e = unitById(s, id);
    if (!e || e.hex < 0 || e.side === l.side) continue;
    const dNow = hexDist(e.hex, h);
    if (op.battlesLeft > 0 && op.canBattle) {
      if (dNow === 1 && !s.turn.mods.noClose) surv *= 1 - pAnyHelmet(escapeDice(e));
      else if (dNow > 1 && rangeOf(e) >= dNow && !s.turn.mods.noRanged) surv *= 1 - pAnyHelmet(1);
    } else if (from >= 0 && hexDist(e.hex, from) === 1 && hexDist(h, from) === 1 && !s.turn.mods.noClose) {
      const st = UNIT_STATS[e.type];
      if (bonusCombatEligible(st, !!attachedLeaderOcc(occ, e))) surv *= 1 - 0.7 * pAnyHelmet(escapeDice(e));
    }
  }
  return surv;
}

export function chooseLeaderEvade(s: GameState, d: D<'leaderEvade'>, W: Weights): number {
  const l = leaderById(s, d.leader);
  if (!l || d.options.length <= 1) return 0;
  const from = l.hex;
  const next = other(l.side);
  const deathCost = nextBanner(s, other(l.side)) + leaderVal(s, l);
  const sacred = s.special.sacredLeaderId === l.id;
  let best = 0;
  let bestV = -Infinity;
  d.options.forEach((o: RetreatOption, i) => {
    let surv = 1;
    for (const id of o.escapes ?? []) {
      const e = unitById(s, id);
      if (e) surv *= 1 - pAnyHelmet(escapeDice(e));
    }
    for (const h of o.path) if (h >= 0 && terrainAt(s, h) === 'marsh') surv *= 5 / 6;
    if (!o.offBoard && !o.attachLeader) surv *= survivesActiveTurn(s, l, o.end, from);
    l.hex = o.offBoard ? OFF_BOARD : o.end;
    let v = evaluate(s, l.side, next, W);
    l.hex = from;
    // joining a battered unit is a poor refuge
    if (!o.offBoard && o.attachLeader) {
      const u = unitById(s, o.attachLeader);
      if (u && u.blocks === 1) v -= 0.05;
      // the instant-loss leader (Castulo) takes cover in a sound unit, preferably one out of contact
      if (u && sacred && u.blocks >= 2) v += enemyUnitsAdjacent(new Occ(s), u.hex, u.side) > 0 ? 0.2 : 0.4;
    }
    v = surv * v + (1 - surv) * (v - deathCost);
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  });
  return best;
}

// ---------------------------------------------------------------------------
// flags
// ---------------------------------------------------------------------------

/** How many flags to ignore: usually all; accept a retreat when standing means probable destruction and a safe retreat exists. */
export function chooseIgnoreFlags(s: GameState, d: D<'ignoreFlags'>, W: Weights): number {
  const u = unitById(s, d.unit);
  if (!u) return d.max;
  const per = retreatPerFlag(u, null);
  const next = other(u.side);
  const valueOf = (n: number): number => {
    const left = d.flags - n;
    if (left <= 0) return evalUnitAt(s, u, u.hex, 0, W, next);
    const opts = retreatOptions(s, u, left * per);
    if (!opts.length) return -Infinity;
    let v = -Infinity;
    for (const o of opts) v = Math.max(v, evalUnitAt(s, u, o.end, o.losses, W, next));
    return v;
  };
  let bestN = d.max;
  let bestV = valueOf(d.max);
  for (let n = d.max - 1; n >= 0; n--) {
    // giving ground lets the attacker advance and maybe strike again
    let v = valueOf(n);
    if (s.active !== u.side) v -= 0.06;
    if (v > bestV + 0.05) {
      bestV = v;
      bestN = n;
    }
  }
  return bestN;
}

// ---------------------------------------------------------------------------
// momentum, cavalry extra hex, bonus combat
// ---------------------------------------------------------------------------

function bonusEligibleAt(s: GameState, u: Unit, hex: HexId, hasLeader: boolean): boolean {
  if (s.turn.mods.noClose) return false;
  const st = UNIT_STATS[u.type];
  let ok = bonusCombatEligible(st, hasLeader);
  const t = terrainAt(s, hex);
  if (t === 'forest' && !forestFighter(u.type)) ok = false;
  if (t === 'broken' && st.mounted) ok = false;
  return ok;
}

/** Best bonus-combat value available to unit u at its current hex. */
function bestBonusHere(s: GameState, u: Unit, W: Weights): number {
  const occ = new Occ(s);
  if (!bonusEligibleAt(s, u, u.hex, !!attachedLeaderOcc(occ, u))) return 0;
  let best = 0;
  for (const h of neighbours(u.hex)) {
    const v = occ.unit[h];
    if (v) {
      if (v.side !== u.side) best = Math.max(best, closeAttackEV(s, occ, u, v, 'bonus', true, W).ev);
      continue;
    }
    const l = occ.leader[h];
    if (l && l.side !== u.side) {
      const n = closeCombatDice(s, u, l, { role: 'bonus', fullAtStart: u.blocks === u.maxBlocks, ordered: true });
      best = Math.max(best, leaderAttackEV(s, u, l, n).ev);
    }
  }
  return best;
}

function valueAt(s: GameState, u: Unit, hex: HexId, W: Weights, withBonus: boolean, cavalryNext: boolean): number {
  const occ = new Occ(s);
  const l = attachedLeaderOcc(occ, u);
  const from = u.hex;
  u.hex = hex;
  if (l) l.hex = hex;
  let v = evaluate(s, u.side, other(u.side), W);
  if (withBonus) v += 0.9 * Math.max(0, bestBonusHere(s, u, W));
  if (cavalryNext && UNIT_STATS[u.type].cavalry) v += 0.02;
  u.hex = from;
  if (l) l.hex = from;
  return v;
}

/**
 * Camp capture (Baecula, Gabiene): value of a unit of the capturing side ending its attack on hex h when that is an
 * uncaptured objective camp (the engine credits the camp only where the unit finally stops, so riding on out of it
 * forfeits the banner).
 */
export function campBanner(s: GameState, u: Unit, h: HexId): number {
  if (h < 0 || !capturableCamp(s, u.side, h)) return 0;
  if (s.players[u.side].banners + 1 >= s.bannersToWin) return WIN_SCORE;
  return nextBanner(s, u.side);
}

export function chooseMomentum(s: GameState, d: D<'momentum'>, W: Weights, bonusPossible = true): boolean {
  if (d.bonus) bonusPossible = false;
  const u = unitById(s, d.unit);
  if (!u) return false;
  const stay = valueAt(s, u, u.hex, W, false, false) + campBanner(s, u, u.hex);
  let adv = valueAt(s, u, d.hex, W, bonusPossible, bonusPossible) + campBanner(s, u, d.hex);
  if (terrainAt(s, d.hex) === 'marsh') adv -= blockVal(u) / 6;
  if (adv >= WIN_SCORE / 2 && adv > stay) return true;
  if (stay >= WIN_SCORE / 2) return false;
  return adv + W.momentumBias > stay;
}

export function chooseCavalryExtra(s: GameState, d: D<'cavalryExtra'>, W: Weights): HexId | null {
  const u = unitById(s, d.unit);
  if (!u) return null;
  let best: HexId | null = null;
  let bestV = valueAt(s, u, u.hex, W, true, false) + campBanner(s, u, u.hex);
  for (const h of d.options) {
    let v = valueAt(s, u, h, W, true, false) + campBanner(s, u, h);
    if (terrainAt(s, h) === 'marsh') v -= blockVal(u) / 6;
    if (v > bestV + 0.005) {
      bestV = v;
      best = h;
    }
  }
  return best;
}

export function chooseBonusCombat(s: GameState, d: D<'bonusCombat'>, W: Weights): HexId | null {
  const u = unitById(s, d.unit);
  if (!u) return null;
  const occ = new Occ(s);
  let best: HexId | null = null;
  let bestV = W.bonusThreshold;
  for (const h of d.targets) {
    const v = occ.unit[h];
    let ev: number;
    if (v) ev = closeAttackEV(s, occ, u, v, 'bonus', true, W).ev;
    else {
      const l = occ.leader[h];
      if (!l) continue;
      ev = leaderAttackEV(s, u, l, closeCombatDice(s, u, l, { role: 'bonus', fullAtStart: u.blocks === u.maxBlocks, ordered: true })).ev;
    }
    if (ev > bestV) {
      bestV = ev;
      best = h;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// rally
// ---------------------------------------------------------------------------

export function rallyAssign(s: GameState, side: Side, faces: DieFace[]): (string | null)[] {
  const cands = rallyCandidates(s, side);
  const ids: (string | null)[] = faces.map(() => null);
  if (!cands.length) return ids;
  const occ = new Occ(s);
  const cur = new Map(cands.map((u) => [u.id, u.blocks]));
  const gain = (u: Unit) => {
    const b = cur.get(u.id)!;
    if (b >= u.maxBlocks) return -1;
    const urgency = b <= 1 ? 2.6 : b === 2 ? 1.5 : 1;
    const danger = enemyUnitsAdjacent(occ, u.hex, u.side) > 0 ? 1.3 : 1;
    return blockVal(u) * urgency * danger + (u.blocks === 1 ? 0.05 : 0);
  };
  const assign = (i: number, pool: Unit[]) => {
    let best: Unit | null = null;
    let bv = 0;
    for (const u of pool) {
      const g = gain(u);
      if (g > bv) {
        bv = g;
        best = u;
      }
    }
    if (best) {
      ids[i] = best.id;
      cur.set(best.id, cur.get(best.id)! + 1);
    }
  };
  faces.forEach((f, i) => {
    if (f === 'light' || f === 'medium' || f === 'heavy') assign(i, cands.filter((u) => UNIT_STATS[u.type].cls === f));
  });
  faces.forEach((f, i) => {
    if (f === 'leader') assign(i, cands);
  });
  if (validateRally(s, side, faces, ids)) return faces.map(() => null);
  return ids;
}

// ---------------------------------------------------------------------------
// I Am Spartacus
// ---------------------------------------------------------------------------

export function spartacusAssign(s: GameState, side: Side, faces: DieFace[], W: Weights): (string | null)[] {
  const ben = pieceBenefits(s, side, 'spartacus', W);
  const b = (id: string) => ben.get(id) ?? 0;
  const units = s.units.filter((u) => u.side === side && u.hex >= 0);
  const leaders = s.leaders.filter((l) => l.side === side && l.hex >= 0);
  const used = new Set<string>();
  const ids: (string | null)[] = faces.map(() => null);
  faces.forEach((f, i) => {
    if (f !== 'light' && f !== 'medium' && f !== 'heavy') return;
    let best: string | null = null;
    for (const u of units) {
      if (used.has(u.id) || UNIT_STATS[u.type].cls !== f) continue;
      if (best === null || b(u.id) > b(best)) best = u.id;
    }
    if (best) {
      used.add(best);
      ids[i] = best;
    }
  });
  faces.forEach((f, i) => {
    if (f !== 'leader') return;
    let best: string | null = null;
    for (const id of [...units.map((u) => u.id), ...leaders.map((l) => l.id)]) {
      if (used.has(id)) continue;
      if (best === null || b(id) > b(best)) best = id;
    }
    if (best) {
      used.add(best);
      ids[i] = best;
    }
  });
  if (validateSpartacus(s, side, faces, ids)) return faces.map(() => null);
  return ids;
}

// ---------------------------------------------------------------------------
// quick versions for simulations (no full evaluations)
// ---------------------------------------------------------------------------

function marshCount(s: GameState, path: HexId[]): number {
  let n = 0;
  for (const h of path) if (h >= 0 && terrainAt(s, h) === 'marsh') n++;
  return n;
}

export function quickRetreat(s: GameState, d: D<'retreat'>): number {
  if (d.options.length <= 1) return 0;
  const u = unitById(s, d.unit);
  if (!u) return 0;
  const occ = new Occ(s);
  occ.unit[u.hex] = null;
  let best = 0;
  let bestV = -Infinity;
  d.options.forEach((o, i) => {
    let v = -0.12 * enemyUnitsAdjacent(occ, o.end, u.side) + 0.03 * Math.min(2, friendlyUnitsAdjacentExcept(occ, o.end, u)) -
      0.05 * marshCount(s, o.path) - o.losses * 0.3;
    if (o.attachLeader) v += 0.05;
    const eo = o as ElephantRetreatOption;
    if (eo.blockers) for (const bl of eo.blockers) {
      const bu = unitById(s, bl.id);
      const side = bu?.side ?? leaderById(s, bl.id)?.side;
      v += (side === u.side ? -0.3 : 0.3) * bl.n;
    }
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  });
  return best;
}

function friendlyUnitsAdjacentExcept(occ: Occ, h: HexId, u: Unit): number {
  let n = 0;
  for (const x of neighbours(h)) {
    const v = occ.unit[x];
    if (v && v !== u && v.side === u.side) n++;
  }
  return n;
}

export function quickLeaderEvade(s: GameState, d: D<'leaderEvade'>): number {
  if (d.options.length <= 1) return 0;
  const l = leaderById(s, d.leader);
  if (!l) return 0;
  const occ = new Occ(s);
  let best = 0;
  let bestV = -Infinity;
  d.options.forEach((o, i) => {
    let surv = 1;
    for (const id of o.escapes ?? []) {
      const e = unitById(s, id);
      if (e) surv *= 1 - pAnyHelmet(escapeDice(e));
    }
    surv *= Math.pow(5 / 6, marshCount(s, o.path));
    let v = surv - (1 - surv) * 5;
    if (o.offBoard) v -= 0.35;
    else {
      if (o.attachLeader) {
        const u = unitById(s, o.attachLeader);
        v += u && u.blocks >= 2 ? 0.3 : 0.1;
      }
      v -= 0.4 * enemyUnitsAdjacent(occ, o.end, l.side);
    }
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  });
  return best;
}

function bonusAt(s: GameState, u: Unit, hex: HexId, W: Weights): { bonus: number; enemies: number } {
  const occ0 = new Occ(s);
  const l = attachedLeaderOcc(occ0, u);
  const from = u.hex;
  u.hex = hex;
  if (l) l.hex = hex;
  const bonus = bestBonusHere(s, u, W);
  const enemies = enemyUnitsAdjacent(new Occ(s), hex, u.side);
  u.hex = from;
  if (l) l.hex = from;
  return { bonus, enemies };
}

export function quickMomentum(s: GameState, d: D<'momentum'>, W: Weights): boolean {
  const u = unitById(s, d.unit);
  if (!u) return false;
  if (campBanner(s, u, u.hex) > 0) return false; // already standing in a camp that will be credited
  if (campBanner(s, u, d.hex) > 0) return true;
  const r = d.bonus ? { bonus: 0, enemies: enemyUnitsAdjacent(new Occ(s), d.hex, u.side) } : bonusAt(s, u, d.hex, W);
  if (r.bonus > W.bonusThreshold + 0.02) return true;
  if (battered(u) || terrainAt(s, d.hex) === 'marsh') return false;
  return r.enemies <= 1 && W.momentumBias >= 0;
}

export function quickCavalryExtra(s: GameState, d: D<'cavalryExtra'>, W: Weights): HexId | null {
  const u = unitById(s, d.unit);
  if (!u) return null;
  if (campBanner(s, u, u.hex) > 0) return null;
  const camp = d.options.find((h) => campBanner(s, u, h) > 0);
  if (camp !== undefined) return camp;
  let best: HexId | null = null;
  let bestV = bestBonusHere(s, u, W) + 0.03;
  for (const h of d.options) {
    if (terrainAt(s, h) === 'marsh') continue;
    const r = bonusAt(s, u, h, W);
    const v = r.bonus - (battered(u) ? 0.1 * r.enemies : 0);
    if (v > bestV) {
      bestV = v;
      best = h;
    }
  }
  return best;
}

/** Fast reactive policy for both sides inside simulations. */
export function reactiveFast(s: GameState, d: Decision, W: Weights, rng: Rng): Answer {
  switch (d.kind) {
    case 'defend': return { kind: 'defend', choice: defendChoice(s, d, W) };
    case 'ignoreFlags': return { kind: 'ignoreFlags', count: d.max };
    case 'retreat': return { kind: 'choose', index: quickRetreat(s, d) };
    case 'leaderEvade': return { kind: 'choose', index: quickLeaderEvade(s, d) };
    case 'momentum': return { kind: 'yesno', yes: quickMomentum(s, d, W) };
    case 'cavalryExtra': return { kind: 'hex', hex: quickCavalryExtra(s, d, W) };
    case 'bonusCombat': return { kind: 'hex', hex: chooseBonusCombat(s, d, W) };
    case 'rally': return { kind: 'assign', ids: rallyAssign(s, d.side, d.faces) };
    case 'spartacus': return { kind: 'assign', ids: spartacusAssign(s, d.side, d.faces, W) };
    case 'battle': return greedyBattle(s, W, rng);
    case 'move': return { kind: 'endMove' };
    case 'orders': return { kind: 'orders', pieces: [] };
    case 'playCard': return { kind: 'playCard', card: s.players[d.side].hand[0] };
  }
}
