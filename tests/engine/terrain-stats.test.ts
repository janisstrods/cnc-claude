// The terrain table (rules-reference §4, §7, §8, §16, §18.6, §18.7). Its predicates must reproduce the behaviour the engine
// had when they were literal terrain checks; those checks are kept here as the reference.
import { describe, expect, it } from 'vitest';
import {
  TERRAIN_NAMES, TERRAIN_STATS, UNIT_STATS, UNIT_TYPES, ccCapOfHex, entryRollCount, hasEntryRoll, impassableTerrain, isImpassable,
  mayAdvanceOut, mayBattleAfterEntering, oneHexOut, rangedFromCap, rangedTargetCap, stopsAll, stopsMounted, terrainStatsAt,
  type GameState, type TerrainType,
} from '../../src/engine';

interface Hex {
  t: TerrainType;
  ford: boolean;
  noCap: boolean;
}

const TERRAINS = Object.keys(TERRAIN_STATS) as TerrainType[];
/** Every terrain, plus a ford and a no-cap ford (§16). */
const HEXES: Hex[] = [
  ...TERRAINS.map((t) => ({ t, ford: false, noCap: false })),
  { t: 'river', ford: true, noCap: false },
  { t: 'river', ford: true, noCap: true },
];
/** A board whose hex 0 is `x` (the predicates read only the board arrays). */
const boardOf = (x: Hex) => ({ terrain: [x.t], fords: [x.ford], noCap: [x.noCap] }) as unknown as GameState;
const name = (x: Hex) => `${x.t}${x.ford ? (x.noCap ? ' (no-cap ford)' : ' (ford)') : ''}`;
const is = (x: Hex, ...ts: TerrainType[]) => ts.includes(x.t);
const ford = (x: Hex) => x.t === 'river' && x.ford;
const cappedFord = (x: Hex) => ford(x) && !x.noCap;

describe('terrain table', () => {
  it('reproduces the literal terrain checks it replaced', () => {
    for (const x of HEXES) {
      const s = boardOf(x);
      const st = terrainStatsAt(s, 0);
      expect({
        impassable: isImpassable(s, 0),
        impassableTerrain: impassableTerrain(x.t, x.ford),
        stopsAll: stopsAll(s, 0),
        stopsMounted: stopsMounted(s, 0),
        ccCap: ccCapOfHex(s, 0),
        fromCap: rangedFromCap(s, 0),
        intoCap: rangedTargetCap(s, 0),
        blocksSight: st.blocksSight,
        entryRoll: hasEntryRoll(s, 0),
        oneHexOut: oneHexOut(s, 0),
        advanceOutMoved: mayAdvanceOut(s, 0, true),
        advanceOutUnmoved: mayAdvanceOut(s, 0, false),
      }, name(x)).toEqual({
        impassable: x.t === 'river' ? !x.ford : is(x, 'lake', 'sea', 'steep', 'void'),
        impassableTerrain: x.t === 'river' ? !x.ford : is(x, 'lake', 'sea', 'steep', 'void'),
        stopsAll: is(x, 'forest', 'marsh', 'ditch', 'wall') || ford(x),
        stopsMounted: x.t === 'broken',
        ccCap: is(x, 'forest', 'marsh', 'broken', 'wall') || cappedFord(x) ? 2 : 99,
        fromCap: x.t === 'marsh' || cappedFord(x) ? 1 : 99,
        intoCap: x.t === 'forest' ? 1 : 99,
        blocksSight: is(x, 'forest', 'camp', 'steep'),
        entryRoll: x.t === 'marsh',
        oneHexOut: is(x, 'marsh', 'wall'),
        advanceOutMoved: !(x.t === 'marsh' || ford(x)),
        advanceOutUnmoved: true,
      });
    }
  });

  it('off the board is impassable void', () => {
    const s = boardOf({ t: 'plain', ford: false, noCap: false });
    expect([isImpassable(s, -1), impassableTerrain(undefined, false), terrainStatsAt(s, -1)]).toEqual([true, true, TERRAIN_STATS.void]);
  });

  it('may battle after entering: not in a forest unless a forest fighter, not on broken ground if mounted (§7)', () => {
    for (const type of UNIT_TYPES) {
      const st = UNIT_STATS[type];
      for (const t of TERRAINS) {
        const expected = !(t === 'forest' && !st.forestFighter) && !(t === 'broken' && st.mounted);
        expect(mayBattleAfterEntering(type, t), `${type} ${t}`).toBe(expected);
      }
    }
  });

  it('entry rolls along a path: one per marsh hex, none off the board', () => {
    const s = { terrain: ['marsh', 'plain', 'marsh'], fords: [], noCap: [] } as unknown as GameState;
    expect(entryRollCount(s, [0, 1, 2, -1])).toBe(2);
  });

  it('TERRAIN_NAMES comes from the table', () => {
    expect(TERRAIN_NAMES).toEqual({
      plain: 'Open Ground', hill: 'Hill', forest: 'Forest', marsh: 'Marsh', broken: 'Broken Ground', river: 'River', lake: 'Lake',
      camp: 'Fortified Camp', steep: 'Steep Hills', sea: 'Sea', rampart: 'Rampart', ditch: 'Ditch', wall: 'City Wall', void: '',
    });
  });
});
