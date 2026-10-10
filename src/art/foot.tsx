// Foot soldier miniatures (LI, LB, LS, AX, WA, MI, HI) and war-machine crews. Drawn facing right, feet at (0,0), ~30 units tall.
import type { EliteId, UnitType } from '../engine/types';
import { darken, lighten } from './color';
import { TRIBAL_HAIR, TRIBAL_SKIN, type Kit, type LookPalette, type Palette } from './palettes';
import {
  Arm, Body, Head, Hi, Line2, LegsEl, OL, Paint, Shape, Shield, Spear, makeFig,
  type Crest, type Fig, type Hair, type Helmet, type Legs, type ShieldKind, type Torso,
} from './parts';

/**
 * `sarissa`: the Macedonian pike (rear ranks upright, front ranks lowered); `longbow`: the Indian bamboo bow resting on
 * the ground; `axe`: Scythian / Persian sagaris; `greatsword`: Indian broadsword; `guardSpear`: a spear held upright in
 * front with both hands (the Immortals).
 */
export type FootWeapon =
  | 'spear' | 'longSpear' | 'pilum' | 'javelin' | 'sword' | 'bow' | 'sling'
  | 'sarissa' | 'longbow' | 'axe' | 'greatsword' | 'guardSpear';

export interface FootKit {
  /** The unit type the kit was made for (looks and elites override per type). */
  unit?: UnitType;
  torso: Torso;
  skirt: boolean;
  pteruges?: boolean;
  legs: Legs;
  helmet: Helmet;
  crest: Crest;
  hair: Hair;
  beard?: boolean;
  moustache?: boolean;
  torc?: boolean;
  shield: ShieldKind;
  shieldScale?: number;
  /** Vertical shield offset (long tribal shields are carried lower so the face shows). */
  shieldDy?: number;
  /** Painted (light-troop) shield colours. */
  painted?: boolean;
  weapon: FootWeapon;
  /** Extra weapons carried in the shield hand. */
  spare?: 'javelins' | 'spear';
  sleeve?: boolean;
  tribal?: boolean;
  falcata?: boolean;
  /** Sleeves to the wrist (Persian, Scythian, Median dress). */
  longSleeve?: boolean;
  /** Carried on the back or hip: a quiver, a Scythian gorytos (bow-and-arrow case), or a gorytos with the bow in it. */
  back?: 'quiver' | 'gorytos' | 'bowcase';
  /** A bow slung over the shoulder (the Immortals). */
  bowSlung?: boolean;
  /** Gold pomegranate on the spear butt (Persian royal guards). */
  butt?: 'pomegranate';
  /** Cloak hanging down the back (Spartans). */
  cloak?: boolean;
  /** Bow shape for `bow`: the plain self bow, or the short double-curved Scythian bow. */
  bow?: 'self' | 'scythian';
}

/** A look's (or an elite's) override of a kit's foot figure. */
export type FootLook = Partial<FootKit>;

/** The kit's figure for a foot unit type. The look's and the elite's overrides are applied by `FootFigure`. */
export function footKit(type: UnitType, kit: Kit, i: number): FootKit {
  if (kit === 'macedonian') return { unit: type, ...macedonianKit(type, i) };
  if (kit === 'persian') return { unit: type, ...persianKit(type, i) };
  if (kit === 'scythian') return { unit: type, ...scythianKit(type, i) };
  if (kit === 'indian') return { unit: type, ...indianKit(type, i) };
  return { unit: type, ...classicKit(type, kit, i) };
}

function celticWarrior(i: number): FootKit {
  return {
    torso: 'bare', skirt: false, legs: 'trousers', helmet: 'none', crest: 'none', hair: i % 2 ? 'wild' : 'long',
    shield: 'longOval', shieldScale: 0.94, shieldDy: 2.4, weapon: 'sword', tribal: true, moustache: true, torc: true,
  };
}

/** The base game's kits: Roman, Punic and Greek. */
function classicKit(type: UnitType, kit: Kit, i: number): FootKit {
  const greek = kit === 'greek';
  const punic = kit === 'punic';
  switch (type) {
    case 'LI':
      return {
        torso: 'tunic', skirt: true, legs: 'bare', helmet: 'none', crest: 'none',
        hair: i % 2 ? 'long' : 'short', shield: 'round', weapon: 'javelin', spare: 'javelins', sleeve: true, beard: punic && i % 2 === 1,
      };
    case 'LB':
      return {
        torso: 'tunic', skirt: true, legs: 'bare', helmet: punic ? 'cap' : 'none', crest: 'none', hair: 'short',
        shield: 'none', weapon: 'bow', sleeve: true, beard: greek && i % 2 === 0,
      };
    case 'LS':
      return {
        torso: 'tunic', skirt: true, legs: 'bare', helmet: 'none', crest: 'none', hair: i % 2 ? 'long' : 'short',
        shield: 'none', weapon: 'sling', sleeve: true, beard: i % 3 === 1,
      };
    case 'AX':
      return {
        torso: 'leather', skirt: true, legs: 'bare', helmet: greek ? 'pilos' : punic ? 'conical' : 'montefortino',
        crest: 'knob', hair: 'short', shield: 'oval', shieldScale: 0.84, painted: true, weapon: 'javelin', spare: 'spear', sleeve: true,
      };
    case 'WA': {
      const iberian = punic && i % 2 === 1;
      if (iberian) {
        return {
          torso: 'tunic', skirt: true, legs: 'bare', helmet: 'cap', crest: 'none', hair: 'short', shield: 'longOval', shieldScale: 0.94, shieldDy: 2.4,
          weapon: 'sword', falcata: true, tribal: true, sleeve: true, moustache: true,
        };
      }
      return celticWarrior(i);
    }
    case 'MI':
      return {
        torso: 'tunic', skirt: true, legs: greek ? 'greaves' : 'bare', helmet: greek ? 'pilos' : punic ? 'attic' : 'montefortino',
        crest: 'knob', hair: 'short', shield: greek ? 'aspis' : 'oval', shieldScale: greek ? 0.92 : 1, weapon: 'spear', sleeve: true,
      };
    case 'HI':
    default:
      if (greek) {
        return {
          torso: 'linen', skirt: true, pteruges: true, legs: 'greaves', helmet: 'corinthian', crest: 'tall', hair: 'short',
          shield: 'aspis', weapon: 'longSpear',
        };
      }
      if (punic) {
        return {
          torso: 'linen', skirt: true, pteruges: true, legs: 'greaves', helmet: 'attic', crest: 'horsehair', hair: 'short',
          shield: 'aspis', weapon: 'longSpear', beard: i % 2 === 0,
        };
      }
      return {
        torso: 'mail', skirt: true, legs: 'bare', helmet: 'montefortino', crest: 'plumes', hair: 'short', shield: 'scutum',
        weapon: 'pilum', sleeve: false,
      };
  }
}

