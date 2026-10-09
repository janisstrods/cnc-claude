// Expansion #1 terrain: sea, rampart, ford without dice caps (rules-reference §16; base rules §4, §7, §8, §9, §10).
import { beforeEach, describe, expect, it } from 'vitest';
import {
  HEX_DIRS, TERRAIN_NAMES, battleTargets, ccCapOfHex, closeCombatDice, closeHitChance, createGame, directionTo, evadeOptions,
  ignorableFlags, isFord, isImpassable, leaderEvadeOptions, lineOfSight, pieceMoves, rampartProtects, rangedFromCap,
  retreatOptions, sidesCrossed, swordIgnores,
  type DieFace, type HexDir, type StrikeRole, type UnitType,
} from '../../src/engine';
import { Occ, ignorableOcc } from '../../src/ai/board';
import { closeAttackEV } from '../../src/ai/estimate';
import { singleUnitRisk } from '../../src/ai/evaluate';
import { NEUTRAL_W } from '../../src/ai/values';
import {
  H, build, combatDice, ev, forceDice, forcedDiceLeft, giveCard, must, n, noFirstStrike, play, rolls, setupOf, toBattle, u,
  type Pos,
} from './helpers';

beforeEach(() => forceDice([]));

type TerrainSpec = NonNullable<Pos['terrain']>[number];
type At = [number, number];

const sea = (at: At): TerrainSpec => ({ at, t: 'sea' });
/** A rampart hex; `faces: 'bottom'` protects its lower edges (SW, SE), the edges a top army's rampart turns to the enemy. */
const rampart = (at: At, o: { faces?: 'top' | 'bottom'; edges?: HexDir[] } = { faces: 'bottom' }): TerrainSpec => ({ at, t: 'rampart', ...o });
const nocap = (at: At): TerrainSpec => ({ at, t: 'river', ford: 'nocap' });
const ford = (at: At): TerrainSpec => ({ at, t: 'river', ford: true });

// The defender used throughout: a top unit at (4,6) (an even row). Its neighbours (rules-reference §16 table):
// E (4,7), NE (3,6), NW (3,5), W (4,5), SW (5,5), SE (5,6). With `faces: 'bottom'` the protected edges are SW and SE.
const DEF: At = [4, 6];

/**
 * Bottom `atk` at `from` declares a close-combat attack on the top `def` at (4,6), standing on `defTerrain` (default: a
 * rampart facing the bottom; null = open ground); `faces` are the dice for the attack, then the battle back. A defender
 * that could evade stands (unless `stand: false`). Returns the driver after the attack.
 */
function attack(
  atk: UnitType, def: UnitType, faces: DieFace[],
  o: { from?: At; defTerrain?: TerrainSpec | null; extra?: Pos; stand?: boolean } = {},
) {
  const s = build({
    ...o.extra,
    units: [{ side: 'bottom', type: atk, at: o.from ?? [5, 6] }, { side: 'top', type: def, at: DEF }, ...(o.extra?.units ?? [])],
    terrain: [...(o.defTerrain === null ? [] : [o.defTerrain ?? rampart(DEF)]), ...(o.extra?.terrain ?? [])],
  });
  const d = toBattle(s, 'order4C', ['u1']);
  ev(d);
  forceDice(faces);
  must(d, { kind: 'attack', unit: 'u1', target: H(...DEF) });
  if (o.stand !== false && d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: 'stand' });
  return d;
}

// ---------------------------------------------------------------------------------------------
// Sea

