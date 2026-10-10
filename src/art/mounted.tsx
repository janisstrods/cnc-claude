// Horses and riders (LC, MC, HC, LBC, leaders), and the half-figures that crew elephants, chariots and camels.
// Facing right, hooves at y = 0.
import { useContext } from 'react';
import type { ArmyLook, EliteId, UnitType } from '../engine/types';
import { darken, lighten } from './color';
import { figurePalette } from './foot';
import { LOOKS, type Kit, type LookPalette, type LookStyle, type Palette } from './palettes';
import {
  Arm, Body, FacingRightCtx, Head, Hi, Line2, OL, Paint, Shape, Shield, Spear, dots, makeFig,
  type Crest, type Fig, type Hair, type Helmet, type ShieldKind, type Torso,
} from './parts';

const HORSE_BODY =
  'M-12.6 -15.2 C-9.6 -16.6 -5.6 -15.4 -2.2 -15 C1.4 -14.8 3.8 -15.8 5.6 -17.6 C7.6 -19.8 9.4 -23 11.2 -24.6 ' +
  'L11.5 -26.6 L12.7 -24.9 C13.9 -23.9 15.7 -21.1 17.5 -18.9 C18.1 -18.1 17.7 -16.8 16.6 -16.8 ' +
  'C15.2 -16.8 14 -17.6 13 -18.4 C11.8 -18.6 10.6 -17.2 9.6 -15 C9 -13 8.8 -11 7.4 -9.6 ' +
  'C4 -8.6 -2 -8.4 -6.4 -9 C-9 -9 -11.2 -9.6 -12.6 -10.8 C-14.4 -12 -14.2 -14.4 -12.6 -15.2 Z';
const HORSE_BELLY =
  'M7.4 -9.6 C4 -8.6 -2 -8.4 -6.4 -9 C-9 -9 -11.2 -9.6 -12.6 -10.8 C-13.6 -11.6 -14 -12.6 -13.8 -13.4 C-11 -11.6 -6 -10.8 0 -10.8 C3.6 -10.8 6.4 -11.4 8.6 -12.6 C8.3 -11.4 7.9 -10.4 7.4 -9.6 Z';

type LegSet = { farHind: string; farFore: string; nearHind: string; nearFore: string };
const LEGS: LegSet[] = [
  {
    farHind: 'M-8 -10.4 L-6.6 -5.4 L-5.6 -0.9',
    farFore: 'M5 -10.6 L8.8 -6.8 L7.4 -3.6',
    nearHind: 'M-10.6 -11 L-12.6 -5.6 L-11.2 -0.9',
    nearFore: 'M7.2 -10.4 L7.4 -5.2 L7.9 -0.9',
  },
  {
    farHind: 'M-8.6 -10.4 L-11.6 -6.4 L-14.6 -3.6',
    farFore: 'M5.4 -10.6 L10.6 -9.4 L12.8 -5.8',
    nearHind: 'M-10.6 -11 L-8.6 -5.8 L-9.6 -1.2',
    nearFore: 'M7.4 -10.4 L9.8 -6 L7.8 -3.2',
  },
  {
    farHind: 'M-8 -10.4 L-9.6 -5.6 L-8.6 -0.9',
    farFore: 'M5 -10.6 L6.6 -5.4 L6.2 -0.9',
    nearHind: 'M-10.6 -11 L-12 -5.8 L-13.2 -1.6',
    nearFore: 'M7.2 -10.4 L10.6 -7.6 L10.2 -4.4',
  },
];

function hoof(d: string): string {
  // last point of the leg path -> a short hoof segment
  const pts = d.replace(/[ML]/g, ' ').trim().split(/\s+/).map(Number);
  const x = pts[pts.length - 2];
  const y = pts[pts.length - 1];
  const px = pts[pts.length - 4];
  const py = pts[pts.length - 3];
  const len = Math.hypot(x - px, y - py);
  const ux = (x - px) / len;
  const uy = (y - py) / len;
  return `M${(x - ux * 0.6).toFixed(2)} ${(y - uy * 0.6).toFixed(2)} L${(x + ux * 0.5).toFixed(2)} ${(y + uy * 0.5).toFixed(2)}`;
}

// --- Expansion #1 horse furniture ----------------------------------------------------------------

/** Leopard-skin saddle cloth (Macedonian cavalry): the pelt with its paws hanging down the flank. */
const PELT =
  'M-8.4 -16.3 C-4.4 -15.2 0.4 -15.2 4.7 -16.7 C5 -15 4.7 -13.4 4.3 -12.2 L5.3 -9 L3.8 -9.3 L3.1 -10.5 ' +
  'C0.2 -9.9 -3 -9.9 -5.8 -10.5 L-6.5 -8.1 L-7.7 -8.8 L-7.9 -11 C-8.7 -12.6 -9 -14.6 -8.4 -16.3 Z';
const PELT_SPOTS = dots([
  [-6.8, -14.6], [-4.6, -13.4], [-2.4, -14.7], [-0.2, -12.8], [1.8, -14.6], [3.4, -12.8], [-5.8, -11.6],
  [-2.8, -11.4], [0.8, -10.9], [2.6, -11.2], [-7.1, -9.6], [4.4, -10.2], [-1.2, -15.1], [-4, -15.4],
], 0.42);
const PELT_RINGS = dots([[-5.6, -13.9], [-1.4, -13.2], [2.6, -13.6], [-3.8, -11.4], [1.6, -11.2]], 0.62);
const LEOPARD = '#d6a24c';

/** A cataphract's scale trapper over the body and neck (the head keeps its chamfron). */
const CATA =
  'M-12.4 -15.4 C-9.6 -16.8 -5.6 -15.6 -2.2 -15.2 C1.4 -15 3.8 -16 5.6 -17.8 C7.6 -20 9.4 -23.2 11.1 -24.6 ' +
  'L12.6 -23.8 C11.6 -21.2 10.6 -17.8 9.8 -15 C9.2 -12.8 8.9 -10.4 7.8 -8.6 C4 -7.6 -2 -7.4 -6.4 -8 ' +
  'C-9 -8 -11.6 -8.6 -13 -10 C-14.6 -11.6 -14.2 -14.4 -12.4 -15.4 Z';
