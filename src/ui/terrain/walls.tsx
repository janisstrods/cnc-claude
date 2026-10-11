// City walls and towns (Expansion #3, rules-reference §18.7): the scalable city wall (`wall`: 308 Gergovia, 309 Ilerda),
// a stone curtain with towers that units stand on; the impassable wall of Rome (`steep` with art 'wall', 301), a taller
// tufa wall with a tower on every hex; walled towns (`steep` with art 'town', 303 Lauron, 304 Valentia), a circuit wall
// round tiled roofs; and the steep slopes of 308 (rule `steepSlopes`), a rock scarp along every hexside where a hill meets
// a forest. Walls join across neighbouring wall hexes (as the ditch's trench does), run on under the frame at a board
// edge and end in a tower elsewhere. Everything is seen from the board's lower edge and lit from the upper left, like the
// hills and the steep plateaus: the walls' front faces look down the screen on either orientation.
import { hexChains, type HexChain } from './chains';
import { DIRS, corner, edgeCorners, fmt, neighborRC, polyPath, screenDir, type HexInfo, type PaintCtx, type Pt } from './hexmath';
import { boulder } from './hills';
import { rng } from './noise';
import { P } from './palette';
import { add, dot, leftNormal, mitre, mul, sub, unit } from './vec';

/** Light from the upper left (as for the hills). */
const LIGHT = unit({ x: -0.6, y: -0.8 });

// ---------------------------------------------------------------------------------------------
// Wall drawing

interface WallLook {
  /** Width of the wall walk (the top, seen from above). */
  w: number;
  /** Height of the front face. */
  h: number;
  top: string;
  face: string;
  shade: string;
  dark: string;
  /** Merlons along the front of the walk: length and gap. */
  merlon: [number, number];
  /** Tower size: width and how far it stands above the wall walk. */
  tower: [number, number];
  /** Rows of masonry joints on the faces. */
  courses: number;
}

const SCALABLE: WallLook = {
  w: 14, h: 11, top: P.wallTop, face: P.wallFace, shade: P.wallShade, dark: P.wallDark, merlon: [3, 2.2], tower: [18, 8], courses: 2,
};
const ROME: WallLook = {
  w: 20, h: 19, top: P.tufa, face: P.tufaFace, shade: P.tufaShade, dark: P.wallDark, merlon: [3.6, 2.4], tower: [27, 11], courses: 4,
};
const TOWN: WallLook = {
  w: 7, h: 7, top: P.wallTop, face: P.wallFace, shade: P.wallShade, dark: P.wallDark, merlon: [2.2, 1.9], tower: [10, 5], courses: 1,
};

/** The polyline moved `o` to its left (screen space), with mitred joins; `closed` for a ring. */
function offsetLine(pts: Pt[], o: number, closed = false): Pt[] {
  const n = pts.length;
  const segN = (i: number) => leftNormal(pts[i], pts[(i + 1) % n]);
  return pts.map((p, i) => {
    let a: Pt | null = i > 0 ? segN(i - 1) : closed ? segN(n - 1) : null;
    let b: Pt | null = i < n - 1 || closed ? segN(i) : null;
    if (!a) a = b!;
    if (!b) b = a;
    return mitre(p, a, b, o);
  });
}

/** One face's fill by how its outward normal `n` faces the light (a face turned to the left catches it). */
function litShade(n: Pt, w: WallLook): string {
  return n.x < -0.35 ? w.top : n.x > 0.35 ? w.shade : w.face;
}

/**
 * A wall along `pts` (its walk centred on the line), raised `w.h` above the ground: the faces that look down the screen,
 * the walk, the merlons along its front, masonry joints. Returns the layers to stack (faces, walk, merlons).
 */
