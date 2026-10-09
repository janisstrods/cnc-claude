// Turn flow as a generator: yields Decisions, receives Answers (rules-reference §5-§13).
import { CARD_DEFS, cardKind, defaultMods, mirrorKind, modsFor } from './cards';
import {
  canFireAt, closeCombatDice, helmetsCount, ignorableFlags, rangedDice, retreatPerFlag, scoreClassOnly, scoreClose,
  swordIgnores, vsMountedIgnores, type StrikeRole,
} from './combat';
import { areAdjacent, neighbours, rowOf } from './hex';
import { ambushEntryHexes, leaderMoves, unitMoves, type MoveTarget } from './movement';
import {
  autoOrders, orderMode, rallyCandidates, validateOrders, validateRally, validateSpartacus,
} from './orders';
import {
  attachedLeader, isEmptyHex, isLeaderId, leaderAt, leaderById, leaderUnit, other, unitAt, unitById,
} from './query';
import { elephantRetreatOptions, evadeOptions, leaderEvadeOptions, retreatOptions, type ElephantRetreatOption } from './retreat';
import { rollDice, rollDie, shuffle } from './rng';
import { newTurn } from './setup';
import { isFord, isImpassable, stopsAll, stopsMounted, terrainAt } from './terrain';
import { canShoot } from './elites';
import { UNIT_STATS, bonusCombatEligible, canEvadeType, escapeDice, forestFighter } from './units';
import {
  OFF_BOARD,
  type Answer, type CardKind, type Decision, type DieFace, type FlowCtx, type GameState, type HexId, type Leader,
  type OrderedPiece, type RetreatOption, type RollPurpose, type SectionName, type Side, type Unit,
} from './types';

export type Gen<T = void> = Generator<Decision, T, Answer>;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function* ask(ctx: FlowCtx, d: Decision, validate: (a: Answer) => string | null): Gen<Answer> {
  for (;;) {
    const a = yield d;
    const err = a ? validate(a) : 'No answer.';
    if (!err) return a;
    ctx.invalid?.(err);
  }
}

const unitName = (u: Unit) => UNIT_STATS[u.type].name;
const sideName = (s: GameState, side: Side) => s.players[side].army;

function log(s: GameState, ctx: FlowCtx, text: string, side?: Side) {
  ctx.emit({ t: 'log', text, side });
}

function emitRoll(ctx: FlowCtx, purpose: RollPurpose, faces: DieFace[], scoring: boolean[], by: string | null, against: string | null) {
  ctx.emit({ t: 'roll', purpose, faces, scoring, by, against });
}

function romanSide(s: GameState): Side {
  return s.players.top.army === 'Roman' ? 'top' : 'bottom';
}

function drawCard(s: GameState, ctx: FlowCtx, side: Side) {
  if (s.deck.length === 0) {
    if (s.discard.length === 0) return;
    s.deck = s.discard;
    s.discard = [];
    shuffle(s, s.deck);
    ctx.emit({ t: 'reshuffle' });
  }
  s.players[side].hand.push(s.deck.pop()!);
  ctx.emit({ t: 'draw', side });
}

export function gainBanner(s: GameState, ctx: FlowCtx, side: Side, reason: string) {
  if (s.winner) return;
  const p = s.players[side];
  p.banners++;
  ctx.emit({ t: 'banner', side, total: p.banners, reason });
  if (p.banners >= s.bannersToWin) {
    s.winner = side;
    s.winReason = `${p.army} captured ${p.banners} banners`;
    ctx.emit({ t: 'victory', winner: side, reason: s.winReason });
    return;
  }
  // 2nd Beneventum: the Romans grow to 6 cards on their 3rd banner.
  if (s.special.rules.includes('beneventumHand') && side === romanSide(s) && p.banners === 3 && !s.special.beneventumBonusGiven) {
    s.special.beneventumBonusGiven = true;
    p.command = 6;
    ctx.emit({ t: 'command', side, command: 6 });
    log(s, ctx, `Gracchus rallies his volunteers: the ${p.army} player now holds 6 command cards.`, side);
    drawCard(s, ctx, side);
    drawCard(s, ctx, side);
  }
}

function killLeader(s: GameState, ctx: FlowCtx, l: Leader, reason: string) {
  s.leaders = s.leaders.filter((x) => x.id !== l.id);
  ctx.emit({ t: 'leaderKilled', id: l.id });
  log(s, ctx, `${l.name || 'A leader'} (${sideName(s, l.side)}) has fallen!`, l.side);
  if (s.special.sacredLeaderId === l.id && !s.winner) {
    s.winner = other(l.side);
    s.winReason = `${l.name} has fallen`;
    ctx.emit({ t: 'victory', winner: s.winner, reason: s.winReason });
    return;
  }
  gainBanner(s, ctx, other(l.side), reason);
}

/** Remove blocks; returns true if the unit was eliminated. */
function loseBlocks(s: GameState, ctx: FlowCtx, u: Unit, n: number, reason: string): boolean {
  const k = Math.min(n, u.blocks);
  if (k <= 0) return false;
  u.blocks -= k;
  ctx.emit({ t: 'damage', id: u.id, amount: k, left: u.blocks, reason });
  if (u.blocks <= 0) {
    s.units = s.units.filter((x) => x.id !== u.id);
    ctx.emit({ t: 'eliminated', id: u.id });
    log(s, ctx, `${sideName(s, u.side)} ${unitName(u)} eliminated.`, u.side);
    gainBanner(s, ctx, other(u.side), 'unit eliminated');
    return true;
  }
  return false;
}

/** Leader casualty check (2 dice need 2 helmets; 1 die needs 1). Returns true if the leader survives. */
function leaderCheck(s: GameState, ctx: FlowCtx, l: Leader, dice: 1 | 2): boolean {
  const faces = rollDice(s, dice);
  const helmets = faces.filter((f) => f === 'leader').length;
  emitRoll(ctx, 'leaderCheck', faces, faces.map((f) => f === 'leader'), null, l.id);
  if (helmets >= dice) {
    killLeader(s, ctx, l, 'leader killed');
    return false;
  }
  ctx.emit({ t: 'leaderSafe', id: l.id });
  return true;
}

