// The 23 Expansion #2 battles (201-223, Rome & the Barbarians): each setup builds and matches its manifest
// (tests/scenarios/manifest.ts), and the battle-specific data (objectives, commands, legions, ramparts, coasts, ditch,
// ambush, leader traits and the new rules) reaches the game state.
import { describe, expect, it } from 'vitest';
import {
  COLS, ELITES, HEX_DIRS, OFF_BOARD, createGame, hexId, isImpassable, isLoneLeader, leaderUnit, onBoard, rowOf,
  type GameState, type HexDir, type ObjectiveDef, type ScenarioSetup, type Side, type UnitType,
} from '../../src/engine';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import { checksums, terrainTally } from './checksum';
import { MANIFEST, MANIFEST_EXP2 } from './manifest';

const H = (r: number, c: number) => hexId(r, c);
const EXP1 = Object.keys(MANIFEST).sort();
const EXP2 = Object.keys(MANIFEST_EXP2).sort();
const SIDES: Side[] = ['top', 'bottom'];
const game = (id: string, seed = 1) => createGame(scenarioById(id).setup, seed);
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));

function unitCounts(s: GameState, side: Side): Partial<Record<UnitType, number>> {
  const n: Partial<Record<UnitType, number>> = {};
  for (const u of s.units) if (u.side === side) n[u.type] = (n[u.type] ?? 0) + 1;
  return n;
}

/** Protected hexsides of a rampart hex, by direction. */
const edgesOf = (s: GameState, h: number): HexDir[] => HEX_DIRS.filter((_, i) => s.rampart[h] & (1 << i));

/** Every rampart hex as 'r,c' -> its protected hexsides, sorted and joined with '+'. */
function rampartsOf(s: GameState): Record<string, string> {
  const out: Record<string, string> = {};
  s.terrain.forEach((t, h) => {
    if (t === 'rampart') out[`${rowOf(h)},${h - rowOf(h) * COLS}`] = [...edgesOf(s, h)].sort().join('+');
  });
  return out;
}

/** The hexes of a terrain type as sorted 'r,c' strings. */
function hexesOf(s: GameState, type: string): string[] {
  const out: string[] = [];
  s.terrain.forEach((t, h) => {
    if (t === type) out.push(`${rowOf(h)},${h - rowOf(h) * COLS}`);
  });
  return out;
}

/** A union member without its `text` (Omit alone would flatten the union). */
type NoText<T> = T extends unknown ? Omit<T, 'text'> : never;

const cols = (r: number, a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => `${r},${a + i}`);
const sorted = (xs: string[]) => [...xs].sort();

