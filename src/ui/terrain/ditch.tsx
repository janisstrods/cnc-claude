// The ditch (Expansion #2, 212 Bruttium, rules-reference §18.6): a dug trench through the ditch hexes, joined across
// neighbouring ditch hexes, with the spoil heaped in a bank along one side. Every unit and leader entering it stops, so
// it is drawn as a deep, dark cut (a river bed without water) rather than as rough ground. A trench reaching the board
// edge runs on under the frame; elsewhere it ends short of the hexside. The bank lies on the side of the board's bottom
// army (Crassus' Romans in 212) and turns with the board; light comes from the upper left, as for the hills.
import { blobPath } from './field';
import { hexChains } from './chains';
import { fmt, polyPath, type PaintCtx, type Pt } from './hexmath';
import { fbm, rng } from './noise';
import { P } from './palette';
import { sub, unit } from './vec';

/** Distance from the centre line to the crest of the spoil bank. */
const BANK = 17;
/** A trench ending inside the board stops this far past the centre of its last hex. */
const STUB = 27;

/**
 * Key points of every trench: runs of ditch hexes (centres), with their free ends extended. The trench joins neighbouring
 * ditch hexes along a spanning tree, so a clump of three never digs a triangle: links along a row first (a row of ditch
 * hexes is one straight trench), then the diagonals, those into the busier hexes first (a spur joins the main trench, not
 * its end). A lone ditch hex has a trench across it, along the board's rows.
 */
function trenchChains(ctx: PaintCtx): Pt[][] {
  return hexChains(ctx, (h) => h.t === 'ditch', STUB, { busy: true }).map((ch) => ch.pts);
}

/** Catmull-Rom curve through the key points, sampled every few pixels, with a slight hand-dug wobble. */
function sampleCurve(keys: Pt[], seed: number): Pt[] {
  const out: Pt[] = [];
  const at = (i: number) => keys[Math.max(0, Math.min(keys.length - 1, i))];
  for (let i = 0; i < keys.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const n = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 3));
    for (let s = i === 0 ? 0 : 1; s <= n; s++) {
      const t = s / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  // wobble across the line (a pixel or so)
  return out.map((p, i) => {
    const a = out[Math.max(0, i - 1)];
    const b = out[Math.min(out.length - 1, i + 1)];
    const t = unit(sub(b, a));
    const w = (fbm(p.x / 23, p.y / 23, seed) - 0.5) * 2.4;
    return { x: p.x - t.y * w, y: p.y + t.x * w };
  });
}

/** The polyline moved sideways by `o(i)` (positive to the left of the direction of travel, in screen space). */
function offset(pts: Pt[], o: (i: number) => number): Pt[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const t = unit(sub(b, a));
    const k = o(i);
    return { x: p.x + t.y * k, y: p.y - t.x * k };
  });
}

/** Every ditch hex of `ctx`. */
export function paintDitches(ctx: PaintCtx): JSX.Element | null {
  const chains = trenchChains(ctx);
  if (!chains.length) return null;
  // the bank goes on the side of the board's bottom army: down the screen (up on a flipped board); for a trench running
  // up and down the board, on its right-hand side
  const down = ctx.flipped ? -1 : 1;
  let trench = '';
  let bank = '';
  let clods = '';
  let clodsLit = '';
  let stones = '';
  let tufts = '';
  const R = rng(7331 + ctx.hexes.filter((h) => h.t === 'ditch')[0].id);
  chains.forEach((keys, ci) => {
    const pts = sampleCurve(keys, 90 + ci);
    if (pts.length < 2) return;
    const t = unit(sub(pts[pts.length - 1], pts[0]));
    const left = { x: t.y, y: -t.x }; // offset() moves positive amounts this way
    const side = Math.abs(left.y) > 0.3 ? Math.sign(left.y) * down : Math.sign(left.x) * down;
    trench += polyPath(pts, false);
    const crest = offset(pts, (i) => side * (BANK + (fbm(i / 9, ci, 47) - 0.5) * 3));
    bank += polyPath(crest, false);
    // clods heaped along the bank, a few stones in the bottom, grass tufts on the far lip
    for (let i = 2; i < crest.length - 2; i += 3 + Math.floor(R() * 3)) {
      const p = crest[i];
      const s = 1.6 + R() * 2.2;
      const off = (R() - 0.5) * 9;
      const q = { x: p.x + left.x * side * off, y: p.y + left.y * side * off };
      clods += blobPath(q.x, q.y, s, s * 0.8, R, 6, 0.25);
      if (R() < 0.6) clodsLit += blobPath(q.x - s * 0.3, q.y - s * 0.35, s * 0.5, s * 0.4, R, 5, 0.2);
    }
    for (let i = 4; i < pts.length - 4; i += 9 + Math.floor(R() * 8)) {
      const p = pts[i];
      const s = 1.2 + R() * 1.3;
      stones += blobPath(p.x + (R() - 0.5) * 4, p.y + (R() - 0.5) * 4, s, s * 0.75, R, 5, 0.2);
    }
    const lip = offset(pts, () => -side * 12.5);
    for (let i = 3; i < lip.length - 3; i += 6 + Math.floor(R() * 6)) {
      const p = lip[i];
      const h = 3 + R() * 2.5;
      tufts += `M${fmt(p.x)},${fmt(p.y)}l-1.6,${fmt(-h * 0.8)}M${fmt(p.x)},${fmt(p.y)}l0.2,${fmt(-h)}M${fmt(p.x)},${fmt(p.y)}l1.7,${fmt(-h * 0.75)}`;
    }
  });
  const round = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  // the trench is a pit: the rim on the upper left throws its shadow over the bottom and the far wall, while the wall
  // below right of the bottom catches the light; the bank is a mound, lit on its upper left
  return (
    <g className="ditches">
      <path d={trench} {...round} stroke={P.verge} strokeWidth={46} opacity={0.28} />
      <path d={bank} {...round} stroke="rgba(40,32,18,0.36)" strokeWidth={17} transform="translate(2 3)" />
      <path d={bank} {...round} stroke={P.earthShade} strokeWidth={16} />
      <path d={bank} {...round} stroke={P.earth} strokeWidth={11} transform="translate(-1.2 -1.6)" />
      <path d={bank} {...round} stroke={P.earthLight} strokeWidth={4.5} opacity={0.75} transform="translate(-2.4 -3)" />
      <path d={clods} fill={P.earthShade} />
      <path d={clodsLit} fill={P.earthLight} opacity={0.85} />
      <path d={trench} {...round} stroke={P.earthLight} strokeWidth={24} opacity={0.85} />
      <path d={trench} {...round} stroke={P.earth} strokeWidth={21} />
      <path d={trench} {...round} stroke={P.earthShade} strokeWidth={18} transform="translate(-0.6 -0.8)" />
      <path d={trench} {...round} stroke={P.ditch} strokeWidth={14} transform="translate(-1.5 -2.1)" />
      <path d={trench} {...round} stroke="#3e301b" strokeWidth={6} transform="translate(-0.9 -1.2)" />
      <path d={stones} fill={P.stone} stroke={P.stoneDark} strokeWidth={0.6} opacity={0.85} />
      <path d={tufts} fill="none" stroke={P.tuftDark} strokeWidth={0.9} strokeLinecap="round" opacity={0.7} />
    </g>
  );
}
