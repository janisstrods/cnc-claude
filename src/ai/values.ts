// Valuation constants and personality-derived weights. One banner ~ 1.0 point.
import { leaderHas } from '../engine/query';
import type { EliteId, GameState, Leader, Side, Unit, UnitType } from '../engine/types';
import type { Personality } from './personality';

export type Difficulty = 'recruit' | 'tribune' | 'consul';

/** Value of a full-strength unit's fighting power (in banners). */
export const TYPE_WEIGHT: Record<UnitType, number> = {
  LI: 0.45, LB: 0.5, LS: 0.5, AX: 0.55, WA: 0.65, MI: 0.75, HI: 0.9,
  LC: 0.55, MC: 0.72, HC: 0.85, EL: 0.8, HCH: 0.7,
  // Expansion #1: light bow cavalry ~ LC with a longer bow; camels ~ MC; war machines shoot far but are fragile (2 blocks)
  LBC: 0.6, CAM: 0.72, HWM: 0.55,
};

/** Multiplier on the weight of a unit carrying this elite preset. */
export const ELITE_WEIGHT: Record<EliteId, number> = {
  carthSacredBand: 1.25,
  thebanSacredBand: 1.25,
  silverShields: 1.25,
  companions: 1.2,
  immortals: 1.15,
  bowAuxilia: 1.1,
};

export const LEADER_VALUE = 0.4;
/** Alexander (`ccBonus`, +1 close-combat die to his unit) is worth more than an ordinary leader. */
const CC_BONUS_LEADER = 1.5;
export const WIN_SCORE = 100;
/** Cap on the value of the opponent's winning banner used in risk estimates (they are approximate). */
const WINNING_BANNER = 6;

export function unitWeight(u: Unit): number {
  return TYPE_WEIGHT[u.type] * (u.elite ? ELITE_WEIGHT[u.elite] : 1);
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

/**
 * Losing this leader loses the battle outright (Castulo's Scipio). His own side prices him far above a winning banner
 * (the threat model underrates a targeted hunt); the enemy keeps the winning-banner value, so it does not turn reckless.
 */
export const SACRED_LEADER_VALUE = 20;

let viewer: Side | null = null;

/** The side the AI is currently deciding for (set around each decision; null = owner's view). */
export function setViewer(side: Side | null): void {
  viewer = side;
}

/** Material worth of a leader on the board (traits included, scenario objectives not). */
export function leaderWorth(l: Leader): number {
  return leaderHas(l, 'ccBonus') ? CC_BONUS_LEADER * LEADER_VALUE : LEADER_VALUE;
}

/**
 * Hellespont (`allLeadersSuddenDeath`, 112): eliminations of `side`'s leaders still needed for the instant win (Infinity
 * without the rule). A leader who evaded off the board is never eliminated, so the count can exceed the leaders left.
 */
export function leadersToLose(s: GameState, side: Side): number {
  const sp = s.special;
  if (!sp.rules.includes('allLeadersSuddenDeath')) return Infinity;
  return sp.leadersAtStart[side] - sp.leadersEliminated[side];
}

/** Killing this leader ends the battle at once: Castulo's Scipio, or the last leader of a Hellespont side. */
export function isSacredLeader(s: GameState, l: Leader): boolean {
  return s.special.sacredLeaderId === l.id || leadersToLose(s, l.side) <= 1;
}

/** Hellespont: a lost leader costs a card and a point of Command for the rest of the battle (`leaderLossCostsCard`). */
const CARD_AND_COMMAND = 0.5;
/** Hellespont: losing one of two leaders leaves the side one kill from defeat. */
const SUDDEN_DEATH_STEP = 1;

/** Extra value at stake when a leader of `side` is eliminated under the Hellespont rules (0 in every other battle). */
function leaderLossStake(s: GameState, side: Side): number {
  let v = 0;
  const sp = s.special;
  if (sp.rules.includes('leaderLossCostsCard') && s.players[side].command > 1) v += CARD_AND_COMMAND;
  if (leadersToLose(s, side) === 2) v += SUDDEN_DEATH_STEP;
  return v;
}

/**
 * Standing cost to `side` of the leaders it has already lost under the Hellespont rules (part of the material term): the
 * cards and Command they cost, and the liability of being one kill from defeat. 0 in every other battle.
 */
export function leaderLossCost(s: GameState, side: Side): number {
  const sp = s.special;
  if (!sp.rules.includes('leaderLossCostsCard') && !sp.rules.includes('allLeadersSuddenDeath')) return 0;
  let v = 0;
  if (sp.rules.includes('leaderLossCostsCard')) v += CARD_AND_COMMAND * sp.leadersEliminated[side];
  if (leadersToLose(s, side) === 1 && s.leaders.some((l) => l.side === side && l.hex >= 0)) v += SUDDEN_DEATH_STEP;
  return v;
}

export function leaderVal(s: GameState, l: Leader): number {
  if (isSacredLeader(s, l)) return viewer === null || viewer === l.side ? SACRED_LEADER_VALUE : WINNING_BANNER;
  return leaderWorth(l) + leaderLossStake(s, l.side);
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