function wallLayers(pts: Pt[], w: WallLook, closed: boolean, R: () => number): { shadow: string; faces: JSX.Element[]; walk: string; walkEdge: string; merlons: string; joints: string } {
  const left = offsetLine(pts, w.w / 2, closed);
  const right = offsetLine(pts, -w.w / 2, closed);
  const n = pts.length;
  const segs = closed ? n : n - 1;
  const faces: JSX.Element[] = [];
  let joints = '';
  let merlons = '';
  const down = { x: 0, y: w.h };
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n;
    for (const [e1, e2] of [[left[i], left[j]], [right[j], right[i]]] as [Pt, Pt][]) {
      // the edge's outward normal: faces looking down the screen are seen
      const t = unit(sub(e2, e1));
      const out = { x: t.y, y: -t.x };
      const nn = dot(out, unit(sub(e1, pts[i]))) < 0 ? mul(out, -1) : out;
      if (nn.y < 0.12) continue;
      const quad = [e1, e2, add(e2, down), add(e1, down)];
      faces.push(<path key={`${i}-${faces.length}`} d={polyPath(quad)} fill={litShade(nn, w)} stroke={w.dark} strokeWidth={0.7} strokeLinejoin="round" />);
      // courses and staggered joints
      const len = Math.hypot(e2.x - e1.x, e2.y - e1.y);
      for (let c = 1; c <= w.courses; c++) {
        const y = (w.h * c) / (w.courses + 1);
        joints += polyPath([add(e1, { x: 0, y }), add(e2, { x: 0, y })], false);
      }
      for (let c = 0; c <= w.courses; c++) {
        const y0 = (w.h * c) / (w.courses + 1);
        const y1 = (w.h * (c + 1)) / (w.courses + 1);
        const step = 5 + R() * 1.5;
        for (let s = (c % 2 ? step / 2 : step) + R(); s < len - 1; s += step) {
          const p = add(e1, mul(t, s));
          joints += `M${fmt(p.x)},${fmt(p.y + y0)}L${fmt(p.x)},${fmt(p.y + y1)}`;
        }
      }
      // merlons on the front edge
      const [ml, mg] = w.merlon;
      for (let s = mg / 2; s < len - ml / 2; s += ml + mg) {
        const a = add(e1, mul(t, s));
        const b = add(e1, mul(t, Math.min(len, s + ml)));
        merlons += polyPath([a, b, add(b, { x: 0, y: -2.6 }), add(a, { x: 0, y: -2.6 })]);
      }
    }
  }
  const walk = closed
    ? polyPath(left) + polyPath([...right].reverse())
    : polyPath([...left, ...[...right].reverse()]);
  const walkEdge = polyPath(left, false) + polyPath(right, false);
  const shadow = closed ? '' : polyPath([...left, ...[...right].reverse()].map((p) => add(p, { x: 4, y: w.h + 4 })));
  return { shadow, faces, walk, walkEdge, merlons, joints };
}

