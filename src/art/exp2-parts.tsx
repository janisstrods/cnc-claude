// Expansion #2 art parts: the Celtic, Germanic and late-Roman shields, the new shield devices, the helmets, the Suebian
// knot, the woad arm bands and the raised wing of the Roman eagle. parts.tsx hands the kinds it does not draw itself to this
// module (Shield, Device, Helm, Head, Arm), and this module draws with parts.tsx's primitives, so the two import each other:
// nothing here reads from parts.tsx while the modules load, only while rendering.
import type { ReactNode } from 'react';
import { darken, lighten } from './color';
import type { EmblemKind } from './palettes';
import { DISC_WING, Emblem, Hi, Line2, OL, OW, Paint, Shape, dots, type Crest, type Fig, type Helmet, type ShieldKind } from './parts';

// ---------------------------------------------------------------------------------------------
// The raised wing of the Roman eagle

/** One wing with its root at the origin, sweeping up and out to the left (the aquila, its elite marker, the legions' shield). */
const RAISED_WING =
  'M0 0 C-1.8 -0.6 -2.9 -2.4 -2.6 -5 C-2.1 -4 -1.6 -3.7 -1.1 -3.6 C-1.3 -3 -1.2 -2.5 -0.9 -2.1 C-0.5 -2.5 -0.1 -2.6 0.4 -2.4 Z';

/**
 * A wing and its mirror image: their roots lie `spread` either side of the centre at height `y`, scaled by `s`. `down`
 * turns both upside down (the lower pair of wings round a shield boss). Takes its fill and stroke from the parent group.
 */
