// Terrain effects (rules-reference §4, §7, §8; Expansion #1 terrain §16).
import { sidesCrossed } from './hex';
import type { GameState, HexId, TerrainType } from './types';

export function terrainAt(s: GameState, h: HexId): TerrainType {
  return s.terrain[h] ?? 'void';
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

/** Entering this hex ends movement for every unit and lone leader. */
export function stopsAll(s: GameState, h: HexId): boolean {
  const t = s.terrain[h];
  return t === 'forest' || t === 'marsh' || (t === 'river' && !!s.fords[h]);
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
  void: '',
};
