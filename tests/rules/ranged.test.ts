// Ranged combat (rules-reference §3, §4, §8).
import { beforeEach, describe, expect, it } from 'vitest';
import { battleTargets, lineOfSight, pieceMoves, type CardKind, type TerrainType, type UnitType } from '../../src/engine';
import { H, build, combatDice, ev, forceDice, forcedDiceLeft, must, n, play, toBattle, u, type Pos } from './helpers';

beforeEach(() => forceDice([]));

function targetsOf(p: Pos, id = 'u1', card: CardKind = 'orderLight') {
  const s = build(p);
  const d = toBattle(s, card, [id]);
  return { d, t: battleTargets(d.state, id) };
}

describe('range', () => {
  const rng: [UnitType, number][] = [['LI', 2], ['AX', 2], ['LC', 2], ['LB', 3], ['LS', 3]];
  for (const [type, r] of rng) {
    it(`${type} has range ${r} (counting the target hex)`, () => {
      const inR = targetsOf({ units: [{ side: 'bottom', type, at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 2 + r] }] }).t;
      expect(inR).toEqual([{ hex: H(4, 2 + r), kind: 'ranged' }]);
      const out = targetsOf({ units: [{ side: 'bottom', type, at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 3 + r] }] }).t;
      expect(out).toEqual([]);
    });
  }
  it('units without missiles (MI, HI, WA, MC, HC, EL, HCH) cannot fire', () => {
    for (const type of ['MI', 'HI', 'WA', 'MC', 'HC', 'EL', 'HCH'] as UnitType[]) {
      const { t } = targetsOf({ units: [{ side: 'bottom', type, at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 4] }] }, 'u1', 'order4L');
      expect([type, t]).toEqual([type, []]);
    }
  });
  it('an adjacent enemy is a close combat target only', () => {
    const { t } = targetsOf({ units: [{ side: 'bottom', type: 'LB', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 3] }] });
    expect(t).toEqual([{ hex: H(4, 3), kind: 'close' }]);
  });
  it('a unit adjacent to any enemy unit cannot fire at another unit', () => {
    const { t } = targetsOf({ units: [
      { side: 'bottom', type: 'LB', at: [4, 2] }, { side: 'top', type: 'MI', at: [3, 2] }, { side: 'top', type: 'MI', at: [4, 5] },
    ] });
    expect(t).toEqual([{ hex: H(3, 2), kind: 'close' }]);
  });
  it('an adjacent lone enemy leader does not prevent fire (only enemy units do)', () => {
    const { t } = targetsOf({
      units: [{ side: 'bottom', type: 'LB', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 5] }],
      leaders: [{ side: 'top', at: [3, 2] }],
    });
    expect(t).toContainEqual({ hex: H(4, 5), kind: 'ranged' });
  });
});

