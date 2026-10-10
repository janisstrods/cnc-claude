// The Expansion #2 armies: the Celtic, Germanic and late-Roman kits, the Gallic, Belgic, British, Germanic, Slave and
// Marian looks, the Tenth Legion, and the named leaders Caesar and Spartacus.
import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ArmyLook, Blocks, UnitType } from '../../src/engine/types';
import { LEADER_LOOKS, LOOKS, leaderLook, paletteFor, type ArtEliteId, type EmblemKind, type Palette } from '../../src/art/palettes';
import { KITS } from '../../src/art/kits';
import { LeaderToken, UnitIcon, UnitToken } from '../../src/art';
import { ELITE_FOOT, FootFigure, figurePalette, footKit, lookKit, type FootKit } from '../../src/art/foot';
import { Shield, makeFig, type ShieldKind } from '../../src/art/parts';
import { EliteStandard, Miniature } from '../../src/art/token';
import { lightChariotCrew } from '../../src/art/chariot';
import { lookMount } from '../../src/art/mounted';
import { deltaE } from './delta-e';

const svg = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(h('svg', null, el));
const MAX: Partial<Record<UnitType, number>> = { LI: 4, LB: 4, LS: 4, AX: 4, WA: 4, MI: 4, HI: 4, LC: 3, MC: 3, HWM: 2, BCH: 3 };
const FOOT: UnitType[] = ['LI', 'LB', 'LS', 'AX', 'WA', 'MI', 'HI'];
const BARBARIANS: ArmyLook[] = ['gallic', 'belgic', 'briton', 'germanic', 'slave'];
const EXP2: ArmyLook[] = [...BARBARIANS, 'marian'];
const blocksOf = (look: ArmyLook): Blocks => (look === 'marian' ? 'rom' : 'bar');
const token = (type: UnitType, look: ArmyLook, extra: { elite?: ArtEliteId; facing?: 'left' | 'right' } = {}) =>
  svg(h(UnitToken, { type, look, blockColor: blocksOf(look), blocks: MAX[type] ?? 4, maxBlocks: MAX[type] ?? 4, facing: extra.facing ?? 'right', elite: extra.elite }));

/** The foot figure of a look as drawn: the kit's, then the look's override for the type and figure (perhaps another kit's). */
function drawnKit(look: ArmyLook, type: UnitType, i: number): FootKit {
  const p = paletteFor(look, blocksOf(look));
  return lookKit(footKit(type, p.kit, i), p, i);
}

/** The base Romans' colours: the figures of the Expansion #2 looks are compared on them, so only their shapes differ. */
const NEUTRAL = paletteFor('roman', 'rom');
/** What a look draws once its paint is taken out: its kit's figures and the look's exceptions to them, in neutral colours. */
function shapesOf(look: ArmyLook, type: UnitType): string {
  const { kit, style } = paletteFor(look, blocksOf(look));
  const p: Palette = { ...NEUTRAL, kit, style: { ...NEUTRAL.style, foot: style.foot, mounted: style.mounted } };
  return [0, 1, 2, 3].map((i) => svg(h(Miniature, { type, p, i }))).join('');
}

