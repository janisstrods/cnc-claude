// Game session controller: owns the engine driver, runs the AI, and turns engine events into paced animations.
import {
  CARD_DEFS, CARD_LIST, GameDriver, OFF_BOARD, TERRAIN_NAMES, UNIT_STATS, bannerTotal, cardKind, cloneState, createGame, freshSeed,
  heldBanners, isLeaderId, leaderById, orderDice, other, randomAnswer, rallyCandidates, unitAt, unitById,
  type Answer, type CardKind, type Decision, type DieFace, type GameEvent, type GameOptions, type GameState, type HexId, type Leader,
  type QueuedEvent, type RollPurpose, type Side, type Unit,
} from '../../engine';
import { SCENARIOS, scenarioById } from '../../scenarios';
import type { Opponent } from './opponent';
import { FACE_WORDS, currentDiceTurn, diceRollSummary, diceTurnOrders, diceTurnVictim, pieceName, type DiceTurn } from './diceOrders';
import { sfx } from '../sound';

export type Difficulty = 'recruit' | 'tribune' | 'consul';

export interface SessionConfig {
  scenarioId: string;
  humanSide: Side;
  difficulty: Difficulty;
  seed: number;
  /** Personality id override (optional). */
  personality?: string;
  /** Dev/testing: card kinds dealt into the human's opening hand. */
  devCards?: CardKind[];
  /** Optional rules chosen in the briefing (Tactical Flexibility, §17.3); absent = the scenario's defaults. */
  options?: GameOptions;
  /** The second battle of a both-sides match (started with Switch sides): how the first one ended. */
  firstLeg?: LegResult;
}

/** How a finished battle ended, kept to sum up a both-sides match. */
export interface LegResult {
  /** The army the human commanded. */
  humanSide: Side;
  /** Banners each side had won (objective banners included). */
  banners: Record<Side, number>;
  winner: Side | 'draw';
}

export function legResult(state: GameState, humanSide: Side, winner: Side | 'draw'): LegResult {
  const won = (side: Side) => Math.max(0, bannerTotal(state, side));
  return { humanSide, banners: { top: won('top'), bottom: won('bottom') }, winner };
}

export interface SavedGame {
  version: 1;
  /** Engine/scenario data version: saves from another version are discarded. */
  engine?: number;
  config: SessionConfig;
  answers: Answer[];
  savedAt: number;
  /** Consistency check for the replay. */
  check?: { n: number; rngCalls: number };
}

/** Bump when engine rules or scenario data change in a way that breaks replays of old saves. */
export const ENGINE_VERSION = 2;

export interface LogLine {
  id: number;
  text: string;
  side?: Side;
  kind: 'info' | 'card' | 'combat' | 'result' | 'banner' | 'say' | 'turn' | 'victory';
}

export interface DiceShow {
  id: number;
  title: string;
  subtitle: string;
  faces: DieFace[];
  scoring: boolean[];
  rolling: boolean;
  purpose: RollPurpose;
}

export interface Flash {
  id: number;
  hex: HexId;
  text: string;
  kind: 'hit' | 'flag' | 'banner' | 'info' | 'rally';
}

export interface CardShow {
  id: number;
  kind: CardKind;
  side: Side;
}

export interface ViewState {
  display: GameState;
  pending: Decision | null; // decision awaiting the human
  humanSide: Side;
  log: LogLine[];
  dice: DiceShow | null;
  flashes: Flash[];
  cardShow: CardShow | null;
  /** Position overrides while a piece walks along a path. */
  walking: Record<string, HexId>;
  /** Combat highlight: attacker and target hexes. */
  combat: { from: HexId; to: HexId } | null;
  aiThinking: boolean;
  error: string | null;
  over: { winner: Side | 'draw'; reason: string } | null;
  canUndo: boolean;
  speed: number; // 1 = normal, 2 = fast, 0.6 = slow
  /** Centre-board announcement: 'turn' = "Your turn"; 'notice' = a longer message (a lost command card). */
  toast: { id: number; text: string; kind?: 'turn' | 'notice' } | null;
  /** Dice orders (310, §18.10): the current or last dice-order turn (the roll and what its dice were used for). */
  diceTurn: DiceTurn | null;
  /** The computer's order roll shown on the board, as its played cards are (310). */
  orderShow: { id: number; side: Side; faces: DieFace[] } | null;
  /** The game loop failed and cannot continue. */
  fatal: boolean;
}

const SAVE_KEY = 'cca-autosave-v1';

