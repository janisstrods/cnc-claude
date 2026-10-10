// Banners and victory (rules-reference §13, §18.4). A side's banner total is its permanent banners
// (`PlayerState.banners`) plus the banners its objectives give it right now (held banners, held.ts). Held banners are
// brought up to date before any banner is scored, so a total never counts a held banner already lost.
import { drawCard } from './cards';
import { heldBanners, heldSnapshot, refreshHeld } from './held';
import { isRomanArmy, other } from './query';
import type { FlowCtx, GameState, Side } from './types';

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
 * Bring the held banners up to date (held.ts): after units moved, left the board or were eliminated, and before any
 * banner is scored. `change` (the turn-end rules, `turnEndObjectives`) is applied first, inside the same comparison.
 * Emits `held` for each side whose held banners changed (losses first, then the active side; reason = the text of the
 * first objective that changed for it), then the victory check for each side whose total rose. Emits nothing when
 * nothing changed (always in battles without hold, majority or section clear objectives) or once the battle is over.
 */
export function updateHeld(s: GameState, ctx: FlowCtx, change?: (s: GameState) => void): void {
  const { objectives, objState } = s.special;
  if (!objectives.length || s.winner) return;
  const before = heldSnapshot(s);
  change?.(s);
  refreshHeld(s);
  const delta = (side: Side) => objState.reduce((n, st, i) => n + st.held[side] - before[i][side], 0);
  const sides = [s.active, other(s.active)].filter((side) => delta(side) !== 0)
    .sort((a, b) => Math.sign(delta(a)) - Math.sign(delta(b)));
  for (const side of sides) {
    const i = objState.findIndex((st, k) => st.held[side] !== before[k][side]);
    ctx.emit({ t: 'held', side, held: heldBanners(s, side), total: bannerTotal(s, side), reason: objectives[i].text });
  }
  for (const side of sides) if (delta(side) > 0 && bannerVictory(s, ctx, side)) return;
}

/**
 * `side` scores a permanent banner (`reason` goes in the `banner` event, whose `total` is the banner total). The held
 * banners are brought up to date first (`updateHeld`, which may end the battle). A total reaching the battle's target
 * wins it. 2nd Beneventum: the Romans grow to 6 cards on their 3rd banner.
 */
export function gainBanner(s: GameState, ctx: FlowCtx, side: Side, reason: string) {
  updateHeld(s, ctx);
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
