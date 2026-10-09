// Computer opponent for Commands & Colors: Ancients.
//
// chooseAnswer() answers any engine Decision for the AI's side. The turn is planned when the card is chosen: every
// card in hand is tried with candidate order sets and movement plans, each plan is played out several times on
// determinised clones of the game (the opponent's hand and the deck are re-dealt from unseen cards, dice reseeded
// from the AI's private RNG), evaluated statically and compared, minus the value of keeping the card for later.
// Battles use rollouts per candidate attack; reactive decisions use fast expected-value heuristics.
import { CARD_DEFS, modsFor } from '../engine/cards';
import { ambushAvailable, ambushSections, battleTargets, pieceMoves } from '../engine/flow';
import { randomAnswer } from '../engine/legal';
import { validateOrders, validateRally, validateSpartacus } from '../engine/orders';
import { other, unitById } from '../engine/query';
import { cloneState } from '../engine/setup';
import { UNIT_STATS } from '../engine/units';
import type { Answer, CardKind, Decision, GameState, HexId, SectionName, Side, UnitType } from '../engine/types';
import { hexDist } from './board';
import { greedyMoveStep, type MoveCtx } from './moves';
import { orderCandidates } from './ordering';
import { PERSONALITIES, personalityById, personalityFor, type Personality } from './personality';
import { DIFFICULTY, candScore, decideBattle, makeCtx, planTurn, type Cand, type DiffCfg } from './planner';
import {
  chooseBonusCombat, chooseCavalryExtra, chooseIgnoreFlags, chooseLeaderEvade, chooseMomentum, chooseRetreat, defendChoice,
  rallyAssign, spartacusAssign,
} from './policies';
import { Rng, entropySeed } from './rand';
import { safeAnswer } from './sim';
import { NEUTRAL_W, weightsFor, type Difficulty, type Weights } from './values';
import { cardMoment, speak, type Moment, type VoiceMemory } from './voice';

export type { Difficulty } from './values';
export type { Personality } from './personality';
export { PERSONALITIES, personalityById, personalityFor };
export { DIFFICULTY } from './planner';

export interface AiOptions {
  side: Side;
  difficulty: Difficulty;
  personality: Personality;
  seed?: number;
  /** Scales thinking time and simulation counts (default 1). Tests and batch matches use less. */
  budgetScale?: number;
  /** Advanced: override evaluation weights (tuning experiments). */
  tune?: Partial<Weights>;
  /** Limit the search by simulation counts only (reproducible decisions for a given seed; for tests). */
  deterministic?: boolean;
  /** Advanced: override search settings of the difficulty level (experiments). */
  cfgPatch?: Partial<DiffCfg>;
}

interface StoredPlan {
  turn: number;
  side: Side;
  card: number;
  kind: CardKind;
  effective: CardKind | null;
  orders: string[] | null;
  ambush?: SectionName;
  moves: Answer[] | null;
  moveIdx: number;
  label: string;
  score: number;
}

/** Per-game scratch memory (plain data, structured-clone safe). */
export interface AiMemory {
  rngState: number;
  plan: StoredPlan | null;
  decided: string[];
  decidedKey: string;
  voice: VoiceMemory;
  bonusUnit: string | null;
  bonusTurn: number;
  seenBanners: { mine: number; theirs: number } | null;
  /** Diagnostics of the last decision (shown in dev tools / play review). */
  last: { kind: Decision['kind']; ms: number; sims: number; plan?: string; alternatives?: string[] } | null;
}

export function newMemory(): AiMemory {
  return {
    rngState: 0,
    plan: null,
    decided: [],
    decidedKey: '',
    voice: { recent: [], sayTurn: -1, saysThisTurn: 0 },
    bonusUnit: null,
    bonusTurn: -1,
    seenBanners: null,
    last: null,
  };
}

const now = (): number => (globalThis.performance ? globalThis.performance.now() : Date.now());

// ---------------------------------------------------------------------------
// legality (mirrors the engine's validators so an answer is never rejected)
// ---------------------------------------------------------------------------

function pendingMustBattle(s: GameState): boolean {
  for (const op of Object.values(s.turn.ordered)) {
    if (op.mustBattle && op.battlesLeft > 0 && unitById(s, op.id) && battleTargets(s, op.id).some((t) => t.kind === 'close')) return true;
  }
  return false;
}

