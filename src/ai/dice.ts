// Exact dice outcome distributions for the combat estimator.

/** Per-die probabilities: class hit, sword hit, helmet hit, flag; plus ignored swords / red squares. */
export interface Prof {
  n: number;
  pc: number;
  ps: number;
  ph: number;
  pf: number;
  sw: number;
  rd: number;
}

const cache = new Map<number, Float64Array>();

const q = (x: number) => Math.round(x * 60);

/**
 * Joint distribution of (hits, flags): out[h * (n + 1) + f].
 * Ignored swords/red squares are consumed in roll order (first k swords do not hit).
 */
export function strikeDist(p: Prof): Float64Array {
  const sw = Math.min(2, p.sw);
  const rd = Math.min(1, p.rd);
  const key = (((((sw * 2 + rd) * 64 + q(p.pf)) * 64 + q(p.ph)) * 64 + q(p.ps)) * 64 + q(p.pc)) * 16 + p.n;
  const hit = cache.get(key);
  if (hit) return hit;
  const n = p.n;
  const W = n + 1;
  const S = sw + 1;
  const R = rd + 1;
  const size = W * W * S * R;
  const ix = (h: number, f: number, a: number, b: number) => ((h * W + f) * S + a) * R + b;
  let cur = new Float64Array(size);
  cur[ix(0, 0, sw, rd)] = 1;
  const pb = Math.max(0, 1 - p.pc - p.ps - p.ph - p.pf);
  for (let d = 0; d < n; d++) {
    const nxt = new Float64Array(size);
    for (let h = 0; h <= d; h++) {
      for (let f = 0; h + f <= d; f++) {
        for (let a = 0; a < S; a++) {
          for (let b = 0; b < R; b++) {
            const pr = cur[ix(h, f, a, b)];
            if (!pr) continue;
            if (p.pc) {
              if (b > 0) nxt[ix(h, f, a, b - 1)] += pr * p.pc;
              else nxt[ix(h + 1, f, a, b)] += pr * p.pc;
            }
            if (p.ps) {
              if (a > 0) nxt[ix(h, f, a - 1, b)] += pr * p.ps;
              else nxt[ix(h + 1, f, a, b)] += pr * p.ps;
            }
            if (p.ph) nxt[ix(h + 1, f, a, b)] += pr * p.ph;
            if (p.pf) nxt[ix(h, f + 1, a, b)] += pr * p.pf;
            if (pb > 0) nxt[ix(h, f, a, b)] += pr * pb;
          }
        }
      }
    }
    cur = nxt;
  }
  const out = new Float64Array(W * W);
  for (let h = 0; h <= n; h++) {
    for (let f = 0; h + f <= n; f++) {
      let t = 0;
      for (let a = 0; a < S; a++) for (let b = 0; b < R; b++) t += cur[ix(h, f, a, b)];
      out[h * W + f] = t;
    }
  }
  cache.set(key, out);
  return out;
}

const binomCache = new Map<number, Float64Array>();

/** Binomial pmf over 0..n with success probability p (p rounded to 1/600). */
export function binom(n: number, p: number): Float64Array {
  const pk = Math.round(Math.min(1, Math.max(0, p)) * 600);
  const key = pk * 32 + n;
  const hit = binomCache.get(key);
  if (hit) return hit;
  const pp = pk / 600;
  const out = new Float64Array(n + 1);
  let c = 1;
  for (let k = 0; k <= n; k++) {
    out[k] = c * Math.pow(pp, k) * Math.pow(1 - pp, n - k);
    c = (c * (n - k)) / (k + 1);
  }
  binomCache.set(key, out);
  return out;
}

/** P(at least one helmet) with n dice. */
export function pAnyHelmet(n: number): number {
  return n <= 0 ? 0 : 1 - Math.pow(5 / 6, n);
}
