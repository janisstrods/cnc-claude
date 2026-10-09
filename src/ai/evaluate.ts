// Static evaluation of a position from one side's point of view (1.0 ~ one banner).
import { defaultMods } from '../engine/cards';
import { closeCombatDice, leaderDiceBonus, rangedDice, swordIgnores } from '../engine/combat';
import { unitMoves } from '../engine/movement';
import { halfCol, neighbours, rowOf } from '../engine/hex';
import { leaderHas, other } from '../engine/query';
import { ccCapOfHex, isHill, isImpassable } from '../engine/terrain';
import { eliteHas, rangeOf } from '../engine/elites';
import { UNIT_STATS, canEvadeType, elephantDiceVs } from '../engine/units';
import type { GameState, Leader, Side, Unit } from '../engine/types';
import {
  Occ, attachedLeaderOcc, canEvadeOcc, canFireOcc, enemyUnitsAdjacent, friendlyUnitsAdjacent, helmetsOcc, hexDist, ignorableOcc,
  isRangedLight, reachOf, retreatRoom, supportOcc,
} from './board';
import { binom, pAnyHelmet } from './dice';
import {
  WIN_SCORE, bannerScore, blockVal, leaderVal, leaderWorth, nextBanner, unitWeight, type Weights,
} from './values';

const SIXTH = 1 / 6;
const RETREAT_COST = 0.07;
const LEADER_ATTACHED = 0.03;

export function battered(u: Unit): boolean {
  return u.blocks === 1 || u.blocks * 2 < u.maxBlocks;
}

/** Per-die chance that `e` scores a hit on `u` in close combat (approximate, flags excluded). */
function hitP(s: GameState, occ: Occ, e: Unit, u: Unit): number {
  const S = UNIT_STATS[e.type];
  const ignoresSwords = UNIT_STATS[u.type].ignoreAllSwords;
  // elephants re-roll swords: ~0.4 per die, unless the target ignores swords altogether
  if (S.elephantTable) return ignoresSwords ? SIXTH : 0.4;
  let p = SIXTH;
  if (S.swordHits && !ignoresSwords) p += swordIgnores(s, u) > 0 ? SIXTH * 0.5 : SIXTH;
  if (helmetsOcc(occ, e) || eliteHas(e, 'helmetHits')) p += SIXTH;
  return p;
}

/** Close-combat dice an enemy would roll after moving next to u (no card bonus, cap from u's hex, Alexander's +1). */
function reachDice(s: GameState, e: Unit, u: Unit): number {
  const S = UNIT_STATS[e.type];
  let n = S.elephantTable ? elephantDiceVs(u.type) : S.cc + (S.fullStrengthBonus && e.blocks === e.maxBlocks ? 1 : 0);
  n = Math.min(n, ccCapOfHex(s, u.hex));
  if (isHill(s, u.hex)) n = Math.min(n, 2);
  return n + leaderDiceBonus(s, e);
}

const DEFAULT_MODS = defaultMods();

/** Hexes from which unit e could close combat after a normal move (exact movement rules; used by consul). */
function attackHexes(s: GameState, e: Unit): Set<number> {
  const saved = s.turn.mods;
  s.turn.mods = DEFAULT_MODS;
  const out = new Set<number>();
  try {
    for (const m of unitMoves(s, e.id)) if (m.hex >= 0 && m.canBattle) out.add(m.hex);
  } finally {
    s.turn.mods = saved;
  }
  return out;
}

function hasFreeApproach(s: GameState, occ: Occ, e: Unit, target: number, reach: number): boolean {
  for (const nb of neighbours(target)) {
    if (occ.unit[nb] || isImpassable(s, nb)) continue;
    const l = occ.leader[nb];
    if (l && l.side !== e.side) continue;
    if (hexDist(e.hex, nb) <= reach) return true;
  }
  return false;
}

interface VictimInfo {
  pFlagHit: number;
  unignored: number;
  lossPerFlag: number;
  canEv: boolean;
  leaderBonus: number;
}

interface Threat {
  w: number;
  n: number;
  p: number;
  flags: boolean;
  pk: number;
}

