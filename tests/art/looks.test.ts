// Appearance guard for the split of `Faction` into blocks (side colour) and look (figure kit + palette):
// every base army must still be painted with exactly the swatches it had before (the Syracusans' blue now belongs
// to the Greek blocks, `grk`, which scenarios 001 and 002 seat them on). palette-baseline.json is the
// serialised FACTION_PALETTES / FACTION_COLORS of the last commit that still had `Faction`.
import { describe, expect, it } from 'vitest';
import baselineJson from './palette-baseline.json';
import { createGame } from '../../src/engine';
import type { ArmyLook, Blocks } from '../../src/engine/types';
import { BLOCK_COLORS, LOOKS, blockColors, lookDef, paletteFor, type Kit } from '../../src/art/palettes';
import { bannerCloth } from '../../src/ui/kit/theme';
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
  { old: 'syracuse', look: 'syracusan', blocks: 'grk', kit: 'greek' },
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
      expect(bannerCloth(a.blocks)).toEqual(baseline.FACTION_COLORS[a.old]);
    });
  }

  it('block colours: rom, car and grk are the old Roman, Carthaginian and Syracusan base edge, banner and banner-track cloth', () => {
    for (const [blocks, old] of [['rom', 'rome'], ['car', 'carthage'], ['grk', 'syracuse']] as const) {
      const p = baseline.FACTION_PALETTES[old];
      expect(blockColors(blocks)).toEqual({
        edge: p.baseEdge, edgeShade: p.baseEdgeShade, edgeLight: p.baseEdgeLight, banner: p.banner, bannerShade: p.bannerShade,
        cloth: baseline.FACTION_COLORS[old],
      });
      expect(bannerCloth(blocks)).toEqual(baseline.FACTION_COLORS[old]);
    }
  });

  it('side colours depend only on the block set, never on the look', () => {
    const sideOf = (p: ReturnType<typeof paletteFor>) => ({
      baseEdge: p.baseEdge, baseEdgeShade: p.baseEdgeShade, baseEdgeLight: p.baseEdgeLight, banner: p.banner, bannerShade: p.bannerShade,
    });
    for (const blocks of ['rom', 'car', 'grk'] as const) {
      const expected = sideOf(paletteFor('roman', blocks));
      expect(sideOf(paletteFor('carthaginian', blocks))).toEqual(expected);
      expect(sideOf(paletteFor('syracusan', blocks))).toEqual(expected);
    }
    // the Syracusans on Roman blocks are Roman red (their blue is the Greek blocks', not the look's)
    const onRom = paletteFor('syracusan', 'rom');
    const roman = paletteFor('roman', 'rom');
    expect(sideOf(onRom)).toEqual(sideOf(roman));
    expect(onRom.tunic).toBe(paletteFor('syracusan', 'grk').tunic); // the look still decides the figure swatches
    expect(onRom.tunic).not.toBe(roman.tunic);
    // and the Roman side colours are not the Greek blue
    expect(roman.baseEdge).not.toBe(paletteFor('syracusan', 'grk').baseEdge);
    expect(roman.banner).not.toBe(paletteFor('syracusan', 'grk').banner);
  });

  it('a resolved palette is shared, not rebuilt (tokens are memoised on it)', () => {
    expect(paletteFor('roman', 'rom')).toBe(paletteFor('roman', 'rom'));
  });
});

