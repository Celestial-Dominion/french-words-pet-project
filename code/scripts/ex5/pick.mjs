// Chọn câu ứng viên từ Tatoeba (văn bản CC BY 2.0 FR) để nâng câu ví dụ lên 5 câu/từ.
//   node scripts/ex5/pick.mjs <cefr>  → scripts/out/ex5/in/{cefr}-NN.txt (80 từ/lô) + thống kê
// Mỗi từ: số câu còn thiếu + tối đa 4 ứng viên đã lọc: đúng độ dài theo cấp, chứa từ đích (ưu tiên nguyên dạng — dùng
// được cho bài điền), từ khác ≤ cấp+1 (tối đa 1 từ vượt cấp), không từ lạ / thô tục, chưa dùng cho từ khác, không gần
// trùng câu đã có. Xếp hạng: nguyên dạng > người bản ngữ > có bản tiếng Anh (làm trung gian dịch) > không "Tom/Marie".
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { OUT, words, tokens, lemmaOf, wordLevel, viOf, LEN, levelSlug } from "./lib.mjs";

const cefr = process.argv[2];
const LV = ["a1", "a2", "b1", "b2", "c1", "c2"].indexOf(cefr) + 1;
if (!LV) throw new Error("cefr?");
const T = join(import.meta.dirname, "../tatoeba");
const tsv = (f) => readFileSync(join(T, f), "utf8").split("\n").filter(Boolean).map((l) => l.split("\t"));

const native = new Set(tsv("user_languages.csv").filter((r) => r[0] === "fra" && r[1] === "5").map((r) => r[2]));
const eng = new Map(tsv("eng_sentences.tsv").map((r) => [r[0], r[2]]));
const vie = new Map(tsv("vie_sentences.tsv").map((r) => [r[0], r[2]]));
const toEn = new Map();
for (const [f, e] of tsv("fra-eng_links.tsv")) if (!toEn.has(f) && eng.has(e)) toEn.set(f, eng.get(e));
const toVi = new Map();
for (const [f, v] of tsv("fra-vie_links.tsv")) if (!toVi.has(f) && vie.has(v)) toVi.set(f, vie.get(v));

const BAD = new Set([...words.values()].filter((w) => w.register?.some((r) => r === "vulgar" || r === "offensive")).map((w) => w.id));
const ex = JSON.parse(readFileSync(join(OUT, "examples.json"), "utf8"));
const used = new Set(Object.values(ex).flat().map((s) => s.fr));
// câu đã chọn ở các cấp trước (đợt này) cũng tính là đã dùng
const doneDir = join(OUT, "ex5/out");
if (existsSync(doneDir))
  for (const f of readdirSync(doneDir)) for (const l of readFileSync(join(doneDir, f), "utf8").split("\n")) {
    const p = l.split("\t");
    if (p[1] === "+" && p[2]) used.add(p[2]);
  }

const MAXLV = Math.min(6, LV + 1);
const [MIN, MAX] = LEN[LV];
const idx = new Map(); // lemma → [sentence]
let kept = 0;
for (const [id, , fr, user] of tsv("fra_sentences_detailed.tsv")) {
  if (!/^[A-ZÀ-ÝÇ«"]/.test(fr) || !/[.!?»"]$/.test(fr) || /[0-9:;()\[\]{}…_/\\]|  /.test(fr) || fr.length > 160) continue;
  const ts = tokens(fr);
  if (ts.length < MIN || ts.length > MAX) continue;
  const caps = new Set((fr.match(/[A-ZÀ-Ý][a-zà-ÿ]+/g) ?? []).slice(1).map((x) => x.toLowerCase()));
  let over = 0, ok = true;
  const lems = new Set();
  for (const t of ts) {
    const lem = lemmaOf(t);
    if (!lem || wordLevel[lem] === undefined) {
      if (caps.has(t)) continue;
      ok = false;
      break;
    }
    if (BAD.has(lem)) { ok = false; break; }
    if (wordLevel[lem] > MAXLV) { ok = false; break; }
    if (wordLevel[lem] > LV) over++;
    lems.add(lem);
  }
  if (!ok || over > 1 || used.has(fr)) continue;
  const s = { id, fr, ts, native: native.has(user), en: toEn.get(id), vi: toVi.get(id), tom: /\b(Tom|Marie|Mary|John)\b/.test(fr) };
  for (const l of new Set([...lems, ...ts])) (idx.get(l) ?? idx.set(l, []).get(l)).push(s); // theo lemma lẫn dạng bề mặt (du, des, au, l')
  kept++;
}

const jac = (a, b) => {
  const A = new Set(a), B = new Set(b);
  let i = 0;
  for (const x of A) if (B.has(x)) i++;
  return i / (A.size + B.size - i || 1);
};
const taken = new Set();
const lines = [];
const stat = { words: 0, need: 0, full: 0, partial: 0, none: 0 };
const list = [...words.values()].filter((w) => w.level === LV).sort((a, b) => b.frequency - a.frequency);
for (const w of list) {
  stat.words++;
  const have = ex[w.id] ?? [];
  const need = Math.max(0, 5 - have.length);
  if (!need) continue;
  stat.need += need;
  const low = w.id.toLowerCase();
  const cands = (idx.get(w.id) ?? [])
    .filter((s) => !taken.has(s.id) && !have.some((h) => jac(tokens(h.fr), s.ts) >= 0.6))
    .map((s) => ({ s, exact: s.ts.includes(low), score: (s.ts.includes(low) ? 8 : 0) + (s.native ? 4 : 0) + (s.en ? 3 : 0) + (s.tom ? -3 : 0) + (s.vi ? 1 : 0) - Math.abs(s.ts.length - (MIN + MAX) / 2) * 0.15 }))
    .sort((a, b) => b.score - a.score);
  const pick = [];
  for (const c of cands) {
    if (pick.length >= 4) break;
    if (pick.some((p) => jac(p.s.ts, c.s.ts) >= 0.5)) continue;
    pick.push(c);
  }
  pick.forEach((p) => taken.add(p.s.id));
  stat[pick.length >= need + 1 ? "full" : pick.length ? "partial" : "none"]++;
  lines.push(`@${w.id} [cần ${need}] ${viOf(w.id)}`);
  pick.forEach((p, k) => lines.push(`${"abcd"[k]}${p.exact ? "" : "~"} #${p.s.id} ${p.s.fr} || ${p.s.en ?? "-"}${p.s.vi ? ` || vi: ${p.s.vi}` : ""}`));
}
const dir = join(OUT, "ex5/in");
mkdirSync(dir, { recursive: true });
mkdirSync(doneDir, { recursive: true });
let n = 0, cur = [], cnt = 0;
const flush = () => {
  if (!cur.length) return;
  writeFileSync(join(dir, `${cefr}-${String(n).padStart(2, "0")}.txt`), cur.join("\n") + "\n");
  n++, (cur = []), (cnt = 0);
};
for (const l of lines) {
  if (l.startsWith("@") && cnt >= 80) flush();
  if (l.startsWith("@")) cnt++;
  cur.push(l);
}
flush();
console.log(cefr.toUpperCase(), `câu Tatoeba hợp cấp: ${kept}`, JSON.stringify(stat), `→ ${n} lô`);
