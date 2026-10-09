import type { ArmyLook, Blocks, UnitType } from '../engine/types';
import { darken, lighten } from './color';
import type { FootLook } from './foot';
import type { Crest, Helmet } from './parts';

/** Figure kit: the shapes (helmets, shields, torsos, mounts) an army's miniatures are built from. */
export type Kit = 'roman' | 'punic' | 'greek' | 'macedonian' | 'persian' | 'scythian' | 'indian';

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
}

/** Devices painted on shields and on the army standard (drawn by `Emblem` in parts.tsx). */
export type EmblemKind =
  | 'rome' | 'carthage' | 'syracuse'
  | 'owl' | 'gorgon' | 'bull' | 'triskeles' | 'club' | 'lambda' | 'phi' | 'tripod'
  | 'star' | 'macShield' | 'thunderbolt' | 'anchor' | 'eagle' | 'trident'
  | 'wingedDisc' | 'stag' | 'wheel' | 'meru' | 'none';

/** Device on the cloth of the army standard: an emblem, or the Roman laurel wreath. */
export type StandardDevice = EmblemKind | 'wreath';

/** Pole-top ornament of the army standard. */
export type Finial = 'eagle' | 'crescent' | 'lozenge' | 'star' | 'spearhead' | 'royalEagle' | 'wheel' | 'trident' | 'stag';

/**
 * Look-specific art choices beyond the swatches: shield devices, the army standard, per-figure paint variants and
 * per-unit-type overrides of the kit's foot figures. The base looks only name their devices (their figures are the kit's).
 */
export interface LookStyle {
  /** Devices on line-infantry shields (aspis, oval, phalanx, thureos), one per figure index, cycling. */
  emblems: EmblemKind[];
  /** Devices on painted light-troop shields (default: `emblems`). */
  paintEmblems?: EmblemKind[];
  /** Standard: device on the banner cloth and the finial; `parasol` is the Indian royal parasol (chattra). */
  device: StandardDevice;
  finial: Finial;
  standard?: 'banner' | 'parasol';
  /** Paint variants per figure index (cycled): mixed contingents, colourful robes. */
  variants?: Partial<LookPalette>[];
  /** Overrides of the kit's foot figures per unit type: one override, or one per figure index (cycled). */
  foot?: Partial<Record<UnitType, FootLook | FootLook[]>>;
  /** The general: colours (cloak, saddle cloth), horse, and helmet / crest instead of the kit's. */
  general?: Partial<LookPalette> & { horse?: { coat: string; shade: string; mane: string }; helmet?: Helmet; crest?: Crest };
}

/**
 * Paint scheme of one army as drawn: its look's swatches, the side colours of its blocks and the kit it is built from.
 * Every figure is painted from these swatches (plus small per-figure variation). Resolve with `paletteFor`.
 */
export interface Palette extends LookPalette {
  kit: Kit;
  style: LookStyle;
  /** Painted miniature base: strong side-coloured edge. */
  baseEdge: string;
  baseEdgeShade: string;
  baseEdgeLight: string;
  banner: string;
  bannerShade: string;
}

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
  baseTop: '#6e6a3c',
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

/** Philip V / Perseus: polished bronze phalanx shields with the embossed Macedonian pattern, red cloaks. */
const ANTIGONID = look({
  tunic: '#a8281f', trim: '#ecdcae', trousers: '#6b4a32', cloak: '#a8281f',
  shield: '#cf9d46', shieldRim: '#9a6a26', shieldEmblem: '#7a4a18',
  paint: '#a8281f', paintEmblem: '#f0d48a',
  crest: '#b8261f', crestAlt: '#f2ead4',
  skin: GREEK_SKIN, hair: GREEK_HAIR, horses: HORSES_MACEDONIAN,
  cap: '#a8281f', pattern: '#ecdcae',
});

