// F1c-1 — Ghép lemmas.json + enrich.json thành "words base" (đủ mọi trường TRỪ meaning_vi).
// Ra: scripts/out/words-base.json  (mảng Word chưa có meaning_vi)
// IPA: ưu tiên kaikki, thiếu thì dựng từ Lexique phon. meaning_en: từ glosses EN đã lọc.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { phonToIpa } from "./phon2ipa.mjs";
import { toSearch } from "../lib/slug.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const lemmas = JSON.parse(readFileSync(join(HERE, "out/lemmas.json"), "utf8"));
// enrich.json optional: chưa có kaikki thì IPA dùng phon fallback, nghĩa EN để trống (điền sau).
const enrichPath = join(HERE, "out/enrich.json");
const enrich = existsSync(enrichPath) ? JSON.parse(readFileSync(enrichPath, "utf8")) : {};

// Rút gọn gloss EN: cắt phần chú thích trong ngoặc dài, giới hạn độ dài & số lượng.
function cleanGlosses(glosses) {
  if (!glosses) return [];
  const out = [];
  for (let g of glosses) {
    g = g.replace(/\s+/g, " ").trim();
    if (!g || g.length > 80) continue; // bỏ định nghĩa quá dài (để nghĩa VI diễn đạt lại)
    if (!out.includes(g)) out.push(g);
    if (out.length >= 4) break;
  }
  return out;
}

const base = lemmas.map((r) => {
  const e = enrich[r.id] || {};
  const ipa = e.ipa || phonToIpa(r.phon_lexique) || "";
  const w = {
    id: r.id,
    ipa,
    pos: r.pos,
    meaning_vi: "", // điền ở bước sinh nghĩa
    meaning_en: [], // điền từ nguồn sinh nghĩa (assemble) — súc tích hơn gloss kaikki
    level: r.level,
    frequency: r.frequency,
    search: toSearch(r.id),
  };
  // Giống: chỉ khi Lexique đã xác định là danh từ; dùng giá trị kaikki để SỬA (vd abbé f→m).
  if (r.gender) w.gender = e.gender || r.gender;
  if (r.plural) w.plural = r.plural;
  const vg = e.group || r.verb_group;
  if (vg) w.verb_group = vg;
  if (r.forms && r.forms.length) w.forms = r.forms.slice(0, 40);
  return w;
});

writeFileSync(join(HERE, "out/words-base.json"), JSON.stringify(base));

const noIpa = base.filter((w) => !w.ipa).length;
const noEn = base.filter((w) => !w.meaning_en.length).length;
console.log("words-base:", base.length);
console.log("thiếu IPA:", noIpa, "| thiếu nghĩa EN:", noEn);
console.log("mẫu A1:", base.filter((w) => w.level === 1).slice(0, 5).map((w) => `${w.id} ${w.ipa} [${w.meaning_en.join("/")}]`).join(" | "));
