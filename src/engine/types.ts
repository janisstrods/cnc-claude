// Shared engine types. This file is the contract between engine, AI and UI.
// Everything here is plain serialisable data (no functions, no classes). The id lists (BLOCKS, ARMY_LOOKS,
// SPECIAL_RULE_IDS) are the source of their types and let setup validate scenario data.

export type Side = 'top' | 'bottom';

export type UnitType = 'LI' | 'LB' | 'LS' | 'AX' | 'WA' | 'MI' | 'HI' | 'LC' | 'MC' | 'HC' | 'EL' | 'HCH' | 'LBC' | 'CAM' | 'HWM' | 'BCH';
export type UnitClass = 'light' | 'medium' | 'heavy';

/** Elite unit presets (see elites.ts). A unit with `elite` set gets that preset's abilities on top of its type's. */
export type EliteId =
  | 'carthSacredBand' | 'thebanSacredBand' | 'silverShields' | 'companions' | 'immortals' | 'bowAuxilia' | 'tenthLegion';

/**
 * Legion rule of a unit's army (Expansion #2/#3, rules-reference §18.2): `marius` = the pilum (range 2, always 1 die);
 * `julian` = the pilum and the march. Stamped by the scenario's `legions` data on every MI and HI of the named side.
 */
export const LEGIONS = ['marius', 'julian'] as const;
export type Legion = (typeof LEGIONS)[number];

/**
 * Terrain of a hex. A fordable river is `river` with `fords[hex] === true` (and `noCap[hex]` when it has no dice caps).
 * `sea` follows the lake rules (a coast played as a ford is a fordable `river`, 217); `rampart` is open ground whose
 * protected hexsides are `GameState.rampart[hex]` (§16); `ditch` (212) stops every unit and lone leader on entering and
 * does nothing else (§18.6); `wall` is a scalable city wall (Expansion #3, rules-reference §18.7; its rules come with the
 * wall engine task, until then it is open ground for movement and combat). `void` = not on the board.
 */
export type TerrainType =
  | 'plain' | 'hill' | 'forest' | 'marsh' | 'broken' | 'river' | 'lake' | 'camp' | 'steep' | 'sea' | 'rampart' | 'ditch' | 'wall' | 'void';

/** Hexside / neighbour directions, in the board's neighbour order (row 0 at the top, so NE and NW point up the board). */
export type HexDir = 'E' | 'NE' | 'NW' | 'W' | 'SW' | 'SE';

/** Every block set (scenario data is validated against it). */
export const BLOCKS = ['rom', 'car', 'grk', 'eas', 'bar', 'gry'] as const; // gry: grey Roman (210 Lentulus' command)
/** Which block set a side plays: decides base-edge and banner colour (i.e. which side a piece belongs to). */
export type Blocks = (typeof BLOCKS)[number];

/** Every army look (scenario data is validated against it). */
export const ARMY_LOOKS = [
  'roman', 'carthaginian', 'syracusan',
  'athenian', 'theban', 'spartan', 'phocian', 'macedonian', 'antigonid', 'epirote',
  'craterus', 'eumenes', 'antigonus', 'seleucid', 'ptolemaic', 'persian', 'scythian', 'indian', 'mauryan',
  'gallic', 'germanic', 'slave', 'belgic', 'briton', 'marian',
  'sullan', 'samnite', 'sertorian', 'pompeian', 'caesarian', 'helvetii', 'numidian', 'pontic',
] as const;
/** Army look: the figure kit and palette an army is drawn with (see src/art/palettes.ts). */
export type ArmyLook = (typeof ARMY_LOOKS)[number];

export type SectionName = 'left' | 'center' | 'right';

export type DieFace = 'light' | 'medium' | 'heavy' | 'leader' | 'flag' | 'swords';

/** Hex index = r * 13 + c. r: 0..8 (0 = top edge), c: 0..12 on even rows, 0..11 on odd rows. -1 = off board. */
export type HexId = number;

export const ROWS = 9;
export const COLS = 13;
export const OFF_BOARD: HexId = -1;

