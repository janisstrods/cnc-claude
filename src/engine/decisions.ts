// Decisions: the flow is a generator (`Gen`) that yields a Decision and receives an Answer. `ask` yields one until a
// legal answer comes back; `answerError` is the one validator of every answer, dispatching to the validators of
// options.ts and orders.ts. Every module of the flow asks through here.
import { ambushAvailable, ambushSectionAllowed, validateBattle, validateMove, type Found } from './options';
import { validateDiceOrders, validateOrders, validateRally, validateSpartacus } from './orders';
import type { Answer, Decision, FlowCtx, GameState } from './types';

export type Gen<T = void> = Generator<Decision, T, Answer>;

/**
 * Yield decision `d` until a legal answer comes back (`answerError`); each refusal is reported to `ctx.invalid`. `found`
 * receives the option the accepted answer picked (see `Found`).
 */
export function* ask(s: GameState, ctx: FlowCtx, d: Decision, found?: Found): Gen<Answer> {
  for (;;) {
    const a = yield d;
    const err = answerError(s, d, a, found);
    if (!err) return a;
    ctx.invalid?.(err);
  }
}

/** Is `a` a choice of one of `n` options (`choose` with a whole index in range)? */
const choosesOneOf = (a: Answer, n: number): boolean => a.kind === 'choose' && Number.isInteger(a.index) && a.index >= 0 && a.index < n;

/**
 * Why answer `a` to decision `d` is refused in state `s` (the message the UI shows), or null when it is legal: the one
 * validator of every decision. `ask` re-asks with it, and the AI's `isLegal` is `answerError(...) === null`, so an answer
 * the AI gives is never refused. It reads only the decision and the state, so an answer can be checked before it is given.
 * `found` (the flow's own `ask`) receives the move or battle target a legal answer picked.
 */
export function answerError(s: GameState, d: Decision, a: Answer | null | undefined, found?: Found): string | null {
  if (!a) return 'No answer.';
  switch (d.kind) {
    case 'playCard':
      return a.kind === 'playCard' && s.players[d.side].hand.includes(a.card) ? null : 'Play a card from your hand.';
    case 'orders':
      if (a.kind !== 'orders') return 'Choose the units to order.';
      if (a.ambushSection) {
        return ambushAvailable(s, d.side, d.card) && ambushSectionAllowed(s, d.card, a.ambushSection) ? null : 'The ambush is not available.';
      }
      return validateOrders(s, d.side, d.card, a.pieces);
    case 'move':
      return validateMove(s, a, d.stage, found);
    case 'battle':
      return validateBattle(s, a, found);
    case 'defend':
      if (a.kind !== 'defend') return 'Choose how to defend.';
      if (a.choice === 'evade') return d.canEvade ? null : 'This unit cannot evade.';
      if (a.choice === 'firstStrike') return d.canFirstStrike ? null : 'You do not hold First Strike.';
      return a.choice === 'stand' ? null : 'Choose how to defend.';
    case 'ignoreFlags':
      return a.kind === 'ignoreFlags' && Number.isInteger(a.count) && a.count >= 0 && a.count <= d.max ? null : `Ignore between 0 and ${d.max} flags.`;
    case 'retreat':
      return choosesOneOf(a, d.options.length) ? null : 'Choose a destination.';
    case 'leaderEvade':
      return choosesOneOf(a, d.options.length) ? null : 'Choose an evade destination.';
    case 'momentum':
      return a.kind === 'yesno' ? null : 'Advance or not?';
    case 'cavalryExtra':
      return a.kind === 'hex' && (a.hex === null || d.options.includes(a.hex)) ? null : 'Choose a hex or decline.';
    case 'bonusCombat':
      return a.kind === 'hex' && (a.hex === null || d.targets.includes(a.hex)) ? null : 'Choose a target or decline.';
    case 'chooseCommand':
      return choosesOneOf(a, d.options.length) ? null : 'Choose a command.';
    case 'rally':
      return a.kind === 'assign' ? validateRally(s, d.side, d.faces, a.ids, d.command) : 'Assign the rally dice.';
    case 'spartacus':
      return a.kind === 'assign' ? validateSpartacus(s, d.side, d.faces, a.ids, d.command) : 'Choose the pieces to order.';
    case 'placeLeader':
      if (a.kind === 'hex' && a.hex !== null && d.options.includes(a.hex)) return null;
      // before the battle (117 Asculum) any highlighted hex; a reserve leader at the end of the movement (308) joins a unit
      return s.special.unplaced.includes(d.leader) ? 'Place the leader on a highlighted hex.' : 'Place the leader with one of the units that entered.';
    case 'placeUnit':
      return a.kind === 'hex' && a.hex !== null && d.options.includes(a.hex) ? null : 'Place the unit on a highlighted hex.';
    case 'diceVictim':
      return choosesOneOf(a, d.options.length) ? null : 'Choose one of your units.';
    case 'diceOrders':
      return a.kind === 'assign' ? validateDiceOrders(s, d.side, d.faces, a.ids) : 'Assign the order dice.';
  }
}
