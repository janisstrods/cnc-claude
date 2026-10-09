// Turn planning by Monte-Carlo simulation: candidate (card, orders, moves) plans are played out on determinised clones
// with the engine's own turn generator, evaluated statically, and compared (minus the value of keeping the card).
import { cardKind } from '../engine/cards';
import { nextTurn, pieceMoves, turnFlow, type Gen } from '../engine/flow';
import { other } from '../engine/query';
import { forcedDiceLeft } from '../engine/rng';
import { cloneState } from '../engine/setup';
import type { Answer, CardKind, Decision, FlowCtx, GameState, HexId, SectionName, Side } from '../engine/types';
import { cardRetention, quickCardScore } from './cardsense';
import { attackOptions } from './estimate';
import { evaluate } from './evaluate';
import { greedyMoveStep, scoreOption, type MoveCtx } from './moves';
import { orderCandidates, pieceBenefits, type OrderCandidate } from './ordering';
import { greedyBattle, pickAttack, reactiveFast } from './policies';
import { Rng } from './rand';
import { determinize, resumeTurn, runTurn, runTurnUntil, type Policy } from './sim';
import { WIN_SCORE, tweak, type Difficulty, type Weights } from './values';

/** Search settings per difficulty level. */
export interface DiffCfg {
  /** Wall-clock cap for planning a turn (card + orders + moves), ms. Battle decisions get 30% of it. */
  budgetMs: number;
  /** Cap on simulated turns per card decision. */
  maxSims: number;
  /** Order selections tried per card. */
  orderCands: number;
  /** Movement styles per order selection (base, hold, bold, safe, noisy). */
  moveVariants: number;
  /** Cards (by first-round score) that get the wider exploration. */
  topCards: number;
  /** Samples per candidate in the screening rounds. */
  k0: number;
  /** Gaussian noise added to plan scores and the softmax temperature of the final pick (recruit only). */
  evalNoise: number;
  pickTemp: number;
  /** Battle phase: rollouts per candidate attack (0 = greedy), candidates considered, noise on greedy picks. */
  battleRollouts: number;
  battleCands: number;
  battleNoise: number;
  /**
   * Experimental (off at every level): number of finalist plans re-scored with a 2-ply opponent reply. Measured in
   * self-play, both a rolled and an expected-value reply model added noise rather than strength.
   */
  lookahead: number;
  /** Chance of a careless reactive decision (recruit). */
  mistakeRate: number;
  /** Max samples per finalist. */
  kMax: number;
  /** Extra perturbed movement plans for the two leading (card, orders) pairs. */
  extraVariants: number;
  /** Experimental (off): local refinement of the best plan; measured no gain in self-play (optimizer's curse). */
  refine: number;
  /** Experimental (off): judge simulated outcomes with exact enemy movement in the threat model (3x slower eval); no measured gain. */
  exactEval: boolean;
  /** Leftover budget: keep sampling the top plans while they are statistically close, up to this many samples (0 = off). */
  topUp: number;
}

export const DIFFICULTY: Record<Difficulty, DiffCfg> = {
  recruit: {
    budgetMs: 150, maxSims: 90, orderCands: 1, moveVariants: 1, topCards: 2, k0: 2, evalNoise: 0.6, pickTemp: 0.3,
    battleRollouts: 0, battleCands: 0, battleNoise: 0.3, lookahead: 0, mistakeRate: 0.3, kMax: 4, extraVariants: 0, refine: 0, exactEval: false, topUp: 0,
  },
  tribune: {
    budgetMs: 800, maxSims: 1200, orderCands: 2, moveVariants: 3, topCards: 3, k0: 4, evalNoise: 0, pickTemp: 0,
    battleRollouts: 24, battleCands: 3, battleNoise: 0, lookahead: 0, mistakeRate: 0, kMax: 16, extraVariants: 2, refine: 0, exactEval: false,
    topUp: 48,
  },
  consul: {
    budgetMs: 2000, maxSims: 5000, orderCands: 4, moveVariants: 5, topCards: 6, k0: 12, evalNoise: 0, pickTemp: 0,
    battleRollouts: 32, battleCands: 6, battleNoise: 0, lookahead: 0, mistakeRate: 0, kMax: 64, extraVariants: 16, refine: 0, exactEval: false,
    topUp: 64,
  },
};

