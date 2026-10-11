// Which units/leaders a card may order (rules-reference §6, §12).
import { sectionOrders } from './cards';
import { areAdjacent, inSection, sectionsOf } from './hex';
import {
  isLeaderId, isLoneLeader, leaderById, pieceById, leaderHas, leaderUnit, leadersOf, unitById, unitsOf, enemyUnitAdjacent,
} from './query';
import { canShoot } from './elites';
import { UNIT_STATS } from './units';
import type { CardKind, DieFace, GameState, Leader, SectionName, Side, Unit, UnitClass } from './types';

export type OrderMode =
  | { mode: 'section'; counts: Partial<Record<SectionName, number>> }
  | { mode: 'troop'; filter: (u: Unit) => boolean; max: number; leaders: boolean }
  | { mode: 'leadership'; section: SectionName | null; chain: number }
  | { mode: 'group'; max: number | null } // Line Command / Double Time: linked foot units
  | { mode: 'one' } // order 1 unit of your choice
  | { mode: 'auto' } // Clash of Shields, Darken the Sky
  | { mode: 'none' } // First Strike played on own turn, Counter Attack with nothing to copy
  | { mode: 'dice' }; // Rally / I Am Spartacus

const isFoot = (u: Unit) => UNIT_STATS[u.type].foot;
const isMounted = (u: Unit) => UNIT_STATS[u.type].mounted;
const ofClass = (c: UnitClass) => (u: Unit) => UNIT_STATS[u.type].cls === c;

/**
 * Determine how a card orders pieces in the current position. `command` (rule `commandFallback`, 304, §18.5): the command
 * the card is played for, among whose units alone the type the card names is looked for, so that a command without it
 * orders "1 unit of your choice" of its own; ignored without the rule (210 Picenum judges the whole army).
 */
export function orderMode(s: GameState, side: Side, kind: CardKind | null, command?: string): OrderMode {
  if (!kind) return { mode: 'none' };
  const own = command !== undefined && fallbackCommands(s, side).includes(command);
  const units = own ? unitsOf(s, side).filter((u) => inCommand(u, command)) : unitsOf(s, side);
  const max = s.players[side].command;
  const sec = sectionOrders(kind);
  if (sec) return { mode: 'section', counts: sec };
  const troop = (filter: (u: Unit) => boolean, leaders = false): OrderMode =>
    units.some(filter) ? { mode: 'troop', filter, max, leaders } : { mode: 'one' };
  switch (kind) {
    case 'orderLight': return troop(ofClass('light'));
    case 'orderMedium': return troop(ofClass('medium'));
    case 'orderHeavy': return troop(ofClass('heavy'));
    case 'orderMounted': return troop(isMounted, true);
    case 'mountedCharge': return troop(isMounted);
    case 'moveFireMove': return troop(ofClass('light'));
    case 'inspiredL': return { mode: 'leadership', section: 'left', chain: 4 };
    case 'inspiredC': return { mode: 'leadership', section: 'center', chain: 4 };
    case 'inspiredR': return { mode: 'leadership', section: 'right', chain: 4 };
    case 'leadershipAny': return { mode: 'leadership', section: null, chain: 3 };
    case 'lineCommand': return units.some(isFoot) ? { mode: 'group', max: null } : { mode: 'one' };
    case 'doubleTime': return units.some(isFoot) ? { mode: 'group', max: 4 } : { mode: 'one' };
    case 'clash': return { mode: 'auto' };
    case 'darken': return units.some(canShoot) ? { mode: 'auto' } : { mode: 'one' };
    // a leader of either command lets Rally act for any (leader effects are not restricted, X3 Q16): the army-wide test
    case 'rally': return leadersOf(s, side).length ? { mode: 'dice' } : { mode: 'one' };
    case 'spartacus': return { mode: 'dice' };
    case 'firstStrike': return { mode: 'none' };
    case 'counterAttack': return { mode: 'none' }; // resolved to a copy before ordering
    default: return { mode: 'none' };
  }
}

/**
 * Chain length a Leadership card gives when `l` is the commanding leader: the card's chain, or none for a satrap
 * (`attachedOnly`, §17.2), who orders only himself and his own unit.
 */
export function leadershipChain(l: Leader, chain: number): number {
  return leaderHas(l, 'attachedOnly') ? 0 : chain;
}

