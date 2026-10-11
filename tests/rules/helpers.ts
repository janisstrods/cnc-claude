// Independent QA helpers for the rules suite (tests/rules). Uses only the public engine API.
import { expect } from 'vitest';
import {
  CARD_LIST, GameDriver, UNIT_STATS, createGame, forceDice, forcedDiceLeft, hexId,
  type Answer, type CardKind, type Decision, type DieFace, type GameEvent, type GameState, type ScenarioSetup, type Side, type TerrainSetup,
  type TerrainType, type Unit, type UnitType,
} from '../../src/engine';

/** A scenario entry placed `at: [r, c]` instead of by `r` and `c`. */
type At<T> = Omit<T, 'r' | 'c'> & { at: [number, number] };

/**
 * A QA battle: any `ScenarioSetup` fields (the rest take defaults: no pieces or terrain, `first: 'bottom'`, `banners: 99`,
 * no rules) plus shorthands. Pieces and terrain stand `at: [r, c]`; a unit's `blocks` sets its strength after the build; a
 * leader's name defaults to Ldr<i>; the armies are `topArmy` (Carthaginian) and `bottomArmy` (Roman), each holding `cards`
 * cards (5) unless `orderDice` gives the side dice orders (310 Utica P1, §18.10: `orders: 'dice'`, `cards: 0`). Every other
 * field passes through unchanged, so a new scenario field needs no change here.
 *
 * Ids: units and leaders share one id counter, in the order board units, board leaders, `placeLeaders`, `reserves`,
 * `reserveLeaders`, `placeUnits` (§18.5, §18.9). With n board units and no leaders the reserve units are u<n+1>..., each
 * leader before them takes a number first.
 */
export type Pos = Partial<Omit<ScenarioSetup, 'top' | 'bottom' | 'units' | 'leaders' | 'terrain'>> & {
  units?: (At<ScenarioSetup['units'][number]> & { blocks?: number })[];
  leaders?: (Omit<At<ScenarioSetup['leaders'][number]>, 'name'> & { name?: string })[];
  terrain?: At<TerrainSetup>[];
  cards?: number;
  topArmy?: string;
  bottomArmy?: string;
  orderDice?: Partial<Record<Side, number>>;
};

/** A side of the QA battle: its cards, or its dice orders (`Pos.orderDice`). */
function sideOf(p: Pos, side: Side, army: string, blocks: 'car' | 'rom', look: 'carthaginian' | 'roman', commander: string): ScenarioSetup['top'] {
  const dice = p.orderDice?.[side];
  if (dice === undefined) return { army, blocks, look, commander, cards: p.cards ?? 5 };
  return { army, blocks, look, commander, cards: 0, orders: 'dice', orderDice: dice };
}

export const H = (r: number, c: number) => hexId(r, c);

/** The scenario data of a QA battle (`Pos`). */
export function setupOf(p: Pos): ScenarioSetup {
  const { units, leaders, terrain, cards: _cards, topArmy, bottomArmy, orderDice: _orderDice, ...rest } = p;
  return {
    id: 'qa',
    name: 'QA',
    ...rest,
    top: sideOf(p, 'top', topArmy ?? 'Carthaginian', 'car', 'carthaginian', 'T'),
    bottom: sideOf(p, 'bottom', bottomArmy ?? 'Roman', 'rom', 'roman', 'B'),
    first: p.first ?? 'bottom',
    banners: p.banners ?? 99,
    terrain: (terrain ?? []).map(({ at: [r, c], ...t }) => ({ ...t, r, c })),
    units: (units ?? []).map(({ at: [r, c], blocks: _blocks, ...u }) => ({ ...u, r, c })),
    leaders: (leaders ?? []).map(({ at: [r, c], name, ...l }, i) => ({ ...l, name: name ?? `Ldr${i}`, r, c })),
    reserves: p.reserves ?? [],
    reserveLeaders: p.reserveLeaders ?? [],
    rules: p.rules ?? [],
  };
}

/** Build a state. Units get ids u1..un in order; leaders get the following L ids (use leaderId()). */
export function build(p: Pos, seed = 4242): GameState {
  const s = createGame(setupOf(p), seed);
  (p.units ?? []).forEach((u, i) => {
    if (u.blocks !== undefined) s.units[i].blocks = u.blocks;
  });
  return s;
}

