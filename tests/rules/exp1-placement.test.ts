// Pre-battle leader placement (rules-reference §17.4 117 Asculum, rule `leaderPlacement`; §11 leaders): after the deal
// the Roman side places its leaders one at a time, then the Epirote side, before the first turn. A legal hex holds an
// own unit without a leader (the leader attaches) or is empty (no unit, no leader) and passable (not lake, sea, steep
// hill or non-fordable river); a leader on an empty hex stands alone.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ALL_HEXES, GameDriver, OFF_BOARD, createGame, hexId, isLoneLeader, leaderUnit, randomAnswer,
  type Answer, type Decision, type GameEvent, type GameState, type HexId, type ScenarioSetup, type Side,
} from '../../src/engine';
import { chooseAnswer, isLegal, newMemory, personalityFor, type AiOptions } from '../../src/ai';
import { scenarioById } from '../../src/scenarios';
import { H, build, ev, forceDice, must, setupOf, type Pos } from './helpers';

beforeEach(() => forceDice([]));

type Place = Extract<Decision, { kind: 'placeLeader' }>;

const ofKind = <K extends GameEvent['t']>(e: GameEvent[], t: K) => e.filter((x): x is Extract<GameEvent, { t: K }> => x.t === t);
const sorted = (hs: HexId[]) => [...hs].sort((a, b) => a - b);

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The Romans (bottom) move first. Units: u1 Roman HI (6,6), u2 Roman MI (6,4), u3 Roman LC (7,2) with Fabricius, u4 Roman
 * LI (5,8); u5 Epirote HI (2,6) with Milo, u6 Epirote EL (2,5), u7 Epirote MI (2,8), u8 Epirote LI (1,3). Rufinus stands
 * alone at (8,6). Decius and Sulpicius (Roman), then Pyrrhus and Leonnatus (Epirote) are still to be placed.
 */
const ASC: Pos = {
  rules: ['leaderPlacement'],
  topArmy: 'Epirote',
  bottomArmy: 'Roman',
  first: 'bottom',
  banners: 6,
  units: [
    { side: 'bottom', type: 'HI', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [6, 4] },
    { side: 'bottom', type: 'LC', at: [7, 2] }, { side: 'bottom', type: 'LI', at: [5, 8] },
    { side: 'top', type: 'HI', at: [2, 6] }, { side: 'top', type: 'EL', at: [2, 5] },
    { side: 'top', type: 'MI', at: [2, 8] }, { side: 'top', type: 'LI', at: [1, 3] },
  ],
  leaders: [
    { side: 'bottom', name: 'Fabricius', at: [7, 2] }, { side: 'top', name: 'Milo', at: [2, 6] },
    { side: 'bottom', name: 'Rufinus', at: [8, 6] },
  ],
  placeLeaders: [
    { side: 'bottom', name: 'Decius' }, { side: 'bottom', name: 'Sulpicius' },
    { side: 'top', name: 'Pyrrhus' }, { side: 'top', name: 'Leonnatus' },
  ],
  terrain: [
    { at: [4, 0], t: 'lake' }, { at: [4, 12], t: 'sea' }, { at: [0, 0], t: 'steep' },
    { at: [4, 3], t: 'river' }, { at: [4, 4], t: 'river', ford: true },
    { at: [5, 9], t: 'forest' }, { at: [5, 10], t: 'hill' }, { at: [3, 8], t: 'marsh' }, { at: [8, 12], t: 'camp' },
    { at: [6, 9], t: 'rampart', faces: 'top' }, { at: [3, 2], t: 'broken' },
  ],
};

const IMPASSABLE = new Set(['lake', 'sea', 'steep']);

/** Expected legal hexes for `side`, straight from the rule (own unit without a leader, or empty and passable). */
function expectedOptions(s: GameState, side: Side): HexId[] {
  const terr = new Map((ASC.terrain ?? []).map((t) => [H(t.at[0], t.at[1]), t]));
  return ALL_HEXES.filter((h) => {
    if (s.leaders.some((l) => l.hex === h)) return false;
    const unit = s.units.find((x) => x.hex === h);
    if (unit) return unit.side === side;
    const t = terr.get(h);
    if (!t) return true;
    if (IMPASSABLE.has(t.t)) return false;
    if (t.t === 'river') return !!t.ford;
    return true;
  });
}

const byName = (s: GameState, name: string) => s.leaders.find((l) => l.name === name)!;

