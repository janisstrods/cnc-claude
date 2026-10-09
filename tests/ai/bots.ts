// Scripted "human-like" opponents for AI regression checks (from the AI review's exploit tests):
//   greedy - closes in and makes the best-scoring attack;
//   turtle - holds its line and only hits what comes close (a passive human);
//   sniper - like greedy, but hunts enemy leaders.
// Strength A/Bs against these bots need a same-seed baseline: side and seed imbalance is large in this game.
import {
  UNIT_STATS, ambushAvailable, ambushSections, attachedLeader, battleTargets, canEvadeType, canFireAt, cardKind, cloneState,
  closeCombatDice, closeHitChance, distance, eligiblePieces, evadeOptions, inSection, isLeaderId, isLoneLeader, leaderAt,
  leaderById, leaderUnit, leadersOf, movablePieces, neighbours, orderMode, pieceMoves, rallyCandidates, rangedDice, turnFlow,
  unitAt, unitById, unitMoves, unitsOf, validateOrders, validateRally, validateSpartacus,
} from '../../src/engine';
import type { Answer, CardKind, Decision, GameState, HexId, Leader, SectionName, Side, Unit } from '../../src/engine/types';

export type Strategy = 'greedy' | 'turtle' | 'sniper';

const SIXTH = 1 / 6;
const CLS_W: Record<string, number> = { light: 0.5, medium: 0.7, heavy: 0.9 };
const wOf = (u: Unit) => CLS_W[UNIT_STATS[u.type].cls];

function binom(n: number, p: number): number[] {
  const out = new Array(n + 1).fill(0);
  out[0] = 1;
  for (let i = 0; i < n; i++) {
    for (let k = i + 1; k >= 1; k--) out[k] = out[k] * (1 - p) + out[k - 1] * p;
    out[0] *= 1 - p;
  }
  return out;
}

const enemiesOf = (s: GameState, side: Side) => s.units.filter((u) => u.side !== side && u.hex >= 0);

function nearestEnemyDist(s: GameState, h: HexId, side: Side): number {
  let b = 99;
  for (const e of enemiesOf(s, side)) b = Math.min(b, distance(h, e.hex));
  return b;
}

function countAdj(s: GameState, h: HexId, pred: (u: Unit) => boolean): number {
  let n = 0;
  for (const x of neighbours(h)) {
    const v = unitAt(s, x);
    if (v && pred(v)) n++;
  }
  return n;
}

/** Expected value of closing on target t with unit a (attacker's view). */
function closeScore(s: GameState, a: Unit, t: Unit | Leader, leaderBonus: number, role: 'attack' | 'bonus' = 'attack'): number {
  const n = closeCombatDice(s, a, t, { role, fullAtStart: a.blocks === a.maxBlocks, ordered: true });
  if (n <= 0) return -1;
  if (!('type' in t)) return (1 - Math.pow(5 / 6, n)) * (1.4 + leaderBonus * 2);
  const evades = canEvadeType(t.type, a.type) && evadeOptions(s, t).length > 0;
  const p = evades ? SIXTH : a.type === 'EL' ? 0.4 : closeHitChance(s, a, t);
  const pmf = binom(n, Math.min(0.95, p));
  let eh = 0;
  let pe = 0;
  for (let k = 1; k <= n; k++) {
    eh += Math.min(k, t.blocks) * pmf[k];
    if (k >= t.blocks) pe += pmf[k];
  }
  let v = (eh / t.maxBlocks) * wOf(t) + pe + (evades ? 0 : 0.03 * n * SIXTH);
  if (attachedLeader(s, t)) v += leaderBonus * ((pe * SIXTH + ((1 - pe) * (1 - pmf[0])) / 36) * 1.4 + 0.15);
  if (!evades) {
    const nb = closeCombatDice(s, t, a, { role: 'back', fullAtStart: t.blocks === t.maxBlocks, ordered: false });
    if (nb > 0) {
      const back = nb * (t.type === 'EL' ? 0.4 : closeHitChance(s, t, a));
      v -= (1 - pe) * ((Math.min(back, a.blocks) / a.maxBlocks) * wOf(a) + (back >= a.blocks ? 0.5 : 0));
    }
  }
  return v;
}

