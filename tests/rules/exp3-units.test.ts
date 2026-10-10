// Expansion #3 units (rules-reference §18.2, §18.3, §18.5, §18.11, §20): Julian legions (the pilum and the march, for one
// or both armies) and Caesar's forced march, whose engine exists since Expansion #2 (these tests pin the Expansion #3
// readings); the immobile recruits of 306 Bibracte; and 304 Valentia's two Sertorian commands, whose leaders both carry one.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  GameDriver, OFF_BOARD, battleTargets, canFireAt, canMarch, cloneState, createGame, evadeOptions, hasPilum, movablePieces, pieceMoves, unitMoves,
  validateOrders, type LeaderTrait, type UnitType,
} from '../../src/engine';
import { scenarioById } from '../../src/scenarios';
import { H, build, combatDice, ev, forceDice, giveCard, must, n, noFirstStrike, passTurn, play, setupOf, toBattle, u, type Pos } from './helpers';

beforeEach(() => forceDice([]));

type PosUnit = NonNullable<Pos['units']>[number];
const bottom = (type: UnitType, at: [number, number], extra: Partial<PosUnit> = {}): PosUnit => ({ side: 'bottom', type, at, ...extra });
const top = (type: UnitType, at: [number, number], extra: Partial<PosUnit> = {}): PosUnit => ({ side: 'top', type, at, ...extra });

const JULIAN_BOTH: Pos['legions'] = { top: 'julian', bottom: 'julian' };
const JULIAN_BOTTOM: Pos['legions'] = { bottom: 'julian' };
const CAESAR_TRAITS: LeaderTrait[] = ['ccBonus', 'forcedMarch'];
const caesar = (at: [number, number]): NonNullable<Pos['leaders']>[number] => ({ side: 'bottom', name: 'Julius Caesar', at, traits: CAESAR_TRAITS });
const longest = (moves: { dist: number }[]) => Math.max(...moves.map((m) => m.dist));

describe('Julian legions: scope (§18.2)', () => {
  it('`legions` for both sides stamps the MI and HI of both, whatever their nationality', () => {
    const s = build({
      legions: JULIAN_BOTH, topArmy: 'Numidian', bottomArmy: 'Caesarian',
      units: [
        top('MI', [2, 2]), top('HI', [2, 4]), top('AX', [2, 6]), top('MC', [1, 8]), top('LI', [2, 10]),
        bottom('MI', [6, 2]), bottom('HI', [6, 4]), bottom('AX', [6, 6]), bottom('MC', [7, 8]), bottom('LI', [6, 10]),
      ],
      reserves: [{ side: 'top', type: 'MI' }, { side: 'bottom', type: 'HI' }, { side: 'bottom', type: 'LB' }],
    });
    const legion = (side: 'top' | 'bottom', type: UnitType) => s.units.find((x) => x.side === side && x.type === type)?.legion;
    for (const side of ['top', 'bottom'] as const) {
      expect([side, legion(side, 'MI'), legion(side, 'HI')]).toEqual([side, 'julian', 'julian']);
      for (const type of ['AX', 'MC', 'LI'] as const) expect([side, type, legion(side, type)]).toEqual([side, type, undefined]);
    }
    expect(s.special.reserveUnits.map((x) => [x.type, x.legion])).toEqual([['MI', 'julian'], ['HI', 'julian'], ['LB', undefined]]);
    for (const x of s.units.filter((y) => y.type === 'MI' || y.type === 'HI')) expect([hasPilum(x), canMarch(x)]).toEqual([true, true]);
  });

  it('a legion named for one side leaves the other side without (316, 317 and the Roman-only battles)', () => {
    const s = build({ legions: JULIAN_BOTTOM, units: [top('MI', [2, 2]), top('HI', [2, 4]), bottom('MI', [6, 2]), bottom('HI', [6, 4])] });
    expect(s.units.map((x) => x.legion)).toEqual([undefined, undefined, 'julian', 'julian']);
    const none = build({ units: [top('MI', [2, 2]), bottom('MI', [6, 2])] });
    expect(none.units.map((x) => x.legion)).toEqual([undefined, undefined]);
  });

  it('Julian and Marius legions can meet in one battle: only the Julian side marches', () => {
    const s = build({ legions: { top: 'marius', bottom: 'julian' }, units: [top('MI', [2, 6]), bottom('MI', [6, 6])] });
    expect(s.units.map((x) => [x.legion, hasPilum(x), canMarch(x)])).toEqual([['marius', true, false], ['julian', true, true]]);
  });
});

