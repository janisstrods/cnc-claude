// Appearance guards for the army art.
// 1. The split of `Faction` into blocks (side colour) and look (figure kit + palette): every base army must still be
//    painted with exactly the swatches it had before (the Syracusans' blue now belongs to the Greek blocks, `grk`, which
//    scenarios 001 and 002 seat them on). palette-baseline.json is the serialised FACTION_PALETTES / FACTION_COLORS of
//    the last commit that still had `Faction`.
// 2. The base armies render byte-identically to the art before Expansion #1 (pinned SVG hash).
// 3. The Expansion #1 looks: all 19 looks and 4 block sets exist, armies that meet look different, elites differ.
import { describe, expect, it } from 'vitest';
import baselineJson from './palette-baseline.json';
import { createGame } from '../../src/engine';
import type { ArmyLook, Blocks, EliteId, UnitType } from '../../src/engine/types';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BLOCK_COLORS, LOOKS, blockColors, lookDef, paletteFor, type Kit } from '../../src/art/palettes';
import { LeaderToken, UnitIcon, UnitToken } from '../../src/art';
import { ELITE_FOOT, EliteCtx, FootFigure, crewFigure, figurePalette, footKit } from '../../src/art/foot';
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
      const { kit, style, ...now } = paletteFor(a.look, a.blocks);
      expect(kit).toBe(a.kit);
      expect(style).toBe(LOOKS[a.look].style);
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
        const { kit: _k, style: _s, ...drawn } = paletteFor(player.look, player.blocks);
        expect(drawn, `${side} ${setup.army}`).toEqual(expected);
        expect(bannerCloth(player.blocks)).toEqual(baseline.FACTION_COLORS[old]);
      }
    });
  }
});

const svg = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(h('svg', null, el));
const MAX: Record<UnitType, number> = { LI: 4, LB: 4, LS: 4, AX: 4, WA: 4, MI: 4, HI: 4, LC: 3, MC: 3, HC: 3, EL: 2, HCH: 2, LBC: 3, CAM: 3, HWM: 2 };
const ALL_TYPES = Object.keys(MAX) as UnitType[];
const BASE_TYPES: UnitType[] = ['LI', 'LB', 'LS', 'AX', 'WA', 'MI', 'HI', 'LC', 'MC', 'HC', 'EL', 'HCH'];

describe('base armies are drawn exactly as before Expansion #1 (rendered SVG)', () => {
  // SHA-256 of a react-dom/server render of every base-game UnitToken (all strengths, both facings, dimmed or not),
  // UnitIcon and LeaderToken of the three base looks, computed on the tree before the Expansion #1 looks existed.
  // Elite tokens are left out: the Sacred Band's figures get their own look once the token passes `elite` on.
  const BASELINE = '3ae9d01d94e4381ad996a4284e043472be3abb3618a4c5e52f7eed908c72d8d7';

  it('every base token, icon and leader renders byte-identically', async () => {
    const parts: string[] = [];
    const hash = { update: (s: string) => parts.push(s) };
    for (const a of [{ look: 'roman', blockColor: 'rom' }, { look: 'carthaginian', blockColor: 'car' }, { look: 'syracusan', blockColor: 'grk' }] as const) {
      for (const type of BASE_TYPES) {
        for (let blocks = 0; blocks <= MAX[type]; blocks++) {
          for (const facing of ['left', 'right'] as const) {
            for (const dimmed of [false, true]) hash.update(svg(h(UnitToken, { type, ...a, blocks, maxBlocks: MAX[type], facing, dimmed })));
          }
        }
        for (const size of [24, 64]) hash.update(svg(h(UnitIcon, { type, ...a, size })));
      }
      for (const facing of ['left', 'right'] as const) {
        for (const attached of [false, true]) hash.update(svg(h(LeaderToken, { ...a, facing, attached, name: 'Hannibal', showName: true })));
      }
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts.join('')));
    const hex = [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, '0')).join('');
    expect(hex).toBe(BASELINE);
  });
});

