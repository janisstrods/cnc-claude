// The 15 base-game battles (001-015) and the 24 battles of Expansion #1, Greece & Eastern Kingdoms (101-124). Setups
// are transcribed data (src/scenarios/data); texts are original summaries (base game below, Expansion #1 in
// exp1-texts.ts).
import { ELITES } from '../engine/elites';
import type { GameOptions, ScenarioSetup, SideSetup, TerrainSetup } from '../engine/setup';
import type { LeaderTrait, Side, SpecialRuleId } from '../engine/types';
import { EXTRA_EXP1, type ScenarioTexts } from './exp1-texts';

/** Which box a battle comes from. */
export type Expansion = 'base' | 'exp1';

/**
 * A scenario file in src/scenarios/data. Base-game files omit `expansion` (and keep their special rules in `EXTRA`
 * below); Expansion #1 files carry their rules, options, camp objective and leaders to place themselves. Other fields of
 * a file (the base files' copied rule text, roster checks) are ignored.
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
  /** Optional rules the battle offers, with their default (Tactical Flexibility, §17.3). */
  options?: GameOptions;
  campCapture?: ScenarioSetup['campCapture'];
  /** `ford: 'nocap'` = fordable without dice caps; a rampart lists `faces` and/or `edges`. */
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

/** Texts and base-game rule data of a base battle (Expansion #1 battles keep their rules in the JSON). */
interface Extra extends ScenarioTexts {
  rules?: SpecialRuleId[];
  /** Camp-capture objective (with rule `campCapture`). */
  campCapture?: ScenarioSetup['campCapture'];
  patch?: (s: ScenarioSetup) => void;
}

