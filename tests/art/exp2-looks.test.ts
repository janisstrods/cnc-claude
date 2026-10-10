// The Expansion #2 armies: the Celtic, Germanic and late-Roman kits, the Gallic, Belgic, British, Germanic, Slave and
// Marian looks, the Tenth Legion, and the named leaders Caesar and Spartacus.
import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ArmyLook, Blocks, UnitType } from '../../src/engine/types';
import { LEADER_LOOKS, LOOKS, leaderLook, paletteFor, type ArtEliteId, type EmblemKind, type Palette } from '../../src/art/palettes';
import { KITS } from '../../src/art/kits';
import { LeaderToken, UnitIcon, UnitToken } from '../../src/art';
import { ELITE_FOOT, FootFigure, figurePalette, footKit, type FootKit } from '../../src/art/foot';
import { Shield, makeFig, type ShieldKind } from '../../src/art/parts';
import { deltaE } from './delta-e';

const svg = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(h('svg', null, el));
const MAX: Partial<Record<UnitType, number>> = { LI: 4, LB: 4, LS: 4, AX: 4, WA: 4, MI: 4, HI: 4, LC: 3, MC: 3 };
const FOOT: UnitType[] = ['LI', 'LB', 'LS', 'AX', 'WA', 'MI', 'HI'];
const BARBARIANS: ArmyLook[] = ['gallic', 'belgic', 'briton', 'germanic', 'slave'];
const EXP2: ArmyLook[] = [...BARBARIANS, 'marian'];
const blocksOf = (look: ArmyLook): Blocks => (look === 'marian' ? 'rom' : 'bar');
const token = (type: UnitType, look: ArmyLook, extra: { elite?: ArtEliteId; facing?: 'left' | 'right' } = {}) =>
  svg(h(UnitToken, { type, look, blockColor: blocksOf(look), blocks: MAX[type] ?? 4, maxBlocks: MAX[type] ?? 4, facing: extra.facing ?? 'right', elite: extra.elite }));

/** The foot figure of a look as drawn: the kit's, then the look's override for the type and figure (perhaps another kit's). */
function drawnKit(look: ArmyLook, type: UnitType, i: number): FootKit {
  const p = paletteFor(look, blocksOf(look));
  const base = footKit(type, p.kit, i);
  const o = p.style.foot?.[type];
  const lo = Array.isArray(o) ? o[i % o.length] : o;
  if (!lo) return base;
  const { from, ...rest } = lo;
  return { ...(from ? footKit(type, from, i) : base), ...rest };
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
    expect(KITS.lateRoman.warMachine).toBe('scorpio');
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

  it('the six looks differ in every foot type and in their cavalry', () => {
    for (const type of [...FOOT, 'LC', 'MC'] as UnitType[]) {
      const drawn = new Set(EXP2.map((look) => token(type, look)));
      expect(drawn.size, type).toBe(EXP2.length);
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
    const plain = token('HI', 'marian', { elite: 'tenthLegion' });
    // the other elites' marker has the laurel leaves (ellipses rotated round the boss); the Tenth's has none
    expect(plain).not.toMatch(/rotate\(-20 /);
    const sacred = svg(h(UnitToken, { type: 'HI', look: 'carthaginian', blockColor: 'car', blocks: 4, maxBlocks: 4, facing: 'right', elite: 'carthSacredBand' }));
    expect(sacred).toMatch(/rotate\(-20 /);
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
