// Play review: print AI turns (card, orders, moves, battles, commentary) with an ASCII board.
// Usage: npx vite-node scripts/ai-review.ts -- --scenario 007 [--diff tribune] [--opp tribune|random] [--turns 10] [--seed 1]
import {
  CARD_DEFS, CARD_LIST, GameDriver, createGame, hexLabel, randomAnswer, type GameEvent, type GameState, type Side,
} from '../src/engine';
import { scenarioById } from '../src/scenarios';
import { evaluate } from '../src/ai/evaluate';
import { weightsFor } from '../src/ai/values';
import { personalityFor, type AiOptions, type Difficulty } from '../src/ai';
import { arg, lcg, playAiGame } from './lib';

const scId = arg('scenario', '007');
const diff = arg('diff', 'tribune') as Difficulty;
const opp = arg('opp', 'tribune');
const maxTurns = Number(arg('turns', '12'));
const seed = Number(arg('seed', '1'));
const info = scenarioById(scId);
const d = new GameDriver(createGame(info.setup, seed));

const TER: Record<string, string> = { plain: '.', hill: 'h', forest: 'f', marsh: 'm', broken: 'b', river: '~', lake: 'L', camp: 'c', steep: 'S', void: ' ' };

function board(s: GameState): string {
  const lines: string[] = [];
  for (let r = 0; r < 9; r++) {
    let line = r % 2 ? '   ' : '';
    for (let c = 0; c < (r % 2 ? 12 : 13); c++) {
      const h = r * 13 + c;
      const u = s.units.find((x) => x.hex === h);
      const l = s.leaders.find((x) => x.hex === h);
      let cell: string;
      if (u) cell = `${u.side === 'top' ? 't' : 'b'}${u.type}${u.blocks}${l ? '*' : ''}`;
      else if (l) cell = `${l.side === 'top' ? 't' : 'b'}*${l.name.slice(0, 3)}`;
      else cell = s.terrain[h] === 'river' && s.fords[h] ? 'd' : TER[s.terrain[h]];
      line += cell.padEnd(6);
    }
    lines.push(`${r} ${line}`);
  }
  return lines.join('\n');
}

const name = (s: GameState, id: string) => {
  const u = s.units.find((x) => x.id === id);
  if (u) return `${u.side[0]}${u.type}(${u.id}@${hexLabel(u.hex)},${u.blocks})`;
  const l = s.leaders.find((x) => x.id === id);
  if (l) return `${l.side[0]}*${l.name || l.id}@${l.hex >= 0 ? hexLabel(l.hex) : 'off'}`;
  return id;
};

function describe(e: GameEvent, s: GameState): string | null {
  switch (e.t) {
    case 'cardPlayed': return `  CARD ${CARD_DEFS[e.kind].title}${e.effective !== e.kind ? ` -> ${CARD_DEFS[e.effective].title}` : ''}`;
    case 'ordered': return `  ORDERED ${e.ids.map((id) => name(s, id)).join(' ')}`;
    case 'move': return `  move ${e.id} ${e.path.map((h) => (h >= 0 ? hexLabel(h) : 'OFF')).join('>')}`;
    case 'combat': return `  ${e.purpose.toUpperCase()} ${e.attacker} -> ${e.target} (${e.dice} dice)`;
    case 'roll': return `     roll [${e.faces.map((f, i) => (e.scoring[i] ? f.toUpperCase() : f)).join(' ')}]`;
    case 'damage': return `     ${e.id} -${e.amount} (${e.left} left) ${e.reason}`;
    case 'eliminated': return `     ${e.id} ELIMINATED`;
    case 'removed': return `     ${e.id} REMOVED (${e.reason}, no banner)`;
    case 'leaderKilled': return `     leader ${e.id} KILLED`;
    case 'flags': return `     ${e.id} flags ${e.flags} ignored ${e.ignored}`;
    case 'retreat': return `     ${e.id} retreats ${e.path.map(hexLabel).join('>')}`;
    case 'evade': return `     ${e.id} evades ${e.path.map(hexLabel).join('>')}`;
    case 'leaderEvade': return `     leader ${e.id} evades ${e.path.map((h) => (h >= 0 ? hexLabel(h) : 'OFF')).join('>')}`;
    case 'advance': return `     ${e.id} advances ${e.path.map(hexLabel).join('>')}`;
    case 'banner': return `  BANNER ${e.side} -> ${e.total} (${e.reason})`;
    case 'rallied': return `     ${e.id} rallied +${e.blocks}`;
    case 'log': return `  · ${e.text}`;
    case 'victory': return `  VICTORY ${e.winner}: ${e.reason}`;
    default: return null;
  }
}

const opts: Record<Side, AiOptions> = {
  top: { side: 'top', difficulty: diff, personality: personalityFor(info.setup.top.commander, info.setup.top.army), seed: seed * 11 + 1 },
  bottom: { side: 'bottom', difficulty: diff, personality: personalityFor(info.setup.bottom.commander, info.setup.bottom.army), seed: seed * 11 + 2 },
};
const aiSide = arg('side', 'both');
const rnd = lcg(seed);
console.log(`${info.id} ${info.name}: top=${info.setup.top.army} (${opts.top.personality.name}) bottom=${info.setup.bottom.army} (${opts.bottom.personality.name})`);
console.log(board(d.state));
let lastTurn = 0;
let before = d.state;
playAiGame(d, opts, {
  maxTurn: maxTurns,
  before: (dec) => {
    const s = d.state;
    if (dec.kind === 'playCard' && s.turn.number !== lastTurn) {
      lastTurn = s.turn.number;
      console.log(board(s));
      const ev = evaluate(s, dec.side, dec.side === 'top' ? 'bottom' : 'top', weightsFor(opts[dec.side].personality));
      console.log(`\n=== Turn ${s.turn.number}: ${s.players[dec.side].army} (${dec.side}) banners ${s.players.bottom.banners}b-${s.players.top.banners}t; eval(now)=${ev.toFixed(3)}; hand: ${s.players[dec.side].hand.map((c) => CARD_LIST[c]).join(', ')}`);
    }
  },
  answer: (dec) => {
    const isAi = (aiSide === 'both' || aiSide === dec.side) && !(opp === 'random' && aiSide !== 'both' && dec.side !== aiSide);
    return isAi ? undefined : randomAnswer(d.state, dec, rnd);
  },
  chosen: (dec, ans, ai) => {
    if (ai) {
      if (dec.kind === 'playCard') {
        const m = ai.mem.last;
        console.log(`  think ${m?.ms.toFixed(0)}ms sims=${m?.sims} chosen: ${m?.plan}`);
        for (const alt of m?.alternatives ?? []) console.log(`    alt ${alt}`);
      }
      if (dec.kind === 'defend' || dec.kind === 'ignoreFlags' || dec.kind === 'momentum' || dec.kind === 'bonusCombat' || dec.kind === 'cavalryExtra' || dec.kind === 'leaderEvade') {
        console.log(`  [${dec.side} ${dec.kind}] -> ${JSON.stringify(ans)}`);
      }
      if (ai.say) console.log(`  SAY ${ai.say}`);
    }
    before = d.state;
  },
  rejected: (dec) => console.log(`REJECTED ${dec.kind}: ${d.lastError}`),
  after: (_, events) => {
    for (const e of events) {
      const t = describe(e, before);
      if (t) console.log(t);
    }
  },
});
console.log(board(d.state));
console.log(`\nResult: winner=${d.state.winner} ${d.state.winReason} banners b${d.state.players.bottom.banners}-t${d.state.players.top.banners}`);