const CATA_ROWS = (() => {
  const rows: string[] = [];
  const row = (x0: number, x1: number, y: number) => {
    let d = `M${x0} ${y}`;
    for (let x = x0; x < x1 - 0.1; x += 1.3) d += ` q0.65 1 1.3 0`;
    rows.push(d);
  };
  row(-12.4, 7.4, -13.6);
  row(-12.6, 8, -11.6);
  row(-11.2, 7.4, -9.6);
  row(4.4, 9.4, -17.4);
  row(6.8, 10.2, -20.6);
  return rows.join(' ');
})();

export type HorseCloth = 'plain' | 'leopard' | 'rich';

export function Horse({ coat, shade, mane, pose = 0, cloth, clothTrim, barding, metal, metalShade, bridle = true, light, clothKind, clothPattern, cataphract }: {
  coat: string; shade: string; mane: string; pose?: number; cloth?: string; clothTrim?: string; barding?: boolean;
  metal?: string; metalShade?: string; bridle?: boolean; light?: string;
  /** Expansion #1: leopard skin, or a richly patterned and fringed cloth (`clothPattern` dots); default plain. */
  clothKind?: HorseCloth;
  clothPattern?: string;
  /** Expansion #1: scale trapper over body and neck (Seleucid cataphracts). */
  cataphract?: boolean;
}) {
  const L = LEGS[pose % LEGS.length];
  const farC = darken(coat, 0.22);
  return (
    <>
      {/* tail */}
      <Shape d="M-12.8 -14.6 C-15.8 -14 -17 -10.8 -16.6 -6 C-15.8 -8.4 -14.8 -10 -13.2 -11.8 Z" f={mane} sw={0.6} />
      <Line2 d={L.farHind} w={2.3} c={farC} ow={0.7} />
      <Line2 d={L.farFore} w={2.1} c={farC} ow={0.7} />
      <Line2 d={hoof(L.farHind)} w={2.2} c="#2a1d14" ow={0.5} />
      <Line2 d={hoof(L.farFore)} w={2.0} c="#2a1d14" ow={0.5} />
      <Line2 d={L.nearHind} w={2.6} c={coat} ow={0.75} />
      <Line2 d={L.nearFore} w={2.3} c={coat} ow={0.75} />
      <Line2 d={hoof(L.nearHind)} w={2.4} c="#2a1d14" ow={0.5} />
      <Line2 d={hoof(L.nearFore)} w={2.2} c="#2a1d14" ow={0.5} />
      <Shape d={HORSE_BODY} f={coat} sw={0.85} />
      <Paint d={HORSE_BELLY} f={shade} />
      <Paint d="M-12.6 -15.2 C-14.2 -14.4 -14.4 -12 -12.6 -10.8 C-11.4 -11.8 -10.6 -13.4 -10.8 -15.4 Z" f={shade} o={0.6} />
      {light && <Hi d="M-10.6 -15.4 C-6.6 -15.8 -3 -15.2 0.6 -15.2 C3 -15.4 4.6 -16.4 6 -18" c={light} w={0.8} o={0.7} />}
      <Hi d="M3.6 -12 C5 -13 5.6 -14.4 5.8 -15.8" c={shade} w={0.5} o={0.8} />
      {/* mane & forelock */}
      <Shape d="M4.2 -16.6 C6.4 -19.2 8.6 -22.8 10.9 -25 C11.4 -24.2 11.2 -23.4 10.6 -22.6 C9 -20.6 7.6 -18.6 6.4 -16.2 Z" f={mane} sw={0.55} />
      {/* head details */}
      <circle cx={14.1} cy={-22} r={0.5} fill={OL} />
      <circle cx={16.9} cy={-17.9} r={0.35} fill={OL} />
      {cataphract && metal && (
        <g>
          <Shape d={CATA} f={metal} sw={0.7} />
          <Paint d="M-12.4 -15.4 C-14.2 -14.4 -14.6 -11.6 -13 -10 C-11.6 -8.6 -9 -8 -6.4 -8 C-9.2 -9.4 -10.8 -12.4 -10.6 -15.8 Z" f={metalShade ?? shade} o={0.7} />
          <path d={CATA_ROWS} fill="none" stroke={metalShade ?? shade} strokeWidth={0.42} />
          <Hi d="M-10.6 -15.6 C-6.6 -16 -3 -15.4 0.6 -15.4 C3 -15.6 4.6 -16.6 6 -18.2" c={lighten(metal, 0.45)} w={0.6} o={0.8} />
        </g>
      )}
      {barding && metal && (
        <g>
          <Shape d="M12.4 -24.4 C13.8 -23.4 15.6 -21 17.1 -19.2 L15.8 -18.4 C14.4 -20.2 12.8 -22.2 11.6 -23.4 Z" f={metal} sw={0.5} />
          <Shape d="M9.7 -15.6 C9.1 -13.4 8.8 -11.2 7.5 -9.8 L4.6 -9.6 C5.4 -11.6 5.8 -14 6.2 -16.4 C7.4 -16.6 8.6 -16.4 9.7 -15.6 Z" f={metal} sw={0.55} />
          <Hi d="M8.4 -15 C8 -13.4 7.6 -12 6.8 -10.6" c={metalShade ?? shade} w={0.5} />
        </g>
      )}
      {bridle && (
        <g fill="none" stroke="#3a2416" strokeWidth={0.55} strokeLinecap="round">
          <path d="M12.6 -24.4 L13.2 -18.6 M12.8 -21.2 L16.9 -19.6" />
        </g>
      )}
      {cloth && clothKind === 'leopard' && (
        <g>
          <Shape d={PELT} f={LEOPARD} sw={0.6} />
          <Paint d="M-8.4 -16.3 C-7.4 -16 -6.4 -15.8 -5.6 -15.7 C-5.8 -13.6 -5.8 -11.8 -5.8 -10.5 L-6.5 -8.1 L-7.7 -8.8 L-7.9 -11 C-8.7 -12.6 -9 -14.6 -8.4 -16.3 Z" f={darken(LEOPARD, 0.3)} mx={-2} />
          <path d={PELT_RINGS} fill="none" stroke="#4a2c12" strokeWidth={0.35} />
          <path d={PELT_SPOTS} fill="#3c2410" />
          {clothTrim && <Hi d="M4.4 -12.4 C0.6 -11.4 -3.6 -11.4 -7.6 -12.2" c={clothTrim} w={0.7} o={0.95} />}
        </g>
      )}
      {cloth && clothKind === 'rich' && (
        <g>
          <path d="M-7.2 -10.6 L-7.4 -9 M-5.6 -10.2 L-5.8 -8.6 M-4 -10 L-4.1 -8.4 M-2.4 -9.9 L-2.4 -8.3 M-0.8 -9.9 L-0.7 -8.3 M0.8 -10 L1 -8.4 M2.4 -10.2 L2.7 -8.6" stroke={clothTrim ?? cloth} strokeWidth={0.55} strokeLinecap="round" />
          <Shape d="M-7.4 -16 C-3.8 -15.1 0.8 -15.2 3.9 -16.4 L3.6 -10.4 C-0.4 -9.6 -4.4 -9.7 -7.8 -10.6 Z" f={cloth} sw={0.6} />
          <Paint d="M-7.4 -16 C-6.4 -15.7 -5.4 -15.5 -4.6 -15.4 L-4.8 -10 C-5.8 -10.2 -6.8 -10.4 -7.8 -10.6 Z" f={darken(cloth, 0.3)} mx={-1.9} />
          {clothPattern && <path d={RICH_DOTS} fill={clothPattern} />}
          {clothTrim && <Hi d="M3.4 -10.8 C-0.4 -10 -4.4 -10.1 -7.5 -11" c={clothTrim} w={1} o={1} />}
          {clothTrim && <Hi d="M-7.1 -15.4 C-3.8 -14.6 0.6 -14.7 3.6 -15.8" c={clothTrim} w={0.6} o={1} />}
        </g>
      )}
      {cloth && !clothKind && (
        <g>
          <Shape d="M-7 -15.9 C-3.6 -15 0.8 -15.1 3.6 -16.2 L3.4 -10.6 C-0.4 -9.8 -4.2 -9.9 -7.4 -10.8 Z" f={cloth} sw={0.6} />
          {clothTrim && <Hi d="M3.2 -11 C-0.4 -10.2 -4.2 -10.3 -7.1 -11.2" c={clothTrim} w={0.9} o={1} />}
          <Paint d="M-7 -15.9 C-6 -15.6 -5 -15.4 -4.2 -15.3 L-4.4 -10.2 C-5.4 -10.4 -6.4 -10.6 -7.4 -10.8 Z" f={darken(cloth, 0.3)} mx={-1.9} />
        </g>
      )}
    </>
  );
}

