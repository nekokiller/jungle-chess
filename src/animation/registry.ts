// 動畫導演要直接操作的 DOM：每隻棋子的外層元素、棋盤、特效圖層。由畫面元件以 ref 登記。
import type { CSSProperties } from 'react';
import { COLS, ROWS, type Pos } from '../engine';

const pieces = new Map<string, HTMLElement>();

export const stage: { board: HTMLElement | null; fx: HTMLElement | null } = { board: null, fx: null };

/** 棋盤是否上下顛倒（玩家執藍方時，藍方在下）。由對局 store 在開局時設定。 */
export const view = { flipped: false };

/** 盤面座標 → 畫面上的格子位置。 */
export const toView = ({ row, col }: Pos, flipped = view.flipped): Pos =>
  flipped ? { row: ROWS - 1 - row, col: COLS - 1 - col } : { row, col };

/** 放在格子上的元素（棋子、腳印、選取光暈）的 CSS 位置變數。 */
export const placeAt = (pos: Pos, flipped: boolean): CSSProperties => {
  const v = toView(pos, flipped);
  return { '--r': v.row, '--c': v.col } as CSSProperties;
};

export function registerPiece(id: string, el: HTMLElement | null) {
  if (el) pieces.set(id, el);
  else pieces.delete(id);
}

export const pieceEl = (id: string): HTMLElement | null => pieces.get(id) ?? null;

export const cellSize = (): number => (stage.board ? stage.board.getBoundingClientRect().width / COLS : 0);

/** 格子中心在特效圖層裡的座標；dy 以格為單位往下偏移。 */
export function cellCenter(pos: Pos, dy = 0) {
  const cs = cellSize();
  const { row, col } = toView(pos);
  return { x: (col + 0.5) * cs, y: (row + 0.5 + dy) * cs, cs };
}
