import { describe, expect, it } from 'vitest';
import { checkMove, initialBoard, legalMoves, movesFrom, toSquare } from '../../src/engine';
import { setup, sq } from './helpers';

const check = (pieces: Record<string, string>, from: string, to: string) =>
  checkMove(setup(pieces), sq(from), sq(to));
const targets = (pieces: Record<string, string>, from: string) =>
  movesFrom(setup(pieces), sq(from)).map(m => toSquare(m.to)).sort();

describe('一般走法', () => {
  it('開局雙方各有 24 種走法', () => {
    expect(legalMoves(initialBoard(), 'red')).toHaveLength(24);
    expect(legalMoves(initialBoard(), 'blue')).toHaveLength(24);
  });

  it('只能上下左右走一格', () => {
    expect(targets({ d4: 'W' }, 'd4')).toEqual(['d3', 'd5']); // 左右都是河
    expect(targets({ a2: 'W' }, 'a2')).toEqual(['a1', 'a3', 'b2']);
    expect(check({ a2: 'W' }, 'a2', 'b3')).toEqual({ ok: false, reason: 'notAdjacent' });
    expect(check({ a2: 'W' }, 'a2', 'a4')).toEqual({ ok: false, reason: 'notAdjacent' });
  });

  it('不能走到己方動物所在的格子', () => {
    expect(check({ a2: 'W', a3: 'C' }, 'a2', 'a3')).toEqual({ ok: false, reason: 'ownPiece' });
  });

  it('起點沒有動物、目標在棋盤外', () => {
    expect(check({}, 'a2', 'a3')).toEqual({ ok: false, reason: 'noPiece' });
    expect(checkMove(setup({ a2: 'W' }), sq('a2'), { row: 7, col: -1 })).toEqual({ ok: false, reason: 'offBoard' });
  });

  it('陷阱任何動物都能進出', () => {
    expect(check({ d3: 'W' }, 'd3', 'd2').ok).toBe(true); // 己方陷阱
    expect(check({ d7: 'W' }, 'd7', 'd8').ok).toBe(true); // 敵方陷阱
    expect(check({ d8: 'W' }, 'd8', 'd7').ok).toBe(true);
  });

  it('藍方也不能進自己的獸穴', () => {
    expect(check({ d8: 'w' }, 'd8', 'd9')).toEqual({ ok: false, reason: 'ownDen' });
  });
});

describe('鼠與河流', () => {
  it('鼠可以在河裡游來游去', () => {
    expect(targets({ b5: 'R' }, 'b5')).toEqual(['a5', 'b4', 'b6', 'c5']);
  });

  it('鼠剛從水中上岸的那一步不能吃子', () => {
    expect(check({ b4: 'R', b3: 'c' }, 'b4', 'b3')).toEqual({ ok: false, reason: 'bankCapture' });
    expect(check({ b4: 'R', a4: 'r' }, 'b4', 'a4')).toEqual({ ok: false, reason: 'bankCapture' });
  });

  it('陸地上的動物都吃不到水中的鼠', () => {
    expect(check({ b3: 'L', b4: 'r' }, 'b3', 'b4')).toEqual({ ok: false, reason: 'waterOnlyRat' });
  });
});

describe('獅、虎跳河', () => {
  it('獅和虎都能縱跳（第 3 列 ↔ 第 7 列，b、c、e、f 欄）', () => {
    for (const code of ['L', 'T']) {
      for (const file of ['b', 'c', 'e', 'f']) {
        expect(check({ [`${file}3`]: code }, `${file}3`, `${file}7`)).toMatchObject({ ok: true, move: { kind: 'jump' } });
        expect(check({ [`${file}7`]: code }, `${file}7`, `${file}3`)).toMatchObject({ ok: true, move: { kind: 'jump' } });
      }
    }
  });

  it('獅和虎都能橫跳（a ↔ d、d ↔ g）', () => {
    for (const code of ['L', 'T']) {
      expect(targets({ d5: code }, 'd5')).toEqual(['a5', 'd4', 'd6', 'g5']);
      expect(targets({ a4: code }, 'a4')).toEqual(['a3', 'a5', 'd4']);
      expect(targets({ g6: code }, 'g6')).toEqual(['d6', 'g5', 'g7']);
    }
  });

  it('其他動物不能跳河', () => {
    for (const code of ['E', 'P', 'W', 'D', 'C', 'R']) {
      expect(check({ b3: code }, 'b3', 'b7')).toEqual({ ok: false, reason: 'notAdjacent' });
      expect(check({ a5: code }, 'a5', 'd5')).toEqual({ ok: false, reason: 'notAdjacent' });
    }
  });

  it('只能跳到對岸第一格，不能跳一半或跳過頭', () => {
    expect(check({ b3: 'L' }, 'b3', 'b5')).toEqual({ ok: false, reason: 'notAdjacent' });
    expect(check({ b3: 'L' }, 'b3', 'b8')).toEqual({ ok: false, reason: 'notAdjacent' });
    expect(check({ a5: 'L' }, 'a5', 'g5')).toEqual({ ok: false, reason: 'notAdjacent' });
  });

  it('沒有臨河不能跳', () => {
    expect(check({ a3: 'L' }, 'a3', 'a7')).toEqual({ ok: false, reason: 'notAdjacent' });
    expect(check({ d3: 'L' }, 'd3', 'd7')).toEqual({ ok: false, reason: 'notAdjacent' });
  });

  it('橫跳路徑上有鼠也會被擋住', () => {
    expect(check({ a5: 'T', c5: 'R' }, 'a5', 'd5')).toEqual({ ok: false, reason: 'jumpBlocked' });
    expect(targets({ a5: 'T', c5: 'r' }, 'a5')).toEqual(['a4', 'a6']);
  });

  it('落點有己方動物就不能跳', () => {
    expect(check({ b3: 'L', b7: 'C' }, 'b3', 'b7')).toEqual({ ok: false, reason: 'ownPiece' });
  });
});

describe('吃子', () => {
  it('同等級可以互吃', () => {
    expect(check({ d4: 'L', d5: 'l' }, 'd4', 'd5').ok).toBe(true);
    expect(check({ d4: 'E', d5: 'e' }, 'd4', 'd5').ok).toBe(true);
  });

  it('依速查表：等級高於或等於才能吃', () => {
    const ORDER = ['E', 'L', 'T', 'P', 'W', 'D', 'C', 'R'];
    ORDER.forEach((att, i) => {
      ORDER.forEach((def, j) => {
        const expected =
          att === 'E' && def === 'R' ? false : att === 'R' && def === 'E' ? true : i <= j;
        const r = check({ d4: att, d5: def.toLowerCase() }, 'd4', 'd5');
        expect(r.ok, `${att} 吃 ${def}`).toBe(expected);
      });
    });
  });

  it('掉進敵方陷阱的動物，防守等級變 0', () => {
    // 紅象在 d8（藍方陷阱），藍鼠可以吃牠。
    expect(check({ d8: 'E', d7: 'r' }, 'd7', 'd8').ok).toBe(true);
  });

  it('掉進敵方陷阱的動物去吃別人時，仍用原本的等級', () => {
    expect(check({ d8: 'D', c8: 'c' }, 'd8', 'c8').ok).toBe(true);
    expect(check({ d8: 'D', e8: 'w' }, 'd8', 'e8')).toEqual({ ok: false, reason: 'rankTooLow' });
  });

  it('離開陷阱後立刻恢復原等級', () => {
    expect(check({ d7: 'D', d6: 'c' }, 'd6', 'd7')).toEqual({ ok: false, reason: 'rankTooLow' });
  });
});