const RICH_DOTS = dots([[-5.2, -13.4], [-2.6, -12.8], [0, -13.2], [2.4, -13.8], [-3.9, -11.6], [-1.3, -11.2], [1.2, -11.4]], 0.4);

// ---------------------------------------------------------------------------------------------
// Riders

export interface RiderKit {
  torso: Torso;
  helmet: Helmet;
  crest: Crest;
  shield: ShieldKind;
  /** `bow`: a drawn bow (horse archers), see `bow` and `backShot`. */
  weapon: 'spear' | 'lance' | 'javelin' | 'standard' | 'bow';
  legs: 'bare' | 'trousers' | 'greaves';
  cloak?: boolean;
  beard?: boolean;
  spare?: boolean;
  // Expansion #1 (all optional; the base kits and the generals do not set them)
  hair?: Hair;
  moustache?: boolean;
  /** Sleeves to the wrist (Persian, Scythian and Median dress). */
  longSleeve?: boolean;
  /** Bow case at the near hip: the Scythian gorytos, with arrows (the bow is in hand) or with the bow in it. */
  gorytos?: 'arrows' | 'bow';
  /** Bow shape for `bow`: the plain self bow or the short double-curved bow of the steppe. */
  bow?: 'self' | 'scythian';
  /** Turned in the saddle, shooting back over the horse's croup. */
  backShot?: boolean;
}

const HORSE_SCALE = 1.12;
const SEAT_X = -1.4 * HORSE_SCALE;
const SEAT_Y = -15.5 * HORSE_SCALE;
/** Shift that maps the standing-figure upper body onto the saddle. */
const UB_DX = -0.6;
const UB_DY = 13.4;
const UB = `translate(${UB_DX} ${UB_DY})`;
/** Mirror about the rider's spine (an archer turned in the saddle). */
const TURN = 'matrix(-1 0 0 1 -0.5 0)';

/** Drawn bow in the standing-figure frame (as the foot archers draw it); the near hand holds the bow. */
function DrawnBow({ f, sleeve, long, bow }: { f: Fig; sleeve: string; long: boolean; bow: 'self' | 'scythian' }) {
  const { p } = f;
  const ns: [number, number] = [2.2, -20.6];
  return bow === 'scythian' ? (
    <g>
      <path d="M8.8 -29.6 L-0.2 -22.6 L8.8 -13.6" fill="none" stroke={p.linen} strokeWidth={0.4} />
      <Line2 d="M-0.6 -22.6 L13.6 -21.6" w={0.5} c={p.wood} ow={0.35} />
      <path d="M13.6 -21.6 L12.2 -22.5 L12.3 -20.7 Z" fill={p.ironLight} stroke={OL} strokeWidth={0.35} />
      <Arm s={ns} e={[6.4, -21]} h={[10.4, -21.5]} f={f} near sleeve={sleeve} long={long} />
      <Line2 d="M8.8 -29.6 C7.8 -27.6 11.8 -26.4 11.2 -23.2 C11 -22.4 10.6 -22 10.6 -21.6 C10.6 -21.2 11 -20.8 11.2 -20 C11.8 -16.8 7.8 -15.6 8.8 -13.6" w={1.0} c={p.wood} ow={0.55} />
      <circle cx={10.6} cy={-21.5} r={1.15} fill={f.skin} stroke={OL} strokeWidth={0.55} />
    </g>
  ) : (
    <g>
      <path d="M8.4 -31.2 L-0.2 -22.6 L8.4 -12" fill="none" stroke={p.linen} strokeWidth={0.4} />
      <Line2 d="M-0.6 -22.6 L13.6 -21.6" w={0.5} c={p.wood} ow={0.35} />
      <path d="M13.6 -21.6 L12.2 -22.5 L12.3 -20.7 Z" fill={p.ironLight} stroke={OL} strokeWidth={0.35} />
      <Arm s={ns} e={[6.4, -21]} h={[10.4, -21.5]} f={f} near sleeve={sleeve} long={long} />
      <Line2 d="M8.4 -31.2 Q13.6 -21.6 8.4 -12" w={1.0} c={p.wood} ow={0.55} />
      <circle cx={10.6} cy={-21.5} r={1.15} fill={f.skin} stroke={OL} strokeWidth={0.55} />
    </g>
  );
}

