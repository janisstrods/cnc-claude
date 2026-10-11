// Unit and leader descriptions, generated from the unit table: the lines of the hover tooltip and the unit cards of the
// rules reference.
import {
  TERRAIN_NAMES, UNIT_STATS, UNIT_TYPES, canMarch, eliteDef, fireMoveLimit, rangeOf, rangedBaseDice,
  type EliteAbility, type EvadeRule, type Leader, type LeaderTrait, type Unit, type UnitClass, type UnitStats, type UnitType,
} from '../../engine';

/** Short plural noun for a unit type ("Heavy Chariots" → "chariots"). */
function unitNoun(t: UnitType): string {
  const words = UNIT_STATS[t].name.split(' ');
  return words[words.length - 1].toLowerCase();
}

/** Capitalise the first letter. */
function cap(x: string): string {
  return x.charAt(0).toUpperCase() + x.slice(1);
}

/** Wording of the movement allowance of a unit that cannot battle after a full move: tooltip and rules reference. */
interface MoveFormat {
  /** Moves `battle` hexes and battles, or up to `max` without battle (auxilia). */
  withoutBattle: (battle: number, max: number) => string;
  /** May not battle at all after moving (heavy war machines). */
  noBattle: (max: number) => string;
}

const MOVE_TOOLTIP: MoveFormat = {
  withoutBattle: (b, m) => `${b}, or ${m} without battle`,
  noBattle: (m) => `${m}, no battle after moving`,
};

const MOVE_REFERENCE: MoveFormat = {
  withoutBattle: (b, m) => `${b} (${m} without battle)`,
  noBattle: (m) => `${m} (no battle after moving)`,
};

/**
 * Movement allowance: warriors "1 (2 to charge)" (moving 2 or more must end in close combat); a unit that moves further
 * when it does not battle (auxilia) or may not battle after moving at all is described by `fmt`; otherwise the plain number.
 */
function moveText(st: UnitStats, fmt: MoveFormat): string {
  if (st.chargeMove) return `1 (${st.move} to charge)`;
  if (st.moveBattle === 0) return fmt.noBattle(st.move);
  if (st.moveBattle < st.move) return fmt.withoutBattle(st.moveBattle, st.move);
  return String(st.move);
}

/**
 * Missile line of a tooltip: 2 dice standing and 1 after moving, or no fire after moving at all (heavy war machines). A
 * unit whose only missile is the pilum always rolls 1 and cannot fire after moving 2 hexes (§18.2).
 */
function missileText(u: Unit, range: number): string {
  const st = UNIT_STATS[u.type];
  const limit = fireMoveLimit(u);
  const noFireAfterMoving = limit <= 1 || st.moveBattle === 0;
  if (rangedBaseDice(u, 0) === rangedBaseDice(u, 1)) {
    return `Missiles: range ${range}, 1 die (${noFireAfterMoving ? 'not after moving' : `not after moving ${limit} hexes`})`;
  }
  return `Missiles: range ${range}, 2 dice (${noFireAfterMoving ? 'not after moving' : '1 after moving'})`;
}

/**
 * Where elephants' dice differ from what the enemy would roll: "3 vs elephants, warriors, chariots" (elephants first,
 * then units whose base attacking dice the elephant does not copy, or whose dice vary with strength). Expansion types are
 * left out so the base-game wording stays as it is: each expansion's tab names the elephant's dice against its new types.
 */
function elephantDiceNote(): string {
  const odd = UNIT_TYPES.filter((t) => {
    const st = UNIT_STATS[t];
    if (st.expansion > 0) return false;
    return st.elephantTable || st.fullStrengthBonus || st.elephantDiceAgainst !== st.cc;
  }).sort((a, b) => Number(UNIT_STATS[b].elephantTable) - Number(UNIT_STATS[a].elephantTable));
  const byDice = new Map<number, string[]>();
  for (const t of odd) {
    const n = UNIT_STATS[t].elephantDiceAgainst;
    byDice.set(n, [...(byDice.get(n) ?? []), unitNoun(t)]);
  }
  return [...byDice].map(([n, names]) => `${n} vs ${names.join(', ')}`).join('; ');
}

/** Sword hits a unit type ignores, or null (`one` spells out a single hit). */
function swordIgnoreText(st: UnitStats, all: string, one: string): string | null {
  if (st.ignoreAllSwords) return all;
  const n = st.swordIgnore;
  if (!n) return null;
  return `ignores ${n === 1 ? one : n} sword hit${n === 1 ? '' : 's'}`;
}

/** Name of the die symbol that hits a class ("blue-triangle"). */
const CLASS_SYMBOL: Record<UnitClass, string> = { light: 'green-circle', medium: 'blue-triangle', heavy: 'red-square' };

/**
 * The hit / flag a unit ignores when cavalry or chariots roll against it (camels: "ignores 1 blue-triangle hit when
 * cavalry or chariots roll against it"), or null. Elephants have the same fields but keep their base-game wording.
 */
function vsMountedText(st: UnitStats): string | null {
  if (st.elephantTable) return null;
  const what: string[] = [];
  if (st.vsMountedIgnoreHit !== null) what.push(st.vsMountedIgnoreHit === 'any' ? '1 hit' : `1 ${CLASS_SYMBOL[st.vsMountedIgnoreHit]} hit`);
  if (st.vsMountedIgnoreFlag) what.push('1 flag');
  return what.length ? `ignores ${what.join(' and ')} when cavalry or chariots roll against it` : null;
}

/** "a, b or c" */
function orList(xs: string[]): string {
  return xs.length > 1 ? `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}` : xs.join('');
}

