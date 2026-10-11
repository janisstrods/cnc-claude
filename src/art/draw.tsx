// Drawing primitives every art module draws with, and the contracts of the per-kind renderers (devices, shields,
// headgear) that parts.tsx dispatches to: parts.tsx draws the base game's and Expansion #1's kinds, and each later
// expansion contributes its own renderers from its own module (exp2-parts.tsx, exp3-parts.tsx). This module imports no
// other art module, so parts.tsx and the expansion modules both draw with it without importing each other.
//
// Everything is drawn FACING RIGHT in a local frame whose origin is between the figure's feet (y grows downwards, so the
// figure stands in negative y). The token mirrors whole figures for left-facing units.
//
// Lighting: the art is lit from the upper left of the SCREEN. Side shading / highlights are authored as if lit
// from the figure's local right; when a figure is drawn facing right (not mirrored) those layers are mirrored
// about their own axis (`mx`) so the light stays on the screen's upper left for both facings.
import { createContext, useContext, type ReactNode } from 'react';
import { darken } from './color';
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

/** Small dots as a single path (fewer DOM nodes). */
export function dots(pts: readonly (readonly [number, number])[], r: number): string {
  const d = (2 * r).toFixed(2);
  const rr = r.toFixed(2);
  return pts.map(([x, y]) => `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${rr} ${rr} 0 1 0 ${d} 0a${rr} ${rr} 0 1 0 -${d} 0Z`).join('');
}

/** The left wing of the Achaemenid winged sun (device frame): also the wings of the legions' winged thunderbolt. */
export const DISC_WING = 'M-1 -0.25 C-1.8 -1.05 -3.3 -1.25 -4.1 -0.65 C-3.5 -0.45 -3.3 -0.2 -3.5 0.1 C-3 0 -2.7 0.1 -2.6 0.4 C-2.1 0.2 -1.6 0.25 -1.1 0.45 Z';

// ---------------------------------------------------------------------------------------------
// Renderer contracts (the tables in parts.tsx are Records over every kind, so a new kind without a renderer is a type error)

/** A shield / standard device in a unit frame (radius ~3): drawn in `col`, cut-outs in the field colour `bg`. */
export interface DeviceProps {
  col: string;
  bg: string;
  /** `col` darkened, for the device's outline. */
  edge: string;
}
export type DeviceRenderer = (d: DeviceProps) => JSX.Element;

/** A shield's face as parts.tsx's Shield hands it to the shield's renderer (the line or the painted shield colours). */
export interface ShieldFace {
  f: Fig;
  face: string;
  faceShade: string;
  faceLight: string;
  /** The device colour. */
  emb: string;
  /** The figure's device, and whether the shield shows it. */
  ek: EmblemKind;
  emblem: boolean;
  /** Draws the device `ek` centred on (cx, cy) at scale `s`, in `emb` on `face`. */
  drawDevice: (cx: number, cy: number, s: number) => ReactNode;
}
export type ShieldRenderer = (s: ShieldFace) => JSX.Element;

/** `plume2`: a pair of tall feathers at the helmet's sides; `horns`: goat horns (Pyrrhus). */
export type Crest = 'none' | 'plumes' | 'horsehair' | 'knob' | 'tall' | 'plume2' | 'horns';

/** A helmet or headgear on the head; `crestEl` is its crest, for the helmet to draw behind or over itself. */
export interface HelmProps {
  f: Fig;
  crest: Crest;
  crestEl: ReactNode;
}
export type HelmRenderer = (h: HelmProps) => JSX.Element;
