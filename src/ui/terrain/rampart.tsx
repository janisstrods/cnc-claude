// Ramparts (rules-reference §16): an earthwork along each protected hexside of a rampart hex - a ditch on the outside,
// a shaded earth bank, and a crenellated wooden breastwork on its crest with stakes on the outer slope. The walls of
// neighbouring rampart hexes join into one line; elsewhere a wall turns back in a short return, and at the board edge
// it runs on under the frame. Everything sits within a few pixels of the hexside so the units on the hex stay clear.
import { HEX_R } from '../geometry';
import { polyPath } from './field';
import { corner, fmt, neighborRC, screenDir, type Dir, type HexInfo, type PaintCtx, type Pt } from './hexmath';
import { P } from './palette';

/** Engine direction index (E, NE, NW, W, SW, SE: the bits of a rampart mask) -> painter direction (0 E, 1 SE, ... 5 NE). */
const ENGINE_TO_DIR: Dir[] = [0, 5, 4, 3, 2, 1];

/** Inset of the wall's reference line from the hexside. */
const K = 6;
/** Length of a return at a free end of the wall. */
const RET = 11;
/** Light comes from the upper left (as for the hills). */
const LIGHT = { x: -0.6, y: -0.8 };

export interface RampartOpts {
  /** A wall reaching the board edge runs on under the frame (boards) instead of ending in a return (icons). */
  openEdges?: boolean;
}

interface Chain {
  pts: Pt[];
  /** Per segment: along a protected hexside (false: a return). */
  prot: boolean[];
  closed: boolean;
  startKey?: string;
  endKey?: string;
}

const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const unit = (a: Pt): Pt => {
  const l = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / l, y: a.y / l };
};
const along = (a: Pt, b: Pt, d: number): Pt => {
  const u = unit(sub(b, a));
  return { x: a.x + u.x * d, y: a.y + u.y * d };
};
const key = (p: Pt) => `${Math.round(p.x * 2)},${Math.round(p.y * 2)}`;

/** Outward normal of segment a->b (walls run clockwise around their hex, so outward is to the left in screen space). */
function normal(a: Pt, b: Pt): Pt {
  const u = unit(sub(b, a));
  return { x: u.y, y: -u.x };
}

/** The polyline moved `o` outwards (mitred joins). */
function offsetLine(c: Chain, o: number): Pt[] {
  const { pts, closed } = c;
  const n = pts.length;
  const segN = (i: number) => normal(pts[i], pts[i + 1]);
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    let a: Pt | null = i > 0 ? segN(i - 1) : closed ? segN(n - 2) : null;
    let b: Pt | null = i < n - 1 ? segN(i) : closed ? segN(0) : null;
    if (!a) a = b!;
    if (!b) b = a;
    const m = unit({ x: a.x + b.x, y: a.y + b.y });
    const k = o / Math.max(0.5, m.x * b.x + m.y * b.y);
    out.push({ x: pts[i].x + m.x * k, y: pts[i].y + m.y * k });
  }
  return out;
}

function lineD(pts: Pt[], closed = false): string {
  return polyPath(pts, closed);
}

/** Protected screen directions of a hex (bit i of the mask = engine direction i). */
function screenSides(mask: number, flipped: boolean): boolean[] {
  const s = [false, false, false, false, false, false];
  for (let i = 0; i < 6; i++) if (mask & (1 << i)) s[screenDir(ENGINE_TO_DIR[i], flipped)] = true;
  return s;
}

