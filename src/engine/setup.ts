// Build a GameState from a scenario definition.
import { CARD_DEFS, CARD_LIST, defaultMods } from './cards';
import { HEX_DIRS, hexId, hexLabel, onBoard } from './hex';
import { shuffle } from './rng';
import { ELITES, type EliteDef } from './elites';
import { newObjectiveState, resolveObjectives } from './objectives';
import { LEADER_TRAITS } from './query';
import { TERRAIN_STATS, isImpassable, isWall, terrainAt } from './terrain';
import { UNIT_STATS, forbidsTerrain } from './units';
import {
  ARMY_LOOKS, BLOCKS, COLS, LEGIONS, OFF_BOARD, ROWS, SIDES, SPECIAL_RULE_IDS,
  type AmbushDef, type ArmyLook, type Blocks, type CommandBonus, type CommandDef, type EliteId, type GameState, type HandGrowth, type HexDir, type HexId, type Leader, type LeaderTrait,
  type Legion, type ObjectiveMarker, type PlaceUnitDef, type Side, type SpecialRuleId, type TerrainType, type TurnState, type Unit, type UnitType,
} from './types';

export interface SideSetup {
  army: string;
  blocks: Blocks;
  look: ArmyLook;
  commander: string;
  /** Cards in the starting hand, and so the Command: 1 or more, or 0 for a side with dice orders. */
  cards: number;
  /**
   * `'dice'`: the side orders by rolling `orderDice` dice at the start of each turn instead of playing a card (310 Utica P1,
   * §18.10); it needs `cards: 0`. Left out: the side plays cards.
   */
  orders?: 'dice';
  /** Order dice of a side with `orders: 'dice'` (a whole number, 1 or more); only with it. */
  orderDice?: number;
}

