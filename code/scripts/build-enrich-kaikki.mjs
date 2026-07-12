// F1b — Làm giàu lemma từ kaikki.org (Wiktextract FR): IPA + nghĩa EN + bảng chia động từ.
//
// Vào:  scripts/kaikki-fr.jsonl (560MB, stream từng dòng)
//       scripts/out/lemmas.json (tập lemma đã chọn ở F1a)
// Ra:   scripts/out/enrich.json                 (lemma -> { ipa, glosses[], aux, group })
//       public/data/conjugations/{lemma}.json   (bảng chia cho verb)
//
// Chỉ giữ entry có word ∈ tập lemma. Bỏ nghĩa dạng "inflection of…", "plural of…" (không phải nghĩa gốc).

import { createReadStream, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE = join(HERE, "..");
const CONJ_DIR = join(CODE, "public/data/conjugations");
mkdirSync(CONJ_DIR, { recursive: true });

const lemmas = JSON.parse(readFileSync(join(HERE, "out/lemmas.json"), "utf8"));
const wantSet = new Set(lemmas.map((r) => r.id.normalize("NFC")));

// Bỏ nghĩa "form-of" (không phải định nghĩa thật của lemma).
const FORM_OF = /^(inflection|plural|feminine|masculine|past participle|present participle|gerund|singular|vocative|comparative|superlative) of /i;

// person/number tag -> chỉ số ngôi (je tu il nous vous ils).
function personIdx(tags) {
  const s = new Set(tags);
  const sg = s.has("singular");
  const pl = s.has("plural");
  if (s.has("first-person")) return sg ? 0 : pl ? 3 : null;
  if (s.has("second-person")) return sg ? 1 : pl ? 4 : null;
  if (s.has("third-person")) return sg ? 2 : pl ? 5 : null;
  return null;
}

// Trợ động từ chia thì hiện tại (để dựng passé composé).
const AUX_PRESENT = {
  avoir: ["ai", "as", "a", "avons", "avez", "ont"],
  être: ["suis", "es", "est", "sommes", "êtes", "sont"],
};
const SUBJECT = ["je", "tu", "il", "nous", "vous", "ils"];

const ipaByLemma = new Map(); // lemma -> ipa "/…/"
const glossesByLemma = new Map(); // lemma -> string[]
const genderByLemma = new Map(); // lemma -> "m" | "f"
const verbData = new Map(); // lemma -> { present, imparfait, futur, pp, aux }

// Trích giống từ head_templates: "chien m (plural …)", "table f (…)".
function parseGender(word, o) {
  if (o.pos !== "noun" || !Array.isArray(o.head_templates)) return;
  for (const h of o.head_templates) {
    const exp = h.expansion || "";
    const m = exp.match(/\s+(m|f)\b/);
    if (m && exp.startsWith(word)) {
      if (!genderByLemma.has(word)) genderByLemma.set(word, m[1]);
      return;
    }
  }
}

function cleanIpa(ipa) {
  if (!ipa) return "";
  // bỏ dấu chấm ngăn âm tiết, khoảng trắng thừa; giữ dấu /.../.
  let s = ipa.trim().replace(/\./g, "");
  if (!s.startsWith("/") && !s.startsWith("[")) s = `/${s}/`;
  return s;
}

const rl = createInterface({ input: createReadStream(join(HERE, "kaikki-fr.jsonl")), crlfDelay: Infinity });

let seen = 0;
for await (const line of rl) {
  if (!line) continue;
  let o;
  try {
    o = JSON.parse(line);
  } catch {
    continue;
  }
  if (o.lang_code !== "fr" || !o.word) continue;
  const word = o.word.normalize("NFC");
  if (!wantSet.has(word)) continue;
  seen++;

  parseGender(word, o);

  // IPA: lấy cái đầu tiên hợp lệ (ưu tiên entry nào có trước).
  if (!ipaByLemma.has(word) && Array.isArray(o.sounds)) {
    const withIpa = o.sounds.find((s) => s.ipa);
    if (withIpa) ipaByLemma.set(word, cleanIpa(withIpa.ipa));
  }

  // Nghĩa EN: gom glosses không phải form-of.
  if (Array.isArray(o.senses)) {
    const cur = glossesByLemma.get(word) || [];
    for (const sense of o.senses) {
      for (const g of sense.glosses || []) {
        if (FORM_OF.test(g)) continue;
        const gg = g.replace(/:$/, "").trim();
        if (gg && !cur.includes(gg)) cur.push(gg);
      }
    }
    if (cur.length) glossesByLemma.set(word, cur.slice(0, 6));
  }

  // Bảng chia (chỉ verb có forms conjugation).
  if (o.pos === "verb" && Array.isArray(o.forms) && o.forms.length > 5 && !verbData.has(word)) {
    const present = Array(6).fill(""), imparfait = Array(6).fill(""), futur = Array(6).fill("");
    let pp = "", aux = "avoir";
    for (const f of o.forms) {
      const tags = f.tags || [];
      const t = new Set(tags);
      if (t.has("multiword-construction")) {
        if (/^être /.test(f.form)) aux = "être";
        continue;
      }
      if (t.has("participle") && t.has("past") && !pp) pp = f.form;
      if (!t.has("indicative")) continue;
      if (t.has("subjunctive") || t.has("conditional") || t.has("imperative")) continue;
      const idx = personIdx(tags);
      if (idx == null) continue;
      if (t.has("present") && !present[idx]) present[idx] = f.form;
      else if (t.has("imperfect") && !imparfait[idx]) imparfait[idx] = f.form;
      else if (t.has("future") && !futur[idx]) futur[idx] = f.form;
    }
    verbData.set(word, { present, imparfait, futur, pp, aux });
  }
}
rl.close();

// ---- Ghi conjugation files + gom metadata verb ----
const verbMeta = new Map(); // lemma -> { aux, group }
let conjCount = 0;
for (const [lemma, v] of verbData) {
  const hasPresent = v.present.some(Boolean);
  if (!hasPresent) continue;
  // passé composé = aux(présent) + past participle (không xử lý hợp giống — hiển thị học tập).
  const auxPres = AUX_PRESENT[v.aux] || AUX_PRESENT.avoir;
  const isVowel = (c) => "aeiouyéèêàâîïôûh".includes((c || "").toLowerCase());
  const passeCompose = v.pp
    ? auxPres.map((a, i) => {
        // ngôi "je" + trợ động từ bắt đầu bằng nguyên âm → élision "j'ai".
        const subj = i === 0 && isVowel(a[0]) ? "j'" : `${SUBJECT[i]} `;
        return `${subj}${a} ${v.pp}`;
      })
    : [];
  // nhóm động từ: -ir + hiện tại "nous" chứa "iss" => nhóm 2; -er => 1; còn lại 3.
  let group;
  if (lemma.endsWith("er") && lemma !== "aller") group = 1;
  else if (lemma.endsWith("ir") && /iss/.test(v.present[3] || "")) group = 2;
  else group = 3;

  const tenses = {
    present: v.present,
    imparfait: v.imparfait,
    futur: v.futur,
  };
  if (passeCompose.length) tenses.passe_compose = passeCompose;

  const out = { lemma, group, irregular: group === 3 || undefined, tenses };
  writeFileSync(join(CONJ_DIR, `${lemma.normalize("NFC")}.json`), JSON.stringify(out));
  verbMeta.set(lemma, { aux: v.aux, group });
  conjCount++;
}

// ---- enrich.json ----
const enrich = {};
for (const r of lemmas) {
  const id = r.id.normalize("NFC");
  const e = {};
  const ipa = ipaByLemma.get(id);
  if (ipa) e.ipa = ipa;
  const gl = glossesByLemma.get(id);
  if (gl && gl.length) e.glosses = gl;
  const g = genderByLemma.get(id);
  if (g) e.gender = g;
  const vm = verbMeta.get(id);
  if (vm) {
    e.aux = vm.aux;
    e.group = vm.group;
  }
  if (Object.keys(e).length) enrich[r.id] = e;
}
writeFileSync(join(HERE, "out/enrich.json"), JSON.stringify(enrich));

// ---- Thống kê ----
const withIpa = lemmas.filter((r) => enrich[r.id]?.ipa).length;
const withGloss = lemmas.filter((r) => enrich[r.id]?.glosses).length;
console.log("Entry fr khớp lemma:", seen.toLocaleString());
console.log("Lemma có IPA (kaikki):", withIpa.toLocaleString(), `/ ${lemmas.length}`);
console.log("Lemma có nghĩa EN:", withGloss.toLocaleString(), `/ ${lemmas.length}`);
console.log("File conjugation đã ghi:", conjCount.toLocaleString());
