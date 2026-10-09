// Movement planning: score each reachable hex of an ordered piece by the resulting position plus the attack it enables.
import { capturableCamp, movablePieces, pieceMoves } from '../engine/flow';
import { attachedLeader, isLeaderId, leaderById, leaderUnit, other, unitById } from '../engine/query';
import type { MoveTarget } from '../engine/movement';
import { OFF_BOARD, type Answer, type GameState, type HexId, type Side } from '../engine/types';
import { Occ, hexDist } from './board';
import { attackNowValue } from './estimate';
import { evaluate } from './evaluate';
import type { Rng } from './rand';
import { WIN_SCORE, type Weights } from './values';

export interface MoveCtx {
  me: Side;
  W: Weights;
  rng?: Rng;
  noise: number;
  /** Pieces whose move has been decided this phase. */
  decided: Set<string>;
  /** Random perturbation of the order in which pieces are planned (plan diversity). */
  orderNoise?: number;
  /** Plan the pieces with the biggest immediate strike first (so a shooter's only firing hex is not taken). */
  strikeFirst?: boolean;
}

function nearestEnemy(s: GameState, hex: HexId, side: Side): number {
  let best = 99;
  for (const u of s.units) if (u.side !== side && u.hex >= 0) best = Math.min(best, hexDist(hex, u.hex));
  return best;
}

/** Score the position if `id` moves to `m` (null = stays). */
export function scoreOption(s: GameState, id: string, m: MoveTarget | null, stage: 1 | 2, mc: MoveCtx): number {
  const { me, W } = mc;
  const opp = other(me);
  const noise = mc.noise && mc.rng ? mc.noise * mc.rng.normal() : 0;
  if (isLeaderId(id)) {
    const l = leaderById(s, id)!;
    const old = l.hex;
    if (m) l.hex = m.hex;
    const v = evaluate(s, me, opp, W);
    l.hex = old;
    return v + noise;
  }
  const u = unitById(s, id)!;
  const op = s.turn.ordered[id];
  const old = u.hex;
  const l = old >= 0 ? attachedLeader(s, u) : undefined;
  const p = s.players[me];
  const bannersBefore = p.banners;
  let campPushed = false;
  if (m) {
    if (m.hex === OFF_BOARD) {
      // Castulo exit: banner, unit (and leader) leave
      p.banners += 1;
      if (p.banners >= s.bannersToWin) {
        p.banners = bannersBefore;
        return WIN_SCORE;
      }
    } else if (capturableCamp(s, me, m.hex)) {
      p.banners += 1;
      if (p.banners >= s.bannersToWin) {
        p.banners = bannersBefore;
        return WIN_SCORE;
      }
      s.special.campsCaptured.push(m.hex);
      campPushed = true;
    }
    u.hex = m.hex;
    if (l) l.hex = m.hex;
  }
  let v = evaluate(s, me, opp, W);
  if (stage === 1 && u.hex >= 0) {
    const occ = new Occ(s);
    const moved = m ? m.dist : op.moved;
    const canBattle = m ? m.canBattle : op.canBattle;
    const must = m ? m.mustBattle : false;
    v += W.attackNow * attackNowValue(s, occ, u, moved, canBattle && op.battlesLeft > 0, must, W);
  }
  u.hex = old;
  if (l) l.hex = old;
  p.banners = bannersBefore;
  if (campPushed) s.special.campsCaptured.pop();
  return v + noise;
}

/** Best destination for a piece, or null to stay. */
export function bestMoveFor(s: GameState, id: string, stage: 1 | 2, mc: MoveCtx): HexId | null {
  const moves = pieceMoves(s, id, stage);
  if (!moves.length) return null;
  const isReserve = !isLeaderId(id) && (unitById(s, id)?.hex ?? 0) < 0;
  let best: HexId | null = null;
  let bestScore = isReserve ? -Infinity : scoreOption(s, id, null, stage, mc) + 0.004;
  for (const m of moves) {
    const sc = scoreOption(s, id, m, stage, mc);
    if (sc > bestScore) {
      bestScore = sc;
      best = m.hex;
    }
  }
  return best;
}

function orderKey(s: GameState, id: string, me: Side): number {
  if (isLeaderId(id)) {
    const l = leaderById(s, id);
    if (!l) return 2000;
    if (l.hex < 0) return 1500; // reserve leader: after its units entered
    return leaderUnit(s, l) ? -100 : 1000; // detach decisions first, lone leaders last
  }
  const u = unitById(s, id);
  if (!u) return 2000;
  if (u.hex < 0) return -50;
  return nearestEnemy(s, u.hex, me);
}

/** Best attack a unit could make this turn after one of its moves (strike-first ordering). */
function strikeKey(s: GameState, id: string, stage: 1 | 2, W: Weights): number {
  const u = unitById(s, id);
  if (!u || u.hex < 0 || stage !== 1) return 0;
  const op = s.turn.ordered[id];
  if (!op || !op.canBattle || op.battlesLeft <= 0) return 0;
  const old = u.hex;
  const l = attachedLeader(s, u);
  let best = 0;
  try {
    for (const m of pieceMoves(s, id, stage)) {
      if (m.hex < 0 || !m.canBattle) continue;
      u.hex = m.hex;
      if (l) l.hex = m.hex;
      const v = attackNowValue(s, new Occ(s), u, m.dist, true, m.mustBattle, W);
      if (v > best) best = v;
    }
  } finally {
    u.hex = old;
    if (l) l.hex = old;
  }
  return best;
}

/** Next move of the greedy planner (front units first, then supports, lone leaders last). */
export function greedyMoveStep(s: GameState, stage: 1 | 2, mc: MoveCtx): Answer {
  const ids = movablePieces(s, stage).filter((id) => !mc.decided.has(id));
  if (!ids.length) return { kind: 'endMove' };
  const jitter = () => (mc.orderNoise && mc.rng ? mc.orderNoise * mc.rng.normal() : 0);
  const strike = (id: string) => (mc.strikeFirst && !isLeaderId(id) ? 10 * strikeKey(s, id, stage, mc.W) : 0);
  const keys = new Map(ids.map((id) => [id, orderKey(s, id, mc.me) + jitter() - strike(id)]));
  ids.sort((a, b) => keys.get(a)! - keys.get(b)!);
  for (const id of ids) {
    mc.decided.add(id);
    const to = bestMoveFor(s, id, stage, mc);
    if (to !== null) return { kind: 'move', piece: id, to };
  }
  return { kind: 'endMove' };
}
