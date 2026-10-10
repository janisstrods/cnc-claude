// Checks battle histories with the validator and prints their sizes.
// Usage: npx vite-node scripts/history-check.ts -- [ids...]   (no ids: every history)
import { historyIds, loadHistory } from '../src/history';
import { validateHistory, words } from '../src/history/validate';

const ids = process.argv.slice(2).filter((a) => a !== '--');
let bad = 0;
for (const id of ids.length ? ids : historyIds()) {
  try {
    const h = await loadHistory(id);
    const problems = validateHistory(h);
    const cw = h.context.text.reduce((n, p) => n + words(p), 0);
    const ow = h.outcome.text.reduce((n, p) => n + words(p), 0) + (h.outcome.losses ? words(h.outcome.losses) : 0);
    const caps = h.map.phases.map((p) => words(p.caption)).join('/');
    if (problems.length) {
      bad++;
      console.log(problems.join('\n'));
    } else {
      console.log(`${id}: ok — context ${cw} words, outcome ${ow} words, ${h.map.units.length} units, ${h.map.phases.length} phases (captions ${caps} words)`);
    }
  } catch (e) {
    bad++;
    console.log(`${id}: ${String(e)}`);
  }
}
process.exit(bad ? 1 : 0);
