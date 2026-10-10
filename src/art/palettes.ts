import type { ArmyLook, Blocks, EliteId, UnitType } from '../engine/types';
import { darken, lighten } from './color';
import type { CrewDress, FootLook } from './foot';
import type { BustDef, ElephantDef, HorseCoat, MountKit } from './kits';
import type { RiderKit } from './mounted';
import type { Crest, Helmet } from './parts';

/** Figure kit: the shapes (helmets, shields, torsos, mounts) an army's miniatures are built from. */
export type Kit = 'roman' | 'punic' | 'greek' | 'macedonian' | 'persian' | 'scythian' | 'indian' | 'celtic' | 'germanic' | 'lateRoman';

/**
 * The elite presets that have art: the engine's `EliteId`, plus the Tenth Legion until the engine's Expansion #2 types
 * (plan Task 5) add it to `EliteId` on this branch; then this is just `EliteId`.
 */
export type ArtEliteId = EliteId | 'tenthLegion';

/** Cloth colours of a captured banner (the victory banner track). */
export interface BannerCloth {
  main: string;
  light: string;
  dark: string;
}

/** Base-edge, standard and banner-track colours of a block set: the colour that says which side a piece belongs to. */
export interface SideColors {
  edge: string;
  edgeShade: string;
  edgeLight: string;
  banner: string;
  bannerShade: string;
  /** Cloth of this side's standards on the victory banner track (shown when its banners are captured). */
  cloth: BannerCloth;
}

/** The swatches that belong to an army's look (everything except the side colours, which come from the blocks). */
export interface LookPalette {
  /** Dark outline used for every figure stroke. */
  outline: string;
  tunic: string;
  tunicShade: string;
  tunicLight: string;
  /** Hems, collars, saddle-cloth borders. */
  trim: string;
  trousers: string;
  trousersShade: string;
  cloak: string;
  cloakShade: string;
  shield: string;
  shieldShade: string;
  shieldLight: string;
  shieldRim: string;
  shieldEmblem: string;
  /** Painted shields of light troops and tribal warriors. */
  paint: string;
  paintShade: string;
  paintLight: string;
  paintEmblem: string;
  /** Helmets / greaves / bosses (bronze). */
  metal: string;
  metalShade: string;
  metalLight: string;
  /** Mail and iron. */
  iron: string;
  ironShade: string;
  ironLight: string;
  /** Linen cuirass. */
  linen: string;
  linenShade: string;
  leather: string;
  leatherShade: string;
  wood: string;
  woodShade: string;
  crest: string;
  crestShade: string;
  /** Second crest colour (stripe / feather). */
  crestAlt: string;
  skin: string[];
  hair: string[];
  horses: { coat: string; shade: string; mane: string }[];
  saddle: string;
  saddleShade: string;
  elephant: string;
  elephantShade: string;
  ivory: string;
  /** Painted miniature base: flocked top (the strong side-coloured edge is added from the blocks). */
  baseTop: string;
  baseTopShade: string;
  bannerEmblem: string;
  gold: string;
  goldShade: string;
  // Optional swatches, used only by the Expansion #1 kits (the base looks have none).
  /** Cloth headgear: Persian tiaras, Scythian caps, turbans, kausiai, petasoi. */
  cap?: string;
  capShade?: string;
  /** Woven / embroidered pattern on robes, tunics, trousers and bow cases. */
  pattern?: string;
  // Optional swatches of the Expansion #2 looks.
  /** Hide and fur cloaks (Germanic warriors). */
  fur?: string;
  /** Woad body paint (Britons). */
  woad?: string;
}

/** Devices painted on shields and on the army standard (drawn by `Emblem` in parts.tsx). */
export type EmblemKind =
  | 'rome' | 'carthage' | 'syracuse'
  | 'owl' | 'gorgon' | 'bull' | 'triskeles' | 'club' | 'lambda' | 'phi' | 'tripod'
  | 'star' | 'macShield' | 'thunderbolt' | 'anchor' | 'eagle' | 'trident'
  | 'wingedDisc' | 'stag' | 'wheel' | 'meru'
  // Expansion #2: Celtic La Tene scroll, boar, back-to-back crescents and the chalk-figure horse; Germanic shield paint
  // (two halves, a ring round the boss, diagonal bands); Jupiter's winged thunderbolt of the legions; the freedman's cap
  | 'scroll' | 'boar' | 'crescents' | 'horse' | 'halves' | 'ring' | 'bands' | 'wingedBolt' | 'pileus'
  | 'none';

/** Device on the cloth of the army standard: an emblem, or the Roman laurel wreath. */
export type StandardDevice = EmblemKind | 'wreath';

/** Pole-top ornament of the army standard. */
export type Finial =
  | 'eagle' | 'crescent' | 'lozenge' | 'star' | 'spearhead' | 'royalEagle' | 'wheel' | 'trident' | 'stag'
  // Expansion #2: a bronze boar or bull (the Cimbri's bull, Plutarch) and the cap of liberty on a spear
  | 'boar' | 'bull' | 'pileus';

/**
 * Look-specific art choices beyond the swatches: shield devices, the army standard, per-figure paint variants and the
 * look's exceptions to its kit (`KITS` in kits.ts): foot figures, mounts, elephants, the chariot driver, the general.
 * The base looks only name their devices (their figures are the kit's).
 */
export interface LookStyle {
  /** Devices on line-infantry shields (aspis, oval, phalanx, thureos), one per figure index, cycling. */
  emblems: EmblemKind[];
  /** Devices on painted light-troop shields (default: `emblems`). */
  paintEmblems?: EmblemKind[];
  /**
   * Standard: device on the banner cloth and the finial; `parasol` is the Indian royal parasol (chattra), `carnyx` the
   * Celtic war trumpet with its boar's head and a streamer in the side colour, `aquila` the legion's eagle over a vexillum.
   */
  device: StandardDevice;
  finial: Finial;
  standard?: 'banner' | 'parasol' | 'carnyx' | 'aquila';
  /** Paint variants per figure index (cycled): mixed contingents, colourful robes. */
  variants?: Partial<LookPalette>[];
  /** Overrides of the kit's foot figures per unit type: one override, or one per figure index (cycled). */
  foot?: Partial<Record<UnitType, FootLook | FootLook[]>>;
  /**
   * Overrides of the kit's mounts per unit type (horse archers, and the cavalry of kits not drawn as the base game's):
   * one, or one per figure index (cycled; `{}` keeps the kit's mount).
   */
  mounted?: Partial<Record<UnitType, Partial<MountKit> | Partial<MountKit>[]>>;
  /** The look's elephants instead of the kit's. */
  elephant?: ElephantDef;
  /** Changes to the dress of the kit's scythed-chariot driver. */
  chariotDriver?: Partial<CrewDress>;
  /** The general: colours (cloak, saddle cloth), horse, and helmet / crest instead of the kit's. */
  general?: Partial<LookPalette> & { horse?: { coat: string; shade: string; mane: string }; helmet?: Helmet; crest?: Crest };
}

/**
 * Paint scheme of one army as drawn: its look's swatches, the side colours of its blocks and the kit it is built from.
 * Every figure is painted from these swatches (plus small per-figure variation). Resolve with `paletteFor`.
 */
export interface Palette extends LookPalette {
  /** The look this palette was resolved from (per-look figure variants key on it). */
  look: ArmyLook;
  kit: Kit;
  style: LookStyle;
  /** Painted miniature base: strong side-coloured edge. */
  baseEdge: string;
  baseEdgeShade: string;
  baseEdgeLight: string;
  banner: string;
  bannerShade: string;
}

