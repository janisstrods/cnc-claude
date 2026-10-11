// The Expansion #3 armies (the Roman Civil Wars): the Italic and Iberian kits, the Sullan, Pompeian and Caesarian legions,
// the Samnites, Sertorius' army, the Helvetii, the Numidians and the Pontic army, their warriors, war machines and
// elephants, and Pompey as a named leader. The battles are read from their scenario files (src/scenarios/data/3xx.json).
import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import type { ArmyLook, Blocks, UnitType } from '../../src/engine/types';
import { LEADER_LOOKS, LOOKS, leaderLook, paletteFor, type EmblemKind, type Palette } from '../../src/art/palettes';
import { KITS } from '../../src/art/kits';
import { LeaderToken, UnitIcon, UnitToken } from '../../src/art';
import { FootFigure, figurePalette, footKit, lookKit, type FootKit } from '../../src/art/foot';
import { Shield, makeFig, type ShieldKind } from '../../src/art/parts';
import { Miniature } from '../../src/art/token';
import { lookMount } from '../../src/art/mounted';
import { warMachineOf } from '../../src/art/machine';
import { deltaE } from './delta-e';
import { ALL_TYPES, MAX, svg } from './helpers';

const FOOT: UnitType[] = ['LI', 'LB', 'LS', 'AX', 'WA', 'MI', 'HI'];
const EXP3: ArmyLook[] = ['sullan', 'samnite', 'sertorian', 'pompeian', 'caesarian', 'helvetii', 'numidian', 'pontic'];

interface BattleSide { look: ArmyLook; blocks: Blocks; commander: string }
interface Battle {
  id: string;
  top: BattleSide;
  bottom: BattleSide;
  units: { side: 'top' | 'bottom'; type: UnitType; command?: string }[];
  reserves?: { side: 'top' | 'bottom'; type: UnitType }[];
  leaders: { side: 'top' | 'bottom'; name: string }[];
  commands?: { id: string; side: 'top' | 'bottom'; blocks?: Blocks }[];
}
const BATTLES = Object.values(import.meta.glob('../../src/scenarios/data/3*.json', { eager: true, import: 'default' }) as Record<string, Battle>)
  .sort((a, b) => a.id.localeCompare(b.id));

/** The block set each Expansion #3 look stands on most (grey for the Pompeians, red for the other Romans). */
const blocksOf = (look: ArmyLook): Blocks => ({ sullan: 'rom', caesarian: 'rom', helvetii: 'bar', pontic: 'eas' } as Partial<Record<ArmyLook, Blocks>>)[look] ?? 'gry';
const token = (type: UnitType, look: ArmyLook, blockColor: Blocks = blocksOf(look)) =>
  svg(h(UnitToken, { type, look, blockColor, blocks: MAX[type], maxBlocks: MAX[type], facing: 'right' }));
/** The foot figure of a look as drawn: the kit's, then the look's override for the type and figure (perhaps another kit's). */
const drawnKit = (look: ArmyLook, type: UnitType, i: number): FootKit => {
  const p = paletteFor(look, blocksOf(look));
  return lookKit(footKit(type, p.kit, i), p, i);
};
const four = <T,>(f: (i: number) => T) => [0, 1, 2, 3].map(f);

