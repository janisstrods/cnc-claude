// Expansion #1 elite units and leader traits (rules-reference §17.1, §17.2; base mechanics §3, §4, §6, §10, §11, §12).
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ELITES, GameDriver, autoOrders, battleTargets, closeCombatDice, createGame, eligiblePieces, ignorableFlags, orderLimit,
  pieceMoves, rallyCandidates, swordIgnores, validateOrders,
  type CardKind, type EliteId, type LeaderTrait, type Unit,
} from '../../src/engine';
import { PERSONALITIES, chooseAnswer, isLegal, newMemory, type AiOptions } from '../../src/ai';
import { Occ, helmetsOcc } from '../../src/ai/board';
import { orderCandidates } from '../../src/ai/ordering';
import { LEADER_VALUE, NEUTRAL_W, leaderVal } from '../../src/ai/values';
import {
  H, build, combatDice, ev, forceDice, forcedDiceLeft, giveCard, must, n, noFirstStrike, passTurn, play, rolls, setupOf, toBattle, u,
  type Pos,
} from './helpers';

beforeEach(() => forceDice([]));

const ALEX: LeaderTrait[] = ['ccBonus'];
const SATRAP: LeaderTrait[] = ['attachedOnly'];

// ---------------------------------------------------------------------------------------------
// The preset table (§17.1)

describe('elite presets', () => {
  it('every preset id has its unit type and abilities', () => {
    const table: Record<EliteId, [string, string[], number | undefined]> = {
      carthSacredBand: ['HI', ['helmetHits', 'ignoreFlag'], undefined],
      thebanSacredBand: ['MI', ['helmetHits', 'ignoreFlag'], undefined],
      silverShields: ['HI', ['helmetHits', 'ignoreFlag'], undefined],
      companions: ['MC', ['ignoreSword', 'ignoreFlag'], undefined],
      immortals: ['MI', ['ranged'], 3],
      bowAuxilia: ['AX', ['ranged'], 3],
    };
    for (const [id, [type, abilities, range]] of Object.entries(table) as [EliteId, [string, string[], number | undefined]][]) {
      const def = ELITES[id];
      expect(def.id, id).toBe(id);
      expect(def.types, id).toEqual([type]);
      expect([...def.abilities].sort(), id).toEqual([...abilities].sort());
      expect(def.range, id).toBe(range);
    }
  });

  it('a preset may only be given to its listed unit type', () => {
    const at = (type: Unit['type'], elite: EliteId) => {
      const base = setupOf({ units: [{ side: 'top', type, at: [4, 6] }] });
      return { ...base, units: [{ ...base.units[0], elite }] };
    };
    expect(() => createGame(at('HC', 'companions'), 1)).toThrow(/Companions.*cannot be a HC unit/);
    expect(() => createGame(at('HI', 'immortals'), 1)).toThrow(/cannot be a HI unit/);
    expect(() => createGame(at('LI', 'bowAuxilia'), 1)).toThrow(/cannot be a LI unit/);
    expect(() => createGame(at('MI', 'silverShields'), 1)).toThrow(/cannot be a MI unit/);
    expect(createGame(at('MC', 'companions'), 1).units[0].elite).toBe('companions');
  });
});

// ---------------------------------------------------------------------------------------------
// helmetHits + ignoreFlag: Theban Sacred Band (MI) and Silver Shields (HI)

describe('Theban Sacred Band and Silver Shields', () => {
  for (const [elite, type] of [['thebanSacredBand', 'MI'], ['silverShields', 'HI']] as const) {
    it(`${elite} (${type}) scores helmets in its attack with no leader near`, () => {
      // bottom elite at (5,6) attacks a top MI at (4,6): 2 helmets hit, the rest miss; the MI battles back missing
      const s = build({ units: [{ side: 'bottom', type, at: [5, 6], elite }, { side: 'top', type: 'MI', at: [4, 6] }] });
      const d = toBattle(s, 'order4C', ['u1']);
      const dice = type === 'MI' ? 4 : 5;
      forceDice(['leader', 'leader', ...n('light', dice - 2), ...n('light', 4)]);
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      expect(u(d, 'u2')!.blocks).toBe(2);
      expect(forcedDiceLeft()).toBe(0);
    });

    it(`${elite} scores helmets when it battles back`, () => {
      const s = build({ units: [{ side: 'top', type: 'MI', at: [4, 6] }, { side: 'bottom', type, at: [5, 6], elite }], first: 'top' });
      const d = toBattle(s, 'order4C', ['u1']);
      const back = type === 'MI' ? 4 : 5;
      forceDice([...n('light', 4), 'leader', ...n('light', back - 1)]);
      must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
      expect(u(d, 'u1')!.blocks).toBe(3);
      expect(forcedDiceLeft()).toBe(0);
    });

    it(`${elite} may ignore 1 flag`, () => {
      const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type, at: [4, 6], elite }] });
      const d = toBattle(s, 'order4C', ['u1']);
      forceDice(['flag', ...n('light', 4)]);
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      expect(d.pending).toMatchObject({ kind: 'ignoreFlags', max: 1 });
    });
  }

  it('a plain MI scores no helmets without a leader (control)', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['leader', 'leader', ...n('light', 2), ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')!.blocks).toBe(4);
  });
});

