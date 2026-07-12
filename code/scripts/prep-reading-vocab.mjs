// Xuất danh sách từ vựng LŨY KẾ (cumulative) tới từng cấp, cho subagent viết bài đọc trong phạm vi.
//   node prep-reading-vocab.mjs
// Ra: scripts/out/read-vocab/{cefr}.txt  (mỗi dòng: "lemma\tnghĩa VI")
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LEVELS, levelSlug } from "../lib/levels.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out/read-vocab");
mkdirSync(OUT, { recursive: true });

const base = JSON.parse(readFileSync(join(HERE, "out/words-base.json"), "utf8"));
const vi = JSON.parse(readFileSync(join(HERE, "out/meanings-vi.json"), "utf8"));
const meaning = (id) => (typeof vi[id] === "string" ? vi[id] : vi[id]?.vi || "");

for (const { level, cefr } of LEVELS) {
  const words = base
    .filter((w) => w.level <= level)
    .sort((a, b) => a.level - b.level || b.frequency - a.frequency)
    .map((w) => `${w.id}\t${meaning(w.id)}`);
  writeFileSync(join(OUT, `${levelSlug(level)}.txt`), words.join("\n"));
  console.log(`${cefr}: ${words.length} từ lũy kế`);
}
