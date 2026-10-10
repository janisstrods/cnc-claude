// Battle objective markers (rules-reference §18.4): a board layer drawn above the terrain and below the units, in the
// block colour of the side each objective belongs to. Capture targets fly a pennant (struck once taken), hold hexes get a
// banner-coloured outline and a small standard (raised while a unit of the side stands there), exit hexes arrows on their
// outer board edge, majority areas a dashed outline around the hex set (in the holder's colour while held) and section
// clear a tint over every section the side scores right now. Everything is placed in screen space from the hexes, so the
// markers turn with a flipped board; the pennants and arrows themselves stay upright.
import { useId } from 'react';
import { BLOCK_COLORS, type SideColors } from '../../art';
import { colOf, hexId, rowOf } from '../../engine/hex';
import { ROWS, type Blocks, type HexId, type ObjectiveDef, type ObjectiveState, type SectionName, type Side } from '../../engine/types';
import { BOARD_H, BOARD_W, HEX_R } from '../geometry';
import {
  boardCtx,
  corner,
  DIRS,
  edgeCorners,
  fieldOutline,
  fmt,
  neighborRC,
  onBoard,
  screenDir,
  vCenter,
  type Pt,
} from './hexmath';

export interface ObjectiveMarkersProps {
  /** `GameState.special.objectives`. */
  objectives: readonly ObjectiveDef[];
  /** `GameState.special.objState` (same order): taken capture hexes, held banners, scored sections. */
  objState: readonly ObjectiveState[];
  /** Board rotated 180 degrees (as BoardArt). */
  flipped: boolean;
  /** Block set of each side (`GameState.players[side].blocks`): the colour of its markers. */
  blocks: Record<Side, Blocks>;
  /** Units on the board (`GameState.units`; only side and hex are read): a hold hex with a unit of its side on it is held. */
  units?: readonly { side: Side; hex: HexId }[];
}

const INK = '#1d140c';
const GOLD = '#e9c25a';

const centre = (h: HexId, flipped: boolean): Pt => vCenter(rowOf(h), colOf(h), flipped);
const colors = (blocks: Record<Side, Blocks>, side: Side): SideColors => BLOCK_COLORS[blocks[side]];

/** Outline (one subpath per loop) of the union of `hexes`: every hexside whose neighbour is not in the set. */
function areaOutline(hexes: readonly HexId[], flipped: boolean): string {
  const set = new Set(hexes);
  type E = { a: Pt; b: Pt; used: boolean };
  const edges: E[] = [];
  const key = (p: Pt) => `${Math.round(p.x * 2)},${Math.round(p.y * 2)}`;
  const at = new Map<string, E[]>();
  for (const h of set) {
    const r = rowOf(h);
    const c = colOf(h);
    const p = vCenter(r, c, flipped);
    for (const d of DIRS) {
      const [nr, nc] = neighborRC(r, c, d);
      if (onBoard(nr, nc) && set.has(hexId(nr, nc))) continue;
      const [i, j] = edgeCorners(screenDir(d, flipped));
      const e: E = { a: corner(p, i), b: corner(p, j), used: false };
      edges.push(e);
      for (const q of [e.a, e.b]) {
        const k = key(q);
        const l = at.get(k);
        if (l) l.push(e);
        else at.set(k, [e]);
      }
    }
  }
  let d = '';
  for (const start of edges) {
    if (start.used) continue;
    start.used = true;
    const pts: Pt[] = [start.a, start.b];
    let cur = start.b;
    for (;;) {
      const next = (at.get(key(cur)) ?? []).find((e) => !e.used);
      if (!next) break;
      next.used = true;
      cur = key(next.a) === key(cur) ? next.b : next.a;
      pts.push(cur);
    }
    d += `M${pts.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join('L')}Z`;
  }
  return d;
}