function* leaderEvade(s: GameState, ctx: FlowCtx, l: Leader): Gen {
  const opts = leaderEvadeOptions(s, l);
  if (!opts.length) {
    log(s, ctx, `${l.name || 'The leader'} is trapped and cannot evade.`, l.side);
    killLeader(s, ctx, l, 'leader trapped');
    return;
  }
  let opt = opts[0];
  if (opts.length > 1) {
    const a = yield* ask(ctx, { kind: 'leaderEvade', side: l.side, leader: l.id, options: opts }, (a) =>
      a.kind === 'choose' && a.index >= 0 && a.index < opts.length ? null : 'Choose an evade destination.');
    opt = opts[(a as { index: number }).index];
  }
  const walked: HexId[] = [l.hex];
  for (const h of opt.path) {
    if (h === OFF_BOARD) break;
    walked.push(h);
    const enemy = unitAt(s, h);
    if (enemy && enemy.side !== l.side) {
      const faces = rollDice(s, escapeDice(enemy));
      emitRoll(ctx, 'escape', faces, faces.map((f) => f === 'leader'), enemy.id, l.id);
      if (faces.includes('leader')) {
        l.hex = h;
        ctx.emit({ t: 'leaderEvade', id: l.id, path: walked, offBoard: false });
        killLeader(s, ctx, l, 'leader caught escaping');
        return;
      }
    }
    if (terrainAt(s, h) === 'marsh') {
      const f = rollDie(s);
      emitRoll(ctx, 'marsh', [f], [f === 'leader'], null, l.id);
      if (f === 'leader') {
        l.hex = h;
        ctx.emit({ t: 'leaderEvade', id: l.id, path: walked, offBoard: false });
        killLeader(s, ctx, l, 'leader lost in the marsh');
        return;
      }
    }
  }
  if (opt.offBoard) {
    ctx.emit({ t: 'leaderEvade', id: l.id, path: [...walked, OFF_BOARD], offBoard: true });
    s.leaders = s.leaders.filter((x) => x.id !== l.id);
    log(s, ctx, `${l.name || 'A leader'} leaves the battlefield.`, l.side);
    return;
  }
  l.hex = opt.end;
  ctx.emit({ t: 'leaderEvade', id: l.id, path: walked, offBoard: false });
  const u = unitAt(s, l.hex);
  if (u && u.side === l.side) ctx.emit({ t: 'attach', leader: l.id, unit: u.id });
}

/**
 * After a leader's unit is eliminated: 1-die check, then the leader must evade.
 * Only one casualty check is made per combat sequence: if one was already rolled, the leader just evades.
 */
function* leaderOrphaned(s: GameState, ctx: FlowCtx, l: Leader, checked?: { done: boolean }): Gen {
  if (!leaderById(s, l.id)) return;
  if (checked?.done) {
    yield* leaderEvade(s, ctx, l);
    return;
  }
  if (checked) checked.done = true;
  if (leaderCheck(s, ctx, l, 1)) yield* leaderEvade(s, ctx, l);
}

/** Marsh check for a unit entering a marsh hex. Returns true if the unit was eliminated. */
function* marshCheckUnit(s: GameState, ctx: FlowCtx, u: Unit, leaderChecked: { done: boolean }): Gen<boolean> {
  const f = rollDie(s);
  const cls = UNIT_STATS[u.type].cls;
  emitRoll(ctx, 'marsh', [f], [f === cls], null, u.id);
  if (f !== cls) return false;
  const l = attachedLeader(s, u);
  if (loseBlocks(s, ctx, u, 1, 'sunk in the marsh')) {
    if (l) yield* leaderOrphaned(s, ctx, l, leaderChecked);
    return true;
  }
  if (l && !leaderChecked.done) {
    leaderChecked.done = true;
    leaderCheck(s, ctx, l, 2);
  }
  return false;
}

function captureCamp(s: GameState, ctx: FlowCtx, u: Unit) {
  if (!s.special.rules.includes('baeculaCamps')) return;
  if (u.side !== romanSide(s)) return;
  if (terrainAt(s, u.hex) !== 'camp' || s.special.campsCaptured.includes(u.hex)) return;
  s.special.campsCaptured.push(u.hex);
  log(s, ctx, `The Romans storm a Carthaginian camp!`, u.side);
  gainBanner(s, ctx, u.side, 'camp captured');
}

/** Move a unit (and attached leader) to hex h without checks. */
function relocate(s: GameState, u: Unit, h: HexId) {
  const l = attachedLeader(s, u);
  u.hex = h;
  if (l) l.hex = h;
}

// ---------------------------------------------------------------------------
// retreats
// ---------------------------------------------------------------------------

export interface HitOutcome {
  eliminated: boolean;
  vacated: boolean;
}

function* rampage(s: GameState, ctx: FlowCtx, el: Unit): Gen {
  ctx.emit({ t: 'rampage', id: el.id });
  log(s, ctx, `The ${sideName(s, el.side)} elephants rampage!`, el.side);
  for (const h of neighbours(el.hex)) {
    if (s.winner) return;
    const v = unitAt(s, h);
    if (v) {
      const faces = rollDice(s, 2);
      const cls = UNIT_STATS[v.type].cls;
      emitRoll(ctx, 'rampage', faces, faces.map((f) => f === cls), el.id, v.id);
      const hits = faces.filter((f) => f === cls).length;
      if (hits) {
        const l = attachedLeader(s, v);
        if (loseBlocks(s, ctx, v, hits, 'trampled by elephants')) {
          if (l) yield* leaderOrphaned(s, ctx, l);
        } else if (l) leaderCheck(s, ctx, l, 2);
      }
      continue;
    }
    const l = leaderAt(s, h);
    if (l) {
      const faces = rollDice(s, 2);
      emitRoll(ctx, 'rampage', faces, faces.map((f) => f === 'leader'), el.id, l.id);
      if (faces.includes('leader')) killLeader(s, ctx, l, 'leader trampled');
      else yield* leaderEvade(s, ctx, l);
    }
  }
}

