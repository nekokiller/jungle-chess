// 對局層：目前的對局、選取、提示文字、悔棋，以及「點格子 → 引擎 → 動畫導演」和 AI 回合的流程。
import { flushSync } from 'react-dom';
import { create } from 'zustand';
import {
  DIRS,
  createGame,
  inBounds,
  inEnemyTrap,
  isWater,
  jumpLanding,
  legalMoves,
  pieceAt,
  play,
  samePos,
  type GameResult,
  type GameState,
  type Piece,
  type Pos,
  type Side,
} from '../engine';
import { headshake, playMove, type DirectorStage, type Ghost } from '../animation/director';
import { T, prefs } from '../animation/timings';
import { requestMove } from '../ai/client';
import { DEFAULT_LEVEL, type LevelId } from '../ai/levels';
import { confetti } from '../components/Effects/effects';
import type { Face } from '../components/Animal/Animal';
import {
  SIDE,
  aiThinking,
  moveLine,
  notYourTurn,
  pickFirst,
  reasonLine,
  resultLine,
  selectLine,
  turnPrompt,
  undone,
  waitForAi,
  yourTurnPrompt,
  type SelectContext,
} from '../copy/zh-TW';

export type Mode = 'ai' | 'pvp';

type PlayOk = Extract<ReturnType<typeof play>, { ok: true }>;

interface GameStore {
  game: GameState;
  /** 每一步之前的對局，用來悔棋。 */
  history: GameState[];
  mode: Mode;
  level: LevelId;
  /** 和電腦下時玩家是哪一方（開局設定在 M4）。 */
  humanSide: Side;
  selected: Pos | null;
  /** 動畫播放中，暫停操作。 */
  busy: boolean;
  /** AI 正在想。 */
  thinking: boolean;
  message: string;
  /** 每次說話加一，讓對話框重播彈跳。 */
  messageKey: number;
  ghosts: Ghost[];
  faces: Record<string, Face>;
  dry: string | null;
  /** 對局結束的說明；顯示結果卡片時才有值。 */
  resultText: string | null;
  reduceMotion: boolean;

  clickCell(pos: Pos): void;
  newGame(): void;
  undo(): void;
  setMode(mode: Mode): void;
  setLevel(level: LevelId): void;
  setReduceMotion(on: boolean): void;
}

const systemReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function selectContext(game: GameState, pos: Pos, piece: Piece): SelectContext {
  let besideRiver = false;
  let jumpBlocked = false;
  if (piece.type === 'lion' || piece.type === 'tiger') {
    for (const dir of DIRS) {
      const landing = jumpLanding(game.board, pos, dir);
      if (!landing) continue;
      besideRiver = true;
      const target = pieceAt(game.board, landing.to);
      if (landing.blocked && target?.side !== piece.side) jumpBlocked = true;
    }
  }
  return { trapped: inEnemyTrap(pos, piece.side), inWater: isWater(pos), besideRiver, jumpBlocked };
}

