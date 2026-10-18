import { describe, expect, it } from 'vitest';
import { createGame, play } from '../../src/engine';
import { moveCues, resultCue } from '../../src/audio/cues';
import { setup, sq } from '../engine/helpers';

/** 紅方走一步，回傳這一步的聲音安排。g7 放一隻藍狼，對局才不會因為吃光而結束。 */
function cues(pieces: Record<string, string>, move: string, reduced = false) {
  const [from, to] = move.split('-') as [string, string];
  const r = play(createGame(setup({ g7: 'w', ...pieces })), sq(from), sq(to));
  if (!r.ok) throw new Error(`${move} 不合法：${r.reason}`);
  return moveCues(r.move, r.events, reduced);
}

describe('每步音效取捨', () => {
  it('普通陸地走棋：落地一聲', () => {
    expect(cues({ a3: 'W' }, 'a3-a4')).toEqual({ start: null, capture: false, arrive: { id: 'piece.land' } });
  });

  it('獅虎跳河：起跳加落地；跳河吃子時省略落地', () => {
    expect(cues({ a5: 'L' }, 'a5-d5')).toEqual({ start: 'piece.jump', capture: false, arrive: { id: 'piece.land' } });
    expect(cues({ a5: 'L', d5: 'p' }, 'a5-d5')).toEqual({ start: 'piece.jump', capture: true, arrive: null });
  });

  it('老鼠入水、出水用水花聲取代落地，水中走一格用划水聲', () => {
    expect(cues({ a5: 'R' }, 'a5-b5')).toEqual({ start: null, capture: false, arrive: { id: 'water.enter' } });
    expect(cues({ b5: 'R' }, 'b5-a5')).toEqual({ start: 'water.exit', capture: false, arrive: null });
    expect(cues({ b5: 'R' }, 'b5-b6')).toEqual({ start: null, capture: false, arrive: { id: 'water.step' } });
  });

  it('水中吃子只有吃子聲', () => {
    expect(cues({ b5: 'R', b6: 'r' }, 'b5-b6')).toEqual({ start: null, capture: true, arrive: null });
  });

  it('進、出敵方陷阱各一次提示，不加落地聲', () => {
    expect(cues({ c8: 'D' }, 'c8-c9').arrive).toEqual({ id: 'trap.enter' });
    expect(cues({ c9: 'D' }, 'c9-b9').arrive).toEqual({ id: 'trap.leave' });
  });

  it('己方陷阱沒有陷阱提示', () => {
    expect(cues({ c2: 'D' }, 'c2-c1').arrive).toEqual({ id: 'piece.land' });
  });

  it('吃子又進敵方陷阱：吃子後再播較輕的陷阱聲', () => {
    expect(cues({ c8: 'D', c9: 'c' }, 'c8-c9')).toEqual({
      start: null,
      capture: true,
      arrive: { id: 'trap.enter', gain: 0.6 },
    });
  });

  it('吃子時離陷阱提示讓位', () => {
    expect(cues({ c9: 'D', b9: 'c' }, 'c9-b9')).toEqual({ start: null, capture: true, arrive: null });
  });

  it('同一步結算時省略離陷阱提示，保留落地', () => {
    expect(cues({ d8: 'D' }, 'd8-d9').arrive).toEqual({ id: 'piece.land' });
  });

  it('減少動態效果：省略起跳與一般落地，保留吃子、水花、陷阱', () => {
    expect(cues({ a3: 'W' }, 'a3-a4', true)).toEqual({ start: null, capture: false, arrive: null });
    expect(cues({ a5: 'L', d5: 'p' }, 'a5-d5', true)).toEqual({ start: null, capture: true, arrive: null });
    expect(cues({ b5: 'R' }, 'b5-b6', true).arrive).toBeNull();
    expect(cues({ a5: 'R' }, 'a5-b5', true).arrive).toEqual({ id: 'water.enter' });
    expect(cues({ b5: 'R' }, 'b5-a5', true).start).toBe('water.exit');
    expect(cues({ c8: 'D' }, 'c8-c9', true).arrive).toEqual({ id: 'trap.enter' });
    expect(cues({ c9: 'D' }, 'c9-b9', true).arrive).toEqual({ id: 'trap.leave' });
  });
});

describe('結算音', () => {
  it('兩人輪流：任一方獲勝都是勝利音', () => {
    expect(resultCue({ winner: 'red', reason: 'den' })).toBe('game.win');
    expect(resultCue({ winner: 'blue', reason: 'allCaptured' })).toBe('game.win');
  });

  it('和電腦下：依玩家陣營選勝利或鼓勵', () => {
    expect(resultCue({ winner: 'blue', reason: 'noMoves' }, 'blue')).toBe('game.win');
    expect(resultCue({ winner: 'red', reason: 'den' }, 'blue')).toBe('game.encourage');
  });

  it('三次重複局面是和棋音', () => {
    expect(resultCue({ winner: null, reason: 'repetition' }, 'red')).toBe('game.draw');
    expect(resultCue({ winner: null, reason: 'repetition' })).toBe('game.draw');
  });
});