export interface Unit {
  id: string; // "u<n>"
  side: Side;
  type: UnitType;
  hex: HexId;
  blocks: number;
  maxBlocks: number;
  /** Elite preset (e.g. scenario 002's Carthaginian Sacred Band); absent for ordinary units. */
  elite?: EliteId;
  /** Legion rule of the unit's army (pilum, march; §18.2); absent for units outside a legion. */
  legion?: Legion;
  /** Id of the separate command the unit belongs to (`ScenarioSpecial.commands`, 210 Picenum, §18.5); absent outside one. */
  command?: string;
}

/**
 * Leader traits (rules-reference §17.2, §18.3). `ccBonus` (Alexander, Caesar): the unit he is attached to rolls +1 close
 * combat die. `attachedOnly` (the Persian satraps): his helmets count and a Leadership card played on him orders only for
 * his own unit. `forcedMarch` (Caesar): an infantry unit that has him attached when it begins its move may move 2 hexes and
 * still battle. `spartacusDice` (Spartacus): his side's I Am Spartacus roll has 2 more dice while he is on the board.
 */
export type LeaderTrait = 'ccBonus' | 'attachedOnly' | 'forcedMarch' | 'spartacusDice';

export interface Leader {
  id: string; // "L<n>"
  side: Side;
  name: string;
  hex: HexId;
  /** Special abilities (see LeaderTrait); absent for ordinary leaders. */
  traits?: LeaderTrait[];
  /** Command the leader belongs to (§18.5): a card that orders him orders only that command; absent = free (210). */
  command?: string;
}

export interface PlayerState {
  side: Side;
  army: string; // e.g. "Roman"
  blocks: Blocks;
  look: ArmyLook;
  commander: string;
  hand: number[]; // card instance ids (index into CARD_LIST)
  command: number; // current maximum hand size = Command value
  banners: number;
}

export type CardKind =
  | 'order2L' | 'order2C' | 'order2R'
  | 'order3L' | 'order3C' | 'order3R'
  | 'order4L' | 'order4C' | 'order4R'
  | 'outFlanked' | 'coordinated'
  | 'orderLight' | 'orderMedium' | 'orderHeavy' | 'orderMounted'
  | 'inspiredL' | 'inspiredC' | 'inspiredR' | 'leadershipAny'
  | 'clash' | 'counterAttack' | 'darken' | 'doubleTime' | 'firstStrike' | 'spartacus'
  | 'lineCommand' | 'mountedCharge' | 'moveFireMove' | 'rally';

export type CardGroup = 'section' | 'troop' | 'leadership' | 'tactic';

export interface CardDef {
  kind: CardKind;
  title: string;
  group: CardGroup;
  count: number;
  /** Paraphrased rules text shown on the card. */
  text: string;
  /** Sections highlighted on the card's mini-map (empty = none / any). */
  sections: SectionName[];
  /** True when attached leaders may be ordered separately (helmet symbol). */
  detach: boolean;
}

/** Modifiers that the played card applies to the ordered pieces this turn. */
export interface OrderMods {
  ccBonus: number; // extra dice in the initial close combat of ordered units
  ccBonusOnBonusCombat: boolean; // whether ccBonus also applies to bonus close combat
  rangedBonus: number;
  noRanged: boolean;
  noClose: boolean;
  noMove: boolean;
  passThrough: boolean; // light foot may move through friendly units
  maxMove: number | null; // Line Command: 1
  doubleTime: boolean; // foot may move 2 and still close combat; WA 2-3 must combat
  mountedCharge: boolean; // HC/EL/HCH may move 3 and battle
  shots: number; // ranged combats per unit (Darken the Sky: 2)
  moveFireMove: boolean;
}

export interface OrderedPiece {
  id: string;
  isLeader: boolean;
  startHex: HexId;
  moved: number; // hexes moved so far this turn
  moveDone: boolean; // first (or only) move used
  move2Done: boolean; // Move-Fire-Move second move used
  battlesLeft: number; // remaining battles (0 after battling)
  canBattle: boolean; // false if movement/terrain forbids battling this turn
  mustBattle: boolean; // warriors that charged must close combat
  enteredHexThisTurn: boolean; // moved at all (for river/marsh momentum rule)
  attachedThisTurn: boolean; // a leader joined it during movement: unit may not move afterwards
  fromReserve?: boolean;
}

