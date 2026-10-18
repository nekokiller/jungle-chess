// 播放器：單一 AudioContext、解碼快取、音量與靜音、聲道上限、取消待播。
// 任何下載、解碼、播放失敗都只是略過那個聲音，不能卡住走棋。
import { LOAD_ORDER, SOUNDS, type SoundId } from './manifest';
import { Mixer, type Voice } from './mixer';
import { DEFAULT_AUDIO, type AudioSettings } from './settings';

export interface PlayOptions {
  gain?: number;
}

/** 綁定在某個時間點的播放函式：之後若取消過（重新開始、悔棋、關聲音、切背景），呼叫就不再發聲。 */
export type Play = (id: SoundId, opts?: PlayOptions) => boolean;

const FADE = 0.03; // 淡出的時間常數（秒）

class AudioManager {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private resuming = false;
  private bytes = new Map<SoundId, Promise<ArrayBuffer | null>>();
  private buffers = new Map<SoundId, AudioBuffer>();
  private decoding = false;
  private mixer = new Mixer();
  private epoch = 0;
  private settings: AudioSettings = DEFAULT_AUDIO;

  /** 開始下載音檔、等待第一次手勢。初次載入不發聲。 */
  init() {
    if (typeof window === 'undefined' || this.bytes.size) return;
    const base = import.meta.env.BASE_URL;
    for (const id of LOAD_ORDER) {
      this.bytes.set(
        id,
        fetch(`${base}audio/${SOUNDS[id].file}`)
          .then(r => (r.ok ? r.arrayBuffer() : null))
          .catch(() => null),
      );
    }
    const unlock = () => this.unlock();
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click']) {
      window.addEventListener(type, unlock, { capture: true, passive: true });
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      // 切到背景：停掉聲音、作廢待播；回前景不補播，等下一次手勢恢復。
      this.cancel();
      void this.ctx?.suspend().catch(() => undefined);
    });
  }

  configure(settings: AudioSettings) {
    const wasOn = this.settings.on;
    this.settings = settings;
    if (wasOn && !settings.on) this.cancel();
    this.applyVolume();
  }

  /** 播一個聲音；沒解鎖、還沒載入、被節流或聲道滿了就略過，回傳有沒有播。 */
  play(id: SoundId, opts?: PlayOptions): boolean {
    const { ctx, out } = this;
    if (!ctx || !out || !this.settings.on || (SOUNDS[id].call && !this.settings.calls)) return false;
    if (document.hidden || (ctx.state !== 'running' && !this.resuming)) return false;
    const buffer = this.buffers.get(id);
    if (!buffer) return false;
    const now = performance.now();
    if (!this.mixer.admit(id, now)) return false;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = SOUNDS[id].gain * (opts?.gain ?? 1);
      src.connect(gain).connect(out);
      const voice: Voice = {
        id,
        until: now + buffer.duration * 1000,
        stop: () => {
          try {
            gain.gain.setTargetAtTime(0, ctx.currentTime, FADE);
            src.stop(ctx.currentTime + FADE * 4);
          } catch {
            // 已經停了
          }
        },
      };
      src.onended = () => {
        this.mixer.remove(voice);
        gain.disconnect();
      };
      src.start();
      this.mixer.add(voice);
      return true;
    } catch {
      return false;
    }
  }

  /** 取得綁定目前這一輪的播放函式，給延後觸發的聲音（動畫節點）用。 */
  scope(): Play {
    const epoch = this.epoch;
    return (id, opts) => epoch === this.epoch && this.play(id, opts);
  }

  /** 停掉所有聲音、作廢還沒播的待播工作。 */
  cancel() {
    this.epoch++;
    this.mixer.stopAll();
  }

  stopCalls() {
    this.mixer.stopCalls();
  }

  /** 第一次（以及之後每次）手勢：建立或恢復 AudioContext，解碼已下載的音檔。 */
  private unlock() {
    if (!this.ctx) {
      try {
        const ctx = new AudioContext();
        // 多聲疊在一起時壓一下峰值，避免破音。
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.ratio.value = 12;
        const out = ctx.createGain();
        out.connect(limiter).connect(ctx.destination);
        this.ctx = ctx;
        this.out = out;
        out.gain.value = this.target();
      } catch {
        return;
      }
    }
    const ctx = this.ctx;
    if (ctx.state !== 'running' && !this.resuming) {
      this.resuming = true;
      ctx
        .resume()
        .catch(() => undefined)
        .finally(() => (this.resuming = false));
    }
    if (!this.decoding) {
      this.decoding = true;
      void this.decodeAll(ctx);
    }
  }

  private async decodeAll(ctx: AudioContext) {
    for (const id of LOAD_ORDER) {
      const data = await this.bytes.get(id);
      if (!data) continue;
      try {
        // 複製一份：decodeAudioData 會拿走原本的 ArrayBuffer。
        this.buffers.set(id, await ctx.decodeAudioData(data.slice(0)));
      } catch {
        // 解碼失敗就沒有這個聲音。
      }
    }
  }

  private applyVolume() {
    const { ctx, out } = this;
    if (!ctx || !out) return;
    out.gain.setTargetAtTime(this.target(), ctx.currentTime, FADE);
  }

  private target(): number {
    return this.settings.on ? this.settings.volume : 0;
  }
}

export const audio = new AudioManager();
