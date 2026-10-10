// Dice orders (rules-reference §18.10; rulings X3 Q9 with the spec's override; 310 Utica P1): a side with `orders: 'dice'`
// holds no cards. At the start of its turn it rolls `orderDice` dice: each flag face makes one of its units (its own choice)
// retreat for one flag that cannot be ignored, each swords face costs one of its units (its choice) a block, then the class
// faces order one unit of their class each and a helmet orders a leader with his unit. It never draws; the other side plays
// and draws as usual, may play First Strike against it, and its Counter Attack copies nothing.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  GameDriver, cloneState, createGame, defaultMods, randomAnswer, rowOf, validateDiceOrders,
  type Answer, type Decision, type DieFace, type GameEvent, type ScenarioSetup, type Side, type UnitType,
} from '../../src/engine';
import { PERSONALITIES, chooseAnswer, isLegal, newMemory, personalityFor, type AiOptions } from '../../src/ai';
import { Rng } from '../../src/ai/rand';
import { resumeTurn } from '../../src/ai/sim';
import { scenarioFromJson, type ScenarioJson } from '../../src/scenarios';
import uticaJson from '../../design/exp3-data/310.json';
import { failOnAiErrors } from '../ai/no-ai-errors';
import { boardUi } from '../../src/ui/game/uiModel';
import { H, build, ev, forceDice, giveCard, must, n, noFirstStrike, passTurn, setupOf, u, type Pos } from './helpers';

beforeEach(() => forceDice([]));
failOnAiErrors();

type PosUnit = NonNullable<Pos['units']>[number];
const top = (type: UnitType, at: [number, number], extra: Partial<PosUnit> = {}): PosUnit => ({ side: 'top', type, at, ...extra });
const bottom = (type: UnitType, at: [number, number], extra: Partial<PosUnit> = {}): PosUnit => ({ side: 'bottom', type, at, ...extra });

/**
 * The Numidians (top) order by 2 dice and move first; the Caesarians (bottom) hold 5 cards.
 * u1 LC (4,4) light, u2 MC (4,6) medium, u3 HI (2,8) heavy with Saburra (L7), u4 LI (0,2) light on the Numidian baseline;
 * u5 Caesarian MC (7,6), u6 Caesarian LC (7,9); L8 a lone Caesarian leader (8,3).
 */
const numidia = (extra: Partial<Pos> = {}): Pos => ({
  first: 'top',
  orderDice: { top: 2 },
  units: [
    top('LC', [4, 4]), top('MC', [4, 6]), top('HI', [2, 8]), top('LI', [0, 2]),
    bottom('MC', [7, 6]), bottom('LC', [7, 9]),
  ],
  leaders: [{ side: 'top', name: 'Saburra', at: [2, 8] }, { side: 'bottom', name: 'Rufus', at: [8, 3] }],
  ...extra,
});

/** A driver at the start of the game, after the order roll of `faces` (forced). */
function start(p: Pos, faces: DieFace[], more: DieFace[] = []): GameDriver {
  const s = build(p);
  noFirstStrike(s);
  forceDice([...faces, ...more]);
  return new GameDriver(s);
}

type D<K extends Decision['kind']> = Extract<Decision, { kind: K }>;
const victim = (d: GameDriver) => d.pending as D<'diceVictim'>;

/** Choose `id` for the pending flag or swords face. */
function hit(d: GameDriver, id: string) {
  const i = victim(d).options.indexOf(id);
  expect(i, `${id} among ${JSON.stringify(d.pending)}`).toBeGreaterThanOrEqual(0);
  must(d, { kind: 'choose', index: i });
}

/** Finish the active turn: the first retreat option, no movement, no battle. */
function endTurn(d: GameDriver) {
  for (let guard = 0; guard < 50 && d.pending; guard++) {
    const k = d.pending.kind;
    if (k === 'retreat') must(d, { kind: 'choose', index: 0 });
    else if (k === 'move') must(d, { kind: 'endMove' });
    else if (k === 'battle') must(d, { kind: 'endBattle' });
    else return;
  }
}

