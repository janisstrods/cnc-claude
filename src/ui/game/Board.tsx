import { memo, useMemo } from 'react';
import { ALL_HEXES, leaderUnit, rowOf, colOf, type GameState, type HexId, type Leader, type Side, type Unit } from '../../engine';
import { LEADER_ATTACH_OFFSET, LeaderToken, UnitToken } from '../../art';
import { BoardArt } from '../terrain';
import { BOARD_H, BOARD_W, HEX_R, hexCenterId, hexPoints } from '../geometry';
import type { Flash } from './controller';

export type Highlight =
  | 'eligible' | 'selected' | 'mover' | 'attacker' | 'move' | 'moveNoBattle' | 'moveMustBattle'
  | 'targetClose' | 'targetRanged' | 'option' | 'focus'
  /** Asculum leader placement: an own unit to join (strong) or an empty hex to stand on alone (faint). */
  | 'placeUnit' | 'placeEmpty';

export interface BoardProps {
  state: GameState;
  flipped: boolean;
  humanSide: Side;
  walking: Record<string, HexId>;
  highlights: Map<HexId, Highlight>;
  leaderHighlights: Map<string, Highlight>;
  badges: Map<HexId, string>;
  sectionShade: Set<HexId>;
  pathPreview: HexId[] | null;
  combat: { from: HexId; to: HexId } | null;
  flashes: Flash[];
  orderedIds: Set<string>;
  doneIds: Set<string>;
  onHexClick?: (h: HexId) => void;
  onHexHover?: (h: HexId | null) => void;
  onLeaderClick?: (id: string) => boolean; // return true if handled
}

const HL_STYLE: Record<Highlight, { fill: string; stroke: string; dash?: string; width?: number }> = {
  eligible: { fill: 'rgba(255, 236, 160, 0.10)', stroke: 'rgba(255, 226, 130, 0.85)', dash: '5 4', width: 2 },
  selected: { fill: 'rgba(255, 210, 80, 0.28)', stroke: '#ffd45a', width: 3.5 },
  mover: { fill: 'rgba(120, 200, 255, 0.10)', stroke: 'rgba(140, 210, 255, 0.95)', dash: '6 4', width: 2.2 },
  attacker: { fill: 'rgba(255, 120, 90, 0.10)', stroke: 'rgba(255, 140, 100, 0.95)', dash: '6 4', width: 2.2 },
  move: { fill: 'rgba(110, 220, 120, 0.26)', stroke: 'rgba(150, 255, 150, 0.85)', width: 1.6 },
  moveNoBattle: { fill: 'rgba(240, 190, 80, 0.24)', stroke: 'rgba(255, 210, 110, 0.8)', width: 1.4 },
  moveMustBattle: { fill: 'rgba(255, 110, 60, 0.26)', stroke: 'rgba(255, 140, 90, 0.9)', width: 1.6 },
  targetClose: { fill: 'rgba(230, 40, 30, 0.30)', stroke: '#ff5a46', width: 3 },
  targetRanged: { fill: 'rgba(255, 150, 30, 0.28)', stroke: '#ffae3c', width: 3 },
  option: { fill: 'rgba(170, 120, 255, 0.28)', stroke: '#c9a6ff', width: 2.6 },
  focus: { fill: 'rgba(255,255,255,0.12)', stroke: '#ffffff', width: 2.5 },
  placeUnit: { fill: 'rgba(255, 210, 80, 0.22)', stroke: '#ffd45a', width: 2.8 },
  placeEmpty: { fill: 'rgba(200, 175, 255, 0.10)', stroke: 'rgba(215, 192, 255, 0.6)', width: 1.4 },
};

function facingFor(side: Side, humanSide: Side): 'left' | 'right' {
  return side === humanSide ? 'right' : 'left';
}

