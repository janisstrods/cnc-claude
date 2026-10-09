// Leaders: a compact portrait medallion when attached to a unit, or a mounted general with a standard when alone.
import { memo } from 'react';
import type { ArmyLook, Blocks } from '../engine/types';
import { darken, lighten } from './color';
import { paletteFor, type Finial, type Kit, type Palette } from './palettes';
import { Emblem, FacingRightCtx, Head, Hi, Line2, OL, Paint, Shape, makeFig, type Crest, type Fig, type Helmet } from './parts';
import { HORSE_GEOM, Horse, Rider, type RiderKit } from './mounted';
import { BasePlate } from './token';

/** Where the board should place an attached leader token, relative to the unit hex centre. */
export const LEADER_ATTACH_OFFSET = { x: 29, y: -28 } as const;

/** The army standard (pole + hanging banner) drawn in a rider's frame (seat at 0,0). */
export function Standard({ p, x1 = -3.8, y1 = 6, x2 = -0.6, y2 = -41 }: { p: Palette; x1?: number; y1?: number; x2?: number; y2?: number }) {
  if (p.style.standard === 'parasol') return <Parasol p={p} x1={x1} y1={y1} x2={x2} y2={y2} />;
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

const FINIAL_FIG = new WeakMap<Palette, Fig>();
function figOf(p: Palette): Fig {
  let f = FINIAL_FIG.get(p);
  if (!f) FINIAL_FIG.set(p, (f = makeFig(p, 0)));
  return f;
}

/** Pole-top ornament of the standard at (x, y). */
function FinialEl({ p, kind, x, y }: { p: Palette; kind: Finial; x: number; y: number }) {
  const x2 = x;
  const y2 = y;
  if (kind === 'star' || kind === 'royalEagle' || kind === 'wheel' || kind === 'trident' || kind === 'stag') {
    const s = kind === 'wheel' ? 0.62 : 0.7;
    return (
      <g>
        <Line2 d={`M${x2} ${y2 + 1} L${x2} ${y2 - 1.2}`} w={0.8} c={p.gold} ow={0.45} />
        {kind === 'royalEagle'
          ? <RoyalEagle p={p} x={x2} y={y2 - 2.6} />
          : <Emblem kind={kind} cx={x2} cy={y2 - 2.8} s={s} f={figOf(p)} c={p.gold} bg={p.goldShade} />}
      </g>
    );
  }
  if (kind === 'spearhead') {
    return (
      <g>
        <path d={`M${x2} ${y2 - 5} L${x2 + 1.2} ${y2 - 1.4} L${x2 + 0.5} ${y2 + 0.4} L${x2 - 0.5} ${y2 + 0.4} L${x2 - 1.2} ${y2 - 1.4} Z`} fill={p.gold} stroke={OL} strokeWidth={0.45} strokeLinejoin="round" />
        <Hi d={`M${x2} ${y2 - 4.2} L${x2} ${y2 - 0.2}`} c={p.goldShade} w={0.35} o={1} />
      </g>
    );
  }
  return <BaseFinial p={p} kind={kind} x2={x2} y2={y2} />;
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

const GENERAL_KIT: RiderKit = {
  torso: 'muscle', helmet: 'attic', crest: 'horsehair', shield: 'none', weapon: 'standard', legs: 'greaves', cloak: true,
};

/** The mounted general of the Expansion #1 kits (the base kits all ride as GENERAL_KIT). */
const KIT_GENERALS: Partial<Record<Kit, RiderKit>> = {
  // Macedonian king: Phrygian helmet with tall plumes, gilded cuirass, cloak
  macedonian: { torso: 'muscle', helmet: 'phrygian', crest: 'plume2', shield: 'none', weapon: 'standard', legs: 'greaves', cloak: true },
  // Persian noble: upright tiara, robe, trousers
  persian: { torso: 'robe', helmet: 'kidaris', crest: 'none', shield: 'none', weapon: 'standard', legs: 'trousers', cloak: true, beard: true },
  // Scythian chief: pointed cap, scale coat, trousers
  scythian: { torso: 'scale', helmet: 'scythianCap', crest: 'none', shield: 'none', weapon: 'standard', legs: 'trousers', beard: true },
  // Indian raja: turban and white cotton, under the royal parasol
  indian: { torso: 'cotton', helmet: 'turban', crest: 'none', shield: 'none', weapon: 'standard', legs: 'bare', beard: true },
};

/** Helmet, crest and beard of the attached-leader portrait, per kit. */
const BUSTS: Partial<Record<Kit, { helmet: Helmet; crest: Crest; beard: boolean }>> = {
  macedonian: { helmet: 'phrygian', crest: 'horsehair', beard: false },
  persian: { helmet: 'kidaris', crest: 'none', beard: true },
  scythian: { helmet: 'scythianCap', crest: 'none', beard: true },
  indian: { helmet: 'turban', crest: 'none', beard: true },
};

/** Mounted general with cloak and standard, facing right, hooves at y = 0. */
export function MountedGeneral({ p }: { p: Palette }) {
  const gp = generalPalette(p);
  const f = makeFig(gp, 1);
  const kitGeneral = KIT_GENERALS[p.kit];
  if (kitGeneral) return <KitGeneral p={p} gp={gp} f={f} kit={kitGeneral} />;
  const g = p.style.general;
  const rider = g?.helmet || g?.crest ? { ...GENERAL_KIT, helmet: g.helmet ?? GENERAL_KIT.helmet, crest: g.crest ?? GENERAL_KIT.crest } : GENERAL_KIT;
  const horse = g?.horse ?? (p.kit === 'greek' ? p.horses[0] : { coat: '#e6dfd0', shade: '#aea592', mane: '#8c8272' });
  return (
    <g>
      <g transform={`scale(${HORSE_GEOM.scale})`}>
        <Horse coat={horse.coat} shade={horse.shade} mane={horse.mane} pose={2} cloth={g ? gp.saddle : p.saddle} clothTrim={p.gold} light={lighten(horse.coat, 0.5)} />
      </g>
      <g transform={`translate(${HORSE_GEOM.seatX} ${HORSE_GEOM.seatY})`}>
        <Rider kit={rider} f={f} standard={<Standard p={p} x1={-3.8} y1={6} x2={-0.9} y2={-40} />} />
      </g>
      <path d="M5.8 -22.4 Q11 -19.6 16.6 -20.6" fill="none" stroke="#3a2416" strokeWidth={0.55} />
    </g>
  );
}

/** The general of the Macedonian, Persian, Scythian and Indian kits (eastern lords wear a gold torque). */
function KitGeneral({ p, gp, f, kit }: { p: Palette; gp: Palette; f: Fig; kit: RiderKit }) {
  const g = p.style.general;
  const rider = g?.helmet || g?.crest ? { ...kit, helmet: g.helmet ?? kit.helmet, crest: g.crest ?? kit.crest } : kit;
  const horse = g?.horse ?? p.horses[0];
  const ub = 'translate(-0.6 13.4)';
  return (
    <g>
      <g transform={`scale(${HORSE_GEOM.scale})`}>
        <Horse coat={horse.coat} shade={horse.shade} mane={horse.mane} pose={2} cloth={gp.saddle} clothTrim={p.gold} light={lighten(horse.coat, 0.5)} />
      </g>
      <g transform={`translate(${HORSE_GEOM.seatX} ${HORSE_GEOM.seatY})`}>
        <Rider kit={rider} f={f} standard={<Standard p={p} x1={-3.8} y1={6} x2={-0.9} y2={-40} />} />
        {/* gold torque of rank */}
        {p.kit !== 'macedonian' && <g transform={ub}>
          <Line2 d="M-0.8 -21.6 C0.2 -20.9 1.4 -20.9 2.4 -21.6" w={0.75} c={p.gold} ow={0.4} />
          {p.kit === 'indian' && <circle cx={0.4} cy={-24.4} r={0.45} fill={p.gold} stroke={OL} strokeWidth={0.25} />}
        </g>}
        {p.kit === 'scythian' && <ScythianGorytos p={gp} />}
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

/** Generals wear gilded bronze (and their look's general colours). */
export function generalPalette(p: Palette): Palette {
  const g = p.style.general;
  if (g) {
    const { horse: _h, helmet: _he, crest: _c, ...colours } = g;
    return { ...p, metal: '#dcae4a', metalShade: '#97691c', metalLight: '#fbe6a2', ...colours };
  }
  return { ...p, metal: '#dcae4a', metalShade: '#97691c', metalLight: '#fbe6a2' };
}

const CAMEO = '#f1e5c6';

/** Head-and-shoulders portrait used in the attached-leader medallion (facing right, centred on 0,0, cameo field r = 8). */
function Bust({ f }: { f: Fig }) {
  const { p } = f;
  const b = BUSTS[p.kit];
  const eastern = p.kit === 'persian' || p.kit === 'scythian' || p.kit === 'indian';
  return (
    <>
      <g transform="translate(-0.75 24.4) scale(1.05)">
        {b
          ? <Head f={f} helmet={b.helmet} crest={b.crest} beard={b.beard} />
          : <Head f={f} helmet="atticOpen" crest="horsehair" beard={p.kit !== 'roman'} />}
      </g>
      {/* cloak across the shoulders */}
      <Shape d="M-7.63 2.4 C-5.8 1.4 -3.4 1.2 0 1.5 C3.4 1.7 5.8 2 7.63 2.4 A 8 8 0 0 1 -7.63 2.4 Z" f={p.cloak} sw={0.6} />
      <Paint d="M-7.63 2.4 C-6.6 1.9 -5.6 1.6 -4.4 1.5 C-5.2 3.6 -5.2 5.4 -4.6 6.55 A 8 8 0 0 1 -7.63 2.4 Z" f={p.cloakShade} mx={0} />
      {/* gilded cuirass (eastern lords: an embroidered robe) */}
      <Shape d="M-2.6 2.4 C-1 1.8 1.8 1.8 3.4 2.6 C3.9 4.2 3.9 5.8 3.4 7.24 A 8 8 0 0 1 -2.6 7.57 C-2.9 6 -3 4.2 -2.6 2.4 Z" f={eastern ? p.tunic : p.metal} sw={0.55} />
      {eastern
        ? <Hi d="M0.6 2 L0.9 7.6 M-1.8 3.4 L-1.6 3.4 M2.6 4.4 L2.8 4.4 M-1.4 5.8 L-1.2 5.8" c={p.pattern ?? p.gold} w={0.6} o={1} />
        : <Hi d="M0 4 C1 3.7 2.2 3.9 2.8 4.6 M-0.4 6.4 C0.8 6 2 6.2 2.9 6.8" c={p.metalShade} w={0.4} />}
      {!eastern && <Hi d="M-1.6 2.6 C-0.6 2.2 0.8 2.2 1.8 2.5" c={p.metalLight} w={0.5} />}
      <circle cx={3.3} cy={2.9} r={0.8} fill={p.gold} stroke={OL} strokeWidth={0.35} />
    </>
  );
}

export interface LeaderTokenProps {
  look: ArmyLook;
  blockColor: Blocks;
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

function LeaderTokenImpl({ look, blockColor, facing, attached, name, showName }: LeaderTokenProps) {
  const p = paletteFor(look, blockColor);
  const flip = facing === 'left' ? -1 : 1;
  if (attached) {
    const f = makeFig(generalPalette(p), 1);
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
            <Bust f={f} />
          </FacingRightCtx.Provider>
        </g>
        <path d="M-8.8 -5.2 A 10.4 10.4 0 0 1 -1.6 -10.2" fill="none" stroke="#fff4c8" strokeWidth={0.7} opacity={0.8} />
        {showName && name ? <NameRibbon name={name} y={15} p={p} /> : null}
      </g>
    );
  }
  return (
    <g>
      <BasePlate p={p} rx={31} ry={10} cy={14} />
      <ellipse cx={2} cy={20.6} rx={19} ry={2.8} fill="#1a1208" opacity={0.42} />
      <g transform={`translate(${2 * flip} 20.4) scale(${1.08 * flip} 1.08)`}>
        <FacingRightCtx.Provider value={facing === 'right'}>
          <MountedGeneral p={p} />
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
