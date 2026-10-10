// Elite unit presets: named abilities layered on top of a unit type's table row (see units.ts).
import type { EliteId, Unit, UnitType } from './types';
import { UNIT_STATS } from './units';

export type EliteAbility = 'helmetHits' | 'ignoreFlag' | 'ignoreSword' | 'ranged' | 'pilum' | 'march';

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
  // Expansion #2 (§18.2): an ordinary HI that throws the pilum and may march 2 hexes without battling.
  tenthLegion: { id: 'tenthLegion', name: 'Tenth Legion', abilities: ['pilum', 'march'], types: ['HI'] },
};

/** The preset of a unit's elite id (undefined for ordinary units). */
export function eliteDef(u: Unit): EliteDef | undefined {
  return u.elite ? ELITES[u.elite] : undefined;
}

/** Does the unit's elite preset grant ability `a`? Ordinary units have none. */
export function eliteHas(u: Unit, a: EliteAbility): boolean {
  return eliteDef(u)?.abilities.includes(a) ?? false;
}

/** Does the unit throw the pilum (§18.2)? A unit of a Marius or Julian legion, or an elite with the pilum (Tenth Legion). */
export function hasPilum(u: Unit): boolean {
  return u.legion !== undefined || eliteHas(u, 'pilum');
}

/** May the unit march (§18.2): move 2 hexes if it does not battle? A Julian legion unit, or an elite with the march. */
export function canMarch(u: Unit): boolean {
  return u.legion === 'julian' || eliteHas(u, 'march');
}

/** Range of the pilum, in hexes (§18.2). */
const PILUM_RANGE = 2;
/** Exclusive bound on the hexes a unit may have moved and still throw the pilum: it throws after moving 0 or 1 hexes, not 2 (§18.2). */
const PILUM_FIRE_LIMIT = 2;

/**
 * Ranged weapon range of a unit: its type's range, the elite preset's or the pilum's (2), whichever is largest (0 = cannot
 * shoot).
 */
export function rangeOf(u: Unit): number {
  return Math.max(UNIT_STATS[u.type].range, eliteDef(u)?.range ?? 0, hasPilum(u) ? PILUM_RANGE : 0);
}

/** Can the unit make ranged attacks at all? */
export function canShoot(u: Unit): boolean {
  return rangeOf(u) > 0;
}

/**
 * Base dice of a ranged attack after `moved` hexes this turn, before the terrain caps, the camp and card bonuses: 2 when the
 * unit did not move and 1 when it did. A unit whose only missile weapon is the pilum (the type has no range and the elite no
 * ranged weapon) always rolls 1 (§18.2); the Immortals keep their 2 / 1.
 */
export function rangedBaseDice(u: Unit, moved: number): number {
  if (hasPilum(u) && UNIT_STATS[u.type].range === 0 && !eliteHas(u, 'ranged')) return 1;
  return moved > 0 ? 1 : 2;
}

/** Hexes a unit may have moved and still fire: below this limit it can fire, at or above it it cannot (the pilum: 2). */
export function fireMoveLimit(u: Unit): number {
  const limit = UNIT_STATS[u.type].noFireAfterMove;
  return hasPilum(u) ? Math.min(limit, PILUM_FIRE_LIMIT) : limit;
}
