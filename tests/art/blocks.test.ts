// Block colours of Expansion #2: the Barbarian green (`bar`) and the grey Roman blocks (`gry`) must read apart from the
// other block sets, from each other and from the board they stand on; a unit of a command with its own block set (210:
// Lentulus' legions) draws only its base edge in that set's colour.
import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BLOCKS, type Blocks } from '../../src/engine/types';
import { BLOCK_COLORS, LeaderToken, UnitToken } from '../../src/art';
import { P } from '../../src/ui/terrain/palette';
import { deltaE } from './delta-e';

const svg = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(h('svg', null, el));

/** What a base edge is seen against on the board: grass, hills, woods, water, camps and the token's own flocked top. */
const BOARD: Record<string, string> = {
  grass: P.grass, grassDark: P.grassDark, grassOchre: P.grassOchre, hillLow: P.hill[0], hillHigh: P.hill[3],
  forestFloor: P.forestFloor, leafMid: P.leafMid, leafDark: P.leafDark, water: P.water, earth: P.earth, canvas: P.canvas,
  baseTop: '#6e6a3c',
};

describe('the Expansion #2 block colours', () => {
  const NEW: Blocks[] = ['bar', 'gry'];

  it('every block set has colours', () => {
    expect(Object.keys(BLOCK_COLORS).sort()).toEqual([...BLOCKS].sort());
  });

  it('the Barbarian green and the grey Roman edge differ from every other block set by dE >= 40', () => {
    const close: string[] = [];
    for (const a of NEW) {
      for (const b of BLOCKS.filter((x) => x !== a)) {
        for (const k of ['edge', 'banner'] as const) {
          const de = deltaE(BLOCK_COLORS[a][k], BLOCK_COLORS[b][k]);
          if (de < 40) close.push(`${a} ${k} vs ${b}: dE ${de.toFixed(1)}`);
        }
      }
    }
    expect(close).toEqual([]);
  });

  it('their base edges stand out from the board (grass, hills, woods, water, camps) by dE >= 25', () => {
    const close: string[] = [];
    for (const b of NEW) {
      for (const [name, c] of Object.entries(BOARD)) {
        const de = deltaE(BLOCK_COLORS[b].edge, c);
        if (de < 25) close.push(`${b} edge vs ${name}: dE ${de.toFixed(1)}`);
      }
    }
    expect(close).toEqual([]);
  });

  it('the shade, light and cloth colours keep the order of the other sets (shade < edge < light, dark < main < light)', () => {
    const lum = (c: string) => parseInt(c.slice(1, 3), 16) * 0.3 + parseInt(c.slice(3, 5), 16) * 0.59 + parseInt(c.slice(5, 7), 16) * 0.11;
    for (const b of NEW) {
      const c = BLOCK_COLORS[b];
      expect(lum(c.edgeShade), b).toBeLessThan(lum(c.edge));
      expect(lum(c.edge), b).toBeLessThan(lum(c.edgeLight));
      expect(lum(c.bannerShade), b).toBeLessThan(lum(c.banner));
      expect(lum(c.cloth.dark), b).toBeLessThan(lum(c.cloth.main));
      expect(lum(c.cloth.main), b).toBeLessThan(lum(c.cloth.light));
    }
  });
});

describe("a command's own block colour (edgeBlocks)", () => {
  const unit = { type: 'MI', look: 'marian', blockColor: 'rom', blocks: 4, maxBlocks: 4, facing: 'right' } as const;

  it('draws the base edge in the command colour and leaves the figures and badge alone', () => {
    const red = svg(h(UnitToken, unit));
    const grey = svg(h(UnitToken, { ...unit, edgeBlocks: 'gry' }));
    expect(grey).not.toBe(red);
    expect(grey).toContain(BLOCK_COLORS.gry.edge);
    expect(grey).not.toContain(BLOCK_COLORS.rom.edge);
    expect(red).toContain(BLOCK_COLORS.rom.edge);
    // only the base plate changes: swapping the edge colours back gives the red token
    const c = BLOCK_COLORS;
    const back = grey.replaceAll(c.gry.edgeShade, c.rom.edgeShade).replaceAll(c.gry.edgeLight, c.rom.edgeLight).replaceAll(c.gry.edge, c.rom.edge);
    expect(back).toBe(red);
  });

  it('the side colour is the default, and naming it changes nothing', () => {
    expect(svg(h(UnitToken, { ...unit, edgeBlocks: 'rom' }))).toBe(svg(h(UnitToken, unit)));
  });

  it("a leader alone stands on his command's colour too", () => {
    const leader = { look: 'marian', blockColor: 'rom', facing: 'left', attached: false, name: 'Lentulus', showName: true } as const;
    const grey = svg(h(LeaderToken, { ...leader, edgeBlocks: 'gry' }));
    expect(grey).toContain(BLOCK_COLORS.gry.edge);
    expect(grey).not.toBe(svg(h(LeaderToken, leader)));
  });
});
