// Analytic combat estimator: expected value (in banner units) of attacks, battle backs, evades and ranged fire.
import { CARD_DEFS } from '../engine/cards';
import { battleTargets, rollingFirePaths, rollingFireRoutes } from '../engine/flow';
import { closeCombatDice, rangedDice, retreatPerFlag, swordIgnores, vsMountedIgnores, type StrikeRole } from '../engine/combat';
import { neighbours } from '../engine/hex';
import { other, unitById } from '../engine/query';
import { isHill, isWall } from '../engine/terrain';
import { canShoot, eliteHas, fireMoveLimit, rangeOf } from '../engine/elites';
import { UNIT_STATS, bonusCombatEligible, canEvadeType } from '../engine/units';
import type { Answer, GameState, HexId, Leader, Unit } from '../engine/types';
import {
  Occ, attachedLeaderOcc, canEvadeOcc, canFireOcc, helmetsOcc, hexDist, ignorableOcc, mayCloseCombat, retreatRoom, shortfall,
} from './board';
import { binom, pAnyHelmet, strikeDist, type Prof } from './dice';
import { blockVal, leaderVal, nextBanner, type Weights } from './values';

const SIXTH = 1 / 6;

/** Per-die profile of a close-combat strike by `st` (in `role`) against `t`. */
export function closeProfile(s: GameState, occ: Occ, st: Unit, t: Unit, n: number, role: StrikeRole): Prof {
  const S = UNIT_STATS[st.type];
  let pc = SIXTH;
  let ps = S.swordHits ? SIXTH : 0;
  const ph = helmetsOcc(occ, st) || eliteHas(st, 'helmetHits') ? SIXTH : 0;
  let pf = SIXTH;
  let sw = 0;
  if (UNIT_STATS[t.type].ignoreAllSwords) ps = 0;
  else if (ps) sw = swordIgnores(s, t, st, role);
  if (S.elephantTable && ps && sw === 0) {
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
    // a blocked elephant retreat costs the blocking pieces, not the elephant: treat its room as unlimited
    const r = UNIT_STATS[u.type].elephantTable ? need : retreatRoom(s, occ, u, need);
    memo[need] = r;
    return r;
  };
}

/**
 * Expected value of `st` striking `v` (no battle back): damage incl. flag losses, plus a small value for pushing it back.
 * Returns value from the striker's point of view and the elimination probability. `role`: the striker's close-combat
 * role (null for a roll against a unit that is itself attacking, which no rampart protects).
 */
export function strikeValue(
  s: GameState, occ: Occ, st: Unit, v: Unit, prof: Prof, kind: 'close' | 'ranged', role: StrikeRole | null = null,
): { ev: number; pElim: number; pRetreat: number } {
  const n = prof.n;
  if (n <= 0) return { ev: 0, pElim: 0, pRetreat: 0 };
  const bm = nextBanner(s, st.side);
  const D = strikeDist(prof);
  const W1 = n + 1;
  const ign = ignorableOcc(s, occ, v, kind, st, role);
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
        const tot = h + shortfall(s, v, need, r);
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
  return strikeValue(s, occ, t, a, closeProfile(s, occ, t, a, n, 'back'), 'close').ev;
}

