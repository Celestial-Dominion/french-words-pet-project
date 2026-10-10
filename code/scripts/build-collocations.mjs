// CỤM HAY ĐI KÈM (collocations) cho thẻ từ: "prendre une décision — đưa ra quyết định", "pleuvoir à verse".
// Nguồn: RL-fr — Réseau Lexical du Français v3.2 (ATILF, CC BY 4.0) cho từ đi kèm (prep-col-batches.py →
// out/col-in), cụm hoàn chỉnh + nghĩa tiếng Việt viết tay ở out/col-out/NN.json: {"id": [["cụm fr", "nghĩa vi"], …]}.
// Khác app tiếng Anh (chỉ cụm), ở đây mỗi cụm kèm nghĩa vì cụm tiếng Pháp khó đoán nghĩa hơn.
// Lọc: id phải có trong bộ từ, bỏ trùng, tối đa 4 cụm; cụm phải chứa từ gốc (hoặc dạng chia/biến đổi chung
// ≥50% đầu từ) — cụm đồng nghĩa không chứa từ (il pleut des cordes) đã bị loại khỏi col-out.
//
//   node build-collocations.mjs        → out/collocations.json + vá public/data/words/*.json (idempotent)
//   node build-collocations.mjs --dry  → chỉ in thống kê / cảnh báo
// build-words-assemble.mjs đọc out/collocations.json khi dựng lại bộ từ.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const HERE = import.meta.dirname;
const CODE = join(HERE, "..");
const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"];
const DRY = process.argv.includes("--dry");
const MAX = 4;

const words = new Map();
for (const lv of LEVELS)
  for (const w of JSON.parse(readFileSync(join(CODE, "public/data/words", `${lv}.json`), "utf8"))) words.set(w.id, w);

const strip = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").toLowerCase();
const prefix = (a, b) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
};
// cụm có chứa từ gốc? (chia động từ / số nhiều / giống cái: aboyer → aboie, cheval → chevaux)
const hasHead = (id, fr) => {
  const w = strip(id);
  const s = strip(fr);
  if (s.includes(w)) return true;
  const need = Math.min(w.length, Math.max(3, Math.ceil(w.length * 0.5)));
  return s.split(/[^a-z0-9]+/).some((t) => prefix(t, w) >= need);
};

const result = {};
const warn = [];
const dir = join(HERE, "out/col-out");
for (const f of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  for (const [id, list] of Object.entries(JSON.parse(readFileSync(join(dir, f), "utf8")))) {
    if (!words.has(id)) {
      warn.push(`${f}: "${id}" không có trong bộ từ`);
      continue;
    }
    const seen = new Set(result[id]?.map((c) => c[0]) ?? []);
    const out = result[id] ?? [];
    for (const [fr, vi] of list) {
      const p = fr?.trim();
      const m = vi?.trim();
      if (!p || !m || seen.has(p)) continue;
      if (!hasHead(id, p)) warn.push(`${f}: ${id} — "${p}" không chứa từ gốc`);
      seen.add(p);
      out.push([p, m]);
    }
    if (out.length) result[id] = out.slice(0, MAX);
  }
}

const sizes = {};
for (const c of Object.values(result)) sizes[c.length] = (sizes[c.length] ?? 0) + 1;
const byLevel = {};
for (const id of Object.keys(result)) byLevel[words.get(id).level] = (byLevel[words.get(id).level] ?? 0) + 1;
console.log(`collocations: ${Object.keys(result).length} từ, ${Object.values(result).flat().length} cụm`, sizes, byLevel);
if (warn.length) console.log(warn.join("\n"));
if (DRY) process.exit(0);

writeFileSync(join(HERE, "out/collocations.json"), JSON.stringify(result));
let changed = 0;
for (const lv of LEVELS) {
  const file = join(CODE, "public/data/words", `${lv}.json`);
  const arr = JSON.parse(readFileSync(file, "utf8"));
  for (const w of arr) {
    const before = JSON.stringify(w.collocations ?? null);
    if (result[w.id]) w.collocations = result[w.id];
    else delete w.collocations;
    if (JSON.stringify(w.collocations ?? null) !== before) changed++;
  }
  writeFileSync(file, JSON.stringify(arr));
}
console.log(`đã vá ${changed} từ trong public/data/words/*.json`);
