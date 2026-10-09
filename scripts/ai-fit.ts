// Fit evaluation weights to self-play outcomes (logistic regression, Newton/IRLS with L2).
// Usage: npx vite-node scripts/ai-fit.ts -- --data dir --features ban,mat,riskMeNow,... [--minTurn 1]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const dir = arg('data', '.');
const feats = arg('features', 'ban,mat').split(',');
const minTurn = Number(arg('minTurn', '1'));
const lambda = Number(arg('lambda', '0.01'));

interface Row { sc: string; side: string; turn: number; y: number; f: Record<string, number>; game: number }
const rows: Row[] = [];
let game = 0;
for (const file of readdirSync(dir).filter((x) => x.endsWith('.jsonl'))) {
  let lastTurn = 1e9;
  for (const line of readFileSync(join(dir, file), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const r = JSON.parse(line) as Row;
    if (r.turn < lastTurn - 0) {
      if (r.turn < lastTurn) game++;
    }
    lastTurn = r.turn;
    r.game = game + 100000 * rows.length * 0;
    rows.push(r);
  }
  game++;
}
const data = rows.filter((r) => r.turn >= minTurn);
const prior = [...new Set(data.map((r) => `${r.sc}_${r.side}`))].sort();
const names = [...feats, ...prior.map((p) => `P${p}`)];
const X = data.map((r) => [...feats.map((k) => r.f[k] ?? 0), ...prior.map((p) => (`${r.sc}_${r.side}` === p ? 1 : 0))]);
const Y = data.map((r) => r.y);
const test = data.map((r) => r.game % 5 === 0);
const n = names.length;

function solve(A: number[][], b: number[]): number[] {
  const m = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < m; c++) {
    let p = c;
    for (let r = c + 1; r < m; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = 0; r < m; r++) {
      if (r === c) continue;
      const f = M[r][c] / d;
      if (!f) continue;
      for (let k = c; k <= m; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[m] / (row[i] || 1e-12));
}

const w = new Array(n).fill(0);
const sig = (z: number) => 1 / (1 + Math.exp(-z));
for (let it = 0; it < 25; it++) {
  const H = Array.from({ length: n }, () => new Array(n).fill(0));
  const g = new Array(n).fill(0);
  for (let i = 0; i < X.length; i++) {
    if (test[i]) continue;
    const x = X[i];
    let z = 0;
    for (let j = 0; j < n; j++) z += w[j] * x[j];
    const p = sig(z);
    const e = p - Y[i];
    const ww = p * (1 - p);
    for (let j = 0; j < n; j++) {
      if (!x[j]) continue;
      g[j] += e * x[j];
      for (let k = 0; k < n; k++) if (x[k]) H[j][k] += ww * x[j] * x[k];
    }
  }
  const N = X.length;
  for (let j = 0; j < n; j++) {
    const l = j < feats.length ? lambda * N * 0.001 : lambda * N * 0.01;
    g[j] += l * w[j];
    H[j][j] += l + 1e-9;
  }
  const step = solve(H, g);
  let mx = 0;
  for (let j = 0; j < n; j++) {
    w[j] -= step[j];
    mx = Math.max(mx, Math.abs(step[j]));
  }
  if (mx < 1e-6) break;
}
function loss(sel: boolean): { ll: number; acc: number; n: number } {
  let ll = 0;
  let acc = 0;
  let c = 0;
  for (let i = 0; i < X.length; i++) {
    if (test[i] !== sel) continue;
    let z = 0;
    for (let j = 0; j < n; j++) z += w[j] * X[i][j];
    const p = Math.min(1 - 1e-9, Math.max(1e-9, sig(z)));
    ll += -(Y[i] * Math.log(p) + (1 - Y[i]) * Math.log(1 - p));
    acc += (p > 0.5 ? 1 : 0) === Y[i] ? 1 : 0;
    c++;
  }
  return { ll: ll / c, acc: acc / c, n: c };
}
console.log(`rows ${data.length} games ${game}`);
const tr = loss(false);
const te = loss(true);
console.log(`train ll ${tr.ll.toFixed(4)} acc ${tr.acc.toFixed(3)} | test ll ${te.ll.toFixed(4)} acc ${te.acc.toFixed(3)} (n=${te.n})`);
const scaleBy = feats.includes('mat') ? w[feats.indexOf('mat')] : 1;
for (let j = 0; j < feats.length; j++) {
  console.log(`${feats[j].padEnd(14)} ${w[j].toFixed(4)}   (relative to mat: ${(w[j] / scaleBy).toFixed(3)})`);
}