function orderFactor(s: GameState, side: Side): number {
  const p = s.players[side];
  const k = Math.max(p.command, p.hand.length);
  return Math.min(1.25, Math.max(0.7, 0.55 + 0.09 * k));
}

function victimInfo(s: GameState, occ: Occ, u: Unit, bm: number): VictimInfo {
  const st = UNIT_STATS[u.type];
  const per = st.retreat;
  const room = retreatRoom(s, occ, u, per);
  const lossPerFlag = Math.min(2, per - room);
  const ign = ignorableOcc(s, occ, u, 'close', null);
  const unignored = ign >= 2 ? 0.1 : ign === 1 ? 0.4 : 1;
  const pFlagHit = lossPerFlag > 0 ? SIXTH * lossPerFlag * (ign >= 2 ? 0.1 : ign === 1 ? 0.35 : 1) : 0;
  const canEv = st.evade !== 'never' && canEvadeOcc(s, occ, u);
  const l = attachedLeaderOcc(occ, u);
  return { pFlagHit, unignored, lossPerFlag, canEv, leaderBonus: l ? SIXTH * (bm + leaderVal(s, l)) : 0 };
}

/** Expected value an attack of n dice with per-die hit chance p would take from u (used to rank targets). */
function attackValue(u: Unit, info: VictimInfo, n: number, p: number, bm: number): number {
  const pmf = binom(n, Math.min(0.95, p));
  let eh = 0;
  let pk = 0;
  for (let k = 1; k < pmf.length; k++) {
    eh += Math.min(k, u.blocks) * pmf[k];
    if (k >= u.blocks) pk += pmf[k];
  }
  return eh * blockVal(u) + pk * (bm + info.leaderBonus);
}

/**
 * Threats against every victim (units, then lone leaders): each enemy unit makes at most one attack and spreads its
 * attention over its possible targets in proportion to their value (juicy targets draw the blow).
 */
function threatsAgainst(
  s: GameState, occ: Occ, victims: Unit[], lone: Leader[], attackers: Unit[], vSide: Side, W: Weights,
): { per: Threat[][]; info: VictimInfo[]; bm: number } {
  const aSide = other(vSide);
  const f = orderFactor(s, aSide);
  const pAdj = W.pOrderAdj * f;
  const pReach = W.pOrderReach * f;
  const bm = nextBanner(s, aSide);
  const info = victims.map((u) => victimInfo(s, occ, u, bm));
  const per: Threat[][] = Array.from({ length: victims.length + lone.length }, () => []);
  const cand: { vi: number; base: number; t: Threat; val: number }[] = [];
  const exact = W.exactReach > 0;
  for (const e of attackers) {
    cand.length = 0;
    const reach = reachOf(e);
    const from = exact ? attackHexes(s, e) : null;
    const canReach = (target: number) => {
      if (from) {
        for (const nb of neighbours(target)) if (from.has(nb)) return true;
        return false;
      }
      return hasFreeApproach(s, occ, e, target, reach);
    };
    const range = rangeOf(e);
    const mounted = UNIT_STATS[e.type].mounted;
    const footSkirmisher = isRangedLight(e) && !mounted;
    for (let j = 0; j < victims.length; j++) {
      const u = victims[j];
      const d = hexDist(e.hex, u.hex);
      if (d > 6) continue;
      const vi = info[j];
      const evades = vi.canEv && canEvadeType(u.type, e.type);
      let n = 0;
      let base = 0;
      let p = 0;
      let flags = false;
      if (d === 1) {
        n = closeCombatDice(s, e, u, { role: 'attack', fullAtStart: e.blocks === e.maxBlocks, ordered: false });
        base = pAdj * (footSkirmisher ? 0.5 : 1);
        p = evades ? SIXTH : hitP(s, occ, e, u) + vi.pFlagHit;
        flags = !evades;
      } else if (range && d <= range && canFireOcc(s, occ, e, u.hex)) {
        n = rangedDice(s, e, u.hex, 0, false);
        base = pAdj * 0.85;
        p = SIXTH + vi.pFlagHit;
        flags = true;
      } else if (d - 1 <= reach && canReach(u.hex)) {
        n = reachDice(s, e, u);
        base = pReach * (isRangedLight(e) ? (mounted ? 0.6 : 0.3) : 1);
        p = evades ? SIXTH : hitP(s, occ, e, u) + vi.pFlagHit;
        flags = !evades;
      } else continue;
      if (n <= 0) continue;
      cand.push({ vi: j, base, t: { w: 0, n, p, flags, pk: 0 }, val: attackValue(u, vi, n, p, bm) });
    }
    for (let k = 0; k < lone.length; k++) {
      const l = lone[k];
      const d = hexDist(e.hex, l.hex);
      if (d > 6) continue;
      let n = 0;
      let base = 0;
      if (d === 1) {
        n = closeCombatDice(s, e, l, { role: 'attack', fullAtStart: e.blocks === e.maxBlocks, ordered: false });
        base = pAdj;
      } else if (range && d <= range && canFireOcc(s, occ, e, l.hex)) {
        n = rangedDice(s, e, l.hex, 0, false);
        base = pAdj * 0.85;
      } else if (d - 1 <= reach && canReach(l.hex)) {
        n = Math.min(UNIT_STATS[e.type].elephantTable ? 1 : UNIT_STATS[e.type].cc, ccCapOfHex(s, l.hex)) + leaderDiceBonus(s, e);
        base = pReach;
      } else continue;
      if (n <= 0) continue;
      const pk = pAnyHelmet(n);
      cand.push({ vi: victims.length + k, base, t: { w: 0, n, p: 0, flags: false, pk }, val: pk * (bm + leaderVal(s, l)) + 0.05 });
    }
    if (!cand.length) continue;
    let sum2 = 0;
    for (const c of cand) sum2 += c.val * c.val;
    for (const c of cand) {
      const share = sum2 > 0 ? (c.val * c.val) / sum2 : 1 / cand.length;
      c.t.w = Math.min(1, c.base * Math.pow(share, 0.75));
      per[c.vi].push(c.t);
    }
  }
  return { per, info, bm };
}

