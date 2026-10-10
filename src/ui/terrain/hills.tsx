// Hills (shaded grassy mounds merging into ridges) and steep hills (raised rocky plateaus).
import { addToGrid, blurGrid, contours, decimate, fillGrid, isoPath, loopArea, makeGrid, polyPath } from './field';
import type { TerrainType } from '../../engine/types';
import { fmt, type PaintCtx, type Pt, type Rect } from './hexmath';
import { fbm, rng } from './noise';
import { P } from './palette';

function rectAround(ctx: PaintCtx, pts: Pt[], pad: number): Rect {
  const b = ctx.bounds;
  return {
    x0: Math.max(b.x0, Math.min(...pts.map((h) => h.x)) - pad),
    y0: Math.max(b.y0, Math.min(...pts.map((h) => h.y)) - pad),
    x1: Math.min(b.x1, Math.max(...pts.map((h) => h.x)) + pad),
    y1: Math.min(b.y1, Math.max(...pts.map((h) => h.y)) + pad),
  };
}

interface ReliefOpts {
  R0: number; // bump radius
  K: number; // height -> slope scale for shading
  noise: number; // height noise amplitude
  noiseScale: number;
  seed: number;
  base: number; // outline level
  contours: number[];
  peakJitter: number;
  /** Slope levels whose iso-lines outline exposed rock (very steep hills), on a slope field broken up by noise. */
  rock?: number[];
}

interface Relief {
  outline: string;
  lit: string[];
  shade: string[];
  lines: string[];
  rock: string[];
}

/** Height field of merged bumps + relief shading bands (light from the upper left). */
function relief(ctx: PaintCtx, hexes: Pt[], o: ReliefOpts): Relief {
  const step = 3;
  const g = makeGrid(rectAround(ctx, hexes, o.R0 + 12), step);
  const s3 = Math.sqrt(3) / 2;
  const peaks = hexes.map((h, i) => {
    const R = rng(o.seed * 7919 + Math.round(h.x) * 31 + Math.round(h.y));
    return { x: h.x + (R() - 0.5) * 2 * o.peakJitter, y: h.y + (R() - 0.5) * 2 * o.peakJitter, a: 0.92 + R() * 0.16, i };
  });
  fillGrid(g, (x, y) => {
    let H = 0;
    for (const p of peaks) {
      const dx = x - p.x;
      const dy = y - p.y;
      if (Math.abs(dx) > o.R0 || Math.abs(dy) > o.R0) continue;
      const eu = Math.hypot(dx, dy);
      const hx = Math.max(Math.abs(dx), Math.abs(dx * 0.5 + dy * s3), Math.abs(dx * 0.5 - dy * s3));
      const d = 0.45 * eu + 0.55 * hx;
      if (d >= o.R0) continue;
      const q = 1 - (d / o.R0) * (d / o.R0);
      H += q * q * p.a;
    }
    return H;
  });
  addToGrid(g, (x, y) => (fbm(x / o.noiseScale, y / o.noiseScale, o.seed) - 0.5) * o.noise);
  // hill-shade
  const sg = makeGrid({ x0: g.x0, y0: g.y0, x1: g.x0 + (g.nx - 1) * step, y1: g.y0 + (g.ny - 1) * step }, step);
  const L = { x: -0.55, y: -0.7, z: 0.9 };
  const ll = Math.hypot(L.x, L.y, L.z);
  L.x /= ll;
  L.y /= ll;
  L.z /= ll;
  for (let j = 1; j < g.ny - 1; j++) {
    for (let i = 1; i < g.nx - 1; i++) {
      const k = j * g.nx + i;
      const hdx = ((g.v[k + 1] - g.v[k - 1]) / (2 * step)) * o.K;
      const hdy = ((g.v[k + g.nx] - g.v[k - g.nx]) / (2 * step)) * o.K;
      const nl = Math.hypot(hdx, hdy, 1);
      const sh = (-hdx * L.x - hdy * L.y + L.z) / nl - L.z;
      const inside = Math.max(0, Math.min(1, (g.v[k] - o.base * 0.6) / (o.base * 0.8)));
      sg.v[k] = sh * inside;
    }
  }
  blurGrid(sg, 1, 2);
  let rock: string[] = [];
  if (o.rock?.length) {
    const slope = makeGrid({ x0: g.x0, y0: g.y0, x1: g.x0 + (g.nx - 1) * step, y1: g.y0 + (g.ny - 1) * step }, step);
    for (let j = 1; j < g.ny - 1; j++) {
      for (let i = 1; i < g.nx - 1; i++) {
        const k = j * g.nx + i;
        const hdx = (g.v[k + 1] - g.v[k - 1]) / (2 * step);
        const hdy = (g.v[k + g.nx] - g.v[k - g.nx]) / (2 * step);
        const x = g.x0 + i * step;
        const y = g.y0 + j * step;
        // patches, not rings: the steepest ground, broken up by noise
        slope.v[k] = g.v[k] > o.base ? Math.hypot(hdx, hdy) * o.K + (fbm(x / 11, y / 11, o.seed + 3) - 0.5) * 1.6 : 0;
      }
    }
    blurGrid(slope, 1, 2);
    rock = o.rock.map((l) => isoPath(slope, l, 14));
  }
  const neg = makeGrid({ x0: sg.x0, y0: sg.y0, x1: sg.x0 + (sg.nx - 1) * step, y1: sg.y0 + (sg.ny - 1) * step }, step);
  for (let k = 0; k < sg.v.length; k++) neg.v[k] = -sg.v[k];
  return {
    outline: isoPath(g, o.base, 20),
    lit: [0.06, 0.15, 0.26].map((l) => isoPath(sg, l, 10)),
    shade: [0.06, 0.15, 0.27].map((l) => isoPath(neg, l, 10)),
    lines: o.contours.map((l) => isoPath(g, l, 20)),
    rock,
  };
}