export function loadSaved(): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedGame;
    const ok = !!s && s.version === 1 && s.engine === ENGINE_VERSION && typeof s.config?.scenarioId === 'string' &&
      Array.isArray(s.answers) && SCENARIOS.some((x) => x.id === s.config.scenarioId);
    if (!ok) {
      clearSaved();
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function clearSaved() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The opening position of a session: the scenario with the chosen optional rules (also when a save is replayed, so the
 * replay sees the same rules), plus any dev opening hand.
 */
export function initialState(config: SessionConfig): GameState {
  const initial = createGame(scenarioById(config.scenarioId).setup, config.seed, config.options);
  if (config.devCards?.length) {
    const hand = initial.players[config.humanSide].hand;
    config.devCards.forEach((k, i) => {
      const id = initial.deck.findIndex((c) => CARD_LIST[c] === k);
      if (id >= 0 && i < hand.length) {
        const card = initial.deck.splice(id, 1)[0];
        initial.deck.push(hand[i]);
        hand[i] = card;
      }
    });
  }
  return initial;
}

let seq = 1;

export class GameController {
  readonly config: SessionConfig;
  driver: GameDriver;
  view: ViewState;
  private listeners = new Set<() => void>();
  private opponent: Opponent;
  private busy = false;
  private disposed = false;
  private skipAnim = false;
  /** Toasts waiting for the notice on the board to run its full time (see `toast`). */
  private toastQueue: { text: string; kind: 'turn' | 'notice'; ms: number; stale?: () => boolean }[] = [];
  /**
   * Held banners per side as the log last told them (§18.4). The engine updates both sides before it emits either `held`
   * event, so the display before the second event already has its new count: the change is measured against this.
   */
  private shownHeld: Record<Side, number> = { top: 0, bottom: 0 };
  /** The turn whose "Your turn" toast has been shown: once per turn, also when its first decision is taken back. */
  private toldTurn = -1;
  /**
   * The human's forced placement (308) while it might be taken back: the answers recorded with it, the dice rolled before
   * it, and the id the next log line will get (the log is capped, so a line's place in it is no stable index: the lines
   * of the placement are those with an id from `logId` on).
   */
  private placement: { n: number; rng: number; logId: number } | null = null;

  constructor(config: SessionConfig, opponent: Opponent, answers: Answer[] = [], check?: SavedGame['check']) {
    this.config = config;
    this.opponent = opponent;
    const sc = scenarioById(config.scenarioId);
    const initial = initialState(config);
    if (answers.length) {
      this.driver = GameDriver.replay(initial, answers, { snapshots: true });
      if (check && (this.driver.answers.length !== check.n || this.driver.state.rngCalls !== check.rngCalls)) {
        throw new Error('incompatible save');
      }
    } else {
      this.driver = new GameDriver(initial, { snapshots: true });
    }
    let speed = 1;
    try {
      speed = Number(localStorage.getItem('cca-speed') ?? '1') || 1;
    } catch {
      /* ignore */
    }
    this.view = {
      display: cloneState(this.driver.state),
      pending: null,
      humanSide: config.humanSide,
      log: [],
      dice: null,
      flashes: [],
      cardShow: null,
      walking: {},
      combat: null,
      aiThinking: false,
      error: null,
      over: null,
      canUndo: false,
      speed,
      toast: null,
      diceTurn: null,
      orderShow: null,
      fatal: false,
    };
    // a new game's turn-start events are still queued: they are measured from the opening position
    this.syncHeld(answers.length ? this.driver.state : initial);
    if (answers.length) this.addLog({ text: 'Battle resumed from your last save.', kind: 'info' });
    else {
      this.addLog({ text: `${sc.name} (${sc.year}).`, kind: 'turn' });
      this.addLog({ text: `The ${this.driver.state.players[this.driver.state.first].army} army moves first.`, kind: 'info' });
    }
    if (answers.length) this.driver.drainEvents();
    this.run();
  }

  private run() {
    this.pump().catch((e) => this.fail(e));
  }

  private fail(e: unknown) {
    console.error('Game loop failed', e);
    this.busy = false;
    const msg = e instanceof Error ? e.message : String(e);
    this.set({ aiThinking: false, pending: null, error: `The battle could not continue: ${msg}`, fatal: true });
  }

  // ---------------------------------------------------------------- subscription
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getView = () => this.view;
  /** Dev helper: answer the pending human decision with a random legal answer. */
  autoAnswer() {
    if (this.view.pending) this.answer(randomAnswer(this.driver.state, this.view.pending, Math.random));
  }
  private set(patch: Partial<ViewState>) {
    this.view = { ...this.view, ...patch };
    for (const l of this.listeners) l();
  }

  dispose() {
    this.disposed = true;
    this.opponent.dispose();
    this.listeners.clear();
  }

  setSpeed(speed: number) {
    try {
      localStorage.setItem('cca-speed', String(speed));
    } catch {
      /* ignore */
    }
    this.set({ speed });
  }

  /** Skip the remaining animations of the current batch. */
  hurry() {
    this.skipAnim = true;
  }

  private dur(ms: number) {
    if (this.skipAnim) return 0;
    return ms / (this.view.speed || 1);
  }

  /** The held banners the log has told, taken from `s` (wherever the display is resynced without its events). */
  private syncHeld(s: GameState) {
    this.shownHeld = { top: heldBanners(s, 'top'), bottom: heldBanners(s, 'bottom') };
  }

  private addLog(l: Omit<LogLine, 'id'>) {
    const log = [...this.view.log, { ...l, id: seq++ }];
    if (log.length > 400) log.splice(0, log.length - 400);
    this.set({ log });
  }

  private save() {
    if (this.disposed) return;
    try {
      const s: SavedGame = {
        version: 1, engine: ENGINE_VERSION, config: this.config, answers: this.driver.answers, savedAt: Date.now(),
        check: { n: this.driver.answers.length, rngCalls: this.driver.state.rngCalls },
      };
      if (this.driver.state.winner) clearSaved();
      else localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch {
      /* storage unavailable: ignore */
    }
  }

  // ---------------------------------------------------------------- human input
  answer(a: Answer) {
    if (!this.view.pending || this.busy || this.view.fatal) return;
    const d = this.view.pending;
    const dice = this.diceNote(d, a);
    const placing = d.kind === 'placeUnit' ? this.driver.state.rngCalls : null;
    let ok: boolean;
    try {
      ok = this.driver.answer(a);
    } catch (e) {
      console.error(e);
      // the generator is dead: rebuild it from the recorded answers
      this.driver = GameDriver.replay(this.driver.initial, this.driver.answers, { snapshots: true });
      this.syncHeld(this.driver.state);
      this.set({ error: 'That order could not be resolved — try another.', pending: this.driver.pending, display: cloneState(this.driver.state), canUndo: this.undoable(this.driver.pending) });
      return;
    }
    if (!ok) {
      this.set({ error: this.driver.lastError });
      return;
    }
    this.placement = placing === null ? null : { n: this.driver.answers.length, rng: placing, logId: seq };
    this.diceTold(d, a, dice);
    this.set({ pending: null, error: null });
    this.save();
    this.run();
  }

  /**
   * May the human take back the last answer now: a move while moving, a leader placement while deploying (Asculum), a
   * forced placement (308) while choosing the card that follows it?
   */
  private undoable(d: Decision | null): boolean {
    return ((d?.kind === 'move' || d?.kind === 'placeLeader') && this.driver.canUndo()) || this.placementUndoable(d);
  }

  /**
   * A forced placement (308, §18.9) may be taken back until the card is played: it is a free choice that rolls no dice
   * and reveals nothing (the turn-start objectives come before it, and the hand was already known), so replaying the game
   * without it is safe. The driver's `canUndo` covers only moves and leader placements, so the same conditions are checked
   * here: the placement was the last answer, its side is still deciding, and no die has been rolled since.
   */
  private placementUndoable(d: Decision | null): boolean {
    const p = this.placement;
    return !!p && !!d && d.side === this.config.humanSide && this.driver.answers.length === p.n && this.driver.state.rngCalls === p.rng;
  }

  undo() {
    const placed = this.placementUndoable(this.driver.pending) ? this.placement : null;
    if (!(this.driver.canUndo() || placed) || this.busy) return;
    this.placement = null;
    // the lines the placement logged go with it
    if (placed) this.set({ log: this.view.log.filter((l) => l.id < placed.logId) });
    this.driver = this.driver.undo();
    this.driver.drainEvents();
    this.syncHeld(this.driver.state);
    const p = this.driver.pending;
    this.set({ display: cloneState(this.driver.state), pending: p && p.side === this.config.humanSide ? p : null, canUndo: this.undoable(p), error: null, walking: {} });
    this.save();
    if (p && p.side !== this.config.humanSide) this.run();
  }

  // ---------------------------------------------------------------- main loop
  private async pump() {
    if (this.busy || this.disposed) return;
    this.busy = true;
    try {
      for (;;) {
        await this.playEvents();
        if (this.disposed) return;
        const st = this.driver.state;
        if (st.winner || !this.driver.pending) {
          if (!st.winner) throw new Error('the battle ended without a winner');
          const winner = st.winner;
          this.set({ over: { winner, reason: st.winReason }, pending: null, display: cloneState(st), aiThinking: false });
          if (winner === this.config.humanSide) sfx.victory();
          else sfx.defeat();
          this.save();
          return;
        }
        const d = this.driver.pending;
        if (d.side === this.config.humanSide) {
          // a forced placement (308) comes before the card: the turn starts with it
          if (d.kind === 'playCard' || d.kind === 'placeUnit') this.yourTurn(st.turn.number);
          const combat = d.kind === 'defend'
            ? { from: this.hexOf(d.attacker, st), to: this.hexOf(d.target, st) }
            : d.kind === 'battle' || d.kind === 'move' || d.kind === 'playCard' || d.kind === 'orders' ? null : this.view.combat;
          this.set({ pending: d, display: cloneState(st), canUndo: this.undoable(d), aiThinking: false, combat });
          return;
        }
        // AI decision
        this.set({ aiThinking: true });
        const t0 = performance.now();
        let res: { answer: Answer; say?: string };
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          res = await Promise.race([
            this.opponent.decide(cloneState(st), d),
            new Promise<never>((_, rej) => {
              // Last-resort guard (the AI client has its own in-thread fallback). If the page was frozen
              // (e.g. a backgrounded tab) the timer fires late: give the AI a little more time instead.
              const limit = 90000;
              let due = Date.now() + limit;
              const arm = (ms: number) => {
                timer = setTimeout(() => {
                  const late = Date.now() - due;
                  if (late > 2000) {
                    due = Date.now() + 5000;
                    arm(5000);
                  } else rej(new Error('AI timeout'));
                }, ms);
              };
              arm(limit);
            }),
          ]);
        } catch (e) {
          console.error('AI failed', e);
          res = { answer: randomAnswer(st, d, Math.random) };
        } finally {
          clearTimeout(timer);
        }
        if (this.disposed) return;
        const minThink = d.kind === 'playCard' ? 700 : d.kind === 'move' || d.kind === 'battle' ? 260 : 150;
        const spent = performance.now() - t0;
        if (spent < this.dur(minThink)) await sleep(this.dur(minThink) - spent);
        if (this.disposed) return;
        if (res.say) this.addLog({ text: res.say, side: d.side, kind: 'say' });
        const dice = this.diceNote(d, res.answer);
        if (this.driver.answer(res.answer)) this.diceTold(d, res.answer, dice);
        else {
          console.warn('AI answer rejected', this.driver.lastError, res.answer, d);
          let ok = false;
          for (let i = 0; i < 30 && !ok; i++) {
            const a = randomAnswer(this.driver.state, this.driver.pending!, Math.random);
            const note = this.diceNote(d, a);
            ok = this.driver.answer(a);
            if (ok) this.diceTold(d, a, note);
          }
          if (!ok) throw new Error('AI could not produce a legal answer');
        }
        this.save();
      }
    } finally {
      this.busy = false;
      this.skipAnim = false;
    }
  }

  // ---------------------------------------------------------------- animation
  private async playEvents() {
    const evs = this.driver.drainEvents();
    for (const q of evs) {
      if (this.disposed) return;
      await this.animate(q);
    }
    this.skipAnim = false;
  }

  /**
   * Leader or unit `id` of `s`, else as the board last showed it: a piece the events being played have removed from `s` is
   * still on the display.
   */
  private piece(id: string, s: GameState): Leader | Unit | undefined {
    const shown = this.view.display;
    if (isLeaderId(id)) return leaderById(s, id) ?? shown.leaders.find((x) => x.id === id);
    return unitById(s, id) ?? shown.units.find((x) => x.id === id);
  }

  /** "Roman Heavy Infantry", a leader's name ("Leader" when he has none), or "unit"/"Leader" for a piece not found. */
  private name(id: string, s: GameState): string {
    const p = this.piece(id, s);
    if (!p) return isLeaderId(id) ? 'Leader' : 'unit';
    return 'type' in p ? `${s.players[p.side].army} ${UNIT_STATS[p.type].name}` : p.name || 'Leader';
  }

  private hexOf(id: string, s: GameState): HexId {
    return this.piece(id, s)?.hex ?? OFF_BOARD;
  }

  /**
   * Show a centre-board toast for `ms` (real time: the CSS animation does not follow the game speed). A notice (a lost
   * command card) is never cut short: a toast that comes while one is up waits for it, in order. "Your turn" is dropped
   * if the human has answered by the time it would show.
   */
  private toast(text: string, kind: 'turn' | 'notice', ms: number) {
    let stale: (() => boolean) | undefined;
    if (kind === 'turn') {
      const answers = this.driver.answers.length;
      stale = () => this.driver.answers.length !== answers;
    }
    if (this.view.toast?.kind === 'notice') this.toastQueue.push({ text, kind, ms, stale });
    else this.showToast(text, kind, ms);
  }

  /**
   * Tell the human, on the board, why a click did nothing (a short notice toast). The same notice is never stacked, so a
   * player who keeps clicking does not queue it up.
   */
  notice(text: string) {
    if (this.view.toast?.text === text || this.toastQueue.some((q) => q.text === text)) return;
    this.toast(text, 'notice', 2000);
  }

  /** "Your turn", once per turn: at the human's first decision of it, or as a dice side's turn begins (310). */
  private yourTurn(turn: number) {
    if (this.toldTurn === turn) return;
    this.toldTurn = turn;
    sfx.turn();
    this.toast('Your turn', 'turn', 1400);
  }

  /**
   * Dice orders (310, §18.10): the dice-order turn as it will stand once `a` answers `d` (the victim of a flag or swords,
   * or the orders given), named from the state before the answer; null for any other decision.
   */
  private diceNote(d: Decision, a: Answer): DiceTurn | null {
    // the roll on record, or, in a battle resumed from its save mid-turn, the turn started from the decision
    const t = currentDiceTurn(this.driver.state, d.side, this.view.diceTurn, d);
    if (!t) return null;
    if (d.kind === 'diceVictim' && a.kind === 'choose') {
      const id = d.options[a.index];
      return id ? diceTurnVictim(t, d.face, pieceName(this.driver.state, id)) : null;
    }
    if (d.kind === 'diceOrders' && a.kind === 'assign' && Array.isArray(a.ids)) return diceTurnOrders(this.driver.state, t, a.ids);
    return null;
  }

  /** After an accepted answer: keep the dice-order turn up to date; dice left unused are told in the log. */
  private diceTold(d: Decision, a: Answer, note: DiceTurn | null) {
    if (!note) return;
    this.set({ diceTurn: note });
    if (d.kind === 'diceOrders' && a.kind === 'assign' && !a.ids.some(Boolean)) {
      this.addLog({ text: `The ${this.driver.state.players[d.side].army} army leaves its order dice unused.`, side: d.side, kind: 'info' });
    }
  }

  private showToast(text: string, kind: 'turn' | 'notice', ms: number) {
    const toast = { id: seq++, text, kind };
    this.set({ toast });
    setTimeout(() => {
      if (this.view.toast?.id !== toast.id) return;
      let next = this.toastQueue.shift();
      while (next?.stale?.()) next = this.toastQueue.shift();
      if (next) this.showToast(next.text, next.kind, next.ms);
      else this.set({ toast: null });
    }, ms);
  }

  /** Remove the flashes still showing on a hex (so a new one does not overlap them). */
  private clearFlashes(hex: HexId) {
    if (this.view.flashes.some((f) => f.hex === hex)) this.set({ flashes: this.view.flashes.filter((f) => f.hex !== hex) });
  }

  private flash(hex: HexId, text: string, kind: Flash['kind']) {
    if (hex < 0) return;
    const f: Flash = { id: seq++, hex, text, kind };
    this.set({ flashes: [...this.view.flashes, f] });
    setTimeout(() => this.set({ flashes: this.view.flashes.filter((x) => x.id !== f.id) }), 1500 / (this.view.speed || 1));
  }

  private async walk(id: string, path: HexId[], stepMs: number) {
    const steps = path.filter((h) => h >= 0);
    for (let i = 1; i < steps.length; i++) {
      if (!this.skipAnim) sfx.march();
      this.set({ walking: { ...this.view.walking, [id]: steps[i] } });
      await sleep(this.dur(stepMs));
    }
  }

  private async animate(q: QueuedEvent) {
    const e: GameEvent = q.e;
    const after = q.state!;
    const before = this.view.display;
    const human = this.config.humanSide;
    switch (e.t) {
      case 'turnStart': {
        const p = after.players[e.side];
        this.addLog({ text: `Turn ${e.turn} — ${p.army}${e.side === human ? ' (you)' : ''}`, side: e.side, kind: 'turn' });
        this.set({ display: after, combat: null });
        // a side with dice orders (310) has no card to choose: its turn starts with the roll
        if (e.side === human && orderDice(after, human)) this.yourTurn(e.turn);
        break;
      }
      case 'cardPlayed': {
        const def = CARD_DEFS[e.kind];
        let eff = e.effective !== e.kind ? ` → ${CARD_DEFS[e.effective].title}` : '';
        // Counter Attack against a side that orders by dice (310): no card to copy
        if (e.kind === 'counterAttack' && after.turn.effective === null && orderDice(after, other(e.side))) eff = ': nothing to copy, no orders';
        this.addLog({ text: `${after.players[e.side].commander} plays ${def.title}${eff}.`, side: e.side, kind: 'card' });
        sfx.card();
        if (e.side !== human) {
          this.set({ display: after, cardShow: { id: seq++, kind: e.kind, side: e.side } });
          await sleep(this.dur(1600));
          this.set({ cardShow: null });
        } else this.set({ display: after });
        break;
      }
      case 'ordered': {
        if (e.ids.length === 0 && e.side !== human) this.addLog({ text: 'No units could be ordered.', side: e.side, kind: 'info' });
        // dice orders (310): what the dice ordered
        if (e.ids.length && orderDice(after, e.side)) {
          const names = e.ids.map((id) => (isLeaderId(id) ? leaderById(after, id)?.name || 'a leader' : UNIT_STATS[unitById(after, id)?.type ?? 'LI'].name));
          this.addLog({ text: `The ${after.players[e.side].army} army orders: ${names.join(', ')}.`, side: e.side, kind: 'info' });
        }
        this.set({ display: after });
        if (e.side !== human) await sleep(this.dur(350));
        break;
      }
      case 'move':
      case 'retreat':
      case 'evade':
      case 'advance':
      case 'leaderEvade': {
        const path = e.path;
        const stepMs = e.t === 'move' ? 230 : 190;
        // walk on the 'before' display, then commit
        await this.walk(e.id, path, stepMs);
        const walking = { ...this.view.walking };
        delete walking[e.id];
        this.set({ display: after, walking });
        // a reserve leader (308) placed straight onto a unit of his force that entered (not Mago in 005 or Marcellus in 206: they enter alone)
        if (e.t === 'move' && after.special.ambush?.attachLeader && isLeaderId(e.id) && (leaderById(before, e.id)?.hex ?? OFF_BOARD) < 0 && path.length === 1) this.arrives(e.id, path[0], after);
        if (e.t === 'retreat' && path.length > 1) this.addLog({ text: `${this.name(e.id, after)} retreats ${Math.max(0, path.length - 1)} hex${path.length === 2 ? '' : 'es'}.`, side: this.sideOf(e.id, after), kind: 'result' });
        if (e.t === 'evade') this.flash(path[path.length - 1], 'Evaded', 'info');
        if (e.t === 'leaderEvade' && e.offBoard) this.addLog({ text: `${this.name(e.id, before)} escapes the battlefield.`, kind: 'result' });
        break;
      }
      case 'reserveEnter': {
        this.set({ display: after });
        // reinforcements on fixed entry hexes (308) are no ambush
        this.flash(e.hex, after.special.ambush?.entryHexes ? 'Arrives!' : 'Ambush!', 'banner');
        break;
      }
      case 'combat': {
        const from = this.hexOf(e.attacker, after);
        const to = this.hexOf(e.target, after);
        const verb: Record<string, string> = {
          close: 'attacks', ranged: 'fires on', battleBack: 'battles back against', firstStrike: 'strikes first at', bonus: 'presses on into',
          evade: 'attacks', escape: 'tries to catch', rampage: 'tramples', rollingFire: 'rolls burning logs onto',
        };
        if (e.purpose === 'close' || e.purpose === 'bonus' || e.purpose === 'battleBack' || e.purpose === 'firstStrike') sfx.clash();
        if (e.purpose !== 'evade') {
          this.addLog({ text: `${this.name(e.attacker, after)} ${verb[e.purpose] ?? 'attacks'} ${this.name(e.target, after)} (${e.dice} ${e.dice === 1 ? 'die' : 'dice'}).`, side: this.sideOf(e.attacker, after), kind: 'combat' });
        }
        this.set({ display: after, combat: from >= 0 && to >= 0 ? { from, to } : null });
        await sleep(this.dur(e.purpose === 'battleBack' ? 300 : 420));
        break;
      }
      case 'roll': {
        const title = this.rollTitle(e.purpose, e.by, e.against, after);
        const id = seq++;
        const sub = this.rollSummary(e.purpose, e.faces, e.scoring, after);
        if (e.purpose === 'diceOrders') this.orderRoll(e.faces, after);
        sfx.dice(e.faces.length);
        this.set({ dice: { id, title, subtitle: 'Rolling…', faces: e.faces, scoring: e.scoring, rolling: true, purpose: e.purpose } });
        await sleep(this.dur(650));
        this.set({ dice: { id, title, subtitle: sub, faces: e.faces, scoring: e.scoring, rolling: false, purpose: e.purpose }, display: after });
        await sleep(this.dur(e.purpose === 'marsh' || e.purpose === 'leaderCheck' ? 750 : 1050));
        if (this.view.orderShow) this.set({ orderShow: null });
        break;
      }
      case 'damage': {
        const hex = this.hexOf(e.id, before);
        this.flash(hex, `−${e.amount}`, 'hit');
        sfx.hit();
        this.addLog({ text: `${this.name(e.id, before)} loses ${e.amount} block${e.amount > 1 ? 's' : ''} (${e.reason}).`, side: this.sideOf(e.id, before), kind: 'result' });
        this.set({ display: after });
        await sleep(this.dur(380));
        break;
      }
      case 'eliminated': {
        this.set({ display: after });
        await sleep(this.dur(450));
        break;
      }
      case 'removed': {
        // Leaves the board like an eliminated unit, but no banner is awarded.
        const hex = this.hexOf(e.id, before);
        const side = this.sideOf(e.id, before);
        switch (e.reason) {
          case 'war machine abandoned':
            // it follows the evade at once: replace that hex's "Evaded" rather than stacking on it
            this.clearFlashes(hex);
            this.flash(hex, 'Abandoned', 'info');
            this.addLog({ text: `${this.name(e.id, before)} abandoned (no banner).`, side, kind: 'result' });
            break;
          default:
            this.flash(hex, 'Removed', 'info');
            this.addLog({ text: `${this.name(e.id, before)} removed from the field (no banner).`, side, kind: 'result' });
        }
        this.set({ display: after });
        await sleep(this.dur(450));
        break;
      }
      case 'leaderKilled': {
        const hex = this.hexOf(e.id, before);
        this.flash(hex, 'Leader slain', 'hit');
        this.set({ display: after });
        await sleep(this.dur(600));
        break;
      }
      case 'leaderSafe':
        this.set({ display: after });
        break;
      case 'flags': {
        if (e.ignored > 0) {
          this.flash(this.hexOf(e.id, after), e.ignored >= e.flags ? 'Holds firm!' : `Ignores ${e.ignored}`, 'flag');
          this.addLog({ text: `${this.name(e.id, after)} ignores ${e.ignored} flag${e.ignored > 1 ? 's' : ''}.`, side: this.sideOf(e.id, after), kind: 'result' });
        }
        this.set({ display: after });
        break;
      }
      case 'attach':
        this.set({ display: after });
        break;
      case 'leaderPlaced':
      case 'unitPlaced': {
        // Asculum: a leader placed before the first turn; 308: a reserve leader placed with an entered unit, a forced placement
        const side = this.sideOf(e.id, after);
        if (e.t === 'leaderPlaced' && !before.special.unplaced.includes(e.id)) {
          this.arrives(e.id, e.hex, after);
          if (side !== human) await sleep(this.dur(450));
          break;
        }
        const text = e.t === 'unitPlaced' ? `The ${this.name(e.id, after)} arrives as a reinforcement.` : `${this.name(e.id, after)} takes position.`;
        this.addLog({ text, side, kind: 'info' });
        this.set({ display: after });
        if (side !== human) {
          this.flash(e.hex, this.name(e.id, after), 'info');
          await sleep(this.dur(450));
        }
        break;
      }
      case 'rampage':
        this.flash(this.hexOf(e.id, after), 'Rampage!', 'hit');
        this.set({ display: after });
        await sleep(this.dur(600));
        break;
      case 'rallied':
        this.flash(this.hexOf(e.id, after), `+${e.blocks}`, 'rally');
        this.addLog({ text: `${this.name(e.id, after)} rallies ${e.blocks} block${e.blocks > 1 ? 's' : ''}.`, side: this.sideOf(e.id, after), kind: 'result' });
        this.set({ display: after });
        await sleep(this.dur(450));
        break;
      case 'banner': {
        sfx.banner();
        this.addLog({ text: `The ${after.players[e.side].army} army gains a Victory Banner (${e.total}/${after.bannersToWin}) — ${e.reason}.`, side: e.side, kind: 'banner' });
        this.set({ display: after });
        await sleep(this.dur(500));
        break;
      }
      case 'held': {
        // banners held through objectives (§18.4): gained while a position is held, lost when it lapses
        const army = after.players[e.side].army;
        const change = e.held - this.shownHeld[e.side];
        this.shownHeld[e.side] = e.held;
        const tally = `${e.total}/${after.bannersToWin}`;
        const holds = `holds ${e.held} banner${e.held === 1 ? '' : 's'}`;
        if (change > 0) {
          sfx.banner();
          this.addLog({ text: `${e.reason} The ${army} army ${holds} (${tally}) — held, so it can be lost again.`, side: e.side, kind: 'banner' });
        } else if (change < 0) {
          this.addLog({ text: `The ${army} army loses ${-change} held banner${change < -1 ? 's' : ''} and now ${holds} (${tally}).`, side: e.side, kind: 'banner' });
        } else {
          this.addLog({ text: `The ${army} army ${holds} (${tally}).`, side: e.side, kind: 'banner' });
        }
        this.set({ display: after });
        await sleep(this.dur(change > 0 ? 500 : 350));
        break;
      }
      case 'terrainChanged': {
        // a captured camp removed (§18.4) or a rampart torn down (223): the hex is open ground now. A capture objective's
        // hex is a camp even when it is drawn as a rampart (215's Roman camp): it is razed, not torn down.
        const was = before.terrain[e.hex];
        const isCamp = was === 'camp' || before.special.objectives.some((o) => o.kind === 'capture' && o.remove && o.hexes.includes(e.hex));
        const tornDown = was === 'rampart' && !isCamp;
        const what = isCamp ? 'camp' : TERRAIN_NAMES[was].toLowerCase();
        this.flash(e.hex, tornDown ? 'Torn down' : 'Razed', 'info');
        // a camp on a hill (308, §18.7) leaves the hill
        const left = e.terrain === 'hill' ? 'the hill remains' : 'open ground now';
        this.addLog({ text: `The ${what} ${tornDown ? 'is torn down' : 'is razed'}: ${left}.`, kind: 'info' });
        this.set({ display: after });
        await sleep(this.dur(450));
        break;
      }
      case 'draw':
      case 'reshuffle':
        if (e.t === 'reshuffle') this.addLog({ text: 'The command deck is reshuffled.', kind: 'info' });
        this.set({ display: after });
        break;
      case 'command':
        this.addLog({ text: `The ${after.players[e.side].army} army now holds ${e.command} command cards.`, side: e.side, kind: 'info' });
        this.set({ display: after });
        break;
      case 'cardLost': {
        // Hellespont: a card taken at random from the hand of a side that lost a leader on the opponent's turn. The
        // human sees which of his cards went; the computer's hand stays hidden.
        const army = after.players[e.side].army;
        const title = CARD_DEFS[cardKind(e.card)].title;
        const mine = e.side === human;
        this.addLog({ text: `The ${army} army loses a command card${mine ? ` (${title})` : ''}.`, side: e.side, kind: 'info' });
        this.toast(mine ? `You lose a command card: ${title}` : `${army} loses a command card`, 'notice', 2800);
        this.set({ display: after });
        await sleep(this.dur(1200));
        break;
      }
      case 'log':
        this.addLog({ text: e.text, side: e.side, kind: 'info' });
        this.set({ display: after });
        break;
      case 'victory':
        this.addLog({ text: `Victory: ${e.winner === 'draw' ? 'Draw' : after.players[e.winner].army} — ${e.reason}.`, kind: 'victory' });
        this.set({ display: after });
        break;
      default:
        this.set({ display: after });
    }
  }

  /** A reserve leader arriving with a unit of his force (308, `ambush.attachLeader`): log it and show it on the board. */
  private arrives(id: string, hex: HexId, after: GameState) {
    const u = unitAt(after, hex);
    const side = this.sideOf(id, after);
    this.addLog({ text: `${this.name(id, after)} arrives with the ${u ? this.name(u.id, after) : 'reinforcements'}.`, side, kind: 'info' });
    this.set({ display: after });
    this.flash(hex, this.name(id, after), 'banner');
  }

  /** A dice-order roll (310): a new dice-order turn, the faces in the log, and the computer's roll on the board. */
  private orderRoll(faces: DieFace[], after: GameState) {
    const side = after.active;
    const turn: DiceTurn = { side, turn: after.turn.number, faces, used: faces.map(() => null), done: false };
    this.set({ diceTurn: turn, orderShow: side === this.config.humanSide ? null : { id: seq++, side, faces } });
    this.addLog({ text: `${after.players[side].commander} rolls the order dice: ${faces.map((f) => FACE_WORDS[f]).join(', ')}.`, side, kind: 'card' });
  }

  private sideOf(id: string, s: GameState): Side | undefined {
    return this.piece(id, s)?.side;
  }

  private rollTitle(p: RollPurpose, by: string | null, against: string | null, s: GameState): string {
    const a = by ? this.name(by, s) : '';
    const t = against ? this.name(against, s) : '';
    switch (p) {
      case 'ranged': return `${a} fires`;
      case 'close': return `${a} attacks`;
      case 'bonus': return `${a} — bonus attack`;
      case 'battleBack': return `${a} battles back`;
      case 'firstStrike': return `${a} — First Strike`;
      case 'evade': return `${t} evades`;
      case 'leaderCheck': return `${t} — leader casualty check`;
      case 'escape': return `${t} tries to escape`;
      case 'rampage': return `Elephant rampage vs ${t}`;
      case 'marsh': return `${t} — marsh check`;
      case 'rally': return 'Rally';
      case 'spartacus': return 'I Am Spartacus';
      case 'rollingFire': return `Burning logs roll onto ${t}`;
      case 'diceOrders': return `${s.players[s.active].army} order dice`;
    }
  }

  /** Subtitle of a roll in the dice tray; `after`: the state right after the roll. */
  private rollSummary(p: RollPurpose, faces: DieFace[], scoring: boolean[], after: GameState): string {
    if (p === 'spartacus') {
      if (faces.every((f) => f === 'flag' || f === 'swords')) return 'No effect';
      return this.driver.state.active === this.config.humanSide ? 'Choose units for each symbol' : 'Units ordered';
    }
    // dice orders (310): flags and swords fall on units of the rolling side, the symbols order what they can (§18.10)
    if (p === 'diceOrders') return diceRollSummary(after, after.active, faces, after.active === this.config.humanSide);
    if (p === 'rally') {
      if (!rallyCandidates(this.driver.state, this.driver.state.active).length) return 'No damaged units near a leader';
      return this.driver.state.active === this.config.humanSide ? 'Choose units for each symbol' : 'Blocks restored';
    }
    if (p === 'leaderCheck' || p === 'escape') return faces.filter((f) => f === 'leader').length >= (p === 'leaderCheck' && faces.length === 2 ? 2 : 1) ? 'The leader is hit!' : 'The leader is safe';
    if (p === 'marsh') return scoring.some(Boolean) ? 'Bogged down: 1 block lost' : 'Crossed safely';
    const flags = faces.filter((f, i) => f === 'flag' && scoring[i]).length;
    const hits = scoring.filter(Boolean).length - flags;
    const parts: string[] = [];
    parts.push(hits === 1 ? '1 hit' : `${hits} hits`);
    if (flags) parts.push(flags === 1 ? '1 flag' : `${flags} flags`);
    return parts.join(', ');
  }

  get scenario() {
    return scenarioById(this.config.scenarioId);
  }

  opponentSide(): Side {
    return other(this.config.humanSide);
  }
}

/**
 * Dev shortcut `#/play/<scenario>/<top|bottom>/<recruit|tribune|consul>[/<seed>][?cards=k1,k2]`: the session it starts
 * (any scenario id: base game 001–015, Expansion #1 101–124, Expansion #2 201–223, Expansion #3 301–319), or null when the hash is not such a
 * route or names no known battle.
 */
export function devRouteConfig(hash: string): SessionConfig | null {
  const m = hash.match(/^#\/play\/(\d{3})\/(top|bottom)\/(recruit|tribune|consul)(?:\/(\d+))?/);
  if (!m || !SCENARIOS.some((x) => x.id === m[1])) return null;
  const cfg = newSessionConfig(m[1], m[2] as Side, m[3] as Difficulty);
  if (m[4]) cfg.seed = Number(m[4]);
  const cards = hash.match(/[?&]cards=([a-zA-Z0-9,]+)/);
  if (cards) cfg.devCards = cards[1].split(',') as CardKind[];
  return cfg;
}

export function newSessionConfig(scenarioId: string, humanSide: Side, difficulty: Difficulty, options?: GameOptions): SessionConfig {
  const cfg: SessionConfig = { scenarioId, humanSide, difficulty, seed: freshSeed() };
  if (options && Object.keys(options).length) cfg.options = { ...options };
  return cfg;
}

/**
 * The session for playing a finished battle again: same battle, difficulty and optional rules, a fresh seed. With
 * `switchSides` the human takes the other army and the computer uses its new general's default personality (a
 * personality picked in the briefing was for the old enemy general); dev opening hands are not carried over.
 * Switching sides after a single battle makes the two a match: `finished` goes along, so that the second battle's end
 * can sum up both. A match is two battles, so switching again after the second starts a new one.
 */
export function rematchConfig(config: SessionConfig, switchSides: boolean, finished?: LegResult): SessionConfig {
  const side = switchSides ? other(config.humanSide) : config.humanSide;
  const cfg = newSessionConfig(config.scenarioId, side, config.difficulty, config.options);
  if (cfg.seed === config.seed) cfg.seed = (config.seed + 1) >>> 0;
  if (!switchSides && config.personality) cfg.personality = config.personality;
  if (switchSides && finished && !config.firstLeg) cfg.firstLeg = finished;
  return cfg;
}
