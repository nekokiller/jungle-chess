// 走一步產生的事件，動畫導演照順序播放。
import type { Pos, Side } from './board';

export type GameOverReason = 'den' | 'allCaptured' | 'noMoves' | 'repetition';

export interface GameResult {
  /** 和棋為 null。 */
  winner: Side | null;
  reason: GameOverReason;
}

export type GameEvent =
  | { kind: 'move'; pieceId: string; from: Pos; to: Pos }
  | { kind: 'jump'; pieceId: string; from: Pos; to: Pos } //          獅、虎跳河
  | { kind: 'enterWater'; pieceId: string; at: Pos }
  | { kind: 'leaveWater'; pieceId: string; at: Pos }
  | { kind: 'capture'; pieceId: string; victimId: string; at: Pos }
  | { kind: 'enterTrap'; pieceId: string; at: Pos } //                進入敵方陷阱
  | { kind: 'leaveTrap'; pieceId: string; at: Pos } //                離開敵方陷阱
  | ({ kind: 'gameOver' } & GameResult);