describe('ranged dice', () => {
  function fire(p: Pos, opts: { move?: [number, number]; card?: CardKind; targetHex: [number, number] }) {
    const s = build(p);
    const d = play(s, opts.card ?? 'orderLight', ['u1']);
    if (opts.move) must(d, { kind: 'move', piece: 'u1', to: H(...opts.move) });
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    ev(d);
    forceDice(n('heavy', 4)); // misses against a medium target
    must(d, { kind: 'attack', unit: 'u1', target: H(...opts.targetHex) });
    return combatDice(ev(d), 'ranged');
  }
  const base = (t: UnitType = 'LB'): Pos['units'] => [{ side: 'bottom', type: t, at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 5] }];
  it('2 dice if the unit did not move', () => {
    expect(fire({ units: base() }, { targetHex: [4, 5] })).toBe(2);
  });
  it('1 die after moving', () => {
    expect(fire({ units: base() }, { move: [4, 3], targetHex: [4, 5] })).toBe(1);
  });
  it('auxilia moving 1 fires 1 die; moving 2 cannot fire', () => {
    expect(fire({ units: [{ side: 'bottom', type: 'AX', at: [4, 1] }, { side: 'top', type: 'MI', at: [4, 4] }] }, { move: [4, 2], targetHex: [4, 4] })).toBe(1);
    const s = build({ units: [{ side: 'bottom', type: 'AX', at: [4, 0] }, { side: 'top', type: 'MI', at: [4, 4] }] });
    const d = play(s, 'orderLight', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(4, 2) });
    expect(battleTargets(d.state, 'u1')).toEqual([]);
  });
  it('firer in a marsh or a fordable river: max 1', () => {
    expect(fire({ units: base(), terrain: [{ at: [4, 2], t: 'marsh' }] }, { targetHex: [4, 5] })).toBe(1);
    expect(fire({ units: base(), terrain: [{ at: [4, 2], t: 'river', ford: true }] }, { targetHex: [4, 5] })).toBe(1);
  });
  it('target in a forest: max 1', () => {
    expect(fire({ units: base(), terrain: [{ at: [4, 5], t: 'forest' }] }, { targetHex: [4, 5] })).toBe(1);
  });
  it('no ranged cap for a target on marsh, broken ground, hill or ford, or a firer on hill/broken ground', () => {
    for (const tt of ['marsh', 'broken', 'hill'] as TerrainType[]) {
      expect([tt, fire({ units: base(), terrain: [{ at: [4, 5], t: tt }] }, { targetHex: [4, 5] })]).toEqual([tt, 2]);
    }
    expect(fire({ units: base(), terrain: [{ at: [4, 5], t: 'river', ford: true }] }, { targetHex: [4, 5] })).toBe(2);
    expect(fire({ units: base(), terrain: [{ at: [4, 2], t: 'broken' }] }, { targetHex: [4, 5] })).toBe(2);
  });
  it('firer on a fortified camp rolls 1 fewer die', () => {
    expect(fire({ units: base(), terrain: [{ at: [4, 2], t: 'camp' }] }, { targetHex: [4, 5] })).toBe(1);
  });
});

describe('ranged hits, flags and targets', () => {
  it('only matching class symbols hit; swords and helmets miss even with an attached leader', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'LB', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 5] }],
      leaders: [{ side: 'bottom', at: [4, 2] }],
    });
    const d = toBattle(s, 'orderLight', ['u1']);
    forceDice(['swords', 'leader']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 5) });
    expect(u(d, 'u2')!.blocks).toBe(4);
    expect(forcedDiceLeft()).toBe(0);
  });
  it('a class hit removes a block; the target may not evade or battle back', () => {
    const s = build({ units: [{ side: 'bottom', type: 'LB', at: [4, 2] }, { side: 'top', type: 'LI', at: [4, 5] }] });
    const d = toBattle(s, 'orderLight', ['u1']);
    forceDice(['light', 'heavy', 'light', 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 5) });
    expect(u(d, 'u2')!.blocks).toBe(3);
    expect(forcedDiceLeft()).toBe(2); // no evade roll, no battle back
    expect(u(d, 'u1')!.blocks).toBe(4);
  });
  it('flags make the target retreat', () => {
    const s = build({ units: [{ side: 'bottom', type: 'LB', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 5] }] });
    const d = toBattle(s, 'orderLight', ['u1']);
    forceDice(['flag', 'heavy']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 5) });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect([H(3, 4), H(3, 5)]).toContain(u(d, 'u2')!.hex);
  });
  it('a lone leader may be targeted; a helmet kills him (banner)', () => {
    const s = build({ units: [{ side: 'bottom', type: 'LB', at: [4, 2] }], leaders: [{ side: 'top', at: [4, 5] }] });
    const d = toBattle(s, 'orderLight', ['u1']);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 5), kind: 'ranged' }]);
    forceDice(['leader', 'flag']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 5) });
    expect(d.state.leaders).toHaveLength(0);
    expect(d.state.players.bottom.banners).toBe(1);
  });
  it('a lone leader not hit must evade toward his own side', () => {
    const s = build({ units: [{ side: 'bottom', type: 'LB', at: [4, 2] }], leaders: [{ side: 'top', at: [4, 5] }] });
    const d = toBattle(s, 'orderLight', ['u1']);
    forceDice(['flag', 'swords']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 5) });
    if (d.pending?.kind === 'leaderEvade') must(d, { kind: 'choose', index: 0 });
    const l = d.state.leaders[0];
    expect(l.hex === -1 || Math.floor(l.hex / 13) < 4).toBe(true);
    expect(d.state.players.bottom.banners).toBe(0);
  });
  it('an attached leader is not a separate target; hits on the unit trigger a 2-dice casualty check', () => {
    const s = build({ units: [{ side: 'bottom', type: 'LB', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 5] }], leaders: [{ side: 'top', at: [4, 5] }] });
    const d = toBattle(s, 'orderLight', ['u1']);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 5), kind: 'ranged' }]);
    forceDice(['medium', 'leader', 'leader', 'medium']); // 1 hit; check: helmet + medium -> survives
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 5) });
    expect(u(d, 'u2')!.blocks).toBe(3);
    expect(d.state.leaders).toHaveLength(1);
    expect(forcedDiceLeft()).toBe(0);
  });
});

