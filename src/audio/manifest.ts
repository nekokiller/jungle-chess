// 音效清單：每個音效 ID 對應的檔案、優先順序、增益與最短間隔。音檔說明見 public/audio/sfx/README.md。
import type { AnimalType } from '../engine';

export type CoreSound =
  | 'ui.tap'
  | 'piece.select'
  | 'piece.land'
  | 'piece.jump'
  | 'water.enter'
  | 'water.exit'
  | 'water.step'
  | 'piece.capture'
  | 'trap.enter'
  | 'trap.leave'
  | 'move.invalid'
  | 'game.start'
  | 'game.win'
  | 'game.encourage'
  | 'game.draw';

export type CallSound = `animal.${AnimalType}`;
export type SoundId = CoreSound | CallSound;

/** 搶占優先順序：結算 ＞ 吃子／入陷阱／水花 ＞ 移動 ＞ 選取／按鈕／叫聲。 */
export const PRIORITY = { ui: 0, move: 1, event: 2, result: 3 } as const;

export interface SoundDef {
  /** 相對 public/audio/ 的路徑。 */
  file: string;
  priority: number;
  /** 個別增益（0～1），乘上總音量。 */
  gain: number;
  /** 同一個音效的最短間隔（毫秒）。 */
  gap: number;
  /** 動物叫聲：同時最多一個，另有全體間隔。 */
  call: boolean;
}

const sfx = (name: string, priority: number, gap = 0): SoundDef => ({
  file: `sfx/${name}-v1.mp3`,
  priority,
  gain: 1,
  gap,
  call: false,
});

/** 同一物種叫聲冷卻 3 秒。 */
const call = (type: AnimalType): SoundDef => ({
  file: `animals/${type}-call-v1.mp3`,
  priority: PRIORITY.ui,
  gain: 0.85,
  gap: 3000,
  call: true,
});

export const SOUNDS: Record<SoundId, SoundDef> = {
  'ui.tap': sfx('ui-tap', PRIORITY.ui, 120),
  'piece.select': sfx('piece-select', PRIORITY.ui, 120),
  'move.invalid': sfx('move-invalid', PRIORITY.ui, 700),
  'piece.land': sfx('piece-land', PRIORITY.move),
  'piece.jump': sfx('piece-jump', PRIORITY.move),
  'water.step': sfx('water-step', PRIORITY.move),
  'trap.leave': sfx('trap-leave', PRIORITY.move),
  'water.enter': sfx('water-enter', PRIORITY.event),
  'water.exit': sfx('water-exit', PRIORITY.event),
  'piece.capture': sfx('piece-capture', PRIORITY.event),
  'trap.enter': sfx('trap-enter', PRIORITY.event),
  'game.start': sfx('game-start', PRIORITY.result),
  'game.win': sfx('game-win', PRIORITY.result),
  'game.encourage': sfx('game-encourage', PRIORITY.result),
  'game.draw': sfx('game-draw', PRIORITY.result),
  'animal.elephant': call('elephant'),
  'animal.lion': call('lion'),
  'animal.tiger': call('tiger'),
  'animal.leopard': call('leopard'),
  'animal.wolf': call('wolf'),
  'animal.dog': call('dog'),
  'animal.cat': call('cat'),
  'animal.rat': call('rat'),
};

/** 同時最多幾個聲音。 */
export const MAX_VOICES = 3;
/** 任兩聲動物叫聲至少間隔多久（毫秒）。 */
export const CALL_GAP = 1000;

export const callOf = (type: AnimalType): CallSound => `animal.${type}`;

/** 核心音效先載入，動物叫聲排在後面。 */
export const LOAD_ORDER = (Object.keys(SOUNDS) as SoundId[]).sort(
  (a, b) => Number(SOUNDS[a].call) - Number(SOUNDS[b].call),
);
