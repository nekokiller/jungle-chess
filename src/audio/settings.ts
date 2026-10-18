// 聲音偏好：聲音開關、音量、動物叫聲。記在瀏覽器裡，重新開始不重設；存不了就只用這一次。

export interface AudioSettings {
  /** 主開關，關掉時所有聲音都不播。 */
  on: boolean;
  /** 音效音量 0～1。 */
  volume: number;
  /** 選取動物時播叫聲。 */
  calls: boolean;
}

export const DEFAULT_AUDIO: AudioSettings = { on: true, volume: 0.5, calls: true };

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
  const volume = typeof data.volume === 'number' && Number.isFinite(data.volume) ? data.volume : d.volume;
  return {
    on: typeof data.on === 'boolean' ? data.on : d.on,
    volume: Math.min(1, Math.max(0, volume)),
    calls: typeof data.calls === 'boolean' ? data.calls : d.calls,
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
