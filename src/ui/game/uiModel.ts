// Pure helpers that turn (state, pending decision, local UI selection) into board highlights and badges, plus the unit
// descriptions shown in tooltips and the rules reference.
import {
  ALL_HEXES, CARD_DEFS, OFF_BOARD, TERRAIN_NAMES, UNIT_STATS, UNIT_TYPES, battleReady, battleTargets, cardKind, closeCombatDice,
  closeHitChance, eligiblePieces, eliteDef, inSection, isLeaderId, leaderAt, leaderById, leaderUnit, mirrorKind, movablePieces, other,
  pieceMoves, rangeOf, rangedDice, unitAt, unitById, type CardKind, type Decision, type EliteAbility, type EvadeRule, type GameState,
  type HexId, type Leader, type LeaderTrait, type SectionName, type Side, type Unit, type UnitClass, type UnitStats, type UnitType,
} from '../../engine';
import type { Highlight } from './Board';

export interface UiSel {
  selCard: number | null;
  hoverCard: number | null;
  orderSel: string[];
  selPiece: string | null;
  hoverHex: HexId | null;
}

export interface BoardUi {
  highlights: Map<HexId, Highlight>;
  leaderHighlights: Map<string, Highlight>;
  badges: Map<HexId, string>;
  sectionShade: Set<HexId>;
  pathPreview: HexId[] | null;
}

/** The card kind a played card would actually execute (Counter Attack copies the opponent's last card). */
export function effectiveKind(s: GameState, side: Side, cardId: number): { kind: CardKind | null; mirrored: boolean } {
  const k = cardKind(cardId);
  if (k !== 'counterAttack') return { kind: k, mirrored: false };
  const last = s.lastCard[other(side)];
  if (!last) return { kind: null, mirrored: false };
  const m = mirrorKind(last);
  return { kind: m, mirrored: m !== last };
}

export function pieceHexOf(s: GameState, id: string): HexId {
  return (isLeaderId(id) ? leaderById(s, id)?.hex : unitById(s, id)?.hex) ?? -1;
}

function shadeSections(side: Side, secs: SectionName[]): Set<HexId> {
  const out = new Set<HexId>();
  if (!secs.length || secs.length === 3) return out;
  for (const h of ALL_HEXES) if (secs.some((x) => inSection(h, side, x))) out.add(h);
  return out;
}

export function attackDice(s: GameState, attacker: Unit, hex: HexId, kind: 'close' | 'ranged', role: 'attack' | 'bonus' = 'attack'): number {
  const op = s.turn.ordered[attacker.id];
  if (kind === 'ranged') return rangedDice(s, attacker, hex, op?.moved ?? 0, true);
  const t = unitAt(s, hex) ?? leaderAt(s, hex);
  if (!t) return 0;
  return closeCombatDice(s, attacker, t, { role, fullAtStart: attacker.blocks === attacker.maxBlocks, ordered: true });
}

export function expectedHits(s: GameState, attacker: Unit, hex: HexId, kind: 'close' | 'ranged'): number {
  const dice = attackDice(s, attacker, hex, kind);
  const t = unitAt(s, hex);
  if (!t) return dice / 6;
  const p = kind === 'ranged' ? 1 / 6 : closeHitChance(s, attacker, t);
  return dice * p;
}

