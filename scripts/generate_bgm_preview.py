"""Compose/render an original 48-second looping toy-forest BGM study.

Python standard library + FFmpeg; no external recordings, MIDI or samples.
Run: python scripts/generate_bgm_preview.py
"""

from array import array
import hashlib
import json
import math
from pathlib import Path
import random
import shutil
import struct
import subprocess
import sys
import wave

RATE = 48000
BPM = 80
BEAT = 60 / BPM
BARS = 16
DURATION = BARS * 4 * BEAT
FRAMES = round(DURATION * RATE)
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/audio/bgm"
STEM = "forest-little-steps-v1"
RNG = random.Random(20261018)


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def add(left, right, samples, onset, gain, pan=0):
    offset = round(onset * RATE)
    l_gain = gain * math.cos((pan + 1) * math.pi / 4)
    r_gain = gain * math.sin((pan + 1) * math.pi / 4)
    for i, sample in enumerate(samples):
        # Sustain/reverb tails wrap to the beginning of the musical loop.
        j = (offset + i) % FRAMES
        left[j] += sample * l_gain
        right[j] += sample * r_gain


def instrument(midi, duration, kind):
    frequency = hz(midi)
    result = array('f')
    for i in range(round(duration * RATE)):
        t = i / RATE
        phase = math.tau * frequency * t
        tail = min(1., (duration - t) / .06)
        if kind == 'wood':
            attack = min(1., t / .008)
            value = math.sin(phase) * math.exp(-t / .36)
            value += .22 * math.sin(phase * 3.997) * math.exp(-t / .065)
            value += .06 * math.sin(phase * 9.98) * math.exp(-t / .028)
            value *= attack * tail
        elif kind == 'pluck':
            value = (math.sin(phase) + .26 * math.sin(2 * phase)
                     + .10 * math.sin(3 * phase) + .035 * math.sin(4 * phase))
            value *= min(1., t / .012) * math.exp(-t / .28) * tail
        elif kind == 'bass':
            value = math.sin(phase) + .23 * math.sin(2 * phase) + .055 * math.sin(3 * phase)
            value *= min(1., t / .025) * math.exp(-t / .38) * tail
        else:
            # A very quiet rounded chord bed; no sharp brass/string transients.
            value = math.sin(phase) + .12 * math.sin(2 * phase) + .04 * math.sin(3 * phase)
            envelope = min(1., t / .38) * min(1., (duration - t) / .65)
            value *= envelope * (.94 + .06 * math.sin(math.tau * .5 * t))
        result.append(value)
    return result


def brush():
    values = array('f')
    low, previous = 0., 0.
    for i in range(round(.11 * RATE)):
        t = i / RATE
        low += .16 * (RNG.uniform(-1, 1) - low)
        # Gentle brushed texture rather than a bright shaker/cymbal.
        high = low - previous
        previous += .035 * (low - previous)
        values.append(high * min(1., t / .009) * math.exp(-t / .024) * min(1., (.11 - t) / .025))
    return values


# Each bar: bass MIDI note, warm chord voicing, handwritten melody (beat, MIDI).
# Four four-bar phrases: introduction, variation, small lift, return.
SCORE = [
    (48, [60, 64, 67, 69], [(0, 76), (.75, 79), (2, 81), (3, 79)]),
    (45, [60, 64, 67, 69], [(.5, 76), (2, 72)]),
    (41, [60, 64, 65, 69], [(0, 69), (1.5, 72), (3, 76)]),
    (43, [59, 62, 67, 69], [(.5, 74), (2, 79)]),
    (40, [60, 64, 67, 71], [(0, 76), (1, 79), (2.5, 76)]),
    (45, [60, 64, 67, 69], [(.5, 72), (2, 69), (3, 72)]),
    (38, [60, 62, 65, 69], [(0, 74), (1.5, 76), (3, 74)]),
    (43, [59, 62, 67, 69], [(.5, 71), (2, 74)]),
    (41, [60, 64, 65, 69], [(0, 77), (1, 81), (2.5, 79)]),
    (40, [60, 64, 67, 71], [(.5, 76), (2, 79), (3, 76)]),
    (38, [60, 62, 65, 69], [(0, 74), (1.5, 77), (3, 76)]),
    (43, [59, 62, 67, 69], [(.5, 74), (2, 71)]),
    (48, [60, 64, 67, 69], [(0, 72), (1.5, 76), (2.5, 79)]),
    (45, [60, 64, 67, 69], [(.5, 76), (2, 72)]),
    (41, [60, 64, 65, 69], [(0, 69), (1.5, 72), (3, 74)]),
    (43, [59, 62, 67, 69], [(.5, 71), (2, 74)]),
]


