import { describe, expect, it } from 'vitest';
import { GameDriver, createGame, type Answer } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import fixtures from './fixtures.json';
import saveFixture from './save-fixture.json';
import { digest, fnv, goldenGames } from './record';

describe('golden games (base-game behaviour is unchanged)', () => {
  it('replays every recorded game with identical events', () => {
    const now = goldenGames();
    // same game list as the fixture file: nothing silently dropped or left stale
    expect(now.map((g) => g.id)).toEqual((fixtures as { id: string }[]).map((f) => f.id));
    for (const g of now) {
      const f = (fixtures as typeof now).find((x) => x.id === g.id);
      expect(f, g.id).toBeDefined();
      expect(g, g.id).toEqual(f);
    }
  }, 300_000);
});

describe('saved games stay loadable (a save is exactly config + answers)', () => {
  it('rebuilds the recorded save by replaying its answers', () => {
    const { scenarioId, seed, answers, rngCalls, stateHash } = saveFixture as { scenarioId: string; seed: number; answers: Answer[]; rngCalls: number; stateHash: string };
    expect(answers).toHaveLength(60);
    const d = GameDriver.replay(createGame(scenarioById(scenarioId).setup, seed), answers);
    expect(d.answers).toHaveLength(answers.length);
    expect(d.pending).not.toBeNull();
    // the replayed position is exactly the recorded one (not merely loadable)
    const dg = digest(d.state);
    expect(dg.rngCalls).toBe(rngCalls);
    expect(fnv(JSON.stringify(dg)).toString(16)).toBe(stateHash);
  });
});
