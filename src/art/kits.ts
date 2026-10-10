// What the miniatures of each figure kit wear and carry: one `KitDef` per kit, completed into `KITS`. The drawing code
// (foot.tsx, mounted.tsx, chariot.tsx, elephant.tsx, leader.tsx, machine.tsx, parts.tsx, icon.tsx) reads these choices
// instead of testing kit names, so a new kit is one entry here plus any new shapes it needs. A look's exceptions to its
// kit (the Seleucid cataphracts and elephants, say) live in the look's `LookStyle` (palettes.ts).
//
// This module has no runtime imports, so every drawing module can import it.
import type { UnitType } from '../engine/types';
import type { CrewDress, FootKit } from './foot';
import type { CrewAction, HorseCloth, RiderKit } from './mounted';
import type { Kit, LookPalette, Palette } from './palettes';
import type { Crest, Hair, Helmet, Legs, ShieldKind, Torso } from './parts';

/** Coat, shade and mane colours of a horse. */
export type HorseCoat = LookPalette['horses'][number];

/** How a mounted figure is equipped: rider, saddle cloth and horse armour. */
export interface MountKit {
  rider: RiderKit;
  cloth: HorseCloth | 'none';
  /** Bronze chamfron and peytral. */
  barding?: boolean;
  /** Scale trapper over body and neck (cataphracts). */
  cataphract?: boolean;
}

/** LC, MC and HC of a kit. */
export type CavalryDef =
  /** The base game's cavalry drawing (kept identical for the Roman, Punic and Greek kits), with this rider per type. */
  | {
    drawing: 'base';
    rider: (type: UnitType, i: number) => RiderKit;
    /** The light horse ride bareback without a bridle (Numidians). */
    barebackLight?: boolean;
  }
  /** The kit's own mounts per type (LC, MC, HC; `i` varies the figures). */
  | { drawing: 'kit'; mount: (type: UnitType, i: number) => MountKit };

/** Horse archers (LBC): the rider per figure and the saddle cloth. */
export interface HorseArcherDef {
  rider: (i: number) => RiderKit;
  cloth: 'plain' | 'rich';
}

/** Heavy chariots of a kit. */
export type ChariotDef =
  /** The base game's two-horse chariot: a driver and a warrior with javelin and round shield. */
  | { drawing: 'base'; warrior: { torso: Torso; helmet: Helmet; crest: Crest }; driverHelmet: Helmet }
  /** Four armoured horses, scythes on the hubs, one armoured driver behind high sides (Persia, the Successors). */
  | { drawing: 'scythed'; driver: CrewDress }
  /** Porus' big car: four horses, railing posts, a javelin-man, the driver and an archer in the kit's crew dress. */
  | { drawing: 'great' }
  /** A light two-horse chariot of the steppe: driver and archer in the kit's crew dress. */
  | { drawing: 'light' };

/** An elephant carrying a tower or a howdah with two crewmen, and an Indian mahout on the neck. */
export interface LoadedElephant {
  drawing: 'loaded';
  body: 'indian' | 'forest';
  load: 'tower' | 'howdah';
  /** Armoured headpiece with a plume. */
  frontlet?: boolean;
  /** Rich Indian caparison with fringe and bells (else a plain cloth in the army colours). */
  rich?: boolean;
  /** What the near and the far crewman do. */
  crew: [CrewAction, CrewAction];
  /** The crew are dressed as this kit's crews (default: the army's own kit). */
  crewKit?: Kit;
  /** Paint of the crew over the army's (e.g. coloured hoods). */
  crewPaint?: (p: Palette) => Partial<LookPalette>;
  scale: number;
}

/** Elephants of a kit. */
export type ElephantDef =
  /** The base game's African elephant: saddle cloth, mahout and a javelin-armed rider dressed so. */
  | { drawing: 'base'; rider: { torso: Torso; helmet: Helmet } }
  | LoadedElephant;

/** The mounted general with the army standard (a leader alone on his hex). */
export interface GeneralDef {
  rider: RiderKit;
  /** His horse (default: the army's first horse coat). A look's `general.horse` replaces it. */
  horse?: HorseCoat;
  /** A gold torque of rank at the neck (eastern lords). */
  torque?: boolean;
  /** With the torque, a gold jewel on the headdress (the Indian raja). */
  jewel?: boolean;
  /** The chief's gold-plated gorytos on the saddle (Scythians). */
  gorytos?: boolean;
}