describe('Expansion #3 battles', () => {
  it('are the nineteen transcribed battles, every army drawn with an Expansion #3 look (or the Gauls and Germans of Expansion #2)', () => {
    expect(BATTLES.map((b) => b.id)).toEqual(Array.from({ length: 19 }, (_, k) => String(301 + k)));
    const looks = new Set(BATTLES.flatMap((b) => [b.top.look, b.bottom.look]));
    expect([...looks].sort()).toEqual([...EXP3, 'gallic', 'germanic'].sort());
    for (const b of BATTLES) for (const side of ['top', 'bottom'] as const) expect(() => paletteFor(b[side].look, b[side].blocks), `${b.id} ${side}`).not.toThrow();
  });

  it('in every battle the two armies differ in tunics, shields and painted shields by dE >= 20, figure variants included', () => {
    const swatches = (side: BattleSide) => {
      const p = paletteFor(side.look, side.blocks);
      const all = four((i) => figurePalette(p, i));
      return { tunic: all.map((q) => q.tunic), shield: all.map((q) => q.shield), paint: all.map((q) => q.paint) };
    };
    const close: string[] = [];
    for (const b of BATTLES) {
      const top = swatches(b.top);
      const bottom = swatches(b.bottom);
      for (const k of ['tunic', 'shield', 'paint'] as const) {
        for (const x of top[k]) for (const y of bottom[k]) if (deltaE(x, y) < 20) close.push(`${b.id} ${b.top.look} ${k} ${x} vs ${b.bottom.look} ${y}: dE ${deltaE(x, y).toFixed(1)}`);
      }
    }
    expect(close).toEqual([]);
  });

  it('every look draws every unit type its battles field, at every strength and both facings, and its leaders, without NaN', () => {
    for (const b of BATTLES) {
      for (const side of ['top', 'bottom'] as const) {
        const { look, blocks } = b[side];
        const types = new Set([...b.units, ...(b.reserves ?? [])].filter((u) => u.side === side).map((u) => u.type));
        for (const type of types) {
          for (let n = 1; n <= MAX[type]; n++) {
            for (const facing of ['left', 'right'] as const) {
              const out = svg(h(UnitToken, { type, look, blockColor: blocks, blocks: n, maxBlocks: MAX[type], facing }));
              expect(out, `${b.id} ${look} ${type} ${n} ${facing}`).not.toMatch(/NaN|undefined|Infinity/);
            }
          }
        }
        for (const l of b.leaders.filter((x) => x.side === side)) {
          for (const attached of [false, true]) {
            expect(svg(h(LeaderToken, { look, blockColor: blocks, facing: 'right', attached, name: l.name, showName: true })), `${b.id} ${l.name}`).not.toMatch(/NaN|undefined/);
          }
        }
      }
    }
  });

  it('every Expansion #3 look draws all sixteen types and their icons fit their boxes', () => {
    for (const look of EXP3) {
      for (const type of ALL_TYPES) {
        expect(token(type, look), `${look} ${type}`).not.toMatch(/NaN|undefined|Infinity/);
        const icon = svg(h(UnitIcon, { type, look, blockColor: blocksOf(look), size: 32 }));
        const s = Number(/scale\(([\d.]+)\) translate/.exec(icon)?.[1]);
        expect(s, `${look} ${type}`).toBeGreaterThan(0.4);
        expect(s, `${look} ${type}`).toBeLessThan(1.1);
      }
    }
  });
});

