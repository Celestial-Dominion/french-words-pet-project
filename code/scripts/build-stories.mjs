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
    index.push({ id: d.id, level, title_fr: d.title_fr, title_vi: d.title_vi, chapters: d.chapters.length });
  console.log(`${cefr.toUpperCase()}: ${docs.length} truyện | coverage lemma ${tot ? Math.round((ok / tot) * 1000) / 10 : 100}%`);
}
index.sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
writeFileSync(join(CODE, "public/data/stories-index.json"), JSON.stringify(index));
console.log(`Tổng truyện: ${index.length}`);
