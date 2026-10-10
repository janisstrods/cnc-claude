// Build a GameState from a scenario definition.
import { CARD_DEFS, CARD_LIST, defaultMods } from './cards';
import { HEX_DIRS, hexId, onBoard } from './hex';
import { shuffle } from './rng';
import { ELITES, type EliteDef } from './elites';
import { newObjectiveState, resolveObjectives } from './objectives';
import { LEADER_TRAITS } from './query';
import { TERRAIN_NAMES, isImpassable, terrainAt } from './terrain';
import { UNIT_STATS, forbidsTerrain } from './units';
import {
  ARMY_LOOKS, BLOCKS, COLS, LEGIONS, OFF_BOARD, ROWS, SPECIAL_RULE_IDS,
  type AmbushDef, type ArmyLook, type Blocks, type CommandDef, type EliteId, type GameState, type HexDir, type HexId, type Leader, type LeaderTrait,
  type Legion, type Side, type SpecialRuleId, type TerrainType, type TurnState, type Unit, type UnitType,
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
  /** `command`: id of the separate command the unit belongs to (needs `commands`, §18.5). */
  units: { side: Side; type: UnitType; r: number; c: number; elite?: EliteId; command?: string }[];
  /** `traits`: Expansion #1 leader traits (§17.2), e.g. Alexander's `ccBonus`. `command`: a leader of that command (§18.5). */
  leaders: { side: Side; name: string; r: number; c: number; traits?: LeaderTrait[]; command?: string }[];
  reserves: { side: Side; type: UnitType }[];
  reserveLeaders: { side: Side; name: string; traits?: LeaderTrait[] }[];
  /**
   * Leaders placed by the players before the first turn, in placement order (needs rule `leaderPlacement`; 117
   * Asculum, §17.4: the Roman leaders first). They start off the board and are listed in `special.unplaced`.
   */
  placeLeaders?: { side: Side; name: string; traits?: LeaderTrait[] }[];
  rules: SpecialRuleId[];
  /**
   * Ambush trigger data (needs the rule `magoAmbush`; fields left out take the Trebbia defaults, see `AmbushDef`). 206
   * Aquae Sextiae: the Leadership cards and Order Light Troops, `afterOwnTurns: 0`, its own text.
   */
  ambush?: Partial<AmbushDef>;
  /**
   * Legion rule per side (§18.2): every MI and HI of the side, on the board and in reserve, gets the pilum (`marius`) or the
   * pilum and the march (`julian`). Marius legions in 206-223 for the Romans; the Barbarians and Slaves have none.
   */
  legions?: Partial<Record<Side, Legion>>;
  /**
   * Separate commands (210 Picenum, §18.5): one card orders units of one command only. Each command belongs to one side;
   * units and leaders name theirs with `command`. A piece with no command goes with any. `blocks` recolours the
   * command's base edges (art only).
   */
  commands?: CommandDef[];
  /**
   * Rolling Fire (210 Picenum, §18.5): infantry of this side standing on a hill may roll burning logs down a path toward
   * the enemy edge instead of their normal battle. Left out: no Rolling Fire.
   */
  rollingFire?: Side;
  /** Castulo: name of the leader whose loss ends the game. */
  sacredLeader?: { side: Side; name: string };
  /** Starting Command for a side when different from `cards` (Trasimenus Romans start with 2). */
  initialCommand?: Partial<Record<Side, number>>;
  /** Battle objectives (§18.4): camp capture (011 Baecula, 114 Gabiene), exits (010 Castulo) and the like. */
  objectives?: ObjectiveSetup[];
  /**
   * Optional rules this scenario offers, with their default (Tactical Flexibility in 120, 121, 124, §17.3). A player's
   * choice is passed to `createGame` as `GameOptions`.
   */
  options?: GameOptions;
}