/** The attached-leader portrait. A look's `general` helmet and crest replace the kit's. */
export interface BustDef {
  helmet: Helmet;
  crest: Crest;
  beard: boolean;
  /** An embroidered robe instead of the gilded cuirass (eastern lords). */
  robe?: boolean;
  /** What shows on the chest instead of the gilded cuirass (or the robe): a mail shirt or a plain tunic. */
  chest?: 'mail' | 'tunic';
  moustache?: boolean;
  /** Hair under (or without) the helmet (default short). */
  hair?: Hair;
  /** A gold torc at the neck (Celtic chiefs). */
  torc?: boolean;
}

/** Measured extent of one figure in its local frame (feet at 0,0): the icon is centred and scaled on it (icon.tsx). */
export type IconBox = [top: number, bottom: number, left: number, right: number];

/**
 * Everything that differs between figure kits. Only the foot, the cavalry, the general and his portrait are required:
 * `KITS` gives a kit that leaves out the rest (it fields no elephants, chariots or war machines, say) a fallback built
 * from its own foot figures and light cavalry (see `completeKit`).
 */
export interface KitDef {
  /** Foot figures (LI, LB, LS, AX, WA, MI, HI; any other type gets the HI figure); `i` (0..3) varies the figures. */
  foot: (type: UnitType, i: number) => FootKit;
  cavalry: CavalryDef;
  /** Default: the kit's light horseman with a bow instead of javelins and shield, on a plain cloth. */
  horseArcher?: HorseArcherDef;
  /** Default: the base game's chariot with a warrior and driver dressed as the kit's crews. */
  chariot?: ChariotDef;
  /** A look's `LookStyle.elephant` replaces it. Default: the base game's elephant with a rider dressed as the kit's crews. */
  elephant?: ElephantDef;
  /**
   * Crewmen of war machines, chariots and elephant towers or howdahs; `i` varies the headgear. Default: dressed as the
   * kit's medium infantry.
   */
  crew?: (i: number) => CrewDress;
  /** Bow of the crewmen of elephants and chariots: the plain self bow (default) or the short double-curved bow of the steppe. */
  crewBow?: 'self' | 'scythian';
  /** The bolt-thrower: a Roman scorpio (frame in the shield colour, curved front shield with a sighting window) or an oxybeles (default). */
  warMachine?: 'scorpio' | 'oxybeles';
  /** Oval shields have a bronze boss (default no). */
  ovalShieldBoss?: boolean;
  /** Crescent shields are woven wicker without a painted device (the Persian taka; default no). */
  wickerPelta?: boolean;
  general: GeneralDef;
  bust: BustDef;
  /** Icon extents of the types whose figure differs from the base box by more than 1.5 units (default: none). */
  iconBox?: Partial<Record<UnitType, IconBox>>;
}

/** A kit with every choice made (what the drawing code reads). */
export type FullKit = Required<KitDef>;

// ---------------------------------------------------------------------------------------------
// Shared pieces

const noFigures = (_i: number) => false;
const evenFigures = (i: number) => i % 2 === 0;
const oddFigures = (i: number) => i % 2 === 1;

/** Celtic warriors: bare-chested, trousers, torc, long oval shield and sword. */
function celticWarrior(i: number): FootKit {
  return {
    torso: 'bare', skirt: false, legs: 'trousers', helmet: 'none', crest: 'none', hair: i % 2 ? 'wild' : 'long',
    shield: 'longOval', shieldScale: 0.94, shieldDy: 2.4, weapon: 'sword', tribal: true, moustache: true, torc: true,
  };
}

/** How one of the base game's kits (Roman, Punic, Greek) dresses and arms its foot. */
interface ClassicFoot {
  /** Light infantry: which figures are bearded. */
  skirmisherBeard: (i: number) => boolean;
  archerHelmet: Helmet;
  archerBeard: (i: number) => boolean;
  auxiliaHelmet: Helmet;
  /** Warriors: which figures are Iberians (cap, long shield, falcata) rather than Celts. */
  iberianWarriors: (i: number) => boolean;
  medium: { legs: Legs; helmet: Helmet; shield: ShieldKind; shieldScale: number };
  heavy: (i: number) => FootKit;
}

