// Dựng chỉ mục từ → học liệu public/data/word-refs/{0..15}.json (định dạng + cách chọn bài: lib/word-refs.ts).
//   node scripts/build-word-refs.mjs        (build-content.mjs tự gọi sau khi ghi dữ liệu bài)
// Đọc ĐÚNG dữ liệu app đang phát hành (readings|stories-index.json + readings|stories/{id}.json) nên chạy riêng được
// mà không dựng lại bài (an toàn khi phiên khác đang viết dở nội dung), kể cả sau `ONLY=c1 build-content`.
// Tách từ / quy về lemma bằng chính bộ kiểm học liệu (scripts/lib/fr-vocab.mjs) — chỉ giữ lemma có trong bộ từ của app;
// tên riêng lấy từ khai `names:` trong content/ để "Marie" đầu câu không thành "marier".
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadLibrary } from "./lib/content-model.mjs";
import { DATA, readLibrary } from "./lib/library-data.mjs";
import { loadVocab, profile } from "./lib/fr-vocab.mjs";
import { WORD_REF_SHARDS, pickRefs, wordRefKey, wordRefShardOf } from "../lib/word-refs.ts";

const OUT = join(DATA, "word-refs");

/** items (tuỳ chọn) = mục content/ đã nạp sẵn (build-content truyền vào để khỏi đọc lại) — chỉ dùng lấy tên riêng. */
export function buildWordRefs({ items } = {}) {
  const t0 = Date.now();
  const { band } = loadVocab();
  const names = new Map((items ?? loadLibrary().items).map((m) => [m.id, m.names]));
  const readings = readLibrary("readings");
  const stories = readLibrary("stories");
  const rIndex = readings.map((x) => x.meta);
  const sIndex = stories.map((x) => x.meta);

  const refs = new Map(); // lemma → [{code, level, count}]
  let missing = 0;
  const add = ({ meta, doc: d }, code) => {
    if (!d) return void missing++;
    const sentences = (d.chapters ? d.chapters.flatMap((c) => c.sentences) : d.sentences).map((s) => s.fr);
    for (const [lemma, count] of profile(sentences, { names: names.get(meta.id) }).counts) {
      if (!band.has(lemma)) continue;
      let list = refs.get(lemma);
      if (!list) refs.set(lemma, (list = []));
      list.push({ code, level: meta.level, count });
    }
  };
  readings.forEach((x, i) => add(x, `r${i}`));
  stories.forEach((x, i) => add(x, `s${i}`));

  const k = wordRefKey(
    rIndex.map((m) => m.id),
    sIndex.map((m) => m.id),
  );
  const shards = Array.from({ length: WORD_REF_SHARDS }, () => ({ k, w: {} }));
  for (const [lemma, list] of [...refs].sort(([a], [b]) => (a < b ? -1 : 1))) shards[wordRefShardOf(lemma)].w[lemma] = pickRefs(list);
  mkdirSync(OUT, { recursive: true });
  const sizes = shards.map((s, i) => {
    const txt = JSON.stringify(s);
    writeFileSync(join(OUT, `${i}.json`), txt);
    return txt.length;
  });
  for (const f of readdirSync(OUT)) if (!/^\d+\.json$/.test(f) || Number(f.split(".")[0]) >= WORD_REF_SHARDS) rmSync(join(OUT, f));
  const kb = (n) => `${Math.round(n / 1024)} KB`;
  console.log(
    `word-refs: ${refs.size} từ · ${rIndex.length} bài đọc + ${sIndex.length} truyện · ${WORD_REF_SHARDS} shard ` +
      `${kb(Math.min(...sizes))}–${kb(Math.max(...sizes))} (tổng ${kb(sizes.reduce((a, b) => a + b, 0))}) · ${Date.now() - t0} ms` +
      (missing ? ` · ⚠ ${missing} mục chỉ mục không có dữ liệu bài` : ""),
  );
  return { words: refs.size, missing };
}

if (import.meta.main) {
  if (!existsSync(join(DATA, "readings-index.json"))) throw new Error("chưa có public/data/readings-index.json — chạy build-content trước");
  buildWordRefs();
}
