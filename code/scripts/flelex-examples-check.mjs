// Câu ví dụ của các từ bị KÉO XUỐNG cấp (scripts/level-overrides.json): câu viết cho cấp cũ có thể quá khó với cấp mới.
// Mỗi từ: số câu "vừa sức" (mọi từ khác ≤ cấp mới + 1, tối đa 1 từ vượt hơn) trên 5 câu. Từ có < MIN câu vừa sức được in ra
// kèm các câu và từ khó, để viết lại (ex5/fix.txt hoặc ex5/out, xem memory examples-5-progress).
//
// Chạy: node scripts/flelex-examples-check.mjs [--min 2] [--json out.json]

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeSentence } from "./lib/fr-vocab.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NAME = ["A1", "A2", "B1", "B2", "C1", "C2"];
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : undefined);
const MIN = Number(arg("--min")) || 2;
const ovr = JSON.parse(readFileSync(join(HERE, "level-overrides.json"), "utf8"));
const ex = JSON.parse(readFileSync(join(HERE, "out/examples.json"), "utf8"));

const rows = [];
for (const [id, o] of Object.entries(ovr)) {
  if (o.to >= o.from || !ex[id]) continue;
  const band = o.to - 1;
  const sents = ex[id].map((s, i) => {
    const hard = analyzeSentence(s.fr).filter((w) => w.band > band + 1 && !w.lemmas?.includes(id)).map((w) => `${w.t}(${NAME[w.band] ?? "?"})`);
    return { i, fr: s.fr, vi: s.vi, t: s.t, hard, ok: hard.length <= 1 };
  });
  rows.push({ id, from: NAME[o.from - 1], to: NAME[band], ok: sents.filter((s) => s.ok).length, sents });
}
const bad = rows.filter((r) => r.ok < MIN).sort((a, b) => a.ok - b.ok);
const hist = [0, 0, 0, 0, 0, 0];
for (const r of rows) hist[r.ok]++;
console.log(`${rows.length} từ kéo xuống · số câu vừa sức/5: ${hist.map((n, k) => `${k}:${n}`).join(" ")} · cần sửa (< ${MIN}): ${bad.length}`);
for (const r of bad) {
  console.log(`\n## ${r.id} ${r.from}→${r.to} (vừa sức ${r.ok}/5)`);
  for (const s of r.sents) console.log(`${s.i}${s.ok ? " ✓" : " ✗"} ${s.fr}${s.hard.length ? `  [${s.hard.join(" ")}]` : ""}`);
}
if (arg("--json")) writeFileSync(arg("--json"), JSON.stringify(bad, null, 1));
