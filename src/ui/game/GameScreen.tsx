import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  CARD_DEFS, UNIT_STATS, battleReady, battleTargets, cardKind, eligiblePieces, isLeaderId, leaderAt, leaderById, leaderUnit, movablePieces,
  orderDice, other, pieceHex, pieceMoves, unitAt, unitsOf,
  type Answer, type Decision, type GameState, type HexId, type Side,
} from '../../engine';
import { UnitIcon, unitTypeName } from '../../art';
import { BannerTrack, Button, CardBack, CardView, DiceTray, DieView, Modal, Panel } from '../kit';
import { scenarioArt } from '../terrain';
import { BattleResult } from './BattleResult';
import { Board } from './Board';
import type { GameController } from './controller';
import { AssignDialog, DiceTurnPanel, HoverTip, LogPanel } from './panels';
import { gamePrompt, mustCharge } from './prompts';
import { diceAssignClick, firstOrderDie } from './diceOrders';
import { bannerCounts, objectiveTipLines } from './objectiveText';
import { IMMOBILE_TIP, boardUi, commandTipLine, deploymentSide, enteredTipLine, forcedMarchLine, rollingFireStep, type UiSel } from './uiModel';
import { leaderTraitLines, unitSummary } from './unitText';
import { TerrainTipBlock } from './TerrainTipBlock';
import { terrainTip } from './terrainTips';
import { RulesReference } from '../screens/RulesReference';
import { HistoryButton } from '../history/HistoryDialog';
import { isMuted, setMuted } from '../sound';
import { opponentPersonality } from './makeOpponent';
import './game.css';

const EMPTY_SEL: UiSel = { selCard: null, hoverCard: null, orderSel: [], selPiece: null, hoverHex: null, rollPath: null };

const DIFF_LABEL = { recruit: 'Recruit', tribune: 'Tribune', consul: 'Consul' } as const;

