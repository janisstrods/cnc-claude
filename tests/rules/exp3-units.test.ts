// Expansion #3 units (rules-reference §18.2, §18.3, §20): Julian legions (the pilum and the march, for one or both armies)
// and Caesar's forced march. The engine for both exists since Expansion #2; these tests pin the Expansion #3 readings.
import { beforeEach, describe, expect, it } from 'vitest';
import { battleTargets, canFireAt, canMarch, hasPilum, pieceMoves, type LeaderTrait, type UnitType } from '../../src/engine';
import { H, build, combatDice, ev, forceDice, must, n, play, toBattle, type Pos } from './helpers';

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
