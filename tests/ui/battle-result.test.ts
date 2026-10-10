// The end-of-battle dialog's body: result, a banner scoreboard for both armies, the both-sides match after a second
// battle with switched sides, and the play-again / menu buttons.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame, type GameState, type Side } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { BattleResult } from '../../src/ui/game/BattleResult';
import type { LegResult } from '../../src/ui/game/controller';

/** 001 Akragas (top Carthaginian, bottom Syracusan) after the battle, with the given banner counts. */
function finished(top: number, bottom: number, turn = 19): GameState {
  const s = createGame(scenarioById('001').setup, 1);
  s.players.top.banners = top;
  s.players.bottom.banners = bottom;
  s.turn.number = turn;
  return s;
}

function render(state: GameState, human: Side, winner: Side | 'draw', rematch = true, firstLeg?: LegResult): string {
  return renderToStaticMarkup(createElement(BattleResult, {
    state, human, over: { winner, reason: 'Carthaginian captured 5 banners' }, onExit: () => {},
    onRematch: rematch ? () => {} : undefined, firstLeg,
  }));
}

const count = (html: string, needle: string) => html.split(needle).length - 1;
/** The text of the both-sides summary, tags stripped. */
const matchText = (html: string) => (html.match(/<section class="match"[\s\S]*?<\/section>/)?.[0] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

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

  it('play-again buttons say which army you will command; without them only the menu button remains', () => {
    const html = render(finished(5, 3), 'bottom', 'top');
    expect(html).toMatch(/Play again<small class="victory-as">as Syracusan<\/small>/);
    expect(html).toMatch(/Switch sides<small class="victory-as">as Carthaginian<\/small>/);
    expect(html).not.toContain('Rematch');
    expect(html).toContain('Return to menu');
    const solo = render(finished(5, 3), 'bottom', 'top', false);
    expect(solo).not.toContain('Play again');
    expect(solo).toContain('Return to menu');
  });

  it('a single battle has no both-sides summary', () => {
    expect(render(finished(5, 3), 'bottom', 'top')).not.toContain('class="match"');
  });

  it('after the second battle with switched sides, sums up both battles from your side', () => {
    // 1st: as Carthaginian, won 5–3. 2nd (now): as Syracusan, lost 2–5. Totals: you 7, the computer 8.
    const first: LegResult = { humanSide: 'top', banners: { top: 5, bottom: 3 }, winner: 'top' };
    const html = render(finished(5, 2), 'bottom', 'top', true, first);
    const text = matchText(html);
    expect(text).toContain('Both sides');
    expect(text).toMatch(/1st battle as Carthaginian Victory 5 3/);
    expect(text).toMatch(/2nd battle as Syracusan Defeat 2 5/);
    expect(text).toMatch(/Total 7 8/);
    expect(text).toContain('The computer takes the match, 8 banners to 7.');
    expect(html.indexOf('class="match"')).toBeLessThan(html.indexOf('victory-actions'));
  });

  it('the match verdict: you take it, or it is drawn', () => {
    const first: LegResult = { humanSide: 'top', banners: { top: 5, bottom: 1 }, winner: 'top' };
    expect(matchText(render(finished(5, 4), 'bottom', 'top', true, first))).toContain('You take the match, 9 banners to 6.');
    const even: LegResult = { humanSide: 'top', banners: { top: 4, bottom: 5 }, winner: 'bottom' };
    const drawn = matchText(render(finished(4, 5), 'bottom', 'bottom', true, even));
    expect(drawn).toMatch(/1st battle as Carthaginian Defeat 4 5/);
    expect(drawn).toMatch(/2nd battle as Syracusan Victory 5 4/);
    expect(drawn).toContain('The match is drawn, 9 banners each.');
  });
});
