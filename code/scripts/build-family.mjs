// HỌ TỪ (word family) cho thẻ từ: décider → décision, chanter → chanteur/chanson… — chỉ gồm từ CÓ trong bộ
// 11k từ (bấm vào là mở được thẻ). Nguồn: kaikki-fr.jsonl (Wiktextract, CC BY-SA 4.0) — chỉ đọc, không tải thêm.
//
// Cạnh giữa hai từ lấy từ: mục "derived", tham số mẫu từ nguyên ghép tiếng Pháp (af/affix/suffix/prefix/
// compound/confix: {{af|fr|chanter|-eur}}), {{deverbal|fr|…}}, và mục "related". Lọc để chỉ giữ quan hệ CẤU
// TẠO TỪ (không giữ quan hệ nghĩa / anh em họ Latin):
//   - bỏ cụm có khoảng trắng, gạch nối, nháy (abat-jour, aujourd'hui — là từ ghép, không phải họ từ);
//   - hai từ phải chung một đoạn chữ (bỏ dấu): derived/từ nguyên ≥4 ký tự hoặc ≥3 ký tự và ≥60% từ ngắn;
//     "related" chặt hơn (≥4 và ≥75%, hoặc chung đầu từ ≥4 và ≥55%) vì nó lẫn quan hệ từ nguyên xa
//     (venir ~ inventer, envers ~ verser);
//   - STOP: vài cặp đúng từ nguyên nhưng gây hiểu nhầm cho người học (main ~ maintenant, beau ~ beaucoup).
// Họ của một từ = các từ nối trực tiếp + "anh em" qua cùng một từ gốc (chanteur → chant, chanson), tối đa 8,
// xếp: nối trực tiếp trước, rồi cấp thấp + phổ biến trước. Soát mẫu ngẫu nhiên 90 cặp (10/2026): ~95% đúng.
//
//   node build-family.mjs          → out/family.json + vá public/data/words/*.json (idempotent)
//   node build-family.mjs --dry    → chỉ in thống kê
// build-words-assemble.mjs đọc out/family.json khi dựng lại bộ từ.
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";

const HERE = import.meta.dirname;
const CODE = join(HERE, "..");
const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"];
const DRY = process.argv.includes("--dry");
const MAX = 8;

const STOP = [
  ["main", "maintenir"], ["main", "maintenant"], ["main", "maintien"], ["main", "maintenance"],
  ["beau", "beaucoup"], ["dire", "dictionnaire"], ["envers", "verser"], ["douzaine", "vingtaine"], ["venir", "inventer"],
  ["venir", "éventualité"], ["venir", "évènement"],
  ["complice", "compliqué"], ["complice", "compliquer"], ["complicité", "compliqué"], ["compote", "composer"],
  ["compote", "décomposer"], ["compote", "compositeur"], ["terrible", "terroriste"],
].map((pair) => pair.sort().join("|"));
// Họ từ quan trọng mà nguồn không nối (hoặc luật chung chữ quá chặt bỏ sót).
const EXTRA = [["libre", "liberté"], ["libre", "libérer"], ["libre", "libération"]];
const AFFIX = new Set(["af", "affix", "suffix", "prefix", "compound", "com", "confix"]);

const words = new Map();
for (const lv of LEVELS)
  for (const w of JSON.parse(readFileSync(join(CODE, "public/data/words", `${lv}.json`), "utf8"))) words.set(w.id, w);

const strip = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae").toLowerCase();
const simple = (s) => !/[\s\-'’]/.test(s);

/** Độ dài đoạn chữ chung dài nhất (quy hoạch động — từ ngắn nên rẻ). */
function lcs(a, b) {
  let best = 0;
  const prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let diag = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = a[i - 1] === b[j - 1] ? diag + 1 : 0;
      if (prev[j] > best) best = prev[j];
      diag = tmp;
    }
  }
  return best;
}

