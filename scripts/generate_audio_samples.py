"""Generate original, deterministic toy-forest audition sounds (Python stdlib only)."""

import math
import random
import struct
import wave
from pathlib import Path

RATE = 48000
OUT = Path(__file__).resolve().parents[1] / "public" / "audio-preview" / "samples"
RNG = random.Random(20261018)


def tone(buf, start, duration, frequency, gain, decay=7, harmonics=(1, .2, .06), sweep=0):
    offset = round(start * RATE)
    for i in range(min(round(duration * RATE), len(buf) - offset)):
        t = i / RATE
        progress = t / duration
        attack = min(1, t / .006)
        tail = min(1, (duration - t) / .025)
        envelope = attack * tail * math.exp(-decay * progress)
        phase = 2 * math.pi * (frequency * t + sweep * t * t / (2 * duration))
        buf[offset + i] += gain * envelope * sum(
            strength * math.sin((h + 1) * phase) for h, strength in enumerate(harmonics)
        )


def noise(buf, start, duration, gain, smoothing=.12):
    offset = round(start * RATE)
    low = 0
    for i in range(min(round(duration * RATE), len(buf) - offset)):
        t = i / RATE
        low += smoothing * (RNG.uniform(-1, 1) - low)
        envelope = min(1, t / .012) * math.exp(-5 * t / duration)
        envelope *= min(1, (duration - t) / .025)
        buf[offset + i] += gain * low * envelope


def write(name, duration, render):
    buf = [0.] * round(duration * RATE)
    render(buf)
    peak = max(abs(v) for v in buf)
    if peak >= .85:
        raise ValueError(f"{name}: insufficient mix headroom ({peak})")
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}-v1.wav"), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(RATE)
        wav.writeframes(b"".join(struct.pack("<h", round(v * 32767)) for v in buf))
    rms = math.sqrt(sum(v * v for v in buf) / len(buf))
    print(f"{name}: {duration:.2f}s, peak {20 * math.log10(peak):.1f} dBFS, RMS {20 * math.log10(rms):.1f} dBFS")


def land(buf):
    tone(buf, 0, .18, 310, .46, 5, (1, .10, .04), -85)
    tone(buf, 0, .12, 760, .10, 8, (1,))
    noise(buf, 0, .07, .10, .18)


def capture(buf):
    noise(buf, 0, .16, .55, .10)
    tone(buf, .006, .16, 380, .34, 5, (1, .08), -220)
    tone(buf, .07, .24, 1046.5, .15, 5, (1, .12))
    tone(buf, .105, .21, 1318.5, .10, 5, (1, .08))


def water(buf):
    noise(buf, .008, .25, .55, .08)
    tone(buf, 0, .17, 260, .32, 5, (1, .05), -100)
    for start, freq, gain in [(.045, 850, .19), (.10, 1200, .13), (.17, 680, .10)]:
        tone(buf, start, .16, freq, gain, 5, (1,), -freq * .40)


def invalid(buf):
    tone(buf, 0, .13, 392, .27, 3, (1, .10))
    tone(buf, .09, .15, 329.63, .26, 4, (1, .10))


def win(buf):
    for start, freq in [(0, 523.25), (.16, 659.25), (.32, 783.99), (.52, 1046.5)]:
        tone(buf, start, .62, freq, .28, 5, (1, .16, .04))
    for freq in [523.25, 659.25, 783.99]:
        tone(buf, .77, .90, freq, .105, 4, (1, .10))
    tone(buf, .78, .83, 1567.98, .065, 5, (1,))


if __name__ == "__main__":
    write("piece-land", .20, land)
    write("piece-capture", .34, capture)
    write("water-enter", .36, water)
    write("move-invalid", .26, invalid)
    write("game-win", 1.75, win)