describe('sea (rules of a lake)', () => {
  it('is impassable for units and lone leaders; its name is Sea', () => {
    const s = build({ units: [{ side: 'bottom', type: 'LC', at: [6, 6] }], terrain: [sea([5, 6]), sea([5, 5])] });
    expect(isImpassable(s, H(5, 6))).toBe(true);
    expect(TERRAIN_NAMES.sea).toBe('Sea');
    const d = play(s, 'order4C', ['u1']);
    const hs = pieceMoves(d.state, 'u1').map((m) => m.hex);
    expect(hs).not.toContain(H(5, 6));
    expect(hs).not.toContain(H(5, 5));
    expect(hs).toContain(H(4, 6)); // around the water

    const l = build({ leaders: [{ side: 'bottom', at: [6, 6] }], terrain: [sea([5, 6])] });
    const dl = play(l, 'order4C', [l.leaders[0].id]);
    const lh = pieceMoves(dl.state, l.leaders[0].id).map((m) => m.hex);
    expect(lh).not.toContain(H(5, 6));
    expect(lh).toContain(H(5, 5));
  });

  it('blocks a retreat: each hex that cannot be entered costs a block', () => {
    const s = build({ units: [{ side: 'top', type: 'MI', at: DEF }], terrain: [sea([3, 5]), sea([3, 6])] });
    const o = retreatOptions(s, s.units[0], 1);
    expect(o.map((x) => [x.end, x.losses])).toEqual([[H(...DEF), 1]]);
  });

  it('blocks an evade', () => {
    const s = build({ units: [{ side: 'top', type: 'LI', at: DEF }], terrain: [sea([3, 5]), sea([3, 6])] });
    expect(evadeOptions(s, s.units[0])).toEqual([]);
    const d = attack('HI', 'LI', n('heavy', 10), { defTerrain: null, extra: { terrain: [sea([3, 5]), sea([3, 6])] }, stand: false });
    expect(d.pending?.kind === 'defend' && d.pending.canEvade).toBeFalsy();
  });

  it('a leader evading may neither end on nor cross the sea', () => {
    const one = build({ leaders: [{ side: 'top', at: DEF }], terrain: [sea([3, 6])] });
    const opts = leaderEvadeOptions(one, one.leaders[0]);
    expect(opts.length).toBeGreaterThan(0);
    for (const o of opts) expect(o.path).not.toContain(H(3, 6));
    const both = build({ leaders: [{ side: 'top', at: DEF }], terrain: [sea([3, 5]), sea([3, 6])] });
    expect(leaderEvadeOptions(both, both.leaders[0])).toEqual([]);
  });

  it('does not block line of sight', () => {
    const p: Pos = {
      units: [{ side: 'bottom', type: 'LB', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 5] }],
      terrain: [sea([4, 3]), sea([4, 4])],
    };
    const s = build(p);
    expect(lineOfSight(s, H(4, 2), H(4, 5))).toBe(true);
    const d = toBattle(build(p), 'orderLight', ['u1']);
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 5), kind: 'ranged' }]);
  });
});

// ---------------------------------------------------------------------------------------------
// Rampart: data, edges and geometry

