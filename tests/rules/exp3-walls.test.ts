// Expansion #3 terrain (rules-reference §18.7; design/exp3-rulings.md Q3–Q6): scalable city walls (308 Gergovia, 309
// Ilerda), impassable walls and towns (301, 303, 304: `steep` with an art hint), a hill under a camp or wall (308) and the
// steep hill–forest slopes of 308 (rule `steepSlopes`). The data shapes follow design/exp3-data/308.json and 309.json.
import { beforeEach, describe, expect, it } from 'vitest';
import gergovia from '../../design/exp3-data/308.json';
import {
  ALL_HEXES, CARD_LIST, SPECIAL_RULE_IDS, TERRAIN_NAMES, battleTargets, canFireAt, ccCapOfHex, cloneState, closeCombatDice, createGame,
  elephantRetreatOptions, evadeOptions, ignorableFlags, isHill, isImpassable, leaderEvadeOptions, lineOfSight, neighbours, pieceMoves,
  rangedDice, rangedFromCap, rangedTargetCap, retreatOptions, steepClimb, steepSlope, swordIgnores,
  type CardKind, type GameEvent, type HexId, type MoveTarget, type ScenarioSetup, type TerrainSetup, type UnitType,
} from '../../src/engine';
import {
  H, build, ev, forceDice, forcedDiceLeft, giveCard, leaderId, must, n, play, setupOf, toBattle, u, type Pos,
} from './helpers';

beforeEach(() => forceDice([]));

type TerrainSpec = NonNullable<Pos['terrain']>[number];
type At = [number, number];

const wall = (at: At, hill = false): TerrainSpec => ({ at, t: 'wall', ...(hill ? { hill: true } : {}) });
const camp = (at: At, hill = false): TerrainSpec => ({ at, t: 'camp', ...(hill ? { hill: true } : {}) });
const hill = (at: At): TerrainSpec => ({ at, t: 'hill' });
const forest = (at: At): TerrainSpec => ({ at, t: 'forest' });
const lake = (at: At): TerrainSpec => ({ at, t: 'lake' });

const FOOT: UnitType[] = ['LI', 'LB', 'LS', 'AX', 'WA', 'MI', 'HI'];
const BARRED: UnitType[] = ['LC', 'MC', 'HC', 'LBC', 'EL', 'HCH', 'CAM', 'BCH', 'HWM'];

const hexesOf = (ms: MoveTarget[]) => ms.map((m) => m.hex);
/** Move targets whose path crosses one of `hexes` before its last hex: a hex that should have stopped the piece. */
const throughStops = (ms: MoveTarget[], hexes: HexId[]) => ms.filter((m) => m.path.slice(1, -1).some((h) => hexes.includes(h)));
/** [purpose, attacker, dice] of every combat event. */
const combats = (es: GameEvent[]) => es.flatMap((e) => (e.t === 'combat' ? [[e.purpose, e.attacker, e.dice]] : []));

/** Move targets of the first ordered unit (or of the piece `id`) with a centre card, the bottom side moving. */
function movesOf(pos: Pos, id = 'u1', card: CardKind = 'order4C'): MoveTarget[] {
  const d = play(build(pos), card, [id]);
  return pieceMoves(d.state, id);
}

/** Move targets of a lone bottom leader at `at` (no units on the board). */
function leaderMovesFrom(at: At, terrain: TerrainSpec[], units: Pos['units'] = []): MoveTarget[] {
  const s = build({ units, leaders: [{ side: 'bottom', at }], terrain });
  const L = leaderId(s, 0);
  return pieceMoves(play(s, 'order4C', [L]).state, L);
}

// ---------------------------------------------------------------------------------------------------------------------
// Scalable city walls: movement