/** Gold-mounted bow case at the near hip, in the standing-figure frame (as the foot figures wear it). */
export function HipGorytos({ p, bow }: { p: Palette; bow: boolean }) {
  const deco = p.pattern ?? p.gold;
  return (
    <g>
      {bow ? <Line2 d="M-0.6 -16.2 C-1.4 -19 -3.4 -20.4 -5.8 -20" w={0.9} c={p.wood} ow={0.5} /> : (
        // arrow shafts with dark fletchings
        <g>
          <Line2 d="M-0.4 -16 L0.2 -18.8 M0.6 -15.8 L1.6 -18.2 M-1.4 -16.2 L-1.6 -18.6" w={0.45} c={p.wood} ow={0.3} />
          <path d="M0.2 -18.8 L0 -17.6 M1.6 -18.2 L1.2 -17.1 M-1.6 -18.6 L-1.5 -17.4" stroke={p.crestAlt === p.linen ? p.trim : p.crestAlt} strokeWidth={0.75} strokeLinecap="round" />
        </g>
      )}
      <Shape d="M-1.8 -16.6 L2 -15.8 C1.4 -12.4 -0.6 -9.4 -3.4 -7.6 C-4.8 -7 -6.2 -7.4 -6.4 -8.4 C-5.6 -11 -3.8 -14 -1.8 -16.6 Z" f={p.leather} sw={0.6} />
      <Paint d="M-1.8 -16.6 L-0.4 -16.3 C-1.6 -13.4 -3.4 -10.4 -5.8 -7.4 C-6.2 -7.6 -6.4 -8 -6.4 -8.4 C-5.6 -11 -3.8 -14 -1.8 -16.6 Z" f={p.leatherShade} o={0.7} />
      <Hi d="M-1.4 -15.6 L1.4 -15 M0.6 -13.2 C-0.6 -11.4 -2.2 -9.8 -4.2 -8.6" c={deco} w={0.6} o={1} />
      <circle cx={-1.6} cy={-12.2} r={0.55} fill={deco} />
    </g>
  );
}

export function Rider({ kit, f, standard }: { kit: RiderKit; f: Fig; standard?: JSX.Element }) {
  const { p } = f;
  const fr = useContext(FacingRightCtx);
  const legC = kit.legs === 'trousers' ? p.trousers : f.skin;
  const fs: [number, number] = [-1.6 + UB_DX, -20.4 + UB_DY];
  const ns: [number, number] = [2.2 + UB_DX, -20.6 + UB_DY];
  const sleeve = kit.torso === 'mail' ? p.iron : p.tunic;
  const long = !!kit.longSleeve;
  let behind: JSX.Element | null = null;
  let farArm: JSX.Element | null = null;
  let front: JSX.Element | null = null;
  if (kit.weapon === 'spear') {
    behind = <Spear x1={-6.2} y1={8} x2={5.8 + f.i * 0.6} y2={-34} f={f} w={0.9} blade={3.6} bladeW={1.5} />;
    farArm = <Arm s={fs} e={[-4.4, -3.4]} h={[-1.4, -1.6]} f={f} sleeve={sleeve} long={long} />;
  } else if (kit.weapon === 'lance') {
    behind = <Spear x1={-17} y1={-3.2} x2={22} y2={-20.4} f={f} w={1.0} blade={4.4} bladeW={1.6} butt />;
    farArm = <Arm s={fs} e={[-3.6, -3]} h={[-0.4, -5.8]} f={f} sleeve={sleeve} long={long} />;
  } else if (kit.weapon === 'javelin') {
    behind = <Spear x1={-12.4} y1={-12.4} x2={10.6} y2={-20.4} f={f} w={0.75} blade={2.6} bladeW={1.2} />;
    farArm = <Arm s={fs} e={[-5.6, -10.6]} h={[-4, -15.6]} f={f} sleeve={sleeve} long={long} />;
  } else if (kit.weapon === 'standard') {
    behind = standard ?? null;
    farArm = <Arm s={fs} e={[-5, -3.6]} h={[-2.9, -6.4]} f={f} sleeve={sleeve} long={long} />;
  } else if (kit.weapon === 'bow') {
    farArm = <g transform={UB}><Arm s={[-1.6, -20.4]} e={[-6, -21.6]} h={[-0.2, -22.6]} f={f} sleeve={sleeve} long={long} /></g>;
    front = <g transform={UB}><DrawnBow f={f} sleeve={sleeve} long={long} bow={kit.bow ?? 'self'} /></g>;
  }
  if (kit.spare) {
    front = (
      <g>
        <Spear x1={0.8} y1={6.6} x2={9.6} y2={-16.6} f={f} w={0.6} blade={2.1} bladeW={1.0} />
        <Spear x1={2} y1={6.8} x2={11.4} y2={-15.4} f={f} w={0.6} blade={2.1} bladeW={1.0} />
      </g>
    );
  }
  const turned = !!kit.backShot;
  const turn = (el: JSX.Element) => (turned ? <g transform={TURN}><FacingRightCtx.Provider value={!fr}>{el}</FacingRightCtx.Provider></g> : el);
  // shield-less riders with javelins or a spear hold the reins (and spare javelins) in the near hand
  const reins = kit.shield === 'none' && (kit.weapon === 'javelin' || kit.weapon === 'spear')
    ? <Arm s={ns} e={[4.4, -3.8]} h={[kit.spare ? 5.4 : 7, kit.spare ? -1.6 : -3.4]} f={f} near sleeve={sleeve} long={long} />
    : null;
  const upper = (
    <g transform={`translate(${UB_DX} ${UB_DY})`}>
      <Body f={f} torso={kit.torso} skirt={false} />
      <Head f={f} helmet={kit.helmet} crest={kit.crest} hair={kit.hair ?? 'short'} beard={kit.beard} moustache={kit.moustache} />
    </g>
  );
  const flapC = kit.torso === 'mail' ? p.iron : p.tunic;
  return (
    <>
      {kit.cloak && (
        <g>
          <Shape d="M-2.6 -7.6 C-6.4 -6.6 -9.6 -3.2 -12.8 1.8 C-14.2 4 -15.6 6.2 -16.4 8.2 C-13.6 7.6 -10.6 7.8 -8.4 8.6 C-6.6 4.6 -4.6 0.6 -1.4 -2.6 Z" f={p.cloak} />
          <Paint d="M-12.8 1.8 C-14.2 4 -15.6 6.2 -16.4 8.2 C-13.6 7.6 -10.6 7.8 -8.4 8.6 C-9.4 6.6 -11 4 -12.8 1.8 Z" f={p.cloakShade} />
          <Hi d="M-3.4 -6.4 C-6.4 -4.8 -9 -1.6 -11 1.6" c={lighten(p.cloak, 0.3)} w={0.6} o={0.8} />
        </g>
      )}
      {turned ? turn(<>{behind}{farArm}</>) : <>{behind}{farArm}</>}
      {/* near leg (thigh forward, shin down the horse's flank) */}
      <Line2 d="M-1.2 -0.6 L3.6 2.4 L2.6 8" w={2.7} c={legC} />
      {kit.legs === 'greaves' && <Line2 d="M3.4 3.6 L2.7 7.6" w={2.7} c={p.metal} ow={0.5} />}
      <Line2 d="M2.4 8.4 L4.6 8.8" w={1.4} c={p.leatherShade} />
      {/* tunic flap over the thigh */}
      <Shape d="M-4.4 -1.6 L2 -1.6 C2.8 -0.4 3.6 1.2 4.2 2.6 C2.4 3.4 0.2 3.2 -1.4 2.4 L-4.6 1.2 Z" f={flapC} sw={0.6} />
      <Hi d="M4 2.4 C2.4 3 0.4 3 -1.3 2.2" c={kit.torso === 'mail' ? p.tunic : p.trim} w={0.7} o={1} />
      {turned ? turn(upper) : upper}
      {kit.gorytos && <g transform={UB}><HipGorytos p={p} bow={kit.gorytos === 'bow'} /></g>}
      {reins}
      {turned && front ? turn(front) : front}
      {kit.shield === 'round' && (
        <g>
          <Arm s={ns} e={[4.6, -3.6]} h={[6, -2.4]} f={f} near sleeve={sleeve} long={long} />
          <Shield kind="round" f={f} dx={1.2} dy={14.0} s={1.0} />
        </g>
      )}
      {kit.shield === 'aspis' && <Shield kind="aspis" f={f} dx={0.4 + 0.75 * 0.2} dy={13.4 - 14.4 * 0.25} s={0.75} />}
      {kit.shield === 'oval' && <Shield kind="oval" f={f} dx={0.6} dy={14.6 - 13.8 * 0.25} s={0.75} />}
      {kit.shield === 'none' && (kit.weapon === 'lance' || kit.weapon === 'standard') && (
        <Arm s={ns} e={[4.4, -4.4]} h={[7.2, -4.8]} f={f} near sleeve={sleeve} long={long} />
      )}
    </>
  );
}

