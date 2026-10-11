// Board geometry shared by every UI layer, on top of the engine's hex grid (engine/hex.ts: `hexId`, `rowOf`, `colOf`,
// `onBoard`). Pointy-top hexes in "odd-r" offset layout: odd rows are shifted right by half a hex. Row 0 is the top army's
// baseline. Centres are also defined for "virtual" off-board hexes (negative rows, column 13, ...), which the terrain
// painters use to run rivers and lakes under the frame.
import { colOf, onBoard, rowOf } from '../engine/hex';
import { COLS, ROWS, type HexId } from '../engine/types';

/** Hex circumradius in SVG user units. */
export const HEX_R = 50;
/** Hex width (flat side to flat side). */
export const HEX_W = Math.sqrt(3) * HEX_R;
/** Vertical distance between row centres. */
export const ROW_H = 1.5 * HEX_R;
/** Margin around the hex field inside the board SVG. */
export const BOARD_MARGIN = 34;

export const BOARD_W = COLS * HEX_W + BOARD_MARGIN * 2;
export const BOARD_H = (ROWS - 1) * ROW_H + 2 * HEX_R + BOARD_MARGIN * 2;

/** The engine's `onBoard`, under the name the terrain tests import. */
export { onBoard as isOnBoard };

/** 0 for an even row, 1 for an odd one (shifted right by half a hex); virtual rows above the board (negative) included. */
export const parity = (r: number) => ((r % 2) + 2) % 2;

/** Column `c` clamped into row `r` of the board (an odd row holds one hex fewer). */
export function clampCol(r: number, c: number): number {
  return Math.max(0, Math.min(parity(r) === 0 ? COLS - 1 : COLS - 2, c));
}

/**
 * Centre of hex (r, c) in board SVG coordinates; any (possibly off-board) hex.
 * When `flipped` the board is rotated 180 degrees (used when the human plays the top army, so their
 * troops are drawn at the bottom of the screen).
 */
export function hexCenter(r: number, c: number, flipped = false): { x: number; y: number } {
  const x = BOARD_MARGIN + HEX_W / 2 + c * HEX_W + (parity(r) === 1 ? HEX_W / 2 : 0);
  const y = BOARD_MARGIN + HEX_R + r * ROW_H;
  return flipped ? { x: BOARD_W - x, y: BOARD_H - y } : { x, y };
}

export function hexCenterId(hex: HexId, flipped = false): { x: number; y: number } {
  return hexCenter(rowOf(hex), colOf(hex), flipped);
}

/** SVG polygon points for a pointy-top hex centred at (x, y) with radius r. */
export function hexPoints(x: number, y: number, r = HEX_R): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    pts.push(`${(x + r * Math.cos(a)).toFixed(2)},${(y + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}
