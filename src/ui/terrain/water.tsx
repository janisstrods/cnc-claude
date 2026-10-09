// Rivers (with fords), lakes and (for now drawn like a lake) the sea.
import type { TerrainType } from '../../engine/types';
import { addToGrid, blurGrid, fillGrid, isoPath, makeGrid, polyPath } from './field';
import { DIRS, fmt, neighborRC, RI, type Dir, type HexInfo, type PaintCtx, type Pt } from './hexmath';
import { fbm, rng } from './noise';
import { P } from './palette';

type PortKind = 'hex' | 'lake' | 'off' | 'end';

/** Standing water painted by paintLakes: lakes and the sea (which has the lake rules, §16). */
const isStill = (t: TerrainType) => t === 'lake' || t === 'sea';
interface Port {
  d: Dir;
  kind: PortKind;
}

interface Key {
  p: Pt;
  t: Pt; // unit tangent (direction of travel)
  hex: number; // owning hex id for the segment that ENDS at this key
  end?: boolean; // dead end of a river inside the board
}

const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
const len = (a: Pt) => Math.hypot(a.x, a.y);
const norm = (a: Pt): Pt => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};

/**
 * Where the river leaves hex h: every neighbouring river/lake hex, plus (for a river end) the
 * board edge it flows off - preferring the edge straight ahead - or an in-board dead end.
 */
function portsOf(ctx: PaintCtx, h: HexInfo): Port[] {
  const links: Port[] = [];
  const off: Dir[] = [];
  for (const d of DIRS) {
    const [r, c] = neighborRC(h.r, h.c, d);
    const n = ctx.get(r, c);
    if (!n) off.push(d);
    else if (n.t === 'river') links.push({ d, kind: 'hex' });
    else if (isStill(n.t)) links.push({ d, kind: 'lake' });
  }
  if (links.length >= 2) return links;
  if (links.length === 1) {
    const opp = ((links[0].d + 3) % 6) as Dir;
    if (off.length) {
      const dist = (d: Dir) => Math.min(Math.abs(d - opp), 6 - Math.abs(d - opp));
      const best = [...off].sort((a, b) => dist(a) - dist(b))[0];
      return [links[0], { d: best, kind: 'off' }];
    }
    return [links[0], { d: opp, kind: 'end' }];
  }
  const [a, b] = ctx.lonePorts ?? ([3, 0] as [Dir, Dir]);
  return [
    { d: a, kind: off.includes(a) ? 'off' : 'end' },
    { d: b, kind: off.includes(b) ? 'off' : 'end' },
  ];
}

interface RiverGeom {
  chains: Key[][];
}

