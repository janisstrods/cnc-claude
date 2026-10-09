// Elite unit presets: named abilities layered on top of a unit type's table row (see units.ts).
import type { EliteId, Unit, UnitType } from './types';
import { UNIT_STATS } from './units';

export type EliteAbility = 'helmetHits' | 'ignoreFlag' | 'ignoreSword' | 'ranged';

export interface EliteDef {
  id: EliteId;
  name: string;
  abilities: EliteAbility[];
  /** Ranged weapon range in hexes; only set on presets with the 'ranged' ability. */
  range?: number;
  /** Unit types the preset may be attached to. */
  types: UnitType[];
}

/** Every elite preset (rules-reference §17.1). */
export const ELITES: Record<EliteId, EliteDef> = {
  carthSacredBand: { id: 'carthSacredBand', name: 'Sacred Band', abilities: ['helmetHits', 'ignoreFlag'], types: ['HI'] },
  thebanSacredBand: { id: 'thebanSacredBand', name: 'Theban Sacred Band', abilities: ['helmetHits', 'ignoreFlag'], types: ['MI'] },
  silverShields: { id: 'silverShields', name: 'Silver Shields', abilities: ['helmetHits', 'ignoreFlag'], types: ['HI'] },
  companions: { id: 'companions', name: 'Companions', abilities: ['ignoreSword', 'ignoreFlag'], types: ['MC'] },
  immortals: { id: 'immortals', name: 'Immortals', abilities: ['ranged'], range: 3, types: ['MI'] },
  bowAuxilia: { id: 'bowAuxilia', name: 'Bow-armed auxilia', abilities: ['ranged'], range: 3, types: ['AX'] },
};

/** The preset of a unit's elite id (undefined for ordinary units). */
export function eliteDef(u: Unit): EliteDef | undefined {
  return u.elite ? ELITES[u.elite] : undefined;
}

/** Does the unit's elite preset grant ability `a`? Ordinary units have none. */
export function eliteHas(u: Unit, a: EliteAbility): boolean {
  return eliteDef(u)?.abilities.includes(a) ?? false;
}

/** Ranged weapon range of a unit: its type's range, or the elite preset's if larger (0 = cannot shoot). */
export function rangeOf(u: Unit): number {
  return Math.max(UNIT_STATS[u.type].range, eliteDef(u)?.range ?? 0);
}

/** Can the unit make ranged attacks at all? */
export function canShoot(u: Unit): boolean {
  return rangeOf(u) > 0;
}
