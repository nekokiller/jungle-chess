// 對局層呼叫 AI 的入口：有 Web Worker 就丟到背景算，沒有（例如測試環境）就直接算。
import type { GameState, Pos } from '../engine';
import { levelOf, type LevelId } from './levels';
import { search } from './search';
import type { AiRequest, AiResponse } from './worker';

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (m: { from: Pos; to: Pos }) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (worker || typeof Worker === 'undefined') return worker;
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<AiResponse>) => {
    const job = pending.get(e.data.id);
    if (!job) return;
    pending.delete(e.data.id);
    if ('error' in e.data) job.reject(new Error(e.data.error));
    else job.resolve({ from: e.data.from, to: e.data.to });
  };
  return worker;
}

/** 請 AI 幫輪到的一方選一步。 */
export function requestMove(state: GameState, level: LevelId): Promise<{ from: Pos; to: Pos }> {
  const w = getWorker();
  if (!w) {
    const { move } = search(state, levelOf(level));
    return Promise.resolve({ from: move.from, to: move.to });
  }
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, state, level } satisfies AiRequest);
  });
}
