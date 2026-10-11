// Resolving battles (rules-reference §8-§10, §15, §18.5-§18.7): ranged fire, Rolling Fire, and the close-combat
// sequence (evade, First Strike or a city wall striking first, the strike, battle back, the momentum advance with its
// extra hex and bonus combat). Who may battle what is options.ts's; dice counts, hit scoring and flag ignores are
// combat.ts's; losses and retreats are casualties.ts's.
import { updateHeld } from './banners';
import { cardKind } from './cards';
import {
  applyHits, chooseOption, emitRoll, hurt, killLeader, leaderEvade, log, marshCheckUnit, relocate, removeUnit, sideName, unitName, walkPath,
  type HitOutcome,
} from './casualties';
import {
  closeCombatDice, helmetsCount, rangedDice, scoreClassOnly, scoreClose, swordIgnores, vsMountedIgnores, type StrikeRole,
} from './combat';
import { ask, type Gen } from './decisions';
import { neighbours } from './hex';
import { ROLLING_FIRE_DICE, closeTargets, wallStrikesFirst } from './options';
import { attachedLeader, isEmptyHex, isLeaderId, leaderAt, leaderById, leaderUnit, unitAt, unitById } from './query';
import { canEvade, evadeOptions } from './retreat';
import { rollDice, rollDie } from './rng';
import {
  breakRamparts, closedTo, hasEntryRoll, mayAdvanceOut, mayBattleAfterEntering, oneHexOut, steepClimb, stopsOnEntry, terrainAt,
} from './terrain';
import { UNIT_STATS, bonusCombatEligible, canEvadeType } from './units';
import type { DieFace, FlowCtx, GameState, HexId, Leader, RollPurpose, Side, Unit } from './types';

function purposeOf(role: StrikeRole): RollPurpose {
  return role === 'attack' ? 'close' : role === 'bonus' ? 'bonus' : role === 'back' ? 'battleBack' : 'firstStrike';
}

/** Roll close combat dice including elephant sword re-rolls (a sword the target ignores is not re-rolled). */
function rollClose(s: GameState, striker: Unit, target: Unit, n: number, role: StrikeRole): DieFace[] {
  const faces = rollDice(s, n);
  if (!UNIT_STATS[striker.type].elephantTable) return faces;
  let ignore = swordIgnores(s, target, striker, role);
  for (let i = 0; i < faces.length && faces.length < 40; i++) {
    if (faces[i] !== 'swords') continue;
    if (ignore > 0) { ignore--; continue; }
    faces.push(rollDie(s));
  }
  return faces;
}

/** One unit strikes another in close combat (attack, bonus, battle back or First Strike). */
function* strike(s: GameState, ctx: FlowCtx, striker: Unit, target: Unit, role: StrikeRole, strikerFull: boolean, targetFull: boolean): Gen<HitOutcome> {
  const dice = closeCombatDice(s, striker, target, { role, fullAtStart: strikerFull, ordered: !!s.turn.ordered[striker.id] });
  ctx.emit({ t: 'combat', purpose: purposeOf(role), attacker: striker.id, target: target.id, dice });
  if (dice <= 0) return { eliminated: false, vacated: false };
  const faces = rollClose(s, striker, target, dice, role);
  const sc = scoreClose(s, striker, target, faces, helmetsCount(s, striker), role);
  emitRoll(ctx, purposeOf(role), sc.faces, sc.scoring, striker.id, target.id);
  return yield* applyHits(s, ctx, target, sc.hits, sc.flags, { kind: 'close', striker, fullAtStart: targetFull, role });
}

function* attackLoneLeader(s: GameState, ctx: FlowCtx, striker: Unit, l: Leader, kind: 'close' | 'ranged', dice: number): Gen {
  ctx.emit({ t: 'combat', purpose: kind === 'ranged' ? 'ranged' : 'close', attacker: striker.id, target: l.id, dice });
  if (dice <= 0) return;
  const faces = rollDice(s, dice);
  emitRoll(ctx, kind === 'ranged' ? 'ranged' : 'close', faces, faces.map((f) => f === 'leader'), striker.id, l.id);
  if (faces.includes('leader')) killLeader(s, ctx, l, 'leader killed');
  else yield* leaderEvade(s, ctx, l);
}

