// Terrain effects (rules-reference §4, §7, §8; Expansion #1 terrain §16; Expansion #2 and #3 terrain §18.6, §18.7).
import { sidesCrossed } from './hex';
import { UNIT_STATS, forbidsTerrain } from './units';
import type { FlowCtx, GameState, HexId, Side, TerrainType, UnitType } from './types';

/**
 * What a terrain type does (rules-reference §4, §7, §8, §16, §18.6, §18.7): the terrain counterpart of `UNIT_STATS`, read
 * by the predicates below. A fordable river has the `FORD` row instead (see `terrainStatsAt`). Rules of their own, on top
 * of the table: hills (`isHill`: the close-combat hill caps, the same-hill line of sight, a hill under a camp or wall, very
 * steep hills, steep slopes), the rampart's protected hexsides, the fortified camp's dice and flags (`isCamp`) and the city
 * wall's climbing, first strike and line of sight (`isWall`).
 */
export interface TerrainStats {
  /** Display name (`TERRAIN_NAMES`). */
  name: string;
  /** No unit or leader may enter it (§7): lake, sea (§16), impassable hills, a river that is not fordable, off the board. */
  impassable: boolean;
  /** Entering it ends a move (§7): of every unit and lone leader ('all'), or of mounted units and lone leaders ('mounted'). */
  stops: 'all' | 'mounted' | null;
  /** A move that begins on it goes 1 hex at most (§7 marsh, §18.7 city wall); a momentum advance out of it gets no extra hex. */
  oneHexOut: boolean;
  /**
   * Who may not battle in the turn they entered it, by a move or a momentum advance (§7, §9): every type but the
   * `forestFighter`s ('notForestFighters', forest), mounted units ('mounted', broken ground), or nobody (null).
   */
  noBattleAfterEntering: 'notForestFighters' | 'mounted' | null;
  /** A unit in it may momentum advance out of it only if it did not move this turn (§9): marsh, ford. */
  advanceOutUnmovedOnly: boolean;
  /** Entering it rolls 1 die (§7, §10): a unit loses a block on its class symbol, a lone leader is lost on a helmet (marsh). */
  entryRoll: boolean;
  /** Close-combat dice cap of a combat in or out of it, the hill caps apart (§4; 99 = none). */
  ccCap: number;
  /** Ranged dice cap of a unit firing from it (§4; 99 = none). */
  fireFromCap: number;
  /** Ranged dice cap against a target in it (§4; 99 = none). */
  fireIntoCap: number;
  /** Blocks the line of sight lying between firer and target (§8): forest, camp, impassable hills (see `terrainBlocksSight`). */
  blocksSight: boolean;
}

/** Open ground: a row of the table leaves out what its terrain does not do. */
const OPEN: Omit<TerrainStats, 'name'> = {
  impassable: false, stops: null, oneHexOut: false, noBattleAfterEntering: null, advanceOutUnmovedOnly: false, entryRoll: false,
  ccCap: 99, fireFromCap: 99, fireIntoCap: 99, blocksSight: false,
};
const T = (name: string, st: Partial<Omit<TerrainStats, 'name'>> = {}): TerrainStats => ({ name, ...OPEN, ...st });

export const TERRAIN_STATS: Record<TerrainType, TerrainStats> = {
  plain: T('Open Ground'),
  hill: T('Hill'),
  forest: T('Forest', { stops: 'all', noBattleAfterEntering: 'notForestFighters', ccCap: 2, fireIntoCap: 1, blocksSight: true }),
  marsh: T('Marsh', { stops: 'all', oneHexOut: true, advanceOutUnmovedOnly: true, entryRoll: true, ccCap: 2, fireFromCap: 1 }),
  broken: T('Broken Ground', { stops: 'mounted', noBattleAfterEntering: 'mounted', ccCap: 2 }),
  river: T('River', { impassable: true }),
  lake: T('Lake', { impassable: true }),
  camp: T('Fortified Camp', { blocksSight: true }),
  steep: T('Steep Hills', { impassable: true, blocksSight: true }),
  sea: T('Sea', { impassable: true }),
  rampart: T('Rampart'),
  ditch: T('Ditch', { stops: 'all' }),
  wall: T('City Wall', { stops: 'all', oneHexOut: true, ccCap: 2 }),
  void: T('', { impassable: true }),
};

/** A fordable river (§7, §16): it stops every unit and lone leader and caps dice like a marsh; advancing out needs no move. */
const FORD = T('Ford', { stops: 'all', advanceOutUnmovedOnly: true, ccCap: 2, fireFromCap: 1 });
/** A fordable river without the dice caps (108 Pinarus, §16). */
const NO_CAP_FORD: TerrainStats = { ...FORD, ccCap: 99, fireFromCap: 99 };

export const TERRAIN_NAMES = Object.fromEntries(
  (Object.keys(TERRAIN_STATS) as TerrainType[]).map((t) => [t, TERRAIN_STATS[t].name]),
) as Record<TerrainType, string>;

/** The stats of terrain `t` (undefined: off the board); `ford`/`noCap`: the hex's ford flags. */
function statsOf(t: TerrainType | undefined, ford: boolean, noCap: boolean): TerrainStats {
  if (t === 'river' && ford) return noCap ? NO_CAP_FORD : FORD;
  return TERRAIN_STATS[t ?? 'void'];
}

/** The terrain stats in force on hex h: its terrain's, a ford's on a fordable river (`FORD`, no caps on a no-cap ford, §16). */
export function terrainStatsAt(s: GameState, h: HexId): TerrainStats {
  return statsOf(s.terrain[h], !!s.fords[h], !!s.noCap[h]);
}

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

