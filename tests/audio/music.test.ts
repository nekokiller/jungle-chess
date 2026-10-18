import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MUSIC, encoderDelay, loopPoints } from '../../src/audio/music';

const file = readFileSync(`public/audio/${MUSIC.file}`);
const mp3 = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;

describe('背景音樂循環', () => {
  it('讀得到 MP3 標頭記錄的編碼延遲', () => {
    expect(encoderDelay(mp3)).toBe(576);
  });

  it('沒有 Xing／Info 標頭時是 null', () => {
    expect(encoderDelay(new Uint8Array(64).buffer)).toBeNull();
  });

  it('解碼長度剛好 48 秒（瀏覽器已去掉延遲）：整段循環', () => {
    expect(loopPoints(48, 576)).toBeNull();
    expect(loopPoints(48.002, null)).toBeNull();
  });

  it('解碼後多了延遲與補白：跳過開頭的延遲，循環剛好 48 秒', () => {
    const extra = (576 + 529 + 576) / MUSIC.sampleRate;
    const loop = loopPoints(48 + extra, 576)!;
    expect(loop.start).toBeCloseTo(1105 / 48000, 6);
    expect(loop.end - loop.start).toBeCloseTo(48, 6);
  });

  it('算不出來或長度不合理就整段循環', () => {
    expect(loopPoints(48.1, null)).toBeNull();
    expect(loopPoints(47.5, 576)).toBeNull();
  });
});