export interface PlanCtx {
  me: Side;
  W: Weights;
  oppW: Weights;
  rng: Rng;
  cfg: DiffCfg;
  start: number;
  deadline: number;
  maxSims: number;
  sims: number;
  /** Common random seeds per sample index (variance reduction across candidates). */
  seeds: number[];
  /** Weights used to judge simulated outcomes. */
  judgeW: Weights;
  /** Scale on a card's keep value (card hoarding decay); default 1. */
  keepScale?: (card: number) => number;
  /** Plan without simulations: quick card score, first order selection, greedy moves (recruit's hasty turns). */
  hasty?: boolean;
}

export const now = (): number => (globalThis.performance ? globalThis.performance.now() : Date.now());

export function timeUp(ctx: PlanCtx): boolean {
  return now() > ctx.deadline || ctx.sims >= ctx.maxSims;
}

function seedAt(ctx: PlanCtx, i: number): number {
  while (ctx.seeds.length <= i) ctx.seeds.push(ctx.rng.u32());
  return ctx.seeds[i];
}

export interface Cand {
  card: number;
  kind: CardKind;
  effective: CardKind | null;
  orders: string[] | null;
  ambush?: SectionName;
  moves: Answer[] | null;
  label: string;
  retention: number;
  n: number;
  sum: number;
  laN: number;
  laSum: number;
  oc?: OrderCandidate | null;
  /** Per-sample evaluations in seed order (paired comparisons between candidates). */
  vals: number[];
}

export function candMean(c: Cand): number {
  return c.n ? c.sum / c.n : -Infinity;
}

export function candScore(c: Cand, ctx: PlanCtx): number {
  let m = candMean(c);
  if (c.laN > 0) m = 0.5 * m + 0.5 * (c.laSum / c.laN);
  return m - c.retention;
}

/** Steps the engine generator on a private clone. */
class Stepper {
  s: GameState;
  gen: Gen;
  cur: Decision | null;
  rejected = false;
  constructor(root: GameState, me: Side, rng: Rng) {
    this.s = cloneState(root);
    determinize(this.s, me, rng);
    const ctx: FlowCtx = { emit() {}, invalid: () => { this.rejected = true; } };
    this.gen = turnFlow(this.s, ctx);
    const r = this.gen.next();
    this.cur = r.done ? null : r.value;
  }
  answer(a: Answer): boolean {
    this.rejected = false;
    const r = this.gen.next(a);
    this.cur = r.done ? null : r.value;
    return !this.rejected;
  }
}

interface Variant {
  tag: string;
  W: Weights;
  noise: number;
  hold?: boolean;
  orderNoise?: number;
  strikeFirst?: boolean;
}

function variants(W: Weights, n: number): Variant[] {
  const all: Variant[] = [
    { tag: 'base', W, noise: 0 },
    { tag: 'hold', W, noise: 0, hold: true },
    { tag: 'bold', W: tweak(W, { riskSelf: W.riskSelf * 0.6, adv: W.adv * 2, attackNow: 1 }), noise: 0 },
    { tag: 'safe', W: tweak(W, { riskSelf: W.riskSelf * 1.6, adv: W.adv * 0.4, attackNow: 0.7 }), noise: 0 },
    { tag: 'noisy', W, noise: 0.05 },
  ];
  return all.slice(0, Math.max(1, n));
}

function ordersAnswer(oc: OrderCandidate | null): Answer {
  if (!oc) return { kind: 'orders', pieces: [] };
  if (oc.ambush) return { kind: 'orders', pieces: [], ambushSection: oc.ambush };
  return { kind: 'orders', pieces: oc.pieces };
}

/** First look at a card: its effective kind and order candidates. */
function inspectCard(root: GameState, ctx: PlanCtx, card: number): { effective: CardKind | null; ocs: OrderCandidate[] | null } {
  const st = new Stepper(root, ctx.me, new Rng(ctx.rng.u32()));
  st.answer({ kind: 'playCard', card });
  if (st.cur?.kind === 'orders') {
    const eff = st.cur.card;
    return { effective: eff, ocs: orderCandidates(st.s, ctx.me, eff, ctx.W, Math.max(ctx.cfg.orderCands, 1)) };
  }
  return { effective: st.s.turn.effective, ocs: null };
}