describe('Julian march (§18.2)', () => {
  it('an MI may move 2 hexes without battle, or 1 hex and battle; an HI the same', () => {
    for (const type of ['MI', 'HI'] as const) {
      const d = play(build({ legions: JULIAN_BOTH, units: [bottom(type, [6, 6]), top('MI', [1, 6])] }), type === 'MI' ? 'orderMedium' : 'orderHeavy', ['u1']);
      const moves = pieceMoves(d.state, 'u1');
      expect([type, longest(moves)]).toEqual([type, 2]);
      expect(moves.filter((m) => m.dist === 1).every((m) => m.canBattle)).toBe(true);
      expect(moves.filter((m) => m.dist === 2).every((m) => !m.canBattle)).toBe(true);
    }
  });

  it('the side without a legion moves 1 hex, in the same battle', () => {
    const d = play(build({ legions: JULIAN_BOTTOM, first: 'top', units: [top('MI', [2, 6]), bottom('MI', [6, 6])] }), 'orderMedium', ['u1']);
    expect(longest(pieceMoves(d.state, 'u1'))).toBe(1);
  });

  it('after a 2-hex march the unit may not battle at all: no close combat and no fire', () => {
    // bottom MI marches (6,6) -> (4,6) next to the top unit on (3,6), with a second top unit 2 hexes away from (4,6) to shoot at
    const s = build({ legions: JULIAN_BOTH, units: [bottom('MI', [6, 6]), top('MI', [3, 6]), top('MI', [8, 10]), bottom('MI', [8, 8])] });
    const d = play(s, 'orderMedium', ['u1', 'u4']);
    must(d, { kind: 'move', piece: 'u1', to: H(4, 6) });
    expect(d.state.turn.ordered.u1.moved).toBe(2);
    expect(battleTargets(d.state, 'u1')).toEqual([]);
    // the same unit that moved 1 hex fights: close combat when adjacent
    const near = play(build({ legions: JULIAN_BOTH, units: [bottom('MI', [5, 6]), top('MI', [3, 6]), top('MI', [8, 10]), bottom('MI', [8, 8])] }), 'orderMedium', ['u1', 'u4']);
    must(near, { kind: 'move', piece: 'u1', to: H(4, 6) });
    expect(near.state.turn.ordered.u1.moved).toBe(1);
    expect(battleTargets(near.state, 'u1')).toEqual([{ hex: H(3, 6), kind: 'close' }]);
  });

  it('Line Command allows 1 hex only (no march), after which the unit may fire; Double Time gives 2 hexes and battle, never 3', () => {
    const line = play(build({ legions: JULIAN_BOTH, units: [bottom('MI', [6, 6]), top('MI', [2, 6])] }), 'lineCommand', ['u1']);
    expect(longest(pieceMoves(line.state, 'u1'))).toBe(1);
    const fire = play(build({ legions: JULIAN_BOTH, units: [bottom('MI', [5, 6]), top('MI', [2, 6])] }), 'lineCommand', ['u1']);
    must(fire, { kind: 'move', piece: 'u1', to: H(4, 6) });
    expect(battleTargets(fire.state, 'u1')).toEqual([{ hex: H(2, 6), kind: 'ranged' }]);
    const dt = play(build({ legions: JULIAN_BOTH, units: [bottom('MI', [6, 6])] }), 'doubleTime', ['u1']);
    const moves = pieceMoves(dt.state, 'u1');
    expect(longest(moves)).toBe(2);
    expect(moves.every((m) => m.canBattle)).toBe(true);
  });

  it('an MI still rolls 4 dice and an HI 5: nothing else about the unit changes', () => {
    const dice = (type: 'MI' | 'HI', legions: Pos['legions']) => {
      const d = toBattle(build({ legions, units: [bottom(type, [5, 6]), top('MI', [4, 6])] }), type === 'MI' ? 'orderMedium' : 'orderHeavy', ['u1']);
      ev(d);
      forceDice(n('light', 30));
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      return combatDice(ev(d), 'close');
    };
    for (const legions of [undefined, JULIAN_BOTH]) {
      expect([legions === undefined, dice('MI', legions), dice('HI', legions)]).toEqual([legions === undefined, 4, 5]);
    }
  });
});

