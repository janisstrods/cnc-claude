// Dev gallery for the battlefield art: every scenario board, a large normal + flipped board,
// close-ups of the sea coasts and ramparts, and the terrain legend. URL options (hash query):
// ?s=006 (large board), ?units=1 (mock blocks), ?only=large|grid|legend|samples.
import { useEffect, useMemo, useState } from 'react';
import { rampartMask, type TerrainSetup } from '../engine/setup';
import { COLS, ROWS, type TerrainType } from '../engine/types';
import { BOARD_H, BOARD_W, hexCenter, isOnBoard } from '../ui/geometry';
import { BoardArt, TerrainIcon, terrainName } from '../ui/terrain';

interface ScenarioJson {
  id: string;
  name: string;
  year?: string;
  top: { army: string };
  bottom: { army: string };
  terrain: TerrainSetup[];
  units?: { side: 'top' | 'bottom'; type: string; r: number; c: number }[];
}

const modules = import.meta.glob('../scenarios/data/*.json', { eager: true }) as Record<string, { default: ScenarioJson }>;
/** Synthetic board exercising every terrain type and the tricky joins (river junction, river
 * into a lake, dead-end stream, merged marsh/broken/steep clusters, sea, rampart edges). */
const SAMPLER: ScenarioJson = {
  id: 'T',
  name: 'Terrain sampler',
  top: { army: 'Top Army' },
  bottom: { army: 'Bottom Army' },
  terrain: [
    { r: 0, c: 1, t: 'river', ford: false },
    { r: 1, c: 1, t: 'river', ford: true },
    { r: 2, c: 1, t: 'river', ford: false },
    { r: 3, c: 1, t: 'river', ford: false },
    { r: 3, c: 2, t: 'river', ford: true },
    { r: 3, c: 3, t: 'river', ford: false },
    { r: 4, c: 1, t: 'river', ford: false },
    { r: 5, c: 1, t: 'lake' },
    { r: 5, c: 0, t: 'lake' },
    { r: 6, c: 1, t: 'lake' },
    { r: 0, c: 4, t: 'hill' },
    { r: 0, c: 5, t: 'hill' },
    { r: 1, c: 5, t: 'hill' },
    { r: 1, c: 7, t: 'forest' },
    { r: 1, c: 8, t: 'forest' },
    { r: 2, c: 8, t: 'forest' },
    { r: 1, c: 10, t: 'camp' },
    { r: 3, c: 6, t: 'marsh' },
    { r: 3, c: 7, t: 'marsh' },
    { r: 4, c: 7, t: 'marsh' },
    { r: 4, c: 10, t: 'steep' },
    { r: 4, c: 11, t: 'steep' },
    { r: 5, c: 11, t: 'steep' },
    { r: 6, c: 4, t: 'broken' },
    { r: 6, c: 5, t: 'broken' },
    { r: 7, c: 5, t: 'broken' },
    { r: 6, c: 8, t: 'hill' },
    { r: 7, c: 8, t: 'forest' },
    { r: 7, c: 9, t: 'river', ford: true },
    { r: 8, c: 10, t: 'river', ford: false },
    { r: 6, c: 10, t: 'river', ford: false },
    { r: 6, c: 9, t: 'camp' },
    { r: 0, c: 12, t: 'sea' },
    { r: 1, c: 11, t: 'sea' },
    { r: 2, c: 12, t: 'sea' },
    { r: 7, c: 2, t: 'rampart', faces: 'top' },
    { r: 7, c: 3, t: 'rampart', faces: 'top' },
    { r: 7, c: 4, t: 'rampart', edges: ['NW', 'NE', 'E'] },
    { r: 2, c: 3, t: 'rampart', faces: 'bottom' },
    { r: 2, c: 4, t: 'rampart', edges: ['W', 'SW', 'SE'] },
  ],
};

