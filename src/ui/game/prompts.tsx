// The prompt bar of the game screen: for the human's pending decision (one function per decision kind), the title, the
// explanation and the buttons; while the computer plays, what it is doing.
import type { Dispatch, SetStateAction } from 'react';
import {
  CARD_DEFS, OFF_BOARD, UNIT_STATS, ambushAvailable, ambushSections, battleReady, battleTargets, cardKind, eligiblePieces, isLeaderId,
  leaderById, movablePieces, orderLimit, orderMode, pieceHex, pieceMoves, rollingFirePaths, selectionMode, unitById, validateDiceOrders,
  validateOrders,
  type Answer, type Decision, type DieFace, type GameState, type RetreatOption, type SectionName, type Side,
} from '../../engine';
import { BLOCK_COLORS, unitTypeName } from '../../art';
import { Button } from '../kit';
import type { GameController, ViewState } from './controller';
import { FACE_WORDS, counterAttackNote, diceTurnText, firstOrderDie } from './diceOrders';
import {
  ambushTexts, attackDice, commandBlocks, commandById, commandFallbackNote, effectiveKind, expectedHits, leadershipHint,
  placeUnitPrompt, possessive, retreatEliminates, rollingFireStep, selectAllUnits, type UiSel,
} from './uiModel';

/** What the prompt bar shows. `tone`: 'warn' or 'danger' colouring; `dice`: dice drawn before the text (310). */
export interface Prompt {
  title: string;
  text: string;
  buttons: JSX.Element[];
  tone?: string;
  dice?: DieFace[];
}

/** What the prompts read from the game screen and act on. */
export interface PromptCtx {
  controller: GameController;
  view: ViewState;
  /** The displayed state (`view.display`). */
  s: GameState;
  human: Side;
  ai: Side;
  /** 117 Asculum: the side placing its leaders before the first turn, null once deployment is over. */
  deploying: Side | null;
  /** The leader of the battle's ambush reserve (005, 206). */
  ambushLeader: string | undefined;
  ui: UiSel;
  setUi: Dispatch<SetStateAction<UiSel>>;
  /** chooseCommand (210): the command whose units are marked on the board. */
  setCmdFocus: Dispatch<SetStateAction<string | null>>;
  answer: (a: Answer) => void;
  onExit: () => void;
}

type D<K extends Decision['kind']> = Extract<Decision, { kind: K }>;

const SECTION_LABEL: Record<SectionName, string> = { left: 'Left', center: 'Center', right: 'Right' };

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

function btn(label: string, onClick: () => void, opts: { variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; key?: string; title?: string } = {}) {
  return (
    <Button key={opts.key ?? label} variant={opts.variant ?? 'primary'} disabled={opts.disabled} onClick={onClick} title={opts.title}>
      {label}
    </Button>
  );
}

/** Units that charged (warriors) and still must close combat. */
export function mustCharge(s: GameState, ready: string[]): string[] {
  return ready.filter((id) => {
    const op = s.turn.ordered[id];
    return op?.mustBattle && op.battlesLeft > 0 && battleTargets(s, id).some((t) => t.kind === 'close');
  });
}

