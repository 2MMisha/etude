"""
Procedural music + sound effects for the ETUDE election-day story series.

    python3 audio-src/generate_audio.py        (needs numpy only)

Writes 44.1 kHz / 16-bit stereo WAVs to public/audio/.

Music: a gentle slow waltz in D major, 3/4, 12 beats per 7-second story
(beat = 7/12 s ≈ 102.9 BPM), 16 bars = 28 s for the whole series. Story N uses
bars 4N-3..4N, so the four stories played back to back form one piece; bar 4
ends on the dominant (the "…" cliffhanger), bar 16 resolves to the tonic.
"""
from __future__ import annotations

import os
import wave

import numpy as np

SR = 44100
BEAT = 7.0 / 12.0
BAR = 3 * BEAT
TOTAL = 28.0
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'audio')
rng = np.random.default_rng(27102026)


# ----------------------------------------------------------------------------- helpers
def hz(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def t_axis(dur: float) -> np.ndarray:
    return np.arange(int(dur * SR)) / SR


def env_adsr(n: int, a: float, d: float, s: float, r: float, hold: float) -> np.ndarray:
    """Piecewise-linear ADSR; `hold` is seconds before release starts."""
    t = np.arange(n) / SR
    e = np.interp(t, [0, a, a + d, max(hold, a + d), max(hold, a + d) + r], [0, 1, s, s, 0])
    return e


def write_wav(name: str, data: np.ndarray, peak_db: float = -1.0) -> None:
    if data.ndim == 1:
        data = np.stack([data, data], axis=1)
    peak = np.max(np.abs(data)) or 1.0
    data = data / peak * (10 ** (peak_db / 20))
    pcm = (np.clip(data, -1, 1) * 32767).astype('<i2')
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'{name:22s} {len(data) / SR:5.2f}s')


def place(buf: np.ndarray, sig: np.ndarray, start: float, pan: float = 0.0, gain: float = 1.0) -> None:
    """Mix a mono signal into a stereo buffer at `start` seconds, equal-power pan (-1..1)."""
    i = int(start * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i] * gain
    ang = (pan + 1) * np.pi / 4
    buf[i : i + len(sig), 0] += sig * np.cos(ang)
    buf[i : i + len(sig), 1] += sig * np.sin(ang)


def fft_convolve(x: np.ndarray, h: np.ndarray) -> np.ndarray:
    n = len(x) + len(h) - 1
    size = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(h, size), size)[:n]


def lowpass_fft(x: np.ndarray, cutoff: float) -> np.ndarray:
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    spec *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(spec, len(x))


def bandpass_sweep(noise: np.ndarray, f0: np.ndarray, q: float) -> np.ndarray:
    """State-variable band-pass with a per-sample centre frequency (short SFX only)."""
    out = np.zeros_like(noise)
    low = band = 0.0
    for i, x in enumerate(noise):
        f = 2 * np.sin(np.pi * min(f0[i], SR / 6) / SR)
        high = x - low - band / q
        band += f * high
        low += f * band
        out[i] = band
    return out


