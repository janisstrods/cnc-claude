// Pure combat calculations: dice counts, hit scoring, flag ignores (rules-reference §3, §4, §10).
import { distance, hasLineOfSight, neighbours } from './hex';
import { attachedLeader, enemyUnitAdjacent, leaderAt, leaderNear, supportCount, unitAt } from './query';
import { ccCapOfHex, hillGroups, isCamp, isHill, rangedFromCap, rangedTargetCap, terrainBlocksLOS } from './terrain';
import { UNIT_STATS, elephantDiceVs } from './units';
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

/** Number of dice `striker` rolls in close combat against `target` (a unit or a lone leader). */
export function closeCombatDice(s: GameState, striker: Unit, target: Unit | Leader, opts: CloseDiceOpts): number {
  const st = UNIT_STATS[striker.type];
  const targetIsUnit = 'type' in target;
  let base: number;
  if (striker.type === 'EL') base = targetIsUnit ? elephantDiceVs((target as Unit).type) : 1;
  else base = opts.role === 'back' || opts.role === 'firstStrike' ? st.ccBack : st.cc;
  if (striker.type === 'WA' && opts.fullAtStart) base += 1;
  const cap = Math.min(ccCapOfHex(s, striker.hex), ccCapOfHex(s, target.hex), capForHills(s, striker.hex, target.hex, striker));
  let dice = Math.min(base, cap);
  if (isCamp(s, striker.hex)) dice -= 1;
  if (opts.ordered && striker.side === s.active) {
    const m = s.turn.mods;
    if (opts.role === 'attack') dice += m.ccBonus;
    else if (opts.role === 'bonus' && m.ccBonusOnBonusCombat) dice += m.ccBonus;
  }
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
  const range = UNIT_STATS[firer.type].range;
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

/** How many sword hits the target ignores in close combat (before elephant re-rolls). */
export function swordIgnores(s: GameState, target: Unit): number {
  if (target.type === 'EL') return 99;
  let n = 0;
  if (target.type === 'HCH') n += 1;
  if (isCamp(s, target.hex) && UNIT_STATS[target.type].foot) n += 1;
  return n;
}

/** Red-square hits an elephant ignores from a cavalry/chariot striker. */
export function redIgnores(striker: Unit, target: Unit): number {
  const st = UNIT_STATS[striker.type];
  return target.type === 'EL' && (st.cavalry || st.chariot) ? 1 : 0;
}

/**
 * Score close combat dice (elephant re-rolls must already be included in `faces`, in roll order).
 * `leaderHelmets`: a friendly leader is attached/adjacent to the striker (and the striker is not an elephant).
 */
export function scoreClose(s: GameState, striker: Unit, target: Unit, faces: DieFace[], leaderHelmets: boolean): Scored {
  const st = UNIT_STATS[striker.type];
  const cls = UNIT_STATS[target.type].cls;
  let swordsLeft = swordIgnores(s, target);
  let redLeft = redIgnores(striker, target);
  const scoring: boolean[] = [];
  let hits = 0;
  let flags = 0;
  for (const f of faces) {
    let hit = false;
    if (f === cls) {
      if (f === 'heavy' && redLeft > 0) redLeft--;
      else hit = true;
    } else if (f === 'swords') {
      if (st.swordHits) {
        if (swordsLeft > 0) swordsLeft--;
        else hit = true;
      }
    } else if (f === 'leader') {
      hit = leaderHelmets || !!striker.sacredBand;
    } else if (f === 'flag') {
      flags++;
    }
    scoring.push(hit || f === 'flag');
    if (hit) hits++;
  }
  return { faces, scoring, hits, flags };
}

/** Whether helmets score for this striker (leader attached/adjacent, not an elephant). */
export function helmetsCount(s: GameState, striker: Unit): boolean {
  if (striker.type === 'EL') return false;
  return leaderNear(s, striker.hex, striker.side);
}

/** Score ranged combat / evade rolls: only class symbols hit (flags counted for ranged). */
export function scoreClassOnly(target: Unit, faces: DieFace[], countFlags: boolean): Scored {
  const cls = UNIT_STATS[target.type].cls;
  const scoring: boolean[] = [];
  let hits = 0;
  let flags = 0;
  for (const f of faces) {
    const hit = f === cls;
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
  /** Leader attached at the time flags are applied and still alive. */
  leaderAlive: boolean;
  /** Target was a full-strength warrior when this combat began. */
  fullAtStart: boolean;
}

/** Number of flags the target may ignore (bolster morale, terrain, special). */
export function ignorableFlags(s: GameState, target: Unit, ctx: IgnoreContext): number {
  if (target.type === 'EL') {
    if (ctx.kind === 'close' && ctx.striker) {
      const st = UNIT_STATS[ctx.striker.type];
      if (st.cavalry || st.chariot) return 1;
    }
    return 0;
  }
  let n = 0;
  if (ctx.leaderAlive && attachedLeader(s, target)) n++;
  if (supportCount(s, target) >= 2) n++;
  if (isCamp(s, target.hex) && UNIT_STATS[target.type].foot) n++;
  if (target.type === 'WA' && ctx.fullAtStart) n++;
  if (target.sacredBand) n++;
  return n;
}

/** Retreat hexes per accepted flag for `target`, given who rolled the flags. */
export function retreatPerFlag(target: Unit, striker: Unit | null): number {
  const st = UNIT_STATS[target.type];
  let n = st.retreat;
  if (striker && striker.type === 'EL' && (st.cavalry || st.chariot)) n += 1;
  return n;
}

/** Probability helpers for UI/AI: chance a single die hits a target of this class in close combat. */
export function closeHitChance(s: GameState, striker: Unit, target: Unit): number {
  const cls = UNIT_STATS[target.type].cls;
  let p = 1 / 6; // class symbol
  if (UNIT_STATS[striker.type].swordHits && target.type !== 'EL') p += 1 / 6;
  if (striker.type !== 'EL' && (helmetsCount(s, striker) || striker.sacredBand)) p += 1 / 6;
  if (cls === 'heavy' && redIgnores(striker, target)) p -= 1 / 18; // rough
  return p;
}