// ---------------------------------------------------------------------------------------------
// ignoreSword + ignoreFlag: Companions (MC)

describe('Companions', () => {
  it('ignore the first sword rolled against them: swords, swords from an HI is 1 hit', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MC', at: [4, 6], elite: 'companions' }] });
    const d = toBattle(s, 'order4C', ['u1']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    forceDice(['swords', 'swords', ...n('light', 3), ...n('light', 3)]);
    must(d, { kind: 'defend', choice: 'stand' });
    expect(u(d, 'u2')!.blocks).toBe(2);
    expect(forcedDiceLeft()).toBe(0);
  });

  it('a plain MC takes both swords (control)', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MC', at: [4, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    forceDice(['swords', 'swords', ...n('light', 3), ...n('light', 3)]);
    must(d, { kind: 'defend', choice: 'stand' });
    expect(u(d, 'u2')!.blocks).toBe(1);
  });

  it('also ignore a sword when they attack and the enemy battles back', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MC', at: [5, 6], elite: 'companions' }, { side: 'top', type: 'HI', at: [4, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice([...n('light', 3), 'swords', 'swords', ...n('light', 3)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u1')!.blocks).toBe(2);
    expect(forcedDiceLeft()).toBe(0);
  });

  it('against an elephant: the first sword is ignored and not re-rolled; the second hits and is re-rolled', () => {
    const s = build({ units: [{ side: 'bottom', type: 'EL', at: [5, 6] }, { side: 'top', type: 'MC', at: [4, 6], elite: 'companions' }] });
    const d = toBattle(s, 'order4C', ['u1']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    // EL vs MC: 3 dice -> swords (ignored), swords (hit, re-roll: light), light; the MC battles back with 3
    forceDice(['swords', 'swords', 'light', 'light', ...n('light', 3)]);
    must(d, { kind: 'defend', choice: 'stand' });
    expect(u(d, 'u2')!.blocks).toBe(2);
    expect(rolls(ev(d), 'close')[0]).toEqual(['swords', 'swords', 'light', 'light']);
    expect(forcedDiceLeft()).toBe(0);
  });

  it('may ignore 1 flag, stacking with Alexander and support (3 flags and 1 sword)', () => {
    const s = build({
      units: [
        { side: 'bottom', type: 'MC', at: [5, 6], elite: 'companions' }, { side: 'bottom', type: 'MI', at: [5, 5] },
        { side: 'bottom', type: 'MI', at: [5, 7] }, { side: 'top', type: 'HI', at: [4, 6] },
        { side: 'bottom', type: 'MC', at: [7, 2], elite: 'companions' },
      ],
      leaders: [{ side: 'bottom', at: [5, 6], traits: ALEX }],
    });
    const [comp, , , hi, alone] = s.units;
    const ctx = { kind: 'close' as const, striker: hi, leaderAlive: true, fullAtStart: true };
    expect(ignorableFlags(s, comp, ctx)).toBe(3);
    expect(ignorableFlags(s, alone, ctx)).toBe(1);
    expect(swordIgnores(s, comp)).toBe(1);
    expect(swordIgnores(s, alone)).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------
// ranged elites: Immortals (MI) and bow-armed auxilia (AX)

describe('Immortals', () => {
  const pos = (from: [number, number], targetAt: [number, number] = [5, 6]): Pos => ({
    units: [{ side: 'bottom', type: 'MI', at: from, elite: 'immortals' }, { side: 'top', type: 'HI', at: targetAt }],
  });

  it('fire at range 3 with 2 dice when they did not move', () => {
    const s = build(pos([5, 3]));
    const d = toBattle(s, 'orderMedium', ['u1']);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(5, 6), kind: 'ranged' }]);
    ev(d);
    forceDice(n('light', 2));
    must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
    expect(combatDice(ev(d), 'ranged')).toBe(2);
  });

  it('fire 1 die after a 1-hex move', () => {
    const s = build(pos([6, 3]));
    const d = play(s, 'orderMedium', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 3) });
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    ev(d);
    forceDice(n('light', 1));
    must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
    expect(combatDice(ev(d), 'ranged')).toBe(1);
  });

  it('cannot fire at range 4; a plain MI cannot fire at all', () => {
    expect(battleTargets(toBattle(build(pos([5, 2])), 'orderMedium', ['u1']).state, 'u1')).toEqual([]);
    const plain = build({ units: [{ side: 'bottom', type: 'MI', at: [5, 3] }, { side: 'top', type: 'HI', at: [5, 6] }] });
    expect(battleTargets(toBattle(plain, 'orderMedium', ['u1']).state, 'u1')).toEqual([]);
  });

  it('still close combat with 4 dice', () => {
    const s = build(pos([5, 6], [4, 6]));
    const d = toBattle(s, 'orderMedium', ['u1']);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'close' }]);
    ev(d);
    forceDice([...n('light', 4), ...n('light', 5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(combatDice(ev(d), 'close')).toBe(4);
  });

  it('never fire and close combat in the same turn', () => {
    const s = build(pos([5, 3]));
    const d = toBattle(s, 'orderMedium', ['u1']);
    forceDice(n('light', 2));
    must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
    expect(battleTargets(d.state, 'u1')).toEqual([]);
  });

  it('are missile units for Darken the Sky but not light troops', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'MI', at: [5, 3], elite: 'immortals' }, { side: 'bottom', type: 'LI', at: [7, 8] }, { side: 'top', type: 'HI', at: [5, 6] }],
    });
    expect(autoOrders(s, 'bottom', 'darken')).toEqual(['u1', 'u2']);
    for (const k of ['orderLight', 'moveFireMove'] as CardKind[]) expect(validateOrders(s, 'bottom', k, ['u1']), k).not.toBeNull();
    expect(validateOrders(s, 'bottom', 'orderMedium', ['u1'])).toBeNull();
  });
});