function* chooseOption<T extends RetreatOption>(ctx: FlowCtx, side: Side, unit: string, opts: T[], reason: 'retreat' | 'evade'): Gen<T> {
  if (opts.length === 1) return opts[0];
  const a = yield* ask(ctx, { kind: 'retreat', side, unit, options: opts, reason }, (a) =>
    a.kind === 'choose' && a.index >= 0 && a.index < opts.length ? null : 'Choose a destination.');
  return opts[(a as { index: number }).index];
}

/** Walk a retreat/evade path with marsh checks; returns true if the unit was eliminated on the way. */
function* walkPath(s: GameState, ctx: FlowCtx, u: Unit, opt: RetreatOption, kind: 'retreat' | 'evade', leaderChecked: { done: boolean }): Gen<boolean> {
  const walked: HexId[] = [u.hex];
  for (const h of opt.path) {
    relocate(s, u, h);
    walked.push(h);
    if (terrainAt(s, h) === 'marsh') {
      if (yield* marshCheckUnit(s, ctx, u, leaderChecked)) {
        ctx.emit({ t: kind, id: u.id, path: walked });
        return true;
      }
    }
  }
  ctx.emit({ t: kind, id: u.id, path: walked });
  if (opt.attachLeader) {
    ctx.emit({ t: 'attach', leader: opt.attachLeader, unit: u.id });
  }
  return false;
}

/**
 * Units (and lone enemy leaders) blocking an elephant's retreat lose blocks simultaneously; if both sides reach
 * their final banner at once the battle is a draw.
 */
function* elephantBlockerLosses(s: GameState, ctx: FlowCtx, blockers: { id: string; n: number }[]): Gen {
  const gains: Side[] = [];
  const orphans: Leader[] = [];
  const survivorsWithLeader: Leader[] = [];
  for (const b of blockers) {
    if (isLeaderId(b.id)) {
      const l = leaderById(s, b.id);
      if (!l) continue;
      s.leaders = s.leaders.filter((x) => x.id !== l.id);
      ctx.emit({ t: 'leaderKilled', id: l.id });
      log(s, ctx, `${l.name || 'A leader'} (${sideName(s, l.side)}) is crushed by the elephants!`, l.side);
      if (s.special.sacredLeaderId === l.id && !s.winner) {
        s.winner = other(l.side);
        s.winReason = `${l.name} has fallen`;
        ctx.emit({ t: 'victory', winner: s.winner, reason: s.winReason });
        return;
      }
      gains.push(other(l.side));
      continue;
    }
    const v = unitById(s, b.id);
    if (!v) continue;
    const l = attachedLeader(s, v);
    const k = Math.min(b.n, v.blocks);
    v.blocks -= k;
    ctx.emit({ t: 'damage', id: v.id, amount: k, left: v.blocks, reason: 'crushed by retreating elephants' });
    if (v.blocks <= 0) {
      s.units = s.units.filter((x) => x.id !== v.id);
      ctx.emit({ t: 'eliminated', id: v.id });
      log(s, ctx, `${sideName(s, v.side)} ${unitName(v)} eliminated.`, v.side);
      gains.push(other(v.side));
      if (l) orphans.push(l);
    } else if (l) survivorsWithLeader.push(l);
  }
  // award banners together
  const before = { top: s.players.top.banners, bottom: s.players.bottom.banners };
  const add = { top: gains.filter((x) => x === 'top').length, bottom: gains.filter((x) => x === 'bottom').length };
  const winTop = before.top + add.top >= s.bannersToWin && add.top > 0;
  const winBottom = before.bottom + add.bottom >= s.bannersToWin && add.bottom > 0;
  if (winTop && winBottom) {
    s.players.top.banners += add.top;
    s.players.bottom.banners += add.bottom;
    ctx.emit({ t: 'banner', side: 'top', total: s.players.top.banners, reason: 'elephant retreat' });
    ctx.emit({ t: 'banner', side: 'bottom', total: s.players.bottom.banners, reason: 'elephant retreat' });
    s.winner = 'draw';
    s.winReason = 'Both armies broke at the same moment';
    ctx.emit({ t: 'victory', winner: 'draw', reason: s.winReason });
    return;
  }
  for (const g of gains) gainBanner(s, ctx, g, 'crushed by elephants');
  if (s.winner) return;
  for (const l of survivorsWithLeader) if (leaderById(s, l.id)) leaderCheck(s, ctx, l, 2);
  for (const l of orphans) yield* leaderOrphaned(s, ctx, l);
}

function* retreatUnit(s: GameState, ctx: FlowCtx, u: Unit, hexes: number, leaderChecked: { done: boolean }): Gen<HitOutcome> {
  const start = u.hex;
  if (UNIT_STATS[u.type].elephantTable) {
    yield* rampage(s, ctx, u);
    if (s.winner || !unitById(s, u.id)) return { eliminated: !unitById(s, u.id), vacated: true };
    const opts = elephantRetreatOptions(s, u, hexes);
    const opt = yield* chooseOption<ElephantRetreatOption>(ctx, u.side, u.id, opts, 'retreat');
    if (yield* walkPath(s, ctx, u, opt, 'retreat', leaderChecked)) return { eliminated: true, vacated: true };
    if (opt.blockers.length) yield* elephantBlockerLosses(s, ctx, opt.blockers);
    if (opt.losses > 0 && unitById(s, u.id)) {
      const l = attachedLeader(s, u);
      if (loseBlocks(s, ctx, u, opt.losses, 'could not retreat')) {
        if (l) yield* leaderOrphaned(s, ctx, l, leaderChecked);
        return { eliminated: true, vacated: true };
      }
    }
    return { eliminated: false, vacated: u.hex !== start };
  }
  const opts = retreatOptions(s, u, hexes);
  const opt = yield* chooseOption(ctx, u.side, u.id, opts, 'retreat');
  if (yield* walkPath(s, ctx, u, opt, 'retreat', leaderChecked)) return { eliminated: true, vacated: true };
  if (opt.losses > 0) {
    const l = attachedLeader(s, u);
    if (loseBlocks(s, ctx, u, opt.losses, 'retreat blocked')) {
      if (l) yield* leaderOrphaned(s, ctx, l, leaderChecked);
      return { eliminated: true, vacated: true };
    }
    if (l && !leaderChecked.done) {
      leaderChecked.done = true;
      leaderCheck(s, ctx, l, 2);
    }
  }
  return { eliminated: false, vacated: u.hex !== start };
}

