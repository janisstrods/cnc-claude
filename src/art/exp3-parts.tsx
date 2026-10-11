// Expansion #3 art parts (the Roman Civil Wars): the shield devices of the civil-war armies (Sertorius' fawn, Pompey's
// lion, Sulla's trophy, the Pontic star and crescent), the Iberian caetra, the Samnite helmet with its tall feathers and
// the Lusitanian sinew cap, the Samnite triple-disc cuirass and broad bronze belt, and Pompey's hair. The devices, the
// caetra and the helmets are renderer tables that parts.tsx merges into its own (as it does exp2-parts.tsx's); Head and
// Body draw the rest. Drawn with the primitives of draw.tsx, so this module does not import parts.tsx.
import { darken, lighten } from './color';
import type { EmblemKind, Palette } from './palettes';
import {
  Hi, Line2, OL, OW, Paint, Shape, dots, type DeviceRenderer, type Fig, type HelmRenderer, type ShieldRenderer,
} from './draw';

const f2 = (n: number) => n.toFixed(2);

// ---------------------------------------------------------------------------------------------
// Devices (unit frame, radius ~3)

/** Sertorius' white fawn (Plutarch, Sertorius 11), standing, facing right. */
const FAWN =
  'M-3 0.4 C-3.1 -0.6 -2.2 -1.2 -0.8 -1.2 L1.2 -1.2 C1.6 -1.7 1.9 -2.4 2.1 -3 L2.5 -3.3 L3.4 -2.9 L3.2 -2.5 ' +
  'C2.8 -2.1 2.6 -1.5 2.5 -0.8 C2.4 -0.1 2.1 0.3 1.7 0.5 L2 2.9 L1.4 2.9 L1 0.7 L-1.6 0.7 L-1.4 2.9 L-2 2.9 L-2.3 0.6 ' +
  'C-2.7 0.6 -3 0.5 -3 0.4 Z';
const FAWN_EARS = 'M2.2 -3.1 L1.5 -4.2 L2.6 -3.4 Z M2.65 -3.2 L2.75 -4.3 L3.05 -3.25 Z M-3 -0.1 L-3.7 -0.9 L-2.8 -0.7 Z';
/** Pompey's seal: a lion holding a sword (Plutarch, Pompey 80). */
const LION =
  'M-3 0.6 C-3.1 -0.4 -2.3 -0.9 -1 -0.9 L0.8 -0.9 C1 -1.9 1.7 -2.7 2.6 -2.7 C3.4 -2.6 3.8 -1.9 3.5 -1.2 L3.7 -0.7 ' +
  'L3 -0.5 C2.8 0 2.4 0.3 2 0.4 L2.2 2.6 L1.5 2.6 L1.3 0.7 L-1.3 0.7 L-1.5 2.6 L-2.2 2.6 L-2.3 0.7 C-2.7 0.8 -3 0.7 -3 0.6 Z';
const LION_MANE = 'M0.4 -0.6 C0 -2.2 0.9 -3.5 2.4 -3.6 C3.7 -3.6 4.3 -2.6 4 -1.5 C3.5 -0.5 2 0.2 0.4 -0.6 Z';
/** The Pontic royal badge: an eight-rayed star over a crescent (the coins of Mithridates). */
const STAR8 = (() => {
  const pts: string[] = [];
  for (let k = 0; k < 16; k++) {
    const a = (Math.PI * k) / 8 - Math.PI / 2;
    const r = k % 2 ? 0.55 : 1.55;
    pts.push(`${f2(Math.cos(a) * r)} ${f2(Math.sin(a) * r - 1.25)}`);
  }
  return `M${pts.join(' L')} Z`;
})();
const CRESCENT_UP = 'M-2.5 0.7 A2.5 2.2 0 0 0 2.5 0.7 A2 1.45 0 0 1 -2.5 0.7 Z';

