// The end-of-battle dialog's body: result, a banner scoreboard for both armies and the rematch / menu buttons.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame, type GameState, type Side } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { BattleResult } from '../../src/ui/game/BattleResult';

/** 001 Akragas (top Carthaginian, bottom Syracusan) after the battle, with the given banner counts. */
function finished(top: number, bottom: number, turn = 19): GameState {
  const s = createGame(scenarioById('001').setup, 1);
  s.players.top.banners = top;
  s.players.bottom.banners = bottom;
  s.turn.number = turn;
  return s;
}

function render(state: GameState, human: Side, winner: Side | 'draw', rematch = true): string {
  return renderToStaticMarkup(createElement(BattleResult, {
    state, human, over: { winner, reason: 'Carthaginian captured 5 banners' }, onExit: () => {},
    onRematch: rematch ? () => {} : undefined,
  }));
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe('BattleResult', () => {
  it('shows the result, a row per army (yours first, the winner marked) and the turns played', () => {
    const s = finished(5, 3);
    const html = render(s, 'bottom', 'top');
    expect(html).toContain('Carthaginian captured 5 banners.');
    expect(html.indexOf('Syracusan')).toBeLessThan(html.indexOf('Carthaginian</span>'));
    expect(count(html, 'victory-row is-winner')).toBe(1);
    expect(html).toMatch(/victory-row is-winner[^>]*aria-label="Carthaginian: 5 of 5 banners"/);
    expect(html).toContain('aria-label="Syracusan: 3 of 5 banners"');
    expect(html).toContain('19 turns played');
  });

  it('draws captured banners and the empty slots still to win', () => {
    const html = render(finished(5, 3), 'bottom', 'top');
    expect(count(html, 'victory-banner is-won')).toBe(8);
    expect(count(html, 'victory-banner is-empty')).toBe(2);
  });

  it('a draw marks no winner; one turn is singular', () => {
    const html = render(finished(4, 4, 1), 'top', 'draw');
    expect(html).not.toContain('is-winner');
    expect(html).toContain('1 turn played');
  });

  it('rematch buttons say which army you will command; without rematch only the menu button remains', () => {
    const html = render(finished(5, 3), 'bottom', 'top');
    expect(html).toMatch(/Rematch<small class="victory-as">as Syracusan<\/small>/);
    expect(html).toMatch(/Switch sides<small class="victory-as">as Carthaginian<\/small>/);
    expect(html).toContain('Return to menu');
    const solo = render(finished(5, 3), 'bottom', 'top', false);
    expect(solo).not.toContain('Rematch');
    expect(solo).toContain('Return to menu');
  });
});
