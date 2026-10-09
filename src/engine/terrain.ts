// Terrain effects (rules-reference §4, §7, §8).
import type { GameState, HexId, TerrainType } from './types';

export function terrainAt(s: GameState, h: HexId): TerrainType {
  return s.terrain[h] ?? 'void';
}

export function isFord(s: GameState, h: HexId): boolean {
  return s.terrain[h] === 'river' && !!s.fords[h];
}

/** Impassable for movement, retreat, evade (leaders too). */
export function isImpassable(s: GameState, h: HexId): boolean {
  const t = s.terrain[h];
  if (t === 'river') return !s.fords[h];
  return t === 'lake' || t === 'steep' || t === 'void' || t === undefined;
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

/** Close combat dice cap imposed by a hex (either combatant's hex), not counting hills. */
export function ccCapOfHex(s: GameState, h: HexId): number {
  const t = s.terrain[h];
  if (t === 'forest' || t === 'marsh' || t === 'broken') return 2;
  if (t === 'river' && s.fords[h]) return 2;
  return 99;
}

/** Ranged dice cap for a firer in hex h. */
export function rangedFromCap(s: GameState, h: HexId): number {
  const t = s.terrain[h];
  if (t === 'marsh') return 1;
  if (t === 'river' && s.fords[h]) return 1;
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
  void: '',
};