/** Extra dice Spartacus gives his side's I Am Spartacus roll (§18.3). */
const SPARTACUS_EXTRA_DICE = 2;

/**
 * Dice `side` rolls for I Am Spartacus (§18.3): its Command, and 2 more while a leader of the side with `spartacusDice` is
 * on the board (not once he is eliminated, nor while he waits off the board). Never the other side's Spartacus.
 */
export function spartacusDiceCount(s: GameState, side: Side): number {
  const bonus = leadersOf(s, side).some((l) => leaderHas(l, 'spartacusDice')) ? SPARTACUS_EXTRA_DICE : 0;
  return s.players[side].command + bonus;
}

// ---------------------------------------------------------------------------
// separate commands (210 Picenum, rules-reference §18.5)
// ---------------------------------------------------------------------------

/** Why a selection is refused when it spans two commands. */
export const ONE_ARMY = 'One card orders one army only.';
const NOT_THE_COMMAND = 'That piece is not in the command you named.';

/**
 * The commands of `side` whose cards look for the type they name within themselves (rule `commandFallback`, 304, §18.5),
 * in data order; none without the rule. A command with no unit left on the board is not one: it has nothing to order, so
 * the cards act for the commands that remain as they would in a battle without the rule.
 */
export function fallbackCommands(s: GameState, side: Side): string[] {
  if (!s.scenario.rules.includes('commandFallback')) return [];
  const present = new Set(unitsOf(s, side).map((u) => u.command));
  return s.scenario.commands.filter((c) => c.side === side && present.has(c.id)).map((c) => c.id);
}

/** A command and the order mode a card has for it (`commandModes`). */
export interface CommandMode {
  command: string;
  mode: OrderMode;
}

/**
 * The order mode a card has for each of `side`'s commands (rule `commandFallback`, 304, §18.5), when at least one of them
 * falls back to "1 unit of your choice" where the army as a whole would not; null otherwise, and always without the rule:
 * every selection is then judged by the army's mode (`orderMode`). The two never differ in anything but that fallback.
 */