/** Build a concrete plan: play the card, give the orders, then plan the moves greedily on a private clone. */
function buildCand(root: GameState, ctx: PlanCtx, card: number, effective: CardKind | null, oc: OrderCandidate | null, v: Variant): Cand | null {
  const rng = new Rng(ctx.rng.u32());
  const st = new Stepper(root, ctx.me, rng);
  st.answer({ kind: 'playCard', card });
  let orders: string[] | null = null;
  if (st.cur?.kind === 'orders') {
    if (!st.answer(ordersAnswer(oc))) return null;
    orders = oc?.pieces ?? [];
  }
  const kind = cardKind(card);
  const base = {
    card, kind, effective, orders, ambush: oc?.ambush, retention: cardRetention(root, ctx.me, kind, ctx.W) * (ctx.keepScale?.(card) ?? 1),
    n: 0, sum: 0, laN: 0, laSum: 0, oc, vals: [] as number[],
  };
  const label = `${kind}${effective && effective !== kind ? `->${effective}` : ''}${oc?.ambush ? ` ambush:${oc.ambush}` : ''} [${(orders ?? []).join(',')}] ${v.tag}`;
  if (st.cur && (st.cur.kind === 'rally' || st.cur.kind === 'spartacus')) return { ...base, moves: null, label };
  const moves: Answer[] = [];
  if (st.cur?.kind === 'move' && !v.hold) {
    const mc: MoveCtx = { me: ctx.me, W: v.W, rng, noise: v.noise, decided: new Set(), orderNoise: v.orderNoise, strikeFirst: v.strikeFirst };
    let guard = 0;
    while (st.cur && st.cur.kind === 'move' && st.cur.stage === 1 && guard++ < 40) {
      const a = greedyMoveStep(st.s, 1, mc);
      if (a.kind === 'endMove') break;
      if (!st.answer(a)) break;
      moves.push(a);
    }
  }
  return { ...base, moves, label };
}

/** Replay a plan's card, orders and first `upto` moves on a fresh stepper. */
function replayPrefix(root: GameState, ctx: PlanCtx, c: Cand, upto: number): Stepper | null {
  const st = new Stepper(root, ctx.me, new Rng(ctx.rng.u32()));
  st.answer({ kind: 'playCard', card: c.card });
  if (st.cur?.kind === 'orders') {
    const a: Answer = c.ambush ? { kind: 'orders', pieces: [], ambushSection: c.ambush } : { kind: 'orders', pieces: c.orders ?? [] };
    if (!st.answer(a)) return null;
  }
  for (let j = 0; j < upto; j++) {
    if (!st.cur || st.cur.kind !== 'move' || !st.answer(c.moves![j])) return null;
  }
  return st;
}

/**
 * Local search around a plan: for each moved piece, try its next-best destinations (or staying put) and re-plan the
 * remaining pieces greedily.
 */
function refineCands(root: GameState, ctx: PlanCtx, best: Cand, maxAlts: number): Cand[] {
  if (!best.moves || !best.moves.length) return [];
  const out: Cand[] = [];
  for (let i = 0; i < best.moves.length && out.length < maxAlts && !timeUp(ctx); i++) {
    const mv = best.moves[i];
    if (mv.kind !== 'move') continue;
    const st = replayPrefix(root, ctx, best, i);
    if (!st || st.cur?.kind !== 'move') continue;
    const mc: MoveCtx = { me: ctx.me, W: ctx.W, noise: 0, decided: new Set() };
    const alts = [
      { hex: null as HexId | null, sc: scoreOption(st.s, mv.piece, null, 1, mc) },
      ...pieceMoves(st.s, mv.piece, 1).map((m) => ({ hex: m.hex as HexId | null, sc: scoreOption(st.s, mv.piece, m, 1, mc) })),
    ].filter((x) => x.hex !== mv.to).sort((a, b) => b.sc - a.sc).slice(0, 2);
    for (const alt of alts) {
      if (out.length >= maxAlts) break;
      const st2 = replayPrefix(root, ctx, best, i);
      if (!st2) continue;
      const moves = best.moves.slice(0, i);
      if (alt.hex !== null) {
        const a: Answer = { kind: 'move', piece: mv.piece, to: alt.hex };
        if (!st2.answer(a)) continue;
        moves.push(a);
      }
      const mc2: MoveCtx = { me: ctx.me, W: ctx.W, noise: 0, decided: new Set([mv.piece]) };
      let guard = 0;
      while (st2.cur && st2.cur.kind === 'move' && st2.cur.stage === 1 && guard++ < 40) {
        const a = greedyMoveStep(st2.s, 1, mc2);
        if (a.kind === 'endMove') break;
        if (!st2.answer(a)) break;
        moves.push(a);
      }
      out.push({ ...best, moves, label: `${best.label} ref${i}${alt.hex === null ? 'stay' : ''}`, n: 0, sum: 0, laN: 0, laSum: 0, vals: [] });
    }
  }
  return out;
}

