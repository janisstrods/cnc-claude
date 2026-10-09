// UnitIcon: a single representative miniature for panels and tooltips.
import { memo } from 'react';
import type { ArmyLook, Blocks, UnitType } from '../engine/types';
import { paletteFor } from './palettes';
import { FacingRightCtx } from './parts';
import { Miniature, figureKind } from './token';

// Measured extents of one figure in its local frame (feet at 0,0, incl. weapons), used to centre and scale icons.
const BOX: Record<UnitType, [top: number, bottom: number, left: number, right: number]> = {
  LI: [-35, 0.4, -11.7, 12.4],
  LB: [-33.4, 0.4, -9.6, 14.6],
  LS: [-37.4, 0.4, -8.8, 9.4],
  AX: [-39, 0.4, -11.7, 12.2],
  WA: [-41.6, 0.4, -8.2, 9.1],
  MI: [-40, 1.8, -6.1, 11.3],
  HI: [-43.5, 1.8, -6.6, 11.8],
  LC: [-38.9, 0.4, -19.7, 20.9],
  MC: [-52.4, 0.6, -19.7, 20.9],
  HC: [-42.9, 0.6, -19.7, 21.4],
  EL: [-45.9, 0.9, -18.9, 25.6],
  HCH: [-43.3, 0.8, -27.8, 31],
  // TODO(Task 16): the boxes of the stand-in figures (LC, MC, HI) until the new miniatures are measured.
  LBC: [-38.9, 0.4, -19.7, 20.9],
  CAM: [-52.4, 0.6, -19.7, 20.9],
  HWM: [-43.5, 1.8, -6.6, 11.8],
};

function UnitIconImpl({ type, look, blockColor, size }: { type: UnitType; look: ArmyLook; blockColor: Blocks; size: number }) {
  const p = paletteFor(look, blockColor);
  const [top, bottom, left, right] = BOX[type];
  const s = size / Math.max(bottom - top, right - left);
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  return (
    <g transform={`scale(${s}) translate(${-cx} ${-cy})`}>
      <ellipse cx={1.2} cy={0.6} rx={figureKind(type) === 'foot' ? 7.5 : 15} ry={2.1} fill="#1a1208" opacity={0.35} />
      <FacingRightCtx.Provider value>
        <Miniature type={type} p={p} i={2} />
      </FacingRightCtx.Provider>
    </g>
  );
}

const UnitIconMemo = memo(UnitIconImpl);

/** One representative miniature (facing right), centred on (0,0) and scaled to fit a `size` x `size` box. */
export function UnitIcon(props: { type: UnitType; look: ArmyLook; blockColor: Blocks; size: number }): JSX.Element {
  return <UnitIconMemo {...props} />;
}
