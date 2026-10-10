// Expansion #2 units (rules-reference §18; design/exp2-rulings.md Q1): the Barbarian light chariot (BCH).
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ARMY_LOOKS, BLOCKS, UNIT_STATS, UNIT_TYPES, autoOrders, battleTargets, canEvadeType, escapeDice, ignorableFlags, pieceMoves, retreatPerFlag,
  scoreClose, validateOrders,
  type CardKind, type DieFace, type UnitType,
} from '../../src/engine';
import { H, build, combatDice, ev, forceDice, must, n, play, toBattle, u } from './helpers';

beforeEach(() => forceDice([]));

const CLASSES: DieFace[] = ['light', 'medium', 'heavy'];
/** A class face that scores against neither unit type. */
function miss(a: UnitType, b: UnitType): DieFace {
  return CLASSES.find((c) => c !== UNIT_STATS[a].cls && c !== UNIT_STATS[b].cls)!;
}

/**
 * Bottom attacker at (5,6) attacks the top defender at (4,6), which stands; every die misses. Returns the attack and
 * battle-back dice. `atkBlocks` / `defBlocks` set the strengths at the start of the combat.
 */
function duel(atk: UnitType, def: UnitType, opts: { card?: CardKind; atkBlocks?: number; defBlocks?: number } = {}): { attack?: number; back?: number } {
  const s = build({ units: [
    { side: 'bottom', type: atk, at: [5, 6], blocks: opts.atkBlocks }, { side: 'top', type: def, at: [4, 6], blocks: opts.defBlocks },
  ] });
  const d = toBattle(s, opts.card ?? 'order4C', ['u1']);
  ev(d);
  forceDice(n(miss(atk, def), 30));
  must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: 'stand' });
  const e = ev(d);
  return { attack: combatDice(e, 'close'), back: combatDice(e, 'battleBack') };
}

/** Bottom attacker at (5,6) declares an attack on the top defender at (4,6); returns the driver at the defend decision. */
function attackOn(atk: UnitType, def: UnitType) {
  const s = build({ units: [{ side: 'bottom', type: atk, at: [5, 6] }, { side: 'top', type: def, at: [4, 6] }] });
  const d = toBattle(s, 'order4C', ['u1']);
  forceDice(n(miss(atk, def), 40)); // if the attack resolves at once (no defend decision), every die misses
  must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  return d;
}

/** The two units of a scoring state (bottom `atk` is u1, top `def` is u2). */
function pair(atk: UnitType, def: UnitType, defBlocks?: number) {
  const s = build({ units: [{ side: 'bottom', type: atk, at: [5, 6] }, { side: 'top', type: def, at: [4, 6], blocks: defBlocks }] });
  return { s, a: s.units[0], d: s.units[1] };
}

const S = (type: UnitType) => build({ units: [{ side: 'top', type, at: [4, 6] }] }).units[0];

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
