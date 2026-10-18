// 動畫導演要直接操作的 DOM：每隻棋子的外層元素、棋盤、特效圖層。由畫面元件以 ref 登記。
import { COLS, type Pos } from '../engine';

const pieces = new Map<string, HTMLElement>();

export const stage: { board: HTMLElement | null; fx: HTMLElement | null } = { board: null, fx: null };

export function registerPiece(id: string, el: HTMLElement | null) {
  if (el) pieces.set(id, el);
  else pieces.delete(id);
}

export const pieceEl = (id: string): HTMLElement | null => pieces.get(id) ?? null;

export const cellSize = (): number => (stage.board ? stage.board.getBoundingClientRect().width / COLS : 0);

/** 格子中心在特效圖層裡的座標；dy 以格為單位往下偏移。 */
export function cellCenter({ row, col }: Pos, dy = 0) {
  const cs = cellSize();
  return { x: (col + 0.5) * cs, y: (row + 0.5 + dy) * cs, cs };
}
