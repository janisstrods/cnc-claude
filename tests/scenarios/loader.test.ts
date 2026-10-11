// The scenario loader (src/scenarios/index.ts): every field of the scenario JSON reaches ScenarioSetup unchanged, and
// setup errors name the scenario they come from.
import { describe, expect, it } from 'vitest';
import { ALL_HEXES, OFF_BOARD, createGame, hexId, isHill, neighbours, steepSlope, type ObjectiveSetup } from '../../src/engine';
import { scenarioById, scenarioFromJson, scenariosFromFiles, type ScenarioJson } from '../../src/scenarios';
import gergovia from '../../src/scenarios/data/308.json';
import bibracte from '../../src/scenarios/data/306.json';
import valentia from '../../src/scenarios/data/304.json';

const H = (r: number, c: number) => hexId(r, c);

/** A synthetic Expansion #1 scenario using every field the loader must pass through. */
const RAW: ScenarioJson = {
  id: '199',
  name: 'Loader test',
  year: '300 BC',
  expansion: 'exp1',
  top: { army: 'Macedonian', blocks: 'grk', look: 'macedonian', commander: 'Alexander', cards: 6 },
  bottom: { army: 'Persian', blocks: 'eas', look: 'persian', commander: 'Darius III', cards: 4 },
  first: 'top',
  banners: 8,
  rules: [],
  options: { tacticalFlexibility: true },
  tacticalFlexibility: 'top',
  objectives: [{ kind: 'capture', side: 'top', hexes: [[8, 12]], text: 'The camp falls!' }],
  terrain: [
    { r: 4, c: 3, t: 'river', ford: 'nocap' },
    { r: 4, c: 4, t: 'river', ford: true },
    { r: 4, c: 5, t: 'river', ford: false },
    { r: 2, c: 2, t: 'rampart', faces: 'bottom' },
    { r: 2, c: 3, t: 'rampart', edges: ['W', 'SW'] },
    { r: 8, c: 12, t: 'camp' },
    { r: 0, c: 0, t: 'sea' },
  ],
  units: [
    { side: 'top', type: 'MC', r: 1, c: 5, elite: 'companions' },
    { side: 'top', type: 'LBC', r: 1, c: 6 },
    { side: 'bottom', type: 'MI', r: 6, c: 6, elite: 'immortals' },
    { side: 'bottom', type: 'CAM', r: 6, c: 7 },
  ],
  leaders: [{ side: 'top', name: 'Alexander', r: 1, c: 5, traits: ['ccBonus'] }],
  placeLeaders: [
    { side: 'bottom', name: 'Darius', traits: ['attachedOnly'] },
    { side: 'top', name: 'Craterus' },
  ],
  reserves: [],
  reserveLeaders: [],
};

