// Movement: reachable hexes for ordered units and leaders (rules-reference §7).
import { inSection, neighbours, onBaseline, rowOf } from './hex';
import { attachedLeader, enemyPieceAdjacent, leaderAt, leaderById, unitAt, unitById } from './query';
import { isImpassable, stopsAll, stopsMounted, terrainAt } from './terrain';
import { UNIT_STATS, forbidsTerrain, forestFighter, isLightFoot } from './units';
import { OFF_BOARD, type GameState, type HexId, type OrderMods, type SectionName, type Side, type Unit } from './types';

export interface MoveTarget {
  hex: HexId; // destination (OFF_BOARD = exits the battlefield, Castulo only)
  dist: number; // hexes moved
  path: HexId[]; // from start (inclusive) to destination (inclusive)
  canBattle: boolean;
  mustBattle: boolean;
  attachesTo?: string; // leader id joined (unit) or unit id joined (leader)
}

export interface MoveLimits {
  max: number; // max hexes
  battleMax: number; // max hexes and still battle
  chargeFrom: number | null; // warriors: moving this many hexes or more requires ending adjacent to an enemy (must battle)
}

/** Movement limits of a unit under the current card. */
export function unitMoveLimits(u: Unit, mods: OrderMods, startHex: HexId, s: GameState): MoveLimits {
  const st = UNIT_STATS[u.type];
  let max = st.move;
  let battleMax = st.moveBattle;
  const chargeFrom: number | null = st.chargeMove ? 2 : null;
  if (mods.doubleTime && st.doubleTimeMove !== null) {
    max = st.doubleTimeMove;
    battleMax = st.doubleTimeMove;
  }
  if (mods.mountedCharge && st.mountedChargeMove) {
    max = 3;
    battleMax = 3;
  }
  if (mods.maxMove !== null) {
    max = Math.min(max, mods.maxMove);
    battleMax = Math.min(battleMax, max);
  }
  if (startHex >= 0 && terrainAt(s, startHex) === 'marsh') {
    max = Math.min(max, 1);
    battleMax = Math.min(battleMax, 1);
  }
  return { max, battleMax, chargeFrom };
}

export interface UnitMoveOptions {
  /** Entry hexes for a reserve unit (Mago's ambush): placement counts as the first hex. */
  entryHexes?: HexId[];
  /** Hexes already moved this turn (Move-Fire-Move second move starts fresh: pass 0). */
  alreadyMoved?: number;
}

/**
 * All hexes an ordered unit may move to this turn, with the shortest path and whether it may battle afterwards.
 * Does not include the start hex.
 */
export function unitMoves(s: GameState, unitId: string, opts: UnitMoveOptions = {}): MoveTarget[] {
  const u = unitById(s, unitId);
  if (!u) return [];
  const mods = s.turn.mods;
  const fromReserve = !!opts.entryHexes;
  const startHex = u.hex;
  const lim = unitMoveLimits(u, mods, fromReserve ? OFF_BOARD : startHex, s);
  const st = UNIT_STATS[u.type];
  const hasLeader = !fromReserve && !!attachedLeader(s, u);
  const passThrough = mods.passThrough && isLightFoot(u);
  const results = new Map<HexId, MoveTarget>();

  type Node = { hex: HexId; dist: number; path: HexId[]; stopped: boolean };
  const queue: Node[] = [];
  const best = new Map<HexId, number>();

  const canEnter = (h: HexId): 'no' | 'pass' | 'stop' | 'yes' | 'attach' => {
    if (isImpassable(s, h) || forbidsTerrain(u.type, terrainAt(s, h))) return 'no';
    const v = unitAt(s, h);
    if (v) {
      // passing through means not stopping: impossible through a friend standing in stopping terrain
      if (passThrough && v.side === u.side && !stopsAll(s, h)) return 'pass';
      return 'no';
    }
    const l = leaderAt(s, h);
    if (l) {
      if (l.side !== u.side) return 'no';
      return hasLeader ? 'no' : 'attach';
    }
    if (stopsAll(s, h) || (st.mounted && stopsMounted(s, h))) return 'stop';
    return 'yes';
  };

  const record = (h: HexId, dist: number, path: HexId[], attaches?: string) => {
    const prev = results.get(h);
    if (prev && prev.dist <= dist) return;
    results.set(h, { hex: h, dist, path, canBattle: true, mustBattle: false, attachesTo: attaches });
  };

  if (fromReserve) {
    for (const e of opts.entryHexes!) {
      const k = canEnter(e);
      if (k === 'no' || k === 'pass') continue;
      record(e, 1, [e], k === 'attach' ? leaderAt(s, e)!.id : undefined);
      if (k === 'yes') {
        queue.push({ hex: e, dist: 1, path: [e], stopped: false });
        best.set(e, 1);
      }
    }
  } else {
    queue.push({ hex: startHex, dist: opts.alreadyMoved ?? 0, path: [startHex], stopped: false });
    best.set(startHex, 0);
  }

  while (queue.length) {
    const n = queue.shift()!;
    if (n.stopped || n.dist >= lim.max) continue;
    for (const h of neighbours(n.hex)) {
      const k = canEnter(h);
      if (k === 'no') continue;
      const d = n.dist + 1;
      const path = [...n.path, h];
      if (k === 'attach') {
        record(h, d, path, leaderAt(s, h)!.id);
        continue;
      }
      if (k !== 'pass') record(h, d, path);
      if (k === 'stop') continue;
      if ((best.get(h) ?? 99) <= d) continue;
      best.set(h, d);
      queue.push({ hex: h, dist: d, path, stopped: false });
    }
  }

  results.delete(startHex);

  // Castulo: Roman (bottom) units may exit off the Carthaginian (top) baseline from centre or Roman-right hexes.
  if (s.special.rules.includes('castulo') && u.side === 'bottom' && !fromReserve) {
    let bestExit: MoveTarget | null = null;
    const candidates: { hex: HexId; dist: number; path: HexId[] }[] = [];
    if (rowOf(startHex) === 0) candidates.push({ hex: startHex, dist: opts.alreadyMoved ?? 0, path: [startHex] });
    for (const t of results.values()) if (rowOf(t.hex) === 0 && !t.attachesTo) candidates.push(t);
    for (const t of candidates) {
      if (!onBaseline(t.hex, 'top')) continue;
      if (!(inSection(t.hex, 'bottom', 'center') || inSection(t.hex, 'bottom', 'right'))) continue;
      if (t.hex !== startHex && (stopsAll(s, t.hex) || (st.mounted && stopsMounted(s, t.hex)))) continue;
      if (t.dist + 1 > lim.max) continue;
      if (!bestExit || t.dist + 1 < bestExit.dist) {
        bestExit = { hex: OFF_BOARD, dist: t.dist + 1, path: [...t.path, OFF_BOARD], canBattle: false, mustBattle: false };
      }
    }
    if (bestExit) results.set(OFF_BOARD, bestExit);
  }

  // Battle eligibility.
  for (const t of results.values()) {
    if (t.hex === OFF_BOARD) continue;
    let can = t.dist <= lim.battleMax;
    if (lim.chargeFrom !== null && t.dist >= lim.chargeFrom) {
      if (enemyPieceAdjacent(s, t.hex, u.side)) t.mustBattle = true;
      else {
        // warriors may only make the long move when charging into close combat
        t.canBattle = false;
        t.mustBattle = false;
        (t as MoveTarget & { invalid?: boolean }).invalid = true;
        continue;
      }
    }
    const terr = terrainAt(s, t.hex);
    if (terr === 'forest' && !forestFighter(u.type)) can = false;
    if (terr === 'broken' && st.mounted) can = false;
    t.canBattle = can;
    if (!can) t.mustBattle = false;
  }
  return [...results.values()].filter((t) => !(t as MoveTarget & { invalid?: boolean }).invalid);
}

