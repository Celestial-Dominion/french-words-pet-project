// Bỏ "gloss thừa" (từ đã ở cấp ≤ cấp bài + 1, sau khi đổi cấp từ) khỏi dòng `gloss:` của bài đọc/truyện.
// Đọc cảnh báo của check-content.mjs cho mọi cấp × loại, sửa thẳng file nguồn content/<loại>/<cấp>/*.txt.
// Dòng gloss: còn rỗng thì xoá cả dòng.
//
// Chạy: node scripts/fix-gloss-extra.mjs

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE = join(HERE, "..");
let total = 0;
for (const [type, dir] of [["reading", "readings"], ["story", "stories"]]) {
  for (const lv of ["a1", "a2", "b1", "b2", "c1", "c2"]) {
    let out = "";
    try {
      out = execFileSync(process.execPath, ["--no-warnings", join(HERE, "check-content.mjs"), "--level", lv, "--type", type], { encoding: "utf8", maxBuffer: 1 << 26 });
    } catch (e) {
      out = e.stdout ?? "";
    }
    /** id → Set(từ cần bỏ) */
    const drop = new Map();
    let cur = null;
    for (const line of out.split("\n")) {
      const id = /^ {2}(\S+)$/.exec(line);
      if (id) cur = id[1];
      const g = /gloss thừa \([^)]*\): (.+)$/.exec(line);
      if (g && cur) for (const w of g[1].split(",").map((x) => x.trim()).filter(Boolean)) (drop.get(cur) ?? drop.set(cur, new Set()).get(cur)).add(w);
    }
    if (!drop.size) continue;
    const folder = join(CODE, "content", dir, lv);
    for (const f of readdirSync(folder).filter((x) => x.endsWith(".txt"))) {
      const path = join(folder, f);
      const L = readFileSync(path, "utf8").split("\n");
      let id = null;
      let changed = false;
      for (let i = 0; i < L.length; i++) {
        const m = /^=== (\S+)/.exec(L[i]);
        if (m) id = m[1];
        if (!id || !drop.has(id) || !L[i].startsWith("gloss:")) continue;
        const words = L[i].slice(6).split(",").map((x) => x.trim()).filter(Boolean);
        const keep = words.filter((w) => !drop.get(id).has(w));
        if (keep.length === words.length) continue;
        total += words.length - keep.length;
        changed = true;
        if (keep.length) L[i] = `gloss: ${keep.join(", ")}`;
        else L.splice(i--, 1);
      }
      if (changed) writeFileSync(path, L.join("\n"));
    }
  }
}
console.log("đã bỏ gloss thừa:", total);