function classicFoot(c: ClassicFoot): KitDef['foot'] {
  return (type, i) => {
    switch (type) {
      case 'LI':
        return {
          torso: 'tunic', skirt: true, legs: 'bare', helmet: 'none', crest: 'none',
          hair: i % 2 ? 'long' : 'short', shield: 'round', weapon: 'javelin', spare: 'javelins', sleeve: true, beard: c.skirmisherBeard(i),
        };
      case 'LB':
        return {
          torso: 'tunic', skirt: true, legs: 'bare', helmet: c.archerHelmet, crest: 'none', hair: 'short',
          shield: 'none', weapon: 'bow', sleeve: true, beard: c.archerBeard(i),
        };
      case 'LS':
        return {
          torso: 'tunic', skirt: true, legs: 'bare', helmet: 'none', crest: 'none', hair: i % 2 ? 'long' : 'short',
          shield: 'none', weapon: 'sling', sleeve: true, beard: i % 3 === 1,
        };
      case 'AX':
        return {
          torso: 'leather', skirt: true, legs: 'bare', helmet: c.auxiliaHelmet,
          crest: 'knob', hair: 'short', shield: 'oval', shieldScale: 0.84, painted: true, weapon: 'javelin', spare: 'spear', sleeve: true,
        };
      case 'WA':
        if (c.iberianWarriors(i)) {
          return {
            torso: 'tunic', skirt: true, legs: 'bare', helmet: 'cap', crest: 'none', hair: 'short', shield: 'longOval', shieldScale: 0.94, shieldDy: 2.4,
            weapon: 'sword', falcata: true, tribal: true, sleeve: true, moustache: true,
          };
        }
        return celticWarrior(i);
      case 'MI':
        return { torso: 'tunic', skirt: true, ...c.medium, crest: 'knob', hair: 'short', weapon: 'spear', sleeve: true };
      case 'HI':
      default:
        return c.heavy(i);
    }
  };
}

/** How one of the base game's kits dresses its cavalry (the base drawing). */
interface ClassicCavalry {
  lightHelmet: Helmet;
  lightBeard: (i: number) => boolean;
  medium: { torso: Torso; helmet: Helmet; crest: Crest; legs: RiderKit['legs'] };
  heavy: { torso: Torso; helmet: Helmet; crest: Crest; legs: RiderKit['legs'] };
}

function classicRider(c: ClassicCavalry): (type: UnitType, i: number) => RiderKit {
  return (type, i) => {
    if (type === 'LC') {
      return {
        torso: 'tunic', helmet: c.lightHelmet, crest: 'none', shield: 'round', weapon: 'javelin', legs: 'bare', spare: true, beard: c.lightBeard(i),
      };
    }
    if (type === 'HC') return { ...c.heavy, shield: 'none', weapon: 'lance' };
    return { ...c.medium, shield: 'round', weapon: 'spear' };
  };
}

const ARCHER = { crest: 'none', shield: 'none', weapon: 'bow', gorytos: 'arrows' } as const;

/** The base kits' general: Attic helmet, gilded cuirass, cloak, greaves. */
const CLASSIC_GENERAL: RiderKit = {
  torso: 'muscle', helmet: 'attic', crest: 'horsehair', shield: 'none', weapon: 'standard', legs: 'greaves', cloak: true,
};
const WHITE_HORSE: HorseCoat = { coat: '#e6dfd0', shade: '#aea592', mane: '#8c8272' };

// ---------------------------------------------------------------------------------------------
// Rome, Carthage, Syracuse (the base game; their foot, cavalry, chariots and elephants keep the base drawings)

const ROMAN: KitDef = {
  foot: classicFoot({
    skirmisherBeard: noFigures, archerHelmet: 'none', archerBeard: noFigures, auxiliaHelmet: 'montefortino', iberianWarriors: noFigures,
    medium: { legs: 'bare', helmet: 'montefortino', shield: 'oval', shieldScale: 1 },
    heavy: () => ({
      torso: 'mail', skirt: true, legs: 'bare', helmet: 'montefortino', crest: 'plumes', hair: 'short', shield: 'scutum',
      weapon: 'pilum', sleeve: false,
    }),
  }),
  cavalry: {
    drawing: 'base',
    rider: classicRider({
      lightHelmet: 'none', lightBeard: noFigures,
      medium: { torso: 'tunic', helmet: 'montefortino', crest: 'knob', legs: 'bare' },
      heavy: { torso: 'mail', helmet: 'montefortino', crest: 'plumes', legs: 'bare' },
    }),
  },
  horseArcher: { rider: () => ({ ...ARCHER, torso: 'tunic', helmet: 'none', legs: 'bare', bow: 'self' }), cloth: 'rich' },
  chariot: { drawing: 'base', warrior: { torso: 'mail', helmet: 'montefortino', crest: 'plumes' }, driverHelmet: 'cap' },
  elephant: { drawing: 'base', rider: { torso: 'tunic', helmet: 'montefortino' } },
  crew: (i) => ({ torso: 'mail', helmet: 'montefortino', crest: i % 2 ? 'plumes' : 'knob' }),
  crewBow: 'self',
  warMachine: 'scorpio',
  ovalShieldBoss: true,
  wickerPelta: false,
  general: { rider: CLASSIC_GENERAL, horse: WHITE_HORSE },
  bust: { helmet: 'atticOpen', crest: 'horsehair', beard: false },
};

