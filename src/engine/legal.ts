// Legal-answer helpers: enumerate simple answers and produce random legal answers (used by tests and AI); the greedy dice
// assignment also suggests the Rally and I Am Spartacus dialog's first choice.
import { ambushAvailable, ambushSections, battleTargets, movablePieces, pieceMoves, rollingFirePaths } from './flow';
import {
  diceOrderPieces, eligiblePieces, orderMode, rallyCandidates, validateDiceOrders, validateOrders, validateRally, validateSpartacus,
} from './orders';
import { leaderById, unitsOf, leadersOf } from './query';
import type { Answer, Decision, GameState } from './types';

export type Rand = () => number;

function pick<T>(arr: T[], rnd: Rand): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function shuffled<T>(arr: T[], rnd: Rand): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Greedy assignment of dice to pieces (Rally, I Am Spartacus, dice orders): each die in turn takes the first of its
 * `choices` that leaves the assignment valid (`check` finds no error) with the dice after it unused, or none (null).
 * `choices` is called once per die, in order.
 */
export function greedyAssign(
  dice: number, choices: (i: number) => readonly string[], check: (ids: (string | null)[]) => string | null,
): (string | null)[] {
  const ids: (string | null)[] = [];
  for (let i = 0; i < dice; i++) {
    const unused: null[] = Array(dice - i - 1).fill(null);
    ids.push(choices(i).find((id) => !check([...ids, id, ...unused])) ?? null);
  }
  return ids;
}

/** Greedy random valid order selection for the current card. */
export function randomOrders(s: GameState, d: Extract<Decision, { kind: 'orders' }>, rnd: Rand): string[] {
  const elig = shuffled(eligiblePieces(s, d.side, d.card), rnd);
  const mode = orderMode(s, d.side, d.card);
  let sel: string[] = [];
  if (mode.mode === 'leadership') {
    const leaders = elig.filter((id) => id.startsWith('L'));
    if (leaders.length && rnd() < 0.8) {
      const l = leaderById(s, pick(leaders, rnd))!;
      sel = [l.id];
      const own = unitsOf(s, d.side).find((u) => u.hex === l.hex);
      if (own) sel.push(own.id);
      if (validateOrders(s, d.side, d.card, sel)) sel = [];
    }
  }
  for (const id of elig) {
    const trial = [...sel, id];
    if (!validateOrders(s, d.side, d.card, trial)) sel = trial;
  }
  if (validateOrders(s, d.side, d.card, sel)) return [];
  return sel;
}

/** A random legal answer for any decision. */
export function randomAnswer(s: GameState, d: Decision, rnd: Rand): Answer {
  switch (d.kind) {
    case 'playCard':
      return { kind: 'playCard', card: pick(s.players[d.side].hand, rnd) };
    case 'orders': {
      if (ambushAvailable(s, d.side, d.card) && rnd() < 0.5) return { kind: 'orders', pieces: [], ambushSection: pick(ambushSections(d.card), rnd) };
      return { kind: 'orders', pieces: randomOrders(s, d, rnd) };
    }
    case 'move': {
      if (rnd() < 0.1) return { kind: 'endMove' };
      const ids = movablePieces(s, d.stage);
      if (!ids.length) return { kind: 'endMove' };
      const id = pick(ids, rnd);
      const moves = pieceMoves(s, id, d.stage);
      if (!moves.length) return { kind: 'endMove' };
      return { kind: 'move', piece: id, to: pick(moves, rnd).hex };
    }
    case 'battle': {
      const ids = Object.keys(s.turn.ordered).filter((id) => battleTargets(s, id).length);
      // charging warriors first
      const must = ids.filter((id) => s.turn.ordered[id].mustBattle && battleTargets(s, id).some((t) => t.kind === 'close'));
      if (must.length) {
        const id = must[0];
        return { kind: 'attack', unit: id, target: battleTargets(s, id).find((t) => t.kind === 'close')!.hex };
      }
      // Rolling Fire (§18.5): no random draw at all where nobody may use it, so other battles play exactly as before
      const fire = Object.keys(s.turn.ordered).filter((id) => rollingFirePaths(s, id).length);
      if (fire.length && rnd() < 0.3) {
        const id = pick(fire, rnd);
        return { kind: 'rollingFire', unit: id, path: pick(rollingFirePaths(s, id), rnd) };
      }
      if (!ids.length || rnd() < 0.05) return { kind: 'endBattle' };
      const id = pick(ids, rnd);
      return { kind: 'attack', unit: id, target: pick(battleTargets(s, id), rnd).hex };
    }
    case 'defend': {
      const opts: ('stand' | 'evade' | 'firstStrike')[] = ['stand'];
      if (d.canEvade) opts.push('evade');
      if (d.canFirstStrike) opts.push('firstStrike');
      return { kind: 'defend', choice: pick(opts, rnd) };
    }
    case 'ignoreFlags':
      return { kind: 'ignoreFlags', count: Math.floor(rnd() * (d.max + 1)) };
    case 'retreat':
    case 'leaderEvade':
      return { kind: 'choose', index: Math.floor(rnd() * d.options.length) };
    case 'momentum':
      return { kind: 'yesno', yes: rnd() < 0.7 };
    case 'cavalryExtra':
      return { kind: 'hex', hex: rnd() < 0.3 ? null : pick(d.options, rnd) };
    case 'bonusCombat':
      return { kind: 'hex', hex: rnd() < 0.2 ? null : pick(d.targets, rnd) };
    case 'chooseCommand':
      return { kind: 'choose', index: Math.floor(rnd() * d.options.length) };
    case 'rally': {
      const cands = rallyCandidates(s, d.side, d.command).map((u) => u.id);
      const ids = greedyAssign(d.faces.length, () => shuffled(cands, rnd), (trial) => validateRally(s, d.side, d.faces, trial, d.command));
      return { kind: 'assign', ids };
    }
    case 'spartacus': {
      const pieces = [...unitsOf(s, d.side).map((u) => u.id), ...leadersOf(s, d.side).map((l) => l.id)];
      const ids = greedyAssign(d.faces.length, () => shuffled(pieces, rnd), (trial) => validateSpartacus(s, d.side, d.faces, trial, d.command));
      return { kind: 'assign', ids };
    }
    case 'placeLeader':
    case 'placeUnit':
      return { kind: 'hex', hex: pick(d.options, rnd) };
    case 'diceVictim':
      return { kind: 'choose', index: Math.floor(rnd() * d.options.length) };
    case 'diceOrders': {
      // dice orders (310): each face in turn, a random piece it may order that keeps the assignment legal (or none)
      const pieces = (i: number) => shuffled(diceOrderPieces(s, d.side, d.faces[i]), rnd);
      const ids = greedyAssign(d.faces.length, pieces, (trial) => validateDiceOrders(s, d.side, d.faces, trial));
      return { kind: 'assign', ids };
    }
  }
}
