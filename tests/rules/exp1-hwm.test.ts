// Expansion #1 heavy war machines (HWM) (rules-reference §15 "Heavy war machine", "Class and card membership",
// "Elephants versus the new types").
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  UNIT_STATS, autoOrders, battleTargets, bonusCombatEligible, ignorableFlags, leaderById, pieceMoves, rallyCandidates, retreatOptions,
  baseSwordIgnores, retreatPerFlag, rowOf, scoreClose, unitAt, validateOrders, validateRally, validateSpartacus,
  type CardKind, type DieFace, type GameEvent, type HexId, type UnitType,
} from '../../src/engine';
import { PERSONALITIES, chooseAnswer, isLegal, newMemory, type AiOptions } from '../../src/ai';
import { H, build, combatDice, ev, forceDice, leaderId, must, n, play, rolls, toBattle, u, type Pos } from './helpers';

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

// The war machine under attack: top HWM (u2) at (4,6), bottom attacker (u1) at (5,6). Its rear hexes are (3,5) and (3,6),
// then (2,5), (2,6) and (2,7).
const HWM_AT: [number, number] = [4, 6];

/** Bottom `atk` declares an attack on the top war machine; returns the driver at the defend decision (if any). */
function attackHwm(atk: UnitType, extra: Pos = {}) {
  const s = build({
    ...extra,
    units: [{ side: 'bottom', type: atk, at: [5, 6] }, { side: 'top', type: 'HWM', at: HWM_AT }, ...(extra.units ?? [])],
  });
  const d = toBattle(s, 'order4C', ['u1']);
  ev(d);
  forceDice(n(miss(atk, 'HWM'), 40)); // if the attack resolves at once (no defend decision), every die misses
  must(d, { kind: 'attack', unit: 'u1', target: H(...HWM_AT) });
  return d;
}
const canEvade = (atk: UnitType, extra: Pos = {}) => {
  const d = attackHwm(atk, extra);
  return d.pending?.kind === 'defend' && d.pending.canEvade;
};

/** Heavy infantry attacks the war machine, which evades; the 5 attack dice are `faces`. The evade destination is the first offered. */
function evadeWith(faces: DieFace[], extra: Pos = {}) {
  const d = attackHwm('HI', extra);
  expect(d.pending).toMatchObject({ kind: 'defend', canEvade: true });
  forceDice(faces);
  must(d, { kind: 'defend', choice: 'evade' });
  const e = ev(d);
  if (d.pending?.kind === 'retreat') {
    expect(d.pending.reason).toBe('evade');
    must(d, { kind: 'choose', index: 0 });
    e.push(...ev(d));
  }
  return { d, e };
}

const ofKind = <K extends GameEvent['t']>(e: GameEvent[], t: K) => e.filter((x): x is Extract<GameEvent, { t: K }> => x.t === t);

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

const sortHexes = (hs: HexId[]) => [...hs].sort((a, b) => a - b);

// ---------------------------------------------------------------------------------------------