export function commandModes(s: GameState, side: Side, kind: CardKind | null): CommandMode[] | null {
  const cmds = fallbackCommands(s, side);
  if (!kind || !cmds.length) return null;
  const whole = orderMode(s, side, kind).mode;
  const per = cmds.map((command) => ({ command, mode: orderMode(s, side, kind, command) }));
  return per.some((p) => p.mode.mode !== whole) ? per : null;
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
 * The order mode a selection is judged by: the card's (`orderMode`), or where the commands' modes differ (`commandModes`,
 * 304) that of the selection's command; null while such a selection names no command yet (more than one mode is open).
 */
export function selectionMode(s: GameState, side: Side, kind: CardKind | null, pieces: readonly string[]): OrderMode | null {
  const per = commandModes(s, side, kind);
  if (!per) return orderMode(s, side, kind);
  const own = selectionCommand(s, pieces);
  if (own === undefined) return null;
  return per.find((p) => p.command === own)?.mode ?? orderMode(s, side, kind);
}

/** Command a unit or leader belongs to; undefined = none, so free to go with any command. */
export function commandOf(s: GameState, id: string): string | undefined {
  return pieceById(s, id)?.command;
}

/** Is a piece with this command part of the command named (if any)? A piece with no command always is. */
export const inCommand = (p: { command?: string }, command: string | undefined): boolean =>
  command === undefined || p.command === undefined || p.command === command;

/**
 * Do the pieces (and the command already named, if any) belong to more than one command? Returns the reason (`ONE_ARMY`)
 * or null. Pieces with no command, and battles without commands, never clash.
 */
export function commandClash(s: GameState, ids: string[], command?: string): string | null {
  if (!s.scenario.commands.length) return null;
  let seen = command;
  for (const id of ids) {
    const c = commandOf(s, id);
    if (c === undefined) continue;
    if (seen !== undefined && c !== seen) return ONE_ARMY;
    seen = c;
  }
  return null;
}

/**
 * The commands a card that orders without a selection (Clash of Shields, Darken the Sky) or by dice (Rally, I Am
 * Spartacus) could order, when there is more than one (§18.5): the ids of those with an eligible unit, in the battle's
 * data order. The player names one (`chooseCommand`) before the card acts. Empty = nothing to ask (also in every battle
 * without commands). With the rule `commandFallback` (304) a command without the card's units (Darken the Sky's missile
 * units) can be named too, for 1 unit of its choice.
 */
export function commandChoices(s: GameState, side: Side, kind: CardKind | null): string[] {
  if (!kind || !s.scenario.commands.length) return [];
  const m = orderMode(s, side, kind);
  let pool: Unit[];
  if (m.mode === 'auto') pool = autoOrders(s, side, kind).map((id) => unitById(s, id)!);
  else if (m.mode === 'dice') pool = kind === 'rally' ? rallyCandidates(s, side) : unitsOf(s, side);
  else return [];
  const fallback = m.mode === 'auto' ? (commandModes(s, side, kind) ?? []).filter((p) => p.mode.mode === 'one').map((p) => p.command) : [];
  const units = unitsOf(s, side);
  const present = s.scenario.commands.filter((c) => c.side === side && (
    pool.some((u) => u.command === c.id) || (fallback.includes(c.id) && units.some((u) => u.command === c.id))
  )).map((c) => c.id);
  return present.length > 1 ? present : [];
}

/**
 * Pieces ordered automatically by Clash of Shields / Darken the Sky; with `command` (the one the player named, §18.5)
 * only the units of that command (and those with no command).
 */
export function autoOrders(s: GameState, side: Side, kind: CardKind, command?: string): string[] {
  const units = unitsOf(s, side).filter((u) => inCommand(u, command));
  if (kind === 'clash') return units.filter((u) => enemyUnitAdjacent(s, u.hex, side)).map((u) => u.id);
  if (kind === 'darken') return units.filter(canShoot).map((u) => u.id);
  return [];
}

/**
 * Pieces that could take part in some valid order with this card (for UI highlighting). Where the commands' modes differ
 * (`commandModes`, 304) each command's pieces by its own mode.
 */
export function eligiblePieces(s: GameState, side: Side, kind: CardKind | null): string[] {
  const per = commandModes(s, side, kind);
  if (!per) return eligibleFor(s, side, orderMode(s, side, kind));
  const out = new Set<string>();
  for (const { command, mode } of per) {
    for (const id of eligibleFor(s, side, mode)) if (inCommand({ command: commandOf(s, id) }, command)) out.add(id);
  }
  return [...out];
}

function eligibleFor(s: GameState, side: Side, m: OrderMode): string[] {
  const units = unitsOf(s, side);
  const leaders = leadersOf(s, side);
  switch (m.mode) {
    case 'section': {
      const secs = Object.keys(m.counts) as SectionName[];
      const inAny = (h: number) => secs.some((x) => inSection(h, side, x));
      return [...units.filter((u) => inAny(u.hex)).map((u) => u.id), ...leaders.filter((l) => inAny(l.hex)).map((l) => l.id)];
    }
    case 'troop':
      return [...units.filter(m.filter).map((u) => u.id), ...(m.leaders ? leaders.map((l) => l.id) : [])];
    case 'leadership': {
      const sec = m.section;
      const out = new Set<string>();
      for (const u of units) if (!sec || inSection(u.hex, side, sec)) out.add(u.id); // single-unit fallback
      for (const l of leaders) {
        if (sec && !inSection(l.hex, side, sec)) continue;
        out.add(l.id);
        if (leadershipChain(l, m.chain) === 0) {
          const own = leaderUnit(s, l);
          if (own) out.add(own.id);
          continue;
        }
        // anything within chain distance could be linked
        for (const u of units) out.add(u.id);
        for (const l2 of leaders) if (isLoneLeader(s, l2)) out.add(l2.id);
      }
      return [...out];
    }
    case 'group':
      return units.filter(isFoot).map((u) => u.id);
    case 'one':
      return units.map((u) => u.id);
    default:
      return [];
  }
}

/** Most pieces this card can order given the selection so far (for the UI counter), or null when unbounded or not yet known. */
export function orderLimit(s: GameState, side: Side, kind: CardKind | null, pieces: string[]): number | null {
  const m = selectionMode(s, side, kind, pieces);
  if (!m) return null; // 304: the commands' modes differ and the selection names none yet
  switch (m.mode) {
    case 'section':
      return Object.values(m.counts).reduce((a, n) => a + (n ?? 0), 0);
    case 'troop':
    case 'group':
      return m.max;
    case 'one':
      return 1;
    case 'leadership': {
      // Until a commanding leader is picked, the order may still be a chain or a single unit.
      const cmd = orderCommander(s, side, kind, pieces);
      return cmd ? 1 + (leaderUnit(s, cmd) ? 1 : 0) + leadershipChain(cmd, m.chain) : null;
    }
    default:
      return null;
  }
}

/**
 * The leader a Leadership-card selection is commanded through (for the UI counter and prompt; display only): among the
 * selected leaders in the card's section, the first that can command the whole selection, else the first of them; null
 * when none is selected (or the card is not a Leadership card).
 */
export function orderCommander(s: GameState, side: Side, kind: CardKind | null, pieces: string[]): Leader | null {
  const m = orderMode(s, side, kind);
  if (m.mode !== 'leadership') return null;
  const units = pieces.filter((id) => !isLeaderId(id)).map((id) => unitById(s, id)).filter((u): u is Unit => !!u);
  const leaders = pieces.filter(isLeaderId).map((id) => leaderById(s, id)).filter((l): l is Leader => !!l);
  const inSec = leaders.filter((l) => !m.section || inSection(l.hex, side, m.section));
  return inSec.find((l) => commandsSelection(s, side, m, l, units, leaders)) ?? inSec[0] ?? null;
}

/**
 * Can `cmd` command the selection `units` + `leaders` with a Leadership card (§6, §17.2)? He must stand in the card's
 * section and bring his own unit; other leaders must be lone; the other hexes form one group linked to his, at most his
 * chain long (none for a satrap).
 */
function commandsSelection(
  s: GameState, side: Side, m: { section: SectionName | null; chain: number }, cmd: Leader, units: Unit[], leaders: Leader[],
): boolean {
  if (m.section && !inSection(cmd.hex, side, m.section)) return false;
  const ownUnit = leaderUnit(s, cmd);
  if (ownUnit && !units.includes(ownUnit)) return false; // leaders may not detach on Leadership cards
  const otherHexes = new Set<number>();
  for (const u of units) if (u.hex !== cmd.hex) otherHexes.add(u.hex);
  for (const l of leaders) {
    if (l === cmd) continue;
    if (!isLoneLeader(s, l)) return false; // attached leaders follow their unit
    otherHexes.add(l.hex);
  }
  if (otherHexes.size > leadershipChain(cmd, m.chain)) return false;
  return connected([...otherHexes], cmd.hex);
}

function connected(hexes: number[], extraRoot?: number): boolean {
  if (hexes.length === 0) return true;
  const all = extraRoot !== undefined ? [extraRoot, ...hexes] : hexes;
  const seen = new Set<number>([all[0]]);
  const stack = [all[0]];
  while (stack.length) {
    const h = stack.pop()!;
    for (const k of all) if (!seen.has(k) && areAdjacent(h, k)) { seen.add(k); stack.push(k); }
  }
  return all.every((h) => seen.has(h));
}

function assignSections(hexSecs: SectionName[][], counts: Partial<Record<SectionName, number>>): boolean {
  const left = { ...counts };
  const go = (i: number): boolean => {
    if (i === hexSecs.length) return true;
    for (const sec of hexSecs[i]) {
      if ((left[sec] ?? 0) > 0) {
        left[sec]! -= 1;
        if (go(i + 1)) return true;
        left[sec]! += 1;
      }
    }
    return false;
  };
  return go(0);
}

/**
 * Validate an order selection. Returns an error message, or null when legal. In a battle with separate commands (§18.5)
 * the pieces must also belong to one command; with the rule `commandFallback` (304) the selection is judged by its own
 * command's mode (`selectionMode`), and one that names no command yet by any command's.
 */
export function validateOrders(s: GameState, side: Side, kind: CardKind | null, pieces: string[]): string | null {
  const m = selectionMode(s, side, kind, pieces);
  if (m) return validateSelection(s, side, m, pieces) ?? commandClash(s, pieces);
  let err: string | null = null;
  for (const p of commandModes(s, side, kind)!) {
    const e = validateSelection(s, side, p.mode, pieces);
    if (e === null) return null;
    err ??= e;
  }
  return err;
}

function validateSelection(s: GameState, side: Side, m: OrderMode, pieces: string[]): string | null {
  if (new Set(pieces).size !== pieces.length) return 'A piece may only be ordered once.';
  for (const id of pieces) {
    const p = pieceById(s, id);
    if (!p || p.side !== side || p.hex < 0) return 'Not one of your pieces on the battlefield.';
  }
  const units = pieces.filter((id) => !isLeaderId(id)).map((id) => unitById(s, id)!);
  const leaders = pieces.filter(isLeaderId).map((id) => leaderById(s, id)!);
  switch (m.mode) {
    case 'none':
    case 'auto':
    case 'dice':
      return pieces.length === 0 ? null : 'This card does not take a manual selection.';
    case 'one':
      if (pieces.length > 1 || leaders.length) return 'Order a single unit of your choice.';
      return null;
    case 'section': {
      const hexSecs = [...units.map((u) => u.hex), ...leaders.map((l) => l.hex)].map((h) =>
        sectionsOf(h, side).filter((x) => (m.counts[x] ?? 0) > 0),
      );
      if (hexSecs.some((x) => x.length === 0)) return 'That piece is not in a section named on the card.';
      if (!assignSections(hexSecs, m.counts)) return 'Too many orders for the section(s) on this card.';
      return null;
    }
    case 'troop': {
      if (pieces.length > m.max) return `You may order at most ${m.max} (your Command).`;
      if (units.some((u) => !m.filter(u))) return 'That unit is not of the type named on the card.';
      if (leaders.length && !m.leaders) return 'This card does not order leaders.';
      return null;
    }
    case 'group': {
      if (m.max !== null && pieces.length > m.max) return `At most ${m.max} units.`;
      if (leaders.length) return 'Only foot units.';
      if (units.some((u) => !isFoot(u))) return 'Only foot units.';
      if (!connected(units.map((u) => u.hex))) return 'The units must form one linked group.';
      return null;
    }
    case 'leadership': {
      if (pieces.length === 0) return null;
      if (leaders.length === 0) {
        if (units.length !== 1) return 'Without a leader, order exactly one unit.';
        if (m.section && !inSection(units[0].hex, side, m.section)) return 'That unit is not in the named section.';
        return null;
      }
      // Try each selected leader as the commander.
      if (leaders.some((cmd) => commandsSelection(s, side, m, cmd, units, leaders))) return null;
      const only = leaders.length === 1 ? leaders[0] : null;
      if (only && (!m.section || inSection(only.hex, side, m.section))) {
        // the detach rule first: it is the reason for any attached leader, satrap or not
        const own = leaderUnit(s, only);
        if (own && !units.includes(own)) return `${only.name || 'This leader'} may not detach: order his unit with him.`;
        if (leadershipChain(only, m.chain) === 0) return `${only.name || 'This leader'} commands only himself and his own unit.`;
      }
      return m.section
        ? `Choose a leader in the ${m.section} section and up to ${m.chain} linked units.`
        : `Choose a leader and up to ${m.chain} linked units.`;
    }
  }
}

/**
 * Units that the Rally card may restore: damaged, not `noRally` (EL/HCH), in or adjacent to a friendly leader's hex; with
 * `command` (named by the player, §18.5) only those of that command (and those with no command).
 */
export function rallyCandidates(s: GameState, side: Side, command?: string): Unit[] {
  const leaders = leadersOf(s, side);
  return unitsOf(s, side).filter(
    (u) => u.blocks < u.maxBlocks && !UNIT_STATS[u.type].noRally && inCommand(u, command) &&
      leaders.some((l) => l.hex === u.hex || areAdjacent(l.hex, u.hex)),
  );
}

function faceMatches(face: DieFace, u: Unit): boolean {
  if (face === 'leader') return true;
  return face === UNIT_STATS[u.type].cls;
}

/**
 * Validate a Rally assignment: one entry per die. `command`: the command the player named (§18.5; the Rally decision
 * carries it), whose units alone may be rallied; the units rallied belong to one command either way.
 */
export function validateRally(s: GameState, side: Side, faces: DieFace[], ids: (string | null)[], command?: string): string | null {
  if (ids.length !== faces.length) return 'One entry per die.';
  const cands = rallyCandidates(s, side);
  const used = new Map<string, number>();
  for (let i = 0; i < faces.length; i++) {
    const id = ids[i];
    if (id === null) continue;
    const u = cands.find((x) => x.id === id);
    if (!u) return 'That unit cannot be rallied.';
    if (!inCommand(u, command)) return NOT_THE_COMMAND;
    if (!faceMatches(faces[i], u)) return 'That die does not match the unit type.';
    used.set(id, (used.get(id) ?? 0) + 1);
    if (used.get(id)! > u.maxBlocks - u.blocks) return 'A unit may not exceed its starting strength.';
  }
  return commandClash(s, [...used.keys()], command);
}

/**
 * Validate an I Am Spartacus assignment: one entry per die. `command`: the command the player named (§18.5; the decision
 * carries it): only its units and leaders with no command can be ordered; the pieces ordered belong to one command either way.
 */
export function validateSpartacus(s: GameState, side: Side, faces: DieFace[], ids: (string | null)[], command?: string): string | null {
  if (ids.length !== faces.length) return 'One entry per die.';
  const seen = new Set<string>();
  for (let i = 0; i < faces.length; i++) {
    const id = ids[i];
    if (id === null) continue;
    if (seen.has(id)) return 'Each piece may be ordered only once.';
    seen.add(id);
    const f = faces[i];
    if (isLeaderId(id)) {
      const l = leaderById(s, id);
      if (!l || l.side !== side || l.hex < 0) return 'Not your leader.';
      if (f !== 'leader') return 'Only a helmet may order a leader.';
      if (!inCommand(l, command)) return NOT_THE_COMMAND;
      continue;
    }
    const u = unitById(s, id);
    if (!u || u.side !== side || u.hex < 0) return 'Not your unit.';
    if (f === 'flag' || f === 'swords') return 'Flags and swords order nothing.';
    if (!faceMatches(f, u)) return 'That die does not match the unit type.';
    if (!inCommand(u, command)) return NOT_THE_COMMAND;
  }
  return commandClash(s, [...seen], command);
}

// ---------------------------------------------------------------------------
// dice orders (310 Utica P1, rules-reference §18.10)
// ---------------------------------------------------------------------------

/** Order dice `side` rolls at the start of its turn instead of playing a card (§18.10); 0 = it plays cards. */
export function orderDice(s: GameState, side: Side): number {
  return s.scenario.orderDice?.[side] ?? 0;
}

/**
 * Pieces a face of a dice-order roll could order (§18.10), before anything is assigned: a class face, the units of that
 * class on the board; a helmet, the side's leaders on the board (each brings his attached unit); flags and swords, nothing.
 */
export function diceOrderPieces(s: GameState, side: Side, face: DieFace): string[] {
  if (face === 'leader') return leadersOf(s, side).map((l) => l.id);
  if (face === 'flag' || face === 'swords') return [];
  return unitsOf(s, side).filter((u) => UNIT_STATS[u.type].cls === face).map((u) => u.id);
}

/** The pieces an assignment of dice orders orders: each id, and the unit attached to each leader, once each, in face order. */
export function diceOrdered(s: GameState, ids: (string | null)[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    if (!id) continue;
    out.push(id);
    const l = isLeaderId(id) ? leaderById(s, id) : undefined;
    const own = l && leaderUnit(s, l);
    if (own) out.push(own.id);
  }
  return out;
}

/**
 * Validate a dice-order assignment (§18.10): one entry per face; flags and swords order nothing; a class face orders one
 * of the side's units of that class; a helmet orders one of its leaders, and his attached unit with him; no piece is
 * ordered twice (two equal dice order two different units, and a helmet's unit is not ordered again by a class face).
 */
export function validateDiceOrders(s: GameState, side: Side, faces: DieFace[], ids: (string | null)[]): string | null {
  if (!Array.isArray(ids) || ids.length !== faces.length) return 'One entry per die.';
  for (let i = 0; i < faces.length; i++) {
    const id = ids[i];
    if (id === null) continue;
    const f = faces[i];
    if (f === 'flag' || f === 'swords') return 'Flags and swords order nothing.';
    if (typeof id !== 'string') return 'Not a piece.';
    if (isLeaderId(id)) {
      const l = leaderById(s, id);
      if (!l || l.side !== side || l.hex < 0) return 'Not your leader.';
      if (f !== 'leader') return 'Only a helmet orders a leader.';
      continue;
    }
    const u = unitById(s, id);
    if (!u || u.side !== side || u.hex < 0) return 'Not your unit.';
    if (f === 'leader') return 'A helmet orders a leader (with his unit).';
    if (UNIT_STATS[u.type].cls !== f) return 'That die does not match the unit type.';
  }
  const all = diceOrdered(s, ids);
  if (new Set(all).size !== all.length) return 'Each unit may be ordered only once.';
  return null;
}