function traceRivers(ctx: PaintCtx): RiverGeom {
  const rivers = ctx.hexes.filter((h) => h.t === 'river');
  const ports = new Map<number, Port[]>();
  for (const h of rivers) ports.set(h.id, portsOf(ctx, h));
  const nb = (h: HexInfo, d: Dir) => {
    const [r, c] = neighborRC(h.r, h.c, d);
    return ctx.get(r, c);
  };
  const center = (h: HexInfo): Pt => ({ x: h.x, y: h.y });
  const mid = (h: HexInfo, d: Dir): Pt => {
    const [r, c] = neighborRC(h.r, h.c, d);
    const o = ctx.center(r, c);
    return { x: (h.x + o.x) / 2, y: (h.y + o.y) / 2 };
  };
  const out = (h: HexInfo, d: Dir): Pt => norm(sub(mid(h, d), center(h)));
  const visited = new Set<string>();
  const vkey = (id: number, d: Dir) => `${id}:${d}`;
  const chains: Key[][] = [];

  const isTerminal = (p: Port) => p.kind !== 'hex';
  const isJunction = (h: HexInfo) => (ports.get(h.id)?.length ?? 0) >= 3;

  // walk from hex h leaving through port `p`, with keys already containing the start.
  const walk = (start: HexInfo, p: Port, keys: Key[]) => {
    let h = start;
    let port = p;
    for (let guard = 0; guard < 200; guard++) {
      visited.add(vkey(h.id, port.d));
      const m = mid(h, port.d);
      const u = out(h, port.d);
      keys.push({ p: m, t: u, hex: h.id });
      if (port.kind === 'off') {
        keys.push({ p: add(m, mul(u, ctx.ext)), t: u, hex: h.id });
        return;
      }
      if (port.kind === 'lake') {
        keys.push({ p: add(m, mul(u, 22)), t: u, hex: h.id });
        return;
      }
      if (port.kind === 'end') {
        keys[keys.length - 1].end = true;
        return;
      }
      const n = nb(h, port.d);
      if (!n) return;
      const back = ((port.d + 3) % 6) as Dir;
      visited.add(vkey(n.id, back));
      const np = ports.get(n.id) ?? [];
      if (np.length >= 3) {
        keys.push({ p: center(n), t: u, hex: n.id });
        return;
      }
      const next = np.find((q) => q.d !== back);
      if (!next) {
        keys.push({ p: center(n), t: u, hex: n.id });
        return;
      }
      const t = norm(sub(mid(n, next.d), mid(n, back)));
      keys.push({ p: center(n), t, hex: n.id });
      if (visited.has(vkey(n.id, next.d))) return;
      h = n;
      port = next;
    }
  };

  // 1) chains starting at terminal ports
  for (const h of rivers) {
    const ps = ports.get(h.id)!;
    if (isJunction(h)) continue;
    for (const tp of ps) {
      if (!isTerminal(tp) || visited.has(vkey(h.id, tp.d))) continue;
      const other = ps.find((q) => q !== tp)!;
      visited.add(vkey(h.id, tp.d));
      const u = out(h, tp.d);
      const m = mid(h, tp.d);
      const keys: Key[] = [];
      const inward = mul(u, -1);
      if (tp.kind === 'off') keys.push({ p: add(m, mul(u, ctx.ext)), t: inward, hex: h.id });
      if (tp.kind === 'lake') keys.push({ p: add(m, mul(u, 22)), t: inward, hex: h.id });
      keys.push({ p: m, t: inward, hex: h.id, end: tp.kind === 'end' });
      keys.push({ p: center(h), t: norm(sub(mid(h, other.d), m)), hex: h.id });
      if (visited.has(vkey(h.id, other.d))) continue;
      walk(h, other, keys);
      chains.push(keys);
    }
  }
  // 2) chains leaving junctions
  for (const h of rivers) {
    if (!isJunction(h)) continue;
    for (const p of ports.get(h.id)!) {
      if (visited.has(vkey(h.id, p.d))) continue;
      const keys: Key[] = [{ p: center(h), t: out(h, p.d), hex: h.id }];
      walk(h, p, keys);
      chains.push(keys);
    }
  }
  // 3) closed loops (rare): start anywhere unvisited
  for (const h of rivers) {
    for (const p of ports.get(h.id)!) {
      if (visited.has(vkey(h.id, p.d))) continue;
      const other = ports.get(h.id)!.find((q) => q !== p)!;
      const keys: Key[] = [{ p: center(h), t: norm(sub(mid(h, p.d), mid(h, other.d))), hex: h.id }];
      walk(h, p, keys);
      chains.push(keys);
    }
  }
  return { chains };
}

interface Sample {
  p: Pt;
  n: Pt; // unit normal (left)
  hw: number; // half width
  hex: number;
  cap?: boolean; // round cap here (dead end)
}

/**
 * Densely sample a chain of keys with cubic Hermite segments, plus a gentle meander: every
 * segment bows sideways by an amount proportional to its length with alternating sign, which
 * keeps the curve tangent-continuous while still passing through every key point.
 */