/** The Expansion #3 devices, in a unit frame (radius ~3). */
export const EXP3_DEVICES = {
  fawn: ({ col, bg, edge }) => (
    <g>
      <path d={FAWN} fill={col} stroke={edge} strokeWidth={0.25} strokeLinejoin="round" />
      <path d={FAWN_EARS} fill={col} stroke={edge} strokeWidth={0.2} strokeLinejoin="round" />
      <circle cx={2.75} cy={-2.75} r={0.24} fill={bg} />
    </g>
  ),
  // drawn a little smaller, so the lion and his sword fit the narrowing top of a scutum
  lion: ({ col, bg, edge }) => (
    <g transform="translate(-0.3 0.3) scale(0.8)">
      <path d="M-3 0.1 C-3.9 -0.3 -4 -1.5 -3.4 -2.2" fill="none" stroke={col} strokeWidth={0.45} strokeLinecap="round" />
      <circle cx={-3.35} cy={-2.4} r={0.45} fill={col} />
      <path d={LION} fill={col} stroke={edge} strokeWidth={0.25} strokeLinejoin="round" />
      <path d={LION_MANE} fill={col} stroke={edge} strokeWidth={0.3} strokeLinejoin="round" />
      <circle cx={2.9} cy={-2.2} r={0.24} fill={bg} />
      {/* the sword raised in the forepaw */}
      <path d="M3.1 -1.3 L4 -4.8" stroke={col} strokeWidth={0.5} strokeLinecap="round" />
      <path d="M2.55 -1.55 L3.75 -1.2" stroke={col} strokeWidth={0.45} strokeLinecap="round" />
    </g>
  ),
  // a tropaeum: helmet, cuirass and two shields on a post (Sulla's trophies of Chaeronea)
  trophy: ({ col, edge }) => (
    <g fill={col}>
      <path d="M0 -2 L0 3.2 M-2.7 -0.9 L2.7 -0.9" fill="none" stroke={col} strokeWidth={0.6} strokeLinecap="round" />
      <path d="M-1.15 -1 L1.15 -1 L0.9 1.4 L-0.9 1.4 Z M-1.25 1.4 L1.25 1.4 L1.05 2.1 L-1.05 2.1 Z" stroke={edge} strokeWidth={0.2} />
      <path d="M-0.95 -1.6 C-1 -2.9 1 -2.9 0.95 -1.6 Z M-0.2 -2.7 C-0.6 -3.6 0.4 -3.9 1.1 -3.3 Z" stroke={edge} strokeWidth={0.2} />
      <circle cx={-2.7} cy={-0.1} r={0.85} stroke={edge} strokeWidth={0.2} />
      <circle cx={2.7} cy={-0.1} r={0.85} stroke={edge} strokeWidth={0.2} />
    </g>
  ),
  starCrescent: ({ col, edge }) => (
    <g fill={col} stroke={edge} strokeWidth={0.22} strokeLinejoin="round">
      <path d={STAR8} />
      <path d={CRESCENT_UP} transform="translate(0 0.9)" />
    </g>
  ),
} satisfies Partial<Record<EmblemKind, DeviceRenderer>>;

// ---------------------------------------------------------------------------------------------
// The Iberian caetra: a small round buckler with a big central boss, rivets and painted rings (Strabo 3.3.6)

const CAETRA_RAYS = Array.from({ length: 10 }, (_, k) => {
  const a = (Math.PI * 2 * k) / 10;
  return `M${f2(5.6 + Math.cos(a) * 1.85)} ${f2(-15 + Math.sin(a) * 1.85)} L${f2(5.6 + Math.cos(a) * 2.55)} ${f2(-15 + Math.sin(a) * 2.55)}`;
}).join(' ');
const CAETRA_RIVET_PTS = [0, 1, 2, 3, 4, 5].map((k) => {
  const a = (Math.PI * 2 * k) / 6 + 0.5;
  return [5.6 + Math.cos(a) * 3.3, -15 + Math.sin(a) * 3.3] as const;
});
const CAETRA_RIVETS = dots(CAETRA_RIVET_PTS, 0.3);

/** The shield drawn here. */
export type Exp3ShieldKind = 'caetra';
export const EXP3_SHIELDS: Record<Exp3ShieldKind, ShieldRenderer> = {
  caetra: ({ f, face, faceShade, faceLight, emb }) => {
    const { p } = f;
    return (
      <>
        <circle cx={5.4} cy={-15} r={4.3} fill={p.shieldRim} stroke={OL} strokeWidth={OW} />
        <circle cx={5.55} cy={-15} r={3.75} fill={face} />
        <Paint d="M2.4 -17.8 C1.4 -15.8 1.6 -13.2 3 -11.6 C2.2 -13.6 2.4 -16.2 3.6 -18.6 Z" f={faceShade} mx={5.6} />
        <circle cx={5.6} cy={-15} r={2.85} fill="none" stroke={emb} strokeWidth={0.5} />
        <path d={CAETRA_RAYS} stroke={emb} strokeWidth={0.5} strokeLinecap="round" />
        <path d={CAETRA_RIVETS} fill={p.metal} />
        <circle cx={5.7} cy={-15} r={1.45} fill={p.metal} stroke={OL} strokeWidth={0.5} />
        <circle cx={5.35} cy={-15.35} r={0.5} fill={p.metalLight} />
        <Hi d="M7.6 -18.2 C8.8 -16.8 8.9 -14.2 8.2 -12.4" c={faceLight} w={0.55} mx={5.6} />
      </>
    );
  },
};

