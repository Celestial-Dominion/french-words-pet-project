"""Hàm TTS + PCM dùng chung cho audio bài Ngữ pháp (port từ build-content-audio.py của app Anh — pipeline Video).

edge-tts có mốc từng từ (WordBoundary), giải mã MP3 → PCM int16 mono 24 kHz, cắt lặng, cân RMS, mã hoá MP3 CBR (lameenc),
đo trễ encoder, đường bao miệng 25 khung/giây, kiểm lời nằm đúng [start, end]. Khác app Anh: `norm` giữ chữ có dấu tiếng
Pháp (bỏ dấu rồi so) — bản gốc xoá mọi ký tự ngoài a-z nên "été" thành "t".
"""
import asyncio
import os
import re
import shutil
import subprocess
import tempfile
import unicodedata
import wave

import edge_tts
import lameenc
import numpy as np

SR = 24000
PASSAGE_KBPS = 48  # bitrate edge-tts trả về (kiểm audio cụt đuôi)
PRE, POST = 0.03, 0.06
FPS = 25
TARGET_RMS_DB, PEAK_DB, SILENCE_DB = -19.0, -1.5, -45.0


def norm(s):
    s = s.lower().replace("’", "'").replace("œ", "oe").replace("æ", "ae")
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "", s)


async def tts_stream(text, voice, rate, pitch="+0Hz"):
    """→ (mp3 bytes, [[giây, thời lượng, chữ]]). Thử lại khi mạng chập chờn."""
    for attempt in range(5):
        try:
            data = bytearray()
            bounds = []

            async def collect():
                async for c in edge_tts.Communicate(text, voice, rate=rate, pitch=pitch or "+0Hz", boundary="WordBoundary").stream():
                    if c["type"] == "audio":
                        data.extend(c["data"])
                    elif c["type"] == "WordBoundary":
                        bounds.append([c["offset"] / 1e7, c["duration"] / 1e7, c["text"]])

            # kết nối treo (không lỗi, không dữ liệu) từng làm cả lượt build đứng im → giới hạn 90 giây mỗi lần thử
            await asyncio.wait_for(collect(), 90)
            if not data:
                raise RuntimeError("không có audio")
            # edge-tts đôi khi đóng stream sớm mà không báo lỗi → audio cụt: đối chiếu chữ đã có mốc với văn bản
            want, got = len(norm(text)), sum(len(norm(b[2])) for b in bounds)
            if want > 40 and got < 0.9 * want:
                raise RuntimeError(f"audio cụt, mốc phủ {got}/{want} ký tự")
            # …hoặc đủ mốc chữ nhưng thiếu byte audio ở đuôi (mốc cuối vượt độ dài file, gặp 2/1417 track)
            secs = len(data) * 8 / (PASSAGE_KBPS * 1000)
            if bounds and secs < bounds[-1][0] + bounds[-1][1] - 0.05:
                raise RuntimeError(f"audio cụt đuôi, {secs:.1f}s < mốc cuối {bounds[-1][0] + bounds[-1][1]:.1f}s")
            return bytes(data), bounds
        except Exception as e:  # noqa: BLE001
            print(f"  TTS lỗi ({e}), thử lại {attempt + 1}…", flush=True)
            await asyncio.sleep(2 * (attempt + 1))
    raise SystemExit(f"TTS thất bại: {voice} {text[:60]}")


def decode_mp3(path):
    """MP3 → np.int16 mono 24 kHz (afconvert trên macOS, ffmpeg nếu có)."""
    if shutil.which("ffmpeg"):
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], check=True, capture_output=True).stdout
        return np.frombuffer(raw, dtype=np.int16).copy()
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, "x.wav")
        subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{SR}", "-c", "1", path, wav], check=True)
        with wave.open(wav) as w:
            assert w.getframerate() == SR and w.getnchannels() == 1
            return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).copy()


def decode_bytes(b):
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as fh:
        fh.write(b)
        p = fh.name
    try:
        return decode_mp3(p)
    finally:
        os.remove(p)


# ---------- PCM ----------

def frames_rms(a, n):
    m = len(a) // n
    if m == 0:
        return np.zeros(0)
    x = a[: m * n].astype(np.float64).reshape(m, n) / 32768.0
    return np.sqrt((x * x).mean(axis=1))