describe('scenario loader', () => {
  it("keeps 'nocap' fords and rampart faces/edges in the setup", () => {
    const { setup } = scenarioFromJson(RAW);
    expect(setup.terrain).toEqual([
      { r: 4, c: 3, t: 'river', ford: 'nocap' },
      { r: 4, c: 4, t: 'river', ford: true },
      { r: 4, c: 5, t: 'river', ford: false },
      { r: 2, c: 2, t: 'rampart', faces: 'bottom' },
      { r: 2, c: 3, t: 'rampart', edges: ['W', 'SW'] },
      { r: 8, c: 12, t: 'camp' },
      { r: 0, c: 0, t: 'sea' },
    ]);
    const s = createGame(setup, 1);
    expect([s.fords[H(4, 3)], s.noCap[H(4, 3)]]).toEqual([true, true]);
    expect([s.fords[H(4, 4)], s.noCap[H(4, 4)]]).toEqual([true, false]);
    expect([s.fords[H(4, 5)], s.noCap[H(4, 5)]]).toEqual([false, false]);
    expect(s.rampart[H(2, 2)]).not.toBe(0);
    expect(s.rampart[H(2, 3)]).not.toBe(0);
    expect(s.rampart[H(2, 2)]).not.toBe(s.rampart[H(2, 3)]);
    expect(s.terrain[H(0, 0)]).toBe('sea');
  });

  it('passes elites, leader traits and new unit types through', () => {
    const s = createGame(scenarioFromJson(RAW).setup, 1);
    expect(s.units.map((u) => [u.type, u.elite])).toEqual([['MC', 'companions'], ['LBC', undefined], ['MI', 'immortals'], ['CAM', undefined]]);
    expect(s.leaders.find((l) => l.name === 'Alexander')?.traits).toEqual(['ccBonus']);
    expect(s.leaders.find((l) => l.name === 'Darius')?.traits).toEqual(['attachedOnly']);
  });

  it('reads rules, options, the camp objective and the leaders to place from the JSON', () => {
    const info = scenarioFromJson(RAW);
    expect(info.expansion).toBe('exp1');
    expect(info.setup.rules).toEqual([]);
    expect(info.setup.options).toEqual({ tacticalFlexibility: true });
    expect(info.setup.objectives).toEqual([{ kind: 'capture', side: 'top', hexes: [[8, 12]], text: 'The camp falls!' }]);
    expect(info.setup.placeLeaders).toEqual([{ side: 'bottom', name: 'Darius', traits: ['attachedOnly'] }, { side: 'top', name: 'Craterus' }]);
    const s = createGame(info.setup, 1);
    expect([s.scenario.rules, s.scenario.tacticalFlexibility]).toEqual([[], 'top']);
    expect(createGame(info.setup, 1, { tacticalFlexibility: false }).scenario.tacticalFlexibility).toBeNull();
    expect(s.scenario.objectives).toEqual([{
      kind: 'capture', side: 'top', hexes: [H(8, 12)], when: 'stop', banners: [1], together: 0, remove: false, text: 'The camp falls!',
    }]);
    expect(s.special.unplaced).toHaveLength(2);
    expect(s.leaders.filter((l) => l.hex === OFF_BOARD).map((l) => l.name)).toEqual(['Darius', 'Craterus']);
  });

  it('passes the legion rule of each side through, as a copy (§18.2)', () => {
    const raw: ScenarioJson = JSON.parse(JSON.stringify({ ...RAW, legions: { bottom: 'marius' } }));
    const { setup } = scenarioFromJson(raw);
    expect(setup.legions).toEqual({ bottom: 'marius' });
    setup.legions!.top = 'julian';
    expect(raw.legions).toEqual({ bottom: 'marius' });
    expect(createGame(scenarioFromJson(raw).setup, 1).units.map((u) => [u.type, u.side, u.legion])).toEqual([
      ['MC', 'top', undefined], ['LBC', 'top', undefined], ['MI', 'bottom', 'marius'], ['CAM', 'bottom', undefined],
    ]);
    expect(scenarioFromJson(RAW).setup.legions).toBeUndefined();
    expect(scenarioFromJson({ ...RAW, legions: {} }).setup.legions).toBeUndefined();
  });

  it('passes the Expansion #2 fields through as copies (commands, ambush, rolling fire, breakers, last-row retreat, objectives, coast fords)', () => {
    const raw: ScenarioJson = JSON.parse(JSON.stringify({
      ...RAW,
      expansion: 'exp2',
      rules: ['veryHills'],
      options: undefined,
      objectives: [
        { kind: 'capture', side: 'bottom', hexes: [[8, 12]], when: 'turnStart', banners: [0, 0, 1], remove: true, text: 'Camp.' },
        { kind: 'majority', sides: ['top', 'bottom'], hexes: [[2, 2]], banners: 2, when: 'turnEnd' },
        { kind: 'exit', side: 'top', hexes: [[8, 0], [8, 1]], units: 'foot' },
        { kind: 'sectionClear', side: 'bottom' },
      ],
      placeLeaders: undefined,
      legions: { bottom: 'marius' },
      ambush: { trigger: ['orderLight', 'leadershipAny'], afterOwnTurns: 0, text: 'They come from the {section}.' },
      commands: [{ id: 'a', name: 'Army A', side: 'bottom', blocks: 'gry' }, { id: 'b', name: 'Army B', side: 'bottom' }],
      rollingFire: 'top',
      rampartBreakers: 'bottom',
      lastRowRetreat: 'top',
      terrain: [
        { r: 8, c: 1, t: 'sea', ford: true, art: 'coast' },
        { r: 2, c: 2, t: 'hill' },
        { r: 8, c: 12, t: 'camp' },
        { r: 3, c: 3, t: 'rampart', faces: 'top' },
      ],
      units: [
        { side: 'bottom', type: 'MI', r: 6, c: 6, command: 'a' },
        { side: 'bottom', type: 'MC', r: 6, c: 7, command: 'b' },
        { side: 'top', type: 'WA', r: 1, c: 5 },
      ],
      leaders: [{ side: 'bottom', name: 'Crassus', r: 6, c: 6, command: 'a' }],
      reserves: [{ side: 'bottom', type: 'LI' }],
      reserveLeaders: [{ side: 'bottom', name: 'Legate' }],
    }));
    const keep: ScenarioJson = JSON.parse(JSON.stringify(raw));
    const { setup, expansion } = scenarioFromJson(raw);
    expect(expansion).toBe('exp2');
    expect(setup.legions).toEqual({ bottom: 'marius' });
    expect(setup.ambush).toEqual(raw.ambush);
    expect(setup.commands).toEqual(raw.commands);
    expect([setup.rollingFire, setup.rampartBreakers, setup.lastRowRetreat]).toEqual(['top', 'bottom', 'top']);
    expect(setup.terrain[0]).toEqual({ r: 8, c: 1, t: 'sea', ford: true, art: 'coast' });
    expect(setup.units.map((u) => u.command)).toEqual(['a', 'b', undefined]);
    expect(setup.leaders[0].command).toBe('a');
    expect(setup.objectives).toEqual(raw.objectives);
    // the setup shares nothing with the file
    setup.legions!.top = 'julian';
    setup.ambush!.trigger!.push('inspiredL');
    setup.commands![0].name = 'X';
    setup.units[0].command = 'b';
    setup.leaders[0].command = 'b';
    setup.terrain[0].art = 'x';
    (setup.objectives![1] as Extract<ObjectiveSetup, { kind: 'majority' }>).sides.push('top');
    (setup.objectives![2] as Extract<ObjectiveSetup, { kind: 'exit' }>).hexes[0][0] = 7;
    expect(raw).toEqual(keep);
    // and the pieces reach the game
    const s = createGame(scenarioFromJson(raw).setup, 1);
    expect(s.scenario.commands.map((c) => [c.id, c.blocks])).toEqual([['a', 'gry'], ['b', undefined]]);
    expect(s.scenario.rollingFire).toBe('top');
    expect(s.scenario.rampartBreakers).toBe('bottom');
    expect(s.scenario.lastRowRetreat).toBe('top');
    expect(s.scenario.rules).toEqual(['veryHills']);
    expect(s.scenario.ambush?.trigger).toEqual(['orderLight', 'leadershipAny']);
    expect(s.units.map((u) => [u.type, u.legion, u.command])).toEqual([['MI', 'marius', 'a'], ['MC', undefined, 'b'], ['WA', undefined, undefined]]);
    expect([s.terrain[H(8, 1)], s.fords[H(8, 1)]]).toEqual(['river', true]);
    expect(s.special.reserveUnits.map((u) => u.type)).toEqual(['LI']);
  });

  it('an empty options object offers no optional rule', () => {
    const { setup } = scenarioFromJson({ ...RAW, options: {}, tacticalFlexibility: undefined, rules: [], objectives: undefined, placeLeaders: undefined });
    expect(setup.options).toBeUndefined();
    expect(createGame(setup, 1, { tacticalFlexibility: true }).scenario.tacticalFlexibility).toBeNull();
  });

  it('the setup is a copy: changing it leaves the JSON data alone', () => {
    const raw: ScenarioJson = JSON.parse(JSON.stringify(RAW));
    const { setup } = scenarioFromJson(raw);
    setup.terrain[4].edges!.push('E');
    setup.units[0].r = 0;
    setup.leaders[0].traits!.push('attachedOnly');
    setup.placeLeaders![0].name = 'X';
    const camp = setup.objectives![0] as Extract<ObjectiveSetup, { kind: 'capture' }>;
    camp.hexes![0][0] = 0;
    expect(raw).toEqual(RAW);
  });

  it('base scenario files (no expansion field) are base scenarios and carry their rules in the file, like the expansions', () => {
    const sc = scenarioById('002');
    expect(sc.expansion).toBe('base');
    expect(sc.setup.units.filter((u) => u.elite).map((u) => u.elite)).toEqual(['carthSacredBand']);
    expect(scenarioById('005').setup.ambush).toEqual({}); // Mago's ambush: the Trebbia defaults
    expect(scenarioById('011').setup.objectives).toEqual([{ kind: 'capture', side: 'bottom', text: 'The Romans storm a Carthaginian camp!' }]);
    // 006 Trasimenus: 4 cards, 2 to start, hand growth to 4, and the Legate the forum post adds (listed last, §18.8)
    const tr = scenarioById('006').setup;
    expect([tr.bottom.cards, tr.initialCommand, tr.handGrowth, tr.leaders.at(-1)]).toEqual([
      4, { bottom: 2 }, { side: 'bottom', to: 4 }, { side: 'bottom', name: 'Legate', r: 8, c: 9 },
    ]);
    expect(scenarioById('010').setup.sacredLeader).toEqual({ side: 'bottom', name: 'Scipio' });
  });

  it('the starting Command, the Command bonus, the sacred leader and the one-army rules reach the setup (objects as copies)', () => {
    const bonus = { side: 'top', atBanners: 2, command: 7, draw: 1, text: 'More cards!' };
    const raw: ScenarioJson = JSON.parse(JSON.stringify({
      ...RAW, initialCommand: { bottom: 2 }, commandBonus: bonus, sacredLeader: { side: 'top', name: 'Alexander' }, frightAtFirstSight: 'bottom',
    }));
    const keep = JSON.parse(JSON.stringify(raw));
    const { setup } = scenarioFromJson(raw);
    expect([setup.initialCommand, setup.commandBonus, setup.sacredLeader, setup.frightAtFirstSight, setup.tacticalFlexibility]).toEqual([
      { bottom: 2 }, bonus, { side: 'top', name: 'Alexander' }, 'bottom', 'top',
    ]);
    setup.initialCommand!.bottom = 3;
    setup.commandBonus!.draw = 0;
    setup.sacredLeader!.name = 'X';
    expect(raw).toEqual(keep);
    const s = createGame(scenarioFromJson(raw).setup, 1);
    expect([s.players.bottom.command, s.players.bottom.hand.length]).toEqual([2, 2]);
    expect([s.scenario.commandBonus, s.scenario.frightAtFirstSight, s.scenario.tacticalFlexibility]).toEqual([bonus, 'bottom', 'top']);
    expect(s.scenario.sacredLeaderId).toBe(s.leaders.find((l) => l.name === 'Alexander')?.id);
  });

  it('the retired campCapture field is an error naming the scenario', () => {
    const old = { ...RAW, objectives: undefined, campCapture: { side: 'top' } } as ScenarioJson;
    expect(() => scenarioFromJson(old)).toThrow(/^campCapture is now a capture objective in objectives \(199\)$/);
  });

  it('an unknown expansion is an error naming the scenario', () => {
    expect(() => scenarioFromJson({ ...RAW, expansion: 'exp9' as ScenarioJson['expansion'] })).toThrow(/199.*exp9|exp9.*199/);
  });
});

