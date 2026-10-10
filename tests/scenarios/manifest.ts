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
import type { ArmyLook, Blocks, EliteId, Legion, Side, SpecialRuleId, UnitType } from '../../src/engine/types';
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
  /** Units on the board per side and type. */
  units: PerSide<Partial<Record<UnitType, number>>>;
  /** Units and leaders that start off the board (the ambush force of 206), per side. */
  reserves?: { units: PerSide<Partial<Record<UnitType, number>>>; leaders: PerSide<string[]> };
  /** Legion rule per side (Marius' legions, 206-223). */
  legions?: Partial<Record<Side, Legion>>;
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
    elites: [['bottom', 'silverShields', 'HI']], rules: [],
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

/**
 * Expected setup of each Expansion #2 battle (201-223, Rome & the Barbarians), checked by exp2.test.ts. Kept apart from
 * `MANIFEST` so that the Expansion #1 tests keep meaning 101-124. The entries were generated from the imported scenario
 * files (the verified transcriptions, design/exp2-scenario-notes.md). Their per-side unit and leader counts (including the
 * 206 ambush force), cards, first player and banners were cross-checked against design/exp2-survey.md: they all agree
 * except where the rulings below override the page. Where the
 * scenario page or the survey differs from the map, the files follow the map or the ruling (design/exp2-rulings.md):
 * - 203 Clastidium: 4 banners (Q11; the page tag says 8). 218 River Stour: 6 banners (the War Council; the page has no tag).
 * - 222 Angrivarii Rampart: the Romans move first (War Council and Q11), against the map's star.
 * - 201-205 Romans use the base `rom` blocks and `roman` look (no legions); 206-223 the Marian look with Marius' legions.
 * - 217 Invasion of Britain: the Briton leader and commander (the page names none) is the cosmetic Segovax; 218's is Carvilius.
 * - 207: the king is written Boiorix, as in 204 (the page and map say Beorix).
 * Terrain counts follow the maps and are higher than the survey's "about N" in several battles (see the scenario notes).
 */
