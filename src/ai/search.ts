// AI 搜尋：迭代加深的 Negamax ＋ Alpha-Beta，搭配置換表與走法排序（架構文件第 6 節）。
// 走法產生直接呼叫規則引擎，只是在同一份盤面上「走／退」而不複製，保證 AI 和玩家遵守同一套規則。
import {
  ANIMALS,
  COLS,
  ROWS,
  cloneBoard,
  denOwner,
  inEnemyTrap,
  legalMoves,
  opponent,
  type AnimalType,
  type Board,
  type GameState,
  type Move,
  type Piece,
  type Side,
} from '../engine';

export interface SearchOptions {
  /** 最大搜尋深度 */
  depth: number;
  /** 每步時間上限（毫秒）；深度 1 一定會搜完 */
  timeMs: number;
  /** 隨機擾動：前 4 名候選著各加上 ±noise/2 的分數再重新排序 */
  noise?: number;
  /** 不做吃子延伸：只看自己這一步之後的盤面，看不到對方會怎麼反擊 */
  noQuiescence?: boolean;
  /** 漏看吃子的機率：這一步假裝沒看到可以吃的子 */
  missCapture?: number;
  /** 偷懶的機率：這一步只看一層，不管對方的威脅 */
  shallowChance?: number;
  random?: () => number;
  now?: () => number;
}

export interface SearchResult {
  move: Move;
  score: number;
  /** 實際搜完的深度 */
  depth: number;
  nodes: number;
}

/** 棋子價值（參考網站的數值） */
export const VALUE: Record<AnimalType, number> = {
  elephant: 590,
  lion: 560,
  tiger: 510,
  leopard: 385,
  wolf: 310,
  dog: 245,
  cat: 190,
  rat: 125,
};

export const WIN = 100_000;
const INF = 1_000_000;
const MAX_QDEPTH = 4;
const TRAP_PENALTY = 150;

/* ---------- Zobrist 雜湊（兩個 32 位元，合起來當 53 位元的 key） ---------- */

const CELLS = ROWS * COLS;
const PIECE_KINDS = ANIMALS.length * 2;
const typeIndex = Object.fromEntries(ANIMALS.map((t, i) => [t, i])) as Record<AnimalType, number>;
const pieceIndex = (p: Piece) => (p.side === 'red' ? 0 : ANIMALS.length) + typeIndex[p.type];

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}
const rnd = mulberry32(0x5eed);
const Z_HI = Int32Array.from({ length: CELLS * PIECE_KINDS }, () => rnd() | 0);
const Z_LO = Int32Array.from({ length: CELLS * PIECE_KINDS }, () => rnd() | 0);
const Z_SIDE_HI = rnd() | 0;
const Z_SIDE_LO = rnd() | 0;

const zi = (row: number, col: number, p: Piece) => (row * COLS + col) * PIECE_KINDS + pieceIndex(p);
const keyOf = (hi: number, lo: number) => (hi >>> 0) * 2097152 + ((lo >>> 0) & 0x1fffff);

function hashBoard(board: Board, turn: Side): [number, number] {
  let hi = 0;
  let lo = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const p = board[row]![col];
      if (p) {
        hi ^= Z_HI[zi(row, col, p)]!;
        lo ^= Z_LO[zi(row, col, p)]!;
      }
    }
  }
  if (turn === 'blue') {
    hi ^= Z_SIDE_HI;
    lo ^= Z_SIDE_LO;
  }
  return [hi, lo];
}

const FROM_LETTER: Record<string, AnimalType> = {
  e: 'elephant', l: 'lion', t: 'tiger', p: 'leopard', w: 'wolf', d: 'dog', c: 'cat', r: 'rat',
};