describe('setup errors name the scenario', () => {
  const setup = () => scenarioFromJson({ ...RAW, rules: [], objectives: undefined, placeLeaders: undefined }).setup;

  it('a unit off the board', () => {
    const st = setup();
    st.units[0].r = 9;
    expect(() => createGame(st, 1)).toThrow(/off board.*\(199\)/);
  });

  it('a rampart without protected edges', () => {
    const st = setup();
    delete st.terrain[3].faces;
    expect(() => createGame(st, 1)).toThrow(/rampart.*\(199\)/);
  });

  it('an elite on a type it cannot be', () => {
    const st = setup();
    st.units[1].elite = 'companions';
    expect(() => createGame(st, 1)).toThrow(/cannot be a LBC unit.*\(199\)/);
  });

  it('an unknown leader trait', () => {
    const st = setup();
    st.leaders[0].traits = ['flying' as 'ccBonus'];
    expect(() => createGame(st, 1)).toThrow(/unknown leader trait flying.*\(199\)/);
  });

  it('a leader off the board', () => {
    const st = setup();
    st.leaders[0].r = 9;
    expect(() => createGame(st, 1)).toThrow(/^leader Alexander off board 9,\d+ \(199\)$/);
    st.leaders[0].r = 1;
    st.leaders[0].c = -1;
    expect(() => createGame(st, 1)).toThrow(/^leader Alexander off board 1,-1 \(199\)$/);
  });

  it('leaders to place before the first turn start off the board and are not checked against it', () => {
    const { setup: st } = scenarioFromJson(RAW);
    expect(createGame(st, 1).leaders.filter((l) => l.hex === OFF_BOARD)).toHaveLength(2);
  });

  it('the error is a new Error that keeps the original as its cause', () => {
    const st = setup();
    st.units[0].r = 9;
    let thrown: unknown;
    try {
      createGame(st, 1);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Error);
    const err = thrown as Error;
    expect(err.message).toBe('unit off board 9,5 (199)');
    expect(err.cause).toBeInstanceOf(Error);
    expect((err.cause as Error).message).toBe('unit off board 9,5'); // the original error is not rewritten
  });

  it('a message that already names the scenario is left alone', () => {
    const st = setup();
    st.placeLeaders = [{ side: 'left' as 'top', name: 'X' }];
    expect(() => createGame(st, 1)).toThrow(/^placeLeaders: unknown side left \(199\)$/);
    try {
      createGame(st, 1);
    } catch (e) {
      expect((e as Error).cause).toBeUndefined(); // thrown as it was, not wrapped again
    }
  });
});