export function riderKit(type: UnitType, kit: Kit, i: number): RiderKit {
  const greek = kit === 'greek';
  const punic = kit === 'punic';
  if (type === 'LC') {
    return {
      torso: 'tunic', helmet: punic ? 'none' : greek ? 'pilos' : 'none', crest: 'none', shield: 'round', weapon: 'javelin',
      legs: 'bare', spare: true, beard: punic && i % 2 === 0,
    };
  }
  if (type === 'HC') {
    return {
      torso: greek ? 'muscle' : punic ? 'linen' : 'mail', helmet: greek ? 'attic' : punic ? 'attic' : 'montefortino',
      crest: greek ? 'horsehair' : punic ? 'horsehair' : 'plumes', shield: 'none', weapon: 'lance', legs: greek || punic ? 'greaves' : 'bare',
    };
  }
  return {
    torso: greek ? 'linen' : punic ? 'tunic' : 'tunic', helmet: greek ? 'attic' : punic ? 'conical' : 'montefortino',
    crest: greek ? 'none' : 'knob', shield: 'round', weapon: 'spear', legs: punic ? 'trousers' : 'bare',
  };
}

// ---------------------------------------------------------------------------------------------
// Expansion #1 cavalry: per-kit riders and horse furniture, per-look variants, the Companions

/** The look a palette was resolved from (its style object is the look's own). */
const STYLE_LOOK = new Map<LookStyle, ArmyLook>(
  (Object.keys(LOOKS) as ArmyLook[]).map((look) => [LOOKS[look].style, look]),
);
export function lookOf(p: Palette): ArmyLook | undefined {
  return STYLE_LOOK.get(p.style);
}

/** How one mounted figure is equipped: rider kit, saddle cloth, horse armour, size. */
interface Mount {
  rider: RiderKit;
  cloth: HorseCloth | 'none';
  /** Bronze chamfron and peytral (the base heavy cavalry's barding). */
  barding?: boolean;
  cataphract?: boolean;
  scale: number;
  pose: number;
  /** Offset into the army's horse coats. */
  coat: number;
}

const classicKit = (kit: Kit) => kit === 'roman' || kit === 'punic' || kit === 'greek';

