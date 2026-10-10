// GameDriver: runs the flow generator, records answers (replay / undo / save) and queues events for the UI.
import { gameFlow, type Gen } from './flow';
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
   * The last answer can be taken back only if it was a movement or a leader placement (Asculum) and no dice have been
   * rolled since.
   */
  canUndo(): boolean {
    const n = this.answers.length;
    if (!n) return false;
    if (this.answers[n - 1].kind !== 'move' && this.kinds[n - 1] !== 'placeLeader') return false;
    // only a side's own last movement or placement can be taken back, by that side, while it is still deciding
    if (!this.pending || this.sides[n - 1] !== this.pending.side) return false;
    return this.rngBefore[n - 1] === this.state.rngCalls;
  }

  /** Rebuild the game without the last answer. */
  undo(): GameDriver {
    return GameDriver.replay(this.initial, this.answers.slice(0, -1), { snapshots: this.snapshots });
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