const rolls = (e: GameEvent[]) => e.filter((x): x is Extract<GameEvent, { t: 'roll' }> => x.t === 'roll');

describe('dice orders: data (§18.10)', () => {
  it('a dice side holds no cards and has no Command; the other side its hand; cloneState keeps the dice', () => {
    const s = build(numidia());
    expect(s.special.orderDice).toEqual({ top: 2, bottom: 0 });
    expect(s.players.top).toMatchObject({ hand: [], command: 0 });
    expect(s.players.bottom.hand).toHaveLength(5);
    expect(cloneState(s).special.orderDice).toEqual({ top: 2, bottom: 0 });
  });

  it('every other battle: no side orders by dice', () => {
    expect(build({ units: [top('MI', [2, 2]), bottom('MI', [6, 2])] }).special.orderDice).toEqual({ top: 0, bottom: 0 });
  });

  it('rejects bad data: a hand, a dice count that is not a whole number from 1, dice without dice orders, an unknown mode', () => {
    const base = setupOf(numidia());
    const bad = (topSide: Partial<ScenarioSetup['top']>, more: Partial<ScenarioSetup> = {}) => () =>
      createGame({ ...base, top: { ...base.top, ...topSide }, ...more }, 1);
    expect(bad({ cards: 5 })).toThrow(/^top army: a side with dice orders holds no cards \(cards: 0\) \(qa\)$/);
    for (const orderDice of [0, 1.5, -2, '2', undefined]) {
      expect(bad({ orderDice: orderDice as number })).toThrow(/^top army: orderDice must be a whole number, 1 or more \(qa\)$/);
    }
    expect(bad({ orders: undefined, cards: 5 })).toThrow(/^top army: orderDice needs orders: 'dice' \(qa\)$/);
    expect(bad({ orders: 'cards' as 'dice' })).toThrow(/^top army: unknown orders cards \(qa\)$/);
    expect(bad({}, { handGrowth: { side: 'top', to: 4 } })).toThrow(/^handGrowth: the top army orders by dice and holds no cards \(qa\)$/);
    expect(bad({}, { initialCommand: { top: 3 } })).toThrow(/^initialCommand: the top army orders by dice and holds no cards \(qa\)$/);
    expect(() => createGame(base, 1)).not.toThrow();
  });
});

