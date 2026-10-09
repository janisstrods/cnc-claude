// Analytic combat estimator: expected value (in banner units) of attacks, battle backs, evades and ranged fire.
import { battleTargets } from '../engine/flow';
import { closeCombatDice, rangedDice, retreatPerFlag, swordIgnores, vsMountedIgnores, type StrikeRole } from '../engine/combat';
import { neighbours } from '../engine/hex';
import { unitById } from '../engine/query';
import { canShoot, eliteHas, rangeOf } from '../engine/elites';
import { UNIT_STATS, canEvadeType } from '../engine/units';
import type { GameState, HexId, Leader, Unit } from '../engine/types';
import {
  Occ, attachedLeaderOcc, canEvadeOcc, canFireOcc, helmetsOcc, hexDist, ignorableOcc, retreatRoom,
} from './board';
import { binom, pAnyHelmet, strikeDist, type Prof } from './dice';
import { blockVal, leaderVal, nextBanner, type Weights } from './values';

const SIXTH = 1 / 6;

/** Per-die profile of a close-combat strike. */
export function closeProfile(s: GameState, occ: Occ, st: Unit, t: Unit, n: number): Prof {
  const S = UNIT_STATS[st.type];
  let pc = SIXTH;
  let ps = S.swordHits ? SIXTH : 0;
  const ph = (st.type !== 'EL' && helmetsOcc(occ, st)) || eliteHas(st, 'helmetHits') ? SIXTH : 0;
  let pf = SIXTH;
  let sw = 0;
  if (t.type === 'EL') ps = 0;
  else if (ps) sw = swordIgnores(s, t);
  if (st.type === 'EL' && ps && sw === 0) {
    // elephants re-roll every sword: ~0.4 hits and ~0.2 flags per die
    pc = 0.2;
    ps = 0.2;
    pf = 0.2;
  }
  return { n, pc, ps, ph, pf, sw, rd: vsMountedIgnores(st, t) };
}

export function rangedProf(n: number): Prof {
  return { n, pc: SIXTH, ps: 0, ph: 0, pf: SIXTH, sw: 0, rd: 0 };
}

/** Value lost by unit u taking h block losses (bannerM = value of the banner its enemy would gain). */
export function dmgValue(s: GameState, occ: Occ, u: Unit, h: number, bannerM: number): number {
  if (h <= 0) return 0;
  const bv = blockVal(u);
  const l = attachedLeaderOcc(occ, u);
  if (h >= u.blocks) {
    let v = u.blocks * bv + bannerM;
    if (l) v += SIXTH * (bannerM + leaderVal(s, l)) + 0.04;
    return v;
  }
  let v = h * bv;
  if (l) v += (1 / 36) * (bannerM + leaderVal(s, l));
  return v;
}

function roomFn(s: GameState, occ: Occ, u: Unit): (need: number) => number {
  const memo: number[] = [];
  return (need: number) => {
    const m = memo[need];
    if (m !== undefined) return m;
    const r = u.type === 'EL' ? need : retreatRoom(s, occ, u, need);
    memo[need] = r;
    return r;
  };
}

/**
 * Expected value of `st` striking `v` (no battle back): damage incl. flag losses, plus a small value for pushing it back.
 * Returns value from the striker's point of view and the elimination probability.
 */
export function strikeValue(s: GameState, occ: Occ, st: Unit, v: Unit, prof: Prof, kind: 'close' | 'ranged'): { ev: number; pElim: number; pRetreat: number } {
  const n = prof.n;
  if (n <= 0) return { ev: 0, pElim: 0, pRetreat: 0 };
  const bm = nextBanner(s, st.side);
  const D = strikeDist(prof);
  const W1 = n + 1;
  const ign = ignorableOcc(s, occ, v, kind, st);
  const per = retreatPerFlag(v, st);
  const room = roomFn(s, occ, v);
  const full = dmgValue(s, occ, v, v.blocks, bm);
  let ev = 0;
  let pe = 0;
  let pr = 0;
  for (let h = 0; h <= n; h++) {
    for (let f = 0; h + f <= n; f++) {
      const P = D[h * W1 + f];
      if (!P) continue;
      if (h >= v.blocks) {
        ev += P * full;
        pe += P;
        continue;
      }
      const fe = f - ign;
      if (fe > 0) {
        const need = fe * per;
        const r = room(need);
        const tot = h + (need - r);
        if (tot >= v.blocks) {
          ev += P * full;
          pe += P;
          continue;
        }
        ev += P * (dmgValue(s, occ, v, tot, bm) + 0.015 * r);
        if (r > 0) pr += P;
      } else ev += P * dmgValue(s, occ, v, h, bm);
    }
  }
  return { ev, pElim: pe, pRetreat: pr };
}

