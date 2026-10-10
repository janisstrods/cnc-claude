// Expansion #2 terrain and retreat rules (rules-reference §18.5 last-row retreat, §18.6 terrain; design/exp2-rulings.md
// Q10, Q12, Q13): the ditch (212), very steep hills (223), the coast played as a fordable river (217), ramparts removed by
// the Roman units that enter or pass through them (223) and the Slaves' last-row retreat (214).
import { beforeEach, describe, expect, it } from 'vitest';
import {
  SPECIAL_RULE_IDS, TERRAIN_NAMES, battleTargets, ccCapOfHex, cloneState, closeCombatDice, createGame, evadeOptions, isFord,
  isImpassable, lineOfSight, pieceMoves, rangedDice, rangedFromCap, retreatOptions, rowOf,
  type CardKind, type GameEvent, type HexId, type MoveTarget, type UnitType,
} from '../../src/engine';
import { scenarioFromJson, type ScenarioJson } from '../../src/scenarios';
import { H, build, combatDice, ev, forceDice, must, n, play, setupOf, toBattle, u, type Pos } from './helpers';

beforeEach(() => forceDice([]));

type TerrainSpec = NonNullable<Pos['terrain']>[number];
type At = [number, number];

const ditch = (at: At): TerrainSpec => ({ at, t: 'ditch' });
const hill = (at: At): TerrainSpec => ({ at, t: 'hill' });
const seaFord = (at: At): TerrainSpec => ({ at, t: 'sea', ford: true });
const lake = (at: At): TerrainSpec => ({ at, t: 'lake' });
const rampart = (at: At, faces: 'top' | 'bottom' = 'top'): TerrainSpec => ({ at, t: 'rampart', faces });

/** Move targets whose path crosses one of `hexes` before its last hex: a hex that should have stopped the piece. */
const throughStops = (moves: MoveTarget[], hexes: HexId[]): MoveTarget[] =>
  moves.filter((m) => m.path.slice(1, -1).some((h) => hexes.includes(h)));

const events = (es: GameEvent[], t: GameEvent['t']) => es.filter((e) => e.t === t);
const terrainChanges = (es: GameEvent[]) =>
  es.filter((e): e is Extract<GameEvent, { t: 'terrainChanged' }> => e.t === 'terrainChanged');

/**
 * Bottom piece(s) at (6,6) in front of a wall of two stopping hexes at (5,5) and (5,6) (the only hexes one step forward).
 * Without the wall (4,6) is two steps away; with it nothing may be reached past the wall in the 3 hexes of an MC.
 */
const WALL: At[] = [[5, 5], [5, 6]];
const wallHexes = WALL.map(([r, c]) => H(r, c));

function reach(type: UnitType, terrain: TerrainSpec[], card: CardKind = 'order4C', rules: Pos['rules'] = []) {
  const d = play(build({ units: [{ side: 'bottom', type, at: [6, 6] }], terrain, rules }), card, ['u1']);
  return pieceMoves(d.state, 'u1');
}

function leaderReach(terrain: TerrainSpec[]) {
  const s = build({ leaders: [{ side: 'bottom', at: [6, 6] }], terrain });
  const d = play(s, 'order4C', [s.leaders[0].id]);
  return pieceMoves(d.state, s.leaders[0].id);
}

// ---------------------------------------------------------------------------------------------------------------------
// Ditch (212)

