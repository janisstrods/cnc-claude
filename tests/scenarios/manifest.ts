// Expected setup of each Expansion #1 battle (101-124), checked by exp1.test.ts. The values come from the imported
// scenario files and were cross-checked against the unit tables, card counts, first player, blocks and banners in
// design/exp1-survey.md. They agree except where official errata or rulings override the scenario page:
// - 107 Granicus: Persian MI 2 / MC 3 (the page table); the map draws the two satrap units as MI.
// - 117 Asculum: 6 banners; the four leaders are placed before the first turn (Romans first), so none is on the board.
// - 121 Magnesia: the Seleucids use Greek blocks and field the camel the map shows (the table omits it).
// Leader names follow the maps, with the fixes recorded in design/exp1-scenario-notes.md (Alcetas, Peucestas,
// Nicarchus, Flamininus); names given to leaders the maps leave unnamed are plausible picks, not sources.
import type { GameOptions } from '../../src/engine/setup';
import type { ArmyLook, Blocks, EliteId, Side, SpecialRuleId, UnitType } from '../../src/engine/types';

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
  },
};