describe('the Roman parties', () => {
  const pal = (look: ArmyLook) => paletteFor(look, 'rom');

  it('are late-Roman legions: mail, the curved scutum and the pilum on the medium and heavy foot', () => {
    for (const look of ['sullan', 'pompeian', 'caesarian'] as ArmyLook[]) {
      expect(LOOKS[look].kit, look).toBe('lateRoman');
      expect(LOOKS[look].style.standard, look).toBe('aquila');
      for (const type of ['MI', 'HI'] as UnitType[]) {
        expect(four((i) => drawnKit(look, type, i)).every((k) => k.shield === 'legionOval' && k.weapon === 'pilum'), `${look} ${type}`).toBe(true);
      }
    }
  });

  it('Pompeians and Caesarians read apart on the same blocks: tunics, scuta, helmets, crests, devices and standards', () => {
    const pom = pal('pompeian');
    const cae = pal('caesarian');
    for (const k of ['tunic', 'shield', 'paint', 'metal', 'crest', 'cloak', 'shieldEmblem'] as const) {
      expect(deltaE(pom[k], cae[k]), k).toBeGreaterThanOrEqual(20);
    }
    // Pompey's lion on every Pompeian scutum, the wings and thunderbolts or the bull on the Caesarian ones
    expect(pom.style.emblems).toEqual(['lion']);
    expect(cae.style.emblems.includes('lion')).toBe(false);
    expect(pom.style.device).not.toBe(cae.style.device);
    // so every type the two armies field is drawn differently on the same block colour
    for (const type of ALL_TYPES) expect(token(type, 'pompeian', 'rom'), type).not.toBe(token(type, 'caesarian', 'rom'));
  });

  it("Sulla's legions are a third palette: red tunics behind white scuta with Sulla's trophy", () => {
    const sul = pal('sullan');
    for (const other of ['pompeian', 'caesarian'] as ArmyLook[]) {
      expect(deltaE(sul.shield, pal(other).shield), other).toBeGreaterThanOrEqual(20);
      expect(sul.style.emblems, other).not.toEqual(pal(other).style.emblems);
    }
    expect(deltaE(sul.tunic, pal('pompeian').tunic)).toBeGreaterThanOrEqual(20);
    expect(sul.style.emblems).toEqual(['trophy']);
  });

  it('their warriors: Caesar mixes Gauls with Germans, Sulla fields Spaniards, Pompey Galatians', () => {
    expect(four((i) => drawnKit('caesarian', 'WA', i))).toEqual([footKit('WA', 'celtic', 0), footKit('WA', 'lateRoman', 1), footKit('WA', 'celtic', 2), footKit('WA', 'lateRoman', 3)]);
    expect(four((i) => drawnKit('sullan', 'WA', i))).toEqual(four((i) => footKit('WA', 'iberian', i)));
    expect(four((i) => drawnKit('pompeian', 'WA', i))).toEqual(four((i) => footKit('WA', 'celtic', i)));
  });

  it("their horse: Pompey's light horse are Juba's Numidians, Caesar's Gauls, Germans and Spaniards (no Numidians)", () => {
    const pomLC = [0, 1, 2].map((i) => lookMount('LC', pal('pompeian'), i));
    expect(pomLC.every((m) => m.cloth === 'none' && m.bridle === false && m.rider.weapon === 'javelin')).toBe(true);
    const caeLC = [0, 1, 2].map((i) => lookMount('LC', pal('caesarian'), i));
    expect(caeLC.some((m) => m.bridle === false)).toBe(false);
    expect(caeLC[0].rider).toMatchObject({ shield: 'celtOval', torc: true });
    // Pompey's medium horse: a Roman noble and a Thracian among the kit's riders
    const pomMC = [0, 1, 2].map((i) => lookMount('MC', pal('pompeian'), i));
    expect(pomMC.map((m) => m.rider.helmet)).toEqual(['boeotian', 'thracian', lookMount('MC', pal('caesarian'), 2).rider.helmet]);
  });

  it("their engines: Caesar's stone-throwing ballista, Pompey's scorpio; Juba's African elephants with the Pompeians", () => {
    expect(warMachineOf(pal('caesarian'))).toBe('ballista');
    expect(warMachineOf(pal('pompeian'))).toBe('scorpio');
    expect(warMachineOf(pal('sullan'))).toBe('ballista');
    // the base Roman look keeps its kit's scorpio, and no base look names a machine of its own
    for (const look of ['roman', 'carthaginian', 'syracusan'] as ArmyLook[]) expect(LOOKS[look].style.warMachine, look).toBeUndefined();
    const shapes = (look: ArmyLook) => [0, 1].map((i) => svg(h(Miniature, { type: 'HWM', p: { ...pal('caesarian'), style: { ...pal('caesarian').style, warMachine: LOOKS[look].style.warMachine } }, i }))).join('');
    expect(shapes('pompeian')).not.toBe(shapes('caesarian'));
    expect(LOOKS.pompeian.style.elephant).toEqual({ drawing: 'base', rider: { torso: 'tunic', helmet: 'none' } });
    expect(token('EL', 'pompeian', 'gry')).not.toMatch(/NaN|undefined/);
  });
});

