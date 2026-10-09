// Forests (painted tree clumps toward the hex rim) and marshes (mud, pools and reeds).
import { blobPath, isoPath } from './field';
import { fmt, hexBoundaryDist, type PaintCtx } from './hexmath';
import { regionGrid } from './hills';
import { rng } from './noise';
import { P } from './palette';

interface Tree {
  x: number;
  y: number;
  r: number;
  tone: number;
  seed: number;
}

const LEAF = [
  ['#34501f', '#4f7330', '#7d9d45'],
  ['#2f4a22', '#47693a', '#6f9150'],
  ['#3b5320', '#5b7a2c', '#93a548'],
];

function treeNodes(t: Tree, key: string | number): JSX.Element {
  const R = rng(t.seed);
  const [dark, mid, light] = LEAF[t.tone];
  const r = t.r;
  return (
    <g key={key}>
      <ellipse cx={t.x + r * 0.35} cy={t.y + r * 0.45} rx={r * 1.05} ry={r * 0.78} fill={P.treeShadow} />
      <path d={blobPath(t.x, t.y, r, r * 0.95, R, 8, 0.14)} fill={dark} />
      <path d={blobPath(t.x - r * 0.16, t.y - r * 0.2, r * 0.74, r * 0.7, R, 7, 0.16)} fill={mid} />
      <path d={blobPath(t.x - r * 0.34, t.y - r * 0.38, r * 0.36, r * 0.32, R, 6, 0.2)} fill={light} opacity={0.9} />
    </g>
  );
}

export function forestTrees(cx: number, cy: number, seed: number, scale = 1): Tree[] {
  const R = rng(seed);
  const trees: Tree[] = [];
  const n = 11;
  const ph = R() * Math.PI * 2;
  for (let k = 0; k < n; k++) {
    const a = ph + (k / n) * Math.PI * 2 + (R() - 0.5) * 0.35;
    const r = (9 + R() * 4.5) * scale;
    const d = hexBoundaryDist(a) * scale - r * 0.8 - R() * 3;
    trees.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r, tone: Math.floor(R() * 3), seed: Math.floor(R() * 1e9) });
  }
  // a second, inner and smaller ring with gaps (keeps the hex centre readable)
  const m = 4;
  const ph2 = R() * Math.PI * 2;
  for (let k = 0; k < m; k++) {
    if (R() < 0.3) continue;
    const a = ph2 + (k / m) * Math.PI * 2 + (R() - 0.5) * 0.5;
    const r = (6.5 + R() * 2.5) * scale;
    const d = (20 + R() * 4) * scale;
    trees.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r, tone: Math.floor(R() * 3), seed: Math.floor(R() * 1e9) });
  }
  return trees;
}

export function paintForests(ctx: PaintCtx): JSX.Element | null {
  const hs = ctx.hexes.filter((h) => h.t === 'forest');
  if (!hs.length) return null;
  const g = regionGrid(ctx, 'forest', 3, 3, 0.28, 16, 31);
  const floor = isoPath(g, 0.5);
  const floorIn = isoPath(g, 0.85);
  const trees: Tree[] = [];
  for (const h of hs) trees.push(...forestTrees(h.x, h.y, 5000 + h.id * 13 + (ctx.flipped ? 1 : 0)));
  trees.sort((a, b) => a.y - b.y);
  // faint canopy masses in the middle: reads as woodland without hiding the unit on top
  let canopy = '';
  let canopyHi = '';
  const C = rng(77 + hs[0].id);
  for (const h of hs) {
    const n = 6;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + C() * 0.6;
      const d = 9 + C() * 9;
      const x = h.x + Math.cos(a) * d;
      const y = h.y + Math.sin(a) * d;
      const r = 9 + C() * 4;
      canopy += blobPath(x, y, r, r * 0.9, C, 8, 0.14);
      canopyHi += blobPath(x - r * 0.25, y - r * 0.3, r * 0.5, r * 0.42, C, 6, 0.2);
    }
  }
  // undergrowth dots
  let under = '';
  const R = rng(99 + hs[0].id);
  for (const h of hs) {
    for (let k = 0; k < 10; k++) {
      const a = R() * Math.PI * 2;
      const d = 10 + R() * 26;
      const x = h.x + Math.cos(a) * d;
      const y = h.y + Math.sin(a) * d;
      under += `M${fmt(x)},${fmt(y)}m-2,0a2,1.6 0 1,0 4,0a2,1.6 0 1,0 -4,0`;
    }
  }
  return (
    <g className="forests">
      <path d={floor} fill={P.forestFloor} opacity={0.75} />
      <path d={floorIn} fill="#4c6630" opacity={0.45} />
      <path d={canopy} fill={P.leafMid} opacity={0.5} />
      <path d={canopyHi} fill={P.leafLight} opacity={0.25} />
      <path d={under} fill={P.leafDark} opacity={0.35} />
      {trees.map((t, i) => treeNodes(t, i))}
    </g>
  );
}