/** A square tower standing `w.tower[1]` above the wall walk at `c`: front face down to the ground, top, merlons, a slit. */
function towerShape(c: Pt, w: WallLook, key: string | number, round = false): JSX.Element {
  const [s, up] = w.tower;
  const half = s / 2;
  const depth = s * 0.55;
  const topY = c.y - up - depth / 2;
  const frontY = topY + depth;
  const ground = c.y + w.h + w.w / 2;
  if (round) {
    // a round tower: a drum with a crenellated rim
    return (
      <g key={key} className="tower round">
        <ellipse cx={c.x + 4} cy={ground + 2} rx={half + 2} ry={depth / 2 + 1} fill="rgba(30,24,14,0.38)" />
        <path d={`M${fmt(c.x - half)},${fmt(frontY - depth / 2)}L${fmt(c.x - half)},${fmt(ground)}A${fmt(half)},${fmt(depth / 2)} 0 0 0 ${fmt(c.x + half)},${fmt(ground)}L${fmt(c.x + half)},${fmt(frontY - depth / 2)}Z`} fill={w.face} stroke={w.dark} strokeWidth={0.8} />
        <path d={`M${fmt(c.x + half * 0.25)},${fmt(frontY - depth / 2 + 2)}L${fmt(c.x + half * 0.25)},${fmt(ground + depth / 2 - 1)}A${fmt(half)},${fmt(depth / 2)} 0 0 0 ${fmt(c.x + half)},${fmt(ground)}L${fmt(c.x + half)},${fmt(frontY - depth / 2)}Z`} fill={w.shade} opacity={0.8} />
        <ellipse cx={c.x} cy={frontY - depth / 2} rx={half} ry={depth / 2} fill={w.top} stroke={w.dark} strokeWidth={0.8} />
        <ellipse cx={c.x} cy={frontY - depth / 2} rx={half - 2.4} ry={depth / 2 - 1.6} fill={w.shade} opacity={0.55} />
        <path d={Array.from({ length: 5 }, (_, k) => {
          const a = Math.PI * (0.12 + (k / 4) * 0.76);
          const x = c.x - Math.cos(a) * half * 0.92;
          const y = frontY - depth / 2 + Math.sin(a) * depth * 0.46;
          return `M${fmt(x - 1.3)},${fmt(y)}h2.6v-2.6h-2.6z`;
        }).join('')} fill={w.top} stroke={w.dark} strokeWidth={0.6} />
        <path d={`M${fmt(c.x - 0.8)},${fmt(frontY + 3)}v4`} stroke={w.dark} strokeWidth={1.4} strokeLinecap="round" />
      </g>
    );
  }
  const mer = Array.from({ length: 3 }, (_, k) => {
    const x = c.x - half + 0.6 + k * (s - 1.2) / 2.5;
    return `M${fmt(x)},${fmt(frontY)}h${fmt((s - 1.2) / 5)}v-2.8h${fmt(-(s - 1.2) / 5)}z`;
  }).join('');
  return (
    <g key={key} className="tower">
      <path d={`M${fmt(c.x - half + 4)},${fmt(ground + 1)}h${fmt(s + 2)}l-3,${fmt(-depth)}h${fmt(-s)}z`} fill="rgba(30,24,14,0.36)" />
      <path d={`M${fmt(c.x - half)},${fmt(frontY)}H${fmt(c.x + half)}V${fmt(ground)}H${fmt(c.x - half)}Z`} fill={w.face} stroke={w.dark} strokeWidth={0.8} />
      <path d={`M${fmt(c.x + half * 0.35)},${fmt(frontY)}H${fmt(c.x + half)}V${fmt(ground)}H${fmt(c.x + half * 0.35)}Z`} fill={w.shade} opacity={0.75} />
      <path d={`M${fmt(c.x - half)},${fmt(topY)}H${fmt(c.x + half)}V${fmt(frontY)}H${fmt(c.x - half)}Z`} fill={w.top} stroke={w.dark} strokeWidth={0.8} />
      <path d={`M${fmt(c.x - half + 2)},${fmt(topY + 2)}H${fmt(c.x + half - 2)}V${fmt(frontY - 1.5)}H${fmt(c.x - half + 2)}Z`} fill={w.shade} opacity={0.5} />
      <path d={mer} fill={w.top} stroke={w.dark} strokeWidth={0.6} />
      <path d={`M${fmt(c.x - 1)},${fmt(frontY + 3)}v${fmt(Math.max(3, (ground - frontY) * 0.35))}`} stroke={w.dark} strokeWidth={1.3} strokeLinecap="round" />
      <path d={`M${fmt(c.x - half)},${fmt(frontY + (ground - frontY) * 0.55)}H${fmt(c.x + half)}`} stroke={w.dark} strokeWidth={0.5} opacity={0.5} />
    </g>
  );
}

/** An arched gate in the front face of the wall at `c`. */
function gateShape(c: Pt, w: WallLook, key: string | number): JSX.Element {
  const ground = c.y + w.w / 2 + w.h;
  const gw = 4.2;
  const top = ground - w.h * 0.85;
  return (
    <g key={key} className="gate">
      <path d={`M${fmt(c.x - gw)},${fmt(ground)}V${fmt(top + gw)}A${fmt(gw)},${fmt(gw)} 0 0 1 ${fmt(c.x + gw)},${fmt(top + gw)}V${fmt(ground)}Z`} fill="#2a2016" stroke={w.dark} strokeWidth={0.7} />
      <path d={`M${fmt(c.x - gw - 1.2)},${fmt(top + gw)}A${fmt(gw + 1.2)},${fmt(gw + 1.2)} 0 0 1 ${fmt(c.x + gw + 1.2)},${fmt(top + gw)}`} fill="none" stroke={w.top} strokeWidth={1} />
    </g>
  );
}

