// Pure helpers that turn (state, pending decision, local UI selection) into board highlights and badges, plus the unit
// descriptions shown in tooltips and the rules reference.
import {
  ALL_HEXES, CARD_DEFS, OFF_BOARD, TERRAIN_NAMES, UNIT_STATS, UNIT_TYPES, ambushAvailable, attachedLeader, bannerTotal, baselineRow, battleReady,
  battleTargets, canMarch, cardKind, closeCombatDice, closeHitChance, commandClash, commandOf, diceOrderPieces, eligiblePieces, inCommand, eliteDef,
  fireMoveLimit, heldBanners, inSection, isLeaderId, leaderAt, leaderById, leaderHas, leaderUnit, leadersOf, mirrorKind, movablePieces,
  nextCaptureBanners, orderCommander, orderDice, orderMode, other, pieceMoves, rangeOf, rangedBaseDice, rangedDice, rollingFirePaths, rowOf,
  sectionsOf, terrainAt, unitAt, unitById, validateDiceOrders,
  type Blocks, type CardKind, type CommandDef, type Decision, type DieFace, type EliteAbility, type EvadeRule, type GameState, type HexId,
  type Leader, type LeaderTrait, type ObjectiveDef, type RetreatOption, type SectionName, type Side, type Unit, type UnitClass, type UnitStats,
  type UnitType,
} from '../../engine';
import type { Highlight } from './Board';

