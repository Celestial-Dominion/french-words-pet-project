// Sinh manifest audio cho bài phát âm từ public/data/phonics.json.
// Ra: scripts/out/audio-phonics.json ([{text, file}]) — file = hashLong(say).mp3.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hashLong } from "../lib/slug.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(HERE, "../public/data/phonics.json"), "utf8"));

const seen = new Set();
const items = [];
for (const lesson of data.lessons) {
  for (const it of lesson.items) {
    const file = `${hashLong(it.say)}.mp3`;
    if (seen.has(file)) continue;
    seen.add(file);
    items.push({ text: it.say, file });
  }
}
writeFileSync(join(HERE, "out/audio-phonics.json"), JSON.stringify(items));
console.log(`audio-phonics: ${items.length} mục từ ${data.lessons.length} bài`);
