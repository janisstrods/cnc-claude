// Expansion #3 type scaffold (rules-reference §18, §20): the eight new army looks and the city wall terrain exist, with
// temporary art. The wall's own rules (§18.7) are tested in exp3-walls.test.ts; here only its name and basic shape.
import { describe, expect, it } from 'vitest';
import { ARMY_LOOKS, TERRAIN_NAMES, ccCapOfHex, isImpassable, pieceMoves, rangedFromCap } from '../../src/engine';
import { LOOKS, lookDef, paletteFor } from '../../src/art/palettes';
import { terrainName } from '../../src/ui/terrain';
import { H, build, play } from './helpers';

const EXP3_LOOKS = ['sullan', 'samnite', 'sertorian', 'pompeian', 'caesarian', 'helvetii', 'numidian', 'pontic'] as const;

describe('Expansion #3 scaffold', () => {
  it('has the eight new army looks, each with art', () => {
    for (const look of EXP3_LOOKS) {
      expect(ARMY_LOOKS as readonly string[], look).toContain(look);
      expect(lookDef(look).kit, look).toBeTruthy();
      expect(paletteFor(look, 'rom').look, look).toBe(look);
    }
  });

  it('the temporary looks reuse the older art of their parties', () => {
    for (const look of ['sullan', 'pompeian', 'caesarian'] as const) expect(LOOKS[look]).toBe(LOOKS.marian);
    for (const look of ['helvetii', 'sertorian'] as const) expect(LOOKS[look]).toBe(LOOKS.gallic);
    expect(LOOKS.numidian).toBe(LOOKS.carthaginian);
    expect(LOOKS.pontic).toBe(LOOKS.antigonid);
    expect(LOOKS.samnite).toBe(LOOKS.syracusan);
  });

  it('has the city wall terrain: named, not impassable, close combat capped at 2, ranged combat not capped', () => {
    const s = build({ terrain: [{ at: [5, 6], t: 'wall' }] });
    expect(s.terrain[H(5, 6)]).toBe('wall');
    expect(TERRAIN_NAMES.wall).toBe('City Wall');
    expect(terrainName('wall', false)).toBe('City Wall');
    expect(isImpassable(s, H(5, 6))).toBe(false);
    expect(ccCapOfHex(s, H(5, 6))).toBe(2);
    expect(rangedFromCap(s, H(5, 6))).toBeGreaterThan(5);
  });

  it('a foot unit next to a wall hex may move onto it; a mounted unit may not', () => {
    const moves = (type: 'MI' | 'MC') => {
      const s = build({ units: [{ side: 'bottom', type, at: [6, 6] }], terrain: [{ at: [5, 6], t: 'wall' }] });
      return pieceMoves(play(s, 'order4C', ['u1']).state, 'u1').map((m) => m.hex);
    };
    expect(moves('MI')).toContain(H(5, 6));
    expect(moves('MC')).not.toContain(H(5, 6));
  });
});