/**
 * A battle objective as scenario data (resolved into `ObjectiveDef`, see there). Hexes are `[r, c]`. Defaults:
 * `capture` — `hexes` every camp on the board (listed hexes must be camps or ramparts), `when: 'stop'`, `banners: [1]`,
 * `together: 0` (off; needs `when: 'turnStart'`), `remove: false`, `text` "The <army> army captures a <enemy army>
 * camp!"; `hold` — `max` the number of hexes, `text` "The <army> army holds an objective."; `majority` — `text`
 * "Control of the objective hexes."; `sectionClear` — `text` "The <army> army has cleared a section of the enemy.";
 * `exit` — `units: 'any'`, `leadersScore: false` (true is not supported yet: Expansion #3), `text` "<army> {unit} breaks
 * through and exits the battlefield!".
 */
export type ObjectiveSetup =
  | { kind: 'capture'; side: Side; hexes?: [number, number][]; when?: 'stop' | 'turnStart'; banners?: number[];
      together?: number; remove?: boolean; text?: string }
  | { kind: 'hold'; side: Side; hexes: [number, number][]; max?: number; text?: string }
  | { kind: 'majority'; sides: Side[]; hexes: [number, number][]; banners: number; when: 'turnEnd' | 'always'; text?: string }
  | { kind: 'sectionClear'; side: Side; text?: string }
  | { kind: 'exit'; side: Side; hexes: [number, number][]; units?: 'any' | 'foot' | 'cavalry'; leadersScore?: boolean; text?: string };

