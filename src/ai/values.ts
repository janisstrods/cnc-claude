// Valuation constants and personality-derived weights. One banner ~ 1.0 point.
import type { GameState, Leader, Side, Unit, UnitType } from '../engine/types';
import type { Personality } from './personality';

export type Difficulty = 'recruit' | 'tribune' | 'consul';

/** Value of a full-strength unit's fighting power (in banners). */
export const TYPE_WEIGHT: Record<UnitType, number> = {
  LI: 0.45, LB: 0.5, LS: 0.5, AX: 0.55, WA: 0.65, MI: 0.75, HI: 0.9,
  LC: 0.55, MC: 0.72, HC: 0.85, EL: 0.8, HCH: 0.7,
};

export const LEADER_VALUE = 0.4;
export const WIN_SCORE = 100;
/** Cap on the value of the opponent's winning banner used in risk estimates (they are approximate). */
const WINNING_BANNER = 6;

export function unitWeight(u: Unit): number {
  return TYPE_WEIGHT[u.type] * (u.sacredBand ? 1.25 : 1);
}

export function blockVal(u: Unit): number {
  return unitWeight(u) / u.maxBlocks;
}

/** Value of reaching banner number k (k-th banner) out of T. */
export function bannerStep(k: number, T: number): number {
  if (k >= T) return WINNING_BANNER;
  const x = k / T;
  return 1 + 0.9 * x * x;
}

export function bannerScore(b: number, T: number): number {
  let v = 0;
  for (let k = 1; k <= b && k < T; k++) v += bannerStep(k, T);
  return v;
}

/** Value of the next banner the given side would capture. */
export function nextBanner(s: GameState, side: Side): number {
  return bannerStep(s.players[side].banners + 1, s.bannersToWin);
}

export function leaderVal(s: GameState, l: Leader): number {
  if (s.special.sacredLeaderId === l.id) return WINNING_BANNER;
  return LEADER_VALUE;
}

export interface Weights {
  /** Multiplier on expected losses to own units/leaders from enemy threats. */
  riskSelf: number;
  /** Multiplier on own threats against the enemy. */
  riskEnemy: number;
  /** Threat weight for the side that moves next / the side that moves later. */
  now: number;
  later: number;
  /** Per-hex penalty for healthy units far from the enemy. */
  adv: number;
  mountedAdv: number;
  /** Bonus for a front-line unit with 2+ supporting neighbours; penalty for an isolated one. */
  support: number;
  isolated: number;
  /** Unit with no friend within 2 hexes while enemies are near. */
  stray: number;
  /** Leader attached to a front-line unit; lone leader far from troops. */
  leaderFront: number;
  lonelyLeader: number;
  helmetAura: number;
  /** Battle decisions. */
  attackThreshold: number;
  bonusThreshold: number;
  bonusValue: number;
  momentumBias: number;
  attackNow: number;
  /** Card retention scale. */
  retention: number;
  objective: number;
  /** Probability-ish weights that an enemy unit attacks next turn (adjacent / must move first). */
  pOrderAdj: number;
  pOrderReach: number;
  evadeBias: number;
  /** 1 = threat model uses exact enemy movement (slower, more accurate); 0 = distance approximation. */
  exactReach: number;
}

export function weightsFor(p: Personality): Weights {
  return {
    riskSelf: 0.55 + 0.6 * p.caution,
    riskEnemy: 0.4 + 0.45 * p.aggression,
    now: 1,
    later: 0.4,
    adv: 0.006 + 0.03 * p.aggression,
    mountedAdv: 1 + 0.3 * p.dash,
    support: 0.025 + 0.035 * p.caution,
    isolated: 0.015 + 0.035 * p.caution,
    stray: 0.03 + 0.04 * p.caution,
    leaderFront: 0.035 + 0.03 * p.aggression,
    lonelyLeader: 0.06,
    helmetAura: 0.012,
    attackThreshold: 0.04 - 0.1 * p.aggression,
    bonusThreshold: 0.02 - 0.08 * p.aggression,
    bonusValue: 0.05 + 0.06 * p.aggression,
    momentumBias: 0.04 * (p.aggression - 0.45),
    attackNow: 0.85,
    retention: 0.6 + 0.8 * p.cunning,
    objective: 1,
    pOrderAdj: 0.55,
    pOrderReach: 0.3,
    evadeBias: 0.03 * (p.caution - 0.4),
    exactReach: 0,
  };
}

/** Neutral weights used to model the opponent's own reactions inside simulations. */
export const NEUTRAL_P: Personality = {
  id: 'neutral', name: 'Neutral', epithet: '', aggression: 0.55, caution: 0.55, cunning: 0.5, dash: 0.5, voice: 'stoic', chatter: 0,
};
export const NEUTRAL_W: Weights = weightsFor(NEUTRAL_P);

export function tweak(W: Weights, patch: Partial<Weights>): Weights {
  return { ...W, ...patch };
}