/**
 * Hills. `steep`: the very steep hills of 223 (rule `veryHills`, §18.6), still hills but rockier and darker: a steeper
 * relief in dark olive, bare rock on the steepest slopes, crags along the crest, boulders and scree. A camp or wall with a
 * hill under it (Expansion #3, `hillUnder`) is part of the hills, and its camp or wall is painted on top.
 */
export function paintHills(ctx: PaintCtx, patternFill?: string, strength = 1, steep = false): JSX.Element | null {
  const hills = ctx.hexes.filter((h) => h.t === 'hill' || h.hillUnder);
  if (!hills.length) return null;
  if (steep) return paintVerySteep(ctx, hills, patternFill, strength);
  const r = relief(ctx, hills, {
    R0: 60,
    K: 34,
    noise: 0.1,
    noiseScale: 20,
    seed: 11,
    base: 0.16,
    contours: [0.42, 0.72],
    peakJitter: 4,
  });
  return (
    <g className="hills">
      <path d={r.outline} fill="rgba(48,52,18,0.16)" transform="translate(6 8)" />
      <path d={r.outline} fill={P.hillShadow} transform="translate(3 4)" />
      <path d={r.outline} fill={P.hill[1]} />
      {patternFill && <path d={r.outline} fill={patternFill} opacity={0.5} />}
      {r.shade.map((d, i) => (
        <path key={`s${i}`} d={d} fill="#3e4a1a" opacity={0.15 * strength} />
      ))}
      {r.lit.map((d, i) => (
        <path key={`l${i}`} d={d} fill="#f4e9a8" opacity={0.16 * strength} />
      ))}
      {r.lines.map((d, i) => (
        <path key={`c${i}`} d={d} fill="none" stroke={P.hillLine} strokeWidth={0.8} opacity={0.55} strokeDasharray={i ? undefined : '5 3'} />
      ))}
      <path d={r.outline} fill="none" stroke="rgba(66,64,24,0.45)" strokeWidth={1.1 * strength} />
    </g>
  );
}

