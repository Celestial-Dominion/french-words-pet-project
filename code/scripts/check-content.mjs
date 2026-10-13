// Kiểm học liệu nguồn (content/readings/**.txt + content/quiz/**.txt) — port app Anh, docs/CONTENT_PLAYBOOK.md.
//   node scripts/check-content.mjs [--level a1] [--id rd-a1-…] [--errors] [--draft] [--verbose]
// ✗ = LỖI (exit 1): chặn build.  ! = CẢNH BÁO: đọc và xử lý hoặc chấp nhận có lý do.
// --draft: chưa bắt buộc câu hỏi đọc hiểu (lô đang viết dở).
// Cấp STRICT_LEVELS (A1–A2) kiểm đủ từ vựng/độ dài/thì; cấp khác (bài cũ legacy.txt) chỉ kiểm định dạng.
import { loadLibrary, loadQuizzes, profileOf } from "./lib/content-model.mjs";
import { LEVEL_KEYS, LEVEL_LABEL, tenseFlags, normText, analyzeSentence } from "./lib/fr-vocab.mjs";
import { SPEC, TOPICS, GENRES, LICENSES, STRICT_LEVELS } from "./lib/content-spec.mjs";
import { checkQuizzes } from "./lib/quiz-check.mjs";

const args = process.argv.slice(2);
const opt = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const ONLY_LEVEL = opt("--level");
const ONLY_ID = opt("--id");
const ERRORS_ONLY = args.includes("--errors");
const DRAFT = args.includes("--draft");
const VERBOSE = args.includes("--verbose");

