import { describe, expect, it } from 'vitest';
import {
  CARD_LIST, GameDriver, areAdjacent, createGame, forceDice, forcedDiceLeft, hexId, leaderEvadeOptions, randomAnswer, type Decision, type GameState, type ScenarioSetup,
  type Side, type TerrainType, type UnitType,
} from '../../src/engine';
import { SCENARIOS } from '../../src/scenarios';
import { PERSONALITIES, chooseAnswer, isLegal, newMemory, personalityFor, type AiOptions } from '../../src/ai';
import { AiClient } from '../../src/ai/client';
import { greedyMoveStep } from '../../src/ai/moves';
import { chooseLeaderEvade, defendChoice, greedyBattle } from '../../src/ai/policies';
import { NEUTRAL_W } from '../../src/ai/values';

const H = (r: number, c: number) => hexId(r, c);

interface Pos {
  units?: { side: Side; type: UnitType; at: [number, number]; blocks?: number }[];
  leaders?: { side: Side; at: [number, number] }[];
  terrain?: { at: [number, number]; t: TerrainType }[];
}

/** Build a position. Units get ids u1.. in order, leaders follow. */
function position(p: Pos): GameState {
  const setup: ScenarioSetup = {
    id: 'test', name: 'Test',
    top: { army: 'Carthaginian', blocks: 'car', look: 'carthaginian', commander: 'Hannibal', cards: 5 },
    bottom: { army: 'Roman', blocks: 'rom', look: 'roman', commander: 'Varro', cards: 5 },
    first: 'bottom', banners: 6,
    terrain: (p.terrain ?? []).map((t) => ({ r: t.at[0], c: t.at[1], t: t.t })),
    units: (p.units ?? []).map((u) => ({ side: u.side, type: u.type, r: u.at[0], c: u.at[1] })),
    leaders: (p.leaders ?? []).map((l, i) => ({ side: l.side, name: `L${i}`, r: l.at[0], c: l.at[1] })),
    reserves: [], reserveLeaders: [], rules: [],
  };
  const s = createGame(setup, 99);
  (p.units ?? []).forEach((u, i) => {
    if (u.blocks !== undefined) s.units[i].blocks = u.blocks;
  });
  return s;
}

function order(s: GameState, ids: string[]) {
  for (const id of ids) {
    const isLeader = id.startsWith('L');
    const hex = isLeader ? s.leaders.find((l) => l.id === id)!.hex : s.units.find((u) => u.id === id)!.hex;
    s.turn.ordered[id] = {
      id, isLeader, startHex: hex, moved: 0, moveDone: false, move2Done: false, battlesLeft: isLeader ? 0 : 1,
      canBattle: true, mustBattle: false, enteredHexThisTurn: false, attachedThisTurn: false,
    };
  }
  s.turn.phase = 'move';
}

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

