// Chains of neighbouring hexes, for the features that run on from hex to hex as one line: the ditch's trench (ditch.tsx)
// and the city walls (walls.tsx).
import { DIRS, neighborRC, type Dir, type HexInfo, type PaintCtx, type Pt } from './hexmath';
import { add, dot, mul, sub, unit } from './vec';

/** A run of joined hexes: its key points, the hexes, and where it ends (a tower inside the board, or under the frame). */
export interface HexChain {
  pts: Pt[];
  hexes: HexInfo[];
  /** The line reaches the board edge at its start / end and runs on under the frame there (a wall: no tower). */
  openStart: boolean;
  openEnd: boolean;
}

export interface HexChainOpts {
  /** A free end at the board edge runs on under the frame (boards; default) instead of stopping (icons). */
  openEdges?: boolean;
  /**
   * Among links of the same kind (along a row, or diagonal), join the busier hexes first (those with more neighbours in
   * the set), so a spur joins the main line rather than its end (the ditch's trench).
   */
  busy?: boolean;
}

/**
 * Runs of neighbouring hexes matching `is`, joined along a spanning tree (rows first, so a row is one straight line and a
 * clump never closes a triangle). A free end heads on under the frame when the board ends that way, else it stops `stub`
 * past the centre of its last hex; a lone hex runs across along the board's rows.
 */
export function hexChains(ctx: PaintCtx, is: (h: HexInfo) => boolean, stub: number, { openEdges = true, busy = false }: HexChainOpts = {}): HexChain[] {
  const own = ctx.hexes.filter(is);
  const nb = (h: HexInfo, d: Dir) => {
    const [r, c] = neighborRC(h.r, h.c, d);
    return ctx.get(r, c);
  };
  const links = new Map<number, HexInfo[]>(own.map((h) => [h.id, []]));
  const root = new Map<number, number>(own.map((h) => [h.id, h.id]));
  const find = (id: number): number => {
    let r = id;
    while (root.get(r) !== r) r = root.get(r)!;
    return r;
  };
  const around = (h: HexInfo) => DIRS.filter((d) => {
    const n = nb(h, d);
    return !!n && is(n);
  }).length;
  const pairs: [HexInfo, HexInfo, number][] = [];
  for (const h of own) {
    for (const d of DIRS) {
      const n = nb(h, d);
      if (n && is(n) && h.id < n.id) pairs.push([h, n, (n.r === h.r ? 0 : 100) - (busy ? around(h) + around(n) : 0)]);
    }
  }
  pairs.sort((a, b) => a[2] - b[2]);
  for (const [a, b] of pairs) {
    const ra = find(a.id);
    const rb = find(b.id);
    if (ra === rb) continue;
    root.set(ra, rb);
    links.get(a.id)!.push(b);
    links.get(b.id)!.push(a);
  }
  const deg = (h: HexInfo) => links.get(h.id)!.length;
  const used = new Set<string>();
  const ek = (a: HexInfo, b: HexInfo) => (a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`);
  /** The end of a chain at hex h heading along u: [point, runs off the board]. */
  const endPoint = (h: HexInfo, u: Pt): [Pt, boolean] => {
    for (const d of DIRS) {
      const [r, c] = neighborRC(h.r, h.c, d);
      if (!openEdges || ctx.get(r, c)) continue;
      if (dot(u, unit(sub(ctx.center(r, c), h))) > 0.8) return [add(h, mul(u, 60 + ctx.ext)), true];
    }
    return [add(h, mul(u, stub)), false];
  };
  const walk = (start: HexInfo, first: HexInfo): HexInfo[] => {
    const run = [start];
    let prev = start;
    let cur = first;
    used.add(ek(start, first));
    for (;;) {
      run.push(cur);
      if (deg(cur) !== 2) break;
      const next = links.get(cur.id)!.find((n) => n !== prev && !used.has(ek(cur, n)));
      if (!next) break;
      used.add(ek(cur, next));
      prev = cur;
      cur = next;
    }
    return run;
  };
  const runs: HexInfo[][] = [];
  for (const h of own) {
    if (deg(h) === 0) runs.push([h]);
    else if (deg(h) !== 2) for (const n of links.get(h.id)!) if (!used.has(ek(h, n))) runs.push(walk(h, n));
  }
  // a closed ring of hexes (every hex with two links): start anywhere
  for (const h of own) if (deg(h) === 2 && links.get(h.id)!.some((n) => !used.has(ek(h, n)))) runs.push(walk(h, links.get(h.id)!.find((n) => !used.has(ek(h, n)))!));

  return runs.map((run) => {
    const pts: Pt[] = run.map((h) => ({ x: h.x, y: h.y }));
    const a = run[0];
    const b = run[run.length - 1];
    if (run.length === 1) {
      const e = unit(sub(ctx.center(a.r, a.c + 1), a));
      const [p0, o0] = endPoint(a, mul(e, -1));
      const [p1, o1] = endPoint(a, e);
      return { pts: [p0, pts[0], p1], hexes: run, openStart: o0, openEnd: o1 };
    }
    let openStart = false;
    let openEnd = false;
    if (deg(a) === 1) {
      const [p, o] = endPoint(a, unit(sub(a, run[1])));
      pts.unshift(p);
      openStart = o;
    }
    if (deg(b) === 1 && b !== a) {
      const [p, o] = endPoint(b, unit(sub(b, run[run.length - 2])));
      pts.push(p);
      openEnd = o;
    }
    return { pts, hexes: run, openStart, openEnd };
  });
}