def main():
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        raise SystemExit('FFmpeg with libmp3lame is required on PATH.')
    OUT.mkdir(parents=True, exist_ok=True)
    left, right = array('f', [0.]) * FRAMES, array('f', [0.]) * FRAMES
    cache = {}
    events = []

    def note(midi, kind, onset, gain, pan, duration):
        key = (midi, kind, duration)
        if key not in cache:
            cache[key] = instrument(midi, duration, kind)
        samples = cache[key]
        add(left, right, samples, onset, gain, pan)
        if kind in ('wood', 'pluck'):
            add(left, right, samples, onset + .113, gain * .065, -pan)
            add(left, right, samples, onset + .227, gain * .035, pan * .5)
        events.append({'midi': midi, 'instrument': kind, 'onsetSeconds': round(onset, 4)})

    for bar, (bass, chord, melody) in enumerate(SCORE):
        start = bar * 4 * BEAT
        for index, pitch in enumerate(chord):
            note(pitch - 12, 'pad', start, .010, (index - 1.5) * .28, 3.50)
        note(bass, 'bass', start + .012, .115, 0., .90)
        if bar % 4 != 3:
            note(bass + 7, 'bass', start + 2.5 * BEAT, .068, .02, .75)
        for beat, indices in [(.5, [0, 2]), (2.5, [1, 3])]:
            for index, voice in enumerate(indices):
                note(chord[voice], 'pluck', start + beat * BEAT + index * .023,
                     .055 if bar < 8 else .061, .32, .85)
        for index, (beat, pitch) in enumerate(melody):
            gain = .145 * (1 if index == 0 else .87)
            note(pitch, 'wood', start + beat * BEAT, gain, -.22, 1.12)
        # Leave the end of each phrase open instead of filling every beat.
        for beat in ([1, 3] if bar % 4 != 3 else [1]):
            add(left, right, brush(), start + beat * BEAT, .07, .12)
        print(f'Rendered bar {bar + 1:02d}/{BARS}', flush=True)

    mean_l, mean_r = sum(left) / FRAMES, sum(right) / FRAMES
    for i in range(FRAMES):
        left[i] -= mean_l
        right[i] -= mean_r
    peak = max(max(map(abs, left)), max(map(abs, right)))
    rms = math.sqrt((sum(x*x for x in left) + sum(x*x for x in right)) / (2 * FRAMES))
    gain = min(.34 / peak, .060 / rms)
    pcm = array('h')
    for l_sample, r_sample in zip(left, right):
        pcm.extend((round(l_sample * gain * 32767), round(r_sample * gain * 32767)))
    seam = max(abs(pcm[0] - pcm[-2]), abs(pcm[1] - pcm[-1])) / 32768
    if seam > .02:
        raise ValueError(f'Unexpected loop boundary jump: {seam}')
    if sys.byteorder != 'little':
        pcm.byteswap()
    wav_path, mp3_path = OUT / f'{STEM}.wav', OUT / f'{STEM}.mp3'
    with wave.open(str(wav_path), 'wb') as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(RATE)
        wav.writeframes(pcm.tobytes())
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav_path),
                    '-map_metadata', '-1', '-c:a', 'libmp3lame', '-b:a', '160k', str(mp3_path)], check=True)
    # Read-only loudness analysis: preserve the static gain and periodic tails.
    analysis = subprocess.run([ffmpeg, '-hide_banner', '-nostats', '-i', str(wav_path),
                               '-af', 'loudnorm=I=-23:TP=-6:LRA=8:print_format=json',
                               '-f', 'null', '-'], capture_output=True, text=True, check=True).stderr
    loudness = json.loads(analysis[analysis.rfind('{'):analysis.rfind('}') + 1])

    def info(path):
        return {'file': path.name, 'bytes': path.stat().st_size,
                'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}

    wav_info, mp3_info = info(wav_path), info(mp3_path)
    approval_path = OUT / 'approval.json'
    approval = json.loads(approval_path.read_text(encoding='utf-8')) if approval_path.is_file() else {}
    approved = (approval.get('wavSha256') == wav_info['sha256']
                and approval.get('mp3Sha256') == mp3_info['sha256'])
    manifest = {
        'id': 'bgm.forestLittleSteps', 'title': '林間小棋步', 'version': 1,
        'createdDate': '2026-10-18', 'approval': 'user-approved' if approved else 'pending-listening',
        'description': 'Original quiet toy-forest loop: wooden mallet melody, soft plucks, bass, sparse brush and rounded chords.',
        'bpm': BPM, 'meter': '4/4', 'key': 'C major', 'bars': BARS,
        'durationSeconds': DURATION, 'sampleRate': RATE, 'channels': 2, 'wavBitDepth': 16,
        'loopStartFrame': 0, 'loopEndFrameExclusive': FRAMES,
        'loopMethod': 'Periodic tail wrapping; no whole-track fade; loop the decoded WAV buffer.',
        'peakDbfs': round(20 * math.log10(peak * gain), 2),
        'rmsDbfs': round(20 * math.log10(rms * gain), 2),
        'integratedLufs': float(loudness['input_i']), 'truePeakDbtp': float(loudness['input_tp']),
        'loudnessRangeLu': float(loudness['input_lra']), 'loopBoundaryStep': round(seam, 7),
        'provenance': 'Original melody, arrangement and procedural synthesis for jungle-chess. No third-party recordings, melodies or sample libraries.',
        'source': 'scripts/generate_bgm_preview.py', 'wav': wav_info, 'mp3': mp3_info,
        'encoder': subprocess.run([ffmpeg, '-version'], capture_output=True, text=True, check=True).stdout.splitlines()[0],
    }
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (OUT / 'score.json').write_text(json.dumps({'bpm': BPM, 'bars': BARS, 'events': events}, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: manifest[k] for k in ['durationSeconds', 'peakDbfs', 'integratedLufs', 'truePeakDbtp', 'loopBoundaryStep']}, indent=2), flush=True)


if __name__ == '__main__':
    main()
