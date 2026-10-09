// Card knowledge: how valuable it is to keep a card in hand for later, and a quick estimate of what a card can do now.
import { ambushAvailable } from '../engine/flow';
import { inSection } from '../engine/hex';
import { leadersOf, unitsOf } from '../engine/query';
import { UNIT_STATS, hasRanged } from '../engine/units';
import type { CardKind, GameState, SectionName, Side, Unit } from '../engine/types';
import { areAdjacent } from '../engine/hex';
import { rallyCandidates } from '../engine/orders';
import { hexDist } from './board';
import type { Weights } from './values';

function nearestEnemy(s: GameState, u: Unit): number {
  let best = 99;
  for (const v of s.units) if (v.side !== u.side && v.hex >= 0) best = Math.min(best, hexDist(u.hex, v.hex));
  return best;
}

const SECTION_OF: Partial<Record<CardKind, [SectionName, number]>> = {
  order2L: ['left', 2], order2C: ['center', 2], order2R: ['right', 2],
  order3L: ['left', 3], order3C: ['center', 3], order3R: ['right', 3],
  order4L: ['left', 4], order4C: ['center', 4], order4R: ['right', 4],
};

/** Value (in banners) of keeping this card for a later turn. */
export function cardRetention(s: GameState, side: Side, kind: CardKind, W: Weights): number {
  const units = unitsOf(s, side);
  const engaged = (u: Unit) => nearestEnemy(s, u) <= 3;
  const activity = (sec: SectionName, n: number) => {
    const c = units.filter((u) => inSection(u.hex, side, sec));
    const e = c.filter(engaged).length;
    return Math.min(1, (0.35 * c.length + e) / n);
  };
  const countOf = (f: (u: Unit) => boolean) => units.filter(f).length;
  let v = 0;
  const sec = SECTION_OF[kind];
  if (sec) {
    const base = sec[1] === 2 ? 0.05 : sec[1] === 3 ? 0.12 : 0.24;
    v = base * activity(sec[0], sec[1]);
  } else {
    switch (kind) {
      case 'outFlanked': v = 0.07 * (activity('left', 2) + activity('right', 2)); break;
      case 'coordinated': v = 0.05; break;
      case 'orderLight': v = 0.1 * Math.min(1, countOf((u) => UNIT_STATS[u.type].cls === 'light') / 3); break;
      case 'orderMedium': v = 0.11 * Math.min(1, countOf((u) => UNIT_STATS[u.type].cls === 'medium') / 3); break;
      case 'orderHeavy': v = 0.12 * Math.min(1, countOf((u) => UNIT_STATS[u.type].cls === 'heavy') / 3); break;
      case 'orderMounted': v = 0.14 * Math.min(1, countOf((u) => UNIT_STATS[u.type].mounted) / 3); break;
      case 'inspiredL':
      case 'inspiredC':
      case 'inspiredR': {
        const secn: SectionName = kind === 'inspiredL' ? 'left' : kind === 'inspiredC' ? 'center' : 'right';
        v = leadersOf(s, side).some((l) => inSection(l.hex, side, secn)) ? 0.22 : 0.05;
        break;
      }
      case 'leadershipAny': v = leadersOf(s, side).length ? 0.15 : 0.03; break;
      case 'clash': v = 0.45; break;
      case 'counterAttack': v = 0.1; break;
      case 'darken': v = 0.18 * Math.min(1, countOf((u) => hasRanged(u.type)) / 3); break;
      case 'doubleTime': v = countOf((u) => UNIT_STATS[u.type].foot) >= 2 ? 0.1 : 0.02; break;
      case 'lineCommand': v = 0.16 * Math.min(1, countOf((u) => UNIT_STATS[u.type].foot) / 4); break;
      case 'mountedCharge': v = 0.3 * Math.min(1, countOf((u) => UNIT_STATS[u.type].mounted) / 2); break;
      case 'moveFireMove': v = 0.1 * Math.min(1, countOf((u) => UNIT_STATS[u.type].cls === 'light') / 3); break;
      case 'firstStrike': v = 0.6; break;
      case 'rally': v = 0.1 + 0.12 * Math.min(1, rallyCandidates(s, side).length / 2); break;
      case 'spartacus': v = 0.25; break;
      default: v = 0.05;
    }
  }
  if (ambushAvailable(s, side, kind)) v += 0.35;
  return v * W.retention;
}