function sampleChain(keys: Key[], hwAt: (p: Pt) => number, meander: number, sign0: number): Sample[] {
  const pts: { p: Pt; hex: number }[] = [];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    const L = len(sub(b.p, a.p));
    const k = L * 0.42;
    const c1 = add(a.p, mul(a.t, k));
    const c2 = sub(b.p, mul(b.t, k));
    const n = Math.max(4, Math.ceil(L / 4));
    const amp = (i % 2 === 0 ? 1 : -1) * sign0 * meander * L;
    for (let s = i === 0 ? 0 : 1; s <= n; s++) {
      const t = s / n;
      const mt = 1 - t;
      const x = mt * mt * mt * a.p.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * b.p.x;
      const y = mt * mt * mt * a.p.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * b.p.y;
      const dx = 3 * mt * mt * (c1.x - a.p.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t * t * (b.p.x - c2.x);
      const dy = 3 * mt * mt * (c1.y - a.p.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t * t * (b.p.y - c2.y);
      const tl = Math.hypot(dx, dy) || 1;
      const off = amp * Math.sin(Math.PI * t);
      // a sample exactly on a key belongs to both segments; tag it with the segment's hex
      pts.push({ p: { x: x - (dy / tl) * off, y: y + (dx / tl) * off }, hex: b.hex });
    }
  }
  const out: Sample[] = [];
  const arc: number[] = [0];
  for (let i = 1; i < pts.length; i++) arc.push(arc[i - 1] + len(sub(pts[i].p, pts[i - 1].p)));
  const total = arc[arc.length - 1];
  const startEnd = !!keys[0].end;
  const endEnd = !!keys[keys.length - 1].end;
  const taper = (d: number) => {
    const t = Math.max(0, Math.min(1, d / 30));
    return 0.5 + 0.5 * t * t * (3 - 2 * t);
  };
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)].p;
    const b = pts[Math.min(pts.length - 1, i + 1)].p;
    const t = norm(sub(b, a));
    let hw = hwAt(pts[i].p);
    if (startEnd) hw *= taper(arc[i]);
    if (endEnd) hw *= taper(total - arc[i]);
    out.push({ p: pts[i].p, n: { x: -t.y, y: t.x }, hw, hex: pts[i].hex });
  }
  if (out.length) {
    if (startEnd) out[0].cap = true;
    if (endEnd) out[out.length - 1].cap = true;
  }
  return out;
}

function ribbon(s: Sample[], extra: number, scale = 1): string {
  if (s.length < 2) return '';
  const w = (q: Sample) => Math.max(0.5, q.hw * scale + extra);
  const left = s.map((q) => add(q.p, mul(q.n, w(q))));
  const right = s.map((q) => sub(q.p, mul(q.n, w(q)))).reverse();
  const cap = (q: Sample, dir: 1 | -1): Pt[] => {
    const t = { x: q.n.y, y: -q.n.x };
    const out: Pt[] = [];
    for (let k = 1; k < 8; k++) {
      const th = (k / 8) * Math.PI;
      const c = dir === 1 ? Math.cos(th) : -Math.cos(th);
      out.push(add(q.p, add(mul(q.n, w(q) * c), mul(t, dir * w(q) * Math.sin(th)))));
    }
    return out;
  };
  const first = s[0];
  const last = s[s.length - 1];
  return polyPath([...left, ...(last.cap ? cap(last, 1) : []), ...right, ...(first.cap ? cap(first, -1) : [])]);
}

/** Samples of a chain that belong to hex `id` (including the boundary samples on both ends). */
function hexRun(s: Sample[], id: number): Sample[][] {
  const runs: Sample[][] = [];
  let cur: Sample[] | null = null;
  for (let i = 0; i < s.length; i++) {
    if (s[i].hex === id) {
      if (!cur) {
        cur = [];
        if (i > 0) cur.push(s[i - 1]);
      }
      cur.push(s[i]);
    } else if (cur) {
      runs.push(cur);
      cur = null;
    }
  }
  if (cur) runs.push(cur);
  return runs;
}