// ---------------------------------------------------------------------------------------------
// Helmets

/** Half-widths of a feather's vanes along its shaft (t from the holder to the tip): back vane, front vane. */
const VANE: [t: number, back: number, front: number][] = [
  [0.06, 0.15, 0.1], [0.16, 0.6, 0.35], [0.3, 0.9, 0.5], [0.42, 1, 0.55], [0.47, 0.62, 0.55], [0.53, 1, 0.55], [0.66, 1, 0.5],
  [0.72, 0.66, 0.45], [0.78, 0.92, 0.42], [0.88, 0.72, 0.32], [0.95, 0.4, 0.2],
];

/**
 * A tall feather from its holder at (bx, by) to the tip (tx, ty), its shaft bowed backwards: a broad vane behind the shaft
 * with two notches and a narrow one in front, the tip rounded, so it reads as a feather and not as a horn or a blade.
 */
function Feather({ bx, by, tx, ty, w, c, quill }: { bx: number; by: number; tx: number; ty: number; w: number; c: string; quill: string }) {
  const dx = tx - bx;
  const dy = ty - by;
  const l = Math.hypot(dx, dy);
  // the normal pointing backwards (to -x for a feather rising to the right of vertical)
  const nx = dy / l;
  const ny = -dx / l;
  const bow = 0.9;
  const pt = (t: number, off: number) => {
    const b = bow * 4 * t * (1 - t);
    return `${f2(bx + dx * t + nx * (off + b))} ${f2(by + dy * t + ny * (off + b))}`;
  };
  const back = VANE.map(([t, wb]) => pt(t, wb * w));
  const front = [...VANE].reverse().map(([t, , wf]) => pt(t, -wf * w));
  const d = `M${pt(0, 0)} L${back.join(' L')} Q${pt(1.03, 0)} ${front[0]} L${front.slice(1).join(' L')} Z`;
  return (
    <>
      <path d={d} fill={c} stroke={OL} strokeWidth={0.45} strokeLinejoin="round" />
      <path d={`M${pt(0, 0)} Q${pt(0.5, 0)} ${pt(0.97, 0)}`} fill="none" stroke={quill} strokeWidth={0.32} opacity={0.9} />
    </>
  );
}

const SAMNITE_BOWL = 'M5.4 -25.6 C5.2 -28.6 3.3 -30.1 1.1 -30.1 C-1.1 -30.1 -2.8 -28.5 -2.8 -25.6 L-3 -22.9 L-1.4 -23.5 L-0.9 -25.2 L4.1 -25.2 Z';

/**
 * The Expansion #3 headgear: the Samnite helmet with a tall feather at either side (and a crest with `horsehair` or `tall`),
 * the Lusitanian sinew cap with three crests.
 */
export type Exp3Helmet = 'samnite' | 'sinew';

