// Gộp toàn bộ scripts/out/vi-out/*.json vào scripts/out/meanings-vi.json (idempotent).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out/vi-out");
const merged = {};
let files = 0;
for (const fn of readdirSync(OUT).filter((f) => f.endsWith(".json"))) {
  const o = JSON.parse(readFileSync(join(OUT, fn), "utf8"));
  for (const [k, v] of Object.entries(o)) merged[k] = v;
  files++;
}
writeFileSync(join(HERE, "out/meanings-vi.json"), JSON.stringify(merged));
console.log(`Gộp ${files} file → ${Object.keys(merged).length} nghĩa.`);