export function runChecks({ draft = false } = {}) {
  const { items, errors: fmtErrors } = loadLibrary();
  const byId = new Map();
  const report = new Map(); // id → {e:[], w:[]}
  const libErr = [...fmtErrors];
  const libWarn = [];
  const R = (id) => {
    if (!report.has(id)) report.set(id, { e: [], w: [] });
    return report.get(id);
  };
  for (const m of items) {
    if (byId.has(m.id)) libErr.push(`id trùng: ${m.id} (${m.file} và ${byId.get(m.id).file})`);
    byId.set(m.id, m);
  }

  for (const m of items) {
    const r = R(m.id);
    const err = (s) => r.e.push(s);
    const warn = (s) => r.w.push(s);
    const spec = SPEC[m.level];
    const strict = STRICT_LEVELS.includes(m.level);

    if (!m.title?.fr || !m.title?.vi) err("thiếu tiêu đề FR | VI");
    if (!TOPICS.includes(m.topic)) err(`topic lạ: ${m.topic}`);
    if (!GENRES.includes(m.genre)) err(`genre lạ: ${m.genre}`);
    if (m.source) {
      if (!m.source.title || !m.source.credit) err(`source: phải dạng "Tên gốc | tác giả, tuyển tập (năm)"`);
      if (!LICENSES[m.source.license]) err(`license lạ: "${m.source.license}" (nhận: ${Object.keys(LICENSES).join(" · ")})`);
      if (!/^https:\/\/[\w.-]+\.[a-z]{2,}\/\S+/.test(m.source.url)) err(`source-url phải là đường dẫn https tới nguồn: ${m.source.url || "(trống)"}`);
    }
    if (m.series && (!m.series.id || !Number.isInteger(m.series.order) || m.series.order < 1)) err(`series phải dạng "id thứ-tự": ${m.header.series}`);
    if (!m.sentences.length) err("không có câu nào");

    for (const s of m.sentences) checkSentence(s, err, warn, strict, draft);
    if (!strict) continue;

    // ---- từ vựng theo cấp ----
    const p = profileOf(m);
    const overRate = p.nScored ? p.over.length / p.nScored : 0;
    const far = p.over.filter((o) => o.band >= m.band + 2);
    const farRate = p.nScored ? far.length / p.nScored : 0;
    const tops = (list) => [...new Set(list.map((o) => `${o.t}(${LEVEL_LABEL[o.band] ?? "?"})`))].slice(0, 10).join(" ");
    if (overRate > spec.over) (overRate > spec.over * 2 ? err : warn)(`từ vượt ${LEVEL_LABEL[m.band]} ${(overRate * 100).toFixed(1)}% > ${(spec.over * 100).toFixed(1)}%: ${tops(p.over)}`);
    if (farRate > spec.far) (farRate > spec.far * 2 ? err : warn)(`từ xa cấp (≥ 2 bậc) ${(farRate * 100).toFixed(1)}% > ${(spec.far * 100).toFixed(1)}%: ${tops(far)} — đổi từ hoặc khai gloss:`);
    else if (p.over.length && VERBOSE) warn(`vượt cấp (trong ngưỡng): ${tops(p.over)}`);
    // gloss: chỉ dành cho từ XA cấp thật cần (thuật ngữ, món ăn) — từ cấp kề đã có ngưỡng over riêng
    const glossBands = [...new Set(String(m.header.gloss ?? "").split(",").map((x) => x.trim()).filter(Boolean))].map((g) => [g, Math.min(...analyzeSentence(g).map((w) => (w.band < 0 ? 9 : w.band)))]);
    // …trừ từ chủ chốt của bài (≥ 3 lần: "poule" trong truyện gà mái) — gloss để không đội tỉ lệ vượt cấp
    const textLemmas = m.sentences.flatMap((s) => analyzeSentence(s.fr).flatMap((w) => w.lemmas));
    const timesOf = (g) => {
      const ls = new Set(analyzeSentence(g).flatMap((w) => w.lemmas));
      return textLemmas.filter((l) => ls.has(l)).length;
    };
    const near = glossBands.filter(([g, b]) => b <= m.band + 1 && timesOf(g) < 3).map(([g]) => g);
    if (near.length) warn(`gloss thừa (từ cấp ≤ ${LEVEL_LABEL[m.band + 1]}, bỏ khỏi gloss:): ${near.join(", ")}`);
    const farUsed = new Set(m.sentences.flatMap((s) => analyzeSentence(s.fr, { names: m.names }).filter((w) => w.band >= m.band + 2 && m.gloss.has(w.t.toLowerCase())).map((w) => w.lemmas[0])));
    if (farUsed.size > 4) warn(`${farUsed.size} từ xa cấp dựa vào gloss: (${[...farUsed].join(" ")}) — nên ≤ 4/bài`);
    const unk = [...new Set(p.unknown)];
    if (unk.length) err(`ngoài từ điển / tên chưa khai: ${unk.slice(0, 12).join(" ")}${unk.length > 12 ? ` …+${unk.length - 12}` : ""} (khai names:/gloss:)`);
    const density = p.nScored ? p.bands[m.band] / p.nScored : 0;
    if (spec.density && density < spec.density) warn(`tỉ lệ từ đúng cấp ${(density * 100).toFixed(1)}% < ${(spec.density * 100).toFixed(0)}% — bài dễ hơn cấp`);

    // ---- thì/thức: A1–A2 không passé simple; subjonctif chỉ cảnh báo ở A2 ----
    const tf = m.sentences.flatMap((s) => tenseFlags(s.fr).map((x) => ({ ...x, line: s.line })));
    const ps = tf.filter((x) => x.kind === "passé simple");
    const sj = tf.filter((x) => x.kind === "subjonctif");
    if (ps.length) err(`passé simple chưa hợp ${LEVEL_LABEL[m.band]}: ${ps.map((x) => `${x.t}(dòng ${x.line})`).join(" ")}`);
    if (sj.length) (m.band === 0 ? err : warn)(`subjonctif: ${sj.map((x) => `${x.t}(dòng ${x.line})`).join(" ")}`);

    // ---- độ dài ----
    const nw = p.nWords;
    const sentAvg = nw / Math.max(1, m.sentences.length);
    const [lo, hi] = spec.words;
    if (nw < lo * 0.85 || nw > hi * 1.15) warn(`độ dài ${nw} từ (mốc ${lo}–${hi})`);
    if (sentAvg < spec.sent[0] || sentAvg > spec.sent[1]) warn(`câu TB ${sentAvg.toFixed(1)} từ (mốc ${spec.sent[0]}–${spec.sent[1]})`);
  }

  // ---- toàn thư viện theo cấp ----
  const titles = new Map();
  for (const m of items) {
    const k = normText(m.title?.fr ?? "").toLowerCase().replace(/[^\p{L}\d ]/gu, "").trim();
    if (!k) continue;
    if (titles.has(k)) R(m.id).e.push(`tiêu đề trùng với ${titles.get(k)}`);
    else titles.set(k, m.id);
  }
  for (const lv of STRICT_LEVELS) {
    const list = items.filter((m) => m.level === lv);
    if (!list.length) continue;
    const cap = Math.max(2, Math.ceil(list.length * 0.12));
    for (const [label, pick] of [
      ["mở bài", (m) => m.sentences[0]?.fr],
      ["kết bài", (m) => m.sentences[m.sentences.length - 1]?.fr],
    ]) {
      const groups = new Map();
      for (const m of list) {
        const k = first2(pick(m));
        if (!k) continue;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(m.id);
      }
      for (const [k, ids] of groups) if (ids.length > cap) libWarn.push(`${lv}: ${label} "${k}…" lặp ${ids.length} bài (${ids.slice(0, 4).join(", ")}…)`);
    }
    if (list.length >= 20) {
      const topics = new Map();
      for (const m of list) topics.set(m.topic, (topics.get(m.topic) ?? 0) + 1);
      for (const [t, n] of topics) if (n / list.length > 0.15) libWarn.push(`${lv}: chủ đề ${t} chiếm ${n}/${list.length} (>15%)`);
      if (list.length >= 40 && topics.size < SPEC[lv].topics) libWarn.push(`${lv}: chỉ ${topics.size} chủ đề (mốc ≥ ${SPEC[lv].topics})`);
      const fp = list.filter(firstPerson).length;
      if (fp / list.length > 0.3) libWarn.push(`${lv}: ngôi thứ nhất ${fp}/${list.length} (> 30%)`);
    }
  }

  // near-duplicate: 5-gram Jaccard, cùng cấp hoặc cấp kề
  const sh = new Map(items.map((m) => [m.id, shingles(m.sentences.map((s) => s.fr).join(" "))]));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (Math.abs(a.band - b.band) > 1) continue;
      const J = jaccard(sh.get(a.id), sh.get(b.id));
      if (J >= 0.3) R(b.id).e.push(`gần trùng ${a.id} (Jaccard 5-gram ${J.toFixed(2)})`);
      else if (J >= 0.12) R(b.id).w.push(`khá giống ${a.id} (Jaccard ${J.toFixed(2)})`);
    }
  }
  // chuỗi (series): thứ tự không trùng, liền 1..n
  const groups = new Map();
  for (const m of items.filter((x) => x.series)) (groups.get(m.series.id) ?? groups.set(m.series.id, []).get(m.series.id)).push(m);
  for (const [sid, list] of groups) {
    const orders = list.map((m) => m.series.order).sort((a, b) => a - b);
    if (new Set(orders).size !== orders.length) libErr.push(`series ${sid}: thứ tự trùng (${orders.join(",")})`);
    else if (orders.some((o, i) => o !== i + 1)) libWarn.push(`series ${sid}: thứ tự không liền 1..${orders.length} (${orders.join(",")})`);
  }
  // câu hỏi đọc hiểu
  const quiz = loadQuizzes();
  const qc = checkQuizzes(items, quiz, { requireLevels: draft ? [] : STRICT_LEVELS });
  for (const [id, r] of qc.perItem) {
    R(id).e.push(...r.e);
    R(id).w.push(...r.w);
  }
  libErr.push(...qc.libErr);
  libWarn.push(...qc.libWarn);
  return { items, report, libErr, libWarn, quiz, quizCoverage: qc.coverage };
}

