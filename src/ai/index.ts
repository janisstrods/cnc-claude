// Computer opponent for Commands & Colors: Ancients.
//
// chooseAnswer() answers any engine Decision for the AI's side. The turn is planned when the card is chosen: every
// card in hand is tried with candidate order sets and movement plans, each plan is played out several times on
// determinised clones of the game (the opponent's hand and the deck are re-dealt from unseen cards, dice reseeded
// from the AI's private RNG), evaluated statically and compared, minus the value of keeping the card for later.
// Battles use rollouts per candidate attack; reactive decisions use fast expected-value heuristics.
import { CARD_DEFS, cardKind, modsFor, sectionOrders } from '../engine/cards';
import { ambushAvailable, ambushSections, battleTargets, pieceMoves } from '../engine/flow';
import { randomAnswer } from '../engine/legal';
import { validateOrders, validateRally, validateSpartacus } from '../engine/orders';
import { other, unitById } from '../engine/query';
import { cloneState, newTurn } from '../engine/setup';
import { rangeOf } from '../engine/elites';
import { OFF_BOARD, type Answer, type CardKind, type Decision, type GameState, type HexId, type SectionName, type Side, type UnitType } from '../engine/types';
import { hexDist } from './board';
import { attackOptions } from './estimate';
import { greedyMoveStep, type MoveCtx } from './moves';
import { orderCandidates } from './ordering';
import { PERSONALITIES, personalityById, personalityFor, type Personality } from './personality';
import { DIFFICULTY, candScore, decideBattle, makeCtx, planTurn, type Cand, type DiffCfg } from './planner';
import {
  chooseBonusCombat, chooseCavalryExtra, chooseIgnoreFlags, chooseLeaderEvade, chooseMomentum, choosePlacement, chooseRetreat,
  defendChoice, rallyAssign, spartacusAssign,
} from './policies';
import { Rng, entropySeed } from './rand';
import { safeAnswer } from './sim';
import { NEUTRAL_W, setViewer, weightsFor, type Difficulty, type Weights } from './values';
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
  /** Anti-stall: own turns in a row with nothing hurt on the board, the board signature and turn of the last check. */
  quiet?: number;
  quietSig?: number;
  quietTurn?: number;
  /** Turns past the patience threshold on the current turn (applied to all of this turn's decisions). */
  quietX?: number;
  /** Own-turn index (turns completed) at which each held card was first seen; keep value decays with time held. */
  cardSeen?: Record<string, number>;
  cardSeenIdx?: number;
  /** Camps captured as seen at the previous decision (commentary). */
  campsSeen?: number;
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
    quiet: 0,
    quietSig: -1,
    quietTurn: -1,
    quietX: 0,
    cardSeen: {},
    cardSeenIdx: -1,
    campsSeen: -1,
  };
}

const now = (): number => (globalThis.performance ? globalThis.performance.now() : Date.now());

/** Share of a recruit's turns played hastily (no simulations), and of its attacks picked loosely. */
const RECRUIT_HASTY = 0.5;
const RECRUIT_SCATTER = 0.4;

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
    case 'placeLeader':
      return a.kind === 'hex' && a.hex !== null && d.options.includes(a.hex);
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
    const range = rangeOf(u);
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

/** A Castulo break-out (unit leaving over the enemy baseline). */
function exitLine(s: GameState, me: Side, P: Personality, mem: AiMemory, rng: Rng, a: Answer): string | undefined {
  if (a.kind !== 'move' || a.to !== OFF_BOARD) return undefined;
  return speak(s, me, P, 'exit', mem.voice, rng, { chance: 1.2 });
}

/** Camp capture: a camp captured by our side since the previous decision (the engine credits it once the unit stops). */
function campLine(s: GameState, me: Side, P: Personality, mem: AiMemory, rng: Rng): string | undefined {
  const n = s.special.campsCaptured.length;
  const before = mem.campsSeen ?? -1;
  mem.campsSeen = n;
  if (before < 0 || n <= before || s.special.campCapture?.side !== me) return undefined;
  return speak(s, me, P, 'camp', mem.voice, rng, { chance: 2 });
}

// ---------------------------------------------------------------------------
// tempo and card-keeping memory
// ---------------------------------------------------------------------------

/** Banners and blocks on the board: changes whenever anything is hurt, destroyed or captured. */
function boardSig(s: GameState): number {
  let sig = s.players.top.banners * 1000 + s.players.bottom.banners * 100000;
  for (const u of s.units) if (u.hex >= 0) sig += u.blocks;
  return sig;
}

/**
 * Count our turns in a row in which nothing on the board was hurt; returns how many turns we are past our patience
 * (2 turns, 3 for the Shield). A fresh memory or a turn number going backwards (undo, resumed game) starts afresh.
 */