describe('rampart edges', () => {
  // rules-reference §16: the neighbour across each edge, for an even-row hex (4,6) and an odd-row hex (5,6)
  const TABLE: Record<HexDir, [At, At]> = {
    E: [[4, 7], [5, 7]],
    NE: [[3, 6], [4, 7]],
    NW: [[3, 5], [4, 6]],
    W: [[4, 5], [5, 5]],
    SW: [[5, 5], [6, 6]],
    SE: [[5, 6], [6, 7]],
  };
  const NEIGHBOURS: [At, At[]][] = [
    [[4, 6], Object.values(TABLE).map((x) => x[0])],
    [[5, 6], Object.values(TABLE).map((x) => x[1])],
  ];

  it('directions are E, NE, NW, W, SW, SE in the order of the neighbour table', () => {
    expect(HEX_DIRS).toEqual(['E', 'NE', 'NW', 'W', 'SW', 'SE']);
    HEX_DIRS.forEach((dir, i) => {
      expect([dir, directionTo(H(4, 6), H(...TABLE[dir][0]))]).toEqual([dir, i]);
      expect([dir, directionTo(H(5, 6), H(...TABLE[dir][1]))]).toEqual([dir, i]);
    });
    expect(directionTo(H(4, 6), H(4, 8))).toBe(-1);
    expect(directionTo(H(4, 6), H(4, 6))).toBe(-1);
  });

  for (const dir of ['E', 'NE', 'NW', 'W', 'SW', 'SE'] as HexDir[]) {
    it(`an edge ${dir} protects against exactly the neighbour across it, on even and odd rows`, () => {
      for (const [hex, nbs] of NEIGHBOURS) {
        const s = build({ terrain: [rampart(hex, { edges: [dir] })] });
        const across = TABLE[dir][hex[0] % 2];
        for (const nb of nbs) {
          expect([dir, hex, nb, rampartProtects(s, H(...hex), H(...nb))]).toEqual([dir, hex, nb, nb === across]);
        }
      }
    });
  }

  it("faces 'top' = NW + NE, faces 'bottom' = SW + SE", () => {
    for (const [hex, nbs] of NEIGHBOURS) {
      const odd = hex[0] % 2;
      const top = build({ terrain: [rampart(hex, { faces: 'top' })] });
      const bottom = build({ terrain: [rampart(hex, { faces: 'bottom' })] });
      const prot = (s: typeof top) => nbs.filter((nb) => rampartProtects(s, H(...hex), H(...nb)));
      expect(prot(top)).toEqual([TABLE.NE[odd], TABLE.NW[odd]]);
      expect(prot(bottom)).toEqual([TABLE.SW[odd], TABLE.SE[odd]]);
    }
  });

  it('a plain hex protects nothing', () => {
    const s = build({});
    for (const nb of Object.values(TABLE).map((x) => x[0])) expect(rampartProtects(s, H(4, 6), H(...nb))).toBe(false);
  });

  it('the centre line leaves the target through one side, or through a corner (two sides)', () => {
    expect(sidesCrossed(H(4, 6), H(4, 8))).toEqual([0]); // E
    expect(sidesCrossed(H(4, 6), H(6, 7))).toEqual([5]); // SE
    expect(sidesCrossed(H(4, 6), H(2, 5))).toEqual([2]); // NW
    expect(sidesCrossed(H(4, 6), H(6, 6)).sort()).toEqual([4, 5]); // straight down the board: the SW/SE corner
    expect(sidesCrossed(H(4, 6), H(2, 6)).sort()).toEqual([1, 2]); // straight up: the NE/NW corner
    expect(sidesCrossed(H(4, 6), H(3, 7)).sort()).toEqual([0, 1]); // the E/NE corner
    expect(sidesCrossed(H(4, 6), H(3, 8))).toEqual([0]); // just below that corner: E
    expect(sidesCrossed(H(4, 6), H(0, 6)).sort()).toEqual([1, 2]); // distance 4 straight up
    expect(sidesCrossed(H(4, 6), H(5, 6))).toEqual([5]); // a neighbour: the shared side
  });

  it('scenario data is validated', () => {
    const mk = (t: TerrainSpec) => () => createGame(setupOf({ terrain: [t] }), 1);
    expect(mk({ at: [4, 6], t: 'rampart' })).toThrow(/rampart/i);
    expect(mk({ at: [4, 6], t: 'plain', faces: 'top' })).toThrow(/rampart/i);
    expect(mk({ at: [4, 6], t: 'forest', edges: ['E'] })).toThrow(/rampart/i);
    expect(mk({ at: [4, 6], t: 'plain', ford: 'nocap' })).toThrow(/river/i);
    expect(mk({ at: [4, 6], t: 'rampart', edges: ['N' as HexDir] })).toThrow(/edge/i);
    expect(mk(rampart([4, 6], { edges: ['E', 'SW', 'SE'] }))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------------------------
// Rampart: close combat

describe('rampart in close combat (foot defender attacked across a protected edge)', () => {
  // HI (5 dice) attacks a medium unit: 'heavy' misses it, 'light' misses the HI on the battle back
  const MISS_BACK = n('light', 6);

  it('ignores 1 sword', () => {
    const d = attack('HI', 'MI', ['swords', ...n('heavy', 4), ...MISS_BACK]);
    expect(u(d, 'u2')!.blocks).toBe(4);
    const c = attack('HI', 'MI', ['swords', ...n('heavy', 4), ...MISS_BACK], { defTerrain: null });
    expect(u(c, 'u2')!.blocks).toBe(3);
  });

  it('only 1: a second sword hits', () => {
    const d = attack('HI', 'MI', ['swords', 'swords', ...n('heavy', 3), ...MISS_BACK]);
    expect(u(d, 'u2')!.blocks).toBe(3);
  });

  it('may ignore 1 more flag (optional, cumulative with an attached leader)', () => {
    const d = attack('HI', 'MI', ['flag', 'flag', ...n('heavy', 3), ...MISS_BACK]);
    expect(d.pending).toMatchObject({ kind: 'ignoreFlags', unit: 'u2', flags: 2, max: 1 });
    const l = attack('HI', 'MI', ['flag', 'flag', ...n('heavy', 3), ...MISS_BACK], { extra: { leaders: [{ side: 'top', at: DEF }] } });
    expect(l.pending).toMatchObject({ kind: 'ignoreFlags', unit: 'u2', flags: 2, max: 2 });
    const c = attack('HI', 'MI', ['flag', ...n('heavy', 4), ...MISS_BACK], { defTerrain: null });
    expect(c.pending).toMatchObject({ kind: 'retreat', unit: 'u2' }); // no flag to ignore: straight to the retreat
  });

  it('an elephant does not re-roll the ignored sword; a further sword hits and is re-rolled', () => {
    // EL vs MI: 4 dice. MI battles back with 4 ('light' misses the elephant).
    const one = attack('EL', 'MI', ['swords', ...n('light', 3), ...n('light', 4)]);
    expect(rolls(ev(one), 'close')[0]).toEqual(['swords', 'light', 'light', 'light']);
    expect(u(one, 'u2')!.blocks).toBe(4);
    expect(forcedDiceLeft()).toBe(0);
    const two = attack('EL', 'MI', ['swords', 'swords', 'light', 'light', 'light', ...n('light', 4)]);
    expect(rolls(ev(two), 'close')[0]).toEqual(['swords', 'swords', 'light', 'light', 'light']);
    expect(u(two, 'u2')!.blocks).toBe(3);
    expect(forcedDiceLeft()).toBe(0);
  });

  it('attacked from a side or rear neighbour: no benefit', () => {
    for (const from of [[4, 7], [4, 5], [3, 6], [3, 5]] as At[]) {
      const d = attack('HI', 'MI', ['swords', 'flag', ...n('heavy', 3), ...MISS_BACK], { from });
      expect([from, u(d, 'u2')!.blocks]).toEqual([from, 3]);
      expect([from, d.pending?.kind]).not.toEqual([from, 'ignoreFlags']);
    }
  });

  it('a 3-edge corner piece protects its third edge too', () => {
    const corner = rampart(DEF, { edges: ['SW', 'SE', 'E'] });
    const e = attack('HI', 'MI', ['swords', ...n('heavy', 4), ...MISS_BACK], { from: [4, 7], defTerrain: corner });
    expect(u(e, 'u2')!.blocks).toBe(4);
    const sw = attack('HI', 'MI', ['swords', ...n('heavy', 4), ...MISS_BACK], { from: [5, 5], defTerrain: corner });
    expect(u(sw, 'u2')!.blocks).toBe(4);
    const w = attack('HI', 'MI', ['swords', ...n('heavy', 4), ...MISS_BACK], { from: [4, 5], defTerrain: corner });
    expect(u(w, 'u2')!.blocks).toBe(3);
  });

  it('every foot type benefits (incl. the war machine); mounted units and a lone leader do not', () => {
    const roles: StrikeRole[] = ['attack', 'bonus'];
    for (const def of ['LI', 'LB', 'LS', 'AX', 'WA', 'MI', 'HI', 'HWM'] as UnitType[]) {
      const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: def, at: DEF }], terrain: [rampart(DEF)] });
      const [hi, t] = s.units;
      for (const role of roles) {
        expect([def, role, swordIgnores(s, t, hi, role)]).toEqual([def, role, 1]);
        const ctx = { kind: 'close' as const, striker: hi, leaderAlive: false, fullAtStart: false, role };
        expect([def, role, ignorableFlags(s, t, ctx)]).toEqual([def, role, 1]);
      }
    }
    for (const def of ['LC', 'MC', 'HC', 'LBC', 'CAM'] as UnitType[]) {
      const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: def, at: DEF }], terrain: [rampart(DEF)] });
      const [hi, t] = s.units;
      expect([def, swordIgnores(s, t, hi, 'attack')]).toEqual([def, 0]);
      expect([def, ignorableFlags(s, t, { kind: 'close', striker: hi, leaderAlive: false, fullAtStart: false, role: 'attack' })]).toEqual([def, 0]);
    }
    // a heavy chariot keeps only its own sword ignore
    const hch = attack('HI', 'HCH', ['swords', 'swords', ...n('light', 3), ...n('light', 6)]);
    expect(u(hch, 'u2')!.blocks).toBe(1);
    // a mounted defender takes the sword in full
    const mc = attack('HI', 'MC', ['swords', ...n('heavy', 4), ...n('light', 6)]);
    expect(u(mc, 'u2')!.blocks).toBe(2);
    // a lone leader on a rampart: the attack works as usual (1 helmet kills)
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }], leaders: [{ side: 'top', at: DEF }], terrain: [rampart(DEF)] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice(['leader', ...n('light', 4)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(...DEF) });
    expect(d.state.leaders).toHaveLength(0);
  });

  it('only against the roll of a unit attacking it: not the battle back or First Strike against the rampart unit', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: DEF }], terrain: [rampart(DEF)] });
    const [hi, mi] = s.units;
    const expectRole = (role: StrikeRole, k: number) => {
      expect([role, swordIgnores(s, mi, hi, role)]).toEqual([role, k]);
      expect([role, ignorableFlags(s, mi, { kind: 'close', striker: hi, leaderAlive: false, fullAtStart: false, role })]).toEqual([role, k]);
    };
    expectRole('attack', 1);
    expectRole('bonus', 1);
    expectRole('back', 0);
    expectRole('firstStrike', 0);
    // without a striker the position-independent value is reported
    expect(swordIgnores(s, mi)).toBe(0);
  });

  it('the rampart unit attacking out rolls its normal dice, and the battle back against it is not reduced', () => {
    const s = build({
      first: 'top',
      units: [{ side: 'top', type: 'MI', at: DEF }, { side: 'bottom', type: 'HI', at: [5, 6] }],
      terrain: [rampart(DEF)],
    });
    expect(closeCombatDice(s, s.units[0], s.units[1], { role: 'attack', fullAtStart: true, ordered: false })).toBe(4);
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    // MI attacks with 4 ('light' misses the HI); the HI battles back with 5: a sword and a flag
    forceDice([...n('light', 4), 'swords', 'flag', 'light', 'light', 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
    const e = ev(d);
    expect(combatDice(e, 'close')).toBe(4);
    expect(combatDice(e, 'battleBack')).toBe(5);
    expect(u(d, 'u1')!.blocks).toBe(3);
    expect(e).toContainEqual({ t: 'flags', id: 'u1', flags: 1, ignored: 0 });
    expect(d.pending).toMatchObject({ kind: 'retreat', unit: 'u1' });
  });

  it('First Strike: the attack after it is protected', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: DEF }], terrain: [rampart(DEF)] });
    noFirstStrike(s);
    giveCard(s, 'top', 'firstStrike');
    const d = play(s, 'order4C', ['u1'], { keepFS: true });
    if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
    must(d, { kind: 'attack', unit: 'u1', target: H(...DEF) });
    expect(d.pending).toMatchObject({ kind: 'defend', canFirstStrike: true });
    // First Strike: MI rolls 4 ('light' misses); then the HI attacks: a sword (ignored) and 4 misses
    forceDice([...n('light', 4), 'swords', ...n('heavy', 4)]);
    must(d, { kind: 'defend', choice: 'firstStrike' });
    const e = ev(d);
    expect(combatDice(e, 'firstStrike')).toBe(4);
    expect(combatDice(e, 'close')).toBe(5);
    expect(u(d, 'u2')!.blocks).toBe(4);
    expect(forcedDiceLeft()).toBe(0);
  });

  it('a bonus close combat across a protected edge is protected', () => {
    // bottom MC at (6,5) destroys a 1-block top MI at (5,5), advances there (SW of the rampart) and attacks the rampart unit
    const run = (withRampart: boolean) => {
      const s = build({
        units: [
          { side: 'bottom', type: 'MC', at: [6, 5] }, { side: 'top', type: 'MI', at: DEF },
          { side: 'top', type: 'MI', at: [5, 5], blocks: 1 },
        ],
        terrain: withRampart ? [rampart(DEF)] : [],
      });
      const d = toBattle(s, 'order4C', ['u1']);
      forceDice(['medium', 'light', 'light']);
      must(d, { kind: 'attack', unit: 'u1', target: H(5, 5) });
      expect(d.pending).toMatchObject({ kind: 'momentum' });
      must(d, { kind: 'yesno', yes: true });
      if (d.pending?.kind === 'cavalryExtra') must(d, { kind: 'hex', hex: null });
      expect(d.pending).toMatchObject({ kind: 'bonusCombat' });
      ev(d);
      // MC bonus attack: 3 dice, a sword and 2 misses; the MI battles back with 4 misses ('light' vs the medium MC)
      forceDice(['swords', 'heavy', 'heavy', ...n('light', 4)]);
      must(d, { kind: 'hex', hex: H(...DEF) });
      expect(combatDice(ev(d), 'bonus')).toBe(3);
      return u(d, 'u2')!.blocks;
    };
    expect(run(true)).toBe(4);
    expect(run(false)).toBe(3);
  });
});