/** The flocked top of every miniature's base (the board contrast tests check block edges against it). */
export const BASE_TOP = '#6e6a3c';

const common = {
  outline: '#1d140e',
  iron: '#8f949a',
  ironShade: '#5a5f66',
  ironLight: '#c9ced3',
  leather: '#7a4f2a',
  leatherShade: '#4e3018',
  wood: '#9a6a3a',
  woodShade: '#5e3c1c',
  ivory: '#f1e6c8',
  baseTop: BASE_TOP,
  baseTopShade: '#4f4c2a',
  gold: '#e9bf4f',
  goldShade: '#a87a22',
  elephant: '#8d8a86',
  elephantShade: '#5e5b58',
};

const ROMAN: LookPalette = {
  ...common,
  tunic: '#b8232b',
  tunicShade: '#7a141b',
  tunicLight: '#de4a44',
  trim: '#e9bf4f',
  trousers: '#6b4a32',
  trousersShade: '#46301f',
  cloak: '#a51e26',
  cloakShade: '#6c1117',
  shield: '#ad2229',
  shieldShade: '#73141a',
  shieldLight: '#dc5249',
  shieldRim: '#c9a25a',
  shieldEmblem: '#f2c94f',
  paint: '#ad2229',
  paintShade: '#73141a',
  paintLight: '#dc5249',
  paintEmblem: '#f2c94f',
  metal: '#c7923d',
  metalShade: '#85591f',
  metalLight: '#f3d68e',
  linen: '#e8dfc8',
  linenShade: '#b9ad90',
  crest: '#1c1a1e',
  crestShade: '#000000',
  crestAlt: '#d42a2e',
  skin: ['#e6b48a', '#d9a077', '#cc9168', '#e0aa80'],
  hair: ['#3a2416', '#24170f', '#5a3a20', '#2e1d12'],
  horses: [
    { coat: '#8a5530', shade: '#5c3519', mane: '#2a1a10' },
    { coat: '#5e3a22', shade: '#3c2414', mane: '#1a110b' },
    { coat: '#a77446', shade: '#714a28', mane: '#3a2414' },
  ],
  saddle: '#b8232b',
  saddleShade: '#7a141b',
  bannerEmblem: '#f2c94f',
};

const CARTHAGINIAN: LookPalette = {
  ...common,
  tunic: '#eee4cd',
  tunicShade: '#bfb092',
  tunicLight: '#fffaf0',
  trim: '#64206c',
  trousers: '#7a5a3c',
  trousersShade: '#4e3824',
  cloak: '#5f1d68',
  cloakShade: '#3a0f40',
  shield: '#5d1d66',
  shieldShade: '#3a1040',
  shieldLight: '#8a3f94',
  shieldRim: '#c9a25a',
  shieldEmblem: '#f2c94f',
  paint: '#5d1d66',
  paintShade: '#3a1040',
  paintLight: '#8a3f94',
  paintEmblem: '#f2c94f',
  metal: '#c39046',
  metalShade: '#80591f',
  metalLight: '#f1d593',
  linen: '#efe6cf',
  linenShade: '#bfb294',
  crest: '#6a2374',
  crestShade: '#3e1046',
  crestAlt: '#f1e8d2',
  skin: ['#c88d5e', '#a87048', '#8c5a38', '#d8a276'],
  hair: ['#1f140d', '#2c1c12', '#140d08', '#3e2818'],
  horses: [
    { coat: '#6b4128', shade: '#432716', mane: '#1a110b' },
    { coat: '#2e231d', shade: '#1a130f', mane: '#0c0806' },
    { coat: '#a0703f', shade: '#6a4524', mane: '#2a1a10' },
  ],
  saddle: '#5d1d66',
  saddleShade: '#3a1040',
  bannerEmblem: '#f2c94f',
};

const SYRACUSAN: LookPalette = {
  ...common,
  tunic: '#24449a',
  tunicShade: '#152b66',
  tunicLight: '#4a6fc4',
  trim: '#e6d6a4',
  trousers: '#6b4a32',
  trousersShade: '#46301f',
  cloak: '#1f3d8c',
  cloakShade: '#122658',
  shield: '#c99a48',
  shieldShade: '#8d6526',
  shieldLight: '#f1d48c',
  shieldRim: '#a8782f',
  shieldEmblem: '#1d3f9a',
  paint: '#2a50aa',
  paintShade: '#183272',
  paintLight: '#5f86d6',
  paintEmblem: '#f0d48a',
  metal: '#c99545',
  metalShade: '#8a5f22',
  metalLight: '#f4d98f',
  linen: '#efe7d2',
  linenShade: '#c0b497',
  crest: '#1f3a86',
  crestShade: '#0f1f4c',
  crestAlt: '#f2ead4',
  skin: ['#e2ae84', '#d49c70', '#c88f64', '#dca67c'],
  hair: ['#2e1d12', '#3e2818', '#1c120c', '#4a3020'],
  horses: [
    { coat: '#e3dccb', shade: '#a99f8a', mane: '#8a8070' },
    { coat: '#7a4a2a', shade: '#4e2e18', mane: '#22160e' },
    { coat: '#4e3a2c', shade: '#30241b', mane: '#120c08' },
  ],
  saddle: '#24449a',
  saddleShade: '#152b66',
  bannerEmblem: '#f2c94f',
};

// ---------------------------------------------------------------------------------------------
// Expansion #1 looks. Built from a few main colours; shades and lights are derived.

const BRONZE: [string, string, string] = ['#c99545', '#8a5f22', '#f4d98f'];
const GREEK_SKIN = ['#e2ae84', '#d49c70', '#c88f64', '#dca67c'];
const GREEK_HAIR = ['#2e1d12', '#3e2818', '#1c120c', '#4a3020'];
const PERSIAN_SKIN = ['#d6a074', '#c48c60', '#b87e54', '#cf9a6c'];
const PERSIAN_HAIR = ['#1a120c', '#24170f', '#140d08', '#2e1d12'];
const STEPPE_SKIN = ['#e8bc94', '#e0b088', '#dcaa80', '#e6b890'];
const STEPPE_HAIR = ['#6a4224', '#8a5a2a', '#4a2e18', '#a8743a'];
const INDIAN_SKIN = ['#a8714a', '#946038', '#b57e52', '#8a5634'];
const INDIAN_HAIR = ['#141010', '#1c1410', '#100c0a', '#201812'];

const HORSES_GREEK: LookPalette['horses'] = [
  { coat: '#7a4a2a', shade: '#4e2e18', mane: '#22160e' },
  { coat: '#e3dccb', shade: '#a99f8a', mane: '#8a8070' },
  { coat: '#4e3a2c', shade: '#30241b', mane: '#120c08' },
];
const HORSES_MACEDONIAN: LookPalette['horses'] = [
  { coat: '#2e2620', shade: '#1a1410', mane: '#0c0806' },
  { coat: '#8a5530', shade: '#5c3519', mane: '#2a1a10' },
  { coat: '#a77446', shade: '#714a28', mane: '#3a2414' },
];
const HORSES_EAST: LookPalette['horses'] = [
  { coat: '#ddd5c4', shade: '#a39985', mane: '#76695a' },
  { coat: '#9a6a3c', shade: '#664220', mane: '#2a1a10' },
  { coat: '#5e3a22', shade: '#3c2414', mane: '#1a110b' },
];
const HORSES_STEPPE: LookPalette['horses'] = [
  { coat: '#b8935a', shade: '#7e6234', mane: '#3a2a18' },
  { coat: '#7a5434', shade: '#4e341e', mane: '#22160e' },
  { coat: '#d2c2a0', shade: '#9a8a6a', mane: '#5a4a34' },
];

