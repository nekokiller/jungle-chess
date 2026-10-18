import { describe, expect, it } from 'vitest';
import { Mixer } from '../../src/audio/mixer';
import type { SoundId } from '../../src/audio/manifest';

/** 模擬播放：能播就加入一個 1 秒長的聲音，記下被停掉的。 */
function setup() {
  const mixer = new Mixer();
  const stopped: SoundId[] = [];
  const play = (id: SoundId, now: number, length = 1000) => {
    if (!mixer.admit(id, now)) return false;
    mixer.add({ id, until: now + length, stop: () => stopped.push(id) });
    return true;
  };
  return { mixer, stopped, play };
}

describe('混音規則', () => {
  it('按鈕、選取最短間隔 120 ms；無效提示 700 ms', () => {
    const { play } = setup();
    expect(play('ui.tap', 0, 50)).toBe(true);
    expect(play('ui.tap', 100, 50)).toBe(false);
    expect(play('ui.tap', 120, 50)).toBe(true);
    expect(play('move.invalid', 0, 50)).toBe(true);
    expect(play('move.invalid', 600, 50)).toBe(false);
    expect(play('move.invalid', 700, 50)).toBe(true);
  });

  it('被節流的聲音不會事後補播（不佔用時間點）', () => {
    const { play } = setup();
    play('piece.select', 0, 50);
    expect(play('piece.select', 60, 50)).toBe(false);
    // 第二次被丟棄，所以 120 ms 時以第一次為準，可以播。
    expect(play('piece.select', 120, 50)).toBe(true);
  });

  it('同一物種叫聲冷卻 3 秒，全體叫聲間隔 1 秒', () => {
    const { play } = setup();
    expect(play('animal.cat', 0, 500)).toBe(true);
    expect(play('animal.dog', 800, 500)).toBe(false);
    expect(play('animal.dog', 1000, 500)).toBe(true);
    expect(play('animal.cat', 2500, 500)).toBe(false);
    expect(play('animal.cat', 3000, 500)).toBe(true);
  });

  it('叫聲同時最多一個：新叫聲停掉上一隻', () => {
    const { play, stopped, mixer } = setup();
    play('animal.elephant', 0, 1500);
    play('animal.rat', 1000, 500);
    expect(stopped).toEqual(['animal.elephant']);
    expect(mixer.playing).toEqual(['animal.rat']);
  });

  it('同時最多 3 個聲音；滿了擠掉優先順序最低的', () => {
    const { play, stopped, mixer } = setup();
    play('piece.select', 0);
    play('piece.land', 0);
    play('piece.capture', 0);
    expect(play('game.win', 10)).toBe(true);
    expect(stopped).toEqual(['piece.select']);
    expect(mixer.playing).toEqual(['piece.land', 'piece.capture', 'game.win']);
  });

  it('新聲音比正在播的都低就丟棄', () => {
    const { play, stopped } = setup();
    play('piece.capture', 0);
    play('trap.enter', 0);
    play('game.win', 0);
    expect(play('ui.tap', 10)).toBe(false);
    expect(stopped).toEqual([]);
  });

  it('播完的聲音不佔聲道', () => {
    const { play, stopped } = setup();
    play('piece.land', 0, 100);
    play('piece.land', 0, 100);
    play('piece.land', 0, 100);
    expect(play('ui.tap', 200)).toBe(true);
    expect(stopped).toEqual([]);
  });

  it('stopCalls 只停叫聲，stopAll 全部停', () => {
    const { play, stopped, mixer } = setup();
    play('animal.lion', 0);
    play('piece.jump', 0);
    mixer.stopCalls();
    expect(stopped).toEqual(['animal.lion']);
    mixer.stopAll();
    expect(stopped).toEqual(['animal.lion', 'piece.jump']);
    expect(mixer.playing).toEqual([]);
  });
});
