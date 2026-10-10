// Terrain effects (rules-reference §4, §7, §8; Expansion #1 terrain §16).
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

export function isFord(s: GameState, h: HexId): boolean {
  return s.terrain[h] === 'river' && !!s.fords[h];
}

/** A fordable river hex with the ford dice caps (not a no-cap ford like the Pinarus, §16). */
function cappedFord(s: GameState, h: HexId): boolean {
  return isFord(s, h) && !s.noCap[h];
}

/** Impassable for movement, retreat, evade (leaders too). Sea follows the lake rules (§16). */
export function isImpassable(s: GameState, h: HexId): boolean {
  const t = s.terrain[h];
  if (t === 'river') return !s.fords[h];
  return t === 'lake' || t === 'sea' || t === 'steep' || t === 'void' || t === undefined;
}

/** Entering this hex ends movement for every unit and lone leader (forest, marsh, ford, ditch). */
export function stopsAll(s: GameState, h: HexId): boolean {
  const t = s.terrain[h];
  return t === 'forest' || t === 'marsh' || t === 'ditch' || (t === 'river' && !!s.fords[h]);
}

/** Entering this hex ends movement for mounted units and lone leaders. */
export function stopsMounted(s: GameState, h: HexId): boolean {
  return s.terrain[h] === 'broken';
}

/** Close combat dice cap imposed by a hex (either combatant's hex), not counting hills. A no-cap ford imposes none. */
export function ccCapOfHex(s: GameState, h: HexId): number {
  const t = s.terrain[h];
  if (t === 'forest' || t === 'marsh' || t === 'broken') return 2;
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

export function isHill(s: GameState, h: HexId): boolean {
  return s.terrain[h] === 'hill';
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

/** Terrain that blocks line of sight when it lies between firer and target (hills handled separately). */
export function terrainBlocksLOS(s: GameState, h: HexId): boolean {
  const t = s.terrain[h];
  return t === 'forest' || t === 'camp' || t === 'steep';
}

/** Connected hill group id for every hill hex (used for the "same hill / plateau" LOS rule). */
export function hillGroups(s: GameState, neighbours: (h: HexId) => HexId[]): Map<HexId, number> {
  const groups = new Map<HexId, number>();
  let g = 0;
  for (let h = 0; h < s.terrain.length; h++) {
    if (s.terrain[h] !== 'hill' || groups.has(h)) continue;
    const stack = [h];
    groups.set(h, g);
    while (stack.length) {
      const x = stack.pop()!;
      for (const n of neighbours(x)) {
        if (s.terrain[n] === 'hill' && !groups.has(n)) {
          groups.set(n, g);
          stack.push(n);
        }
      }
    }
    g++;
  }
  return groups;
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
  void: '',
};
