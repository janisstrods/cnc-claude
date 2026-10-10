// Leaders: a compact portrait medallion when attached to a unit, or a mounted general with a standard when alone.
import { memo } from 'react';
import type { ArmyLook, Blocks } from '../engine/types';
import { darken, lighten } from './color';
import { KITS } from './kits';
import { leaderLook, paletteFor, type Finial, type LeaderLook, type Palette } from './palettes';
import { WingPair } from './exp2-parts';
import { Emblem, FacingRightCtx, Head, Hi, Line2, OL, Paint, Shape, makeFig, type Fig } from './parts';
import { HORSE_GEOM, Horse, Rider } from './mounted';
import { BasePlate } from './token';

/** Where the board should place an attached leader token, relative to the unit hex centre. */
export const LEADER_ATTACH_OFFSET = { x: 29, y: -28 } as const;

/** The army standard (pole + hanging banner) drawn in a rider's frame (seat at 0,0). */
export function Standard({ p, x1 = -3.8, y1 = 6, x2 = -0.6, y2 = -41 }: { p: Palette; x1?: number; y1?: number; x2?: number; y2?: number }) {
  if (p.style.standard === 'parasol') return <Parasol p={p} x1={x1} y1={y1} x2={x2} y2={y2} />;
  if (p.style.standard === 'carnyx') return <Carnyx p={p} x1={x1} y1={y1} x2={x2} y2={y2} />;
  if (p.style.standard === 'aquila') return <Aquila p={p} x1={x1} y1={y1} x2={x2} y2={y2} />;
  const cx = x2 - 0.2;
  const top = y2 + 4.6;
  const w = 13.6;
  const h = 12.4;
  const l = cx - w / 2;
  const r = cx + w / 2;
  return (
    <g>
      <Line2 d={`M${x1} ${y1} L${x2} ${y2}`} w={1.0} c={p.wood} ow={0.6} />
      <Shape
        d={`M${l} ${top} L${r} ${top} L${r} ${top + h} L${r - w / 4} ${top + h - 1.6} L${cx} ${top + h} L${l + w / 4} ${top + h - 1.6} L${l} ${top + h} Z`}
        f={p.banner}
        sw={0.7}
      />
      <Paint d={`M${l} ${top} L${l + 3} ${top} L${l + 3} ${top + h - 0.6} L${l} ${top + h} Z`} f={p.bannerShade} o={0.8} mx={cx} />
      <Hi d={`M${l + 0.6} ${top + h - 1.4} L${l + w / 4} ${top + h - 2.6} L${cx} ${top + h - 1} L${r - w / 4} ${top + h - 2.6} L${r - 0.6} ${top + h - 1.4}`} c={p.gold} w={0.8} o={1} />
      <BannerDevice p={p} cx={cx} cy={top + h / 2 - 0.4} />
      <Line2 d={`M${l - 1} ${top} L${r + 1} ${top}`} w={0.9} c={p.gold} ow={0.5} />
      <circle cx={l - 1} cy={top} r={0.8} fill={p.gold} stroke={OL} strokeWidth={0.4} />
      <circle cx={r + 1} cy={top} r={0.8} fill={p.gold} stroke={OL} strokeWidth={0.4} />
      {/* finial */}
      <FinialEl p={p} kind={p.style.finial} x={x2} y={y2} />
    </g>
  );
}

