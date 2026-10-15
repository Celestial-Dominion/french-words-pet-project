// Từ vựng tiếng Pháp cho bộ kiểm học liệu (content/**): tách từ, quy về lemma, tra cấp.
// Nguồn sự thật = bộ từ của app: public/data/word-levels.json (lemma → cấp 1..6), lemma-map.json (dạng → lemma,
// dựng theo ưu tiên tần suất), words/*.json (tần suất, nhãn văn phong). Band nội bộ 0..5 = A1..C2 (như app Anh).
//
// Đặc thù tiếng Pháp:
//   · nháy cong ’ → ', œ → oe (bộ từ ghi "soeur", "oeuf"), « » và ngoặc bị bỏ.
//   · lược âm l' d' j' m' t' s' n' c' qu' jusqu' lorsqu' puisqu' → le de je me te se ne ce que jusque lorsque puisque
//     (aujourd'hui, presqu'île… có trong bộ từ thì giữ nguyên).
//   · gạch nối: thử cả cụm (peut-être, grand-mère, week-end) rồi mới tách (est-ce, a-t-il, dit-elle; "-t-" bỏ).
//   · mạo từ gộp au/aux/du/des → đếm cả hai thành phần (à + le, de + le…).
//   · dạng đồng hình (été = être / mùa hè, mes) → đếm mọi lemma ứng viên, cấp = cấp DỄ nhất (không phạt oan).
//   · số (chữ số, số đếm viết chữ) và thán từ là từ tự do: tính vào độ dài, không chấm cấp.
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const LEVEL_KEYS = ["a1", "a2", "b1", "b2", "c1", "c2"];
export const LEVEL_LABEL = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const bandOfKey = (k) => LEVEL_KEYS.indexOf(k);

const ROOT = join(import.meta.dirname, "..", "..");
const DATA = join(ROOT, "public", "data");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// Lược âm → lemma.
const ELIDE = {
  l: "le", d: "de", j: "je", m: "me", t: "te", s: "se", n: "ne", c: "ce",
  qu: "que", jusqu: "jusque", lorsqu: "lorsque", puisqu: "puisque", quoiqu: "quoique",
};
// Mạo từ gộp: đếm đủ thành phần.
const CONTRACT = { au: ["à", "le"], aux: ["à", "les"], du: ["de", "le"], des: ["de", "un"] };
// Dạng biến thể trước nguyên âm → lemma chuẩn.
const VARIANT = { nouvel: "nouveau", vieil: "vieux", bel: "beau", cet: "ce", fol: "fou", mol: "mou" };
// Cấp bộ từ gán lệch cho từ chức năng (do tách lược âm/cụm) → cấp dùng khi chấm.
// euro: tần suất phụ đề thấp (B2) nhưng là từ đời thường, trong suốt với người học.
const BAND_FIX = { parce: 0, jusque: 0, qu: 0, l: 0, "s'": 0, euro: 0 };

const NUM = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize",
  "quatorze", "quinze", "seize", "vingt", "vingts", "trente", "quarante", "cinquante", "soixante", "cent", "cents",
  "mille", "et",
];
const NUMBER_WORDS = new Set(NUM);
// "h"/"min" sau số giờ (19 h 30) cũng miễn
const INTERJ = new Set(["h", "min", "er", "e", "oh", "ah", "eh", "euh", "hein", "aïe", "ouf", "hé", "ok", "bravo", "chut", "miam", "oups", "hum", "waouh", "ouah", "pfff", "bof", "ouais"]);
// số đếm viết chữ có gạch nối (dix-huit, vingt-et-un, quatre-vingt-dix) — trừ "un"/"et" đứng riêng là từ thường
const isNumberWord = (lw) => lw.includes("-") && lw.split("-").every((p) => NUMBER_WORDS.has(p));
export const isFree = (lw) => INTERJ.has(lw) || isNumberWord(lw) || (NUMBER_WORDS.has(lw) && !["un", "et", "neuf"].includes(lw));

