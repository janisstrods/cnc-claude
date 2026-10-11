// The 15 base-game battles (001-015), the 24 battles of Expansion #1, Greece & Eastern Kingdoms (101-124), the 23
// battles of Expansion #2, Rome & the Barbarians (201-223), and the 19 battles of Expansion #3, The Roman Civil Wars
// (301-319). Setups, rules included, are transcribed data (src/scenarios/data); texts are original summaries, one module
// per box (base-texts.ts, exp1-texts.ts, exp2-texts.ts, exp3-texts.ts).
import type { GameOptions, ObjectiveSetup, ScenarioSetup, SideSetup, TerrainSetup } from '../engine/setup';
import type { LeaderTrait, Side, SpecialRuleId } from '../engine/types';
import { BASE_TEXTS, type ScenarioTexts } from './base-texts';
import { EXP1_TEXTS } from './exp1-texts';
import { EXP2_TEXTS } from './exp2-texts';
import { EXP3_TEXTS } from './exp3-texts';

/** Which box a battle comes from. */
export type Expansion = 'base' | 'exp1' | 'exp2' | 'exp3';

/**
 * A scenario file in src/scenarios/data: the whole setup, rules included (rules, options, objectives, legions, commands,
 * leaders to place, the starting Command and hand growth, the sacred leader, elites; Expansion #3 also its sides' dice
 * orders, forced placements, immobile units and terrain hints). Base-game files omit `expansion`. Other fields of a file
 * (the base files' copied rule text, roster checks) are ignored, except the retired `campCapture` (now an objective),
 * which is an error.
 */
export interface ScenarioJson {
  id: string;
  name: string;
  year: string;
  expansion?: Expansion;
  top: SideSetup;
  bottom: SideSetup;
  first: Side;
  banners: number;
  rules?: SpecialRuleId[];
  /**
   * Ambush reserve (§18.5): `{}` = the Trebbia defaults (005); 206 Aquae Sextiae's triggers and text; 308's fixed
   * `entryHexes`, `noMove` and `attachLeader` (§18.9). Left out: no ambush.
   */
  ambush?: ScenarioSetup['ambush'];
  /** Forced placements after the ambush (308 Gergovia's Roman MI, §18.9). */
  placeUnits?: ScenarioSetup['placeUnits'];
  /** Optional rules the battle offers, with their default (Tactical Flexibility, §17.3). */
  options?: GameOptions;
  /** Roman Tactical Flexibility (120, 121, 124, §17.3): the Roman side; `options` makes it a player's choice. */
  tacticalFlexibility?: Side;
  /** Fright at First Sight (116 Heraclea, §17.4): the side (the Romans) whose infantry ignores no elephant flag. */
  frightAtFirstSight?: Side;
  /** Battle objectives (camp capture, exits, §18.4). */
  objectives?: ObjectiveSetup[];
  /** Legion rule per side (§18.2): Marius for the Romans of 206-223 and both armies of 301-305, Julian in 306-319 but 310. */
  legions?: ScenarioSetup['legions'];
  /** Starting Command of a side when not its `cards` (006 Trasimenus: the Romans start with 2 of their 4). */
  initialCommand?: ScenarioSetup['initialCommand'];
  /**
   * Hand growth of one side (006 Trasimenus, 313 Brindisi Raid, §18.8): it draws 2 and grows by 1 while its Command is
   * below `to`.
   */
  handGrowth?: ScenarioSetup['handGrowth'];
  /** The Command bonus at a banner count (009 2nd Beneventum: the Romans hold 6 cards from their 3rd banner, §14). */
  commandBonus?: ScenarioSetup['commandBonus'];
  /** The leader whose loss loses the battle (010 Castulo's Publius Scipio). */
  sacredLeader?: ScenarioSetup['sacredLeader'];
  /** Separate commands (210 Picenum, §18.5); units and leaders name theirs with `command`. */
  commands?: ScenarioSetup['commands'];
  /** Rolling Fire (210 Picenum, §18.5): the side whose infantry on hills may roll burning logs. */
  rollingFire?: ScenarioSetup['rollingFire'];
  /** Rampart breakers (223 Medway, §18.6): the side whose units remove the ramparts they enter or pass through. */
  rampartBreakers?: ScenarioSetup['rampartBreakers'];
  /** Last-row retreat (214 Silarus, §18.5): the side whose unit is eliminated by a retreat that ends on its baseline row. */
  lastRowRetreat?: ScenarioSetup['lastRowRetreat'];
  /**
   * `ford: 'nocap'` = fordable without dice caps; `{ t: 'sea', ford: true }` = a coast played as a fordable river (217);
   * `art` = a drawing hint the engine ignores; a rampart lists `faces` and/or `edges`.
   */
  terrain: TerrainSetup[];
  units: ScenarioSetup['units'];
  leaders: ScenarioSetup['leaders'];
  /** Leaders placed before the first turn, in placement order (117 Asculum). */
  placeLeaders?: ScenarioSetup['placeLeaders'];
  reserves: ScenarioSetup['reserves'];
  reserveLeaders: ScenarioSetup['reserveLeaders'];
}

