// UnitToken: base plate + miniatures + class badge + strength pips, centred on (0,0) of a pointy-top hex (R = 50).
import { memo } from 'react';
import type { ArmyLook, Blocks, EliteId, UnitType } from '../engine/types';
import { paletteFor, type Palette } from './palettes';
import { FootFigure, footKit } from './foot';
import { MountedFigure } from './mounted';
import { ElephantFigure } from './elephant';
import { ChariotFigure } from './chariot';
import { FacingRightCtx, OL } from './parts';

export type Facing = 'left' | 'right';

export type UnitClassName = 'light' | 'medium' | 'heavy';

export const UNIT_CLASS: Record<UnitType, UnitClassName> = {
  LI: 'light', LB: 'light', LS: 'light', AX: 'light', LC: 'light', LBC: 'light',
  WA: 'medium', MI: 'medium', MC: 'medium', CAM: 'medium',
  HI: 'heavy', HC: 'heavy', EL: 'heavy', HCH: 'heavy',
};

const NAMES: Record<UnitType, string> = {
  LI: 'Light Infantry', LB: 'Light Bow', LS: 'Light Sling', AX: 'Auxilia', WA: 'Warriors', MI: 'Medium Infantry',
  HI: 'Heavy Infantry', LC: 'Light Cavalry', MC: 'Medium Cavalry', HC: 'Heavy Cavalry', EL: 'Elephants',
  HCH: 'Heavy Chariots', LBC: 'Light Bow Cavalry', CAM: 'Camels',
};

export function unitTypeName(t: UnitType): string {
  return NAMES[t];
}

export const CLASS_COLORS: Record<UnitClassName, string> = { light: '#2f9e44', medium: '#2a6fd8', heavy: '#d0302a' };

// TODO(Task 16): stand-in miniatures until the horse-archer and camel figures are drawn.
const FIGURE_STAND_IN: Partial<Record<UnitType, UnitType>> = { LBC: 'LC', CAM: 'MC' };

/** The unit type whose miniature is drawn for `t`. */
function figureType(t: UnitType): UnitType {
  return FIGURE_STAND_IN[t] ?? t;
}

type Kind = 'foot' | 'horse' | 'elephant' | 'chariot';
export function figureKind(type: UnitType): Kind {
  const t = figureType(type);
  if (t === 'LC' || t === 'MC' || t === 'HC') return 'horse';
  if (t === 'EL') return 'elephant';
  if (t === 'HCH') return 'chariot';
  return 'foot';
}

interface Slot { x: number; y: number; s: number }

// Slots are listed back rank first (draw order); depleted units drop figures from the back rank first.
const FB = 1.12; // back-rank scale (foot)
const FF = 1.26; // front-rank scale (foot)
const FOOT_SLOTS: Record<number, Slot[]> = {
  4: [{ x: -20, y: 5, s: FB }, { x: 6, y: 5, s: FB }, { x: -8, y: 18, s: FF }, { x: 17, y: 18, s: FF }],
  3: [{ x: 6, y: 5, s: FB }, { x: -8, y: 18, s: FF }, { x: 17, y: 18, s: FF }],
  2: [{ x: -8, y: 18, s: FF }, { x: 17, y: 18, s: FF }],
  1: [{ x: 4, y: 18, s: FF }],
};
const LIGHT_SLOTS: Record<number, Slot[]> = {
  4: [{ x: -21, y: 6.5, s: FB }, { x: 7, y: 4, s: FB }, { x: -9, y: 18.5, s: FF }, { x: 16, y: 16.5, s: FF }],
  3: [{ x: 7, y: 4, s: FB }, { x: -9, y: 18.5, s: FF }, { x: 16, y: 16.5, s: FF }],
  2: [{ x: -9, y: 18.5, s: FF }, { x: 16, y: 16.5, s: FF }],
  1: [{ x: 4, y: 18, s: FF }],
};
const HORSE_SLOTS: Record<number, Slot[]> = {
  3: [{ x: 0, y: 5.5, s: 0.98 }, { x: -15, y: 18.5, s: 1.06 }, { x: 15, y: 18.5, s: 1.06 }],
  2: [{ x: -15, y: 18.5, s: 1.06 }, { x: 15, y: 18.5, s: 1.06 }],
  1: [{ x: 1, y: 18.5, s: 1.1 }],
};
const BIG_SLOTS: Record<number, Slot[]> = {
  2: [{ x: -9, y: 6.5, s: 0.94 }, { x: 6, y: 19, s: 1.06 }],
  1: [{ x: 1, y: 18.5, s: 1.1 }],
};