export type TurnPhase = 'card' | 'orders' | 'move' | 'battle' | 'move2' | 'draw' | 'done';

export interface TurnState {
  number: number; // 1-based global turn counter
  side: Side;
  card: number | null; // card instance played
  effective: CardKind | null; // card kind actually executed (Counter Attack resolves to a copy)
  mirrored: boolean; // Counter Attack of a section/inspired card swaps left/right
  phase: TurnPhase;
  ordered: Record<string, OrderedPiece>;
  mods: OrderMods;
  firstStrikeBy: Side | null; // defender who played First Strike this turn (draws first)
  reshuffleAfter: boolean; // I Am Spartacus
  ambushSection: SectionName | null; // ambush reserve (Trebbia, 206): section where the force enters this turn
}

/**
 * Scenario special rules (§14, §17). `castulo` (010) has no effect of its own and is kept so that saved and scenario data
 * stay valid: the sacred leader whose loss loses the battle is `ScenarioSetup.sacredLeader`, and Castulo's exit is a
 * battle objective. Expansion #1: `leaderLossCostsCard` and `allLeadersSuddenDeath` (112 Hellespont),
 * `frightAtFirstSight` (116 Heraclea), `leaderPlacement` (117 Asculum: leaders are placed before the first turn) and
 * `tacticalFlexibility` (the optional Roman rule of 120, 121, 124, §17.3). Camp capture (011 Baecula, 114 Gabiene) is a
 * battle objective (`ObjectiveDef`), not a rule. Expansion #2: `magoAmbush` also serves 206 (§18.5) and
 * `veryHills` (223, §18.6) makes every hill very steep: a unit climbing onto one stops and may not battle, and the
 * close-combat caps change. Scenario data is validated against this list.
 */
export const SPECIAL_RULE_IDS = [
  'sacredBand',
  'magoAmbush',
  'trasimenusHand',
  'beneventumHand',
  'castulo',
  'leaderLossCostsCard',
  'allLeadersSuddenDeath',
  'frightAtFirstSight',
  'leaderPlacement',
  'tacticalFlexibility',
  'veryHills',
] as const;
/** A scenario special rule (see SPECIAL_RULE_IDS). */
export type SpecialRuleId = (typeof SPECIAL_RULE_IDS)[number];

/**
 * A battle objective (§18.4), resolved from scenario data (`ObjectiveSetup` in setup.ts) with every default filled in.
 * Objectives give banners on top of eliminated units and leaders; only units count, never lone leaders.
 * - `capture`: `side` takes each of `hexes` once (camps, or ramparts standing in for camps, 215): `when: 'stop'` = a unit
 *   ends its move or its close-combat sequence there; `'turnStart'` = a unit stands there at the start of that side's
 *   turn, before its card. The n-th capture scores `banners[n - 1]` permanent banners (the last value repeats);
 *   `together: n` ('turnStart' only; 0 = off) = nothing until n untaken listed hexes are occupied at once, then a single
 *   capture scores `banners[0]` (1 by default) once and takes every listed hex; `remove` = a taken hex becomes open ground
 *   (`setTerrain`; every listed hex with `together`). `hexes` ascending.
 * - `hold`: 1 held banner per listed hex a unit of `side` stands on, at most `max`.
 * - `majority`: the side of `sides` with strictly more units on `hexes` holds `banners`, nobody on a tie (`turnEnd`:
 *   decided at the end of every player turn; `always`: at once).
 * - `sectionClear`: at the end of `side`'s turn each section (from `side`'s point of view) without an enemy unit scores
 *   1 held banner, lost as soon as an enemy unit stands in it (a unit on a boundary hex is in both sections).
 * - `exit`: a unit of `side` (`units` filter) on one of `hexes` (board-edge hexes) may move off the board as one more
 *   hex: 1 banner, the unit and its attached leader are removed (not eliminated). In `text`, `{unit}` is the unit's name.
 * `text` is the log line (the `held` event reason for held banners).
 */
