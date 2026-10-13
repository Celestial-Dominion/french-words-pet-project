#!/usr/bin/env python3
"""Sinh audio MP3 từ manifest bằng edge-tts (giọng fr-FR-DeniseNeural).

Dùng:
    ./.venv/bin/python build-audio.py out/audio-words.json     ../public/audio/words
    ./.venv/bin/python build-audio.py out/audio-sentences.json ../public/audio/sentences

Manifest = JSON list [{ "text": "...", "file": "xxxx.mp3" }].
Resume: bỏ qua file đã tồn tại & > 0 byte. Chạy song song có giới hạn.
"""
import asyncio
import json
import os
import sys

import edge_tts

VOICE = "fr-FR-DeniseNeural"
CONCURRENCY = int(os.environ.get("CONC", "8"))  # số yêu cầu edge-tts song song (CONC=48 … để chạy nhanh hơn)


async def synth(sem, text, out_path, stats):
    # Bỏ qua nếu đã có (resume).
    if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        stats["skip"] += 1
        return
    async with sem:
        for attempt in range(3):
            try:
                communicate = edge_tts.Communicate(text, VOICE)
                tmp = out_path + ".part"
                await communicate.save(tmp)
                if os.path.getsize(tmp) == 0:
                    raise RuntimeError("empty audio")
                os.replace(tmp, out_path)
                stats["ok"] += 1
                if (stats["ok"] + stats["skip"]) % 200 == 0:
                    print(f"  ... {stats['ok']} mới, {stats['skip']} bỏ qua", flush=True)
                return
            except Exception as e:  # noqa: BLE001
                if attempt == 2:
                    stats["err"] += 1
                    print(f"  LỖI '{text[:40]}': {e}", flush=True)
                else:
                    await asyncio.sleep(1.5 * (attempt + 1))


async def main():
    manifest_path, out_dir = sys.argv[1], sys.argv[2]
    here = os.path.dirname(os.path.abspath(__file__))
    manifest_path = os.path.join(here, manifest_path) if not os.path.isabs(manifest_path) else manifest_path
    out_dir = os.path.join(here, out_dir) if not os.path.isabs(out_dir) else out_dir
    os.makedirs(out_dir, exist_ok=True)

    items = json.load(open(manifest_path, encoding="utf-8"))
    print(f"Manifest: {len(items)} mục → {out_dir}", flush=True)

    sem = asyncio.Semaphore(CONCURRENCY)
    stats = {"ok": 0, "skip": 0, "err": 0}
    tasks = [synth(sem, it["text"], os.path.join(out_dir, it["file"]), stats) for it in items]
    await asyncio.gather(*tasks)
    print(f"XONG: {stats['ok']} mới, {stats['skip']} bỏ qua, {stats['err']} lỗi.", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
