// Turn flow as a generator: yields Decisions, receives Answers (rules-reference §5-§13).
import { CARD_DEFS, cardKind, defaultMods, drawCard, effectiveCard, modsFor } from './cards';
import {
  canFireAt, closeCombatDice, helmetsCount, ignorableFlags, rangedDice, retreatPerFlag, scoreClassOnly, scoreClose,
  swordIgnores, vsMountedIgnores, type StrikeRole,
} from './combat';
import { ALL_HEXES, areAdjacent, neighbours, onBaseline, rearHexes } from './hex';
import { ambushEntryHexes, leaderMoves, unitMoves, type MoveTarget } from './movement';
import { bannerTotal, gainBanner, updateHeld } from './banners';
import { captureOnStop, exitLeader, exitUnit, turnEndObjectives, turnStartObjectives } from './objectives';
import {
  autoOrders, commandChoices, diceOrderPieces, diceOrdered, orderDice, orderMode, rallyCandidates, selectionMode, spartacusDiceCount,
  validateDiceOrders, validateOrders, validateRally, validateSpartacus,
} from './orders';
import {
  attachedLeader, isEmptyHex, isLeaderId, leaderAt, leaderById, leaderUnit, other, pieceHex, unitAt, unitById, unitsOf,
} from './query';
import { elephantRetreatOptions, evadeOptions, leaderEvadeOptions, retreatOptions, type ElephantRetreatOption } from './retreat';
import { randInt, rollDice, rollDie, shuffle } from './rng';
import { newTurn } from './setup';
import {
  breakRamparts, closedTo, hasEntryRoll, isHill, isImpassable, isWall, mayAdvanceOut, mayBattleAfterEntering, oneHexOut, steepClimb,
  steepSlope, stopsOnEntry, terrainAt,
} from './terrain';
import { canShoot, fireMoveLimit } from './elites';
import { possessive } from './text';
import { UNIT_STATS, bonusCombatEligible, canEvadeType, escapeDice } from './units';
import {
  OFF_BOARD, SECTIONS,
  type Answer, type CardKind, type Decision, type DieFace, type FlowCtx, type GameState, type HexId, type Leader,
  type OrderedPiece, type RetreatOption, type RollPurpose, type SectionName, type Side, type Unit,
} from './types';

export type Gen<T = void> = Generator<Decision, T, Answer>;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/**
 * Yield decision `d` until a legal answer comes back (`answerError`); each refusal is reported to `ctx.invalid`. `found`
 * receives the option the accepted answer picked (see `Found`).
 */
function* ask(s: GameState, ctx: FlowCtx, d: Decision, found?: Found): Gen<Answer> {
  for (;;) {
    const a = yield d;
    const err = answerError(s, d, a, found);
    if (!err) return a;
    ctx.invalid?.(err);
  }
}

/**
 * The option a legal answer picked, as `answerError` found it while checking the answer: the move target of a `move`, the
 * battle target of an `attack`. The movement and battle phases act on it at once, on the same state, instead of working
 * the piece's options out again.
 */
interface Found {
  move?: MoveTarget;
  target?: BattleTarget;
}

/** Is `a` a choice of one of `n` options (`choose` with a whole index in range)? */
const choosesOneOf = (a: Answer, n: number): boolean => a.kind === 'choose' && Number.isInteger(a.index) && a.index >= 0 && a.index < n;

/**
 * Why answer `a` to decision `d` is refused in state `s` (the message the UI shows), or null when it is legal: the one
 * validator of every decision. `ask` re-asks with it, and the AI's `isLegal` is `answerError(...) === null`, so an answer
 * the AI gives is never refused. It reads only the decision and the state, so an answer can be checked before it is given.
 * `found` (the flow's own `ask`) receives the move or battle target a legal answer picked.
 */
export function answerError(s: GameState, d: Decision, a: Answer | null | undefined, found?: Found): string | null {
  if (!a) return 'No answer.';
  switch (d.kind) {
    case 'playCard':
      return a.kind === 'playCard' && s.players[d.side].hand.includes(a.card) ? null : 'Play a card from your hand.';
    case 'orders':
      if (a.kind !== 'orders') return 'Choose the units to order.';
      if (a.ambushSection) {
        return ambushAvailable(s, d.side, d.card) && ambushSectionAllowed(s, d.card, a.ambushSection) ? null : 'The ambush is not available.';
      }
      return validateOrders(s, d.side, d.card, a.pieces);
    case 'move':
      return validateMove(s, a, d.stage, found);
    case 'battle':
      return validateBattle(s, a, found);
    case 'defend':
      if (a.kind !== 'defend') return 'Choose how to defend.';
      if (a.choice === 'evade') return d.canEvade ? null : 'This unit cannot evade.';
      if (a.choice === 'firstStrike') return d.canFirstStrike ? null : 'You do not hold First Strike.';
      return a.choice === 'stand' ? null : 'Choose how to defend.';
    case 'ignoreFlags':
      return a.kind === 'ignoreFlags' && Number.isInteger(a.count) && a.count >= 0 && a.count <= d.max ? null : `Ignore between 0 and ${d.max} flags.`;
    case 'retreat':
      return choosesOneOf(a, d.options.length) ? null : 'Choose a destination.';
    case 'leaderEvade':
      return choosesOneOf(a, d.options.length) ? null : 'Choose an evade destination.';
    case 'momentum':
      return a.kind === 'yesno' ? null : 'Advance or not?';
    case 'cavalryExtra':
      return a.kind === 'hex' && (a.hex === null || d.options.includes(a.hex)) ? null : 'Choose a hex or decline.';
    case 'bonusCombat':
      return a.kind === 'hex' && (a.hex === null || d.targets.includes(a.hex)) ? null : 'Choose a target or decline.';
    case 'chooseCommand':
      return choosesOneOf(a, d.options.length) ? null : 'Choose a command.';
    case 'rally':
      return a.kind === 'assign' ? validateRally(s, d.side, d.faces, a.ids, d.command) : 'Assign the rally dice.';
    case 'spartacus':
      return a.kind === 'assign' ? validateSpartacus(s, d.side, d.faces, a.ids, d.command) : 'Choose the pieces to order.';
    case 'placeLeader':
      if (a.kind === 'hex' && a.hex !== null && d.options.includes(a.hex)) return null;
      // before the battle (117 Asculum) any highlighted hex; a reserve leader at the end of the movement (308) joins a unit
      return s.special.unplaced.includes(d.leader) ? 'Place the leader on a highlighted hex.' : 'Place the leader with one of the units that entered.';
    case 'placeUnit':
      return a.kind === 'hex' && a.hex !== null && d.options.includes(a.hex) ? null : 'Place the unit on a highlighted hex.';
    case 'diceVictim':
      return choosesOneOf(a, d.options.length) ? null : 'Choose one of your units.';
    case 'diceOrders':
      return a.kind === 'assign' ? validateDiceOrders(s, d.side, d.faces, a.ids) : 'Assign the order dice.';
  }
}