/** Expected value lost by victim u given the threats against it. */
function unitRisk(s: GameState, occ: Occ, u: Unit, info: VictimInfo, threats: Threat[], bm: number): number {
  if (!threats.length) return 0;
  const b = u.blocks;
  let dist0 = new Float64Array(b + 1);
  dist0[0] = 1;
  let eFlags = 0;
  for (const t of threats) {
    const pmf = binom(t.n, Math.min(0.95, t.p));
    const nx = new Float64Array(b + 1);
    for (let h = 0; h <= b; h++) {
      const pr = dist0[h];
      if (!pr) continue;
      nx[h] += pr * (1 - t.w);
      for (let x = 0; x < pmf.length; x++) nx[Math.min(b, h + x)] += pr * t.w * pmf[x];
    }
    dist0 = nx;
    if (t.flags) eFlags += (t.w * t.n) / 6;
  }
  let eh = 0;
  for (let h = 1; h <= b; h++) eh += h * dist0[h];
  const pel = dist0[b];
  let risk = eh * blockVal(u) + pel * bm;
  // being pushed back costs ground, breaks the line and lets the enemy advance
  risk += eFlags * info.unignored * RETREAT_COST * (info.lossPerFlag > 0 ? 0.3 : 1);
  const l = attachedLeaderOcc(occ, u);
  if (l) {
    const lv = bm + leaderVal(s, l);
    risk += pel * (SIXTH * lv + 0.04) + (1 - dist0[0] - pel) * (lv / 36);
  }
  return risk;
}

function loneLeaders(s: GameState, occ: Occ, side: Side): Leader[] {
  return s.leaders.filter((l) => {
    if (l.side !== side || l.hex < 0) return false;
    const u = occ.unit[l.hex];
    return !(u && u.side === side);
  });
}

