// Dev gallery for the battlefield art: every scenario board, a large normal + flipped board,
// close-ups of the sea coasts and ramparts, the Expansion #2 terrain and objective markers, and the terrain legend.
// URL options (hash query): ?s=006 (large board), ?units=1 (mock blocks), ?only=large|grid|legend|samples|exp2.
import { useEffect, useMemo, useState } from 'react';
import { UnitToken } from '../art';
import { rampartMask, type TerrainSetup } from '../engine/setup';
import { COLS, ROWS, type ArmyLook, type Blocks, type ObjectiveDef, type ObjectiveState, type Side, type UnitType } from '../engine/types';
import { BOARD_H, BOARD_W, hexCenter, isOnBoard } from '../ui/geometry';
import { BoardArt, ObjectiveMarkers, TerrainIcon, terrainArtOf, terrainName, type PaintTerrain } from '../ui/terrain';

/** A terrain entry: the scenario file format, plus the Expansion #2 `ditch` and `art` (until the engine has them). */
type TerrainEntry = Omit<TerrainSetup, 't'> & { t: PaintTerrain; art?: string };

interface ScenarioJson {
  id: string;
  name: string;
  year?: string;
  top: { army: string };
  bottom: { army: string };
  rules?: string[];
  terrain: TerrainEntry[];
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

const range = (r: number, c0: number, c1: number, e: Omit<TerrainEntry, 'r' | 'c'>): TerrainEntry[] =>
  Array.from({ length: c1 - c0 + 1 }, (_, k) => ({ r, c: c0 + k, ...e }));

/** Ditches: 212's ditch row in front of a rampart line, a zigzag running down from the top edge, a junction, a lone hex. */
const DITCHES: ScenarioJson = {
  id: 'D',
  name: 'Ditch sampler',
  top: { army: 'Slave' },
  bottom: { army: 'Roman' },
  terrain: [
    ...range(4, 4, 12, { t: 'ditch' }),
    ...range(5, 3, 11, { t: 'rampart', faces: 'top' }),
    { r: 0, c: 1, t: 'ditch' },
    { r: 1, c: 1, t: 'ditch' },
    { r: 2, c: 1, t: 'ditch' },
    { r: 3, c: 1, t: 'ditch' },
    { r: 1, c: 5, t: 'ditch' },
    { r: 1, c: 6, t: 'ditch' },
    { r: 1, c: 7, t: 'ditch' },
    { r: 2, c: 6, t: 'ditch' },
    { r: 7, c: 8, t: 'ditch' },
    { r: 2, c: 9, t: 'hill' },
    { r: 7, c: 2, t: 'camp' },
  ],
  units: [
    { side: 'top', type: 'WA', r: 4, c: 6 },
    { side: 'bottom', type: 'MI', r: 5, c: 7 },
  ],
};

/** A coast played as a ford (217): the sea along the bottom edge is a fordable river in the rules. */
const COAST_FORD: ScenarioJson = {
  id: 'F',
  name: 'Coastal ford sampler',
  top: { army: 'Briton' },
  bottom: { army: 'Roman' },
  terrain: [
    ...range(8, 1, 11, { t: 'sea', ford: true }),
    { r: 5, c: 4, t: 'river', ford: false },
    { r: 6, c: 4, t: 'river', ford: false },
    { r: 7, c: 4, t: 'river', ford: true },
    { r: 3, c: 2, t: 'hill' },
    { r: 3, c: 3, t: 'hill' },
    { r: 3, c: 8, t: 'hill' },
    { r: 0, c: 12, t: 'sea' },
    { r: 1, c: 11, t: 'sea' },
    { r: 2, c: 12, t: 'sea' },
  ],
  units: [
    { side: 'bottom', type: 'HI', r: 8, c: 6 },
    { side: 'bottom', type: 'MI', r: 8, c: 8 },
    { side: 'top', type: 'BCH', r: 7, c: 7 },
  ],
};

/** 223's hills, very steep (rule `veryHills`), with a rampart line. */
const STEEP_HILLS: ScenarioJson = {
  id: 'V',
  name: 'Very steep hills sampler',
  top: { army: 'Briton' },
  bottom: { army: 'Roman' },
  rules: ['veryHills'],
  terrain: [
    ...[[0, 9], [1, 1], [1, 4], [1, 7], [1, 10], [1, 11], [2, 3], [2, 6], [2, 8], [3, 0], [3, 2], [3, 3], [3, 6], [3, 9], [7, 7], [8, 8]].map(
      ([r, c]): TerrainEntry => ({ r, c, t: 'hill' }),
    ),
    { r: 2, c: 4, t: 'rampart', faces: 'bottom' },
    { r: 2, c: 5, t: 'rampart', faces: 'bottom' },
    { r: 3, c: 7, t: 'rampart', faces: 'bottom' },
    { r: 3, c: 8, t: 'rampart', faces: 'bottom' },
    { r: 5, c: 10, t: 'steep' },
    { r: 6, c: 2, t: 'forest' },
  ],
};
/** The same hills drawn as ordinary hills, for comparison. */
const PLAIN_HILLS: ScenarioJson = { ...STEEP_HILLS, id: 'V0', name: 'Very steep hills sampler, ordinary hills', rules: [] };

/** Objective markers: every kind on one board. */
const OBJECTIVES: ScenarioJson = {
  id: 'O',
  name: 'Objective sampler',
  top: { army: 'Gallic' },
  bottom: { army: 'Roman' },
  terrain: [
    { r: 0, c: 2, t: 'camp' },
    { r: 0, c: 3, t: 'camp' },
    { r: 1, c: 9, t: 'camp' },
    { r: 7, c: 9, t: 'camp' },
    { r: 3, c: 5, t: 'hill' },
    { r: 3, c: 6, t: 'hill' },
    { r: 4, c: 6, t: 'hill' },
    { r: 4, c: 1, t: 'hill' },
    { r: 6, c: 4, t: 'rampart', faces: 'top' },
  ],
  units: [
    { side: 'bottom', type: 'HI', r: 0, c: 2 },
    { side: 'top', type: 'WA', r: 7, c: 9 },
    { side: 'top', type: 'MI', r: 8, c: 2 },
    { side: 'bottom', type: 'MI', r: 3, c: 6 },
    { side: 'top', type: 'BCH', r: 4, c: 6 },
  ],
};
const hx = (r: number, c: number) => r * COLS + c;
const OBJECTIVE_DEFS: ObjectiveDef[] = [
  { kind: 'capture', side: 'bottom', hexes: [hx(0, 2), hx(0, 3), hx(1, 9)], when: 'turnStart', banners: [0, 0, 1], together: 0, remove: false, text: '' },
  { kind: 'capture', side: 'top', hexes: [hx(6, 4)], when: 'turnStart', banners: [1], together: 0, remove: true, text: '' },
  { kind: 'hold', side: 'top', hexes: [hx(7, 9), hx(8, 11)], max: 1, text: '' },
  { kind: 'majority', sides: ['top', 'bottom'], hexes: [hx(3, 5), hx(3, 6), hx(4, 6), hx(4, 1)], banners: 2, when: 'turnEnd', text: '' },
  { kind: 'exit', side: 'top', hexes: [0, 1, 2, 3, 4, 5].map((c) => hx(8, c)), units: 'foot', leadersScore: false, text: '' },
  { kind: 'exit', side: 'bottom', hexes: [hx(3, 0), hx(4, 12), hx(5, 11), hx(0, 12)], units: 'any', leadersScore: false, text: '' },
  { kind: 'sectionClear', side: 'bottom', text: '' },
];
const OBJECTIVE_STATE: ObjectiveState[] = [
  { taken: [hx(0, 3)], held: { top: 0, bottom: 0 }, sections: [] },
  { taken: [], held: { top: 0, bottom: 0 }, sections: [] },
  { taken: [], held: { top: 1, bottom: 0 }, sections: [] },
  { taken: [], held: { top: 0, bottom: 0 }, sections: [] },
  { taken: [], held: { top: 0, bottom: 0 }, sections: [] },
  { taken: [], held: { top: 0, bottom: 0 }, sections: [] },
  { taken: [], held: { top: 0, bottom: 2 }, sections: ['left', 'right'] },
];
/** The same board later in the battle: the hill majority held by the Romans, one section scored. */
const OBJECTIVE_STATE_HELD: ObjectiveState[] = OBJECTIVE_STATE.map((st, i) =>
  i === 3 ? { ...st, held: { top: 0, bottom: 2 } } : i === 6 ? { ...st, held: { top: 0, bottom: 1 }, sections: ['center'] } : st,
);
const OBJECTIVE_BLOCKS: Record<Side, Blocks> = { top: 'bar', bottom: 'rom' };
const OBJECTIVE_LOOKS: Record<Side, ArmyLook> = { top: 'gallic', bottom: 'marian' };

const SCENARIOS: ScenarioJson[] = [
  ...Object.values(modules)
    .map((m) => m.default)
    .sort((a, b) => a.id.localeCompare(b.id)),
  SAMPLER,
  COASTS,
  RAMPARTS,
  DITCHES,
  COAST_FORD,
  STEEP_HILLS,
  OBJECTIVES,
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

/** Close-ups of the Expansion #2 terrain, normal and flipped. */
const EXP2_SAMPLES: { label: string; s: ScenarioJson; hexes: [number, number][] }[] = [
  { label: 'Ditch: 212 row in front of the rampart, running off the right edge', s: DITCHES, hexes: [[4, 9], [4, 12], [5, 10], [3, 10]] },
  { label: 'Ditch: free end, junction, zigzag from the top edge', s: DITCHES, hexes: [[4, 4], [1, 5], [1, 7], [0, 1], [3, 1]] },
  { label: 'Ditch: a lone hex (and a camp)', s: DITCHES, hexes: [[7, 8], [7, 2], [6, 5]] },
  { label: 'Coastal ford (217): sea shallows with ford stones, a river running in', s: COAST_FORD, hexes: [[8, 3], [8, 6], [6, 4]] },
  { label: 'Coastal ford: the end of the coast, beside an ordinary sea', s: COAST_FORD, hexes: [[8, 9], [8, 12], [7, 11]] },
  { label: 'Very steep hills (223)', s: STEEP_HILLS, hexes: [[1, 1], [3, 3], [2, 6], [3, 0]] },
  { label: 'The same hills, ordinary (no veryHills)', s: PLAIN_HILLS, hexes: [[1, 1], [3, 3], [2, 6], [3, 0]] },
  { label: 'Very steep hills around a rampart, with an impassable steep hill', s: STEEP_HILLS, hexes: [[2, 8], [3, 9], [5, 10], [1, 10]] },
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

function boardArrays(s: ScenarioJson): { terrain: PaintTerrain[]; fords: boolean[]; rampart: number[]; art: (string | undefined)[] } {
  const terrain: PaintTerrain[] = [];
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
    // a sea played as a ford (217) is a fordable river to the engine
    const seaFord = t.t === 'sea' && !!t.ford;
    terrain[id] = seaFord ? 'river' : t.t;
    fords[id] = (t.t === 'river' || seaFord) && !!t.ford;
    rampart[id] = rampartMask(t as TerrainSetup);
  }
  return { terrain, fords, rampart, art: terrainArtOf(s) };
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

/** Real unit tokens (the objective board): Gallic blocks on top, Marian Romans below. */
function Tokens({ s, flipped }: { s: ScenarioJson; flipped: boolean }) {
  const us = [...(s.units ?? [])].sort((a, b) => hexCenter(a.r, a.c, flipped).y - hexCenter(b.r, b.c, flipped).y);
  return (
    <g>
      {us.map((u, i) => {
        const p = hexCenter(u.r, u.c, flipped);
        const type = u.type as UnitType;
        const max = type === 'BCH' || type === 'MC' ? 3 : 4;
        return (
          <g key={i} transform={`translate(${p.x} ${p.y})`}>
            <UnitToken type={type} look={OBJECTIVE_LOOKS[u.side]} blockColor={OBJECTIVE_BLOCKS[u.side]} blocks={max} maxBlocks={max} facing={(u.side === 'bottom') !== flipped ? 'right' : 'left'} />
          </g>
        );
      })}
    </g>
  );
}

function Board({
  s,
  flipped,
  width,
  units,
  viewBox,
  objectives,
  tokens,
}: {
  s: ScenarioJson;
  flipped: boolean;
  width: number | string;
  units: boolean;
  viewBox?: string;
  objectives?: { defs: ObjectiveDef[]; state: ObjectiveState[] };
  tokens?: boolean;
}) {
  const { terrain, fords, rampart, art } = useMemo(() => boardArrays(s), [s]);
  const topLabel = flipped ? s.bottom.army : s.top.army;
  const bottomLabel = flipped ? s.top.army : s.bottom.army;
  const placed = useMemo(() => (s.units ?? []).map((u) => ({ side: u.side, hex: u.r * COLS + u.c })), [s]);
  return (
    <svg viewBox={viewBox ?? `0 0 ${BOARD_W} ${BOARD_H}`} style={{ width, display: 'block', borderRadius: 4, boxShadow: '0 6px 22px rgba(0,0,0,0.45)' }}>
      <BoardArt
        terrain={terrain}
        fords={fords}
        rampart={rampart}
        art={art}
        steepHills={!!s.rules?.includes('veryHills')}
        flipped={flipped}
        topLabel={topLabel}
        bottomLabel={bottomLabel}
      />
      {objectives && (
        <ObjectiveMarkers objectives={objectives.defs} objState={objectives.state} flipped={flipped} blocks={OBJECTIVE_BLOCKS} units={placed} />
      )}
      {tokens ? <Tokens s={s} flipped={flipped} /> : units && <MockUnits s={s} flipped={flipped} />}
    </svg>
  );
}

const LEGEND: { t: PaintTerrain; ford?: boolean; art?: string }[] = [
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
  { t: 'ditch' },
  { t: 'river', ford: true, art: 'coast' },
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
  // the objective sampler shows its markers and real unit tokens
  const bigObjectives = big === OBJECTIVES ? { objectives: { defs: OBJECTIVE_DEFS, state: OBJECTIVE_STATE }, tokens: true } : {};

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
          {LEGEND.map(({ t, ford, art }) => (
            <div key={`${t}${ford ? 'f' : ''}${art ?? ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TerrainIcon t={t} ford={ford} art={art} size={iconSize} />
              <span style={{ fontSize: 15 }}>{terrainName(t, !!ford, false, art)}</span>
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
              <Board s={big} flipped={false} width="100%" units={units} {...bigObjectives} />
            </div>
            <div style={{ flex: '1 1 640px', maxWidth: 1200 }}>
              <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 4 }}>flipped</div>
              <Board s={big} flipped width="100%" units={units} {...bigObjectives} />
            </div>
          </div>
        </>
      )}

      {show('exp2') && (
        <>
          <div style={h2}>Expansion #2: ditch, coastal ford, very steep hills (normal | flipped)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(560px, 1fr))', gap: 18 }}>
            {EXP2_SAMPLES.map(({ label, s, hexes }) => (
              <div key={label}>
                <div style={{ fontSize: 15, marginBottom: 4 }}>{label}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[false, true].map((f) => (
                    <div key={String(f)} style={{ flex: '1 1 0' }}>
                      <Board s={s} flipped={f} width="100%" units={false} viewBox={cropBox(hexes, f)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={h2}>Objective markers (normal | flipped; below: later, majority and a section held by the Romans)</div>
          <div style={{ fontSize: 14, opacity: 0.75, margin: '-4px 0 8px' }}>
            Roman capture of the 3 Gallic camps (one taken), Gallic capture of the rampart, Gallic hold of 2 hexes (one held),
            hill majority (both sides), Gallic exit off the Roman baseline, Roman exits on the side edges, Roman section clear.
          </div>
          {[OBJECTIVE_STATE, OBJECTIVE_STATE_HELD].map((state, k) => (
            <div key={k} style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 18 }}>
              {[false, true].map((f) => (
                <div key={String(f)} style={{ flex: '1 1 640px', maxWidth: 1200 }}>
                  <Board s={OBJECTIVES} flipped={f} width="100%" units={false} tokens objectives={{ defs: OBJECTIVE_DEFS, state }} />
                </div>
              ))}
            </div>
          ))}
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