const unitName = (u: Unit) => UNIT_STATS[u.type].name;
const sideName = (s: GameState, side: Side) => s.players[side].army;

function log(ctx: FlowCtx, text: string, side?: Side) {
  ctx.emit({ t: 'log', text, side });
}

function emitRoll(ctx: FlowCtx, purpose: RollPurpose, faces: DieFace[], scoring: boolean[], by: string | null, against: string | null) {
  ctx.emit({ t: 'roll', purpose, faces, scoring, by, against });
}

/**
 * Banners scored in one simultaneous step (the elephant's blocked retreat, §10), awarded together by `settleBanners`.
 * Leader losses in the step are recorded here so that their Hellespont rules follow the banners.
 */
interface BannerBatch {
  /** Side scoring each banner, in order. */
  gains: Side[];
  /** Side of each leader eliminated, in order. */
  leaderLosses: Side[];
}

/**
 * A leader is eliminated (killed for a banner). **Every leader elimination goes through here** (killLeader and the
 * elephant's blocked retreat), so the Hellespont count and rules are never skipped: he leaves the board, the loss is
 * counted, Castulo's Scipio ends the battle; then the opponent scores the banner and `afterLeaderLoss` applies the
 * Hellespont rules. With `batch` the banner and the Hellespont rules wait for `settleBanners` (banners first), and
 * `reason` is ignored: the batch's banners carry the reason passed to `settleBanners`. A leader who leaves the board by
 * evading off his baseline, exiting with his unit, or exiting alone where leaders score (317, §18.4) is not eliminated.
 * Returns true when his loss ended the battle (Castulo's Scipio).
 */
function leaderLost(s: GameState, ctx: FlowCtx, l: Leader, reason: string, text: string, batch?: BannerBatch): boolean {
  s.leaders = s.leaders.filter((x) => x.id !== l.id);
  s.special.leadersEliminated[l.side]++;
  ctx.emit({ t: 'leaderKilled', id: l.id });
  log(ctx, text, l.side);
  if (s.special.sacredLeaderId === l.id && !s.winner) {
    s.winner = other(l.side);
    s.winReason = `${l.name} has fallen`;
    ctx.emit({ t: 'victory', winner: s.winner, reason: s.winReason });
    return true;
  }
  if (batch) {
    batch.gains.push(other(l.side));
    batch.leaderLosses.push(l.side);
    return false;
  }
  gainBanner(s, ctx, other(l.side), reason);
  afterLeaderLoss(s, ctx, l.side);
  return false;
}

/**
 * Award a batch of banners together: if both sides reach their last banner at once the battle is a draw; otherwise the
 * banners one by one, then the Hellespont rules for each leader lost in the batch (banners resolve first, §17.4).
 */
function settleBanners(s: GameState, ctx: FlowCtx, b: BannerBatch, reason: string, drawReason: string) {
  if (s.winner) return; // the battle is already over: the draw below must never overwrite a win
  updateHeld(s, ctx); // held banners are brought up to date first; a win produced by that update ends the step here
  if (s.winner) return;
  const before = { top: bannerTotal(s, 'top'), bottom: bannerTotal(s, 'bottom') };
  const add = { top: b.gains.filter((x) => x === 'top').length, bottom: b.gains.filter((x) => x === 'bottom').length };
  const winTop = before.top + add.top >= s.bannersToWin && add.top > 0;
  const winBottom = before.bottom + add.bottom >= s.bannersToWin && add.bottom > 0;
  if (winTop && winBottom) {
    s.players.top.banners += add.top;
    s.players.bottom.banners += add.bottom;
    ctx.emit({ t: 'banner', side: 'top', total: bannerTotal(s, 'top'), reason: drawReason });
    ctx.emit({ t: 'banner', side: 'bottom', total: bannerTotal(s, 'bottom'), reason: drawReason });
    s.winner = 'draw';
    s.winReason = 'Both armies broke at the same moment';
    ctx.emit({ t: 'victory', winner: 'draw', reason: s.winReason });
    return;
  }
  for (const g of b.gains) gainBanner(s, ctx, g, reason);
  for (const side of b.leaderLosses) afterLeaderLoss(s, ctx, side);
}

/**
 * Hellespont rules (§17.4) after a leader of `side` was eliminated and its banner awarded (only via `leaderLost` and
 * `settleBanners`):
 * `allLeadersSuddenDeath` — every leader the side started with is gone: the other side wins at once;
 * `leaderLossCostsCard` — Command -1 for the rest of the battle and one card owed (`cardDebt`). On the side's own turn
 * the debt is paid by its next draw (the end of this turn; a second loss in the same turn skips the next one too). On
 * the opponent's turn a random card is discarded at once (event `cardLost`); with an empty hand the next draw is skipped
 * instead. Command never drops below 1 (a player must hold a card to play; unreachable in 112, where the second loss
 * ends the battle).
 */
function afterLeaderLoss(s: GameState, ctx: FlowCtx, side: Side) {
  if (s.winner) return;
  const sp = s.special;
  if (sp.rules.includes('allLeadersSuddenDeath') && sp.leadersEliminated[side] >= sp.leadersAtStart[side]) {
    s.winner = other(side);
    s.winReason = `All of ${possessive(s.players[side].commander)} leaders have fallen`;
    ctx.emit({ t: 'victory', winner: s.winner, reason: s.winReason });
    return;
  }
  if (!sp.rules.includes('leaderLossCostsCard')) return;
  const p = s.players[side];
  if (p.command <= 1) return;
  p.command--;
  ctx.emit({ t: 'command', side, command: p.command });
  sp.cardDebt[side]++;
  if (side === s.active || !p.hand.length) return;
  const card = p.hand.splice(randInt(s, p.hand.length), 1)[0];
  s.discard.push(card);
  sp.cardDebt[side]--;
  ctx.emit({ t: 'cardLost', side, card });
}

function killLeader(s: GameState, ctx: FlowCtx, l: Leader, reason: string) {
  leaderLost(s, ctx, l, reason, `${l.name || 'A leader'} (${sideName(s, l.side)}) has fallen!`);
}