describe("the dice side's turn (§18.10)", () => {
  it('starts with the order roll, not a card: turnStart, then the dice and the orders decision', () => {
    const d = start(numidia(), ['light', 'medium']);
    expect(d.pending).toEqual({ kind: 'diceOrders', side: 'top', faces: ['light', 'medium'] });
    const e = ev(d);
    expect(e[0]).toEqual({ t: 'turnStart', side: 'top', turn: 1 });
    expect(rolls(e)).toEqual([{ t: 'roll', purpose: 'diceOrders', faces: ['light', 'medium'], scoring: [true, true], by: null, against: null }]);
    expect(e.some((x) => x.t === 'cardPlayed')).toBe(false);
    expect(d.state.turn).toMatchObject({ card: null, effective: null, phase: 'orders' });
  });

  it('rolls as many dice as the data says', () => {
    const d = start(numidia({ orderDice: { top: 3 } }), ['light', 'medium', 'heavy']);
    expect(d.pending).toEqual({ kind: 'diceOrders', side: 'top', faces: ['light', 'medium', 'heavy'] });
  });

  it('each class face orders one unit of that class, anywhere; movement and battle follow with no card modifiers', () => {
    const d = start(numidia(), ['light', 'medium']);
    ev(d);
    must(d, { kind: 'assign', ids: ['u4', 'u2'] }); // the LI on the far left baseline and the MC in the centre
    expect(ev(d)).toContainEqual({ t: 'ordered', side: 'top', ids: ['u4', 'u2'] });
    expect(Object.keys(d.state.turn.ordered)).toEqual(['u4', 'u2']);
    expect(d.state.turn.mods).toEqual(defaultMods());
    expect(d.pending).toEqual({ kind: 'move', side: 'top', stage: 1 });
    must(d, { kind: 'move', piece: 'u2', to: H(5, 6) });
    expect(u(d, 'u2')!.hex).toBe(H(5, 6));
  });

  it('refuses a unit of another class, one unit twice, a leader or an enemy for a class face, and a wrong count', () => {
    const d = start(numidia(), ['light', 'light']);
    for (const ids of [['u2', null], ['u1', 'u1'], ['L7', null], ['u6', null], ['u1'], ['u1', null, null]]) {
      expect(d.answer({ kind: 'assign', ids }), JSON.stringify(ids)).toBe(false);
    }
    expect(d.answer({ kind: 'orders', pieces: ['u1'] })).toBe(false);
    must(d, { kind: 'assign', ids: ['u1', 'u4'] }); // two equal dice order two different units
    expect(Object.keys(d.state.turn.ordered)).toEqual(['u1', 'u4']);
  });

  it('a face may be left unused', () => {
    const d = start(numidia(), ['light', 'medium']);
    must(d, { kind: 'assign', ids: [null, 'u2'] });
    expect(Object.keys(d.state.turn.ordered)).toEqual(['u2']);
  });

  it('a helmet orders a leader together with his attached unit', () => {
    const d = start(numidia(), ['leader', 'heavy']);
    expect(d.answer({ kind: 'assign', ids: ['L7', 'u3'] })).toBe(false); // u3 comes with Saburra already
    expect(d.answer({ kind: 'assign', ids: ['u3', null] })).toBe(false); // a helmet orders a leader
    expect(d.answer({ kind: 'assign', ids: [null, 'L7'] })).toBe(false); // a class face orders a unit
    ev(d);
    must(d, { kind: 'assign', ids: ['L7', null] });
    expect(ev(d)).toContainEqual({ t: 'ordered', side: 'top', ids: ['L7', 'u3'] });
    expect(Object.keys(d.state.turn.ordered).sort()).toEqual(['L7', 'u3']);
  });

  it('a lone leader is ordered alone; a second helmet is lost with one leader', () => {
    const lone = numidia({ leaders: [{ side: 'top', name: 'Saburra', at: [3, 10] }, { side: 'bottom', name: 'Rufus', at: [8, 3] }] });
    const d = start(lone, ['leader', 'leader']);
    expect(d.answer({ kind: 'assign', ids: ['L7', 'L7'] })).toBe(false);
    must(d, { kind: 'assign', ids: ['L7', null] });
    expect(Object.keys(d.state.turn.ordered)).toEqual(['L7']);
    expect(d.pending).toEqual({ kind: 'move', side: 'top', stage: 1 });
  });

  it('a face with no unit of its class is lost; with no usable face nothing is asked and the turn ends', () => {
    // no heavy unit and no leader: a heavy face and a helmet order nothing
    const noHeavy = numidia({ units: [top('LC', [4, 4]), top('MC', [4, 6]), bottom('MC', [7, 6])], leaders: [] });
    let d = start(noHeavy, ['heavy', 'leader']);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
    expect(Object.keys(d.state.turn.ordered)).toEqual([]);
    d = start(noHeavy, ['heavy', 'light']);
    expect(d.pending).toEqual({ kind: 'diceOrders', side: 'top', faces: ['heavy', 'light'] });
    expect(d.answer({ kind: 'assign', ids: ['u2', 'u1'] })).toBe(false);
    must(d, { kind: 'assign', ids: [null, 'u1'] });
  });

  it('validateDiceOrders: flags and swords order nothing', () => {
    const s = build(numidia());
    expect(validateDiceOrders(s, 'top', ['flag', 'light'], [null, 'u1'])).toBeNull();
    expect(validateDiceOrders(s, 'top', ['flag', 'light'], ['u1', null])).not.toBeNull();
    expect(validateDiceOrders(s, 'top', ['swords', 'light'], ['u4', 'u1'])).not.toBeNull();
  });
});