function rangedScore(s: GameState, a: Unit, hex: HexId, moved: number, leaderBonus: number): number {
  const n = rangedDice(s, a, hex, moved, true) * Math.max(1, s.turn.mods.shots);
  if (n <= 0) return -1;
  const t = unitAt(s, hex);
  if (!t) return (1 - Math.pow(5 / 6, n)) * (1.4 + leaderBonus * 2);
  const pmf = binom(n, SIXTH);
  let eh = 0;
  let pe = 0;
  for (let k = 1; k <= n; k++) {
    eh += Math.min(k, t.blocks) * pmf[k];
    if (k >= t.blocks) pe += pmf[k];
  }
  return (eh / t.maxBlocks) * wOf(t) + pe + 0.02 * n * SIXTH + (attachedLeader(s, t) ? leaderBonus * 0.1 : 0);
}

/** Best attack available to u standing at its current hex. */
function bestAttackHere(s: GameState, u: Unit, moved: number, canBattle: boolean, must: boolean, leaderBonus: number): number {
  if (!canBattle) return must ? -0.5 : 0;
  const m = s.turn.mods;
  let bestClose = -Infinity;
  if (!m.noClose) {
    for (const h of neighbours(u.hex)) {
      const v = unitAt(s, h) ?? leaderAt(s, h);
      if (v && v.side !== u.side) bestClose = Math.max(bestClose, closeScore(s, u, v, leaderBonus));
    }
  }
  if (must) return bestClose === -Infinity ? -0.5 : bestClose;
  let best = Math.max(0, bestClose);
  const st = UNIT_STATS[u.type];
  if (!m.noRanged && st.range > 0 && !(u.type === 'AX' && moved >= 2) && countAdj(s, u.hex, (x) => x.side !== u.side) === 0) {
    const targets: HexId[] = enemiesOf(s, u.side).map((e) => e.hex);
    for (const l of s.leaders) if (l.side !== u.side && l.hex >= 0 && !leaderUnit(s, l)) targets.push(l.hex);
    for (const h of targets) {
      const d = distance(u.hex, h);
      if (d >= 2 && d <= st.range && canFireAt(s, u, h)) best = Math.max(best, rangedScore(s, u, h, moved, leaderBonus));
    }
  }
  return best;
}

interface Dest { hex: HexId; dist: number; canBattle: boolean; mustBattle: boolean }

export class Bot {
  private decided = new Set<string>();
  private decidedKey = '';
  constructor(readonly strat: Strategy, private rnd: () => number) {}

  private get leaderBonus(): number {
    return this.strat === 'sniper' ? 3 : 0;
  }

  /** Value of unit u standing at `dest` (temporarily moved there), including its attack if ordered. */
  private destValue(s: GameState, u: Unit, dest: Dest | null, ordered: boolean): number {
    const from = u.hex;
    const l = attachedLeader(s, u);
    const to = dest ? dest.hex : from;
    if (to < 0) return 0.6; // Castulo exit
    u.hex = to;
    if (l) l.hex = to;
    try {
      const ne = nearestEnemyDist(s, to, u.side);
      const fr = Math.min(2, countAdj(s, to, (x) => x !== u && x.side === u.side));
      const eadj = countAdj(s, to, (x) => x.side !== u.side);
      const ranged = UNIT_STATS[u.type].range > 0 && u.type !== 'AX';
      const atk = ordered ? bestAttackHere(s, u, dest ? dest.dist : 0, dest ? dest.canBattle : true, dest ? dest.mustBattle : false, this.leaderBonus) : 0;
      if (this.strat === 'turtle') {
        const closer = Math.max(0, nearestEnemyDist(s, from, u.side) - ne);
        return (atk > 0.05 ? atk : 0) + 0.04 * fr - 0.3 * closer - (dest ? 0.02 : 0);
      }
      let adv = -0.06 * Math.min(8, ne);
      if (this.strat === 'sniper') {
        let ld = 99;
        for (const el of s.leaders) if (el.side !== u.side && el.hex >= 0) ld = Math.min(ld, distance(to, el.hex));
        adv = -0.05 * Math.min(8, ld) - 0.03 * Math.min(8, ne);
      }
      if (ranged) adv = -0.06 * Math.abs(Math.min(8, ne) - 2);
      return atk + adv + 0.05 * fr - (fr === 0 && eadj > 0 ? 0.08 : 0);
    } finally {
      u.hex = from;
      if (l) l.hex = from;
    }
  }