/** Is a hex of terrain `t` impassable (`ford`: a river hex that is fordable)? Sea follows the lake rules (§16). */
export function impassableTerrain(t: TerrainType | undefined, ford: boolean): boolean {
  return statsOf(t, ford, false).impassable;
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
  return terrainStatsAt(s, h).stops === 'all';
}

/**
 * Is hex h a scalable city wall (§18.7, 308, 309)? Only foot units (not war machines) and lone leaders may enter it, and
 * only by a move that begins next to it; a move that begins on it goes 1 hex at most.
 */
export function isWall(s: GameState, h: HexId): boolean {
  return s.terrain[h] === 'wall';
}

/** Entering this hex ends movement for mounted units and lone leaders (broken ground). */
export function stopsMounted(s: GameState, h: HexId): boolean {
  return terrainStatsAt(s, h).stops === 'mounted';
}

/**
 * Close combat dice cap imposed by a hex (either combatant's hex), not counting hills: forest, marsh, broken ground, a
 * capped ford and a city wall (§18.7) 2. A no-cap ford imposes none.
 */
export function ccCapOfHex(s: GameState, h: HexId): number {
  return terrainStatsAt(s, h).ccCap;
}

/** Ranged dice cap for a firer in hex h (marsh, capped ford: 1). A no-cap ford imposes none. */
export function rangedFromCap(s: GameState, h: HexId): number {
  return terrainStatsAt(s, h).fireFromCap;
}

/** Ranged dice cap for a target in hex h (forest: 1). */
export function rangedTargetCap(s: GameState, h: HexId): number {
  return terrainStatsAt(s, h).fireIntoCap;
}

/**
 * Does entering hex h roll the entry die (§7, §10: a marsh)? A unit makes it on every such hex it enters by moving,
 * advancing, retreating or evading; a lone leader by moving or evading.
 */
export function hasEntryRoll(s: GameState, h: HexId): boolean {
  return terrainStatsAt(s, h).entryRoll;
}

/** The entry rolls a unit makes walking `path` (§10; off-board steps make none). */
export function entryRollCount(s: GameState, path: readonly HexId[]): number {
  let n = 0;
  for (const h of path) if (h >= 0 && hasEntryRoll(s, h)) n++;
  return n;
}

/** Does a move that begins on hex h go 1 hex at most (§7 marsh, §18.7 city wall)? A momentum advance out of it gets no extra hex. */
export function oneHexOut(s: GameState, h: HexId): boolean {
  return terrainStatsAt(s, h).oneHexOut;
}

/** May a unit on hex h momentum advance out of it (§9)? Not out of a marsh or a ford when it moved this turn (`moved`). */
export function mayAdvanceOut(s: GameState, h: HexId, moved: boolean): boolean {
  return !moved || !terrainStatsAt(s, h).advanceOutUnmovedOnly;
}

/**
 * May a unit of type `type` battle in the turn it entered terrain `t`, by a move or a momentum advance (§7, §9)? Not in a
 * forest unless it is a forest fighter (LI, LB, LS, AX, WA), not on broken ground if it is mounted.
 */
export function mayBattleAfterEntering(type: UnitType, t: TerrainType): boolean {
  const bar = TERRAIN_STATS[t].noBattleAfterEntering;
  if (bar === 'notForestFighters') return UNIT_STATS[type].forestFighter;
  if (bar === 'mounted') return !UNIT_STATS[type].mounted;
  return true;
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
 * it, in either direction. The slope adds nothing to ranged combat or line of sight, but the hexes stay adjacent: a unit
 * next to an enemy across one still may not fire (§8), so it can neither close combat nor fire.
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
 * Is the step from `from` into its neighbour `to` closed by the terrain to a unit of type `type`, or to a lone leader (`type`
 * null), when it moves, advances, retreats or evades? Impassable terrain, terrain the unit's type may not enter
 * (`forbidsTerrain`: §15 war machines; a city wall for mounted units and war machines, §18.7), or a steep slope up from a
 * forest (308, §18.7). The pieces on `to` and the city wall's climbing rule (§18.7) are the caller's business.
 */
export function closedTo(s: GameState, type: UnitType | null, from: HexId, to: HexId): boolean {
  return isImpassable(s, to) || (type !== null && forbidsTerrain(type, terrainAt(s, to))) || steepSlopeUp(s, from, to);
}

/**
 * Does a unit of type `type` that enters `to` from `from` (`OFF_BOARD` for a reserve) stop there (§7, §18.6)? Terrain that
 * stops every unit, or mounted units, or a climb onto a very steep hill (`steepClimb`). Lone leaders stop on both kinds
 * of stopping terrain and never climb.
 */
export function stopsOnEntry(s: GameState, type: UnitType, from: HexId, to: HexId): boolean {
  return stopsAll(s, to) || (UNIT_STATS[type].mounted && stopsMounted(s, to)) || steepClimb(s, from, to);
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
 * on a wall see along it), whatever lies under it; then forest, camps and impassable hills (`TerrainStats.blocksSight`); a hill
 * (a camp or wall with a hill under it counts) blocks unless `from`, `to` and `h` are all on one connected hill.
 */
export function terrainBlocksSight(s: GameState, from: HexId, to: HexId, h: HexId, groups: SightGroups): boolean {
  if (s.terrain[h] === 'wall') {
    if (s.terrain[from] !== 'wall' || s.terrain[to] !== 'wall') return true;
    const g = groups.walls();
    const gh = g.get(h);
    return gh === undefined || gh !== g.get(from) || gh !== g.get(to);
  }
  if (terrainStatsAt(s, h).blocksSight) return true;
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