describe('bow-armed auxilia', () => {
  const pos = (from: [number, number], elite?: EliteId): Pos => ({
    units: [{ side: 'bottom', type: 'AX', at: from, elite }, { side: 'top', type: 'HI', at: [5, 6] }],
  });

  it('fire at range 3 (a plain AX only reaches 2)', () => {
    const d = toBattle(build(pos([5, 3], 'bowAuxilia')), 'orderLight', ['u1']);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(5, 6), kind: 'ranged' }]);
    ev(d);
    forceDice(n('light', 2));
    must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
    expect(combatDice(ev(d), 'ranged')).toBe(2);
    expect(battleTargets(toBattle(build(pos([5, 3])), 'orderLight', ['u1']).state, 'u1')).toEqual([]);
  });

  it('fire 1 die after moving 1 hex', () => {
    const d = play(build(pos([6, 3], 'bowAuxilia')), 'orderLight', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 3) });
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    ev(d);
    forceDice(n('light', 1));
    must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
    expect(combatDice(ev(d), 'ranged')).toBe(1);
  });

  it('cannot fire after moving 2 hexes', () => {
    const d = play(build(pos([7, 3], 'bowAuxilia')), 'orderLight', ['u1']);
    expect(pieceMoves(d.state, 'u1').find((m) => m.hex === H(5, 3))).toMatchObject({ dist: 2 });
    must(d, { kind: 'move', piece: 'u1', to: H(5, 3) });
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    expect(battleTargets(d.state, 'u1')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
// Alexander: ccBonus (§17.2)

describe('Alexander (+1 close combat die to his unit)', () => {
  it('his MC attacks with 4 dice', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'MC', at: [5, 6], elite: 'companions' }, { side: 'top', type: 'HI', at: [4, 6] }],
      leaders: [{ side: 'bottom', at: [5, 6], traits: ALEX }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice([...n('light', 4), ...n('light', 5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    const e = ev(d);
    expect(combatDice(e, 'close')).toBe(4);
    expect(combatDice(e, 'battleBack')).toBe(5);
  });

  it('his MC battles back with 4 dice', () => {
    const s = build({
      units: [{ side: 'top', type: 'HI', at: [4, 6] }, { side: 'bottom', type: 'MC', at: [5, 6] }],
      leaders: [{ side: 'bottom', at: [5, 6], traits: ALEX }],
      first: 'top',
    });
    const d = toBattle(s, 'order4C', ['u1']);
    must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
    ev(d);
    forceDice([...n('light', 5), ...n('light', 4)]);
    must(d, { kind: 'defend', choice: 'stand' });
    expect(combatDice(ev(d), 'battleBack')).toBe(4);
    expect(forcedDiceLeft()).toBe(0);
  });

  it('is added after the terrain caps: a hill-capped attack of 2 becomes 3, and stacks with Mounted Charge (4)', () => {
    const p = (): Pos => ({
      units: [{ side: 'bottom', type: 'MC', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }],
      leaders: [{ side: 'bottom', at: [5, 6], traits: ALEX }],
      terrain: [{ at: [4, 6], t: 'hill' }],
    });
    for (const [card, dice] of [['order4C', 3], ['mountedCharge', 4]] as [CardKind, number][]) {
      const d = toBattle(build(p()), card, ['u1']);
      ev(d);
      forceDice([...n('light', dice), ...n('light', 5)]);
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      expect(combatDice(ev(d), 'close'), card).toBe(dice);
    }
  });

  it('applies to a bonus close combat', () => {
    const s = build({
      units: [
        { side: 'bottom', type: 'MC', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }, { side: 'top', type: 'HI', at: [3, 6] },
      ],
      leaders: [{ side: 'bottom', at: [5, 6], traits: ALEX }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['medium', ...n('light', 3)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'yesno', yes: true });
    if (d.pending?.kind === 'cavalryExtra') must(d, { kind: 'hex', hex: null });
    expect(d.pending).toMatchObject({ kind: 'bonusCombat' });
    ev(d);
    forceDice([...n('light', 4), ...n('light', 5)]);
    must(d, { kind: 'hex', hex: H(3, 6) });
    expect(combatDice(ev(d), 'bonus')).toBe(4);
  });

  it('applies to First Strike', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }],
      leaders: [{ side: 'top', at: [4, 6], traits: ALEX }],
    });
    noFirstStrike(s);
    giveCard(s, 'top', 'firstStrike');
    const d = play(s, 'order4C', ['u1'], { keepFS: true });
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending).toMatchObject({ kind: 'defend', canFirstStrike: true });
    ev(d);
    forceDice([...n('light', 5), ...n('light', 5)]);
    must(d, { kind: 'defend', choice: 'firstStrike' });
    expect(combatDice(ev(d), 'firstStrike')).toBe(5);
  });

  it('applies to the roll against an evading unit and against a lone leader [Interp]', () => {
    // MC (3 dice) with Alexander attacks a light infantry unit that evades: 4 dice
    const s = build({
      units: [{ side: 'bottom', type: 'MC', at: [5, 6] }, { side: 'top', type: 'LI', at: [4, 6] }],
      leaders: [{ side: 'bottom', at: [5, 6], traits: ALEX }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending).toMatchObject({ kind: 'defend', canEvade: true });
    ev(d);
    forceDice(n('heavy', 4));
    must(d, { kind: 'defend', choice: 'evade' });
    expect(combatDice(ev(d), 'evade')).toBe(4);
    // ... and a lone leader: 4 dice
    const l = build({
      units: [{ side: 'bottom', type: 'MC', at: [5, 6] }],
      leaders: [{ side: 'bottom', at: [5, 6], traits: ALEX }, { side: 'top', at: [4, 6] }],
    });
    const dl = toBattle(l, 'order4C', ['u1']);
    ev(dl);
    forceDice(n('flag', 4));
    must(dl, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(combatDice(ev(dl), 'close')).toBe(4);
  });

  it('a unit merely adjacent to Alexander gets no bonus', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'bottom', type: 'MC', at: [5, 7] }, { side: 'top', type: 'HI', at: [4, 6] }],
      leaders: [{ side: 'bottom', at: [5, 7], traits: ALEX }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice([...n('light', 4), ...n('light', 5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(combatDice(ev(d), 'close')).toBe(4);
  });

  it('no battle-back bonus once he has fallen in this combat\'s casualty check', () => {
    const run = (check: ['leader' | 'light', 'leader' | 'light']) => {
      const s = build({
        units: [{ side: 'top', type: 'HI', at: [4, 6] }, { side: 'bottom', type: 'MC', at: [5, 6] }],
        leaders: [{ side: 'bottom', at: [5, 6], traits: ALEX }],
        first: 'top',
      });
      const d = toBattle(s, 'order4C', ['u1']);
      must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
      ev(d);
      forceDice(['medium', ...n('light', 4), ...check, ...n('light', 4)]);
      must(d, { kind: 'defend', choice: 'stand' });
      return { d, back: combatDice(ev(d), 'battleBack') };
    };
    const killed = run(['leader', 'leader']);
    expect(killed.d.state.leaders.filter((l) => l.side === 'bottom')).toEqual([]);
    expect(u(killed.d, 'u2')!.blocks).toBe(2);
    expect(killed.back).toBe(3);
    const survived = run(['leader', 'light']);
    expect(survived.back).toBe(4);
  });

  it('never helps an elephant, and elephants do not mirror it', () => {
    const s = build({
      units: [
        { side: 'bottom', type: 'EL', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] },
        { side: 'top', type: 'MC', at: [3, 2] }, { side: 'bottom', type: 'EL', at: [4, 2] },
      ],
      leaders: [{ side: 'bottom', at: [5, 6], traits: ALEX }, { side: 'top', at: [3, 2], traits: ALEX }],
    });
    const [el, mi, mc, el2] = s.units;
    const opts = { role: 'attack' as const, fullAtStart: true, ordered: false };
    expect(closeCombatDice(s, el, mi, opts)).toBe(4);
    expect(closeCombatDice(s, el2, mc, opts)).toBe(3);
    expect(closeCombatDice(s, mc, el2, opts)).toBe(4);
  });

  it('is not used when a leader escapes through his unit\'s hex', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'bottom', type: 'MC', at: [3, 5] }, { side: 'bottom', type: 'MC', at: [3, 6] }],
      leaders: [{ side: 'top', at: [4, 6] }, { side: 'bottom', at: [3, 5], traits: ALEX }, { side: 'bottom', at: [3, 6], traits: ALEX }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(n('flag', 5));
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending?.kind).toBe('leaderEvade');
    ev(d);
    forceDice(n('flag', 6));
    must(d, { kind: 'choose', index: 0 });
    expect(rolls(ev(d), 'escape')[0]).toHaveLength(3);
  });

  it('adds nothing to ranged fire', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'LC', at: [5, 4] }, { side: 'top', type: 'HI', at: [5, 6] }],
      leaders: [{ side: 'bottom', at: [5, 4], traits: ALEX }],
    });
    const d = toBattle(s, 'orderLight', ['u1']);
    ev(d);
    forceDice(n('light', 2));
    must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
    expect(combatDice(ev(d), 'ranged')).toBe(2);
  });
});

