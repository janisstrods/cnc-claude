// Reusable body parts for the miniature figures. Everything is drawn FACING RIGHT in a local frame whose
// origin is between the figure's feet (y grows downwards, so the figure stands in negative y). The token
// mirrors whole figures for left-facing units.
//
// Lighting: the art is lit from the upper left of the SCREEN. Side shading / highlights are authored as if lit
// from the figure's local right; when a figure is drawn facing right (not mirrored) those layers are mirrored
// about their own axis (`mx`) so the light stays on the screen's upper left for both facings.
import { createContext, useContext, type ReactNode } from 'react';
import { darken, lighten } from './color';
import type { Palette } from './palettes';

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

export function Emblem({ kind, cx, cy, s, f, c }: { kind: 'rome' | 'carthage' | 'syracuse'; cx: number; cy: number; s: number; f: Fig; c?: string }) {
  const { p } = f;
  const col = c ?? p.shieldEmblem;
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

// ---------------------------------------------------------------------------------------------
// Shields (held on the near / left arm, in front of the body)

export type ShieldKind = 'scutum' | 'aspis' | 'oval' | 'longOval' | 'round' | 'none';

export function Shield({ kind, f, dx = 0, dy = 0, s = 1, emblem = true, painted }: {
  kind: ShieldKind; f: Fig; dx?: number; dy?: number; s?: number; emblem?: boolean;
  /** Use the army's painted (light troops / tribal) shield colours instead of the line-infantry shield. */
  painted?: boolean;
}) {
  const { p } = f;
  const kit = p.kit;
  const pt = painted ?? (kind === 'round' || kind === 'longOval');
  const face = pt ? p.paint : p.shield;
  const faceShade = pt ? p.paintShade : p.shieldShade;
  const faceLight = pt ? p.paintLight : p.shieldLight;
  const emb = pt ? p.paintEmblem : p.shieldEmblem;
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
        {emblem && kit === 'greek' && <Emblem kind="syracuse" cx={4.4} cy={-14.4} s={1.15} f={f} c={emb} />}
        {emblem && kit === 'punic' && <Emblem kind="carthage" cx={4.4} cy={-14.2} s={1.25} f={f} c={emb} />}
        {emblem && kit === 'roman' && <Emblem kind="rome" cx={4.4} cy={-14.4} s={0.95} f={f} c={emb} />}
        <Hi d="M5.6 -20.2 C8 -18.4 8.8 -14.6 8 -11.2" c={faceLight} w={0.7} o={0.8} mx={4.2} />
      </>
    );
  } else if (kind === 'oval') {
    body = (
      <>
        <ellipse cx={4.3} cy={-13.8} rx={5.1} ry={8.6} fill={face} stroke={OL} strokeWidth={OW} />
        <Paint d="M0.6 -19.6 C-1 -15.6 -0.9 -11 0.9 -7.6 C1.8 -6.4 2.8 -5.6 3.8 -5.3 C2.2 -9 1.8 -15.6 2.6 -22.1 C1.8 -21.5 1.1 -20.6 0.6 -19.6 Z" f={faceShade} mx={4.3} />
        <ellipse cx={4.3} cy={-13.8} rx={4.4} ry={7.9} fill="none" stroke={p.shieldRim} strokeWidth={0.6} />
        {emblem && kit === 'punic' && <Emblem kind="carthage" cx={4.5} cy={-13.4} s={1.15} f={f} c={emb} />}
        {emblem && kit === 'greek' && <Emblem kind="syracuse" cx={4.5} cy={-13.8} s={1.0} f={f} c={emb} />}
        {emblem && kit === 'roman' && <Emblem kind="rome" cx={4.5} cy={-13.8} s={0.95} f={f} c={emb} />}
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
  }
  if (!body) return null;
  if (!dx && !dy && s === 1) return <>{body}</>;
  return <g transform={`translate(${dx} ${dy})${s !== 1 ? ` scale(${s})` : ''}`}>{body}</g>;
}

// ---------------------------------------------------------------------------------------------
// Heads & helmets

export type Helmet = 'none' | 'montefortino' | 'corinthian' | 'attic' | 'atticOpen' | 'pilos' | 'cap' | 'conical';
export type Crest = 'none' | 'plumes' | 'horsehair' | 'knob' | 'tall';
export type Hair = 'short' | 'long' | 'wild' | 'bald';

const HEAD =
  'M-2.3 -25.2 C-2.3 -27.4 -0.8 -28.5 1.1 -28.5 C3.1 -28.5 4.3 -27.3 4.4 -25.6 L5.1 -24.2 L4.4 -23.9 C4.4 -22.6 3.4 -21.8 2 -21.7 C-0.4 -21.6 -2.3 -22.9 -2.3 -25.2 Z';

export function Head({ f, helmet, crest, hair = 'short', beard = false, moustache = false, torc = false }: {
  f: Fig; helmet: Helmet; crest: Crest; hair?: Hair; beard?: boolean; moustache?: boolean; torc?: boolean;
}) {
  const { p } = f;
  const showHair = helmet === 'none' || helmet === 'cap';
  return (
    <>
      {/* long hair behind the head */}
      {showHair && (hair === 'long' || hair === 'wild') && (
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
  return null;
}

function CrestEl({ f, crest, helmet }: { f: Fig; crest: Crest; helmet: Helmet }) {
  const { p } = f;
  if (crest === 'none') return null;
  if (crest === 'knob') return null;
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

export type Torso = 'tunic' | 'mail' | 'linen' | 'bare' | 'leather' | 'muscle' | 'scale';
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
  const tFill =
    torso === 'tunic' ? p.tunic
      : torso === 'mail' ? p.iron
        : torso === 'scale' ? p.metal
          : torso === 'linen' ? p.linen
            : torso === 'leather' ? p.leather
              : torso === 'muscle' ? p.metal
                : f.skin;
  const tShade =
    torso === 'tunic' ? p.tunicShade
      : torso === 'mail' ? p.ironShade
        : torso === 'scale' ? p.metalShade
          : torso === 'linen' ? p.linenShade
            : torso === 'leather' ? p.leatherShade
              : torso === 'muscle' ? p.metalShade
                : f.skinShade;
  return (
    <>
      {hips && <Shape d="M-3.9 -14.6 L4.1 -14.6 C4.5 -12.8 4.7 -11 4.6 -9.4 L-4.6 -9.4 C-4.6 -11.2 -4.3 -12.8 -3.9 -14.6 Z" f={hips} />}
      {skirt && (
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
export function Arm({ s, e, h, f, sleeve, near = false, w = 2.1 }: {
  s: [number, number]; e: [number, number]; h: [number, number]; f: Fig; sleeve?: string; near?: boolean; w?: number;
}) {
  const c = near ? f.skin : f.skinShade;
  const sx = s[0] + (e[0] - s[0]) * 0.55;
  const sy = s[1] + (e[1] - s[1]) * 0.55;
  return (
    <>
      <Line2 d={`M${s[0]} ${s[1]} L${e[0]} ${e[1]} L${h[0]} ${h[1]}`} w={w} c={c} />
      {sleeve && <Line2 d={`M${s[0]} ${s[1]} L${sx.toFixed(2)} ${sy.toFixed(2)}`} w={w + 0.6} c={sleeve} ow={0.6} />}
      <circle cx={h[0]} cy={h[1]} r={1.2} fill={c} stroke={OL} strokeWidth={0.6} />
    </>
  );
}
