// Dựng bài đọc + truyện từ nguồn content/ → dữ liệu tĩnh cho app (port app Anh, docs/CONTENT_PLAYBOOK.md).
//   node scripts/build-content.mjs [--draft]
// Ra:
//   public/data/readings/{cấp}.json     chữ bài (FR + VI, đoạn, nguồn) — suggest.ts / "gặp lại trong ngữ cảnh" đọc cả cấp
//   public/data/readings-index.json     chỉ mục nhẹ (tiêu đề, chủ đề, thể loại, số chữ, phút đọc)
//   public/data/stories/{cấp}.json      truyện: chương [{title_fr, title_vi, sentences, paras}], nguồn
//   public/data/stories-index.json      chỉ mục truyện (số chương, chủ đề, tóm tắt, số chữ, phút đọc)
//   public/data/quiz/{id}.json          câu hỏi đọc hiểu — tải lười khi mở bài (xoá file của bài không còn câu hỏi);
//                                       bài đọc: [câu hỏi]; truyện: [[câu hỏi chương 1], [chương 2], …]
//   scripts/out/audio-readings.json     câu bài đọc + câu hỏi/phương án CHƯA có MP3 (public/audio/sentences/hashLong(fr).mp3)
//                                       cho build-audio.py
// Chạy check-content trước; còn lỗi thì dừng (--draft: chưa bắt buộc câu hỏi).
import { writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { runChecks } from "./check-content.mjs";
import { ROOT, profileOf } from "./lib/content-model.mjs";
import { minutesOf } from "./lib/content-spec.mjs";
import { LEVEL_KEYS } from "./lib/fr-vocab.mjs";
import { hashLong } from "../lib/slug.ts";

const DRAFT = process.argv.includes("--draft");
const DATA = join(ROOT, "public", "data");
const { items, report, libErr, quiz } = runChecks({ draft: DRAFT });

const errs = [...libErr];
for (const [id, r] of report) for (const e of r.e) errs.push(`${id}: ${e}`);
if (errs.length) {
  console.log(errs.slice(0, 40).join("\n"));
  console.log(`\n✗ ${errs.length} lỗi — sửa rồi chạy lại (xem: node scripts/check-content.mjs --errors)`);
  process.exit(1);
}

const levelNum = (k) => LEVEL_KEYS.indexOf(k) + 1;
const index = [];
const byLevel = new Map(LEVEL_KEYS.map((k) => [k, []]));
const sIndex = [];
const storiesByLevel = new Map(LEVEL_KEYS.map((k) => [k, []]));
const quizIds = new Set();
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
const sourceJson = (m) => (m.source ? { source: { title: m.source.title, credit: m.source.credit, license: m.source.license, url: m.source.url } } : {});

for (const m of items.filter((x) => x.type === "story")) {
  const level = levelNum(m.level);
  const qs = m.chapters.map((_, k) => quiz.blocks.get(`${m.id}#${k + 1}`));
  storiesByLevel.get(m.level).push({
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
    ...(m.series ? { series: m.series } : {}),
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
  };
  byLevel.get(m.level).push(doc);
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
    ...(m.series ? { series: m.series } : {}),
  });
}

for (const [lv, docs] of byLevel) {
  const p = join(DATA, "readings", `${lv}.json`);
  if (docs.length) writeFileSync(p, JSON.stringify(docs));
  else if (existsSync(p)) rmSync(p);
}
index.sort((a, b) => a.level - b.level); // giữ thứ tự viết trong cấp (sort ổn định)
writeFileSync(join(DATA, "readings-index.json"), JSON.stringify(index));
for (const [lv, docs] of storiesByLevel) {
  const p = join(DATA, "stories", `${lv}.json`);
  if (docs.length) writeFileSync(p, JSON.stringify(docs));
  else if (existsSync(p)) rmSync(p);
}
sIndex.sort((a, b) => a.level - b.level);
writeFileSync(join(DATA, "stories-index.json"), JSON.stringify(sIndex));
let pruned = 0;
for (const f of readdirSync(join(DATA, "quiz")))
  if (!quizIds.has(f.replace(/\.json$/, ""))) {
    rmSync(join(DATA, "quiz", f));
    pruned++;
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
for (const b of quiz.blocks.values()) for (const q of b.questions) for (const fr of [q.q.fr, ...q.opts.map((o) => o.fr)]) need(fr, true);
mkdirSync(join(ROOT, "scripts", "out"), { recursive: true });
writeFileSync(join(ROOT, "scripts", "out", "audio-readings.json"), JSON.stringify(todo));

const per = (map) => LEVEL_KEYS.map((k) => `${k.toUpperCase()} ${map.get(k).length}`).join(" · ");
console.log(`bài đọc: ${index.length} (${per(byLevel)}) · truyện: ${sIndex.length} (${per(storiesByLevel)}) · câu hỏi: ${quizIds.size} bài/truyện${pruned ? ` · xoá ${pruned} file câu hỏi cũ` : ""}`);
console.log(`audio câu hỏi + phương án: ${nQuizAudio} câu (không tính câu trùng)`);
console.log(`audio thiếu: ${todo.length} câu → scripts/out/audio-readings.json${todo.length ? "\n  chạy: cd scripts && CONC=48 ~/code/english_words/code/scripts/.venv-tts/bin/python build-audio.py out/audio-readings.json ../public/audio/sentences" : ""}`);
