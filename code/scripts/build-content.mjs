// Dựng bài đọc + truyện từ nguồn content/ → dữ liệu tĩnh cho app (port app Anh, docs/CONTENT_PLAYBOOK.md).
//   node scripts/build-content.mjs [--draft]
// Ra:
//   public/data/readings/{id}.json      chữ từng bài (FR + VI, đoạn, nguồn) — trang bài chỉ tải file của bài đó
//   public/data/readings-index.json     chỉ mục nhẹ (tiêu đề, chủ đề, thể loại, số chữ, phút đọc)
//   public/data/stories/{id}.json       từng truyện: chương [{title_fr, title_vi, sentences, paras}], nguồn
//                                       (chỉ ghi file có nội dung đổi; xoá file bài không còn trong content/ — lib/library-files.ts)
//   public/data/stories-index.json      chỉ mục truyện (số chương, chủ đề, tóm tắt, số chữ, phút đọc, phần n/m)
//   series: <id> <thứ tự> (nguồn)       chuỗi: bài đọc theo cấp · các phần của một truyện dài → {series} trong file bài
//                                       (thứ tự, tổng, bài trước/sau); file nguồn kể lại thêm src: 1 vào chỉ mục
//   public/data/quiz/{id}.json          câu hỏi đọc hiểu — tải lười khi mở bài (xoá file của bài không còn câu hỏi);
//                                       bài đọc: [câu hỏi]; truyện: [[câu hỏi chương 1], [chương 2], …]
//   public/data/word-refs/{0..15}.json  chỉ mục từ → bài ("Gặp lại trong ngữ cảnh", gợi ý sau phiên — lib/suggest.ts),
//                                       dựng lại từ dữ liệu vừa ghi bằng scripts/build-word-refs.mjs (luôn cả kho, kể cả ONLY)
//   scripts/out/audio-readings.json     câu bài đọc + câu hỏi/phương án CHƯA có MP3 (public/audio/sentences/hashLong(fr).mp3)
//                                       cho build-audio.py
// Chạy check-content trước; còn lỗi thì dừng (--draft: chưa bắt buộc câu hỏi).
//
// ONLY=c1[,c2] — dựng riêng các cấp này (hai phiên viết song song nhiều cấp): chỉ lỗi của cấp đó chặn; chỉ ghi / dọn
// {readings,stories}/{id}.json + quiz của cấp đó; trong *-index.json chỉ thay mục của cấp đó (giữ cấp khác như
// đang có); audio thiếu của cấp đó → scripts/out/audio-only-{cấp}.json (không đụng audio-readings.json).
import { writeFileSync, mkdirSync, readdirSync, existsSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runChecks } from "./check-content.mjs";
import { ROOT, profileOf } from "./lib/content-model.mjs";
import { minutesOf } from "./lib/content-spec.mjs";
import { LEVEL_KEYS } from "./lib/fr-vocab.mjs";
import { hashLong } from "../lib/slug.ts";
import { buildWordRefs } from "./build-word-refs.mjs";
import { levelOfId, staleLibraryFiles } from "../lib/library-files.ts";

const DRAFT = process.argv.includes("--draft");
const DATA = join(ROOT, "public", "data");
const ONLY = (process.env.ONLY ?? "").split(",").filter(Boolean);
for (const k of ONLY) if (!LEVEL_KEYS.includes(k)) throw new Error(`ONLY: cấp lạ "${k}" (${LEVEL_KEYS.join(",")})`);
const all = runChecks({ draft: DRAFT });
const { report, libErr, quiz } = all;
const lvOf = new Map(all.items.map((m) => [m.id, m.level]));
const inScope = (lv) => !ONLY.length || ONLY.includes(lv);
const idInScope = (id) => inScope(lvOf.get(id.split("#")[0]) ?? levelOfId(id));
const items = all.items.filter((m) => inScope(m.level));
const quizBlocks = [...quiz.blocks].filter(([k]) => idInScope(k));

const errs = libErr.filter((e) => !ONLY.length || ONLY.some((lv) => new RegExp(`(?:^|[-/ ])${lv}[-/]`).test(e)));
for (const [id, r] of report) if (idInScope(id)) for (const e of r.e) errs.push(`${id}: ${e}`);
if (errs.length) {
  console.log(errs.slice(0, 40).join("\n"));
  console.log(`\n✗ ${errs.length} lỗi — sửa rồi chạy lại (xem: node scripts/check-content.mjs --errors)`);
  process.exit(1);
}

