// The sea (Expansion #1 `sea` hexes; lake rules, §16): open water with a gentle swell, a sandy beach along every
// hexside the sea shares with land, and surf foam - no reeds, unlike a lake. Along a board edge the coast runs on under
// the frame, so the sea reads as continuing off the board. It is painted before the rivers, which run across the beach
// and fade out into it (paintRivers).
import { ROWS } from '../../engine/types';
import { clampCol, parity } from '../geometry';
import { blurGrid, contours, decimate, loopArea, makeGrid, sampleGrid, smoothClosed, type Grid } from './field';
import { corner, DIRS, edgeCorners, fmt, neighborRC, polyPath, screenDir, type PaintCtx, type Pt, type Rect } from './hexmath';
import { clamp, fbm, rng } from './noise';
import { P } from './palette';
import { unit } from './vec';

export interface SeaOpts {
  /** Sea membership of any (possibly virtual, off-board) hex. Default: the board terrain, continued past the edges. */
  seaCell?: (r: number, c: number) => boolean;
  /**
   * Shallows of any (possibly virtual) sea hex: a coast played as a ford (217, §18.6), whose water stays shallow far out.
   * Default: the board's fordable sea hexes (`ford` set on a `sea` hex), continued past the edges; none on most boards.
   */
  fordCell?: (r: number, c: number) => boolean;
  /** Moves the coast this far into the sea (icons, whose land side is clipped away). */
  shift?: number;
}

interface Seg {
  a: Pt;
  b: Pt;
}

/** Rows/columns of virtual hexes considered around the board hexes. */
const MARGIN = 2;
/** Beach width on the land side of the waterline. */
const BEACH = 10;
/** Signed distance is clamped to this (only the first few bands matter). */
const DMAX = 120;
/** Depth scale of the water over a coast played as a ford: the deep bands start this much farther out. */
const SHALLOW = 0.27;

function distSeg(px: number, py: number, s: Seg): number {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - s.a.x) * dx + (py - s.a.y) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (s.a.x + t * dx), py - (s.a.y + t * dy));
}

/**
 * Board sea membership continued past the edges: off-board columns repeat the edge hex, and an off-board row half a
 * hex out takes its two edge-row neighbours (or, when they differ, the mirrored row) so a coast running into the top
 * or bottom edge keeps its zigzag instead of jogging sideways.
 */
function boardSea(ctx: PaintCtx, ford = false): (r: number, c: number) => boolean {
  const at = (r: number, c: number) => {
    const h = ctx.get(r, clampCol(r, c));
    return h?.t === 'sea' && (!ford || h.ford);
  };
  return (r, c) => {
    if (r >= 0 && r < ROWS) return at(r, c);
    const edge = r < 0 ? 0 : ROWS - 1;
    const away = Math.abs(r - edge);
    if (parity(r) === parity(edge)) return at(edge, c);
    // half a hex sideways from the edge row: between edge-row hexes c and c+1 (both edge rows are even)
    const a = at(edge, c);
    if (a === at(edge, c + 1)) return a;
    return at(r < 0 ? edge + away : edge - away, c);
  };
}

/**
 * Signed distance (px) to the coast, positive in the sea, over `rect`: the coast is every hexside between a sea and a
 * land hex (virtual off-board hexes included), and a point is at sea when the hex with the nearest centre is.
 */
