// Pure combat calculations: dice counts, hit scoring, flag ignores (rules-reference §3, §4, §10).
import { distance, hasLineOfSight, neighbours } from './hex';
import { attachedLeader, enemyUnitAdjacent, leaderAt, leaderHas, leaderNear, supportCount, unitAt } from './query';
import { ccCapOfHex, hillGroups, isCamp, isHill, rampartProtects, rangedFromCap, rangedTargetCap, terrainBlocksLOS } from './terrain';
import { eliteHas, rangeOf } from './elites';
import { UNIT_STATS, elephantDiceVs, frightens } from './units';
import type { DieFace, GameState, HexId, Leader, Unit } from './types';

export type StrikeRole = 'attack' | 'bonus' | 'back' | 'firstStrike';

export interface CloseDiceOpts {
  role: StrikeRole;
  /** Was the striking unit at full strength when this combat began (warriors' bonus)? */
  fullAtStart: boolean;
  /** Is the striking unit ordered on the active turn (card bonuses apply)? */
  ordered: boolean;
}

function capForHills(s: GameState, from: HexId, to: HexId, striker: Unit): number {
  const fromHill = isHill(s, from);
  const toHill = isHill(s, to);
  if (toHill && !fromHill) return 2;
  if (fromHill) return UNIT_STATS[striker.type].mounted ? 2 : 3;
  return 99;
}

/**
 * Extra close-combat dice from the striker's attached leader: Alexander's +1 (`ccBonus`, §17.2). Checked when the dice
 * are counted, so a leader killed earlier in the combat gives nothing; never for elephants (they gain nothing from leaders).
 */
export function leaderDiceBonus(s: GameState, striker: Unit): number {
  if (UNIT_STATS[striker.type].noLeaderBenefit) return 0;
  const l = attachedLeader(s, striker);
  return l && leaderHas(l, 'ccBonus') ? 1 : 0;
}

/**
 * Number of dice `striker` rolls in close combat against `target` (a unit or a lone leader): base dice, capped by
 * terrain, -1 on a camp, then card bonuses and Alexander's +1 (§4, §17.2).
 */
export function closeCombatDice(s: GameState, striker: Unit, target: Unit | Leader, opts: CloseDiceOpts): number {
  const st = UNIT_STATS[striker.type];
  const targetIsUnit = 'type' in target;
  let base: number;
  if (st.elephantTable) base = targetIsUnit ? elephantDiceVs((target as Unit).type) : 1;
  else base = opts.role === 'back' || opts.role === 'firstStrike' ? st.ccBack : st.cc;
  if (st.fullStrengthBonus && opts.fullAtStart) base += 1;
  const cap = Math.min(ccCapOfHex(s, striker.hex), ccCapOfHex(s, target.hex), capForHills(s, striker.hex, target.hex, striker));
  let dice = Math.min(base, cap);
  if (isCamp(s, striker.hex)) dice -= 1;
  if (opts.ordered && striker.side === s.active) {
    const m = s.turn.mods;
    if (opts.role === 'attack') dice += m.ccBonus;
    else if (opts.role === 'bonus' && m.ccBonusOnBonusCombat) dice += m.ccBonus;
  }
  dice += leaderDiceBonus(s, striker);
  return Math.max(0, dice);
}

/** Dice for ranged combat. `moved` = hexes moved this turn. */
export function rangedDice(s: GameState, firer: Unit, targetHex: HexId, moved: number, ordered: boolean): number {
  let dice = moved > 0 ? 1 : 2;
  dice = Math.min(dice, rangedFromCap(s, firer.hex), rangedTargetCap(s, targetHex));
  if (isCamp(s, firer.hex)) dice -= 1;
  if (ordered && firer.side === s.active) dice += s.turn.mods.rangedBonus;
  return Math.max(0, dice);
}

/** Does anything block line of sight from `from` to `to`? */
export function lineOfSight(s: GameState, from: HexId, to: HexId): boolean {
  let groups: Map<HexId, number> | null = null;
  const fromHillGroup = () => {
    groups ??= hillGroups(s, neighbours);
    return groups;
  };
  return hasLineOfSight(from, to, (h) => {
    if (unitAt(s, h) || leaderAt(s, h)) return true;
    if (terrainBlocksLOS(s, h)) return true;
    if (isHill(s, h)) {
      if (isHill(s, from) && isHill(s, to)) {
        const g = fromHillGroup();
        const gf = g.get(from);
        if (gf !== undefined && gf === g.get(to) && gf === g.get(h)) return false;
      }
      return true;
    }
    return false;
  });
}