const EXTRA: Record<string, Extra> = {
  '001': {
    blurb: "Himilco's Carthaginians besiege Akragas on Sicily's southern coast. Daphnaeus marches a Syracusan relief army to break the siege and offers battle beneath the city walls. The field is open and the armies are small: an ideal first battle.",
    hint: 'Introductory — open ground, small armies.',
  },
  '002': {
    blurb: "Timoleon's outnumbered Greeks catch a great Carthaginian army as it fords the Crimissos river. Carthage's elite Sacred Band, citizens of the noblest families, must hold while the rest of the host struggles across.",
    specialText: [
      'The Crimissos can only be forded at its five bends (shallow crossings); other river hexes are impassable.',
      'The Carthaginian Sacred Band (marked with a gold standard) scores a hit with every helmet in close combat and may ignore one flag.',
    ],
    rules: ['sacredBand'],
    hint: 'River crossing, elite Sacred Band.',
    patch: (s) => {
      // The Sacred Band is the Carthaginian heavy infantry at r3 c2; the ELITES type list guards against another unit type there.
      const sb = s.units.find((u) => u.side === 'top' && u.r === 3 && u.c === 2 && ELITES.carthSacredBand.types.includes(u.type));
      if (sb) sb.elite = 'carthSacredBand';
    },
  },
  '003': {
    blurb: "Regulus has invaded Africa and Carthage turns to a Spartan mercenary, Xanthippus. On open ground he unleashes a screen of war elephants against the Roman legions while his superior cavalry sweeps the wings.",
    hint: 'Elephants vs legions on open ground.',
  },
  '004': {
    blurb: "Hannibal has crossed the Alps. Near the Ticinus, his Numidian and Spanish horse collide with Publius Scipio's cavalry screen in a swirling mounted clash; the consul himself is wounded.",
    specialText: ['The Ticinus is not fordable.'],
    hint: 'All-cavalry skirmish.',
  },
  '005': {
    blurb: "Sempronius drives his cold, hungry legions across the icy Trebbia to attack Hannibal — straight past a ravine where Mago lies hidden with picked troops.",
    specialText: [
      'The Trebbia is fordable everywhere.',
      "Mago's ambush (1 medium cavalry, 2 warriors and Mago) waits off the board. After their first turn, the Carthaginians may play a Leadership card to bring the force onto the Roman baseline in that card's section (any section for Leadership Any Section). Entering counts as the first hex of movement.",
    ],
    rules: ['magoAmbush'],
    hint: 'Hidden ambush behind Roman lines.',
  },
  '006': {
    blurb: "Flaminius marches his column along the shore of Lake Trasimenus in the morning mist. Hannibal's army waits on the hills above, and the trap is sprung before the Romans can form line.",
    specialText: [
      'Lake Trasimenus and the steep hills are impassable.',
      'The Roman column is caught unprepared: the Romans start with 2 command cards and draw 2 cards after each of their first two turns, growing to a hand of 4.',
    ],
    rules: ['trasimenusHand'],
    hint: 'Ambush — the Romans start disorganised.',
    patch: (s) => {
      s.initialCommand = { bottom: 2 };
      if (!s.leaders.some((l) => l.side === 'bottom' && l.r === 8 && l.c === 9)) {
        s.leaders.push({ side: 'bottom', name: 'Legate', r: 8, c: 9 });
      }
    },
  },
  '007': {
    blurb: "Varro packs eight legions into a deep, narrow mass and drives at the Carthaginian centre. Hannibal's Gauls and Spaniards give ground while his African veterans and cavalry wait on the wings for the double envelopment.",
    hint: 'The classic encirclement.',
  },
  '008': {
    blurb: "On the Ebro, the Scipio brothers meet Hasdrubal Barca. Hasdrubal's Spanish centre is weak and his elephants few; if the legions break through, Carthage's hold on Spain is shaken.",
    hint: 'Roman legions vs a thin Carthaginian line.',
  },
  '009': {
    blurb: "Tiberius Gracchus leads legions of freed slave-volunteers against Hanno near Beneventum, promising liberty to every man who brings back an enemy head.",
    specialText: [
      'The Calor river is not fordable.',
      'When the Romans capture their 3rd banner they immediately draw 2 cards and hold 6 command cards for the rest of the battle.',
    ],
    rules: ['beneventumHand'],
    hint: 'Roman command grows as they win.',
  },
  '010': {
    blurb: "Publius Scipio, deep in Spain with his army divided, is caught by Hasdrubal Gisgo, Mago and the Numidian prince Masinissa near Castulo. His only hope is to cut through before he is surrounded.",
    specialText: [
      'If Publius Scipio is killed, Carthage wins immediately.',
      "A Roman unit that exits the battlefield over the Carthaginian baseline from a centre or Roman-right hex scores a banner and is removed.",
    ],
    rules: ['castulo'],
    hint: 'Break out or die; protect Scipio.',
    patch: (s) => {
      s.sacredLeader = { side: 'bottom', name: 'Scipio' };
    },
  },
  '011': {
    blurb: "Hasdrubal Barca holds a strong ridge at Baecula, his camps behind it. The young Scipio pins him with light troops and swings his legions around both flanks.",
    specialText: ['A Roman unit that ends its move in a Carthaginian camp hex gains a banner (each camp only once).'],
    rules: ['campCapture'],
    // every camp on the board is Carthaginian; the Romans (bottom) capture them
    campCapture: { side: 'bottom', text: 'The Romans storm a Carthaginian camp!' },
    hint: 'Assault the ridge and the camps.',
  },
  '012': {
    blurb: "Hasdrubal has crossed the Alps to join his brother, but the consul Nero has secretly force-marched north. Trapped against the Metaurus, the Carthaginian army must fight two consular armies at once.",
    specialText: ['Both streams are fordable.'],
    hint: 'Rough terrain, two streams.',
  },
  '013': {
    blurb: "At Ilipa Scipio reverses his usual deployment, placing his Spanish allies in the centre and his legions on the wings — then strikes the Carthaginian flanks before Hasdrubal Gisgo can react.",
    hint: 'Large open battle, elephants.',
  },
  '014': {
    blurb: "After burning the Carthaginian camps by night, Scipio meets the rebuilt army of Hasdrubal Gisgo and Syphax on the Great Plains. His veteran legions and Masinissa's horse face fresh Celtiberian mercenaries.",
    hint: 'Veterans vs mercenaries.',
  },
  '015': {
    blurb: "The decisive battle of the Second Punic War. Hannibal's eighty elephants open the attack, but Scipio has drawn up his maniples in lanes to let them pass, and Masinissa's Numidians now ride for Rome.",
    hint: 'The finale — elephants, three lines.',
  },
};

