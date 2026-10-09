// Scalar fields on a regular grid + marching squares, used to derive soft, organic and merged
// outlines (lakes, hill ridges, forest floors, marsh, rough ground) from the hex terrain.
import { fmt, type Pt, type Rect } from './hexmath';

export interface Grid {
  x0: number;
  y0: number;
  step: number;
  nx: number;
  ny: number;
  v: Float32Array;
}

export function makeGrid(r: Rect, step: number): Grid {
  const nx = Math.max(2, Math.ceil((r.x1 - r.x0) / step) + 1);
  const ny = Math.max(2, Math.ceil((r.y1 - r.y0) / step) + 1);
  return { x0: r.x0, y0: r.y0, step, nx, ny, v: new Float32Array(nx * ny) };
}

export function fillGrid(g: Grid, fn: (x: number, y: number) => number): Grid {
  for (let j = 0; j < g.ny; j++) {
    const y = g.y0 + j * g.step;
    for (let i = 0; i < g.nx; i++) g.v[j * g.nx + i] = fn(g.x0 + i * g.step, y);
  }
  return g;
}

/** Separable box blur (radius in cells), repeated `passes` times (approximates a gaussian). */
export function blurGrid(g: Grid, radius: number, passes = 2): Grid {
  if (radius < 1) return g;
  const { nx, ny } = g;
  const tmp = new Float32Array(nx * ny);
  const w = 2 * radius + 1;
  for (let p = 0; p < passes; p++) {
    // horizontal
    for (let j = 0; j < ny; j++) {
      const row = j * nx;
      let acc = 0;
      for (let k = -radius; k <= radius; k++) acc += g.v[row + Math.min(nx - 1, Math.max(0, k))];
      for (let i = 0; i < nx; i++) {
        tmp[row + i] = acc / w;
        const add = Math.min(nx - 1, i + radius + 1);
        const sub = Math.max(0, i - radius);
        acc += g.v[row + add] - g.v[row + sub];
      }
    }
    // vertical
    for (let i = 0; i < nx; i++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) acc += tmp[Math.min(ny - 1, Math.max(0, k)) * nx + i];
      for (let j = 0; j < ny; j++) {
        g.v[j * nx + i] = acc / w;
        const add = Math.min(ny - 1, j + radius + 1);
        const sub = Math.max(0, j - radius);
        acc += tmp[add * nx + i] - tmp[sub * nx + i];
      }
    }
  }
  return g;
}

/** Add a function of position to every sample. */
export function addToGrid(g: Grid, fn: (x: number, y: number, v: number) => number): Grid {
  for (let j = 0; j < g.ny; j++) {
    const y = g.y0 + j * g.step;
    for (let i = 0; i < g.nx; i++) {
      const k = j * g.nx + i;
      g.v[k] += fn(g.x0 + i * g.step, y, g.v[k]);
    }
  }
  return g;
}