/** The prompt bar's content: null once the battle is over, and while the computer decides something that shows nothing. */
export function gamePrompt(c: PromptCtx): Prompt | null {
  const { view, s, human, ai, deploying } = c;
  const d = view.pending;
  if (view.over) return null;
  if (!d && view.fatal) {
    return { title: 'The battle stalled', text: view.error ?? 'An unexpected error occurred.', buttons: [<Button key="menu" onClick={c.onExit}>Return to menu</Button>], tone: 'danger' };
  }
  if (!d) {
    if (deploying) return { title: deploying === human ? 'Deployment' : `${s.players[deploying].commander} is placing his leaders…`, text: '', buttons: [] };
    // the computer's dice-order turn (310): what it rolled, and what it did with the dice
    const dt = view.diceTurn;
    if (dt && dt.side === ai && s.active === ai && dt.turn === s.turn.number) {
      return {
        title: view.aiThinking ? `${s.players[ai].commander} is considering…` : `${s.players[ai].army} turn`,
        text: diceTurnText(dt, s.turn.phase !== 'orders'),
        buttons: [],
        dice: dt.faces,
      };
    }
    if (view.aiThinking) return { title: `${s.players[ai].commander} is considering…`, text: '', buttons: [] };
    return { title: s.active === human ? 'Resolving…' : `${s.players[ai].army} turn`, text: '', buttons: [] };
  }
  if (d.side !== human) return null;
  switch (d.kind) {
    case 'playCard':
      return playCardPrompt(c);
    case 'orders':
      return ordersPrompt(c, d);
    case 'move':
      return movePrompt(c, d);
    case 'battle':
      return battlePrompt(c);
    case 'defend':
      return defendPrompt(c, d);
    case 'ignoreFlags':
      return ignoreFlagsPrompt(c, d);
    case 'retreat':
      return retreatPrompt(c, d);
    case 'leaderEvade':
      return leaderEvadePrompt(c, d);
    case 'momentum':
      return momentumPrompt(c, d);
    case 'cavalryExtra':
      return { title: 'Cavalry pursuit', text: 'Your cavalry may move one more hex (purple) before a bonus attack.', buttons: [btn('Stay here', () => c.answer({ kind: 'hex', hex: null }), { variant: 'secondary' })] };
    case 'bonusCombat':
      return { title: 'Bonus combat', text: 'Click a red target to attack again, or decline.', buttons: [btn('No bonus attack', () => c.answer({ kind: 'hex', hex: null }), { variant: 'secondary' })] };
    case 'chooseCommand':
      return chooseCommandPrompt(c, d);
    case 'rally':
    case 'spartacus':
      return { title: d.kind === 'rally' ? 'Rally' : 'I Am Spartacus', text: 'Assign the dice in the dialog.', buttons: [] };
    case 'diceOrders':
      return diceOrdersPrompt(c, d);
    case 'diceVictim':
      // dice orders (310, §18.10): the side chooses the victims of its own flags and swords
      return d.face === 'flag'
        ? {
          title: 'Flag rolled: choose a unit to retreat',
          text: 'Click one of your units (purple). It falls back as for one flag, which cannot be ignored; each hex it cannot take costs a block.',
          buttons: [],
          tone: 'warn',
        }
        : {
          title: 'Swords rolled: choose a unit to lose a block',
          text: 'Click one of your units (purple). It loses one block; a leader with it checks for a casualty.',
          buttons: [],
          tone: 'warn',
        };
    case 'placeLeader':
      return placeLeaderPrompt(c, d);
    case 'placeUnit':
      // a forced placement (308): the reinforcement waits off the board until it is placed
      return { ...placeUnitPrompt(s, d), buttons: [] };
    default:
      return null;
  }
}

/** The undo button of a move or a leader placement, when the last answer may be taken back. */
function undoButton(c: PromptCtx, d: Decision): JSX.Element | null {
  return c.view.canUndo
    ? btn(d.kind === 'placeLeader' ? 'Undo placement' : 'Undo move', () => c.controller.undo(), { variant: 'ghost', key: 'undo' })
    : null;
}

function playCardPrompt(c: PromptCtx): Prompt {
  const { s, human, ui } = c;
  const sel = ui.selCard;
  const def = sel !== null ? CARD_DEFS[cardKind(sel)] : null;
  let note = 'Hover a card to see which troops it can order.';
  if (sel !== null) {
    const eff = effectiveKind(s, human, sel);
    // an enemy that orders by dice (310) plays no card: Counter Attack copies nothing
    if (cardKind(sel) === 'counterAttack') note = counterAttackNote(s, human) ?? (eff.kind ? `Copies the enemy's ${CARD_DEFS[eff.kind].title}.` : 'The enemy has played nothing to copy.');
    else if (cardKind(sel) === 'firstStrike') note = 'First Strike is a reaction card: playing it now has no effect.';
    else note = def!.text;
  }
  const buttons = sel !== null ? [btn(`Play ${def!.title}`, () => c.answer({ kind: 'playCard', card: sel }))] : [];
  // a forced placement (308) just made can be taken back until the card is played
  if (c.view.canUndo) buttons.push(btn('Undo placement', () => c.controller.undo(), { variant: 'ghost', key: 'undo' }));
  return { title: 'Choose a command card', text: note, buttons };
}

