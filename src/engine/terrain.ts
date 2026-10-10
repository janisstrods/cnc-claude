// Terrain effects (rules-reference §4, §7, §8; Expansion #1 terrain §16; Expansion #2 and #3 terrain §18.6, §18.7).
import { sidesCrossed } from './hex';
import type { FlowCtx, GameState, HexId, Side, TerrainType } from './types';

export function terrainAt(s: GameState, h: HexId): TerrainType {
  return s.terrain[h] ?? 'void';
}

/**
 * Change a hex's terrain during play (a captured camp or rampart removed, §18.4, §18.6) and emit `terrainChanged`.
 * Copy-on-write: `cloneState` shares the terrain and rampart arrays, so they are replaced, never changed in place, and a
 * cloned state (AI search, a replay's initial state, UI snapshots) never sees another state's change. A rampart hex
 * loses its protected hexsides.
 */
export function setTerrain(s: GameState, ctx: FlowCtx, h: HexId, t: TerrainType): void {
  s.terrain = s.terrain.slice();
  s.terrain[h] = t;
  if (s.rampart[h]) {
    s.rampart = s.rampart.slice();
    s.rampart[h] = 0;
  }
  ctx.emit({ t: 'terrainChanged', hex: h, terrain: t });
}

/**
 * The ground a removed camp or wall leaves (§18.4, §18.7): hill when a hill lies under the hex (`GameState.hillUnder`),
 * otherwise open ground.
 */
export function groundUnder(s: GameState, h: HexId): TerrainType {
  return s.hillUnder[h] ? 'hill' : 'plain';
}

export function isFord(s: GameState, h: HexId): boolean {
  return s.terrain[h] === 'river' && !!s.fords[h];
}

/** A fordable river hex with the ford dice caps (not a no-cap ford like the Pinarus, §16). */
function cappedFord(s: GameState, h: HexId): boolean {
  return isFord(s, h) && !s.noCap[h];
}

/** Is a hex of terrain `t` impassable (`ford`: a river hex that is fordable)? Sea follows the lake rules (§16). */
export function impassableTerrain(t: TerrainType | undefined, ford: boolean): boolean {
  if (t === 'river') return !ford;
  return t === 'lake' || t === 'sea' || t === 'steep' || t === 'void' || t === undefined;
}

/** Impassable for movement, retreat, evade (leaders too). Sea follows the lake rules (§16). */
export function isImpassable(s: GameState, h: HexId): boolean {
  return impassableTerrain(s.terrain[h], !!s.fords[h]);
}

/**
 * Entering this hex ends movement for every unit and lone leader (forest, marsh, ford, ditch, and a city wall, which only
 * foot units and leaders may enter, §18.7).
 */
export function stopsAll(s: GameState, h: HexId): boolean {
  const t = s.terrain[h];
  return t === 'forest' || t === 'marsh' || t === 'ditch' || t === 'wall' || (t === 'river' && !!s.fords[h]);
}

/**
 * Is hex h a scalable city wall (§18.7, 308, 309)? Only foot units (not war machines) and lone leaders may enter it, and
 * only by a move that begins next to it; a move that begins on it goes 1 hex at most.
 */
export function isWall(s: GameState, h: HexId): boolean {
  return s.terrain[h] === 'wall';
}

/** Entering this hex ends movement for mounted units and lone leaders. */
export function stopsMounted(s: GameState, h: HexId): boolean {
  return s.terrain[h] === 'broken';
}

/**
 * Close combat dice cap imposed by a hex (either combatant's hex), not counting hills: forest, marsh, broken ground, a
 * capped ford and a city wall (§18.7) 2. A no-cap ford imposes none.
 */
export function ccCapOfHex(s: GameState, h: HexId): number {
  const t = s.terrain[h];
  if (t === 'forest' || t === 'marsh' || t === 'broken' || t === 'wall') return 2;
  if (cappedFord(s, h)) return 2;
  return 99;
}

/** Ranged dice cap for a firer in hex h. A no-cap ford imposes none. */
export function rangedFromCap(s: GameState, h: HexId): number {
  const t = s.terrain[h];
  if (t === 'marsh') return 1;
  if (cappedFord(s, h)) return 1;
  return 99;
}

