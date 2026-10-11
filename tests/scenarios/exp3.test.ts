// The 19 Expansion #3 battles (301-319, The Roman Civil Wars): each setup builds and matches its manifest
// (tests/scenarios/manifest.ts), and the battle-specific data (legions, Caesar, objectives, city walls, impassable walls and
// towns, hills under camps and walls, steep slopes, commands, immobile units, reinforcements and forced placement, dice
// orders, hand growth, leader exits) reaches the game state as rules-reference §18 and §20 give it.
import { describe, expect, it } from 'vitest';
import {
  ALL_HEXES, COLS, ELITES, GameDriver, HEX_DIRS, OFF_BOARD, createGame, forbidsTerrain, hexId, isHill, isImpassable, isLoneLeader,
  leaderUnit, lineOfSight, neighbours, onBoard, randomAnswer, rowOf, steepSlope,
  type GameState, type HexDir, type ObjectiveDef, type ScenarioSetup, type Side, type UnitType,
} from '../../src/engine';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import { checksums, terrainTally } from './checksum';
import { MANIFEST, MANIFEST_EXP2, MANIFEST_EXP3 } from './manifest';

const H = (r: number, c: number) => hexId(r, c);
const EXP1 = Object.keys(MANIFEST).sort();
const EXP2 = Object.keys(MANIFEST_EXP2).sort();
const EXP3 = Object.keys(MANIFEST_EXP3).sort();
const SIDES: Side[] = ['top', 'bottom'];
const game = (id: string, seed = 1) => createGame(scenarioById(id).setup, seed);
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
const rc = (h: number) => `${rowOf(h)},${h - rowOf(h) * COLS}`;

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
    if (t === 'rampart') out[rc(h)] = [...edgesOf(s, h)].sort().join('+');
  });
  return out;
}

/** The hexes of a terrain type as sorted 'r,c' strings. */
function hexesOf(s: GameState, type: string): string[] {
  const out: string[] = [];
  s.terrain.forEach((t, h) => {
    if (t === type) out.push(rc(h));
  });
  return out.sort();
}

/** The hexes of a battle's terrain entries with art `art`, as sorted 'r,c' strings. */
const artOf = (id: string, art: string) => scenarioById(id).setup.terrain.filter((t) => t.art === art).map((t) => `${t.r},${t.c}`).sort();

/** The hexes with a hill under their camp or wall, as sorted 'r,c' strings. */
const hillUnderOf = (s: GameState) => ALL_HEXES.filter((h) => s.hillUnder[h]).map(rc).sort();

/** The unit on a hex, as [side, type], or undefined. */
const unitAt = (s: GameState, r: number, c: number) => {
  const u = s.units.find((x) => x.hex === H(r, c));
  return u && [u.side, u.type];
};

/** A union member without its `text` (Omit alone would flatten the union). */
type NoText<T> = T extends unknown ? Omit<T, 'text'> : never;

const cols = (r: number, a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => `${r},${a + i}`);
const sorted = (xs: string[]) => [...xs].sort();

