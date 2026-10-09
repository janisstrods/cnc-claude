// Broken ground (stones, scrub, ruts) and fortified camps (palisade + tents).
import { blobPath, isoPath, polyPath } from './field';
import { corner, fmt, hexBoundaryDist, type PaintCtx, type Pt } from './hexmath';
import { boulder, regionGrid } from './hills';
import { rng } from './noise';
import { P } from './palette';

export function paintBroken(ctx: PaintCtx): JSX.Element | null {
  const hs = ctx.hexes.filter((h) => h.t === 'broken');
  if (!hs.length) return null;
  const g = regionGrid(ctx, 'broken', 3, 3, 0.4, 13, 51);
  const dirt = isoPath(g, 0.5);
  const patches = isoPath(g, 0.8);
  const R = rng(613 + hs[0].id);
  let stones = '';
  let stoneSh = '';
  let stoneHi = '';
  let scrub = '';
  let scrubHi = '';
  let ruts = '';
  const bould: { body: string; top: string }[] = [];
  for (const h of hs) {
    for (let k = 0; k < 2; k++) {
      const a = R() * Math.PI * 2;
      const d = hexBoundaryDist(a) - 12 - R() * 6;
      bould.push(boulder({ x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d }, 5 + R() * 2.5, R));
    }
    const ns = 16;
    for (let k = 0; k < ns; k++) {
      const a = R() * Math.PI * 2;
      const big = k < 5;
      const d = big ? hexBoundaryDist(a) - 9 - R() * 6 : 8 + R() * (hexBoundaryDist(a) - 14);
      const x = h.x + Math.cos(a) * d;
      const y = h.y + Math.sin(a) * d;
      const r = big ? 3.4 + R() * 2.4 : 1.6 + R() * 1.8;
      const pts: Pt[] = [];
      const n = 6;
      const ph = R() * 6;
      for (let m = 0; m < n; m++) {
        const b = ph + (m / n) * Math.PI * 2;
        const rr = r * (0.75 + R() * 0.45);
        pts.push({ x: x + Math.cos(b) * rr, y: y + Math.sin(b) * rr * 0.72 });
      }
      stoneSh += polyPath(pts.map((p) => ({ x: p.x + r * 0.35, y: p.y + r * 0.45 })));
      stones += polyPath(pts);
      stoneHi += `M${fmt(x - r * 0.5)},${fmt(y - r * 0.25)}l${fmt(r * 0.55)},${fmt(-r * 0.3)}`;
    }
    for (let k = 0; k < 4; k++) {
      const a = R() * Math.PI * 2;
      const d = hexBoundaryDist(a) - 10 - R() * 8;
      const x = h.x + Math.cos(a) * d;
      const y = h.y + Math.sin(a) * d;
      const r = 3.5 + R() * 2.5;
      scrub += blobPath(x, y, r, r * 0.85, R, 7, 0.25);
      scrubHi += blobPath(x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.35, R, 5, 0.2);
    }
    for (let k = 0; k < 3; k++) {
      const a = R() * Math.PI * 2;
      const d = 16 + R() * 16;
      const x = h.x + Math.cos(a) * d;
      const y = h.y + Math.sin(a) * d;
      const b = R() * Math.PI;
      const l = 6 + R() * 6;
      ruts += `M${fmt(x - Math.cos(b) * l)},${fmt(y - Math.sin(b) * l)}q${fmt(Math.cos(b) * l + 2)},${fmt(Math.sin(b) * l - 2)} ${fmt(Math.cos(b) * 2 * l)},${fmt(Math.sin(b) * 2 * l)}`;
    }
  }
  return (
    <g className="broken">
      <path d={dirt} fill={P.dirt} opacity={0.42} />
      <path d={patches} fill={P.dirt} opacity={0.3} />
      <path d={ruts} fill="none" stroke={P.bank} strokeWidth={1.1} opacity={0.45} strokeLinecap="round" />
      <path d={stoneSh} fill="rgba(40,32,18,0.35)" />
      <path d={stones} fill={P.stone} stroke={P.stoneDark} strokeWidth={0.7} />
      <path d={stoneHi} fill="none" stroke={P.stoneLight} strokeWidth={0.9} strokeLinecap="round" />
      {bould.map((b, i) => (
        <g key={i}>
          <path d={b.body} fill="#7a6d58" stroke="#3b3226" strokeWidth={0.8} transform="translate(0 0)" />
          <path d={b.top} fill="#c4b898" />
        </g>
      ))}
      <path d={scrub} fill={P.scrub} />
      <path d={scrubHi} fill={P.leafLight} opacity={0.7} />
    </g>
  );
}

