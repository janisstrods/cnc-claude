// Expected setup of each Expansion #1 battle (101-124), checked by exp1.test.ts. The values come from the imported
// scenario files and were cross-checked against the unit tables, card counts, first player, blocks and banners in
// design/exp1-survey.md. They agree except where official errata or rulings override the scenario page:
// - 107 Granicus: Persian MI 2 / MC 3 (the page table); the map draws the two satrap units as MI.
// - 117 Asculum: 6 banners; the four leaders are placed before the first turn (Romans first), so none is on the board.
// - 121 Magnesia: the Seleucids use Greek blocks and field the camel the map shows (the table omits it).
// Leader names follow the maps, with the fixes recorded in design/exp1-scenario-notes.md (Alcetas, Peucestas,
// Nicarchus, Flamininus); names given to leaders the maps leave unnamed are plausible picks, not sources.
//
// `terrain` and `checksum` fingerprint the board (see checksum.ts): a tally of terrain hexes by type, river crossing and
// rampart edge, and one checksum over every terrain hex and one over every unit and leader position and elite. They
// were generated from the verified data files, so a moved piece, a changed terrain hex or ford, or a moved elite shows.
import type { GameOptions } from '../../src/engine/setup';
import type { ArmyLook, Blocks, EliteId, Side, SpecialRuleId, UnitType } from '../../src/engine/types';
import type { Checksums, TerrainTally } from './checksum';

type PerSide<T> = Record<Side, T>;

export interface BattleManifest {
  name: string;
  year: string;
  banners: number;
  first: Side;
  armies: PerSide<string>;
  commanders: PerSide<string>;
  cards: PerSide<number>;
  blocks: PerSide<Blocks>;
  looks: PerSide<ArmyLook>;
  /** Leaders on the board at setup, per side, in file order. */
  leaders: PerSide<string[]>;
  /** Leaders placed before the first turn, in placement order (117). */
  placeLeaders?: [Side, string][];
  /** Units per side and type. */
  units: PerSide<Partial<Record<UnitType, number>>>;
  /** Elite units: [side, preset, unit type], in file order. */
  elites: [Side, EliteId, UnitType][];
  rules: SpecialRuleId[];
  /** Optional rules the battle offers, with their default. */
  options?: GameOptions;
  /** Terrain hexes by type (plain excluded), river crossing and rampart edge. */
  terrain: TerrainTally;
  /** FNV-1a checksums of the terrain and of the unit and leader positions. */
  checksum: Checksums;
}