/** Macedon and the Successors: kausia-hatted skirmishers, Cretan archers, Thracian peltasts, hypaspists, the phalanx. */
function macedonianKit(type: UnitType, i: number): FootKit {
  switch (type) {
    case 'LI':
      return {
        torso: 'tunic', skirt: true, legs: 'bare', helmet: i % 2 ? 'kausia' : 'none', crest: 'none', hair: 'short',
        shield: 'round', weapon: 'javelin', spare: 'javelins', sleeve: true, beard: i % 2 === 0,
      };
    case 'LB':
      return {
        torso: 'tunic', skirt: true, legs: 'bare', helmet: i % 2 ? 'none' : 'petasos', crest: 'none', hair: 'short',
        shield: 'none', weapon: 'bow', sleeve: true, beard: i % 2 === 1,
      };
    case 'LS':
      return {
        torso: 'tunic', skirt: true, legs: 'bare', helmet: i % 2 ? 'petasos' : 'none', crest: 'none', hair: 'short',
        shield: 'none', weapon: 'sling', sleeve: true, beard: i % 3 === 1,
      };
    case 'AX':
      return {
        torso: 'tunic', skirt: true, legs: 'boots', helmet: 'thracian', crest: 'knob', hair: 'short',
        shield: 'pelta', weapon: 'javelin', spare: 'spear', sleeve: true,
      };
    case 'WA':
      return celticWarrior(i);
    case 'MI':
      return {
        torso: 'linen', skirt: true, legs: 'greaves', helmet: 'phrygian', crest: 'horsehair', hair: 'short',
        shield: 'aspis', shieldScale: 0.92, weapon: 'spear', sleeve: true,
      };
    case 'HI':
    default:
      return {
        torso: 'linen', skirt: true, pteruges: true, legs: 'greaves', helmet: 'phrygian', crest: i % 2 ? 'plume2' : 'horsehair', hair: 'short',
        shield: 'phalanx', weapon: 'sarissa',
      };
  }
}

/** Achaemenid Persia: hoods, long sleeves and trousers; wicker shields; bows everywhere. */
function persianKit(type: UnitType, i: number): FootKit {
  const dress = { torso: 'tunic' as const, skirt: true, legs: 'trousers' as const, helmet: 'tiara' as const, crest: 'none' as const, hair: 'short' as const, sleeve: true, longSleeve: true };
  switch (type) {
    case 'LI':
      return { ...dress, shield: 'round', weapon: 'javelin', spare: 'javelins', beard: i % 2 === 0 };
    case 'LB':
      return { ...dress, shield: 'none', weapon: 'bow', beard: i % 2 === 1 };
    case 'LS':
      return { ...dress, shield: 'none', weapon: 'sling', beard: i % 2 === 0 };
    case 'AX':
      // takabara with the crescent wicker shield
      return { ...dress, shield: 'pelta', weapon: 'javelin', spare: 'spear', beard: true };
    case 'WA':
      // hill tribesmen with axes
      return { ...dress, shield: 'pelta', weapon: 'axe', beard: true };
    case 'MI':
      // sparabara: wicker shield and spear, bow case at the hip
      return { ...dress, shield: 'spara', weapon: 'spear', back: 'bowcase', beard: true };
    case 'HI':
    default:
      // the King's apple-bearers in scale coats
      return { ...dress, torso: 'scale', shield: 'spara', weapon: 'spear', butt: 'pomegranate', back: 'bowcase', beard: true };
  }
}

