// The painted battlefield: frame, grassland, terrain features, hex grid and section dividers.
import { memo, useId, useMemo } from 'react';
import type { TerrainType } from '../../engine/types';
import { BOARD_H, BOARD_W, hexCenter } from '../geometry';
import { Frame, grassDefs, GrassBase, HexGrid, SectionDividers } from './base';
import { paintDitches } from './ditch';
import { paintBroken, paintCamps } from './ground';
import { boardCtx, fieldOutline } from './hexmath';
import { paintHills, paintSteep } from './hills';
import { paintRamparts } from './rampart';
import { paintCoastFords, paintSea } from './sea';
import { paintForests, paintMarsh } from './vegetation';
import { paintLakes, paintRivers } from './water';

export interface BoardArtProps {
  /**
   * Length 117 (index r*13+c); 'plain' for open ground, 'void' for off-board slots. The board is drawn from the current
   * arrays: a camp or rampart removed during play (`setTerrain`, §18.6) is open ground at once.
   */
  terrain: readonly TerrainType[];
  /** True where a river hex is fordable. */
  fords: readonly boolean[];
  /** Protected-hexside mask of each rampart hex (GameState.rampart: bit i = direction E, NE, NW, W, SW, SE); absent = none. */
  rampart?: readonly number[];
  /**
   * Art of each hex where it differs from its terrain (`terrainArtOf(setup)`): `'coast'` = a coast played as a ford
   * (217, §18.6), a fordable `river` in the rules drawn as sea shallows with a beach and ford stones. Absent = none.
   */
  art?: readonly (string | undefined)[];
  /** The battle's hills are very steep (rule `veryHills`, 223): rockier, darker hills. */
  steepHills?: boolean;
  /** Board rotated 180 degrees. */
  flipped: boolean;
  /** Army name written on the frame at the top edge (already resolved for `flipped`). */
  topLabel?: string;
  /** Army name written on the frame at the bottom edge. */
  bottomLabel?: string;
}

const NO_RAMPARTS: readonly number[] = [];
const NO_ART: readonly (string | undefined)[] = [];

/** The terrain as painted: a fordable river hex with `'coast'` art is drawn as (fordable) sea. */
function paintedTerrain(terrain: readonly TerrainType[], art: readonly (string | undefined)[]): readonly TerrainType[] {
  if (!art.some((a) => a === 'coast')) return terrain;
  return terrain.map((t, i) => (art[i] === 'coast' && t === 'river' ? 'sea' : t));
}

function BoardArtImpl({
  terrain,
  fords,
  rampart = NO_RAMPARTS,
  art: hexArt = NO_ART,
  steepHills = false,
  flipped,
  topLabel,
  bottomLabel,
}: BoardArtProps): JSX.Element {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (s: string) => `ba${uid}-${s}`;
  const tKey = terrain.join(',');
  const fKey = fords.map((f) => (f ? 1 : 0)).join('');
  const rKey = rampart.join(',');
  const aKey = hexArt.map((a) => a ?? '').join(',');

  const art = useMemo(() => {
    const ctx = boardCtx(paintedTerrain(terrain, hexArt), fords, flipped);
    return {
      outline: fieldOutline(ctx),
      grid: <HexGrid ctx={ctx} />,
      features: (
        <>
          {/* the sea first: its beach reaches into the land hexes, and the land features (and rivers) paint over it */}
          {paintSea(ctx)}
          {paintCoastFords(ctx)}
          {paintBroken(ctx)}
          {paintMarsh(ctx)}
          {paintDitches(ctx)}
          {paintHills(ctx, `url(#${id('tuftA')})`, 1, steepHills)}
          {paintRivers(ctx, id)}
          {paintLakes(ctx)}
          {paintSteep(ctx)}
          {paintCamps(ctx)}
          {paintRamparts(ctx, rampart)}
          {paintForests(ctx)}
        </>
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tKey, fKey, rKey, aKey, steepHills, flipped, uid]);

  const x1 = hexCenter(0, 4, flipped).x;
  const x2 = hexCenter(0, 8, flipped).x;
  const xa = Math.min(x1, x2);
  const xb = Math.max(x1, x2);
  return (
    <g className="board-art">
      <defs>
        {grassDefs(id)}
        <clipPath id={id('field')}>
          <rect x={0} y={0} width={BOARD_W} height={BOARD_H} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id('field')})`}>
        <GrassBase id={id} />
        {art.features}
        {art.grid}
        <SectionDividers x1={xa} x2={xb} />
      </g>
      <Frame id={id} outline={art.outline} x1={xa} x2={xb} topLabel={topLabel} bottomLabel={bottomLabel} />
    </g>
  );
}

function sameArr<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Do two sets of board-art props draw the same board? Arrays are compared by content, so a terrain change during play
 * (`setTerrain` replaces `GameState.terrain`/`rampart`) redraws the board, and a fresh copy of the same terrain does not.
 */
export function boardArtPropsEqual(a: BoardArtProps, b: BoardArtProps): boolean {
  return (
    a.flipped === b.flipped &&
    a.topLabel === b.topLabel &&
    a.bottomLabel === b.bottomLabel &&
    !!a.steepHills === !!b.steepHills &&
    sameArr(a.terrain, b.terrain) &&
    sameArr(a.fords, b.fords) &&
    sameArr(a.rampart ?? NO_RAMPARTS, b.rampart ?? NO_RAMPARTS) &&
    sameArr(a.art ?? NO_ART, b.art ?? NO_ART)
  );
}

/** Static board art; re-renders only when the terrain, fords, ramparts, hex art, hill style, orientation or labels change. */
export const BoardArt = memo(BoardArtImpl, boardArtPropsEqual);