/** Ranged dice cap for a target in hex h. */
export function rangedTargetCap(s: GameState, h: HexId): number {
  return s.terrain[h] === 'forest' ? 1 : 99;
}

/** The board arrays that hills and line-of-sight groups depend on (a `GameState` is one; the AI caches by them). */
export type BoardTerrain = Pick<GameState, 'terrain' | 'hillUnder'>;

/**
 * Does hex h count as a hill: hill terrain, or a camp or wall with a hill under it (`hillUnder`, 308, §18.7)? Used for the
 * close-combat hill caps, the same-hill line of sight, very steep hills and steep slopes.
 */
export function isHill(s: BoardTerrain, h: HexId): boolean {
  return s.terrain[h] === 'hill' || s.hillUnder[h] === true;
}

/** Are the hills of this battle very steep (rule `veryHills`, 223, §18.6)? */
export function veryHills(s: GameState): boolean {
  return s.special.rules.includes('veryHills');
}

/**
 * Does a unit going from `from` into `to` climb a very steep hill (§18.6, X2 Q12): the rule is on, `to` is a hill and
 * `from` is not (`OFF_BOARD`, a reserve entering, counts as lower ground)? A move that climbs ends there and the unit may
 * not battle this turn; a momentum advance that climbs gives no bonus combat. Hill to hill is not a climb. Retreats and
 * evades are not moves, so they never climb.
 */
export function steepClimb(s: GameState, from: HexId, to: HexId): boolean {
  return veryHills(s) && isHill(s, to) && !isHill(s, from);
}

/** Are the hill–forest slopes of this battle too steep (rule `steepSlopes`, 308, §18.7)? */
export function steepSlopes(s: GameState): boolean {
  return s.special.rules.includes('steepSlopes');
}

/**
 * Is the hexside between neighbours `a` and `b` a steep slope (rule `steepSlopes`, 308, §18.7, X3 Q5): one of them counts
 * as a hill (`isHill`: a hill, or a camp or wall with a hill under it) and the other is a forest? No close combat crosses
 * it, in either direction; ranged combat and line of sight are not affected.
 */
export function steepSlope(s: GameState, a: HexId, b: HexId): boolean {
  const ta = s.terrain[a];
  const tb = s.terrain[b];
  if (ta !== 'forest' && tb !== 'forest') return false;
  return steepSlopes(s) && ((ta === 'forest' && isHill(s, b)) || (tb === 'forest' && isHill(s, a)));
}

/**
 * Does going from `from` into its neighbour `to` climb a steep slope (§18.7): `from` a forest, `to` a hill (a hill under a
 * camp or wall included) and the rule `steepSlopes` on? No piece may move, advance, retreat or evade that way; down from
 * the hill into the forest is allowed.
 */
export function steepSlopeUp(s: GameState, from: HexId, to: HexId): boolean {
  return s.terrain[from] === 'forest' && isHill(s, to) && steepSlopes(s);
}

/**
 * Rampart breakers (223, §18.6, X2 Q12): a unit of `side` has just entered `hexes` (its path after the start hex, the
 * destination included). If `side` is the battle's rampart breaker every rampart hex among them becomes open ground
 * (`setTerrain`: event `terrainChanged`, hexsides gone). Lone leaders never call this; off-board entries are ignored.
 */
export function breakRamparts(s: GameState, ctx: FlowCtx, side: Side, hexes: readonly HexId[]): void {
  if (s.special.rampartBreakers !== side) return;
  for (const h of hexes) if (h >= 0 && s.terrain[h] === 'rampart') setTerrain(s, ctx, h, 'plain');
}

export function isCamp(s: GameState, h: HexId): boolean {
  return s.terrain[h] === 'camp';
}

/**
 * Is a unit on the rampart hex `defHex` protected against something coming from `fromHex` (§16)? True when the
 * centre-to-centre line from `defHex` towards `fromHex` crosses a protected hexside: for a neighbour, the shared side;
 * for a ranged firer, the side the line of fire enters through, or either side at a corner **[Interp]**. Whether the
 * protection applies at all (foot unit, the roll of an attacker or firer) is decided by the combat rules.
 */