/** Horse archers (LBC) of every kit: drawn bow, gorytos at the hip. */
function horseArcher(kit: Kit, i: number): RiderKit {
  const base = { crest: 'none' as const, shield: 'none' as const, weapon: 'bow' as const, gorytos: 'arrows' as const };
  switch (kit) {
    case 'scythian':
      return { ...base, torso: 'kaftan', helmet: 'scythianCap', legs: 'trousers', longSleeve: true, hair: 'long', beard: true, bow: 'scythian', backShot: i === 0 };
    case 'persian':
      return { ...base, torso: 'tunic', helmet: 'tiara', legs: 'trousers', longSleeve: true, beard: i % 2 === 0, bow: 'scythian', backShot: i === 0 };
    case 'macedonian':
      // Dahae mercenaries from the steppe, and Thracian horse archers in fox-fur-like caps
      return i % 2
        ? { ...base, torso: 'tunic', helmet: 'thracian', legs: 'trousers', longSleeve: true, bow: 'scythian', moustache: true }
        : { ...base, torso: 'kaftan', helmet: 'scythianCap', legs: 'trousers', longSleeve: true, hair: 'long', beard: true, bow: 'scythian', backShot: i === 0 };
    case 'indian':
      return { ...base, torso: 'cotton', helmet: 'turban', legs: 'bare', beard: i % 2 === 0, bow: 'self' };
    case 'punic':
      return { ...base, torso: 'tunic', helmet: 'cap', legs: 'bare', beard: i % 2 === 0, bow: 'scythian' };
    case 'greek':
      return { ...base, torso: 'tunic', helmet: 'pilos', legs: 'bare', bow: 'self' };
    case 'roman':
    default:
      return { ...base, torso: 'tunic', helmet: 'none', legs: 'bare', bow: 'self' };
  }
}

function kitMount(type: UnitType, p: Palette, i: number, elite: EliteId | undefined): Mount {
  const look = lookOf(p);
  const light = type === 'LC' || type === 'LBC';
  const pose = light ? 1 + (i % 2) : type === 'HC' ? 2 * (i % 2) : i % 3;
  const coat = type === 'HC' ? 1 : light ? 2 : 0;
  const m = (rider: RiderKit, cloth: Mount['cloth'], extra: Partial<Mount> = {}): Mount => ({
    rider, cloth, scale: light ? 0.92 : type === 'HC' ? 1.06 : 1, pose, coat, ...extra,
  });
  if (type === 'LBC') return m(horseArcher(p.kit, i), p.kit === 'scythian' || p.kit === 'macedonian' ? 'plain' : 'rich');
  if (classicKit(p.kit)) {
    // only reached for types the base kits never had (all base types keep MountedFigure's base drawing)
    return m(riderKit(type, p.kit, i), 'plain', { barding: type === 'HC' });
  }
  if (elite === 'companions') {
    // Alexander's Companions: Boeotian helmet with white plumes, gilded cuirass, purple cloak, leopard skin, xyston
    return m({ torso: 'muscle', helmet: 'boeotian', crest: 'plume2', shield: 'none', weapon: 'lance', legs: 'bare', cloak: true }, 'leopard', { scale: 1.04 });
  }
  switch (p.kit) {
    case 'macedonian': {
      if (type === 'LC') {
        // Thessalian / Thracian light horse: petasos or Thracian helmet, javelins, painted shield; Seleucid eastern light horse
        if (look === 'seleucid' && i % 2 === 0) {
          return m({ torso: 'tunic', helmet: 'tiara', crest: 'none', shield: 'none', weapon: 'javelin', legs: 'trousers', longSleeve: true, spare: true, beard: true }, 'rich');
        }
        return m({ torso: 'tunic', helmet: i % 2 ? 'thracian' : 'petasos', crest: 'none', shield: 'round', weapon: 'javelin', legs: 'bare', spare: true, cloak: i % 2 === 0 }, 'plain');
      }
      if (type === 'HC') {
        if (look === 'seleucid') {
          // the cataphracts of Magnesia: scale-armoured riders on scale-armoured horses
          return m({ torso: 'scale', helmet: 'phrygian', crest: 'horsehair', shield: 'none', weapon: 'lance', legs: 'trousers', longSleeve: true }, 'none', { cataphract: true, barding: true });
        }
        return m({ torso: 'muscle', helmet: 'boeotian', crest: 'horsehair', shield: 'none', weapon: 'lance', legs: 'greaves' }, 'leopard', { barding: true });
      }
      // MC: linen corslet, Boeotian helmet, xyston
      return m({ torso: 'linen', helmet: 'boeotian', crest: 'none', shield: 'none', weapon: 'lance', legs: 'bare' }, 'plain');
    }
    case 'persian': {
      const dress = { helmet: 'tiara' as const, crest: 'none' as const, legs: 'trousers' as const, longSleeve: true };
      if (type === 'LC') return m({ ...dress, torso: 'tunic', shield: 'none', weapon: 'javelin', spare: true, beard: i % 2 === 0 }, 'rich');
      if (type === 'HC') return m({ ...dress, torso: 'scale', shield: 'none', weapon: 'lance', beard: true }, 'rich', { barding: true });
      return m({ ...dress, torso: 'tunic', shield: 'none', weapon: 'spear', beard: true }, 'rich');
    }
    case 'scythian': {
      const dress = { legs: 'trousers' as const, longSleeve: true, hair: 'long' as const, beard: true, crest: 'none' as const };
      if (type === 'LC') return m({ ...dress, torso: 'kaftan', helmet: 'scythianCap', shield: 'none', weapon: 'javelin', spare: true, gorytos: 'bow' }, 'plain');
      if (type === 'HC') return m({ ...dress, torso: 'scale', helmet: 'conical', shield: 'none', weapon: 'lance', gorytos: 'bow' }, 'plain', { barding: true });
      // noble cavalry in scale coats with Greek-made helmets or caps
      return m({ ...dress, torso: 'scale', helmet: i % 2 ? 'conical' : 'scythianCap', shield: 'none', weapon: 'spear', gorytos: 'bow' }, 'plain');
    }
    case 'indian':
    default: {
      const dress = { helmet: 'turban' as const, crest: 'none' as const, legs: 'bare' as const };
      if (type === 'LC') return m({ ...dress, torso: 'cotton', shield: 'round', weapon: 'javelin', spare: true, beard: i % 2 === 0 }, 'rich');
      if (type === 'HC') return m({ ...dress, torso: 'scale', shield: 'none', weapon: 'lance', beard: true }, 'rich', { barding: true });
      return m({ ...dress, torso: 'cotton', shield: 'round', weapon: 'spear', beard: true }, 'rich');
    }
  }
}