describe('Expansion #2 battle list', () => {
  it('the 23 battles 201-223 follow the 15 base and 24 Expansion #1 battles', () => {
    expect(EXP2).toEqual(range(201, 223));
    const BASE = range(1, 15).map((id) => id.padStart(3, '0'));
    expect(SCENARIOS.map((s) => s.id)).toEqual([...BASE, ...EXP1, ...EXP2]);
    expect(SCENARIOS.filter((s) => s.expansion === 'exp2').map((s) => s.id)).toEqual(EXP2);
    expect(Object.keys(MANIFEST).filter((id) => EXP2.includes(id))).toEqual([]);
  });

  it('every battle has a briefing, a hint, and special-rule text where the battle has special data', () => {
    for (const id of EXP2) {
      const sc = scenarioById(id);
      expect(sc.blurb.length, id).toBeGreaterThan(80);
      expect(sc.difficultyHint.length, id).toBeGreaterThan(5);
      const st = sc.setup;
      const special = st.rules.length || st.objectives?.length || st.commands || st.rollingFire || st.rampartBreakers || st.lastRowRetreat;
      if (special) expect(sc.specialText.length, `${id} has special rules`).toBeGreaterThan(0);
    }
  });

  it('the Romans (bottom, "Roman") face a Barbarian army (top, barbarian blocks); 201-205 use the base Roman look, 206-223 the Marian', () => {
    for (const id of EXP2) {
      const m = MANIFEST_EXP2[id];
      expect([id, m.armies.bottom, m.blocks.bottom, m.blocks.top]).toEqual([id, 'Roman', 'rom', 'bar']);
      expect([id, m.looks.bottom]).toEqual([id, Number(id) < 206 ? 'roman' : 'marian']);
      expect([id, m.armies.top]).not.toEqual([id, 'Roman']);
    }
  });

  it('Marius\' legions: the Romans of 206-223 only (§18.2), as a copy in every state', () => {
    for (const id of EXP2) {
      const st = scenarioById(id).setup;
      expect([id, st.legions]).toEqual([id, Number(id) < 206 ? undefined : { bottom: 'marius' }]);
      expect([id, MANIFEST_EXP2[id].legions]).toEqual([id, st.legions]);
      const s = game(id);
      const all = [...s.units, ...s.special.reserveUnits];
      for (const u of all) {
        const legion = st.legions?.[u.side] && (u.type === 'MI' || u.type === 'HI') ? st.legions[u.side] : undefined;
        expect([id, u.id, u.legion], `${id} ${u.side} ${u.type}`).toEqual([id, u.id, legion]);
      }
    }
  });

  it('every legion side fields MI or HI, so the rule has an effect', () => {
    for (const id of EXP2) {
      const m = MANIFEST_EXP2[id];
      for (const side of Object.keys(m.legions ?? {}) as Side[]) {
        const n = { ...m.units[side] };
        for (const [t, k] of Object.entries(m.reserves?.units[side] ?? {})) n[t as UnitType] = (n[t as UnitType] ?? 0) + k;
        expect((n.MI ?? 0) + (n.HI ?? 0), `${id} ${side}`).toBeGreaterThan(0);
        const s = game(id);
        expect(s.units.filter((u) => u.side === side && u.legion).length, `${id} ${side} legion units on the board`).toBeGreaterThan(0);
      }
    }
  });

  it('only Spartacus (208, 210-214) and Caesar (215, 217, 218) have leader traits, each on an infantry unit', () => {
    const traits = EXP2.flatMap((id) => {
      const st = scenarioById(id).setup;
      return [...st.leaders, ...st.reserveLeaders, ...(st.placeLeaders ?? [])].filter((l) => l.traits?.length).map((l) => [id, l.name, l.traits]);
    });
    const spartacus = ['208', '210', '211', '212', '213', '214'].map((id) => [id, 'Spartacus', ['spartacusDice']]);
    const caesar = ['215', '217', '218'].map((id) => [id, 'Julius Caesar', ['ccBonus', 'forcedMarch']]);
    expect(traits).toEqual([...spartacus, ...caesar]);
    for (const [id, name] of [...spartacus, ...caesar] as [string, string][]) {
      const s = game(id);
      const l = s.leaders.find((x) => x.name === name)!;
      expect(l.traits, `${id} ${name}`).toBeDefined();
      expect(leaderUnit(s, l)?.type, `${id}: ${name} rides with a medium infantry unit`).toBe('MI');
      expect(l.side, `${id} ${name}`).toBe(name === 'Spartacus' ? 'top' : 'bottom');
    }
    // 209 names Crixus, not Spartacus; the Slave leaders of 205 have no trait
    expect(game('209').leaders.some((l) => l.name === 'Spartacus')).toBe(false);
    expect(game('205').leaders.some((l) => l.traits?.length)).toBe(false);
  });

  it('only 208 Mt Vesuvius starts with lone leaders (Glaber and Varinius, each alone in a camp)', () => {
    const lone = EXP2.flatMap((id) => {
      const s = game(id);
      return s.leaders.filter((l) => l.hex >= 0 && isLoneLeader(s, l)).map((l) => [id, l.name, s.terrain[l.hex]]);
    });
    expect(lone).toEqual([['208', 'Glaber', 'camp'], ['208', 'Varinius', 'camp']]);
  });

  it('only 206 starts with units and leaders off the board', () => {
    const off = EXP2.filter((id) => game(id).special.reserveUnits.length || game(id).special.reserveLeaders.length);
    expect(off).toEqual(['206']);
    expect(EXP2.filter((id) => MANIFEST_EXP2[id].reserves)).toEqual(['206']);
  });
});

for (const id of EXP2) {
  const m = MANIFEST_EXP2[id];
  describe(`${id} ${m.name}`, () => {
    it('header: name, year, armies, commanders, cards, blocks, looks, first player, banners, rules, no options', () => {
      const sc = scenarioById(id);
      expect([sc.name, sc.year, sc.expansion]).toEqual([m.name, m.year, 'exp2']);
      const s = game(id);
      for (const side of SIDES) {
        const p = s.players[side];
        expect([p.army, p.commander, p.command, p.hand.length, p.blocks, p.look], side).toEqual([
          m.armies[side], m.commanders[side], m.cards[side], m.cards[side], m.blocks[side], m.looks[side],
        ]);
      }
      expect([s.first, s.active, s.bannersToWin]).toEqual([m.first, m.first, m.banners]);
      expect(sc.setup.rules).toEqual(m.rules);
      expect(s.special.rules).toEqual(m.rules);
      expect(sc.setup.options).toBeUndefined();
      expect(sc.setup.placeLeaders).toBeUndefined();
      expect(s.special.unplaced).toEqual([]);
    });

    it('units per side and type, leaders, reserves and elites', () => {
      const s = game(id);
      for (const side of SIDES) {
        expect(unitCounts(s, side), side).toEqual(m.units[side]);
        expect(s.leaders.filter((l) => l.side === side && l.hex >= 0).map((l) => l.name), side).toEqual(m.leaders[side]);
        const reserveLeaders = m.reserves?.leaders[side] ?? [];
        expect(s.special.leadersAtStart[side], side).toBe(m.leaders[side].length + reserveLeaders.length);
      }
      const reserves: Record<Side, Partial<Record<UnitType, number>>> = { top: {}, bottom: {} };
      for (const u of s.special.reserveUnits) reserves[u.side][u.type] = (reserves[u.side][u.type] ?? 0) + 1;
      expect(reserves).toEqual(m.reserves?.units ?? { top: {}, bottom: {} });
      expect(s.special.reserveLeaders.map((l) => [l.side, l.name])).toEqual(
        SIDES.flatMap((side) => (m.reserves?.leaders[side] ?? []).map((n) => [side, n])),
      );
      expect(s.units.filter((u) => u.elite).map((u) => [u.side, u.elite, u.type])).toEqual(m.elites);
    });

    it('pieces stand on passable hexes, one unit and at most one leader per hex, leaders only with their own units', () => {
      const s = game(id);
      const unitHexes = s.units.map((u) => u.hex);
      expect(new Set(unitHexes).size).toBe(unitHexes.length);
      for (const u of s.units) {
        expect(u.hex, u.id).toBeGreaterThanOrEqual(0);
        expect(isImpassable(s, u.hex), `${u.type} at ${u.hex} (${s.terrain[u.hex]})`).toBe(false);
        expect(u.blocks).toBe(u.maxBlocks);
      }
      for (const u of s.special.reserveUnits) expect(u.hex).toBe(OFF_BOARD);
      for (const l of s.special.reserveLeaders) expect(l.hex).toBe(OFF_BOARD);
      const onBoardLeaders = s.leaders.filter((l) => l.hex >= 0);
      expect(new Set(onBoardLeaders.map((l) => l.hex)).size).toBe(onBoardLeaders.length);
      for (const l of onBoardLeaders) {
        expect(isImpassable(s, l.hex), l.name).toBe(false);
        const there = s.units.find((u) => u.hex === l.hex);
        if (there) expect(there.side, l.name).toBe(l.side);
      }
    });

    it('elites are on unit types their preset allows', () => {
      for (const u of game(id).units) if (u.elite) expect(ELITES[u.elite].types, `${u.elite} on ${u.type}`).toContain(u.type);
    });

    it('terrain tallies and position checksums match the verified map', () => {
      const s = game(id);
      expect(terrainTally(s), 'terrain tally').toEqual(m.terrain);
      expect(checksums(s), 'checksums (terrain, unit and leader positions)').toEqual(m.checksum);
    });

    it('ramparts protect at least one hexside and only rampart hexes have any', () => {
      const s = game(id);
      for (let h = 0; h < s.terrain.length; h++) {
        if (s.terrain[h] === 'rampart') expect(edgesOf(s, h).length, `rampart ${h}`).toBeGreaterThan(0);
        else expect(s.rampart[h], `hex ${h}`).toBe(0);
      }
    });
  });
}

