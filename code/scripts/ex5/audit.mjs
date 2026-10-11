// Rà soát câu ví dụ hiện có (scripts/out/examples.json): từ đích có trong câu không, từ vượt cấp, trùng câu, độ dài, dịch.
//   node scripts/ex5/audit.mjs [cefr]   → in thống kê + ghi scripts/out/ex5/audit-{cefr}.json (các câu bị gắn cờ)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { OUT, words, targetIn, overLevel, tokens, LEN, levelSlug } from "./lib.mjs";

const only = process.argv[2];
const ex = JSON.parse(readFileSync(join(OUT, "examples.json"), "utf8"));
mkdirSync(join(OUT, "ex5"), { recursive: true });
const seen = new Map();
for (const [id, list] of Object.entries(ex)) for (const s of list) seen.set(s.fr, [...(seen.get(s.fr) ?? []), id]);

for (let lv = 1; lv <= 6; lv++) {
  const slug = levelSlug(lv);
  if (only && only !== slug) continue;
  const stat = { words: 0, sents: 0, noTarget: 0, notExact: 0, over: 0, dup: 0, len: 0, vi: 0 };
  const flagged = [];
  for (const w of words.values()) {
    if (w.level !== lv) continue;
    stat.words++;
    for (const s of ex[w.id] ?? []) {
      stat.sents++;
      const f = [];
      const t = targetIn(s.fr, w.id);
      if (!t.form) (stat.noTarget++, f.push("thiếu từ"));
      else if (!t.exact) stat.notExact++;
      const o = overLevel(s.fr, Math.min(6, lv + 1));
      if (o.length > 1) (stat.over++, f.push("vượt cấp:" + o.join(",")));
      if ((seen.get(s.fr) ?? []).length > 1) (stat.dup++, f.push("trùng:" + seen.get(s.fr).join(",")));
      const n = tokens(s.fr).length;
      if (n < LEN[lv][0] - 1 || n > LEN[lv][1] + 4) (stat.len++, f.push("độ dài:" + n));
      if (!s.vi || s.vi.trim() === s.fr.trim() || /[a-z]{3,}\s[a-z]{3,}\s(le|la|les|de|des|un|une)\s/i.test(s.vi)) (stat.vi++, f.push("dịch?"));
      if (f.length) flagged.push({ id: w.id, fr: s.fr, vi: s.vi, f });
    }
  }
  writeFileSync(join(OUT, `ex5/audit-${slug}.json`), JSON.stringify(flagged, null, 1));
  console.log(slug.toUpperCase(), JSON.stringify(stat), "gắn cờ:", flagged.length);
}
