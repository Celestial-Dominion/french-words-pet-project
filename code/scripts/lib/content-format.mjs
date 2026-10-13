// Định dạng nguồn học liệu (content/**.txt) — gọn để viết tay, không phải thoát ký tự như JSON (port app Anh).
//
//   === rd-a1-le-marche-du-samedi       ← id: rd-<cấp>-chữ-thường (bài cũ giữ id dạng a1-01 để giữ tiến độ "đã đọc")
//   title: Le marché du samedi | Phiên chợ thứ Bảy
//   topic: food
//   genre: narrative
//   names: Léa, Karim                    ← tên riêng (viết hoa) được dùng tự do
//   gloss: croissant                     ← từ ngoài cấp bắt buộc phải có (thuật ngữ, món ăn)
//   (dòng trống)
//   Le samedi, Léa va au marché. | Thứ Bảy, Léa đi chợ.     ← mỗi dòng một câu "FR | VI"
//   (dòng trống = sang đoạn mới)
//
// Dòng bắt đầu "//" là ghi chú, bị bỏ qua. Bài phỏng theo nguồn mở thêm source: / license: / source-url:.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { LEVEL_KEYS } from "./fr-vocab.mjs";

export const TYPE_OF_PREFIX = { rd: "reading", st: "story" };
const ID_RE = /^(?:(rd|st)-(a1|a2|b1|b2|c1|c2)-[a-z0-9]+(?:-[a-z0-9]+)*|(a1|a2|b1|b2|c1|c2)-\d{2})$/;

export class FormatError extends Error {}

/** Mọi file .txt dưới dir (đệ quy), sắp theo đường dẫn. */
export function listSources(dir) {
  const out = [];
  const walk = (d) => {
    for (const f of readdirSync(d).sort()) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f.endsWith(".txt")) out.push(p);
    }
  };
  walk(dir);
  return out;
}

// "FR | VI" → {fr, vi}; sai định dạng → null.
export function splitPair(s) {
  const k = s.indexOf(" | ");
  if (k < 0) return null;
  const fr = s.slice(0, k).trim();
  const vi = s.slice(k + 3).trim();
  if (!fr || !vi || vi.includes(" | ")) return null;
  return { fr, vi };
}

/** id → {type, level}. */
export function idInfo(id) {
  const m = ID_RE.exec(id);
  if (!m) return null;
  return m[3] ? { type: "reading", level: m[3] } : { type: TYPE_OF_PREFIX[m[1]], level: m[2] };
}

/**
 * Đọc một file nguồn → [{id, type, level, header, body:[{line, text}], file, line}].
 * Không kiểm nội dung (việc của check-content), chỉ bắt lỗi cấu trúc.
 */
export function parseFile(path, root = process.cwd()) {
  const rel = relative(root, path);
  const lines = readFileSync(path, "utf8").replace(/\r/g, "").split("\n");
  const items = [];
  let cur = null;
  let inHeader = false;
  const fail = (n, msg) => {
    throw new FormatError(`${rel}:${n}: ${msg}`);
  };
  lines.forEach((raw, i) => {
    const n = i + 1;
    const line = raw.replace(/\s+$/, "");
    if (line.startsWith("//")) return;
    const head = /^===\s+(\S+)\s*$/.exec(line);
    if (head) {
      const id = head[1];
      const info = idInfo(id);
      if (!info) fail(n, `id sai dạng: ${id} (rd-<cấp>-chữ-thường-gạch-nối)`);
      cur = { id, ...info, header: {}, body: [], file: rel, line: n };
      items.push(cur);
      inHeader = true;
      return;
    }
    if (!cur) {
      if (line.trim()) fail(n, "nội dung trước dòng === id");
      return;
    }
    if (inHeader) {
      if (!line.trim()) {
        inHeader = false;
        return;
      }
      const kv = /^([a-z][a-z-]*):\s*(.*)$/.exec(line);
      if (!kv) inHeader = false;
      else {
        const [, k, v] = kv;
        if (k in cur.header) fail(n, `trường lặp: ${k}`);
        cur.header[k] = v;
        return;
      }
    }
    // names:/gloss: được phép đặt cả ở cuối bài (tiện khi viết) — gộp vào header.
    const late = /^(names|gloss):\s*(.*)$/.exec(line);
    if (late) {
      cur.header[late[1]] = [cur.header[late[1]], late[2]].filter(Boolean).join(", ");
      return;
    }
    cur.body.push({ line: n, text: line });
  });
  return items;
}