/**
 * Rough "what can this card do right now" score from per-unit benefits (used by the fast opponent model).
 */
export function quickCardScore(s: GameState, side: Side, kind: CardKind, ben: Map<string, number>): number {
  const units = unitsOf(s, side);
  const b = (u: Unit) => Math.max(0, ben.get(u.id) ?? 0);
  const topN = (list: Unit[], n: number) => list.map(b).sort((x, y) => y - x).slice(0, n).reduce((a, x) => a + x, 0);
  const sec = SECTION_OF[kind];
  const command = s.players[side].command;
  if (sec) return topN(units.filter((u) => inSection(u.hex, side, sec[0])), sec[1]);
  switch (kind) {
    case 'outFlanked':
      return topN(units.filter((u) => inSection(u.hex, side, 'left')), 2) + topN(units.filter((u) => inSection(u.hex, side, 'right')), 2);
    case 'coordinated':
      return (['left', 'center', 'right'] as SectionName[]).reduce((a, x) => a + topN(units.filter((u) => inSection(u.hex, side, x)), 1), 0);
    case 'orderLight': return topN(units.filter((u) => UNIT_STATS[u.type].cls === 'light'), command) || topN(units, 1);
    case 'orderMedium': return topN(units.filter((u) => UNIT_STATS[u.type].cls === 'medium'), command) || topN(units, 1);
    case 'orderHeavy': return topN(units.filter((u) => UNIT_STATS[u.type].cls === 'heavy'), command) || topN(units, 1);
    case 'orderMounted':
    case 'mountedCharge': return topN(units.filter((u) => UNIT_STATS[u.type].mounted), command) * (kind === 'mountedCharge' ? 1.2 : 1) || topN(units, 1);
    case 'inspiredL':
    case 'inspiredC':
    case 'inspiredR':
    case 'leadershipAny': {
      const secn: SectionName | null = kind === 'inspiredL' ? 'left' : kind === 'inspiredC' ? 'center' : kind === 'inspiredR' ? 'right' : null;
      let best = topN(units.filter((u) => !secn || inSection(u.hex, side, secn)), 1);
      for (const l of leadersOf(s, side)) {
        if (secn && !inSection(l.hex, side, secn)) continue;
        const near = units.filter((u) => hexDist(u.hex, l.hex) <= 2);
        best = Math.max(best, topN(near, kind === 'leadershipAny' ? 4 : 5));
      }
      return best;
    }
    case 'clash': {
      let v = 0;
      for (const u of units) if (s.units.some((e) => e.side !== side && e.hex >= 0 && areAdjacent(e.hex, u.hex))) v += b(u) * 1.6 + 0.05;
      return v;
    }
    case 'darken': return units.filter((u) => hasRanged(u.type)).reduce((a, u) => a + b(u) * 1.5, 0);
    case 'lineCommand': return topN(units.filter((u) => UNIT_STATS[u.type].foot), 5) * 0.8;
    case 'doubleTime': return topN(units.filter((u) => UNIT_STATS[u.type].foot), 4) * 0.9;
    case 'moveFireMove': return topN(units.filter((u) => UNIT_STATS[u.type].cls === 'light'), command) * 0.8;
    case 'rally': return rallyCandidates(s, side).length * 0.12;
    case 'spartacus': return topN(units, 2);
    case 'counterAttack': return s.lastCard[side === 'top' ? 'bottom' : 'top'] ? 0.15 : 0;
    case 'firstStrike': return -1;
    default: return 0;
  }
}