def highpass_fft(x: np.ndarray, cutoff: float) -> np.ndarray:
    spec = np.fft.rfft(x, axis=0)
    f = np.fft.rfftfreq(x.shape[0], 1 / SR)
    gain = 1 / (1 + (cutoff / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(spec * (gain[:, None] if x.ndim == 2 else gain), x.shape[0], axis=0)


def reverb(stereo: np.ndarray, decay: float = 2.2, wet: float = 0.25, predelay: float = 0.018) -> np.ndarray:
    n_ir = int(decay * SR)
    t = np.arange(n_ir) / SR
    tau = decay / 6.9  # -60 dB at `decay`
    out = np.zeros((len(stereo) + n_ir + int(predelay * SR), 2))
    for ch in range(2):
        ir = rng.standard_normal(n_ir) * np.exp(-t / tau)
        ir = lowpass_fft(ir, 5200)
        ir = np.concatenate([np.zeros(int(predelay * SR)), ir])
        ir /= np.sqrt(np.sum(ir**2))
        wet_sig = fft_convolve(stereo[:, ch], ir)
        out[: len(wet_sig), ch] += wet_sig[: len(out)] * wet
        out[: len(stereo), ch] += stereo[:, ch] * (1 - wet * 0.5)
    return out


# ----------------------------------------------------------------------------- instruments
def piano(midi: float, dur: float, vel: float = 0.7) -> np.ndarray:
    f = hz(midi)
    length = dur + 1.2
    t = t_axis(length)
    sig = np.zeros_like(t)
    brightness = 0.6 + 0.4 * vel
    for k in range(1, 9):
        fk = f * k * (1 + 0.0004 * k * k)  # slight string inharmonicity
        if fk > 12000:
            break
        amp = (brightness ** (k - 1)) / k**1.2
        dec = np.exp(-t * (0.9 + 0.55 * k) * (f / 400) ** 0.3)
        sig += amp * dec * (np.sin(2 * np.pi * fk * t) + 0.5 * np.sin(2 * np.pi * fk * 1.0012 * t))
    attack = np.minimum(1, t / 0.004)
    release = np.clip(1 - (t - dur) / 0.35, 0, 1)
    hammer = rng.standard_normal(len(t)) * np.exp(-t / 0.004) * 0.05
    return (sig * attack * release + hammer) * vel * 0.25


def celesta(midi: float, dur: float, vel: float = 0.6) -> np.ndarray:
    f = hz(midi)
    t = t_axis(dur + 1.5)
    body = np.sin(2 * np.pi * f * t) * np.exp(-t * 1.8)
    bell = 0.32 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t * 7) + 0.16 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 5)
    attack = np.minimum(1, t / 0.002)
    release = np.clip(1 - (t - dur) / 0.6, 0, 1)
    return (body + bell) * attack * release * vel * 0.32


def bass(midi: float, dur: float, vel: float = 0.7) -> np.ndarray:
    f = hz(midi)
    t = t_axis(dur + 0.4)
    sig = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    e = np.minimum(1, t / 0.012) * np.exp(-t * 1.6) * np.clip(1 - (t - dur) / 0.25, 0, 1)
    return sig * e * vel * 0.42


def pad(midis: list[int], dur: float, vel: float = 0.5) -> np.ndarray:
    t = t_axis(dur + 0.8)
    sig = np.zeros_like(t)
    for m in midis:
        f = hz(m)
        for det in (-0.12, 0.0, 0.12):
            fv = f * 2 ** (det / 12)
            vib = 0.0015 * np.sin(2 * np.pi * 4.8 * t + m)
            sig += np.sin(2 * np.pi * fv * t * (1 + vib)) + 0.18 * np.sin(4 * np.pi * fv * t)
    e = env_adsr(len(t), 0.35, 0.4, 0.8, 0.8, dur)
    return sig * e * vel * 0.03


# ----------------------------------------------------------------------------- the waltz
CHORDS = {
    'D': (38, [62, 66, 69]),
    'Bm': (47, [59, 62, 66]),
    'G': (43, [59, 62, 67]),
    'A': (45, [61, 64, 69]),
    'A7': (45, [61, 64, 67]),
    'F#m': (42, [61, 66, 69]),
    'Em': (40, [59, 64, 67]),
}
PROGRESSION = [
    'D', 'Bm', 'G', 'A',  # story 1 — ends open on the dominant ("…")
    'D', 'F#m', 'G', 'A7',  # story 2
    'Bm', 'G', 'Em', 'A7',  # story 3 — more motion
    'G', 'A7', 'D', 'D',  # story 4 — resolves home
]
# (midi, start beat within bar, length in beats)
MELODY = [
    [(78, 0, 2), (81, 2, 1)],
    [(83, 0, 2), (81, 2, 1)],
    [(79, 0, 1), (78, 1, 1), (76, 2, 1)],
    [(76, 0, 1.5), (85, 1.5, 0.5), (88, 2, 0.5), (93, 2.5, 0.5)],  # three soft "dots"
    [(81, 0, 2), (86, 2, 1)],
    [(85, 0, 2), (81, 2, 1)],
    [(83, 0, 1), (86, 1, 1), (83, 2, 1)],
    [(81, 0, 2), (79, 2, 1)],
    [(78, 0, 0.5), (83, 0.5, 0.5), (86, 1, 1), (83, 2, 1)],
    [(86, 0, 0.5), (83, 0.5, 0.5), (79, 1, 1), (83, 2, 1)],
    [(79, 0, 0.5), (83, 0.5, 0.5), (88, 1, 1), (86, 2, 1)],
    [(85, 0, 1), (88, 1, 1), (81, 2, 1)],
    [(83, 0, 2), (86, 2, 1)],
    [(85, 0, 2), (88, 2, 1)],
    [(86, 0, 3)],
    [(74, 0, 0.25), (78, 0.25, 0.25), (81, 0.5, 0.25), (86, 0.75, 2.25)],
]