export type ObjectiveDef =
  | { kind: 'capture'; side: Side; hexes: HexId[]; when: 'stop' | 'turnStart'; banners: number[]; together: number;
      remove: boolean; text: string }
  | { kind: 'hold'; side: Side; hexes: HexId[]; max: number; text: string }
  | { kind: 'majority'; sides: Side[]; hexes: HexId[]; banners: number; when: 'turnEnd' | 'always'; text: string }
  | { kind: 'sectionClear'; side: Side; text: string }
  | { kind: 'exit'; side: Side; hexes: HexId[]; units: 'any' | 'foot' | 'cavalry'; leadersScore: boolean; text: string };

/** The objective of one kind. */
export type ObjectiveOf<K extends ObjectiveDef['kind']> = Extract<ObjectiveDef, { kind: K }>;

/** Play state of one objective (`ScenarioSpecial.objState[i]` belongs to `objectives[i]`). */
export interface ObjectiveState {
  /** capture: hexes captured so far, in order. */
  taken: HexId[];
  /** hold / majority / sectionClear: banners this objective gives each side right now. */
  held: Record<Side, number>;
  /** sectionClear: sections currently scored (from the objective side's point of view, in left-centre-right order). */
  sections: SectionName[];
}

/**
 * The ambush reserve (rule `magoAmbush`, §14 and §18.5) with every default filled in: the Trebbia defaults are the four
 * Leadership cards, one finished own turn and the Mago text; 206 Aquae Sextiae adds Order Light Troops, from the first turn.
 */
export interface AmbushDef {
  /** Cards that spring the ambush (the card played, or the one a Counter Attack copies). */
  trigger: CardKind[];
  /** Own turns the reserve's side must have finished first (Trebbia 1, 206 0). */
  afterOwnTurns: number;
  /** The log line; `{section}` is replaced by the section the force enters from. */
  text: string;
}

/**
 * A separate command of one side's army (210 Picenum, §18.5): one card orders units of one command only. `blocks`
 * recolours the command's base edges (art only, e.g. Lentulus' grey).
 */
export interface CommandDef {
  id: string;
  name: string;
  side: Side;
  blocks?: Blocks;
}

export interface ScenarioSpecial {
  rules: SpecialRuleId[];
  /** Separate commands (§18.5), in data order; empty in most battles. Never changed during play: `cloneState` shares the array. */
  commands: CommandDef[];
  /** Rolling Fire (210 Picenum, §18.5): the side whose infantry on hills may roll burning logs; null in most battles. */
  rollingFire: Side | null;
  /**
   * Rampart breakers (223 Medway, §18.6): the side whose units remove (`setTerrain` to plain) every rampart hex they enter
   * or pass through by moving, advancing, retreating or evading; null in most battles. Never changed during play.
   */
  rampartBreakers: Side | null;
  /**
   * Last-row retreat (214 Silarus, §18.5): the side whose unit is eliminated, not damaged, by a retreat that ends on its own
   * baseline row with retreat hexes it could not take; null in most battles. Never changed during play.
   */
  lastRowRetreat: Side | null;
  /** Ambush trigger data: set exactly when the rule `magoAmbush` is on, else null. Never changed during play. */
  ambush: AmbushDef | null;
  /** Off-board reserve force of an ambush (Trebbia's Mago, 206, ...; §18.5). */
  reserveUnits: Unit[];
  reserveLeaders: Leader[];
  reserveSide: Side | null;
  reserveReleased: boolean;
  /** Turns completed per side (used by hand-growth rules and by ambush reserves' `afterOwnTurns`, §18.5). */
  turnsDone: Record<Side, number>;
  /** Battle objectives (§18.4; empty in most battles). Never changed during play: `cloneState` shares the array. */
  objectives: ObjectiveDef[];
  /** State of each objective, by index (`cloneState` copies it). */
  objState: ObjectiveState[];
  /** Castulo: id of Publius Scipio. */
  sacredLeaderId: string | null;
  beneventumBonusGiven: boolean;
  /** Leaders each side had at the start (on the board, in reserve or still to be placed). */
  leadersAtStart: Record<Side, number>;
  /**
   * Asculum (`leaderPlacement`): ids of the leaders still to be placed before the first turn, in placement order. They
   * wait in `GameState.leaders` at `OFF_BOARD`; empty once placement is over (and in every other battle).
   */
  unplaced: string[];
  /** Leaders each side has had eliminated (killed for a banner; not leaders who left the board by evading or exiting). */
  leadersEliminated: Record<Side, number>;
  /**
   * Hellespont (`leaderLossCostsCard`): cards a side still owes for lost leaders. Each one skips that side's next draw;
   * a leader lost on the opponent's turn is paid at once with a random discard when the hand has a card.
   */
  cardDebt: Record<Side, number>;
}