/** Paint of the Companions: purple cloak, white plumes, gilded helmet and cuirass. */
const COMPANIONS: Partial<LookPalette> = {
  cloak: '#6a2a8a', cloakShade: '#3e1452', crest: '#f4eee0', crestShade: '#c4b99c', crestAlt: '#e8c040',
  metal: '#dcae4a', metalShade: '#97691c', metalLight: '#fbe6a2', trim: '#e8c040',
};
const elitePalettes = new WeakMap<Palette, Palette>();
function companionsPalette(p: Palette): Palette {
  let out = elitePalettes.get(p);
  if (!out) elitePalettes.set(p, (out = { ...p, ...COMPANIONS }));
  return out;
}

/** A mounted figure of an Expansion #1 kit, or a horse archer of any kit. */
function KitMounted({ type, p: armyP, i, elite }: { type: UnitType; p: Palette; i: number; elite?: EliteId }) {
  const fp = figurePalette(armyP, i);
  const p = elite === 'companions' ? companionsPalette(fp) : fp;
  const f = makeFig(p, i);
  const mt = kitMount(type, armyP, i, elite);
  const coats = p.horses;
  const h = coats[(i + mt.coat) % coats.length];
  const leopard = mt.cloth === 'leopard';
  const clothC = mt.cloth === 'none' ? undefined : leopard ? LEOPARD : type === 'LC' || type === 'LBC' ? p.saddleShade : p.saddle;
  const trim = leopard ? (elite === 'companions' ? p.gold : undefined) : p.trim;
  // embroidery of a rich saddle cloth: the look's pattern colour, or gold where that is the cloth's own colour
  const pattern = p.pattern && p.pattern !== clothC ? p.pattern : p.gold;
  return (
    <g transform={mt.scale !== 1 ? `scale(${mt.scale})` : undefined}>
      <g transform={`scale(${HORSE_SCALE})`}>
        <Horse
          coat={h.coat}
          shade={h.shade}
          mane={h.mane}
          pose={mt.pose}
          cloth={clothC}
          clothTrim={trim}
          clothKind={mt.cloth === 'none' || mt.cloth === 'plain' ? undefined : mt.cloth}
          clothPattern={pattern}
          barding={mt.barding}
          cataphract={mt.cataphract}
          metal={mt.cataphract ? p.iron : p.metal}
          metalShade={mt.cataphract ? p.ironShade : p.metalShade}
          light={lighten(h.coat, 0.35)}
        />
      </g>
      <g transform={`translate(${SEAT_X} ${SEAT_Y})`}>
        <Rider kit={mt.rider} f={f} />
      </g>
    </g>
  );
}

/** One mounted miniature (LC, MC, HC, LBC). `elite` gives the Companions their own figures. */
export function MountedFigure({ type, p, i, elite }: { type: UnitType; p: Palette; i: number; elite?: EliteId }) {
  if (type === 'LBC' || !classicKit(p.kit)) return <KitMounted type={type} p={p} i={i} elite={elite} />;
  const f = makeFig(p, i);
  const kit = riderKit(type, p.kit, i);
  const coats = p.horses;
  const h = coats[(i + (type === 'HC' ? 1 : type === 'LC' ? 2 : 0)) % coats.length];
  const numidian = type === 'LC' && p.kit === 'punic';
  const scale = type === 'LC' ? 0.92 : type === 'HC' ? 1.06 : 1;
  return (
    <g transform={scale !== 1 ? `scale(${scale})` : undefined}>
      <g transform={`scale(${HORSE_SCALE})`}>
        <Horse
          coat={h.coat}
          shade={h.shade}
          mane={h.mane}
          pose={type === 'LC' ? 1 + (i % 2) : type === 'HC' ? 2 * (i % 2) : i % 3}
          cloth={numidian ? undefined : type === 'LC' ? p.saddleShade : p.saddle}
          clothTrim={numidian ? undefined : p.trim}
          barding={type === 'HC'}
          metal={p.metal}
          metalShade={p.metalShade}
          bridle={!numidian}
          light={lighten(h.coat, 0.35)}
        />
      </g>
      <g transform={`translate(${SEAT_X} ${SEAT_Y})`}>
        <Rider kit={kit} f={f} />
      </g>
    </g>
  );
}

export const HORSE_GEOM = { scale: HORSE_SCALE, seatX: SEAT_X, seatY: SEAT_Y };

// ---------------------------------------------------------------------------------------------
// Half-figures: the crews of elephants, chariots and camels (upper body, arms and weapon)

/** Dress of a crewman (elephant towers, chariots, camel riders). */
export interface CrewDress {
  torso: Torso;
  helmet: Helmet;
  crest: Crest;
  hair?: Hair;
  beard?: boolean;
  moustache?: boolean;
  longSleeve?: boolean;
  legs?: 'bare' | 'trousers' | 'greaves';
}

/** What a crewman does with his hands. `pike`: a long pike levelled forward; `reins`: driving; `goad`: a mahout's hook. */
export type CrewAction = 'javelin' | 'spear' | 'pike' | 'bow' | 'reins' | 'goad' | 'whip';

/** Dress of a crewman of a kit (`i` varies helmets). */
export function crewDress(kit: Kit, i: number): CrewDress {
  switch (kit) {
    case 'roman': return { torso: 'mail', helmet: 'montefortino', crest: i % 2 ? 'plumes' : 'knob' };
    case 'punic': return { torso: 'linen', helmet: i % 2 ? 'attic' : 'conical', crest: i % 2 ? 'horsehair' : 'knob', beard: i % 2 === 0 };
    case 'greek': return { torso: 'linen', helmet: i % 2 ? 'corinthian' : 'pilos', crest: i % 2 ? 'tall' : 'knob' };
    case 'macedonian': return { torso: 'linen', helmet: i % 2 ? 'thracian' : 'phrygian', crest: i % 2 ? 'knob' : 'horsehair' };
    case 'persian': return { torso: 'tunic', helmet: 'tiara', crest: 'none', longSleeve: true, beard: true, legs: 'trousers' };
    case 'scythian': return { torso: 'kaftan', helmet: 'scythianCap', crest: 'none', longSleeve: true, hair: 'long', beard: true, legs: 'trousers' };
    case 'indian':
    default:
      return { torso: 'cotton', helmet: 'turban', crest: 'none', beard: i % 2 === 0 };
  }
}

/**
 * The upper body of a crewman in the rider frame (seat at 0,0, facing right; the waist is at y ≈ -1.4 and the head top
 * at about -17): body, head, both arms and his weapon. `turned`: facing back (mirrored about the spine).
 */
