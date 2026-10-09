import type { ArmyLook, Blocks } from '../engine/types';

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
}

/**
 * Paint scheme of one army as drawn: its look's swatches, the side colours of its blocks and the kit it is built from.
 * Every figure is painted from these swatches (plus small per-figure variation). Resolve with `paletteFor`.
 */
export interface Palette extends LookPalette {
  kit: Kit;
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

/** Side colours of each block set (base edge and standard cloth). Eastern (`eas`) blocks arrive with Expansion #1. */
export const BLOCK_COLORS: Partial<Record<Blocks, SideColors>> = {
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
  // TEMPORARY until Task 15 (army looks): provisional ochre-tan for the Eastern Kingdom blocks of Expansion #1.
  eas: {
    edge: '#b8893a', edgeShade: '#7a5a22', edgeLight: '#dcb36a', banner: '#a87a30', bannerShade: '#6e4e1c',
    cloth: { main: '#9a7030', light: '#c89a52', dark: '#5e4218' },
  },
};

export interface LookDef {
  kit: Kit;
  palette: LookPalette;
}

/** Every army look with art. Looks of the Greece and Eastern Kingdoms expansion are added with their kits. */
export const LOOKS: Partial<Record<ArmyLook, LookDef>> = {
  roman: { kit: 'roman', palette: ROMAN },
  carthaginian: { kit: 'punic', palette: CARTHAGINIAN },
  syracusan: { kit: 'greek', palette: SYRACUSAN },
};

// TEMPORARY until Task 15 (army looks): the Expansion #1 looks have no art yet, so each borrows the closest base kit's
// art (the Greek kit with the Syracusan palette, or the Punic kit with the Carthaginian palette).
const LOOK_FALLBACK: Partial<Record<ArmyLook, ArmyLook>> = {
  athenian: 'syracusan', theban: 'syracusan', spartan: 'syracusan', phocian: 'syracusan', macedonian: 'syracusan',
  antigonid: 'syracusan', epirote: 'syracusan', craterus: 'syracusan', eumenes: 'syracusan', antigonus: 'syracusan',
  seleucid: 'syracusan', ptolemaic: 'syracusan',
  persian: 'carthaginian', scythian: 'carthaginian', indian: 'carthaginian', mauryan: 'carthaginian',
};

/** The art of a look; throws when the look has none (so a missing look fails loudly instead of drawing wrong). */
export function lookDef(look: ArmyLook): LookDef {
  const fallback = LOOK_FALLBACK[look]; // TEMPORARY until Task 15 (army looks)
  const d = LOOKS[look] ?? (fallback ? LOOKS[fallback] : undefined);
  if (!d) throw new Error(`No art for army look "${look}"`);
  return d;
}

/** The side colours of a block set; throws when it has none. */
export function blockColors(blocks: Blocks): SideColors {
  const c = BLOCK_COLORS[blocks];
  if (!c) throw new Error(`No colours for blocks "${blocks}"`);
  return c;
}

const resolved = new Map<string, Palette>();

/** The palette an army is drawn with: its look's swatches and kit, plus the base-edge/banner colours of its blocks. */
export function paletteFor(look: ArmyLook, blocks: Blocks): Palette {
  const key = `${look}/${blocks}`;
  let p = resolved.get(key);
  if (!p) {
    const d = lookDef(look);
    const sc = blockColors(blocks);
    p = {
      ...d.palette,
      kit: d.kit,
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