/**
 * Remove up to `n` blocks; returns true if the unit was eliminated. The enemy then scores its banner, or with `batch` the
 * banner waits there for `settleBanners` (the elephant's blocked retreat, §10). The attached leader is the caller's
 * business (`hurt`).
 */
function loseBlocks(s: GameState, ctx: FlowCtx, u: Unit, n: number, reason: string, batch?: BannerBatch): boolean {
  const k = Math.min(n, u.blocks);
  if (k <= 0) return false;
  u.blocks -= k;
  ctx.emit({ t: 'damage', id: u.id, amount: k, left: u.blocks, reason });
  if (u.blocks <= 0) {
    s.units = s.units.filter((x) => x.id !== u.id);
    ctx.emit({ t: 'eliminated', id: u.id });
    log(ctx, `${sideName(s, u.side)} ${unitName(u)} eliminated.`, u.side);
    if (batch) batch.gains.push(other(u.side));
    else gainBanner(s, ctx, other(u.side), 'unit eliminated'); // held banners first: the unit no longer holds anything
    return true;
  }
  return false;
}

/** Take a unit off the board without eliminating it: no banner (a war machine abandoned after evading, §15). */
function removeUnit(s: GameState, ctx: FlowCtx, u: Unit, reason: string) {
  s.units = s.units.filter((x) => x.id !== u.id);
  ctx.emit({ t: 'removed', id: u.id, reason });
  updateHeld(s, ctx);
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
    log(ctx, `${l.name || 'The leader'} is trapped and cannot evade.`, l.side);
    killLeader(s, ctx, l, 'leader trapped');
    return;
  }
  let opt = opts[0];
  if (opts.length > 1) {
    const a = yield* ask(s, ctx, { kind: 'leaderEvade', side: l.side, leader: l.id, options: opts });
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
    if (hasEntryRoll(s, h)) {
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
    log(ctx, `${l.name || 'A leader'} leaves the battlefield.`, l.side);
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

/**
 * `u` loses `n` blocks (`n` ≥ 1; `loseBlocks`), then its attached leader's casualty check (§11): if the unit was eliminated,
 * 1 die and then he evades (`leaderOrphaned`); if it survived, 2 dice, unless the one check of the combat sequence was
 * already made (`checked`, §10) or `survivorCheck` is false (an elephant's losses for a retreat it could not take).
 * Returns true if the unit was eliminated.
 */
function* hurt(
  s: GameState, ctx: FlowCtx, u: Unit, n: number, reason: string, checked: { done: boolean } = { done: false }, survivorCheck = true,
): Gen<boolean> {
  const l = attachedLeader(s, u);
  if (loseBlocks(s, ctx, u, n, reason)) {
    if (l) yield* leaderOrphaned(s, ctx, l, checked);
    return true;
  }
  if (l && survivorCheck && !checked.done) {
    checked.done = true;
    leaderCheck(s, ctx, l, 2);
  }
  return false;
}

/** Marsh check for a unit entering a marsh hex. Returns true if the unit was eliminated. */
function* marshCheckUnit(s: GameState, ctx: FlowCtx, u: Unit, leaderChecked: { done: boolean }): Gen<boolean> {
  const f = rollDie(s);
  const cls = UNIT_STATS[u.type].cls;
  emitRoll(ctx, 'marsh', [f], [f === cls], null, u.id);
  if (f !== cls) return false;
  return yield* hurt(s, ctx, u, 1, 'sunk in the marsh', leaderChecked);
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
  log(ctx, `The ${sideName(s, el.side)} elephants rampage!`, el.side);
  for (const h of neighbours(el.hex)) {
    if (s.winner) return;
    const v = unitAt(s, h);
    if (v) {
      const faces = rollDice(s, 2);
      const cls = UNIT_STATS[v.type].cls;
      emitRoll(ctx, 'rampage', faces, faces.map((f) => f === cls), el.id, v.id);
      const hits = faces.filter((f) => f === cls).length;
      if (hits) yield* hurt(s, ctx, v, hits, 'trampled by elephants');
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

function* chooseOption<T extends RetreatOption>(
  s: GameState, ctx: FlowCtx, side: Side, unit: string, opts: T[], reason: 'retreat' | 'evade',
): Gen<T> {
  if (opts.length === 1) return opts[0];
  const a = yield* ask(s, ctx, { kind: 'retreat', side, unit, options: opts, reason });
  return opts[(a as { index: number }).index];
}

/** Walk a retreat/evade path with marsh checks; returns true if the unit was eliminated on the way. */
function* walkPath(s: GameState, ctx: FlowCtx, u: Unit, opt: RetreatOption, kind: 'retreat' | 'evade', leaderChecked: { done: boolean }): Gen<boolean> {
  const walked: HexId[] = [u.hex];
  for (const h of opt.path) {
    relocate(s, u, h);
    walked.push(h);
    if (hasEntryRoll(s, h)) {
      if (yield* marshCheckUnit(s, ctx, u, leaderChecked)) {
        ctx.emit({ t: kind, id: u.id, path: walked });
        breakRamparts(s, ctx, u.side, walked.slice(1)); // the hexes it entered before it sank
        return true;
      }
    }
  }
  ctx.emit({ t: kind, id: u.id, path: walked });
  breakRamparts(s, ctx, u.side, walked.slice(1)); // 223: ramparts the retreat or evade crossed, its end hex included
  if (opt.attachLeader) {
    ctx.emit({ t: 'attach', leader: opt.attachLeader, unit: u.id });
  }
  // the held banners are brought up to date by the caller, after the move's own losses (hexes passed through never count).
  // Known exceptions (no shipped battle has them: no marsh or elephant where banners are held): a leader killed by the marsh
  // check of an intermediate hex scores while the unit stands there, and an elephant's blocked retreat settles its banners
  // before the elephant's own losses (rules-reference §18.4).
  return false;
}

/**
 * Units (and lone enemy leaders) blocking an elephant's retreat lose blocks simultaneously; if both sides reach
 * their final banner at once the battle is a draw.
 */
function* elephantBlockerLosses(s: GameState, ctx: FlowCtx, blockers: { id: string; n: number }[]): Gen {
  const batch: BannerBatch = { gains: [], leaderLosses: [] };
  const orphans: Leader[] = [];
  const survivorsWithLeader: Leader[] = [];
  for (const b of blockers) {
    if (isLeaderId(b.id)) {
      const l = leaderById(s, b.id);
      if (!l) continue;
      if (leaderLost(s, ctx, l, 'crushed by elephants', `${l.name || 'A leader'} (${sideName(s, l.side)}) is crushed by the elephants!`, batch)) return;
      continue;
    }
    const v = unitById(s, b.id);
    if (!v) continue;
    const l = attachedLeader(s, v);
    if (loseBlocks(s, ctx, v, b.n, 'crushed by retreating elephants', batch)) {
      if (l) orphans.push(l);
    } else if (l) survivorsWithLeader.push(l);
  }
  // banners together, then the Hellespont rules for the crushed leaders
  settleBanners(s, ctx, batch, 'crushed by elephants', 'elephant retreat');
  if (s.winner) return;
  for (const l of survivorsWithLeader) if (leaderById(s, l.id)) leaderCheck(s, ctx, l, 2);
  for (const l of orphans) yield* leaderOrphaned(s, ctx, l);
}

/**
 * The unit has walked its retreat and could not take `opt.losses` hexes: the blocks it loses for them, one for each, or,
 * under last-row retreat (214, §18.5, X2 Q10), every block when it stands on its own baseline row of the battle's
 * `lastRowRetreat` side and joined no leader (a log line says so). An evade never gets here.
 */
function retreatShortfall(s: GameState, ctx: FlowCtx, u: Unit, opt: RetreatOption): number {
  if (s.special.lastRowRetreat !== u.side || opt.attachLeader || !atOwnBaseline(u)) return opt.losses;
  log(ctx, `${sideName(s, u.side)} ${unitName(u)} has no ground left to retreat and is cut down!`, u.side);
  return u.blocks;
}

function* retreatUnit(s: GameState, ctx: FlowCtx, u: Unit, hexes: number, leaderChecked: { done: boolean }): Gen<HitOutcome> {
  const start = u.hex;
  if (UNIT_STATS[u.type].elephantTable) {
    yield* rampage(s, ctx, u);
    if (s.winner || !unitById(s, u.id)) return { eliminated: !unitById(s, u.id), vacated: true };
    const opts = elephantRetreatOptions(s, u, hexes);
    const opt = yield* chooseOption<ElephantRetreatOption>(s, ctx, u.side, u.id, opts, 'retreat');
    if (yield* walkPath(s, ctx, u, opt, 'retreat', leaderChecked)) return { eliminated: true, vacated: true };
    if (opt.blockers.length) yield* elephantBlockerLosses(s, ctx, opt.blockers);
    if (opt.losses > 0 && unitById(s, u.id)) {
      // a surviving elephant's leader makes no casualty check for these losses (the ordinary retreat's leader does, below)
      const lost = retreatShortfall(s, ctx, u, opt);
      if (yield* hurt(s, ctx, u, lost, 'could not retreat', leaderChecked, false)) return { eliminated: true, vacated: true };
    }
    updateHeld(s, ctx); // where the retreat ends, after its losses
    return { eliminated: false, vacated: u.hex !== start };
  }
  const opts = retreatOptions(s, u, hexes);
  const opt = yield* chooseOption(s, ctx, u.side, u.id, opts, 'retreat');
  if (yield* walkPath(s, ctx, u, opt, 'retreat', leaderChecked)) return { eliminated: true, vacated: true };
  if (opt.losses > 0) {
    const lost = retreatShortfall(s, ctx, u, opt);
    if (yield* hurt(s, ctx, u, lost, 'retreat blocked', leaderChecked)) return { eliminated: true, vacated: true };
  }
  updateHeld(s, ctx); // where the retreat ends, after its losses (an eliminated unit's banner already brought them up to date)
  return { eliminated: false, vacated: u.hex !== start };
}

/**
 * Apply hits and flags to a unit (shared by ranged and close combat). `noFlagIgnore`: no flag may be ignored for any
 * reason (Rolling Fire, §18.5); `reason` names the block loss (default: missile fire or close combat).
 */
function* applyHits(
  s: GameState, ctx: FlowCtx, target: Unit, hits: number, flags: number,
  info: { kind: 'close' | 'ranged'; striker: Unit | null; fullAtStart: boolean; role?: StrikeRole; noFlagIgnore?: boolean; reason?: string },
): Gen<HitOutcome> {
  const l = attachedLeader(s, target);
  const checked = { done: false };
  if (hits > 0) {
    if (yield* hurt(s, ctx, target, hits, info.reason ?? (info.kind === 'ranged' ? 'missile fire' : 'close combat'), checked)) {
      return { eliminated: true, vacated: true };
    }
    if (s.winner) return { eliminated: false, vacated: false };
  }
  if (flags <= 0) return { eliminated: false, vacated: false };
  const leaderAlive = !!l && !!leaderById(s, l.id); // he counts for the flags only if he survived the casualty check (§10)
  const max = info.noFlagIgnore
    ? 0
    : Math.min(flags, ignorableFlags(s, target, { kind: info.kind, striker: info.striker, leaderAlive, fullAtStart: info.fullAtStart, role: info.role }));
  let ignored = 0;
  if (max > 0) {
    const a = yield* ask(s, ctx, { kind: 'ignoreFlags', side: target.side, unit: target.id, flags, max });
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

function* rangedAttack(s: GameState, ctx: FlowCtx, u: Unit, hex: HexId): Gen {
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

/** Rolling Fire (§18.5): hexes a path may run, and dice rolled against each unit in it. */
const ROLLING_FIRE_HEXES = 3;
const ROLLING_FIRE_DICE = 2;

/**
 * Legal Rolling Fire paths of an ordered unit right now (empty when it may not use it; §18.5, rulings Exp2 Q6).
 * The unit: infantry of the battle's `special.rollingFire` side, on a hill, ordered by a card that is not a Tactic card (a
 * Counter Attack counts as the card it copies), not moved, its battle unused; adjacent enemies do not matter.
 * A path: from the unit's hex, each step goes to one of the two neighbours one row nearer the enemy baseline, never into
 * a hill, void or impassable hex. It ends after the first hex that is not open ground (that hex included), else after 3
 * hexes; it is shorter only where no forward hex can be entered. Units and leaders do not stop it. At least 1 hex; paths
 * in search order (neighbour order: SW before SE for the top side).
 */
export function rollingFirePaths(s: GameState, unitId: string): HexId[][] {
  const side = s.special.rollingFire;
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
 * Rolling Fire (§18.5, rulings Exp2 Q6): `u` uses its battle to roll burning logs down `path` (a legal path). The targets
 * are fixed now and resolved nearest first, each completely before the next: one that has left its hex is skipped, and a
 * piece that arrives in a later path hex is not a target. Every unit, friend or foe, is rolled 2 dice: only its class
 * symbol hits and no flag may be ignored; no battle back. A lone leader is not rolled: he evades at once toward his own
 * side. Then the rolling unit loses 1 block (casualty check for its leader; a banner for the enemy if it is eliminated).
 */
function* rollingFire(s: GameState, ctx: FlowCtx, u: Unit, path: HexId[]): Gen {
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
 * City wall (§18.7, X3 Q3): does `defender`, standing on a wall hex, strike first against `attacker` as if it had played
 * First Strike, without a card? Always, unless the attacker stands on a wall hex itself. (Only units get here: a lone
 * leader on a wall has no first strike, §18.7 [Interp].)
 */
export function wallStrikesFirst(s: GameState, defender: Unit, attacker: Unit): boolean {
  return isWall(s, defender.hex) && !isWall(s, attacker.hex);
}

/**
 * Where an attacker's momentum advances ended during its close-combat sequence: `hex` is the last advance's end (the
 * extra hex included), null while it has not advanced. A 'stop' capture needs the unit still there at the end (§18.4).
 */
interface AdvanceTrack {
  hex: HexId | null;
}

/**
 * Full close combat sequence. Returns true when the defender's hex was vacated (successful combat). `adv` records the
 * attacker's momentum advances (bonus combats included). A defender on a city wall that does not evade strikes first
 * without a card (`wallStrikesFirst`, §18.7): the First Strike card is then neither offered nor used.
 */
function* closeCombat(s: GameState, ctx: FlowCtx, attacker: Unit, targetHex: HexId, role: 'attack' | 'bonus', adv: AdvanceTrack): Gen<boolean> {
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
  const wallFirst = wallStrikesFirst(s, tu, attacker);
  const fsCard = wallFirst ? null : holdsFirstStrike(s, tu.side);
  type DefendChoice = 'stand' | 'evade' | 'firstStrike';
  let choice = 'stand' as DefendChoice;
  if (canEvade || fsCard !== null) {
    const a = yield* ask(s, ctx, {
      kind: 'defend', side: tu.side, attacker: attacker.id, target: tu.id, canEvade, canFirstStrike: fsCard !== null, bonus: role === 'bonus',
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
  if (!m.noRanged && canShoot(u) && op.moved < fireMoveLimit(u)) {
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

/**
 * The order state of piece `id` just ordered (§6): it starts where it stands (`OFF_BOARD` for a reserve), has not moved and
 * has the turn's shots as battles (none for a leader). The AI orders its planned dice orders with it too.
 */
export function newOrderedPiece(s: GameState, id: string): OrderedPiece {
  const isLeader = isLeaderId(id);
  return {
    id, isLeader, startHex: pieceHex(s, id) ?? OFF_BOARD, moved: 0, moveDone: false, move2Done: false,
    battlesLeft: isLeader ? 0 : s.turn.mods.shots, canBattle: true, mustBattle: false,
    enteredHexThisTurn: false, attachedThisTurn: false,
  };
}

function addOrdered(s: GameState, id: string, extra: Partial<OrderedPiece> = {}) {
  s.turn.ordered[id] = { ...newOrderedPiece(s, id), ...extra };
}

/**
 * Whether `side` may spring its ambush reserve with a card of `kind` (the effective kind: a Counter Attack counts as the
 * card it copies): the battle's `special.ambush` data names the trigger cards and the own turns that must be finished.
 */
export function ambushAvailable(s: GameState, side: Side, kind: CardKind | null): boolean {
  const a = s.special.ambush;
  return !!kind && !!a && a.trigger.includes(kind) && s.special.reserveSide === side &&
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
 * Is `section` an accepted answer for springing the ambush with a card of `kind`? One of the card's sections
 * (`ambushSections`), or any section when the force has fixed entry hexes (308, §18.9: the section is still asked, but
 * it is irrelevant).
 */
export function ambushSectionAllowed(s: GameState, kind: CardKind, section: SectionName): boolean {
  if (s.special.ambush?.entryHexes) return SECTIONS.includes(section);
  return ambushSections(kind).includes(section);
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
  log(ctx, s.special.ambush!.text.replace(/\{section\}/g, section), side);
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

/**
 * Separate commands (§18.5): when the pieces `kind` could order belong to more than one command, the player names one
 * before the card acts (before any dice are rolled). Returns the command named, or undefined when nothing was asked
 * (always, in a battle without commands).
 */
function* chooseCommandStep(s: GameState, ctx: FlowCtx, side: Side, kind: CardKind): Gen<string | undefined> {
  const options = commandChoices(s, side, kind);
  if (!options.length) return undefined;
  const a = (yield* ask(s, ctx, { kind: 'chooseCommand', side, options })) as Extract<Answer, { kind: 'choose' }>;
  const id = options[a.index];
  log(ctx, `Orders go to the ${s.special.commands.find((c) => c.id === id)!.name} command.`, side);
  return id;
}

function* rallyStep(s: GameState, ctx: FlowCtx, side: Side): Gen<string[]> {
  const command = yield* chooseCommandStep(s, ctx, side, 'rally');
  const faces = rollDice(s, s.players[side].command);
  const cands = rallyCandidates(s, side, command);
  emitRoll(ctx, 'rally', faces, faces.map((f) => f !== 'flag' && f !== 'swords'), null, null);
  if (!cands.length) {
    log(ctx, 'No damaged units are near a leader: nothing to rally.', side);
    return [];
  }
  const a = yield* ask(s, ctx, { kind: 'rally', side, faces, ...(command !== undefined ? { command } : {}) });
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
  const command = yield* chooseCommandStep(s, ctx, side, 'spartacus');
  const faces = rollDice(s, spartacusDiceCount(s, side));
  emitRoll(ctx, 'spartacus', faces, faces.map((f) => f !== 'flag' && f !== 'swords'), null, null);
  if (faces.every((f) => f === 'flag' || f === 'swords')) return [];
  const a = yield* ask(s, ctx, { kind: 'spartacus', side, faces, ...(command !== undefined ? { command } : {}) });
  return (a as { ids: (string | null)[] }).ids.filter((x): x is string => !!x);
}

function* ordersStep(s: GameState, ctx: FlowCtx, kind: CardKind | null, mirrored: boolean): Gen {
  const side = s.active;
  const t = s.turn;
  t.mods = kind ? modsFor(kind) : defaultMods();
  const mode = orderMode(s, side, kind);
  let ids: string[] = [];
  if (mode.mode === 'none' || !kind) return;
  let select = mode.mode !== 'auto' && mode.mode !== 'dice';
  if (mode.mode === 'auto') {
    const command = yield* chooseCommandStep(s, ctx, side, kind);
    // 304 (§18.5): a command named that has none of the card's units orders 1 unit of its own instead
    if (command !== undefined && orderMode(s, side, kind, command).mode === 'one') select = true;
    else ids = autoOrders(s, side, kind, command);
  } else if (mode.mode === 'dice') ids = kind === 'rally' ? yield* rallyStep(s, ctx, side) : yield* spartacusStep(s, ctx, side);
  if (select) {
    const a = (yield* ask(s, ctx, { kind: 'orders', side, card: kind, mirrored })) as Extract<Answer, { kind: 'orders' }>;
    if (a.ambushSection) {
      releaseAmbush(s, ctx, side, a.ambushSection);
      return;
    }
    ids = a.pieces;
    // "1 unit of your choice" is a normal order: no card bonus (304: judged by the selection's command)
    if ((selectionMode(s, side, kind, ids) ?? mode).mode === 'one') t.mods = defaultMods();
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
  // a unit that moves onto or off a city wall moves 1 hex in all that turn (§18.7): no second Move-Fire-Move move after a
  // first move that began on a wall or climbed onto one
  if (stage === 2 && op.moved > 0 && (isWall(s, op.startHex) || isWall(s, u.hex))) return [];
  const noMove = !!s.special.ambush?.noMove;
  if (op.fromReserve && u.hex === OFF_BOARD) {
    const sec = s.turn.ambushSection;
    if (!sec) return [];
    return unitMoves(s, id, { entryHexes: ambushEntryHexes(s, u.side, sec), entryOnly: noMove });
  }
  // 308 (§18.9): a unit that entered from the reserve this turn moves no further
  if (op.fromReserve && noMove) return [];
  return unitMoves(s, id);
}

/** Piece `id` makes move `target` (one of its `pieceMoves`) to hex `to`. */
function* doMove(s: GameState, ctx: FlowCtx, id: string, to: HexId, stage: 1 | 2, target: MoveTarget): Gen {
  const t = s.turn;
  const op = t.ordered[id];
  if (op.isLeader) {
    const l = leaderById(s, id)!;
    const from = l.hex;
    op.moveDone = true;
    if (stage === 2) op.move2Done = true;
    if (to === OFF_BOARD) {
      // an exit objective that scores leaders (317): he walks to his exit hex (the path's second-to-last hex) and steps off the board
      ctx.emit({ t: 'move', id, path: target.path });
      exitLeader(s, ctx, l, target.path[target.path.length - 2]);
      return;
    }
    l.hex = to;
    ctx.emit({ t: 'move', id, path: from === OFF_BOARD ? [to] : target.path });
    const u = unitAt(s, to);
    if (u && u.side === l.side) {
      ctx.emit({ t: 'attach', leader: l.id, unit: u.id });
      const uo = t.ordered[u.id];
      if (uo && !uo.moveDone) uo.attachedThisTurn = true;
    } else if (hasEntryRoll(s, to)) {
      const f = rollDie(s);
      emitRoll(ctx, 'marsh', [f], [f === 'leader'], null, l.id);
      if (f === 'leader') killLeader(s, ctx, l, 'leader lost in the marsh');
    }
    return;
  }
  const u = unitById(s, id)!;
  const from = u.hex;
  const entered = target.path.filter((h) => h !== from); // the hexes it enters (223 rampart breakers)
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
    // an exit objective: the unit walks to its exit hex (the path's second-to-last hex) and steps off the board for a banner
    ctx.emit({ t: 'move', id, path: target.path });
    relocate(s, u, target.path[target.path.length - 2]);
    breakRamparts(s, ctx, u.side, entered);
    exitUnit(s, ctx, u);
    return;
  }
  relocate(s, u, to);
  ctx.emit({ t: 'move', id, path: from === OFF_BOARD ? [to] : target.path });
  if (from === OFF_BOARD) {
    ctx.emit({ t: 'reserveEnter', id, hex: to });
    s.special.reserveEntered = true; // the forced placements after the ambush may follow (308, §18.9)
  }
  breakRamparts(s, ctx, u.side, entered); // 223: every rampart on the path, the destination too
  if (target.attachesTo) {
    const l = leaderById(s, target.attachesTo);
    if (l) {
      ctx.emit({ t: 'attach', leader: l.id, unit: u.id });
      const lo = t.ordered[l.id];
      if (lo) lo.moveDone = true;
    }
  }
  if (hasEntryRoll(s, to) && (yield* marshCheckUnit(s, ctx, u, { done: false }))) return;
  captureOnStop(s, ctx, u);
}

function validateMove(s: GameState, a: Answer, stage: 1 | 2, found?: Found): string | null {
  if (a.kind === 'endMove') return null;
  if (a.kind !== 'move') return 'Move a unit or end movement.';
  if (!s.turn.ordered[a.piece]) return 'That piece is not ordered.';
  const move = pieceMoves(s, a.piece, stage).find((m) => m.hex === a.to);
  if (!move) return 'That piece cannot move there.';
  if (found) found.move = move;
  return null;
}

/** May ordered piece `id` move in this movement stage? */
const canMove = (s: GameState, id: string, stage: 1 | 2): boolean => pieceMoves(s, id, stage).length > 0;

export function movablePieces(s: GameState, stage: 1 | 2): string[] {
  return Object.keys(s.turn.ordered).filter((id) => canMove(s, id, stage));
}

function* movePhase(s: GameState, ctx: FlowCtx, stage: 1 | 2): Gen {
  for (;;) {
    if (s.winner) return;
    if (!Object.keys(s.turn.ordered).some((id) => canMove(s, id, stage))) break;
    const found: Found = {};
    const a = yield* ask(s, ctx, { kind: 'move', side: s.active, stage }, found);
    if (a.kind === 'endMove') break;
    if (a.kind === 'move') {
      yield* doMove(s, ctx, a.piece, a.to, stage, found.move!);
      updateHeld(s, ctx); // after every move, an ambush entry or an exit included
    }
  }
  if (stage === 1) {
    yield* attachReserveLeaders(s, ctx);
    returnUnplacedReserves(s);
  }
}

/**
 * `ambush.attachLeader` (308, §18.9): a reserve leader still off the board at the end of the movement, when units of his
 * force entered this turn, must join one of them now (decision `placeLeader`: the hexes of those units without a leader,
 * ascending; asked even when there is one). Without units entered he goes back to the reserve with the rest of the force.
 */
function* attachReserveLeaders(s: GameState, ctx: FlowCtx): Gen {
  if (!s.special.ambush?.attachLeader) return;
  for (const op of Object.values(s.turn.ordered)) {
    if (!op.fromReserve || !op.isLeader) continue;
    const l = leaderById(s, op.id);
    if (!l || l.hex !== OFF_BOARD) continue;
    const options = Object.values(s.turn.ordered)
      .filter((o) => o.fromReserve && !o.isLeader)
      .map((o) => unitById(s, o.id))
      .filter((u): u is Unit => !!u && u.hex >= 0 && u.side === l.side && !leaderAt(s, u.hex))
      .map((u) => u.hex)
      .sort((a, b) => a - b);
    if (!options.length) continue;
    const a = yield* ask(s, ctx, { kind: 'placeLeader', side: l.side, leader: l.id, options });
    const hex = (a as { hex: HexId }).hex;
    l.hex = hex;
    op.moveDone = true;
    ctx.emit({ t: 'leaderPlaced', id: l.id, hex });
    ctx.emit({ t: 'attach', leader: l.id, unit: unitAt(s, hex)!.id });
  }
}

// ---------------------------------------------------------------------------
// battle
// ---------------------------------------------------------------------------

/** Can ordered unit `id` battle now: a target to attack, or a Rolling Fire path (§18.5)? */
const canBattleNow = (s: GameState, id: string): boolean => battleTargets(s, id).length > 0 || rollingFirePaths(s, id).length > 0;

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

function validateBattle(s: GameState, a: Answer, found?: Found): string | null {
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

function* battlePhase(s: GameState, ctx: FlowCtx): Gen {
  for (;;) {
    if (s.winner) return;
    if (!Object.keys(s.turn.ordered).some((id) => canBattleNow(s, id))) break;
    const found: Found = {};
    const a = yield* ask(s, ctx, { kind: 'battle', side: s.active }, found);
    if (a.kind === 'endBattle') break;
    // answerError lets through only endBattle, rollingFire and attack, so nothing else reaches here
    if (a.kind === 'rollingFire') {
      yield* rollingFire(s, ctx, unitById(s, a.unit)!, a.path);
    } else if (a.kind === 'attack') {
      const u = unitById(s, a.unit)!;
      const op = s.turn.ordered[a.unit];
      if (found.target!.kind === 'ranged') {
        op.battlesLeft--;
        yield* rangedAttack(s, ctx, u, a.target);
      } else {
        op.battlesLeft = 0;
        op.mustBattle = false;
        const adv: AdvanceTrack = { hex: null };
        yield* closeCombat(s, ctx, u, a.target, 'attack', adv);
        // 'stop' captures (§18.4): a camp counts only where the attacker's last momentum advance ended, and only if the
        // unit still stands there at the end of the sequence (not where it attacked from, nor where a retreat put it)
        if (!s.winner && unitById(s, u.id) && u.hex === adv.hex) captureOnStop(s, ctx, u);
      }
    }
    // held banners after the whole sequence (retreats, advances, bonus combat, Rolling Fire; any battle action)
    updateHeld(s, ctx);
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
  // a side with dice orders (310, §18.10) never draws: no First Strike replacement (it holds none), no turn-end draw
  if (t.firstStrikeBy && t.firstStrikeBy !== side && !orderDice(s, t.firstStrikeBy)) drawCard(s, ctx, t.firstStrikeBy);
  let draws = orderDice(s, side) ? 0 : 1;
  // hand growth (006 Trasimenus, 313 Brindisi Raid, §18.8): while its Command is below the target the side draws 2 and grows by 1
  const growth = s.special.handGrowth;
  if (draws && growth && growth.side === side && s.players[side].command < growth.to) {
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
  // objectives decided at the start of the turn, before the card (turn-start captures, §18.4)
  turnStartObjectives(s, ctx, side);
  if (s.winner) return;
  // then the forced placements that are due (308, §18.9)
  yield* forcedPlacements(s, ctx, side);
  if (s.winner) return;
  if (orderDice(s, side)) {
    // dice orders (310, §18.10): the order roll instead of a card
    t.phase = 'orders';
    yield* diceOrdersStep(s, ctx, side);
    if (s.winner) return;
  } else {
    yield* cardStep(s, ctx, side);
    if (s.winner) return;
  }
  if (!t.mods.noMove && Object.keys(t.ordered).length) {
    t.phase = 'move';
    yield* movePhase(s, ctx, 1);
    if (s.winner) return;
  }
  yield* battleToEnd(s, ctx);
}

/** The card of a card-playing side's turn: it is played (a Counter Attack resolved to its copy) and gives its orders. */
function* cardStep(s: GameState, ctx: FlowCtx, side: Side): Gen {
  const t = s.turn;
  const pa = yield* ask(s, ctx, { kind: 'playCard', side });
  const cardId = (pa as { card: number }).card;
  const hand = s.players[side].hand;
  hand.splice(hand.indexOf(cardId), 1);
  t.card = cardId;
  const kind = cardKind(cardId);
  const { kind: effective, mirrored } = effectiveCard(s, side, cardId);
  t.effective = effective;
  ctx.emit({ t: 'cardPlayed', side, card: cardId, kind, effective: effective ?? kind });
  t.phase = 'orders';
  yield* ordersStep(s, ctx, effective, mirrored);
}

/**
 * Dice orders (310, §18.10, X3 Q9 with the spec's override: the rolling side makes every choice). The side rolls its order
 * dice (purpose `diceOrders`); each flag face makes one of its units, its choice (`diceVictim`), retreat for one flag that
 * cannot be ignored (blocks lost for hexes it cannot take, the leader casualty check as usual); then each swords face costs
 * a unit of its choice 1 block (casualty check for its leader; banners for the enemy as usual). Each victim is chosen once
 * the one before is resolved. Then the faces that can still order something are assigned (`diceOrders`, `validateDiceOrders`):
 * a class face orders one unit of its class, a helmet a leader with his attached unit; unused faces are lost. No card is
 * played: `card` and `effective` stay null and the modifiers are the defaults.
 */
function* diceOrdersStep(s: GameState, ctx: FlowCtx, side: Side): Gen {
  const t = s.turn;
  t.mods = defaultMods();
  const faces = rollDice(s, orderDice(s, side));
  emitRoll(ctx, 'diceOrders', faces, faces.map((f) => f !== 'flag' && f !== 'swords'), null, null);
  for (const face of ['flag', 'swords'] as const) {
    for (const f of faces) {
      if (f !== face) continue;
      const options = unitsOf(s, side).map((u) => u.id);
      if (!options.length) continue;
      const a = (yield* ask(s, ctx, { kind: 'diceVictim', side, face, options })) as Extract<Answer, { kind: 'choose' }>;
      const u = unitById(s, options[a.index])!;
      if (face === 'flag') {
        log(ctx, `A flag on the order dice: the ${sideName(s, side)} ${unitName(u)} falls back.`, side);
        yield* applyHits(s, ctx, u, 0, 1, { kind: 'ranged', striker: null, fullAtStart: u.blocks === u.maxBlocks, noFlagIgnore: true });
      } else {
        log(ctx, `Swords on the order dice: the ${sideName(s, side)} ${unitName(u)} loses a block.`, side);
        yield* hurt(s, ctx, u, 1, 'swords on the order dice');
      }
      if (s.winner) return;
    }
  }
  if (!faces.some((f) => diceOrderPieces(s, side, f).length)) return;
  const a = (yield* ask(s, ctx, { kind: 'diceOrders', side, faces })) as Extract<Answer, { kind: 'assign' }>;
  const ids = diceOrdered(s, a.ids);
  if (!ids.length) return;
  for (const id of ids) addOrdered(s, id);
  ctx.emit({ t: 'ordered', side, ids });
}

/** The rest of the active side's turn from its battle phase: the battle, Move-Fire-Move's second move, the turn end. */
function* battleToEnd(s: GameState, ctx: FlowCtx): Gen {
  const side = s.active;
  const t = s.turn;
  t.phase = 'battle';
  yield* battlePhase(s, ctx);
  if (s.winner) return;
  if (t.mods.moveFireMove && Object.keys(t.ordered).length) {
    t.phase = 'move2';
    yield* movePhase(s, ctx, 2);
    if (s.winner) return;
  }
  t.phase = 'draw';
  // objectives decided at the end of the turn, before the draw (majority, section clear, §18.4)
  turnEndObjectives(s, ctx, side);
  if (s.winner) return;
  endOfTurn(s, ctx);
  t.phase = 'done';
}

/**
 * Continue the active side's turn, already in its movement (`from` 'move') or battle phase (`from` 'battle'), exactly as
 * `turnFlow` would go on: the rest of the movement, the battle, the turn end. For searches on a copied state (a running
 * generator cannot be copied); the turn's card, orders and modifiers are taken as they stand.
 */
export function* continueTurn(s: GameState, ctx: FlowCtx, from: 'move' | 'battle'): Gen {
  const t = s.turn;
  if (from === 'move' && !t.mods.noMove && Object.keys(t.ordered).length) {
    t.phase = 'move';
    yield* movePhase(s, ctx, 1);
    if (s.winner) return;
  }
  yield* battleToEnd(s, ctx);
}

/**
 * Forced placements (308, §18.9) at the start of `side`'s turn, before its card: each unit of `special.placeUnits` of
 * that side whose condition is met (`after: 'ambush'`: a unit of the ambush force has entered) is placed on one of its
 * listed hexes holding no unit and no leader (decision `placeUnit`, asked even when one hex is free). With every hex
 * taken it waits for a later turn start. The placed unit is an ordinary unit from then on: the turn's card may order it.
 */
function* forcedPlacements(s: GameState, ctx: FlowCtx, side: Side): Gen {
  const sp = s.special;
  for (let i = 0; i < sp.placeUnits.length;) {
    const p = sp.placeUnits[i];
    const due = p.unit.side === side && p.after === 'ambush' && sp.reserveEntered;
    const options = due ? p.hexes.filter((h) => isEmptyHex(s, h)) : [];
    if (!options.length) {
      i++;
      continue;
    }
    const a = yield* ask(s, ctx, { kind: 'placeUnit', side, unit: p.unit.id, options });
    const hex = (a as { hex: HexId }).hex;
    sp.placeUnits.splice(i, 1);
    const u = p.unit;
    u.hex = hex;
    s.units.push(u);
    ctx.emit({ t: 'unitPlaced', id: u.id, hex });
    updateHeld(s, ctx); // the unit may stand on an objective hex
    if (s.winner) return;
  }
}

/** Advance to the next player's turn (call after turnFlow completes without a winner). */
export function nextTurn(s: GameState) {
  s.active = other(s.active);
  s.turn = newTurn(s.turn.number + 1);
}

// ---------------------------------------------------------------------------
// pre-battle leader placement (117 Asculum, §17.4)
// ---------------------------------------------------------------------------

/**
 * Hexes where a leader of `side` may be placed before the battle (rule `leaderPlacement`), ascending: an own unit
 * without a leader (he attaches), or an empty passable hex (no unit, no leader; he stands alone). Leaders placed
 * already occupy their hexes.
 */
export function placementOptions(s: GameState, side: Side): HexId[] {
  const out: HexId[] = [];
  for (const h of ALL_HEXES) {
    if (leaderAt(s, h)) continue;
    const u = unitAt(s, h);
    if (u ? u.side === side : !isImpassable(s, h)) out.push(h);
  }
  return out;
}

/** Ask for every leader in `special.unplaced`, in order (the Roman leaders first in 117); placement is not movement. */
function* placementPhase(s: GameState, ctx: FlowCtx): Gen {
  const sp = s.special;
  while (sp.unplaced.length) {
    const l = leaderById(s, sp.unplaced[0]);
    if (!l) throw new Error(`unknown leader to place: ${sp.unplaced[0]}`);
    const options = placementOptions(s, l.side);
    if (!options.length) throw new Error(`no hex to place ${l.name || l.id}`);
    const a = yield* ask(s, ctx, { kind: 'placeLeader', side: l.side, leader: l.id, options });
    const hex = (a as { hex: HexId }).hex;
    l.hex = hex;
    sp.unplaced.shift();
    ctx.emit({ t: 'leaderPlaced', id: l.id, hex });
    const u = unitAt(s, hex);
    if (u && u.side === l.side) ctx.emit({ t: 'attach', leader: l.id, unit: u.id });
  }
}

export function* gameFlow(s: GameState, ctx: FlowCtx): Gen {
  yield* placementPhase(s, ctx);
  while (!s.winner) {
    if (s.turn.phase === 'done') nextTurn(s);
    yield* turnFlow(s, ctx);
  }
}

/** Is this unit on its own baseline row? Decides the last-row retreat elimination (214, §18.5). */
export function atOwnBaseline(u: Unit): boolean {
  return onBaseline(u.hex, u.side);
}
