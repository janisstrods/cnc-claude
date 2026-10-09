// Behaviour statistics over AI-vs-AI games (sanity checks for silly play).
// Usage: npx vite-node scripts/ai-stats.ts -- [--diff tribune] [--games 15] [--scale 0.3] [--shard 0/1]
import { CARD_LIST, GameDriver, UNIT_STATS, areAdjacent, createGame, type CardKind, type GameState, type Side } from '../src/engine';
import { SCENARIOS } from '../src/scenarios';
import { chooseAnswer, newMemory, personalityFor, type AiOptions, type Difficulty } from '../src/ai';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const diff = arg('diff', 'tribune') as Difficulty;
const games = Number(arg('games', '15'));
const scale = Number(arg('scale', '0.3'));
const [shard, shards] = arg('shard', '0/1').split('/').map(Number);

const stat = {
  turns: 0, clash: 0, clashUnits: 0, firstStrike: 0, cards: {} as Record<string, number>,
  mountedTurns: 0, mountedAttackTurns: 0, attacks: 0, mountedAttacks: 0,
  moves: 0, backAndForth: 0, weakExposed: 0, weakTotal: 0, loneLeaderInContact: 0, leadersKilled: 0, games: 0,
  dumpedDeadCards: 0, turnsWithoutAttack: 0,
};

function endOfTurnChecks(s: GameState, side: Side) {
  for (const u of s.units) {
    if (u.side !== side || u.hex < 0 || u.blocks !== 1) continue;
    stat.weakTotal++;
    if (s.units.some((e) => e.side !== side && e.hex >= 0 && areAdjacent(e.hex, u.hex) && e.blocks > 1)) stat.weakExposed++;
  }
  for (const l of s.leaders) {
    if (l.side !== side || l.hex < 0) continue;
    if (s.units.some((u) => u.side === side && u.hex === l.hex)) continue;
    if (s.units.some((e) => e.side !== side && e.hex >= 0 && areAdjacent(e.hex, l.hex))) stat.loneLeaderInContact++;
  }
}

for (let g = shard; g < games; g += shards) {
  const sc = SCENARIOS[g % SCENARIOS.length];
  const d = new GameDriver(createGame(sc.setup, 31 * g + 5));
  const opts: Record<Side, AiOptions> = {
    top: { side: 'top', difficulty: diff, personality: personalityFor(sc.setup.top.commander, sc.setup.top.army), seed: g * 2 + 1, budgetScale: scale },
    bottom: { side: 'bottom', difficulty: diff, personality: personalityFor(sc.setup.bottom.commander, sc.setup.bottom.army), seed: g * 2 + 2, budgetScale: scale },
  };
  const mems = { top: newMemory(), bottom: newMemory() };
  // last move of each unit: [from, to, turn]
  const lastMove = new Map<string, { from: number; to: number; turn: number }>();
  let turnSide: Side | null = null;
  let attacked = false;
  let mountedOrdered = false;
  let mountedAttacked = false;
  const battledThisTurn = new Set<string>();
  let steps = 0;
  while (!d.over && steps++ < 20000) {
    const dec = d.pending!;
    if (dec.kind === 'playCard') {
      if (turnSide) {
        endOfTurnChecks(d.state, turnSide);
        stat.turns++;
        if (!attacked) stat.turnsWithoutAttack++;
        if (mountedOrdered) stat.mountedTurns++;
        if (mountedAttacked) stat.mountedAttackTurns++;
      }
      turnSide = dec.side;
      attacked = false;
      mountedOrdered = false;
      mountedAttacked = false;
      battledThisTurn.clear();
    }
    const before = d.state;
    d.answer(chooseAnswer(d.state, dec, opts[dec.side], mems[dec.side]).answer);
    for (const { e } of d.drainEvents()) {
      if (e.t === 'cardPlayed') {
        const k = e.kind as CardKind;
        stat.cards[k] = (stat.cards[k] ?? 0) + 1;
        if (e.effective === 'clash') stat.clash++;
      } else if (e.t === 'ordered') {
        if (d.state.turn.effective === 'clash') stat.clashUnits += e.ids.length;
        if (e.ids.some((id) => { const u = before.units.find((x) => x.id === id) ?? d.state.units.find((x) => x.id === id); return u && UNIT_STATS[u.type].mounted; })) mountedOrdered = true;
      } else if (e.t === 'combat' && (e.purpose === 'close' || e.purpose === 'ranged' || e.purpose === 'evade')) {
        const a = before.units.find((x) => x.id === e.attacker) ?? d.state.units.find((x) => x.id === e.attacker);
        if (a && a.side === turnSide) {
          attacked = true;
          stat.attacks++;
          battledThisTurn.add(a.id);
          if (UNIT_STATS[a.type].mounted) {
            stat.mountedAttacks++;
            mountedAttacked = true;
          }
        }
      } else if (e.t === 'move' && e.path.length >= 2) {
        const from = e.path[0];
        const to = e.path[e.path.length - 1];
        stat.moves++;
        const prev = lastMove.get(e.id);
        const turn = d.state.turn.number;
        if (prev && prev.turn === turn - 2 && prev.from === to && prev.to === from && !battledThisTurn.has(e.id)) stat.backAndForth++;
        lastMove.set(e.id, { from, to, turn });
      } else if (e.t === 'leaderKilled') stat.leadersKilled++;
      else if (e.t === 'firstStrike' as string) stat.firstStrike++;
      else if (e.t === 'log' && /First Strike/.test(e.text)) stat.firstStrike++;
    }
  }
  stat.games++;
}
const pct = (a: number, b: number) => `${((100 * a) / Math.max(1, b)).toFixed(1)}%`;
console.log(JSON.stringify({
  diff, games: stat.games, turns: stat.turns,
  clashPlayed: stat.clash, clashAvgUnits: (stat.clashUnits / Math.max(1, stat.clash)).toFixed(1),
  firstStrikePlayed: stat.firstStrike,
  turnsWithAttack: pct(stat.turns - stat.turnsWithoutAttack, stat.turns),
  mountedOrderedTurns: pct(stat.mountedTurns, stat.turns), mountedAttackTurns: pct(stat.mountedAttackTurns, stat.turns),
  attacksPerTurn: (stat.attacks / Math.max(1, stat.turns)).toFixed(2), mountedShareOfAttacks: pct(stat.mountedAttacks, stat.attacks),
  backAndForthMoves: `${stat.backAndForth} of ${stat.moves} moves (${pct(stat.backAndForth, stat.moves)})`,
  oneBlockUnitsLeftInContact: `${stat.weakExposed} of ${stat.weakTotal} unit-turns (${pct(stat.weakExposed, stat.weakTotal)})`,
  loneLeaderInContactTurns: stat.loneLeaderInContact, leadersKilledPerGame: (stat.leadersKilled / Math.max(1, stat.games)).toFixed(2),
  topCards: Object.entries(stat.cards).sort((a, b) => b[1] - a[1]).slice(0, 8),
}, null, 1));
void CARD_LIST;
