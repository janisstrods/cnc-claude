// Pure helpers that turn (state, pending decision, local UI selection) into board highlights and badges, and the texts of
// the prompts and tooltips that go with the expansions' rules. The unit descriptions are in unitText.ts, the objective
// tooltips in objectiveText.ts, the dice orders of 310 in diceOrders.ts.
import {
  ALL_HEXES, CARD_DEFS, OFF_BOARD, UNIT_STATS, ambushAvailable, ambushEntryHexes, attachedLeader, baselineRow, battleReady,
  battleTargets, closeCombatDice, closeHitChance, commandClash, commandModes, commandOf, defaultMods, effectiveCard, eligiblePieces,
  inCommand, inSection, isLeaderId, leaderAt, leaderById, leaderHas, leaderUnit, leadersOf, movablePieces, orderCommander, orderMode,
  other, pieceById, pieceHex, pieceMoves, possessive, rangeOf, rangedDice, rollingFirePaths, rowOf, selectionCommand, unitAt, unitById,
  unitMoveLimits,
  type Blocks, type CardKind, type CommandDef, type Decision, type GameState, type HexId, type RetreatOption, type SectionName,
  type Side, type Unit,
} from '../../engine';
import type { Highlight } from './Board';
import { diceSlotChoices } from './diceOrders';

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

/** Every field of a selection but the hovered hex (the compiler checks that none is missing). */
const SEL_FIELDS: Record<Exclude<keyof UiSel, 'hoverHex'>, true> = {
  selCard: true, hoverCard: true, orderSel: true, selPiece: true, rollPath: true, diceIds: true, diceActive: true,
};
const SEL_KEYS = Object.keys(SEL_FIELDS) as (keyof typeof SEL_FIELDS)[];

/**
 * The fields of `ui` other than the hovered hex, in a fixed order: the dependencies of a memo of what follows from the
 * selection alone (`boardMarks`), which a hover then leaves alone.
 */
export function selectionDeps(ui: UiSel): unknown[] {
  return SEL_KEYS.map((k) => ui[k]);
}

/** The board's marks for the selection, whatever hex is hovered; `pathAt` gives the path to preview with a hex hovered. */
export interface BoardMarks {
  highlights: Map<HexId, Highlight>;
  leaderHighlights: Map<string, Highlight>;
  badges: Map<HexId, string>;
  sectionShade: Set<HexId>;
  pathAt: (hover: HexId | null) => HexId[] | null;
}