// ---------------------------------------------------------------------------------------------
// Satraps: attachedOnly (§17.2)

describe('satraps (helmets and Leadership only for their own unit)', () => {
  /** Bottom MI u1 at (5,6) attacks the top HI at (4,6) rolling 2 helmets; returns the HI's blocks left. */
  const helmetsHit = (p: Pos) => {
    const d = toBattle(build(p), 'order4C', ['u1']);
    forceDice(['leader', 'leader', ...n('light', 2), ...n('light', 5)]);
    const hi = d.state.units.find((x) => x.type === 'HI')!;
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    return u(d, hi.id)!.blocks;
  };
  const units: Pos['units'] = [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }];

  it('his attached unit scores helmets', () => {
    expect(helmetsHit({ units, leaders: [{ side: 'bottom', at: [5, 6], traits: SATRAP }] })).toBe(2);
  });

  it('an adjacent unit\'s helmets miss, whether he is attached elsewhere or alone', () => {
    const withUnit = [...units!, { side: 'bottom' as const, type: 'MI' as const, at: [5, 7] as [number, number] }];
    expect(helmetsHit({ units: withUnit, leaders: [{ side: 'bottom', at: [5, 7], traits: SATRAP }] })).toBe(4);
    expect(helmetsHit({ units, leaders: [{ side: 'bottom', at: [5, 7], traits: SATRAP }] })).toBe(4);
    // control: an ordinary adjacent leader
    expect(helmetsHit({ units, leaders: [{ side: 'bottom', at: [5, 7] }] })).toBe(2);
  });

  it('an attached satrap still gives his unit 1 flag-ignore', () => {
    const s = build({
      units: [{ side: 'top', type: 'HI', at: [4, 6] }, { side: 'bottom', type: 'MI', at: [5, 6] }],
      leaders: [{ side: 'bottom', at: [5, 6], traits: SATRAP }],
      first: 'top',
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['flag', ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
    expect(d.pending).toMatchObject({ kind: 'ignoreFlags', max: 1 });
  });

  it('a lone satrap still counts as support and still enables Rally', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'MI', at: [5, 6], blocks: 2 }, { side: 'bottom', type: 'MI', at: [6, 7] }, { side: 'top', type: 'HI', at: [4, 6] }],
      leaders: [{ side: 'bottom', at: [6, 6], traits: SATRAP }],
    });
    const [mi, , hi] = s.units;
    expect(ignorableFlags(s, mi, { kind: 'close', striker: hi, leaderAlive: true, fullAtStart: false })).toBe(1);
    expect(rallyCandidates(s, 'bottom').map((x) => x.id)).toEqual(['u1']);
  });

  // u1 MI at (6,6) with the satrap; u2 MI (6,7) and u3 MI (6,5) adjacent; u4 MI (6,9) not adjacent
  const army = (leader: { at: [number, number]; traits?: LeaderTrait[] }, withOwn = true): Pos => ({
    units: [
      ...(withOwn ? [{ side: 'bottom' as const, type: 'MI' as const, at: [6, 6] as [number, number] }] : []),
      { side: 'bottom', type: 'MI', at: [6, 7] }, { side: 'bottom', type: 'MI', at: [6, 5] }, { side: 'bottom', type: 'MI', at: [6, 9] },
      { side: 'top', type: 'HI', at: [1, 6] },
    ],
    leaders: [{ side: 'bottom', at: leader.at, traits: leader.traits }],
  });

  for (const card of ['leadershipAny', 'inspiredC'] as CardKind[]) {
    it(`${card} on a satrap orders only him and his unit`, () => {
      const s = build(army({ at: [6, 6], traits: SATRAP }));
      const L = s.leaders[0].id;
      expect(validateOrders(s, 'bottom', card, [L, 'u1'])).toBeNull();
      expect(validateOrders(s, 'bottom', card, [L, 'u1', 'u2'])).not.toBeNull();
      expect(validateOrders(s, 'bottom', card, [L, 'u1', 'u2', 'u3'])).not.toBeNull();
      expect(validateOrders(s, 'bottom', card, [L])).toMatch(/may not detach/); // the detach rule, not the satrap one
      expect(validateOrders(s, 'bottom', card, ['u2'])).toBeNull(); // the 1-unit alternative is unchanged
      expect(orderLimit(s, 'bottom', card, [L])).toBe(2);
      // control: an ordinary leader in the same spot
      const c = build(army({ at: [6, 6] }));
      const L2 = c.leaders[0].id;
      expect(validateOrders(c, 'bottom', card, [L2, 'u1', 'u2', 'u3'])).toBeNull();
      expect(orderLimit(c, 'bottom', card, [L2])).toBe(card === 'leadershipAny' ? 5 : 6);
    });
  }

  it('a lone satrap orders only himself', () => {
    const s = build(army({ at: [6, 6], traits: SATRAP }, false));
    const L = s.leaders[0].id;
    expect(validateOrders(s, 'bottom', 'leadershipAny', [L])).toBeNull();
    expect(validateOrders(s, 'bottom', 'leadershipAny', [L, 'u1'])).not.toBeNull();
    expect(orderLimit(s, 'bottom', 'leadershipAny', [L])).toBe(1);
  });

  it('the UI offers only his unit (and single units of the section) with an Inspired card', () => {
    // u2 stands in the left section: an ordinary centre leader could chain it, a satrap never
    const s = build({
      units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [6, 2] }, { side: 'top', type: 'HI', at: [1, 6] }],
      leaders: [{ side: 'bottom', at: [6, 6], traits: SATRAP }],
    });
    const L = s.leaders[0].id;
    expect(eligiblePieces(s, 'bottom', 'inspiredC').sort()).toEqual([L, 'u1'].sort());
  });

  it('a Counter Attack copying a Leadership card is bound by the same rule', () => {
    const s = build({ ...army({ at: [6, 6], traits: SATRAP }), first: 'top' });
    const L = s.leaders[0].id;
    noFirstStrike(s);
    const d = new GameDriver(s);
    passTurn(d, 'leadershipAny');
    const card = giveCard(d.state, 'bottom', 'counterAttack');
    must(d, { kind: 'playCard', card });
    expect(d.pending).toMatchObject({ kind: 'orders', card: 'leadershipAny' });
    expect(d.answer({ kind: 'orders', pieces: [L, 'u1', 'u2'] })).toBe(false);
    must(d, { kind: 'orders', pieces: [L, 'u1'] });
    expect(Object.keys(d.state.turn.ordered)).toEqual(['u1']); // he rides with his unit (no detaching)
  });

  it('the AI only proposes legal orders for a satrap', () => {
    const s = build({
      units: [
        { side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'bottom', type: 'MI', at: [5, 7] }, { side: 'bottom', type: 'MI', at: [5, 5] },
        { side: 'top', type: 'MI', at: [4, 6] }, { side: 'top', type: 'MI', at: [4, 7] }, { side: 'top', type: 'MI', at: [4, 5] },
      ],
      leaders: [{ side: 'bottom', at: [5, 6], traits: SATRAP }],
      banners: 6,
    });
    const L = s.leaders[0].id;
    for (const c of orderCandidates(s, 'bottom', 'leadershipAny', NEUTRAL_W, 4)) {
      expect(validateOrders(s, 'bottom', 'leadershipAny', c.pieces), c.pieces.join(',')).toBeNull();
    }
    const d = play(s, 'leadershipAny');
    expect(d.pending?.kind).toBe('orders');
    const opts: AiOptions = { side: 'bottom', difficulty: 'tribune', personality: PERSONALITIES[0], seed: 7, budgetScale: 0.1, deterministic: true };
    const a = chooseAnswer(d.state, d.pending!, opts, newMemory()).answer;
    expect(isLegal(d.state, d.pending!, a)).toBe(true);
    const pieces = (a as { pieces: string[] }).pieces;
    if (pieces.includes(L)) expect(pieces.sort()).toEqual([L, 'u1'].sort());
    else expect(pieces.length).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------------------------
// setup and AI helpers

describe('leader traits in a scenario setup', () => {
  it('createGame keeps traits; leaders without traits have none', () => {
    const s = createGame(setupOf({ leaders: [{ side: 'bottom', at: [7, 6], traits: ALEX }, { side: 'top', at: [1, 6] }] }), 1);
    expect(s.leaders[0].traits).toEqual(['ccBonus']);
    expect('traits' in s.leaders[1]).toBe(false);
  });

  it('createGame rejects an unknown trait', () => {
    const setup = setupOf({ leaders: [{ side: 'bottom', at: [7, 6], traits: ['flying' as LeaderTrait] }] });
    expect(() => createGame(setup, 1)).toThrow(/unknown leader trait flying/);
  });
});

describe('AI leader traits', () => {
  it('helmets of a satrap count only for his own unit', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'bottom', type: 'MI', at: [5, 7] }],
      leaders: [{ side: 'bottom', at: [5, 6], traits: SATRAP }],
    });
    const occ = new Occ(s);
    expect(helmetsOcc(occ, s.units[0])).toBe(true);
    expect(helmetsOcc(occ, s.units[1])).toBe(false);
  });

  it('Alexander is worth 1.5 ordinary leaders', () => {
    const s = build({ leaders: [{ side: 'bottom', at: [7, 6], traits: ALEX }, { side: 'bottom', at: [7, 2], traits: SATRAP }, { side: 'top', at: [1, 6] }] });
    expect(leaderVal(s, s.leaders[0])).toBeCloseTo(1.5 * LEADER_VALUE);
    expect(leaderVal(s, s.leaders[1])).toBe(LEADER_VALUE);
    expect(leaderVal(s, s.leaders[2])).toBe(LEADER_VALUE);
  });
});
