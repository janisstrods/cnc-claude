/// <reference lib="webworker" />
// Web Worker entry for the AI (module worker).
// In:  { id, type: 'decide', gameId, state, decision, opts }  ->  Out: { id, answer, say } or { id, error }
// In:  { type: 'reset', gameId }                               (drops that game's memory)
import type { Decision, GameState } from '../engine/types';
import { chooseAnswer, newMemory, type AiMemory, type AiOptions } from './index';

export interface DecideRequest {
  id: number;
  type: 'decide';
  gameId: string;
  state: GameState;
  decision: Decision;
  opts: AiOptions;
}

export interface ResetRequest {
  type: 'reset';
  gameId: string;
}

export type WorkerRequest = DecideRequest | ResetRequest;

export type WorkerResponse =
  | { id: number; answer: ReturnType<typeof chooseAnswer>['answer']; say?: string }
  | { id: number; error: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;
/** One memory per game and side (a page may run two AI players). */
const memories = new Map<string, AiMemory>();

scope.onmessage = (ev: MessageEvent<WorkerRequest>) => {
  const m = ev.data;
  if (!m || typeof m !== 'object') return;
  if (m.type === 'reset') {
    for (const key of [...memories.keys()]) if (key.startsWith(`${m.gameId}:`)) memories.delete(key);
    return;
  }
  if (m.type !== 'decide') return;
  const key = `${m.gameId}:${m.opts.side}`;
  let mem = memories.get(key);
  if (!mem) {
    mem = newMemory();
    memories.set(key, mem);
  }
  try {
    const r = chooseAnswer(m.state, m.decision, m.opts, mem);
    const out: WorkerResponse = { id: m.id, answer: r.answer, say: r.say };
    scope.postMessage(out);
  } catch (e) {
    const out: WorkerResponse = { id: m.id, error: e instanceof Error ? e.message : String(e) };
    scope.postMessage(out);
  }
};
