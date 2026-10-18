import { describe, expect, it } from 'vitest';
import { play, positionKey, repetitionCount, type GameState } from '../../src/engine';
import { createGame, playAll, setup, sq } from './helpers';

const go = (state: GameState, from: string, to: string) => {
  const r = play(state, sq(from), sq(to));
  if (!r.ok) throw new Error(`${from}-${to} 不合法：${r.reason}`);
  return r;
};
const kinds = (r: ReturnType<typeof go>) => r.events.map(e => e.kind);

describe('回合', () => {
  it('預設紅方先走，走完換藍方', () => {
    const state = createGame();
    expect(state.turn).toBe('red');
    expect(go(state, 'g1', 'g2').state.turn).toBe('blue');
  });

  it('可以指定藍方先走', () => {
    expect(createGame(undefined, 'blue').turn).toBe('blue');
  });

  it('不能動對方的動物', () => {
    expect(play(createGame(), sq('a9'), sq('a8'))).toEqual({ ok: false, reason: 'notYourTurn' });
  });

  it('不合法的走法會回傳原因，state 不變', () => {
    const state = createGame();
    expect(play(state, sq('c3'), sq('c4'))).toEqual({ ok: false, reason: 'waterOnlyRat' });
    expect(play(state, sq('d4'), sq('d5'))).toEqual({ ok: false, reason: 'noPiece' });
  });

  it('play 不會改到原本的 state', () => {
    const state = createGame();
    const before = JSON.stringify(state);
    go(state, 'g1', 'g2');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('記錄棋譜', () => {
    const state = playAll(createGame(), 'g1-g2', 'a9-a8');
    expect(state.moves).toHaveLength(2);
    expect(state.moves[1]).toMatchObject({ from: sq('a9'), to: sq('a8'), kind: 'step', captured: null });
  });

  it('對局結束後不能再走', () => {
    const state = go(createGame(setup({ d8: 'R', a9: 'l' })), 'd8', 'd9').state;
    expect(play(state, sq('a9'), sq('a8'))).toEqual({ ok: false, reason: 'gameOver' });
  });
});

describe('事件', () => {
  it('一般移動', () => {
    const r = go(createGame(), 'g1', 'g2');
    expect(r.events).toEqual([{ kind: 'move', pieceId: 'red-lion', from: sq('g1'), to: sq('g2') }]);
  });

  it('鼠下水、上岸', () => {
    const state = createGame(setup({ b3: 'R', g9: 't' }));
    const r1 = go(state, 'b3', 'b4');
    expect(kinds(r1)).toEqual(['move', 'enterWater']);
    expect(kinds(go(r1.state, 'g9', 'g8'))).toEqual(['move']);
    const r2 = go(go(r1.state, 'g9', 'g8').state, 'b4', 'a4');
    expect(kinds(r2)).toEqual(['leaveWater', 'move']);
  });

  it('在水裡游不會重複觸發下水', () => {
    expect(kinds(go(createGame(setup({ b4: 'R', g9: 't' })), 'b4', 'b5'))).toEqual(['move']);
  });

  it('跳河吃子', () => {
    const r = go(createGame(setup({ a5: 'T', d5: 'p', g9: 't' })), 'a5', 'd5');
    expect(r.events).toEqual([
      { kind: 'jump', pieceId: 'red-tiger-a5', from: sq('a5'), to: sq('d5') },
      { kind: 'capture', pieceId: 'red-tiger-a5', victimId: 'blue-leopard-d5', at: sq('d5') },
    ]);
  });

  it('進出敵方陷阱', () => {
    const r1 = go(createGame(setup({ d7: 'D', a9: 'l' })), 'd7', 'd8');
    expect(kinds(r1)).toEqual(['move', 'enterTrap']);
    const r2 = go(go(r1.state, 'a9', 'a8').state, 'd8', 'c8');
    expect(kinds(r2)).toEqual(['leaveTrap', 'move']);
  });

  it('進出己方陷阱沒有陷阱事件', () => {
    expect(kinds(go(createGame(setup({ d3: 'D', a9: 'l' })), 'd3', 'd2'))).toEqual(['move']);
  });

  it('進入敵方獸穴：移動後接著 gameOver', () => {
    const r = go(createGame(setup({ c9: 'W', a1: 'l' })), 'c9', 'd9');
    expect(r.events).toEqual([
      { kind: 'leaveTrap', pieceId: 'red-wolf-c9', at: sq('c9') },
      { kind: 'move', pieceId: 'red-wolf-c9', from: sq('c9'), to: sq('d9') },
      { kind: 'gameOver', winner: 'red', reason: 'den' },
    ]);
  });
});

describe('勝負', () => {
  it('吃光敵方所有動物就獲勝', () => {
    const r = go(createGame(setup({ d3: 'L', d4: 'c' })), 'd3', 'd4');
    expect(r.state.result).toEqual({ winner: 'red', reason: 'allCaptured' });
    expect(r.events.at(-1)).toEqual({ kind: 'gameOver', winner: 'red', reason: 'allCaptured' });
  });

  it('輪到對方時對方沒有合法走法，對方輸', () => {
    // 藍鼠困在 a9 角落：a8 是紅貓、b9 是紅狗，鼠都吃不動。
    const r = go(createGame(setup({ a9: 'r', a8: 'C', b9: 'D', g1: 'L' })), 'g1', 'g2');
    expect(r.state.result).toEqual({ winner: 'red', reason: 'noMoves' });
  });

  it('藍方也能贏', () => {
    const r = go(createGame(setup({ d2: 'r', a9: 'L' }), 'blue'), 'd2', 'd1');
    expect(r.state.result).toEqual({ winner: 'blue', reason: 'den' });
  });

  it('進穴同時吃光，以進穴為準', () => {
    // 不可能同時發生（獸穴裡不會有敵方動物），這裡確認進穴判定優先於其他條件。
    const r = go(createGame(setup({ d8: 'R', a1: 'l' })), 'd8', 'd9');
    expect(r.state.result?.reason).toBe('den');
  });
});

describe('重複局面', () => {
  it('局面 key 包含輪到哪一方', () => {
    const state = createGame();
    expect(positionKey(state.board, 'red')).not.toBe(positionKey(state.board, 'blue'));
  });

  it('計算目前局面出現的次數', () => {
    const loop = ['g1-g2', 'a9-a8', 'g2-g1', 'a8-a9'];
    expect(repetitionCount(createGame())).toBe(1);
    expect(repetitionCount(playAll(createGame(), ...loop))).toBe(2);
  });

  it('盤面相同但輪到不同方，不算重複', () => {
    // 紅獅跳河後繞回原位（7 步），藍虎來回 3 趟（6 步）：盤面回到開局，但改成輪到藍方。
    const start = createGame(setup({ b3: 'L', g9: 't' }));
    const state = playAll(
      start,
      'b3-b7', 'g9-g8', 'b7-a7', 'g8-g9', 'a7-a6', 'g9-g8', 'a6-a5',
      'g8-g9', 'a5-a4', 'g9-g8', 'a4-a3', 'g8-g9', 'a3-b3',
    );
    expect(state.turn).toBe('blue');
    expect(positionKey(state.board, 'red')).toBe(start.positions[0]);
    expect(repetitionCount(state)).toBe(1);
  });
});