export function paintMarsh(ctx: PaintCtx): JSX.Element | null {
  const hs = ctx.hexes.filter((h) => h.t === 'marsh');
  if (!hs.length) return null;
  const g = regionGrid(ctx, 'marsh', 3, 3, 0.35, 14, 41);
  const mud = isoPath(g, 0.5);
  const R = rng(321 + hs[0].id);
  let pools = '';
  let poolHi = '';
  let reeds = '';
  let reedsLight = '';
  let heads = '';
  for (const h of hs) {
    const np = 5;
    const ph = R() * Math.PI * 2;
    for (let k = 0; k < np; k++) {
      const a = ph + (k / np) * Math.PI * 2 + (R() - 0.5) * 0.6;
      const d = 14 + R() * 18;
      const x = h.x + Math.cos(a) * d;
      const y = h.y + Math.sin(a) * d * 0.9;
      const rx = 6 + R() * 6;
      const ry = 3 + R() * 2.5;
      pools += blobPath(x, y, rx, ry, R, 7, 0.22, (R() - 0.5) * 0.6);
      poolHi += `M${fmt(x - rx * 0.4)},${fmt(y - ry * 0.2)}l${fmt(rx * 0.5)},0`;
    }
    const nr = 8;
    const ph2 = R() * Math.PI * 2;
    for (let k = 0; k < nr; k++) {
      const a = ph2 + (k / nr) * Math.PI * 2 + (R() - 0.5) * 0.5;
      const d = hexBoundaryDist(a) - 9 - R() * 8;
      const x = h.x + Math.cos(a) * d;
      const y = h.y + Math.sin(a) * d;
      const blades = 5 + Math.floor(R() * 3);
      for (let m = 0; m < blades; m++) {
        const off = (m - (blades - 1) / 2) * 1.5;
        const lean = off * 0.6 + (R() - 0.5) * 1.5;
        const hgt = 7 + R() * 6;
        const seg = `M${fmt(x + off)},${fmt(y)}q${fmt(lean * 0.3)},${fmt(-hgt * 0.5)} ${fmt(lean)},${fmt(-hgt)}`;
        if (m % 2) reedsLight += seg;
        else reeds += seg;
        if (m === 1 || m === blades - 2) heads += `M${fmt(x + off + lean - 0.9)},${fmt(y - hgt + 0.5)}h1.8v-3.6h-1.8z`;
      }
    }
  }
  return (
    <g className="marsh">
      <path d={mud} fill={P.mud} opacity={0.6} />
      <path d={pools} fill={P.pool} stroke={P.bank} strokeWidth={0.9} strokeOpacity={0.6} />
      <path d={poolHi} fill="none" stroke={P.poolLight} strokeWidth={1.2} strokeLinecap="round" opacity={0.8} />
      <path d={reeds} fill="none" stroke={P.reedDark} strokeWidth={1.1} strokeLinecap="round" />
      <path d={reedsLight} fill="none" stroke={P.reed} strokeWidth={1} strokeLinecap="round" />
      <path d={heads} fill="#5a4426" />
    </g>
  );
}

