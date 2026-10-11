// AI checks for Expansion #2 (rules-reference §18-§19): objectives (held banners, turn-start captures, exits), the pilum,
// Rolling Fire, separate commands, last-row retreat, very steep hills, Caesar and Spartacus, the ambush reserve, commanders
// and their voice, and the legality of the first decisions of every Expansion #2 battle. Cheap and deterministic
// (tribune in deterministic mode, fixed seeds, constructed positions).
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CARD_LIST, GameDriver, OFF_BOARD, cloneState, createGame, forceDice, hexId, other, rollingFireRoutes, sectionsOf,
  validateOrders, type ArmyLook, type Blocks, type CommandDef, type Decision, type EliteId, type GameEvent, type GameState,
  type LeaderTrait, type Legion, type ObjectiveSetup, type ScenarioSetup, type Side, type SpecialRuleId, type TerrainSetup,
  type UnitType,
} from '../../src/engine';
import { SCENARIOS } from '../../src/scenarios';
import { PERSONALITIES, chooseAnswer, isLegal, newMemory, personalityFor, type AiOptions } from '../../src/ai';
import { Occ } from '../../src/ai/board';
import { cardRetention } from '../../src/ai/cardsense';
import { closeAttackEV, rollingFireEV } from '../../src/ai/estimate';
import { evaluate, singleUnitRisk } from '../../src/ai/evaluate';
import { HELD_SHARE } from '../../src/ai/goals';
import { orderCandidates } from '../../src/ai/ordering';
import { chooseCommandIndex, chooseRetreat, greedyBattle, retreatLoss } from '../../src/ai/policies';
import { Rng } from '../../src/ai/rand';
import { resumeTurn } from '../../src/ai/sim';
import { NEUTRAL_W, bannerStep, leaderWorth } from '../../src/ai/values';
import { speak, troopName } from '../../src/ai/voice';
import { failOnAiErrors } from './no-ai-errors';

const H = (r: number, c: number) => hexId(r, c);

interface Army { army: string; blocks: Blocks; look: ArmyLook; commander: string }
const ROMAN: Army = { army: 'Roman', blocks: 'rom', look: 'marian', commander: 'Marius' };
const GAUL: Army = { army: 'Gallic', blocks: 'bar', look: 'gallic', commander: 'Aneroestes' };
const SLAVE: Army = { army: 'Slave', blocks: 'bar', look: 'slave', commander: 'Spartacus' };

interface Pos {
  units: { side: Side; type: UnitType; at: [number, number]; blocks?: number; elite?: EliteId; command?: string }[];
  leaders?: { side: Side; name: string; at: [number, number]; traits?: LeaderTrait[] }[];
  terrain?: TerrainSetup[];
  rules?: SpecialRuleId[];
  top?: Army;
  bottom?: Army;
  first?: Side;
  banners?: number;
  legions?: Partial<Record<Side, Legion>>;
  objectives?: ObjectiveSetup[];
  commands?: CommandDef[];
  rollingFire?: Side;
  lastRowRetreat?: Side;
  rampartBreakers?: Side;
}

