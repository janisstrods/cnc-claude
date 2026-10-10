// Simulation harness: run the engine's own turn generator on cloned, determinised states with AI policies.
import { CARD_LIST } from '../engine/cards';
import { turnFlow, type Gen } from '../engine/flow';
import { randomAnswer } from '../engine/legal';
import { other } from '../engine/query';
import type { Answer, Decision, FlowCtx, GameState, HexId, Side } from '../engine/types';
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
      case 'rally':
      case 'spartacus': return { kind: 'assign', ids: d.faces.map(() => null) };
      case 'placeLeader': return { kind: 'hex', hex: safePlacement(s, d) };
    }
  }
  return randomAnswer(s, d, () => rng.next());
}

interface Runner {
  rejected: boolean;
}

function drive(s: GameState, gen: Gen, policy: Policy, rng: Rng, st: Runner, maxSteps: number): boolean {
  let r = gen.next();
  let steps = 0;
  let fails = 0;
  while (!r.done) {
    if (steps++ > maxSteps) return false;
    const d = r.value;
    const a = fails === 0 ? policy(s, d) : safeAnswer(s, d, rng, fails);
    st.rejected = false;
    r = gen.next(a);
    if (st.rejected) {
      fails++;
      if (fails > 30) return false;
    } else fails = 0;
  }
  return true;
}

/** Play the active side's turn (from its playCard decision) to the end. Returns false if it had to be aborted. */
export function runTurn(s: GameState, policy: Policy, rng: Rng, maxSteps = 600): boolean {
  const st: Runner = { rejected: false };
  const ctx: FlowCtx = { emit() {}, invalid() { st.rejected = true; } };
  return drive(s, turnFlow(s, ctx), policy, rng, st, maxSteps);
}

/** Run the active side's turn until `stop` matches a decision (returned; the turn is left unfinished) or it ends (null). */
export function runTurnUntil(s: GameState, policy: Policy, rng: Rng, stop: (d: Decision) => boolean, maxSteps = 400): Decision | null {
  const st: Runner = { rejected: false };
  const ctx: FlowCtx = { emit() {}, invalid() { st.rejected = true; } };
  const gen = turnFlow(s, ctx);
  let r = gen.next();
  let steps = 0;
  let fails = 0;
  while (!r.done) {
    const d = r.value;
    if (stop(d)) return d;
    if (steps++ > maxSteps) return d;
    const a = fails === 0 ? policy(s, d) : safeAnswer(s, d, rng, fails);
    st.rejected = false;
    r = gen.next(a);
    if (st.rejected) {
      fails++;
      if (fails > 30) return null;
    } else fails = 0;
  }
  return null;
}

const FIRST_STRIKE_ID = CARD_LIST.indexOf('firstStrike');

/**
 * Continue a turn that is in its movement or battle phase. Generators cannot be cloned, so the turn is restarted on
 * the cloned state with a no-op card (First Strike, which orders nothing) and the real card's modifiers are restored
 * before the first decision is answered. `from = 'battle'` skips any remaining movement.
 */
export function resumeTurn(s: GameState, policy: Policy, rng: Rng, from: 'move' | 'battle'): boolean {
  const side = s.active;
  const t = s.turn;
  const saved = { mods: { ...t.mods }, card: t.card, effective: t.effective, mirrored: t.mirrored };
  for (const sd of ['top', 'bottom'] as Side[]) {
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
      st.turn.mirrored = saved.mirrored;
    }
    if (from === 'battle' && d.kind === 'move' && d.stage === 1) return { kind: 'endMove' };
    return policy(st, d);
  };
  return runTurn(s, wrapped, rng);
}
