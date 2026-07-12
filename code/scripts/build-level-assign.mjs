// F1a — Gán cấp CEFR cho lemma tiếng Pháp từ Lexique 3.83.
//
// Vào:  scripts/Lexique383.tsv
// Ra:   scripts/out/lemmas.json         (mảng lemma đã chọn + cấp + freq + pos + gender + forms + phon)
//       public/data/lemma-map.json      (dạng biến hình -> lemma, gồm elision/mạo từ rút gọn)
//       public/data/word-levels.json    (id -> level)
//
// Deterministic, không dùng agent. Xương sống = tần suất trộn 0.6*phim + 0.4*sách (Lexique).
// FLELex / Français fondamental: KHÔNG lệ thuộc (plan mục 5) — A1 seed bằng chủ đề bắt buộc + tần suất.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE = join(HERE, "..");
const OUT = join(HERE, "out");
mkdirSync(OUT, { recursive: true });

// ---- Số từ mục tiêu mỗi cấp (plan mục 1.2) ----
const BANDS = [
  { level: 1, cefr: "a1", n: 800 },
  { level: 2, cefr: "a2", n: 1200 },
  { level: 3, cefr: "b1", n: 2000 },
  { level: 4, cefr: "b2", n: 2500 },
  { level: 5, cefr: "c1", n: 3000 },
  { level: 6, cefr: "c2", n: 1500 },
];
const TOTAL = BANDS.reduce((s, b) => s + b.n, 0); // 11000

// ---- Map cgram (Lexique) -> mã pos của app (lib/pos.ts) ----
function mapPos(cgram) {
  if (!cgram) return null;
  if (cgram === "VER") return "v";
  if (cgram === "AUX") return "vaux";
  if (cgram === "NOM") return "n";
  if (cgram === "ADJ") return "adj";
  if (cgram === "ADV") return "adv";
  if (cgram === "ADJ:num") return "num";
  if (cgram === "PRE") return "prep";
  if (cgram === "CON") return "conj";
  if (cgram.startsWith("PRO")) return "pron";
  if (cgram.startsWith("ART")) return "art";
  if (cgram === "ONO") return "onom";
  if (cgram.startsWith("ADJ:")) return "det"; // ind/pos/dem/int
  return null; // LIA, rỗng…
}

