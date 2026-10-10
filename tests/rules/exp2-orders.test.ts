// Expansion #2 order mechanics (rules-reference §18.5): the ambush reserve of Trebbia made configurable for 206 Aquae
// Sextiae (any Leadership card or Order Light Troops, from the side's first turn, with its own log text).
import { beforeEach, describe, expect, it } from 'vitest';
import {
  GameDriver, OFF_BOARD, ambushAvailable, ambushSections, cloneState, createGame, forceDice, inSection, pieceMoves, rowOf,
  type CardKind, type SectionName, type Side,
} from '../../src/engine';
import { scenarioById, scenarioFromJson, type ScenarioJson } from '../../src/scenarios';
import { H, build, ev, giveCard, must, n, noFirstStrike, passTurn, setupOf, type Pos } from './helpers';

beforeEach(() => forceDice([]));

const LEADERSHIP: CardKind[] = ['inspiredL', 'inspiredC', 'inspiredR', 'leadershipAny'];
const SECTIONS: SectionName[] = ['left', 'center', 'right'];
const TREBBIA_TEXT = (sec: string) => `Ambush! Mago's hidden force strikes from the ${sec}.`;

/** The configuration of 206 Aquae Sextiae (rules-reference §19). */
const AQUAE = {
  trigger: ['inspiredL', 'inspiredC', 'inspiredR', 'leadershipAny', 'orderLight'] as CardKind[],
  afterOwnTurns: 0,
  text: "Marius's hidden cohorts fall on the German rear from the {section}!",
};

/** `side` owns an off-board force (MC, WA and a leader) that enters on the other baseline; both sides have board units. */
function posFor(side: Side, extra: Partial<Pos> = {}): Pos {
  const foe: Side = side === 'top' ? 'bottom' : 'top';
  return {
    rules: ['magoAmbush'],
    first: side,
    units: [
      { side, type: 'MI', at: [side === 'top' ? 1 : 7, 6] },
      { side: foe, type: 'MI', at: [foe === 'top' ? 1 : 7, 4] },
      { side: foe, type: 'LI', at: [foe === 'top' ? 1 : 7, 8] },
    ],
    reserves: [{ side, type: 'MC' }, { side, type: 'WA' }],
    reserveLeaders: [{ side, name: 'Reserve' }],
    ...extra,
  };
}

function startGame(p: Pos): GameDriver {
  const s = build(p);
  noFirstStrike(s);
  return new GameDriver(s);
}

/** The active side plays `kind`: the driver waits for its orders. */
function playCard(d: GameDriver, kind: CardKind) {
  const card = giveCard(d.state, d.state.active, kind);
  must(d, { kind: 'playCard', card });
  expect(d.pending?.kind).toBe('orders');
}

/** `playCard` + the ambush in `section`. */
function springAmbush(d: GameDriver, kind: CardKind, section: SectionName) {
  playCard(d, kind);
  must(d, { kind: 'orders', pieces: [], ambushSection: section });
}

