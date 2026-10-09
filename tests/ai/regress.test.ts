// Regression checks from the AI review (cheap and deterministic). Slow win-rate matches against the scripted bots are an
// opt-in script: npx vite-node scripts/ai-match.ts -- --bot greedy (strength A/Bs need a same-seed baseline).
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CARD_LIST, GameDriver, createGame, distance, forceDice, hexId, newTurn, randomAnswer, type CardKind, type Decision, type GameState,
  type ScenarioSetup, type Side, type TerrainType, type UnitType,
} from '../../src/engine';
import { SCENARIOS } from '../../src/scenarios';
import { DIFFICULTY, PERSONALITIES, chooseAnswer, isLegal, newMemory, personalityById, personalityFor, type AiOptions } from '../../src/ai';
import { orderCandidates } from '../../src/ai/ordering';
import { chooseCavalryExtra } from '../../src/ai/policies';
import { NEUTRAL_W, weightsFor } from '../../src/ai/values';
import { Bot, type Strategy } from './bots';

const H = (r: number, c: number) => hexId(r, c);

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

interface Pos {
  units: { side: Side; type: UnitType; at: [number, number]; blocks?: number }[];
  leaders?: { side: Side; name: string; at: [number, number] }[];
  terrain?: { at: [number, number]; t: TerrainType }[];
  rules?: ScenarioSetup['rules'];
  sacredLeader?: { side: Side; name: string };
  first?: Side;
}

function position(p: Pos): GameState {
  const setup: ScenarioSetup = {
    id: 'test', name: 'Test',
    top: { army: 'Carthaginian', faction: 'carthage', commander: 'Hasdrubal', cards: 5 },
    bottom: { army: 'Roman', faction: 'rome', commander: 'Scipio', cards: 5 },
    first: p.first ?? 'bottom', banners: 8,
    terrain: (p.terrain ?? []).map((t) => ({ r: t.at[0], c: t.at[1], t: t.t })),
    units: p.units.map((u) => ({ side: u.side, type: u.type, r: u.at[0], c: u.at[1] })),
    leaders: (p.leaders ?? []).map((l) => ({ side: l.side, name: l.name, r: l.at[0], c: l.at[1] })),
    reserves: [], reserveLeaders: [], rules: p.rules ?? [], sacredLeader: p.sacredLeader,
  };
  const s = createGame(setup, 77);
  p.units.forEach((u, i) => {
    if (u.blocks !== undefined) s.units[i].blocks = u.blocks;
  });
  return s;
}

/** Give a side exactly these card kinds (taken from the deck / other hand). */
function setHand(s: GameState, side: Side, kinds: string[]) {
  const used = new Set<number>();
  const hand: number[] = [];
  for (const k of kinds) {
    const id = CARD_LIST.findIndex((x, i) => x === k && !used.has(i));
    used.add(id);
    hand.push(id);
  }
  const other: Side = side === 'top' ? 'bottom' : 'top';
  s.players[other].hand = s.players[other].hand.filter((c) => !used.has(c));
  s.deck = [...s.deck.filter((c) => !used.has(c)), ...s.players[side].hand.filter((c) => !used.has(c))];
  s.players[side].hand = hand;
  while (s.players[other].hand.length < 5) s.players[other].hand.push(s.deck.shift()!);
}

const detOpts = (side: Side, seed: number, extra: Partial<AiOptions> = {}): AiOptions => ({
  side, difficulty: 'tribune', personality: PERSONALITIES[5], seed, deterministic: true, budgetScale: 0.3, ...extra,
});

afterEach(() => {
  forceDice([]);
  vi.useRealTimers();
});