function simPolicy(ctx: PlanCtx, cand: Cand, rng: Rng): Policy {
  const me = ctx.me;
  let mi = 0;
  let online: MoveCtx | null = null;
  let online2: MoveCtx | null = null;
  return (s, d) => {
    if (d.side !== me) return reactiveFast(s, d, ctx.oppW, rng);
    switch (d.kind) {
      case 'playCard': return { kind: 'playCard', card: cand.card };
      case 'orders': return cand.ambush ? { kind: 'orders', pieces: [], ambushSection: cand.ambush } : { kind: 'orders', pieces: cand.orders ?? [] };
      case 'move': {
        if (d.stage === 1 && cand.moves) {
          while (mi < cand.moves.length) {
            const a = cand.moves[mi++];
            if (a.kind === 'move' && s.turn.ordered[a.piece] && pieceMoves(s, a.piece, 1).some((m) => m.hex === a.to)) return a;
          }
          return { kind: 'endMove' };
        }
        if (d.stage === 1) online ??= { me, W: ctx.W, noise: 0, decided: new Set() };
        else online2 ??= { me, W: ctx.W, noise: 0, decided: new Set() };
        return greedyMoveStep(s, d.stage, (d.stage === 1 ? online : online2)!);
      }
      case 'battle': return greedyBattle(s, ctx.W, rng);
      default: return reactiveFast(s, d, ctx.W, rng);
    }
  };
}

/** Expected value of the opponent's battle phase from its ordered units' best attacks (no dice rolled). */
function expectedAttacks(s: GameState, W: Weights): number {
  const opts = attackOptions(s, W).filter((o) => o.ev > 0 || o.must).sort((a, b) => b.ev - a.ev);
  const used = new Set<string>();
  const hits = new Map<number, number>();
  let total = 0;
  for (const o of opts) {
    if (used.has(o.unit)) continue;
    const k = hits.get(o.target) ?? 0;
    total += o.ev * Math.pow(0.6, k);
    used.add(o.unit);
    hits.set(o.target, k + 1);
  }
  return total;
}

/**
 * The opponent's likely reply after our simulated turn (fast model: card by quick score, best orders, greedy moves);
 * its battles are scored by expected values rather than rolled, which keeps the estimate low-variance.
 */
function opponentReply(s: GameState, ctx: PlanCtx, rng: Rng): number {
  const me = ctx.me;
  const opp = other(me);
  if (s.winner || s.turn.phase !== 'done') return evaluate(s, me, opp, ctx.W);
  nextTurn(s);
  const mc: MoveCtx = { me: opp, W: ctx.oppW, noise: 0, decided: new Set() };
  const policy: Policy = (st, d) => {
    if (d.side !== opp) return reactiveFast(st, d, ctx.W, rng);
    switch (d.kind) {
      case 'playCard': {
        const ben = pieceBenefits(st, opp, null, ctx.oppW);
        let best = st.players[opp].hand[0];
        let bv = -Infinity;
        for (const id of st.players[opp].hand) {
          const v = quickCardScore(st, opp, cardKind(id), ben);
          if (v > bv) {
            bv = v;
            best = id;
          }
        }
        return { kind: 'playCard', card: best };
      }
      case 'orders': return ordersAnswer(orderCandidates(st, opp, d.card, ctx.oppW, 1)[0] ?? null);
      case 'move': return d.stage === 1 ? greedyMoveStep(st, 1, mc) : { kind: 'endMove' };
      default: return reactiveFast(st, d, ctx.oppW, rng);
    }
  };
  const stop = runTurnUntil(s, policy, rng, (d) => d.kind === 'battle' && d.side === opp);
  if (s.winner) return evaluate(s, me, me, ctx.W);
  const loss = stop ? expectedAttacks(s, ctx.oppW) : 0;
  return evaluate(s, me, me, ctx.W) - loss;
}