describe('Julian legions with Caesar (§18.3)', () => {
  it('an MI with Caesar attached moves 2 hexes and still battles', () => {
    const d = play(build({ legions: JULIAN_BOTTOM, units: [bottom('MI', [6, 6]), top('MI', [3, 6])], leaders: [caesar([6, 6])] }), 'orderMedium', ['u1']);
    const moves = pieceMoves(d.state, 'u1');
    expect(longest(moves)).toBe(2);
    expect(moves.every((m) => m.canBattle)).toBe(true);
    must(d, { kind: 'move', piece: 'u1', to: H(4, 6) });
    expect(d.state.leaders[0].hex).toBe(H(4, 6)); // Caesar goes with his unit
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(3, 6), kind: 'close' }]);
  });

  it('and rolls one die more in that close combat (Caesar, after any caps); without him the same attack rolls 4', () => {
    const closeDice = (from: [number, number], leader: NonNullable<Pos['leaders']>[number]) => {
      const d = play(build({ legions: JULIAN_BOTTOM, units: [bottom('MI', from), top('MI', [3, 6])], leaders: [leader] }), 'orderMedium', ['u1']);
      must(d, { kind: 'move', piece: 'u1', to: H(4, 6) });
      ev(d);
      forceDice(n('light', 30));
      must(d, { kind: 'attack', unit: 'u1', target: H(3, 6) });
      return combatDice(ev(d), 'close');
    };
    expect(closeDice([5, 6], caesar([5, 6]))).toBe(5);
    expect(closeDice([6, 6], caesar([6, 6]))).toBe(5); // after the 2-hex march
    expect(closeDice([5, 6], { side: 'bottom', name: 'Legate', at: [5, 6] })).toBe(4);
  });

  it('an HI with Caesar does the same; a unit without Caesar marches 2 only without battle', () => {
    const hi = play(build({ legions: JULIAN_BOTTOM, units: [bottom('HI', [6, 6])], leaders: [caesar([6, 6])] }), 'orderHeavy', ['u1']);
    expect(longest(pieceMoves(hi.state, 'u1'))).toBe(2);
    expect(pieceMoves(hi.state, 'u1').every((m) => m.canBattle)).toBe(true);
    const plain = play(build({ legions: JULIAN_BOTTOM, units: [bottom('HI', [6, 6])], leaders: [{ side: 'bottom', at: [6, 6] }] }), 'orderHeavy', ['u1']);
    expect(pieceMoves(plain.state, 'u1').filter((m) => m.canBattle).every((m) => m.dist === 1)).toBe(true);
    expect(longest(pieceMoves(plain.state, 'u1'))).toBe(2);
  });

  it('Double Time adds no third hex for a Julian unit with Caesar', () => {
    const d = play(build({ legions: JULIAN_BOTTOM, units: [bottom('MI', [6, 6])], leaders: [caesar([6, 6])] }), 'doubleTime', ['u1']);
    const moves = pieceMoves(d.state, 'u1');
    expect(longest(moves)).toBe(2);
    expect(moves.every((m) => m.canBattle)).toBe(true);
  });

  describe('the pilum', () => {
    // a second pair elsewhere keeps the turn open: u3 is ordered with u1
    const p = (from: [number, number], enemy: [number, number] = [2, 6]): Pos => ({
      legions: JULIAN_BOTTOM, units: [bottom('MI', from), top('HI', enemy), bottom('MI', [8, 10]), top('MI', [7, 10])], leaders: [caesar(from)],
    });

    it('fires with 1 die after 1 hex and cannot fire after 2 hexes, with Caesar too', () => {
      const near = play(build(p([5, 6])), 'orderMedium', ['u1', 'u3']);
      must(near, { kind: 'move', piece: 'u1', to: H(4, 6) });
      expect(near.state.turn.ordered.u1.moved).toBe(1);
      expect(battleTargets(near.state, 'u1')).toEqual([{ hex: H(2, 6), kind: 'ranged' }]);
      must(near, { kind: 'endMove' });
      ev(near);
      forceDice(n('medium', 4));
      must(near, { kind: 'attack', unit: 'u1', target: H(2, 6) });
      expect(combatDice(ev(near), 'ranged')).toBe(1);

      const far = play(build(p([6, 6])), 'orderMedium', ['u1', 'u3']);
      must(far, { kind: 'move', piece: 'u1', to: H(4, 6) });
      expect(far.state.turn.ordered.u1.moved).toBe(2);
      expect(canFireAt(far.state, far.state.units[0], H(2, 6))).toBe(true); // in range and in sight, but it moved 2
      expect(battleTargets(far.state, 'u1')).toEqual([]);
    });

    it('after 2 hexes with Caesar it can still close combat an adjacent enemy', () => {
      const close = play(build({ ...p([6, 6], [3, 6]) }), 'orderMedium', ['u1', 'u3']);
      must(close, { kind: 'move', piece: 'u1', to: H(4, 6) });
      expect(battleTargets(close.state, 'u1')).toEqual([{ hex: H(3, 6), kind: 'close' }]);
    });

    it('a Julian unit that stands still fires with 1 die at distance 2', () => {
      const d = toBattle(build(p([4, 6])), 'orderMedium', ['u1', 'u3']);
      expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(2, 6), kind: 'ranged' }]);
      ev(d);
      forceDice(n('medium', 4));
      must(d, { kind: 'attack', unit: 'u1', target: H(2, 6) });
      expect(combatDice(ev(d), 'ranged')).toBe(1);
    });
  });
});