/** The royal parasol (chattra) of the Indian kings, in the side's colour. */
function Parasol({ p, x1, y1, x2, y2 }: { p: Palette; x1: number; y1: number; x2: number; y2: number }) {
  const cx = x2;
  const top = y2 + 3;
  const w = 9.4;
  const scallops = Array.from({ length: 6 }, (_, k) => {
    const a = cx - w + (k * 2 * w) / 6;
    return `M${a.toFixed(2)} ${(top + 6).toFixed(2)} q${(w / 6).toFixed(2)} 2 ${(w / 3).toFixed(2)} 0`;
  }).join(' ');
  return (
    <g>
      <Line2 d={`M${x1} ${y1} L${x2} ${y2}`} w={1.0} c={p.wood} ow={0.6} />
      <path d={scallops} fill="none" stroke={p.gold} strokeWidth={1.1} strokeLinecap="round" />
      <path d={scallops} fill="none" stroke={OL} strokeWidth={0.35} strokeLinecap="round" opacity={0.6} />
      <Shape d={`M${cx - w} ${top + 6} C${cx - w + 1} ${top + 1} ${cx - 4} ${top - 2.4} ${cx} ${top - 2.4} C${cx + 4} ${top - 2.4} ${cx + w - 1} ${top + 1} ${cx + w} ${top + 6} Z`} f={p.banner} sw={0.7} />
      <Paint d={`M${cx - w} ${top + 6} C${cx - w + 1} ${top + 1} ${cx - 4} ${top - 2.4} ${cx} ${top - 2.4} C${cx - 3.2} ${top - 1.2} ${cx - 5.4} ${top + 2} ${cx - 5.6} ${top + 6} Z`} f={p.bannerShade} o={0.75} mx={cx} />
      <Hi d={`M${cx} ${top - 2.2} L${cx - 6.2} ${top + 5.6} M${cx} ${top - 2.2} L${cx} ${top + 5.8} M${cx} ${top - 2.2} L${cx + 6.2} ${top + 5.6}`} c={p.gold} w={0.5} o={0.9} />
      <Line2 d={`M${cx - w} ${top + 6} L${cx + w} ${top + 6}`} w={0.8} c={p.gold} ow={0.45} />
      <FinialEl p={p} kind={p.style.finial} x={cx} y={top - 2.6} />
    </g>
  );
}

const n2 = (v: number) => v.toFixed(2);

/**
 * The Celtic carnyx: a tall bronze war trumpet whose bell is a boar's head with open jaws and a bristling crest, a streamer
 * in the side colour tied under the head.
 */
function Carnyx({ p, x1, y1, x2, y2 }: { p: Palette; x1: number; y1: number; x2: number; y2: number }) {
  const t = `translate(${n2(x2)} ${n2(y2)})`;
  return (
    <g>
      <Line2 d={`M${x1} ${y1} L${n2(x1 + 1.6)} ${n2(y1 + 1.4)}`} w={1.2} c={p.metal} ow={0.5} />
      <Line2 d={`M${x1} ${y1} L${n2(x2 - 0.6)} ${n2(y2 + 3.6)}`} w={1.25} c={p.metal} ow={0.6} />
      <Hi d={`M${n2(x1 + 0.3)} ${n2(y1 - 2)} L${n2(x2 - 0.2)} ${n2(y2 + 5)}`} c={p.metalLight} w={0.35} o={0.8} />
      <g transform={t}>
        {/* streamer in the side colour */}
        <Shape d="M-0.6 5.2 C-3.4 5.4 -6.6 7.4 -10.6 6.6 L-9.8 8.4 L-11 9.6 C-7 10.4 -3.6 9 -0.4 8.4 Z" f={p.banner} sw={0.6} />
        <Paint d="M-10.6 6.6 L-9.8 8.4 L-11 9.6 C-9.4 9.9 -7.8 9.8 -6.4 9.4 C-7.6 8.6 -9 7.4 -10.6 6.6 Z" f={p.bannerShade} o={0.85} />
        <Hi d="M-1 6.4 C-3.6 6.8 -6.4 8 -9.2 7.8" c={lighten(p.banner, 0.35)} w={0.45} o={0.8} />
        {/* boar's head bell */}
        <Shape d="M-2 4 C-2.6 1 -1.6 -1.6 0.8 -2.4 C2.4 -2.8 3.8 -2 5.4 -0.6 L6.6 0.4 L6.2 1.4 L4.2 1.2 L5.6 2.8 L5.2 3.4 L2.6 2.6 C1.4 3.6 0.2 4.4 -2 4 Z" f={p.metal} sw={0.55} />
        <path d="M-1.4 -0.6 L-1.6 -2.2 L-0.6 -1.6 L-0.4 -3.2 L0.4 -2.2 L0.9 -3.6 L1.5 -2.4 L2.3 -3.4 L2.6 -2.2 Z" fill={p.metalShade} stroke={OL} strokeWidth={0.4} strokeLinejoin="round" />
        <path d="M4.2 1.2 L5.6 2.8" stroke={OL} strokeWidth={0.45} />
        <path d="M4.6 1.3 L5.1 1.9 L4.4 2.1 Z" fill="#b8302e" />
        <circle cx={2.6} cy={-0.6} r={0.42} fill={OL} />
        <Shape d="M1 -1.6 L0.6 -3.4 L2 -2 Z" f={p.metal} sw={0.4} />
        <Hi d="M-0.8 0.4 C0.2 -1 1.6 -1.6 3.4 -1.2" c={p.metalLight} w={0.45} o={0.9} />
      </g>
    </g>
  );
}

