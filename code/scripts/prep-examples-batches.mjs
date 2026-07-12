// Tạo batch đầu vào cho việc sinh CÂU VÍ DỤ của một cấp.
//   node prep-examples-batches.mjs <cefr>   (a1|a2|b1|b2|c1|c2)
// Ra: scripts/out/ex-in/{cefr}-N.json (100 từ/lô). Bỏ từ đã có ví dụ trong out/examples.json.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { levelFromCefr } from "../lib/levels.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const cefr = (process.argv[2] || "").toLowerCase();
const level = levelFromCefr(cefr);
if (!cefr) { console.error("Thiếu cefr"); process.exit(1); }

mkdirSync(join(HERE, "out/ex-in"), { recursive: true });
mkdirSync(join(HERE, "out/ex-out"), { recursive: true });

const base = JSON.parse(readFileSync(join(HERE, "out/words-base.json"), "utf8"));
const viMap = JSON.parse(readFileSync(join(HERE, "out/meanings-vi.json"), "utf8"));
const exPath = join(HERE, "out/examples.json");
const done = existsSync(exPath) ? JSON.parse(readFileSync(exPath, "utf8")) : {};

const POS = { n: "danh từ", v: "động từ", vaux: "trợ động từ", adj: "tính từ", adv: "phó từ", prep: "giới từ", conj: "liên từ", pron: "đại từ", art: "mạo từ", det: "hạn định từ", num: "số từ", onom: "tượng thanh" };

const items = base
  .filter((w) => w.level === level && !done[w.id])
  .sort((a, b) => b.frequency - a.frequency)
  .map((w) => {
    const m = viMap[w.id];
    const vi = typeof m === "string" ? m : m?.vi || "";
    return { id: w.id, pos: w.pos.map((p) => POS[p] || p), gender: w.gender || null, vi };
  });

const SIZE = 100;
let n = 0;
for (let i = 0; i < items.length; i += SIZE) {
  writeFileSync(join(HERE, `out/ex-in/${cefr}-${n}.json`), JSON.stringify(items.slice(i, i + SIZE), null, 1));
  n++;
}
console.log(`${cefr.toUpperCase()}: ${items.length} từ cần ví dụ → ${n} batch (100 từ/batch)`);