/** 把引擎的局面 key（positionKey）轉成同一套 Zobrist key，用來接上對局中已出現過的局面。 */
function hashPositionKey(key: string): number {
  const [cells = '', turn] = key.split(':');
  const board: Board = Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, (_, col) => {
      const ch = cells[row * COLS + col] ?? '.';
      if (ch === '.') return null;
      const side: Side = ch === ch.toUpperCase() ? 'red' : 'blue';
      const type = FROM_LETTER[ch.toLowerCase()]!;
      return { type, side, id: '' };
    }),
  );
  const [hi, lo] = hashBoard(board, turn === 'B' ? 'blue' : 'red');
  return keyOf(hi, lo);
}

/* ---------- 評估函式 ---------- */

/** 每一格對紅方的位置分：越往前（第 0 列）越高、越靠中間越高。藍方上下翻轉。 */
const POS_RED: number[] = [];
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const advance = ROWS - 1 - row;
    const center = 3 - Math.abs(col - 3);
    // 獸穴附近再加分，讓 AI 知道要往對方的家衝。
    const denDist = row + Math.abs(col - 3);
    const denBonus = denDist <= 3 ? (4 - denDist) * 25 : 0;
    POS_RED.push(advance * 10 + center * 3 + denBonus);
  }
}
const posScore = (row: number, col: number, side: Side) =>
  side === 'red' ? POS_RED[row * COLS + col]! : POS_RED[(ROWS - 1 - row) * COLS + col]!;

/** 從 side 的角度看盤面分數。 */
export function evaluate(board: Board, side: Side): number {
  let score = 0;
  for (let row = 0; row < ROWS; row++) {
    const cells = board[row]!;
    for (let col = 0; col < COLS; col++) {
      const p = cells[col];
      if (!p) continue;
      let v = VALUE[p.type] + posScore(row, col, p.side);
      if (inEnemyTrap({ row, col }, p.side)) v -= TRAP_PENALTY;
      score += p.side === side ? v : -v;
    }
  }
  return score;
}

/* ---------- 搜尋 ---------- */

/** 置換表的分數種類：精確值、下界（發生 beta 剪枝）、上界（沒有一步超過 alpha）。 */
const EXACT = 0;
const LOWER = 1;
const UPPER = 2;
interface TTEntry {
  depth: number;
  score: number;
  flag: typeof EXACT | typeof LOWER | typeof UPPER;
  best: number;
}

const moveCode = (m: Move) => (m.from.row * COLS + m.from.col) * CELLS + m.to.row * COLS + m.to.col;
const isWinningMove = (m: Move, side: Side) => denOwner(m.to) === opponent(side);

class Abort extends Error {}

class Searcher {
  private board: Board;
  private side: Side;
  private hi: number;
  private lo: number;
  private counts = new Map<number, number>();
  private tt = new Map<number, TTEntry>();
  private pieces: Record<Side, number> = { red: 0, blue: 0 };
  private deadline = Infinity;
  private canAbort = false;
  nodes = 0;

  constructor(
    state: GameState,
    private readonly quiescence: boolean,
    private readonly now: () => number,
  ) {
    this.board = cloneBoard(state.board);
    this.side = state.turn;
    [this.hi, this.lo] = hashBoard(this.board, this.side);
    for (const key of state.positions) {
      const k = hashPositionKey(key);
      this.counts.set(k, (this.counts.get(k) ?? 0) + 1);
    }
    for (const cells of this.board) for (const p of cells) if (p) this.pieces[p.side]++;
  }

  rootMoves(): Move[] {
    return legalMoves(this.board, this.side);
  }

  private make(m: Move): number {
    const p = this.board[m.from.row]![m.from.col]!;
    let hi = this.hi ^ Z_HI[zi(m.from.row, m.from.col, p)]! ^ Z_HI[zi(m.to.row, m.to.col, p)]! ^ Z_SIDE_HI;
    let lo = this.lo ^ Z_LO[zi(m.from.row, m.from.col, p)]! ^ Z_LO[zi(m.to.row, m.to.col, p)]! ^ Z_SIDE_LO;
    if (m.captured) {
      hi ^= Z_HI[zi(m.to.row, m.to.col, m.captured)]!;
      lo ^= Z_LO[zi(m.to.row, m.to.col, m.captured)]!;
      this.pieces[m.captured.side]--;
    }
    this.board[m.to.row]![m.to.col] = p;
    this.board[m.from.row]![m.from.col] = null;
    this.hi = hi;
    this.lo = lo;
    this.side = opponent(this.side);
    const key = keyOf(hi, lo);
    const seen = this.counts.get(key) ?? 0;
    this.counts.set(key, seen + 1);
    return seen;
  }

