// Expansion #3 type scaffold (rules-reference §18, §20): the eight new army looks and the city wall terrain exist. The
// looks' art is pinned in tests/art/exp3-looks.test.ts, the wall's own rules (§18.7) in exp3-walls.test.ts and the 19
// imported battles (301–319) in tests/scenarios; here only the looks' identity and the wall's name and basic shape.
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

  it('each new look has its own art, on its intended kit', () => {
    const KIT = {
      sullan: 'lateRoman', pompeian: 'lateRoman', caesarian: 'lateRoman', samnite: 'italic', sertorian: 'iberian', helvetii: 'celtic',
      numidian: 'punic', pontic: 'macedonian',
    } as const;
    const older = (ARMY_LOOKS as readonly string[]).filter((l) => !(EXP3_LOOKS as readonly string[]).includes(l)) as (keyof typeof LOOKS)[];
    for (const look of EXP3_LOOKS) {
      expect(LOOKS[look], look).toBeDefined();
      expect(lookDef(look).kit, look).toBe(KIT[look]);
      for (const other of older) expect(LOOKS[look], `${look} is not ${other}`).not.toBe(LOOKS[other]);
    }
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
