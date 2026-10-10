// Battlefield / terrain art for Commands & Colors: Ancients (original procedural SVG).
import { COLS, ROWS, type TerrainType } from '../../engine/types';
import { scenarioById } from '../../scenarios';

export { BoardArt, boardArtPropsEqual } from './BoardArt';
export type { BoardArtProps } from './BoardArt';
export { ObjectiveMarkers } from './objectives';
export type { ObjectiveMarkersProps } from './objectives';
export { TerrainIcon } from './TerrainIcon';

/** A scenario terrain entry as far as its art goes (`TerrainSetup`, with the optional Expansion #2 `art`). */
export interface TerrainArtEntry {
  r: number;
  c: number;
  t: string;
  ford?: unknown;
  art?: string;
}

/**
 * Art of every hex (index r*13+c) where it differs from its terrain, from the scenario setup's terrain list, for
 * `BoardArt`'s `art` prop: an entry's own `art` (`'coast'` on 217's seacoast), and `'coast'` for a sea hex played as a
 * ford (`{ t: 'sea', ford: true }`, which the engine stores as a fordable river). Undefined everywhere else.
 */
export function terrainArtOf(setup: { terrain: readonly TerrainArtEntry[] }): (string | undefined)[] {
  const out: (string | undefined)[] = new Array(ROWS * COLS).fill(undefined);
  for (const e of setup.terrain) {
    const art = e.art ?? (e.t === 'sea' && e.ford ? 'coast' : undefined);
    if (art !== undefined) out[e.r * COLS + e.c] = art;
  }
  return out;
}

const scenarioArtCache = new Map<string, readonly (string | undefined)[]>();

/**
 * `terrainArtOf` of a battle's setup, computed once per battle: the game state drops the art hints, so the board and the
 * game screen's tooltips both read them from here. The array is shared, so it must not be changed.
 */
export function scenarioArt(scenarioId: string): readonly (string | undefined)[] {
  let art = scenarioArtCache.get(scenarioId);
  if (!art) {
    art = terrainArtOf(scenarioById(scenarioId).setup);
    scenarioArtCache.set(scenarioId, art);
  }
  return art;
}

/**
 * Human-readable terrain name ("Hill", "Forest", "Fordable River", ...). `noCap`: a ford without dice limits (§16).
 * `art`: the hex's art (`terrainArtOf`); a fordable river with `'coast'` art is a coast played as a ford (217).
 */
export function terrainName(t: TerrainType, ford: boolean, noCap = false, art?: string): string {
  if (art === 'coast' && t === 'river') return 'Coastal Ford';
  switch (t) {
    case 'plain':
      return 'Open Ground';
    case 'hill':
      return 'Hill';
    case 'forest':
      return 'Forest';
    case 'marsh':
      return 'Marsh';
    case 'broken':
      return 'Broken Ground';
    case 'river':
      return ford ? (noCap ? 'Ford (no dice limit)' : 'Fordable River') : 'River';
    case 'lake':
      return 'Lake';
    case 'camp':
      return 'Fortified Camp';
    case 'steep':
      return 'Steep Hill';
    case 'sea':
      return 'Sea';
    case 'rampart':
      return 'Rampart';
    case 'ditch':
      return 'Ditch';
    case 'wall':
      return 'City Wall';
    case 'void':
      return 'Off Board';
  }
}
