// IPA tiếng Pháp theo TỪ (dạng từ điển, không nối âm) cho lớp phát âm của bài Ngữ pháp — vai trò như ipaOf (CMUdict)
// của app Anh. Nguồn: Lexique 3.83 (scripts/Lexique383.tsv, mọi dạng biến hình, cột phon → phon2ipa) — dạng có nhiều
// cách đọc lấy dòng tần suất cao nhất; dự phòng IPA của bộ từ (public/data/words, theo lemma). Không đoán.
// Lược âm (j'ai, l'école, qu'il) và gạch nối (est-ce, a-t-il, peut-être) ghép từ phần.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { phonToIpa } from "../phon2ipa.mjs";
import { loadVocab } from "./fr-vocab.mjs";

const SCRIPTS = join(import.meta.dirname, "..");
const ELIDED = { l: "l", d: "d", j: "ʒ", m: "m", t: "t", s: "s", n: "n", c: "s", qu: "k", jusqu: "ʒysk", lorsqu: "lɔʁsk", puisqu: "pɥisk", quoiqu: "kwak" };

let LEX = null;
function lexique() {
  if (LEX) return LEX;
  LEX = new Map();
  const p = join(SCRIPTS, "Lexique383.tsv");
  if (!existsSync(p)) return LEX;
  const best = new Map();
  const rows = readFileSync(p, "utf8").split("\n");
  for (let i = 1; i < rows.length; i++) {
    const c = rows[i].split("\t");
    if (c.length < 10 || !c[0]) continue;
    const f = (Number(c[8]) || 0) + (Number(c[9]) || 0);
    const cur = best.get(c[0]);
    if (!cur || f > cur.f) best.set(c[0], { f, phon: c[1] });
  }
  for (const [k, v] of best) LEX.set(k, phonToIpa(v.phon).replace(/^\/|\/$/g, ""));
  return LEX;
}

// Từ đồng tự khác âm trong câu ví dụ: phải khai [ipa=fils:fis] theo nghĩa (hoặc fils:= nếu đúng dạng từ điển).
// "plus" không bắt khai — dạng từ điển /ply/ (ne… plus); câu cần /plys/ thì khai ipa=plus:plys.
export const HETERONYMS = new Set(["fils", "couvent", "président", "résident", "violent", "négligent", "excellent"]);

// Cụm hay gặp mà ghép từ phần ra sai (ce trong est-ce câm /ə/).
const FIXED = { "est-ce": "ɛs", "qu'est-ce": "kɛs", "n'est-ce": "nɛs" };

const strip = (s) => String(s ?? "").replace(/^\/|\/$/g, "").replace(/[ˈˌ.‿]/g, "");

/** IPA của một token / cụm (cách nhau dấu cách) — "" nếu không có dữ liệu. */
export function ipaOf(raw) {
  const lw = String(raw).toLowerCase().replace(/[’‘`]/g, "'").replace(/[«»"“”.,!?;:()]/g, "").trim();
  if (!lw) return "";
  if (lw.includes(" ")) {
    const parts = lw.split(/\s+/).map((x) => ipaOf(x));
    return parts.every(Boolean) ? parts.join(" ") : "";
  }
  if (FIXED[lw]) return FIXED[lw];
  const L = lexique();
  if (L.has(lw)) return L.get(lw);
  // Lexique viết "oe"/"ae" thay cho "œ"/"æ" (soeur, oeuf)
  const lig = lw.replace(/œ/g, "oe").replace(/æ/g, "ae");
  if (lig !== lw && L.has(lig)) return L.get(lig);
  const own = loadVocab().words.get(lw)?.ipa;
  if (own) return strip(own);
  const ap = lw.indexOf("'");
  if (ap > 0) {
    const pre = ELIDED[lw.slice(0, ap)];
    const rest = ipaOf(lw.slice(ap + 1));
    return pre !== undefined && rest ? pre + rest : "";
  }
  if (lw.includes("-")) {
    const parts = lw.split("-").filter((x) => x !== "t");
    const ip = parts.map((x) => ipaOf(x));
    if (!ip.every(Boolean)) return "";
    // a-t-il, va-t-elle: "-t-" đọc thành /t/
    return lw.includes("-t-") ? ip.join("t") : ip.join("");
  }
  return "";
}