/** End the movement stage (then the battle stage) of the active turn. */
function endMoves(d: GameDriver) {
  while (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
}
function endTurn(d: GameDriver) {
  endMoves(d);
  while (d.pending?.kind === 'battle') must(d, { kind: 'endBattle' });
}

const logs = (d: GameDriver) => ev(d).flatMap((e) => (e.t === 'log' ? [e.text] : []));

/** Whether the pending Orders decision accepts the ambush in `section` (the driver is left unchanged when it does not). */
const accepts = (d: GameDriver, section: SectionName) => d.answer({ kind: 'orders', pieces: [], ambushSection: section });

describe('ambush reserve', () => {
  describe('resolved configuration', () => {
    it('is null in a battle without the magoAmbush rule', () => {
      expect(build({ units: [{ side: 'top', type: 'MI', at: [1, 6] }] }).special.ambush).toBeNull();
    });
    it('defaults to Trebbia: the four Leadership cards, after the first own turn, the Mago text', () => {
      const s = build(posFor('top'));
      expect(s.special.ambush).toEqual({
        trigger: LEADERSHIP, afterOwnTurns: 1, text: "Ambush! Mago's hidden force strikes from the {section}.",
      });
      expect(scenarioById('005').setup.ambush).toBeUndefined();
      expect(createGame(scenarioById('005').setup, 11).special.ambush).toEqual(s.special.ambush);
    });
    it('fills the fields the scenario leaves out from the Trebbia defaults', () => {
      const s = build(posFor('top', { ambush: { afterOwnTurns: 2 } }));
      expect(s.special.ambush).toEqual({ trigger: LEADERSHIP, afterOwnTurns: 2, text: "Ambush! Mago's hidden force strikes from the {section}." });
      const t = build(posFor('top', { ambush: { text: 'Out of the mist!' } }));
      expect(t.special.ambush).toMatchObject({ trigger: LEADERSHIP, afterOwnTurns: 1, text: 'Out of the mist!' });
    });
    it('takes the 206 configuration as given', () => {
      expect(build(posFor('top', { ambush: AQUAE })).special.ambush).toEqual(AQUAE);
    });
    it('copies the scenario data: later changes to the setup do not reach the state', () => {
      const p = posFor('top', { ambush: { ...AQUAE, trigger: [...AQUAE.trigger] } });
      const setup = setupOf(p);
      const s = createGame(setup, 1);
      setup.ambush!.trigger!.push('order2L');
      expect(s.special.ambush!.trigger).toEqual(AQUAE.trigger);
    });
    it('survives cloneState unchanged', () => {
      const s = build(posFor('top', { ambush: AQUAE }));
      const c = cloneState(s);
      expect(c.special.ambush).toEqual(AQUAE);
    });
    it('rejects ambush data without the rule, unknown cards and bad turn counts', () => {
      const bad = (ambush: unknown, rules: Pos['rules'] = ['magoAmbush']) =>
        () => createGame(setupOf({ rules, ambush: ambush as Pos['ambush'], units: [{ side: 'top', type: 'MI', at: [1, 6] }] }), 1);
      expect(bad({ afterOwnTurns: 0 }, [])).toThrow(/ambush.*magoAmbush.*\(qa\)$/);
      expect(bad({ trigger: ['order2L', 'bogus'] })).toThrow(/^ambush trigger: unknown card bogus \(qa\)$/);
      expect(bad({ trigger: [] })).toThrow(/^ambush trigger: needs at least one card \(qa\)$/);
      expect(bad({ trigger: 'inspiredL' })).toThrow(/^ambush trigger must be a list of cards \(qa\)$/);
      expect(bad({ afterOwnTurns: -1 })).toThrow(/^ambush afterOwnTurns must be a whole number, 0 or more \(qa\)$/);
      expect(bad({ afterOwnTurns: 1.5 })).toThrow(/afterOwnTurns/);
      expect(bad({ text: 7 })).toThrow(/^ambush text must be a string \(qa\)$/);
    });
  });

  describe('Trebbia defaults (rule magoAmbush alone)', () => {
    it('refuses the side first turn, even with Leadership Any Section', () => {
      const d = startGame(posFor('top'));
      playCard(d, 'leadershipAny');
      expect(ambushAvailable(d.state, 'top', 'leadershipAny')).toBe(false);
      for (const sec of SECTIONS) expect(accepts(d, sec)).toBe(false);
    });
    it('refuses Order Light Troops, now and after the first turn', () => {
      const d = startGame(posFor('top'));
      expect(ambushAvailable(d.state, 'top', 'orderLight')).toBe(false);
      passTurn(d); // top, turn 1
      passTurn(d); // bottom
      expect(d.state.special.turnsDone.top).toBe(1);
      expect(ambushAvailable(d.state, 'top', 'orderLight')).toBe(false);
      playCard(d, 'orderLight');
      for (const sec of SECTIONS) expect(accepts(d, sec)).toBe(false);
    });
    it('accepts a Leadership card from the second own turn and logs the Mago text', () => {
      const d = startGame(posFor('top'));
      passTurn(d);
      passTurn(d);
      expect(ambushAvailable(d.state, 'top', 'leadershipAny')).toBe(true);
      expect(ambushAvailable(d.state, 'top', 'order2L')).toBe(false);
      expect(ambushAvailable(d.state, 'top', null)).toBe(false);
      ev(d);
      springAmbush(d, 'leadershipAny', 'center');
      expect(logs(d)).toContain(TREBBIA_TEXT('center'));
      expect(d.pending?.kind).toBe('move');
    });
    it('is never offered to the other side', () => {
      const d = startGame(posFor('top'));
      passTurn(d);
      passTurn(d);
      expect(ambushAvailable(d.state, 'bottom', 'leadershipAny')).toBe(false);
    });
    it('Trebbia (005) itself is unchanged: first turn refused, Mago text on the second', () => {
      const s = createGame(scenarioById('005').setup, 11);
      noFirstStrike(s);
      const d = new GameDriver(s);
      passTurn(d); // Roman turn 1
      playCard(d, 'leadershipAny');
      expect(accepts(d, 'left')).toBe(false);
      must(d, { kind: 'orders', pieces: [] });
      endTurn(d);
      passTurn(d); // Roman turn 2
      ev(d);
      springAmbush(d, 'inspiredR', 'right');
      expect(logs(d)).toContain(TREBBIA_TEXT('right'));
    });
  });

  describe('custom number of own turns', () => {
    it('afterOwnTurns: 2 waits for the third own turn', () => {
      const d = startGame(posFor('top', { ambush: { afterOwnTurns: 2 } }));
      passTurn(d); passTurn(d);
      expect(ambushAvailable(d.state, 'top', 'leadershipAny')).toBe(false);
      passTurn(d); passTurn(d);
      expect(d.state.special.turnsDone.top).toBe(2);
      expect(ambushAvailable(d.state, 'top', 'leadershipAny')).toBe(true);
    });
  });

  describe('206 configuration (any Leadership card or Order Light Troops, from the first turn)', () => {
    const aquae = (side: Side = 'top') => startGame(posFor(side, { ambush: AQUAE }));

    it('is available on the first turn for Order Light Troops and every Leadership card', () => {
      const d = aquae();
      for (const k of [...LEADERSHIP, 'orderLight'] as CardKind[]) expect(ambushAvailable(d.state, 'top', k), k).toBe(true);
      for (const k of ['order2L', 'order3C', 'order4R', 'orderMedium', 'orderHeavy', 'orderMounted', 'outFlanked', 'counterAttack', 'clash'] as CardKind[]) {
        expect(ambushAvailable(d.state, 'top', k), k).toBe(false);
      }
    });
    it('Order Light Troops on the first turn lets the player choose any section', () => {
      expect(ambushSections('orderLight')).toEqual(SECTIONS);
      for (const sec of SECTIONS) {
        const d = aquae();
        playCard(d, 'orderLight');
        must(d, { kind: 'orders', pieces: [], ambushSection: sec });
        expect(d.pending?.kind).toBe('move');
        const mc = d.state.units.find((x) => x.type === 'MC' && x.side === 'top')!;
        const entries = pieceMoves(d.state, mc.id).filter((m) => m.dist === 1);
        expect(entries.length).toBeGreaterThan(0);
        for (const e of entries) {
          expect(rowOf(e.hex)).toBe(8);
          expect(inSection(e.hex, 'top', sec), `${sec} ${e.hex}`).toBe(true);
        }
      }
    });
    it('Inspired Center on the first turn fixes the centre section', () => {
      const d = aquae();
      playCard(d, 'inspiredC');
      expect(accepts(d, 'left')).toBe(false);
      expect(accepts(d, 'right')).toBe(false);
      must(d, { kind: 'orders', pieces: [], ambushSection: 'center' });
      const mc = d.state.units.find((x) => x.type === 'MC' && x.side === 'top')!;
      for (const m of pieceMoves(d.state, mc.id).filter((x) => x.dist === 1)) expect(inSection(m.hex, 'top', 'center')).toBe(true);
    });
    it('Leadership Any Section on the first turn lets the player choose', () => {
      for (const sec of SECTIONS) {
        const d = aquae();
        springAmbush(d, 'leadershipAny', sec);
        expect(d.pending?.kind).toBe('move');
      }
    });
    it('a section card does not spring it: the answer is refused and the orders stay open', () => {
      const d = aquae();
      playCard(d, 'order3C');
      for (const sec of SECTIONS) expect(accepts(d, sec)).toBe(false);
      expect(d.pending?.kind).toBe('orders');
      must(d, { kind: 'orders', pieces: [] });
    });
    it('logs the 206 text with the section filled in, and the reserve then stands on the board', () => {
      const d = aquae();
      ev(d);
      springAmbush(d, 'orderLight', 'right');
      expect(logs(d)).toContain("Marius's hidden cohorts fall on the German rear from the right!");
      expect(logs(d).some((l) => l.startsWith('Ambush!'))).toBe(false);
      expect(d.state.special.reserveUnits).toEqual([]);
      expect(d.state.special.reserveReleased).toBe(true);
      expect(d.state.units.filter((x) => x.hex === OFF_BOARD && x.side === 'top')).toHaveLength(2);
    });
    it('a Counter Attack copying Order Light Troops springs it too', () => {
      // the enemy (bottom) opens with Order Light Troops; the reserve side (top) answers with Counter Attack
      const d = startGame(posFor('top', { ambush: AQUAE, first: 'bottom' }));
      playCard(d, 'orderLight');
      must(d, { kind: 'orders', pieces: [] });
      endTurn(d);
      expect(d.state.active).toBe('top');
      must(d, { kind: 'playCard', card: giveCard(d.state, 'top', 'counterAttack') });
      expect(d.state.turn.effective).toBe('orderLight');
      ev(d);
      must(d, { kind: 'orders', pieces: [], ambushSection: 'left' });
      expect(logs(d)).toContain("Marius's hidden cohorts fall on the German rear from the left!");
    });
    it('is used once: after the force is placed, a later trigger card does not bring a second one', () => {
      const d = aquae();
      springAmbush(d, 'orderLight', 'left');
      for (const x of d.state.units.filter((x) => x.hex === OFF_BOARD)) {
        const to = pieceMoves(d.state, x.id).find((m) => m.dist === 1)!.hex;
        must(d, { kind: 'move', piece: x.id, to });
      }
      endTurn(d);
      passTurn(d); // bottom
      expect(d.state.units.filter((x) => x.hex === OFF_BOARD)).toEqual([]);
      expect(ambushAvailable(d.state, 'top', 'orderLight')).toBe(false);
      expect(ambushAvailable(d.state, 'top', 'leadershipAny')).toBe(false);
    });
    it('units that were not placed wait for a later trigger', () => {
      const d = aquae();
      springAmbush(d, 'orderLight', 'left');
      endTurn(d); // nobody entered
      expect(d.state.special.reserveUnits).toHaveLength(2);
      expect(d.state.special.reserveLeaders).toHaveLength(1);
      expect(d.state.units.some((x) => x.hex === OFF_BOARD)).toBe(false);
      passTurn(d); // bottom
      expect(ambushAvailable(d.state, 'top', 'orderLight')).toBe(true);
      ev(d);
      springAmbush(d, 'leadershipAny', 'right');
      expect(logs(d)).toContain("Marius's hidden cohorts fall on the German rear from the right!");
    });
    it('works for a bottom-side reserve too: it enters on the top baseline', () => {
      const d = aquae('bottom');
      springAmbush(d, 'orderLight', 'center');
      const mc = d.state.units.find((x) => x.type === 'MC' && x.side === 'bottom')!;
      const entries = pieceMoves(d.state, mc.id).filter((m) => m.dist === 1);
      expect(entries.length).toBeGreaterThan(0);
      for (const e of entries) {
        expect(rowOf(e.hex)).toBe(0);
        expect(inSection(e.hex, 'bottom', 'center')).toBe(true);
      }
    });
  });

  describe('retreat toward the own side', () => {
    /**
     * `side` owns a lone AX reserve that enters on the far baseline at (`row`, 6) next to an enemy heavy infantry unit
     * (u2) on the same baseline; the enemy attacks it with one flag. The AX (u3) then has two ways back.
     */
    function ambushedAndHit(side: Side, row: number) {
      const foe: Side = side === 'top' ? 'bottom' : 'top';
      const d = startGame({
        rules: ['magoAmbush'], first: side, ambush: AQUAE,
        units: [{ side, type: 'MI', at: [side === 'top' ? 1 : 7, 6] }, { side: foe, type: 'HI', at: [row, 5] }],
        reserves: [{ side, type: 'AX' }],
      });
      springAmbush(d, 'inspiredC', 'center');
      const ax = d.state.units.find((x) => x.type === 'AX')!;
      expect(pieceMoves(d.state, ax.id).some((m) => m.hex === H(row, 6))).toBe(true);
      must(d, { kind: 'move', piece: ax.id, to: H(row, 6) });
      endTurn(d);
      expect(d.state.units.find((x) => x.id === ax.id)!.hex).toBe(H(row, 6));
      must(d, { kind: 'playCard', card: giveCard(d.state, foe, 'order4C') });
      must(d, { kind: 'orders', pieces: ['u2'] });
      endMoves(d);
      forceDice(['flag', ...n('heavy', 4)]); // the flag only: heavy faces miss the light-class auxilia
      must(d, { kind: 'attack', unit: 'u2', target: H(row, 6) });
      if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: 'stand' });
      return { d, ax };
    }
    it('a bottom reserve that entered on row 0 retreats down the board: to row 1, towards row 8', () => {
      const { d, ax } = ambushedAndHit('bottom', 0);
      expect(d.pending).toMatchObject({ kind: 'retreat', side: 'bottom', unit: ax.id });
      const opts = (d.pending as { options: { path: number[]; end: number }[] }).options;
      expect(opts).toHaveLength(2);
      for (const o of opts) {
        expect(o.path).toHaveLength(1);
        expect(rowOf(o.end), 'away from row 0').toBe(1);
      }
      must(d, { kind: 'choose', index: 0 });
      expect(rowOf(d.state.units.find((x) => x.id === ax.id)!.hex)).toBe(1);
    });
    it('a top reserve that entered on row 8 retreats up the board: to row 7, towards row 0', () => {
      const { d, ax } = ambushedAndHit('top', 8);
      expect(d.pending).toMatchObject({ kind: 'retreat', side: 'top', unit: ax.id });
      const opts = (d.pending as { options: { path: number[]; end: number }[] }).options;
      expect(opts).toHaveLength(2);
      for (const o of opts) expect(rowOf(o.end), 'away from row 8').toBe(7);
      must(d, { kind: 'choose', index: 0 });
      expect(rowOf(d.state.units.find((x) => x.id === ax.id)!.hex)).toBe(7);
    });
  });

  describe('scenario data', () => {
    const base: ScenarioJson = {
      id: 'x', name: 'X', year: '1 BC', top: { army: 'A', blocks: 'rom', look: 'roman', commander: 'a', cards: 5 },
      bottom: { army: 'B', blocks: 'rom', look: 'roman', commander: 'b', cards: 5 }, first: 'top', banners: 4,
      terrain: [], units: [], leaders: [], reserves: [{ side: 'top', type: 'LI' }], reserveLeaders: [],
    };
    it('a scenario file carries its ambush configuration into the setup (copied)', () => {
      const json: ScenarioJson = { ...base, rules: ['magoAmbush'], ambush: { ...AQUAE, trigger: [...AQUAE.trigger] } };
      const { setup } = scenarioFromJson(json);
      expect(setup.ambush).toEqual(AQUAE);
      expect(setup.ambush).not.toBe(json.ambush);
      expect(setup.ambush!.trigger).not.toBe(json.ambush!.trigger);
      expect(createGame(setup, 1).special.ambush).toEqual(AQUAE);
    });
    it('a file without ambush data leaves the setup without it', () => {
      expect(scenarioFromJson({ ...base, rules: ['magoAmbush'] }).setup.ambush).toBeUndefined();
    });
  });
});
