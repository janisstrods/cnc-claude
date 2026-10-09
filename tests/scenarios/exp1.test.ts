// The 24 Expansion #1 battles (101-124): each setup builds and matches its manifest (tests/scenarios/manifest.ts), and
// the battle-specific data (ramparts, fords, camp objective, leader placement, optional rules) reaches the game state.
import { describe, expect, it } from 'vitest';
import {
  ELITES, GameDriver, HEX_DIRS, OFF_BOARD, createGame, hexId, isImpassable, isLoneLeader, leaderUnit, rowOf,
  type GameState, type HexDir, type Side, type UnitType,
} from '../../src/engine';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import { MANIFEST } from './manifest';

const H = (r: number, c: number) => hexId(r, c);
const EXP1 = Object.keys(MANIFEST).sort();
const BASE = ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '014', '015'];
const SIDES: Side[] = ['top', 'bottom'];
const game = (id: string, seed = 1) => createGame(scenarioById(id).setup, seed);

function unitCounts(s: GameState, side: Side): Partial<Record<UnitType, number>> {
  const n: Partial<Record<UnitType, number>> = {};
  for (const u of s.units) if (u.side === side) n[u.type] = (n[u.type] ?? 0) + 1;
  return n;
}

/** Protected hexsides of a rampart hex, by direction. */
const edgesOf = (s: GameState, h: number): HexDir[] => HEX_DIRS.filter((_, i) => s.rampart[h] & (1 << i));

describe('Expansion #1 battle list', () => {
  it('the 24 battles 101-124 follow the 15 base battles', () => {
    expect(EXP1).toEqual(Array.from({ length: 24 }, (_, i) => String(101 + i)));
    expect(SCENARIOS.map((s) => s.id)).toEqual([...BASE, ...EXP1]);
    expect(SCENARIOS.filter((s) => s.expansion === 'base').map((s) => s.id)).toEqual(BASE);
    expect(SCENARIOS.filter((s) => s.expansion === 'exp1').map((s) => s.id)).toEqual(EXP1);
  });

  it('every battle has a briefing and a hint', () => {
    for (const s of SCENARIOS) {
      expect(s.blurb.length, s.id).toBeGreaterThan(80);
      expect(s.difficultyHint.length, s.id).toBeGreaterThan(5);
    }
  });

  it('every Roman army is named exactly "Roman" (the rules key on it)', () => {
    for (const s of SCENARIOS) {
      for (const side of SIDES) {
        const a = s.setup[side];
        if (a.blocks === 'rom' || a.look === 'roman') expect([s.id, a.army]).toEqual([s.id, 'Roman']);
      }
    }
    expect(EXP1.filter((id) => SIDES.some((sd) => MANIFEST[id].armies[sd] === 'Roman'))).toEqual(['116', '117', '118', '120', '121', '124']);
  });

  it('only Alexander (107-111) and the Granicus satraps have leader traits', () => {
    const traits = EXP1.flatMap((id) => {
      const st = scenarioById(id).setup;
      return [...st.leaders, ...(st.placeLeaders ?? [])].filter((l) => l.traits?.length).map((l) => [id, l.name, l.traits]);
    });
    expect(traits).toEqual([
      ['107', 'Alexander', ['ccBonus']],
      ['107', 'Mithridates', ['attachedOnly']],
      ['107', 'Rhoesaces', ['attachedOnly']],
      ['107', 'Spithridates', ['attachedOnly']],
      ['108', 'Alexander', ['ccBonus']],
      ['109', 'Alexander', ['ccBonus']],
      ['110', 'Alexander', ['ccBonus']],
      ['111', 'Alexander', ['ccBonus']],
    ]);
  });

  it('only Himera starts with a lone leader (Hamilcar)', () => {
    const lone = EXP1.flatMap((id) => {
      const s = game(id);
      return s.leaders.filter((l) => isLoneLeader(s, l)).map((l) => [id, l.name]);
    });
    expect(lone).toEqual([['102', 'Hamilcar']]);
  });
});