/** Reachable hexes for an ordered leader moving alone (1-3 hexes, through friendly pieces). */
export function leaderMoves(s: GameState, leaderId: string, opts: { entryHexes?: HexId[] } = {}): MoveTarget[] {
  const l = leaderById(s, leaderId);
  if (!l) return [];
  const results = new Map<HexId, MoveTarget>();
  if (opts.entryHexes) {
    // Mago: may only be placed with one of the reserve units that entered this turn.
    for (const h of opts.entryHexes) {
      const v = unitAt(s, h);
      if (v && v.side === l.side && !leaderAt(s, h)) results.set(h, { hex: h, dist: 1, path: [h], canBattle: false, mustBattle: false, attachesTo: v.id });
    }
    return [...results.values()];
  }
  const start = l.hex;
  const max = terrainAt(s, start) === 'marsh' ? 1 : 3;
  type Node = { hex: HexId; dist: number; path: HexId[] };
  const queue: Node[] = [{ hex: start, dist: 0, path: [start] }];
  const best = new Map<HexId, number>([[start, 0]]);
  while (queue.length) {
    const n = queue.shift()!;
    if (n.dist >= max) continue;
    for (const h of neighbours(n.hex)) {
      if (isImpassable(s, h)) continue;
      const v = unitAt(s, h);
      if (v && v.side !== l.side) continue;
      const other = leaderAt(s, h);
      if (other && other.side !== l.side) continue;
      const d = n.dist + 1;
      const path = [...n.path, h];
      const stop = stopsAll(s, h) || stopsMounted(s, h);
      if (!other && !results.has(h)) {
        results.set(h, { hex: h, dist: d, path, canBattle: false, mustBattle: false, attachesTo: v?.id });
      }
      // Stopping terrain ends the move; friendly units and leaders may be passed through.
      if (stop) continue;
      if ((best.get(h) ?? 99) <= d) continue;
      best.set(h, d);
      queue.push({ hex: h, dist: d, path });
    }
  }
  results.delete(start);
  return [...results.values()];
}

/** Baseline entry hexes for Mago's ambush in a section (enemy baseline, section from the owner's view). */
export function ambushEntryHexes(s: GameState, side: Side, section: SectionName): HexId[] {
  const row = side === 'top' ? 8 : 0;
  const out: HexId[] = [];
  for (let c = 0; c < 13; c++) {
    const h = row * 13 + c;
    if (s.terrain[h] === 'void') continue;
    if (!inSection(h, side, section)) continue;
    if (isImpassable(s, h)) continue;
    if (unitAt(s, h) || leaderAt(s, h)) continue;
    out.push(h);
  }
  return out;
}
