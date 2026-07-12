// Sinh manifest audio (text → tên file) cho từ và câu, dùng chung lib/tts.ts để khớp frontend.
//   node build-audio-manifest.mjs [cefr...]   (mặc định: tất cả cấp có trong words-base)
// Ra: scripts/out/audio-words.json, scripts/out/audio-sentences.json  ([{text,file}], đã khử trùng)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { levelSlug } from "../lib/levels.ts";
import { audioName, hashLong } from "../lib/slug.ts";

// Cùng logic với lib/tts.ts (import thẳng .ts từ node gặp vấn đề đuôi file nên inline lại phần nhỏ này).
const wordSpoken = (w) =>
  w.pos.includes("n") && w.gender ? `${w.gender === "m" ? "un" : "une"} ${w.id}` : w.id;
const wordAudioFile = (w) => `${audioName(wordSpoken(w))}.mp3`;
const sentenceAudioFile = (fr) => `${hashLong(fr)}.mp3`;

const HERE = dirname(fileURLToPath(import.meta.url));
const sel = process.argv.slice(2).map((s) => s.toLowerCase());
const wantLevel = (lv) => sel.length === 0 || sel.includes(levelSlug(lv));

const base = JSON.parse(readFileSync(join(HERE, "out/words-base.json"), "utf8"));
const examples = existsSync(join(HERE, "out/examples.json"))
  ? JSON.parse(readFileSync(join(HERE, "out/examples.json"), "utf8"))
  : {};

const words = [];
const sentences = [];
const seenW = new Set();
const seenS = new Set();

for (const w of base) {
  if (!wantLevel(w.level)) continue;
  const wf = wordAudioFile(w);
  if (!seenW.has(wf)) {
    seenW.add(wf);
    words.push({ text: wordSpoken(w), file: wf });
  }
  for (const ex of examples[w.id] || []) {
    const sf = sentenceAudioFile(ex.fr);
    if (!seenS.has(sf)) {
      seenS.add(sf);
      sentences.push({ text: ex.fr, file: sf });
    }
  }
}

writeFileSync(join(HERE, "out/audio-words.json"), JSON.stringify(words));
writeFileSync(join(HERE, "out/audio-sentences.json"), JSON.stringify(sentences));
console.log(`Cấp: ${sel.length ? sel.join(",") : "TẤT CẢ"}`);
console.log(`audio-words: ${words.length} từ | audio-sentences: ${sentences.length} câu`);
