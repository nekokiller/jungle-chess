// 動畫導演：把引擎回傳的事件清單依序播成動畫。玩家和（之後的）AI 走棋都走這條流程。
import { animate } from 'motion';
import { pieceAt, type GameEvent, type GameState, type Move, type Piece, type Pos } from '../engine';
import type { Face } from '../components/Animal/Animal';
import { burst, popText } from '../components/Effects/effects';
import { cellCenter, cellSize, pieceEl } from './registry';
import { T, prefs } from './timings';

/** 被吃掉、但還在播被吃動畫的動物。 */
export interface Ghost {
  piece: Piece;
  pos: Pos;
}

/** 導演需要對局 store 配合做的事。 */
export interface DirectorStage {
  /** 立刻（同步）把畫面換成新的盤面。dry：剛下水、落地前還不要顯示泡在水裡的動物。 */
  commit(state: GameState, ghosts: Ghost[], dry: string | null): void;
  removeGhost(id: string): void;
  setDry(id: string | null): void;
  setFace(id: string, face: Face | null): void;
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const part = (el: HTMLElement, sel: string) => el.querySelector<HTMLElement>(sel);

const SQUASH = {
  transform: ['scale(1,1)', 'scale(1.12,.86)', 'scale(.92,1.1)', 'scale(1,1)', 'scale(1.14,.84)', 'scale(1,1)'],
};
const SQUASH_TIMES = [0, 0.12, 0.35, 0.75, 0.9, 1];

/** 從 from 蹦跳（或大跳）到 to。棋子已經在新位置，這裡從舊位置的偏移量播回 0。 */
function travel(id: string, move: Move): Promise<void> {
  const el = pieceEl(id);
  if (prefs.reduced || !el) return Promise.resolve();
  const jump = move.kind === 'jump';
  const duration = (jump ? T.jump : T.step) / 1000;
  const cs = cellSize();
  const dx = (move.from.col - move.to.col) * cs;
  const dy = (move.from.row - move.to.row) * cs;
  const arc = cs * (jump ? 1.05 : 0.3);
  const tilt = Math.sign(move.to.col - move.from.col);

  el.style.zIndex = '10';
  const body = part(el, '.travel')!;
  const moving = animate(body, { transform: [`translate(${dx}px,${dy}px)`, 'translate(0px,0px)'] }, { duration, ease: [0.4, 0, 0.6, 1] });
  animate(
    part(el, '.hop')!,
    { transform: ['translateY(0px)', `translateY(${-arc}px)`, 'translateY(0px)'] },
    { duration, times: [0, 0.5, 1], ease: [[0.25, 0.6, 0.45, 1], [0.55, 0, 0.75, 0.4]] },
  );
  if (jump) {
    animate(
      part(el, '.act')!,
      {
        transform: [
          'scale(1,1) rotate(0deg)',
          'scale(1.15,.82) rotate(0deg)',
          `scale(.9,1.12) rotate(${tilt * 12}deg)`,
          `scale(1,1) rotate(${tilt * -6}deg)`,
          'scale(1.18,.8) rotate(0deg)',
          'scale(1,1) rotate(0deg)',
        ],
      },
      { duration, times: [0, 0.1, 0.4, 0.8, 0.9, 1] },
    );
  } else {
    animate(part(el, '.act')!, SQUASH, { duration, times: SQUASH_TIMES });
  }
  animate(part(el, '.shadow')!, { transform: ['scale(1)', 'scale(.5)', 'scale(1)'], opacity: [1, 0.45, 1] }, { duration });
  return moving.then(() => {
    el.style.zIndex = '';
  });
}

/** 被吃掉：縮小旋轉、迸出星星與「噗！」。 */
async function poof(id: string, at: Pos): Promise<void> {
  await sleep(prefs.reduced ? 60 : T.poofDelay);
  const el = pieceEl(id);
  if (!el) return;
  const duration = prefs.reduced ? 160 : T.poof;
  const c = cellCenter(at);
  setTimeout(() => {
    burst(c.x, c.y, 'star', 12, c.cs * 0.66);
    popText(c.x, c.y - c.cs * 0.3, '噗！');
  }, duration * 0.4);
  await animate(
    part(el, '.act')!,
    { transform: ['scale(1) rotate(0deg)', 'scale(1.18) rotate(-8deg)', 'scale(0) rotate(200deg)'], opacity: [1, 1, 0] },
    { duration: duration / 1000, times: [0, 0.35, 1], ease: 'easeIn' },
  );
}

/** 不能走：搖頭。 */
export function headshake(id: string): Promise<void> {
  const el = pieceEl(id);
  if (!el) return Promise.resolve();
  return animate(
    part(el, '.act')!,
    { transform: ['rotate(0deg)', 'rotate(-14deg)', 'rotate(12deg)', 'rotate(-9deg)', 'rotate(6deg)', 'rotate(0deg)'] },
    { duration: (prefs.reduced ? 300 : T.headshake) / 1000, ease: 'easeOut' },
  ).then(() => undefined);
}

/** 播完一步棋的所有事件。gameOver 的慶祝由 store 處理。 */
export async function playMove(
  before: GameState,
  result: { state: GameState; move: Move; events: readonly GameEvent[] },
  stage: DirectorStage,
): Promise<void> {
  const { move, events, state } = result;
  const mover = pieceAt(before.board, move.from)!;
  const victim = move.captured;
  const has = (kind: GameEvent['kind']) => events.some(e => e.kind === kind);

  if (has('leaveWater')) {
    const s = cellCenter(move.from, 0.1);
    burst(s.x, s.y, 'drop', 9, s.cs * 0.55);
  }
  if (victim) stage.setFace(victim.id, 'hurt');
  stage.commit(state, victim ? [{ piece: victim, pos: move.to }] : [], has('enterWater') ? mover.id : null);

  const moving = travel(mover.id, move);
  const eaten = victim
    ? (async () => {
        await sleep(((move.kind === 'jump' ? T.jump : T.step) * T.captureAt) * (prefs.reduced ? 0 : 1));
        await poof(victim.id, move.to);
        stage.removeGhost(victim.id);
      })()
    : Promise.resolve();
  await Promise.all([moving, eaten]);
  if (victim && !prefs.reduced) await sleep(T.afterCapture);

  if (has('enterWater')) {
    stage.setDry(null);
    const s = cellCenter(move.to, 0.1);
    burst(s.x, s.y, 'drop', 12, s.cs * 0.6);
    popText(s.x, s.y - s.cs * 0.4, '撲通！');
  }
  if (move.kind === 'jump') {
    const s = cellCenter(move.to, 0.4);
    burst(s.x, s.y, 'dust', 8, s.cs * 0.45);
  }
  if (victim) {
    stage.setFace(mover.id, 'happy');
    setTimeout(() => stage.setFace(mover.id, null), T.happyFace);
  }
}
