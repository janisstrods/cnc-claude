import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  CARD_DEFS, OFF_BOARD, UNIT_STATS, ambushAvailable, ambushSections, cardKind, isLeaderId, leaderAt, leaderById, leaderUnit,
  other, pieceMoves, rallyCandidates, terrainAt, isFord, unitAt, unitById, validateOrders, validateRally, validateSpartacus,
  battleTargets, movablePieces, battleReady, eligiblePieces, unitsOf, leadersOf, sectionsOf, orderMode,
  type Answer, type DieFace, type GameState, type HexId, type RetreatOption, type SectionName, type Side,
} from '../../engine';
import { UnitIcon, unitTypeName } from '../../art';
import { BannerTrack, Button, CardBack, CardView, DiceTray, DieView, Modal, Panel } from '../kit';
import { terrainName } from '../terrain';
import { Board } from './Board';
import type { GameController, LogLine } from './controller';
import { attackDice, boardUi, effectiveKind, expectedHits, pieceHexOf, unitSummary, type UiSel } from './uiModel';
import { RulesReference } from '../screens/RulesReference';
import { isMuted, setMuted } from '../sound';
import './game.css';

const EMPTY_SEL: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null };

const SECTION_LABEL: Record<SectionName, string> = { left: 'Left', center: 'Center', right: 'Right' };
const DIFF_LABEL = { recruit: 'Recruit', tribune: 'Tribune', consul: 'Consul' } as const;

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

