// The orders, movement and battle phases of a turn (rules-reference §6-§9, §12, §18.5): the card played and its
// orders (the separate commands' choice, Rally and I Am Spartacus dice, the ambush sprung), dice orders instead of a
// card (310, §18.10), the moves (reserve entry, exits, marsh checks; reserve leaders joining their force, 308) and the
// battle phase, whose battle actions attacks.ts resolves.
import { closeCombat, rangedAttack, rollingFire, type AdvanceTrack } from './attacks';
import { updateHeld } from './banners';
import { CARD_DEFS, cardKind, defaultMods, effectiveCard, modsFor } from './cards';
import { applyHits, emitRoll, hurt, killLeader, log, marshCheckUnit, relocate, sideName, unitName } from './casualties';
import { ask, type Gen } from './decisions';
import type { MoveTarget } from './movement';
import { captureOnStop, exitLeader, exitUnit } from './objectives';
import { canBattleNow, canMove, type Found } from './options';
import {
  autoOrders, commandChoices, diceOrderPieces, diceOrdered, orderDice, orderMode, rallyCandidates, selectionMode, spartacusDiceCount,
} from './orders';
import { attachedLeader, isLeaderId, leaderAt, leaderById, leaderUnit, pieceHex, unitAt, unitById, unitsOf } from './query';
import { rollDice, rollDie } from './rng';
import { breakRamparts, hasEntryRoll } from './terrain';
import {
  OFF_BOARD, type Answer, type CardKind, type FlowCtx, type GameState, type HexId, type OrderedPiece, type SectionName, type Side,
  type Unit,
} from './types';

// ---------------------------------------------------------------------------
// orders
// ---------------------------------------------------------------------------

/**
 * The order state of piece `id` just ordered (§6): it starts where it stands (`OFF_BOARD` for a reserve), has not moved and
 * has the turn's shots as battles (none for a leader). The AI orders its planned dice orders with it too.
 */
export function newOrderedPiece(s: GameState, id: string): OrderedPiece {
  const isLeader = isLeaderId(id);
  return {
    id, isLeader, startHex: pieceHex(s, id) ?? OFF_BOARD, moved: 0, moveDone: false, move2Done: false,
    battlesLeft: isLeader ? 0 : s.turn.mods.shots, canBattle: true, mustBattle: false,
    enteredHexThisTurn: false, attachedThisTurn: false,
  };
}

function addOrdered(s: GameState, id: string, extra: Partial<OrderedPiece> = {}) {
  s.turn.ordered[id] = { ...newOrderedPiece(s, id), ...extra };
}

function releaseAmbush(s: GameState, ctx: FlowCtx, side: Side, section: SectionName) {
  s.special.reserveReleased = true;
  s.turn.ambushSection = section;
  const ids: string[] = [];
  for (const u of s.special.reserveUnits) { s.units.push(u); ids.push(u.id); }
  for (const l of s.special.reserveLeaders) { s.leaders.push(l); ids.push(l.id); }
  s.special.reserveUnits = [];
  s.special.reserveLeaders = [];
  for (const id of ids) addOrdered(s, id, { fromReserve: true });
  log(ctx, s.scenario.ambush!.text.replace(/\{section\}/g, section), side);
  ctx.emit({ t: 'ordered', side, ids });
}

function returnUnplacedReserves(s: GameState) {
  const backU = s.units.filter((u) => u.hex === OFF_BOARD);
  const backL = s.leaders.filter((l) => l.hex === OFF_BOARD);
  if (!backU.length && !backL.length) return;
  s.units = s.units.filter((u) => u.hex !== OFF_BOARD);
  s.leaders = s.leaders.filter((l) => l.hex !== OFF_BOARD);
  s.special.reserveUnits.push(...backU);
  s.special.reserveLeaders.push(...backL);
  if (backU.length) s.special.reserveReleased = false;
  for (const p of [...backU, ...backL]) delete s.turn.ordered[p.id];
}

/**
 * Separate commands (§18.5): when the pieces `kind` could order belong to more than one command, the player names one
 * before the card acts (before any dice are rolled). Returns the command named, or undefined when nothing was asked
 * (always, in a battle without commands).
 */
function* chooseCommandStep(s: GameState, ctx: FlowCtx, side: Side, kind: CardKind): Gen<string | undefined> {
  const options = commandChoices(s, side, kind);
  if (!options.length) return undefined;
  const a = (yield* ask(s, ctx, { kind: 'chooseCommand', side, options })) as Extract<Answer, { kind: 'choose' }>;
  const id = options[a.index];
  log(ctx, `Orders go to the ${s.scenario.commands.find((c) => c.id === id)!.name} command.`, side);
  return id;
}