/** Jupiter's thunderbolt of the aquila, under the eagle's talons. */
const AQUILA_BOLT = 'M-2.8 0.4 L2.8 0.4 M-2.2 0.4 L-1.6 1.4 L-1 0.4 M1 0.4 L1.6 1.4 L2.2 0.4';

/** The legion's eagle: a gold eagle with raised wings on a thunderbolt, a gold wreath, and a vexillum in the side colour. */
function Aquila({ p, x1, y1, x2, y2 }: { p: Palette; x1: number; y1: number; x2: number; y2: number }) {
  const cx = x2 - 0.2;
  const top = y2 + 9.2;
  const w = 10.4;
  const h = 8.2;
  const l = cx - w / 2;
  const r = cx + w / 2;
  return (
    <g>
      <Line2 d={`M${x1} ${y1} L${x2} ${y2}`} w={1.0} c={p.wood} ow={0.6} />
      {/* vexillum */}
      <Shape d={`M${n2(l)} ${n2(top)} L${n2(r)} ${n2(top)} L${n2(r)} ${n2(top + h)} L${n2(l)} ${n2(top + h)} Z`} f={p.banner} sw={0.7} />
      <Paint d={`M${n2(l)} ${n2(top)} L${n2(l + 2.4)} ${n2(top)} L${n2(l + 2.4)} ${n2(top + h)} L${n2(l)} ${n2(top + h)} Z`} f={p.bannerShade} o={0.8} mx={cx} />
      <path d={`M${n2(l + 0.6)} ${n2(top + h)} L${n2(l + 0.6)} ${n2(top + h + 1.4)} M${n2(l + 2.4)} ${n2(top + h)} L${n2(l + 2.4)} ${n2(top + h + 1.4)} M${n2(cx - 0.6)} ${n2(top + h)} L${n2(cx - 0.6)} ${n2(top + h + 1.4)} M${n2(cx + 1.2)} ${n2(top + h)} L${n2(cx + 1.2)} ${n2(top + h + 1.4)} M${n2(r - 0.6)} ${n2(top + h)} L${n2(r - 0.6)} ${n2(top + h + 1.4)}`} stroke={p.gold} strokeWidth={0.6} />
      <BannerDevice p={p} cx={cx} cy={top + h / 2} />
      <Line2 d={`M${n2(l - 0.8)} ${n2(top)} L${n2(r + 0.8)} ${n2(top)}`} w={0.8} c={p.gold} ow={0.45} />
      {/* wreath */}
      <circle cx={n2(x2 + 0.1)} cy={n2(y2 + 4.6)} r={1.7} fill="none" stroke={OL} strokeWidth={1.3} />
      <circle cx={n2(x2 + 0.1)} cy={n2(y2 + 4.6)} r={1.7} fill="none" stroke={p.gold} strokeWidth={0.6} strokeDasharray="0.9 0.35" />
      {/* the eagle on its thunderbolt */}
      <g transform={`translate(${n2(x2)} ${n2(y2 + 0.6)})`}>
        <path d={AQUILA_BOLT} fill="none" stroke={OL} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
        <path d={AQUILA_BOLT} fill="none" stroke={p.gold} strokeWidth={0.5} strokeLinecap="round" strokeLinejoin="round" />
        <g fill={p.gold} stroke={OL} strokeWidth={0.4} strokeLinejoin="round">
          <WingPair spread={0.4} y={-2.4} s={1.2} />
          <path d="M-0.7 -0.6 L0 0.6 L0.7 -0.6 Z" />
          <ellipse cx={0} cy={-2.5} rx={1.15} ry={2} />
          <circle cx={0.5} cy={-4.9} r={0.85} />
          <path d="M1.2 -5.2 L2.1 -4.8 L1.2 -4.4 Z" />
        </g>
        <Hi d="M-2.8 -7.2 C-2.4 -5.8 -1.6 -4.6 -0.8 -4" c={p.goldShade} w={0.35} o={1} />
        <Hi d="M2.8 -7.2 C2.4 -5.8 1.6 -4.6 0.8 -4" c={p.goldShade} w={0.35} o={1} />
      </g>
    </g>
  );
}