function stallPressure(s: GameState, P: Personality, mem: AiMemory): number {
  const sig = boardSig(s);
  const fresh = mem.quietTurn === undefined || mem.quietTurn < 0 || s.turn.number <= mem.quietTurn;
  mem.quiet = fresh ? 0 : sig === mem.quietSig ? (mem.quiet ?? 0) + 1 : 0;
  mem.quietSig = sig;
  mem.quietTurn = s.turn.number;
  const patience = P.id === 'shield' ? 3 : 2;
  mem.quietX = Math.max(0, mem.quiet - patience);
  return mem.quietX;
}

/** Lean forward after a stand-off: close in, accept more risk, stop saving cards (bolder generals ramp faster). */
function applyStall(W: Weights, qx: number, P: Personality): Weights {
  if (qx <= 0) return W;
  const ramp = 0.6 * (0.8 + 0.4 * P.aggression);
  return {
    ...W,
    adv: W.adv * Math.min(6, 1 + ramp * qx),
    riskSelf: W.riskSelf * Math.max(0.6, 1 - 0.08 * qx),
    retention: W.retention * Math.max(0.3, 1 - 0.15 * qx),
  };
}

/**
 * Track how many of our own turns each card has sat in hand. Keep values of non-section cards decay after 4 turns
 * (0.85 per extra turn) so strong cards are eventually spent instead of clogging the hand.
 */
function keepScales(s: GameState, me: Side, mem: AiMemory): (card: number) => number {
  const idx = s.special.turnsDone[me];
  const prev = mem.cardSeen && mem.cardSeenIdx !== undefined && mem.cardSeenIdx >= 0 && idx >= mem.cardSeenIdx ? mem.cardSeen : {};
  const seen: Record<string, number> = {};
  for (const c of s.players[me].hand) {
    const first = prev[c];
    seen[c] = first !== undefined && first <= idx ? first : idx;
  }
  mem.cardSeen = seen;
  mem.cardSeenIdx = idx;
  return (card: number) => {
    if (sectionOrders(cardKind(card))) return 1;
    const held = idx - (seen[card] ?? idx);
    return Math.pow(0.85, Math.max(0, held - 4));
  };
}

/** First Strike's keep value: decays while held, and is lower when few sound units are in contact to use it on. */
function firstStrikeKeep(s: GameState, me: Side, mem: AiMemory): number {
  const fs = s.players[me].hand.find((c) => cardKind(c) === 'firstStrike');
  if (fs === undefined) return 1;
  const decay = keepScales(s, me, mem)(fs);
  let strong = 0;
  for (const u of s.units) {
    if (u.side !== me || u.hex < 0 || u.blocks < 3) continue;
    if (s.units.some((e) => e.side !== me && e.hex >= 0 && hexDist(e.hex, u.hex) === 1)) strong++;
  }
  return decay * (0.6 + 0.2 * Math.min(2, strong));
}

// ---------------------------------------------------------------------------
// main entry
// ---------------------------------------------------------------------------