/** Pyrrhus of Epirus: red tunics, white shields with Zeus' thunderbolt. */
const EPIROTE = look({
  tunic: '#b3231f', trim: '#f0e8d6', trousers: '#6b4a32', cloak: '#b3231f',
  shield: '#eee6d4', shieldRim: '#b8873a', shieldEmblem: '#b3231f',
  paint: '#b3231f', paintEmblem: '#f0e8d6',
  crest: '#f2ead8', crestAlt: '#b3231f',
  skin: GREEK_SKIN, hair: GREEK_HAIR, horses: HORSES_MACEDONIAN,
  cap: '#f0e8d6', pattern: '#b3231f',
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

/** Achaemenid Persia: felt tiaras, robes of yellow, purple and red, wicker spara shields, bows. */
const PERSIAN = look({
  tunic: '#d8a22a', trim: '#5e2a7a', trousers: '#5e2a7a', cloak: '#5e2a7a',
  shield: '#c8a66a', shieldRim: '#6a4424', shieldEmblem: '#8a6a38',
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

/** The Mauryan empire: saffron and ochre. */
const MAURYAN = look({
  tunic: '#e0902a', trim: '#8a1e2a', trousers: '#6b4a32', cloak: '#8a1e2a',
  shield: '#c8963e', shieldRim: '#6a3a1e', shieldEmblem: '#6a3a1e',
  paint: '#c8963e', paintEmblem: '#6a3a1e',
  metal: ['#d4a648', '#8e6620', '#f6de96'], crest: '#8a1e2a', crestAlt: '#f2e6c8',
  skin: INDIAN_SKIN, hair: INDIAN_HAIR, horses: HORSES_EAST, saddle: '#8a1e2a',
  cap: '#f2e6c8', pattern: '#8a1e2a',
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
};

export interface LookDef {
  kit: Kit;
  palette: LookPalette;
  style: LookStyle;
}

const EASTERN_LIGHTS: FootLook = { helmet: 'tiara', legs: 'trousers', longSleeve: true };
const EGYPTIAN: FootLook = { helmet: 'nemes', torso: 'bare', legs: 'bare', sleeve: false };
const PELTAST: FootLook = { shield: 'pelta', helmet: 'thracian', crest: 'none', shieldScale: 1, torso: 'tunic' };

/** Every army look: its kit, swatches and style. */
export const LOOKS: Record<ArmyLook, LookDef> = {
  roman: { kit: 'roman', palette: ROMAN, style: { emblems: ['rome'], device: 'wreath', finial: 'eagle' } },
  carthaginian: { kit: 'punic', palette: CARTHAGINIAN, style: { emblems: ['carthage'], device: 'carthage', finial: 'crescent' } },
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
    style: { emblems: ['macShield'], device: 'macShield', finial: 'spearhead', foot: { MI: { shield: 'thureos' } } },
  },
  epirote: {
    kit: 'macedonian', palette: EPIROTE,
    // Pyrrhus' helmet with its tall crest and goat horns (Plutarch)
    style: { emblems: ['thunderbolt'], device: 'thunderbolt', finial: 'eagle', general: { crest: 'horns' } },
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
    },
  },
  ptolemaic: {
    kit: 'macedonian', palette: PTOLEMAIC,
    style: {
      emblems: ['eagle'], device: 'eagle', finial: 'eagle',
      foot: { MI: { shield: 'thureos' }, LI: [EGYPTIAN, {}], LB: [{}, EGYPTIAN], LS: [EGYPTIAN, {}] },
    },
  },
  persian: {
    kit: 'persian', palette: PERSIAN,
    style: {
      emblems: ['none'], device: 'wingedDisc', finial: 'royalEagle',
      variants: [
        {},
        { ...tunicOf('#5e2a7a'), ...trousersOf('#c8962a'), ...capOf('#e8c060') },
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
      variants: [{}, { ...tunicOf('#c88a3a'), ...capOf('#e0902a') }, { ...tunicOf('#efe6d0'), ...capOf('#e0902a') }, { ...tunicOf('#d8a040') }],
      general: { horse: { coat: '#ece6da', shade: '#b0a690', mane: '#8a7e6a' } },
    },
  },
};

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
