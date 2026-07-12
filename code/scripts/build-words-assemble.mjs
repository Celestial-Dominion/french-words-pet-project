// F1c-3 — Gộp words-base + nghĩa VI thành file cuối public/data/words/{cefr}.json + words-index.json.
// Vào: scripts/out/words-base.json, scripts/out/meanings-vi.json (id -> meaning_vi)
// Ra:  public/data/words/a1.json … c2.json  và  public/data/words-index.json
//
// Bao gồm mọi từ; từ chưa có nghĩa VI để meaning_vi="" (UI fallback sang nghĩa EN).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { levelSlug } from "../lib/levels.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE = join(HERE, "..");
const base = JSON.parse(readFileSync(join(HERE, "out/words-base.json"), "utf8"));
const viPath = join(HERE, "out/meanings-vi.json");
const vi = existsSync(viPath) ? JSON.parse(readFileSync(viPath, "utf8")) : {};

const byLevel = {};
const index = {};
let withVi = 0;

for (const w of base) {
  const word = { ...w };
  const m = vi[w.id];
  if (m) {
    // m có thể là chuỗi (chỉ vi) hoặc { vi, en }.
    const mvi = typeof m === "string" ? m : m.vi;
    if (mvi) {
      word.meaning_vi = mvi;
      withVi++;
    }
    // nghĩa EN từ nguồn sinh nếu base chưa có (chưa qua kaikki).
    if (typeof m === "object" && m.en && (!word.meaning_en || !word.meaning_en.length)) {
      word.meaning_en = Array.isArray(m.en) ? m.en : [m.en];
    }
  }
  (byLevel[w.level] ||= []).push(word);
  index[w.id] = [word.ipa, word.meaning_vi];
}

for (const [level, arr] of Object.entries(byLevel)) {
  arr.sort((a, b) => b.frequency - a.frequency);
  writeFileSync(join(CODE, `public/data/words/${levelSlug(Number(level))}.json`), JSON.stringify(arr));
}
writeFileSync(join(CODE, "public/data/words-index.json"), JSON.stringify(index));

console.log("Tổng từ:", base.length, "| có nghĩa VI:", withVi);
for (const [level, arr] of Object.entries(byLevel).sort()) {
  const v = arr.filter((w) => w.meaning_vi).length;
  console.log(`  cấp ${level} (${levelSlug(Number(level))}): ${arr.length} từ, ${v} có nghĩa VI`);
}
