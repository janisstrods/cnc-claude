// Retreat / evade / leader-evade path enumeration (rules-reference §9, §10, §11). Pure functions.
import { rearHexes } from './hex';
import { attachedLeader, leaderAt, unitAt } from './query';
import { isImpassable, terrainAt } from './terrain';
import { OFF_BOARD, type GameState, type HexId, type Leader, type RetreatOption, type Unit } from './types';

export interface ElephantRetreatOption extends RetreatOption {
  /** Units / lone enemy leaders blocking the elephant, and how many blocks each loses. */
  blockers: { id: string; n: number }[];
}

function marshCount(s: GameState, path: HexId[]): number {
  let n = 0;
  for (const h of path) if (h >= 0 && terrainAt(s, h) === 'marsh') n++;
  return n;
}

/** Keep minimal-loss options, one per end hex (fewest marsh hexes on the way). */
function prune(s: GameState, opts: RetreatOption[]): RetreatOption[] {
  if (!opts.length) return opts;
  const minLoss = Math.min(...opts.map((o) => o.losses));
  const byEnd = new Map<string, RetreatOption>();
  for (const o of opts) {
    if (o.losses !== minLoss) continue;
    const key = `${o.end}|${o.offBoard ? 1 : 0}`;
    const prev = byEnd.get(key);
    if (!prev || marshCount(s, o.path) < marshCount(s, prev.path)) byEnd.set(key, o);
  }
  return [...byEnd.values()];
}

/** Retreat options for a (non-elephant) unit that must retreat `hexes` hexes toward its own side. */
export function retreatOptions(s: GameState, u: Unit, hexes: number): RetreatOption[] {
  const hasLeader = !!attachedLeader(s, u);
  const out: RetreatOption[] = [];
  const walk = (cur: HexId, path: HexId[], left: number) => {
    if (left === 0) {
      out.push({ path, end: cur, losses: 0, attachLeader: null });
      return;
    }
    let moved = false;
    for (const h of rearHexes(cur, u.side)) {
      if (isImpassable(s, h) || unitAt(s, h)) continue;
      const l = leaderAt(s, h);
      if (l) {
        if (l.side !== u.side || hasLeader) continue;
        moved = true;
        out.push({ path: [...path, h], end: h, losses: 0, attachLeader: l.id });
        continue;
      }
      moved = true;
      walk(h, [...path, h], left - 1);
    }
    if (!moved) out.push({ path, end: cur, losses: left, attachLeader: null });
  };
  walk(u.hex, [], hexes);
  return prune(s, out);
}

/** Elephant retreat: blocked by units or lone enemy leaders, those pieces lose blocks instead. */
export function elephantRetreatOptions(s: GameState, u: Unit, hexes: number): ElephantRetreatOption[] {
  const out: ElephantRetreatOption[] = [];
  const walk = (cur: HexId, path: HexId[], left: number) => {
    if (left === 0) {
      out.push({ path, end: cur, losses: 0, attachLeader: null, blockers: [] });
      return;
    }
    let moved = false;
    const blockers: string[] = [];
    let edgeBlocked = 0;
    const rears = rearHexes(cur, u.side);
    for (const h of rears) {
      if (isImpassable(s, h)) { edgeBlocked++; continue; }
      const v = unitAt(s, h);
      if (v) { blockers.push(v.id); continue; }
      const l = leaderAt(s, h);
      if (l) {
        if (l.side !== u.side) { blockers.push(l.id); continue; }
        moved = true;
        out.push({ path: [...path, h], end: h, losses: 0, attachLeader: l.id, blockers: [] });
        continue;
      }
      moved = true;
      walk(h, [...path, h], left - 1);
    }
    if (!moved) {
      if (blockers.length) out.push({ path, end: cur, losses: 0, attachLeader: null, blockers: blockers.map((id) => ({ id, n: left })) });
      else out.push({ path, end: cur, losses: left, attachLeader: null, blockers: [] });
    }
  };
  walk(u.hex, [], hexes);
  // prefer complete retreats; otherwise keep everything (owner chooses)
  const complete = out.filter((o) => o.losses === 0 && o.blockers.length === 0);
  if (complete.length) return prune(s, complete) as ElephantRetreatOption[];
  const minLoss = Math.min(...out.map((o) => o.losses));
  return out.filter((o) => o.losses === minLoss);
}

