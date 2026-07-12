// Validate (ràng buộc từ vựng lũy kế qua lemma-map) + ghép bài đọc ra public/data.
// Vào:  scripts/out/read-out/{cefr}.json  (mảng bài do subagent viết)
// Ra:   public/data/readings/{cefr}.json  +  public/data/readings-index.json
// In: coverage mỗi cấp + các token vi phạm (lemma ngoài phạm vi cấp).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LEVELS, levelSlug, levelFromCefr } from "../lib/levels.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE = join(HERE, "..");
mkdirSync(join(CODE, "public/data/readings"), { recursive: true });

const base = JSON.parse(readFileSync(join(HERE, "out/words-base.json"), "utf8"));
const lemmaMap = JSON.parse(readFileSync(join(CODE, "public/data/lemma-map.json"), "utf8"));
const wordLevel = Object.fromEntries(base.map((w) => [w.id, w.level]));

function normSurface(raw) {
  return raw
    .toLowerCase()
    .replace(/^[^a-zàâäçéèêëîïôöùûüÿœæ'’-]+/u, "")
    .replace(/[^a-zàâäçéèêëîïôöùûüÿœæ'’-]+$/u, "")
    .replace(/’/g, "'");
}
const WORD_RE = /[a-zàâäçéèêëîïôöùûüÿœæ'’-]/i;
const isCap = (tok) => /^[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ]/.test(tok.trim());
const isNum = (tok) => /^\d+$/.test(tok.trim());

function resolveLemma(surface) {
  return lemmaMap[surface] ?? lemmaMap[surface.split("'").pop() || surface] ?? (wordLevel[surface] ? surface : undefined);
}

const index = [];
const stats = [];

for (const { level, cefr } of LEVELS) {
  const path = join(HERE, `out/read-out/${cefr}.json`);
  if (!existsSync(path)) continue;
  const readings = JSON.parse(readFileSync(path, "utf8"));
  let totalTok = 0, ok = 0;
  const violations = new Map(); // token -> count

  const docs = readings.map((r) => {
    for (const s of r.sentences) {
      for (const raw of s.fr.split(/\s+/)) {
        if (!WORD_RE.test(raw)) continue;
        const surface = normSurface(raw);
        if (!surface) continue;
        totalTok++;
        const lemma = resolveLemma(surface);
        if (lemma && wordLevel[lemma] && wordLevel[lemma] <= level) ok++;
        else if (!lemma && (isCap(raw) || isNum(raw))) ok++; // tên riêng / số
        else violations.set(raw, (violations.get(raw) || 0) + 1);
      }
    }
    return { ...r, level };
  });

  writeFileSync(join(CODE, `public/data/readings/${cefr}.json`), JSON.stringify(docs));
  for (const d of docs) index.push({ id: d.id, level, title_fr: d.title_fr, title_vi: d.title_vi, n: d.sentences.length });

  const pct = totalTok ? Math.round((ok / totalTok) * 1000) / 10 : 100;
  const topViol = [...violations.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  stats.push({ cefr, readings: docs.length, coverage: pct, viol: violations.size, topViol });
}

index.sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
writeFileSync(join(CODE, "public/data/readings-index.json"), JSON.stringify(index));

console.log(`Tổng bài đọc: ${index.length}`);
for (const s of stats) {
  console.log(`\n${s.cefr.toUpperCase()}: ${s.readings} bài | coverage lemma ${s.coverage}% | ${s.viol} token vi phạm`);
  if (s.topViol.length) console.log("  vi phạm:", s.topViol.map(([t, c]) => `${t}(${c})`).join(", "));
}
