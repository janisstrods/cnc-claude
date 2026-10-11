// Helpers of the engine suite: the rules suite's QA battles (tests/rules/helpers.ts) under the name 'test', and the
// engine suite's own way of editing hands.
import { CARD_LIST, GameDriver, SIDES, type CardKind, type GameState, type ScenarioSetup, type Side } from '../../src/engine';
import { build, setupOf as qaSetupOf, type Pos } from '../rules/helpers';

export { H, must, type Pos } from '../rules/helpers';

/** The engine suite's battle is called 'test': validation errors end with "(test)". */
const TEST: Pos = { id: 'test', name: 'Test' };

export const setupOf = (p: Pos): ScenarioSetup => qaSetupOf({ ...TEST, ...p });

/** Build a state (seed 12345); a unit's `blocks` overrides its strength. Units get ids u1.. in order, leaders follow. */
export const state = (p: Pos): GameState => build({ ...TEST, ...p }, 12345);

export function drive(s: GameState): GameDriver {
  return new GameDriver(s);
}

/**
 * Put a copy of `kind` that no hand holds over the first card of `side`'s hand and return its id. Unlike the rules suite's
 * `giveCard`, the card replaced leaves the game (it does not go back on the deck).
 */
export function replaceFirstCard(s: GameState, side: Side, kind: CardKind): number {
  const id = CARD_LIST.findIndex((k, i) => k === kind && !s.players.top.hand.includes(i) && !s.players.bottom.hand.includes(i));
  const fromDeck = s.deck.indexOf(id);
  if (fromDeck >= 0) s.deck.splice(fromDeck, 1);
  s.players[side].hand[0] = id;
  return id;
}

/**
 * Make sure nobody holds First Strike: each copy in a hand is replaced by the first other deck card. Unlike the rules
 * suite's `noFirstStrike`, the First Strike cards leave the game (they do not go back on the deck).
 */
export function dropFirstStrike(s: GameState) {
  for (const side of SIDES) {
    const hand = s.players[side].hand;
    for (let i = 0; i < hand.length; i++) {
      if (CARD_LIST[hand[i]] === 'firstStrike') {
        const repl = s.deck.findIndex((c) => CARD_LIST[c] !== 'firstStrike');
        hand[i] = s.deck.splice(repl, 1)[0];
      }
    }
  }
}
