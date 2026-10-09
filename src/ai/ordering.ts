// Which pieces to order with a card: per-piece benefit estimates and candidate order sets for every order mode.
import { CARD_DEFS, modsFor } from '../engine/cards';
import { ambushAvailable, ambushSections } from '../engine/flow';
import { areAdjacent, inSection } from '../engine/hex';
import { unitMoves } from '../engine/movement';
import { orderMode, validateOrders } from '../engine/orders';
import { isLoneLeader, leaderUnit, leadersOf, unitsOf } from '../engine/query';
import { cloneState } from '../engine/setup';
import { UNIT_STATS } from '../engine/units';
import type { CardKind, GameState, Leader, SectionName, Side, Unit } from '../engine/types';
import { Occ, hexDist, isRangedLight, supportOcc } from './board';
import { attackNowValue } from './estimate';
import { battered, singleUnitRisk } from './evaluate';
import type { Weights } from './values';

export interface OrderCandidate {
  pieces: string[];
  ambush?: SectionName;
  benefit: number;
}

function nearestEnemy(s: GameState, h: number, side: Side): number {
  let best = 99;
  for (const u of s.units) if (u.side !== side && u.hex >= 0) best = Math.min(best, hexDist(h, u.hex));
  return best;
}

/** Cheap local score of unit u where it stands (no attack). */
function localScore(s: GameState, occ: Occ, u: Unit, W: Weights): number {
  let v = -W.riskSelf * singleUnitRisk(s, occ, u, W);
  const d = nearestEnemy(s, u.hex, u.side);
  if (!battered(u)) {
    const pref = isRangedLight(u) ? 2 : 1;
    v -= W.adv * Math.min(8, Math.max(0, d - pref)) * (UNIT_STATS[u.type].mounted ? W.mountedAdv : 1) * 1.5;
  }
  if (d <= 2) {
    const sc = supportOcc(occ, u);
    if (sc >= 2) v += W.support;
    else if (sc === 0) v -= W.isolated;
  }
  return v;
}

/**
 * How much each own piece gains from being ordered with this card (best reachable hex + attack, versus standing idle).
 */
export function pieceBenefits(s0: GameState, side: Side, kind: CardKind | null, W: Weights): Map<string, number> {
  const s = cloneState(s0);
  s.active = side;
  s.turn.mods = kind ? modsFor(kind) : modsFor('order2C');
  s.turn.ordered = {};
  const occ = new Occ(s);
  const out = new Map<string, number>();
  const m = s.turn.mods;
  for (const u of unitsOf(s, side)) {
    const base = localScore(s, occ, u, W);
    let best = base + W.attackNow * attackNowValue(s, occ, u, 0, true, false, W);
    if (!m.noMove) {
      const from = u.hex;
      const l = occ.leader[from] && occ.leader[from]!.side === side ? occ.leader[from] : null;
      for (const t of unitMoves(s, u.id)) {
        if (t.hex < 0) {
          best = Math.max(best, base + 0.6);
          continue;
        }
        occ.unit[from] = null;
        occ.unit[t.hex] = u;
        const lAt = occ.leader[t.hex];
        if (l) {
          occ.leader[from] = null;
          occ.leader[t.hex] = l;
          l.hex = t.hex;
        }
        u.hex = t.hex;
        const v = localScore(s, occ, u, W) + W.attackNow * attackNowValue(s, occ, u, t.dist, t.canBattle, t.mustBattle, W);
        u.hex = from;
        occ.unit[t.hex] = null;
        occ.unit[from] = u;
        if (l) {
          l.hex = from;
          occ.leader[t.hex] = lAt;
          occ.leader[from] = l;
        }
        if (v > best) best = v;
      }
    }
    out.set(u.id, best - base);
  }
  for (const l of leadersOf(s, side)) {
    if (!isLoneLeader(s, l)) {
      // a leader riding with a battered unit near the enemy should move to a healthier one
      const lu = leaderUnit(s, l)!;
      let b = 0;
      if (s.special.sacredLeaderId === l.id && lu.blocks < lu.maxBlocks && nearestEnemy(s, lu.hex, side) <= 3) {
        // the instant-loss leader leaves a damaged unit near the enemy for a full-strength one
        const refuge = unitsOf(s, side).some((u) => u !== lu && u.blocks === u.maxBlocks && hexDist(u.hex, l.hex) <= 3 && !occ.leader[u.hex]);
        if (refuge) b = 0.4;
      } else if (battered(lu) && nearestEnemy(s, lu.hex, side) <= 3) {
        const refuge = unitsOf(s, side).some((u) => u !== lu && !battered(u) && hexDist(u.hex, l.hex) <= 3 && !occ.leader[u.hex]);
        if (refuge) b = 0.15;
      }
      out.set(l.id, b);
      continue;
    }
    // a lone leader wants to join a healthy unit near the front
    let b = 0;
    for (const u of unitsOf(s, side)) {
      if (hexDist(u.hex, l.hex) > 3 || occ.leader[u.hex]) continue;
      const d = nearestEnemy(s, u.hex, side);
      const g = (d <= 2 ? 0.08 : 0.04) * (u.blocks / u.maxBlocks);
      if (g > b) b = g;
    }
    if (nearestEnemy(s, l.hex, side) <= 1) b += 0.15; // in danger: must move
    if (s.special.sacredLeaderId === l.id && unitsOf(s, side).some((u) => u.blocks >= 2 && hexDist(u.hex, l.hex) <= 3 && !occ.leader[u.hex])) {
      b = Math.max(b, 0.3); // a lone instant-loss leader always wants to rejoin a sound unit
    }
    out.set(l.id, b);
  }
  return out;
}

