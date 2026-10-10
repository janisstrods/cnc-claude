// Static evaluation of a position from one side's point of view (1.0 ~ one banner).
import { defaultMods } from '../engine/cards';
import {
  baseSwordIgnores, closeCombatDice, frightAtFirstSight, leaderDiceBonus, rampartShields, rangedDice,
} from '../engine/combat';
import { unitMoves } from '../engine/movement';
import { halfCol, neighbours, rowOf } from '../engine/hex';
import { isRomanArmy, leaderHas, other } from '../engine/query';
import { ccCapOfHex, isHill, isImpassable } from '../engine/terrain';
import { eliteHas, rangeOf } from '../engine/elites';
import { UNIT_STATS, canEvadeType, elephantDiceVs, type UnitStats } from '../engine/units';
import type { GameState, Leader, Side, TerrainType, Unit } from '../engine/types';
import {
  Occ, advanceGap, attachedLeaderOcc, canEvadeOcc, canFireOcc, enemyUnitsAdjacent, friendlyUnitsAdjacent, helmetsOcc,
  hexDist, ignorableOcc, isRangedLight, isWarMachine, reachOf, retreatRoom, supportOcc, terrainForbids,
} from './board';
import { binom, pAnyHelmet } from './dice';
import {
  WIN_SCORE, bannerScore, blockVal, isSacredLeader, leaderLossCost, leaderVal, leaderWorth, nextBanner, unitWeight, type Weights,
} from './values';

const SIXTH = 1 / 6;
const RETREAT_COST = 0.07;
const LEADER_ATTACHED = 0.03;
/** Front-line bonus multiplier for a leader whose unit rolls +1 die (Alexander, `ccBonus`). */
const CC_BONUS_FRONT = 1.6;
/** A camel's advance gap is measured to the enemy horse while that is at most this many hexes further away. */
const CAMEL_HORSE_PULL = 2;

export function battered(u: Unit): boolean {
  return u.blocks === 1 || u.blocks * 2 < u.maxBlocks;
}

/** Do helmets score for `e` in close combat (a leader with or next to it, or an elite whose helmets hit)? */
function helmetsHit(occ: Occ, e: Unit): boolean {
  return helmetsOcc(occ, e) || eliteHas(e, 'helmetHits');
}

/**
 * Per-die chance that a striker with stats `S` scores a hit on victim `vi` in close combat (approximate, flags excluded).
 * `shield`: the victim's rampart protects it from this roll (the striker is, or, not yet adjacent, lies, on the protected
 * side of its hex); `helmets`: the striker's helmets hit (`helmetsHit`).
 */
function hitP(S: UnitStats, vi: VictimInfo, shield: boolean, helmets: boolean): number {
  // elephants re-roll swords: ~0.4 per die, unless the target ignores swords altogether
  if (S.elephantTable) return vi.ignoresSwords ? SIXTH : 0.4;
  let p = SIXTH;
  if (S.swordHits && !vi.ignoresSwords) p += vi.swordIgnores > 0 || shield ? SIXTH * 0.5 : SIXTH;
  if (helmets) p += SIXTH;
  return p;
}

/**
 * Per-die share of the class hits a camel ignores from a horse's roll of n dice (1 blue triangle per roll, §15): E[hits
 * dropped] / n. 0 for every other pairing (an elephant's red-square ignore is not modelled here).
 */
function camelIgnoreP(S: UnitStats, vi: VictimInfo, n: number): number {
  if (n <= 0 || !vi.camel || !(S.cavalry || S.chariot)) return 0;
  return (1 - Math.pow(5 / 6, n)) / n;
}

/**
 * Close-combat dice an enemy `e` (stats `S`) would roll after moving next to u (no card bonus, cap from u's hex) plus
 * `diceBonus`, its leader's extra dice (Alexander's +1, `leaderDiceBonus`).
 */
