// Simulation harness: run the engine's own turn generator on cloned, determinised states with AI policies.
import { CARD_LIST } from '../engine/cards';
import type { Gen } from '../engine/decisions';
import { continueTurn, turnFlow } from '../engine/flow';
import { randomAnswer } from '../engine/legal';
import { orderDice } from '../engine/orders';
import { other } from '../engine/query';
import { SIDES, type Answer, type Decision, type FlowCtx, type GameState, type HexId, type Side } from '../engine/types';
import type { Rng } from './rand';

export type Policy = (s: GameState, d: Decision) => Answer;

/**
 * Hide information the AI may not know: the opponent's hand and the deck order are re-dealt at random from the
 * unseen cards, and the dice generator is reseeded from the AI's own RNG.
 */
export function determinize(s: GameState, me: Side, rng: Rng): void {
  const opp = other(me);
  // canonical order first: the result depends only on which cards are unseen, never on where they really are
  const pool = [...s.deck, ...s.players[opp].hand].sort((a, b) => a - b);
  rng.shuffle(pool);
  const n = s.players[opp].hand.length;
  s.players[opp].hand = pool.slice(0, n);
  s.deck = pool.slice(n);
  s.rng = rng.u32();
}

/** Fallback leader placement (117): an offered hex with an own unit and no leader yet, else the first offered hex. */
export function safePlacement(s: GameState, d: Extract<Decision, { kind: 'placeLeader' }>): HexId {
  const free = d.options.find((h) => s.units.some((u) => u.hex === h && u.side === d.side) && !s.leaders.some((l) => l.hex === h));
  return free ?? d.options[0];
}

/** A safe answer used when a policy answer was rejected. */
export function safeAnswer(s: GameState, d: Decision, rng: Rng, attempt: number): Answer {
  if (attempt <= 1) {
    switch (d.kind) {
      case 'playCard': return { kind: 'playCard', card: s.players[d.side].hand[0] };
      case 'orders': return { kind: 'orders', pieces: [] };
      case 'move': return { kind: 'endMove' };
      case 'battle': break;
      case 'defend': return { kind: 'defend', choice: 'stand' };
      case 'ignoreFlags': return { kind: 'ignoreFlags', count: d.max };
      case 'retreat':
      case 'leaderEvade': return { kind: 'choose', index: 0 };
      case 'momentum': return { kind: 'yesno', yes: false };
      case 'cavalryExtra': return { kind: 'hex', hex: null };
      case 'bonusCombat': return { kind: 'hex', hex: null };
      case 'chooseCommand': return { kind: 'choose', index: 0 };
      case 'rally':
      case 'spartacus': return { kind: 'assign', ids: d.faces.map(() => null) };
      case 'placeLeader': return { kind: 'hex', hex: safePlacement(s, d) };
      case 'placeUnit': return { kind: 'hex', hex: d.options[0] };
      case 'diceVictim': return { kind: 'choose', index: 0 };
      case 'diceOrders': return { kind: 'assign', ids: d.faces.map(() => null) };
    }
  }
  return randomAnswer(s, d, () => rng.next());
}

/** How a run of the flow ended: `done`, it reached its end; else the decision it stopped at (`at`, or null). */
interface Run {
  done: boolean;
  at: Decision | null;
}

/**
 * Answer the decisions of the flow `flow` starts on `s` with `policy` until it ends. An answer the engine refuses is
 * followed by `safeAnswer`s (more than 30 refusals in a row abort the run); more than `maxSteps` decisions stop the run at
 * the next one, and so does the first decision `stop` matches (left unanswered).
 */
function drive(
  s: GameState, flow: (ctx: FlowCtx) => Gen, policy: Policy, rng: Rng, maxSteps: number, stop?: (d: Decision) => boolean,
): Run {
  let rejected = false;
  const gen = flow({ emit() {}, invalid() { rejected = true; } });
  let r = gen.next();
  let steps = 0;
  let fails = 0;
  while (!r.done) {
    const d = r.value;
    if (stop?.(d) || steps++ > maxSteps) return { done: false, at: d };
    const a = fails === 0 ? policy(s, d) : safeAnswer(s, d, rng, fails);
    rejected = false;
    r = gen.next(a);
    if (!rejected) fails = 0;
    else if (++fails > 30) return { done: false, at: null };
  }
  return { done: true, at: null };
}