describe('Expansion #2 kits', () => {
  it('Gauls, Belgae, Britons and the Slave army are Celtic, the Germans Germanic, the Marian legions late-Roman', () => {
    expect(EXP2.map((l) => [l, LOOKS[l].kit])).toEqual([
      ['gallic', 'celtic'], ['belgic', 'celtic'], ['briton', 'celtic'], ['germanic', 'germanic'], ['slave', 'celtic'], ['marian', 'lateRoman'],
    ]);
  });

  it('the Celtic warband: long shields and swords, bare chests and torcs, a noble in mail and a helmet, trousers', () => {
    const wa = [0, 1, 2, 3].map((i) => KITS.celtic.foot('WA', i));
    expect(wa.every((k) => k.weapon === 'sword' && k.shield === 'celtOval' && k.legs === 'trousers' && k.torc)).toBe(true);
    expect(wa.filter((k) => k.torso === 'bare').length).toBe(2);
    expect(wa.map((k) => k.helmet)).toEqual(['none', 'montefortino', 'none', 'horned']);
    expect(wa[1].torso).toBe('mail');
  });

  it('the Germans: Suebian knots, clubs and frameae, hide cloaks, board and hexagonal shields, no armour on the warband', () => {
    const wa = [0, 1, 2, 3].map((i) => KITS.germanic.foot('WA', i));
    expect(new Set(wa.map((k) => k.weapon))).toEqual(new Set(['club', 'spear']));
    expect(new Set(wa.map((k) => k.shield))).toEqual(new Set(['hex', 'board']));
    expect(wa.some((k) => k.hair === 'knot')).toBe(true);
    expect(wa.some((k) => k.pelt)).toBe(true);
    expect(wa.every((k) => k.torso !== 'mail' && k.helmet === 'none')).toBe(true);
  });

  it('the Marian legionaries: mail with shoulder doubling, Montefortino and Coolus helmets, the oval scutum and the pilum', () => {
    for (const type of ['MI', 'HI'] as const) {
      const k = [0, 1].map((i) => KITS.lateRoman.foot(type, i));
      expect(k.every((x) => x.torso === 'mail' && x.doubling && x.shield === 'legionOval' && x.weapon === 'pilum'), type).toBe(true);
      expect(k.map((x) => x.helmet), type).toEqual(['montefortino', 'coolus']);
    }
    // Germanic auxiliaries in Roman service (222) are Germanic warriors
    expect(KITS.lateRoman.foot('WA', 0)).toMatchObject({ ...KITS.germanic.foot('WA', 0), tribal: true });
    expect(KITS.lateRoman.warMachine).toBe('ballista');
  });
});