describe('city wall: movement (§18.7)', () => {
  const W: At = [4, 6];

  it('a foot unit enters a wall hex only by a move that begins next to it, and stops there', () => {
    for (const type of FOOT) {
      const ms = movesOf({ units: [{ side: 'bottom', type, at: [5, 6] }], terrain: [wall(W)] });
      expect(ms.find((m) => m.hex === H(4, 6)), type).toMatchObject({ dist: 1, path: [H(5, 6), H(4, 6)], canBattle: true });
      expect(throughStops(ms, [H(4, 6)]), type).toEqual([]);
    }
    // two hexes away the wall is out of reach for a light unit that moves 2, though open ground there would not be
    expect(hexesOf(movesOf({ units: [{ side: 'bottom', type: 'LI', at: [6, 6] }], terrain: [wall(W)] }))).not.toContain(H(4, 6));
    expect(hexesOf(movesOf({ units: [{ side: 'bottom', type: 'LI', at: [6, 6] }] }))).toContain(H(4, 6));
  });

  it('a lone leader too: only from next to the wall, stopping there (also to join a unit on it)', () => {
    const near = leaderMovesFrom([5, 6], [wall(W)]);
    expect(near.find((m) => m.hex === H(4, 6))).toMatchObject({ dist: 1 });
    expect(throughStops(near, [H(4, 6)])).toEqual([]);
    expect(hexesOf(leaderMovesFrom([6, 6], [wall(W)]))).not.toContain(H(4, 6));
    expect(hexesOf(leaderMovesFrom([6, 6], []))).toContain(H(4, 6));
    const friend: Pos['units'] = [{ side: 'bottom', type: 'MI', at: W }];
    expect(leaderMovesFrom([5, 6], [wall(W)], friend).find((m) => m.hex === H(4, 6))).toMatchObject({ dist: 1, attachesTo: 'u1' });
    expect(hexesOf(leaderMovesFrom([6, 6], [wall(W)], friend))).not.toContain(H(4, 6));
  });

  it('a piece that begins its move on a wall hex moves at most 1 hex (Double Time too); it may still battle', () => {
    const ms = movesOf({ units: [{ side: 'bottom', type: 'LI', at: W }], terrain: [wall(W)] });
    expect(hexesOf(ms).sort()).toEqual([...neighbours(H(4, 6))].sort());
    expect(ms.every((m) => m.dist === 1 && m.canBattle)).toBe(true);
    const dt = movesOf({ units: [{ side: 'bottom', type: 'MI', at: W }], terrain: [wall(W)] }, 'u1', 'doubleTime');
    expect(dt.every((m) => m.dist === 1)).toBe(true);
    const lone = leaderMovesFrom(W, [wall(W)]);
    expect(hexesOf(lone).sort()).toEqual([...neighbours(H(4, 6))].sort());
  });

  it('that 1 hex is all the turn: no second Move-Fire-Move move after leaving a wall', () => {
    for (const onWall of [true, false]) {
      const s = build({ units: [{ side: 'bottom', type: 'LI', at: W }], terrain: onWall ? [wall(W)] : [] });
      const d = play(s, 'moveFireMove', ['u1']);
      must(d, { kind: 'move', piece: 'u1', to: H(3, 6) });
      if (onWall) expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
      else expect(d.pending).toMatchObject({ kind: 'move', stage: 2 });
    }
  });

  it('a unit that climbed onto a wall gets no second Move-Fire-Move move off it', () => {
    for (const onWall of [true, false]) {
      const s = build({ units: [{ side: 'bottom', type: 'LI', at: [5, 6] }], terrain: onWall ? [wall(W)] : [] });
      const d = play(s, 'moveFireMove', ['u1']);
      must(d, { kind: 'move', piece: 'u1', to: H(4, 6) });
      if (onWall) expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
      else expect(d.pending).toMatchObject({ kind: 'move', stage: 2 });
    }
  });

  it('walking along the wall is no easier: each wall-to-wall step is a whole move', () => {
    const ms = movesOf({ units: [{ side: 'bottom', type: 'LI', at: W }], terrain: [wall(W), wall([4, 7]), wall([4, 8])] });
    expect(ms.find((m) => m.hex === H(4, 7))).toMatchObject({ dist: 1 });
    expect(hexesOf(ms)).not.toContain(H(4, 8));
  });

  it('mounted units and war machines may not enter a wall hex, nor stand on one in the scenario data', () => {
    for (const type of BARRED) {
      const ms = movesOf({ units: [{ side: 'bottom', type, at: [5, 6] }], terrain: [wall(W)] });
      expect(hexesOf(ms), type).not.toContain(H(4, 6));
      expect(() => createGame(setupOf({ units: [{ side: 'bottom', type, at: W }], terrain: [wall(W)] }), 1), type).toThrow(/wall/);
    }
    for (const type of FOOT) expect(() => createGame(setupOf({ units: [{ side: 'bottom', type, at: W }], terrain: [wall(W)] }), 1)).not.toThrow();
  });

  it('retreating and evading foot units and leaders pass through and onto walls without stopping', () => {
    // top pieces retreat and evade toward row 0; both rear hexes of (6,6) are walls
    const walls = [wall([5, 5]), wall([5, 6])];
    const s = build({ units: [{ side: 'top', type: 'WA', at: [6, 6] }, { side: 'top', type: 'LI', at: [6, 2] }], terrain: [...walls, wall([5, 1]), wall([5, 2])] });
    const r = retreatOptions(s, u(s, 'u1')!, 2);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((o) => o.losses === 0 && o.path.length === 2 && Math.floor(o.end / 13) === 4)).toBe(true);
    const e = evadeOptions(s, u(s, 'u2')!);
    expect(e.length).toBeGreaterThan(0);
    expect(e.every((o) => o.path.length === 2 && Math.floor(o.end / 13) === 4)).toBe(true);
    const sl = build({ leaders: [{ side: 'top', at: [6, 6] }], terrain: walls });
    const le = leaderEvadeOptions(sl, sl.leaders[0]);
    expect(le.map((o) => o.end)).toEqual(expect.arrayContaining([H(5, 5), H(5, 6), H(4, 5), H(4, 6)]));
  });

  it('mounted units may not retreat or evade onto a wall: a blocked retreat hex costs a block', () => {
    const walls = [wall([5, 5]), wall([5, 6])];
    const s = build({ units: [{ side: 'top', type: 'LC', at: [6, 6] }, { side: 'top', type: 'EL', at: [6, 10] }], terrain: [...walls, wall([5, 9]), wall([5, 10])] });
    expect(retreatOptions(s, u(s, 'u1')!, 2)).toEqual([{ path: [], end: H(6, 6), losses: 2, attachLeader: null }]);
    expect(evadeOptions(s, u(s, 'u1')!)).toEqual([]);
    expect(elephantRetreatOptions(s, u(s, 'u2')!, 1)).toEqual([{ path: [], end: H(6, 10), losses: 1, attachLeader: null, blockers: [] }]);
  });

  it('a foot unit advances onto the wall hex its attack vacated; a mounted unit may not', () => {
    for (const type of ['MI', 'MC'] as UnitType[]) {
      const s = build({ units: [{ side: 'bottom', type, at: [5, 6] }, { side: 'top', type: 'MI', at: W, blocks: 1 }], terrain: [wall(W)] });
      const d = toBattle(s, 'order4C', ['u1']);
      forceDice([...n('light', 2), 'medium', 'light']); // the wall's first strike misses, the attack eliminates the MI
      must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
      expect(u(d, 'u2'), type).toBeUndefined();
      if (type === 'MI') {
        expect(d.pending).toMatchObject({ kind: 'momentum', unit: 'u1', hex: H(4, 6) });
        must(d, { kind: 'yesno', yes: true });
        expect(u(d, 'u1')!.hex).toBe(H(4, 6));
      } else {
        expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' });
        expect(u(d, 'u1')!.hex).toBe(H(5, 6));
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Scalable city walls: combat

describe('city wall: who may attack it, and the dice (§18.7)', () => {
  const W: At = [4, 6];

  it('a mounted unit attacks a piece on a wall only if it began the turn next to that wall hex', () => {
    // bottom MC u1 at (6,6) moves to (5,6), next to the wall unit (4,6) and to a unit on open ground (4,7)
    const units: Pos['units'] = [{ side: 'top', type: 'MI', at: W }, { side: 'top', type: 'MI', at: [4, 7] }];
    const s = build({ units: [{ side: 'bottom', type: 'MC', at: [6, 6] }, ...units!], terrain: [wall(W)] });
    const d = play(s, 'order4C', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 7), kind: 'close' }]);
    // began next to it: may attack, also after moving along the wall
    const s2 = build({ units: [{ side: 'bottom', type: 'MC', at: [5, 6] }, ...units!], terrain: [wall(W)] });
    const d2 = toBattle(s2, 'order4C', ['u1']);
    expect(battleTargets(d2.state, 'u1').map((t) => t.hex).sort()).toEqual([H(4, 6), H(4, 7)].sort());
    const s3 = build({ units: [{ side: 'bottom', type: 'MC', at: [5, 6] }, units![0]], terrain: [wall(W)] });
    const d3 = play(s3, 'order4C', ['u1']);
    must(d3, { kind: 'move', piece: 'u1', to: H(5, 5) });
    expect(battleTargets(d3.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'close' }]);
    // a lone leader on the wall is out of reach as well [Interp]
    const s4 = build({ units: [{ side: 'bottom', type: 'MC', at: [6, 6] }], leaders: [{ side: 'top', at: W }], terrain: [wall(W)] });
    const d4 = play(s4, 'order4C', ['u1']);
    must(d4, { kind: 'move', piece: 'u1', to: H(5, 6) });
    expect(battleTargets(d4.state, 'u1')).toEqual([]);
  });

  it('a war machine next to the wall at the start of the turn may attack it; foot units attack as usual', () => {
    const hwm = build({ units: [{ side: 'bottom', type: 'HWM', at: [5, 6] }, { side: 'top', type: 'MI', at: W }], terrain: [wall(W)] });
    expect(battleTargets(toBattle(hwm, 'order4C', ['u1']).state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'close' }]);
    const mi = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'MI', at: W }], terrain: [wall(W)] });
    const d = play(mi, 'order4C', ['u1']);
    must(d, { kind: 'move', piece: 'u1', to: H(5, 6) });
    expect(battleTargets(d.state, 'u1')).toEqual([{ hex: H(4, 6), kind: 'close' }]);
  });

  it('close combat into or out of a wall is capped at 2 dice; card and leader bonuses are added after the cap', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'HI', at: W }, { side: 'bottom', type: 'HI', at: [3, 6] }],
      leaders: [{ side: 'bottom', at: [3, 6], traits: ['ccBonus'] }, { side: 'top', at: W, traits: ['ccBonus'] }],
      terrain: [wall(W)],
    });
    const [atk, def, withCaesar] = [u(s, 'u1')!, u(s, 'u2')!, u(s, 'u3')!];
    const opts = { fullAtStart: true, ordered: false } as const;
    expect(ccCapOfHex(s, H(4, 6))).toBe(2);
    expect(closeCombatDice(s, atk, def, { ...opts, role: 'attack' })).toBe(2);
    expect(closeCombatDice(s, withCaesar, def, { ...opts, role: 'attack' })).toBe(3); // 2 + Caesar
    // the wall unit's own rolls: battle-back dice capped at 2, plus its leader's bonus
    expect(closeCombatDice(s, def, atk, { ...opts, role: 'firstStrike' })).toBe(3);
    expect(closeCombatDice(s, def, atk, { ...opts, role: 'attack' })).toBe(3);
    // no cap and no -1 for ranged combat
    expect([rangedFromCap(s, H(4, 6)), rangedTargetCap(s, H(4, 6))].every((c) => c > 5)).toBe(true);
  });

  it('Clash of Shields adds its dice on top of the cap of 2', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'top', type: 'HI', at: W }], terrain: [wall(W)] });
    const d = play(s, 'clash');
    expect(d.pending?.kind).toBe('battle');
    ev(d);
    forceDice([...n('light', 2), ...n('light', 4), 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(combats(ev(d))).toEqual([['firstStrike', 'u2', 2], ['close', 'u1', 4]]);
  });

  it('a unit attacking out of a wall rolls 2 and is battled back with 2 (no first strike against it)', () => {
    const s = build({ units: [{ side: 'bottom', type: 'HI', at: W }, { side: 'top', type: 'HI', at: [3, 6] }], terrain: [wall(W)] });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice([...n('light', 4), 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(3, 6) });
    expect(combats(ev(d))).toEqual([['close', 'u1', 2], ['battleBack', 'u2', 2]]);
  });
});