describe('flag and swords faces: the dice side chooses its own victims (§18.10, spec)', () => {
  it('a flag: any of its units, which retreats for one flag toward its own edge; no flag is ignored', () => {
    const d = start(numidia(), ['flag', 'medium']);
    expect(d.pending).toEqual({ kind: 'diceVictim', side: 'top', face: 'flag', options: ['u1', 'u2', 'u3', 'u4'] });
    ev(d);
    hit(d, 'u3'); // the HI with Saburra attached, who would otherwise let it ignore a flag
    expect(d.pending).toMatchObject({ kind: 'retreat', side: 'top', unit: 'u3', reason: 'retreat' });
    must(d, { kind: 'choose', index: 0 });
    const e = ev(d);
    expect(e).toContainEqual({ t: 'flags', id: 'u3', flags: 1, ignored: 0 });
    expect(rowOf(u(d, 'u3')!.hex)).toBe(1); // an HI retreats 1 hex
    expect(d.state.leaders.find((l) => l.id === 'L7')!.hex).toBe(u(d, 'u3')!.hex); // Saburra goes with it
    expect(d.pending).toEqual({ kind: 'diceOrders', side: 'top', faces: ['flag', 'medium'] });
    must(d, { kind: 'assign', ids: [null, 'u2'] });
  });

  it('a unit that cannot retreat loses a block for each hex it cannot take, even on its baseline', () => {
    const d = start(numidia(), ['flag', 'swords']);
    hit(d, 'u4'); // the LI on row 0: 2 hexes it cannot take
    expect(u(d, 'u4')!.blocks).toBe(2);
    expect(victim(d)).toMatchObject({ kind: 'diceVictim', face: 'swords' });
  });

  it('the leader casualty check applies to a flag retreat that costs blocks', () => {
    const p = numidia({ leaders: [{ side: 'top', name: 'Saburra', at: [0, 2] }, { side: 'bottom', name: 'Rufus', at: [8, 3] }] });
    const d = start(p, ['flag', 'light'], ['leader', 'leader']);
    ev(d);
    hit(d, 'u4');
    const e = ev(d);
    expect(rolls(e).map((r) => r.purpose)).toEqual(['leaderCheck']);
    expect(e).toContainEqual({ t: 'leaderKilled', id: 'L7' });
    expect(d.state.players.bottom.banners).toBe(1);
  });

  it('swords: the chosen unit loses 1 block', () => {
    const d = start(numidia(), ['swords', 'light']);
    expect(d.pending).toEqual({ kind: 'diceVictim', side: 'top', face: 'swords', options: ['u1', 'u2', 'u3', 'u4'] });
    ev(d);
    hit(d, 'u2');
    expect(ev(d)).toContainEqual(expect.objectContaining({ t: 'damage', id: 'u2', amount: 1, left: 2 }));
    expect(d.pending).toEqual({ kind: 'diceOrders', side: 'top', faces: ['swords', 'light'] });
  });

  it('swords on a unit with a leader: the leader makes the casualty check', () => {
    const d = start(numidia(), ['swords', 'light'], ['leader', 'leader']);
    hit(d, 'u3');
    expect(u(d, 'u3')!.blocks).toBe(3);
    expect(d.state.leaders.some((l) => l.id === 'L7')).toBe(false);
    expect(d.state.players.bottom.banners).toBe(1);
  });

  it('a unit eliminated by its own dice gives the enemy a banner; a last banner ends the battle at once', () => {
    let d = start(numidia({ units: [top('LC', [4, 4]), top('MC', [4, 6], { blocks: 1 }), bottom('MC', [7, 6])], leaders: [] }), ['swords', 'light']);
    hit(d, 'u2');
    expect(u(d, 'u2')).toBeUndefined();
    expect(d.state.players.bottom.banners).toBe(1);
    expect(d.pending).toEqual({ kind: 'diceOrders', side: 'top', faces: ['swords', 'light'] });
    d = start(numidia({ banners: 1, units: [top('LC', [4, 4]), top('MC', [4, 6], { blocks: 1 }), bottom('MC', [7, 6])], leaders: [] }), ['swords', 'light']);
    hit(d, 'u2');
    expect(d.state.winner).toBe('bottom');
    expect(d.pending).toBeNull();
  });

  it('flags come before swords, each victim chosen once the one before is resolved', () => {
    const d = start(numidia(), ['swords', 'flag']);
    expect(victim(d).face).toBe('flag');
    hit(d, 'u4'); // loses 2 blocks
    expect(victim(d)).toEqual({ kind: 'diceVictim', side: 'top', face: 'swords', options: ['u1', 'u2', 'u3', 'u4'] });
    hit(d, 'u4');
    expect(u(d, 'u4')!.blocks).toBe(1);
    // nothing to order: the Caesarians' turn
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
    // two flags: the second is chosen after the first retreat, among the units left
    const two = start(numidia({ units: [top('LC', [4, 4]), top('LI', [0, 2], { blocks: 2 }), bottom('MC', [7, 6])], leaders: [] }), ['flag', 'flag']);
    hit(two, 'u2');
    expect(u(two, 'u2')).toBeUndefined();
    expect(victim(two)).toEqual({ kind: 'diceVictim', side: 'top', face: 'flag', options: ['u1'] });
  });

  it('refuses an answer that is not one of the options', () => {
    const d = start(numidia(), ['flag', 'light']);
    for (const a of [{ kind: 'choose', index: 4 }, { kind: 'choose', index: -1 }, { kind: 'choose', index: 0.5 }, { kind: 'hex', hex: H(4, 4) }] as Answer[]) {
      expect(d.answer(a), JSON.stringify(a)).toBe(false);
    }
  });
});