function seaField(
  ctx: PaintCtx,
  rect: Rect,
  seaCell: (r: number, c: number) => boolean,
  shift: number,
  fordCell?: (r: number, c: number) => boolean,
): Grid {
  let r0 = Infinity;
  let r1 = -Infinity;
  let c0 = Infinity;
  let c1 = -Infinity;
  for (const h of ctx.hexes) {
    r0 = Math.min(r0, h.r);
    r1 = Math.max(r1, h.r);
    c0 = Math.min(c0, h.c);
    c1 = Math.max(c1, h.c);
  }
  r0 -= MARGIN;
  r1 += MARGIN;
  c0 -= MARGIN;
  c1 += MARGIN;
  const near = (p: Pt, pad: number) => p.x > rect.x0 - pad && p.x < rect.x1 + pad && p.y > rect.y0 - pad && p.y < rect.y1 + pad;
  const cells: { p: Pt; sea: boolean; ford: boolean }[] = [];
  const segs: Seg[] = [];
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const p = ctx.center(r, c);
      if (!near(p, 140)) continue;
      const sea = seaCell(r, c);
      cells.push({ p, sea, ford: sea && !!fordCell?.(r, c) });
      if (!sea) continue;
      for (const d of DIRS) {
        const [nr, nc] = neighborRC(r, c, d);
        if (nr < r0 || nr > r1 || nc < c0 || nc > c1 || seaCell(nr, nc)) continue;
        const [i, j] = edgeCorners(screenDir(d, ctx.flipped));
        segs.push({ a: corner(p, i), b: corner(p, j) });
      }
    }
  }
  const g = makeGrid(rect, 3);
  const segsNear = segs.filter((s) => near(s.a, DMAX) || near(s.b, DMAX));
  const cellsNear = cells.filter((c) => near(c.p, 90));
  // depth scale (shallows over a coast played as a ford), softened across the hexsides
  const depth = fordCell ? makeGrid(rect, 3) : null;
  for (let j = 0; j < g.ny; j++) {
    const y = g.y0 + j * g.step;
    for (let i = 0; i < g.nx; i++) {
      const x = g.x0 + i * g.step;
      let dist = DMAX;
      for (const s of segsNear) dist = Math.min(dist, distSeg(x, y, s));
      // the hex a point lies in is the one with the nearest centre
      let best = Infinity;
      let sea = false;
      let ford = false;
      for (const c of cellsNear) {
        const q = (c.p.x - x) * (c.p.x - x) + (c.p.y - y) * (c.p.y - y);
        if (q < best) {
          best = q;
          sea = c.sea;
          ford = c.ford;
        }
      }
      g.v[j * g.nx + i] = (sea ? dist : -dist) - shift;
      if (depth) depth.v[j * g.nx + i] = ford ? SHALLOW : 1;
    }
  }
  if (depth) {
    blurGrid(depth, 6, 2);
    for (let k = 0; k < g.v.length; k++) if (g.v[k] > 0) g.v[k] *= depth.v[k];
  }
  // wobble: a few pixels at the waterline, more farther out
  for (let j = 0; j < g.ny; j++) {
    const y = g.y0 + j * g.step;
    for (let i = 0; i < g.nx; i++) {
      const x = g.x0 + i * g.step;
      const k = j * g.nx + i;
      const v = g.v[k];
      g.v[k] = v + (fbm(x / 22, y / 22, 31) - 0.5) * 7 + (fbm(x / 47, y / 47, 37) - 0.5) * 0.45 * Math.max(0, v);
    }
  }
  return blurGrid(g, 1, 2);
}

/**
 * Drop points that lie within `tol` of the straight line through their kept neighbours (greedy, closed loop): the long
 * straight runs where a contour closes along the grid border under the frame shrink to a few points.
 */
function simplify(pts: Pt[], tol: number): Pt[] {
  if (pts.length < 8) return pts;
  const out: Pt[] = [pts[0]];
  let a = 0;
  for (let i = 2; i <= pts.length; i++) {
    const b = pts[i % pts.length];
    const A = pts[a];
    const dx = b.x - A.x;
    const dy = b.y - A.y;
    const l = Math.hypot(dx, dy) || 1;
    let ok = true;
    for (let k = a + 1; k < i; k++) {
      const q = pts[k];
      if (Math.abs((q.x - A.x) * dy - (q.y - A.y) * dx) / l > tol) {
        ok = false;
        break;
      }
    }
    if (!ok) {
      a = i - 1;
      out.push(pts[a]);
    }
  }
  return out.length >= 3 ? out : pts;
}

/** Iso-line of the sea field as one smooth path (tiny specks dropped, straight runs simplified). */
function seaIso(g: Grid, level: number, minDist: number): string {
  return contours(g, level)
    .filter((l) => Math.abs(loopArea(l)) >= 12)
    .map((l) => smoothClosed(simplify(decimate(l, minDist), 0.35)))
    .join('');
}

/** A softer copy of the field for the open-water bands (rounds off the corners a distance field has far out). */
function softened(g: Grid): Grid {
  const s: Grid = { ...g, v: new Float32Array(g.v) };
  return blurGrid(s, 4, 3);
}

