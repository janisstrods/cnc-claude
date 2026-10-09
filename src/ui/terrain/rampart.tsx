// Ramparts (rules-reference §16): an earth bank topped with stakes along each protected hexside of a rampart hex.
// A plain first version; the full rampart piece art comes later.
import { HEX_R } from '../geometry';
import { fmt, neighborRC, type Dir, type PaintCtx, type Pt } from './hexmath';
import { P } from './palette';

/** Engine direction index (E, NE, NW, W, SW, SE: the bits of a rampart mask) -> painter direction (0 E, 1 SE, ... 5 NE). */
const ENGINE_TO_DIR: Dir[] = [0, 5, 4, 3, 2, 1];

/**
 * The protected sides of every rampart hex in `ctx`. `masks[hexId]`: bit i = engine direction i. Each side is found from
 * the centre of the neighbour across it, so a flipped board puts the bank on the right sides.
 */
export function paintRamparts(ctx: PaintCtx, masks: readonly number[]): JSX.Element | null {
  let bank = '';
  let stakes = '';
  for (const h of ctx.hexes) {
    const mask = masks[h.id] ?? 0;
    if (!mask || h.t !== 'rampart') continue;
    for (let i = 0; i < 6; i++) {
      if (!(mask & (1 << i))) continue;
      const [nr, nc] = neighborRC(h.r, h.c, ENGINE_TO_DIR[i]);
      const n = ctx.center(nr, nc);
      const len = Math.hypot(n.x - h.x, n.y - h.y) || 1;
      const u = { x: (n.x - h.x) / len, y: (n.y - h.y) / len }; // towards the protected side
      const v = { x: -u.y, y: u.x }; // along it
      const inset = len / 2 - 7; // the bank sits just inside the hex
      const half = HEX_R / 2 - 4; // a hexside is HEX_R long
      const m: Pt = { x: h.x + u.x * inset, y: h.y + u.y * inset };
      const a: Pt = { x: m.x + v.x * half, y: m.y + v.y * half };
      const b: Pt = { x: m.x - v.x * half, y: m.y - v.y * half };
      bank += `M${fmt(a.x)},${fmt(a.y)}L${fmt(b.x)},${fmt(b.y)}`;
      const s = 3; // stakes lean outwards, towards the enemy
      stakes += `M${fmt(a.x + u.x * s)},${fmt(a.y + u.y * s)}L${fmt(b.x + u.x * s)},${fmt(b.y + u.y * s)}`;
    }
  }
  if (!bank) return null;
  return (
    <g className="ramparts">
      <path d={bank} fill="none" stroke="rgba(40,32,18,0.35)" strokeWidth={13} strokeLinecap="round" transform="translate(1.5 2.5)" />
      <path d={bank} fill="none" stroke={P.earth} strokeWidth={11} strokeLinecap="round" />
      <path d={bank} fill="none" stroke={P.palisadeDark} strokeWidth={1.2} strokeLinecap="round" opacity={0.5} />
      <path d={stakes} fill="none" stroke={P.palisade} strokeWidth={4} strokeDasharray="1.6 2.2" />
    </g>
  );
}