export interface BoardUi extends Omit<BoardMarks, 'pathAt'> {
  pathPreview: HexId[] | null;
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

/** The board's marks, with the path preview for the hovered hex `ui.hoverHex`. */
export function boardUi(s: GameState, d: Decision | null, ui: UiSel, human: Side): BoardUi {
  const { pathAt, ...marks } = boardMarks(s, d, ui, human);
  return { ...marks, pathPreview: pathAt(ui.hoverHex) };
}

/**
 * The board's marks for the human's pending decision and the selection. The hovered hex is not read: the game screen
 * keeps these while the pointer moves and asks only `pathAt` for the path to preview.
 */
export function boardMarks(s: GameState, d: Decision | null, ui: Omit<UiSel, 'hoverHex'>, human: Side): BoardMarks {
  const highlights = new Map<HexId, Highlight>();
  const leaderHighlights = new Map<string, Highlight>();
  const badges = new Map<HexId, string>();
  let sectionShade = new Set<HexId>();
  let pathAt: BoardMarks['pathAt'] = () => null;
  // a leader with a unit is marked on his own token, any other piece on its hex
  const markPiece = (id: string, h: Highlight) => {
    const p = pieceById(s, id);
    if (!p || p.hex < 0) return;
    if (!('type' in p) && leaderUnit(s, p)) leaderHighlights.set(id, h);
    else highlights.set(p.hex, h);
  };

  if (!d || d.side !== human) {
    return { highlights, leaderHighlights, badges, sectionShade, pathAt };
  }

  switch (d.kind) {
    case 'playCard': {
      const card = ui.hoverCard ?? ui.selCard;
      if (card !== null) {
        const { kind } = effectiveCard(s, human, card);
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
          const h = pieceHex(s, id) ?? -1;
          if (h >= 0) badges.set(h, 'Exit');
        }
      }
      if (ui.selPiece) {
        markPiece(ui.selPiece, 'selected');
        const moves = pieceMoves(s, ui.selPiece, d.stage);
        // the path of the move to each hex (the last one listed, should two end there)
        const paths = new Map<HexId, HexId[]>();
        for (const m of moves) {
          if (m.hex < 0) {
            const last = m.path[m.path.length - 2];
            if (last !== undefined && last >= 0) badges.set(last, 'Exit ↑');
            continue;
          }
          const isLeader = isLeaderId(ui.selPiece);
          highlights.set(m.hex, isLeader || d.stage === 2 ? 'move' : m.mustBattle ? 'moveMustBattle' : m.canBattle ? 'move' : 'moveNoBattle');
          paths.set(m.hex, m.path);
        }
        pathAt = (hover) => (hover === null ? null : paths.get(hover) ?? null);
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
        if (u) {
          // the path so far, on to the hovered hex when the logs may roll there next
          const path = [u.hex, ...ui.rollPath];
          pathAt = (hover) => (hover !== null && next.includes(hover) ? [...path, hover] : path);
        }
        break;
      }
      for (const id of battleReady(s)) {
        const op = s.turn.ordered[id];
        markPiece(id, op?.mustBattle ? 'moveMustBattle' : 'attacker');
        // a unit that may roll burning logs down its hill (210)
        if (rollingFirePaths(s, id).length) badges.set(pieceHex(s, id) ?? -1, 'Logs');
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
      const h = pieceHex(s, id) ?? -1;
      if (h >= 0) highlights.set(h, 'focus');
      for (const o of d.options) if (!o.offBoard && o.end >= 0) highlights.set(o.end, 'option');
      // last-row retreat (214): an option that eliminates the unit says so
      if (d.kind === 'retreat') for (const o of d.options) if (retreatEliminates(s, d, o)) badges.set(o.end, 'Lost');
      const options = d.options;
      pathAt = (hover) => {
        const o = hover === null ? undefined : options.find((x) => x.end === hover);
        return o && h >= 0 ? [h, ...o.path] : null;
      };
      break;
    }
    case 'momentum':
      highlights.set(d.hex, 'option');
      highlights.set(pieceHex(s, d.unit) ?? -1, 'focus');
      break;
    case 'cavalryExtra':
      highlights.set(pieceHex(s, d.unit) ?? -1, 'focus');
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
        const h = pieceHex(s, id) ?? -1;
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
      const th = pieceHex(s, target) ?? -1;
      if (th >= 0) highlights.set(th, 'focus');
      if (d.kind === 'defend') {
        const ah = pieceHex(s, d.attacker) ?? -1;
        if (ah >= 0) highlights.set(ah, 'targetClose');
      }
      break;
    }
    default:
      break;
  }
  return { highlights, leaderHighlights, badges, sectionShade, pathAt };
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
// Expansion #2: separate commands, Rolling Fire, last-row retreat and the ambush wording (§18.5)
// ---------------------------------------------------------------------------

/** The command of an order selection (the engine's, kept here for the screens). */
export { selectionCommand };

/**
 * The units the "Select all" button orders for a troop card: every eligible unit, when they fit the side's Command and
 * belong to one command (210, §18.5: one card orders one army only). Where the commands' modes differ (304, rule
 * `commandFallback`) only the one command whose troops fit the card counts. Null: no such button (another order mode, no
 * eligible unit, too many, or units of two commands).
 */
export function selectAllUnits(s: GameState, side: Side, card: CardKind): string[] | null {
  const per = commandModes(s, side, card);
  const troop = per?.filter((p) => p.mode.mode === 'troop') ?? null;
  if (troop ? troop.length !== 1 : orderMode(s, side, card).mode !== 'troop') return null;
  const units = eligiblePieces(s, side, card).filter((id) => !isLeaderId(id) && (!troop || inCommand({ command: commandOf(s, id) }, troop[0].command)));
  if (!units.length || units.length > s.players[side].command) return null;
  return commandClash(s, units) === null ? units : null;
}

/**
 * 304 (rule `commandFallback`, §18.5): the prompt line for the commands with no units that fit the card, which order 1
 * unit of their own instead — those of the selection's command once it names one; null when there are none (always in
 * other battles).
 */
export function commandFallbackNote(s: GameState, side: Side, card: CardKind, sel: readonly string[]): string | null {
  const per = commandModes(s, side, card);
  if (!per) return null;
  const own = selectionCommand(s, sel);
  const ones = per.filter((p) => p.mode.mode === 'one' && (own === undefined || p.command === own));
  if (!ones.length) return null;
  const names = ones.map((p) => possessive(commandById(s, p.command)?.name ?? p.command)).join(' and ');
  return `${names} command has no units that fit ${CARD_DEFS[card].title}: for it, order 1 unit of your choice (a normal order, no card bonus).`;
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

/**
 * Wording of an ambush reserve (Trebbia 005, Aquae Sextiae 206) or of reinforcements with fixed entry hexes (308 Gergovia,
 * §18.9): the button's label (`fixed`: one button, whatever the section; otherwise one per section, "Ambush: Left"), its
 * tooltip and the move prompt while the pieces enter (naming the leader who joins them only while he is off the board).
 * `leader` = the reserve's leader (the scenario setup's first reserve leader), if any. For fixed entry, `free` is the number of entry hexes still empty (0: no unit can enter, so the button is
 * not offered); it is null for an ambush on the baseline.
 */
export function ambushTexts(s: GameState, leader?: string): { button: string; move: string; label: string; fixed: boolean; free: number | null } {
  const side = s.special.reserveSide ?? s.active;
  const enemy = s.players[other(side)].army;
  const a = s.special.ambush;
  if (a?.entryHexes) {
    const force = leader ? `${possessive(leader)} reinforcements` : 'The reinforcements';
    // the leader joins an entering unit only while he is still off the board (in the reserve, or released and waiting)
    const leaderOff = !!leader && (
      s.special.reserveLeaders.some((l) => l.name === leader) || s.leaders.some((l) => l.name === leader && l.hex === OFF_BOARD)
    );
    const after = [
      a.noMove ? 'They cannot move on this turn, but may battle.' : '',
      a.attachLeader && leaderOff ? `${leader} joins one of them.` : '',
    ].filter(Boolean).join(' ');
    const free = freeEntryHexes(s, side).length;
    return {
      fixed: true,
      free,
      label: 'Reinforcements enter',
      button: free === 0
        ? `${force} cannot enter now: every entry hex is occupied.`
        : `${force} enter on the ${free === 1 ? 'one free marked entry hex' : `${free} free marked entry hexes`}, one unit per empty hex, whatever the section. The card orders nothing else.`,
      move: `${force} enter on the marked entry hexes: pick a piece, then a highlighted hex.${after ? ` ${after}` : ''}`,
    };
  }
  const force = leader ? `${possessive(leader)} force` : 'The hidden force';
  return {
    fixed: false,
    free: null,
    label: 'Ambush',
    button: leader
      ? `Spring ${possessive(leader)} ambush: his force enters on the ${enemy} baseline in this section`
      : `Spring the ambush: the hidden force enters on the ${enemy} baseline in this section`,
    move: `${force} enters on the ${enemy} baseline: pick a piece, then a highlighted hex. Pieces left off the board return to the reserve.`,
  };
}

// ---------------------------------------------------------------------------
// Expansion #3: forced placement and reinforcements with fixed entry (308), immobile units (306), Caesar's forced march
// with the legions (§18.3), §18.8–§18.11
// ---------------------------------------------------------------------------

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
  return ambushAvailable(s, side, card) ? freeEntryHexes(s, side) : [];
}

/**
 * The fixed entry hexes (308) with no unit and no leader on them, as the engine offers them to the entering units
 * (`ambushEntryHexes`, the same whatever the section); none for an ambush without fixed entry.
 */
function freeEntryHexes(s: GameState, side: Side): HexId[] {
  return s.special.ambush?.entryHexes ? ambushEntryHexes(s, side) : [];
}

/** Tooltip line of an immobile unit (306, §18.11). */
export const IMMOBILE_TIP = 'Immobile: never moves or advances; battles and retreats normally';

/** Tooltip line of a unit that entered from the reserve this turn and may not move again (308, `ambush.noMove`), or null. */
export function enteredTipLine(s: GameState, u: Unit): string | null {
  if (u.hex < 0 || !s.turn.ordered[u.id]?.fromReserve || !s.special.ambush?.noMove) return null;
  return 'Entered this turn: cannot move again until next turn, but may battle';
}

/**
 * Tooltip line of Caesar's forced march (§18.3) on the unit he is attached to, when it gains from it: with him it may move
 * further and still battle under an ordinary order (`unitMoveLimits`: no card, no start hex to limit the move), as an
 * infantry unit (not a war machine) that cannot otherwise move 2 hexes and battle. A pilum unit still never throws after
 * 2 hexes (§18.2).
 */
export function forcedMarchLine(s: GameState, u: Unit): string | null {
  const l = attachedLeader(s, u);
  if (!l || !leaderHas(l, 'forcedMarch')) return null;
  const mods = defaultMods();
  if (unitMoveLimits(u, mods, OFF_BOARD, s, l).battleMax <= unitMoveLimits(u, mods, OFF_BOARD, s).battleMax) return null;
  const pilum = !!u.legion && rangeOf(u) > 0;
  return `${possessive(l.name || 'Caesar')} forced march: with him from the start of its move, it may move 2 hexes and still ${pilum ? 'close combat (no pilum after 2 hexes)' : 'battle'}`;
}