describe('tempo against a passive opponent', () => {
  it('Akragas: Carthage (Himilco, the Shield) attacks a turtling opponent within 30 turns', () => {
    const sc = SCENARIOS.find((x) => x.id === '001')!;
    const aiSide: Side = 'top';
    const d = new GameDriver(createGame(sc.setup, 1000));
    const opts: AiOptions = { ...detOpts(aiSide, 3001), personality: personalityFor(sc.setup.top.commander, sc.setup.top.army) };
    expect(opts.personality.id).toBe('shield');
    const mem = newMemory();
    const rnd = mulberry(1000);
    const bot = new Bot('turtle', rnd);
    let firstAttack = -1;
    while (!d.over && d.state.turn.number <= 30 && firstAttack < 0) {
      const dec = d.pending!;
      const a = dec.side === aiSide ? chooseAnswer(d.state, dec, opts, mem).answer : bot.answer(d.state, dec);
      if (!d.answer(a)) d.answer(randomAnswer(d.state, d.pending!, rnd));
      for (const { e } of d.drainEvents()) {
        if (e.t === 'combat' && (e.purpose === 'close' || e.purpose === 'ranged') && d.state.units.find((u) => u.id === e.attacker)?.side === aiSide) {
          firstAttack = d.state.turn.number;
        }
      }
    }
    expect(firstAttack).toBeGreaterThan(0);
    expect(firstAttack).toBeLessThanOrEqual(30);
  });
});

describe('Castulo: Publius Scipio (losing him loses the battle)', () => {
  it('does not end the turn with Scipio next to the enemy (constructed position, several AI seeds)', () => {
    // Scipio rides a 2-block unit; weakened enemies two hexes away tempt a Double Time charge with him into contact
    // (the original AI ended 5 of these 6 turns with him adjacent to the enemy).
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const s = position({
        rules: ['castulo'],
        sacredLeader: { side: 'bottom', name: 'Scipio' },
        units: [
          { side: 'bottom', type: 'MI', at: [5, 4], blocks: 2 },
          { side: 'bottom', type: 'HI', at: [5, 5] },
          { side: 'bottom', type: 'MI', at: [6, 4] },
          { side: 'top', type: 'WA', at: [3, 4], blocks: 1 },
          { side: 'top', type: 'AX', at: [3, 5], blocks: 1 },
          { side: 'top', type: 'LC', at: [2, 6] },
        ],
        leaders: [{ side: 'bottom', name: 'Scipio', at: [5, 4] }, { side: 'top', name: 'Mago', at: [0, 4] }],
      });
      setHand(s, 'bottom', ['doubleTime', 'order3C', 'lineCommand', 'inspiredC', 'orderMedium']);
      const d = new GameDriver(s);
      const mem = newMemory();
      const sid = d.state.special.sacredLeaderId!;
      while (d.pending && d.state.active === 'bottom' && d.state.turn.number === 1) {
        const dec = d.pending;
        d.answer(chooseAnswer(d.state, dec, detOpts(dec.side, seed), mem).answer);
      }
      const L = d.state.leaders.find((l) => l.id === sid);
      expect(L, `seed ${seed}: Scipio alive`).toBeTruthy();
      const nearest = Math.min(...d.state.units.filter((u) => u.side === 'top' && u.hex >= 0).map((u) => distance(u.hex, L!.hex)));
      expect(nearest, `seed ${seed}: Scipio ends the turn adjacent to the enemy`).toBeGreaterThan(1);
    }
  });

  it('keeps Scipio out of contact against a greedy attacker over fixed seeds', () => {
    // The contact rate is about 10% and varies a lot from game to game (7-17% over blocks of 10 games), so it is
    // measured over 30 games: a real doubling still fails, an unrelated change in the AI's choices does not.
    const sc = SCENARIOS.find((x) => x.id === '010')!;
    let turns = 0;
    let adjacent = 0;
    let deaths = 0;
    for (let g = 0; g < 30; g++) {
      const seed = 41000 + 97 * g;
      const d = new GameDriver(createGame(sc.setup, seed));
      const sid = d.state.special.sacredLeaderId!;
      const opts: AiOptions = { ...detOpts('bottom', seed * 3 + 1), personality: personalityFor(sc.setup.bottom.commander, sc.setup.bottom.army) };
      const mem = newMemory();
      const rnd = mulberry(seed);
      const bot = new Bot('greedy' as Strategy, rnd);
      let wasAi = false;
      while (!d.over && d.state.turn.number <= 36) {
        const dec = d.pending!;
        if (dec.kind === 'playCard') {
          if (wasAi) {
            const L = d.state.leaders.find((l) => l.id === sid);
            if (L) {
              turns++;
              if (d.state.units.some((u) => u.side === 'top' && u.hex >= 0 && distance(u.hex, L.hex) <= 1)) adjacent++;
            }
          }
          wasAi = dec.side === 'bottom';
        }
        const a = dec.side === 'bottom' ? chooseAnswer(d.state, dec, opts, mem).answer : bot.answer(d.state, dec);
        if (!d.answer(a)) d.answer(randomAnswer(d.state, d.pending!, rnd));
        for (const { e } of d.drainEvents()) if (e.t === 'leaderKilled' && e.id === sid) deaths++;
      }
    }
    expect(turns).toBeGreaterThan(150);
    expect(adjacent / turns).toBeLessThanOrEqual(0.15);
    expect(deaths).toBeLessThanOrEqual(1);
  }, 240000);
});

