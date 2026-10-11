// Validate (từ vựng lũy kế) + ghép truyện ra public/data/stories + stories-index.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LEVELS } from "../lib/levels.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE = join(HERE, "..");
mkdirSync(join(CODE, "public/data/stories"), { recursive: true });

const base = JSON.parse(readFileSync(join(HERE, "out/words-base.json"), "utf8"));
const lemmaMap = JSON.parse(readFileSync(join(CODE, "public/data/lemma-map.json"), "utf8"));
const wordLevel = Object.fromEntries(base.map((w) => [w.id, w.level]));

const norm = (raw) =>
  raw.toLowerCase().replace(/^[^a-zàâäçéèêëîïôöùûüÿœæ'’-]+/u, "").replace(/[^a-zàâäçéèêëîïôöùûüÿœæ'’-]+$/u, "").replace(/’/g, "'");
const WORD_RE = /[a-zàâäçéèêëîïôöùûüÿœæ'’-]/i;
const isCap = (t) => /^[A-ZÀ-Ÿ]/.test(t.trim());
const isNum = (t) => /^\d+$/.test(t.trim());
const resolve = (s) => lemmaMap[s] ?? lemmaMap[s.split("'").pop() || s] ?? (wordLevel[s] ? s : undefined);

// Siêu dữ liệu soạn tay (chủ đề, thể loại, tóm tắt truyện) + thời lượng đọc ước lượng (wpm theo cấp, như app Anh).
const META = existsSync(join(HERE, "out/library-meta.json")) ? JSON.parse(readFileSync(join(HERE, "out/library-meta.json"), "utf8")) : {};
const WPM = { 1: 70, 2: 90, 3: 110, 4: 130, 5: 150, 6: 170 };
const countWords = (sents) => sents.reduce((n, s) => n + s.fr.split(/\s+/).filter((t) => /[a-zà-ÿœæ]/i.test(t)).length, 0);
const minutes = (words, level) => Math.round((words / (WPM[level] ?? 120)) * 10) / 10;
const index = [];
for (const { level, cefr } of LEVELS) {
  const path = join(HERE, `out/story-out/${cefr}.json`);
  if (!existsSync(path)) continue;
  const stories = JSON.parse(readFileSync(path, "utf8"));
  let tot = 0, ok = 0;
  const docs = stories.map((st) => {
    for (const ch of st.chapters)
      for (const s of ch.sentences)
        for (const raw of s.fr.split(/\s+/)) {
          if (!WORD_RE.test(raw)) continue;
          const surf = norm(raw);
          if (!surf) continue;
          tot++;
          const lem = resolve(surf);
          if ((lem && wordLevel[lem] && wordLevel[lem] <= level) || (!lem && (isCap(raw) || isNum(raw)))) ok++;
        }
    return { ...st, level };
  });
  writeFileSync(join(CODE, `public/data/stories/${cefr.toLowerCase()}.json`), JSON.stringify(docs));
  for (const d of docs)
  {
    const meta = META.stories?.[d.id];
    if (!meta) console.warn(`  ! thiếu chủ đề/tóm tắt cho ${d.id} (scripts/out/library-meta.json)`);
    const words = countWords(d.chapters.flatMap((c) => c.sentences));
    index.push({ id: d.id, level, title_fr: d.title_fr, title_vi: d.title_vi, chapters: d.chapters.length, topic: meta?.topic ?? "daily-life", summary: meta?.summary ?? "", words, min: minutes(words, level) });
  }
  console.log(`${cefr.toUpperCase()}: ${docs.length} truyện | coverage lemma ${tot ? Math.round((ok / tot) * 1000) / 10 : 100}%`);
}
index.sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
writeFileSync(join(CODE, "public/data/stories-index.json"), JSON.stringify(index));
console.log(`Tổng truyện: ${index.length}`);