const first2 = (s) =>
  normText(s ?? "")
    .toLowerCase()
    .replace(/[^\p{L}' ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
const norm = (s) =>
  normText(s)
    .toLowerCase()
    .replace(/[^\p{L}\d]+/gu, " ")
    .trim();
function shingles(text) {
  const w = norm(text).split(" ");
  const out = new Set();
  for (let i = 0; i + 5 <= w.length; i++) out.add(w.slice(i, i + 5).join(" "));
  return out;
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
function firstPerson(m) {
  const n = m.sentences.filter((s) => /(^|[^\p{L}])(je|j'|j’|mon|ma|mes|me|m'|moi)(?![\p{L}])/iu.test(s.fr)).length;
  return n >= Math.max(2, m.sentences.length * 0.3);
}

const VI_LETTERS = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
function checkSentence(s, err, warn, strict, draft) {
  const at = `dòng ${s.line}`;
  const fr = s.fr;
  if (/\s{2,}/.test(fr)) err(`${at}: khoảng trắng kép`);
  if (/\s[,.]/.test(fr)) err(`${at}: khoảng trắng trước dấu , .`);
  const glued = /\p{Ll}[,;!?]\p{L}|\p{Ll}{2}\.\p{Lu}\p{Ll}/u.exec(fr);
  if (glued && !/\b(?:\p{Lu}\.){2,}|\d[.,]\d/u.test(fr)) err(`${at}: dính chữ "${glued[0]}"`);
  if (/[“”]/.test(fr)) warn(`${at}: dùng « » hoặc " cho lời nói (thống nhất tách từ/TTS)`);
  if (/\p{L}[?!;:]/u.test(fr) && strict) warn(`${at}: tiếng Pháp viết cách trước ? ! ; : ("Tu viens ?")`);
  if (!/^[«"'(\[—–-]?\s?[\p{Lu}\d]/u.test(fr) && !/^\.\.\./.test(fr)) warn(`${at}: câu không mở bằng chữ hoa`);
  const vi = s.vi;
  if (vi === "~") return draft ? undefined : err(`${at}: chưa có bản dịch (~) — chạy content:mt fill`);
  const frWords = fr.split(/\s+/).length;
  if (!VI_LETTERS.test(vi) && frWords > 3) warn(`${at}: bản dịch không có dấu tiếng Việt?`);
  const ratio = vi.length / Math.max(1, fr.length);
  if (frWords > 4 && (ratio < 0.45 || ratio > 2.4)) warn(`${at}: độ dài bản dịch lệch (×${ratio.toFixed(2)})`);
  const nums = (x) => (x.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
  const miss = nums(fr).filter((n) => !nums(vi).includes(n));
  if (miss.length) warn(`${at}: số ${miss.join(",")} không có trong bản dịch`);
  if (/\?\s*[»"]?$/.test(fr) && !/\?/.test(vi)) warn(`${at}: câu hỏi nhưng bản dịch không có "?"`);
}

// ---------- chạy trực tiếp ----------
if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const { items, report, libErr, libWarn, quizCoverage } = runChecks({ draft: DRAFT });
  let nErr = libErr.length;
  let nWarn = libWarn.length;
  const shown = items.filter((m) => (!ONLY_LEVEL || m.level === ONLY_LEVEL) && (!ONLY_ID || m.id === ONLY_ID));
  for (const lv of LEVEL_KEYS) {
    const list = shown.filter((m) => m.level === lv);
    if (!list.length) continue;
    const qc = quizCoverage[lv] ?? { r: 0, rAll: 0 };
    console.log(`\n== ${LEVEL_LABEL[LEVEL_KEYS.indexOf(lv)]}: ${list.length} bài đọc · câu hỏi ${qc.r}/${qc.rAll}`);
    for (const m of list) {
      const r = report.get(m.id) ?? { e: [], w: [] };
      nErr += r.e.length;
      nWarn += r.w.length;
      if (!r.e.length && (ERRORS_ONLY || !r.w.length)) continue;
      console.log(`  ${m.id}`);
      for (const e of r.e) console.log(`    ✗ ${e}`);
      if (!ERRORS_ONLY) for (const w of r.w) console.log(`    ! ${w}`);
    }
  }
  for (const e of libErr) console.log(`✗ ${e}`);
  if (!ERRORS_ONLY) for (const w of libWarn) if (!ONLY_LEVEL || w.startsWith(ONLY_LEVEL)) console.log(`! ${w}`);
  console.log(`\n${shown.length} bài · ${nErr} lỗi · ${nWarn} cảnh báo`);
  process.exit(nErr ? 1 : 0);
}