describe('line of sight', () => {
  const los = (p: Pos, a: [number, number], b: [number, number]) => lineOfSight(build(p), H(...a), H(...b));
  it('any unit or leader in between blocks (friend or foe)', () => {
    expect(los({}, [4, 2], [4, 5])).toBe(true);
    expect(los({ units: [{ side: 'bottom', type: 'MI', at: [4, 3] }] }, [4, 2], [4, 5])).toBe(false);
    expect(los({ units: [{ side: 'top', type: 'MI', at: [4, 4] }] }, [4, 2], [4, 5])).toBe(false);
    expect(los({ leaders: [{ side: 'top', at: [4, 4] }] }, [4, 2], [4, 5])).toBe(false);
    expect(los({ leaders: [{ side: 'bottom', at: [4, 3] }] }, [4, 2], [4, 5])).toBe(false);
  });
  it('forest and camp block; marsh, broken ground, fordable river, river and lake do not', () => {
    const at = (t: TerrainType, ford?: boolean) => los({ terrain: [{ at: [4, 3], t, ford }] }, [4, 2], [4, 5]);
    expect(at('forest')).toBe(false);
    expect(at('camp')).toBe(false);
    expect(at('marsh')).toBe(true);
    expect(at('broken')).toBe(true);
    expect(at('river', true)).toBe(true);
    expect(at('river')).toBe(true);
    expect(at('lake')).toBe(true);
  });
  it('terrain in the target hex never blocks', () => {
    expect(los({ terrain: [{ at: [4, 5], t: 'forest' }] }, [4, 2], [4, 5])).toBe(true);
    expect(los({ terrain: [{ at: [4, 5], t: 'camp' }] }, [4, 2], [4, 5])).toBe(true);
  });
  it('hills: a unit on lower ground sees onto the first hill hex but not across a hill hex', () => {
    expect(los({ terrain: [{ at: [4, 4], t: 'hill' }] }, [4, 2], [4, 4])).toBe(true);
    expect(los({ terrain: [{ at: [4, 3], t: 'hill' }, { at: [4, 4], t: 'hill' }] }, [4, 2], [4, 4])).toBe(false);
    expect(los({ terrain: [{ at: [4, 3], t: 'hill' }] }, [4, 2], [4, 4])).toBe(false);
  });
  it('hills: units on the same hill see across it (plateau); from a hill across another hill hex down to the plain is blocked', () => {
    const plateau: Pos['terrain'] = [{ at: [4, 2], t: 'hill' }, { at: [4, 3], t: 'hill' }, { at: [4, 4], t: 'hill' }];
    expect(los({ terrain: plateau }, [4, 2], [4, 4])).toBe(true);
    expect(los({ terrain: [{ at: [4, 2], t: 'hill' }, { at: [4, 3], t: 'hill' }] }, [4, 2], [4, 4])).toBe(false);
  });
  it('hills: two separate hills with open ground between have line of sight', () => {
    expect(los({ terrain: [{ at: [4, 2], t: 'hill' }, { at: [4, 4], t: 'hill' }] }, [4, 2], [4, 4])).toBe(true);
  });
  it('a line along a hexside is blocked only if both hexes beside it are obstructed', () => {
    // (4,4) -> (2,4) runs between (3,3) and (3,4)
    expect(los({ terrain: [{ at: [3, 3], t: 'forest' }] }, [4, 4], [2, 4])).toBe(true);
    expect(los({ terrain: [{ at: [3, 3], t: 'forest' }, { at: [3, 4], t: 'forest' }] }, [4, 4], [2, 4])).toBe(false);
    expect(los({ terrain: [{ at: [3, 3], t: 'forest' }], units: [{ side: 'top', type: 'MI', at: [3, 4] }] }, [4, 4], [2, 4])).toBe(false);
  });
  it('blocked line of sight removes the ranged target', () => {
    const { t } = targetsOf({ units: [
      { side: 'bottom', type: 'LB', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 5] }, { side: 'bottom', type: 'MI', at: [4, 3] },
    ] });
    expect(t).toEqual([]);
  });
});

