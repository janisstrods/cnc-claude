// Expansion #1 units: light bow cavalry (LBC) and camels (CAM) (rules-reference §15).
import { beforeEach, describe, expect, it } from 'vitest';
import {
  GameDriver, UNIT_STATS, autoOrders, battleTargets, ignorableFlags, pieceMoves, retreatPerFlag, rowOf, scoreClose, validateOrders,
  type CardKind, type DieFace, type Side, type UnitType,
} from '../../src/engine';
import {
  H, build, combatDice, ev, forceDice, forcedDiceLeft, giveCard, must, n, noFirstStrike, play, rolls, toBattle, u, type Pos,
} from './helpers';

beforeEach(() => forceDice([]));

const CLASSES: DieFace[] = ['light', 'medium', 'heavy'];
/** A class face that scores against neither unit type. */
function miss(a: UnitType, b: UnitType): DieFace {
  return CLASSES.find((c) => c !== UNIT_STATS[a].cls && c !== UNIT_STATS[b].cls)!;
}

/** Bottom attacker at (5,6) attacks the top defender at (4,6), which stands; every die misses. Attack / battle-back dice. */
function duel(atk: UnitType, def: UnitType, card: CardKind = 'order4C'): { attack?: number; back?: number } {
  const s = build({ units: [{ side: 'bottom', type: atk, at: [5, 6] }, { side: 'top', type: def, at: [4, 6] }] });
  const d = toBattle(s, card, ['u1']);
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
const canEvade = (atk: UnitType, def: UnitType) => {
  const d = attackOn(atk, def);
  return d.pending?.kind === 'defend' && d.pending.canEvade;
};

/** Bottom striker at `atkAt` attacks the adjacent top defender at `defAt` with scripted dice; the defender stands. */
function strikeWith(atk: UnitType, def: UnitType, dice: DieFace[], atkAt: [number, number] = [5, 6], defAt: [number, number] = [4, 6]) {
  const s = build({ units: [{ side: 'bottom', type: atk, at: atkAt }, { side: 'top', type: def, at: defAt }] });
  const d = toBattle(s, 'order4C', ['u1']);
  ev(d);
  must(d, { kind: 'attack', unit: 'u1', target: H(...defAt) });
  forceDice(dice);
  if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: 'stand' });
  else throw new Error('dice were forced after the roll; expected a defend decision');
  return d;
}

/** As strikeWith, but for defenders that cannot evade (the roll happens at once). */
function strikeNow(atk: UnitType, def: UnitType, dice: DieFace[], atkAt: [number, number] = [5, 6], defAt: [number, number] = [4, 6]) {
  const s = build({ units: [{ side: 'bottom', type: atk, at: atkAt }, { side: 'top', type: def, at: defAt }] });
  const d = toBattle(s, 'order4C', ['u1']);
  ev(d);
  forceDice(dice);
  must(d, { kind: 'attack', unit: 'u1', target: H(...defAt) });
  expect(d.pending?.kind).not.toBe('defend');
  return d;
}

const chooseRetreat = (d: GameDriver) => {
  if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
};

/** Units of a scoring state: one of each type, ids u1.. in this order. */
const SCORING: UnitType[] = ['LC', 'MC', 'HC', 'LBC', 'HCH', 'LI', 'MI', 'HI', 'EL', 'CAM', 'CAM'];
function scoringState() {
  const s = build({ units: SCORING.map((type, i) => ({ side: (i < SCORING.length - 1 ? 'bottom' : 'top') as Side, type, at: [6, i] as [number, number] })) });
  const of = (t: UnitType) => s.units.find((x) => x.type === t && x.side === 'bottom')!;
  const target = s.units[s.units.length - 1]; // the top camel
  return { s, of, target };
}

/** Bottom HI at (5,6) attacks a lone top leader at (4,6); the leader's only evade paths run through two bottom `t` units. */
function escapeDiceThrough(t: UnitType): number | undefined {
  const s = build({
    units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'bottom', type: t, at: [3, 5] }, { side: 'bottom', type: t, at: [3, 6] }],
    leaders: [{ side: 'top', at: [4, 6] }],
  });
  const d = toBattle(s, 'order4C', ['u1']);
  forceDice(n('flag', 5));
  must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  if (d.pending?.kind !== 'leaderEvade') throw new Error('expected leader evade');
  expect(d.pending.options.every((o) => (o.escapes?.length ?? 0) === 1)).toBe(true);
  ev(d);
  forceDice(n('flag', 6));
  must(d, { kind: 'choose', index: 0 });
  return rolls(ev(d), 'escape')[0]?.length;
}