export const MANIFEST_EXP2: Record<string, BattleManifest> = {
  '201': {
    name: 'Clusium', year: '225 BC', banners: 6, first: 'top',
    armies: { top: 'Gallic', bottom: 'Roman' },
    commanders: { top: 'Aneroestes', bottom: 'Praetor' },
    cards: { top: 5, bottom: 5 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'gallic', bottom: 'roman' },
    leaders: { top: ['Aneroestes', 'Concolitanus'], bottom: ['Manlius', 'Praetor'] },
    units: {
      top: { LI: 3, AX: 3, WA: 5, BCH: 1, MC: 3 },
      bottom: { LI: 3, AX: 2, MI: 4, HI: 1, MC: 2 },
    },
    elites: [], rules: [],
    terrain: { types: { forest: 7, camp: 3, hill: 4 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '4921e08b', pieces: '394c3ef5' },
  },
  '202': {
    name: 'Telamon', year: '225 BC', banners: 8, first: 'bottom',
    armies: { top: 'Gallic', bottom: 'Roman' },
    commanders: { top: 'Aneroestes', bottom: 'Atilius Regulus' },
    cards: { top: 5, bottom: 6 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'gallic', bottom: 'roman' },
    leaders: { top: ['Aneroestes', 'Concolitanus'], bottom: ['Regulus', 'Papus', 'Fabius'] },
    units: {
      top: { LI: 3, AX: 3, WA: 4, BCH: 2, MC: 3 },
      bottom: { LI: 5, AX: 4, MI: 5, HI: 2, MC: 4 },
    },
    elites: [], rules: [],
    terrain: { types: { sea: 13, hill: 9 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '9a1b6a7e', pieces: '6b69a708' },
  },
  '203': {
    name: 'Clastidium', year: '222 BC', banners: 4, first: 'bottom',
    armies: { top: 'Gallic', bottom: 'Roman' },
    commanders: { top: 'Britomartus', bottom: 'Marcus Claudius Marcellus' },
    cards: { top: 4, bottom: 6 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'gallic', bottom: 'roman' },
    leaders: { top: ['Britomartus'], bottom: ['Flaminius', 'Marcellus', 'Furius'] },
    units: {
      top: { LI: 2, AX: 6, WA: 2, MC: 2 },
      bottom: { LI: 3, MC: 5 },
    },
    elites: [], rules: [],
    terrain: { types: { hill: 6 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '35fc6b78', pieces: 'ea843648' },
  },
  '204': {
    name: 'Arausio', year: '105 BC', banners: 7, first: 'bottom',
    armies: { top: 'Germanic', bottom: 'Roman' },
    commanders: { top: 'Boiorix', bottom: 'Quintus Servilius Caepio' },
    cards: { top: 5, bottom: 4 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'germanic', bottom: 'roman' },
    leaders: { top: ['Boiorix', 'Teutobod'], bottom: ['Caepio', 'Mallius'] },
    units: {
      top: { LI: 4, AX: 4, WA: 6, LC: 3, MC: 2 },
      bottom: { LI: 4, AX: 2, MI: 4, HI: 2, LC: 1, MC: 1 },
    },
    elites: [], rules: [],
    terrain: { types: { river: 7, camp: 2 }, rivers: { ford: 0, blocked: 7, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '91c623c5', pieces: '1ce6cc5f' },
  },
  '205': {
    name: 'Scirthaea', year: '103 BC', banners: 6, first: 'top',
    armies: { top: 'Slave', bottom: 'Roman' },
    commanders: { top: 'Salvius', bottom: 'Lucullus' },
    cards: { top: 4, bottom: 6 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'slave', bottom: 'roman' },
    leaders: { top: ['Athenion', 'Salvius'], bottom: ['Servilius', 'Clodius', 'Lucullus'] },
    units: {
      top: { AX: 5, WA: 4, MI: 2, MC: 2 },
      bottom: { LI: 3, AX: 2, MI: 7, MC: 2 },
    },
    elites: [], rules: [],
    terrain: { types: {}, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '811c9dc5', pieces: 'fc5fa3d9' },
  },
  '206': {
    name: 'Aquae Sextiae', year: '102 BC', banners: 6, first: 'top',
    armies: { top: 'Germanic', bottom: 'Roman' },
    commanders: { top: 'Teutobodus', bottom: 'Marius' },
    cards: { top: 5, bottom: 6 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'germanic', bottom: 'marian' },
    leaders: { top: ['Teutobodus'], bottom: ['Aquillius', 'Marius'] },
    units: {
      top: { LI: 2, AX: 5, WA: 4, LC: 2, MC: 3 },
      bottom: { LI: 1, LB: 2, AX: 2, MI: 5, MC: 2 },
    },
    reserves: { units: { top: {}, bottom: { LI: 1, AX: 2, LC: 1 } }, leaders: { top: [], bottom: ['Marcellus'] } },
    legions: { bottom: 'marius' },
    elites: [], rules: ['magoAmbush'],
    terrain: { types: { forest: 3, hill: 11 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '26784790', pieces: 'd7c31838' },
  },
  '207': {
    name: 'Vercellae', year: '101 BC', banners: 8, first: 'top',
    armies: { top: 'Germanic', bottom: 'Roman' },
    commanders: { top: 'Boiorix', bottom: 'Marius' },
    cards: { top: 4, bottom: 6 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'germanic', bottom: 'marian' },
    leaders: { top: ['Boiorix', 'Lugius'], bottom: ['Marius', 'Catulus', 'Sulla'] },
    units: {
      top: { LI: 4, LB: 2, AX: 6, WA: 5, MC: 4 },
      bottom: { LI: 2, LB: 2, AX: 2, MI: 8, MC: 2 },
    },
    legions: { bottom: 'marius' },
    elites: [], rules: [],
    terrain: { types: {}, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '811c9dc5', pieces: '44aa7887' },
  },
  '208': {
    name: 'Mt Vesuvius', year: '73 BC', banners: 5, first: 'top',
    armies: { top: 'Slave', bottom: 'Roman' },
    commanders: { top: 'Spartacus', bottom: 'Claudius Glaber' },
    cards: { top: 6, bottom: 4 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'slave', bottom: 'marian' },
    leaders: { top: ['Spartacus'], bottom: ['Glaber', 'Varinius'] },
    units: {
      top: { LI: 1, AX: 2, WA: 5, MI: 3 },
      bottom: { LI: 1, AX: 5, MI: 3 },
    },
    legions: { bottom: 'marius' },
    elites: [], rules: [],
    terrain: { types: { steep: 18, forest: 6, rampart: 6, camp: 4 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 6, edges: 13 } },
    checksum: { terrain: 'bc456e8f', pieces: '1cca726b' },
  },
  '209': {
    name: 'Mt Garganus', year: '72 BC', banners: 6, first: 'bottom',
    armies: { top: 'Slave', bottom: 'Roman' },
    commanders: { top: 'Crixus', bottom: 'Gellius' },
    cards: { top: 5, bottom: 6 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'slave', bottom: 'marian' },
    leaders: { top: ['Crixus'], bottom: ['Arrius', 'Gellius'] },
    units: {
      top: { LI: 2, AX: 2, WA: 5, LC: 2 },
      bottom: { LI: 4, AX: 2, MI: 6, MC: 2, HWM: 1 },
    },
    legions: { bottom: 'marius' },
    elites: [], rules: [],
    terrain: { types: { steep: 13 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '9b4dc69d', pieces: '57d69ef2' },
  },
  '210': {
    name: 'Picenum', year: '72 BC', banners: 8, first: 'bottom',
    armies: { top: 'Slave', bottom: 'Roman' },
    commanders: { top: 'Spartacus', bottom: 'Gellius' },
    cards: { top: 6, bottom: 5 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'slave', bottom: 'marian' },
    leaders: { top: ['Castus', 'Gannicus', 'Spartacus'], bottom: ['Gellius', 'Lentulus'] },
    units: {
      top: { LS: 2, AX: 2, WA: 5, MI: 4, LC: 2 },
      bottom: { LI: 4, MI: 9, MC: 3, HWM: 2 },
    },
    legions: { bottom: 'marius' },
    elites: [], rules: [],
    terrain: { types: { hill: 22 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: 'e64e2a60', pieces: 'f567241f' },
  },
  '211': {
    name: 'Mummius\' Defeat', year: '72 BC', banners: 5, first: 'bottom',
    armies: { top: 'Slave', bottom: 'Roman' },
    commanders: { top: 'Spartacus', bottom: 'Mummius' },
    cards: { top: 6, bottom: 4 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'slave', bottom: 'marian' },
    leaders: { top: ['Spartacus'], bottom: ['Quinctius', 'Mummius', 'Scrofa'] },
    units: {
      top: { LS: 2, AX: 3, WA: 4, MI: 2, LC: 2 },
      bottom: { LI: 1, AX: 1, MI: 6, LC: 2, MC: 1 },
    },
    legions: { bottom: 'marius' },
    elites: [], rules: [],
    terrain: { types: { forest: 12, camp: 3, hill: 2 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '2d52994a', pieces: '6ddea65a' },
  },
  '212': {
    name: 'Bruttium', year: '71 BC', banners: 6, first: 'top',
    armies: { top: 'Slave', bottom: 'Roman' },
    commanders: { top: 'Spartacus', bottom: 'Crassus' },
    cards: { top: 6, bottom: 5 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'slave', bottom: 'marian' },
    leaders: { top: ['Gannicus', 'Spartacus'], bottom: ['Crassus', 'Quinctius'] },
    units: {
      top: { LS: 2, AX: 2, WA: 6, MI: 3, LC: 3 },
      bottom: { LB: 2, AX: 2, MI: 6, LC: 2, MC: 2 },
    },
    legions: { bottom: 'marius' },
    elites: [], rules: [],
    terrain: { types: { forest: 10, ditch: 9, rampart: 9, camp: 4 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 9, edges: 18 } },
    checksum: { terrain: 'a649fc60', pieces: 'f29469c1' },
  },
  '213': {
    name: 'Camalatrum', year: '71 BC', banners: 6, first: 'top',
    armies: { top: 'Slave', bottom: 'Roman' },
    commanders: { top: 'Spartacus', bottom: 'Crassus' },
    cards: { top: 5, bottom: 5 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'slave', bottom: 'marian' },
    leaders: { top: ['Spartacus', 'Cannicus', 'Castus'], bottom: ['Crassus', 'Marcius', 'Pomptinus'] },
    units: {
      top: { LI: 2, AX: 2, WA: 5, MI: 3, LC: 2 },
      bottom: { LI: 2, AX: 1, MI: 9, MC: 1 },
    },
    legions: { bottom: 'marius' },
    elites: [], rules: [],
    terrain: { types: { lake: 5, hill: 8, camp: 1, forest: 4 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: 'f509e530', pieces: '9361e3f8' },
  },
  '214': {
    name: 'Silarus', year: '71 BC', banners: 6, first: 'top',
    armies: { top: 'Slave', bottom: 'Roman' },
    commanders: { top: 'Spartacus', bottom: 'Crassus' },
    cards: { top: 5, bottom: 6 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'slave', bottom: 'marian' },
    leaders: { top: ['Spartacus', 'Publipor', 'Bithus'], bottom: ['Crassus', 'Scrofa', 'Quinctius'] },
    units: {
      top: { LI: 4, AX: 4, WA: 4, MI: 3, LC: 3 },
      bottom: { LI: 4, AX: 2, MI: 9, LC: 3, MC: 2 },
    },
    legions: { bottom: 'marius' },
    elites: [], rules: [],
    terrain: { types: { hill: 16, camp: 2, rampart: 2 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 2, edges: 4 } },
    checksum: { terrain: '1c36eda7', pieces: '18410207' },
  },
  '215': {
    name: 'River Sabis', year: '57 BC', banners: 8, first: 'top',
    armies: { top: 'Belgic', bottom: 'Roman' },
    commanders: { top: 'Boduognatus', bottom: 'Julius Caesar' },
    cards: { top: 4, bottom: 6 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'belgic', bottom: 'marian' },
    leaders: { top: ['Boduognatus', 'Vertico', 'Correus'], bottom: ['Julius Caesar', 'Labienus', 'Pedius'] },
    units: {
      top: { LI: 3, AX: 4, WA: 8, MC: 2 },
      bottom: { LI: 2, LB: 2, AX: 2, MI: 7, HI: 2, MC: 3, HWM: 1 },
    },
    legions: { bottom: 'marius' },
    elites: [['bottom', 'tenthLegion', 'HI'], ['bottom', 'tenthLegion', 'HI']], rules: [],
    terrain: { types: { forest: 9, camp: 1, hill: 5, river: 15, rampart: 1 }, rivers: { ford: 15, blocked: 0, nocap: 0 }, ramparts: { hexes: 1, edges: 2 } },
    checksum: { terrain: '80c0e05c', pieces: 'd7fe8bf7' },
  },
  '216': {
    name: 'Sotium', year: '56 BC', banners: 6, first: 'top',
    armies: { top: 'Gallic', bottom: 'Roman' },
    commanders: { top: 'Adiatuanos', bottom: 'Publius Crassus' },
    cards: { top: 5, bottom: 6 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'gallic', bottom: 'marian' },
    leaders: { top: ['Adiatuanos', 'Teutomatus', 'Ollovico'], bottom: ['Crassus', 'Valerius', 'Considius'] },
    units: {
      top: { AX: 7, WA: 4, LC: 3, MC: 2 },
      bottom: { LI: 2, LS: 1, AX: 3, MI: 6, MC: 3, HWM: 1 },
    },
    legions: { bottom: 'marius' },
    elites: [], rules: [],
    terrain: { types: { hill: 14, forest: 5 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: 'f910ffbd', pieces: '605d888b' },
  },
  '217': {
    name: 'Invasion of Britain', year: '55 BC', banners: 7, first: 'top',
    armies: { top: 'Briton', bottom: 'Roman' },
    commanders: { top: 'Segovax', bottom: 'Julius Caesar' },
    cards: { top: 5, bottom: 6 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'briton', bottom: 'marian' },
    leaders: { top: ['Segovax'], bottom: ['Julius Caesar', 'Volusenus', 'Sulpicius'] },
    units: {
      top: { AX: 6, WA: 3, BCH: 2, LC: 2, MC: 2 },
      bottom: { LB: 2, AX: 2, MI: 8, HI: 1 },
    },
    legions: { bottom: 'marius' },
    elites: [['bottom', 'tenthLegion', 'HI']], rules: [],
    terrain: { types: { hill: 8, river: 11 }, rivers: { ford: 11, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '7e4ce787', pieces: 'fd846fb9' },
  },
  '218': {
    name: 'River Stour', year: '54 BC', banners: 6, first: 'top',
    armies: { top: 'Briton', bottom: 'Roman' },
    commanders: { top: 'Carvilius', bottom: 'Julius Caesar' },
    cards: { top: 5, bottom: 6 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'briton', bottom: 'marian' },
    leaders: { top: ['Carvilius'], bottom: ['Julius Caesar', 'Quintus Cicero', 'Laberius'] },
    units: {
      top: { BCH: 7, LC: 2, MC: 2 },
      bottom: { LB: 2, AX: 2, MI: 5, MC: 2 },
    },
    legions: { bottom: 'marius' },
    elites: [], rules: [],
    terrain: { types: { river: 13, forest: 9 }, rivers: { ford: 13, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '41519238', pieces: '7761f5f4' },
  },
  '219': {
    name: 'Foraging Party', year: '54 BC', banners: 6, first: 'top',
    armies: { top: 'Briton', bottom: 'Roman' },
    commanders: { top: 'Cassivellaunus', bottom: 'Gaius Trebonius' },
    cards: { top: 5, bottom: 6 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'briton', bottom: 'marian' },
    leaders: { top: ['Cassivellaunus', 'Cingetorix'], bottom: ['Trebonius', 'Volusenus', 'Quintus Cicero'] },
    units: {
      top: { AX: 6, WA: 4, BCH: 4, LC: 2 },
      bottom: { LB: 2, AX: 3, MI: 3, MC: 4 },
    },
    legions: { bottom: 'marius' },
    elites: [], rules: [],
    terrain: { types: { hill: 6, forest: 11 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '53562a1d', pieces: '6796bb5d' },
  },
  '220': {
    name: 'Teutoburger Wald P1', year: '9 AD', banners: 6, first: 'top',
    armies: { top: 'Germanic', bottom: 'Roman' },
    commanders: { top: 'Arminius', bottom: 'Varus' },
    cards: { top: 5, bottom: 5 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'germanic', bottom: 'marian' },
    leaders: { top: ['Arminius', 'Segimer', 'Inguiomer'], bottom: ['Varus', 'Eggius', 'Ceionius'] },
    units: {
      top: { LI: 4, AX: 4, WA: 7, MC: 2 },
      bottom: { LI: 3, AX: 1, MI: 5, MC: 2 },
    },
    legions: { bottom: 'marius' },
    elites: [], rules: [],
    terrain: { types: { forest: 10, broken: 2, hill: 6, marsh: 9 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 0, edges: 0 } },
    checksum: { terrain: '834f68d9', pieces: '8fcff1f6' },
  },
  '221': {
    name: 'Teutoburger Wald P2', year: '9 AD', banners: 6, first: 'top',
    armies: { top: 'Germanic', bottom: 'Roman' },
    commanders: { top: 'Arminius', bottom: 'Vala' },
    cards: { top: 5, bottom: 4 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'germanic', bottom: 'marian' },
    leaders: { top: ['Arminius', 'Segimer', 'Inguiomer'], bottom: ['Vala'] },
    units: {
      top: { LI: 1, AX: 3, WA: 6, MI: 1, MC: 1 },
      bottom: { LI: 2, AX: 1, MI: 4, MC: 2 },
    },
    legions: { bottom: 'marius' },
    elites: [], rules: [],
    terrain: { types: { marsh: 8, forest: 14, rampart: 12, camp: 1 }, rivers: { ford: 0, blocked: 0, nocap: 0 }, ramparts: { hexes: 12, edges: 26 } },
    checksum: { terrain: '0b0883ae', pieces: 'ec1d5f72' },
  },
  '222': {
    name: 'Angrivarii Rampart', year: '16 AD', banners: 6, first: 'bottom',
    armies: { top: 'Germanic', bottom: 'Roman' },
    commanders: { top: 'Arminius', bottom: 'Germanicus' },
    cards: { top: 5, bottom: 6 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'germanic', bottom: 'marian' },
    leaders: { top: ['Arminius', 'Inguiomer'], bottom: ['Germanicus', 'Seius Tubero', 'Stertinius'] },
    units: {
      top: { LI: 2, AX: 4, WA: 6, MI: 1, MC: 2 },
      bottom: { LI: 3, LB: 1, AX: 3, WA: 1, MI: 7, LC: 1, MC: 2, HWM: 1 },
    },
    legions: { bottom: 'marius' },
    elites: [], rules: [],
    terrain: { types: { forest: 14, river: 9, rampart: 7 }, rivers: { ford: 0, blocked: 9, nocap: 0 }, ramparts: { hexes: 7, edges: 14 } },
    checksum: { terrain: 'effe31d3', pieces: '0c59c35e' },
  },
  '223': {
    name: 'Cefn Carnedd', year: '51 AD', banners: 6, first: 'bottom',
    armies: { top: 'Briton', bottom: 'Roman' },
    commanders: { top: 'Caratacus', bottom: 'Publius Ostorius Scapula' },
    cards: { top: 5, bottom: 6 }, blocks: { top: 'bar', bottom: 'rom' },
    looks: { top: 'briton', bottom: 'marian' },
    leaders: { top: ['Caratacus', 'Arviragus', 'Venutius'], bottom: ['Scapula', 'Marcus Ostorius', 'Manlius Valens'] },
    units: {
      top: { LI: 1, LB: 2, AX: 4, WA: 5 },
      bottom: { LI: 3, AX: 5, MI: 7 },
    },
    legions: { bottom: 'marius' },
    elites: [], rules: ['veryHills'],
    terrain: { types: { hill: 16, rampart: 6, river: 15 }, rivers: { ford: 15, blocked: 0, nocap: 0 }, ramparts: { hexes: 6, edges: 12 } },
    checksum: { terrain: '4bcb6cc3', pieces: '24d09fa1' },
  },
};