/**
 * A ranged roll of `dice` dice by `by` against a unit (missile fire, and each target of Rolling Fire, §18.5): the `combat`
 * and `roll` events (`purpose`), only the target's class symbol and flags score, then `applyHits` (hits, the leader
 * casualty check, flags and the retreat; there is no battle back). `noFlagIgnore` and `reason` go to `applyHits`.
 */
function* rangedRoll(
  s: GameState, ctx: FlowCtx, by: Unit, target: Unit, dice: number,
  opts: { purpose: 'ranged' | 'rollingFire'; noFlagIgnore?: boolean; reason?: string },
): Gen<HitOutcome> {
  ctx.emit({ t: 'combat', purpose: opts.purpose, attacker: by.id, target: target.id, dice });
  if (dice <= 0) return { eliminated: false, vacated: false };
  const faces = rollDice(s, dice);
  const sc = scoreClassOnly(target, faces, true);
  emitRoll(ctx, opts.purpose, faces, sc.scoring, by.id, target.id);
  return yield* applyHits(s, ctx, target, sc.hits, sc.flags, {
    kind: 'ranged', striker: by, fullAtStart: target.blocks === target.maxBlocks, noFlagIgnore: opts.noFlagIgnore, reason: opts.reason,
  });
}

export function* rangedAttack(s: GameState, ctx: FlowCtx, u: Unit, hex: HexId): Gen {
  const op = s.turn.ordered[u.id];
  const dice = rangedDice(s, u, hex, op?.moved ?? 0, !!op);
  const tu = unitAt(s, hex);
  if (!tu) {
    const l = leaderAt(s, hex);
    if (l) yield* attackLoneLeader(s, ctx, u, l, 'ranged', dice);
    return;
  }
  yield* rangedRoll(s, ctx, u, tu, dice, { purpose: 'ranged' });
}

/**
 * Rolling Fire (§18.5, rulings Exp2 Q6): `u` uses its battle to roll burning logs down `path` (a legal path). The targets
 * are fixed now and resolved nearest first, each completely before the next: one that has left its hex is skipped, and a
 * piece that arrives in a later path hex is not a target. Every unit, friend or foe, is rolled 2 dice: only its class
 * symbol hits and no flag may be ignored; no battle back. A lone leader is not rolled: he evades at once toward his own
 * side. Then the rolling unit loses 1 block (casualty check for its leader; a banner for the enemy if it is eliminated).
 */
export function* rollingFire(s: GameState, ctx: FlowCtx, u: Unit, path: HexId[]): Gen {
  s.turn.ordered[u.id].battlesLeft = 0;
  log(ctx, `${sideName(s, u.side)} ${unitName(u)} rolls burning logs down the hill!`, u.side);
  const targets = path.map((hex) => ({ hex, id: (unitAt(s, hex) ?? leaderAt(s, hex))?.id }));
  for (const t of targets) {
    if (s.winner) return;
    if (!t.id) continue;
    if (isLeaderId(t.id)) {
      const l = leaderById(s, t.id);
      if (l && l.hex === t.hex && !leaderUnit(s, l)) yield* leaderEvade(s, ctx, l);
      continue;
    }
    const v = unitById(s, t.id);
    if (v && v.hex === t.hex) {
      yield* rangedRoll(s, ctx, u, v, ROLLING_FIRE_DICE, { purpose: 'rollingFire', noFlagIgnore: true, reason: 'burning logs' });
    }
  }
  if (s.winner || !unitById(s, u.id)) return;
  yield* hurt(s, ctx, u, 1, 'rolling fire');
}

function holdsFirstStrike(s: GameState, side: Side): number | null {
  for (const id of s.players[side].hand) if (cardKind(id) === 'firstStrike') return id;
  return null;
}

/**
 * Where an attacker's momentum advances ended during its close-combat sequence: `hex` is the last advance's end (the
 * extra hex included), null while it has not advanced. A 'stop' capture needs the unit still there at the end (§18.4).
 */
export interface AdvanceTrack {
  hex: HexId | null;
}

/**
 * Full close combat sequence. Returns true when the defender's hex was vacated (successful combat). `adv` records the
 * attacker's momentum advances (bonus combats included). A defender on a city wall that does not evade strikes first
 * without a card (`wallStrikesFirst`, §18.7): the First Strike card is then neither offered nor used.
 */