export const useGame = create<GameStore>()((set, get) => {
  /** 每次開新局、悔棋就加一，讓還在算的 AI 結果作廢。 */
  let aiToken = 0;

  const say = (message: string) => set(s => ({ message, messageKey: s.messageKey + 1 }));
  const vsAi = () => get().mode === 'ai';
  const isAiTurn = () => vsAi() && get().game.turn !== get().humanSide;
  /** 「藍方」「你」「電腦」 */
  const who = (side: Side) => (vsAi() ? (side === get().humanSide ? '你' : '電腦') : SIDE[side]);
  const prompt = (side: Side) => (vsAi() ? yourTurnPrompt(side) : turnPrompt(side));

  const setFace = (id: string, face: Face | null) =>
    set(s => {
      const faces = { ...s.faces };
      if (face) faces[id] = face;
      else delete faces[id];
      return { faces };
    });

  const stage: DirectorStage = {
    commit: (game, ghosts, dry) => flushSync(() => set(s => ({ game, ghosts, dry, history: [...s.history, s.game] }))),
    removeGhost: id => {
      set(s => ({ ghosts: s.ghosts.filter(g => g.piece.id !== id) }));
      setFace(id, null);
    },
    setDry: dry => set({ dry }),
    setFace,
  };

  function finish(result: GameResult, mover: Piece) {
    const text = resultLine(result, mover, vsAi() ? get().humanSide : undefined);
    say(text);
    if (result.winner && (!vsAi() || result.winner === get().humanSide)) confetti(46);
    const game = get().game;
    setTimeout(() => {
      // 等待期間如果已經重新開始或悔棋，就不要再跳出結果。
      if (get().game === game) set({ resultText: text });
    }, prefs.reduced ? 0 : T.winOverlay);
  }

  async function runMove(result: PlayOk) {
    const before = get().game;
    const mover = pieceAt(before.board, result.move.from)!;
    set({ busy: true, selected: null });
    try {
      await playMove(before, result, stage);
    } finally {
      set({ busy: false });
    }
    if (get().game !== result.state) return; // 播放中按了重新開始
    if (result.state.result) return finish(result.state.result, mover);
    say(moveLine(mover, result.move.captured, result.events, who(result.state.turn)));
    void aiTurn();
  }

  async function aiTurn() {
    if (!isAiTurn() || get().game.result) return;
    const token = ++aiToken;
    const { game, level } = get();
    set({ thinking: true });
    say(aiThinking);
    // AI 至少「想」0.5 秒，小朋友才來得及看。
    const [move] = await Promise.all([requestMove(game, level).catch(() => null), sleep(prefs.reduced ? 0 : T.aiMinThink)]);
    if (token !== aiToken || get().game !== game) return;
    set({ thinking: false });
    const fallback = legalMoves(game.board, game.turn)[0];
    const pickedMove = move ?? fallback;
    if (!pickedMove) return;
    let result = play(game, pickedMove.from, pickedMove.to);
    if (!result.ok && fallback) result = play(game, fallback.from, fallback.to);
    if (result.ok) await runMove(result);
  }

  function reset(game: GameState, history: GameState[]) {
    aiToken++;
    set({ game, history, selected: null, busy: false, thinking: false, ghosts: [], faces: {}, dry: null, resultText: null });
  }

  const initialReduced = systemReducedMotion();
  prefs.reduced = initialReduced;
  if (typeof document !== 'undefined') document.documentElement.dataset.motion = initialReduced ? 'reduced' : 'full';

  return {
    game: createGame(),
    history: [],
    mode: 'ai',
    level: DEFAULT_LEVEL,
    humanSide: 'red',
    selected: null,
    busy: false,
    thinking: false,
    message: yourTurnPrompt('red'),
    messageKey: 0,
    ghosts: [],
    faces: {},
    dry: null,
    resultText: null,
    reduceMotion: initialReduced,

    clickCell(pos) {
      const { game, selected, busy, thinking } = get();
      if (busy || game.result || !inBounds(pos)) return;
      if (thinking || isAiTurn()) return say(waitForAi);
      const piece = pieceAt(game.board, pos);

      // 再點一次自己：取消選取。
      if (selected && samePos(pos, selected)) {
        set({ selected: null });
        say(prompt(game.turn));
        return;
      }
      // 點輪到的一方的動物：選取（或換一隻）。
      if (piece && piece.side === game.turn) {
        set({ selected: pos });
        say(selectLine(piece.type, selectContext(game, pos, piece)));
        return;
      }
      if (!selected) {
        if (!piece) say(pickFirst);
        else {
          say(notYourTurn(game.turn));
          void headshake(piece.id);
        }
        return;
      }

      const result = play(game, selected, pos);
      if (!result.ok) {
        const mover = pieceAt(game.board, selected)!;
        say(reasonLine(result.reason, { mover, target: piece, moverInWater: isWater(selected), turn: game.turn }));
        void headshake(mover.id);
        return;
      }
      void runMove(result);
    },

    newGame() {
      reset(createGame(), []);
      say(prompt('red'));
      void aiTurn();
    },

    undo() {
      const { busy, history } = get();
      if (busy || history.length === 0) return;
      // 和電腦下：退回上一次輪到玩家的時候（通常是退兩步：電腦的和自己的）。
      let i = history.length - 1;
      if (vsAi()) while (i > 0 && history[i]!.turn !== get().humanSide) i--;
      const game = history[i]!;
      reset(game, history.slice(0, i));
      say(undone);
      void aiTurn();
    },

    setMode(mode) {
      set({ mode });
      get().newGame();
    },

    setLevel(level) {
      set({ level });
    },

    setReduceMotion(on) {
      prefs.reduced = on;
      document.documentElement.dataset.motion = on ? 'reduced' : 'full';
      set({ reduceMotion: on });
    },
  };
});