/** Scythians: pointed caps, kaftans and trousers, gorytos at the hip. */
function scythianKit(type: UnitType, i: number): FootKit {
  const dress = { torso: 'kaftan' as const, skirt: true, legs: 'trousers' as const, helmet: 'scythianCap' as const, crest: 'none' as const, hair: 'long' as const, sleeve: true, longSleeve: true, beard: true };
  switch (type) {
    case 'LI':
      return { ...dress, shield: 'round', weapon: 'javelin', spare: 'javelins', beard: i % 2 === 0 };
    case 'LB':
      return { ...dress, shield: 'none', weapon: 'bow', bow: 'scythian', back: 'gorytos' };
    case 'LS':
      return { ...dress, shield: 'none', weapon: 'sling', beard: i % 2 === 1 };
    case 'AX':
      return { ...dress, shield: 'pelta', weapon: 'axe', spare: 'spear' };
    case 'WA':
      return { ...dress, helmet: 'none', hair: 'wild', shield: 'round', weapon: 'axe', moustache: true };
    case 'MI':
      return { ...dress, torso: 'scale', shield: 'spara', weapon: 'spear', back: 'gorytos' };
    case 'HI':
    default:
      return { ...dress, torso: 'scale', helmet: 'conical', shield: 'spara', weapon: 'spear', back: 'gorytos' };
  }
}

/** India: turbans, white cotton, longbows, long bamboo shields, broadswords. */
function indianKit(type: UnitType, i: number): FootKit {
  const dress = { torso: 'cotton' as const, skirt: true, legs: 'bare' as const, helmet: 'turban' as const, crest: 'none' as const, hair: 'short' as const, beard: i % 2 === 0 };
  switch (type) {
    case 'LI':
      return { ...dress, shield: 'round', weapon: 'javelin', spare: 'javelins' };
    case 'LB':
      return { ...dress, shield: 'none', weapon: 'longbow' };
    case 'LS':
      return { ...dress, shield: 'none', weapon: 'sling' };
    case 'AX':
      return { ...dress, shield: 'bamboo', shieldDy: 2.2, weapon: 'javelin', spare: 'spear' };
    case 'WA':
      // hill tribesmen
      return { ...dress, torso: 'bare', helmet: 'none', hair: 'long', shield: 'bamboo', shieldDy: 2.2, weapon: 'greatsword', beard: true };
    case 'MI':
      return { ...dress, shield: 'bamboo', shieldDy: 2.2, weapon: 'spear', beard: true };
    case 'HI':
    default:
      return { ...dress, torso: 'scale', shield: 'bamboo', shieldDy: 2.2, weapon: 'greatsword', beard: true };
  }
}

// ---------------------------------------------------------------------------------------------
// Elites and per-figure paint

/** How an elite's foot figures differ from their army's ordinary ones: swatches, per-figure paint, and the kit. */
export interface EliteLook {
  palette?: Partial<LookPalette>;
  /** Replaces the look's per-figure paint variants. */
  variants?: Partial<LookPalette>[];
  foot?: FootLook;
}

const robe = (c: string): Partial<LookPalette> => ({ tunic: c, tunicShade: darken(c, 0.34), tunicLight: lighten(c, 0.3) });

/** How the elite foot units differ from their army's ordinary figures. */
export const ELITE_FOOT: Partial<Record<EliteId, EliteLook>> = {
  // Carthage's Sacred Band (base game): white crests and gilded shield rims, otherwise the Punic hoplite.
  carthSacredBand: { palette: { crest: '#f1e8d2', crestShade: '#bfb294', crestAlt: '#6a2374', shieldRim: '#e9bf4f' } },
  // Thebes' Sacred Band: crimson shields with a gilded club, tall white crests.
  thebanSacredBand: {
    palette: {
      shield: '#7e1a24', shieldShade: '#521016', shieldLight: '#ad3a40', shieldRim: '#e0b04a', shieldEmblem: '#f2c94f',
      crest: '#f4eee0', crestShade: '#c4b99c', crestAlt: '#951f2b',
    },
    foot: { helmet: 'attic', crest: 'tall', legs: 'greaves', torso: 'linen' },
  },
  // Eumenes' Argyraspides: silvered shields, and the grey beards of Alexander's oldest veterans.
  silverShields: {
    palette: {
      shield: '#c9ced6', shieldShade: '#868d98', shieldLight: '#f4f6f8', shieldRim: '#eef0f3', shieldEmblem: '#7d8590',
      hair: ['#a8a49c', '#c4bfb6', '#8f8a82', '#d0ccc4'],
    },
    foot: { beard: true },
  },
  // The Immortals of the Susa friezes: patterned court robes, fillets, gold pomegranate spear butts, bow and quiver.
  immortals: {
    palette: { pattern: '#f2d06a' },
    variants: [robe('#e0b440'), robe('#ece2c6'), robe('#8a2c68'), robe('#d8a22a')],
    foot: {
      torso: 'robe', helmet: 'fillet', hair: 'long', beard: true, shield: 'none', weapon: 'guardSpear', butt: 'pomegranate',
      back: 'quiver', bowSlung: true, spare: undefined, legs: 'bare',
    },
  },
  // Mauryan bow-armed auxilia: the longbow instead of javelins and shield.
  bowAuxilia: { foot: { weapon: 'longbow', shield: 'none', spare: undefined } },
};

const figPalettes = new WeakMap<Palette, Map<string, Palette>>();

/** The palette one figure is painted with: the army's, the elite's changes, then the per-figure variant. */
export function figurePalette(p: Palette, i: number, elite?: EliteId): Palette {
  const el = elite ? ELITE_FOOT[elite] : undefined;
  const variants = el?.variants ?? p.style.variants;
  const n = variants ? i % variants.length : 0;
  const v = variants?.[n];
  const empty = (o?: object) => !o || Object.keys(o).length === 0;
  if (empty(el?.palette) && empty(v)) return p;
  const key = `${elite ?? ''}/${n}`;
  let m = figPalettes.get(p);
  if (!m) figPalettes.set(p, (m = new Map()));
  let out = m.get(key);
  if (!out) m.set(key, (out = { ...p, ...el?.palette, ...v }));
  return out;
}