/** Expected damage value the defender `t` inflicts on attacker `a` by battling back. */
export function backDamage(s: GameState, occ: Occ, t: Unit, a: Unit): number {
  const n = closeCombatDice(s, t, a, { role: 'back', fullAtStart: t.blocks === t.maxBlocks, ordered: false });
  if (n <= 0) return 0;
  return strikeValue(s, occ, t, a, closeProfile(s, occ, t, a, n), 'close').ev;
}

export function momentumValue(s: GameState, occ: Occ, a: Unit, role: StrikeRole, W: Weights): number {
  if (role === 'bonus') return 0.02;
  const st = UNIT_STATS[a.type];
  const eligible = a.type === 'WA' || st.mounted || (st.foot && !!attachedLeaderOcc(occ, a));
  return 0.03 + (eligible && !s.turn.mods.noClose ? W.bonusValue : 0);
}

export interface EV {
  ev: number;
  pElim: number;
  evade?: boolean;
}

/** The defender stands: attacker's expected gain minus expected battle-back losses. */
export function standEV(s: GameState, occ: Occ, a: Unit, t: Unit, n: number, mom: number, backOverride?: number): EV {
  const back = backOverride ?? backDamage(s, occ, t, a);
  if (n <= 0) return { ev: -back, pElim: 0 };
  const bmA = nextBanner(s, a.side);
  const D = strikeDist(closeProfile(s, occ, a, t, n));
  const W1 = n + 1;
  const ign = ignorableOcc(s, occ, t, 'close', a);
  const per = retreatPerFlag(t, a);
  const room = roomFn(s, occ, t);
  const full = dmgValue(s, occ, t, t.blocks, bmA);
  let ev = 0;
  let pe = 0;
  for (let h = 0; h <= n; h++) {
    for (let f = 0; h + f <= n; f++) {
      const P = D[h * W1 + f];
      if (!P) continue;
      if (h >= t.blocks) {
        ev += P * (full + mom);
        pe += P;
        continue;
      }
      const fe = f - ign;
      if (fe > 0) {
        const need = fe * per;
        const r = room(need);
        const tot = h + (need - r);
        if (tot >= t.blocks) {
          ev += P * (full + mom);
          pe += P;
          continue;
        }
        ev += P * dmgValue(s, occ, t, tot, bmA);
        if (r > 0) ev += P * (mom + 0.015 * r);
        else ev -= P * back;
      } else ev += P * (dmgValue(s, occ, t, h, bmA) - back);
    }
  }
  return { ev, pElim: pe };
}

/** Attacker's expected value when the defender evades (class symbols only, no battle back). */
export function evadeEV(s: GameState, occ: Occ, a: Unit, t: Unit, n: number): EV {
  const pmf = binom(n, SIXTH);
  const bm = nextBanner(s, a.side);
  let ev = 0;
  let pe = 0;
  for (let k = 0; k <= n; k++) {
    ev += pmf[k] * dmgValue(s, occ, t, k, bm);
    if (k >= t.blocks) pe += pmf[k];
  }
  return { ev: ev + 0.015, pElim: pe, evade: true };
}

/** Full close-combat estimate from the attacker's point of view (defender plays its best of stand/evade). */
export function closeAttackEV(s: GameState, occ: Occ, a: Unit, t: Unit, role: StrikeRole, ordered: boolean, W: Weights): EV {
  const n = closeCombatDice(s, a, t, { role, fullAtStart: a.blocks === a.maxBlocks, ordered });
  const mom = momentumValue(s, occ, a, role, W);
  const st = standEV(s, occ, a, t, n, mom);
  if (canEvadeType(t.type, a.type) && canEvadeOcc(s, occ, t)) {
    const ev = evadeEV(s, occ, a, t, n);
    if (ev.ev <= st.ev) return ev;
  }
  return st;
}

