// 六檔難度。深度、時間、隨機擾動參考網站的數值；入門、簡單另外加上兒童調整，讓小朋友贏得到。
import type { SearchOptions } from './search';

export type LevelId = 'novice' | 'easy' | 'medium' | 'hard' | 'expert' | 'master';

export interface Level extends SearchOptions {
  id: LevelId;
  name: string;
}

export const LEVELS: readonly Level[] = [
  // 入門：只看自己這一步，看不到對方會反擊；三成機率漏看吃子。
  { id: 'novice', name: '入門', depth: 1, timeMs: 20, noise: 110, noQuiescence: true, missCapture: 0.3 },
  // 簡單：只看一步，但會看吃子後的互吃（不會白白送子）；偶爾漏看吃子。
  // 自我對弈：贏入門約七成，「像小朋友的玩家」約有兩成五贏得到（npm run ai:selfplay）。
  { id: 'easy', name: '簡單', depth: 1, timeMs: 50, noise: 60, missCapture: 0.15 },
  { id: 'medium', name: '中等', depth: 3, timeMs: 100, noise: 12 },
  { id: 'hard', name: '困難', depth: 4, timeMs: 250 },
  { id: 'expert', name: '高手', depth: 5, timeMs: 500 },
  { id: 'master', name: '大師', depth: 6, timeMs: 1000 },
];

export const DEFAULT_LEVEL: LevelId = 'novice';

export const levelOf = (id: LevelId): Level => LEVELS.find(l => l.id === id) ?? LEVELS[0]!;