/** Main colour -> [main, shade, light]. */
function tone(c: string, shade = 0.36, light = 0.3): [string, string, string] {
  return [c, darken(c, shade), lighten(c, light)];
}

interface LookSpec {
  tunic: string;
  trim: string;
  trousers: string;
  cloak: string;
  shield: string;
  shieldRim: string;
  shieldEmblem: string;
  paint: string;
  paintEmblem: string;
  metal?: [string, string, string];
  linen?: string;
  crest: string;
  crestAlt: string;
  skin: string[];
  hair: string[];
  horses: LookPalette['horses'];
  saddle?: string;
  bannerEmblem?: string;
  cap?: string;
  pattern?: string;
  fur?: string;
  woad?: string;
}

function look(o: LookSpec): LookPalette {
  const [tunic, tunicShade, tunicLight] = tone(o.tunic);
  const [shield, shieldShade, shieldLight] = tone(o.shield, 0.34, 0.32);
  const [paint, paintShade, paintLight] = tone(o.paint, 0.34, 0.32);
  const [metal, metalShade, metalLight] = o.metal ?? BRONZE;
  const linen = o.linen ?? '#efe7d2';
  const saddle = o.saddle ?? o.cloak;
  return {
    ...common,
    tunic, tunicShade, tunicLight,
    trim: o.trim,
    trousers: o.trousers, trousersShade: darken(o.trousers, 0.34),
    cloak: o.cloak, cloakShade: darken(o.cloak, 0.38),
    shield, shieldShade, shieldLight, shieldRim: o.shieldRim, shieldEmblem: o.shieldEmblem,
    paint, paintShade, paintLight, paintEmblem: o.paintEmblem,
    metal, metalShade, metalLight,
    linen, linenShade: darken(linen, 0.22),
    crest: o.crest, crestShade: darken(o.crest, 0.4), crestAlt: o.crestAlt,
    skin: o.skin,
    hair: o.hair,
    horses: o.horses,
    saddle, saddleShade: darken(saddle, 0.36),
    bannerEmblem: o.bannerEmblem ?? '#f2c94f',
    ...(o.cap ? { cap: o.cap, capShade: darken(o.cap, 0.32) } : {}),
    ...(o.pattern ? { pattern: o.pattern } : {}),
    ...(o.fur ? { fur: o.fur } : {}),
    ...(o.woad ? { woad: o.woad } : {}),
  };
}

/** Paint variants for one figure. */
const tunicOf = (c: string): Partial<LookPalette> => {
  const [tunic, tunicShade, tunicLight] = tone(c);
  return { tunic, tunicShade, tunicLight };
};
const shieldOf = (c: string, emblem?: string): Partial<LookPalette> => {
  const [shield, shieldShade, shieldLight] = tone(c, 0.34, 0.32);
  return { shield, shieldShade, shieldLight, ...(emblem ? { shieldEmblem: emblem } : {}) };
};
const capOf = (c: string): Partial<LookPalette> => ({ cap: c, capShade: darken(c, 0.32) });
const trousersOf = (c: string): Partial<LookPalette> => ({ trousers: c, trousersShade: darken(c, 0.34) });
/** Painted (light-troop and tribal) shield colours for one figure. */
const paintOf = (c: string, emblem: string): Partial<LookPalette> => {
  const [paint, paintShade, paintLight] = tone(c, 0.34, 0.32);
  return { paint, paintShade, paintLight, paintEmblem: emblem };
};

// --- Greek city armies (kit `greek`) --------------------------------------------------------

/** Athens: white linen corslets, bronze shields with black-painted devices, black crests; Scythian archers. */
const ATHENIAN = look({
  tunic: '#e6dcc6', trim: '#2a2630', trousers: '#8a3a2a', cloak: '#7a2a22',
  shield: '#c99a48', shieldRim: '#a8782f', shieldEmblem: '#211c1c',
  paint: '#a04a2a', paintEmblem: '#f0e4c4',
  linen: '#f3eddf', crest: '#25201f', crestAlt: '#e8dcc0',
  skin: GREEK_SKIN, hair: GREEK_HAIR, horses: HORSES_GREEK, saddle: '#7a2a22',
  cap: '#a8382a', pattern: '#e8c050',
});

/** Thebes: brown tunics, crimson cloaks and crests, white shields with the club of Heracles. */
const THEBAN = look({
  tunic: '#8a5634', trim: '#9a1f2a', trousers: '#6b4a32', cloak: '#951f2b',
  shield: '#ece4d0', shieldRim: '#b8873a', shieldEmblem: '#2a1c14',
  paint: '#951f2b', paintEmblem: '#ece4d0',
  crest: '#951f2b', crestAlt: '#f2ead4',
  skin: GREEK_SKIN, hair: GREEK_HAIR, horses: HORSES_GREEK,
});

/** Sparta: scarlet tunics and cloaks, crimson shields with the lambda, long hair. */
const SPARTAN = look({
  tunic: '#b3241d', trim: '#e2c06a', trousers: '#6b4a32', cloak: '#a01d19',
  shield: '#a61f1b', shieldRim: '#c99545', shieldEmblem: '#f0d48a',
  paint: '#8a5a32', paintEmblem: '#f0d48a',
  crest: '#1f1b1e', crestAlt: '#c8342a',
  skin: GREEK_SKIN, hair: GREEK_HAIR, horses: HORSES_GREEK,
});

/** Phocis: a mercenary mix in muted greens and browns, assorted shields, mostly pilos helmets. */
const PHOCIAN = look({
  tunic: '#6a7246', trim: '#c8b07a', trousers: '#6b4a32', cloak: '#5a4a30',
  shield: '#b58a48', shieldRim: '#8a6a34', shieldEmblem: '#3a3020',
  paint: '#5a6438', paintEmblem: '#e2d4a4',
  metal: ['#b48a48', '#7a5a26', '#e2c486'], crest: '#4a4630', crestAlt: '#c8b07a',
  skin: GREEK_SKIN, hair: GREEK_HAIR, horses: HORSES_GREEK,
});

// --- Macedon and the Successors (kit `macedonian`) ------------------------------------------

/** Philip II / Alexander: royal purple and yellow, purple phalanx shields with the gold Argead star. */
const MACEDONIAN = look({
  tunic: '#5e2c80', trim: '#e8c040', trousers: '#6b4a32', cloak: '#6a2a8a',
  shield: '#5a2a78', shieldRim: '#d0a24a', shieldEmblem: '#f2c94f',
  paint: '#c8962e', paintEmblem: '#4a1e66',
  crest: '#f0c840', crestAlt: '#f4eee0',
  skin: GREEK_SKIN, hair: GREEK_HAIR, horses: HORSES_MACEDONIAN, saddle: '#5e2c80',
  cap: '#ece2c8', pattern: '#e8c040',
});

/**
 * Philip V / Perseus: deep petrol-blue tunics and cloaks under polished bronze phalanx shields with the embossed
 * Macedonian pattern; light troops carry cream shields and always wear a cream cap. Nothing on the body is Roman red.
 */