/** Attacking a lone leader: any helmet kills him; otherwise he must evade. */
export function leaderAttackEV(s: GameState, a: Unit, l: Leader, n: number): EV {
  const pk = pAnyHelmet(n);
  return { ev: pk * (nextBanner(s, a.side) + leaderVal(s, l)) + (1 - pk) * 0.03, pElim: pk };
}

export function rangedEV(s: GameState, occ: Occ, f: Unit, target: HexId, dice: number): EV {
  const tu = occ.unit[target];
  if (tu) {
    const r = strikeValue(s, occ, f, tu, rangedProf(dice), 'ranged');
    return { ev: r.ev, pElim: r.pElim };
  }
  const l = occ.leader[target];
  if (l) return leaderAttackEV(s, f, l, dice);
  return { ev: 0, pElim: 0 };
}

export interface AttackOpt {
  unit: string;
  target: HexId;
  kind: 'close' | 'ranged';
  ev: number;
  pElim: number;
  must: boolean;
}

/** All legal attacks for the active side right now, with estimated values. */
export function attackOptions(s: GameState, W: Weights, occIn?: Occ): AttackOpt[] {
  const occ = occIn ?? new Occ(s);
  const out: AttackOpt[] = [];
  for (const id in s.turn.ordered) {
    const op = s.turn.ordered[id];
    if (op.isLeader || op.battlesLeft <= 0) continue;
    const ts = battleTargets(s, id);
    if (!ts.length) continue;
    const u = unitById(s, id)!;
    for (const t of ts) {
      let r: EV;
      if (t.kind === 'close') {
        const tu = occ.unit[t.hex];
        if (tu) r = closeAttackEV(s, occ, u, tu, 'attack', true, W);
        else {
          const l = occ.leader[t.hex]!;
          r = leaderAttackEV(s, u, l, closeCombatDice(s, u, l, { role: 'attack', fullAtStart: u.blocks === u.maxBlocks, ordered: true }));
        }
      } else {
        r = rangedEV(s, occ, u, t.hex, rangedDice(s, u, t.hex, op.moved, true));
      }
      out.push({ unit: id, target: t.hex, kind: t.kind, ev: r.ev, pElim: r.pElim, must: op.mustBattle && t.kind === 'close' });
    }
  }
  return out;
}

/**
 * Best value of the attack a unit could make this turn from its current hex (used when planning moves).
 * The unit's hex must already be set to the candidate destination.
 */
export function attackNowValue(s: GameState, occ: Occ, u: Unit, moved: number, canBattle: boolean, mustBattle: boolean, W: Weights): number {
  if (!canBattle) return 0;
  const m = s.turn.mods;
  let best = 0;
  let bestClose = -Infinity;
  if (!m.noClose) {
    for (const h of neighbours(u.hex)) {
      const v = occ.unit[h];
      let ev: number;
      if (v) {
        if (v.side === u.side) continue;
        ev = closeAttackEV(s, occ, u, v, 'attack', true, W).ev;
      } else {
        const l = occ.leader[h];
        if (!l || l.side === u.side) continue;
        ev = leaderAttackEV(s, u, l, closeCombatDice(s, u, l, { role: 'attack', fullAtStart: u.blocks === u.maxBlocks, ordered: true })).ev;
      }
      if (ev > bestClose) bestClose = ev;
    }
  }
  if (mustBattle) return bestClose === -Infinity ? -0.5 : bestClose;
  if (bestClose > best) best = bestClose;
  if (!m.noRanged && canShoot(u) && !(u.type === 'AX' && moved >= 2)) {
    const range = rangeOf(u);
    for (const v of s.units) {
      if (v.side === u.side || v.hex < 0) continue;
      const d = hexDist(u.hex, v.hex);
      if (d < 2 || d > range) continue;
      if (!canFireOcc(s, occ, u, v.hex)) continue;
      const dice = rangedDice(s, u, v.hex, moved, true);
      const ev = rangedEV(s, occ, u, v.hex, dice).ev * Math.max(1, m.shots);
      if (ev > best) best = ev;
    }
  }
  return best;
}