/** Apply hits and flags to a unit (shared by ranged and close combat). */
function* applyHits(
  s: GameState, ctx: FlowCtx, target: Unit, hits: number, flags: number,
  info: { kind: 'close' | 'ranged'; striker: Unit | null; fullAtStart: boolean },
): Gen<HitOutcome> {
  const l = attachedLeader(s, target);
  let leaderAlive = !!l;
  const checked = { done: false };
  if (hits > 0) {
    if (loseBlocks(s, ctx, target, hits, info.kind === 'ranged' ? 'missile fire' : 'close combat')) {
      if (l) yield* leaderOrphaned(s, ctx, l);
      return { eliminated: true, vacated: true };
    }
    if (l) {
      checked.done = true;
      leaderAlive = leaderCheck(s, ctx, l, 2);
    }
    if (s.winner) return { eliminated: false, vacated: false };
  }
  if (flags <= 0) return { eliminated: false, vacated: false };
  const max = Math.min(flags, ignorableFlags(s, target, { kind: info.kind, striker: info.striker, leaderAlive, fullAtStart: info.fullAtStart }));
  let ignored = 0;
  if (max > 0) {
    const a = yield* ask(ctx, { kind: 'ignoreFlags', side: target.side, unit: target.id, flags, max }, (a) =>
      a.kind === 'ignoreFlags' && a.count >= 0 && a.count <= max ? null : `Ignore between 0 and ${max} flags.`);
    ignored = (a as { count: number }).count;
  }
  ctx.emit({ t: 'flags', id: target.id, flags, ignored });
  const n = flags - ignored;
  if (n <= 0) return { eliminated: false, vacated: false };
  return yield* retreatUnit(s, ctx, target, n * retreatPerFlag(target, info.striker), checked);
}

// ---------------------------------------------------------------------------
// combat
// ---------------------------------------------------------------------------

function purposeOf(role: StrikeRole): RollPurpose {
  return role === 'attack' ? 'close' : role === 'bonus' ? 'bonus' : role === 'back' ? 'battleBack' : 'firstStrike';
}

/** Roll close combat dice including elephant sword re-rolls. */
function rollClose(s: GameState, striker: Unit, target: Unit, n: number): DieFace[] {
  const faces = rollDice(s, n);
  if (!UNIT_STATS[striker.type].elephantTable) return faces;
  let ignore = swordIgnores(s, target);
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
  const faces = rollClose(s, striker, target, dice);
  const sc = scoreClose(s, striker, target, faces, helmetsCount(s, striker));
  emitRoll(ctx, purposeOf(role), sc.faces, sc.scoring, striker.id, target.id);
  return yield* applyHits(s, ctx, target, sc.hits, sc.flags, { kind: 'close', striker, fullAtStart: targetFull });
}

function* attackLoneLeader(s: GameState, ctx: FlowCtx, striker: Unit, l: Leader, kind: 'close' | 'ranged', dice: number): Gen {
  ctx.emit({ t: 'combat', purpose: kind === 'ranged' ? 'ranged' : 'close', attacker: striker.id, target: l.id, dice });
  if (dice <= 0) return;
  const faces = rollDice(s, dice);
  emitRoll(ctx, kind === 'ranged' ? 'ranged' : 'close', faces, faces.map((f) => f === 'leader'), striker.id, l.id);
  if (faces.includes('leader')) killLeader(s, ctx, l, 'leader killed');
  else yield* leaderEvade(s, ctx, l);
}

function* rangedAttack(s: GameState, ctx: FlowCtx, u: Unit, hex: HexId): Gen {
  const op = s.turn.ordered[u.id];
  const dice = rangedDice(s, u, hex, op?.moved ?? 0, !!op);
  const tu = unitAt(s, hex);
  if (!tu) {
    const l = leaderAt(s, hex);
    if (l) yield* attackLoneLeader(s, ctx, u, l, 'ranged', dice);
    return;
  }
  ctx.emit({ t: 'combat', purpose: 'ranged', attacker: u.id, target: tu.id, dice });
  if (dice <= 0) return;
  const faces = rollDice(s, dice);
  const sc = scoreClassOnly(tu, faces, true);
  emitRoll(ctx, 'ranged', faces, sc.scoring, u.id, tu.id);
  yield* applyHits(s, ctx, tu, sc.hits, sc.flags, { kind: 'ranged', striker: u, fullAtStart: tu.blocks === tu.maxBlocks });
}

function holdsFirstStrike(s: GameState, side: Side): number | null {
  for (const id of s.players[side].hand) if (cardKind(id) === 'firstStrike') return id;
  return null;
}

