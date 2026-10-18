// 走一步、勝負判定、局面雜湊。GameState 不可變：play() 回傳新的 state，方便悔棋／重做。
import {
  cloneBoard,
  denOwner,
  inEnemyTrap,
  initialBoard,
  isWater,
  opponent,
  pieceAt,
  type AnimalType,
  type Board,
  type Pos,
  type Side,
} from './board';
import type { GameEvent, GameResult } from './events';
import { checkMove, hasLegalMove, type IllegalReason, type Move } from './moves';

export interface GameState {
  board: Board;
  /** 輪到哪一方走。 */
  turn: Side;
  /** 開局與每一步之後的局面 key，用來判斷三次重複。 */
  positions: readonly string[];
  /** 棋譜。 */
  moves: readonly Move[];
  /** 對局結束後的結果；進行中為 null。 */
  result: GameResult | null;
}

export type PlayError = IllegalReason | 'gameOver' | 'notYourTurn';

export type PlayResult =
  | { ok: true; state: GameState; move: Move; events: GameEvent[] }
  | { ok: false; reason: PlayError };

const LETTER: Record<AnimalType, string> = {
  elephant: 'e',
  lion: 'l',
  tiger: 't',
  leopard: 'p',
  wolf: 'w',
  dog: 'd',
  cat: 'c',
  rat: 'r',
};

/** 局面 key：盤面（紅方大寫、藍方小寫、空格為 .）加上輪到哪一方。 */
export function positionKey(board: Board, turn: Side): string {
  let s = '';
  for (const cells of board) {
    for (const p of cells) s += p ? (p.side === 'red' ? LETTER[p.type].toUpperCase() : LETTER[p.type]) : '.';
  }
  return `${s}:${turn === 'red' ? 'R' : 'B'}`;
}

export function createGame(board: Board = initialBoard(), turn: Side = 'red'): GameState {
  return { board, turn, positions: [positionKey(board, turn)], moves: [], result: null };
}

/** 目前局面（含輪到誰）已經出現過幾次。 */
export function repetitionCount(state: GameState): number {
  const key = state.positions[state.positions.length - 1];
  return state.positions.filter(k => k === key).length;
}

const countSide = (board: Board, side: Side) =>
  board.reduce((n, cells) => n + cells.filter(p => p?.side === side).length, 0);

/** 輪到的一方把 from 的動物走到 to。 */
export function play(state: GameState, from: Pos, to: Pos): PlayResult {
  if (state.result) return { ok: false, reason: 'gameOver' };
  const piece = pieceAt(state.board, from);
  if (piece && piece.side !== state.turn) return { ok: false, reason: 'notYourTurn' };
  const check = checkMove(state.board, from, to);
  if (!check.ok) return check;

  const { move } = check;
  const mover = piece!;
  const board = cloneBoard(state.board);
  board[to.row]![to.col] = mover;
  board[from.row]![from.col] = null;

  const id = mover.id;
  const events: GameEvent[] = [];
  if (isWater(from) && !isWater(to)) events.push({ kind: 'leaveWater', pieceId: id, at: from });
  if (inEnemyTrap(from, mover.side) && !inEnemyTrap(to, mover.side)) {
    events.push({ kind: 'leaveTrap', pieceId: id, at: from });
  }
  events.push({ kind: move.kind === 'jump' ? 'jump' : 'move', pieceId: id, from, to });
  if (move.captured) events.push({ kind: 'capture', pieceId: id, victimId: move.captured.id, at: to });
  if (isWater(to) && !isWater(from)) events.push({ kind: 'enterWater', pieceId: id, at: to });
  if (inEnemyTrap(to, mover.side) && !inEnemyTrap(from, mover.side)) {
    events.push({ kind: 'enterTrap', pieceId: id, at: to });
  }

  const turn = opponent(state.turn);
  const key = positionKey(board, turn);
  const positions = [...state.positions, key];

  let result: GameResult | null = null;
  if (denOwner(to) === turn) result = { winner: mover.side, reason: 'den' };
  else if (countSide(board, turn) === 0) result = { winner: mover.side, reason: 'allCaptured' };
  else if (!hasLegalMove(board, turn)) result = { winner: mover.side, reason: 'noMoves' };
  else if (positions.filter(k => k === key).length >= 3) result = { winner: null, reason: 'repetition' };
  if (result) events.push({ kind: 'gameOver', ...result });

  return {
    ok: true,
    move,
    events,
    state: { board, turn, positions, moves: [...state.moves, move], result },
  };
}
