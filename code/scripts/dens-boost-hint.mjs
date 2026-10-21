// Gợi ý nâng "tỉ lệ từ đúng cấp" cho bài bị cảnh báo sau khi đổi cấp từ (level-overrides.json).
// Mỗi bài: số từ, % đúng cấp, số từ đúng cấp còn THIẾU để qua ngưỡng, và các dòng (file:dòng) chứa từ đã bị
// kéo xuống cấp (nguyên nhân tụt) — viết lại đúng các dòng đó bằng từ đúng cấp.
//
// Chạy: node scripts/dens-boost-hint.mjs <cấp> <reading|story> [--max 6] [--full]

import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeSentence } from "./lib/fr-vocab.mjs";
import { loadLibrary, profileOf } from "./lib/content-model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE = join(HERE, "..");
const [lv, type] = process.argv.slice(2);
const maxLines = Number(process.argv[process.argv.indexOf("--max") + 1]) || 6;
const full = process.argv.includes("--full"); // in cả dòng FR | VI
const band = ["a1", "a2", "b1", "b2", "c1", "c2"].indexOf(lv);
// ngưỡng thật (bộ kiểm hiển thị làm tròn)
const MIN = { 2: 0.05, 3: 0.05, 4: 0.045, 5: 0.035 }[band] ?? 0.05;
const ovr = JSON.parse(readFileSync(join(HERE, "level-overrides.json"), "utf8"));
const moved = new Set(Object.entries(ovr).filter(([, o]) => o.to < o.from).map(([id]) => id));

let out = "";
try {
  out = execFileSync(process.execPath, ["--no-warnings", join(HERE, "check-content.mjs"), "--level", lv, "--type", type], { encoding: "utf8", maxBuffer: 1 << 26 });
} catch (e) {
  out = e.stdout ?? "";
}
const ids = [];
let cur = null;
for (const line of out.split("\n")) {
  const m = /^ {2}(\S+)$/.exec(line);
  if (m) cur = m[1];
  if (cur && line.includes("tỉ lệ từ đúng cấp")) ids.push(cur);
}

// tính % như bộ kiểm (names:, gloss: của bài)
const byId = new Map(loadLibrary().items.map((m) => [m.id, m]));
const dir = join(CODE, "content", type === "story" ? "stories" : "readings", lv);
for (const f of readdirSync(dir).filter((x) => x.endsWith(".txt"))) {
  const L = readFileSync(join(dir, f), "utf8").split("\n");
  let id = null;
  const body = new Map();
  for (let i = 0; i < L.length; i++) {
    const m = /^=== (\S+)/.exec(L[i]);
    if (m) { id = m[1]; continue; }
    if (!ids.includes(id)) continue;
    if (/^[a-z-]+:/.test(L[i]) || L[i].startsWith("#") || !L[i].includes("|")) continue;
    (body.get(id) ?? body.set(id, []).get(id)).push([i + 1, L[i].split("|")[0].trim(), L[i]]);
  }
  for (const [tid, lines] of body) {
    const p = profileOf(byId.get(tid));
    const ok = p.bands[band];
    const need = Math.max(0, Math.ceil(MIN * p.nScored - ok) + 1);
    const hits = lines.filter(([, fr]) => analyzeSentence(fr).some((w) => w.lemmas?.some((l) => moved.has(l))));
    console.log(`\n## ${tid} (${f}) ${p.nScored} từ · đúng cấp ${(100 * ok / p.nScored).toFixed(2)}% · thiếu ~${need} từ`);
    for (const [n, fr, raw] of hits.slice(0, maxLines)) console.log(`${n}: ${full ? raw : fr}`);
  }
}
