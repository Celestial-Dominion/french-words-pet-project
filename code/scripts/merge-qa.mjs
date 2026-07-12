// Áp dụng chỉnh sửa QA (scripts/out/qa-out/*.json) vào scripts/out/meanings-vi.json.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const viPath = join(HERE, "out/meanings-vi.json");
const vi = JSON.parse(readFileSync(viPath, "utf8"));
const OUT = join(HERE, "out/qa-out");

let files = 0, fixes = 0;
const log = [];
for (const fn of readdirSync(OUT).filter((f) => f.endsWith(".json"))) {
  const o = JSON.parse(readFileSync(join(OUT, fn), "utf8"));
  files++;
  for (const [id, corr] of Object.entries(o)) {
    if (!corr || !corr.vi) continue;
    const prev = typeof vi[id] === "string" ? vi[id] : vi[id]?.vi;
    const entry = typeof vi[id] === "object" && vi[id] ? { ...vi[id] } : { vi: prev || "", en: [] };
    entry.vi = corr.vi;
    if (corr.en) entry.en = Array.isArray(corr.en) ? corr.en : [corr.en];
    vi[id] = entry;
    fixes++;
    log.push(`${id}: "${prev}" → "${corr.vi}"`);
  }
}
writeFileSync(viPath, JSON.stringify(vi));
console.log(`Đọc ${files} file QA · áp dụng ${fixes} chỉnh sửa:`);
for (const l of log) console.log("  " + l);
