// Áp dụng sửa câu ví dụ (scripts/out/exqa-out/*.json) vào examples.json + regen public/data/examples/{cefr}.json.
// KHÔNG dùng merge-examples (nó đọc ex-out gốc, sẽ đè mất bản QA).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { levelSlug } from "../lib/levels.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE = join(HERE, "..");
const exPath = join(HERE, "out/examples.json");
const examples = JSON.parse(readFileSync(exPath, "utf8"));
const OUT = join(HERE, "out/exqa-out");

let files = 0, fixes = 0;
const log = [];
for (const fn of readdirSync(OUT).filter((f) => f.endsWith(".json"))) {
  const o = JSON.parse(readFileSync(join(OUT, fn), "utf8"));
  files++;
  for (const [id, corr] of Object.entries(o)) {
    if (!corr || !Array.isArray(corr.sentences) || corr.sentences.length !== 3) continue;
    if (!corr.sentences.every((s) => s && s.fr && s.vi)) continue;
    examples[id] = corr.sentences;
    fixes++;
    log.push(id);
  }
}
writeFileSync(exPath, JSON.stringify(examples));

// regen per-level
const levels = JSON.parse(readFileSync(join(CODE, "public/data/word-levels.json"), "utf8"));
const byLevel = {};
for (const [id, sents] of Object.entries(examples)) {
  const lv = levels[id];
  if (lv) (byLevel[lv] ||= {})[id] = sents;
}
for (const [lv, map] of Object.entries(byLevel)) {
  writeFileSync(join(CODE, `public/data/examples/${levelSlug(Number(lv))}.json`), JSON.stringify(map));
}
console.log(`Đọc ${files} file QA-ví-dụ · sửa ${fixes} từ: ${log.join(", ")}`);
