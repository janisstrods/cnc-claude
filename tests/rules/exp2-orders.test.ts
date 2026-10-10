// Expansion #2 order mechanics (rules-reference §18.5): the ambush reserve of Trebbia made configurable for 206 Aquae
// Sextiae (any Leadership card or Order Light Troops, from the side's first turn, with its own log text), and the separate
// commands of 210 Picenum (one card orders units of one command only; Rally and I Am Spartacus ask which command; scenario
// data for commands).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GameDriver, OFF_BOARD, ambushAvailable, ambushSections, cloneState, createGame, forceDice, forcedDiceLeft, inSection, pieceMoves,
  randomAnswer, rowOf, validateOrders,
  type Answer, type CardKind, type Decision, type SectionName, type Side,
} from '../../src/engine';
import { PERSONALITIES, chooseAnswer, isLegal, newMemory } from '../../src/ai';
import { scenarioById, scenarioFromJson, type ScenarioJson } from '../../src/scenarios';
import { H, build, ev, giveCard, must, n, noFirstStrike, passTurn, play, setupOf, u, type Pos } from './helpers';

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
    it('rejects an ambush without reserve units (with or without ambush data)', () => {
      const p = posFor('top');
      expect(() => build({ ...p, reserves: [], reserveLeaders: [] })).toThrow(/^the ambush \(rule magoAmbush\) needs reserve units \(qa\)$/);
      expect(() => build({ ...p, ambush: AQUAE, reserves: [] })).toThrow(/^the ambush \(rule magoAmbush\) needs reserve units \(qa\)$/);
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

// ---------------------------------------------------------------------------------------------------------------------
// Separate commands (210 Picenum, §18.5; rulings Exp2 Q7): one card orders units of one command only
// ---------------------------------------------------------------------------------------------------------------------

describe('separate commands', () => {
  const MIXED = 'One card orders one army only.';
  type Command = NonNullable<Pos['commands']>[number];
  const LEN: Command = { id: 'len', name: 'Lentulus', side: 'bottom', blocks: 'gry' };
  const GEL: Command = { id: 'gel', name: 'Gellius', side: 'bottom' };
  const CMDS: Command[] = [LEN, GEL];
  const err = (s: ReturnType<typeof build>, kind: CardKind, pieces: string[]) => validateOrders(s, 'bottom', kind, pieces);
  const foe = (at: [number, number] = [1, 6]): NonNullable<Pos['units']>[number] => ({ side: 'top', type: 'HI', at });

  /** Four medium infantry in a row in the centre: Lentulus' u1 u2, then Gellius' u3 u4; a distant enemy. */
  const ROW: Pos = {
    commands: CMDS,
    units: [
      { side: 'bottom', type: 'MI', at: [6, 4], command: 'len' }, // u1
      { side: 'bottom', type: 'MI', at: [6, 5], command: 'len' }, // u2
      { side: 'bottom', type: 'MI', at: [6, 6], command: 'gel' }, // u3
      { side: 'bottom', type: 'MI', at: [6, 7], command: 'gel' }, // u4
      foe(),
    ],
  };

  describe('scenario data', () => {
    it('a battle without commands has none, and units carry no command', () => {
      const s = build({ units: [{ side: 'bottom', type: 'MI', at: [6, 4] }] });
      expect(s.special.commands).toEqual([]);
      expect('command' in s.units[0]).toBe(false);
    });
    it('the commands, the units and the leaders keep what the scenario gives them', () => {
      const s = build({ ...ROW, leaders: [{ side: 'bottom', name: 'Lentulus', at: [6, 5], command: 'len' }, { side: 'bottom', at: [6, 6] }] });
      expect(s.special.commands).toEqual(CMDS);
      expect(s.units.map((x) => x.command)).toEqual(['len', 'len', 'gel', 'gel', undefined]);
      expect(s.leaders.map((l) => l.command)).toEqual(['len', undefined]);
    });
    it('copies the scenario data, and survives cloneState', () => {
      const setup = setupOf({ ...ROW, commands: CMDS.map((c) => ({ ...c })) });
      const s = createGame(setup, 1);
      setup.commands![0].name = 'Changed';
      expect(s.special.commands[0].name).toBe('Lentulus');
      const c = cloneState(s);
      expect(c.special.commands).toEqual(CMDS);
      expect(c.units.map((x) => x.command)).toEqual(s.units.map((x) => x.command));
    });
    it('rejects bad command data, naming the scenario', () => {
      const bad = (p: Partial<Pos>) => () => createGame(setupOf({ units: [{ side: 'bottom', type: 'MI', at: [6, 4] }], ...p }), 1);
      const un = (command: string) => [{ side: 'bottom' as const, type: 'MI' as const, at: [6, 4] as [number, number], command }];
      expect(bad({ commands: 'x' as unknown as Pos['commands'] })).toThrow(/^commands must be a list \(qa\)$/);
      expect(bad({ commands: [{ id: '', name: 'A', side: 'bottom' }] })).toThrow(/^command needs an id \(qa\)$/);
      expect(bad({ commands: [LEN, { ...GEL, id: 'len' }] })).toThrow(/^duplicate command len \(qa\)$/);
      expect(bad({ commands: [{ ...LEN, side: 'left' as unknown as Side }] })).toThrow(/^command len: unknown side left \(qa\)$/);
      expect(bad({ commands: [{ ...LEN, blocks: 'pink' as unknown as 'gry' }] })).toThrow(/^command len: unknown blocks pink \(qa\)$/);
      expect(bad({ commands: [{ ...LEN, name: 7 as unknown as string }] })).toThrow(/^command len: name must be a string \(qa\)$/);
      expect(bad({ commands: CMDS, units: un('nope') })).toThrow(/^unit command nope is not a command of the battle \(6,4\) \(qa\)$/);
      expect(bad({ units: un('len') })).toThrow(/unit command len is not a command of the battle/);
      expect(bad({ commands: [{ ...LEN, side: 'top' }], units: un('len') })).toThrow(/^unit command len belongs to the top army, not bottom \(6,4\) \(qa\)$/);
      expect(bad({ commands: CMDS, leaders: [{ side: 'bottom', name: 'Gaius', at: [6, 4], command: 'zzz' }] }))
        .toThrow(/^leader Gaius: command zzz is not a command of the battle \(qa\)$/);
      expect(bad({ commands: [{ ...LEN, side: 'top' }], leaders: [{ side: 'bottom', name: 'Gaius', at: [6, 4], command: 'len' }] }))
        .toThrow(/^leader Gaius: command len belongs to the top army, not bottom \(qa\)$/);
    });
    it('rejects a command on a piece off the board (reserves, reserve leaders, leaders to place) instead of dropping it', () => {
      const bad = (p: Partial<Pos>) => () => createGame(setupOf({ units: [{ side: 'bottom', type: 'MI', at: [6, 4] }], commands: CMDS, ...p }), 1);
      const withCommand = <T extends object>(x: T) => ({ ...x, command: 'len' }) as T;
      expect(bad({ rules: ['magoAmbush'], reserves: [withCommand({ side: 'bottom' as const, type: 'MC' as const })] }))
        .toThrow(/^reserve unit MC: command len is only for pieces on the board \(qa\)$/);
      expect(bad({ rules: ['magoAmbush'], reserves: [{ side: 'bottom', type: 'MC' }], reserveLeaders: [withCommand({ side: 'bottom' as const, name: 'Marius' })] }))
        .toThrow(/^reserve leader Marius: command len is only for pieces on the board \(qa\)$/);
      expect(bad({ rules: ['leaderPlacement'], placeLeaders: [withCommand({ side: 'bottom' as const, name: 'Gaius' })] }))
        .toThrow(/^leader to place Gaius: command len is only for pieces on the board \(qa\)$/);
    });
    it('a scenario file carries commands, unit command and leader command into the setup (copied)', () => {
      const base: ScenarioJson = {
        id: 'x', name: 'X', year: '1 BC', top: { army: 'A', blocks: 'rom', look: 'roman', commander: 'a', cards: 5 },
        bottom: { army: 'B', blocks: 'rom', look: 'roman', commander: 'b', cards: 5 }, first: 'top', banners: 4,
        terrain: [], units: [], leaders: [], reserves: [], reserveLeaders: [],
      };
      const json: ScenarioJson = {
        ...base,
        commands: [{ ...LEN }, { ...GEL }],
        units: [{ side: 'bottom', type: 'MI', r: 6, c: 4, command: 'len' }, { side: 'bottom', type: 'MI', r: 6, c: 6, command: 'gel' }],
        leaders: [{ side: 'bottom', name: 'Lentulus', r: 6, c: 4, command: 'len' }],
      };
      const { setup } = scenarioFromJson(json);
      expect(setup.commands).toEqual(CMDS);
      expect(setup.commands).not.toBe(json.commands);
      expect(setup.commands![0]).not.toBe(json.commands![0]);
      expect(setup.units.map((x) => x.command)).toEqual(['len', 'gel']);
      expect(setup.leaders[0].command).toBe('len');
      const s = createGame(setup, 1);
      expect(s.units.map((x) => x.command)).toEqual(['len', 'gel']);
      expect(s.leaders[0].command).toBe('len');
      expect(scenarioFromJson(base).setup.commands).toBeUndefined();
    });
  });

  describe('section and troop cards', () => {
    it('a section card ordering units of two commands is rejected; of one it is accepted', () => {
      const s = build(ROW);
      expect(err(s, 'order4C', ['u1', 'u3'])).toBe(MIXED);
      expect(err(s, 'order4C', ['u1', 'u2', 'u3', 'u4'])).toBe(MIXED);
      expect(err(s, 'order4C', ['u2', 'u3'])).toBe(MIXED);
      expect(err(s, 'order4C', ['u1', 'u2'])).toBeNull();
      expect(err(s, 'order4C', ['u3', 'u4'])).toBeNull();
      expect(err(s, 'order4C', ['u3'])).toBeNull();
      expect(err(s, 'order4C', [])).toBeNull();
    });
    it('the engine refuses the mixed selection and asks again', () => {
      const d = new GameDriver(build(ROW));
      noFirstStrike(d.state);
      must(d, { kind: 'playCard', card: giveCard(d.state, 'bottom', 'order4C') });
      expect(d.answer({ kind: 'orders', pieces: ['u2', 'u3'] })).toBe(false);
      expect(d.lastError).toBe(MIXED);
      expect(d.pending?.kind).toBe('orders');
      must(d, { kind: 'orders', pieces: ['u3', 'u4'] });
      expect(Object.keys(d.state.turn.ordered).sort()).toEqual(['u3', 'u4']);
    });
    it('troop cards follow the same rule', () => {
      const s = build(ROW);
      expect(err(s, 'orderMedium', ['u1', 'u3'])).toBe(MIXED);
      expect(err(s, 'orderMedium', ['u1', 'u2'])).toBeNull();
      expect(err(s, 'orderMedium', ['u2', 'u4', 'u3'])).toBe(MIXED);
    });
    it('Order 1 unit (no unit of the named class) is one unit, so one command: either command may supply it, two units are refused by the card', () => {
      const s = build(ROW); // no heavy units: Order Heavy Troops orders one unit of the player's choice
      expect(err(s, 'orderHeavy', ['u1'])).toBeNull(); // Lentulus'
      expect(err(s, 'orderHeavy', ['u3'])).toBeNull(); // Gellius'
      expect(err(s, 'orderHeavy', ['u1', 'u3'])).toBe('Order a single unit of your choice.'); // the card's own limit, not "one army only"
      expect(err(s, 'orderHeavy', ['u1', 'u3'])).not.toBe(MIXED);
    });
    it('a unit with no command goes with either command, but not with both', () => {
      const s = build({ ...ROW, units: [...ROW.units!, { side: 'bottom', type: 'MI', at: [7, 5] }] }); // u6: no command
      expect(err(s, 'order4C', ['u1', 'u6'])).toBeNull();
      expect(err(s, 'order4C', ['u6', 'u3'])).toBeNull();
      expect(err(s, 'order4C', ['u1', 'u6', 'u3'])).toBe(MIXED);
    });
    it('a leader with a command counts as one of its command; one without is free', () => {
      const s = build({
        ...ROW,
        leaders: [{ side: 'bottom', name: 'Lentulus', at: [6, 4], command: 'len' }, { side: 'bottom', name: 'Anon', at: [6, 7] }],
      });
      const [lent, anon] = s.leaders.map((l) => l.id);
      expect(err(s, 'order4C', [lent, 'u1'])).toBeNull();
      expect(err(s, 'order4C', [lent, 'u3'])).toBe(MIXED);
      expect(err(s, 'order4C', [anon, 'u3'])).toBeNull();
      expect(err(s, 'order4C', [anon, 'u1'])).toBeNull();
      expect(err(s, 'order4C', [lent, anon])).toBeNull();
    });
    it('the enemy side (no commands) is not restricted', () => {
      const s = build({ ...ROW, units: [...ROW.units!, foe([1, 7])], first: 'top' });
      expect(validateOrders(s, 'top', 'order2C', ['u5', 'u6'])).toBeNull();
    });
  });

  describe('Leadership cards', () => {
    const LEAD: Pos = {
      ...ROW,
      leaders: [
        { side: 'bottom', name: 'Lentulus', at: [6, 5], command: 'len' }, // L6, with u2
        { side: 'bottom', name: 'Anon', at: [6, 6] }, // L7, no command, with u3
        { side: 'bottom', name: 'Gellius', at: [6, 7], command: 'gel' }, // L8, with u4
      ],
    };
    const ids = (s: ReturnType<typeof build>) => s.leaders.map((l) => l.id);
    it('a leader with a command orders only that command', () => {
      const s = build(LEAD);
      const [lent, , gell] = ids(s);
      expect(err(s, 'inspiredC', [lent, 'u2', 'u1'])).toBeNull();
      expect(err(s, 'inspiredC', [lent, 'u2', 'u3'])).toBe(MIXED);
      expect(err(s, 'inspiredC', [lent, 'u2', 'u3', 'u4'])).toBe(MIXED);
      expect(err(s, 'inspiredC', [gell, 'u4', 'u3'])).toBeNull();
      expect(err(s, 'inspiredC', [gell, 'u4', 'u3', 'u2'])).toBe(MIXED);
    });
    it('a leader with no command is free, but the units he orders are one command', () => {
      const s = build(LEAD);
      const anon = ids(s)[1];
      expect(err(s, 'inspiredC', [anon, 'u3', 'u4'])).toBeNull();
      expect(err(s, 'inspiredC', [anon, 'u3', 'u2'])).toBe(MIXED);
      expect(err(s, 'leadershipAny', [anon, 'u3', 'u2'])).toBe(MIXED);
      expect(err(s, 'leadershipAny', [anon, 'u3'])).toBeNull();
    });
    it('a lone unit without a leader is one unit', () => {
      const s = build(LEAD);
      expect(err(s, 'inspiredC', ['u1'])).toBeNull();
      expect(err(s, 'inspiredC', ['u3'])).toBeNull();
    });
    it('a leader ordered with a section card must match the units', () => {
      const s = build({ ...LEAD, leaders: [LEAD.leaders![0], LEAD.leaders![2]] });
      const [lent, gell] = ids(s);
      expect(err(s, 'order4C', [lent, 'u3'])).toBe(MIXED);
      expect(err(s, 'order4C', [gell, 'u3'])).toBeNull();
      expect(err(s, 'order4C', [lent, gell])).toBe(MIXED);
    });
  });

  describe('Line Command and Double Time', () => {
    it('a linked group within one command is accepted; a mixed one is rejected', () => {
      const s = build(ROW);
      expect(err(s, 'lineCommand', ['u1', 'u2'])).toBeNull();
      expect(err(s, 'lineCommand', ['u3', 'u4'])).toBeNull();
      expect(err(s, 'lineCommand', ['u2', 'u3'])).toBe(MIXED); // linked, but two armies
      expect(err(s, 'lineCommand', ['u1', 'u2', 'u3', 'u4'])).toBe(MIXED);
      expect(err(s, 'doubleTime', ['u1', 'u2', 'u3'])).toBe(MIXED);
      expect(err(s, 'doubleTime', ['u3', 'u4'])).toBeNull();
    });
    it('the group must still be linked (the usual rule comes first)', () => {
      const s = build(ROW);
      expect(err(s, 'lineCommand', ['u1', 'u3'])).toBe('The units must form one linked group.');
    });
  });

  describe('Clash of Shields and Darken the Sky (automatic orders)', () => {
    /** The enemy HI (u5) at (5,5) touches Lentulus' (6,5) u1 and Gellius' (6,6) u2; u3 (Lentulus) stands apart. */
    const CLASH: Pos = {
      commands: CMDS,
      units: [
        { side: 'bottom', type: 'MI', at: [6, 5], command: 'len' },
        { side: 'bottom', type: 'MI', at: [6, 6], command: 'gel' },
        { side: 'bottom', type: 'MI', at: [7, 2], command: 'len' },
        { side: 'top', type: 'HI', at: [5, 5] },
      ],
    };
    const start = (p: Pos, kind: CardKind) => {
      const s = build(p);
      noFirstStrike(s);
      const d = new GameDriver(s);
      ev(d);
      must(d, { kind: 'playCard', card: giveCard(d.state, 'bottom', kind) });
      return d;
    };
    const orderedIds = (d: GameDriver) => ev(d).flatMap((e) => (e.t === 'ordered' ? e.ids : [])).sort();

    it('Clash of Shields with engaged units in both commands asks which command, in data order', () => {
      const d = start(CLASH, 'clash');
      expect(d.pending).toEqual({ kind: 'chooseCommand', side: 'bottom', options: ['len', 'gel'] });
      expect(d.state.turn.ordered).toEqual({}); // nobody is ordered before the answer
      must(d, { kind: 'choose', index: 1 });
      expect(d.pending?.kind).toBe('battle'); // Clash of Shields: no movement
      expect(Object.keys(d.state.turn.ordered)).toEqual(['u2']);
    });
    it('answering the other command orders only that command', () => {
      const d = start(CLASH, 'clash');
      must(d, { kind: 'choose', index: 0 });
      expect(Object.keys(d.state.turn.ordered)).toEqual(['u1']); // u3 is not engaged
      expect(orderedIds(d)).toEqual(['u1']);
    });
    it('options follow the data order of the commands, not the unit order', () => {
      const d = start({ ...CLASH, commands: [GEL, LEN] }, 'clash');
      expect(d.pending).toMatchObject({ kind: 'chooseCommand', options: ['gel', 'len'] });
      must(d, { kind: 'choose', index: 0 });
      expect(Object.keys(d.state.turn.ordered)).toEqual(['u2']);
    });
    it('a bad answer is refused and the question stays', () => {
      const d = start(CLASH, 'clash');
      for (const bad of [{ kind: 'choose', index: 2 }, { kind: 'choose', index: -1 }, { kind: 'choose', index: 0.5 }, { kind: 'yesno', yes: true }, { kind: 'orders', pieces: [] }] as Answer[]) {
        expect(d.answer(bad), JSON.stringify(bad)).toBe(false);
        expect(d.pending?.kind).toBe('chooseCommand');
      }
      expect(d.state.turn.ordered).toEqual({});
    });
    it('engaged units in one command: nothing is asked', () => {
      const p: Pos = { ...CLASH, units: [{ ...CLASH.units![0] }, { ...CLASH.units![1], command: 'len' }, CLASH.units![2], CLASH.units![3]] };
      const d = start(p, 'clash');
      expect(d.pending?.kind).toBe('battle');
      expect(Object.keys(d.state.turn.ordered).sort()).toEqual(['u1', 'u2']);
    });
    it('a unit with no command is ordered whichever command is named, and does not make a second command', () => {
      const p: Pos = { ...CLASH, units: [CLASH.units![0], { ...CLASH.units![1], command: undefined }, CLASH.units![2], CLASH.units![3]] };
      const d = start(p, 'clash');
      expect(d.pending?.kind).toBe('battle'); // only Lentulus' command has an engaged unit
      expect(Object.keys(d.state.turn.ordered).sort()).toEqual(['u1', 'u2']);
    });
    it('Counter Attack copying Clash of Shields asks too', () => {
      const s = build(CLASH);
      noFirstStrike(s);
      s.lastCard.top = 'clash';
      const d = new GameDriver(s);
      must(d, { kind: 'playCard', card: giveCard(d.state, 'bottom', 'counterAttack') });
      expect(d.state.turn.effective).toBe('clash');
      expect(d.pending).toMatchObject({ kind: 'chooseCommand', options: ['len', 'gel'] });
    });

    /** Archers (LB) in both commands, a medium infantry unit each, and a distant enemy. */
    const ARCHERS: Pos = {
      commands: CMDS,
      units: [
        { side: 'bottom', type: 'LB', at: [6, 3], command: 'len' }, // u1
        { side: 'bottom', type: 'LB', at: [6, 5], command: 'len' }, // u2
        { side: 'bottom', type: 'LB', at: [6, 8], command: 'gel' }, // u3
        { side: 'bottom', type: 'MI', at: [6, 6], command: 'gel' }, // u4: cannot shoot
        { side: 'top', type: 'HI', at: [2, 6] },
      ],
    };
    it('Darken the Sky with archers in both commands asks, then orders only the chosen command\'s shooters', () => {
      const d = start(ARCHERS, 'darken');
      expect(d.pending).toEqual({ kind: 'chooseCommand', side: 'bottom', options: ['len', 'gel'] });
      expect(orderedIds(d)).toEqual([]);
      must(d, { kind: 'choose', index: 0 });
      expect(orderedIds(d)).toEqual(['u1', 'u2']);
    });
    it('the other command', () => {
      const d = start(ARCHERS, 'darken');
      must(d, { kind: 'choose', index: 1 });
      expect(orderedIds(d)).toEqual(['u3']); // not the MI u4: it cannot shoot
    });
    it('Darken the Sky with shooters in one command asks nothing', () => {
      const p: Pos = { ...ARCHERS, units: [ARCHERS.units![0], ARCHERS.units![1], { ...ARCHERS.units![2], type: 'MI' }, ARCHERS.units![3], ARCHERS.units![4]] };
      const d = start(p, 'darken');
      expect(d.pending?.kind).not.toBe('chooseCommand');
      expect(orderedIds(d)).toEqual(['u1', 'u2']);
    });
    it('a battle without commands asks nothing, with the same units', () => {
      const plain: Pos = { units: ARCHERS.units!.map(({ command: _c, ...x }) => x) };
      expect(build(plain).special.commands).toEqual([]);
      const d = start(plain, 'darken');
      expect(d.pending?.kind).not.toBe('chooseCommand');
      expect(orderedIds(d)).toEqual(['u1', 'u2', 'u3']);
      const e = start({ units: CLASH.units!.map(({ command: _c, ...x }) => x) }, 'clash');
      expect(e.pending?.kind).toBe('battle');
      expect(Object.keys(e.state.turn.ordered).sort()).toEqual(['u1', 'u2']);
    });
  });

  describe('Rally and I Am Spartacus (dice cards)', () => {
    /** Two damaged units next to a leader, one of each command, plus a healthy one. */
    const RALLY: Pos = {
      commands: CMDS,
      units: [
        { side: 'bottom', type: 'MI', at: [6, 5], blocks: 2, command: 'len' }, // u1, with the leader
        { side: 'bottom', type: 'MI', at: [6, 6], blocks: 2, command: 'gel' }, // u2, adjacent
        { side: 'bottom', type: 'HI', at: [6, 4], command: 'gel' }, // u3: full strength
        foe(),
      ],
      leaders: [{ side: 'bottom', name: 'Marcus', at: [6, 5] }],
    };
    it('Rally with damaged units in both commands asks the command before the dice are rolled', () => {
      forceDice(['leader', 'leader', 'leader', 'flag', 'flag']);
      const d = play(build(RALLY), 'rally');
      expect(d.pending).toEqual({ kind: 'chooseCommand', side: 'bottom', options: ['len', 'gel'] });
      expect(forcedDiceLeft()).toBe(5); // not rolled yet
      must(d, { kind: 'choose', index: 1 });
      expect(forcedDiceLeft()).toBe(0);
      expect(d.pending).toMatchObject({ kind: 'rally', side: 'bottom', command: 'gel', faces: ['leader', 'leader', 'leader', 'flag', 'flag'] });
    });
    it('only units of the chosen command can be rallied', () => {
      forceDice(['leader', 'leader', 'flag', 'flag', 'flag']);
      const d = play(build(RALLY), 'rally');
      must(d, { kind: 'choose', index: 1 });
      expect(d.answer({ kind: 'assign', ids: ['u1', null, null, null, null] })).toBe(false); // Lentulus' unit
      expect(d.answer({ kind: 'assign', ids: ['u1', 'u2', null, null, null] })).toBe(false);
      must(d, { kind: 'assign', ids: ['u2', 'u2', null, null, null] });
      expect(u(d, 'u2')!.blocks).toBe(4);
      expect(u(d, 'u1')!.blocks).toBe(2);
      expect(Object.keys(d.state.turn.ordered)).toEqual(['u2']);
    });
    it('the other command', () => {
      forceDice(['leader', 'flag', 'flag', 'flag', 'flag']);
      const d = play(build(RALLY), 'rally');
      must(d, { kind: 'choose', index: 0 });
      expect(d.pending).toMatchObject({ kind: 'rally', command: 'len' });
      expect(d.answer({ kind: 'assign', ids: ['u2', null, null, null, null] })).toBe(false);
      must(d, { kind: 'assign', ids: ['u1', null, null, null, null] });
      expect(u(d, 'u1')!.blocks).toBe(3);
    });
    it('damaged units in one command: nothing is asked, and the Rally decision carries no command', () => {
      forceDice(['leader', 'flag', 'flag', 'flag', 'flag']);
      const p: Pos = { ...RALLY, units: [RALLY.units![0], { ...RALLY.units![1], blocks: 4 }, RALLY.units![2], RALLY.units![3]] };
      const d = play(build(p), 'rally');
      expect(d.pending?.kind).toBe('rally');
      expect('command' in d.pending!).toBe(false);
    });
    it('no damaged unit near a leader: nothing is asked', () => {
      forceDice(['leader', 'flag', 'flag', 'flag', 'flag']);
      const d = play(build({ ...RALLY, units: RALLY.units!.map((x) => ({ ...x, blocks: undefined })) }), 'rally');
      expect(logs(d)).toContain('No damaged units are near a leader: nothing to rally.');
      expect(d.pending).toMatchObject({ kind: 'playCard', side: 'top' }); // nobody ordered: the turn passes
    });

    const SPARTA: Pos = {
      commands: CMDS,
      units: [
        { side: 'bottom', type: 'MI', at: [6, 5], command: 'len' }, // u1
        { side: 'bottom', type: 'LI', at: [6, 2], command: 'len' }, // u2
        { side: 'bottom', type: 'MI', at: [6, 8], command: 'gel' }, // u3
        { side: 'bottom', type: 'HI', at: [6, 10], command: 'gel' }, // u4
        foe(),
      ],
      leaders: [{ side: 'bottom', name: 'Marcus', at: [6, 10], command: 'gel' }],
    };
    it('I Am Spartacus asks the command first; an assignment across commands is rejected', () => {
      forceDice(['medium', 'medium', 'heavy', 'leader', 'flag']);
      const d = play(build(SPARTA), 'spartacus');
      expect(d.pending).toEqual({ kind: 'chooseCommand', side: 'bottom', options: ['len', 'gel'] });
      expect(forcedDiceLeft()).toBe(5);
      must(d, { kind: 'choose', index: 1 });
      expect(d.pending).toMatchObject({ kind: 'spartacus', command: 'gel' });
      expect(d.answer({ kind: 'assign', ids: ['u1', 'u3', null, null, null] })).toBe(false); // u1 is Lentulus'
      expect(d.answer({ kind: 'assign', ids: ['u3', null, null, 'u2', null] })).toBe(false);
      expect(d.answer({ kind: 'assign', ids: ['u1', null, null, null, null] })).toBe(false);
      const marcus = d.state.leaders[0].id;
      must(d, { kind: 'assign', ids: ['u3', null, 'u4', marcus, null] });
      expect(Object.keys(d.state.turn.ordered).sort()).toEqual([marcus, 'u3', 'u4'].sort());
      expect(d.state.turn.reshuffleAfter).toBe(true);
    });
    it('a leader of the other command is not ordered either', () => {
      forceDice(['medium', 'leader', 'flag', 'flag', 'flag']);
      const d = play(build(SPARTA), 'spartacus');
      must(d, { kind: 'choose', index: 0 }); // Lentulus' command; the leader is Gellius'
      const marcus = d.state.leaders[0].id;
      expect(d.answer({ kind: 'assign', ids: ['u1', marcus, null, null, null] })).toBe(false);
      expect(d.answer({ kind: 'assign', ids: ['u1', 'u3', null, null, null] })).toBe(false); // helmet on a Gellius unit
      must(d, { kind: 'assign', ids: ['u1', 'u2', null, null, null] });
    });
    it('all units in one command: nothing is asked, but a leader of another command cannot join them', () => {
      forceDice(['medium', 'leader', 'flag', 'flag', 'flag']);
      const p: Pos = { ...SPARTA, units: SPARTA.units!.map((x) => ({ ...x, command: x.side === 'bottom' ? 'len' : undefined })) };
      const d = play(build(p), 'spartacus');
      expect(d.pending).toMatchObject({ kind: 'spartacus' });
      expect('command' in d.pending!).toBe(false);
      expect(d.answer({ kind: 'assign', ids: ['u1', d.state.leaders[0].id, null, null, null] })).toBe(false); // Gellius' leader with Lentulus' unit
      must(d, { kind: 'assign', ids: ['u1', 'u2', null, null, null] });
    });
  });

  describe('random and AI answers', () => {
    const FIGHT: Pos = {
      commands: CMDS, banners: 3, first: 'bottom', cards: 5,
      units: [
        { side: 'bottom', type: 'MI', at: [6, 3], command: 'len' }, { side: 'bottom', type: 'LB', at: [7, 4], command: 'len' },
        { side: 'bottom', type: 'MI', at: [6, 5], command: 'len' }, { side: 'bottom', type: 'MI', at: [6, 7], command: 'gel' },
        { side: 'bottom', type: 'LB', at: [7, 8], command: 'gel' }, { side: 'bottom', type: 'MI', at: [6, 9], command: 'gel' },
        { side: 'top', type: 'HI', at: [3, 4] }, { side: 'top', type: 'LI', at: [3, 6] }, { side: 'top', type: 'MI', at: [3, 8] },
        { side: 'top', type: 'LB', at: [2, 5] },
      ],
      leaders: [{ side: 'bottom', name: 'Lentulus', at: [6, 5], command: 'len' }, { side: 'bottom', name: 'Gellius', at: [6, 7], command: 'gel' }],
    };
    const cmdOf = (s: ReturnType<typeof build>, id: string) => (id.startsWith('L') ? s.leaders : s.units).find((x) => x.id === id)?.command;

    /** Plays a game with `answerFor`, checking that every order of the commanded side is one command. */
    function playOut(seed: number, answerFor: (d: GameDriver, dec: Decision) => Answer) {
      const d = new GameDriver(build(FIGHT, seed), { snapshots: false });
      let asked = 0;
      let steps = 0;
      while (!d.over && steps++ < 4000) {
        const dec = d.pending!;
        if (dec.kind === 'chooseCommand') asked++;
        const a = answerFor(d, dec);
        if (!d.answer(a)) throw new Error(`seed ${seed}: ${JSON.stringify(a)} rejected: ${d.lastError} for ${JSON.stringify(dec)}`);
        for (const e of d.drainEvents().map((q) => q.e)) {
          if (e.t !== 'ordered' || e.side !== 'bottom') continue;
          const cmds = new Set(e.ids.map((id) => cmdOf(d.state, id)).filter(Boolean));
          expect(cmds.size, `seed ${seed}: ${e.ids.join(',')}`).toBeLessThanOrEqual(1);
        }
      }
      return { d, asked, steps };
    }

    it('randomAnswer answers chooseCommand, and random games never break the one-command rule', () => {
      let asked = 0;
      let finished = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const rnd = (() => { let x = seed * 7919; return () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648; })();
        const r = playOut(seed, (d, dec) => randomAnswer(d.state, dec, rnd));
        asked += r.asked;
        if (r.d.over) finished++;
      }
      expect(asked).toBeGreaterThan(0);
      expect(finished).toBeGreaterThan(20);
    });
    it('randomAnswer picks a valid option index', () => {
      const dec: Decision = { kind: 'chooseCommand', side: 'bottom', options: ['len', 'gel'] };
      const seen = new Set<number>();
      for (let i = 0; i < 40; i++) {
        const a = randomAnswer(build(FIGHT), dec, Math.random);
        expect(a.kind).toBe('choose');
        const idx = (a as { index: number }).index;
        expect([0, 1]).toContain(idx);
        seen.add(idx);
      }
      expect(seen.size).toBe(2);
    });

    describe('the AI', () => {
      let spy: ReturnType<typeof vi.spyOn> | null = null;
      beforeEach(() => { spy = vi.spyOn(console, 'error'); });
      afterEach(() => {
        const calls = spy?.mock.calls ?? [];
        spy?.mockRestore();
        expect(calls.map((c) => c.map(String).join(' ')), 'an AI error was caught and hidden by a fallback').toEqual([]);
      });
      const opts = (side: Side, seed: number) => ({
        side, difficulty: 'recruit' as const, personality: PERSONALITIES[5], seed, deterministic: true, budgetScale: 0.1,
      });

      it('answers chooseCommand with a legal option', () => {
        const dec: Decision = { kind: 'chooseCommand', side: 'bottom', options: ['len', 'gel'] };
        const s = build(FIGHT);
        const r = chooseAnswer(s, dec, opts('bottom', 3), newMemory());
        expect(r.answer.kind).toBe('choose');
        expect(isLegal(s, dec, r.answer)).toBe(true);
        expect(isLegal(s, dec, { kind: 'choose', index: 2 })).toBe(false);
        expect(isLegal(s, dec, { kind: 'choose', index: -1 })).toBe(false);
        expect(isLegal(s, dec, { kind: 'yesno', yes: true })).toBe(false);
      });
      it('plays whole turns with legal, single-command orders', () => {
        for (const seed of [5, 6]) {
          const mems = { top: newMemory(), bottom: newMemory() };
          const r = playOut(seed, (d, dec) => {
            const a = chooseAnswer(d.state, dec, opts(dec.side, seed + (dec.side === 'top' ? 1 : 2)), mems[dec.side]).answer;
            expect(isLegal(d.state, dec, a), `${dec.kind}: ${JSON.stringify(a)}`).toBe(true);
            return a;
          });
          expect(r.steps).toBeGreaterThan(30);
        }
      });
    });
  });
});