describe('battle phase', () => {
  it('takes a clearly good attack (80% to destroy a last-block unit) across seeds', () => {
    for (const seed of [11, 12, 13, 14, 15]) {
      const s = position({
        units: [
          { side: 'bottom', type: 'MI', at: [4, 4] },
          { side: 'bottom', type: 'MI', at: [4, 3] },
          { side: 'top', type: 'AX', at: [3, 4], blocks: 1 },
          { side: 'top', type: 'HI', at: [1, 8] },
        ],
      });
      setHand(s, 'bottom', ['order2C', 'order2L', 'order2R', 'coordinated', 'orderHeavy']);
      const d = new GameDriver(s);
      d.answer({ kind: 'playCard', card: s.players.bottom.hand[0] });
      d.answer({ kind: 'orders', pieces: ['u1'] });
      d.answer({ kind: 'endMove' });
      expect(d.pending?.kind).toBe('battle');
      const r = chooseAnswer(d.state, d.pending!, detOpts('bottom', seed), newMemory());
      expect(r.answer, `seed ${seed}`).toEqual({ kind: 'attack', unit: 'u1', target: H(3, 4) });
    }
  });
});

describe('order selection', () => {
  // Seen in play (Cannae): one step towards the enemy costs each unit more risk on its own than it gains, so
  // Hannibal ordered a single unit with Out Flanked and his wings never moved all game. Each kind of card should
  // be offered in full among the order sets a tribune tries; the rollouts decide whether the units move.
  const outOfReach = (hi: [number, number][], leaders: Pos['leaders'] = []) => position({
    units: [
      ...hi.map((at) => ({ side: 'top' as Side, type: 'HI' as UnitType, at })),
      { side: 'bottom', type: 'MI', at: [5, 3] },
      { side: 'bottom', type: 'MI', at: [5, 5] },
      { side: 'bottom', type: 'MI', at: [5, 7] },
      { side: 'bottom', type: 'MC', at: [6, 10] },
      { side: 'bottom', type: 'MC', at: [6, 1] },
    ],
    leaders,
  });
  const offered = (s: GameState, kind: CardKind) =>
    orderCandidates(s, 'top', kind, weightsFor(personalityById('fox')), DIFFICULTY.tribune.orderCands).map((c) => [...c.pieces].sort());
  const wings: [number, number][] = [[1, 2], [1, 3], [1, 8], [1, 9]];

  it('section card: Out Flanked orders both wings', () => {
    expect(offered(outOfReach(wings), 'outFlanked')).toContainEqual(['u1', 'u2', 'u3', 'u4']);
  });

  it('troop card: Order Heavy Troops orders every heavy unit (within Command)', () => {
    expect(offered(outOfReach(wings), 'orderHeavy')).toContainEqual(['u1', 'u2', 'u3', 'u4']);
  });

  it('leadership card: Inspired Left links the unit beside the leader', () => {
    const s = outOfReach(wings, [{ side: 'top', name: 'Hannibal', at: [1, 8] }]);
    expect(offered(s, 'inspiredL')).toContainEqual([s.leaders[0].id, 'u3', 'u4']);
  });

  it('Double Time orders the whole linked line', () => {
    expect(offered(outOfReach([[1, 7], [1, 8], [1, 9], [1, 10]]), 'doubleTime')).toContainEqual(['u1', 'u2', 'u3', 'u4']);
  });
});

