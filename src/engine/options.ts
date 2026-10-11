// The options of the turn being played, as pure queries of the state (no decision asked, nothing changed): springing
// the ambush (§18.5, §18.9), an ordered piece's moves in the current movement stage (§7), and an ordered unit's battles
// (close and ranged targets, Rolling Fire paths; city walls and steep slopes; rules-reference §8, §9, §18.5, §18.7),
// with the move and battle validators that `answerError` (decisions.ts) dispatches to. The phases, legal.ts, the AI and
// the UI read them too. The bottom of the flow's modules: it imports none of them.
import { CARD_DEFS } from './cards';
import { canFireUnengaged, closeCombatDice, rangedDice } from './combat';
import { canShoot, fireMoveLimit } from './elites';
import { areAdjacent, neighbours, rearHexes } from './hex';
import { ambushEntryHexes, leaderMoves, unitMoves, type MoveTarget } from './movement';
import { enemyUnitAdjacent, leaderAt, leaderById, leaderUnit, other, unitAt, unitById } from './query';
import { isHill, isImpassable, isWall, steepSlope, terrainAt } from './terrain';
import { UNIT_STATS } from './units';
import {
  OFF_BOARD, SECTIONS, type Answer, type CardKind, type GameState, type HexId, type SectionName, type Side, type Unit,
} from './types';

/**
 * The option a legal answer picked, as `answerError` found it while checking the answer: the move target of a `move`, the
 * battle target of an `attack`. The movement and battle phases act on it at once, on the same state, instead of working
 * the piece's options out again.
 */
export interface Found {
  move?: MoveTarget;
  target?: BattleTarget;
}

// ---------------------------------------------------------------------------
// ambush (§18.5, §18.9)
// ---------------------------------------------------------------------------

/**
 * Whether `side` may spring its ambush reserve with a card of `kind` (the effective kind: a Counter Attack counts as the
 * card it copies): the battle's `scenario.ambush` data names the trigger cards and the own turns that must be finished.
 */
export function ambushAvailable(s: GameState, side: Side, kind: CardKind | null): boolean {
  const a = s.scenario.ambush;
  return !!kind && !!a && a.trigger.includes(kind) && s.scenario.reserveSide === side &&
    !s.special.reserveReleased && s.special.turnsDone[side] >= a.afterOwnTurns && s.special.reserveUnits.length > 0;
}

/** The sections an ambush card lets the force enter from (Inspired: its own; the other trigger cards: any). */
export function ambushSections(kind: CardKind): SectionName[] {
  if (kind === 'inspiredL') return ['left'];
  if (kind === 'inspiredC') return ['center'];
  if (kind === 'inspiredR') return ['right'];
  return [...SECTIONS];
}

/**
 * The sections worth naming when springing the ambush with a card of `kind`: the card's (`ambushSections`), or the first of
 * them alone when the force has fixed entry hexes (308, §18.9), where the section changes nothing.
 */
export function ambushSectionChoices(s: GameState, kind: CardKind): SectionName[] {
  const secs = ambushSections(kind);
  return s.scenario.ambush?.entryHexes ? secs.slice(0, 1) : secs;
}

/**
 * The ambush answers worth offering `side` for a card of `kind` (the sections to name, `ambushSectionChoices`): none when
 * the ambush is not available, or when the force has fixed entry hexes (308) and every one is occupied, so no unit could
 * enter. Answers outside them may still be accepted (`ambushSectionAllowed`).
 */
export function ambushChoices(s: GameState, side: Side, kind: CardKind): SectionName[] {
  if (!ambushAvailable(s, side, kind)) return [];
  if (s.scenario.ambush?.entryHexes && !ambushEntryHexes(s, side).length) return [];
  return ambushSectionChoices(s, kind);
}

/**
 * Is `section` an accepted answer for springing the ambush with a card of `kind`? One of the card's sections
 * (`ambushSections`), or any section when the force has fixed entry hexes (308, §18.9: the section is still asked, but
 * it is irrelevant).
 */
