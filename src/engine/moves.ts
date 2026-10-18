// 合法走法、跳河與吃子判定。
import {
  RANK,
  denOwner,
  inBounds,
  isWater,
  pieceAt,
  trapOwner,
  type Board,
  type Piece,
  type Pos,
  type Side,
} from './board';

/** 不合法走法的原因，畫面再轉成兒童語氣的提示。 */
export type IllegalReason =
  | 'noPiece' //       起點沒有動物
  | 'offBoard' //      目標在棋盤外
  | 'ownPiece' //      目標有己方動物
  | 'notAdjacent' //   不是上下左右一格（也不是合法的跳河）
  | 'ownDen' //        想進己方獸穴
  | 'waterOnlyRat' //  非鼠想下水
  | 'bankCapture' //   跨水陸吃子
  | 'jumpBlocked' //   跳河路徑有鼠
  | 'rankTooLow' //    等級不夠
  | 'elephantVsRat'; // 象想吃鼠

export type MoveKind = 'step' | 'jump';

export interface Move {
  from: Pos;
  to: Pos;
  kind: MoveKind;
  /** 被吃掉的動物；沒吃子為 null。 */
  captured: Piece | null;
}

export type MoveCheck = { ok: true; move: Move } | { ok: false; reason: IllegalReason };

const DIRS: readonly Pos[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

const canJump = (piece: Piece) => piece.type === 'lion' || piece.type === 'tiger';

/**
 * 從 from 朝 dir 方向跳河的落點。前方第一格不是水就回傳 null。
 * blocked：路徑上的水格裡有任何一隻鼠（不分敵我）。
 */
function jumpLanding(board: Board, from: Pos, dir: Pos): { to: Pos; blocked: boolean } | null {
  let pos = { row: from.row + dir.row, col: from.col + dir.col };
  if (!inBounds(pos) || !isWater(pos)) return null;
  let blocked = false;
  while (inBounds(pos) && isWater(pos)) {
    if (pieceAt(board, pos)?.type === 'rat') blocked = true;
    pos = { row: pos.row + dir.row, col: pos.col + dir.col };
  }
  // 河流都被陸地包圍，落點一定在棋盤內；保險起見仍檢查。
  return inBounds(pos) ? { to: pos, blocked } : null;
}

/**
 * attacker 從 from 吃掉站在 to 的 target 是否被規則禁止；可以吃回傳 null。
 * 判斷順序依規則文件第 5 節。
 */
export function captureBlock(attacker: Piece, from: Pos, target: Piece, to: Pos): IllegalReason | null {
  // 1. 水陸不能互吃（含鼠剛上岸的那一步）。
  if (isWater(from) !== isWater(to)) return 'bankCapture';
  // 2. 敵方站在我方陷阱裡，等級視為 0，誰都能吃（含象吃鼠）。
  if (trapOwner(to) === attacker.side) return null;
  // 3、4. 鼠可以吃象；象不能吃鼠。
  if (attacker.type === 'rat' && target.type === 'elephant') return null;
  if (attacker.type === 'elephant' && target.type === 'rat') return 'elephantVsRat';
  // 5. 等級高於或等於就能吃。攻擊方即使站在敵方陷阱，仍用原本的等級。
  return RANK[attacker.type] >= RANK[target.type] ? null : 'rankTooLow';
}

/** 檢查 from → to 這一步，不管輪到哪一方。 */
export function checkMove(board: Board, from: Pos, to: Pos): MoveCheck {
  const piece = pieceAt(board, from);
  if (!piece) return { ok: false, reason: 'noPiece' };
  if (!inBounds(to)) return { ok: false, reason: 'offBoard' };
  const target = pieceAt(board, to);
  if (target?.side === piece.side) return { ok: false, reason: 'ownPiece' };

  const dr = to.row - from.row;
  const dc = to.col - from.col;
  let kind: MoveKind;
  if (Math.abs(dr) + Math.abs(dc) === 1) {
    if (isWater(to) && piece.type !== 'rat') return { ok: false, reason: 'waterOnlyRat' };
    kind = 'step';
  } else {
    const landing =
      canJump(piece) && (dr === 0) !== (dc === 0)
        ? jumpLanding(board, from, { row: Math.sign(dr), col: Math.sign(dc) })
        : null;
    if (!landing || landing.to.row !== to.row || landing.to.col !== to.col) {
      return { ok: false, reason: 'notAdjacent' };
    }
    if (landing.blocked) return { ok: false, reason: 'jumpBlocked' };
    kind = 'jump';
  }

  if (denOwner(to) === piece.side) return { ok: false, reason: 'ownDen' };
  if (target) {
    const reason = captureBlock(piece, from, target, to);
    if (reason) return { ok: false, reason };
  }
  return { ok: true, move: { from, to, kind, captured: target } };
}

/** 站在 from 的動物所有合法走法（含跳河）。 */
export function movesFrom(board: Board, from: Pos): Move[] {
  const piece = pieceAt(board, from);
  if (!piece) return [];
  const out: Move[] = [];
  for (const dir of DIRS) {
    let to: Pos = { row: from.row + dir.row, col: from.col + dir.col };
    if (!inBounds(to)) continue;
    if (isWater(to) && canJump(piece)) {
      const landing = jumpLanding(board, from, dir);
      if (!landing) continue;
      to = landing.to;
    }
    const check = checkMove(board, from, to);
    if (check.ok) out.push(check.move);
  }
  return out;
}

/** side 這一方所有合法走法。 */
export function legalMoves(board: Board, side: Side): Move[] {
  const out: Move[] = [];
  board.forEach((cells, row) =>
    cells.forEach((p, col) => {
      if (p?.side === side) out.push(...movesFrom(board, { row, col }));
    }),
  );
  return out;
}

export function hasLegalMove(board: Board, side: Side): boolean {
  for (let row = 0; row < board.length; row++) {
    const cells = board[row]!;
    for (let col = 0; col < cells.length; col++) {
      if (cells[col]?.side === side && movesFrom(board, { row, col }).length > 0) return true;
    }
  }
  return false;
}