describe('heavy war machine: class and card membership', () => {
  // u1 HWM, u2 LI, u3 MI, u4 HI, u5 LC
  const army = () => build({
    units: [
      { side: 'bottom', type: 'HWM', at: [6, 2] }, { side: 'bottom', type: 'LI', at: [6, 4] }, { side: 'bottom', type: 'MI', at: [6, 6] },
      { side: 'bottom', type: 'HI', at: [6, 8] }, { side: 'bottom', type: 'LC', at: [6, 10] },
    ],
  });
  const ok = (k: CardKind) => {
    const s = army();
    return ['u1', 'u2', 'u3', 'u4', 'u5'].filter((id) => validateOrders(s, 'bottom', k, [id]) === null);
  };
  it('Order Heavy Troops orders it', () => {
    expect(ok('orderHeavy')).toEqual(['u1', 'u4']);
  });
  it('not Order Light, Medium or Mounted Troops, Mounted Charge or Move-Fire-Move', () => {
    for (const k of ['orderLight', 'orderMedium', 'orderMounted', 'mountedCharge', 'moveFireMove'] as CardKind[]) {
      expect([k, ok(k).includes('u1')]).toEqual([k, false]);
    }
  });
  it('it is foot for Line Command and Double Time', () => {
    expect(ok('lineCommand')).toEqual(['u1', 'u2', 'u3', 'u4']);
    expect(ok('doubleTime')).toEqual(['u1', 'u2', 'u3', 'u4']);
  });
  it('Darken the Sky orders it as a missile unit', () => {
    expect(autoOrders(army(), 'bottom', 'darken')).toEqual(['u1', 'u2', 'u5']);
  });
  it('red squares hit it, and so do the swords of sword-scoring units', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'bottom', type: 'LI', at: [5, 7] }, { side: 'top', type: 'HWM', at: [4, 6] }] });
    const [hi, li, hwm] = s.units;
    expect(scoreClose(s, hi, hwm, ['heavy', 'medium', 'light', 'flag'], false).hits).toBe(1);
    expect(scoreClose(s, hi, hwm, ['swords', 'heavy'], false).hits).toBe(2);
    expect(scoreClose(s, li, hwm, ['swords', 'heavy'], false).hits).toBe(1);
  });
  it('I Am Spartacus orders it with a red square', () => {
    const s = army();
    expect(validateSpartacus(s, 'bottom', ['heavy'], ['u1'])).toBeNull();
    expect(validateSpartacus(s, 'bottom', ['medium'], ['u1'])).not.toBeNull();
  });
  it('Rally restores its blocks (red square or helmet)', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HWM', at: [6, 6], blocks: 1 }], leaders: [{ side: 'bottom', at: [6, 6] }] });
    expect(rallyCandidates(s, 'bottom').map((x) => x.id)).toEqual(['u1']);
    expect(validateRally(s, 'bottom', ['heavy'], ['u1'])).toBeNull();
    expect(validateRally(s, 'bottom', ['leader'], ['u1'])).toBeNull();
  });
});

describe('heavy war machine: movement', () => {
  it('moves 1 hex and may not battle after moving', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HWM', at: [4, 6] }] });
    const moves = pieceMoves(play(s, 'order4C', ['u1']).state, 'u1');
    expect(moves).toHaveLength(6);
    expect(moves.every((m) => m.dist === 1 && !m.canBattle)).toBe(true);
  });
  // A second ordered unit (u3, far from the enemy) that has not moved keeps the movement phase open.
  it('after moving next to an enemy it may not close combat', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HWM', at: [6, 6] }, { side: 'top', type: 'MI', at: [4, 6] }, { side: 'bottom', type: 'LI', at: [8, 6] }] });
    const d = play(s, 'order4C', ['u1', 'u3']);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'ranged' }]); // range 2 before it moves
    must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
    expect(d.pending?.kind).toBe('move');
    expect(battleTargets(d.state, 'u1')).toEqual([]);
    must(d, { kind: 'endMove' });
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
  });
  it('after moving it may not fire at an enemy in range; the battle phase is skipped', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HWM', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 7] }, { side: 'bottom', type: 'LI', at: [8, 2] }] });
    const d = play(s, 'order4L', ['u1', 'u3']);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 7), kind: 'ranged' }]); // in range before it moves
    must(d, { kind: 'move', piece: 'u1', to: H(4, 3) });
    expect(d.pending?.kind).toBe('move');
    expect(battleTargets(d.state, 'u1')).toEqual([]);
    must(d, { kind: 'endMove' });
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
  });
  it('may enter forest and a fordable river, not broken ground or marsh', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'HWM', at: [4, 6] }],
      terrain: [{ at: [4, 7], t: 'broken' }, { at: [4, 5], t: 'marsh' }, { at: [3, 5], t: 'forest' }, { at: [3, 6], t: 'river', ford: true }],
    });
    const moves = pieceMoves(play(s, 'order4C', ['u1']).state, 'u1');
    expect(sortHexes(moves.map((m) => m.hex))).toEqual(sortHexes([H(3, 5), H(3, 6), H(5, 5), H(5, 6)]));
  });
});