function sampleCand(root: GameState, ctx: PlanCtx, cand: Cand): void {
  const rng = new Rng(seedAt(ctx, cand.n) ^ 0x5bd1e995);
  const s = cloneState(root);
  determinize(s, ctx.me, rng);
  runTurn(s, simPolicy(ctx, cand, rng), rng);
  ctx.sims++;
  const v = evaluate(s, ctx.me, other(ctx.me), ctx.judgeW);
  cand.sum += v;
  cand.vals.push(v);
  cand.n++;
}

/** One 2-ply sample: our turn, then the opponent's likely reply. */
function sampleReply(root: GameState, ctx: PlanCtx, cand: Cand): void {
  const rng = new Rng(seedAt(ctx, 500 + cand.laN) ^ 0x2c1b3c6d);
  const s = cloneState(root);
  determinize(s, ctx.me, rng);
  runTurn(s, simPolicy(ctx, cand, rng), rng);
  cand.laSum += opponentReply(s, ctx, rng);
  cand.laN++;
  ctx.sims += 3;
}

function sampleTo(root: GameState, ctx: PlanCtx, cands: Cand[], n: number): void {
  for (let round = 0; round < n; round++) {
    for (const c of cands) {
      if (c.n > round) continue;
      if (timeUp(ctx) && c.n >= 1) continue;
      sampleCand(root, ctx, c);
    }
  }
}

/** Paired comparison over common seeds: is the gap between a and b smaller than 2.5 standard errors? */
function closeCall(a: Cand, b: Cand, ctx: PlanCtx): boolean {
  const m = Math.min(a.vals.length, b.vals.length);
  if (m < 4) return true;
  let sum = 0;
  let sum2 = 0;
  for (let i = 0; i < m; i++) {
    const d = a.vals[i] - b.vals[i];
    sum += d;
    sum2 += d * d;
  }
  const mean = sum / m;
  const sd = Math.sqrt(Math.max(0, sum2 / m - mean * mean));
  const gap = mean - (a.retention - b.retention);
  return Math.abs(gap) < 2.5 * (sd / Math.sqrt(m) + 1e-9);
}

/**
 * Spend the leftover budget where it matters: re-admit plans cut early whose mean beats the leader, then keep sampling
 * the top plans while they are statistically indistinguishable (within the simulation cap, so deterministic mode holds).
 */
function topUp(root: GameState, ctx: PlanCtx, cands: Cand[], pool: Cand[]): Cand[] {
  const byScore = (a: Cand, b: Cand) => candScore(b, ctx) - candScore(a, ctx);
  pool.sort(byScore);
  const lead0 = pool[0];
  for (const c of cands) {
    if (pool.includes(c) || timeUp(ctx)) continue;
    if (c.n > 0 && candScore(c, ctx) > candScore(lead0, ctx)) {
      sampleTo(root, ctx, [c], lead0.n);
      pool.push(c);
    }
  }
  pool.sort(byScore);
  const top = pool.slice(0, 3);
  for (let guard = 0; guard < 24 && !timeUp(ctx); guard++) {
    top.sort(byScore);
    const lead = top[0];
    const close = top.slice(1).filter((c) => closeCall(lead, c, ctx));
    if (!close.length) break;
    const group = [lead, ...close].filter((c) => c.n < ctx.cfg.topUp);
    if (!group.length) break;
    const target = Math.min(ctx.cfg.topUp, Math.max(...[lead, ...close].map((c) => c.n)) + 8);
    sampleTo(root, ctx, group, target);
  }
  return [...top, ...pool.filter((c) => !top.includes(c))].sort(byScore);
}

export interface PlanResult {
  best: Cand;
  cands: Cand[];
  sims: number;
  ms: number;
}