describe('cards: the dice side never draws or plays one (§18.10)', () => {
  it('its turn ends without a draw; the Caesarians draw after theirs', () => {
    const d = start(numidia(), ['light', 'medium']);
    const deck = d.state.deck.length;
    must(d, { kind: 'assign', ids: ['u1', 'u2'] });
    endTurn(d);
    expect(ev(d).some((e) => e.t === 'draw')).toBe(false);
    expect(d.state.players.top.hand).toEqual([]);
    expect(d.state.deck.length).toBe(deck);
    expect(d.state.lastCard.top).toBeNull();
    expect(d.state.special.turnsDone.top).toBe(1);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
    passTurn(d);
    expect(ev(d)).toContainEqual({ t: 'draw', side: 'bottom' });
    expect(d.state.players.bottom.hand).toHaveLength(5);
  });

  it('a Caesarian Counter Attack has nothing to copy and orders nothing', () => {
    const d = start(numidia(), ['light', 'medium']);
    must(d, { kind: 'assign', ids: ['u1', 'u2'] });
    endTurn(d);
    const card = giveCard(d.state, 'bottom', 'counterAttack');
    forceDice(['heavy', 'heavy']); // the next Numidian roll
    must(d, { kind: 'playCard', card });
    expect(d.state.turn.side).toBe('top'); // the Caesarian turn went by with no orders
    expect(d.pending).toEqual({ kind: 'diceOrders', side: 'top', faces: ['heavy', 'heavy'] });
  });

  it('the Caesarians may play First Strike against a dice-ordered attack, and draw its replacement after that turn', () => {
    // u1 Numidian MC next to u2 Caesarian MI
    const s = build(numidia({ units: [top('MC', [4, 6]), bottom('MI', [5, 6]), bottom('LC', [7, 9])], leaders: [] }));
    noFirstStrike(s);
    const fs = giveCard(s, 'bottom', 'firstStrike');
    forceDice(['medium', 'light']);
    const d = new GameDriver(s);
    must(d, { kind: 'assign', ids: ['u1', null] });
    must(d, { kind: 'endMove' });
    forceDice(n('heavy', 12)); // nobody is hit
    must(d, { kind: 'attack', unit: 'u1', target: H(5, 6) });
    expect(d.pending).toEqual({ kind: 'defend', side: 'bottom', attacker: 'u1', target: 'u2', canEvade: false, canFirstStrike: true, bonus: false });
    ev(d);
    must(d, { kind: 'defend', choice: 'firstStrike' });
    endTurn(d); // the MC has used its battle: the Numidian turn ends
    const e = ev(d);
    expect(e.map((x) => x.t)).toContain('turnStart'); // the Caesarian turn has begun
    expect(e.filter((x) => x.t === 'draw')).toEqual([{ t: 'draw', side: 'bottom' }]); // First Strike's replacement only
    expect(d.state.players.bottom.hand).toHaveLength(5);
    expect(d.state.players.top.hand).toEqual([]);
    expect(d.state.discard).toContain(fs);
    expect(d.pending).toMatchObject({ kind: 'playCard', side: 'bottom' });
  });

  it('over many turns: the dice side is never asked for a card, its hand stays empty, its lastCard null', () => {
    for (let seed = 1; seed <= 4; seed++) {
      const s = build(numidia({ banners: 4 }), seed);
      const d = new GameDriver(s);
      let rnd = seed * 7919;
      const next = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
      let rolls = 0;
      for (let step = 0; step < 3000 && d.pending; step++) {
        const dec = d.pending;
        expect(dec.kind === 'playCard' && dec.side === 'top').toBe(false);
        if (dec.kind === 'diceOrders' || dec.kind === 'diceVictim') {
          expect(dec.side).toBe('top');
          rolls++;
        }
        expect(d.answer(randomAnswer(d.state, dec, next)), `${seed} ${JSON.stringify(dec)}`).toBe(true);
        expect(d.state.players.top.hand).toEqual([]);
        expect(d.state.lastCard.top).toBeNull();
      }
      expect(rolls).toBeGreaterThan(0);
    }
  });
});