describe('immobile units (306 Bibracte, §18.11, X3 Q15)', () => {
  /** u1: a Roman AX recruit; u2: a Gallic MI two hexes away (target of its fire); u3: a Roman MI elsewhere. */
  const recruits = (extra: Partial<Pos> = {}): Pos => ({
    units: [bottom('AX', [5, 6], { immobile: true }), top('MI', [3, 6]), bottom('MI', [7, 1])],
    ...extra,
  });

  describe('scenario data', () => {
    it('`immobile: true` marks the unit; others carry no such field; cloneState keeps it', () => {
      const s = build(recruits());
      expect(s.units.map((x) => x.immobile)).toEqual([true, undefined, undefined]);
      expect('immobile' in s.units[1]).toBe(false);
      expect(cloneState(s).units[0].immobile).toBe(true);
      expect('immobile' in build(recruits({ units: [bottom('AX', [5, 6], { immobile: false })] })).units[0]).toBe(false);
    });

    it('rejects a value that is not true or false, and an immobile piece off the board', () => {
      const bad = (p: Pos) => () => createGame(setupOf(p), 1);
      expect(bad(recruits({ units: [bottom('AX', [5, 6], { immobile: 'yes' as unknown as boolean })] })))
        .toThrow(/^unit immobile at 5,6 must be true or false \(qa\)$/);
      const reserves = [{ side: 'bottom', type: 'AX', immobile: true }] as unknown as Pos['reserves'];
      expect(bad(recruits({ rules: ['magoAmbush'], reserves })))
        .toThrow(/^reserve unit AX: immobile is only for units on the board \(qa\)$/);
    });
  });

  it('may be ordered (the order is spent on it) but has nowhere to move, not even with Double Time or an exit', () => {
    // an enemy next to it keeps the turn open (it may close combat)
    const engaged = recruits({ units: [bottom('AX', [5, 6], { immobile: true }), top('MI', [4, 6])] });
    for (const kind of ['order4C', 'doubleTime', 'lineCommand'] as const) {
      const d = play(build(engaged), kind, ['u1']);
      expect([kind, d.pending?.kind, Object.keys(d.state.turn.ordered)]).toEqual([kind, 'battle', ['u1']]);
      expect(pieceMoves(d.state, 'u1')).toEqual([]);
      expect(unitMoves(d.state, 'u1')).toEqual([]);
      expect(movablePieces(d.state, 1)).toEqual([]);
    }
    // on an exit hex (the enemy baseline) it may not step off the board either; an ordinary auxilia may
    const onExit = (immobile: boolean) => recruits({
      units: [bottom('AX', [0, 6], { immobile }), top('MI', [2, 2])], objectives: [{ kind: 'exit', side: 'bottom', hexes: [[0, 6]] }],
    });
    expect(pieceMoves(play(build(onExit(true)), 'order4C', ['u1']).state, 'u1')).toEqual([]);
    expect(pieceMoves(play(build(onExit(false)), 'order4C', ['u1']).state, 'u1').some((m) => m.hex === OFF_BOARD)).toBe(true);
    // the same unit without the flag moves
    expect(pieceMoves(play(build(recruits({ units: [bottom('AX', [5, 6]), top('MI', [3, 6])] })), 'order4C', ['u1']).state, 'u1').length).toBeGreaterThan(0);
  });

  it('fires as a unit that did not move: 2 dice', () => {
    const d = play(build(recruits()), 'order4C', ['u1']);
    expect(d.pending?.kind).toBe('battle'); // nothing could move
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(3, 6), kind: 'ranged' }]);
    ev(d);
    forceDice(n('heavy', 2));
    must(d, { kind: 'attack', unit: 'u1', target: H(3, 6) });
    expect(combatDice(ev(d), 'ranged', 'u1')).toBe(2);
  });

  it('close combats, but never momentum advances (so no bonus combat); an ordinary auxilia does', () => {
    const fight = (immobile: boolean) => {
      const s = build({ units: [bottom('AX', [5, 6], { immobile }), top('MI', [4, 6]), top('MI', [4, 8])] });
      s.units[1].blocks = 1;
      const d = play(s, 'order4C', ['u1']);
      if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
      forceDice(n('medium', 3));
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      expect(u(d, 'u2')).toBeUndefined();
      return d;
    };
    const still = fight(true);
    expect(still.pending?.kind).not.toBe('momentum');
    expect(u(still, 'u1')!.hex).toBe(H(5, 6));
    expect(fight(false).pending).toMatchObject({ kind: 'momentum', unit: 'u1', hex: H(4, 6) });
  });

  it('battles back as usual', () => {
    const d = play(build(recruits({ first: 'top', units: [bottom('AX', [5, 6], { immobile: true }), top('MI', [4, 6])] })), 'order4C', ['u2']);
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    ev(d);
    forceDice([...n('heavy', 4), ...n('light', 3)]); // the MI misses the light auxilia; the auxilia battles back
    must(d, { kind: 'attack', unit: 'u2', target: H(5, 6) });
    expect(combatDice(ev(d), 'battleBack', 'u1')).toBe(3);
  });

  it('retreats normally when a flag forces it, and stays immobile afterwards', () => {
    const d = play(build(recruits({ first: 'top', units: [bottom('AX', [5, 6], { immobile: true }), top('MI', [4, 6])] })), 'order4C', ['u2']);
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    forceDice(['flag', ...n('heavy', 3)]);
    must(d, { kind: 'attack', unit: 'u2', target: H(5, 6) });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    const ax = u(d, 'u1')!;
    expect(ax.hex === H(6, 6) || ax.hex === H(6, 7)).toBe(true);
    expect(ax.immobile).toBe(true);
    while (d.pending?.kind === 'battle' || d.pending?.kind === 'momentum') {
      must(d, d.pending.kind === 'battle' ? { kind: 'endBattle' } : { kind: 'yesno', yes: false });
    }
    const card = giveCard(d.state, 'bottom', 'order4C');
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1'] });
    expect(pieceMoves(d.state, 'u1')).toEqual([]);
  });

  it('never evades, even when its type could: no evade option, so nothing to choose (§18.11)', () => {
    // a light infantry may evade a medium infantry's close combat; an immobile one may not (it never moves)
    const attacked = (immobile: boolean) => {
      const s = build({ first: 'top', units: [bottom('LI', [5, 6], { immobile }), top('MI', [4, 6])] });
      noFirstStrike(s);
      expect(evadeOptions(s, s.units[0]).length > 0).toBe(!immobile);
      const d = play(s, 'order4C', ['u2']);
      if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
      forceDice(n('heavy', 4));
      must(d, { kind: 'attack', unit: 'u2', target: H(5, 6) });
      return d;
    };
    expect(attacked(false).pending).toMatchObject({ kind: 'defend', canEvade: true });
    const still = attacked(true);
    expect(still.pending?.kind).not.toBe('defend'); // no evade and no First Strike: the combat is fought at once
    expect(still.answer({ kind: 'defend', choice: 'evade' })).toBe(false);
    expect(u(still, 'u1')!.hex).toBe(H(5, 6));
  });

  it('a leader may move onto it and attach; the unit still cannot move', () => {
    const d = play(build(recruits({ leaders: [{ side: 'bottom', name: 'Legate', at: [6, 6] }] })), 'order4C', ['u1', 'L4']);
    expect(pieceMoves(d.state, 'L4').find((m) => m.hex === H(5, 6))).toMatchObject({ attachesTo: 'u1' });
    ev(d);
    must(d, { kind: 'move', piece: 'L4', to: H(5, 6) });
    expect(ev(d)).toContainEqual({ t: 'attach', leader: 'L4', unit: 'u1' });
    expect(pieceMoves(d.state, 'u1')).toEqual([]);
  });

  it('306 itself: the two recruits in the Roman camps are immobile, no other unit is', () => {
    const s = createGame(scenarioById('306').setup, 1);
    expect(s.units.filter((x) => x.immobile).map((x) => [x.side, x.type, x.hex])).toEqual([
      ['bottom', 'AX', H(8, 4)], ['bottom', 'AX', H(8, 5)],
    ]);
  });
});