const FINIAL_FIG = new WeakMap<Palette, Fig>();
function figOf(p: Palette): Fig {
  let f = FINIAL_FIG.get(p);
  if (!f) FINIAL_FIG.set(p, (f = makeFig(p, 0)));
  return f;
}

/** Pole-top ornament of the standard at (x, y). */
function FinialEl({ p, kind, x, y }: { p: Palette; kind: Finial; x: number; y: number }) {
  if (
    kind === 'star' || kind === 'royalEagle' || kind === 'wheel' || kind === 'trident' || kind === 'stag'
    || kind === 'boar' || kind === 'bull' || kind === 'pileus' || kind === 'starCrescent' || kind === 'fawn'
  ) {
    const s = kind === 'wheel' ? 0.62 : 0.7;
    return (
      <g>
        <Line2 d={`M${x} ${y + 1} L${x} ${y - 1.2}`} w={0.8} c={p.gold} ow={0.45} />
        {kind === 'royalEagle'
          ? <RoyalEagle p={p} x={x} y={y - 2.6} />
          : <Emblem kind={kind} cx={x} cy={y - 2.8} s={s} f={figOf(p)} c={p.gold} bg={p.goldShade} />}
      </g>
    );
  }
  if (kind === 'spearhead') {
    return (
      <g>
        <path d={`M${x} ${y - 5} L${x + 1.2} ${y - 1.4} L${x + 0.5} ${y + 0.4} L${x - 0.5} ${y + 0.4} L${x - 1.2} ${y - 1.4} Z`} fill={p.gold} stroke={OL} strokeWidth={0.45} strokeLinejoin="round" />
        <Hi d={`M${x} ${y - 4.2} L${x} ${y - 0.2}`} c={p.goldShade} w={0.35} o={1} />
      </g>
    );
  }
  return <BaseFinial p={p} kind={kind} x2={x} y2={y} />;
}

/** The golden eagle with spread wings on the Persian royal standard. */
function RoyalEagle({ p, x, y }: { p: Palette; x: number; y: number }) {
  const t = `translate(${x} ${y})`;
  return (
    <g transform={t} fill={p.gold} stroke={OL} strokeWidth={0.4} strokeLinejoin="round">
      <path d="M0 -0.4 C-1.2 -1.8 -3 -2.6 -4.6 -2 C-3.8 -1.4 -3.6 -0.8 -3.8 -0.2 C-3 -0.6 -2.2 -0.4 -1.6 0.2 C-2.2 0.4 -2.4 0.9 -2.2 1.3 C-1.4 0.8 -0.8 1 -0.4 1.4 Z" />
      <path d="M0 -0.4 C1.2 -1.8 3 -2.6 4.6 -2 C3.8 -1.4 3.6 -0.8 3.8 -0.2 C3 -0.6 2.2 -0.4 1.6 0.2 C2.2 0.4 2.4 0.9 2.2 1.3 C1.4 0.8 0.8 1 0.4 1.4 Z" />
      <ellipse cx={0} cy={0.6} rx={0.8} ry={1.6} />
      <circle cx={0.4} cy={-1.3} r={0.7} />
      <path d="M1 -1.4 L1.8 -1.1 L1 -0.8 Z" />
    </g>
  );
}

