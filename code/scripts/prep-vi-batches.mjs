// Tạo file batch đầu vào cho việc sinh nghĩa VI của một cấp.
//   node prep-vi-batches.mjs <cefr>   (vd: a2, b1, b2, c1, c2)
// Ra: scripts/out/vi-in/{cefr}-0.json … theo lô 200 từ. Bỏ qua từ đã có nghĩa trong meanings-vi.json.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { levelFromCefr } from "../lib/levels.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const cefr = (process.argv[2] || "").toLowerCase();
const level = levelFromCefr(cefr);
if (!cefr) {
  console.error("Thiếu tham số cefr (a2|b1|b2|c1|c2)");
  process.exit(1);
}

mkdirSync(join(HERE, "out/vi-in"), { recursive: true });
mkdirSync(join(HERE, "out/vi-out"), { recursive: true });

const base = JSON.parse(readFileSync(join(HERE, "out/words-base.json"), "utf8"));
const viPath = join(HERE, "out/meanings-vi.json");
const done = existsSync(viPath) ? JSON.parse(readFileSync(viPath, "utf8")) : {};

const POS = { n: "danh từ", v: "động từ", vaux: "trợ động từ", adj: "tính từ", adv: "phó từ", prep: "giới từ", conj: "liên từ", pron: "đại từ", art: "mạo từ", det: "hạn định từ", num: "số từ", onom: "tượng thanh" };

const items = base
  .filter((w) => w.level === level && !done[w.id])
  .sort((a, b) => b.frequency - a.frequency)
  .map((w) => ({ id: w.id, pos: w.pos.map((p) => POS[p] || p), gender: w.gender || null, verb_group: w.verb_group || null, ipa: w.ipa }));

const SIZE = 200;
let n = 0;
for (let i = 0; i < items.length; i += SIZE) {
  writeFileSync(join(HERE, `out/vi-in/${cefr}-${n}.json`), JSON.stringify(items.slice(i, i + SIZE), null, 1));
  n++;
}
console.log(`${cefr.toUpperCase()}: ${items.length} từ cần dịch → ${n} batch`);