/** Sea coasts: a straight edge, a corner, and a river running into the sea. */
const COASTS: ScenarioJson = {
  id: 'C',
  name: 'Coast sampler',
  top: { army: 'Top Army' },
  bottom: { army: 'Bottom Army' },
  terrain: [
    // straight coast along the right edge
    { r: 0, c: 12, t: 'sea' },
    { r: 1, c: 11, t: 'sea' },
    { r: 2, c: 12, t: 'sea' },
    { r: 3, c: 11, t: 'sea' },
    { r: 4, c: 12, t: 'sea' },
    // a bay in the lower-left corner
    { r: 7, c: 0, t: 'sea' },
    { r: 8, c: 0, t: 'sea' },
    { r: 8, c: 1, t: 'sea' },
    // a river (no ford) from a lake into the sea on the left edge, and a ford river into the straight coast
    { r: 2, c: 0, t: 'sea' },
    { r: 3, c: 0, t: 'sea' },
    { r: 4, c: 0, t: 'sea' },
    { r: 3, c: 1, t: 'river', ford: false },
    { r: 3, c: 2, t: 'river', ford: false },
    { r: 3, c: 3, t: 'river', ford: false },
    { r: 3, c: 4, t: 'river', ford: false },
    { r: 4, c: 5, t: 'river', ford: false },
    { r: 5, c: 5, t: 'river', ford: false },
    { r: 3, c: 10, t: 'river', ford: true },
    { r: 3, c: 9, t: 'river', ford: false },
    { r: 4, c: 9, t: 'river', ford: false },
    { r: 5, c: 9, t: 'river', ford: false },
    { r: 6, c: 9, t: 'river', ford: false },
    { r: 7, c: 9, t: 'river', ford: false },
    { r: 8, c: 9, t: 'river', ford: false },
    { r: 6, c: 6, t: 'lake' },
  ],
};

/** Ramparts: facing the top, facing the bottom, a diagonal W+SW wall and a free-standing 3-edge corner. */
const RAMPARTS: ScenarioJson = {
  id: 'R',
  name: 'Rampart sampler',
  top: { army: 'Top Army' },
  bottom: { army: 'Bottom Army' },
  terrain: [
    { r: 6, c: 2, t: 'rampart', faces: 'top' },
    { r: 6, c: 3, t: 'rampart', faces: 'top' },
    { r: 6, c: 4, t: 'camp' },
    { r: 2, c: 2, t: 'rampart', faces: 'bottom' },
    { r: 2, c: 3, t: 'rampart', faces: 'bottom' },
    { r: 2, c: 4, t: 'rampart', faces: 'bottom' },
    { r: 4, c: 7, t: 'rampart', edges: ['W', 'SW'] },
    { r: 5, c: 7, t: 'rampart', edges: ['W', 'SW'] },
    { r: 2, c: 10, t: 'rampart', edges: ['NW', 'NE', 'E'] },
    { r: 0, c: 8, t: 'rampart', edges: ['W', 'SW'] },
    { r: 6, c: 10, t: 'rampart', faces: 'top' },
    { r: 6, c: 11, t: 'sea' },
    { r: 7, c: 11, t: 'sea' },
    { r: 8, c: 12, t: 'sea' },
    { r: 5, c: 12, t: 'sea' },
    { r: 6, c: 12, t: 'sea' },
    { r: 7, c: 12, t: 'sea' },
  ],
};

const SCENARIOS: ScenarioJson[] = [
  ...Object.values(modules)
    .map((m) => m.default)
    .sort((a, b) => a.id.localeCompare(b.id)),
  SAMPLER,
  COASTS,
  RAMPARTS,
];

