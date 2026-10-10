// Fast board helpers for the AI: distance table, occupancy, retreat room, LOS and flag rules mirrored with O(1) lookups.
import { ALL_HEXES, distance, hasLineOfSight, neighbours, rearHexes, rowOf } from '../engine/hex';
import { hillGroups, isCamp, isHill, isImpassable, terrainAt, terrainBlocksLOS } from '../engine/terrain';
import { frightAtFirstSight, rampartShields, type StrikeRole } from '../engine/combat';
import { canShoot, eliteHas, rangeOf } from '../engine/elites';
import { leaderHas } from '../engine/query';
import { UNIT_STATS } from '../engine/units';
import { COLS, ROWS, type GameState, type HexId, type Leader, type Side, type TerrainType, type Unit } from '../engine/types';

export const NHEX = ROWS * COLS;
const DIST = new Uint8Array(NHEX * NHEX).fill(99);
for (const a of ALL_HEXES) for (const b of ALL_HEXES) DIST[a * NHEX + b] = distance(a, b);

export function hexDist(a: HexId, b: HexId): number {
  if (a < 0 || b < 0) return 99;
  return DIST[a * NHEX + b];
}

/** Engine rearHexes tabled per side and hex (it builds a fresh array per call; retreat walks ask for it constantly). */
const REAR: Record<Side, HexId[][]> = { top: [], bottom: [] };
for (let h = 0; h < NHEX; h++) {
  REAR.top.push(rearHexes(h, 'top'));
  REAR.bottom.push(rearHexes(h, 'bottom'));
}

/** rearHexes(h, side) from the table (do not modify the result). */
function rearOf(h: HexId, side: Side): readonly HexId[] {
  return REAR[side][h] ?? rearHexes(h, side);
}

/** Occupancy lookup for a game state (rebuild after any position change). */
export class Occ {
  readonly unit: (Unit | null)[] = new Array(NHEX).fill(null);
  readonly leader: (Leader | null)[] = new Array(NHEX).fill(null);
  constructor(s: GameState) {
    for (const u of s.units) if (u.hex >= 0) this.unit[u.hex] = u;
    for (const l of s.leaders) if (l.hex >= 0) this.leader[l.hex] = l;
  }
}

export function attachedLeaderOcc(occ: Occ, u: Unit): Leader | null {
  if (u.hex < 0) return null;
  const l = occ.leader[u.hex];
  return l && l.side === u.side ? l : null;
}

/** Friendly units and lone friendly leaders adjacent to u. */
export function supportOcc(occ: Occ, u: Unit): number {
  let n = 0;
  for (const h of neighbours(u.hex)) {
    const v = occ.unit[h];
    if (v) {
      if (v.side === u.side) n++;
      continue;
    }
    const l = occ.leader[h];
    if (l && l.side === u.side) n++;
  }
  return n;
}

export function friendlyUnitsAdjacent(occ: Occ, h: HexId, side: Side): number {
  let n = 0;
  for (const x of neighbours(h)) {
    const v = occ.unit[x];
    if (v && v.side === side) n++;
  }
  return n;
}

export function enemyUnitsAdjacent(occ: Occ, h: HexId, side: Side): number {
  let n = 0;
  for (const x of neighbours(h)) {
    const v = occ.unit[x];
    if (v && v.side !== side) n++;
  }
  return n;
}

/**
 * Mirror of engine ignorableFlags using the occupancy table. `role` = the striker's close-combat role (a rampart counts
 * only against an attack or bonus combat, §16); null = a roll against a unit that is attacking (battle back, First Strike).
 * Fright at First Sight (116) applies when the striker is known.
 */
export function ignorableOcc(
  s: GameState, occ: Occ, t: Unit, kind: 'close' | 'ranged', striker: Unit | null, role: StrikeRole | null = null,
): number {
  if (striker && frightAtFirstSight(s, t, striker, kind)) return 0;
  const T = UNIT_STATS[t.type];
  let n = 0;
  if (!T.noLeaderBenefit) {
    if (attachedLeaderOcc(occ, t)) n++;
    if (supportOcc(occ, t) >= 2) n++;
  }
  if (isCamp(s, t.hex) && T.foot) n++;
  if (T.fullStrengthBonus && t.blocks === t.maxBlocks) n++;
  if (t.elite && eliteHas(t, 'ignoreFlag')) n++;
  if (T.vsMountedIgnoreFlag && kind === 'close' && striker) {
    const st = UNIT_STATS[striker.type];
    if (st.cavalry || st.chariot) n++;
  }
  if (striker && rampartShields(s, t, striker, kind, role)) n++;
  return n;
}

/**
 * Leader attached to or adjacent to the striker (helmets hit in close combat), for units that benefit from leaders.
 * Mirror of engine helmetsCount: a satrap (`attachedOnly`) counts only for his own unit.
 */
export function helmetsOcc(occ: Occ, u: Unit): boolean {
  if (UNIT_STATS[u.type].noLeaderBenefit) return false;
  const l = occ.leader[u.hex];
  if (l && l.side === u.side) return true;
  for (const h of neighbours(u.hex)) {
    const x = occ.leader[h];
    if (x && x.side === u.side && !leaderHas(x, 'attachedOnly')) return true;
  }
  return false;
}