/** Choose the card and the whole order/move plan for this turn. */
export function planTurn(root: GameState, ctx: PlanCtx): PlanResult {
  const me = ctx.me;
  const hand = root.players[me].hand;
  const cfg = ctx.cfg;
  const byKind = new Map<CardKind, number>();
  for (const id of hand) if (!byKind.has(cardKind(id))) byKind.set(cardKind(id), id);
  const info = new Map<CardKind, { card: number; effective: CardKind | null; ocs: OrderCandidate[] | null }>();
  const cands: Cand[] = [];
  const add = (c: Cand | null) => {
    if (!c) return;
    const key = `${c.card}|${c.ambush ?? ''}|${(c.orders ?? []).join(',')}|${c.moves ? c.moves.map((m) => (m.kind === 'move' ? `${m.piece}>${m.to}` : '')).join(';') : 'online'}`;
    if (cands.some((x) => (x as Cand & { key?: string }).key === key)) return;
    (c as Cand & { key?: string }).key = key;
    cands.push(c);
  };
  if (forcedDiceLeft() > 0 || ctx.hasty) {
    // No simulations: pick by quick card scores; orders and moves are then chosen greedily when asked.
    // (Used while the forceDice test hook is active, so no dice are touched, and for a recruit's hasty turns.)
    const ben = pieceBenefits(root, me, null, ctx.W);
    let best: Cand | null = null;
    let bv = -Infinity;
    for (const [kind, id] of byKind) {
      const c: Cand = {
        card: id, kind, effective: kind, orders: null, moves: null, label: `${kind} (${ctx.hasty ? 'hasty' : 'quick'})`,
        retention: cardRetention(root, me, kind, ctx.W) * (ctx.keepScale?.(id) ?? 1), n: 1, sum: 0, laN: 0, laSum: 0, vals: [],
      };
      const v = quickCardScore(root, me, kind, ben) - c.retention;
      c.sum = v;
      cands.push(c);
      if (v > bv) {
        bv = v;
        best = c;
      }
    }
    return { best: best!, cands, sims: 0, ms: now() - ctx.start };
  }
  // Stage A: one base plan per distinct card (cheap no-move plans once the time budget is spent).
  for (const [kind, id] of byKind) {
    const ins = inspectCard(root, ctx, id);
    info.set(kind, { card: id, ...ins });
    const late = now() > ctx.start + 0.6 * (ctx.deadline - ctx.start);
    add(buildCand(root, ctx, id, ins.effective, ins.ocs?.[0] ?? null, late ? variants(ctx.W, 2)[1] : variants(ctx.W, 1)[0]));
    if (ins.ocs) for (const oc of ins.ocs) if (oc.ambush) add(buildCand(root, ctx, id, ins.effective, oc, variants(ctx.W, 1)[0]));
  }
  sampleTo(root, ctx, cands, cfg.k0);
  // Stage B: widen the most promising cards with more order sets and movement styles.
  const ranked = [...byKind.keys()]
    .map((k) => ({ k, sc: Math.max(...cands.filter((c) => c.kind === k).map((c) => candScore(c, ctx))) }))
    .sort((a, b) => b.sc - a.sc)
    .slice(0, cfg.topCards);
  const fresh: Cand[] = [];
  for (const { k } of ranked) {
    if (timeUp(ctx)) break;
    const inf = info.get(k)!;
    const ocs = inf.ocs ?? [null];
    ocs.slice(0, cfg.orderCands).forEach((oc, oi) => {
      const vs = variants(ctx.W, oi === 0 ? cfg.moveVariants : Math.min(2, cfg.moveVariants));
      // strike first: plan the units with the best immediate attacks before the line closes up
      if (oi === 0) vs.push({ tag: 'strike', W: ctx.W, noise: 0, strikeFirst: true });
      for (const v of vs) {
        if (oi === 0 && v.tag === 'base') continue;
        if (timeUp(ctx)) break;
        const before = cands.length;
        add(buildCand(root, ctx, inf.card, inf.effective, oc, v));
        if (cands.length > before) fresh.push(cands[cands.length - 1]);
      }
    });
  }
  sampleTo(root, ctx, fresh, cfg.k0);
  // Stage B2: perturbed movement plans for the two leading (card, orders) pairs.
  let pool = [...cands].sort((a, b) => candScore(b, ctx) - candScore(a, ctx));
  const extra: Cand[] = [];
  for (let i = 0; i < cfg.extraVariants && pool.length && !timeUp(ctx); i++) {
    const lead = pool[i % Math.min(2, pool.length)];
    if (lead.moves === null) continue;
    const r = ctx.rng;
    const v: Variant = {
      tag: `var${i}`,
      W: tweak(ctx.W, { riskSelf: ctx.W.riskSelf * (0.65 + 0.7 * r.next()), adv: ctx.W.adv * (0.4 + 1.2 * r.next()), attackNow: 0.7 + 0.35 * r.next() }),
      noise: 0.03 + 0.04 * r.next(),
      orderNoise: i === 0 || i % 2 === 1 ? 1.5 : 0,
    };
    const before = cands.length;
    add(buildCand(root, ctx, lead.card, lead.effective, lead.oc ?? null, v));
    if (cands.length > before) extra.push(cands[cands.length - 1]);
  }
  sampleTo(root, ctx, extra, cfg.k0);
  // Stage C: successive halving.
  pool = [...cands].sort((a, b) => candScore(b, ctx) - candScore(a, ctx));
  let k = cfg.k0;
  while (!timeUp(ctx) && pool.length > 2 && k < cfg.kMax) {
    pool = pool.slice(0, Math.max(2, Math.ceil(pool.length / 2)));
    k = Math.min(k * 2, cfg.kMax);
    sampleTo(root, ctx, pool, k);
    pool.sort((a, b) => candScore(b, ctx) - candScore(a, ctx));
  }
  if (pool.length >= 2 && !timeUp(ctx)) {
    pool = pool.slice(0, Math.min(3, pool.length));
    sampleTo(root, ctx, pool.slice(0, 2), cfg.kMax);
    pool.sort((a, b) => candScore(b, ctx) - candScore(a, ctx));
  }
  if (cfg.topUp > 0 && pool.length) pool = topUp(root, ctx, cands, pool);
  // Local refinement of the leading plan (consul).
  if (cfg.refine > 0 && pool.length && !timeUp(ctx)) {
    const lead = pool[0];
    const refs: Cand[] = [];
    for (const r of refineCands(root, ctx, lead, cfg.refine)) {
      const before = cands.length;
      add(r);
      if (cands.length > before) refs.push(cands[cands.length - 1]);
    }
    sampleTo(root, ctx, refs, cfg.k0);
    const top = refs.sort((a, b) => candScore(b, ctx) - candScore(a, ctx)).slice(0, 3);
    sampleTo(root, ctx, top, Math.max(cfg.k0, lead.n));
    pool = [...pool, ...top].sort((a, b) => candScore(b, ctx) - candScore(a, ctx));
  }
  // 2-ply check of the finalists (consul).
  if (cfg.lookahead > 0 && now() < ctx.deadline) {
    const fin = pool.slice(0, cfg.lookahead);
    const target = 16;
    for (let r = 0; r < target && now() < ctx.deadline; r++) {
      for (const c of fin) if (c.laN <= r && now() < ctx.deadline) sampleReply(root, ctx, c);
    }
    // only finalists with enough reply samples are compared on the mixed score
    const done = fin.filter((c) => c.laN >= 3);
    if (done.length >= 2) {
      for (const c of fin) if (c.laN < 3) { c.laN = 0; c.laSum = 0; }
      pool = [...done].sort((a, b) => candScore(b, ctx) - candScore(a, ctx));
    } else for (const c of fin) { c.laN = 0; c.laSum = 0; }
  }
  const all = [...cands].sort((a, b) => candScore(b, ctx) - candScore(a, ctx));
  let best = pool[0] ?? all[0];
  if (cfg.evalNoise > 0 || cfg.pickTemp > 0) {
    // Recruit: noisy judgement and a softmax pick among the top plans.
    const top = all.slice(0, 4).map((c) => ({ c, v: candScore(c, ctx) + cfg.evalNoise * ctx.rng.normal() }));
    const mx = Math.max(...top.map((t) => t.v));
    const ws = top.map((t) => Math.exp((t.v - mx) / Math.max(0.01, cfg.pickTemp)));
    let r = ctx.rng.next() * ws.reduce((a, x) => a + x, 0);
    for (let i = 0; i < top.length; i++) {
      r -= ws[i];
      if (r <= 0) {
        best = top[i].c;
        break;
      }
    }
  }
  return { best, cands: all, sims: ctx.sims, ms: now() - ctx.start };
}