describe('replays, random answers and the AI (§18.10)', () => {
  it('a replay of the answers reproduces the dice-order turns exactly', () => {
    const s = build(numidia({ banners: 5 }), 77);
    const d = new GameDriver(s);
    let rnd = 99;
    const next = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
    for (let step = 0; step < 400 && d.pending; step++) must(d, randomAnswer(d.state, d.pending, next));
    expect(d.answers.length).toBeGreaterThan(20);
    const r = GameDriver.replay(d.initial, d.answers);
    expect(r.state).toEqual(d.state);
    expect(r.pending).toEqual(d.pending);
  });

  it('randomAnswer and the AI answer both decisions legally', () => {
    const opts: AiOptions = { side: 'top', difficulty: 'recruit', personality: PERSONALITIES[1], seed: 5, deterministic: true, budgetScale: 0.1 };
    const check = (d: GameDriver) => {
      const dec = d.pending!;
      for (let i = 0; i < 10; i++) {
        const a = randomAnswer(d.state, dec, () => i / 10);
        expect(isLegal(d.state, dec, a), `${JSON.stringify(dec)} ${JSON.stringify(a)}`).toBe(true);
      }
      const ai = chooseAnswer(d.state, dec, opts, newMemory()).answer;
      expect(isLegal(d.state, dec, ai), JSON.stringify(ai)).toBe(true);
      expect(isLegal(d.state, dec, dec.kind === 'diceVictim' ? { kind: 'choose', index: dec.options.length } : { kind: 'assign', ids: ['u6', null] })).toBe(false);
      must(d, ai);
    };
    for (const faces of [['flag', 'swords'], ['light', 'leader'], ['leader', 'heavy'], ['light', 'light'], ['medium', 'flag']] as DieFace[][]) {
      const d = start(numidia(), faces);
      while (d.pending && (d.pending.kind === 'diceVictim' || d.pending.kind === 'diceOrders' || d.pending.kind === 'retreat')) {
        if (d.pending.kind === 'retreat') must(d, { kind: 'choose', index: 0 });
        else check(d);
      }
    }
  });

  it('the AI (simple policy) spares the unit a block would destroy and the unit that cannot retreat, and uses every face', () => {
    const opts: AiOptions = { side: 'top', difficulty: 'tribune', personality: PERSONALITIES[0], seed: 3, deterministic: true, budgetScale: 0.1 };
    const pick = (p: Pos, faces: DieFace[]) => {
      const d = start(p, faces);
      const dec = d.pending!;
      return { dec, a: chooseAnswer(d.state, dec, opts, newMemory()).answer };
    };
    const weak = numidia({ units: [top('LC', [4, 4]), top('MC', [4, 6], { blocks: 1 }), top('HI', [2, 8]), top('LI', [0, 2]), bottom('MC', [7, 6])] });
    const sw = pick(weak, ['swords', 'light']);
    expect(sw.a.kind === 'choose' && (sw.dec as D<'diceVictim'>).options[sw.a.index]).not.toBe('u2');
    const fl = pick(numidia(), ['flag', 'light']);
    expect(fl.a.kind === 'choose' && (fl.dec as D<'diceVictim'>).options[fl.a.index]).not.toBe('u4');
    const or = pick(numidia(), ['light', 'medium']);
    expect(or.a.kind === 'assign' && or.a.ids.every((x) => x !== null)).toBe(true);
    const hm = pick(numidia(), ['leader', 'heavy']);
    expect(hm.a).toEqual({ kind: 'assign', ids: ['L7', null] });
  });

  it("the AI's battle rollouts resume a dice-order turn where it stands: no second order roll", () => {
    const s = build(numidia({ units: [top('MC', [4, 6]), bottom('MI', [5, 6]), bottom('LC', [7, 9])], leaders: [] }));
    noFirstStrike(s);
    forceDice(['medium', 'light']);
    const d = new GameDriver(s);
    must(d, { kind: 'assign', ids: ['u1', null] });
    must(d, { kind: 'endMove' });
    expect(d.pending).toEqual({ kind: 'battle', side: 'top' });
    const c = cloneState(d.state);
    const seen: string[] = [];
    const ok = resumeTurn(c, (st, dec) => {
      seen.push(dec.kind);
      return randomAnswer(st, dec, () => 0.5);
    }, new Rng(7), 'battle');
    expect(ok).toBe(true);
    expect(seen).not.toContain('diceOrders');
    expect(seen).not.toContain('diceVictim');
    expect(c.turn.phase).toBe('done');
    expect(c.players.top.hand).toEqual([]);
  });
});

