// Expansion #1 screens: battle picker tabs, optional rules plumbing (start and restore), rampart tooltips, leader
// placement and the satrap Leadership prompt.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  GameDriver, createGame, hexId, orderCommander, orderLimit, randomAnswer, type GameState, type LeaderTrait,
} from '../../src/engine';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import {
  GameController, devRouteConfig, initialState, loadSaved, newSessionConfig, type SessionConfig,
} from '../../src/ui/game/controller';
import { RandomOpponent } from '../../src/ui/game/opponent';
import {
  boardUi, deploymentSide, leadershipHint, rampartSidesText, terrainTipLines, type UiSel,
} from '../../src/ui/game/uiModel';
import {
  OPTIONAL_RULES, PICKER_TABS, battlesOf, chosenOptions, loadOptionChoices, loadPickerTab, offeredOptions, optionValue,
  saveOptionChoice, savePickerTab,
} from '../../src/ui/screens/picker';
import { build, leaderId, type Pos } from '../rules/helpers';

/** A Map-backed localStorage for the node test environment. */
function stubStorage(): Map<string, string> {
  const m = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
  };
  return m;
}

afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i).padStart(3, '0'));

// ---------------------------------------------------------------------------------------------

describe('battle picker tabs', () => {
  it('two tabs: the base game (001–015), then Expansion #1 (101–124), each in id order', () => {
    expect(PICKER_TABS.map((t) => [t.id, t.label])).toEqual([['base', 'Punic Wars'], ['exp1', 'Greece & the East']]);
    expect(ids(battlesOf(SCENARIOS, 'base'))).toEqual(range(1, 15));
    expect(ids(battlesOf(SCENARIOS, 'exp1'))).toEqual(range(101, 124));
    // every battle is in exactly one tab
    expect(PICKER_TABS.reduce((n, t) => n + battlesOf(SCENARIOS, t.id).length, 0)).toBe(SCENARIOS.length);
  });

  it('remembers the last tab; unknown values and missing storage fall back to the base game', () => {
    expect(loadPickerTab()).toBe('base'); // no localStorage at all
    const m = stubStorage();
    expect(loadPickerTab()).toBe('base');
    savePickerTab('exp1');
    expect(m.get('cca-battle-tab')).toBe('exp1');
    expect(loadPickerTab()).toBe('exp1');
    m.set('cca-battle-tab', 'nonsense');
    expect(loadPickerTab()).toBe('base');
  });
});

describe('optional rules in the briefing', () => {
  it('only 120, 121 and 124 offer Tactical Flexibility, on by default', () => {
    const offering = SCENARIOS.filter((s) => offeredOptions(s).length).map((s) => s.id);
    expect(offering).toEqual(['120', '121', '124']);
    for (const id of offering) {
      expect(offeredOptions(scenarioById(id))).toEqual(['tacticalFlexibility']);
      expect(optionValue(scenarioById(id), 'tacticalFlexibility', {})).toBe(true);
    }
    expect(chosenOptions(scenarioById('101'), { tacticalFlexibility: false })).toBeUndefined();
  });

  it('the explanation names the army it weakens', () => {
    expect(OPTIONAL_RULES.tacticalFlexibility.text(scenarioById('120'))).toMatch(/^Macedonian heavy infantry .* only 3 dice\.$/);
    expect(OPTIONAL_RULES.tacticalFlexibility.text(scenarioById('121'))).toMatch(/^Seleucid heavy infantry/);
  });

  it('a remembered choice overrides the default and is kept per option in cca-options', () => {
    const m = stubStorage();
    expect(loadOptionChoices()).toEqual({});
    const c = saveOptionChoice({}, 'tacticalFlexibility', false);
    expect(JSON.parse(m.get('cca-options')!)).toEqual({ tacticalFlexibility: false });
    expect(loadOptionChoices()).toEqual({ tacticalFlexibility: false });
    expect(chosenOptions(scenarioById('124'), c)).toEqual({ tacticalFlexibility: false });
    m.set('cca-options', JSON.stringify({ tacticalFlexibility: 'no', bogus: true }));
    expect(loadOptionChoices()).toEqual({});
    m.set('cca-options', '{not json');
    expect(loadOptionChoices()).toEqual({});
  });
});

