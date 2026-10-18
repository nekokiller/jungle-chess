// 一步棋要播哪些聲音：依事件取捨、去掉讓位的聲音。由動畫導演在起跳、吃子星星、移動完成的節點播放。
import { isWater, type GameEvent, type GameResult, type Move, type Side } from '../engine';
import type { SoundId } from './manifest';

export interface Cue {
  id: SoundId;
  /** 額外增益，例如吃子後較輕的陷阱聲。 */
  gain?: number;
}

export interface MoveCues {
  /** 起跳（獅虎跳河）或離水水花，在移動開始時播。 */
  start: SoundId | null;
  /** 被吃方迸出星星時播一次吃子聲。 */
  capture: boolean;
  /** 移動完成時的那一聲：落地、划水、入水、陷阱，最多一個。 */
  arrive: Cue | null;
}

/**
 * reduced：減少動態效果，省略跳躍滑音與一般落地（含水中划水），保留吃子、水花、陷阱。
 * 同一步有結算時，省略陷阱等次要提示，結算音由對局層在動作結束後播。
 */
export function moveCues(move: Move, events: readonly GameEvent[], reduced: boolean): MoveCues {
  const has = (kind: GameEvent['kind']) => events.some(e => e.kind === kind);
  const over = has('gameOver');
  const capture = move.captured !== null;
  const leftWater = has('leaveWater');

  const start: SoundId | null = leftWater ? 'water.exit' : move.kind === 'jump' && !reduced ? 'piece.jump' : null;

  let arrive: Cue | null;
  if (has('enterWater')) arrive = { id: 'water.enter' };
  else if (!over && has('enterTrap')) arrive = capture ? { id: 'trap.enter', gain: 0.6 } : { id: 'trap.enter' };
  else if (capture || leftWater) arrive = null;
  else if (!over && has('leaveTrap')) arrive = { id: 'trap.leave' };
  else if (reduced) arrive = null;
  else arrive = { id: isWater(move.from) && isWater(move.to) ? 'water.step' : 'piece.land' };

  return { start, capture, arrive };
}

/** 結算音：和電腦下時依玩家輸贏選勝利或鼓勵；兩人輪流時任一方獲勝都是勝利。 */
export function resultCue(result: GameResult, humanSide?: Side): SoundId {
  if (result.winner === null) return 'game.draw';
  return humanSide === undefined || result.winner === humanSide ? 'game.win' : 'game.encourage';
}