const ANTIGONID = look({
  tunic: '#1c4062', trim: '#ecdcae', trousers: '#6b4a32', cloak: '#1a3a5c',
  shield: '#cf9d46', shieldRim: '#9a6a26', shieldEmblem: '#7a4a18',
  paint: '#e8dcc0', paintEmblem: '#1c4062',
  crest: '#efe8d4', crestAlt: '#1c4062',
  skin: GREEK_SKIN, hair: GREEK_HAIR, horses: HORSES_MACEDONIAN,
  cap: '#ece2c8', pattern: '#ecdcae',
});

/**
 * Pyrrhus of Epirus: natural-linen tunics with red trim, white shields with Zeus' thunderbolt, bronze helmets. Red is only
 * trim, crests and the caps of the light troops (who carry tan shields); the cloaks are plum, so no body colour is Roman red.
 */
const EPIROTE = look({
  tunic: '#d4c49a', trim: '#a8231f', trousers: '#6b4a32', cloak: '#7a2250',
  shield: '#eee6d4', shieldRim: '#b8873a', shieldEmblem: '#a8231f',
  paint: '#b4894e', paintEmblem: '#f0e8d6',
  crest: '#f2ead8', crestAlt: '#a8231f',
  skin: GREEK_SKIN, hair: GREEK_HAIR, horses: HORSES_MACEDONIAN,
  cap: '#a8231f', pattern: '#a8231f',
});

/** Craterus' veterans: deep oxblood red with gold. */
const CRATERUS = look({
  tunic: '#7a1822', trim: '#d8b45a', trousers: '#5a3a26', cloak: '#6a1420',
  shield: '#6e1420', shieldRim: '#d0a24a', shieldEmblem: '#f0cc5a',
  paint: '#9a6a32', paintEmblem: '#6e1420',
  crest: '#f0e6cc', crestAlt: '#7a1822',
  skin: GREEK_SKIN, hair: GREEK_HAIR, horses: HORSES_MACEDONIAN,
  cap: '#7a1822', pattern: '#d8b45a',
});

/** Eumenes: blue with silver. */
const EUMENES = look({
  tunic: '#2c4f96', trim: '#d4d8de', trousers: '#4a4a52', cloak: '#24427e',
  shield: '#2a4c92', shieldRim: '#c4cad2', shieldEmblem: '#e4e8ec',
  paint: '#7a8a9e', paintEmblem: '#1e3a74',
  crest: '#e4e8ec', crestAlt: '#2c4f96',
  skin: GREEK_SKIN, hair: GREEK_HAIR, horses: HORSES_MACEDONIAN,
  cap: '#d4d8de', pattern: '#d4d8de',
});

/** Antigonus Monophthalmus: green and white, the trident of his sea-power. */
const ANTIGONUS = look({
  tunic: '#3d6b3a', trim: '#f0eadb', trousers: '#5a4a32', cloak: '#335e31',
  shield: '#3a6a36', shieldRim: '#e8e0cc', shieldEmblem: '#f4efe2',
  paint: '#e8e0cc', paintEmblem: '#2f5a2c',
  crest: '#f2ecdc', crestAlt: '#3d6b3a',
  skin: GREEK_SKIN, hair: GREEK_HAIR, horses: HORSES_MACEDONIAN,
  cap: '#f0eadb', pattern: '#f0eadb',
});

/** The Seleucids: gold-yellow tunics, purple shields with the anchor of Seleucus; eastern light troops. */
const SELEUCID = look({
  tunic: '#cf9a30', trim: '#5c2257', trousers: '#5c2257', cloak: '#6a2462',
  shield: '#5c2257', shieldRim: '#e0b24a', shieldEmblem: '#f2c94f',
  paint: '#cf9a30', paintEmblem: '#5c2257',
  crest: '#f0c840', crestAlt: '#6a2462',
  skin: PERSIAN_SKIN, hair: GREEK_HAIR, horses: HORSES_EAST, saddle: '#6a2462',
  cap: '#ece2c8', pattern: '#f0c840',
});

/** The Ptolemies: white and blue, the Ptolemaic eagle; Egyptian light troops in white kilts and headcloths. */
const PTOLEMAIC = look({
  tunic: '#ece7da', trim: '#2a5aa8', trousers: '#5a4a36', cloak: '#2a5aa8',
  shield: '#2a5aa8', shieldRim: '#e8e2d2', shieldEmblem: '#f4f0e4',
  paint: '#e8e2d2', paintEmblem: '#2a5aa8',
  crest: '#2a5aa8', crestAlt: '#f4f0e4',
  skin: ['#e2ae84', '#b07a4c', '#c88f64', '#9c6a40'], hair: GREEK_HAIR, horses: HORSES_EAST, saddle: '#2a5aa8',
  cap: '#f2eee2', pattern: '#2a5aa8',
});

// --- The Eastern kingdoms -------------------------------------------------------------------

/** Achaemenid Persia: felt tiaras, robes of yellow, Tyrian purple and red, straw-coloured wicker spara shields, bows. */
const PERSIAN = look({
  tunic: '#d8a22a', trim: '#5e2a7a', trousers: '#5e2a7a', cloak: '#5e2a7a',
  shield: '#dccb94', shieldRim: '#6a4424', shieldEmblem: '#8a6a38',
  paint: '#b08a50', paintEmblem: '#6a4424',
  metal: ['#d0a24a', '#8e6420', '#f4dc94'], crest: '#5e2a7a', crestAlt: '#f0d070',
  skin: PERSIAN_SKIN, hair: PERSIAN_HAIR, horses: HORSES_EAST, saddle: '#7a2a5a',
  cap: '#ece0c4', pattern: '#f2d06a',
});

/** Scythians: pointed caps, bright patterned kaftans and trousers, gold-decorated bow cases. */
const SCYTHIAN = look({
  tunic: '#b33a24', trim: '#e8c050', trousers: '#6a4a8a', cloak: '#8a3a24',
  shield: '#b8925a', shieldRim: '#6a4424', shieldEmblem: '#6a4424',
  paint: '#b8925a', paintEmblem: '#6a4424',
  crest: '#8a3a24', crestAlt: '#e8c050',
  skin: STEPPE_SKIN, hair: STEPPE_HAIR, horses: HORSES_STEPPE, saddle: '#b33a24',
  cap: '#8e2e20', pattern: '#e8c050',
});

/** Porus' Indians: white cotton, coloured turbans, bamboo longbows, long hide-and-bamboo shields. */
const INDIAN = look({
  tunic: '#efe9d8', trim: '#b8302e', trousers: '#6b4a32', cloak: '#b8302e',
  shield: '#cdb173', shieldRim: '#6a4a24', shieldEmblem: '#6a4a24',
  paint: '#cdb173', paintEmblem: '#6a4a24',
  metal: ['#d4a648', '#8e6620', '#f6de96'], crest: '#b8302e', crestAlt: '#efe9d8',
  skin: INDIAN_SKIN, hair: INDIAN_HAIR, horses: HORSES_EAST, saddle: '#b8302e',
  cap: '#f2eee2', pattern: '#b8302e',
});

