// Web Worker 入口：在背景執行緒計算，動畫不會卡。
import type { GameState, Pos } from '../engine';
import { levelOf, type LevelId } from './levels';
import { search } from './search';

export interface AiRequest {
  id: number;
  state: GameState;
  level: LevelId;
}

export type AiResponse = { id: number; from: Pos; to: Pos } | { id: number; error: string };

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const { id, state, level } = e.data;
  try {
    const { move } = search(state, levelOf(level));
    self.postMessage({ id, from: move.from, to: move.to } satisfies AiResponse);
  } catch (err) {
    self.postMessage({ id, error: String(err) } satisfies AiResponse);
  }
};
