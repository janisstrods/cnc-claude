// Build a GameState from a scenario definition.
import { CARD_LIST, defaultMods } from './cards';
import { HEX_DIRS, hexId, onBoard } from './hex';
import { shuffle } from './rng';
import { ELITES, type EliteDef } from './elites';
import { LEADER_TRAITS } from './query';
import { UNIT_STATS } from './units';
import {
  COLS, OFF_BOARD, ROWS,
  type ArmyLook, type Blocks, type EliteId, type GameState, type HexDir, type Leader, type LeaderTrait, type Side, type SpecialRuleId,
  type TerrainType, type TurnState, type Unit, type UnitType,
} from './types';

export interface SideSetup {
  army: string;
  blocks: Blocks;
  look: ArmyLook;
  commander: string;
  cards: number;
}

export interface ScenarioSetup {
  id: string;
  name: string;
  top: SideSetup;
  bottom: SideSetup;
  first: Side;
  banners: number;
  terrain: TerrainSetup[];
  units: { side: Side; type: UnitType; r: number; c: number; elite?: EliteId }[];
  /** `traits`: Expansion #1 leader traits (§17.2), e.g. Alexander's `ccBonus`. */
  leaders: { side: Side; name: string; r: number; c: number; traits?: LeaderTrait[] }[];
  reserves: { side: Side; type: UnitType }[];
  reserveLeaders: { side: Side; name: string; traits?: LeaderTrait[] }[];
  rules: SpecialRuleId[];
  /** Castulo: name of the leader whose loss ends the game. */
  sacredLeader?: { side: Side; name: string };
  /** Starting Command for a side when different from `cards` (Trasimenus Romans start with 2). */
  initialCommand?: Partial<Record<Side, number>>;
}

/**
 * One terrain hex of a scenario. `ford`: a fordable river hex (`'nocap'` = fordable without the ford dice caps, 108
 * Pinarus). A `rampart` hex lists its protected hexsides (§16): `faces: 'top'` = NW + NE, `faces: 'bottom'` = SW + SE,
 * and/or `edges` by direction (a corner piece lists 3).
 */
export interface TerrainSetup {
  r: number;
  c: number;
  t: TerrainType;
  ford?: boolean | 'nocap';
  faces?: Side;
  edges?: HexDir[];
}

const FACES: Record<Side, HexDir[]> = { top: ['NW', 'NE'], bottom: ['SW', 'SE'] };

/** Protected-edge mask of a terrain entry (bit i = direction i of HEX_DIRS; 0 unless a rampart), validated. */
export function rampartMask(t: TerrainSetup): number {
  const where = `${t.r},${t.c}`;
  const hasEdges = t.faces !== undefined || t.edges !== undefined;
  if (t.t !== 'rampart') {
    if (hasEdges) throw new Error(`faces/edges are only for rampart hexes (${t.t} at ${where})`);
    return 0;
  }
  if (!hasEdges) throw new Error(`rampart at ${where} needs faces or edges`);
  if (t.faces !== undefined && !FACES[t.faces]) throw new Error(`rampart at ${where}: unknown faces ${String(t.faces)}`);
  const dirs = [...(t.faces !== undefined ? FACES[t.faces] : []), ...(t.edges ?? [])];
  let mask = 0;
  for (const d of dirs) {
    const i = HEX_DIRS.indexOf(d);
    if (i < 0) throw new Error(`rampart at ${where}: unknown edge ${String(d)}`);
    mask |= 1 << i;
  }
  if (!mask) throw new Error(`rampart at ${where} needs at least one protected edge`);
  return mask;
}

export function newTurn(side: Side, number: number): TurnState {
  return {
    number, side, card: null, effective: null, mirrored: false, phase: 'card', ordered: {},
    mods: defaultMods(), firstStrikeBy: null, reshuffleAfter: false, ambushSection: null,
  };
}

/** Give a scenario leader its traits (validated); a leader without traits gets no `traits` field. */
function withTraits(l: Leader, traits: LeaderTrait[] | undefined): Leader {
  if (!traits?.length) return l;
  for (const t of traits) if (!LEADER_TRAITS.includes(t)) throw new Error(`unknown leader trait ${t} (${l.name})`);
  return { ...l, traits: [...traits] };
}