/** Can `firer` make a ranged attack at `targetHex` (ignoring order state)? */
export function canFireAt(s: GameState, firer: Unit, targetHex: HexId): boolean {
  const range = rangeOf(firer);
  if (range === 0) return false;
  const d = distance(firer.hex, targetHex);
  if (d < 2 || d > range) return false;
  if (enemyUnitAdjacent(s, firer.hex, firer.side)) return false;
  const tu = unitAt(s, targetHex);
  const tl = leaderAt(s, targetHex);
  if (tu) {
    if (tu.side === firer.side) return false;
  } else if (!tl || tl.side === firer.side) return false;
  return lineOfSight(s, firer.hex, targetHex);
}

export interface Scored {
  faces: DieFace[];
  scoring: boolean[];
  hits: number;
  flags: number;
}

/**
 * Rampart protection (§16) of `target` against a roll by `striker`: only a foot unit, and only when the roll reaches it
 * through a protected hexside of its rampart hex. Close combat: the roll of an enemy attacking it (`role` 'attack' or
 * 'bonus', incl. the attack after its own First Strike) from the neighbour across that side; never the battle back or
 * First Strike against a rampart unit that attacked out **[Interp]**. Ranged: the line of fire enters through that side
 * (at a corner, either side counts **[Interp]**).
 */
export function rampartShields(s: GameState, target: Unit, striker: Unit | null, kind: 'close' | 'ranged', role?: StrikeRole | null): boolean {
  if (!striker || !s.rampart[target.hex] || !UNIT_STATS[target.type].foot) return false;
  if (kind === 'close' && role !== 'attack' && role !== 'bonus') return false;
  return rampartProtects(s, target.hex, striker.hex);
}

/**
 * How many sword hits the target ignores in close combat (an elephant does not re-roll an ignored sword). Pass the
 * `striker` and its `role` to include the rampart (§16); without them only the position-independent ignores count.
 */
export function swordIgnores(s: GameState, target: Unit, striker: Unit | null = null, role: StrikeRole | null = null): number {
  const t = UNIT_STATS[target.type];
  if (t.ignoreAllSwords) return 99;
  let n = t.swordIgnore;
  if (isCamp(s, target.hex) && t.foot) n += 1;
  if (eliteHas(target, 'ignoreSword')) n += 1;
  if (rampartShields(s, target, striker, 'close', role)) n += 1;
  return n;
}

/** Is the striker a cavalry or chariot unit (the rollers that `vsMounted*` abilities react to)? */
function cavalryOrChariot(striker: Unit): boolean {
  const st = UNIT_STATS[striker.type];
  return st.cavalry || st.chariot;
}

/** Hits it ignores from a cavalry/chariot striker's close-combat roll (EL: 1 red square, CAM: 1 blue triangle). */
export function vsMountedIgnores(striker: Unit, target: Unit): number {
  return UNIT_STATS[target.type].vsMountedIgnoreHit !== null && cavalryOrChariot(striker) ? 1 : 0;
}

/** Does a scoring die face fall under the target's `vsMountedIgnoreHit` (its class symbol, or 'any' hit)? */
function vsMountedCovers(target: Unit, f: DieFace): boolean {
  const h = UNIT_STATS[target.type].vsMountedIgnoreHit;
  return h === 'any' || h === f;
}

/**
 * Score close combat dice (elephant re-rolls must already be included in `faces`, in roll order).
 * `leaderHelmets`: a friendly leader is attached/adjacent to the striker (and the striker is not an elephant).
 * `role`: the striker's role in this combat (decides the target's rampart protection, §16).
 */
export function scoreClose(
  s: GameState, striker: Unit, target: Unit, faces: DieFace[], leaderHelmets: boolean, role: StrikeRole = 'attack',
): Scored {
  const st = UNIT_STATS[striker.type];
  const tst = UNIT_STATS[target.type];
  const cls = tst.cls;
  let swordsLeft = swordIgnores(s, target, striker, role);
  let vsMountedLeft = vsMountedIgnores(striker, target);
  const scoring: boolean[] = [];
  let hits = 0;
  let flags = 0;
  for (const f of faces) {
    let hit = false;
    if (f === cls) {
      hit = true;
    } else if (f === 'swords') {
      if (st.swordHits) {
        if (swordsLeft > 0) swordsLeft--;
        else hit = true;
      }
    } else if (f === 'leader') {
      hit = leaderHelmets || eliteHas(striker, 'helmetHits');
    } else if (f === 'flag') {
      flags++;
    }
    if (hit && vsMountedLeft > 0 && vsMountedCovers(target, f)) {
      vsMountedLeft--;
      hit = false;
    }
    scoring.push(hit || f === 'flag');
    if (hit) hits++;
  }
  return { faces, scoring, hits, flags };
}