describe('the Samnites (Italic kit)', () => {
  it('feathered Samnite helmets, broad bronze belts, triple-disc cuirasses, the big oval shield and javelins', () => {
    expect(LOOKS.samnite.kit).toBe('italic');
    for (const type of FOOT) expect(four((i) => KITS.italic.foot(type, i)).every((k) => k.belt === 'bronze'), type).toBe(true);
    const ax = four((i) => KITS.italic.foot('AX', i));
    expect(ax.filter((k) => k.helmet === 'samnite').length).toBe(3);
    expect(ax.some((k) => k.torso === 'triple')).toBe(true);
    expect(ax.every((k) => k.shield === 'oval' && k.weapon === 'javelin')).toBe(true);
    for (const type of ['MI', 'HI'] as UnitType[]) {
      expect(four((i) => KITS.italic.foot(type, i)).every((k) => k.torso === 'triple' && k.helmet === 'samnite' && k.legs === 'greaves'), type).toBe(true);
    }
    // the MI carry the pilum (Marius legions for both armies, 301)
    expect(KITS.italic.foot('MI', 0).weapon).toBe('pilum');
    expect(KITS.italic.general.rider).toMatchObject({ torso: 'triple', helmet: 'samnite' });
  });

  it('gilded shields with the Oscan bull, tunics of many colours (Livy 9.40)', () => {
    const p = paletteFor('samnite', 'gry');
    expect(p.style.emblems).toEqual(['bull']);
    expect(new Set(four((i) => figurePalette(p, i).tunic)).size).toBe(4);
    const out = token('MI', 'samnite');
    expect(out).toContain(p.shield);
    expect(out).toContain(p.crest);
  });
});

describe("Sertorius' army (Iberian kit)", () => {
  it('caetrae, falcatas, sinew caps and crested helmets on the light and warrior foot; Roman legionaries for the MI and HI', () => {
    expect(LOOKS.sertorian.kit).toBe('iberian');
    const light = [...four((i) => KITS.iberian.foot('LI', i)), ...four((i) => KITS.iberian.foot('AX', i))];
    expect(light.every((k) => k.shield === 'caetra')).toBe(true);
    expect(light.some((k) => k.helmet === 'sinew')).toBe(true);
    expect(light.some((k) => k.falcata)).toBe(true);
    const wa = four((i) => KITS.iberian.foot('WA', i));
    expect(wa.every((k) => k.falcata && k.shield === 'longOval')).toBe(true);
    expect(new Set(wa.map((k) => k.helmet))).toEqual(new Set(['sinew', 'montefortino']));
    for (const type of ['MI', 'HI'] as UnitType[]) {
      expect(four((i) => KITS.iberian.foot(type, i)).every((k) => k.shield === 'legionOval' && k.weapon === 'pilum'), type).toBe(true);
    }
    expect(lookMount('LC', paletteFor('sertorian', 'gry'), 0).rider.shield).toBe('caetra');
  });

  it('white tunics with red borders, green scuta with the white fawn, painted caetrae', () => {
    const p = paletteFor('sertorian', 'gry');
    expect(deltaE(p.tunic, '#ffffff')).toBeLessThan(15);
    expect(deltaE(p.trim, '#b02020')).toBeLessThan(15);
    expect(p.style.emblems).toEqual(['fawn']);
    // the caetrae are painted per figure
    expect(new Set(four((i) => figurePalette(p, i).paint)).size).toBeGreaterThanOrEqual(3);
    // Perpenna's command (304) stands on the Greek blocks
    expect(svg(h(UnitToken, { type: 'MI', look: 'sertorian', blockColor: 'gry', edgeBlocks: 'grk', blocks: 4, maxBlocks: 4, facing: 'left' }))).not.toMatch(/NaN/);
  });
});