describe('malformed scenario files', () => {
  it('a file that breaks the loader throws an Error naming the file and the scenario', () => {
    const broken = { ...RAW, id: '198', terrain: undefined } as unknown as ScenarioJson;
    let thrown: unknown;
    try {
      scenariosFromFiles({ './data/199.json': RAW, './data/198.json': broken });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toMatch(/^scenario file \.\/data\/198\.json \(198\): /);
    expect((thrown as Error).cause).toBeInstanceOf(TypeError);
  });

  it('a file with no top-level shape at all still names the file', () => {
    expect(() => scenariosFromFiles({ './data/nothing.json': null as unknown as ScenarioJson })).toThrow(/^scenario file \.\/data\/nothing\.json: /);
  });

  it('an error that already names the scenario is not given its id twice', () => {
    const msg = (() => {
      try {
        scenariosFromFiles({ './data/199.json': { ...RAW, expansion: 'exp9' as ScenarioJson['expansion'] } });
      } catch (e) {
        return (e as Error).message;
      }
      return '';
    })();
    expect(msg).toBe('scenario file ./data/199.json: unknown expansion exp9 (199)');
  });

  it('well-formed files build as before, sorted by id', () => {
    const list = scenariosFromFiles({ './b.json': { ...RAW, id: '199' }, './a.json': { ...RAW, id: '198' } });
    expect(list.map((x) => x.id)).toEqual(['198', '199']);
    expect(scenarioById('108').name).toBe('Issus');
  });
});

describe('Expansion #3 terrain through the loader (src/scenarios/data/308.json, §18.7)', () => {
  const sc = scenarioFromJson(gergovia as unknown as ScenarioJson);

  it('keeps the hills under the Gergovia walls and the Gallic camps', () => {
    const hills = sc.setup.terrain.filter((t) => t.hill).map((t) => [t.r, t.c, t.t]);
    expect(hills).toEqual([
      [0, 5, 'wall'], [0, 6, 'wall'], [0, 7, 'wall'], [0, 8, 'wall'], [0, 9, 'wall'], [2, 5, 'camp'], [2, 7, 'camp'], [2, 9, 'camp'],
    ]);
    const s = createGame(sc.setup, 1);
    expect(ALL_HEXES.filter((h) => s.hillUnder[h])).toEqual([H(0, 5), H(0, 6), H(0, 7), H(0, 8), H(0, 9), H(2, 5), H(2, 7), H(2, 9)]);
    expect([isHill(s, H(0, 9)), isHill(s, H(2, 9)), s.terrain[H(0, 9)], s.terrain[H(2, 9)]]).toEqual([true, true, 'wall', 'camp']);
  });

  it('so its steep slopes include the wall corner and the camp next to the forests (12 in all)', () => {
    const s = createGame(sc.setup, 1);
    expect(steepSlope(s, H(0, 9), H(0, 10))).toBe(true); // wall corner (0,9) and forest (0,10)
    expect(steepSlope(s, H(2, 10), H(2, 9))).toBe(true); // forest (2,10) and Gallic camp (2,9)
    expect(steepSlope(s, H(1, 4), H(1, 3))).toBe(true); // an ordinary hill and forest
    const sides = ALL_HEXES.flatMap((a) => neighbours(a).filter((b) => a < b && steepSlope(s, a, b)));
    expect(sides).toHaveLength(12);
  });
});

describe('Expansion #3 reinforcements through the loader (src/scenarios/data/308.json, §18.9)', () => {
  const raw = (): ScenarioJson => JSON.parse(JSON.stringify(gergovia)) as ScenarioJson;
  const G = [[3, 0], [4, 0], [5, 0], [6, 0], [7, 0]] as [number, number][];
  const R = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4]] as [number, number][];

  it('keeps the fixed entry hexes, noMove and attachLeader of the Gallic reinforcements', () => {
    const sc = scenarioFromJson(raw());
    expect(sc.setup.ambush).toMatchObject({ afterOwnTurns: 0, entryHexes: G, noMove: true, attachLeader: true });
    const s = createGame(sc.setup, 1);
    expect(s.scenario.ambush).toMatchObject({
      trigger: ['inspiredL', 'inspiredC', 'inspiredR', 'leadershipAny'], afterOwnTurns: 0,
      entryHexes: G.map(([r, c]) => H(r, c)), noMove: true, attachLeader: true,
    });
    expect(s.special.reserveUnits.map((u) => u.type)).toEqual(['AX', 'AX', 'WA', 'WA']);
    expect(s.special.reserveLeaders.map((l) => l.name)).toEqual(['Vercingetorix']);
  });

  it('keeps the Roman forced placement: an off-board Julian MI for the left baseline, apart from the reserves', () => {
    const sc = scenarioFromJson(raw());
    expect(sc.setup.placeUnits).toEqual([{ side: 'bottom', type: 'MI', hexes: R, after: 'ambush' }]);
    const s = createGame(sc.setup, 1);
    expect(s.special.placeUnits.map((p) => [p.unit.side, p.unit.type, p.unit.hex, p.unit.legion, p.hexes, p.after])).toEqual([
      ['bottom', 'MI', OFF_BOARD, 'julian', R.map(([r, c]) => H(r, c)), 'ambush'],
    ]);
    expect(s.units.some((u) => u.id === s.special.placeUnits[0].unit.id)).toBe(false);
  });

  it('the setup is a copy: changing its entry hexes or placements leaves the JSON data alone', () => {
    const j = raw();
    const keep = JSON.parse(JSON.stringify(j));
    const { setup } = scenarioFromJson(j);
    setup.ambush!.entryHexes![0][0] = 8;
    setup.placeUnits![0].hexes[0][1] = 9;
    setup.placeUnits![0].type = 'HI';
    expect(j).toEqual(keep);
  });
});