describe('Baecula camps', () => {
  it('cavalry that rode into an uncaptured camp stays there instead of taking the extra hex out', () => {
    for (const P of PERSONALITIES) {
      const s = position({
        rules: ['baeculaCamps'],
        terrain: [{ at: [4, 4], t: 'camp' }],
        units: [
          { side: 'bottom', type: 'HC', at: [4, 4] },
          { side: 'top', type: 'LB', at: [2, 4], blocks: 1 },
          { side: 'top', type: 'MI', at: [7, 9] },
        ],
      });
      s.active = 'bottom';
      const d = { kind: 'cavalryExtra', side: 'bottom', unit: 'u1', options: [H(3, 4), H(3, 3), H(4, 5)] } as Extract<Decision, { kind: 'cavalryExtra' }>;
      expect(chooseCavalryExtra(s, d, { ...NEUTRAL_W, adv: 0.004 + 0.02 * P.aggression }), P.id).toBeNull();
    }
  });
});

describe('memory and card keeping', () => {
  it('with a fresh memory at the orders decision (resumed game) it re-plans for the card already played', () => {
    const sc = SCENARIOS.find((x) => x.id === '007')!;
    const d = new GameDriver(createGame(sc.setup, 5));
    const side = d.pending!.side;
    const mem = newMemory();
    d.answer(chooseAnswer(d.state, d.pending!, detOpts(side, 9), mem).answer);
    expect(d.pending?.kind).toBe('orders');
    const fresh = newMemory();
    const r = chooseAnswer(d.state, d.pending!, detOpts(side, 9), fresh);
    expect(isLegal(d.state, d.pending!, r.answer)).toBe(true);
    expect(fresh.plan?.turn).toBe(d.state.turn.number);
    expect(fresh.plan?.card).toBe(d.state.turn.card);
    expect(fresh.plan?.label).toContain('replanned');
  });

  it('tracks how long cards have been held and forgets it when the game goes back (undo/resume)', () => {
    const sc = SCENARIOS.find((x) => x.id === '001')!;
    const s = createGame(sc.setup, 3);
    const side = s.active;
    const mem = newMemory();
    s.special.turnsDone[side] = 10;
    chooseAnswer(s, { kind: 'playCard', side }, detOpts(side, 1, { difficulty: 'recruit' }), mem);
    const held = s.players[side].hand.filter((c) => mem.cardSeen?.[c] === 10);
    expect(held.length).toBe(s.players[side].hand.length);
    s.special.turnsDone[side] = 4; // went back in time
    s.turn = newTurn(side, 2);
    chooseAnswer(s, { kind: 'playCard', side }, detOpts(side, 1, { difficulty: 'recruit' }), mem);
    expect(Object.values(mem.cardSeen ?? {}).every((v) => v === 4)).toBe(true);
  });
});

