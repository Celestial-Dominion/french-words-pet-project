// Dịch máy bản nháp tiếng Việt cho bài đọc / câu hỏi (port app Anh, docs/CONTENT_PLAYBOOK.md §16) — người soạn chỉ
// viết tiếng Pháp, máy điền tiếng Việt, người soạn đọc soát rồi sửa đúng dòng sai.
//
//   node scripts/content-mt.mjs fill <file>…   điền " | VI" cho mọi dòng còn thiếu:
//        · bài đọc: dòng câu, "title: FR"
//        · câu hỏi: "? FR", "+ FR", "- FR"; "> ~cụm từ" → "> Bài đọc: «câu chứa cụm từ»"
//          (câu có « » thì chỉ trích phần lời nói chứa cụm từ). Điền file câu hỏi SAU file bài.
//        "// mt: Léa=Léa; le boulanger=người thợ làm bánh" trong file bài → thay trong câu Pháp TRƯỚC khi gửi máy;
//        "// mt-vi: anh ấy=>nó; Anh ấy=>Nó" → thay trong bản dịch SAU khi máy trả (xưng hô theo vai).
//        File câu hỏi tự đọc hai dòng này từ file bài cùng tên.
//   node scripts/content-mt.mjs stub <file>…   như fill nhưng KHÔNG gọi máy: điền " | ~" để chạy check-content ngay trên bản
//        tiếng Pháp (soát từ vựng trước khi dịch); "fill" sau đó dịch mọi dòng " | ~".
//   node scripts/content-mt.mjs vi <file>…     in "số-dòng|FR ⟶ VI" để đọc soát cho gọn
//   node scripts/content-mt.mjs fix <file>     đọc stdin "số-dòng|VI mới" → thay phần tiếng Việt của đúng dòng đó
//
// Máy dịch: bộ dịch có sẵn của macOS (scripts/apple-translate.swift, Translation.framework — chạy trên máy, ~27 câu/giây,
// cần gói Français + Tiếng Việt). Lỗi máy hay gặp, phải soát: con vật/đồ vật thành "anh ấy/cô ấy", từ nhiều nghĩa
// (marché → "thị trường" thay vì "chợ"), danh từ nghề giữ tiếng Anh ("Baker"), "Vào Chủ nhật" thừa chữ.
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, relative, join } from "node:path";
import { tmpdir } from "node:os";
import { loadLibrary, ROOT } from "./lib/content-model.mjs";
import { analyzeToken, GLOBAL_NAMES } from "./lib/fr-vocab.mjs";

const [cmd, ...files] = process.argv.slice(2);