const PUNIC: KitDef = {
  foot: classicFoot({
    skirmisherBeard: oddFigures, archerHelmet: 'cap', archerBeard: noFigures, auxiliaHelmet: 'conical', iberianWarriors: oddFigures,
    medium: { legs: 'bare', helmet: 'attic', shield: 'oval', shieldScale: 1 },
    heavy: (i) => ({
      torso: 'linen', skirt: true, pteruges: true, legs: 'greaves', helmet: 'attic', crest: 'horsehair', hair: 'short',
      shield: 'aspis', weapon: 'longSpear', beard: i % 2 === 0,
    }),
  }),
  cavalry: {
    drawing: 'base',
    barebackLight: true,
    rider: classicRider({
      lightHelmet: 'none', lightBeard: evenFigures,
      medium: { torso: 'tunic', helmet: 'conical', crest: 'knob', legs: 'trousers' },
      heavy: { torso: 'linen', helmet: 'attic', crest: 'horsehair', legs: 'greaves' },
    }),
  },
  horseArcher: { rider: (i) => ({ ...ARCHER, torso: 'tunic', helmet: 'cap', legs: 'bare', beard: i % 2 === 0, bow: 'scythian' }), cloth: 'rich' },
  chariot: { drawing: 'base', warrior: { torso: 'linen', helmet: 'attic', crest: 'horsehair' }, driverHelmet: 'cap' },
  elephant: { drawing: 'base', rider: { torso: 'tunic', helmet: 'conical' } },
  crew: (i) => ({ torso: 'linen', helmet: i % 2 ? 'attic' : 'conical', crest: i % 2 ? 'horsehair' : 'knob', beard: i % 2 === 0 }),
  crewBow: 'self',
  warMachine: 'oxybeles',
  ovalShieldBoss: false,
  wickerPelta: false,
  general: { rider: CLASSIC_GENERAL, horse: WHITE_HORSE },
  bust: { helmet: 'atticOpen', crest: 'horsehair', beard: true },
};

const GREEK: KitDef = {
  foot: classicFoot({
    skirmisherBeard: noFigures, archerHelmet: 'none', archerBeard: evenFigures, auxiliaHelmet: 'pilos', iberianWarriors: noFigures,
    medium: { legs: 'greaves', helmet: 'pilos', shield: 'aspis', shieldScale: 0.92 },
    heavy: () => ({
      torso: 'linen', skirt: true, pteruges: true, legs: 'greaves', helmet: 'corinthian', crest: 'tall', hair: 'short',
      shield: 'aspis', weapon: 'longSpear',
    }),
  }),
  cavalry: {
    drawing: 'base',
    rider: classicRider({
      lightHelmet: 'pilos', lightBeard: noFigures,
      medium: { torso: 'linen', helmet: 'attic', crest: 'none', legs: 'bare' },
      heavy: { torso: 'muscle', helmet: 'attic', crest: 'horsehair', legs: 'greaves' },
    }),
  },
  horseArcher: { rider: () => ({ ...ARCHER, torso: 'tunic', helmet: 'pilos', legs: 'bare', bow: 'self' }), cloth: 'rich' },
  chariot: { drawing: 'base', warrior: { torso: 'muscle', helmet: 'corinthian', crest: 'tall' }, driverHelmet: 'pilos' },
  elephant: { drawing: 'base', rider: { torso: 'linen', helmet: 'pilos' } },
  crew: (i) => ({ torso: 'linen', helmet: i % 2 ? 'corinthian' : 'pilos', crest: i % 2 ? 'tall' : 'knob' }),
  crewBow: 'self',
  warMachine: 'oxybeles',
  ovalShieldBoss: false,
  wickerPelta: false,
  // the general rides a horse of the army's own coats
  general: { rider: CLASSIC_GENERAL },
  bust: { helmet: 'atticOpen', crest: 'horsehair', beard: true },
};

// ---------------------------------------------------------------------------------------------
// Macedon and the Successors