/** The walls along `chains`: shadows, faces, walks and merlons, then towers and gates sorted down the screen. */
function paintWallChains(
  chains: HexChain[], w: WallLook, cls: string, seed: number, towersAt: (ch: HexChain) => { at: Pt; round?: boolean }[], gatesAt: (ch: HexChain) => Pt[],
  /** An earthen bank (agger) behind the wall and a ditch (fossa) before it (the Servian wall). */
  earthworks = false,
) {
  const R = rng(seed);
  let agger = '';
  let fossa = '';
  let shadow = '';
  let walk = '';
  let walkEdge = '';
  let merlons = '';
  let joints = '';
  const faces: JSX.Element[] = [];
  const towers: { y: number; el: JSX.Element }[] = [];
  chains.forEach((ch, ci) => {
    // the walk is drawn a little above the line, so the wall stands centred on its hexes
    const pts = ch.pts.map((p) => ({ x: p.x, y: p.y - w.h / 2 }));
    if (earthworks) {
      agger += polyPath(pts.map((p) => ({ x: p.x, y: p.y - w.w / 2 - 8 })), false);
      fossa += polyPath(pts.map((p) => ({ x: p.x, y: p.y + w.w / 2 + w.h + 11 })), false);
    }
    const l = wallLayers(pts, w, false, R);
    shadow += l.shadow;
    walk += l.walk;
    walkEdge += l.walkEdge;
    merlons += l.merlons;
    joints += l.joints;
    faces.push(<g key={ci}>{l.faces}</g>);
    for (const g of gatesAt(ch)) towers.push({ y: g.y - 0.01, el: gateShape({ x: g.x, y: g.y - w.h / 2 }, w, `g${ci}-${fmt(g.x)}`) });
    for (const t of towersAt(ch)) towers.push({ y: t.at.y, el: towerShape({ x: t.at.x, y: t.at.y - w.h / 2 }, w, `t${ci}-${fmt(t.at.x)}-${fmt(t.at.y)}`, t.round) });
  });
  const round = { fill: 'none', strokeLinejoin: 'round', strokeLinecap: 'butt' } as const;
  return (
    <g className={cls}>
      {earthworks && (
        <>
          <path d={agger} {...round} stroke="rgba(40,32,18,0.3)" strokeWidth={22} transform="translate(1.5 3)" />
          <path d={agger} {...round} stroke={P.earthShade} strokeWidth={20} />
          <path d={agger} {...round} stroke={P.earth} strokeWidth={15} transform="translate(-0.6 -2)" />
          <path d={agger} {...round} stroke={P.earthLight} strokeWidth={5} opacity={0.8} transform="translate(-1 -7)" />
          <path d={fossa} {...round} stroke={P.earthLight} strokeWidth={15} opacity={0.9} />
          <path d={fossa} {...round} stroke={P.earthShade} strokeWidth={12} />
          <path d={fossa} {...round} stroke={P.ditch} strokeWidth={8} transform="translate(-0.6 -1.4)" />
          <path d={fossa} {...round} stroke="#3e301b" strokeWidth={3} transform="translate(-0.4 -1)" />
        </>
      )}
      <path d={shadow} fill="rgba(30,24,14,0.3)" />
      {faces}
      <path d={joints} fill="none" stroke={w.dark} strokeWidth={0.5} opacity={0.45} />
      <path d={walk} fill={w.top} stroke={w.dark} strokeWidth={0.8} strokeLinejoin="round" />
      <path d={walkEdge} fill="none" stroke="#fff8e4" strokeWidth={0.7} opacity={0.4} transform="translate(-0.4 -0.6)" />
      <path d={merlons} fill={w.top} stroke={w.dark} strokeWidth={0.6} strokeLinejoin="round" />
      {towers.sort((a, b) => a.y - b.y).map((t) => t.el)}
    </g>
  );
}

/** Midpoints of the joins between consecutive hexes of a chain (on their shared hexside). */
const joins = (ch: HexChain): Pt[] => ch.hexes.slice(1).map((h, k) => ({ x: (h.x + ch.hexes[k].x) / 2, y: (h.y + ch.hexes[k].y) / 2 }));
/** The chain's free ends inside the board (towers stand there). */
const freeEnds = (ch: HexChain): Pt[] => [...(ch.openStart ? [] : [ch.pts[0]]), ...(ch.openEnd ? [] : [ch.pts[ch.pts.length - 1]])];

/**
 * The scalable city walls (`wall` hexes): a limestone curtain with merlons through every wall hex, a tower on each join
 * between two wall hexes and at every free end, a gate in the middle hex of a run of three or more. Painted after the
 * hills, so a wall with a hill under it stands on the hill. `openEdges: false` (icons): no wall runs off under a frame.
 */