export function WingPair({ spread, y, s = 1, down = false }: { spread: number; y: number; s?: number; down?: boolean }) {
  const v = down ? -s : s;
  return (
    <>
      <path d={RAISED_WING} transform={`translate(${-spread} ${y}) scale(${s} ${v})`} />
      <path d={RAISED_WING} transform={`translate(${spread} ${y}) scale(${-s} ${v})`} />
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Devices (unit frame)

const SCROLL = 'M-0.9 -2.1 C1.2 -2.1 1.5 -0.4 0 0 C-1.5 0.4 -1.2 2.1 0.9 2.1 M-0.9 -2.1 C-2.3 -2.1 -2.5 -3.2 -1.5 -3.4 C-0.9 -3.5 -0.6 -3 -1 -2.7 M0.9 2.1 C2.3 2.1 2.5 3.2 1.5 3.4 C0.9 3.5 0.6 3 1 2.7';
const BOAR =
  'M-3 0.9 C-3.2 -0.4 -2.3 -1.5 -0.7 -1.7 C0.4 -1.8 1.4 -1.6 2.1 -1.1 C2.7 -0.8 3.1 -0.3 3.4 0.3 L3.2 0.8 L2.5 0.7 L2.2 1.1 ' +
  'C1.8 1.2 1.6 1.2 1.4 1.2 L1.4 2.3 L0.8 2.3 L0.7 1.3 C-0.2 1.5 -1 1.5 -1.6 1.3 L-1.7 2.3 L-2.3 2.3 L-2.4 1.2 C-2.7 1.1 -2.9 1 -3 0.9 Z';
const BOAR_BRISTLES = 'M-2.4 -1.2 L-2.1 -2.3 L-1.6 -1.55 L-1.1 -2.65 L-0.6 -1.75 L-0.1 -2.75 L0.4 -1.75 L0.9 -2.45 L1.3 -1.5 Z M1.55 -1.3 L1.9 -2.2 L2.25 -1.2 Z';
const CRESCENTS = 'M-2.4 -2.4 A2.4 2 0 0 0 2.4 -2.4 A1.9 1.3 0 0 1 -2.4 -2.4 Z M-2.4 2.4 A2.4 2 0 0 1 2.4 2.4 A1.9 1.3 0 0 0 -2.4 2.4 Z';
const HORSE = 'M-3.3 -0.3 C-1.6 -1.3 0.6 -1.3 1.9 -0.9 L2.7 -2.3 L3.5 -1.6 L2.6 -1.2 M-2.7 0.4 C-1 -0.2 0.8 -0.2 2 0.1 M-2.3 0.3 L-3.1 2.2 M-1.5 0.2 L-0.9 2.2 M1.1 0 L0.8 2.2 M1.8 0 L2.7 1.8 M-3.3 -0.3 L-3.7 0.7';
const BOLT_ZIGZAG = 'M0 -1 L0.6 -2 L-0.4 -2.5 L0.2 -3.4 M0 1 L-0.6 2 L0.4 2.5 L-0.2 3.4';

/** The Expansion #2 devices of Device (parts.tsx), in a unit frame (radius ~3); `null` for any other kind. */
export function Exp2Device({ kind, col, bg }: { kind: EmblemKind; col: string; bg: string }) {
  const edge = darken(col, 0.45);
  switch (kind) {
    case 'scroll':
      // La Tene S-scroll with spiral ends
      return <path d={SCROLL} fill="none" stroke={col} strokeWidth={0.62} strokeLinecap="round" />;
    case 'boar':
      // a Celtic boar with its bristling crest
      return (
        <g>
          <path d={BOAR} fill={col} stroke={edge} strokeWidth={0.25} strokeLinejoin="round" />
          <path d={BOAR_BRISTLES} fill={col} stroke={edge} strokeWidth={0.2} strokeLinejoin="round" />
          <circle cx={2.25} cy={-0.55} r={0.26} fill={bg} />
          <path d="M2.9 0.55 L3.15 -0.2" stroke={bg} strokeWidth={0.28} strokeLinecap="round" />
          <path d="M-3 0.4 C-3.5 0.2 -3.6 -0.3 -3.3 -0.65" fill="none" stroke={col} strokeWidth={0.3} strokeLinecap="round" />
        </g>
      );
    case 'crescents':
      // two crescents back to back (the lunula)
      return (
        <g fill={col}>
          <path d={CRESCENTS} />
          <circle r={0.62} />
        </g>
      );
    case 'horse':
      // a flowing chalk-figure horse
      return <path d={HORSE} fill="none" stroke={col} strokeWidth={0.55} strokeLinecap="round" strokeLinejoin="round" />;
    case 'halves':
      return (
        <g>
          <path d="M0 -2.8 A2.8 2.8 0 0 0 0 2.8 Z" fill={col} />
          <circle r={2.8} fill="none" stroke={col} strokeWidth={0.4} />
        </g>
      );
    case 'ring':
      return (
        <g>
          <circle r={2.3} fill="none" stroke={col} strokeWidth={0.8} />
          <circle r={0.8} fill={col} />
        </g>
      );
    case 'bands':
      return <path d="M-2.8 0.6 L0.6 -2.8 M-0.6 2.8 L2.8 -0.6" stroke={col} strokeWidth={1.1} strokeLinecap="round" />;
    case 'wingedBolt':
      // Jupiter's thunderbolt with wings (the legions' shield device)
      return (
        <g>
          <path d={BOLT_ZIGZAG} fill="none" stroke={col} strokeWidth={0.5} strokeLinejoin="round" strokeLinecap="round" />
          <path d={DISC_WING} transform="translate(-0.3 -0.1) scale(0.78)" fill={col} />
          <path d={DISC_WING} transform="translate(0.3 -0.1) scale(-0.78 0.78)" fill={col} />
          <ellipse rx={0.55} ry={1.05} fill={col} stroke={edge} strokeWidth={0.2} />
        </g>
      );
    case 'pileus':
      // the felt cap of a freed slave
      return (
        <g fill={col} stroke={edge} strokeWidth={0.25} strokeLinejoin="round">
          <path d="M-1.9 1.4 C-2.1 -0.7 -1.2 -2.6 0 -2.9 C1.2 -2.6 2.1 -0.7 1.9 1.4 Z" />
          <path d="M-2.5 1.2 L2.5 1.2 L2.5 2.4 L-2.5 2.4 Z" />
        </g>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Shields: Celtic long oval and long hexagon, Germanic board, the legions' curved oval scutum

/** The La Tene S-scroll and the back-to-back crescents, running the length of a long shield through the boss. */
const TALL_SCROLL = 'M-1.4 -6.6 C1.8 -6.6 2.6 -2.6 0 0 C-2.6 2.6 -1.8 6.6 1.4 6.6 M-1.4 -6.6 C-3.2 -6.6 -3.3 -8.8 -1.7 -8.9 C-0.7 -9 -0.3 -8.1 -0.9 -7.7 M1.4 6.6 C3.2 6.6 3.3 8.8 1.7 8.9 C0.7 9 0.3 8.1 0.9 7.7';
const TALL_CRESCENTS = 'M-3.1 -6.8 A3.1 2.9 0 0 0 3.1 -6.8 A2.5 1.2 0 0 1 -3.1 -6.8 Z M-3.1 6.8 A3.1 2.9 0 0 1 3.1 6.8 A2.5 1.2 0 0 0 -3.1 6.8 Z';
/** Devices drawn above the boss (figures; with the Expansion #3 ones), the rest are centred on it. */
const ABOVE_BOSS: ReadonlySet<EmblemKind> = new Set<EmblemKind>([
  'boar', 'horse', 'bull', 'pileus', 'stag', 'eagle', 'owl', 'club', 'fawn', 'lion', 'trophy', 'starCrescent',
]);
/** Above the boss of a long shield: the boar runs up the shield (as on the Gallic shields of the arch at Orange). */
const LONG_ABOVE: Partial<Record<EmblemKind, string>> = { boar: 'translate(4.4 -19.6) rotate(-90) scale(1.3)', horse: 'translate(4.4 -19.4) scale(1.05)' };

/**
 * The long shields: outline, its left half (for `halves`), the shaded edge, the rim stroke, the ribs down the face and the
 * lit side, centred on the boss at (4.4, -13.6). The iron-bossed board carries one big device round the boss, the
 * strip-bossed oval and hexagon theirs above and below it.
 */
type LongShieldKind = 'celtOval' | 'hex' | 'board';

interface LongShield {
  outline: string;
  half: string;
  shade: string;
  rim: string;
  rimWidth: number;
  ribs: { d: string; darker: number; w: number; o: number };
  lit: string;
  boss: 'iron' | 'strip';
  /** Diagonal bands (`bands`) painted across the face. */
  bands?: string;
}

const LONG_SHIELDS: Record<LongShieldKind, LongShield> = {
  celtOval: {
    outline: 'M4.4 -24.2 C7.4 -24.2 8.8 -19.4 8.8 -13.6 C8.8 -7.8 7.4 -3 4.4 -3 C1.4 -3 0 -7.8 0 -13.6 C0 -19.4 1.4 -24.2 4.4 -24.2 Z',
    half: 'M4.4 -24.2 C1.4 -24.2 0 -19.4 0 -13.6 C0 -7.8 1.4 -3 4.4 -3 Z',
    shade: 'M2.1 -23 C0.7 -21 0.1 -17.4 0.1 -13.6 C0.1 -9.8 0.7 -6.2 2.1 -4.2 C1.6 -8 1.5 -19 2.1 -23 Z',
    rim: 'M4.4 -23.5 C6.9 -23.5 8.1 -19 8.1 -13.6 C8.1 -8.2 6.9 -3.7 4.4 -3.7 C1.9 -3.7 0.7 -8.2 0.7 -13.6 C0.7 -19 1.9 -23.5 4.4 -23.5 Z',
    rimWidth: 0.45,
    ribs: { d: 'M4.4 -23.4 L4.4 -3.8', darker: 0.22, w: 0.7, o: 0.8 },
    lit: 'M7.5 -19.6 C8.1 -16.6 8.1 -10.6 7.5 -7.6',
    boss: 'strip',
  },
  hex: {
    outline: 'M4.4 -24.4 L8.7 -19.8 L8.7 -7.4 L4.4 -2.8 L0.1 -7.4 L0.1 -19.8 Z',
    half: 'M4.4 -24.4 L0.1 -19.8 L0.1 -7.4 L4.4 -2.8 Z',
    shade: 'M0.1 -19.8 L1.9 -21.7 L1.9 -5.5 L0.1 -7.4 Z',
    rim: 'M4.4 -23.5 L8 -19.5 L8 -7.7 L4.4 -3.7 L0.8 -7.7 L0.8 -19.5 Z',
    rimWidth: 0.45,
    ribs: { d: 'M4.4 -23.4 L4.4 -3.8', darker: 0.22, w: 0.7, o: 0.8 },
    lit: 'M7.5 -19.6 C8.1 -16.6 8.1 -10.6 7.5 -7.6',
    boss: 'strip',
  },
  board: {
    outline: 'M0.7 -21.9 L8.1 -21.9 Q9.2 -21.9 9.2 -20.8 L9.2 -6.4 Q9.2 -5.3 8.1 -5.3 L0.7 -5.3 Q-0.4 -5.3 -0.4 -6.4 L-0.4 -20.8 Q-0.4 -21.9 0.7 -21.9 Z',
    half: 'M4.4 -21.9 L0.7 -21.9 Q-0.4 -21.9 -0.4 -20.8 L-0.4 -6.4 Q-0.4 -5.3 0.7 -5.3 L4.4 -5.3 Z',
    shade: 'M-0.4 -20.8 Q-0.4 -21.9 0.7 -21.9 L1.6 -21.9 L1.6 -5.3 L0.7 -5.3 Q-0.4 -5.3 -0.4 -6.4 Z',
    rim: 'M0.7 -21.9 L8.1 -21.9 Q9.2 -21.9 9.2 -20.8 L9.2 -6.4 Q9.2 -5.3 8.1 -5.3 L0.7 -5.3 Q-0.4 -5.3 -0.4 -6.4 L-0.4 -20.8 Q-0.4 -21.9 0.7 -21.9 Z',
    rimWidth: 0.7,
    ribs: { d: 'M2.6 -21.4 L2.6 -5.8 M6.2 -21.4 L6.2 -5.8', darker: 0.16, w: 0.4, o: 0.7 },
    lit: 'M8.5 -20.6 L8.5 -6.6',
    boss: 'iron',
    bands: 'M-0.4 -12.2 L-0.4 -9.4 L5.4 -21.9 L2.6 -21.9 Z M9.2 -15 L9.2 -17.8 L3.4 -5.3 L6.2 -5.3 Z',
  },
};

/** The legions' curved oval scutum (centred on the boss at 4.3, -13.8): outline, shaded edge, and the thunderbolts. */
const SCUTUM_OVAL = 'M4.3 -24.1 C7.6 -24.1 9.6 -19.5 9.6 -13.8 C9.6 -8.1 7.6 -3.5 4.3 -3.5 C1 -3.5 -1 -8.1 -1 -13.8 C-1 -19.5 1 -24.1 4.3 -24.1 Z';
const SCUTUM_SHADE = 'M1.4 -22.6 C-0.2 -20.4 -0.9 -17.2 -0.9 -13.8 C-0.9 -10.4 -0.2 -7.2 1.4 -5 C2 -4.4 2.6 -4 3.2 -3.7 C1.6 -7.2 1.2 -10.8 1.2 -13.8 C1.2 -17.2 1.7 -20.8 3.2 -23.9 C2.5 -23.6 1.9 -23.2 1.4 -22.6 Z';
const LEGION_BOLTS = 'M0 -2.8 L0.8 -4.6 L-0.6 -5.6 L0.6 -7.4 L0 -9.2 M0 2.8 L-0.8 4.6 L0.6 5.6 L-0.6 7.4 L0 9.2';

/** The shields drawn here: the three long ones of LONG_SHIELDS and the legions' scutum. */
export type Exp2ShieldKind = LongShieldKind | 'legionOval';
const EXP2_SHIELDS: ReadonlySet<string> = new Set([...Object.keys(LONG_SHIELDS), 'legionOval']);
export const isExp2Shield = (kind: ShieldKind): kind is Exp2ShieldKind => EXP2_SHIELDS.has(kind);

export function Exp2Shield({ kind, f, face, faceShade, faceLight, emb, ek, emblem }: {
  kind: Exp2ShieldKind; f: Fig; face: string; faceShade: string; faceLight: string; emb: string; ek: EmblemKind; emblem: boolean;
}) {
  const { p } = f;
  if (kind === 'legionOval') {
    // curved oval scutum: bronze-bound edge, spine, long boss on an iron strap, wings and thunderbolts round the boss
    return (
      <>
        <path d={SCUTUM_OVAL} fill={face} stroke={OL} strokeWidth={OW} />
        <Paint d={SCUTUM_SHADE} f={faceShade} mx={4.3} />
        <Hi d="M7.9 -20.2 C9 -17.2 9.1 -10.6 7.9 -7.4" c={faceLight} w={1} mx={4.3} />
        <Hi d="M0.4 -21.2 C2.4 -23.6 6.2 -23.6 8.2 -21.2 M0.4 -6.4 C2.4 -4 6.2 -4 8.2 -6.4" c={p.shieldRim} w={0.75} o={1} />
        <Hi d="M4.3 -23.4 L4.3 -4.2" c={darken(face, 0.22)} w={0.8} o={0.9} />
        {emblem && (
          // the Roman wings round the boss, with thunderbolts or a figure above the boss (the Tenth's bull)
          <g transform="translate(4.3 -13.8)" fill={emb}>
            <WingPair spread={1} y={-2.2} />
            <WingPair spread={1} y={2.2} down />
            {ABOVE_BOSS.has(ek)
              ? <Emblem kind={ek} cx={0} cy={-6.6} s={0.95} f={f} c={emb} bg={face} />
              : <path d={LEGION_BOLTS} fill="none" stroke={emb} strokeWidth={0.75} strokeLinejoin="round" strokeLinecap="round" />}
          </g>
        )}
        <Line2 d="M2.4 -13.8 L6.2 -13.8" w={1.1} c={p.iron} ow={0.35} />
        <ellipse cx={4.3} cy={-13.8} rx={1.25} ry={2.5} fill={p.metal} stroke={OL} strokeWidth={0.5} />
        <Hi d="M4 -15.6 C3.7 -14.8 3.7 -13 4 -12.2" c={p.metalLight} w={0.45} o={0.9} mx={4.3} mr={false} />
      </>
    );
  }
  const s = LONG_SHIELDS[kind];
  let device: ReactNode = null;
  if (emblem && ek !== 'none') {
    if (ek === 'halves') device = <path d={s.half} fill={emb} />;
    else if (ek === 'bands' && s.bands) device = <path d={s.bands} fill={emb} />;
    else if (ek === 'scroll') device = <path d={TALL_SCROLL} transform="translate(4.4 -13.6)" fill="none" stroke={emb} strokeWidth={0.85} strokeLinecap="round" />;
    else if (ek === 'crescents') device = <path d={TALL_CRESCENTS} transform="translate(4.4 -13.6)" fill={emb} />;
    else if (ek === 'ring') device = <circle cx={4.4} cy={-13.6} r={3.1} fill="none" stroke={emb} strokeWidth={0.9} />;
    else if (LONG_ABOVE[ek]) device = <g transform={LONG_ABOVE[ek]}><Emblem kind={ek} cx={0} cy={0} s={1} f={f} c={emb} bg={face} /></g>;
    else if (ABOVE_BOSS.has(ek)) device = <Emblem kind={ek} cx={4.4} cy={-19.4} s={1.1} f={f} c={emb} bg={face} />;
    else if (s.boss === 'iron') device = <Emblem kind={ek} cx={4.4} cy={-13.6} s={1.55} f={f} c={emb} bg={face} />;
    // round devices twice on a long shield, above and below the boss
    else device = <>{[-19, -8.2].map((y) => <Emblem key={y} kind={ek} cx={4.4} cy={y} s={0.98} f={f} c={emb} bg={face} />)}</>;
  }
  return (
    <>
      <path d={s.outline} fill={face} stroke={OL} strokeWidth={OW} strokeLinejoin="round" />
      <Hi d={s.ribs.d} c={darken(face, s.ribs.darker)} w={s.ribs.w} o={s.ribs.o} />
      {device}
      <Paint d={s.shade} f={faceShade} o={0.85} mx={4.4} />
      <path d={s.rim} fill="none" stroke={p.shieldRim} strokeWidth={s.rimWidth} opacity={0.9} />
      <Hi d={s.lit} c={faceLight} w={0.7} mx={4.4} />
      {s.boss === 'iron' ? (
        // Germanic iron boss with a point
        <>
          <circle cx={4.4} cy={-13.6} r={1.75} fill={p.iron} stroke={OL} strokeWidth={0.55} />
          <circle cx={4.4} cy={-13.6} r={0.6} fill={p.ironShade} />
          <circle cx={4} cy={-14.1} r={0.45} fill={p.ironLight} />
        </>
      ) : (
        // Celtic strip boss on its spine
        <>
          <ellipse cx={4.4} cy={-13.6} rx={1.3} ry={2.7} fill={p.metal} stroke={OL} strokeWidth={0.5} />
          <Hi d="M4.1 -15.4 C3.8 -14.6 3.8 -12.8 4.1 -12" c={p.metalLight} w={0.45} o={0.9} mx={4.4} mr={false} />
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Heads and helmets

/** Laurel green of Caesar's wreath. */
const LAUREL = '#4f7d36';
const LAUREL_LEAVES: [number, number, number][] = [[-2.1, -26.5, -35], [-0.9, -27.3, -50], [0.4, -27.8, -62], [1.7, -28, -72], [3, -27.9, -84], [4.1, -27.5, -96]];

/** The Expansion #2 helmets and the wreath. */
export function Exp2Helm({ f, helmet, crest, crestEl }: { f: Fig; helmet: Helmet; crest: Crest; crestEl: ReactNode }) {
  const { p } = f;
  if (helmet === 'coolus') {
    // rounded bronze bowl with a top knob, a brow peak and a flat neck guard
    return (
      <>
        {crest === 'horsehair' || crest === 'tall' ? crestEl : null}
        <Shape d="M4.9 -25.6 C5 -28.5 3.2 -29.9 1.1 -29.9 C-1 -29.9 -2.7 -28.5 -2.8 -25.8 L-4.7 -25.1 L-4.6 -24.3 L-1.6 -24.6 L4.9 -25.1 Z" f={p.metal} />
        <Paint d="M-2.8 -25.8 L-4.7 -25.1 L-4.6 -24.3 L-1.6 -24.6 L4.9 -25.1 L4.9 -25.7 C2 -25.8 -0.4 -25.8 -2.8 -25.8 Z" f={p.metalShade} />
        <Hi d="M-1.6 -27.9 C-0.9 -29 0.3 -29.4 1.4 -29.4" c={p.metalLight} w={0.75} mx={1.1} mr={false} />
        <Shape d="M2.2 -26.3 L6.2 -26.1 L6.1 -25.3 L2.2 -25.4 Z" f={p.metal} sw={0.5} />
        <Shape d="M-0.4 -25.4 L2 -25.4 L1.8 -22.4 C1.1 -21.9 0.3 -22.1 -0.2 -22.6 Z" f={p.metal} sw={0.55} />
        {crest === 'plumes' || crest === 'knob' ? crestEl : null}
        <circle cx={1.1} cy={-30.2} r={0.65} fill={p.metal} stroke={OL} strokeWidth={0.45} />
      </>
    );
  }
  if (helmet === 'horned') {
    // a bronze cap with two horns ending in knobs (after the Waterloo Bridge helmet)
    return (
      <>
        <Shape d="M-0.3 -29.4 C-1.6 -30.4 -2.8 -32.2 -3.1 -34.6 L-4 -34.4 C-3.8 -31.8 -2.8 -29.6 -1.4 -28.4 Z" f={p.metalShade} sw={0.55} />
        <circle cx={-3.55} cy={-34.9} r={0.6} fill={p.metal} stroke={OL} strokeWidth={0.45} />
        <Shape d="M4.8 -25.5 C4.8 -28.6 3.1 -30.1 1.1 -30.1 C-0.9 -30.1 -2.7 -28.6 -2.7 -25.5 Z" f={p.metal} />
        <Paint d="M-2.7 -25.5 L4.8 -25.5 L4.8 -26.3 L-2.7 -26.2 Z" f={p.metalShade} />
        <Hi d="M-1.5 -27.8 C-0.8 -29 0.4 -29.5 1.4 -29.5" c={p.metalLight} w={0.7} mx={1.1} mr={false} />
        <Shape d="M2.4 -29.5 C3.6 -30.5 4.8 -32.3 5.1 -34.7 L6 -34.5 C5.8 -31.9 4.8 -29.7 3.4 -28.5 Z" f={p.metal} sw={0.55} />
        <circle cx={5.55} cy={-35} r={0.6} fill={p.metal} stroke={OL} strokeWidth={0.45} />
        <Hi d="M3.3 -29.6 C4.2 -30.6 4.9 -32 5.2 -33.6" c={p.metalLight} w={0.4} o={0.9} />
      </>
    );
  }
  if (helmet === 'laurel') {
    // a laurel wreath on the bare head, its ribbons trailing at the back
    return (
      <>
        <Hi d="M-2.4 -26.2 C-3.4 -25.4 -3.9 -24 -3.7 -22.6 M-2.2 -26 C-2.8 -25 -2.9 -23.8 -2.6 -22.8" c={p.gold} w={0.5} o={1} />
        <Line2 d="M-2.5 -26.1 C-0.9 -27.4 2.4 -27.9 4.5 -27.3" w={0.7} c={darken(LAUREL, 0.2)} ow={0.35} />
        <g fill={LAUREL} stroke={OL} strokeWidth={0.3}>
          {LAUREL_LEAVES.map(([x, y, a]) => <ellipse key={x} cx={x} cy={y} rx={0.42} ry={0.95} transform={`rotate(${a} ${x} ${y})`} />)}
        </g>
        <Hi d="M-0.4 -27.5 L0.6 -27.9 M2 -28.1 L3 -28" c={lighten(LAUREL, 0.45)} w={0.3} o={0.9} />
      </>
    );
  }
  if (helmet === 'gladiator') {
    // brimmed bronze helmet with a grille visor and a crest (the Thraex)
    return (
      <>
        {crestEl}
        <Shape d="M4.7 -26.3 C4.7 -29.4 3 -30.9 1.1 -30.9 C-0.9 -30.9 -2.6 -29.4 -2.6 -26.3 Z" f={p.metal} />
        <Shape d="M-2.8 -26 L-3 -22.2 L-0.4 -22.2 L-0.4 -26 Z" f={p.metal} sw={0.55} />
        <Shape d="M1.4 -26 L5.3 -26 C5.6 -24.6 5.4 -22.9 4.5 -21.8 L1.4 -21.8 Z" f={p.metal} sw={0.55} />
        <path d={dots([[2.6, -25], [3.8, -25], [2.6, -23.8], [3.8, -23.8], [2.6, -22.6], [3.8, -22.6]], 0.3)} fill={OL} />
        <Shape d="M-4.6 -26 C-4.6 -26.9 6.6 -26.9 6.8 -26 C6.6 -25.3 -4.4 -25.3 -4.6 -26 Z" f={p.metal} sw={0.55} />
        <Hi d="M-1.5 -28.6 C-0.8 -29.8 0.4 -30.3 1.4 -30.3" c={p.metalLight} w={0.7} mx={1.1} mr={false} />
      </>
    );
  }
  return null;
}

/** Hair combed back and up into a knot above the temple (the Suebi, Tacitus' Germania 38). */
export function SuebianKnot({ f }: { f: Fig }) {
  const dark = darken(f.hair, 0.35);
  return (
    <>
      <Hi d="M3.8 -27.2 C2.6 -28.4 1 -29 -0.2 -29 M3.2 -26.4 C1.8 -27.6 0.4 -28.2 -0.8 -28.4" c={dark} w={0.4} o={1} />
      <Shape d="M-2.2 -29.4 C-2.6 -31 -1.6 -32.4 -0.2 -32.2 C1.2 -32 1.6 -30.6 0.9 -29.6 C0.4 -28.9 -1.4 -28.6 -2.2 -29.4 Z" f={f.hair} sw={0.55} />
      <Hi d="M-1.4 -30.2 C-1.2 -31.2 -0.4 -31.6 0.4 -31.2 M-0.6 -29.4 C0 -29.8 0.4 -30.4 0.3 -31" c={dark} w={0.4} o={1} />
      <Hi d="M-1.6 -31.2 C-1 -31.8 -0.2 -31.9 0.4 -31.6" c={lighten(f.hair, 0.4)} w={0.35} o={0.9} />
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Arms

/** Two painted bands across an arm: below the sleeve on the upper arm and on the forearm. */
export function ArmBands({ s, e, h, w, c }: { s: [number, number]; e: [number, number]; h: [number, number]; w: number; c: string }) {
  const band = (a: [number, number], b: [number, number], t: number) => {
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (-(b[1] - a[1]) / l) * (w / 2);
    const ny = ((b[0] - a[0]) / l) * (w / 2);
    return `M${(x + nx).toFixed(2)} ${(y + ny).toFixed(2)} L${(x - nx).toFixed(2)} ${(y - ny).toFixed(2)}`;
  };
  return <path d={`${band(s, e, 0.78)} ${band(e, h, 0.45)}`} stroke={c} strokeWidth={0.55} />;
}