// Tên riêng / địa danh quen thuộc dùng tự do ở mọi bài (không cần khai names:).
export const GLOBAL_NAMES = new Set(
  [
    "France", "Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Nice", "Toulouse", "Nantes", "Strasbourg", "Europe",
    "Afrique", "Asie", "Amérique", "Canada", "Québec", "Montréal", "Belgique", "Bruxelles", "Suisse", "Genève",
    "Sénégal", "Dakar", "Maroc", "Viêt", "Vietnam", "Hanoï", "Seine", "Loire", "Bretagne", "Provence", "Alpes",
    "Noël", "Pâques", "Internet",
  ].map((x) => x.toLowerCase().replace(/œ/g, "oe")),
);

let V = null;
/** Bộ từ: band (lemma → 0..5), lmap (dạng → lemma), words (id → mục từ), zipf (lemma → Zipf ước lượng). */
export function loadVocab() {
  if (V) return V;
  const levels = readJson(join(DATA, "word-levels.json"));
  const lmap = readJson(join(DATA, "lemma-map.json"));
  const band = new Map(Object.entries(levels).map(([k, l]) => [k, BAND_FIX[k] ?? l - 1]));
  const words = new Map();
  for (const k of LEVEL_KEYS) {
    const p = join(DATA, "words", `${k}.json`);
    if (existsSync(p)) for (const w of readJson(p)) words.set(w.id, w);
  }
  const zipf = new Map();
  for (const [id, w] of words) if (w.frequency) zipf.set(id, Math.log10(w.frequency) + 3);
  V = { band, lmap, words, zipf };
  return V;
}

/** Chuẩn hoá chuỗi trước khi tách. */
export const normText = (s) =>
  String(s)
    .replace(/[’‘`´]/g, "'")
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "Oe")
    .replace(/æ/g, "ae")
    .replace(/ | /g, " ");

const TOKEN_RE = /\p{L}+(?:['-]\p{L}+)*'?|\d+(?:[.,:h]\d+)*/gu;
/** Tách câu → token gốc (giữ hoa/thường) kèm vị trí đầu câu. */
export function tokenize(text) {
  const out = [];
  const t = normText(text);
  let start = true;
  let last = 0;
  for (const m of t.matchAll(TOKEN_RE)) {
    const gap = t.slice(last, m.index);
    // sau dấu kết câu / mở ngoặc kép / gạch đầu dòng / hai chấm thì từ kế tiếp được viết hoa
    if (/[.!?…:«"—–]\s*$|^\s*[-–—]\s*$/.test(gap)) start = true;
    out.push({ t: m[0], start });
    start = false;
    last = m.index + m[0].length;
  }
  return out;
}

const cand = (lw) => {
  const v = loadVocab();
  const out = new Set();
  const w = VARIANT[lw] ?? lw;
  const lm = v.lmap[w];
  if (lm && v.band.has(lm)) out.add(lm);
  if (v.band.has(w)) out.add(w);
  if (w !== lw && v.band.has(lw)) out.add(lw); // "cet" cũng là mục từ riêng
  if (!out.size) {
    // dạng biến hình chưa có trong lemma-map: số nhiều, giống cái
    for (const base of [w.replace(/s$/, ""), w.replace(/x$/, ""), w.replace(/e$/, ""), w.replace(/es$/, ""), w.replace(/aux$/, "al")]) {
      if (base === w || base.length < 2) continue;
      const b2 = v.lmap[base] ?? base;
      if (v.band.has(b2)) {
        out.add(b2);
        break;
      }
    }
  }
  return [...out];
};

/**
 * Phân tích một token → các "từ" [{t, how, lemmas:[…], band}]. how: word | free | num | name | cap? | unknown.
 * names = Set tên đã khai (khoá "^thường" cho tên viết hoa, "thường" cho mục viết thường).
 */
export function analyzeToken(raw, { names = new Set(), start = false } = {}) {
  const v = loadVocab();
  if (/^\d/.test(raw)) return [{ t: raw, how: "num", lemmas: [], band: -1 }];
  let tok = raw.replace(/'$/, "");
  const lw0 = tok.toLowerCase();
  const capital = /^\p{Lu}/u.test(tok);
  const isName = (x) => names.has(`^${x}`) || names.has(x) || GLOBAL_NAMES.has(x);
  if (capital && isName(lw0)) return [{ t: tok, how: "name", lemmas: [], band: -1 }];
  // cả token có trong bộ từ (aujourd'hui, peut-être, grand-mère)?
  const whole = cand(lw0);
  if (whole.length || isFree(lw0)) {
    const w = word(tok, lw0, whole, capital, start, isName);
    // từ ghép gạch nối hiếm hơn các phần của nó (grands-parents B2 = grand + parent A1) → lấy cấp các phần
    if (w.how === "word" && tok.includes("-")) {
      const parts = lw0.split("-").filter(Boolean).map((p) => cand(p));
      if (parts.every((c) => c.length)) w.band = Math.min(w.band, Math.max(...parts.map((c) => Math.min(...c.map((l) => v.band.get(l) ?? 9)))));
    }
    return [w];
  }
  const out = [];
  // lược âm đầu
  const el = /^([a-zA-Z]+)'(.+)$/.exec(tok);
  if (el && ELIDE[el[1].toLowerCase()]) {
    const lem = ELIDE[el[1].toLowerCase()];
    out.push({ t: `${el[1]}'`, how: "word", lemmas: [lem], band: v.band.get(lem) ?? 0 });
    return out.concat(analyzeToken(el[2], { names, start }));
  }
  // gạch nối: tách, bỏ -t- nối âm
  if (tok.includes("-")) {
    const parts = tok.split("-").filter((p) => p && p.toLowerCase() !== "t");
    parts.forEach((p, i) => out.push(...analyzeToken(p, { names, start: start && i === 0 })));
    return out;
  }
  return [word(tok, lw0, [], capital, start, isName)];
}

