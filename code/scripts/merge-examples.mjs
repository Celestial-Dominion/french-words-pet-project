// Gộp scripts/out/ex-out/*.json → scripts/out/examples.json (tất cả) và
// public/data/examples/{cefr}.json (tách theo cấp, để lazy-load trong word-detail).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { levelSlug } from "../lib/levels.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE = join(HERE, "..");
const OUT = join(HERE, "out/ex-out");
mkdirSync(join(CODE, "public/data/examples"), { recursive: true });

// TÍCH LUỸ: bắt đầu từ examples.json hiện có (không dựng lại từ đầu) → an toàn trước va chạm tên batch.
const accPath = join(HERE, "out/examples.json");
const all = existsSync(accPath) ? JSON.parse(readFileSync(accPath, "utf8")) : {};
let files = 0;
for (const fn of readdirSync(OUT).filter((f) => f.endsWith(".json"))) {
  let o;
  try {
    o = JSON.parse(readFileSync(join(OUT, fn), "utf8"));
  } catch {
    continue; // bỏ file hỏng/cắt dở
  }
  // chỉ nhận entry đúng định dạng (3 câu, có fr+vi)
  for (const [k, v] of Object.entries(o)) {
    if (Array.isArray(v) && v.length === 3 && v.every((s) => s && s.fr && s.vi)) all[k] = v;
  }
  files++;
}
writeFileSync(accPath, JSON.stringify(all));

// tách theo cấp dựa vào word-levels.json
const levels = JSON.parse(readFileSync(join(CODE, "public/data/word-levels.json"), "utf8"));
const byLevel = {};
let totalSent = 0;
for (const [id, sents] of Object.entries(all)) {
  const lv = levels[id];
  if (!lv) continue;
  (byLevel[lv] ||= {})[id] = sents;
  totalSent += sents.length;
}
for (const [lv, map] of Object.entries(byLevel)) {
  writeFileSync(join(CODE, `public/data/examples/${levelSlug(Number(lv))}.json`), JSON.stringify(map));
}

console.log(`Gộp ${files} file → ${Object.keys(all).length} từ có ví dụ, ${totalSent} câu.`);
for (const [lv, map] of Object.entries(byLevel).sort()) {
  console.log(`  cấp ${lv} (${levelSlug(Number(lv))}): ${Object.keys(map).length} từ`);
}
