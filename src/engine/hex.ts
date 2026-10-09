// Hex grid math for the 13x9 "odd-r" offset board (odd rows shifted right by half a hex).
import { COLS, OFF_BOARD, ROWS, type HexDir, type HexId, type SectionName, type Side } from './types';

export const NUM_HEXES = ROWS * COLS;

export function hexId(r: number, c: number): HexId {
  return r * COLS + c;
}
export function rowOf(h: HexId): number {
  return Math.floor(h / COLS);
}
export function colOf(h: HexId): number {
  return h % COLS;
}
export function onBoard(r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < (r % 2 === 0 ? COLS : COLS - 1);
}
export function isValidHex(h: HexId): boolean {
  return h >= 0 && h < NUM_HEXES && onBoard(rowOf(h), colOf(h));
}

/** All valid hex ids on the board. */
export const ALL_HEXES: HexId[] = (() => {
  const out: HexId[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (onBoard(r, c)) out.push(hexId(r, c));
  return out;
})();

// Direction offsets (dr, dc) for even and odd rows, in order: E, NE, NW, W, SW, SE.
const EVEN_DIRS: [number, number][] = [[0, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]];
const ODD_DIRS: [number, number][] = [[0, 1], [-1, 1], [-1, 0], [0, -1], [1, 0], [1, 1]];

/** Direction names by index (the order of the offsets above; rampart edges and masks use these indices). */
export const HEX_DIRS: readonly HexDir[] = ['E', 'NE', 'NW', 'W', 'SW', 'SE'];

const NEIGHBOURS: HexId[][] = [];
for (let h = 0; h < NUM_HEXES; h++) {
  const r = rowOf(h);
  const c = colOf(h);
  const out: HexId[] = [];
  if (onBoard(r, c)) {
    for (const [dr, dc] of r % 2 === 0 ? EVEN_DIRS : ODD_DIRS) {
      if (onBoard(r + dr, c + dc)) out.push(hexId(r + dr, c + dc));
    }
  }
  NEIGHBOURS.push(out);
}

export function neighbours(h: HexId): HexId[] {
  return NEIGHBOURS[h] ?? [];
}

export function areAdjacent(a: HexId, b: HexId): boolean {
  return NEIGHBOURS[a]?.includes(b) ?? false;
}

/** Direction index (0..5 = E, NE, NW, W, SW, SE) from `from` to its neighbour `to`; -1 if they are not adjacent. */
export function directionTo(from: HexId, to: HexId): number {
  const r = rowOf(from);
  const c = colOf(from);
  const dirs = r % 2 === 0 ? EVEN_DIRS : ODD_DIRS;
  for (let i = 0; i < 6; i++) {
    const [dr, dc] = dirs[i];
    if (onBoard(r + dr, c + dc) && hexId(r + dr, c + dc) === to) return i;
  }
  return -1;
}

/** Cube coordinates. */
export function toCube(h: HexId): [number, number, number] {
  const r = rowOf(h);
  const c = colOf(h);
  const x = c - (r - (r & 1)) / 2;
  const z = r;
  return [x, -x - z, z];
}

export function distance(a: HexId, b: HexId): number {
  const [ax, ay, az] = toCube(a);
  const [bx, by, bz] = toCube(b);
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
}

function cubeRound(x: number, y: number, z: number): HexId {
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  const dx = Math.abs(rx - x);
  const dy = Math.abs(ry - y);
  const dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  const r = rz;
  const c = rx + (r - (r & 1)) / 2;
  return onBoard(r, c) ? hexId(r, c) : OFF_BOARD;
}

const lineCache = new Map<number, [HexId[], HexId[]]>();

/**
 * Hexes strictly between a and b along the centre line, computed twice with tiny opposite nudges.
 * When the line runs along hexsides the two lists differ (one per side of the line).
 */
export function lineBetween(a: HexId, b: HexId): [HexId[], HexId[]] {
  const key = a * 1000 + b;
  const cached = lineCache.get(key);
  if (cached) return cached;
  const n = distance(a, b);
  const [ax, ay, az] = toCube(a);
  const [bx, by, bz] = toCube(b);
  const plus: HexId[] = [];
  const minus: HexId[] = [];
  const e = [1e-6, 2e-6, -3e-6];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    plus.push(cubeRound(ax + (bx - ax) * t + e[0], ay + (by - ay) * t + e[1], az + (bz - az) * t + e[2]));
    minus.push(cubeRound(ax + (bx - ax) * t - e[0], ay + (by - ay) * t - e[1], az + (bz - az) * t - e[2]));
  }
  const res: [HexId[], HexId[]] = [plus, minus];
  lineCache.set(key, res);
  return res;
}