describe('the Helvetii, the Numidians and the Pontic army', () => {
  it('the Helvetii: the Celtic kit in their own colours (no red), with spearmen in the warband', () => {
    expect(LOOKS.helvetii.kit).toBe('celtic');
    const p = paletteFor('helvetii', 'bar');
    const red = paletteFor('caesarian', 'rom').tunic;
    for (let i = 0; i < 4; i++) {
      const q = figurePalette(p, i);
      for (const k of ['tunic', 'shield', 'paint'] as const) expect(deltaE(q[k], red), `${i} ${k}`).toBeGreaterThan(30);
      expect(q.tunic, `${i}`).not.toBe(figurePalette(paletteFor('gallic', 'bar'), i).tunic);
    }
    expect(four((i) => drawnKit('helvetii', 'WA', i)).filter((k) => k.weapon === 'spear').length).toBe(2);
  });

  it("the Numidians: bare-headed javelinmen and horsemen, nobles on leopard skins without bridles, Juba's legionaries", () => {
    const p = paletteFor('numidian', 'gry');
    expect(LOOKS.numidian.kit).toBe('punic');
    expect(four((i) => drawnKit('numidian', 'AX', i)).every((k) => k.helmet === 'none' && k.shield === 'round' && k.weapon === 'javelin')).toBe(true);
    expect(four((i) => drawnKit('numidian', 'WA', i)).every((k) => !k.tribal && !k.torc && k.helmet === 'none')).toBe(true);
    for (const type of ['MI', 'HI'] as UnitType[]) {
      expect(four((i) => drawnKit('numidian', type, i)).every((k) => k.shield === 'legionOval' && k.weapon === 'pilum' && k.beard), type).toBe(true);
    }
    const mc = [0, 1, 2].map((i) => lookMount('MC', p, i));
    expect(mc.every((m) => m.cloth === 'leopard' && m.bridle === false && m.rider.helmet === 'none')).toBe(true);
    // the light horse stay the Punic kit's bareback Numidians (base drawing), the Carthaginian cavalry is untouched
    expect(LOOKS.numidian.style.mounted?.LC).toBeUndefined();
    expect(svg(h(Miniature, { type: 'MC', p, i: 0 }))).not.toBe(svg(h(Miniature, { type: 'MC', p: { ...p, style: { ...p.style, mounted: undefined } }, i: 0 })));
    expect(lookMount('LC', p, 0)).toMatchObject({ cloth: 'none', bridle: false });
  });

  it('the Pontic army: the Macedonian phalanx under the star and crescent, eastern light troops, scythed chariots', () => {
    const p = paletteFor('pontic', 'eas');
    expect(LOOKS.pontic.kit).toBe('macedonian');
    expect(p.style).toMatchObject({ device: 'starCrescent', finial: 'starCrescent', emblems: ['starCrescent'] });
    expect(KITS.macedonian.chariot.drawing).toBe('scythed');
    expect(four((i) => drawnKit('pontic', 'LI', i)).every((k) => k.helmet === 'tiara' && k.legs === 'trousers')).toBe(true);
    expect(lookMount('HC', p, 0)).toMatchObject({ barding: true, rider: { torso: 'scale', legs: 'trousers' } });
    expect(new Set(four((i) => figurePalette(p, i).tunic)).size).toBe(4);
    expect(token('HCH', 'pontic')).not.toMatch(/NaN|undefined/);
  });
});

describe('new shapes', () => {
  it('every shield draws the new devices, and the caetra every device, without NaN', () => {
    const p = paletteFor('sertorian', 'gry');
    const kinds: ShieldKind[] = ['caetra', 'legionOval', 'oval', 'aspis', 'phalanx', 'celtOval', 'hex', 'board', 'round', 'pelta'];
    const devices: EmblemKind[] = ['fawn', 'lion', 'trophy', 'starCrescent', 'bull', 'wingedBolt', 'none'];
    for (const kind of kinds) {
      for (const device of devices) {
        const out = svg(h(Shield, { kind, f: makeFig(p, 1), device }));
        expect(out.length, `${kind} ${device}`).toBeGreaterThan(200);
        expect(out, `${kind} ${device}`).not.toMatch(/NaN|undefined/);
      }
    }
    // a device above the boss of the scutum is its own figure, not the thunderbolts
    const scutum = (device: EmblemKind) => svg(h(Shield, { kind: 'legionOval', f: makeFig(p, 1), device }));
    expect(new Set((['fawn', 'lion', 'trophy', 'starCrescent', 'wingedBolt'] as EmblemKind[]).map(scutum)).size).toBe(5);
  });

  it('the Samnite helmet, the sinew cap, the triple-disc cuirass, the bronze belt and the caetra change the figure', () => {
    const p = paletteFor('roman', 'rom');
    const base: FootKit = { torso: 'tunic', skirt: true, legs: 'bare', helmet: 'attic', crest: 'none', hair: 'short', shield: 'round', weapon: 'javelin' };
    const fig = (k: Partial<FootKit>) => svg(h(FootFigure, { kit: { ...base, ...k }, p, i: 1 }));
    const plain = fig({});
    for (const k of [{ helmet: 'samnite' }, { helmet: 'sinew' }, { torso: 'triple' }, { belt: 'bronze' }, { shield: 'caetra' }] as Partial<FootKit>[]) {
      const out = fig(k);
      expect(out, JSON.stringify(k)).not.toBe(plain);
      expect(out, JSON.stringify(k)).not.toMatch(/NaN|undefined/);
    }
    // the Samnite feathers in the crest colour, the crest added with `horsehair`
    expect(fig({ helmet: 'samnite', crest: 'horsehair' })).not.toBe(fig({ helmet: 'samnite', crest: 'plume2' }));
  });
});