export function momentumValue(s: GameState, occ: Occ, a: Unit, role: StrikeRole, W: Weights): number {
  const st = UNIT_STATS[a.type];
  if (st.noMomentum) return 0; // war machines never advance
  if (role === 'bonus') return 0.02;
  const eligible = bonusCombatEligible(st, !!attachedLeaderOcc(occ, a));
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
  // the attacker's roll (attack or bonus combat: the same for every ignore, incl. a rampart)
  const D = strikeDist(closeProfile(s, occ, a, t, n, 'attack'));
  const W1 = n + 1;
  const ign = ignorableOcc(s, occ, t, 'close', a, 'attack');
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
        const tot = h + shortfall(s, t, need, r);
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

/** A machine that stays keeps shooting with its full dice however few blocks it has left: worth more than its blocks. */
const ABANDON_EXTRA = 0.1;

/**
 * Value lost by a war machine that survives its evade roll with `h` hits: it is abandoned after the evade move (§15), so
 * every block is lost but no banner is scored; an attached leader was checked when hit and is left standing alone.
 */
function abandonValue(s: GameState, occ: Occ, t: Unit, h: number, bannerM: number): number {
  const l = attachedLeaderOcc(occ, t);
  let v = t.blocks * blockVal(t) + ABANDON_EXTRA;
  if (l) v += (h > 0 ? (bannerM + leaderVal(s, l)) / 36 : 0) + 0.03;
  return v;
}

/**
 * Attacker's expected value when the defender evades (class symbols only, no battle back). A camel ignores 1 blue
 * triangle of a horse's roll (§15); a war machine that survives the roll is abandoned anyway.
 */
export function evadeEV(s: GameState, occ: Occ, a: Unit, t: Unit, n: number): EV {
  const pmf = binom(n, SIXTH);
  const bm = nextBanner(s, a.side);
  const ign = vsMountedIgnores(a, t);
  const abandoned = UNIT_STATS[t.type].evadeRemoves;
  let ev = 0;
  let pe = 0;
  for (let k = 0; k <= n; k++) {
    const h = Math.max(0, k - ign);
    ev += pmf[k] * (abandoned && h < t.blocks ? abandonValue(s, occ, t, h, bm) : dmgValue(s, occ, t, h, bm));
    if (h >= t.blocks) pe += pmf[k];
  }
  return { ev: ev + 0.015, pElim: pe, evade: true };
}

/**
 * City wall (§18.7): does defender `t`, standing on a wall hex, strike first against `a` without a card (mirror of the
 * engine's `wallStrikesFirst`)? Always, unless the attacker stands on a wall hex itself.
 */
export function wallStrikesFirst(s: GameState, t: Unit, a: Unit): boolean {
  return t.hex >= 0 && isWall(s, t.hex) && !isWall(s, a.hex);
}

/**
 * The defender on a city wall stands (§18.7): it strikes first (its battle-back dice, capped at 2, as First Strike), the
 * attack goes on only if the attacker survives in its hex (also after losing blocks for a retreat it could not take), and
 * the defender never battles back afterwards. Attacker's point of view, like `standEV` (whose expected gain it scales
 * by the chance the attack happens at all).
 */
export function wallStandEV(s: GameState, occ: Occ, a: Unit, t: Unit, n: number, mom: number): EV {
  const nb = closeCombatDice(s, t, a, { role: 'firstStrike', fullAtStart: t.blocks === t.maxBlocks, ordered: false });
  const fs = nb > 0 ? strikeValue(s, occ, t, a, closeProfile(s, occ, t, a, nb, 'firstStrike'), 'close') : { ev: 0, pElim: 0, pRetreat: 0 };
  const pStop = Math.min(1, fs.pElim + fs.pRetreat);
  const after = standEV(s, occ, a, t, n, mom, 0); // the attacker's roll, no battle back
  return { ev: -fs.ev + (1 - pStop) * after.ev, pElim: (1 - pStop) * after.pElim };
}

/** Full close-combat estimate from the attacker's point of view (defender plays its best of stand/evade). */
export function closeAttackEV(s: GameState, occ: Occ, a: Unit, t: Unit, role: StrikeRole, ordered: boolean, W: Weights): EV {
  const n = closeCombatDice(s, a, t, { role, fullAtStart: a.blocks === a.maxBlocks, ordered });
  const mom = momentumValue(s, occ, a, role, W);
  const st = wallStrikesFirst(s, t, a) ? wallStandEV(s, occ, a, t, n, mom) : standEV(s, occ, a, t, n, mom);
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
  /** The target hex (Rolling Fire: the first hex of the path). */
  target: HexId;
  kind: 'close' | 'ranged' | 'rolling';
  ev: number;
  pElim: number;
  must: boolean;
  /** Rolling Fire (210, §18.5): the path the logs roll down. */
  path?: HexId[];
}

/** The battle answer that makes this attack. */
export function attackAnswer(o: AttackOpt): Answer {
  return o.kind === 'rolling' ? { kind: 'rollingFire', unit: o.unit, path: o.path! } : { kind: 'attack', unit: o.unit, target: o.target };
}

/** Does `a` make the attack `o`? */
export function sameAttack(a: Answer, o: AttackOpt): boolean {
  if (o.kind === 'rolling') return a.kind === 'rollingFire' && a.unit === o.unit && a.path.length === o.path!.length && a.path.every((h, i) => h === o.path![i]);
  return a.kind === 'attack' && a.unit === o.unit && a.target === o.target;
}

// ---------------------------------------------------------------------------
// Rolling Fire (210 Picenum, §18.5)
// ---------------------------------------------------------------------------

/** Dice rolled against each unit in a Rolling Fire path. */
const LOG_DICE = 2;

/**
 * Value unit v loses to the burning logs: 2 dice, only its class symbol hits, every flag counts (none may be ignored),
 * no battle back. `bannerM`: the banner its enemy would gain if it is eliminated.
 */
export function logsDamage(s: GameState, occ: Occ, v: Unit, bannerM: number): number {
  const D = strikeDist(rangedProf(LOG_DICE));
  const W1 = LOG_DICE + 1;
  const per = retreatPerFlag(v, null);
  const room = roomFn(s, occ, v);
  let ev = 0;
  for (let h = 0; h <= LOG_DICE; h++) {
    for (let f = 0; h + f <= LOG_DICE; f++) {
      const P = D[h * W1 + f];
      if (!P) continue;
      let tot = h;
      if (f > 0) {
        const need = f * per;
        tot += shortfall(s, v, need, room(need));
      }
      ev += P * (dmgValue(s, occ, v, Math.min(tot, v.blocks), bannerM) + (f > 0 ? 0.01 : 0));
    }
  }
  return ev;
}

/**
 * Value for `u`'s side of rolling logs down `path` from where `u` stands: the expected damage to enemy units in the path
 * minus that to friendly units, minus the block the rolling unit loses (its elimination gives the enemy a banner). A
 * lone leader in the path evades (a small gain or loss).
 */
export function rollingFireEV(s: GameState, occ: Occ, u: Unit, path: readonly HexId[]): { ev: number; enemies: number } {
  const foe = other(u.side);
  const bmFoe = nextBanner(s, foe);
  const bmOwn = nextBanner(s, u.side);
  let ev = 0;
  let enemies = 0;
  for (const h of path) {
    const v = occ.unit[h];
    if (v) {
      if (v.side === u.side) ev -= logsDamage(s, occ, v, bmFoe);
      else {
        ev += logsDamage(s, occ, v, bmOwn);
        enemies++;
      }
      continue;
    }
    const l = occ.leader[h];
    if (l) ev += l.side === u.side ? -0.02 : 0.02;
  }
  return { ev: ev - dmgValue(s, occ, u, 1, bmFoe), enemies };
}

/** Minimum value of a Rolling Fire worth its block: never one that hits no enemy unit. */
const ROLLING_MIN = 0.02;

/** Best Rolling Fire for `u` from where it stands (any path; the unit must be eligible), or null. */
function bestRolling(s: GameState, occ: Occ, u: Unit, paths: HexId[][]): { path: HexId[]; ev: number } | null {
  let best: { path: HexId[]; ev: number } | null = null;
  for (const p of paths) {
    const r = rollingFireEV(s, occ, u, p);
    if (r.enemies === 0 || r.ev < ROLLING_MIN) continue;
    if (!best || r.ev > best.ev) best = { path: p, ev: r.ev };
  }
  return best;
}

/**
 * Rolling Fire value of a unit that has not moved, as planned from its hex (moves.ts): a Rolling Fire side's infantry
 * on a hill, ordered by a card that is not a Tactic card. 0 when it may not roll or no path is worth it.
 */
function rollingNow(s: GameState, occ: Occ, u: Unit, moved: number): number {
  const side = s.special.rollingFire;
  if (side !== u.side || moved > 0 || !UNIT_STATS[u.type].infantry || !isHill(s, u.hex)) return 0;
  const kind = s.turn.effective;
  if (!kind || CARD_DEFS[kind].group === 'tactic') return 0;
  return bestRolling(s, occ, u, rollingFireRoutes(s, side, u.hex))?.ev ?? 0;
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
  // Rolling Fire (210): the best path of each eligible unit, when it hits an enemy and is worth its block
  if (s.special.rollingFire === s.active) {
    for (const id in s.turn.ordered) {
      const paths = rollingFirePaths(s, id);
      if (!paths.length) continue;
      const u = unitById(s, id)!;
      const best = bestRolling(s, occ, u, paths);
      if (best) out.push({ unit: id, target: best.path[0], kind: 'rolling', ev: best.ev, pElim: 0, must: false, path: best.path });
    }
  }
  return out;
}

/**
 * Best value of the attack a unit could make this turn from its current hex (used when planning moves).
 * The unit's hex must already be set to the candidate destination. `startHex`: where the unit began the turn (default:
 * its ordered start hex, else where it stands), which decides whether a mounted unit may attack a city wall (§18.7).
 */
export function attackNowValue(
  s: GameState, occ: Occ, u: Unit, moved: number, canBattle: boolean, mustBattle: boolean, W: Weights, startHex?: HexId,
): number {
  if (!canBattle) return 0;
  const m = s.turn.mods;
  let best = s.special.rollingFire === u.side ? rollingNow(s, occ, u, moved) : 0;
  let bestClose = -Infinity;
  if (!m.noClose) {
    const start = startHex ?? s.turn.ordered[u.id]?.startHex ?? u.hex;
    for (const h of neighbours(u.hex)) {
      if (!mayCloseCombat(s, u, h, start)) continue;
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
  return shotValue(s, occ, u, moved, best);
}

/**
 * Best value of a ranged attack by u from its current hex after moving `moved` hexes this turn (all of the card's shots
 * at the best target), or `floor` when nothing beats it (no target in range and sight, the card forbids fire...).
 */
export function shotValue(s: GameState, occ: Occ, u: Unit, moved: number, floor = 0): number {
  const m = s.turn.mods;
  let best = floor;
  if (!m.noRanged && canShoot(u) && moved < fireMoveLimit(u)) {
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
