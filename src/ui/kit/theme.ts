import type { ArmyLook, Blocks, CardGroup } from '../../engine/types';

/** Cloth colours of a captured banner. */
export interface BannerCloth {
  main: string;
  light: string;
  dark: string;
}

/** Banner cloth of each block set (rom crimson, car tyrian purple). Greek and Eastern blocks arrive with Expansion #1. */
export const BANNER_CLOTH: Partial<Record<Blocks, BannerCloth>> = {
  rom: { main: '#9b1f1c', light: '#c9483a', dark: '#5a0f0e' },
  car: { main: '#6a1e5c', light: '#9c4f8c', dark: '#3a0c33' },
};

/** Looks that keep their own banner cloth whatever blocks they fight on (the Syracusans' deep blue; see `sideColors` in art/palettes). */
const LOOK_CLOTH: Partial<Record<ArmyLook, BannerCloth>> = {
  syracusan: { main: '#1f417e', light: '#4b72b6', dark: '#0f2149' },
};

/** Cloth colour of the banners an army captured; throws when its blocks have none. */
export function bannerCloth(look: ArmyLook, blocks: Blocks): BannerCloth {
  const c = LOOK_CLOTH[look] ?? BANNER_CLOTH[blocks];
  if (!c) throw new Error(`No banner colour for blocks "${blocks}"`);
  return c;
}

/** Colour coding of the four card groups. */
export const GROUP_COLORS: Record<CardGroup, { main: string; light: string; dark: string; label: string }> = {
  section: { main: '#6f6526', light: '#a89b48', dark: '#3b350e', label: 'Section' },
  troop: { main: '#8c1d1b', light: '#bd4232', dark: '#520f0e', label: 'Troop' },
  leadership: { main: '#22457f', light: '#4d73b4', dark: '#11264d', label: 'Leadership' },
  tactic: { main: '#55235f', light: '#8a539c', dark: '#2d1035', label: 'Tactic' },
};

/** Design tokens. The same values are exposed as CSS custom properties in theme.css (`--kit-*`). */
export const theme = {
  font: {
    title: "'Cinzel', 'Trajan Pro', 'Times New Roman', serif",
    body: "'EB Garamond', Garamond, 'Times New Roman', serif",
  },
  color: {
    wood: '#2a1a10',
    woodDark: '#160d07',
    woodLight: '#4a2e1a',
    leather: '#3a2216',
    leatherDark: '#22130b',
    leatherLight: '#5a3622',
    parchment: '#f0e3c2',
    parchmentLight: '#f8efd7',
    parchmentDark: '#d9c393',
    ink: '#2b1d12',
    inkSoft: '#5a4630',
    bronze: '#b0823a',
    bronzeLight: '#e2bd72',
    bronzeDark: '#6e4b1c',
    gold: '#e8c45a',
    crimson: '#8e1b1b',
    royal: '#22457f',
    purple: '#55235f',
    olive: '#6b6a2a',
    felt: '#1d3127',
    hit: '#f0c94e',
    flag: '#e3801f',
  },
  dice: {
    light: '#2f8a3a',
    medium: '#2453a6',
    heavy: '#b3261e',
    ivory: '#f6efdc',
  },
  group: GROUP_COLORS,
  banner: BANNER_CLOTH,
  radius: { sm: 4, md: 8, lg: 14 },
  shadow: {
    soft: '0 2px 6px rgba(0,0,0,.35)',
    lifted: '0 14px 28px rgba(0,0,0,.55), 0 4px 10px rgba(0,0,0,.4)',
    glow: '0 0 0 2px #e8c45a, 0 0 18px 4px rgba(240, 200, 90, .55)',
  },
} as const;

export type Theme = typeof theme;
