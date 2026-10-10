// Rematch after a battle: the same battle again, with the same or switched sides.
import { describe, expect, it } from 'vitest';
import { rematchConfig, type SessionConfig } from '../../src/ui/game/controller';

const finished: SessionConfig = {
  scenarioId: '109',
  humanSide: 'top',
  difficulty: 'consul',
  seed: 12345,
  personality: 'bold',
  devCards: ['outFlanked'],
  options: { tacticalFlexibility: true },
};

describe('rematchConfig', () => {
  it('same sides: keeps battle, side, difficulty, optional rules and personality, with a fresh seed', () => {
    const cfg = rematchConfig(finished, false);
    expect(cfg).toMatchObject({
      scenarioId: '109', humanSide: 'top', difficulty: 'consul', personality: 'bold', options: { tacticalFlexibility: true },
    });
    expect(cfg.seed).not.toBe(finished.seed);
    expect(cfg.devCards).toBeUndefined();
  });

  it('switched sides: the human takes the other army and the AI uses its new general\'s default personality', () => {
    const cfg = rematchConfig(finished, true);
    expect(cfg).toMatchObject({ scenarioId: '109', humanSide: 'bottom', difficulty: 'consul', options: { tacticalFlexibility: true } });
    expect(cfg.personality).toBeUndefined();
    expect(cfg.devCards).toBeUndefined();
    expect(rematchConfig({ ...finished, humanSide: 'bottom' }, true).humanSide).toBe('top');
  });

  it('does not share the optional-rules object and leaves out absent options', () => {
    expect(rematchConfig(finished, false).options).not.toBe(finished.options);
    const plain: SessionConfig = { scenarioId: '001', humanSide: 'bottom', difficulty: 'recruit', seed: 7 };
    const cfg = rematchConfig(plain, false);
    expect('options' in cfg).toBe(false);
    expect('personality' in cfg).toBe(false);
  });
});
