// The History button of a battle, opened from the battle briefing and the in-game header, and the frame of its dialog. The
// slides (HistoryDialog.tsx, with the battle map) are their own chunk, and so is each battle's history: both are loaded
// when the dialog first opens, while it says it is unrolling the scroll.
import { lazy, Suspense, useEffect, useState } from 'react';
import type { ScenarioInfo } from '../../scenarios';
import { hasHistory, loadHistory, type BattleHistory } from '../../history';
import { Button, Modal } from '../kit';
import './history.css';

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

const loadSlides = () => import('./HistoryDialog');
const HistorySlides = lazy(() => loadSlides().then((m) => ({ default: m.HistorySlides })));

/**
 * The History dialog: loads the battle's history and the slides together, then shows the slides; ← and → step through
 * them.
 */
function HistoryDialog({ scenario, flipped, onClose }: { scenario: ScenarioInfo; flipped?: boolean; onClose: () => void }) {
  const [h, setH] = useState<BattleHistory | null>(null);
  const [failed, setFailed] = useState(false);
  const [pos, setPos] = useState<SlidePos>({ slide: 0, phase: 0 });
  useEffect(() => {
    let live = true;
    Promise.all([loadHistory(scenario.id), loadSlides()]).then(
      ([x]) => live && setH(x),
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
  const loading = <p className="hist-loading">{failed ? 'The history of this battle could not be loaded.' : 'Unrolling the scroll…'}</p>;
  return (
    <Modal open title={`${scenario.name}, ${h?.date ?? scenario.year}`} onClose={onClose} width={940}>
      {h ? (
        // the slides' chunk has loaded with the history: this waits a tick at most
        <Suspense fallback={loading}>
          <HistorySlides h={h} scenario={scenario} flipped={flipped} pos={pos} onPos={setPos} onDone={onClose} />
        </Suspense>
      ) : (
        loading
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
