// Rolling Fire (210 Picenum; rules-reference §18.5, design/exp2-rulings.md Q6): Slave infantry on a hill, ordered by a
// card that is not a Tactic card and not moved, rolls burning logs down a path of up to 3 hexes toward the Roman edge
// instead of its normal battle. Every unit in the path is rolled 2 dice (class symbol hits, no flag may be ignored), a
// lone leader in the path evades, then the rolling unit loses 1 block.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GameDriver, battleReady, battleTargets, cloneState, createGame, ignorableFlags, randomAnswer, rollingFirePaths,
  type Answer, type Decision, type GameEvent, type HexId, type Side,
} from '../../src/engine';
import { PERSONALITIES, chooseAnswer, isLegal, newMemory } from '../../src/ai';
import { scenarioFromJson, type ScenarioJson } from '../../src/scenarios';
import {
  H, build, ev, forceDice, forcedDiceLeft, giveCard, must, noFirstStrike, play, passTurn, setupOf, toBattle, u, type Pos,
} from './helpers';

beforeEach(() => forceDice([]));

type At = [number, number];
const P = (...rc: At[]): HexId[] => rc.map(([r, c]) => H(r, c));
const hill = (r: number, c: number) => ({ at: [r, c] as At, t: 'hill' as const });
const slave = (type: 'MI' | 'WA' | 'AX' | 'LS' | 'LC', at: At, blocks?: number) => ({ side: 'top' as const, type, at, blocks });
const roman = (type: 'MI' | 'HI' | 'LB', at: At) => ({ side: 'bottom' as const, type, at });

/** Slaves (top) with Rolling Fire, moving first; u1 is a Slave MI on the hill at (2,6). */
function pos(extra: Partial<Pos> = {}): Pos {
  return {
    rollingFire: 'top', first: 'top', topArmy: 'Slave', bottomArmy: 'Roman',
    ...extra,
    terrain: [hill(2, 6), ...(extra.terrain ?? [])],
    units: extra.units ?? [slave('MI', [2, 6]), roman('MI', [8, 0])],
  };
}

/** Every path from (2,6) over open ground: 2 first hexes, 3 hexes each, in the engine's order (SW before SE). */
const ALL_FROM_2_6: HexId[][] = [
  P([3, 5], [4, 5], [5, 4]), P([3, 5], [4, 5], [5, 5]), P([3, 5], [4, 6], [5, 5]), P([3, 5], [4, 6], [5, 6]),
  P([3, 6], [4, 6], [5, 5]), P([3, 6], [4, 6], [5, 6]), P([3, 6], [4, 7], [5, 6]), P([3, 6], [4, 7], [5, 7]),
];

const fire = (unit: string, path: HexId[]): Answer => ({ kind: 'rollingFire', unit, path });
const combats = (e: GameEvent[]) => e.filter((x): x is Extract<GameEvent, { t: 'combat' }> => x.t === 'combat');
const rollsOf = (e: GameEvent[], purpose: string) =>
  e.filter((x): x is Extract<GameEvent, { t: 'roll' }> => x.t === 'roll' && x.purpose === purpose);
const damage = (e: GameEvent[], id: string) =>
  e.filter((x): x is Extract<GameEvent, { t: 'damage' }> => x.t === 'damage' && x.id === id);