describe('Expansion #3 units and commands through the loader (src/scenarios/data/306.json, 304.json)', () => {
  const read = (j: unknown): ScenarioJson => JSON.parse(JSON.stringify(j)) as ScenarioJson;

  it('306: the two recruits keep `immobile` in the setup and the state (§18.11)', () => {
    const sc = scenarioFromJson(read(bibracte));
    expect(sc.setup.units.filter((u) => u.immobile).map((u) => [u.side, u.type, u.r, u.c])).toEqual([['bottom', 'AX', 8, 4], ['bottom', 'AX', 8, 5]]);
    const s = createGame(sc.setup, 1);
    expect(s.units.filter((u) => u.immobile).map((u) => [u.type, u.hex])).toEqual([['AX', H(8, 4)], ['AX', H(8, 5)]]);
    expect(s.units.filter((u) => !u.immobile)).toHaveLength(s.units.length - 2);
  });

  it('304: both leaders keep their command, the units theirs, and the commands their blocks (§18.5)', () => {
    const sc = scenarioFromJson(read(valentia));
    expect(sc.setup.leaders.filter((l) => l.side === 'top').map((l) => [l.name, l.command])).toEqual([['Perpenna', 'perpenna'], ['Herennius', 'herennius']]);
    const s = createGame(sc.setup, 1);
    expect(s.scenario.commands).toEqual([
      { id: 'herennius', name: 'Herennius', side: 'top' }, { id: 'perpenna', name: 'Perpenna', side: 'top', blocks: 'grk' },
    ]);
    expect(s.leaders.map((l) => [l.name, l.command])).toEqual([
      ['Perpenna', 'perpenna'], ['Herennius', 'herennius'], ['Memmius', undefined], ['Pompey', undefined], ['Afranius', undefined],
    ]);
    const count = (c: string) => s.units.filter((u) => u.command === c).length;
    expect([count('herennius'), count('perpenna'), s.units.filter((u) => u.side === 'top' && !u.command).length]).toEqual([10, 5, 0]);
  });

  it('the setup is a copy: changing a unit or leader leaves the JSON data alone', () => {
    const j = read(bibracte);
    const keep = JSON.parse(JSON.stringify(j));
    const { setup } = scenarioFromJson(j);
    setup.units.find((u) => u.immobile)!.immobile = false;
    setup.leaders[0].command = 'x';
    expect(j).toEqual(keep);
  });
});

