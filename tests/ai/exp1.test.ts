// AI regression checks for Expansion #1 (rules-reference §15-§17): war machines, light bow cavalry, camels, ramparts,
// Fright at First Sight, Hellespont leaders, Asculum leader placement, commanders and their voice. Cheap and
// deterministic (tribune in deterministic mode, fixed seeds, constructed positions).
import { afterEach, describe, expect, it } from 'vitest';
import {
  CARD_LIST, GameDriver, OFF_BOARD, UNIT_STATS, UNIT_TYPES, cloneState, closeCombatDice, createGame, distance, forceDice, helmetsCount, hexId,
  other, sectionsOf, type ArmyLook, type Blocks, type Decision, type EliteId, type GameEvent, type GameState, type LeaderTrait,
  type ScenarioSetup, type Side, type SpecialRuleId, type TerrainSetup, type UnitType,
} from '../../src/engine';
import { SCENARIOS } from '../../src/scenarios';
import { PERSONALITIES, chooseAnswer, isLegal, newMemory, personalityFor, type AiOptions } from '../../src/ai';
import { Occ, helmetsOcc } from '../../src/ai/board';
import { evaluate, rawFeatures, singleUnitRisk, type EvalBreakdown } from '../../src/ai/evaluate';
import { backDamage, closeAttackEV, evadeEV } from '../../src/ai/estimate';
import { orderCandidates } from '../../src/ai/ordering';
import { defendChoice, greedyBattle } from '../../src/ai/policies';
import { NEUTRAL_W, isSacredLeader, leaderLossCost, leaderVal, leaderWorth, setViewer, unitWeight } from '../../src/ai/values';
import { safePlacement } from '../../src/ai/sim';
import { troopName } from '../../src/ai/voice';
import { failOnAiErrors } from './no-ai-errors';

const H = (r: number, c: number) => hexId(r, c);

interface Army { army: string; blocks: Blocks; look: ArmyLook; commander: string }
const ROMAN: Army = { army: 'Roman', blocks: 'rom', look: 'roman', commander: 'Dentatus' };
const EPIROTE: Army = { army: 'Epirote', blocks: 'grk', look: 'epirote', commander: 'Pyrrhus' };

interface Pos {
  units: { side: Side; type: UnitType; at: [number, number]; blocks?: number; elite?: EliteId }[];
  leaders?: { side: Side; name: string; at: [number, number]; traits?: LeaderTrait[] }[];
  terrain?: TerrainSetup[];
  rules?: SpecialRuleId[];
  top?: Army;
  bottom?: Army;
  first?: Side;
}

/** Units get ids u1.. in order. */
function position(p: Pos): GameState {
  const top = p.top ?? EPIROTE;
  const bottom = p.bottom ?? ROMAN;
  const setup: ScenarioSetup = {
    id: 'test', name: 'Test',
    top: { ...top, cards: 5 }, bottom: { ...bottom, cards: 5 },
    first: p.first ?? 'bottom', banners: 7,
    terrain: p.terrain ?? [],
    units: p.units.map((u) => ({ side: u.side, type: u.type, r: u.at[0], c: u.at[1], elite: u.elite })),
    leaders: (p.leaders ?? []).map((l) => ({ side: l.side, name: l.name, r: l.at[0], c: l.at[1], traits: l.traits })),
    reserves: [], reserveLeaders: [], rules: p.rules ?? [],
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
    if (id < 0) throw new Error(`setHand: no card of kind '${k}' left in the deck`);
    used.add(id);
    hand.push(id);
  }
  const other: Side = side === 'top' ? 'bottom' : 'top';
  s.players[other].hand = s.players[other].hand.filter((c) => !used.has(c));
  s.deck = [...s.deck.filter((c) => !used.has(c)), ...s.players[side].hand.filter((c) => !used.has(c))];
  s.players[side].hand = hand;
  while (s.players[other].hand.length < 5) s.players[other].hand.push(s.deck.shift()!);
}

/**
 * The bottom side's advance gap (hexes its sound units still have to close) as the evaluation sees it: the raw feature,
 * and the evaluation's advance penalty divided back by its weights (both must agree).
 */
function bottomGap(units: Pos['units'], extra: Partial<Pos> = {}): { raw: number; eval: number } {
  const s = position({ units, ...extra });
  const raw = rawFeatures(s, 'bottom', 'bottom', NEUTRAL_W).gapMe;
  const bd = {} as EvalBreakdown;
  evaluate(s, 'bottom', 'bottom', NEUTRAL_W, bd);
  const own = s.units.filter((u) => u.side === 'bottom');
  const mounted = own.length > 0 && own.every((u) => UNIT_STATS[u.type].mounted);
  return { raw, eval: -bd.advance / (NEUTRAL_W.adv * (mounted ? NEUTRAL_W.mountedAdv : 1)) };
}

