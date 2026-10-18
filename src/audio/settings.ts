// 聲音偏好：聲音開關、音效音量、動物叫聲、背景音樂開關與音量。記在瀏覽器裡，重新開始不重設；存不了就只用這一次。

export interface AudioSettings {
  /** 主開關，關掉時所有聲音都不播。 */
  on: boolean;
  /** 音效音量 0～1。 */
  volume: number;
  /** 選取動物時播叫聲。 */
  calls: boolean;
  /** 背景音樂開關。 */
  music: boolean;
  /** 背景音樂音量 0～1。 */
  musicVolume: number;
}

export const DEFAULT_AUDIO: AudioSettings = { on: true, volume: 0.5, calls: true, music: true, musicVolume: 0.35 };

const KEY = 'jungle-chess:audio';

/** 讀回存過的偏好；欄位壞掉或不認得就用預設值。 */
export function parseAudioSettings(raw: string | null): AudioSettings {
  let data: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') data = parsed as Record<string, unknown>;
  } catch {
    // 壞掉的資料當作沒有。
  }
  const d = DEFAULT_AUDIO;
  const level = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
  const flag = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  return {
    on: flag(data.on, d.on),
    volume: level(data.volume, d.volume),
    calls: flag(data.calls, d.calls),
    music: flag(data.music, d.music),
    musicVolume: level(data.musicVolume, d.musicVolume),
  };
}

export function loadAudioSettings(): AudioSettings {
  try {
    return parseAudioSettings(typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY));
  } catch {
    return DEFAULT_AUDIO;
  }
}

export function saveAudioSettings(s: AudioSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // 無痕模式等存不了就算了。
  }
}