// ---------------------------------------------------------------------------------------------
// Class and card membership (§15)

describe('class and card membership', () => {
  // u1 LBC, u2 CAM, u3 LI, u4 MI, u5 HI
  const army = () => build({
    units: [
      { side: 'bottom', type: 'LBC', at: [6, 2] }, { side: 'bottom', type: 'CAM', at: [6, 4] }, { side: 'bottom', type: 'LI', at: [6, 6] },
      { side: 'bottom', type: 'MI', at: [6, 8] }, { side: 'bottom', type: 'HI', at: [6, 10] },
    ],
  });
  const every = ['u1', 'u2', 'u3', 'u4', 'u5'];
  const ok = (k: CardKind) => {
    const s = army();
    return every.filter((id) => validateOrders(s, 'bottom', k, [id]) === null);
  };
  it('Order Light Troops and Move-Fire-Move order light bow cavalry, not camels', () => {
    expect(ok('orderLight')).toEqual(['u1', 'u3']);
    expect(ok('moveFireMove')).toEqual(['u1', 'u3']);
  });
  it('Order Medium Troops orders camels; Order Heavy Troops neither new type', () => {
    expect(ok('orderMedium')).toEqual(['u2', 'u4']);
    expect(ok('orderHeavy')).toEqual(['u5']);
  });
  it('Order Mounted and Mounted Charge order both', () => {
    expect(ok('orderMounted')).toEqual(['u1', 'u2']);
    expect(ok('mountedCharge')).toEqual(['u1', 'u2']);
  });
  it('they are not foot (Line Command)', () => {
    expect(ok('lineCommand')).toEqual(['u3', 'u4', 'u5']);
  });
  it('Darken the Sky orders the light bow cavalry as a missile unit, not the camel', () => {
    expect(autoOrders(army(), 'bottom', 'darken')).toEqual(['u1', 'u3']);
  });
  it('dice that hit them: green circle for LBC, blue triangle for CAM', () => {
    const t = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'LBC', at: [4, 6] }, { side: 'top', type: 'CAM', at: [4, 7] }] });
    const faces: DieFace[] = ['light', 'medium', 'heavy', 'heavy'];
    expect(scoreClose(t, t.units[0], t.units[1], faces, false, 'attack').hits).toBe(1);
    expect(scoreClose(t, t.units[0], t.units[2], faces, false, 'attack').hits).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------
// Light bow cavalry

describe('light bow cavalry: movement', () => {
  it('moves up to 4 hexes and may battle after any move', () => {
    const s = build({ units: [{ side: 'bottom', type: 'LBC', at: [4, 6] }] });
    const d = play(s, 'order4C', ['u1']);
    const moves = pieceMoves(d.state, 'u1');
    expect(Math.max(...moves.map((m) => m.dist))).toBe(4);
    expect(moves.every((m) => m.canBattle)).toBe(true);
  });
  it('does not pass through friendly units with Order Light Troops (light foot only)', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'LBC', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [5, 5] }, { side: 'bottom', type: 'MI', at: [5, 6] },
    ] });
    const d = play(s, 'orderLight', ['u1']);
    const moves = pieceMoves(d.state, 'u1');
    expect(moves.length).toBeGreaterThan(0);
    for (const m of moves) for (const h of m.path) expect([H(5, 5), H(5, 6)]).not.toContain(h);
  });
});