function paintVerySteep(ctx: PaintCtx, hills: Pt[], patternFill: string | undefined, strength: number): JSX.Element {
  const r = relief(ctx, hills, {
    R0: 58,
    K: 52,
    noise: 0.16,
    noiseScale: 14,
    seed: 29,
    base: 0.16,
    contours: [0.34, 0.56, 0.8],
    peakJitter: 6,
    rock: [1.45, 1.75],
  });
  const R = rng(2230 + Math.round(hills[0].x) * 7 + Math.round(hills[0].y));
  // crags: short jagged strokes about the crest; boulders on the slopes; scree at the foot
  let crags = '';
  let cragsLit = '';
  let scree = '';
  const bould: { body: string; top: string }[] = [];
  for (const h of hills) {
    for (let k = 0; k < 3; k++) {
      const a = R() * Math.PI * 2;
      const d = 8 + R() * 14;
      const x = h.x + Math.cos(a) * d;
      const y = h.y + Math.sin(a) * d * 0.8;
      const w = 5 + R() * 5;
      const seg = `M${fmt(x - w)},${fmt(y + 1.5)}l${fmt(w * 0.4)},${fmt(-2.5 - R() * 2)}l${fmt(w * 0.35)},${fmt(1.8 + R())}l${fmt(w * 0.5)},${fmt(-3 - R() * 2)}l${fmt(w * 0.4)},${fmt(2.4 + R())}`;
      crags += seg;
      cragsLit += `M${fmt(x - w * 0.6)},${fmt(y - 0.4)}l${fmt(w * 0.3)},${fmt(-2)}`;
    }
    for (let k = 0; k < 3; k++) {
      const a = Math.PI * (0.1 + R() * 0.8) + (R() < 0.35 ? Math.PI : 0);
      const d = 24 + R() * 12;
      bould.push(boulder({ x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d * 0.9 }, 2.6 + R() * 2.4, R));
    }
    for (let k = 0; k < 12; k++) {
      const a = Math.PI * (0.05 + R() * 0.9);
      const d = 36 + R() * 14;
      const x = h.x + Math.cos(a) * d;
      const y = h.y + Math.sin(a) * d;
      const s = 0.9 + R() * 1.2;
      scree += `M${fmt(x - s)},${fmt(y)}a${fmt(s)},${fmt(s * 0.75)} 0 1,1 ${fmt(2 * s)},0a${fmt(s)},${fmt(s * 0.75)} 0 1,1 ${fmt(-2 * s)},0`;
    }
  }
  return (
    <g className="hills very-steep">
      <path d={r.outline} fill="rgba(40,36,14,0.22)" transform="translate(7 9)" />
      <path d={r.outline} fill="rgba(40,36,14,0.42)" transform="translate(3 4.5)" />
      <path d={r.outline} fill="#76793d" />
      {patternFill && <path d={r.outline} fill={patternFill} opacity={0.35} />}
      {r.shade.map((d, i) => (
        <path key={`s${i}`} d={d} fill="#2c3210" opacity={0.2 * strength} />
      ))}
      {r.lit.map((d, i) => (
        <path key={`l${i}`} d={d} fill="#efe2a0" opacity={0.13 * strength} />
      ))}
      {r.rock[0] && <path d={r.rock[0]} fill={P.rockShadow} transform="translate(1.2 1.8)" />}
      {r.rock.map((d, i) => (
        <path key={`r${i}`} d={d} fill={i ? P.rockMid : P.rock} stroke={P.rockDark} strokeWidth={i ? 0.6 : 0.9} strokeOpacity={i ? 0.5 : 0.8} />
      ))}
      {r.rock[1] && <path d={r.rock[1]} fill="none" stroke={P.rockLight} strokeWidth={1} opacity={0.6} transform="translate(-0.7 -0.9)" />}
      {r.lines.map((d, i) => (
        <path key={`c${i}`} d={d} fill="none" stroke="rgba(52,46,18,0.55)" strokeWidth={0.9} opacity={0.6} strokeDasharray={i ? undefined : '4 3'} />
      ))}
      <path d={scree} fill={P.rockMid} stroke={P.rockDark} strokeWidth={0.5} opacity={0.85} />
      {bould.map((b, i) => (
        <g key={`b${i}`}>
          <path d={b.body} fill="#6d6150" stroke="#2e2519" strokeWidth={0.7} />
          <path d={b.top} fill="#b3a585" />
        </g>
      ))}
      <path d={crags} fill="none" stroke={P.rockDark} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
      <path d={cragsLit} fill="none" stroke={P.rockLight} strokeWidth={1} strokeLinecap="round" opacity={0.8} />
      <path d={r.outline} fill="none" stroke="rgba(46,40,14,0.62)" strokeWidth={1.3 * strength} />
    </g>
  );
}