export function isLegal(s: GameState, d: Decision, a: Answer): boolean {
  switch (d.kind) {
    case 'playCard':
      return a.kind === 'playCard' && s.players[d.side].hand.includes(a.card);
    case 'orders':
      if (a.kind !== 'orders') return false;
      if (a.ambushSection) return ambushAvailable(s, d.side, d.card) && ambushSections(d.card).includes(a.ambushSection);
      return !validateOrders(s, d.side, d.card, a.pieces);
    case 'move':
      if (a.kind === 'endMove') return true;
      return a.kind === 'move' && !!s.turn.ordered[a.piece] && pieceMoves(s, a.piece, d.stage).some((m) => m.hex === a.to);
    case 'battle': {
      if (a.kind === 'endBattle') return !pendingMustBattle(s);
      if (a.kind !== 'attack') return false;
      const t = battleTargets(s, a.unit).find((x) => x.hex === a.target);
      if (!t) return false;
      return !(s.turn.ordered[a.unit].mustBattle && t.kind !== 'close');
    }
    case 'defend':
      return a.kind === 'defend' && (a.choice === 'stand' || (a.choice === 'evade' && d.canEvade) || (a.choice === 'firstStrike' && d.canFirstStrike));
    case 'ignoreFlags':
      return a.kind === 'ignoreFlags' && Number.isInteger(a.count) && a.count >= 0 && a.count <= d.max;
    case 'retreat':
    case 'leaderEvade':
      return a.kind === 'choose' && Number.isInteger(a.index) && a.index >= 0 && a.index < d.options.length;
    case 'momentum':
      return a.kind === 'yesno';
    case 'cavalryExtra':
      return a.kind === 'hex' && (a.hex === null || d.options.includes(a.hex));
    case 'bonusCombat':
      return a.kind === 'hex' && (a.hex === null || d.targets.includes(a.hex));
    case 'rally':
      return a.kind === 'assign' && !validateRally(s, d.side, d.faces, a.ids);
    case 'spartacus':
      return a.kind === 'assign' && !validateSpartacus(s, d.side, d.faces, a.ids);
  }
}

function fallback(s: GameState, d: Decision, rng: Rng): Answer {
  for (let attempt = 1; attempt < 60; attempt++) {
    const a = safeAnswer(s, d, rng, attempt);
    if (isLegal(s, d, a)) return a;
  }
  return randomAnswer(s, d, () => rng.next());
}

// ---------------------------------------------------------------------------
// commentary helpers
// ---------------------------------------------------------------------------

function planShape(s: GameState, me: Side, b: Cand): { attacking: boolean; regrouping: boolean; advancing: boolean; focus?: UnitType } {
  const ordered = (b.orders ?? []).map((id) => unitById(s, id)).filter((u): u is NonNullable<typeof u> => !!u);
  const dest = new Map<string, HexId>();
  for (const m of b.moves ?? []) if (m.kind === 'move') dest.set(m.piece, m.to);
  let attacking = false;
  let back = 0;
  let fwd = 0;
  let focus: UnitType | undefined;
  const enemies = s.units.filter((u) => u.side !== me && u.hex >= 0);
  const noRanged = b.effective ? modsFor(b.effective).noRanged : false;
  for (const u of ordered) {
    const h = dest.get(u.id) ?? u.hex;
    if (h < 0) continue;
    const near = Math.min(99, ...enemies.map((e) => hexDist(e.hex, h)));
    const nearBefore = Math.min(99, ...enemies.map((e) => hexDist(e.hex, u.hex)));
    const range = UNIT_STATS[u.type].range;
    if (near <= 1 || (range > 0 && near <= range && !noRanged)) {
      attacking = true;
      focus ??= u.type;
    }
    if (near > nearBefore) back++;
    if (near < nearBefore) fwd++;
  }
  if (b.effective === 'clash' || b.effective === 'darken') attacking = true;
  if (!focus && ordered.length) focus = ordered[0].type;
  return { attacking, regrouping: !attacking && back > fwd, advancing: !attacking && fwd > 0, focus };
}