def make_music() -> np.ndarray:
    buf = np.zeros((int((TOTAL + 0.1) * SR), 2))
    for b, name in enumerate(PROGRESSION):
        root, triad = CHORDS[name]
        t0 = b * BAR
        last = b == len(PROGRESSION) - 1
        # oom: bass + low piano on 1; pah-pah: chord on 2 and 3
        place(buf, bass(root, BAR * (1.6 if last else 0.9)), t0, pan=0.0, gain=0.9)
        place(buf, piano(root + 12, BEAT * 0.9, 0.55), t0, pan=-0.15)
        if not last:
            for beat in (1, 2):
                for m in triad:
                    place(buf, piano(m, BEAT * 0.55, 0.38 if beat == 1 else 0.32), t0 + beat * BEAT, pan=-0.25)
        else:
            for m in triad + [74]:
                place(buf, piano(m, BAR * 0.9, 0.42), t0, pan=-0.2)
        place(buf, pad([root + 24] + triad, BAR), t0, pan=0.1)
        for midi, start, length in MELODY[b]:
            vel = 0.42 if (b == 3 and start >= 1.5) else 0.6
            place(buf, celesta(midi, length * BEAT, vel), t0 + start * BEAT, pan=0.25)
            place(buf, piano(midi - 12, length * BEAT, 0.22), t0 + start * BEAT, pan=0.2)
    wet = highpass_fft(reverb(buf, decay=2.4, wet=0.28)[: int(TOTAL * SR)], 38)
    # gentle fade at the very end of the series
    n = len(wet)
    fade = np.ones(n)
    k = int(1.6 * SR)
    fade[-k:] = np.linspace(1, 0, k) ** 1.5
    wet *= fade[:, None]
    return np.tanh(wet * 1.2 / np.max(np.abs(wet))) * 0.9


# ----------------------------------------------------------------------------- sound effects
def sfx_whoosh(dur: float, f_start: float, f_end: float, peak_at: float, q: float = 1.6) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f0 = f_start * (f_end / f_start) ** (t / dur)
    sig = bandpass_sweep(rng.standard_normal(n), f0, q)
    a = np.where(t < peak_at, (t / peak_at) ** 2, np.exp(-(t - peak_at) / (0.25 * (dur - peak_at))))
    return sig * a


def sfx_paper_slide() -> np.ndarray:
    dur = 0.55
    n = int(dur * SR)
    t = np.arange(n) / SR
    rustle = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 23 * t + 3 * np.sin(2 * np.pi * 7 * t)))
    sig = bandpass_sweep(rng.standard_normal(n), np.full(n, 3200.0), 0.9) * rustle
    sig += bandpass_sweep(rng.standard_normal(n), np.linspace(1400, 700, n), 2.0) * 0.6
    e = np.minimum(1, t / 0.05) * np.clip(1 - (t - 0.3) / 0.25, 0, 1)
    return sig * e


def sfx_thump() -> np.ndarray:
    t = t_axis(0.5)
    f = 55 + 70 * np.exp(-t / 0.05)
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(phase) * np.exp(-t / 0.13)
    knock = np.sin(2 * np.pi * 240 * t) * np.exp(-t / 0.04) * 0.5 + np.sin(2 * np.pi * 410 * t) * np.exp(-t / 0.025) * 0.3
    click = lowpass_fft(rng.standard_normal(len(t)) * np.exp(-t / 0.006), 2500) * 0.8
    return body + knock + click