/** Kausia-hatted skirmishers, Cretan archers, Thracian peltasts, hypaspists, the phalanx. */
function macedonianFoot(type: UnitType, i: number): FootKit {
  switch (type) {
    case 'LI':
      return {
        torso: 'tunic', skirt: true, legs: 'bare', helmet: i % 2 ? 'kausia' : 'none', crest: 'none', hair: 'short',
        shield: 'round', weapon: 'javelin', spare: 'javelins', sleeve: true, beard: i % 2 === 0,
      };
    case 'LB':
      return {
        torso: 'tunic', skirt: true, legs: 'bare', helmet: i % 2 ? 'none' : 'petasos', crest: 'none', hair: 'short',
        shield: 'none', weapon: 'bow', sleeve: true, beard: i % 2 === 1,
      };
    case 'LS':
      return {
        torso: 'tunic', skirt: true, legs: 'bare', helmet: i % 2 ? 'petasos' : 'none', crest: 'none', hair: 'short',
        shield: 'none', weapon: 'sling', sleeve: true, beard: i % 3 === 1,
      };
    case 'AX':
      return {
        torso: 'tunic', skirt: true, legs: 'boots', helmet: 'thracian', crest: 'knob', hair: 'short',
        shield: 'pelta', weapon: 'javelin', spare: 'spear', sleeve: true,
      };
    case 'WA':
      return celticWarrior(i);
    case 'MI':
      return {
        torso: 'linen', skirt: true, legs: 'greaves', helmet: 'phrygian', crest: 'horsehair', hair: 'short',
        shield: 'aspis', shieldScale: 0.92, weapon: 'spear', sleeve: true,
      };
    case 'HI':
    default:
      return {
        torso: 'linen', skirt: true, pteruges: true, legs: 'greaves', helmet: 'phrygian', crest: i % 2 ? 'plume2' : 'horsehair', hair: 'short',
        shield: 'phalanx', weapon: 'sarissa',
      };
  }
}

/** Thessalian / Thracian light horse, Companion-style medium and heavy cavalry with the xyston. */
function macedonianMount(type: UnitType, i: number): MountKit {
  if (type === 'LC') {
    // petasos or Thracian helmet, javelins, painted shield
    return {
      rider: { torso: 'tunic', helmet: i % 2 ? 'thracian' : 'petasos', crest: 'none', shield: 'round', weapon: 'javelin', legs: 'bare', spare: true, cloak: i % 2 === 0 },
      cloth: 'plain',
    };
  }
  if (type === 'HC') {
    return { rider: { torso: 'muscle', helmet: 'boeotian', crest: 'horsehair', shield: 'none', weapon: 'lance', legs: 'greaves' }, cloth: 'leopard', barding: true };
  }
  // MC: linen corslet, Boeotian helmet, xyston
  return { rider: { torso: 'linen', helmet: 'boeotian', crest: 'none', shield: 'none', weapon: 'lance', legs: 'bare' }, cloth: 'plain' };
}

const MACEDONIAN: KitDef = {
  foot: macedonianFoot,
  cavalry: { drawing: 'kit', mount: macedonianMount },
  horseArcher: {
    // Dahae mercenaries from the steppe, and Thracian horse archers in fox-fur-like caps
    rider: (i) => (i % 2
      ? { ...ARCHER, torso: 'tunic', helmet: 'thracian', legs: 'trousers', longSleeve: true, bow: 'scythian', moustache: true }
      : { ...ARCHER, torso: 'kaftan', helmet: 'scythianCap', legs: 'trousers', longSleeve: true, hair: 'long', beard: true, bow: 'scythian', backShot: i === 0 }),
    cloth: 'plain',
  },
  // a Successor's driver in a crested helmet
  chariot: { drawing: 'scythed', driver: { torso: 'scale', helmet: 'phrygian', crest: 'horsehair' } },
  // Indian elephants with a tower and a Macedonian crew (Pyrrhus, Antigonus, Eumenes)
  elephant: { drawing: 'loaded', body: 'indian', load: 'tower', crew: ['pike', 'javelin'], scale: 0.94 },
  crew: (i) => ({ torso: 'linen', helmet: i % 2 ? 'thracian' : 'phrygian', crest: i % 2 ? 'knob' : 'horsehair' }),
  crewBow: 'self',
  warMachine: 'oxybeles',
  ovalShieldBoss: false,
  wickerPelta: false,
  // the Macedonian king: Phrygian helmet with tall plumes, gilded cuirass, cloak
  general: { rider: { torso: 'muscle', helmet: 'phrygian', crest: 'plume2', shield: 'none', weapon: 'standard', legs: 'greaves', cloak: true } },
  bust: { helmet: 'phrygian', crest: 'horsehair', beard: false },
  iconBox: {
    HI: [-35.5, 0.4, -14.2, 18.6], LC: [-35.9, 0.4, -18.2, 19.3], MC: [-38.8, 0.7, -19.7, 21.4], EL: [-48.3, 1, -17.5, 24.1],
    HCH: [-40.3, 0.9, -24.6, 31.9], LBC: [-37.9, 0.4, -18.2, 19.3],
  },
};

// ---------------------------------------------------------------------------------------------
// The Eastern kingdoms