export interface ScenarioInfo {
  id: string;
  name: string;
  year: string;
  expansion: Expansion;
  /** Short original summary of the historical battle. */
  blurb: string;
  /** Plain-language special rules shown in the briefing. */
  specialText: string[];
  setup: ScenarioSetup;
  difficultyHint: string;
}

const files = import.meta.glob<ScenarioJson>('./data/*.json', { eager: true, import: 'default' });

/** The briefing texts of each box, by battle id. */
const TEXTS: Record<Expansion, Record<string, ScenarioTexts>> = { base: BASE_TEXTS, exp1: EXP1_TEXTS, exp2: EXP2_TEXTS, exp3: EXP3_TEXTS };

const copyLeader = <T extends { traits?: LeaderTrait[] }>(l: T): T => (l.traits ? { ...l, traits: [...l.traits] } : { ...l });

/**
 * A terrain entry with only the fields it has (so `ford: 'nocap'`, `faces`, `edges`, the hill under a camp or wall and the
 * art hint survive unchanged).
 */
function copyTerrain(t: TerrainSetup): TerrainSetup {
  const o: TerrainSetup = { r: t.r, c: t.c, t: t.t };
  if (t.ford !== undefined) o.ford = t.ford;
  if (t.faces !== undefined) o.faces = t.faces;
  if (t.edges !== undefined) o.edges = [...t.edges];
  if (t.hill !== undefined) o.hill = t.hill;
  if (t.art !== undefined) o.art = t.art;
  return o;
}

/** A side of the battle: its army, and its cards or its dice orders (`orders`, `orderDice`; 310, §18.10) when it has them. */
function copySide(ss: SideSetup): SideSetup {
  const o: SideSetup = { army: ss.army, blocks: ss.blocks, look: ss.look, commander: ss.commander, cards: ss.cards };
  if (ss.orders !== undefined) o.orders = ss.orders; // the engine rejects an unknown mode
  if (ss.orderDice !== undefined) o.orderDice = ss.orderDice; // and a bad count
  return o;
}

/** An objective with its lists copied (hexes, banners, sides). */
function copyObjective(o: ObjectiveSetup): ObjectiveSetup {
  const out: Record<string, unknown> = { ...o };
  for (const [k, v] of Object.entries(o)) if (Array.isArray(v)) out[k] = v.map((x: unknown) => (Array.isArray(x) ? [...x] : x));
  return out as ObjectiveSetup;
}

/** A plain object copied (its values are plain); anything else as it is, for the engine to reject. */
const copyObject = <T>(v: T): T => (typeof v === 'object' && v !== null && !Array.isArray(v) ? { ...v } : v);

/** A list of `[r, c]` hexes copied pair by pair (anything else is left for the engine to reject). */
const copyHexes = <T>(v: T): T => (Array.isArray(v) ? (v.map((x: unknown) => (Array.isArray(x) ? [...x] : x)) as T) : v);