describe('304 Valentia: both Sertorian leaders carry a command (§18.5, X3 Q16)', () => {
  const MIXED = 'One card orders one army only.';
  const COMMANDS: Pos['commands'] = [
    { id: 'herennius', name: 'Herennius', side: 'top' }, { id: 'perpenna', name: 'Perpenna', side: 'top', blocks: 'grk' },
  ];
  const her = (type: UnitType, at: [number, number], extra: Partial<PosUnit> = {}) => top(type, at, { command: 'herennius', ...extra });
  const per = (type: UnitType, at: [number, number], extra: Partial<PosUnit> = {}) => top(type, at, { command: 'perpenna', ...extra });
  /** u1 MI (2,5) and u2 AX (2,6) of Herennius; u3 MI (2,7) and u4 MI (2,8) of Perpenna; u5 a Roman MI. */
  const units = [her('MI', [2, 5]), her('AX', [2, 6]), per('MI', [2, 7]), per('MI', [2, 8]), bottom('MI', [6, 6])];
  const err = (s: ReturnType<typeof build>, kind: 'leadershipAny' | 'inspiredC', pieces: string[]) => validateOrders(s, 'top', kind, pieces);

  it('a Leadership card on a leader orders only his own command', () => {
    // Herennius with u1, Perpenna with u4 (L6, L7)
    const s = build({ commands: COMMANDS, first: 'top', units, leaders: [
      { side: 'top', name: 'Herennius', at: [2, 5], command: 'herennius' }, { side: 'top', name: 'Perpenna', at: [2, 8], command: 'perpenna' },
    ] });
    expect(err(s, 'leadershipAny', ['L6', 'u1', 'u2'])).toBeNull();
    expect(err(s, 'leadershipAny', ['L6', 'u1', 'u2', 'u3'])).toBe(MIXED);
    expect(err(s, 'leadershipAny', ['L7', 'u4', 'u3'])).toBeNull();
    expect(err(s, 'leadershipAny', ['L7', 'u4', 'u3', 'u2'])).toBe(MIXED);
  });

  it('a lone leader is ordered alone or with his own command only, never with the other leader', () => {
    // lone Herennius (3,5) next to u2; lone Perpenna (3,6) next to u2 and u3 (L6, L7)
    const s = build({ commands: COMMANDS, first: 'top', units, leaders: [
      { side: 'top', name: 'Herennius', at: [3, 5], command: 'herennius' }, { side: 'top', name: 'Perpenna', at: [3, 6], command: 'perpenna' },
    ] });
    expect(err(s, 'leadershipAny', ['L6'])).toBeNull();
    expect(err(s, 'leadershipAny', ['L7'])).toBeNull();
    expect(err(s, 'leadershipAny', ['L6', 'u2'])).toBeNull();
    expect(err(s, 'leadershipAny', ['L6', 'u2', 'u3'])).toBe(MIXED);
    expect(err(s, 'leadershipAny', ['L7', 'u3'])).toBeNull();
    expect(err(s, 'leadershipAny', ['L7', 'u2'])).toBe(MIXED);
    expect(err(s, 'leadershipAny', ['L6', 'L7'])).toBe(MIXED);
  });

  it('Rally names one command; a leader of the other command still counts for the adjacency', () => {
    // u1 (Herennius' MI, damaged) carries Herennius; u3 (Perpenna's MI, damaged) stands next to him only; Perpenna is far off
    const s = build({ commands: COMMANDS, first: 'top', units: [
      her('MI', [2, 5], { blocks: 2 }), her('AX', [2, 6]), per('MI', [2, 4], { blocks: 2 }), per('MI', [0, 11]), bottom('MI', [6, 6]),
    ], leaders: [
      { side: 'top', name: 'Herennius', at: [2, 5], command: 'herennius' }, { side: 'top', name: 'Perpenna', at: [0, 11], command: 'perpenna' },
    ] });
    forceDice(['medium', ...n('flag', 4)]);
    const d = play(s, 'rally');
    expect(d.pending).toEqual({ kind: 'chooseCommand', side: 'top', options: ['herennius', 'perpenna'] });
    must(d, { kind: 'choose', index: 1 });
    expect(d.answer({ kind: 'assign', ids: ['u1', null, null, null, null] })).toBe(false);
    must(d, { kind: 'assign', ids: ['u3', null, null, null, null] });
    expect(u(d, 'u3')!.blocks).toBe(3);
  });

  it('304 itself: each leader commands his own wing, and the Romans are free', () => {
    const s = createGame(scenarioById('304').setup, 1);
    const at = (r: number, c: number) => s.units.find((x) => x.hex === H(r, c))!.id;
    const leader = (name: string) => s.leaders.find((l) => l.name === name)!;
    const [herennius, perpenna] = [leader('Herennius'), leader('Perpenna')];
    expect([herennius.command, perpenna.command]).toEqual(['herennius', 'perpenna']);
    expect(validateOrders(s, 'top', 'leadershipAny', [herennius.id, at(2, 5), at(2, 4), at(2, 6)])).toBeNull();
    expect(validateOrders(s, 'top', 'leadershipAny', [perpenna.id, at(1, 10), at(1, 9), at(0, 10)])).toBeNull();
    expect(validateOrders(s, 'top', 'leadershipAny', [perpenna.id, at(1, 10), at(1, 9), at(2, 6)])).not.toBeNull();
    const romans = s.units.filter((x) => x.side === 'bottom').map((x) => x.id);
    expect(s.units.filter((x) => x.side === 'bottom').every((x) => x.command === undefined)).toBe(true);
    expect(validateOrders(s, 'bottom', 'orderMedium', romans.filter((id) => s.units.find((x) => x.id === id)!.type === 'MI').slice(0, 3))).toBeNull();
  });
});