function ordersPrompt(c: PromptCtx, d: D<'orders'>): Prompt {
  const { s, human, ui, setUi } = c;
  const def = CARD_DEFS[d.card];
  const err = validateOrders(s, human, d.card, ui.orderSel);
  const ambush = ambushAvailable(s, human, d.card);
  // 304 (§18.5): the mode of the selection's command; null while the commands' modes differ and none is named yet
  const mode = selectionMode(s, human, d.card, ui.orderSel)?.mode ?? null;
  const fallback = commandFallbackNote(s, human, d.card, ui.orderSel);
  const all = eligiblePieces(s, human, d.card);
  const n = ui.orderSel.length;
  const limit = orderLimit(s, human, d.card, ui.orderSel);
  const max = limit === null ? null : Math.min(limit, all.length);
  const count = max === null ? `${n}` : `${n}/${max}`;
  const buttons = [
    btn(n ? `Confirm ${count} order${(max ?? n) > 1 ? 's' : ''}` : 'Order nothing', () => c.answer({ kind: 'orders', pieces: ui.orderSel }), { disabled: !!err, variant: n ? 'primary' : 'secondary', key: 'confirm' }),
  ];
  if (n) buttons.push(btn('Clear', () => setUi({ ...ui, orderSel: [] }), { variant: 'ghost' }));
  const allUnits = n === 0 ? selectAllUnits(s, human, d.card) : null;
  if (allUnits) buttons.push(btn('Select all', () => setUi({ ...ui, orderSel: allUnits }), { variant: 'secondary' }));
  const amb = ambush ? ambushTexts(s, c.ambushLeader) : null;
  // every fixed entry hex (308) is occupied: no unit could enter, so there is nothing to spend the card on
  const noEntry = amb?.free === 0;
  if (amb && !noEntry) {
    // reinforcements with fixed entry hexes (308) enter whatever the section: one button (the engine still takes a section)
    const secs = amb.fixed ? ambushSections(d.card).slice(0, 1) : ambushSections(d.card);
    for (const sec of secs) {
      const label = amb.fixed ? amb.label : `${amb.label}: ${SECTION_LABEL[sec]}`;
      buttons.push(btn(label, () => c.answer({ kind: 'orders', pieces: [], ambushSection: sec }), { variant: 'secondary', key: `amb-${sec}`, title: amb.button }));
    }
  }
  let text = `${def.text} Click your units to order them.`;
  // a command named for Darken the Sky that has no missile units (304) is asked for its 1 unit alone
  if (fallback && (mode === 'one' || orderMode(s, human, d.card).mode === 'auto')) text = fallback;
  else if (mode === 'one') text = `None of your troops fit ${def.title}: order 1 unit of your choice (a normal order, no card bonus).`;
  else if (def.group === 'leadership') text = leadershipHint(s, human, d.card, ui.orderSel);
  else if (fallback) text = `${text} ${fallback}`;
  if (amb?.fixed && !n) text = noEntry ? `${text} The reinforcements cannot enter now: every entry hex is occupied.` : `${text} Or bring in the reinforcements (Entry).`;
  // separate commands (210, §18.5)
  const myCommands = s.special.commands.filter((x) => x.side === human);
  if (myCommands.length > 1) text = `${text} One card orders one army only: ${myCommands.map((x) => x.name).join(' or ')}.`;
  return {
    title: `${def.title}${d.mirrored ? ' (Counter Attack)' : ''}`,
    text: err && ui.orderSel.length ? err : text,
    buttons,
    tone: err && ui.orderSel.length ? 'warn' : undefined,
  };
}

