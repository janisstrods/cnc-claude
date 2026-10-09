// Hex helpers for the terrain painters. Works in board SVG coordinates and also for "virtual"
// off-board hexes (negative rows, column 13, ...), which painters use to run rivers and lakes
// under the frame.
import { COLS, ROWS, type TerrainType } from '../../engine/types';
import { BOARD_H, BOARD_MARGIN, BOARD_W, HEX_R, HEX_W, ROW_H } from '../geometry';

export interface Pt {
  x: number;
  y: number;
}
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Hex inradius (centre to edge midpoint). */
export const RI = HEX_W / 2;

/** Logical neighbour directions (as seen on an unflipped board): 0 E, 1 SE, 2 SW, 3 W, 4 NW, 5 NE. */
export type Dir = 0 | 1 | 2 | 3 | 4 | 5;
export const DIRS: Dir[] = [0, 1, 2, 3, 4, 5];

export const parity = (r: number) => ((r % 2) + 2) % 2;

export function neighborRC(r: number, c: number, d: Dir): [number, number] {
  const odd = parity(r) === 1;
  switch (d) {
    case 0:
      return [r, c + 1];
    case 3:
      return [r, c - 1];
    case 1:
      return [r + 1, odd ? c + 1 : c];
    case 2:
      return [r + 1, odd ? c : c - 1];
    case 4:
      return [r - 1, odd ? c : c - 1];
    case 5:
      return [r - 1, odd ? c + 1 : c];
  }
}

export function onBoard(r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < (parity(r) === 0 ? COLS : COLS - 1);
}

/** Centre of any (possibly off-board) hex in board coordinates. */
export function vCenter(r: number, c: number, flipped: boolean): Pt {
  const x = BOARD_MARGIN + HEX_W / 2 + c * HEX_W + (parity(r) === 1 ? HEX_W / 2 : 0);
  const y = BOARD_MARGIN + HEX_R + r * ROW_H;
  return flipped ? { x: BOARD_W - x, y: BOARD_H - y } : { x, y };
}

/** Offset coordinates of the hex containing board point (x, y) (may be off-board). */
export function pixelToRC(x: number, y: number, flipped: boolean): [number, number] {
  if (flipped) {
    x = BOARD_W - x;
    y = BOARD_H - y;
  }
  const px = x - (BOARD_MARGIN + HEX_W / 2);
  const py = y - (BOARD_MARGIN + HEX_R);
  const qf = ((Math.sqrt(3) / 3) * px - py / 3) / HEX_R;
  const rf = ((2 / 3) * py) / HEX_R;
  const sf = -qf - rf;
  let q = Math.round(qf);
  let rr = Math.round(rf);
  const s = Math.round(sf);
  const dq = Math.abs(q - qf);
  const dr = Math.abs(rr - rf);
  const ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -rr - s;
  else if (dr > ds) rr = -q - s;
  const col = q + (rr - (rr & 1)) / 2;
  return [rr, col];
}

/** Corner i (0 = top, clockwise, screen space) of a pointy-top hex. */
export function corner(p: Pt, i: number, r = HEX_R): Pt {
  const a = (Math.PI / 180) * (60 * i - 90);
  return { x: p.x + r * Math.cos(a), y: p.y + r * Math.sin(a) };
}

/** Distance from a hex centre to its boundary along screen angle `a` (radians). */
export function hexBoundaryDist(a: number): number {
  // Edge normals of a pointy-top hex are at 0, 60, 120, ... degrees; `off` is the angle between
  // the ray and the nearest edge normal (0..30 degrees).
  const sector = Math.PI / 3;
  const rel = (((a % sector) + sector) % sector) - sector / 2;
  const off = sector / 2 - Math.abs(rel);
  return RI / Math.cos(off);
}

export interface HexInfo {
  id: number;
  r: number;
  c: number;
  x: number;
  y: number;
  t: TerrainType;
  ford: boolean;
}

