// Expansion #2 units (rules-reference §18; design/exp2-rulings.md): the Barbarian light chariot (BCH, Q1), the pilum, the
// march and the Tenth Legion (Q2, Q3), Caesar and Spartacus (Q4, Q5).
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ARMY_LOOKS, BLOCKS, ELITES, GameDriver, OFF_BOARD, UNIT_STATS, UNIT_TYPES, autoOrders, baseSwordIgnores, battleTargets, canEvadeType, canFireAt,
  canMarch, canShoot, createGame, eliteHas, escapeDice, fireMoveLimit, hasPilum, ignorableFlags, pieceMoves, rangeOf, rangedBaseDice, retreatPerFlag,
  scoreClose, validateOrders,
  type CardKind, type DieFace, type LeaderTrait, type Side, type Unit, type UnitType,
} from '../../src/engine';
import {
  H, attackOn, build, combatDice, duel, ev, forceDice, giveCard, leaderId, miss, must, n, noFirstStrike, play, rolls, setupOf, toBattle, u,
  type Pos,
} from './helpers';

beforeEach(() => forceDice([]));

/** The two units of a scoring state (bottom `atk` is u1, top `def` is u2). */
function pair(atk: UnitType, def: UnitType, defBlocks?: number) {
  const s = build({ units: [{ side: 'bottom', type: atk, at: [5, 6] }, { side: 'top', type: def, at: [4, 6], blocks: defBlocks }] });
  return { s, a: s.units[0], d: s.units[1] };
}

const S = (type: UnitType) => build({ units: [{ side: 'top', type, at: [4, 6] }] }).units[0];

type PosUnit = NonNullable<Pos['units']>[number];
/** A board unit of the bottom / top side, for `build`. */
const bottom = (type: UnitType, at: [number, number], extra: Partial<PosUnit> = {}): PosUnit => ({ side: 'bottom', type, at, ...extra });
const top = (type: UnitType, at: [number, number], extra: Partial<PosUnit> = {}): PosUnit => ({ side: 'top', type, at, ...extra });

// ---------------------------------------------------------------------------------------------
// Scaffold: ids of the Expansion #2 block sets and army looks

describe('Expansion #2 ids', () => {
  it('the new block sets and army looks exist', () => {
    expect([...BLOCKS]).toEqual(['rom', 'car', 'grk', 'eas', 'bar', 'gry']);
    for (const look of ['gallic', 'germanic', 'slave', 'belgic', 'briton', 'marian']) expect(ARMY_LOOKS as readonly string[]).toContain(look);
  });
  it('the Barbarian light chariot is a unit type of the table', () => {
    expect(UNIT_TYPES).toContain('BCH');
  });
});

// ---------------------------------------------------------------------------------------------
// Barbarian light chariot (BCH): Q1

describe('Barbarian light chariot (BCH): stats', () => {
  it('3 blocks, move 3 and battle, 2 dice (3 at full strength), no ranged weapon, retreat 3, chariot not cavalry', () => {
    expect(UNIT_STATS.BCH).toMatchObject({
      name: 'Barbarian Chariots', cls: 'light', whiteBorder: true, foot: false, infantry: false, mounted: true, cavalry: false, chariot: true,
      blocks: 3, move: 3, moveBattle: 3, cc: 2, ccBack: 2, range: 0, retreat: 3, swordHits: true, evade: 'always',
      swordIgnore: 1, fullStrengthBonus: true, noRally: true, frightenedBy: ['EL', 'CAM'], momentumExtraHex: false, mountedChargeMove: false,
    });
  });
  it('cannot be rallied', () => {
    expect(UNIT_STATS.BCH.noRally).toBe(true);
  });
});

describe('Barbarian light chariot (BCH): movement and ranged combat', () => {
  it('moves up to 3 hexes and may battle after any move', () => {
    const s = build({ units: [{ side: 'bottom', type: 'BCH', at: [4, 6] }] });
    const d = play(s, 'order4C', ['u1']);
    const moves = pieceMoves(d.state, 'u1');
    expect(Math.max(...moves.map((m) => m.dist))).toBe(3);
    expect(moves.every((m) => m.canBattle)).toBe(true);
  });
  it('has no ranged attack: an enemy two hexes away is no target, an adjacent one is a close target', () => {
    const far = build({ units: [{ side: 'bottom', type: 'BCH', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 4] }] });
    expect(battleTargets(toBattle(far, 'orderLight', ['u1']).state, 'u1')).toEqual([]);
    const near = build({ units: [{ side: 'bottom', type: 'BCH', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 3] }] });
    expect(battleTargets(toBattle(near, 'orderLight', ['u1']).state, 'u1')).toEqual([{ hex: H(4, 3), kind: 'close' }]);
  });
});

describe('Barbarian light chariot (BCH): cards', () => {
  // u1 BCH, u2 LI, u3 MI, u4 HI, u5 HCH
  const army = () => build({
    units: [
      { side: 'bottom', type: 'BCH', at: [6, 2] }, { side: 'bottom', type: 'LI', at: [6, 4] }, { side: 'bottom', type: 'MI', at: [6, 6] },
      { side: 'bottom', type: 'HI', at: [6, 8] }, { side: 'bottom', type: 'HCH', at: [6, 10] },
    ],
  });
  const every = ['u1', 'u2', 'u3', 'u4', 'u5'];
  const ok = (k: CardKind) => {
    const s = army();
    return every.filter((id) => validateOrders(s, 'bottom', k, [id]) === null);
  };
  it('Order Light Troops and Move-Fire-Move order it (it is light)', () => {
    expect(ok('orderLight')).toEqual(['u1', 'u2']);
    expect(ok('moveFireMove')).toEqual(['u1', 'u2']);
  });
  it('Order Mounted and Mounted Charge order it with the other mounted units', () => {
    expect(ok('orderMounted')).toEqual(['u1', 'u5']);
    expect(ok('mountedCharge')).toEqual(['u1', 'u5']);
  });
  it('Order Medium and Order Heavy Troops do not; it is not foot (Line Command)', () => {
    expect(ok('orderMedium')).toEqual(['u3']);
    expect(ok('orderHeavy')).toEqual(['u4', 'u5']);
    expect(ok('lineCommand')).toEqual(['u2', 'u3', 'u4']);
  });
  it('Darken the Sky orders no chariots (it has no missile weapon)', () => {
    expect(autoOrders(army(), 'bottom', 'darken')).toEqual(['u2']);
  });
});