export function rampartProtects(s: GameState, defHex: HexId, fromHex: HexId): boolean {
  const mask = s.rampart[defHex];
  if (!mask) return false;
  return sidesCrossed(defHex, fromHex).some((d) => (mask & (1 << d)) !== 0);
}

/**
 * Terrain that blocks line of sight when it lies between firer and target (hills handled separately; a city wall blocks
 * except along a connected wall, see `terrainBlocksSight`).
 */
export function terrainBlocksLOS(s: GameState, h: HexId): boolean {
  const t = s.terrain[h];
  return t === 'forest' || t === 'camp' || t === 'steep' || t === 'wall';
}

/** Connected group id for every hex where `member` holds (neighbours by `neighbours`), in hex order. */
function connectedGroups(s: BoardTerrain, neighbours: (h: HexId) => HexId[], member: (h: HexId) => boolean): Map<HexId, number> {
  const groups = new Map<HexId, number>();
  let g = 0;
  for (let h = 0; h < s.terrain.length; h++) {
    if (groups.has(h) || !member(h)) continue;
    const stack = [h];
    groups.set(h, g);
    while (stack.length) {
      const x = stack.pop()!;
      for (const n of neighbours(x)) {
        if (!groups.has(n) && member(n)) {
          groups.set(n, g);
          stack.push(n);
        }
      }
    }
    g++;
  }
  return groups;
}

/**
 * Connected hill group id for every hex that counts as a hill (`isHill`: a camp or wall with a hill under it too), used for
 * the "same hill / plateau" LOS rule.
 */
export function hillGroups(s: BoardTerrain, neighbours: (h: HexId) => HexId[]): Map<HexId, number> {
  return connectedGroups(s, neighbours, (h) => isHill(s, h));
}

/** Connected group id for every city wall hex (§18.7: units on one wall see along it). */
export function wallGroups(s: BoardTerrain, neighbours: (h: HexId) => HexId[]): Map<HexId, number> {
  return connectedGroups(s, neighbours, (h) => s.terrain[h] === 'wall');
}

/** Hill and wall groups for `terrainBlocksSight`, worked out by the caller on first use (most lines of sight need neither). */
export interface SightGroups {
  hills(): Map<HexId, number>;
  walls(): Map<HexId, number>;
}

/**
 * Does the terrain of hex `h`, lying between firer `from` and target `to`, block the line of sight (§8, §18.7)? Pieces on
 * `h` are the caller's business. A city wall blocks unless `from`, `to` and `h` are all hexes of one connected wall (units
 * on a wall see along it), whatever lies under it; then forest, camps and impassable hills (`terrainBlocksLOS`); a hill
 * (a camp or wall with a hill under it counts) blocks unless `from`, `to` and `h` are all on one connected hill.
 */
export function terrainBlocksSight(s: GameState, from: HexId, to: HexId, h: HexId, groups: SightGroups): boolean {
  if (s.terrain[h] === 'wall') {
    if (s.terrain[from] !== 'wall' || s.terrain[to] !== 'wall') return true;
    const g = groups.walls();
    const gh = g.get(h);
    return gh === undefined || gh !== g.get(from) || gh !== g.get(to);
  }
  if (terrainBlocksLOS(s, h)) return true;
  if (isHill(s, h)) {
    if (isHill(s, from) && isHill(s, to)) {
      const g = groups.hills();
      const gf = g.get(from);
      if (gf !== undefined && gf === g.get(to) && gf === g.get(h)) return false;
    }
    return true;
  }
  return false;
}

export const TERRAIN_NAMES: Record<TerrainType, string> = {
  plain: 'Open Ground',
  hill: 'Hill',
  forest: 'Forest',
  marsh: 'Marsh',
  broken: 'Broken Ground',
  river: 'River',
  lake: 'Lake',
  camp: 'Fortified Camp',
  steep: 'Steep Hills',
  sea: 'Sea',
  rampart: 'Rampart',
  ditch: 'Ditch',
  wall: 'City Wall',
  void: '',
};
