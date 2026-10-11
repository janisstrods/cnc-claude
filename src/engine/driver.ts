// GameDriver: runs the flow generator, records answers (replay / undo / save) and queues events for the UI.
import type { Gen } from './decisions';
import { gameFlow } from './flow';
import { cloneState } from './setup';
import type { Answer, Decision, FlowCtx, GameEvent, GameState, Side } from './types';

export interface QueuedEvent {
  e: GameEvent;
  /** State right after the event (only when snapshots are enabled). */
  state?: GameState;
}

export interface DriverOptions {
  snapshots?: boolean;
}

/** What `GameDriver.undo` takes back: a move, a placement (117, 308) or the card played with the orders it gave. */
export type UndoStep = 'move' | 'placement' | 'card';

export class GameDriver {
  readonly initial: GameState;
  state: GameState;
  answers: Answer[] = [];
  /** rngCalls value before each recorded answer (undo is only allowed if no dice were rolled since). */
  private rngBefore: number[] = [];
  /** Side that gave each recorded answer. */
  private sides: Side[] = [];
  /** Decision each recorded answer answered. */
  private kinds: Decision['kind'][] = [];
  pending: Decision | null = null;
  lastError: string | null = null;
  private gen: Gen;
  private queue: QueuedEvent[] = [];
  private snapshots: boolean;
  private ctx: FlowCtx;

  constructor(initial: GameState, opts: DriverOptions = {}) {
    this.initial = cloneState(initial);
    this.state = cloneState(initial);
    this.snapshots = !!opts.snapshots;
    this.ctx = {
      emit: (e) => this.queue.push({ e, state: this.snapshots ? cloneState(this.state) : undefined }),
      invalid: (m) => { this.lastError = m; },
    };
    this.gen = gameFlow(this.state, this.ctx);
    const r = this.gen.next();
    this.pending = r.done ? null : r.value;
  }

  get over(): boolean {
    return !!this.state.winner || this.pending === null;
  }

  /** Submit an answer to the pending decision. Returns false (and sets lastError) if it was rejected. */
  answer(a: Answer): boolean {
    if (!this.pending) throw new Error('No decision is pending.');
    this.lastError = null;
    const before = this.state.rngCalls;
    const { side, kind } = this.pending;
    const r = this.gen.next(a);
    this.pending = r.done ? null : r.value;
    if (this.lastError) return false;
    this.answers.push(a);
    this.rngBefore.push(before);
    this.sides.push(side);
    this.kinds.push(kind);
    if (this.state.winner) this.pending = null;
    return true;
  }

  drainEvents(): QueuedEvent[] {
    const q = this.queue;
    this.queue = [];
    return q;
  }

  /**
   * What `undo` would take back now, or null. A step is the last answer when it was a move (not the end of the movement),
   * a leader placement (117, 308) or a forced placement (308); or the card played with the answers that followed it before
   * anything moved: its orders and the command named for it (§18.5). Only the side deciding now takes back a step, all of
   * whose answers are its own, and only while no die has been rolled since the step began: nothing can be rolled again.
   */
  undoStep(): UndoStep | null {
    const i = this.undoFrom();
    if (i < 0) return null;
    return this.kinds[i] === 'playCard' ? 'card' : this.kinds[i] === 'move' ? 'move' : 'placement';
  }

  canUndo(): boolean {
    return this.undoFrom() >= 0;
  }

  /** The index of the first answer of the step `undo` takes back, or -1 (see `undoStep`). */
  private undoFrom(): number {
    const n = this.answers.length;
    if (!n || !this.pending) return -1;
    let i = n - 1;
    // the orders a card gave and the command named for it go back with the card
    while (i > 0 && (this.kinds[i] === 'orders' || this.kinds[i] === 'chooseCommand')) i--;
    const k = this.kinds[i];
    const last = i === n - 1 && ((k === 'move' && this.answers[i].kind === 'move') || k === 'placeLeader' || k === 'placeUnit');
    if (!last && k !== 'playCard') return -1;
    for (let j = i; j < n; j++) if (this.sides[j] !== this.pending.side) return -1;
    return this.rngBefore[i] === this.state.rngCalls ? i : -1;
  }

  /** Rebuild the game without the step `undoStep` names (the last answer when nothing can be taken back). */
  undo(): GameDriver {
    const i = this.undoFrom();
    return GameDriver.replay(this.initial, this.answers.slice(0, i < 0 ? -1 : i), { snapshots: this.snapshots });
  }

  static replay(initial: GameState, answers: Answer[], opts: DriverOptions = {}): GameDriver {
    const d = new GameDriver(initial, { snapshots: false });
    for (const a of answers) {
      if (!d.pending) break;
      if (!d.answer(a)) throw new Error(`Replay failed: ${d.lastError}`);
    }
    d.drainEvents();
    d.snapshots = !!opts.snapshots;
    return d;
  }
}
