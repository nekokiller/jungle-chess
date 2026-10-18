// 背景音樂：檔案、循環長度，以及 MP3 解碼後沒有自動去掉編碼延遲時的循環點換算。音檔說明見 public/audio/bgm/README.md。

export const MUSIC = {
  /** 相對 public/audio/ 的路徑。 */
  file: 'bgm/forest-little-steps-v1.mp3',
  /** 循環一次的長度（秒）。 */
  loopSeconds: 48,
  /** 母檔取樣率；編碼延遲以這個取樣率計算。 */
  sampleRate: 48000,
} as const;

/** MP3 解碼器本身固定多出的延遲（取樣數）。 */
const DECODER_DELAY = 529;

/** 讀 MP3 第一個框的 Xing／Info 標頭後面的 LAME 擴充，取出編碼延遲（取樣數）；沒有就是 null。 */
export function encoderDelay(data: ArrayBuffer): number | null {
  const b = new Uint8Array(data, 0, Math.min(data.byteLength, 8192));
  for (let i = 0; i + 8 < b.length; i++) {
    const tag = String.fromCharCode(b[i]!, b[i + 1]!, b[i + 2]!, b[i + 3]!);
    if (tag !== 'Xing' && tag !== 'Info') continue;
    const flags = b[i + 7]!;
    // 旗標依序代表：總框數、總位元組、TOC（100 bytes）、品質，都在 LAME 擴充之前。
    const lame = i + 8 + (flags & 1 ? 4 : 0) + (flags & 2 ? 4 : 0) + (flags & 4 ? 100 : 0) + (flags & 8 ? 4 : 0);
    if (lame + 24 > b.length) return null;
    return (b[lame + 21]! << 4) | (b[lame + 22]! >> 4);
  }
  return null;
}

export interface LoopPoints {
  /** 循環起點與終點（秒）；從起點開始播放。 */
  start: number;
  end: number;
}

/**
 * 解碼後的長度就是循環長度（瀏覽器已去掉編碼延遲與補白）時整段循環，回傳 null。
 * 比較長時依編碼延遲跳過開頭；算不出來也整段循環，只是接縫可能有一點空隙。
 */
export function loopPoints(duration: number, delay: number | null): LoopPoints | null {
  const { loopSeconds, sampleRate } = MUSIC;
  if (Math.abs(duration - loopSeconds) < 0.005 || delay === null) return null;
  const start = (delay + DECODER_DELAY) / sampleRate;
  return start + loopSeconds <= duration + 0.001 ? { start, end: start + loopSeconds } : null;
}
