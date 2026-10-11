// AI checks for Expansion #3 (rules-reference §18.7–§18.11, §20): dice orders (310), city walls and steep slopes (308, 309),
// the fixed-entry reinforcements and the forced placement (308), ship markers (313), the single-side majority (309), leader
// exits (317), immobile units (306), Julian legions with Caesar, commanded leaders (304), commanders and their voice, and the
// legality of the first decisions of every Expansion #3 battle. Cheap and deterministic (tribune in deterministic mode,
// fixed seeds, constructed positions built with the rules suite's helpers).
import { afterEach, describe, expect, it } from 'vitest';
import {
  GameDriver, OFF_BOARD, createGame, diceOrderPieces, diceOrdered, forceDice, newTurn, pieceMoves, randomAnswer, retreatOptions,
  retreatPerFlag, validateDiceOrders, validateOrders, type Decision, type DieFace, type GameEvent, type GameState, type Side, type Unit,
} from '../../src/engine';
import { SCENARIOS, scenarioById } from '../../src/scenarios';
import { chooseAnswer, isLegal, newMemory, personalityFor, type AiOptions } from '../../src/ai';
import { Occ, canEvadeOcc } from '../../src/ai/board';
import { attackNowValue, closeAttackEV } from '../../src/ai/estimate';
import { evaluate, orderingPower, singleUnitRisk } from '../../src/ai/evaluate';
import { scoreOption } from '../../src/ai/moves';
import { orderCandidates, pieceBenefits } from '../../src/ai/ordering';
import { diceAssignments } from '../../src/ai/policies';
import { Rng } from '../../src/ai/rand';
import { NEUTRAL_W, WIN_SCORE, bannerStep } from '../../src/ai/values';
import { speak, troopName } from '../../src/ai/voice';
import { H, build, must, type Pos } from '../rules/helpers';
import { aiTurn, detOpts, setHand } from './helpers';
import { failOnAiErrors } from './no-ai-errors';

type D<K extends Decision['kind']> = Extract<Decision, { kind: K }>;
type PosUnit = NonNullable<Pos['units']>[number];
const top = (type: PosUnit['type'], at: [number, number], extra: Partial<PosUnit> = {}): PosUnit => ({ side: 'top', type, at, ...extra });
const bottom = (type: PosUnit['type'], at: [number, number], extra: Partial<PosUnit> = {}): PosUnit => ({ side: 'bottom', type, at, ...extra });

const moves = (events: GameEvent[]) => events.filter((e): e is Extract<GameEvent, { t: 'move' }> => e.t === 'move');
const combats = (events: GameEvent[]) => events.filter((e): e is Extract<GameEvent, { t: 'combat' }> => e.t === 'combat');

/** Does unit `u`'s retreat for one flag (toward its own edge) lose blocks wherever it goes? */
function blockedRetreat(s: GameState, u: Unit): boolean {
  return Math.min(...retreatOptions(s, u, retreatPerFlag(u, null)).map((o) => o.losses)) > 0;
}

/** The 310 battle with the Numidians (top) to act, their order dice forced to `faces`. */
function uticaAt(seed: number, faces: DieFace[], edit?: (s: GameState) => void): GameDriver {
  const sc = scenarioById('310');
  const s = createGame(sc.setup, seed);
  s.active = 'top';
  s.turn = newTurn('top', 2);
  edit?.(s);
  forceDice(faces);
  return new GameDriver(s);
}

afterEach(() => forceDice([]));
failOnAiErrors();

const EXP3 = SCENARIOS.filter((sc) => Number(sc.id) >= 301 && Number(sc.id) <= 319);

// ---------------------------------------------------------------------------------------------------------------------
// every battle: the first decisions of both sides are legal
// ---------------------------------------------------------------------------------------------------------------------

