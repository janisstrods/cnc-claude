// Casualties and retreats (rules-reference §8-§11, §13, §17.4): blocks lost and units eliminated with the banners they
// give (the elephant's blocked retreat scores its banners together), leaders killed (Castulo's Scipio, the Hellespont
// rules), leader casualty checks and evades, marsh checks, retreats (elephant rampage, last-row retreat), and
// `applyHits` (a strike's or a shot's hits and flags: losses, the leader's casualty check, flag ignores, the retreat).
// Also the log and roll event helpers the rest of the flow shares.
import { bannerTotal, gainBanner, updateHeld } from './banners';
import { ignorableFlags, retreatPerFlag, type StrikeRole } from './combat';
import { ask, type Gen } from './decisions';
import { neighbours, onBaseline } from './hex';
import { attachedLeader, isLeaderId, leaderAt, leaderById, other, unitAt, unitById } from './query';
import { elephantRetreatOptions, leaderEvadeOptions, retreatOptions, type ElephantRetreatOption } from './retreat';
import { randInt, rollDice, rollDie } from './rng';
import { breakRamparts, hasEntryRoll } from './terrain';
import { possessive } from './text';
import { UNIT_STATS, escapeDice } from './units';
import {
  OFF_BOARD, type DieFace, type FlowCtx, type GameState, type HexId, type Leader, type RetreatOption, type RollPurpose, type Side,
  type Unit,
} from './types';

// ---------------------------------------------------------------------------
// losses
// ---------------------------------------------------------------------------

export const unitName = (u: Unit) => UNIT_STATS[u.type].name;
export const sideName = (s: GameState, side: Side) => s.players[side].army;

export function log(ctx: FlowCtx, text: string, side?: Side) {
  ctx.emit({ t: 'log', text, side });
}

export function emitRoll(ctx: FlowCtx, purpose: RollPurpose, faces: DieFace[], scoring: boolean[], by: string | null, against: string | null) {
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
  if (s.scenario.sacredLeaderId === l.id && !s.winner) {
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
  const { rules, leadersAtStart } = s.scenario;
  const sp = s.special;
  if (rules.includes('allLeadersSuddenDeath') && sp.leadersEliminated[side] >= leadersAtStart[side]) {
    s.winner = other(side);
    s.winReason = `All of ${possessive(s.players[side].commander)} leaders have fallen`;
    ctx.emit({ t: 'victory', winner: s.winner, reason: s.winReason });
    return;
  }
  if (!rules.includes('leaderLossCostsCard')) return;
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

export function killLeader(s: GameState, ctx: FlowCtx, l: Leader, reason: string) {
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
export function removeUnit(s: GameState, ctx: FlowCtx, u: Unit, reason: string) {
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

export function* leaderEvade(s: GameState, ctx: FlowCtx, l: Leader): Gen {
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
export function* hurt(
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
export function* marshCheckUnit(s: GameState, ctx: FlowCtx, u: Unit, leaderChecked: { done: boolean }): Gen<boolean> {
  const f = rollDie(s);
  const cls = UNIT_STATS[u.type].cls;
  emitRoll(ctx, 'marsh', [f], [f === cls], null, u.id);
  if (f !== cls) return false;
  return yield* hurt(s, ctx, u, 1, 'sunk in the marsh', leaderChecked);
}

/** Move a unit (and attached leader) to hex h without checks. */
export function relocate(s: GameState, u: Unit, h: HexId) {
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

export function* chooseOption<T extends RetreatOption>(
  s: GameState, ctx: FlowCtx, side: Side, unit: string, opts: T[], reason: 'retreat' | 'evade',
): Gen<T> {
  if (opts.length === 1) return opts[0];
  const a = yield* ask(s, ctx, { kind: 'retreat', side, unit, options: opts, reason });
  return opts[(a as { index: number }).index];
}

/** Walk a retreat/evade path with marsh checks; returns true if the unit was eliminated on the way. */
export function* walkPath(s: GameState, ctx: FlowCtx, u: Unit, opt: RetreatOption, kind: 'retreat' | 'evade', leaderChecked: { done: boolean }): Gen<boolean> {
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
  if (s.scenario.lastRowRetreat !== u.side || opt.attachLeader || !atOwnBaseline(u)) return opt.losses;
  log(ctx, `${sideName(s, u.side)} ${unitName(u)} has no ground left to retreat and is cut down!`, u.side);
  return u.blocks;
}

/** Is this unit on its own baseline row? Decides the last-row retreat elimination (214, §18.5). */
export function atOwnBaseline(u: Unit): boolean {
  return onBaseline(u.hex, u.side);
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
export function* applyHits(
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