describe('light bow cavalry: ranged combat', () => {
  function fireDice(p: Pos, opts: { move?: [number, number]; card?: CardKind; target: [number, number] }) {
    const s = build(p);
    const d = play(s, opts.card ?? 'orderLight', ['u1']);
    if (opts.move) must(d, { kind: 'move', piece: 'u1', to: H(...opts.move) });
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    ev(d);
    forceDice(n('heavy', 4)); // misses a medium target
    must(d, { kind: 'attack', unit: 'u1', target: H(...opts.target) });
    return combatDice(ev(d), 'ranged');
  }
  it('range 3: fires at distance 3, not 4', () => {
    const at3 = build({ units: [{ side: 'bottom', type: 'LBC', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 5] }] });
    expect(battleTargets(toBattle(at3, 'orderLight', ['u1']).state, 'u1')).toEqual([{ hex: H(4, 5), kind: 'ranged' }]);
    const at4 = build({ units: [{ side: 'bottom', type: 'LBC', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 6] }] });
    expect(battleTargets(toBattle(at4, 'orderLight', ['u1']).state, 'u1')).toEqual([]);
  });
  it('2 dice if it did not move', () => {
    expect(fireDice({ units: [{ side: 'bottom', type: 'LBC', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 5] }] }, { target: [4, 5] })).toBe(2);
  });
  it('1 die after moving, any distance (1 hex or a full 4)', () => {
    expect(fireDice({ units: [{ side: 'bottom', type: 'LBC', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 5] }] }, { move: [4, 3], target: [4, 5] })).toBe(1);
    expect(fireDice({ units: [{ side: 'bottom', type: 'LBC', at: [4, 0] }, { side: 'top', type: 'MI', at: [4, 7] }] }, { move: [4, 4], target: [4, 7] })).toBe(1);
  });
  it('cannot fire while adjacent to an enemy unit', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'LBC', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 3] }, { side: 'top', type: 'MI', at: [4, 5] },
    ] });
    expect(battleTargets(toBattle(s, 'orderLight', ['u1']).state, 'u1')).toEqual([{ hex: H(4, 3), kind: 'close' }]);
  });
  it('Move-Fire-Move: 1 die after its first move', () => {
    expect(fireDice({ units: [{ side: 'bottom', type: 'LBC', at: [4, 0] }, { side: 'top', type: 'MI', at: [4, 5] }] }, { card: 'moveFireMove', move: [4, 2], target: [4, 5] })).toBe(1);
  });
  it('Darken the Sky: fires twice with 2 dice', () => {
    const s = build({ units: [{ side: 'bottom', type: 'LBC', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 5] }] });
    const d = play(s, 'darken');
    expect(Object.keys(d.state.turn.ordered)).toEqual(['u1']);
    ev(d);
    forceDice(n('heavy', 4));
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 5) });
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 5) });
    const shots = ev(d).filter((x) => x.t === 'combat' && x.purpose === 'ranged');
    expect(shots.map((x) => (x as { dice: number }).dice)).toEqual([2, 2]);
  });
  it('Mounted Charge: +1 close-combat die (3) and no ranged fire', () => {
    expect(duel('LBC', 'MI', 'mountedCharge').attack).toBe(3);
    const s = build({ units: [{ side: 'bottom', type: 'LBC', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 4] }] });
    expect(battleTargets(toBattle(s, 'mountedCharge', ['u1']).state, 'u1')).toEqual([]);
  });
});

describe('light bow cavalry: close combat', () => {
  it('attacks with 2 dice and battles back with 2', () => {
    expect(duel('LBC', 'MI').attack).toBe(2);
    expect(duel('MI', 'LBC').back).toBe(2);
  });
  it('swords never score hits for it', () => {
    const s = build({ units: [{ side: 'bottom', type: 'LBC', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }] });
    expect(scoreClose(s, s.units[0], s.units[1], ['swords', 'swords'], false, 'attack').hits).toBe(0);
    const d = strikeNow('LBC', 'MI', ['swords', 'swords', ...n('light', 4)]);
    expect(u(d, 'u2')!.blocks).toBe(4);
  });
  it('may always evade (foot, cavalry, elephants, chariots, camels)', () => {
    for (const atk of ['HI', 'LI', 'LC', 'MC', 'HC', 'LBC', 'EL', 'HCH', 'CAM'] as UnitType[]) {
      expect([atk, canEvade(atk, 'LBC')]).toEqual([atk, true]);
    }
  });
  it('a leader escaping through its hex meets 2 dice', () => {
    expect(escapeDiceThrough('LBC')).toBe(2);
  });
});