export function regionGrid(ctx: PaintCtx, t: TerrainType, step = 3, blur = 3, noiseAmp = 0.25, noiseScale = 24, seed = 5) {
  const hs = ctx.hexes.filter((h) => h.t === t);
  const g = makeGrid(rectAround(ctx, hs, 70), step);
  fillGrid(g, (x, y) => (ctx.terrainAt(x, y) === t ? 1 : 0));
  blurGrid(g, blur, 3);
  addToGrid(g, (x, y) => (fbm(x / noiseScale, y / noiseScale, seed) - 0.5) * noiseAmp);
  return g;
}

/** Angular boulder: dark body with a lit top facet. */
export function boulder(c: Pt, r: number, R: () => number): { body: string; top: string } {
  const n = 6 + Math.floor(R() * 2);
  const ph = R() * Math.PI;
  const body: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const a = ph + (k / n) * Math.PI * 2 + (R() - 0.5) * 0.4;
    const rr = r * (0.75 + R() * 0.35);
    body.push({ x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr * 0.8 });
  }
  const top = body.map((p) => ({ x: c.x + (p.x - c.x) * 0.7 - r * 0.18, y: c.y + (p.y - c.y) * 0.6 - r * 0.28 }));
  return { body: polyPath(body), top: polyPath(top) };
}

/**
 * Steep hills: a raised rocky plateau with a jagged rim, vertical cliff faces on the sides that
 * face the viewer, fallen boulders at the foot and outcrops on top.
 */