describe('city wall: the defender ignores 1 sword and 1 flag (§18.7)', () => {
  const W: At = [4, 6];
  const pos: Pos = { units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'MI', at: W }, { side: 'top', type: 'MI', at: [3, 10] }] };
  const ctx = { leaderAlive: false, fullAtStart: false };

  it('against an attack or bonus combat, not when it attacked out (battle back); 1 flag against ranged fire', () => {
    const s = build({ ...pos, terrain: [wall(W), wall([3, 10])] });
    const [atk, def] = [u(s, 'u1')!, u(s, 'u2')!];
    expect(swordIgnores(s, def, atk, 'attack')).toBe(1);
    expect(swordIgnores(s, def, atk, 'bonus')).toBe(1);
    expect(swordIgnores(s, def, atk, 'back')).toBe(0);
    expect(ignorableFlags(s, def, { ...ctx, kind: 'close', striker: atk, role: 'attack' })).toBe(1);
    expect(ignorableFlags(s, def, { ...ctx, kind: 'close', striker: atk, role: 'bonus' })).toBe(1);
    expect(ignorableFlags(s, def, { ...ctx, kind: 'close', striker: atk, role: 'back' })).toBe(0);
    expect(ignorableFlags(s, def, { ...ctx, kind: 'ranged', striker: atk })).toBe(1);
    // the same unit on open ground: nothing
    const open = build(pos);
    expect(swordIgnores(open, u(open, 'u2')!, u(open, 'u1')!, 'attack')).toBe(0);
    expect(ignorableFlags(open, u(open, 'u2')!, { ...ctx, kind: 'ranged', striker: u(open, 'u1')! })).toBe(0);
  });

  it('in play: a sword is ignored and one flag may be', () => {
    const s = build({ ...pos, terrain: [wall(W)] });
    const d = toBattle(s, 'order4C', ['u1']);
    forceDice([...n('light', 2), 'swords', 'flag']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u2')!.blocks).toBe(4);
    expect(d.pending).toMatchObject({ kind: 'ignoreFlags', unit: 'u2', flags: 1, max: 1 });
  });
});