export interface ScenarioSetup {
  id: string;
  name: string;
  top: SideSetup;
  bottom: SideSetup;
  first: Side;
  banners: number;
  terrain: TerrainSetup[];
  /**
   * `command`: id of the separate command the unit belongs to (needs `commands`, §18.5). `immobile: true`: the unit never
   * moves or momentum advances (306 Bibracte, §18.11).
   */
  units: { side: Side; type: UnitType; r: number; c: number; elite?: EliteId; command?: string; immobile?: boolean }[];
  /** `traits`: Expansion #1 leader traits (§17.2), e.g. Alexander's `ccBonus`. `command`: a leader of that command (§18.5). */
  leaders: { side: Side; name: string; r: number; c: number; traits?: LeaderTrait[]; command?: string }[];
  reserves: { side: Side; type: UnitType }[];
  reserveLeaders: { side: Side; name: string; traits?: LeaderTrait[] }[];
  /**
   * Leaders placed by the players before the first turn, in placement order (117 Asculum, §17.4: the Roman leaders first).
   * They start off the board and are listed in `special.unplaced`. Left out or empty: no placement.
   */
  placeLeaders?: { side: Side; name: string; traits?: LeaderTrait[] }[];
  rules: SpecialRuleId[];
  /**
   * The ambush reserve (§14, §18.5): given, the reserves wait off the board for it; fields left out take the Trebbia
   * defaults (`{}` in 005, see `AmbushDef`). 206 Aquae Sextiae: the Leadership cards and Order Light Troops,
   * `afterOwnTurns: 0`, its own text. 308 Gergovia (§18.9): fixed `entryHexes`, `noMove`, `attachLeader`. Left out: no
   * ambush.
   */
  ambush?: AmbushSetup;
  /**
   * Forced placements (308, §18.9): each unit waits off the board (it is not one of `reserves`) and is placed on an empty
   * hex of `hexes` at the start of its side's first turn after a unit of the ambush force entered (`after: 'ambush'`;
   * needs `ambush`). Its id follows the reserve leaders'.
   */
  placeUnits?: PlaceUnitSetup[];
  /**
   * Legion rule per side (§18.2): every MI and HI of the side, on the board and in reserve, gets the pilum (`marius`) or the
   * pilum and the march (`julian`). Marius legions in 206-223 for the Romans; the Barbarians and Slaves have none.
   */
  legions?: Partial<Record<Side, Legion>>;
  /**
   * Separate commands (210 Picenum, 304 Valentia, §18.5): one card orders units of one command only. Each command belongs
   * to one side; units and leaders name theirs with `command`. A piece with no command goes with any. `blocks` recolours
   * the command's base edges (art only). With the rule `commandFallback` (304) a card's "1 unit of your choice" alternative
   * is judged per command.
   */
  commands?: CommandDef[];
  /**
   * Rolling Fire (210 Picenum, §18.5): infantry of this side standing on a hill may roll burning logs down a path toward
   * the enemy edge instead of their normal battle. Left out: no Rolling Fire.
   */
  rollingFire?: Side;
  /**
   * Rampart breakers (223 Medway, §18.6): units of this side remove (make open ground) every rampart hex they enter or pass
   * through, by moving, advancing, retreating or evading. Left out: no breakers.
   */
  rampartBreakers?: Side;
  /**
   * Last-row retreat (214 Silarus, §18.5): a unit of this side whose retreat ends on its own baseline row with retreat hexes
   * it could not take is eliminated instead of losing blocks. Left out: the ordinary retreat rule.
   */
  lastRowRetreat?: Side;
  /** The leader whose loss loses the battle at once (010 Castulo's Publius Scipio): a leader of `side` named `name`. */
  sacredLeader?: { side: Side; name: string };
  /**
   * Starting Command (and hand) of a side when different from `cards` (006 Trasimenus: the Romans start with 2 of their 4,
   * 313: 2 of 5; hand growth brings them up, §18.8). A whole number from 1; never for a side with dice orders.
   */
  initialCommand?: Partial<Record<Side, number>>;
  /**
   * Hand growth (006 Trasimenus, 313 Brindisi Raid; rules-reference §18.8): at the end of each of `side`'s turns, while its
   * Command is below `to`, it draws 2 cards instead of 1 and its Command rises by 1. Left out: no hand growth.
   */
  handGrowth?: HandGrowth;
  /**
   * A one-off Command bonus at a banner count (009 2nd Beneventum, §14: the Romans hold 6 cards from their 3rd banner and
   * draw 2 at once; see `CommandBonus`). Left out: none.
   */
  commandBonus?: CommandBonus;
  /**
   * Fright at First Sight (116 Heraclea, §17.4): infantry of this side (the Romans) may ignore no flag an elephant rolls
   * against it in close combat. Left out: no such rule.
   */
  frightAtFirstSight?: Side;
  /**
   * Roman Tactical Flexibility (§17.3): the Roman side, whose MI and HI attacks an unsupported HI of the other side not on
   * broken ground battles back with 3 dice. Offered as an option (`options.tacticalFlexibility`, 120, 121, 124) the player
   * switches it; otherwise it is always on. Left out: no such rule.
   */
  tacticalFlexibility?: Side;
  /** Battle objectives (§18.4): camp capture (011 Baecula, 114 Gabiene), exits (010 Castulo) and the like. */
  objectives?: ObjectiveSetup[];
  /**
   * Optional rules this scenario offers, with their default (Tactical Flexibility in 120, 121, 124, §17.3; it needs the
   * `tacticalFlexibility` side). A player's choice is passed to `createGame` as `GameOptions`.
   */
  options?: GameOptions;
}

/**
 * A battle objective as scenario data (resolved into `ObjectiveDef`, see there). Hexes are `[r, c]`. Defaults:
 * `capture` — `hexes` every camp on the board (listed hexes must be camps or ramparts), `when: 'stop'`, `banners: [1]`,
 * `together: 0` (off; needs `when: 'turnStart'`), `remove: false`, `text` "The <army> army captures a <enemy army>
 * camp!"; `hold` — `max` the number of hexes, `text` "The <army> army holds an objective."; `majority` — `text`
 * "Control of the objective hexes."; `sectionClear` — `text` "The <army> army has cleared a section of the enemy.";
 * `exit` — `units: 'any'`, `leadersScore: false`, `text` "<army> {unit} breaks through and exits the battlefield!".
 * `capture` with `marker: 'ship'` (313): `hexes` are required and may be any passable terrain, `remove` must stay false and
 * the default `text` is "The <army> army seizes a ship.".
 */
export type ObjectiveSetup =
  | { kind: 'capture'; side: Side; hexes?: [number, number][]; when?: 'stop' | 'turnStart'; banners?: number[];
      together?: number; remove?: boolean; marker?: ObjectiveMarker; text?: string }
  | { kind: 'hold'; side: Side; hexes: [number, number][]; max?: number; text?: string }
  | { kind: 'majority'; sides: Side[]; hexes: [number, number][]; banners: number; when: 'turnEnd' | 'always'; text?: string }
  | { kind: 'sectionClear'; side: Side; text?: string }
  | { kind: 'exit'; side: Side; hexes: [number, number][]; units?: 'any' | 'foot' | 'cavalry'; leadersScore?: boolean; text?: string };