describe('light bow cavalry: momentum', () => {
  function lbcWins() {
    const s = build({ units: [
      { side: 'bottom', type: 'LBC', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }, { side: 'top', type: 'MI', at: [3, 6], blocks: 1 },
    ] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['medium', 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')).toBeUndefined();
    return d;
  }
  it('after eliminating the defender: momentum advance, then the cavalry extra hex', () => {
    const d = lbcWins();
    expect(d.pending).toMatchObject({ kind: 'momentum', hex: H(4, 6), bonus: false });
    must(d, { kind: 'yesno', yes: true });
    expect(d.pending?.kind).toBe('cavalryExtra');
  });
  it('the extra hex is not needed for the bonus combat; after a bonus combat there is no extra hex', () => {
    const d = lbcWins();
    must(d, { kind: 'yesno', yes: true });
    must(d, { kind: 'hex', hex: null });
    expect(d.pending).toMatchObject({ kind: 'bonusCombat', targets: [H(3, 6)] });
    ev(d);
    forceDice(['medium', 'light']);
    must(d, { kind: 'hex', hex: H(3, 6) });
    expect(combatDice(ev(d), 'bonus')).toBe(2);
    expect(u(d, 'u3')).toBeUndefined();
    expect(d.pending).toMatchObject({ kind: 'momentum', hex: H(3, 6), bonus: true });
    must(d, { kind: 'yesno', yes: true });
    expect(u(d, 'u1')!.hex).toBe(H(3, 6));
    expect(d.pending?.kind).toBe('playCard');
  });
});

describe('light bow cavalry: retreat', () => {
  const S = (type: UnitType) => build({ units: [{ side: 'top', type, at: [4, 6] }] }).units[0];
  it('retreats 4 hexes per flag, 5 when the flag was rolled by an elephant or a camel', () => {
    expect(retreatPerFlag(S('LBC'), S('HI'))).toBe(4);
    expect(retreatPerFlag(S('LBC'), S('MC'))).toBe(4);
    expect(retreatPerFlag(S('LBC'), S('EL'))).toBe(5);
    expect(retreatPerFlag(S('LBC'), S('CAM'))).toBe(5);
  });
  it('flow: 4 hexes for a heavy infantry flag', () => {
    const d = strikeWith('HI', 'LBC', ['flag', ...n('medium', 4)]);
    chooseRetreat(d);
    expect(rowOf(u(d, 'u2')!.hex)).toBe(0);
    expect(u(d, 'u2')!.blocks).toBe(3);
  });
  it('flow: 5 hexes for a camel flag', () => {
    const d = strikeWith('CAM', 'LBC', ['flag', 'heavy', 'heavy'], [7, 6], [6, 6]);
    chooseRetreat(d);
    expect(rowOf(u(d, 'u2')!.hex)).toBe(1);
    expect(u(d, 'u2')!.blocks).toBe(3);
  });
});

// ---------------------------------------------------------------------------------------------
// Camels

describe('camel: dice', () => {
  it('attacks with 3 dice and battles back with 2', () => {
    expect(duel('CAM', 'MI').attack).toBe(3);
    expect(duel('MI', 'CAM').back).toBe(2);
  });
  it('plays First Strike with 2 dice', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'CAM', at: [4, 6] }] });
    noFirstStrike(s);
    giveCard(s, 'top', 'firstStrike');
    const card = giveCard(s, 'bottom', 'order4C');
    const d = new GameDriver(s);
    must(d, { kind: 'playCard', card });
    must(d, { kind: 'orders', pieces: ['u1'] });
    must(d, { kind: 'endMove' });
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending).toMatchObject({ kind: 'defend', canFirstStrike: true });
    ev(d);
    forceDice(n('light', 6));
    must(d, { kind: 'defend', choice: 'firstStrike' });
    const e = ev(d);
    expect(combatDice(e, 'firstStrike')).toBe(2);
    expect(combatDice(e, 'close')).toBe(4);
  });
  it('Mounted Charge adds 1 to its attack (4)', () => {
    expect(duel('CAM', 'MI', 'mountedCharge').attack).toBe(4);
  });
  it('elephants roll 3 against camels (attacking and battling back)', () => {
    expect(duel('EL', 'CAM').attack).toBe(3);
    expect(duel('CAM', 'EL').back).toBe(3);
  });
  it('elephants roll 2 against light bow cavalry (attacking and battling back)', () => {
    expect(duel('EL', 'LBC').attack).toBe(2);
    expect(duel('LBC', 'EL').back).toBe(2);
  });
  it('a leader escaping through its hex meets 3 dice', () => {
    expect(escapeDiceThrough('CAM')).toBe(3);
  });
});