/** The Mauryan empire: saffron-orange and terracotta (the Seleucids they face are gold). */
const MAURYAN = look({
  tunic: '#d8661f', trim: '#8a1e2a', trousers: '#6b4a32', cloak: '#8a1e2a',
  shield: '#c8963e', shieldRim: '#6a3a1e', shieldEmblem: '#6a3a1e',
  paint: '#8c6236', paintEmblem: '#6a3a1e',
  metal: ['#d4a648', '#8e6620', '#f6de96'], crest: '#8a1e2a', crestAlt: '#f2e6c8',
  skin: INDIAN_SKIN, hair: INDIAN_HAIR, horses: HORSES_EAST, saddle: '#8a1e2a',
  cap: '#f2e6c8', pattern: '#8a1e2a',
});

// --- Expansion #2: Gauls, Belgae, Britons, Germans, the Slave army, the Marian legions ---------
// The Barbarian armies face red Romans in every battle, so none of their tunics, shields or painted shields is red.

const NORTH_SKIN = ['#ecc29c', '#dfae84', '#e8b890', '#d8a47c'];
const NORTH_HAIR = ['#a8582a', '#d8b060', '#6a4020', '#c08a3c'];
const HORSES_NORTH: LookPalette['horses'] = [
  { coat: '#9a7046', shade: '#664828', mane: '#2e1e12' },
  { coat: '#5e4030', shade: '#3c281c', mane: '#1a110b' },
  { coat: '#c8bca4', shade: '#928670', mane: '#5e5444' },
];

/** The Gauls: mustard, blue, green and brown cloth, whitewashed long shields with painted devices, bronze helmets. */
const GALLIC = look({
  tunic: '#c09238', trim: '#2f5a8a', trousers: '#4f6a3a', cloak: '#3a5f8a',
  shield: '#3f6a94', shieldRim: '#8a6a3a', shieldEmblem: '#f0e2b4',
  paint: '#ebe1c4', paintEmblem: '#2c4c7c',
  crest: '#2a2420', crestAlt: '#c8a040',
  skin: NORTH_SKIN, hair: NORTH_HAIR, horses: HORSES_NORTH, saddle: '#3a5f8a',
});

/** The Belgae: dark blue and undyed wool, white and slate hexagonal shields. */
const BELGIC = look({
  tunic: '#2f4f74', trim: '#e2d6aa', trousers: '#6a5a44', cloak: '#283c5a',
  shield: '#e4e0d2', shieldRim: '#6a5a44', shieldEmblem: '#22385e',
  paint: '#e6e2d4', paintEmblem: '#22385e',
  crest: '#e6e2d4', crestAlt: '#2f4f74',
  skin: NORTH_SKIN, hair: NORTH_HAIR, horses: HORSES_NORTH, saddle: '#283c5a',
});

/** The Britons: woad on the skin, olive, green and tan checks, bronze-coloured shields with scrolls and horses. */
const BRITON = look({
  tunic: '#7a6c38', trim: '#c8a24a', trousers: '#4e6448', cloak: '#4e6448',
  shield: '#b8904a', shieldRim: '#6a4a24', shieldEmblem: '#2e2418',
  paint: '#b8904a', paintEmblem: '#2e2418',
  crest: '#2e2418', crestAlt: '#c8a24a',
  skin: NORTH_SKIN, hair: NORTH_HAIR, horses: HORSES_NORTH, saddle: '#4e6448',
  woad: '#2e5cb0',
});

/** The Germanic tribes: undyed browns and greys, hide cloaks, board shields painted white, black, ochre and blue. */
const GERMANIC = look({
  tunic: '#6e6450', trim: '#a89a74', trousers: '#4a4236', cloak: '#4a5a3a',
  shield: '#e4dcc4', shieldRim: '#4a3a28', shieldEmblem: '#2a2420',
  paint: '#e4dcc4', paintEmblem: '#2a2420',
  metal: ['#b48a48', '#7a5a26', '#e2c486'], crest: '#2a2420', crestAlt: '#a89a74',
  skin: NORTH_SKIN, hair: NORTH_HAIR, horses: HORSES_NORTH, saddle: '#4a5a3a',
  fur: '#7a5c3c',
});

/** The Slave army: undyed wool and whatever the escaped gladiators, herdsmen and captives had; captured Roman bronze. */
const SLAVE = look({
  tunic: '#c8b88f', trim: '#7a5a3a', trousers: '#6a5a44', cloak: '#6a5a44',
  shield: '#8a6a44', shieldRim: '#c9a25a', shieldEmblem: '#efe4c4',
  paint: '#a8844a', paintEmblem: '#2a2018',
  crest: '#3a2a1e', crestAlt: '#c8b88f',
  // figure i takes skin[i] and hair[(3i + 1) % 4]: a dark Thracian, a red-haired Gaul, a fair German, a dark Italian
  skin: ['#d8a87e', '#e8bc94', '#e4b48a', '#c8946a'], hair: ['#a8582a', '#2e1d12', '#3a2416', '#d8b060'],
  horses: HORSES_NORTH, fur: '#7a5c3c',
});

/** The legions of Marius and Caesar: red tunics and scuta with Jupiter's winged thunderbolt in gold, bronze helmets. */
const MARIAN = look({
  tunic: '#b0262c', trim: '#e8c050', trousers: '#5a4030', cloak: '#8c1c24',
  shield: '#a8222a', shieldRim: '#c9a25a', shieldEmblem: '#f2c94f',
  paint: '#a8222a', paintEmblem: '#f2c94f',
  metal: ['#c7923d', '#85591f', '#f3d68e'], crest: '#1c1a1e', crestAlt: '#d42a2e',
  skin: ['#e6b48a', '#d9a077', '#cc9168', '#e0aa80'], hair: ['#3a2416', '#24170f', '#5a3a20', '#2e1d12'],
  horses: [
    { coat: '#8a5530', shade: '#5c3519', mane: '#2a1a10' },
    { coat: '#5e3a22', shade: '#3c2414', mane: '#1a110b' },
    { coat: '#a77446', shade: '#714a28', mane: '#3a2414' },
  ],
  saddle: '#8c1c24',
});

/** Side colours of each block set (base edge and standard cloth). */
export const BLOCK_COLORS: Record<Blocks, SideColors> = {
  rom: {
    edge: '#b81d24', edgeShade: '#6e0f14', edgeLight: '#e2534c', banner: '#b51f27', bannerShade: '#771219',
    cloth: { main: '#9b1f1c', light: '#c9483a', dark: '#5a0f0e' },
  },
  car: {
    edge: '#6a1f78', edgeShade: '#3c0e46', edgeLight: '#9a4aa8', banner: '#5f1d68', bannerShade: '#3a0f40',
    cloth: { main: '#6a1e5c', light: '#9c4f8c', dark: '#3a0c33' },
  },
  // Greek blocks: the base game's Syracusans (scenarios 001 and 002) and the Greek armies of Expansion #1.
  grk: {
    edge: '#1f4fb4', edgeShade: '#0f2a6a', edgeLight: '#5582dc', banner: '#22439a', bannerShade: '#132a66',
    cloth: { main: '#1f417e', light: '#4b72b6', dark: '#0f2149' },
  },
  // Eastern Kingdom blocks of Expansion #1: ochre-tan.
  eas: {
    edge: '#c88a22', edgeShade: '#7c5212', edgeLight: '#ecbc5e', banner: '#b8801e', bannerShade: '#74500f',
    cloth: { main: '#a8741e', light: '#d4a24a', dark: '#5e3e0c' },
  },
  // Expansion #2: the Barbarian blocks in emerald green (bluer and stronger than the board's grass and woods), and the grey
  // Roman blocks of a command drawn apart from its red army (210 Lentulus) in a pale cool slate grey. Both are checked for
  // contrast against the other sets, each other and every colour of the board's paint palette (tests/art/blocks.test.ts).
  // The board's stones, pools and shallows fill the neutral grey range, so the edge sits lighter and bluer than a true grey.
  bar: {
    edge: '#17985a', edgeShade: '#0b4a2c', edgeLight: '#62c792', banner: '#14864f', bannerShade: '#0a4429',
    cloth: { main: '#137a48', light: '#45ab78', dark: '#082e1b' },
  },
  gry: {
    edge: '#b9c6e8', edgeShade: '#6f7da6', edgeLight: '#e4eaf9', banner: '#8e99b6', bannerShade: '#5a6482',
    cloth: { main: '#838daa', light: '#b0b8d0', dark: '#4b5470' },
  },
};