function slotsFor(type: UnitType, n: number): Slot[] {
  const k = figureKind(type);
  if (k === 'horse') return HORSE_SLOTS[Math.max(1, Math.min(3, n))];
  if (k === 'elephant' || k === 'chariot') return BIG_SLOTS[Math.max(1, Math.min(2, n))];
  const light = type === 'LI' || type === 'LB' || type === 'LS';
  return (light ? LIGHT_SLOTS : FOOT_SLOTS)[Math.max(1, Math.min(4, n))];
}

/** One miniature of the given type in its local frame (facing right, feet at 0,0). */
export function Miniature({ type, p, i }: { type: UnitType; p: Palette; i: number }) {
  const k = figureKind(type);
  if (k === 'horse') return <MountedFigure type={figureType(type)} p={p} i={i} />;
  if (k === 'elephant') return <ElephantFigure p={p} i={i} />;
  if (k === 'chariot') return <ChariotFigure p={p} i={i} />;
  return <FootFigure kit={footKit(type, p.kit, i)} p={p} i={i} />;
}

// ---------------------------------------------------------------------------------------------
// Base plate

// Flock / grass tufts on the base top, as fractions of (rx, ry) from the centre.
const TUFTS: [number, number, number][] = [
  [-0.78, -0.05, 1], [-0.52, 0.55, 0.8], [-0.12, 0.72, 1.1], [0.36, 0.62, 0.9], [0.74, 0.18, 1],
  [0.6, -0.48, 0.8], [0.08, -0.7, 0.9], [-0.46, -0.6, 1],
];

/** Several small ellipses as one path (fewer DOM nodes). */
function blobs(list: [number, number, number][], irx: number, iry: number, ox: number, oy: number, rx: number, ry: number): string {
  return list
    .map(([fx, fy, s]) => {
      const x = fx * irx + ox - rx * s;
      const y = fy * iry + oy;
      return `M${x.toFixed(2)} ${y.toFixed(2)}a${(rx * s).toFixed(2)} ${(ry * s).toFixed(2)} 0 1 0 ${(2 * rx * s).toFixed(2)} 0a${(rx * s).toFixed(2)} ${(ry * s).toFixed(2)} 0 1 0 ${(-2 * rx * s).toFixed(2)} 0Z`;
    })
    .join('');
}