describe('heavy war machine: ranged combat', () => {
  /** Dice of a ranged attack by the bottom war machine u1 (every die misses the medium target). */
  function fireDice(p: Pos, target: [number, number], card: CardKind = 'orderHeavy') {
    const d = toBattle(build(p), card, ['u1']);
    ev(d);
    forceDice(n('light', 2));
    must(d, { kind: 'attack', unit: 'u1', target: H(...target) });
    return combatDice(ev(d), 'ranged');
  }
  /** Battle targets of the ordered war machine u1 (asked during the movement phase, before it moves). */
  const targets = (p: Pos) => {
    const d = play(build(p), 'orderHeavy', ['u1']);
    expect(d.pending?.kind).toBe('move');
    return battleTargets(d.state, 'u1');
  };

  it('range 6 (counting the target hex), 2 dice when it did not move', () => {
    const p: Pos = { units: [{ side: 'bottom', type: 'HWM', at: [4, 0] }, { side: 'top', type: 'MI', at: [4, 6] }] };
    expect(targets(p)).toEqual([{ hex: H(4, 6), kind: 'ranged' }]);
    expect(fireDice(p, [4, 6])).toBe(2);
  });
  it('not at range 7', () => {
    expect(targets({ units: [{ side: 'bottom', type: 'HWM', at: [4, 0] }, { side: 'top', type: 'MI', at: [4, 7] }] })).toEqual([]);
  });
  it('never at an adjacent enemy, and not at all while adjacent to an enemy unit', () => {
    expect(targets({
      units: [{ side: 'bottom', type: 'HWM', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 3] }, { side: 'top', type: 'MI', at: [4, 6] }],
    })).toEqual([{ hex: H(4, 3), kind: 'close' }]);
  });
  it('normal line of sight: a unit or a forest in between blocks it', () => {
    const units: Pos['units'] = [{ side: 'bottom', type: 'HWM', at: [4, 0] }, { side: 'top', type: 'MI', at: [4, 6] }];
    expect(targets({ units: [...units, { side: 'bottom', type: 'LI', at: [4, 3] }] })).toEqual([]);
    expect(targets({ units, terrain: [{ at: [4, 3], t: 'forest' }] })).toEqual([]);
    expect(targets({ units, terrain: [{ at: [4, 3], t: 'hill' }] })).toEqual([]);
  });
  it('on a fortified camp it rolls one die fewer', () => {
    expect(fireDice({ units: [{ side: 'bottom', type: 'HWM', at: [4, 0] }, { side: 'top', type: 'MI', at: [4, 6] }], terrain: [{ at: [4, 0], t: 'camp' }] }, [4, 6])).toBe(1);
  });
  it('Darken the Sky: fires twice with 2 dice', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HWM', at: [4, 0] }, { side: 'top', type: 'MI', at: [4, 6] }] });
    const d = play(s, 'darken');
    expect(Object.keys(d.state.turn.ordered)).toEqual(['u1']);
    ev(d);
    forceDice(n('light', 4));
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    const shots = ofKind(ev(d), 'combat').filter((x) => x.purpose === 'ranged');
    expect(shots.map((x) => x.dice)).toEqual([2, 2]);
  });
});

describe('heavy war machine: close combat', () => {
  it('attacks with 2 dice when it did not move, and battles back with 2', () => {
    expect(duel('HWM', 'MI').attack).toBe(2);
    expect(duel('MI', 'HWM').back).toBe(2);
  });
  it('swords never score hits for it', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HWM', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }] });
    expect(scoreClose(s, s.units[0], s.units[1], ['swords', 'swords'], false).hits).toBe(0);
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['swords', 'swords', ...n('light', 5)]); // HI cannot evade: the roll is immediate
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')!.blocks).toBe(4);
  });
  it('Clash of Shields: ordered when adjacent to an enemy, does not move, attacks with 2 + 2 dice', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'HWM', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }, { side: 'bottom', type: 'HWM', at: [7, 2] },
    ] });
    const d = play(s, 'clash');
    expect(Object.keys(d.state.turn.ordered)).toEqual(['u1']);
    expect(pieceMoves(d.state, 'u1')).toEqual([]);
    expect(d.pending?.kind).toBe('battle');
    ev(d);
    forceDice(n('light', 8));
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(combatDice(ev(d), 'close')).toBe(4);
  });
});