describe('AiClient worker handling', () => {
  it('answers a timed-out request in-thread, replaces the stuck worker, and gives up on workers after two timeouts', async () => {
    const posted: { id: number; worker: number }[] = [];
    const terminated: number[] = [];
    let made = 0;
    class HungWorker {
      onmessage: ((ev: { data: unknown }) => void) | null = null;
      onerror: ((ev: unknown) => void) | null = null;
      onmessageerror: (() => void) | null = null;
      readonly n = ++made;
      postMessage(m: { id?: number; type: string }) {
        if (m.type === 'decide') posted.push({ id: m.id!, worker: this.n });
      }
      terminate() {
        terminated.push(this.n);
      }
    }
    const saved = (globalThis as { Worker?: unknown }).Worker;
    (globalThis as { Worker?: unknown }).Worker = HungWorker;
    vi.useFakeTimers();
    try {
      const { AiClient } = await import('../../src/ai/client');
      const sc = SCENARIOS.find((x) => x.id === '004')!;
      const d = new GameDriver(createGame(sc.setup, 8));
      const c = new AiClient({ side: d.pending!.side, difficulty: 'recruit', personality: personalityById('fox'), seed: 1, budgetScale: 0.1 });
      expect(c.usingWorker).toBe(true);
      for (let i = 0; i < 2; i++) {
        const p = c.decide(d.state, d.pending!);
        await vi.advanceTimersByTimeAsync(20001);
        const r = await p;
        expect(isLegal(d.state, d.pending!, r.answer)).toBe(true);
      }
      // each request went to a different worker exactly once; both stuck workers were terminated
      expect(posted.map((x) => x.worker)).toEqual([1, 2]);
      expect(terminated).toEqual([1, 2]);
      expect(c.usingWorker).toBe(false);
      const p3 = c.decide(d.state, d.pending!);
      await vi.advanceTimersByTimeAsync(1);
      expect(isLegal(d.state, d.pending!, (await p3).answer)).toBe(true);
      expect(posted.length).toBe(2);
      c.dispose();
    } finally {
      (globalThis as { Worker?: unknown }).Worker = saved;
    }
  });

  it('waits a little longer after a page freeze instead of abandoning the worker, and never computes after dispose', async () => {
    let worker: { onmessage: ((ev: { data: unknown }) => void) | null; last?: { id: number } } | null = null;
    class SlowWorker {
      onmessage: ((ev: { data: unknown }) => void) | null = null;
      onerror: ((ev: unknown) => void) | null = null;
      onmessageerror: (() => void) | null = null;
      last?: { id: number };
      constructor() {
        worker = this;
      }
      postMessage(m: { id?: number; type: string }) {
        if (m.type === 'decide') this.last = { id: m.id! };
      }
      terminate() {}
    }
    const saved = (globalThis as { Worker?: unknown }).Worker;
    (globalThis as { Worker?: unknown }).Worker = SlowWorker;
    vi.useFakeTimers();
    try {
      const { AiClient } = await import('../../src/ai/client');
      const sc = SCENARIOS.find((x) => x.id === '004')!;
      const d = new GameDriver(createGame(sc.setup, 8));
      const c = new AiClient({ side: d.pending!.side, difficulty: 'recruit', personality: personalityById('fox'), seed: 1, budgetScale: 0.1 });
      const p = c.decide(d.state, d.pending!);
      // the page freezes for 40 s; on resume the overdue timer fires late and grants a grace period
      vi.setSystemTime(Date.now() + 40000);
      await vi.advanceTimersByTimeAsync(20001);
      const marker = { kind: 'endMove' } as const;
      worker!.onmessage?.({ data: { id: worker!.last!.id, answer: marker } });
      expect((await p).answer).toEqual(marker);
      expect(c.usingWorker).toBe(true);
      // dispose while a request is pending: the promise rejects and nothing is computed in-thread
      const p2 = c.decide(d.state, d.pending!);
      c.dispose();
      await expect(p2).rejects.toThrow();
    } finally {
      (globalThis as { Worker?: unknown }).Worker = saved;
    }
  });
});
