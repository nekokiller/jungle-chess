// AI 自我對弈：確認六檔都能下完一盤，並估計「像小朋友一樣下棋」的玩家贏入門的機率。
// 執行：npm run ai:selfplay（約需數分鐘；不在一般測試裡跑）
import { it } from 'vitest';
import { createGame, denOwner, legalMoves, opponent, play, type GameState, type Move, type Side } from '../src/engine';
import { LEVELS, levelOf, type LevelId } from '../src/ai/levels';
import { search } from '../src/ai/search';

const MAX_PLIES = 300;
type Player = (state: GameState) => Move;

const ai = (id: LevelId): Player => state => search(state, levelOf(id)).move;

/** 模仿小朋友：看到能進獸穴就進，七成機會吃得到就吃，其他時候隨便走、比較常往前走。 */
const kid: Player = state => {
  const moves = legalMoves(state.board, state.turn);
  const win = moves.find(m => denOwner(m.to) === opponent(state.turn));
  if (win) return win;
  const captures = moves.filter(m => m.captured);
  if (captures.length && Math.random() < 0.7) return captures[Math.floor(Math.random() * captures.length)]!;
  const forward = (m: Move) => (state.turn === 'red' ? m.from.row - m.to.row : m.to.row - m.from.row);
  const weighted = moves.flatMap(m => Array(forward(m) > 0 ? 3 : 1).fill(m) as Move[]);
  return weighted[Math.floor(Math.random() * weighted.length)]!;
};

function game(red: Player, blue: Player) {
  let state = createGame();
  let slowest = 0;
  while (!state.result && state.moves.length < MAX_PLIES) {
    const t = performance.now();
    const move = (state.turn === 'red' ? red : blue)(state);
    slowest = Math.max(slowest, performance.now() - t);
    const r = play(state, move.from, move.to);
    if (!r.ok) throw new Error(`不合法的走法：${r.reason}`);
    state = r.state;
  }
  return { winner: state.result?.winner ?? null, reason: state.result?.reason ?? 'maxPlies', plies: state.moves.length, slowest };
}

const fmt = (g: ReturnType<typeof game>) =>
  `${g.winner ?? '和／未完'}（${g.reason}，${g.plies} 步，最慢一步 ${Math.round(g.slowest)} ms）`;

it('六檔都能下完一盤（各檔執紅，對下一檔）', () => {
  for (let i = 0; i < LEVELS.length; i++) {
    const me = LEVELS[i]!;
    const other = LEVELS[Math.max(0, i - 1)]!;
    const g = game(ai(me.id), ai(other.id));
    console.log(`${me.name}（紅） vs ${other.name}（藍）：${fmt(g)}`);
  }
}, 900_000);

it('相鄰兩檔對戰 6 盤（開局先隨機走 4 步增加變化）', () => {
  const opening = (inner: Player): Player => state => {
    if (state.moves.length >= 4) return inner(state);
    const moves = legalMoves(state.board, state.turn);
    return moves[Math.floor(Math.random() * moves.length)]!;
  };
  for (let i = 1; i < LEVELS.length; i++) {
    const strong = LEVELS[i]!;
    const weak = LEVELS[i - 1]!;
    const tally = { win: 0, loss: 0, draw: 0 };
    for (let g = 0; g < 6; g++) {
      const strongRed = g % 2 === 0;
      const s = opening(ai(strong.id));
      const w = opening(ai(weak.id));
      const r = strongRed ? game(s, w) : game(w, s);
      if (r.winner === null) tally.draw++;
      else if ((r.winner === 'red') === strongRed) tally.win++;
      else tally.loss++;
    }
    console.log(`${strong.name} vs ${weak.name}：${tally.win} 勝 ${tally.loss} 敗 ${tally.draw} 和`);
  }
}, 1_800_000);

it('像小朋友的玩家 vs 入門、簡單', () => {
  for (const id of ['novice', 'easy'] as const) {
    const N = 40;
    const tally: Record<Side | 'none', number> = { red: 0, blue: 0, none: 0 };
    for (let i = 0; i < N; i++) {
      // 一半局小朋友執紅，一半執藍。
      const kidSide: Side = i % 2 ? 'blue' : 'red';
      const g = kidSide === 'red' ? game(kid, ai(id)) : game(ai(id), kid);
      tally[g.winner === null ? 'none' : g.winner === kidSide ? 'red' : 'blue']++;
    }
    console.log(`小朋友 vs ${levelOf(id).name}（${N} 盤）：小朋友贏 ${tally.red}、AI 贏 ${tally.blue}、和或未完 ${tally.none}`);
  }
}, 900_000);

it('各檔在開局與中局搜到的深度', () => {
  let mid = createGame();
  for (let i = 0; i < 16 && !mid.result; i++) {
    const m = search(mid, levelOf('medium')).move;
    const r = play(mid, m.from, m.to);
    if (r.ok) mid = r.state;
  }
  for (const level of LEVELS) {
    const a = search(createGame(), level);
    const b = search(mid, level);
    console.log(`${level.name}：開局深度 ${a.depth}（${a.nodes} 節點），中局深度 ${b.depth}（${b.nodes} 節點）`);
  }
}, 120_000);
