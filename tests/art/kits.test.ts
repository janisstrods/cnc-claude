// The kit table: every figure kit's choices (foot, cavalry, horse archers, chariots, elephants, crews, war machine,
// shields, general, portrait and icon extents) are data in KITS (src/art/kits.ts), and a look's exceptions are data in
// its LookStyle, so the drawing code never tests kit or look names. A new kit is one KIT_DEFS entry plus any new shapes.
import { describe, expect, it } from 'vitest';
import type { ArmyLook } from '../../src/engine/types';
import { KITS, KIT_DEFS } from '../../src/art/kits';
import { LOOKS, lookDef, type Kit } from '../../src/art/palettes';

const SOURCES = import.meta.glob('../../src/art/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** Where kit and look names may appear as data: the kit table and the looks. */
const DATA_FILES = ['kits.ts', 'palettes.ts'];

const NAMES = [...new Set([...Object.keys(KITS), ...Object.keys(LOOKS)])];
const Q = '[\'"`]';
/** A comparison, switch case, membership test or table lookup that decides by a kit or look name. */
const BY_NAME: { what: string; re: RegExp }[] = [
  // `kit === 'roman'`, `p.look != "x"`, `kit !== other` (any quote style, == or ===)
  { what: 'compares a kit or look', re: /\b(?:kit|look)\s*[!=]==?/ },
  // `'roman' === p.kit`, `x == look`
  { what: 'compares a kit or look', re: /[!=]==?\s*(?:[\w$]+(?:\?\.|\.))*(?:kit|look)\b(?![.\w$([])/ },
  // `case 'celtic':`
  { what: 'switches on a kit or look name', re: new RegExp(`\\bcase\\s*${Q}(?:${NAMES.join('|')})${Q}`) },
  // `['a', 'b'].includes(p.kit)`, `set.has(look)`, `list.indexOf(kit)`
  { what: 'tests a kit or look for membership', re: /\.(?:includes|has|indexOf)\(\s*(?:[\w$]+(?:\?\.|\.))*(?:kit|look)\s*\)/ },
  // `KIT_BOX[p.kit]` (a per-kit table outside the kit table); `KITS[p.kit]` is the table itself
  { what: 'looks a kit or look up in its own table', re: /\b(?!KITS\b)[\w$]+\s*(?:\?\.)?\[\s*(?:[\w$]+(?:\?\.|\.))*(?:kit|look)\s*\]/ },
];

function hitsIn(file: string, src: string): string[] {
  const out: string[] = [];
  src.split('\n').forEach((line, n) => {
    if (/^\s*(?:\/\/|\*|\/\*)/.test(line)) return; // comments may name kits
    for (const { what, re } of BY_NAME) if (re.test(line)) out.push(`${file}:${n + 1} ${what}: ${line.trim()}`);
  });
  return out;
}

describe('the kit table', () => {
  it('the guard catches every way of deciding by a kit or look name, and passes the drawing code that reads the table', () => {
    const bad = [
      "if (p.kit === 'roman') {", 'if (kit == "punic") {', 'const x = look !== `marian`;', "if ('celtic' === p.kit)", 'if (other == look) {',
      "case 'punic':", 'case "slave": return 1;', "if (['gallic', 'belgic'].includes(p.look))", 'if (SET.has(kit))',
      'const box = KIT_BOX[p.kit]?.[type];', 'const s = STYLE?.[look];',
    ];
    for (const line of bad) expect(hitsIn('x.tsx', line), line).toHaveLength(1);
    const good = [
      'const def = KITS[p.kit].chariot;', "if (kit.shield === 'round') {", "kit.torso === 'leather' ? p.tunic : p.iron", 'const k = lookKit(kit, p, i);',
      "case 'eagle':", 'const o = p.style.foot?.[kit.unit];', '// the Roman kit (kit === roman) keeps its drawing', "const sleeve = kit.longSleeve;",
    ];
    for (const line of good) expect(hitsIn('x.tsx', line), line).toEqual([]);
  });

  it('the art code decides nothing by a kit or look name outside the kit table and the looks', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(10);
    const hits = Object.entries(SOURCES)
      .filter(([file]) => !DATA_FILES.some((d) => file.endsWith(`/${d}`)))
      .flatMap(([file, src]) => hitsIn(file.replace(/^.*\/src\//, 'src/'), src));
    expect(hits).toEqual([]);
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

  it('the base and Expansion #1 kits choose everything themselves (their drawings do not depend on the fallbacks)', () => {
    const OLD: Kit[] = ['roman', 'punic', 'greek', 'macedonian', 'persian', 'scythian', 'indian'];
    for (const kit of OLD) {
      const def = KIT_DEFS[kit];
      for (const field of ['horseArcher', 'chariot', 'elephant', 'crew', 'crewBow', 'warMachine', 'ovalShieldBoss', 'wickerPelta'] as const) {
        expect(def[field], `${kit} ${field}`).toBeDefined();
        expect(KITS[kit][field], `${kit} ${field}`).toBe(def[field]);
      }
    }
  });

  it('a kit that leaves choices out gets fallbacks from its own figures', () => {
    const lean = Object.entries(KIT_DEFS).filter(([, d]) => !d.crew || !d.chariot || !d.elephant || !d.horseArcher || !d.lightChariot) as [Kit, (typeof KIT_DEFS)[Kit]][];
    for (const [kit, def] of lean) {
      const full = KITS[kit];
      if (!def.crew) {
        // crews dressed as the kit's medium infantry
        const mi = def.foot('MI', 1);
        expect(full.crew(1), kit).toMatchObject({ torso: mi.torso, helmet: mi.helmet, crest: mi.crest });
      }
      if (!def.chariot) expect(full.chariot, kit).toMatchObject({ drawing: 'base', warrior: { helmet: full.crew(0).helmet } });
      if (!def.lightChariot) {
        // the light chariot (BCH) manned by the kit's light infantryman and a crewman
        expect(full.lightChariot.warrior(1), kit).toEqual(def.foot('LI', 1));
        expect(full.lightChariot.driver(0), kit).toEqual(full.crew(1));
      }
      if (!def.elephant) expect(full.elephant, kit).toMatchObject({ drawing: 'base', rider: { torso: full.crew(0).torso } });
      if (!def.horseArcher) expect(full.horseArcher.rider(0), kit).toMatchObject({ weapon: 'bow', shield: 'none' });
      expect(full.crewBow, kit).toBe(def.crewBow ?? 'self');
      expect(full.warMachine, kit).toBe(def.warMachine ?? 'oxybeles');
      expect(full.iconBox, kit).toEqual(def.iconBox ?? {});
    }
  });

  it("a look's exceptions to its kit are data in its style: the Seleucid and Ptolemaic elephants, cataphracts, chariot driver", () => {
    expect(LOOKS.seleucid.style.elephant).toMatchObject({ drawing: 'loaded', frontlet: true, crewKit: 'persian' });
    expect(LOOKS.ptolemaic.style.elephant).toMatchObject({ drawing: 'loaded', body: 'forest' });
    expect(LOOKS.seleucid.style.mounted?.HC).toMatchObject({ cataphract: true });
    expect(LOOKS.seleucid.style.chariotDriver).toEqual({ longSleeve: true });
  });
});
