// 對照 docs/evaluation/01-game-rules.md 第 7 節「規則細節檢查清單」的 15 項。
import { describe, expect, it } from 'vitest';
import { checkMove, play } from '../../src/engine';
import { createGame, playAll, setup, sq } from './helpers';

const check = (pieces: Record<string, string>, from: string, to: string) =>
  checkMove(setup(pieces), sq(from), sq(to));

describe('規則細節檢查清單', () => {
  it('#1 象走到鼠旁邊要吃牠：不行（除非那隻鼠在我方陷阱）', () => {
    expect(check({ d3: 'E', d4: 'r' }, 'd3', 'd4')).toEqual({ ok: false, reason: 'elephantVsRat' });
    // d2 是紅方陷阱，藍鼠站在裡面等級變 0，紅象可以吃。
    expect(check({ d3: 'E', d2: 'r' }, 'd3', 'd2').ok).toBe(true);
  });

  it('#2 陸地的鼠吃陸地的象：可以', () => {
    const r = check({ d4: 'R', d5: 'e' }, 'd4', 'd5');
    expect(r.ok && r.move.captured?.type).toBe('elephant');
  });

  it('#3 水中的鼠吃岸上的象：不行（水陸不能互吃）', () => {
    expect(check({ b4: 'R', b3: 'e' }, 'b4', 'b3')).toEqual({ ok: false, reason: 'bankCapture' });
  });

  it('#4 水中的鼠吃水中的敵鼠：可以', () => {
    expect(check({ b4: 'R', b5: 'r' }, 'b4', 'b5').ok).toBe(true);
  });

  it('#5 岸上的鼠吃水中的敵鼠：不行', () => {
    expect(check({ b3: 'R', b4: 'r' }, 'b3', 'b4')).toEqual({ ok: false, reason: 'bankCapture' });
  });

  it('#6 獅在 b3 往上跳，b4～b6 有敵鼠或己鼠：被擋住', () => {
    for (const rat of ['b4', 'b5', 'b6']) {
      expect(check({ b3: 'L', [rat]: 'r' }, 'b3', 'b7')).toEqual({ ok: false, reason: 'jumpBlocked' });
      expect(check({ b3: 'L', [rat]: 'R' }, 'b3', 'b7')).toEqual({ ok: false, reason: 'jumpBlocked' });
    }
    // 沒有鼠就跳得過去。
    expect(check({ b3: 'L' }, 'b3', 'b7')).toMatchObject({ ok: true, move: { kind: 'jump' } });
  });

  it('#7 虎從 a5 橫跳到 d5，d5 有敵豹：跳過去吃掉', () => {
    const r = check({ a5: 'T', d5: 'p' }, 'a5', 'd5');
    expect(r).toMatchObject({ ok: true, move: { kind: 'jump', captured: { type: 'leopard', side: 'blue' } } });
  });

  it('#8 虎從 a5 橫跳到 d5，d5 有敵獅：等級不夠，不能跳', () => {
    expect(check({ a5: 'T', d5: 'l' }, 'a5', 'd5')).toEqual({ ok: false, reason: 'rankTooLow' });
  });

  it('#9 紅狗走進 d8（藍方陷阱），藍貓去吃牠：可以', () => {
    let state = createGame(setup({ d7: 'D', c8: 'c', a1: 'E' }), 'red');
    state = playAll(state, 'd7-d8');
    const r = play(state, sq('c8'), sq('d8'));
    expect(r.ok && r.move.captured?.id).toBe('red-dog-d7');
  });

  it('#10 紅象站在 d2（紅方自己的陷阱），藍鼠去吃牠：可以', () => {
    expect(check({ d2: 'E', d3: 'r' }, 'd3', 'd2').ok).toBe(true);
  });

  it('#11 紅狗站在 d2（紅方自己的陷阱），藍貓去吃牠：不行', () => {
    expect(check({ d2: 'D', d3: 'c' }, 'd3', 'd2')).toEqual({ ok: false, reason: 'rankTooLow' });
  });

  it('#12 紅虎走進 d1（紅方自己的獸穴）：不行', () => {
    expect(check({ d2: 'T' }, 'd2', 'd1')).toEqual({ ok: false, reason: 'ownDen' });
  });

  it('#13 紅鼠走進 d9（藍方獸穴）：紅方立刻獲勝', () => {
    const state = createGame(setup({ d8: 'R', a9: 'l' }), 'red');
    const r = play(state, sq('d8'), sq('d9'));
    expect(r.ok && r.state.result).toEqual({ winner: 'red', reason: 'den' });
  });

  it('#14 狗或其他動物下河：不行（只有鼠可以）', () => {
    for (const code of ['E', 'L', 'T', 'P', 'W', 'D', 'C']) {
      expect(check({ b3: code }, 'b3', 'b4')).toEqual({ ok: false, reason: 'waterOnlyRat' });
    }
    expect(check({ b3: 'R' }, 'b3', 'b4').ok).toBe(true);
  });

  it('#15 同一局面且同一方要走，第三次出現：和棋', () => {
    const loop = ['g1-g2', 'a9-a8', 'g2-g1', 'a8-a9'];
    let state = playAll(createGame(), ...loop, ...loop.slice(0, 3));
    expect(state.result).toBeNull();
    state = playAll(state, loop[3]!);
    expect(state.result).toEqual({ winner: null, reason: 'repetition' });
  });
});