export interface LookDef {
  kit: Kit;
  palette: LookPalette;
  style: LookStyle;
}

const EASTERN_LIGHTS: FootLook = { helmet: 'tiara', legs: 'trousers', longSleeve: true };
const EGYPTIAN: FootLook = { helmet: 'nemes', torso: 'bare', legs: 'bare', sleeve: false };
const PELTAST: FootLook = { shield: 'pelta', helmet: 'thracian', crest: 'none', shieldScale: 1, torso: 'tunic' };
/** Skirmishers who always wear a cap: the cue that sets the Epirote and Antigonid light troops apart from the bare-headed Roman velites. */
const CAPPED_LIGHTS: Partial<Record<UnitType, FootLook>> = { LI: { helmet: 'kausia' }, LB: { helmet: 'petasos' }, LS: { helmet: 'petasos' } };

/** The Slave army's Thracians: boots, a crescent shield, bearded. */
const THRACIAN_LIGHT: FootLook = {
  torso: 'tunic', skirt: true, sleeve: true, legs: 'boots', helmet: 'none', crest: 'none', hair: 'short', beard: true, moustache: false,
  torc: false, shield: 'pelta', shieldScale: 0.84, shieldDy: 0, weapon: 'javelin', spare: 'javelins',
};
/** Spartacus' countrymen: the Thracian helmet and the curved sica. */
const THRACIAN_SWORD: FootLook = { ...THRACIAN_LIGHT, helmet: 'thracian', crest: 'horsehair', shieldScale: 1, weapon: 'sica', spare: undefined };
/** Italian herdsmen of the hills: a felt hat, bare legs. */
const HERDSMAN: FootLook = { torso: 'tunic', skirt: true, sleeve: true, legs: 'bare', helmet: 'petasos', crest: 'none', hair: 'short', beard: true, moustache: false, torc: false };
/** An escaped gladiator: brimmed visored helmet with a tall crest, bare chest, greaves, a small shield and a short sword. */
const GLADIATOR: FootLook = {
  torso: 'bare', skirt: true, sleeve: false, legs: 'greaves', helmet: 'gladiator', crest: 'plume2', hair: 'short', beard: false, moustache: false,
  torc: false, shield: 'board', shieldScale: 0.72, shieldDy: -1, weapon: 'sword',
};

const ROMAN_LOOK: LookDef = { kit: 'roman', palette: ROMAN, style: { emblems: ['rome'], device: 'wreath', finial: 'eagle' } };
const CARTHAGINIAN_LOOK: LookDef = { kit: 'punic', palette: CARTHAGINIAN, style: { emblems: ['carthage'], device: 'carthage', finial: 'crescent' } };

