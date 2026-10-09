// Main-thread wrapper: runs the AI in a module Web Worker, falling back to in-thread computation if the worker
// cannot start, errors, or does not answer in time. The game never stalls on the AI.
import type { Answer, Decision, GameState } from '../engine/types';
import { chooseAnswer, newMemory, type AiMemory, type AiOptions } from './index';
import type { WorkerResponse } from './worker';

export interface AiResult {
  answer: Answer;
  say?: string;
}

interface Pending {
  resolve: (r: AiResult) => void;
  reject: (e: unknown) => void;
  state: GameState;
  decision: Decision;
  timer: ReturnType<typeof setTimeout> | null;
  worker: Worker;
}

/** Worker answers slower than this are answered in-thread instead (the AI's own budget is at most ~2.5 s). */
const WORKER_TIMEOUT_MS = 20000;
/** A timer firing this much later than scheduled means the page was frozen (e.g. a backgrounded tab). */
const FREEZE_SLACK_MS = 2000;
/** After a freeze, give the worker this long to deliver an answer it probably already has. */
const FREEZE_GRACE_MS = 3000;
/** Consecutive worker timeouts before giving up on workers for this game. */
const MAX_TIMEOUTS = 2;

export class AiClient {
  readonly opts: AiOptions;
  private worker: Worker | null = null;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  private readonly gameId: string;
  /** Memory for in-thread fallback decisions. */
  private readonly mem: AiMemory = newMemory();
  private disposed = false;
  private timeouts = 0;
  private workersFailed = false;

  constructor(opts: AiOptions) {
    this.opts = opts;
    this.gameId = `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    this.spawnWorker();
  }

  /** True while decisions run in a Web Worker (false after a fallback). */
  get usingWorker(): boolean {
    return !!this.worker;
  }

  decide(state: GameState, decision: Decision): Promise<AiResult> {
    if (this.disposed) return Promise.reject(new Error('AiClient disposed'));
    const worker = this.worker;
    if (!worker) return this.inline(state, decision);
    const id = this.nextId++;
    return new Promise<AiResult>((resolve, reject) => {
      const p: Pending = { resolve, reject, state, decision, timer: null, worker };
      this.pending.set(id, p);
      this.arm(id, p, WORKER_TIMEOUT_MS);
      try {
        worker.postMessage({ id, type: 'decide', gameId: this.gameId, state, decision, opts: this.opts });
      } catch {
        this.settleInline(id);
        this.failWorker();
      }
    });
  }

  dispose(): void {
    this.disposed = true;
    if (this.worker) {
      try {
        this.worker.postMessage({ type: 'reset', gameId: this.gameId });
      } catch {
        // ignore
      }
      this.worker.terminate();
      this.worker = null;
    }
    for (const [, p] of this.pending) {
      if (p.timer) clearTimeout(p.timer);
      p.reject(new Error('AiClient disposed'));
    }
    this.pending.clear();
  }

  private spawnWorker(): void {
    if (this.workersFailed || this.disposed) return;
    try {
      if (typeof Worker === 'undefined') return;
      const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (ev: MessageEvent<WorkerResponse>) => this.onMessage(ev.data);
      w.onerror = (ev) => {
        ev.preventDefault?.();
        if (this.worker === w) this.failWorker();
      };
      w.onmessageerror = () => {
        if (this.worker === w) this.failWorker();
      };
      this.worker = w;
    } catch {
      this.worker = null;
    }
  }

  /** Time out a request; a timer that fires very late (frozen page) gets a short grace period instead. */
  private arm(id: number, p: Pending, ms: number): void {
    const due = Date.now() + ms;
    p.timer = setTimeout(() => {
      if (!this.pending.has(id)) return;
      if (Date.now() - due > FREEZE_SLACK_MS) {
        this.arm(id, p, FREEZE_GRACE_MS);
        return;
      }
      this.onTimeout(id, p);
    }, ms);
  }

  private onTimeout(id: number, p: Pending): void {
    // answer in-thread (the request is not re-posted); replace the stuck worker for later decisions
    this.settleInline(id);
    this.timeouts++;
    if (this.worker === p.worker) {
      const stuck = this.worker;
      this.worker = null;
      stuck.terminate();
      for (const [pid, q] of [...this.pending]) if (q.worker === stuck) this.settleInline(pid);
      if (this.timeouts >= MAX_TIMEOUTS) this.workersFailed = true;
      else this.spawnWorker();
    }
  }

  private onMessage(m: WorkerResponse): void {
    const p = this.pending.get(m.id);
    if (!p) return;
    this.pending.delete(m.id);
    if (p.timer) clearTimeout(p.timer);
    if (this.disposed) return;
    if ('error' in m) {
      this.inline(p.state, p.decision).then(p.resolve, p.reject);
      return;
    }
    this.timeouts = 0;
    p.resolve({ answer: m.answer, say: m.say });
  }

  /** Answer a pending request in-thread instead of waiting for its worker. */
  private settleInline(id: number): void {
    const p = this.pending.get(id);
    if (!p) return;
    this.pending.delete(id);
    if (p.timer) clearTimeout(p.timer);
    if (this.disposed) return;
    this.inline(p.state, p.decision).then(p.resolve, p.reject);
  }

  private failWorker(): void {
    this.workersFailed = true;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    for (const id of [...this.pending.keys()]) this.settleInline(id);
  }

  private inline(state: GameState, decision: Decision): Promise<AiResult> {
    return new Promise<AiResult>((resolve, reject) => {
      setTimeout(() => {
        if (this.disposed) {
          reject(new Error('AiClient disposed'));
          return;
        }
        try {
          resolve(chooseAnswer(state, decision, this.opts, this.mem));
        } catch (e) {
          reject(e);
        }
      }, 0);
    });
  }
}