describe('Expansion #2 looks', () => {
  it('every Expansion #2 look draws every foot figure (i = 0..3) and its fielded types without NaN', () => {
    for (const look of EXP2) {
      const p = paletteFor(look, blocksOf(look));
      for (const type of FOOT) {
        for (let i = 0; i < 4; i++) {
          const out = svg(h(FootFigure, { kit: footKit(type, p.kit, i), p, i }));
          expect(out, `${look} ${type} ${i}`).not.toMatch(/NaN|undefined|Infinity/);
        }
      }
      for (const type of ['LC', 'MC'] as UnitType[]) expect(token(type, look), `${look} ${type}`).not.toMatch(/NaN|undefined/);
    }
  });

  it('the figures differ by shape, not just by paint: the three kits in every type, and the looks of a kit where they have exceptions', () => {
    // The fewest different figures (shapes only: helmets, shields, weapons, hair, dress) the six looks draw in each type. Looks
    // of one kit share a type's figures unless the look has an exception for it: the Belgae (hexagonal shields) and the
    // Britons (woad, no helmets) differ from the Gauls in LI, AX, WA and MI, the Britons also in LB and LS, and the Slaves
    // (four peoples) in LI, LS, AX, WA, MI and LC. HI and MC are fielded by the Marians only, so the other looks share them.
    const FEWEST: Partial<Record<UnitType, number>> = { LI: 6, LB: 4, LS: 5, AX: 6, WA: 6, MI: 6, HI: 3, LC: 4, MC: 3 };
    for (const [type, fewest] of Object.entries(FEWEST) as [UnitType, number][]) {
      const groups = new Map<string, ArmyLook[]>();
      for (const look of EXP2) {
        const shape = shapesOf(look, type);
        groups.set(shape, [...(groups.get(shape) ?? []), look]);
      }
      expect(groups.size, `${type}: ${[...groups.values()].map((g) => g.join('+')).join(' / ')}`).toBeGreaterThanOrEqual(fewest);
      // whatever the exceptions, a Gaul, a German and a Marian never share a figure
      expect(new Set((['gallic', 'germanic', 'marian'] as const).map((look) => shapesOf(look, type))).size, type).toBe(3);
    }
  });

  it('the paint tells the rest apart: every look draws its own token in every type', () => {
    for (const type of [...FOOT, 'LC', 'MC'] as UnitType[]) {
      expect(new Set(EXP2.map((look) => token(type, look))).size, type).toBe(EXP2.length);
    }
  });

  it('the Britons wear woad and fewer helmets than the Gauls; the Belgae carry hexagonal shields', () => {
    for (const type of ['LI', 'AX', 'WA'] as UnitType[]) {
      const brit = [0, 1, 2, 3].map((i) => drawnKit('briton', type, i));
      const gaul = [0, 1, 2, 3].map((i) => drawnKit('gallic', type, i));
      expect(brit.every((k) => k.woad), type).toBe(true);
      expect(brit.filter((k) => k.helmet !== 'none').length, type).toBeLessThanOrEqual(gaul.filter((k) => k.helmet !== 'none').length);
      expect([0, 1, 2, 3].map((i) => drawnKit('belgic', type, i).shield).every((s) => s === 'hex'), type).toBe(true);
    }
    expect(paletteFor('briton', 'bar').woad).toBeDefined();
    expect(token('WA', 'briton')).toContain(paletteFor('briton', 'bar').woad);
  });

  it('every Slave unit mixes a Thracian with his sica, a Gaul, a German and an Italian herdsman or gladiator', () => {
    const wa = [0, 1, 2, 3].map((i) => drawnKit('slave', 'WA', i));
    expect(wa[0]).toMatchObject({ helmet: 'thracian', weapon: 'sica', shield: 'pelta' });
    expect(wa[1]).toEqual(footKit('WA', 'celtic', 1));
    expect(wa[2]).toEqual(footKit('WA', 'germanic', 2));
    expect(wa[3]).toMatchObject({ helmet: 'gladiator' });
    for (const type of ['LI', 'LS', 'AX'] as UnitType[]) expect(drawnKit('slave', type, 3).helmet, type).toBe('petasos');
    // the Slaves' medium infantry fight with captured Roman arms
    expect(drawnKit('slave', 'MI', 0)).toMatchObject({ shield: 'legionOval', device: 'wingedBolt', helmet: 'montefortino' });
    // each of the four figures is painted (and haired) as his people
    const p = paletteFor('slave', 'bar');
    expect(new Set([0, 1, 2, 3].map((i) => figurePalette(p, i).tunic)).size).toBe(4);
  });

  it('the Celtic armies carry the carnyx, the Marian legions the eagle, the Germans the bronze bull, the Slaves the cap of liberty', () => {
    expect(['gallic', 'belgic', 'briton'].map((l) => LOOKS[l as ArmyLook].style.standard)).toEqual(['carnyx', 'carnyx', 'carnyx']);
    expect(LOOKS.marian.style.standard).toBe('aquila');
    expect(LOOKS.germanic.style).toMatchObject({ device: 'bull', finial: 'bull' });
    expect(LOOKS.slave.style).toMatchObject({ device: 'pileus', finial: 'pileus' });
    for (const look of EXP2) {
      const alone = svg(h(LeaderToken, { look, blockColor: blocksOf(look), facing: 'right', attached: false, name: 'Chief', showName: true }));
      expect(alone, look).not.toMatch(/NaN|undefined/);
    }
  });

  it('the Barbarian armies read apart from the Romans they fight by their tunics, shields and painted shields (dE >= 20)', () => {
    type Swatch = 'tunic' | 'shield' | 'paint';
    const swatches = (look: ArmyLook, elites: ArtEliteId[] = []): Record<Swatch, string[]> => {
      const p = paletteFor(look, blocksOf(look));
      const all: Palette[] = [0, 1, 2, 3].flatMap((i) => [figurePalette(p, i), ...elites.map((e) => figurePalette(p, i, e))]);
      return { tunic: all.map((q) => q.tunic), shield: all.map((q) => q.shield), paint: all.map((q) => q.paint) };
    };
    // 201-205 against the base-game Romans, 206-223 against the Marian legions (with the Tenth Legion)
    const battles: [ArmyLook, ArmyLook, ArtEliteId[]][] = [
      ['gallic', 'roman', []], ['germanic', 'roman', []], ['slave', 'roman', []],
      ['germanic', 'marian', ['tenthLegion']], ['slave', 'marian', ['tenthLegion']], ['belgic', 'marian', ['tenthLegion']],
      ['gallic', 'marian', ['tenthLegion']], ['briton', 'marian', ['tenthLegion']],
    ];
    const close: string[] = [];
    for (const [a, b, elites] of battles) {
      const sa = swatches(a);
      const sb = swatches(b, elites);
      for (const k of ['tunic', 'shield', 'paint'] as Swatch[]) {
        for (const x of sa[k]) for (const y of sb[k]) if (deltaE(x, y) < 20) close.push(`${a} ${k} ${x} vs ${b} ${y}: dE ${deltaE(x, y).toFixed(1)}`);
      }
    }
    expect(close).toEqual([]);
  });

  it('every Expansion #2 shield draws every device, painted or not, without NaN', () => {
    const p = paletteFor('gallic', 'bar');
    const kinds: ShieldKind[] = ['celtOval', 'hex', 'board', 'legionOval'];
    const devices: EmblemKind[] = ['scroll', 'boar', 'crescents', 'horse', 'halves', 'ring', 'bands', 'wingedBolt', 'pileus', 'triskeles', 'wheel', 'bull', 'rome', 'none'];
    for (const kind of kinds) {
      for (const device of devices) {
        const out = svg(h(Shield, { kind, f: makeFig(p, 1), device }));
        expect(out.length, `${kind} ${device}`).toBeGreaterThan(300);
        expect(out, `${kind} ${device}`).not.toMatch(/NaN|undefined/);
      }
    }
  });
});