def sfx_chimes(notes: list[int], spacing: float, dur: float, vel: float = 0.5, jitter: float = 0.0) -> np.ndarray:
    buf = np.zeros((int(dur * SR), 2))
    for i, m in enumerate(notes):
        start = i * spacing + (rng.uniform(0, jitter) if jitter else 0)
        place(buf, celesta(m, 0.3, vel * (0.85 ** i) + 0.15), start, pan=rng.uniform(-0.6, 0.6))
    return reverb(buf, decay=1.6, wet=0.35)[: int(dur * SR)]


def sfx_pluck(midi: int) -> np.ndarray:
    """Soft marimba-like pluck for text appearing."""
    f = hz(midi)
    t = t_axis(0.6)
    sig = np.sin(2 * np.pi * f * t) * np.exp(-t * 9) + 0.25 * np.sin(2 * np.pi * f * 3.9 * t) * np.exp(-t * 30)
    return sig * np.minimum(1, t / 0.003)


def sfx_heel_tap() -> np.ndarray:
    t = t_axis(0.18)
    click = bandpass_sweep(rng.standard_normal(len(t)), np.full(len(t), 2600.0), 3.0) * np.exp(-t / 0.012)
    tok = np.sin(2 * np.pi * 330 * t) * np.exp(-t / 0.03) * 0.5
    floor = np.sin(2 * np.pi * 120 * t) * np.exp(-t / 0.05) * 0.35
    return click * 1.2 + tok + floor


def sfx_magic_rise() -> np.ndarray:
    dur = 2.2
    t = t_axis(dur)
    # rising shimmer: a cluster of sines gliding up an octave
    sig = np.zeros_like(t)
    for m in (62, 66, 69, 74):
        f = hz(m) * 2 ** (np.minimum(t / 1.2, 1))
        sig += np.sin(2 * np.pi * np.cumsum(f) / SR)
    e = np.minimum(1, t / 0.6) ** 2 * np.exp(-np.maximum(0, t - 1.2) / 0.35)
    shimmer = sig * e * 0.18
    air = sfx_whoosh(dur, 400, 5000, 1.1, q=1.2) * 0.45
    out = np.zeros((len(t), 2))
    place(out, shimmer + air, 0)
    chimes = sfx_chimes([86, 90, 93, 98, 102], 0.07, dur, 0.45)
    out[int(1.0 * SR) :] += chimes[: len(out) - int(1.0 * SR)] * 0.9
    return reverb(out, decay=1.8, wet=0.3)[: len(t)]


def sfx_swell() -> np.ndarray:
    t = t_axis(1.4)
    sig = np.sin(2 * np.pi * 73.4 * t) + 0.5 * np.sin(2 * np.pi * 110 * t) + 0.3 * np.sin(2 * np.pi * 146.8 * t * (1 + 0.003 * np.sin(2 * np.pi * 5 * t)))
    e = (t / 1.4) ** 2 * np.clip(1 - (t - 1.25) / 0.15, 0, 1)
    return sig * e


def main() -> None:
    write_wav('music-waltz.wav', make_music(), peak_db=-1.5)
    write_wav('sfx-whoosh-in.wav', sfx_whoosh(1.0, 300, 1800, 0.55))
    write_wav('sfx-whoosh-out.wav', sfx_whoosh(0.8, 900, 3800, 0.35))
    write_wav('sfx-paper-slide.wav', sfx_paper_slide())
    write_wav('sfx-box-thump.wav', sfx_thump())
    write_wav('sfx-sparkle.wav', sfx_chimes([93, 97, 100, 105, 102, 98], 0.055, 1.6, 0.5, jitter=0.02))
    write_wav('sfx-text-pop-1.wav', sfx_pluck(81))
    write_wav('sfx-text-pop-2.wav', sfx_pluck(86))
    write_wav('sfx-heel-tap.wav', sfx_heel_tap())
    write_wav('sfx-magic-rise.wav', sfx_magic_rise())
    write_wav('sfx-swell.wav', sfx_swell())
    write_wav('sfx-bell-chord.wav', sfx_chimes([74, 78, 81, 86, 90, 93], 0.09, 3.0, 0.55))


if __name__ == '__main__':
    main()