/** Wall runs of every rampart hex, joined into chains across neighbouring rampart hexes. */
function wallChains(ctx: PaintCtx, masks: readonly number[], openEdges: boolean): Chain[] {
  const maskOf = (h: HexInfo | undefined) => (h && h.t === 'rampart' ? masks[h.id] ?? 0 : 0);
  const logical = (sd: number): Dir => (ctx.flipped ? (sd + 3) % 6 : sd) as Dir;
  const across = (h: HexInfo, sd: number) => {
    const [r, c] = neighborRC(h.r, h.c, logical(sd));
    return { r, c, hex: ctx.get(r, c) };
  };
  /** Does `n`'s wall face hex (r, c) - and not `h` - so a wall of `h` facing (r, c) runs straight on into it? */
  const continues = (n: HexInfo | undefined, h: HexInfo, x: { r: number; c: number }) => {
    const m = maskOf(n);
    if (!m || !n) return false;
    let toX = false;
    let toH = false;
    for (let i = 0; i < 6; i++) {
      if (!(m & (1 << i))) continue;
      const [r, c] = neighborRC(n.r, n.c, ENGINE_TO_DIR[i]);
      if (r === x.r && c === x.c) toX = true;
      if (r === h.r && c === h.c) toH = true;
    }
    return toX && !toH;
  };
  const sin60 = Math.sqrt(3) / 2;
  const rIn = HEX_R - K / sin60; // circumradius of the hex inset by K

  const runs: Chain[] = [];
  for (const h of ctx.hexes) {
    const mask = maskOf(h);
    if (!mask) continue;
    const side = screenSides(mask, ctx.flipped);
    const C = (i: number) => corner(h, ((i % 6) + 6) % 6);
    const I = (i: number) => corner(h, ((i % 6) + 6) % 6, rIn);
    if (side.every(Boolean)) {
      const pts = [1, 2, 3, 4, 5, 0, 1].map(I);
      runs.push({ pts, prot: pts.slice(1).map(() => true), closed: true });
      continue;
    }
    for (let s = 0; s < 6; s++) {
      if (!side[s] || side[(s + 5) % 6]) continue;
      let n = 1;
      while (side[(s + n) % 6]) n++;
      const cs = s + 1; // first corner
      const ce = s + n + 1; // last corner
      const pts: Pt[] = [];
      const prot: boolean[] = [];
      const run: Chain = { pts, prot, closed: false };
      const to = (p: Pt, protectedSide: boolean) => {
        if (pts.length) prot.push(protectedSide);
        pts.push(p);
      };
      // start: the edge before the run (edge s-1, corners s and s+1)
      const pe = across(h, (s + 5) % 6);
      const startOff = !pe.hex && openEdges;
      if (startOff || continues(pe.hex, h, across(h, s))) {
        const p = along(C(cs), C(s), K / sin60);
        if (startOff) to(along(p, I(cs + 1), -10), true);
        else run.startKey = key(p);
        to(p, true);
      } else {
        to(along(I(cs), I(s), RET), false);
        to(I(cs), false);
      }
      for (let i = cs + 1; i < ce; i++) to(I(i), true);
      // end: the edge after the run (edge s+n, corners s+n+1 and s+n+2)
      const ne = across(h, (s + n) % 6);
      const endOff = !ne.hex && openEdges;
      if (endOff || continues(ne.hex, h, across(h, (s + n + 5) % 6))) {
        const p = along(C(ce), C(ce + 1), K / sin60);
        to(p, true);
        if (endOff) to(along(p, I(ce - 1), -10), true);
        else run.endKey = key(p);
      } else {
        to(I(ce), true);
        to(along(I(ce), I(ce + 1), RET), false);
      }
      runs.push(run);
    }
  }
  // join runs that meet on a shared hexside
  const byStart = new Map<string, Chain>();
  for (const r of runs) if (r.startKey) byStart.set(r.startKey, r);
  const used = new Set<Chain>();
  const chains: Chain[] = [];
  const hasPred = new Set<Chain>();
  for (const r of runs) if (r.endKey && byStart.has(r.endKey)) hasPred.add(byStart.get(r.endKey)!);
  const follow = (first: Chain) => {
    const c: Chain = { pts: [...first.pts], prot: [...first.prot], closed: false };
    used.add(first);
    let cur = first;
    for (;;) {
      const next = cur.endKey ? byStart.get(cur.endKey) : undefined;
      if (!next || used.has(next)) {
        if (next === first) c.closed = true; // a ring of rampart hexes
        break;
      }
      used.add(next);
      c.pts.push(...next.pts.slice(1));
      c.prot.push(...next.prot);
      cur = next;
    }
    chains.push(c);
  };
  for (const r of runs) if (!hasPred.has(r) && !used.has(r)) follow(r);
  for (const r of runs) if (!used.has(r)) follow(r);
  return chains;
}

/** Quads between offsets o1 and o2 of every segment, sorted into lit / mid / shaded by which way `face` points. */
function slopeQuads(chains: Chain[], o1: number, o2: number, face: 1 | -1): [string, string, string] {
  const out: [string, string, string] = ['', '', ''];
  for (const c of chains) {
    const a = offsetLine(c, o1);
    const b = offsetLine(c, o2);
    for (let i = 0; i < c.pts.length - 1; i++) {
      const n = normal(c.pts[i], c.pts[i + 1]);
      const lit = face * (n.x * LIGHT.x + n.y * LIGHT.y);
      const k = lit > 0.3 ? 0 : lit < -0.3 ? 2 : 1;
      out[k] += polyPath([a[i], a[i + 1], b[i + 1], b[i]]);
    }
  }
  return out;
}

/**
 * The protected sides of every rampart hex in `ctx`. `masks[hexId]`: bit i = engine direction i. Sides are found from
 * the neighbour across them, so a flipped board puts the wall on the right sides (and lights it from the same corner).
 */
