// The Expansion #1 mounted, camel, elephant, chariot and war-machine figures: every type has its own miniature (no
// stand-ins), kits and looks differ where the armies did, elites reach the figures, and nothing renders broken.
import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ArmyLook, Blocks, EliteId, UnitType } from '../../src/engine/types';
import { LOOKS, paletteFor } from '../../src/art/palettes';
import { UnitIcon, UnitToken } from '../../src/art';
import { EliteStandard, Miniature, figureKind } from '../../src/art/token';
import { FootFigure, figurePalette, footKit } from '../../src/art/foot';
import type { Kit } from '../../src/art/palettes';
import { SCENARIOS } from '../../src/scenarios';

const svg = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(h('svg', null, el));
const MAX: Record<UnitType, number> = { LI: 4, LB: 4, LS: 4, AX: 4, WA: 4, MI: 4, HI: 4, LC: 3, MC: 3, HC: 3, EL: 2, HCH: 2, LBC: 3, CAM: 3, HWM: 2 };
const ALL_TYPES = Object.keys(MAX) as UnitType[];
const ALL_LOOKS = Object.keys(LOOKS) as ArmyLook[];
const KIT_LOOKS: ArmyLook[] = ['roman', 'carthaginian', 'syracusan', 'macedonian', 'persian', 'scythian', 'indian'];

