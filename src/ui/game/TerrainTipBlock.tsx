// The terrain block of the hex hover tooltip: a painted swatch, the terrain's name and its labelled effect lines.
import { Fragment } from 'react';
import { TerrainIcon } from '../terrain';
import { TIP_KIND_LABEL, type TerrainTip } from './terrainTips';

/**
 * `alone`: no unit or leader stands on the hex, so the terrain heads the tooltip with a large swatch; otherwise it follows
 * the unit's lines under a divider, with a small swatch. Each kind of line is labelled once, at its first line.
 */
export function TerrainTipBlock({ tip, alone }: { tip: TerrainTip; alone: boolean }) {
  return (
    <div className={alone ? 'tip-terrain-block' : 'tip-terrain-block tip-divided'}>
      <div className="tip-head">
        <TerrainIcon t={tip.t} ford={tip.ford} art={tip.art} hill={tip.hill} size={alone ? 40 : 26} />
        <div className={alone ? 'tip-title' : 'tip-terrain-name'}>{tip.name}</div>
      </div>
      <div className="tip-effects">
        {tip.lines.map((x, i) => (
          <Fragment key={i}>
            <span className="tip-kind">{i === 0 || tip.lines[i - 1].kind !== x.kind ? TIP_KIND_LABEL[x.kind] : ''}</span>
            <span className={`tip-effect tip-${x.kind}`}>{x.text}</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
