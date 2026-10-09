// Summarise ai-balance.ts JSON results as a markdown table (per battle: wins by side, banners, turns, counters).
// Usage: npx vite-node scripts/ai-balance-report.ts -- run-0.json run-1.json ... [--flag 0.85]
import { readFileSync } from 'node:fs';
import { SCENARIOS } from '../src/scenarios';

interface Row {
  sc: string; aSide: string; winner: string; banners: [number, number]; turns: number; reason: string;
  msA: number[]; msB: number[]; c: Record<string, number>; killed?: string[];
}

const args = process.argv.slice(2).filter((a) => a !== '--');
const fi = args.indexOf('--flag');
const flagAt = fi >= 0 ? Number(args[fi + 1]) : 0.85;
const files = args.filter((a, i) => a.endsWith('.json') && (fi < 0 || i !== fi + 1));
const rows: Row[] = files.flatMap((f) => JSON.parse(readFileSync(f, 'utf8')) as Row[]);
const by = new Map<string, Row[]>();
for (const r of rows) by.set(r.sc, [...(by.get(r.sc) ?? []), r]);

const avg = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);
console.log('| Battle | Games | Bottom wins | Top wins | Banners (bottom-top, avg) | Turns (avg, max) | Flag | Notes |');
console.log('|---|---|---|---|---|---|---|---|');
let total = 0;
let flagged = 0;
const all: Record<string, number> = {};
for (const sc of SCENARIOS) {
  const rs = by.get(sc.id);
  if (!rs) continue;
  const n = rs.length;
  const bw = rs.filter((r) => r.winner === 'bottom').length;
  const tw = rs.filter((r) => r.winner === 'top').length;
  const share = Math.max(bw, tw) / Math.max(1, n);
  const flag = share >= flagAt ? (bw > tw ? `bottom ${Math.round(100 * share)}%` : `top ${Math.round(100 * share)}%`) : '';
  if (flag) flagged++;
  total += n;
  const sum: Record<string, number> = {};
  for (const r of rs) for (const [k, v] of Object.entries(r.c)) sum[k] = (sum[k] ?? 0) + v;
  for (const [k, v] of Object.entries(sum)) all[k] = (all[k] ?? 0) + v;
  const notes = Object.entries(sum).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`);
  const sudden = rs.filter((r) => /leaders have fallen/.test(r.reason)).length;
  if (sudden) notes.push(`all-leaders wins ${sudden}`);
  const bot = sc.setup.bottom.army;
  const top = sc.setup.top.army;
  console.log(`| ${sc.id} ${sc.name} | ${n} | ${bw} (${bot}) | ${tw} (${top}) | ${avg(rs.map((r) => r.banners[0])).toFixed(1)}-${avg(rs.map((r) => r.banners[1])).toFixed(1)} | ` +
    `${avg(rs.map((r) => r.turns)).toFixed(0)}, ${Math.max(...rs.map((r) => r.turns))} | ${flag} | ${notes.join(', ')} |`);
}
const ms = rows.flatMap((r) => [...r.msA, ...r.msB]);
console.log(`\nGames ${total}; flagged battles ${flagged}; playCard decision avg ${avg(ms).toFixed(0)} ms, max ${Math.max(0, ...ms).toFixed(0)} ms`);
console.log(`Counters: ${Object.entries(all).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ')}`);
const kills = rows.flatMap((r) => r.killed ?? []);
const alex = kills.filter((k) => /alexander/i.test(k)).length;
console.log(`Leaders killed ${kills.length} (Alexander ${alex})`);