/** India, Persia (and the Scythian kit): a richly caparisoned elephant with a howdah, javelin-man and archer. */
const HOWDAH_ELEPHANT: LoadedElephant = { drawing: 'loaded', body: 'indian', load: 'howdah', rich: true, crew: ['javelin', 'bow'], scale: 1 };

/** Achaemenid Persia: hoods, long sleeves and trousers; wicker shields; bows everywhere. */
function persianFoot(type: UnitType, i: number): FootKit {
  const dress = { torso: 'tunic' as const, skirt: true, legs: 'trousers' as const, helmet: 'tiara' as const, crest: 'none' as const, hair: 'short' as const, sleeve: true, longSleeve: true };
  switch (type) {
    case 'LI':
      return { ...dress, shield: 'round', weapon: 'javelin', spare: 'javelins', beard: i % 2 === 0 };
    case 'LB':
      return { ...dress, shield: 'none', weapon: 'bow', beard: i % 2 === 1 };
    case 'LS':
      return { ...dress, shield: 'none', weapon: 'sling', beard: i % 2 === 0 };
    case 'AX':
      // takabara with the crescent wicker shield
      return { ...dress, shield: 'pelta', weapon: 'javelin', spare: 'spear', beard: true };
    case 'WA':
      // hill tribesmen with axes
      return { ...dress, shield: 'pelta', weapon: 'axe', beard: true };
    case 'MI':
      // sparabara: wicker shield and spear, bow case at the hip
      return { ...dress, shield: 'spara', weapon: 'spear', back: 'bowcase', beard: true };
    case 'HI':
    default:
      // the King's apple-bearers in scale coats
      return { ...dress, torso: 'scale', shield: 'spara', weapon: 'spear', butt: 'pomegranate', back: 'bowcase', beard: true };
  }
}

function persianMount(type: UnitType, i: number): MountKit {
  const dress = { helmet: 'tiara' as const, crest: 'none' as const, legs: 'trousers' as const, longSleeve: true };
  if (type === 'LC') return { rider: { ...dress, torso: 'tunic', shield: 'none', weapon: 'javelin', spare: true, beard: i % 2 === 0 }, cloth: 'rich' };
  if (type === 'HC') return { rider: { ...dress, torso: 'scale', shield: 'none', weapon: 'lance', beard: true }, cloth: 'rich', barding: true };
  return { rider: { ...dress, torso: 'tunic', shield: 'none', weapon: 'spear', beard: true }, cloth: 'rich' };
}

const PERSIAN: KitDef = {
  foot: persianFoot,
  cavalry: { drawing: 'kit', mount: persianMount },
  horseArcher: {
    rider: (i) => ({ ...ARCHER, torso: 'tunic', helmet: 'tiara', legs: 'trousers', longSleeve: true, beard: i % 2 === 0, bow: 'scythian', backShot: i === 0 }),
    cloth: 'rich',
  },
  // a Persian driver in his hood
  chariot: { drawing: 'scythed', driver: { torso: 'scale', helmet: 'tiara', crest: 'none', longSleeve: true, beard: true } },
  elephant: HOWDAH_ELEPHANT,
  crew: () => ({ torso: 'tunic', helmet: 'tiara', crest: 'none', longSleeve: true, beard: true, legs: 'trousers' }),
  crewBow: 'scythian',
  warMachine: 'oxybeles',
  ovalShieldBoss: false,
  wickerPelta: true,
  // Persian noble: upright tiara, robe, trousers
  general: {
    rider: { torso: 'robe', helmet: 'kidaris', crest: 'none', shield: 'none', weapon: 'standard', legs: 'trousers', cloak: true, beard: true },
    torque: true,
  },
  bust: { helmet: 'kidaris', crest: 'none', beard: true, robe: true },
  iconBox: {
    WA: [-40, 0.4, -6.1, 11.4], HI: [-40, 2.6, -7.8, 10.4], LC: [-35.9, 0.4, -18.2, 19.3], HC: [-41, 0.6, -20.8, 22.7],
    EL: [-48.1, 1, -18.5, 25.6], HCH: [-37.6, 0.9, -24.6, 31.9], HWM: [-32.6, 0.4, -28.1, 21.9],
  },
};