def speech_bounds(a):
    n = SR // 100
    r = frames_rms(a, n)
    on = np.nonzero(r > 10 ** (SILENCE_DB / 20))[0]
    if not len(on):
        return 0, len(a)
    return int(on[0]) * n, min(len(a), (int(on[-1]) + 1) * n)


def trim(a):
    s, e = speech_bounds(a)
    s0 = max(0, s - int(PRE * SR))
    e0 = min(len(a), e + int(POST * SR))
    out = a[s0:e0].astype(np.float64)
    fade = min(int(0.008 * SR), len(out) // 2)
    if fade:
        g = np.linspace(0, 1, fade)
        out[:fade] *= g
        out[-fade:] *= g[::-1]
    return out, s0 / SR


def normalize(x):
    n = SR // 100
    r = frames_rms(x.astype(np.int16) if x.dtype != np.int16 else x, n)
    act = r[r > 10 ** (SILENCE_DB / 20)]
    rms = float(np.sqrt((act * act).mean())) if len(act) else 1e-3
    peak = max(1.0, float(np.abs(x).max())) / 32768.0
    g = min(10 ** ((TARGET_RMS_DB - 20 * np.log10(max(rms, 1e-9))) / 20), 10 ** (PEAK_DB / 20) / peak)
    return np.clip(x * g, -32768, 32767)


def mix(clips):
    n = max(len(c) for c in clips)
    acc = np.zeros(n)
    for c in clips:
        acc[: len(c)] += c * 0.72
    return normalize(np.clip(acc, -32768, 32767))


def mouth_envelope(a):
    n = SR // FPS
    r = frames_rms(np.concatenate([a, np.zeros(n - len(a) % n, dtype=np.int16)]) if len(a) % n else a, n)
    out, prev = [], 0.0
    for v in r:
        x = (20 * np.log10(max(v, 1e-9)) + 46) / 30
        x = max(0.0, min(1.0, x))
        x = max(x, prev * 0.55)
        prev = x
        out.append(str(int(round(x * 9))))
    return "".join(out)


def encode(a, kbps):
    enc = lameenc.Encoder()
    enc.set_bit_rate(kbps)
    enc.set_in_sample_rate(SR)
    enc.set_out_sample_rate(SR)
    enc.set_channels(1)
    enc.set_quality(2)
    pcm = np.clip(a, -32768, 32767).astype(np.int16).tobytes()
    return bytes(enc.encode(pcm) + enc.flush())


def measure_lag(src, dec):
    s, _ = speech_bounds(src)
    w = SR // 2
    ref = np.abs(src[s : s + w].astype(np.float64))[::4]
    best, lag = -1.0, 0
    for d in range(0, 3000, 8):
        seg = dec[s + d : s + d + w]
        if len(seg) < w:
            break
        c = float((ref * np.abs(seg.astype(np.float64))[::4]).sum())
        if c > best:
            best, lag = c, d
    return lag


def word_marks(words, bounds, t0):
    """WordBoundary (giây trong clip) → [[chỉ số từ, giây tuyệt đối]]."""
    marks, wi = [], 0
    nw = [norm(w) for w in words]
    for off, _dur, txt in bounds:
        t = norm(txt)
        if not t:
            continue
        j = wi
        while j < len(nw) and not (nw[j] == t or nw[j].startswith(t) or t.startswith(nw[j])):
            j += 1
        if j >= len(nw) or j - wi > 3:
            continue
        marks.append([j, round(t0 + off, 3)])
        wi = j + 1
    return marks


def verify_video(dec, lines):
    n = SR // 100
    r = frames_rms(dec, n)
    th = 10 ** (SILENCE_DB / 20)
    bad = 0
    for i, l in enumerate(lines):
        s, e = int(l["start"] * 100), int(l["end"] * 100)
        seg = np.nonzero(r[max(0, s - 20): e + 20] > th)[0]
        if not len(seg):
            bad += 1
            continue
        on, off = (seg[0] + max(0, s - 20)) / 100, (seg[-1] + 1 + max(0, s - 20)) / 100
        if abs(on - l["start"]) > 0.05 or abs(off - l["end"]) > 0.06:
            bad += 1
        if i + 1 < len(lines):
            g0, g1 = e + 8, int(lines[i + 1]["start"] * 100) - 6
            if g1 > g0 and (r[g0:g1] > th).any():
                bad += 1
    return bad


# ---------- main ----------