/** A render with its colours stripped: what differs is the drawing (equipment, poses), not the paint. */
const shape = (s: string) => s.replace(/#[0-9a-f]{6}/gi, '');
const fig = (type: UnitType, look: ArmyLook, i = 2, elite?: EliteId, blocks: Blocks = 'grk') =>
  svg(h(Miniature, { type, p: paletteFor(look, blocks), i, elite }));
const token = (type: UnitType, look: ArmyLook, elite?: EliteId, blocks: Blocks = 'grk') =>
  svg(h(UnitToken, { type, look, blockColor: blocks, blocks: MAX[type], maxBlocks: MAX[type], facing: 'right', elite }));

describe('Expansion #1 figures', () => {
  it('every type has its own figure kind: horse archers ride, camels, elephants, chariots and machines have their own', () => {
    expect(ALL_TYPES.map((t) => [t, figureKind(t)])).toEqual([
      ['LI', 'foot'], ['LB', 'foot'], ['LS', 'foot'], ['AX', 'foot'], ['WA', 'foot'], ['MI', 'foot'], ['HI', 'foot'],
      ['LC', 'horse'], ['MC', 'horse'], ['HC', 'horse'], ['EL', 'elephant'], ['HCH', 'chariot'],
      ['LBC', 'horse'], ['CAM', 'camel'], ['HWM', 'machine'],
    ]);
  });

  it('no stand-ins: LBC is not the LC figure, CAM not the MC, HWM not the HI, in every kit', () => {
    for (const look of KIT_LOOKS) {
      for (let i = 0; i < 4; i++) {
        expect(fig('LBC', look, i), `${look} ${i}`).not.toBe(fig('LC', look, i));
        expect(fig('CAM', look, i), `${look} ${i}`).not.toBe(fig('MC', look, i));
        expect(fig('HWM', look, i), `${look} ${i}`).not.toBe(fig('HI', look, i));
      }
    }
  });

  it('every look draws every mounted, camel, elephant, chariot and machine figure (each pose, both facings) without NaN', () => {
    for (const look of ALL_LOOKS) {
      for (const type of ['LC', 'MC', 'HC', 'LBC', 'CAM', 'EL', 'HCH', 'HWM'] as UnitType[]) {
        for (let i = 0; i < 4; i++) {
          const out = fig(type, look, i);
          expect(out.length, `${look} ${type} ${i}`).toBeGreaterThan(2000);
          expect(out, `${look} ${type} ${i}`).not.toMatch(/NaN|undefined|Infinity/);
        }
        for (const facing of ['left', 'right'] as const) {
          for (let blocks = 1; blocks <= MAX[type]; blocks++) {
            const out = svg(h(UnitToken, { type, look, blockColor: 'eas', blocks, maxBlocks: MAX[type], facing }));
            expect(out, `${look} ${type} ${blocks} ${facing}`).not.toMatch(/NaN|undefined|Infinity/);
          }
        }
      }
    }
  });

  it('cavalry, elephants and chariots differ between the kits in their shapes, not only their colours', () => {
    // all four figures of a unit (some kits mix riders, e.g. Dahae and Thracian horse archers), colours stripped
    const unit = (type: UnitType, look: ArmyLook) => shape([0, 1, 2, 3].map((i) => fig(type, look, i)).join(''));
    for (const type of ['LC', 'MC', 'HC', 'LBC', 'EL', 'HCH'] as UnitType[]) {
      const kits = ['macedonian', 'persian', 'scythian', 'indian'].map((look) => unit(type, look as ArmyLook));
      expect(new Set(kits).size, type).toBe(4);
    }
    // the war machine and its crew per kit: Macedonian oxybeles, Roman scorpio with its front shield
    expect(shape(fig('HWM', 'roman'))).not.toBe(shape(fig('HWM', 'macedonian')));
  });

  it('looks of one kit have their own elephants, chariots and cavalry where their armies differed', () => {
    // Seleucid armoured headpiece and eastern crew, Ptolemaic forest elephant, Successor towers
    const els = (['seleucid', 'ptolemaic', 'epirote'] as ArmyLook[]).map((look) => fig('EL', look));
    expect(new Set(els).size).toBe(3);
    expect(fig('EL', 'seleucid').length).toBeGreaterThan(fig('EL', 'epirote').length);
    // shapes only (colours stripped): the Seleucid cataphracts are not the Antigonid heavy cavalry, but the two armies'
    // medium cavalry are the same Macedonian-kit riders in their own colours
    expect(shape(fig('HC', 'seleucid'))).not.toBe(shape(fig('HC', 'antigonid')));
    expect(shape(fig('MC', 'seleucid'))).toBe(shape(fig('MC', 'antigonid')));
    expect(shape(fig('HCH', 'seleucid'))).not.toBe(shape(fig('HCH', 'persian')));
  });

  it('the Companions are drawn as such: their own figures on the board, in icons, and an elite standard', () => {
    const plain = token('MC', 'macedonian');
    const companions = token('MC', 'macedonian', 'companions');
    expect(fig('MC', 'macedonian', 1, 'companions')).not.toBe(fig('MC', 'macedonian', 1));
    expect(companions).not.toBe(plain);
    expect(companions).toContain('#6a2a8a'); // the purple cloak
    expect(plain).not.toContain('#6a2a8a');
    const icon = (elite?: EliteId) => svg(h(UnitIcon, { type: 'MC', look: 'macedonian', blockColor: 'grk', size: 64, elite }));
    expect(icon('companions')).not.toBe(icon());
    // the plumes and the larger figure get their own, taller icon box (a smaller scale), so the icon is not clipped
    const scale = (out: string) => Number(/scale\(([\d.]+)\) translate/.exec(out)?.[1]);
    expect(scale(icon('companions'))).toBeLessThan(scale(icon()));
    // base cavalry keeps its base figure (and box) whatever the elite
    const roman = (elite?: EliteId) => svg(h(UnitIcon, { type: 'MC', look: 'roman', blockColor: 'rom', size: 64, elite }));
    expect(roman('companions')).toBe(roman());
  });

  it('Miniature draws every elite fielded in a scenario with its own figures', () => {
    const elites: { elite: EliteId; look: ArmyLook; type: UnitType }[] = [];
    for (const sc of SCENARIOS) {
      for (const u of sc.setup.units) {
        if (u.elite && !elites.some((e) => e.elite === u.elite)) elites.push({ elite: u.elite, look: sc.setup[u.side].look, type: u.type });
      }
    }
    expect(elites.map((e) => e.elite).sort()).toEqual(['bowAuxilia', 'carthSacredBand', 'companions', 'immortals', 'silverShields', 'thebanSacredBand']);
    for (const { elite, look, type } of elites) {
      expect(fig(type, look, 2, elite), elite).not.toBe(fig(type, look, 2));
    }
  });

  it('the elite standard carries the army device: the Carthaginian disc and crescent stays, other elites show their own', () => {
    const std = (look: ArmyLook) => svg(h(EliteStandard, { p: paletteFor(look, 'grk') }));
    expect(std('carthaginian')).toContain('M-1.3 -25.7 A 2.1 1.9 0 0 0 2.9 -25.7');
    for (const look of ['theban', 'antigonid', 'persian', 'macedonian', 'mauryan'] as ArmyLook[]) {
      expect(std(look), look).not.toContain('M-1.3 -25.7 A 2.1 1.9 0 0 0 2.9 -25.7');
    }
    expect(new Set(['theban', 'antigonid', 'persian', 'macedonian', 'mauryan'].map((l) => std(l as ArmyLook))).size).toBe(5);
  });

  it('a palette carries the look it was resolved from, and so do the figure palettes made from it', () => {
    for (const look of ALL_LOOKS) {
      const p = paletteFor(look, 'eas');
      expect(p.look).toBe(look);
      for (let i = 0; i < 4; i++) expect(figurePalette(p, i).look, `${look} ${i}`).toBe(look);
    }
  });

  it('icons of the new types fit their box (no NaN, scaled to the requested size)', () => {
    for (const look of ALL_LOOKS) {
      for (const type of ALL_TYPES) {
        const out = svg(h(UnitIcon, { type, look, blockColor: 'eas', size: 32 }));
        expect(out, `${look} ${type}`).not.toMatch(/NaN|undefined|Infinity/);
        const s = Number(/scale\(([\d.]+)\) translate/.exec(out)?.[1]);
        expect(s, `${look} ${type}`).toBeGreaterThan(0.4);
        expect(s, `${look} ${type}`).toBeLessThan(1.1);
      }
    }
  });
});

describe('Expansion #1 foot figures', () => {
  const FOOT: UnitType[] = ['LI', 'LB', 'LS', 'AX', 'WA', 'MI', 'HI'];
  /** All four figures of a unit, colours stripped. */
  const unit = (draw: (i: number) => string) => shape([0, 1, 2, 3].map(draw).join(''));

  it('each new kit has its own foot figures: drawn in one palette, they differ in shape from the Roman kit', () => {
    // the kit's own figures (footKit), all in the Roman palette (which has no per-type look overrides), so only the
    // kit's drawing differs; the Successors' warriors are the same Celtic figures as Rome's Gauls (Galatian mercenaries)
    const roman = paletteFor('roman', 'rom');
    expect(roman.style.foot).toBeUndefined();
    const kitUnit = (type: UnitType, kit: Kit) => unit((i) => svg(h(FootFigure, { kit: footKit(type, kit, i), p: roman, i })));
    for (const kit of ['macedonian', 'persian', 'scythian', 'indian'] as Kit[]) {
      for (const type of FOOT) {
        if (kit === 'macedonian' && type === 'WA') {
          expect(kitUnit(type, kit)).toBe(kitUnit(type, 'roman'));
          continue;
        }
        expect(kitUnit(type, kit), `${kit} ${type}`).not.toBe(kitUnit(type, 'roman'));
      }
    }
  });

  it('as the armies are seated, the kit looks differ in shape from the Roman foot as well', () => {
    for (const look of ['macedonian', 'persian', 'scythian', 'indian'] as ArmyLook[]) {
      for (const type of FOOT) {
        if (look === 'macedonian' && type === 'WA') continue; // the same Celtic warriors (see above)
        expect(unit((i) => fig(type, look, i)), `${look} ${type}`).not.toBe(unit((i) => fig(type, 'roman', i)));
      }
    }
  });

  // looks of one kit: without the look's per-type overrides these shapes would be the same
  it("a look's per-type overrides reach its figures: Athenian archers are not Syracusan ones", () => {
    expect(paletteFor('athenian', 'grk').kit).toBe(paletteFor('syracusan', 'grk').kit);
    expect(unit((i) => fig('LB', 'athenian', i))).not.toBe(unit((i) => fig('LB', 'syracusan', i)));
  });

  it("a look's per-type overrides reach its figures: Epirote skirmishers are not Macedonian ones", () => {
    expect(paletteFor('epirote', 'grk').kit).toBe(paletteFor('macedonian', 'grk').kit);
    expect(unit((i) => fig('LI', 'epirote', i))).not.toBe(unit((i) => fig('LI', 'macedonian', i)));
  });
});
