// 播放器：單一 AudioContext、解碼快取、音量與靜音、聲道上限、取消待播，以及循環的背景音樂。
// 任何下載、解碼、播放失敗都只是略過那個聲音，不能卡住走棋。
import { LOAD_ORDER, PRIORITY, SOUNDS, type SoundId } from './manifest';
import { Mixer, type Voice } from './mixer';
import { MUSIC, encoderDelay, loopPoints, type LoopPoints } from './music';
import { DEFAULT_AUDIO, type AudioSettings } from './settings';

export interface PlayOptions {
  gain?: number;
}

/** 綁定在某個時間點的播放函式：之後若取消過（重新開始、悔棋、關聲音、切背景），呼叫就不再發聲。 */
export type Play = (id: SoundId, opts?: PlayOptions) => boolean;

const FADE = 0.03; // 淡出的時間常數（秒）
const MUSIC_FADE_IN = 1.5; // 音樂淡入（秒）
const MUSIC_FADE_OUT = 0.4; // 音樂淡出（秒）
const DUCK = 0.3; // 結算音播放時音樂壓到幾成

/** 音效與音樂各走一條匯流排，最後一起經過主開關與壓縮器。 */
interface Graph {
  ctx: AudioContext;
  master: GainNode;
  sfx: GainNode;
  music: GainNode;
  duck: GainNode;
}

class AudioManager {
  private graph: Graph | null = null;
  private resuming = false;
  private base = '';
  private bytes = new Map<SoundId, Promise<ArrayBuffer | null>>();
  private buffers = new Map<SoundId, AudioBuffer>();
  private decoding = false;
  private mixer = new Mixer();
  private epoch = 0;
  private settings: AudioSettings = DEFAULT_AUDIO;

  private musicBytes: Promise<ArrayBuffer | null> | null = null;
  private musicBuffer: Promise<{ buffer: AudioBuffer; loop: LoopPoints | null } | null> | null = null;
  private musicSrc: { src: AudioBufferSourceNode; fade: GainNode } | null = null;
  /** 對局開始後才放音樂；設定視窗剛打開、還沒開始時保持安靜。 */
  private wantMusic = false;

