// The History dialog of a battle: three slides (the road to battle, the battlefield map in phases, the outcome), opened
// from the battle briefing and the in-game header. Each battle's history is loaded when the dialog first opens.
import { useEffect, useState } from 'react';
import type { Side } from '../../engine';
import type { ScenarioInfo } from '../../scenarios';
import { hasHistory, loadHistory, type BattleHistory, type UnitKind } from '../../history';
import { blockColors } from '../../art';
import { Button, Modal } from '../kit';
import { BattleMap, KIND_NAMES, UnitGlyph, unitSize, type MapColors } from './BattleMap';
import './history.css';

/** The two armies' map colours: their block colours. */
export function sideColors(sc: ScenarioInfo): Record<Side, MapColors> {
  const c = (side: Side): MapColors => {
    const b = blockColors(sc.setup[side].blocks);
    return { fill: b.edge, dark: b.edgeShade };
  };
  return { top: c('top'), bottom: c('bottom') };
}

export const SLIDE_TITLES = ['The Road to Battle', 'The Battlefield', 'Outcome & Consequences'] as const;

/** A slide and, on the map slide, its phase. */
export interface SlidePos {
  slide: number;
  phase: number;
}

/** The next build step: through the map's phases, then on to the next slide. */
export function nextPos(p: SlidePos, phases: number): SlidePos | null {
  if (p.slide === 1 && p.phase < phases - 1) return { slide: 1, phase: p.phase + 1 };
  if (p.slide < 2) return { slide: p.slide + 1, phase: 0 };
  return null;
}

/** The previous build step; entering the map slide from the end shows its last phase. */
export function prevPos(p: SlidePos, phases: number): SlidePos | null {
  if (p.slide === 1 && p.phase > 0) return { slide: 1, phase: p.phase - 1 };
  if (p.slide === 2) return { slide: 1, phase: phases - 1 };
  if (p.slide === 1) return { slide: 0, phase: 0 };
  return null;
}