// ---------------------------------------------------------------------------------------------
// Rampart: ranged combat

describe('rampart in ranged combat', () => {
  /** Bottom `firer` at `from` fires at the top `target` at (4,6); returns the driver after the roll (`faces`). */
  function fire(firer: UnitType, from: At, target: UnitType, faces: DieFace[], defTerrain: TerrainSpec | null = rampart(DEF)) {
    const s = build({
      units: [{ side: 'bottom', type: firer, at: from }, { side: 'top', type: target, at: DEF }],
      terrain: defTerrain ? [defTerrain] : [],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(faces);
    must(d, { kind: 'attack', unit: 'u1', target: H(...DEF) });
    return d;
  }

  it('fired at through a protected edge: may ignore 1 flag; the firer rolls its normal dice', () => {
    const d = fire('LB', [6, 7], 'MI', ['flag', 'light']);
    expect(d.pending).toMatchObject({ kind: 'ignoreFlags', unit: 'u2', flags: 1, max: 1 });
    const s = build({ units: [{ side: 'bottom', type: 'LB', at: [6, 7] }, { side: 'top', type: 'MI', at: DEF }], terrain: [rampart(DEF)] });
    expect(ignorableFlags(s, s.units[1], { kind: 'ranged', striker: s.units[0], leaderAlive: false, fullAtStart: false })).toBe(1);
    const e = fire('LB', [6, 7], 'MI', ['medium', 'light']);
    expect(combatDice(ev(e), 'ranged')).toBe(2);
    expect(u(e, 'u2')!.blocks).toBe(3); // the class symbol hits as usual
  });

  it('fired at from the side or from behind: nothing', () => {
    for (const from of [[4, 8], [2, 6], [2, 5]] as At[]) {
      const d = fire('LB', from, 'MI', ['flag', 'light']);
      expect([from, d.pending?.kind]).not.toEqual([from, 'ignoreFlags']);
    }
  });

  it('a line through a corner counts if either edge there is protected [Interp]', () => {
    // from (6,6) the line runs straight up the board into the corner between SW and SE
    const sw = fire('LB', [6, 6], 'MI', ['flag', 'light'], rampart(DEF, { edges: ['SW'] }));
    expect(sw.pending).toMatchObject({ kind: 'ignoreFlags', max: 1 });
    const se = fire('LB', [6, 6], 'MI', ['flag', 'light'], rampart(DEF, { edges: ['SE'] }));
    expect(se.pending).toMatchObject({ kind: 'ignoreFlags', max: 1 });
    const e = fire('LB', [6, 6], 'MI', ['flag', 'light'], rampart(DEF, { edges: ['E'] }));
    expect(e.pending?.kind).not.toBe('ignoreFlags');
  });

  it('a mounted target gains nothing', () => {
    const s = build({ units: [{ side: 'bottom', type: 'LB', at: [6, 7] }, { side: 'top', type: 'MC', at: DEF }], terrain: [rampart(DEF)] });
    expect(ignorableFlags(s, s.units[1], { kind: 'ranged', striker: s.units[0], leaderAlive: false, fullAtStart: false })).toBe(0);
  });

  it('a war machine on a rampart fires with its full 2 dice (a camp would cost one)', () => {
    const dice = (t: TerrainSpec) => {
      const s = build({
        first: 'top',
        units: [{ side: 'top', type: 'HWM', at: DEF }, { side: 'bottom', type: 'MI', at: [7, 6] }],
        terrain: [t],
      });
      const d = toBattle(s, 'orderHeavy', ['u1']);
      ev(d);
      forceDice(n('light', 2));
      must(d, { kind: 'attack', unit: 'u1', target: H(7, 6) });
      return combatDice(ev(d), 'ranged');
    };
    expect(dice(rampart(DEF))).toBe(2);
    expect(dice({ at: DEF, t: 'camp' })).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------
// Rampart: nothing else

describe('rampart: no effect on movement, line of sight or dice', () => {
  it('does not stop movement', () => {
    // a whole row of ramparts: every route north crosses one
    const row = Array.from({ length: 13 }, (_, c) => rampart([6, c], { faces: 'top' }));
    const s = build({ units: [{ side: 'bottom', type: 'LC', at: [7, 6] }], terrain: row });
    const d = play(s, 'order4C', ['u1']);
    const m = pieceMoves(d.state, 'u1').find((x) => x.hex === H(4, 6));
    expect(m?.dist).toBe(3);
    expect(m?.canBattle).toBe(true);
  });

  it('does not block line of sight', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'LB', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 5] }],
      terrain: [rampart([4, 3]), rampart([4, 4], { faces: 'top' })],
    });
    expect(lineOfSight(s, H(4, 2), H(4, 5))).toBe(true);
  });

  it('caps no dice and costs none (unlike a camp), for either side', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'HI', at: DEF }], terrain: [rampart(DEF)] });
    const [a, b] = s.units;
    expect(closeCombatDice(s, a, b, { role: 'attack', fullAtStart: true, ordered: false })).toBe(5);
    expect(closeCombatDice(s, b, a, { role: 'back', fullAtStart: true, ordered: false })).toBe(5);
    expect(ccCapOfHex(s, H(...DEF))).toBe(99);
  });
});