for (const id of EXP1) {
  const m = MANIFEST[id];
  describe(`${id} ${m.name}`, () => {
    it('header: name, year, armies, commanders, cards, blocks, looks, first player, banners, rules, options', () => {
      const sc = scenarioById(id);
      expect([sc.name, sc.year, sc.expansion]).toEqual([m.name, m.year, 'exp1']);
      const s = game(id);
      for (const side of SIDES) {
        const p = s.players[side];
        expect([p.army, p.commander, p.command, p.hand.length, p.blocks, p.look], side).toEqual([
          m.armies[side], m.commanders[side], m.cards[side], m.cards[side], m.blocks[side], m.looks[side],
        ]);
      }
      expect([s.first, s.active, s.bannersToWin]).toEqual([m.first, m.first, m.banners]);
      expect(sc.setup.rules).toEqual(m.rules);
      expect(sc.setup.options).toEqual(m.options);
      expect(s.special.rules).toEqual(m.options?.tacticalFlexibility ? [...m.rules, 'tacticalFlexibility'] : m.rules);
    });

    it('units per side and type, leaders and elites', () => {
      const s = game(id);
      for (const side of SIDES) {
        expect(unitCounts(s, side), side).toEqual(m.units[side]);
        expect(s.leaders.filter((l) => l.side === side && l.hex >= 0).map((l) => l.name), side).toEqual(m.leaders[side]);
        const placed = (m.placeLeaders ?? []).filter(([sd]) => sd === side).length;
        expect(s.special.leadersAtStart[side], side).toBe(m.leaders[side].length + placed);
      }
      const unplaced = s.special.unplaced.map((lid) => s.leaders.find((l) => l.id === lid)!);
      expect(unplaced.map((l) => [l.side, l.name])).toEqual(m.placeLeaders ?? []);
      expect(unplaced.every((l) => l.hex === OFF_BOARD)).toBe(true);
      expect(s.units.filter((u) => u.elite).map((u) => [u.side, u.elite, u.type])).toEqual(m.elites);
      expect(s.special.reserveUnits).toEqual([]);
      expect(s.special.reserveLeaders).toEqual([]);
    });

    it('pieces stand on passable hexes, one unit and at most one leader per hex, leaders only with their own units', () => {
      const s = game(id);
      const unitHexes = s.units.map((u) => u.hex);
      expect(new Set(unitHexes).size).toBe(unitHexes.length);
      for (const u of s.units) {
        expect(u.hex, u.id).toBeGreaterThanOrEqual(0);
        expect(isImpassable(s, u.hex), `${u.type} at ${u.hex} (${s.terrain[u.hex]})`).toBe(false);
        expect([u.blocks, u.maxBlocks]).toEqual([u.maxBlocks, u.maxBlocks]);
      }
      const onBoard = s.leaders.filter((l) => l.hex >= 0);
      expect(new Set(onBoard.map((l) => l.hex)).size).toBe(onBoard.length);
      for (const l of onBoard) {
        expect(isImpassable(s, l.hex), l.name).toBe(false);
        const there = s.units.find((u) => u.hex === l.hex);
        if (there) expect(there.side, l.name).toBe(l.side);
      }
    });

    it('elites are on unit types their preset allows', () => {
      for (const u of game(id).units) if (u.elite) expect(ELITES[u.elite].types, `${u.elite} on ${u.type}`).toContain(u.type);
    });

    it('ramparts protect the edges facing away from their own army', () => {
      const s = game(id);
      for (let h = 0; h < s.terrain.length; h++) {
        if (s.terrain[h] !== 'rampart') {
          expect(s.rampart[h], `hex ${h}`).toBe(0);
          continue;
        }
        const r = rowOf(h);
        expect(r, `rampart ${h} in the middle row`).not.toBe(4);
        const own: Side = r < 4 ? 'top' : 'bottom';
        const edges = edgesOf(s, h);
        expect(edges.length, `rampart ${h}`).toBeGreaterThan(0);
        const towardOwn: HexDir[] = own === 'top' ? ['NW', 'NE'] : ['SW', 'SE'];
        const towardEnemy: HexDir[] = own === 'top' ? ['SW', 'SE'] : ['NW', 'NE'];
        expect(edges.filter((e) => towardOwn.includes(e)), `rampart ${h} faces its own baseline`).toEqual([]);
        expect(edges.some((e) => towardEnemy.includes(e)), `rampart ${h} faces the enemy`).toBe(true);
      }
    });
  });
}

