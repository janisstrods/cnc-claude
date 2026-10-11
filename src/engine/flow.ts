// Turn flow as a generator: yields Decisions, receives Answers (rules-reference §5-§13). This module holds the turn
// (forced placements, the card or the dice orders, the phases in order, the turn end and its draws), the leader
// placement before the battle (117) and the game loop. The flow's modules, each importing only those before it:
// options.ts (the turn's options, pure), decisions.ts (`ask`, `answerError`), casualties.ts, attacks.ts, phases.ts
// (orders, movement, battle), flow.ts.
import { updateHeld } from './banners';
import { drawCard } from './cards';
import { ask, type Gen } from './decisions';
import { ALL_HEXES } from './hex';
import { turnEndObjectives, turnStartObjectives } from './objectives';
import { orderDice } from './orders';
import { battlePhase, cardStep, diceOrdersStep, movePhase } from './phases';
import { isEmptyHex, leaderAt, leaderById, other, unitAt } from './query';
import { shuffle } from './rng';
import { newTurn } from './setup';
import { isImpassable } from './terrain';
import type { FlowCtx, GameState, HexId, Side } from './types';

// ---------------------------------------------------------------------------
// turn
// ---------------------------------------------------------------------------

function endOfTurn(s: GameState, ctx: FlowCtx) {
  const side = s.active;
  const t = s.turn;
  if (t.card !== null) s.discard.push(t.card);
  if (t.reshuffleAfter) {
    s.deck.push(...s.discard);
    s.discard = [];
    shuffle(s, s.deck);
    ctx.emit({ t: 'reshuffle' });
  }
  // a side with dice orders (310, §18.10) never draws: no First Strike replacement (it holds none), no turn-end draw
  if (t.firstStrikeBy && t.firstStrikeBy !== side && !orderDice(s, t.firstStrikeBy)) drawCard(s, ctx, t.firstStrikeBy);
  let draws = orderDice(s, side) ? 0 : 1;
  // hand growth (006 Trasimenus, 313 Brindisi Raid, §18.8): while its Command is below the target the side draws 2 and grows by 1
  const growth = s.scenario.handGrowth;
  if (draws && growth && growth.side === side && s.players[side].command < growth.to) {
    draws = 2;
    s.players[side].command += 1;
    ctx.emit({ t: 'command', side, command: s.players[side].command });
  }
  for (let i = 0; i < draws; i++) drawCard(s, ctx, side);
  s.lastCard[side] = t.effective === 'firstStrike' ? null : t.effective;
  s.special.turnsDone[side]++;
}

export function* turnFlow(s: GameState, ctx: FlowCtx): Gen {
  const side = s.active;
  const t = s.turn;
  ctx.emit({ t: 'turnStart', side, turn: t.number });
  t.phase = 'card';
  // objectives decided at the start of the turn, before the card (turn-start captures, §18.4)
  turnStartObjectives(s, ctx, side);
  if (s.winner) return;
  // then the forced placements that are due (308, §18.9)
  yield* forcedPlacements(s, ctx, side);
  if (s.winner) return;
  if (orderDice(s, side)) {
    // dice orders (310, §18.10): the order roll instead of a card
    t.phase = 'orders';
    yield* diceOrdersStep(s, ctx, side);
    if (s.winner) return;
  } else {
    yield* cardStep(s, ctx, side);
    if (s.winner) return;
  }
  if (!t.mods.noMove && Object.keys(t.ordered).length) {
    t.phase = 'move';
    yield* movePhase(s, ctx, 1);
    if (s.winner) return;
  }
  yield* battleToEnd(s, ctx);
}

/** The rest of the active side's turn from its battle phase: the battle, Move-Fire-Move's second move, the turn end. */
function* battleToEnd(s: GameState, ctx: FlowCtx): Gen {
  const side = s.active;
  const t = s.turn;
  t.phase = 'battle';
  yield* battlePhase(s, ctx);
  if (s.winner) return;
  if (t.mods.moveFireMove && Object.keys(t.ordered).length) {
    t.phase = 'move2';
    yield* movePhase(s, ctx, 2);
    if (s.winner) return;
  }
  t.phase = 'draw';
  // objectives decided at the end of the turn, before the draw (majority, section clear, §18.4)
  turnEndObjectives(s, ctx, side);
  if (s.winner) return;
  endOfTurn(s, ctx);
  t.phase = 'done';
}