  private leaderDestValue(s: GameState, l: Leader, hex: HexId | null): number {
    const from = l.hex;
    const to = hex ?? from;
    l.hex = to;
    try {
      const u = unitAt(s, to);
      let v = u && u.side === l.side ? 0.4 + 0.1 * u.blocks : 0;
      v -= 0.4 * countAdj(s, to, (x) => x.side !== l.side);
      v += 0.05 * Math.min(2, countAdj(s, to, (x) => x.side === l.side));
      if (hex !== null && hex !== from) v -= 0.01;
      return v;
    } finally {
      l.hex = from;
    }
  }

  /** How much a piece gains from being ordered with the current mods. */
  private prio(s: GameState, id: string): number {
    if (isLeaderId(id)) {
      const l = leaderById(s, id);
      if (!l || l.hex < 0 || !isLoneLeader(s, l)) return 0;
      return 0.05 + (countAdj(s, l.hex, (x) => x.side !== l.side) > 0 ? 0.3 : 0);
    }
    const u = unitById(s, id);
    if (!u || u.hex < 0) return 0;
    const base = this.destValue(s, u, null, false);
    let best = this.destValue(s, u, null, true);
    if (!s.turn.mods.noMove) {
      const saved = s.turn.ordered;
      s.turn.ordered = {};
      let moves: Dest[] = [];
      try {
        moves = unitMoves(s, id);
      } finally {
        s.turn.ordered = saved;
      }
      for (const m of moves) best = Math.max(best, this.destValue(s, u, m, true));
    }
    return best - base;
  }

  private ordersFor(s: GameState, side: Side, kind: CardKind): { pieces: string[]; value: number } {
    const mode = orderMode(s, side, kind);
    const pr = new Map<string, number>();
    const P = (id: string) => {
      if (!pr.has(id)) pr.set(id, this.prio(s, id));
      return pr.get(id)!;
    };
    const valid = (ids: string[]) => !validateOrders(s, side, kind, ids);
    const total = (ids: string[]) => ids.reduce((a, id) => a + Math.max(0, P(id)), 0);
    const grow = (sel: string[], pool: string[]) => {
      let grew = true;
      while (grew) {
        grew = false;
        for (const id of pool) {
          if (sel.includes(id) || P(id) <= 0.01) continue;
          if (valid([...sel, id])) {
            sel.push(id);
            grew = true;
            break;
          }
        }
      }
      return sel;
    };
    switch (mode.mode) {
      case 'section':
      case 'troop':
      case 'one': {
        const sel = grow([], [...eligiblePieces(s, side, kind)].sort((a, b) => P(b) - P(a)));
        return { pieces: sel, value: total(sel) };
      }
      case 'leadership': {
        let best: string[] = [];
        let bv = 0;
        for (const l of leadersOf(s, side)) {
          if (mode.section && !inSection(l.hex, side, mode.section)) continue;
          const lu = leaderUnit(s, l);
          const base = [l.id, ...(lu ? [lu.id] : [])];
          if (!valid(base)) continue;
          const others = unitsOf(s, side).map((u) => u.id).filter((id) => !base.includes(id)).sort((a, b) => P(b) - P(a));
          const sel = grow(base, others);
          const v = total(sel);
          if (v > bv) {
            bv = v;
            best = sel;
          }
        }
        const singles = unitsOf(s, side).filter((u) => !mode.section || inSection(u.hex, side, mode.section)).map((u) => u.id).sort((a, b) => P(b) - P(a));
        if (singles.length && P(singles[0]) > bv && P(singles[0]) > 0.01) best = [singles[0]];
        return { pieces: best, value: Math.max(bv, singles.length ? P(singles[0]) : 0) };
      }
      case 'group': {
        const foot = unitsOf(s, side).filter((u) => UNIT_STATS[u.type].foot).map((u) => u.id).sort((a, b) => P(b) - P(a));
        let best: string[] = [];
        let bv = 0;
        for (const seed of foot.slice(0, 3)) {
          if (P(seed) <= 0.01) continue;
          const sel = grow([seed], foot);
          const v = total(sel);
          if (v > bv) {
            bv = v;
            best = sel;
          }
        }
        return { pieces: best, value: bv };
      }
      default:
        return { pieces: [], value: 0 };
    }
  }