const UnitLayer = memo(function UnitLayer(p: {
  units: Unit[];
  leaders: Leader[];
  state: GameState;
  flipped: boolean;
  humanSide: Side;
  walking: Record<string, HexId>;
  orderedIds: Set<string>;
  doneIds: Set<string>;
  leaderHighlights: Map<string, Highlight>;
  onLeaderClick?: (id: string) => boolean;
}) {
  const { state, flipped, humanSide, walking } = p;
  const pos = (id: string, hex: HexId) => hexCenterId(walking[id] ?? hex, flipped);
  // draw units sorted by screen y so lower units overlap upper ones
  const units = [...p.units].filter((u) => u.hex >= 0).sort((a, b) => pos(a.id, a.hex).y - pos(b.id, b.hex).y);
  return (
    <g className="units-layer">
      {units.map((u) => {
        const { x, y } = pos(u.id, u.hex);
        const owner = state.players[u.side];
        const ordered = p.orderedIds.has(u.id);
        return (
          <g key={u.id} className={`unit-g ${walking[u.id] !== undefined ? 'walking' : ''}`} style={{ transform: `translate(${x}px, ${y}px)` }}>
            {ordered && <circle r={HEX_R * 0.86} className="ordered-ring" />}
            <UnitToken type={u.type} look={owner.look} blockColor={owner.blocks} blocks={u.blocks} maxBlocks={u.maxBlocks} facing={facingFor(u.side, humanSide)} elite={u.elite} dimmed={p.doneIds.has(u.id)} />
            {ordered && (
              <g transform={`translate(${-HEX_R * 0.72}, ${-HEX_R * 0.08})`} className="ordered-flag">
                <path d="M0 0 L0 -14 L11 -10 L0 -6" fill="#f1c84b" stroke="#3b2a0a" strokeWidth={1} />
                <line x1={0} y1={0} x2={0} y2={-15} stroke="#3b2a0a" strokeWidth={1.4} />
              </g>
            )}
          </g>
        );
      })}
      {p.leaders.filter((l) => l.hex >= 0).map((l) => {
        const u = leaderUnit(state, l);
        const hex = walking[l.id] ?? (u ? walking[u.id] ?? l.hex : l.hex);
        const { x, y } = hexCenterId(hex, flipped);
        const owner = state.players[l.side];
        const attached = !!u;
        const hl = p.leaderHighlights.get(l.id);
        const ox = attached ? LEADER_ATTACH_OFFSET.x : 0;
        const oy = attached ? LEADER_ATTACH_OFFSET.y : 0;
        return (
          <g
            key={l.id}
            className={`leader-g ${hl ? 'clickable' : ''}`}
            style={{ transform: `translate(${x + ox}px, ${y + oy}px)` }}
            onClick={(e) => {
              if (p.onLeaderClick?.(l.id)) e.stopPropagation();
            }}
          >
            {hl && <circle r={attached ? 15 : 30} fill={HL_STYLE[hl].fill} stroke={HL_STYLE[hl].stroke} strokeWidth={2.5} strokeDasharray={HL_STYLE[hl].dash} />}
            {p.orderedIds.has(l.id) && <circle r={attached ? 16 : 31} className="ordered-ring" />}
            <LeaderToken look={owner.look} blockColor={owner.blocks} facing={facingFor(l.side, humanSide)} attached={attached} name={l.name || 'Leader'} showName={!attached} />
          </g>
        );
      })}
    </g>
  );
});