function BaseFinial({ p, kind, x2, y2 }: { p: Palette; kind: Finial; x2: number; y2: number }) {
  return (
    <>
      {kind === 'eagle' ? (
        <path d={`M${x2 - 2.6} ${y2 + 0.6} C${x2 - 1.6} ${y2 - 1.4} ${x2 - 0.6} ${y2 - 1} ${x2} ${y2 - 3} C${x2 + 0.6} ${y2 - 1} ${x2 + 1.6} ${y2 - 1.4} ${x2 + 2.6} ${y2 + 0.6} C${x2 + 1.4} ${y2 + 0.2} ${x2 + 0.6} ${y2 + 1} ${x2} ${y2 + 1.6} C${x2 - 0.6} ${y2 + 1} ${x2 - 1.4} ${y2 + 0.2} ${x2 - 2.6} ${y2 + 0.6} Z`} fill={p.gold} stroke={OL} strokeWidth={0.5} />
      ) : kind === 'crescent' ? (
        <g fill={p.gold} stroke={OL} strokeWidth={0.45}>
          <circle cx={x2} cy={y2 - 1.6} r={1.4} />
          <path d={`M${x2 - 2.4} ${y2 + 0.2} A 2.4 2.2 0 0 0 ${x2 + 2.4} ${y2 + 0.2} A 1.9 1.4 0 0 1 ${x2 - 2.4} ${y2 + 0.2} Z`} />
        </g>
      ) : (
        <path d={`M${x2} ${y2 - 3.4} L${x2 + 1.3} ${y2} L${x2} ${y2 + 1.2} L${x2 - 1.3} ${y2} Z`} fill={p.gold} stroke={OL} strokeWidth={0.45} />
      )}
    </>
  );
}

function BannerDevice({ p, cx, cy }: { p: Palette; cx: number; cy: number }) {
  const device = p.style.device;
  if (device !== 'carthage' && device !== 'syracuse' && device !== 'wreath') {
    return <Emblem kind={device} cx={cx} cy={cy} s={1.25} f={figOf(p)} c={p.bannerEmblem} bg={p.banner} />;
  }
  if (device === 'carthage') {
    return (
      <g fill={p.bannerEmblem} stroke={darken(p.bannerEmblem, 0.5)} strokeWidth={0.35}>
        <circle cx={cx} cy={cy - 1.6} r={1.5} />
        <path d={`M${cx - 3} ${cy + 0.2} A 3 2.8 0 0 0 ${cx + 3} ${cy + 0.2} A 2.4 1.9 0 0 1 ${cx - 3} ${cy + 0.2} Z`} />
      </g>
    );
  }
  if (device === 'syracuse') {
    return (
      <g>
        <circle cx={cx} cy={cy} r={3} fill="none" stroke={p.bannerEmblem} strokeWidth={1.1} />
        <circle cx={cx} cy={cy} r={1.1} fill={p.bannerEmblem} />
      </g>
    );
  }
  // Rome: laurel wreath around a gold boss
  return (
    <g>
      <path d={`M${cx - 0.6} ${cy + 3.4} C${cx - 4} ${cy + 2.6} ${cx - 4.2} ${cy - 2.4} ${cx - 1.4} ${cy - 3.6} M${cx + 0.6} ${cy + 3.4} C${cx + 4} ${cy + 2.6} ${cx + 4.2} ${cy - 2.4} ${cx + 1.4} ${cy - 3.6}`} fill="none" stroke={p.bannerEmblem} strokeWidth={1.1} strokeLinecap="round" strokeDasharray="1.4 0.6" />
      <circle cx={cx} cy={cy} r={1.2} fill={p.bannerEmblem} />
    </g>
  );
}