/** Full close combat sequence. Returns true when the defender's hex was vacated (successful combat). */
function* closeCombat(s: GameState, ctx: FlowCtx, attacker: Unit, targetHex: HexId, role: 'attack' | 'bonus'): Gen<boolean> {
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
  const canEvade = canEvadeType(tu.type, attacker.type) && evadeOptions(s, tu).length > 0;
  const fsCard = holdsFirstStrike(s, tu.side);
  type DefendChoice = 'stand' | 'evade' | 'firstStrike';
  let choice = 'stand' as DefendChoice;
  if (canEvade || fsCard !== null) {
    const a = yield* ask(ctx, { kind: 'defend', side: tu.side, attacker: attacker.id, target: tu.id, canEvade, canFirstStrike: fsCard !== null, bonus: role === 'bonus' }, (a) => {
      if (a.kind !== 'defend') return 'Choose how to defend.';
      if (a.choice === 'evade' && !canEvade) return 'This unit cannot evade.';
      if (a.choice === 'firstStrike' && fsCard === null) return 'You do not hold First Strike.';
      return null;
    });
    choice = (a as { choice: DefendChoice }).choice;
  }

  if (choice === 'evade') {
    const dice = closeCombatDice(s, attacker, tu, { role, fullAtStart: atkFull, ordered: true });
    ctx.emit({ t: 'combat', purpose: 'evade', attacker: attacker.id, target: tu.id, dice });
    log(s, ctx, `${sideName(s, tu.side)} ${unitName(tu)} evades.`, tu.side);
    const faces = rollDice(s, dice);
    const sc = scoreClassOnly(tu, faces, false, vsMountedIgnores(attacker, tu)); // camels vs horses [Interp] §15
    emitRoll(ctx, 'evade', faces, sc.scoring, attacker.id, tu.id);
    const l = attachedLeader(s, tu);
    const checked = { done: false };
    if (sc.hits > 0) {
      if (loseBlocks(s, ctx, tu, sc.hits, 'caught evading')) {
        if (l) yield* leaderOrphaned(s, ctx, l);
        return false;
      }
      if (l) { checked.done = true; leaderCheck(s, ctx, l, 2); }
      if (s.winner) return false;
    }
    const opts = evadeOptions(s, tu);
    if (opts.length) {
      const opt = yield* chooseOption(ctx, tu.side, tu.id, opts, 'evade');
      yield* walkPath(s, ctx, tu, opt, 'evade', checked);
    }
    return false;
  }

  let firstStruck = false;
  if (choice === 'firstStrike' && fsCard !== null) {
    const hand = s.players[tu.side].hand;
    hand.splice(hand.indexOf(fsCard), 1);
    s.discard.push(fsCard);
    s.turn.firstStrikeBy = tu.side;
    firstStruck = true;
    log(s, ctx, `${sideName(s, tu.side)} plays First Strike!`, tu.side);
    yield* strike(s, ctx, tu, attacker, 'firstStrike', defFull, atkFull);
    if (s.winner) return false;
    if (!unitById(s, attacker.id) || attacker.hex !== atkHex) return false;
  }

  const res = yield* strike(s, ctx, attacker, tu, role, atkFull, defFull);
  if (s.winner) return false;
  const defAlive = !!unitById(s, tu.id);
  if (!defAlive || tu.hex !== targetHex || res.vacated) {
    if (unitById(s, attacker.id)) yield* momentum(s, ctx, attacker, targetHex, role);
    return true;
  }
  if (!firstStruck && unitById(s, attacker.id) && attacker.hex === atkHex) {
    yield* strike(s, ctx, tu, attacker, 'back', defFull, atkFull);
  }
  return false;
}

function* momentum(s: GameState, ctx: FlowCtx, u: Unit, hex: HexId, role: 'attack' | 'bonus'): Gen {
  if (s.winner || !isEmptyHex(s, hex) || isImpassable(s, hex)) return;
  const op = s.turn.ordered[u.id];
  const fromT = terrainAt(s, u.hex);
  if ((fromT === 'marsh' || isFord(s, u.hex)) && op?.enteredHexThisTurn) return;
  const a = yield* ask(ctx, { kind: 'momentum', side: u.side, unit: u.id, hex, bonus: role === 'bonus' }, (a) => (a.kind === 'yesno' ? null : 'Advance or not?'));
  if (!(a as { yes: boolean }).yes) return;
  const from = u.hex;
  relocate(s, u, hex);
  if (op) op.enteredHexThisTurn = true;
  ctx.emit({ t: 'advance', id: u.id, path: [from, hex] });
  const checked = { done: false };
  if (terrainAt(s, hex) === 'marsh' && (yield* marshCheckUnit(s, ctx, u, checked))) return;
  if (s.winner || role === 'bonus') return;
  const st = UNIT_STATS[u.type];
  const stopped = stopsAll(s, hex) || (st.mounted && stopsMounted(s, hex));
  if (st.momentumExtraHex && !stopped && fromT !== 'marsh') {
    const hasLeader = !!attachedLeader(s, u);
    const opts = neighbours(u.hex).filter((h) => {
      if (isImpassable(s, h) || unitAt(s, h)) return false;
      const l = leaderAt(s, h);
      if (l) return l.side === u.side && !hasLeader;
      return true;
    });
    if (opts.length) {
      const b = yield* ask(ctx, { kind: 'cavalryExtra', side: u.side, unit: u.id, options: opts }, (b) =>
        b.kind === 'hex' && (b.hex === null || opts.includes(b.hex)) ? null : 'Choose a hex or decline.');
      const to = (b as { hex: HexId | null }).hex;
      if (to !== null) {
        const f2 = u.hex;
        const joining = leaderAt(s, to);
        relocate(s, u, to);
        if (joining && joining.side === u.side) joining.hex = to;
        ctx.emit({ t: 'advance', id: u.id, path: [f2, to] });
        if (joining && joining.side === u.side) ctx.emit({ t: 'attach', leader: joining.id, unit: u.id });
        if (terrainAt(s, to) === 'marsh' && (yield* marshCheckUnit(s, ctx, u, checked))) return;
        if (s.winner) return;
      }
    }
  }
  // bonus close combat
  const terr = terrainAt(s, u.hex);
  let eligible = bonusCombatEligible(st, !!attachedLeader(s, u));
  if (terr === 'forest' && !forestFighter(u.type)) eligible = false;
  if (terr === 'broken' && st.mounted) eligible = false;
  if (s.turn.mods.noClose) eligible = false;
  if (!eligible) return;
  const targets = closeTargets(s, u);
  if (!targets.length) return;
  const c = yield* ask(ctx, { kind: 'bonusCombat', side: u.side, unit: u.id, targets }, (c) =>
    c.kind === 'hex' && (c.hex === null || targets.includes(c.hex)) ? null : 'Choose a target or decline.');
  const t = (c as { hex: HexId | null }).hex;
  if (t === null) return;
  yield* closeCombat(s, ctx, u, t, 'bonus');
}