export function BasePlate({ p, rx = 38, ry = 11.5, cy = 11 }: { p: Palette; rx?: number; ry?: number; cy?: number }) {
  const irx = rx - 2.2;
  const iry = ry - 1.9;
  return (
    <g>
      <ellipse cx={1.8} cy={cy + 5.6} rx={rx + 1.2} ry={ry + 1.2} fill="#000" opacity={0.26} />
      <ellipse cx={0} cy={cy + 3.6} rx={rx} ry={ry} fill={p.baseEdgeShade} stroke={OL} strokeWidth={0.9} />
      <path
        d={`M${-rx} ${cy} A ${rx} ${ry} 0 0 0 ${rx} ${cy} L ${rx} ${cy + 2.4} A ${rx} ${ry} 0 0 1 ${-rx} ${cy + 2.4} Z`}
        fill={p.baseEdge}
      />
      <path
        d={`M${-rx + 3} ${cy + 4.6} A ${rx} ${ry} 0 0 0 ${-rx * 0.35} ${cy + ry + 2.6}`}
        fill="none"
        stroke={p.baseEdgeLight}
        strokeWidth={0.9}
        opacity={0.75}
      />
      <ellipse cx={0} cy={cy} rx={rx} ry={ry} fill={p.baseEdge} stroke={OL} strokeWidth={0.9} />
      <ellipse cx={0} cy={cy - 0.2} rx={irx} ry={iry} fill={p.baseTop} />
      <ellipse cx={-irx * 0.18} cy={cy - iry * 0.22} rx={irx * 0.72} ry={iry * 0.62} fill="#d8cf8a" opacity={0.13} />
      <path d={blobs(TUFTS, irx, iry, 0, cy - 0.2, 2.2, 0.9)} fill={p.baseTopShade} opacity={0.75} />
      <path d={blobs(TUFTS, irx, iry, -0.5, cy - 0.6, 1.3, 0.55)} fill="#a6a25a" opacity={0.85} />
      <path
        d={`M${-rx + 4} ${cy - 3.5} A ${irx} ${iry} 0 0 1 ${rx - 8} ${cy - 5.6}`}
        fill="none"
        stroke={p.baseEdgeLight}
        strokeWidth={0.8}
        opacity={0.8}
      />
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// Class badge

export function ClassSymbol({ cls, white, x, y, s = 1 }: { cls: UnitClassName; white: boolean; x: number; y: number; s?: number }) {
  const c = CLASS_COLORS[cls];
  const st = white ? '#ffffff' : '#0d0906';
  const sw = white ? 1.1 : 0.6;
  if (cls === 'light') return <circle cx={x} cy={y} r={3.5 * s} fill={c} stroke={st} strokeWidth={sw} />;
  if (cls === 'medium') {
    const h = 7 * s;
    return (
      <path
        d={`M${x} ${y - h * 0.58} L${x + h * 0.6} ${y + h * 0.42} L${x - h * 0.6} ${y + h * 0.42} Z`}
        fill={c}
        stroke={st}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
    );
  }
  return <rect x={x - 3.2 * s} y={y - 3.2 * s} width={6.4 * s} height={6.4 * s} fill={c} stroke={st} strokeWidth={sw} />;
}

export function Badge({ type, blocks, maxBlocks, sacred }: { type: UnitType; blocks: number; maxBlocks: number; sacred?: boolean }) {
  const cls = UNIT_CLASS[type];
  const white = type === 'AX' || type === 'WA';
  const cyB = 30.8;
  const pw = 4.6;
  const right = 19.4;
  const pips: JSX.Element[] = [];
  for (let k = 0; k < maxBlocks; k++) {
    const x = right - (maxBlocks - 1 - k) * pw;
    const on = k < blocks;
    pips.push(
      on
        ? <circle key={k} cx={x} cy={cyB} r={1.95} fill="#f8e9bd" />
        : <circle key={k} cx={x} cy={cyB} r={1.55} fill="none" stroke="#a8946c" strokeWidth={0.8} />,
    );
  }
  return (
    <g>
      <rect x={-23.4} y={24.4} width={46.8} height={12.8} rx={3.4} fill="#17110c" fillOpacity={0.93} stroke={sacred ? '#e9bf4f' : '#6b5638'} strokeWidth={sacred ? 1.2 : 0.7} />
      <ClassSymbol cls={cls} white={white} x={-17.8} y={cyB} s={1.08} />
      <text
        x={-11.6}
        y={cyB + 3.3}
        fontFamily="Cinzel, 'Trajan Pro', Georgia, serif"
        fontWeight={700}
        fontSize={type.length > 2 ? 8 : 9.4}
        fill="#fbf1d6"
        letterSpacing={type.length > 2 ? -0.3 : 0.1}
      >
        {type}
      </text>
      {pips}
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// Sacred band marker: golden standard with laurel wreath, planted at the back left of the base.

export function SacredStandard({ p }: { p: Palette }) {
  // Laurel leaves along two arcs around (0, -42).
  const leaves: JSX.Element[] = [];
  for (let k = 0; k < 4; k++) {
    for (const side of [-1, 1]) {
      const a = ((200 - k * 34) * Math.PI) / 180;
      const x = side * Math.cos(a) * -4.2;
      const y = -42 + Math.sin(a) * -4.2;
      const rot = side * (k * 34 - 20);
      leaves.push(
        <ellipse key={`${k}${side}`} cx={x.toFixed(2)} cy={y.toFixed(2)} rx={0.85} ry={1.7} transform={`rotate(${rot} ${x.toFixed(2)} ${y.toFixed(2)})`} />,
      );
    }
  }
  return (
    <g transform="translate(-27.5 8) scale(0.88)">
      <ellipse cx={1} cy={0.6} rx={3} ry={1.1} fill="#000" opacity={0.3} />
      <path d="M0 0.4 L0 -37.6" stroke={OL} strokeWidth={2.1} strokeLinecap="round" />
      <path d="M0 0 L0 -37.6" stroke={p.goldShade} strokeWidth={1} />
      <path d="M-3.8 -31.5 L5.4 -31.5 L5.4 -20.5 L3.1 -22.2 L0.8 -20.5 L-1.5 -22.2 L-3.8 -20.5 Z" fill={p.gold} stroke={OL} strokeWidth={0.6} strokeLinejoin="round" />
      <path d="M-3.8 -31.5 L-1.6 -31.5 L-1.6 -21.6 L-3.8 -20.5 Z" fill={p.goldShade} opacity={0.6} />
      <circle cx={0.8} cy={-27.6} r={1.25} fill={p.banner} />
      <path d="M-1.3 -25.7 A 2.1 1.9 0 0 0 2.9 -25.7 A 1.7 1.3 0 0 1 -1.3 -25.7 Z" fill={p.banner} />
      <path d="M-4.8 -31.5 L6.4 -31.5" stroke={OL} strokeWidth={1.7} strokeLinecap="round" />
      <path d="M-4.8 -31.5 L6.4 -31.5" stroke={p.gold} strokeWidth={0.8} strokeLinecap="round" />
      <g fill={p.gold} stroke={OL} strokeWidth={0.35}>{leaves}</g>
      <circle cx={0} cy={-42} r={1.5} fill={p.gold} stroke={OL} strokeWidth={0.5} />
    </g>
  );
}

// ---------------------------------------------------------------------------------------------

export interface UnitTokenProps {
  type: UnitType;
  /** The army's figure kit and palette. */
  look: ArmyLook;
  /** The side's block set: base-edge colour (`blocks` below is the unit's remaining strength). */
  blockColor: Blocks;
  blocks: number;
  maxBlocks: number;
  facing: Facing;
  /** Elite preset: draws the gold standard and a gold badge rim. */
  elite?: EliteId;
  dimmed?: boolean;
}

function UnitTokenImpl({ type, look, blockColor, blocks, maxBlocks, facing, elite, dimmed }: UnitTokenProps) {
  const p = paletteFor(look, blockColor);
  const n = Math.max(0, Math.min(blocks, maxBlocks));
  const slots = n > 0 ? slotsFor(type, n) : [];
  const flip = facing === 'left' ? -1 : 1;
  // figure index -> keep the same painted figure in the same slot as the unit is depleted
  const full = slotsFor(type, maxBlocks);
  return (
    <g>
      <g opacity={dimmed ? 0.6 : undefined} style={dimmed ? { filter: 'saturate(0.3) brightness(0.95)' } : undefined}>
      <BasePlate p={p} />
      <FacingRightCtx.Provider value={facing === 'right'}>
      {elite && <SacredStandard p={p} />}
      {slots.map((sl, k) => {
        const idx = full.findIndex((q) => q.x === sl.x && q.y === sl.y);
        const i = idx >= 0 ? idx : k;
        return (
          <g key={k}>
            <ellipse cx={sl.x * flip + 1.6} cy={sl.y + 0.4} rx={figureKind(type) === 'foot' ? 7.5 * sl.s : 15 * sl.s} ry={2.2 * sl.s} fill="#1a1208" opacity={0.42} />
            <g transform={`translate(${sl.x * flip} ${sl.y}) scale(${sl.s * flip} ${sl.s})`}>
              <Miniature type={type} p={p} i={i} />
            </g>
          </g>
        );
      })}
      </FacingRightCtx.Provider>
      </g>
      <g opacity={dimmed ? 0.8 : undefined}>
      <Badge type={type} blocks={n} maxBlocks={maxBlocks} sacred={!!elite} />
      </g>
    </g>
  );
}

const UnitTokenMemo = memo(UnitTokenImpl);

/**
 * A complete unit as drawn on a hex: base plate, one miniature per remaining block (back rank removed first),
 * class badge and strength pips. Centred on (0,0), fits a pointy-top hex of radius 50 (top-right corner kept
 * clear for an attached leader, see LEADER_ATTACH_OFFSET). Memoised internally; may be used as JSX or called.
 */
export function UnitToken(props: UnitTokenProps): JSX.Element {
  return <UnitTokenMemo {...props} />;
}