/** Every army look: its kit, swatches and style. */
export const LOOKS: Record<ArmyLook, LookDef> = {
  roman: ROMAN_LOOK,
  carthaginian: CARTHAGINIAN_LOOK,
  syracusan: { kit: 'greek', palette: SYRACUSAN, style: { emblems: ['syracuse'], device: 'syracuse', finial: 'lozenge' } },
  athenian: {
    kit: 'greek', palette: ATHENIAN,
    style: {
      emblems: ['owl', 'gorgon', 'bull', 'triskeles'], paintEmblems: ['gorgon'], device: 'owl', finial: 'lozenge',
      foot: {
        HI: [{ helmet: 'corinthian', crest: 'tall' }, { helmet: 'attic', crest: 'horsehair' }],
        AX: PELTAST,
        // the city's Scythian archers
        LB: { helmet: 'scythianCap', torso: 'kaftan', legs: 'trousers', longSleeve: true, bow: 'scythian', back: 'gorytos' },
      },
    },
  },
  theban: {
    kit: 'greek', palette: THEBAN,
    style: {
      emblems: ['club'], device: 'club', finial: 'lozenge',
      // Epaminondas and Pelopidas in the Boeotian cavalry helmet
      general: { helmet: 'boeotian', crest: 'none' },
      foot: {
        HI: [{ helmet: 'boeotian', crest: 'none' }, { helmet: 'pilos', crest: 'knob' }],
        MI: [{ helmet: 'pilos' }, { helmet: 'boeotian', crest: 'none' }],
        AX: PELTAST,
      },
    },
  },
  spartan: {
    kit: 'greek', palette: SPARTAN,
    style: {
      emblems: ['lambda'], device: 'lambda', finial: 'lozenge',
      general: { helmet: 'corinthian', crest: 'tall' },
      foot: {
        HI: [{ helmet: 'corinthian', crest: 'tall', hair: 'locks', cloak: true }, { helmet: 'pilos', crest: 'none', hair: 'locks', cloak: true }],
        MI: { hair: 'locks', cloak: true },
        AX: PELTAST,
      },
    },
  },
  phocian: {
    kit: 'greek', palette: PHOCIAN,
    style: {
      emblems: ['phi', 'tripod', 'none', 'star'], device: 'tripod', finial: 'lozenge',
      variants: [
        {},
        { ...tunicOf('#7a5a3a'), ...shieldOf('#5a6438', '#e2d4a4') },
        { ...tunicOf('#5e6a58'), ...shieldOf('#7a5232', '#e2d4a4') },
        { ...tunicOf('#a8884a') },
      ],
      foot: {
        HI: [{ helmet: 'pilos', crest: 'knob' }, { helmet: 'corinthian', crest: 'horsehair' }, { helmet: 'pilos', crest: 'knob' }, { helmet: 'attic', crest: 'horsehair' }],
        AX: PELTAST,
      },
    },
  },
  macedonian: {
    kit: 'macedonian', palette: MACEDONIAN,
    style: { emblems: ['star'], device: 'star', finial: 'star', general: { cloak: '#6a2a8a', horse: { coat: '#2a221c', shade: '#16110d', mane: '#0a0705' } } },
  },
  antigonid: {
    kit: 'macedonian', palette: ANTIGONID,
    style: { emblems: ['macShield'], device: 'macShield', finial: 'spearhead', foot: { ...CAPPED_LIGHTS, MI: { shield: 'thureos' } } },
  },
  epirote: {
    kit: 'macedonian', palette: EPIROTE,
    // Pyrrhus' helmet with its tall crest and goat horns (Plutarch)
    style: { emblems: ['thunderbolt'], device: 'thunderbolt', finial: 'eagle', general: { crest: 'horns' }, foot: CAPPED_LIGHTS },
  },
  craterus: {
    kit: 'macedonian', palette: CRATERUS,
    style: { emblems: ['star'], device: 'star', finial: 'star' },
  },
  eumenes: {
    kit: 'macedonian', palette: EUMENES,
    style: { emblems: ['star'], device: 'star', finial: 'spearhead' },
  },
  antigonus: {
    kit: 'macedonian', palette: ANTIGONUS,
    style: { emblems: ['trident'], device: 'trident', finial: 'trident' },
  },
  seleucid: {
    kit: 'macedonian', palette: SELEUCID,
    style: {
      emblems: ['anchor'], device: 'anchor', finial: 'spearhead',
      foot: { MI: { shield: 'thureos' }, LI: EASTERN_LIGHTS, LB: EASTERN_LIGHTS, LS: EASTERN_LIGHTS },
      mounted: {
        // eastern light horse on every other figure
        LC: [{
          rider: { torso: 'tunic', helmet: 'tiara', crest: 'none', shield: 'none', weapon: 'javelin', legs: 'trousers', longSleeve: true, spare: true, beard: true },
          cloth: 'rich',
        }, {}],
        // the cataphracts of Magnesia: scale-armoured riders on scale-armoured horses
        HC: {
          rider: { torso: 'scale', helmet: 'phrygian', crest: 'horsehair', shield: 'none', weapon: 'lance', legs: 'trousers', longSleeve: true },
          cloth: 'none', cataphract: true, barding: true,
        },
      },
      // Indian elephants with towers and an armoured headpiece; eastern crews (in coloured hoods) with javelins and bows
      elephant: {
        drawing: 'loaded', body: 'indian', load: 'tower', frontlet: true, crew: ['bow', 'javelin'], crewKit: 'persian', scale: 0.94,
        crewPaint: (q) => ({ cap: q.cloak, capShade: q.cloakShade }),
      },
      // the scythed chariot's driver in long eastern sleeves
      chariotDriver: { longSleeve: true },
    },
  },
  ptolemaic: {
    kit: 'macedonian', palette: PTOLEMAIC,
    style: {
      emblems: ['eagle'], device: 'eagle', finial: 'eagle',
      foot: { MI: { shield: 'thureos' }, LI: [EGYPTIAN, {}], LB: [{}, EGYPTIAN], LS: [EGYPTIAN, {}] },
      // the smaller African forest elephant with a tower and a Macedonian crew
      elephant: { drawing: 'loaded', body: 'forest', load: 'tower', crew: ['pike', 'javelin'], scale: 0.86 },
    },
  },
  persian: {
    kit: 'persian', palette: PERSIAN,
    style: {
      emblems: ['none'], device: 'wingedDisc', finial: 'royalEagle',
      variants: [
        {},
        { ...tunicOf('#8a2c68'), ...trousersOf('#c8962a'), ...capOf('#e8c060') },
        { ...tunicOf('#a8282a'), ...trousersOf('#3a3a6a'), ...capOf('#ece0c4') },
        { ...tunicOf('#e0c070'), ...trousersOf('#a8282a'), ...capOf('#7a3a8a') },
      ],
      general: { cloak: '#5e2a7a', saddle: '#a8282a', horse: { coat: '#ece6da', shade: '#b0a690', mane: '#8a7e6a' } },
    },
  },
  scythian: {
    kit: 'scythian', palette: SCYTHIAN,
    style: {
      emblems: ['none'], device: 'stag', finial: 'stag',
      variants: [
        {},
        { ...tunicOf('#2a6aa0'), ...trousersOf('#b33a24'), ...capOf('#6a4a8a') },
        { ...tunicOf('#c88a2a'), ...trousersOf('#3a6a4a'), ...capOf('#b33a24') },
        { ...tunicOf('#3a7a4a'), ...trousersOf('#c88a2a'), ...capOf('#2a5a8a') },
      ],
    },
  },
  indian: {
    kit: 'indian', palette: INDIAN,
    style: {
      emblems: ['none'], device: 'wheel', finial: 'wheel', standard: 'parasol',
      variants: [{}, { ...capOf('#c83a3a') }, { ...capOf('#3a5aa8'), trim: '#3a5aa8' }, { ...capOf('#e0a030') }],
      general: { horse: { coat: '#ece6da', shade: '#b0a690', mane: '#8a7e6a' } },
    },
  },
  mauryan: {
    kit: 'indian', palette: MAURYAN,
    style: {
      emblems: ['none'], device: 'meru', finial: 'wheel', standard: 'parasol',
      variants: [{}, { ...tunicOf('#b04a1c'), ...capOf('#e0902a') }, { ...tunicOf('#efe6d0'), ...capOf('#e0902a') }, { ...tunicOf('#9c5a2a') }],
      general: { horse: { coat: '#ece6da', shade: '#b0a690', mane: '#8a7e6a' } },
    },
  },
  // Expansion #2 (Rome & the Barbarians)
  gallic: {
    kit: 'celtic', palette: GALLIC,
    style: {
      emblems: ['scroll', 'triskeles', 'boar', 'crescents'], device: 'boar', finial: 'boar', standard: 'carnyx',
      variants: [
        {},
        { ...tunicOf('#3a6a9a'), ...trousersOf('#a8843a'), ...paintOf('#c8a040', '#2a2620') },
        { ...tunicOf('#557a3a'), ...trousersOf('#6a5a40'), ...paintOf('#2f5a8a', '#f0e0b0') },
        { ...tunicOf('#8a5a34'), ...trousersOf('#3a5a7a'), ...paintOf('#4f7a3a', '#f0e0b0') },
      ],
      general: { cloak: '#2f5a3a' },
    },
  },
  belgic: {
    kit: 'celtic', palette: BELGIC,
    style: {
      emblems: ['crescents', 'wheel', 'ring', 'scroll'], device: 'crescents', finial: 'boar', standard: 'carnyx',
      variants: [
        {},
        { ...tunicOf('#7a6a4c'), ...paintOf('#2c3c58', '#e6e2d4') },
        { ...tunicOf('#d8d2c0'), ...trousersOf('#2f4f74'), ...paintOf('#4a5a6e', '#e6e2d4') },
        { ...tunicOf('#4a5a6a'), ...paintOf('#2c3c58', '#e6e2d4') },
      ],
      // the hexagonal shields of the northern Belgae
      foot: { LI: { shield: 'hex' }, AX: { shield: 'hex' }, WA: { shield: 'hex' }, MI: { shield: 'hex' } },
    },
  },
  briton: {
    kit: 'celtic', palette: BRITON,
    style: {
      emblems: ['scroll', 'ring', 'triskeles', 'scroll'], device: 'horse', finial: 'boar', standard: 'carnyx',
      variants: [
        {},
        { ...tunicOf('#4e6a4a'), ...trousersOf('#7a6c38'), ...paintOf('#e2d8bc', '#2e2418') },
        { ...tunicOf('#94744a'), ...trousersOf('#4a4e66'), ...paintOf('#5a6e4a', '#e8d8a8') },
        { ...tunicOf('#5a5a6e'), ...trousersOf('#94744a'), ...paintOf('#b8904a', '#2e2418') },
      ],
      // woad on every figure; fewer helmets and more bare chests than the Gauls
      foot: {
        LI: { woad: true, torso: 'bare', skirt: false, sleeve: false, torc: true },
        LB: { woad: true },
        LS: { woad: true },
        AX: [{ woad: true, helmet: 'none' }, { woad: true, helmet: 'none', torso: 'bare', skirt: false, sleeve: false }],
        WA: [{ woad: true }, { woad: true, torso: 'bare', skirt: false, sleeve: false, helmet: 'none', crest: 'none', hair: 'wild' }],
        MI: { woad: true },
      },
    },
  },
  germanic: {
    kit: 'germanic', palette: GERMANIC,
    style: {
      emblems: ['halves', 'ring', 'bands', 'none'], device: 'bull', finial: 'bull',
      variants: [
        {},
        { ...tunicOf('#5e6a58'), ...paintOf('#2a2826', '#e4dcc4') },
        { ...tunicOf('#8c7a58'), ...trousersOf('#5a5a50'), ...paintOf('#c08a30', '#2a2420') },
        { ...tunicOf('#4f4a40'), ...paintOf('#3a5a7a', '#e4dcc4') },
      ],
    },
  },
  slave: {
    kit: 'celtic', palette: SLAVE,
    style: {
      emblems: ['crescents', 'triskeles', 'halves', 'pileus'], device: 'pileus', finial: 'pileus',
      // every unit mixes a Thracian, a Gaul, a German and an Italian herdsman or gladiator (figures 0-3)
      variants: [
        { ...tunicOf('#b07a34'), ...trousersOf('#5a4a3a'), ...paintOf('#8a5a34', '#efe4c4') },
        { ...tunicOf('#3a6a9a'), ...trousersOf('#a8843a'), ...paintOf('#ebe1c4', '#2c4c7c') },
        { ...tunicOf('#6e6450'), ...trousersOf('#4a4236'), ...paintOf('#e4dcc4', '#2a2420') },
        { ...tunicOf('#ddd4bf'), ...paintOf('#a8844a', '#2a2018'), ...capOf('#9a7a4a') },
      ],
      foot: {
        LI: [THRACIAN_LIGHT, {}, { from: 'germanic' }, { ...HERDSMAN, shield: 'none', weapon: 'javelin', spare: 'javelins' }],
        LS: [{ ...THRACIAN_LIGHT, shield: 'none', weapon: 'sling', spare: undefined }, {}, { from: 'germanic' }, { ...HERDSMAN, shield: 'none', weapon: 'sling' }],
        AX: [{ ...THRACIAN_LIGHT, helmet: 'thracian', crest: 'knob', shieldScale: 1, spare: 'spear' }, {}, { from: 'germanic' }, { ...HERDSMAN, shield: 'round', weapon: 'javelin', spare: 'spear' }],
        WA: [THRACIAN_SWORD, {}, { from: 'germanic' }, GLADIATOR],
        // the Romans' own arms, taken from their camps
        MI: [
          { from: 'lateRoman', doubling: false, beard: true, device: 'wingedBolt' }, {}, { from: 'germanic' },
          { from: 'lateRoman', torso: 'tunic', sleeve: true, doubling: false, device: 'wingedBolt' },
        ],
      },
      mounted: {
        LC: [{ rider: { torso: 'tunic', helmet: 'thracian', crest: 'none', shield: 'none', weapon: 'javelin', legs: 'trousers', spare: true, cloak: true, beard: true } }, {}],
      },
    },
  },
  marian: {
    kit: 'lateRoman', palette: MARIAN,
    // generals on a bay horse (Caesar rides his white one, LEADER_LOOKS)
    style: { emblems: ['wingedBolt'], device: 'wingedBolt', finial: 'eagle', standard: 'aquila', general: { horse: { coat: '#7a4a2a', shade: '#4e2e18', mane: '#22160e' } } },
  },
};