  private unmake(m: Move, prevHi: number, prevLo: number) {
    const key = keyOf(this.hi, this.lo);
    this.counts.set(key, this.counts.get(key)! - 1);
    const p = this.board[m.to.row]![m.to.col]!;
    this.board[m.from.row]![m.from.col] = p;
    this.board[m.to.row]![m.to.col] = m.captured;
    if (m.captured) this.pieces[m.captured.side]++;
    this.hi = prevHi;
    this.lo = prevLo;
    this.side = opponent(this.side);
  }

  /** 走 m 之後，從走的那一方看的分數。 */
  private child(m: Move, depth: number, alpha: number, beta: number, ply: number): number {
    const mover = this.side;
    if (isWinningMove(m, mover)) return WIN - ply;
    const hi = this.hi;
    const lo = this.lo;
    const seen = this.make(m);
    let score: number;
    if (this.pieces[this.side] === 0) score = WIN - ply;
    else if (seen >= 2) score = 0; // 這一步會造成第三次重複局面：和棋
    else score = -this.negamax(depth - 1, -beta, -alpha, ply + 1);
    this.unmake(m, hi, lo);
    return score;
  }

  private tick() {
    if ((++this.nodes & 1023) === 0 && this.canAbort && this.now() > this.deadline) throw new Abort();
  }

  private order(moves: Move[], ttBest: number) {
    const side = this.side;
    const keyed = moves.map(m => {
      let k = 0;
      if (moveCode(m) === ttBest) k = 1e9;
      else if (isWinningMove(m, side)) k = 1e8;
      else {
        const p = this.board[m.from.row]![m.from.col]!;
        if (m.captured) k += 1e6 + VALUE[m.captured.type] * 10 - VALUE[p.type] * 0.8;
        k += posScore(m.to.row, m.to.col, side) - posScore(m.from.row, m.from.col, side);
        if (inEnemyTrap(m.to, side)) k -= 200;
        if (m.kind === 'jump') k += 20;
      }
      return { m, k };
    });
    keyed.sort((a, b) => b.k - a.k);
    for (let i = 0; i < moves.length; i++) moves[i] = keyed[i]!.m;
  }