describe('Pompey', () => {
  const pom = { look: 'pompeian', blockColor: 'gry', facing: 'right' } as const;

  it('is found by the names the battles give him; his son Gnaeus Pompeius (319) is not', () => {
    for (const n of ['Pompey', 'pompey', 'Pompey the Great', 'Gnaeus Pompeius Magnus']) expect(leaderLook(n)?.names[0], n).toBe('Pompey');
    for (const n of ['Gnaeus Pompeius', 'Gnaeus Pompey', 'Sextus Pompeius']) expect(leaderLook(n), n).toBeUndefined();
    expect(LEADER_LOOKS.map((l) => l.names[0])).toEqual(['Caesar', 'Spartacus', 'Pompey']);
    // the battles name him so: Pompey the Great at Lauron, Valentia, Sucro, Dyrrhachium and Pharsalus; his son at Munda
    const naming = (pred: (name: string) => boolean) => BATTLES.filter((b) => b.leaders.some((l) => pred(l.name))).map((b) => b.id);
    expect(naming((n) => leaderLook(n)?.names[0] === 'Pompey')).toEqual(['303', '304', '305', '314', '315']);
    expect(naming((n) => n === 'Gnaeus Pompeius')).toEqual(['319']);
    // the exact list: of all the leaders of the 19 battles, only Caesar and Pompey have a look of their own
    const looked = new Set(BATTLES.flatMap((b) => b.leaders.map((l) => l.name)).filter((n) => leaderLook(n)));
    expect([...looked].sort()).toEqual(['Julius Caesar', 'Pompey']);
  });

  it('rides bare-headed with his upswept forelock and a purple cloak, on a dark horse; another Pompeian general does not', () => {
    const p = leaderLook('Pompey');
    expect(p?.rider).toMatchObject({ helmet: 'none', hair: 'anastole' });
    expect(p?.bust).toMatchObject({ helmet: 'none', hair: 'anastole' });
    for (const attached of [false, true]) {
      const me = svg(h(LeaderToken, { ...pom, attached, name: 'Pompey' }));
      const other = svg(h(LeaderToken, { ...pom, attached, name: 'Afranius' }));
      expect(me).not.toBe(other.replace('Afranius', 'Pompey'));
      expect(me).toContain(p?.colours?.cloak);
      expect(other).not.toContain(p?.colours?.cloak);
      expect(me).not.toMatch(/NaN|undefined/);
    }
    expect(svg(h(LeaderToken, { ...pom, attached: false, name: 'Pompey' }))).toContain(p?.horse?.coat);
  });
});

describe('Expansion #3 looks change nothing of the older looks', () => {
  it('the base and older looks keep their own styles (no iconBox, war machine or base-cavalry override was added to them)', () => {
    const older = (Object.keys(LOOKS) as ArmyLook[]).filter((l) => !EXP3.includes(l));
    for (const look of older) {
      const s = LOOKS[look].style;
      expect(s.iconBox, look).toBeUndefined();
      expect(s.warMachine, look).toBeUndefined();
    }
    // a look of a base-drawn kit without a mounted override keeps the base cavalry figure
    const carth = paletteFor('carthaginian', 'car');
    const p: Palette = { ...paletteFor('numidian', 'gry'), style: { ...carth.style } };
    expect(svg(h(Miniature, { type: 'MC', p, i: 1 }))).toBe(svg(h(Miniature, { type: 'MC', p: { ...p, style: { ...p.style, mounted: undefined } }, i: 1 })));
  });
});