/**
 * A named leader's own figure instead of his look's general (the mounted general and the attached portrait): the leaders
 * the battles single out, matched by the names the scenarios give them.
 */
export interface LeaderLook {
  /** The names he goes by in the scenarios (compared ignoring case). */
  names: string[];
  /** Changes to the general's rider (headgear, armour, cloak, a weapon in hand). */
  rider?: Partial<RiderKit>;
  horse?: HorseCoat;
  /** His colours over the look's general colours (cloak, crest, saddle cloth). */
  colours?: Partial<LookPalette>;
  /** Changes to the portrait. */
  bust?: Partial<BustDef>;
}

const SCARLET = '#c0262a';

export const LEADER_LOOKS: LeaderLook[] = [
  // Caesar: a laurel wreath instead of a helmet, the scarlet general's cloak (paludamentum), a white horse
  {
    names: ['Caesar', 'Julius Caesar', 'C. Julius Caesar', 'Gaius Julius Caesar'],
    rider: { helmet: 'laurel', crest: 'none' },
    horse: { coat: '#ece6da', shade: '#b0a690', mane: '#8a7e6a' },
    colours: { cloak: SCARLET, cloakShade: darken(SCARLET, 0.38), saddle: SCARLET, saddleShade: darken(SCARLET, 0.36) },
    bust: { helmet: 'laurel', crest: 'none', beard: false, hair: 'short' },
  },
  // Spartacus: the Thracian gladiator in a crested Thracian helmet with the curved sica, on a dark horse
  {
    names: ['Spartacus'],
    rider: { helmet: 'thracian', crest: 'horsehair', torso: 'tunic', legs: 'greaves', cloak: true, beard: true, sidearm: 'sica' },
    horse: { coat: '#3a2a20', shade: '#22180f', mane: '#0e0905' },
    colours: { crest: '#a8282a', crestShade: darken('#a8282a', 0.4), crestAlt: '#d8584a', cloak: '#6a4a2a', cloakShade: darken('#6a4a2a', 0.38) },
    bust: { helmet: 'thracian', crest: 'horsehair', beard: true, chest: 'tunic' },
  },
];

/** The named leader's own look, if he has one. */
export function leaderLook(name: string | undefined): LeaderLook | undefined {
  const n = name?.trim().toLowerCase();
  return n ? LEADER_LOOKS.find((l) => l.names.some((x) => x.toLowerCase() === n)) : undefined;
}

/** The art of a look; throws when the look has none (so a missing look fails loudly instead of drawing wrong). */
export function lookDef(look: ArmyLook): LookDef {
  const d = Object.prototype.hasOwnProperty.call(LOOKS, look) ? LOOKS[look] : undefined;
  if (!d) throw new Error(`No art for army look "${look}"`);
  return d;
}

/** The side colours of a block set; throws when it has none. */
export function blockColors(blocks: Blocks): SideColors {
  const c = Object.prototype.hasOwnProperty.call(BLOCK_COLORS, blocks) ? BLOCK_COLORS[blocks] : undefined;
  if (!c) throw new Error(`No colours for blocks "${blocks}"`);
  return c;
}

const resolved = new Map<string, Palette>();

/** The palette an army is drawn with: its look's swatches, kit and style, plus the base-edge/banner colours of its blocks. */
export function paletteFor(look: ArmyLook, blocks: Blocks): Palette {
  const key = `${look}/${blocks}`;
  let p = resolved.get(key);
  if (!p) {
    const d = lookDef(look);
    const sc = blockColors(blocks);
    p = {
      ...d.palette,
      look,
      kit: d.kit,
      style: d.style,
      baseEdge: sc.edge,
      baseEdgeShade: sc.edgeShade,
      baseEdgeLight: sc.edgeLight,
      banner: sc.banner,
      bannerShade: sc.bannerShade,
    };
    resolved.set(key, p);
  }
  return p;
}

/** Light (barbarian / Celtic / Iberian) hair & skin used by Warriors regardless of army. */
export const TRIBAL_HAIR = ['#b8742e', '#d8b060', '#8a4a1e', '#5a3418'];
export const TRIBAL_SKIN = ['#e8bc94', '#dcaa80', '#e4b48a', '#d6a078'];