/** Terrain the unit may not enter ("cannot enter broken ground or marsh"), or null. */
function forbiddenTerrainText(st: UnitStats): string | null {
  if (!st.forbiddenTerrain.length) return null;
  return `cannot enter ${orList(st.forbiddenTerrain.map((t) => TERRAIN_NAMES[t].toLowerCase()))}`;
}

/** Abilities of war machines and the like: abandoned after evading, no momentum, forbidden terrain (in this order). */
function machineTexts(st: UnitStats): (string | null)[] {
  return [
    st.evadeRemoves ? 'abandoned after evading (no banner)' : null,
    st.noMomentum ? 'no momentum advance' : null,
    forbiddenTerrainText(st),
  ];
}

/** Unit types whose retreats this type lengthens (elephants and camels: cavalry and chariots). */
function frightenedTypes(t: UnitType): UnitType[] {
  return UNIT_TYPES.filter((x) => UNIT_STATS[x].frightenedBy.includes(t));
}

/** Evade rule wording: [tooltip, rules reference]. */
const EVADE_TEXT: Record<EvadeRule, [string, string]> = {
  always: ['Can evade', 'Evades any attack.'],
  never: ['Cannot evade', 'Cannot evade.'],
  vsFootElephant: ['Can evade foot & elephants', 'Evades foot and elephants.'],
  vsFootHeavyMounted: ['Can evade foot & heavy mounted', 'Evades foot and heavy mounted.'],
};

const ELITE_TEXT: Record<EliteAbility, (u: Unit) => string> = {
  helmetHits: () => 'helmets always hit',
  ignoreFlag: () => 'ignores 1 flag',
  ignoreSword: () => 'ignores 1 sword hit',
  ranged: (u) => `missile fire (range ${rangeOf(u)})`,
  pilum: () => 'throws the pilum',
  march: () => 'marches 2 hexes without battle',
};

/** Stats line for tooltips. */
export function unitSummary(u: Unit): string[] {
  const st = UNIT_STATS[u.type];
  const lines: string[] = [];
  // a marching unit (§18.2) may move 2 hexes if it does not battle
  const move = canMarch(u) && st.moveBattle < 2 ? MOVE_TOOLTIP.withoutBattle(st.moveBattle, 2) : moveText(st, MOVE_TOOLTIP);
  lines.push(`Move ${move} · Retreat ${st.retreat}/flag`);
  if (st.elephantTable) lines.push(`Close combat: same dice as the enemy unit (${elephantDiceNote()})`);
  else lines.push(`Close combat ${st.cc}${st.ccBack !== st.cc ? ` (${st.ccBack} battling back)` : ''} dice${st.fullStrengthBonus ? ' (+1 at full strength)' : ''}${st.swordHits ? '' : ', swords miss'}`);
  const range = rangeOf(u);
  if (range) lines.push(missileText(u, range));
  lines.push(EVADE_TEXT[st.evade][0]);
  const special = [
    swordIgnoreText(st, 'ignores sword hits', '1'),
    vsMountedText(st),
    // camels; elephants keep their base-game line
    !st.elephantTable && frightenedTypes(u.type).length > 0 && 'frightens horses (+1 retreat hex per flag)',
    st.elephantTable && 'rampages when it retreats',
    ...machineTexts(st),
  ].filter(Boolean);
  if (special.length) lines.push(cap(special.join(' · ')));
  const elite = eliteDef(u);
  if (elite) {
    const perks = elite.abilities.map((a) => ELITE_TEXT[a](u));
    if (perks.length) lines.push(`${elite.name}: ${perks.join(', ')}`);
  }
  return lines;
}

const LEADER_TRAIT_TEXT: Record<LeaderTrait, string> = {
  ccBonus: '+1 close combat die to his unit',
  attachedOnly: 'Satrap: commands only his own unit; his helmets help only that unit',
  forcedMarch: 'his infantry unit may move 2 hexes and still battle',
  spartacusDice: 'I Am Spartacus rolls 2 more dice',
};

/** Tooltip lines for a leader's traits (none for an ordinary leader). */
export function leaderTraitLines(l: Leader): string[] {
  return (l.traits ?? []).map((t) => LEADER_TRAIT_TEXT[t]);
}

/** Rules-reference card of a unit type: [stats line, notes line]. */
export function unitCardLines(t: UnitType): [string, string] {
  const st = UNIT_STATS[t];
  const cc = st.elephantTable ? 'as enemy' : `${st.cc}${st.ccBack !== st.cc ? `/${st.ccBack} back` : ''}`;
  const stats =
    `${st.blocks} blocks · move ${moveText(st, MOVE_REFERENCE)} · close combat ${cc}` +
    `${st.range ? ` · range ${st.range}` : ''} · retreat ${st.retreat}`;
  const notes = [EVADE_TEXT[st.evade][1]];
  if (!st.swordHits) notes.push('Swords do not score hits.');
  if (st.fullStrengthBonus) notes.push('+1 die and ignores a flag at full strength.');
  const scared = frightenedTypes(t);
  const special = [
    swordIgnoreText(st, 'ignores swords', 'one'),
    st.elephantTable && 're-rolls its own swords',
    vsMountedText(st),
    scared.length > 0 && `frightens ${scared.every((x) => UNIT_STATS[x].mounted) ? 'horses' : scared.map(unitNoun).join(', ')}`,
    st.elephantTable && 'rampages on retreat',
    ...machineTexts(st),
  ].filter(Boolean);
  if (special.length) notes.push(`${cap(special.join(', '))}.`);
  return [stats, notes.join(' ')];
}