/** Evade options: 2 hexes toward own side (1 only if no 2-hex evade exists). Empty = cannot evade. */
export function evadeOptions(s: GameState, u: Unit): RetreatOption[] {
  const hasLeader = !!attachedLeader(s, u);
  const two: RetreatOption[] = [];
  const one: RetreatOption[] = [];
  const free = (h: HexId) => !isImpassable(s, h) && !unitAt(s, h);
  for (const h1 of rearHexes(u.hex, u.side)) {
    if (!free(h1)) continue;
    const l1 = leaderAt(s, h1);
    if (l1) {
      if (l1.side !== u.side || hasLeader) continue;
      two.push({ path: [h1], end: h1, losses: 0, attachLeader: l1.id }); // stopping at a lone leader is a legal evade
      continue;
    }
    let any = false;
    for (const h2 of rearHexes(h1, u.side)) {
      if (!free(h2)) continue;
      const l2 = leaderAt(s, h2);
      if (l2) {
        if (l2.side !== u.side || hasLeader) continue;
        two.push({ path: [h1, h2], end: h2, losses: 0, attachLeader: l2.id });
        any = true;
        continue;
      }
      two.push({ path: [h1, h2], end: h2, losses: 0, attachLeader: null });
      any = true;
    }
    if (!any) one.push({ path: [h1], end: h1, losses: 0, attachLeader: null });
  }
  return prune(s, two.length ? two : one);
}

/**
 * Leader evade options: 1-3 hexes toward his own side, through friendly pieces; may leave the board over his own
 * baseline. Passing through enemy units requires escape rolls (listed in `escapes`). Empty = eliminated.
 */
export function leaderEvadeOptions(s: GameState, l: Leader): RetreatOption[] {
  const out: RetreatOption[] = [];
  const walk = (cur: HexId, path: HexId[], escapes: string[], steps: number) => {
    if (steps === 3) return;
    if (atBaseline(cur, l)) {
      out.push({ path: [...path, OFF_BOARD], end: OFF_BOARD, losses: 0, attachLeader: null, offBoard: true, escapes });
    }
    for (const h of rearHexes(cur, l.side)) {
      if (isImpassable(s, h)) continue;
      const v = unitAt(s, h);
      const ldr = leaderAt(s, h);
      const np = [...path, h];
      if (v && v.side !== l.side) {
        // must escape through; can never end on an enemy unit
        walk(h, np, [...escapes, v.id], steps + 1);
        continue;
      }
      if (ldr && ldr.id !== l.id) {
        // lone enemy leader or another friendly leader: may pass, may not end here
        walk(h, np, escapes, steps + 1);
        continue;
      }
      out.push({ path: np, end: h, losses: 0, attachLeader: v ? v.id : null, escapes });
      walk(h, np, escapes, steps + 1);
    }
  };
  walk(l.hex, [], [], 0);
  // one option per end hex: fewest escapes, then shortest
  const best = new Map<string, RetreatOption>();
  for (const o of out) {
    const key = o.offBoard ? 'off' : String(o.end);
    const prev = best.get(key);
    const e = o.escapes?.length ?? 0;
    const pe = prev?.escapes?.length ?? 0;
    if (!prev || e < pe || (e === pe && o.path.length < prev.path.length)) best.set(key, o);
  }
  return [...best.values()];
}

function atBaseline(h: HexId, l: Leader): boolean {
  const r = Math.floor(h / 13);
  return l.side === 'top' ? r === 0 : r === 8;
}