const detOpts = (side: Side, seed: number, extra: Partial<AiOptions> = {}): AiOptions => ({
  side, difficulty: 'tribune', personality: PERSONALITIES[5], seed, deterministic: true, budgetScale: 0.3, ...extra,
});

/** Let the AI play the active side's whole turn (both sides answer their own decisions); returns the turn's events. */
function aiTurn(s: GameState, seed: number): { d: GameDriver; events: GameEvent[] } {
  const d = new GameDriver(s);
  const side = d.state.active;
  const turn = d.state.turn.number;
  const mems = { top: newMemory(), bottom: newMemory() };
  const events: GameEvent[] = [];
  let guard = 0;
  while (d.pending && d.state.active === side && d.state.turn.number === turn && guard++ < 200) {
    const dec = d.pending;
    const r = chooseAnswer(d.state, dec, detOpts(dec.side, seed), mems[dec.side]);
    expect(isLegal(d.state, dec, r.answer)).toBe(true);
    expect(d.answer(r.answer), d.lastError ?? '').toBe(true);
    for (const { e } of d.drainEvents()) events.push(e);
  }
  return { d, events };
}

type Defend = Extract<Decision, { kind: 'defend' }>;

afterEach(() => forceDice([]));
failOnAiErrors();

// ---------------------------------------------------------------------------------------------------------------------
// heavy war machines (§15)
// ---------------------------------------------------------------------------------------------------------------------