// ---------------------------------------------------------------------------------------------
// Ford without caps (108 Pinarus)

describe('ford without dice caps', () => {
  it('is a passable ford: entering it stops', () => {
    // a river across row 5, fordable only at (5,6)
    const river = Array.from({ length: 12 }, (_, c): TerrainSpec => (c === 6 ? nocap([5, 6]) : { at: [5, c], t: 'river' }));
    const s = build({ units: [{ side: 'bottom', type: 'LC', at: [6, 6] }], terrain: river });
    expect(isFord(s, H(5, 6))).toBe(true);
    expect(isImpassable(s, H(5, 6))).toBe(false);
    const d = play(s, 'order4C', ['u1']);
    const moves = pieceMoves(d.state, 'u1');
    expect(moves.find((m) => m.hex === H(5, 6))?.dist).toBe(1);
    expect(moves.filter((m) => Math.floor(m.hex / 13) < 5)).toEqual([]);
  });

  it('close combat is not capped: an HI attacks out of it with 5, and into it with 5', () => {
    const out = (t: TerrainSpec) => {
      const d = attack('HI', 'MI', n('heavy', 12), { defTerrain: null, extra: { terrain: [t] } });
      return combatDice(ev(d), 'close');
    };
    expect(out(nocap([5, 6]))).toBe(5);
    expect(out(ford([5, 6]))).toBe(2);
    const into = (t: TerrainSpec) => {
      const d = attack('HI', 'MI', n('heavy', 12), { defTerrain: t });
      const e = ev(d);
      return [combatDice(e, 'close'), combatDice(e, 'battleBack')];
    };
    expect(into(nocap(DEF))).toEqual([5, 4]);
    expect(into(ford(DEF))).toEqual([2, 2]);
  });

  it('ranged fire from it is not capped', () => {
    const shot = (t: TerrainSpec) => {
      const s = build({ units: [{ side: 'bottom', type: 'LB', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 5] }], terrain: [t] });
      const d = toBattle(s, 'orderLight', ['u1']);
      ev(d);
      forceDice(n('heavy', 2));
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 5) });
      return combatDice(ev(d), 'ranged');
    };
    expect(shot(nocap([4, 2]))).toBe(2);
    expect(shot(ford([4, 2]))).toBe(1);
    const s = build({ terrain: [nocap([4, 2]), ford([4, 3])] });
    expect([ccCapOfHex(s, H(4, 2)), rangedFromCap(s, H(4, 2))]).toEqual([99, 99]);
    expect([ccCapOfHex(s, H(4, 3)), rangedFromCap(s, H(4, 3))]).toEqual([2, 1]);
  });

  it('a unit that moved into it this turn may not advance out after combat [Interp]', () => {
    const momentumOffered = (moveIn: boolean) => {
      const s = build({
        units: [{ side: 'bottom', type: 'HI', at: moveIn ? [6, 6] : [5, 6] }, { side: 'top', type: 'MI', at: DEF, blocks: 1 }],
        terrain: [nocap([5, 6])],
      });
      const d = play(s, 'order4C', ['u1']);
      if (moveIn) must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
      if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
      forceDice(n('medium', 5));
      must(d, { kind: 'attack', unit: 'u1', target: H(...DEF) });
      expect(u(d, 'u2')).toBeUndefined();
      return d.pending?.kind === 'momentum';
    };
    expect(momentumOffered(true)).toBe(false);
    expect(momentumOffered(false)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
// Previews and the AI

describe('expected hits preview and AI estimates', () => {
  it('closeHitChance counts only the swords the target does not ignore', () => {
    const s = build({
      units: [
        { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: DEF },
        { side: 'bottom', type: 'HI', at: [2, 2] }, { side: 'top', type: 'MI', at: [1, 2] },
        { side: 'bottom', type: 'HI', at: [2, 9] }, { side: 'top', type: 'MC', at: [1, 9], elite: 'companions' },
      ],
      terrain: [rampart(DEF)],
    });
    const [a, t, a2, plain, a3, comp] = s.units;
    const unignored = (dice: number) => dice / 6 - (1 - Math.pow(5 / 6, dice)); // E[max(0, swords - 1)]
    expect(closeHitChance(s, a2, plain, 5)).toBeCloseTo(2 / 6, 10);
    expect(closeHitChance(s, a, t, 5)).toBeCloseTo(1 / 6 + unignored(5) / 5, 10);
    expect(closeHitChance(s, a, t, 5, 'back')).toBeCloseTo(2 / 6, 10); // not protected against a battle back
    expect(closeHitChance(s, a3, comp, 5)).toBeCloseTo(1 / 6 + unignored(5) / 5, 10);
  });

  it('the AI sees the rampart in its combat estimates and its threat model', () => {
    const pos = (withRampart: boolean) =>
      build({
        units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: DEF }],
        terrain: withRampart ? [rampart(DEF)] : [],
      });
    const r = pos(true);
    const p = pos(false);
    const occR = new Occ(r);
    const occP = new Occ(p);
    expect(ignorableOcc(r, occR, r.units[1], 'close', r.units[0], 'attack')).toBe(1);
    expect(ignorableOcc(r, occR, r.units[1], 'close', r.units[0], 'back')).toBe(0);
    expect(ignorableOcc(p, occP, p.units[1], 'close', p.units[0], 'attack')).toBe(0);
    expect(closeAttackEV(r, occR, r.units[0], r.units[1], 'attack', true, NEUTRAL_W).ev)
      .toBeLessThan(closeAttackEV(p, occP, p.units[0], p.units[1], 'attack', true, NEUTRAL_W).ev);
    expect(singleUnitRisk(r, occR, r.units[1], NEUTRAL_W)).toBeLessThan(singleUnitRisk(p, occP, p.units[1], NEUTRAL_W));
  });
});
