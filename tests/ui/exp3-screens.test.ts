// Expansion #3 screens (The Roman Civil Wars, rules-reference §18.7–§18.11, §20): the picker tab, the rules reference, the
// dice-order turn of 310 (its dice, victims, orders, the computer's wording, a roll that orders nothing), the forced
// placement and the reinforcements with fixed entry of 308, the board (hills under camps, steep slopes, immobile units,
// commanded leaders) and the tooltips of the new units, leaders and objectives. The terrain tooltips are in
// terrain-tips.test.ts.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GameDriver, UNIT_STATS, cloneState, createGame, hexId, setTerrain,
  type Decision, type DieFace, type GameEvent, type GameState, type HexId, type QueuedEvent, type Side, type Unit, type UnitType,
} from '../../src/engine';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import { Board } from '../../src/ui/game/Board';
import { GameController, newSessionConfig } from '../../src/ui/game/controller';
import { RandomOpponent } from '../../src/ui/game/opponent';
import {
  IMMOBILE_TIP, ambushTexts, boardUi, commandFallbackNote, commandTipLine, counterAttackNote, diceAssignClick, diceOrderSlots, diceRollSummary,
  diceSlotChoices, diceSlotText, diceTurnOrders, diceTurnText, diceTurnVictim, enteredTipLine, firstOrderDie, fixedEntryHexes,
  forcedMarchLine, objectiveTipLines, placeUnitPrompt, selectAllUnits, unitSummary, type DiceTurn, type UiSel,
} from '../../src/ui/game/uiModel';
import { PICKER_TABS, battlesOf, randomPick } from '../../src/ui/screens/picker';
import { Expansion3 } from '../../src/ui/screens/RulesReference';
import { H, build, forceDice, must, noFirstStrike, type Pos } from '../rules/helpers';

afterEach(() => forceDice([]));

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i).padStart(3, '0'));
const game = (id: string, seed = 1) => createGame(scenarioById(id).setup, seed);
const SEL: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null };
const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const unitOf = (s: GameState, side: Side, type: UnitType) => s.units.find((u) => u.side === side && u.type === type)!;
const board = (s: GameState, human: Side = 'bottom') => renderToStaticMarkup(createElement(Board, {
  state: s, flipped: human === 'top', humanSide: human, walking: {}, highlights: new Map(), leaderHighlights: new Map(), badges: new Map(),
  sectionShade: new Set<HexId>(), pathPreview: null, combat: null, flashes: [], orderedIds: new Set<string>(), doneIds: new Set<string>(),
}));
const count = (html: string, re: RegExp) => html.match(re)?.length ?? 0;

// ---------------------------------------------------------------------------------------------

describe('battle picker', () => {
  it('the Expansion #3 tab lists the 19 battles 301–319 in order, after the other three boxes', () => {
    expect(PICKER_TABS.map((t) => t.id)).toEqual(['base', 'exp1', 'exp2', 'exp3']);
    expect(PICKER_TABS[3]).toEqual({ id: 'exp3', label: 'Roman Civil Wars' });
    expect(ids(battlesOf(SCENARIOS, 'exp3'))).toEqual(range(301, 319));
    expect(scenarioById('301').name).toBe('Colline Gate');
    expect(scenarioById('319').name).toBe('Munda');
  });
  it('Random battle can pick an Expansion #3 battle (and its side)', () => {
    const all = SCENARIOS;
    const i = all.findIndex((s) => s.id === '310');
    // the pick runs over every battle but the one shown: a roll landing on 310's slot picks it
    const others = all.filter((s) => s.id !== '001');
    const r = (others.findIndex((s) => s.id === '310') + 0.5) / others.length;
    const rolls = [r, 0.7];
    expect(randomPick(all, '001', () => rolls.shift()!)).toEqual({ battle: all[i], side: 'top' });
  });
});

describe('rules reference: the Expansion #3 tab', () => {
  const tab = text(renderToStaticMarkup(createElement(Expansion3)));
  it('covers the legions, Caesar, the new terrain, objectives and battle rules', () => {
    for (const t of [
      'Marian legions', 'Julian legions', 'Julius Caesar', 'City wall', 'Fighting on a wall', 'strikes first', 'Impassable walls and towns',
      'Camp or wall on a hill', 'Steep slopes', 'Ship markers', 'Leaders score at the exit', 'The hillock', 'Dice orders', 'Counter Attack',
      'Reinforcements', 'Immobile recruits', 'A growing hand', 'Two commands', '301–319',
    ]) expect(tab, t).toContain(t);
  });
});

// ---------------------------------------------------------------------------------------------
// dice orders (310, §18.10)

