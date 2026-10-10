// Dev gallery for the battle histories: #/gallery/history lists the battles; #/gallery/history/<id> shows one battle's
// game board (for orientation), all three slides with every map phase, and the last phase flipped, on one page for
// screenshots (scripts/shot.sh); #/gallery/history/maps[/<first>-<last>] is a contact sheet of every map phase.
import { useEffect, useMemo, useState } from 'react';
import { createGame } from '../engine';
import { SCENARIOS, type ScenarioInfo } from '../scenarios';
import { hasHistory, loadHistory, type BattleHistory } from '../history';
import { validateHistory } from '../history/validate';
import { UnitToken } from '../art';
import { BoardArt } from '../ui/terrain';
import { BOARD_H, BOARD_W, hexCenterId } from '../ui/geometry';
import { MapSlide, OutcomeSlide, RoadSlide, SLIDE_TITLES, sideColors } from '../ui/history/HistoryDialog';
import { BattleMap } from '../ui/history/BattleMap';
import '../ui/history/history.css';

function GameBoard({ sc }: { sc: ScenarioInfo }) {
  const s = useMemo(() => createGame(sc.setup, 1), [sc]);
  return (
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} style={{ width: 460, display: 'block' }}>
      <BoardArt terrain={s.terrain} fords={s.fords} rampart={s.rampart} flipped={false} topLabel={s.players.top.army} bottomLabel={s.players.bottom.army} />
      {s.units.map((u) => {
        const { x, y } = hexCenterId(u.hex, false);
        return (
          <g key={u.id} transform={`translate(${x}, ${y})`}>
            <UnitToken type={u.type} look={s.players[u.side].look} blockColor={s.players[u.side].blocks} blocks={u.blocks} maxBlocks={u.maxBlocks} facing={u.side === 'bottom' ? 'right' : 'left'} elite={u.elite} />
          </g>
        );
      })}
    </svg>
  );
}

const page: React.CSSProperties = { minHeight: '100vh', background: '#2a1a10', padding: 20, boxSizing: 'border-box', fontFamily: 'var(--kit-font-body)' };
const sheet: React.CSSProperties = { width: 900, margin: '0 auto 16px', padding: '18px 22px', borderRadius: 10, background: '#f0e3c2', color: '#2b1d12' };
const h2: React.CSSProperties = { fontFamily: 'var(--kit-font-title)', color: '#6e1a14', margin: '0 0 8px', fontSize: 18 };

function Battle({ sc }: { sc: ScenarioInfo }) {
  const [h, setH] = useState<BattleHistory | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    loadHistory(sc.id).then(setH, (e) => setErr(String(e)));
  }, [sc.id]);
  if (err) return <div style={sheet}>{err}</div>;
  if (!h) return <div style={sheet}>Loading…</div>;
  const colors = sideColors(sc);
  const problems = validateHistory(h);
  return (
    <>
      <div style={sheet}>
        <h2 style={h2}>{sc.id} {sc.name}, {sc.year}{h.date ? ` (history: ${h.date})` : ''}: game board (top: {sc.setup.top.army}, bottom: {sc.setup.bottom.army})</h2>
        <GameBoard sc={sc} />
        {problems.length > 0 && <pre style={{ color: '#a01010', whiteSpace: 'pre-wrap' }}>{problems.join('\n')}</pre>}
      </div>
      <div style={sheet} className="kit-modal__body">
        <h2 style={h2}>I. {SLIDE_TITLES[0]}</h2>
        <RoadSlide h={h} colors={colors} />
      </div>
      {h.map.phases.map((ph, i) => (
        <div key={i} style={sheet} className="kit-modal__body">
          <h2 style={h2}>II. {SLIDE_TITLES[1]}: phase {i + 1} of {h.map.phases.length}</h2>
          <MapSlide h={h} phase={i} colors={colors} />
        </div>
      ))}
      <div style={sheet} className="kit-modal__body">
        <h2 style={h2}>II. Flipped (the player commands the top army), last phase</h2>
        <MapSlide h={h} phase={h.map.phases.length - 1} colors={colors} flipped />
      </div>
      <div style={sheet} className="kit-modal__body">
        <h2 style={h2}>III. {SLIDE_TITLES[2]}</h2>
        <OutcomeSlide h={h} colors={colors} />
      </div>
    </>
  );
}

/** Contact sheet: every phase of every battle's map, two to a row (#/gallery/history/maps[/<first id>-<last id>]). */
function MapSheet({ range }: { range?: string }) {
  const [lo, hi] = (range ?? '000-999').split('-');
  const ids = SCENARIOS.filter((s) => hasHistory(s.id) && s.id >= lo && s.id <= (hi ?? lo));
  const [all, setAll] = useState<BattleHistory[] | null>(null);
  useEffect(() => {
    Promise.all(ids.map((s) => loadHistory(s.id))).then(setAll);
  }, [range]);
  if (!all) return <div style={sheet}>Loading…</div>;
  return (
    <>
      {all.map((h) => {
        const sc = SCENARIOS.find((s) => s.id === h.id)!;
        const colors = sideColors(sc);
        return (
          <div key={h.id} style={{ ...sheet, padding: '10px 14px' }}>
            <h2 style={{ ...h2, fontSize: 15 }}>{h.id} {sc.name}: top {sc.setup.top.army}, bottom {sc.setup.bottom.army}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {h.map.phases.map((ph, i) => (
                <div key={i}>
                  <BattleMap map={h.map} phase={i} colors={colors} />
                  <div style={{ fontSize: 12 }}><b>{i + 1}. {ph.title}</b></div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function HistoryGallery() {
  const id = window.location.hash.split('/')[3];
  if (id === 'maps') return <div style={page}><MapSheet range={window.location.hash.split('/')[4]} /></div>;
  const sc = id ? SCENARIOS.find((s) => s.id === id) : undefined;
  if (sc) return <div style={page}><Battle sc={sc} /></div>;
  return (
    <div style={page}>
      <div style={sheet}>
        <h2 style={h2}>Battle histories</h2>
        <ul>
          {SCENARIOS.map((s) => (
            <li key={s.id}>
              {hasHistory(s.id) ? <a href={`#/gallery/history/${s.id}`}>{s.id} {s.name}</a> : <span style={{ opacity: 0.5 }}>{s.id} {s.name} (none yet)</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