  private cardValue(s: GameState, side: Side, card: number): number {
    const c = cloneState(s);
    const gen = turnFlow(c, { emit() {}, invalid() {} });
    let r = gen.next();
    if (r.done) return 0;
    r = gen.next({ kind: 'playCard', card });
    if (r.done) return 0;
    const d = r.value;
    if (d.kind === 'orders') {
      if (ambushAvailable(c, side, d.card)) return 2;
      return this.ordersFor(c, side, d.card).value;
    }
    if (d.kind === 'rally') return 0.2 * rallyCandidates(c, side).length;
    if (d.kind === 'spartacus') return 0.4;
    if (d.kind === 'move' || d.kind === 'battle') {
      let v = 0;
      for (const id of Object.keys(c.turn.ordered)) v += Math.max(0, this.prio(c, id));
      return v;
    }
    return cardKind(card) === 'firstStrike' ? -5 : -0.5;
  }

  answer(s: GameState, d: Decision): Answer {
    switch (d.kind) {
      case 'playCard': {
        let best = s.players[d.side].hand[0];
        let bv = -Infinity;
        const seen = new Set<CardKind>();
        for (const id of s.players[d.side].hand) {
          const k = cardKind(id);
          if (seen.has(k)) continue;
          seen.add(k);
          const v = this.cardValue(s, d.side, id) + 0.001 * this.rnd();
          if (v > bv) {
            bv = v;
            best = id;
          }
        }
        return { kind: 'playCard', card: best };
      }
      case 'orders': {
        if (ambushAvailable(s, d.side, d.card)) {
          let bs: SectionName = ambushSections(d.card)[0];
          let bn = -1;
          for (const sec of ambushSections(d.card)) {
            const n = enemiesOf(s, d.side).filter((e) => inSection(e.hex, d.side, sec)).length;
            if (n > bn) {
              bn = n;
              bs = sec;
            }
          }
          return { kind: 'orders', pieces: [], ambushSection: bs };
        }
        return { kind: 'orders', pieces: this.ordersFor(s, d.side, d.card).pieces };
      }
      case 'move':
        return this.moveStep(s, d.side, d.stage);
      case 'battle':
        return this.battleStep(s);
      case 'defend': {
        if (d.canFirstStrike) return { kind: 'defend', choice: 'firstStrike' };
        const t = unitById(s, d.target);
        if (d.canEvade && t && (UNIT_STATS[t.type].cls === 'light' || t.blocks === 1)) return { kind: 'defend', choice: 'evade' };
        return { kind: 'defend', choice: 'stand' };
      }
      case 'ignoreFlags':
        return { kind: 'ignoreFlags', count: d.max };
      case 'retreat': {
        let bi = 0;
        let bv = Infinity;
        d.options.forEach((o, i) => {
          const v = o.losses * 10 - (o.attachLeader ? 1 : 0) - 0.1 * countAdj(s, o.end, (x) => x.side === d.side);
          if (v < bv) {
            bv = v;
            bi = i;
          }
        });
        return { kind: 'choose', index: bi };
      }
      case 'leaderEvade': {
        let bi = 0;
        let bv = Infinity;
        d.options.forEach((o, i) => {
          const v = (o.escapes?.length ?? 0) * 10 + (o.offBoard ? 3 : 0) - (o.attachLeader ? 2 : 0) + countAdj(s, o.end, (x) => x.side !== d.side);
          if (v < bv) {
            bv = v;
            bi = i;
          }
        });
        return { kind: 'choose', index: bi };
      }
      case 'momentum':
        return { kind: 'yesno', yes: this.strat !== 'turtle' };
      case 'cavalryExtra':
        return { kind: 'hex', hex: null };
      case 'bonusCombat': {
        const u = unitById(s, d.unit)!;
        let best: HexId | null = null;
        let bv = this.strat === 'turtle' ? 0.1 : 0;
        for (const h of d.targets) {
          const t = unitAt(s, h) ?? leaderAt(s, h);
          if (!t) continue;
          const v = closeScore(s, u, t, this.leaderBonus, 'bonus');
          if (v > bv) {
            bv = v;
            best = h;
          }
        }
        return { kind: 'hex', hex: best };
      }
      case 'rally': {
        const cands = rallyCandidates(s, d.side).sort((a, b) => a.blocks / a.maxBlocks - b.blocks / b.maxBlocks);
        const ids: (string | null)[] = [];
        for (let i = 0; i < d.faces.length; i++) {
          let chosen: string | null = null;
          for (const u of cands) {
            if (!validateRally(s, d.side, d.faces, [...ids, u.id, ...Array(d.faces.length - i - 1).fill(null)])) {
              chosen = u.id;
              break;
            }
          }
          ids.push(chosen);
        }
        return { kind: 'assign', ids };
      }
      case 'spartacus': {
        const pieces = unitsOf(s, d.side).map((u) => u.id).sort((a, b) => this.prio(s, b) - this.prio(s, a));
        const ids: (string | null)[] = [];
        for (let i = 0; i < d.faces.length; i++) {
          let chosen: string | null = null;
          for (const id of pieces) {
            if (!validateSpartacus(s, d.side, d.faces, [...ids, id, ...Array(d.faces.length - i - 1).fill(null)])) {
              chosen = id;
              break;
            }
          }
          ids.push(chosen);
        }
        return { kind: 'assign', ids };
      }
    }
  }