/** The kit after the look's per-type override and the elite's. */
function lookKit(kit: FootKit, p: Palette, i: number, elite?: EliteId): FootKit {
  const o = kit.unit ? p.style.foot?.[kit.unit] : undefined;
  const lo = Array.isArray(o) ? o[i % o.length] : o;
  const eo = elite ? ELITE_FOOT[elite]?.foot : undefined;
  return lo || eo ? { ...kit, ...lo, ...eo } : kit;
}

// ---------------------------------------------------------------------------------------------
// Drawing

const LEANS = [0, 1.4, -1, 0.7];
const r2 = (n: number) => n.toFixed(2);

function Quiver({ p }: { p: Palette }) {
  return (
    <g>
      <Shape d="M-6.6 -23.4 L-4.1 -24.3 L-1.6 -11.6 L-4.1 -10.8 Z" f={p.leather} sw={0.6} />
      <Hi d="M-5.6 -23.4 L-3 -11.2" c={p.leatherShade} w={0.6} />
      <g stroke={p.linen} strokeWidth={0.9} strokeLinecap="round">
        <path d="M-5.9 -24.2 L-7.4 -27.4 M-4.9 -24.6 L-5.7 -28 M-6.6 -23.8 L-8.6 -26.4" />
      </g>
    </g>
  );
}

/** Scythian gorytos at the near hip, gold-plated; `bow`: with the bow in it. */
function Gorytos({ p, bow }: { p: Palette; bow?: boolean }) {
  const deco = p.pattern ?? p.gold;
  return (
    <g>
      {bow ? <Line2 d="M-0.6 -16.2 C-1.4 -19 -3.4 -20.4 -5.8 -20" w={0.9} c={p.wood} ow={0.5} /> : (
        <g stroke={p.linen} strokeWidth={0.8} strokeLinecap="round">
          <path d="M-0.4 -16 L0.2 -18.8 M0.6 -15.8 L1.6 -18.2 M-1.4 -16.2 L-1.6 -18.6" />
        </g>
      )}
      <Shape d="M-1.8 -16.6 L2 -15.8 C1.4 -12.4 -0.6 -9.4 -3.4 -7.6 C-4.8 -7 -6.2 -7.4 -6.4 -8.4 C-5.6 -11 -3.8 -14 -1.8 -16.6 Z" f={p.leather} sw={0.6} />
      <Paint d="M-1.8 -16.6 L-0.4 -16.3 C-1.6 -13.4 -3.4 -10.4 -5.8 -7.4 C-6.2 -7.6 -6.4 -8 -6.4 -8.4 C-5.6 -11 -3.8 -14 -1.8 -16.6 Z" f={p.leatherShade} o={0.7} />
      <Hi d="M-1.4 -15.6 L1.4 -15 M0.6 -13.2 C-0.6 -11.4 -2.2 -9.8 -4.2 -8.6" c={deco} w={0.6} o={1} />
      <circle cx={-1.6} cy={-12.2} r={0.55} fill={deco} />
    </g>
  );
}

/** Spartan cloak hanging down the back. */
function BackCloak({ p }: { p: Palette }) {
  return (
    <g>
      <Shape d="M-3.4 -21.4 C-5.4 -18.4 -6.6 -13 -7.2 -6.4 C-5.6 -5.4 -3.8 -5.6 -2.4 -6.4 C-2.6 -10 -1.8 -15 0.4 -21.6 Z" f={p.cloak} />
      <Paint d="M-7.2 -6.4 C-5.6 -5.4 -3.8 -5.6 -2.4 -6.4 C-2.6 -9 -2.4 -12 -1.8 -15 C-3.6 -12.6 -5.4 -9.6 -7.2 -6.4 Z" f={p.cloakShade} o={0.8} />
      <Hi d="M-3.2 -19.8 C-4.6 -16.6 -5.4 -12.6 -5.6 -8" c={lighten(p.cloak, 0.3)} w={0.5} o={0.7} />
    </g>
  );
}

/** Gold pomegranate on a spear butt. */
function Pomegranate({ x, y, p }: { x: number; y: number; p: Palette }) {
  return (
    <g>
      <circle cx={r2(x)} cy={r2(y)} r={1.25} fill={p.gold} stroke={OL} strokeWidth={0.45} />
      <path d={`M${r2(x - 0.55)} ${r2(y - 1.05)} L${r2(x)} ${r2(y - 1.9)} L${r2(x + 0.55)} ${r2(y - 1.05)}`} fill={p.gold} stroke={OL} strokeWidth={0.35} />
      <circle cx={r2(x - 0.35)} cy={r2(y - 0.35)} r={0.35} fill={lighten(p.gold, 0.5)} />
    </g>
  );
}

/**
 * One foot miniature. `kit` comes from `footKit`; the look's per-type overrides and paint variants are applied here, and
 * so is the unit's `elite` (`UnitToken` passes it down through `Miniature`).
 */
