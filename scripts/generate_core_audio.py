"""Build 15 original core SFX, WAV masters, MP3 delivery files and a manifest.

Run from any directory: python scripts/generate_core_audio.py
Requires Python standard library and FFmpeg (libmp3lame) on PATH.
The five approved WAV files are copied byte-for-byte from the audition archive.
"""

import hashlib
import json
import math
import shutil
import struct
import subprocess
import sys
import wave
from pathlib import Path

sys.dont_write_bytecode = True
import generate_audio_samples as synth

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/audio/sfx"
ARCHIVE = ROOT / "public/audio-preview/samples"
RATE = synth.RATE
tone = synth.tone
noise = synth.noise


def tap(buf):
    tone(buf, 0, .085, 620, .27, 6, (1, .12, .03), -50)
    tone(buf, 0, .055, 1280, .055, 7, (1,))
    noise(buf, 0, .045, .08, .14)


def select(buf):
    tone(buf, 0, .14, 470, .29, 3.5, (1, .09), 230)
    tone(buf, .025, .10, 940, .045, 5, (1,), 170)


def jump(buf):
    # A soft rising whistle with a rounded airy envelope, not a sharp attack.
    low = 0.
    for i in range(round(.30 * RATE)):
        t = i / RATE
        x = t / .30
        envelope = math.sin(math.pi * x) ** 1.5
        low += .055 * (synth.RNG.uniform(-1, 1) - low)
        phase = 2 * math.pi * (350 * t + 550 * t * t / .60)
        buf[i] += envelope * (.23 * math.sin(phase) + .19 * low)


def water_exit(buf):
    noise(buf, 0, .18, .42, .10)
    tone(buf, .006, .12, 540, .20, 5, (1,), -150)
    tone(buf, .065, .14, 1000, .16, 5, (1,), -260)
    tone(buf, .13, .10, 1380, .09, 5, (1,), -360)


def water_step(buf):
    noise(buf, 0, .17, .40, .045)
    tone(buf, .008, .14, 420, .21, 4, (1, .025), -150)
    tone(buf, .08, .10, 690, .09, 5, (1,), -180)


def trap_enter(buf):
    tone(buf, 0, .16, 659.25, .26, 4.5, (1, .20, .04))
    tone(buf, .115, .17, 440, .26, 4.5, (1, .20, .04))
    tone(buf, .12, .12, 220, .065, 5, (1,))


def trap_leave(buf):
    tone(buf, 0, .13, 440, .23, 4, (1, .15))
    tone(buf, .08, .14, 659.25, .25, 4, (1, .15))
    tone(buf, .085, .12, 1318.5, .035, 5, (1,))


def start(buf):
    for at, frequency in [(0, 392), (.13, 523.25), (.26, 659.25)]:
        tone(buf, at, .34, frequency, .27, 5, (1, .16, .04))


def encourage(buf):
    # A reassuring F-major figure, quieter and less exuberant than winning.
    for at, frequency in [(0, 523.25), (.19, 440), (.40, 523.25)]:
        tone(buf, at, .44, frequency, .225, 4, (1, .10, .02))
    for frequency in [349.23, 440, 523.25]:
        tone(buf, .58, .52, frequency, .075, 4, (1, .07))


def draw(buf):
    for at, frequency in [(0, 587.33), (.19, 493.88), (.38, 392)]:
        tone(buf, at, .45, frequency, .24, 4, (1, .12, .025))
    tone(buf, .40, .53, 196, .08, 4, (1, .04))