export function paintRivers(ctx: PaintCtx): JSX.Element | null {
  const rivers = ctx.hexes.filter((h) => h.t === 'river');
  if (!rivers.length) return null;
  const { chains } = traceRivers(ctx);
  const fords = rivers.filter((h) => h.ford);
  const baseHW = 13.5;
  const hwAt = (p: Pt) => {
    let w = baseHW * (0.86 + 0.32 * fbm(p.x / 45, p.y / 45, 7));
    for (const f of fords) {
      const d = Math.hypot(p.x - f.x, p.y - f.y) / RI;
      if (d < 1) w += 5.5 * (1 - d * d) * (1 - d * d);
    }
    return w;
  };
  const samples = chains.map((c, i) => sampleChain(c, hwAt, 0.085, i % 2 ? -1 : 1));
  const all = (extra: number, scale = 1) => samples.map((s) => ribbon(s, extra, scale)).join('');

  // glints: short strokes parallel to the flow, offset from the centre line
  let glints = '';
  samples.forEach((s, ci) => {
    const R = rng(911 + ci * 31);
    for (let i = 4; i < s.length - 6; i += 7 + Math.floor(R() * 5)) {
      const q = s[i];
      const hx = rivers.find((h) => h.id === q.hex);
      if (hx?.ford || isStill(ctx.terrainAt(q.p.x, q.p.y))) continue;
      const side = R() < 0.5 ? -1 : 1;
      const o = q.hw * (0.25 + R() * 0.35) * side;
      const a = add(q.p, mul(q.n, o));
      const b = s[Math.min(s.length - 1, i + 2 + Math.floor(R() * 2))];
      const bb = add(b.p, mul(b.n, o));
      glints += `M${fmt(a.x)},${fmt(a.y)}L${fmt(bb.x)},${fmt(bb.y)}`;
    }
  });

  // fords
  let fordBank = '';
  let fordWater = '';
  let fordSand = '';
  let stones = '';
  let stoneHi = '';
  let ripples = '';
  for (const f of fords) {
    for (const s of samples) {
      for (const run of hexRun(s, f.id)) {
        fordBank += ribbon(run, 3.5);
        fordWater += ribbon(run, 0);
        // the sample closest to the hex centre carries the crossing
        let best = run[0];
        for (const q of run) if (Math.hypot(q.p.x - f.x, q.p.y - f.y) < Math.hypot(best.p.x - f.x, best.p.y - f.y)) best = q;
        const R = rng(1000 + f.id * 7);
        const tng = { x: best.n.y, y: -best.n.x };
        const w = best.hw;
        // sand bar across the flow
        const bar: Pt[] = [];
        const nb = 10;
        for (let k = 0; k < nb; k++) {
          const a = (k / nb) * Math.PI * 2;
          const along = Math.cos(a) * (w + 3);
          const across = Math.sin(a) * (6.5 + R() * 1.5);
          bar.push(add(best.p, add(mul(best.n, along), mul(tng, across))));
        }
        fordSand += polyPath(bar);
        // stepping stones
        const nst = 5;
        for (let k = 0; k < nst; k++) {
          const along = -w * 0.8 + (k / (nst - 1)) * w * 1.6;
          const jig = (k % 2 === 0 ? 1.6 : -1.6) + (R() - 0.5) * 1.5;
          const c = add(best.p, add(mul(best.n, along), mul(tng, jig)));
          const rx = 3.1 + R() * 1.0;
          const ry = 2.5 + R() * 0.8;
          const st: Pt[] = [];
          for (let m = 0; m < 7; m++) {
            const a = (m / 7) * Math.PI * 2 + R() * 0.3;
            st.push({ x: c.x + Math.cos(a) * rx * (0.85 + R() * 0.3), y: c.y + Math.sin(a) * ry * (0.85 + R() * 0.3) });
          }
          stones += polyPath(st);
          stoneHi += `M${fmt(c.x - rx * 0.45)},${fmt(c.y - ry * 0.35)}l${fmt(rx * 0.6)},${fmt(-ry * 0.2)}`;
        }
        // ripples up/downstream of the crossing
        for (const dir of [-1, 1]) {
          for (let k = 0; k < 2; k++) {
            const off = (10 + k * 6) * dir;
            const ctr = add(best.p, mul(tng, off));
            const half = w * (0.55 - k * 0.15);
            const a = add(ctr, mul(best.n, -half));
            const b = add(ctr, mul(best.n, half));
            const cc = add(ctr, mul(tng, 2.5 * dir));
            ripples += `M${fmt(a.x)},${fmt(a.y)}Q${fmt(cc.x)},${fmt(cc.y)} ${fmt(b.x)},${fmt(b.y)}`;
          }
        }
      }
    }
  }

  return (
    <g className="rivers">
      <path d={all(10)} fill={P.verge} opacity={0.32} />
      <path d={all(4.2)} fill={P.bank} opacity={0.8} />
      <path d={all(0)} fill={P.water} />
      <path d={all(-1.4)} fill="none" stroke={P.waterEdge} strokeWidth={1.4} opacity={0.6} />
      <path d={all(0, 0.48)} fill={P.waterDeep} opacity={0.85} />
      <path d={all(0, 0.2)} fill={P.waterDeeper} opacity={0.6} />
      {fords.length > 0 && (
        <g className="fords">
          <path d={fordBank} fill={P.sandDark} />
          <path d={fordWater} fill={P.waterShallow} />
          <path d={fordWater} fill="none" stroke={P.waterShallowEdge} strokeWidth={2} opacity={0.8} />
          <path d={fordSand} fill={P.sand} opacity={0.92} />
          <path d={ripples} fill="none" stroke="rgba(240,248,245,0.7)" strokeWidth={1.1} strokeLinecap="round" />
          <path d={stones} fill={P.stone} stroke={P.stoneDark} strokeWidth={0.9} />
          <path d={stoneHi} fill="none" stroke={P.stoneLight} strokeWidth={1} strokeLinecap="round" />
        </g>
      )}
      <path d={glints} fill="none" stroke={P.glint} strokeWidth={1.3} strokeLinecap="round" />
    </g>
  );
}

