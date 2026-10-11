// Undo card: the human takes back the card played, with its orders and the lines it logged, until a unit moves; the moves
// are taken back first, one by one. The prompt's undo button says which step it takes back.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CARD_DEFS, CARD_LIST, eligiblePieces, other, pieceMoves, type GameState } from '../../src/engine';
import { GameController, newSessionConfig } from '../../src/ui/game/controller';
import { gamePrompt } from '../../src/ui/game/prompts';
import type { UiSel } from '../../src/ui/game/uiModel';
import { SeededOpponent, runToHuman, useFakeClock } from './controller-helpers';

const SEL: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null };

/** The labels of the prompt bar's buttons for the controller's current view. */
function buttons(c: GameController): string[] {
  const human = c.config.humanSide;
  const noop = () => {};
  const p = gamePrompt({
    controller: c, view: c.view, s: c.view.display, human, ai: other(human), deploying: null, ambushLeader: undefined,
    ui: SEL, setUi: noop, setCmdFocus: noop, answer: noop, onExit: noop,
  });
  return (p?.buttons ?? []).map((b) => renderToStaticMarkup(b).replace(/<[^>]+>/g, ''));
}

/** A section card in the human's hand that orders at least two of its units. */
function sectionCard(s: GameState, human: 'top' | 'bottom'): number {
  const card = s.players[human].hand.find((x) => /^order[234][LCR]$/.test(CARD_LIST[x]) && eligiblePieces(s, human, CARD_LIST[x]).length >= 2);
  if (card === undefined) throw new Error('no section card with two units in hand');
  return card;
}

describe('Undo card', () => {
  useFakeClock();

  it('takes the card back while its units are chosen, and after they are ordered until one moves; its log line goes with it', async () => {
    const c = new GameController({ ...newSessionConfig('001', 'bottom', 'recruit'), seed: 3 }, new SeededOpponent());
    try {
      await runToHuman(c);
      expect(c.view.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
      expect(c.view.undo).toBeNull();
      expect(buttons(c)).not.toContain('Undo card');
      const s = c.driver.state;
      const card = sectionCard(s, 'bottom');
      const played = `${s.players.bottom.commander} plays ${CARD_DEFS[CARD_LIST[card]].title}.`;
      const handBefore = [...s.players.bottom.hand];

      c.answer({ kind: 'playCard', card });
      await runToHuman(c);
      expect(c.view.pending).toMatchObject({ kind: 'orders', side: 'bottom' });
      expect(c.view.undo).toBe('card');
      expect(buttons(c)).toContain('Undo card');
      expect(c.view.log.map((l) => l.text)).toContain(played);

      c.undo();
      expect(c.view.pending).toEqual({ kind: 'playCard', side: 'bottom' });
      expect(c.view.display.players.bottom.hand).toEqual(handBefore);
      expect(c.view.log.map((l) => l.text)).not.toContain(played);
      expect(c.view.undo).toBeNull();
      expect(c.driver.answers.length).toBe(0);

      // played again and two units ordered: still the card, until one of them moves
      c.answer({ kind: 'playCard', card });
      await runToHuman(c);
      const [a, b] = eligiblePieces(c.driver.state, 'bottom', CARD_LIST[card]);
      c.answer({ kind: 'orders', pieces: [a, b] });
      await runToHuman(c);
      expect(c.view.pending).toMatchObject({ kind: 'move', side: 'bottom' });
      expect(c.view.undo).toBe('card');
      expect(buttons(c)).toContain('Undo card');
      const to = pieceMoves(c.driver.state, a, 1).find((m) => m.hex >= 0)!.hex;
      c.answer({ kind: 'move', piece: a, to });
      await runToHuman(c);
      expect(c.view.pending).toMatchObject({ kind: 'move', side: 'bottom' });
      expect(c.view.undo).toBe('move');
      expect(buttons(c)).toContain('Undo move');
      expect(buttons(c)).not.toContain('Undo card');

      // the move first, then the card with its orders
      c.undo();
      expect(c.view.undo).toBe('card');
      c.undo();
      expect(c.view.pending).toEqual({ kind: 'playCard', side: 'bottom' });
      expect(c.view.display.turn.ordered).toEqual({});
      expect(c.view.log.map((l) => l.text)).not.toContain(played);
    } finally {
      c.dispose();
    }
  });
});
