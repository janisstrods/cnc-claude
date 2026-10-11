// Panels of the game screen around the board: the hover tooltip's frame, the battle log, the order-dice panel of a side
// that orders by dice (310) and the dialog that assigns Rally and I Am Spartacus dice.
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ROWS, UNIT_STATS, inCommand, leadersOf, rallyCandidates, rowOf, sectionsOf, unitsOf, validateRally, validateSpartacus,
  type Decision, type DieFace, type GameState, type HexId, type Side,
} from '../../engine';
import { unitTypeName } from '../../art';
import { Button, DieView, Panel } from '../kit';
import type { LogLine } from './controller';
import { currentDiceTurn, diceOrderSlots, diceSlotText, pieceName, type DiceTurn } from './diceOrders';

/**
 * Floating unit tooltip that follows the mouse without re-rendering the game screen. It is kept inside the window by its
 * measured size (a unit with a leader, his traits and an objective can be tall).
 */
export function HoverTip({ active, children }: { active: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -1000, y: -1000 });
  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // read both sizes before writing either style, so the browser lays the tip out once
    const { offsetWidth: w, offsetHeight: h } = el;
    el.style.left = `${Math.min(pos.current.x + 18, window.innerWidth - Math.max(300, w + 8))}px`;
    el.style.top = `${Math.max(4, Math.min(pos.current.y + 18, window.innerHeight - Math.max(220, h + 8)))}px`;
  }, []);
  useEffect(() => {
    const on = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      place();
    };
    window.addEventListener('mousemove', on);
    place();
    return () => window.removeEventListener('mousemove', on);
  }, [active, place]);
  // the content (and so the size) changes with the hovered hex
  useLayoutEffect(place);
  if (!active) return null;
  return <div className="hover-tip" ref={ref}>{children}</div>;
}

export const LogPanel = memo(function LogPanel({ log, human }: { log: LogLine[]; human: Side }) {
  const ref = useRef<HTMLDivElement>(null);
  const lastId = log.length ? log[log.length - 1].id : 0;
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);
  return (
    <Panel className="log-panel" title="Battle Log">
      <div className="log-scroll" ref={ref}>
        {log.map((l) => (
          <div key={l.id} className={`log-line log-${l.kind} ${l.side ? (l.side === human ? 'log-me' : 'log-them') : ''}`}>
            {l.text}
          </div>
        ))}
      </div>
    </Panel>
  );
});

/**
 * Dice orders (310, §18.10): the turn panel of a side that orders by dice, in place of the hand. It shows the order dice of
 * the current turn (the faces the combat dice use) and what each did or does: the unit a flag or swords fell on, the piece
 * each symbol orders (while the orders are given, a die is selected by a click and orders the piece clicked on the board),
 * or that it is lost. Before the first roll, and on the enemy's turn, it says how the side orders.
 */
