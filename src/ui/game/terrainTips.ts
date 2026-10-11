// Terrain effects for the hex hover tooltip: what each terrain does to movement, combat and line of sight, worded for
// the player (rules-reference §4, §7–§10, §16, §18.6, §18.7), with the variants of single battles.
import { directionTo, isFord, isHill, neighbours, steepSlope, terrainAt, veryHills, type GameState, type HexId, type TerrainType } from '../../engine';
import { terrainName } from '../terrain';
import { rampartSidesText } from './uiModel';

/** What an effect line is about: movement, combat, line of sight, or a rule of this battle only. */
export type TipKind = 'move' | 'combat' | 'sight' | 'battle';

/** The label shown before the first line of each kind. */
export const TIP_KIND_LABEL: Record<TipKind, string> = { move: 'Move', combat: 'Combat', sight: 'Sight', battle: 'Battle' };

export interface TipLine {
  kind: TipKind;
  text: string;
}

/**
 * The terrain block of a hex's tooltip: its name, the swatch (`t`, `ford` and `art` as `TerrainIcon` takes them) and the
 * effect lines, in the order move, combat, sight, battle.
 */
export interface TerrainTip {
  name: string;
  t: TerrainType;
  ford: boolean;
  art?: string;
  /** A hill under the hex's camp or wall (308, §18.7): the swatch draws it too. */
  hill?: boolean;
  lines: TipLine[];
}

const move = (text: string): TipLine => ({ kind: 'move', text });
const combat = (text: string): TipLine => ({ kind: 'combat', text });
const sight = (text: string): TipLine => ({ kind: 'sight', text });
const battle = (text: string): TipLine => ({ kind: 'battle', text });

const NO_EFFECT = 'No effect';
const STOPS_ALL = 'Stops every unit and lone leader entering it';
const IMPASSABLE = move('Impassable');
const BLOCKS = sight('Blocks line of sight');
const CLEAR = sight('Does not block line of sight');
const HILL_SIGHT = sight('Blocks line of sight, unless firer and target stand on the same hill');
/** No momentum advance out of a marsh or a ford after moving (§9.6). */
const ADVANCE_OUT = combat('A unit here may advance out after combat only if it did not move this turn');
/** Heavy war machines (§15): only in the battles that field one. */
const NO_HWM = move('Heavy war machines may not enter');
/** A fortified camp's protection of foot (§4), also on a camp on a hill (§18.7). */
const CAMP_FOOT = combat('Foot here ignore 1 sword and may ignore 1 flag');

const FORD: readonly TipLine[] = [move(STOPS_ALL), combat('Close combat in or out: max 2 dice. Firing out: max 1 die'), ADVANCE_OUT, CLEAR];
/** The Pinarus at Issus (108, §16): a ford without the dice caps. */
const NOCAP_FORD: readonly TipLine[] = [move(STOPS_ALL), combat('No dice limits in or out'), ADVANCE_OUT, CLEAR];
/** The coast played as a ford (217, §18.6). */
const COAST = battle('A stretch of coast played as a fordable river');
/** Very steep hills (223, §18.6): replace the hill lines. */
const VERY_STEEP: readonly TipLine[] = [
  move('A unit climbing onto it from lower ground stops and may not battle this turn'),
  combat('Battling up onto it: max 1 die. From it down: max 2. Hill to hill: max 3'),
  combat('A unit advancing up onto it after combat gets no bonus combat'),
  HILL_SIGHT,
];

/**
 * Effects of each terrain as most battles play it (`terrainTip` swaps in the variants). Open ground and off-board have
 * none, so they get no tip. A new terrain type needs its lines here.
 */
const EFFECTS: Record<TerrainType, readonly TipLine[]> = {
  plain: [],
  void: [],
  hill: [
    move(NO_EFFECT),
    combat('Battling up onto it from lower ground: max 2 dice'),
    combat('Battling from it: foot max 3 dice, mounted max 2'),
    HILL_SIGHT,
  ],
  forest: [
    move(STOPS_ALL),
    move('After entering it, only light foot, auxilia and warriors may battle that turn'),
    combat('Close combat in or out: max 2 dice. Firing into it: max 1 die'),
    BLOCKS,
  ],
  marsh: [
    move(`${STOPS_ALL}. Leaving it, a unit or lone leader moves only 1 hex`),
    move('A unit entering it (also by retreat or advance) rolls 1 die and loses a block on its own symbol; a lone leader dies on a helmet'),
    NO_HWM,
    combat('Close combat in or out: max 2 dice. Firing out: max 1 die'),
    ADVANCE_OUT,
    CLEAR,
  ],
  broken: [
    move('Stops mounted units and lone leaders entering it; a mounted unit that enters may not battle that turn'),
    NO_HWM,
    combat('Close combat in or out: max 2 dice'),
    CLEAR,
  ],
  river: [IMPASSABLE, CLEAR], // a fordable river: FORD
  lake: [IMPASSABLE, CLEAR],
  sea: [IMPASSABLE, CLEAR],
  steep: [IMPASSABLE, BLOCKS],
  camp: [
    move(NO_EFFECT),
    combat('A unit here rolls 1 die fewer when it battles'),
    CAMP_FOOT,
    BLOCKS,
  ],
  rampart: [move(NO_EFFECT), CLEAR], // `rampartLines` adds the protected sides
  ditch: [move(STOPS_ALL), combat(NO_EFFECT), CLEAR],
  // the scalable city wall (308, 309, §18.7)
  wall: [
    move('Foot (not war machines) and lone leaders only, by a move from a hex next to it; the move ends there'),
    move('Moving off it: at most 1 hex'),
    move('Mounted units and war machines never enter it, not even by retreat or advance'),
    combat('Close combat with a unit here: max 2 dice, card and leader bonuses on top'),
    combat('Foot defending here strike first (not against an attacker also on a wall), ignore 1 sword and may ignore 1 flag (1 flag against missiles)'),
    combat('Mounted units and war machines attack a unit here only if they began the turn next to it'),
    sight('Blocks line of sight, except between units on the same wall'),
  ],
};