export function* closeCombat(s: GameState, ctx: FlowCtx, attacker: Unit, targetHex: HexId, role: 'attack' | 'bonus', adv: AdvanceTrack): Gen<boolean> {
  const tu = unitAt(s, targetHex);
  if (!tu) {
    const l = leaderAt(s, targetHex);
    if (l) {
      const dice = closeCombatDice(s, attacker, l, { role, fullAtStart: attacker.blocks === attacker.maxBlocks, ordered: true });
      yield* attackLoneLeader(s, ctx, attacker, l, 'close', dice);
    }
    return false;
  }
  const atkFull = attacker.blocks === attacker.maxBlocks;
  const defFull = tu.blocks === tu.maxBlocks;
  const atkHex = attacker.hex;
  const mayEvade = canEvadeType(tu.type, attacker.type) && canEvade(s, tu);
  const wallFirst = wallStrikesFirst(s, tu, attacker);
  const fsCard = wallFirst ? null : holdsFirstStrike(s, tu.side);
  type DefendChoice = 'stand' | 'evade' | 'firstStrike';
  let choice = 'stand' as DefendChoice;
  if (mayEvade || fsCard !== null) {
    const a = yield* ask(s, ctx, {
      kind: 'defend', side: tu.side, attacker: attacker.id, target: tu.id, canEvade: mayEvade, canFirstStrike: fsCard !== null,
      bonus: role === 'bonus',
    });
    choice = (a as { choice: DefendChoice }).choice;
  }

  if (choice === 'evade') {
    const dice = closeCombatDice(s, attacker, tu, { role, fullAtStart: atkFull, ordered: true });
    ctx.emit({ t: 'combat', purpose: 'evade', attacker: attacker.id, target: tu.id, dice });
    log(ctx, `${sideName(s, tu.side)} ${unitName(tu)} evades.`, tu.side);
    const faces = rollDice(s, dice);
    const sc = scoreClassOnly(tu, faces, false, vsMountedIgnores(attacker, tu)); // camels vs horses [Interp] §15
    emitRoll(ctx, 'evade', faces, sc.scoring, attacker.id, tu.id);
    const checked = { done: false };
    if (sc.hits > 0) {
      if (yield* hurt(s, ctx, tu, sc.hits, 'caught evading', checked)) return false;
      if (s.winner) return false;
    }
    const opts = evadeOptions(s, tu);
    if (opts.length) {
      const opt = yield* chooseOption(s, ctx, tu.side, tu.id, opts, 'evade');
      yield* walkPath(s, ctx, tu, opt, 'evade', checked);
    }
    // §15: a war machine that survived the roll is abandoned after its evade move (no banner, no leader casualty check);
    // an attached leader stays on that hex as a lone leader. The reason names war machines because the heavy war
    // machine is the only type with `evadeRemoves`; a new type with that flag needs its own reason here.
    if (UNIT_STATS[tu.type].evadeRemoves && unitById(s, tu.id)) removeUnit(s, ctx, tu, 'war machine abandoned');
    updateHeld(s, ctx); // where the evade ends (an abandoned war machine holds nothing there)
    return false;
  }

  let firstStruck = false;
  if (wallFirst || (choice === 'firstStrike' && fsCard !== null)) {
    if (wallFirst) log(ctx, `${sideName(s, tu.side)} ${unitName(tu)} strikes first from the wall!`, tu.side);
    else {
      const hand = s.players[tu.side].hand;
      hand.splice(hand.indexOf(fsCard!), 1);
      s.discard.push(fsCard!);
      s.turn.firstStrikeBy = tu.side;
      log(ctx, `${sideName(s, tu.side)} plays First Strike!`, tu.side);
    }
    firstStruck = true;
    yield* strike(s, ctx, tu, attacker, 'firstStrike', defFull, atkFull);
    if (s.winner) return false;
    if (!unitById(s, attacker.id) || attacker.hex !== atkHex) return false;
  }

  const res = yield* strike(s, ctx, attacker, tu, role, atkFull, defFull);
  if (s.winner) return false;
  const defAlive = !!unitById(s, tu.id);
  if (!defAlive || tu.hex !== targetHex || res.vacated) {
    if (unitById(s, attacker.id)) yield* momentum(s, ctx, attacker, targetHex, role, adv);
    return true;
  }
  if (!firstStruck && unitById(s, attacker.id) && attacker.hex === atkHex) {
    yield* strike(s, ctx, tu, attacker, 'back', defFull, atkFull);
  }
  return false;
}