const EXPANSIONS: Expansion[] = ['base', 'exp1'];

const copyLeader = <T extends { traits?: LeaderTrait[] }>(l: T): T => (l.traits ? { ...l, traits: [...l.traits] } : { ...l });

/** A terrain entry with only the fields it has (so `ford: 'nocap'`, `faces` and `edges` survive unchanged). */
function copyTerrain(t: TerrainSetup): TerrainSetup {
  const o: TerrainSetup = { r: t.r, c: t.c, t: t.t };
  if (t.ford !== undefined) o.ford = t.ford;
  if (t.faces !== undefined) o.faces = t.faces;
  if (t.edges !== undefined) o.edges = [...t.edges];
  return o;
}

function copyCamp(cc: NonNullable<ScenarioSetup['campCapture']>): NonNullable<ScenarioSetup['campCapture']> {
  const o: NonNullable<ScenarioSetup['campCapture']> = { side: cc.side };
  if (cc.hexes) o.hexes = cc.hexes.map(([r, c]) => [r, c]);
  if (cc.text !== undefined) o.text = cc.text;
  return o;
}

/** One value given by the JSON or by `EXTRA`, never both. */
function oneSource<T>(id: string, field: string, json: T | undefined, extra: T | undefined): T | undefined {
  if (json !== undefined && extra !== undefined) throw new Error(`${field} is given twice, in the JSON and in EXTRA (${id})`);
  return json ?? extra;
}

/** Build a scenario from its JSON data and texts. The setup is a copy: nothing in it shares the JSON's objects. */
export function scenarioFromJson(j: ScenarioJson): ScenarioInfo {
  const expansion = j.expansion ?? 'base';
  if (!EXPANSIONS.includes(expansion)) throw new Error(`unknown expansion ${String(j.expansion)} (${j.id})`);
  const ex: Extra | undefined = EXTRA[j.id];
  const texts: ScenarioTexts | undefined = ex ?? EXTRA_EXP1[j.id];
  const setup: ScenarioSetup = {
    id: j.id,
    name: j.name,
    top: { army: j.top.army, blocks: j.top.blocks, look: j.top.look, commander: j.top.commander, cards: j.top.cards },
    bottom: { army: j.bottom.army, blocks: j.bottom.blocks, look: j.bottom.look, commander: j.bottom.commander, cards: j.bottom.cards },
    first: j.first,
    banners: j.banners,
    terrain: j.terrain.map(copyTerrain),
    units: j.units.map((u) => ({ ...u })),
    leaders: j.leaders.map(copyLeader),
    reserves: j.reserves.map((u) => ({ ...u })),
    reserveLeaders: j.reserveLeaders.map(copyLeader),
    rules: [...(oneSource(j.id, 'rules', j.rules, ex?.rules) ?? [])],
  };
  const camp = oneSource(j.id, 'campCapture', j.campCapture, ex?.campCapture);
  if (camp) setup.campCapture = copyCamp(camp);
  if (j.options && Object.keys(j.options).length) setup.options = { ...j.options };
  if (j.placeLeaders?.length) setup.placeLeaders = j.placeLeaders.map(copyLeader);
  // Trasimenus: the Roman column starts with 4 cards eventually; War Council lists 2 initially.
  if (j.id === '006') setup.bottom.cards = 4;
  ex?.patch?.(setup);
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