/** Scythians: pointed caps, kaftans and trousers, gorytos at the hip. */
function scythianFoot(type: UnitType, i: number): FootKit {
  const dress = { torso: 'kaftan' as const, skirt: true, legs: 'trousers' as const, helmet: 'scythianCap' as const, crest: 'none' as const, hair: 'long' as const, sleeve: true, longSleeve: true, beard: true };
  switch (type) {
    case 'LI':
      return { ...dress, shield: 'round', weapon: 'javelin', spare: 'javelins', beard: i % 2 === 0 };
    case 'LB':
      return { ...dress, shield: 'none', weapon: 'bow', bow: 'scythian', back: 'gorytos' };
    case 'LS':
      return { ...dress, shield: 'none', weapon: 'sling', beard: i % 2 === 1 };
    case 'AX':
      return { ...dress, shield: 'pelta', weapon: 'axe', spare: 'spear' };
    case 'WA':
      return { ...dress, helmet: 'none', hair: 'wild', shield: 'round', weapon: 'axe', moustache: true };
    case 'MI':
      return { ...dress, torso: 'scale', shield: 'spara', weapon: 'spear', back: 'gorytos' };
    case 'HI':
    default:
      return { ...dress, torso: 'scale', helmet: 'conical', shield: 'spara', weapon: 'spear', back: 'gorytos' };
  }
}

function scythianMount(type: UnitType, i: number): MountKit {
  const dress = { legs: 'trousers' as const, longSleeve: true, hair: 'long' as const, beard: true, crest: 'none' as const };
  if (type === 'LC') return { rider: { ...dress, torso: 'kaftan', helmet: 'scythianCap', shield: 'none', weapon: 'javelin', spare: true, gorytos: 'bow' }, cloth: 'plain' };
  if (type === 'HC') return { rider: { ...dress, torso: 'scale', helmet: 'conical', shield: 'none', weapon: 'lance', gorytos: 'bow' }, cloth: 'plain', barding: true };
  // noble cavalry in scale coats with Greek-made helmets or caps
  return { rider: { ...dress, torso: 'scale', helmet: i % 2 ? 'conical' : 'scythianCap', shield: 'none', weapon: 'spear', gorytos: 'bow' }, cloth: 'plain' };
}

const SCYTHIAN: KitDef = {
  foot: scythianFoot,
  cavalry: { drawing: 'kit', mount: scythianMount },
  horseArcher: {
    rider: (i) => ({ ...ARCHER, torso: 'kaftan', helmet: 'scythianCap', legs: 'trousers', longSleeve: true, hair: 'long', beard: true, bow: 'scythian', backShot: i === 0 }),
    cloth: 'plain',
  },
  chariot: { drawing: 'light' },
  elephant: HOWDAH_ELEPHANT,
  crew: () => ({ torso: 'kaftan', helmet: 'scythianCap', crest: 'none', longSleeve: true, hair: 'long', beard: true, legs: 'trousers' }),
  crewBow: 'scythian',
  warMachine: 'oxybeles',
  ovalShieldBoss: false,
  wickerPelta: true,
  // Scythian chief: pointed cap, scale coat, trousers
  general: {
    rider: { torso: 'scale', helmet: 'scythianCap', crest: 'none', shield: 'none', weapon: 'standard', legs: 'trousers', beard: true },
    torque: true,
    gorytos: true,
  },
  bust: { helmet: 'scythianCap', crest: 'none', beard: true, robe: true },
  iconBox: {
    LI: [-37.1, 0.4, -11.7, 12.4], LB: [-37.1, 0.4, -7.4, 14.6], AX: [-40, 0.4, -6.1, 11.4], WA: [-40, 0.4, -7, 10.8],
    HI: [-40, 1.9, -7.4, 10.4], LC: [-37.9, 0.4, -18.2, 19.3], HC: [-41, 0.6, -20.8, 22.7], EL: [-49.9, 1, -18.5, 25.6],
    HCH: [-41.5, 0.9, -21.8, 31], LBC: [-37.9, 0.4, -18.2, 19.3],
  },
};

/** India: turbans, white cotton, longbows, long bamboo shields, broadswords. */
function indianFoot(type: UnitType, i: number): FootKit {
  const dress = { torso: 'cotton' as const, skirt: true, legs: 'bare' as const, helmet: 'turban' as const, crest: 'none' as const, hair: 'short' as const, beard: i % 2 === 0 };
  switch (type) {
    case 'LI':
      return { ...dress, shield: 'round', weapon: 'javelin', spare: 'javelins' };
    case 'LB':
      return { ...dress, shield: 'none', weapon: 'longbow' };
    case 'LS':
      return { ...dress, shield: 'none', weapon: 'sling' };
    case 'AX':
      return { ...dress, shield: 'bamboo', shieldDy: 2.2, weapon: 'javelin', spare: 'spear' };
    case 'WA':
      // hill tribesmen
      return { ...dress, torso: 'bare', helmet: 'none', hair: 'long', shield: 'bamboo', shieldDy: 2.2, weapon: 'greatsword', beard: true };
    case 'MI':
      return { ...dress, shield: 'bamboo', shieldDy: 2.2, weapon: 'spear', beard: true };
    case 'HI':
    default:
      return { ...dress, torso: 'scale', shield: 'bamboo', shieldDy: 2.2, weapon: 'greatsword', beard: true };
  }
}