describe('reactive policies', () => {
  it('light infantry evades an attacking heavy infantry', () => {
    const s = position({ units: [{ side: 'bottom', type: 'LI', at: [4, 4] }, { side: 'top', type: 'HI', at: [3, 4] }] });
    s.active = 'top';
    const d: Extract<Decision, { kind: 'defend' }> = { kind: 'defend', side: 'bottom', attacker: 'u2', target: 'u1', canEvade: true, canFirstStrike: false };
    expect(defendChoice(s, d, NEUTRAL_W)).toBe('evade');
  });

  it('heavy infantry plays First Strike against a battered attacker', () => {
    const s = position({ units: [{ side: 'bottom', type: 'HI', at: [4, 4] }, { side: 'top', type: 'MI', at: [3, 4], blocks: 1 }] });
    s.active = 'top';
    const d: Extract<Decision, { kind: 'defend' }> = { kind: 'defend', side: 'bottom', attacker: 'u2', target: 'u1', canEvade: false, canFirstStrike: true };
    expect(defendChoice(s, d, NEUTRAL_W)).toBe('firstStrike');
  });

  it('a lone leader evades onto a friendly unit rather than into the open', () => {
    const s = position({
      units: [
        { side: 'bottom', type: 'MI', at: [5, 4] },
        { side: 'top', type: 'HI', at: [3, 4] },
        { side: 'top', type: 'MI', at: [3, 3] },
      ],
      leaders: [{ side: 'bottom', at: [4, 4] }],
    });
    const l = s.leaders[0];
    const options = leaderEvadeOptions(s, l);
    expect(options.length).toBeGreaterThan(1);
    const idx = chooseLeaderEvade(s, { kind: 'leaderEvade', side: 'bottom', leader: l.id, options }, NEUTRAL_W);
    expect(options[idx].attachLeader).toBe('u1');
  });

  it('battle: finishes off the battered unit first', () => {
    const s = position({
      units: [
        { side: 'bottom', type: 'HI', at: [4, 4] },
        { side: 'top', type: 'MI', at: [3, 4] },
        { side: 'top', type: 'MI', at: [3, 3], blocks: 1 },
      ],
    });
    order(s, ['u1']);
    s.turn.phase = 'battle';
    const a = greedyBattle(s, NEUTRAL_W);
    expect(a).toEqual({ kind: 'attack', unit: 'u1', target: H(3, 3) });
  });

  it('a battered unit next to strong enemies withdraws instead of fighting', () => {
    const s = position({
      units: [
        { side: 'bottom', type: 'MI', at: [4, 4], blocks: 1 },
        { side: 'bottom', type: 'MI', at: [6, 6] },
        { side: 'top', type: 'HI', at: [3, 4] },
        { side: 'top', type: 'HI', at: [3, 3] },
      ],
    });
    order(s, ['u1']);
    const a = greedyMoveStep(s, 1, { me: 'bottom', W: NEUTRAL_W, noise: 0, decided: new Set() });
    expect(a.kind).toBe('move');
    if (a.kind === 'move') {
      expect(a.piece).toBe('u1');
      expect(areAdjacent(a.to, H(3, 4)) || areAdjacent(a.to, H(3, 3))).toBe(false);
      expect(Math.floor(a.to / 13)).toBe(5); // stepped back toward its own lines
    }
  });

  it('a leader rides away from a battered unit to a healthy one when he can', () => {
    const s = position({
      units: [
        { side: 'bottom', type: 'MI', at: [4, 4], blocks: 1 },
        { side: 'bottom', type: 'HI', at: [6, 5] },
        { side: 'top', type: 'HI', at: [3, 4] },
        { side: 'top', type: 'HI', at: [3, 3] },
      ],
      leaders: [{ side: 'bottom', at: [4, 4] }],
    });
    const leader = s.leaders[0].id;
    order(s, [leader]);
    const a = greedyMoveStep(s, 1, { me: 'bottom', W: NEUTRAL_W, noise: 0, decided: new Set() });
    expect(a).toEqual({ kind: 'move', piece: leader, to: H(6, 5) });
  });

  it('never consumes dice forced by the test hook', () => {
    const sc = SCENARIOS.find((x) => x.id === '005')!;
    const d = new GameDriver(createGame(sc.setup, 3));
    const opts: AiOptions = { side: d.pending!.side, difficulty: 'tribune', personality: PERSONALITIES[1], seed: 9, budgetScale: 0.1 };
    const mem = newMemory();
    forceDice(['heavy', 'flag', 'swords']);
    try {
      // play one full AI turn worth of decisions without letting the engine roll
      for (let i = 0; i < 3 && d.pending && d.pending.kind !== 'battle'; i++) {
        const before = forcedDiceLeft();
        const r = chooseAnswer(d.state, d.pending, opts, mem);
        expect(forcedDiceLeft()).toBe(before);
        expect(isLegal(d.state, d.pending, r.answer)).toBe(true);
        if (d.pending.kind === 'playCard' || d.pending.kind === 'orders') d.answer(r.answer);
        else break;
      }
    } finally {
      forceDice([]);
    }
  });

  it('does not use hidden information: same decision whatever the opponent holds and the dice will be', () => {
    const sc = SCENARIOS.find((x) => x.id === '001')!;
    const base = createGame(sc.setup, 5);
    const opts: AiOptions = { side: base.active, difficulty: 'tribune', personality: PERSONALITIES[0], seed: 1234, budgetScale: 0.1, deterministic: true };
    const variant = createGame(sc.setup, 5);
    // swap the opponent's hand with other unseen cards, reshuffle the deck and change the dice
    const opp: Side = base.active === 'top' ? 'bottom' : 'top';
    const pool = [...variant.deck, ...variant.players[opp].hand].reverse();
    variant.players[opp].hand = pool.slice(0, variant.players[opp].hand.length);
    variant.deck = pool.slice(variant.players[opp].hand.length);
    variant.rng = (variant.rng ^ 0xdeadbeef) >>> 0;
    const d: Decision = { kind: 'playCard', side: base.active };
    const a1 = chooseAnswer(base, d, opts, newMemory());
    const a2 = chooseAnswer(variant, d, opts, newMemory());
    expect(a2.answer).toEqual(a1.answer);
    expect(CARD_LIST[(a1.answer as { card: number }).card]).toBeTruthy();
  });
});