export interface UiSel {
  selCard: number | null;
  hoverCard: number | null;
  orderSel: string[];
  selPiece: string | null;
  hoverHex: HexId | null;
  /** Rolling Fire (210, §18.5): the path hexes picked so far for the selected unit; absent or null = not rolling. */
  rollPath?: HexId[] | null;
  /** Dice orders (310, §18.10): the piece each die of the roll orders so far (null = unused); absent = none yet. */
  diceIds?: (string | null)[];
  /** Dice orders: the die a click on the board assigns (null = none left to assign). */
  diceActive?: number | null;
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
  const p = kind === 'ranged' ? 1 / 6 : closeHitChance(s, attacker, t, dice, 'attack');
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
      // separate commands (210, §18.5): once a piece of one command is picked, only that command's pieces stay marked
      const cmd = selectionCommand(s, ui.orderSel);
      for (const id of eligiblePieces(s, human, d.card)) {
        if (inCommand({ command: commandOf(s, id) }, cmd)) markPiece(id, 'eligible');
      }
      for (const id of ui.orderSel) markPiece(id, 'selected');
      // reinforcements with fixed entry hexes (308, §18.9): where they would enter, if this card brings them in
      for (const h of fixedEntryHexes(s, human, d.card)) {
        highlights.set(h, 'placeEmpty');
        badges.set(h, 'Entry');
      }
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
      if (ui.selPiece && ui.rollPath) {
        // Rolling Fire: the path picked so far, and the hexes it may run on to
        const u = unitById(s, ui.selPiece);
        markPiece(ui.selPiece, 'selected');
        const { next } = rollingFireStep(s, ui.selPiece, ui.rollPath);
        for (const h of ui.rollPath) highlights.set(h, 'rollPath');
        for (const h of next) highlights.set(h, 'rollNext');
        for (const h of [...ui.rollPath, ...next]) if (unitAt(s, h)) badges.set(h, '2 dice');
        if (u) pathPreview = [u.hex, ...ui.rollPath, ...(ui.hoverHex !== null && next.includes(ui.hoverHex) ? [ui.hoverHex] : [])];
        break;
      }
      for (const id of battleReady(s)) {
        const op = s.turn.ordered[id];
        markPiece(id, op?.mustBattle ? 'moveMustBattle' : 'attacker');
        // a unit that may roll burning logs down its hill (210)
        if (rollingFirePaths(s, id).length) badges.set(pieceHexOf(s, id), 'Logs');
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
      // last-row retreat (214): an option that eliminates the unit says so
      if (d.kind === 'retreat') for (const o of d.options) if (retreatEliminates(s, d, o)) badges.set(o.end, 'Lost');
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
    case 'placeLeader':
      // Asculum: own units (gold) to attach the leader to; empty hexes, where he stands alone, only faintly marked
      for (const h of d.options) highlights.set(h, unitAt(s, h) ? 'placeUnit' : 'placeEmpty');
      break;
    case 'placeUnit':
      // a forced placement (308): the empty hexes the unit may be placed on
      for (const h of d.options) {
        highlights.set(h, 'option');
        badges.set(h, 'Place');
      }
      break;
    case 'diceVictim':
      // dice orders (310): the units a flag or swords face of the own order roll may fall on
      for (const id of d.options) markPiece(id, 'option');
      break;
    case 'diceOrders': {
      // dice orders (310): the pieces the selected die may still order, and those the dice order so far
      const ids = ui.diceIds ?? d.faces.map(() => null);
      if (ui.diceActive !== undefined && ui.diceActive !== null) {
        for (const id of diceSlotChoices(s, human, d.faces, ids, ui.diceActive)) markPiece(id, 'eligible');
      }
      ids.forEach((id, i) => {
        if (!id) return;
        markPiece(id, 'selected');
        const h = pieceHexOf(s, id);
        if (h >= 0) badges.set(h, `Die ${i + 1}`);
      });
      break;
    }
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

/** Unit types new in Expansion #2 (§18). */
export const EXP2_UNIT_TYPES: readonly UnitType[] = ['BCH'];

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
 * then units whose base attacking dice the elephant does not copy, or whose dice vary with strength). Camels roll 3
 * attacking and 2 battling back; the elephant's 3 matches their attack, so they are not listed. Expansion #2 types are
 * left out so the base-game wording stays as it is (the Expansion #2 text names the elephant's dice against them).
 */
function elephantDiceNote(): string {
  const odd = UNIT_TYPES.filter((t) => {
    if (EXP2_UNIT_TYPES.includes(t)) return false;
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

// ---------------------------------------------------------------------------
// Expansion #1 prompts and terrain tooltips
// ---------------------------------------------------------------------------

/**
 * Prompt line of a Leadership card: the chain it allows, or the satrap rule (§17.2) when the commanding leader — the
 * selected one, or else every leader who could command — is a satrap.
 */
export function leadershipHint(s: GameState, side: Side, card: CardKind, sel: string[]): string {
  const m = orderMode(s, side, card);
  if (m.mode !== 'leadership') return '';
  const cmd = orderCommander(s, side, card, sel);
  const candidates = leadersOf(s, side).filter((l) => !m.section || inSection(l.hex, side, m.section));
  const satrap = cmd ? leaderHas(cmd, 'attachedOnly') : candidates.length > 0 && candidates.every((l) => leaderHas(l, 'attachedOnly'));
  if (satrap && cmd) {
    return leaderUnit(s, cmd)
      ? 'A satrap commands only his own unit: he is ordered with it, and no other unit.'
      : 'A satrap commands only his own unit: standing alone, he orders only himself.';
  }
  if (satrap) {
    return candidates.some((l) => leaderUnit(s, l))
      ? 'A satrap commands only his own unit: click him to order him with it — or order just 1 unit.'
      : 'A satrap commands only his own unit: standing alone, he orders only himself — or order just 1 unit.';
  }
  return `Click a leader to command through him, then up to ${m.chain} linked units — or order just 1 unit.`;
}

/** Side of the leader to be placed next before the battle (117 Asculum), or null when deployment is over. */
export function deploymentSide(s: GameState): Side | null {
  const next = s.special.unplaced[0];
  return next === undefined ? null : leaderById(s, next)?.side ?? null;
}

/** Screen words of the hexsides in HEX_DIRS order (E, NE, NW, W, SW, SE) on an unflipped board. */
const SIDE_WORDS = ['right', 'upper-right', 'upper-left', 'left', 'lower-left', 'lower-right'] as const;

/**
 * The protected hexsides of a rampart as the viewer sees them: "its upper hexsides" (NE + NW), "its left and lower-left
 * hexsides". On a flipped board (the human commands the top army) every side turns by 180°.
 */
export function rampartSidesText(mask: number, flipped: boolean): string {
  const on = (screen: number) => (mask & (1 << (flipped ? (screen + 3) % 6 : screen))) !== 0;
  const n = [0, 1, 2, 3, 4, 5].filter(on).length;
  if (n === 0) return 'no hexsides';
  if (n === 6) return 'all its hexsides';
  const parts: string[] = [];
  const pair = (a: number, b: number, word: string) => {
    if (on(a) && on(b)) parts.push(word);
    else if (on(a)) parts.push(SIDE_WORDS[a]);
    else if (on(b)) parts.push(SIDE_WORDS[b]);
  };
  pair(2, 1, 'upper');
  if (on(3)) parts.push('left');
  if (on(0)) parts.push('right');
  pair(4, 5, 'lower');
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return `its ${list} hexside${n === 1 ? '' : 's'}`;
}

// ---------------------------------------------------------------------------
// Expansion #2: banners held through objectives, objective tooltips, separate commands, Rolling Fire, last-row
// retreat and the ambush wording (§18.4–§18.5)
// ---------------------------------------------------------------------------

/** A side's banners for the track: `total` (permanent + held, the number that wins) and `held` (of them, can be lost). */
export function bannerCounts(s: GameState, side: Side): { total: number; held: number } {
  return { total: bannerTotal(s, side), held: heldBanners(s, side) };
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
/** "a Roman", "an Antigonus'..." */
const aOrAn = (w: string) => `${/^[AEIOU]/i.test(w) ? 'an' : 'a'} ${w}`;

/** The units an exit objective lets leave: "unit", "foot unit", "cavalry unit". */
const EXIT_UNITS: Record<'any' | 'foot' | 'cavalry', string> = { any: 'unit', foot: 'foot unit', cavalry: 'cavalry unit' };

/**
 * What a hold or majority hex is called in its tooltip: a camp after its owner, a rampart, a city wall (308), a hill, or
 * just an objective.
 */
function placeName(s: GameState, h: HexId, owner: Side | null): string {
  const t = terrainAt(s, h);
  if (t === 'camp') return owner ? `${s.players[owner].army} camp` : 'Camp';
  if (t === 'rampart') return 'Rampart';
  if (t === 'wall') return 'City wall';
  if (t === 'hill') return 'Hill';
  return 'Objective';
}

/** Tooltip lines of one objective for hex `h` (none when the hex plays no part in it). */
function objectiveLines(s: GameState, o: ObjectiveDef, i: number, h: HexId): string[] {
  const st = s.special.objState[i];
  const army = (side: Side) => s.players[side].army;
  switch (o.kind) {
    case 'capture': {
      if (!o.hexes.includes(h)) return [];
      // ship markers (313, §18.4): the enemy's ships off this beach; the marker is taken, the hex does not change
      if (o.marker === 'ship') {
        const ship = `${army(other(o.side))} ship`;
        if (st.taken.includes(h)) return [`${ship}: taken by the ${army(o.side)} army`];
        const n = nextCaptureBanners(s, i);
        return [`${ship}: ${aOrAn(army(o.side))} unit here at the start of its turn takes the marker — ${plural(n, 'banner')} (the hex does not change)`];
      }
      const camp = `${army(other(o.side))} camp`;
      if (st.taken.includes(h)) return [`${camp}: captured by the ${army(o.side)} army`];
      if (o.together) {
        const n = o.banners[0] ?? 1;
        return [`${camp}: ${army(o.side)} units on ${o.together} of these ${o.hexes.length} camps at the start of their turn capture them all — ${plural(n, 'banner')}`];
      }
      const who = o.when === 'stop' ? 'ending its move here' : 'here at the start of its turn';
      const n = nextCaptureBanners(s, i);
      let gain = `${plural(n, 'banner')}`;
      if (n === 0) {
        const k = o.banners.findIndex((b, j) => j >= st.taken.length && b > 0);
        gain = k >= 0 ? `no banner until the ${ORDINAL[k] ?? `${k + 1}th`} camp taken` : 'no banner';
      }
      // a camp on a hill (308, §18.7) leaves the hill when it is removed
      const removed = o.remove ? `; the camp is then removed${s.hillUnder[h] ? ' (the hill remains)' : ''}` : '';
      return [`${camp}: ${aOrAn(army(o.side))} unit ${who} captures it — ${gain}${removed}`];
    }
    case 'hold': {
      if (!o.hexes.includes(h)) return [];
      const cap = o.max < o.hexes.length ? ` (at most ${o.max} for all ${o.hexes.length} hexes)` : '';
      const now = unitAt(s, h)?.side === o.side ? ' Held now.' : '';
      return [`${placeName(s, h, other(o.side))}: the ${army(o.side)} army holds 1 banner while one of its units stands here${cap} — held while occupied, can be lost.${now}`];
    }
    case 'majority': {
      if (!o.hexes.includes(h)) return [];
      const holder = o.sides.find((side) => st.held[side] > 0);
      if (o.sides.length === 1) {
        // one side only (309's hillock, §18.4): it holds the banners while it has strictly more units there than the enemy
        const side = o.sides[0];
        return [
          `${placeName(s, h, null)} objective: ${o.when === 'turnEnd' ? 'at the end of every turn ' : ''}the ${army(side)} army holds ${plural(o.banners, 'banner')} while it has more units on the ${o.hexes.length} marked hexes than the ${army(other(side))} army; the ${army(other(side))} army cannot hold it`,
          holder ? `Held now by the ${army(holder)} army` : 'Not held now',
        ];
      }
      const when = o.when === 'turnEnd' ? 'at the end of every turn the side with' : 'the side with';
      return [
        `${placeName(s, h, null)} objective: ${when} more units on the ${o.hexes.length} marked hexes holds ${plural(o.banners, 'banner')} (a tie: nobody)`,
        holder ? `Held now by the ${army(holder)} army` : 'Held by nobody now',
      ];
    }
    case 'sectionClear': {
      const scored = st.sections.filter((sec) => sectionsOf(h, o.side).includes(sec));
      if (!scored.length) return [];
      return [`Section cleared: the ${army(o.side)} army holds 1 banner while no ${army(other(o.side))} unit enters this section`];
    }
    case 'exit':
      if (!o.hexes.includes(h)) return [];
      // leaders score too (317, §18.4): a lone leader may leave, and a unit leaving with its leader scores 2
      if (o.leadersScore) {
        return [`Exit: ${aOrAn(army(o.side))} ${EXIT_UNITS[o.units]} or lone leader here may leave the battlefield — 1 banner each, 2 for a unit with its leader (they are removed)`];
      }
      return [`Exit: ${aOrAn(army(o.side))} ${EXIT_UNITS[o.units]} here may leave the battlefield — 1 banner (the unit is removed)`];
  }
}

/** Tooltip lines of the battle objectives on hex `h` (§18.4): what the hex scores, for whom, and its state now. */
export function objectiveTipLines(s: GameState, h: HexId): string[] {
  return s.special.objectives.flatMap((o, i) => objectiveLines(s, o, i, h));
}

/** The command of an order selection: that of its first piece with one (undefined = none yet, or no commands). */
export function selectionCommand(s: GameState, sel: readonly string[]): string | undefined {
  for (const id of sel) {
    const c = commandOf(s, id);
    if (c !== undefined) return c;
  }
  return undefined;
}

/**
 * The units the "Select all" button orders for a troop card: every eligible unit, when they fit the side's Command and
 * belong to one command (210, §18.5: one card orders one army only). Null: no such button (another order mode, no
 * eligible unit, too many, or units of two commands).
 */
export function selectAllUnits(s: GameState, side: Side, card: CardKind): string[] | null {
  if (orderMode(s, side, card).mode !== 'troop') return null;
  const units = eligiblePieces(s, side, card).filter((id) => !isLeaderId(id));
  if (!units.length || units.length > s.players[side].command) return null;
  return commandClash(s, units) === null ? units : null;
}

/** The definition of a command id. */
export function commandById(s: GameState, id: string | undefined): CommandDef | undefined {
  return id === undefined ? undefined : s.special.commands.find((c) => c.id === id);
}

/** Block set a command is drawn in: its own (210 Lentulus' grey), else its side's. */
export function commandBlocks(s: GameState, c: CommandDef): Blocks {
  return c.blocks ?? s.players[c.side].blocks;
}

/** Base-edge colour of a piece whose command is drawn apart from its army (`UnitToken`/`LeaderToken` `edgeBlocks`). */
export function edgeBlocksOf(s: GameState, p: { command?: string }): Blocks | undefined {
  return commandById(s, p.command)?.blocks;
}

/** Tooltip line of a piece's command. */
export function commandTipLine(s: GameState, p: { command?: string }): string | null {
  const c = commandById(s, p.command);
  return c ? `${possessive(c.name)} command: one card orders one command only` : null;
}

/**
 * Rolling Fire (210, §18.5): after the path hexes picked so far (`prefix`), the hexes the logs may roll on to (`next`),
 * and whether `prefix` is a whole legal path (`complete`). A path stops only where it must end, so a complete path is
 * never the start of a longer one.
 */
export function rollingFireStep(s: GameState, unitId: string, prefix: readonly HexId[]): { next: HexId[]; complete: boolean } {
  const fits = rollingFirePaths(s, unitId).filter((p) => p.length >= prefix.length && prefix.every((h, i) => p[i] === h));
  const next: HexId[] = [];
  for (const p of fits) if (p.length > prefix.length && !next.includes(p[prefix.length])) next.push(p[prefix.length]);
  return { next, complete: prefix.length > 0 && fits.some((p) => p.length === prefix.length) };
}

/**
 * Last-row retreat (214, §18.5): does this retreat option eliminate the unit? It does for a unit of the battle's
 * `lastRowRetreat` side whose retreat (not an evade) ends on its own baseline row with hexes it could not take, unless it
 * ends by joining a leader.
 */
export function retreatEliminates(s: GameState, d: Extract<Decision, { kind: 'retreat' }>, o: RetreatOption): boolean {
  const u = unitById(s, d.unit);
  return !!u && d.reason === 'retreat' && s.special.lastRowRetreat === u.side && o.losses > 0 && !o.attachLeader && o.end >= 0 &&
    rowOf(o.end) === baselineRow(u.side);
}

/** "Mago's", "Marcellus'" */
export function possessive(name: string): string {
  return name.endsWith('s') ? `${name}'` : `${name}'s`;
}

/**
 * Wording of an ambush reserve (Trebbia 005, Aquae Sextiae 206) or of reinforcements with fixed entry hexes (308 Gergovia,
 * §18.9): the button's label (`fixed`: one button, whatever the section; otherwise one per section, "Ambush: Left"), its
 * tooltip and the move prompt while the pieces enter. `leader` = the reserve's leader (the scenario setup's first reserve
 * leader), if any.
 */
export function ambushTexts(s: GameState, leader?: string): { button: string; move: string; label: string; fixed: boolean } {
  const side = s.special.reserveSide ?? s.active;
  const enemy = s.players[other(side)].army;
  const a = s.special.ambush;
  if (a?.entryHexes) {
    const force = leader ? `${possessive(leader)} reinforcements` : 'The reinforcements';
    const after = [
      a.noMove ? 'They cannot move on this turn, but may battle.' : '',
      a.attachLeader && leader ? `${leader} joins one of them.` : '',
    ].filter(Boolean).join(' ');
    return {
      fixed: true,
      label: 'Reinforcements enter',
      button: `${force} enter on the ${a.entryHexes.length} marked entry hexes, one unit per empty hex, whatever the section. The card orders nothing else.`,
      move: `${force} enter on the marked entry hexes: pick a piece, then a highlighted hex.${after ? ` ${after}` : ''}`,
    };
  }
  const force = leader ? `${possessive(leader)} force` : 'The hidden force';
  return {
    fixed: false,
    label: 'Ambush',
    button: leader
      ? `Spring ${possessive(leader)} ambush: his force enters on the ${enemy} baseline in this section`
      : `Spring the ambush: the hidden force enters on the ${enemy} baseline in this section`,
    move: `${force} enters on the ${enemy} baseline: pick a piece, then a highlighted hex. Pieces left off the board return to the reserve.`,
  };
}

// ---------------------------------------------------------------------------
// Expansion #3: dice orders (310), forced placement and reinforcements with fixed entry (308), immobile units (306), Caesar's
// forced march with the legions (§18.3), §18.8–§18.11
// ---------------------------------------------------------------------------

/** A die face in prompts and the log: "light (green)", "helmet", "flag". */
export const FACE_WORDS: Record<DieFace, string> = {
  light: 'light (green)', medium: 'medium (blue)', heavy: 'heavy (red)', leader: 'helmet', flag: 'flag', swords: 'swords',
};

/** What one die of a dice-order roll does (§18.10): a flag or swords falls on a unit, a symbol orders one, or it is lost. */
export type DiceSlotRole = 'flag' | 'swords' | 'order' | 'lost';

export interface DiceSlot {
  face: DieFace;
  role: DiceSlotRole;
  /** The pieces the die could order (`diceOrderPieces`), before anything is assigned; empty for the other roles. */
  options: string[];
}

/** The dice of a dice-order roll (§18.10) and what each can do now: a symbol with no piece of its kind is lost. */
export function diceOrderSlots(s: GameState, side: Side, faces: readonly DieFace[]): DiceSlot[] {
  return faces.map((face): DiceSlot => {
    if (face === 'flag' || face === 'swords') return { face, role: face, options: [] };
    const options = diceOrderPieces(s, side, face);
    return { face, role: options.length ? 'order' : 'lost', options };
  });
}

/**
 * The pieces die `i` may order with the other dice as assigned in `ids` (one entry per die, null = unused): its pieces that
 * keep the whole assignment legal (`validateDiceOrders`: no piece twice, a helmet's leader with his unit).
 */
export function diceSlotChoices(s: GameState, side: Side, faces: readonly DieFace[], ids: readonly (string | null)[], i: number): string[] {
  const all = [...faces];
  return diceOrderPieces(s, side, faces[i]).filter((id) => validateDiceOrders(s, side, all, ids.map((x, j) => (j === i ? id : x))) === null);
}

/** The next die after `from` (wrapping round) that is still unused and could order a piece, or null. */
function nextFreeDie(s: GameState, side: Side, faces: readonly DieFace[], ids: readonly (string | null)[], from: number): number | null {
  for (let k = 1; k <= faces.length; k++) {
    const i = (from + k) % faces.length;
    if (ids[i] === null && diceSlotChoices(s, side, faces, ids, i).length) return i;
  }
  return null;
}

/** The first die that could order a piece (where the assignment starts), or null when none can. */
export function firstOrderDie(s: GameState, side: Side, faces: readonly DieFace[]): number | null {
  return nextFreeDie(s, side, faces, faces.map(() => null), faces.length - 1);
}

/**
 * A click on piece `piece` while the dice orders are assigned (310): a piece already ordered frees its die (which becomes the
 * selected one); otherwise the selected die (`active`) orders it, or else the first free die that can, and the selection
 * moves on to the next free die. Null: no die can order that piece.
 */
export function diceAssignClick(
  s: GameState, side: Side, faces: readonly DieFace[], ids: readonly (string | null)[], active: number | null, piece: string,
): { ids: (string | null)[]; active: number | null } | null {
  const at = ids.indexOf(piece);
  if (at >= 0) return { ids: ids.map((x, j) => (j === at ? null : x)), active: at };
  const fits = (i: number) => diceSlotChoices(s, side, faces, ids, i).includes(piece);
  let die = active !== null && fits(active) ? active : -1;
  if (die < 0) die = faces.findIndex((_, i) => ids[i] === null && fits(i));
  if (die < 0) return null;
  const next = ids.map((x, j) => (j === die ? piece : x));
  return { ids: next, active: nextFreeDie(s, side, faces, next, die) };
}

/** Name of a piece in the dice-order texts: "Light Cavalry", "Saburra with his Medium Infantry". */
export function pieceName(s: GameState, id: string): string {
  if (isLeaderId(id)) {
    const l = leaderById(s, id);
    const own = l && leaderUnit(s, l);
    return `${l?.name || 'Leader'}${own ? ` with his ${UNIT_STATS[own.type].name}` : ''}`;
  }
  const u = unitById(s, id);
  return u ? UNIT_STATS[u.type].name : 'unit';
}

/** What a die does before its piece is chosen (the caption under it in the turn panel). */
export function diceSlotText(slot: DiceSlot): string {
  switch (slot.role) {
    case 'flag':
      return 'A unit falls back';
    case 'swords':
      return 'A unit loses a block';
    case 'order':
      return slot.face === 'leader' ? 'Orders a leader and his unit' : `Orders a ${slot.face} unit`;
    case 'lost':
      return slot.face === 'leader' ? 'No leader: lost' : `No ${slot.face} unit: lost`;
  }
}

/**
 * Subtitle of a dice-order roll in the dice tray (§18.10), from the state right after the roll (`s`): its flags and swords,
 * then how many pieces it can order. A roll that can order nothing says nothing about orders; `mine`: the human rolled.
 */
export function diceRollSummary(s: GameState, side: Side, faces: readonly DieFace[], mine: boolean): string {
  const count = (f: DieFace) => faces.filter((x) => x === f).length;
  const flags = count('flag');
  const swords = count('swords');
  // pieces it can order: per symbol, at most as many as there are pieces of its kind
  let orders = 0;
  for (const f of ['light', 'medium', 'heavy', 'leader'] as const) orders += Math.min(count(f), diceOrderPieces(s, side, f).length);
  const parts: string[] = [];
  if (flags) parts.push(flags === 1 ? 'a unit falls back' : `${flags} units fall back`);
  if (swords) parts.push(swords === 1 ? 'a unit loses a block' : `${swords} units lose a block`);
  if (orders) {
    const what = orders === 1 ? '1 unit to order' : `up to ${orders} units to order`;
    parts.push(mine ? `choose ${what}` : what);
  }
  if (!parts.length) return 'No effect';
  const text = parts.join('; ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * A side's dice-order turn as the screen tells it (§18.10): the roll, and for each die the piece it fell on (flag, swords)
 * or ordered, by name (null: not yet, or unused). `done`: the orders are given.
 */
export interface DiceTurn {
  side: Side;
  turn: number;
  faces: DieFace[];
  used: (string | null)[];
  done: boolean;
}

/** The turn after a victim of a flag or swords face was chosen: the first such die without one gets `name`. */
export function diceTurnVictim(t: DiceTurn, face: 'flag' | 'swords', name: string): DiceTurn {
  const i = t.faces.findIndex((f, j) => f === face && t.used[j] === null);
  return i < 0 ? t : { ...t, used: t.used.map((x, j) => (j === i ? name : x)) };
}

/** The turn after its orders were given (`ids`: the `assign` answer, one entry per die). */
export function diceTurnOrders(s: GameState, t: DiceTurn, ids: readonly (string | null)[]): DiceTurn {
  return { ...t, used: t.used.map((x, j) => (t.faces[j] === 'flag' || t.faces[j] === 'swords' ? x : ids[j] ? pieceName(s, ids[j]!) : null)), done: true };
}

/**
 * One line telling a dice-order turn (the opponent's turn banner): "Order dice: flag, light (green). Fell back: Light
 * Cavalry. Ordered: Light Cavalry." `over`: the orders step is past (with nothing to order, no orders were asked).
 */
export function diceTurnText(t: DiceTurn, over: boolean): string {
  const parts = [`Order dice: ${t.faces.map((f) => FACE_WORDS[f]).join(', ')}.`];
  const named = (face: DieFace) => t.used.filter((x, j) => t.faces[j] === face && x).join(', ');
  if (named('flag')) parts.push(`Fell back: ${named('flag')}.`);
  if (named('swords')) parts.push(`Lost a block: ${named('swords')}.`);
  if (t.done || over) {
    const ordered = t.used.filter((x, j) => x && t.faces[j] !== 'flag' && t.faces[j] !== 'swords');
    parts.push(`Ordered: ${ordered.length ? ordered.join(', ') : 'nothing'}.`);
  }
  return parts.join(' ');
}

/** Counter Attack against a side that orders by dice (310): there is no card to copy, so it orders nothing. */
export function counterAttackNote(s: GameState, side: Side): string | null {
  const enemy = other(side);
  if (!orderDice(s, enemy)) return null;
  return `The ${s.players[enemy].army} army orders by dice and plays no cards: Counter Attack has nothing to copy and orders nothing.`;
}

/** Prompt of a forced placement (308, §18.9): the unit waiting off the board, and where it may go. */
export function placeUnitPrompt(s: GameState, d: Extract<Decision, { kind: 'placeUnit' }>): { title: string; text: string } {
  const p = s.special.placeUnits.find((x) => x.unit.id === d.unit);
  const name = p ? UNIT_STATS[p.unit.type].name : 'reinforcement';
  return {
    title: `Reinforcement: place your ${name}`,
    text: `Before you play a card, the ${s.players[d.side].army} ${name} waiting off the board must be placed on one of the ${d.options.length} highlighted hexes. It is then an ordinary unit, and this turn's card may order it.`,
  };
}

/**
 * The fixed entry hexes (308, §18.9) where reinforcements could enter now, when `card` lets `side` bring them in: the empty
 * ones (no unit, no leader). Empty in every other case.
 */
export function fixedEntryHexes(s: GameState, side: Side, card: CardKind): HexId[] {
  const entry = s.special.ambush?.entryHexes;
  if (!entry || !ambushAvailable(s, side, card)) return [];
  return entry.filter((h) => !unitAt(s, h) && !leaderAt(s, h));
}

/** Tooltip line of an immobile unit (306, §18.11). */
export const IMMOBILE_TIP = 'Immobile: never moves or advances; battles and retreats normally';

/** Tooltip line of a unit that entered from the reserve this turn and may not move again (308, `ambush.noMove`), or null. */
export function enteredTipLine(s: GameState, u: Unit): string | null {
  if (u.hex < 0 || !s.turn.ordered[u.id]?.fromReserve || !s.special.ambush?.noMove) return null;
  return 'Entered this turn: cannot move again until next turn, but may battle';
}

/**
 * Tooltip line of Caesar's forced march (§18.3) on the unit he is attached to, when it gains from it: an infantry unit (not
 * a war machine) that cannot otherwise move 2 hexes and battle. A pilum unit still never throws after 2 hexes (§18.2).
 */
export function forcedMarchLine(s: GameState, u: Unit): string | null {
  const l = attachedLeader(s, u);
  const st = UNIT_STATS[u.type];
  if (!l || !leaderHas(l, 'forcedMarch') || st.mounted || st.moveBattle === 0 || st.moveBattle >= 2) return null;
  const pilum = !!u.legion && rangeOf(u) > 0;
  return `${possessive(l.name || 'Caesar')} forced march: with him from the start of its move, it may move 2 hexes and still ${pilum ? 'close combat (no pilum after 2 hexes)' : 'battle'}`;
}
