// 開局設定：對手、難度、玩家執哪一方、誰先走。記在瀏覽器裡，下次打開沿用。
import { opponent, type Side } from '../engine';
import { DEFAULT_LEVEL, LEVELS, type LevelId } from '../ai/levels';

export type Mode = 'ai' | 'pvp';

export interface Settings {
  mode: Mode;
  level: LevelId;
  /** 和電腦下時玩家是哪一方。 */
  humanSide: Side;
  /** 和電腦下時玩家先走。 */
  humanFirst: boolean;
  /** 兩個人輪流時哪一方先走。 */
  pvpFirst: Side;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'ai',
  level: DEFAULT_LEVEL,
  humanSide: 'red',
  humanFirst: true,
  pvpFirst: 'red',
};

/** 開局時輪到哪一方。 */
export const firstSide = (s: Settings): Side =>
  s.mode === 'ai' ? (s.humanFirst ? s.humanSide : opponent(s.humanSide)) : s.pvpFirst;

/** 棋盤要不要上下顛倒：和電腦下時，玩家的動物一律在下方。 */
export const isFlipped = (s: Settings): boolean => s.mode === 'ai' && s.humanSide === 'blue';

const KEY = 'jungle-chess:settings';
const isSide = (v: unknown): v is Side => v === 'red' || v === 'blue';

/** 讀回存過的設定；欄位壞掉或不認得就用預設值。 */
export function parseSettings(raw: string | null): Settings {
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') data = parsed as Record<string, unknown>;
  } catch {
    // 壞掉的資料當作沒有。
  }
  const d = DEFAULT_SETTINGS;
  return {
    mode: data.mode === 'ai' || data.mode === 'pvp' ? data.mode : d.mode,
    level: LEVELS.some(l => l.id === data.level) ? (data.level as LevelId) : d.level,
    humanSide: isSide(data.humanSide) ? data.humanSide : d.humanSide,
    humanFirst: typeof data.humanFirst === 'boolean' ? data.humanFirst : d.humanFirst,
    pvpFirst: isSide(data.pvpFirst) ? data.pvpFirst : d.pvpFirst,
  };
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadSettings(): Settings {
  try {
    return parseSettings(storage()?.getItem(KEY) ?? null);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings) {
  try {
    storage()?.setItem(KEY, JSON.stringify(s));
  } catch {
    // 無痕模式等存不了就算了，只是下次要重選。
  }
}

const MOTION_KEY = 'jungle-chess:reduce-motion';

/** 遊戲內「減少動態效果」開關；沒切過就是 null（跟隨系統）。 */
export function loadReduceMotion(): boolean | null {
  try {
    const v = storage()?.getItem(MOTION_KEY);
    return v === '1' ? true : v === '0' ? false : null;
  } catch {
    return null;
  }
}

export function saveReduceMotion(on: boolean) {
  try {
    storage()?.setItem(MOTION_KEY, on ? '1' : '0');
  } catch {
    // 同上
  }
}