/** Optional rules chosen for a game. Only rules the scenario offers (`ScenarioSetup.options`) can be switched. */
export interface GameOptions {
  tacticalFlexibility?: boolean;
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

/**
 * Effective rule list: the scenario's rules with each optional rule it offers set by `options` (else its default).
 * An option the scenario does not offer is ignored, so a stored player choice never changes a battle without it.
 */
function effectiveRules(setup: ScenarioSetup, options: GameOptions | undefined): SpecialRuleId[] {
  const rules = [...setup.rules];
  const offered = setup.options?.tacticalFlexibility;
  if (offered === undefined) return rules;
  const on = options?.tacticalFlexibility ?? offered;
  const out: SpecialRuleId[] = rules.filter((r) => r !== 'tacticalFlexibility');
  if (on) out.push('tacticalFlexibility');
  return out;
}

const known = (list: readonly string[], v: unknown): boolean => typeof v === 'string' && list.includes(v);
const has = (table: object, k: unknown): boolean => typeof k === 'string' && Object.prototype.hasOwnProperty.call(table, k);

/** The unit types a legion rule gives the pilum to (§18.2). */
const LEGION_TYPES: readonly UnitType[] = ['MI', 'HI'];

/** `legions` names sides and legions of the types (`marius`, `julian`). */
function checkLegions(legions: unknown) {
  if (legions === undefined) return;
  if (typeof legions !== 'object' || legions === null || Array.isArray(legions)) throw new Error('legions must be an object of sides');
  for (const [side, legion] of Object.entries(legions)) {
    if (side !== 'top' && side !== 'bottom') throw new Error(`legions: unknown side ${side}`);
    if (!known(LEGIONS, legion)) throw new Error(`legions: unknown legion ${String(legion)} (${side})`);
  }
}

/**
 * The separate commands of a battle (§18.5), copied and validated: a list of `{ id, name, side, blocks? }` with unique
 * ids, a known side and block set; none when the scenario gives none.
 */
function resolveCommands(setup: ScenarioSetup): CommandDef[] {
  const list: unknown = setup.commands;
  if (list === undefined) return [];
  if (!Array.isArray(list)) throw new Error('commands must be a list');
  const out: CommandDef[] = [];
  for (const c of list as Partial<CommandDef>[]) {
    if (typeof c?.id !== 'string' || !c.id) throw new Error('command needs an id');
    if (out.some((x) => x.id === c.id)) throw new Error(`duplicate command ${c.id}`);
    if (c.side !== 'top' && c.side !== 'bottom') throw new Error(`command ${c.id}: unknown side ${String(c.side)}`);
    if (typeof c.name !== 'string') throw new Error(`command ${c.id}: name must be a string`);
    if (c.blocks !== undefined && !known(BLOCKS, c.blocks)) throw new Error(`command ${c.id}: unknown blocks ${String(c.blocks)}`);
    out.push({ id: c.id, name: c.name, side: c.side, ...(c.blocks !== undefined ? { blocks: c.blocks } : {}) });
  }
  return out;
}

/** The command id a piece of `side` names, checked against the battle's commands (`who` and `at` word the error). */
function checkedCommand(commands: CommandDef[], side: Side, id: string, who: string, at = ''): string {
  const def = commands.find((c) => c.id === id);
  if (!def) throw new Error(`${who} is not a command of the battle${at}`);
  if (def.side !== side) throw new Error(`${who} belongs to the ${def.side} army, not ${side}${at}`);
  return id;
}

/** The unit with its side's legion stamped, if it is a type the legion rule covers. */
function withLegion(unit: Unit, legions: ScenarioSetup['legions']): Unit {
  const legion = legions?.[unit.side];
  if (legion && LEGION_TYPES.includes(unit.type)) unit.legion = legion;
  return unit;
}

/**
 * Ids and values of the scenario data that the types promise but JSON cannot (spec "Error handling"): block sets, looks,
 * special rules, terrain types, ford values and unit types (on the board and in reserve).
 */
function checkIds(setup: ScenarioSetup) {
  for (const side of ['top', 'bottom'] as const) {
    const ss = setup[side];
    if (!known(BLOCKS, ss.blocks)) throw new Error(`${side} army: unknown blocks ${String(ss.blocks)}`);
    if (!known(ARMY_LOOKS, ss.look)) throw new Error(`${side} army: unknown look ${String(ss.look)}`);
  }
  for (const r of setup.rules) if (!known(SPECIAL_RULE_IDS, r)) throw new Error(`unknown special rule ${String(r)}`);
  checkLegions(setup.legions);
  const rf: unknown = setup.rollingFire;
  if (rf !== undefined && rf !== 'top' && rf !== 'bottom') throw new Error(`rollingFire: unknown side ${String(rf)}`);
  for (const t of setup.terrain) {
    // 'void' marks the hexes off the board: it is not scenario terrain
    if (!has(TERRAIN_NAMES, t.t) || t.t === 'void') throw new Error(`unknown terrain ${String(t.t)} at ${t.r},${t.c}`);
    if (t.ford !== undefined && t.ford !== true && t.ford !== false && t.ford !== 'nocap') {
      throw new Error(`ford at ${t.r},${t.c} must be true, false or 'nocap' (not ${String(t.ford)})`);
    }
  }
  for (const u of setup.units) if (!has(UNIT_STATS, u.type)) throw new Error(`unknown unit type ${String(u.type)} at ${u.r},${u.c}`);
  for (const u of setup.reserves) if (!has(UNIT_STATS, u.type)) throw new Error(`unknown unit type ${String(u.type)} in reserve`);
}

/**
 * Where the pieces stand (on the built board): one unit and one leader per hex at most, no leader on an enemy unit, and
 * no unit or leader on impassable terrain or a unit on terrain its type may not enter.
 */
function checkPositions(setup: ScenarioSetup, s: GameState) {
  const unitSide = new Map<HexId, Side>();
  for (const u of setup.units) {
    const h = hexId(u.r, u.c);
    if (unitSide.has(h)) throw new Error(`two units on ${u.r},${u.c}`);
    unitSide.set(h, u.side);
    const t = terrainAt(s, h);
    if (isImpassable(s, h)) throw new Error(`${u.type} unit on impassable ${t} at ${u.r},${u.c}`);
    if (forbidsTerrain(u.type, t)) throw new Error(`${u.type} unit on ${t} at ${u.r},${u.c}, which it may not enter`);
  }
  const leaderAt = new Set<HexId>();
  for (const l of setup.leaders) {
    const h = hexId(l.r, l.c);
    if (leaderAt.has(h)) throw new Error(`two leaders on ${l.r},${l.c} (${l.name})`);
    leaderAt.add(h);
    const under = unitSide.get(h);
    if (under !== undefined && under !== l.side) throw new Error(`leader ${l.name} on an enemy unit at ${l.r},${l.c}`);
    if (isImpassable(s, h)) throw new Error(`leader ${l.name} on impassable ${terrainAt(s, h)} at ${l.r},${l.c}`);
  }
}

/** Leaders each side starts with: on the board, in reserve and still to be placed. */
function leaderCount(setup: ScenarioSetup): Record<Side, number> {
  const n = { top: 0, bottom: 0 };
  for (const l of [...setup.leaders, ...setup.reserveLeaders, ...(setup.placeLeaders ?? [])]) n[l.side]++;
  return n;
}

/** Validate the pre-battle placement list against the `leaderPlacement` rule (the two come together). */
function checkPlacement(setup: ScenarioSetup, rules: SpecialRuleId[]) {
  const list = setup.placeLeaders ?? [];
  const ruled = rules.includes('leaderPlacement');
  if (ruled && !list.length) throw new Error(`rule leaderPlacement needs scenario data placeLeaders (${setup.id})`);
  if (!ruled && list.length) throw new Error(`placeLeaders data needs the leaderPlacement rule (${setup.id})`);
  for (const l of list) {
    if (l.side !== 'top' && l.side !== 'bottom') throw new Error(`placeLeaders: unknown side ${String(l.side)} (${setup.id})`);
  }
}

/** Trebbia's ambush: a Leadership card after the side's first turn (§14). */
const DEFAULT_AMBUSH: AmbushDef = {
  trigger: ['inspiredL', 'inspiredC', 'inspiredR', 'leadershipAny'],
  afterOwnTurns: 1,
  text: "Ambush! Mago's hidden force strikes from the {section}.",
};

/** The ambush data of a battle: null without the rule `magoAmbush`, else the scenario's data over the Trebbia defaults. */
function resolveAmbush(setup: ScenarioSetup, rules: SpecialRuleId[]): AmbushDef | null {
  const a: unknown = setup.ambush;
  if (!rules.includes('magoAmbush')) {
    if (a !== undefined) throw new Error('ambush data needs the magoAmbush rule');
    return null;
  }
  if (a !== undefined && (typeof a !== 'object' || a === null || Array.isArray(a))) throw new Error('ambush must be an object');
  const d: Partial<AmbushDef> = (a ?? {}) as Partial<AmbushDef>;
  if (d.trigger !== undefined) {
    if (!Array.isArray(d.trigger)) throw new Error('ambush trigger must be a list of cards');
    if (!d.trigger.length) throw new Error('ambush trigger: needs at least one card');
    for (const k of d.trigger) if (!has(CARD_DEFS, k)) throw new Error(`ambush trigger: unknown card ${String(k)}`);
  }
  if (d.afterOwnTurns !== undefined && !(Number.isInteger(d.afterOwnTurns) && d.afterOwnTurns >= 0)) {
    throw new Error('ambush afterOwnTurns must be a whole number, 0 or more');
  }
  if (d.text !== undefined && typeof d.text !== 'string') throw new Error('ambush text must be a string');
  return {
    trigger: [...(d.trigger ?? DEFAULT_AMBUSH.trigger)],
    afterOwnTurns: d.afterOwnTurns ?? DEFAULT_AMBUSH.afterOwnTurns,
    text: d.text ?? DEFAULT_AMBUSH.text,
  };
}

/**
 * Build the initial state. `options`: the player's choice of the optional rules the scenario offers (§17.3). Invalid
 * scenario data throws, and the error names the scenario (`(<id>)` at the end of the message).
 */
export function createGame(setup: ScenarioSetup, seed: number, options?: GameOptions): GameState {
  try {
    return buildGame(setup, seed, options);
  } catch (e) {
    // name the scenario without rewriting the original error (it stays as `cause`); a message that already ends with it is kept
    if (e instanceof Error && !e.message.endsWith(`(${setup.id})`)) throw new Error(`${e.message} (${setup.id})`, { cause: e });
    throw e;
  }
}

function buildGame(setup: ScenarioSetup, seed: number, options: GameOptions | undefined): GameState {
  checkIds(setup);
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
    if (t.ford && t.t !== 'river') throw new Error(`a ford must be a river hex (${t.t} at ${t.r},${t.c}, ford ${String(t.ford)})`);
    const h = hexId(t.r, t.c);
    terrain[h] = t.t;
    fords[h] = !!t.ford;
    noCap[h] = t.ford === 'nocap';
    rampart[h] = rampartMask(t);
  }
  const commands = resolveCommands(setup);
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
    if (u.command !== undefined) unit.command = checkedCommand(commands, u.side, u.command, `unit command ${String(u.command)}`, ` (${u.r},${u.c})`);
    return withLegion(unit, setup.legions);
  });
  const leaders: Leader[] = setup.leaders.map((l) => {
    if (!onBoard(l.r, l.c)) throw new Error(`leader ${l.name} off board ${l.r},${l.c}`);
    const leader = withTraits({ id: `L${nextId++}`, side: l.side, name: l.name, hex: hexId(l.r, l.c) }, l.traits);
    if (l.command !== undefined) leader.command = checkedCommand(commands, l.side, l.command, `leader ${l.name}: command ${String(l.command)}`);
    return leader;
  });
  // Asculum: leaders still to be placed wait off the board (placement order = id order)
  const rules = effectiveRules(setup, options);
  checkPlacement(setup, rules);
  const ambush = resolveAmbush(setup, rules);
  const unplaced: string[] = [];
  for (const l of setup.placeLeaders ?? []) {
    const leader = withTraits({ id: `L${nextId++}`, side: l.side, name: l.name, hex: OFF_BOARD }, l.traits);
    leaders.push(leader);
    unplaced.push(leader.id);
  }
  const reserveUnits: Unit[] = setup.reserves.map((u) => {
    const st = UNIT_STATS[u.type];
    return withLegion({ id: `u${nextId++}`, side: u.side, type: u.type, hex: OFF_BOARD, blocks: st.blocks, maxBlocks: st.blocks }, setup.legions);
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
      rules,
      commands,
      rollingFire: setup.rollingFire ?? null,
      ambush,
      reserveUnits,
      reserveLeaders,
      reserveSide: reserveUnits[0]?.side ?? reserveLeaders[0]?.side ?? null,
      reserveReleased: false,
      turnsDone: { top: 0, bottom: 0 },
      objectives: [],
      objState: [],
      sacredLeaderId: sacred,
      beneventumBonusGiven: false,
      leadersAtStart: leaderCount(setup),
      unplaced,
      leadersEliminated: { top: 0, bottom: 0 },
      cardDebt: { top: 0, bottom: 0 },
    },
    nextId,
  };
  checkPositions(setup, s);
  s.special.objectives = resolveObjectives(setup, terrain, s.players);
  s.special.objState = s.special.objectives.map(newObjectiveState);
  for (const side of [setup.first, setup.first === 'top' ? 'bottom' : 'top'] as Side[]) {
    const p = s.players[side];
    for (let i = 0; i < p.command; i++) p.hand.push(s.deck.pop()!);
  }
  return s;
}

/**
 * Fast deep copy of a game state (plain data). The board arrays (terrain, fords, noCap, rampart) and the objective
 * definitions are shared: they never change in place (`setTerrain` replaces the arrays).
 */
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
      commands: s.special.commands,
      ambush: s.special.ambush,
      reserveUnits: s.special.reserveUnits.map((u) => ({ ...u })),
      reserveLeaders: s.special.reserveLeaders.map((l) => ({ ...l })),
      turnsDone: { ...s.special.turnsDone },
      objectives: s.special.objectives,
      objState: s.special.objState.map((o) => ({ taken: [...o.taken], held: { ...o.held }, sections: [...o.sections] })),
      leadersAtStart: { ...s.special.leadersAtStart },
      unplaced: [...s.special.unplaced],
      leadersEliminated: { ...s.special.leadersEliminated },
      cardDebt: { ...s.special.cardDebt },
    },
  };
}