/** The hill lines that also hold under a camp or wall (§18.7): the hill caps on close combat. */
const HILL_COMBAT = EFFECTS.hill.filter((x) => x.kind === 'combat');

/**
 * A camp or city wall standing on a hill (308, §18.7): both sets of lines. The camp's −1 die comes after the hill limit;
 * the wall's 2 dice are never above a hill's limit. Both block line of sight even between units on the same hill (a wall
 * still lets units on it see along it).
 */
function hillUnderLines(t: 'camp' | 'wall'): TipLine[] {
  if (t === 'camp') {
    return [
      move(NO_EFFECT),
      ...HILL_COMBAT,
      combat('A unit here rolls 1 die fewer when it battles, after the hill limit'),
      CAMP_FOOT,
      sight('Blocks line of sight, also between units on the same hill'),
    ];
  }
  return [
    ...EFFECTS.wall.filter((x) => x.kind !== 'sight'),
    combat('A hill too: its limits are never below the wall\'s 2 dice'),
    sight('Blocks line of sight, also on the same hill, except between units on the same wall'),
  ];
}

/**
 * Steep slopes (308, rule `steepSlopes`, §18.7): the hexsides of `h` between a hill (or a camp or wall on a hill) and a
 * forest, as a mask in HEX_DIRS order, or 0.
 */
function slopeMask(s: GameState, h: HexId): number {
  let mask = 0;
  for (const n of neighbours(h)) if (steepSlope(s, h, n)) mask |= 1 << directionTo(h, n);
  return mask;
}

/** The battle line of a hex on a steep slope (308): which of its hexsides, and what they forbid, from the hill or the forest. */
function slopeLines(s: GameState, h: HexId, flipped: boolean): TipLine[] {
  const mask = slopeMask(s, h);
  if (!mask) return [];
  const sides = rampartSidesText(mask, flipped);
  return [
    battle(isHill(s, h)
      ? `Steep slope down to the forest across ${sides}: no climbing up from there, and no close combat across it either way`
      : `Steep slope up to the hill across ${sides}: no move, advance, retreat or evade up it, and no close combat across it either way`),
  ];
}

/** A rampart's lines (§16): its protected sides as the viewer sees them, and who tears it down (223, §18.6). */
function rampartLines(s: GameState, h: HexId, flipped: boolean): TipLine[] {
  const [first, ...rest] = EFFECTS.rampart;
  const sides = rampartSidesText(s.rampart[h], flipped);
  const lines = [
    first,
    combat(`Protects ${sides}: foot here ignore 1 sword and may ignore 1 flag when attacked across them, 1 flag when fired at through them`),
    ...rest,
  ];
  const breakers = s.special.rampartBreakers;
  if (breakers) lines.push(battle(`Torn down when a ${s.players[breakers].army} unit enters or passes through it`));
  return lines;
}

/**
 * The terrain block of the tooltip for hex `h`, or null on open ground and off the board. `flipped`: the human commands
 * the top army, so a rampart's sides turn by 180°. `art`: the hex's art (`scenarioArt`), which tells a coast played as a
 * ford (217) from a river.
 */
export function terrainTip(s: GameState, h: HexId, flipped: boolean, art?: string): TerrainTip | null {
  const t = terrainAt(s, h);
  if (!EFFECTS[t].length) return null;
  const ford = isFord(s, h);
  const noCap = !!s.noCap[h];
  // a camp or wall on a hill (308): named, drawn and explained as both
  const hill = (t === 'camp' || t === 'wall') && !!s.hillUnder[h];
  const tip = (lines: readonly TipLine[], name = terrainName(t, ford, noCap, art, hill)): TerrainTip => ({
    name, t, ford, art, ...(hill ? { hill } : {}), lines: [...lines, ...slopeLines(s, h, flipped)],
  });
  if (t === 'hill' && veryHills(s)) return tip(VERY_STEEP, 'Very Steep Hill');
  if (t === 'river' && ford) return tip(art === 'coast' ? [...FORD, COAST] : noCap ? NOCAP_FORD : FORD);
  if (t === 'rampart') return tip(rampartLines(s, h, flipped));
  const hwm = s.units.some((u) => u.type === 'HWM');
  const lines = hill ? hillUnderLines(t) : hwm ? EFFECTS[t] : EFFECTS[t].filter((x) => x !== NO_HWM);
  // a city wall bars war machines in its own lines: they are left out where no war machine takes the field (309)
  return tip(t === 'wall' && !hwm ? lines.map(noMachines) : lines);
}

/** A wall line without its war machines, in a battle that fields none (309). */
function noMachines(x: TipLine): TipLine {
  const text = x.text.replace('Foot (not war machines)', 'Foot').replace('Mounted units and war machines', 'Mounted units');
  return text === x.text ? x : { ...x, text };
}