describe('battle-specific setup', () => {
  it('102 Himera: seven Carthaginian ramparts (five face the Syracusans, two flank the tent camp); Hamilcar stands alone; Eumachus rides inside the camp', () => {
    const s = game('102');
    const ramparts = s.terrain.flatMap((t, h) => (t === 'rampart' ? [[rowOf(h), h - rowOf(h) * 13, edgesOf(s, h)]] : []));
    expect(ramparts).toEqual([
      [0, 8, ['W', 'SW']],
      [1, 8, ['W', 'SW']],
      [3, 1, ['SW', 'SE']],
      [3, 2, ['SW', 'SE']],
      [3, 3, ['SW', 'SE']],
      [3, 9, ['SW', 'SE']],
      [3, 10, ['SW', 'SE']],
    ]);
    const hamilcar = s.leaders.find((l) => l.name === 'Hamilcar')!;
    expect([hamilcar.side, hamilcar.hex, leaderUnit(s, hamilcar)]).toEqual(['top', H(2, 10), undefined]);
    expect(s.units.some((u) => u.hex === H(2, 10))).toBe(false);
    // he is still alone when the battle begins (nothing attaches him at setup or on the deal)
    const d = new GameDriver(s);
    expect(d.pending?.kind).toBe('playCard');
    expect(isLoneLeader(d.state, d.state.leaders.find((l) => l.name === 'Hamilcar')!)).toBe(true);
    const eumachus = s.leaders.find((l) => l.name === 'Eumachus')!;
    expect([eumachus.side, leaderUnit(s, eumachus)?.type, eumachus.hex]).toEqual(['bottom', 'MC', H(2, 8)]);
    expect(['camp', 'camp', 'camp']).toEqual([H(1, 3), H(1, 4), H(1, 9)].map((h) => s.terrain[h]));
  });

  it('118 Beneventum: four Roman ramparts facing the Epirotes between three camps', () => {
    const s = game('118');
    const ramparts = s.terrain.flatMap((t, h) => (t === 'rampart' ? [[h, edgesOf(s, h)]] : []));
    expect(ramparts).toEqual([H(8, 4), H(8, 5), H(8, 7), H(8, 8)].map((h) => [h, ['NE', 'NW']]));
    expect([H(8, 3), H(8, 6), H(8, 9)].map((h) => s.terrain[h])).toEqual(['camp', 'camp', 'camp']);
    expect(s.units.filter((u) => u.type === 'HWM').map((u) => [u.side, u.hex])).toEqual([['bottom', H(8, 4)], ['bottom', H(8, 8)]]);
  });

  it('108 Issus: the Pinarus is fordable without dice caps on all ten hexes, and no other battle has such fords', () => {
    const s = game('108');
    const pinarus = Array.from({ length: 10 }, (_, i) => H(5, i + 1));
    expect(s.terrain.flatMap((t, h) => (t === 'river' ? [h] : []))).toEqual(pinarus);
    for (const h of pinarus) expect([s.fords[h], s.noCap[h]], `hex ${h}`).toEqual([true, true]);
    expect(s.terrain[H(5, 11)]).toBe('sea');
    // Persian units start in the river
    expect(s.units.filter((u) => pinarus.includes(u.hex)).every((u) => u.side === 'bottom')).toBe(true);
    expect(s.units.filter((u) => pinarus.includes(u.hex))).toHaveLength(8);
    for (const sc of SCENARIOS) if (sc.id !== '108') expect([sc.id, createGame(sc.setup, 1).noCap.some(Boolean)]).toEqual([sc.id, false]);
  });

  it('116 Heraclea: the Siris is fordable only at its two bends', () => {
    const s = game('116');
    expect([H(8, 0), H(8, 1), H(8, 2), H(8, 11), H(8, 12)].map((h) => [s.terrain[h], s.fords[h], isImpassable(s, h)])).toEqual([
      ['river', false, true],
      ['river', false, true],
      ['river', true, false],
      ['river', true, false],
      ['river', false, true],
    ]);
    expect(s.terrain.filter((t) => t === 'river')).toHaveLength(5);
    expect([H(8, 2), H(8, 11)].map((h) => s.units.find((u) => u.hex === h)?.type)).toEqual(['MC', 'MC']);
  });

  it("114 Gabiene: Antigonus' army (top) gains a banner for Eumenes' camp at (8,12)", () => {
    const s = game('114');
    expect(s.special.campCapture).toEqual({ side: 'top', hexes: [H(8, 12)], text: "Antigonus' troops seize Eumenes' baggage camp!" });
    expect(s.terrain.flatMap((t, h) => (t === 'camp' ? [h] : []))).toEqual([H(8, 12)]);
    expect(SCENARIOS.filter((sc) => sc.setup.campCapture).map((sc) => sc.id)).toEqual(['011', '114']);
  });

  it('117 Asculum: no leader on the board; the 2 Roman leaders are placed first, then the 2 Epirote', () => {
    const s = game('117');
    expect(s.leaders.filter((l) => l.hex >= 0)).toEqual([]);
    expect(s.special.unplaced).toHaveLength(4);
    expect(s.special.unplaced.map((lid) => s.leaders.find((l) => l.id === lid)!.side)).toEqual(['bottom', 'bottom', 'top', 'top']);
    const d = new GameDriver(s);
    expect([d.pending?.kind, d.pending?.side]).toEqual(['placeLeader', 'bottom']);
  });

  it('112 Hellespont: every leader counts, and losing both ends the battle', () => {
    const s = game('112');
    expect(s.special.rules).toEqual(['leaderLossCostsCard', 'allLeadersSuddenDeath']);
    expect(s.special.leadersAtStart).toEqual({ top: 2, bottom: 2 });
  });

  for (const id of ['120', '121', '124']) {
    it(`${id} ${MANIFEST[id].name}: Roman Tactical Flexibility is on by default and can be switched off`, () => {
      const st = scenarioById(id).setup;
      expect(createGame(st, 1).special.rules).toContain('tacticalFlexibility');
      expect(createGame(st, 1, { tacticalFlexibility: true }).special.rules).toContain('tacticalFlexibility');
      expect(createGame(st, 1, { tacticalFlexibility: false }).special.rules).not.toContain('tacticalFlexibility');
    });
  }

  it('no other battle offers Tactical Flexibility', () => {
    expect(SCENARIOS.filter((sc) => sc.setup.options).map((sc) => sc.id)).toEqual(['120', '121', '124']);
    for (const sc of SCENARIOS) {
      if (['120', '121', '124'].includes(sc.id)) continue;
      expect([sc.id, createGame(sc.setup, 1, { tacticalFlexibility: true }).special.rules.includes('tacticalFlexibility')]).toEqual([sc.id, false]);
    }
  });

  it('the base battles are base-game battles with no Expansion #1 data', () => {
    for (const id of BASE) {
      const sc = scenarioById(id);
      expect(sc.expansion).toBe('base');
      expect([id, sc.setup.options, sc.setup.placeLeaders]).toEqual([id, undefined, undefined]);
      expect([id, sc.setup.units.some((u) => u.elite && u.elite !== 'carthSacredBand')]).toEqual([id, false]);
      expect([id, sc.setup.terrain.some((t) => t.t === 'rampart' || t.t === 'sea' || t.ford === 'nocap')]).toEqual([id, false]);
    }
  });
});