function movePrompt(c: PromptCtx, d: D<'move'>): Prompt {
  const { s, ui, setUi } = c;
  const movers = movablePieces(s, d.stage);
  const sel = ui.selPiece;
  const reserve = movers.filter((id) => (pieceHex(s, id) ?? -1) < 0);
  let text = `${movers.length} ordered piece${movers.length === 1 ? '' : 's'} can still move. Select one, then click a destination.`;
  if (sel) {
    const name = isLeaderId(sel) ? leaderById(s, sel)?.name || 'Leader' : unitTypeName(unitById(s, sel)!.type);
    const moves = pieceMoves(s, sel, d.stage);
    text = d.stage === 2
      ? `${name}: may move again (no further combat this turn).`
      : `${name}: green = may battle after moving, amber = no battle, red = must charge into combat.${
        moves.some((m) => m.hex === OFF_BOARD) ? ` This ${isLeaderId(sel) ? 'leader' : 'unit'} can exit the battlefield.` : ''}`;
  }
  if (reserve.length) text = ambushTexts(s, c.ambushLeader).move;
  const buttons = [btn(d.stage === 2 ? 'Finish second move' : 'End movement', () => c.answer({ kind: 'endMove' }), { variant: 'secondary' })];
  for (const id of reserve) {
    const label = isLeaderId(id) ? leaderById(s, id)?.name || 'leader' : unitTypeName(unitById(s, id)!.type);
    buttons.unshift(btn(`Place ${label}`, () => setUi({ ...ui, selPiece: id }), { variant: id === sel ? 'primary' : 'secondary', key: `res-${id}` }));
  }
  if (sel && pieceMoves(s, sel, d.stage).some((m) => m.hex === OFF_BOARD)) {
    buttons.unshift(btn('Exit the battlefield', () => c.answer({ kind: 'move', piece: sel, to: OFF_BOARD }), { variant: 'secondary' }));
  }
  const undo = undoButton(c, d);
  if (undo) buttons.push(undo);
  return { title: d.stage === 2 ? 'Move-Fire-Move: second move' : 'Movement', text, buttons };
}