describe('Barbarian light chariot (BCH): close combat dice', () => {
  it('attacking at full strength it rolls 3 dice; after losing a block, 2', () => {
    expect(duel('BCH', 'MI').attack).toBe(3);
    expect(duel('BCH', 'MI', { atkBlocks: 2 }).attack).toBe(2);
    expect(duel('BCH', 'MI', { atkBlocks: 1 }).attack).toBe(2);
  });
  it('battling back at full strength it rolls 3; after losing a block, 2', () => {
    expect(duel('HI', 'BCH').back).toBe(3);
    expect(duel('HI', 'BCH', { defBlocks: 2 }).back).toBe(2);
  });
  it('a full-strength chariot that loses a block in the same combat keeps its 3 dice when battling back', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'BCH', at: [4, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    forceDice(['light', 'medium', 'medium', 'medium', 'medium', ...n(miss('HI', 'BCH'), 6)]); // 1 hit on the chariot; its battle back (3 dice) misses the HI
    must(d, { kind: 'defend', choice: 'stand' });
    expect(u(d, 'u2')!.blocks).toBe(2);
    expect(combatDice(ev(d), 'battleBack')).toBe(3);
  });
  it('Mounted Charge adds 1 die: 4 at full strength, 3 after a loss', () => {
    expect(duel('BCH', 'MI', { card: 'mountedCharge' }).attack).toBe(4);
    expect(duel('BCH', 'MI', { card: 'mountedCharge', atkBlocks: 2 }).attack).toBe(3);
  });
  it('an elephant attacking it rolls 2 dice', () => {
    expect(duel('EL', 'BCH').attack).toBe(2);
  });
  it('a leader escaping through its hex meets 3 dice at full strength, 2 after a loss', () => {
    expect(escapeDice(S('BCH'))).toBe(3);
    expect(escapeDice(build({ units: [{ side: 'top', type: 'BCH', at: [4, 6], blocks: 2 }] }).units[0])).toBe(2);
  });
});

describe('Barbarian light chariot (BCH): hits', () => {
  it('it scores swords (the class symbol for a light unit is a green circle)', () => {
    const { s, a, d } = pair('BCH', 'HI');
    expect(scoreClose(s, a, d, ['swords', 'heavy', 'light'], false, 'attack').hits).toBe(2);
    expect(scoreClose(s, a, d, ['swords', 'swords', 'swords'], false, 'attack').hits).toBe(3);
  });
  it('it ignores 1 sword rolled against it: two swords and a green circle score 2 hits, three swords 2 hits', () => {
    const { s, a, d } = pair('HI', 'BCH');
    expect(scoreClose(s, a, d, ['swords', 'swords', 'light', 'flag', 'flag'], false, 'attack').hits).toBe(2);
    expect(scoreClose(s, a, d, ['swords', 'medium', 'heavy'], false, 'attack').hits).toBe(0);
    // exactly one sword is ignored, not all of them
    expect(scoreClose(s, a, d, ['swords', 'swords', 'swords'], false, 'attack').hits).toBe(2);
  });
  it('flow: heavy infantry rolling two swords, a green circle and two misses takes 2 blocks off a full-strength chariot', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'BCH', at: [4, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    forceDice(['swords', 'swords', 'light', 'medium', 'medium', ...n(miss('HI', 'BCH'), 6)]); // the chariot's battle back misses the HI
    must(d, { kind: 'defend', choice: 'stand' });
    expect(u(d, 'u2')!.blocks).toBe(1);
  });
});

describe('Barbarian light chariot (BCH): flags and retreat', () => {
  const ctx = { kind: 'close' as const, leaderAlive: false, fullAtStart: true };
  it('a full-strength chariot may ignore 1 flag (no leader, no support); a damaged one none', () => {
    const { s, a, d } = pair('HI', 'BCH');
    expect(ignorableFlags(s, d, { ...ctx, striker: a })).toBe(1);
    expect(ignorableFlags(s, d, { ...ctx, fullAtStart: false, striker: a })).toBe(0);
  });
  it('flow: a full-strength chariot hit by flags is offered the ignore', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'BCH', at: [4, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    forceDice(['flag', 'medium', 'medium', 'medium', 'medium', ...n(miss('HI', 'BCH'), 6)]);
    must(d, { kind: 'defend', choice: 'stand' });
    expect(d.pending?.kind).toBe('ignoreFlags');
  });
  it('retreats 3 hexes per flag, 4 when the flag was rolled by an elephant or a camel', () => {
    expect(retreatPerFlag(S('BCH'), S('HI'))).toBe(3);
    expect(retreatPerFlag(S('BCH'), S('HCH'))).toBe(3);
    expect(retreatPerFlag(S('BCH'), S('EL'))).toBe(4);
    expect(retreatPerFlag(S('BCH'), S('CAM'))).toBe(4);
  });
});

describe('Barbarian light chariot (BCH): evade', () => {
  it('may always evade, whatever attacks it', () => {
    for (const atk of UNIT_TYPES) expect([atk, canEvadeType('BCH', atk)]).toEqual([atk, true]);
    expect(canEvadeType('BCH', 'HI')).toBe(true);
  });
  it('flow: the defend decision offers the evade', () => {
    for (const atk of ['HI', 'EL', 'HC', 'CAM'] as UnitType[]) {
      const d = attackOn(atk, 'BCH');
      expect([atk, d.pending?.kind === 'defend' && d.pending.canEvade]).toEqual([atk, true]);
    }
  });
});