function* rallyStep(s: GameState, ctx: FlowCtx, side: Side): Gen<string[]> {
  const command = yield* chooseCommandStep(s, ctx, side, 'rally');
  const faces = rollDice(s, s.players[side].command);
  const cands = rallyCandidates(s, side, command);
  emitRoll(ctx, 'rally', faces, faces.map((f) => f !== 'flag' && f !== 'swords'), null, null);
  if (!cands.length) {
    log(ctx, 'No damaged units are near a leader: nothing to rally.', side);
    return [];
  }
  const a = yield* ask(s, ctx, { kind: 'rally', side, faces, ...(command !== undefined ? { command } : {}) });
  const ids = (a as { ids: (string | null)[] }).ids;
  const rallied = new Map<string, number>();
  for (const id of ids) if (id) rallied.set(id, (rallied.get(id) ?? 0) + 1);
  for (const [id, n] of rallied) {
    const u = unitById(s, id)!;
    u.blocks = Math.min(u.maxBlocks, u.blocks + n);
    ctx.emit({ t: 'rallied', id, blocks: n });
  }
  return [...rallied.keys()];
}

function* spartacusStep(s: GameState, ctx: FlowCtx, side: Side): Gen<string[]> {
  s.turn.reshuffleAfter = true;
  const command = yield* chooseCommandStep(s, ctx, side, 'spartacus');
  const faces = rollDice(s, spartacusDiceCount(s, side));
  emitRoll(ctx, 'spartacus', faces, faces.map((f) => f !== 'flag' && f !== 'swords'), null, null);
  if (faces.every((f) => f === 'flag' || f === 'swords')) return [];
  const a = yield* ask(s, ctx, { kind: 'spartacus', side, faces, ...(command !== undefined ? { command } : {}) });
  return (a as { ids: (string | null)[] }).ids.filter((x): x is string => !!x);
}

function* ordersStep(s: GameState, ctx: FlowCtx, kind: CardKind | null, mirrored: boolean): Gen {
  const side = s.active;
  const t = s.turn;
  t.mods = kind ? modsFor(kind) : defaultMods();
  const mode = orderMode(s, side, kind);
  let ids: string[] = [];
  if (mode.mode === 'none' || !kind) return;
  let select = mode.mode !== 'auto' && mode.mode !== 'dice';
  if (mode.mode === 'auto') {
    const command = yield* chooseCommandStep(s, ctx, side, kind);
    // 304 (§18.5): a command named that has none of the card's units orders 1 unit of its own instead
    if (command !== undefined && orderMode(s, side, kind, command).mode === 'one') select = true;
    else ids = autoOrders(s, side, kind, command);
  } else if (mode.mode === 'dice') ids = kind === 'rally' ? yield* rallyStep(s, ctx, side) : yield* spartacusStep(s, ctx, side);
  if (select) {
    const a = (yield* ask(s, ctx, { kind: 'orders', side, card: kind, mirrored })) as Extract<Answer, { kind: 'orders' }>;
    if (a.ambushSection) {
      releaseAmbush(s, ctx, side, a.ambushSection);
      return;
    }
    ids = a.pieces;
    // "1 unit of your choice" is a normal order: no card bonus (304: judged by the selection's command)
    if ((selectionMode(s, side, kind, ids) ?? mode).mode === 'one') t.mods = defaultMods();
  }
  // Without the helmet symbol, attached leaders cannot detach: they simply move with their unit.
  if (!CARD_DEFS[kind].detach) ids = ids.filter((id) => !(isLeaderId(id) && leaderUnit(s, leaderById(s, id)!)));
  for (const id of ids) addOrdered(s, id);
  ctx.emit({ t: 'ordered', side, ids });
}

/** The card of a card-playing side's turn: it is played (a Counter Attack resolved to its copy) and gives its orders. */
export function* cardStep(s: GameState, ctx: FlowCtx, side: Side): Gen {
  const t = s.turn;
  const pa = yield* ask(s, ctx, { kind: 'playCard', side });
  const cardId = (pa as { card: number }).card;
  const hand = s.players[side].hand;
  hand.splice(hand.indexOf(cardId), 1);
  t.card = cardId;
  const kind = cardKind(cardId);
  const { kind: effective, mirrored } = effectiveCard(s, side, cardId);
  t.effective = effective;
  ctx.emit({ t: 'cardPlayed', side, card: cardId, kind, effective: effective ?? kind });
  t.phase = 'orders';
  yield* ordersStep(s, ctx, effective, mirrored);
}

