// Shared plumbing for the AI suites (tests/ai): constructed positions, hands, deterministic options and whole AI turns.
// Each suite keeps its own armies, banners and seeds (they decide the positions and so the AI's choices).
import { expect } from 'vitest';
import {
  CARD_LIST, GameDriver, createGame, other, type Answer, type ArmyLook, type Blocks, type Decision, type EliteId, type GameEvent,
  type GameState, type LeaderTrait, type ScenarioSetup, type Side, type SpecialRuleId, type TerrainSetup, type UnitType,
} from '../../src/engine';
import { PERSONALITIES, chooseAnswer, isLegal, newMemory, type AiOptions } from '../../src/ai';

export interface Army { army: string; blocks: Blocks; look: ArmyLook; commander: string }

export interface Pos {
  units: { side: Side; type: UnitType; at: [number, number]; blocks?: number; elite?: EliteId; command?: string }[];
  /** A leader without a name is called L<i> (i: its index in this list). */
  leaders?: { side: Side; name?: string; at: [number, number]; traits?: LeaderTrait[] }[];
  terrain?: TerrainSetup[];
  rules?: SpecialRuleId[];
  top?: Army;
  bottom?: Army;
  first?: Side;
  banners?: number;
  sacredLeader?: ScenarioSetup['sacredLeader'];
  legions?: ScenarioSetup['legions'];
  objectives?: ScenarioSetup['objectives'];
  commands?: ScenarioSetup['commands'];
  rollingFire?: ScenarioSetup['rollingFire'];
  lastRowRetreat?: ScenarioSetup['lastRowRetreat'];
  rampartBreakers?: ScenarioSetup['rampartBreakers'];
}

/** A suite's defaults for `Pos`: the armies, the banners to win and the game seed. */
export interface PosDefaults { top: Army; bottom: Army; banners: number; seed: number }

/**
 * A position builder with a suite's own defaults. Units get ids u1.. in order, then the leaders L<n>; both sides hold 5
 * cards and `bottom` moves first unless the Pos says otherwise.
 */
export function positionBuilder(def: PosDefaults): (p: Pos) => GameState {
  return (p) => {
    const setup: ScenarioSetup = {
      id: 'test', name: 'Test',
      top: { ...(p.top ?? def.top), cards: 5 }, bottom: { ...(p.bottom ?? def.bottom), cards: 5 },
      first: p.first ?? 'bottom', banners: p.banners ?? def.banners,
      terrain: p.terrain ?? [],
      units: p.units.map((u) => ({ side: u.side, type: u.type, r: u.at[0], c: u.at[1], elite: u.elite, command: u.command })),
      leaders: (p.leaders ?? []).map((l, i) => ({ side: l.side, name: l.name ?? `L${i}`, r: l.at[0], c: l.at[1], traits: l.traits })),
      reserves: [], reserveLeaders: [], rules: p.rules ?? [],
      sacredLeader: p.sacredLeader, legions: p.legions, objectives: p.objectives, commands: p.commands, rollingFire: p.rollingFire,
      lastRowRetreat: p.lastRowRetreat, rampartBreakers: p.rampartBreakers,
    };
    const s = createGame(setup, def.seed);
    p.units.forEach((u, i) => {
      if (u.blocks !== undefined) s.units[i].blocks = u.blocks;
    });
    return s;
  };
}

/** Give a side exactly these card kinds (taken from the deck / other hand); the other side's hand is refilled to 5. */
export function setHand(s: GameState, side: Side, kinds: string[]) {
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
  // a side that orders by dice (310, §18.10) holds no cards
  while (s.players[opp].hand.length < 5 && s.players[opp].command > 0) s.players[opp].hand.push(s.deck.shift()!);
}

/** Tribune in deterministic mode (simulation counts bound the search), Fox's temperament. */
export const detOpts = (side: Side, seed: number, extra: Partial<AiOptions> = {}): AiOptions => ({
  side, difficulty: 'tribune', personality: PERSONALITIES[5], seed, deterministic: true, budgetScale: 0.3, ...extra,
});

/**
 * Let the AI play the active side's whole turn (both sides answer their own decisions, `detOpts(side, seed, extra)`).
 * Returns the turn's events, and each decision with its answer and the plan (label, command) the AI held when answering.
 */
export function aiTurn(s: GameState, seed: number, extra: Partial<AiOptions> = {}) {
  const d = new GameDriver(s);
  const side = d.state.active;
  const turn = d.state.turn.number;
  const mems = { top: newMemory(), bottom: newMemory() };
  const events: GameEvent[] = [];
  const decisions: { d: Decision; a: Answer; plan: string | undefined; command?: string }[] = [];
  let guard = 0;
  while (d.pending && d.state.active === side && d.state.turn.number === turn && guard++ < 200) {
    const dec = d.pending;
    const r = chooseAnswer(d.state, dec, detOpts(dec.side, seed, extra), mems[dec.side]);
    expect(isLegal(d.state, dec, r.answer)).toBe(true);
    decisions.push({ d: dec, a: r.answer, plan: mems[dec.side].plan?.label, command: mems[dec.side].plan?.command });
    expect(d.answer(r.answer), d.lastError ?? '').toBe(true);
    for (const { e } of d.drainEvents()) events.push(e);
  }
  return { d, events, decisions, mems };
}