function reachDice(s: GameState, S: UnitStats, e: Unit, u: Unit, diceBonus: number): number {
  let n = S.elephantTable ? elephantDiceVs(u.type) : S.cc + (S.fullStrengthBonus && e.blocks === e.maxBlocks ? 1 : 0);
  n = Math.min(n, ccCapOfHex(s, u.hex));
  if (isHill(s, u.hex)) n = Math.min(n, 2);
  return n + diceBonus;
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

/**
 * Is there a hex next to `target` within `reach` of `e` that `e` may move to and attack from: free, passable, not
 * terrain it may not enter (`forbidden`, its forbiddenTerrain: broken ground or marsh for a war machine) and without an
 * enemy leader?
 */
function hasFreeApproach(s: GameState, occ: Occ, e: Unit, forbidden: readonly TerrainType[], target: number, reach: number): boolean {
  for (const nb of neighbours(target)) {
    if (hexDist(e.hex, nb) > reach || occ.unit[nb] || isImpassable(s, nb) || terrainForbids(s, forbidden, nb)) continue;
    const l = occ.leader[nb];
    if (!(l && l.side !== e.side)) return true;
  }
  return false;
}

interface VictimInfo {
  pFlagHit: number;
  /** pFlagHit against a roll its rampart protects it from (one more ignorable flag, §16); = pFlagHit off a rampart. */
  pFlagHitShielded: number;
  /** pFlagHit against an elephant's roll under Fright at First Sight (116: no flag ignored); = pFlagHit otherwise. */
  pFlagHitFright: number;
  /** Share of flags that push it back (retreat cost): ordinary, across a protected rampart side, under Fright. */
  unignored: number;
  unignoredShielded: number;
  /** A foot unit on a rampart hex (protected against threats across its protected sides). */
  onRampart: boolean;
  /** A Roman infantry unit with Fright at First Sight in force (elephants' flags cannot be ignored). */
  frightProne: boolean;
  lossPerFlag: number;
  /** It may evade at all (has room, its type ever evades, and evading does not remove it like a war machine, §15). */
  canEv: boolean;
  leaderBonus: number;
  /** Sword hits it ignores whoever strikes (type, camp, Companions; the rampart excluded); all swords, for elephants. */
  swordIgnores: number;
  ignoresSwords: boolean;
  /** A camel (ignores a blue triangle of a horse's roll). */
  camel: boolean;
}

/** Which flag rule a threat falls under: 0 ordinary, 1 across a protected rampart side (§16), 2 Fright at First Sight. */
type FlagCase = 0 | 1 | 2;

interface Threat {
  w: number;
  n: number;
  p: number;
  flags: boolean;
  pk: number;
  fk: FlagCase;
}

function orderFactor(s: GameState, side: Side): number {
  const p = s.players[side];
  const k = Math.max(p.command, p.hand.length);
  return Math.min(1.25, Math.max(0.7, 0.55 + 0.09 * k));
}

/** Share of flags that push a unit back when it may ignore `k` of them. */
function unignoredOf(k: number): number {
  return k >= 2 ? 0.1 : k === 1 ? 0.4 : 1;
}

/** Flag-loss chance per die for a unit losing `lossPerFlag` blocks per flag it cannot retreat for, ignoring `k` flags. */
function flagHitOf(lossPerFlag: number, k: number): number {
  return lossPerFlag > 0 ? SIXTH * lossPerFlag * (k >= 2 ? 0.1 : k === 1 ? 0.35 : 1) : 0;
}

/** `frightRule`: the battle plays Fright at First Sight (116). */
function victimInfo(s: GameState, occ: Occ, u: Unit, bm: number, frightRule: boolean): VictimInfo {
  const st = UNIT_STATS[u.type];
  const per = st.retreat;
  const room = retreatRoom(s, occ, u, per);
  const lossPerFlag = Math.min(2, per - room);
  const ign = ignorableOcc(s, occ, u, 'close', null);
  const unignored = unignoredOf(ign);
  const pFlagHit = flagHitOf(lossPerFlag, ign);
  // a foot unit on a rampart: one more ignorable flag against rolls coming across a protected side (decided per threat)
  const onRampart = !!s.rampart[u.hex] && st.foot;
  const pFlagHitShielded = onRampart ? flagHitOf(lossPerFlag, ign + 1) : pFlagHit;
  // Fright at First Sight (116): a Roman infantry unit ignores no flag an elephant rolls (decided per threat)
  const frightProne = st.infantry && frightRule && isRomanArmy(s, u.side);
  // a war machine that evades is abandoned anyway (§15): price its threats as if it stands
  const canEv = st.evade !== 'never' && !st.evadeRemoves && canEvadeOcc(s, occ, u);
  const l = attachedLeaderOcc(occ, u);
  return {
    pFlagHit, pFlagHitShielded, pFlagHitFright: frightProne ? flagHitOf(lossPerFlag, 0) : pFlagHit,
    unignored, unignoredShielded: onRampart ? unignoredOf(ign + 1) : unignored, onRampart, frightProne,
    lossPerFlag, canEv, leaderBonus: l ? SIXTH * (bm + leaderVal(s, l)) : 0,
    swordIgnores: baseSwordIgnores(s, u), ignoresSwords: st.ignoreAllSwords, camel: st.vsMountedIgnoreHit !== null && !st.elephantTable,
  };
}

/**
 * The flag rule of a threat by `e` against victim `u` (rampart side, Fright at First Sight, or ordinary). `shield`: the
 * rampart protects `u` from this roll (`rampartShields`, worked out by the caller).
 */
function flagCase(s: GameState, vi: VictimInfo, u: Unit, e: Unit, kind: 'close' | 'ranged', shield: boolean): FlagCase {
  if (vi.frightProne && frightAtFirstSight(s, u, e, kind)) return 2;
  return shield ? 1 : 0;
}

/** Does `u`'s rampart protect it from a roll by `e` of this kind (an attack, for close combat)? */
function shielded(s: GameState, vi: VictimInfo, u: Unit, e: Unit, kind: 'close' | 'ranged'): boolean {
  return vi.onRampart && rampartShields(s, u, e, kind, 'attack');
}

/** Flag-loss chance per die of a threat under flag rule `fk`. */
function flagHitP(vi: VictimInfo, fk: FlagCase): number {
  return fk === 0 ? vi.pFlagHit : fk === 1 ? vi.pFlagHitShielded : vi.pFlagHitFright;
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
  const frightRule = s.special.rules.includes('frightAtFirstSight');
  // plain loops, not map / Array.from, and candidate slots reused across attackers: this runs on every evaluation
  const info: VictimInfo[] = [];
  for (const u of victims) info.push(victimInfo(s, occ, u, bm, frightRule));
  const per: Threat[][] = [];
  for (let i = victims.length + lone.length; i > 0; i--) per.push([]);
  const cand: { vi: number; base: number; t: Threat; val: number }[] = [];
  const exact = W.exactReach > 0;
  for (const e of attackers) {
    let nc = 0;
    const S = UNIT_STATS[e.type];
    // worked out on first use: most attackers have no target in reach
    let helmets: boolean | undefined;
    let diceBonus: number | undefined;
    const reach = reachOf(e);
    const from = exact ? attackHexes(s, e) : null;
    const forbidden = S.forbiddenTerrain;
    const canReach = (target: number) => {
      if (from) {
        for (const nb of neighbours(target)) if (from.has(nb)) return true;
        return false;
      }
      return hasFreeApproach(s, occ, e, forbidden, target, reach);
    };
    const range = rangeOf(e);
    const mounted = S.mounted;
    const rangedLight = isRangedLight(e);
    // foot skirmishers rarely close (they shoot and evade); a war machine next to its target cannot shoot: it battles
    const footSkirmisher = rangedLight && !mounted && !isWarMachine(e);
    const reachShare = rangedLight ? (mounted ? 0.6 : 0.3) : 1;
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
      let fk: FlagCase = 0;
      if (d === 1) {
        n = closeCombatDice(s, e, u, { role: 'attack', fullAtStart: e.blocks === e.maxBlocks, ordered: false });
        base = pAdj * (footSkirmisher ? 0.5 : 1);
        const shield = shielded(s, vi, u, e, 'close');
        fk = flagCase(s, vi, u, e, 'close', shield);
        p = evades ? SIXTH : hitP(S, vi, shield, (helmets ??= helmetsHit(occ, e))) + flagHitP(vi, fk);
        p -= camelIgnoreP(S, vi, n);
        flags = !evades;
      } else if (range && d <= range && canFireOcc(s, occ, e, u.hex)) {
        n = rangedDice(s, e, u.hex, 0, false);
        base = pAdj * 0.85;
        fk = flagCase(s, vi, u, e, 'ranged', shielded(s, vi, u, e, 'ranged'));
        p = SIXTH + flagHitP(vi, fk);
        flags = true;
      } else if (d - 1 <= reach && canReach(u.hex)) {
        n = reachDice(s, S, e, u, (diceBonus ??= leaderDiceBonus(s, e)));
        base = pReach * reachShare;
        // not adjacent yet: the rampart counts when e lies on its protected side
        const shield = shielded(s, vi, u, e, 'close');
        fk = flagCase(s, vi, u, e, 'close', shield);
        p = evades ? SIXTH : hitP(S, vi, shield, (helmets ??= helmetsHit(occ, e))) + flagHitP(vi, fk);
        p -= camelIgnoreP(S, vi, n);
        flags = !evades;
      } else continue;
      if (n <= 0) continue;
      cand[nc++] = { vi: j, base, t: { w: 0, n, p, flags, pk: 0, fk }, val: attackValue(u, vi, n, p, bm) };
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
        n = Math.min(S.elephantTable ? 1 : S.cc, ccCapOfHex(s, l.hex)) + (diceBonus ??= leaderDiceBonus(s, e));
        base = pReach;
      } else continue;
      if (n <= 0) continue;
      const pk = pAnyHelmet(n);
      cand[nc++] = { vi: victims.length + k, base, t: { w: 0, n, p: 0, flags: false, pk, fk: 0 }, val: pk * (bm + leaderVal(s, l)) + 0.05 };
    }
    if (!nc) continue;
    let sum2 = 0;
    for (let i = 0; i < nc; i++) sum2 += cand[i].val * cand[i].val;
    for (let i = 0; i < nc; i++) {
      const c = cand[i];
      const share = sum2 > 0 ? (c.val * c.val) / sum2 : 1 / nc;
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
  // expected flags by flag rule (ordinary, across a protected rampart side, Fright at First Sight)
  let eFlags = 0;
  let eFlagsShielded = 0;
  let eFlagsFright = 0;
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
    if (t.flags) {
      const f = (t.w * t.n) / 6;
      if (t.fk === 0) eFlags += f;
      else if (t.fk === 1) eFlagsShielded += f;
      else eFlagsFright += f;
    }
  }
  let eh = 0;
  for (let h = 1; h <= b; h++) eh += h * dist0[h];
  const pel = dist0[b];
  let risk = eh * blockVal(u) + pel * bm;
  // being pushed back costs ground, breaks the line and lets the enemy advance
  const pushed = eFlags * info.unignored + eFlagsShielded * info.unignoredShielded + eFlagsFright;
  risk += pushed * RETREAT_COST * (info.lossPerFlag > 0 ? 0.3 : 1);
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
    const sacred = own && isSacredLeader(s, l);
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
      // Alexander (+1 die to his unit) belongs where the fighting is
      if (d <= 2) v += W.leaderFront * health * (UNIT_STATS[lu.type].noLeaderBenefit ? 0.2 : leaderHas(l, 'ccBonus') ? CC_BONUS_FRONT : 1);
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

/** Distance to the nearest enemy cavalry or chariot (a camel's favourite prey: it ignores a hit and scares horses). */
function nearestHorse(u: Unit, enemies: Unit[]): number {
  let best = 99;
  for (const e of enemies) {
    const st = UNIT_STATS[e.type];
    if (!st.cavalry && !st.chariot) continue;
    const d = hexDist(u.hex, e.hex);
    if (d < best) best = d;
  }
  return best;
}

/** True for a camel (ignores a blue triangle of a horse's roll; the elephant's red-square ignore is the other case). */
function isCamel(u: Unit): boolean {
  const st = UNIT_STATS[u.type];
  return st.vsMountedIgnoreHit !== null && !st.elephantTable;
}

/**
 * The advance penalty's gap for unit u at distance d from the nearest enemy (advanceGap, capped at 8). A battered unit
 * is not pushed forward, but a war machine is still told off for standing next to the enemy (it cannot shoot there).
 */
export function penaltyGap(u: Unit, d: number): number {
  if (battered(u)) return isWarMachine(u) && d <= 1 ? advanceGap(u, d) : 0;
  return Math.min(8, advanceGap(u, d));
}

/** penaltyGap against these enemies; a camel measures to the enemy horse when that is not much further away. */
function unitGap(u: Unit, enemies: Unit[]): number {
  // a battered unit other than a war machine has no gap wherever the enemy is (penaltyGap): skip the distance scan
  if (battered(u) && !isWarMachine(u)) return 0;
  const d = nearestDist(u, enemies);
  if (isCamel(u) && !battered(u)) {
    // camels seek out the enemy horse when it is not much further away than the nearest enemy
    const dh = nearestHorse(u, enemies);
    if (dh <= d + CAMEL_HORSE_PULL) return penaltyGap(u, dh);
  }
  return penaltyGap(u, d);
}

function advancePenalty(units: Unit[], enemies: Unit[], W: Weights): number {
  if (!enemies.length) return 0;
  let pen = 0;
  for (const u of units) {
    const gap = unitGap(u, enemies);
    if (gap) pen += gap * (UNIT_STATS[u.type].mounted ? W.mountedAdv : 1);
  }
  return pen * W.adv;
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
  const cc = s.special.campCapture;
  if (cc && rules.includes('campCapture')) {
    // camps still to capture, drawing the capturing side's nearest unit
    let r = 0;
    for (const h of cc.hexes) {
      if (s.special.campsCaptured.includes(h)) continue;
      let dmin = 99;
      for (const u of s.units) if (u.side === cc.side && u.hex >= 0) dmin = Math.min(dmin, hexDist(u.hex, h));
      r += 0.07 * Math.max(0, 6 - dmin) / 6;
    }
    v += (me === cc.side ? 1 : -1) * r * W.objective;
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
  // Hellespont: each leader lost cost a card and a point of Command; the last one left decides the battle
  material -= leaderLossCost(s, me) - leaderLossCost(s, opp);

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
    for (const u of units) gap += unitGap(u, enemies);
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