export function paintCityWalls(ctx: PaintCtx, openEdges = true): JSX.Element | null {
  const chains = hexChains(ctx, (h) => h.t === 'wall', 30, { openEdges });
  if (!chains.length) return null;
  return paintWallChains(
    chains, SCALABLE, 'city-walls', 3081,
    (ch) => [...joins(ch), ...freeEnds(ch)].map((at) => ({ at })),
    (ch) => (ch.hexes.length >= 3 ? [ch.hexes[Math.floor(ch.hexes.length / 2)]] : []),
  );
}

/**
 * The impassable city wall (`steep` hexes with art 'wall', 301 the Wall of Rome): a taller and thicker tufa wall with a
 * square tower on every hex, and a round gate tower at each free end (on either side of the gate between two runs), the
 * earthen agger heaped behind it and the fossa dug before it, so the fortification fills its hexes.
 */
export function paintRomeWalls(ctx: PaintCtx, openEdges = true): JSX.Element | null {
  const chains = hexChains(ctx, (h) => h.art === 'wall', 34, { openEdges });
  if (!chains.length) return null;
  return paintWallChains(
    chains, ROME, 'impassable-walls', 3011,
    (ch) => [
      ...ch.hexes.filter((h) => !freeEnds(ch).some((e) => Math.hypot(e.x - h.x, e.y - h.y) < 40)).map((at) => ({ at })),
      ...freeEnds(ch).map((at) => ({ at, round: true })),
    ],
    () => [],
    true,
  );
}

// ---------------------------------------------------------------------------------------------
// Towns

/** The outline loops of a set of hexes (every hexside whose neighbour is not in the set), as point lists. */
function areaLoops(ctx: PaintCtx, hexes: HexInfo[]): Pt[][] {
  const set = new Set(hexes.map((h) => h.id));
  type E = { a: Pt; b: Pt; used: boolean };
  const edges: E[] = [];
  const key = (p: Pt) => `${Math.round(p.x * 2)},${Math.round(p.y * 2)}`;
  const at = new Map<string, E[]>();
  for (const h of hexes) {
    for (const d of DIRS) {
      const [nr, nc] = neighborRC(h.r, h.c, d);
      const n = ctx.get(nr, nc);
      if (n && set.has(n.id)) continue;
      const [i, j] = edgeCorners(screenDir(d, ctx.flipped));
      const e: E = { a: corner(h, i), b: corner(h, j), used: false };
      edges.push(e);
      for (const q of [e.a, e.b]) {
        const k = key(q);
        const l = at.get(k);
        if (l) l.push(e);
        else at.set(k, [e]);
      }
    }
  }
  const loops: Pt[][] = [];
  for (const start of edges) {
    if (start.used) continue;
    start.used = true;
    const pts: Pt[] = [start.a];
    let cur = start.b;
    for (;;) {
      pts.push(cur);
      const next = (at.get(key(cur)) ?? []).find((e) => !e.used);
      if (!next) break;
      next.used = true;
      cur = key(next.a) === key(cur) ? next.b : next.a;
    }
    if (key(pts[pts.length - 1]) === key(pts[0])) pts.pop();
    loops.push(pts);
  }
  return loops;
}

/** Signed area (positive: clockwise on screen, y down). */
const area = (pts: Pt[]) => pts.reduce((s, p, i) => {
  const q = pts[(i + 1) % pts.length];
  return s + (p.x * q.y - q.x * p.y);
}, 0) / 2;

/** Is `p` inside the polygon `poly` (even-odd)? */
function insidePoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Connected groups of hexes matching `is`. */
function groups(ctx: PaintCtx, is: (h: HexInfo) => boolean): HexInfo[][] {
  const own = ctx.hexes.filter(is);
  const seen = new Set<number>();
  const out: HexInfo[][] = [];
  for (const h of own) {
    if (seen.has(h.id)) continue;
    const g: HexInfo[] = [];
    const stack = [h];
    seen.add(h.id);
    while (stack.length) {
      const x = stack.pop()!;
      g.push(x);
      for (const d of DIRS) {
        const [r, c] = neighborRC(x.r, x.c, d);
        const n = ctx.get(r, c);
        if (n && is(n) && !seen.has(n.id)) {
          seen.add(n.id);
          stack.push(n);
        }
      }
    }
    out.push(g);
  }
  return out;
}