/** Ambush data as the scenario gives it (`AmbushDef`, every field optional; the entry hexes as `[r, c]`). */
export type AmbushSetup = Partial<Omit<AmbushDef, 'entryHexes'>> & { entryHexes?: [number, number][] };

/** A forced placement as scenario data (`PlaceUnitDef`; hexes as `[r, c]`). */
export interface PlaceUnitSetup {
  side: Side;
  type: UnitType;
  hexes: [number, number][];
  after: 'ambush';
}

/** Optional rules chosen for a game. Only rules the scenario offers (`ScenarioSetup.options`) can be switched. */
export interface GameOptions {
  tacticalFlexibility?: boolean;
}

/**
 * One terrain hex of a scenario. `ford`: a fordable river hex (`'nocap'` = fordable without the ford dice caps, 108
 * Pinarus). `{ t: 'sea', ford: true }` is a coast played as a fordable river (217, §18.6): it is built as a `river` with a
 * ford, and only the art is sea. A `rampart` hex lists its protected hexsides (§16): `faces: 'top'` = NW + NE, `faces:
 * 'bottom'` = SW + SE, and/or `edges` by direction (a corner piece lists 3). `hill: true`: a hill lies under the hex
 * (`GameState.hillUnder`, 308, §18.7), only on a `camp` or `wall` hex. `art`: a hint for the drawing of the hex (the sea of a
 * coast ford, the impassable walls and towns of 301, 303 and 304); the engine checks it is text and otherwise ignores it.
 */
export interface TerrainSetup {
  r: number;
  c: number;
  t: TerrainType;
  ford?: boolean | 'nocap';
  faces?: Side;
  edges?: HexDir[];
  hill?: boolean;
  art?: string;
}

/** Terrain that may have a hill under it (`TerrainSetup.hill`, §18.7). */
const HILL_UNDER_TERRAIN: readonly TerrainType[] = ['camp', 'wall'];

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