describe('cards and ranged combat', () => {
  it('Darken the Sky: every missile unit is ordered and fires twice, each shot resolved separately (may retarget)', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'LB', at: [4, 2] }, { side: 'bottom', type: 'LI', at: [6, 6] },
      { side: 'top', type: 'MI', at: [4, 5] }, { side: 'top', type: 'MI', at: [3, 3] }, { side: 'bottom', type: 'MI', at: [7, 6] },
    ] });
    const d = play(s, 'darken');
    expect(Object.keys(d.state.turn.ordered).sort()).toEqual(['u1', 'u2']);
    expect(d.pending?.kind).toBe('battle');
    ev(d);
    forceDice(['heavy', 'heavy']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 5) });
    forceDice(['heavy', 'heavy']);
    must(d, { kind: 'attack', unit: 'u1', target: H(3, 3) });
    const e = ev(d).filter((x) => x.t === 'combat' && x.purpose === 'ranged');
    expect(e.map((x) => (x as { dice: number }).dice)).toEqual([2, 2]);
    expect(battleTargets(d.state, 'u1')).toEqual([]);
  });
  it('Darken the Sky: no close combat', () => {
    const s = build({ units: [{ side: 'bottom', type: 'LI', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 3] }] });
    const d = play(s, 'darken');
    // nothing can battle: the turn ends without any combat
    expect(d.state.turn.side).toBe('top');
    expect(u(d, 'u2')!.blocks).toBe(4);
  });
  it('Move-Fire-Move: all first moves, then fire (1 die if moved), no close combat, then second moves', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'LI', at: [4, 0] }, { side: 'bottom', type: 'LB', at: [6, 6] },
      { side: 'top', type: 'MI', at: [4, 4] }, { side: 'top', type: 'MI', at: [5, 6] },
    ] });
    const d = play(s, 'moveFireMove', ['u1', 'u2']);
    must(d, { kind: 'move', piece: 'u1', to: H(4, 2) });
    expect(d.pending?.kind).toBe('move'); // u2 may still make its first move
    must(d, { kind: 'endMove' });
    expect(d.pending?.kind).toBe('battle');
    expect(battleTargets(d.state, 'u2')).toEqual([]); // adjacent to (5,6): no close combat, no fire
    ev(d);
    forceDice(['heavy']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 4) });
    expect(combatDice(ev(d), 'ranged')).toBe(1);
    expect(d.pending).toMatchObject({ kind: 'move', stage: 2 });
    expect(pieceMoves(d.state, 'u1').length).toBeGreaterThan(0);
    must(d, { kind: 'move', piece: 'u1', to: H(4, 0) });
    must(d, { kind: 'move', piece: 'u2', to: H(7, 6) });
    expect(d.pending?.kind).toBe('playCard'); // no battle after the second move
  });
  it('Mounted Charge, Double Time and Clash of Shields forbid ranged combat; Line Command allows it', () => {
    const lc = targetsOf({ units: [{ side: 'bottom', type: 'LC', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 4] }] }, 'u1', 'mountedCharge').t;
    expect(lc).toEqual([]);
    const ax = targetsOf({ units: [{ side: 'bottom', type: 'AX', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 4] }] }, 'u1', 'doubleTime').t;
    expect(ax).toEqual([]);
    const line = targetsOf({ units: [{ side: 'bottom', type: 'LI', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 4] }] }, 'u1', 'lineCommand').t;
    expect(line).toEqual([{ hex: H(4, 4), kind: 'ranged' }]);
    const s = build({ units: [
      { side: 'bottom', type: 'LI', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 3] }, { side: 'top', type: 'MI', at: [3, 5] },
    ] });
    const d = play(s, 'clash');
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 3), kind: 'close' }]);
  });
  it('I Am Spartacus: +1 ranged die, added after the marsh cap (1+1 = 2)', () => {
    const s2 = build({ units: [{ side: 'bottom', type: 'LB', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 5] }], terrain: [{ at: [4, 2], t: 'marsh' }] });
    forceDice(['light', 'flag', 'flag', 'flag', 'flag']);
    const d2 = play(s2, 'spartacus');
    expect(d2.pending?.kind).toBe('spartacus');
    must(d2, { kind: 'assign', ids: ['u1', null, null, null, null] });
    if (d2.pending?.kind === 'move') must(d2, { kind: 'endMove' });
    ev(d2);
    forceDice(['heavy', 'heavy', 'heavy']);
    must(d2, { kind: 'attack', unit: 'u1', target: H(4, 5) });
    expect(combatDice(ev(d2), 'ranged')).toBe(2);
  });
  it('a leader does not affect ranged dice or hits (no helmet hits even when attached)', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'LB', at: [4, 2] }, { side: 'top', type: 'HI', at: [4, 5] }],
      leaders: [{ side: 'bottom', at: [4, 2] }],
    });
    const d = toBattle(s, 'orderLight', ['u1']);
    ev(d);
    forceDice(['leader', 'leader']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 5) });
    expect(combatDice(ev(d), 'ranged')).toBe(2);
    expect(u(d, 'u2')!.blocks).toBe(4);
  });
  it('ranged fire vs a unit with attached leader: leader id never listed as a target', () => {
    const s = build({ units: [{ side: 'bottom', type: 'LB', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 5] }], leaders: [{ side: 'top', at: [4, 5] }] });
    const d = toBattle(s, 'orderLight', ['u1']);
    expect(battleTargets(d.state, 'u1')).toHaveLength(1);
  });
});

describe('Darken the Sky: units released during the battle phase', () => {
  it('a missile unit adjacent to an enemy may fire once that enemy has been driven off', () => {
    const s = build({ units: [
      { side: 'bottom', type: 'LB', at: [5, 6] }, { side: 'bottom', type: 'LB', at: [4, 3] },
      { side: 'top', type: 'MI', at: [4, 6] }, { side: 'top', type: 'MI', at: [2, 6] },
    ] });
    const d = play(s, 'darken');
    expect(battleTargets(d.state, 'u1')).toEqual([]);
    forceDice(['flag', 'heavy']);
    must(d, { kind: 'attack', unit: 'u2', target: H(4, 6) });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(battleTargets(d.state, 'u1').length).toBeGreaterThan(0);
  });
});

