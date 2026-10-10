// Reusable body parts for the miniature figures. Everything is drawn FACING RIGHT in a local frame whose
// origin is between the figure's feet (y grows downwards, so the figure stands in negative y). The token
// mirrors whole figures for left-facing units.
//
// Lighting: the art is lit from the upper left of the SCREEN. Side shading / highlights are authored as if lit
// from the figure's local right; when a figure is drawn facing right (not mirrored) those layers are mirrored
// about their own axis (`mx`) so the light stays on the screen's upper left for both facings.
import { createContext, useContext, type ReactNode } from 'react';
import { darken, lighten } from './color';
import type { EmblemKind, Palette } from './palettes';

export const OL = '#1d140e';
export const OW = 0.8;

/** Per-figure paint variation. */
export interface Fig {
  p: Palette;
  skin: string;
  skinShade: string;
  hair: string;
  /** 0..3, used for small pose / colour variation. */
  i: number;
}

export function makeFig(p: Palette, i: number, skins = p.skin, hairs = p.hair): Fig {
  const skin = skins[i % skins.length];
  return { p, i, skin, skinShade: darken(skin, 0.28), hair: hairs[(i * 3 + 1) % hairs.length] };
}

/** A stroke with a dark outline (two stacked strokes): limbs, shafts, straps. */
export function Line2({ d, w, c, ow = OW, o = OL }: { d: string; w: number; c: string; ow?: number; o?: string }) {
  return (
    <>
      <path d={d} fill="none" stroke={o} strokeWidth={w + ow * 2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

/** Filled shape with the standard outline. */
export function Shape({ d, f, sw = OW }: { d: string; f: string; sw?: number }) {
  return <path d={d} fill={f} stroke={OL} strokeWidth={sw} strokeLinejoin="round" />;
}

/** True while rendering a figure that faces right on screen (i.e. is not mirrored). */
export const FacingRightCtx = createContext(false);

/** Mirror transform for a side-dependent light/shade layer (see header). `mr` = mirror when facing right. */
function useSideMirror(mx: number | undefined, mr: boolean): string | undefined {
  const fr = useContext(FacingRightCtx);
  if (mx === undefined) return undefined;
  return (mr ? fr : !fr) ? `matrix(-1 0 0 1 ${2 * mx} 0)` : undefined;
}

/** Unoutlined paint layer (shading). */
export function Paint({ d, f, o, mx, mr = true }: { d: string; f: string; o?: number; mx?: number; mr?: boolean }) {
  const t = useSideMirror(mx, mr);
  return <path d={d} fill={f} opacity={o} transform={t} />;
}

/** Thin stroke: highlights, trims, folds. */
export function Hi({ d, c, w = 0.6, o = 0.9, mx, mr = true }: { d: string; c: string; w?: number; o?: number; mx?: number; mr?: boolean }) {
  const t = useSideMirror(mx, mr);
  return <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" opacity={o} transform={t} />;
}

// ---------------------------------------------------------------------------------------------
// Shafted weapons

/** Spear / javelin from (x1,y1) butt to (x2,y2) tip with a leaf blade. */
export function Spear({
  x1, y1, x2, y2, f, w = 0.9, blade = 3.6, bladeW = 1.5, shank = 0, butt = false,
}: {
  x1: number; y1: number; x2: number; y2: number; f: Fig; w?: number; blade?: number; bladeW?: number;
  /** Pilum: length of thin iron shank below the tip. */
  shank?: number; butt?: boolean;
}) {
  const { p } = f;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const bx = x2 - ux * blade;
  const by = y2 - uy * blade;
  const mx = x2 - ux * blade * 0.45;
  const my = y2 - uy * blade * 0.45;
  const sx = bx - ux * shank;
  const sy = by - uy * shank;
  const r = (n: number) => n.toFixed(2);
  const bladeD = `M${r(bx)} ${r(by)} L${r(mx + nx * bladeW / 2)} ${r(my + ny * bladeW / 2)} L${r(x2)} ${r(y2)} L${r(mx - nx * bladeW / 2)} ${r(my - ny * bladeW / 2)} Z`;
  return (
    <>
      <Line2 d={`M${r(x1)} ${r(y1)} L${r(sx)} ${r(sy)}`} w={w} c={p.wood} ow={0.6} />
      {shank > 0 && (
        <>
          <Line2 d={`M${r(sx)} ${r(sy)} L${r(bx)} ${r(by)}`} w={w * 0.55} c={p.ironLight} ow={0.5} />
          <circle cx={sx} cy={sy} r={w * 0.9} fill={p.iron} stroke={OL} strokeWidth={0.4} />
        </>
      )}
      <path d={bladeD} fill={shank > 0 ? p.ironLight : p.ironLight} stroke={OL} strokeWidth={0.5} strokeLinejoin="round" />
      {butt && <Line2 d={`M${r(x1)} ${r(y1)} L${r(x1 + ux * 1.6)} ${r(y1 + uy * 1.6)}`} w={w} c={p.metal} ow={0.5} />}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Emblems

/** A shield / standard device centred on (cx, cy), ~3 units in radius at s = 1. `bg` is the field colour (cut-outs). */
export function Emblem({ kind, cx, cy, s, f, c, bg }: { kind: EmblemKind; cx: number; cy: number; s: number; f: Fig; c?: string; bg?: string }) {
  const { p } = f;
  const col = c ?? p.shieldEmblem;
  if (kind === 'none') return null;
  if (kind !== 'rome' && kind !== 'carthage' && kind !== 'syracuse') {
    return (
      <g transform={`translate(${cx} ${cy}) scale(${s})`}>
        <Device kind={kind} col={col} bg={bg ?? p.shield} />
      </g>
    );
  }
  if (kind === 'carthage') {
    // Crescent (horns up) cradling a disc.
    const w = 2.3 * s;
    return (
      <g fill={col} stroke={darken(col, 0.45)} strokeWidth={0.35}>
        <circle cx={cx} cy={cy - 1.2 * s} r={1.15 * s} />
        <path d={`M${cx - w} ${cy - 0.1 * s} A ${w} ${w * 0.95} 0 0 0 ${cx + w} ${cy - 0.1 * s} A ${w * 0.8} ${w * 0.62} 0 0 1 ${cx - w} ${cy - 0.1 * s} Z`} />
      </g>
    );
  }
  if (kind === 'syracuse') {
    // Bold blue "sun & bar" device.
    return (
      <>
        <circle cx={cx} cy={cy} r={2.4 * s} fill="none" stroke={col} strokeWidth={1.1 * s} />
        <circle cx={cx} cy={cy} r={0.9 * s} fill={col} />
      </>
    );
  }
  // Rome: golden wings around the boss.
  return (
    <path
      d={`M${cx - 1.1 * s} ${cy - 0.9 * s} C${cx - 2.6 * s} ${cy - 2.4 * s} ${cx - 2.8 * s} ${cy - 4.2 * s} ${cx - 2.2 * s} ${cy - 5.6 * s}
          M${cx + 1.1 * s} ${cy - 0.9 * s} C${cx + 2.6 * s} ${cy - 2.4 * s} ${cx + 2.8 * s} ${cy - 4.2 * s} ${cx + 2.2 * s} ${cy - 5.6 * s}
          M${cx - 1.1 * s} ${cy + 0.9 * s} C${cx - 2.6 * s} ${cy + 2.4 * s} ${cx - 2.8 * s} ${cy + 4.2 * s} ${cx - 2.2 * s} ${cy + 5.6 * s}
          M${cx + 1.1 * s} ${cy + 0.9 * s} C${cx + 2.6 * s} ${cy + 2.4 * s} ${cx + 2.8 * s} ${cy + 4.2 * s} ${cx + 2.2 * s} ${cy + 5.6 * s}`}
      fill="none"
      stroke={col}
      strokeWidth={0.75 * s}
      strokeLinecap="round"
    />
  );
}

const f2 = (n: number) => n.toFixed(2);

/** Star polygon around (0,0): `n` rays alternating long / short radius, `inner` between them. */
function starPath(n: number, long: number, short: number, inner: number): string {
  const pts: string[] = [];
  for (let k = 0; k < n * 2; k++) {
    const a = (Math.PI * k) / n - Math.PI / 2;
    const r = k % 2 ? inner : (k / 2) % 2 ? short : long;
    pts.push(`${f2(Math.cos(a) * r)} ${f2(Math.sin(a) * r)}`);
  }
  return `M${pts.join(' L')} Z`;
}

const STAR16 = starPath(16, 3.15, 2.15, 0.78);
const STAR8 = starPath(8, 1.55, 1.1, 0.5);
const SNAKES = Array.from({ length: 11 }, (_, k) => {
  const a = (2 * Math.PI * k) / 11 - Math.PI / 2;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const w = 0.42;
  return `M${f2(c * 2)} ${f2(s * 2)} Q${f2(c * 2.6 - s * w)} ${f2(s * 2.6 + c * w)} ${f2(c * 3.2)} ${f2(s * 3.2)}`;
}).join(' ');
const TRISKELES = [-90, 30, 150].map((deg) => {
  const a = (deg * Math.PI) / 180;
  const b = a + Math.PI / 2;
  const x = Math.cos(a) * 2.3;
  const y = Math.sin(a) * 2.3;
  return `M${f2(Math.cos(a) * 0.5)} ${f2(Math.sin(a) * 0.5)} L${f2(x)} ${f2(y)} L${f2(x + Math.cos(b) * 1.1)} ${f2(y + Math.sin(b) * 1.1)}`;
}).join(' ');
const MAC_RING = Array.from({ length: 8 }, (_, k) => {
  const a = (2 * Math.PI * k) / 8 - Math.PI / 2;
  const x = Math.cos(a) * 2.55;
  const y = Math.sin(a) * 2.55;
  const ux = -Math.sin(a) * 0.62;
  const uy = Math.cos(a) * 0.62;
  return `M${f2(x - ux)} ${f2(y - uy)} A0.62 0.62 0 0 1 ${f2(x + ux)} ${f2(y + uy)}`;
}).join(' ');
const MAC_DOTS = Array.from({ length: 8 }, (_, k) => {
  const a = (2 * Math.PI * k) / 8 - Math.PI / 2;
  return [Math.cos(a) * 2.75, Math.sin(a) * 2.75] as const;
});
const MAC_DOTS_D = MAC_DOTS.map(([x, y]) => `M${f2(x - 0.26)} ${f2(y)}a0.26 0.26 0 1 0 0.52 0a0.26 0.26 0 1 0 -0.52 0Z`).join('');
const SPOKES = Array.from({ length: 8 }, (_, k) => {
  const a = (Math.PI * k) / 4;
  return `M${f2(Math.cos(a) * 0.6)} ${f2(Math.sin(a) * 0.6)} L${f2(Math.cos(a) * 2.4)} ${f2(Math.sin(a) * 2.4)}`;
}).join(' ');
const EAGLE_WING = 'M-0.3 -1.2 C-1 -2.4 -2.5 -2.9 -3.3 -2.2 C-2.7 -1.9 -2.4 -1.4 -2.5 -0.8 C-2 -1.1 -1.4 -0.9 -1.1 -0.5 C-1.6 -0.3 -1.9 0.1 -1.8 0.5 C-1.3 0.2 -0.8 0.3 -0.4 0.7 Z';
const DISC_WING = 'M-1 -0.25 C-1.8 -1.05 -3.3 -1.25 -4.1 -0.65 C-3.5 -0.45 -3.3 -0.2 -3.5 0.1 C-3 0 -2.7 0.1 -2.6 0.4 C-2.1 0.2 -1.6 0.25 -1.1 0.45 Z';

/** The devices of the Expansion #1 armies, in a unit frame (radius ~3). */
function Device({ kind, col, bg }: { kind: EmblemKind; col: string; bg: string }) {
  const edge = darken(col, 0.45);
  switch (kind) {
    case 'owl':
      // Athena's owl
      return (
        <g>
          <path d="M-1.9 2.8 C-2.6 0.8 -2.6 -1.2 -1.8 -2.3 L-2.2 -3.5 L-0.9 -2.85 C-0.3 -3.05 0.3 -3.05 0.9 -2.85 L2.2 -3.5 L1.8 -2.3 C2.6 -1.2 2.6 0.8 1.9 2.8 C0.6 3.3 -0.6 3.3 -1.9 2.8 Z" fill={col} stroke={edge} strokeWidth={0.3} />
          <circle cx={-0.82} cy={-1.45} r={0.74} fill={bg} />
          <circle cx={0.82} cy={-1.45} r={0.74} fill={bg} />
          <circle cx={-0.78} cy={-1.4} r={0.34} fill={col} />
          <circle cx={0.78} cy={-1.4} r={0.34} fill={col} />
          <path d="M-0.32 -0.62 L0 0.1 L0.32 -0.62 Z" fill={bg} />
          <path d="M-1.2 0.7 L0 1.5 L1.2 0.7 M-1.1 1.7 L0 2.4 L1.1 1.7" fill="none" stroke={bg} strokeWidth={0.34} />
        </g>
      );
    case 'gorgon':
      // Gorgoneion: a staring face ringed with snakes
      return (
        <g>
          <path d={SNAKES} fill="none" stroke={col} strokeWidth={0.5} strokeLinecap="round" />
          <circle r={2.1} fill={col} stroke={edge} strokeWidth={0.3} />
          <circle cx={-0.78} cy={-0.5} r={0.45} fill={bg} />
          <circle cx={0.78} cy={-0.5} r={0.45} fill={bg} />
          <path d="M-1 0.75 Q0 1.6 1 0.75" fill="none" stroke={bg} strokeWidth={0.42} strokeLinecap="round" />
          <path d="M-0.28 1.05 L0 1.95 L0.28 1.05 Z" fill={bg} />
        </g>
      );
    case 'bull':
      // a bull's head (boukranion)
      return (
        <g>
          <path d="M-1.5 -1.9 C-2.6 -2.1 -3.2 -2.9 -3.1 -3.6 C-2.4 -3 -1.6 -2.9 -0.9 -3 M1.5 -1.9 C2.6 -2.1 3.2 -2.9 3.1 -3.6 C2.4 -3 1.6 -2.9 0.9 -3" fill="none" stroke={col} strokeWidth={0.75} strokeLinecap="round" />
          <path d="M-1.6 -2.6 C-0.6 -3 0.6 -3 1.6 -2.6 C2 -1.6 1.6 0.4 1.1 1.6 C0.9 2.6 0.5 3 0 3 C-0.5 3 -0.9 2.6 -1.1 1.6 C-1.6 0.4 -2 -1.6 -1.6 -2.6 Z" fill={col} stroke={edge} strokeWidth={0.3} />
          <path d="M-2.6 -1.6 L-1.5 -1.6 L-1.6 -0.8 Z M2.6 -1.6 L1.5 -1.6 L1.6 -0.8 Z" fill={col} />
          <circle cx={-0.75} cy={-1.3} r={0.36} fill={bg} />
          <circle cx={0.75} cy={-1.3} r={0.36} fill={bg} />
          <circle cx={-0.4} cy={2.1} r={0.26} fill={bg} />
          <circle cx={0.4} cy={2.1} r={0.26} fill={bg} />
        </g>
      );
    case 'triskeles':
      return (
        <g>
          <path d={TRISKELES} fill="none" stroke={col} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" />
          <circle r={0.75} fill={col} />
        </g>
      );
    case 'club':
      // Club of Heracles
      return (
        <g fill={col} stroke={edge} strokeWidth={0.3}>
          <path d="M-2.3 3 C-2.6 2.7 -2.5 2.3 -2.2 2.05 L0.8 -1.7 C0.5 -2.6 0.9 -3.4 1.75 -3.55 C2.65 -3.65 3.15 -2.85 2.95 -2.1 C2.75 -1.45 2.1 -1.05 1.45 -1.15 L-1.55 2.95 C-1.75 3.25 -2.05 3.25 -2.3 3 Z" />
          <circle cx={0.25} cy={-0.95} r={0.4} />
          <circle cx={1.15} cy={-0.45} r={0.36} />
          <circle cx={2.95} cy={-3.1} r={0.36} />
          <circle cx={-0.75} cy={0.75} r={0.32} />
        </g>
      );
    case 'lambda':
      return <path d="M-2.4 3 L0 -3 L2.4 3" fill="none" stroke={col} strokeWidth={1.25} strokeLinejoin="miter" />;
    case 'phi':
      return (
        <g fill="none" stroke={col}>
          <ellipse rx={1.75} ry={1.45} strokeWidth={0.8} />
          <path d="M0 -3 L0 3" strokeWidth={0.9} />
        </g>
      );
    case 'tripod':
      // the Delphic tripod
      return (
        <g>
          <path d="M-2.1 -1.6 L2.1 -1.6 C1.9 -0.2 1.1 0.5 0 0.5 C-1.1 0.5 -1.9 -0.2 -2.1 -1.6 Z" fill={col} />
          <path d="M-1.3 0.1 L-2.3 3 M0 0.5 L0 3 M1.3 0.1 L2.3 3" fill="none" stroke={col} strokeWidth={0.55} strokeLinecap="round" />
          <circle cx={-1.15} cy={-2.35} r={0.6} fill="none" stroke={col} strokeWidth={0.42} />
          <circle cx={1.15} cy={-2.35} r={0.6} fill="none" stroke={col} strokeWidth={0.42} />
        </g>
      );
    case 'star':
      // the Argead star of Macedon
      return (
        <g>
          <path d={STAR16} fill={col} stroke={edge} strokeWidth={0.25} strokeLinejoin="round" />
          <circle r={0.7} fill={col} stroke={edge} strokeWidth={0.25} />
        </g>
      );
    case 'macShield':
      // the "Macedonian shield": a star in a ring of crescents and dots
      return (
        <g>
          <path d={STAR8} fill={col} />
          <path d={MAC_RING} fill="none" stroke={col} strokeWidth={0.42} />
          <path d={MAC_DOTS_D} fill={col} />
        </g>
      );
    case 'thunderbolt':
      // the thunderbolt of Zeus of Dodona
      return (
        <g fill="none" stroke={col} strokeLinejoin="round" strokeLinecap="round">
          <path d="M0 -3.3 L0.75 -1.5 L-0.35 -0.8 L0.35 0.8 L-0.75 1.5 L0 3.3" strokeWidth={0.62} />
          <path d="M-2 -2.8 L-0.9 -1.7 L-1.25 -1.25 L-0.3 -0.55 M2 -2.8 L0.9 -1.7 L1.25 -1.25 L0.3 -0.55 M-2 2.8 L-0.9 1.7 L-1.25 1.25 L-0.3 0.55 M2 2.8 L0.9 1.7 L1.25 1.25 L0.3 0.55" strokeWidth={0.45} />
          <ellipse rx={0.8} ry={0.52} fill={col} stroke="none" />
        </g>
      );
    case 'anchor':
      // the anchor of Seleucus
      return (
        <g>
          <circle cy={-2.55} r={0.55} fill="none" stroke={col} strokeWidth={0.45} />
          <path d="M0 -2 L0 2.7 M-1.35 -1.25 L1.35 -1.25" fill="none" stroke={col} strokeWidth={0.68} strokeLinecap="round" />
          <path d="M-2.3 0.55 C-2.1 2 -1.2 2.85 0 2.85 C1.2 2.85 2.1 2 2.3 0.55" fill="none" stroke={col} strokeWidth={0.62} />
          <path d="M-2.3 0.4 L-2.8 1.35 L-1.85 1.25 Z M2.3 0.4 L2.8 1.35 L1.85 1.25 Z" fill={col} />
        </g>
      );
    case 'eagle':
      // the Ptolemaic eagle
      return (
        <g fill={col}>
          <path d={EAGLE_WING} />
          <path d={EAGLE_WING} transform="scale(-1 1)" />
          <ellipse cy={0.3} rx={0.82} ry={1.7} />
          <circle cy={-1.85} r={0.66} />
          <path d="M0.45 -2.05 L1.15 -1.75 L0.5 -1.45 Z" />
          <path d="M-0.95 1.5 L0 3.1 L0.95 1.5 Z" />
        </g>
      );
    case 'trident':
      return (
        <g>
          <path d="M0 3 L0 -2.4 M-1.75 -2.8 C-1.75 -1.2 -1 -0.8 0 -0.8 C1 -0.8 1.75 -1.2 1.75 -2.8" fill="none" stroke={col} strokeWidth={0.62} strokeLinecap="round" />
          <path d="M0 -3.5 L0.55 -2.3 L-0.55 -2.3 Z M-1.75 -3.45 L-1.25 -2.5 L-2.25 -2.5 Z M1.75 -3.45 L2.25 -2.5 L1.25 -2.5 Z" fill={col} />
        </g>
      );
    case 'wingedDisc':
      // the winged sun of the Achaemenids
      return (
        <g fill={col}>
          <path d={DISC_WING} />
          <path d={DISC_WING} transform="scale(-1 1)" />
          <circle r={1.1} stroke={edge} strokeWidth={0.25} />
          <path d="M-0.75 0.9 L0 2.3 L0.75 0.9 Z" />
          <path d="M-0.55 -0.9 L0 -2 L0.55 -0.9 Z" />
        </g>
      );
    case 'stag':
      // Scythian animal style: a recumbent stag with sweeping antlers
      return (
        <g>
          <path d="M-2.9 1.6 C-3.1 0.4 -2.1 -0.4 -0.7 -0.45 C0.7 -0.5 1.5 -0.7 2.1 -1.5 L2.55 -2 C3.1 -1.9 3.35 -1.35 3.15 -0.95 L2.6 -0.6 C2.4 0.2 2 0.95 1.2 1.35 L1.7 2.25 L0.4 1.65 L-0.95 1.8 L-0.55 2.45 L-1.85 1.85 Z" fill={col} stroke={edge} strokeWidth={0.25} />
          <path d="M2.25 -1.85 C1.8 -3 0.4 -3.4 -1 -3.2 C-2 -3 -2.8 -2.4 -3.2 -1.6 M1.4 -2.7 L1.85 -3.65 M0.4 -3.2 L0.65 -4.15 M-0.8 -3.2 L-0.85 -4.05 M-2 -2.8 L-2.35 -3.55" fill="none" stroke={col} strokeWidth={0.48} strokeLinecap="round" />
        </g>
      );
    case 'wheel':
      // the chakra
      return (
        <g>
          <circle r={2.6} fill="none" stroke={col} strokeWidth={0.68} />
          <path d={SPOKES} stroke={col} strokeWidth={0.4} />
          <circle r={0.72} fill={col} />
        </g>
      );
    case 'meru':
      // the Mauryan arched hill with crescent
      return (
        <g>
          <path d="M-2.7 2.8 L-2.7 1.7 A1.35 1.35 0 0 1 0 1.7 A1.35 1.35 0 0 1 2.7 1.7 L2.7 2.8 M-1.35 1.5 L-1.35 0.4 A1.35 1.35 0 0 1 1.35 0.4 L1.35 1.5 M0 -0.95 L0 -1.75 M-3.1 2.85 L3.1 2.85" fill="none" stroke={col} strokeWidth={0.52} strokeLinecap="round" />
          <path d="M-1.05 -2.45 A1.05 1.05 0 0 0 1.05 -2.45 A0.85 0.72 0 0 1 -1.05 -2.45 Z" fill={col} />
        </g>
      );
    default:
      return null;
  }
}

function EmblemAt({ kind, at, f, c, bg }: { kind: EmblemKind; at: [number, number, number]; f: Fig; c: string; bg: string }) {
  return <Emblem kind={kind} cx={at[0]} cy={at[1]} s={at[2]} f={f} c={c} bg={bg} />;
}

// ---------------------------------------------------------------------------------------------
// Shields (held on the near / left arm, in front of the body)

export type ShieldKind =
  | 'scutum' | 'aspis' | 'oval' | 'longOval' | 'round' | 'none'
  // Expansion #1: small embossed phalanx shield, Persian wicker spara, crescent pelta / taka, Indian bamboo, thureos
  | 'phalanx' | 'spara' | 'pelta' | 'bamboo' | 'thureos';

/** The device a figure's shield carries (the look's emblems cycle by figure index; painted shields may have their own). */
function emblemFor(p: Palette, painted: boolean, i: number): EmblemKind {
  const kinds = painted && p.style.paintEmblems ? p.style.paintEmblems : p.style.emblems;
  return kinds[i % kinds.length];
}

/** Where each base device sits on the aspis and the oval (kept exactly as the base game drew them). */
const ASPIS_AT: Partial<Record<EmblemKind, [number, number, number]>> = { syracuse: [4.4, -14.4, 1.15], carthage: [4.4, -14.2, 1.25], rome: [4.4, -14.4, 0.95] };
const OVAL_AT: Partial<Record<EmblemKind, [number, number, number]>> = { carthage: [4.5, -13.4, 1.15], syracuse: [4.5, -13.8, 1.0], rome: [4.5, -13.8, 0.95] };

/** Small dots as a single path (fewer DOM nodes). */
export function dots(pts: readonly (readonly [number, number])[], r: number): string {
  const d = (2 * r).toFixed(2);
  const rr = r.toFixed(2);
  return pts.map(([x, y]) => `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${rr} ${rr} 0 1 0 ${d} 0a${rr} ${rr} 0 1 0 -${d} 0Z`).join('');
}

const PHALANX_DOTS = dots(Array.from({ length: 12 }, (_, k) => {
  const a = (Math.PI * 2 * k) / 12;
  return [4.2 + Math.cos(a) * 4.82, -17 + Math.sin(a) * 5.3] as const;
}), 0.34);

export function Shield({ kind, f, dx = 0, dy = 0, s = 1, emblem = true, painted }: {
  kind: ShieldKind; f: Fig; dx?: number; dy?: number; s?: number; emblem?: boolean;
  /** Use the army's painted (light troops / tribal) shield colours instead of the line-infantry shield. */
  painted?: boolean;
}) {
  const { p } = f;
  const kit = p.kit;
  const pt = painted ?? (kind === 'round' || kind === 'longOval' || kind === 'pelta');
  const face = pt ? p.paint : p.shield;
  const faceShade = pt ? p.paintShade : p.shieldShade;
  const faceLight = pt ? p.paintLight : p.shieldLight;
  const emb = pt ? p.paintEmblem : p.shieldEmblem;
  const ek = emblemFor(p, pt, f.i);
  let body: ReactNode = null;
  if (kind === 'scutum') {
    body = (
      <>
        <Shape d="M-1 -22.2 C2.4 -23.3 6.2 -23.2 9 -21.9 L9.2 -5.2 C6.3 -3.9 2.5 -3.9 -0.8 -5 Z" f={face} />
        <Paint d="M-1 -22.2 C0.2 -22.6 1.2 -22.8 2.2 -22.9 L2.3 -4.2 C1.2 -4.3 0.1 -4.6 -0.8 -5 Z" f={faceShade} mx={4.1} />
        <Hi d="M8.1 -20.9 L8.3 -6.4" c={faceLight} w={0.9} mx={4.1} />
        <Hi d="M-0.6 -21.8 C2.6 -22.8 6.1 -22.7 8.7 -21.5" c={p.shieldRim} w={0.8} o={1} />
        <Hi d="M-0.5 -5.4 C2.6 -4.3 6.1 -4.3 8.8 -5.6" c={p.shieldRim} w={0.8} o={1} />
        {emblem && <Emblem kind="rome" cx={4.9} cy={-13.6} s={1.15} f={f} c={emb} />}
        <Hi d="M4.8 -22.6 L4.9 -4.4" c={faceShade} w={0.7} o={0.8} />
        <ellipse cx={4.9} cy={-13.6} rx={1.8} ry={2.3} fill={p.metal} stroke={OL} strokeWidth={0.6} />
        <circle cx={4.5} cy={-14.3} r={0.55} fill={p.metalLight} />
      </>
    );
  } else if (kind === 'aspis') {
    body = (
      <>
        <ellipse cx={3.9} cy={-14.4} rx={6.9} ry={8.1} fill={p.shieldRim} stroke={OL} strokeWidth={OW} />
        <ellipse cx={4.2} cy={-14.4} rx={5.7} ry={6.9} fill={face} />
        <Paint d="M0.2 -19.4 C-1.6 -16 -1.6 -12 0.6 -9 C1.6 -7.8 3 -7.2 4.2 -7.5 C1.6 -9.6 0.6 -15 1.8 -20.6 Z" f={faceShade} o={0.75} mx={4.2} />
        <Hi d="M-0.8 -18.6 C0.2 -20.8 2 -22.2 4 -22.3" c={p.metalLight} w={0.8} mx={3.9} mr={false} />
        {emblem && <EmblemAt kind={ek} at={ASPIS_AT[ek] ?? [4.4, -14.4, 1.12]} f={f} c={emb} bg={face} />}
        <Hi d="M5.6 -20.2 C8 -18.4 8.8 -14.6 8 -11.2" c={faceLight} w={0.7} o={0.8} mx={4.2} />
      </>
    );
  } else if (kind === 'oval') {
    body = (
      <>
        <ellipse cx={4.3} cy={-13.8} rx={5.1} ry={8.6} fill={face} stroke={OL} strokeWidth={OW} />
        <Paint d="M0.6 -19.6 C-1 -15.6 -0.9 -11 0.9 -7.6 C1.8 -6.4 2.8 -5.6 3.8 -5.3 C2.2 -9 1.8 -15.6 2.6 -22.1 C1.8 -21.5 1.1 -20.6 0.6 -19.6 Z" f={faceShade} mx={4.3} />
        <ellipse cx={4.3} cy={-13.8} rx={4.4} ry={7.9} fill="none" stroke={p.shieldRim} strokeWidth={0.6} />
        {emblem && <EmblemAt kind={ek} at={OVAL_AT[ek] ?? [4.5, -13.8, 1.05]} f={f} c={emb} bg={face} />}
        <Hi d="M7.4 -19.4 C8.6 -16.6 8.8 -12.4 7.8 -9" c={faceLight} w={0.8} mx={4.3} />
        {kit === 'roman' && <ellipse cx={4.5} cy={-13.8} rx={1.3} ry={1.8} fill={p.metal} stroke={OL} strokeWidth={0.5} />}
      </>
    );
  } else if (kind === 'longOval') {
    body = (
      <>
        <path d="M4.4 -24.2 C7.6 -24.2 8.4 -19 8.4 -13.6 C8.4 -8.2 7.6 -3.2 4.4 -3.2 C1.2 -3.2 0.4 -8.2 0.4 -13.6 C0.4 -19 1.2 -24.2 4.4 -24.2 Z" fill={face} stroke={OL} strokeWidth={OW} />
        <Paint d="M2.2 -22.8 C0.9 -20.4 0.5 -16.8 0.5 -13.6 C0.5 -9.8 1 -6.4 2.6 -4 C2.2 -8 2.1 -18 3 -23.6 Z" f={faceShade} mx={4.4} />
        <Hi d="M4.4 -23.6 L4.4 -3.8" c={darken(face, 0.35)} w={0.9} o={1} />
        <ellipse cx={4.4} cy={-13.6} rx={1.5} ry={3.1} fill={p.metal} stroke={OL} strokeWidth={0.55} />
        <Hi d="M7.1 -20.4 C7.8 -17.4 7.8 -10 7.1 -6.8" c={faceLight} w={0.7} mx={4.4} />
        {emblem && (
          <g fill="none" stroke={emb} strokeWidth={0.75} strokeLinecap="round">
            <path d="M2.2 -20.6 C3 -19.4 5.8 -19.4 6.6 -20.6 M2.2 -6.6 C3 -7.8 5.8 -7.8 6.6 -6.6" />
          </g>
        )}
      </>
    );
  } else if (kind === 'round') {
    body = (
      <>
        <circle cx={5.4} cy={-15} r={4.4} fill={p.shieldRim} stroke={OL} strokeWidth={OW} />
        <circle cx={5.6} cy={-15} r={3.5} fill={face} />
        <Paint d="M3 -17.6 C1.9 -15.6 2.1 -13.2 3.4 -11.8 C2.6 -13.6 2.7 -16 3.8 -18.2 Z" f={faceShade} mx={5.6} />
        <circle cx={5.7} cy={-15} r={1.05} fill={p.metal} stroke={OL} strokeWidth={0.45} />
        <Hi d="M3.2 -18.4 C4.2 -19.3 5.6 -19.6 6.8 -19.2" c={p.metalLight} w={0.6} mx={5.4} mr={false} />
      </>
    );
  } else if (kind === 'phalanx') {
    // small, deep phalanx shield hung from the neck, embossed rim
    const rimDot = lighten(p.shieldRim, 0.45);
    body = (
      <>
        <ellipse cx={4.2} cy={-17} rx={5.4} ry={5.9} fill={p.shieldRim} stroke={OL} strokeWidth={OW} />
        <path d={PHALANX_DOTS} fill={rimDot} />
        <ellipse cx={4.4} cy={-17} rx={4.3} ry={4.75} fill={face} stroke={darken(p.shieldRim, 0.4)} strokeWidth={0.35} />
        <Paint d="M1.3 -20.4 C-0.1 -18 0 -15.2 1.5 -13.1 C2.3 -12.4 3.2 -12.1 4.2 -12.3 C2.1 -13.9 1.5 -17.2 2.5 -21.2 Z" f={faceShade} o={0.7} mx={4.4} />
        {emblem && <Emblem kind={ek} cx={4.4} cy={-17} s={0.98} f={f} c={emb} bg={face} />}
        <Hi d="M-0.4 -20.2 C0.4 -21.9 2 -22.8 3.8 -22.9" c={p.metalLight} w={0.75} mx={4.2} mr={false} />
        <Hi d="M5.9 -21.2 C7.8 -19.8 8.4 -16.8 7.7 -14.2" c={faceLight} w={0.65} o={0.8} mx={4.4} />
      </>
    );
  } else if (kind === 'spara') {
    // tall rectangular shield of wicker rods bound with leather
    body = (
      <>
        <Shape d="M-1.2 -23.4 C2.4 -23.9 6 -23.9 9.2 -23.2 L9.4 -4.6 C6 -4 2.4 -4 -1 -4.6 Z" f={face} />
        <Paint d="M-1.2 -23.4 C0 -23.6 1 -23.7 2 -23.75 L2.2 -4.15 C1.2 -4.2 0.1 -4.35 -1 -4.6 Z" f={faceShade} mx={4.1} />
        <Hi d="M0.9 -23.2 L1.1 -4.4 M3 -23.4 L3.2 -4.2 M5.1 -23.4 L5.3 -4.2 M7.2 -23.3 L7.4 -4.3" c={faceShade} w={0.5} o={0.9} />
        <Hi d="M-1.1 -18.6 C2.6 -19.1 6 -19.1 9.3 -18.5 M-1.1 -13.9 C2.6 -14.4 6 -14.4 9.3 -13.8 M-1.05 -9.2 C2.6 -9.7 6 -9.7 9.35 -9.1" c={p.shieldRim} w={0.85} o={1} />
        <Hi d="M-0.9 -23 C2.4 -23.5 6 -23.5 9 -22.8 M-0.8 -5 C2.4 -4.4 6 -4.4 9.2 -5" c={p.shieldRim} w={0.75} o={1} />
        <Hi d="M8.6 -22.4 L8.8 -5.6" c={faceLight} w={0.8} mx={4.1} />
      </>
    );
  } else if (kind === 'pelta') {
    // crescent shield (Thracian pelta, Persian taka)
    const wicker = kit === 'persian' || kit === 'scythian';
    body = (
      <>
        <Shape d="M-0.2 -21.6 C1.2 -18.8 3 -17 5 -17 C7 -17 8.8 -18.8 10.2 -21.6 C11.2 -16.4 9 -10.6 5 -9.8 C1 -10.6 -1.2 -16.4 -0.2 -21.6 Z" f={face} />
        <Paint d="M-0.2 -21.6 C0.2 -20.8 0.7 -20 1.3 -19.3 C1 -16.2 1.8 -12.6 3.4 -10.2 C0.6 -11.4 -1.1 -16.4 -0.2 -21.6 Z" f={faceShade} mx={5} />
        {wicker && <Hi d="M1.4 -17.6 C2.4 -13.8 3.5 -11.8 5 -11.2 C6.5 -11.8 7.6 -13.8 8.6 -17.6 M3.2 -16.6 C3.6 -14.8 4.2 -13.4 5 -12.8 C5.8 -13.4 6.4 -14.8 6.8 -16.6" c={faceShade} w={0.45} o={0.9} />}
        <Hi d="M0.5 -20.4 C1.8 -18.2 3.4 -16.4 5 -16.4 C6.6 -16.4 8.2 -18.2 9.5 -20.4 C10 -16 8.2 -11.4 5 -10.5 C1.8 -11.4 0 -16 0.5 -20.4" c={p.shieldRim} w={0.5} o={1} />
        {emblem && !wicker && <Emblem kind={ek} cx={5} cy={-13.4} s={0.7} f={f} c={emb} bg={face} />}
        <Hi d="M9.4 -19.4 C9.8 -16.4 9 -13 7.4 -11.2" c={faceLight} w={0.65} mx={5} />
      </>
    );
  } else if (kind === 'bamboo') {
    // long narrow Indian shield of bamboo slats
    body = (
      <>
        <Shape d="M1.3 -23.6 C1.5 -25 2.9 -25.8 4.4 -25.8 C5.9 -25.8 7.3 -25 7.5 -23.6 L7.7 -4.6 C6 -3.8 2.8 -3.8 1.1 -4.6 Z" f={face} />
        <Paint d="M1.3 -23.6 C1.4 -24.3 1.9 -24.9 2.6 -25.3 L2.8 -4 C2.2 -4.1 1.6 -4.3 1.1 -4.6 Z" f={faceShade} mx={4.4} />
        <Hi d="M3.5 -25.5 L3.6 -4.1 M4.9 -25.7 L5 -4 M6.3 -25.3 L6.4 -4.2" c={faceShade} w={0.42} o={0.9} />
        <Hi d="M1.2 -20.6 L7.6 -20.6 M1.2 -14.4 L7.6 -14.4 M1.2 -8.2 L7.6 -8.2" c={p.shieldRim} w={0.85} o={1} />
        <Hi d="M7 -23.4 L7.2 -5.2" c={faceLight} w={0.7} mx={4.4} />
      </>
    );
  } else if (kind === 'thureos') {
    // long oval with a spine and a strip boss (later Hellenistic infantry)
    body = (
      <>
        <ellipse cx={4.3} cy={-13.8} rx={4.9} ry={9.1} fill={face} stroke={OL} strokeWidth={OW} />
        <Paint d="M0.6 -19.6 C-1 -15.6 -0.9 -11 0.9 -7.6 C1.8 -6.4 2.8 -5.6 3.8 -5.3 C2.2 -9 1.8 -15.6 2.6 -22.1 C1.8 -21.5 1.1 -20.6 0.6 -19.6 Z" f={faceShade} mx={4.3} />
        <ellipse cx={4.3} cy={-13.8} rx={4.2} ry={8.4} fill="none" stroke={p.shieldRim} strokeWidth={0.6} />
        <Line2 d="M4.4 -21.9 L4.4 -5.7" w={0.8} c={darken(face, 0.18)} ow={0.3} />
        <ellipse cx={4.4} cy={-13.8} rx={1.15} ry={2.3} fill={p.metal} stroke={OL} strokeWidth={0.5} />
        <Hi d="M7.4 -19.6 C8.6 -16.6 8.8 -12.4 7.8 -8.8" c={faceLight} w={0.8} mx={4.3} />
      </>
    );
  }
  if (!body) return null;
  if (!dx && !dy && s === 1) return <>{body}</>;
  return <g transform={`translate(${dx} ${dy})${s !== 1 ? ` scale(${s})` : ''}`}>{body}</g>;
}

// ---------------------------------------------------------------------------------------------
// Heads & helmets

export type Helmet =
  | 'none' | 'montefortino' | 'corinthian' | 'attic' | 'atticOpen' | 'pilos' | 'cap' | 'conical'
  // Expansion #1 bronze helmets
  | 'phrygian' | 'thracian' | 'boeotian'
  // cloth headgear (colour: palette `cap`): Persian hood, Persian royal tiara, Scythian cap, turban, Macedonian kausia,
  // broad-brimmed petasos, Egyptian headcloth, and a plain fillet (headband)
  | 'tiara' | 'kidaris' | 'scythianCap' | 'turban' | 'kausia' | 'petasos' | 'nemes' | 'fillet';
/** `plume2`: a pair of tall feathers at the helmet's sides; `horns`: goat horns (Pyrrhus). */
export type Crest = 'none' | 'plumes' | 'horsehair' | 'knob' | 'tall' | 'plume2' | 'horns';
/** `locks`: long hair falling from under a helmet to the shoulders (Spartans). */
export type Hair = 'short' | 'long' | 'wild' | 'bald' | 'locks';

/** Headgear that leaves the hair showing at the back. */
const HAIR_SHOWS: ReadonlySet<Helmet> = new Set<Helmet>(['none', 'cap', 'kausia', 'petasos', 'fillet']);

const HEAD =
  'M-2.3 -25.2 C-2.3 -27.4 -0.8 -28.5 1.1 -28.5 C3.1 -28.5 4.3 -27.3 4.4 -25.6 L5.1 -24.2 L4.4 -23.9 C4.4 -22.6 3.4 -21.8 2 -21.7 C-0.4 -21.6 -2.3 -22.9 -2.3 -25.2 Z';

export function Head({ f, helmet, crest, hair: hairKind = 'short', beard = false, moustache = false, torc = false }: {
  f: Fig; helmet: Helmet; crest: Crest; hair?: Hair; beard?: boolean; moustache?: boolean; torc?: boolean;
}) {
  const { p } = f;
  const showHair = HAIR_SHOWS.has(helmet);
  const locks = hairKind === 'locks';
  const hair = locks ? 'long' : hairKind;
  return (
    <>
      {/* long hair behind the head */}
      {(showHair || locks) && (hair === 'long' || hair === 'wild') && (
        <>
          <Shape
            d="M-2.6 -26.4 C-3.6 -25 -3.8 -23.4 -4.4 -21.8 C-4.8 -20.8 -5.6 -20.2 -6 -19.4 C-4.6 -19.2 -3.4 -19.6 -2.6 -20.2 C-2.4 -19.4 -1.6 -18.8 -0.8 -18.8 C-1 -19.8 -0.6 -21 0 -22.4 L1 -25.6 Z"
            f={f.hair}
          />
          <Hi d="M-2.8 -24.6 C-3.4 -22.8 -4.2 -21.2 -5 -20.2 M-1.2 -23.6 C-1.4 -22 -1.6 -20.6 -1.2 -19.4" c={darken(f.hair, 0.35)} w={0.45} o={1} />
        </>
      )}
      <Shape d="M-0.6 -21 L1.9 -21 L2.1 -23.2 L-0.5 -23.2 Z" f={f.skinShade} sw={0.6} />
      {torc && <Line2 d="M-0.8 -21.6 C0.2 -20.9 1.4 -20.9 2.4 -21.6" w={0.75} c={p.gold} ow={0.4} />}
      <Shape d={HEAD} f={f.skin} />
      <Paint d="M-2.1 -24.6 C-2 -23 -0.8 -21.9 1 -21.7 C0 -22.6 -0.6 -23.8 -0.6 -25.2 Z" f={f.skinShade} o={0.7} />
      <circle cx={3.2} cy={-25.1} r={0.46} fill={OL} />
      {beard && <Shape d="M0.6 -23.6 C1.4 -22.4 2.6 -21.6 3.8 -21.8 C4.6 -22.2 4.8 -23 4.6 -23.6 C3.6 -23.2 2.2 -23.4 0.6 -23.6 Z" f={f.hair} sw={0.5} />}
      {moustache && <Line2 d="M4.7 -23.7 C4.3 -23.1 3.6 -22.6 3.2 -21.4" w={0.9} c={f.hair} ow={0.35} />}
      {showHair && hair !== 'bald' && (
        <Shape
          d={hair === 'wild'
            ? 'M-2.7 -24.4 L-5.6 -25.4 L-3.4 -26.6 L-5.8 -28.4 L-2.8 -28.6 L-3.8 -31 L-0.8 -29.8 L0.2 -31.8 L1.6 -29.7 C3.2 -29.7 4.6 -28.6 4.8 -26.6 C3.8 -27 2.6 -26.8 1.6 -26.2 C1 -25.2 0.4 -24.2 -0.4 -23.4 C-1.2 -23 -2 -23.4 -2.7 -24.4 Z'
            : hair === 'long'
              ? 'M-2.8 -24.4 C-3.2 -27.8 -1.2 -29.6 1.3 -29.5 C3.5 -29.4 5 -28 4.8 -26 C4.2 -26.8 3.4 -26.6 2.8 -26.9 C2.2 -26.2 1.6 -26.4 1.2 -25.8 C0.8 -24.6 0 -23.6 -1 -22.8 C-1.8 -23 -2.4 -23.6 -2.8 -24.4 Z'
              : 'M-2.6 -24.6 C-2.9 -27.6 -0.9 -29 1.3 -28.9 C3.3 -28.8 4.6 -27.6 4.5 -26 C3.4 -26.7 2 -26.6 1.2 -25.9 C0.8 -24.6 -0.2 -23.2 -1.4 -22.4 C-2.1 -22.9 -2.5 -23.6 -2.6 -24.6 Z'}
          f={f.hair}
          sw={0.65}
        />
      )}
      {showHair && (hair === 'long' || hair === 'wild') && (
        <Hi d="M-1.6 -27.4 C-0.4 -28.4 1.2 -28.6 2.6 -28.2 M-1.8 -25.8 C-1.2 -26.8 -0.2 -27.4 0.8 -27.4" c={lighten(f.hair, 0.35)} w={0.45} o={0.9} />
      )}
      {showHair && <ellipse cx={0.5} cy={-24.7} rx={0.6} ry={0.9} fill={f.skinShade} />}
      <Helm f={f} helmet={helmet} crest={crest} />
    </>
  );
}

export function Helm({ f, helmet, crest }: { f: Fig; helmet: Helmet; crest: Crest }) {
  if (crest === 'horns' && helmet !== 'none') {
    return (
      <>
        <HelmBody f={f} helmet={helmet} crest={crest} />
        <GoatHorns f={f} />
      </>
    );
  }
  return <HelmBody f={f} helmet={helmet} crest={crest} />;
}

/** Goat horns sweeping back from the temples of a helmet (Pyrrhus, after Plutarch). */
function GoatHorns({ f }: { f: Fig }) {
  const { p } = f;
  return (
    <>
      <Shape d="M3.4 -28.2 C2.8 -31.4 0.4 -33.6 -3.4 -34.2 C-4.6 -34.4 -5.4 -34 -5.6 -33.4 C-2.4 -33 0.2 -31.4 1.4 -28.4 Z" f={p.ivory} sw={0.55} />
      <Hi d="M2.4 -29.4 L1.6 -29.6 M1.2 -31 L0.4 -31.1 M-0.4 -32.2 L-1.1 -32.2 M-2.2 -33 L-2.8 -32.9" c={darken(p.ivory, 0.4)} w={0.35} o={1} />
    </>
  );
}

function HelmBody({ f, helmet, crest }: { f: Fig; helmet: Helmet; crest: Crest }) {
  const { p } = f;
  if (helmet === 'none') return null;
  const crestEl = <CrestEl f={f} crest={crest} helmet={helmet} />;
  if (helmet === 'montefortino') {
    return (
      <>
        {crest === 'horsehair' || crest === 'tall' ? crestEl : null}
        <Shape d="M4.9 -25.8 C4.9 -28.7 3.2 -30.2 1.1 -30.2 C-1 -30.2 -2.7 -28.6 -2.7 -25.8 L-3.9 -24.3 L-1.5 -24.6 L4.9 -25.2 Z" f={p.metal} />
        <Paint d="M-2.7 -25.8 L-3.9 -24.3 L-1.5 -24.6 L4.9 -25.2 L4.9 -25.9 C2 -25.9 -0.4 -25.8 -2.7 -25.8 Z" f={p.metalShade} />
        <Hi d="M-1.5 -27.9 C-0.9 -29 0.3 -29.5 1.4 -29.5" c={p.metalLight} w={0.75} mx={1.1} mr={false} />
        <Shape d="M-0.4 -25.4 L2 -25.4 L1.8 -22.4 C1.1 -21.9 0.3 -22.1 -0.2 -22.6 Z" f={p.metal} sw={0.55} />
        {crest === 'plumes' || crest === 'knob' ? crestEl : null}
        <circle cx={1.1} cy={-30.5} r={0.85} fill={p.metal} stroke={OL} strokeWidth={0.5} />
      </>
    );
  }
  if (helmet === 'corinthian') {
    return (
      <>
        {crestEl}
        <Shape d="M-2.9 -24 C-3.1 -28.4 -1 -30.2 1.3 -30.2 C3.7 -30.2 5.1 -28.6 5.1 -25.8 L5.2 -22.8 C4.8 -21.8 3.8 -21.4 3.1 -21.7 L3 -24 L2.3 -24 L2.3 -21.5 C1 -21.2 -0.8 -21.2 -2.1 -21.8 C-2.5 -22.4 -2.8 -23.2 -2.9 -24 Z" f={p.metal} />
        <path d="M2.5 -25.9 L5.1 -25.7 L5.1 -24.6 L3.3 -24.6 L3.1 -22 L2.5 -22 Z" fill="#2a1a10" />
        <Paint d="M-2.9 -24 C-2.8 -23.2 -2.5 -22.4 -2.1 -21.8 C-0.8 -21.2 1 -21.2 2.3 -21.5 L2.3 -22.6 C0.6 -22.6 -1.6 -23 -2.9 -24 Z" f={p.metalShade} />
        <Hi d="M-1.8 -27.8 C-1 -29.2 0.4 -29.6 1.6 -29.6" c={p.metalLight} w={0.75} mx={1.1} mr={false} />
        <Hi d="M-1.6 -25.4 C-0.4 -24.6 0.8 -24.4 2 -24.6" c={p.metalShade} w={0.45} />
      </>
    );
  }
  if (helmet === 'attic' || helmet === 'atticOpen') {
    return (
      <>
        {crestEl}
        <Shape d="M5.5 -25.6 C5.2 -28.6 3.3 -30.2 1.1 -30.2 C-1.1 -30.2 -2.8 -28.5 -2.8 -25.6 L-3 -22.9 L-1.4 -23.5 L-0.9 -25.2 L4.1 -25.2 Z" f={p.metal} />
        {helmet === 'attic' && <Shape d="M-0.3 -25.3 L2.2 -25.3 L2 -22.1 C1.3 -21.6 0.4 -21.8 0 -22.3 Z" f={p.metal} sw={0.55} />}
        <Hi d="M-1.6 -27.9 C-0.9 -29.1 0.4 -29.6 1.5 -29.6" c={p.metalLight} w={0.75} mx={1.1} mr={false} />
        <Hi d="M-0.8 -25.6 L5 -25.8" c={p.metalShade} w={0.5} />
      </>
    );
  }
  if (helmet === 'pilos' || helmet === 'conical') {
    const tall = helmet === 'conical';
    return (
      <>
        <Shape d={tall
          ? 'M-2.9 -25.2 C-2.6 -28.4 -0.6 -31.6 1 -32.6 C2.6 -31.6 4.6 -28.6 5 -25.4 Z'
          : 'M-2.8 -25.3 C-2.8 -28.2 -1 -31.2 1 -31.6 C3 -31.2 4.8 -28.4 4.9 -25.4 Z'} f={p.metal} />
        <Paint d="M-2.8 -25.3 L4.9 -25.4 L4.9 -26.1 L-2.8 -26 Z" f={p.metalShade} />
        <Hi d="M-1.4 -27.6 C-0.8 -29.4 0.2 -30.6 1 -31" c={p.metalLight} w={0.7} mx={1.1} mr={false} />
        {crestEl}
      </>
    );
  }
  if (helmet === 'cap') {
    return (
      <>
        <Shape d="M-2.6 -25.6 C-2.8 -28.6 -0.8 -29.9 1.2 -29.9 C3.1 -29.9 4.7 -28.8 4.6 -26.4 C3.6 -26.2 2.6 -26.1 1.6 -26.3 L-2.6 -25.4 Z" f={p.leather} />
        <Hi d="M-1.4 -27.8 C-0.6 -28.9 0.4 -29.3 1.4 -29.3" c={lighten(p.leather, 0.35)} w={0.6} />
      </>
    );
  }
  return <NewHelm f={f} helmet={helmet} crest={crest} crestEl={crestEl} />;
}

/** The Expansion #1 helmets and cloth headgear. */
/** The Persian royal diadem: a white band with slanted blue stripes (Plutarch's blue-and-white fillet), at the kidaris' foot. */
const DIADEM_BLUE = '#2a5aa8';
const DIADEM_WHITE = '#f4f0e4';
const DIADEM = (() => {
  // lower edge follows the tiara's base, the upper edge runs 1.5 above it (x pulled in by the cone's taper)
  const lo: [number, number][] = [[-2.9, -25.3], [-1, -25.79], [1.08, -26.03], [3.12, -26], [4.9, -25.7]];
  const up: [number, number][] = [[-2.71, -26.8], [-1, -27.29], [1.08, -27.53], [3.12, -27.5], [4.7, -27.2]];
  const at = (pts: [number, number][], x: number) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [x0, y0] = pts[k];
      const [x1, y1] = pts[k + 1];
      if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
    return pts[pts.length - 1][1];
  };
  const f = (n: number) => n.toFixed(2);
  const outline = `M${lo.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} L${[...up].reverse().map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z`;
  // slanted stripes: each starts on the lower edge and ends 0.9 further along the upper edge
  const stripes = [-1.9, 0.1, 2.1]
    .map((x) => {
      const a = [x, at(lo, x)];
      const b = [x + 1.1, at(lo, x + 1.1)];
      const c = [x + 2, at(up, x + 2)];
      const d = [x + 0.9, at(up, x + 0.9)];
      return `M${[a, b, c, d].map(([px, py]) => `${f(px)} ${f(py)}`).join(' L')} Z`;
    })
    .join(' ');
  return { outline, stripes };
})();

function NewHelm({ f, helmet, crest, crestEl }: { f: Fig; helmet: Helmet; crest: Crest; crestEl: ReactNode }) {
  const { p } = f;
  const cloth = p.cap ?? p.linen;
  const clothShade = p.capShade ?? p.linenShade;
  const band = p.pattern ?? p.trim;
  if (helmet === 'phrygian' || helmet === 'thracian') {
    // bronze helmet with a forward-curving apex; the Thracian has a lower apex, a brow peak and long cheek-pieces
    const thr = helmet === 'thracian';
    return (
      <>
        {crest !== 'plume2' && crestEl}
        <Shape d={thr
          ? 'M-2.9 -23.4 C-3.3 -26.8 -2.8 -29.6 -0.8 -31 C0.8 -32 3 -32.4 4.6 -31.8 C5 -31.6 5 -31.1 4.6 -30.9 C3.9 -30.5 3.8 -29.8 4.2 -29 C4.7 -28 5 -27 5.1 -26 L6.6 -25.6 L5.2 -25 L-0.6 -25 L-1.1 -23.2 Z'
          : 'M-2.9 -23.4 C-3.3 -26.8 -2.9 -29.8 -0.8 -31.3 C1 -32.7 3.4 -33.5 5.6 -32.9 C6.1 -32.7 6.1 -32.1 5.6 -31.9 C4.4 -31.5 3.9 -30.7 4.3 -29.7 C4.8 -28.7 5.2 -27.5 5.3 -26.2 L6.2 -25.9 L5.2 -25.3 L-0.6 -25.1 L-1.1 -23.2 Z'} f={p.metal} />
        <Paint d="M-2.9 -23.4 C-3.1 -25.2 -3 -26.8 -2.6 -28.2 C-1.8 -27 -1.2 -25.8 -1.1 -23.2 Z" f={p.metalShade} />
        <Hi d="M-1.8 -28.2 C-1 -30 0.6 -31.2 2.4 -31.7" c={p.metalLight} w={0.7} mx={1.1} mr={false} />
        <Hi d="M-0.6 -25.6 L5.2 -25.8" c={p.metalShade} w={0.5} />
        <Shape d={thr
          ? 'M-0.4 -25.2 L2.4 -25.2 C2.6 -24 2.5 -22.4 2 -21.2 C1.2 -20.8 0.4 -21 -0.1 -21.6 Z'
          : 'M-0.3 -25.2 L2.2 -25.2 L2 -22.2 C1.3 -21.7 0.4 -21.9 0 -22.4 Z'} f={p.metal} sw={0.55} />
        {thr && <Hi d="M0.4 -23.8 C0.9 -23.2 1.4 -23 2 -23.2" c={p.metalShade} w={0.4} />}
        {crest === 'plume2' && crestEl}
      </>
    );
  }
  if (helmet === 'boeotian') {
    // the folded-brim "Boeotian" helmet, shaped like a felt sun hat
    return (
      <>
        {crestEl}
        <Shape d="M-2.3 -26.2 C-2.5 -29.3 -0.7 -30.8 1.2 -30.8 C3.1 -30.8 4.7 -29.5 4.7 -26.4 Z" f={p.metal} />
        <Hi d="M-1.4 -28.2 C-0.8 -29.6 0.4 -30.2 1.4 -30.2" c={p.metalLight} w={0.7} mx={1.1} mr={false} />
        <Shape d="M-4.7 -24 C-4.5 -25.3 -3.3 -26.4 -1.5 -26.7 L3.8 -26.9 C5.5 -26.9 6.9 -25.8 7.3 -24.1 C6.4 -24.6 5.4 -24.8 4.6 -24.6 C4.2 -25.3 3.4 -25.6 2.6 -25.4 L-0.4 -25.2 C-1.6 -25.2 -2.6 -24.4 -3.2 -23.5 C-3.6 -23.9 -4.2 -24.1 -4.7 -24 Z" f={p.metal} sw={0.6} />
        <Hi d="M-3.8 -24.8 C-2.8 -25.9 -1.4 -26.2 0 -26.2 L4 -26.3 C5.2 -26.2 6 -25.6 6.5 -24.8" c={p.metalLight} w={0.45} o={0.8} />
        <Paint d="M-0.4 -25.2 C-1.6 -25.2 -2.6 -24.4 -3.2 -23.5 C-3.2 -24.2 -2.6 -25 -1.6 -25.6 Z" f={p.metalShade} />
      </>
    );
  }
  if (helmet === 'tiara') {
    // Persian soft felt hood covering head, neck and chin; the top flops forward
    return (
      <>
        <Shape d="M-3 -21 C-3.7 -23.6 -3.7 -27.4 -2.1 -29.6 C-0.7 -31.5 1.8 -32.1 3.7 -31.3 C4.5 -30.9 4.5 -30.1 3.9 -29.7 C3.4 -29.3 3.6 -28.5 4.2 -27.7 C4.6 -27.1 4.7 -26.5 4.6 -25.9 L2.4 -25.9 C1.6 -25.7 1.2 -25 1.2 -24.2 L1.4 -23.7 L4.9 -23.7 C5 -22.7 4.4 -21.7 3.2 -21.4 C1 -20.8 -1.4 -20.6 -3 -21 Z" f={cloth} />
        <Paint d="M-3 -21 C-3.7 -23.6 -3.7 -27.4 -2.1 -29.6 C-1.8 -27.6 -1.6 -24.4 -0.4 -21 C-1.4 -20.8 -2.3 -20.8 -3 -21 Z" f={clothShade} o={0.75} />
        <Hi d="M-0.4 -30.4 C1 -30.8 2.4 -30.8 3.4 -30.4 M1.4 -25.2 C0.6 -24.4 0.6 -23.2 1.2 -22.2" c={clothShade} w={0.45} o={0.9} />
        <Hi d="M-1.6 -29.6 C-0.6 -30.6 0.8 -31 2 -31" c={lighten(cloth, 0.4)} w={0.55} o={0.8} />
      </>
    );
  }
  if (helmet === 'kidaris') {
    // the Great King's upright tiara: a tall cone that narrows towards a flat top, the blue-and-white royal diadem round
    // its foot and the ribbon ends trailing behind
    return (
      <>
        <Shape d="M-2.8 -26.2 C-3.6 -25.6 -4.6 -24.6 -5.1 -23.2 L-4.1 -23.2 L-3.5 -23.9 L-2.6 -23.6 Z" f={DIADEM_BLUE} sw={0.5} />
        <Shape d="M-2.9 -25.3 C-2.7 -28 -2.3 -30.6 -2 -32.4 L4 -32.4 C4.3 -30.6 4.7 -28 4.9 -25.7 C2.8 -26.3 -0.6 -26.1 -2.9 -25.3 Z" f={cloth} />
        <Paint d="M-2.9 -25.3 C-2.7 -28 -2.3 -30.6 -2 -32.4 L-0.7 -32.4 C-1 -30.4 -1.2 -28 -1.1 -25.9 C-1.7 -25.8 -2.3 -25.6 -2.9 -25.3 Z" f={clothShade} o={0.8} />
        <Hi d="M3.1 -31.8 C3.3 -30.4 3.6 -28.8 3.9 -27.6" c={lighten(cloth, 0.4)} w={0.5} o={0.8} />
        <ellipse cx={1} cy={-32.4} rx={3} ry={0.6} fill={lighten(cloth, 0.2)} stroke={OL} strokeWidth={0.5} />
        <Shape d={DIADEM.outline} f={DIADEM_WHITE} sw={0.5} />
        <path d={DIADEM.stripes} fill={DIADEM_BLUE} />
      </>
    );
  }
  if (helmet === 'scythianCap') {
    // tall pointed felt cap (bashlyk) with the tip bent back and lappets over the cheeks
    return (
      <>
        <Shape d="M-2.8 -22.6 C-3.4 -25.4 -3.2 -28.4 -2 -30.6 C-1.2 -32.2 -0.8 -34.2 -1.7 -36.1 C0.6 -35.1 2.6 -32.7 3.8 -30.2 C4.6 -28.8 4.8 -27.4 4.6 -26 L2.2 -26 C1.4 -25.6 1.2 -24.6 1.4 -23.4 C1.6 -22.6 1.2 -21.8 0.4 -21.4 C-0.8 -21.2 -2.2 -21.8 -2.8 -22.6 Z" f={cloth} />
        <Paint d="M-2.8 -22.6 C-3.4 -25.4 -3.2 -28.4 -2 -30.6 C-1.6 -28 -1.2 -25 -0.6 -21.3 C-1.6 -21.4 -2.3 -21.9 -2.8 -22.6 Z" f={clothShade} o={0.75} />
        <Hi d="M-2.5 -26.6 C-0.6 -27 2 -27 4.6 -26.6" c={band} w={0.8} o={1} />
        <Hi d="M-1.4 -31.4 C-0.6 -32.8 -0.6 -34.2 -1.1 -35.2" c={lighten(cloth, 0.35)} w={0.5} o={0.8} />
      </>
    );
  }
  if (helmet === 'turban') {
    // wrapped turban with a top-knot
    return (
      <>
        <Shape d="M-2.9 -25 C-3.4 -27.8 -2 -30.2 0.6 -30.6 C3 -31 4.9 -29.8 5 -27.6 C5 -26.8 4.7 -26.2 4.3 -26 L-2.4 -24.6 Z" f={cloth} />
        <Paint d="M-2.9 -25 C-3.4 -27.8 -2 -30.2 0.2 -30.6 C-1.2 -29 -1.6 -26.8 -1.2 -24.9 Z" f={clothShade} o={0.8} />
        <Hi d="M-2.6 -26.4 C-0.4 -27.6 2.6 -28.2 4.8 -27.2 M-2.2 -28.4 C0 -29.4 2.6 -29.4 4.4 -28.6" c={clothShade} w={0.5} o={0.9} />
        <ellipse cx={2.6} cy={-30.6} rx={1.6} ry={1.25} fill={cloth} stroke={OL} strokeWidth={0.6} />
        <Hi d="M1.6 -30.6 C2.2 -31.4 3 -31.5 3.6 -31" c={lighten(cloth, 0.4)} w={0.45} o={0.9} />
      </>
    );
  }
  if (helmet === 'kausia') {
    // flat Macedonian felt beret with a rolled brim
    return (
      <>
        <Shape d="M-2.6 -27.4 C-2.8 -29.6 -0.6 -30.5 1.2 -30.5 C3.2 -30.5 4.8 -29.6 4.6 -27.4 Z" f={cloth} sw={0.6} />
        <Shape d="M-3.6 -26 C-3.8 -27.4 -2 -28.2 1 -28.3 C4 -28.3 5.8 -27.6 5.6 -26.2 C3.6 -25.6 -1.6 -25.5 -3.6 -26 Z" f={cloth} />
        <Hi d="M-3.2 -26.6 C-1.2 -26.2 3 -26.2 5.2 -26.6" c={clothShade} w={0.6} o={0.9} />
        <Hi d="M-2 -28.8 C-0.8 -29.8 1 -30 2.2 -29.8" c={lighten(cloth, 0.4)} w={0.5} o={0.8} />
      </>
    );
  }
  if (helmet === 'petasos') {
    // broad-brimmed traveller's hat
    return (
      <>
        <Shape d="M-1.8 -27.2 C-1.9 -29.6 -0.4 -30.6 1.2 -30.6 C2.9 -30.6 4.3 -29.6 4.2 -27.2 Z" f={cloth} sw={0.6} />
        <ellipse cx={1.2} cy={-27.1} rx={5.8} ry={1.25} fill={cloth} stroke={OL} strokeWidth={0.65} />
        <Hi d="M-3.8 -26.7 C-1 -26 3.4 -26 6.2 -26.7" c={clothShade} w={0.5} o={0.9} />
        <Hi d="M-0.8 -29.4 C0 -30 1 -30.1 1.8 -30" c={lighten(cloth, 0.4)} w={0.5} o={0.8} />
      </>
    );
  }
  if (helmet === 'nemes') {
    // Egyptian striped headcloth falling to the shoulders
    return (
      <>
        <Shape d="M-2.6 -25.4 C-2.8 -28.2 -1 -29.6 1.2 -29.6 C3.2 -29.6 4.7 -28.4 4.6 -26.4 L3.8 -26.2 C2.6 -26 1.8 -25.2 1.6 -24 L1.4 -21.4 L-3.6 -20.4 C-3 -21.8 -2.6 -23.6 -2.6 -25.4 Z" f={cloth} />
        <Hi d="M-2.2 -27.4 L1.6 -27.6 M-2.6 -25.6 L1.4 -25.4 M-2.8 -23.6 L1.4 -23.4 M-3.2 -21.6 L1.4 -21.8" c={band} w={0.5} o={0.9} />
        <Hi d="M-0.6 -28.8 C1.2 -29 3 -28.6 4.2 -27.4" c={band} w={0.6} o={1} />
      </>
    );
  }
  if (helmet === 'fillet') {
    // twisted cord headband (the Immortals of the Susa friezes)
    return (
      <>
        <Line2 d="M-2.5 -26.6 C-0.6 -27.6 2.4 -27.8 4.5 -27" w={0.85} c={band} ow={0.4} />
        <Hi d="M-1.6 -27 L-1.2 -27.4 M0 -27.4 L0.4 -27.8 M1.6 -27.6 L2 -28 M3.2 -27.4 L3.6 -27.7" c={darken(band, 0.4)} w={0.3} o={1} />
      </>
    );
  }
  return null;
}

function CrestEl({ f, crest, helmet }: { f: Fig; crest: Crest; helmet: Helmet }) {
  const { p } = f;
  if (crest === 'none') return null;
  if (crest === 'knob') return null;
  if (crest === 'plume2') {
    // a pair of tall feathers in holders at the sides of the helmet
    return (
      <>
        <Shape d="M-1.4 -29.6 C-3 -30.6 -4.6 -33 -5.4 -36.6 C-4 -34.8 -2.6 -33 -0.7 -30.6 Z" f={darken(p.crest, 0.12)} sw={0.5} />
        <Shape d="M2 -31 C1.2 -33.2 0.6 -35.8 0.9 -38.6 C1.6 -36 2.4 -33.6 2.9 -31.2 Z" f={p.crest} sw={0.5} />
        <Hi d="M1.9 -31.8 C1.5 -33.8 1.2 -35.8 1.1 -37.4" c={p.crestAlt} w={0.35} o={0.8} />
      </>
    );
  }
  if ((helmet === 'phrygian' || helmet === 'thracian') && (crest === 'horsehair' || crest === 'tall' || crest === 'horns')) {
    // crest following the forward-curving apex
    return (
      <>
        <Shape d="M-3.8 -27 C-4.2 -31.4 0.6 -35.2 5.2 -34.4 C3.6 -33.4 2.2 -32.6 0.6 -32.2 C-1.4 -31.6 -2.6 -30 -3 -27 Z" f={p.crest} />
        <Hi d="M-3 -28.6 C-2.4 -31.6 1 -33.8 4 -34" c={p.crestAlt} w={0.6} o={0.8} />
      </>
    );
  }
  if (crest === 'plumes') {
    return (
      <>
        <Shape d="M0.6 -30.2 C-1.2 -32.2 -2.8 -35.4 -1.9 -37.6 C-0.6 -35.8 0.1 -34.6 1.1 -33.9 C1.4 -35.6 2.6 -37.2 4.1 -37.6 C4 -35 2.8 -32.2 1.7 -30.2 Z" f={p.crest} sw={0.6} />
        <Line2 d="M1.15 -30.8 L1.05 -37.9" w={1.1} c={p.crestAlt} ow={0.45} />
      </>
    );
  }
  if (crest === 'tall') {
    // Greek transverse-looking tall crest on a stilt (Corinthian).
    return (
      <>
        <Line2 d="M1.2 -29.8 L1.2 -31.6" w={0.8} c={p.metal} ow={0.45} />
        <Shape d="M-5.6 -26.6 C-5.4 -33.4 1.6 -36.6 6.4 -32.4 C5 -31.6 3.8 -31.3 2.7 -31.2 C0.3 -31.1 -2.2 -30 -3.8 -26 Z" f={p.crest} />
        <Hi d="M-4.3 -28.8 C-3 -32.4 1.4 -34.6 4.9 -32.8" c={p.crestAlt} w={0.75} />
      </>
    );
  }
  // horsehair: lower fore-and-aft crest
  const top = helmet === 'montefortino' ? -30 : -29.8;
  return (
    <>
      <Shape d={`M-4.4 -26.4 C-4.6 -31.6 0.6 -${-top + 4.2} 4.8 -31.8 C3.4 -31 2.2 -30.8 1 -30.7 C-1.4 -30.4 -2.8 -29.2 -3.4 -26.2 Z`} f={p.crest} />
      <Hi d="M-3.4 -28.4 C-2.4 -31.4 1.2 -33.2 4 -32.2" c={p.crestAlt} w={0.6} o={0.8} />
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Torso, skirt and legs

/** `robe`: Persian court robe to the ankles; `kaftan`: Scythian wrap-over coat; `cotton`: Indian cotton tunic to mid-shin. */
export type Torso = 'tunic' | 'mail' | 'linen' | 'bare' | 'leather' | 'muscle' | 'scale' | 'robe' | 'kaftan' | 'cotton';
const CLOTH_TORSOS: ReadonlySet<Torso> = new Set<Torso>(['robe', 'kaftan', 'cotton']);
export type Legs = 'bare' | 'greaves' | 'trousers' | 'boots';

const TORSO =
  'M-3.7 -14 C-4 -16.5 -4.4 -19 -3.7 -20.6 C-3.1 -21.7 -1.4 -22.1 0.6 -22.1 C2.6 -22.1 4 -21.4 4.4 -20 C4.8 -18.6 4.4 -16.2 3.9 -14 Z';
const TORSO_SHADE =
  'M-3.7 -14 C-4 -16.5 -4.4 -19 -3.7 -20.6 C-3.2 -21.5 -2.3 -21.9 -1.4 -22 C-2 -19.5 -1.8 -16.5 -1 -14 Z';
const SKIRT =
  'M-3.8 -14.8 L4 -14.8 C4.7 -12.5 5.3 -10.5 5.7 -8.6 C2.3 -7.5 -1.8 -7.5 -5.1 -8.4 C-4.7 -10.6 -4.2 -12.7 -3.8 -14.8 Z';
const SKIRT_SHADE =
  'M-3.8 -14.8 L-1.2 -14.8 L-1.8 -7.6 C-3 -7.7 -4.1 -8 -5.1 -8.4 C-4.7 -10.6 -4.2 -12.7 -3.8 -14.8 Z';

export function Body({ f, torso, skirt = true, pteruges = false, belt = true, hips }: {
  f: Fig; torso: Torso; skirt?: boolean; pteruges?: boolean; belt?: boolean; hips?: string;
}) {
  const { p } = f;
  const cloth = CLOTH_TORSOS.has(torso);
  const tFill =
    torso === 'tunic' || cloth ? p.tunic
      : torso === 'mail' ? p.iron
        : torso === 'scale' ? p.metal
          : torso === 'linen' ? p.linen
            : torso === 'leather' ? p.leather
              : torso === 'muscle' ? p.metal
                : f.skin;
  const tShade =
    torso === 'tunic' || cloth ? p.tunicShade
      : torso === 'mail' ? p.ironShade
        : torso === 'scale' ? p.metalShade
          : torso === 'linen' ? p.linenShade
            : torso === 'leather' ? p.leatherShade
              : torso === 'muscle' ? p.metalShade
                : f.skinShade;
  return (
    <>
      {hips && <Shape d="M-3.9 -14.6 L4.1 -14.6 C4.5 -12.8 4.7 -11 4.6 -9.4 L-4.6 -9.4 C-4.6 -11.2 -4.3 -12.8 -3.9 -14.6 Z" f={hips} />}
      {skirt && cloth && <ClothSkirt f={f} torso={torso} />}
      {skirt && !cloth && (
        <>
          <Shape d={SKIRT} f={torso === 'mail' ? p.iron : p.tunic} />
          <Paint d={SKIRT_SHADE} f={torso === 'mail' ? p.ironShade : p.tunicShade} mx={0.3} />
          {torso === 'mail' ? (
            <Hi d="M5.3 -9.3 C2.1 -8.3 -1.8 -8.3 -4.8 -9.1" c={p.tunic} w={1.3} o={1} />
          ) : (
            <Hi d="M5.3 -9.3 C2.1 -8.3 -1.8 -8.3 -4.8 -9.1" c={p.trim} w={0.8} o={1} />
          )}
          {torso !== 'mail' && <Hi d="M1.4 -14 L1.8 -8.4 M-1 -13.6 L-1.6 -8.4" c={p.tunicShade} w={0.45} o={0.7} />}
        </>
      )}
      {pteruges && (
        <g>
          <Shape d="M-4 -15 L4.1 -15 L4.9 -10.6 L-4.6 -10.6 Z" f={p.linen} sw={0.6} />
          <Hi d="M-2.4 -14.6 L-2.8 -10.8 M-0.4 -14.6 L-0.6 -10.8 M1.6 -14.6 L1.8 -10.8 M3.4 -14.6 L3.8 -10.8" c={p.linenShade} w={0.5} o={1} />
          <Hi d="M-4.4 -11.2 L4.7 -11.2" c={p.trim === '#e6d6a4' ? p.tunic : p.trim} w={0.7} o={1} />
        </g>
      )}
      <Shape d={TORSO} f={tFill} />
      <Paint d={TORSO_SHADE} f={tShade} mx={0.2} />
      {torso === 'mail' && (
        <>
          <Hi d="M-3.2 -18.6 C-1 -18 1.6 -18 4.1 -18.8 M-3.4 -16.6 C-1 -16 1.6 -16 4 -16.8" c={p.ironShade} w={0.45} o={0.9} />
          <Shape d="M-3.6 -20.4 C-2.4 -21.9 2.2 -22.3 4.2 -20.4 L4.3 -19.2 L-3.8 -19 Z" f={p.iron} sw={0.5} />
          <Hi d="M-2.6 -21.2 C-0.6 -21.8 1.8 -21.8 3.4 -21.2" c={p.ironLight} w={0.5} />
        </>
      )}
      {torso === 'scale' && (
        <Hi d="M-3.2 -18.4 L4 -18.6 M-3.3 -16.4 L4 -16.6 M-0.4 -21.6 L-0.4 -14.4 M2 -21.6 L2.2 -14.4" c={p.metalShade} w={0.4} />
      )}
      {torso === 'linen' && (
        <>
          <Hi d="M-3.9 -15.2 L4.2 -15.2" c={p.trim === '#e6d6a4' ? p.tunic : p.trim} w={1.1} o={1} />
          <Hi d="M-3.2 -21.2 L-1.4 -18.6 L-3.9 -18.2" c={p.linenShade} w={0.5} o={1} />
        </>
      )}
      {torso === 'muscle' && (
        <Hi d="M1.6 -20.2 C3.2 -19.6 3.8 -18.4 3.4 -17.4 M0.4 -16.4 C1.6 -15.8 2.8 -15.8 3.6 -16.4" c={p.metalShade} w={0.5} />
      )}
      {torso === 'muscle' && <Hi d="M-2.4 -20.6 C-1.4 -21.4 0 -21.6 1.2 -21.4" c={p.metalLight} w={0.6} mx={0.2} mr={false} />}
      {torso === 'tunic' && <Hi d="M-0.4 -21.9 C0.4 -21 1.6 -21 2.6 -21.8" c={p.trim} w={0.7} o={1} />}
      {cloth && <ClothTorso f={f} torso={torso} />}
      {torso === 'bare' && <Hi d="M1.8 -19.6 C3 -19.4 3.8 -18.8 4 -18" c={f.skinShade} w={0.5} />}
      {belt && (
        <>
          <Shape d="M-3.9 -15.6 L4.2 -15.6 L4.1 -14 L-3.8 -14 Z" f={p.leather} sw={0.5} />
          <rect x={2.4} y={-15.4} width={1.2} height={1.2} fill={p.gold} />
        </>
      )}
    </>
  );
}

const ROBE_DOTS = dots([[-2.6, -11.2], [0.4, -10.6], [3.2, -11.2], [-3.4, -6.6], [-0.4, -5.8], [2.6, -6.4], [5, -7.2]], 0.42);
const ROBE_CHEST_DOTS = dots([[-2, -18.2], [3.4, -18.6]], 0.4);

/** Skirts of the robe, kaftan and cotton tunic. */
function ClothSkirt({ f, torso }: { f: Fig; torso: Torso }) {
  const { p } = f;
  const pat = p.pattern ?? p.trim;
  if (torso === 'robe') {
    return (
      <>
        <Shape d="M-3.8 -14.8 L4 -14.8 C5 -10.6 5.8 -6.4 6.4 -2.4 C2.6 -1.6 -2.8 -1.6 -6 -2.4 C-5.2 -6.6 -4.6 -10.6 -3.8 -14.8 Z" f={p.tunic} />
        <Paint d="M-3.8 -14.8 L-1.2 -14.8 L-2 -1.8 C-3.4 -1.9 -4.8 -2.1 -6 -2.4 C-5.2 -6.6 -4.6 -10.6 -3.8 -14.8 Z" f={p.tunicShade} mx={0.2} />
        <Hi d="M1.6 -14 L2.4 -2.4 M-0.8 -13.8 L-1.2 -2.2 M3.6 -13.6 L4.8 -2.6" c={p.tunicShade} w={0.45} o={0.75} />
        <path d={ROBE_DOTS} fill={pat} />
        <Hi d="M6.1 -3.1 C2.4 -2.3 -2.6 -2.3 -5.8 -3.1" c={pat} w={0.9} o={1} />
      </>
    );
  }
  if (torso === 'cotton') {
    return (
      <>
        <Shape d="M-3.8 -14.8 L4 -14.8 C4.9 -11.4 5.6 -8.4 6 -5.4 C2.4 -4.5 -2.2 -4.5 -5.4 -5.3 C-4.9 -8.6 -4.4 -11.6 -3.8 -14.8 Z" f={p.tunic} />
        <Paint d="M-3.8 -14.8 L-1.2 -14.8 L-1.8 -4.7 C-3 -4.8 -4.3 -5 -5.4 -5.3 C-4.9 -8.6 -4.4 -11.6 -3.8 -14.8 Z" f={p.tunicShade} mx={0.3} />
        <Hi d="M0.8 -14 L1.4 -5 M2.8 -13.8 L3.8 -5.4" c={p.tunicShade} w={0.45} o={0.75} />
        <Hi d="M5.7 -6.1 C2.2 -5.2 -2 -5.2 -5.1 -6" c={p.trim} w={0.8} o={1} />
      </>
    );
  }
  // kaftan: coat skirts with a patterned hem and front edge
  return (
    <>
      <Shape d={SKIRT} f={p.tunic} />
      <Paint d={SKIRT_SHADE} f={p.tunicShade} mx={0.3} />
      <Hi d="M5.3 -9.3 C2.1 -8.3 -1.8 -8.3 -4.8 -9.1" c={pat} w={1.15} o={1} />
      <Hi d="M4.1 -14.6 L5.3 -9.2" c={pat} w={0.7} o={1} />
    </>
  );
}

/** Chest details of the robe, kaftan and cotton tunic. */
function ClothTorso({ f, torso }: { f: Fig; torso: Torso }) {
  const { p } = f;
  const pat = p.pattern ?? p.trim;
  if (torso === 'robe') {
    return (
      <>
        <Hi d="M1.2 -21.8 L1.6 -14.4" c={pat} w={0.8} o={1} />
        <path d={ROBE_CHEST_DOTS} fill={pat} />
      </>
    );
  }
  if (torso === 'cotton') {
    // the upper cloth thrown over the shoulder
    return <Hi d="M3 -21.6 C1.6 -19.4 -1 -16.8 -3.8 -15.6" c={p.trim} w={1.2} o={1} />;
  }
  return <Hi d="M-0.8 -21.9 C1 -20 2.6 -17.6 3.9 -14.6" c={pat} w={0.85} o={1} />;
}

export function LegsEl({ f, legs }: { f: Fig; legs: Legs }) {
  const { p } = f;
  const trousers = legs === 'trousers';
  const c = trousers ? p.trousers : f.skin;
  const cs = trousers ? p.trousersShade : f.skinShade;
  const w = trousers ? 2.9 : 2.5;
  const footC = legs === 'boots' || trousers ? p.leatherShade : p.leather;
  return (
    <>
      <Line2 d="M-0.9 -9.6 L-2.3 -5 L-3.5 -1.3" w={w} c={cs} />
      {legs === 'greaves' && <Line2 d="M-2.3 -5.2 L-3.3 -1.9" w={2.3} c={p.metalShade} ow={0.5} />}
      {legs === 'boots' && <Line2 d="M-2.6 -3.6 L-3.4 -1.4" w={2.6} c={p.leatherShade} ow={0.5} />}
      <Line2 d="M-4.4 -0.7 L-2.4 -0.7" w={1.5} c={darken(footC, 0.2)} />
      <Line2 d="M1.3 -9.6 L2.9 -5 L4 -1.3" w={w} c={c} />
      {legs === 'greaves' && (
        <>
          <Line2 d="M3 -5.2 L3.9 -1.9" w={2.4} c={p.metal} ow={0.5} />
          <Hi d="M2.8 -4.8 L3.4 -2.4" c={p.metalLight} w={0.5} />
        </>
      )}
      {legs === 'boots' && <Line2 d="M3.4 -3.6 L4 -1.4" w={2.7} c={p.leather} ow={0.5} />}
      <Line2 d="M3.6 -0.7 L5.9 -0.7" w={1.5} c={footC} />
      {trousers && <Hi d="M1.6 -8.4 L2.4 -5.6 M2.9 -4.2 L3.6 -2" c={p.trousersShade} w={0.5} o={0.8} />}
    </>
  );
}

/** Arm as an outlined stroke (shoulder -> elbow -> hand), optional short sleeve, and a hand. */
export function Arm({ s, e, h, f, sleeve, near = false, w = 2.1, long = false }: {
  s: [number, number]; e: [number, number]; h: [number, number]; f: Fig; sleeve?: string; near?: boolean; w?: number;
  /** Sleeve down to the wrist (Persian, Scythian and Median dress). */
  long?: boolean;
}) {
  const c = near ? f.skin : f.skinShade;
  const sx = s[0] + (e[0] - s[0]) * 0.55;
  const sy = s[1] + (e[1] - s[1]) * 0.55;
  const wx = e[0] + (h[0] - e[0]) * 0.72;
  const wy = e[1] + (h[1] - e[1]) * 0.72;
  return (
    <>
      <Line2 d={`M${s[0]} ${s[1]} L${e[0]} ${e[1]} L${h[0]} ${h[1]}`} w={w} c={c} />
      {sleeve && !long && <Line2 d={`M${s[0]} ${s[1]} L${sx.toFixed(2)} ${sy.toFixed(2)}`} w={w + 0.6} c={sleeve} ow={0.6} />}
      {sleeve && long && <Line2 d={`M${s[0]} ${s[1]} L${e[0]} ${e[1]} L${wx.toFixed(2)} ${wy.toFixed(2)}`} w={w + 0.6} c={sleeve} ow={0.6} />}
      <circle cx={h[0]} cy={h[1]} r={1.2} fill={c} stroke={OL} strokeWidth={0.6} />
    </>
  );
}