export function newTurn(number: number): TurnState {
  return {
    number, card: null, effective: null, phase: 'card', ordered: {},
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
 * The Roman side of Tactical Flexibility (§17.3), or null: when the scenario offers it as an option, `options` switches it
 * (else the scenario's default). An option the scenario does not offer is ignored, so a stored player choice never changes
 * a battle without it.
 */
function resolveTacticalFlexibility(setup: ScenarioSetup, options: GameOptions | undefined): Side | null {
  const side = setup.tacticalFlexibility ?? null;
  const offered = setup.options?.tacticalFlexibility;
  if (offered === undefined) return side;
  if (side === null) throw new Error('options.tacticalFlexibility needs the tacticalFlexibility side');
  return (options?.tacticalFlexibility ?? offered) ? side : null;
}

const known = (list: readonly string[], v: unknown): boolean => typeof v === 'string' && list.includes(v);
const has = (table: object, k: unknown): boolean => typeof k === 'string' && Object.prototype.hasOwnProperty.call(table, k);

/** The unit types a legion rule gives the pilum to (§18.2). */
const LEGION_TYPES: readonly UnitType[] = ['MI', 'HI'];

/** `initialCommand` names sides, each with a whole number from 1 (a side with dice orders has none: `orderDiceOf`). */
function checkInitialCommand(ic: unknown) {
  if (ic === undefined) return;
  if (typeof ic !== 'object' || ic === null || Array.isArray(ic)) throw new Error('initialCommand must be an object of sides');
  for (const [side, n] of Object.entries(ic)) {
    if (side !== 'top' && side !== 'bottom') throw new Error(`initialCommand: unknown side ${side}`);
    if (!Number.isInteger(n) || (n as number) < 1) throw new Error(`initialCommand: ${side} must be a whole number, 1 or more`);
  }
}

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

/**
 * The limits of the rule `commandFallback` (304, §18.5), for each side that has commands: at most 2 of them (with more, the
 * Darken the Sky orders step, which judges a selection by its own command's mode, could accept a unit of any command that
 * falls back), and every unit and leader of the side names one (a piece with none would be judged by any command's mode).
 * Pieces that wait off the board (reserves, leaders to place, forced placements) cannot name a command, so such a side
 * has none.
 */
function checkCommandFallback(setup: ScenarioSetup, commands: CommandDef[]) {
  const need = (side: Side, who: string) => new Error(`rule commandFallback needs every ${side} unit and leader to name a command (${who} names none)`);
  for (const side of SIDES) {
    const n = commands.filter((c) => c.side === side).length;
    if (!n) continue;
    if (n > 2) throw new Error(`rule commandFallback allows at most 2 commands per army (${side} has ${n})`);
    for (const u of setup.units) if (u.side === side && u.command === undefined) throw need(side, `unit ${u.type} at ${u.r},${u.c}`);
    for (const l of setup.leaders) if (l.side === side && l.command === undefined) throw need(side, `leader ${l.name}`);
    for (const u of setup.reserves) if (u.side === side) throw need(side, `reserve unit ${u.type}`);
    for (const l of setup.reserveLeaders) if (l.side === side) throw need(side, `reserve leader ${l.name}`);
    for (const l of setup.placeLeaders ?? []) if (l.side === side) throw need(side, `leader to place ${l.name}`);
    for (const p of setup.placeUnits ?? []) if (p.side === side) throw need(side, `forced placement ${p.type}`);
  }
}

/** The unit with its side's legion stamped, if it is a type the legion rule covers. */
function withLegion(unit: Unit, legions: ScenarioSetup['legions']): Unit {
  const legion = legions?.[unit.side];
  if (legion && LEGION_TYPES.includes(unit.type)) unit.legion = legion;
  return unit;
}

/**
 * Ids and values of the scenario data that the types promise but JSON cannot (spec "Error handling"): block sets, looks,
 * order dice, starting Commands, special rules, terrain types, ford values and unit types (on the board and in reserve).
 */
function checkIds(setup: ScenarioSetup) {
  for (const side of SIDES) {
    const ss = setup[side];
    if (!known(BLOCKS, ss.blocks)) throw new Error(`${side} army: unknown blocks ${String(ss.blocks)}`);
    if (!known(ARMY_LOOKS, ss.look)) throw new Error(`${side} army: unknown look ${String(ss.look)}`);
  }
  orderDiceOf(setup);
  checkInitialCommand(setup.initialCommand);
  for (const r of setup.rules) if (!known(SPECIAL_RULE_IDS, r)) throw new Error(`unknown special rule ${String(r)}`);
  checkLegions(setup.legions);
  for (const [name, side] of [
    ['rollingFire', setup.rollingFire], ['rampartBreakers', setup.rampartBreakers], ['lastRowRetreat', setup.lastRowRetreat],
    ['frightAtFirstSight', setup.frightAtFirstSight], ['tacticalFlexibility', setup.tacticalFlexibility],
  ] as [string, unknown][]) {
    if (side !== undefined && side !== 'top' && side !== 'bottom') throw new Error(`${name}: unknown side ${String(side)}`);
  }
  for (const t of setup.terrain) {
    // 'void' marks the hexes off the board: it is not scenario terrain
    if (!has(TERRAIN_STATS, t.t) || t.t === 'void') throw new Error(`unknown terrain ${String(t.t)} at ${t.r},${t.c}`);
    if (t.ford !== undefined && t.ford !== true && t.ford !== false && t.ford !== 'nocap') {
      throw new Error(`ford at ${t.r},${t.c} must be true, false or 'nocap' (not ${String(t.ford)})`);
    }
    if (t.t === 'sea' && t.ford === 'nocap') throw new Error(`a sea ford at ${t.r},${t.c} cannot be 'nocap' (it is an ordinary ford)`);
    if (t.art !== undefined && typeof t.art !== 'string') throw new Error(`terrain art at ${t.r},${t.c} must be text (not ${String(t.art)})`);
    if (t.hill !== undefined && typeof t.hill !== 'boolean') throw new Error(`terrain hill at ${t.r},${t.c} must be true or false (not ${String(t.hill)})`);
    if (t.hill && !HILL_UNDER_TERRAIN.includes(t.t)) throw new Error(`a hill under ${t.t} at ${t.r},${t.c}: only a camp or wall may stand on a hill`);
  }
  for (const u of setup.units) {
    if (!has(UNIT_STATS, u.type)) throw new Error(`unknown unit type ${String(u.type)} at ${u.r},${u.c}`);
    if (u.immobile !== undefined && typeof u.immobile !== 'boolean') throw new Error(`unit immobile at ${u.r},${u.c} must be true or false`);
  }
  for (const u of setup.reserves) if (!has(UNIT_STATS, u.type)) throw new Error(`unknown unit type ${String(u.type)} in reserve`);
  // separate commands (§18.5) are for the pieces on the board only: a command anywhere else would be lost silently
  const offBoard: [string, { type?: string; name?: string; command?: unknown }[]][] = [
    ['reserve unit', setup.reserves], ['reserve leader', setup.reserveLeaders], ['leader to place', setup.placeLeaders ?? []],
  ];
  for (const [what, list] of offBoard) {
    for (const p of list) {
      if (p.command !== undefined) throw new Error(`${what} ${p.type ?? p.name}: command ${String(p.command)} is only for pieces on the board`);
    }
  }
  // immobile units (§18.11) start on the board: the flag on a reserve would be lost silently
  for (const p of setup.reserves as { type: string; immobile?: unknown }[]) {
    if (p.immobile !== undefined) throw new Error(`reserve unit ${p.type}: immobile is only for units on the board`);
  }
}

/**
 * Where the pieces stand (on the built board): one unit and one leader per hex at most, no leader on an enemy unit, and
 * no unit or leader on impassable terrain or a unit on terrain its type may not enter (a mounted unit or war machine on a
 * city wall, §18.7).
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

/**
 * The order dice of each side (§18.10), validated: `orders: 'dice'` needs `cards: 0` and `orderDice` a whole number from 1;
 * `orderDice` comes only with it. A dice side holds no cards, so neither a starting Command (`initialCommand`), hand growth
 * nor a Command bonus may give it one. 0 = the side plays cards.
 */
function orderDiceOf(setup: ScenarioSetup): Record<Side, number> {
  const out: Record<Side, number> = { top: 0, bottom: 0 };
  for (const side of SIDES) {
    const ss = setup[side] as SideSetup & { orders?: unknown; orderDice?: unknown };
    if (ss.orders === undefined) {
      if (ss.orderDice !== undefined) throw new Error(`${side} army: orderDice needs orders: 'dice'`);
      // a side that plays cards with an empty hand would wait for ever for its first card
      const c: unknown = ss.cards;
      if (typeof c !== 'number' || !Number.isInteger(c) || c < 1) {
        throw new Error(`${side} army: a side that plays cards needs cards: a whole number, 1 or more`);
      }
      continue;
    }
    if (ss.orders !== 'dice') throw new Error(`${side} army: unknown orders ${String(ss.orders)}`);
    if (ss.cards !== 0) throw new Error(`${side} army: a side with dice orders holds no cards (cards: 0)`);
    const n = ss.orderDice;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) throw new Error(`${side} army: orderDice must be a whole number, 1 or more`);
    const held = (what: string) => new Error(`${what}: the ${side} army orders by dice and holds no cards`);
    if (setup.initialCommand?.[side]) throw held('initialCommand');
    if ((setup.handGrowth as { side?: unknown } | undefined)?.side === side) throw held('handGrowth');
    if ((setup.commandBonus as { side?: unknown } | undefined)?.side === side) throw held('commandBonus');
    out[side] = n;
  }
  return out;
}

/** Leaders each side starts with: on the board, in reserve and still to be placed. */
function leaderCount(setup: ScenarioSetup): Record<Side, number> {
  const n = { top: 0, bottom: 0 };
  for (const l of [...setup.leaders, ...setup.reserveLeaders, ...(setup.placeLeaders ?? [])]) n[l.side]++;
  return n;
}

/** Validate the pre-battle placement list (its sides). */
function checkPlacement(setup: ScenarioSetup) {
  for (const l of setup.placeLeaders ?? []) {
    if (l.side !== 'top' && l.side !== 'bottom') throw new Error(`placeLeaders: unknown side ${String(l.side)} (${setup.id})`);
  }
}

/** The hand growth of a battle (§18.8), copied and validated: null when the scenario gives none. */
function resolveHandGrowth(setup: ScenarioSetup): HandGrowth | null {
  const g: unknown = setup.handGrowth;
  if (g === undefined) return null;
  if (typeof g !== 'object' || g === null || Array.isArray(g)) throw new Error('handGrowth must be an object');
  const { side, to } = g as Partial<HandGrowth>;
  if (side !== 'top' && side !== 'bottom') throw new Error(`handGrowth: unknown side ${String(side)}`);
  if (!Number.isInteger(to) || (to as number) < 1) throw new Error('handGrowth: to must be a whole number, 1 or more');
  return { side, to: to as number };
}

/** The Command bonus of a battle (009, §14), copied and validated: null when the scenario gives none. */
function resolveCommandBonus(setup: ScenarioSetup): CommandBonus | null {
  const b: unknown = setup.commandBonus;
  if (b === undefined) return null;
  if (typeof b !== 'object' || b === null || Array.isArray(b)) throw new Error('commandBonus must be an object');
  const { side, atBanners, command, draw, text } = b as Partial<CommandBonus>;
  if (side !== 'top' && side !== 'bottom') throw new Error(`commandBonus: unknown side ${String(side)}`);
  for (const [k, v, min] of [['atBanners', atBanners, 1], ['command', command, 1], ['draw', draw, 0]] as const) {
    if (!Number.isInteger(v) || (v as number) < min) throw new Error(`commandBonus: ${k} must be a whole number, ${min} or more`);
  }
  if (typeof text !== 'string') throw new Error('commandBonus: text must be a string');
  return { side, atBanners: atBanners as number, command: command as number, draw: draw as number, text };
}

/** Trebbia's ambush: a Leadership card after the side's first turn (§14). */
const DEFAULT_AMBUSH: AmbushDef = {
  trigger: ['inspiredL', 'inspiredC', 'inspiredR', 'leadershipAny'],
  afterOwnTurns: 1,
  text: "Ambush! Mago's hidden force strikes from the {section}.",
};

/** Is `v` an `[r, c]` pair of whole numbers? */
const isHexPair = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && Number.isInteger(v[0]) && Number.isInteger(v[1]);

/**
 * Hex ids of a list of `[r, c]` pairs, validated (a list of pairs, at least one, each on the board, none twice); `what`
 * words the errors ("ambush entry hex 9,0 is off the board").
 */
function hexList(list: unknown, listErr: string, emptyErr: string, what: string): HexId[] {
  if (!Array.isArray(list) || !list.every(isHexPair)) throw new Error(listErr);
  if (!list.length) throw new Error(emptyErr);
  const out: HexId[] = [];
  for (const [r, c] of list) {
    if (!onBoard(r, c)) throw new Error(`${what} ${r},${c} is off the board`);
    const h = hexId(r, c);
    if (out.includes(h)) throw new Error(`${what} ${r},${c} is listed twice`);
    out.push(h);
  }
  return out;
}

/**
 * The ambush data of a battle: null when the scenario gives none, else its data over the Trebbia defaults.
 * The rule needs a reserve force (at least one reserve unit). The reinforcement options (308, §18.9) are copied only when
 * given: `entryHexes` (on the board, each once; passable and no wall, checked on the built board by
 * `checkReinforcementHexes`), `noMove` and `attachLeader` (which needs a reserve leader).
 */
function resolveAmbush(setup: ScenarioSetup): AmbushDef | null {
  const a: unknown = setup.ambush;
  if (a === undefined) return null;
  if (typeof a !== 'object' || a === null || Array.isArray(a)) throw new Error('ambush must be an object');
  const d = a as AmbushSetup;
  if (d.trigger !== undefined) {
    if (!Array.isArray(d.trigger)) throw new Error('ambush trigger must be a list of cards');
    if (!d.trigger.length) throw new Error('ambush trigger: needs at least one card');
    for (const k of d.trigger) if (!has(CARD_DEFS, k)) throw new Error(`ambush trigger: unknown card ${String(k)}`);
  }
  if (d.afterOwnTurns !== undefined && !(Number.isInteger(d.afterOwnTurns) && d.afterOwnTurns >= 0)) {
    throw new Error('ambush afterOwnTurns must be a whole number, 0 or more');
  }
  if (d.text !== undefined && typeof d.text !== 'string') throw new Error('ambush text must be a string');
  const entryHexes = d.entryHexes === undefined ? undefined
    : hexList(d.entryHexes, 'ambush entryHexes must be a list of [r, c] hexes', 'ambush entryHexes: needs at least one hex', 'ambush entry hex');
  for (const k of ['noMove', 'attachLeader'] as const) {
    if (d[k] !== undefined && typeof d[k] !== 'boolean') throw new Error(`ambush ${k} must be true or false`);
  }
  if (d.attachLeader && !setup.reserveLeaders.length) throw new Error('ambush attachLeader needs a reserve leader');
  if (!setup.reserves.length) throw new Error('the ambush needs reserve units');
  return {
    trigger: [...(d.trigger ?? DEFAULT_AMBUSH.trigger)],
    afterOwnTurns: d.afterOwnTurns ?? DEFAULT_AMBUSH.afterOwnTurns,
    text: d.text ?? DEFAULT_AMBUSH.text,
    ...(entryHexes ? { entryHexes } : {}),
    ...(d.noMove !== undefined ? { noMove: d.noMove } : {}),
    ...(d.attachLeader !== undefined ? { attachLeader: d.attachLeader } : {}),
  };
}

/**
 * The forced placements of a battle (308, §18.9), validated, with their units built (ids from `nextId` on, legions
 * stamped); none when the scenario gives none. They come after the ambush, so they need its rule. The hexes are checked
 * for terrain on the built board (`checkReinforcementHexes`).
 */
function resolvePlaceUnits(setup: ScenarioSetup, ambush: AmbushDef | null, nextId: () => string): PlaceUnitDef[] {
  const list: unknown = setup.placeUnits;
  if (list === undefined) return [];
  if (!Array.isArray(list)) throw new Error('placeUnits must be a list');
  const out: PlaceUnitDef[] = [];
  for (const p of list as Partial<PlaceUnitSetup & { command: unknown }>[]) {
    if (p?.side !== 'top' && p?.side !== 'bottom') throw new Error(`placeUnits: unknown side ${String(p?.side)}`);
    if (!has(UNIT_STATS, p.type)) throw new Error(`placeUnits: unknown unit type ${String(p.type)}`);
    const type = p.type as UnitType;
    if (p.after !== 'ambush') throw new Error(`placeUnits ${type}: after must be 'ambush'`);
    if (p.command !== undefined) throw new Error(`unit to place ${type}: command ${String(p.command)} is only for pieces on the board`);
    const msg = `placeUnits ${type}: hexes must be a list of [r, c] hexes, at least one`;
    const hexes = hexList(p.hexes, msg, msg, `placeUnits ${type}: hex`);
    if (!ambush) throw new Error('placeUnits after the ambush need ambush data');
    const st = UNIT_STATS[type];
    const unit = withLegion({ id: nextId(), side: p.side, type, hex: OFF_BOARD, blocks: st.blocks, maxBlocks: st.blocks }, setup.legions);
    out.push({ unit, hexes, after: 'ambush' });
  }
  return out;
}

/**
 * The reinforcement hexes on the built board (§18.9): the ambush entry hexes must be passable and no city wall (a unit
 * entering from off the board never begins next to one, §18.7), and each forced placement's hexes passable and open to
 * its unit type (no mounted unit on a city wall).
 */
function checkReinforcementHexes(s: GameState) {
  for (const h of s.special.ambush?.entryHexes ?? []) {
    if (isImpassable(s, h)) throw new Error(`ambush entry hex ${hexLabel(h)} is impassable`);
    // a unit climbs onto a wall only by a move that begins next to it (§18.7): one entering from off the board never does
    if (isWall(s, h)) throw new Error(`ambush entry hex ${hexLabel(h)} is a city wall, which a reserve cannot enter`);
  }
  for (const p of s.special.placeUnits) {
    for (const h of p.hexes) {
      if (isImpassable(s, h)) throw new Error(`placeUnits ${p.unit.type}: hex ${hexLabel(h)} is impassable`);
      const t = terrainAt(s, h);
      if (forbidsTerrain(p.unit.type, t)) throw new Error(`placeUnits ${p.unit.type}: hex ${hexLabel(h)} is ${t}, which it may not enter`);
    }
  }
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

/** The board arrays of a game state (`GameState.terrain`, `fords`, `noCap`, `rampart`, `hillUnder`). */
export type BoardArrays = Pick<GameState, 'terrain' | 'fords' | 'noCap' | 'rampart' | 'hillUnder'>;

/**
 * The board arrays of a scenario's terrain list: open ground on every board hex (`void` off it), then each entry. A coast
 * played as a ford (217, §18.6) becomes a fordable river; a rampart's hexsides are validated (`rampartMask`). Throws on an
 * entry off the board or a ford that is no river.
 */
export function boardFromTerrain(list: readonly TerrainSetup[]): BoardArrays {
  const terrain: TerrainType[] = [];
  const fords: boolean[] = [];
  const noCap: boolean[] = [];
  const rampart: number[] = [];
  const hillUnder: boolean[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      terrain.push(onBoard(r, c) ? 'plain' : 'void');
      fords.push(false);
      noCap.push(false);
      rampart.push(0);
      hillUnder.push(false);
    }
  }
  for (const t of list) {
    if (!onBoard(t.r, t.c)) throw new Error(`terrain off board ${t.r},${t.c}`);
    // a coast played as a ford (217, §18.6) is a fordable river in every respect: only the art is sea
    const coastFord = t.t === 'sea' && t.ford === true;
    if (t.ford && t.t !== 'river' && !coastFord) throw new Error(`a ford must be a river hex (${t.t} at ${t.r},${t.c}, ford ${String(t.ford)})`);
    const h = hexId(t.r, t.c);
    terrain[h] = coastFord ? 'river' : t.t;
    fords[h] = !!t.ford;
    noCap[h] = t.ford === 'nocap';
    rampart[h] = rampartMask(t);
    hillUnder[h] = t.hill === true;
  }
  return { terrain, fords, noCap, rampart, hillUnder };
}

function buildGame(setup: ScenarioSetup, seed: number, options: GameOptions | undefined): GameState {
  checkIds(setup);
  const { terrain, fords, noCap, rampart, hillUnder } = boardFromTerrain(setup.terrain);
  const commands = resolveCommands(setup);
  // 304 (§18.5): the type a card names is judged within the command it is played for, so there must be commands
  if (setup.rules.includes('commandFallback') && !commands.length) throw new Error('rule commandFallback needs separate commands');
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
    if (u.immobile) unit.immobile = true;
    return withLegion(unit, setup.legions);
  });
  const leaders: Leader[] = setup.leaders.map((l) => {
    if (!onBoard(l.r, l.c)) throw new Error(`leader ${l.name} off board ${l.r},${l.c}`);
    const leader = withTraits({ id: `L${nextId++}`, side: l.side, name: l.name, hex: hexId(l.r, l.c) }, l.traits);
    if (l.command !== undefined) leader.command = checkedCommand(commands, l.side, l.command, `leader ${l.name}: command ${String(l.command)}`);
    return leader;
  });
  // Asculum: leaders still to be placed wait off the board (placement order = id order)
  const rules = [...setup.rules];
  const tacticalFlexibility = resolveTacticalFlexibility(setup, options);
  checkPlacement(setup);
  const ambush = resolveAmbush(setup);
  const handGrowth = resolveHandGrowth(setup);
  const commandBonus = resolveCommandBonus(setup);
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
  // forced placements (308): their units take the ids after the reserve leaders', so no other id changes
  const placeUnits = resolvePlaceUnits(setup, ambush, () => `u${nextId++}`);
  if (setup.rules.includes('commandFallback')) checkCommandFallback(setup, commands);

  const rngHolder = { rng: seed >>> 0, rngCalls: 0 };
  const deck = shuffle(rngHolder, CARD_LIST.map((_, i) => i));

  const sl = setup.sacredLeader;
  const sacred = sl ? leaders.find((l) => l.side === sl.side && l.name === sl.name)?.id : null;
  if (sacred === undefined) throw new Error(`sacredLeader ${String(sl?.name)} is no leader of the ${String(sl?.side)} army`);

  const s: GameState = {
    scenarioId: setup.id,
    terrain,
    fords,
    noCap,
    rampart,
    hillUnder,
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
    turn: newTurn(1),
    lastCard: { top: null, bottom: null },
    bannersToWin: setup.banners,
    rng: rngHolder.rng,
    rngCalls: rngHolder.rngCalls,
    winner: null,
    winReason: '',
    special: {
      rules,
      handGrowth,
      commandBonus,
      frightAtFirstSight: setup.frightAtFirstSight ?? null,
      tacticalFlexibility,
      commands,
      rollingFire: setup.rollingFire ?? null,
      rampartBreakers: setup.rampartBreakers ?? null,
      lastRowRetreat: setup.lastRowRetreat ?? null,
      ambush,
      reserveUnits,
      reserveLeaders,
      reserveSide: reserveUnits[0]?.side ?? reserveLeaders[0]?.side ?? null,
      reserveReleased: false,
      reserveEntered: false,
      placeUnits,
      orderDice: orderDiceOf(setup),
      turnsDone: { top: 0, bottom: 0 },
      objectives: [],
      objState: [],
      sacredLeaderId: sacred,
      commandBonusGiven: false,
      leadersAtStart: leaderCount(setup),
      unplaced,
      leadersEliminated: { top: 0, bottom: 0 },
      cardDebt: { top: 0, bottom: 0 },
    },
  };
  checkPositions(setup, s);
  checkReinforcementHexes(s);
  s.special.objectives = resolveObjectives(setup, terrain, fords, s.players);
  s.special.objState = s.special.objectives.map(newObjectiveState);
  for (const side of [setup.first, setup.first === 'top' ? 'bottom' : 'top'] as Side[]) {
    const p = s.players[side];
    for (let i = 0; i < p.command; i++) p.hand.push(s.deck.pop()!);
  }
  return s;
}

/**
 * Fast deep copy of a game state (plain data). The board arrays (terrain, fords, noCap, rampart, hillUnder) and the
 * objective definitions are shared: they never change in place (`setTerrain` replaces the arrays).
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
    hillUnder: s.hillUnder,
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
      placeUnits: s.special.placeUnits.map((p) => ({ ...p, unit: { ...p.unit } })),
      orderDice: s.special.orderDice,
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