export function paintRamparts(ctx: PaintCtx, masks: readonly number[], opts: RampartOpts = {}): JSX.Element | null {
  const chains = wallChains(ctx, masks, opts.openEdges ?? true);
  if (!chains.length) return null;
  // cross-section, from the hexside (positive outwards; the chains run K inside it): far lip +7 | ditch +0.4..+6.4 |
  // bank +0.5..-13 = outer slope +0.6..-4 (stakes -2.6..+3), breastwork at -4.6, walk, inner slope -9.4..-13 |
  // trodden ground -11.5..-17.5
  const off = (c: Chain, o: number) => offsetLine(c, o + K);
  let body = '';
  let walk = '';
  let ditch = '';
  let lip = '';
  let parapet = '';
  let stakes = '';
  let tips = '';
  for (const c of chains) {
    body += lineD(off(c, -6.25), c.closed);
    walk += lineD(off(c, -14.5), c.closed);
    parapet += lineD(off(c, -4.6), c.closed);
    // the ditch and the stakes only face the enemy, not the returns
    const d = off(c, 3.4);
    const l = off(c, 7);
    const st0 = off(c, -2.6);
    const st1 = off(c, 3);
    let i = 0;
    while (i < c.prot.length) {
      if (!c.prot[i]) {
        i++;
        continue;
      }
      let j = i;
      while (j < c.prot.length && c.prot[j]) j++;
      const all = c.closed && i === 0 && j === c.prot.length;
      ditch += lineD(d.slice(i, j + 1), all);
      lip += lineD(l.slice(i, j + 1), all);
      for (let s = i; s < j; s++) {
        const len = Math.hypot(st1[s + 1].x - st1[s].x, st1[s + 1].y - st1[s].y);
        const nst = Math.max(1, Math.round(len / 5.6));
        for (let k = 0; k < nst; k++) {
          const t = (k + 0.5) / nst;
          const a = { x: st0[s].x + (st0[s + 1].x - st0[s].x) * t, y: st0[s].y + (st0[s + 1].y - st0[s].y) * t };
          const b = { x: st1[s].x + (st1[s + 1].x - st1[s].x) * t, y: st1[s].y + (st1[s + 1].y - st1[s].y) * t };
          stakes += `M${fmt(a.x)},${fmt(a.y)}L${fmt(b.x)},${fmt(b.y)}`;
          const m = { x: a.x + (b.x - a.x) * 0.72, y: a.y + (b.y - a.y) * 0.72 };
          tips += `M${fmt(m.x)},${fmt(m.y)}L${fmt(b.x)},${fmt(b.y)}`;
        }
      }
      i = j;
    }
  }
  const outer = slopeQuads(chains, K + 0.6, K - 4, 1);
  const inner = slopeQuads(chains, K - 9.4, K - 13, -1);
  const shades = [P.earthLight, P.earth, P.earthShade];
  return (
    <g className="ramparts">
      <path d={walk} fill="none" stroke={P.dirt} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.3} />
      <path d={body} fill="none" stroke="rgba(40,32,18,0.38)" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" transform="translate(1.3 2.2)" />
      <path d={ditch} fill="none" stroke={P.ditch} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      <path d={ditch} fill="none" stroke={P.palisadeDark} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
      <path d={lip} fill="none" stroke={P.earthLight} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
      <path d={body} fill="none" stroke={P.earth} strokeWidth={13.5} strokeLinecap="round" strokeLinejoin="round" />
      {outer.map((d, i) => (d ? <path key={`o${i}`} d={d} fill={shades[i]} /> : null))}
      {inner.map((d, i) => (d ? <path key={`i${i}`} d={d} fill={shades[i]} opacity={0.85} /> : null))}
      <path d={stakes} fill="none" stroke={P.palisadeDark} strokeWidth={1.5} strokeLinecap="round" />
      <path d={tips} fill="none" stroke={P.palisadeLight} strokeWidth={0.9} strokeLinecap="round" />
      <path d={parapet} fill="none" stroke="rgba(40,30,15,0.4)" strokeWidth={4} strokeLinejoin="round" transform="translate(1.1 2)" />
      <path d={parapet} fill="none" stroke={P.palisadeDark} strokeWidth={4.4} strokeLinejoin="round" />
      <path d={parapet} fill="none" stroke={P.palisade} strokeWidth={3.6} strokeDasharray="3.2 1.9" />
      <path d={parapet} fill="none" stroke={P.palisadeLight} strokeWidth={1.2} strokeDasharray="3.2 1.9" transform="translate(-0.4 -0.8)" />
    </g>
  );
}