/** Total expected loss of `vSide` from the enemy's next attacks. */
export function sideRisk(s: GameState, occ: Occ, victims: Unit[], attackers: Unit[], vSide: Side, W: Weights): number {
  const lone = loneLeaders(s, occ, vSide);
  const { per, info, bm } = threatsAgainst(s, occ, victims, lone, attackers, vSide, W);
  let total = 0;
  for (let j = 0; j < victims.length; j++) total += unitRisk(s, occ, victims[j], info[j], per[j], bm);
  const pAdj = W.pOrderAdj * orderFactor(s, other(vSide));
  for (let k = 0; k < lone.length; k++) {
    let surv = 1;
    for (const t of per[victims.length + k]) surv *= 1 - t.w * t.pk;
    // exposure: a lone leader sheltering behind a last-block unit in contact is next once it falls
    let exposure = 0;
    for (const h of neighbours(lone[k].hex)) {
      const f = occ.unit[h];
      if (f && f.side === vSide && f.blocks === 1 && enemyUnitsAdjacent(occ, f.hex, vSide) > 0) exposure += 0.3 * pAdj;
    }
    if (exposure > 0) surv *= 1 - Math.min(0.4, exposure) * pAnyHelmet(4);
    const p = 1 - surv;
    total += p * (bm + leaderVal(s, lone[k])) + p * 0.05;
  }
  return total;
}

/** Risk of a single unit (used by quick local scoring). */
export function singleUnitRisk(s: GameState, occ: Occ, u: Unit, W: Weights): number {
  const attackers = s.units.filter((x) => x.side !== u.side && x.hex >= 0);
  const { per, info, bm } = threatsAgainst(s, occ, [u], [], attackers, u.side, W);
  return unitRisk(s, occ, u, info[0], per[0], bm);
}

function nearestDist(u: Unit, enemies: Unit[]): number {
  let best = 99;
  for (const e of enemies) {
    const d = hexDist(u.hex, e.hex);
    if (d < best) best = d;
  }
  return best;
}

function positional(s: GameState, occ: Occ, units: Unit[], enemies: Unit[], side: Side, W: Weights, own: boolean): number {
  let v = 0;
  const near = new Map<Unit, number>();
  for (const u of units) {
    const d = nearestDist(u, enemies);
    near.set(u, d);
    if (d <= 4) {
      let fd = 99;
      for (const f of units) if (f !== u) fd = Math.min(fd, hexDist(f.hex, u.hex));
      if (fd > 2) v -= W.stray;
    }
    if (d > 2) continue;
    const sc = supportOcc(occ, u);
    if (sc >= 2) v += W.support;
    else if (sc === 0) v -= W.isolated;
  }
  for (const l of s.leaders) {
    if (l.side !== side || l.hex < 0) continue;
    const lu = occ.unit[l.hex];
    const sacred = own && s.special.sacredLeaderId === l.id;
    if (lu && lu.side === side) {
      const d = near.get(lu) ?? 99;
      const health = lu.blocks / lu.maxBlocks;
      // attached: bolsters morale, enables bonus combat and cannot be attacked directly
      v += LEADER_ATTACHED * health;
      if (sacred) {
        // the instant-loss leader commands from behind the line, on a healthy unit
        if (d <= 1) v -= 0.25;
        else if (d <= 2) v -= 0.08;
        if (d <= 3) v -= 0.12 * (lu.maxBlocks - lu.blocks);
        continue;
      }
      if (d <= 2) v += W.leaderFront * health * (UNIT_STATS[lu.type].noLeaderBenefit ? 0.2 : 1);
      continue;
    }
    if (sacred) {
      // a lone instant-loss leader is a standing invitation: worse the more enemies (horse counts double) are near
      let threat = 0;
      let closest = 99;
      for (const e of enemies) {
        const d = hexDist(e.hex, l.hex);
        closest = Math.min(closest, d);
        if (d <= 6) threat += UNIT_STATS[e.type].mounted ? 2 : 1;
      }
      v -= Math.min(0.6, (closest <= 3 ? 0.2 : 0.1) + 0.04 * threat);
    }
    if (friendlyUnitsAdjacent(occ, l.hex, side) === 0) v -= W.lonelyLeader;
    if (leaderHas(l, 'attachedOnly')) continue; // a lone satrap's helmets help nobody
    let aura = 0;
    for (const h of neighbours(l.hex)) {
      const x = occ.unit[h];
      if (x && x.side === side && !UNIT_STATS[x.type].noLeaderBenefit && (near.get(x) ?? 99) === 1) aura++;
    }
    v += W.helmetAura * Math.min(3, aura);
  }
  return v;
}