describe('optional rules reach the engine on start and on restore', () => {
  const tf = (s: GameState) => s.special.rules.includes('tacticalFlexibility');

  it('the session config carries the options into createGame', () => {
    const off = newSessionConfig('120', 'bottom', 'recruit', { tacticalFlexibility: false });
    expect(off.options).toEqual({ tacticalFlexibility: false });
    expect(tf(initialState(off))).toBe(false);
    expect(tf(initialState({ ...off, options: undefined }))).toBe(true); // the scenario default
    expect(tf(initialState({ ...off, options: { tacticalFlexibility: true } }))).toBe(true);
    expect(newSessionConfig('120', 'bottom', 'recruit').options).toBeUndefined();
    expect(newSessionConfig('120', 'bottom', 'recruit', {}).options).toBeUndefined();
  });

  it('a saved battle with the option off is restored with it off', async () => {
    const m = stubStorage();
    const cfg: SessionConfig = { ...newSessionConfig('120', 'bottom', 'recruit', { tacticalFlexibility: false }), seed: 777 };
    const c = new GameController(cfg, new RandomOpponent());
    try {
      expect(tf(c.driver.initial)).toBe(false);
      c.hurry();
      // wait for the human's first decision, then answer it (which saves)
      for (let i = 0; i < 200 && !c.view.pending; i++) await new Promise((r) => setTimeout(r, 5));
      expect(c.view.pending).not.toBeNull();
      c.answer(randomAnswer(c.driver.state, c.view.pending!, () => 0.3));
    } finally {
      c.dispose();
    }
    expect(m.has('cca-autosave-v1')).toBe(true);
    const saved = loadSaved()!;
    expect(saved.config.options).toEqual({ tacticalFlexibility: false });
    expect(saved.answers.length).toBeGreaterThan(0);
    const r = new GameController(saved.config, new RandomOpponent(), saved.answers, saved.check);
    try {
      expect(tf(r.driver.initial)).toBe(false);
      expect(r.driver.answers).toEqual(saved.answers);
    } finally {
      r.dispose();
    }
  });
});