export interface GameState {
  scenarioId: string;
  /**
   * Terrain of every hex; length ROWS*COLS. Changed during play only through `setTerrain` (removable tiles, §18.6), which
   * replaces the array (and `rampart`) instead of changing it in place: `cloneState` shares both.
   */
  terrain: TerrainType[];
  fords: boolean[]; // length ROWS*COLS
  /** Fordable river hexes without the ford dice caps (108 Pinarus, §16); length ROWS*COLS. */
  noCap: boolean[];
  /** Protected hexsides of each rampart hex: bit i = neighbour direction i (E, NE, NW, W, SW, SE); 0 elsewhere. */
  rampart: number[];
  units: Unit[];
  leaders: Leader[];
  players: Record<Side, PlayerState>;
  deck: number[];
  discard: number[];
  first: Side;
  active: Side;
  turn: TurnState;
  /** Effective card kind of each side's most recent turn (for Counter Attack). */
  lastCard: Record<Side, CardKind | null>;
  bannersToWin: number;
  rng: number; // RNG state (uint32)
  rngCalls: number; // number of random draws so far
  winner: Side | 'draw' | null;
  winReason: string;
  special: ScenarioSpecial;
  nextId: number;
}

// ---------------------------------------------------------------------------
// Decisions (engine -> player) and Answers (player -> engine)
// ---------------------------------------------------------------------------

export interface RetreatOption {
  path: HexId[]; // hexes entered, in order (empty = stays)
  end: HexId; // final hex (start hex if it could not move)
  losses: number; // blocks lost for unfulfilled hexes
  attachLeader: string | null; // lone friendly leader joined at the end
  offBoard?: boolean; // leader evading off his own baseline
  escapes?: string[]; // enemy unit ids a leader must escape through
}

export type Decision =
  | { kind: 'playCard'; side: Side }
  | { kind: 'orders'; side: Side; card: CardKind; mirrored: boolean }
  | { kind: 'move'; side: Side; stage: 1 | 2 }
  | { kind: 'battle'; side: Side }
  | { kind: 'defend'; side: Side; attacker: string; target: string; canEvade: boolean; canFirstStrike: boolean; bonus?: boolean }
  | { kind: 'ignoreFlags'; side: Side; unit: string; flags: number; max: number }
  | { kind: 'retreat'; side: Side; unit: string; options: RetreatOption[]; reason: 'retreat' | 'evade' }
  | { kind: 'leaderEvade'; side: Side; leader: string; options: RetreatOption[] }
  | { kind: 'momentum'; side: Side; unit: string; hex: HexId; bonus?: boolean }
  | { kind: 'cavalryExtra'; side: Side; unit: string; options: HexId[] }
  | { kind: 'bonusCombat'; side: Side; unit: string; targets: HexId[] }
  /** `command`: the command the player named for this card (§18.5); only its units can be rallied. Absent whenever no command question was asked. */
  | { kind: 'rally'; side: Side; faces: DieFace[]; command?: string }
  /** `command`: as for Rally (absent whenever no command question was asked), only its units (and leaders with no command) can be ordered. */
  | { kind: 'spartacus'; side: Side; faces: DieFace[]; command?: string }
  /**
   * Which command a card orders (§18.5), asked before Clash of Shields, Darken the Sky, Rally and I Am Spartacus act
   * when their eligible units belong to more than one command. `options` = command ids, in data order; answer `choose`.
   */
  | { kind: 'chooseCommand'; side: Side; options: string[] }
  /** Asculum: place `leader` before the first turn on one of `options` (answer `hex`, never null). */
  | { kind: 'placeLeader'; side: Side; leader: string; options: HexId[] };