export function DiceTurnPanel(p: {
  state: GameState;
  side: Side;
  dice: number;
  turn: DiceTurn | null;
  pending: Decision | null;
  ids?: (string | null)[];
  active: number | null;
  onSelect: (i: number) => void;
}) {
  const { state: s, side, pending: d } = p;
  // a battle resumed from its save mid-turn has no roll on record: the pending decision has the dice
  const t = currentDiceTurn(s, side, p.turn, d);
  const mine = !!t && s.active === side;
  const assigning = mine && d?.kind === 'diceOrders' && d.side === side;
  const slots = mine ? diceOrderSlots(s, side, t!.faces) : [];
  const caption = (i: number): { text: string; tone?: 'now' | 'done' | 'lost' } => {
    const slot = slots[i];
    const used = t!.used[i];
    if (slot.role === 'flag' || slot.role === 'swords') {
      if (used) return { text: slot.role === 'flag' ? `${used} fell back` : `${used} lost a block`, tone: 'done' };
      const next = t!.faces.findIndex((f, j) => f === slot.face && !t!.used[j]) === i;
      return d?.kind === 'diceVictim' && d.face === slot.role && next ? { text: 'Choose the unit', tone: 'now' } : { text: diceSlotText(slot) };
    }
    if (assigning) {
      const id = p.ids?.[i];
      if (id) return { text: pieceName(s, id), tone: 'done' };
      if (slot.role === 'lost') return { text: diceSlotText(slot), tone: 'lost' };
      if (p.active !== i) return { text: 'Unused' };
      return { text: slot.face === 'leader' ? 'Click a leader' : 'Click a unit', tone: 'now' };
    }
    if (t!.done || s.turn.phase !== 'orders') return used ? { text: `Orders ${used}`, tone: 'done' } : { text: slot.role === 'lost' ? diceSlotText(slot) : 'Unused', tone: 'lost' };
    return { text: diceSlotText(slot), tone: slot.role === 'lost' ? 'lost' : undefined };
  };
  return (
    <div className="dice-panel" role="group" aria-label="Order dice">
      <div className="dice-panel-head">
        Order dice <small>No cards: {p.dice} dice a turn</small>
      </div>
      {mine ? (
        <div className="dice-panel-dice">
          {t!.faces.map((f, i) => {
            const c = caption(i);
            const pick = assigning && slots[i].role === 'order';
            return (
              <button
                key={i}
                type="button"
                className={`dice-panel-die ${pick && p.active === i ? 'is-active' : ''} ${c.tone ? `is-${c.tone}` : ''}`}
                disabled={!pick}
                onClick={() => pick && p.onSelect(i)}
                title={pick ? `Die ${i + 1}: click it, then a unit on the board` : undefined}
              >
                <DieView face={f} size={30} />
                <span className="dice-panel-text">{c.text}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="dice-panel-wait">You roll {p.dice} order dice at the start of your turn: flags and swords fall on your own units, symbols order units of their kind.</div>
      )}
    </div>
  );
}

/** Rally and I Am Spartacus: a die per row, each assigned (or not) to one of the pieces it can rally or order. */
export function AssignDialog(p: { state: GameState; side: Side; kind: 'rally' | 'spartacus'; faces: DieFace[]; command?: string; error: string | null; onChange: (ids: string[]) => void; onDone: (ids: (string | null)[]) => void }) {
  const { state: s, side, faces, command } = p;
  // separate commands (§18.5): only the named command's pieces, and those with no command, can be chosen
  const free = (x: { command?: string }) => inCommand(x, command);
  const [ids, setIds] = useState<(string | null)[]>(() => suggest());
  useEffect(() => {
    p.onChange(ids.filter((x): x is string => !!x));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  function where(h: HexId) {
    const secs = sectionsOf(h, side);
    const sec = secs.length === 2 ? `${secs[0]}/${secs[1]}` : secs[0];
    const r = rowOf(h);
    const depth = side === 'bottom' ? ROWS - 1 - r : r;
    return `${sec}${depth === 0 ? ', rear' : depth >= 3 ? ', forward' : ''}`;
  }
  function options(face: DieFace): { id: string; label: string }[] {
    if (p.kind === 'rally') {
      return rallyCandidates(s, side, command)
        .filter((u) => face === 'leader' || UNIT_STATS[u.type].cls === face)
        .map((u) => ({ id: u.id, label: `${unitTypeName(u.type)} (${u.blocks}/${u.maxBlocks}) — ${where(u.hex)}` }));
    }
    if (face === 'flag' || face === 'swords') return [];
    const units = unitsOf(s, side).filter((u) => free(u) && (face === 'leader' || UNIT_STATS[u.type].cls === face)).map((u) => ({ id: u.id, label: `${unitTypeName(u.type)} (${u.blocks}/${u.maxBlocks}) — ${where(u.hex)}` }));
    const leaders = face === 'leader' ? leadersOf(s, side).filter(free).map((l) => ({ id: l.id, label: `Leader ${l.name || ''} — ${where(l.hex)}` })) : [];
    return [...units, ...leaders];
  }
  function suggest(): (string | null)[] {
    const out: (string | null)[] = [];
    for (let i = 0; i < faces.length; i++) {
      const opts = options(faces[i]);
      let chosen: string | null = null;
      for (const o of opts) {
        const trial = [...out, o.id, ...Array(faces.length - i - 1).fill(null)];
        if (!validate(trial)) { chosen = o.id; break; }
      }
      out.push(chosen);
    }
    return out;
  }
  function validate(list: (string | null)[]): string | null {
    if (p.kind === 'rally') return validateRally(s, side, faces, list, command);
    return validateSpartacus(s, side, faces, list, command);
  }
  const err = validate(ids);
  return (
    <div className="assign-float">
      <div className="assign-title">{p.kind === 'rally' ? 'Rally your troops' : 'I Am Spartacus'}</div>
      <p className="modal-p">
        {p.kind === 'rally'
          ? 'Each unit symbol restores one block to a damaged unit of that type in or next to a leader\'s hex. Helmets restore any type.'
          : 'Each unit symbol orders one unit of that type; helmets order any unit or leader. Ordered units roll one extra die this turn.'}
      </p>
      <div className="assign-list">
        {faces.map((f, i) => {
          const opts = options(f);
          return (
            <div key={i} className="assign-row">
              <DieView face={f} size={34} />
              {opts.length ? (
                <select value={ids[i] ?? ''} onChange={(e) => setIds(ids.map((x, j) => (j === i ? e.target.value || null : x)))}>
                  <option value="">— unused —</option>
                  {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              ) : (
                <span className="assign-none">no effect</span>
              )}
            </div>
          );
        })}
      </div>
      {(err || p.error) && <div className="prompt-err">{err ?? p.error}</div>}
      <div className="modal-buttons">
        <Button disabled={!!err} onClick={() => p.onDone(ids)}>Confirm</Button>
      </div>
    </div>
  );
}