describe('Rolling Fire', () => {
  describe('scenario data', () => {
    it('is off in a battle without it, and on for the side the scenario names (survives cloneState)', () => {
      expect(build({ units: [roman('MI', [6, 4])] }).special.rollingFire).toBeNull();
      const s = build(pos());
      expect(s.special.rollingFire).toBe('top');
      expect(cloneState(s).special.rollingFire).toBe('top');
    });
    it('a scenario file carries rollingFire into the setup', () => {
      const base: ScenarioJson = {
        id: 'x', name: 'X', year: '72 BC', top: { army: 'Slave', blocks: 'bar', look: 'slave', commander: 'a', cards: 5 },
        bottom: { army: 'Roman', blocks: 'rom', look: 'marian', commander: 'b', cards: 5 }, first: 'top', banners: 6,
        terrain: [], units: [], leaders: [], reserves: [], reserveLeaders: [],
      };
      expect(scenarioFromJson({ ...base, rollingFire: 'top' }).setup.rollingFire).toBe('top');
      expect(createGame(scenarioFromJson({ ...base, rollingFire: 'top' }).setup, 1).special.rollingFire).toBe('top');
      expect('rollingFire' in scenarioFromJson(base).setup).toBe(false);
    });
    it('rejects an unknown side, naming the scenario', () => {
      const bad = () => createGame(setupOf({ ...pos(), rollingFire: 'left' as unknown as Side }), 1);
      expect(bad).toThrow(/^rollingFire: unknown side left \(qa\)$/);
    });
  });

  describe('who may roll', () => {
    it('an ordered Slave infantry unit on a hill that has not moved, even next to an enemy', () => {
      const s = build(pos({ units: [slave('MI', [2, 6]), slave('MI', [2, 5]), roman('MI', [3, 6])] }));
      const d = toBattle(s, 'order3C', ['u1', 'u2']);
      expect(d.pending).toMatchObject({ kind: 'battle', side: 'top' });
      expect(battleTargets(d.state, 'u1').map((t) => t.kind)).toEqual(['close']); // the adjacent Roman does not stop it
      expect(rollingFirePaths(d.state, 'u1')).toEqual(ALL_FROM_2_6);
      expect(rollingFirePaths(d.state, 'u2')).toEqual([]); // open ground, not a hill
      expect(d.answer(fire('u2', P([3, 4], [4, 4], [5, 3])))).toBe(false);
      expect(d.lastError).toBe('This unit cannot use Rolling Fire.');
    });
    it('only a unit that was ordered, and only once: it is the unit battle', () => {
      const s = build(pos({ terrain: [hill(2, 7)], units: [slave('MI', [2, 6]), slave('MI', [2, 7]), slave('AX', [2, 5]), roman('MI', [3, 4])] }));
      const d = toBattle(s, 'order3C', ['u1', 'u3']);
      expect(rollingFirePaths(d.state, 'u2')).toEqual([]); // not ordered
      expect(battleReady(d.state).sort()).toEqual(['u1', 'u3']);
      must(d, fire('u1', ALL_FROM_2_6[0]));
      expect(d.state.turn.ordered.u1.battlesLeft).toBe(0);
      expect(rollingFirePaths(d.state, 'u1')).toEqual([]);
      expect(battleReady(d.state)).toEqual(['u3']);
      expect(d.answer(fire('u1', ALL_FROM_2_6[0]))).toBe(false);
    });
    it('not a unit that has moved', () => {
      const s = build(pos({ terrain: [hill(2, 7), hill(2, 4)], units: [slave('MI', [2, 6]), slave('MI', [2, 4]), roman('MI', [8, 0])] }));
      const d = play(s, 'order3C', ['u1', 'u2']);
      must(d, { kind: 'move', piece: 'u1', to: H(2, 7) });
      must(d, { kind: 'endMove' });
      expect(d.pending).toMatchObject({ kind: 'battle', side: 'top' });
      expect(rollingFirePaths(d.state, 'u1')).toEqual([]);
      expect(rollingFirePaths(d.state, 'u2').length).toBeGreaterThan(0);
      expect(battleReady(d.state)).toEqual(['u2']);
      expect(d.answer(fire('u1', P([3, 6], [4, 6], [5, 5])))).toBe(false);
    });
    it('not the other side, not cavalry, and not in a battle without the rule', () => {
      const rom = build(pos({ first: 'bottom', terrain: [hill(6, 6)], units: [slave('MI', [0, 0]), roman('MI', [6, 6])] }));
      const d1 = play(rom, 'order3C', ['u2']);
      expect(d1.pending).toMatchObject({ kind: 'move', side: 'bottom' });
      expect(rollingFirePaths(d1.state, 'u2')).toEqual([]);
      const cav = build(pos({ units: [slave('LC', [2, 6]), roman('MI', [8, 0])] }));
      const d2 = play(cav, 'order3C', ['u1']);
      expect(d2.pending).toMatchObject({ kind: 'move', side: 'top' });
      expect(rollingFirePaths(d2.state, 'u1')).toEqual([]);
      // the same position with an infantry unit (at the move decision, before it has moved)
      expect(rollingFirePaths(play(build(pos()), 'order3C', ['u1']).state, 'u1')).toEqual(ALL_FROM_2_6);
      const off = build({ ...pos(), rollingFire: undefined });
      const d3 = play(off, 'order3C', ['u1']);
      expect(rollingFirePaths(d3.state, 'u1')).toEqual([]);
    });
    it('not with Darken the Sky (a Tactic card), but yes for the same slingers with a section card', () => {
      const p = pos({ units: [slave('LS', [2, 6]), roman('MI', [5, 6])] });
      const d = toBattle(build(p), 'darken', []);
      expect(d.state.turn.effective).toBe('darken');
      expect(d.pending).toMatchObject({ kind: 'battle', side: 'top' });
      expect(rollingFirePaths(d.state, 'u1')).toEqual([]);
      expect(d.answer(fire('u1', ALL_FROM_2_6[0]))).toBe(false);
      const d2 = toBattle(build(p), 'order2C', ['u1']);
      expect(rollingFirePaths(d2.state, 'u1')).toEqual(ALL_FROM_2_6);
    });
    it('not with I Am Spartacus (a Tactic card)', () => {
      const s = build(pos());
      forceDice(['medium', 'flag', 'flag', 'flag', 'flag']);
      const d = play(s, 'spartacus');
      expect(d.pending).toMatchObject({ kind: 'spartacus', side: 'top' });
      must(d, { kind: 'assign', ids: ['u1', null, null, null, null] });
      expect(d.state.turn.ordered.u1).toBeDefined();
      expect(rollingFirePaths(d.state, 'u1')).toEqual([]);
      must(d, { kind: 'endMove' });
      expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' }); // no battle step was offered
    });
    it('yes with a Counter Attack copying Order Three Units Left', () => {
      const s = build(pos({ first: 'bottom', terrain: [hill(2, 2)], units: [slave('MI', [2, 2]), roman('MI', [8, 0])] }));
      noFirstStrike(s);
      const d = new GameDriver(s);
      passTurn(d, 'order3L');
      const card = giveCard(d.state, 'top', 'counterAttack');
      must(d, { kind: 'playCard', card });
      expect(d.state.turn.effective).toBe('order3R');
      must(d, { kind: 'orders', pieces: ['u1'] });
      must(d, { kind: 'endMove' });
      expect(d.pending).toMatchObject({ kind: 'battle', side: 'top' });
      const paths = rollingFirePaths(d.state, 'u1');
      expect(paths.length).toBeGreaterThan(0);
      must(d, fire('u1', paths[0]));
    });
  });

  describe('the path', () => {
    const pathsWith = (terrain: Pos['terrain'], at: At = [2, 6]) => {
      const s = build(pos({ terrain: [hill(...at), ...(terrain ?? [])], units: [slave('MI', at), roman('MI', [8, 12])] }));
      const d = play(s, 'order3C', ['u1']);
      return rollingFirePaths(d.state, 'u1');
    };
    it('runs 3 hexes over open ground, each step to one of the two hexes one row nearer the Roman edge', () => {
      expect(pathsWith([])).toEqual(ALL_FROM_2_6);
    });
    it('never enters a hill and stops in the first hex that is not open ground (a forest)', () => {
      const paths = pathsWith([hill(3, 5), { at: [4, 6], t: 'forest' }, hill(5, 6)]);
      expect(paths).toEqual([P([3, 6], [4, 6]), P([3, 6], [4, 7], [5, 7])]);
      for (const p of paths) for (const h of p) expect([H(3, 5), H(5, 6)]).not.toContain(h);
    });
    it('does not enter impassable terrain; it is shorter only where no forward hex can be entered', () => {
      expect(pathsWith([hill(3, 5), { at: [4, 6], t: 'lake' }, hill(4, 7)])).toEqual([P([3, 6])]);
      expect(pathsWith([hill(3, 5), { at: [4, 6], t: 'lake' }])).toEqual([P([3, 6], [4, 7], [5, 6]), P([3, 6], [4, 7], [5, 7])]);
    });
    it('is impossible when neither first hex can be entered', () => {
      expect(pathsWith([hill(3, 5), hill(3, 6)])).toEqual([]);
    });
    it('ends at the Roman edge', () => {
      expect(pathsWith([], [7, 6])).toEqual([P([8, 6]), P([8, 7])]);
    });
    it('a path that is not one of the legal ones is rejected', () => {
      const s = build(pos({ terrain: [hill(3, 5)] }));
      const d = toBattle(s, 'order3C', ['u1']);
      for (const bad of [P([3, 5], [4, 5], [5, 4]), P([3, 6], [4, 6]), P([3, 6], [4, 6], [5, 5], [6, 5]), P([4, 6], [5, 5], [6, 5]), []]) {
        expect(d.answer(fire('u1', bad)), JSON.stringify(bad)).toBe(false);
        expect(d.lastError).toBe('Not a legal Rolling Fire path.');
      }
      expect(d.answer({ kind: 'rollingFire', unit: 'u1', path: 'x' as unknown as HexId[] })).toBe(false);
      must(d, fire('u1', P([3, 6], [4, 6], [5, 5])));
    });
  });

  describe('resolution', () => {
    it('2 dice on a Roman MI: medium + flag = 1 hit and a retreat that cannot be ignored, even with a leader and two supports', () => {
      // u2 Roman MI with an attached leader at (3,6); u3 (3,7) and u4 (4,7) support it
      const s = build(pos({
        units: [slave('MI', [2, 6]), roman('MI', [3, 6]), roman('MI', [3, 7]), roman('MI', [4, 7])],
        leaders: [{ side: 'bottom', name: 'Gellius', at: [3, 6] }],
      }));
      const d = toBattle(s, 'order3C', ['u1']);
      expect(ignorableFlags(d.state, u(d, 'u2')!, { kind: 'ranged', striker: u(d, 'u1')!, leaderAlive: true, fullAtStart: true })).toBe(2);
      ev(d);
      forceDice(['medium', 'flag', 'swords', 'swords']); // the logs, then the leader casualty check
      must(d, fire('u1', P([3, 6], [4, 6], [5, 5])));
      const e = ev(d);
      expect(forcedDiceLeft()).toBe(0);
      // one target only: the MI retreats into (4,6), a later path hex, and is not rolled again
      expect(combats(e)).toEqual([{ t: 'combat', purpose: 'rollingFire', attacker: 'u1', target: 'u2', dice: 2 }]);
      expect(rollsOf(e, 'rollingFire')).toEqual([
        { t: 'roll', purpose: 'rollingFire', faces: ['medium', 'flag'], scoring: [true, true], by: 'u1', against: 'u2' },
      ]);
      expect(damage(e, 'u2').map((x) => x.amount)).toEqual([1]);
      expect(rollsOf(e, 'leaderCheck')).toHaveLength(1);
      expect(e).toContainEqual({ t: 'flags', id: 'u2', flags: 1, ignored: 0 });
      expect(e).toContainEqual({ t: 'retreat', id: 'u2', path: P([3, 6], [4, 6]) });
      expect(u(d, 'u2')).toMatchObject({ hex: H(4, 6), blocks: 3 });
      expect(d.state.leaders[0].hex).toBe(H(4, 6)); // the leader went with his unit
      // no ignoreFlags (or any other) decision was asked: the turn ended
      expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
      // then the rolling unit lost 1 block
      expect(damage(e, 'u1')).toEqual([{ t: 'damage', id: 'u1', amount: 1, left: 3, reason: expect.any(String) }]);
      expect(e.findIndex((x) => x.t === 'damage' && x.id === 'u1')).toBeGreaterThan(e.findIndex((x) => x.t === 'retreat'));
    });
    it('rolls every unit in the path, nearest first, friend or foe, with 2 dice each (no terrain cap)', () => {
      const s = build(pos({
        terrain: [{ at: [5, 5], t: 'forest' }],
        units: [slave('MI', [2, 6]), slave('MI', [3, 6]), roman('HI', [4, 6]), roman('MI', [5, 5])],
      }));
      const d = toBattle(s, 'order3C', ['u1']);
      ev(d);
      forceDice(['medium', 'swords', 'light', 'leader', 'heavy', 'heavy']);
      must(d, fire('u1', P([3, 6], [4, 6], [5, 5])));
      const e = ev(d);
      expect(forcedDiceLeft()).toBe(0);
      expect(combats(e).map((x) => [x.target, x.dice, x.purpose])).toEqual([
        ['u2', 2, 'rollingFire'], ['u3', 2, 'rollingFire'], ['u4', 2, 'rollingFire'],
      ]);
      expect(rollsOf(e, 'rollingFire').map((x) => x.scoring)).toEqual([[true, false], [false, false], [false, false]]);
      expect(u(d, 'u2')!.blocks).toBe(3); // the friendly Slave MI took the hit
      expect(u(d, 'u3')!.blocks).toBe(4);
      expect(u(d, 'u4')!.blocks).toBe(4); // swords and other classes never hit; the forest does not cap the dice
      expect(u(d, 'u1')!.blocks).toBe(3);
    });
    it('a lone Roman leader in the path is not rolled but evades toward his own side', () => {
      const s = build(pos({ units: [slave('MI', [2, 6]), roman('MI', [8, 0])], leaders: [{ side: 'bottom', name: 'Lentulus', at: [4, 6] }] }));
      const d = toBattle(s, 'order3C', ['u1']);
      ev(d);
      must(d, fire('u1', P([3, 6], [4, 6], [5, 5])));
      expect(d.pending).toMatchObject({ kind: 'leaderEvade', side: 'bottom' });
      const opts = d.pending!.kind === 'leaderEvade' ? d.pending!.options : [];
      const i = opts.findIndex((o) => o.end === H(6, 6));
      expect(i).toBeGreaterThanOrEqual(0);
      must(d, { kind: 'choose', index: i });
      const e = ev(d);
      expect(combats(e)).toEqual([]);
      expect(rollsOf(e, 'rollingFire')).toEqual([]);
      expect(e.some((x) => x.t === 'leaderEvade' && x.id === d.state.leaders[0].id)).toBe(true);
      expect(d.state.leaders[0].hex).toBe(H(6, 6));
      expect(u(d, 'u1')!.blocks).toBe(3);
    });
    it('a lone Slave leader in the path evades toward the Slave side', () => {
      const s = build(pos({ units: [slave('MI', [2, 6]), roman('MI', [8, 0])], leaders: [{ side: 'top', name: 'Crixus', at: [3, 6] }] }));
      const d = toBattle(s, 'order3C', ['u1']);
      must(d, fire('u1', P([3, 6], [4, 6], [5, 5])));
      expect(d.pending).toMatchObject({ kind: 'leaderEvade', side: 'top' });
      const opts = d.pending!.kind === 'leaderEvade' ? d.pending!.options : [];
      expect(opts.every((o) => o.offBoard || o.end < H(3, 0))).toBe(true); // every option ends nearer the top edge
      must(d, { kind: 'choose', index: opts.findIndex((o) => o.end === H(2, 7)) });
      expect(d.state.leaders[0].hex).toBe(H(2, 7));
      expect(rollsOf(ev(d), 'rollingFire')).toEqual([]);
    });
    it('a 1-block rolling unit is eliminated afterwards: the Romans score its banner', () => {
      const s = build(pos({ units: [slave('MI', [2, 6], 1), roman('MI', [8, 0])] }));
      const d = toBattle(s, 'order3C', ['u1']);
      ev(d);
      must(d, fire('u1', ALL_FROM_2_6[7]));
      const e = ev(d);
      expect(e).toContainEqual({ t: 'eliminated', id: 'u1' });
      expect(u(d, 'u1')).toBeUndefined();
      expect(d.state.players.bottom.banners).toBe(1);
      expect(e.some((x) => x.t === 'banner' && x.side === 'bottom')).toBe(true);
    });
    it("the rolling unit's leader makes the casualty check for its lost block", () => {
      const s = build(pos({ units: [slave('MI', [2, 6]), roman('MI', [8, 0])], leaders: [{ side: 'top', name: 'Spartacus', at: [2, 6] }] }));
      const d = toBattle(s, 'order3C', ['u1']);
      ev(d);
      forceDice(['leader', 'leader']);
      must(d, fire('u1', ALL_FROM_2_6[0]));
      const e = ev(d);
      expect(rollsOf(e, 'leaderCheck').map((x) => x.faces)).toEqual([['leader', 'leader']]);
      expect(e).toContainEqual({ t: 'leaderKilled', id: s.leaders[0].id });
      expect(d.state.players.bottom.banners).toBe(1);
    });
    it('held banners are brought up to date after Rolling Fire', () => {
      // the Romans hold (3,6) for 1 banner; a flag drives the unit there into (4,6) (u3 blocks (4,7))
      const s = build(pos({
        units: [slave('MI', [2, 6]), roman('MI', [3, 6]), roman('MI', [4, 7])],
        objectives: [{ kind: 'hold', side: 'bottom', hexes: [[3, 6]] }],
      }));
      const d = toBattle(s, 'order3C', ['u1']);
      expect(d.state.special.objState[0].held.bottom).toBe(1);
      ev(d);
      forceDice(['flag', 'swords']);
      must(d, fire('u1', P([3, 6], [4, 6], [5, 5])));
      const e = ev(d);
      expect(u(d, 'u2')!.hex).toBe(H(4, 6));
      expect(d.state.special.objState[0].held.bottom).toBe(0);
      expect(e).toContainEqual(expect.objectContaining({ t: 'held', side: 'bottom', held: 0 }));
    });
  });

  describe('random and AI answers', () => {
    /** Slaves on a ridge of hills facing a Roman line. */
    const FIELD: Pos = {
      rollingFire: 'top', first: 'top', banners: 4, cards: 5, topArmy: 'Slave', bottomArmy: 'Roman',
      terrain: [hill(1, 3), hill(2, 4), hill(2, 5), hill(2, 6), hill(2, 7), hill(2, 8), hill(1, 9), { at: [4, 6], t: 'forest' }],
      units: [
        slave('MI', [1, 3]), slave('WA', [2, 4]), slave('AX', [2, 5]), slave('MI', [2, 6]), slave('LS', [2, 7]),
        slave('WA', [2, 8]), slave('MI', [1, 9]), slave('LC', [0, 6]),
        roman('MI', [6, 3]), roman('MI', [6, 5]), roman('MI', [6, 7]), roman('MI', [6, 9]), roman('LB', [7, 6]), roman('HI', [7, 8]),
      ],
      leaders: [{ side: 'top', name: 'Spartacus', at: [2, 6] }, { side: 'bottom', name: 'Crassus', at: [6, 5] }],
    };

    it('randomAnswer sometimes chooses Rolling Fire, always with a legal path', () => {
      const s = build(FIELD);
      const d = toBattle(s, 'order4C', ['u2', 'u3', 'u4', 'u5']);
      expect(d.pending).toMatchObject({ kind: 'battle', side: 'top' });
      let seen = 0;
      let x = 99;
      const rnd = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648;
      for (let i = 0; i < 200; i++) {
        const a = randomAnswer(d.state, d.pending!, rnd);
        if (a.kind !== 'rollingFire') continue;
        seen++;
        expect(rollingFirePaths(d.state, a.unit)).toContainEqual(a.path);
        expect(isLegal(d.state, d.pending!, a)).toBe(true);
        const again = GameDriver.replay(d.initial, d.answers);
        expect(again.answer(a), again.lastError ?? '').toBe(true);
      }
      expect(seen).toBeGreaterThan(10);
    });

    it('random games: every answer is accepted and Rolling Fire is used', () => {
      let used = 0;
      let finished = 0;
      for (let seed = 1; seed <= 20; seed++) {
        let x = seed * 7919;
        const rnd = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648;
        const d = new GameDriver(build(FIELD, seed), { snapshots: false });
        for (let steps = 0; !d.over && steps < 3000; steps++) {
          const a = randomAnswer(d.state, d.pending!, rnd);
          if (a.kind === 'rollingFire') used++;
          expect(d.answer(a), `seed ${seed}: ${JSON.stringify(a)}: ${d.lastError}`).toBe(true);
        }
        if (d.over) finished++;
      }
      expect(used).toBeGreaterThan(5);
      expect(finished).toBeGreaterThan(15);
    });

    describe('the AI', () => {
      let spy: ReturnType<typeof vi.spyOn> | null = null;
      beforeEach(() => { spy = vi.spyOn(console, 'error'); });
      afterEach(() => {
        const calls = spy?.mock.calls ?? [];
        spy?.mockRestore();
        expect(calls.map((c) => c.map(String).join(' ')), 'an AI error was caught and hidden by a fallback').toEqual([]);
      });
      const opts = (side: Side, seed: number) => ({
        side, difficulty: 'recruit' as const, personality: PERSONALITIES[5], seed, deterministic: true, budgetScale: 0.1,
      });

      it('judges Rolling Fire answers like the engine', () => {
        const d = toBattle(build(FIELD), 'order4C', ['u2', 'u3', 'u4', 'u5']);
        const dec = d.pending as Decision;
        expect(isLegal(d.state, dec, fire('u4', rollingFirePaths(d.state, 'u4')[0]))).toBe(true);
        expect(isLegal(d.state, dec, fire('u4', P([3, 6])))).toBe(false);
        expect(isLegal(d.state, dec, fire('u1', P([2, 3])))).toBe(false);
      });
      it('plays whole turns of a Rolling Fire battle with legal answers', () => {
        let faced = 0;
        for (const seed of [5, 6]) {
          const mems = { top: newMemory(), bottom: newMemory() };
          // from the Slaves' first battle step, with four units on the hills able to roll
          const d = toBattle(build(FIELD, seed), 'order4C', ['u2', 'u3', 'u4', 'u5']);
          let steps = 0;
          let turns = 0;
          while (!d.over && steps++ < 400 && turns < 8) {
            const dec = d.pending!;
            if (dec.kind === 'playCard') turns++;
            if (dec.kind === 'battle' && battleReady(d.state).some((id) => rollingFirePaths(d.state, id).length)) faced++;
            const a = chooseAnswer(d.state, dec, opts(dec.side, seed + (dec.side === 'top' ? 1 : 2)), mems[dec.side]).answer;
            expect(isLegal(d.state, dec, a), `${dec.kind}: ${JSON.stringify(a)}`).toBe(true);
            expect(d.answer(a), `${JSON.stringify(a)}: ${d.lastError}`).toBe(true);
          }
          expect(turns).toBeGreaterThanOrEqual(6);
        }
        expect(faced, 'the AI was offered Rolling Fire').toBeGreaterThan(0);
      }, 60_000);
    });
  });
});