/** Id of the i-th leader in the Pos (0-based). */
export function leaderId(s: GameState, i: number): string {
  return s.leaders[i].id;
}

/** Remove one card id from wherever it is in the hands, replacing it with a harmless deck card. */
function pull(s: GameState, id: number) {
  for (const side of ['top', 'bottom'] as Side[]) {
    const hand = s.players[side].hand;
    const i = hand.indexOf(id);
    if (i >= 0) {
      const j = s.deck.findIndex((c) => CARD_LIST[c] !== 'firstStrike' && CARD_LIST[c] !== CARD_LIST[id]);
      hand[i] = s.deck.splice(j, 1)[0];
    }
  }
  const d = s.deck.indexOf(id);
  if (d >= 0) s.deck.splice(d, 1);
  const x = s.discard.indexOf(id);
  if (x >= 0) s.discard.splice(x, 1);
}

/** Put a card of `kind` into `side`'s hand (replacing the first card, which goes back on the deck bottom). */
export function giveCard(s: GameState, side: Side, kind: CardKind): number {
  const hand = s.players[side].hand;
  const already = hand.find((c) => CARD_LIST[c] === kind);
  if (already !== undefined) return already;
  const id = CARD_LIST.findIndex((k) => k === kind);
  const all = CARD_LIST.map((k, i) => (k === kind ? i : -1)).filter((i) => i >= 0);
  const free = all.find((i) => !s.players.top.hand.includes(i) && !s.players.bottom.hand.includes(i)) ?? id;
  pull(s, free);
  const old = hand[0];
  hand[0] = free;
  s.deck.unshift(old);
  return free;
}

/** Make sure nobody holds First Strike (so no unexpected defend decisions). */
export function noFirstStrike(s: GameState) {
  for (const side of ['top', 'bottom'] as Side[]) {
    const hand = s.players[side].hand;
    for (let i = 0; i < hand.length; i++) {
      if (CARD_LIST[hand[i]] === 'firstStrike') {
        const j = s.deck.findIndex((c) => CARD_LIST[c] !== 'firstStrike');
        const repl = s.deck.splice(j, 1)[0];
        s.deck.unshift(hand[i]);
        hand[i] = repl;
      }
    }
  }
}

export function must(d: GameDriver, a: Answer) {
  const ok = d.answer(a);
  if (!ok) throw new Error(`answer ${JSON.stringify(a)} rejected: ${d.lastError} (pending ${JSON.stringify(d.pending)})`);
}

/**
 * Start the active player's turn with a card of `kind`, ordering `pieces` (if the card asks for a selection).
 * The active player is s.active (set via Pos.first). Strips First Strike from both hands unless keepFS.
 */
export function play(s: GameState, kind: CardKind, pieces?: string[], opts: { keepFS?: boolean } = {}): GameDriver {
  if (!opts.keepFS) noFirstStrike(s);
  const card = giveCard(s, s.active, kind);
  const d = new GameDriver(s);
  must(d, { kind: 'playCard', card });
  if (pieces && d.pending?.kind === 'orders') must(d, { kind: 'orders', pieces });
  return d;
}

/** Play a card and order pieces, then end movement (skip to battle). */
export function toBattle(s: GameState, kind: CardKind, pieces: string[]): GameDriver {
  const d = play(s, kind, pieces);
  if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
  return d;
}

export function u(d: GameDriver | GameState, id: string): Unit | undefined {
  const s = 'state' in d ? d.state : d;
  return s.units.find((x) => x.id === id);
}

export function ev(d: GameDriver): GameEvent[] {
  return d.drainEvents().map((q) => q.e);
}

/** Dice count of the first 'combat' event with the given purpose. */
export function combatDice(events: GameEvent[], purpose: string, attacker?: string): number | undefined {
  const e = events.find((x) => x.t === 'combat' && x.purpose === purpose && (!attacker || x.attacker === attacker));
  return e && e.t === 'combat' ? e.dice : undefined;
}

export function rolls(events: GameEvent[], purpose?: string): DieFace[][] {
  return events.filter((x) => x.t === 'roll' && (!purpose || x.purpose === purpose)).map((x) => (x as { faces: DieFace[] }).faces);
}

export function pendingKind(d: GameDriver): Decision['kind'] | null {
  return d.pending?.kind ?? null;
}

