// Nhãn VĂN PHONG (register) cho thẻ từ: thân mật, tiếng lóng, thô tục, miệt thị, văn chương, trang trọng, cũ.
// Nguồn: tag nghĩa trong Wiktextract (kaikki-fr.jsonl, CC BY-SA 4.0) — chỉ đọc, không tải gì thêm.
//
// Quy tắc (quy tắc "nghĩa đầu tiên" của app Anh gắn sai nhiều từ Pháp vì Wiktionary xếp nghĩa CŨ lên
// đầu: partir/quitter/gentil thành "cũ"): một nhãn được nhận khi
//   (a) MỌI nghĩa (bỏ dạng biến hình) của mục cùng từ loại đều mang nhãn đó, HOẶC
//   (b) nghĩa khớp nghĩa app đang dạy (meaning_en[0]) mang nhãn VÀ ít nhất một nửa số nghĩa mang nhãn;
// rồi áp OVERRIDES — kết quả soát tay toàn bộ ~350 ứng viên (10/2026): bỏ nhãn sai, đổi nhãn lệch.
//
//   node build-register.mjs          → out/register.json + vá public/data/words/*.json (idempotent)
//   node build-register.mjs --dry    → chỉ in thống kê
// build-words-assemble.mjs đọc out/register.json khi dựng lại bộ từ.
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";

const HERE = import.meta.dirname;
const CODE = join(HERE, "..");
const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"];
const DRY = process.argv.includes("--dry");

// tag Wiktionary → nhãn app (khớp REGISTER_VI trong components/word-detail.tsx)
const TAG = {
  colloquial: "informal", informal: "informal", familiar: "informal", humorous: "informal",
  slang: "slang", vulgar: "vulgar",
  offensive: "offensive", derogatory: "offensive", pejorative: "offensive",
  literary: "literary", poetic: "literary", formal: "formal",
  dated: "dated", archaic: "dated", obsolete: "dated",
};
const POS = { n: "noun", v: "verb", vaux: "verb", adj: "adj", adv: "adv", pron: "pron", prep: "prep", conj: "conj", num: "num", det: "det", art: "article", onom: "intj" };

/** Soát tay: id → nhãn cuối cùng ([] = bỏ hẳn). Từ không có ở đây giữ kết quả quy tắc. */
export const OVERRIDES = {
  // nhãn sai/không cần: từ chuẩn trong tiếng Pháp hiện đại
  près: [], amant: [], auprès: [], autrefois: [], certes: [], cesse: [], lointain: [], nul: [], vélo: [], maths: [],
  mien: [], sien: [], tien: [], nôtre: [], vôtre: [], vôtres: [], soucier: [], vilain: [], instituteur: [], ivre: [],
  major: [], sombrer: [], médiocre: [], delà: [], superficiel: [], citadin: [], sorcellerie: [], brigand: [],
  illuminé: [], clochard: [], fifi: [], su: [], cordonnier: [], huissier: [], mathématique: [], guetteur: [],
  trôner: [], médiocrité: [], décombre: [], tors: [], abject: [], joint: [], tordu: [], gâchis: [], pingouin: [],
  poilu: [], grommeler: [], dandiner: [], dialecte: [], bouché: [], dérangé: [], raffoler: [], trempe: [],
  cabosser: [], baliverne: [], monté: [], éclaté: [],
  // đổi nhãn
  putain: ["vulgar"], emplir: ["literary"], for: ["literary"], vêtir: ["literary"], voire: ["formal"],
  nonne: ["dated"], gésir: ["literary"], sus: ["formal"], aucunement: ["formal"], hormis: ["formal"],
  gonzesse: ["slang"], gonze: ["slang"], gueux: ["dated"],
  paperasse: ["informal"], raté: ["informal"], maton: ["slang"], morveux: ["informal"], jacter: ["slang"],
  attardé: ["informal"], richard: ["informal"], clébard: ["informal"], mauviette: ["informal"], clodo: ["informal"],
  poivrot: ["informal"], saligaud: ["informal"], flic: ["informal"], boche: ["offensive"], garce: ["informal", "offensive"],
  pédé: ["vulgar", "offensive"], négro: ["offensive"], pétasse: ["vulgar", "offensive"], pouffiasse: ["vulgar", "offensive"],
  ben: ["informal"], vachement: ["informal"], marrer: ["informal"], nana: ["informal"], mec: ["informal"],
  gueuler: ["informal"], chiant: ["vulgar"], emmerdeur: ["vulgar"], branleur: ["vulgar"], enculer: ["vulgar"],
  bite: ["vulgar"], entuber: ["slang"], nichon: ["vulgar"], merdique: ["vulgar"], dégueuler: ["vulgar"],
  emmerde: ["vulgar"], dégueulasse: ["informal"], cuistot: ["informal"], fissa: ["informal"], gratos: ["informal"],
  gnôle: ["informal"], matos: ["informal"], cinoche: ["informal"], clope: ["informal"], fauché: ["informal"],
  cinglé: ["informal"], accro: ["informal"], nickel: ["informal"],
};