const levelNum = (k) => LEVEL_KEYS.indexOf(k) + 1;
const index = [];
const byLevel = new Map(LEVEL_KEYS.map((k) => [k, []])); // id bài đọc theo cấp (đếm cho log)
const sIndex = [];
const storiesByLevel = new Map(LEVEL_KEYS.map((k) => [k, []]));
const quizIds = new Set();
const wrote = { readings: new Set(), stories: new Set() };
let docsChanged = 0;
// Ghi chữ một bài; file đã đúng nội dung thì để nguyên (giữ mtime — deploy khỏi băm lại, git không thấy đổi).
const writeDoc = (dir, doc) => {
  const p = join(DATA, dir, `${doc.id}.json`);
  const txt = JSON.stringify(doc);
  wrote[dir].add(doc.id);
  if (existsSync(p) && readFileSync(p, "utf8") === txt) return;
  writeFileSync(p, txt);
  docsChanged++;
};
mkdirSync(join(DATA, "readings"), { recursive: true });
mkdirSync(join(DATA, "stories"), { recursive: true });
mkdirSync(join(DATA, "quiz"), { recursive: true });

const quizJson = (b) =>
  b.questions.map((q) => ({
    q: { fr: q.q.fr, vi: q.q.vi },
    opts: q.opts.map((o) => ({ fr: o.fr, vi: o.vi })),
    a: q.opts.findIndex((o) => o.ok),
    why: q.why,
  }));
// chuỗi (series): bậc bài đọc theo cấp · các phần của một truyện dài. Lấy từ cả kho (kể cả ONLY) để liên kết
// bậc ở cấp khác vẫn đúng.
const seriesMap = (type) => {
  const out = new Map();
  for (const m of all.items) if (m.type === type && m.series) (out.get(m.series.id) ?? out.set(m.series.id, []).get(m.series.id)).push(m);
  for (const l of out.values()) l.sort((a, b) => a.series.order - b.series.order);
  return out;
};
const seriesOf = { reading: seriesMap("reading"), story: seriesMap("story") };
const seriesLink = (m) => ({ id: m.id, level: levelNum(m.level), title_fr: m.title.fr, title_vi: m.title.vi });
/** {series} cho file bài: thứ tự n/tổng + bài trước/sau; null nếu không thuộc chuỗi. */
const seriesPos = (m) => {
  const s = m.series ? seriesOf[m.type].get(m.series.id) : null;
  if (!s) return null;
  const k = s.indexOf(m);
  return { id: m.series.id, order: k + 1, count: s.length, ...(s[k - 1] ? { prev: seriesLink(s[k - 1]) } : {}), ...(s[k + 1] ? { next: seriesLink(s[k + 1]) } : {}) };
};
const sourceJson = (m) => (m.source ? { source: { title: m.source.title, credit: m.source.credit, license: m.source.license, url: m.source.url } } : {});

for (const m of items.filter((x) => x.type === "story")) {
  const level = levelNum(m.level);
  const qs = m.chapters.map((_, k) => quiz.blocks.get(`${m.id}#${k + 1}`));
  const sp = seriesPos(m);
  storiesByLevel.get(m.level).push(m.id);
  writeDoc("stories", {
    id: m.id,
    level,
    title_fr: m.title.fr,
    title_vi: m.title.vi,
    chapters: m.chapters.map((c) => ({
      ...(c.title.fr ? { title_fr: c.title.fr } : {}),
      title_vi: c.title.vi,
      sentences: c.sentences.map((s) => ({ fr: s.fr, vi: s.vi })),
      ...(c.paras.length > 1 ? { paras: c.paras } : {}),
    })),
    ...sourceJson(m),
    ...(qs.some(Boolean) ? { quiz: qs.reduce((n, b) => n + (b?.questions.length ?? 0), 0) } : {}),
    ...(sp ? { series: sp } : {}),
  });
  if (qs.some(Boolean)) {
    quizIds.add(m.id);
    writeFileSync(join(DATA, "quiz", `${m.id}.json`), JSON.stringify(qs.map((b) => (b ? quizJson(b) : []))));
  }
  const words = profileOf(m).nWords;
  sIndex.push({
    id: m.id,
    level,
    title_fr: m.title.fr,
    title_vi: m.title.vi,
    chapters: m.chapters.length,
    topic: m.topic,
    summary: m.summary,
    words,
    min: minutesOf(words, m.level),
    ...(sp ? { series: sp.id, part: sp.order, parts: sp.count } : {}),
    ...(m.source ? { src: 1 } : {}),
  });
}