/** Units get ids u1.. in order, then the leaders L<n>. */
function position(p: Pos): GameState {
  const setup: ScenarioSetup = {
    id: 'test', name: 'Test',
    top: { ...(p.top ?? GAUL), cards: 5 }, bottom: { ...(p.bottom ?? ROMAN), cards: 5 },
    first: p.first ?? 'bottom', banners: p.banners ?? 6,
    terrain: p.terrain ?? [],
    units: p.units.map((u) => ({ side: u.side, type: u.type, r: u.at[0], c: u.at[1], elite: u.elite, command: u.command })),
    leaders: (p.leaders ?? []).map((l) => ({ side: l.side, name: l.name, r: l.at[0], c: l.at[1], traits: l.traits })),
    reserves: [], reserveLeaders: [], rules: p.rules ?? [],
    legions: p.legions, objectives: p.objectives, commands: p.commands, rollingFire: p.rollingFire,
    lastRowRetreat: p.lastRowRetreat, rampartBreakers: p.rampartBreakers,
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
  const opp = other(side);
  s.players[opp].hand = s.players[opp].hand.filter((c) => !used.has(c));
  s.deck = [...s.deck.filter((c) => !used.has(c)), ...s.players[side].hand.filter((c) => !used.has(c))];
  s.players[side].hand = hand;
  while (s.players[opp].hand.length < 5) s.players[opp].hand.push(s.deck.shift()!);
}

const detOpts = (side: Side, seed: number, extra: Partial<AiOptions> = {}): AiOptions => ({
  side, difficulty: 'tribune', personality: PERSONALITIES[5], seed, deterministic: true, budgetScale: 0.3, ...extra,
});

/** Let the AI play the active side's whole turn (both sides answer their own decisions); returns the turn's events. */
function aiTurn(s: GameState, seed: number, extra: Partial<AiOptions> = {}) {
  const d = new GameDriver(s);
  const side = d.state.active;
  const turn = d.state.turn.number;
  const mems = { top: newMemory(), bottom: newMemory() };
  const events: GameEvent[] = [];
  const decisions: { d: Decision; plan: string | undefined; command?: string }[] = [];
  let guard = 0;
  while (d.pending && d.state.active === side && d.state.turn.number === turn && guard++ < 200) {
    const dec = d.pending;
    const r = chooseAnswer(d.state, dec, detOpts(dec.side, seed, extra), mems[dec.side]);
    expect(isLegal(d.state, dec, r.answer)).toBe(true);
    decisions.push({ d: dec, plan: mems[dec.side].plan?.label, command: mems[dec.side].plan?.command });
    expect(d.answer(r.answer), d.lastError ?? '').toBe(true);
    for (const { e } of d.drainEvents()) events.push(e);
  }
  return { d, events, decisions, mems };
}

/** Order unit `id` for the battle phase (not moved, one battle left) under card `kind`. */
function battleReady(s: GameState, side: Side, ids: string[], kind: Parameters<typeof cardRetention>[2] = 'order2C') {
  s.active = side;
  s.turn.effective = kind;
  s.turn.phase = 'battle';
  for (const id of ids) {
    const u = s.units.find((x) => x.id === id)!;
    s.turn.ordered[id] = {
      id, isLeader: false, startHex: u.hex, moved: 0, moveDone: true, move2Done: false, battlesLeft: 1,
      canBattle: true, mustBattle: false, enteredHexThisTurn: false, attachedThisTurn: false,
    };
  }
}

afterEach(() => forceDice([]));
failOnAiErrors();

const EXP2 = SCENARIOS.filter((sc) => Number(sc.id) >= 201 && Number(sc.id) <= 223);

// ---------------------------------------------------------------------------------------------------------------------
// every battle: the first decisions of both sides are legal
// ---------------------------------------------------------------------------------------------------------------------

describe('Expansion #2 battles: first decisions', () => {
  it('has all 23 battles', () => {
    expect(EXP2.map((sc) => sc.id)).toHaveLength(23);
  });

  for (const sc of EXP2) {
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
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// the pilum (§18.2)
// ---------------------------------------------------------------------------------------------------------------------

describe('pilum', () => {
  it('a legion MI with a target at range 2 and no enemy next to it throws the pilum rather than idling', () => {
    const s = position({
      legions: { bottom: 'marius' },
      units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'WA', at: [4, 6], blocks: 2 }],
    });
    battleReady(s, 'bottom', ['u1']);
    expect(greedyBattle(s, NEUTRAL_W)).toEqual({ kind: 'attack', unit: 'u1', target: H(4, 6) });
  });

  it('the threat of a legion MI two hexes off is its close combat after a step, not a 1-die throw', () => {
    const risk = (legions: Partial<Record<Side, Legion>> | undefined) => {
      const s = position({ legions, units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'MI', at: [4, 6] }] });
      return singleUnitRisk(s, new Occ(s), s.units[0], NEUTRAL_W);
    };
    expect(risk({ top: 'marius' })).toBeCloseTo(risk(undefined), 9);
  });

  it('Darken the Sky is worth keeping more for a legion army', () => {
    const s = position({
      legions: { bottom: 'marius' },
      units: [
        { side: 'bottom', type: 'MI', at: [6, 2] }, { side: 'bottom', type: 'MI', at: [6, 4] }, { side: 'bottom', type: 'MI', at: [6, 6] },
        { side: 'bottom', type: 'MI', at: [6, 8] }, { side: 'bottom', type: 'LB', at: [7, 6] }, { side: 'top', type: 'WA', at: [2, 6] },
      ],
    });
    const plain = cloneState(s);
    for (const u of plain.units) delete u.legion;
    expect(cardRetention(s, 'bottom', 'darken', NEUTRAL_W)).toBeGreaterThan(cardRetention(plain, 'bottom', 'darken', NEUTRAL_W));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Rolling Fire (210, §18.5)
// ---------------------------------------------------------------------------------------------------------------------

describe('Rolling Fire', () => {
  const base = (below: Pos['units']) =>
    position({
      top: SLAVE, rollingFire: 'top', first: 'top',
      terrain: [{ r: 2, c: 6, t: 'hill' }],
      units: [{ side: 'top', type: 'MI', at: [2, 6] }, ...below, { side: 'bottom', type: 'MI', at: [7, 0] }],
    });

  it('the paths from the hill run down towards the Roman edge', () => {
    const s = base([]);
    const paths = rollingFireRoutes(s, 'top', H(2, 6));
    expect(paths.length).toBeGreaterThan(1);
    for (const p of paths) expect(new Set(p.map((h) => [H(3, 5), H(3, 6)].includes(h))).has(true)).toBe(true);
  });

  it('is never chosen when it would hit only own units', () => {
    const s = base([{ side: 'top', type: 'WA', at: [3, 5] }, { side: 'top', type: 'WA', at: [3, 6], blocks: 1 }]);
    battleReady(s, 'top', ['u1']);
    expect(greedyBattle(s, NEUTRAL_W)).toEqual({ kind: 'endBattle' });
  });

  it('rolls down the path through battered Roman units, and values friends in the way as a loss', () => {
    // nobody next to the rolling unit: the logs are its only way to battle
    const s = base([{ side: 'bottom', type: 'MI', at: [4, 6], blocks: 1 }, { side: 'bottom', type: 'AX', at: [5, 6], blocks: 1 }]);
    battleReady(s, 'top', ['u1']);
    const a = greedyBattle(s, NEUTRAL_W);
    expect(a.kind).toBe('rollingFire');
    if (a.kind === 'rollingFire') expect(a.path.slice(1)).toEqual([H(4, 6), H(5, 6)]); // through both, from either first hex
    const path = [H(3, 6), H(4, 6), H(5, 6)];
    const clear = rollingFireEV(s, new Occ(s), s.units[0], path).ev;
    const t = cloneState(s);
    t.units.push({ ...t.units[1], id: 'u99', side: 'top', hex: H(3, 6), blocks: 4 });
    const withFriend = rollingFireEV(t, new Occ(t), t.units[0], path).ev;
    expect(clear).toBeGreaterThan(0);
    expect(withFriend).toBeLessThan(clear);
  });

  it('a resumed battle phase (battle rollouts) still offers Rolling Fire under the turn\'s card', () => {
    const s = base([{ side: 'bottom', type: 'MI', at: [3, 6], blocks: 1 }]);
    battleReady(s, 'top', ['u1']);
    let asked = false;
    resumeTurn(s, (st, d) => {
      if (d.kind === 'battle' && !asked) {
        asked = true;
        return { kind: 'rollingFire', unit: 'u1', path: rollingFireRoutes(st, 'top', H(2, 6)).find((p) => p[0] === H(3, 6))! };
      }
      if (d.kind === 'battle') return { kind: 'endBattle' };
      if (d.kind === 'retreat' || d.kind === 'leaderEvade') return { kind: 'choose', index: 0 };
      if (d.kind === 'ignoreFlags') return { kind: 'ignoreFlags', count: 0 };
      return { kind: 'endMove' };
    }, new Rng(5), 'battle');
    expect(asked).toBe(true);
    expect(s.units.find((u) => u.id === 'u1')?.blocks ?? 0).toBeLessThan(4); // the logs cost the rolling unit a block
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// objectives (§18.4)
// ---------------------------------------------------------------------------------------------------------------------

describe('held banners and objectives in the evaluation', () => {
  it('204: a German unit on a held Roman camp is worth about a held banner, and the AI keeps it there', () => {
    const at = (h: [number, number]) =>
      position({
        top: { army: 'Germanic', blocks: 'bar', look: 'germanic', commander: 'Boiorix' }, first: 'top', banners: 7,
        terrain: [{ r: 8, c: 8, t: 'camp' }, { r: 8, c: 9, t: 'camp' }],
        objectives: [{ kind: 'hold', side: 'top', hexes: [[8, 8], [8, 9]], max: 1 }],
        units: [
          { side: 'top', type: 'WA', at: h }, { side: 'top', type: 'WA', at: [3, 2] }, { side: 'top', type: 'AX', at: [3, 4] },
          { side: 'bottom', type: 'MI', at: [6, 2] }, { side: 'bottom', type: 'MI', at: [6, 4] }, { side: 'bottom', type: 'LI', at: [5, 11] },
        ],
      });
    const on = evaluate(at([8, 8]), 'top', 'bottom', NEUTRAL_W);
    const off = evaluate(at([7, 8]), 'top', 'bottom', NEUTRAL_W);
    expect(on - off).toBeGreaterThan(0.6 * HELD_SHARE * bannerStep(1, 7));
    for (const seed of [1, 2, 3]) {
      const s = at([8, 8]);
      setHand(s, 'top', ['order2L', 'order3L', 'order2C', 'orderMedium', 'order3C']);
      const { d } = aiTurn(s, seed);
      expect(d.state.units.some((u) => u.side === 'top' && (u.hex === H(8, 8) || u.hex === H(8, 9))), `seed ${seed}`).toBe(true);
    }
  });

  it('202: holding more of the hills is worth the two banners (majority at the turn end)', () => {
    const s = position({
      banners: 8,
      objectives: [{ kind: 'majority', sides: ['top', 'bottom'], hexes: [[3, 9], [3, 10], [3, 11]], banners: 2, when: 'turnEnd' }],
      terrain: [{ r: 3, c: 9, t: 'hill' }, { r: 3, c: 10, t: 'hill' }, { r: 3, c: 11, t: 'hill' }],
      units: [
        { side: 'bottom', type: 'MI', at: [4, 9] }, { side: 'bottom', type: 'MI', at: [6, 2] },
        { side: 'top', type: 'WA', at: [3, 11] }, { side: 'top', type: 'WA', at: [1, 2] },
      ],
    });
    const tie = cloneState(s);
    tie.units[0].hex = H(3, 9);
    const v0 = evaluate(s, 'bottom', 'top', NEUTRAL_W);
    const v1 = evaluate(tie, 'bottom', 'top', NEUTRAL_W);
    // from a lost majority (the Gauls hold 2) to a tie (nobody): about two held banners swing
    expect(v1 - v0).toBeGreaterThan(HELD_SHARE * (bannerStep(1, 8) + bannerStep(2, 8)) * 0.8);
  });

  it('219: a section without Britons is a banner for the Romans at the end of their turn', () => {
    const s = position({
      top: { army: 'Briton', blocks: 'bar', look: 'briton', commander: 'Cassivellaunus' },
      objectives: [{ kind: 'sectionClear', side: 'bottom' }],
      units: [
        { side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'WA', at: [2, 6] }, { side: 'top', type: 'WA', at: [2, 11] },
        { side: 'top', type: 'BCH', at: [2, 1] },
      ],
    });
    s.active = 'bottom';
    const before = evaluate(s, 'bottom', 'top', NEUTRAL_W);
    const t = cloneState(s);
    t.units = t.units.filter((u) => u.id !== 'u4'); // the chariot on the Roman left is gone
    expect(sectionsOf(H(2, 1), 'bottom')).toEqual(['left']);
    const after = evaluate(t, 'bottom', 'top', NEUTRAL_W);
    expect(after - before).toBeGreaterThan(HELD_SHARE * bannerStep(1, 6));
  });

  it('201: a Roman unit on an untaken camp counts as a step towards the third camp; turn-start captures follow 0, 0, 1', () => {
    const mk = (r: number) =>
      position({
        terrain: [{ r: 3, c: 5, t: 'camp' }, { r: 4, c: 4, t: 'camp' }, { r: 4, c: 5, t: 'camp' }],
        objectives: [{ kind: 'capture', side: 'bottom', hexes: [[3, 5], [4, 4], [4, 5]], when: 'turnStart', banners: [0, 0, 1], remove: true }],
        units: [{ side: 'bottom', type: 'MI', at: [r, 5] }, { side: 'top', type: 'WA', at: [0, 0] }],
      });
    const on = evaluate(mk(4), 'bottom', 'top', NEUTRAL_W);
    const off = evaluate(mk(5), 'bottom', 'top', NEUTRAL_W);
    expect(on).toBeGreaterThan(off + 0.15);
    // the last camp scores the banner: standing on it is worth (most of) a banner
    const last = mk(4);
    last.special.objState[0].taken = [H(3, 5), H(4, 4)];
    const lastOff = cloneState(last);
    lastOff.units[0].hex = H(5, 5);
    expect(evaluate(last, 'bottom', 'top', NEUTRAL_W) - evaluate(lastOff, 'bottom', 'top', NEUTRAL_W)).toBeGreaterThan(0.6);
  });

  it('a battle rollout resumed mid-turn does not capture a camp a unit has only just reached (turn-start capture)', () => {
    const s = position({
      terrain: [{ r: 3, c: 5, t: 'camp' }],
      objectives: [{ kind: 'capture', side: 'bottom', hexes: [[3, 5]], when: 'turnStart', remove: true }],
      units: [{ side: 'bottom', type: 'MI', at: [3, 5] }, { side: 'top', type: 'WA', at: [0, 0] }],
    });
    battleReady(s, 'bottom', ['u1']);
    resumeTurn(s, (_st, d) => (d.kind === 'battle' ? { kind: 'endBattle' } : { kind: 'endMove' }), new Rng(3), 'battle');
    expect(s.special.objState[0].taken).toEqual([]);
    expect(s.players.bottom.banners).toBe(0);
  });

  it('212: Slave foot next to the Roman edge leave the board for a banner', () => {
    for (const seed of [1, 2]) {
      const s = position({
        top: SLAVE, first: 'top', legions: { bottom: 'marius' },
        objectives: [{ kind: 'exit', side: 'top', units: 'foot', hexes: Array.from({ length: 13 }, (_, c) => [8, c] as [number, number]) }],
        units: [
          { side: 'top', type: 'WA', at: [8, 2] }, { side: 'top', type: 'AX', at: [7, 3] }, { side: 'top', type: 'LC', at: [8, 4] },
          { side: 'bottom', type: 'MI', at: [3, 9] }, { side: 'bottom', type: 'MI', at: [3, 10] },
        ],
      });
      setHand(s, 'top', ['order3R', 'order4R', 'orderMedium', 'order2R', 'orderLight']);
      const { d, events } = aiTurn(s, seed);
      const out = events.filter((e): e is Extract<GameEvent, { t: 'move' }> => e.t === 'move' && e.path[e.path.length - 1] === OFF_BOARD);
      expect(out.length, `seed ${seed}: exits`).toBeGreaterThan(0);
      expect(out.every((e) => e.id !== 'u3'), `seed ${seed}: the light cavalry may not exit`).toBe(true);
      expect(d.state.players.top.banners, `seed ${seed}`).toBe(out.length);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// separate commands (210, §18.5)
// ---------------------------------------------------------------------------------------------------------------------

describe('separate commands', () => {
  const COMMANDS: CommandDef[] = [{ id: 'lentulus', name: 'Lentulus', side: 'bottom', blocks: 'gry' }, { id: 'gellius', name: 'Gellius', side: 'bottom' }];

  it('210: the Roman AI never gives orders that mix the two commands', () => {
    const sc = SCENARIOS.find((x) => x.id === '210')!;
    const d = new GameDriver(createGame(sc.setup, 210));
    const mems = { top: newMemory(), bottom: newMemory() };
    const command = new Map(d.state.units.map((u) => [u.id, u.command]));
    let orders = 0;
    let steps = 0;
    while (!d.over && d.state.turn.number <= 8 && steps++ < 2000) {
      const dec = d.pending!;
      const r = chooseAnswer(d.state, dec, { ...detOpts(dec.side, 7, { budgetScale: 0.08 }) }, mems[dec.side]);
      if (dec.kind === 'orders' && r.answer.kind === 'orders' && dec.side === 'bottom') {
        expect(validateOrders(d.state, 'bottom', dec.card, r.answer.pieces)).toBeNull();
      }
      expect(d.answer(r.answer), d.lastError ?? '').toBe(true);
      for (const { e } of d.drainEvents()) {
        if (e.t !== 'ordered' || e.side !== 'bottom') continue;
        orders++;
        const cmds = new Set(e.ids.map((id) => command.get(id)).filter((c) => c !== undefined));
        expect(cmds.size, `ordered ${e.ids.join(',')}`).toBeLessThanOrEqual(1);
      }
    }
    expect(orders).toBeGreaterThan(0);
  });

  it('names the command whose Clash of Shields attacks are better, as its turn plan did, and fights with it', () => {
    for (const seed of [1, 2]) {
      const s = position({
        commands: COMMANDS, legions: { bottom: 'marius' },
        units: [
          // Lentulus: two MI against full-strength warriors; Gellius: two MI against battered auxilia
          { side: 'bottom', type: 'MI', at: [5, 1], command: 'lentulus' }, { side: 'bottom', type: 'MI', at: [5, 2], command: 'lentulus' },
          { side: 'bottom', type: 'MI', at: [5, 9], command: 'gellius' }, { side: 'bottom', type: 'MI', at: [5, 10], command: 'gellius' },
          { side: 'top', type: 'HI', at: [4, 1] }, { side: 'top', type: 'HI', at: [4, 2] },
          { side: 'top', type: 'AX', at: [4, 9], blocks: 1 }, { side: 'top', type: 'AX', at: [4, 10], blocks: 1 },
        ],
      });
      setHand(s, 'bottom', ['clash']);
      const { decisions, events } = aiTurn(s, seed);
      const cc = decisions.find((x) => x.d.kind === 'chooseCommand');
      expect(cc, `seed ${seed}: the card asked for a command`).toBeDefined();
      expect(cc!.command, `seed ${seed}: the plan named Gellius`).toBe('gellius');
      const ordered = events.find((e): e is Extract<GameEvent, { t: 'ordered' }> => e.t === 'ordered');
      expect(ordered?.ids.sort(), `seed ${seed}`).toEqual(['u3', 'u4']);
      expect(events.some((e) => e.t === 'combat' && (e.attacker === 'u3' || e.attacker === 'u4')), `seed ${seed}: attacked`).toBe(true);
    }
  });

  it('chooseCommandIndex weighs the commands by what the card does for each (Darken the Sky)', () => {
    const s = position({
      commands: COMMANDS, legions: { bottom: 'marius' },
      units: [
        { side: 'bottom', type: 'MI', at: [6, 1], command: 'lentulus' }, // nothing in range
        { side: 'bottom', type: 'MI', at: [6, 9], command: 'gellius' }, { side: 'bottom', type: 'MI', at: [6, 10], command: 'gellius' },
        { side: 'top', type: 'AX', at: [4, 9], blocks: 1 }, { side: 'top', type: 'WA', at: [1, 1] },
      ],
    });
    s.turn.effective = 'darken';
    s.turn.mods = { ...s.turn.mods, noMove: true, noClose: true, shots: 2 };
    const d: Extract<Decision, { kind: 'chooseCommand' }> = { kind: 'chooseCommand', side: 'bottom', options: ['lentulus', 'gellius'] };
    expect(chooseCommandIndex(s, d, NEUTRAL_W)).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// last-row retreat (214), very steep hills (223), Caesar, Spartacus
// ---------------------------------------------------------------------------------------------------------------------

describe('last-row retreat, very steep hills, Caesar and Spartacus', () => {
  it('214: a Slave unit pushed onto its baseline short of hexes is lost: the estimate and the retreat choice know it', () => {
    const mk = (lastRow: boolean) =>
      position({
        top: SLAVE, legions: { bottom: 'marius' }, lastRowRetreat: lastRow ? 'top' : undefined,
        units: [{ side: 'top', type: 'WA', at: [1, 6], blocks: 4 }, { side: 'bottom', type: 'MI', at: [2, 6] }],
      });
    const ev = (s: GameState) => closeAttackEV(s, new Occ(s), s.units[1], s.units[0], 'attack', true, NEUTRAL_W);
    expect(ev(mk(true)).pElim).toBeGreaterThan(ev(mk(false)).pElim + 0.1);
    const s = mk(true);
    const u = s.units[0];
    const toBaseline = { path: [H(0, 6)], end: H(0, 6), losses: 1, attachLeader: null };
    expect(retreatLoss(s, u, toBaseline)).toBe(4);
    expect(retreatLoss(s, u, toBaseline, true)).toBe(1); // never an evade
    expect(retreatLoss(mk(false), u, toBaseline)).toBe(1);
    const d: Extract<Decision, { kind: 'retreat' }> = {
      kind: 'retreat', side: 'top', unit: u.id, reason: 'retreat',
      options: [toBaseline, { path: [], end: H(1, 6), losses: 2, attachLeader: null }],
    };
    expect(chooseRetreat(s, d, NEUTRAL_W)).toBe(1);
  });

  it('223: very steep hills make a unit on a hill much safer from attackers below', () => {
    const risk = (rules: SpecialRuleId[]) => {
      const s = position({
        rules, legions: { bottom: 'marius' },
        top: { army: 'Briton', blocks: 'bar', look: 'briton', commander: 'Caratacus' },
        terrain: [{ r: 3, c: 6, t: 'hill' }, { r: 3, c: 5, t: 'hill' }, { r: 3, c: 7, t: 'hill' }],
        units: [{ side: 'top', type: 'WA', at: [3, 6] }, { side: 'bottom', type: 'HI', at: [5, 6] }, { side: 'bottom', type: 'MI', at: [4, 7] }],
      });
      return singleUnitRisk(s, new Occ(s), s.units[0], NEUTRAL_W);
    };
    expect(risk(['veryHills'])).toBeLessThan(0.7 * risk([]));
  });

  it('212: a ditch stops a warband short of a charge it could make over open ground', () => {
    const risk = (ditch: boolean) => {
      const s = position({
        top: SLAVE,
        terrain: ditch ? [5, 6, 7].map((c) => ({ r: 2, c, t: 'ditch' as const })) : [],
        units: [{ side: 'bottom', type: 'MI', at: [4, 6] }, { side: 'top', type: 'WA', at: [1, 6] }],
      });
      return singleUnitRisk(s, new Occ(s), s.units[0], NEUTRAL_W);
    };
    expect(risk(false)).toBeGreaterThan(0.02);
    expect(risk(true)).toBe(0);
  });

  it('Barbarian chariots threaten more at full strength (+1 die)', () => {
    const risk = (blocks: number) => {
      const s = position({ units: [{ side: 'bottom', type: 'MI', at: [6, 6] }, { side: 'top', type: 'BCH', at: [5, 6], blocks }] });
      return singleUnitRisk(s, new Occ(s), s.units[0], NEUTRAL_W);
    };
    expect(risk(3)).toBeGreaterThan(risk(2) * 1.2);
  });

  it('Caesar\'s forced march: his infantry threatens a unit three hexes off', () => {
    const risk = (traits: LeaderTrait[]) => {
      const s = position({
        units: [{ side: 'top', type: 'WA', at: [3, 6] }, { side: 'bottom', type: 'MI', at: [6, 6] }],
        leaders: [{ side: 'bottom', name: 'Julius Caesar', at: [6, 6], traits }],
      });
      return singleUnitRisk(s, new Occ(s), s.units[0], NEUTRAL_W);
    };
    expect(risk([])).toBe(0);
    expect(risk(['ccBonus', 'forcedMarch'])).toBeGreaterThan(0.02);
  });

  it('I Am Spartacus is worth more while Spartacus is on the board, and so is he', () => {
    const mk = (traits: LeaderTrait[]) =>
      position({
        top: SLAVE,
        units: [{ side: 'top', type: 'WA', at: [2, 6] }, { side: 'top', type: 'MI', at: [2, 4] }, { side: 'bottom', type: 'MI', at: [6, 6] }],
        leaders: [{ side: 'top', name: 'Spartacus', at: [2, 6], traits }],
      });
    const withHim = mk(['spartacusDice']);
    const without = mk([]);
    expect(cardRetention(withHim, 'top', 'spartacus', NEUTRAL_W)).toBeGreaterThan(cardRetention(without, 'top', 'spartacus', NEUTRAL_W));
    expect(leaderWorth(withHim.leaders[0])).toBeGreaterThan(leaderWorth(without.leaders[0]));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// ambush reserve (206), information hiding, commanders and voice
// ---------------------------------------------------------------------------------------------------------------------

describe('206 ambush, information hiding, commanders and voice', () => {
  it('206: Order Light Troops offers the ambush entry in every section, like the Leadership cards', () => {
    const sc = SCENARIOS.find((x) => x.id === '206')!;
    const s = createGame(sc.setup, 3);
    s.active = 'bottom';
    for (const kind of ['orderLight', 'leadershipAny'] as const) {
      const amb = orderCandidates(s, 'bottom', kind, NEUTRAL_W, 2).filter((c) => c.ambush).map((c) => c.ambush);
      expect(amb, kind).toEqual(['left', 'center', 'right']);
    }
    expect(cardRetention(s, 'bottom', 'orderLight', NEUTRAL_W)).toBeGreaterThan(0.3);
  });

  it('the ambush taunt names the reserve\'s own leader (Mago at the Trebbia, Marcellus at Aquae Sextiae)', () => {
    for (const [id, side, name] of [['005', 'top', 'Mago'], ['206', 'bottom', 'Marcellus']] as const) {
      const sc = SCENARIOS.find((x) => x.id === id)!;
      const s = createGame(sc.setup, 3);
      const P = personalityFor(sc.setup[side].commander, sc.setup[side].army);
      const lines = new Set<string>();
      for (let seed = 1; seed < 60; seed++) {
        const line = speak(s, side, P, 'ambush', { recent: [], sayTurn: -1, saysThisTurn: 0 }, new Rng(seed), { chance: 2 });
        if (line) lines.add(line);
      }
      const call = [...lines].find((l) => l.includes('Spring the trap'));
      expect(call, id).toContain(`Now, ${name}!`);
      expect([...lines].some((l) => /Mago/.test(l)) && name !== 'Mago', id).toBe(false);
    }
  });

  it('210: the first card does not depend on the opponent\'s hand, the deck or the dice', () => {
    const sc = SCENARIOS.find((x) => x.id === '210')!;
    const s = createGame(sc.setup, 5);
    const d = new GameDriver(s).pending!;
    expect(d.kind).toBe('playCard');
    const opts: AiOptions = { ...detOpts(d.side, 5, { budgetScale: 0.1 }), personality: personalityFor(sc.setup[d.side].commander, sc.setup[d.side].army) };
    const a1 = chooseAnswer(s, d, opts, newMemory()).answer;
    const h = cloneState(s);
    const opp = other(d.side);
    const pool = [...h.deck, ...h.players[opp].hand];
    h.players[opp].hand = pool.slice(0, h.players[opp].hand.length);
    h.deck = pool.slice(h.players[opp].hand.length).reverse();
    h.rng = (h.rng ^ 0x5bd1e995) >>> 0;
    expect(h.players[opp].hand).not.toEqual(s.players[opp].hand);
    expect(chooseAnswer(h, d, opts, newMemory()).answer).toEqual(a1);
  });

  it('commanders map to their temperaments', () => {
    const want: Record<string, string> = {
      'Julius Caesar': 'strategist', Spartacus: 'lion', Crixus: 'bull', Oenomaus: 'bull', Marius: 'strategist', Crassus: 'strategist',
      'Publius Crassus': 'strategist', Germanicus: 'strategist', Arminius: 'fox', Boiorix: 'bull', Teutobodus: 'bull',
      Vercingetorix: 'fox', Cassivellaunus: 'fox', Caratacus: 'fox', 'Claudius Glaber': 'shield', 'Marcus Claudius Marcellus': 'lion',
      'Atilius Regulus': 'bull', Mummius: 'bull',
    };
    for (const [name, id] of Object.entries(want)) expect(personalityFor(name, 'Roman').id, name).toBe(id);
    expect(personalityFor('Salvius', 'Slave').id).toBe('veteran');
    expect(personalityFor('Gellius', 'Roman').id).toBe('lion');
  });

  it('name the troops of the new armies', () => {
    const s = position({
      top: SLAVE,
      units: [{ side: 'top', type: 'MI', at: [2, 6] }, { side: 'bottom', type: 'MI', at: [6, 6] }],
      leaders: [{ side: 'top', name: 'Spartacus', at: [2, 6], traits: ['spartacusDice'] }],
    });
    expect(troopName(s, 'top', 'MI')).toBe("Spartacus' gladiators");
    expect(troopName(s, 'bottom', 'HI', 'tenthLegion')).toBe('Tenth Legion');
    s.players.top.look = 'gallic';
    expect(troopName(s, 'top', 'WA')).toBe('Gallic warband');
    s.players.top.look = 'briton';
    expect(troopName(s, 'top', 'BCH')).toBe('British chariots');
    s.players.top.look = 'slave';
    s.leaders = [];
    expect(troopName(s, 'top', 'MI')).toBe('gladiators');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// an illegal answer is never hidden
// ---------------------------------------------------------------------------------------------------------------------

describe('an AI answer replaced by the fallback', () => {
  it('is counted in the memory and reported with console.error (so failOnAiErrors fails on it)', () => {
    // a placement decision with no hex to offer: the AI's answer cannot be legal, so the fallback answers instead
    const s = createGame(SCENARIOS.find((sc) => sc.id === '210')!.setup, 1);
    const l = s.leaders.find((x) => x.side === s.active)!;
    const d: Decision = { kind: 'placeLeader', side: s.active, leader: l.id, options: [] };
    const mem = newMemory();
    expect(mem.fallbacks).toBe(0);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      chooseAnswer(s, d, detOpts(s.active, 1), mem);
      expect(mem.fallbacks).toBe(1);
      expect(err.mock.calls.map((c) => String(c[0]))).toEqual(['AI error: illegal answer replaced by a fallback']);
    } finally {
      err.mockClear(); // the reported error is this test's subject, not a hidden AI failure
    }
  });
});