/**
 * The hexside(s) of `target` that the centre-to-centre line towards `other` passes through, as direction indices
 * (0..5 = E, NE, NW, W, SW, SE): the side facing `other`, or both sides meeting at a corner when the line passes exactly
 * through that corner (a line running along hexsides, §8). For a neighbour it is the shared side. Empty for the same hex.
 */
export function sidesCrossed(target: HexId, other: HexId): number[] {
  if (target === other) return [];
  const [tx, , tz] = toCube(target);
  const [ox, , oz] = toCube(other);
  const dx = ox - tx;
  const dz = oz - tz;
  // Board direction with y pointing up the board (row 0 at the top); side i faces 60*i degrees, corners lie in between.
  const deg = (Math.atan2(-1.5 * dz, Math.sqrt(3) * (dx + dz / 2)) * 180) / Math.PI;
  const t = (((deg / 60) % 6) + 6) % 6;
  const lo = Math.floor(t);
  if (Math.abs(t - lo - 0.5) < 1e-9) return [lo % 6, (lo + 1) % 6];
  return [Math.round(t) % 6];
}

/** Line of sight given a predicate telling whether an intermediate hex blocks. */
export function hasLineOfSight(a: HexId, b: HexId, blocks: (h: HexId) => boolean): boolean {
  if (distance(a, b) <= 1) return true;
  const [plus, minus] = lineBetween(a, b);
  const plusBlocked = plus.some((h) => h === OFF_BOARD || blocks(h));
  if (!plusBlocked) return true;
  const minusBlocked = minus.some((h) => h === OFF_BOARD || blocks(h));
  return !minusBlocked;
}

/** Half-column index 0..24 used for sections. */
export function halfCol(h: HexId): number {
  return 2 * colOf(h) + (rowOf(h) % 2);
}

/** Sections a hex belongs to, from the given side's point of view (dotted-line hexes belong to two). */
export function sectionsOf(h: HexId, side: Side): SectionName[] {
  const x2 = halfCol(h);
  const out: SectionName[] = [];
  // bottom player's view
  const left = x2 <= 8;
  const center = x2 >= 8 && x2 <= 16;
  const right = x2 >= 16;
  if (side === 'bottom') {
    if (left) out.push('left');
    if (center) out.push('center');
    if (right) out.push('right');
  } else {
    if (right) out.push('left');
    if (center) out.push('center');
    if (left) out.push('right');
  }
  return out;
}

export function inSection(h: HexId, side: Side, s: SectionName): boolean {
  return sectionsOf(h, side).includes(s);
}

/** Row of a side's own baseline. */
export function baselineRow(side: Side): number {
  return side === 'top' ? 0 : ROWS - 1;
}

/** The (up to two) hexes adjacent to h that are one row closer to `side`'s own baseline. */
export function rearHexes(h: HexId, side: Side): HexId[] {
  const r = rowOf(h);
  const dr = side === 'top' ? -1 : 1;
  return neighbours(h).filter((n) => rowOf(n) === r + dr);
}

/** True if a step from h toward side's baseline would leave the board (h on the baseline row). */
export function onBaseline(h: HexId, side: Side): boolean {
  return rowOf(h) === baselineRow(side);
}

export function hexLabel(h: HexId): string {
  return `${rowOf(h)},${colOf(h)}`;
}
