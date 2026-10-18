// 對局層：開局設定、目前的對局、選取、提示文字、悔棋，以及「點格子 → 引擎 → 動畫導演」和 AI 回合的流程。
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
import { view } from '../animation/registry';
import { requestMove } from '../ai/client';
import { confetti } from '../components/Effects/effects';
import { audio } from '../audio/manager';
import { resultCue } from '../audio/cues';
import { callOf } from '../audio/manifest';
import { loadAudioSettings, saveAudioSettings, type AudioSettings } from '../audio/settings';
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
  welcome,
  yourTurnPrompt,
  type SelectContext,
} from '../copy/zh-TW';
import {
  firstSide,
  isFlipped,
  loadReduceMotion,
  loadSettings,
  saveReduceMotion,
  saveSettings,
  type Settings,
} from './settings';

export type { Mode, Settings } from './settings';

type PlayOk = Extract<ReturnType<typeof play>, { ok: true }>;

interface GameStore {
  game: GameState;
  /** 每一步之前的對局，用來悔棋。 */
  history: GameState[];
  /** 這一局的設定。 */
  settings: Settings;
  /** 開局設定視窗打開中。 */
  setupOpen: boolean;
  /** 已經開始下過（設定視窗可以按「取消」回到對局）。 */
  started: boolean;
  /** 棋盤上下顛倒（玩家執藍方）。 */
  flipped: boolean;
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
  /** 聲音偏好。 */
  audio: AudioSettings;

  clickCell(pos: Pos): void;
  /** 用新的設定開一局。 */
  start(settings: Settings): void;
  /** 用同樣的設定再下一局。 */
  newGame(): void;
  openSetup(): void;
  closeSetup(): void;
  undo(): void;
  setReduceMotion(on: boolean): void;
  setAudio(patch: Partial<AudioSettings>): void;
}

/** 有沒有可以退回去的一步：和電腦下時，要退得回輪到玩家的局面。 */
export const canUndo = (s: Pick<GameStore, 'history' | 'busy' | 'settings'>): boolean =>
  !s.busy &&
  (s.settings.mode === 'ai' ? s.history.some(g => g.turn === s.settings.humanSide) : s.history.length > 0);

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
  const vsAi = () => get().settings.mode === 'ai';
  const humanSide = () => get().settings.humanSide;
  const isAiTurn = () => vsAi() && get().game.turn !== humanSide();
  /** 「藍方」「你」「電腦」 */
  const who = (side: Side) => (vsAi() ? (side === humanSide() ? '你' : '電腦') : SIDE[side]);
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
    const text = resultLine(result, mover, vsAi() ? humanSide() : undefined);
    say(text);
    audio.play(resultCue(result, vsAi() ? humanSide() : undefined));
    if (result.winner && (!vsAi() || result.winner === humanSide())) confetti(46);
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
    if (!isAiTurn() || get().game.result || get().setupOpen) return;
    const token = ++aiToken;
    const { game } = get();
    const { level } = get().settings;
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
    audio.cancel();
    set({ game, history, selected: null, busy: false, thinking: false, ghosts: [], faces: {}, dry: null, resultText: null });
  }

  function applyMotion(on: boolean) {
    prefs.reduced = on;
    if (typeof document !== 'undefined') document.documentElement.dataset.motion = on ? 'reduced' : 'full';
  }

  const initialSettings = loadSettings();
  const initialReduced = loadReduceMotion() ?? systemReducedMotion();
  applyMotion(initialReduced);
  view.flipped = isFlipped(initialSettings);
  const initialAudio = loadAudioSettings();
  audio.configure(initialAudio);

  return {
    // 一打開先顯示開局設定，盤面先擺好當背景。
    game: createGame(undefined, firstSide(initialSettings)),
    history: [],
    settings: initialSettings,
    setupOpen: true,
    started: false,
    flipped: view.flipped,
    selected: null,
    busy: false,
    thinking: false,
    message: welcome,
    messageKey: 0,
    ghosts: [],
    faces: {},
    dry: null,
    resultText: null,
    reduceMotion: initialReduced,
    audio: initialAudio,

    clickCell(pos) {
      const { game, selected, busy, thinking, setupOpen } = get();
      if (setupOpen || busy || game.result || !inBounds(pos)) return;
      if (thinking || isAiTurn()) {
        audio.play('move.invalid');
        return say(waitForAi);
      }
      const piece = pieceAt(game.board, pos);

      // 再點一次自己：取消選取（不發聲）。
      if (selected && samePos(pos, selected)) {
        audio.stopCalls();
        set({ selected: null });
        say(prompt(game.turn));
        return;
      }
      // 點輪到的一方的動物：選取（或換一隻）。
      if (piece && piece.side === game.turn) {
        // 叫聲取代選取聲；叫聲關掉或冷卻中就播普通的選取聲。
        audio.stopCalls();
        if (!audio.play(callOf(piece.type))) audio.play('piece.select');
        set({ selected: pos });
        say(selectLine(piece.type, selectContext(game, pos, piece)));
        return;
      }
      if (!selected) {
        if (!piece) say(pickFirst);
        else {
          say(notYourTurn(game.turn));
          audio.play('move.invalid');
          void headshake(piece.id);
        }
        return;
      }

      const result = play(game, selected, pos);
      if (!result.ok) {
        const mover = pieceAt(game.board, selected)!;
        say(reasonLine(result.reason, { mover, target: piece, moverInWater: isWater(selected), turn: game.turn }));
        audio.play('move.invalid');
        void headshake(mover.id);
        return;
      }
      void runMove(result);
    },

    start(settings) {
      saveSettings(settings);
      view.flipped = isFlipped(settings);
      set({ settings, flipped: view.flipped, setupOpen: false });
      get().newGame();
    },

    newGame() {
      const first = firstSide(get().settings);
      reset(createGame(undefined, first), []);
      audio.play('game.start');
      set({ setupOpen: false, started: true });
      say(prompt(first));
      void aiTurn();
    },

    openSetup() {
      if (get().busy) return;
      // 打開設定時先停下電腦，關掉後再繼續。
      aiToken++;
      audio.play('ui.tap');
      set({ setupOpen: true, thinking: false, selected: null });
    },

    closeSetup() {
      if (!get().started) return;
      audio.play('ui.tap');
      set({ setupOpen: false });
      const { game } = get();
      if (!game.result) say(isAiTurn() ? aiThinking : prompt(game.turn));
      void aiTurn();
    },

    undo() {
      const state = get();
      if (!canUndo(state)) return;
      const { history } = state;
      // 和電腦下：退回上一次輪到玩家的時候（通常是退兩步：電腦的和自己的）。
      let i = history.length - 1;
      if (vsAi()) while (i > 0 && history[i]!.turn !== humanSide()) i--;
      const game = history[i]!;
      reset(game, history.slice(0, i));
      audio.play('ui.tap');
      say(undone);
      void aiTurn();
    },

    setReduceMotion(on) {
      applyMotion(on);
      saveReduceMotion(on);
      set({ reduceMotion: on });
      audio.play('ui.tap');
    },

    setAudio(patch) {
      const next = { ...get().audio, ...patch };
      audio.configure(next);
      saveAudioSettings(next);
      set({ audio: next });
    },
  };
});