/** The kit of every look (Expansion #1 brief). */
const KITS: Record<ArmyLook, Kit> = {
  roman: 'roman', carthaginian: 'punic', syracusan: 'greek',
  athenian: 'greek', theban: 'greek', spartan: 'greek', phocian: 'greek',
  macedonian: 'macedonian', antigonid: 'macedonian', epirote: 'macedonian', craterus: 'macedonian', eumenes: 'macedonian',
  antigonus: 'macedonian', seleucid: 'macedonian', ptolemaic: 'macedonian',
  persian: 'persian', scythian: 'scythian', indian: 'indian', mauryan: 'indian',
};
const ALL_LOOKS = Object.keys(KITS) as ArmyLook[];

describe('army looks of Expansion #1', () => {
  it('every army look has art, with its kit', () => {
    expect(Object.keys(LOOKS).sort()).toEqual([...ALL_LOOKS].sort());
    for (const look of ALL_LOOKS) {
      expect(lookDef(look).kit, look).toBe(KITS[look]);
      expect(paletteFor(look, 'grk').kit, look).toBe(KITS[look]);
    }
  });

  it('the base looks keep their devices: the kit emblems, wreath / crescent / circle standards', () => {
    expect(LOOKS.roman.style).toEqual({ emblems: ['rome'], device: 'wreath', finial: 'eagle' });
    expect(LOOKS.carthaginian.style).toEqual({ emblems: ['carthage'], device: 'carthage', finial: 'crescent' });
    expect(LOOKS.syracusan.style).toEqual({ emblems: ['syracuse'], device: 'syracuse', finial: 'lozenge' });
  });

  it('block colours exist for all four block sets; Eastern blocks are ochre-tan', () => {
    expect(Object.keys(BLOCK_COLORS).sort()).toEqual(['car', 'eas', 'grk', 'rom']);
    expect(blockColors('grk').edge).toBe('#1f4fb4');
    expect(blockColors('eas')).toEqual({
      edge: '#c88a22', edgeShade: '#7c5212', edgeLight: '#ecbc5e', banner: '#b8801e', bannerShade: '#74500f',
      cloth: { main: '#a8741e', light: '#d4a24a', dark: '#5e3e0c' },
    });
    expect(bannerCloth('eas')).toEqual(blockColors('eas').cloth);
    const p = paletteFor('persian', 'eas');
    expect([p.baseEdge, p.banner]).toEqual(['#c88a22', '#b8801e']);
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

  it('a look or block set outside the types throws and names it', () => {
    expect(() => lookDef('klingon' as ArmyLook)).toThrow(/klingon/);
    expect(() => lookDef('constructor' as ArmyLook)).toThrow(/constructor/);
    expect(() => paletteFor('klingon' as ArmyLook, 'rom')).toThrow(/klingon/);
    expect(() => blockColors('xyz' as Blocks)).toThrow(/xyz/);
    expect(() => bannerCloth('xyz' as Blocks)).toThrow(/xyz/);
  });

  it('the two armies of every Expansion #1 battle look different (figures and side colours)', () => {
    for (const sc of SCENARIOS.filter((s) => s.expansion === 'exp1')) {
      const a = paletteFor(sc.setup.top.look, sc.setup.top.blocks);
      const b = paletteFor(sc.setup.bottom.look, sc.setup.bottom.blocks);
      expect(a.baseEdge, sc.id).not.toBe(b.baseEdge);
      expect([a.tunic, a.shield], sc.id).not.toEqual([b.tunic, b.shield]);
    }
  });

  it('the eight Successor-kit palettes are distinct from each other (tunic and shield)', () => {
    const mac = ALL_LOOKS.filter((l) => KITS[l] === 'macedonian');
    expect(mac).toHaveLength(8);
    const keys = mac.map((l) => `${LOOKS[l].palette.tunic}/${LOOKS[l].palette.shield}`);
    expect(new Set(keys).size).toBe(8);
    expect(new Set(mac.map((l) => LOOKS[l].palette.tunic)).size).toBe(8);
    expect(new Set(mac.map((l) => LOOKS[l].palette.shield)).size).toBe(8);
  });

  it('every look draws every unit type, alone and with a leader, and every type differs between kits', () => {
    for (const look of ALL_LOOKS) {
      const blockColor = look === 'roman' ? 'rom' : look === 'carthaginian' ? 'car' : 'eas';
      for (const type of ALL_TYPES) {
        const out = svg(h(UnitToken, { type, look, blockColor, blocks: MAX[type], maxBlocks: MAX[type], facing: 'left' }));
        expect(out.length, `${look} ${type}`).toBeGreaterThan(1000);
        expect(out, `${look} ${type}`).not.toMatch(/NaN|undefined/);
      }
      for (const attached of [false, true]) {
        const out = svg(h(LeaderToken, { look, blockColor, facing: 'right', attached, name: 'Leader', showName: true }));
        expect(out, look).not.toMatch(/NaN|undefined/);
      }
    }
    const foot: UnitType[] = ['LI', 'LB', 'LS', 'AX', 'WA', 'MI', 'HI'];
    for (const type of foot) {
      const byKit = new Set(['roman', 'carthaginian', 'syracusan', 'macedonian', 'persian', 'scythian', 'indian'].map((look) =>
        svg(h(UnitToken, { type, look: look as ArmyLook, blockColor: 'grk', blocks: 4, maxBlocks: 4, facing: 'right' }))));
      expect(byKit.size, type).toBe(7);
    }
  });

  it('looks of one kit differ in their figures (devices, colours, per-type details)', () => {
    for (const kit of ['greek', 'macedonian', 'indian'] as Kit[]) {
      const looks = ALL_LOOKS.filter((l) => KITS[l] === kit);
      const hi = new Set(looks.map((look) => svg(h(UnitToken, { type: 'HI', look, blockColor: 'grk', blocks: 4, maxBlocks: 4, facing: 'right' }))));
      expect(hi.size, kit).toBe(looks.length);
    }
  });
});

describe('elite foot figures', () => {
  const ELITES: { elite: EliteId; look: ArmyLook; type: UnitType }[] = [
    { elite: 'carthSacredBand', look: 'carthaginian', type: 'HI' },
    { elite: 'thebanSacredBand', look: 'theban', type: 'MI' },
    { elite: 'silverShields', look: 'eumenes', type: 'HI' },
    { elite: 'immortals', look: 'persian', type: 'MI' },
    { elite: 'bowAuxilia', look: 'mauryan', type: 'AX' },
  ];

  for (const { elite, look, type } of ELITES) {
    it(`${elite} (${look} ${type}) has its own figures, by prop or by context`, () => {
      const p = paletteFor(look, 'grk');
      const kit = footKit(type, p.kit, 2);
      const plain = svg(h(FootFigure, { kit, p, i: 2 }));
      const byProp = svg(h(FootFigure, { kit, p, i: 2, elite }));
      const byCtx = svg(h(EliteCtx.Provider, { value: elite }, h(FootFigure, { kit, p, i: 2 })));
      expect(byProp).not.toBe(plain);
      expect(byCtx).toBe(byProp);
      expect(ELITE_FOOT[elite]).toBeDefined();
    });
  }

  it('an ordinary figure of a base look is painted with the army palette itself (no copies)', () => {
    const p = paletteFor('roman', 'rom');
    for (let i = 0; i < 4; i++) expect(figurePalette(p, i)).toBe(p);
    const persian = paletteFor('persian', 'eas');
    expect(figurePalette(persian, 1)).toBe(figurePalette(persian, 1));
    expect(figurePalette(persian, 1).tunic).not.toBe(persian.tunic);
  });

  it('war-machine crews are drawn for every kit and pose', () => {
    for (const look of ['roman', 'carthaginian', 'syracusan', 'macedonian', 'persian', 'scythian', 'indian'] as ArmyLook[]) {
      for (const pose of ['crank', 'load', 'aim', { near: [6, -18], far: [4, -16] }] as const) {
        const out = svg(crewFigure(paletteFor(look, 'grk'), 1, pose as Parameters<typeof crewFigure>[2]));
        expect(out.length, look).toBeGreaterThan(500);
        expect(out).not.toMatch(/NaN|undefined/);
      }
    }
  });
});