  private moveStep(s: GameState, side: Side, stage: 1 | 2): Answer {
    const key = `${s.turn.number}:${stage}`;
    if (key !== this.decidedKey) {
      this.decidedKey = key;
      this.decided = new Set();
    }
    if (stage === 2) return { kind: 'endMove' };
    const ids = movablePieces(s, stage).filter((id) => !this.decided.has(id));
    const keyOf = (id: string) => {
      if (isLeaderId(id)) return 1000;
      const u = unitById(s, id)!;
      return u.hex < 0 ? -10 : nearestEnemyDist(s, u.hex, side);
    };
    ids.sort((a, b) => keyOf(a) - keyOf(b));
    for (const id of ids) {
      this.decided.add(id);
      const moves = pieceMoves(s, id, stage);
      if (!moves.length) continue;
      let best: HexId | null = null;
      if (isLeaderId(id)) {
        const l = leaderById(s, id)!;
        let bv = l.hex < 0 ? -Infinity : this.leaderDestValue(s, l, null);
        for (const m of moves) {
          const v = this.leaderDestValue(s, l, m.hex);
          if (v > bv) {
            bv = v;
            best = m.hex;
          }
        }
      } else {
        const u = unitById(s, id)!;
        let bv = u.hex < 0 ? -Infinity : this.destValue(s, u, null, true) + 0.003;
        for (const m of moves) {
          const v = this.destValue(s, u, m, true);
          if (v > bv) {
            bv = v;
            best = m.hex;
          }
        }
      }
      if (best !== null) return { kind: 'move', piece: id, to: best };
    }
    return { kind: 'endMove' };
  }

  private battleStep(s: GameState): Answer {
    let best: { unit: string; target: HexId; score: number; must: boolean } | null = null;
    let anyMust = false;
    const opts: { unit: string; target: HexId; score: number; must: boolean }[] = [];
    for (const id of Object.keys(s.turn.ordered)) {
      const op = s.turn.ordered[id];
      const u = unitById(s, id);
      if (op.isLeader || !u) continue;
      for (const t of battleTargets(s, id)) {
        const score = t.kind === 'close'
          ? closeScore(s, u, (unitAt(s, t.hex) ?? leaderAt(s, t.hex))!, this.leaderBonus)
          : rangedScore(s, u, t.hex, op.moved, this.leaderBonus);
        const must = op.mustBattle && t.kind === 'close';
        if (must) anyMust = true;
        opts.push({ unit: id, target: t.hex, score, must });
      }
    }
    for (const o of anyMust ? opts.filter((x) => x.must) : opts) if (!best || o.score > best.score) best = o;
    if (!best) return { kind: 'endBattle' };
    if (!anyMust && best.score < (this.strat === 'turtle' ? 0.05 : -0.05)) return { kind: 'endBattle' };
    return { kind: 'attack', unit: best.unit, target: best.target };
  }
}
