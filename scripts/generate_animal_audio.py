"""Build eight original cartoon animal calls. Python stdlib + FFmpeg only.

These are stylized synthesized character voices, not wildlife recordings.
Run: python scripts/generate_animal_audio.py
"""

import json
import math
import random
import shutil
import struct
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True
from generate_core_audio import RATE, file_info, measure_wav, write_wav

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/audio/animals"
RNG = random.Random()
TAU = math.tau


def curve(points, x):
    for (left, a), (right, b) in zip(points, points[1:]):
        if x <= right:
            u = max(0., (x - left) / (right - left))
            u = u * u * (3 - 2 * u)
            return a + (b - a) * u
    return points[-1][1]


def voice(buf, start, duration, pitch, mouth, gain=.6, breath=.025,
          flutter=0., flutter_hz=25., vibrato=.012, attack=.025, tail=.055,
          tilt=1.15, nasal=0.):
    """Moving vocal resonances and a harmonic source with soft articulation."""
    offset = round(start * RATE)
    phase, air = 0., 0.
    count = min(round(duration * RATE), len(buf) - offset)
    harmonics = min(24, int(6500 / min(value for _, value in pitch)))
    # Update formant weights every millisecond; interpolate to avoid stepping.
    old_weights = [0.] * harmonics
    new_weights = old_weights[:]
    for i in range(count):
        t, x = i / RATE, i / (count - 1)
        hz = curve(pitch, x) * (1 + vibrato * math.sin(TAU * 5.4 * t))
        phase += TAU * hz / RATE
        if i % 48 == 0:
            old_weights = new_weights
            f1 = curve([(p, a) for p, a, _ in mouth], x)
            f2 = curve([(p, b) for p, _, b in mouth], x)
            new_weights = []
            for h in range(1, harmonics + 1):
                frequency = h * hz
                resonances = .18 + 1.7 * math.exp(-.5 * ((frequency - f1) / 180) ** 2)
                resonances += .85 * math.exp(-.5 * ((frequency - f2) / 280) ** 2)
                weight = resonances / h ** tilt
                weight *= 1 + (nasal if h % 2 else -nasal * .4)
                new_weights.append(weight)
        mix = (i % 48) / 48
        voiced = sum((a + (b - a) * mix) * math.sin((h + 1) * phase)
                     for h, (a, b) in enumerate(zip(old_weights, new_weights)))
        # A little aspiration softens vowels without harsh high-frequency hiss.
        air += .09 * (RNG.uniform(-1, 1) - air)
        swell = curve([(0, .45), (.22, 1.), (.6, .85), (1, .25)], x)
        envelope = min(1, t / attack) * min(1, (duration - t) / tail) * swell
        tremolo = 1 - flutter / 2 + flutter / 2 * math.sin(TAU * flutter_hz * t)
        buf[offset + i] += gain * envelope * tremolo * (voiced + breath * air)


def elephant(buf):
    voice(buf, .006, .49, [(0, 225), (.2, 410), (.5, 370), (1, 255)],
          [(0, 650, 1450), (.4, 950, 1750), (1, 550, 1250)],
          nasal=.55, tilt=.85, breath=.08, flutter=.10, flutter_hz=18)


def lion(buf):
    voice(buf, .008, .52, [(0, 155), (.22, 195), (.55, 150), (1, 110)],
          [(0, 650, 1200), (.35, 750, 1300), (1, 360, 850)],
          flutter=.38, flutter_hz=29, breath=.18, tilt=1.0)


def tiger(buf):
    voice(buf, .008, .27, [(0, 210), (.25, 265), (1, 170)],
          [(0, 700, 1450), (.35, 820, 1550), (1, 450, 1000)],
          flutter=.30, flutter_hz=38, breath=.10, attack=.015)
    voice(buf, .28, .20, [(0, 185), (.3, 220), (1, 145)],
          [(0, 540, 1250), (1, 330, 800)], gain=.42, flutter=.22, flutter_hz=33)


def leopard(buf):
    voice(buf, .008, .37, [(0, 205), (.4, 240), (.75, 285), (1, 230)],
          [(0, 350, 1100), (.55, 420, 1300), (1, 500, 1450)],
          flutter=.65, flutter_hz=26, tilt=1.3, breath=.09)


def wolf(buf):
    voice(buf, .008, .565, [(0, 280), (.25, 440), (.7, 465), (1, 340)],
          [(0, 430, 1100), (.4, 390, 920), (1, 350, 850)],
          tilt=1.45, vibrato=.022, attack=.05, tail=.085)


def dog(buf):
    voice(buf, .004, .27, [(0, 440), (.18, 360), (.55, 230), (1, 170)],
          [(0, 850, 1600), (.28, 950, 1500), (.7, 650, 1200), (1, 400, 850)],
          flutter=.15, flutter_hz=44, breath=.22, tilt=1., attack=.008, tail=.055)


def cat(buf):
    voice(buf, .008, .49, [(0, 430), (.2, 650), (.45, 560), (.7, 380), (1, 300)],
          [(0, 320, 2100), (.25, 550, 1950), (.55, 900, 1500), (1, 430, 950)],
          tilt=1.25, nasal=.22, vibrato=.016, attack=.03)