/**
 * Mounted general with cloak and standard, facing right, hooves at y = 0: his kit's general (`KITS[kit].general`), or a
 * named leader's own figure (`leader`, from `LEADER_LOOKS`).
 */
export function MountedGeneral({ p, leader }: { p: Palette; leader?: LeaderLook }) {
  const gp = generalPalette(p, leader);
  const f = makeFig(gp, 1);
  const def = KITS[p.kit].general;
  // the look's general helmet and crest (Theban, Spartan, Pyrrhus' horns) and horse replace the kit's
  const g = p.style.general;
  const lookRider = g?.helmet || g?.crest ? { ...def.rider, helmet: g.helmet ?? def.rider.helmet, crest: g.crest ?? def.rider.crest } : def.rider;
  const rider = leader?.rider ? { ...lookRider, ...leader.rider } : lookRider;
  const horse = leader?.horse ?? g?.horse ?? def.horse ?? p.horses[0];
  const ub = 'translate(-0.6 13.4)';
  return (
    <g>
      <g transform={`scale(${HORSE_GEOM.scale})`}>
        <Horse coat={horse.coat} shade={horse.shade} mane={horse.mane} pose={2} cloth={gp.saddle} clothTrim={p.gold} light={lighten(horse.coat, 0.5)} />
      </g>
      <g transform={`translate(${HORSE_GEOM.seatX} ${HORSE_GEOM.seatY})`}>
        <Rider kit={rider} f={f} standard={<Standard p={p} x1={-3.8} y1={6} x2={-0.9} y2={-40} />} />
        {/* gold torque of rank */}
        {def.torque && <g transform={ub}>
          <Line2 d="M-0.8 -21.6 C0.2 -20.9 1.4 -20.9 2.4 -21.6" w={0.75} c={p.gold} ow={0.4} />
          {def.jewel && <circle cx={0.4} cy={-24.4} r={0.45} fill={p.gold} stroke={OL} strokeWidth={0.25} />}
        </g>}
        {def.gorytos && <ScythianGorytos p={gp} />}
      </g>
      <path d="M5.8 -22.4 Q11 -19.6 16.6 -20.6" fill="none" stroke="#3a2416" strokeWidth={0.55} />
    </g>
  );
}

/** The chief's gold-plated gorytos on the saddle (rider frame). */
function ScythianGorytos({ p }: { p: Palette }) {
  const deco = p.pattern ?? p.gold;
  return (
    <g>
      <Line2 d="M-6.4 0.6 C-8 -1.4 -10 -2.2 -12.4 -1.6" w={0.85} c={p.wood} ow={0.5} />
      <Shape d="M-5.6 0.2 L-2.6 1.2 C-3.2 3.8 -5 6 -7.4 7 C-8.6 7.4 -9.6 7 -9.6 6.2 C-8.8 4.2 -7.4 2.2 -5.6 0.2 Z" f={p.leather} sw={0.55} />
      <Hi d="M-5.2 1 L-3.2 1.6 M-4.4 3.2 C-5.4 4.6 -6.6 5.6 -8.2 6.2" c={deco} w={0.55} o={1} />
    </g>
  );
}

/** Generals wear gilded bronze (and their look's general colours, then a named leader's own). */
export function generalPalette(p: Palette, leader?: LeaderLook): Palette {
  const g = p.style.general;
  const own = leader?.colours;
  if (g) {
    const { horse: _h, helmet: _he, crest: _c, ...colours } = g;
    return { ...p, metal: '#dcae4a', metalShade: '#97691c', metalLight: '#fbe6a2', ...colours, ...own };
  }
  return { ...p, metal: '#dcae4a', metalShade: '#97691c', metalLight: '#fbe6a2', ...own };
}