describe('Barbarian cavalry', () => {
  const mounts = (look: ArmyLook, type: UnitType) => [0, 1, 2].map((i) => lookMount(type, paletteFor(look, blocksOf(look)), i));

  it('Celtic nobles (MC) ride in mail and helmets with torcs and long swords, on the four-horned saddle with harness discs', () => {
    for (const look of ['gallic', 'belgic'] as ArmyLook[]) {
      const mc = mounts(look, 'MC');
      expect(mc.every((m) => m.rider.torso === 'mail' && m.rider.helmet !== 'none' && m.rider.torc && m.rider.sword), look).toBe(true);
      expect(mc.every((m) => m.cloth === 'horned' && m.phalerae && ['hex', 'celtOval'].includes(m.rider.shield)), look).toBe(true);
      expect(new Set(mc.map((m) => m.rider.helmet)).size, look).toBe(3);
    }
    // the Belgae carry hexagonal shields
    expect(mounts('belgic', 'MC').every((m) => m.rider.shield === 'hex')).toBe(true);
    // the light horse: unarmoured, javelins, round or long shields, on a cloth or bareback
    const lc = mounts('gallic', 'LC');
    expect(lc.every((m) => m.rider.weapon === 'javelin' && m.rider.helmet === 'none' && m.rider.torso !== 'mail')).toBe(true);
    expect(new Set(lc.map((m) => m.cloth))).toEqual(new Set(['plain', 'none']));
    expect(new Set(lc.map((m) => m.rider.shield))).toEqual(new Set(['round', 'celtOval']));
  });

  it('the Germans ride bareback on ponies, unarmoured but for a chief, with frameae and board shields', () => {
    for (const type of ['LC', 'MC'] as UnitType[]) {
      const m = mounts('germanic', type);
      expect(m.every((x) => x.cloth === 'none' && x.pony && x.rider.helmet === 'none'), type).toBe(true);
      expect(m.some((x) => x.rider.shield === 'board'), type).toBe(true);
      expect(m.filter((x) => x.rider.torso === 'mail').length, type).toBeLessThanOrEqual(1);
    }
    // the pony is drawn smaller than the Gauls' horses under the same rider
    const horse = (look: ArmyLook) => token('LC', look).match(/<g transform="scale\(([\d.]+)\)"><path d="M-12.8 -14.6/)?.[1];
    expect(Number(horse('germanic'))).toBeLessThan(Number(horse('gallic')));
  });

  it("the Britons' horsemen wear woad, fewer helmets; the Slave army's MC mixes a Thracian, a Gaul and captured Roman arms", () => {
    const woad = paletteFor('briton', 'bar').woad ?? '';
    for (const type of ['LC', 'MC'] as UnitType[]) {
      expect(mounts('briton', type).every((m) => m.rider.woad), type).toBe(true);
      expect(token(type, 'briton'), type).toContain(woad);
    }
    expect(mounts('briton', 'MC').filter((m) => m.rider.helmet !== 'none').length)
      .toBeLessThan(mounts('gallic', 'MC').filter((m) => m.rider.helmet !== 'none').length);
    // a look's dress changes only the fields it names
    expect(mounts('briton', 'MC')[1].rider).toEqual({ ...mounts('gallic', 'MC')[1].rider, woad: true, helmet: 'none', crest: 'none', hair: 'wild' });
    const slave = mounts('slave', 'MC');
    expect(slave.map((m) => m.rider.helmet)).toEqual(['thracian', 'coolus', 'montefortino']);
    expect(slave[2].rider).toMatchObject({ shield: 'legionOval', device: 'wingedBolt' });
  });
});

describe('Marian cavalry', () => {
  const p = paletteFor('marian', 'rom');
  const mounts = (type: UnitType) => [0, 1, 2].map((i) => lookMount(type, p, i));

  it("is Caesar's allied horse, one people to a figure: Numidian, German and Spanish light horse", () => {
    const [numidian, german, spaniard] = mounts('LC');
    expect(numidian).toMatchObject({ cloth: 'none', bridle: false, pony: true, rider: { weapon: 'javelin', shield: 'round' } });
    expect(german).toMatchObject({ cloth: 'none', pony: true, rider: { hair: 'knot', shield: 'board' } });
    expect(spaniard).toMatchObject({ cloth: 'plain', rider: { helmet: 'cap', shield: 'round' } });
  });

  it('a Gallic noble, a German and a Roman officer in a Boeotian helmet on the medium horse', () => {
    const [gaul, german, roman] = mounts('MC');
    expect(gaul).toMatchObject({ cloth: 'horned', phalerae: true, rider: { torso: 'mail', shield: 'celtOval', moustache: true, sword: true } });
    expect(german).toMatchObject({ cloth: 'none', pony: true, rider: { hair: 'knot', shield: 'board' } });
    expect(roman).toMatchObject({ cloth: 'horned', phalerae: true, rider: { torso: 'mail', helmet: 'boeotian', shield: 'round' } });
  });

  it("differs from the base Roman look's cavalry in every figure, even in the same paint", () => {
    const roman = paletteFor('roman', 'rom');
    const marianShapes: Palette = { ...roman, kit: 'lateRoman', style: { ...roman.style, mounted: p.style.mounted } };
    for (const type of ['LC', 'MC'] as UnitType[]) {
      for (let i = 0; i < 3; i++) {
        expect(svg(h(Miniature, { type, p: marianShapes, i })), `${type} ${i}`).not.toBe(svg(h(Miniature, { type, p: roman, i })));
      }
    }
  });
});

describe('the Marian war machine', () => {
  it('is a stone-throwing ballista with a late-Roman crew, not the base Roman scorpio', () => {
    expect(KITS.lateRoman.warMachine).toBe('ballista');
    expect(KITS.roman.warMachine).toBe('scorpio');
    const marian = paletteFor('marian', 'rom');
    const roman = paletteFor('roman', 'rom');
    // the same engine in the same paint would be the scorpio; the Marian one is drawn apart
    const shapes = (p: Palette) => [0, 1].map((i) => svg(h(Miniature, { type: 'HWM', p, i }))).join('');
    expect(shapes({ ...roman, kit: 'lateRoman' })).not.toBe(shapes(roman));
    const hwm = token('HWM', 'marian');
    expect(hwm).not.toMatch(/NaN|undefined/);
    // stone shot: one loaded, three piled, one carried, on each of the two engines
    expect(hwm.split('fill="#b8ae98"').length - 1).toBe(10);
    // the crew wear the late-Roman crew helmets
    expect([0, 1].map((i) => KITS.lateRoman.crew(i).helmet)).toEqual(['montefortino', 'coolus']);
    expect(svg(h(UnitIcon, { type: 'HWM', look: 'marian', blockColor: 'rom', size: 64 }))).not.toMatch(/NaN/);
    expect(marian.kit).toBe('lateRoman');
  });
});

describe('Barbarian light chariots (BCH)', () => {
  const figure = (look: ArmyLook, type: UnitType, i: number) => svg(h(Miniature, { type, p: paletteFor(look, blocksOf(look)), i }));
  const inner = (markup: string) => markup.replace(/^<svg>|<\/svg>$/g, '');

  it('are their own figure, not the heavy chariot: the warrior with his javelin raised stands in a light car', () => {
    for (const look of [...EXP2, 'roman', 'carthaginian', 'macedonian', 'persian', 'scythian', 'indian'] as ArmyLook[]) {
      const p = paletteFor(look, blocksOf(look));
      for (let i = 0; i < 3; i++) {
        const bch = figure(look, 'BCH', i);
        expect(bch, `${look} ${i}`).not.toBe(figure(look, 'HCH', i));
        expect(bch, `${look} ${i}`).not.toMatch(/NaN|undefined|Infinity/);
        const { warrior } = lightChariotCrew(p, i);
        expect(warrior.weapon, `${look} ${i}`).toBe('javelin');
        // the warrior is drawn as that foot figure
        expect(bch, `${look} ${i}`).toContain(inner(svg(h(FootFigure, { kit: warrior, p, i }))));
      }
    }
  });

  it('the Celts: long shields, a noble in mail and a helmet; the Britons: woad on both men and no helmets', () => {
    const gaul = [0, 1, 2].map((i) => lightChariotCrew(paletteFor('gallic', 'bar'), i));
    expect(gaul.every((c) => c.warrior.shield === 'celtOval' && !c.warrior.woad && !c.driver.woad)).toBe(true);
    expect(gaul.map((c) => c.warrior.helmet)).toEqual(['none', 'montefortino', 'none']);
    expect(gaul[1].warrior.torso).toBe('mail');
    const brit = [0, 1, 2].map((i) => lightChariotCrew(paletteFor('briton', 'bar'), i));
    expect(brit.every((c) => c.warrior.woad && c.driver.woad && c.warrior.helmet === 'none' && c.driver.helmet === 'none')).toBe(true);
    expect(brit.filter((c) => c.warrior.torso === 'bare').length).toBeGreaterThan(gaul.filter((c) => c.warrior.torso === 'bare').length);
    const woad = paletteFor('briton', 'bar').woad ?? '';
    expect(figure('briton', 'BCH', 0)).toContain(woad);
    expect(figure('gallic', 'BCH', 0)).not.toContain(woad);
    // the Belgae, the Germans and the Slave army use the Celtic chariot (the Germanic kit mans it with its own men)
    for (const look of ['belgic', 'slave'] as ArmyLook[]) expect(lightChariotCrew(paletteFor(look, 'bar'), 1)).toEqual(gaul[1]);
    expect(lightChariotCrew(paletteFor('germanic', 'bar'), 1).warrior).toEqual(KITS.germanic.foot('LI', 1));
  });

  it('a unit shows one chariot per block (three at full strength), and its icon fits its box', () => {
    // the yoke over the ponies' withers, once per chariot (an outlined stroke: two paths)
    const yoke = 'd="M13.2 -14.8 Q15 -16.1 16.8 -15.1"';
    for (let blocks = 1; blocks <= 3; blocks++) {
      const out = svg(h(UnitToken, { type: 'BCH', look: 'gallic', blockColor: 'bar', blocks, maxBlocks: 3, facing: 'right' }));
      expect(out.split(yoke).length - 1, `${blocks} blocks`).toBe(2 * blocks);
    }
    expect(KITS.celtic.iconBox.BCH).toBeDefined();
    expect(svg(h(UnitIcon, { type: 'BCH', look: 'briton', blockColor: 'bar', size: 64 }))).not.toMatch(/NaN/);
  });
});

describe('the Tenth Legion', () => {
  it('has its own figures: crimson gold-rimmed scuta with the bull, white plumes, greaves', () => {
    const el = ELITE_FOOT.tenthLegion;
    expect(el?.emblems).toEqual(['bull']);
    expect(el?.foot).toMatchObject({ legs: 'greaves' });
    const p = paletteFor('marian', 'rom');
    const tenth = figurePalette(p, 0, 'tenthLegion');
    expect(tenth.style.emblems).toEqual(['bull']);
    expect(tenth.crest).toBe('#f4eee0');
    expect(figurePalette(p, 0)).toBe(p);
    expect(token('HI', 'marian', { elite: 'tenthLegion' })).not.toBe(token('HI', 'marian'));
  });

  it('its marker carries the eagle and the numeral X instead of the wreath', () => {
    const p = paletteFor('marian', 'rom');
    const marker = svg(h(EliteStandard, { p, elite: 'tenthLegion' }));
    expect(marker.match(/data-marker="tenth"/g)).toHaveLength(1);
    // the numeral X, in the side colour, on the gold plaque
    expect(marker).toContain(`<path d="M-0.8 -29.4 L2.4 -24.4 M2.4 -29.4 L-0.8 -24.4" stroke="${p.banner}"`);
    expect(marker).toContain(`fill="${p.gold}" stroke="#1d140e" stroke-width="0.6"`);
    // the eagle: a gold group of two mirrored wings, a body, a head and a beak, on top of the pole
    const eagle = marker.match(/<g transform="translate\(0 -38\.4\)" fill="([^"]+)"[^>]*>(.*?)<\/g>/);
    expect(eagle?.[1]).toBe(p.gold);
    const wings = [...(eagle?.[2] ?? '').matchAll(/<path d="M0 0 C[^"]*" transform="translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+) ([-\d.]+)\)"/g)];
    expect(wings.map((m) => m.slice(1).map(Number))).toEqual([[-0.3, -1.6, 1, 1], [0.3, -1.6, -1, 1]]);
    expect(eagle?.[2].match(/<ellipse /g)).toHaveLength(1);
    expect(eagle?.[2].match(/<circle /g)).toHaveLength(1);
    // no laurel wreath (its eight leaves are ellipses rotated round the pole top) and no army device on the plaque
    expect(marker).not.toMatch(/rotate\(/);
    expect(marker).not.toContain(`fill="${p.banner}"`);
    // the other elites keep the wreath, and only the Tenth's marker is tagged
    const sacred = svg(h(EliteStandard, { p: paletteFor('carthaginian', 'car'), elite: 'carthSacredBand' }));
    expect(sacred.match(/rotate\(/g)).toHaveLength(8);
    expect(sacred).not.toContain('data-marker');
    // in the token it stands once, and not on a plain Marian HI
    expect(token('HI', 'marian', { elite: 'tenthLegion' }).match(/data-marker="tenth"/g)).toHaveLength(1);
    expect(token('HI', 'marian')).not.toContain('data-marker');
    expect(svg(h(UnitIcon, { type: 'HI', look: 'marian', blockColor: 'rom', size: 64, elite: 'tenthLegion' }))).not.toMatch(/NaN/);
  });
});

describe('named leaders', () => {
  const marian = { look: 'marian', blockColor: 'rom', facing: 'right' } as const;
  const slave = { look: 'slave', blockColor: 'bar', facing: 'right' } as const;

  it('are found by the names the scenarios give them, ignoring case, and nobody else is', () => {
    for (const n of ['Caesar', 'Julius Caesar', 'julius caesar', ' Caesar ', 'C. Julius Caesar']) expect(leaderLook(n)?.names[0], n).toBe('Caesar');
    expect(leaderLook('Spartacus')?.names[0]).toBe('Spartacus');
    for (const n of ['Lucius Caesar', 'Crixus', 'Marius', '', undefined]) expect(leaderLook(n), String(n)).toBeUndefined();
    expect(LEADER_LOOKS.map((l) => l.names[0])).toEqual(['Caesar', 'Spartacus']);
  });

  it('Caesar wears the laurel wreath and the scarlet cloak and rides a white horse; another Marian general does not', () => {
    const caesar = leaderLook('Caesar');
    expect(caesar?.rider).toMatchObject({ helmet: 'laurel' });
    expect(caesar?.bust).toMatchObject({ helmet: 'laurel' });
    for (const attached of [false, true]) {
      const c = svg(h(LeaderToken, { ...marian, attached, name: 'Caesar' }));
      const other = svg(h(LeaderToken, { ...marian, attached, name: 'Labienus' }));
      expect(c, `attached ${attached}`).not.toBe(other.replace('Labienus', 'Caesar'));
      expect(c).toContain(caesar?.colours?.cloak);
      expect(other).not.toContain(caesar?.colours?.cloak);
    }
    expect(svg(h(LeaderToken, { ...marian, attached: false, name: 'Caesar' }))).toContain(caesar?.horse?.coat);
  });

  it('Spartacus wears the Thracian helmet and raises the sica', () => {
    const sp = leaderLook('Spartacus');
    expect(sp?.rider).toMatchObject({ helmet: 'thracian', sidearm: 'sica' });
    expect(sp?.bust).toMatchObject({ helmet: 'thracian' });
    for (const attached of [false, true]) {
      const s = svg(h(LeaderToken, { ...slave, attached, name: 'Spartacus' }));
      expect(s).not.toBe(svg(h(LeaderToken, { ...slave, attached, name: 'Crixus' })).replace('Crixus', 'Spartacus'));
      expect(s).not.toMatch(/NaN|undefined/);
    }
  });
});