/**
 * Whether helmets score for this striker (leader attached/adjacent, and the striker benefits from leaders). A satrap
 * (`attachedOnly`) counts only for his own unit.
 */
export function helmetsCount(s: GameState, striker: Unit): boolean {
  if (UNIT_STATS[striker.type].noLeaderBenefit) return false;
  return leaderNear(s, striker.hex, striker.side);
}

/**
 * Score ranged combat / evade rolls: only class symbols hit (flags counted for ranged). Up to `vsMountedIgnore` hits that
 * the target's `vsMountedIgnoreHit` covers are dropped (pass `vsMountedIgnores(striker, target)`: a camel evading a
 * horse's attack ignores 1 blue triangle, §15); other class hits always score.
 */
export function scoreClassOnly(target: Unit, faces: DieFace[], countFlags: boolean, vsMountedIgnore = 0): Scored {
  const cls = UNIT_STATS[target.type].cls;
  const scoring: boolean[] = [];
  let hits = 0;
  let flags = 0;
  let ignoreLeft = vsMountedIgnore;
  for (const f of faces) {
    let hit = f === cls;
    if (hit && ignoreLeft > 0 && vsMountedCovers(target, f)) {
      ignoreLeft--;
      hit = false;
    }
    const flag = countFlags && f === 'flag';
    if (hit) hits++;
    if (flag) flags++;
    scoring.push(hit || flag);
  }
  return { faces, scoring, hits, flags };
}

export interface IgnoreContext {
  kind: 'close' | 'ranged';
  striker: Unit | null;
  /** Close combat: the striker's role (a rampart protects only against an attack or bonus combat roll, §16). */
  role?: StrikeRole;
  /** Leader attached at the time flags are applied and still alive. */
  leaderAlive: boolean;
  /** Target was a full-strength warrior when this combat began. */
  fullAtStart: boolean;
}

/** Number of flags the target may ignore (bolster morale, terrain, special). */
export function ignorableFlags(s: GameState, target: Unit, ctx: IgnoreContext): number {
  const t = UNIT_STATS[target.type];
  let n = 0;
  if (!t.noLeaderBenefit) {
    if (ctx.leaderAlive && attachedLeader(s, target)) n++;
    if (supportCount(s, target) >= 2) n++;
  }
  if (isCamp(s, target.hex) && t.foot) n++;
  if (t.fullStrengthBonus && ctx.fullAtStart) n++;
  if (eliteHas(target, 'ignoreFlag')) n++;
  if (t.vsMountedIgnoreFlag && ctx.kind === 'close' && ctx.striker && cavalryOrChariot(ctx.striker)) n++;
  if (rampartShields(s, target, ctx.striker, ctx.kind, ctx.role)) n++;
  return n;
}

/** Retreat hexes per accepted flag for `target`, given who rolled the flags. */
export function retreatPerFlag(target: Unit, striker: Unit | null): number {
  let n = UNIT_STATS[target.type].retreat;
  if (striker && frightens(striker, target)) n += 1;
  return n;
}

/** Expected number of swords beyond the first `k` among `dice` dice (E[max(0, S - k)], S ~ Binomial(dice, 1/6)). */
function swordsBeyond(dice: number, k: number): number {
  let pmf = Math.pow(5 / 6, dice); // P(S = 0)
  let e = 0;
  for (let j = 0; j <= dice; j++) {
    if (j > k) e += (j - k) * pmf;
    pmf = (pmf * (dice - j)) / (j + 1) / 5; // P(S = j + 1) from P(S = j)
  }
  return e;
}

/**
 * Probability helper for UI previews: average chance per die that a close-combat roll of `dice` dice by `striker` (in
 * `role`) hits `target`: its class symbol, swords beyond those the target ignores (HCH, camp, Companions, rampart), and
 * helmets when a leader helps.
 */
export function closeHitChance(s: GameState, striker: Unit, target: Unit, dice = 1, role: StrikeRole = 'attack'): number {
  const sst = UNIT_STATS[striker.type];
  const tst = UNIT_STATS[target.type];
  let p = 1 / 6; // class symbol
  if (sst.swordHits && !tst.ignoreAllSwords) {
    const k = swordIgnores(s, target, striker, role);
    p += k > 0 && dice > 0 ? swordsBeyond(dice, k) / dice : 1 / 6;
  }
  if (!sst.noLeaderBenefit && (helmetsCount(s, striker) || eliteHas(striker, 'helmetHits'))) p += 1 / 6;
  if (vsMountedCovers(target, tst.cls) && vsMountedIgnores(striker, target)) p -= 1 / 18; // rough
  return p;
}