// Làm sạch bản máy: ngoặc kép cong → thẳng, khoảng trắng thừa, dấu câu dính.
function tidy(vi) {
  return vi
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function appleTranslate(lines) {
  if (!lines.length) return [];
  const src = join(ROOT, "scripts", "apple-translate.swift");
  const bin = join(tmpdir(), "content-mt-apple-fr");
  let stale = true;
  try {
    stale = statSync(bin).mtimeMs < statSync(src).mtimeMs;
  } catch {}
  if (stale) {
    const c = spawnSync("swiftc", ["-O", "-parse-as-library", src, "-o", bin], { encoding: "utf8" });
    if (c.status !== 0) throw new Error(`biên dịch apple-translate.swift lỗi:\n${c.stderr}`);
  }
  const r = spawnSync(bin, { input: JSON.stringify(lines), encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(r.stderr.trim() || `apple-translate thoát mã ${r.status}`);
  return JSON.parse(r.stdout).map((v, k) => {
    const t = tidy(v);
    return /\p{L}{3}/u.test(lines[k]) && t.toLowerCase() === lines[k].trim().toLowerCase() ? "~" : t;
  });
}

const isMeta = (t) => /^(\/\/|===|names:|gloss:|topic:|genre:|series:|source:|license:|source-url:)/.test(t);

function plan(lines, kind) {
  // → [{i, fr, put(vi) → dòng mới}]
  const jobs = [];
  let inHeader = false;
  let curQ = null;
  lines.forEach((raw, i) => {
    const t = raw.trimEnd();
    if (/^===\s/.test(t)) {
      inHeader = true;
      return;
    }
    if (inHeader && !t.trim()) {
      inHeader = false;
      return;
    }
    if (!t.trim() || isMeta(t)) return;
    const base = t.replace(/ \| ~$/, "");
    if (kind === "quiz") {
      const m = /^([?+-]) (.*)$/.exec(base);
      if (!m) return;
      const fr = m[2].split(" | ")[0];
      if (m[1] === "?") curQ = { fr, i };
      if (!m[2].includes(" | ")) jobs.push({ i, fr, kind: m[1], q: m[1] === "?" ? null : curQ, put: (vi) => `${m[1]} ${fr} | ${vi}` });
      return;
    }
    let m;
    if ((m = /^title:\s*(.*)$/.exec(base))) {
      if (!m[1].includes(" | ")) jobs.push({ i, fr: m[1], put: (vi) => `title: ${m[1]} | ${vi}` });
    } else if (!inHeader && !base.includes(" | ") && !/^[a-z][a-z-]*:/.test(base)) {
      jobs.push({ i, fr: base.trim(), put: (vi) => `${base.trim()} | ${vi}` });
    }
  });
  return jobs;
}

// ---- câu hỏi: "> ~cụm" → trích nguyên văn câu trong bài ----
let LIB = null;
function quoteFor(id, phrase) {
  LIB ??= new Map(loadLibrary().items.map((m) => [m.id, m]));
  const m = LIB.get(id);
  if (!m) throw new Error(`không thấy bài ${id} (điền file bài trước, hoặc bài chưa đúng định dạng)`);
  const low = phrase.toLowerCase();
  const hit = m.sentences.filter((s) => s.fr.toLowerCase().includes(low));
  if (!hit.length) throw new Error(`${id}: không câu nào chứa "${phrase}"`);
  let q = hit[0].fr;
  if (/[«"]/.test(q)) {
    const parts = [...q.matchAll(/«\s*([^»]+?)\s*»|"([^"]+)"/g)].map((x) => x[1] ?? x[2]);
    const inQ = parts.find((p) => p.toLowerCase().includes(low));
    if (inQ) q = inQ.replace(/[,]$/, "");
  }
  return `> Bài đọc: «${q.trim()}»`;
}

function expandQuotes(lines) {
  let id = null;
  const errs = [];
  const out = lines.map((t) => {
    const h = /^===\s+(\S+)\s*$/.exec(t);
    if (h) {
      id = h[1];
      return t;
    }
    const q = /^>\s*~(.+)$/.exec(t);
    if (!q) return t;
    try {
      return quoteFor(id, q[1].trim());
    } catch (e) {
      errs.push(e.message);
      return t;
    }
  });
  return { out, errs };
}

const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function nameMap(lines, key = "mt", sep = "=") {
  const out = [];
  for (const l of lines) {
    const m = new RegExp(`^//\\s*${key}:\\s*(.*)$`).exec(l);
    if (!m) continue;
    for (const pair of m[1].split(";")) {
      const [a, b] = pair.split(sep).map((x) => x?.trim());
      if (a && b) out.push([new RegExp(`(?<![\\p{L}])${esc(a)}(?![\\p{L}])`, "gu"), b]);
    }
  }
  return out;
}

// Quy tắc "// mt:" (thay trong câu Pháp trước khi dịch) và "// mt-vi:" (thay trong bản dịch): dòng trước "===" đầu tiên áp
// cho cả file; dòng nằm trong một bài (sau "=== id") chỉ áp cho bài đó — vd. bài về con chó: "// mt-vi: anh ấy=>nó".
function rulesByLine(lines, key, sep) {
  const global = nameMap(lines.slice(0, Math.max(0, lines.findIndex((l) => /^===\s/.test(l)))), key, sep);
  const out = new Map(); // chỉ số dòng → quy tắc
  let scoped = [];
  lines.forEach((l, i) => {
    if (/^===\s/.test(l)) scoped = [];
    const r = nameMap([l], key, sep);
    if (r.length && i > 0 && lines.slice(0, i).some((x) => /^===\s/.test(x))) scoped = scoped.concat(r);
    out.set(i, [...global, ...scoped]);
  });
  return out;
}

// Tiếng Pháp « x » → "x" trước khi gửi máy (máy trả ngoặc kép kèm khoảng trắng thừa bên trong).
const quotesFr = (s) => s.replace(/«\s*/g, '"').replace(/\s*»/g, '"');
// Câu hỏi: gửi "câu hỏi — đáp án đúng", phương án: "câu hỏi — phương án" → máy có ngữ cảnh (À pied → Đi bộ, không phải
// "Đang chảy"); lấy lại phần cần bằng cách tách ở dấu gạch đầu tiên. Không tách được thì dịch riêng.
function contextual(jobs, lines, pre) {
  const ans = new Map(); // dòng câu hỏi → đáp án đúng
  let q = null;
  lines.forEach((l) => {
    const m = /^([?+-]) (.*)$/.exec(l);
    if (!m) return;
    if (m[1] === "?") q = m[2].split(" | ")[0];
    else if (m[1] === "+" && q) ans.set(q, m[2].split(" | ")[0]);
  });
  const src = jobs.map((j) => {
    const fr = pre(j);
    if (j.kind === "?") return ans.has(j.fr) ? `${fr} — ${pre({ ...j, fr: ans.get(j.fr) })}` : fr;
    if (j.kind && j.q) return `${pre({ ...j, fr: j.q.fr })} — ${fr}`;
    return fr;
  });
  const out = appleTranslate(src);
  const redo = [];
  const res = out.map((v, k) => {
    const j = jobs[k];
    if (!j.kind || src[k] === pre(j)) return v;
    const parts = v.split(/\s+[—–-]\s+/);
    if (parts.length !== 2) {
      redo.push(k);
      return v;
    }
    return (j.kind === "?" ? parts[0] : parts[1]).trim();
  });
  if (redo.length) appleTranslate(redo.map((k) => pre(jobs[k]))).forEach((v, n) => (res[redo[n]] = v));
  return res;
}

function fill(file, stub = false) {
  const kind = /\/quiz\//.test(file) ? "quiz" : "text";
  let lines = readFileSync(file, "utf8").replace(/\r/g, "").split("\n");
  const jobs = plan(lines, kind);
  const warns = [];
  if (jobs.length) {
    let src = lines;
    if (kind === "quiz")
      try {
        // quy tắc của file bài cùng tên (toàn file) cũng áp cho file câu hỏi
        const rd = readFileSync(file.replace("/quiz/", "/readings/"), "utf8").split("\n");
        src = rd.slice(0, Math.max(0, rd.findIndex((l) => /^===\s/.test(l)))).concat(lines);
      } catch {}
    const preR = rulesByLine(kind === "quiz" ? lines : src, "mt", "=");
    const postR = rulesByLine(kind === "quiz" ? lines : src, "mt-vi", "=>");
    const glob = kind === "quiz" ? { pre: nameMap(src.slice(0, src.length - lines.length)), post: nameMap(src.slice(0, src.length - lines.length), "mt-vi", "=>") } : { pre: [], post: [] };
    const pre = (j) => quotesFr([...glob.pre, ...(preR.get(j.i) ?? [])].reduce((s, [re, v]) => s.replace(re, v), j.fr));
    const vi = stub ? jobs.map(() => "~") : contextual(jobs, lines, pre).map((v, k) => [...glob.post, ...(postR.get(jobs[k].i) ?? [])].reduce((s, [re, r]) => s.replace(re, r), v));
    const plain = (x) => x.normalize("NFD").replace(/\p{M}/gu, "");
    jobs.forEach((j, k) => {
      if (!stub) {
        // dòng chỉ là một tên (chữ ký thư "Lucas") — máy trả nguyên văn là đúng
        if (vi[k] === "~" && /^\p{Lu}[\p{L}-]+[,.!]?$/u.test(j.fr.trim())) vi[k] = j.fr.trim();
        // máy bỏ dấu tên riêng (Chloé → Chloe, Léo → Leo) → trả lại dấu
        for (const n of new Set(j.fr.match(/(?<![\p{L}'])\p{Lu}\p{Ll}+/gu) ?? [])) {
          const p0 = plain(n);
          if (p0 !== n && !vi[k].includes(n)) vi[k] = vi[k].replace(new RegExp(`(?<![\\p{L}])${p0}(?![\\p{L}])`, "gu"), n);
        }
      }
      lines[j.i] = j.put(vi[k]);
      if (stub) return;
      // tên riêng (chữ hoa giữa câu) phải còn nguyên trong bản dịch — máy hay dịch tên (Minou → Kitty) hoặc bỏ dấu (Chloé → Chloe)
      for (const n of j.fr.slice(1).match(/(?<![\p{L}'])\p{Lu}\p{Ll}+/gu) ?? []) {
        const a = analyzeToken(n, { start: true });
        if (a[0]?.how === "word" || a[0]?.how === "free" || GLOBAL_NAMES.has(n.toLowerCase())) continue; // từ thường viết hoa đầu lời nói / địa danh quen
        if (!vi[k].includes(n)) warns.push(`dòng ${j.i + 1}: tên "${n}" không còn trong bản dịch`);
      }
    });
  }
  let errs = [];
  if (kind === "quiz") ({ out: lines, errs } = expandQuotes(lines));
  writeFileSync(file, lines.join("\n"));
  const left = lines.filter((l) => / \| ~$/.test(l)).length;
  console.log(`${relative(ROOT, file)}: ${stub ? "giữ chỗ" : "dịch"} ${jobs.length} dòng${left && !stub ? ` · còn ${left} dòng "~" (máy trả nguyên văn — dịch tay)` : ""}${warns.length ? `\n  ! ${warns.join("\n  ! ")}` : ""}${errs.length ? `\n  LỖI trích: ${errs.join("\n  LỖI trích: ")}` : ""}`);
}

function show(file) {
  const lines = readFileSync(file, "utf8").split("\n");
  const out = [`# ${relative(ROOT, file)}`];
  lines.forEach((t, i) => {
    if (/^>|^===/.test(t)) return;
    const k = t.indexOf(" | ");
    if (k < 0 || isMeta(t)) return;
    out.push(`${i + 1}|${t.slice(0, k).replace(/^(title: |[?+-] )/, "")} ⟶ ${t.slice(k + 3)}`);
  });
  console.log(out.join("\n"));
}

function fix(file) {
  const input = readFileSync(0, "utf8");
  const lines = readFileSync(file, "utf8").split("\n");
  let n = 0;
  for (const row of input.split("\n")) {
    const m = /^(\d+)\|(.*)$/.exec(row.trim());
    if (!m) continue;
    const i = Number(m[1]) - 1;
    const t = lines[i];
    if (t === undefined) throw new Error(`dòng ${m[1]} không có`);
    if (!t.includes(" | ")) throw new Error(`dòng ${m[1]} chưa có bản dịch: ${t.slice(0, 60)}`);
    lines[i] = `${t.slice(0, t.indexOf(" | "))} | ${m[2].trim()}`;
    n++;
  }
  writeFileSync(file, lines.join("\n"));
  console.log(`${relative(ROOT, file)}: sửa ${n} dòng`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const paths = files.map((f) => resolve(f));
  if (cmd === "fill" || cmd === "stub")
    for (const f of paths) {
      try {
        fill(f, cmd === "stub");
      } catch (e) {
        console.log(`${relative(ROOT, f)}: ${e.message}`);
        process.exitCode = 1;
      }
    }
  else if (cmd === "vi") paths.forEach(show);
  else if (cmd === "fix") fix(paths[0]);
  else {
    console.log("dùng: content-mt.mjs fill|vi|fix <file>…");
    process.exit(1);
  }
}