describe('Expansion #3 battles: first decisions', () => {
  it('has all 19 battles', () => {
    expect(EXP3.map((sc) => sc.id)).toHaveLength(19);
  });

  for (const sc of EXP3) {
    it(`${sc.id} ${sc.name}: both sides' first turns are legal`, () => {
      const d = new GameDriver(createGame(sc.setup, 9000 + Number(sc.id)));
      const mems = { top: newMemory(), bottom: newMemory() };
      const opts = (side: Side): AiOptions => ({
        ...detOpts(side, 31 + Number(sc.id), { budgetScale: 0.08 }),
        personality: personalityFor(sc.setup[side].commander, sc.setup[side].army),
      });
      let steps = 0;
      while (!d.over && d.state.turn.number <= 2 && steps++ < 400) {
        const dec = d.pending!;
        const r = chooseAnswer(d.state, dec, opts(dec.side), mems[dec.side]);
        expect(isLegal(d.state, dec, r.answer), `${dec.kind}: ${JSON.stringify(r.answer)}`).toBe(true);
        expect(d.answer(r.answer), `${dec.kind}: ${d.lastError}`).toBe(true);
      }
      expect(d.over || d.state.turn.number > 2).toBe(true);
      expect([mems.top.fallbacks, mems.bottom.fallbacks]).toEqual([0, 0]);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// dice orders (310, §18.10)
// ---------------------------------------------------------------------------------------------------------------------

describe('dice orders (310)', () => {
  it('a flag never falls on a unit whose retreat is blocked while one with a free retreat exists', () => {
    // at the start of 310 four Numidian units stand on their own baseline (no retreat); the others can fall back
    for (const seed of [1, 2, 3, 4]) {
      const d = uticaAt(seed, ['flag', 'flag'], (s) => {
        // a little variety: some units further forward, one battered
        if (seed % 2) for (const u of s.units) if (u.side === 'top' && u.hex >= 13 * 2) u.hex += 13 * 2;
        if (seed > 2) s.units.find((u) => u.side === 'top' && u.type === 'MI')!.blocks = 1;
      });
      let flags = 0;
      for (let guard = 0; guard < 20 && d.pending; guard++) {
        const dec = d.pending;
        if (dec.kind !== 'diceVictim' && dec.kind !== 'retreat') break;
        const r = chooseAnswer(d.state, dec, detOpts('top', seed), newMemory());
        if (dec.kind === 'diceVictim') {
          flags++;
          const units = dec.options.map((id) => d.state.units.find((u) => u.id === id)!);
          const pick = units[(r.answer as { index: number }).index];
          if (units.some((u) => !blockedRetreat(d.state, u))) expect(blockedRetreat(d.state, pick), `seed ${seed}: ${pick.id}`).toBe(false);
        }
        must(d, r.answer);
      }
      expect(flags, `seed ${seed}`).toBe(2);
    }
  });

  it('the rule holds even where the evaluation would rather lose the block (a free retreat off a held hex)', () => {
    // the MI holds an objective hex next to a battered enemy; the AX on its baseline cannot retreat. By the evaluation
    // alone a block of the AX is cheaper than the held banner, but blocks lost to a blocked retreat come first (§18.10 AI)
    const s = build({
      first: 'top', orderDice: { top: 2 }, banners: 6, objectives: [{ kind: 'hold', side: 'top', hexes: [[3, 6]] }],
      units: [top('AX', [0, 2]), top('MI', [3, 6]), bottom('MI', [4, 6], { blocks: 1 }), bottom('MI', [8, 0])],
    });
    forceDice(['flag', 'light']);
    const d = new GameDriver(s);
    const dec = d.pending as D<'diceVictim'>;
    expect(blockedRetreat(d.state, d.state.units[0])).toBe(true);
    const r = chooseAnswer(d.state, dec, detOpts('top', 1), newMemory());
    expect(dec.options[(r.answer as { index: number }).index]).toBe('u2');
  });

  it('swords never fall on a unit one block from elimination while another can take the loss', () => {
    for (const seed of [1, 2]) {
      const d = uticaAt(seed, ['swords', 'swords'], (s) => {
        for (const u of s.units) if (u.side === 'top' && u.type !== 'HI') u.blocks = 1; // only the HI has blocks to spare
      });
      const hi = d.state.units.find((u) => u.side === 'top' && u.type === 'HI')!.id;
      const dec = d.pending as D<'diceVictim'>;
      const r = chooseAnswer(d.state, dec, detOpts('top', seed), newMemory());
      expect(dec.options[(r.answer as { index: number }).index]).toBe(hi);
    }
  });

  it('the order dice are assigned as a whole: a helmet goes to the lone leader when his rival\'s unit is the medium face\'s best', () => {
    // Saburra (L1) rides with the medium cavalry that has a kill to make; a lone leader (L2) stands in danger. A helmet on
    // Saburra would take the cavalry with him and leave the medium face to a cavalry far away: worse than the helmet on L2
    // and the medium face on the cavalry with the kill.
    const s = build({
      first: 'top', orderDice: { top: 2 },
      units: [top('MC', [4, 6]), top('MC', [0, 12]), top('LI', [0, 0]), bottom('AX', [5, 6], { blocks: 1 }), bottom('MI', [4, 2]), bottom('MI', [8, 12])],
      leaders: [{ side: 'top', name: 'Saburra', at: [4, 6] }, { side: 'top', name: 'Lone', at: [3, 2] }],
    });
    const [sab, lone] = s.leaders.filter((l) => l.side === 'top').map((l) => l.id);
    const faces: DieFace[] = ['leader', 'medium'];
    const best = diceAssignments(s, 'top', faces, NEUTRAL_W)[0];
    expect(best.ids).toEqual([lone, 'u1']);
    // the per-face greedy choice (helmet first, on the leader worth most with his unit) is worth less
    const ben = pieceBenefits(s, 'top', null, NEUTRAL_W);
    const b = (id: string) => Math.max(0, ben.get(id) ?? 0);
    expect(b(sab) + b('u1') + b('u2')).toBeLessThan(best.benefit);
    // and the best is the best of every valid assignment
    let max = -Infinity;
    for (const x of [null, ...diceOrderPieces(s, 'top', 'leader')]) {
      for (const y of [null, ...diceOrderPieces(s, 'top', 'medium')]) {
        if (validateDiceOrders(s, 'top', faces, [x, y])) continue;
        max = Math.max(max, diceOrdered(s, [x, y]).reduce((a, id) => a + b(id), 0));
      }
    }
    expect(best.benefit).toBeCloseTo(max, 12);
  });

  it('the dice side plans its turn like a card turn: the ordered unit steps up and attacks', () => {
    for (const seed of [1, 2]) {
      const s = build({
        first: 'top', orderDice: { top: 2 },
        units: [top('MI', [3, 6]), top('LI', [0, 0]), bottom('AX', [5, 6], { blocks: 1 }), bottom('MI', [8, 0])],
      });
      forceDice(['medium', 'light']);
      const { events, decisions, mems } = aiTurn(s, seed);
      const orders = decisions.find((x) => x.d.kind === 'diceOrders');
      expect((orders?.a as { ids: (string | null)[] }).ids, `seed ${seed}`).toEqual(['u1', 'u2']);
      expect(mems.top.plan?.label, `seed ${seed}`).toMatch(/^dice \[/);
      expect(combats(events).some((e) => e.attacker === 'u1' && e.target === 'u3'), `seed ${seed}: attacked`).toBe(true);
    }
  });

  it('the evaluation counts a dice side\'s orders: its expected orders per turn, not a Command of 0', () => {
    const d = uticaAt(1, []);
    expect(d.state.players.top.command).toBe(0);
    expect(orderingPower(d.state, 'top')).toBeCloseTo((2 * 4) / 6, 12); // every class and a leader: 4 faces of 6 order
    expect(orderingPower(d.state, 'bottom')).toBe(6);
    const s = build({ first: 'top', orderDice: { top: 2 }, units: [top('LC', [2, 2]), bottom('MI', [6, 6])] });
    expect(orderingPower(s, 'top')).toBeCloseTo(2 / 6, 12); // only green circles order anything
  });

  it('AI against AI plays 310 to the end with no fallback answer', () => {
    const sc = scenarioById('310');
    const d = new GameDriver(createGame(sc.setup, 3107));
    const opt = (side: Side, seed: number): AiOptions => ({
      side, difficulty: 'tribune', personality: personalityFor(sc.setup[side].commander, sc.setup[side].army), seed, deterministic: true,
      budgetScale: 0.05, cfgPatch: { maxSims: 80, battleRollouts: 4 },
    });
    const opts = { top: opt('top', 1), bottom: opt('bottom', 2) };
    const mems = { top: newMemory(), bottom: newMemory() };
    let steps = 0;
    while (!d.over && steps++ < 6000) {
      const dec = d.pending!;
      const r = chooseAnswer(d.state, dec, opts[dec.side], mems[dec.side]);
      must(d, r.answer);
    }
    expect(d.state.winner).not.toBeNull();
    expect([mems.top.fallbacks, mems.bottom.fallbacks]).toEqual([0, 0]);
  }, 60000);
});

// ---------------------------------------------------------------------------------------------------------------------
// city walls and steep slopes (308, 309, §18.7)
// ---------------------------------------------------------------------------------------------------------------------

describe('city walls and steep slopes', () => {
  /** A Gallic AX (u1) at (2,6), on a wall or on open ground; Roman attackers below it. */
  const wallPos = (wall: boolean, attackers: PosUnit[], blocks?: number): GameState =>
    build({
      first: 'bottom', legions: { bottom: 'julian' },
      terrain: wall ? [{ at: [2, 6], t: 'wall' }] : [],
      units: [top('AX', [2, 6], { blocks }), ...attackers],
    });

  it('an assault on a wall is worth much less: the defender strikes first, the roll is capped at 2, a sword and a flag are ignored', () => {
    const ev = (wall: boolean) => {
      const s = wallPos(wall, [bottom('HI', [3, 6])]);
      return closeAttackEV(s, new Occ(s), s.units[1], s.units[0], 'attack', true, NEUTRAL_W);
    };
    expect(ev(true).ev).toBeLessThan(ev(false).ev - 0.1);
    expect(ev(true).pElim).toBeLessThan(ev(false).pElim / 2);
    // the first strike itself: attacking along the wall (from a wall hex: no first strike, the same caps and ignores) is
    // worth more than from below, where the defender's roll may stop the attack before it is made
    const along = (attackerOnWall: boolean) => {
      const s = build({
        first: 'bottom', terrain: [{ at: [2, 6], t: 'wall' }, ...(attackerOnWall ? [{ at: [2, 7] as [number, number], t: 'wall' as const }] : [])],
        units: [top('AX', [2, 6]), bottom('MI', [2, 7])],
      });
      return closeAttackEV(s, new Occ(s), s.units[1], s.units[0], 'attack', true, NEUTRAL_W).ev;
    };
    expect(along(true)).toBeGreaterThan(along(false) + 0.01);
  });

  it('threats: a unit on a wall is safer, and a horseman that must move up first cannot attack it at all', () => {
    const risk = (wall: boolean, attacker: PosUnit) => {
      const s = wallPos(wall, [attacker]);
      return singleUnitRisk(s, new Occ(s), s.units[0], NEUTRAL_W);
    };
    expect(risk(true, bottom('MI', [3, 6]))).toBeLessThan(0.7 * risk(false, bottom('MI', [3, 6])));
    expect(risk(false, bottom('MC', [4, 6]))).toBeGreaterThan(0.01);
    expect(risk(true, bottom('MC', [4, 6]))).toBe(0);
    expect(risk(true, bottom('MC', [3, 6]))).toBeGreaterThan(0); // next to it already: it may attack next turn
  });

  it('a horseman never plans an attack on a wall it did not begin the turn next to, and never a move onto it', () => {
    const s = wallPos(true, [bottom('MC', [4, 6]), bottom('MI', [8, 0])], 1);
    const mc = s.units[1];
    s.turn.ordered[mc.id] = {
      id: mc.id, isLeader: false, startHex: H(4, 6), moved: 0, moveDone: false, move2Done: false, battlesLeft: 1, canBattle: true,
      mustBattle: false, enteredHexThisTurn: false, attachedThisTurn: false,
    };
    expect(pieceMoves(s, mc.id, 1).some((m) => m.hex === H(2, 6))).toBe(false);
    mc.hex = H(3, 6);
    expect(attackNowValue(s, new Occ(s), mc, 1, true, false, NEUTRAL_W)).toBe(0);
    expect(attackNowValue(s, new Occ(s), mc, 0, true, false, NEUTRAL_W, H(3, 6))).toBeGreaterThan(0); // began next to it
    for (const seed of [1, 2]) {
      const t = wallPos(true, [bottom('MC', [4, 6]), bottom('MI', [8, 0])], 1);
      setHand(t, 'bottom', ['orderMounted', 'order2L', 'order2R', 'order3L', 'orderLight']);
      const { d, events } = aiTurn(t, seed);
      expect(combats(events).some((e) => e.attacker === 'u2'), `seed ${seed}: no attack`).toBe(false);
      expect(d.state.units.find((u) => u.id === 'u2')!.hex, `seed ${seed}`).not.toBe(H(2, 6));
    }
  });

  it('foot holding a wall stays on it; a foot unit next to an empty wall it must hold climbs it', () => {
    for (const seed of [1, 2]) {
      const s = build({
        first: 'top', banners: 8,
        terrain: [{ at: [0, 5], t: 'wall', hill: true }, { at: [0, 6], t: 'wall', hill: true }, { at: [0, 7], t: 'wall', hill: true }],
        units: [top('LB', [0, 5]), top('LB', [0, 7]), top('WA', [2, 2]), bottom('MI', [7, 6]), bottom('MI', [7, 8])],
      });
      setHand(s, 'top', ['orderLight', 'order3C', 'order2L', 'order2R', 'orderMedium']);
      const { d } = aiTurn(s, seed);
      expect([d.state.units[0].hex, d.state.units[1].hex], `seed ${seed}`).toEqual([H(0, 5), H(0, 7)]);
    }
    for (const seed of [1, 2]) {
      const s = build({
        first: 'bottom', banners: 8, legions: { bottom: 'julian' },
        terrain: [{ at: [0, 6], t: 'wall', hill: true }, { at: [0, 7], t: 'wall', hill: true }],
        objectives: [{ kind: 'hold', side: 'bottom', hexes: [[0, 6], [0, 7]] }],
        units: [bottom('MI', [1, 6]), bottom('MI', [6, 2]), top('WA', [3, 11]), top('AX', [2, 0])],
      });
      setHand(s, 'bottom', ['order2C', 'order3C', 'orderMedium', 'order2L', 'order2R']);
      const { d } = aiTurn(s, seed);
      expect([H(0, 6), H(0, 7)], `seed ${seed}`).toContain(d.state.units[0].hex);
    }
  });

  it('steep slopes (308): no close combat across them, so an enemy below in the forest threatens far less', () => {
    const risk = (slopes: boolean) => {
      const s = build({
        first: 'bottom', rules: slopes ? ['steepSlopes'] : [],
        terrain: [{ at: [3, 6], t: 'hill' }, { at: [4, 6], t: 'forest' }, { at: [4, 7], t: 'forest' }],
        units: [top('WA', [3, 6]), bottom('MI', [4, 6])],
      });
      return singleUnitRisk(s, new Occ(s), s.units[0], NEUTRAL_W);
    };
    expect(risk(true)).toBeLessThan(0.7 * risk(false));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// reinforcements and forced placement (308, §18.9)
// ---------------------------------------------------------------------------------------------------------------------

describe('308 reinforcements and the forced placement', () => {
  it('a Leadership card offers the fixed-entry reinforcements once: the section it names changes nothing', () => {
    const s = createGame(scenarioById('308').setup, 3);
    s.active = 'top';
    for (const kind of ['leadershipAny', 'inspiredL', 'inspiredR'] as const) {
      expect(orderCandidates(s, 'top', kind, NEUTRAL_W, 2).filter((c) => c.ambush), kind).toHaveLength(1);
    }
    // 206 keeps one candidate per section the card allows (its entry depends on the section)
    const t = createGame(scenarioById('206').setup, 3);
    t.active = 'bottom';
    expect(orderCandidates(t, 'bottom', 'leadershipAny', NEUTRAL_W, 2).filter((c) => c.ambush)).toHaveLength(3);
  });

  it('the Roman MI is placed where it helps, not on the first free hex', () => {
    // Gallic HI next to (8,0) and (8,1); a Gallic warband on its last block next to (8,4): the first hex is the worst
    const s = build({
      rules: ['magoAmbush'], first: 'bottom', legions: { bottom: 'julian' },
      ambush: { trigger: ['leadershipAny'], afterOwnTurns: 0, entryHexes: [[3, 0], [4, 0]], noMove: true, text: 'They come!' },
      units: [top('HI', [7, 0]), top('HI', [7, 1]), top('WA', [7, 4], { blocks: 1 }), bottom('MI', [6, 8]), bottom('LI', [7, 10])],
      reserves: [{ side: 'top', type: 'AX' }],
      placeUnits: [{ side: 'bottom', type: 'MI', hexes: [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4]], after: 'ambush' }],
    });
    s.special.reserveEntered = true;
    const d = new GameDriver(s);
    const dec = d.pending as D<'placeUnit'>;
    expect(dec.kind).toBe('placeUnit');
    expect(dec.options[0]).toBe(H(8, 0));
    const a = chooseAnswer(d.state, dec, detOpts('bottom', 1), newMemory()).answer as { hex: number };
    expect(a.hex).not.toBe(H(8, 0));
    const value = (h: number) => {
      const t = d.state;
      const u = t.special.placeUnits[0].unit;
      t.units.push(u);
      u.hex = h;
      const v = evaluate(t, 'bottom', 'bottom', NEUTRAL_W);
      t.units.pop();
      u.hex = OFF_BOARD;
      return v;
    };
    expect(value(a.hex)).toBeGreaterThan(value(H(8, 0)));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// objectives (§18.4): ship markers (313), single-side majority (309), leader exits (317)
// ---------------------------------------------------------------------------------------------------------------------

describe('Expansion #3 objectives', () => {
  it('313: a ship marker is worth most of a banner to the side standing on it, and a unit next to one takes it', () => {
    const mk = (at: [number, number]) =>
      build({
        first: 'bottom', banners: 6, legions: { bottom: 'julian', top: 'julian' },
        objectives: [{ kind: 'capture', side: 'bottom', hexes: [[0, 0], [0, 1], [0, 2], [0, 3]], when: 'turnStart', marker: 'ship' }],
        units: [bottom('MI', at), bottom('MI', [6, 6]), top('MI', [2, 10]), top('AX', [1, 9])],
      });
    const on = evaluate(mk([0, 1]), 'bottom', 'top', NEUTRAL_W);
    const off = evaluate(mk([1, 1]), 'bottom', 'top', NEUTRAL_W);
    expect(on - off).toBeGreaterThan(0.6 * bannerStep(1, 6));
    for (const seed of [1, 2]) {
      const s = mk([1, 1]);
      setHand(s, 'bottom', ['order2L', 'order3L', 'orderMedium', 'order2R', 'order3R']);
      const { d } = aiTurn(s, seed);
      expect([H(0, 1), H(0, 2)], `seed ${seed}`).toContain(d.state.units[0].hex);
    }
  });

  it('313: a raider one move from a free ship marker threatens it; a defender standing on the marker blocks it', () => {
    const mk = (defender: [number, number]) =>
      build({
        first: 'bottom', banners: 6, legions: { top: 'julian' },
        objectives: [{ kind: 'capture', side: 'top', hexes: [[0, 8]], when: 'turnStart', marker: 'ship' }],
        units: [top('AX', [1, 7]), top('MI', [2, 2]), bottom('LI', defender), bottom('MI', [7, 6])],
      });
    const blocking = evaluate(mk([0, 8]), 'bottom', 'top', NEUTRAL_W);
    const aside = evaluate(mk([1, 10]), 'bottom', 'top', NEUTRAL_W);
    expect(blocking - aside).toBeGreaterThan(0.2 * bannerStep(1, 6));
  });

  it('309: the Pompeians gain by contesting the hillock the Caesarians hold, and the Caesarians by widening their lead', () => {
    const mk = (caesarians: [number, number][], pompeians: [number, number][]) =>
      build({
        first: 'top', banners: 7,
        terrain: [{ at: [3, 4], t: 'hill' }, { at: [3, 5], t: 'hill' }, { at: [3, 6], t: 'hill' }],
        objectives: [{ kind: 'majority', sides: ['bottom'], hexes: [[3, 4], [3, 5], [3, 6]], banners: 1, when: 'always' }],
        units: [...caesarians.map((h) => bottom('MI', h)), ...pompeians.map((h) => top('MI', h)), bottom('LS', [8, 12]), top('LB', [0, 12])],
      });
    const held = evaluate(mk([[3, 4]], [[1, 6]]), 'top', 'top', NEUTRAL_W);
    const contested = evaluate(mk([[3, 4]], [[3, 6]]), 'top', 'top', NEUTRAL_W);
    expect(contested - held).toBeGreaterThan(0.5); // the Caesarians' held banner is gone
    const one = evaluate(mk([[3, 4], [5, 5]], [[3, 6]]), 'bottom', 'bottom', NEUTRAL_W);
    const two = evaluate(mk([[3, 4], [3, 5]], [[3, 6]]), 'bottom', 'bottom', NEUTRAL_W);
    expect(two - one).toBeGreaterThan(0.5); // a tie (no banner) became a lead
  });

  const RUSPINA = (extra: Partial<Pos> = {}): Pos => ({
    first: 'bottom', banners: 5, legions: { bottom: 'julian' },
    objectives: [{ kind: 'exit', side: 'bottom', hexes: Array.from({ length: 13 }, (_, c) => [0, c] as [number, number]), leadersScore: true }],
    units: [bottom('MI', [5, 6]), bottom('HI', [6, 2]), top('LC', [4, 12]), top('LI', [2, 0])],
    leaders: [{ side: 'bottom', name: 'Saserna', at: [2, 6] }],
    ...extra,
  });

  it('317: a lone leader one move from the exit row steps off the board for a banner', () => {
    for (const seed of [1, 2, 3]) {
      const s = build(RUSPINA());
      const l = s.leaders[0].id;
      setHand(s, 'bottom', ['order2C', 'order3C', 'order2L', 'orderHeavy', 'order2R']);
      const { d, events } = aiTurn(s, seed);
      const out = moves(events).find((e) => e.id === l);
      expect(out?.path[out.path.length - 1], `seed ${seed}`).toBe(OFF_BOARD);
      expect(d.state.players.bottom.banners, `seed ${seed}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('317: a unit leaving with its leader scores two banners', () => {
    const scoreExit = (withLeader: boolean) => {
      const s = build(RUSPINA({ leaders: withLeader ? [{ side: 'bottom', name: 'Saserna', at: [0, 6] }] : [], units: [bottom('MI', [0, 6]), top('LC', [4, 12])] }));
      s.players.bottom.banners = 3; // 2 short of the 5 needed
      s.turn.ordered.u1 = {
        id: 'u1', isLeader: false, startHex: H(0, 6), moved: 0, moveDone: false, move2Done: false, battlesLeft: 1, canBattle: true,
        mustBattle: false, enteredHexThisTurn: false, attachedThisTurn: false,
      };
      const m = pieceMoves(s, 'u1', 1).find((x) => x.hex === OFF_BOARD)!;
      expect(m).toBeDefined();
      return scoreOption(s, 'u1', m, 1, { me: 'bottom', W: NEUTRAL_W, noise: 0, decided: new Set() });
    };
    expect(scoreExit(true)).toBe(WIN_SCORE);
    expect(scoreExit(false)).toBeLessThan(WIN_SCORE / 2);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// units: immobile (306), Julian legions and Caesar, commanded leaders (304)
// ---------------------------------------------------------------------------------------------------------------------

describe('Expansion #3 units', () => {
  it('306: an immobile unit can never evade (the board mirror), and is never planned to move', () => {
    const mk = (immobile: boolean) => build({ first: 'bottom', units: [bottom('LI', [6, 6], { immobile }), top('MI', [5, 6]), top('WA', [1, 1])] });
    for (const immobile of [false, true]) {
      const s = mk(immobile);
      expect(canEvadeOcc(s, new Occ(s), s.units[0]), `immobile ${immobile}`).toBe(!immobile);
    }
    for (const seed of [1, 2]) {
      const s = build({ first: 'bottom', units: [bottom('MI', [6, 6], { immobile: true }), bottom('MI', [6, 8]), top('WA', [3, 6]), top('WA', [3, 8])] });
      setHand(s, 'bottom', ['order2C', 'order3C', 'orderMedium', 'order2L', 'order2R']);
      const { d, events } = aiTurn(s, seed);
      expect(moves(events).some((e) => e.id === 'u1'), `seed ${seed}`).toBe(false);
      expect(d.state.units[0].hex).toBe(H(6, 6));
    }
  });

  it('Julian legions march 2 hexes when there is nothing to fight; with Caesar they move 2 and attack', () => {
    for (const seed of [1, 2]) {
      const s = build({
        first: 'bottom', legions: { bottom: 'julian' },
        units: [bottom('MI', [8, 6]), bottom('MI', [8, 8]), top('WA', [1, 6]), top('WA', [1, 8])],
      });
      setHand(s, 'bottom', ['orderMedium', 'order2C', 'order3C', 'order2L', 'order2R']);
      const { events } = aiTurn(s, seed);
      expect(moves(events).some((e) => e.path.length === 3 && (e.id === 'u1' || e.id === 'u2')), `seed ${seed}: a march`).toBe(true);
    }
    for (const seed of [1, 2]) {
      const s = build({
        first: 'bottom', legions: { bottom: 'julian' },
        units: [bottom('HI', [6, 6]), top('AX', [3, 6], { blocks: 1 }), top('WA', [0, 0])],
        leaders: [{ side: 'bottom', name: 'Julius Caesar', at: [6, 6], traits: ['ccBonus', 'forcedMarch'] }],
      });
      setHand(s, 'bottom', ['orderHeavy', 'order2C', 'order3C', 'order2L', 'order2R']);
      const { events } = aiTurn(s, seed);
      const step = moves(events).find((e) => e.id === 'u1');
      expect(step?.path.length, `seed ${seed}: 2 hexes`).toBe(3);
      expect(combats(events).some((e) => e.attacker === 'u1' && e.purpose === 'close'), `seed ${seed}: attacked`).toBe(true);
    }
  });

  it('304: the Sertorian AI never gives orders that mix Herennius\' and Perpenna\'s commands', () => {
    const sc = scenarioById('304');
    const d = new GameDriver(createGame(sc.setup, 304));
    const mems = { top: newMemory(), bottom: newMemory() };
    const command = new Map<string, string | undefined>([
      ...d.state.units.map((u) => [u.id, u.command] as [string, string | undefined]),
      ...d.state.leaders.map((l) => [l.id, l.command] as [string, string | undefined]),
    ]);
    let orders = 0;
    let steps = 0;
    while (!d.over && d.state.turn.number <= 8 && steps++ < 2000) {
      const dec = d.pending!;
      const r = chooseAnswer(d.state, dec, detOpts(dec.side, 7, { budgetScale: 0.08 }), mems[dec.side]);
      if (dec.kind === 'orders' && r.answer.kind === 'orders' && dec.side === 'top' && !r.answer.ambushSection) {
        expect(validateOrders(d.state, 'top', dec.card, r.answer.pieces)).toBeNull();
      }
      must(d, r.answer);
      for (const { e } of d.drainEvents()) {
        if (e.t !== 'ordered' || e.side !== 'top') continue;
        orders++;
        const cmds = new Set(e.ids.map((id) => command.get(id)).filter((c) => c !== undefined));
        expect(cmds.size, `ordered ${e.ids.join(',')}`).toBeLessThanOrEqual(1);
      }
    }
    expect(orders).toBeGreaterThan(0);
  });

  /**
   * 304 with Perpenna's light cavalry gone: his command has no light or mounted unit left, so Order Light and Mounted
   * Troops, Mounted Charge and Move-Fire-Move order 1 unit of it (rule `commandFallback`). His MI still throw the pilum, so
   * Darken the Sky still orders them.
   */
  const valentia = (seed: number) => {
    const s = createGame(scenarioById('304').setup, seed);
    s.units = s.units.filter((u) => !(u.command === 'perpenna' && u.type === 'LC'));
    return s;
  };

  it('304: with no light unit left in Perpenna\'s command, the AI can order a lone Perpenna unit with Order Light Troops (§18.5)', () => {
    const s = valentia(304);
    const perpenna = new Set(s.units.filter((u) => u.command === 'perpenna').map((u) => u.id));
    for (const kind of ['orderLight', 'orderMounted', 'mountedCharge', 'moveFireMove'] as const) {
      const cands = orderCandidates(s, 'top', kind, NEUTRAL_W, 6);
      for (const c of cands) expect(validateOrders(s, 'top', kind, c.pieces), `${kind} ${c.pieces.join(',')}`).toBeNull();
      expect(cands.some((c) => c.pieces.length === 1 && perpenna.has(c.pieces[0])), kind).toBe(true);
      // and, for Order Light Troops, Herennius' light units as one order
      if (kind === 'orderLight') expect(cands.some((c) => c.pieces.length > 1 && c.pieces.every((id) => !perpenna.has(id)))).toBe(true);
    }
    // a whole Sertorian turn with the card: every answer legal
    s.active = 'top';
    s.turn = newTurn('top', 2);
    setHand(s, 'top', ['orderLight', 'order2L', 'order2C', 'order2R']);
    for (const seed of [1, 2]) aiTurn(structuredClone(s), seed);
  });

  it('304: random legal answers are never rejected, with the commands falling back per card', () => {
    for (const seed of [5, 6]) {
      const d = new GameDriver(valentia(seed));
      let rnd = seed * 48271;
      const next = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
      for (let step = 0; step < 400 && !d.over; step++) {
        const dec = d.pending!;
        const a = randomAnswer(d.state, dec, next);
        expect(d.answer(a), `seed ${seed} step ${step}: ${d.lastError} for ${JSON.stringify(dec)} -> ${JSON.stringify(a)}`).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// commanders and voice
// ---------------------------------------------------------------------------------------------------------------------

describe('Expansion #3 commanders and voice', () => {
  it('commanders map to their temperaments; namesakes of earlier battles keep theirs', () => {
    const want: [string, string, string][] = [
      ['Sulla', 'Roman', 'strategist'], ['Pompey', 'Roman', 'strategist'], ['Pompey', 'Pompeian', 'strategist'],
      ['Quintus Sertorius', 'Sertorian', 'fox'], ['Saburra', 'Numidian', 'fox'], ['Pontius', 'Samnite', 'bull'],
      ['Titus Labienus', 'Numidian', 'bull'], ['Curio', 'Caesarian', 'bull'], ['Pharnaces', 'Pontic', 'bull'],
      ['Ariovistus', 'Germanic', 'bull'], ['Afranius', 'Pompeian', 'shield'], ['Varus', 'Pompeian', 'shield'],
      ['Lucius Fufidius', 'Roman', 'veteran'], ['Libo', 'Pompeian', 'veteran'], ['Antony', 'Caesarian', 'lion'],
      ['Scipio', 'Pompeian', 'veteran'], ['Gnaeus Pompey', 'Pompeian', 'lion'], ['Julius Caesar', 'Caesarian', 'strategist'],
      ['Vercingetorix', 'Gallic', 'fox'],
      // earlier battles: Scipio Africanus and Quinctilius Varus are not the Pompeians of 318 and 311
      ['Scipio', 'Roman', 'strategist'], ['Varus', 'Roman', 'lion'], ['Gnaeus & Publius Scipio', 'Roman', 'lion'],
    ];
    for (const [name, army, id] of want) expect(personalityFor(name, army).id, `${name} (${army})`).toBe(id);
  });

  it('name the troops of the civil-war armies', () => {
    const s = build({ units: [top('MI', [2, 6]), bottom('MI', [6, 6])] });
    const named = (side: Side, look: GameState['players']['top']['look'], type: PosUnit['type']) => {
      s.players[side].look = look;
      return troopName(s, side, type);
    };
    expect(named('bottom', 'caesarian', 'HI')).toBe("Caesar's veterans");
    expect(named('bottom', 'sullan', 'MI')).toBe("Sulla's legionaries");
    expect(named('top', 'sertorian', 'WA')).toBe('Celtiberian warband');
    expect(named('top', 'numidian', 'HI')).toBe("Juba's royal legion");
    expect(named('top', 'pompeian', 'EL')).toBe("Juba's elephants");
    expect(named('top', 'samnite', 'MI')).toBe('Samnite legionaries');
  });

  it('308: Vercingetorix brings up his own reinforcements: he does not call on himself', () => {
    const sc = scenarioById('308');
    const s = createGame(sc.setup, 3);
    const P = personalityFor(sc.setup.top.commander, sc.setup.top.army);
    for (let seed = 1; seed < 40; seed++) {
      for (const m of ['ambush', 'reinforce'] as const) {
        const line = speak(s, 'top', P, m, { recent: [], sayTurn: -1, saysThisTurn: 0 }, new Rng(seed), { chance: 2 });
        if (line) expect(line).not.toMatch(/Now, Vercingetorix/);
      }
    }
  });
});