function commentCard(s: GameState, me: Side, P: Personality, mem: AiMemory, rng: Rng, b: Cand): string | undefined {
  const opp = other(me);
  const mine = s.players[me].banners;
  const theirs = s.players[opp].banners;
  const T = s.bannersToWin;
  const prev = mem.seenBanners;
  mem.seenBanners = { mine, theirs };
  if (b.ambush) return speak(s, me, P, 'ambush', mem.voice, rng, { chance: 2 });
  if (prev && mine > prev.mine && rng.chance(0.6)) {
    const line = speak(s, me, P, mine >= T - 1 ? 'nearVictory' : 'gained', mem.voice, rng, { chance: 1.2 });
    if (line) return line;
  }
  if (prev && theirs > prev.theirs && rng.chance(0.5)) {
    const line = speak(s, me, P, theirs >= T - 1 ? 'desperate' : 'lost', mem.voice, rng, { chance: 1 });
    if (line) return line;
  }
  const shape = planShape(s, me, b);
  let m: Moment = cardMoment(b.effective, shape.attacking, shape.regrouping, shape.advancing);
  if (b.kind === 'counterAttack' && b.effective) m = rng.chance(0.6) ? 'counter' : m;
  const important = m === 'clash' || m === 'darken' || m === 'rally' || m === 'counter' || m === 'spartacus' || m === 'mounted';
  return speak(s, me, P, m, mem.voice, rng, { troops: shape.focus, chance: important ? 0.75 : 0.35 });
}

// ---------------------------------------------------------------------------
// main entry
// ---------------------------------------------------------------------------

