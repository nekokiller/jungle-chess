// 對局層：目前的對局、選取、提示文字，以及「點格子 → 引擎 → 動畫導演」的流程。
import { flushSync } from 'react-dom';
import { create } from 'zustand';
import {
  DIRS,
  createGame,
  inBounds,
  inEnemyTrap,
  isWater,
  jumpLanding,
  pieceAt,
  play,
  samePos,
  type GameResult,
  type GameState,
  type Piece,
  type Pos,
} from '../engine';
import { headshake, playMove, type DirectorStage, type Ghost } from '../animation/director';
import { T, prefs } from '../animation/timings';
import { confetti } from '../components/Effects/effects';
import type { Face } from '../components/Animal/Animal';
import {
  moveLine,
  notYourTurn,
  pickFirst,
  reasonLine,
  resultLine,
  selectLine,
  turnPrompt,
  type SelectContext,
} from '../copy/zh-TW';

interface GameStore {
  game: GameState;
  selected: Pos | null;
  /** 動畫播放中，暫停操作。 */
  busy: boolean;
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
  setReduceMotion(on: boolean): void;
}

const systemReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  const say = (message: string) => set(s => ({ message, messageKey: s.messageKey + 1 }));

  const setFace = (id: string, face: Face | null) =>
    set(s => {
      const faces = { ...s.faces };
      if (face) faces[id] = face;
      else delete faces[id];
      return { faces };
    });

  const stage: DirectorStage = {
    commit: (game, ghosts, dry) => flushSync(() => set({ game, ghosts, dry })),
    removeGhost: id => {
      set(s => ({ ghosts: s.ghosts.filter(g => g.piece.id !== id) }));
      setFace(id, null);
    },
    setDry: dry => set({ dry }),
    setFace,
  };

  function finish(result: GameResult, mover: Piece) {
    const text = resultLine(result, mover);
    say(text);
    if (result.winner) confetti(46);
    const game = get().game;
    setTimeout(() => {
      // 等待期間如果已經按了重新開始，就不要再跳出結果。
      if (get().game === game) set({ resultText: text });
    }, prefs.reduced ? 0 : T.winOverlay);
  }

  async function runMove(result: Extract<ReturnType<typeof play>, { ok: true }>) {
    const before = get().game;
    const mover = pieceAt(before.board, result.move.from)!;
    set({ busy: true, selected: null });
    try {
      await playMove(before, result, stage);
    } finally {
      set({ busy: false });
    }
    if (get().game !== result.state) return; // 播放中按了重新開始
    if (result.state.result) finish(result.state.result, mover);
    else say(moveLine(mover, result.move.captured, result.events, result.state.turn));
  }

  const initialReduced = systemReducedMotion();
  prefs.reduced = initialReduced;
  if (typeof document !== 'undefined') document.documentElement.dataset.motion = initialReduced ? 'reduced' : 'full';

  return {
    game: createGame(),
    selected: null,
    busy: false,
    message: turnPrompt('red'),
    messageKey: 0,
    ghosts: [],
    faces: {},
    dry: null,
    resultText: null,
    reduceMotion: initialReduced,

    clickCell(pos) {
      const { game, selected, busy } = get();
      if (busy || game.result || !inBounds(pos)) return;
      const piece = pieceAt(game.board, pos);

      // 再點一次自己：取消選取。
      if (selected && samePos(pos, selected)) {
        set({ selected: null });
        say(turnPrompt(game.turn));
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
      const game = createGame();
      set({ game, selected: null, busy: false, ghosts: [], faces: {}, dry: null, resultText: null });
      say(turnPrompt(game.turn));
    },

    setReduceMotion(on) {
      prefs.reduced = on;
      document.documentElement.dataset.motion = on ? 'reduced' : 'full';
      set({ reduceMotion: on });
    },
  };
});