describe('camel: ignores 1 blue triangle from cavalry and chariots', () => {
  const twoBlue: DieFace[] = ['medium', 'medium'];
  it('a medium cavalry roll of two blue triangles scores 1 hit; heavy infantry scores 2', () => {
    const { s, of, target } = scoringState();
    expect(scoreClose(s, of('MC'), target, twoBlue, false, 'attack').hits).toBe(1);
    expect(scoreClose(s, of('HI'), target, twoBlue, false, 'attack').hits).toBe(2);
  });
  it('every cavalry and chariot type triggers it (LC, MC, HC, LBC, HCH)', () => {
    const { s, of, target } = scoringState();
    for (const t of ['LC', 'MC', 'HC', 'LBC', 'HCH'] as UnitType[]) expect([t, scoreClose(s, of(t), target, twoBlue, false, 'attack').hits]).toEqual([t, 1]);
  });
  it('foot, elephants and other camels do not', () => {
    const { s, of, target } = scoringState();
    for (const t of ['LI', 'MI', 'HI', 'EL', 'CAM'] as UnitType[]) expect([t, scoreClose(s, of(t), target, twoBlue, false, 'attack').hits]).toEqual([t, 2]);
  });
  it('only one blue triangle per roll, and never a sword or a helmet', () => {
    const { s, of, target } = scoringState();
    expect(scoreClose(s, of('HC'), target, ['medium', 'medium', 'medium'], false, 'attack').hits).toBe(2);
    expect(scoreClose(s, of('MC'), target, ['swords', 'swords', 'medium'], false, 'attack').hits).toBe(2);
    expect(scoreClose(s, of('MC'), target, ['leader', 'medium'], true, 'attack').hits).toBe(1);
  });
  it('flow: medium cavalry attacking a camel (the camel cannot evade it)', () => {
    const d = strikeNow('MC', 'CAM', ['medium', 'medium', 'light', 'light', 'light']);
    expect(u(d, 'u2')!.blocks).toBe(2);
  });
  it('flow: heavy infantry attacking a camel scores both', () => {
    const d = strikeWith('HI', 'CAM', ['medium', 'medium', 'light', 'light', 'light', 'light', 'light']);
    expect(u(d, 'u2')!.blocks).toBe(1);
  });
  it('flow: a horse battling back against an attacking camel', () => {
    // CAM (bottom) attacks MC (top): 3 misses; MC battles back with 3 blue triangles -> 2 hits
    const d = strikeNow('CAM', 'MC', ['light', 'light', 'light', 'medium', 'medium', 'medium']);
    expect(u(d, 'u1')!.blocks).toBe(1);
    expect(forcedDiceLeft()).toBe(0);
  });
  it('the roll against an evading camel [Interp]: cavalry loses one blue triangle, foot does not', () => {
    for (const [atk, left] of [['HC', 2], ['HI', 1]] as [UnitType, number][]) {
      const d = attackOn(atk, 'CAM');
      expect(d.pending).toMatchObject({ kind: 'defend', canEvade: true });
      ev(d);
      forceDice(['medium', 'medium', 'light', 'light', 'light']);
      must(d, { kind: 'defend', choice: 'evade' });
      expect([atk, u(d, 'u2')!.blocks]).toEqual([atk, left]);
    }
  });
  it('close combat only: ranged fire is not reduced', () => {
    const st = build({ units: [{ side: 'bottom', type: 'LC', at: [4, 2] }, { side: 'top', type: 'CAM', at: [4, 4] }] });
    const d = toBattle(st, 'orderLight', ['u1']);
    forceDice(['medium', 'medium']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 4) });
    expect(u(d, 'u2')!.blocks).toBe(1);
  });
});

describe('camel: flags', () => {
  it('no extra flag-ignore against cavalry (only elephants have that)', () => {
    const { s, of, target } = scoringState();
    const ctx = { kind: 'close' as const, leaderAlive: false, fullAtStart: true };
    expect(ignorableFlags(s, target, { ...ctx, striker: of('MC') })).toBe(0);
    expect(ignorableFlags(s, target, { ...ctx, striker: of('HCH') })).toBe(0);
    const d = strikeNow('MC', 'CAM', ['flag', 'light', 'light', 'light', 'light']);
    expect(d.pending?.kind).not.toBe('ignoreFlags');
    chooseRetreat(d);
    expect(rowOf(u(d, 'u2')!.hex)).toBe(1); // 3 hexes per flag
  });
  it('an elephant ignores neither a red square nor a flag rolled by a camel (a camel is not cavalry)', () => {
    const { s, of } = scoringState();
    const el = s.units.find((x) => x.type === 'EL')!;
    const ctx = { kind: 'close' as const, leaderAlive: false, fullAtStart: true };
    expect(scoreClose(s, of('CAM'), el, ['heavy', 'heavy'], false, 'attack').hits).toBe(2);
    expect(scoreClose(s, of('HC'), el, ['heavy', 'heavy'], false, 'attack').hits).toBe(1);
    expect(ignorableFlags(s, el, { ...ctx, striker: of('CAM') })).toBe(0);
    expect(ignorableFlags(s, el, { ...ctx, striker: of('HC') })).toBe(1);
  });
});

