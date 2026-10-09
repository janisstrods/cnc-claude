// Dev gallery for the miniature art: http://localhost:5173/#/gallery/art
import type { ReactNode } from 'react';
import type { ArmyLook, Blocks, UnitType } from '../engine/types';
import { hexPoints, HEX_W, HEX_R } from '../ui/geometry';
import { LEADER_ATTACH_OFFSET, LeaderToken, UnitIcon, UnitToken, unitTypeName } from '../art';

const TYPES: UnitType[] = ['LI', 'LB', 'LS', 'AX', 'WA', 'MI', 'HI', 'LC', 'MC', 'HC', 'EL', 'HCH'];
/** The gallery's three base armies (these names are also the `detail` route parameter). */
type ArmyName = 'rome' | 'carthage' | 'syracuse';
const ARMY_NAMES: ArmyName[] = ['rome', 'carthage', 'syracuse'];
const ART: Record<ArmyName, { look: ArmyLook; blockColor: Blocks }> = {
  rome: { look: 'roman', blockColor: 'rom' },
  carthage: { look: 'carthaginian', blockColor: 'car' },
  syracuse: { look: 'syracusan', blockColor: 'grk' },
};
const MAX: Record<UnitType, number> = {
  LI: 4, LB: 4, LS: 4, AX: 4, WA: 4, MI: 4, HI: 4, LC: 3, MC: 3, HC: 3, EL: 2, HCH: 2,
};
const ARMY_LABEL: Record<ArmyName, string> = { rome: 'Rome', carthage: 'Carthage', syracuse: 'Syracuse' };

const GRASS = '#8fa25e';
const GRASS_EDGE = '#6f8446';

function Hex({ children, scale = 2, label, fill = GRASS }: { children: ReactNode; scale?: number; label?: string; fill?: string }) {
  const w = 92;
  const h = 104;
  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={w * scale} height={h * scale} viewBox={`${-w / 2} ${-h / 2} ${w} ${h}`} style={{ display: 'block' }}>
        <polygon points={hexPoints(0, 0, HEX_R)} fill={fill} stroke={GRASS_EDGE} strokeWidth={1.2} />
        <polygon points={hexPoints(0, 0, HEX_R - 3)} fill="none" stroke="#ffffff" strokeOpacity={0.12} strokeWidth={2} />
        {children}
      </svg>
      {label && <figcaption style={{ font: '600 13px "EB Garamond", Georgia, serif', color: '#3b2d1c', marginTop: 2 }}>{label}</figcaption>}
    </figure>
  );
}

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <h2 style={{ font: '700 20px Cinzel, Georgia, serif', color: '#3b2a16', margin: '0 0 8px', letterSpacing: 1 }}>{title}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 4px', alignItems: 'flex-end' }}>{children}</div>
    </section>
  );
}