export function boardUi(s: GameState, d: Decision | null, ui: UiSel, human: Side): BoardUi {
  const highlights = new Map<HexId, Highlight>();
  const leaderHighlights = new Map<string, Highlight>();
  const badges = new Map<HexId, string>();
  let sectionShade = new Set<HexId>();
  let pathPreview: HexId[] | null = null;
  const markPiece = (id: string, h: Highlight) => {
    if (isLeaderId(id)) {
      const l = leaderById(s, id);
      if (!l || l.hex < 0) return;
      if (leaderUnit(s, l)) leaderHighlights.set(id, h);
      else highlights.set(l.hex, h);
    } else {
      const u = unitById(s, id);
      if (u && u.hex >= 0) highlights.set(u.hex, h);
    }
  };

  if (!d || d.side !== human) {
    return { highlights, leaderHighlights, badges, sectionShade, pathPreview };
  }

  switch (d.kind) {
    case 'playCard': {
      const card = ui.hoverCard ?? ui.selCard;
      if (card !== null) {
        const { kind } = effectiveKind(s, human, card);
        if (kind) {
          sectionShade = shadeSections(human, CARD_DEFS[kind].sections);
          for (const id of eligiblePieces(s, human, kind)) markPiece(id, 'eligible');
        }
      }
      break;
    }
    case 'orders': {
      sectionShade = shadeSections(human, CARD_DEFS[d.card].sections);
      for (const id of eligiblePieces(s, human, d.card)) markPiece(id, 'eligible');
      for (const id of ui.orderSel) markPiece(id, 'selected');
      break;
    }
    case 'move': {
      for (const id of movablePieces(s, d.stage)) {
        markPiece(id, 'mover');
        if (pieceMoves(s, id, d.stage).some((m) => m.hex === OFF_BOARD)) {
          const h = pieceHexOf(s, id);
          if (h >= 0) badges.set(h, 'Exit');
        }
      }
      if (ui.selPiece) {
        markPiece(ui.selPiece, 'selected');
        const moves = pieceMoves(s, ui.selPiece, d.stage);
        for (const m of moves) {
          if (m.hex < 0) {
            const last = m.path[m.path.length - 2];
            if (last !== undefined && last >= 0) badges.set(last, 'Exit ↑');
            continue;
          }
          const isLeader = isLeaderId(ui.selPiece);
          highlights.set(m.hex, isLeader || d.stage === 2 ? 'move' : m.mustBattle ? 'moveMustBattle' : m.canBattle ? 'move' : 'moveNoBattle');
          if (ui.hoverHex === m.hex) pathPreview = m.path;
        }
      }
      break;
    }
    case 'battle': {
      for (const id of battleReady(s)) {
        const op = s.turn.ordered[id];
        markPiece(id, op?.mustBattle ? 'moveMustBattle' : 'attacker');
      }
      if (ui.selPiece) {
        markPiece(ui.selPiece, 'selected');
        const u = unitById(s, ui.selPiece);
        if (u) {
          for (const t of battleTargets(s, ui.selPiece)) {
            highlights.set(t.hex, t.kind === 'close' ? 'targetClose' : 'targetRanged');
            const n = attackDice(s, u, t.hex, t.kind);
            badges.set(t.hex, `${n} ${n === 1 ? 'die' : 'dice'}`);
          }
        }
      }
      break;
    }
    case 'retreat':
    case 'leaderEvade': {
      const id = d.kind === 'retreat' ? d.unit : d.leader;
      const h = pieceHexOf(s, id);
      if (h >= 0) highlights.set(h, 'focus');
      for (const o of d.options) if (!o.offBoard && o.end >= 0) highlights.set(o.end, 'option');
      if (ui.hoverHex !== null) {
        const o = d.options.find((x) => x.end === ui.hoverHex);
        if (o && h >= 0) pathPreview = [h, ...o.path];
      }
      break;
    }
    case 'momentum':
      highlights.set(d.hex, 'option');
      highlights.set(pieceHexOf(s, d.unit), 'focus');
      break;
    case 'cavalryExtra':
      highlights.set(pieceHexOf(s, d.unit), 'focus');
      for (const h of d.options) highlights.set(h, 'option');
      break;
    case 'bonusCombat': {
      const u = unitById(s, d.unit);
      if (u) highlights.set(u.hex, 'focus');
      for (const h of d.targets) {
        highlights.set(h, 'targetClose');
        if (u) {
          const n = attackDice(s, u, h, 'close', 'bonus');
          badges.set(h, `${n} ${n === 1 ? 'die' : 'dice'}`);
        }
      }
      break;
    }
    case 'defend':
    case 'ignoreFlags': {
      const target = d.kind === 'defend' ? d.target : d.unit;
      const th = pieceHexOf(s, target);
      if (th >= 0) highlights.set(th, 'focus');
      if (d.kind === 'defend') {
        const ah = pieceHexOf(s, d.attacker);
        if (ah >= 0) highlights.set(ah, 'targetClose');
      }
      break;
    }
    default:
      break;
  }
  return { highlights, leaderHighlights, badges, sectionShade, pathPreview };
}

// ---------------------------------------------------------------------------
// unit descriptions (tooltips and the rules reference), generated from the unit table
// ---------------------------------------------------------------------------

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

/** Missile line of a tooltip: 2 dice standing and 1 after moving, or no fire after moving at all (heavy war machines). */
function missileText(st: UnitStats, range: number): string {
  const noFireAfterMoving = st.noFireAfterMove <= 1 || st.moveBattle === 0;
  return `Missiles: range ${range}, 2 dice (${noFireAfterMoving ? 'not after moving' : '1 after moving'})`;
}

/**
 * Where elephants' dice differ from what the enemy would roll: "3 vs elephants, warriors, chariots" (elephants first,
 * then units whose base attacking dice the elephant does not copy, or whose dice vary with strength). Camels roll 3
 * attacking and 2 battling back; the elephant's 3 matches their attack, so they are not listed.
 */
function elephantDiceNote(): string {
  const odd = UNIT_TYPES.filter((t) => {
    const st = UNIT_STATS[t];
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
};

/** Stats line for tooltips. */
export function unitSummary(u: Unit): string[] {
  const st = UNIT_STATS[u.type];
  const lines: string[] = [];
  lines.push(`Move ${moveText(st, MOVE_TOOLTIP)} · Retreat ${st.retreat}/flag`);
  if (st.elephantTable) lines.push(`Close combat: same dice as the enemy unit (${elephantDiceNote()})`);
  else lines.push(`Close combat ${st.cc}${st.ccBack !== st.cc ? ` (${st.ccBack} battling back)` : ''} dice${st.fullStrengthBonus ? ' (+1 at full strength)' : ''}${st.swordHits ? '' : ', swords miss'}`);
  const range = rangeOf(u);
  if (range) lines.push(missileText(st, range));
  lines.push(EVADE_TEXT[st.evade][0]);
  const special = [
    swordIgnoreText(st, 'ignores sword hits', '1'),
    vsMountedText(st),
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
  attachedOnly: 'Commands only his own unit',
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
