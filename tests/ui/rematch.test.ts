// Play again after a battle: the same battle again, with the same or switched sides; switching sides makes a match of
// the two battles.
import { describe, expect, it } from 'vitest';
import { createGame } from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { legResult, rematchConfig, type LegResult, type SessionConfig } from '../../src/ui/game/controller';

const finished: SessionConfig = {
  scenarioId: '109',
  humanSide: 'top',
  difficulty: 'consul',
  seed: 12345,
  personality: 'bold',
  devCards: ['outFlanked'],
  options: { tacticalFlexibility: true },
};

const leg: LegResult = { humanSide: 'top', banners: { top: 5, bottom: 3 }, winner: 'top' };

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
    expect('firstLeg' in cfg).toBe(false);
  });

  it('switching sides carries the finished battle along as the first of a match; playing again does not', () => {
    expect(rematchConfig(finished, true, leg).firstLeg).toEqual(leg);
    expect('firstLeg' in rematchConfig(finished, false, leg)).toBe(false);
  });

  it('after the second battle of a match, switching sides starts a new match and playing again ends it', () => {
    const second: SessionConfig = { ...finished, humanSide: 'bottom', firstLeg: leg };
    const done: LegResult = { humanSide: 'bottom', banners: { top: 5, bottom: 2 }, winner: 'top' };
    expect(rematchConfig(second, true, done).firstLeg).toBeUndefined();
    expect(rematchConfig(second, false, done).firstLeg).toBeUndefined();
  });
});

describe('legResult', () => {
  it('records the human\'s side, the winner and each side\'s banners (never below zero)', () => {
    const s = createGame(scenarioById('001').setup, 1);
    s.players.top.banners = 5;
    s.players.bottom.banners = 3;
    expect(legResult(s, 'bottom', 'top')).toEqual({ humanSide: 'bottom', banners: { top: 5, bottom: 3 }, winner: 'top' });
    s.players.bottom.banners = -1;
    expect(legResult(s, 'bottom', 'draw').banners.bottom).toBe(0);
  });
});
