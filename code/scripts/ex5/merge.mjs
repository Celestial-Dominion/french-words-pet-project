// Ghép câu đã chọn + dịch (scripts/out/ex5/out/*.txt) vào câu ví dụ, idempotent.
// Dòng: "id|a|nghĩa vi" (chọn ứng viên a–d của lô cùng tên trong ex5/in) hoặc "id|+|câu fr|nghĩa vi" (tự viết).
// Câu Tatoeba mang thêm t = mã câu (ghi công CC BY 2.0 FR). Bản 3 câu gốc giữ ở out/examples-3.json.
// Sửa câu gốc sai (rà soát): scripts/out/ex5/fix.txt, dòng "id|chỉ số 0–2|câu fr|nghĩa vi".
//   node scripts/ex5/merge.mjs [--check]
import { readFileSync, writeFileSync, existsSync, readdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { OUT, words, targetIn } from "./lib.mjs";

const CHECK = process.argv.includes("--check");
const orig = join(OUT, "examples-3.json");
if (!existsSync(orig)) copyFileSync(join(OUT, "examples.json"), orig);
const ex = JSON.parse(readFileSync(orig, "utf8"));
const errs = [];
const fixPath = join(OUT, "ex5/fix.txt");
if (existsSync(fixPath))
  for (const [n, l] of readFileSync(fixPath, "utf8").split("\n").entries()) {
    if (!l.trim()) continue;
    const [id, i, fr, ...vi] = l.split("|");
    if (!ex[id]?.[i] || !fr || !vi.length) { errs.push(`fix.txt:${n + 1} sai dòng`); continue; }
    ex[id][i] = { fr: fr.trim(), vi: vi.join("|").trim() };
  }
const inDir = join(OUT, "ex5/in"), outDir = join(OUT, "ex5/out");
const added = {};
const allFr = new Set(Object.values(ex).flat().map((s) => s.fr));
const per = {};
for (const f of readdirSync(outDir).filter((f) => f.endsWith(".txt")).sort()) {
  const cand = new Map(); // "id|a" → {t, fr}
  let cur = null;
  if (existsSync(join(inDir, f)))
    for (const l of readFileSync(join(inDir, f), "utf8").split("\n")) {
      if (l.startsWith("@")) cur = l.slice(1).split(" [")[0];
      else if (cur && /^[a-d]~? #\d+ /.test(l)) {
        const m = l.match(/^([a-d])~? #(\d+) (.*?)(?: \|\| |$)/);
        cand.set(`${cur}|${m[1]}`, { t: Number(m[2]), fr: m[3] });
      }
    }
  for (const [n, l] of readFileSync(join(outDir, f), "utf8").split("\n").entries()) {
    if (!l.trim()) continue;
    const p = l.split("|");
    const id = p[0];
    if (!words.has(id)) { errs.push(`${f}:${n + 1} từ lạ "${id}"`); continue; }
    let s;
    if (p[1] === "+") s = { fr: p[2]?.trim(), vi: p.slice(3).join("|").trim() };
    else {
      const c = cand.get(`${id}|${p[1]}`);
      if (!c) { errs.push(`${f}:${n + 1} không có ứng viên ${id}|${p[1]}`); continue; }
      s = { fr: c.fr, vi: p.slice(2).join("|").trim(), t: c.t };
    }
    if (!s.fr || !s.vi) { errs.push(`${f}:${n + 1} thiếu câu/nghĩa`); continue; }
    if (allFr.has(s.fr)) { errs.push(`${f}:${n + 1} câu trùng "${s.fr}"`); continue; }
    if (!targetIn(s.fr, id).form) errs.push(`${f}:${n + 1} (cảnh báo) "${s.fr}" không chứa ${id}`);
    allFr.add(s.fr);
    (added[id] ??= []).push(s);
  }
}
const merged = {};
let short = [];
for (const [id, list] of Object.entries(ex)) {
  merged[id] = [...list, ...(added[id] ?? [])].slice(0, 5);
  const lv = words.get(id)?.level;
  per[lv] ??= { words: 0, five: 0, added: 0 };
  per[lv].words++;
  per[lv].added += (added[id] ?? []).length;
  if (merged[id].length >= 5) per[lv].five++;
  else if (added[id]) short.push(id);
}
if (errs.length) console.log(errs.join("\n"));
console.log("theo cấp:", JSON.stringify(per));
if (short.length) console.log("chưa đủ 5 (đã có lô):", short.slice(0, 30).join(", "), short.length > 30 ? `… (${short.length})` : "");
if (!CHECK) writeFileSync(join(OUT, "examples.json"), JSON.stringify(merged));
