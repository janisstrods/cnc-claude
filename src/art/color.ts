// Tiny colour helpers: the blends of the miniature art (cached, so they are cheap to call during render), and the colour
// parser the board and the history maps use too.

const cache = new Map<string, string>();

/** The red, green and blue channels (0..255) of a #rrggbb or #rgb colour. */
export function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function toHex(n: number): string {
  const c = Math.max(0, Math.min(255, Math.round(n)));
  return c.toString(16).padStart(2, '0');
}

/** Linear blend of two #rrggbb colours: t = 0 -> a, t = 1 -> b. */
export function mix(a: string, b: string, t: number): string {
  const key = `${a}|${b}|${t}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const out = `#${toHex(r1 + (r2 - r1) * t)}${toHex(g1 + (g2 - g1) * t)}${toHex(b1 + (b2 - b1) * t)}`;
  cache.set(key, out);
  return out;
}

export const darken = (c: string, t: number) => mix(c, '#140c08', t);
export const lighten = (c: string, t: number) => mix(c, '#fff8ea', t);