/** A house seen from the board's lower edge: plastered front, a tiled roof (ridge left to right, lit half and shaded half). */
function house(c: Pt, wdt: number, dep: number, ht: number, R: () => number): { front: string; side: string; roofLit: string; roofShade: string; door: string; sh: string } {
  const x0 = c.x - wdt / 2;
  const x1 = c.x + wdt / 2;
  const yb = c.y + dep / 2;
  const yt = yb - ht;
  const ridge = yt - dep * 0.55;
  const back = yt - dep * 0.25;
  return {
    sh: polyPath([{ x: x0 + 2, y: yb + 1 }, { x: x1 + 4, y: yb + 1 }, { x: x1 + 4, y: yb - dep * 0.6 }, { x: x0 + 6, y: yb - dep * 0.6 }]),
    front: polyPath([{ x: x0, y: yb }, { x: x1, y: yb }, { x: x1, y: yt }, { x: x0, y: yt }]),
    side: polyPath([{ x: x1 - wdt * 0.18, y: yb }, { x: x1, y: yb }, { x: x1, y: yt }, { x: x1 - wdt * 0.18, y: yt }]),
    roofShade: polyPath([{ x: x0 - 1, y: yt + 0.6 }, { x: x1 + 1, y: yt + 0.6 }, { x: x1 - 1, y: ridge }, { x: x0 + 1, y: ridge }]),
    roofLit: polyPath([{ x: x0 + 1, y: ridge }, { x: x1 - 1, y: ridge }, { x: x1 - 2, y: back - 2 }, { x: x0 + 2, y: back - 2 }]),
    door: R() < 0.6 ? `M${fmt(x0 + wdt * (0.25 + R() * 0.4))},${fmt(yb)}v${fmt(-ht * 0.55)}` : '',
  };
}

/**
 * Walled towns (`steep` hexes with art 'town', 303 Lauron, 304 Valentia): streets and tiled houses inside a low circuit
 * wall that follows the town's hexes a few pixels in, with a tower on every corner of the circuit. Impassable: the
 * houses fill the hexes edge to edge.
 */
