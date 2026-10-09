// Game session controller: owns the engine driver, runs the AI, and turns engine events into paced animations.
import {
  CARD_DEFS, CARD_LIST, GameDriver, OFF_BOARD, UNIT_STATS, cloneState, createGame, freshSeed, leaderById, other, randomAnswer, rallyCandidates, unitById,
  type Answer, type CardKind, type Decision, type DieFace, type GameEvent, type GameState, type HexId, type QueuedEvent, type RollPurpose, type Side,
} from '../../engine';
import { SCENARIOS, scenarioById } from '../../scenarios';
import type { Opponent } from './opponent';
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
  mirrored: boolean;
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
  lastCombatOdds: string | null;
  toast: { id: number; text: string } | null;
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

  constructor(config: SessionConfig, opponent: Opponent, answers: Answer[] = [], check?: SavedGame['check']) {
    this.config = config;
    this.opponent = opponent;
    const sc = scenarioById(config.scenarioId);
    const initial = createGame(sc.setup, config.seed);
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
      lastCombatOdds: null,
      toast: null,
      fatal: false,
    };
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
    let ok: boolean;
    try {
      ok = this.driver.answer(a);
    } catch (e) {
      console.error(e);
      // the generator is dead: rebuild it from the recorded answers
      this.driver = GameDriver.replay(this.driver.initial, this.driver.answers, { snapshots: true });
      this.set({ error: 'That order could not be resolved — try another.', pending: this.driver.pending, display: cloneState(this.driver.state), canUndo: this.driver.canUndo() });
      return;
    }
    if (!ok) {
      this.set({ error: this.driver.lastError });
      return;
    }
    this.set({ pending: null, error: null });
    this.save();
    this.run();
  }

  undo() {
    if (!this.driver.canUndo() || this.busy) return;
    this.driver = this.driver.undo();
    this.driver.drainEvents();
    const p = this.driver.pending;
    this.set({ display: cloneState(this.driver.state), pending: p && p.side === this.config.humanSide ? p : null, canUndo: p?.kind === 'move' && this.driver.canUndo(), error: null, walking: {} });
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
          if (d.kind === 'playCard') {
            sfx.turn();
            const toast = { id: seq++, text: 'Your turn' };
            this.set({ toast });
            setTimeout(() => { if (this.view.toast?.id === toast.id) this.set({ toast: null }); }, 1400);
          }
          const combat = d.kind === 'defend'
            ? { from: this.hexOf(d.attacker, st), to: this.hexOf(d.target, st) }
            : d.kind === 'battle' || d.kind === 'move' || d.kind === 'playCard' || d.kind === 'orders' ? null : this.view.combat;
          this.set({ pending: d, display: cloneState(st), canUndo: d.kind === 'move' && this.driver.canUndo(), aiThinking: false, combat });
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
        if (!this.driver.answer(res.answer)) {
          console.warn('AI answer rejected', this.driver.lastError, res.answer, d);
          let ok = false;
          for (let i = 0; i < 30 && !ok; i++) ok = this.driver.answer(randomAnswer(this.driver.state, this.driver.pending!, Math.random));
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

  private name(id: string, s: GameState): string {
    if (id.startsWith('L')) {
      const l = leaderById(s, id) ?? this.view.display.leaders.find((x) => x.id === id);
      return l ? (l.name || 'Leader') : 'Leader';
    }
    const u = unitById(s, id) ?? this.view.display.units.find((x) => x.id === id);
    if (!u) return 'unit';
    return `${s.players[u.side].army} ${UNIT_STATS[u.type].name}`;
  }

  private hexOf(id: string, s: GameState): HexId {
    if (id.startsWith('L')) return (leaderById(s, id) ?? this.view.display.leaders.find((x) => x.id === id))?.hex ?? OFF_BOARD;
    return (unitById(s, id) ?? this.view.display.units.find((x) => x.id === id))?.hex ?? OFF_BOARD;
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
        break;
      }
      case 'cardPlayed': {
        const def = CARD_DEFS[e.kind];
        const eff = e.effective !== e.kind ? ` → ${CARD_DEFS[e.effective].title}` : '';
        this.addLog({ text: `${after.players[e.side].commander} plays ${def.title}${eff}.`, side: e.side, kind: 'card' });
        sfx.card();
        if (e.side !== human) {
          this.set({ display: after, cardShow: { id: seq++, kind: e.kind, side: e.side, mirrored: false } });
          await sleep(this.dur(1600));
          this.set({ cardShow: null });
        } else this.set({ display: after });
        break;
      }
      case 'ordered': {
        if (e.ids.length === 0 && e.side !== human) this.addLog({ text: 'No units could be ordered.', side: e.side, kind: 'info' });
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
        if (e.t === 'retreat' && path.length > 1) this.addLog({ text: `${this.name(e.id, after)} retreats ${Math.max(0, path.length - 1)} hex${path.length === 2 ? '' : 'es'}.`, side: this.sideOf(e.id, after), kind: 'result' });
        if (e.t === 'evade') this.flash(path[path.length - 1], 'Evaded', 'info');
        if (e.t === 'leaderEvade' && e.offBoard) this.addLog({ text: `${this.name(e.id, before)} escapes the battlefield.`, kind: 'result' });
        break;
      }
      case 'reserveEnter': {
        this.set({ display: after });
        this.flash(e.hex, 'Ambush!', 'banner');
        break;
      }
      case 'combat': {
        const from = this.hexOf(e.attacker, after);
        const to = this.hexOf(e.target, after);
        const verb: Record<string, string> = {
          close: 'attacks', ranged: 'fires on', battleBack: 'battles back against', firstStrike: 'strikes first at', bonus: 'presses on into',
          evade: 'attacks', escape: 'tries to catch', rampage: 'tramples',
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
        const sub = this.rollSummary(e.purpose, e.faces, e.scoring);
        sfx.dice(e.faces.length);
        this.set({ dice: { id, title, subtitle: 'Rolling…', faces: e.faces, scoring: e.scoring, rolling: true, purpose: e.purpose } });
        await sleep(this.dur(650));
        this.set({ dice: { id, title, subtitle: sub, faces: e.faces, scoring: e.scoring, rolling: false, purpose: e.purpose }, display: after });
        await sleep(this.dur(e.purpose === 'marsh' || e.purpose === 'leaderCheck' ? 750 : 1050));
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
        // Leaves the board like an eliminated unit, but no banner is awarded (a war machine abandoned after evading).
        this.flash(this.hexOf(e.id, before), 'Abandoned', 'info');
        this.addLog({ text: `${this.name(e.id, before)}: ${e.reason} (no banner).`, side: this.sideOf(e.id, before), kind: 'result' });
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
      case 'leaderPlaced': {
        // Asculum: a leader placed before the first turn
        const side = this.sideOf(e.id, after);
        this.addLog({ text: `${this.name(e.id, after)} takes position.`, side, kind: 'info' });
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
      case 'draw':
      case 'reshuffle':
        if (e.t === 'reshuffle') this.addLog({ text: 'The command deck is reshuffled.', kind: 'info' });
        this.set({ display: after });
        break;
      case 'command':
        this.addLog({ text: `The ${after.players[e.side].army} army now holds ${e.command} command cards.`, side: e.side, kind: 'info' });
        this.set({ display: after });
        break;
      case 'cardLost':
        // Hellespont: a card taken at random from the hand of a side that lost a leader on the opponent's turn
        this.addLog({ text: `The ${after.players[e.side].army} army loses a command card.`, side: e.side, kind: 'info' });
        this.set({ display: after });
        break;
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

  private sideOf(id: string, s: GameState): Side | undefined {
    if (id.startsWith('L')) return (leaderById(s, id) ?? this.view.display.leaders.find((x) => x.id === id))?.side;
    return (unitById(s, id) ?? this.view.display.units.find((x) => x.id === id))?.side;
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
    }
  }

  private rollSummary(p: RollPurpose, faces: DieFace[], scoring: boolean[]): string {
    if (p === 'spartacus') {
      if (faces.every((f) => f === 'flag' || f === 'swords')) return 'No effect';
      return this.driver.state.active === this.config.humanSide ? 'Choose units for each symbol' : 'Units ordered';
    }
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

export function newSessionConfig(scenarioId: string, humanSide: Side, difficulty: Difficulty): SessionConfig {
  return { scenarioId, humanSide, difficulty, seed: freshSeed() };
}