// ---------------------------------------------------------------------------
// battle phase: rollouts per candidate attack
// ---------------------------------------------------------------------------

function battleRollout(root: GameState, ctx: PlanCtx, first: Answer, seed: number): number {
  const rng = new Rng(seed);
  const s = cloneState(root);
  determinize(s, ctx.me, rng);
  let used = false;
  const policy: Policy = (st, d) => {
    if (d.side !== ctx.me) return reactiveFast(st, d, ctx.oppW, rng);
    if (d.kind === 'battle') {
      if (!used) {
        used = true;
        return first;
      }
      return greedyBattle(st, ctx.W, rng);
    }
    if (d.kind === 'move') return { kind: 'endMove' };
    return reactiveFast(st, d, ctx.W, rng);
  };
  resumeTurn(s, policy, rng, 'battle');
  ctx.sims++;
  return evaluate(s, ctx.me, other(ctx.me), ctx.judgeW);
}

export function decideBattle(s: GameState, ctx: PlanCtx): Answer {
  const W = ctx.W;
  const opts = attackOptions(s, W);
  if (!opts.length) return { kind: 'endBattle' };
  const greedy = pickAttack(opts, W, ctx.rng, ctx.cfg.battleNoise);
  const greedyAns: Answer = greedy ? { kind: 'attack', unit: greedy.unit, target: greedy.target } : { kind: 'endBattle' };
  if (ctx.cfg.battleRollouts <= 0 || forcedDiceLeft() > 0) return greedyAns;
  const must = opts.filter((o) => o.must);
  const pool = (must.length ? must : opts)
    .slice()
    .sort((a, b) => b.ev + 0.15 * b.pElim - (a.ev + 0.15 * a.pElim))
    .slice(0, ctx.cfg.battleCands);
  const answers: Answer[] = pool.map((o) => ({ kind: 'attack', unit: o.unit, target: o.target }));
  if (!must.length) answers.push({ kind: 'endBattle' });
  if (answers.length === 1) return answers[0];
  const sums = answers.map(() => 0);
  const ns = answers.map(() => 0);
  let terminal = false;
  for (let r = 0; r < ctx.cfg.battleRollouts; r++) {
    if (r >= 3 && now() > ctx.deadline) break;
    const seed = ctx.rng.u32();
    answers.forEach((a, i) => {
      const v = battleRollout(s, ctx, a, seed);
      if (Math.abs(v) >= WIN_SCORE / 2) terminal = true;
      sums[i] += v;
      ns[i]++;
    });
  }
  // Game-deciding phase: look harder at the two best answers (rare catastrophes and wins need more samples).
  const T = s.bannersToWin;
  const matchPoint = s.players[ctx.me].banners >= T - 1 || s.players[other(ctx.me)].banners >= T - 1;
  if ((terminal || matchPoint) && answers.length >= 2) {
    const order = answers.map((_, i) => i).sort((a, b) => sums[b] / ns[b] - sums[a] / ns[a]).slice(0, 2);
    for (let r = 0; r < ctx.cfg.battleRollouts; r++) {
      if (r >= 4 && now() > ctx.deadline + 0.5 * (ctx.deadline - ctx.start)) break;
      const seed = ctx.rng.u32();
      for (const i of order) {
        sums[i] += battleRollout(s, ctx, answers[i], seed);
        ns[i]++;
      }
    }
  }
  let best = 0;
  let bv = -Infinity;
  answers.forEach((a, i) => {
    // small prior toward the analytic favourite to break near-ties
    const prior = a.kind === 'attack' && greedy && a.unit === greedy.unit && a.target === greedy.target ? 0.01 : 0;
    const v = sums[i] / Math.max(1, ns[i]) + prior;
    if (v > bv) {
      bv = v;
      best = i;
    }
  });
  return answers[best];
}

export function makeCtx(me: Side, W: Weights, oppW: Weights, rng: Rng, cfg: DiffCfg, scale: number, deterministic = false): PlanCtx {
  const start = now();
  return {
    me, W, oppW, rng, cfg, start,
    // deterministic mode: only simulation counts limit the search (a generous safety cap remains)
    deadline: start + (deterministic ? 60000 : cfg.budgetMs * scale),
    maxSims: Math.max(10, Math.round(cfg.maxSims * scale)),
    sims: 0,
    seeds: [],
    judgeW: cfg.exactEval ? { ...W, exactReach: 1 } : W,
  };
}