const CAMEO = '#f1e5c6';

/**
 * Head-and-shoulders portrait used in the attached-leader medallion (facing right, centred on 0,0, cameo field r = 8).
 * The look's general helmet and crest (Theban, Spartan, Pyrrhus' horns) replace the kit's, as on the mounted general.
 */
function Bust({ f, leader }: { f: Fig; leader?: LeaderLook }) {
  const { p } = f;
  const b = leader?.bust ? { ...KITS[p.kit].bust, ...leader.bust } : KITS[p.kit].bust;
  const g = p.style.general;
  const helmet = leader?.bust?.helmet ?? g?.helmet ?? b.helmet;
  const crest = leader?.bust?.crest ?? g?.crest ?? b.crest;
  const eastern = !!b.robe;
  const chest = b.chest;
  return (
    <>
      <g transform="translate(-0.75 24.4) scale(1.05)">
        <Head f={f} helmet={helmet} crest={crest} beard={b.beard} hair={b.hair} moustache={b.moustache} torc={b.torc} />
      </g>
      {/* cloak across the shoulders */}
      <Shape d="M-7.63 2.4 C-5.8 1.4 -3.4 1.2 0 1.5 C3.4 1.7 5.8 2 7.63 2.4 A 8 8 0 0 1 -7.63 2.4 Z" f={p.cloak} sw={0.6} />
      <Paint d="M-7.63 2.4 C-6.6 1.9 -5.6 1.6 -4.4 1.5 C-5.2 3.6 -5.2 5.4 -4.6 6.55 A 8 8 0 0 1 -7.63 2.4 Z" f={p.cloakShade} mx={0} />
      {chest ? <BustChest p={p} chest={chest} /> : (
        <>
          {/* gilded cuirass (eastern lords: an embroidered robe) */}
          <Shape d={CHEST} f={eastern ? p.tunic : p.metal} sw={0.55} />
          {eastern
            ? <Hi d="M0.6 2 L0.9 7.6 M-1.8 3.4 L-1.6 3.4 M2.6 4.4 L2.8 4.4 M-1.4 5.8 L-1.2 5.8" c={p.pattern ?? p.gold} w={0.6} o={1} />
            : <Hi d="M0 4 C1 3.7 2.2 3.9 2.8 4.6 M-0.4 6.4 C0.8 6 2 6.2 2.9 6.8" c={p.metalShade} w={0.4} />}
          {!eastern && <Hi d="M-1.6 2.6 C-0.6 2.2 0.8 2.2 1.8 2.5" c={p.metalLight} w={0.5} />}
        </>
      )}
      <circle cx={3.3} cy={2.9} r={0.8} fill={p.gold} stroke={OL} strokeWidth={0.35} />
    </>
  );
}

const CHEST = 'M-2.6 2.4 C-1 1.8 1.8 1.8 3.4 2.6 C3.9 4.2 3.9 5.8 3.4 7.24 A 8 8 0 0 1 -2.6 7.57 C-2.9 6 -3 4.2 -2.6 2.4 Z';

/** The chest of a portrait in mail (Celtic and Germanic chiefs) or a plain tunic. */
function BustChest({ p, chest }: { p: Palette; chest: 'mail' | 'tunic' }) {
  const mail = chest === 'mail';
  return (
    <>
      <Shape d={CHEST} f={mail ? p.iron : p.tunic} sw={0.55} />
      <Hi d="M-2.2 4 C-0.6 4.4 1.6 4.4 3.6 3.9 M-2.4 5.8 C-0.6 6.2 1.6 6.2 3.6 5.7" c={mail ? p.ironShade : p.tunicShade} w={0.45} o={0.9} />
      <Hi d="M-1.6 2.5 C-0.6 2.1 0.8 2.1 1.8 2.4" c={mail ? p.ironLight : p.trim} w={0.5} o={0.9} />
    </>
  );
}