export function HalfFigure({ dress, action, f, bow = 'self', turned = false, shield, aim = 0 }: {
  dress: CrewDress; action: CrewAction; f: Fig; bow?: 'self' | 'scythian'; turned?: boolean; shield?: ShieldKind;
  /** Bow only: aim up (negative degrees) or down, turning the arms and the bow about the shoulders. */
  aim?: number;
}) {
  const { p } = f;
  const fr = useContext(FacingRightCtx);
  const fs: [number, number] = [-1.6 + UB_DX, -20.4 + UB_DY];
  const ns: [number, number] = [2.2 + UB_DX, -20.6 + UB_DY];
  const sleeve = dress.torso === 'mail' ? p.iron : p.tunic;
  const long = !!dress.longSleeve;
  let behind: JSX.Element | null = null;
  let farArm: JSX.Element | null = null;
  let front: JSX.Element | null = null;
  let nearArm: JSX.Element | null = null;
  if (action === 'javelin') {
    behind = <Spear x1={-12.4} y1={-12.4} x2={10.6} y2={-20.4} f={f} w={0.75} blade={2.6} bladeW={1.2} />;
    farArm = <Arm s={fs} e={[-5.6, -10.6]} h={[-4, -15.6]} f={f} sleeve={sleeve} long={long} />;
    nearArm = <Arm s={ns} e={[4.4, -3.8]} h={[6.6, -4.6]} f={f} near sleeve={sleeve} long={long} />;
  } else if (action === 'spear') {
    behind = <Spear x1={-5.8} y1={6} x2={5.4 + f.i * 0.5} y2={-31} f={f} w={0.9} blade={3.6} bladeW={1.5} />;
    farArm = <Arm s={fs} e={[-4.4, -3.4]} h={[-1.6, -4.4]} f={f} sleeve={sleeve} long={long} />;
    nearArm = <Arm s={ns} e={[4.4, -3.8]} h={[6.6, -4.6]} f={f} near sleeve={sleeve} long={long} />;
  } else if (action === 'pike') {
    const x1 = -13;
    const y1 = -1.4;
    const x2 = 24;
    const y2 = -12.6;
    const at = (x: number) => y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
    behind = <Spear x1={x1} y1={y1} x2={x2} y2={y2} f={f} w={0.9} blade={4} bladeW={1.3} butt />;
    farArm = <Arm s={fs} e={[-4, -2.8]} h={[-1.6, Number(at(-1.6).toFixed(2))]} f={f} sleeve={sleeve} long={long} />;
    nearArm = <Arm s={ns} e={[3.6, -3]} h={[5.6, Number(at(5.6).toFixed(2))]} f={f} near sleeve={sleeve} long={long} />;
  } else if (action === 'bow') {
    const t = aim ? `rotate(${aim} 0.4 -7.1) ${UB}` : UB;
    farArm = <g transform={t}><Arm s={[-1.6, -20.4]} e={[-6, -21.6]} h={[-0.2, -22.6]} f={f} sleeve={sleeve} long={long} /></g>;
    front = <g transform={t}><DrawnBow f={f} sleeve={sleeve} long={long} bow={bow} /></g>;
  } else if (action === 'reins' || action === 'whip') {
    farArm = <Arm s={fs} e={[1.2, -3.6]} h={[5.4, -3]} f={f} sleeve={sleeve} long={long} />;
    if (action === 'whip') {
      behind = <path d="M-3.6 -8 C-6 -14 -9.6 -17.4 -14 -18.4" fill="none" stroke={OL} strokeWidth={0.45} />;
      farArm = <Arm s={fs} e={[-4.4, -9.6]} h={[-3.6, -8]} f={f} sleeve={sleeve} long={long} />;
    }
    nearArm = <Arm s={ns} e={[4.4, -4.6]} h={[7, -3.4]} f={f} near sleeve={sleeve} long={long} />;
  } else if (action === 'goad') {
    farArm = <Arm s={fs} e={[-3.6, -3]} h={[-1, -2]} f={f} sleeve={sleeve} long={long} />;
    nearArm = (
      <g>
        <Arm s={ns} e={[4.6, -4.8]} h={[7.4, -5.6]} f={f} near sleeve={sleeve} long={long} />
        <Line2 d="M7.4 -5.6 L11.4 -9.2" w={0.6} c={p.wood} ow={0.4} />
        <path d="M11.4 -9.2 L12.4 -10.4 M11.4 -9.2 C12.6 -9.2 12.8 -8.2 12.2 -7.6" fill="none" stroke={p.ironShade} strokeWidth={0.5} strokeLinecap="round" />
      </g>
    );
  }
  const body = (
    <>
      {behind}
      {farArm}
      <g transform={UB}>
        <Body f={f} torso={dress.torso} skirt={false} />
        <Head f={f} helmet={dress.helmet} crest={dress.crest} hair={dress.hair ?? 'short'} beard={dress.beard} moustache={dress.moustache} />
      </g>
      {nearArm}
      {shield && shield !== 'none' && <Shield kind={shield} f={f} dx={0.4} dy={13} s={0.8} />}
      {front}
    </>
  );
  return turned ? <g transform={TURN}><FacingRightCtx.Provider value={!fr}>{body}</FacingRightCtx.Provider></g> : body;
}

/** Thigh and shin of a seated crewman (rider frame), hanging down the mount's flank. */
export function SeatedLeg({ f, legs = 'bare' }: { f: Fig; legs?: 'bare' | 'trousers' | 'greaves' }) {
  const { p } = f;
  const c = legs === 'trousers' ? p.trousers : f.skin;
  return (
    <>
      <Line2 d="M-1.2 -0.6 L3.6 2.4 L2.6 8" w={2.6} c={c} />
      <Line2 d="M2.4 8.4 L4.4 8.8" w={1.3} c={p.leatherShade} />
      <Shape d="M-4.4 -1.6 L2 -1.6 C2.8 -0.4 3.6 1.2 4.2 2.6 C2.4 3.4 0.2 3.2 -1.4 2.4 L-4.6 1.2 Z" f={p.tunic} sw={0.6} />
      <Hi d="M4 2.4 C2.4 3 0.4 3 -1.3 2.2" c={p.trim} w={0.7} o={1} />
    </>
  );
}