export function GameScreen({ controller, onExit }: { controller: GameController; onExit: () => void }) {
  const view = useSyncExternalStore(controller.subscribe, controller.getView);
  const s = view.display;
  const human = view.humanSide;
  const ai = other(human);
  const flipped = human === 'top';
  const d = view.pending;
  const [ui, setUi] = useState<UiSel>(EMPTY_SEL);
  const [showRules, setShowRules] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [mutedState, setMutedState] = useState(isMuted());
  const [assignFocus, setAssignFocus] = useState<string[]>([]);

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __cca: GameController }).__cca = controller;
  }, [controller]);

  // keyboard shortcuts: Enter = main action, Esc = clear selection, 1-9 = pick a card
  const shownAt = useRef(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLSelectElement || t instanceof HTMLInputElement) return;
      if (document.querySelector('.kit-modal, .assign-float')) return; // dialogs own the keyboard
      if (e.key === 'Enter') {
        if (e.repeat || t instanceof HTMLButtonElement) return;
        if (performance.now() - shownAt.current < 400) return; // swallow double-taps into a fresh decision
        const btn = document.querySelector<HTMLButtonElement>('.prompt-buttons .kit-btn--primary:not(:disabled)');
        if (btn) { e.preventDefault(); btn.click(); }
      } else if (e.key === 'Escape') {
        setUi((u) => ({ ...u, selPiece: null, selCard: null }));
      } else if (/^[1-9]$/.test(e.key) && d?.kind === 'playCard' && d.side === human) {
        const c = s.players[human].hand[Number(e.key) - 1];
        if (c !== undefined) setUi((u) => ({ ...u, selCard: c }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [d, human, s]);

  // reset local selection whenever a new decision arrives
  useEffect(() => {
    shownAt.current = performance.now();
    setUi((u) => ({ ...EMPTY_SEL, hoverHex: u.hoverHex }));
    if (d?.kind === 'move' && d.side === human) {
      const movers = movablePieces(s, d.stage);
      const reserve = movers.find((id) => pieceHexOf(s, id) < 0);
      if (reserve) setUi((u) => ({ ...u, selPiece: reserve }));
      else if (movers.length === 1) setUi((u) => ({ ...u, selPiece: movers[0] }));
    }
    if (d?.kind === 'battle' && d.side === human) {
      const ready = battleReady(s);
      const must = mustCharge(s, ready);
      if (must.length) setUi((u) => ({ ...u, selPiece: must[0] }));
      else if (ready.length === 1) setUi((u) => ({ ...u, selPiece: ready[0] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);

  const answer = (a: Answer) => controller.answer(a);

  const bui = useMemo(() => {
    const b = boardUi(s, d, ui, human);
    if (d && d.side === human && (d.kind === 'rally' || d.kind === 'spartacus')) {
      for (const id of assignFocus) {
        const h = pieceHexOf(s, id);
        if (h >= 0) b.highlights.set(h, 'selected');
      }
    }
    return b;
  }, [s, d, ui, human, assignFocus]);

  const orderedIds = useMemo(() => new Set(Object.keys(s.turn.ordered)), [s]);
  const doneIds = useMemo(() => {
    const out = new Set<string>();
    if ((s.turn.phase === 'battle' || s.turn.phase === 'move2') && s.active === human) {
      for (const op of Object.values(s.turn.ordered)) if (!op.isLeader && op.battlesLeft === 0) out.add(op.id);
    }
    return out;
  }, [s]);

  // ------------------------------------------------------------------ clicks
  const onHexClick = (h: HexId) => {
    if (!d || d.side !== human) return;
    const u = unitAt(s, h);
    const l = leaderAt(s, h);
    switch (d.kind) {
      case 'orders': {
        const elig = new Set(eligiblePieces(s, human, d.card));
        if (CARD_DEFS[d.card].group === 'leadership' && l && l.side === human && elig.has(l.id)) {
          const own = leaderUnit(s, l);
          const on = ui.orderSel.includes(l.id);
          setUi({
            ...ui,
            orderSel: on
              ? ui.orderSel.filter((x) => x !== l.id && x !== own?.id)
              : [...ui.orderSel.filter((x) => x !== own?.id), l.id, ...(own ? [own.id] : [])],
          });
          return;
        }
        let id: string | null = null;
        if (u && u.side === human && elig.has(u.id)) id = u.id;
        else if (l && l.side === human && elig.has(l.id)) id = l.id;
        if (!id) return;
        toggleOrder(id);
        return;
      }
      case 'move': {
        if (ui.selPiece) {
          const m = pieceMoves(s, ui.selPiece, d.stage).find((x) => x.hex === h);
          if (m) {
            answer({ kind: 'move', piece: ui.selPiece, to: h });
            return;
          }
        }
        const movers = new Set(movablePieces(s, d.stage));
        if (u && movers.has(u.id)) setUi({ ...ui, selPiece: u.id });
        else if (l && movers.has(l.id)) setUi({ ...ui, selPiece: l.id });
        else setUi({ ...ui, selPiece: null });
        return;
      }
      case 'battle': {
        if (ui.selPiece) {
          const t = battleTargets(s, ui.selPiece).find((x) => x.hex === h);
          if (t) {
            answer({ kind: 'attack', unit: ui.selPiece, target: h });
            return;
          }
        }
        const ready = new Set(battleReady(s));
        if (u && ready.has(u.id)) setUi({ ...ui, selPiece: u.id });
        else setUi({ ...ui, selPiece: null });
        return;
      }
      case 'retreat':
      case 'leaderEvade': {
        const i = d.options.findIndex((o) => o.end === h && !o.offBoard);
        if (i >= 0) answer({ kind: 'choose', index: i });
        return;
      }
      case 'momentum':
        if (h === d.hex) answer({ kind: 'yesno', yes: true });
        return;
      case 'cavalryExtra':
        if (d.options.includes(h)) answer({ kind: 'hex', hex: h });
        return;
      case 'bonusCombat':
        if (d.targets.includes(h)) answer({ kind: 'hex', hex: h });
        return;
      default:
        return;
    }
  };

  const onLeaderClick = (id: string): boolean => {
    if (!d || d.side !== human) return false;
    if (d.kind === 'orders') {
      if (!eligiblePieces(s, human, d.card).includes(id)) return false;
      toggleOrder(id);
      return true;
    }
    if (d.kind === 'move') {
      if (!movablePieces(s, d.stage).includes(id)) return false;
      setUi({ ...ui, selPiece: id });
      return true;
    }
    return false;
  };

  const toggleOrder = (id: string) => {
    if (!d || d.kind !== 'orders') return;
    let sel = ui.orderSel.includes(id) ? ui.orderSel.filter((x) => x !== id) : [...ui.orderSel, id];
    // Leadership cards: choosing an attached leader brings his unit along.
    if (isLeaderId(id) && !ui.orderSel.includes(id) && CARD_DEFS[d.card].group === 'leadership') {
      const l = leaderById(s, id);
      const own = l && leaderUnit(s, l);
      if (own && !sel.includes(own.id)) sel = [...sel, own.id];
    }
    setUi({ ...ui, orderSel: sel });
  };

  const handlers = useRef({ onHexClick, onLeaderClick });
  handlers.current = { onHexClick, onLeaderClick };
  const onHexClickS = useCallback((h: HexId) => handlers.current.onHexClick(h), []);
  const onLeaderClickS = useCallback((id: string) => handlers.current.onLeaderClick(id), []);
  const onHexHoverS = useCallback((h: HexId | null) => setUi((u) => (u.hoverHex === h ? u : { ...u, hoverHex: h })), []);

  // ------------------------------------------------------------------ prompt
  const prompt = renderPrompt();

  function renderPrompt(): { title: string; text: string; buttons: JSX.Element[]; tone?: string } | null {
    if (view.over) return null;
    if (!d && view.fatal) {
      return { title: 'The battle stalled', text: view.error ?? 'An unexpected error occurred.', buttons: [<Button key="menu" onClick={onExit}>Return to menu</Button>], tone: 'danger' };
    }
    if (!d) {
      if (view.aiThinking) return { title: `${s.players[ai].commander} is considering…`, text: '', buttons: [] };
      return { title: s.active === human ? 'Resolving…' : `${s.players[ai].army} turn`, text: '', buttons: [] };
    }
    if (d.side !== human) return null;
    const btn = (label: string, onClick: () => void, opts: { variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; key?: string; title?: string } = {}) => (
      <Button key={opts.key ?? label} variant={opts.variant ?? 'primary'} disabled={opts.disabled} onClick={onClick} title={opts.title}>
        {label}
      </Button>
    );
    const undoBtn = view.canUndo ? btn('Undo move', () => controller.undo(), { variant: 'ghost', key: 'undo' }) : null;
    switch (d.kind) {
      case 'playCard': {
        const sel = ui.selCard;
        const def = sel !== null ? CARD_DEFS[cardKind(sel)] : null;
        let note = 'Hover a card to see which troops it can order.';
        if (sel !== null) {
          const eff = effectiveKind(s, human, sel);
          if (cardKind(sel) === 'counterAttack') note = eff.kind ? `Copies the enemy's ${CARD_DEFS[eff.kind].title}.` : 'The enemy has played nothing to copy.';
          else if (cardKind(sel) === 'firstStrike') note = 'First Strike is a reaction card: playing it now has no effect.';
          else note = def!.text;
        }
        return {
          title: 'Choose a command card',
          text: note,
          buttons: sel !== null ? [btn(`Play ${def!.title}`, () => answer({ kind: 'playCard', card: sel }))] : [],
        };
      }
      case 'orders': {
        const def = CARD_DEFS[d.card];
        const err = validateOrders(s, human, d.card, ui.orderSel);
        const amb = ambushAvailable(s, human, d.card);
        const mode = orderMode(s, human, d.card).mode;
        const buttons = [
          btn(ui.orderSel.length ? `Confirm ${ui.orderSel.length} order${ui.orderSel.length > 1 ? 's' : ''}` : 'Order nothing', () => answer({ kind: 'orders', pieces: ui.orderSel }), { disabled: !!err, variant: ui.orderSel.length ? 'primary' : 'secondary' }),
        ];
        if (ui.orderSel.length) buttons.push(btn('Clear', () => setUi({ ...ui, orderSel: [] }), { variant: 'ghost' }));
        const all = eligiblePieces(s, human, d.card);
        if (mode === 'troop' && ui.orderSel.length === 0) {
          const units = all.filter((id) => !isLeaderId(id));
          const max = s.players[human].command;
          if (units.length > 0 && units.length <= max) buttons.push(btn('Select all', () => setUi({ ...ui, orderSel: units }), { variant: 'secondary' }));
        }
        if (amb) {
          for (const sec of ambushSections(d.card)) buttons.push(btn(`Ambush: ${SECTION_LABEL[sec]}`, () => answer({ kind: 'orders', pieces: [], ambushSection: sec }), { variant: 'secondary', key: `amb-${sec}`, title: "Spring Mago's ambush: his force enters on the Roman baseline in this section" }));
        }
        let text = `${def.text} Click your units to order them.`;
        if (mode === 'one') text = `None of your troops fit ${def.title}: order 1 unit of your choice (a normal order, no card bonus).`;
        else if (def.group === 'leadership') text = `Click a leader to command through him, then up to ${d.card === 'leadershipAny' ? 3 : 4} linked units — or order just 1 unit.`;
        return {
          title: `${def.title}${d.mirrored ? ' (Counter Attack)' : ''}`,
          text: err && ui.orderSel.length ? err : text,
          buttons,
          tone: err && ui.orderSel.length ? 'warn' : undefined,
        };
      }
      case 'move': {
        const movers = movablePieces(s, d.stage);
        const sel = ui.selPiece;
        const reserve = movers.filter((id) => pieceHexOf(s, id) < 0);
        let text = `${movers.length} ordered piece${movers.length === 1 ? '' : 's'} can still move. Select one, then click a destination.`;
        if (sel) {
          const name = isLeaderId(sel) ? leaderById(s, sel)?.name || 'Leader' : unitTypeName(unitById(s, sel)!.type);
          const moves = pieceMoves(s, sel, d.stage);
          text = d.stage === 2
            ? `${name}: may move again (no further combat this turn).`
            : `${name}: green = may battle after moving, amber = no battle, red = must charge into combat.${moves.some((m) => m.hex === OFF_BOARD) ? ' This unit can exit the battlefield.' : ''}`;
        }
        if (reserve.length) text = "Mago's force enters on the Roman baseline: pick a piece, then a highlighted hex. Pieces left off the board return to the reserve.";
        const buttons = [btn(d.stage === 2 ? 'Finish second move' : 'End movement', () => answer({ kind: 'endMove' }), { variant: 'secondary' })];
        for (const id of reserve) {
          const label = isLeaderId(id) ? leaderById(s, id)?.name || 'leader' : unitTypeName(unitById(s, id)!.type);
          buttons.unshift(btn(`Place ${label}`, () => setUi({ ...ui, selPiece: id }), { variant: id === sel ? 'primary' : 'secondary', key: `res-${id}` }));
        }
        if (sel && pieceMoves(s, sel, d.stage).some((m) => m.hex === OFF_BOARD)) {
          buttons.unshift(btn('Exit the battlefield', () => answer({ kind: 'move', piece: sel, to: OFF_BOARD }), { variant: 'secondary' }));
        }
        if (undoBtn) buttons.push(undoBtn);
        return { title: d.stage === 2 ? 'Move-Fire-Move: second move' : 'Movement', text, buttons };
      }
      case 'battle': {
        const ready = battleReady(s);
        const must = mustCharge(s, ready);
        let text = `${ready.length} unit${ready.length === 1 ? '' : 's'} can battle. Select a unit, then its target.`;
        if (ui.selPiece) {
          const u = unitById(s, ui.selPiece)!;
          text = `${unitTypeName(u.type)}: red = close combat, orange = ranged fire.`;
          if (ui.hoverHex !== null) {
            const t = battleTargets(s, ui.selPiece).find((x) => x.hex === ui.hoverHex);
            if (t) {
              const e = expectedHits(s, u, t.hex, t.kind);
              const n = attackDice(s, u, t.hex, t.kind);
              text = `${n} ${n === 1 ? 'die' : 'dice'} · expected hits ≈ ${e.toFixed(1)} · chance of at least one flag ${pct(1 - Math.pow(5 / 6, n))}`;
            }
          }
        }
        if (must.length) text = `Your charging warriors must attack first (${must.length} left). ${text}`;
        return { title: 'Battle', text, buttons: [btn('End battles', () => answer({ kind: 'endBattle' }), { variant: 'secondary', disabled: must.length > 0 })] };
      }
      case 'defend': {
        const a = unitById(s, d.attacker)!;
        const t = unitById(s, d.target)!;
        const dice = attackDice(s, a, t.hex, 'close', d.bonus ? 'bonus' : 'attack');
        const buttons = [btn('Stand and fight', () => answer({ kind: 'defend', choice: 'stand' }), { variant: d.canEvade ? 'secondary' : 'primary' })];
        if (d.canEvade) buttons.unshift(btn('Evade', () => answer({ kind: 'defend', choice: 'evade' }), { title: 'Fall back 2 hexes; only matching unit symbols can hit you.' }));
        if (d.canFirstStrike) buttons.push(btn('Play First Strike!', () => answer({ kind: 'defend', choice: 'firstStrike' }), { variant: 'secondary' }));
        return {
          title: 'Under attack!',
          text: `Enemy ${UNIT_STATS[a.type].name} (${dice} ${dice === 1 ? 'die' : 'dice'}) attacks your ${UNIT_STATS[t.type].name}. ${d.canEvade ? 'Evading: only ' + UNIT_STATS[t.type].cls + ' symbols can hit, and you cannot battle back.' : ''}`,
          buttons,
          tone: 'danger',
        };
      }
      case 'ignoreFlags': {
        const u = unitById(s, d.unit)!;
        const st = UNIT_STATS[u.type];
        const buttons: JSX.Element[] = [];
        for (let k = d.max; k >= 0; k--) {
          const left = d.flags - k;
          const label = left === 0 ? (k === 1 ? 'Hold firm (ignore the flag)' : `Hold firm (ignore ${k})`) : k === 0 ? `Retreat (${left} flag${left > 1 ? 's' : ''})` : `Ignore ${k}, retreat for ${left}`;
          buttons.push(btn(label, () => answer({ kind: 'ignoreFlags', count: k }), { variant: k === d.max ? 'primary' : 'secondary', key: `f${k}` }));
        }
        return { title: `${d.flags} flag${d.flags > 1 ? 's' : ''} against your ${st.name}`, text: `Bolstered morale lets this unit ignore up to ${d.max}. Each flag you accept forces a retreat of ${st.retreat} hex${st.retreat > 1 ? 'es' : ''}.`, buttons };
      }
      case 'retreat': {
        const uh = pieceHexOf(s, d.unit);
        const lbl = (o: RetreatOption, i: number) =>
          o.end === uh
            ? `Stay (lose ${o.losses})`
            : `Option ${i + 1}: ${o.path.length} hex${o.path.length > 1 ? 'es' : ''}${o.losses ? `, lose ${o.losses}` : ''}${o.attachLeader ? ', join leader' : ''}`;
        return {
          title: d.reason === 'evade' ? 'Evade' : 'Retreat',
          text: `Click a purple hex to choose where your ${unitById(s, d.unit) ? UNIT_STATS[unitById(s, d.unit)!.type].name : 'unit'} ends up.${d.options[0]?.losses ? ` The path is blocked: ${d.options[0].losses} block(s) will be lost.` : ''}`,
          buttons: d.options.length <= 4
            ? d.options.map((o, i) => (
              <Button key={`o${i}`} variant="ghost" onClick={() => answer({ kind: 'choose', index: i })} onMouseEnter={() => setUi((u) => ({ ...u, hoverHex: o.end }))}>
                {lbl(o, i)}
              </Button>
            ))
            : [],
        };
      }
      case 'leaderEvade': {
        const l = leaderById(s, d.leader);
        const buttons: JSX.Element[] = [];
        d.options.forEach((o, i) => {
          if (o.offBoard) buttons.push(btn('Leave the battlefield', () => answer({ kind: 'choose', index: i }), { variant: 'secondary', key: 'off' }));
        });
        return { title: `${l?.name || 'Your leader'} must evade`, text: 'Click a purple hex (joining a friendly unit is safest). Passing through enemy units risks capture.', buttons };
      }
      case 'momentum': {
        const u = unitById(s, d.unit)!;
        return {
          title: 'Momentum advance',
          text: d.bonus
            ? 'Your bonus attack succeeded. Advance into the vacated hex (no further attack this turn)?'
            : `Your ${UNIT_STATS[u.type].name} won the combat. Advance into the vacated hex?${UNIT_STATS[u.type].cavalry ? ' Cavalry may then move one more hex and attack again.' : ''}`,
          buttons: [btn('Advance', () => answer({ kind: 'yesno', yes: true })), btn('Hold position', () => answer({ kind: 'yesno', yes: false }), { variant: 'secondary' })],
        };
      }
      case 'cavalryExtra':
        return { title: 'Cavalry pursuit', text: 'Your cavalry may move one more hex (purple) before a bonus attack.', buttons: [btn('Stay here', () => answer({ kind: 'hex', hex: null }), { variant: 'secondary' })] };
      case 'bonusCombat':
        return { title: 'Bonus combat', text: 'Click a red target to attack again, or decline.', buttons: [btn('No bonus attack', () => answer({ kind: 'hex', hex: null }), { variant: 'secondary' })] };
      case 'rally':
      case 'spartacus':
        return { title: d.kind === 'rally' ? 'Rally' : 'I Am Spartacus', text: 'Assign the dice in the dialog.', buttons: [] };
      default:
        return null;
    }
  }

  // ------------------------------------------------------------------ hover tooltip
  const hoverInfo = useMemo(() => {
    if (ui.hoverHex === null) return null;
    const h = ui.hoverHex;
    const u = unitAt(s, h);
    const l = leaderAt(s, h);
    const t = terrainAt(s, h);
    const terr = t !== 'plain' ? terrainName(t, isFord(s, h)) : null;
    if (!u && !l && !terr) return null;
    return { u, l, terr };
  }, [ui.hoverHex, s]);

  const me = s.players[human];
  const them = s.players[ai];

  return (
    <div className="game-root">
      <header className="game-top">
        <div className="game-title">
          <span className="gt-name">{controller.scenario.name}</span>
          <span className="gt-year">{controller.scenario.year}</span>
        </div>
        <div className="game-turn">
          Turn {s.turn.number} · <span className={`side-chip side-${s.active === human ? 'me' : 'them'}`}>{s.players[s.active].army}</span>
          {view.aiThinking && <span className="thinking-dots">thinking</span>}
        </div>
        <div className="game-actions">
          <label className="speed">
            Speed
            <select value={view.speed} onChange={(e) => controller.setSpeed(Number(e.target.value))}>
              <option value={0.6}>Slow</option>
              <option value={1}>Normal</option>
              <option value={2}>Fast</option>
              <option value={4}>Very fast</option>
            </select>
          </label>
          <Button variant="ghost" onClick={() => { setMuted(!mutedState); setMutedState(!mutedState); }} title="Sound effects">{mutedState ? 'Sound: off' : 'Sound: on'}</Button>
          <Button variant="ghost" onClick={() => setShowRules(true)}>Rules</Button>
          <Button variant="ghost" onClick={() => setConfirmExit(true)}>Menu</Button>
        </div>
      </header>

      <div className="game-main">
        <section
          className="board-wrap"
          onClick={() => !view.pending && !view.over && controller.hurry()}
        >
          <Board
            state={s}
            flipped={flipped}
            humanSide={human}
            walking={view.walking}
            highlights={bui.highlights}
            leaderHighlights={bui.leaderHighlights}
            badges={bui.badges}
            sectionShade={bui.sectionShade}
            pathPreview={bui.pathPreview}
            combat={view.combat}
            flashes={view.flashes}
            orderedIds={orderedIds}
            doneIds={doneIds}
            onHexClick={onHexClickS}
            onHexHover={onHexHoverS}
            onLeaderClick={onLeaderClickS}
          />
          {view.toast && (
            <div className="turn-toast" key={view.toast.id}>{view.toast.text}</div>
          )}
          {view.cardShow && (
            <div className="card-show" key={view.cardShow.id}>
              <div className="card-show-label">{s.players[view.cardShow.side].commander} plays</div>
              <CardView kind={view.cardShow.kind} size="lg" />
            </div>
          )}
        </section>

        <aside className="side-col">
          <Panel className="army-panel">
            <div className="army-row">
              <div>
                <div className="army-name them">{them.army}</div>
                <div className="army-cmd" title={`${them.commander} · ${DIFF_LABEL[controller.config.difficulty]} · Command ${them.command}`}>{them.commander} · {DIFF_LABEL[controller.config.difficulty]} · Command {them.command}</div>
              </div>
              <div className="ai-hand" title={`${them.hand.length} command cards`}>
                {Array.from({ length: them.hand.length }).map((_, i) => <CardBack key={i} size="sm" style={{ fontSize: '1.7px', marginLeft: i ? -9 : 0 }} />)}
              </div>
            </div>
            <BannerTrack count={them.banners} target={s.bannersToWin} faction={s.players[human].faction} label="Banners won" />
            <div className="divider" />
            <div className="army-row">
              <div>
                <div className="army-name me">{me.army} <span className="you">(you)</span></div>
                <div className="army-cmd">{me.commander} · Command {me.command}</div>
              </div>
            </div>
            <BannerTrack count={me.banners} target={s.bannersToWin} faction={s.players[ai].faction} label="Banners won" />
            <div className="deck-row">Deck {s.deck.length} · Discards {s.discard.length}</div>
          </Panel>
          <div className="dice-slot">
            {view.dice ? (
              <DiceTray key={view.dice.id} faces={view.dice.faces} scoring={view.dice.rolling ? undefined : view.dice.scoring} rolling={view.dice.rolling} title={view.dice.title} subtitle={view.dice.subtitle} dieSize={32} />
            ) : (
              <div className="dice-empty">Battle dice will appear here</div>
            )}
          </div>
          <LogPanel log={view.log} human={human} />
        </aside>
      </div>

      <footer className="bottom-strip">
        <div className="hand-cards">
          {me.hand.map((c) => {
            const playable = d?.kind === 'playCard' && d.side === human;
            const k = cardKind(c);
            return (
              <div key={c} className={`hand-slot ${ui.selCard === c ? 'is-selected' : ''} ${playable ? 'is-playable' : ''}`}>
                <CardView
                  kind={k}
                  size="sm"
                  selected={ui.selCard === c}
                  disabled={!playable}
                  onClick={() => playable && setUi({ ...ui, selCard: ui.selCard === c ? null : c })}
                  onHover={(hv) => setUi((u) => ({ ...u, hoverCard: hv ? c : u.hoverCard === c ? null : u.hoverCard }))}
                />
              </div>
            );
          })}
        </div>
        {ui.hoverCard !== null && me.hand.includes(ui.hoverCard) && (
          <div className="card-preview">
            <CardView kind={cardKind(ui.hoverCard)} size="lg" />
          </div>
        )}
        {prompt && (
            <div className={`prompt-bar ${prompt.tone ? `tone-${prompt.tone}` : ''}`}>
              <div className="prompt-text">
                <div className="prompt-title">{prompt.title}</div>
                {prompt.text && <div className="prompt-sub" title={prompt.text}>{prompt.text}</div>}
                {view.error && <div className="prompt-err">{view.error}</div>}
              </div>
              <div className="prompt-buttons">{prompt.buttons}</div>
            </div>
          )}
      </footer>

      <HoverTip active={!!hoverInfo}>
        {hoverInfo?.u && (
          <>
            <div className="tip-head">
              <svg width={46} height={46} viewBox="-25 -27 50 50"><UnitIcon type={hoverInfo.u.type} faction={s.players[hoverInfo.u.side].faction} size={42} /></svg>
              <div>
                <div className="tip-title">{s.players[hoverInfo.u.side].army} {unitTypeName(hoverInfo.u.type)}</div>
                <div className="tip-sub">{hoverInfo.u.blocks}/{hoverInfo.u.maxBlocks} blocks · {UNIT_STATS[hoverInfo.u.type].cls}{UNIT_STATS[hoverInfo.u.type].mounted ? ' mounted' : ' foot'}</div>
              </div>
            </div>
            {unitSummary(hoverInfo.u).map((x) => <div key={x} className="tip-line">{x}</div>)}
          </>
        )}
        {hoverInfo?.l && <div className="tip-line tip-leader">Leader: {hoverInfo.l.name || 'unnamed'}{leaderUnit(s, hoverInfo.l) ? ' (attached)' : ' (alone)'}</div>}
        {hoverInfo?.terr && <div className="tip-line tip-terrain">Terrain: {hoverInfo.terr}</div>}
      </HoverTip>

      {d && d.side === human && (d.kind === 'rally' || d.kind === 'spartacus') && (
        <AssignDialog state={s} side={human} kind={d.kind} faces={d.faces} onChange={setAssignFocus} onDone={(ids) => answer({ kind: 'assign', ids })} error={view.error} />
      )}

      <Modal open={showRules} title="Rules Reference" onClose={() => setShowRules(false)} width={880}>
        <RulesReference />
      </Modal>

      <Modal open={confirmExit} title="Leave the battle?" onClose={() => setConfirmExit(false)}>
        <p className="modal-p">Your battle is saved automatically — you can continue it from the main menu.</p>
        <div className="modal-buttons">
          <Button onClick={onExit}>Return to menu</Button>
          <Button variant="secondary" onClick={() => setConfirmExit(false)}>Keep fighting</Button>
        </div>
      </Modal>

      <Modal open={!!view.over} title={view.over ? (view.over.winner === human ? 'Victory!' : view.over.winner === 'draw' ? 'A Draw' : 'Defeat') : ''}>
        {view.over && (
          <div className="victory">
            <p className="modal-p">{view.over.reason}.</p>
            <p className="modal-p">Banners — {me.army}: {me.banners} · {them.army}: {them.banners} · Turns played: {s.turn.number}</p>
            <div className="modal-buttons">
              <Button onClick={onExit}>Return to menu</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** Units that charged (warriors) and still must close combat. */
function mustCharge(s: GameState, ready: string[]): string[] {
  return ready.filter((id) => {
    const op = s.turn.ordered[id];
    return op?.mustBattle && op.battlesLeft > 0 && battleTargets(s, id).some((t) => t.kind === 'close');
  });
}

/** Floating unit tooltip that follows the mouse without re-rendering the game screen. */
function HoverTip({ active, children }: { active: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -1000, y: -1000 });
  useEffect(() => {
    const place = () => {
      const el = ref.current;
      if (!el) return;
      el.style.left = `${Math.min(pos.current.x + 18, window.innerWidth - 300)}px`;
      el.style.top = `${Math.min(pos.current.y + 18, window.innerHeight - 220)}px`;
    };
    const on = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      place();
    };
    window.addEventListener('mousemove', on);
    place();
    return () => window.removeEventListener('mousemove', on);
  }, [active]);
  if (!active) return null;
  return <div className="hover-tip" ref={ref} style={{ left: pos.current.x + 18, top: pos.current.y + 18 }}>{children}</div>;
}

const LogPanel = memo(function LogPanel({ log, human }: { log: LogLine[]; human: Side }) {
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

function AssignDialog(p: { state: GameState; side: Side; kind: 'rally' | 'spartacus'; faces: DieFace[]; error: string | null; onChange: (ids: string[]) => void; onDone: (ids: (string | null)[]) => void }) {
  const { state: s, side, faces } = p;
  const [ids, setIds] = useState<(string | null)[]>(() => suggest());
  useEffect(() => {
    p.onChange(ids.filter((x): x is string => !!x));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  function where(h: HexId) {
    const secs = sectionsOf(h, side);
    const sec = secs.length === 2 ? `${secs[0]}/${secs[1]}` : secs[0];
    const r = Math.floor(h / 13);
    const depth = side === 'bottom' ? 8 - r : r;
    return `${sec}${depth === 0 ? ', rear' : depth >= 3 ? ', forward' : ''}`;
  }
  function options(face: DieFace): { id: string; label: string }[] {
    if (p.kind === 'rally') {
      return rallyCandidates(s, side)
        .filter((u) => face === 'leader' || UNIT_STATS[u.type].cls === face)
        .map((u) => ({ id: u.id, label: `${unitTypeName(u.type)} (${u.blocks}/${u.maxBlocks}) — ${where(u.hex)}` }));
    }
    if (face === 'flag' || face === 'swords') return [];
    const units = unitsOf(s, side).filter((u) => face === 'leader' || UNIT_STATS[u.type].cls === face).map((u) => ({ id: u.id, label: `${unitTypeName(u.type)} (${u.blocks}/${u.maxBlocks}) — ${where(u.hex)}` }));
    const leaders = face === 'leader' ? leadersOf(s, side).map((l) => ({ id: l.id, label: `Leader ${l.name || ''} — ${where(l.hex)}` })) : [];
    return [...units, ...leaders];
  }
  function suggest(): (string | null)[] {
    const out: (string | null)[] = [];
    for (let i = 0; i < faces.length; i++) {
      const opts = options(faces[i]);
      let chosen: string | null = null;
      for (const o of opts) {
        const trial = [...out, o.id, ...Array(faces.length - i - 1).fill(null)];
        const err = p.kind === 'rally' ? validateRally(s, side, faces, trial) : validateSpartacus(s, side, faces, trial);
        if (!err) { chosen = o.id; break; }
      }
      out.push(chosen);
    }
    return out;
  }
  const err = p.kind === 'rally' ? validateRally(s, side, faces, ids) : validateSpartacus(s, side, faces, ids);
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

export { pieceHexOf };