describe('the Expansion #3 files (301-319) through the loader: every key reaches the setup, as a copy', () => {
  const FILES = Object.values(import.meta.glob<ScenarioJson>('../../src/scenarios/data/3*.json', { eager: true, import: 'default' }))
    .sort((a, b) => a.id.localeCompare(b.id));
  type Path = (string | number)[];
  const isNode = (v: unknown): v is object => typeof v === 'object' && v !== null;
  /** The value at `path` of the built scenario: the battle's year and box are in the info, everything else in its setup. */
  const target = (info: ReturnType<typeof scenarioFromJson>, key: string): unknown =>
    key === 'year' || key === 'expansion' ? info[key] : (info.setup as unknown as Record<string, unknown>)[key];

  /**
   * Walk a file value and the loaded value side by side: every key and list entry of the file must be in the setup with the
   * same value, and no object or list of the setup may be the file's own. Returns the problems found.
   */
  function compare(file: unknown, loaded: unknown, path: Path, problems: string[]) {
    const at = path.join('.');
    if (!isNode(file)) {
      if (loaded !== file) problems.push(`${at}: ${JSON.stringify(file)} became ${JSON.stringify(loaded)}`);
      return;
    }
    if (!isNode(loaded)) return void problems.push(`${at}: dropped (${JSON.stringify(loaded)})`);
    if (loaded === file) problems.push(`${at}: shared with the file, not copied`);
    if (Array.isArray(file)) {
      if (!Array.isArray(loaded) || loaded.length !== file.length) return void problems.push(`${at}: list changed`);
      file.forEach((v, i) => compare(v, loaded[i], [...path, i], problems));
      return;
    }
    for (const [k, v] of Object.entries(file)) {
      if (!Object.prototype.hasOwnProperty.call(loaded, k)) problems.push(`${at}.${k}: dropped`);
      else compare(v, (loaded as Record<string, unknown>)[k], [...path, k], problems);
    }
  }

  it('are the 19 battles 301-319 of the Roman Civil Wars box, and SCENARIOS holds them as built', () => {
    expect(FILES.map((j) => [j.id, j.expansion])).toEqual(Array.from({ length: 19 }, (_, k) => [String(301 + k), 'exp3']));
    for (const j of FILES) expect(scenarioById(j.id), j.id).toEqual(scenarioFromJson(j));
  });

  it('every key present anywhere in the files reaches the loaded setup unchanged and as a copy', () => {
    for (const j of FILES) {
      const info = scenarioFromJson(j);
      const problems: string[] = [];
      for (const [k, v] of Object.entries(j)) {
        if (k === 'id' || k === 'name') expect([k, info[k]]).toEqual([k, v]);
        compare(v, target(info, k), [j.id, k], problems);
      }
      expect(problems, j.id).toEqual([]);
    }
  });

  it('the keys the files use, by kind, so a new one is noticed (and the walk above checks it reaches the setup)', () => {
    const seen: Record<string, Set<string>> = {};
    const add = (kind: string, keys: string[]) => keys.forEach((k) => (seen[kind] ??= new Set()).add(k));
    const LISTS: Record<string, string> = {
      units: 'unit', leaders: 'leader', terrain: 'terrain', objectives: 'objective', placeUnits: 'placeUnit', commands: 'command',
      reserves: 'reserve', reserveLeaders: 'reserveLeader',
    };
    const OBJECTS: Record<string, string> = { top: 'side', bottom: 'side', ambush: 'ambush', handGrowth: 'handGrowth', legions: 'legions' };
    for (const j of FILES) {
      add('file', Object.keys(j));
      for (const [k, v] of Object.entries(j)) {
        if (LISTS[k]) for (const x of v as object[]) add(LISTS[k], Object.keys(x));
        if (OBJECTS[k]) add(OBJECTS[k], Object.keys(v as object));
      }
    }
    const sorted = Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, [...v].sort()]));
    expect(sorted).toEqual({
      file: ['ambush', 'banners', 'bottom', 'commands', 'expansion', 'first', 'handGrowth', 'id', 'leaders', 'legions', 'name', 'objectives',
        'placeUnits', 'reserveLeaders', 'reserves', 'rules', 'terrain', 'top', 'units', 'year'],
      side: ['army', 'blocks', 'cards', 'commander', 'look', 'orderDice', 'orders'],
      unit: ['c', 'command', 'immobile', 'r', 'side', 'type'],
      leader: ['c', 'command', 'name', 'r', 'side', 'traits'],
      terrain: ['art', 'c', 'edges', 'faces', 'ford', 'hill', 'r', 't'],
      objective: ['banners', 'hexes', 'kind', 'leadersScore', 'marker', 'max', 'remove', 'side', 'sides', 'text', 'units', 'when'],
      ambush: ['afterOwnTurns', 'attachLeader', 'entryHexes', 'noMove', 'text', 'trigger'],
      placeUnit: ['after', 'hexes', 'side', 'type'],
      command: ['blocks', 'id', 'name', 'side'],
      reserve: ['side', 'type'],
      reserveLeader: ['name', 'side'],
      handGrowth: ['side', 'to'],
      legions: ['bottom', 'top'],
    });
  });

  it('the walk notices a dropped or shared field', () => {
    const j = JSON.parse(JSON.stringify(FILES.find((x) => x.id === '308'))) as ScenarioJson;
    const info = scenarioFromJson(j);
    delete info.setup.ambush!.noMove;
    delete (info.setup.units[0] as { r?: number }).r;
    info.setup.placeUnits![0].hexes[2] = j.placeUnits![0].hexes[2];
    const problems: string[] = [];
    for (const [k, v] of Object.entries(j)) compare(v, target(info, k), [j.id, k], problems);
    expect(problems).toEqual(['308.ambush.noMove: dropped', '308.units.0.r: dropped', '308.placeUnits.0.hexes.2: shared with the file, not copied']);
  });
});