function dedupe(cands: OrderCandidate[]): OrderCandidate[] {
  const seen = new Set<string>();
  const out: OrderCandidate[] = [];
  for (const c of cands) {
    const key = c.ambush ? `ambush:${c.ambush}` : [...c.pieces].sort().join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/** Candidate order selections for a card (best first). `full`: also offer the card's whole allotment. */
export function orderCandidates(s: GameState, side: Side, kind: CardKind, W: Weights, max = 3, full = true): OrderCandidate[] {
  const mode = orderMode(s, side, kind);
  const ben = pieceBenefits(s, side, kind, W);
  const b = (id: string) => ben.get(id) ?? 0;
  const units = unitsOf(s, side);
  const leaders = leadersOf(s, side);
  const total = (ids: string[]) => ids.reduce((a, id) => a + Math.max(0, b(id)), 0);
  const valid = (ids: string[]) => !validateOrders(s, side, kind, ids);
  const fill = (order: string[], seed: string[] = []): string[] => {
    const sel = [...seed];
    for (const id of order) {
      if (sel.includes(id)) continue;
      if (b(id) <= 0.002 && sel.length > 0) continue;
      if (valid([...sel, id])) sel.push(id);
    }
    return sel;
  };
  const sortByBen = (ids: string[]) => [...ids].sort((x, y) => b(y) - b(x));
  const out: OrderCandidate[] = [];
  const push = (pieces: string[]) => {
    if (valid(pieces)) out.push({ pieces, benefit: total(pieces) });
  };
  // Benefits are judged unit by unit: units whose first step towards the enemy costs each of them more risk alone than
  // it gains score nothing and are left out (whole wings idle for the game). The full version of an order set adds
  // sound units, front first, while the order stays valid (rescanning, so a chain can grow through a new link); the
  // rollouts decide whether they move. Only the first candidate is used when max is 1.
  const near = (u: Unit) => nearestEnemy(s, u.hex, side);
  const pushFull = (sel0: string[], pool: Unit[]) => {
    if (!full || max <= 1) return;
    const sel = [...sel0];
    const rest = pool.filter((u) => !sel.includes(u.id) && !battered(u)).sort((x, y) => b(y.id) - b(x.id) || near(x) - near(y));
    for (let i = 0; i < rest.length; i++) {
      if (sel.includes(rest[i].id) || !valid([...sel, rest[i].id])) continue;
      sel.push(rest[i].id);
      i = -1;
    }
    if (sel.length > sel0.length) push(sel);
  };
  // lone leaders, plus attached leaders worth detaching when the card allows it
  const loneLeaders = leaders.filter((l) => isLoneLeader(s, l) || (CARD_DEFS[kind].detach && b(l.id) > 0.05));
  switch (mode.mode) {
    case 'section': {
      const secs = Object.keys(mode.counts) as SectionName[];
      const inAny = (h: number) => secs.some((x) => inSection(h, side, x));
      const elig = sortByBen([
        ...units.filter((u) => inAny(u.hex)).map((u) => u.id),
        ...loneLeaders.filter((l) => inAny(l.hex)).map((l) => l.id),
      ]);
      const a = fill(elig);
      push(a);
      pushFull(a, units.filter((u) => inAny(u.hex)));
      if (a.length) {
        // cluster around the most promising unit
        const top = units.find((u) => u.id === a[0]);
        if (top) {
          const clustered = [...elig].sort((x, y) => {
            const hx = units.find((u) => u.id === x)?.hex ?? leaders.find((l) => l.id === x)!.hex;
            const hy = units.find((u) => u.id === y)?.hex ?? leaders.find((l) => l.id === y)!.hex;
            return b(y) - 0.04 * hexDist(top.hex, hy) - (b(x) - 0.04 * hexDist(top.hex, hx));
          });
          push(fill(clustered));
        }
        push(fill(elig.filter((id) => id !== a[0])));
      }
      break;
    }
    case 'troop': {
      const elig = sortByBen([
        ...units.filter(mode.filter).map((u) => u.id),
        ...(mode.leaders ? loneLeaders.map((l) => l.id) : []),
      ]);
      const sel: string[] = [];
      for (const id of elig) {
        if (sel.length >= mode.max) break;
        if (b(id) > 0.002 || sel.length === 0) sel.push(id);
      }
      push(sel);
      pushFull(sel, units.filter(mode.filter));
      break;
    }
    case 'leadership': {
      const sec = mode.section;
      const per: OrderCandidate[] = [];
      for (const l of leaders) {
        if (sec && !inSection(l.hex, side, sec)) continue;
        per.push(...leadershipChains(s, side, kind, l, mode.chain, b, units));
      }
      per.sort((x, y) => y.benefit - x.benefit);
      per.slice(0, 2).forEach((c, i) => {
        push(c.pieces);
        if (i === 0) pushFull(c.pieces, units);
      });
      const singles = sortByBen(units.filter((u) => !sec || inSection(u.hex, side, sec)).map((u) => u.id));
      if (singles.length) push([singles[0]]);
      break;
    }
    case 'group': {
      const foot = units.filter((u) => UNIT_STATS[u.type].foot);
      const seeds = sortByBen(foot.map((u) => u.id));
      const used = new Set<string>();
      let groups = 0;
      for (const seed of seeds) {
        if (used.has(seed) || groups >= 2) continue;
        const sel = [seed];
        const cap = mode.max ?? 99;
        let grew = true;
        while (grew && sel.length < cap) {
          grew = false;
          const hexes = sel.map((id) => foot.find((u) => u.id === id)!.hex);
          const cand = foot
            .filter((u) => !sel.includes(u.id) && hexes.some((h) => areAdjacent(h, u.hex)))
            .sort((x, y) => b(y.id) - b(x.id));
          for (const u of cand) {
            if (b(u.id) <= 0.002 && mode.max !== null) break;
            if (b(u.id) <= -0.05) break;
            sel.push(u.id);
            grew = true;
            break;
          }
        }
        sel.forEach((id) => used.add(id));
        push(sel);
        if (groups++ === 0) pushFull(sel, foot);
      }
      break;
    }
    case 'one': {
      const elig = sortByBen(units.map((u) => u.id));
      for (const id of elig.slice(0, 3)) push([id]);
      break;
    }
    default:
      out.push({ pieces: [], benefit: 0 });
  }
  if (!out.length) out.push({ pieces: [], benefit: 0 });
  let res = dedupe(out).slice(0, max);
  if (ambushAvailable(s, side, kind)) {
    for (const sec of ambushSections(kind)) res.push({ pieces: [], ambush: sec, benefit: 0.5 });
    res = dedupe(res);
  }
  return res;
}

function leadershipChains(
  s: GameState, side: Side, kind: CardKind, l: Leader, chain: number, b: (id: string) => number, units: Unit[],
): OrderCandidate[] {
  const own = leaderUnit(s, l);
  const base = [l.id, ...(own ? [own.id] : [])];
  const valid = (ids: string[]) => !validateOrders(s, side, kind, ids);
  if (!valid(base)) return [];
  const sel = [...base];
  const hexes = new Set<number>([l.hex]);
  let added = 0;
  while (added < chain) {
    let best: Unit | null = null;
    let bv = -Infinity;
    for (const u of units) {
      if (sel.includes(u.id)) continue;
      if (![...hexes].some((h) => areAdjacent(h, u.hex))) continue;
      const v = b(u.id);
      if (v > bv) {
        bv = v;
        best = u;
      }
    }
    if (!best || bv <= 0.002) break;
    const trial = [...sel, best.id];
    if (!valid(trial)) break;
    sel.push(best.id);
    hexes.add(best.hex);
    added++;
  }
  const benefit = sel.reduce((a, id) => a + Math.max(0, b(id)), 0);
  return [{ pieces: sel, benefit }];
}
