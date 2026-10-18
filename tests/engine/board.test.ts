import { describe, expect, it } from 'vitest';
import {
  COLS,
  ROWS,
  denOwner,
  fromSquare,
  initialBoard,
  isWater,
  pieceAt,
  toSquare,
  trapOwner,
  type Pos,
} from '../../src/engine';

const allSquares = (): Pos[] =>
  Array.from({ length: ROWS * COLS }, (_, i) => ({ row: Math.floor(i / COLS), col: i % COLS }));
const squaresWhere = (fn: (p: Pos) => boolean) => allSquares().filter(fn).map(toSquare).sort();

describe('座標', () => {
  it('a1 是紅方左下角，g9 是藍方右上角', () => {
    expect(fromSquare('a1')).toEqual({ row: 8, col: 0 });
    expect(fromSquare('g9')).toEqual({ row: 0, col: 6 });
  });

  it('toSquare 與 fromSquare 互為反函式', () => {
    for (const p of allSquares()) expect(fromSquare(toSquare(p))).toEqual(p);
  });

  it('不正確的座標會丟錯', () => {
    expect(() => fromSquare('h1')).toThrow();
    expect(() => fromSquare('a0')).toThrow();
  });
});

describe('地形', () => {
  it('河流是 b4–c6 與 e4–f6，共 12 格', () => {
    expect(squaresWhere(isWater)).toEqual(
      ['b4', 'b5', 'b6', 'c4', 'c5', 'c6', 'e4', 'e5', 'e6', 'f4', 'f5', 'f6'],
    );
  });

  it('陷阱：紅 c1 e1 d2，藍 c9 e9 d8', () => {
    expect(squaresWhere(p => trapOwner(p) === 'red')).toEqual(['c1', 'd2', 'e1']);
    expect(squaresWhere(p => trapOwner(p) === 'blue')).toEqual(['c9', 'd8', 'e9']);
  });

  it('獸穴：紅 d1，藍 d9', () => {
    expect(squaresWhere(p => denOwner(p) === 'red')).toEqual(['d1']);
    expect(squaresWhere(p => denOwner(p) === 'blue')).toEqual(['d9']);
  });
});

describe('初始盤面', () => {
  const EXPECTED = {
    elephant: ['a3', 'g7'],
    lion: ['g1', 'a9'],
    tiger: ['a1', 'g9'],
    leopard: ['e3', 'c7'],
    wolf: ['c3', 'e7'],
    dog: ['f2', 'b8'],
    cat: ['b2', 'f8'],
    rat: ['g3', 'a7'],
  } as const;

  it('每隻動物的位置與規則文件一致', () => {
    const board = initialBoard();
    for (const [type, [red, blue]] of Object.entries(EXPECTED)) {
      expect(pieceAt(board, fromSquare(red))).toMatchObject({ type, side: 'red' });
      expect(pieceAt(board, fromSquare(blue))).toMatchObject({ type, side: 'blue' });
    }
  });

  it('雙方各 8 隻，id 不重複', () => {
    const pieces = initialBoard().flat().filter(p => p !== null);
    expect(pieces).toHaveLength(16);
    expect(new Set(pieces.map(p => p.id)).size).toBe(16);
  });
});
