// UnitIcon: a single representative miniature for panels and tooltips.
import { memo } from 'react';
import type { ArmyLook, Blocks, UnitType } from '../engine/types';
import { KITS, type IconBox } from './kits';
import { paletteFor, type ArtEliteId } from './palettes';
import { FacingRightCtx } from './parts';
import { baseCavalry } from './mounted';
import { Miniature, figureKind } from './token';

type Box = IconBox;

// Measured extents of one figure (i = 2) in its local frame (feet at 0,0, incl. weapons, about 1 unit of margin), used to
// centre and scale icons. The base kits' boxes; LBC, CAM, HWM and BCH measured over the Roman, Punic and Greek kits. A kit
// whose figure differs by more than 1.5 units has its own box (`KITS[kit].iconBox`). Measure with #/gallery/art/boxes.
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
  HWM: [-36.6, 0.4, -28.1, 21.9],
  BCH: [-41.5, 1.4, -27.8, 29.3],
};

// Elites whose own figure (in its army's kit) reaches more than 1 unit beyond the type's box: the Companions (plumes, drawn
// 1.04 times larger), the Immortals (guard spear) and the Mauryan bow auxilia (longbow).
const ELITE_BOX: Partial<Record<ArtEliteId, Partial<Record<UnitType, Box>>>> = {
  companions: { MC: [-45.3, 0.5, -20.4, 22.2] },
  immortals: { MI: [-42, 1.8, -9.6, 11] },
  bowAuxilia: { AX: [-41.6, 0.4, -9.6, 17.4] },
};

function UnitIconImpl({ type, look, blockColor, size, elite }: { type: UnitType; look: ArmyLook; blockColor: Blocks; size: number; elite?: ArtEliteId }) {
  const p = paletteFor(look, blockColor);
  // an elite's own figure (base cavalry stays the base figure whatever its elite)
  const eliteBox = elite && !(figureKind(type) === 'horse' && baseCavalry(type, p.kit)) ? ELITE_BOX[elite]?.[type] : undefined;
  const [top, bottom, left, right] = eliteBox ?? KITS[p.kit].iconBox[type] ?? BOX[type];
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
export function UnitIcon(props: { type: UnitType; look: ArmyLook; blockColor: Blocks; size: number; elite?: ArtEliteId }): JSX.Element {
  return <UnitIconMemo {...props} />;
}
