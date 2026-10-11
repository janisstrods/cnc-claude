// Dice orders (310 Utica, rules-reference §18.10): a side that holds no cards rolls order dice each turn. The UI state of
// such a turn (which die orders which piece), its texts for the prompt, the dice panel, the dice tray and the log, and the
// Counter Attack that finds nothing to copy.
import {
  UNIT_STATS, diceOrderPieces, isLeaderId, leaderById, leaderUnit, orderDice, other, unitById, validateDiceOrders,
  type Decision, type DieFace, type GameState, type Side,
} from '../../engine';

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

/**
 * The dice-order turn of `side` to show and to record answers on (310, §18.10): `t`, the roll on record, while it is that
 * side's current turn. A battle resumed from its save mid-turn has no roll on record, so the turn starts from the pending
 * decision: `diceOrders` carries the whole roll, `diceVictim` only the flag or swords die it asks about (added to what is
 * known). When the orders come with a roll other than the one known, the whole roll replaces it, and the victims already
 * chosen keep their names on the matching dice. Null: nothing to show.
 */
export function currentDiceTurn(s: GameState, side: Side, t: DiceTurn | null, d: Decision | null): DiceTurn | null {
  const own = t && t.side === side && t.turn === s.turn.number ? t : null;
  const pending = d && d.side === side && s.active === side ? d : null;
  const fresh = (faces: DieFace[]): DiceTurn => ({ side, turn: s.turn.number, faces, used: faces.map(() => null), done: false });
  if (pending?.kind === 'diceOrders' && (!own || own.faces.join() !== pending.faces.join())) {
    let next = fresh(pending.faces);
    own?.faces.forEach((f, j) => {
      const name = own.used[j];
      if ((f === 'flag' || f === 'swords') && name) next = diceTurnVictim(next, f, name);
    });
    return next;
  }
  if (pending?.kind === 'diceVictim' && !own?.faces.some((f, j) => f === pending.face && own.used[j] === null)) {
    return own ? { ...own, faces: [...own.faces, pending.face], used: [...own.used, null] } : fresh([pending.face]);
  }
  return own;
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
