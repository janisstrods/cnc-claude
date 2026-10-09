// Shared engine types. This file is the contract between engine, AI and UI.
// Everything here is plain serialisable data (no functions, no classes).

export type Side = 'top' | 'bottom';

export type UnitType = 'LI' | 'LB' | 'LS' | 'AX' | 'WA' | 'MI' | 'HI' | 'LC' | 'MC' | 'HC' | 'EL' | 'HCH' | 'LBC' | 'CAM' | 'HWM';
export type UnitClass = 'light' | 'medium' | 'heavy';

/** Elite unit presets (see elites.ts). A unit with `elite` set gets that preset's abilities on top of its type's. */
export type EliteId = 'carthSacredBand' | 'thebanSacredBand' | 'silverShields' | 'companions' | 'immortals' | 'bowAuxilia';

/**
 * Terrain of a hex. A fordable river is `river` with `fords[hex] === true` (and `noCap[hex]` when it has no dice caps).
 * `sea` follows the lake rules; `rampart` is open ground whose protected hexsides are `GameState.rampart[hex]` (§16).
 * `void` = not on the board.
 */
export type TerrainType =
  | 'plain' | 'hill' | 'forest' | 'marsh' | 'broken' | 'river' | 'lake' | 'camp' | 'steep' | 'sea' | 'rampart' | 'void';

/** Hexside / neighbour directions, in the board's neighbour order (row 0 at the top, so NE and NW point up the board). */
export type HexDir = 'E' | 'NE' | 'NW' | 'W' | 'SW' | 'SE';

/** Which block set a side plays: decides base-edge and banner colour (i.e. which side a piece belongs to). */
export type Blocks = 'rom' | 'car' | 'grk' | 'eas';

/** Army look: the figure kit and palette an army is drawn with (see src/art/palettes.ts). */
export type ArmyLook =
  | 'roman' | 'carthaginian' | 'syracusan'
  | 'athenian' | 'theban' | 'spartan' | 'phocian' | 'macedonian' | 'antigonid' | 'epirote'
  | 'craterus' | 'eumenes' | 'antigonus' | 'seleucid' | 'ptolemaic' | 'persian' | 'scythian' | 'indian' | 'mauryan';

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
}

/**
 * Leader traits (Expansion #1, rules-reference §17.2). `ccBonus` (Alexander): the unit he is attached to rolls +1 close
 * combat die. `attachedOnly` (the Persian satraps): his helmets count and a Leadership card played on him orders only for
 * his own unit.
 */
export type LeaderTrait = 'ccBonus' | 'attachedOnly';

export interface Leader {
  id: string; // "L<n>"
  side: Side;
  name: string;
  hex: HexId;
  /** Special abilities (see LeaderTrait); absent for ordinary leaders. */
  traits?: LeaderTrait[];
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
  ambushSection: SectionName | null; // Trebbia: section where Mago's force enters this turn
}

/**
 * Scenario special rules (§14, §17). Expansion #1: `leaderLossCostsCard` and `allLeadersSuddenDeath` (112 Hellespont),
 * `frightAtFirstSight` (116 Heraclea), `tacticalFlexibility` (the optional Roman rule of 120, 121, 124, §17.3) and
 * `campCapture` (a side gains a banner for stopping on listed camp hexes: 011 Baecula, 114 Gabiene).
 */
export type SpecialRuleId =
  | 'sacredBand'
  | 'magoAmbush'
  | 'trasimenusHand'
  | 'beneventumHand'
  | 'castulo'
  | 'campCapture'
  | 'leaderLossCostsCard'
  | 'allLeadersSuddenDeath'
  | 'frightAtFirstSight'
  | 'tacticalFlexibility';

/** Camp-capture objective (rule `campCapture`): units of `side` stopping on one of `hexes` gain a banner, once per camp. */
export interface CampCapture {
  side: Side;
  /** Camp hexes that can be captured, ascending. */
  hexes: HexId[];
  /** Log line when a camp falls. */
  text: string;
}

export interface ScenarioSpecial {
  rules: SpecialRuleId[];
  /** Off-board reserve force (Trebbia: Mago's ambush). */
  reserveUnits: Unit[];
  reserveLeaders: Leader[];
  reserveSide: Side | null;
  reserveReleased: boolean;
  /** Turns completed per side (used by hand-growth rules and Mago). */
  turnsDone: Record<Side, number>;
  /** Camp-capture objective (Baecula, Gabiene); null without the `campCapture` rule. */
  campCapture: CampCapture | null;
  /** Camp hexes already captured. */
  campsCaptured: HexId[];
  /** Castulo: id of Publius Scipio. */
  sacredLeaderId: string | null;
  beneventumBonusGiven: boolean;
  /** Leaders each side had at the start (on the board, in reserve or still to be placed). */
  leadersAtStart: Record<Side, number>;
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
  terrain: TerrainType[]; // length ROWS*COLS
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
  | { kind: 'rally'; side: Side; faces: DieFace[] }
  | { kind: 'spartacus'; side: Side; faces: DieFace[] };

export type Answer =
  | { kind: 'playCard'; card: number }
  /** pieces: unit and/or leader ids. ambushSection: Trebbia - release Mago's force in that section instead. */
  | { kind: 'orders'; pieces: string[]; ambushSection?: SectionName }
  | { kind: 'move'; piece: string; to: HexId } // to = OFF_BOARD only for Castulo exits
  | { kind: 'endMove' }
  | { kind: 'attack'; unit: string; target: HexId }
  | { kind: 'endBattle' }
  | { kind: 'defend'; choice: 'stand' | 'evade' | 'firstStrike' }
  | { kind: 'ignoreFlags'; count: number }
  | { kind: 'choose'; index: number }
  | { kind: 'yesno'; yes: boolean }
  | { kind: 'hex'; hex: HexId | null } // null = decline
  /** One entry per die face: id of the unit (rally) or unit/leader (spartacus) it is used on, or null. */
  | { kind: 'assign'; ids: (string | null)[] };

// ---------------------------------------------------------------------------
// Events (engine -> UI animation queue / log)
// ---------------------------------------------------------------------------

export type RollPurpose =
  | 'ranged' | 'close' | 'battleBack' | 'firstStrike' | 'bonus' | 'evade'
  | 'leaderCheck' | 'escape' | 'rampage' | 'marsh' | 'rally' | 'spartacus';

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
  | { t: 'advance'; id: string; path: HexId[] }
  | { t: 'rampage'; id: string }
  | { t: 'rallied'; id: string; blocks: number }
  | { t: 'banner'; side: Side; total: number; reason: string }
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