function indianMount(type: UnitType, i: number): MountKit {
  const dress = { helmet: 'turban' as const, crest: 'none' as const, legs: 'bare' as const };
  if (type === 'LC') return { rider: { ...dress, torso: 'cotton', shield: 'round', weapon: 'javelin', spare: true, beard: i % 2 === 0 }, cloth: 'rich' };
  if (type === 'HC') return { rider: { ...dress, torso: 'scale', shield: 'none', weapon: 'lance', beard: true }, cloth: 'rich', barding: true };
  return { rider: { ...dress, torso: 'cotton', shield: 'round', weapon: 'spear', beard: true }, cloth: 'rich' };
}

const INDIAN: KitDef = {
  foot: indianFoot,
  cavalry: { drawing: 'kit', mount: indianMount },
  horseArcher: { rider: (i) => ({ ...ARCHER, torso: 'cotton', helmet: 'turban', legs: 'bare', beard: i % 2 === 0, bow: 'self' }), cloth: 'rich' },
  chariot: { drawing: 'great' },
  elephant: HOWDAH_ELEPHANT,
  crew: (i) => ({ torso: 'cotton', helmet: 'turban', crest: 'none', beard: i % 2 === 0 }),
  crewBow: 'self',
  warMachine: 'oxybeles',
  ovalShieldBoss: false,
  wickerPelta: false,
  // Indian raja: turban and white cotton, under the royal parasol
  general: {
    rider: { torso: 'cotton', helmet: 'turban', crest: 'none', shield: 'none', weapon: 'standard', legs: 'bare', beard: true },
    torque: true,
    jewel: true,
  },
  bust: { helmet: 'turban', crest: 'none', beard: true, robe: true },
  iconBox: {
    LB: [-41.6, 0.4, -9.6, 17.4], MI: [-40, 1.9, -6.4, 8.7], LC: [-35.9, 0.4, -18.2, 19.3], HC: [-41, 0.6, -20.8, 22.7],
    EL: [-49.3, 1, -18.5, 25.6], HCH: [-40, 0.9, -32.5, 31.9], HWM: [-32.9, 0.4, -28.4, 21.9],
  },
};

/**
 * Fills the choices a kit leaves out: crews dressed as its medium infantry, the base game's chariot and elephant manned
 * by such crews, horse archers built from its light horseman, the self bow, the oxybeles, plain shields, no icon boxes.
 */
function completeKit(k: KitDef): FullKit {
  const crew = k.crew ?? ((i: number): CrewDress => {
    const f = k.foot('MI', i);
    return {
      torso: f.torso, helmet: f.helmet, crest: f.crest, hair: f.hair, beard: f.beard, moustache: f.moustache,
      longSleeve: f.longSleeve, legs: f.legs === 'trousers' ? 'trousers' : 'bare',
    };
  });
  const light = (i: number): RiderKit => (k.cavalry.drawing === 'kit' ? k.cavalry.mount('LC', i).rider : k.cavalry.rider('LC', i));
  const c0 = crew(0);
  return {
    foot: k.foot,
    cavalry: k.cavalry,
    horseArcher: k.horseArcher ?? { rider: (i) => ({ ...light(i), ...ARCHER, spare: undefined }), cloth: 'plain' },
    chariot: k.chariot ?? { drawing: 'base', warrior: { torso: c0.torso, helmet: c0.helmet, crest: c0.crest }, driverHelmet: crew(1).helmet },
    elephant: k.elephant ?? { drawing: 'base', rider: { torso: c0.torso, helmet: c0.helmet } },
    crew,
    crewBow: k.crewBow ?? 'self',
    warMachine: k.warMachine ?? 'oxybeles',
    ovalShieldBoss: k.ovalShieldBoss ?? false,
    wickerPelta: k.wickerPelta ?? false,
    general: k.general,
    bust: k.bust,
    iconBox: k.iconBox ?? {},
  };
}

/** The kits as defined (only what each kit chooses). */
export const KIT_DEFS: Record<Kit, KitDef> = {
  roman: ROMAN,
  punic: PUNIC,
  greek: GREEK,
  macedonian: MACEDONIAN,
  persian: PERSIAN,
  scythian: SCYTHIAN,
  indian: INDIAN,
};

/** Every figure kit, completed (see `completeKit`): the table the drawing code reads. */
export const KITS = Object.fromEntries(Object.entries(KIT_DEFS).map(([kit, def]) => [kit, completeKit(def)])) as Record<Kit, FullKit>;
