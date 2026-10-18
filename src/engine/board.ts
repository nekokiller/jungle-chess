// 棋盤地形、座標與初始盤面。
// 座標：row 0 是藍方底線（第 9 列），row 8 是紅方底線（第 1 列）；col 0～6 對應 a～g。

export const ROWS = 9;
export const COLS = 7;

export type Side = 'red' | 'blue';

export type AnimalType =
  | 'elephant'
  | 'lion'
  | 'tiger'
  | 'leopard'
  | 'wolf'
  | 'dog'
  | 'cat'
  | 'rat';

export interface Pos {
  row: number;
  col: number;
}

export interface Piece {
  type: AnimalType;
  side: Side;
  id: string;
}

/** 9 × 7，board[row][col]。 */
export type Board = (Piece | null)[][];

export const RANK: Record<AnimalType, number> = {
  elephant: 8,
  lion: 7,
  tiger: 6,
  leopard: 5,
  wolf: 4,
  dog: 3,
  cat: 2,
  rat: 1,
};

export const ANIMALS: readonly AnimalType[] = [
  'elephant', 'lion', 'tiger', 'leopard', 'wolf', 'dog', 'cat', 'rat',
];

export const opponent = (side: Side): Side => (side === 'red' ? 'blue' : 'red');

export const inBounds = ({ row, col }: Pos): boolean =>
  row >= 0 && row < ROWS && col >= 0 && col < COLS;

export const samePos = (a: Pos, b: Pos): boolean => a.row === b.row && a.col === b.col;

/** 河流：第 4～6 列（row 3～5）的 b、c、e、f 欄。 */
export function isWater({ row, col }: Pos): boolean {
  return row >= 3 && row <= 5 && (col === 1 || col === 2 || col === 4 || col === 5);
}

/** 獸穴：d9 屬藍方、d1 屬紅方。 */
export function denOwner({ row, col }: Pos): Side | null {
  if (col !== 3) return null;
  if (row === 0) return 'blue';
  if (row === ROWS - 1) return 'red';
  return null;
}

/** 陷阱：獸穴的左、右、前三格。 */
export function trapOwner({ row, col }: Pos): Side | null {
  if ((row === 0 && (col === 2 || col === 4)) || (row === 1 && col === 3)) return 'blue';
  if ((row === 8 && (col === 2 || col === 4)) || (row === 7 && col === 3)) return 'red';
  return null;
}

/** 站在敵方陷阱裡（防守等級變 0）。 */
export const inEnemyTrap = (pos: Pos, side: Side): boolean => {
  const owner = trapOwner(pos);
  return owner !== null && owner !== side;
};

const FILES = 'abcdefg';

/** { row: 8, col: 0 } → 'a1' */
export function toSquare({ row, col }: Pos): string {
  return `${FILES[col]}${ROWS - row}`;
}

/** 'a1' → { row: 8, col: 0 } */
export function fromSquare(square: string): Pos {
  const m = /^([a-g])([1-9])$/.exec(square);
  if (!m) throw new Error(`不正確的座標：${square}`);
  return { row: ROWS - Number(m[2]), col: FILES.indexOf(m[1]!) };
}

export const pieceAt = (board: Board, { row, col }: Pos): Piece | null => board[row]?.[col] ?? null;

export const emptyBoard = (): Board =>
  Array.from({ length: ROWS }, () => Array<Piece | null>(COLS).fill(null));

export const cloneBoard = (board: Board): Board => board.map(r => r.slice());

/** 紅方的初始位置；藍方是以棋盤中心旋轉 180°。 */
const RED_START: Record<AnimalType, string> = {
  elephant: 'a3',
  lion: 'g1',
  tiger: 'a1',
  leopard: 'e3',
  wolf: 'c3',
  dog: 'f2',
  cat: 'b2',
  rat: 'g3',
};

export function initialBoard(): Board {
  const board = emptyBoard();
  for (const type of ANIMALS) {
    const { row, col } = fromSquare(RED_START[type]);
    board[row]![col] = { type, side: 'red', id: `red-${type}` };
    board[ROWS - 1 - row]![COLS - 1 - col] = { type, side: 'blue', id: `blue-${type}` };
  }
  return board;
}
