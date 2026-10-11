// Publius Scipio kept out of contact at Castulo over 30 games against the greedy bot (about 110 s, the longest test of
// the suite; the cheap Castulo checks are in regress.test.ts). It has a file of its own so that it runs in parallel with
// the other AI suites, and starts at once (`*.slow.test.ts`, see vite.config.ts).
import { describe, expect, it } from 'vitest';
import { GameDriver, createGame, distance, randomAnswer } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { chooseAnswer, newMemory, personalityFor, type AiOptions } from '../../src/ai';
import { mulberry32 } from '../support/rng';
import { Bot, type Strategy } from './bots';
import { detOpts } from './helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

describe('Castulo: Publius Scipio (losing him loses the battle)', () => {
  it('keeps Scipio out of contact against a greedy attacker over fixed seeds', () => {
    // The contact rate is about 10% and varies a lot from game to game (7-17% over blocks of 10 games), so it is
    // measured over 30 games: a real doubling still fails, an unrelated change in the AI's choices does not.
    const sc = scenarioById('010');
    let turns = 0;
    let adjacent = 0;
    let deaths = 0;
    for (let g = 0; g < 30; g++) {
      const seed = 41000 + 97 * g;
      const d = new GameDriver(createGame(sc.setup, seed));
      const sid = d.state.scenario.sacredLeaderId!;
      const opts: AiOptions = { ...detOpts('bottom', seed * 3 + 1), personality: personalityFor(sc.setup.bottom.commander, sc.setup.bottom.army) };
      const mem = newMemory();
      const rnd = mulberry32(seed);
      const bot = new Bot('greedy' as Strategy, rnd);
      let wasAi = false;
      while (!d.over && d.state.turn.number <= 36) {
        const dec = d.pending!;
        if (dec.kind === 'playCard') {
          if (wasAi) {
            const L = d.state.leaders.find((l) => l.id === sid);
            if (L) {
              turns++;
              if (d.state.units.some((u) => u.side === 'top' && u.hex >= 0 && distance(u.hex, L.hex) <= 1)) adjacent++;
            }
          }
          wasAi = dec.side === 'bottom';
        }
        const a = dec.side === 'bottom' ? chooseAnswer(d.state, dec, opts, mem).answer : bot.answer(d.state, dec);
        if (!d.answer(a)) d.answer(randomAnswer(d.state, d.pending!, rnd));
        for (const { e } of d.drainEvents()) if (e.t === 'leaderKilled' && e.id === sid) deaths++;
      }
    }
    expect(turns).toBeGreaterThan(150);
    expect(adjacent / turns).toBeLessThanOrEqual(0.15);
    expect(deaths).toBeLessThanOrEqual(1);
  }, 240000);
});
