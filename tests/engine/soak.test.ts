import { describe, it, expect } from 'vitest';
import { GameDriver, createGame, randomAnswer } from '../../src/engine';
import { SCENARIOS } from '../../src/scenarios';

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('random-play soak', () => {
  for (const sc of SCENARIOS) {
    it(`plays ${sc.id} ${sc.name} to completion with random legal moves`, () => {
      for (let g = 0; g < 4; g++) {
        const seed = 1000 * Number(sc.id) + g;
        const d = new GameDriver(createGame(sc.setup, seed));
        const rnd = mulberry(seed);
        let steps = 0;
        let rejects = 0;
        while (!d.over && steps < 20000) {
          const a = randomAnswer(d.state, d.pending!, rnd);
          if (!d.answer(a)) {
            rejects++;
            if (rejects > 50) throw new Error(`too many rejects: ${d.lastError} for ${JSON.stringify(d.pending)} answer ${JSON.stringify(a)}`);
          }
          steps++;
        }
        expect(d.state.winner, `game ${g} should finish (turn ${d.state.turn.number})`).not.toBeNull();
        // invariants
        const hexes = d.state.units.filter((u) => u.hex >= 0).map((u) => u.hex);
        expect(new Set(hexes).size).toBe(hexes.length);
        for (const u of d.state.units) expect(u.blocks).toBeGreaterThan(0);
      }
    });
  }
});