/** Faces helper: n copies of a face. */
export function n(face: DieFace, k: number): DieFace[] {
  return Array(k).fill(face);
}

export { forceDice, forcedDiceLeft };

/** Play a card of `kind` for the active side of a running game and order `pieces` (hands are manipulated in place). */
export function turn(d: GameDriver, kind: CardKind, pieces: string[]) {
  const card = giveCard(d.state, d.state.active, kind);
  must(d, { kind: 'playCard', card });
  if (d.pending?.kind === 'orders') must(d, { kind: 'orders', pieces });
}

/** End the movement of the ordered pieces still to move. */
export function endMoves(d: GameDriver) {
  while (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
}

/** Finish the active player's turn: end the movement, then the battles not fought. */
export function endTurn(d: GameDriver) {
  endMoves(d);
  while (d.pending?.kind === 'battle') must(d, { kind: 'endBattle' });
}

/** Finish the active player's turn doing nothing with a plain section card (hands are manipulated in place). */
export function passTurn(d: GameDriver, kind: CardKind = 'order2L') {
  turn(d, kind, []);
  endTurn(d);
}

/** Events from the latest turnStart of `side` on. */
export function fromTurnStart(es: GameEvent[], side: Side): GameEvent[] {
  const i = es.map((e) => e.t === 'turnStart' && e.side === side).lastIndexOf(true);
  expect(i).toBeGreaterThanOrEqual(0);
  return es.slice(i);
}

// ---------------------------------------------------------------------------------------------------------------------
// One close combat: a bottom attacker (u1) at (5,6) against a top defender (u2) at (4,6)

/** A class face that scores against neither unit type (nor is a flag, sword or helmet): a sure miss between them. */
export function miss(a: UnitType, b: UnitType): DieFace {
  return (['light', 'medium', 'heavy'] as const).find((c) => c !== UNIT_STATS[a].cls && c !== UNIT_STATS[b].cls)!;
}

/** A `duel`: the card played (default `order4C`), the strengths at the start, the terrain under each unit. */
export interface DuelOpts {
  card?: CardKind;
  atkBlocks?: number;
  defBlocks?: number;
  atkT?: TerrainType;
  defT?: TerrainType;
  atkFord?: boolean;
  defFord?: boolean;
}

/** The attacker attacks the defender, which stands; every die misses. Returns the attack and battle-back dice. */
export function duel(atk: UnitType, def: UnitType, o: DuelOpts = {}): { attack?: number; back?: number } {
  const terrain: Pos['terrain'] = [];
  if (o.atkT) terrain.push({ at: [5, 6], t: o.atkT, ford: o.atkFord });
  if (o.defT) terrain.push({ at: [4, 6], t: o.defT, ford: o.defFord });
  const s = build({
    units: [
      { side: 'bottom', type: atk, at: [5, 6], blocks: o.atkBlocks },
      { side: 'top', type: def, at: [4, 6], blocks: o.defBlocks },
    ],
    terrain,
  });
  const card = o.card ?? 'order4C';
  const d = play(s, card, card === 'clash' ? undefined : ['u1']);
  if (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
  expect(d.pending?.kind).toBe('battle');
  ev(d);
  forceDice(n(miss(atk, def), 30));
  must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  if (d.pending?.kind === 'defend') must(d, { kind: 'defend', choice: 'stand' });
  const e = ev(d);
  return { attack: combatDice(e, 'close'), back: combatDice(e, 'battleBack') };
}

/** The attacker declares the attack (`extra` adds to the position); returns the driver at the defend decision. */
export function attackOn(atk: UnitType, def: UnitType, extra: Pos = {}): GameDriver {
  const s = build({ ...extra, units: [{ side: 'bottom', type: atk, at: [5, 6] }, { side: 'top', type: def, at: [4, 6] }, ...(extra.units ?? [])] });
  const d = toBattle(s, 'order4C', ['u1']);
  forceDice(n(miss(atk, def), 40)); // if the attack resolves at once (no defend decision), every die misses
  must(d, { kind: 'attack', unit: 'u1', target: H(4, 6) });
  return d;
}

/** Whether the defender may evade the attack. */
export function canEvade(atk: UnitType, def: UnitType): boolean {
  const d = attackOn(atk, def);
  return d.pending?.kind === 'defend' && d.pending.canEvade;
}
