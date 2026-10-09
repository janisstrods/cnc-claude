// Appearance guard for the split of `Faction` into blocks (side colour) and look (figure kit + palette):
// every base army must still be painted with exactly the swatches it had before. palette-baseline.json is the
// serialised FACTION_PALETTES / FACTION_COLORS of the last commit that still had `Faction`.
import { describe, expect, it } from 'vitest';
import baselineJson from './palette-baseline.json';
import { createGame } from '../../src/engine';
import type { ArmyLook, Blocks } from '../../src/engine/types';
import { BLOCK_COLORS, LOOKS, blockColors, lookDef, paletteFor, type Kit } from '../../src/art/palettes';
import { BANNER_CLOTH, bannerCloth } from '../../src/ui/kit/theme';
import { SCENARIOS } from '../../src/scenarios';

const baseline = baselineJson as unknown as {
  FACTION_PALETTES: Record<string, Record<string, unknown>>;
  FACTION_COLORS: Record<string, { main: string; light: string; dark: string }>;
};

type OldFaction = 'rome' | 'carthage' | 'syracuse';

/** The three armies of the base game: how they were seated before (old faction) and now (look + blocks + kit). */
const ARMIES: { old: OldFaction; look: ArmyLook; blocks: Blocks; kit: Kit }[] = [
  { old: 'rome', look: 'roman', blocks: 'rom', kit: 'roman' },
  { old: 'carthage', look: 'carthaginian', blocks: 'car', kit: 'punic' },
  { old: 'syracuse', look: 'syracusan', blocks: 'rom', kit: 'greek' },
];

describe('base armies are painted exactly as before', () => {
  for (const a of ARMIES) {
    it(`${a.look} on ${a.blocks} blocks equals the old '${a.old}' palette, swatch for swatch`, () => {
      const { faction, ...old } = baseline.FACTION_PALETTES[a.old];
      expect(faction).toBe(a.old);
      const { kit, ...now } = paletteFor(a.look, a.blocks);
      expect(kit).toBe(a.kit);
      expect(now).toEqual(old);
    });

    it(`${a.look} on ${a.blocks} blocks has the old '${a.old}' banner-track cloth`, () => {
      expect(bannerCloth(a.look, a.blocks)).toEqual(baseline.FACTION_COLORS[a.old]);
    });
  }

  it('block colours: rom and car are the old Roman and Carthaginian base edge and banner', () => {
    for (const [blocks, old] of [['rom', 'rome'], ['car', 'carthage']] as const) {
      const p = baseline.FACTION_PALETTES[old];
      expect(blockColors(blocks)).toEqual({
        edge: p.baseEdge, edgeShade: p.baseEdgeShade, edgeLight: p.baseEdgeLight, banner: p.banner, bannerShade: p.bannerShade,
      });
      expect(BANNER_CLOTH[blocks]).toEqual(baseline.FACTION_COLORS[old]);
    }
  });

  it('the Syracusans keep their own blue side colours whatever the blocks', () => {
    const blue = paletteFor('syracusan', 'rom');
    const rom = paletteFor('roman', 'rom');
    expect(blue.baseEdge).not.toBe(rom.baseEdge);
    expect(blue.banner).not.toBe(rom.banner);
    expect(paletteFor('syracusan', 'car')).toEqual(blue);
  });

  it('a resolved palette is shared, not rebuilt (tokens are memoised on it)', () => {
    expect(paletteFor('roman', 'rom')).toBe(paletteFor('roman', 'rom'));
  });
});

describe('every base scenario seats its armies in the old colours', () => {
  /** What `faction()` in src/scenarios/index.ts used to compute from the JSON. */
  const oldFaction = (blocks: Blocks, army: string): OldFaction => (blocks === 'car' ? 'carthage' : army === 'Syracusan' ? 'syracuse' : 'rome');

  it('covers all 15 battles', () => {
    expect(SCENARIOS).toHaveLength(15);
  });

  for (const sc of SCENARIOS) {
    it(`${sc.id} ${sc.name}`, () => {
      const g = createGame(sc.setup, 1);
      for (const side of ['top', 'bottom'] as const) {
        const setup = sc.setup[side];
        const player = g.players[side];
        expect(player.blocks).toBe(setup.blocks);
        expect(player.look).toBe(setup.look);
        // the look follows the army, the blocks follow the side
        expect(setup.look).toBe(setup.army === 'Syracusan' ? 'syracusan' : setup.army === 'Roman' ? 'roman' : 'carthaginian');
        expect(setup.blocks).toBe(setup.army === 'Carthaginian' ? 'car' : 'rom');
        const old = oldFaction(setup.blocks, setup.army);
        const { faction: _f, ...expected } = baseline.FACTION_PALETTES[old];
        const { kit: _k, ...drawn } = paletteFor(player.look, player.blocks);
        expect(drawn, `${side} ${setup.army}`).toEqual(expected);
        expect(bannerCloth(player.look, player.blocks)).toEqual(baseline.FACTION_COLORS[old]);
      }
    });
  }
});

describe('missing art fails loudly', () => {
  it('a look without art throws and names the look', () => {
    expect(() => lookDef('athenian')).toThrow(/athenian/);
    expect(() => paletteFor('mauryan', 'rom')).toThrow(/mauryan/);
  });

  it('blocks without colours throw and name the blocks', () => {
    expect(() => blockColors('grk')).toThrow(/grk/);
    expect(() => paletteFor('roman', 'eas')).toThrow(/eas/);
    expect(() => bannerCloth('roman', 'grk')).toThrow(/grk/);
  });

  it('Phase 1 has art for exactly the three base looks and two block sets', () => {
    expect(Object.keys(LOOKS).sort()).toEqual(['carthaginian', 'roman', 'syracusan']);
    expect(Object.keys(BLOCK_COLORS).sort()).toEqual(['car', 'rom']);
  });
});