/** Slide 1: the war, why the armies met, and one card per army. */
export function RoadSlide({ h, colors }: { h: BattleHistory; colors: Record<Side, MapColors> }) {
  return (
    <div className="hist-slide hist-road">
      <div className="hist-war">{h.context.war}</div>
      {h.context.text.map((t, i) => <p key={i} className="hist-p">{t}</p>)}
      <div className="hist-sides">
        {(['top', 'bottom'] as Side[]).map((side) => {
          const s = h.sides[side];
          return (
            <div key={side} className="hist-side" style={{ borderTopColor: colors[side].fill }}>
              <div className="hist-side-name">
                <span className="hist-swatch" style={{ background: colors[side].fill, borderColor: colors[side].dark }} />
                {s.name}
              </div>
              <div className="hist-side-cmd">{s.commanders.join(' · ')}</div>
              <div className="hist-side-str">{s.strength}</div>
              <div className="hist-side-forces">{s.forces}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The legend under the map: the two armies and the kinds of unit on the map. */
function MapLegend({ h, colors }: { h: BattleHistory; colors: Record<Side, MapColors> }) {
  const kinds = [...new Set(h.map.units.map((u) => u.kind))] as UnitKind[];
  return (
    <div className="hist-legend">
      {(['top', 'bottom'] as Side[]).map((side) => (
        <span key={side} className="hist-legend-item">
          <span className="hist-swatch" style={{ background: colors[side].fill, borderColor: colors[side].dark }} />
          {h.sides[side].name}
        </span>
      ))}
      {kinds.map((k) => {
        const [w, hh] = unitSize({ id: k, side: 'top', kind: k });
        return (
          <span key={k} className="hist-legend-item">
            <svg width={30} height={14} viewBox={`${-w / 2 - 2} ${-hh / 2 - 2} ${w + 4} ${hh + 4}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
              <rect x={-w / 2} y={-hh / 2} width={w} height={hh} rx={k === 'warband' || k === 'lighthorse' ? hh / 2.4 : 2} fill="#8a7a5a" stroke="#4a3c26" strokeWidth={2} />
              <UnitGlyph kind={k} w={w} h={hh} color="#f6ecd2" />
            </svg>
            {KIND_NAMES[k]}
          </span>
        );
      })}
    </div>
  );
}

/** Slide 2: the map in a phase, the phase strip and the phase's caption. */
export function MapSlide(p: { h: BattleHistory; phase: number; colors: Record<Side, MapColors>; flipped?: boolean; onPhase?: (i: number) => void }) {
  const { h, phase, colors } = p;
  const ph = h.map.phases[phase];
  return (
    <div className="hist-slide hist-mapslide">
      <div className="hist-map-frame">
        <BattleMap map={h.map} phase={phase} colors={colors} flipped={p.flipped} label={`Battle map, phase ${phase + 1}: ${ph.title}. ${ph.caption}`} />
      </div>
      <MapLegend h={h} colors={colors} />
      {h.map.phases.length > 1 && (
        <div className="hist-phases" role="group" aria-label="Phases of the battle">
          {h.map.phases.map((x, i) => (
            <button key={i} type="button" className={`hist-phase ${i === phase ? 'active' : ''}`} aria-pressed={i === phase} onClick={() => p.onPhase?.(i)}>
              <span className="hist-phase-num">{i + 1}</span> {x.title}
            </button>
          ))}
        </div>
      )}
      <p className="hist-caption" aria-live="polite">
        {h.map.phases.length === 1 && <b>{ph.title}. </b>}
        {ph.caption}
      </p>
    </div>
  );
}

/** Slide 3: the result, the losses, what followed, and the sources. */
export function OutcomeSlide({ h, colors }: { h: BattleHistory; colors: Record<Side, MapColors> }) {
  const o = h.outcome;
  const accent = o.winner === 'draw' ? undefined : colors[o.winner].fill;
  return (
    <div className="hist-slide hist-outcome">
      <div className="hist-result" style={accent ? { borderLeftColor: accent } : undefined}>{o.result}</div>
      {o.losses && <p className="hist-losses"><b>Losses:</b> {o.losses}</p>}
      {o.text.map((t, i) => <p key={i} className="hist-p">{t}</p>)}
      <div className="hist-sources">
        <span className="hist-sources-label">Sources</span>
        <ul>
          {h.sources.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>
    </div>
  );
}

/** The three slides with their navigation (the dialog's content once the history is loaded). */
export function HistorySlides(p: { h: BattleHistory; scenario: ScenarioInfo; flipped?: boolean; pos: SlidePos; onPos: (p: SlidePos) => void; onDone?: () => void }) {
  const { h, pos, onPos } = p;
  const colors = sideColors(p.scenario);
  const phases = h.map.phases.length;
  const next = nextPos(pos, phases);
  const prev = prevPos(pos, phases);
  return (
    <div className="hist">
      <nav className="hist-tabs" aria-label="Slides">
        {SLIDE_TITLES.map((t, i) => (
          <button key={t} type="button" className={pos.slide === i ? 'active' : ''} aria-current={pos.slide === i ? 'step' : undefined} onClick={() => onPos({ slide: i, phase: 0 })}>
            <span className="hist-tab-num">{['I', 'II', 'III'][i]}</span> {t}
          </button>
        ))}
      </nav>
      <div className="hist-body">
        {pos.slide === 0 && <RoadSlide h={h} colors={colors} />}
        {pos.slide === 1 && <MapSlide h={h} phase={pos.phase} colors={colors} flipped={p.flipped} onPhase={(i) => onPos({ slide: 1, phase: i })} />}
        {pos.slide === 2 && <OutcomeSlide h={h} colors={colors} />}
      </div>
      <div className="hist-nav">
        <Button variant="secondary" disabled={!prev} onClick={() => prev && onPos(prev)}>← Previous</Button>
        <span className="hist-step">{pos.slide + 1} / 3{pos.slide === 1 && phases > 1 ? ` · phase ${pos.phase + 1} of ${phases}` : ''}</span>
        {next ? <Button onClick={() => onPos(next)}>Next →</Button> : <Button onClick={p.onDone}>Done</Button>}
      </div>
    </div>
  );
}

/** The History dialog: loads the battle's history, then shows the slides; ← and → step through them. */
export function HistoryDialog({ scenario, flipped, onClose }: { scenario: ScenarioInfo; flipped?: boolean; onClose: () => void }) {
  const [h, setH] = useState<BattleHistory | null>(null);
  const [failed, setFailed] = useState(false);
  const [pos, setPos] = useState<SlidePos>({ slide: 0, phase: 0 });
  useEffect(() => {
    let live = true;
    loadHistory(scenario.id).then(
      (x) => live && setH(x),
      (e) => {
        console.error(e);
        if (live) setFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, [scenario.id]);
  useEffect(() => {
    if (!h) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
      const n = h.map.phases.length;
      const to = e.key === 'ArrowRight' ? nextPos(pos, n) : e.key === 'ArrowLeft' ? prevPos(pos, n) : null;
      if (!to) return;
      e.preventDefault();
      setPos(to);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [h, pos]);
  return (
    <Modal open title={`${scenario.name}, ${h?.date ?? scenario.year}`} onClose={onClose} width={940}>
      {h ? (
        <HistorySlides h={h} scenario={scenario} flipped={flipped} pos={pos} onPos={setPos} onDone={onClose} />
      ) : (
        <p className="hist-loading">{failed ? 'The history of this battle could not be loaded.' : 'Unrolling the scroll…'}</p>
      )}
    </Modal>
  );
}

/**
 * The History button of a battle; renders nothing for a battle without a history. `flipped`: the player commands the
 * top army, so the map is turned like the board.
 */
export function HistoryButton({ scenario, flipped, variant = 'ghost', className }: { scenario: ScenarioInfo; flipped?: boolean; variant?: 'primary' | 'secondary' | 'ghost'; className?: string }) {
  const [open, setOpen] = useState(false);
  if (!hasHistory(scenario.id)) return null;
  return (
    <>
      <Button variant={variant} className={className} onClick={() => setOpen(true)} title={`The history of ${scenario.name}`}>History</Button>
      {open && <HistoryDialog scenario={scenario} flipped={flipped} onClose={() => setOpen(false)} />}
    </>
  );
}