describe('extra retreat hex ("scare") for cavalry and chariots', () => {
  const S = (type: UnitType) => build({ units: [{ side: 'top', type, at: [4, 6] }] }).units[0];
  it('per accepted elephant or camel flag: LC/LBC 5, MC 4, HC 3, HCH 3', () => {
    for (const striker of ['EL', 'CAM'] as UnitType[]) {
      for (const [t, r] of [['LC', 5], ['LBC', 5], ['MC', 4], ['HC', 3], ['HCH', 3]] as [UnitType, number][]) {
        expect([striker, t, retreatPerFlag(S(t), S(striker))]).toEqual([striker, t, r]);
      }
    }
  });
  it('foot, camels and elephants are never scared', () => {
    for (const striker of ['EL', 'CAM'] as UnitType[]) {
      for (const [t, r] of [['LI', 2], ['MI', 1], ['HI', 1], ['CAM', 3], ['EL', 1]] as [UnitType, number][]) {
        expect([striker, t, retreatPerFlag(S(t), S(striker))]).toEqual([striker, t, r]);
      }
    }
  });
  it('flags rolled by other units never add a hex', () => {
    for (const striker of ['LBC', 'MC', 'HC', 'HCH', 'HI'] as UnitType[]) {
      expect([striker, retreatPerFlag(S('LC'), S(striker))]).toEqual([striker, 4]);
      expect([striker, retreatPerFlag(S('MC'), S(striker))]).toEqual([striker, 3]);
    }
  });
  it('flow: light cavalry hit by a camel flag retreats 4+1 hexes', () => {
    const d = strikeWith('CAM', 'LC', ['flag', 'heavy', 'heavy'], [7, 6], [6, 6]);
    chooseRetreat(d);
    expect(rowOf(u(d, 'u2')!.hex)).toBe(1);
    expect(u(d, 'u2')!.blocks).toBe(3);
  });
  it('flow: heavy cavalry hit by a camel flag retreats 2+1 hexes', () => {
    const d = strikeNow('CAM', 'HC', ['flag', 'light', 'light'], [7, 6], [6, 6]);
    chooseRetreat(d);
    expect(rowOf(u(d, 'u2')!.hex)).toBe(3);
  });
  it('flow: a camel battling back scares the attacking horse (medium cavalry 3+1)', () => {
    // bottom MC at (3,6) attacks the top camel at (2,6): 3 misses; the camel battles back with a flag
    const d = strikeNow('MC', 'CAM', ['light', 'light', 'light', 'flag', 'light'], [3, 6], [2, 6]);
    chooseRetreat(d);
    expect(rowOf(u(d, 'u1')!.hex)).toBe(7);
    expect(u(d, 'u1')!.blocks).toBe(3);
  });
});

describe('camel: evade', () => {
  it('evades foot and heavy mounted (HC, EL, HCH)', () => {
    for (const atk of ['LI', 'AX', 'MI', 'HI', 'WA', 'HC', 'EL', 'HCH'] as UnitType[]) expect([atk, canEvade(atk, 'CAM')]).toEqual([atk, true]);
  });
  it('does not evade light or medium mounted (LC, LBC, MC, CAM)', () => {
    for (const atk of ['LC', 'LBC', 'MC', 'CAM'] as UnitType[]) expect([atk, canEvade(atk, 'CAM')]).toEqual([atk, false]);
  });
  it('a camel attack is not an elephant attack: heavy cavalry, chariots and medium cavalry cannot evade it', () => {
    for (const def of ['HC', 'HCH', 'MC'] as UnitType[]) expect([def, canEvade('CAM', def)]).toEqual([def, false]);
    for (const def of ['LC', 'LBC'] as UnitType[]) expect([def, canEvade('CAM', def)]).toEqual([def, true]);
  });
});

describe('camel: momentum', () => {
  it('advance and bonus close combat (3 dice), but no cavalry extra hex', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'CAM', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }, { side: 'top', type: 'MI', at: [3, 6] },
    ] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['medium', 'light', 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')).toBeUndefined();
    expect(d.pending).toMatchObject({ kind: 'momentum', hex: H(4, 6) });
    must(d, { kind: 'yesno', yes: true });
    expect(d.pending).toMatchObject({ kind: 'bonusCombat', targets: [H(3, 6)] });
    ev(d);
    forceDice(n('light', 3 + 4));
    must(d, { kind: 'hex', hex: H(3, 6) });
    expect(combatDice(ev(d), 'bonus')).toBe(3);
  });
});
