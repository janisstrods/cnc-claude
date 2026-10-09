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
}

/** Worker answers slower than this are abandoned and computed in-thread instead. */
const WORKER_TIMEOUT_MS = 20000;

export class AiClient {
  readonly opts: AiOptions;
  private worker: Worker | null = null;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  private readonly gameId: string;
  /** Memory for in-thread fallback decisions. */
  private readonly mem: AiMemory = newMemory();
  private disposed = false;

  constructor(opts: AiOptions) {
    this.opts = opts;
    this.gameId = `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    try {
      if (typeof Worker !== 'undefined') {
        this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (ev: MessageEvent<WorkerResponse>) => this.onMessage(ev.data);
        this.worker.onerror = (ev) => {
          ev.preventDefault?.();
          this.failWorker();
        };
        this.worker.onmessageerror = () => this.failWorker();
      }
    } catch {
      this.worker = null;
    }
  }

  /** True while decisions run in a Web Worker (false after a fallback). */
  get usingWorker(): boolean {
    return !!this.worker;
  }

  decide(state: GameState, decision: Decision): Promise<AiResult> {
    if (this.disposed) return Promise.reject(new Error('AiClient disposed'));
    if (!this.worker) return this.inline(state, decision);
    const id = this.nextId++;
    return new Promise<AiResult>((resolve, reject) => {
      const p: Pending = { resolve, reject, state, decision, timer: null };
      p.timer = setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        this.inline(state, decision).then(resolve, reject);
      }, WORKER_TIMEOUT_MS);
      this.pending.set(id, p);
      try {
        this.worker!.postMessage({ id, type: 'decide', gameId: this.gameId, state, decision, opts: this.opts });
      } catch {
        this.pending.delete(id);
        if (p.timer) clearTimeout(p.timer);
        this.failWorker();
        this.inline(state, decision).then(resolve, reject);
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

  private onMessage(m: WorkerResponse): void {
    const p = this.pending.get(m.id);
    if (!p) return;
    this.pending.delete(m.id);
    if (p.timer) clearTimeout(p.timer);
    if ('error' in m) {
      this.inline(p.state, p.decision).then(p.resolve, p.reject);
      return;
    }
    p.resolve({ answer: m.answer, say: m.say });
  }

  private failWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    const waiting = [...this.pending.values()];
    this.pending.clear();
    for (const p of waiting) {
      if (p.timer) clearTimeout(p.timer);
      this.inline(p.state, p.decision).then(p.resolve, p.reject);
    }
  }

  private inline(state: GameState, decision: Decision): Promise<AiResult> {
    return new Promise<AiResult>((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(chooseAnswer(state, decision, this.opts, this.mem));
        } catch (e) {
          reject(e);
        }
      }, 0);
    });
  }
}
