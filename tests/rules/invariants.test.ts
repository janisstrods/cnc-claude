// Random-play soak that checks rule invariants after EVERY answer (not just at the end).
import { describe, expect, it } from 'vitest';
import { GameDriver, createGame, forceDice, isImpassable, randomAnswer, type GameState } from '../../src/engine';
import { SCENARIOS } from '../../src/scenarios';
import { mulberry32 } from '../support/rng';

/** Returns a list of violated invariants (empty = fine). */
export function violations(s: GameState, atPlayCard: boolean): string[] {
  const out: string[] = [];
  const onBoard = s.units.filter((u) => u.hex >= 0);
  const uh = onBoard.map((u) => u.hex);
  if (new Set(uh).size !== uh.length) out.push('two units in one hex');
  const lh = s.leaders.filter((l) => l.hex >= 0).map((l) => l.hex);
  if (new Set(lh).size !== lh.length) out.push('two leaders in one hex');
  for (const u of onBoard) {
    if (u.blocks < 1 || u.blocks > u.maxBlocks) out.push(`unit ${u.id} has ${u.blocks}/${u.maxBlocks} blocks`);
    if (isImpassable(s, u.hex)) out.push(`unit ${u.id} on impassable hex ${u.hex}`);
  }
  for (const l of s.leaders) {
    if (l.hex < 0) continue;
    if (isImpassable(s, l.hex)) out.push(`leader ${l.id} on impassable hex`);
    const v = s.units.find((u) => u.hex === l.hex);
    if (v && v.side !== l.side) out.push(`leader ${l.id} on an enemy unit`);
  }
  if (atPlayCard) {
    const cards = s.deck.length + s.discard.length + s.players.top.hand.length + s.players.bottom.hand.length;
    if (cards !== 60) out.push(`card count ${cards}`);
    const p = s.players[s.active];
    if (p.hand.length !== p.command) out.push(`${s.active} holds ${p.hand.length} cards with Command ${p.command}`);
  }
  return out;
}

describe('rule invariants hold after every decision in random play', () => {
  for (const sc of SCENARIOS) {
    it(`${sc.id} ${sc.name}`, () => {
      forceDice([]);
      for (let g = 0; g < 3; g++) {
        const seed = 7919 * Number(sc.id) + g;
        const d = new GameDriver(createGame(sc.setup, seed));
        const rnd = mulberry32(seed);
        let steps = 0;
        while (!d.over && steps < 20000) {
          const a = randomAnswer(d.state, d.pending!, rnd);
          d.answer(a);
          const v = violations(d.state, d.pending?.kind === 'playCard');
          if (v.length) throw new Error(`${sc.id} game ${g} step ${steps} (turn ${d.state.turn.number}) after ${JSON.stringify(a)}: ${v.join('; ')}`);
          steps++;
        }
        expect(d.state.winner).not.toBeNull();
      }
    });
  }
});