  negamax(depth: number, alpha: number, beta: number, ply: number): number {
    this.tick();
    if (depth <= 0) return this.quiesce(alpha, beta, ply, 0);

    const key = keyOf(this.hi, this.lo);
    const hit = this.tt.get(key);
    if (hit && hit.depth >= depth) {
      if (hit.flag === EXACT) return hit.score;
      if (hit.flag === LOWER && hit.score >= beta) return hit.score;
      if (hit.flag === UPPER && hit.score <= alpha) return hit.score;
    }

    const moves = legalMoves(this.board, this.side);
    if (moves.length === 0) return -(WIN - ply); // 輪到的一方無路可走：輸
    this.order(moves, hit?.best ?? -1);

    const alpha0 = alpha;
    let best = -INF;
    let bestCode = -1;
    for (const m of moves) {
      const score = this.child(m, depth, alpha, beta, ply);
      if (score > best) {
        best = score;
        bestCode = moveCode(m);
      }
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    this.tt.set(key, {
      depth,
      score: best,
      flag: best <= alpha0 ? UPPER : best >= beta ? LOWER : EXACT,
      best: bestCode,
    });
    return best;
  }

  /** 吃子延伸：只看吃子和進獸穴，避免在搜尋邊界剛好被吃掉卻沒看到。 */
  private quiesce(alpha: number, beta: number, ply: number, qdepth: number): number {
    const stand = evaluate(this.board, this.side);
    if (!this.quiescence || qdepth >= MAX_QDEPTH) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const side = this.side;
    const moves = legalMoves(this.board, side).filter(m => m.captured || isWinningMove(m, side));
    if (moves.length === 0) return stand;
    this.order(moves, -1);
    let best = stand;
    for (const m of moves) {
      this.tick();
      let score: number;
      if (isWinningMove(m, side)) score = WIN - ply;
      else {
        const hi = this.hi;
        const lo = this.lo;
        this.make(m);
        score = this.pieces[this.side] === 0 ? WIN - ply : -this.quiesce(-beta, -alpha, ply + 1, qdepth + 1);
        this.unmake(m, hi, lo);
      }
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    return best;
  }

  /** 搜一層根節點。exact：每一步都用完整視窗，拿到精確分數（給隨機擾動用）。 */
  searchRoot(moves: Move[], depth: number, exact: boolean): Map<Move, number> {
    const scores = new Map<Move, number>();
    let alpha = -INF;
    for (const m of moves) {
      const score = this.child(m, depth, exact ? -INF : alpha, INF, 0);
      scores.set(m, score);
      if (score > alpha) alpha = score;
    }
    return scores;
  }

  startClock(timeMs: number, abortable: boolean) {
    this.deadline = this.now() + timeMs;
    this.canAbort = abortable;
  }
}

/** 幫輪到的一方選一步。沒有合法走法時丟錯（對局應該已經結束）。 */
export function search(state: GameState, opts: SearchOptions): SearchResult {
  const random = opts.random ?? Math.random;
  const now = opts.now ?? (() => performance.now());
  const start = now();
  const shallow = !!opts.shallowChance && random() < opts.shallowChance;
  const searcher = new Searcher(state, !(opts.noQuiescence || shallow), now);

  let moves = searcher.rootMoves();
  if (moves.length === 0) throw new Error('沒有合法走法');

  // 能直接進獸穴就進。
  const win = moves.find(m => isWinningMove(m, state.turn));
  if (win) return { move: win, score: WIN, depth: 1, nodes: 0 };

  // 漏看吃子：把吃子的走法拿掉（全部都是吃子就算了）。
  if (opts.missCapture && random() < opts.missCapture) {
    const quiet = moves.filter(m => !m.captured);
    if (quiet.length > 0) moves = quiet;
  }
  if (moves.length === 1) return { move: moves[0]!, score: 0, depth: 0, nodes: 0 };

  const noise = opts.noise ?? 0;
  const maxDepth = shallow ? 1 : opts.depth;
  let scores: Map<Move, number> | null = null;
  let done = 0;
  for (let depth = 1; depth <= maxDepth; depth++) {
    searcher.startClock(opts.timeMs - (now() - start), depth > 1);
    try {
      scores = searcher.searchRoot(moves, depth, noise > 0);
    } catch (e) {
      if (e instanceof Abort) break;
      throw e;
    }
    done = depth;
    // 下一層先搜這一層最好的走法，剪枝比較有效。
    moves = [...moves].sort((a, b) => scores!.get(b)! - scores!.get(a)!);
    if (scores.get(moves[0]!)! >= WIN - 100) break; // 已經找到必勝
    if (now() - start > opts.timeMs) break;
  }

  const ranked = [...scores!.entries()].sort((a, b) => b[1] - a[1]);
  let [move, score] = ranked[0]!;
  if (noise > 0) {
    const top = ranked.slice(0, 4).map(([m, s]) => ({ m, s, r: s + (random() - 0.5) * noise }));
    top.sort((a, b) => b.r - a.r);
    move = top[0]!.m;
    score = top[0]!.s;
  }
  return { move, score, depth: done, nodes: searcher.nodes };
}