describe('heavy war machine: never a momentum advance or bonus combat', () => {
  /** The bottom war machine eliminates a 1-block MI; another top MI stands behind it. */
  function hwmWins(card: 'order4C' | 'clash', leader: boolean) {
    const s = build({
      units: [{ side: 'bottom', type: 'HWM', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }, { side: 'top', type: 'MI', at: [3, 6] }],
      leaders: leader ? [{ side: 'bottom', at: [5, 6] }] : [],
    });
    const d = card === 'clash' ? play(s, 'clash') : toBattle(s, card, ['u1']);
    forceDice(['medium', ...n('light', 3)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')).toBeUndefined();
    return d;
  }
  it('not even with an attached leader', () => {
    const d = hwmWins('order4C', true);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(u(d, 'u1')!.hex).toBe(H(5, 6));
  });
  it('not under Clash of Shields', () => {
    const d = hwmWins('clash', false);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(u(d, 'u1')!.hex).toBe(H(5, 6));
  });
  it('not after the defender retreats', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HWM', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['flag', 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(rowOf(u(d, 'u2')!.hex)).toBe(3);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
  });
  it('bonusCombatEligible is false, with or without a leader', () => {
    expect(bonusCombatEligible(UNIT_STATS.HWM, false)).toBe(false);
    expect(bonusCombatEligible(UNIT_STATS.HWM, true)).toBe(false);
  });
});

describe('heavy war machine: evade', () => {
  it('may evade every attacker type when a 1-2 hex evade path exists', () => {
    for (const atk of ['LI', 'AX', 'WA', 'MI', 'HI', 'HWM', 'LC', 'LBC', 'MC', 'HC', 'CAM', 'EL', 'HCH'] as UnitType[]) {
      expect([atk, canEvade(atk)]).toEqual([atk, true]);
    }
  });
  it('cannot evade when both rear hexes are units, impassable, broken ground or marsh', () => {
    const blocked: Pos[] = [
      { units: [{ side: 'top', type: 'MI', at: [3, 5] }, { side: 'top', type: 'MI', at: [3, 6] }] },
      { terrain: [{ at: [3, 5], t: 'broken' }, { at: [3, 6], t: 'marsh' }] },
      { terrain: [{ at: [3, 5], t: 'broken' }, { at: [3, 6], t: 'broken' }] },
      { terrain: [{ at: [3, 5], t: 'marsh' }, { at: [3, 6], t: 'marsh' }] },
      { terrain: [{ at: [3, 5], t: 'lake' }, { at: [3, 6], t: 'marsh' }] },
      { units: [{ side: 'top', type: 'MI', at: [3, 5] }], terrain: [{ at: [3, 6], t: 'broken' }] },
    ];
    for (const p of blocked) expect([p, canEvade('HI', p)]).toEqual([p, false]);
  });
  it('the evade path avoids broken ground and marsh: with a single open hex it evades 1 hex', () => {
    const p: Pos = { terrain: [{ at: [3, 6], t: 'marsh' }, { at: [2, 5], t: 'broken' }, { at: [2, 6], t: 'marsh' }] };
    const { e } = evadeWith(n('light', 5), p);
    expect(ofKind(e, 'evade')).toEqual([{ t: 'evade', id: 'u2', path: [H(4, 6), H(3, 5)] }]);
  });
  it('the attacker rolls its normal dice and only red squares hit (no swords, no helmets)', () => {
    // a bottom leader next to the attacker would make helmets score in a normal close combat
    const { e } = evadeWith(['swords', 'swords', 'leader', 'medium', 'flag'], { leaders: [{ side: 'bottom', at: [5, 7] }] });
    expect(combatDice(e, 'evade')).toBe(5);
    expect(ofKind(e, 'damage')).toEqual([]);
  });
  it('if it survives it makes the evade move and then leaves the board with no banner', () => {
    const { d, e } = evadeWith(['heavy', ...n('light', 4)]);
    expect(ofKind(e, 'damage')).toMatchObject([{ id: 'u2', amount: 1, left: 1 }]);
    const evade = ofKind(e, 'evade');
    expect(evade).toHaveLength(1);
    const end = evade[0].path.at(-1)!;
    expect(rowOf(end)).toBe(2);
    const removed = e.findIndex((x) => x.t === 'removed');
    expect(e[removed]).toEqual({ t: 'removed', id: 'u2', reason: 'war machine abandoned' });
    expect(removed).toBeGreaterThan(e.findIndex((x) => x.t === 'evade'));
    expect(u(d, 'u2')).toBeUndefined();
    expect(unitAt(d.state, end)).toBeUndefined();
    expect(ofKind(e, 'eliminated')).toEqual([]);
    expect(ofKind(e, 'banner')).toEqual([]);
    expect(d.state.players.bottom.banners).toBe(0);
  });
  it('removed even at full strength', () => {
    const { d, e } = evadeWith(n('light', 5));
    expect(ofKind(e, 'removed')).toHaveLength(1);
    expect(u(d, 'u2')).toBeUndefined();
    expect(d.state.players.bottom.banners).toBe(0);
  });
  it('eliminated by the evade roll: the attacker gains the banner as usual', () => {
    const { d, e } = evadeWith(['heavy', 'heavy', ...n('light', 3)]);
    expect(ofKind(e, 'eliminated')).toEqual([{ t: 'eliminated', id: 'u2' }]);
    expect(ofKind(e, 'removed')).toEqual([]);
    expect(ofKind(e, 'evade')).toEqual([]);
    expect(d.state.players.bottom.banners).toBe(1);
  });
  it('no battle back and no momentum advance for the attacker', () => {
    const { d, e } = evadeWith(n('light', 5));
    expect(combatDice(e, 'battleBack')).toBeUndefined();
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
    expect(u(d, 'u1')!.hex).toBe(H(5, 6));
  });
  it('an attached leader evades with it and stays on that hex as a lone leader, with no casualty check', () => {
    const { d, e } = evadeWith(n('light', 5), { leaders: [{ side: 'top', at: [4, 6] }] });
    const end = ofKind(e, 'evade')[0].path.at(-1)!;
    const l = leaderById(d.state, leaderId(d.state, 0))!;
    expect(l.hex).toBe(end);
    expect(unitAt(d.state, end)).toBeUndefined();
    expect(rolls(e, 'leaderCheck')).toEqual([]);
    expect(ofKind(e, 'leaderKilled')).toEqual([]);
  });
});

describe('heavy war machine: retreat', () => {
  const S = (type: UnitType) => build({ units: [{ side: 'top', type, at: [4, 6] }] }).units[0];
  it('1 hex per flag; elephants and camels do not scare it', () => {
    for (const striker of ['HI', 'EL', 'CAM', 'LC'] as UnitType[]) expect([striker, retreatPerFlag(S('HWM'), S(striker))]).toEqual([striker, 1]);
  });
  it('a rear hex of broken ground or marsh cannot be entered: unfulfilled, 1 block lost', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'HWM', at: [4, 6] }],
      terrain: [{ at: [3, 5], t: 'broken' }, { at: [3, 6], t: 'marsh' }],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['flag', ...n('light', 4), ...n('light', 2)]); // no evade path: the roll is immediate; then the HWM battles back
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')).toMatchObject({ hex: H(4, 6), blocks: 1 });
  });
  it('retreats onto the open rear hex when the other one is marsh', () => {
    const d = attackHwm('HI', { terrain: [{ at: [3, 5], t: 'marsh' }] });
    forceDice(['flag', ...n('light', 4)]);
    must(d, { kind: 'defend', choice: 'stand' });
    expect(u(d, 'u2')).toMatchObject({ hex: H(3, 6), blocks: 2 });
  });
  it('a 2-hex retreat whose second hexes are broken ground or marsh loses 1 block', () => {
    const s = build({
      units: [{ side: 'top', type: 'HWM', at: [4, 6] }],
      terrain: [{ at: [2, 5], t: 'broken' }, { at: [2, 6], t: 'marsh' }, { at: [2, 7], t: 'broken' }],
    });
    const opts = retreatOptions(s, s.units[0], 2);
    expect(opts.length).toBeGreaterThan(0);
    for (const o of opts) {
      expect(o.losses).toBe(1);
      expect(rowOf(o.end)).toBe(3);
    }
  });
});