export function createGame(setup: ScenarioSetup, seed: number): GameState {
  const terrain: TerrainType[] = [];
  const fords: boolean[] = [];
  const noCap: boolean[] = [];
  const rampart: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      terrain.push(onBoard(r, c) ? 'plain' : 'void');
      fords.push(false);
      noCap.push(false);
      rampart.push(0);
    }
  }
  for (const t of setup.terrain) {
    if (!onBoard(t.r, t.c)) throw new Error(`terrain off board ${t.r},${t.c}`);
    if (t.ford === 'nocap' && t.t !== 'river') throw new Error(`a no-cap ford must be a river hex (${t.t} at ${t.r},${t.c})`);
    const h = hexId(t.r, t.c);
    terrain[h] = t.t;
    fords[h] = !!t.ford;
    noCap[h] = t.ford === 'nocap';
    rampart[h] = rampartMask(t);
  }
  let nextId = 1;
  const units: Unit[] = setup.units.map((u) => {
    if (!onBoard(u.r, u.c)) throw new Error(`unit off board ${u.r},${u.c}`);
    const st = UNIT_STATS[u.type];
    const unit: Unit = { id: `u${nextId++}`, side: u.side, type: u.type, hex: hexId(u.r, u.c), blocks: st.blocks, maxBlocks: st.blocks };
    if (u.elite) {
      const def: EliteDef | undefined = ELITES[u.elite]; // guards untyped scenario data
      if (!def) throw new Error(`unknown elite preset ${u.elite}`);
      if (!def.types.includes(u.type)) {
        throw new Error(`elite ${def.name} (${def.id}) cannot be a ${u.type} unit (allowed: ${def.types.join(', ')})`);
      }
      unit.elite = u.elite;
    }
    return unit;
  });
  const leaders: Leader[] = setup.leaders.map((l) => withTraits({ id: `L${nextId++}`, side: l.side, name: l.name, hex: hexId(l.r, l.c) }, l.traits));
  const reserveUnits: Unit[] = setup.reserves.map((u) => {
    const st = UNIT_STATS[u.type];
    return { id: `u${nextId++}`, side: u.side, type: u.type, hex: OFF_BOARD, blocks: st.blocks, maxBlocks: st.blocks };
  });
  const reserveLeaders: Leader[] = setup.reserveLeaders.map((l) => withTraits({ id: `L${nextId++}`, side: l.side, name: l.name, hex: OFF_BOARD }, l.traits));

  const rngHolder = { rng: seed >>> 0, rngCalls: 0 };
  const deck = shuffle(rngHolder, CARD_LIST.map((_, i) => i));

  const sacred = setup.sacredLeader
    ? leaders.find((l) => l.side === setup.sacredLeader!.side && l.name === setup.sacredLeader!.name)?.id ?? null
    : null;

  const s: GameState = {
    scenarioId: setup.id,
    terrain,
    fords,
    noCap,
    rampart,
    units,
    leaders,
    players: {
      top: {
        side: 'top', army: setup.top.army, blocks: setup.top.blocks, look: setup.top.look, commander: setup.top.commander,
        hand: [], command: setup.initialCommand?.top ?? setup.top.cards, banners: 0,
      },
      bottom: {
        side: 'bottom', army: setup.bottom.army, blocks: setup.bottom.blocks, look: setup.bottom.look, commander: setup.bottom.commander,
        hand: [], command: setup.initialCommand?.bottom ?? setup.bottom.cards, banners: 0,
      },
    },
    deck,
    discard: [],
    first: setup.first,
    active: setup.first,
    turn: newTurn(setup.first, 1),
    lastCard: { top: null, bottom: null },
    bannersToWin: setup.banners,
    rng: rngHolder.rng,
    rngCalls: rngHolder.rngCalls,
    winner: null,
    winReason: '',
    special: {
      rules: [...setup.rules],
      reserveUnits,
      reserveLeaders,
      reserveSide: reserveUnits[0]?.side ?? reserveLeaders[0]?.side ?? null,
      reserveReleased: false,
      turnsDone: { top: 0, bottom: 0 },
      campsCaptured: [],
      sacredLeaderId: sacred,
      beneventumBonusGiven: false,
    },
    nextId,
  };
  for (const side of [setup.first, setup.first === 'top' ? 'bottom' : 'top'] as Side[]) {
    const p = s.players[side];
    for (let i = 0; i < p.command; i++) p.hand.push(s.deck.pop()!);
  }
  return s;
}

/** Fast deep copy of a game state (plain data). */
export function cloneState(s: GameState): GameState {
  const ordered: TurnState['ordered'] = {};
  for (const k in s.turn.ordered) ordered[k] = { ...s.turn.ordered[k] };
  return {
    ...s,
    terrain: s.terrain,
    fords: s.fords,
    noCap: s.noCap,
    rampart: s.rampart,
    units: s.units.map((u) => ({ ...u })),
    leaders: s.leaders.map((l) => ({ ...l })),
    players: {
      top: { ...s.players.top, hand: [...s.players.top.hand] },
      bottom: { ...s.players.bottom, hand: [...s.players.bottom.hand] },
    },
    deck: [...s.deck],
    discard: [...s.discard],
    turn: { ...s.turn, ordered, mods: { ...s.turn.mods } },
    lastCard: { ...s.lastCard },
    special: {
      ...s.special,
      rules: s.special.rules,
      reserveUnits: s.special.reserveUnits.map((u) => ({ ...u })),
      reserveLeaders: s.special.reserveLeaders.map((l) => ({ ...l })),
      turnsDone: { ...s.special.turnsDone },
      campsCaptured: [...s.special.campsCaptured],
    },
  };
}
