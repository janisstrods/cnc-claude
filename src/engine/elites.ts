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

/** Presets defined so far; the rest of EliteId is filled in as the expansion units arrive. */
export const ELITES: Partial<Record<EliteId, EliteDef>> = {
  carthSacredBand: { id: 'carthSacredBand', name: 'Sacred Band', abilities: ['helmetHits', 'ignoreFlag'], types: ['HI'] },
};

/** The preset of a unit's elite id (undefined for ordinary units and for ids without a preset). */
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