describe('every base scenario seats its armies in the old colours', () => {
  /** The old faction of an army (what `faction()` in src/scenarios/index.ts used to compute from the JSON). */
  const oldFaction = (army: string): OldFaction => (army === 'Carthaginian' ? 'carthage' : army === 'Syracusan' ? 'syracuse' : 'rome');
  const BASE = SCENARIOS.filter((sc) => sc.expansion === 'base');

  it('covers all 15 battles', () => {
    expect(BASE.map((sc) => sc.id)).toEqual(['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '014', '015']);
  });

  for (const sc of BASE) {
    it(`${sc.id} ${sc.name}`, () => {
      const g = createGame(sc.setup, 1);
      for (const side of ['top', 'bottom'] as const) {
        const setup = sc.setup[side];
        const player = g.players[side];
        expect(player.blocks).toBe(setup.blocks);
        expect(player.look).toBe(setup.look);
        // the look and the blocks both follow the army (Syracusans: syracusan look on Greek blocks)
        expect(setup.look).toBe(setup.army === 'Syracusan' ? 'syracusan' : setup.army === 'Roman' ? 'roman' : 'carthaginian');
        expect(setup.blocks).toBe(setup.army === 'Carthaginian' ? 'car' : setup.army === 'Syracusan' ? 'grk' : 'rom');
        const old = oldFaction(setup.army);
        const { faction: _f, ...expected } = baseline.FACTION_PALETTES[old];
        const { kit: _k, ...drawn } = paletteFor(player.look, player.blocks);
        expect(drawn, `${side} ${setup.army}`).toEqual(expected);
        expect(bannerCloth(player.blocks)).toEqual(baseline.FACTION_COLORS[old]);
      }
    });
  }
});

// TEMPORARY until Task 15 (army looks): the Expansion #1 looks and the Eastern (`eas`) blocks have no art yet, so a
// look without art borrows the closest base kit (Greek kit / Syracusan palette, or the Punic kit / Carthaginian palette)
// and `eas` has provisional ochre-tan colours. Task 15 replaces these tests with the real looks and restores the rule
// that a look without art throws.
describe('looks without art fall back to the closest base kit (TEMPORARY until Task 15)', () => {
  const GREEK: ArmyLook[] = ['athenian', 'theban', 'spartan', 'phocian', 'macedonian', 'antigonid', 'epirote', 'craterus', 'eumenes', 'antigonus', 'seleucid', 'ptolemaic'];
  const EASTERN: ArmyLook[] = ['persian', 'scythian', 'indian', 'mauryan'];

  it('the Greek and Successor looks borrow the Syracusan art, the Eastern looks the Carthaginian art', () => {
    for (const look of GREEK) expect(lookDef(look), look).toBe(LOOKS.syracusan);
    for (const look of EASTERN) expect(lookDef(look), look).toBe(LOOKS.carthaginian);
    expect(paletteFor('athenian', 'grk')).toEqual(paletteFor('syracusan', 'grk'));
    expect(paletteFor('persian', 'eas').kit).toBe('punic');
    expect(paletteFor('persian', 'eas').tunic).toBe(paletteFor('carthaginian', 'car').tunic);
  });

  it('the three base looks keep their own art', () => {
    expect(lookDef('roman')).toBe(LOOKS.roman);
    expect(lookDef('carthaginian')).toBe(LOOKS.carthaginian);
    expect(lookDef('syracusan')).toBe(LOOKS.syracusan);
  });

  it('every army of every scenario can be drawn', () => {
    for (const sc of SCENARIOS) {
      for (const side of ['top', 'bottom'] as const) {
        const { look, blocks } = sc.setup[side];
        expect(() => paletteFor(look, blocks), `${sc.id} ${side}`).not.toThrow();
        expect(() => bannerCloth(blocks), `${sc.id} ${side}`).not.toThrow();
      }
    }
  });

  it('Eastern blocks have provisional ochre-tan side colours of their own', () => {
    expect(blockColors('eas')).toEqual({
      edge: '#b8893a', edgeShade: '#7a5a22', edgeLight: '#dcb36a', banner: '#a87a30', bannerShade: '#6e4e1c',
      cloth: { main: '#9a7030', light: '#c89a52', dark: '#5e4218' },
    });
    expect(bannerCloth('eas')).toEqual(blockColors('eas').cloth);
    const p = paletteFor('persian', 'eas');
    expect([p.baseEdge, p.banner]).toEqual(['#b8893a', '#a87a30']);
  });

  it('a look or block set outside the types still throws and names it', () => {
    expect(() => lookDef('klingon' as ArmyLook)).toThrow(/klingon/);
    expect(() => paletteFor('klingon' as ArmyLook, 'rom')).toThrow(/klingon/);
    expect(() => blockColors('xyz' as Blocks)).toThrow(/xyz/);
    expect(() => bannerCloth('xyz' as Blocks)).toThrow(/xyz/);
  });

  it('art exists for exactly the three base looks; side colours for the three base block sets plus provisional eas', () => {
    expect(Object.keys(LOOKS).sort()).toEqual(['carthaginian', 'roman', 'syracusan']);
    expect(Object.keys(BLOCK_COLORS).sort()).toEqual(['car', 'eas', 'grk', 'rom']);
  });
});
