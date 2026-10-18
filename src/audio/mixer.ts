// 混音規則（不碰 Web Audio，可以單獨測試）：最短間隔、叫聲冷卻、聲道上限與優先順序。
import { CALL_GAP, MAX_VOICES, SOUNDS, type SoundId } from './manifest';

export interface Voice {
  id: SoundId;
  /** 預計播完的時間（毫秒）。 */
  until: number;
  /** 短淡出後停止。 */
  stop(): void;
}

export class Mixer {
  private last = new Map<SoundId, number>();
  private lastCall = -Infinity;
  private voices: Voice[] = [];

  /** 現在能不能播 id；可以時會先停掉要讓位的聲音，並記下播放時間。超出時直接丟棄，不排隊補播。 */
  admit(id: SoundId, now: number): boolean {
    const def = SOUNDS[id];
    if (now - (this.last.get(id) ?? -Infinity) < def.gap) return false;
    if (def.call && now - this.lastCall < CALL_GAP) return false;

    this.voices = this.voices.filter(v => v.until > now);
    if (def.call) this.stopWhere(v => SOUNDS[v.id].call);
    if (this.voices.length >= MAX_VOICES) {
      // 擠掉優先順序最低、最早開始的聲音；新聲音比它們都低就不播。
      let weakest = this.voices[0]!;
      for (const v of this.voices) if (SOUNDS[v.id].priority < SOUNDS[weakest.id].priority) weakest = v;
      if (SOUNDS[weakest.id].priority > def.priority) return false;
      this.stopWhere(v => v === weakest);
    }

    this.last.set(id, now);
    if (def.call) this.lastCall = now;
    return true;
  }

  add(voice: Voice) {
    this.voices.push(voice);
  }

  remove(voice: Voice) {
    this.voices = this.voices.filter(v => v !== voice);
  }

  /** 停掉正在播的動物叫聲（改選另一隻、開始走棋時）。 */
  stopCalls() {
    this.stopWhere(v => SOUNDS[v.id].call);
  }

  stopAll() {
    this.stopWhere(() => true);
  }

  get playing(): readonly SoundId[] {
    return this.voices.map(v => v.id);
  }

  private stopWhere(pred: (v: Voice) => boolean) {
    const [gone, kept] = [this.voices.filter(pred), this.voices.filter(v => !pred(v))];
    this.voices = kept;
    for (const v of gone) v.stop();
  }
}