export function ambushSectionAllowed(s: GameState, kind: CardKind, section: SectionName): boolean {
  if (s.scenario.ambush?.entryHexes) return SECTIONS.includes(section);
  return ambushSections(kind).includes(section);
}

// ---------------------------------------------------------------------------
// movement
// ---------------------------------------------------------------------------

/** Move targets for an ordered piece in the current movement stage (empty if it may not move). */
export function pieceMoves(s: GameState, id: string, stage: 1 | 2 = s.turn.phase === 'move2' ? 2 : 1): MoveTarget[] {
  const op = s.turn.ordered[id];
  if (!op || s.turn.mods.noMove) return [];
  if (stage === 1 && op.moveDone) return [];
  if (stage === 2 && (op.move2Done || !s.turn.mods.moveFireMove)) return [];
  if (op.isLeader) {
    const l = leaderById(s, id);
    if (!l) return [];
    if (op.fromReserve && l.hex === OFF_BOARD) {
      const entered = Object.values(s.turn.ordered).filter((o) => o.fromReserve && !o.isLeader && o.moveDone)
        .map((o) => unitById(s, o.id)?.hex ?? OFF_BOARD).filter((h) => h >= 0);
      return leaderMoves(s, id, { entryHexes: entered });
    }
    return leaderMoves(s, id);
  }
  const u = unitById(s, id);
  if (!u) return [];
  if (op.attachedThisTurn) return [];
  // a unit that moves onto or off a city wall moves 1 hex in all that turn (§18.7): no second Move-Fire-Move move after a
  // first move that began on a wall or climbed onto one
  if (stage === 2 && op.moved > 0 && (isWall(s, op.startHex) || isWall(s, u.hex))) return [];
  const noMove = !!s.scenario.ambush?.noMove;
  if (op.fromReserve && u.hex === OFF_BOARD) {
    const sec = s.turn.ambushSection;
    if (!sec) return [];
    return unitMoves(s, id, { entryHexes: ambushEntryHexes(s, u.side, sec), entryOnly: noMove });
  }
  // 308 (§18.9): a unit that entered from the reserve this turn moves no further
  if (op.fromReserve && noMove) return [];
  return unitMoves(s, id);
}

export function validateMove(s: GameState, a: Answer, stage: 1 | 2, found?: Found): string | null {
  if (a.kind === 'endMove') return null;
  if (a.kind !== 'move') return 'Move a unit or end movement.';
  if (!s.turn.ordered[a.piece]) return 'That piece is not ordered.';
  const move = pieceMoves(s, a.piece, stage).find((m) => m.hex === a.to);
  if (!move) return 'That piece cannot move there.';
  if (found) found.move = move;
  return null;
}

/** May ordered piece `id` move in this movement stage? */
export const canMove = (s: GameState, id: string, stage: 1 | 2): boolean => pieceMoves(s, id, stage).length > 0;

export function movablePieces(s: GameState, stage: 1 | 2): string[] {
  return Object.keys(s.turn.ordered).filter((id) => canMove(s, id, stage));
}

// ---------------------------------------------------------------------------
// battle
// ---------------------------------------------------------------------------

/** Rolling Fire (§18.5): hexes a path may run, and dice rolled against each unit in it. */
const ROLLING_FIRE_HEXES = 3;
export const ROLLING_FIRE_DICE = 2;

/**
 * Legal Rolling Fire paths of an ordered unit right now (empty when it may not use it; §18.5, rulings Exp2 Q6).
 * The unit: infantry of the battle's `scenario.rollingFire` side, on a hill, ordered by a card that is not a Tactic card (a
 * Counter Attack counts as the card it copies), not moved, its battle unused; adjacent enemies do not matter.
 * A path: from the unit's hex, each step goes to one of the two neighbours one row nearer the enemy baseline, never into
 * a hill, void or impassable hex. It ends after the first hex that is not open ground (that hex included), else after 3
 * hexes; it is shorter only where no forward hex can be entered. Units and leaders do not stop it. At least 1 hex; paths
 * in search order (neighbour order: SW before SE for the top side).
 */
