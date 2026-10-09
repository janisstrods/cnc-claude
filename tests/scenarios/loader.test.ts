// The scenario loader (src/scenarios/index.ts): every field of the scenario JSON reaches ScenarioSetup unchanged, and
// setup errors name the scenario they come from.
import { describe, expect, it } from 'vitest';
import { OFF_BOARD, createGame, hexId } from '../../src/engine';
import { scenarioById, scenarioFromJson, scenariosFromFiles, type ScenarioJson } from '../../src/scenarios';

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
  rules: ['campCapture', 'leaderPlacement'],
  options: { tacticalFlexibility: true },
  campCapture: { side: 'top', hexes: [[8, 12]], text: 'The camp falls!' },
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
    expect(info.setup.rules).toEqual(['campCapture', 'leaderPlacement']);
    expect(info.setup.options).toEqual({ tacticalFlexibility: true });
    expect(info.setup.campCapture).toEqual({ side: 'top', hexes: [[8, 12]], text: 'The camp falls!' });
    expect(info.setup.placeLeaders).toEqual([{ side: 'bottom', name: 'Darius', traits: ['attachedOnly'] }, { side: 'top', name: 'Craterus' }]);
    const s = createGame(info.setup, 1);
    expect(s.special.rules).toEqual(['campCapture', 'leaderPlacement', 'tacticalFlexibility']);
    expect(createGame(info.setup, 1, { tacticalFlexibility: false }).special.rules).not.toContain('tacticalFlexibility');
    expect(s.special.campCapture).toEqual({ side: 'top', hexes: [H(8, 12)], text: 'The camp falls!' });
    expect(s.special.unplaced).toHaveLength(2);
    expect(s.leaders.filter((l) => l.hex === OFF_BOARD).map((l) => l.name)).toEqual(['Darius', 'Craterus']);
  });

  it('an empty options object offers no optional rule', () => {
    const { setup } = scenarioFromJson({ ...RAW, options: {}, rules: [], campCapture: undefined, placeLeaders: undefined });
    expect(setup.options).toBeUndefined();
    expect(createGame(setup, 1, { tacticalFlexibility: true }).special.rules).toEqual([]);
  });

  it('the setup is a copy: changing it leaves the JSON data alone', () => {
    const raw: ScenarioJson = JSON.parse(JSON.stringify(RAW));
    const { setup } = scenarioFromJson(raw);
    setup.terrain[4].edges!.push('E');
    setup.units[0].r = 0;
    setup.leaders[0].traits!.push('attachedOnly');
    setup.placeLeaders![0].name = 'X';
    setup.campCapture!.hexes![0][0] = 0;
    expect(raw).toEqual(RAW);
  });

  it('base scenario files (no expansion field) are base scenarios and keep their rules from the texts table', () => {
    const sc = scenarioById('002');
    expect(sc.expansion).toBe('base');
    expect(sc.setup.rules).toEqual(['sacredBand']);
    expect(scenarioById('011').setup.campCapture).toEqual({ side: 'bottom', text: 'The Romans storm a Carthaginian camp!' });
  });

  it('an unknown expansion is an error naming the scenario', () => {
    expect(() => scenarioFromJson({ ...RAW, expansion: 'exp9' as ScenarioJson['expansion'] })).toThrow(/199.*exp9|exp9.*199/);
  });
});

describe('setup errors name the scenario', () => {
  const setup = () => scenarioFromJson({ ...RAW, rules: [], campCapture: undefined, placeLeaders: undefined }).setup;

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
    st.rules = ['campCapture'];
    expect(() => createGame(st, 1)).toThrow(/^rule campCapture needs scenario data campCapture \(199\)$/);
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