describe('dev route', () => {
  it('starts every battle, base game and Expansion #1', () => {
    for (const sc of SCENARIOS) {
      const cfg = devRouteConfig(`#/play/${sc.id}/top/consul/42`)!;
      expect(cfg, sc.id).toMatchObject({ scenarioId: sc.id, humanSide: 'top', difficulty: 'consul', seed: 42 });
      const c = new GameController(cfg, new RandomOpponent());
      c.dispose();
      expect(c.driver.initial.scenarioId).toBe(sc.id);
    }
    expect(devRouteConfig('#/play/117/bottom/recruit?cards=leadershipAny')).toMatchObject({ scenarioId: '117', devCards: ['leadershipAny'] });
    expect(devRouteConfig('#/play/999/bottom/recruit')).toBeNull();
    expect(devRouteConfig('#/gallery/art')).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------

describe('rampart tooltip', () => {
  const NE = 1 << 1, NW = 1 << 2, E = 1, W = 1 << 3, SW = 1 << 4, SE = 1 << 5;
  it('names the protected sides as the viewer sees them', () => {
    expect(rampartSidesText(NE | NW, false)).toBe('its upper hexsides');
    expect(rampartSidesText(NE | NW, true)).toBe('its lower hexsides');
    expect(rampartSidesText(SW | SE, false)).toBe('its lower hexsides');
    expect(rampartSidesText(SW | SE, true)).toBe('its upper hexsides');
    expect(rampartSidesText(W | SW, false)).toBe('its left and lower-left hexsides');
    expect(rampartSidesText(W | SW, true)).toBe('its upper-right and right hexsides');
    expect(rampartSidesText(NW | NE | E, false)).toBe('its upper and right hexsides');
    expect(rampartSidesText(NE, false)).toBe('its upper-right hexside');
    expect(rampartSidesText(NE, true)).toBe('its lower-left hexside');
    expect(rampartSidesText(63, false)).toBe('all its hexsides');
  });

  it('terrain lines: ramparts and Expansion #1 terrain explain themselves, base terrain is unchanged', () => {
    const beneventum = createGame(scenarioById('118').setup, 1); // Roman (bottom) ramparts face up the board
    const r = hexId(8, 4);
    expect(terrainTipLines(beneventum, r, false, 'Rampart')[0]).toBe('Rampart: protects its upper hexsides');
    expect(terrainTipLines(beneventum, r, true, 'Rampart')[0]).toBe('Rampart: protects its lower hexsides');
    expect(terrainTipLines(beneventum, r, false, 'Rampart')[1]).toMatch(/^Foot here ignore 1 sword and 1 flag/);
    const himera = createGame(scenarioById('102').setup, 1);
    expect(terrainTipLines(himera, hexId(3, 1), false, 'Rampart')[0]).toBe('Rampart: protects its lower hexsides');
    expect(terrainTipLines(himera, hexId(0, 8), false, 'Rampart')[0]).toBe('Rampart: protects its left and lower-left hexsides');
    const marathon = createGame(scenarioById('101').setup, 1);
    const sea = marathon.terrain.indexOf('sea');
    expect(terrainTipLines(marathon, sea, false, 'Sea')).toEqual(['Terrain: Sea', 'Impassable; does not block line of sight']);
    const issus = createGame(scenarioById('108').setup, 1);
    const ford = issus.noCap.indexOf(true);
    expect(terrainTipLines(issus, ford, false, 'Ford (no dice limit)')).toEqual(['Terrain: Ford (no dice limit)', 'Stops movement; no dice limits in or out']);
    const hill = marathon.terrain.indexOf('hill');
    expect(terrainTipLines(marathon, hill, false, 'Hill')).toEqual(['Terrain: Hill']);
    const plain = marathon.terrain.indexOf('plain');
    expect(terrainTipLines(marathon, plain, false, 'Open Ground')).toEqual([]);
  });
});

describe('Asculum leader placement', () => {
  it('the deploying side is the side of the next leader to place, then nobody', () => {
    const s = createGame(scenarioById('117').setup, 5);
    expect(deploymentSide(s)).toBe('bottom'); // the Romans place first
    const d = new GameDriver(s);
    const sides: string[] = [];
    while (d.pending?.kind === 'placeLeader') {
      sides.push(deploymentSide(d.state)!);
      expect(d.answer({ kind: 'hex', hex: d.pending.options[0] })).toBe(true);
    }
    expect(sides).toEqual(['bottom', 'bottom', 'top', 'top']);
    expect(deploymentSide(d.state)).toBeNull();
    expect(deploymentSide(createGame(scenarioById('101').setup, 5))).toBeNull();
  });

  it('own units are marked strongly, empty hexes faintly', () => {
    const d = new GameDriver(createGame(scenarioById('117').setup, 5));
    const pd = d.pending!;
    expect(pd.kind).toBe('placeLeader');
    const sel: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null };
    const hl = boardUi(d.state, pd, sel, 'bottom').highlights;
    const kinds = new Set(hl.values());
    expect(kinds).toEqual(new Set(['placeUnit', 'placeEmpty']));
    for (const [h, k] of hl) expect(k, String(h)).toBe(d.state.units.some((u) => u.hex === h) ? 'placeUnit' : 'placeEmpty');
  });
});

describe('satrap Leadership prompt', () => {
  const SATRAP: LeaderTrait[] = ['attachedOnly'];
  // u1 MI (6,6), u2 MI (6,7), u3 MI (6,5); enemy far away
  const pos = (leaders: Pos['leaders']): Pos => ({
    units: [
      { side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [6, 7] }, { side: 'bottom', type: 'MI', at: [6, 5] },
      { side: 'top', type: 'HI', at: [1, 6] },
    ],
    leaders,
  });

  it('an army of satraps is told that a satrap commands only his own unit', () => {
    const s = build(pos([{ side: 'bottom', at: [6, 6], traits: SATRAP }]));
    expect(leadershipHint(s, 'bottom', 'leadershipAny', [])).toMatch(/^A satrap commands only his own unit/);
    expect(leadershipHint(s, 'bottom', 'inspiredC', [leaderId(s, 0), 'u1'])).toMatch(/^A satrap commands only his own unit: he is ordered with it/);
  });

  it('an ordinary leader keeps the base-game prompt', () => {
    const s = build(pos([{ side: 'bottom', at: [6, 6] }]));
    expect(leadershipHint(s, 'bottom', 'leadershipAny', [])).toBe('Click a leader to command through him, then up to 3 linked units — or order just 1 unit.');
    expect(leadershipHint(s, 'bottom', 'inspiredC', [])).toBe('Click a leader to command through him, then up to 4 linked units — or order just 1 unit.');
  });

  it('the counter follows the leader who can command the selection, not just the first one picked', () => {
    // a lone satrap at (7,6) picked first, then an ordinary lone leader next to him at (7,5)
    const s = build(pos([{ side: 'bottom', at: [7, 6], traits: SATRAP }, { side: 'bottom', at: [7, 5] }]));
    const [sat, gen] = [leaderId(s, 0), leaderId(s, 1)];
    expect(orderCommander(s, 'bottom', 'leadershipAny', [sat, gen])?.id).toBe(gen);
    expect(orderLimit(s, 'bottom', 'leadershipAny', [sat, gen])).toBe(4); // the general: himself + 3
    expect(leadershipHint(s, 'bottom', 'leadershipAny', [sat, gen])).toMatch(/^Click a leader/);
    // the satrap alone: he commands only himself
    expect(orderCommander(s, 'bottom', 'leadershipAny', [sat])?.id).toBe(sat);
    expect(orderLimit(s, 'bottom', 'leadershipAny', [sat])).toBe(1);
    expect(leadershipHint(s, 'bottom', 'leadershipAny', [sat])).toMatch(/^A satrap commands only his own unit: standing alone/);
    // nothing selected, a mixed army: the ordinary prompt
    expect(leadershipHint(s, 'bottom', 'leadershipAny', [])).toMatch(/^Click a leader/);
    expect(orderCommander(s, 'bottom', 'order3L', [sat])).toBeNull();
  });
});

beforeEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});