/** Hai từ có chung gốc chữ không — `strict` cho cạnh "related". */
export function sameStem(a, b, strict = false) {
  const x = strip(a);
  const y = strip(b);
  const L = lcs(x, y);
  const short = Math.min(x.length, y.length);
  if (!strict) return L >= 4 || (L >= 3 && L >= 0.6 * short);
  let pre = 0;
  while (pre < short && x[pre] === y[pre]) pre++;
  // related: đoạn chung ≥4 và ≥75% từ ngắn, hoặc chung ĐẦU từ ≥4 và ≥55% (décider ~ décision).
  // Nới hơn nữa (đoạn chung ở giữa từ, đầu từ 3 chữ) thì lọt dessert ~ pâtisserie, genre ~ gentillesse.
  return (L >= 4 && L >= 0.75 * short) || (pre >= 4 && pre >= 0.55 * short);
}

const edges = new Map();
function link(a, b, strict) {
  if (a === b || !words.has(a) || !words.has(b) || !simple(a) || !simple(b)) return;
  if (STOP.includes([a, b].sort().join("|"))) return;
  if (!sameStem(a, b, strict)) return;
  for (const [p, q] of [[a, b], [b, a]]) {
    if (!edges.has(p)) edges.set(p, new Set());
    edges.get(p).add(q);
  }
}

const rl = createInterface({ input: createReadStream(join(HERE, "kaikki-fr.jsonl")), crlfDelay: Infinity });
for await (const line of rl) {
  if (!line.includes('"lang_code": "fr"')) continue;
  const e = JSON.parse(line);
  if (e.lang_code !== "fr" || !words.has(e.word)) continue;
  for (const d of e.derived ?? []) link(e.word, d.word ?? "", false);
  for (const r of e.related ?? []) link(e.word, r.word ?? "", true);
  for (const t of e.etymology_templates ?? []) {
    const a = t.args ?? {};
    if (a["1"] !== "fr") continue;
    if (AFFIX.has(t.name))
      for (const k of ["2", "3", "4"]) {
        const v = a[k] ?? "";
        if (v && !v.startsWith("-") && !v.endsWith("-")) link(e.word, v, false);
      }
    if (t.name === "deverbal") link(e.word, a["2"] ?? "", false);
  }
}

for (const [a, b] of EXTRA)
  for (const [p, q] of [[a, b], [b, a]]) {
    if (!edges.has(p)) edges.set(p, new Set());
    edges.get(p).add(q);
  }

const rank = (id) => [words.get(id).level, -words.get(id).frequency];
const byRank = (a, b) => {
  const [la, fa] = rank(a);
  const [lb, fb] = rank(b);
  return la - lb || fa - fb;
};
const result = {};
for (const id of words.keys()) {
  const direct = [...(edges.get(id) ?? [])].sort(byRank);
  const sib = new Set();
  for (const p of direct) for (const s of edges.get(p) ?? []) if (s !== id && !direct.includes(s) && sameStem(id, s)) sib.add(s);
  const fam = [...direct, ...[...sib].sort(byRank)].slice(0, MAX);
  if (fam.length) result[id] = fam;
}

const sizes = {};
for (const f of Object.values(result)) sizes[f.length] = (sizes[f.length] ?? 0) + 1;
console.log(`family: ${Object.keys(result).length} từ có họ từ`, sizes);
if (DRY) process.exit(0);

writeFileSync(join(HERE, "out/family.json"), JSON.stringify(result));
let changed = 0;
for (const lv of LEVELS) {
  const file = join(CODE, "public/data/words", `${lv}.json`);
  const arr = JSON.parse(readFileSync(file, "utf8"));
  for (const w of arr) {
    const before = JSON.stringify(w.family ?? null);
    if (result[w.id]) w.family = result[w.id];
    else delete w.family;
    if (JSON.stringify(w.family ?? null) !== before) changed++;
  }
  writeFileSync(file, JSON.stringify(arr));
}
console.log(`đã vá ${changed} từ trong public/data/words/*.json`);