  /** 開始下載音檔、等待第一次手勢。初次載入不發聲。 */
  init() {
    if (typeof window === 'undefined' || this.bytes.size) return;
    this.base = import.meta.env.BASE_URL;
    for (const id of LOAD_ORDER) {
      this.bytes.set(
        id,
        fetch(`${this.base}audio/${SOUNDS[id].file}`)
          .then(r => (r.ok ? r.arrayBuffer() : null))
          .catch(() => null),
      );
    }
    // 音樂檔比較大，等音效都下載完再抓；音樂關著就先不抓。
    void Promise.all(this.bytes.values()).then(() => {
      if (this.musicEnabled()) void this.fetchMusic();
    });

    const unlock = () => this.unlock();
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click']) {
      window.addEventListener(type, unlock, { capture: true, passive: true });
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      // 切到背景：停掉音效、作廢待播，音樂跟著 AudioContext 暫停；等下一次手勢恢復，音效不補播。
      this.cancel();
      void this.graph?.ctx.suspend().catch(() => undefined);
    });
  }

  configure(settings: AudioSettings) {
    const wasOn = this.settings.on;
    this.settings = settings;
    if (wasOn && !settings.on) this.cancel();
    this.applyVolume();
    void this.syncMusic();
  }

  /** 播一個聲音；沒解鎖、還沒載入、被節流或聲道滿了就略過，回傳有沒有播。 */
  play(id: SoundId, opts?: PlayOptions): boolean {
    const g = this.graph;
    if (!g || !this.settings.on || (SOUNDS[id].call && !this.settings.calls)) return false;
    const { ctx } = g;
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
      src.connect(gain).connect(g.sfx);
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
      if (SOUNDS[id].priority === PRIORITY.result) this.duckMusic(buffer.duration);
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

  /** 停掉所有音效、作廢還沒播的待播工作（音樂不受影響）。 */
  cancel() {
    this.epoch++;
    this.mixer.stopAll();
  }

  stopCalls() {
    this.mixer.stopCalls();
  }

  /** 對局開始：音樂還沒在播就淡入，已經在播就接著播，不從頭開始。 */
  startMusic() {
    this.wantMusic = true;
    void this.syncMusic();
  }

  /** 第一次（以及之後每次）手勢：建立或恢復 AudioContext，解碼已下載的音檔。 */
  private unlock() {
    if (!this.graph) {
      try {
        const ctx = new AudioContext();
        // 多聲疊在一起時壓一下峰值，避免破音。
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.ratio.value = 12;
        const master = ctx.createGain();
        const sfx = ctx.createGain();
        const music = ctx.createGain();
        const duck = ctx.createGain();
        sfx.connect(master);
        duck.connect(music).connect(master);
        master.connect(limiter).connect(ctx.destination);
        this.graph = { ctx, master, sfx, music, duck };
        this.applyVolume(true);
      } catch {
        return;
      }
    }
    const { ctx } = this.graph;
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
      void this.syncMusic();
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

  private musicEnabled(): boolean {
    return this.settings.on && this.settings.music;
  }

  private fetchMusic(): Promise<ArrayBuffer | null> {
    this.musicBytes ??= fetch(`${this.base}audio/${MUSIC.file}`)
      .then(r => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null);
    return this.musicBytes;
  }

  /** 依設定與對局狀態開始或停止音樂。 */
  private async syncMusic() {
    if (!this.wantMusic || !this.musicEnabled()) return this.stopMusic();
    if (typeof window === 'undefined' || !this.graph || this.musicSrc) return;
    const g = this.graph;
    this.musicBuffer ??= this.fetchMusic().then(async data => {
      if (!data) return null;
      try {
        const buffer = await g.ctx.decodeAudioData(data.slice(0));
        return { buffer, loop: loopPoints(buffer.duration, encoderDelay(data)) };
      } catch {
        return null;
      }
    });
    const decoded = await this.musicBuffer;
    // 等待期間可能已經開始播放，或音樂被關掉。
    if (!decoded || this.musicSrc || !this.wantMusic || !this.musicEnabled()) return;
    try {
      const { ctx } = g;
      const src = ctx.createBufferSource();
      const { buffer, loop } = decoded;
      src.buffer = buffer;
      src.loop = true;
      if (loop) {
        src.loopStart = loop.start;
        src.loopEnd = loop.end;
      }
      const fade = ctx.createGain();
      fade.gain.setValueAtTime(0, ctx.currentTime);
      fade.gain.linearRampToValueAtTime(1, ctx.currentTime + MUSIC_FADE_IN);
      src.connect(fade).connect(g.duck);
      src.start(0, loop?.start ?? 0);
      this.musicSrc = { src, fade };
    } catch {
      // 播不了就沒有音樂。
    }
  }

  private stopMusic() {
    const m = this.musicSrc;
    const g = this.graph;
    this.musicSrc = null;
    if (!m || !g) return;
    try {
      const t = g.ctx.currentTime;
      m.fade.gain.cancelScheduledValues(t);
      m.fade.gain.setValueAtTime(m.fade.gain.value, t);
      m.fade.gain.linearRampToValueAtTime(0, t + MUSIC_FADE_OUT);
      m.src.stop(t + MUSIC_FADE_OUT + 0.05);
    } catch {
      // 已經停了
    }
  }

  /** 結算音播放時壓低音樂，播完慢慢回來。 */
  private duckMusic(seconds: number) {
    const g = this.graph;
    if (!g) return;
    const t = g.ctx.currentTime;
    const d = g.duck.gain;
    d.cancelScheduledValues(t);
    d.setTargetAtTime(DUCK, t, 0.08);
    d.setTargetAtTime(1, t + seconds, 0.6);
  }

  private applyVolume(immediate = false) {
    const g = this.graph;
    if (!g) return;
    const s = this.settings;
    const set = (node: GainNode, value: number) =>
      immediate ? (node.gain.value = value) : node.gain.setTargetAtTime(value, g.ctx.currentTime, FADE);
    set(g.master, s.on ? 1 : 0);
    set(g.sfx, s.volume);
    set(g.music, s.musicVolume);
  }
}

export const audio = new AudioManager();