// Lemma hợp lệ: chữ Latin có dấu + ' - , không số, không khoảng trắng, dài >=1.
const VALID = /^[a-zàâäçéèêëîïôöùûüÿœæ'’-]+$/i;

// ---- Đọc & gom theo lemma ----
const raw = readFileSync(join(HERE, "Lexique383.tsv"), "utf8").split("\n");
const header = raw[0].split("\t");
const col = Object.fromEntries(header.map((h, i) => [h, i]));

/** lemma -> { posSet, gender, plural, freqFilms, freqLivres, forms:Set, phon, verbInfo } */
const byLemma = new Map();

for (let i = 1; i < raw.length; i++) {
  const line = raw[i];
  if (!line) continue;
  const f = line.split("\t");
  const lemme = f[col.lemme];
  const ortho = f[col.ortho];
  const cgram = f[col.cgram];
  if (!lemme || !VALID.test(lemme)) continue;
  const pos = mapPos(cgram);
  if (!pos) continue;

  let rec = byLemma.get(lemme);
  if (!rec) {
    rec = {
      lemma: lemme,
      posSet: new Set(),
      posFreq: new Map(), // pos -> tổng tần suất form, để xác định từ loại chính
      gender: undefined,
      plural: undefined,
      pluralCands: [], // {o, genre} — chốt sau khi biết giống
      freqFilms: 0,
      freqLivres: 0,
      forms: new Set(),
      phon: f[col.phon] || "",
      isVerb: false,
    };
    byLemma.set(lemme, rec);
  }
  rec.posSet.add(pos);
  if (pos === "v" || pos === "vaux") rec.isVerb = true;
  // tần suất form (col freqfilms2 + freqlivres) cộng dồn theo pos → xác định từ loại chính.
  const formFreq = (parseFloat(f[col.freqfilms2]) || 0) + (parseFloat(f[col.freqlivres]) || 0);
  rec.posFreq.set(pos, (rec.posFreq.get(pos) || 0) + formFreq);
  // phon của ĐÚNG dạng gốc (ortho == lemme), không phải dạng chia — IPA fallback mới đúng.
  if (ortho && ortho.toLowerCase() === lemme.toLowerCase() && f[col.phon]) {
    rec.phonLemma = f[col.phon];
  }
  // freq lemma-level giống nhau mọi hàng của lemma → lấy max cho chắc.
  rec.freqFilms = Math.max(rec.freqFilms, parseFloat(f[col.freqlemfilms2]) || 0);
  rec.freqLivres = Math.max(rec.freqLivres, parseFloat(f[col.freqlemlivres]) || 0);
  if (ortho && VALID.test(ortho)) rec.forms.add(ortho.toLowerCase());

  // giống + số nhiều bất quy tắc từ hàng NOM
  if (cgram === "NOM") {
    const genre = f[col.genre];
    const nombre = f[col.nombre];
    if ((genre === "m" || genre === "f") && !rec.gender) rec.gender = genre;
    if (nombre === "p" && ortho) {
      rec.pluralCands.push({ o: ortho.toLowerCase(), genre });
    }
  }
}

// Từ loại chính = pos có tần suất cao nhất. Sắp xếp pos giảm dần theo tần suất.
for (const r of byLemma.values()) {
  r.posOrdered = [...r.posSet].sort((a, b) => (r.posFreq.get(b) || 0) - (r.posFreq.get(a) || 0));
  r.primaryPos = r.posOrdered[0];
}

// Giống chỉ giữ khi từ loại CHÍNH là danh từ (bỏ nhiễu "donner(m)", "long(m)", "surtout(m)"…).
for (const r of byLemma.values()) {
  if (r.gender && r.primaryPos !== "n") r.gender = undefined;
}

// Chốt số nhiều bất quy tắc: chỉ cho danh từ CHÍNH (không kiêm tính từ),
// ứng viên phải khớp giống của lemma, khác "+s"/"+es" và khác chính lemma (loại bất biến).
for (const r of byLemma.values()) {
  if (r.primaryPos !== "n" || r.posSet.has("adj")) continue;
  const l = r.lemma.toLowerCase();
  const cand = r.pluralCands.find(
    (c) =>
      (c.genre === r.gender || c.genre === "") &&
      c.o !== l &&
      c.o !== l + "s" &&
      c.o !== l + "es"
  );
  if (cand) r.plural = cand.o;
}

// ---- Tần suất trộn + lọc ----
const blended = (r) => 0.6 * r.freqFilms + 0.4 * r.freqLivres;

let lemmas = [...byLemma.values()].filter((r) => blended(r) > 0);
lemmas.sort((a, b) => blended(b) - blended(a));

// ---- Seed chủ đề bắt buộc A1 (ép vào A1 dù tần suất không đủ top-800) ----
const A1_SEED = new Set([
  // số đếm
  "un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize",
  "quatorze","quinze","seize","vingt","trente","quarante","cinquante","cent","mille","zéro","premier",
  // chào hỏi / lịch sự
  "bonjour","bonsoir","salut","merci","pardon","oui","non","monsieur","madame","mademoiselle",
  "au revoir","s'il","enchanté",
  // gia đình
  "famille","père","mère","parent","frère","sœur","fils","fille","enfant","bébé","mari","femme",
  "grand-père","grand-mère","oncle","tante","cousin",
  // ăn uống
  "manger","boire","eau","pain","lait","café","thé","vin","fromage","viande","poisson","fruit",
  "légume","pomme","œuf","riz","sucre","sel","repas","petit-déjeuner","déjeuner","dîner",
  // thời gian
  "jour","semaine","mois","année","an","heure","minute","matin","soir","nuit","midi","aujourd'hui",
  "demain","hier","lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche",
  "janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre",
  // đại từ / hạn định cơ bản
  "je","tu","il","elle","nous","vous","ils","elles","on","me","te","se","le","la","les","mon","ton",
  "son","ce","cette","qui","que","quoi","où","quand","comment","pourquoi","combien",
  // động từ lõi
  "être","avoir","aller","faire","dire","pouvoir","vouloir","voir","savoir","venir","devoir","prendre",
  "donner","parler","aimer","trouver","passer","mettre","demander","rester","comprendre","connaître",
  "penser","habiter","travailler","étudier","acheter","payer","chercher","appeler","écouter","regarder",
  "lire","écrire","dormir","sortir","entrer","monter","descendre","ouvrir","fermer","commencer","finir",
  // cơ thể / nhà / cơ bản
  "maison","école","chambre","cuisine","porte","table","chaise","lit","livre","stylo","voiture",
  "rue","ville","pays","homme","garçon","chat","chien","main","tête","yeux","cœur",
  // tính từ cơ bản
  "grand","petit","bon","mauvais","beau","joli","nouveau","vieux","jeune","chaud","froid","content",
  "facile","difficile","cher","gratuit",
]);

// đánh dấu seed nếu lemma tồn tại trong Lexique
const present = new Map(lemmas.map((r) => [r.lemma, r]));
const seedRecs = [];
for (const s of A1_SEED) {
  const r = present.get(s);
  if (r) {
    r._seed = true;
    seedRecs.push(r);
  }
}

// ---- Chọn top TOTAL theo tần suất, đảm bảo seed nằm trong tập ----
const selected = [];
const inSel = new Set();
for (const r of lemmas) {
  if (selected.length >= TOTAL) break;
  selected.push(r);
  inSel.add(r.lemma);
}
// bổ sung seed nào bị rớt khỏi top
for (const r of seedRecs) {
  if (!inSel.has(r.lemma)) {
    selected.push(r);
    inSel.add(r.lemma);
  }
}

// ---- Gán cấp ----
// 1) seed A1 => cấp 1.  2) còn lại xếp theo tần suất giảm dần vào các band còn chỗ.
const nonSeed = selected.filter((r) => !r._seed).sort((a, b) => blended(b) - blended(a));
const seeded = selected.filter((r) => r._seed);

const capacity = BANDS.map((b) => b.n);
capacity[0] -= seeded.length; // A1 đã dùng chỗ cho seed
if (capacity[0] < 0) capacity[0] = 0;

const assign = new Map();
for (const r of seeded) assign.set(r.lemma, 1);

let bi = 0;
for (const r of nonSeed) {
  while (bi < capacity.length && capacity[bi] <= 0) bi++;
  const level = bi < capacity.length ? BANDS[bi].level : 6;
  assign.set(r.lemma, level);
  if (bi < capacity.length) capacity[bi]--;
}

// ---- verb_group heuristic (tinh chỉnh lại ở bước kaikki) ----
function verbGroup(r) {
  if (!r.isVerb) return undefined;
  const l = r.lemma;
  if (l === "aller") return 3;
  if (l.endsWith("er")) return 1;
  if (l.endsWith("ir")) return 2; // tạm; kaikki sẽ sửa nhóm 3 (venir, tenir…)
  return 3;
}

// ---- Xuất lemmas.json ----
const outLemmas = selected
  .map((r) => ({
    id: r.lemma,
    level: assign.get(r.lemma),
    frequency: Math.round(blended(r) * 100) / 100,
    pos: r.posOrdered,
    gender: r.gender,
    plural: r.plural,
    verb_group: verbGroup(r),
    forms: [...r.forms].sort(),
    phon_lexique: r.phonLemma || r.phon,
    seed: r._seed || undefined,
  }))
  .sort((a, b) => a.level - b.level || b.frequency - a.frequency);

writeFileSync(join(OUT, "lemmas.json"), JSON.stringify(outLemmas));

// ---- lemma-map.json: form -> lemma (+ elision & mạo từ rút gọn thủ công) ----
// Ưu tiên TẦN SUẤT: lemma tần suất cao giành form dùng chung trước.
// → dạng chia của động từ phổ biến (est→être, a→avoir, pris→prendre) thắng đồng âm hiếm (est=hướng đông…).
const lemmaMap = {};
const byFreqDesc = [...selected].sort((a, b) => blended(b) - blended(a));
for (const r of byFreqDesc) {
  const cit = r.lemma.toLowerCase();
  if (!(cit in lemmaMap)) lemmaMap[cit] = r.lemma; // dạng gốc trỏ về chính nó (nếu chưa bị lemma tần suất cao hơn giành)
  for (const form of r.forms) {
    if (!(form in lemmaMap)) lemmaMap[form] = r.lemma;
  }
}

// elision & cụm rút gọn hay gặp khi đọc (reader bấm-tra)
Object.assign(lemmaMap, {
  "l'": "le", "d'": "de", "j'": "je", "n'": "ne", "qu'": "que",
  "c'": "ce", "s'": "se", "m'": "me", "t'": "te",
  "au": "le", "aux": "les", "du": "de", "des": "de",
});
writeFileSync(join(CODE, "public/data/lemma-map.json"), JSON.stringify(lemmaMap));

// ---- word-levels.json ----
const wordLevels = {};
for (const r of outLemmas) wordLevels[r.id] = r.level;
writeFileSync(join(CODE, "public/data/word-levels.json"), JSON.stringify(wordLevels));

// ---- Thống kê ----
const byLevel = {};
for (const r of outLemmas) byLevel[r.level] = (byLevel[r.level] || 0) + 1;
console.log("Tổng lemma trong Lexique có freq>0:", lemmas.length.toLocaleString());
console.log("Đã chọn:", outLemmas.length.toLocaleString(), "(mục tiêu", TOTAL + ")");
console.log("Seed A1 khớp Lexique:", seeded.length);
console.log("Số lemma / cấp:", JSON.stringify(byLevel));
console.log("lemma-map entries:", Object.keys(lemmaMap).length.toLocaleString());
console.log("Mẫu A1 (10 đầu):", outLemmas.filter((r) => r.level === 1).slice(0, 10).map((r) => r.id).join(", "));
