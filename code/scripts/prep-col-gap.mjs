// Lô bù cho "Cụm hay đi kèm": từ nội dung (danh/động/tính/trạng từ) cấp A1–B1 mà RL-fr không phủ
// (sau khi build-collocations.mjs đã chạy với các lô RL-fr). Ghi out/col-in/NN.txt tiếp số thứ tự, 120 từ/lô,
// mỗi dòng: id|loại từ(.giống)|nghĩa — cụm + nghĩa viết tay vào out/col-out/NN.json cùng định dạng.
//   node prep-col-gap.mjs
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const HERE = import.meta.dirname;
const CONTENT = new Set(["n", "v", "adj", "adv"]);
const ws = [];
for (const lv of ["a1", "a2", "b1"])
  for (const w of JSON.parse(readFileSync(join(HERE, "../public/data/words", `${lv}.json`), "utf8")))
    if (!w.collocations && CONTENT.has(w.pos[0])) ws.push(w); // loại từ chính (bỏ je|pron/n…)
ws.sort((a, b) => a.level - b.level || b.frequency - a.frequency);
const dir = join(HERE, "out/col-in");
let n = Math.max(...readdirSync(dir).map((f) => parseInt(f, 10)).filter((x) => !isNaN(x))) + 1;
const B = 120;
for (let i = 0; i < ws.length; i += B, n++)
  writeFileSync(
    join(dir, `${String(n).padStart(2, "0")}.txt`),
    ws
      .slice(i, i + B)
      .map((w) => `${w.id}|${w.pos.join("/")}${w.gender ? "." + w.gender : ""}|${w.meaning_vi.slice(0, 60)}`)
      .join("\n") + "\n",
  );
console.log(`${ws.length} từ → lô đến ${n - 1}`);