export function paintTowns(ctx: PaintCtx): JSX.Element | null {
  const towns = groups(ctx, (h) => h.art === 'town');
  if (!towns.length) return null;
  return (
    <g className="towns">
      {towns.map((town, ti) => {
        const R = rng(3031 + town[0].id * 7);
        const loops = areaLoops(ctx, town).map((l) => {
          // inset into the town (the loop's left is outside for a clockwise loop)
          const cw = area(l) > 0;
          return offsetLine(l, cw ? -9 : 9, true);
        });
        const ground = loops.map((l) => polyPath(offsetLine(l, area(l) > 0 ? 6 : -6, true))).join('');
        // houses on a jittered grid inside the circuit, drawn back to front
        const houses: ReturnType<typeof house>[] = [];
        const spots: { c: Pt; w: number; d: number; h: number; temple?: boolean }[] = [];
        town.forEach((h, k) => {
          // a block of houses every 10 px down and 13 px across, staggered, a few lanes left open
          for (let dy = -30; dy <= 32; dy += 10) {
            const row = Math.round((dy + 30) / 10);
            for (let dx = -36 + (row % 2 ? 6.5 : 0); dx <= 36; dx += 13) {
              if (R() < 0.12) continue;
              spots.push({ c: { x: h.x + dx + (R() - 0.5) * 2.5, y: h.y + dy + (R() - 0.5) * 2 }, w: 9 + R() * 4, d: 6 + R() * 2, h: 4 + R() * 2.5 });
            }
          }
          // a temple in the first hex of the town
          if (k === 0) spots.push({ c: { x: h.x + 2, y: h.y - 2 }, w: 20, d: 12, h: 9, temple: true });
        });
        // the temple replaces the houses it stands on; every house stays inside the circuit wall
        const temple = spots.find((s) => s.temple)!;
        const inner = loops.map((l) => offsetLine(l, area(l) > 0 ? -3 : 3, true));
        const inside = (p: Pt) => inner.some((l) => insidePoly(p, l));
        const fits = (s: (typeof spots)[number]) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([a, b]) => inside({ x: s.c.x + (a * s.w) / 2, y: s.c.y + b * (s.d / 2 + (b < 0 ? s.h : 0)) }));
        const kept = spots.filter((s) => s.temple || (Math.abs(s.c.x - temple.c.x) > 15 || Math.abs(s.c.y - temple.c.y) > 11) && fits(s));
        kept.sort((a, b) => a.c.y - b.c.y);
        for (const s of kept) houses.push(house(s.c, s.w, s.d, s.h, R));
        const wall = loops.map((l) => {
          const towers = l.filter((_, i) => i % 2 === 0);
          return { l, towers };
        });
        const layers = loops.map((l) => wallLayers(l, TOWN, true, R));
        return (
          <g key={ti}>
            <path d={ground} fill={P.street} />
            <path d={ground} fill="none" stroke={P.wallShade} strokeWidth={1} opacity={0.5} />
            {kept.map((s, k) => {
              const hs = houses[k];
              if (s.temple) {
                const x0 = s.c.x - s.w / 2;
                const yb = s.c.y + s.d / 2;
                return (
                  <g key={k}>
                    <path d={hs.sh} fill="rgba(30,24,14,0.3)" />
                    <path d={`M${fmt(x0 - 1.5)},${fmt(yb + 1.5)}h${fmt(s.w + 3)}v-2h${fmt(-(s.w + 3))}z`} fill={P.plaster} stroke={P.wallDark} strokeWidth={0.6} />
                    <path d={Array.from({ length: 6 }, (_, c) => `M${fmt(x0 + 1.4 + c * ((s.w - 2.8) / 5))},${fmt(yb - 0.5)}v${fmt(-s.h)}`).join('')} stroke={P.plaster} strokeWidth={1.6} />
                    <path d={Array.from({ length: 6 }, (_, c) => `M${fmt(x0 + 2.1 + c * ((s.w - 2.8) / 5))},${fmt(yb - 0.5)}v${fmt(-s.h)}`).join('')} stroke={P.plasterShade} strokeWidth={0.6} />
                    <path d={`M${fmt(x0 - 1)},${fmt(yb - s.h - 0.5)}h${fmt(s.w + 2)}l${fmt(-s.w / 2 - 1)},${fmt(-5)}z`} fill={P.roofLight} stroke={P.wallDark} strokeWidth={0.6} />
                    <path d={`M${fmt(x0 - 1)},${fmt(yb - s.h - 0.5)}h${fmt(s.w + 2)}v1.6h${fmt(-(s.w + 2))}z`} fill={P.plaster} stroke={P.wallDark} strokeWidth={0.5} />
                  </g>
                );
              }
              return (
                <g key={k}>
                  <path d={hs.sh} fill="rgba(30,24,14,0.28)" />
                  <path d={hs.front} fill={P.plaster} stroke={P.wallDark} strokeWidth={0.6} />
                  <path d={hs.side} fill={P.plasterShade} />
                  {hs.door && <path d={hs.door} stroke="#5a4428" strokeWidth={1.6} />}
                  <path d={hs.roofShade} fill={P.roofShade} stroke={P.wallDark} strokeWidth={0.6} strokeLinejoin="round" />
                  <path d={hs.roofLit} fill={P.roof} stroke={P.wallDark} strokeWidth={0.6} strokeLinejoin="round" />
                  <path d={hs.roofLit} fill="none" stroke={P.roofLight} strokeWidth={0.6} opacity={0.8} transform="translate(-0.3 -0.4)" />
                </g>
              );
            })}
            {layers.map((l, k) => (
              <g key={`w${k}`}>
                {l.faces}
                <path d={l.joints} fill="none" stroke={TOWN.dark} strokeWidth={0.45} opacity={0.4} />
                <path d={l.walk} fill={TOWN.top} fillRule="evenodd" stroke={TOWN.dark} strokeWidth={0.7} />
                <path d={l.merlons} fill={TOWN.top} stroke={TOWN.dark} strokeWidth={0.5} />
              </g>
            ))}
            {wall.flatMap(({ towers }) => towers).sort((a, b) => a.y - b.y).map((t, k) => towerShape({ x: t.x, y: t.y - TOWN.h }, TOWN, k))}
          </g>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// Steep slopes (308)

/**
 * The steep slopes of 308 (rule `steepSlopes`): along every hexside between a hill (or a hill under a camp or wall) and a
 * forest, a rock scarp on the hill's side: a broken crest line, a cliff face dropping to the forest edge, cut by clefts,
 * its foot in shadow, boulders fallen at the foot and lying on the crest.
 */
export function paintSteepSlopes(ctx: PaintCtx): JSX.Element | null {
  const isHill = (h: HexInfo | undefined) => !!h && (h.t === 'hill' || !!h.hillUnder);
  const R = rng(3088);
  const faces: JSX.Element[] = [];
  let crest = '';
  let crestLit = '';
  let clefts = '';
  let drop = '';
  const bould: { body: string; top: string }[] = [];
  for (const h of ctx.hexes) {
    if (!isHill(h)) continue;
    for (const d of DIRS) {
      const [r, c] = neighborRC(h.r, h.c, d);
      const n = ctx.get(r, c);
      if (!n || n.t !== 'forest' || isHill(n)) continue;
      const [i, j] = edgeCorners(screenDir(d, ctx.flipped));
      const A = corner(h, i);
      const B = corner(h, j);
      const t = unit(sub(B, A));
      const inward = unit(sub(h, add(A, mul(sub(B, A), 0.5))));
      const outward = mul(inward, -1);
      const at = (s: number, o: number) => add(add(A, mul(t, s)), mul(inward, o));
      const len = Math.hypot(B.x - A.x, B.y - A.y);
      // the crest, broken and uneven, about 11 px in from the hexside; the foot along it, a little ragged
      const top: Pt[] = [];
      const m = 12;
      for (let k = 0; k <= m; k++) top.push(at(1 + ((len - 2) * k) / m, 10 + (R() - 0.5) * 4.5 - (k === 0 || k === m ? 3 : 0)));
      const foot: Pt[] = [];
      for (let k = m; k >= 0; k--) foot.push(at(1 + ((len - 2) * k) / m, 1.4 + R() * 1.4));
      const lit = dot(outward, LIGHT);
      const fill = lit > 0.3 ? P.rockMid : lit < -0.3 ? P.rockDark : P.rock;
      faces.push(<path key={`${h.id}-${d}`} className="scarp" d={polyPath([...top, ...foot])} fill={fill} stroke={P.rockDark} strokeWidth={0.8} strokeLinejoin="round" />);
      crest += polyPath(top, false);
      crestLit += polyPath(top.map((p) => add(p, mul(inward, 1.3))), false);
      drop += polyPath([at(-1, -1.6), at(len + 1, -1.6)], false);
      for (let k = 1; k < m; k += 1 + Math.floor(R() * 2)) {
        const p = top[k];
        const q = add(add(p, mul(outward, 4 + R() * 4)), mul(t, (R() - 0.5) * 2.5));
        clefts += `M${fmt(p.x)},${fmt(p.y)}L${fmt(q.x)},${fmt(q.y)}`;
      }
      for (let k = 0; k < 2; k++) bould.push(boulder(at(6 + R() * (len - 12), -3 - R() * 3), 1.8 + R() * 1.6, R));
      if (R() < 0.7) bould.push(boulder(at(8 + R() * (len - 16), 13 + R() * 3), 1.6 + R() * 1.2, R));
    }
  }
  if (!faces.length) return null;
  return (
    <g className="steep-slopes">
      <path d={drop} fill="none" stroke="rgba(28,24,12,0.45)" strokeWidth={4} strokeLinecap="round" />
      {faces}
      <path d={clefts} fill="none" stroke={P.rockDark} strokeWidth={1} strokeLinecap="round" opacity={0.85} />
      <path d={crest} fill="none" stroke={P.rockDark} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <path d={crestLit} fill="none" stroke={P.rockLight} strokeWidth={1.1} strokeLinejoin="round" strokeLinecap="round" opacity={0.75} />
      {bould.map((b, k) => (
        <g key={k}>
          <path d={b.body} fill={P.rock} stroke={P.rockDark} strokeWidth={0.6} />
          <path d={b.top} fill={P.rockLight} />
        </g>
      ))}
    </g>
  );
}