export function rollingFirePaths(s: GameState, unitId: string): HexId[][] {
  const side = s.scenario.rollingFire;
  if (!side) return [];
  const u = unitById(s, unitId);
  const op = s.turn.ordered[unitId];
  if (!u || !op || op.isLeader || u.side !== side || u.hex < 0) return [];
  if (!UNIT_STATS[u.type].infantry || !isHill(s, u.hex)) return [];
  if (op.moved > 0 || op.battlesLeft <= 0 || !op.canBattle) return [];
  const kind = s.turn.effective;
  if (!kind || CARD_DEFS[kind].group === 'tactic') return [];
  return rollingFireRoutes(s, side, u.hex);
}

/**
 * The Rolling Fire paths (§18.5) from hex `from` for a unit of `side`, by terrain alone: the route rules of
 * `rollingFirePaths` without the checks on the unit, its orders and the card (a pure helper, e.g. for the AI's planning).
 */
export function rollingFireRoutes(s: GameState, side: Side, from: HexId): HexId[][] {
  const foe = other(side);
  const open = (h: HexId) => !isHill(s, h) && !isImpassable(s, h);
  const out: HexId[][] = [];
  const walk = (path: HexId[]) => {
    const last = path[path.length - 1];
    const next = path.length < ROLLING_FIRE_HEXES && terrainAt(s, last) === 'plain' ? rearHexes(last, foe).filter(open) : [];
    if (!next.length) out.push(path);
    for (const h of next) walk([...path, h]);
  };
  for (const h of rearHexes(from, foe).filter(open)) walk([h]);
  return out;
}

/** Is `path` one of `unitId`'s legal Rolling Fire paths right now (same hexes, same order)? */
export function isRollingFirePath(s: GameState, unitId: string, path: unknown): boolean {
  if (!Array.isArray(path)) return false;
  return rollingFirePaths(s, unitId).some((p) => p.length === path.length && p.every((h, i) => h === path[i]));
}

/**
 * City wall (§18.7, X3 Q3): does `defender`, standing on a wall hex, strike first against `attacker` as if it had played
 * First Strike, without a card? Always, unless the attacker stands on a wall hex itself. (Only units get here: a lone
 * leader on a wall has no first strike, §18.7 [Interp].)
 */
export function wallStrikesFirst(s: GameState, defender: Unit, attacker: Unit): boolean {
  return isWall(s, defender.hex) && !isWall(s, attacker.hex);
}

/**
 * May `u` close combat the piece on its neighbour `h` as far as the terrain goes (§18.7)? Not across a steep slope (308),
 * either way; and a mounted unit or war machine attacks a piece on a city wall only if it began the turn next to that wall
 * hex (`startHex`, by default its `ordered.startHex`; a lone leader on the wall too [Interp]). A battle back is no attack:
 * these never stop it. The AI passes the start hex of a planned move.
 */
export function mayAttackInto(s: GameState, u: Unit, h: HexId, startHex?: HexId): boolean {
  if (steepSlope(s, u.hex, h)) return false;
  if (!isWall(s, h) || UNIT_STATS[u.type].infantry) return true;
  const start = startHex ?? s.turn.ordered[u.id]?.startHex ?? OFF_BOARD;
  return start >= 0 && areAdjacent(start, h);
}

/**
 * Adjacent hexes holding an enemy unit or a lone enemy leader that `u` may close combat (not across a steep slope; a wall
 * only from where a mounted unit or war machine began the turn, `mayAttackInto`).
 */