/** A small battle line at true board scale (1 SVG unit = 1 px) to judge readability. */
function BoardSample() {
  const units: { r: number; c: number; type: UnitType; army: ArmyName; blocks: number; facing: 'left' | 'right'; leader?: boolean; dimmed?: boolean }[] = [
    { r: 0, c: 0, type: 'LC', army: 'carthage', blocks: 3, facing: 'right' },
    { r: 0, c: 1, type: 'WA', army: 'carthage', blocks: 4, facing: 'right' },
    { r: 0, c: 2, type: 'HI', army: 'carthage', blocks: 4, facing: 'right', leader: true },
    { r: 0, c: 3, type: 'EL', army: 'carthage', blocks: 2, facing: 'right' },
    { r: 0, c: 4, type: 'MI', army: 'carthage', blocks: 3, facing: 'right', dimmed: true },
    { r: 0, c: 5, type: 'LS', army: 'carthage', blocks: 4, facing: 'right' },
    { r: 0, c: 6, type: 'HC', army: 'carthage', blocks: 2, facing: 'right' },
    { r: 1, c: 0, type: 'MC', army: 'rome', blocks: 3, facing: 'left' },
    { r: 1, c: 1, type: 'HI', army: 'rome', blocks: 4, facing: 'left', leader: true },
    { r: 1, c: 2, type: 'HI', army: 'rome', blocks: 2, facing: 'left' },
    { r: 1, c: 3, type: 'LI', army: 'rome', blocks: 4, facing: 'left' },
    { r: 1, c: 4, type: 'AX', army: 'rome', blocks: 4, facing: 'left' },
    { r: 1, c: 5, type: 'LB', army: 'rome', blocks: 1, facing: 'left' },
    { r: 2, c: 0, type: 'HI', army: 'syracuse', blocks: 4, facing: 'right' },
    { r: 2, c: 1, type: 'MI', army: 'syracuse', blocks: 4, facing: 'right' },
    { r: 2, c: 2, type: 'LC', army: 'syracuse', blocks: 3, facing: 'right', leader: true },
    { r: 2, c: 3, type: 'HCH', army: 'syracuse', blocks: 2, facing: 'right' },
    { r: 2, c: 4, type: 'WA', army: 'syracuse', blocks: 3, facing: 'right' },
    { r: 2, c: 5, type: 'LB', army: 'syracuse', blocks: 4, facing: 'right' },
    { r: 2, c: 6, type: 'AX', army: 'syracuse', blocks: 4, facing: 'right' },
  ];
  const W = 7.5 * HEX_W + 20;
  const H = 2 * HEX_R * 1.5 + 2 * HEX_R + 20;
  const pos = (r: number, c: number) => ({ x: 10 + HEX_W / 2 + c * HEX_W + (r % 2 ? HEX_W / 2 : 0), y: 10 + HEX_R + r * HEX_R * 1.5 });
  const hexes: JSX.Element[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) {
    const { x, y } = pos(r, c);
    hexes.push(<polygon key={`${r}-${c}`} points={hexPoints(x, y)} fill={GRASS} stroke={GRASS_EDGE} strokeWidth={1} />);
  }
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ background: '#7d9052', borderRadius: 6 }}>
      {hexes}
      {units.map((u, k) => {
        const { x, y } = pos(u.r, u.c);
        return (
          <g key={k} transform={`translate(${x} ${y})`}>
            <UnitToken type={u.type} {...ART[u.army]} blocks={u.blocks} maxBlocks={MAX[u.type]} facing={u.facing} dimmed={u.dimmed} />
            {u.leader && (
              <g transform={`translate(${LEADER_ATTACH_OFFSET.x} ${LEADER_ATTACH_OFFSET.y})`}>
                <LeaderToken {...ART[u.army]} facing={u.facing} attached />
              </g>
            )}
          </g>
        );
      })}
      <g transform={`translate(${pos(1, 6).x} ${pos(1, 6).y})`}>
        <LeaderToken {...ART.rome} facing="left" attached={false} name="Scipio" showName />
      </g>
    </svg>
  );
}

/** Close-up view (#/gallery/art/detail[/TYPE,TYPE..]) for inspecting individual figures. */
function Detail() {
  const parts = window.location.hash.split('/');
  const list = (parts[5] ?? 'HI,WA,LB,LS,LC,MC,HC,EL,HCH').split(',') as UnitType[];
  const fac = (parts[4] as ArmyName) || 'rome';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 10, background: '#e3d3ad' }}>
      {list.map((t) => (
        <Hex key={t} scale={4.2} label={t}>
          <UnitToken type={t} {...ART[fac]} blocks={MAX[t]} maxBlocks={MAX[t]} facing="right" />
          {t === 'HI' && (
            <g transform={`translate(${LEADER_ATTACH_OFFSET.x} ${LEADER_ATTACH_OFFSET.y})`}>
              <LeaderToken {...ART[fac]} facing="right" attached />
            </g>
          )}
        </Hex>
      ))}
      <Hex scale={4.2} label="leader">
        <LeaderToken {...ART[fac]} facing="right" attached={false} name="Scipio" showName />
      </Hex>
      {ARMY_NAMES.map((lf) => (
        <svg key={lf} width={220} height={220} viewBox="-14 -14 28 28" style={{ background: GRASS }}>
          <LeaderToken {...ART[lf]} facing={lf === 'carthage' ? 'left' : 'right'} attached />
        </svg>
      ))}
    </div>
  );
}

