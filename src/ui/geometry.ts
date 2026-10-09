// Board geometry shared by every UI layer. Pointy-top hexes in "odd-r" offset layout:
// odd rows are shifted right by half a hex. Row 0 is the top army's baseline.
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

export function rowsCols(hex: HexId): { r: number; c: number } {
  return { r: Math.floor(hex / COLS), c: hex % COLS };
}

export function isOnBoard(r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < (r % 2 === 0 ? COLS : COLS - 1);
}

/**
 * Centre of hex (r, c) in board SVG coordinates.
 * When `flipped` the board is rotated 180 degrees (used when the human plays the top army, so their
 * troops are drawn at the bottom of the screen).
 */
export function hexCenter(r: number, c: number, flipped = false): { x: number; y: number } {
  const x = BOARD_MARGIN + HEX_W / 2 + c * HEX_W + (r % 2 === 1 ? HEX_W / 2 : 0);
  const y = BOARD_MARGIN + HEX_R + r * ROW_H;
  return flipped ? { x: BOARD_W - x, y: BOARD_H - y } : { x, y };
}

export function hexCenterId(hex: HexId, flipped = false): { x: number; y: number } {
  const { r, c } = rowsCols(hex);
  return hexCenter(r, c, flipped);
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

/** Corner i (0 = top, clockwise) of a pointy-top hex. */
export function hexCorner(x: number, y: number, i: number, r = HEX_R): { x: number; y: number } {
  const a = (Math.PI / 180) * (60 * i - 90);
  return { x: x + r * Math.cos(a), y: y + r * Math.sin(a) };
}