export function closeTargets(s: GameState, u: Unit): HexId[] {
  const out: HexId[] = [];
  for (const h of neighbours(u.hex)) {
    if (!mayAttackInto(s, u, h)) continue;
    const v = unitAt(s, h);
    if (v) {
      if (v.side !== u.side) out.push(h);
      continue;
    }
    const l = leaderAt(s, h);
    if (l && l.side !== u.side) out.push(h);
  }
  return out;
}

export interface BattleTarget {
  hex: HexId;
  kind: 'close' | 'ranged';
}

/** Legal battle targets for an ordered unit right now. */
export function battleTargets(s: GameState, unitId: string): BattleTarget[] {
  const u = unitById(s, unitId);
  const op = s.turn.ordered[unitId];
  if (!u || !op || op.isLeader || op.battlesLeft <= 0 || !op.canBattle || u.hex < 0) return [];
  const m = s.turn.mods;
  const out: BattleTarget[] = [];
  if (!m.noClose) {
    for (const h of closeTargets(s, u)) {
      const t = unitAt(s, h) ?? leaderAt(s, h);
      if (t && closeCombatDice(s, u, t, { role: 'attack', fullAtStart: u.blocks === u.maxBlocks, ordered: true }) > 0) out.push({ hex: h, kind: 'close' });
    }
  }
  // a unit with an enemy unit next to it fires at nothing (canFireAt): asked once, not per target
  if (!m.noRanged && canShoot(u) && op.moved < fireMoveLimit(u) && !enemyUnitAdjacent(s, u.hex, u.side)) {
    const hexes = new Set<HexId>();
    for (const v of s.units) if (v.side !== u.side && v.hex >= 0) hexes.add(v.hex);
    for (const l of s.leaders) if (l.side !== u.side && l.hex >= 0 && !leaderUnit(s, l)) hexes.add(l.hex);
    for (const h of hexes) {
      if (out.some((x) => x.hex === h)) continue;
      if (canFireUnengaged(s, u, h) && rangedDice(s, u, h, op.moved, true) > 0) out.push({ hex: h, kind: 'ranged' });
    }
  }
  return out;
}

/** Can ordered unit `id` battle now: a target to attack, or a Rolling Fire path (§18.5)? */
export const canBattleNow = (s: GameState, id: string): boolean => battleTargets(s, id).length > 0 || rollingFirePaths(s, id).length > 0;

/** Ordered units that can battle now (`canBattleNow`). */
export function battleReady(s: GameState): string[] {
  return Object.keys(s.turn.ordered).filter((id) => canBattleNow(s, id));
}

/**
 * An ordered unit that must still close combat this battle phase, or null: warriors that charged (§7, `mustBattle`) with
 * their battle unused and a close-combat target. The battle phase may not end while there is one.
 */
export function pendingCharge(s: GameState): string | null {
  for (const op of Object.values(s.turn.ordered)) {
    if (op.mustBattle && op.battlesLeft > 0 && unitById(s, op.id) && battleTargets(s, op.id).some((t) => t.kind === 'close')) return op.id;
  }
  return null;
}

export function validateBattle(s: GameState, a: Answer, found?: Found): string | null {
  if (a.kind === 'endBattle') {
    return pendingCharge(s) ? 'Warriors that charged must close combat.' : null;
  }
  if (a.kind === 'rollingFire') {
    if (!rollingFirePaths(s, a.unit).length) return 'This unit cannot use Rolling Fire.';
    return isRollingFirePath(s, a.unit, a.path) ? null : 'Not a legal Rolling Fire path.';
  }
  if (a.kind !== 'attack') return 'Attack or end the battle phase.';
  const t = battleTargets(s, a.unit).find((x) => x.hex === a.target);
  if (!t) return 'Not a legal target.';
  const op = s.turn.ordered[a.unit];
  if (op.mustBattle && t.kind !== 'close') return 'Charging warriors must close combat.';
  if (found) found.target = t;
  return null;
}