/** Everything a painter needs to know about the board it paints. */
export interface PaintCtx {
  flipped: boolean;
  hexes: HexInfo[];
  get(r: number, c: number): HexInfo | undefined;
  /** Centre of any hex (virtual ones included). */
  center(r: number, c: number): Pt;
  /** Terrain at a point; off-board points take the terrain of the nearest board hex. */
  terrainAt(x: number, y: number): TerrainType;
  /** Area painters may sample (whole board incl. frame). */
  bounds: Rect;
  /** Distance a feature extends past the playing area (rivers run under the frame). */
  ext: number;
  /** Optional fixed river ports for a lone river hex (icons). */
  lonePorts?: [Dir, Dir];
}

export function boardCtx(terrain: TerrainType[], fords: boolean[], flipped: boolean): PaintCtx {
  const hexes: HexInfo[] = [];
  const byId = new Map<number, HexInfo>();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!onBoard(r, c)) continue;
      const id = r * COLS + c;
      const p = vCenter(r, c, flipped);
      const t = terrain[id] ?? 'plain';
      const h: HexInfo = { id, r, c, x: p.x, y: p.y, t: t === 'void' ? 'plain' : t, ford: !!fords[id] };
      hexes.push(h);
      byId.set(id, h);
    }
  }
  const get = (r: number, c: number) => (onBoard(r, c) ? byId.get(r * COLS + c) : undefined);
  return {
    flipped,
    hexes,
    get,
    center: (r, c) => vCenter(r, c, flipped),
    terrainAt(x, y) {
      let [r, c] = pixelToRC(x, y, flipped);
      if (!onBoard(r, c)) {
        r = Math.max(0, Math.min(ROWS - 1, r));
        const maxC = parity(r) === 0 ? COLS - 1 : COLS - 2;
        c = Math.max(0, Math.min(maxC, c));
      }
      return byId.get(r * COLS + c)?.t ?? 'plain';
    },
    bounds: { x0: 0, y0: 0, x1: BOARD_W, y1: BOARD_H },
    ext: BOARD_MARGIN + 30,
  };
}

/** Context describing a single hex centred on (0, 0) (legend/tooltip icons). */
export function iconCtx(t: TerrainType, ford: boolean): PaintCtx {
  const o = vCenter(0, 0, false);
  const h: HexInfo = { id: 0, r: 0, c: 0, x: 0, y: 0, t, ford };
  const inHex = (x: number, y: number) => {
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    return ax <= RI && ax * 0.5 + ay * (Math.sqrt(3) / 2) <= RI;
  };
  return {
    flipped: false,
    hexes: [h],
    get: (r, c) => (r === 0 && c === 0 ? h : undefined),
    center: (r, c) => {
      const p = vCenter(r, c, false);
      return { x: p.x - o.x, y: p.y - o.y };
    },
    terrainAt: (x, y) => (inHex(x, y) ? t : 'plain'),
    bounds: { x0: -70, y0: -70, x1: 70, y1: 70 },
    ext: 20,
    lonePorts: [2, 5],
  };
}

/** Screen direction of the logical neighbour direction d. */
export function screenDir(d: Dir, flipped: boolean): Dir {
  return (flipped ? (d + 3) % 6 : d) as Dir;
}

/** The two screen-corner indices of the edge facing screen direction sd. */
export function edgeCorners(sd: Dir): [number, number] {
  return [(sd + 1) % 6, (sd + 2) % 6];
}

export const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

/** SVG path of the outer boundary of all hexes in ctx (the playing field outline). */
export function fieldOutline(ctx: PaintCtx): string {
  type E = { a: Pt; b: Pt; used: boolean };
  const edges: E[] = [];
  const key = (p: Pt) => `${Math.round(p.x * 2)},${Math.round(p.y * 2)}`;
  const at = new Map<string, E[]>();
  for (const h of ctx.hexes) {
    for (const d of DIRS) {
      const [nr, nc] = neighborRC(h.r, h.c, d);
      if (ctx.get(nr, nc)) continue;
      const [i, j] = edgeCorners(screenDir(d, ctx.flipped));
      const e: E = { a: corner(h, i), b: corner(h, j), used: false };
      edges.push(e);
      for (const p of [e.a, e.b]) {
        const k = key(p);
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