/**
 * Dice orders (310, §18.10, X3 Q9 with the spec's override: the rolling side makes every choice). The side rolls its order
 * dice (purpose `diceOrders`); each flag face makes one of its units, its choice (`diceVictim`), retreat for one flag that
 * cannot be ignored (blocks lost for hexes it cannot take, the leader casualty check as usual); then each swords face costs
 * a unit of its choice 1 block (casualty check for its leader; banners for the enemy as usual). Each victim is chosen once
 * the one before is resolved. Then the faces that can still order something are assigned (`diceOrders`, `validateDiceOrders`):
 * a class face orders one unit of its class, a helmet a leader with his attached unit; unused faces are lost. No card is
 * played: `card` and `effective` stay null and the modifiers are the defaults.
 */
export function* diceOrdersStep(s: GameState, ctx: FlowCtx, side: Side): Gen {
  const t = s.turn;
  t.mods = defaultMods();
  const faces = rollDice(s, orderDice(s, side));
  emitRoll(ctx, 'diceOrders', faces, faces.map((f) => f !== 'flag' && f !== 'swords'), null, null);
  for (const face of ['flag', 'swords'] as const) {
    for (const f of faces) {
      if (f !== face) continue;
      const options = unitsOf(s, side).map((u) => u.id);
      if (!options.length) continue;
      const a = (yield* ask(s, ctx, { kind: 'diceVictim', side, face, options })) as Extract<Answer, { kind: 'choose' }>;
      const u = unitById(s, options[a.index])!;
      if (face === 'flag') {
        log(ctx, `A flag on the order dice: the ${sideName(s, side)} ${unitName(u)} falls back.`, side);
        yield* applyHits(s, ctx, u, 0, 1, { kind: 'ranged', striker: null, fullAtStart: u.blocks === u.maxBlocks, noFlagIgnore: true });
      } else {
        log(ctx, `Swords on the order dice: the ${sideName(s, side)} ${unitName(u)} loses a block.`, side);
        yield* hurt(s, ctx, u, 1, 'swords on the order dice');
      }
      if (s.winner) return;
    }
  }
  if (!faces.some((f) => diceOrderPieces(s, side, f).length)) return;
  const a = (yield* ask(s, ctx, { kind: 'diceOrders', side, faces })) as Extract<Answer, { kind: 'assign' }>;
  const ids = diceOrdered(s, a.ids);
  if (!ids.length) return;
  for (const id of ids) addOrdered(s, id);
  ctx.emit({ t: 'ordered', side, ids });
}

// ---------------------------------------------------------------------------
// movement
// ---------------------------------------------------------------------------

/** Piece `id` makes move `target`, one of its `pieceMoves`. */
function* doMove(s: GameState, ctx: FlowCtx, id: string, stage: 1 | 2, target: MoveTarget): Gen {
  const to = target.hex;
  const t = s.turn;
  const op = t.ordered[id];
  if (op.isLeader) {
    const l = leaderById(s, id)!;
    const from = l.hex;
    op.moveDone = true;
    if (stage === 2) op.move2Done = true;
    if (to === OFF_BOARD) {
      // an exit objective that scores leaders (317): he walks to his exit hex (the path's second-to-last hex) and steps off the board
      ctx.emit({ t: 'move', id, path: target.path });
      exitLeader(s, ctx, l, target.path[target.path.length - 2]);
      return;
    }
    l.hex = to;
    ctx.emit({ t: 'move', id, path: from === OFF_BOARD ? [to] : target.path });
    const u = unitAt(s, to);
    if (u && u.side === l.side) {
      ctx.emit({ t: 'attach', leader: l.id, unit: u.id });
      const uo = t.ordered[u.id];
      if (uo && !uo.moveDone) uo.attachedThisTurn = true;
    } else if (hasEntryRoll(s, to)) {
      const f = rollDie(s);
      emitRoll(ctx, 'marsh', [f], [f === 'leader'], null, l.id);
      if (f === 'leader') killLeader(s, ctx, l, 'leader lost in the marsh');
    }
    return;
  }
  const u = unitById(s, id)!;
  const from = u.hex;
  const entered = target.path.filter((h) => h !== from); // the hexes it enters (223 rampart breakers)
  const ldr = from >= 0 ? attachedLeader(s, u) : undefined;
  if (stage === 1) {
    op.moveDone = true;
    op.moved = target.dist;
  } else op.move2Done = true;
  op.enteredHexThisTurn = true;
  op.canBattle = target.canBattle;
  op.mustBattle = target.mustBattle;
  if (ldr && t.ordered[ldr.id]) t.ordered[ldr.id].moveDone = true;
  if (to === OFF_BOARD) {
    // an exit objective: the unit walks to its exit hex (the path's second-to-last hex) and steps off the board for a banner
    ctx.emit({ t: 'move', id, path: target.path });
    relocate(s, u, target.path[target.path.length - 2]);
    breakRamparts(s, ctx, u.side, entered);
    exitUnit(s, ctx, u);
    return;
  }
  relocate(s, u, to);
  ctx.emit({ t: 'move', id, path: from === OFF_BOARD ? [to] : target.path });
  if (from === OFF_BOARD) {
    ctx.emit({ t: 'reserveEnter', id, hex: to });
    s.special.reserveEntered = true; // the forced placements after the ambush may follow (308, §18.9)
  }
  breakRamparts(s, ctx, u.side, entered); // 223: every rampart on the path, the destination too
  if (target.attachesTo) {
    const l = leaderById(s, target.attachesTo);
    if (l) {
      ctx.emit({ t: 'attach', leader: l.id, unit: u.id });
      const lo = t.ordered[l.id];
      if (lo) lo.moveDone = true;
    }
  }
  if (hasEntryRoll(s, to) && (yield* marshCheckUnit(s, ctx, u, { done: false }))) return;
  captureOnStop(s, ctx, u);
}