for (const m of items.filter((x) => x.type === "reading")) {
  const level = levelNum(m.level);
  const qb = quiz.blocks.get(m.id);
  const doc = {
    id: m.id,
    level,
    title_fr: m.title.fr,
    title_vi: m.title.vi,
    sentences: m.sentences.map((s) => ({ fr: s.fr, vi: s.vi })),
    ...(m.paras.length > 1 ? { paras: m.paras } : {}),
    ...sourceJson(m),
    ...(qb ? { quiz: qb.questions.length } : {}),
    ...(seriesPos(m) ? { series: seriesPos(m) } : {}),
  };
  byLevel.get(m.level).push(m.id);
  writeDoc("readings", doc);
  if (qb) {
    quizIds.add(m.id);
    writeFileSync(join(DATA, "quiz", `${m.id}.json`), JSON.stringify(quizJson(qb)));
  }
  const words = profileOf(m).nWords;
  index.push({
    id: m.id,
    level,
    title_fr: m.title.fr,
    title_vi: m.title.vi,
    n: m.sentences.length,
    topic: m.topic,
    genre: m.genre,
    words,
    min: minutesOf(words, m.level),
    ...(m.series ? { series: m.series.id } : {}),
    ...(m.source ? { src: 1 } : {}),
  });
}

// ONLY: giữ nguyên mục của cấp khác trong chỉ mục đang có, chỉ thay mục của cấp đang dựng
const keepOthers = (name, fresh) => {
  if (!ONLY.length) return fresh;
  const p = join(DATA, name);
  const old = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : [];
  return [...old.filter((x) => !inScope(LEVEL_KEYS[x.level - 1])), ...fresh];
};
// file bài không còn trong content/ (của cấp đang dựng) + file cũ theo cấp ({cấp}.json, trước 20/10/2026)
let docsPruned = 0;
for (const dir of ["readings", "stories"])
  for (const f of staleLibraryFiles(readdirSync(join(DATA, dir)), wrote[dir], idInScope)) {
    rmSync(join(DATA, dir, f));
    docsPruned++;
  }
const rIndex = keepOthers("readings-index.json", index).sort((a, b) => a.level - b.level); // giữ thứ tự viết trong cấp (sort ổn định)
writeFileSync(join(DATA, "readings-index.json"), JSON.stringify(rIndex));
const stIndex = keepOthers("stories-index.json", sIndex).sort((a, b) => a.level - b.level);
writeFileSync(join(DATA, "stories-index.json"), JSON.stringify(stIndex));
buildWordRefs({ items: all.items });
let pruned = 0;
for (const f of readdirSync(join(DATA, "quiz"))) {
  const id = f.replace(/\.json$/, "");
  if (!quizIds.has(id) && idInScope(id)) {
    rmSync(join(DATA, "quiz", f));
    pruned++;
  }
}

// audio từng câu còn thiếu: câu bài đọc, rồi câu hỏi + phương án (nút loa trong components/quiz.tsx)
const AUDIO = join(ROOT, "public", "audio", "sentences");
const seen = new Set();
const todo = [];
let nQuizAudio = 0;
const need = (fr, isQuiz) => {
  const file = `${hashLong(fr)}.mp3`;
  if (seen.has(file)) return;
  seen.add(file);
  if (isQuiz) nQuizAudio++;
  if (!existsSync(join(AUDIO, file))) todo.push({ text: fr, file });
};
for (const m of items) for (const s of m.sentences) need(s.fr, false);
for (const [, b] of quizBlocks) for (const q of b.questions) for (const fr of [q.q.fr, ...q.opts.map((o) => o.fr)]) need(fr, true);
mkdirSync(join(ROOT, "scripts", "out"), { recursive: true });
const audioOut = ONLY.length ? `audio-only-${ONLY.join("-")}.json` : "audio-readings.json";
writeFileSync(join(ROOT, "scripts", "out", audioOut), JSON.stringify(todo));

const per = (map) => LEVEL_KEYS.map((k) => `${k.toUpperCase()} ${map.get(k).length}`).join(" · ");
if (ONLY.length) console.log(`ONLY=${ONLY.join(",")}: chỉ dựng cấp này, cấp khác giữ nguyên`);
console.log(`bài đọc: ${index.length} (${per(byLevel)}) · truyện: ${sIndex.length} (${per(storiesByLevel)}) · câu hỏi: ${quizIds.size} bài/truyện${pruned ? ` · xoá ${pruned} file câu hỏi cũ` : ""}`);
console.log(`file từng bài: ${docsChanged} ghi mới/đổi${docsPruned ? ` · xoá ${docsPruned} file bài cũ` : ""}`);
console.log(`audio câu hỏi + phương án: ${nQuizAudio} câu (không tính câu trùng)`);
console.log(`audio thiếu: ${todo.length} câu → scripts/out/${audioOut}${todo.length ? `\n  chạy: cd scripts && CONC=48 <venv edge-tts ≥7.3.1>/bin/python build-audio.py out/${audioOut} ../public/audio/sentences` : ""}`);
