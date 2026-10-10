// Banners and victory (rules-reference §13, §18.4). A side's banner total is its permanent banners
// (`PlayerState.banners`) plus the banners its objectives give it right now (held banners, `ObjectiveState.held`).
import { drawCard } from './cards';
import { isRomanArmy } from './query';
import type { FlowCtx, GameState, Side } from './types';

/** Banners `side` holds right now through its objectives (hold, majority, section clear); lost again when they lapse. */
export function heldBanners(s: GameState, side: Side): number {
  let n = 0;
  for (const o of s.special.objState) n += o.held[side];
  return n;
}

/** A side's banner total: its permanent banners plus its held banners. */
export function bannerTotal(s: GameState, side: Side): number {
  return s.players[side].banners + heldBanners(s, side);
}

/**
 * The banner check after `side`'s total rose: a total reaching the battle's target wins it at once (event `victory`).
 * Returns true when the battle is over now. Losing held banners later never undoes a win.
 */
export function bannerVictory(s: GameState, ctx: FlowCtx, side: Side): boolean {
  if (s.winner) return true;
  const total = bannerTotal(s, side);
  if (total < s.bannersToWin) return false;
  s.winner = side;
  s.winReason = `${s.players[side].army} captured ${total} banners`;
  ctx.emit({ t: 'victory', winner: side, reason: s.winReason });
  return true;
}

/**
 * `side` scores a permanent banner (`reason` goes in the `banner` event, whose `total` is the banner total). A total
 * reaching the battle's target wins it. 2nd Beneventum: the Romans grow to 6 cards on their 3rd banner.
 */
export function gainBanner(s: GameState, ctx: FlowCtx, side: Side, reason: string) {
  if (s.winner) return;
  const p = s.players[side];
  p.banners++;
  ctx.emit({ t: 'banner', side, total: bannerTotal(s, side), reason });
  if (bannerVictory(s, ctx, side)) return;
  if (s.special.rules.includes('beneventumHand') && isRomanArmy(s, side) && p.banners === 3 && !s.special.beneventumBonusGiven) {
    s.special.beneventumBonusGiven = true;
    p.command = 6;
    ctx.emit({ t: 'command', side, command: 6 });
    ctx.emit({ t: 'log', text: `Gracchus rallies his volunteers: the ${p.army} player now holds 6 command cards.`, side });
    drawCard(s, ctx, side);
    drawCard(s, ctx, side);
  }
}
