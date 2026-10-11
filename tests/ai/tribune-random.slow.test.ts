// Tribune against a uniformly random player over 20 games (about 35 s). It has a file of its own so that it runs in
// parallel with the other AI suites, and starts at once (`*.slow.test.ts`, see vite.config.ts).
import { describe, expect, it } from 'vitest';
import { GameDriver, createGame, randomAnswer, type Side } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { chooseAnswer, newMemory, personalityFor, type AiOptions } from '../../src/ai';
import { mulberry32 } from '../support/rng';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

describe('tribune beats a random player', () => {
  it('wins at least 90% of 20 games across scenarios and sides', () => {
    const ids = ['001', '002', '003', '004', '005', '006', '007', '008', '010', '013'];
    let wins = 0;
    let games = 0;
    for (const id of ids) {
      const sc = scenarioById(id);
      for (const aiSide of ['bottom', 'top'] as Side[]) {
        const seed = 500 + Number(id) * 2 + (aiSide === 'top' ? 1 : 0);
        const d = new GameDriver(createGame(sc.setup, seed));
        const opts: AiOptions = { side: aiSide, difficulty: 'tribune', personality: personalityFor(sc.setup[aiSide].commander, sc.setup[aiSide].army), seed, budgetScale: 0.12 };
        const mem = newMemory();
        const rnd = mulberry32(seed);
        let steps = 0;
        while (!d.over && steps++ < 20000) {
          const dec = d.pending!;
          const a = dec.side === aiSide ? chooseAnswer(d.state, dec, opts, mem).answer : randomAnswer(d.state, dec, rnd);
          if (!d.answer(a)) {
            expect(dec.side, `AI answer rejected: ${d.lastError}`).not.toBe(aiSide);
            d.answer(randomAnswer(d.state, d.pending!, rnd));
          }
        }
        games++;
        if (d.state.winner === aiSide) wins++;
      }
    }
    expect(games).toBe(20);
    expect(wins).toBeGreaterThanOrEqual(18);
  });
});