/** Adjacent hexes holding an enemy unit or a lone enemy leader. */
export function closeTargets(s: GameState, u: Unit): HexId[] {
  const out: HexId[] = [];
  for (const h of neighbours(u.hex)) {
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
  if (!m.noRanged && canShoot(u) && op.moved < UNIT_STATS[u.type].noFireAfterMove) {
    const hexes = new Set<HexId>();
    for (const v of s.units) if (v.side !== u.side && v.hex >= 0) hexes.add(v.hex);
    for (const l of s.leaders) if (l.side !== u.side && l.hex >= 0 && !leaderUnit(s, l)) hexes.add(l.hex);
    for (const h of hexes) {
      if (out.some((x) => x.hex === h)) continue;
      if (canFireAt(s, u, h) && rangedDice(s, u, h, op.moved, true) > 0) out.push({ hex: h, kind: 'ranged' });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// orders
// ---------------------------------------------------------------------------

function addOrdered(s: GameState, id: string, extra: Partial<OrderedPiece> = {}) {
  const isLeader = isLeaderId(id);
  const hex = isLeader ? leaderById(s, id)?.hex ?? OFF_BOARD : unitById(s, id)?.hex ?? OFF_BOARD;
  s.turn.ordered[id] = {
    id, isLeader, startHex: hex, moved: 0, moveDone: false, move2Done: false,
    battlesLeft: isLeader ? 0 : s.turn.mods.shots, canBattle: true, mustBattle: false,
    enteredHexThisTurn: false, attachedThisTurn: false, ...extra,
  };
}

const LEADERSHIP: CardKind[] = ['inspiredL', 'inspiredC', 'inspiredR', 'leadershipAny'];

export function ambushAvailable(s: GameState, side: Side, kind: CardKind | null): boolean {
  return !!kind && LEADERSHIP.includes(kind) && s.special.rules.includes('magoAmbush') && s.special.reserveSide === side &&
    !s.special.reserveReleased && s.special.turnsDone[side] >= 1 && s.special.reserveUnits.length > 0;
}

export function ambushSections(kind: CardKind): SectionName[] {
  if (kind === 'inspiredL') return ['left'];
  if (kind === 'inspiredC') return ['center'];
  if (kind === 'inspiredR') return ['right'];
  return ['left', 'center', 'right'];
}

function releaseAmbush(s: GameState, ctx: FlowCtx, side: Side, section: SectionName) {
  s.special.reserveReleased = true;
  s.turn.ambushSection = section;
  const ids: string[] = [];
  for (const u of s.special.reserveUnits) { s.units.push(u); ids.push(u.id); }
  for (const l of s.special.reserveLeaders) { s.leaders.push(l); ids.push(l.id); }
  s.special.reserveUnits = [];
  s.special.reserveLeaders = [];
  for (const id of ids) addOrdered(s, id, { fromReserve: true });
  log(s, ctx, `Ambush! Mago's hidden force strikes from the ${section}.`, side);
  ctx.emit({ t: 'ordered', side, ids });
}

function returnUnplacedReserves(s: GameState) {
  const backU = s.units.filter((u) => u.hex === OFF_BOARD);
  const backL = s.leaders.filter((l) => l.hex === OFF_BOARD);
  if (!backU.length && !backL.length) return;
  s.units = s.units.filter((u) => u.hex !== OFF_BOARD);
  s.leaders = s.leaders.filter((l) => l.hex !== OFF_BOARD);
  s.special.reserveUnits.push(...backU);
  s.special.reserveLeaders.push(...backL);
  if (backU.length) s.special.reserveReleased = false;
  for (const p of [...backU, ...backL]) delete s.turn.ordered[p.id];
}

function* rallyStep(s: GameState, ctx: FlowCtx, side: Side): Gen<string[]> {
  const faces = rollDice(s, s.players[side].command);
  const cands = rallyCandidates(s, side);
  emitRoll(ctx, 'rally', faces, faces.map((f) => f !== 'flag' && f !== 'swords'), null, null);
  if (!cands.length) {
    log(s, ctx, 'No damaged units are near a leader: nothing to rally.', side);
    return [];
  }
  const a = yield* ask(ctx, { kind: 'rally', side, faces }, (a) => (a.kind === 'assign' ? validateRally(s, side, faces, a.ids) : 'Assign the rally dice.'));
  const ids = (a as { ids: (string | null)[] }).ids;
  const rallied = new Map<string, number>();
  for (const id of ids) if (id) rallied.set(id, (rallied.get(id) ?? 0) + 1);
  for (const [id, n] of rallied) {
    const u = unitById(s, id)!;
    u.blocks = Math.min(u.maxBlocks, u.blocks + n);
    ctx.emit({ t: 'rallied', id, blocks: n });
  }
  return [...rallied.keys()];
}

function* spartacusStep(s: GameState, ctx: FlowCtx, side: Side): Gen<string[]> {
  s.turn.reshuffleAfter = true;
  const faces = rollDice(s, s.players[side].command);
  emitRoll(ctx, 'spartacus', faces, faces.map((f) => f !== 'flag' && f !== 'swords'), null, null);
  if (faces.every((f) => f === 'flag' || f === 'swords')) return [];
  const a = yield* ask(ctx, { kind: 'spartacus', side, faces }, (a) => (a.kind === 'assign' ? validateSpartacus(s, side, faces, a.ids) : 'Choose the pieces to order.'));
  return (a as { ids: (string | null)[] }).ids.filter((x): x is string => !!x);
}

function* ordersStep(s: GameState, ctx: FlowCtx, kind: CardKind | null, mirrored: boolean): Gen {
  const side = s.active;
  const t = s.turn;
  t.mods = kind ? modsFor(kind) : defaultMods();
  const mode = orderMode(s, side, kind);
  let ids: string[] = [];
  if (mode.mode === 'none' || !kind) return;
  if (mode.mode === 'auto') ids = autoOrders(s, side, kind);
  else if (mode.mode === 'dice') ids = kind === 'rally' ? yield* rallyStep(s, ctx, side) : yield* spartacusStep(s, ctx, side);
  else {
    const ambush = ambushAvailable(s, side, kind);
    const a = (yield* ask(ctx, { kind: 'orders', side, card: kind, mirrored }, (a) => {
      if (a.kind !== 'orders') return 'Choose the units to order.';
      if (a.ambushSection) return ambush && ambushSections(kind).includes(a.ambushSection) ? null : "Mago's ambush is not available.";
      return validateOrders(s, side, kind, a.pieces);
    })) as Extract<Answer, { kind: 'orders' }>;
    if (a.ambushSection) {
      releaseAmbush(s, ctx, side, a.ambushSection);
      return;
    }
    ids = a.pieces;
    if (mode.mode === 'one') t.mods = defaultMods();
  }
  // Without the helmet symbol, attached leaders cannot detach: they simply move with their unit.
  if (!CARD_DEFS[kind].detach) ids = ids.filter((id) => !(isLeaderId(id) && leaderUnit(s, leaderById(s, id)!)));
  for (const id of ids) addOrdered(s, id);
  ctx.emit({ t: 'ordered', side, ids });
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
  if (op.fromReserve && u.hex === OFF_BOARD) {
    const sec = s.turn.ambushSection;
    if (!sec) return [];
    return unitMoves(s, id, { entryHexes: ambushEntryHexes(s, u.side, sec) });
  }
  return unitMoves(s, id);
}

function* doMove(s: GameState, ctx: FlowCtx, id: string, to: HexId, stage: 1 | 2): Gen {
  const t = s.turn;
  const op = t.ordered[id];
  const target = pieceMoves(s, id, stage).find((m) => m.hex === to)!;
  if (op.isLeader) {
    const l = leaderById(s, id)!;
    const from = l.hex;
    l.hex = to;
    op.moveDone = true;
    if (stage === 2) op.move2Done = true;
    ctx.emit({ t: 'move', id, path: from === OFF_BOARD ? [to] : target.path });
    const u = unitAt(s, to);
    if (u && u.side === l.side) {
      ctx.emit({ t: 'attach', leader: l.id, unit: u.id });
      const uo = t.ordered[u.id];
      if (uo && !uo.moveDone) uo.attachedThisTurn = true;
    } else if (terrainAt(s, to) === 'marsh') {
      const f = rollDie(s);
      emitRoll(ctx, 'marsh', [f], [f === 'leader'], null, l.id);
      if (f === 'leader') killLeader(s, ctx, l, 'leader lost in the marsh');
    }
    return;
  }
  const u = unitById(s, id)!;
  const from = u.hex;
  const ldr = from >= 0 ? attachedLeader(s, u) : undefined;
  if (stage === 1) {
    op.moveDone = true;
    op.moved = target.dist;
  } else op.move2Done = true;
  op.enteredHexThisTurn = true;
  op.canBattle = target.canBattle;
  op.mustBattle = target.mustBattle;
  if (ldr && t.ordered[ldr.id]) t.ordered[ldr.id].moveDone = true;
  if (to === OFF_BOARD) {
    // Castulo: exit off the Carthaginian baseline for a banner.
    ctx.emit({ t: 'move', id, path: target.path });
    s.units = s.units.filter((x) => x.id !== u.id);
    if (ldr) s.leaders = s.leaders.filter((x) => x.id !== ldr.id);
    log(s, ctx, `${sideName(s, u.side)} ${unitName(u)} breaks through and exits the battlefield!`, u.side);
    gainBanner(s, ctx, u.side, 'unit exited');
    return;
  }
  relocate(s, u, to);
  ctx.emit({ t: 'move', id, path: from === OFF_BOARD ? [to] : target.path });
  if (from === OFF_BOARD) ctx.emit({ t: 'reserveEnter', id, hex: to });
  if (target.attachesTo) {
    const l = leaderById(s, target.attachesTo);
    if (l) {
      ctx.emit({ t: 'attach', leader: l.id, unit: u.id });
      const lo = t.ordered[l.id];
      if (lo) lo.moveDone = true;
    }
  }
  if (terrainAt(s, to) === 'marsh') {
    if (yield* marshCheckUnit(s, ctx, u, { done: false })) return;
  }
  captureCamp(s, ctx, u);
}

function validateMove(s: GameState, a: Answer, stage: 1 | 2): string | null {
  if (a.kind === 'endMove') return null;
  if (a.kind !== 'move') return 'Move a unit or end movement.';
  if (!s.turn.ordered[a.piece]) return 'That piece is not ordered.';
  const moves = pieceMoves(s, a.piece, stage);
  if (!moves.some((m) => m.hex === a.to)) return 'That piece cannot move there.';
  return null;
}

export function movablePieces(s: GameState, stage: 1 | 2): string[] {
  return Object.keys(s.turn.ordered).filter((id) => pieceMoves(s, id, stage).length > 0);
}

function* movePhase(s: GameState, ctx: FlowCtx, stage: 1 | 2): Gen {
  for (;;) {
    if (s.winner) return;
    if (!movablePieces(s, stage).length) break;
    const a = yield* ask(ctx, { kind: 'move', side: s.active, stage }, (a) => validateMove(s, a, stage));
    if (a.kind === 'endMove') break;
    if (a.kind === 'move') yield* doMove(s, ctx, a.piece, a.to, stage);
  }
  if (stage === 1) returnUnplacedReserves(s);
}

// ---------------------------------------------------------------------------
// battle
// ---------------------------------------------------------------------------

export function battleReady(s: GameState): string[] {
  return Object.keys(s.turn.ordered).filter((id) => battleTargets(s, id).length > 0);
}

function pendingMustBattle(s: GameState): string | null {
  for (const op of Object.values(s.turn.ordered)) {
    if (op.mustBattle && op.battlesLeft > 0) {
      const u = unitById(s, op.id);
      if (u && battleTargets(s, op.id).some((t) => t.kind === 'close')) return op.id;
    }
  }
  return null;
}

function validateBattle(s: GameState, a: Answer): string | null {
  if (a.kind === 'endBattle') {
    return pendingMustBattle(s) ? 'Warriors that charged must close combat.' : null;
  }
  if (a.kind !== 'attack') return 'Attack or end the battle phase.';
  const targets = battleTargets(s, a.unit);
  const t = targets.find((x) => x.hex === a.target);
  if (!t) return 'Not a legal target.';
  const op = s.turn.ordered[a.unit];
  if (op.mustBattle && t.kind !== 'close') return 'Charging warriors must close combat.';
  return null;
}

function* battlePhase(s: GameState, ctx: FlowCtx): Gen {
  for (;;) {
    if (s.winner) return;
    if (!battleReady(s).length) break;
    const a = yield* ask(ctx, { kind: 'battle', side: s.active }, (a) => validateBattle(s, a));
    if (a.kind === 'endBattle') break;
    if (a.kind !== 'attack') continue;
    const u = unitById(s, a.unit)!;
    const op = s.turn.ordered[a.unit];
    const kind = battleTargets(s, a.unit).find((x) => x.hex === a.target)!.kind;
    if (kind === 'ranged') {
      op.battlesLeft--;
      yield* rangedAttack(s, ctx, u, a.target);
    } else {
      op.battlesLeft = 0;
      op.mustBattle = false;
      yield* closeCombat(s, ctx, u, a.target, 'attack');
      // Baecula: a camp counts only where the attacking unit finally stops.
      if (!s.winner && unitById(s, u.id)) captureCamp(s, ctx, u);
    }
  }
}

// ---------------------------------------------------------------------------
// turn
// ---------------------------------------------------------------------------

function endOfTurn(s: GameState, ctx: FlowCtx) {
  const side = s.active;
  const t = s.turn;
  if (t.card !== null) s.discard.push(t.card);
  if (t.reshuffleAfter) {
    s.deck.push(...s.discard);
    s.discard = [];
    shuffle(s, s.deck);
    ctx.emit({ t: 'reshuffle' });
  }
  if (t.firstStrikeBy && t.firstStrikeBy !== side) drawCard(s, ctx, t.firstStrikeBy);
  let draws = 1;
  if (s.special.rules.includes('trasimenusHand') && side === romanSide(s) && s.special.turnsDone[side] < 2) {
    draws = 2;
    s.players[side].command += 1;
    ctx.emit({ t: 'command', side, command: s.players[side].command });
  }
  for (let i = 0; i < draws; i++) drawCard(s, ctx, side);
  s.lastCard[side] = t.effective === 'firstStrike' ? null : t.effective;
  s.special.turnsDone[side]++;
}

export function* turnFlow(s: GameState, ctx: FlowCtx): Gen {
  const side = s.active;
  const t = s.turn;
  ctx.emit({ t: 'turnStart', side, turn: t.number });
  t.phase = 'card';
  const pa = yield* ask(ctx, { kind: 'playCard', side }, (a) =>
    a.kind === 'playCard' && s.players[side].hand.includes(a.card) ? null : 'Play a card from your hand.');
  const cardId = (pa as { card: number }).card;
  const hand = s.players[side].hand;
  hand.splice(hand.indexOf(cardId), 1);
  t.card = cardId;
  const kind = cardKind(cardId);
  let effective: CardKind | null = kind;
  let mirrored = false;
  if (kind === 'counterAttack') {
    const last = s.lastCard[other(side)];
    if (!last) effective = null;
    else {
      effective = mirrorKind(last);
      mirrored = effective !== last;
    }
  }
  t.effective = effective;
  t.mirrored = mirrored;
  ctx.emit({ t: 'cardPlayed', side, card: cardId, kind, effective: effective ?? kind });
  t.phase = 'orders';
  yield* ordersStep(s, ctx, effective, mirrored);
  if (s.winner) return;
  if (!t.mods.noMove && Object.keys(t.ordered).length) {
    t.phase = 'move';
    yield* movePhase(s, ctx, 1);
    if (s.winner) return;
  }
  t.phase = 'battle';
  yield* battlePhase(s, ctx);
  if (s.winner) return;
  if (t.mods.moveFireMove && Object.keys(t.ordered).length) {
    t.phase = 'move2';
    yield* movePhase(s, ctx, 2);
    if (s.winner) return;
  }
  t.phase = 'draw';
  endOfTurn(s, ctx);
  t.phase = 'done';
}

/** Advance to the next player's turn (call after turnFlow completes without a winner). */
export function nextTurn(s: GameState) {
  s.active = other(s.active);
  s.turn = newTurn(s.active, s.turn.number + 1);
}

export function* gameFlow(s: GameState, ctx: FlowCtx): Gen {
  while (!s.winner) {
    if (s.turn.phase === 'done') nextTurn(s);
    yield* turnFlow(s, ctx);
  }
}

/** Is this unit at its baseline row (used by AI/UI hints)? */
export function atOwnBaseline(u: Unit): boolean {
  return rowOf(u.hex) === (u.side === 'top' ? 0 : 8);
}

export { areAdjacent };