/** Their renderers (merged into HELMS in parts.tsx). */
export const EXP3_HELMS: Record<Exp3Helmet, HelmRenderer> = {
  // an Attic-type bowl with a raised brow and its volute, a cheek-piece, and a tall feather in a holder at either side
  // (the warriors of the Paestum tombs); `horsehair` or `tall` adds a crest on the crown
  samnite: ({ f, crest, crestEl }) => {
    const { p } = f;
    const crested = crest === 'horsehair' || crest === 'tall';
    return (
      <>
        {crested && crestEl}
        <Feather bx={-1.9} by={-28.9} tx={-4.6} ty={-39.6} w={1.2} c={darken(p.crest, 0.14)} quill={darken(p.crest, 0.4)} />
        <Shape d={SAMNITE_BOWL} f={p.metal} />
        <Paint d="M-2.8 -25.6 L-3 -22.9 L-1.4 -23.5 L-0.9 -25.2 L4.1 -25.2 L4.5 -26.2 C2 -26.4 -0.6 -26.4 -2.8 -25.6 Z" f={p.metalShade} />
        <Hi d="M-1.6 -27.9 C-0.9 -29.1 0.4 -29.5 1.5 -29.5" c={p.metalLight} w={0.75} mx={1.1} mr={false} />
        <Line2 d="M-2.5 -26.6 C-0.6 -27.6 2.6 -27.8 5.1 -26.7" w={0.6} c={p.metalLight} ow={0.3} />
        <circle cx={4.5} cy={-27.1} r={0.6} fill="none" stroke={OL} strokeWidth={0.35} />
        <Shape d="M-0.3 -25.3 L2.2 -25.3 L2 -22.1 C1.3 -21.6 0.4 -21.8 0 -22.3 Z" f={p.metal} sw={0.55} />
        <Line2 d="M3.2 -28.4 L3.5 -30" w={0.9} c={p.metal} ow={0.35} />
        <Feather bx={3.5} by={-29.8} tx={3.1} ty={-41} w={1.25} c={p.crest} quill={darken(p.crest, 0.4)} />
      </>
    );
  },
  // a close cap of sinew covering the nape, with three small crests (Strabo 3.3.6, on the Lusitanians)
  sinew: ({ f }) => {
    const { p } = f;
    const cap = p.leather;
    const tuft = (x: number, y: number) => `M${f2(x - 0.55)} ${f2(y)} C${f2(x - 1.2)} ${f2(y - 1.4)} ${f2(x - 0.6)} ${f2(y - 2.9)} ${f2(x + 0.2)} ${f2(y - 3)} C${f2(x + 0.5)} ${f2(y - 2)} ${f2(x + 0.7)} ${f2(y - 1)} ${f2(x + 0.55)} ${f2(y)} Z`;
    return (
      <>
        <path d={[tuft(-1.2, -29), tuft(1, -29.6), tuft(3.2, -29)].join(' ')} fill={p.crest} stroke={OL} strokeWidth={0.45} strokeLinejoin="round" />
        <Shape d="M-2.8 -24.4 C-3.1 -28.2 -1 -29.8 1.2 -29.8 C3.3 -29.8 4.8 -28.6 4.7 -26.2 L4.3 -25.7 L-0.3 -25.5 L-1 -23 L-2.7 -22.6 Z" f={cap} />
        <Paint d="M-2.8 -24.4 C-3 -26.4 -2.5 -27.9 -1.6 -28.8 C-1.6 -27.2 -1.2 -25.4 -1 -23 L-2.7 -22.6 Z" f={darken(cap, 0.3)} o={0.8} />
        <Hi d="M-2.5 -26.3 C-0.7 -26.9 2.4 -27 4.5 -26.3" c={darken(cap, 0.38)} w={0.55} o={1} />
        <Hi d="M-1.1 -28.5 C0 -29.2 1.4 -29.3 2.6 -29" c={lighten(cap, 0.35)} w={0.5} o={0.9} />
      </>
    );
  },
};

// ---------------------------------------------------------------------------------------------
// Body

/** The Samnite triple-disc cuirass: three bronze discs on a plate over the chest, on shoulder straps (standing frame). */
export function TripleDisc({ p }: { p: Palette }) {
  const discs: [number, number][] = [[-1.7, -19.7], [2.2, -19.8], [0.3, -16.8]];
  return (
    <g>
      <Line2 d="M-1.9 -21.2 L-2.2 -22 M2.4 -21.3 L2.6 -22.1" w={0.8} c={p.leatherShade} ow={0.3} />
      <Shape d="M-2.6 -20.6 L3.3 -20.8 L1.6 -15.7 L-1 -15.7 Z" f={p.metalShade} sw={0.5} />
      {discs.map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r={1.6} fill={p.metal} stroke={OL} strokeWidth={0.5} />
          <circle cx={x} cy={y} r={0.95} fill="none" stroke={p.metalShade} strokeWidth={0.35} />
          <circle cx={x - 0.45} cy={y - 0.5} r={0.4} fill={p.metalLight} />
        </g>
      ))}
    </g>
  );
}

/** The broad bronze belt of the Samnite and Lucanian warriors, with its hooks (standing frame; drawn over the belt line). */
export function BronzeBelt({ p }: { p: Palette }) {
  return (
    <g>
      <Shape d="M-3.95 -16.5 L4.25 -16.5 L4.15 -13.4 L-3.85 -13.4 Z" f={p.metal} sw={0.5} />
      <Hi d="M-3.6 -15.9 L3.9 -15.9" c={p.metalLight} w={0.4} o={0.9} />
      <path d={dots([[-3.2, -14.1], [-1.4, -14.1], [0.4, -14.1], [2.2, -14.1]], 0.22)} fill={p.metalShade} />
      <Line2 d="M3.4 -15.4 C4.2 -15.2 4.4 -14.6 3.8 -14.2" w={0.45} c={p.metal} ow={0.3} />
    </g>
  );
}

/** Pompey's hair: short, with the lock swept up off the forehead (his anastole, after Alexander's). */
export function Anastole({ f }: { f: Fig }) {
  return (
    <>
      <Shape d="M1.6 -28.4 C1.8 -30.4 3.4 -31.2 4.9 -30.3 C4 -30 3.6 -29.3 3.7 -28.5 C3.2 -28.2 2.3 -28.1 1.6 -28.4 Z" f={f.hair} sw={0.55} />
      <Hi d="M2.4 -29.3 C2.8 -30.2 3.6 -30.5 4.3 -30.3" c={lighten(f.hair, 0.4)} w={0.4} o={0.9} />
    </>
  );
}