const words = new Map();
for (const lv of LEVELS)
  for (const w of JSON.parse(readFileSync(join(CODE, "public/data/words", `${lv}.json`), "utf8"))) words.set(w.id, w);

const entries = new Map();
const rl = createInterface({ input: createReadStream(join(HERE, "kaikki-fr.jsonl")), crlfDelay: Infinity });
for await (const line of rl) {
  if (!line.includes('"lang_code": "fr"')) continue;
  const e = JSON.parse(line); // không bắt "word" bằng regex: mục con (derived, forms…) cũng có khoá "word"
  if (e.lang_code !== "fr" || !words.has(e.word)) continue;
  if (!entries.has(e.word)) entries.set(e.word, []);
  entries.get(e.word).push(e);
}

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z ]/g, "").trim();
const realSenses = (e) =>
  (e.senses ?? []).filter(
    (s) => s.glosses?.length && !s.form_of && !s.alt_of && !(s.tags ?? []).some((t) => t === "form-of" || t === "alt-of"),
  );

/** Nhãn theo quy tắc (a)/(b) ở đầu file. */
export function ruleTags(word, wordEntries) {
  const want = POS[word.pos[0]];
  const same = wordEntries.filter((e) => e.pos === want);
  const senses = (same.length ? same : wordEntries).flatMap(realSenses);
  if (!senses.length) return [];
  const tagSets = senses.map((s) => new Set((s.tags ?? []).map((t) => TAG[t]).filter(Boolean)));
  const m0 = norm(word.meaning_en?.[0]);
  const hitIdx = m0 ? senses.findIndex((s) => norm(s.glosses.at(-1)).startsWith(m0)) : -1;
  const hit = hitIdx >= 0 ? tagSets[hitIdx] : new Set();
  const count = new Map();
  for (const set of tagSets) for (const t of set) count.set(t, (count.get(t) ?? 0) + 1);
  return [...count].filter(([t, n]) => n === senses.length || (hit.has(t) && n * 2 >= senses.length)).map(([t]) => t);
}

const result = {};
for (const [id, w] of words) {
  const tags = id in OVERRIDES ? OVERRIDES[id] : ruleTags(w, entries.get(id) ?? []);
  if (tags.length) result[id] = tags;
}

const stats = {};
for (const tags of Object.values(result)) for (const t of tags) stats[t] = (stats[t] ?? 0) + 1;
console.log(`register: ${Object.keys(result).length} từ`, stats);
if (DRY) process.exit(0);

writeFileSync(join(HERE, "out/register.json"), JSON.stringify(result, null, 1));
let changed = 0;
for (const lv of LEVELS) {
  const file = join(CODE, "public/data/words", `${lv}.json`);
  const arr = JSON.parse(readFileSync(file, "utf8"));
  for (const w of arr) {
    const before = JSON.stringify(w.register ?? null);
    if (result[w.id]) w.register = result[w.id];
    else delete w.register;
    if (JSON.stringify(w.register ?? null) !== before) changed++;
  }
  writeFileSync(file, JSON.stringify(arr));
}
console.log(`đã vá ${changed} từ trong public/data/words/*.json`);
