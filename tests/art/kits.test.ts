// The kit table: every figure kit's choices (foot, cavalry, horse archers, chariots, elephants, crews, war machine,
// shields, general and portrait) are data in KITS (src/art/kits.ts), and a look's exceptions are data in its LookStyle,
// so the drawing code never tests kit or look names. A new kit is one KITS entry plus any new shapes.
import { describe, expect, it } from 'vitest';
import type { ArmyLook } from '../../src/engine/types';
import { KITS } from '../../src/art/kits';
import { LOOKS, lookDef } from '../../src/art/palettes';

const SOURCES = import.meta.glob('../../src/art/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('the kit table', () => {
  it('the art code tests no kit or look by name', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(10);
    const literal = /kit (===|!==) '|look (===|!==) '|p\.kit === |p\.look === /;
    for (const [file, src] of Object.entries(SOURCES)) {
      src.split('\n').forEach((line, n) => expect(line, `${file}:${n + 1}`).not.toMatch(literal));
    }
  });

  it('every look is built from a kit that has a definition', () => {
    for (const look of Object.keys(LOOKS) as ArmyLook[]) {
      const kit = KITS[lookDef(look).kit];
      expect(kit, look).toBeDefined();
      expect(kit.foot('HI', 0).weapon, look).toBeTruthy();
    }
  });

  it('the base kits keep the base drawings of cavalry, chariots and elephants; the Expansion #1 kits have their own', () => {
    for (const kit of ['roman', 'punic', 'greek'] as const) {
      expect([KITS[kit].cavalry.drawing, KITS[kit].chariot.drawing, KITS[kit].elephant.drawing], kit).toEqual(['base', 'base', 'base']);
    }
    for (const kit of ['macedonian', 'persian', 'scythian', 'indian'] as const) {
      expect(KITS[kit].cavalry.drawing, kit).toBe('kit');
      expect(KITS[kit].chariot.drawing, kit).not.toBe('base');
      expect(KITS[kit].elephant.drawing, kit).not.toBe('base');
    }
  });

  it("a look's exceptions to its kit are data in its style: the Seleucid and Ptolemaic elephants, cataphracts, chariot driver", () => {
    expect(LOOKS.seleucid.style.elephant).toMatchObject({ drawing: 'loaded', frontlet: true, crewKit: 'persian' });
    expect(LOOKS.ptolemaic.style.elephant).toMatchObject({ drawing: 'loaded', body: 'forest' });
    expect(LOOKS.seleucid.style.mounted?.HC).toMatchObject({ cataphract: true });
    expect(LOOKS.seleucid.style.chariotDriver).toEqual({ longSleeve: true });
  });
});
