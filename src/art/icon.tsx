// UnitIcon: a single representative miniature for panels and tooltips.
import { memo } from 'react';
import type { ArmyLook, Blocks, EliteId, UnitType } from '../engine/types';
import { paletteFor, type Kit } from './palettes';
import { FacingRightCtx } from './parts';
import { Miniature, figureKind } from './token';

type Box = [top: number, bottom: number, left: number, right: number];

// Measured extents of one figure (i = 2) in its local frame (feet at 0,0, incl. weapons, about 1 unit of margin), used to
// centre and scale icons. The base kits' boxes; LBC, CAM and HWM measured over the Roman, Punic and Greek kits.
const BOX: Record<UnitType, Box> = {
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
  LBC: [-33.7, 0.4, -18.2, 19.3],
  CAM: [-45.9, 0.3, -20, 24.3],
  HWM: [-33.6, 0.4, -28.1, 21.9],
};

// The Expansion #1 kits where a figure's extent differs from the base box by more than 1.5 units (union over the kit's looks).
const KIT_BOX: Partial<Record<Kit, Partial<Record<UnitType, Box>>>> = {
  macedonian: {
    HI: [-35.5, 0.4, -14.2, 18.6], LC: [-35.9, 0.4, -18.2, 19.3], MC: [-38.8, 0.7, -19.7, 21.4], EL: [-48.3, 1, -17.5, 24.1],
    HCH: [-40.3, 0.9, -24.6, 31.9], LBC: [-37.9, 0.4, -18.2, 19.3], HWM: [-31.6, 0.4, -28.1, 21.9],
  },
  persian: {
    WA: [-40, 0.4, -6.1, 11.4], HI: [-40, 2.6, -7.8, 10.4], LC: [-35.9, 0.4, -18.2, 19.3], HC: [-41, 0.6, -20.8, 22.7],
    EL: [-48.1, 1, -18.5, 25.6], HCH: [-37.6, 0.9, -24.6, 31.9],
  },
  scythian: {
    LI: [-37.1, 0.4, -11.7, 12.4], LB: [-37.1, 0.4, -7.4, 14.6], AX: [-40, 0.4, -6.1, 11.4], WA: [-40, 0.4, -7, 10.8],
    HI: [-40, 1.9, -7.4, 10.4], LC: [-37.9, 0.4, -18.2, 19.3], HC: [-41, 0.6, -20.8, 22.7], EL: [-49.9, 1, -18.5, 25.6],
    HCH: [-41.5, 0.9, -21.8, 31], LBC: [-37.9, 0.4, -18.2, 19.3], HWM: [-37.1, 0.4, -28.1, 21.9],
  },
  indian: {
    LB: [-41.6, 0.4, -9.6, 17.4], MI: [-40, 1.9, -6.4, 8.7], LC: [-35.9, 0.4, -18.2, 19.3], HC: [-41, 0.6, -20.8, 22.7],
    EL: [-49.3, 1, -18.5, 25.6], HCH: [-40, 0.9, -32.5, 31.9],
  },
};

function UnitIconImpl({ type, look, blockColor, size, elite }: { type: UnitType; look: ArmyLook; blockColor: Blocks; size: number; elite?: EliteId }) {
  const p = paletteFor(look, blockColor);
  const [top, bottom, left, right] = KIT_BOX[p.kit]?.[type] ?? BOX[type];
  const s = size / Math.max(bottom - top, right - left);
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  return (
    <g transform={`scale(${s}) translate(${-cx} ${-cy})`}>
      <ellipse cx={1.2} cy={0.6} rx={figureKind(type) === 'foot' ? 7.5 : 15} ry={2.1} fill="#1a1208" opacity={0.35} />
      <FacingRightCtx.Provider value>
        <Miniature type={type} p={p} i={2} elite={elite} />
      </FacingRightCtx.Provider>
    </g>
  );
}

const UnitIconMemo = memo(UnitIconImpl);

/**
 * One representative miniature (facing right), centred on (0,0) and scaled to fit a `size` x `size` box. `elite` draws
 * the elite's own figure (e.g. a Companion instead of an ordinary Macedonian MC).
 */
export function UnitIcon(props: { type: UnitType; look: ArmyLook; blockColor: Blocks; size: number; elite?: EliteId }): JSX.Element {
  return <UnitIconMemo {...props} />;
}