export function sampleGrid(g: Grid, x: number, y: number): number {
  const fx = (x - g.x0) / g.step;
  const fy = (y - g.y0) / g.step;
  const i = Math.max(0, Math.min(g.nx - 2, Math.floor(fx)));
  const j = Math.max(0, Math.min(g.ny - 2, Math.floor(fy)));
  const tx = Math.max(0, Math.min(1, fx - i));
  const ty = Math.max(0, Math.min(1, fy - j));
  const a = g.v[j * g.nx + i];
  const b = g.v[j * g.nx + i + 1];
  const c = g.v[(j + 1) * g.nx + i];
  const d = g.v[(j + 1) * g.nx + i + 1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

/**
 * Closed iso-lines (value >= level is "inside") of the grid. The grid border is treated as
 * outside so every line is a closed loop.
 */
export function contours(g: Grid, level: number): Pt[][] {
  const { nx, ny, v, x0, y0, step } = g;
  const val = (i: number, j: number) => (i === 0 || j === 0 || i === nx - 1 || j === ny - 1 ? -1e6 : v[j * nx + i]);
  const pts = new Map<number, Pt>();
  const H = (i: number, j: number) => (j * nx + i) * 2;
  const V = (i: number, j: number) => (j * nx + i) * 2 + 1;
  const point = (id: number): Pt => {
    let p = pts.get(id);
    if (p) return p;
    const cell = id >> 1;
    const i = cell % nx;
    const j = (cell - i) / nx;
    const a = val(i, j);
    if ((id & 1) === 0) {
      const b = val(i + 1, j);
      const t = Math.max(0, Math.min(1, (level - a) / (b - a)));
      p = { x: x0 + (i + t) * step, y: y0 + j * step };
    } else {
      const b = val(i, j + 1);
      const t = Math.max(0, Math.min(1, (level - a) / (b - a)));
      p = { x: x0 + i * step, y: y0 + (j + t) * step };
    }
    pts.set(id, p);
    return p;
  };
  const segs: number[] = []; // pairs of edge ids
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = val(i, j) >= level ? 1 : 0;
      const b = val(i + 1, j) >= level ? 2 : 0;
      const c = val(i + 1, j + 1) >= level ? 4 : 0;
      const d = val(i, j + 1) >= level ? 8 : 0;
      const cs = a | b | c | d;
      if (cs === 0 || cs === 15) continue;
      const T = H(i, j);
      const B = H(i, j + 1);
      const L = V(i, j);
      const R = V(i + 1, j);
      const centerIn = () => (val(i, j) + val(i + 1, j) + val(i + 1, j + 1) + val(i, j + 1)) / 4 >= level;
      switch (cs) {
        case 1: case 14: segs.push(T, L); break;
        case 2: case 13: segs.push(T, R); break;
        case 3: case 12: segs.push(L, R); break;
        case 4: case 11: segs.push(R, B); break;
        case 6: case 9: segs.push(T, B); break;
        case 7: case 8: segs.push(L, B); break;
        case 5:
          if (centerIn()) segs.push(T, R, L, B);
          else segs.push(T, L, R, B);
          break;
        case 10:
          if (centerIn()) segs.push(T, L, R, B);
          else segs.push(T, R, L, B);
          break;
      }
    }
  }
  const byEdge = new Map<number, number[]>();
  const nseg = segs.length / 2;
  for (let s = 0; s < nseg; s++) {
    for (const e of [segs[2 * s], segs[2 * s + 1]]) {
      const l = byEdge.get(e);
      if (l) l.push(s);
      else byEdge.set(e, [s]);
    }
  }
  const used = new Uint8Array(nseg);
  const loops: Pt[][] = [];
  for (let s0 = 0; s0 < nseg; s0++) {
    if (used[s0]) continue;
    used[s0] = 1;
    const startEdge = segs[2 * s0];
    let edge = segs[2 * s0 + 1];
    const loop: Pt[] = [point(startEdge), point(edge)];
    for (let guard = 0; guard < nseg + 2; guard++) {
      if (edge === startEdge) break;
      const next = (byEdge.get(edge) ?? []).find((s) => !used[s]);
      if (next === undefined) break;
      used[next] = 1;
      edge = segs[2 * next] === edge ? segs[2 * next + 1] : segs[2 * next];
      if (edge !== startEdge) loop.push(point(edge));
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

/** Drop points closer than `minDist` to the previously kept point. */
export function decimate(pts: Pt[], minDist: number): Pt[] {
  if (pts.length < 4) return pts;
  const out: Pt[] = [pts[0]];
  const m2 = minDist * minDist;
  for (let i = 1; i < pts.length; i++) {
    const l = out[out.length - 1];
    const dx = pts[i].x - l.x;
    const dy = pts[i].y - l.y;
    if (dx * dx + dy * dy >= m2) out.push(pts[i]);
  }
  return out.length >= 3 ? out : pts;
}

/** Smooth closed path through a polygon (vertices used as quadratic control points). */
export function smoothClosed(pts: Pt[]): string {
  const n = pts.length;
  if (n < 3) return '';
  const mid = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const m0 = mid(pts[n - 1], pts[0]);
  let d = `M${fmt(m0.x)},${fmt(m0.y)}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    d += `Q${fmt(p.x)},${fmt(p.y)} ${fmt(m.x)},${fmt(m.y)}`;
  }
  return d + 'Z';
}

/** Loop area (signed, shoelace). */
export function loopArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

/** Iso-line of a grid as one smooth SVG path (all loops, tiny specks dropped). */
export function isoPath(g: Grid, level: number, minArea = 12, minDist = 3.5): string {
  return contours(g, level)
    .filter((l) => Math.abs(loopArea(l)) >= minArea)
    .map((l) => smoothClosed(decimate(l, minDist)))
    .join('');
}

/** Smooth closed blob around (cx, cy) with radii rx/ry, `n` control points jittered by `wob`. */
export function blobPath(cx: number, cy: number, rx: number, ry: number, rand: () => number, n = 7, wob = 0.18, rot = 0): string {
  const pts: Pt[] = [];
  const phase = rand() * Math.PI * 2;
  for (let k = 0; k < n; k++) {
    const a = phase + (k / n) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const f = 1 + (rand() - 0.5) * 2 * wob;
    const x = Math.cos(a) * rx * f;
    const y = Math.sin(a) * ry * f;
    pts.push({ x: cx + x * Math.cos(rot) - y * Math.sin(rot), y: cy + x * Math.sin(rot) + y * Math.cos(rot) });
  }
  return smoothClosed(pts);
}

/** Polygon path (straight segments). */
export function polyPath(pts: Pt[], close = true): string {
  return `M${pts.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join('L')}${close ? 'Z' : ''}`;
}