describe('AiClient', () => {
  it('falls back to in-thread decisions when Web Workers are unavailable', async () => {
    const sc = SCENARIOS.find((x) => x.id === '004')!;
    const d = new GameDriver(createGame(sc.setup, 8));
    const c = {
      top: new AiClient({ side: 'top', difficulty: 'recruit', personality: PERSONALITIES[0], seed: 1, budgetScale: 0.3 }),
      bottom: new AiClient({ side: 'bottom', difficulty: 'recruit', personality: PERSONALITIES[2], seed: 2, budgetScale: 0.3 }),
    };
    expect(c.top.usingWorker).toBe(false);
    let n = 0;
    while (!d.over && d.state.turn.number <= 4) {
      const dec = d.pending!;
      const r = await c[dec.side].decide(d.state, dec);
      expect(d.answer(r.answer)).toBe(true);
      n++;
    }
    expect(n).toBeGreaterThan(5);
    c.top.dispose();
    await expect(c.top.decide(d.state, d.pending!)).rejects.toThrow();
    c.bottom.dispose();
  });
});

describe('AI vs AI (recruit) completes every scenario with legal answers', () => {
  for (const sc of SCENARIOS) {
    it(`${sc.id} ${sc.name}`, () => {
      const d = new GameDriver(createGame(sc.setup, 4242 + Number(sc.id)));
      const opts: Record<Side, AiOptions> = {
        top: { side: 'top', difficulty: 'recruit', personality: personalityFor(sc.setup.top.commander, sc.setup.top.army), seed: 11, budgetScale: 0.3 },
        bottom: { side: 'bottom', difficulty: 'recruit', personality: personalityFor(sc.setup.bottom.commander, sc.setup.bottom.army), seed: 22, budgetScale: 0.3 },
      };
      const mems = { top: newMemory(), bottom: newMemory() };
      let steps = 0;
      while (!d.over && steps++ < 20000) {
        const dec = d.pending!;
        const r = chooseAnswer(d.state, dec, opts[dec.side], mems[dec.side]);
        expect(isLegal(d.state, dec, r.answer), `${dec.kind}: ${JSON.stringify(r.answer)}`).toBe(true);
        const ok = d.answer(r.answer);
        if (!ok) throw new Error(`answer rejected: ${d.lastError} for ${JSON.stringify(dec)} -> ${JSON.stringify(r.answer)}`);
      }
      expect(d.state.winner).not.toBeNull();
    });
  }
});

describe('tribune beats a random player', () => {
  it('wins at least 90% of 20 games across scenarios and sides', () => {
    const ids = ['001', '002', '003', '004', '005', '006', '007', '008', '010', '013'];
    let wins = 0;
    let games = 0;
    for (const id of ids) {
      const sc = SCENARIOS.find((x) => x.id === id)!;
      for (const aiSide of ['bottom', 'top'] as Side[]) {
        const seed = 500 + Number(id) * 2 + (aiSide === 'top' ? 1 : 0);
        const d = new GameDriver(createGame(sc.setup, seed));
        const opts: AiOptions = { side: aiSide, difficulty: 'tribune', personality: personalityFor(sc.setup[aiSide].commander, sc.setup[aiSide].army), seed, budgetScale: 0.12 };
        const mem = newMemory();
        const rnd = mulberry(seed);
        let steps = 0;
        while (!d.over && steps++ < 20000) {
          const dec = d.pending!;
          const a = dec.side === aiSide ? chooseAnswer(d.state, dec, opts, mem).answer : randomAnswer(d.state, dec, rnd);
          if (!d.answer(a)) {
            expect(dec.side, `AI answer rejected: ${d.lastError}`).not.toBe(aiSide);
            d.answer(randomAnswer(d.state, d.pending!, rnd));
          }
        }
        games++;
        if (d.state.winner === aiSide) wins++;
      }
    }
    expect(games).toBe(20);
    expect(wins).toBeGreaterThanOrEqual(18);
  });
});
