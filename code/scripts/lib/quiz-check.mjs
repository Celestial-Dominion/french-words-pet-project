// Kiểm câu hỏi đọc hiểu (content/quiz/**.txt) — port app Anh (scripts/lib/quiz-check.mjs).
// Luật (✗ = lỗi chặn build, ! = cảnh báo):
//   ✗ 3–4 câu / bài; mỗi câu đúng 4 phương án, đúng MỘT dòng "+"; phương án không trùng; câu hỏi kết bằng "?";
//     có giải thích (>) chứa ít nhất một «trích dẫn» NGUYÊN VĂN câu trong bài; từ của câu hỏi + phương án ≤ cấp bài
//     (từ/tên/thuật ngữ đã có trong bài thì được dùng lại); độ dài câu hỏi / phương án ≤ mốc cấp; không
//     "toutes les réponses" (giao diện xáo phương án); không passé simple / subjonctif ở A1–A2.
//   ! dịch câu hỏi không kết bằng "?", giải thích không có dấu tiếng Việt, đáp án đúng dài hẳn các phương án khác.
import { profile, tenseFlags, normText, analyzeSentence } from "./fr-vocab.mjs";
import { SPEC } from "./content-spec.mjs";

const VI_LETTERS = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
// phương án trỏ tới phương án khác vô nghĩa khi thứ tự bị xáo
const BANNED = /\b(toutes|aucune) (les|des) réponses\b|\bles deux\W*$|\bci-dessus\b/i;
const words = (s) => s.split(/\s+/).filter((w) => /\p{L}|\d/u.test(w)).length;
const normQ = (s) =>
  normText(s)
    .replace(/[“”«»]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
const normOpt = (s) =>
  normText(s)
    .toLowerCase()
    .replace(/[^\p{L}\d ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
const tokenSet = (sentences) => new Set(sentences.flatMap((s) => analyzeSentence(s.fr).map((w) => w.t.toLowerCase())));

/** «…» trong giải thích. */
export function quotesOf(why) {
  return [...String(why).matchAll(/«([^»]+)»/g)].map((m) => m[1].trim());
}

/** Trích dẫn có nằm nguyên văn trong một câu (hoặc hai câu liền nhau) của bài? */
export function quoteFound(quote, sentences) {
  const q = normQ(quote);
  if (!q) return false;
  const s = sentences.map((x) => normQ(x.fr));
  for (let i = 0; i < s.length; i++) {
    if (s[i].includes(q)) return true;
    if (i + 1 < s.length && `${s[i]} ${s[i + 1]}`.includes(q)) return true;
  }
  return false;
}

const SEEN = new WeakMap();
function seenOf(m) {
  let r = SEEN.get(m);
  if (!r) {
    const p = profile(
      m.sentences.map((s) => s.fr),
      { names: m.names, level: m.band },
    );
    r = { lemmas: new Set(p.counts.keys()), tokens: tokenSet(m.sentences) };
    SEEN.set(m, r);
  }
  return r;
}

/** Kiểm một block câu hỏi của bài m. Trả {e:[], w:[], stats}. */
export function checkQuizBlock(block, m) {
  const e = [];
  const w = [];
  const stats = { questions: block.questions.length, longest: 0 };
  const at = "hỏi";
  const spec = SPEC[m.level].quiz;
  const n = block.questions.length;
  if (n < 3 || n > 4) e.push(`${at}: ${n} câu hỏi (cần 3–4)`);
  if (m.level === "a2" && n < 4) w.push(`${at}: A2 nên có 4 câu hỏi`);
  const own = m.sentences;
  const allowed = seenOf(m);
  const qTexts = new Set();
  block.questions.forEach((q, i) => {
    const where = `${at} câu ${i + 1} (dòng ${q.line})`;
    const qn = normOpt(q.q.fr);
    if (qTexts.has(qn)) e.push(`${where}: câu hỏi lặp`);
    qTexts.add(qn);
    if (!/\?\s*$/.test(q.q.fr)) e.push(`${where}: câu hỏi phải kết bằng "?"`);
    if (!/\s\?\s*$/.test(q.q.fr)) w.push(`${where}: tiếng Pháp viết cách trước "?" ("… ?")`);
    if (!/\?\s*$/.test(q.q.vi)) w.push(`${where}: dịch câu hỏi nên kết bằng "?"`);
    if (q.opts.length !== 4) e.push(`${where}: ${q.opts.length} phương án (cần đúng 4)`);
    const ok = q.opts.filter((o) => o.ok).length;
    if (ok !== 1) e.push(`${where}: ${ok} phương án đúng (cần đúng 1 dòng "+")`);
    const keys = q.opts.map((o) => normOpt(o.fr));
    if (new Set(keys).size !== keys.length) e.push(`${where}: phương án trùng nhau`);
    if (keys.includes(qn)) e.push(`${where}: phương án trùng câu hỏi`);
    for (const o of q.opts) if (BANNED.test(o.fr)) e.push(`${where}: không dùng "${o.fr}" (phương án được xáo)`);
    const qw = words(q.q.fr);
    if (qw > spec.q) e.push(`${where}: câu hỏi ${qw} từ (mốc ≤ ${spec.q})`);
    for (const o of q.opts) {
      const ow = words(o.fr);
      if (ow > spec.opt) e.push(`${where}: phương án "${o.fr.slice(0, 40)}" ${ow} từ (mốc ≤ ${spec.opt})`);
      if (!VI_LETTERS.test(o.vi) && ow > 2 && !/^[\d\s.,:%€h-]+$/.test(o.vi)) w.push(`${where}: dịch phương án "${o.vi}" không có dấu tiếng Việt?`);
    }
    if (!q.why) e.push(`${where}: thiếu giải thích (dòng "> …")`);
    else {
      if (!VI_LETTERS.test(q.why.replace(/«[^»]*»/g, ""))) w.push(`${where}: giải thích nên viết tiếng Việt`);
      const qs = quotesOf(q.why);
      if (!qs.length) e.push(`${where}: giải thích phải trích «nguyên văn» câu trong bài`);
      for (const x of qs) if (!quoteFound(x, own)) e.push(`${where}: trích dẫn không khớp nguyên văn bài: «${x.slice(0, 60)}»`);
    }
    // từ vựng: ≤ cấp bài, hoặc đã có trong bài, tên riêng, thuật ngữ khai gloss:
    const texts = [q.q.fr, ...q.opts.map((o) => o.fr)];
    const p = profile(texts, { names: m.names, level: m.band });
    const over = p.over.filter((o) => !allowed.lemmas.has(o.lemma) && !allowed.tokens.has(o.t.toLowerCase()) && !m.gloss.has(o.lemma) && !m.gloss.has(o.t.toLowerCase()));
    // từ cấp kề (A1 dùng từ A2) chỉ cảnh báo — xem SPEC.over; xa cấp hơn là lỗi
    const farQ = over.filter((o) => o.band >= m.band + 2);
    if (farQ.length) e.push(`${where}: từ vượt cấp ${[...new Set(farQ.map((o) => o.t))].join(" ")}`);
    if (over.length > farQ.length) w.push(`${where}: từ cấp trên (không có trong bài) ${[...new Set(over.filter((o) => !farQ.includes(o)).map((o) => o.t))].join(" ")}`);
    const unk = [...new Set(p.unknown)].filter((t) => !allowed.tokens.has(t.toLowerCase()) && !m.gloss.has(t.toLowerCase()));
    if (unk.length) e.push(`${where}: từ ngoài từ điển / tên chưa khai ${unk.join(" ")}`);
    if (m.band <= 1) {
      const tf = texts.flatMap((t) => tenseFlags(t));
      if (tf.length) e.push(`${where}: ${[...new Set(tf.map((x) => `${x.t} (${x.kind})`))].join(", ")} — chưa hợp ${m.level.toUpperCase()}`);
    }
    // đáp án đúng dài hẳn các phương án sai → đoán được không cần đọc
    const right = q.opts.find((o) => o.ok);
    const wrong = q.opts.filter((o) => !o.ok);
    if (right && wrong.length && right.fr.length >= 1.3 * Math.max(...wrong.map((o) => o.fr.length)) && right.fr.length > 12) stats.longest++;
  });
  return { e, w, stats };
}

/**
 * Kiểm toàn bộ câu hỏi so với thư viện. items = model (loadLibrary), quiz = loadQuizzes().
 * requireLevels = các cấp bắt buộc có câu hỏi. Trả { perItem: Map<id,{e,w}>, libErr, libWarn, coverage: {lv: {r, rAll}} }.
 */
export function checkQuizzes(items, quiz, { requireLevels = [] } = {}) {
  const perItem = new Map();
  const R = (id) => {
    if (!perItem.has(id)) perItem.set(id, { e: [], w: [] });
    return perItem.get(id);
  };
  const libErr = [...quiz.errors];
  const libWarn = [];
  const byId = new Map(items.map((m) => [m.id, m]));
  for (const d of quiz.dupes) libErr.push(`câu hỏi khai 2 lần: ${d.key} (${d.a.file}:${d.a.line} · ${d.b.file}:${d.b.line})`);
  const longest = new Map(); // level → [longest, total]
  for (const [key, b] of quiz.blocks) {
    const m = byId.get(b.id);
    if (!m) {
      libErr.push(`${b.file}:${b.line}: câu hỏi cho bài không tồn tại: ${key}`);
      continue;
    }
    const { e, w, stats } = checkQuizBlock(b, m);
    R(m.id).e.push(...e);
    R(m.id).w.push(...w);
    const s = longest.get(m.level) ?? [0, 0];
    longest.set(m.level, [s[0] + stats.longest, s[1] + stats.questions]);
  }
  const coverage = {};
  for (const m of items) {
    const c = (coverage[m.level] ??= { r: 0, rAll: 0 });
    c.rAll++;
    if (quiz.blocks.has(m.id)) c.r++;
    else if (requireLevels.includes(m.level)) R(m.id).e.push("chưa có câu hỏi đọc hiểu (content/quiz/…)");
  }
  for (const [lv, [a, t]] of longest) if (t >= 40 && a / t > 0.3) libWarn.push(`${lv} câu hỏi: ${a}/${t} câu có đáp án đúng dài hẳn phương án sai (> 30%) — cân lại độ dài phương án`);
  return { perItem, libErr, libWarn, coverage };
}