describe('Barbarian light chariot (BCH): momentum', () => {
  function bchWins() {
    const s = build({ units: [
      { side: 'bottom', type: 'BCH', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }, { side: 'top', type: 'MI', at: [3, 6] },
    ] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['medium', 'light', 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')).toBeUndefined();
    return d;
  }
  it('after eliminating the defender: momentum advance, then the bonus close combat, no cavalry extra hex', () => {
    const d = bchWins();
    expect(d.pending).toMatchObject({ kind: 'momentum', hex: H(4, 6), bonus: false });
    must(d, { kind: 'yesno', yes: true });
    expect(d.pending?.kind).not.toBe('cavalryExtra');
    expect(d.pending).toMatchObject({ kind: 'bonusCombat', targets: [H(3, 6)] });
  });
  it('the bonus close combat is a new combat: 3 dice at full strength', () => {
    const d = bchWins();
    must(d, { kind: 'yesno', yes: true });
    ev(d);
    forceDice(n('heavy', 3 + 4));
    must(d, { kind: 'hex', hex: H(3, 6) });
    expect(combatDice(ev(d), 'bonus')).toBe(3);
  });
});

// ---------------------------------------------------------------------------------------------
// Pilum, march, Marius legions and the Tenth Legion (§18.2; rulings Q2, Q3)

describe('pilum and march', () => {
  const MARIUS: Pos['legions'] = { bottom: 'marius' };
  const unitOf = (type: UnitType, extra: Partial<Unit> = {}): Unit => ({ ...build({ units: [{ side: 'bottom', type, at: [4, 6] }] }).units[0], ...extra });

  /** Order u1 with `card`, optionally move it, then fire at `target` (every die misses a medium target); the ranged dice. */
  function shot(p: Pos, target: [number, number], opts: { card?: CardKind; move?: [number, number] } = {}) {
    const d = play(build(p), opts.card ?? 'orderMedium', ['u1']);
    if (opts.move) must(d, { kind: 'move', piece: 'u1', to: H(...opts.move) });
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    ev(d);
    forceDice(n('heavy', 4));
    must(d, { kind: 'attack', unit: 'u1', target: H(...target) });
    return combatDice(ev(d), 'ranged');
  }

  describe('helpers', () => {
    it('hasPilum: a legion unit or an elite with the pilum; canMarch: Julian legions or an elite with the march', () => {
      expect([hasPilum(unitOf('MI')), canMarch(unitOf('MI'))]).toEqual([false, false]);
      expect([hasPilum(unitOf('MI', { legion: 'marius' })), canMarch(unitOf('MI', { legion: 'marius' }))]).toEqual([true, false]);
      expect([hasPilum(unitOf('MI', { legion: 'julian' })), canMarch(unitOf('MI', { legion: 'julian' }))]).toEqual([true, true]);
      expect([hasPilum(unitOf('HI', { elite: 'tenthLegion' })), canMarch(unitOf('HI', { elite: 'tenthLegion' }))]).toEqual([true, true]);
      // ranged elites of Expansion #1 have neither
      expect([hasPilum(unitOf('MI', { elite: 'immortals' })), canMarch(unitOf('MI', { elite: 'immortals' }))]).toEqual([false, false]);
    });
    it('a pilum gives range 2 (a longer range of the unit stays); pilum units can be ordered by Darken the Sky', () => {
      expect(rangeOf(unitOf('MI', { legion: 'marius' }))).toBe(2);
      expect(rangeOf(unitOf('HI', { elite: 'tenthLegion' }))).toBe(2);
      expect(rangeOf(unitOf('MI'))).toBe(0);
      expect(rangeOf(unitOf('LB', { legion: 'marius' }))).toBe(3);
      expect(rangeOf(unitOf('MI', { elite: 'immortals', legion: 'marius' }))).toBe(3);
      expect(canShoot(unitOf('MI', { legion: 'marius' }))).toBe(true);
      expect(canShoot(unitOf('MI'))).toBe(false);
    });
    it('rangedBaseDice: always 1 for a pilum-only unit; 2 standing and 1 moved for every other missile unit', () => {
      for (const moved of [0, 1]) {
        expect(rangedBaseDice(unitOf('MI', { legion: 'marius' }), moved)).toBe(1);
        expect(rangedBaseDice(unitOf('HI', { elite: 'tenthLegion' }), moved)).toBe(1);
      }
      for (const t of ['LI', 'LB', 'LS', 'AX', 'LC', 'LBC', 'HWM'] as UnitType[]) {
        expect([t, rangedBaseDice(unitOf(t), 0), rangedBaseDice(unitOf(t), 1)]).toEqual([t, 2, 1]);
      }
      // an elite with its own ranged weapon keeps its 2 / 1
      expect([rangedBaseDice(unitOf('MI', { elite: 'immortals' }), 0), rangedBaseDice(unitOf('MI', { elite: 'immortals' }), 1)]).toEqual([2, 1]);
      expect([rangedBaseDice(unitOf('MI', { elite: 'immortals', legion: 'marius' }), 0), rangedBaseDice(unitOf('MI', { elite: 'immortals', legion: 'marius' }), 1)]).toEqual([2, 1]);
    });
    it('fireMoveLimit: the type limit, at most 2 hexes for a pilum unit', () => {
      expect(fireMoveLimit(unitOf('MI', { legion: 'marius' }))).toBe(2);
      expect(fireMoveLimit(unitOf('HI', { elite: 'tenthLegion' }))).toBe(2);
      expect(fireMoveLimit(unitOf('LI'))).toBe(UNIT_STATS.LI.noFireAfterMove);
      expect(fireMoveLimit(unitOf('AX'))).toBe(2);
      expect(fireMoveLimit(unitOf('HWM'))).toBe(1);
      expect(fireMoveLimit(unitOf('MI', { elite: 'immortals' }))).toBe(UNIT_STATS.MI.noFireAfterMove);
    });
  });

  describe('Marius legions (scenario data)', () => {
    it('stamp the legion on every MI and HI of the named side, on the board and in reserve; no other unit or side', () => {
      const s = build({
        legions: MARIUS, ambush: {},
        units: [bottom('MI', [6, 2]), bottom('HI', [6, 4]), bottom('LI', [6, 6]), bottom('WA', [6, 8]), top('MI', [2, 2]), top('HI', [2, 4])],
        reserves: [{ side: 'bottom', type: 'MI' }, { side: 'bottom', type: 'LI' }, { side: 'top', type: 'HI' }],
      });
      expect(s.units.map((x) => x.legion)).toEqual(['marius', 'marius', undefined, undefined, undefined, undefined]);
      expect(s.special.reserveUnits.map((x) => x.legion)).toEqual(['marius', undefined, undefined]);
      expect(s.units.every((x) => !('legion' in x) || x.legion !== undefined)).toBe(true);
    });
    it('a Julian legion stamps julian; both sides may have one', () => {
      const s = build({ legions: { bottom: 'julian', top: 'marius' }, units: [bottom('MI', [6, 2]), top('HI', [2, 4])] });
      expect(s.units.map((x) => x.legion)).toEqual(['julian', 'marius']);
    });
    it('without a legions entry nobody has the pilum', () => {
      const s = build({ units: [bottom('MI', [6, 2]), top('HI', [2, 4])] });
      expect(s.units.map((x) => hasPilum(x))).toEqual([false, false]);
    });
    it('unknown legions are rejected at setup', () => {
      expect(() => createGame(setupOf({ legions: { bottom: 'roman' as 'marius' } }), 1)).toThrow(/legion/);
      expect(() => createGame(setupOf({ legions: { left: 'marius' } as unknown as Pos['legions'] }), 1)).toThrow(/legion/);
    });
  });

  describe('pilum', () => {
    const duo = (from: [number, number], to: [number, number]): Pos => ({ legions: MARIUS, units: [bottom('MI', from), top('MI', to)] });

    it('a Marius MI fires at distance 2 with 1 die when it stood still', () => {
      const d = toBattle(build(duo([4, 2], [4, 4])), 'orderMedium', ['u1']);
      expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 4), kind: 'ranged' }]);
      expect(shot(duo([4, 2], [4, 4]), [4, 4])).toBe(1);
    });
    it('and with 1 die after moving 1 hex', () => {
      expect(shot(duo([4, 1], [4, 4]), [4, 4], { move: [4, 2] })).toBe(1);
    });
    it('cannot fire at distance 3', () => {
      const d = toBattle(build(duo([4, 2], [4, 5])), 'orderMedium', ['u1']);
      expect(battleTargets(d.state, 'u1')).toEqual([]);
    });
    it('cannot fire when an enemy unit is adjacent (it close combats that one)', () => {
      const p: Pos = { legions: MARIUS, units: [bottom('MI', [4, 2]), top('MI', [3, 2]), top('MI', [4, 4])] };
      expect(battleTargets(toBattle(build(p), 'orderMedium', ['u1']).state, 'u1')).toEqual([{ hex: H(3, 2), kind: 'close' }]);
    });
    it('cannot fire after moving 2 hexes (Double Time forbids ranged combat; the limit is 2 hexes whatever the card)', () => {
      const dt = play(build({ legions: MARIUS, units: [bottom('MI', [4, 0]), top('MI', [4, 4])] }), 'doubleTime', ['u1']);
      must(dt, { kind: 'move', piece: 'u1', to: H(4, 2) });
      expect(battleTargets(dt.state, 'u1')).toEqual([]);
      const d = toBattle(build(duo([4, 2], [4, 4])), 'orderMedium', ['u1']);
      expect(battleTargets(d.state, 'u1')).toHaveLength(1);
      d.state.turn.ordered.u1.moved = 1;
      expect(battleTargets(d.state, 'u1')).toHaveLength(1);
      d.state.turn.ordered.u1.moved = 2;
      expect(battleTargets(d.state, 'u1')).toEqual([]);
    });
    it('the other side of the same battle (no legion) has no ranged target', () => {
      const p: Pos = { legions: MARIUS, first: 'top', units: [top('MI', [4, 4]), bottom('MI', [4, 2])] };
      expect(battleTargets(toBattle(build(p), 'orderMedium', ['u1']).state, 'u1')).toEqual([]);
    });
    it('a Marius HI fires too (MI and HI)', () => {
      const p: Pos = { legions: MARIUS, units: [bottom('HI', [4, 2]), top('MI', [4, 4])] };
      expect(battleTargets(toBattle(build(p), 'orderHeavy', ['u1']).state, 'u1')).toEqual([{ hex: H(4, 4), kind: 'ranged' }]);
      expect(shot(p, [4, 4], { card: 'orderHeavy' })).toBe(1);
    });
    it('light and auxilia troops keep their own dice under the Marius rule: 2 standing', () => {
      expect(shot({ legions: MARIUS, units: [bottom('LI', [4, 2]), top('MI', [4, 4])] }, [4, 4], { card: 'orderLight' })).toBe(2);
      expect(shot({ legions: MARIUS, units: [bottom('AX', [4, 2]), top('MI', [4, 4])] }, [4, 4], { card: 'orderLight' })).toBe(2);
    });
    it('a pilum MI in a camp rolls 1 - 1 = 0 dice, so it has no ranged target (an LI in a camp still fires)', () => {
      const camp: Pos['terrain'] = [{ at: [4, 2], t: 'camp' }];
      const mi = toBattle(build({ ...duo([4, 2], [4, 4]), terrain: camp }), 'orderMedium', ['u1']);
      expect(battleTargets(mi.state, 'u1')).toEqual([]);
      const li = toBattle(build({ units: [bottom('LI', [4, 2]), top('MI', [4, 4])], terrain: camp }), 'orderLight', ['u1']);
      expect(battleTargets(li.state, 'u1')).toEqual([{ hex: H(4, 4), kind: 'ranged' }]);
    });
    it('Darken the Sky orders a pilum MI and it fires twice, 1 die each time', () => {
      const s = build({ legions: MARIUS, units: [bottom('MI', [4, 2]), bottom('MI', [6, 8]), bottom('HC', [6, 10]), top('MI', [4, 4])] });
      expect(autoOrders(s, 'bottom', 'darken')).toEqual(['u1', 'u2']);
      const d = play(s, 'darken');
      expect(d.pending?.kind).toBe('battle');
      ev(d);
      forceDice(n('heavy', 4));
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 4) });
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 4) });
      const dice = ev(d).filter((e) => e.t === 'combat' && e.purpose === 'ranged').map((e) => (e.t === 'combat' ? e.dice : -1));
      expect(dice).toEqual([1, 1]);
      expect(battleTargets(d.state, 'u1')).toEqual([]);
    });
    it('Order Light Troops does not order it (it is not light)', () => {
      const s = build({ legions: MARIUS, units: [bottom('MI', [4, 2]), bottom('LI', [6, 6]), top('MI', [4, 4])] });
      expect(validateOrders(s, 'bottom', 'orderLight', ['u1'])).not.toBeNull();
      expect(validateOrders(s, 'bottom', 'orderLight', ['u2'])).toBeNull();
      expect(validateOrders(s, 'bottom', 'moveFireMove', ['u1'])).not.toBeNull();
    });
    it('Line Command: it moves 1 hex and then fires', () => {
      expect(shot(duo([4, 1], [4, 4]), [4, 4], { card: 'lineCommand', move: [4, 2] })).toBe(1);
    });
    // a second pair elsewhere keeps the battle phase (and the turn) open after u1 has used its battle
    const pairElsewhere = [bottom('MI', [8, 10]), top('MI', [7, 10])];
    it('a unit that fired cannot close combat in the same turn', () => {
      const p: Pos = { legions: MARIUS, units: [bottom('MI', [4, 2]), top('MI', [4, 4]), ...pairElsewhere], leaders: [{ side: 'top', at: [3, 2] }] };
      const d = toBattle(build(p), 'orderMedium', ['u1', 'u3']);
      // a lone leader next to it does not stop its fire, and it could be attacked instead
      expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(3, 2), kind: 'close' }, { hex: H(4, 4), kind: 'ranged' }]);
      forceDice(n('heavy', 4));
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 4) });
      expect(d.state.turn.ordered.u1.battlesLeft).toBe(0);
      expect(battleTargets(d.state, 'u1')).toEqual([]);
    });
    it('and a unit that close combatted cannot fire in the same turn', () => {
      const p: Pos = { legions: MARIUS, units: [bottom('MI', [4, 2]), top('MI', [3, 2], { blocks: 1 }), top('MI', [4, 4]), bottom('MI', [8, 10]), top('MI', [7, 10])] };
      const d = toBattle(build(p), 'orderMedium', ['u1', 'u4']);
      forceDice(n('medium', 4));
      must(d, { kind: 'attack', unit: 'u1', target: H(3, 2) });
      expect(u(d, 'u2')).toBeUndefined();
      must(d, { kind: 'yesno', yes: false }); // no momentum advance
      expect(d.state.turn.ordered.u1.battlesLeft).toBe(0);
      // the other MI is now 2 hexes away with nothing adjacent, yet there is no battle left
      expect(battleTargets(d.state, 'u1')).toEqual([]);
    });
    it('the Immortals (Expansion #1) keep 2 dice standing and 1 moved at range 3, with or without a Marius legion', () => {
      for (const legions of [undefined, MARIUS]) {
        const p: Pos = { legions, units: [bottom('MI', [5, 2], { elite: 'immortals' }), top('HI', [5, 5])] };
        expect([legions, shot(p, [5, 5])]).toEqual([legions, 2]);
        const q: Pos = { legions, units: [bottom('MI', [6, 2], { elite: 'immortals' }), top('HI', [5, 5])] };
        expect([legions, shot(q, [5, 5], { move: [5, 2] })]).toEqual([legions, 1]);
        const far: Pos = { legions, units: [bottom('MI', [5, 1], { elite: 'immortals' }), top('HI', [5, 5])] };
        expect(battleTargets(toBattle(build(far), 'orderMedium', ['u1']).state, 'u1')).toEqual([]); // range 3 only
      }
    });
  });

  describe('Tenth Legion', () => {
    const tenth = (at: [number, number], extra: Partial<PosUnit> = {}): PosUnit => bottom('HI', at, { elite: 'tenthLegion', ...extra });

    it('the preset: an HI-only elite with the pilum and the march and nothing else', () => {
      expect(ELITES.tenthLegion).toMatchObject({ id: 'tenthLegion', name: 'Tenth Legion', abilities: ['pilum', 'march'], types: ['HI'] });
      const t = unitOf('HI', { elite: 'tenthLegion' });
      for (const a of ['helmetHits', 'ignoreFlag', 'ignoreSword', 'ranged'] as const) expect([a, eliteHas(t, a)]).toEqual([a, false]);
    });
    it('only heavy infantry may be the Tenth Legion', () => {
      expect(() => build({ units: [bottom('MI', [4, 2], { elite: 'tenthLegion' })] })).toThrow(/cannot be a MI unit/);
      expect(() => build({ units: [bottom('LI', [4, 2], { elite: 'tenthLegion' })] })).toThrow(/cannot be a LI unit/);
      expect(() => build({ units: [tenth([4, 2])] })).not.toThrow();
    });
    it('fires like a pilum unit: range 2, 1 die, 1 die after a 1-hex move, not at distance 3', () => {
      const p: Pos = { units: [tenth([4, 2]), top('MI', [4, 4])] };
      expect(battleTargets(toBattle(build(p), 'orderHeavy', ['u1']).state, 'u1')).toEqual([{ hex: H(4, 4), kind: 'ranged' }]);
      expect(shot(p, [4, 4], { card: 'orderHeavy' })).toBe(1);
      expect(shot({ units: [tenth([4, 1]), top('MI', [4, 4])] }, [4, 4], { card: 'orderHeavy', move: [4, 2] })).toBe(1);
      const far: Pos = { units: [tenth([4, 2]), top('MI', [4, 5])] };
      expect(battleTargets(toBattle(build(far), 'orderHeavy', ['u1']).state, 'u1')).toEqual([]);
    });
    it('may move 2 hexes but then has no battle (canBattle false at distance 2, true at 1); an ordinary HI moves 1', () => {
      const d = play(build({ units: [tenth([6, 6]), bottom('HI', [6, 10])] }), 'orderHeavy', ['u1', 'u2']);
      const moves = pieceMoves(d.state, 'u1');
      expect(Math.max(...moves.map((m) => m.dist))).toBe(2);
      expect(moves.filter((m) => m.dist === 1).length).toBeGreaterThan(0);
      expect(moves.filter((m) => m.dist === 1).every((m) => m.canBattle)).toBe(true);
      expect(moves.filter((m) => m.dist === 2).length).toBeGreaterThan(0);
      expect(moves.filter((m) => m.dist === 2).every((m) => !m.canBattle)).toBe(true);
      expect(Math.max(...pieceMoves(d.state, 'u2').map((m) => m.dist))).toBe(1);
    });
    it('after moving 2 hexes next to an enemy it cannot battle at all (no close combat, no fire)', () => {
      const d = play(build({ units: [tenth([6, 6]), top('MI', [3, 6]), bottom('HI', [8, 10]), top('MI', [7, 10])] }), 'orderHeavy', ['u1', 'u3']);
      must(d, { kind: 'move', piece: 'u1', to: H(4, 6) });
      expect(d.state.turn.ordered.u3.battlesLeft).toBe(1); // (the turn is still open)
      expect(d.state.turn.ordered.u1.canBattle).toBe(false);
      expect(battleTargets(d.state, 'u1')).toEqual([]);
    });
    it('after moving 1 hex it attacks with 5 dice, like any heavy infantry', () => {
      const d = play(build({ units: [tenth([6, 6]), top('MI', [4, 6])] }), 'orderHeavy', ['u1']);
      must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
      if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
      ev(d);
      forceDice(n('light', 9));
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      expect(combatDice(ev(d), 'close')).toBe(5);
    });
    it('is an ordinary HI otherwise: retreats 1 hex per flag, no flag ignored, no sword ignored', () => {
      const t = unitOf('HI', { elite: 'tenthLegion' });
      expect(retreatPerFlag(t, unitOf('HI'))).toBe(1);
      expect(retreatPerFlag(t, unitOf('EL'))).toBe(1);
      const s = build({ units: [bottom('HI', [5, 6], { elite: 'tenthLegion' }), top('HI', [4, 6])] });
      expect(ignorableFlags(s, s.units[0], { kind: 'close', leaderAlive: false, fullAtStart: true, striker: s.units[1] })).toBe(0);
      expect(baseSwordIgnores(s, s.units[0])).toBe(0);
    });
    it('Double Time: moves 2 and may battle, never 3', () => {
      const d = play(build({ units: [tenth([6, 6])] }), 'doubleTime', ['u1']);
      const moves = pieceMoves(d.state, 'u1');
      expect(Math.max(...moves.map((m) => m.dist))).toBe(2);
      expect(moves.every((m) => m.canBattle)).toBe(true);
    });
    it('Line Command: at most 1 hex, then it may fire', () => {
      const d = play(build({ units: [tenth([6, 6])] }), 'lineCommand', ['u1']);
      expect(Math.max(...pieceMoves(d.state, 'u1').map((m) => m.dist))).toBe(1);
      expect(shot({ units: [tenth([4, 1]), top('MI', [4, 4])] }, [4, 4], { card: 'lineCommand', move: [4, 2] })).toBe(1);
    });
    it('a marsh start hex limits it to 1 hex', () => {
      const d = play(build({ units: [tenth([6, 6])], terrain: [{ at: [6, 6], t: 'marsh' }] }), 'orderHeavy', ['u1']);
      expect(Math.max(...pieceMoves(d.state, 'u1').map((m) => m.dist))).toBe(1);
    });
  });

  describe('march (Julian legions)', () => {
    it('a Julian MI may move 2 hexes without battle, or 1 and battle; a Marius MI moves 1', () => {
      const d = play(build({ legions: { bottom: 'julian' }, units: [bottom('MI', [6, 6])] }), 'orderMedium', ['u1']);
      const moves = pieceMoves(d.state, 'u1');
      expect(Math.max(...moves.map((m) => m.dist))).toBe(2);
      expect(moves.filter((m) => m.dist === 1).every((m) => m.canBattle)).toBe(true);
      expect(moves.filter((m) => m.dist === 2).every((m) => !m.canBattle)).toBe(true);
      const m = play(build({ legions: MARIUS, units: [bottom('MI', [6, 6])] }), 'orderMedium', ['u1']);
      expect(Math.max(...pieceMoves(m.state, 'u1').map((x) => x.dist))).toBe(1);
    });
    it('Double Time: 2 hexes with battle, never 3', () => {
      const d = play(build({ legions: { bottom: 'julian' }, units: [bottom('MI', [6, 6])] }), 'doubleTime', ['u1']);
      const moves = pieceMoves(d.state, 'u1');
      expect(Math.max(...moves.map((m) => m.dist))).toBe(2);
      expect(moves.every((m) => m.canBattle)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------------------------
// Caesar (forcedMarch) and Spartacus (spartacusDice) (§18.3; rulings Q4, Q5)

describe('Caesar and Spartacus', () => {
  const CAESAR: LeaderTrait[] = ['ccBonus', 'forcedMarch'];
  const caesar = (at: [number, number]): NonNullable<Pos['leaders']>[number] => ({ side: 'bottom', name: 'Caesar', at, traits: CAESAR });
  const dists = (moves: { dist: number }[]) => Math.max(...moves.map((m) => m.dist));

  describe('Caesar: forced march', () => {
    it('the traits are accepted at setup, with an unknown trait still rejected', () => {
      const s = build({ leaders: [{ side: 'bottom', at: [6, 6], traits: ['forcedMarch', 'spartacusDice'] }] });
      expect(s.leaders[0].traits).toEqual(['forcedMarch', 'spartacusDice']);
      expect(() => build({ leaders: [{ side: 'bottom', at: [6, 6], traits: ['forcedMarsh' as LeaderTrait] }] })).toThrow(/unknown leader trait/);
    });
    it('an MI with Caesar attached moves 2 hexes and may still battle', () => {
      const d = play(build({ units: [bottom('MI', [6, 6]), top('HI', [3, 6])], leaders: [caesar([6, 6])] }), 'orderMedium', ['u1']);
      const moves = pieceMoves(d.state, 'u1');
      expect(dists(moves)).toBe(2);
      expect(moves.every((m) => m.canBattle)).toBe(true);
      must(d, { kind: 'move', piece: 'u1', to: H(4, 6) });
      expect(d.state.leaders[0].hex).toBe(H(4, 6)); // Caesar goes with his unit
      expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(3, 6), kind: 'close' }]);
    });
    it('without Caesar the same MI moves 1 hex', () => {
      const d = play(build({ units: [bottom('MI', [6, 6]), top('HI', [3, 6])], leaders: [{ side: 'bottom', at: [6, 6] }] }), 'orderMedium', ['u1']);
      expect(dists(pieceMoves(d.state, 'u1'))).toBe(1);
    });
    it('an HI, LI and AX with Caesar: HI and AX gain the 2-hex move with battle, LI (already 2) is unchanged', () => {
      const hi = play(build({ units: [bottom('HI', [6, 6])], leaders: [caesar([6, 6])] }), 'orderHeavy', ['u1']);
      expect(dists(pieceMoves(hi.state, 'u1'))).toBe(2);
      expect(pieceMoves(hi.state, 'u1').every((m) => m.canBattle)).toBe(true);
      const ax = (leaders: Pos['leaders']) => pieceMoves(play(build({ units: [bottom('AX', [6, 6])], leaders }), 'orderLight', ['u1']).state, 'u1');
      expect(ax([{ side: 'bottom', at: [6, 6] }]).filter((m) => m.dist === 2).every((m) => !m.canBattle)).toBe(true); // auxilia: 2 only without battle
      expect(ax([caesar([6, 6])]).every((m) => m.canBattle)).toBe(true);
      const li = (leaders: Pos['leaders']) => pieceMoves(play(build({ units: [bottom('LI', [6, 6])], leaders }), 'orderLight', ['u1']).state, 'u1');
      expect(li([caesar([6, 6])])).toEqual(li([]));
    });
    it('attacks with 4 + 1 = 5 dice and battles back with 5 (an MI otherwise rolls 4)', () => {
      const atk = toBattle(build({ units: [bottom('MI', [5, 6]), top('HI', [4, 6])], leaders: [caesar([5, 6])] }), 'orderMedium', ['u1']);
      ev(atk);
      forceDice(n('light', 10));
      must(atk, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      expect(combatDice(ev(atk), 'close')).toBe(5);
      const def = toBattle(build({ first: 'top', units: [top('HI', [4, 6]), bottom('MI', [5, 6])], leaders: [caesar([5, 6])] }), 'orderHeavy', ['u1']);
      ev(def);
      forceDice(n('light', 10));
      must(def, { kind: 'attack', unit: 'u1', target: H(5, 6) });
      expect(combatDice(ev(def), 'battleBack')).toBe(5);
    });
    it('a hill-capped attack of 2 becomes 3 (the bonus comes after the caps)', () => {
      const d = toBattle(build({ units: [bottom('MI', [5, 6]), top('HI', [4, 6])], leaders: [caesar([5, 6])], terrain: [{ at: [4, 6], t: 'hill' }] }), 'orderMedium', ['u1']);
      ev(d);
      forceDice(n('light', 10));
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      expect(combatDice(ev(d), 'close')).toBe(3);
    });
    it('a heavy war machine with Caesar attached gets no extra move (it is not infantry)', () => {
      const d = play(build({ units: [bottom('HWM', [6, 6])], leaders: [caesar([6, 6])] }), 'orderHeavy', ['u1']);
      const moves = pieceMoves(d.state, 'u1');
      expect(dists(moves)).toBe(1);
      expect(moves.every((m) => !m.canBattle)).toBe(true);
    });
    it('a medium cavalry unit with Caesar attached is unchanged (it moves 3 anyway)', () => {
      const of = (leaders: Pos['leaders']) => pieceMoves(play(build({ units: [bottom('MC', [6, 6])], leaders }), 'orderMounted', ['u1']).state, 'u1');
      expect(dists(of([caesar([6, 6])]))).toBe(3);
      expect(of([caesar([6, 6])])).toEqual(of([{ side: 'bottom', at: [6, 6] }]));
    });
    it('a unit that moves onto Caesar gets nothing that turn: its limits are computed without him', () => {
      // a second pair elsewhere keeps the turn open after u1 has moved
      const elsewhere = [bottom('MI', [8, 10]), top('MI', [7, 10])];
      // an MI 2 hexes away cannot reach him in one move
      const far = play(build({ units: [bottom('MI', [8, 6]), ...elsewhere], leaders: [caesar([6, 6])] }), 'orderMedium', ['u1', 'u2']);
      const farMoves = pieceMoves(far.state, 'u1');
      expect(dists(farMoves)).toBe(1);
      expect(farMoves.some((m) => m.hex === H(6, 6))).toBe(false);
      // an MI 1 hex away joins him as an ordinary 1-hex mover: it may battle, but it stops there and cannot move on
      const near = play(build({ units: [bottom('MI', [7, 6]), ...elsewhere], leaders: [caesar([6, 6])] }), 'orderMedium', ['u1', 'u2']);
      const join = pieceMoves(near.state, 'u1').find((m) => m.hex === H(6, 6))!;
      expect(join).toMatchObject({ dist: 1, canBattle: true, attachesTo: leaderId(near.state, 0) });
      must(near, { kind: 'move', piece: 'u1', to: H(6, 6) });
      expect(near.state.turn.ordered.u1).toMatchObject({ moved: 1, moveDone: true, canBattle: true });
      expect(pieceMoves(near.state, 'u1')).toEqual([]);
    });
    it('a unit that Caesar joins this turn does not move on either', () => {
      // I Am Spartacus: a helmet orders Caesar, who may detach and move alone; the enemy keeps the battle phase open
      const s = build({ units: [bottom('MI', [7, 6]), top('HI', [7, 7])], leaders: [caesar([6, 6])] });
      forceDice(['leader', 'medium', 'flag', 'flag', 'flag']);
      const d = play(s, 'spartacus');
      must(d, { kind: 'assign', ids: [leaderId(s, 0), 'u1', null, null, null] });
      expect(dists(pieceMoves(d.state, 'u1'))).toBe(1); // not yet joined: no march for u1 either
      must(d, { kind: 'move', piece: leaderId(d.state, 0), to: H(7, 6) });
      expect(d.state.turn.ordered.u1.attachedThisTurn).toBe(true);
      expect(pieceMoves(d.state, 'u1')).toEqual([]);
    });
    it('Line Command still limits the unit to 1 hex, which it may battle after', () => {
      const d = play(build({ units: [bottom('MI', [6, 6])], leaders: [caesar([6, 6])] }), 'lineCommand', ['u1']);
      const moves = pieceMoves(d.state, 'u1');
      expect(dists(moves)).toBe(1);
      expect(moves.every((m) => m.canBattle)).toBe(true);
    });
    it('Double Time: an MI with Caesar moves 2 and battles, never 3', () => {
      const d = play(build({ units: [bottom('MI', [6, 6])], leaders: [caesar([6, 6])] }), 'doubleTime', ['u1']);
      const moves = pieceMoves(d.state, 'u1');
      expect(dists(moves)).toBe(2);
      expect(moves.every((m) => m.canBattle)).toBe(true);
    });
    it('terrain still applies: forests stop the march and bar MI battle; a marsh start hex limits it to 1', () => {
      const forest: Pos['terrain'] = [{ at: [5, 5], t: 'forest' }, { at: [5, 6], t: 'forest' }];
      const d = play(build({ units: [bottom('MI', [6, 6])], leaders: [caesar([6, 6])], terrain: forest }), 'orderMedium', ['u1']);
      const inForest = (h: number) => h === H(5, 5) || h === H(5, 6);
      const moves = pieceMoves(d.state, 'u1');
      expect(moves.filter((m) => inForest(m.hex)).every((m) => !m.canBattle && m.dist === 1)).toBe(true);
      expect(moves.every((m) => m.path.slice(1, -1).every((h) => !inForest(h)))).toBe(true);
      const marsh = play(build({ units: [bottom('MI', [6, 6])], leaders: [caesar([6, 6])], terrain: [{ at: [6, 6], t: 'marsh' }] }), 'orderMedium', ['u1']);
      expect(dists(pieceMoves(marsh.state, 'u1'))).toBe(1);
    });
    it('a pilum unit with Caesar can move 2 and close combat, but cannot fire after moving 2', () => {
      // (a second pair elsewhere keeps the turn open: u3 is ordered with u1)
      const p = (from: [number, number]): Pos => ({
        legions: { bottom: 'marius' }, units: [bottom('MI', from), top('HI', [2, 6]), bottom('MI', [8, 10]), top('MI', [7, 10])], leaders: [caesar(from)],
      });
      const far = play(build(p([6, 6])), 'orderMedium', ['u1', 'u3']);
      must(far, { kind: 'move', piece: 'u1', to: H(4, 6) });
      expect(far.state.turn.ordered.u1.moved).toBe(2);
      expect(canFireAt(far.state, far.state.units[0], H(2, 6))).toBe(true); // in range and in sight
      expect(battleTargets(far.state, 'u1')).toEqual([]);
      // moved 1 hex only: the same position fires
      const near = play(build(p([5, 6])), 'orderMedium', ['u1', 'u3']);
      must(near, { kind: 'move', piece: 'u1', to: H(4, 6) });
      expect(near.state.turn.ordered.u1.moved).toBe(1);
      expect(battleTargets(near.state, 'u1')).toEqual([{ hex: H(2, 6), kind: 'ranged' }]);
      // moved 2 hexes, it can close combat when an enemy is adjacent
      const close = play(build({ ...p([6, 6]), units: [bottom('MI', [6, 6]), top('HI', [3, 6]), bottom('MI', [8, 10]), top('MI', [7, 10])] }), 'orderMedium', ['u1', 'u3']);
      must(close, { kind: 'move', piece: 'u1', to: H(4, 6) });
      expect(battleTargets(close.state, 'u1')).toEqual([{ hex: H(3, 6), kind: 'close' }]);
    });
  });

  describe('Spartacus: I Am Spartacus rolls Command + 2 dice', () => {
    const SPARTA: LeaderTrait[] = ['spartacusDice'];
    const sparta = (side: Side = 'bottom'): NonNullable<Pos['leaders']>[number] => ({ side, name: 'Spartacus', at: side === 'bottom' ? [6, 6] : [2, 6], traits: SPARTA });
    const army = (extra: Partial<Pos> = {}): Pos => ({ units: [bottom('MI', [6, 6]), top('HI', [2, 6])], leaders: [sparta()], ...extra });
    /** The active side plays I Am Spartacus; every die is a flag, so nothing is ordered and no decision follows. Dice rolled. */
    function diceOf(s: ReturnType<typeof build>): number {
      forceDice(n('flag', 20));
      const d = play(s, 'spartacus');
      const r = rolls(ev(d), 'spartacus');
      expect(r).toHaveLength(1);
      return r[0].length;
    }

    it('with Spartacus on the board his side rolls Command + 2', () => {
      expect(diceOf(build(army()))).toBe(7);
      expect(diceOf(build(army({ cards: 6 })))).toBe(8);
      expect(diceOf(build(army({ cards: 4 })))).toBe(6);
    });
    it('without Spartacus (an ordinary leader, no leader) it rolls Command', () => {
      expect(diceOf(build(army({ leaders: [{ side: 'bottom', at: [6, 6] }] })))).toBe(5);
      expect(diceOf(build(army({ leaders: [] })))).toBe(5);
    });
    it('after Spartacus is eliminated, or while he is not on the board, it rolls Command', () => {
      const dead = build(army());
      dead.leaders = dead.leaders.filter((l) => l.name !== 'Spartacus');
      expect(diceOf(dead)).toBe(5);
      const off = build(army());
      off.leaders[0].hex = OFF_BOARD;
      expect(diceOf(off)).toBe(5);
    });
    it('a Spartacus of the other side gives nothing: the Romans roll Command', () => {
      expect(diceOf(build(army({ first: 'top' })))).toBe(5);
      expect(diceOf(build(army({ first: 'top', leaders: [sparta('top')] })))).toBe(7);
    });
    it('the card is otherwise unchanged: each class symbol orders one unit of that class, +1 die on battle', () => {
      const s = build(army({ units: [bottom('MI', [5, 6]), bottom('LI', [6, 2]), top('HI', [4, 6])] }));
      forceDice(['medium', 'light', 'flag', 'flag', 'flag', 'flag', 'flag']);
      const d = play(s, 'spartacus');
      expect(d.pending).toMatchObject({ kind: 'spartacus', side: 'bottom' });
      expect((d.pending as { faces: DieFace[] }).faces).toHaveLength(7);
      must(d, { kind: 'assign', ids: ['u1', 'u2', null, null, null, null, null] });
      if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
      ev(d);
      forceDice(n('light', 10));
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      expect(combatDice(ev(d), 'close')).toBe(5);
    });

    /** `first` plays I Am Spartacus, then the other side answers with Counter Attack; the dice each of them rolled. */
    function counter(p: Pos, first: Side): [number, number] {
      const s = build({ ...p, first });
      noFirstStrike(s);
      const second: Side = first === 'bottom' ? 'top' : 'bottom';
      const c1 = giveCard(s, first, 'spartacus');
      const c2 = giveCard(s, second, 'counterAttack');
      forceDice(n('flag', 30));
      const d = new GameDriver(s);
      must(d, { kind: 'playCard', card: c1 });
      const a = rolls(ev(d), 'spartacus');
      expect(d.pending).toMatchObject({ kind: 'playCard', side: second });
      must(d, { kind: 'playCard', card: c2 });
      const b = rolls(ev(d), 'spartacus');
      expect([a.length, b.length]).toEqual([1, 1]);
      return [a[0].length, b[0].length];
    }
    it('a Counter Attack copying I Am Spartacus counts as the card: Command + 2 for the side with Spartacus', () => {
      // the Romans (no Spartacus) play it, the Slaves counter attack with Spartacus on the board
      expect(counter(army({ leaders: [sparta('top')] }), 'bottom')).toEqual([5, 7]);
      // the Slaves play it with Spartacus, the Romans copy it with no bonus
      expect(counter(army({ leaders: [sparta('bottom')] }), 'bottom')).toEqual([7, 5]);
    });
  });
});