# Keep the original five first so established audition numbers remain stable.
# id, title, duration, renderer (None = approved archive), icon, character, use
SOUNDS = [
    ("piece.land", "輕輕落地", .20, None, "🐾", "圓潤木頭 · 咚", "動物落地，像小木偶輕輕踩在棋盤上。"),
    ("piece.capture", "噗！變星星", .34, None, "✨", "氣泡消失 · 噗啵", "吃子時用氣泡與亮音，配合變成星星的感覺。"),
    ("water.enter", "老鼠下水", .36, None, "💧", "小小水花 · 撲通", "圓圓入水聲，接上幾顆輕快的水滴。"),
    ("move.invalid", "換一步試試", .26, None, "🌱", "柔和提醒 · 嘟啵", "兩個溫和音符，提醒這一格不能走。"),
    ("game.win", "贏了，真開心！", 1.75, None, "🎉", "小木琴 · 上揚短旋律", "四個往上跳的音符，停在暖暖的和弦上。"),
    ("ui.tap", "輕點一下", .09, tap, "🪵", "小木片 · 嗒", "一般按鈕的短回饋，比走棋落地更輕更短。"),
    ("piece.select", "就選你了", .15, select, "👆", "上揚氣泡 · 啵", "選取動物時，一個小小上揚音回應操作。"),
    ("piece.jump", "跳過小河", .32, jump, "🐯", "柔和滑音 · 咻", "獅虎起跳的上升滑音，尾端自然收住。"),
    ("water.exit", "抖抖水上岸", .24, water_exit, "🫧", "細碎水滴 · 啪啦", "老鼠離水時，三顆水珠輕巧地甩落。"),
    ("water.step", "划一下水", .20, water_step, "🌊", "短划水 · 咕嚕", "水中走一格的輕划聲，比下水更小更柔。"),
    ("trap.enter", "小心陷阱", .30, trap_enter, "🕳️", "下行木琴 · 叮咚", "進敵方陷阱的兩音提示，明確但不嚇人。"),
    ("trap.leave", "離開陷阱", .23, trap_leave, "🍃", "上行木琴 · 咚叮", "恢復原本等級，用向上的短音回應。"),
    ("game.start", "新的一局", .62, start, "☀️", "三音木琴 · 準備出發", "簡短、明亮的開場，與較長的勝利音區別。"),
    ("game.encourage", "再玩一局吧", 1.12, encourage, "🌷", "溫暖和弦 · 鼓勵收尾", "落敗也有柔和收尾，保留再試一次的心情。"),
    ("game.draw", "這局平手", .95, draw, "🤝", "平穩三音 · 安定收束", "慢慢落下的三個音符，為和棋畫下句點。"),
]


def write_wav(path, buf):
    if max(abs(x) for x in buf) >= .85:
        raise ValueError(f"Insufficient headroom: {path.name}")
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(RATE)
        wav.writeframes(b"".join(struct.pack("<h", round(x * 32767)) for x in buf))


def measure_wav(path):
    with wave.open(str(path), "rb") as wav:
        if (wav.getnchannels(), wav.getsampwidth(), wav.getframerate()) != (1, 2, RATE):
            raise ValueError(f"Unexpected master format: {path.name}")
        raw = wav.readframes(wav.getnframes())
    values = [v[0] / 32768 for v in struct.iter_unpack("<h", raw)]
    peak = max(abs(x) for x in values)
    rms = math.sqrt(sum(x * x for x in values) / len(values))
    if not 0 < rms < peak < .85:
        raise ValueError(f"Silent or clipping master: {path.name}")
    if abs(values[0]) > .001 or abs(values[-1]) > .001:
        raise ValueError(f"Nonzero boundary: {path.name}")
    return {
        "durationSeconds": round(len(values) / RATE, 4),
        "peakDbfs": round(20 * math.log10(peak), 2),
        "rmsDbfs": round(20 * math.log10(rms), 2),
    }


def file_info(path):
    return {
        "file": path.name,
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }


def main():
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("FFmpeg with libmp3lame is required on PATH.")
    # Fail before writing anything if an approved source is missing.
    for sound_id, _, _, renderer, *_ in SOUNDS:
        if renderer is None and not (ARCHIVE / f"{sound_id.replace('.', '-')}-v1.wav").is_file():
            raise SystemExit(f"Missing approved source: {sound_id}")
    OUT.mkdir(parents=True, exist_ok=True)
    approval_path = OUT / "approvals.json"
    approvals = json.loads(approval_path.read_text(encoding="utf-8"))["assets"] if approval_path.is_file() else {}
    assets = []
    for index, (sound_id, title, duration, renderer, icon, character, use) in enumerate(SOUNDS, 1):
        stem = sound_id.replace(".", "-") + "-v1"
        wav_path, mp3_path = OUT / f"{stem}.wav", OUT / f"{stem}.mp3"
        if renderer is None:
            shutil.copyfile(ARCHIVE / wav_path.name, wav_path)
        else:
            synth.RNG.seed(f"toy-forest-v1:{sound_id}")
            buf = [0.] * round(duration * RATE)
            renderer(buf)
            write_wav(wav_path, buf)
        metrics = measure_wav(wav_path)
        if metrics["durationSeconds"] != duration:
            raise ValueError(f"Duration mismatch: {sound_id}")
        subprocess.run([
            ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path),
            "-map_metadata", "-1", "-ac", "1", "-ar", str(RATE),
            "-c:a", "libmp3lame", "-b:a", "128k", str(mp3_path),
        ], check=True)
        # Decode delivery files, check gapless length, finite samples and peaks.
        decoded = subprocess.run([
            ffmpeg, "-hide_banner", "-loglevel", "error", "-i", str(mp3_path),
            "-f", "f32le", "-acodec", "pcm_f32le", "-ac", "1", "-ar", str(RATE), "pipe:1",
        ], check=True, capture_output=True).stdout
        values = [v[0] for v in struct.iter_unpack("<f", decoded)]
        if len(values) != round(duration * RATE):
            raise ValueError(f"Decoded length mismatch: {sound_id}")
        if not all(math.isfinite(v) for v in values) or not 0 < max(map(abs, values)) < .95:
            raise ValueError(f"Invalid decoded MP3: {sound_id}")
        wav_info, mp3_info = file_info(wav_path), file_info(mp3_path)
        approval = approvals.get(sound_id, {})
        approved = (approval.get("wavSha256") == wav_info["sha256"]
                    and approval.get("mp3Sha256") == mp3_info["sha256"])
        assets.append({
            "id": sound_id, "previewNumber": index, "title": title, "version": 1,
            "group": "sfx",
            "icon": icon, "character": character, "description": use,
            "approval": "user-approved" if approved else "pending-listening",
            "source": f"audio-preview/samples/{wav_path.name}" if renderer is None else f"scripts/generate_core_audio.py:{renderer.__name__}",
            **metrics, "decodedMp3PeakDbfs": round(20 * math.log10(max(map(abs, values))), 2),
            "wav": wav_info, "mp3": mp3_info,
        })
        print(f"{index:02d} {sound_id}: {duration:.2f}s / {metrics['peakDbfs']:.1f} dBFS / MP3 {mp3_path.stat().st_size} bytes")
    mp3_bytes = sum(asset["mp3"]["bytes"] for asset in assets)
    if mp3_bytes > 500_000:
        raise ValueError("MP3 pack exceeds 500 KB budget")
    manifest = {
        "schemaVersion": 1, "packVersion": "core-v1", "createdDate": "2026-10-18",
        "sampleRate": RATE, "channels": 1, "wavBitDepth": 16, "mp3BitrateKbps": 128,
        "provenance": "Original procedural synthesis for jungle-chess; no third-party recordings or music samples.",
        "encoder": subprocess.run([ffmpeg, "-version"], capture_output=True, text=True, check=True).stdout.splitlines()[0],
        "totalMp3Bytes": mp3_bytes, "totalWavBytes": sum(asset["wav"]["bytes"] for asset in assets),
        "assets": assets,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    # Classic JS keeps the standalone audition page usable via file:// as well.
    (ROOT / "public/audio-preview/catalog.js").write_text(
        "// Generated by scripts/generate_core_audio.py; do not edit by hand.\n"
        + "window.audioCatalog = " + json.dumps(assets, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8",
    )
    print(f"Complete: {len(assets)} WAV + {len(assets)} MP3, delivery total {mp3_bytes} bytes")


if __name__ == "__main__":
    main()
