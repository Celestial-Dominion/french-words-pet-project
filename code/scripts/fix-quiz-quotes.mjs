// Sau khi viết lại câu trong bài đọc/truyện (content/readings|stories/<cấp>/*.txt), cập nhật các trích dẫn
// «…» trong content/quiz/<cấp>/*.txt đang trích nguyên câu cũ. So từng câu với bản git HEAD (chỉ dùng khi
// sửa câu tại chỗ, không thêm/bớt câu); trích dẫn là một đoạn câu thì dóng theo ký tự
// (nên xem lại đoạn mới bằng bộ kiểm).
//
// Chạy: node scripts/fix-quiz-quotes.mjs <cấp> [<cấp> …]

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE = join(HERE, "..");
const fr = (line) => line.split("|")[0].trim();

// trích dẫn là một đoạn của câu cũ → đoạn tương ứng trong câu mới (dóng ký tự theo LCS)
function mapPart(o, n, q) {
  const p = o.indexOf(q);
  if (p < 0) return null;
  const D = Array.from({ length: o.length + 1 }, () => new Int32Array(n.length + 1));
  for (let i = o.length - 1; i >= 0; i--) for (let j = n.length - 1; j >= 0; j--) D[i][j] = o[i] === n[j] ? D[i + 1][j + 1] + 1 : Math.max(D[i + 1][j], D[i][j + 1]);
  const at = new Int32Array(o.length + 1).fill(-1);
  let i = 0, j = 0;
  while (i < o.length && j < n.length) {
    if (o[i] === n[j]) { at[i] = j; i++; j++; } else if (D[i + 1][j] >= D[i][j + 1]) i++; else j++;
  }
  at[o.length] = n.length;
  const s = at[p], e = p + q.length - 1 < o.length ? at[p + q.length - 1] : -1;
  if (s < 0 || e < 0) return null;
  const r = n.slice(s, e + 1);
  return n.includes(r) ? r : null;
}

for (const lv of process.argv.slice(2)) {
  /** câu cũ → câu mới */
  const map = new Map();
  for (const dir of ["readings", "stories"]) {
    const folder = join(CODE, "content", dir, lv);
    if (!existsSync(folder)) continue;
    for (const f of readdirSync(folder).filter((x) => x.endsWith(".txt"))) {
      const rel = `code/content/${dir}/${lv}/${f}`;
      let old;
      try {
        old = execFileSync("git", ["show", `HEAD:${rel}`], { cwd: CODE, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n");
      } catch {
        continue;
      }
      // chỉ so các dòng câu "FR | VI" (dòng gloss: bị xoá không làm lệch)
      old = old.filter((x) => x.includes("|"));
      const cur = readFileSync(join(folder, f), "utf8").split("\n").filter((x) => x.includes("|"));
      if (old.length !== cur.length) { console.log(`bỏ qua ${dir}/${lv}/${f}: số câu khác HEAD`); continue; }
      for (let i = 0; i < cur.length; i++) if (fr(cur[i]) !== fr(old[i])) map.set(fr(old[i]), fr(cur[i]));
    }
  }
  const qdir = join(CODE, "content", "quiz", lv);
  let n = 0;
  if (map.size && existsSync(qdir)) {
    for (const f of readdirSync(qdir).filter((x) => x.endsWith(".txt"))) {
      const path = join(qdir, f);
      const s = readFileSync(path, "utf8");
      const t = s.replace(/«([^»]+)»/g, (all, q) => {
        if (map.has(q)) return n++, `«${map.get(q)}»`;
        for (const [o, nw] of map) {
          if (!o.includes(q) || nw.includes(q)) continue;
          const r = mapPart(o, nw, q);
          if (r) return n++, `«${r}»`;
        }
        return all;
      });
      if (t !== s) writeFileSync(path, t);
    }
  }
  console.log(`${lv}: ${map.size} câu đã sửa · cập nhật ${n} trích dẫn`);
}