function decide(s: GameState, d: Decision, opts: AiOptions, mem: AiMemory, rng: Rng): { answer: Answer; say?: string } {
  const P = opts.personality;
  let W = weightsFor(P);
  // A recruit is careless about threats and spends strong cards at once.
  if (opts.difficulty === 'recruit') {
    // beginner habits: piecemeal advances (no eye for formation), careless of threats, spends cards at once
    W = {
      ...W, riskSelf: W.riskSelf * 0.35, retention: W.retention * 0.3, attackThreshold: W.attackThreshold - 0.1,
      support: 0, isolated: 0, stray: 0,
    };
  }
  if (opts.tune) W = { ...W, ...opts.tune };
  let cfg: DiffCfg = { ...(DIFFICULTY[opts.difficulty] ?? DIFFICULTY.tribune), ...(opts.cfgPatch ?? {}) };
  const scale = opts.budgetScale ?? 1;
  const me = d.side;
  const turn = s.turn.number;
  const det = !!opts.deterministic;
  const ourPlan = () => (mem.plan && mem.plan.turn === turn && mem.plan.side === me ? mem.plan : null);
  // a stand-off pushes this whole turn forward (planning, moves and battles)
  if (d.kind !== 'playCard' && s.active === me && mem.quietTurn === turn) W = applyStall(W, mem.quietX ?? 0, P);
  switch (d.kind) {
    case 'playCard': {
      const qx = stallPressure(s, P, mem);
      W = applyStall(W, qx, P);
      // match point: search wider (same time budget)
      if (opts.difficulty === 'tribune' && s.players[me].banners >= s.bannersToWin - 1) {
        cfg = { ...cfg, kMax: 64, extraVariants: 8, topCards: 6, k0: 8, topUp: 64, maxSims: cfg.maxSims * 2 };
      }
      const ctx = makeCtx(me, W, NEUTRAL_W, rng, cfg, scale, det);
      ctx.keepScale = keepScales(s, me, mem);
      // a recruit sometimes plays a hasty turn: first good-looking card, first order idea, greedy moves
      ctx.hasty = opts.difficulty === 'recruit' && rng.chance(RECRUIT_HASTY);
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
      const say = qx === 1 ? speak(s, me, P, 'stallBreak', mem.voice, rng, { chance: 2 }) : undefined;
      return { answer: { kind: 'playCard', card: b.card }, say: say ?? commentCard(s, me, P, mem, rng, b) };
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
      if (!p && s.turn.card !== null) {
        // No plan for this turn (resumed game, or a fresh worker mid-turn): plan again for the card already played.
        const root = cloneState(s);
        root.players[me].hand = [s.turn.card];
        root.turn = newTurn(me, turn);
        const ctx = makeCtx(me, W, NEUTRAL_W, rng, cfg, scale * 0.5, det);
        const b = planTurn(root, ctx).best;
        if (b && b.card === s.turn.card) {
          mem.plan = {
            turn, side: me, card: b.card, kind: b.kind, effective: b.effective, orders: b.orders, ambush: b.ambush,
            moves: b.moves, moveIdx: 0, label: `${b.label} (replanned)`, score: candScore(b, ctx),
          };
          const a: Answer | null = b.ambush ? { kind: 'orders', pieces: [], ambushSection: b.ambush } : b.orders ? { kind: 'orders', pieces: b.orders } : null;
          if (a && isLegal(s, d, a)) return { answer: a };
          mem.plan.moves = null;
        }
      }
      const oc = orderCandidates(s, me, d.card, W, 1)[0];
      if (mem.plan && ourPlan()) mem.plan.moves = null;
      if (oc?.ambush) return { answer: { kind: 'orders', pieces: [], ambushSection: oc.ambush } };
      return { answer: { kind: 'orders', pieces: oc?.pieces ?? [] } };
    }
    case 'move': {
      const p = ourPlan();
      if (d.stage === 1 && p && p.moves) {
        if (p.moveIdx < p.moves.length) {
          const a = p.moves[p.moveIdx++];
          if (isLegal(s, d, a)) return { answer: a, say: exitLine(s, me, P, mem, rng, a) };
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
      return { answer: a, say: exitLine(s, me, P, mem, rng, a) };
    }
    case 'battle': {
      if (opts.difficulty === 'recruit' && rng.chance(RECRUIT_SCATTER)) {
        // a beginner often hits whatever looks promising instead of the best target
        const good = attackOptions(s, W).filter((o) => o.ev > 0 || o.must);
        const must = good.filter((o) => o.must);
        const pool = must.length ? must : good;
        if (pool.length) {
          const o = rng.pick(pool);
          return { answer: { kind: 'attack', unit: o.unit, target: o.target } };
        }
      }
      const ctx = makeCtx(me, W, NEUTRAL_W, rng, cfg, scale * 0.3, !!opts.deterministic);
      const t0 = now();
      const a = decideBattle(s, ctx);
      mem.last = { kind: d.kind, ms: now() - t0, sims: ctx.sims };
      return { answer: a };
    }
    case 'defend': {
      let choice = defendChoice(s, d, W, d.canFirstStrike ? firstStrikeKeep(s, me, mem) : 1);
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
    case 'placeLeader':
      return { answer: { kind: 'hex', hex: choosePlacement(s, d) } };
  }
}

/** Choose an answer for `decision` (decision.side === opts.side). Always returns a legal answer. */
export function chooseAnswer(state: GameState, decision: Decision, opts: AiOptions, mem: AiMemory): { answer: Answer; say?: string } {
  if (!mem.rngState) mem.rngState = (opts.seed ?? entropySeed()) >>> 0 || 1;
  const rng = new Rng(mem.rngState);
  let out: { answer: Answer; say?: string };
  setViewer(decision.side);
  try {
    // Work on a private copy: the planner moves pieces around temporarily.
    const camp = campLine(state, decision.side, opts.personality, mem, rng);
    out = decide(cloneState(state), decision, opts, mem, rng);
    if (!isLegal(state, decision, out.answer)) out = { answer: fallback(state, decision, rng) };
    if (camp && !out.say) out.say = camp;
  } catch (e) {
    if (typeof console !== 'undefined') console.error('AI error', e);
    out = { answer: fallback(state, decision, rng) };
  }
  setViewer(null);
  mem.rngState = rng.state;
  return out;
}

/** Card title helper for logs. */
export function cardTitle(kind: CardKind): string {
  return CARD_DEFS[kind].title;
}