export const MANIFEST: Record<string, BattleManifest> = {
  '101': {
    name: 'Marathon', year: '490 BC', banners: 6, first: 'top',
    armies: { top: 'Greek', bottom: 'Persian' },
    commanders: { top: 'Callimachus', bottom: 'Datis' },
    cards: { top: 6, bottom: 5 }, blocks: { top: 'grk', bottom: 'eas' },
    looks: { top: 'athenian', bottom: 'persian' },
    leaders: { top: ['Callimachus', 'Miltiades'], bottom: ['Datis', 'Artaphernes'] },
    units: {
      top: { LI: 2, AX: 3, MI: 2, HI: 4 },
      bottom: { LI: 2, LB: 3, AX: 6, MI: 2, MC: 2 },
    },
    elites: [], rules: [],
    terrain: { types: { sea: 8, steep: 9, river: 9 }, rivers: { ford: 9, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '7edbb5e3', pieces: '12fe0a62' },
  },
  '102': {
    name: 'Himera', year: '480 BC', banners: 6, first: 'bottom',
    armies: { top: 'Carthaginian', bottom: 'Syracusan' },
    commanders: { top: 'Hamilcar', bottom: 'Gelon' },
    cards: { top: 5, bottom: 5 }, blocks: { top: 'car', bottom: 'grk' },
    looks: { top: 'carthaginian', bottom: 'syracusan' },
    leaders: { top: ['Terillus', 'Hamilcar'], bottom: ['Eumachus', 'Gelon', 'Theron'] },
    units: {
      top: { LI: 3, LS: 1, AX: 5, WA: 1, MI: 3, HI: 1, LC: 1, HCH: 1 },
      bottom: { LI: 1, LS: 1, MI: 6, HI: 3, MC: 3 },
    },
    elites: [], rules: [],
    terrain: { types: { rampart: 7, sea: 5, camp: 3 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 7, edges: 14 } },
    checksum: { terrain: '25ad0387', pieces: 'faa8ff23' },
  },
  '103': {
    name: 'Plataea', year: '479 BC', banners: 5, first: 'top',
    armies: { top: 'Greek', bottom: 'Persian' },
    commanders: { top: 'Pausanias', bottom: 'Mardonius' },
    cards: { top: 6, bottom: 5 }, blocks: { top: 'grk', bottom: 'eas' },
    looks: { top: 'athenian', bottom: 'persian' },
    leaders: { top: ['Pausanias', 'Aristides', 'Myronides'], bottom: ['Mardonius', 'Artabazus'] },
    units: {
      top: { LI: 2, LB: 1, AX: 2, MI: 4, HI: 3 },
      bottom: { LB: 3, AX: 5, MI: 3, LC: 1, MC: 3 },
    },
    elites: [], rules: [],
    terrain: { types: { hill: 6 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: 'ff667d41', pieces: '30df2c9f' },
  },
  '104': {
    name: 'Leuctra', year: '371 BC', banners: 4, first: 'top',
    armies: { top: 'Theban', bottom: 'Spartan' },
    commanders: { top: 'Epaminondas', bottom: 'Cleombrotos' },
    cards: { top: 6, bottom: 5 }, blocks: { top: 'grk', bottom: 'eas' },
    looks: { top: 'theban', bottom: 'spartan' },
    leaders: { top: ['Epaminondas'], bottom: ['Cleombrotos'] },
    units: {
      top: { AX: 3, MI: 4, HI: 2, MC: 2 },
      bottom: { AX: 4, MI: 6, HI: 1, MC: 1 },
    },
    elites: [['top', 'thebanSacredBand', 'MI']], rules: [],
    terrain: { types: {}, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '811c9dc5', pieces: 'b0d9a288' },
  },
  '105': {
    name: 'Mantinea', year: '362 BC', banners: 6, first: 'top',
    armies: { top: 'Theban', bottom: 'Spartan' },
    commanders: { top: 'Epaminondas', bottom: 'Agesilaus' },
    cards: { top: 5, bottom: 5 }, blocks: { top: 'grk', bottom: 'eas' },
    looks: { top: 'theban', bottom: 'spartan' },
    leaders: { top: ['Epaminondas', 'Daiphantus'], bottom: ['Hegesilios', 'Agesilaus', 'Archidamus'] },
    units: {
      top: { LI: 3, MI: 4, HI: 4, MC: 3 },
      bottom: { LI: 2, MI: 4, HI: 3, MC: 2 },
    },
    elites: [], rules: [],
    terrain: { types: { hill: 10, forest: 3 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '899b6e0e', pieces: '85dc7367' },
  },
  '106': {
    name: 'Crocus Plain', year: '352 BC', banners: 6, first: 'top',
    armies: { top: 'Macedonian', bottom: 'Phocian' },
    commanders: { top: 'Philip II', bottom: 'Onomarchus' },
    cards: { top: 5, bottom: 5 }, blocks: { top: 'grk', bottom: 'eas' },
    looks: { top: 'macedonian', bottom: 'phocian' },
    leaders: { top: ['Philip II', 'Antipater', 'Parmenio'], bottom: ['Onomarchus', 'Mnaseas'] },
    units: {
      top: { LI: 2, LB: 1, AX: 3, MI: 1, HI: 2, MC: 2, HC: 1 },
      bottom: { LI: 2, LB: 1, LS: 1, AX: 2, MI: 4, LC: 1 },
    },
    elites: [], rules: [],
    terrain: { types: { lake: 11 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: 'fff82d48', pieces: '4213215d' },
  },
  '107': {
    name: 'Granicus', year: '334 BC', banners: 6, first: 'top',
    armies: { top: 'Macedonian', bottom: 'Persian' },
    commanders: { top: 'Alexander', bottom: 'Mithridates' },
    cards: { top: 6, bottom: 4 }, blocks: { top: 'grk', bottom: 'eas' },
    looks: { top: 'macedonian', bottom: 'persian' },
    leaders: { top: ['Alexander', 'Ptolemy', 'Parmenio'], bottom: ['Mithridates', 'Rhoesaces', 'Spithridates'] },
    units: {
      top: { LI: 2, LB: 1, AX: 2, MI: 1, HI: 2, LC: 1, MC: 2 },
      bottom: { LI: 2, LB: 2, AX: 2, MI: 2, LC: 2, MC: 3, HC: 1 },
    },
    elites: [['top', 'companions', 'MC']], rules: [],
    terrain: { types: { river: 12 }, rivers: { ford: 12, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '39525d57', pieces: '6e269bf6' },
  },
  '108': {
    name: 'Issus', year: '333 BC', banners: 8, first: 'top',
    armies: { top: 'Macedonian', bottom: 'Persian' },
    commanders: { top: 'Alexander', bottom: 'Darius III' },
    cards: { top: 6, bottom: 4 }, blocks: { top: 'grk', bottom: 'eas' },
    looks: { top: 'macedonian', bottom: 'persian' },
    leaders: { top: ['Alexander', 'Craterus', 'Parmenio'], bottom: ['Thymondas', 'Nabarzanes', 'Darius'] },
    units: {
      top: { LI: 2, LB: 2, AX: 2, MI: 2, HI: 4, LC: 1, MC: 2 },
      bottom: { LI: 3, LB: 2, LS: 2, AX: 5, MI: 4, LC: 3, MC: 2, HC: 1 },
    },
    elites: [['top', 'companions', 'MC'], ['bottom', 'immortals', 'MI']], rules: [],
    terrain: { types: { hill: 13, sea: 7, river: 10 }, rivers: { ford: 0, blocked: 0, nocap: 10 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '30fa8c5a', pieces: '2cec59c3' },
  },
  '109': {
    name: 'Gaugamela', year: '331 BC', banners: 7, first: 'top',
    armies: { top: 'Macedonian', bottom: 'Persian' },
    commanders: { top: 'Alexander', bottom: 'Darius III' },
    cards: { top: 6, bottom: 4 }, blocks: { top: 'grk', bottom: 'eas' },
    looks: { top: 'macedonian', bottom: 'persian' },
    leaders: { top: ['Alexander', 'Parmenio', 'Craterus'], bottom: ['Bessus', 'Darius', 'Mazeus'] },
    units: {
      top: { LI: 1, LB: 2, AX: 2, MI: 1, HI: 4, LC: 2, MC: 3 },
      bottom: { LI: 2, LB: 2, AX: 3, MI: 2, LC: 2, LBC: 1, MC: 3, HC: 1, EL: 1, HCH: 2 },
    },
    elites: [['top', 'companions', 'MC']], rules: [],
    terrain: { types: {}, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '811c9dc5', pieces: '6736c3ca' },
  },
  '110': {
    name: 'Jaxartes River', year: '328 BC', banners: 5, first: 'top',
    armies: { top: 'Macedonian', bottom: 'Scythian' },
    commanders: { top: 'Alexander', bottom: 'Satraces' },
    cards: { top: 6, bottom: 5 }, blocks: { top: 'grk', bottom: 'eas' },
    looks: { top: 'macedonian', bottom: 'scythian' },
    leaders: { top: ['Alexander', 'Craterus'], bottom: ['Satraces'] },
    units: {
      top: { LI: 1, LB: 1, LS: 1, AX: 2, HI: 2, LC: 2, MC: 2, HWM: 2 },
      bottom: { LC: 4, LBC: 4, MC: 1 },
    },
    elites: [['top', 'companions', 'MC']], rules: [],
    terrain: { types: { river: 12, hill: 7 }, rivers: { ford: 12, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: 'f351a361', pieces: '629c232d' },
  },
  '111': {
    name: 'Hydaspes', year: '326 BC', banners: 7, first: 'top',
    armies: { top: 'Macedonian', bottom: 'Indian' },
    commanders: { top: 'Alexander', bottom: 'Porus' },
    cards: { top: 6, bottom: 5 }, blocks: { top: 'grk', bottom: 'eas' },
    looks: { top: 'macedonian', bottom: 'indian' },
    leaders: { top: ['Alexander', 'Coenus', 'Antigenes'], bottom: ['Porus', 'Spitaces', 'Hages'] },
    units: {
      top: { LI: 3, LB: 1, AX: 1, MI: 1, HI: 3, LBC: 2, MC: 2 },
      bottom: { LB: 4, AX: 4, LC: 1, MC: 1, EL: 3, HCH: 2 },
    },
    elites: [['top', 'companions', 'MC'], ['top', 'companions', 'MC']], rules: [],
    terrain: { types: { river: 9, forest: 3 }, rivers: { ford: 0, blocked: 9, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '5f670ff9', pieces: '17b8cce7' },
  },
  '112': {
    name: 'Hellespont', year: '323 BC', banners: 6, first: 'top',
    armies: { top: "Craterus' Successors", bottom: "Eumenes' Successors" },
    commanders: { top: 'Craterus', bottom: 'Eumenes' },
    cards: { top: 5, bottom: 6 }, blocks: { top: 'car', bottom: 'grk' },
    looks: { top: 'craterus', bottom: 'eumenes' },
    leaders: { top: ['Craterus', 'Neoptolemus'], bottom: ['Eumenes', 'Alcetas'] },
    units: {
      top: { LI: 1, LB: 1, AX: 4, MI: 3, HI: 3, MC: 2 },
      bottom: { LB: 2, AX: 4, MI: 2, HI: 2, LC: 1, MC: 4 },
    },
    elites: [], rules: ['leaderLossCostsCard', 'allLeadersSuddenDeath'],
    terrain: { types: {}, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '811c9dc5', pieces: 'c2085fbb' },
  },
  '113': {
    name: 'Paraitacene', year: '317 BC', banners: 7, first: 'bottom',
    armies: { top: "Antigonus' Successors", bottom: "Eumenes' Successors" },
    commanders: { top: 'Antigonus', bottom: 'Eumenes' },
    cards: { top: 5, bottom: 5 }, blocks: { top: 'eas', bottom: 'grk' },
    looks: { top: 'antigonus', bottom: 'eumenes' },
    leaders: { top: ['Antigonus', 'Demetrius', 'Peithon'], bottom: ['Eumenes', 'Eudamus', 'Peucestas'] },
    units: {
      top: { LI: 2, AX: 2, MI: 2, HI: 4, LC: 2, LBC: 1, MC: 2, HC: 1, EL: 1 },
      bottom: { LI: 4, AX: 2, MI: 1, HI: 4, LC: 1, LBC: 1, MC: 1, HC: 1, EL: 2 },
    },
    elites: [['bottom', 'silverShields', 'HI']], rules: [],
    terrain: { types: { steep: 6 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '38309d6a', pieces: '727f719b' },
  },
  '114': {
    name: 'Gabiene', year: '316 BC', banners: 7, first: 'top',
    armies: { top: "Antigonus' Successors", bottom: "Eumenes' Successors" },
    commanders: { top: 'Antigonus', bottom: 'Eumenes' },
    cards: { top: 6, bottom: 5 }, blocks: { top: 'eas', bottom: 'grk' },
    looks: { top: 'antigonus', bottom: 'eumenes' },
    leaders: { top: ['Demetrius', 'Antigonus', 'Peithon'], bottom: ['Eumenes', 'Philip'] },
    units: {
      top: { LI: 3, AX: 2, MI: 2, HI: 2, LBC: 1, MC: 3, HC: 1, EL: 2 },
      bottom: { LI: 3, AX: 3, MI: 1, HI: 3, LBC: 1, MC: 1, HC: 1, EL: 3 },
    },
    elites: [['bottom', 'silverShields', 'HI']], rules: ['campCapture'],
    terrain: { types: { camp: 1 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: 'ebd59ccd', pieces: '5d096d11' },
  },
  '115': {
    name: 'Ipsus', year: '301 BC', banners: 8, first: 'top',
    armies: { top: "Antigonus' Successors", bottom: "Seleucus' Successors" },
    commanders: { top: 'Antigonus', bottom: 'Seleucus' },
    cards: { top: 5, bottom: 6 }, blocks: { top: 'grk', bottom: 'eas' },
    looks: { top: 'antigonus', bottom: 'seleucid' },
    leaders: { top: ['Antigonus', 'Demetrius', 'Pyrrhus'], bottom: ['Seleucus', 'Lysimachus', 'Antiochus'] },
    units: {
      top: { LI: 2, LB: 2, AX: 2, MI: 3, HI: 3, LC: 1, MC: 2, HC: 1, EL: 2 },
      bottom: { LI: 3, LB: 2, AX: 1, HI: 4, LC: 2, HC: 2, EL: 4, HCH: 2 },
    },
    elites: [], rules: [],
    terrain: { types: {}, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '811c9dc5', pieces: 'd26b1225' },
  },
  '116': {
    name: 'Heraclea', year: '280 BC', banners: 7, first: 'top',
    armies: { top: 'Epirote', bottom: 'Roman' },
    commanders: { top: 'Pyrrhus', bottom: 'Valerius Laevinus' },
    cards: { top: 5, bottom: 5 }, blocks: { top: 'grk', bottom: 'rom' },
    looks: { top: 'epirote', bottom: 'roman' },
    leaders: { top: ['Pyrrhus', 'Leonatus'], bottom: ['Laevinus', 'Cassius'] },
    units: {
      top: { LI: 1, LB: 3, AX: 2, MI: 2, HI: 4, LC: 1, MC: 2, EL: 2 },
      bottom: { LI: 3, AX: 1, MI: 4, HI: 3, MC: 4 },
    },
    elites: [], rules: ['frightAtFirstSight'],
    terrain: { types: { hill: 2, river: 5 }, rivers: { ford: 2, blocked: 3, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '1f416b52', pieces: '8199bb45' },
  },
  '117': {
    name: 'Asculum', year: '279 BC', banners: 6, first: 'bottom',
    armies: { top: 'Epirote', bottom: 'Roman' },
    commanders: { top: 'Pyrrhus', bottom: 'Decius' },
    cards: { top: 6, bottom: 4 }, blocks: { top: 'grk', bottom: 'rom' },
    looks: { top: 'epirote', bottom: 'roman' },
    leaders: { top: [], bottom: [] },
    placeLeaders: [['bottom', 'Decius'], ['bottom', 'Sulpicius'], ['top', 'Pyrrhus'], ['top', 'Leonatus']],
    units: {
      top: { LB: 2, WA: 1, MI: 2, HI: 3, LC: 2, MC: 2, EL: 1 },
      bottom: { LI: 3, AX: 2, MI: 4, HI: 2, MC: 2 },
    },
    elites: [], rules: ['leaderPlacement'],
    terrain: { types: {}, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '811c9dc5', pieces: '30765fc7' },
  },
  '118': {
    name: 'Beneventum', year: '275 BC', banners: 7, first: 'top',
    armies: { top: 'Epirote', bottom: 'Roman' },
    commanders: { top: 'Pyrrhus', bottom: 'Dentatus' },
    cards: { top: 5, bottom: 5 }, blocks: { top: 'grk', bottom: 'rom' },
    looks: { top: 'epirote', bottom: 'roman' },
    leaders: { top: ['Pyrrhus', 'Leonatus'], bottom: ['Dentatus', 'Lentulus', 'Fabricius'] },
    units: {
      top: { LI: 3, LB: 1, WA: 2, MI: 2, HI: 4, LC: 2, MC: 2, EL: 1 },
      bottom: { LI: 3, AX: 2, MI: 6, HI: 2, MC: 2, HWM: 2 },
    },
    elites: [], rules: [],
    terrain: { types: { forest: 9, camp: 3, rampart: 4 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 4, edges: 8 } },
    checksum: { terrain: '7cc83a5a', pieces: 'bd257c39' },
  },
  '119': {
    name: 'Raphia', year: '217 BC', banners: 8, first: 'bottom',
    armies: { top: 'Ptolemaic', bottom: 'Seleucid' },
    commanders: { top: 'Ptolemy', bottom: 'Antiochus' },
    cards: { top: 5, bottom: 5 }, blocks: { top: 'eas', bottom: 'grk' },
    looks: { top: 'ptolemaic', bottom: 'seleucid' },
    leaders: { top: ['Ptolemy', 'Echecrates'], bottom: ['Antiochus', 'Nicarchus'] },
    units: {
      top: { LI: 3, LB: 2, AX: 1, WA: 1, MI: 2, HI: 3, LC: 2, MC: 1, HC: 1, EL: 2 },
      bottom: { LI: 4, LB: 2, AX: 3, MI: 2, HI: 2, LC: 1, MC: 2, HC: 1, EL: 2 },
    },
    elites: [], rules: [],
    terrain: { types: {}, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '811c9dc5', pieces: 'fe5977c8' },
  },
  '120': {
    name: 'Cynoscephalae', year: '197 BC', banners: 6, first: 'bottom',
    armies: { top: 'Macedonian', bottom: 'Roman' },
    commanders: { top: 'Philip V', bottom: 'Flamininus' },
    cards: { top: 5, bottom: 5 }, blocks: { top: 'grk', bottom: 'rom' },
    looks: { top: 'antigonid', bottom: 'roman' },
    leaders: { top: ['Philip V', 'Nicanor'], bottom: ['Flamininus', 'Villius'] },
    units: {
      top: { LI: 4, LS: 1, AX: 3, HI: 6, MC: 2 },
      bottom: { LI: 3, AX: 4, MI: 4, HI: 2, LC: 1, MC: 2, EL: 1 },
    },
    elites: [], rules: [], options: { tacticalFlexibility: true },
    terrain: { types: { hill: 18 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '9e8af8cb', pieces: 'b3823bb6' },
  },
  '121': {
    name: 'Magnesia', year: '190 BC', banners: 7, first: 'bottom',
    armies: { top: 'Seleucid', bottom: 'Roman' },
    commanders: { top: 'Antiochus', bottom: 'Scipio' },
    cards: { top: 4, bottom: 5 }, blocks: { top: 'grk', bottom: 'rom' },
    looks: { top: 'seleucid', bottom: 'roman' },
    leaders: { top: ['Antiochus', 'Seleucus'], bottom: ['Scipio', 'Eumenes'] },
    units: {
      top: { LI: 3, LB: 2, AX: 1, WA: 1, MI: 1, HI: 2, LBC: 1, MC: 1, HC: 1, CAM: 1, EL: 2, HCH: 1 },
      bottom: { LI: 4, LB: 2, AX: 2, MI: 4, HI: 1, MC: 2, EL: 1 },
    },
    elites: [], rules: [], options: { tacticalFlexibility: true },
    terrain: { types: { river: 7 }, rivers: { ford: 0, blocked: 7, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: 'f5aa154b', pieces: 'b6dedc83' },
  },
  '122': {
    name: 'Cronium', year: '376 BC', banners: 7, first: 'bottom',
    armies: { top: 'Carthaginian', bottom: 'Syracusan' },
    commanders: { top: 'Himilco', bottom: 'Dionysius' },
    cards: { top: 6, bottom: 5 }, blocks: { top: 'car', bottom: 'grk' },
    looks: { top: 'carthaginian', bottom: 'syracusan' },
    leaders: { top: ['Himilco', 'Hanno', 'Bomilcar'], bottom: ['Dionysius', 'Leptines', 'Thearides'] },
    units: {
      top: { LI: 2, LB: 1, LS: 1, AX: 4, WA: 1, MI: 3, HI: 2, LC: 3, HC: 1, HCH: 1 },
      bottom: { LI: 1, LB: 1, LS: 1, AX: 2, WA: 1, MI: 4, HI: 3, LC: 2, MC: 1, HC: 1 },
    },
    elites: [], rules: [],
    terrain: { types: {}, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '811c9dc5', pieces: 'dab7bbc7' },
  },
  '123': {
    name: 'Indus', year: '306 BC', banners: 6, first: 'bottom',
    armies: { top: 'Seleucid', bottom: 'Indian' },
    commanders: { top: 'Seleucus', bottom: 'Maurya' },
    cards: { top: 5, bottom: 5 }, blocks: { top: 'grk', bottom: 'eas' },
    looks: { top: 'seleucid', bottom: 'mauryan' },
    leaders: { top: ['Seleucus', 'Antiochus'], bottom: ['Maurya', 'Chanakya'] },
    units: {
      top: { LI: 1, LB: 4, AX: 2, HI: 3, LC: 1, MC: 1, EL: 1 },
      bottom: { LI: 2, LB: 1, AX: 3, HI: 1, LC: 3, MC: 2, EL: 1, HCH: 2 },
    },
    elites: [['bottom', 'bowAuxilia', 'AX'], ['bottom', 'bowAuxilia', 'AX'], ['bottom', 'bowAuxilia', 'AX']], rules: [],
    terrain: { types: { forest: 5, hill: 5, river: 8 }, rivers: { ford: 8, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '515351c8', pieces: '7bfe05f5' },
  },
  '124': {
    name: 'Pydna', year: '168 BC', banners: 8, first: 'top',
    armies: { top: 'Macedonian', bottom: 'Roman' },
    commanders: { top: 'Perseus', bottom: 'Paullus' },
    cards: { top: 5, bottom: 6 }, blocks: { top: 'grk', bottom: 'rom' },
    looks: { top: 'antigonid', bottom: 'roman' },
    leaders: { top: ['Perseus', 'Hippias'], bottom: ['Paullus', 'Scipio', 'Misagenes'] },
    units: {
      top: { LI: 4, LB: 2, AX: 2, MI: 1, HI: 4, LC: 1, MC: 2, HC: 1 },
      bottom: { LI: 3, AX: 2, MI: 5, HI: 2, LC: 2, MC: 1, HC: 1, EL: 2 },
    },
    elites: [], rules: [], options: { tacticalFlexibility: true },
    terrain: { types: { broken: 7, camp: 2 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '420c6f0a', pieces: '8e9b23d8' },
  },
};