export function FootFigure({ kit: baseKit, p: armyP, i, elite }: { kit: FootKit; p: Palette; i: number; elite?: EliteId }) {
  const p = figurePalette(armyP, i, elite);
  const kit = lookKit(baseKit, armyP, i, elite);
  const f: Fig = kit.tribal ? makeFig(p, i, TRIBAL_SKIN, TRIBAL_HAIR) : makeFig(p, i);
  const lean = LEANS[i % 4];
  const sleeve = kit.sleeve ? (kit.torso === 'leather' || kit.torso === 'linen' ? p.tunic : p.tunic) : kit.torso === 'mail' ? p.iron : undefined;
  const long = !!kit.longSleeve;
  const farShoulder: [number, number] = [-1.6, -20.4];
  const nearShoulder: [number, number] = [2.2, -20.6];
  const w = kit.weapon;

  // --- far side weapon (behind the body)
  let behind: JSX.Element | null = null;
  let farArm: JSX.Element | null = null;
  let front: JSX.Element | null = null;
  // drawn over the shield (two-handed weapons gripped by the near hand), and a near arm hidden behind the shield
  let overShield: JSX.Element | null = null;
  let nearArmOverride: JSX.Element | null = null;
  if (w === 'spear' || w === 'longSpear' || w === 'pilum') {
    const long2 = w === 'longSpear';
    const pom = kit.butt === 'pomegranate';
    const x1 = long2 ? -4.4 : pom ? -5.6 : -3.6;
    const y1 = long2 ? 0.2 : 0.8;
    const x2 = (long2 ? 8.4 : 6.6) + lean;
    const y2 = long2 ? -42.5 : w === 'pilum' ? -41.5 : -39;
    const t = (y1 + 15) / (y1 - y2);
    const hx = x1 + (x2 - x1) * t;
    behind = (
      <Spear x1={x1} y1={y1} x2={x2} y2={y2} f={f} w={long2 ? 1.0 : 0.95} blade={w === 'pilum' ? 2.2 : long2 ? 4.2 : 3.8}
        bladeW={w === 'pilum' ? 1.1 : 1.6} shank={w === 'pilum' ? 10 : 0} butt={long2} />
    );
    if (pom) behind = <g>{behind}<Pomegranate x={x1} y={y1 - 0.6} p={p} /></g>;
    farArm = <Arm s={farShoulder} e={[-3.6, -16.4]} h={[hx, -15]} f={f} sleeve={sleeve} long={long} />;
  } else if (w === 'sarissa') {
    // rear ranks hold the pike upright; the front ranks (figures 2 and 3) lower it
    const lowered = i >= 2;
    if (!lowered) {
      const x1 = -5.4;
      const y1 = 1.0;
      const x2 = 9.2 + lean * 0.5;
      const y2 = -43;
      const t = (y1 + 15) / (y1 - y2);
      behind = <Spear x1={x1} y1={y1} x2={x2} y2={y2} f={f} w={1.0} blade={4.8} bladeW={1.3} butt />;
      farArm = <Arm s={farShoulder} e={[-3.6, -16.4]} h={[x1 + (x2 - x1) * t, -15]} f={f} sleeve={sleeve} />;
    } else {
      const x1 = -13.2;
      const y1 = -6.6;
      const x2 = 17.6;
      const y2 = -30.4 - lean * 0.6;
      const at = (x: number) => y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
      // the near arm is hidden by the shield hung at the shoulder; the pike crosses in front with the hand on it
      nearArmOverride = <Arm s={nearShoulder} e={[5, -17.4]} h={[8.6, at(8.6)]} f={f} near sleeve={sleeve} />;
      overShield = (
        <g>
          <Spear x1={x1} y1={y1} x2={x2} y2={y2} f={f} w={1.0} blade={4.8} bladeW={1.3} butt />
          <circle cx={8.6} cy={r2(at(8.6))} r={1.2} fill={f.skin} stroke={OL} strokeWidth={0.6} />
        </g>
      );
      farArm = <Arm s={farShoulder} e={[-3.4, -16]} h={[-1.2, at(-1.2)]} f={f} sleeve={sleeve} />;
    }
  } else if (w === 'guardSpear') {
    // spear held upright in front with both hands, butt on the ground
    const x1 = 8.4;
    const y1 = 0.4;
    const x2 = 9.4 + lean * 0.3;
    const y2 = -41;
    const at = (y: number) => x1 + ((x2 - x1) * (y - y1)) / (y2 - y1);
    farArm = <Arm s={farShoulder} e={[0.2, -16.2]} h={[at(-23.4), -23.4]} f={f} sleeve={sleeve} long={long} />;
    overShield = (
      <g>
        <Spear x1={x1} y1={y1} x2={x2} y2={y2} f={f} w={0.95} blade={3.8} bladeW={1.6} />
        <Pomegranate x={x1} y={y1 - 0.9} p={p} />
        <Arm s={nearShoulder} e={[4.8, -15.8]} h={[at(-17.6), -17.6]} f={f} near sleeve={sleeve} long={long} />
      </g>
    );
  } else if (w === 'javelin') {
    behind = <Spear x1={-11 - lean * 0.3} y1={-27 + lean * 0.4} x2={11.2} y2={-34.6 - lean * 0.6} f={f} w={0.75} blade={2.6} bladeW={1.2} />;
    farArm = <Arm s={farShoulder} e={[-5.2, -24]} h={[-3.4, -29.6]} f={f} sleeve={sleeve} long={long} />;
  } else if (w === 'sword' || w === 'greatsword' || w === 'axe') {
    const fwd = i % 2 === 0;
    const big = w === 'greatsword';
    const hx = fwd ? 0.2 : -2.2;
    const hy = -30.4;
    const reach = big ? 1.22 : w === 'axe' ? 0.92 : 1;
    const tx0 = fwd ? 7.8 : -7.2;
    const ty0 = fwd ? -39.8 : -40.6;
    const tx = reach === 1 ? tx0 : hx + (tx0 - hx) * reach;
    const ty = reach === 1 ? ty0 : hy + (ty0 - hy) * reach;
    const len = Math.hypot(tx - hx, ty - hy);
    const ux = (tx - hx) / len;
    const uy = (ty - hy) / len;
    const nx = -uy;
    const ny = ux;
    const r = (n: number) => n.toFixed(2);
    if (w === 'axe') {
      // sagaris: wooden haft, small iron head with a back spike
      const sx = fwd ? 1 : -1;
      const bx = tx - ux * 1.2;
      const by = ty - uy * 1.2;
      const ex = nx * sx;
      const ey = ny * sx;
      behind = (
        <g>
          <Line2 d={`M${r(hx - ux * 1.4)} ${r(hy - uy * 1.4)} L${r(tx)} ${r(ty)}`} w={0.85} c={p.wood} ow={0.5} />
          <path d={`M${r(bx + ex * 0.5)} ${r(by + ey * 0.5)} L${r(bx + ex * 2.9 + ux * 1.1)} ${r(by + ey * 2.9 + uy * 1.1)} L${r(bx + ex * 2.9 - ux * 1.5)} ${r(by + ey * 2.9 - uy * 1.5)} L${r(bx + ex * 0.5 - ux * 0.9)} ${r(by + ey * 0.5 - uy * 0.9)} Z`} fill={p.ironLight} stroke={OL} strokeWidth={0.5} strokeLinejoin="round" />
          <Line2 d={`M${r(bx - ex * 0.4)} ${r(by - ey * 0.4)} L${r(bx - ex * 1.9 - ux * 0.4)} ${r(by - ey * 1.9 - uy * 0.4)}`} w={0.6} c={p.iron} ow={0.4} />
        </g>
      );
    } else {
      const bw = kit.falcata ? 1.1 : big ? 1.3 : 0.85;
      const gx = hx + ux * 1.2;
      const gy = hy + uy * 1.2;
      const blade = kit.falcata
        ? `M${r(gx + nx * bw)} ${r(gy + ny * bw)} Q${r(gx + ux * 6 + nx * 2.2)} ${r(gy + uy * 6 + ny * 2.2)} ${r(tx)} ${r(ty)} Q${r(gx + ux * 5)} ${r(gy + uy * 5)} ${r(gx - nx * bw)} ${r(gy - ny * bw)} Z`
        : `M${r(gx + nx * bw)} ${r(gy + ny * bw)} L${r(tx + nx * 0.35 - ux * 1.2)} ${r(ty + ny * 0.35 - uy * 1.2)} L${r(tx)} ${r(ty)} L${r(tx - nx * 0.35 - ux * 1.2)} ${r(ty - ny * 0.35 - uy * 1.2)} L${r(gx - nx * bw)} ${r(gy - ny * bw)} Z`;
      behind = (
        <g>
          <path d={blade} fill={p.ironLight} stroke={OL} strokeWidth={0.6} strokeLinejoin="round" />
          <Hi d={`M${r(gx + ux * 1.5)} ${r(gy + uy * 1.5)} L${r(tx - ux * 2)} ${r(ty - uy * 2)}`} c={p.iron} w={0.35} />
          <Line2 d={`M${r(gx + nx * 1.7)} ${r(gy + ny * 1.7)} L${r(gx - nx * 1.7)} ${r(gy - ny * 1.7)}`} w={0.7} c={p.metal} ow={0.45} />
        </g>
      );
    }
    farArm = <Arm s={farShoulder} e={fwd ? [-4.4, -25.2] : [-5.2, -24.6]} h={[hx, hy]} f={f} sleeve={sleeve} long={long} />;
  } else if (w === 'bow') {
    const scy = kit.bow === 'scythian';
    behind = kit.back === 'gorytos' ? null : <Quiver p={p} />;
    farArm = <Arm s={farShoulder} e={[-6, -21.6]} h={[-0.2, -22.6]} f={f} sleeve={sleeve} long={long} />;
    front = scy ? (
      <g>
        <path d="M8.8 -29.6 L-0.2 -22.6 L8.8 -13.6" fill="none" stroke={p.linen} strokeWidth={0.4} />
        <Line2 d="M-0.6 -22.6 L13.6 -21.6" w={0.5} c={p.wood} ow={0.35} />
        <path d="M13.6 -21.6 L12.2 -22.5 L12.3 -20.7 Z" fill={p.ironLight} stroke={OL} strokeWidth={0.35} />
        <Arm s={nearShoulder} e={[6.4, -21]} h={[10.4, -21.5]} f={f} near sleeve={sleeve} long={long} />
        <Line2 d="M8.8 -29.6 C7.8 -27.6 11.8 -26.4 11.2 -23.2 C11 -22.4 10.6 -22 10.6 -21.6 C10.6 -21.2 11 -20.8 11.2 -20 C11.8 -16.8 7.8 -15.6 8.8 -13.6" w={1.0} c={p.wood} ow={0.55} />
        <circle cx={10.6} cy={-21.5} r={1.15} fill={f.skin} stroke={OL} strokeWidth={0.55} />
      </g>
    ) : (
      <g>
        <path d="M8.2 -32.4 L-0.2 -22.6 L8.2 -10.8" fill="none" stroke={p.linen} strokeWidth={0.4} />
        <Line2 d="M-0.6 -22.6 L13.6 -21.6" w={0.5} c={p.wood} ow={0.35} />
        <path d="M13.6 -21.6 L12.2 -22.5 L12.3 -20.7 Z" fill={p.ironLight} stroke={OL} strokeWidth={0.35} />
        <Arm s={nearShoulder} e={[6.4, -21]} h={[10.4, -21.5]} f={f} near sleeve={sleeve} long={long} />
        <Line2 d="M8.2 -32.4 Q13.8 -21.6 8.2 -10.8" w={1.0} c={p.wood} ow={0.55} />
        <circle cx={10.6} cy={-21.5} r={1.15} fill={f.skin} stroke={OL} strokeWidth={0.55} />
      </g>
    );
  } else if (w === 'longbow') {
    // the tall Indian bamboo bow, its lower tip resting on the ground
    behind = <Quiver p={p} />;
    farArm = <Arm s={farShoulder} e={[-6, -21.6]} h={[-0.2, -22.6]} f={f} sleeve={sleeve} long={long} />;
    front = (
      <g>
        <path d="M10.2 -40.6 L-0.2 -22.6 L9.8 -1.2" fill="none" stroke={p.linen} strokeWidth={0.4} />
        <Line2 d="M-0.8 -22.6 L16.4 -21.2" w={0.5} c={p.wood} ow={0.35} />
        <path d="M16.4 -21.2 L15 -22.1 L15.1 -20.3 Z" fill={p.ironLight} stroke={OL} strokeWidth={0.35} />
        <Arm s={nearShoulder} e={[6.6, -21]} h={[12.4, -21.3]} f={f} near sleeve={sleeve} long={long} />
        <Line2 d="M10.2 -40.6 Q15.6 -21.2 9.8 -1.2" w={1.05} c={p.wood} ow={0.55} />
        <Hi d="M11.6 -36 L12.4 -35.4 M12.6 -30 L13.4 -29.6 M13 -13.4 L13.8 -13.8 M12.4 -7.4 L13.2 -7.8" c={p.woodShade} w={0.4} o={1} />
        <circle cx={12.6} cy={-21.3} r={1.15} fill={f.skin} stroke={OL} strokeWidth={0.55} />
      </g>
    );
  } else if (w === 'sling') {
    behind = (
      <g>
        <Line2 d="M-3.4 -13.2 L2.6 -21.8" w={0.6} c={p.leatherShade} ow={0.35} />
      </g>
    );
    farArm = <Arm s={farShoulder} e={[-3.8, -25.8]} h={[-1.2, -31]} f={f} sleeve={sleeve} long={long} />;
    const rot = [0, 1, 2, 3][i % 4];
    const sx = [6.4, 5.6, 7, 6][rot];
    const sy = [-35.8, -36.6, -35, -36][rot];
    front = (
      <g>
        <path d="M-6.6 -32.4 A7.4 2.6 0 1 1 5.4 -32.2" fill="none" stroke="#fff6dc" strokeWidth={0.7} opacity={0.55} strokeLinecap="round" />
        <path d={`M${sx - 7} ${sy + 0.6} A7.4 2.6 0 0 1 ${sx} ${sy}`} fill="none" stroke="#fff6dc" strokeWidth={1.3} opacity={0.8} strokeLinecap="round" />
        <path d={`M-1.2 -31 Q2.4 -34.4 ${sx} ${sy}`} fill="none" stroke={OL} strokeWidth={0.5} />
        <circle cx={sx} cy={sy} r={1.05} fill={p.leather} stroke={OL} strokeWidth={0.45} />
        <Arm s={nearShoulder} e={[4.6, -16.6]} h={[7.2, -15.2]} f={f} near sleeve={sleeve} long={long} />
        <Shape d="M-5.4 -13 C-6.4 -11.2 -5.8 -9.2 -4.2 -9 C-2.8 -9.2 -2.4 -11 -3.2 -12.8 Z" f={p.leather} sw={0.55} />
      </g>
    );
  }

  // --- back / hip gear
  const quiverBack = kit.back === 'quiver' && w !== 'bow' && w !== 'longbow' ? <Quiver p={p} /> : null;
  const slungBow = kit.bowSlung ? (
    <g>
      <path d="M-4.4 -28.6 L-1.8 -9.6" fill="none" stroke={p.linen} strokeWidth={0.35} />
      <Line2 d="M-4.4 -28.6 C-9.6 -24.6 -8 -14 -1.8 -9.6" w={0.95} c={p.wood} ow={0.5} />
    </g>
  ) : null;
  const hipCase = kit.back === 'gorytos' || kit.back === 'bowcase' ? <Gorytos p={p} bow={kit.back === 'bowcase'} /> : null;

  // --- shield-hand extras
  let spare: JSX.Element | null = null;
  let nearArm: JSX.Element | null = null;
  if (kit.spare === 'javelins') {
    spare = (
      <g>
        <Spear x1={2.6} y1={-6.4} x2={9.2} y2={-31.4} f={f} w={0.65} blade={2.2} bladeW={1.0} />
        <Spear x1={3.8} y1={-6.2} x2={11.2} y2={-30} f={f} w={0.65} blade={2.2} bladeW={1.0} />
      </g>
    );
  } else if (kit.spare === 'spear') {
    spare = <Spear x1={1.4} y1={-1.8} x2={9.8 + lean} y2={-38} f={f} w={0.85} blade={3.4} bladeW={1.4} />;
  }
  if (kit.shield === 'round') {
    nearArm = <Arm s={nearShoulder} e={[4.4, -16.8]} h={[5.6, -15]} f={f} near sleeve={sleeve} long={long} />;
  }
  if (nearArmOverride) nearArm = nearArmOverride;

  const hips = !kit.skirt && kit.legs === 'trousers' ? p.trousers : undefined;
  const sScale = kit.shieldScale ?? 1;

  return (
    <>
      {slungBow}
      {quiverBack}
      {behind}
      {farArm}
      {kit.cloak && <BackCloak p={p} />}
      <LegsEl f={f} legs={kit.legs} />
      <Body f={f} torso={kit.torso} skirt={kit.skirt} pteruges={kit.pteruges} hips={hips} />
      {hipCase}
      <Head f={f} helmet={kit.helmet} crest={kit.crest} hair={kit.hair} beard={kit.beard} moustache={kit.moustache} torc={kit.torc} />
      {spare}
      {nearArm}
      {kit.shield !== 'none' && (
        <Shield kind={kit.shield} f={f} s={sScale} painted={kit.painted} dx={sScale !== 1 ? 4.2 * (1 - sScale) : 0} dy={(sScale !== 1 ? -13.6 * (1 - sScale) : 0) + (kit.shieldDy ?? 0)} />
      )}
      {overShield}
      {front}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Crews: war machines here; elephants, chariots and camels seat theirs as half-figures (mounted.tsx)

/** Hand positions of a crewman (figure frame: feet at 0,0, facing right): named poses or explicit near/far hands. */
export type CrewPose = 'crank' | 'load' | 'aim' | { near: [number, number]; far: [number, number] };

const CREW_HANDS: Record<'crank' | 'load' | 'aim', { near: [number, number]; far: [number, number] }> = {
  crank: { near: [6.4, -15.2], far: [5.2, -14.4] },
  load: { near: [7.8, -21.8], far: [6.6, -22.8] },
  aim: { near: [8.6, -24], far: [-3.6, -13.2] },
};

/** Dress of a crewman: war-machine crews stand (`legs`), the crews of elephants, chariots and camels show their upper body. */
export interface CrewDress {
  torso: Torso;
  helmet: Helmet;
  crest: Crest;
  hair?: Hair;
  beard?: boolean;
  moustache?: boolean;
  longSleeve?: boolean;
  legs?: 'bare' | 'trousers';
}

/** Dress of a crewman of a kit (`i` varies helmets), the same on a war machine as in a tower or a chariot. */
export function crewDress(kit: Kit, i: number): CrewDress {
  switch (kit) {
    case 'roman': return { torso: 'mail', helmet: 'montefortino', crest: i % 2 ? 'plumes' : 'knob' };
    case 'punic': return { torso: 'linen', helmet: i % 2 ? 'attic' : 'conical', crest: i % 2 ? 'horsehair' : 'knob', beard: i % 2 === 0 };
    case 'greek': return { torso: 'linen', helmet: i % 2 ? 'corinthian' : 'pilos', crest: i % 2 ? 'tall' : 'knob' };
    case 'macedonian': return { torso: 'linen', helmet: i % 2 ? 'thracian' : 'phrygian', crest: i % 2 ? 'knob' : 'horsehair' };
    case 'persian': return { torso: 'tunic', helmet: 'tiara', crest: 'none', longSleeve: true, beard: true, legs: 'trousers' };
    case 'scythian': return { torso: 'kaftan', helmet: 'scythianCap', crest: 'none', longSleeve: true, hair: 'long', beard: true, legs: 'trousers' };
    case 'indian': return { torso: 'cotton', helmet: 'turban', crest: 'none', beard: i % 2 === 0 };
  }
}

function CrewFigure({ p: armyP, i, pose }: { p: Palette; i: number; pose: CrewPose }) {
  const p = figurePalette(armyP, i);
  const f = makeFig(p, i);
  const d = crewDress(p.kit, i);
  const hands = typeof pose === 'string' ? CREW_HANDS[pose] : pose;
  const sleeve = d.torso === 'mail' ? p.iron : p.tunic;
  const long = !!d.longSleeve;
  const elbow = (s: [number, number], h: [number, number], drop: number): [number, number] => [
    Number(((s[0] + h[0]) / 2 - 0.6).toFixed(2)), Number(((s[1] + h[1]) / 2 + drop).toFixed(2)),
  ];
  const fs: [number, number] = [-1.6, -20.4];
  const ns: [number, number] = [2.2, -20.6];
  return (
    <>
      <Arm s={fs} e={elbow(fs, hands.far, 2.2)} h={hands.far} f={f} sleeve={sleeve} long={long} />
      <LegsEl f={f} legs={d.legs ?? 'bare'} />
      <Body f={f} torso={d.torso} skirt />
      <Head f={f} helmet={d.helmet} crest={d.crest} hair={d.hair} beard={d.beard} moustache={d.moustache} />
      <Arm s={ns} e={elbow(ns, hands.near, 2.4)} h={hands.near} f={f} near sleeve={sleeve} long={long} />
    </>
  );
}

/**
 * A war-machine crewman in his army's dress (for the HWM figure): facing right, feet at (0,0), ~30 units tall, unarmed,
 * hands where `pose` puts them ('crank' at waist height, 'load' at chest height, 'aim' one hand forward at the head, or
 * explicit `{ near, far }` hand points in the figure frame). `i` (0..3) varies the face, headgear and paint.
 */
export function crewFigure(p: Palette, i: number, pose: CrewPose = 'crank'): JSX.Element {
  return <CrewFigure p={p} i={i} pose={pose} />;
}