/** Close-ups shown normal and flipped: a sampler board and the hexes (r, c) to frame. */
const SAMPLES: { label: string; s: ScenarioJson; hexes: [number, number][] }[] = [
  { label: 'Sea: straight coast along the edge', s: COASTS, hexes: [[0, 12], [2, 12], [4, 12], [2, 10]] },
  { label: 'Sea: corner bay', s: COASTS, hexes: [[7, 0], [8, 1], [6, 1]] },
  { label: 'Sea: river mouth (and the lake it drains, for comparison)', s: COASTS, hexes: [[2, 0], [4, 0], [6, 6]] },
  { label: 'Sea: ford river into the coast', s: COASTS, hexes: [[3, 9], [3, 11], [2, 10]] },
  { label: 'Rampart: faces top (beside a camp)', s: RAMPARTS, hexes: [[6, 2], [6, 4], [5, 3]] },
  { label: 'Rampart: faces bottom', s: RAMPARTS, hexes: [[2, 2], [2, 4], [3, 3]] },
  { label: 'Rampart: diagonal W+SW', s: RAMPARTS, hexes: [[4, 7], [5, 7], [4, 6]] },
  { label: 'Rampart: 3-edge corner (NW+NE+E)', s: RAMPARTS, hexes: [[2, 10], [1, 10], [2, 11]] },
  { label: 'Rampart: W+SW from the board edge', s: RAMPARTS, hexes: [[0, 8], [1, 8], [0, 7]] },
  { label: 'Rampart: faces top, next to the sea', s: RAMPARTS, hexes: [[6, 10], [6, 11], [5, 10]] },
];

/** viewBox framing hexes (with some margin) on a normal or flipped board. */
function cropBox(hexes: [number, number][], flipped: boolean): string {
  const ps = hexes.map(([r, c]) => hexCenter(r, c, flipped));
  const pad = 70;
  const x0 = Math.max(0, Math.min(...ps.map((p) => p.x)) - pad);
  const y0 = Math.max(0, Math.min(...ps.map((p) => p.y)) - pad);
  const x1 = Math.min(BOARD_W, Math.max(...ps.map((p) => p.x)) + pad);
  const y1 = Math.min(BOARD_H, Math.max(...ps.map((p) => p.y)) + pad);
  return `${x0.toFixed(1)} ${y0.toFixed(1)} ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}`;
}

function boardArrays(s: ScenarioJson): { terrain: TerrainType[]; fords: boolean[]; rampart: number[] } {
  const terrain: TerrainType[] = [];
  const fords: boolean[] = [];
  const rampart: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      terrain.push(isOnBoard(r, c) ? 'plain' : 'void');
      fords.push(false);
      rampart.push(0);
    }
  }
  for (const t of s.terrain) {
    const id = t.r * COLS + t.c;
    terrain[id] = t.t;
    fords[id] = t.t === 'river' && !!t.ford;
    rampart[id] = rampartMask(t);
  }
  return { terrain, fords, rampart };
}