function tent(c: Pt, s: number, R: () => number): { sh: string; lit: string; shade: string; door: string; ridge: string } {
  // A-frame tent seen from above at an angle: ridge running left-right.
  const w = 9 * s;
  const d = 6 * s;
  const lean = (R() - 0.5) * 2;
  const ridgeA = { x: c.x - w / 2 + lean, y: c.y - d * 0.15 };
  const ridgeB = { x: c.x + w / 2 + lean, y: c.y - d * 0.15 };
  const fl = { x: c.x - w / 2 - 1.5, y: c.y + d * 0.55 };
  const fr = { x: c.x + w / 2 - 1.5, y: c.y + d * 0.55 };
  const bl = { x: c.x - w / 2 + 2.5, y: c.y - d * 0.8 };
  const br = { x: c.x + w / 2 + 2.5, y: c.y - d * 0.8 };
  return {
    sh: polyPath([fl, fr, { x: fr.x + 5, y: fr.y + 2.5 }, { x: br.x + 5, y: br.y + 5 }]),
    shade: polyPath([fl, fr, ridgeB, ridgeA]),
    lit: polyPath([ridgeA, ridgeB, br, bl]),
    door: polyPath([
      { x: c.x - w * 0.1 + lean * 0.5, y: c.y + d * 0.55 },
      { x: c.x + w * 0.12 + lean * 0.5, y: c.y + d * 0.55 },
      { x: c.x + lean * 0.8, y: c.y - d * 0.05 },
    ]),
    ridge: `M${fmt(ridgeA.x)},${fmt(ridgeA.y)}L${fmt(ridgeB.x)},${fmt(ridgeB.y)}`,
  };
}

export function paintCamps(ctx: PaintCtx): JSX.Element | null {
  const hs = ctx.hexes.filter((h) => h.t === 'camp');
  if (!hs.length) return null;
  return <g className="camps">{hs.map((h) => campHex(h, h.id))}</g>;
}

function ringPts(h: Pt, radius: number, cap: number, a0: number, a1: number, R: () => number, jit = 0.8): Pt[] {
  const pts: Pt[] = [];
  const steps = 54;
  for (let k = 0; k <= steps; k++) {
    const a = a0 + (k / steps) * (a1 - a0);
    const d = Math.min(hexBoundaryDist(a) * (radius / 43.3), cap) + (R() - 0.5) * jit;
    pts.push({ x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d });
  }
  return pts;
}

export function campHex(h: Pt & { id: number }, key: number): JSX.Element {
  const R = rng(4100 + h.id * 3);
  const gap = 0.34;
  const a0 = Math.PI / 2 + gap;
  const a1 = Math.PI / 2 + Math.PI * 2 - gap;
  const ring = ringPts(h, 36.5, 39.5, a0, a1, R);
  const ringPath = polyPath(ring, false);
  const ditch = polyPath(ringPts(h, 41.5, 45, 0, Math.PI * 2, R, 1.2));
  const ground = polyPath(ringPts(h, 35, 37.5, 0, Math.PI * 2, R, 1));
  const tents: ReturnType<typeof tent>[] = [];
  const spots = [5, 0, 1, 2, 4].filter(() => R() > 0.2);
  if (spots.length < 3) spots.splice(0, spots.length, 5, 1, 4);
  const pos = spots.map((i) => corner(h, i, 25.5)).sort((a, b) => a.y - b.y);
  for (const p of pos) tents.push(tent({ x: p.x, y: p.y + 2 }, 1.35 + R() * 0.2, R));
  const gateL = ring[0];
  const gateR = ring[ring.length - 1];
  return (
    <g key={key}>
      <path d={ditch} fill="none" stroke="#5a4728" strokeWidth={4} opacity={0.4} />
      <path d={ground} fill={P.earth} opacity={0.45} />
      <path d={ringPath} fill="none" stroke={P.earth} strokeWidth={10} opacity={0.75} strokeLinecap="round" />
      <path d={ringPath} fill="none" stroke={P.palisadeDark} strokeWidth={6} strokeOpacity={0.4} transform="translate(1.6 2.6)" strokeLinecap="round" />
      <path d={ringPath} fill="none" stroke={P.palisade} strokeWidth={5.5} strokeLinecap="round" />
      <path d={ringPath} fill="none" stroke={P.palisadeDark} strokeWidth={5.5} strokeDasharray="1 2.4" />
      <path d={ringPath} fill="none" stroke={P.palisadeLight} strokeWidth={1.4} strokeDasharray="2.3 1.1" transform="translate(-0.7 -1.8)" />
      {[gateL, gateR].map((p, i) => (
        <g key={i}>
          <rect x={p.x - 3.2} y={p.y - 7} width={6.4} height={9} fill={P.palisadeDark} rx={1} />
          <rect x={p.x - 2.2} y={p.y - 6.2} width={4.4} height={2.2} fill={P.palisadeLight} rx={0.6} />
        </g>
      ))}
      {tents.map((t, i) => (
        <g key={i}>
          <path d={t.sh} fill="rgba(40,32,18,0.3)" />
          <path d={t.shade} fill={P.canvasShade} stroke="#6f5f40" strokeWidth={0.7} />
          <path d={t.lit} fill={P.canvas} stroke="#6f5f40" strokeWidth={0.7} />
          <path d={t.door} fill="#5a4a30" />
          <path d={t.ridge} stroke="#6f5f40" strokeWidth={0.9} />
        </g>
      ))}
    </g>
  );
}
