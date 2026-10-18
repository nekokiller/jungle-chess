import {
  emptyBoard,
  fromSquare,
  type AnimalType,
  type Board,
  type Side,
} from '../../src/engine';
import { createGame, play, type GameState } from '../../src/engine';

const TYPE: Record<string, AnimalType> = {
  e: 'elephant', l: 'lion', t: 'tiger', p: 'leopard', w: 'wolf', d: 'dog', c: 'cat', r: 'rat',
};

/**
 * 用座標擺棋：大寫是紅方、小寫是藍方。
 * 例：setup({ b3: 'L', b5: 'r' }) → 紅獅在 b3、藍鼠在 b5。
 */
export function setup(pieces: Record<string, string>): Board {
  const board = emptyBoard();
  for (const [square, code] of Object.entries(pieces)) {
    const type = TYPE[code.toLowerCase()];
    if (!type) throw new Error(`不認得的棋子代碼：${code}`);
    const side: Side = code === code.toUpperCase() ? 'red' : 'blue';
    const { row, col } = fromSquare(square);
    board[row]![col] = { type, side, id: `${side}-${type}-${square}` };
  }
  return board;
}

export const sq = fromSquare;

/** 依序走多步（'g1-g2' 格式），任何一步不合法就丟錯。 */
export function playAll(state: GameState, ...moves: string[]): GameState {
  for (const m of moves) {
    const [a, b] = m.split('-') as [string, string];
    const r = play(state, sq(a), sq(b));
    if (!r.ok) throw new Error(`${m} 不合法：${r.reason}`);
    state = r.state;
  }
  return state;
}

export { createGame };