/** Play the active side's turn (from its playCard decision) to the end. Returns false if it had to be aborted. */
export function runTurn(s: GameState, policy: Policy, rng: Rng, maxSteps = 600): boolean {
  return drive(s, (ctx) => turnFlow(s, ctx), policy, rng, maxSteps).done;
}

/**
 * Run the active side's turn until `stop` matches a decision (returned; the turn is left unfinished, as it is when the
 * steps run out) or it ends (null).
 */
export function runTurnUntil(s: GameState, policy: Policy, rng: Rng, stop: (d: Decision) => boolean, maxSteps = 400): Decision | null {
  return drive(s, (ctx) => turnFlow(s, ctx), policy, rng, maxSteps, stop).at;
}

/**
 * Play the rest of the active side's turn exactly where it stands (the engine's `continueTurn`: the rest of the movement,
 * from `from` 'move', then the battle and the turn end), with the turn's orders and modifiers as they are. Returns false if
 * it had to be aborted.
 */
export function continueRun(s: GameState, policy: Policy, rng: Rng, from: 'move' | 'battle'): boolean {
  return drive(s, (ctx) => continueTurn(s, ctx, from), policy, rng, 600).done;
}

const FIRST_STRIKE_ID = CARD_LIST.indexOf('firstStrike');

/**
 * Must a resumed turn continue exactly where it stands (`continueTurn`)? Restarting it (below) runs the turn-start
 * objectives again, which would capture a hex a unit has only just reached (turn-start captures, §18.4), judges the
 * first battle step under First Strike, a Tactic card, which hides Rolling Fire (§18.5), and would roll a dice-ordered
 * side's order dice again (it plays no card, §18.10). Battles without any of these keep the restart, so their searches are
 * unchanged.
 */
function exactResume(s: GameState): boolean {
  if (s.scenario.rollingFire || orderDice(s, s.active)) return true;
  return s.scenario.objectives.some((o) => o.kind === 'capture' && o.when === 'turnStart');
}

/**
 * Continue a turn that is in its movement or battle phase. Generators cannot be cloned, so the turn is restarted on
 * the cloned state with a no-op card (First Strike, which orders nothing) and the real card's modifiers are restored
 * before the first decision is answered; in battles with turn-start captures or Rolling Fire, and on the turn of a side
 * with dice orders (310), the engine's `continueTurn` resumes it where it stands instead (`exactResume`). `from =
 * 'battle'` skips any remaining movement.
 */
export function resumeTurn(s: GameState, policy: Policy, rng: Rng, from: 'move' | 'battle'): boolean {
  if (exactResume(s)) return continueRun(s, policy, rng, from);
  const side = s.active;
  const t = s.turn;
  const saved = { mods: { ...t.mods }, card: t.card, effective: t.effective };
  for (const sd of SIDES) {
    const h = s.players[sd].hand;
    const i = h.indexOf(FIRST_STRIKE_ID);
    if (i >= 0) h.splice(i, 1);
  }
  let i = s.deck.indexOf(FIRST_STRIKE_ID);
  if (i >= 0) s.deck.splice(i, 1);
  i = s.discard.indexOf(FIRST_STRIKE_ID);
  if (i >= 0) s.discard.splice(i, 1);
  s.players[side].hand.push(FIRST_STRIKE_ID);
  let played = false;
  let patched = false;
  const wrapped: Policy = (st, d) => {
    if (!played && d.kind === 'playCard') {
      played = true;
      return { kind: 'playCard', card: FIRST_STRIKE_ID };
    }
    if (!patched) {
      patched = true;
      st.turn.mods = { ...saved.mods };
      st.turn.card = saved.card;
      st.turn.effective = saved.effective;
    }
    if (from === 'battle' && d.kind === 'move' && d.stage === 1) return { kind: 'endMove' };
    return policy(st, d);
  };
  return runTurn(s, wrapped, rng);
}