describe('Expansion #3 battle list', () => {
  it('the 19 battles 301-319 follow the base, Expansion #1 and Expansion #2 battles; no id or name is used twice', () => {
    expect(EXP3).toEqual(range(301, 319));
    const BASE = range(1, 15).map((id) => id.padStart(3, '0'));
    expect(SCENARIOS.map((s) => s.id)).toEqual([...BASE, ...EXP1, ...EXP2, ...EXP3]);
    expect(SCENARIOS.filter((s) => s.expansion === 'exp3').map((s) => s.id)).toEqual(EXP3);
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
    expect(new Set(SCENARIOS.map((s) => s.name)).size).toBe(SCENARIOS.length);
    expect([...Object.keys(MANIFEST), ...Object.keys(MANIFEST_EXP2)].filter((id) => EXP3.includes(id))).toEqual([]);
  });

  it('every battle has a briefing, a hint, and special-rule text for its special data', () => {
    for (const id of EXP3) {
      const sc = scenarioById(id);
      expect(sc.blurb.length, id).toBeGreaterThan(80);
      expect(sc.difficultyHint.length, id).toBeGreaterThan(5);
      const st = sc.setup;
      const text = sc.specialText.join('\n');
      const special = st.rules.length || st.objectives?.length || st.legions || st.commands || st.handGrowth || st.ambush ||
        st.placeUnits || st.top.orders || st.terrain.some((t) => t.art || t.t === 'wall');
      if (special) expect(sc.specialText.length, `${id} has special rules`).toBeGreaterThan(0);
      // each special datum is explained
      const wants: [boolean, RegExp][] = [
        [st.legions?.top === 'marius' && st.legions.bottom === 'marius', /^Marian legions \(both armies\)/m],
        [st.legions?.top === 'julian' && st.legions.bottom === 'julian', /^Julian legions \(both armies\)/m],
        [!st.legions?.top && st.legions?.bottom === 'julian', /^Julian legions \((Roman|Caesar's) side only\)/m],
        [st.leaders.some((l) => l.traits?.includes('forcedMarch')), /^Caesar: /m],
        [st.terrain.some((t) => t.t === 'wall'), /^City walls: /m],
        [st.terrain.some((t) => t.art === 'wall'), /impassable and blocks line of sight/],
        [st.terrain.some((t) => t.art === 'town'), /impassable and blocks line of sight/],
        [st.terrain.some((t) => t.hill), /^Hills under camps and walls: /m],
        [st.rules.includes('steepSlopes'), /^Steep slopes: /m],
        [!!st.commands, /^Two Sertorian commands: /m],
        [st.rules.includes('commandFallback'), /orders 1 unit of that command instead/],
        [st.units.some((u) => u.immobile), /^Immobile recruits: /m],
        [!!st.ambush, /^Gallic reinforcements: /m],
        [!!st.placeUnits, /^Roman reinforcement: /m],
        [st.top.orders === 'dice', /^Dice orders: /m],
        [!!st.handGrowth, /^Hand growth: /m],
        [!!st.objectives?.some((o) => o.kind === 'capture' && !o.marker), /^Camp capture: /m],
        [!!st.objectives?.some((o) => o.kind === 'capture' && o.marker === 'ship'), /^Ship markers: /m],
        [!!st.objectives?.some((o) => o.kind === 'hold'), /hold 1 banner/],
        [!!st.objectives?.some((o) => o.kind === 'majority'), /^The hillock: /m],
        [!!st.objectives?.some((o) => o.kind === 'exit'), /^(Breakout|Escape of the horse): /m],
        [!!st.objectives?.some((o) => o.kind === 'exit' && o.leadersScore), /Leaders count too/],
        [st.terrain.some((t) => t.t === 'camp'), /^Fortified camps: /m],
        [st.terrain.some((t) => t.t === 'rampart'), /Ramparts shelter foot units/],
      ];
      wants.forEach(([has, re], i) => {
        if (has) expect(text, `${id} rule text ${i} ${re}`).toMatch(re);
      });
      // and nothing is explained that the battle does not have
      if (!st.legions) expect(text, id).not.toMatch(/legions \(/);
      if (!st.leaders.some((l) => l.traits?.length)) expect(text, id).not.toMatch(/^Caesar: /m);
      if (!st.objectives?.length) expect(text, id).not.toMatch(/banner, kept for good|hold 1 banner/);
      // the battle picker shows who moves first; as in Expansion #2 the texts leave it out
      expect(text, id).not.toMatch(/\bmoves? first\b/);
    }
  });

  it('the civil-war armies: grey Roman blocks on top, red at the bottom; 306-308 the Barbarians (green) on top, 316 the Pontic army (tan)', () => {
    for (const id of EXP3) {
      const m = MANIFEST_EXP3[id];
      const top = ['306', '307', '308'].includes(id) ? 'bar' : id === '316' ? 'eas' : 'gry';
      expect([id, m.blocks.top, m.blocks.bottom]).toEqual([id, top, 'rom']);
      expect([id, m.armies.bottom]).toEqual([id, Number(id) <= 308 ? 'Roman' : 'Caesarian']);
      expect([id, m.looks.bottom]).toEqual([id, Number(id) <= 302 ? 'sullan' : Number(id) <= 305 ? 'pompeian' : 'caesarian']);
    }
  });

  it('no battle uses a rule keyed on the army name "Roman" (Fright at First Sight, Tactical Flexibility, the Beneventum hand)', () => {
    for (const id of EXP3) {
      const st = scenarioById(id).setup;
      expect([id, st.rules.filter((r) => ['frightAtFirstSight', 'tacticalFlexibility', 'beneventumHand'].includes(r))]).toEqual([id, []]);
      expect([id, st.options]).toEqual([id, undefined]);
    }
  });

  it('legions (§20): Marius for both armies in 301-305; Julian for the Romans only in 306-308, 316, 317; for both elsewhere; none in 310', () => {
    const want = (id: string): ScenarioSetup['legions'] => {
      const n = Number(id);
      if (n <= 305) return { top: 'marius', bottom: 'marius' };
      if (n === 310) return undefined;
      if (n <= 308 || n === 316 || n === 317) return { bottom: 'julian' };
      return { top: 'julian', bottom: 'julian' };
    };
    for (const id of EXP3) {
      const st = scenarioById(id).setup;
      expect([id, st.legions]).toEqual([id, want(id)]);
      expect([id, MANIFEST_EXP3[id].legions]).toEqual([id, st.legions]);
      // every MI and HI of a legion side has it, on the board, in reserve and waiting to be placed; no other unit does
      const s = game(id);
      for (const u of [...s.units, ...s.special.reserveUnits, ...s.special.placeUnits.map((p) => p.unit)]) {
        const legion = st.legions?.[u.side] && (u.type === 'MI' || u.type === 'HI') ? st.legions[u.side] : undefined;
        expect([id, u.id, u.legion], `${id} ${u.side} ${u.type}`).toEqual([id, u.id, legion]);
      }
      // the rule has an effect: the side fields MI or HI
      for (const side of Object.keys(st.legions ?? {}) as Side[]) {
        expect(s.units.filter((u) => u.side === side && u.legion).length, `${id} ${side}`).toBeGreaterThan(0);
      }
    }
    // the non-Roman armies with legions (§18.2): the Samnite MI (301), the Sertorian MI and HI (302-305), the Numidian MI
    // and HI (312) and Juba's HI (318); the Helvetii, Germans, Gauls, the Pontic MI and HI and the Numidians of 317 have none
    const top = (id: string) => game(id).units.filter((u) => u.side === 'top' && u.legion).map((u) => u.type).sort();
    expect(top('301')).toEqual(['MI', 'MI']);
    expect(top('302')).toEqual(['HI', 'HI']);
    expect(top('312')).toEqual(['HI', 'MI']);
    expect(top('318')).toContain('HI');
    for (const id of ['306', '307', '308', '310', '316', '317']) expect([id, top(id)]).toEqual([id, []]);
    expect(MANIFEST_EXP3['316'].units.top).toMatchObject({ MI: 4, HI: 2 });
  });

  it('Caesar (§18.3): in 306-309 and 314-319, the Caesarian commander, with his close-combat die and forced march; no other leader has a trait', () => {
    const traits = EXP3.flatMap((id) => {
      const st = scenarioById(id).setup;
      return [...st.leaders, ...st.reserveLeaders].filter((l) => l.traits?.length).map((l) => [id, l.side, l.name, l.traits]);
    });
    const caesar = ['306', '307', '308', '309', '314', '315', '316', '317', '318', '319'];
    expect(traits).toEqual(caesar.map((id) => [id, 'bottom', 'Julius Caesar', ['ccBonus', 'forcedMarch']]));
    for (const id of caesar) {
      const s = game(id);
      const l = s.leaders.find((x) => x.name === 'Julius Caesar')!;
      expect(s.players.bottom.commander, id).toBe('Julius Caesar');
      expect(['HI', 'MI'], `${id}: Caesar rides with a legion`).toContain(leaderUnit(s, l)?.type);
      expect(leaderUnit(s, l)?.legion, id).toBe('julian');
    }
  });

  it('only 313 starts with lone leaders: Antony and Fufius, each alone in a camp', () => {
    const lone = EXP3.flatMap((id) => {
      const s = game(id);
      return s.leaders.filter((l) => l.hex >= 0 && isLoneLeader(s, l)).map((l) => [id, l.name, rc(l.hex), s.terrain[l.hex]]);
    });
    expect(lone).toEqual([['313', 'Antony', '6,3', 'camp'], ['313', 'Fufius', '6,9', 'camp']]);
  });

  it('only 308 starts with units and leaders off the board', () => {
    const off = EXP3.filter((id) => {
      const s = game(id);
      return s.special.reserveUnits.length || s.special.reserveLeaders.length || s.special.placeUnits.length;
    });
    expect(off).toEqual(['308']);
    expect(EXP3.filter((id) => MANIFEST_EXP3[id].reserves || MANIFEST_EXP3[id].placeUnits)).toEqual(['308']);
  });

  it('no elites (the "Legio X" labels of 306-308 are cosmetic, §18.2)', () => {
    for (const id of EXP3) expect([id, game(id).units.filter((u) => u.elite)]).toEqual([id, []]);
  });
});

for (const id of EXP3) {
  const m = MANIFEST_EXP3[id];
  describe(`${id} ${m.name}`, () => {
    it('header: name, year, armies, commanders, cards, blocks, looks, first player, banners, rules, no options', () => {
      const sc = scenarioById(id);
      expect([sc.name, sc.year, sc.expansion]).toEqual([m.name, m.year, 'exp3']);
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

    it('units per side and type, leaders, reserves, forced placements and elites', () => {
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
      expect(s.special.placeUnits.map((p) => [p.unit.side, p.unit.type])).toEqual(m.placeUnits ?? []);
      expect(s.units.filter((u) => u.elite).map((u) => [u.side, u.elite, u.type])).toEqual(m.elites);
    });

    it('pieces stand on passable hexes they may enter, one unit and at most one leader per hex, leaders only with their own units', () => {
      const s = game(id);
      const unitHexes = s.units.map((u) => u.hex);
      expect(new Set(unitHexes).size).toBe(unitHexes.length);
      for (const u of s.units) {
        expect(u.hex, u.id).toBeGreaterThanOrEqual(0);
        expect(isImpassable(s, u.hex), `${u.type} at ${rc(u.hex)} (${s.terrain[u.hex]})`).toBe(false);
        expect(forbidsTerrain(u.type, s.terrain[u.hex]), `${u.type} at ${rc(u.hex)} (${s.terrain[u.hex]})`).toBe(false);
        expect(u.blocks).toBe(u.maxBlocks);
      }
      for (const u of s.special.reserveUnits) expect(u.hex).toBe(OFF_BOARD);
      for (const l of s.special.reserveLeaders) expect(l.hex).toBe(OFF_BOARD);
      for (const p of s.special.placeUnits) expect(p.unit.hex).toBe(OFF_BOARD);
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
  const asc = (...hs: [number, number][]) => hs.map(([r, c]) => H(r, c)).sort((a, b) => a - b);
  const row = (r: number) => asc(...Array.from({ length: COLS }, (_, c): [number, number] => [r, c]));

  // rules-reference §18.4 and §20 (X3 Q6-Q8, Q10-Q12, Q14)
  const EXPECTED: Record<string, NoText<ObjectiveDef>[]> = {
    // the Romans only, at the start of their turn, each Samnite camp removed for 1 banner
    '301': [{ kind: 'capture', side: 'bottom', hexes: asc([0, 4], [0, 8]), when: 'turnStart', banners: [1], together: 0, remove: true }],
    // both sides over the enemy camps
    '306': [
      { kind: 'capture', side: 'bottom', hexes: asc([0, 4], [0, 6]), when: 'turnStart', banners: [1], together: 0, remove: true },
      { kind: 'capture', side: 'top', hexes: asc([8, 4], [8, 5]), when: 'turnStart', banners: [1], together: 0, remove: true },
    ],
    // the three Gallic camps 0, 1, 1; the Roman camp 1; the walls (Romans, up to 5) and the large-camp ramparts (Gauls, up to 3) held
    '308': [
      { kind: 'capture', side: 'bottom', hexes: asc([2, 5], [2, 7], [2, 9]), when: 'turnStart', banners: [0, 1, 1], together: 0, remove: true },
      { kind: 'capture', side: 'top', hexes: asc([7, 5]), when: 'turnStart', banners: [1], together: 0, remove: true },
      { kind: 'hold', side: 'bottom', hexes: asc([0, 5], [0, 6], [0, 7], [0, 8], [0, 9]), max: 5 },
      { kind: 'hold', side: 'top', hexes: asc([6, 12], [7, 11], [8, 11]), max: 3 },
    ],
    // each side over the two enemy camps, 0 then 1; the hillock for the Caesarians only, at once
    '309': [
      { kind: 'capture', side: 'bottom', hexes: asc([0, 3], [0, 4]), when: 'turnStart', banners: [0, 1], together: 0, remove: true },
      { kind: 'capture', side: 'top', hexes: asc([8, 3], [8, 4]), when: 'turnStart', banners: [0, 1], together: 0, remove: true },
      { kind: 'majority', sides: ['bottom'], hexes: asc([3, 4], [3, 5], [3, 6]), banners: 1, when: 'always' },
    ],
    // Pompeian cavalry off the left edge; the Pompeian camp held by the Caesarians
    '311': [
      { kind: 'exit', side: 'top', hexes: asc([4, 0], [5, 0]), units: 'cavalry', leadersScore: false },
      { kind: 'hold', side: 'bottom', hexes: asc([0, 5]), max: 1 },
    ],
    // ship markers: the Pompeians on the Caesarian transports, the Caesarians on the Pompeian beaches; nothing is removed
    '313': [
      { kind: 'capture', side: 'top', hexes: asc([0, 8], [0, 9], [0, 10], [0, 11]), when: 'turnStart', banners: [1], together: 0, remove: false, marker: 'ship' },
      { kind: 'capture', side: 'bottom', hexes: asc([0, 0], [0, 1], [0, 2], [0, 3]), when: 'turnStart', banners: [1], together: 0, remove: false, marker: 'ship' },
    ],
    // the Caesarian left-section baseline, any unit (the side edges do not count)
    '314': [{ kind: 'exit', side: 'top', hexes: asc([8, 0], [8, 1], [8, 2], [8, 3], [8, 4]), units: 'any', leadersScore: false }],
    '316': [
      { kind: 'capture', side: 'bottom', hexes: asc([0, 5], [0, 6], [0, 8]), when: 'turnStart', banners: [1], together: 0, remove: true },
      { kind: 'capture', side: 'top', hexes: asc([8, 5]), when: 'turnStart', banners: [1], together: 0, remove: true },
    ],
    // the whole Numidian baseline; leaders score too
    '317': [{ kind: 'exit', side: 'bottom', hexes: row(0), units: 'any', leadersScore: true }],
  };

  it('the objective battles, and the objectives of each, are the ones the rulings give', () => {
    expect(EXP3.filter((id) => game(id).special.objectives.length)).toEqual(Object.keys(EXPECTED));
    for (const [id, want] of Object.entries(EXPECTED)) expect(objectivesOf(id), id).toEqual(want);
  });

  it('objective hexes are on the board, with the terrain their kind needs', () => {
    for (const id of EXP3) {
      const s = game(id);
      for (const o of scenarioById(id).setup.objectives ?? []) {
        if (o.kind === 'sectionClear') continue;
        expect(o.hexes?.length, `${id} ${o.kind} hexes`).toBeGreaterThan(0);
        for (const [r, c] of o.hexes ?? []) {
          const where = `${id} ${o.kind} ${r},${c}`;
          expect(onBoard(r, c), `${where} on the board`).toBe(true);
          const h = H(r, c);
          const t = s.terrain[h];
          // camps; ship markers lie on the coast played as a ford
          if (o.kind === 'capture' && o.marker === 'ship') expect([t, s.fords[h], isImpassable(s, h)], where).toEqual(['river', true, false]);
          else if (o.kind === 'capture') expect(t, where).toBe('camp');
          // camps, ramparts and city walls
          if (o.kind === 'hold') expect(['camp', 'rampart', 'wall'], `${where} is ${t}`).toContain(t);
          if (o.kind === 'majority') expect(isHill(s, h), where).toBe(true);
          if (o.kind === 'exit') {
            expect(isImpassable(s, h), where).toBe(false);
            // a board edge: the enemy baseline (314, 317) or the left edge (311)
            if (id === '311') expect(c, where).toBe(0);
            else expect(r, where).toBe(o.side === 'top' ? 8 : 0);
          }
        }
      }
    }
  });

  it('no hex is named twice; the capture battles have exactly the camps they capture, and 308 one more of its own', () => {
    for (const id of EXP3) {
      const named = (scenarioById(id).setup.objectives ?? [])
        .filter((o) => o.kind !== 'sectionClear')
        .flatMap((o) => (o.hexes ?? []).map(([r, c]) => H(r, c)));
      expect(new Set(named).size, `${id}: a hex named by two objectives, or twice by one`).toBe(named.length);
    }
    const camps = (id: string) => hexesOf(game(id), 'camp');
    expect(camps('301')).toEqual(['0,4', '0,8']);
    expect(camps('306')).toEqual(sorted(['0,4', '0,6', '8,4', '8,5']));
    expect(camps('308')).toEqual(sorted(['2,5', '2,7', '2,9', '7,5']));
    expect(camps('309')).toEqual(sorted(['0,3', '0,4', '8,3', '8,4']));
    expect(camps('311')).toEqual(['0,5']);
    expect(camps('316')).toEqual(sorted(['0,5', '0,6', '0,8', '8,5']));
    // 313's four camps score nothing (§20); Antony and Fufius start alone in two of them
    expect(camps('313')).toEqual(sorted(['6,3', '6,5', '6,7', '6,9']));
    // the camps a side must take first hold units: 306 the immobile recruits, 308 a Gallic warrior on each camp
    expect([unitAt(game('306'), 8, 4), unitAt(game('306'), 8, 5)]).toEqual([['bottom', 'AX'], ['bottom', 'AX']]);
    expect(['2,5', '2,7', '2,9'].map((k) => unitAt(game('308'), ...(k.split(',').map(Number) as [number, number])))).toEqual([
      ['top', 'WA'], ['top', 'WA'], ['top', 'WA'],
    ]);
  });

  it('every objective of a battle has its own log text (no default wording)', () => {
    for (const id of Object.keys(EXPECTED)) {
      for (const o of scenarioById(id).setup.objectives ?? []) expect(o.text?.length, `${id} ${o.kind}`).toBeGreaterThan(5);
    }
  });
});

describe('terrain of the new battles (§18.7, §20)', () => {
  it('301 Colline Gate: the Wall of Rome, ten impassable hexes with wall art along row 7, and the gate held by a Roman MI and AX', () => {
    const s = game('301');
    const wall = sorted([...cols(7, 0, 3), ...cols(7, 6, 11)]);
    expect(hexesOf(s, 'steep')).toEqual(wall);
    expect(artOf('301', 'wall')).toEqual(wall);
    for (const k of wall) expect(isImpassable(s, H(...(k.split(',').map(Number) as [number, number]))), k).toBe(true);
    expect([unitAt(s, 7, 4), unitAt(s, 7, 5)]).toEqual([['bottom', 'MI'], ['bottom', 'AX']]);
    // it blocks line of sight; Sulla's MC stands behind it
    expect(lineOfSight(s, H(6, 1), H(8, 1))).toBe(false);
    expect(unitAt(s, 8, 5)).toEqual(['bottom', 'MC']);
    expect(s.leaders.find((l) => l.name === 'Sulla')?.hex).toBe(H(8, 5));
  });

  it('303 Lauron and 304 Valentia: four-hex impassable towns (steep with town art)', () => {
    const towns: Record<string, string[]> = { '303': ['2,3', '2,4', '3,2', '3,3'], '304': ['3,7', '3,8', '4,7', '4,8'] };
    for (const [id, want] of Object.entries(towns)) {
      const s = game(id);
      expect(hexesOf(s, 'steep'), id).toEqual(want);
      expect(artOf(id, 'town'), id).toEqual(want);
    }
    // Herennius' force: two WA, LI, two AX and Herennius, on the hills of the bottom-right corner (ordinary units, X3 Q17)
    const s = game('303');
    expect(hexesOf(s, 'hill')).toEqual(sorted(['3,6', '6,10', '6,11', '6,12', '7,9', '7,10', '7,11', '8,9', '8,10', '8,11']));
    const force = s.units.filter((u) => u.side === 'top' && rowOf(u.hex) >= 6);
    expect(force.map((u) => u.type).sort()).toEqual(['AX', 'AX', 'LI', 'WA', 'WA']);
    for (const u of force) expect(s.terrain[u.hex], rc(u.hex)).toBe('hill');
    expect(s.leaders.find((l) => l.name === 'Herennius')?.hex).toBe(H(8, 10));
  });

  it('art hints: wall art only on 301, town art only on 303 and 304, each on a steep hex; no other hint', () => {
    for (const id of EXP3) {
      for (const t of scenarioById(id).setup.terrain.filter((x) => x.art !== undefined)) {
        expect([id, t.t, t.art], `${t.r},${t.c}`).toEqual([id, 'steep', id === '301' ? 'wall' : 'town']);
        expect(['301', '303', '304']).toContain(id);
      }
    }
  });

  it('308 Gergovia: city walls on a hill, Gallic camps on hills, the hill mass and its woods, broken ground, the large Roman camp', () => {
    const s = game('308');
    expect(hexesOf(s, 'wall')).toEqual(cols(0, 5, 9));
    expect(hexesOf(s, 'camp')).toEqual(sorted(['2,5', '2,7', '2,9', '7,5']));
    expect(hillUnderOf(s)).toEqual(sorted([...cols(0, 5, 9), '2,5', '2,7', '2,9']));
    for (const k of ['0,5', '2,9']) expect(isHill(s, H(...(k.split(',').map(Number) as [number, number]))), k).toBe(true);
    expect(isHill(s, H(7, 5)), 'the small Roman camp is on open ground').toBe(false);
    expect(hexesOf(s, 'hill')).toEqual(sorted(['0,4', ...cols(1, 4, 9), '2,4', '2,6', '2,8', ...cols(3, 3, 9), '4,0', '5,0', '6,0']));
    expect(hexesOf(s, 'forest')).toEqual(sorted(['0,3', '1,3', '2,0', '2,1', '2,3', '0,10', '1,10', '2,10', '2,12', '3,11']));
    expect(hexesOf(s, 'broken')).toEqual(cols(5, 3, 7));
    expect(rampartsOf(s)).toEqual({ '6,12': 'NW+W', '7,11': 'NW+W', '8,11': 'NW+W' });
    // two Gallic bowmen on the walls; the Roman HWM, LI, HWM on the ramparts
    expect(cols(0, 5, 9).map((k) => unitAt(s, 0, Number(k.split(',')[1])))).toEqual([undefined, ['top', 'LB'], undefined, ['top', 'LB'], undefined]);
    expect([unitAt(s, 6, 12), unitAt(s, 7, 11), unitAt(s, 8, 11)]).toEqual([['bottom', 'HWM'], ['bottom', 'LI'], ['bottom', 'HWM']]);
  });

  it('308 Gergovia: steep slopes (rule steepSlopes) on exactly the twelve hill-forest hexsides; only 308 has the rule', () => {
    expect(EXP3.filter((id) => scenarioById(id).setup.rules.includes('steepSlopes'))).toEqual(['308']);
    const s = game('308');
    const sides = ALL_HEXES.flatMap((a) => neighbours(a).filter((b) => a < b && steepSlope(s, a, b)).map((b) => [rc(a), rc(b)].sort().join(' ')));
    expect(sides.sort()).toEqual([
      '0,3 0,4', '0,4 1,3', '1,3 1,4', '1,3 2,4', '2,3 2,4', '2,3 3,3',
      '0,10 0,9', '0,10 1,9', '1,10 1,9', '1,9 2,10', '2,10 2,9', '2,10 3,9',
    ].sort());
  });

  it('309 Ilerda: three scalable walls (no hill) with a Pompeian LB and AX, the town hex behind them, the impassable river, the hillock', () => {
    const s = game('309');
    expect(hexesOf(s, 'wall')).toEqual(sorted(['0,10', '1,9', '2,10']));
    expect(hillUnderOf(s)).toEqual([]);
    expect([unitAt(s, 0, 10), unitAt(s, 1, 9), unitAt(s, 2, 10)]).toEqual([undefined, ['top', 'LB'], ['top', 'AX']]);
    expect(s.terrain[H(1, 10)]).toBe('plain');
    expect(hexesOf(s, 'river')).toEqual(sorted([...['0,11', '1,11', '2,11', '3,11', '4,11'], '5,10', '6,10', '7,10', '8,10']));
    for (const k of hexesOf(s, 'river')) expect(s.fords[H(...(k.split(',').map(Number) as [number, number]))], k).toBe(false);
    expect(hexesOf(s, 'hill')).toEqual(sorted(['3,4', '3,5', '3,6', '3,10', '4,10', '5,9']));
  });

  it('city walls only in 308 and 309, hills under camps and walls only in 308; no mounted unit or war machine stands on a wall', () => {
    expect(EXP3.filter((id) => hexesOf(game(id), 'wall').length)).toEqual(['308', '309']);
    expect(EXP3.filter((id) => hillUnderOf(game(id)).length)).toEqual(['308']);
    for (const id of ['308', '309']) {
      const s = game(id);
      for (const u of s.units.filter((x) => s.terrain[x.hex] === 'wall')) expect(['LI', 'LB', 'LS', 'AX', 'WA', 'MI', 'HI'], `${id} ${u.type}`).toContain(u.type);
    }
  });

  it('302 Baetis River: eleven fordable river hexes with two Sertorian LI in them, four forest hexes', () => {
    const s = game('302');
    const river = sorted(['0,6', '1,5', '2,5', '2,4', '2,3', '3,2', '4,2', '5,2', '6,2', '7,1', '7,0']);
    expect(hexesOf(s, 'river')).toEqual(river);
    for (const k of river) expect(s.fords[H(...(k.split(',').map(Number) as [number, number]))], k).toBe(true);
    expect([unitAt(s, 2, 4), unitAt(s, 2, 5)]).toEqual([['top', 'LI'], ['top', 'LI']]);
    expect(s.units.filter((u) => s.terrain[u.hex] === 'river')).toHaveLength(2);
    expect(hexesOf(s, 'forest')).toEqual(sorted(['1,4', '4,3', '6,1', '7,2']));
  });

  it('305, 306, 311, 312, 319: the hills; 306 also its five forest hexes', () => {
    expect(hexesOf(game('305'), 'hill')).toEqual(sorted(['0,2', '0,3', '1,0', '1,1', '2,0', '2,1', '2,2', '0,11', '0,12', '1,11', '2,12']));
    expect(hexesOf(game('306'), 'hill')).toEqual(sorted([...cols(6, 2, 4), ...cols(6, 6, 10), ...cols(7, 2, 9), '8,2', '8,6', '8,9', '8,11', '8,12']));
    expect(hexesOf(game('306'), 'forest')).toEqual(sorted(['2,0', '3,0', '2,10', '3,10', '4,11']));
    expect(hexesOf(game('311'), 'hill')).toEqual(sorted([...cols(3, 0, 6), ...cols(6, 0, 10), '1,8', '1,11', '2,7', '2,8', '2,11', '5,10']));
    expect(hexesOf(game('312'), 'hill')).toEqual(sorted(['2,11', '3,10', '3,11']));
    expect(hexesOf(game('319'), 'hill')).toEqual(sorted([...cols(1, 1, 10), '2,1', '2,2', ...cols(2, 4, 10)]));
    // 307 and 317 are bare plain
    for (const id of ['307', '317']) expect([id, game(id).terrain.filter((t) => t !== 'plain' && t !== 'void')]).toEqual([id, []]);
  });

  it('310 Utica P1: the impassable river of eight hexes and three hills on the left', () => {
    const s = game('310');
    expect(hexesOf(s, 'river')).toEqual(sorted(['0,9', '1,9', '2,10', '2,11', '3,11', '4,11', '5,11', '6,12']));
    expect(s.terrain.some((t, h) => t === 'river' && s.fords[h])).toBe(false);
    expect(hexesOf(s, 'hill')).toEqual(sorted(['2,2', '3,2', '5,1']));
  });

  it('313 Brindisi Raid: the coast played as a ford, the Brindisi ramparts and their garrison, a row of hills, four camps', () => {
    const st = scenarioById('313').setup;
    const coast = sorted([...cols(0, 0, 3), ...cols(0, 8, 11)]);
    expect(st.terrain.filter((t) => t.t === 'sea').map((t) => [`${t.r},${t.c}`, t.ford]).sort()).toEqual(coast.map((k) => [k, true]));
    const s = game('313');
    expect(hexesOf(s, 'river')).toEqual(coast);
    for (const k of coast) expect(s.fords[H(...(k.split(',').map(Number) as [number, number]))], k).toBe(true);
    expect(hexesOf(s, 'sea')).toEqual([]);
    expect(rampartsOf(s)).toEqual({
      '0,6': 'SW+W', '1,6': 'SW+W', '2,7': 'SE+SW+W', '2,8': 'SE+SW', '2,9': 'SE+SW', '2,10': 'SE+SW', '2,11': 'SE+SW', '2,12': 'SE+SW',
    });
    // the garrison on the ramparts: three LI and an AX, all Caesarian
    const garrison = s.units.filter((u) => s.terrain[u.hex] === 'rampart');
    expect(garrison.map((u) => [rc(u.hex), u.side, u.type]).sort()).toEqual([
      ['0,6', 'bottom', 'LI'], ['2,11', 'bottom', 'LI'], ['2,7', 'bottom', 'AX'], ['2,9', 'bottom', 'LI'],
    ]);
    expect(hexesOf(s, 'hill')).toEqual(sorted(cols(5, 0, 11)));
  });

  it('314 Dyrrhachium: Caesar\'s line of ten ramparts facing the Pompeians, three gaps on the left; nine hills', () => {
    const s = game('314');
    expect(rampartsOf(s)).toEqual(Object.fromEntries(['4,1', '4,3', ...cols(4, 5, 12)].map((k) => [k, 'NE+NW'])));
    expect(['4,0', '4,2', '4,4'].map((k) => s.terrain[H(...(k.split(',').map(Number) as [number, number]))])).toEqual(['plain', 'plain', 'plain']);
    expect(hexesOf(s, 'hill')).toEqual(sorted([...cols(7, 8, 11), ...cols(8, 8, 12)]));
  });

  it('315 Pharsalus and 318 Thapsus: impassable hills, a marsh, the sea (impassable, clear sight) and the marsh band', () => {
    const p = game('315');
    expect(hexesOf(p, 'steep')).toEqual(sorted(['0,6', '0,9', '0,10', '0,11', '0,12', '1,10', '1,11']));
    expect(hexesOf(p, 'marsh')).toEqual(['4,0']);
    expect(scenarioById('315').setup.terrain.some((t) => t.art)).toBe(false);
    const t = game('318');
    const sea = sorted(['2,12', '3,11', '4,12', '5,11', '6,12', '7,11', '8,12']);
    expect(hexesOf(t, 'sea')).toEqual(sea);
    for (const k of sea) expect(isImpassable(t, H(...(k.split(',').map(Number) as [number, number]))), k).toBe(true);
    expect(hexesOf(t, 'marsh')).toEqual(sorted(['1,1', '2,0', '2,1', '3,1', '4,1', '4,2', '5,1', '6,0', '6,1']));
    expect(t.units.filter((u) => u.type === 'EL').map((u) => [u.side, rc(u.hex)])).toEqual([['top', '2,2'], ['top', '3,9']]);
  });

  it('ramparts: only 308, 313 and 314 have any', () => {
    expect(EXP3.filter((id) => Object.keys(rampartsOf(game(id))).length)).toEqual(['308', '313', '314']);
    expect(EXP3.filter((id) => MANIFEST_EXP3[id].terrain.ramparts.hexes > 0)).toEqual(['308', '313', '314']);
  });
});

describe('the battle rules (§18.5, §18.8-§18.11)', () => {
  it('304 Valentia: Herennius\' and Perpenna\'s commands; every Sertorian unit and both leaders in one; the Romans in none', () => {
    expect(EXP3.filter((id) => scenarioById(id).setup.commands)).toEqual(['304']);
    const st = scenarioById('304').setup;
    expect(st.commands).toEqual([
      { id: 'herennius', name: 'Herennius', side: 'top' },
      { id: 'perpenna', name: 'Perpenna', side: 'top', blocks: 'grk' },
    ]);
    const s = game('304');
    const count = (cmd: string) => s.units.filter((u) => u.command === cmd).map((u) => u.type).sort();
    expect(count('herennius')).toEqual(['AX', 'AX', 'AX', 'LB', 'LS', 'LS', 'MC', 'MI', 'MI', 'MI']);
    expect(count('perpenna')).toEqual(['LC', 'MI', 'MI', 'MI', 'MI']);
    expect(s.units.filter((u) => u.side === 'top' && !u.command)).toEqual([]);
    expect(s.units.filter((u) => u.side === 'bottom' && u.command)).toEqual([]);
    expect(s.leaders.map((l) => [l.side, l.name, l.command])).toEqual([
      ['top', 'Perpenna', 'perpenna'], ['top', 'Herennius', 'herennius'],
      ['bottom', 'Memmius', undefined], ['bottom', 'Pompey', undefined], ['bottom', 'Afranius', undefined],
    ]);
    // each leader stands with a unit of his own command; Perpenna's light-blue command is on the Sertorian left (board right)
    for (const l of s.leaders.filter((x) => x.side === 'top')) expect(leaderUnit(s, l)?.command, l.name).toBe(l.command);
    for (const u of s.units.filter((x) => x.command === 'perpenna')) expect(u.hex - rowOf(u.hex) * COLS, rc(u.hex)).toBeGreaterThanOrEqual(9);
  });

  it('306 Bibracte: the two Roman AX in the Roman camps are immobile; no other unit of any battle is', () => {
    const immobile = EXP3.flatMap((id) => game(id).units.filter((u) => u.immobile).map((u) => [id, u.side, u.type, rc(u.hex)]));
    expect(immobile).toEqual([['306', 'bottom', 'AX', '8,4'], ['306', 'bottom', 'AX', '8,5']]);
    const s = game('306');
    for (const u of s.units.filter((x) => x.immobile)) expect(s.terrain[u.hex]).toBe('camp');
  });

  it('308 Gergovia: the Gallic reinforcements enter on (3,0)-(7,0) on any Leadership card from the first turn, with Vercingetorix; the Roman MI follows', () => {
    expect(EXP3.filter((id) => scenarioById(id).setup.ambush)).toEqual(['308']);
    expect(EXP3.filter((id) => scenarioById(id).setup.placeUnits)).toEqual(['308']);
    const st = scenarioById('308').setup;
    expect(st.rules).toEqual(['magoAmbush', 'steepSlopes']);
    const entry: [number, number][] = [[3, 0], [4, 0], [5, 0], [6, 0], [7, 0]];
    expect(st.ambush).toEqual({
      trigger: ['inspiredL', 'inspiredC', 'inspiredR', 'leadershipAny'], afterOwnTurns: 0, entryHexes: entry, noMove: true, attachLeader: true,
      text: expect.not.stringContaining('{section}'),
    });
    const s = game('308');
    expect(s.special.ambush).toMatchObject({ afterOwnTurns: 0, entryHexes: entry.map(([r, c]) => H(r, c)), noMove: true, attachLeader: true });
    expect(s.special.reserveSide).toBe('top');
    // the entry hexes are empty at the start; G2-G4 are hills, G1 and G5 plain
    for (const [r, c] of entry) expect([r, c, s.units.some((u) => u.hex === H(r, c)), s.leaders.some((l) => l.hex === H(r, c))]).toEqual([r, c, false, false]);
    expect(entry.map(([r, c]) => s.terrain[H(r, c)])).toEqual(['plain', 'hill', 'hill', 'hill', 'plain']);
    // the Roman MI: placed on an empty hex of the left baseline (8,4 on the section line counts), once the Gauls have entered
    const left: [number, number][] = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4]];
    expect(st.placeUnits).toEqual([{ side: 'bottom', type: 'MI', hexes: left, after: 'ambush' }]);
    expect(s.special.placeUnits.map((p) => [p.unit.side, p.unit.type, p.unit.legion, p.hexes, p.after])).toEqual([
      ['bottom', 'MI', 'julian', left.map(([r, c]) => H(r, c)), 'ambush'],
    ]);
    expect(s.special.reserveEntered).toBe(false);
  });

  it('310 Utica P1: the Numidians hold no cards and roll 2 order dice; the Caesarians hold 6 and move first; no other battle orders by dice', () => {
    expect(EXP3.filter((id) => scenarioById(id).setup.top.orders || scenarioById(id).setup.bottom.orders)).toEqual(['310']);
    const st = scenarioById('310').setup;
    expect(st.top).toMatchObject({ army: 'Numidian', cards: 0, orders: 'dice', orderDice: 2 });
    expect([st.bottom.orders, st.bottom.orderDice, st.legions]).toEqual([undefined, undefined, undefined]);
    const s = game('310');
    expect(s.special.orderDice).toEqual({ top: 2, bottom: 0 });
    expect([s.players.top.hand, s.players.top.command, s.players.bottom.hand.length, s.active]).toEqual([[], 0, 6, 'bottom']);
    // Saburra, the leader a helmet orders
    expect(s.leaders.filter((l) => l.side === 'top').map((l) => l.name)).toEqual(['Saburra']);
  });

  it('313 Brindisi Raid: the Caesarian hand starts at 2 and grows to 5; no other battle has hand growth', () => {
    expect(EXP3.filter((id) => scenarioById(id).setup.handGrowth)).toEqual(['313']);
    expect(scenarioById('313').setup.handGrowth).toEqual({ side: 'bottom', to: 5 });
    const s = game('313');
    expect(s.special.handGrowth).toEqual({ side: 'bottom', to: 5 });
    expect([s.players.bottom.command, s.players.bottom.hand.length, s.players.top.command]).toEqual([2, 2, 5]);
  });

  it('317 Ruspina: leaders score when they leave over the Numidian baseline; no other exit lets them', () => {
    const scoring = EXP3.filter((id) => (scenarioById(id).setup.objectives ?? []).some((o) => o.kind === 'exit' && o.leadersScore));
    expect(scoring).toEqual(['317']);
    // the Caesarians start in a compact block in the centre
    const s = game('317');
    for (const u of s.units.filter((x) => x.side === 'bottom')) expect(rowOf(u.hex), rc(u.hex)).toBeGreaterThanOrEqual(4);
    expect(s.leaders.filter((l) => l.side === 'bottom').map((l) => l.name)).toEqual(['Saserna', 'Julius Caesar']);
  });

  it('315 Pharsalus: three Caesarian leaders (§20), and the red warrior stands alone behind Caesar', () => {
    const s = game('315');
    expect(s.leaders.filter((l) => l.side === 'bottom').map((l) => l.name).sort()).toEqual(['Antony', 'Calvinus', 'Julius Caesar']);
    const wa = s.units.find((u) => u.side === 'bottom' && u.type === 'WA')!;
    const caesar = s.leaders.find((l) => l.name === 'Julius Caesar')!;
    expect(neighbours(caesar.hex)).toContain(wa.hex);
    expect(rowOf(wa.hex)).toBeGreaterThan(rowOf(caesar.hex));
  });

  it('first player (§20): the Romans or Caesarians move first in 304, 305, 307, 308, 310 and 319; the top army elsewhere', () => {
    expect(EXP3.filter((id) => MANIFEST_EXP3[id].first === 'bottom')).toEqual(['304', '305', '307', '308', '310', '319']);
    for (const id of EXP3) expect([id, game(id).active]).toEqual([id, MANIFEST_EXP3[id].first]);
  });
});

describe('every battle plays', () => {
  for (const id of EXP3) {
    it(`${id} ${MANIFEST_EXP3[id].name}: 60 random legal answers from two seeds, without an error`, () => {
      for (const seed of [3, 301 + Number(id)]) {
        const d = new GameDriver(game(id, seed));
        let rnd = seed * 48271;
        const next = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
        for (let step = 0; step < 60 && !d.over; step++) {
          const dec = d.pending!;
          const a = randomAnswer(d.state, dec, next);
          expect(d.answer(a), `${id} seed ${seed} step ${step}: ${d.lastError} for ${JSON.stringify(dec)} -> ${JSON.stringify(a)}`).toBe(true);
        }
        const hexes = d.state.units.filter((u) => u.hex >= 0).map((u) => u.hex);
        expect(new Set(hexes).size).toBe(hexes.length);
      }
    });
  }
});

describe('the manifest notices a changed battle', () => {
  it('the checksums do not depend on the order of the pieces in the file', () => {
    for (const id of EXP3) {
      const st = structuredClone(scenarioById(id).setup);
      st.units.reverse();
      st.leaders.reverse();
      st.terrain.reverse();
      const s = createGame(st, 1);
      expect([id, checksums(s), terrainTally(s)]).toEqual([id, MANIFEST_EXP3[id].checksum, MANIFEST_EXP3[id].terrain]);
    }
  });

  it('a moved unit or leader changes the piece checksum, and only it', () => {
    for (const id of EXP3) {
      const base = game(id);
      const free = base.terrain.findIndex((t, h) => t === 'plain' && !base.units.some((u) => u.hex === h) && !base.leaders.some((l) => l.hex === h));
      for (const kind of ['units', 'leaders'] as const) {
        const st = structuredClone(scenarioById(id).setup);
        [st[kind][0].r, st[kind][0].c] = [rowOf(free), free - rowOf(free) * COLS];
        const s = createGame(st, 1);
        expect(checksums(s).pieces, `${id} ${kind}`).not.toBe(MANIFEST_EXP3[id].checksum.pieces);
        expect([checksums(s).terrain, terrainTally(s)], `${id} ${kind}`).toEqual([MANIFEST_EXP3[id].checksum.terrain, MANIFEST_EXP3[id].terrain]);
      }
    }
  });

  it('a hill taken from under a camp or wall (308) changes the terrain checksum but no count', () => {
    for (const pick of ['camp', 'wall'] as const) {
      const st = structuredClone(scenarioById('308').setup);
      delete st.terrain.find((t) => t.t === pick && t.hill)!.hill;
      const s = createGame(st, 1);
      expect(checksums(s).terrain, pick).not.toBe(MANIFEST_EXP3['308'].checksum.terrain);
      expect(terrainTally(s), pick).toEqual(MANIFEST_EXP3['308'].terrain);
    }
  });

  it('turning a rampart to face the other way keeps the edge count but changes the terrain checksum', () => {
    const MIRROR: Record<HexDir, HexDir> = { E: 'E', W: 'W', NE: 'SE', NW: 'SW', SE: 'NE', SW: 'NW' };
    const FACES: Record<Side, HexDir[]> = { top: ['NW', 'NE'], bottom: ['SW', 'SE'] };
    for (const id of ['308', '313', '314']) {
      const st = structuredClone(scenarioById(id).setup);
      const t = st.terrain.find((x) => x.t === 'rampart')!;
      const dirs = [...(t.faces ? FACES[t.faces] : []), ...(t.edges ?? [])];
      delete t.faces;
      t.edges = dirs.map((d) => MIRROR[d]);
      const s = createGame(st, 1);
      expect(checksums(s).terrain, id).not.toBe(MANIFEST_EXP3[id].checksum.terrain);
      expect(terrainTally(s), id).toEqual(MANIFEST_EXP3[id].terrain);
    }
  });
});
