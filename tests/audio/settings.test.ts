import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_AUDIO, parseAudioSettings } from '../../src/audio/settings';
import { audio } from '../../src/audio/manager';
import { LOAD_ORDER, SOUNDS } from '../../src/audio/manifest';

describe('聲音偏好', () => {
  it('沒存過或壞掉就用預設值：聲音開、音效 50%、叫聲開、音樂開 35%', () => {
    expect(parseAudioSettings(null)).toEqual({ on: true, volume: 0.5, calls: true, music: true, musicVolume: 0.35 });
    expect(parseAudioSettings('{壞掉')).toEqual(DEFAULT_AUDIO);
    expect(parseAudioSettings('"字串"')).toEqual(DEFAULT_AUDIO);
  });

  it('讀回存過的值，不認得的欄位用預設值，音量限制在 0～1', () => {
    expect(parseAudioSettings('{"on":false,"volume":0.8,"calls":false,"music":false,"musicVolume":0.2}')).toEqual({
      on: false,
      volume: 0.8,
      calls: false,
      music: false,
      musicVolume: 0.2,
    });
    expect(parseAudioSettings('{"on":"yes","volume":3,"musicVolume":"大聲"}')).toEqual({ ...DEFAULT_AUDIO, volume: 1 });
    expect(parseAudioSettings('{"volume":-1}').volume).toBe(0);
    // 舊版只存了音效設定：音樂用預設值。
    expect(parseAudioSettings('{"on":true,"volume":0.75,"calls":true}')).toMatchObject({ volume: 0.75, music: true, musicVolume: 0.35 });
  });
});

describe('播放器', () => {
  it('還沒解鎖、沒有音檔時播放只是略過，不會丟錯', () => {
    expect(audio.play('piece.land')).toBe(false);
    expect(() => audio.startMusic()).not.toThrow();
    const later = audio.scope();
    audio.cancel();
    expect(later('piece.capture')).toBe(false);
  });

  it('每個音效 ID 都有對應的 MP3', () => {
    for (const def of Object.values(SOUNDS)) expect(existsSync(`public/audio/${def.file}`), def.file).toBe(true);
  });

  it('核心音效先載入，動物叫聲排在後面', () => {
    const firstCall = LOAD_ORDER.findIndex(id => SOUNDS[id].call);
    expect(firstCall).toBe(15);
    expect(LOAD_ORDER.slice(firstCall).every(id => SOUNDS[id].call)).toBe(true);
  });
});
