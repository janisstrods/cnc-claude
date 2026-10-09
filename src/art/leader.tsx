// Leaders: a compact portrait medallion when attached to a unit, or a mounted general with a standard when alone.
import { memo } from 'react';
import type { Faction } from '../engine/types';
import { darken, lighten } from './color';
import { FACTION_PALETTES, type Palette } from './palettes';
import { FacingRightCtx, Head, Hi, Line2, OL, Paint, Shape, makeFig, type Fig } from './parts';
import { HORSE_GEOM, Horse, Rider, type RiderKit } from './mounted';
import { BasePlate } from './token';

/** Where the board should place an attached leader token, relative to the unit hex centre. */
export const LEADER_ATTACH_OFFSET = { x: 29, y: -28 } as const;

/** The army standard (pole + hanging banner) drawn in a rider's frame (seat at 0,0). */
export function Standard({ p, x1 = -3.8, y1 = 6, x2 = -0.6, y2 = -41 }: { p: Palette; x1?: number; y1?: number; x2?: number; y2?: number }) {
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
      {p.faction === 'rome' ? (
        <path d={`M${x2 - 2.6} ${y2 + 0.6} C${x2 - 1.6} ${y2 - 1.4} ${x2 - 0.6} ${y2 - 1} ${x2} ${y2 - 3} C${x2 + 0.6} ${y2 - 1} ${x2 + 1.6} ${y2 - 1.4} ${x2 + 2.6} ${y2 + 0.6} C${x2 + 1.4} ${y2 + 0.2} ${x2 + 0.6} ${y2 + 1} ${x2} ${y2 + 1.6} C${x2 - 0.6} ${y2 + 1} ${x2 - 1.4} ${y2 + 0.2} ${x2 - 2.6} ${y2 + 0.6} Z`} fill={p.gold} stroke={OL} strokeWidth={0.5} />
      ) : p.faction === 'carthage' ? (
        <g fill={p.gold} stroke={OL} strokeWidth={0.45}>
          <circle cx={x2} cy={y2 - 1.6} r={1.4} />
          <path d={`M${x2 - 2.4} ${y2 + 0.2} A 2.4 2.2 0 0 0 ${x2 + 2.4} ${y2 + 0.2} A 1.9 1.4 0 0 1 ${x2 - 2.4} ${y2 + 0.2} Z`} />
        </g>
      ) : (
        <path d={`M${x2} ${y2 - 3.4} L${x2 + 1.3} ${y2} L${x2} ${y2 + 1.2} L${x2 - 1.3} ${y2} Z`} fill={p.gold} stroke={OL} strokeWidth={0.45} />
      )}
    </g>
  );
}

function BannerDevice({ p, cx, cy }: { p: Palette; cx: number; cy: number }) {
  if (p.faction === 'carthage') {
    return (
      <g fill={p.bannerEmblem} stroke={darken(p.bannerEmblem, 0.5)} strokeWidth={0.35}>
        <circle cx={cx} cy={cy - 1.6} r={1.5} />
        <path d={`M${cx - 3} ${cy + 0.2} A 3 2.8 0 0 0 ${cx + 3} ${cy + 0.2} A 2.4 1.9 0 0 1 ${cx - 3} ${cy + 0.2} Z`} />
      </g>
    );
  }
  if (p.faction === 'syracuse') {
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

/** Mounted general with cloak and standard, facing right, hooves at y = 0. */
export function MountedGeneral({ p }: { p: Palette }) {
  const f = makeFig(generalPalette(p), 1);
  const horse = p.faction === 'syracuse' ? p.horses[0] : { coat: '#e6dfd0', shade: '#aea592', mane: '#8c8272' };
  return (
    <g>
      <g transform={`scale(${HORSE_GEOM.scale})`}>
        <Horse coat={horse.coat} shade={horse.shade} mane={horse.mane} pose={2} cloth={p.saddle} clothTrim={p.gold} light={lighten(horse.coat, 0.5)} />
      </g>
      <g transform={`translate(${HORSE_GEOM.seatX} ${HORSE_GEOM.seatY})`}>
        <Rider kit={GENERAL_KIT} f={f} standard={<Standard p={p} x1={-3.8} y1={6} x2={-0.9} y2={-40} />} />
      </g>
      <path d="M5.8 -22.4 Q11 -19.6 16.6 -20.6" fill="none" stroke="#3a2416" strokeWidth={0.55} />
    </g>
  );
}

/** Generals wear gilded bronze. */
export function generalPalette(p: Palette): Palette {
  return { ...p, metal: '#dcae4a', metalShade: '#97691c', metalLight: '#fbe6a2' };
}

const CAMEO = '#f1e5c6';

/** Head-and-shoulders portrait used in the attached-leader medallion (facing right, centred on 0,0, cameo field r = 8). */
function Bust({ f }: { f: Fig }) {
  const { p } = f;
  return (
    <>
      <g transform="translate(-0.75 24.4) scale(1.05)">
        <Head f={f} helmet="atticOpen" crest="horsehair" beard={p.faction !== 'rome'} />
      </g>
      {/* cloak across the shoulders */}
      <Shape d="M-7.63 2.4 C-5.8 1.4 -3.4 1.2 0 1.5 C3.4 1.7 5.8 2 7.63 2.4 A 8 8 0 0 1 -7.63 2.4 Z" f={p.cloak} sw={0.6} />
      <Paint d="M-7.63 2.4 C-6.6 1.9 -5.6 1.6 -4.4 1.5 C-5.2 3.6 -5.2 5.4 -4.6 6.55 A 8 8 0 0 1 -7.63 2.4 Z" f={p.cloakShade} mx={0} />
      {/* gilded cuirass */}
      <Shape d="M-2.6 2.4 C-1 1.8 1.8 1.8 3.4 2.6 C3.9 4.2 3.9 5.8 3.4 7.24 A 8 8 0 0 1 -2.6 7.57 C-2.9 6 -3 4.2 -2.6 2.4 Z" f={p.metal} sw={0.55} />
      <Hi d="M0 4 C1 3.7 2.2 3.9 2.8 4.6 M-0.4 6.4 C0.8 6 2 6.2 2.9 6.8" c={p.metalShade} w={0.4} />
      <Hi d="M-1.6 2.6 C-0.6 2.2 0.8 2.2 1.8 2.5" c={p.metalLight} w={0.5} />
      <circle cx={3.3} cy={2.9} r={0.8} fill={p.gold} stroke={OL} strokeWidth={0.35} />
    </>
  );
}

export interface LeaderTokenProps {
  faction: Faction;
  facing: 'left' | 'right';
  attached: boolean;
  name?: string;
  showName?: boolean;
}

function NameRibbon({ name, y, p }: { name: string; y: number; p: Palette }) {
  const w = Math.max(18, name.length * 4.1 + 6);
  return (
    <g>
      <rect x={-w / 2} y={y - 4.4} width={w} height={8} rx={2} fill="#17110c" opacity={0.9} stroke={p.gold} strokeWidth={0.5} />
      <text x={0} y={y + 1.8} textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight={700} fontSize={5.6} fill="#fbf1d6">
        {name}
      </text>
    </g>
  );
}

function LeaderTokenImpl({ faction, facing, attached, name, showName }: LeaderTokenProps) {
  const p = FACTION_PALETTES[faction];
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