function advancePenalty(units: Unit[], enemies: Unit[], W: Weights): number {
  if (!enemies.length) return 0;
  let pen = 0;
  for (const u of units) {
    if (battered(u)) continue;
    const d = nearestDist(u, enemies);
    const pref = isRangedLight(u) ? 2 : 1;
    const gap = Math.min(8, Math.max(0, d - pref));
    pen += gap * (UNIT_STATS[u.type].mounted ? W.mountedAdv : 1);
  }
  return pen * W.adv;
}

function romanSide(s: GameState): Side {
  return s.players.top.army === 'Roman' ? 'top' : 'bottom';
}

/** Scenario objectives, positive = good for `me`. */
function objectives(s: GameState, me: Side, W: Weights): number {
  const rules = s.special.rules;
  let v = 0;
  if (rules.includes('castulo')) {
    // Roman (bottom) units exit over row 0 from the centre or Roman-right sections (half-column >= 8).
    let r = 0;
    for (const u of s.units) {
      if (u.side !== 'bottom' || u.hex < 0) continue;
      const x2 = halfCol(u.hex);
      const lateral = x2 < 8 ? (8 - x2) / 2 : 0;
      r += 0.035 * (8 - Math.min(8, rowOf(u.hex) + lateral)) * (battered(u) ? 1.3 : 1);
    }
    v += (me === 'bottom' ? 1 : -1) * r * W.objective;
  }
  if (rules.includes('baeculaCamps')) {
    const rs = romanSide(s);
    let r = 0;
    for (let h = 0; h < s.terrain.length; h++) {
      if (s.terrain[h] !== 'camp' || s.special.campsCaptured.includes(h)) continue;
      let dmin = 99;
      for (const u of s.units) if (u.side === rs && u.hex >= 0) dmin = Math.min(dmin, hexDist(u.hex, h));
      r += 0.07 * Math.max(0, 6 - dmin) / 6;
    }
    v += (me === rs ? 1 : -1) * r * W.objective;
  }
  return v;
}

export interface EvalBreakdown {
  banners: number;
  material: number;
  riskMine: number;
  riskTheirs: number;
  positional: number;
  advance: number;
  objectives: number;
  total: number;
}

/**
 * Evaluate the position for `me`. `next` = the side that will act next (its threats are imminent).
 */
export function evaluate(s: GameState, me: Side, next: Side, W: Weights, breakdown?: EvalBreakdown): number {
  if (s.winner) {
    if (s.winner === 'draw') return 0;
    const margin = s.players[me].banners - s.players[other(me)].banners;
    return s.winner === me ? WIN_SCORE + margin : -WIN_SCORE + margin;
  }
  const opp = other(me);
  const T = s.bannersToWin;
  const occ = new Occ(s);
  const mine: Unit[] = [];
  const theirs: Unit[] = [];
  for (const u of s.units) if (u.hex >= 0) (u.side === me ? mine : theirs).push(u);
  const banners = bannerScore(s.players[me].banners, T) - bannerScore(s.players[opp].banners, T);
  let material = 0;
  for (const u of mine) material += (unitWeight(u) * u.blocks) / u.maxBlocks;
  for (const u of theirs) material -= (unitWeight(u) * u.blocks) / u.maxBlocks;
  for (const u of s.special.reserveUnits) material += (u.side === me ? 0.75 : -0.75) * unitWeight(u);
  for (const l of s.leaders) if (l.hex >= 0) material += (l.side === me ? 1 : -1) * leaderWorth(l);
  for (const l of s.special.reserveLeaders) material += (l.side === me ? 0.75 : -0.75) * leaderWorth(l);

  const riskMine = sideRisk(s, occ, mine, theirs, me, W);
  const riskTheirs = sideRisk(s, occ, theirs, mine, opp, W);
  const wMine = W.riskSelf * (next === opp ? W.now : W.later);
  const wTheirs = W.riskEnemy * (next === me ? W.now : W.later);
  const pos = positional(s, occ, mine, theirs, me, W, true) - positional(s, occ, theirs, mine, opp, W, false);
  const adv = advancePenalty(mine, theirs, W);
  const obj = objectives(s, me, W);
  const total = banners + material - wMine * riskMine + wTheirs * riskTheirs + pos - adv + obj;
  if (breakdown) {
    breakdown.banners = banners;
    breakdown.material = material;
    breakdown.riskMine = -wMine * riskMine;
    breakdown.riskTheirs = wTheirs * riskTheirs;
    breakdown.positional = pos;
    breakdown.advance = -adv;
    breakdown.objectives = obj;
    breakdown.total = total;
  }
  return total;
}