function word(tok, lw, lemmas, capital, start, isName) {
  const v = loadVocab();
  if (isFree(lw)) return { t: tok, how: "free", lemmas: [], band: -1 };
  // au/du/des/aux: đếm cả mục từ riêng (có trong bộ từ A1) lẫn hai từ gốc
  if (CONTRACT[lw]) return { t: tok, how: "word", lemmas: [...CONTRACT[lw], ...(v.band.has(lw) ? [lw] : [])], band: 0 };
  // CHỮ IN HOA cả từ (tiêu đề thông báo "CHAT PERDU") → đọc như chữ thường
  if (tok.length > 1 && tok === tok.toUpperCase()) capital = false;
  if (capital && !start) {
    // viết hoa giữa câu: tên riêng đã khai → tên; là từ thường trong bộ từ (Madame, Monsieur) → từ; còn lại → tên chưa khai
    if (isName(lw)) return { t: tok, how: "name", lemmas: [], band: -1 };
    // (chỉ nhận khi chữ thường của nó là MỤC TỪ: "Aix" không thành "avoir" qua lemma-map)
    if (!v.band.has(lw) || /^\p{Lu}{2,}/u.test(tok)) return { t: tok, how: "cap?", lemmas: [], band: -1 };
  }
  if (!lemmas.length) return { t: tok, how: capital ? "cap?" : "unknown", lemmas: [], band: -1 };
  const band = Math.min(...lemmas.map((l) => v.band.get(l) ?? 9));
  return { t: tok, how: "word", lemmas, band };
}

/** Phân tích câu → mảng từ (đã tách lược âm/gạch nối). */
export function analyzeSentence(text, { names } = {}) {
  return tokenize(text).flatMap(({ t, start }) => analyzeToken(t, { names, start }));
}

/**
 * Hồ sơ từ vựng của một tập câu (cùng giao diện với app Anh):
 * { counts: Map lemma→số lần, bands[6], over:[{t, lemma, band}], unknown:[token], names:Set, nWords, nScored }.
 */