describe('ditch (212)', () => {
  it('has a name, is passable and imposes no dice cap', () => {
    const s = build({ terrain: [ditch([5, 6])] });
    expect(s.terrain[H(5, 6)]).toBe('ditch');
    expect(TERRAIN_NAMES.ditch).toBe('Ditch');
    expect(isImpassable(s, H(5, 6))).toBe(false);
    expect(ccCapOfHex(s, H(5, 6))).toBeGreaterThan(5);
    expect(rangedFromCap(s, H(5, 6))).toBeGreaterThan(5);
  });

  it('every unit stops on entering it: MC, LI, and a lone leader', () => {
    for (const type of ['MC', 'LI'] as UnitType[]) {
      const moves = reach(type, WALL.map(ditch));
      expect(moves.map((m) => m.hex), type).toEqual(expect.arrayContaining(wallHexes));
      expect(throughStops(moves, wallHexes), type).toEqual([]);
      expect(moves.some((m) => m.hex === H(4, 6)), `${type} cannot get past the ditch`).toBe(false);
      expect(reach(type, []).some((m) => m.hex === H(4, 6)), `${type} controls`).toBe(true);
    }
    const lone = leaderReach(WALL.map(ditch));
    expect(lone.map((m) => m.hex)).toEqual(expect.arrayContaining(wallHexes));
    expect(throughStops(lone, wallHexes)).toEqual([]);
    expect(leaderReach([]).some((m) => m.hex === H(4, 6))).toBe(true);
  });

  it('heavy war machines may enter it', () => {
    const moves = reach('HWM', [ditch([5, 6])]);
    expect(moves.map((m) => m.hex)).toContain(H(5, 6));
  });

  it('does not block line of sight', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'LB', at: [4, 2] }, { side: 'top', type: 'MI', at: [4, 5] }],
      terrain: [ditch([4, 3]), ditch([4, 4])],
    });
    expect(lineOfSight(s, H(4, 2), H(4, 5))).toBe(true);
  });

  it('a unit may battle right after entering it, with its full dice', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'MI', at: [4, 6] }],
      terrain: [ditch([5, 6])],
    });
    const d = play(s, 'order4C', ['u1']);
    const target = pieceMoves(d.state, 'u1').find((m) => m.hex === H(5, 6))!;
    expect(target.canBattle).toBe(true);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
    expect(d.pending?.kind).toBe('battle');
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'close' }]);
    ev(d);
    forceDice(n('light', 10));
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(combatDice(ev(d), 'close', 'u1')).toBe(4); // an MI rolls 4: no ditch cap
  });

  it('a unit starting in a ditch battles out of it with its full dice', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }],
      terrain: [ditch([5, 6])],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(n('light', 10));
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(combatDice(ev(d), 'close', 'u1')).toBe(5);
  });

  /** Bottom MC u1 (5,6) wins against a 1-block top MI on (4,6); the ditch is where the loser stood (or not). */
  function wonAgainstDitch(terrain: TerrainSpec[]) {
    const s = build({
      units: [{ side: 'bottom', type: 'MC', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }],
      terrain,
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(['medium', ...n('light', 5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')).toBeUndefined();
    expect(d.pending).toMatchObject({ kind: 'momentum', hex: H(4, 6) });
    must(d, { kind: 'yesno', yes: true });
    return d;
  }

  it('a momentum advance into it is allowed but ends the cavalry extra hex', () => {
    expect(wonAgainstDitch([]).pending?.kind).toBe('cavalryExtra');
    const d = wonAgainstDitch([ditch([4, 6])]);
    expect(u(d, 'u1')!.hex).toBe(H(4, 6));
    expect(d.pending?.kind).toBe('playCard'); // no extra hex, nobody left to fight
  });

  it('a unit that moved into it may still advance out of it (unlike a ford)', () => {
    const run = (terrain: TerrainSpec) => {
      const s = build({
        units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }],
        terrain: [terrain],
      });
      const d = play(s, 'order4C', ['u1']);
      must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
      ev(d);
      forceDice(['medium', ...n('light', 5)]);
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      return d;
    };
    expect(run(ditch([5, 6])).pending).toMatchObject({ kind: 'momentum', hex: H(4, 6) });
    expect(run({ at: [5, 6], t: 'river', ford: true }).pending?.kind).not.toBe('momentum');
  });

  it('retreats and evades pass through it', () => {
    const s = build({ units: [{ side: 'top', type: 'LI', at: [4, 6] }], terrain: [ditch([3, 5]), ditch([3, 6])] });
    const retreat = retreatOptions(s, s.units[0], 2);
    expect(retreat.length).toBeGreaterThan(0);
    for (const o of retreat) expect([o.losses, o.path.length]).toEqual([0, 2]);
    const evade = evadeOptions(s, s.units[0]);
    expect(evade.length).toBeGreaterThan(0);
    for (const o of evade) expect(o.path).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Very steep hills (223)

describe('very steep hills (223)', () => {
  const VH: Pos['rules'] = ['veryHills'];

  it('is a known special rule id', () => {
    expect(SPECIAL_RULE_IDS).toContain('veryHills');
    expect(build({ rules: VH }).special.rules).toEqual(['veryHills']);
  });

  describe('moving onto a hill from lower ground', () => {
    it('stops the unit (MI, LI) and forbids battle that turn', () => {
      const hills = [hill([5, 5]), hill([5, 6])];
      const hex = [H(5, 5), H(5, 6)];
      const li = reach('LI', hills, 'order4C', VH);
      expect(li.map((m) => m.hex)).toEqual(expect.arrayContaining(hex));
      expect(throughStops(li, hex)).toEqual([]);
      expect(li.some((m) => m.hex === H(4, 6))).toBe(false);
      expect(li.filter((m) => hex.includes(m.hex)).every((m) => !m.canBattle)).toBe(true);
      // without the rule a hill neither stops nor forbids a battle
      const free = reach('LI', hills);
      expect(free.some((m) => m.hex === H(4, 6))).toBe(true);
      expect(free.filter((m) => hex.includes(m.hex)).every((m) => m.canBattle)).toBe(true);
    });

    it('the unit really cannot battle: with an enemy next door the battle step never opens', () => {
      const pos = (rules: Pos['rules']): Pos => ({
        units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'MI', at: [4, 6] }],
        terrain: [hill([5, 6])], rules,
      });
      const climb = play(build(pos(VH)), 'order4C', ['u1']);
      must(climb, { kind: 'move', piece: 'u1', to: H(5, 6) });
      expect(climb.pending).toMatchObject({ kind: 'playCard', side: 'top' });
      const flat = play(build(pos([])), 'order4C', ['u1']);
      must(flat, { kind: 'move', piece: 'u1', to: H(5, 6) });
      expect(flat.pending?.kind).toBe('battle');
    });

    it('hill to hill is not a climb: the unit may battle and go on over the hills', () => {
      const s = build({
        units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'MI', at: [3, 6] }],
        terrain: [hill([5, 6]), hill([4, 6])], rules: VH,
      });
      const d = play(s, 'order4C', ['u1']);
      const step = pieceMoves(d.state, 'u1').find((m) => m.hex === H(4, 6))!;
      expect(step.canBattle).toBe(true);
      must(d, { kind: 'move', piece: 'u1', to: H(4, 6) });
      expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(3, 6), kind: 'close' }]);

      const li = build({ units: [{ side: 'bottom', type: 'LI', at: [5, 6] }], terrain: [hill([5, 6]), hill([4, 6]), hill([3, 6])], rules: VH });
      const lm = pieceMoves(play(li, 'order4C', ['u1']).state, 'u1');
      expect(lm.find((m) => m.hex === H(3, 6))?.path).toEqual([H(5, 6), H(4, 6), H(3, 6)]);
    });

    it('of two equally short routes onto a hill, the one over hills (no climb) is the one offered', () => {
      // LI on the hill (5,6) to the hill (3,6): over the open ground (4,7), which is a climb, or over the hill (4,6)
      const s = build({
        units: [{ side: 'bottom', type: 'LI', at: [5, 6] }, { side: 'top', type: 'MI', at: [2, 6] }],
        terrain: [hill([5, 6]), hill([4, 6]), hill([3, 6])], rules: VH,
      });
      const step = pieceMoves(play(s, 'order4C', ['u1']).state, 'u1').find((m) => m.hex === H(3, 6))!;
      expect(step.path).toEqual([H(5, 6), H(4, 6), H(3, 6)]);
      expect(step.canBattle).toBe(true);
    });

    it('a lone leader is not stopped by a hill', () => {
      const s = build({ leaders: [{ side: 'bottom', at: [6, 6] }], terrain: [hill([5, 5]), hill([5, 6])], rules: VH });
      const moves = pieceMoves(play(s, 'order4C', [s.leaders[0].id]).state, s.leaders[0].id);
      expect(moves.some((m) => m.hex === H(4, 6))).toBe(true); // over the hills and on
    });

    it('light troops passing through friends (Order Light Troops) cannot skip the climb; hill to hill they pass', () => {
      // LI (6,6), a friend on the hill (5,6), more hills either side: through the friend to (4,6) would be a free climb
      const climb = (rules: Pos['rules']) =>
        build({
          units: [{ side: 'bottom', type: 'LI', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'MI', at: [0, 0] }],
          terrain: [hill([5, 5]), hill([5, 6]), hill([5, 7])], rules,
        });
      const reachOf = (s: ReturnType<typeof climb>) => pieceMoves(play(s, 'orderLight', ['u1']).state, 'u1');
      expect(reachOf(climb([])).find((m) => m.hex === H(4, 6))?.path).toEqual([H(6, 6), H(5, 6), H(4, 6)]); // control
      const blocked = reachOf(climb(VH));
      expect(blocked.some((m) => m.hex === H(4, 6))).toBe(false);
      expect(blocked.some((m) => m.path.includes(H(5, 6)) && m.hex !== H(5, 6))).toBe(false);

      // from a hill, through a friend on the next hill, onto a third: no climb anywhere, the unit may battle
      const along = build({
        units: [
          { side: 'bottom', type: 'LI', at: [5, 6] }, { side: 'bottom', type: 'MI', at: [4, 6] }, { side: 'top', type: 'MI', at: [2, 6] },
        ],
        terrain: [hill([5, 6]), hill([4, 6]), hill([3, 6])], rules: VH,
      });
      const step = reachOf(along).find((m) => m.hex === H(3, 6))!;
      expect(step.path).toEqual([H(5, 6), H(4, 6), H(3, 6)]);
      expect(step.canBattle).toBe(true);
    });

    it('a warrior charge needs a battle, so it may not end on a hill it climbs', () => {
      const wa = (rules: Pos['rules']) => {
        const s = build({
          units: [{ side: 'bottom', type: 'WA', at: [6, 6] }, { side: 'top', type: 'MI', at: [3, 6] }],
          terrain: [hill([4, 6])], rules,
        });
        return pieceMoves(play(s, 'order4C', ['u1']).state, 'u1');
      };
      // two hexes to (4,6), next to the enemy: a charge that must battle, which a climb forbids
      expect(wa([]).find((m) => m.hex === H(4, 6))).toMatchObject({ mustBattle: true, canBattle: true });
      expect(wa(VH).some((m) => m.hex === H(4, 6))).toBe(false);
      expect(wa(VH).some((m) => m.hex === H(5, 6))).toBe(true); // a one-hex move over open ground is as before
    });
  });

  describe('close-combat dice caps replace the hill caps', () => {
    /** Top MI at (4,6) and bottom HI at (5,6); `hills` lists which of the two stand on a hill. */
    const pair = (hills: ('top' | 'bottom')[], rules: Pos['rules'] = VH) =>
      build({
        units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }],
        terrain: [...(hills.includes('bottom') ? [hill([5, 6])] : []), ...(hills.includes('top') ? [hill([4, 6])] : [])],
        rules,
      });
    const dice = (s: ReturnType<typeof pair>, striker: 0 | 1, role: 'attack' | 'back' = 'attack') =>
      closeCombatDice(s, s.units[striker], s.units[striker === 0 ? 1 : 0], { role, fullAtStart: true, ordered: false });

    it('uphill 1, downhill 2, hill to hill 3', () => {
      expect(dice(pair(['top']), 0)).toBe(1); // HI (5 dice) attacking a hill from the plain
      expect(dice(pair(['bottom']), 0)).toBe(2); // HI on a hill attacking down
      expect(dice(pair(['top', 'bottom']), 0)).toBe(3); // hill to hill
      expect(dice(pair([]), 0)).toBe(5); // open ground
    });

    it('differs from the ordinary hill caps (uphill 2, downhill 3)', () => {
      expect(dice(pair(['top'], []), 0)).toBe(2);
      expect(dice(pair(['bottom'], []), 0)).toBe(3);
    });

    it('applies to the battle back as well, judged from the battling unit', () => {
      // the top MI (4 dice back) on the hill fights back down at the plain: 2
      expect(dice(pair(['top']), 1, 'back')).toBe(2);
      expect(dice(pair(['top'], []), 1, 'back')).toBe(3);
      // the top MI on the plain fights back up at the bottom unit on its hill: 1
      expect(dice(pair(['bottom']), 1, 'back')).toBe(1);
    });

    it('applies against a lone leader and takes the minimum with the other caps', () => {
      const s = build({
        units: [{ side: 'bottom', type: 'HI', at: [5, 6] }],
        leaders: [{ side: 'top', at: [4, 6] }],
        terrain: [hill([4, 6])], rules: VH,
      });
      expect(closeCombatDice(s, s.units[0], s.leaders[0], { role: 'attack', fullAtStart: true, ordered: false })).toBe(1);
      const forest = build({
        units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6] }],
        terrain: [{ at: [5, 6], t: 'forest' }, hill([4, 6])], rules: VH,
      });
      expect(dice(forest, 0)).toBe(1); // min(forest 2, uphill 1)
    });

    it('a card bonus adds on top: HI uphill with Clash of Shields rolls 1 + 2', () => {
      const d = play(pair(['top']), 'clash');
      ev(d);
      forceDice(n('light', 12));
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      expect(combatDice(ev(d), 'close', 'u1')).toBe(3);
    });
  });

  describe('a momentum advance onto a hill from lower ground', () => {
    /** Bottom HI u1 (with a leader, so a bonus combat is possible) beats a 1-block top MI on (4,6); a second MI waits at (3,6). */
    function advance(opts: { from: 'plain' | 'hill'; rules: Pos['rules']; card?: CardKind }) {
      const s = build({
        units: [
          { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }, { side: 'top', type: 'MI', at: [3, 6] },
        ],
        leaders: [{ side: 'bottom', at: [5, 6] }],
        terrain: [hill([4, 6]), ...(opts.from === 'hill' ? [hill([5, 6])] : [])],
        rules: opts.rules,
      });
      const d = toBattle(s, 'order4C', ['u1']);
      ev(d);
      forceDice(['medium', ...n('light', 5)]);
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      expect(d.pending).toMatchObject({ kind: 'momentum', hex: H(4, 6) });
      must(d, { kind: 'yesno', yes: true });
      return d;
    }

    it('gives no bonus combat', () => {
      const up = advance({ from: 'plain', rules: VH });
      expect(u(up, 'u1')!.hex).toBe(H(4, 6));
      expect(up.pending).toMatchObject({ kind: 'playCard', side: 'top' });
      expect(advance({ from: 'plain', rules: [] }).pending?.kind).toBe('bonusCombat'); // control: the ordinary hill
    });

    it('hill to hill still gives the bonus combat', () => {
      expect(advance({ from: 'hill', rules: VH }).pending).toMatchObject({ kind: 'bonusCombat', targets: [H(3, 6)] });
    });

    it('a cavalry extra hex that climbs also ends the advance: no bonus combat', () => {
      // MC beats a 1-block MI on open ground (4,6), advances, then takes the extra hex onto the hill (3,6) next to an enemy
      const run = (rules: Pos['rules']) => {
        const s = build({
          units: [
            { side: 'bottom', type: 'MC', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }, { side: 'top', type: 'MI', at: [2, 6] },
          ],
          terrain: [hill([3, 6])], rules,
        });
        const d = toBattle(s, 'order4C', ['u1']);
        ev(d);
        forceDice(['medium', ...n('light', 5)]);
        must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
        must(d, { kind: 'yesno', yes: true });
        expect(d.pending).toMatchObject({ kind: 'cavalryExtra' });
        must(d, { kind: 'hex', hex: H(3, 6) });
        expect(u(d, 'u1')!.hex).toBe(H(3, 6));
        return d;
      };
      expect(run([]).pending).toMatchObject({ kind: 'bonusCombat', targets: [H(2, 6)] }); // control: the ordinary hill
      expect(run(VH).pending).toMatchObject({ kind: 'playCard', side: 'top' });
    });
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Coast played as a fordable river (217)

describe('sea as a ford (217)', () => {
  it('{ t: sea, ford: true } builds exactly the fordable river hex', () => {
    const coast = build({ terrain: [seaFord([5, 6]), seaFord([5, 5])] });
    const river = build({ terrain: [{ at: [5, 6], t: 'river', ford: true }, { at: [5, 5], t: 'river', ford: true }] });
    expect(coast.terrain[H(5, 6)]).toBe('river');
    expect(coast.fords[H(5, 6)]).toBe(true);
    expect(coast.noCap[H(5, 6)]).toBe(false);
    expect(isFord(coast, H(5, 6))).toBe(true);
    expect(isImpassable(coast, H(5, 6))).toBe(false);
    expect(coast.terrain).toEqual(river.terrain);
    expect(coast.fords).toEqual(river.fords);
    expect(coast.noCap).toEqual(river.noCap);
    expect(coast.rampart).toEqual(river.rampart);
  });

  it('plain sea stays impassable, with or without ford: false', () => {
    const s = build({ terrain: [{ at: [5, 6], t: 'sea' }, { at: [5, 5], t: 'sea', ford: false }] });
    expect(s.terrain[H(5, 6)]).toBe('sea');
    expect(isImpassable(s, H(5, 6))).toBe(true);
    expect(s.terrain[H(5, 5)]).toBe('sea');
  });

  it('units and lone leaders stop on entering it', () => {
    for (const type of ['MC', 'LI'] as UnitType[]) {
      const moves = reach(type, WALL.map(seaFord));
      expect(moves.map((m) => m.hex), type).toEqual(expect.arrayContaining(wallHexes));
      expect(throughStops(moves, wallHexes), type).toEqual([]);
      expect(moves.some((m) => m.hex === H(4, 6))).toBe(false);
    }
    const lone = leaderReach(WALL.map(seaFord));
    expect(throughStops(lone, wallHexes)).toEqual([]);
    expect(lone.map((m) => m.hex)).toEqual(expect.arrayContaining(wallHexes));
  });

  it('caps close combat at 2 into and out of it, and ranged fire out of it at 1', () => {
    const pos = (unitHex: At, terrain: TerrainSpec[]) =>
      build({ units: [{ side: 'bottom', type: 'HI', at: unitHex }, { side: 'top', type: 'MI', at: [4, 6] }], terrain });
    const dice = (s: ReturnType<typeof pos>, striker: 0 | 1) =>
      closeCombatDice(s, s.units[striker], s.units[striker === 0 ? 1 : 0], { role: 'attack', fullAtStart: true, ordered: false });
    expect(dice(pos([5, 6], []), 0)).toBe(5);
    expect(dice(pos([5, 6], [seaFord([5, 6])]), 0)).toBe(2); // out of the ford
    expect(dice(pos([5, 6], [seaFord([4, 6])]), 0)).toBe(2); // into the ford
    const lb = (terrain: TerrainSpec[]) => {
      const s = build({ units: [{ side: 'bottom', type: 'LB', at: [6, 6] }, { side: 'top', type: 'MI', at: [4, 6] }], terrain });
      return rangedDice(s, s.units[0], H(4, 6), 0, false);
    };
    expect(lb([])).toBe(2);
    expect(lb([seaFord([6, 6])])).toBe(1);
    expect(lb([seaFord([4, 6])])).toBe(2); // only the firer's hex caps a ranged attack
  });

  it('a ford hex needs ford: true: other terrain with a ford, or a no-cap sea ford, is an error', () => {
    expect(() => build({ terrain: [{ at: [5, 6], t: 'hill', ford: true }] })).toThrow(/ford must be a river/);
    expect(() => build({ terrain: [{ at: [5, 6], t: 'sea', ford: 'nocap' }] })).toThrow(/sea/);
  });

  it('the terrain art hint is accepted and the engine ignores it', () => {
    const setup = setupOf({ terrain: [seaFord([5, 6])] });
    const plain = createGame(setup, 7);
    const withArt = createGame({ ...setup, terrain: setup.terrain.map((t) => ({ ...t, art: 'sea' })) }, 7);
    expect(withArt).toEqual(plain);
    expect(() => createGame({ ...setup, terrain: setup.terrain.map((t) => ({ ...t, art: 5 as unknown as string })) }, 7)).toThrow(/art/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Rampart breakers (223)

describe('rampart breakers (223)', () => {
  const BREAKERS: Pos['rampartBreakers'] = 'bottom';

  it('is off by default and kept by cloneState; an unknown side is an error', () => {
    expect(build({}).special.rampartBreakers).toBeNull();
    const s = build({ rampartBreakers: 'bottom' });
    expect(s.special.rampartBreakers).toBe('bottom');
    expect(cloneState(s).special.rampartBreakers).toBe('bottom');
    expect(() => createGame({ ...setupOf({}), rampartBreakers: 'left' as never }, 1)).toThrow(/rampartBreakers/);
  });

  /** Bottom MI u1 (6,6) moves onto the rampart at (5,6); `who` names the breaker side of the battle. */
  function stepOnto(who: Pos['rampartBreakers']) {
    const s = build({
      units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'MI', at: [0, 0] }],
      terrain: [rampart([5, 6])], rampartBreakers: who,
    });
    const before = s.rampart[H(5, 6)];
    const d = play(s, 'order4C', ['u1']);
    ev(d);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
    return { d, es: ev(d), before };
  }

  it('a unit of that side moving onto a rampart hex makes it open ground (event, mask 0)', () => {
    const { d, es, before } = stepOnto(BREAKERS);
    expect(before).not.toBe(0);
    expect(d.state.terrain[H(5, 6)]).toBe('plain');
    expect(d.state.rampart[H(5, 6)]).toBe(0);
    expect(terrainChanges(es)).toEqual([{ t: 'terrainChanged', hex: H(5, 6), terrain: 'plain' }]);
    const kinds = es.map((e) => e.t);
    expect(kinds.indexOf('move')).toBeLessThan(kinds.indexOf('terrainChanged'));
  });

  it("the other side's units, a battle without breakers, and lone leaders leave it standing", () => {
    for (const who of ['top', undefined] as Pos['rampartBreakers'][]) {
      const { d, es, before } = stepOnto(who);
      expect(terrainChanges(es), String(who)).toEqual([]);
      expect(d.state.terrain[H(5, 6)]).toBe('rampart');
      expect(d.state.rampart[H(5, 6)]).toBe(before);
    }
    const s = build({ leaders: [{ side: 'bottom', at: [6, 6] }], terrain: [rampart([5, 6])], rampartBreakers: BREAKERS });
    const d = play(s, 'order4C', [s.leaders[0].id]);
    must(d, { kind: 'move', piece: s.leaders[0].id, to: H(5, 6) });
    expect(d.state.terrain[H(5, 6)]).toBe('rampart');
    // and a unit of the other side (top) does not break them: it is the bottom side that is named
    const top = build({
      units: [{ side: 'top', type: 'MI', at: [3, 6] }], terrain: [rampart([4, 6], 'bottom')], rampartBreakers: BREAKERS, first: 'top',
    });
    const dt = play(top, 'order4C', ['u1']);
    must(dt, { kind: 'move', piece: 'u1', to: H(4, 6) });
    expect(dt.state.terrain[H(4, 6)]).toBe('rampart');
  });

  it('a rampart passed through on a move is removed, but not the start hex', () => {
    // LI (7,6) -> (5,6) in two hexes; the lake leaves (6,6), the rampart, as the only way
    const s = build({
      units: [{ side: 'bottom', type: 'LI', at: [7, 6] }, { side: 'top', type: 'MI', at: [0, 0] }],
      terrain: [rampart([6, 6]), lake([6, 7])], rampartBreakers: BREAKERS,
    });
    const d = play(s, 'order4C', ['u1']);
    const target = pieceMoves(d.state, 'u1').find((m) => m.hex === H(5, 6))!;
    expect(target.path).toEqual([H(7, 6), H(6, 6), H(5, 6)]);
    ev(d);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
    expect(terrainChanges(ev(d))).toEqual([{ t: 'terrainChanged', hex: H(6, 6), terrain: 'plain' }]);
    expect(d.state.terrain[H(6, 6)]).toBe('plain');

    // a unit that starts on a rampart does not break the one it stands on by leaving it
    const start = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }], terrain: [rampart([6, 6])], rampartBreakers: BREAKERS });
    const ds = play(start, 'order4C', ['u1']);
    must(ds, { kind: 'move', piece: 'u1', to: H(5, 6) });
    expect(ds.state.terrain[H(6, 6)]).toBe('rampart');
  });

  it('a cloned state never sees the change (the terrain arrays are replaced, not edited)', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'MI', at: [6, 6] }], terrain: [rampart([5, 6])], rampartBreakers: BREAKERS,
    });
    const copy = cloneState(s);
    const d = play(s, 'order4C', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
    expect(d.state.terrain[H(5, 6)]).toBe('plain');
    expect(copy.terrain[H(5, 6)]).toBe('rampart');
    expect(copy.rampart[H(5, 6)]).not.toBe(0);
  });

  /** Top MI u1 (3,6) strikes the bottom unit u2 (4,6) with a flag; the only rear hex of u2 is the rampart (5,5). */
  function struck(type: UnitType, breakers: Pos['rampartBreakers']) {
    const s = build({
      units: [{ side: 'top', type: 'MI', at: [3, 6] }, { side: 'bottom', type, at: [4, 6] }],
      terrain: [rampart([5, 5], 'bottom'), lake([5, 6])], rampartBreakers: breakers, first: 'top',
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    return d;
  }

  it('a retreat through a rampart hex removes it (destination included)', () => {
    const d = struck('MI', BREAKERS);
    forceDice(['flag', ...n('light', 5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')!.hex).toBe(H(5, 5));
    expect(d.state.terrain[H(5, 5)]).toBe('plain');
    expect(d.state.rampart[H(5, 5)]).toBe(0);
    const es = ev(d);
    expect(terrainChanges(es)).toEqual([{ t: 'terrainChanged', hex: H(5, 5), terrain: 'plain' }]);
    const kinds = es.map((e) => e.t);
    expect(kinds.indexOf('retreat')).toBeLessThan(kinds.indexOf('terrainChanged'));
  });

  it('a retreat of the other side leaves the rampart', () => {
    const d = struck('MI', 'top');
    forceDice(['flag', ...n('light', 5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')!.hex).toBe(H(5, 5));
    expect(d.state.terrain[H(5, 5)]).toBe('rampart');
  });

  it('an evade through a rampart hex removes it', () => {
    const d = struck('LI', BREAKERS);
    forceDice(n('heavy', 5)); // the evade roll misses a light unit
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending).toMatchObject({ kind: 'defend', canEvade: true });
    must(d, { kind: 'defend', choice: 'evade' });
    expect(d.pending).toMatchObject({ kind: 'retreat', reason: 'evade' }); // two ways on beyond the rampart
    must(d, { kind: 'choose', index: 0 });
    expect(u(d, 'u2')!.hex).not.toBe(H(4, 6));
    expect(d.state.terrain[H(5, 5)]).toBe('plain');
    expect(d.state.rampart[H(5, 5)]).toBe(0);
  });

  /** Bottom HI u1 (5,6) eliminates a 1-block top MI on the rampart (4,6), then is asked about the advance. */
  function beatsRampartHolder() {
    const s = build({
      units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }],
      terrain: [rampart([4, 6], 'bottom')], rampartBreakers: BREAKERS,
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(['medium', ...n('light', 5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending).toMatchObject({ kind: 'momentum', hex: H(4, 6) });
    return d;
  }

  it('a momentum advance onto a rampart hex removes it; declining the advance does not', () => {
    const yes = beatsRampartHolder();
    expect(yes.state.terrain[H(4, 6)]).toBe('rampart'); // the rampart falls when the unit enters, not before
    ev(yes);
    must(yes, { kind: 'yesno', yes: true });
    expect(yes.state.terrain[H(4, 6)]).toBe('plain');
    expect(yes.state.rampart[H(4, 6)]).toBe(0);
    expect(terrainChanges(ev(yes))).toEqual([{ t: 'terrainChanged', hex: H(4, 6), terrain: 'plain' }]);

    const no = beatsRampartHolder();
    must(no, { kind: 'yesno', yes: false });
    expect(no.state.terrain[H(4, 6)]).toBe('rampart');
  });

  it('the cavalry extra hex after an advance removes a rampart it enters', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'MC', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 6], blocks: 1 }],
      terrain: [rampart([3, 6], 'bottom')], rampartBreakers: BREAKERS,
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(['medium', ...n('light', 5)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    must(d, { kind: 'yesno', yes: true });
    expect(d.pending).toMatchObject({ kind: 'cavalryExtra' });
    expect((d.pending as { options: HexId[] }).options).toContain(H(3, 6));
    must(d, { kind: 'hex', hex: H(3, 6) });
    expect(u(d, 'u1')!.hex).toBe(H(3, 6));
    expect(d.state.terrain[H(3, 6)]).toBe('plain');
    expect(d.state.rampart[H(3, 6)]).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Last-row retreat (214)

describe('last-row retreat (214)', () => {
  const eliminations = (es: GameEvent[]) => events(es, 'eliminated');

  it('is off by default and kept by cloneState; an unknown side is an error', () => {
    expect(build({}).special.lastRowRetreat).toBeNull();
    const s = build({ lastRowRetreat: 'top' });
    expect(s.special.lastRowRetreat).toBe('top');
    expect(cloneState(s).special.lastRowRetreat).toBe('top');
    expect(() => createGame({ ...setupOf({}), lastRowRetreat: 'left' as never }, 1)).toThrow(/lastRowRetreat/);
  });

  /**
   * Bottom HI u1 attacks the top piece u2 and rolls a flag (and nothing else that hits). `rule` is the battle's
   * `lastRowRetreat` side. u2 stands where `at` says, as `type` with `blocks`.
   */
  function flagged(
    o: { rule: Pos['lastRowRetreat']; at: At; type?: UnitType; blocks?: number; from?: At; extra?: Pos },
  ) {
    const s = build({
      ...o.extra,
      units: [
        { side: 'bottom', type: 'HI', at: o.from ?? [o.at[0] + 1, o.at[1]] },
        { side: 'top', type: o.type ?? 'MI', at: o.at, blocks: o.blocks },
      ],
      lastRowRetreat: o.rule,
      terrain: o.extra?.terrain,
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(['flag', ...n('light', 8)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(...o.at) });
    return d;
  }

  it('a unit on its baseline row that must retreat is eliminated and the enemy scores', () => {
    const d = flagged({ rule: 'top', at: [0, 6], from: [1, 6] });
    expect(u(d, 'u2')).toBeUndefined();
    expect(d.state.players.bottom.banners).toBe(1);
    expect(d.state.players.top.banners).toBe(0);
    const es = ev(d);
    expect(eliminations(es)).toEqual([{ t: 'eliminated', id: 'u2' }]);
    expect(es.find((e) => e.t === 'banner')).toMatchObject({ t: 'banner', side: 'bottom', total: 1 });
    // it lost all four blocks at once, not just one
    expect(es.find((e) => e.t === 'damage')).toMatchObject({ id: 'u2', amount: 4, left: 0 });
  });

  it('without the rule (or for the other side) the same unit just loses a block', () => {
    for (const rule of [undefined, 'bottom'] as Pos['lastRowRetreat'][]) {
      const d = flagged({ rule, at: [0, 6], from: [1, 6] });
      expect(u(d, 'u2')!.blocks, String(rule)).toBe(3);
      expect(d.state.players.bottom.banners, String(rule)).toBe(0);
    }
  });

  it('a retreat blocked away from the baseline row costs blocks as usual', () => {
    // row 3, both retreat hexes are lake: one block lost for the one hex not taken, however far the baseline is
    const d = flagged({ rule: 'top', at: [3, 6], from: [4, 6], extra: { terrain: [lake([2, 6]), lake([2, 7])] } });
    expect(u(d, 'u2')).toMatchObject({ hex: H(3, 6), blocks: 3 });
    expect(d.state.players.bottom.banners).toBe(0);
  });

  it('applies to either side: a bottom unit on row 8', () => {
    const s = build({
      units: [{ side: 'top', type: 'HI', at: [7, 6] }, { side: 'bottom', type: 'MI', at: [8, 6] }],
      lastRowRetreat: 'bottom', first: 'top',
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(['flag', ...n('light', 8)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(8, 6) });
    expect(u(d, 'u2')).toBeUndefined();
    expect(d.state.players.top.banners).toBe(1);
  });

  it('an elephant, whose retreat is its own code path, is eliminated too', () => {
    // the elephant rampages first (2 dice for the neighbouring HI: all misses), then cannot retreat from row 0
    const d = flagged({ rule: 'top', at: [0, 6], type: 'EL', from: [1, 6] });
    expect(u(d, 'u2')).toBeUndefined();
    expect(d.state.players.bottom.banners).toBe(1);
    const es = ev(d);
    expect(events(es, 'rampage')).toHaveLength(1);
    expect(es.find((e) => e.t === 'damage')).toMatchObject({ id: 'u2', amount: 2, left: 0, reason: 'could not retreat' });
    const free = flagged({ rule: undefined, at: [0, 6], type: 'EL', from: [1, 6] });
    expect(u(free, 'u2')!.blocks).toBe(1);
  });

  it('a retreat of 2 from row 1 (1 hex fulfilled, row 0 reached, 1 lost) is eliminated', () => {
    // WA at 3 of 4 blocks is not at full strength, so it ignores no flag; retreat 2 per flag; the lake leaves (0,6)
    const d = flagged({ rule: 'top', at: [1, 6], type: 'WA', blocks: 3, from: [2, 6], extra: { terrain: [lake([0, 7])] } });
    expect(u(d, 'u2')).toBeUndefined();
    expect(d.state.players.bottom.banners).toBe(1);
    expect(events(ev(d), 'retreat')).toEqual([{ t: 'retreat', id: 'u2', path: [H(1, 6), H(0, 6)] }]);
    // without the rule the warriors would stand on row 0 with one block fewer: one lost per hex they could not take
    const free = flagged({ rule: undefined, at: [1, 6], type: 'WA', blocks: 3, from: [2, 6], extra: { terrain: [lake([0, 7])] } });
    expect(u(free, 'u2')).toMatchObject({ hex: H(0, 6), blocks: 2 });
  });

  it('a retreat that fulfils every hex is fine, even when it ends on the baseline row', () => {
    const d = flagged({ rule: 'top', at: [2, 6], type: 'WA', blocks: 3, from: [3, 6] });
    expect(d.pending).toMatchObject({ kind: 'retreat', reason: 'retreat' }); // several full retreats, all ending on row 0
    must(d, { kind: 'choose', index: 0 });
    const w = u(d, 'u2')!;
    expect([rowOf(w.hex), w.blocks]).toEqual([0, 3]);
    expect(d.state.players.bottom.banners).toBe(0);
  });

  it('a retreat that ends by joining a lone leader is not affected', () => {
    const d = flagged({
      rule: 'top', at: [1, 6], type: 'WA', blocks: 3, from: [2, 6],
      extra: { terrain: [lake([0, 7])], leaders: [{ side: 'top', at: [0, 6] }] },
    });
    expect(u(d, 'u2')).toMatchObject({ hex: H(0, 6), blocks: 3 });
    expect(d.state.leaders[0].hex).toBe(H(0, 6));
    expect(d.state.players.bottom.banners).toBe(0);
  });

  it('an evade that ends on the baseline row is not affected (and a unit already on it has no evade)', () => {
    const row0 = build({ units: [{ side: 'top', type: 'LI', at: [0, 6] }] });
    expect(evadeOptions(row0, row0.units[0])).toEqual([]);
    const s = build({
      units: [{ side: 'bottom', type: 'HI', at: [2, 6] }, { side: 'top', type: 'LI', at: [1, 6] }],
      terrain: [lake([0, 7])], lastRowRetreat: 'top',
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(n('heavy', 8)); // misses a light unit
    must(d, { kind: 'attack', unit: 'u1', target: H(1, 6) });
    expect(d.pending).toMatchObject({ kind: 'defend', canEvade: true });
    must(d, { kind: 'defend', choice: 'evade' });
    expect(u(d, 'u2')).toMatchObject({ hex: H(0, 6), blocks: 4 });
    expect(d.state.players.bottom.banners).toBe(0);
  });

  it('an attached leader takes the 1-die check, then evades off his own baseline', () => {
    const d = flagged({ rule: 'top', at: [0, 6], from: [1, 6], extra: { leaders: [{ side: 'top', at: [0, 6] }] } });
    expect(d.pending).toMatchObject({ kind: 'ignoreFlags', max: 1 });
    forceDice(['light']); // the leader's casualty die: no helmet
    must(d, { kind: 'ignoreFlags', count: 0 });
    expect(u(d, 'u2')).toBeUndefined();
    const es = ev(d);
    expect(events(es, 'leaderSafe')).toHaveLength(1);
    expect(events(es, 'leaderKilled')).toHaveLength(0);
    expect(events(es, 'leaderEvade')).toMatchObject([{ offBoard: true }]);
    expect(d.state.leaders).toHaveLength(0);
    expect(d.state.players.bottom.banners).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Scenario data

describe('scenario data', () => {
  const base: ScenarioJson = {
    id: 'x', name: 'X', year: '1 BC', top: { army: 'A', blocks: 'rom', look: 'roman', commander: 'a', cards: 5 },
    bottom: { army: 'B', blocks: 'rom', look: 'roman', commander: 'b', cards: 5 }, first: 'top', banners: 4,
    terrain: [], units: [{ side: 'top', type: 'MI', r: 0, c: 0 }], leaders: [], reserves: [], reserveLeaders: [],
  };

  it('a scenario file carries lastRowRetreat, rampartBreakers, veryHills and the terrain art hint', () => {
    const json: ScenarioJson = {
      ...base, rules: ['veryHills'], lastRowRetreat: 'top', rampartBreakers: 'bottom',
      terrain: [{ r: 4, c: 6, t: 'sea', ford: true, art: 'sea' }, { r: 5, c: 6, t: 'ditch' }, { r: 3, c: 6, t: 'hill' }],
    };
    const { setup } = scenarioFromJson(json);
    expect(setup.lastRowRetreat).toBe('top');
    expect(setup.rampartBreakers).toBe('bottom');
    expect(setup.terrain[0]).toEqual({ r: 4, c: 6, t: 'sea', ford: true, art: 'sea' });
    const s = createGame(setup, 1);
    expect([s.special.lastRowRetreat, s.special.rampartBreakers, s.special.rules]).toEqual(['top', 'bottom', ['veryHills']]);
    expect([s.terrain[H(4, 6)], s.fords[H(4, 6)], s.terrain[H(5, 6)]]).toEqual(['river', true, 'ditch']);
  });

  it('a file without them leaves the setup without them', () => {
    const { setup } = scenarioFromJson(base);
    expect(setup.lastRowRetreat).toBeUndefined();
    expect(setup.rampartBreakers).toBeUndefined();
    const s = createGame(setup, 1);
    expect([s.special.lastRowRetreat, s.special.rampartBreakers]).toEqual([null, null]);
  });
});