export function paintLakes(ctx: PaintCtx): JSX.Element | null {
  const lakes = ctx.hexes.filter((h) => isStill(h.t));
  if (!lakes.length) return null;
  const b = ctx.bounds;
  const pad = 70;
  const rect = {
    x0: Math.max(b.x0, Math.min(...lakes.map((h) => h.x)) - pad),
    y0: Math.max(b.y0, Math.min(...lakes.map((h) => h.y)) - pad),
    x1: Math.min(b.x1, Math.max(...lakes.map((h) => h.x)) + pad),
    y1: Math.min(b.y1, Math.max(...lakes.map((h) => h.y)) + pad),
  };
  const g = makeGrid(rect, 3);
  fillGrid(g, (x, y) => (isStill(ctx.terrainAt(x, y)) ? 1 : 0));
  blurGrid(g, 3, 3);
  addToGrid(g, (x, y) => (fbm(x / 26, y / 26, 3) - 0.5) * 0.22);
  const shore = isoPath(g, 0.4);
  const water = isoPath(g, 0.55);
  const deep = isoPath(g, 0.8);
  const deeper = isoPath(g, 0.95);

  // wavelets
  let waves = '';
  const R = rng(4242 + lakes[0].id);
  for (const h of lakes) {
    for (let k = 0; k < 3; k++) {
      const x = h.x + (R() - 0.5) * 52;
      const y = h.y + (R() - 0.5) * 44;
      const w = 6 + R() * 6;
      waves += `M${fmt(x - w)},${fmt(y)}q${fmt(w / 2)},${fmt(-3)} ${fmt(w)},0q${fmt(w / 2)},3 ${fmt(w)},0`;
    }
  }
  // reeds on the shore
  let reeds = '';
  for (const h of lakes) {
    for (let k = 0; k < 6; k++) {
      const a = R() * Math.PI * 2;
      const rr = 38 + R() * 8;
      const x = h.x + Math.cos(a) * rr;
      const y = h.y + Math.sin(a) * rr;
      if (isStill(ctx.terrainAt(x + Math.cos(a) * 10, y + Math.sin(a) * 10))) continue;
      for (let m = -2; m <= 2; m++) reeds += `M${fmt(x + m * 1.4)},${fmt(y + 2)}l${fmt(m * 1.2)},${fmt(-6 - R() * 4)}`;
    }
  }

  return (
    <g className="lakes">
      <path d={shore} fill={P.verge} opacity={0.4} transform="translate(0 3)" />
      <path d={shore} fill={P.sand} />
      <path d={shore} fill="none" stroke={P.sandDark} strokeWidth={1.2} opacity={0.7} />
      <path d={water} fill={P.waterEdge} />
      <path d={water} fill="none" stroke={P.bank} strokeWidth={1.6} opacity={0.75} />
      <path d={deep} fill={P.water} />
      <path d={deeper} fill={P.waterDeep} opacity={0.9} />
      <path d={waves} fill="none" stroke={P.glint} strokeWidth={1.2} strokeLinecap="round" />
      <path d={reeds} fill="none" stroke={P.reedDark} strokeWidth={1} strokeLinecap="round" />
    </g>
  );
}

