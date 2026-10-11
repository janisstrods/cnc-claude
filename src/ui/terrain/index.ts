// Battlefield / terrain art for Commands & Colors: Ancients (original procedural SVG).
import { hexId, NUM_HEXES } from '../../engine/hex';
import { TERRAIN_NAMES } from '../../engine/terrain';
import type { TerrainType } from '../../engine/types';
import { hexVariant, type CityArt } from './hexmath';
import { scenarioById } from '../../scenarios';

export { BoardArt, boardArtPropsEqual } from './BoardArt';
export type { BoardArtProps } from './BoardArt';
export { ObjectiveMarkers } from './objectives';
export type { ObjectiveMarkersProps } from './objectives';
export { TerrainIcon } from './TerrainIcon';
export { hexVariant } from './hexmath';

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
  const out: (string | undefined)[] = new Array(NUM_HEXES).fill(undefined);
  for (const e of setup.terrain) {
    const art = e.art ?? (e.t === 'sea' && e.ford ? 'coast' : undefined);
    if (art !== undefined) out[hexId(e.r, e.c)] = art;
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

/** Names of the hex variants (`hexVariant`). */
const VARIANT_NAMES: Record<'coast' | CityArt, string> = {
  coast: 'Coastal Ford',
  wall: 'City Wall (impassable)',
  town: 'Town (impassable)',
};

/** Where a single hex's name differs from the engine's terrain names (`TERRAIN_NAMES`). */
const NAMES: Partial<Record<TerrainType, string>> = { steep: 'Steep Hill', void: 'Off Board' };

/**
 * Human-readable terrain name ("Hill", "Forest", "Fordable River", ...). `noCap`: a ford without dice limits (§16).
 * `art`: the hex's art (`terrainArtOf`); a fordable river with `'coast'` art is a coast played as a ford (217), a `steep`
 * hex with `'wall'` or `'town'` art an impassable city wall (301) or town (303, 304). `hill`: a hill under the hex's camp
 * or wall (`GameState.hillUnder`, 308).
 */
export function terrainName(t: TerrainType, ford: boolean, noCap = false, art?: string, hill = false): string {
  const v = hexVariant(t, art);
  if (v) return VARIANT_NAMES[v];
  if (hill && t === 'camp') return 'Fortified Camp on a Hill';
  if (hill && t === 'wall') return 'City Wall on a Hill';
  if (t === 'river' && ford) return noCap ? 'Ford (no dice limit)' : 'Fordable River';
  return NAMES[t] ?? TERRAIN_NAMES[t];
}