export function* movePhase(s: GameState, ctx: FlowCtx, stage: 1 | 2): Gen {
  for (;;) {
    if (s.winner) return;
    if (!Object.keys(s.turn.ordered).some((id) => canMove(s, id, stage))) break;
    const found: Found = {};
    const a = yield* ask(s, ctx, { kind: 'move', side: s.active, stage }, found);
    if (a.kind === 'endMove') break;
    if (a.kind === 'move') {
      yield* doMove(s, ctx, a.piece, stage, found.move!);
      updateHeld(s, ctx); // after every move, an ambush entry or an exit included
    }
  }
  if (stage === 1) {
    yield* attachReserveLeaders(s, ctx);
    returnUnplacedReserves(s);
  }
}

/**
 * `ambush.attachLeader` (308, §18.9): a reserve leader still off the board at the end of the movement, when units of his
 * force entered this turn, must join one of them now (decision `placeLeader`: the hexes of those units without a leader,
 * ascending; asked even when there is one). Without units entered he goes back to the reserve with the rest of the force.
 */
function* attachReserveLeaders(s: GameState, ctx: FlowCtx): Gen {
  if (!s.scenario.ambush?.attachLeader) return;
  for (const op of Object.values(s.turn.ordered)) {
    if (!op.fromReserve || !op.isLeader) continue;
    const l = leaderById(s, op.id);
    if (!l || l.hex !== OFF_BOARD) continue;
    const options = Object.values(s.turn.ordered)
      .filter((o) => o.fromReserve && !o.isLeader)
      .map((o) => unitById(s, o.id))
      .filter((u): u is Unit => !!u && u.hex >= 0 && u.side === l.side && !leaderAt(s, u.hex))
      .map((u) => u.hex)
      .sort((a, b) => a - b);
    if (!options.length) continue;
    const a = yield* ask(s, ctx, { kind: 'placeLeader', side: l.side, leader: l.id, options });
    const hex = (a as { hex: HexId }).hex;
    l.hex = hex;
    op.moveDone = true;
    ctx.emit({ t: 'leaderPlaced', id: l.id, hex });
    ctx.emit({ t: 'attach', leader: l.id, unit: unitAt(s, hex)!.id });
  }
}

// ---------------------------------------------------------------------------
// battle
// ---------------------------------------------------------------------------

export function* battlePhase(s: GameState, ctx: FlowCtx): Gen {
  for (;;) {
    if (s.winner) return;
    if (!Object.keys(s.turn.ordered).some((id) => canBattleNow(s, id))) break;
    const found: Found = {};
    const a = yield* ask(s, ctx, { kind: 'battle', side: s.active }, found);
    if (a.kind === 'endBattle') break;
    // answerError lets through only endBattle, rollingFire and attack, so nothing else reaches here
    if (a.kind === 'rollingFire') {
      yield* rollingFire(s, ctx, unitById(s, a.unit)!, a.path);
    } else if (a.kind === 'attack') {
      const u = unitById(s, a.unit)!;
      const op = s.turn.ordered[a.unit];
      if (found.target!.kind === 'ranged') {
        op.battlesLeft--;
        yield* rangedAttack(s, ctx, u, a.target);
      } else {
        op.battlesLeft = 0;
        op.mustBattle = false;
        const adv: AdvanceTrack = { hex: null };
        yield* closeCombat(s, ctx, u, a.target, 'attack', adv);
        // 'stop' captures (§18.4): a camp counts only where the attacker's last momentum advance ended, and only if the
        // unit still stands there at the end of the sequence (not where it attacked from, nor where a retreat put it)
        if (!s.winner && unitById(s, u.id) && u.hex === adv.hex) captureOnStop(s, ctx, u);
      }
    }
    // held banners after the whole sequence (retreats, advances, bonus combat, Rolling Fire; any battle action)
    updateHeld(s, ctx);
  }
}