/** The Numidians (top) order by 2 dice and move first: LC, MC, HI with Saburra, LI; a Caesarian MC and LC. */
const numidia: Pos = {
  first: 'top',
  orderDice: { top: 2 },
  topArmy: 'Numidian',
  bottomArmy: 'Caesarian',
  units: [
    { side: 'top', type: 'LC', at: [4, 4] }, { side: 'top', type: 'MC', at: [4, 6] }, { side: 'top', type: 'HI', at: [2, 8] },
    { side: 'top', type: 'LI', at: [0, 2] }, { side: 'bottom', type: 'MC', at: [7, 6] }, { side: 'bottom', type: 'LC', at: [7, 9] },
  ],
  leaders: [{ side: 'top', name: 'Saburra', at: [2, 8] }, { side: 'bottom', name: 'Rufus', at: [8, 3] }],
};
/** A driver at the first Numidian turn, after an order roll of `faces`. */
function rolled(faces: DieFace[], p: Pos = numidia): GameDriver {
  const s = build(p);
  noFirstStrike(s);
  forceDice(faces);
  return new GameDriver(s);
}

describe('dice orders: the turn panel model', () => {
  const s = build(numidia);
  const saburra = s.leaders.find((l) => l.name === 'Saburra')!.id;

  it('each die: a flag or swords falls on a unit, a symbol orders a piece of its kind, a symbol with none is lost', () => {
    const slots = diceOrderSlots(s, 'top', ['flag', 'swords', 'light', 'leader']);
    expect(slots.map((x) => x.role)).toEqual(['flag', 'swords', 'order', 'order']);
    expect(slots[2].options).toEqual(['u1', 'u4']);
    expect(slots[3].options).toEqual([saburra]);
    expect(slots.map(diceSlotText)).toEqual(['A unit falls back', 'A unit loses a block', 'Orders a light unit', 'Orders a leader and his unit']);
    // no heavy unit left: a heavy die is lost
    const noHeavy = build({ ...numidia, units: numidia.units!.filter((u) => u.type !== 'HI'), leaders: [] });
    const lost = diceOrderSlots(noHeavy, 'top', ['heavy', 'leader']);
    expect(lost.map((x) => x.role)).toEqual(['lost', 'lost']);
    expect(lost.map(diceSlotText)).toEqual(['No heavy unit: lost', 'No leader: lost']);
  });

  it('the dice are assigned by clicking pieces: the selected die first, then the next free one; a click frees a die', () => {
    const faces: DieFace[] = ['light', 'light'];
    expect(firstOrderDie(s, 'top', faces)).toBe(0);
    let r = diceAssignClick(s, 'top', faces, [null, null], 0, 'u1')!;
    expect(r).toEqual({ ids: ['u1', null], active: 1 });
    // the second light die cannot order the same unit again
    expect(diceSlotChoices(s, 'top', faces, r.ids, 1)).toEqual(['u4']);
    expect(diceAssignClick(s, 'top', faces, r.ids, 1, 'u2')).toBeNull(); // a medium unit: no die fits
    r = diceAssignClick(s, 'top', faces, r.ids, 1, 'u4')!;
    expect(r).toEqual({ ids: ['u1', 'u4'], active: null });
    // clicking an ordered unit frees its die, which becomes the selected one
    expect(diceAssignClick(s, 'top', faces, r.ids, null, 'u1')).toEqual({ ids: [null, 'u4'], active: 0 });
    // a helmet orders Saburra, and then the heavy die cannot order his unit as well
    const hf: DieFace[] = ['leader', 'heavy'];
    const h = diceAssignClick(s, 'top', hf, [null, null], 0, saburra)!;
    expect(h.ids).toEqual([saburra, null]);
    expect(diceSlotChoices(s, 'top', hf, h.ids, 1)).toEqual([]);
    expect(h.active).toBeNull();
    // a roll of flags and swords only: nothing to assign
    expect(firstOrderDie(s, 'top', ['flag', 'swords'])).toBeNull();
  });

  it('the board marks the pieces the selected die can order, and badges the ones ordered with their die', () => {
    const d = rolled(['light', 'heavy']);
    expect(d.pending).toMatchObject({ kind: 'diceOrders', side: 'top', faces: ['light', 'heavy'] });
    const st = d.state;
    const ui = boardUi(st, d.pending, { ...SEL, diceIds: ['u1', null], diceActive: 1 }, 'top');
    expect(ui.highlights.get(H(4, 4))).toBe('selected');
    expect(ui.badges.get(H(4, 4))).toBe('Die 1');
    expect(ui.highlights.get(H(2, 8))).toBe('eligible'); // the HI, for the heavy die
    expect(ui.highlights.has(H(0, 2))).toBe(false); // the LI: the light die is used
    // the assignment the panel builds is a legal answer
    must(d, { kind: 'assign', ids: ['u1', 'u3'] });
    expect(Object.keys(d.state.turn.ordered).sort()).toEqual(['u1', 'u3']);
  });

  it('the victims of flags and swords are the own units, clickable on the board', () => {
    const d = rolled(['flag', 'light']);
    const p = d.pending as Extract<Decision, { kind: 'diceVictim' }>;
    expect(p).toMatchObject({ kind: 'diceVictim', face: 'flag', options: ['u1', 'u2', 'u3', 'u4'] });
    const ui = boardUi(d.state, p, SEL, 'top');
    for (const id of p.options) expect(ui.highlights.get(d.state.units.find((u) => u.id === id)!.hex), id).toBe('option');
    expect(ui.highlights.has(H(7, 6))).toBe(false);
  });

  it('the roll in the dice tray: what falls on the own units, then what it can order; nothing about orders when it orders nothing', () => {
    expect(diceRollSummary(s, 'top', ['flag', 'light'], true)).toBe('A unit falls back; choose 1 unit to order');
    expect(diceRollSummary(s, 'top', ['light', 'light'], true)).toBe('Choose up to 2 units to order');
    expect(diceRollSummary(s, 'top', ['light', 'light'], false)).toBe('Up to 2 units to order');
    expect(diceRollSummary(s, 'top', ['swords', 'swords'], false)).toBe('2 units lose a block');
    // two heavy dice, one heavy unit: one order
    expect(diceRollSummary(s, 'top', ['heavy', 'heavy'], false)).toBe('1 unit to order');
    const noHeavy = build({ ...numidia, units: numidia.units!.filter((u) => u.type !== 'HI'), leaders: [] });
    expect(diceRollSummary(noHeavy, 'top', ['heavy', 'flag'], true)).toBe('A unit falls back');
    expect(diceRollSummary(noHeavy, 'top', ['heavy', 'leader'], true)).toBe('No effect');
  });

  it('the turn told in words (the computer\'s turn banner): the roll, the victims, the orders', () => {
    let t: DiceTurn = { side: 'top', turn: 1, faces: ['flag', 'light'], used: [null, null], done: false };
    expect(diceTurnText(t, false)).toBe('Order dice: flag, light (green).');
    t = diceTurnVictim(t, 'flag', 'Medium Cavalry');
    expect(t.used).toEqual(['Medium Cavalry', null]);
    expect(diceTurnText(t, false)).toBe('Order dice: flag, light (green). Fell back: Medium Cavalry.');
    t = diceTurnOrders(s, t, [null, 'u1']);
    expect(diceTurnText(t, true)).toBe('Order dice: flag, light (green). Fell back: Medium Cavalry. Ordered: Light Cavalry.');
    // a helmet names the leader with his unit; nothing ordered says so once the orders are past
    const h = diceTurnOrders(s, { side: 'top', turn: 1, faces: ['leader', 'swords'], used: [null, 'Light Infantry'], done: false }, [saburra, null]);
    expect(diceTurnText(h, true)).toBe('Order dice: helmet, swords. Lost a block: Light Infantry. Ordered: Saburra with his Heavy Infantry.');
    expect(diceTurnText({ side: 'top', turn: 1, faces: ['heavy', 'heavy'], used: [null, null], done: false }, true)).toBe('Order dice: heavy (red), heavy (red). Ordered: nothing.');
  });

  it('Counter Attack against a dice side copies nothing, and says so', () => {
    const utica = game('310');
    expect(counterAttackNote(utica, 'bottom')).toBe('The Numidian army orders by dice and plays no cards: Counter Attack has nothing to copy and orders nothing.');
    expect(counterAttackNote(utica, 'top')).toBeNull();
    expect(counterAttackNote(game('001'), 'bottom')).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------
// the controller: its dice-order turn, "Your turn", the log, the forced placement and its undo

async function settled(c: GameController) {
  for (let i = 0; i < 400 && !c.view.pending; i++) {
    c.hurry();
    await new Promise((r) => setTimeout(r, 5));
  }
  c.hurry();
  return (e: GameEvent, state: GameState) => (c as unknown as { animate(q: QueuedEvent): Promise<void> }).animate({ e, state });
}
const lastLog = (c: GameController) => c.view.log[c.view.log.length - 1].text;

describe('dice orders: the controller (310)', () => {
  it('the dice side gets "Your turn"; its roll is logged, starts the turn panel and the tray says what it can do (from the snapshot)', async () => {
    const c = new GameController({ ...newSessionConfig('310', 'top', 'recruit'), seed: 3 }, new RandomOpponent());
    try {
      const animate = await settled(c);
      const s0 = cloneState(c.driver.state);
      s0.active = 'top';
      s0.turn.number = 2;
      await animate({ t: 'turnStart', side: 'top', turn: 2 }, s0);
      expect(c.view.toast).toMatchObject({ text: 'Your turn', kind: 'turn' });
      await animate({ t: 'roll', purpose: 'diceOrders', faces: ['flag', 'light'], scoring: [false, true], by: null, against: null }, s0);
      expect(lastLog(c)).toBe('Saburra rolls the order dice: flag, light (green).');
      expect(c.view.diceTurn).toEqual({ side: 'top', turn: 2, faces: ['flag', 'light'], used: [null, null], done: false });
      expect(c.view.dice?.subtitle).toBe('A unit falls back; choose 1 unit to order');
      expect(c.view.orderShow).toBeNull(); // the human sees his own panel, no roll on the board
      // a snapshot with no light unit left: the tray says nothing about ordering (not the driver's current state)
      const none = cloneState(s0);
      none.units = none.units.filter((u) => u.side !== 'top' || UNIT_STATS[u.type].cls !== 'light');
      await animate({ t: 'roll', purpose: 'diceOrders', faces: ['flag', 'light'], scoring: [false, true], by: null, against: null }, none);
      expect(c.view.dice?.subtitle).toBe('A unit falls back');
      // what the dice ordered
      const lc = unitOf(s0, 'top', 'LC');
      await animate({ t: 'ordered', side: 'top', ids: [lc.id] }, s0);
      expect(lastLog(c)).toBe('The Numidian army orders: Light Cavalry.');
    } finally {
      c.dispose();
    }
  });

  it('the computer\'s roll is shown on the board, as its cards are; a Counter Attack against it is logged as copying nothing', async () => {
    const c = new GameController({ ...newSessionConfig('310', 'bottom', 'recruit'), seed: 3 }, new RandomOpponent());
    try {
      const animate = await settled(c);
      const s0 = cloneState(c.driver.state);
      s0.active = 'top';
      const shown = animate({ t: 'roll', purpose: 'diceOrders', faces: ['heavy', 'leader'], scoring: [true, true], by: null, against: null }, s0);
      expect(c.view.orderShow).toMatchObject({ side: 'top', faces: ['heavy', 'leader'] });
      await shown;
      expect(c.view.orderShow).toBeNull();
      const ca = cloneState(c.driver.state);
      ca.active = 'bottom';
      ca.turn.effective = null;
      await animate({ t: 'cardPlayed', side: 'bottom', card: 0, kind: 'counterAttack', effective: 'counterAttack' }, ca);
      expect(lastLog(c)).toBe(`${ca.players.bottom.commander} plays Counter Attack: nothing to copy, no orders.`);
    } finally {
      c.dispose();
    }
  });
});

describe('forced placement (308)', () => {
  it('the prompt names the unit and the board highlights and badges the hexes it may go to', () => {
    const s = game('308');
    const p = s.special.placeUnits[0];
    expect(p.unit.type).toBe('MI');
    const d: Extract<Decision, { kind: 'placeUnit' }> = { kind: 'placeUnit', side: 'bottom', unit: p.unit.id, options: p.hexes };
    expect(placeUnitPrompt(s, d)).toEqual({
      title: 'Reinforcement: place your Medium Infantry',
      text: 'Before you play a card, the Roman Medium Infantry waiting off the board must be placed on one of the 5 highlighted hexes. It is then an ordinary unit, and this turn\'s card may order it.',
    });
    const ui = boardUi(s, d, SEL, 'bottom');
    for (const h of p.hexes) {
      expect(ui.highlights.get(h)).toBe('option');
      expect(ui.badges.get(h)).toBe('Place');
    }
    expect(p.hexes).toEqual([hexId(8, 0), hexId(8, 1), hexId(8, 2), hexId(8, 3), hexId(8, 4)]);
  });

  it('the human may take the placement back until he plays his card; its log line goes with it', async () => {
    const c = new GameController({ ...newSessionConfig('308', 'bottom', 'recruit'), seed: 3 }, new RandomOpponent());
    try {
      await settled(c);
      // the Gauls have entered before the Romans' first turn: the turn starts with the placement
      const s = game('308', 3);
      s.special.reserveEntered = true;
      c.driver = new GameDriver(s, { snapshots: true });
      c.driver.drainEvents();
      (c as unknown as { set(p: object): void }).set({ pending: c.driver.pending, log: [] });
      expect(c.view.pending).toMatchObject({ kind: 'placeUnit', side: 'bottom' });
      c.answer({ kind: 'hex', hex: hexId(8, 2) });
      await settled(c);
      expect(c.view.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
      expect(c.view.canUndo).toBe(true);
      expect(c.view.log.map((l) => l.text)).toContain('The Roman Medium Infantry arrives as a reinforcement.');
      c.undo();
      expect(c.view.pending).toMatchObject({ kind: 'placeUnit', side: 'bottom' });
      expect(c.view.canUndo).toBe(false);
      expect(c.view.log.map((l) => l.text)).not.toContain('The Roman Medium Infantry arrives as a reinforcement.');
      // placed again, then the card played: no more undo
      c.answer({ kind: 'hex', hex: hexId(8, 0) });
      await settled(c);
      expect(c.driver.state.units.find((u) => u.type === 'MI' && u.hex === hexId(8, 0))).toBeDefined();
      c.answer({ kind: 'playCard', card: c.driver.state.players.bottom.hand[0] });
      await settled(c);
      expect(c.view.canUndo).toBe(false);
    } finally {
      c.dispose();
    }
  });
});

describe('forced placement (308): undo with a full log', () => {
  it('takes back the placement\'s lines by their ids, though the capped log has dropped its oldest lines since', async () => {
    const c = new GameController({ ...newSessionConfig('308', 'bottom', 'recruit'), seed: 3 }, new RandomOpponent());
    try {
      await settled(c);
      const s = game('308', 3);
      s.special.reserveEntered = true;
      c.driver = new GameDriver(s, { snapshots: true });
      c.driver.drainEvents();
      // a long game: the log is at its cap of 400 lines, so every new line pushes the oldest one out
      const old = Array.from({ length: 400 }, (_, i) => ({ id: -1000 + i, text: `old line ${i}`, kind: 'info' as const }));
      (c as unknown as { set(p: object): void }).set({ pending: c.driver.pending, log: old });
      c.answer({ kind: 'hex', hex: hexId(8, 2) });
      await settled(c);
      const placed = c.view.log.map((l) => l.text);
      expect(placed).toContain('The Roman Medium Infantry arrives as a reinforcement.');
      expect(c.view.log).toHaveLength(400);
      expect(placed).not.toContain('old line 0'); // pushed out by the placement's lines
      c.undo();
      expect(c.view.pending).toMatchObject({ kind: 'placeUnit', side: 'bottom' });
      // only the lines logged before the placement are left (the ones the cap had dropped stay dropped)
      expect(c.view.log.length).toBeGreaterThan(300);
      expect(c.view.log.length).toBeLessThan(400);
      expect(c.view.log.every((l) => l.id < 0 && l.text.startsWith('old line'))).toBe(true);
      expect(c.view.log[c.view.log.length - 1].text).toBe('old line 399');
    } finally {
      c.dispose();
    }
  });
});

describe('reinforcements with fixed entry (308)', () => {
  it('one button, whatever the section; the entry hexes are marked while a Leadership card can bring them in', () => {
    const s = game('308');
    const t = ambushTexts(s, 'Vercingetorix');
    expect(t).toMatchObject({ fixed: true, free: 5, label: 'Reinforcements enter' });
    expect(t.button).toBe("Vercingetorix's reinforcements enter on the 5 free marked entry hexes, one unit per empty hex, whatever the section. The card orders nothing else.");
    expect(t.move).toBe("Vercingetorix's reinforcements enter on the marked entry hexes: pick a piece, then a highlighted hex. They cannot move on this turn, but may battle. Vercingetorix joins one of them.");
    const entry = [hexId(3, 0), hexId(4, 0), hexId(5, 0), hexId(6, 0), hexId(7, 0)];
    expect(fixedEntryHexes(s, 'top', 'leadershipAny')).toEqual(entry);
    expect(fixedEntryHexes(s, 'top', 'order2L')).toEqual([]);
    expect(fixedEntryHexes(s, 'bottom', 'leadershipAny')).toEqual([]);
    const ui = boardUi(s, { kind: 'orders', side: 'top', card: 'inspiredR', mirrored: false }, SEL, 'top');
    for (const h of entry) {
      expect(ui.highlights.get(h)).toBe('placeEmpty');
      expect(ui.badges.get(h)).toBe('Entry');
    }
    // an occupied entry hex is not offered, and the tooltip counts the free ones
    s.units[0].hex = entry[0];
    expect(fixedEntryHexes(s, 'top', 'leadershipAny')).toEqual(entry.slice(1));
    expect(ambushTexts(s, 'Vercingetorix')).toMatchObject({ free: 4 });
    expect(ambushTexts(s, 'Vercingetorix').button).toBe(
      "Vercingetorix's reinforcements enter on the 4 free marked entry hexes, one unit per empty hex, whatever the section. The card orders nothing else.");
    // a leader on a hex fills it as well; one hex left is said in the singular
    s.leaders[0].hex = entry[1];
    s.units[1].hex = entry[2];
    s.units[2].hex = entry[3];
    expect(fixedEntryHexes(s, 'top', 'leadershipAny')).toEqual([entry[4]]);
    expect(ambushTexts(s, 'Vercingetorix')).toMatchObject({ free: 1 });
    expect(ambushTexts(s, 'Vercingetorix').button).toBe(
      "Vercingetorix's reinforcements enter on the one free marked entry hex, one unit per empty hex, whatever the section. The card orders nothing else.");
    // every entry hex taken: nobody could enter, which the tooltip says plainly and the screen does not offer the button for
    s.units[3].hex = entry[4];
    expect(fixedEntryHexes(s, 'top', 'leadershipAny')).toEqual([]);
    expect(ambushTexts(s, 'Vercingetorix')).toMatchObject({ fixed: true, free: 0 });
    expect(ambushTexts(s, 'Vercingetorix').button).toBe("Vercingetorix's reinforcements cannot enter now: every entry hex is occupied.");
    // an ambush on the baseline (206) keeps a button per section
    expect(ambushTexts(game('206'), 'Marcellus')).toMatchObject({ fixed: false, free: null, label: 'Ambush' });
  });

  it('an entered unit says it cannot move again this turn', () => {
    const s = game('308');
    const wa = s.special.reserveUnits.find((u) => u.type === 'WA')!;
    expect(enteredTipLine(s, { ...wa, hex: hexId(4, 0) })).toBeNull();
    s.turn.ordered[wa.id] = {
      id: wa.id, isLeader: false, startHex: -1, moved: 0, moveDone: true, move2Done: false, battlesLeft: 1, canBattle: true, mustBattle: false,
      enteredHexThisTurn: true, attachedThisTurn: false, fromReserve: true,
    };
    expect(enteredTipLine(s, { ...wa, hex: hexId(4, 0) })).toBe('Entered this turn: cannot move again until next turn, but may battle');
    expect(enteredTipLine(s, { ...wa, hex: -1 })).toBeNull();
  });
});

describe('a reserve leader entering the board (the controller)', () => {
  /** The leader's own `move` event from off the board onto a unit of his side, as the engine emits it. */
  async function enters(id: string, name: string) {
    const lead = scenarioById(id).setup.reserveLeaders.find((l) => l.name === name)!;
    const c = new GameController({ ...newSessionConfig(id, lead.side, 'recruit'), seed: 3 }, new RandomOpponent());
    try {
      const animate = await settled(c);
      // the ambush springs: the reserve leader leaves the reserve and waits off the board among the leaders (flow.ts)
      const off = cloneState(c.driver.state);
      off.leaders.push(...off.special.reserveLeaders);
      off.special.reserveLeaders = [];
      (c as unknown as { set(p: object): void }).set({ display: off });
      const after = cloneState(off);
      const leader = after.leaders.find((l) => l.name === name)!;
      expect(leader.hex, name).toBe(-1);
      const unit = after.units.find((u) => u.side === leader.side && u.hex >= 0)!;
      leader.hex = unit.hex;
      const before = c.view.log.length;
      await animate({ t: 'move', id: leader.id, path: [unit.hex] }, after);
      return { log: c.view.log.slice(before).map((l) => l.text), flashes: c.view.flashes.map((f) => f.text) };
    } finally {
      c.dispose();
    }
  }

  it('308: Vercingetorix is told to arrive with the unit he joins, and flashed on the board', async () => {
    const r = await enters('308', 'Vercingetorix');
    expect(r.log).toHaveLength(1);
    expect(r.log[0]).toMatch(/^Vercingetorix arrives with the /);
    expect(r.flashes).toEqual(['Vercingetorix']);
  });

  it('005 and 206: Mago and Marcellus enter with the ambush force alone, so no "arrives" line and no flash', async () => {
    for (const [id, name] of [['005', 'Mago'], ['206', 'Marcellus']]) {
      const r = await enters(id, name);
      expect(r.log, id).toEqual([]);
      expect(r.flashes, id).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// the board and the unit, leader and objective tooltips

describe('the board', () => {
  it('308: camps and walls on their hills, the steep slopes; a camp razed redraws as a hill', () => {
    const s = game('308');
    const html = board(s);
    expect(count(html, /class="scarp"/g)).toBe(12);
    const camps = count(html, /class="camps"/g);
    expect(camps).toBe(1);
    const razed = cloneState(s);
    setTerrain(razed, { emit: () => {}, invalid: () => {} }, hexId(2, 5), 'hill');
    const after = board(razed);
    expect(after).not.toBe(html);
    expect(count(after, /class="scarp"/g)).toBe(12); // still a hill, so still a slope to its forest neighbours
    // a battle without the rule draws no slopes
    expect(board(game('309'))).not.toContain('steep-slopes');
  });

  it('306: the immobile recruits carry a badge; nobody else does', () => {
    const s = game('306');
    expect(s.units.filter((u) => u.immobile).map((u) => [u.type, u.hex])).toEqual([['AX', hexId(8, 4)], ['AX', hexId(8, 5)]]);
    expect(count(board(s), /class="immobile-badge"/g)).toBe(2);
    expect(board(game('308'))).not.toContain('immobile-badge');
  });

  it('304: a leader of a command shows its badge when alone, or with a unit of another command', () => {
    const s = game('304');
    const units = s.units.filter((u) => u.command).length;
    expect(count(board(s), /class="command-badge"/g)).toBe(units); // both leaders start with their own command
    const alone = cloneState(s);
    const perpenna = alone.leaders.find((l) => l.name === 'Perpenna')!;
    perpenna.hex = hexId(4, 0);
    expect(count(board(alone), /class="command-badge"/g)).toBe(units + 1);
    expect(commandTipLine(alone, perpenna)).toBe("Perpenna's command: one card orders one command only");
    expect(commandTipLine(alone, alone.leaders.find((l) => l.name === 'Pompey')!)).toBeNull();
  });
});

describe('304: a card falls back to 1 unit within the command named (rule commandFallback)', () => {
  /** 304 with Perpenna's light cavalry gone: his command has no light or mounted unit left (his MI throw the pilum). */
  const valentia = () => {
    const s = game('304');
    s.units = s.units.filter((u) => !(u.command === 'perpenna' && u.type === 'LC'));
    return s;
  };

  it('the order prompt says which command orders 1 unit; the board marks its units and the other\'s light units', () => {
    const s = valentia();
    const her = s.units.filter((u) => u.command === 'herennius');
    const per = s.units.filter((u) => u.command === 'perpenna');
    const note = "Perpenna's command has no units that fit Order Light Troops: for it, order 1 unit of your choice (a normal order, no card bonus).";
    expect(commandFallbackNote(s, 'top', 'orderLight', [])).toBe(note);
    expect(commandFallbackNote(s, 'top', 'orderLight', [per[0].id])).toBe(note);
    expect(commandFallbackNote(s, 'top', 'orderLight', [her.find((u) => u.type === 'AX')!.id])).toBeNull();
    expect(commandFallbackNote(s, 'top', 'orderMedium', [])).toBeNull(); // both commands have medium troops
    expect(commandFallbackNote(game('304'), 'top', 'orderLight', [])).toBeNull(); // the LC is light
    const d: Decision = { kind: 'orders', side: 'top', card: 'orderLight', mirrored: false };
    const marked = [...boardUi(s, d, SEL, 'top').highlights.entries()].filter(([, v]) => v === 'eligible').map(([h]) => h).sort((a, b) => a - b);
    const light = her.filter((u) => UNIT_STATS[u.type].cls === 'light');
    expect(marked).toEqual([...light, ...per].map((u) => u.hex).sort((a, b) => a - b));
    // "Select all": Herennius' light units, the one command that obeys the card (5 of them, more than the Command of 4: none)
    expect(selectAllUnits(s, 'top', 'orderLight')).toBeNull();
    const fewer = cloneState(s);
    fewer.units = fewer.units.filter((u) => u.type !== 'AX' || u.command !== 'herennius');
    expect(selectAllUnits(fewer, 'top', 'orderLight')?.sort()).toEqual(light.filter((u) => u.type !== 'AX').map((u) => u.id).sort());
  });

  it('Darken the Sky: the command choice says that a command without missile units would order 1 unit', () => {
    // in 304 itself every Sertorian MI throws the pilum; here Perpenna's MI have no legion, Herennius has an AX
    const pos = (perpennaShoots: boolean) => build({
      first: 'top', rules: ['commandFallback'],
      commands: [{ id: 'herennius', name: 'Herennius', side: 'top' }, { id: 'perpenna', name: 'Perpenna', side: 'top', blocks: 'grk' }],
      units: [
        { side: 'top', type: 'AX', at: [2, 6], command: 'herennius' },
        { side: 'top', type: perpennaShoots ? 'LC' : 'MI', at: [2, 8], command: 'perpenna' }, { side: 'bottom', type: 'MI', at: [6, 6] },
      ],
    });
    expect(commandFallbackNote(pos(false), 'top', 'darken', [])).toBe(
      "Perpenna's command has no units that fit Darken the Sky: for it, order 1 unit of your choice (a normal order, no card bonus).",
    );
    expect(commandFallbackNote(pos(true), 'top', 'darken', [])).toBeNull();
    expect(commandFallbackNote(game('304'), 'top', 'darken', [])).toBeNull();
  });
});

describe('tooltips: units and leaders', () => {
  const unit = (t: UnitType, extra: Partial<Unit> = {}): Unit =>
    ({ id: 'u1', side: 'bottom', type: t, hex: 0, blocks: UNIT_STATS[t].blocks, maxBlocks: UNIT_STATS[t].blocks, ...extra }) as Unit;

  it('an immobile unit (306)', () => {
    expect(IMMOBILE_TIP).toBe('Immobile: never moves or advances; battles and retreats normally');
  });

  it('Julian legions: the pilum and the march, as the Marian legions have the pilum; with Caesar, his forced march', () => {
    expect(unitSummary(unit('MI', { legion: 'julian' }))).toEqual([
      'Move 1, or 2 without battle · Retreat 1/flag', 'Close combat 4 dice', 'Missiles: range 2, 1 die (not after moving 2 hexes)', 'Cannot evade',
    ]);
    expect(unitSummary(unit('MI', { legion: 'marius' }))[2]).toBe('Missiles: range 2, 1 die (not after moving 2 hexes)');
    const s = game('306');
    const caesar = s.leaders.find((l) => l.name === 'Julius Caesar')!;
    const his = s.units.find((u) => u.hex === caesar.hex)!;
    expect(his).toMatchObject({ type: 'HI', legion: 'julian' });
    expect(forcedMarchLine(s, his)).toBe("Julius Caesar's forced march: with him from the start of its move, it may move 2 hexes and still close combat (no pilum after 2 hexes)");
    // a unit without him, and units that gain nothing (light foot already move 2 and battle; mounted units are not infantry)
    expect(forcedMarchLine(s, s.units.find((u) => u.side === 'bottom' && u.type === 'HI' && u.hex !== caesar.hex)!)).toBeNull();
    for (const t of ['LI', 'MC'] as const) expect(forcedMarchLine(s, { ...unit(t), hex: caesar.hex, side: 'bottom' }), t).toBeNull();
    // an infantry unit without the pilum: 2 hexes and still battle
    expect(forcedMarchLine(s, { ...unit('AX'), hex: caesar.hex, side: 'bottom' })).toBe("Julius Caesar's forced march: with him from the start of its move, it may move 2 hexes and still battle");
  });
});

describe('tooltips: the new objectives', () => {
  it('ship markers (313): the enemy\'s ships, taken at the start of the turn; the hex does not change', () => {
    const s = game('313');
    expect(objectiveTipLines(s, hexId(0, 1))).toEqual(['Pompeian ship: a Caesarian unit here at the start of its turn takes the marker — 1 banner (the hex does not change)']);
    expect(objectiveTipLines(s, hexId(0, 9))).toEqual(['Caesarian ship: a Pompeian unit here at the start of its turn takes the marker — 1 banner (the hex does not change)']);
    const o = s.special.objectives.findIndex((x) => x.kind === 'capture' && x.side === 'bottom');
    s.special.objState[o].taken.push(hexId(0, 1));
    expect(objectiveTipLines(s, hexId(0, 1))).toEqual(['Pompeian ship: taken by the Caesarian army']);
  });
  it('leader exits (317): units and lone leaders score, a unit with its leader 2', () => {
    expect(objectiveTipLines(game('317'), hexId(0, 6))).toEqual([
      'Exit: a Caesarian unit or lone leader here may leave the battlefield — 1 banner each, 2 for a unit with its leader (they are removed)',
    ]);
    // an exit without leaders keeps its wording (311, cavalry)
    expect(objectiveTipLines(game('311'), hexId(4, 0))).toEqual(['Exit: a Pompeian cavalry unit here may leave the battlefield — 1 banner (the unit is removed)']);
  });
  it('a single-side majority (309\'s hillock): only one side can hold it', () => {
    const s = game('309');
    expect(objectiveTipLines(s, hexId(3, 5))).toEqual([
      'Hill objective: the Caesarian army holds 1 banner while it has more units on the 3 marked hexes than the Pompeian army; the Pompeian army cannot hold it',
      'Not held now',
    ]);
    const o = s.special.objectives.findIndex((x) => x.kind === 'majority');
    s.special.objState[o].held.bottom = 1;
    expect(objectiveTipLines(s, hexId(3, 5))[1]).toBe('Held now by the Caesarian army');
  });
  it('camps in order and camps on hills (308, 309); the walls held (308)', () => {
    const g = game('308');
    expect(objectiveTipLines(g, hexId(2, 5))).toEqual([
      'Gallic camp: a Roman unit here at the start of its turn captures it — no banner until the second camp taken; the camp is then removed (the hill remains)',
    ]);
    expect(objectiveTipLines(g, hexId(0, 7))).toEqual(['City wall: the Roman army holds 1 banner while one of its units stands here — held while occupied, can be lost.']);
    expect(objectiveTipLines(game('309'), hexId(8, 3))).toEqual([
      'Caesarian camp: a Pompeian unit here at the start of its turn captures it — no banner until the second camp taken; the camp is then removed',
    ]);
  });
});
