// The painted battlefield: frame, grassland, terrain features, hex grid and section dividers.
import { memo, useId, useMemo } from 'react';
import type { TerrainType } from '../../engine/types';
import { BOARD_H, BOARD_W, hexCenter } from '../geometry';
import { Frame, grassDefs, GrassBase, HexGrid, SectionDividers } from './base';
import { paintBroken, paintCamps } from './ground';
import { boardCtx, fieldOutline } from './hexmath';
import { paintHills, paintSteep } from './hills';
import { paintForests, paintMarsh } from './vegetation';
import { paintLakes, paintRivers } from './water';

export interface BoardArtProps {
  /** Length 117 (index r*13+c); 'plain' for open ground, 'void' for off-board slots. */
  terrain: TerrainType[];
  /** True where a river hex is fordable. */
  fords: boolean[];
  /** Board rotated 180 degrees. */
  flipped: boolean;
  /** Army name written on the frame at the top edge (already resolved for `flipped`). */
  topLabel?: string;
  /** Army name written on the frame at the bottom edge. */
  bottomLabel?: string;
}

function BoardArtImpl({ terrain, fords, flipped, topLabel, bottomLabel }: BoardArtProps): JSX.Element {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (s: string) => `ba${uid}-${s}`;
  const tKey = terrain.join(',');
  const fKey = fords.map((f) => (f ? 1 : 0)).join('');

  const art = useMemo(() => {
    const ctx = boardCtx(terrain, fords, flipped);
    return {
      outline: fieldOutline(ctx),
      grid: <HexGrid ctx={ctx} />,
      features: (
        <>
          {paintBroken(ctx)}
          {paintMarsh(ctx)}
          {paintHills(ctx, `url(#${id('tuftA')})`)}
          {paintRivers(ctx)}
          {paintLakes(ctx)}
          {paintSteep(ctx)}
          {paintCamps(ctx)}
          {paintForests(ctx)}
        </>
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tKey, fKey, flipped, uid]);

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

/** Static board art; re-renders only when the terrain, fords, orientation or labels change. */
export const BoardArt = memo(
  BoardArtImpl,
  (a, b) =>
    a.flipped === b.flipped &&
    a.topLabel === b.topLabel &&
    a.bottomLabel === b.bottomLabel &&
    sameArr(a.terrain, b.terrain) &&
    sameArr(a.fords, b.fords),
);