/**
 * Continue the active side's turn, already in its movement (`from` 'move') or battle phase (`from` 'battle'), exactly as
 * `turnFlow` would go on: the rest of the movement, the battle, the turn end. For searches on a copied state (a running
 * generator cannot be copied); the turn's card, orders and modifiers are taken as they stand.
 */
export function* continueTurn(s: GameState, ctx: FlowCtx, from: 'move' | 'battle'): Gen {
  const t = s.turn;
  if (from === 'move' && !t.mods.noMove && Object.keys(t.ordered).length) {
    t.phase = 'move';
    yield* movePhase(s, ctx, 1);
    if (s.winner) return;
  }
  yield* battleToEnd(s, ctx);
}

/**
 * Forced placements (308, §18.9) at the start of `side`'s turn, before its card: each unit of `special.placeUnits` of
 * that side whose condition is met (`after: 'ambush'`: a unit of the ambush force has entered) is placed on one of its
 * listed hexes holding no unit and no leader (decision `placeUnit`, asked even when one hex is free). With every hex
 * taken it waits for a later turn start. The placed unit is an ordinary unit from then on: the turn's card may order it.
 */
function* forcedPlacements(s: GameState, ctx: FlowCtx, side: Side): Gen {
  const sp = s.special;
  for (let i = 0; i < sp.placeUnits.length;) {
    const p = sp.placeUnits[i];
    const due = p.unit.side === side && p.after === 'ambush' && sp.reserveEntered;
    const options = due ? p.hexes.filter((h) => isEmptyHex(s, h)) : [];
    if (!options.length) {
      i++;
      continue;
    }
    const a = yield* ask(s, ctx, { kind: 'placeUnit', side, unit: p.unit.id, options });
    const hex = (a as { hex: HexId }).hex;
    sp.placeUnits.splice(i, 1);
    const u = p.unit;
    u.hex = hex;
    s.units.push(u);
    ctx.emit({ t: 'unitPlaced', id: u.id, hex });
    updateHeld(s, ctx); // the unit may stand on an objective hex
    if (s.winner) return;
  }
}

/** Advance to the next player's turn (call after turnFlow completes without a winner). */
export function nextTurn(s: GameState) {
  s.active = other(s.active);
  s.turn = newTurn(s.turn.number + 1);
}

// ---------------------------------------------------------------------------
// pre-battle leader placement (117 Asculum, §17.4)
// ---------------------------------------------------------------------------

/**
 * Hexes where a leader of `side` may be placed before the battle (117, `ScenarioSetup.placeLeaders`), ascending: an own
 * unit without a leader (he attaches), or an empty passable hex (no unit, no leader; he stands alone). Leaders placed
 * already occupy their hexes.
 */
export function placementOptions(s: GameState, side: Side): HexId[] {
  const out: HexId[] = [];
  for (const h of ALL_HEXES) {
    if (leaderAt(s, h)) continue;
    const u = unitAt(s, h);
    if (u ? u.side === side : !isImpassable(s, h)) out.push(h);
  }
  return out;
}

/** Ask for every leader in `special.unplaced`, in order (the Roman leaders first in 117); placement is not movement. */
function* placementPhase(s: GameState, ctx: FlowCtx): Gen {
  const sp = s.special;
  while (sp.unplaced.length) {
    const l = leaderById(s, sp.unplaced[0]);
    if (!l) throw new Error(`unknown leader to place: ${sp.unplaced[0]}`);
    const options = placementOptions(s, l.side);
    if (!options.length) throw new Error(`no hex to place ${l.name || l.id}`);
    const a = yield* ask(s, ctx, { kind: 'placeLeader', side: l.side, leader: l.id, options });
    const hex = (a as { hex: HexId }).hex;
    l.hex = hex;
    sp.unplaced.shift();
    ctx.emit({ t: 'leaderPlaced', id: l.id, hex });
    const u = unitAt(s, hex);
    if (u && u.side === l.side) ctx.emit({ t: 'attach', leader: l.id, unit: u.id });
  }
}

export function* gameFlow(s: GameState, ctx: FlowCtx): Gen {
  yield* placementPhase(s, ctx);
  while (!s.winner) {
    if (s.turn.phase === 'done') nextTurn(s);
    yield* turnFlow(s, ctx);
  }
}
