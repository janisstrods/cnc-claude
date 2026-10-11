// Fast board helpers for the AI: distance table, occupancy (the engine rules' piece index), retreat room, reach.
import { ALL_HEXES, distance, neighbours, rearHexes, rowOf } from '../engine/hex';
import { closedTo, isWall, stopsOnEntry } from '../engine/terrain';
import { ignorableFlags, type StrikeRole } from '../engine/combat';
import { canShoot, rangeOf } from '../engine/elites';
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

/**
 * Occupancy lookup for a game state (rebuild after any position change); the engine rules that look around a hex take it
 * as their `PieceIndex` (supportCount, helmetsCount, ignorableFlags, canFireAt, lineOfSight, canEvade, unitsOn, ...).
 */
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
 * Engine ignorableFlags for a roll still to come, as the AI prices it: the attached leader alive, the unit's strength now
 * its strength at the start of the combat. `role` = the striker's close-combat role (a rampart counts only against an
 * attack or bonus combat, §16); null = a roll against a unit that is attacking (battle back, First Strike).
 */
export function ignorableOcc(
  s: GameState, occ: Occ, t: Unit, kind: 'close' | 'ranged', striker: Unit | null, role: StrikeRole | null = null,
): number {
  return ignorableFlags(s, t, { kind, striker, role, leaderAlive: true, fullAtStart: t.blocks === t.maxBlocks }, occ);
}

/**
 * How many of `need` retreat hexes the unit can actually move (toward its own side).
 * Joining a lone friendly leader completes the retreat.
 */
export function retreatRoom(s: GameState, occ: Occ, u: Unit, need: number): number {
  if (need <= 0) return 0;
  const hasLeader = !!attachedLeaderOcc(occ, u);
  const walk = (cur: HexId, left: number): number => {
    if (left === 0) return 0;
    let best = 0;
    for (const h of rearOf(cur, u.side)) {
      if (closedTo(s, u.type, cur, h) || occ.unit[h]) continue;
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

/** Rows a side still has to advance to reach the far edge. */
export function rowsToEnemyEdge(h: HexId, side: Side): number {
  return side === 'bottom' ? rowOf(h) : ROWS - 1 - rowOf(h);
}

/**
 * Max hexes an enemy unit can move and still close combat with a normal order (warriors' charge included). With `occ`,
 * Caesar's forced march counts (§18.3: infantry he is attached to moves 2 and battles). The march of the Tenth Legion
 * and the Julian legions (`canMarch`, §18.2) is 2 hexes without a battle, so it adds nothing to an attack's reach. An
 * immobile unit (306, §18.11) reaches nothing; with `s`, a unit on a city wall moves 1 hex at most (§18.7). A unit in a marsh
 * keeps its full reach: leaving out the marsh's 1-hex limit (§7, `oneHexOut`) is a deliberate approximation.
 */
export function reachOf(u: Unit, occ?: Occ, s?: GameState): number {
  if (u.immobile) return 0;
  const st = UNIT_STATS[u.type];
  let r = st.moveBattle;
  if (occ && st.infantry && r < 2) {
    const l = attachedLeaderOcc(occ, u);
    if (l && leaderHas(l, 'forcedMarch')) r = 2;
  }
  if (s && u.hex >= 0 && isWall(s, u.hex)) r = Math.min(r, 1);
  return r;
}

/** Rows from hex h to `side`'s own baseline (0 on it). */
export function rowsToOwnEdge(h: HexId, side: Side): number {
  return side === 'top' ? rowOf(h) : ROWS - 1 - rowOf(h);
}

/**
 * Blocks unit v loses for the retreat hexes it could not take (`need` asked, `r` taken): one per hex, or all of them
 * under last-row retreat (214, §18.5) when its retreat ends on its own baseline row. `r` = `need` when it joins a lone
 * leader (retreatRoom), which ends the retreat without losses.
 */
export function shortfall(s: GameState, v: Unit, need: number, r: number): number {
  const n = need - r;
  if (n <= 0 || s.special.lastRowRetreat !== v.side) return n;
  return r === rowsToOwnEdge(v.hex, v.side) ? v.blocks : n;
}

const terrainKinds = new WeakMap<object, Set<TerrainType>>();
/** Does the battlefield have any hex of terrain `t` (cached per terrain array: a changed hex replaces the array)? */
export function hasTerrain(s: GameState, t: TerrainType): boolean {
  let k = terrainKinds.get(s.terrain);
  if (!k) {
    k = new Set(s.terrain);
    terrainKinds.set(s.terrain, k);
  }
  return k.has(t);
}

/**
 * Hexes unit e could end a move on within `reach` hexes: never into or through another unit or an enemy leader, nor
 * terrain it may not enter, and no further after a hex whose terrain stops it (ditch, forest, marsh, ford; broken ground
 * for mounted units; a very steep hill climbed). Used by the threat model where stopping terrain cuts the approach
 * (212's ditch) instead of the straight-line distance.
 */
export function stopAwareReach(s: GameState, occ: Occ, e: Unit, reach: number): Set<HexId> {
  const out = new Set<HexId>();
  let frontier: HexId[] = [e.hex];
  const seen = new Set<HexId>([e.hex]);
  for (let step = 0; step < reach && frontier.length; step++) {
    const next: HexId[] = [];
    for (const h of frontier) {
      for (const n of neighbours(h)) {
        if (seen.has(n) || closedTo(s, e.type, h, n) || occ.unit[n]) continue;
        const l = occ.leader[n];
        if (l && l.side !== e.side) continue;
        seen.add(n);
        out.add(n);
        if (!stopsOnEntry(s, e.type, h, n)) next.push(n);
      }
    }
    frontier = next;
  }
  return out;
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