describe('objectives', () => {
  /** The resolved objectives of a battle without their log text. */
  const objectivesOf = (id: string) => game(id).special.objectives.map((o) => {
    const { text, ...rest } = o;
    expect(text.length, `${id} objective text`).toBeGreaterThan(5);
    return rest;
  });
  const asc = (...rc: [number, number][]) => rc.map(([r, c]) => H(r, c)).sort((a, b) => a - b);
  const row = (r: number) => asc(...Array.from({ length: COLS }, (_, c): [number, number] => [r, c]));

  const EXPECTED: Record<string, NoText<ObjectiveDef>[]> = {
    '201': [{ kind: 'capture', side: 'bottom', hexes: asc([3, 5], [4, 4], [4, 5]), when: 'turnStart', banners: [0, 0, 1], together: 0, remove: true }],
    '202': [{ kind: 'majority', sides: ['top', 'bottom'], hexes: asc([1, 11], [2, 8], [2, 9], [2, 11], [3, 9], [3, 10], [3, 11], [4, 12], [5, 11]), banners: 2, when: 'turnEnd' }],
    '204': [{ kind: 'hold', side: 'top', hexes: asc([8, 8], [8, 9]), max: 1 }],
    '208': [{ kind: 'capture', side: 'top', hexes: asc([3, 4], [3, 7], [3, 8], [4, 6]), when: 'turnStart', banners: [1], together: 0, remove: true }],
    '210': [{ kind: 'exit', side: 'top', hexes: row(8), units: 'any', leadersScore: false }],
    '211': [{ kind: 'capture', side: 'bottom', hexes: asc([2, 5], [2, 6], [2, 7]), when: 'turnStart', banners: [1], together: 2, remove: true }],
    '212': [{ kind: 'exit', side: 'top', hexes: row(8), units: 'foot', leadersScore: false }],
    '213': [{ kind: 'hold', side: 'bottom', hexes: asc([3, 4]), max: 1 }],
    '214': [{ kind: 'hold', side: 'top', hexes: asc([6, 9], [8, 10]), max: 1 }],
    '215': [
      { kind: 'capture', side: 'bottom', hexes: asc([1, 0]), when: 'turnStart', banners: [1], together: 0, remove: true },
      { kind: 'capture', side: 'top', hexes: asc([7, 4]), when: 'turnStart', banners: [1], together: 0, remove: true },
    ],
    '219': [{ kind: 'sectionClear', side: 'bottom' }],
    '221': [
      { kind: 'capture', side: 'top', hexes: asc([7, 6]), when: 'turnStart', banners: [2], together: 0, remove: true },
      { kind: 'exit', side: 'bottom', hexes: row(0), units: 'any', leadersScore: false },
    ],
    '222': [{ kind: 'hold', side: 'bottom', hexes: asc([2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [2, 9], [2, 10]), max: 2 }],
  };

  it('the objective battles, and the objectives of each, are the ones the rulings give', () => {
    expect(EXP2.filter((id) => game(id).special.objectives.length)).toEqual(Object.keys(EXPECTED));
    for (const [id, want] of Object.entries(EXPECTED)) expect(objectivesOf(id), id).toEqual(want);
  });

  it('objective hexes are on the board, with the terrain their kind needs', () => {
    for (const id of EXP2) {
      const st = scenarioById(id).setup;
      const s = game(id);
      for (const o of st.objectives ?? []) {
        if (o.kind === 'sectionClear') continue;
        expect(o.hexes?.length, `${id} ${o.kind} hexes`).toBeGreaterThan(0);
        for (const [r, c] of o.hexes ?? []) {
          expect(onBoard(r, c), `${id} ${o.kind} ${r},${c} on the board`).toBe(true);
          const t = s.terrain[H(r, c)];
          if (o.kind === 'capture' || o.kind === 'hold') expect(['camp', 'rampart'], `${id} ${o.kind} ${r},${c} is ${t}`).toContain(t);
          if (o.kind === 'majority') expect(t, `${id} majority ${r},${c}`).toBe('hill');
          // a unit leaves over the far baseline: the Slaves (top) over row 8, the Romans (bottom) over row 0
          if (o.kind === 'exit') expect(r, `${id} exit ${r},${c}`).toBe(o.side === 'top' ? 8 : 0);
        }
      }
    }
  });

  it('every camp or rampart a capture or hold objective names is a distinct hex, and each capture battle has its camps', () => {
    const camps = (id: string) => sorted(hexesOf(game(id), 'camp'));
    expect(camps('201')).toEqual(sorted(['3,5', '4,4', '4,5']));
    expect(camps('204')).toEqual(sorted(['8,8', '8,9']));
    expect(camps('208')).toEqual(sorted(['3,4', '3,7', '3,8', '4,6']));
    expect(camps('211')).toEqual(sorted(['2,5', '2,6', '2,7']));
    expect(camps('213')).toEqual(['3,4']);
    expect(camps('214')).toEqual(sorted(['6,9', '8,10']));
    expect(camps('215')).toEqual(['1,0']);
    expect(camps('221')).toEqual(['7,6']);
    expect(camps('212')).toEqual(sorted(['7,4', '7,6', '7,8', '7,10']));
    // 215's Roman "camp" is a rampart, so the Belgae capture a rampart hex
    expect(hexesOf(game('215'), 'rampart')).toEqual(['7,4']);
  });
});

describe('separate commands, Rolling Fire and the other battle rules', () => {
  it('210 Picenum: Lentulus (grey) and Gellius, every Roman unit in one of them, the Slaves and all leaders in none', () => {
    const st = scenarioById('210').setup;
    expect(st.commands).toEqual([
      { id: 'lentulus', name: 'Lentulus', side: 'bottom', blocks: 'gry' },
      { id: 'gellius', name: 'Gellius', side: 'bottom' },
    ]);
    const s = game('210');
    expect(s.special.commands.map((c) => c.id)).toEqual(['lentulus', 'gellius']);
    const ids = new Set(s.special.commands.map((c) => c.id));
    const romans = s.units.filter((u) => u.side === 'bottom');
    expect(romans).toHaveLength(18);
    for (const u of romans) expect(ids.has(u.command ?? ''), `${u.type} ${u.hex} has a command`).toBe(true);
    const count = (cmd: string) => romans.filter((u) => u.command === cmd).map((u) => u.type).sort();
    expect(count('lentulus')).toEqual(['HWM', 'LI', 'LI', 'MC', 'MI', 'MI', 'MI', 'MI']);
    expect(count('gellius')).toEqual(['HWM', 'LI', 'LI', 'MC', 'MC', 'MI', 'MI', 'MI', 'MI', 'MI']);
    // the command named on a unit exists and belongs to the unit's side
    for (const u of s.units) if (u.command) expect(s.special.commands.find((c) => c.id === u.command)?.side, u.id).toBe(u.side);
    for (const l of s.leaders) expect(l.command, `${l.name} is unrestricted`).toBeUndefined();
    for (const u of s.units.filter((x) => x.side === 'top')) expect(u.command, 'a Slave unit').toBeUndefined();
    // Lentulus' army stands left of the central chain (columns 1-4), Gellius' right of it
    for (const u of romans) {
      const c = u.hex - rowOf(u.hex) * COLS;
      expect(u.command, `${u.type} at ${rowOf(u.hex)},${c}`).toBe(c <= 4 ? 'lentulus' : 'gellius');
    }
  });

  it('only 210 has separate commands and Rolling Fire (Slave infantry on the hills); every unit and leader naming a command names a real one', () => {
    expect(EXP2.filter((id) => scenarioById(id).setup.commands)).toEqual(['210']);
    expect(EXP2.filter((id) => scenarioById(id).setup.rollingFire)).toEqual(['210']);
    expect(game('210').special.rollingFire).toBe('top');
    for (const id of EXP2) {
      const st = scenarioById(id).setup;
      const known = new Set((st.commands ?? []).map((c) => c.id));
      for (const p of [...st.units, ...st.leaders]) if (p.command !== undefined) expect(known.has(p.command), `${id}: command ${p.command}`).toBe(true);
    }
    // the row of hills 210's Slaves roll from
    expect(sorted(hexesOf(game('210'), 'hill'))).toEqual(
      sorted([...cols(1, 0, 11), '2,5', '2,6', '3,5', '4,6', '5,5', '5,6', '6,6', '7,5', '7,6', '8,6']),
    );
  });

  it('214 Silarus: the Slaves are eliminated by a retreat that ends on their baseline (last-row retreat)', () => {
    expect(EXP2.filter((id) => scenarioById(id).setup.lastRowRetreat)).toEqual(['214']);
    expect(game('214').special.lastRowRetreat).toBe('top');
  });

  it('223 Cefn Carnedd: very steep hills and Roman rampart breakers', () => {
    expect(EXP2.filter((id) => scenarioById(id).setup.rules.includes('veryHills'))).toEqual(['223']);
    expect(EXP2.filter((id) => scenarioById(id).setup.rampartBreakers)).toEqual(['223']);
    const s = game('223');
    expect(s.special.rules).toEqual(['veryHills']);
    expect(s.special.rampartBreakers).toBe('bottom');
    expect(MANIFEST_EXP2['223'].rules).toEqual(['veryHills']);
    expect(s.terrain.filter((t) => t === 'hill')).toHaveLength(16);
  });

  it('206 Aquae Sextiae: the Roman ambush force waits off the board for a Leadership card or Order Light Troops', () => {
    const st = scenarioById('206').setup;
    expect(st.rules).toEqual(['magoAmbush']);
    expect(st.ambush).toEqual({
      trigger: ['inspiredL', 'inspiredC', 'inspiredR', 'leadershipAny', 'orderLight'],
      afterOwnTurns: 0,
      text: expect.stringContaining('{section}'),
    });
    const s = game('206');
    expect(s.special.ambush).toMatchObject({ trigger: ['inspiredL', 'inspiredC', 'inspiredR', 'leadershipAny', 'orderLight'], afterOwnTurns: 0 });
    expect(s.special.reserveSide).toBe('bottom');
    expect(s.special.reserveUnits.map((u) => u.type).sort()).toEqual(['AX', 'AX', 'LC', 'LI']);
    expect(s.special.reserveLeaders.map((l) => l.name)).toEqual(['Marcellus']);
    expect(EXP2.filter((id) => scenarioById(id).setup.ambush)).toEqual(['206']);
  });
});

describe('terrain of the new battles', () => {
  it('212 Bruttium: nine ditch hexes (4,4-4,12) in front of nine ramparts (5,3-5,11)', () => {
    const s = game('212');
    expect(sorted(hexesOf(s, 'ditch'))).toEqual(sorted(cols(4, 4, 12)));
    expect(MANIFEST_EXP2['212'].terrain.types.ditch).toBe(9);
    expect(sorted(hexesOf(s, 'rampart'))).toEqual(sorted(cols(5, 3, 11)));
    for (const id of EXP2) if (id !== '212') expect([id, hexesOf(game(id), 'ditch')]).toEqual([id, []]);
  });

  it('217 Invasion of Britain: the seacoast 8,1-8,11 is a fordable river (art: sea); 8,0 and 8,12 are dry', () => {
    const st = scenarioById('217').setup;
    const coast = st.terrain.filter((t) => t.t === 'sea');
    expect(coast.map((t) => [t.r, t.c, t.ford])).toEqual(cols(8, 1, 11).map((rc) => [8, Number(rc.split(',')[1]), true]));
    const s = game('217');
    for (let c = 1; c <= 11; c++) {
      const h = H(8, c);
      expect([c, s.terrain[h], s.fords[h], s.noCap[h], isImpassable(s, h)], `coast 8,${c}`).toEqual([c, 'river', true, false, false]);
    }
    expect([H(8, 0), H(8, 12)].map((h) => s.terrain[h])).toEqual(['plain', 'plain']);
    expect(s.terrain.filter((t) => t === 'sea')).toHaveLength(0);
    // eight Roman units start on the coast
    const onCoast = s.units.filter((u) => rowOf(u.hex) === 8 && s.terrain[u.hex] === 'river');
    expect(onCoast.every((u) => u.side === 'bottom')).toBe(true);
    expect(onCoast.map((u) => u.type).sort()).toEqual(['AX', 'AX', 'LB', 'LB', 'MI', 'MI', 'MI', 'MI']);
    expect(MANIFEST_EXP2['217'].terrain.rivers).toEqual({ ford: 11, blocked: 0, nocap: 0 });
    // no other battle plays a coast as a ford
    for (const id of EXP2) if (id !== '217') expect([id, scenarioById(id).setup.terrain.some((t) => t.t === 'sea' && t.ford)]).toEqual([id, false]);
  });

  it('202 Telamon: 13 sea hexes down the left edge, impassable', () => {
    const s = game('202');
    expect(sorted(hexesOf(s, 'sea'))).toEqual(sorted(['0,0', '0,1', '0,2', '1,0', '1,1', '2,0', '2,1', '3,0', '4,0', '5,0', '6,0', '7,0', '8,0']));
    for (const h of s.terrain.flatMap((t, i) => (t === 'sea' ? [i] : []))) expect(isImpassable(s, h)).toBe(true);
    expect(sorted(hexesOf(s, 'hill'))).toEqual(sorted(['1,11', '2,8', '2,9', '2,11', '3,9', '3,10', '3,11', '4,12', '5,11']));
    // Regulus' wing starts on the top rows, the Gallic baseline
    const wing = s.units.filter((u) => u.side === 'bottom' && rowOf(u.hex) <= 1);
    expect(wing).toHaveLength(10);
    expect(s.leaders.find((l) => l.name === 'Regulus')?.hex).toBe(H(1, 9));
  });

  it('208 Mt Vesuvius: 18 impassable hills, four camps (two hold only a lone leader), six ramparts', () => {
    const s = game('208');
    expect(sorted(hexesOf(s, 'steep'))).toEqual(sorted(['0,0', '0,1', '0,7', '0,8', '0,9', '1,0', '1,9', '2,0', '2,1', '2,2', '2,9', '3,1', '3,9', '3,10', '4,2', '4,3', '4,10', '5,2']));
    for (const h of s.terrain.flatMap((t, i) => (t === 'steep' ? [i] : []))) expect(isImpassable(s, h)).toBe(true);
    expect(rampartsOf(s)).toEqual({
      '2,4': 'NE+NW+W', '2,5': 'NE+NW', '2,6': 'NE+NW', '2,7': 'NE+NW', '2,8': 'NE+NW', '3,3': 'NW+W',
    });
    const camps = s.terrain.flatMap((t, h) => (t === 'camp' ? [h] : []));
    expect(camps.map((h) => s.units.some((u) => u.hex === h))).toEqual([true, false, true, false]); // 3,4 MI, 3,7 Glaber, 3,8 AX, 4,6 Varinius
    expect(s.leaders.filter((l) => camps.includes(l.hex) && !s.units.some((u) => u.hex === l.hex)).map((l) => [l.side, l.name])).toEqual([
      ['bottom', 'Glaber'], ['bottom', 'Varinius'],
    ]);
  });

  it('209 Mt Garganus: 13 impassable hills', () => {
    expect(sorted(hexesOf(game('209'), 'steep'))).toEqual(sorted([...cols(0, 3, 9), ...cols(1, 3, 8)]));
  });

  it('213 Camalatrum: the lake, the camp hex, and the two groups behind the enemy lines', () => {
    const s = game('213');
    expect(sorted(hexesOf(s, 'lake'))).toEqual(sorted(['0,12', '1,11', '2,12', '3,11', '4,12']));
    expect(s.terrain[H(3, 4)]).toBe('camp');
    // Marcius' Roman group starts in the top-left corner, Castus' Slave group in the bottom-left
    const corner = (side: Side, rowTest: (r: number) => boolean) => s.units.filter((u) => u.side === side && u.hex >= 0 && rowTest(rowOf(u.hex)) && u.hex - rowOf(u.hex) * COLS <= 2);
    expect(corner('bottom', (r) => r <= 1).map((u) => u.type).sort()).toEqual(['AX', 'MI', 'MI', 'MI']);
    expect(corner('top', (r) => r >= 6).map((u) => u.type).sort()).toEqual(['LC', 'MI', 'WA']);
    expect(s.leaders.find((l) => l.name === 'Marcius')?.hex).toBe(H(0, 2));
    expect(s.leaders.find((l) => l.name === 'Castus')?.hex).toBe(H(6, 1));
  });

  it('the Sabis (215), Stour (218) and Severn (223) are fordable; the Rhone (204) and the river of 222 are not', () => {
    const rivers = (id: string) => {
      const s = game(id);
      const hs = s.terrain.flatMap((t, h) => (t === 'river' ? [h] : []));
      return { n: hs.length, fordable: hs.filter((h) => s.fords[h]).length };
    };
    expect(rivers('215')).toEqual({ n: 15, fordable: 15 });
    expect(rivers('218')).toEqual({ n: 13, fordable: 13 });
    expect(rivers('223')).toEqual({ n: 15, fordable: 15 });
    expect(rivers('204')).toEqual({ n: 7, fordable: 0 });
    expect(rivers('222')).toEqual({ n: 9, fordable: 0 });
    // the Stour is the whole of row 0
    expect(sorted(hexesOf(game('218'), 'river'))).toEqual(sorted(cols(0, 0, 12)));
    for (const id of EXP2) expect([id, game(id).noCap.some(Boolean)]).toEqual([id, false]);
  });

  it('ramparts: the walls and corners of 208, 212, 214, 215, 221, 222 and 223 face the right way', () => {
    const FRONT = 'NE+NW';
    const expected: Record<string, Record<string, string>> = {
      '208': { '2,4': 'NE+NW+W', '2,5': FRONT, '2,6': FRONT, '2,7': FRONT, '2,8': FRONT, '3,3': 'NW+W' },
      '212': Object.fromEntries(cols(5, 3, 11).map((k) => [k, FRONT])),
      '214': { '6,10': FRONT, '6,11': FRONT },
      '215': { '7,4': FRONT },
      '221': {
        '5,3': 'NE+NW+W', '5,4': FRONT, '5,5': FRONT, '5,6': FRONT, '5,7': FRONT, '5,8': 'E+NE+NW',
        '6,3': 'NW+W', '7,2': 'NW+W', '8,2': 'NW+W', '6,9': 'E+NE', '7,9': 'E+NE', '8,10': 'E+NE',
      },
      '222': Object.fromEntries(cols(2, 4, 10).map((k) => [k, 'SE+SW'])),
      '223': { '2,4': 'SE+SW', '2,5': 'SE+SW', '3,1': 'SE+SW', '3,7': 'SE+SW', '3,8': 'SE+SW', '2,10': 'E+SE' },
    };
    for (const id of EXP2) expect([id, rampartsOf(game(id))], id).toEqual([id, expected[id] ?? {}]);
    for (const [id, want] of Object.entries(expected)) expect(MANIFEST_EXP2[id].terrain.ramparts.hexes, id).toBe(Object.keys(want).length);
  });

  it('222 and 223: German and Briton units hold every rampart', () => {
    for (const [id, side] of [['222', 'top'], ['223', 'top']] as const) {
      const s = game(id);
      const walls = s.terrain.flatMap((t, h) => (t === 'rampart' ? [h] : []));
      expect(walls.length).toBe(id === '222' ? 7 : 6);
      for (const h of walls) expect(s.units.find((u) => u.hex === h)?.side, `${id} rampart ${h}`).toBe(side);
    }
  });

  it('221 Teutoburger Wald P2: the Germans (top) stand in forest, the marsh is in three corners', () => {
    const s = game('221');
    expect(sorted(hexesOf(s, 'marsh'))).toEqual(sorted(['0,0', '1,0', '0,10', '0,11', '7,0', '7,1', '8,0', '8,1']));
    expect(s.units.filter((u) => u.side === 'top').every((u) => s.terrain[u.hex] === 'forest')).toBe(true);
    expect(s.leaders.filter((l) => l.side === 'bottom').map((l) => l.name)).toEqual(['Vala']);
  });

  it('first player: the Romans move first in 202-204, 209-211, 222 (War Council and Q11) and 223; the Barbarians elsewhere', () => {
    expect(EXP2.filter((id) => MANIFEST_EXP2[id].first === 'bottom')).toEqual(['202', '203', '204', '209', '210', '211', '222', '223']);
    expect(game('222').active).toBe('bottom');
  });

  it('the Tenth Legion (215 two HI, 217 one HI) and no other elites', () => {
    expect(EXP2.filter((id) => MANIFEST_EXP2[id].elites.length)).toEqual(['215', '217']);
    expect(MANIFEST_EXP2['215'].elites).toEqual([['bottom', 'tenthLegion', 'HI'], ['bottom', 'tenthLegion', 'HI']]);
    expect(MANIFEST_EXP2['217'].elites).toEqual([['bottom', 'tenthLegion', 'HI']]);
    const s = game('215');
    const labienus = s.leaders.find((l) => l.name === 'Labienus')!;
    expect(leaderUnit(s, labienus)?.elite).toBe('tenthLegion');
  });
});

describe('the manifest notices a changed battle', () => {
  it('the checksums do not depend on the order of the pieces in the file', () => {
    for (const id of EXP2) {
      const st = structuredClone(scenarioById(id).setup);
      st.units.reverse();
      st.leaders.reverse();
      st.terrain.reverse();
      const s = createGame(st, 1);
      expect([id, checksums(s), terrainTally(s)]).toEqual([id, MANIFEST_EXP2[id].checksum, MANIFEST_EXP2[id].terrain]);
    }
  });

  /** Build a copy of a battle's setup, change it, and return the tallies and checksums of the result. */
  function after(id: string, change: (st: ScenarioSetup, base: GameState) => boolean) {
    const base = game(id);
    const st = structuredClone(scenarioById(id).setup);
    if (!change(st, base)) return null;
    const s = createGame(st, 1);
    return { sums: checksums(s), tally: terrainTally(s), before: { sums: checksums(base), tally: terrainTally(base) } };
  }

  /** An empty plain hex, as [r, c]; `not` lists hexes to avoid. */
  const freeHex = (s: GameState, not: number[] = []): [number, number] => {
    const h = s.terrain.findIndex((t, i) => t === 'plain' && !not.includes(i) && !s.units.some((u) => u.hex === i) && !s.leaders.some((l) => l.hex === i));
    expect(h).toBeGreaterThanOrEqual(0);
    return [rowOf(h), h - rowOf(h) * COLS];
  };

  const done: Record<string, string[]> = {};
  const tried = (kind: string, id: string) => (done[kind] ??= []).push(id);

  it('moving a unit or a leader changes the piece checksum and nothing else; dropping an elite does too', () => {
    for (const id of EXP2) {
      const unit = after(id, (st, base) => {
        [st.units[0].r, st.units[0].c] = freeHex(base);
        return true;
      })!;
      expect(unit.sums.pieces, `${id}: unit moved`).not.toBe(unit.before.sums.pieces);
      expect([unit.sums.terrain, unit.tally], `${id}: unit moved`).toEqual([unit.before.sums.terrain, unit.before.tally]);
      tried('unit', id);

      const leader = after(id, (st, base) => {
        [st.leaders[0].r, st.leaders[0].c] = freeHex(base);
        return true;
      })!;
      expect(leader.sums.pieces, `${id}: leader moved`).not.toBe(leader.before.sums.pieces);
      expect([leader.sums.terrain, leader.tally], `${id}: leader moved`).toEqual([leader.before.sums.terrain, leader.before.tally]);
      tried('leader', id);

      const dropped = after(id, (st) => {
        const from = st.units.find((u) => u.elite);
        if (!from) return false;
        delete from.elite;
        return true;
      });
      if (dropped) {
        expect(dropped.sums.pieces, `${id}: elite dropped`).not.toBe(dropped.before.sums.pieces);
        expect([dropped.sums.terrain, dropped.tally], `${id}: elite dropped`).toEqual([dropped.before.sums.terrain, dropped.before.tally]);
        tried('dropped', id);
      }

      // a unit's legion is not a position, but a swapped side or type is
      const swapped = after(id, (st) => {
        const u = st.units.find((x) => x.type === 'AX');
        if (!u) return false;
        u.type = 'WA';
        return true;
      });
      if (swapped) {
        expect(swapped.sums.pieces, `${id}: unit type changed`).not.toBe(swapped.before.sums.pieces);
        tried('type', id);
      }
    }
    expect(done.unit).toHaveLength(23);
    expect(done.leader).toHaveLength(23);
    expect(done.dropped).toEqual(['215', '217']);
    expect(done.type!.length).toBeGreaterThanOrEqual(20);
  });

  it('flipping a river ford changes the river tally and the terrain checksum; so does a coast ford (217)', () => {
    for (const id of EXP2) {
      const r = after(id, (st) => {
        const t = st.terrain.find((x) => x.t === 'river');
        if (!t) return false;
        t.ford = t.ford ? false : true;
        return true;
      });
      if (!r) continue;
      expect(r.sums.terrain, `${id}: ford flipped`).not.toBe(r.before.sums.terrain);
      expect(r.tally.rivers, `${id}: ford flipped`).not.toEqual(r.before.tally.rivers);
      expect(r.tally.types, `${id}: ford flipped`).toEqual(r.before.tally.types);
      expect(r.sums.pieces, `${id}: ford flipped`).toBe(r.before.sums.pieces);
      tried('ford', id);
    }
    expect(done.ford).toEqual(['204', '215', '218', '222', '223']);
    // 217: a coast hex that is no longer a ford is plain sea again
    const coast = after('217', (st) => {
      st.terrain.find((x) => x.t === 'sea')!.ford = false;
      return true;
    })!;
    expect(coast.sums.terrain).not.toBe(coast.before.sums.terrain);
    expect(coast.tally.types).toEqual({ ...coast.before.tally.types, river: 10, sea: 1 });
    expect(coast.tally.rivers).toEqual({ ford: 10, blocked: 0, nocap: 0 });
  });

  it('moving a terrain hex keeps every count but changes the terrain checksum', () => {
    for (const id of EXP2) {
      const r = after(id, (st, base) => {
        const t = st.terrain[0];
        if (!t) return false;
        const old: [number, number] = [t.r, t.c];
        [t.r, t.c] = freeHex(base, st.terrain.map((x) => x.r * COLS + x.c));
        // an objective that names the hex follows it
        for (const o of st.objectives ?? []) for (const h of ('hexes' in o && o.hexes) || []) if (h[0] === old[0] && h[1] === old[1]) [h[0], h[1]] = [t.r, t.c];
        return true;
      });
      if (!r) continue;
      expect(r.sums.terrain, `${id}: terrain hex moved`).not.toBe(r.before.sums.terrain);
      expect(r.tally, `${id}: terrain hex moved`).toEqual(r.before.tally);
      tried('terrain', id);
    }
    // the battles on an all-plain map have no terrain hex to move
    const plain = EXP2.filter((id) => !done.terrain.includes(id));
    expect(plain).toEqual(['205', '207']);
    expect(plain).toEqual(EXP2.filter((id) => !Object.keys(MANIFEST_EXP2[id].terrain.types).length));
  });

  it('changing the type of a terrain hex changes the tally and the terrain checksum', () => {
    for (const id of EXP2) {
      const r = after(id, (st) => {
        const t = st.terrain.find((x) => ['hill', 'forest', 'marsh', 'broken'].includes(x.t));
        if (!t) return false;
        t.t = t.t === 'hill' ? 'forest' : 'hill';
        return true;
      });
      if (!r) continue;
      expect(r.sums.terrain, `${id}: terrain type changed`).not.toBe(r.before.sums.terrain);
      expect(r.tally.types, `${id}: terrain type changed`).not.toEqual(r.before.tally.types);
      tried('terrain type', id);
    }
    expect(done['terrain type']!.length).toBeGreaterThanOrEqual(15);
  });

  it('turning a rampart to face the other way keeps the edge count but changes the terrain checksum', () => {
    const MIRROR: Record<HexDir, HexDir> = { E: 'E', W: 'W', NE: 'SE', NW: 'SW', SE: 'NE', SW: 'NW' };
    const FACES: Record<Side, HexDir[]> = { top: ['NW', 'NE'], bottom: ['SW', 'SE'] };
    for (const id of EXP2) {
      const r = after(id, (st) => {
        const t = st.terrain.find((x) => x.t === 'rampart');
        if (!t) return false;
        const dirs = [...(t.faces ? FACES[t.faces] : []), ...(t.edges ?? [])];
        delete t.faces;
        t.edges = dirs.map((d) => MIRROR[d]);
        return true;
      });
      if (!r) continue;
      expect(r.sums.terrain, `${id}: rampart turned`).not.toBe(r.before.sums.terrain);
      expect(r.tally, `${id}: rampart turned`).toEqual(r.before.tally);
      tried('rampart', id);
    }
    expect(done.rampart).toEqual(EXP2.filter((id) => MANIFEST_EXP2[id].terrain.ramparts.hexes > 0));
    expect(done.rampart).toEqual(['208', '212', '214', '215', '221', '222', '223']);
  });
});