/** Thân bài đọc/chương → {paras: [chỉ số câu đầu đoạn], sentences: [{fr, vi, line}]}. */
export function parseProse(body, fail) {
  const sentences = [];
  const paras = [];
  let fresh = true;
  for (const { line, text } of body) {
    if (!text.trim()) {
      fresh = true;
      continue;
    }
    const p = splitPair(text);
    if (!p) fail(line, `câu phải dạng "FR | VI": ${text.slice(0, 60)}`);
    if (fresh) paras.push(sentences.length);
    fresh = false;
    sentences.push({ ...p, line });
  }
  return { paras, sentences };
}

export function levelIndex(key) {
  return LEVEL_KEYS.indexOf(key);
}

// ---------- Câu hỏi đọc hiểu (content/quiz/{cấp}/*.txt, trùng tên file bài) ----------
//
//   === rd-a1-le-marche-du-samedi
//   ? Quel jour Léa va-t-elle au marché ? | Léa đi chợ vào hôm nào?   ← câu hỏi "FR | VI"
//   + Le samedi | Thứ Bảy                     ← phương án ĐÚNG (đúng một dòng +)
//   - Le dimanche | Chủ nhật                  ← phương án sai
//   > Bài đọc: «Le samedi, Léa va au marché.» ← giải thích (VI) trích NGUYÊN VĂN câu trong bài
// Thứ tự phương án trong nguồn không quan trọng (giao diện xáo mỗi lần mở).
const QUIZ_HEAD_RE = /^===\s+(\S+)(?:\s+(\d+))?\s*$/;

/** Đọc một file câu hỏi → [{id, ch, file, line, questions:[{line, q:{fr,vi}, opts:[{fr,vi,ok,line}], why}]}]. */
export function parseQuizFile(path, root = process.cwd()) {
  const rel = relative(root, path);
  const lines = readFileSync(path, "utf8").replace(/\r/g, "").split("\n");
  const blocks = [];
  let cur = null;
  let q = null;
  const fail = (n, msg) => {
    throw new FormatError(`${rel}:${n}: ${msg}`);
  };
  lines.forEach((raw, i) => {
    const n = i + 1;
    const line = raw.replace(/\s+$/, "");
    if (!line.trim() || line.startsWith("//")) return;
    const head = QUIZ_HEAD_RE.exec(line);
    if (head) {
      const [, id, ch] = head;
      const info = idInfo(id);
      if (!info) fail(n, `id sai dạng: ${id}`);
      if (info.type === "story" && !ch) fail(n, `truyện phải ghi số chương: === ${id} 1`);
      if (info.type === "reading" && ch) fail(n, `bài đọc không có số chương: ${line}`);
      cur = { id, ch: ch ? Number(ch) : null, file: rel, line: n, questions: [] };
      blocks.push(cur);
      q = null;
      return;
    }
    if (!cur) fail(n, "nội dung trước dòng === id");
    const m = /^([?+\->])\s+(.*)$/.exec(line);
    if (!m) fail(n, `dòng câu hỏi phải mở bằng "? ", "+ ", "- " hoặc "> ": ${line.slice(0, 60)}`);
    const [, k, rest] = m;
    if (k === "?") {
      const p = splitPair(rest);
      if (!p) fail(n, `câu hỏi phải dạng "? FR | VI"`);
      q = { line: n, q: p, opts: [], why: "" };
      cur.questions.push(q);
      return;
    }
    if (!q) fail(n, `"${k}" trước dòng "?"`);
    if (k === ">") {
      if (q.why) fail(n, "mỗi câu một dòng giải thích >");
      q.why = rest.trim();
      return;
    }
    const p = splitPair(rest);
    if (!p) fail(n, `phương án phải dạng "${k} FR | VI"`);
    q.opts.push({ ...p, ok: k === "+", line: n });
  });
  return blocks;
}