/**
 * Is hex h terrain that a unit with this `forbiddenTerrain` list (its UNIT_STATS row) may not enter? Mirror of engine
 * forbidsTerrain; most types forbid nothing, so the list is passed in once per unit instead of looked up per hex.
 */
export function terrainForbids(s: GameState, forbidden: readonly TerrainType[], h: HexId): boolean {
  return forbidden.length > 0 && forbidden.includes(terrainAt(s, h));
}

/**
 * How many of `need` retreat hexes the unit can actually move (toward its own side).
 * Joining a lone friendly leader completes the retreat.
 */
export function retreatRoom(s: GameState, occ: Occ, u: Unit, need: number): number {
  if (need <= 0) return 0;
  const hasLeader = !!attachedLeaderOcc(occ, u);
  const forbidden = UNIT_STATS[u.type].forbiddenTerrain;
  const walk = (cur: HexId, left: number): number => {
    if (left === 0) return 0;
    let best = 0;
    for (const h of rearOf(cur, u.side)) {
      if (isImpassable(s, h) || terrainForbids(s, forbidden, h) || occ.unit[h]) continue;
      const l = occ.leader[h];
      if (l) {
        if (l.side !== u.side || hasLeader) continue;
        return left;
      }
      const r = 1 + walk(h, left - 1);
      if (r > best) best = r;
      if (best === left) break;
    }
    return best;
  };
  return walk(u.hex, need);
}

/** Can the unit evade at all (mirror of engine evadeOptions non-emptiness)? */
export function canEvadeOcc(s: GameState, occ: Occ, u: Unit): boolean {
  const hasLeader = !!attachedLeaderOcc(occ, u);
  const forbidden = UNIT_STATS[u.type].forbiddenTerrain;
  for (const h of rearOf(u.hex, u.side)) {
    if (isImpassable(s, h) || terrainForbids(s, forbidden, h) || occ.unit[h]) continue;
    const l = occ.leader[h];
    if (l && (l.side !== u.side || hasLeader)) continue;
    return true;
  }
  return false;
}

const hillCache = new WeakMap<object, Map<HexId, number>>();
function hillGroupOf(s: GameState): Map<HexId, number> {
  let g = hillCache.get(s.terrain);
  if (!g) {
    g = hillGroups(s, neighbours);
    hillCache.set(s.terrain, g);
  }
  return g;
}

export function losOcc(s: GameState, occ: Occ, from: HexId, to: HexId): boolean {
  return hasLineOfSight(from, to, (h) => {
    if (occ.unit[h] || occ.leader[h]) return true;
    if (terrainBlocksLOS(s, h)) return true;
    if (isHill(s, h)) {
      if (isHill(s, from) && isHill(s, to)) {
        const g = hillGroupOf(s);
        const gf = g.get(from);
        if (gf !== undefined && gf === g.get(to) && gf === g.get(h)) return false;
      }
      return true;
    }
    return false;
  });
}

/** Mirror of engine canFireAt using occupancy. */
export function canFireOcc(s: GameState, occ: Occ, f: Unit, target: HexId): boolean {
  const range = rangeOf(f);
  if (!range) return false;
  const d = hexDist(f.hex, target);
  if (d < 2 || d > range) return false;
  for (const h of neighbours(f.hex)) {
    const v = occ.unit[h];
    if (v && v.side !== f.side) return false;
  }
  const tu = occ.unit[target];
  if (tu) {
    if (tu.side === f.side) return false;
  } else {
    const tl = occ.leader[target];
    if (!tl || tl.side === f.side) return false;
  }
  return losOcc(s, occ, f.hex, target);
}

/** Rows a side still has to advance to reach the far edge. */
export function rowsToEnemyEdge(h: HexId, side: Side): number {
  return side === 'bottom' ? rowOf(h) : ROWS - 1 - rowOf(h);
}

/** Max hexes an enemy unit can move and still close combat with a normal order (warriors' charge included). */
export function reachOf(u: Unit): number {
  return UNIT_STATS[u.type].moveBattle;
}

/** Skirmisher: shoots and may always evade (LI, LB, LS, LC, LBC; also HWM, see isWarMachine); it stands off and fires. */
export function isRangedLight(u: Unit): boolean {
  return UNIT_STATS[u.type].evade === 'always' && canShoot(u);
}

/** War machine (HWM): shoots, but may not battle at all after moving, so it stays back and fires (§15). */
export function isWarMachine(u: Unit): boolean {
  return UNIT_STATS[u.type].moveBattle === 0 && canShoot(u);
}

/**
 * Hexes a sound unit still has to close, given the distance `d` to the nearest enemy (0 = at or inside its preferred
 * distance). Foot skirmishers stand off at 2, mounted ones at their range (LC 2, light bow cavalry 3); a war machine
 * anywhere within its range but never adjacent (it cannot shoot there); everyone else wants contact.
 */
export function advanceGap(u: Unit, d: number): number {
  if (isWarMachine(u)) return d <= 1 ? 2 : Math.max(0, d - rangeOf(u));
  const pref = isRangedLight(u) ? (UNIT_STATS[u.type].mounted ? Math.max(2, rangeOf(u)) : 2) : 1;
  return Math.max(0, d - pref);
}
