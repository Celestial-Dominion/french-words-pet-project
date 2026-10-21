// Áp scripts/level-overrides.json (đổi cấp theo FLELex) vào dữ liệu đã dựng, KHÔNG chạy lại cả pipeline:
//   public/data/word-levels.json, scripts/out/words-base.json, scripts/out/lemmas.json (trường level)
//   → build-words-assemble.mjs (words/<cấp>.json + words-index.json) → shard-examples.mjs (examples/<cấp>-n.json).
// Chạy lại nhiều lần vẫn ra cùng kết quả. build-level-assign.mjs cũng đọc file này khi dựng lại từ đầu.
//
// Chạy: node scripts/apply-level-overrides.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE = join(HERE, "..");
const ovr = JSON.parse(readFileSync(join(HERE, "level-overrides.json"), "utf8"));

function patch(path, get, set) {
  const data = JSON.parse(readFileSync(path, "utf8"));
  let n = 0;
  for (const [id, o] of Object.entries(ovr)) {
    const cur = get(data, id);
    if (cur === undefined) continue;
    if (cur !== o.to) { set(data, id, o.to); n++; }
  }
  writeFileSync(path, JSON.stringify(data));
  return n;
}

const levelsPath = join(CODE, "public/data/word-levels.json");
const nLv = patch(levelsPath, (d, id) => d[id], (d, id, v) => { d[id] = v; });
const byId = (arr) => new Map(arr.map((w) => [w.id, w]));
let baseMap, lemMap;
const nBase = patch(join(HERE, "out/words-base.json"), (d, id) => (baseMap ??= byId(d)).get(id)?.level, (_d, id, v) => { baseMap.get(id).level = v; });
const nLem = patch(join(HERE, "out/lemmas.json"), (d, id) => (lemMap ??= byId(d)).get(id)?.level, (_d, id, v) => { lemMap.get(id).level = v; });
console.log(`đổi cấp: word-levels ${nLv} · words-base ${nBase} · lemmas ${nLem} (danh sách ${Object.keys(ovr).length})`);

for (const s of ["build-words-assemble.mjs", "shard-examples.mjs"]) {
  process.stdout.write(execFileSync(process.execPath, ["--no-warnings", join(HERE, s)], { encoding: "utf8" }));
}