describe('the board marks the victims to choose (UI, minimal)', () => {
  it('a flag or swords face: every unit of the rolling side, for the player of that side only', () => {
    const d = start(numidia(), ['swords', 'light']);
    const sel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null };
    const marked = boardUi(d.state, d.pending, sel, 'top').highlights;
    expect([...marked.entries()].sort((a, b) => a[0] - b[0])).toEqual(
      [H(0, 2), H(2, 8), H(4, 4), H(4, 6)].map((h) => [h, 'option']),
    );
    expect(boardUi(d.state, d.pending, sel, 'bottom').highlights.size).toBe(0);
  });
});

describe('310 Utica P1 itself (design/exp3-data/310.json)', () => {
  // 310 is staged for import: the loader does not know expansion 'exp3' yet, so it is read as an Expansion #2 file
  const json = (): ScenarioJson => ({ ...(JSON.parse(JSON.stringify(uticaJson)) as ScenarioJson), expansion: 'exp2' });

  it('the loader keeps the dice orders: the Numidians roll 2 order dice and hold no card; the Caesarians hold 6 and move first', () => {
    const { setup } = scenarioFromJson(json());
    expect(setup.top).toMatchObject({ army: 'Numidian', cards: 0, orders: 'dice', orderDice: 2 });
    expect(setup.bottom.orders).toBeUndefined();
    expect(setup.bottom.orderDice).toBeUndefined();
    const s = createGame(setup, 1);
    expect(s.special.orderDice).toEqual({ top: 2, bottom: 0 });
    expect(s.players.top).toMatchObject({ hand: [], command: 0 });
    expect(s.players.bottom.hand).toHaveLength(6);
    expect(s.active).toBe('bottom');
    expect(s.bannersToWin).toBe(4);
  });

  it('random play reaches the end of the battle; the Numidians never hold or play a card', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const d = new GameDriver(createGame(scenarioFromJson(json()).setup, seed));
      let rnd = seed * 48271;
      const next = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
      const kinds = new Set<string>();
      let step = 0;
      for (; step < 20000 && d.pending; step++) {
        const dec = d.pending;
        kinds.add(`${dec.side}:${dec.kind}`);
        expect(d.answer(randomAnswer(d.state, dec, next)), `${seed} ${JSON.stringify(dec)}`).toBe(true);
      }
      expect(d.state.winner, `seed ${seed}`).not.toBeNull();
      expect(kinds.has('top:playCard')).toBe(false);
      expect(kinds.has('top:diceOrders')).toBe(true);
      expect(d.state.players.top.hand).toEqual([]);
    }
  });

  it('the AI plays both sides to the end with legal answers', () => {
    const { setup } = scenarioFromJson(json());
    const d = new GameDriver(createGame(setup, 4552));
    const opts: Record<Side, AiOptions> = {
      top: { side: 'top', difficulty: 'recruit', personality: personalityFor(setup.top.commander, setup.top.army), seed: 11, budgetScale: 0.3 },
      bottom: { side: 'bottom', difficulty: 'recruit', personality: personalityFor(setup.bottom.commander, setup.bottom.army), seed: 22, budgetScale: 0.3 },
    };
    const mems = { top: newMemory(), bottom: newMemory() };
    let steps = 0;
    while (!d.over && steps++ < 20000) {
      const dec = d.pending!;
      const r = chooseAnswer(d.state, dec, opts[dec.side], mems[dec.side]);
      expect(isLegal(d.state, dec, r.answer), `${dec.kind}: ${JSON.stringify(r.answer)}`).toBe(true);
      must(d, r.answer);
    }
    expect(d.state.winner).not.toBeNull();
    expect([mems.top.fallbacks, mems.bottom.fallbacks]).toEqual([0, 0]);
  });

  it('a tribune Numidian plays a few turns against a tribune Caesarian with legal answers', () => {
    const { setup } = scenarioFromJson(json());
    const d = new GameDriver(createGame(setup, 310));
    const opt = (side: Side, seed: number): AiOptions => ({
      side, difficulty: 'tribune', personality: personalityFor(setup[side].commander, setup[side].army), seed, budgetScale: 0.05, deterministic: true,
      cfgPatch: { maxSims: 60, battleRollouts: 4 },
    });
    const opts = { top: opt('top', 1), bottom: opt('bottom', 2) };
    const mems = { top: newMemory(), bottom: newMemory() };
    while (!d.over && d.state.turn.number <= 6) {
      const dec = d.pending!;
      const r = chooseAnswer(d.state, dec, opts[dec.side], mems[dec.side]);
      expect(isLegal(d.state, dec, r.answer), `${dec.kind}: ${JSON.stringify(r.answer)}`).toBe(true);
      must(d, r.answer);
    }
    expect([mems.top.fallbacks, mems.bottom.fallbacks]).toEqual([0, 0]);
  });
});