/** A pennant on a pole planted at `base` (screen space): flying, or struck once taken (furled, with a gold check). */
function Pennant({ base, c, taken }: { base: Pt; c: SideColors; taken: boolean }) {
  const { x, y } = base;
  const top = y - 27;
  const pole = `M${fmt(x)},${fmt(y)}V${fmt(top)}`;
  const flag = taken
    ? // struck: the cloth hangs furled along the pole
      `M${fmt(x + 0.8)},${fmt(top + 2)}c4,2 4.6,7 2.6,13c-1.2,3.4 -2,5 -2.6,6z`
    : // flying: a swallow-tailed pennant with a little wave
      `M${fmt(x + 0.8)},${fmt(top + 0.5)}c5,-1.6 11,1.4 17.5,-0.4l-4.6,5.6l5.2,5.4c-6.5,1.6 -12.5,-1.2 -18.1,0.6z`;
  return (
    <g className={taken ? 'pennant taken' : 'pennant'} transform={`translate(${fmt(x)} ${fmt(y)}) scale(1.25) translate(${fmt(-x)} ${fmt(-y)})`}>
      <ellipse cx={fmt(x + 1.5)} cy={fmt(y + 0.8)} rx={5} ry={1.8} fill="rgba(20,14,6,0.4)" />
      <path d={pole} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <path d={pole} stroke="#a77d45" strokeWidth={1.5} strokeLinecap="round" />
      <path d={flag} fill={c.banner} stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
      {!taken && <path d={`M${fmt(x + 2.5)},${fmt(top + 2.6)}c4.5,-1.1 9,0.8 13.2,-0.2`} fill="none" stroke={c.edgeLight} strokeWidth={1.1} strokeLinecap="round" opacity={0.85} />}
      {taken && (
        <>
          <path d={`M${fmt(x - 0.6)},${fmt(top + 9)}h4.2`} stroke={GOLD} strokeWidth={1.6} strokeLinecap="round" />
          <circle cx={fmt(x + 8)} cy={fmt(y - 3)} r={5.2} fill={GOLD} stroke={INK} strokeWidth={1} />
          <path d={`M${fmt(x + 5.4)},${fmt(y - 3)}l1.9,2.1l3.5,-4.2`} fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      <circle cx={fmt(x)} cy={fmt(top - 1)} r={2} fill={GOLD} stroke={INK} strokeWidth={0.8} />
    </g>
  );
}

/** A small standard (a square banner hung from a crossbar), raised while held, else drawn hollow. */
function Standard({ base, c, held }: { base: Pt; c: SideColors; held: boolean }) {
  const { x, y } = base;
  const top = y - 25;
  return (
    <g className={held ? 'standard held' : 'standard'} transform={`translate(${fmt(x)} ${fmt(y)}) scale(1.2) translate(${fmt(-x)} ${fmt(-y)})`}>
      <ellipse cx={fmt(x + 1.5)} cy={fmt(y + 0.8)} rx={5} ry={1.8} fill="rgba(20,14,6,0.4)" />
      <path d={`M${fmt(x)},${fmt(y)}V${fmt(top)}M${fmt(x - 7)},${fmt(top + 3)}H${fmt(x + 7)}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <path d={`M${fmt(x)},${fmt(y)}V${fmt(top)}M${fmt(x - 7)},${fmt(top + 3)}H${fmt(x + 7)}`} stroke="#a77d45" strokeWidth={1.5} strokeLinecap="round" />
      <path
        d={`M${fmt(x - 6)},${fmt(top + 3.5)}h12v11l-6,3.5l-6,-3.5z`}
        fill={held ? c.banner : 'rgba(250,240,214,0.55)'}
        stroke={held ? INK : c.bannerShade}
        strokeWidth={held ? 1.1 : 1.4}
        strokeLinejoin="round"
      />
      <path d={`M${fmt(x - 6)},${fmt(top + 3.5)}h12v11l-6,3.5l-6,-3.5z`} fill="none" stroke={c.edge} strokeWidth={1} strokeLinejoin="round" opacity={held ? 0 : 0.9} />
      {held && <circle cx={fmt(x)} cy={fmt(top + 9)} r={2.2} fill={GOLD} stroke={INK} strokeWidth={0.6} />}
      <circle cx={fmt(x)} cy={fmt(top - 1)} r={2} fill={GOLD} stroke={INK} strokeWidth={0.8} />
    </g>
  );
}

/** Screen direction (unit vector) out of the board across the outer edge of edge hex `h`: off the top or bottom row first. */
function outward(h: HexId, flipped: boolean): Pt {
  const r = rowOf(h);
  const c = colOf(h);
  const p = vCenter(r, c, flipped);
  let x = 0;
  let y = 0;
  for (const d of DIRS) {
    const [nr, nc] = neighborRC(r, c, d);
    if (onBoard(nr, nc)) continue;
    // a hex of the top or bottom row (corners too) exits over that row's edge
    if ((r === 0 && nr >= 0) || (r === ROWS - 1 && nr < ROWS)) continue;
    const q = vCenter(nr, nc, flipped);
    x += q.x - p.x;
    y += q.y - p.y;
  }
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
}

/** Exit marker of edge hex `h`: its outer hexsides drawn in the side's colour and an arrow pointing off the board. */
function ExitArrow({ h, flipped, c }: { h: HexId; flipped: boolean; c: SideColors }) {
  const r = rowOf(h);
  const col = colOf(h);
  const p = vCenter(r, col, flipped);
  const u = outward(h, flipped);
  let sides = '';
  for (const d of DIRS) {
    const [nr, nc] = neighborRC(r, col, d);
    if (onBoard(nr, nc)) continue;
    const q = vCenter(nr, nc, flipped);
    // only the hexsides facing the exit direction
    if ((q.x - p.x) * u.x + (q.y - p.y) * u.y < 10) continue;
    const [i, j] = edgeCorners(screenDir(d, flipped));
    const a = corner(p, i, HEX_R - 2.5);
    const b = corner(p, j, HEX_R - 2.5);
    sides += `M${fmt(a.x)},${fmt(a.y)}L${fmt(b.x)},${fmt(b.y)}`;
  }
  // a broad chevron arrow just inside the outer edge (clear of the unit's name plate), pointing out
  const n = { x: -u.y, y: u.x };
  const at = (a: number, s: number): Pt => ({ x: p.x + u.x * a + n.x * s, y: p.y + u.y * a + n.y * s });
  const arrow = [at(48, 0), at(35, 13.5), at(35, 6), at(25, 6), at(25, -6), at(35, -6), at(35, -13.5)];
  const d = `M${arrow.map((q) => `${fmt(q.x)},${fmt(q.y)}`).join('L')}Z`;
  return (
    <g className="exit">
      <path d={sides} fill="none" stroke={INK} strokeWidth={6.5} strokeLinecap="round" opacity={0.6} />
      <path d={sides} fill="none" stroke={c.edge} strokeWidth={4.2} strokeLinecap="round" />
      <path d={sides} fill="none" stroke={c.edgeLight} strokeWidth={1.2} strokeLinecap="round" strokeDasharray="2 5" opacity={0.9} />
      <path d={d} fill="rgba(20,14,6,0.4)" transform="translate(1.2 1.8)" />
      <path d={d} fill={c.edge} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
      <path d={`M${fmt(at(44.5, 0).x)},${fmt(at(44.5, 0).y)}L${fmt(at(36.5, 9).x)},${fmt(at(36.5, 9).y)}`} stroke={c.edgeLight} strokeWidth={1.4} strokeLinecap="round" opacity={0.9} />
    </g>
  );
}

/** Screen x-bands of the three sections (left, centre, right as seen by the bottom player), split at the dividers. */
function sectionBands(flipped: boolean): Record<SectionName, [number, number]> {
  const d1 = vCenter(0, 4, false).x;
  const d2 = vCenter(0, 8, false).x;
  const bands: Record<SectionName, [number, number]> = { left: [0, d1], center: [d1, d2], right: [d2, BOARD_W] };
  if (!flipped) return bands;
  const mirror = ([a, b]: [number, number]): [number, number] => [BOARD_W - b, BOARD_W - a];
  return { left: mirror(bands.left), center: mirror(bands.center), right: mirror(bands.right) };
}

/** The section of the bottom player's view that `side`'s section `s` is. */
const asBottom = (side: Side, s: SectionName): SectionName => (side === 'bottom' || s === 'center' ? s : s === 'left' ? 'right' : 'left');

const fieldCache = new Map<boolean, string>();
function field(flipped: boolean): string {
  let d = fieldCache.get(flipped);
  if (d === undefined) {
    d = fieldOutline(boardCtx([], [], flipped));
    fieldCache.set(flipped, d);
  }
  return d;
}

/** The objective markers of a battle (nothing when it has no objectives). */
export function ObjectiveMarkers({ objectives, objState, flipped, blocks, units }: ObjectiveMarkersProps): JSX.Element | null {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!objectives.length) return null;
  const clip = `om${uid}-field`;
  const bands = sectionBands(flipped);
  const unitSide = new Map<HexId, Side>();
  for (const u of units ?? []) if (u.hex >= 0) unitSide.set(u.hex, u.side);

  const defs: JSX.Element[] = [];
  const tints: JSX.Element[] = [];
  const areas: JSX.Element[] = [];
  const rings: JSX.Element[] = [];
  const posts: { y: number; el: JSX.Element }[] = [];
  const arrows: JSX.Element[] = [];

  objectives.forEach((o, i) => {
    const st = objState[i];
    switch (o.kind) {
      case 'sectionClear': {
        const c = colors(blocks, o.side);
        // the tint rises from the side's own baseline and fades out across the board
        const own = (o.side === 'bottom') !== flipped ? BOARD_H : 0;
        const grad = `om${uid}-sc${i}`;
        defs.push(
          <linearGradient key={grad} id={grad} gradientUnits="userSpaceOnUse" x1={0} y1={own} x2={0} y2={BOARD_H - own}>
            <stop offset="0" stopColor={c.edge} stopOpacity={0.34} />
            <stop offset="0.12" stopColor={c.edge} stopOpacity={0.16} />
            <stop offset="0.3" stopColor={c.edge} stopOpacity={0} />
          </linearGradient>,
        );
        for (const s of st?.sections ?? []) {
          const [x0, x1] = bands[asBottom(o.side, s)];
          tints.push(
            <rect key={`t${i}${s}`} className={`section-tint section-${s}`} x={fmt(x0)} y={0} width={fmt(x1 - x0)} height={BOARD_H} fill={`url(#${grad})`} />,
          );
        }
        break;
      }
      case 'majority': {
        const holder = (['top', 'bottom'] as const).find((s) => (st?.held[s] ?? 0) > 0);
        const d = areaOutline(o.hexes, flipped);
        const cs = (holder ? [holder] : o.sides).map((s) => colors(blocks, s));
        areas.push(
          <g key={`m${i}`} className={holder ? `majority held-${holder}` : 'majority'} fill="none" strokeLinejoin="round">
            {holder && <path d={d} fill={cs[0].edge} opacity={0.12} />}
            <path d={d} stroke={INK} strokeWidth={5.4} opacity={0.5} />
            <path d={d} stroke="rgba(250,240,214,0.9)" strokeWidth={3.4} />
            {cs.map((c, k) => (
              <path key={k} d={d} stroke={c.edge} strokeWidth={3.4} strokeDasharray={cs.length > 1 ? '9 9' : '9 5'} strokeDashoffset={k * 9} />
            ))}
          </g>,
        );
        break;
      }
      case 'hold': {
        const c = colors(blocks, o.side);
        for (const h of o.hexes) {
          const p = centre(h, flipped);
          const ring = Array.from({ length: 6 }, (_, k) => corner(p, k, HEX_R - 4.5));
          const d = `M${ring.map((q) => `${fmt(q.x)},${fmt(q.y)}`).join('L')}Z`;
          rings.push(
            <g key={`h${i}-${h}`} className="hold" fill="none" strokeLinejoin="round">
              <path d={d} stroke={INK} strokeWidth={5.6} opacity={0.5} />
              <path d={d} stroke={c.edge} strokeWidth={3.4} />
              <path d={d} stroke={c.edgeLight} strokeWidth={1} opacity={0.8} strokeDasharray="2 6" />
            </g>,
          );
          posts.push({ y: p.y, el: <Standard key={`hs${i}-${h}`} base={{ x: p.x - 27, y: p.y - 6 }} c={c} held={unitSide.get(h) === o.side} /> });
        }
        break;
      }
      case 'capture': {
        const c = colors(blocks, o.side);
        const taken = new Set(st?.taken ?? []);
        for (const h of o.hexes) {
          const p = centre(h, flipped);
          posts.push({ y: p.y, el: <Pennant key={`c${i}-${h}`} base={{ x: p.x - 25, y: p.y - 7 }} c={c} taken={taken.has(h)} /> });
        }
        break;
      }
      case 'exit': {
        const c = colors(blocks, o.side);
        for (const h of o.hexes) arrows.push(<ExitArrow key={`e${i}-${h}`} h={h} flipped={flipped} c={c} />);
        break;
      }
    }
  });

  return (
    <g className="objective-markers" pointerEvents="none">
      <defs>
        {tints.length > 0 && (
          <clipPath id={clip}>
            <path d={field(flipped)} />
          </clipPath>
        )}
        {defs}
      </defs>
      {tints.length > 0 && <g clipPath={`url(#${clip})`}>{tints}</g>}
      {areas}
      {rings}
      {arrows}
      {posts.sort((a, b) => a.y - b.y).map((q) => q.el)}
    </g>
  );
}