/** Every sea hex of `ctx`, as one coast. */
export function paintSea(ctx: PaintCtx, opts: SeaOpts = {}): JSX.Element | null {
  const seas = ctx.hexes.filter((h) => h.t === 'sea');
  if (!seas.length) return null;
  const b = ctx.bounds;
  const pad = 72;
  const rect = {
    x0: Math.max(b.x0, Math.min(...seas.map((h) => h.x)) - pad),
    y0: Math.max(b.y0, Math.min(...seas.map((h) => h.y)) - pad),
    x1: Math.min(b.x1, Math.max(...seas.map((h) => h.x)) + pad),
    y1: Math.min(b.y1, Math.max(...seas.map((h) => h.y)) + pad),
  };
  const fordCell = opts.fordCell ?? (seas.some((h) => h.ford) ? boardSea(ctx, true) : undefined);
  const g = seaField(ctx, rect, opts.seaCell ?? boardSea(ctx), opts.shift ?? 0, fordCell);
  const soft = softened(g);
  const iso = (level: number) => seaIso(g, level, 3);
  const isoSoft = (level: number) => seaIso(soft, level, 4);

  // swell: low rolling crests out in open water, lit on top with a darker trough below
  const R = rng(5150 + seas[0].id);
  let crest = '';
  let trough = '';
  for (const h of seas) {
    for (let k = 0; k < 4; k++) {
      // spread over the hex (a jittered diamond of spots) rather than clumped
      const x = h.x + [-18, 16, -6, 22][k] + (R() - 0.5) * 16;
      const y = h.y + [-20, -10, 14, 22][k] + (R() - 0.5) * 12;
      if (sampleGrid(soft, x, y) < 17) continue;
      const n = 2 + (R() < 0.5 ? 1 : 0);
      const w = 6 + R() * 3;
      const hgt = 1.5 + R() * 0.7;
      const x0 = x - (n * w) / 2;
      let c = `M${fmt(x0)},${fmt(y)}`;
      let t = `M${fmt(x0 + 0.8)},${fmt(y + 1.9)}`;
      for (let m = 0; m < n; m++) {
        c += `q${fmt(w / 2)},${fmt(-hgt)} ${fmt(w)},0`;
        t += `q${fmt(w / 2)},${fmt(-hgt)} ${fmt(w)},0`;
      }
      crest += c;
      trough += t;
    }
  }

  const shore = iso(-BEACH);
  return (
    <g className="sea">
      <path d={iso(-BEACH - 2)} fill={P.verge} opacity={0.4} transform="translate(0 3)" />
      <path d={shore} fill={P.sand} />
      <path d={shore} fill="none" stroke={P.sandDark} strokeWidth={1.2} opacity={0.65} />
      <path d={iso(-3.5)} fill={P.sandWet} opacity={0.7} />
      <path d={iso(0.5)} fill={P.seaShallow} />
      <path d={iso(8)} fill={P.waterEdge} />
      <path d={isoSoft(18)} fill={P.water} />
      <path d={isoSoft(34)} fill={P.waterDeep} />
      <path d={isoSoft(56)} fill={P.waterDeeper} opacity={0.8} />
      <path d={iso(1.6)} fill="none" stroke={P.foam} strokeWidth={2} opacity={0.85} strokeLinejoin="round" />
      <path d={iso(5.5)} fill="none" stroke={P.foam} strokeWidth={1.1} opacity={0.5} strokeDasharray="15 5 3 8 8 6" strokeLinecap="round" />
      <path d={iso(11)} fill="none" stroke={P.foam} strokeWidth={0.9} opacity={0.3} strokeDasharray="5 13 2 17 9 11" strokeLinecap="round" />
      <path d={trough} fill="none" stroke={P.seaTrough} strokeWidth={1.4} strokeLinecap="round" />
      <path d={crest} fill="none" stroke={P.glint} strokeWidth={1.3} strokeLinecap="round" />
    </g>
  );
}

/**
 * Ford marks on a coast played as a ford (217, §18.6; the hexes are a fordable river in the rules): over the shallows
 * pale sand bars along the shore and a line of stepping stones wading out from the beach, as on a river ford. `toLand`
 * overrides the direction of the beach (icons); by default it is the mean direction of the hex's land neighbours.
 */
