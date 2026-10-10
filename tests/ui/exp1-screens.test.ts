// Expansion #1 screens: battle picker tabs, optional rules plumbing (start and restore), rampart tooltips, leader
// placement, the satrap Leadership prompt and the controller's notices (abandoned war machines, lost command cards).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CARD_DEFS, GameDriver, UNIT_STATS, cardKind, cloneState, createGame, hexId, orderCommander, orderLimit, randomAnswer, type GameEvent,
  type GameState, type LeaderTrait, type QueuedEvent, type Side,
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
  saveOptionChoice, savePickerTab, tabForKey,
} from '../../src/ui/screens/picker';
import { OptionToggle, ScenarioSelect } from '../../src/ui/screens/Menus';
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

  it('arrow keys step through the tabs (wrapping), Home and End jump; other keys do nothing', () => {
    expect(tabForKey('base', 'ArrowRight')).toBe('exp1');
    expect(tabForKey('exp1', 'ArrowRight')).toBe('base');
    expect(tabForKey('base', 'ArrowLeft')).toBe('exp1');
    expect(tabForKey('exp1', 'ArrowLeft')).toBe('base');
    expect(tabForKey('exp1', 'Home')).toBe('base');
    expect(tabForKey('base', 'End')).toBe('exp1');
    for (const k of ['Enter', ' ', 'ArrowDown', 'a']) expect(tabForKey('base', k), k).toBeUndefined();
  });

  it('the tabs are ARIA tabs: the selected one is in the tab order and labels the battle list it controls', () => {
    const m = stubStorage();
    m.set('cca-battle-tab', 'exp1');
    const html = renderToStaticMarkup(createElement(ScenarioSelect, { onBack: () => {}, onStart: () => {} }));
    const tabs = [...html.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map((x) => x[0]);
    expect(tabs).toHaveLength(2);
    const attr = (el: string, a: string) => new RegExp(`${a}="([^"]*)"`).exec(el)?.[1];
    expect(tabs.map((t) => attr(t, 'aria-selected'))).toEqual(['false', 'true']);
    expect(tabs.map((t) => attr(t, 'tabindex'))).toEqual(['-1', '0']);
    expect(tabs.map((t) => attr(t, 'aria-controls'))).toEqual(['battle-list', 'battle-list']);
    expect(html).toMatch(/role="tablist" aria-label="Battles"/);
    const panel = /<div[^>]*role="tabpanel"[^>]*>/.exec(html)![0];
    expect(attr(panel, 'id')).toBe('battle-list');
    expect(attr(panel, 'aria-labelledby')).toBe(attr(tabs[1], 'id'));
    expect(html).toContain('Marathon'); // the Expansion #1 list is the one shown
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

  it('the switch: the checkbox carries the state, the visible on/off word is hidden from screen readers', () => {
    const html = (on: boolean) => renderToStaticMarkup(createElement(OptionToggle, { sc: scenarioById('120'), id: 'tacticalFlexibility', on, onToggle: () => {} }));
    expect(html(true)).toMatch(/<input type="checkbox" checked=""\/>/);
    expect(html(true)).toContain('<i aria-hidden="true">on</i>');
    expect(html(false)).not.toMatch(/checked/);
    expect(html(false)).toContain('<i aria-hidden="true">off</i>');
    expect(html(false)).toContain(OPTIONAL_RULES.tacticalFlexibility.name);
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

describe('controller notices', () => {
  /** A controller waiting for the human's first decision, animations skipped, with its event animation exposed. */
  async function settled(id: string, human: Side) {
    const c = new GameController({ ...newSessionConfig(id, human, 'recruit'), seed: 9 }, new RandomOpponent());
    for (let i = 0; i < 400 && !c.view.pending; i++) {
      c.hurry();
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(c.view.pending, id).not.toBeNull();
    c.hurry();
    const animate = (e: GameEvent, state: GameState) =>
      (c as unknown as { animate(q: QueuedEvent): Promise<void> }).animate({ e, state });
    return { c, animate };
  }
  const lastLog = (c: GameController) => c.view.log[c.view.log.length - 1].text;

  it('a war machine abandoned after evading replaces the "Evaded" flash on its hex with "Abandoned"', async () => {
    const { c, animate } = await settled('118', 'bottom');
    try {
      const s0 = c.driver.state;
      const hwm = s0.units.find((u) => u.type === 'HWM' && u.side === 'bottom')!;
      expect(hwm).toBeDefined();
      const to = hexId(7, 3);
      const moved = cloneState(s0);
      moved.units.find((u) => u.id === hwm.id)!.hex = to;
      await animate({ t: 'evade', id: hwm.id, path: [hwm.hex, to] }, moved);
      expect(c.view.flashes.filter((f) => f.hex === to).map((f) => f.text)).toEqual(['Evaded']);
      const gone = cloneState(moved);
      gone.units = gone.units.filter((u) => u.id !== hwm.id);
      await animate({ t: 'removed', id: hwm.id, reason: 'war machine abandoned' }, gone);
      expect(c.view.flashes.filter((f) => f.hex === to).map((f) => f.text)).toEqual(['Abandoned']);
      expect(lastLog(c)).toBe('Roman Heavy War Machines abandoned (no banner).');
    } finally {
      c.dispose();
    }
  });

  it('a unit removed for any other reason gets the generic notice', async () => {
    const { c, animate } = await settled('118', 'bottom');
    try {
      const s0 = c.driver.state;
      const unit = s0.units.find((u) => u.side === 'bottom' && u.type !== 'HWM')!;
      const gone = cloneState(s0);
      gone.units = gone.units.filter((u) => u.id !== unit.id);
      await animate({ t: 'removed', id: unit.id, reason: 'left the field' }, gone);
      expect(c.view.flashes.filter((f) => f.hex === unit.hex).map((f) => f.text)).toEqual(['Removed']);
      expect(lastLog(c)).toBe(`Roman ${UNIT_STATS[unit.type].name} removed from the field (no banner).`);
    } finally {
      c.dispose();
    }
  });

  it('a lost command card is named to the human, and kept hidden for the computer', async () => {
    const { c, animate } = await settled('112', 'bottom');
    vi.useFakeTimers();
    try {
      const play = async (e: GameEvent, st: GameState) => {
        const done = animate(e, st);
        await vi.advanceTimersByTimeAsync(0);
        await done;
      };
      const s0 = c.driver.state;
      const mine = s0.players.bottom.hand[0];
      const title = CARD_DEFS[cardKind(mine)].title;
      await play({ t: 'cardLost', side: 'bottom', card: mine }, s0);
      expect(c.view.toast).toMatchObject({ kind: 'notice', text: `You lose a command card: ${title}` });
      expect(lastLog(c)).toBe(`The ${s0.players.bottom.army} army loses a command card (${title}).`);
      const theirs = s0.players.top.hand[0];
      await play({ t: 'cardLost', side: 'top', card: theirs }, s0);
      expect(lastLog(c)).toBe(`The ${s0.players.top.army} army loses a command card.`);
      await vi.advanceTimersByTimeAsync(2800); // the second notice waits for the first
      expect(c.view.toast).toMatchObject({ kind: 'notice', text: `${s0.players.top.army} loses a command card` });
      expect(c.view.toast!.text).not.toContain(CARD_DEFS[cardKind(theirs)].title);
    } finally {
      vi.useRealTimers();
      c.dispose();
    }
  });
});

describe('controller toasts', () => {
  type Toaster = { toast(text: string, kind: 'turn' | 'notice', ms: number): void };
  /** A controller on 112 waiting for the human, with fake timers from here on. */
  async function onHellespont() {
    const c = new GameController({ ...newSessionConfig('112', 'bottom', 'recruit'), seed: 9 }, new RandomOpponent());
    for (let i = 0; i < 400 && !c.view.pending; i++) {
      c.hurry();
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(c.view.pending).not.toBeNull();
    c.hurry();
    vi.useFakeTimers();
    const s0 = c.driver.state;
    const lose = async () => {
      const done = (c as unknown as { animate(q: QueuedEvent): Promise<void> }).animate({ e: { t: 'cardLost', side: 'bottom', card: s0.players.bottom.hand[0] }, state: s0 });
      await vi.advanceTimersByTimeAsync(0);
      await done;
    };
    return { c, lose, toast: (c as unknown as Toaster).toast.bind(c) };
  }
  afterEach(() => vi.useRealTimers());

  it('a card-loss notice stays up for its full time: "Your turn" waits for it, then shows for its own', async () => {
    const { c, lose, toast } = await onHellespont();
    try {
      await lose();
      const notice = c.view.toast;
      expect(notice).toMatchObject({ kind: 'notice' });
      await vi.advanceTimersByTimeAsync(300);
      toast('Your turn', 'turn', 1400);
      expect(c.view.toast).toBe(notice);
      await vi.advanceTimersByTimeAsync(2400); // 2.7 s after the notice appeared
      expect(c.view.toast).toBe(notice);
      await vi.advanceTimersByTimeAsync(200); // 2.9 s: the notice is over (at 2.8 s)
      expect(c.view.toast).toMatchObject({ kind: 'turn', text: 'Your turn' });
      await vi.advanceTimersByTimeAsync(1200); // 4.1 s
      expect(c.view.toast).toMatchObject({ kind: 'turn' });
      await vi.advanceTimersByTimeAsync(200); // 4.3 s: its own 1.4 s are over
      expect(c.view.toast).toBeNull();
    } finally {
      c.dispose();
    }
  });

  it('two notices show one after the other; "Your turn" replaces nothing but another "Your turn"', async () => {
    const { c, lose, toast } = await onHellespont();
    try {
      toast('Your turn', 'turn', 1400);
      await lose(); // a notice may replace "Your turn" at once
      const first = c.view.toast;
      expect(first).toMatchObject({ kind: 'notice' });
      await lose();
      expect(c.view.toast).toBe(first);
      await vi.advanceTimersByTimeAsync(2850);
      expect(c.view.toast).toMatchObject({ kind: 'notice' });
      expect(c.view.toast).not.toBe(first);
      await vi.advanceTimersByTimeAsync(2850);
      expect(c.view.toast).toBeNull();
    } finally {
      c.dispose();
    }
  });

  it('a "Your turn" still waiting when the human has already answered is dropped', async () => {
    const { c, lose, toast } = await onHellespont();
    try {
      await lose();
      toast('Your turn', 'turn', 1400);
      c.driver.answers.push({ kind: 'endMove' }); // constructed: the human has answered since
      await vi.advanceTimersByTimeAsync(2850);
      expect(c.view.toast).toBeNull();
    } finally {
      c.driver.answers.pop();
      c.dispose();
    }
  });
});

describe('undo during deployment (117 Asculum)', () => {
  /** Let the controller run until the human has a decision again. */
  async function waitHuman(c: GameController) {
    for (let i = 0; i < 400 && !c.view.pending; i++) {
      c.hurry();
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(c.view.pending).not.toBeNull();
  }

  it('the human may take back his own placement while he is still placing; not once the computer has placed', async () => {
    const c = new GameController({ ...newSessionConfig('117', 'bottom', 'recruit'), seed: 9 }, new RandomOpponent());
    try {
      await waitHuman(c);
      const first = c.view.pending!;
      expect(first).toMatchObject({ kind: 'placeLeader', side: 'bottom' });
      expect(c.view.canUndo).toBe(false);
      c.answer({ kind: 'hex', hex: (first as { options: number[] }).options[0] });
      await waitHuman(c);
      expect(c.view.pending).toMatchObject({ kind: 'placeLeader', side: 'bottom' });
      expect(c.view.pending).not.toEqual(first);
      expect(c.view.canUndo).toBe(true);
      c.undo();
      expect(c.view.pending).toEqual(first);
      expect(c.view.canUndo).toBe(false);
      expect(c.driver.answers).toEqual([]);
      // both Roman leaders placed: the Epirotes place theirs, then the first turn; nothing to take back
      for (let k = 0; k < 2; k++) {
        const p = c.view.pending as { kind: string; options: number[] };
        expect(p.kind).toBe('placeLeader');
        c.answer({ kind: 'hex', hex: p.options[0] });
        await waitHuman(c);
      }
      expect(c.view.pending?.kind).toBe('playCard');
      expect(c.view.canUndo).toBe(false);
    } finally {
      c.dispose();
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
    // impassable hills say so, like the sea (Marathon's right edge; Lake Trasimenus in the base game)
    for (const id of ['101', '006']) {
      const g = createGame(scenarioById(id).setup, 1);
      expect(terrainTipLines(g, g.terrain.indexOf('steep'), false, 'Steep Hill'), id).toEqual(['Terrain: Steep Hill', 'Impassable; blocks line of sight']);
    }
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
    expect(leadershipHint(s, 'bottom', 'leadershipAny', [])).toBe('A satrap commands only his own unit: click him to order him with it — or order just 1 unit.');
    expect(leadershipHint(s, 'bottom', 'inspiredC', [leaderId(s, 0), 'u1'])).toMatch(/^A satrap commands only his own unit: he is ordered with it/);
  });

  it('satraps who all stand alone are not told to order one with his unit', () => {
    const s = build(pos([{ side: 'bottom', at: [7, 6], traits: SATRAP }, { side: 'bottom', at: [7, 4], traits: SATRAP }]));
    const hint = leadershipHint(s, 'bottom', 'leadershipAny', []);
    expect(hint).toBe('A satrap commands only his own unit: standing alone, he orders only himself — or order just 1 unit.');
    expect(hint).not.toMatch(/with it/);
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
