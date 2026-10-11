// Movement: reachable hexes for ordered units and leaders (rules-reference §7).
import { canMarch } from './elites';
import { baselineRow, hexId, inSection, neighbours } from './hex';
import { exitHexes, leaderExitHexes } from './objectives';
import { attachedLeader, enemyPieceAdjacent, isEmptyHex, leaderAt, leaderById, leaderHas, other, unitAt, unitById } from './query';
import {
  isImpassable, isWall, mayBattleAfterEntering, oneHexOut, steepClimb, steepSlope, steepSlopeUp, steepSlopes, stopsAll, stopsMounted, terrainAt,
} from './terrain';
import { UNIT_STATS, forbidsTerrain, isLightFoot } from './units';
import { COLS, OFF_BOARD, type GameState, type HexId, type Leader, type OrderMods, type SectionName, type Side, type Unit } from './types';

export interface MoveTarget {
  hex: HexId; // destination (OFF_BOARD = exits the battlefield: exit objectives, 010 Castulo)
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

/**
 * Movement limits of a unit under the current card. `leader`: the leader attached to the unit at the start of its move
 * (none for a unit that only joins a leader during the move, or enters from reserve); Caesar's `forcedMarch` (§18.3) lets
 * an infantry unit move 2 hexes and still battle. A move that begins in a marsh or on a city wall (§18.7) goes 1 hex.
 */
export function unitMoveLimits(u: Unit, mods: OrderMods, startHex: HexId, s: GameState, leader?: Leader): MoveLimits {
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
  // March (§18.2): 2 hexes without battle. Forced march (§18.3): infantry with Caesar: 2 hexes and battle. Double Time
  // already gives 2 with battle, so the result stays 2; the Line Command and marsh limits below still apply.
  if (canMarch(u)) max = Math.max(max, 2);
  if (leader && st.infantry && leaderHas(leader, 'forcedMarch')) {
    max = Math.max(max, 2);
    battleMax = Math.max(battleMax, 2);
  }
  if (mods.maxMove !== null) {
    max = Math.min(max, mods.maxMove);
    battleMax = Math.min(battleMax, max);
  }
  if (startHex >= 0 && oneHexOut(s, startHex)) {
    max = Math.min(max, 1);
    battleMax = Math.min(battleMax, 1);
  }
  return { max, battleMax, chargeFrom };
}

export interface UnitMoveOptions {
  /** Entry hexes for a reserve unit (an ambush reserve, §18.5): placement counts as the first hex. */
  entryHexes?: HexId[];
  /**
   * With `entryHexes`: the unit is placed on an entry hex and moves no further (308 reinforcements, `ambush.noMove`,
   * §18.9). Placement is then not movement: each target has `dist` 0, so the unit fires as one that did not move.
   */
  entryOnly?: boolean;
  /** Hexes already moved this turn (Move-Fire-Move second move starts fresh: pass 0). */
  alreadyMoved?: number;
}

/**
 * All hexes an ordered unit may move to this turn, with the shortest path and whether it may battle afterwards.
 * Does not include the start hex. None for an immobile unit (§18.11).
 */
export function unitMoves(s: GameState, unitId: string, opts: UnitMoveOptions = {}): MoveTarget[] {
  const u = unitById(s, unitId);
  if (!u || u.immobile) return []; // an immobile unit (306, §18.11) never moves
  const mods = s.turn.mods;
  const fromReserve = !!opts.entryHexes;
  const startHex = u.hex;
  // the leader attached at the start of the move (a unit that joins one during its move gets nothing from him)
  const leader = fromReserve ? undefined : attachedLeader(s, u);
  const lim = unitMoveLimits(u, mods, fromReserve ? OFF_BOARD : startHex, s, leader);
  const st = UNIT_STATS[u.type];
  const hasLeader = !!leader;
  const passThrough = mods.passThrough && isLightFoot(u);
  const results = new Map<HexId, MoveTarget>();

  type Node = { hex: HexId; dist: number; path: HexId[]; stopped: boolean };
  const queue: Node[] = [];
  const best = new Map<HexId, number>();

  /** Is entering `h` from `from` (OFF_BOARD for a reserve) the end of the move? Stopping terrain, or a climb onto a very steep hill. */
  const stopsThere = (from: HexId, h: HexId) =>
    stopsAll(s, h) || (st.mounted && stopsMounted(s, h)) || steepClimb(s, from, h);

  const canEnter = (h: HexId, from: HexId): 'no' | 'pass' | 'stop' | 'yes' | 'attach' => {
    if (isImpassable(s, h) || forbidsTerrain(u.type, terrainAt(s, h))) return 'no';
    // a city wall (§18.7) is climbed only by a move that begins next to it (never by a reserve entering), and a steep slope
    // (308) never from the forest below
    if (isWall(s, h) && (fromReserve || from !== startHex)) return 'no';
    if (steepSlopeUp(s, from, h)) return 'no';
    const v = unitAt(s, h);
    if (v) {
      // passing through means not stopping: impossible through a friend standing where the unit would have to stop (stopping
      // terrain, or a very steep hill climbed from lower ground)
      if (passThrough && v.side === u.side && !stopsThere(from, h)) return 'pass';
      return 'no';
    }
    const l = leaderAt(s, h);
    if (l) {
      if (l.side !== u.side) return 'no';
      return hasLeader ? 'no' : 'attach';
    }
    if (stopsThere(from, h)) return 'stop';
    return 'yes';
  };

  const climbs = (h: HexId, path: HexId[]) => steepClimb(s, path[path.length - 2] ?? OFF_BOARD, h);
  const record = (h: HexId, dist: number, path: HexId[], attaches?: string) => {
    const prev = results.get(h);
    // the shortest path wins; of two equally short ones, one that does not climb a very steep hill (it may battle). Only
    // equal lengths are compared: a longer route that avoids the climb is never preferred to a shorter one (no foot unit
    // moves far enough, with a battle, for that to matter in 223).
    if (prev && (prev.dist < dist || (prev.dist === dist && !(climbs(h, prev.path) && !climbs(h, path))))) return;
    results.set(h, { hex: h, dist, path, canBattle: true, mustBattle: false, attachesTo: attaches });
  };

  if (fromReserve) {
    for (const e of opts.entryHexes!) {
      const k = canEnter(e, OFF_BOARD);
      if (k === 'no' || k === 'pass') continue;
      record(e, opts.entryOnly ? 0 : 1, [e], k === 'attach' ? leaderAt(s, e)!.id : undefined);
      if (k === 'yes' && !opts.entryOnly) {
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
      const k = canEnter(h, n.hex);
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

  // Exit objectives (010 Castulo, 210, 212, 221; `exitHexes` applies their unit filter): stepping off the board from a
  // listed edge hex is one more hex of movement, from the start hex or a hex reached without joining a leader (not from
  // terrain that stopped the unit there).
  const exits = fromReserve ? [] : exitHexes(s, u);
  if (exits.length) {
    let bestExit: MoveTarget | null = null;
    const candidates: { hex: HexId; dist: number; path: HexId[] }[] = [];
    if (exits.includes(startHex)) candidates.push({ hex: startHex, dist: opts.alreadyMoved ?? 0, path: [startHex] });
    for (const t of results.values()) if (exits.includes(t.hex) && !t.attachesTo) candidates.push(t);
    for (const t of candidates) {
      if (t.hex !== startHex && stopsThere(t.path[t.path.length - 2] ?? OFF_BOARD, t.hex)) continue;
      if (t.dist + 1 > lim.max) continue;
      // warriors move 2 or more hexes only to charge into close combat, which leaving the battlefield is not
      if (lim.chargeFrom !== null && t.dist + 1 >= lim.chargeFrom) continue;
      if (!bestExit || t.dist + 1 < bestExit.dist) {
        bestExit = { hex: OFF_BOARD, dist: t.dist + 1, path: [...t.path, OFF_BOARD], canBattle: false, mustBattle: false };
      }
    }
    if (bestExit) results.set(OFF_BOARD, bestExit);
  }

  // A warrior's long move must end next to an enemy piece it can close combat: not one across a steep slope (308, §18.7).
  const enemyToCharge = (h: HexId) => {
    if (!steepSlopes(s)) return enemyPieceAdjacent(s, h, u.side);
    return neighbours(h).some((x) => {
      if (steepSlope(s, h, x)) return false;
      const p = unitAt(s, x) ?? leaderAt(s, x);
      return !!p && p.side !== u.side;
    });
  };
  // Battle eligibility. A unit that climbed onto a very steep hill (§18.6) may not battle, so it cannot charge either.
  for (const t of results.values()) {
    if (t.hex === OFF_BOARD) continue;
    const climbed = climbs(t.hex, t.path);
    let can = t.dist <= lim.battleMax && !climbed;
    if (lim.chargeFrom !== null && t.dist >= lim.chargeFrom) {
      if (!climbed && enemyToCharge(t.hex)) t.mustBattle = true;
      else {
        // warriors may only make the long move when charging into close combat
        t.canBattle = false;
        t.mustBattle = false;
        (t as MoveTarget & { invalid?: boolean }).invalid = true;
        continue;
      }
    }
    if (!mayBattleAfterEntering(u.type, terrainAt(s, t.hex))) can = false;
    t.canBattle = can;
    if (!can) t.mustBattle = false;
  }
  return [...results.values()].filter((t) => !(t as MoveTarget & { invalid?: boolean }).invalid);
}

/**
 * Reachable hexes for an ordered leader moving alone (1-3 hexes, through friendly pieces; 1 from a marsh or a city wall).
 * He climbs onto a city wall only from a hex next to it, and stops there (§18.7); never up a steep slope (308). Exit
 * objectives that score leaders (317, §18.4) add `OFF_BOARD`: stepping off the board from a listed hex is one more hex of
 * the move, from the start hex or a hex he passed without being stopped there.
 */
export function leaderMoves(s: GameState, leaderId: string, opts: { entryHexes?: HexId[] } = {}): MoveTarget[] {
  const l = leaderById(s, leaderId);
  if (!l) return [];
  const results = new Map<HexId, MoveTarget>();
  if (opts.entryHexes) {
    // ambush reserve (§18.5): a leader may only be placed with one of the reserve units that entered this turn.
    for (const h of opts.entryHexes) {
      const v = unitAt(s, h);
      if (v && v.side === l.side && !leaderAt(s, h)) results.set(h, { hex: h, dist: 1, path: [h], canBattle: false, mustBattle: false, attachesTo: v.id });
    }
    return [...results.values()];
  }
  const start = l.hex;
  const max = oneHexOut(s, start) ? 1 : 3;
  type Node = { hex: HexId; dist: number; path: HexId[] };
  const queue: Node[] = [{ hex: start, dist: 0, path: [start] }];
  const best = new Map<HexId, number>([[start, 0]]);
  const passed: Node[] = [queue[0]]; // every hex he can be on without having stopped (the exit steps start from these)
  while (queue.length) {
    const n = queue.shift()!;
    if (n.dist >= max) continue;
    for (const h of neighbours(n.hex)) {
      if (isImpassable(s, h) || (isWall(s, h) && n.hex !== start) || steepSlopeUp(s, n.hex, h)) continue;
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
      const node = { hex: h, dist: d, path };
      queue.push(node);
      passed.push(node);
    }
  }
  results.delete(start);
  const exits = leaderExitHexes(s, l);
  if (exits.length) {
    const from = passed.filter((n) => exits.includes(n.hex) && n.dist + 1 <= max).sort((a, b) => a.dist - b.dist)[0];
    if (from) results.set(OFF_BOARD, { hex: OFF_BOARD, dist: from.dist + 1, path: [...from.path, OFF_BOARD], canBattle: false, mustBattle: false });
  }
  return [...results.values()];
}

/**
 * Entry hexes for an ambush reserve (§18.5) in a section: the empty passable enemy-baseline hexes of the section (from the
 * owner's view), or, when the ambush has fixed entry hexes (308, §18.9), the empty ones of those whatever the section.
 */
export function ambushEntryHexes(s: GameState, side: Side, section: SectionName): HexId[] {
  const fixed = s.special.ambush?.entryHexes;
  if (fixed) return fixed.filter((h) => !isImpassable(s, h) && isEmptyHex(s, h));
  const row = baselineRow(other(side));
  const out: HexId[] = [];
  for (let c = 0; c < COLS; c++) {
    const h = hexId(row, c);
    if (isImpassable(s, h) || !inSection(h, side, section) || !isEmptyHex(s, h)) continue;
    out.push(h);
  }
  return out;
}
