// Horses and riders (LC, MC, HC, leaders). Facing right, hooves at y = 0.
import type { UnitType } from '../engine/types';
import { darken, lighten } from './color';
import type { Palette } from './palettes';
import {
  Arm, Body, Head, Hi, Line2, OL, Paint, Shape, Shield, Spear, makeFig,
  type Crest, type Fig, type Helmet, type ShieldKind, type Torso,
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

export function Horse({ coat, shade, mane, pose = 0, cloth, clothTrim, barding, metal, metalShade, bridle = true, light }: {
  coat: string; shade: string; mane: string; pose?: number; cloth?: string; clothTrim?: string; barding?: boolean;
  metal?: string; metalShade?: string; bridle?: boolean; light?: string;
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
      {cloth && (
        <g>
          <Shape d="M-7 -15.9 C-3.6 -15 0.8 -15.1 3.6 -16.2 L3.4 -10.6 C-0.4 -9.8 -4.2 -9.9 -7.4 -10.8 Z" f={cloth} sw={0.6} />
          {clothTrim && <Hi d="M3.2 -11 C-0.4 -10.2 -4.2 -10.3 -7.1 -11.2" c={clothTrim} w={0.9} o={1} />}
          <Paint d="M-7 -15.9 C-6 -15.6 -5 -15.4 -4.2 -15.3 L-4.4 -10.2 C-5.4 -10.4 -6.4 -10.6 -7.4 -10.8 Z" f={darken(cloth, 0.3)} mx={-1.9} />
        </g>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Riders

export interface RiderKit {
  torso: Torso;
  helmet: Helmet;
  crest: Crest;
  shield: ShieldKind;
  weapon: 'spear' | 'lance' | 'javelin' | 'standard';
  legs: 'bare' | 'trousers' | 'greaves';
  cloak?: boolean;
  beard?: boolean;
  spare?: boolean;
}

const HORSE_SCALE = 1.12;
const SEAT_X = -1.4 * HORSE_SCALE;
const SEAT_Y = -15.5 * HORSE_SCALE;
/** Shift that maps the standing-figure upper body onto the saddle. */
const UB_DX = -0.6;
const UB_DY = 13.4;

export function Rider({ kit, f, standard }: { kit: RiderKit; f: Fig; standard?: JSX.Element }) {
  const { p } = f;
  const legC = kit.legs === 'trousers' ? p.trousers : f.skin;
  const fs: [number, number] = [-1.6 + UB_DX, -20.4 + UB_DY];
  const ns: [number, number] = [2.2 + UB_DX, -20.6 + UB_DY];
  const sleeve = kit.torso === 'mail' ? p.iron : p.tunic;
  let behind: JSX.Element | null = null;
  let farArm: JSX.Element | null = null;
  let front: JSX.Element | null = null;
  if (kit.weapon === 'spear') {
    behind = <Spear x1={-6.2} y1={8} x2={5.8 + f.i * 0.6} y2={-34} f={f} w={0.9} blade={3.6} bladeW={1.5} />;
    farArm = <Arm s={fs} e={[-4.4, -3.4]} h={[-1.4, -1.6]} f={f} sleeve={sleeve} />;
  } else if (kit.weapon === 'lance') {
    behind = <Spear x1={-17} y1={-3.2} x2={22} y2={-20.4} f={f} w={1.0} blade={4.4} bladeW={1.6} butt />;
    farArm = <Arm s={fs} e={[-3.6, -3]} h={[-0.4, -5.8]} f={f} sleeve={sleeve} />;
  } else if (kit.weapon === 'javelin') {
    behind = <Spear x1={-12.4} y1={-12.4} x2={10.6} y2={-20.4} f={f} w={0.75} blade={2.6} bladeW={1.2} />;
    farArm = <Arm s={fs} e={[-5.6, -10.6]} h={[-4, -15.6]} f={f} sleeve={sleeve} />;
  } else if (kit.weapon === 'standard') {
    behind = standard ?? null;
    farArm = <Arm s={fs} e={[-5, -3.6]} h={[-2.9, -6.4]} f={f} sleeve={sleeve} />;
  }
  if (kit.spare) {
    front = (
      <g>
        <Spear x1={0.8} y1={6.6} x2={9.6} y2={-16.6} f={f} w={0.6} blade={2.1} bladeW={1.0} />
        <Spear x1={2} y1={6.8} x2={11.4} y2={-15.4} f={f} w={0.6} blade={2.1} bladeW={1.0} />
      </g>
    );
  }
  return (
    <>
      {kit.cloak && (
        <g>
          <Shape d="M-2.6 -7.6 C-6.4 -6.6 -9.6 -3.2 -12.8 1.8 C-14.2 4 -15.6 6.2 -16.4 8.2 C-13.6 7.6 -10.6 7.8 -8.4 8.6 C-6.6 4.6 -4.6 0.6 -1.4 -2.6 Z" f={p.cloak} />
          <Paint d="M-12.8 1.8 C-14.2 4 -15.6 6.2 -16.4 8.2 C-13.6 7.6 -10.6 7.8 -8.4 8.6 C-9.4 6.6 -11 4 -12.8 1.8 Z" f={p.cloakShade} />
          <Hi d="M-3.4 -6.4 C-6.4 -4.8 -9 -1.6 -11 1.6" c={lighten(p.cloak, 0.3)} w={0.6} o={0.8} />
        </g>
      )}
      {behind}
      {farArm}
      {/* near leg (thigh forward, shin down the horse's flank) */}
      <Line2 d="M-1.2 -0.6 L3.6 2.4 L2.6 8" w={2.7} c={legC} />
      {kit.legs === 'greaves' && <Line2 d="M3.4 3.6 L2.7 7.6" w={2.7} c={p.metal} ow={0.5} />}
      <Line2 d="M2.4 8.4 L4.6 8.8" w={1.4} c={p.leatherShade} />
      {/* tunic flap over the thigh */}
      <Shape d="M-4.4 -1.6 L2 -1.6 C2.8 -0.4 3.6 1.2 4.2 2.6 C2.4 3.4 0.2 3.2 -1.4 2.4 L-4.6 1.2 Z" f={kit.torso === 'mail' ? p.iron : p.tunic} sw={0.6} />
      <Hi d="M4 2.4 C2.4 3 0.4 3 -1.3 2.2" c={kit.torso === 'mail' ? p.tunic : p.trim} w={0.7} o={1} />
      <g transform={`translate(${UB_DX} ${UB_DY})`}>
        <Body f={f} torso={kit.torso} skirt={false} />
        <Head f={f} helmet={kit.helmet} crest={kit.crest} hair="short" beard={kit.beard} />
      </g>
      {front}
      {kit.shield === 'round' && (
        <g>
          <Arm s={ns} e={[4.6, -3.6]} h={[6, -2.4]} f={f} near sleeve={sleeve} />
          <Shield kind="round" f={f} dx={1.2} dy={14.0} s={1.0} />
        </g>
      )}
      {kit.shield === 'aspis' && <Shield kind="aspis" f={f} dx={0.4 + 0.75 * 0.2} dy={13.4 - 14.4 * 0.25} s={0.75} />}
      {kit.shield === 'oval' && <Shield kind="oval" f={f} dx={0.6} dy={14.6 - 13.8 * 0.25} s={0.75} />}
      {kit.shield === 'none' && (kit.weapon === 'lance' || kit.weapon === 'standard') && (
        <Arm s={ns} e={[4.4, -4.4]} h={[7.2, -4.8]} f={f} near sleeve={sleeve} />
      )}
    </>
  );
}

export function riderKit(type: UnitType, faction: Palette['faction'], i: number): RiderKit {
  const greek = faction === 'syracuse';
  const punic = faction === 'carthage';
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

export function MountedFigure({ type, p, i }: { type: UnitType; p: Palette; i: number }) {
  const f = makeFig(p, i);
  const kit = riderKit(type, p.faction, i);
  const coats = p.horses;
  const h = coats[(i + (type === 'HC' ? 1 : type === 'LC' ? 2 : 0)) % coats.length];
  const numidian = type === 'LC' && p.faction === 'carthage';
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
