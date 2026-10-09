// Battlefield / terrain art for Commands & Colors: Ancients (original procedural SVG).
import type { TerrainType } from '../../engine/types';

export { BoardArt } from './BoardArt';
export type { BoardArtProps } from './BoardArt';
export { TerrainIcon } from './TerrainIcon';

/** Human-readable terrain name ("Hill", "Forest", "Fordable River", ...). `noCap`: a ford without dice limits (§16). */
export function terrainName(t: TerrainType, ford: boolean, noCap = false): string {
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
    case 'void':
      return 'Off Board';
  }
}