function placing(d: GameDriver): Place {
  const p = d.pending;
  if (p?.kind !== 'placeLeader') throw new Error(`expected a placeLeader decision, got ${JSON.stringify(p)}`);
  return p;
}

/** Decius on the Roman HI, Sulpicius alone in front of it, Pyrrhus on the elephants, Leonnatus alone near the Romans. */
const PLAN: [string, [number, number]][] = [['Decius', [6, 6]], ['Sulpicius', [5, 6]], ['Pyrrhus', [2, 5]], ['Leonnatus', [4, 6]]];

function placeAll(d: GameDriver): GameEvent[] {
  const out: GameEvent[] = [];
  for (const [, at] of PLAN) {
    must(d, { kind: 'hex', hex: H(at[0], at[1]) });
    out.push(...ev(d));
  }
  return out;
}

describe('leader placement (117 Asculum)', () => {
  it('the leaders to be placed start off the board, listed in placement order, after the cards are dealt', () => {
    const s = build(ASC);
    for (const n of ['Decius', 'Sulpicius', 'Pyrrhus', 'Leonnatus']) expect(byName(s, n).hex).toBe(OFF_BOARD);
    expect(s.special.unplaced).toEqual(['Decius', 'Sulpicius', 'Pyrrhus', 'Leonnatus'].map((n) => byName(s, n).id));
    expect(s.players.bottom.hand).toHaveLength(5);
    expect(s.players.top.hand).toHaveLength(5);
    expect(byName(s, 'Fabricius').hex).toBe(H(7, 2));
  });

  it('decisions come Roman, Roman, Epirote, Epirote, then the first card; no turn starts before', () => {
    const d = new GameDriver(build(ASC));
    const seen: [Side, string][] = [];
    const events: GameEvent[] = [...ev(d)];
    for (const [, at] of PLAN) {
      const p = placing(d);
      seen.push([p.side, d.state.leaders.find((l) => l.id === p.leader)!.name]);
      must(d, { kind: 'hex', hex: H(at[0], at[1]) });
      events.push(...ev(d));
    }
    expect(seen).toEqual([['bottom', 'Decius'], ['bottom', 'Sulpicius'], ['top', 'Pyrrhus'], ['top', 'Leonnatus']]);
    expect(d.pending).toEqual({ kind: 'playCard', side: 'bottom' });
    expect(d.state.special.unplaced).toEqual([]);
    const kinds = events.map((e) => e.t);
    expect(kinds.lastIndexOf('leaderPlaced')).toBeLessThan(kinds.indexOf('turnStart'));
    expect(ofKind(events, 'turnStart')).toEqual([{ t: 'turnStart', side: 'bottom', turn: 1 }]);
    expect(d.state.turn.number).toBe(1);
    expect(d.state.players.bottom.hand).toHaveLength(5); // placement costs no card
  });

  it('the options are the own units without a leader plus every empty passable hex', () => {
    const d = new GameDriver(build(ASC));
    for (const [name, at] of PLAN) {
      const p = placing(d);
      expect(byName(d.state, name).id).toBe(p.leader);
      expect(sorted(p.options), name).toEqual(expectedOptions(d.state, p.side));
      must(d, { kind: 'hex', hex: H(at[0], at[1]) });
    }
  });

  it('what the first Roman choice includes and excludes', () => {
    const d = new GameDriver(build(ASC));
    const o = new Set(placing(d).options);
    // own units without a leader
    for (const at of [[6, 6], [6, 4], [5, 8]] as const) expect(o.has(H(at[0], at[1])), `${at}`).toBe(true);
    // passable terrain, and empty hexes anywhere, even next to the enemy (3,6) or on the enemy baseline (0,6)
    for (const at of [[4, 4], [5, 9], [5, 10], [3, 8], [8, 12], [6, 9], [3, 2], [3, 6], [0, 6], [8, 0]] as const) {
      expect(o.has(H(at[0], at[1])), `${at}`).toBe(true);
    }
    // enemy units (with or without a leader), an own unit with a leader, a lone own leader, impassable hexes
    for (const at of [[2, 6], [2, 5], [2, 8], [1, 3], [7, 2], [8, 6], [4, 0], [4, 12], [0, 0], [4, 3]] as const) {
      expect(o.has(H(at[0], at[1])), `${at}`).toBe(false);
    }
    expect(o.size).toBe(expectedOptions(d.state, 'bottom').length);
  });

  it('an illegal hex is rejected and the same decision is asked again', () => {
    const d = new GameDriver(build(ASC));
    const first = placing(d);
    const bad: Answer[] = [
      { kind: 'hex', hex: H(2, 5) }, // enemy unit
      { kind: 'hex', hex: H(2, 6) }, // enemy unit with its leader
      { kind: 'hex', hex: H(8, 6) }, // another leader (a lone Roman leader)
      { kind: 'hex', hex: H(7, 2) }, // own unit that already has a leader
      { kind: 'hex', hex: H(4, 0) }, // lake
      { kind: 'hex', hex: H(4, 12) }, // sea
      { kind: 'hex', hex: H(0, 0) }, // steep hill
      { kind: 'hex', hex: H(4, 3) }, // river without a ford
      { kind: 'hex', hex: hexId(1, 12) }, // not on the board (odd rows have 12 hexes)
      { kind: 'hex', hex: OFF_BOARD },
      { kind: 'hex', hex: null }, // placement cannot be declined
      { kind: 'choose', index: 0 },
    ];
    for (const a of bad) {
      expect(d.answer(a), JSON.stringify(a)).toBe(false);
      expect(d.lastError).toBeTruthy();
      expect(d.pending).toEqual(first);
    }
    expect(d.answers).toEqual([]);
    expect(byName(d.state, 'Decius').hex).toBe(OFF_BOARD);
    // a leader placed a moment ago occupies his hex too
    must(d, { kind: 'hex', hex: H(5, 6) });
    expect(d.answer({ kind: 'hex', hex: H(5, 6) })).toBe(false);
    expect(byName(d.state, 'Sulpicius').hex).toBe(OFF_BOARD);
    expect(placing(d).options).not.toContain(H(5, 6));
  });

  it('a leader placed on his own unit is attached to it', () => {
    const d = new GameDriver(build(ASC));
    const id = placing(d).leader;
    must(d, { kind: 'hex', hex: H(6, 6) });
    const e = ev(d);
    expect(ofKind(e, 'leaderPlaced')).toEqual([{ t: 'leaderPlaced', id, hex: H(6, 6) }]);
    expect(ofKind(e, 'attach')).toEqual([{ t: 'attach', leader: id, unit: 'u1' }]);
    const l = byName(d.state, 'Decius');
    expect(l.hex).toBe(H(6, 6));
    expect(leaderUnit(d.state, l)?.id).toBe('u1');
    expect(isLoneLeader(d.state, l)).toBe(false);
  });

  it('a leader placed on an empty hex stands alone', () => {
    const d = new GameDriver(build(ASC));
    must(d, { kind: 'hex', hex: H(6, 6) });
    ev(d);
    const id = placing(d).leader;
    must(d, { kind: 'hex', hex: H(3, 6) }); // next to the Epirote HI
    const e = ev(d);
    expect(ofKind(e, 'leaderPlaced')).toEqual([{ t: 'leaderPlaced', id, hex: H(3, 6) }]);
    expect(ofKind(e, 'attach')).toEqual([]);
    const l = byName(d.state, 'Sulpicius');
    expect(l.hex).toBe(H(3, 6));
    expect(isLoneLeader(d.state, l)).toBe(true);
  });

  it('every leader is on the board once placement is over, attached or alone as placed', () => {
    const d = new GameDriver(build(ASC));
    placeAll(d);
    const s = d.state;
    expect(s.leaders.every((l) => l.hex >= 0)).toBe(true);
    expect(leaderUnit(s, byName(s, 'Decius'))?.id).toBe('u1');
    expect(leaderUnit(s, byName(s, 'Pyrrhus'))?.id).toBe('u6');
    expect(isLoneLeader(s, byName(s, 'Sulpicius'))).toBe(true);
    expect(isLoneLeader(s, byName(s, 'Leonnatus'))).toBe(true);
  });

  it('leadersAtStart counts the leaders still to be placed (Hellespont-style counters)', () => {
    expect(build(ASC).special.leadersAtStart).toEqual({ top: 3, bottom: 4 });
  });

  it('placed leaders keep their traits', () => {
    const s = build({ ...ASC, placeLeaders: [{ side: 'top', name: 'Pyrrhus', traits: ['ccBonus'] }] });
    expect(byName(s, 'Pyrrhus').traits).toEqual(['ccBonus']);
  });

  it('GameDriver.replay reproduces the placements and the first playCard decision follows', () => {
    const initial = build(ASC);
    const d = new GameDriver(initial);
    placeAll(d);
    expect(d.canUndo()).toBe(false); // the last placement was the Epirote side's: the Romans cannot take it back
    const r = GameDriver.replay(initial, d.answers);
    expect(r.state.leaders).toEqual(d.state.leaders);
    expect(r.state.special.unplaced).toEqual([]);
    expect(r.pending).toEqual({ kind: 'playCard', side: 'bottom' });
    expect(r.state.rngCalls).toBe(d.state.rngCalls);
    // a part-way replay stops at the next placement with the same options
    const half = GameDriver.replay(initial, d.answers.slice(0, 2));
    const p = placing(half);
    expect(p.side).toBe('top');
    expect(p.leader).toBe(byName(half.state, 'Pyrrhus').id);
    expect(sorted(p.options)).toEqual(expectedOptions(half.state, 'top'));
  });

  it("a placement can be taken back by the side that made it while it is still that side's decision", () => {
    const initial = build(ASC);
    const d = new GameDriver(initial);
    expect(d.canUndo()).toBe(false); // nothing placed yet
    must(d, { kind: 'hex', hex: H(6, 6) }); // Decius joins the Roman HI
    expect(placing(d).side).toBe('bottom'); // Sulpicius next: still the Romans' decision
    expect(d.canUndo()).toBe(true);
    const u = d.undo();
    const p = placing(u);
    expect(p.leader).toBe(byName(u.state, 'Decius').id);
    expect(byName(u.state, 'Decius').hex).toBe(OFF_BOARD);
    expect(leaderUnit(u.state, byName(u.state, 'Decius'))).toBeUndefined();
    expect(u.answers).toEqual([]);
    expect(sorted(p.options)).toEqual(expectedOptions(u.state, 'bottom'));
    // placed elsewhere instead
    must(u, { kind: 'hex', hex: H(6, 4) });
    expect(leaderUnit(u.state, byName(u.state, 'Decius'))?.id).toBe('u2');
    // the second Roman placement hands the decision to the Epirotes: no undo for either side
    must(u, { kind: 'hex', hex: H(5, 6) });
    expect(placing(u).side).toBe('top');
    expect(u.canUndo()).toBe(false);
    // the Epirotes may take back their first placement, not the Romans' ones
    must(u, { kind: 'hex', hex: H(2, 5) });
    expect(u.canUndo()).toBe(true);
    expect(placing(u.undo()).leader).toBe(byName(u.state, 'Pyrrhus').id);
  });

  it('a placement cannot be undone once dice have been rolled since', () => {
    const d = new GameDriver(build(ASC));
    must(d, { kind: 'hex', hex: H(6, 6) });
    expect(d.canUndo()).toBe(true);
    d.state.rngCalls++; // constructed: a die rolled after the placement
    expect(d.canUndo()).toBe(false);
  });

  it('randomAnswer always gives a legal placement', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const d = new GameDriver(build(ASC, seed));
      const rnd = mulberry(seed);
      let n = 0;
      while (d.pending?.kind === 'placeLeader') {
        const p = d.pending;
        const a = randomAnswer(d.state, p, rnd);
        expect(a.kind === 'hex' && a.hex !== null && p.options.includes(a.hex)).toBe(true);
        expect(isLegal(d.state, p, a)).toBe(true);
        must(d, a);
        n++;
      }
      expect(n).toBe(4);
      expect(d.pending?.kind).toBe('playCard');
    }
  });

  it('isLegal rejects what the engine rejects', () => {
    const d = new GameDriver(build(ASC));
    const p = placing(d);
    expect(isLegal(d.state, p, { kind: 'hex', hex: null })).toBe(false);
    expect(isLegal(d.state, p, { kind: 'hex', hex: H(2, 5) })).toBe(false);
    expect(isLegal(d.state, p, { kind: 'choose', index: 0 })).toBe(false);
    expect(isLegal(d.state, p, { kind: 'hex', hex: H(5, 6) })).toBe(true);
  });

  it('the AI places each leader with one of its own units, legally and deterministically', () => {
    const opts = (side: Side): AiOptions => ({
      side, difficulty: 'tribune', personality: personalityFor(side === 'top' ? 'T' : 'B', side === 'top' ? 'Epirote' : 'Roman'),
      seed: 7, budgetScale: 0.2, deterministic: true,
    });
    const run = () => {
      const d = new GameDriver(build(ASC));
      const mems = { top: newMemory(), bottom: newMemory() };
      const placed: Record<string, HexId> = {};
      const order: Side[] = [];
      const joined: Record<string, string> = {};
      while (d.pending?.kind === 'placeLeader') {
        const p = d.pending;
        const { answer } = chooseAnswer(d.state, p, opts(p.side), mems[p.side]);
        expect(isLegal(d.state, p, answer)).toBe(true);
        const hex = (answer as { hex: HexId }).hex;
        const unit = d.state.units.find((x) => x.hex === hex);
        expect(unit?.side, 'never an empty hex').toBe(p.side);
        const name = d.state.leaders.find((l) => l.id === p.leader)!.name;
        placed[name] = hex;
        order.push(p.side);
        joined[name] = unit!.type;
        must(d, answer);
      }
      expect(d.pending?.kind).toBe('playCard');
      // Romans first; every leader with one of his own units (never alone)
      expect(order).toEqual(['bottom', 'bottom', 'top', 'top']);
      for (const name of Object.keys(placed)) {
        const l = byName(d.state, name);
        expect(isLoneLeader(d.state, l), name).toBe(false);
        expect(leaderUnit(d.state, l)?.side, name).toBe(l.side);
      }
      return { placed, joined };
    };
    const { placed: a, joined } = run();
    // medium/heavy units first, by unit strength and the cards in hand: the Romans take their free MI and HI (with an
    // Inspired Left Leadership card in hand the MI on the left/centre line goes first); Pyrrhus the free MI (Milo has
    // the HI, and elephants gain nothing from a leader); Leonnatus then joins the light infantry rather than the elephants
    expect(joined).toEqual({ Decius: 'MI', Sulpicius: 'HI', Pyrrhus: 'MI', Leonnatus: 'LI' });
    expect(a).toEqual({ Decius: H(6, 4), Sulpicius: H(6, 6), Pyrrhus: H(2, 8), Leonnatus: H(1, 3) });
    expect(run().placed).toEqual(a);
  });

  it('without the rule there is no placement: the first decision is the first card', () => {
    const s = build({ ...ASC, rules: [], placeLeaders: undefined });
    expect(s.special.unplaced).toEqual([]);
    expect(new GameDriver(s).pending).toEqual({ kind: 'playCard', side: 'bottom' });
  });

  it('setup: the placement list and the leaderPlacement rule come together', () => {
    expect(() => createGame(setupOf({ ...ASC, rules: [] }), 1)).toThrow(/leaderPlacement/);
    expect(() => createGame(setupOf({ ...ASC, placeLeaders: [] }), 1)).toThrow(/leaderPlacement/);
    expect(() => createGame(setupOf({ ...ASC, placeLeaders: [{ side: 'left' as Side, name: 'X' }] }), 1)).toThrow(/side/);
  });

  it('random games on a real battle with every leader placed first play to the end, and replay exactly', () => {
    const base = scenarioById('007').setup;
    const roman: Side = base.top.army === 'Roman' ? 'top' : 'bottom';
    const setup: ScenarioSetup = {
      ...base,
      leaders: [],
      placeLeaders: [...base.leaders].sort((x, y) => Number(x.side !== roman) - Number(y.side !== roman))
        .map(({ side, name, traits }) => ({ side, name, traits })),
      rules: [...base.rules, 'leaderPlacement'],
    };
    for (const seed of [1, 2, 3]) {
      const initial = createGame(setup, seed);
      expect(initial.special.leadersAtStart.top + initial.special.leadersAtStart.bottom).toBe(base.leaders.length);
      const d = new GameDriver(initial);
      const rnd = mulberry(seed);
      const sides: Side[] = [];
      let steps = 0;
      while (!d.over && steps++ < 6000) {
        const p = d.pending!;
        if (p.kind === 'placeLeader') sides.push(p.side);
        else expect(d.state.leaders.every((l) => l.hex >= 0)).toBe(true);
        expect(d.answer(randomAnswer(d.state, p, rnd)), d.lastError ?? '').toBe(true);
      }
      expect(sides).toEqual(setup.placeLeaders!.map((l) => l.side));
      expect(sides[0]).toBe(roman);
      expect(d.state.winner).not.toBeNull();
      const r = GameDriver.replay(initial, d.answers);
      expect(r.state.rngCalls).toBe(d.state.rngCalls);
      expect(r.state.winner).toBe(d.state.winner);
    }
  });
});
