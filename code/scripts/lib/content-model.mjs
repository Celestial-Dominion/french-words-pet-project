// Nạp toàn bộ nguồn học liệu (content/readings|stories/**.txt) → model chuẩn hoá cho check / coverage / build (port app Anh).
// Lỗi CẤU TRÚC (không đọc được) gom vào `errors` kèm file:dòng; lỗi NỘI DUNG để check-content lo.
// Truyện: item có thêm `chapters` [{title, paras, sentences}]; `sentences` = mọi câu nối các chương (kiểm từ vựng cả truyện).
import { join } from "node:path";
import { existsSync } from "node:fs";
import { listSources, parseFile, parseProse, parseChapters, splitPair, parseQuizFile, FormatError } from "./content-format.mjs";
import { analyzeToken, profile, bandOfKey, normText } from "./fr-vocab.mjs";

export const ROOT = join(import.meta.dirname, "..", "..");
export const CONTENT = join(ROOT, "content");
export const LIBRARY_DIRS = ["readings", "stories"];
export const QUIZ_DIR = join(CONTENT, "quiz");

const list = (s) =>
  String(s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
// Từ khai gloss: (được phép vượt cấp) — cụm nhiều từ tách thành từng từ.
// Kèm cả lemma của từng từ: khai "crêpes" thì "crêpe" cũng được.
const glossSet = (arr) => {
  const words = arr.flatMap((x) => [x, ...x.split(/[\s'-]+/)]).map((x) => normText(x).toLowerCase()).filter(Boolean);
  return new Set([...words, ...words.flatMap((w) => analyzeToken(w).flatMap((a) => a.lemmas))]);
};
// Tên riêng: tên viết hoa ("Léa", "Rue Victor Hugo") chỉ khớp token VIẾT HOA (khoá "^từ"); mục viết thường khớp mọi kiểu chữ.
const nameSet = (arr) => {
  const out = new Set();
  for (const x of arr)
    for (const part of normText(x).split(/[\s'-]+/).filter(Boolean)) {
      const low = part.toLowerCase();
      out.add(/\p{Lu}/u.test(part) ? `^${low}` : low);
    }
  return out;
};

// Nguồn mở (bài phỏng theo): "source: Tên gốc | tác giả, tuyển tập (năm)" + license: + source-url:.
function sourceOf(h) {
  if (!h.source && !h.license && !h["source-url"]) return undefined;
  const p = splitPair(h.source ?? "");
  return { title: p?.fr ?? String(h.source ?? "").trim(), credit: p?.vi ?? "", license: h.license ?? "", url: h["source-url"] ?? "", raw: h.source ?? "" };
}
const seriesOf = (h) => {
  if (!h.series) return undefined;
  const [sid, sord] = String(h.series).split(/\s+/);
  return { id: sid, order: Number(sord) };
};

function normReading(it, fail) {
  const h = it.header;
  const title = splitPair(h.title ?? "");
  if (!title) fail(it.line, `thiếu/sai title "FR | VI"`);
  const { paras, sentences } = parseProse(it.body, fail);
  return {
    id: it.id,
    type: it.type,
    level: it.level,
    band: bandOfKey(it.level),
    file: it.file,
    line: it.line,
    header: h,
    title,
    topic: h.topic,
    genre: h.genre,
    series: seriesOf(h),
    source: sourceOf(h),
    names: nameSet(list(h.names)),
    gloss: glossSet(list(h.gloss)),
    paras,
    sentences,
  };
}

function normStory(it, fail) {
  const h = it.header;
  const title = splitPair(h.title ?? "");
  if (!title) fail(it.line, `thiếu/sai title "FR | VI"`);
  const chapters = parseChapters(it.body, fail);
  return {
    id: it.id,
    type: it.type,
    level: it.level,
    band: bandOfKey(it.level),
    file: it.file,
    line: it.line,
    header: h,
    title,
    topic: h.topic,
    genre: h.genre ?? "narrative",
    summary: h.summary ?? "",
    series: seriesOf(h),
    source: sourceOf(h),
    names: nameSet(list(h.names)),
    gloss: glossSet(list(h.gloss)),
    chapters,
    paras: [],
    sentences: chapters.flatMap((c) => c.sentences),
  };
}

/** Nạp thư viện. Trả { items, errors } — items giữ thứ tự file (thứ tự trong cấp = thứ tự viết). */
export function loadLibrary(dir = CONTENT) {
  const items = [];
  const errors = [];
  if (!existsSync(dir)) return { items, errors };
  const files = LIBRARY_DIRS.map((d) => join(dir, d))
    .filter((d) => existsSync(d))
    .flatMap((d) => listSources(d));
  for (const f of files) {
    let parsed;
    try {
      parsed = parseFile(f, ROOT);
    } catch (e) {
      if (e instanceof FormatError) {
        errors.push(e.message);
        continue;
      }
      throw e;
    }
    for (const it of parsed) {
      const fail = (line, msg) => {
        throw new FormatError(`${it.file}:${line}: [${it.id}] ${msg}`);
      };
      try {
        items.push(it.type === "story" ? normStory(it, fail) : normReading(it, fail));
      } catch (e) {
        if (e instanceof FormatError) errors.push(e.message);
        else throw e;
      }
    }
  }
  return { items, errors };
}

/** Nạp câu hỏi đọc hiểu (content/quiz/**.txt). Trả { blocks: Map(id → block), errors, dupes }. */
export function loadQuizzes(dir = QUIZ_DIR) {
  const blocks = new Map();
  const errors = [];
  const dupes = [];
  if (!existsSync(dir)) return { blocks, errors, dupes };
  for (const f of listSources(dir)) {
    let parsed;
    try {
      parsed = parseQuizFile(f, ROOT);
    } catch (e) {
      if (e instanceof FormatError) {
        errors.push(e.message);
        continue;
      }
      throw e;
    }
    for (const b of parsed) {
      const key = b.ch ? `${b.id}#${b.ch}` : b.id;
      if (blocks.has(key)) dupes.push({ key, a: blocks.get(key), b });
      else blocks.set(key, b);
    }
  }
  return { blocks, errors, dupes };
}

const PROFILE = new WeakMap();
/** Hồ sơ từ vựng của item (cache). Từ khai `gloss:` không tính là vượt cấp / ngoài từ điển. */
export function profileOf(m) {
  let p = PROFILE.get(m);
  if (!p) {
    p = profile(
      m.sentences.map((s) => s.fr),
      { names: m.names, level: m.band },
    );
    const g = (t) => m.gloss.has(t.toLowerCase());
    p.over = p.over.filter((o) => !m.gloss.has(o.lemma) && !g(o.t));
    p.unknown = p.unknown.filter((t) => !g(t));
    PROFILE.set(m, p);
  }
  return p;
}

export const wordsOf = (m) => profileOf(m).nWords;
