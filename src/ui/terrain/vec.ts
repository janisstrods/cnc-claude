// 2D vector arithmetic for the terrain painters (screen space: y points down the board).
import type { Pt } from './hexmath';

export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
export const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y;
export const len = (a: Pt) => Math.hypot(a.x, a.y);

/** `a` scaled to length 1 (a zero vector stays zero). */
export const unit = (a: Pt): Pt => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};

/** Unit normal of the segment a->b, to its left in screen space. */
export function leftNormal(a: Pt, b: Pt): Pt {
  const u = unit(sub(b, a));
  return { x: u.y, y: -u.x };
}

/**
 * A joint `p` of a polyline moved `o` along its mitre: `a` and `b` are the unit normals of the segments before and after
 * it (the same one at an end). The mitre is lengthened as the joint turns, at most twofold.
 */
export function mitre(p: Pt, a: Pt, b: Pt, o: number): Pt {
  const m = unit(add(a, b));
  const k = o / Math.max(0.5, dot(m, b));
  return add(p, mul(m, k));
}