export function GameScreen({ controller, onExit, onRematch }: {
  controller: GameController;
  onExit: () => void;
  /** After the battle: play it again, with the same or switched sides. */
  onRematch?: (switchSides: boolean) => void;
}) {
  const view = useSyncExternalStore(controller.subscribe, controller.getView);
  const s = view.display;
  const human = view.humanSide;
  const ai = other(human);
  const flipped = human === 'top';
  const d = view.pending;
  // 117 Asculum: leaders are placed before the first turn (null once deployment is over)
  const deploying = deploymentSide(s);
  const [ui, setUi] = useState<UiSel>(EMPTY_SEL);
  const [showRules, setShowRules] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [mutedState, setMutedState] = useState(isMuted());
  const [assignFocus, setAssignFocus] = useState<string[]>([]);
  // chooseCommand (210): the command whose button is hovered, its units marked on the board
  const [cmdFocus, setCmdFocus] = useState<string | null>(null);

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
        setUi((u) => ({ ...u, selPiece: null, selCard: null, rollPath: null }));
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
    setCmdFocus(null);
    if (d?.kind === 'move' && d.side === human) {
      const movers = movablePieces(s, d.stage);
      const reserve = movers.find((id) => (pieceHex(s, id) ?? -1) < 0);
      if (reserve) setUi((u) => ({ ...u, selPiece: reserve }));
      else if (movers.length === 1) setUi((u) => ({ ...u, selPiece: movers[0] }));
    }
    if (d?.kind === 'battle' && d.side === human) {
      const ready = battleReady(s);
      const must = mustCharge(s, ready);
      if (must.length) setUi((u) => ({ ...u, selPiece: must[0] }));
      else if (ready.length === 1) setUi((u) => ({ ...u, selPiece: ready[0] }));
    }
    // dice orders (310): nothing assigned yet, the first die that can order something selected
    if (d?.kind === 'diceOrders' && d.side === human) {
      setUi((u) => ({ ...u, diceIds: d.faces.map(() => null), diceActive: firstOrderDie(s, human, d.faces) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);

  const answer = (a: Answer) => controller.answer(a);
  // the battle's hex art (217's coast played as a ford) and the leader of its ambush reserve (005, 206)
  const hexArt = scenarioArt(controller.scenario.id);
  const ambushLeader = controller.scenario.setup.reserveLeaders[0]?.name;

  const bui = useMemo(() => {
    const b = boardUi(s, d, ui, human);
    if (d && d.side === human && (d.kind === 'rally' || d.kind === 'spartacus')) {
      for (const id of assignFocus) {
        const h = pieceHex(s, id) ?? -1;
        if (h >= 0) b.highlights.set(h, 'selected');
      }
    }
    if (d && d.side === human && d.kind === 'chooseCommand' && cmdFocus) {
      for (const u of unitsOf(s, human)) if (u.command === cmdFocus) b.highlights.set(u.hex, 'eligible');
    }
    return b;
  }, [s, d, ui, human, assignFocus, cmdFocus]);

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
        if (ui.selPiece && ui.rollPath) {
          // Rolling Fire: extend the path; it is sent as soon as it is complete
          const { next } = rollingFireStep(s, ui.selPiece, ui.rollPath);
          if (!next.includes(h)) {
            controller.notice('Choose one of the highlighted hexes.');
            return;
          }
          const path = [...ui.rollPath, h];
          if (rollingFireStep(s, ui.selPiece, path).complete) answer({ kind: 'rollingFire', unit: ui.selPiece, path });
          else setUi({ ...ui, rollPath: path });
          return;
        }
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
      case 'placeLeader':
      case 'placeUnit':
        if (d.options.includes(h)) answer({ kind: 'hex', hex: h });
        return;
      case 'diceVictim': {
        // dice orders (310): the unit a flag or swords face of the own order roll falls on
        const i = u ? d.options.indexOf(u.id) : -1;
        if (i >= 0) answer({ kind: 'choose', index: i });
        else if (u || l) controller.notice('Choose one of your units (purple).');
        return;
      }
      case 'diceOrders': {
        // dice orders (310): the selected die orders the piece clicked (a leader first when it is a helmet)
        const helmet = ui.diceActive !== undefined && ui.diceActive !== null && d.faces[ui.diceActive] === 'leader';
        const ids = [u?.side === human ? u.id : null, l?.side === human ? l.id : null];
        for (const id of helmet ? [...ids].reverse() : ids) if (id && assignDie(d, id)) return;
        if (ids.some(Boolean)) controller.notice('None of the dice can order that piece.');
        return;
      }
      default:
        return;
    }
  };

  /** Dice orders (310): assign (or free) a die for piece `id`; false when no die can order it. */
  const assignDie = (d: Extract<Decision, { kind: 'diceOrders' }>, id: string): boolean => {
    const r = diceAssignClick(s, human, d.faces, ui.diceIds ?? d.faces.map(() => null), ui.diceActive ?? null, id);
    if (!r) return false;
    setUi({ ...ui, diceIds: r.ids, diceActive: r.active });
    return true;
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
    if (d.kind === 'diceOrders') return assignDie(d, id);
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
  const prompt = gamePrompt({ controller, view, s, human, ai, deploying, ambushLeader, ui, setUi, setCmdFocus, answer, onExit });

  // ------------------------------------------------------------------ hover tooltip
  const hoverInfo = useMemo(() => {
    if (ui.hoverHex === null) return null;
    const h = ui.hoverHex;
    const u = unitAt(s, h);
    const l = leaderAt(s, h);
    const terr = terrainTip(s, h, flipped, hexArt[h]);
    const obj = objectiveTipLines(s, h);
    if (!u && !l && !terr && !obj.length) return null;
    return { u, l, terr, obj };
  }, [ui.hoverHex, s, flipped, hexArt]);

  const me = s.players[human];
  const them = s.players[ai];
  // banner totals: permanent banners plus those held through objectives (§18.4)
  const meBanners = bannerCounts(s, human);
  const themBanners = bannerCounts(s, ai);
  const persona = useMemo(() => opponentPersonality(controller.config), [controller]);

  return (
    <div className="game-root">
      <header className="game-top">
        <div className="game-title">
          <span className="gt-name">{controller.scenario.name}</span>
          <span className="gt-year">{controller.scenario.year}</span>
        </div>
        <div className="game-turn">
          {deploying ? (
            <>Deployment · <span className={`side-chip side-${deploying === human ? 'me' : 'them'}`}>{s.players[deploying].army}</span></>
          ) : (
            <>
              Turn {s.turn.number} · <span className={`side-chip side-${s.active === human ? 'me' : 'them'}`}>{s.players[s.active].army}</span>
              {view.aiThinking && <span className="thinking-dots">thinking</span>}
            </>
          )}
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
          <HistoryButton scenario={controller.scenario} flipped={flipped} />
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
            <div
              className={`turn-toast ${view.toast.kind === 'notice' ? 'toast-notice' : ''}`}
              key={view.toast.id}
              {...(view.toast.kind === 'notice' ? { role: 'status', 'aria-live': 'polite' as const } : {})}
            >
              {view.toast.text}
            </div>
          )}
          {view.cardShow && (
            <div className="card-show" key={view.cardShow.id}>
              <div className="card-show-label">{s.players[view.cardShow.side].commander} plays</div>
              <CardView kind={view.cardShow.kind} size="lg" />
            </div>
          )}
          {view.orderShow && (
            // dice orders (310): the computer's order roll, shown as its played cards are
            <div className="card-show order-show" key={view.orderShow.id}>
              <div className="card-show-label">{s.players[view.orderShow.side].commander} rolls the order dice</div>
              <div className="order-show-dice">
                {view.orderShow.faces.map((f, i) => <DieView key={i} face={f} size={64} />)}
              </div>
            </div>
          )}
        </section>

        <aside className="side-col">
          <Panel className="army-panel">
            <div className="army-row">
              <div>
                <div className="army-name them">{them.army}</div>
                <div className="army-cmd" title={`${them.commander} — ${persona.name}: ${persona.epithet} · ${DIFF_LABEL[controller.config.difficulty]} · ${commandLabel(s, ai)}`}>{them.commander} · {persona.name} · {DIFF_LABEL[controller.config.difficulty]}</div>
              </div>
              {orderDice(s, ai) ? (
                // dice orders (310): the enemy holds no cards at all, so no Counter Attack can copy its turn
                <div className="ai-dice" title={`The ${them.army} army holds no cards: it rolls ${orderDice(s, ai)} order dice each turn. Counter Attack has nothing to copy.`}>
                  <span className="ai-dice-label">No cards</span>
                  {(view.diceTurn?.side === ai ? view.diceTurn.faces : []).map((f, i) => <DieView key={i} face={f} size={20} />)}
                </div>
              ) : (
                <div className="ai-hand" title={`${them.hand.length} command cards`}>
                  {Array.from({ length: them.hand.length }).map((_, i) => <CardBack key={i} size="sm" style={{ fontSize: '1.7px', marginLeft: i ? -9 : 0 }} />)}
                </div>
              )}
            </div>
            <BannerTrack count={themBanners.total} held={themBanners.held} target={s.bannersToWin} blockColor={s.players[human].blocks} label="Banners won" />
            <div className="divider" />
            <div className="army-row">
              <div>
                <div className="army-name me">{me.army} <span className="you">(you)</span></div>
                <div className="army-cmd">{me.commander} · {commandLabel(s, human)}</div>
              </div>
            </div>
            <BannerTrack count={meBanners.total} held={meBanners.held} target={s.bannersToWin} blockColor={s.players[ai].blocks} label="Banners won" />
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
        {orderDice(s, human) > 0 && (
          <DiceTurnPanel
            state={s}
            side={human}
            dice={orderDice(s, human)}
            turn={view.diceTurn}
            pending={d}
            ids={ui.diceIds}
            active={ui.diceActive ?? null}
            onSelect={(i) => setUi({ ...ui, diceActive: i })}
          />
        )}
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
              {prompt.dice && (
                <div className="prompt-dice" aria-hidden>
                  {prompt.dice.map((f, i) => <DieView key={i} face={f} size={30} />)}
                </div>
              )}
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
              <svg width={46} height={46} viewBox="-25 -27 50 50"><UnitIcon type={hoverInfo.u.type} look={s.players[hoverInfo.u.side].look} blockColor={s.players[hoverInfo.u.side].blocks} size={42} elite={hoverInfo.u.elite} /></svg>
              <div>
                <div className="tip-title">{s.players[hoverInfo.u.side].army} {unitTypeName(hoverInfo.u.type)}</div>
                <div className="tip-sub">{hoverInfo.u.blocks}/{hoverInfo.u.maxBlocks} blocks · {UNIT_STATS[hoverInfo.u.type].cls}{UNIT_STATS[hoverInfo.u.type].mounted ? ' mounted' : ' foot'}</div>
              </div>
            </div>
            {unitSummary(hoverInfo.u).map((x) => <div key={x} className="tip-line">{x}</div>)}
            {unitStateLines(s, hoverInfo.u).map((x) => <div key={x} className="tip-line tip-state">{x}</div>)}
            {commandTipLine(s, hoverInfo.u) && <div className="tip-line tip-command">{commandTipLine(s, hoverInfo.u)}</div>}
          </>
        )}
        {hoverInfo?.l && <div className="tip-line tip-leader">Leader: {hoverInfo.l.name || 'unnamed'}{leaderUnit(s, hoverInfo.l) ? ' (attached)' : ' (alone)'}</div>}
        {hoverInfo?.l && leaderTraitLines(hoverInfo.l).map((x) => <div key={x} className="tip-line tip-leader">{x}</div>)}
        {/* a leader of a separate command (304): his command, as a unit's (said once when his unit is of the same command) */}
        {hoverInfo?.l && commandTipLine(s, hoverInfo.l) && hoverInfo.l.command !== hoverInfo.u?.command && (
          <div className="tip-line tip-command">{commandTipLine(s, hoverInfo.l)}</div>
        )}
        {hoverInfo?.terr && <TerrainTipBlock tip={hoverInfo.terr} alone={!hoverInfo.u && !hoverInfo.l} />}
        {hoverInfo?.obj.map((x) => <div key={x} className="tip-line tip-objective">{x}</div>)}
      </HoverTip>

      {d && d.side === human && (d.kind === 'rally' || d.kind === 'spartacus') && (
        <AssignDialog state={s} side={human} kind={d.kind} faces={d.faces} command={d.command} onChange={setAssignFocus} onDone={(ids) => answer({ kind: 'assign', ids })} error={view.error} />
      )}

      <Modal open={showRules} title="Rules Reference" onClose={() => setShowRules(false)} width={880}>
        <RulesReference scenario={controller.scenario} />
      </Modal>

      <Modal open={confirmExit} title="Leave the battle?" onClose={() => setConfirmExit(false)}>
        <p className="modal-p">Your battle is saved automatically — you can continue it from the main menu.</p>
        <div className="modal-buttons">
          <Button onClick={onExit}>Return to menu</Button>
          <Button variant="secondary" onClick={() => setConfirmExit(false)}>Keep fighting</Button>
        </div>
      </Modal>

      <Modal open={!!view.over} title={view.over ? (view.over.winner === human ? 'Victory!' : view.over.winner === 'draw' ? 'A Draw' : 'Defeat') : ''}>
        {view.over && <BattleResult
          state={s} human={human} over={view.over} onExit={onExit} onRematch={onRematch} firstLeg={controller.config.firstLeg}
        />}
      </Modal>
    </div>
  );
}

/**
 * Tooltip lines of a unit's Expansion #3 state: immobile (306), entered from the reserve this turn (308), Caesar's forced
 * march with it (§18.3).
 */
function unitStateLines(s: GameState, u: NonNullable<ReturnType<typeof unitAt>>): string[] {
  return [u.immobile ? IMMOBILE_TIP : null, enteredTipLine(s, u), forcedMarchLine(s, u)].filter((x): x is string => !!x);
}

/** A side's Command, or its order dice when it orders by dice (310, §18.10). */
function commandLabel(s: GameState, side: Side): string {
  const dice = orderDice(s, side);
  return dice ? `Orders by ${dice} dice` : `Command ${s.players[side].command}`;
}
