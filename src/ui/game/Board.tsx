import { memo, useMemo } from 'react';
import { ALL_HEXES, leaderUnit, rowOf, colOf, steepSlopes, veryHills, type GameState, type HexId, type Leader, type Side, type Unit } from '../../engine';
import { BLOCK_COLORS, LEADER_ATTACH_OFFSET, LeaderToken, UnitToken } from '../../art';
import { BoardArt, ObjectiveMarkers, scenarioArt } from '../terrain';
import { BOARD_H, BOARD_W, HEX_R, hexCenterId, hexPoints } from '../geometry';
import type { Flash } from './controller';
import { commandBlocks, commandById, edgeBlocksOf } from './uiModel';

export type Highlight =
  | 'eligible' | 'selected' | 'mover' | 'attacker' | 'move' | 'moveNoBattle' | 'moveMustBattle'
  | 'targetClose' | 'targetRanged' | 'option' | 'focus'
  /** Asculum leader placement: an own unit to join (strong) or an empty hex to stand on alone (faint). */
  | 'placeUnit' | 'placeEmpty'
  /** Rolling Fire (210): the path picked so far, and the hexes it may run on to. */
  | 'rollPath' | 'rollNext';

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
  rollPath: { fill: 'rgba(255, 110, 20, 0.34)', stroke: '#ff8a2a', width: 3.2 },
  rollNext: { fill: 'rgba(255, 150, 50, 0.16)', stroke: 'rgba(255, 176, 92, 0.95)', dash: '6 4', width: 2.4 },
};

/**
 * Badge of a unit's separate command (210, §18.5): the command's initial on a disc of its colour, at the token's upper
 * left (the upper right is kept for an attached leader).
 */
function CommandBadge({ state, command, at = { x: -HEX_R * 0.5, y: -HEX_R * 0.6 }, scale = 1 }: {
  state: GameState;
  command: string;
  /** Where the badge sits, from the token's centre (a lone leader's token is drawn smaller than a unit's). */
  at?: { x: number; y: number };
  scale?: number;
}) {
  const c = commandById(state, command);
  if (!c) return null;
  const col = BLOCK_COLORS[commandBlocks(state, c)];
  // a pale command colour (Lentulus' grey) takes a dark letter
  const light = parseInt(col.edge.slice(1, 3), 16) + parseInt(col.edge.slice(3, 5), 16) + parseInt(col.edge.slice(5, 7), 16) > 450;
  return (
    <g className="command-badge" transform={`translate(${at.x}, ${at.y})${scale !== 1 ? ` scale(${scale})` : ''}`}>
      <circle r={7.4} fill={col.edge} stroke={col.edgeShade} strokeWidth={1.4} />
      <text y={3.4} textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight={700} fontSize={9.6} fill={light ? '#1d1a22' : '#fbf1d6'}>
        {c.name.charAt(0)}
      </text>
    </g>
  );
}

/**
 * Badge of an immobile unit (306, §18.11): a small anchor on a dark disc at the token's left, below the ordered flag and
 * clear of a camp's pennant and a command badge (upper left) and an attached leader (upper right).
 */
function ImmobileBadge() {
  return (
    <g className="immobile-badge" transform={`translate(${-HEX_R * 0.64}, ${HEX_R * 0.28})`}>
      <title>Immobile</title>
      <circle r={7.4} fill="#2a1d12" stroke="#e9c25a" strokeWidth={1.3} />
      <g fill="none" stroke="#fbf1d6" strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round">
        <circle cy={-3.6} r={1.5} />
        <path d="M0,-2.1V4.6M-2.6,-0.4H2.6M-4.2,1.5Q-3.8,4.7 0,4.7Q3.8,4.7 4.2,1.5" />
      </g>
    </g>
  );
}

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
            <UnitToken type={u.type} look={owner.look} blockColor={owner.blocks} edgeBlocks={edgeBlocksOf(state, u)} blocks={u.blocks} maxBlocks={u.maxBlocks} facing={facingFor(u.side, humanSide)} elite={u.elite} dimmed={p.doneIds.has(u.id)} />
            {u.command && <CommandBadge state={state} command={u.command} />}
            {u.immobile && <ImmobileBadge />}
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
            <LeaderToken look={owner.look} blockColor={owner.blocks} edgeBlocks={edgeBlocksOf(state, l)} facing={facingFor(l.side, humanSide)} attached={attached} name={l.name || 'Leader'} showName={!attached} />
            {/* a leader who belongs to a command (304) shows it like a unit; attached, only when it is not his unit's */}
            {l.command && (!u || u.command !== l.command) && (
              <CommandBadge state={state} command={l.command} at={attached ? { x: -11, y: -11 } : { x: -HEX_R * 0.42, y: -HEX_R * 0.5 }} scale={attached ? 0.75 : 1} />
            )}
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
  const hexArt = scenarioArt(state.scenarioId);
  const steepHills = veryHills(state);
  const slopes = steepSlopes(state);
  const art = useMemo(
    () => (
      <BoardArt
        terrain={state.terrain}
        fords={state.fords}
        rampart={state.rampart}
        art={hexArt}
        steepHills={steepHills}
        hillUnder={state.hillUnder}
        steepSlopes={slopes}
        flipped={flipped}
        topLabel={state.players[top].army}
        bottomLabel={state.players[bottom].army}
      />
    ),
    // terrain changes during play only by `setTerrain` (a camp captured, a rampart torn down), which replaces the
    // `terrain` and `rampart` arrays: their identity is enough. A removed camp on a hill (308) becomes 'hill' in `terrain`;
    // `hillUnder` (never changed during play) is in the key all the same, so the board always draws the hills under it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.scenarioId, state.terrain, state.rampart, state.hillUnder, hexArt, steepHills, slopes, flipped],
  );
  const { objectives, objState } = state.special;
  const units = state.units;
  const topBlocks = state.players.top.blocks;
  const bottomBlocks = state.players.bottom.blocks;
  // battle objectives (§18.4; also 010, 011, 114): redrawn when the state changes, not on every hover
  const markers = useMemo(
    () => <ObjectiveMarkers objectives={objectives} objState={objState} flipped={flipped} blocks={{ top: topBlocks, bottom: bottomBlocks }} units={units} />,
    [objectives, objState, flipped, topBlocks, bottomBlocks, units],
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
      {markers}
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
