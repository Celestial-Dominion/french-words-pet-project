// Tạo batch để soát CÂU VÍ DỤ của một cấp.
//   node prep-ex-qa-batches.mjs <cefr>
// Ra: scripts/out/exqa-in/{cefr}-N.json — mỗi mục {id, pos[nhãn VN], gender, vi, sentences:[{fr,vi}]}.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { levelFromCefr } from "../lib/levels.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const cefr = (process.argv[2] || "").toLowerCase();
const level = levelFromCefr(cefr);
if (!cefr) { console.error("Thiếu cefr"); process.exit(1); }

mkdirSync(join(HERE, "out/exqa-in"), { recursive: true });
mkdirSync(join(HERE, "out/exqa-out"), { recursive: true });

const base = JSON.parse(readFileSync(join(HERE, "out/words-base.json"), "utf8"));
const vi = JSON.parse(readFileSync(join(HERE, "out/meanings-vi.json"), "utf8"));
const examples = JSON.parse(readFileSync(join(HERE, "out/examples.json"), "utf8"));
const POS = { n: "danh từ", v: "động từ", vaux: "trợ động từ", adj: "tính từ", adv: "phó từ", prep: "giới từ", conj: "liên từ", pron: "đại từ", art: "mạo từ", det: "hạn định từ", num: "số từ", onom: "tượng thanh", phr: "cụm từ" };

const items = base
  .filter((w) => w.level === level && examples[w.id])
  .sort((a, b) => b.frequency - a.frequency)
  .map((w) => {
    const m = vi[w.id];
    const mv = typeof m === "string" ? m : m?.vi || "";
    return { id: w.id, pos: w.pos.map((p) => POS[p] || p), gender: w.gender || null, vi: mv, sentences: examples[w.id] };
  });

const SIZE = 100;
let n = 0;
for (let i = 0; i < items.length; i += SIZE) {
  writeFileSync(join(HERE, `out/exqa-in/${cefr}-${n}.json`), JSON.stringify(items.slice(i, i + SIZE), null, 1));
  n++;
}
console.log(`${cefr.toUpperCase()}: ${items.length} từ (${items.length * 3} câu) → ${n} batch`);