export default function ArtGallery() {
  if (window.location.hash.startsWith('#/gallery/art/detail')) return <Detail />;
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '22px 26px 60px',
        background: 'radial-gradient(ellipse at 30% 0%, #efe3c4 0%, #e3d3ad 55%, #d4c095 100%)',
        fontFamily: '"EB Garamond", Georgia, serif',
        color: '#2b2014',
      }}
    >
      <h1 style={{ font: '700 30px Cinzel, Georgia, serif', margin: '0 0 4px', letterSpacing: 2 }}>Miniatures</h1>
      <p style={{ margin: '0 0 20px', fontSize: 17 }}>Illustrated painted-miniature unit art · hexes shown at 2× board scale unless noted.</p>

      <Row title="At board scale (1×)">
        <BoardSample />
      </Row>

      {ARMY_NAMES.map((fac) => (
        <Row key={fac} title={`${ARMY_LABEL[fac]} — full strength`}>
          {TYPES.map((t) => (
            <Hex key={t} label={unitTypeName(t)}>
              <UnitToken type={t} {...ART[fac]} blocks={MAX[t]} maxBlocks={MAX[t]} facing="right" />
            </Hex>
          ))}
        </Row>
      ))}

      <Row title="Depleted units">
        {(['HI', 'WA', 'LB'] as UnitType[]).flatMap((t) =>
          [3, 2, 1].map((b) => (
            <Hex key={`${t}${b}`} label={`${t} ${b}/4`}>
              <UnitToken type={t} {...ART[t === 'HI' ? 'rome' : t === 'WA' ? 'carthage' : 'syracuse']} blocks={b} maxBlocks={4} facing="right" />
            </Hex>
          )),
        )}
        {(['MC', 'HC'] as UnitType[]).flatMap((t) =>
          [2, 1].map((b) => (
            <Hex key={`${t}${b}`} label={`${t} ${b}/3`}>
              <UnitToken type={t} {...ART[t === 'MC' ? 'rome' : 'syracuse']} blocks={b} maxBlocks={3} facing="right" />
            </Hex>
          )),
        )}
        <Hex label="EL 1/2"><UnitToken type="EL" {...ART.carthage} blocks={1} maxBlocks={2} facing="right" /></Hex>
        <Hex label="HCH 1/2"><UnitToken type="HCH" {...ART.carthage} blocks={1} maxBlocks={2} facing="right" /></Hex>
      </Row>

      <Row title="Facing left">
        {TYPES.map((t, k) => (
          <Hex key={t} label={`${t} (${ARMY_LABEL[ARMY_NAMES[k % 3]]})`}>
            <UnitToken type={t} {...ART[ARMY_NAMES[k % 3]]} blocks={MAX[t]} maxBlocks={MAX[t]} facing="left" />
          </Hex>
        ))}
      </Row>

      <Row title="Leaders, Sacred Band, dimmed">
        {ARMY_NAMES.map((fac) => (
          <Hex key={`a${fac}`} label={`${ARMY_LABEL[fac]} leader attached`}>
            <UnitToken type={fac === 'syracuse' ? 'HI' : fac === 'rome' ? 'MI' : 'MC'} {...ART[fac]} blocks={fac === 'carthage' ? 3 : 4} maxBlocks={fac === 'carthage' ? 3 : 4} facing="right" />
            <g transform={`translate(${LEADER_ATTACH_OFFSET.x} ${LEADER_ATTACH_OFFSET.y})`}>
              <LeaderToken {...ART[fac]} facing="right" attached name="Hannibal" />
            </g>
          </Hex>
        ))}
        {ARMY_NAMES.map((fac) => (
          <Hex key={`l${fac}`} label={`${ARMY_LABEL[fac]} leader alone`}>
            <LeaderToken {...ART[fac]} facing={fac === 'carthage' ? 'left' : 'right'} attached={false} name={fac === 'rome' ? 'Scipio' : fac === 'carthage' ? 'Hannibal' : 'Timoleon'} showName />
          </Hex>
        ))}
        <Hex label="Sacred Band (HI)">
          <UnitToken type="HI" {...ART.carthage} blocks={4} maxBlocks={4} facing="right" elite="carthSacredBand" />
        </Hex>
        <Hex label="Sacred Band 2/4, left">
          <UnitToken type="HI" {...ART.carthage} blocks={2} maxBlocks={4} facing="left" elite="carthSacredBand" />
        </Hex>
        <Hex label="Dimmed (acted)">
          <UnitToken type="HI" {...ART.rome} blocks={4} maxBlocks={4} facing="right" dimmed />
        </Hex>
        <Hex label="Dimmed MC">
          <UnitToken type="MC" {...ART.syracuse} blocks={3} maxBlocks={3} facing="right" dimmed />
        </Hex>
      </Row>

      <Row title="Unit icons (UnitIcon, size 64 and 32)">
        {ARMY_NAMES.map((fac) => (
          <div key={fac} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, width: '100%' }}>
            {TYPES.map((t) => (
              <div key={t} style={{ background: '#2a2016', borderRadius: 8, padding: 4, textAlign: 'center' }}>
                <svg width={72} height={72} viewBox="-36 -36 72 72" style={{ display: 'block' }}>
                  <circle r={34} fill="#f1e4c4" />
                  <UnitIcon type={t} {...ART[fac]} size={64} />
                </svg>
                <svg width={36} height={36} viewBox="-18 -18 36 36" style={{ display: 'block', margin: '2px auto 0' }}>
                  <UnitIcon type={t} {...ART[fac]} size={32} />
                </svg>
                <div style={{ color: '#f1e4c4', font: '700 11px Cinzel, serif' }}>{t}</div>
              </div>
            ))}
          </div>
        ))}
      </Row>
    </div>
  );
}