/** Build a scenario from its JSON data and texts. The setup is a copy: nothing in it shares the JSON's objects. */
export function scenarioFromJson(j: ScenarioJson): ScenarioInfo {
  const expansion = j.expansion ?? 'base';
  if (!Object.prototype.hasOwnProperty.call(TEXTS, expansion)) throw new Error(`unknown expansion ${String(j.expansion)} (${j.id})`);
  const texts: ScenarioTexts | undefined = TEXTS[expansion][j.id];
  const setup: ScenarioSetup = {
    id: j.id,
    name: j.name,
    top: copySide(j.top),
    bottom: copySide(j.bottom),
    first: j.first,
    banners: j.banners,
    terrain: j.terrain.map(copyTerrain),
    units: j.units.map((u) => ({ ...u })),
    leaders: j.leaders.map(copyLeader),
    reserves: j.reserves.map((u) => ({ ...u })),
    reserveLeaders: j.reserveLeaders.map(copyLeader),
    rules: [...(j.rules ?? [])],
  };
  if ((j as { campCapture?: unknown }).campCapture !== undefined) throw new Error(`campCapture is now a capture objective in objectives (${j.id})`);
  if (j.objectives?.length) setup.objectives = j.objectives.map(copyObjective);
  if (j.ambush) {
    setup.ambush = { ...j.ambush, ...(j.ambush.trigger ? { trigger: [...j.ambush.trigger] } : {}) };
    if (j.ambush.entryHexes !== undefined) setup.ambush.entryHexes = copyHexes(j.ambush.entryHexes);
  }
  if (j.placeUnits !== undefined) {
    // the engine rejects a non-list and bad entries
    setup.placeUnits = Array.isArray(j.placeUnits) ? j.placeUnits.map((p) => ({ ...p, hexes: copyHexes(p.hexes) })) : j.placeUnits;
  }
  if (j.options && Object.keys(j.options).length) setup.options = { ...j.options };
  if (j.legions && Object.keys(j.legions).length) setup.legions = { ...j.legions };
  if (j.initialCommand !== undefined) setup.initialCommand = copyObject(j.initialCommand);
  if (j.handGrowth !== undefined) setup.handGrowth = copyObject(j.handGrowth);
  if (j.commandBonus !== undefined) setup.commandBonus = copyObject(j.commandBonus);
  if (j.sacredLeader !== undefined) setup.sacredLeader = copyObject(j.sacredLeader);
  if (j.frightAtFirstSight !== undefined) setup.frightAtFirstSight = j.frightAtFirstSight; // the engine rejects an unknown side
  if (j.tacticalFlexibility !== undefined) setup.tacticalFlexibility = j.tacticalFlexibility; // likewise
  if (j.commands !== undefined) setup.commands = Array.isArray(j.commands) ? j.commands.map((c) => ({ ...c })) : j.commands; // the engine rejects a non-list
  if (j.rollingFire !== undefined) setup.rollingFire = j.rollingFire; // the engine rejects an unknown side
  if (j.rampartBreakers !== undefined) setup.rampartBreakers = j.rampartBreakers; // likewise
  if (j.lastRowRetreat !== undefined) setup.lastRowRetreat = j.lastRowRetreat; // likewise
  if (j.placeLeaders?.length) setup.placeLeaders = j.placeLeaders.map(copyLeader);
  return {
    id: j.id,
    name: j.name,
    year: j.year,
    expansion,
    blurb: texts?.blurb ?? '',
    specialText: texts?.specialText ?? [],
    setup,
    difficultyHint: texts?.hint ?? '',
  };
}

/**
 * Build every scenario file (path -> JSON), sorted by id. A malformed file throws an Error naming the file and its id,
 * with the original error as `cause`.
 */
export function scenariosFromFiles(byPath: Record<string, ScenarioJson>): ScenarioInfo[] {
  return Object.entries(byPath)
    .map(([path, json]) => {
      try {
        return scenarioFromJson(json);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const id = json && typeof json === 'object' && typeof json.id === 'string' ? json.id : undefined;
        const named = id !== undefined && msg.includes(`(${id})`);
        throw new Error(`scenario file ${path}${id !== undefined && !named ? ` (${id})` : ''}: ${msg}`, { cause: e });
      }
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export const SCENARIOS: ScenarioInfo[] = scenariosFromFiles(files);

export function scenarioById(id: string): ScenarioInfo {
  const s = SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown scenario ${id}`);
  return s;
}