function decide(s: GameState, d: Decision, opts: AiOptions, mem: AiMemory, rng: Rng): { answer: Answer; say?: string } {
  const P = opts.personality;
  let W = weightsFor(P);
  // A recruit is careless about threats and spends strong cards at once.
  if (opts.difficulty === 'recruit') {
    W = { ...W, riskSelf: W.riskSelf * 0.4, retention: W.retention * 0.3, attackThreshold: W.attackThreshold - 0.1, support: W.support * 0.5 };
  }
  if (opts.tune) W = { ...W, ...opts.tune };
  const cfg: DiffCfg = { ...(DIFFICULTY[opts.difficulty] ?? DIFFICULTY.tribune), ...(opts.cfgPatch ?? {}) };
  const scale = opts.budgetScale ?? 1;
  const me = d.side;
  const turn = s.turn.number;
  const ourPlan = () => (mem.plan && mem.plan.turn === turn && mem.plan.side === me ? mem.plan : null);
  switch (d.kind) {
    case 'playCard': {
      const ctx = makeCtx(me, W, NEUTRAL_W, rng, cfg, scale, !!opts.deterministic);
      const res = planTurn(s, ctx);
      const b = res.best;
      mem.plan = {
        turn, side: me, card: b.card, kind: b.kind, effective: b.effective, orders: b.orders, ambush: b.ambush,
        moves: b.moves, moveIdx: 0, label: b.label, score: candScore(b, ctx),
      };
      mem.decided = [];
      mem.decidedKey = '';
      mem.last = {
        kind: d.kind, ms: res.ms, sims: res.sims, plan: `${b.label} = ${candScore(b, ctx).toFixed(3)}`,
        alternatives: res.cands.slice(0, 6).map((c) => `${c.label}: ${candScore(c, ctx).toFixed(3)} (n=${c.n}${c.laN ? `, 2ply=${c.laN}` : ''}, keep=${c.retention.toFixed(2)})`),
      };
      return { answer: { kind: 'playCard', card: b.card }, say: commentCard(s, me, P, mem, rng, b) };
    }
    case 'orders': {
      const p = ourPlan();
      if (p && (p.effective === d.card || p.effective === null)) {
        if (p.ambush) return { answer: { kind: 'orders', pieces: [], ambushSection: p.ambush } };
        if (p.orders) {
          const a: Answer = { kind: 'orders', pieces: p.orders };
          if (isLegal(s, d, a)) return { answer: a };
        }
      }
      const oc = orderCandidates(s, me, d.card, W, 1)[0];
      if (mem.plan && p) mem.plan.moves = null;
      if (oc?.ambush) return { answer: { kind: 'orders', pieces: [], ambushSection: oc.ambush } };
      return { answer: { kind: 'orders', pieces: oc?.pieces ?? [] } };
    }
    case 'move': {
      const p = ourPlan();
      if (d.stage === 1 && p && p.moves) {
        if (p.moveIdx < p.moves.length) {
          const a = p.moves[p.moveIdx++];
          if (isLegal(s, d, a)) return { answer: a };
          p.moves = null; // the plan broke (e.g. a marsh casualty): continue greedily
        } else return { answer: { kind: 'endMove' } };
      }
      const key = `${turn}:${d.stage}`;
      if (mem.decidedKey !== key) {
        mem.decidedKey = key;
        mem.decided = [];
      }
      const mc: MoveCtx = { me, W, rng, noise: cfg.evalNoise * 0.15, decided: new Set(mem.decided) };
      const a = greedyMoveStep(s, d.stage, mc);
      mem.decided = [...mc.decided];
      return { answer: a };
    }
    case 'battle': {
      const ctx = makeCtx(me, W, NEUTRAL_W, rng, cfg, scale * 0.3, !!opts.deterministic);
      const t0 = now();
      const a = decideBattle(s, ctx);
      mem.last = { kind: d.kind, ms: now() - t0, sims: ctx.sims };
      return { answer: a };
    }
    case 'defend': {
      let choice = defendChoice(s, d, W);
      if (cfg.mistakeRate && rng.chance(cfg.mistakeRate)) {
        const alts: ('stand' | 'evade')[] = d.canEvade ? ['stand', 'evade'] : ['stand'];
        choice = rng.pick(alts);
      }
      const u = unitById(s, d.target);
      const say = choice === 'firstStrike'
        ? speak(s, me, P, 'firstStrike', mem.voice, rng, { chance: 1.5 })
        : choice === 'evade' && u && u.blocks <= 2
          ? speak(s, me, P, 'evade', mem.voice, rng, { troops: u.type, chance: 0.35 })
          : undefined;
      return { answer: { kind: 'defend', choice }, say };
    }
    case 'ignoreFlags':
      return { answer: { kind: 'ignoreFlags', count: cfg.mistakeRate && rng.chance(cfg.mistakeRate) ? d.max : chooseIgnoreFlags(s, d, W) } };
    case 'retreat':
      return { answer: { kind: 'choose', index: chooseRetreat(s, d, W) } };
    case 'leaderEvade': {
      const index = chooseLeaderEvade(s, d, W);
      const o = d.options[index];
      const say = o && (o.escapes?.length || o.attachLeader) ? speak(s, me, P, 'leaderEscape', mem.voice, rng, { chance: 0.5 }) : undefined;
      return { answer: { kind: 'choose', index }, say };
    }
    case 'momentum': {
      const bonusPossible = !(mem.bonusUnit === d.unit && mem.bonusTurn === turn);
      const yes = chooseMomentum(s, d, W, bonusPossible);
      const u = unitById(s, d.unit);
      const say = yes && s.active === me ? speak(s, me, P, 'momentum', mem.voice, rng, { troops: u?.type, chance: 0.25 }) : undefined;
      return { answer: { kind: 'yesno', yes }, say };
    }
    case 'cavalryExtra':
      return { answer: { kind: 'hex', hex: chooseCavalryExtra(s, d, W) } };
    case 'bonusCombat': {
      const hex = chooseBonusCombat(s, d, W);
      if (hex !== null) {
        mem.bonusUnit = d.unit;
        mem.bonusTurn = turn;
      }
      return { answer: { kind: 'hex', hex } };
    }
    case 'rally':
      return { answer: { kind: 'assign', ids: rallyAssign(s, me, d.faces) } };
    case 'spartacus':
      return { answer: { kind: 'assign', ids: spartacusAssign(s, me, d.faces, W) } };
  }
}

/** Choose an answer for `decision` (decision.side === opts.side). Always returns a legal answer. */
export function chooseAnswer(state: GameState, decision: Decision, opts: AiOptions, mem: AiMemory): { answer: Answer; say?: string } {
  if (!mem.rngState) mem.rngState = (opts.seed ?? entropySeed()) >>> 0 || 1;
  const rng = new Rng(mem.rngState);
  let out: { answer: Answer; say?: string };
  try {
    // Work on a private copy: the planner moves pieces around temporarily.
    out = decide(cloneState(state), decision, opts, mem, rng);
    if (!isLegal(state, decision, out.answer)) out = { answer: fallback(state, decision, rng) };
  } catch (e) {
    if (typeof console !== 'undefined') console.error('AI error', e);
    out = { answer: fallback(state, decision, rng) };
  }
  mem.rngState = rng.state;
  return out;
}

/** Card title helper for logs. */
export function cardTitle(kind: CardKind): string {
  return CARD_DEFS[kind].title;
}