def rat(buf):
    voice(buf, .006, .115, [(0, 920), (.4, 1370), (1, 1080)],
          [(0, 1100, 2350), (1, 1250, 2400)], tilt=2., gain=.45, attack=.018, tail=.035)
    voice(buf, .15, .145, [(0, 1000), (.35, 1260), (1, 800)],
          [(0, 1200, 2400), (1, 950, 2100)], tilt=2., gain=.40, attack=.02, tail=.045)


ANIMALS = [
    ("elephant", "大象", .52, elephant, "🐘", "圓潤短鼻鳴 · 噗嗚", "帶鼻音的短呼聲，保留大象的份量與親切感。"),
    ("lion", "獅子", .56, lion, "🦁", "溫和低吼 · 嗷", "低沉、有胸腔感的一聲小吼，尾音柔和下降。"),
    ("tiger", "老虎", .51, tiger, "🐯", "彈性雙音 · 嗷嗚", "先張口、再收成短嗚聲，節奏與獅子區別。"),
    ("leopard", "豹子", .40, leopard, "🐆", "輕巧顫音 · 嗚嚕", "短促、有呼嚕起伏的聲音，尾端微微上揚。"),
    ("wolf", "野狼", .60, wolf, "🐺", "柔和上揚 · 嗚～", "一小段圓潤呼聲，略帶顫音，不拖成長嚎。"),
    ("dog", "小狗", .30, dog, "🐶", "友善短吠 · 汪", "短起音加上下滑的張口聲，像開心打招呼。"),
    ("cat", "小貓", .52, cat, "🐱", "輕柔轉音 · 喵", "從細細鼻音轉成張口再收尾，帶出喵的弧線。"),
    ("rat", "老鼠", .32, rat, "🐭", "圓潤雙啾 · 吱啾", "兩個小啾聲，控制高頻與音量，避免刺耳。"),
]


def main():
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("FFmpeg with libmp3lame is required on PATH.")
    OUT.mkdir(parents=True, exist_ok=True)
    assets = []
    for index, (animal, title, duration, render, icon, character, description) in enumerate(ANIMALS, 1):
        RNG.seed(f"toy-forest-animal-v1:{animal}")
        buf = [0.] * round(duration * RATE)
        render(buf)
        # Keep similar energy across calls, with a conservative -8 dBFS peak cap.
        peak = max(map(abs, buf))
        rms = math.sqrt(sum(v * v for v in buf) / len(buf))
        scale = min(.398 / peak, .105 / rms)
        buf = [v * scale for v in buf]
        wav_path = OUT / f"{animal}-call-v1.wav"
        mp3_path = OUT / f"{animal}-call-v1.mp3"
        write_wav(wav_path, buf)
        metrics = measure_wav(wav_path)
        subprocess.run([
            ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path),
            "-map_metadata", "-1", "-ac", "1", "-ar", str(RATE),
            "-c:a", "libmp3lame", "-b:a", "128k", str(mp3_path),
        ], check=True)
        decoded = subprocess.run([
            ffmpeg, "-hide_banner", "-loglevel", "error", "-i", str(mp3_path),
            "-f", "f32le", "-acodec", "pcm_f32le", "-ac", "1", "-ar", str(RATE), "pipe:1",
        ], check=True, capture_output=True).stdout
        values = [v[0] for v in struct.iter_unpack("<f", decoded)]
        if len(values) != len(buf) or not all(math.isfinite(v) for v in values):
            raise ValueError(f"Invalid decoded samples: {animal}")
        decoded_peak = max(map(abs, values))
        if not 0 < decoded_peak < .5:
            raise ValueError(f"Unexpected decoded peak: {animal}")
        assets.append({
            "id": f"animal.{animal}.select", "animal": animal, "title": title,
            "version": 1, "previewNumber": index, "previewLabel": f"A{index:02d}",
            "group": "animals", "icon": icon, "character": character,
            "description": description, "approval": "pending-listening",
            "source": f"scripts/generate_animal_audio.py:{animal}",
            **metrics, "decodedMp3PeakDbfs": round(20 * math.log10(decoded_peak), 2),
            "wav": file_info(wav_path), "mp3": file_info(mp3_path),
        })
        print(f"A{index:02d} {animal}: {duration:.2f}s, peak {metrics['peakDbfs']:.1f} dBFS, RMS {metrics['rmsDbfs']:.1f} dBFS")
    manifest = {
        "schemaVersion": 1, "packVersion": "animals-v1", "createdDate": "2026-10-18",
        "sampleRate": RATE, "channels": 1, "wavBitDepth": 16, "mp3BitrateKbps": 128,
        "provenance": "Original procedural cartoon vocal synthesis; not real animal recordings. No third-party audio samples.",
        "encoder": subprocess.run([ffmpeg, "-version"], capture_output=True, text=True, check=True).stdout.splitlines()[0],
        "totalMp3Bytes": sum(a["mp3"]["bytes"] for a in assets),
        "totalWavBytes": sum(a["wav"]["bytes"] for a in assets), "assets": assets,
    }
    if manifest["totalMp3Bytes"] > 500_000:
        raise ValueError("Animal MP3 pack exceeds 500 KB budget")
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "public/audio-preview/animals-catalog.js").write_text(
        "// Generated by scripts/generate_animal_audio.py; do not edit by hand.\n"
        + "window.animalCatalog = " + json.dumps(assets, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8",
    )
    print(f"Complete: 8 WAV + 8 MP3; WAV {manifest['totalWavBytes']} bytes / MP3 {manifest['totalMp3Bytes']} bytes")


if __name__ == "__main__":
    main()