export interface LeaderTokenProps {
  look: ArmyLook;
  blockColor: Blocks;
  /** The block set of the leader's own command when it differs from his side's: the base edge of a leader alone. */
  edgeBlocks?: Blocks;
  facing: 'left' | 'right';
  attached: boolean;
  name?: string;
  showName?: boolean;
}

function NameRibbon({ name, y, p }: { name: string; y: number; p: Palette }) {
  const w = Math.max(22, name.length * 5.7 + 8);
  return (
    <g>
      <rect x={-w / 2} y={y - 5.8} width={w} height={11} rx={2.6} fill="#17110c" opacity={0.92} stroke={p.gold} strokeWidth={0.6} />
      <text x={0} y={y + 2.6} textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight={700} fontSize={7.8} fill="#fbf1d6">
        {name}
      </text>
    </g>
  );
}

function LeaderTokenImpl({ look, blockColor, edgeBlocks, facing, attached, name, showName }: LeaderTokenProps) {
  const p = paletteFor(look, blockColor);
  const flip = facing === 'left' ? -1 : 1;
  const leader = leaderLook(name);
  if (attached) {
    const f = makeFig(generalPalette(p, leader), 1);
    return (
      <g>
        <circle cx={0.8} cy={1.2} r={11} fill="#000" opacity={0.35} />
        <circle cx={0} cy={0} r={10.8} fill={p.gold} stroke={OL} strokeWidth={0.9} />
        <circle cx={0} cy={0} r={10.8} fill="none" stroke={p.goldShade} strokeWidth={0.6} strokeDasharray="0.8 1.1" opacity={0.9} />
        <circle cx={0} cy={0} r={9.4} fill={p.banner} stroke={darken(p.gold, 0.5)} strokeWidth={0.5} />
        <circle cx={0} cy={0} r={8} fill={CAMEO} />
        <path d="M-6.4 -3.6 A 7.4 7.4 0 0 1 2.6 -6.9" fill="none" stroke="#ffffff" strokeWidth={0.9} opacity={0.5} />
        <g transform={`scale(${flip} 1)`}>
          <FacingRightCtx.Provider value={facing === 'right'}>
            <Bust f={f} leader={leader} />
          </FacingRightCtx.Provider>
        </g>
        <path d="M-8.8 -5.2 A 10.4 10.4 0 0 1 -1.6 -10.2" fill="none" stroke="#fff4c8" strokeWidth={0.7} opacity={0.8} />
        {showName && name ? <NameRibbon name={name} y={15} p={p} /> : null}
      </g>
    );
  }
  return (
    <g>
      <BasePlate p={edgeBlocks ? paletteFor(look, edgeBlocks) : p} rx={31} ry={10} cy={14} />
      <ellipse cx={2} cy={20.6} rx={19} ry={2.8} fill="#1a1208" opacity={0.42} />
      <g transform={`translate(${2 * flip} 20.4) scale(${1.08 * flip} 1.08)`}>
        <FacingRightCtx.Provider value={facing === 'right'}>
          <MountedGeneral p={p} leader={leader} />
        </FacingRightCtx.Provider>
      </g>
      {showName && name ? <NameRibbon name={name} y={31} p={p} /> : null}
    </g>
  );
}

const LeaderTokenMemo = memo(LeaderTokenImpl);

/**
 * Leader piece. `attached`: a ~24-unit portrait medallion centred on (0,0) — translate it by LEADER_ATTACH_OFFSET
 * from the unit's hex centre. Alone: a mounted general with the army standard on his own base, centred on the hex.
 * The name ribbon is drawn only when `showName` is set.
 */
export function LeaderToken(props: LeaderTokenProps): JSX.Element {
  return <LeaderTokenMemo {...props} />;
}
