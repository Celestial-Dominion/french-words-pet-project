// Lập danh sách đổi cấp theo FLELex-Beacco từ scripts/out/flelex-compare.json (chạy flelex-compare.mjs trước).
//
// Luật: lệch ≥ MIN_GAP cấp → lấy cấp FLELex. Bỏ qua: từ chức năng (FLELex gắn từ loại khác app),
// seed A1 + lộ trình khởi động (lib/starter.ts), từ mà FLELex không có dòng cùng từ loại chính.
//
// Chạy: node scripts/flelex-overrides.mjs            → ghi scripts/level-overrides.json, in thống kê
//       node scripts/flelex-overrides.mjs --dry      → chỉ in thống kê
// Áp dụng vào dữ liệu: node scripts/apply-level-overrides.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE = join(HERE, "..");
const NAME = ["", "A1", "A2", "B1", "B2", "C1", "C2"];
const MIN_GAP = Number(process.argv[process.argv.indexOf("--gap") + 1]) || 2;
const FUNCTION_POS = new Set(["num", "art", "det", "pron", "prep", "conj", "vaux"]);
const TAG = { n: "NOM", v: "VER", adj: "ADJ", adv: "ADV", onom: "INT" };

// seed A1 (build-level-assign.mjs) + lộ trình khởi động (lib/starter.ts): giữ nguyên A1
const assignSrc = readFileSync(join(HERE, "build-level-assign.mjs"), "utf8");
const seedBlock = assignSrc.slice(assignSrc.indexOf("const A1_SEED"), assignSrc.indexOf("]);", assignSrc.indexOf("const A1_SEED")));
const starterSrc = readFileSync(join(CODE, "lib/starter.ts"), "utf8");
const starterBlock = starterSrc.slice(starterSrc.indexOf("STARTER_IDS"), starterSrc.indexOf("];", starterSrc.indexOf("STARTER_IDS")));
const KEEP = new Set([...`${seedBlock}\n${starterBlock}`.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
// FLELex lệch rõ với giáo trình FLE (gắn nhầm nghĩa/dạng: anglais = tiếng Anh A1, lunettes, c'est fermé, et demie…) → giữ cấp cũ
for (const id of ["anglais", "lunette", "fermé", "demi", "chauffeur", "docteur", "juif"]) KEEP.add(id);
// cấp FLELex thấp do truyện/bài trong giáo trình, không phải từ cơ bản → giữ cấp cũ
for (const id of ["héler", "sénéchal", "sire", "chandelier", "pirogue", "écu", "mule"]) KEEP.add(id);
// A1 chỉ vì một giáo trình dùng dồn (A1 ~30–55, A2 trở lên gần 0) hoặc khác nghĩa (solde = số dư, giáo trình: les soldes) → giữ cấp cũ.
// (Lọc tự động theo tỉ lệ A2/A1 thì bắt nhầm cả từ A1 thật: internet, euro, maths, confiture.)
for (const id of ["coopération", "inauguration", "antiquité", "solde"]) KEEP.add(id);

// Đẩy LÊN: FLELex xếp C1–C2 cả từ đời thường chỉ vì giáo trình ít dùng (araignée, violon, coussin…) →
// chỉ đẩy lên từ đang ở A1/A2: từ tục/khẩu ngữ lấy cấp FLELex, từ khác tối đa B1; từ B1 trở lên giữ nguyên.
const REG = new Set(["vulgar", "offensive", "slang", "informal"]);
const informal = new Set(["merde", "foutre", "gueule", "connerie", "emmerder", "salaud", "putain", "con", "flic", "truc", "nana", "péter", "bouffe", "draguer", "minable", "drôlement", "pipi"]);
for (const lv of ["a1", "a2", "b1", "b2", "c1", "c2"]) {
  for (const w of JSON.parse(readFileSync(join(CODE, `public/data/words/${lv}.json`), "utf8"))) if (w.register?.some((r) => REG.has(r))) informal.add(w.id);
}

const rows = JSON.parse(readFileSync(join(HERE, "out/flelex-compare.json"), "utf8"));
const overrides = {};
const skip = { keep: 0, func: 0, tag: 0, up: 0 };
for (const r of rows) {
  if (Math.abs(r.app - r.fl) < MIN_GAP) continue;
  if (KEEP.has(r.id)) { skip.keep++; continue; }
  if (FUNCTION_POS.has(r.pos)) { skip.func++; continue; }
  if (!TAG[r.pos] || !r.tag.startsWith(TAG[r.pos])) { skip.tag++; continue; }
  if (r.fl > r.app) {
    if (r.app >= 3) { skip.up++; continue; }
    overrides[r.id] = { from: r.app, to: informal.has(r.id) ? r.fl : Math.min(r.fl, 3) };
    continue;
  }
  overrides[r.id] = { from: r.app, to: r.fl };
}

const list = Object.entries(overrides);
const down = list.filter(([, o]) => o.to < o.from).length;
console.log(`Đổi cấp: ${list.length} từ (xuống ${down}, lên ${list.length - down}) · bỏ qua: giữ A1 ${skip.keep}, từ chức năng ${skip.func}, lệch từ loại ${skip.tag}, lên từ B1+ ${skip.up}`);
const size = [0, 0, 0, 0, 0, 0, 0];
const levels = JSON.parse(readFileSync(join(CODE, "public/data/word-levels.json"), "utf8"));
const OVR = join(HERE, "level-overrides.json");
if (existsSync(OVR)) for (const [id, o] of Object.entries(JSON.parse(readFileSync(OVR, "utf8")))) if (id in levels) levels[id] = o.from;
for (const [id, lv] of Object.entries(levels)) size[overrides[id]?.to ?? lv]++;
console.log("Số từ/cấp sau khi đổi: " + NAME.slice(1).map((n, i) => `${n} ${size[i + 1]}`).join(" · "));
if (!process.argv.includes("--dry")) {
  writeFileSync(join(HERE, "level-overrides.json"), JSON.stringify(Object.fromEntries(list.sort(([a], [b]) => a.localeCompare(b, "fr"))), null, 0).replace(/},"/g, '},\n"'));
  console.log("→ scripts/level-overrides.json");
}