describe('heavy war machine: support and fortified camp', () => {
  const ctx = { kind: 'close' as const, striker: null, leaderAlive: false, fullAtStart: true };
  it('gives and receives support like any unit', () => {
    const recv = build({ units: [{ side: 'top', type: 'HWM', at: [4, 6] }, { side: 'top', type: 'MI', at: [4, 5] }, { side: 'top', type: 'MI', at: [4, 7] }] });
    expect(ignorableFlags(recv, recv.units[0], ctx)).toBe(1);
    const give = build({ units: [{ side: 'top', type: 'MI', at: [4, 6] }, { side: 'top', type: 'HWM', at: [4, 5] }, { side: 'top', type: 'HWM', at: [4, 7] }] });
    expect(ignorableFlags(give, give.units[0], ctx)).toBe(1);
  });
  it('as foot on a fortified camp it ignores 1 sword hit and 1 flag', () => {
    const s = build({ units: [{ side: 'top', type: 'HWM', at: [4, 6] }], terrain: [{ at: [4, 6], t: 'camp' }] });
    expect(baseSwordIgnores(s, s.units[0])).toBe(1);
    expect(ignorableFlags(s, s.units[0], ctx)).toBe(1);
  });
});

describe('heavy war machine: elephants and escaping leaders', () => {
  it('elephants roll 2 dice against it (attacking and battling back)', () => {
    expect(duel('EL', 'HWM').attack).toBe(2);
    expect(duel('HWM', 'EL').back).toBe(2);
  });
  it('a leader escaping through its hex meets 2 dice', () => {
    expect(escapeDiceThrough('HWM')).toBe(2);
  });
});

