import { CARD_LIST, GameDriver, createGame, hexId, type Answer, type CardKind, type EliteId, type GameState, type ScenarioSetup, type Side, type TerrainType, type UnitType } from '../../src/engine';

export interface Pos {
  units?: { side: Side; type: UnitType; at: [number, number]; blocks?: number; elite?: EliteId }[];
  leaders?: { side: Side; name?: string; at: [number, number] }[];
  terrain?: { at: [number, number]; t: TerrainType; ford?: boolean }[];
  first?: Side;
  rules?: ScenarioSetup['rules'];
  cards?: number;
}

export function setupOf(p: Pos): ScenarioSetup {
  return {
    id: 'test',
    name: 'Test',
    top: { army: 'Carthaginian', blocks: 'car', look: 'carthaginian', commander: 'T', cards: p.cards ?? 5 },
    bottom: { army: 'Roman', blocks: 'rom', look: 'roman', commander: 'B', cards: p.cards ?? 5 },
    first: p.first ?? 'bottom',
    banners: 99,
    terrain: (p.terrain ?? []).map((t) => ({ r: t.at[0], c: t.at[1], t: t.t, ford: t.ford })),
    units: (p.units ?? []).map((u) => ({ side: u.side, type: u.type, r: u.at[0], c: u.at[1], elite: u.elite })),
    leaders: (p.leaders ?? []).map((l, i) => ({ side: l.side, name: l.name ?? `L${i}`, r: l.at[0], c: l.at[1] })),
    reserves: [],
    reserveLeaders: [],
    rules: p.rules ?? [],
  };
}

/** Build a state; optionally override blocks. Units get ids u1.. in order, leaders follow. */
export function state(p: Pos): GameState {
  const s = createGame(setupOf(p), 12345);
  (p.units ?? []).forEach((u, i) => {
    if (u.blocks !== undefined) s.units[i].blocks = u.blocks;
  });
  return s;
}

/** Put a specific card kind into the active player's hand (replacing the first card) and return its id. */
export function giveCard(s: GameState, side: Side, kind: CardKind): number {
  const id = CARD_LIST.findIndex((k, i) => k === kind && !s.players.top.hand.includes(i) && !s.players.bottom.hand.includes(i));
  const fromDeck = s.deck.indexOf(id);
  if (fromDeck >= 0) s.deck.splice(fromDeck, 1);
  s.players[side].hand[0] = id;
  return id;
}

/** Remove a card kind from a hand (e.g. make sure nobody holds First Strike). */
export function stripKind(s: GameState, side: Side, kind: CardKind) {
  const hand = s.players[side].hand;
  for (let i = 0; i < hand.length; i++) {
    if (CARD_LIST[hand[i]] === kind) {
      const repl = s.deck.findIndex((c) => CARD_LIST[c] !== kind && CARD_LIST[c] !== 'firstStrike');
      hand[i] = s.deck.splice(repl, 1)[0];
    }
  }
}

export function noFirstStrike(s: GameState) {
  stripKind(s, 'top', 'firstStrike');
  stripKind(s, 'bottom', 'firstStrike');
}

export function drive(s: GameState): GameDriver {
  return new GameDriver(s);
}

export function must(d: GameDriver, a: Answer) {
  const ok = d.answer(a);
  if (!ok) throw new Error(`answer rejected: ${d.lastError} (pending ${JSON.stringify(d.pending)})`);
}

export const H = (r: number, c: number) => hexId(r, c);
