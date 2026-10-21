// So cấp độ 11.000 từ của app (public/data/word-levels.json, gán theo tần suất Lexique)
// với FLELex-Beacco (scripts/flelex/FleLex_TT_Beacco.tsv, CC BY-NC-SA 4.0 — Pintard & François 2020).
//
// Chạy: node scripts/flelex-compare.mjs [--list N]
// Ra:   scripts/out/flelex-compare.json  ({ id, app, fl, tag, pos, freq, flTotal, fq = tần suất A1…C2 } cho từng từ có trong FLELex)
//       + in bảng chéo cấp app × cấp FLELex, tỉ lệ khớp, mẫu chênh lớn.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE = join(HERE, "..");
const LV = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
const NAME = ["", "A1", "A2", "B1", "B2", "C1", "C2"];
const listN = Number(process.argv[process.argv.indexOf("--list") + 1]) || 25;

// pos của app (lib/pos.ts) → nhãn TreeTagger của FLELex
const TAG = { n: "NOM", v: "VER", vaux: "VER", adj: "ADJ", adv: "ADV", pron: "PRO", prep: "PRP", conj: "KON", det: "DET", art: "DET", onom: "INT", num: "NUM" };

// so với cấp GỐC theo tần suất: từ đã đổi cấp (level-overrides.json) lấy lại cấp cũ `from`
const levels = JSON.parse(readFileSync(join(CODE, "public/data/word-levels.json"), "utf8"));
const OVR = join(HERE, "level-overrides.json");
if (existsSync(OVR)) for (const [id, o] of Object.entries(JSON.parse(readFileSync(OVR, "utf8")))) if (id in levels) levels[id] = o.from;
const lemmas = JSON.parse(readFileSync(join(HERE, "out/lemmas.json"), "utf8"));
const meta = new Map(lemmas.map((l) => [l.id, l]));

/** word(lower) → [{ tag, level, total }] */
const fl = new Map();
const rows = readFileSync(join(HERE, "flelex/FleLex_TT_Beacco.tsv"), "utf8").replace(/\r/g, "").split("\n");
const head = rows[0].split("\t");
const c = Object.fromEntries(head.map((h, i) => [h, i]));
for (const line of rows.slice(1)) {
  if (!line) continue;
  const f = line.split("\t");
  const w = f[c.word].toLowerCase();
  const level = LV[f[c.level]];
  if (!level) continue;
  const fq = ["A1", "A2", "B1", "B2", "C1", "C2"].map((x) => parseFloat(f[c[`freq_${x}`]]) || 0);
  (fl.get(w) ?? fl.set(w, []).get(w)).push({ tag: f[c.tag], level, total: parseFloat(f[c.freq_total]) || 0, fq });
}

const out = [];
const missing = [0, 0, 0, 0, 0, 0, 0];
const appCount = [0, 0, 0, 0, 0, 0, 0];
const grid = Array.from({ length: 7 }, () => Array(7).fill(0));
for (const [id, app] of Object.entries(levels)) {
  appCount[app]++;
  const cands = fl.get(id.toLowerCase());
  if (!cands) { missing[app]++; continue; }
  const m = meta.get(id);
  const pos = m?.pos?.[0];
  const want = TAG[pos];
  // ưu tiên dòng cùng từ loại chính; không có thì dòng tần suất cao nhất
  const same = cands.filter((r) => want && r.tag.startsWith(want));
  const pick = (same.length ? same : cands).reduce((a, b) => (b.total > a.total ? b : a));
  grid[app][pick.level]++;
  out.push({ id, app, fl: pick.level, tag: pick.tag, pos, freq: m?.frequency ?? 0, flTotal: pick.total, fq: pick.fq });
}
writeFileSync(join(HERE, "out/flelex-compare.json"), JSON.stringify(out));

const n = out.length;
const exact = out.filter((r) => r.app === r.fl).length;
const near = out.filter((r) => Math.abs(r.app - r.fl) <= 1).length;
console.log(`Từ app: ${Object.keys(levels).length} · có trong FLELex: ${n} (${((100 * n) / Object.keys(levels).length).toFixed(1)}%)`);
console.log(`Khớp đúng cấp: ${exact} (${((100 * exact) / n).toFixed(1)}%) · lệch ≤1 cấp: ${near} (${((100 * near) / n).toFixed(1)}%)`);
console.log("\nBảng chéo (hàng = cấp app, cột = cấp FLELex, cột cuối = không có trong FLELex):");
console.log("      " + NAME.slice(1).map((x) => x.padStart(6)).join("") + "  thiếu   tổng");
for (let a = 1; a <= 6; a++) {
  console.log(NAME[a].padEnd(6) + grid[a].slice(1).map((x) => String(x).padStart(6)).join("") + String(missing[a]).padStart(7) + String(appCount[a]).padStart(7));
}
const fmt = (r) => `${r.id}(${NAME[r.app]}→${NAME[r.fl]})`;
const high = out.filter((r) => r.app - r.fl >= 3).sort((a, b) => b.app - b.fl - (a.app - a.fl) || b.flTotal - a.flTotal);
const low = out.filter((r) => r.fl - r.app >= 3).sort((a, b) => b.fl - b.app - (a.fl - a.app) || b.freq - a.freq);
console.log(`\nApp cao hơn FLELex ≥3 cấp: ${high.length} — ${high.slice(0, listN).map(fmt).join(", ")}`);
console.log(`\nApp thấp hơn FLELex ≥3 cấp: ${low.length} — ${low.slice(0, listN).map(fmt).join(", ")}`);