function battlePrompt(c: PromptCtx): Prompt {
  const { s, ui, setUi } = c;
  const ready = battleReady(s);
  const must = mustCharge(s, ready);
  if (ui.selPiece && ui.rollPath) {
    // Rolling Fire (210, §18.5): the player picks the path hex by hex
    const u = unitById(s, ui.selPiece)!;
    const { next } = rollingFireStep(s, ui.selPiece, ui.rollPath);
    return {
      title: 'Rolling Fire',
      text: `Click the ${ui.rollPath.length ? 'next' : 'first'} hex down the hill (dashed orange). Every unit in the path, friend or foe, is rolled 2 dice (only its own symbol hits, no flag ignored); then your ${unitTypeName(u.type)} loses 1 block.${next.length === 1 ? ' Only one way on.' : ''}`,
      buttons: [btn('Cancel', () => setUi({ ...ui, rollPath: null }), { variant: 'secondary', key: 'roll-cancel' })],
    };
  }
  let text = `${ready.length} unit${ready.length === 1 ? '' : 's'} can battle. Select a unit, then its target.`;
  const canRoll = !!ui.selPiece && rollingFirePaths(s, ui.selPiece).length > 0;
  if (ui.selPiece) {
    const u = unitById(s, ui.selPiece)!;
    text = `${unitTypeName(u.type)}: red = close combat, orange = ranged fire.`;
    if (canRoll) {
      text = battleTargets(s, ui.selPiece).length
        ? `${unitTypeName(u.type)}: red = close combat, orange = ranged fire — or roll burning logs down the hill (Rolling Fire).`
        : `${unitTypeName(u.type)}: may roll burning logs down the hill (Rolling Fire), costing it 1 block.`;
    }
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
  const buttons = [btn('End battles', () => c.answer({ kind: 'endBattle' }), { variant: 'secondary', disabled: must.length > 0 })];
  if (canRoll && !must.length) {
    buttons.unshift(btn('Rolling Fire', () => setUi({ ...ui, rollPath: [] }), { variant: 'secondary', key: 'roll', title: 'Roll burning logs down the hill: 2 dice against every unit in the path, then this unit loses 1 block' }));
  }
  return { title: 'Battle', text, buttons };
}

function defendPrompt(c: PromptCtx, d: D<'defend'>): Prompt {
  const { s } = c;
  const a = unitById(s, d.attacker)!;
  const t = unitById(s, d.target)!;
  const dice = attackDice(s, a, t.hex, 'close', d.bonus ? 'bonus' : 'attack');
  const buttons = [btn('Stand and fight', () => c.answer({ kind: 'defend', choice: 'stand' }), { variant: d.canEvade ? 'secondary' : 'primary' })];
  if (d.canEvade) buttons.unshift(btn('Evade', () => c.answer({ kind: 'defend', choice: 'evade' }), { title: 'Fall back 2 hexes; only matching unit symbols can hit you.' }));
  if (d.canFirstStrike) buttons.push(btn('Play First Strike!', () => c.answer({ kind: 'defend', choice: 'firstStrike' }), { variant: 'secondary' }));
  return {
    title: 'Under attack!',
    text: `Enemy ${UNIT_STATS[a.type].name} (${dice} ${dice === 1 ? 'die' : 'dice'}) attacks your ${UNIT_STATS[t.type].name}. ${d.canEvade ? 'Evading: only ' + UNIT_STATS[t.type].cls + ' symbols can hit, and you cannot battle back.' : ''}`,
    buttons,
    tone: 'danger',
  };
}

function ignoreFlagsPrompt(c: PromptCtx, d: D<'ignoreFlags'>): Prompt {
  const u = unitById(c.s, d.unit)!;
  const st = UNIT_STATS[u.type];
  const buttons: JSX.Element[] = [];
  for (let k = d.max; k >= 0; k--) {
    const left = d.flags - k;
    const label = left === 0 ? (k === 1 ? 'Hold firm (ignore the flag)' : `Hold firm (ignore ${k})`) : k === 0 ? `Retreat (${left} flag${left > 1 ? 's' : ''})` : `Ignore ${k}, retreat for ${left}`;
    buttons.push(btn(label, () => c.answer({ kind: 'ignoreFlags', count: k }), { variant: k === d.max ? 'primary' : 'secondary', key: `f${k}` }));
  }
  return { title: `${d.flags} flag${d.flags > 1 ? 's' : ''} against your ${st.name}`, text: `Bolstered morale lets this unit ignore up to ${d.max}. Each flag you accept forces a retreat of ${st.retreat} hex${st.retreat > 1 ? 'es' : ''}.`, buttons };
}

function retreatPrompt(c: PromptCtx, d: D<'retreat'>): Prompt {
  const { s } = c;
  const uh = pieceHex(s, d.unit) ?? -1;
  // last-row retreat (214): short of hexes on its own baseline row, the unit is eliminated
  const lost = (o: RetreatOption) => retreatEliminates(s, d, o);
  const lbl = (o: RetreatOption, i: number) =>
    o.end === uh
      ? `Stay (${lost(o) ? 'eliminated' : `lose ${o.losses}`})`
      : `Option ${i + 1}: ${o.path.length} hex${o.path.length > 1 ? 'es' : ''}${o.losses ? (lost(o) ? ', eliminated' : `, lose ${o.losses}`) : ''}${o.attachLeader ? ', join leader' : ''}`;
  const blocked = d.options[0]?.losses
    ? d.options.every(lost)
      ? ' The path is blocked on your baseline row: the unit will be eliminated (last-row retreat).'
      : d.options.some(lost)
        ? ` The path is blocked: ${d.options[0].losses} block(s) will be lost — or the whole unit, where a retreat ends on your baseline row ("Lost").`
        : ` The path is blocked: ${d.options[0].losses} block(s) will be lost.`
    : '';
  return {
    title: d.reason === 'evade' ? 'Evade' : 'Retreat',
    text: `Click a purple hex to choose where your ${unitById(s, d.unit) ? UNIT_STATS[unitById(s, d.unit)!.type].name : 'unit'} ends up.${blocked}`,
    buttons: d.options.length <= 4
      ? d.options.map((o, i) => (
        <Button key={`o${i}`} variant="ghost" onClick={() => c.answer({ kind: 'choose', index: i })} onMouseEnter={() => c.setUi((u) => ({ ...u, hoverHex: o.end }))}>
          {lbl(o, i)}
        </Button>
      ))
      : [],
  };
}

function leaderEvadePrompt(c: PromptCtx, d: D<'leaderEvade'>): Prompt {
  const l = leaderById(c.s, d.leader);
  const buttons: JSX.Element[] = [];
  d.options.forEach((o, i) => {
    if (o.offBoard) buttons.push(btn('Leave the battlefield', () => c.answer({ kind: 'choose', index: i }), { variant: 'secondary', key: 'off' }));
  });
  return { title: `${l?.name || 'Your leader'} must evade`, text: 'Click a purple hex (joining a friendly unit is safest). Passing through enemy units risks capture.', buttons };
}

function momentumPrompt(c: PromptCtx, d: D<'momentum'>): Prompt {
  const u = unitById(c.s, d.unit)!;
  return {
    title: 'Momentum advance',
    text: d.bonus
      ? 'Your bonus attack succeeded. Advance into the vacated hex (no further attack this turn)?'
      : `Your ${UNIT_STATS[u.type].name} won the combat. Advance into the vacated hex?${UNIT_STATS[u.type].cavalry ? ' Cavalry may then move one more hex and attack again.' : ''}`,
    buttons: [btn('Advance', () => c.answer({ kind: 'yesno', yes: true })), btn('Hold position', () => c.answer({ kind: 'yesno', yes: false }), { variant: 'secondary' })],
  };
}

function chooseCommandPrompt(c: PromptCtx, d: D<'chooseCommand'>): Prompt {
  const { s, human, setCmdFocus } = c;
  // separate commands (210, §18.5): one card acts for one command; hovering or focusing a button marks its units
  const focus = (id: string) => () => setCmdFocus(id);
  const unfocus = (id: string) => () => setCmdFocus((f) => (f === id ? null : f));
  // 304 (§18.5): a command with no units that fit the card (Darken the Sky's missile units) orders 1 unit instead
  const eff = s.turn.effective;
  const fb = eff ? commandFallbackNote(s, human, eff, []) : null;
  return {
    title: 'Which command?',
    text: `One card orders one army only. Choose the command ${eff ? CARD_DEFS[eff].title : 'this card'} acts for.${fb ? ` ${fb}` : ''}`,
    buttons: d.options.map((id, i) => {
      const cmd = commandById(s, id);
      const col = cmd ? BLOCK_COLORS[commandBlocks(s, cmd)].edge : undefined;
      return (
        <Button
          key={`cmd-${id}`}
          variant={i === 0 ? 'primary' : 'secondary'}
          onClick={() => c.answer({ kind: 'choose', index: i })}
          onMouseEnter={focus(id)}
          onMouseLeave={unfocus(id)}
          onFocus={focus(id)}
          onBlur={unfocus(id)}
        >
          {col && <span className="cmd-swatch" style={{ background: col }} aria-hidden />}
          {`${possessive(cmd?.name ?? id)} command`}
        </Button>
      );
    }),
  };
}

function diceOrdersPrompt(c: PromptCtx, d: D<'diceOrders'>): Prompt {
  const { s, human, ui, setUi } = c;
  // dice orders (310, §18.10): each die orders a piece clicked on the board, or is left unused
  const ids = ui.diceIds ?? d.faces.map(() => null);
  const err = validateDiceOrders(s, human, d.faces, ids);
  const n = ids.filter(Boolean).length;
  const i = ui.diceActive ?? null;
  const text = i !== null
    ? `Die ${i + 1}, ${FACE_WORDS[d.faces[i]]}: click a highlighted ${d.faces[i] === 'leader' ? 'leader (his unit comes with him)' : 'unit'} to order it. Click an ordered piece again to free its die; unused dice are lost.`
    : n
      ? 'Every die that can order is used. Click an ordered piece to free its die, or confirm.'
      : 'No die can order anything now. Confirm to go on.';
  const buttons = [
    btn(n ? `Confirm ${n} order${n > 1 ? 's' : ''}` : 'Order nothing', () => c.answer({ kind: 'assign', ids }), { disabled: !!err, key: 'confirm' }),
  ];
  if (n) buttons.push(btn('Clear', () => setUi({ ...ui, diceIds: d.faces.map(() => null), diceActive: firstOrderDie(s, human, d.faces) }), { variant: 'ghost', key: 'clear' }));
  return { title: 'Order dice: choose the units', text: err && n ? err : text, buttons, tone: err && n ? 'warn' : undefined };
}

function placeLeaderPrompt(c: PromptCtx, d: D<'placeLeader'>): Prompt {
  const { s, human } = c;
  const l = leaderById(s, d.leader);
  const undo = undoButton(c, d);
  // 308: a reserve leader joins one of the units of his force that entered this turn
  if (!s.special.unplaced.includes(d.leader)) {
    return { title: `Place ${l?.name || 'your leader'}`, text: 'Click one of the units that entered (gold) to attach him.', buttons: undo ? [undo] : [] };
  }
  const more = s.special.unplaced.filter((id) => id !== d.leader && leaderById(s, id)?.side === human).length;
  return {
    title: `Place ${l?.name || 'your leader'}`,
    text: `Before the battle: click one of your units (gold) to attach him, or any faintly marked empty hex where he stands alone.${more ? ` ${more} more to place after him.` : ''}`,
    buttons: undo ? [undo] : [],
  };
}