export function paintCoastFords(ctx: PaintCtx, toLand?: Pt): JSX.Element | null {
  const fords = ctx.hexes.filter((h) => h.t === 'sea' && h.ford);
  if (!fords.length) return null;
  let bars = '';
  let stones = '';
  let stoneSh = '';
  let stoneHi = '';
  let ripples = '';
  for (const h of fords) {
    let u = toLand;
    if (!u) {
      const v = { x: 0, y: 0 };
      for (const d of DIRS) {
        const [r, c] = neighborRC(h.r, h.c, d);
        const n = ctx.get(r, c);
        if (n && n.t !== 'sea') {
          v.x += n.x - h.x;
          v.y += n.y - h.y;
        }
      }
      // out at sea (no land beside it): wade towards the middle of the board
      u = unit(Math.hypot(v.x, v.y) > 1 ? v : { x: (ctx.bounds.x0 + ctx.bounds.x1) / 2 - h.x, y: (ctx.bounds.y0 + ctx.bounds.y1) / 2 - h.y });
    }
    const R = rng(2170 + h.id * 13);
    // each crossing leans a little and sits a little off the centre, so a row of them is not a pattern
    const lean = (R() - 0.5) * 0.5;
    const w = { x: u.x * Math.cos(lean) - u.y * Math.sin(lean), y: u.x * Math.sin(lean) + u.y * Math.cos(lean) };
    const n = { x: -w.y, y: w.x }; // along the shore
    const s0 = (R() - 0.5) * 16;
    const at = (a: number, s: number): Pt => ({ x: h.x + w.x * a + n.x * (s + s0), y: h.y + w.y * a + n.y * (s + s0) });
    const blob = (a: number, s: number, ra: number, rs: number, k: number, wob: number) => {
      const pts: Pt[] = [];
      for (let m = 0; m < k; m++) {
        const th = (m / k) * Math.PI * 2;
        const f = 1 + (R() - 0.5) * 2 * wob;
        pts.push(at(a + Math.sin(th) * ra * f, s + Math.cos(th) * rs * f));
      }
      return smoothClosed(pts);
    };
    // a sand bar along the shore across the crossing, and a smaller one farther out to one side
    bars += blob(-4 - R() * 6, (R() - 0.5) * 8, 5 + R() * 1.5, 20 + R() * 9, 9, 0.22);
    if (R() < 0.7) bars += blob(-24 - R() * 4, (R() < 0.5 ? -1 : 1) * (10 + R() * 8), 3, 8 + R() * 5, 7, 0.25);
    // stepping stones wading out from the beach, drifting a little sideways, smaller (and deeper) farther out
    const nst = 4 + Math.floor(R() * 2);
    let drift = 0;
    for (let k = 0; k < nst; k++) {
      const a = 30 - (k / (nst - 1)) * (46 + R() * 8);
      drift += (R() - 0.5) * 5;
      const c = at(a, drift + (k % 2 === 0 ? 1.6 : -1.6));
      const sz = 1 - (k / nst) * 0.3;
      const rx = (3.2 + R() * 1.2) * sz;
      const ry = (2.5 + R() * 0.8) * sz;
      const st: Pt[] = [];
      for (let m = 0; m < 7; m++) {
        const th = (m / 7) * Math.PI * 2 + R() * 0.3;
        st.push({ x: c.x + Math.cos(th) * rx * (0.85 + R() * 0.3), y: c.y + Math.sin(th) * ry * (0.85 + R() * 0.3) });
      }
      stoneSh += polyPath(st.map((p) => ({ x: p.x + 0.9, y: p.y + 1.3 })));
      stones += polyPath(st);
      stoneHi += `M${fmt(c.x - rx * 0.45)},${fmt(c.y - ry * 0.35)}l${fmt(rx * 0.6)},${fmt(-ry * 0.2)}`;
      // a ripple on the seaward side of the stone
      const r0 = at(a - 5, drift - 4.5);
      const r1 = at(a - 5, drift + 4.5);
      const rc = at(a - 7.5, drift);
      ripples += `M${fmt(r0.x)},${fmt(r0.y)}Q${fmt(rc.x)},${fmt(rc.y)} ${fmt(r1.x)},${fmt(r1.y)}`;
    }
  }
  return (
    <g className="coast-fords">
      <path d={bars} fill={P.sand} opacity={0.62} />
      <path d={bars} fill="none" stroke={P.waterShallowEdge} strokeWidth={1.2} opacity={0.7} />
      <path d={ripples} fill="none" stroke="rgba(240,248,245,0.7)" strokeWidth={1.1} strokeLinecap="round" />
      <path d={stoneSh} fill="rgba(18,46,66,0.35)" />
      <path d={stones} fill={P.stone} stroke={P.stoneDark} strokeWidth={0.9} />
      <path d={stoneHi} fill="none" stroke={P.stoneLight} strokeWidth={1} strokeLinecap="round" />
    </g>
  );
}