export type Answer =
  | { kind: 'playCard'; card: number }
  /** pieces: unit and/or leader ids. ambushSection: release the off-board ambush force in that section instead (Trebbia, 206). */
  | { kind: 'orders'; pieces: string[]; ambushSection?: SectionName }
  | { kind: 'move'; piece: string; to: HexId } // to = OFF_BOARD only for exit objectives (010 Castulo)
  | { kind: 'endMove' }
  | { kind: 'attack'; unit: string; target: HexId }
  /** Battle decision: `unit` rolls burning logs down `path`, one of `rollingFirePaths(s, unit)` (210 Picenum, §18.5). */
  | { kind: 'rollingFire'; unit: string; path: HexId[] }
  | { kind: 'endBattle' }
  | { kind: 'defend'; choice: 'stand' | 'evade' | 'firstStrike' }
  | { kind: 'ignoreFlags'; count: number }
  | { kind: 'choose'; index: number }
  | { kind: 'yesno'; yes: boolean }
  | { kind: 'hex'; hex: HexId | null } // null = decline (not for placeLeader)
  /** One entry per die face: id of the unit (rally) or unit/leader (spartacus) it is used on, or null. */
  | { kind: 'assign'; ids: (string | null)[] };

// ---------------------------------------------------------------------------
// Events (engine -> UI animation queue / log)
// ---------------------------------------------------------------------------

export type RollPurpose =
  | 'ranged' | 'close' | 'battleBack' | 'firstStrike' | 'bonus' | 'evade'
  | 'leaderCheck' | 'escape' | 'rampage' | 'marsh' | 'rally' | 'spartacus'
  /** 2 dice against each unit in a Rolling Fire path (§18.5). */
  | 'rollingFire';

export type GameEvent =
  | { t: 'turnStart'; side: Side; turn: number }
  | { t: 'cardPlayed'; side: Side; card: number; kind: CardKind; effective: CardKind }
  | { t: 'ordered'; side: Side; ids: string[] }
  | { t: 'move'; id: string; path: HexId[] } // path includes start hex; last = destination (OFF_BOARD = exited)
  | { t: 'reserveEnter'; id: string; hex: HexId }
  | { t: 'combat'; purpose: RollPurpose; attacker: string; target: string; dice: number }
  | { t: 'roll'; purpose: RollPurpose; faces: DieFace[]; scoring: boolean[]; by: string | null; against: string | null }
  | { t: 'damage'; id: string; amount: number; left: number; reason: string }
  | { t: 'eliminated'; id: string }
  /** Left the board without being eliminated, so no banner (a war machine abandoned after evading, §15). */
  | { t: 'removed'; id: string; reason: string }
  | { t: 'leaderKilled'; id: string }
  | { t: 'leaderSafe'; id: string }
  | { t: 'flags'; id: string; flags: number; ignored: number }
  | { t: 'retreat'; id: string; path: HexId[] }
  | { t: 'evade'; id: string; path: HexId[] }
  | { t: 'leaderEvade'; id: string; path: HexId[]; offBoard: boolean }
  | { t: 'attach'; leader: string; unit: string }
  /** A leader placed before the first turn (Asculum); an `attach` event follows when he joins a unit. */
  | { t: 'leaderPlaced'; id: string; hex: HexId }
  | { t: 'advance'; id: string; path: HexId[] }
  | { t: 'rampage'; id: string }
  | { t: 'rallied'; id: string; blocks: number }
  /** `total`: the side's banner total (permanent + held, `bannerTotal`). */
  | { t: 'banner'; side: Side; total: number; reason: string }
  /** A side's held banners (hold, majority, section clear objectives) changed: `held` now, `total` = its banner total. */
  | { t: 'held'; side: Side; held: number; total: number; reason: string }
  /** A hex's terrain changed during play (a captured camp removed, §18.4). */
  | { t: 'terrainChanged'; hex: HexId; terrain: TerrainType }
  | { t: 'draw'; side: Side }
  | { t: 'reshuffle' }
  | { t: 'command'; side: Side; command: number }
  /** A card taken from the hand at random and discarded (Hellespont: a leader lost on the opponent's turn). */
  | { t: 'cardLost'; side: Side; card: number }
  | { t: 'log'; text: string; side?: Side }
  | { t: 'victory'; winner: Side | 'draw'; reason: string };

/** Emitter passed through engine generators. */
export interface FlowCtx {
  emit(e: GameEvent): void;
  /** Called when an answer is rejected (the same decision is asked again). */
  invalid?(msg: string): void;
}