export function Board(p: BoardProps) {
  const { state, flipped } = p;
  const top = flipped ? 'bottom' : 'top';
  const bottom = flipped ? 'top' : 'bottom';
  const art = useMemo(
    () => (
      <BoardArt
        terrain={state.terrain}
        fords={state.fords}
        rampart={state.rampart}
        flipped={flipped}
        topLabel={state.players[top].army}
        bottomLabel={state.players[bottom].army}
      />
    ),
    // terrain never changes during a game
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.scenarioId, flipped],
  );
  const hexes = ALL_HEXES;
  const comb = p.combat ? { a: hexCenterId(p.combat.from, flipped), b: hexCenterId(p.combat.to, flipped) } : null;
  return (
    <svg className="board-svg" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#ffdf8a" />
        </marker>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {art}
      <g className="shade-layer">
        {[...p.sectionShade].map((h) => {
          const { x, y } = hexCenterId(h, flipped);
          return <polygon key={h} points={hexPoints(x, y, HEX_R - 1)} className="section-shade" />;
        })}
      </g>
      <g className="hl-layer">
        {[...p.highlights].map(([h, kind]) => {
          const { x, y } = hexCenterId(h, flipped);
          const st = HL_STYLE[kind];
          return (
            <polygon
              key={h}
              points={hexPoints(x, y, HEX_R - 3)}
              fill={st.fill}
              stroke={st.stroke}
              strokeWidth={st.width ?? 2}
              strokeDasharray={st.dash}
              className={`hl hl-${kind}`}
            />
          );
        })}
      </g>
      {p.pathPreview && p.pathPreview.length > 1 && (
        <polyline
          className="path-preview"
          points={p.pathPreview.filter((h) => h >= 0).map((h) => { const c = hexCenterId(h, flipped); return `${c.x},${c.y}`; }).join(' ')}
          markerEnd="url(#arrowhead)"
        />
      )}
      <UnitLayer
        units={state.units}
        leaders={state.leaders}
        state={state}
        flipped={flipped}
        humanSide={p.humanSide}
        walking={p.walking}
        orderedIds={p.orderedIds}
        doneIds={p.doneIds}
        leaderHighlights={p.leaderHighlights}
        onLeaderClick={p.onLeaderClick}
      />
      {comb && (
        <g className="combat-arrow">
          <line x1={comb.a.x} y1={comb.a.y} x2={comb.b.x} y2={comb.b.y} />
          <circle cx={comb.b.x} cy={comb.b.y} r={HEX_R * 0.8} />
        </g>
      )}
      <g className="badge-layer">
        {[...p.badges].map(([h, text]) => {
          const { x, y } = hexCenterId(h, flipped);
          return (
            <g key={h} transform={`translate(${x}, ${y - HEX_R * 0.62})`} className="badge">
              <rect x={-24} y={-11} width={48} height={20} rx={10} />
              <text y={4} textAnchor="middle">{text}</text>
            </g>
          );
        })}
      </g>
      <g className="hit-layer" onMouseLeave={() => p.onHexHover?.(null)}>
        {hexes.map((h) => {
          const { x, y } = hexCenterId(h, flipped);
          return (
            <polygon
              key={h}
              points={hexPoints(x, y, HEX_R)}
              className="hit-hex"
              data-hex={`${rowOf(h)},${colOf(h)}`}
              onClick={() => p.onHexClick?.(h)}
              onMouseEnter={() => p.onHexHover?.(h)}
            />
          );
        })}
      </g>
      <g className="leader-click-layer">
        {state.leaders.filter((l) => l.hex >= 0 && p.leaderHighlights.has(l.id)).map((l) => {
          const attached = !!leaderUnit(state, l);
          const { x, y } = hexCenterId(l.hex, flipped);
          const cx = x + (attached ? LEADER_ATTACH_OFFSET.x : 0);
          const cy = y + (attached ? LEADER_ATTACH_OFFSET.y : 0);
          return (
            <g key={l.id}>
              <clipPath id={`lc-${l.id}`}>
                <polygon points={hexPoints(x, y, HEX_R)} />
              </clipPath>
            <circle
              cx={cx}
              cy={cy}
              r={attached ? 15 : 26}
              clipPath={`url(#lc-${l.id})`}
              className="leader-hit"
              onClick={(e) => {
                if (p.onLeaderClick?.(l.id)) e.stopPropagation();
                else p.onHexClick?.(l.hex);
              }}
              onMouseEnter={() => p.onHexHover?.(l.hex)}
            />
            </g>
          );
        })}
      </g>
      <g className="flash-layer">
        {p.flashes.map((f) => {
          const { x, y } = hexCenterId(f.hex, flipped);
          return (
            <text key={f.id} x={x} y={y - 10} textAnchor="middle" className={`flash flash-${f.kind}`}>
              {f.text}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
