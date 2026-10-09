// Independent QA helpers for the rules suite (tests/rules). Uses only the public engine API.
import {
  CARD_LIST, GameDriver, createGame, forceDice, forcedDiceLeft, hexId,
  type Answer, type CardKind, type Decision, type DieFace, type EliteId, type GameEvent, type GameState, type LeaderTrait, type ScenarioSetup,
  type Side, type TerrainType, type Unit, type UnitType,
} from '../../src/engine';

export interface Pos {
  units?: { side: Side; type: UnitType; at: [number, number]; blocks?: number; elite?: EliteId }[];
  leaders?: { side: Side; name?: string; at: [number, number]; traits?: LeaderTrait[] }[];
  terrain?: { at: [number, number]; t: TerrainType; ford?: boolean }[];
  first?: Side;
  rules?: ScenarioSetup['rules'];
  cards?: number;
  banners?: number;
  topArmy?: string;
  bottomArmy?: string;
  sacredLeader?: ScenarioSetup['sacredLeader'];
  initialCommand?: ScenarioSetup['initialCommand'];
}

export const H = (r: number, c: number) => hexId(r, c);

export function setupOf(p: Pos): ScenarioSetup {
  return {
    id: 'qa',
    name: 'QA',
    top: { army: p.topArmy ?? 'Carthaginian', blocks: 'car', look: 'carthaginian', commander: 'T', cards: p.cards ?? 5 },
    bottom: { army: p.bottomArmy ?? 'Roman', blocks: 'rom', look: 'roman', commander: 'B', cards: p.cards ?? 5 },
    first: p.first ?? 'bottom',
    banners: p.banners ?? 99,
    terrain: (p.terrain ?? []).map((t) => ({ r: t.at[0], c: t.at[1], t: t.t, ford: t.ford })),
    units: (p.units ?? []).map((u) => ({ side: u.side, type: u.type, r: u.at[0], c: u.at[1], elite: u.elite })),
    leaders: (p.leaders ?? []).map((l, i) => ({ side: l.side, name: l.name ?? `Ldr${i}`, r: l.at[0], c: l.at[1], traits: l.traits })),
    reserves: [],
    reserveLeaders: [],
    rules: p.rules ?? [],
    sacredLeader: p.sacredLeader,
    initialCommand: p.initialCommand,
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

/** Finish the active player's turn doing nothing with a plain section card (hands are manipulated in place). */
export function passTurn(d: GameDriver, kind: CardKind = 'order2L') {
  const side = d.state.active;
  const card = giveCard(d.state, side, kind);
  must(d, { kind: 'playCard', card });
  if (d.pending?.kind === 'orders') must(d, { kind: 'orders', pieces: [] });
  while (d.pending?.kind === 'move') must(d, { kind: 'endMove' });
  while (d.pending?.kind === 'battle') must(d, { kind: 'endBattle' });
}
