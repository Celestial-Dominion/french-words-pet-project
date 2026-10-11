// Tiện ích chung cho đợt câu ví dụ 3 → 5 câu/từ (B1–B4): tách từ tiếng Pháp, tra lemma + cấp, kiểm tra một câu.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const HERE = import.meta.dirname;
export const CODE = join(HERE, "../..");
export const OUT = join(HERE, "../out");
const J = (p) => JSON.parse(readFileSync(p, "utf8"));

export const base = J(join(OUT, "words-base.json"));
export const words = new Map(base.map((w) => [w.id, w]));
export const lemmaMap = J(join(CODE, "public/data/lemma-map.json"));
export const wordLevel = Object.fromEntries(base.map((w) => [w.id, w.level]));
const viMap = J(join(OUT, "meanings-vi.json"));
export const viOf = (id) => {
  const m = viMap[id];
  return (typeof m === "string" ? m : m?.vi) || "";
};

const L = "a-zà-ÿœæ";
/** Tách câu thành token chữ thường (giữ nguyên dạng có nháy/gạch nối nếu lemma-map biết, không thì tách tiếp). */
export function tokens(fr) {
  const out = [];
  for (let raw of fr.toLowerCase().replace(/[’`]/g, "'").replace(/œ/g, "oe").replace(/æ/g, "ae").split(new RegExp(`[^${L}'-]+`))) {
    raw = raw.replace(/^['-]+|['-]+$/g, "");
    if (!raw) continue;
    if (lemmaMap[raw] || words.has(raw)) {
      out.push(raw);
      if (!raw.includes("-")) continue; // cụm có gạch nối (celui-là, peut-être): giữ cả cụm lẫn từng phần
      if (words.has(raw)) continue; // từ ghép là một mục từ (week-end, pique-nique): không tách
    }
    for (let part of raw.split("-")) {
      if (!part) continue;
      const m = part.match(new RegExp(`^((?:[${L}]{1,2}|jusqu|lorsqu|puisqu|quoiqu|presqu)')(.+)$`));
      if (m && !lemmaMap[part]) {
        out.push(m[1]);
        part = m[2];
      }
      if (part) out.push(part);
    }
  }
  return out;
}

const ELIDED = { "l'": "le", "d'": "de", "j'": "je", "m'": "me", "t'": "te", "s'": "se", "n'": "ne", "c'": "ce", "qu'": "que", "jusqu'": "jusque", "lorsqu'": "lorsque", "puisqu'": "puisque", "quoiqu'": "quoique", "presqu'": "presque" };
export const lemmaOf = (t) => ELIDED[t] ?? lemmaMap[t] ?? (wordLevel[t] ? t : undefined);

/** Câu có chứa từ đích không: exact = đúng nguyên dạng (dùng được cho bài điền), form = một dạng chia/biến hình. */
export function targetIn(fr, id) {
  const ts = tokens(fr);
  const w = words.get(id);
  const forms = new Set([id, ...(w?.forms ?? [])]);
  const low = id.toLowerCase();
  const exact = ts.includes(low) || (low.includes(" ") || low.includes("'") || low.includes("-") ? fr.toLowerCase().replace(/’/g, "'").includes(low) : false);
  const form = exact || ts.some((t) => forms.has(t) || lemmaOf(t) === id);
  return { exact, form };
}

/** Từ vượt cấp trong câu (lemma cấp > maxLevel); tên riêng viết hoa, số được bỏ qua. */
export function overLevel(fr, maxLevel) {
  const over = [];
  const capWords = new Set((fr.match(/\b[A-ZÀ-Ý][a-zà-ÿ]+/g) ?? []).slice(1).map((x) => x.toLowerCase()));
  for (const t of tokens(fr)) {
    const lem = lemmaOf(t);
    const lv = lem ? wordLevel[lem] : undefined;
    if (lv === undefined) {
      if (!capWords.has(t) && !/^\d+$/.test(t)) over.push(t + "?");
    } else if (lv > maxLevel) over.push(t);
  }
  return over;
}

export const LEN = { 1: [3, 9], 2: [4, 11], 3: [5, 14], 4: [6, 17], 5: [6, 20], 6: [6, 22] }; // số token chấp nhận theo cấp
export const levelSlug = (lv) => ["", "a1", "a2", "b1", "b2", "c1", "c2"][lv];