export function paintSteep(ctx: PaintCtx): JSX.Element | null {
  const hs = ctx.hexes.filter((h) => h.t === 'steep');
  if (!hs.length) return null;
  const g = regionGrid(ctx, 'steep', 3, 3, 0, 10, 23);
  addToGrid(g, (x, y) => (fbm(x / 9, y / 9, 61, 2) - 0.5) * 0.34 + (fbm(x / 30, y / 30, 62) - 0.5) * 0.2);
  const R = rng(778 + hs[0].id);
  const lift = 10;
  const lift2 = 19;
  const foot = isoPath(g, 0.36, 30);
  const tier = (level: number, dy: number, minArea: number) =>
    contours(g, level)
      .filter((l) => Math.abs(loopArea(l)) > minArea)
      .map((l) => decimate(l, 4.5).map((p) => ({ x: p.x - dy * 0.15, y: p.y - dy })));
  const topLoops = tier(0.58, lift, 60);
  const top2Loops = tier(0.86, lift2, 40);
  const top = topLoops.map((l) => polyPath(l)).join('');
  const top2 = top2Loops.map((l) => polyPath(l)).join('');
  // cliff striations: vertical strokes below the south-facing rims
  let stria = '';
  let striaLight = '';
  const cliffs = (loops: Pt[][], h: number) => {
    for (const loop of loops) {
      const ccw = loopArea(loop) < 0;
      for (let i = 0; i < loop.length; i++) {
        const a = loop[i];
        const b = loop[(i + 1) % loop.length];
        const tx = b.x - a.x;
        const ty = b.y - a.y;
        const tl = Math.hypot(tx, ty) || 1;
        let ny = -tx / tl;
        if (ccw) ny = -ny;
        if (ny < 0.2) continue;
        for (const f of [0.25, 0.75]) {
          const m = { x: a.x + tx * f, y: a.y + ty * f };
          const L = h * (0.55 + R() * 0.5) * Math.min(1, ny + 0.25);
          const seg = `M${fmt(m.x)},${fmt(m.y + 1)}l${fmt((R() - 0.5) * 1.5)},${fmt(L)}`;
          if (R() < 0.35) striaLight += seg;
          else stria += seg;
        }
      }
    }
  };
  cliffs(topLoops, lift);
  const s1 = stria;
  const l1 = striaLight;
  stria = '';
  striaLight = '';
  cliffs(top2Loops, lift2 - lift);
  const stria2 = stria + striaLight;
  stria = s1;
  striaLight = l1;
  // boulders at the foot and outcrops on top
  const foots: { body: string; top: string }[] = [];
  const tops: { body: string; top: string }[] = [];
  for (const h of hs) {
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * (0.05 + R() * 0.9) + (R() < 0.3 ? Math.PI : 0);
      const d = 30 + R() * 10;
      foots.push(boulder({ x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d * 0.95 }, 2.5 + R() * 2.5, R));
    }
    for (let k = 0; k < 4; k++) {
      const a = R() * Math.PI * 2;
      const d = 6 + R() * 18;
      tops.push(boulder({ x: h.x + Math.cos(a) * d, y: h.y - lift + Math.sin(a) * d * 0.8 }, 4 + R() * 4, R));
    }
  }
  let cracks = '';
  let scrub = '';
  for (const h of hs) {
    for (let k = 0; k < 4; k++) {
      const x = h.x + (R() - 0.5) * 50;
      const y = h.y - lift + (R() - 0.5) * 40;
      cracks += `M${fmt(x)},${fmt(y)}l${fmt(4 + R() * 4)},${fmt((R() - 0.5) * 5)}l${fmt(3 + R() * 3)},${fmt(2 + R() * 3)}`;
    }
    for (let k = 0; k < 5; k++) {
      const a = R() * Math.PI * 2;
      const d = 10 + R() * 22;
      const x = h.x + Math.cos(a) * d;
      const y = h.y - lift + Math.sin(a) * d * 0.8;
      const sz = 2.4 + R() * 2.2;
      scrub += `M${fmt(x - sz)},${fmt(y)}a${fmt(sz)},${fmt(sz * 0.8)} 0 1,1 ${fmt(2 * sz)},0a${fmt(sz)},${fmt(sz * 0.8)} 0 1,1 ${fmt(-2 * sz)},0`;
    }
  }
  return (
    <g className="steep">
      <path d={foot} fill="rgba(34,28,14,0.25)" transform="translate(6 7)" />
      <path d={foot} fill="#5f5240" stroke="#2e2519" strokeWidth={1.2} />
      <path d={stria} fill="none" stroke="#3a3022" strokeWidth={1.3} strokeLinecap="round" />
      <path d={striaLight} fill="none" stroke="#8d7d61" strokeWidth={1.1} strokeLinecap="round" opacity={0.8} />
      {foots.map((b, i) => (
        <g key={`f${i}`}>
          <path d={b.body} fill="#5a4d3b" stroke="#2e2519" strokeWidth={0.7} />
          <path d={b.top} fill="#a8997a" />
        </g>
      ))}
      <path d={top} fill="#a29474" stroke="#2e2519" strokeWidth={1.3} strokeLinejoin="round" />
      <path d={top} fill="none" stroke="#e3d6b2" strokeWidth={1.2} opacity={0.5} transform="translate(-0.8 -1)" />
      <path d={top2} fill="#5f5240" transform={`translate(0 ${lift2 - lift})`} />
      <path d={stria2} fill="none" stroke="#3a3022" strokeWidth={1.2} strokeLinecap="round" />
      <path d={top2} fill="#b3a582" stroke="#2e2519" strokeWidth={1.2} strokeLinejoin="round" />
      <path d={top2} fill="none" stroke="#efe3c0" strokeWidth={1.1} opacity={0.55} transform="translate(-0.8 -1)" />
      <path d={cracks} fill="none" stroke="#5f5240" strokeWidth={0.9} strokeLinecap="round" opacity={0.8} />
      <path d={scrub} fill={P.scrub} opacity={0.8} />
      {tops.map((b, i) => (
        <g key={`t${i}`}>
          <path d={b.body} fill="#6f6049" stroke="#2e2519" strokeWidth={0.7} />
          <path d={b.top} fill="#c7b995" />
        </g>
      ))}
    </g>
  );
}