export function profile(sentences, { names, level } = {}) {
  const counts = new Map();
  const bands = [0, 0, 0, 0, 0, 0];
  const over = [];
  const unknown = [];
  const found = new Set();
  let nWords = 0;
  let nScored = 0;
  for (const s of sentences) {
    for (const w of analyzeSentence(s, { names })) {
      if (w.how === "num") continue;
      nWords++;
      if (w.how === "name") {
        found.add(w.t);
        continue;
      }
      if (w.how === "cap?" || w.how === "unknown") {
        unknown.push(w.t);
        continue;
      }
      if (w.how === "free") continue;
      nScored++;
      if (w.band >= 0 && w.band <= 5) bands[w.band]++;
      for (const l of w.lemmas) counts.set(l, (counts.get(l) ?? 0) + 1);
      if (level !== undefined && w.band > level) over.push({ t: w.t, lemma: w.lemmas[0], band: w.band });
    }
  }
  return { counts, bands, over, unknown, names: found, nWords, nScored };
}

/** Trọng số tần suất (Zipf ~1..7.5) — sắp từ đích theo độ thường gặp. */
export function weightOf(lemma) {
  return loadVocab().zipf.get(lemma) ?? 2;
}

// Mục từ không đáng nhắm phủ mà từ điển chưa gắn register: viết tắt + từ tục/miệt thị (chữ cái đơn lọc theo độ dài).
const NOT_TARGET = new Set(["etc", "mlle", "mme", "merde", "cul", "bordel", "déconner", "nègre", "enculé", "salopard", "niquer", "tapette", "ducon", "emmerdement"]);

/** Từ đích được đặt mục tiêu phủ: không tục/xúc phạm, không phải từ tự do/lược âm, chữ cái đơn hay viết tắt. */
export function isTarget(id) {
  const v = loadVocab();
  if (isFree(id) || id.endsWith("'") || id.includes(" ") || id.length === 1 || NOT_TARGET.has(id)) return false;
  const reg = v.words.get(id)?.register ?? [];
  return !reg.some((r) => r === "vulgar" || r === "offensive");
}

/** Danh sách từ đích của band b (0 = A1). */
export function targetWords(b) {
  const v = loadVocab();
  const out = [];
  for (const [id, bb] of v.band) if (bb === b && isTarget(id)) out.push(id);
  return out;
}

// ---- thì/thức chưa hợp A1–A2: passé simple, subjonctif (dạng KHÔNG đồng hình với dạng khác) ----
// Dựng từ Lexique383 (scripts/Lexique383.tsv, không có trong git) → cache scripts/out/fr-tense-flags.json.
let TENSE = null;
export function tenseForms() {
  if (TENSE) return TENSE;
  const tsv = join(ROOT, "scripts", "Lexique383.tsv");
  const cache = join(ROOT, "scripts", "out", "fr-tense-flags.json");
  if (existsSync(cache) && (!existsSync(tsv) || statSync(cache).mtimeMs > statSync(tsv).mtimeMs)) {
    TENSE = new Map(Object.entries(readJson(cache)));
    return TENSE;
  }
  if (!existsSync(tsv)) return (TENSE = new Map());
  const tags = new Map(); // dạng → Set nhãn ("ps", "subj", "other")
  const lines = readFileSync(tsv, "utf8").split("\n");
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split("\t");
    if (c.length < 11) continue;
    const form = c[0].replace(/œ/g, "oe");
    if (!tags.has(form)) tags.set(form, new Set());
    const set = tags.get(form);
    if (c[3] !== "VER" && c[3] !== "AUX") {
      set.add("other");
      continue;
    }
    for (const inf of c[10].split(";").filter(Boolean)) {
      if (/^ind:pas/.test(inf)) set.add("ps");
      else if (/^sub:/.test(inf)) set.add("subj");
      else set.add("other");
    }
  }
  const out = {};
  for (const [f, s] of tags) if (!s.has("other") && s.size) out[f] = s.has("ps") ? "passé simple" : "subjonctif";
  mkdirSync(join(ROOT, "scripts", "out"), { recursive: true });
  writeFileSync(cache, JSON.stringify(out));
  TENSE = new Map(Object.entries(out));
  return TENSE;
}

/** Dạng passé simple / subjonctif trong câu → [{t, kind}]. */
export function tenseFlags(text) {
  const tf = tenseForms();
  const out = [];
  for (const { t } of tokenize(text)) {
    const lw = t.toLowerCase().replace(/^[a-z]+'/, "");
    const k = tf.get(lw);
    if (k) out.push({ t, kind: k });
  }
  return out;
}