function* momentum(s: GameState, ctx: FlowCtx, u: Unit, hex: HexId, role: 'attack' | 'bonus', adv: AdvanceTrack): Gen {
  if (s.winner || !isEmptyHex(s, hex)) return;
  // war machines and immobile units (306, §18.11) never advance (§15), and no unit advances where the terrain closes the step
  // (`closedTo`: a mounted unit onto a city wall, §18.7, while a foot unit's advance onto a wall is allowed and ends there;
  // up a steep slope, 308, unreachable since no close combat crosses one)
  if (UNIT_STATS[u.type].noMomentum || u.immobile || closedTo(s, u.type, u.hex, hex)) return;
  const op = s.turn.ordered[u.id];
  if (!mayAdvanceOut(s, u.hex, !!op?.enteredHexThisTurn)) return;
  const a = yield* ask(s, ctx, { kind: 'momentum', side: u.side, unit: u.id, hex, bonus: role === 'bonus' });
  if (!(a as { yes: boolean }).yes) return;
  const from = u.hex;
  relocate(s, u, hex);
  adv.hex = hex;
  if (op) op.enteredHexThisTurn = true;
  ctx.emit({ t: 'advance', id: u.id, path: [from, hex] });
  breakRamparts(s, ctx, u.side, [hex]);
  const checked = { done: false };
  if (hasEntryRoll(s, hex) && (yield* marshCheckUnit(s, ctx, u, checked))) return;
  updateHeld(s, ctx); // where the advance ends, after the marsh check (a unit sunk there holds nothing)
  // a very steep hill (§18.6) climbed from lower ground ends the advance: no extra hex and no bonus combat
  if (s.winner || role === 'bonus' || steepClimb(s, from, hex)) return;
  const st = UNIT_STATS[u.type];
  const stopped = stopsOnEntry(s, u.type, from, hex);
  let climbedExtra = false; // the extra hex climbed a very steep hill: it ends the advance, no bonus combat (§18.6)
  if (st.momentumExtraHex && !stopped && !oneHexOut(s, from)) {
    const hasLeader = !!attachedLeader(s, u);
    const opts = neighbours(u.hex).filter((h) => {
      if (closedTo(s, u.type, u.hex, h) || unitAt(s, h)) return false;
      const l = leaderAt(s, h);
      if (l) return l.side === u.side && !hasLeader;
      return true;
    });
    if (opts.length) {
      const b = yield* ask(s, ctx, { kind: 'cavalryExtra', side: u.side, unit: u.id, options: opts });
      const to = (b as { hex: HexId | null }).hex;
      if (to !== null) {
        const f2 = u.hex;
        climbedExtra = steepClimb(s, f2, to);
        const joining = leaderAt(s, to);
        relocate(s, u, to);
        adv.hex = to;
        if (joining && joining.side === u.side) joining.hex = to;
        ctx.emit({ t: 'advance', id: u.id, path: [f2, to] });
        if (joining && joining.side === u.side) ctx.emit({ t: 'attach', leader: joining.id, unit: u.id });
        breakRamparts(s, ctx, u.side, [to]);
        if (hasEntryRoll(s, to) && (yield* marshCheckUnit(s, ctx, u, checked))) return;
        updateHeld(s, ctx); // after the marsh check, as above
        if (s.winner) return;
      }
    }
  }
  // bonus close combat
  if (climbedExtra) return;
  const eligible = bonusCombatEligible(st, !!attachedLeader(s, u)) && mayBattleAfterEntering(u.type, terrainAt(s, u.hex));
  if (!eligible || s.turn.mods.noClose) return;
  const targets = closeTargets(s, u);
  if (!targets.length) return;
  const c = yield* ask(s, ctx, { kind: 'bonusCombat', side: u.side, unit: u.id, targets });
  const t = (c as { hex: HexId | null }).hex;
  if (t === null) return;
  yield* closeCombat(s, ctx, u, t, 'bonus', adv);
}