/** Unweighted evaluation components (used to calibrate the weights from game outcomes). */
export function rawFeatures(s: GameState, me: Side, next: Side, W: Weights): Record<string, number> {
  const opp = other(me);
  const T = s.bannersToWin;
  const occ = new Occ(s);
  const mine: Unit[] = [];
  const theirs: Unit[] = [];
  for (const u of s.units) if (u.hex >= 0) (u.side === me ? mine : theirs).push(u);
  const bm = s.players[me].banners;
  const bo = s.players[opp].banners;
  const f: Record<string, number> = {};
  f.ban = bannerScore(bm, T) - bannerScore(bo, T);
  f.nearWinMe = bm >= T - 1 ? 1 : 0;
  f.nearWinOpp = bo >= T - 1 ? 1 : 0;
  const mat = (us: Unit[]) => us.reduce((a, u) => a + (unitWeight(u) * u.blocks) / u.maxBlocks, 0);
  f.mat = mat(mine) - mat(theirs);
  f.units = mine.length - theirs.length;
  f.weak = mine.filter((u) => u.blocks === 1).length - theirs.filter((u) => u.blocks === 1).length;
  let res = 0;
  for (const u of s.special.reserveUnits) res += (u.side === me ? 1 : -1) * unitWeight(u);
  f.reserve = res;
  let ld = 0;
  for (const l of s.leaders) if (l.hex >= 0) ld += l.side === me ? 1 : -1;
  f.leaders = ld;
  const rMe = sideRisk(s, occ, mine, theirs, me, W);
  const rOpp = sideRisk(s, occ, theirs, mine, opp, W);
  if (next === opp) {
    f.riskMeNow = rMe;
    f.riskOppLater = rOpp;
    f.riskMeLater = 0;
    f.riskOppNow = 0;
  } else {
    f.riskMeLater = rMe;
    f.riskOppNow = rOpp;
    f.riskMeNow = 0;
    f.riskOppLater = 0;
  }
  const counts = (units: Unit[], enemies: Unit[], side: Side) => {
    let support = 0;
    let isolated = 0;
    let stray = 0;
    for (const u of units) {
      const d = nearestDist(u, enemies);
      if (d <= 4) {
        let fd = 99;
        for (const x of units) if (x !== u) fd = Math.min(fd, hexDist(x.hex, u.hex));
        if (fd > 2) stray++;
      }
      if (d > 2) continue;
      const sc = supportOcc(occ, u);
      if (sc >= 2) support++;
      else if (sc === 0) isolated++;
    }
    let front = 0;
    let lonely = 0;
    for (const l of s.leaders) {
      if (l.side !== side || l.hex < 0) continue;
      const lu = occ.unit[l.hex];
      if (lu && lu.side === side) {
        if (nearestDist(lu, enemies) <= 2) front += lu.blocks / lu.maxBlocks;
      } else if (friendlyUnitsAdjacent(occ, l.hex, side) === 0) lonely++;
    }
    let gap = 0;
    for (const u of units) {
      if (battered(u)) continue;
      const d = nearestDist(u, enemies);
      gap += Math.min(8, Math.max(0, d - (isRangedLight(u) ? 2 : 1)));
    }
    return { support, isolated, stray, front, lonely, gap };
  };
  const a = counts(mine, theirs, me);
  const b = counts(theirs, mine, opp);
  f.support = a.support - b.support;
  f.isolated = a.isolated - b.isolated;
  f.stray = a.stray - b.stray;
  f.leaderFront = a.front - b.front;
  f.lonely = a.lonely - b.lonely;
  f.gapMe = a.gap;
  f.gapOpp = b.gap;
  f.obj = objectives(s, me, { ...W, objective: 1 });
  f.toMove = next === me ? 1 : 0;
  return f;
}