describe('city wall: the defender strikes first (§18.7)', () => {
  const W: At = [4, 6];

  it('without a card and without a defend decision; the attack follows, and there is no battle back', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: W }], terrain: [wall(W)] });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice([...n('light', 2), ...n('light', 2), 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(combats(ev(d))).toEqual([['firstStrike', 'u2', 2], ['close', 'u1', 2]]);
    expect(forcedDiceLeft()).toBe(1);
    expect(d.state.turn.firstStrikeBy).toBeNull();
  });

  it('a First Strike card in the hand is neither offered nor used', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: W }], terrain: [wall(W)] });
    const card = giveCard(s, 'top', 'firstStrike');
    const d = play(s, 'order4C', ['u1'], { keepFS: true });
    must(d, { kind: 'endMove' });
    forceDice(n('light', 4));
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.state.players.top.hand).toContain(card);
    expect(d.state.discard).not.toContain(card);
    expect(CARD_LIST[card]).toBe('firstStrike');
    expect(d.state.turn.firstStrikeBy).toBeNull();
  });

  it('an attacker eliminated by the first strike does not attack', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [5, 6], blocks: 1 }, { side: 'top', type: 'HI', at: W }], terrain: [wall(W)] });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(['medium', 'light', ...n('light', 2)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u1')).toBeUndefined();
    expect(combats(ev(d))).toEqual([['firstStrike', 'u2', 2]]);
    expect(forcedDiceLeft()).toBe(2);
  });

  it('an attacker that retreats out of its hex does not attack', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: W }], terrain: [wall(W)] });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(['flag', 'light', ...n('light', 2)]);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    if (d.pending?.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
    expect(u(d, 'u1')!.hex).not.toBe(H(5, 6));
    expect(combats(ev(d))).toEqual([['firstStrike', 'u2', 2]]);
    expect(forcedDiceLeft()).toBe(2);
  });

  it('an attacker that cannot retreat loses the block instead, stays and attacks; still no battle back', () => {
    const s = build({
      units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: W }],
      terrain: [wall(W), lake([6, 6]), lake([6, 7])],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(['flag', 'light', ...n('light', 2), 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(u(d, 'u1')).toMatchObject({ hex: H(5, 6), blocks: 3 });
    expect(combats(ev(d))).toEqual([['firstStrike', 'u2', 2], ['close', 'u1', 2]]);
    expect(forcedDiceLeft()).toBe(1);
  });

  it('no first strike when the attacker stands on a wall hex itself: attack, then battle back', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [4, 7] }, { side: 'top', type: 'MI', at: W }], terrain: [wall(W), wall([4, 7])] });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(n('light', 4));
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(combats(ev(d))).toEqual([['close', 'u1', 2], ['battleBack', 'u2', 2]]);
  });

  it('a light unit on a wall may still evade; if it stands it strikes first, and the decision offers no First Strike', () => {
    const s = build({ units: [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'LI', at: W }], terrain: [wall(W)] });
    giveCard(s, 'top', 'firstStrike');
    const d = play(s, 'order4C', ['u1'], { keepFS: true });
    must(d, { kind: 'endMove' });
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
    expect(d.pending).toMatchObject({ kind: 'defend', side: 'top', canEvade: true, canFirstStrike: false });
    expect(d.answer({ kind: 'defend', choice: 'firstStrike' })).toBe(false);
    ev(d);
    forceDice(n('light', 4));
    must(d, { kind: 'defend', choice: 'stand' });
    expect(combats(ev(d))).toEqual([['firstStrike', 'u2', 2], ['close', 'u1', 2]]);
  });

  it('every bonus combat against a wall unit meets the first strike too', () => {
    // bottom MC (5,6) began next to the wall (4,6); it beats the MI on (4,7), advances there and attacks the wall
    const s = build({
      units: [{ side: 'bottom', type: 'MC', at: [5, 6] }, { side: 'top', type: 'MI', at: [4, 7], blocks: 1 }, { side: 'top', type: 'MI', at: W }],
      terrain: [wall(W)],
    });
    const d = toBattle(s, 'order4C', ['u1']);
    ev(d);
    forceDice(['medium', 'light', 'light', ...n('light', 2), ...n('light', 2), 'light']);
    must(d, { kind: 'attack', unit: 'u1', target: H(4, 7) });
    must(d, { kind: 'yesno', yes: true });
    expect(d.pending?.kind).toBe('cavalryExtra');
    expect((d.pending as { options: HexId[] }).options).not.toContain(H(4, 6));
    must(d, { kind: 'hex', hex: null });
    expect(d.pending).toMatchObject({ kind: 'bonusCombat', targets: [H(4, 6)] });
    must(d, { kind: 'hex', hex: H(4, 6) });
    expect(combats(ev(d))).toEqual([['close', 'u1', 3], ['firstStrike', 'u3', 2], ['bonus', 'u1', 2]]);
    expect(forcedDiceLeft()).toBe(1);
  });
});