function useHashParams(): URLSearchParams {
  const [h, setH] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setH(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const q = h.indexOf('?');
  return new URLSearchParams(q >= 0 ? h.slice(q + 1) : '');
}

function MockUnits({ s, flipped }: { s: ScenarioJson; flipped: boolean }) {
  return (
    <g>
      {(s.units ?? []).map((u, i) => {
        const p = hexCenter(u.r, u.c, flipped);
        const top = u.side === 'top';
        return (
          <g key={i} transform={`translate(${p.x} ${p.y})`}>
            <rect x={-27} y={-27} width={58} height={58} rx={6} fill="rgba(0,0,0,0.35)" />
            <rect x={-30} y={-30} width={58} height={58} rx={6} fill={top ? '#b4563c' : '#6f8fb8'} stroke="#2a1d10" strokeWidth={2} />
            <rect x={-24} y={-24} width={46} height={46} rx={3} fill={top ? '#e9c8a8' : '#d6e2ef'} />
            <text x={-1} y={0} textAnchor="middle" dominantBaseline="central" style={{ font: '700 18px Cinzel, serif' }} fill="#2a1d10">
              {u.type}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Board({ s, flipped, width, units, viewBox }: { s: ScenarioJson; flipped: boolean; width: number | string; units: boolean; viewBox?: string }) {
  const { terrain, fords, rampart } = useMemo(() => boardArrays(s), [s]);
  const topLabel = flipped ? s.bottom.army : s.top.army;
  const bottomLabel = flipped ? s.top.army : s.bottom.army;
  return (
    <svg viewBox={viewBox ?? `0 0 ${BOARD_W} ${BOARD_H}`} style={{ width, display: 'block', borderRadius: 4, boxShadow: '0 6px 22px rgba(0,0,0,0.45)' }}>
      <BoardArt terrain={terrain} fords={fords} rampart={rampart} flipped={flipped} topLabel={topLabel} bottomLabel={bottomLabel} />
      {units && <MockUnits s={s} flipped={flipped} />}
    </svg>
  );
}

const LEGEND: { t: TerrainType; ford?: boolean }[] = [
  { t: 'plain' },
  { t: 'hill' },
  { t: 'forest' },
  { t: 'river' },
  { t: 'river', ford: true },
  { t: 'lake' },
  { t: 'sea' },
  { t: 'steep' },
  { t: 'camp' },
  { t: 'rampart' },
  { t: 'broken' },
  { t: 'marsh' },
];

const page: React.CSSProperties = {
  background: '#1f1a14',
  color: '#eadfc4',
  minHeight: '100vh',
  padding: '18px 22px 40px',
  fontFamily: '"EB Garamond", serif',
  boxSizing: 'border-box',
};
const h2: React.CSSProperties = { fontFamily: 'Cinzel, serif', fontWeight: 700, letterSpacing: 2, fontSize: 18, margin: '18px 0 10px' };
const btn = (on: boolean): React.CSSProperties => ({
  fontFamily: 'Cinzel, serif',
  fontSize: 12,
  padding: '4px 9px',
  marginRight: 6,
  marginBottom: 6,
  borderRadius: 4,
  border: '1px solid #6b5535',
  background: on ? '#b8955a' : '#2c241a',
  color: on ? '#1d140c' : '#eadfc4',
  cursor: 'pointer',
});

export default function TerrainGallery() {
  const params = useHashParams();
  const [sel, setSel] = useState(params.get('s') ?? '002');
  const [units, setUnits] = useState(params.get('units') === '1');
  const only = params.get('only');
  const iconSize = Number(params.get('icon') ?? 44) || 44;
  const big = SCENARIOS.find((s) => s.id === sel) ?? SCENARIOS[0];
  const show = (k: string) => !only || only === k;

  return (
    <div style={page}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ ...h2, margin: 0, fontSize: 22 }}>Terrain Gallery</div>
        <div>
          {SCENARIOS.map((s) => (
            <button key={s.id} style={btn(s.id === sel)} onClick={() => setSel(s.id)}>
              {s.id}
            </button>
          ))}
          <button style={btn(units)} onClick={() => setUnits((u) => !u)}>
            mock units
          </button>
        </div>
      </div>

      {show('legend') && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, margin: '12px 0 4px' }}>
          {LEGEND.map(({ t, ford }) => (
            <div key={`${t}${ford ? 'f' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TerrainIcon t={t} ford={ford} size={iconSize} />
              <span style={{ fontSize: 15 }}>{terrainName(t, !!ford)}</span>
            </div>
          ))}
        </div>
      )}

      {show('large') && (
        <>
          <div style={h2}>
            {big.id} {big.name} {big.year ? `(${big.year})` : ''}
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 640px', maxWidth: 1200 }}>
              <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 4 }}>normal</div>
              <Board s={big} flipped={false} width="100%" units={units} />
            </div>
            <div style={{ flex: '1 1 640px', maxWidth: 1200 }}>
              <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 4 }}>flipped</div>
              <Board s={big} flipped width="100%" units={units} />
            </div>
          </div>
        </>
      )}

      {show('samples') && (
        <>
          <div style={h2}>Sea coasts and ramparts (normal | flipped)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(560px, 1fr))', gap: 18 }}>
            {SAMPLES.map(({ label, s, hexes }) => (
              <div key={label}>
                <div style={{ fontSize: 15, marginBottom: 4 }}>{label}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[false, true].map((f) => (
                    <div key={String(f)} style={{ flex: '1 1 0' }}>
                      <Board s={s} flipped={f} width="100%" units={units} viewBox={cropBox(hexes, f)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {show('grid') && (
        <>
          <div style={h2}>All scenarios</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 18 }}>
            {SCENARIOS.map((s) => (
              <div key={s.id} onClick={() => setSel(s.id)} style={{ cursor: 'pointer' }}>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, marginBottom: 4 }}>
                  {s.id} · {s.name}
                </div>
                <Board s={s} flipped={false} width="100%" units={units} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