describe('heavy war machine: Double Time and Line Command', () => {
  // bottom HWM (u1) at (6,6) and HI (u2) at (6,7): a linked foot group
  const group = (): Pos => ({ units: [{ side: 'bottom', type: 'HWM', at: [6, 6] }, { side: 'bottom', type: 'HI', at: [6, 7] }] });
  it('Double Time: it may be in the group but moves at most 1 hex and then cannot battle', () => {
    const d = play(build(group()), 'doubleTime', ['u1', 'u2']);
    expect(Object.keys(d.state.turn.ordered).sort()).toEqual(['u1', 'u2']);
    const hwm = pieceMoves(d.state, 'u1');
    expect(Math.max(...hwm.map((m) => m.dist))).toBe(1);
    expect(hwm.every((m) => !m.canBattle)).toBe(true);
    const hi = pieceMoves(d.state, 'u2');
    expect(Math.max(...hi.map((m) => m.dist))).toBe(2);
    expect(hi.every((m) => m.canBattle)).toBe(true);
  });
  it('Line Command: ordered with the group, moves up to 1 hex and then cannot battle', () => {
    const d = play(build(group()), 'lineCommand', ['u1', 'u2']);
    expect(Object.keys(d.state.turn.ordered).sort()).toEqual(['u1', 'u2']);
    const hwm = pieceMoves(d.state, 'u1');
    expect(Math.max(...hwm.map((m) => m.dist))).toBe(1);
    expect(hwm.every((m) => !m.canBattle)).toBe(true);
  });
  it('Line Command: if it stays put it may fire', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HWM', at: [4, 0] }, { side: 'bottom', type: 'HI', at: [5, 0] }, { side: 'top', type: 'MI', at: [4, 6] }] });
    const d = toBattle(s, 'lineCommand', ['u1', 'u2']);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'ranged' }]);
  });
});

describe('AI with heavy war machines', () => {
  const opts = (side: 'top' | 'bottom'): AiOptions => ({
    side, difficulty: 'recruit', personality: PERSONALITIES[0], seed: 5, budgetScale: 0.2, deterministic: true,
  });
  let errors: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { errors = vi.spyOn(console, 'error'); });
  afterEach(() => errors.mockRestore());

  it('defend: a legal answer when a war machine is attacked', () => {
    const d = attackHwm('HI');
    forceDice([]);
    expect(d.pending).toMatchObject({ kind: 'defend', side: 'top', canEvade: true });
    const r = chooseAnswer(d.state, d.pending!, opts('top'), newMemory());
    expect(isLegal(d.state, d.pending!, r.answer)).toBe(true);
    expect(d.answer(r.answer)).toBe(true);
    expect(errors).not.toHaveBeenCalled();
  });

  it('battle: a legal answer for an ordered war machine, and the rest of the turn', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'HWM', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 6] }, { side: 'top', type: 'HWM', at: [2, 8] },
    ] });
    const d = toBattle(s, 'orderHeavy', ['u1']);
    expect(d.pending?.kind).toBe('battle');
    const mems = { top: newMemory(), bottom: newMemory() };
    for (let i = 0; i < 20 && d.pending && d.pending.kind !== 'playCard'; i++) {
      const dec = d.pending;
      const r = chooseAnswer(d.state, dec, opts(dec.side), mems[dec.side]);
      expect(isLegal(d.state, dec, r.answer), `${dec.kind}: ${JSON.stringify(r.answer)}`).toBe(true);
      expect(d.answer(r.answer)).toBe(true);
    }
    expect(d.pending?.kind).toBe('playCard');
    expect(errors).not.toHaveBeenCalled();
  });
});