describe('heavy war machines', () => {
  const defend = (attacker: UnitType, hwmBlocks: number) => {
    const s = position({
      units: [
        { side: 'bottom', type: 'HWM', at: [6, 6], blocks: hwmBlocks },
        { side: 'top', type: attacker, at: [5, 6] },
      ],
    });
    s.active = 'top';
    const d: Defend = { kind: 'defend', side: 'bottom', attacker: 'u2', target: 'u1', canEvade: true, canFirstStrike: false };
    return defendChoice(s, d, NEUTRAL_W);
  };

  it('stands when standing is unlikely to lose it: an evading machine is abandoned anyway', () => {
    expect(defend('LC', 2)).toBe('stand');
    expect(defend('MC', 2)).toBe('stand');
    expect(defend('MI', 2)).toBe('stand');
  });

  it('evades when standing would very likely lose it (and its banner) anyway', () => {
    expect(defend('HI', 1)).toBe('evade');
    expect(defend('MI', 1)).toBe('evade');
  });

  it('wants to be within its range 6 but never adjacent, battered or not (advance gap)', () => {
    // 5 hexes off: in range, nothing to close (as a foot skirmisher it would still owe 3 hexes)
    expect(distance(H(8, 6), H(3, 6))).toBe(5);
    const far = bottomGap([{ side: 'bottom', type: 'HWM', at: [8, 6] }, { side: 'top', type: 'MI', at: [3, 6] }]);
    expect(far.raw).toBe(0);
    expect(far.eval).toBeCloseTo(0, 9);
    // 8 hexes off: 2 hexes short of range
    expect(bottomGap([{ side: 'bottom', type: 'HWM', at: [8, 6] }, { side: 'top', type: 'MI', at: [0, 6] }]).raw).toBe(2);
    // adjacent it cannot shoot: penalised like a unit 2 hexes short (a skirmisher would be content at 0)
    expect(distance(H(6, 6), H(5, 6))).toBe(1);
    const adj = bottomGap([{ side: 'bottom', type: 'HWM', at: [6, 6] }, { side: 'top', type: 'MI', at: [5, 6] }]);
    expect(adj.raw).toBe(2);
    expect(adj.eval).toBeCloseTo(2, 9);
    // a battered machine is not pushed forward, but it is still told off for standing next to the enemy
    const bat = bottomGap([{ side: 'bottom', type: 'HWM', at: [6, 6], blocks: 1 }, { side: 'top', type: 'MI', at: [5, 6] }]);
    expect(bat.raw).toBe(2);
    expect(bat.eval).toBeCloseTo(2, 9);
    expect(bottomGap([{ side: 'bottom', type: 'HWM', at: [8, 6], blocks: 1 }, { side: 'top', type: 'MI', at: [0, 6] }]).raw).toBe(0);
  });

  it('an adjacent machine threatens a full close combat (it cannot shoot there), unlike a foot skirmisher', () => {
    // both roll 2 dice without swords against a medium infantry unit that cannot evade
    const risk = (t: UnitType) => {
      const s = position({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: t, at: [5, 6] }] });
      return singleUnitRisk(s, new Occ(s), s.units[0], NEUTRAL_W);
    };
    expect(risk('HWM')).toBeGreaterThan(1.5 * risk('LI'));
  });

  it('holds its ground at long range over several turns against a passive enemy, shooting when ordered', () => {
    for (const seed of [1, 2]) {
      const s = position({
        units: [
          { side: 'bottom', type: 'HWM', at: [8, 6] },
          { side: 'bottom', type: 'HWM', at: [8, 8] },
          { side: 'bottom', type: 'MI', at: [7, 6] },
          { side: 'bottom', type: 'MI', at: [7, 8] },
          { side: 'top', type: 'HI', at: [3, 4] },
          { side: 'top', type: 'HI', at: [3, 9] },
          { side: 'top', type: 'MI', at: [2, 6] },
        ],
      });
      const d = new GameDriver(s);
      const mem = newMemory();
      let moves = 0;
      let shots = 0;
      let minDist = 99;
      while (!d.over && d.state.turn.number <= 8) {
        const dec = d.pending!;
        let a;
        if (dec.side === 'bottom') a = chooseAnswer(d.state, dec, detOpts('bottom', seed), mem).answer;
        else if (dec.kind === 'playCard') a = { kind: 'playCard' as const, card: d.state.players.top.hand[0] };
        else if (dec.kind === 'orders') a = { kind: 'orders' as const, pieces: [] };
        else a = chooseAnswer(d.state, dec, detOpts('top', seed), newMemory()).answer;
        expect(d.answer(a), d.lastError ?? '').toBe(true);
        for (const { e } of d.drainEvents()) {
          if (e.t === 'move' && (e.id === 'u1' || e.id === 'u2')) moves++;
          if (e.t === 'combat' && (e.attacker === 'u1' || e.attacker === 'u2') && e.purpose === 'ranged') shots++;
        }
        for (const m of d.state.units.filter((u) => u.type === 'HWM')) {
          for (const e of d.state.units.filter((u) => u.side === 'top')) minDist = Math.min(minDist, distance(m.hex, e.hex));
        }
      }
      expect(minDist, `seed ${seed}: machines kept their distance`).toBeGreaterThanOrEqual(3);
      expect(moves, `seed ${seed}: machines rarely move`).toBeLessThanOrEqual(1);
      expect(shots, `seed ${seed}: machines shot`).toBeGreaterThanOrEqual(2);
    }
  });

  it('stays back out of contact and shoots instead of creeping forward (several seeds)', () => {
    for (const seed of [1, 2, 3, 4]) {
      const s = position({
        units: [
          { side: 'bottom', type: 'HWM', at: [7, 6] },
          { side: 'bottom', type: 'MI', at: [7, 5] },
          { side: 'bottom', type: 'MI', at: [7, 7] },
          { side: 'top', type: 'HI', at: [3, 6] },
          { side: 'top', type: 'MI', at: [3, 5] },
          { side: 'top', type: 'MI', at: [3, 7] },
        ],
      });
      setHand(s, 'bottom', ['orderHeavy', 'order2C', 'order3C', 'lineCommand', 'orderMedium']);
      const { d, events } = aiTurn(s, seed);
      const hwm = d.state.units.find((u) => u.id === 'u1')!;
      expect(hwm, `seed ${seed}: machine on the board`).toBeTruthy();
      const enemies = d.state.units.filter((u) => u.side === 'top');
      expect(Math.min(...enemies.map((e) => distance(e.hex, hwm.hex))), `seed ${seed}: never adjacent`).toBeGreaterThan(1);
      expect(events.some((e) => e.t === 'move' && e.id === 'u1'), `seed ${seed}: did not move`).toBe(false);
      expect(events.some((e) => e.t === 'combat' && e.attacker === 'u1' && e.purpose === 'ranged'), `seed ${seed}: fired`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// light bow cavalry and camels (§15)
// ---------------------------------------------------------------------------------------------------------------------

describe('light bow cavalry', () => {
  it('stands off at its bow range 3 (advance gap), light cavalry at 2', () => {
    expect(distance(H(6, 6), H(3, 6))).toBe(3);
    const lbc = bottomGap([{ side: 'bottom', type: 'LBC', at: [6, 6] }, { side: 'top', type: 'HI', at: [3, 6] }]);
    expect(lbc.raw).toBe(0);
    expect(lbc.eval).toBeCloseTo(0, 9);
    expect(bottomGap([{ side: 'bottom', type: 'LBC', at: [6, 6] }, { side: 'top', type: 'HI', at: [2, 6] }]).raw).toBe(1);
    expect(bottomGap([{ side: 'bottom', type: 'LC', at: [6, 6] }, { side: 'top', type: 'HI', at: [3, 6] }]).raw).toBe(1);
  });

  it('shoots from range instead of closing with heavy infantry (several seeds)', () => {
    for (const seed of [1, 2, 3, 4]) {
      const s = position({
        top: { army: 'Scythian', blocks: 'eas', look: 'scythian', commander: 'Satraces' },
        bottom: { army: 'Macedonian', blocks: 'grk', look: 'macedonian', commander: 'Alexander' },
        units: [
          { side: 'bottom', type: 'LBC', at: [6, 6] },
          { side: 'top', type: 'HI', at: [3, 6] },
          { side: 'top', type: 'HI', at: [3, 7] },
          { side: 'top', type: 'HI', at: [3, 5] },
        ],
      });
      setHand(s, 'bottom', ['orderMounted', 'orderLight', 'order2C', 'moveFireMove', 'order3C']);
      const { d, events } = aiTurn(s, seed);
      const lbc = d.state.units.find((u) => u.id === 'u1');
      expect(events.some((e) => e.t === 'combat' && e.attacker === 'u1' && e.purpose === 'close'), `seed ${seed}: no close combat`).toBe(false);
      const shot = events.find((e): e is Extract<GameEvent, { t: 'combat' }> => e.t === 'combat' && e.attacker === 'u1' && e.purpose === 'ranged');
      expect(shot, `seed ${seed}: fired`).toBeDefined();
      // at range 3 already: it shoots with both dice instead of stepping in first (1 die after moving)
      expect(shot!.dice, `seed ${seed}: fired without moving`).toBe(2);
      if (lbc) {
        const near = Math.min(...d.state.units.filter((u) => u.side === 'top').map((e) => distance(e.hex, lbc.hex)));
        expect(near, `seed ${seed}: not left in contact`).toBeGreaterThan(1);
      }
    }
  });
});

describe('camels', () => {
  const ASIA: Army = { army: 'Seleucid', blocks: 'grk', look: 'seleucid', commander: 'Antiochus' };

  it('measure their advance to the enemy horse when it is at most 2 hexes further than the nearest enemy', () => {
    expect([distance(H(6, 6), H(4, 6)), distance(H(6, 6), H(2, 6)), distance(H(6, 6), H(1, 6))]).toEqual([2, 4, 5]);
    // infantry 2 hexes off, horse 4 hexes off: the camel still has 3 hexes to close, to the horse
    const toHorse = bottomGap(
      [{ side: 'bottom', type: 'CAM', at: [6, 6] }, { side: 'top', type: 'MI', at: [4, 6] }, { side: 'top', type: 'MC', at: [2, 6] }],
      { bottom: ASIA, top: ROMAN },
    );
    expect(toHorse.raw).toBe(3);
    expect(toHorse.eval).toBeCloseTo(3, 9);
    // the horse 5 hexes off is too far out of the way: the nearest enemy counts
    expect(bottomGap(
      [{ side: 'bottom', type: 'CAM', at: [6, 6] }, { side: 'top', type: 'MI', at: [4, 6] }, { side: 'top', type: 'MC', at: [1, 6] }],
      { bottom: ASIA, top: ROMAN },
    ).raw).toBe(1);
  });


  it('attack the enemy horse rather than the infantry beside it', () => {
    const s = position({
      bottom: ASIA, top: ROMAN,
      units: [
        { side: 'bottom', type: 'CAM', at: [4, 6] },
        { side: 'top', type: 'MC', at: [3, 6] },
        { side: 'top', type: 'MI', at: [3, 7] },
      ],
    });
    s.turn.ordered.u1 = {
      id: 'u1', isLeader: false, startHex: s.units[0].hex, moved: 0, moveDone: true, move2Done: false, battlesLeft: 1,
      canBattle: true, mustBattle: false, enteredHexThisTurn: false, attachedThisTurn: false,
    };
    s.turn.phase = 'battle';
    expect(greedyBattle(s, NEUTRAL_W)).toEqual({ kind: 'attack', unit: 'u1', target: H(3, 6) });
  });

  it('a camel evading a horse is priced with its blue-triangle ignore', () => {
    const s = position({
      bottom: ASIA, top: ROMAN,
      units: [{ side: 'bottom', type: 'CAM', at: [6, 6] }, { side: 'top', type: 'HC', at: [5, 6] }, { side: 'top', type: 'HI', at: [5, 7] }],
    });
    s.active = 'top';
    const occ = new Occ(s);
    const [cam, hc, hi] = s.units;
    // 4 dice either way: the horse's roll loses 1 blue triangle (expected hits 0.15 instead of 0.67)
    const vsHorse = evadeEV(s, occ, hc, cam, 4).ev;
    const vsFoot = evadeEV(s, occ, hi, cam, 4).ev;
    expect(vsHorse).toBeLessThan(0.07);
    expect(vsFoot).toBeGreaterThan(0.15);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// ramparts (§16) and Fright at First Sight (116)
// ---------------------------------------------------------------------------------------------------------------------

describe('threat model: ramparts and Fright at First Sight', () => {
  it('a foot unit on a rampart fears push-back less from across a protected side than from its flank', () => {
    // a light infantry attacker (no sword hits) and full retreat room: only the push-back term can differ
    const risk = (at: [number, number]) => {
      const s = position({
        terrain: [{ r: 6, c: 6, t: 'rampart', faces: 'top' }],
        units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'LI', at }],
      });
      return singleUnitRisk(s, new Occ(s), s.units[0], NEUTRAL_W);
    };
    expect(risk([5, 6])).toBeLessThan(risk([6, 7]) - 0.002); // NE (protected) vs E (open)
  });

  it('Roman infantry cannot shrug off elephant flags under Fright at First Sight (116)', () => {
    const risk = (rules: SpecialRuleId[]) => {
      const s = position({
        rules,
        units: [
          { side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'bottom', type: 'MI', at: [6, 5] }, { side: 'bottom', type: 'MI', at: [6, 7] },
          { side: 'top', type: 'EL', at: [5, 6] },
        ],
        leaders: [{ side: 'bottom', name: 'Laevinus', at: [6, 6] }],
      });
      return singleUnitRisk(s, new Occ(s), s.units[0], NEUTRAL_W);
    };
    expect(risk(['frightAtFirstSight'])).toBeGreaterThan(risk([]) + 0.01);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Hellespont (112): leaders cost a card, losing them all loses the battle
// ---------------------------------------------------------------------------------------------------------------------

describe('Hellespont leaders', () => {
  const HELL: SpecialRuleId[] = ['leaderLossCostsCard', 'allLeadersSuddenDeath'];
  const CRATERUS: Army = { army: "Craterus' Successors", blocks: 'car', look: 'craterus', commander: 'Craterus' };
  const EUMENES: Army = { army: "Eumenes' Successors", blocks: 'grk', look: 'eumenes', commander: 'Eumenes' };

  it('values a leader more as the side runs out of them (own and enemy view)', () => {
    const s = position({
      rules: HELL, top: CRATERUS, bottom: EUMENES,
      units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'MI', at: [2, 6] }, { side: 'top', type: 'MI', at: [2, 8] }],
      leaders: [
        { side: 'bottom', name: 'Eumenes', at: [6, 6] },
        { side: 'top', name: 'Craterus', at: [2, 6] }, { side: 'top', name: 'Neoptolemus', at: [2, 8] },
      ],
    });
    const [eumenes, craterus] = s.leaders;
    expect(isSacredLeader(s, eumenes)).toBe(true);
    expect(isSacredLeader(s, craterus)).toBe(false);
    try {
      setViewer('bottom');
      expect(leaderVal(s, eumenes)).toBeGreaterThanOrEqual(10);
      expect(leaderVal(s, craterus)).toBeGreaterThan(1);
      setViewer('top');
      expect(leaderVal(s, eumenes)).toBeGreaterThanOrEqual(5);
    } finally {
      setViewer(null);
    }
    // without the rules they are ordinary leaders
    const plain = position({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }], leaders: [{ side: 'bottom', name: 'Eumenes', at: [6, 6] }] });
    expect(isSacredLeader(plain, plain.leaders[0])).toBe(false);
    expect(leaderVal(plain, plain.leaders[0])).toBeLessThan(0.5);
  });

  it('a leader\'s stake is exactly the standing cost his loss adds, whatever the Command left', () => {
    for (const command of [5, 1]) {
      const s = position({
        rules: HELL, top: CRATERUS, bottom: EUMENES,
        units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'MI', at: [2, 6] }, { side: 'top', type: 'MI', at: [2, 8] }],
        leaders: [
          { side: 'bottom', name: 'Eumenes', at: [6, 6] },
          { side: 'top', name: 'Craterus', at: [2, 6] }, { side: 'top', name: 'Neoptolemus', at: [2, 8] },
        ],
      });
      s.players.top.command = command;
      const craterus = s.leaders[1];
      const after = cloneState(s);
      after.leaders[1].hex = OFF_BOARD;
      after.special.leadersEliminated.top++;
      const stake = leaderVal(s, craterus) - leaderWorth(craterus);
      expect(stake, `Command ${command}`).toBeGreaterThan(0);
      expect(leaderLossCost(after, 'top') - leaderLossCost(s, 'top'), `Command ${command}`).toBeCloseTo(stake, 9);
    }
  });

  it('keeps its last leader out of contact (constructed position, several seeds)', () => {
    // the last leader rides a 2-block unit; weakened enemies two hexes away tempt a Double Time charge with him
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const s = position({
        rules: HELL, top: CRATERUS, bottom: EUMENES,
        units: [
          { side: 'bottom', type: 'MI', at: [5, 4], blocks: 2 },
          { side: 'bottom', type: 'HI', at: [5, 5] },
          { side: 'bottom', type: 'MI', at: [6, 4] },
          { side: 'top', type: 'WA', at: [3, 4], blocks: 1 },
          { side: 'top', type: 'AX', at: [3, 5], blocks: 1 },
          { side: 'top', type: 'LC', at: [2, 6] },
        ],
        // the enemy still has two leaders (with one, hunting him down for the instant win can be worth the risk)
        leaders: [
          { side: 'bottom', name: 'Eumenes', at: [5, 4] }, { side: 'top', name: 'Craterus', at: [0, 4] }, { side: 'top', name: 'Neoptolemus', at: [0, 10] },
        ],
      });
      setHand(s, 'bottom', ['doubleTime', 'order3C', 'lineCommand', 'inspiredC', 'orderMedium']);
      const { d } = aiTurn(s, seed);
      const L = d.state.leaders.find((l) => l.name === 'Eumenes');
      expect(L, `seed ${seed}: Eumenes alive`).toBeTruthy();
      const nearest = Math.min(...d.state.units.filter((u) => u.side === 'top' && u.hex >= 0).map((u) => distance(u.hex, L!.hex)));
      expect(nearest, `seed ${seed}: last leader ends the turn adjacent to the enemy`).toBeGreaterThan(1);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// leader placement (117 Asculum)
// ---------------------------------------------------------------------------------------------------------------------

describe('Asculum leader placement', () => {
  const asculum = SCENARIOS.find((x) => x.id === '117')!;

  const place = (seed: number) => {
    const d = new GameDriver(createGame(asculum.setup, seed));
    const mems = { top: newMemory(), bottom: newMemory() };
    const order: { side: Side; army: string; hex: number; unit?: UnitType }[] = [];
    while (d.pending?.kind === 'placeLeader') {
      const p = d.pending;
      const opts: AiOptions = { ...detOpts(p.side, seed), personality: personalityFor(asculum.setup[p.side].commander, asculum.setup[p.side].army) };
      const { answer } = chooseAnswer(d.state, p, opts, mems[p.side]);
      expect(isLegal(d.state, p, answer)).toBe(true);
      const hex = (answer as { hex: number }).hex;
      const u = d.state.units.find((x) => x.hex === hex);
      order.push({ side: p.side, army: d.state.players[p.side].army, hex, unit: u?.side === p.side ? u.type : undefined });
      expect(d.answer(answer)).toBe(true);
    }
    expect(d.pending?.kind).toBe('playCard');
    return order;
  };

  it('puts every leader on an own unit (never alone), Romans first, behind the skirmish screen, deterministically', () => {
    for (const seed of [3, 4]) {
      const order = place(seed);
      expect(order.map((o) => o.army)).toEqual(['Roman', 'Roman', 'Epirote', 'Epirote']);
      for (const o of order) {
        expect(o.unit, `seed ${seed}: leader on an own unit`).toBeDefined();
        // the light screen in front (Roman LI, Epirote LB) is the front line; elephants gain nothing from a leader
        expect(['LI', 'LB', 'EL']).not.toContain(o.unit);
      }
      expect(new Set(order.map((o) => o.hex)).size).toBe(4);
      expect(place(seed)).toEqual(order);
    }
  });

  it('follows the cards in hand: the first Roman leader joins a unit in the section the hand can order', () => {
    const cases: [string[], 'left' | 'right'][] = [
      [['order2L', 'order3L', 'order4L', 'inspiredL'], 'left'],
      [['order2R', 'order3R', 'order4R', 'inspiredR'], 'right'],
    ];
    for (const [kinds, sec] of cases) {
      const s = createGame(asculum.setup, 3);
      setHand(s, 'bottom', kinds);
      const d = new GameDriver(s);
      const p = d.pending!;
      expect(p.kind === 'placeLeader' && p.side).toBe('bottom');
      const { answer } = chooseAnswer(d.state, p, { ...detOpts('bottom', 3), personality: personalityFor('Decius', 'Roman') }, newMemory());
      expect(isLegal(d.state, p, answer)).toBe(true);
      const hex = (answer as { hex: number }).hex;
      const u = d.state.units.find((x) => x.hex === hex);
      expect(u?.side, `${sec}: on an own unit`).toBe('bottom');
      expect(UNIT_STATS[u!.type].cls, `${sec}: not a light unit`).not.toBe('light');
      expect(sectionsOf(hex, 'bottom'), `${sec} hand`).toContain(sec);
    }
  });

  it('the fallback placement picks an own unit without a leader, else the first offered hex', () => {
    const s = position({
      units: [{ side: 'bottom', type: 'MI', at: [6, 4] }, { side: 'bottom', type: 'HI', at: [6, 6] }, { side: 'top', type: 'MI', at: [2, 6] }],
      leaders: [{ side: 'bottom', name: 'Decius', at: [6, 4] }],
    });
    const d = (options: number[]): Extract<Decision, { kind: 'placeLeader' }> => ({ kind: 'placeLeader', side: 'bottom', leader: 'L9', options });
    // an empty hex, an enemy unit, an own unit that already has a leader, then a free own unit
    expect(safePlacement(s, d([H(7, 6), H(2, 6), H(6, 4), H(6, 6)]))).toBe(H(6, 6));
    expect(safePlacement(s, d([H(7, 6), H(6, 4)]))).toBe(H(7, 6));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// elites and leader traits (§17.1, §17.2)
// ---------------------------------------------------------------------------------------------------------------------

describe('elites and leader traits', () => {
  const MAC: Army = { army: 'Macedonian', blocks: 'grk', look: 'macedonian', commander: 'Alexander' };
  const PER: Army = { army: 'Persian', blocks: 'eas', look: 'persian', commander: 'Mithridates' };

  it('values the Companions and Alexander above their plain counterparts, and his +1 die in an attack', () => {
    const s = position({
      top: MAC, bottom: PER,
      units: [
        { side: 'top', type: 'MC', at: [3, 4], elite: 'companions' }, { side: 'top', type: 'MC', at: [3, 8] },
        { side: 'bottom', type: 'MI', at: [4, 4] }, { side: 'bottom', type: 'MI', at: [4, 8] },
      ],
      leaders: [{ side: 'top', name: 'Alexander', at: [3, 4], traits: ['ccBonus'] }, { side: 'top', name: 'Parmenio', at: [3, 8] }],
    });
    const [comp, mc, mi1, mi2] = s.units;
    expect(unitWeight(comp)).toBeGreaterThan(unitWeight(mc));
    expect(leaderWorth(s.leaders[0])).toBeGreaterThan(leaderWorth(s.leaders[1]));
    s.active = 'top';
    const occ = new Occ(s);
    expect(closeAttackEV(s, occ, comp, mi1, 'attack', true, NEUTRAL_W).ev).toBeGreaterThan(closeAttackEV(s, occ, mc, mi2, 'attack', true, NEUTRAL_W).ev);
  });

  it('a satrap commands no chain: a Leadership card on him orders only himself and his unit', () => {
    const s = position({
      top: MAC, bottom: PER,
      units: [
        { side: 'bottom', type: 'MC', at: [6, 6] }, { side: 'bottom', type: 'MC', at: [6, 5] }, { side: 'bottom', type: 'MC', at: [6, 7] },
        { side: 'top', type: 'MI', at: [3, 6] },
      ],
      leaders: [{ side: 'bottom', name: 'Spithridates', at: [6, 6], traits: ['attachedOnly'] }],
    });
    const withHim = orderCandidates(s, 'bottom', 'leadershipAny', NEUTRAL_W, 3).filter((c) => c.pieces.includes(s.leaders[0].id));
    expect(withHim.length).toBeGreaterThan(0);
    for (const c of withHim) expect([...c.pieces].sort()).toEqual([s.leaders[0].id, 'u1'].sort());
  });

  it('a satrap\'s helmets hit only for his own unit, not its neighbours (helmetsOcc mirrors helmetsCount)', () => {
    const s = position({
      top: MAC, bottom: PER,
      units: [{ side: 'bottom', type: 'MC', at: [6, 6] }, { side: 'bottom', type: 'MC', at: [6, 5] }, { side: 'top', type: 'MI', at: [3, 6] }],
      leaders: [{ side: 'bottom', name: 'Spithridates', at: [6, 6], traits: ['attachedOnly'] }],
    });
    const [own, neighbour] = s.units;
    const helmets = (u: typeof own) => {
      const occ = new Occ(s);
      expect(helmetsOcc(occ, u), u.id).toBe(helmetsCount(s, u));
      return helmetsOcc(occ, u);
    };
    expect(helmets(own)).toBe(true);
    expect(helmets(neighbour)).toBe(false);
    // an ordinary leader in his place helps the neighbour too
    s.leaders[0].traits = [];
    expect(helmets(neighbour)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Roman Tactical Flexibility (§17.3) in the AI's combat estimate
// ---------------------------------------------------------------------------------------------------------------------

describe('Tactical Flexibility in the combat estimate', () => {
  it('an unsupported non-Roman HI battling back at a Roman MI rolls 3 dice: less battle-back damage, a better attack', () => {
    const units: Pos['units'] = [{ side: 'bottom', type: 'MI', at: [5, 6] }, { side: 'top', type: 'HI', at: [4, 6] }];
    const est = (rules: SpecialRuleId[]) => {
      const s = position({ units, rules });
      s.active = 'bottom';
      const occ = new Occ(s);
      const [mi, hi] = s.units;
      return {
        dice: closeCombatDice(s, hi, mi, { role: 'back', fullAtStart: true, ordered: false }),
        back: backDamage(s, occ, hi, mi),
        attack: closeAttackEV(s, occ, mi, hi, 'attack', true, NEUTRAL_W).ev,
      };
    };
    const tf = est(['tacticalFlexibility']);
    const plain = est([]);
    expect([tf.dice, plain.dice]).toEqual([3, 5]);
    expect(tf.back).toBeLessThan(plain.back);
    expect(tf.attack).toBeGreaterThan(plain.attack);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// information hiding on Expansion #1 decisions
// ---------------------------------------------------------------------------------------------------------------------

describe('information hiding', () => {
  /**
   * The same position with what `me` cannot see changed: the opponent holds other cards (re-dealt from the deck), the
   * deck is in another order and the dice generator is elsewhere.
   */
  const hidden = (s0: GameState, me: Side): GameState => {
    const s = cloneState(s0);
    const opp = other(me);
    const n = s.players[opp].hand.length;
    const pool = [...s.deck, ...s.players[opp].hand];
    s.players[opp].hand = pool.slice(0, n);
    s.deck = pool.slice(n).reverse();
    s.rng = (s.rng ^ 0x5bd1e995) >>> 0;
    s.rngCalls += 37;
    expect(s.players[opp].hand).not.toEqual(s0.players[opp].hand);
    return s;
  };

  const same = (scId: string, seed: number, kind: Decision['kind']) => {
    const sc = SCENARIOS.find((x) => x.id === scId)!;
    const s = createGame(sc.setup, seed);
    const d = new GameDriver(s).pending!;
    expect(d.kind).toBe(kind);
    const opts: AiOptions = { ...detOpts(d.side, seed), personality: personalityFor(sc.setup[d.side].commander, sc.setup[d.side].army) };
    const a1 = chooseAnswer(s, d, opts, newMemory()).answer;
    const a2 = chooseAnswer(hidden(s, d.side), d, opts, newMemory()).answer;
    expect(isLegal(s, d, a1)).toBe(true);
    expect(a2).toEqual(a1);
  };

  it('117 Asculum: the first leader placement does not depend on the opponent\'s hand, the deck or the dice', () => {
    same('117', 3, 'placeLeader');
  });

  it('112 Hellespont: the first card played does not depend on the opponent\'s hand, the deck or the dice', () => {
    same('112', 5, 'playCard');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// commanders and their voice
// ---------------------------------------------------------------------------------------------------------------------

describe('Expansion #1 commanders', () => {
  it('map to the six temperaments', () => {
    const want: Record<string, string> = {
      Alexander: 'lion', Pyrrhus: 'lion', Craterus: 'lion', Maurya: 'lion', Epaminondas: 'strategist', Seleucus: 'strategist',
      Flamininus: 'strategist', Paullus: 'strategist', Eumenes: 'fox', 'Philip II': 'fox', Satraces: 'fox', 'Darius III': 'veteran',
      Ptolemy: 'shield', Perseus: 'shield', Pausanias: 'shield', Dentatus: 'shield', Porus: 'veteran', Mardonius: 'bull',
      Cleombrotos: 'bull', Onomarchus: 'bull', Antiochus: 'bull', 'Philip V': 'bull', 'Valerius Laevinus': 'bull', Datis: 'veteran',
      Hamilcar: 'veteran', Gelon: 'veteran', Agesilaus: 'veteran', Antigonus: 'veteran', Mithridates: 'veteran', Dionysius: 'veteran',
      // base-game names keep their temperament
      Hannibal: 'fox', Himilco: 'shield', Varro: 'bull', Scipio: 'strategist', Hasdrubal: 'veteran',
    };
    for (const [name, id] of Object.entries(want)) expect(personalityFor(name, 'Greek').id, name).toBe(id);
  });

  it('name the troops of every army look and the elite units', () => {
    const looks = [...new Set(SCENARIOS.flatMap((sc) => [sc.setup.top.look, sc.setup.bottom.look]))];
    const s = position({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }] });
    for (const look of looks) {
      s.players.bottom.look = look;
      for (const t of UNIT_TYPES) expect(troopName(s, 'bottom', t), `${look} ${t}`).not.toBe('men');
    }
    s.players.bottom.look = 'macedonian';
    expect(troopName(s, 'bottom', 'HI')).toBe('phalanx');
    expect(troopName(s, 'bottom', 'MC', 'companions')).toBe('Companions');
    expect(troopName(s, 'bottom', 'MI', 'immortals')).toBe('Immortals');
    s.players.bottom.look = 'scythian';
    expect(troopName(s, 'bottom', 'LBC')).toBe('Scythian horse archers');
  });
});