describe('city wall: line of sight (§18.7)', () => {
  const row = (cols: number[], hillUnder = false) => cols.map((c) => wall([2, c], hillUnder));

  it('units on one connected wall see along it; a wall between others blocks', () => {
    const s = build({ terrain: row([3, 4, 5, 6]) });
    expect(lineOfSight(s, H(2, 3), H(2, 6))).toBe(true);
    expect(lineOfSight(s, H(2, 2), H(2, 5))).toBe(false); // from open ground onto the wall, over wall hexes
    expect(lineOfSight(s, H(2, 4), H(2, 8))).toBe(false); // from the wall to open ground beyond it
    expect(lineOfSight(s, H(2, 1), H(2, 3))).toBe(true); // the wall hex a target stands on never blocks
  });

  it('two separate walls do not join up, and a wall blocks between two open hexes', () => {
    const broken = build({ terrain: row([3, 4, 6]) });
    expect(lineOfSight(broken, H(2, 3), H(2, 6))).toBe(false);
    const one = build({ terrain: row([3]) });
    expect(lineOfSight(one, H(2, 2), H(2, 4))).toBe(false);
    expect(lineOfSight(build({}), H(2, 2), H(2, 4))).toBe(true);
  });

  it('a wall on a hill (308): the hill counts for the plateau, the wall and the camps still block', () => {
    // walls on a hill along row 0, a hill row 1, camps on a hill among hills on row 2
    const plateau: TerrainSpec[] = [
      ...[5, 6, 7, 8, 9].map((c) => wall([0, c], true)), ...[5, 6, 7, 8, 9].map((c) => hill([1, c])),
      camp([2, 5], true), hill([2, 6]), camp([2, 7], true), hill([2, 8]),
    ];
    const s = build({ terrain: plateau });
    expect(lineOfSight(s, H(0, 6), H(2, 6))).toBe(true); // from the wall over the hill to the plateau
    expect(lineOfSight(s, H(0, 5), H(0, 9))).toBe(true); // along the wall
    expect(lineOfSight(s, H(2, 6), H(2, 8))).toBe(false); // the camp between blocks on the same hill mass
    expect(lineOfSight(s, H(1, 5), H(1, 9))).toBe(true); // hill to hill over hills
    // without the hill under the walls the hills between would block
    const flat = build({ terrain: plateau.map((t) => (t.t === 'wall' ? wall(t.at) : t)) });
    expect(lineOfSight(flat, H(0, 6), H(2, 6))).toBe(false);
  });

  it('ranged fire from a wall: normal range and dice, along the wall too', () => {
    const s = build({ units: [{ side: 'bottom', type: 'LB', at: [2, 3] }, { side: 'top', type: 'MI', at: [2, 6] }], terrain: row([3, 4, 5, 6]) });
    expect(canFireAt(s, u(s, 'u1')!, H(2, 6))).toBe(true);
    expect(rangedDice(s, u(s, 'u1')!, H(2, 6), 0, false)).toBe(2);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Impassable walls and towns

describe('impassable walls and towns: steep with an art hint (§18.7)', () => {
  const art = (at: At, a: 'wall' | 'town'): TerrainSpec => ({ at, t: 'steep', art: a });

  it('nothing may enter or stand on them, and they block line of sight', () => {
    for (const a of ['wall', 'town'] as const) {
      const s = build({ units: [{ side: 'bottom', type: 'LI', at: [5, 6] }, { side: 'top', type: 'MI', at: [6, 2] }], terrain: [art([4, 6], a), art([5, 1], a), art([5, 2], a)] });
      expect(isImpassable(s, H(4, 6)), a).toBe(true);
      expect(hexesOf(movesOf({ units: [{ side: 'bottom', type: 'LI', at: [5, 6] }], terrain: [art([4, 6], a)] })), a).not.toContain(H(4, 6));
      expect(retreatOptions(s, u(s, 'u2')!, 1), a).toEqual([{ path: [], end: H(6, 2), losses: 1, attachLeader: null }]);
      expect(lineOfSight(s, H(4, 5), H(4, 7)), a).toBe(false);
      expect(() => createGame(setupOf({ units: [{ side: 'bottom', type: 'LI', at: [4, 6] }], terrain: [art([4, 6], a)] }), 1), a).toThrow(/impassable/);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Hill under a camp or wall

describe('a hill under a camp or wall (308, §18.7)', () => {
  it('is data `hill: true`, allowed only on a camp or wall hex; the hex keeps its terrain and counts as a hill', () => {
    const s = build({ terrain: [camp([2, 5], true), wall([0, 5], true), camp([2, 9])] });
    expect([s.terrain[H(2, 5)], s.terrain[H(0, 5)]]).toEqual(['camp', 'wall']);
    expect(ALL_HEXES.filter((h) => s.hillUnder[h])).toEqual([H(0, 5), H(2, 5)]);
    expect([isHill(s, H(2, 5)), isHill(s, H(0, 5)), isHill(s, H(2, 9))]).toEqual([true, true, false]);
    expect(cloneState(s).hillUnder).toBe(s.hillUnder);
    for (const t of ['plain', 'hill', 'forest', 'rampart', 'river'] as const) {
      const bad: TerrainSetup = { r: 4, c: 4, t, hill: true, ...(t === 'rampart' ? { faces: 'top' as const } : {}) };
      expect(() => createGame({ ...setupOf({}), terrain: [bad] }, 1), t).toThrow(/hill/);
    }
    expect(() => createGame({ ...setupOf({}), terrain: [{ r: 4, c: 4, t: 'camp', hill: 'yes' as never }] }, 1)).toThrow(/hill/);
    expect(() => createGame({ ...setupOf({}), terrain: [{ r: 4, c: 4, t: 'camp', hill: false }] }, 1)).not.toThrow();
  });

  it('camp + hill: the hill caps apply, then the camp -1; bonuses on top (X3 Q6, Q19)', () => {
    // a full-strength warrior in a camp on a hill (2,6) and a heavy infantry on the hill next to it (3,6)
    const s = build({
      units: [{ side: 'top', type: 'WA', at: [2, 6] }, { side: 'bottom', type: 'HI', at: [3, 6] }, { side: 'bottom', type: 'HI', at: [2, 7] }],
      leaders: [{ side: 'bottom', at: [3, 6], traits: ['ccBonus'] }],
      terrain: [camp([2, 6], true), hill([3, 6])],
    });
    const [wa, hi, low] = [u(s, 'u1')!, u(s, 'u2')!, u(s, 'u3')!];
    const opts = { fullAtStart: true, ordered: false } as const;
    expect(closeCombatDice(s, wa, hi, { ...opts, role: 'attack' })).toBe(2); // 3 + 1, hill to hill 3, camp -1
    expect(closeCombatDice(s, hi, wa, { ...opts, role: 'attack' })).toBe(4); // 5, hill to hill 3, + Caesar
    expect(closeCombatDice(s, low, wa, { ...opts, role: 'attack' })).toBe(2); // uphill from open ground
    expect(closeCombatDice(s, wa, low, { ...opts, role: 'attack' })).toBe(2); // downhill, foot: 3; camp -1
    // the same camp without the hill: no hill caps
    const flat = build({ units: [{ side: 'top', type: 'WA', at: [2, 6] }, { side: 'bottom', type: 'HI', at: [2, 7] }], terrain: [camp([2, 6])] });
    expect(closeCombatDice(flat, u(flat, 'u2')!, u(flat, 'u1')!, { ...opts, role: 'attack' })).toBe(5);
  });

  it('a wall on a hill changes no dice: the wall cap of 2 is never above a hill cap', () => {
    for (const hillUnder of [false, true]) {
      const s = build({ units: [{ side: 'bottom', type: 'HI', at: [1, 6] }, { side: 'top', type: 'HI', at: [0, 6] }], terrain: [wall([0, 6], hillUnder)] });
      const opts = { fullAtStart: true, ordered: false } as const;
      expect(closeCombatDice(s, u(s, 'u1')!, u(s, 'u2')!, { ...opts, role: 'attack' })).toBe(2);
      expect(closeCombatDice(s, u(s, 'u2')!, u(s, 'u1')!, { ...opts, role: 'firstStrike' })).toBe(2);
    }
  });

  it('counts for very steep hills too (rule veryHills)', () => {
    const s = build({ rules: ['veryHills'], terrain: [camp([2, 6], true)] });
    expect(steepClimb(s, H(3, 6), H(2, 6))).toBe(true);
  });

  it('a camp removed by its capture leaves a hill', () => {
    const text = 'The Romans pull down a Gallic camp on the heights.';
    const s = build({
      objectives: [{ kind: 'capture', side: 'bottom', hexes: [[2, 5]], when: 'turnStart', banners: [1], remove: true, text }],
      terrain: [camp([2, 5], true), camp([2, 9])],
      units: [{ side: 'bottom', type: 'MI', at: [2, 5] }],
    });
    const d = play(s, 'order2L', []);
    expect(ev(d)).toContainEqual({ t: 'terrainChanged', hex: H(2, 5), terrain: 'hill' });
    expect(d.state.terrain[H(2, 5)]).toBe('hill');
    expect(isHill(d.state, H(2, 5))).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Steep slopes (308)

describe('steep slopes between hills and forests (308, rule steepSlopes, §18.7)', () => {
  // forest (4,6) below the hill (3,6); (3,5), the forest's other upper neighbour, is open ground unless said otherwise
  const SLOPE: TerrainSpec[] = [hill([3, 6]), forest([4, 6])];
  const rules: Pos['rules'] = ['steepSlopes'];

  it('is a rule id; the hexsides come from the terrain: hill or hill-under on one side, forest on the other', () => {
    expect(SPECIAL_RULE_IDS).toContain('steepSlopes');
    const s = build({ rules, terrain: [...SLOPE, camp([3, 8], true), forest([4, 8]), camp([3, 10]), forest([4, 10])] });
    expect(steepSlope(s, H(4, 6), H(3, 6))).toBe(true);
    expect(steepSlope(s, H(3, 6), H(4, 6))).toBe(true);
    expect(steepSlope(s, H(4, 8), H(3, 8))).toBe(true); // a camp on a hill
    expect(steepSlope(s, H(4, 10), H(3, 10))).toBe(false); // a camp on open ground
    expect(steepSlope(s, H(4, 6), H(3, 5))).toBe(false);
    expect(steepSlope(build({ terrain: SLOPE }), H(4, 6), H(3, 6))).toBe(false); // without the rule
  });

  it('308 has 12 such hexsides', () => {
    const data = gergovia as unknown as { terrain: TerrainSetup[]; rules: ScenarioSetup['rules'] };
    expect(data.rules).toContain('steepSlopes');
    const s = createGame({ ...setupOf({ rules: data.rules.filter((r) => r !== 'magoAmbush') }), terrain: data.terrain }, 1);
    const sides = ALL_HEXES.flatMap((a) => neighbours(a).filter((b) => a < b && steepSlope(s, a, b)).map((b) => [a, b]));
    expect(sides).toHaveLength(12);
  });

  it('no move from the forest up the hill, for units and leaders; down the hill is allowed', () => {
    const up = movesOf({ rules, units: [{ side: 'bottom', type: 'MI', at: [4, 6] }], terrain: SLOPE });
    expect(hexesOf(up)).not.toContain(H(3, 6));
    expect(hexesOf(up)).toContain(H(3, 5));
    expect(hexesOf(movesOf({ units: [{ side: 'bottom', type: 'MI', at: [4, 6] }], terrain: SLOPE }))).toContain(H(3, 6));
    // a leader (3 hexes) gets onto the hill only the long way round, over an open hex
    const leaderTo = (r: Pos['rules']) => {
      const s = build({ rules: r, leaders: [{ side: 'bottom', at: [4, 6] }], terrain: SLOPE });
      const L = leaderId(s, 0);
      return pieceMoves(play(s, 'order4C', [L]).state, L).find((m) => m.hex === H(3, 6));
    };
    expect(leaderTo(rules)).toMatchObject({ dist: 2 });
    expect(leaderTo([])).toMatchObject({ dist: 1 });
    const down = movesOf({ rules, units: [{ side: 'bottom', type: 'MI', at: [3, 6] }], terrain: SLOPE });
    expect(hexesOf(down)).toContain(H(4, 6));
  });

  it("a warrior's long move may not end next to an enemy only across a slope (it could not close combat)", () => {
    const pos: Pos = { units: [{ side: 'bottom', type: 'WA', at: [6, 6] }, { side: 'top', type: 'MI', at: [3, 6] }], terrain: SLOPE };
    expect(hexesOf(movesOf({ ...pos, rules }))).not.toContain(H(4, 6));
    expect(movesOf(pos).find((m) => m.hex === H(4, 6))).toMatchObject({ dist: 2, mustBattle: true });
  });

  it('no retreat or evade from the forest up the hill (a blocked retreat hex costs a block); down is allowed', () => {
    // top pieces retreat toward row 0: from the forest (4,6) the rear hexes are the hills (3,5) and (3,6)
    const terrain = [...SLOPE, hill([3, 5])];
    const s = build({
      rules,
      units: [{ side: 'top', type: 'MI', at: [4, 6] }, { side: 'top', type: 'LI', at: [4, 2] }],
      leaders: [{ side: 'top', at: [4, 10] }],
      terrain: [...terrain, forest([4, 2]), hill([3, 1]), hill([3, 2]), forest([4, 10]), hill([3, 9]), hill([3, 10])],
    });
    expect(retreatOptions(s, u(s, 'u1')!, 1)).toEqual([{ path: [], end: H(4, 6), losses: 1, attachLeader: null }]);
    expect(evadeOptions(s, u(s, 'u2')!)).toEqual([]);
    expect(leaderEvadeOptions(s, s.leaders[0])).toEqual([]);
    // the same without the rule
    const free = build({ units: [{ side: 'top', type: 'MI', at: [4, 6] }], terrain });
    expect(retreatOptions(free, u(free, 'u1')!, 1).every((o) => o.losses === 0)).toBe(true);
    // a bottom unit on the hill retreats down into the forest
    const down = build({ rules, units: [{ side: 'bottom', type: 'MI', at: [3, 6] }], terrain: [...SLOPE, lake([4, 7])] });
    expect(retreatOptions(down, u(down, 'u1')!, 1)).toEqual([{ path: [H(4, 6)], end: H(4, 6), losses: 0, attachLeader: null }]);
  });

  it('no close combat across it either way (so no momentum advance up it); ranged fire is allowed', () => {
    const units: Pos['units'] = [{ side: 'bottom', type: 'MI', at: [4, 6] }, { side: 'top', type: 'MI', at: [3, 6] }];
    const up = build({ rules, units, terrain: SLOPE });
    expect(battleTargets(toBattle(up, 'order4C', ['u1']).state, 'u1')).toEqual([]);
    const ctl = build({ units, terrain: SLOPE });
    expect(battleTargets(toBattle(ctl, 'order4C', ['u1']).state, 'u1')).toEqual([{ hex: H(3, 6), kind: 'close' }]);
    const down = build({ rules, units, terrain: SLOPE, first: 'top' });
    expect(battleTargets(toBattle(down, 'order4C', ['u2']).state, 'u2')).toEqual([]);
    // an archer in the forest fires up past the slope at a unit on the plateau
    const fire = build({ rules, units: [{ side: 'bottom', type: 'LB', at: [4, 6] }, { side: 'top', type: 'MI', at: [2, 6] }], terrain: [...SLOPE, hill([2, 6])] });
    expect(battleTargets(toBattle(fire, 'order4C', ['u1']).state, 'u1')).toEqual([{ hex: H(2, 6), kind: 'ranged' }]);
  });
});
