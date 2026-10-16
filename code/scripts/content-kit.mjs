// Bộ công cụ soạn nhanh, ít token (port app Anh, docs/CONTENT_PLAYBOOK.md §16).
//   node scripts/content-kit.mjs need <cấp> [k=3] [N=120] [--re <regex nghĩa VI/EN>]
//        từ đích của cấp đang gặp < k bài (cấp ≤ L), thường gặp trước — để gom một bài theo cụm chủ đề.
//        In "từ(số bài) nghĩa" gọn một dòng/từ.
//   node scripts/content-kit.mjs dens <id|đoạn-tên-file>… [--k 3]
//        mỗi bài: số từ · câu TB · % từ đúng cấp · % vượt cấp · số từ "thiếu" (< k bài) bài này phủ.
//   node scripts/content-kit.mjs lv <từ>… — cấp của từng từ (A1…C2, "?" = ngoài bộ từ), để chọn từ trước khi viết.
//   node scripts/content-kit.mjs banks <cấp> [--size 14] [--write]
//        chia từ đích CHƯA GẶP bài nào thành "giỏ từ" ~size từ/bài: lõi cùng chủ đề (nghĩa EN) + từ chung (động/tính từ…),
//        giỏ thường gặp trước. --write ghi plan/gap-banks/<cấp>.txt (danh sách chuẩn, sinh MỘT lần rồi giữ cố định).
//   node scripts/content-kit.mjs sbanks <cấp> <lô> [--n 6] [--size N] [--write]
//        giỏ từ cho lô TRUYỆN: từ đích còn thiếu ngữ cảnh để đạt TARGETS cov1/cov3/cov5 (từ gần ngưỡng trước,
//        thường gặp trước; đạt hết thì lấy từ < 3 rồi < 5 bài), chia n giỏ có lõi chủ đề. Sinh lúc BẮT ĐẦU lô
//        (theo độ phủ hiện tại), --write nối vào plan/story-banks/<cấp>.txt (mã b1-s01a…). plan/story-plan.md
//   node scripts/content-kit.mjs bankcheck <đoạn-tên-file>…
//        bài/truyện có dòng "// giỏ b1-g001" / "// giỏ b1-s01a": đã dùng bao nhiêu từ của giỏ
//        (mốc: thiếu ≤ 4 từ hoặc dùng ≥ 80%, lấy mốc thấp hơn) + từ còn thiếu.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { contexts, ctxCount } from "./content-coverage.mjs";
import { LEVEL_KEYS, targetWords, weightOf, loadVocab, analyzeToken } from "./lib/fr-vocab.mjs";
import { profileOf, ROOT } from "./lib/content-model.mjs";
import { SPEC, TARGETS } from "./lib/content-spec.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const cmd = args[0];

// Chủ đề theo nghĩa tiếng Anh của mục từ (khớp đầu từ); thứ tự = ưu tiên khi một từ khớp nhiều chủ đề.
const THEME_DEFS = [
  ["nhà cửa, việc nhà", "daily-life", "house|home|room|furniture|kitchen|bed|door|window|wall|roof|floor|stair|lamp|chair|table|cupboard|drawer|shelf|curtain|tap|sink|plumb|switch|key|lock|broom|sweep|dust|clean|wash|laundry|iron|garden|bucket|box|basket|bag|blanket|pillow|mattress|candle"],
  ["ăn uống, nấu nướng", "food", "food|eat|drink|cook|bread|meat|fish|fruit|vegetable|sauce|soup|cake|wine|beer|bottle|cup|glass|plate|spoon|fork|knife|pan|pot|oven|bake|fry|boil|roast|taste|sugar|salt|butter|cheese|egg|meal|dish|jam|pastry|sausage|ham|pie|apple|pear|plum|grape|bean|pea|onion|garlic|herb|spice|hungry|thirst|chew|swallow"],
  ["quần áo, may mặc", "daily-life", "cloth|dress|shirt|coat|jacket|trouser|pants|skirt|shoe|boot|slipper|sandal|hat|cap|glove|sock|stocking|button|sew|needle|thread|fabric|silk|wool|cotton|linen|lace|leather|pocket|collar|sleeve|belt|scarf|jewel|necklace|bracelet|apron|veil|wear|undress|knit|embroid|hood"],
  ["cơ thể, sức khoẻ", "health", "body|head|face|eye|ear|nose|mouth|tooth|teeth|lip|tongue|neck|throat|shoulder|arm|elbow|wrist|hand|finger|thumb|nail|leg|knee|ankle|foot|feet|toe|skin|bone|blood|heart|lung|stomach|belly|chest|back|hip|hair|beard|moustache|sick|ill|disease|pain|ache|wound|injur|bleed|cough|fever|doctor|nurse|hospital|medic|drug|pill|cure|heal|breath|sweat|tear|vomit|faint|limp|blind|deaf|swell|bruise|scar|sneeze|sleep|yawn|tired"],
  ["cảm xúc, tính cách", "psychology", "angry|anger|rage|fear|afraid|scare|fright|terror|happy|sad|sorrow|grief|joy|shame|proud|pride|jealous|envy|anxious|anxiety|worry|nervous|calm|brave|courage|coward|lazy|stupid|idiot|fool|clever|kind|cruel|rude|polite|shy|bored|annoy|laugh|cry|weep|sob|smile|grin|mood|feeling|insult|tease|mock|lie|liar|honest|sincere|gentle|tender|naive|vain|greed|stubborn|curious|nostalg|despair|hope|regret|blush|sulk|grumble|moan|shout|scream|yell|whisper|sigh"],
  ["thiên nhiên, con vật", "nature", "animal|dog|cat|horse|cow|ox|bull|pig|sheep|lamb|goat|donkey|rabbit|bird|hen|chicken|duck|goose|crow|owl|fish|insect|bee|wasp|fly|ant|spider|snake|rat|mouse|wolf|fox|bear|deer|tree|flower|rose|leaf|grass|bush|forest|wood|field|meadow|river|stream|lake|pond|sea|wave|beach|shore|mountain|hill|valley|rock|stone|sand|mud|dust|sky|cloud|rain|snow|frost|ice|wind|storm|thunder|lightning|sun|moon|star|weather|season|spring|autumn|winter|summer|farm|harvest|seed|plant|root|branch|nest|feather|wing|tail|bark|hay|straw|manure"],
  ["phố xá, đi lại", "cities", "street|road|lane|path|car|bus|train|tram|truck|lorry|van|bike|bicycle|motor|drive|park|traffic|station|bridge|tunnel|shop|store|market|bank|post|town|city|village|square|building|tower|neighbo|travel|trip|journey|ticket|luggage|suitcase|boat|ship|sail|port|plane|airport|taxi|wheel|engine|fuel|petrol|garage|crowd|pavement|sidewalk"],
  ["công việc, tiền bạc", "work", "work|job|office|boss|employ|hire|fire|salary|wage|money|cash|coin|pay|price|cost|cheap|expens|buy|sell|debt|loan|tax|rent|business|company|firm|factory|tool|hammer|nail|screw|saw|drill|machine|repair|fix|build|plumber|electric|mechanic|clerk|secretary|manager|career|retire|pension|strike|union|contract|deal|profit|budget|bill|invoice|receipt|photocop|print|paper|file|desk|meeting|colleague"],
  ["pháp luật, tội phạm", "society", "police|cop|crime|criminal|thief|steal|rob|burglar|prison|jail|cell|court|trial|judge|jury|law|lawyer|attorney|arrest|gun|pistol|rifle|shoot|kill|murder|weapon|knife|fight|attack|guard|spy|secret|witness|evidence|guilty|innocent|sentence|fine|cheat|fraud|smuggl|gang|kidnap|threat|blackmail|bribe"],
  ["học hành, văn hoá, giải trí", "culture", "school|teacher|pupil|student|class|lesson|exam|test|grade|book|novel|read|write|letter|word|language|grammar|music|song|sing|dance|film|movie|cinema|theat|stage|actor|paint|draw|art|poem|poet|story|tale|game|toy|play|sport|ball|team|match|race|swim|ski|hunt|fishing|camera|photo|radio|television|newspaper|magazine|party|holiday|feast|celebrat"],
  ["gia đình, tình cảm", "family", "family|mother|mom|mum|father|dad|son|daughter|brother|sister|uncle|aunt|cousin|nephew|niece|grand|wife|husband|marry|marriage|wedding|bride|groom|baby|child|kid|love|kiss|hug|date|flirt|friend|mate|buddy|couple|divorce|widow|orphan|neighbour|guest|host"],
  ["chiến tranh, tôn giáo, lịch sử", "history", "army|soldier|war|battle|military|officer|captain|general|sergeant|troop|enemy|king|queen|prince|princess|lord|castle|sword|shield|church|god|priest|monk|nun|pray|religio|saint|holy|bless|devil|demon|hell|heaven|angel|bible|ghost|witch|magic|empire|revolution|flag"],
];
const themes = () => THEME_DEFS.map(([label, topic, re]) => ({ label, topic, re: new RegExp(`\\b(${re})`, "i"), words: [] }));

if (cmd === "need") {
  const lv = args[1];
  const b = LEVEL_KEYS.indexOf(lv);
  const k = Number(args[2] && !args[2].startsWith("--") ? args[2] : 3);
  const N = Number(args[3] && !args[3].startsWith("--") ? args[3] : 120);
  const re = opt("--re") ? new RegExp(opt("--re"), "i") : null;
  const v = loadVocab();
  const cnt = ctxCount(contexts(), b);
  const rows = targetWords(b)
    .map((t) => ({ t, n: cnt.get(t) ?? 0, w: weightOf(t), e: v.words.get(t) }))
    .filter((x) => x.n < k)
    .filter((x) => !re || re.test(`${x.e?.meaning_vi ?? ""} ${(x.e?.meaning_en ?? []).join(" ")}`))
    .sort((a, b2) => a.n - b2.n || b2.w - a.w);
  console.log(`${lv}: ${rows.length} từ < ${k} bài${re ? ` (lọc ${re})` : ""} — in ${Math.min(N, rows.length)}`);
  console.log(
    rows
      .slice(0, N)
      .map((x) => `${x.t}(${x.n}) ${String(x.e?.meaning_vi ?? "").split(/[;,]/)[0].slice(0, 28)}`)
      .join(" · "),
  );
} else if (cmd === "dens") {
  const k = Number(opt("--k", 3));
  const ctx = contexts();
  const want = args.slice(1).filter((a, i, arr) => !a.startsWith("--") && arr[i - 1] !== "--k");
  for (const c of ctx.filter((c) => c.m && want.some((w) => c.id === w || c.m.file.includes(w)))) {
    const m = c.m;
    const p = profileOf(m);
    const others = ctx.filter((x) => x.id !== c.id);
    const cnt = ctxCount(others, m.band);
    const own = targetWords(m.band).filter((t) => c.lemmas.has(t));
    const gap = own.filter((t) => (cnt.get(t) ?? 0) < k);
    const dens = p.nScored ? p.bands[m.band] / p.nScored : 0;
    const over = p.nScored ? p.over.length / p.nScored : 0;
    const flag = (x, lim) => (x > lim ? "!" : "");
    console.log(
      `${m.id} ${p.nWords} từ · câu TB ${(p.nWords / m.sentences.length).toFixed(1)} · đúng cấp ${(dens * 100).toFixed(1)}% · vượt ${(over * 100).toFixed(1)}%${flag(over, SPEC[m.level].over)} · phủ ${own.length} từ cấp, ${gap.length} từ đang <${k} bài${p.over.length ? ` · vượt: ${[...new Set(p.over.map((o) => o.t))].join(" ")}` : ""}`,
    );
  }
} else if (cmd === "lv") {
  const out = args.slice(1).map((t) => {
    const a = analyzeToken(t.toLowerCase(), { start: true }).filter((x) => x.how === "word");
    if (!a.length) return `${t}:?`;
    return `${t}:${a.map((x) => (x.band >= 0 && x.band < 6 ? LEVEL_KEYS[x.band].toUpperCase() : "?")).join("+")}`;
  });
  console.log(out.join(" "));
} else if (cmd === "banks") {
  const THEMES = themes();
  const lv = args[1];
  const b = LEVEL_KEYS.indexOf(lv);
  const SIZE = Number(opt("--size", 14));
  const CORE = Math.round(SIZE * 0.6);
  const v = loadVocab();
  const cnt = ctxCount(contexts(), b);
  const short = (t) => String(v.words.get(t)?.meaning_vi ?? "").split(/[;,(]/)[0].trim().slice(0, 22);
  const gap = targetWords(b)
    .filter((t) => !cnt.get(t))
    .sort((x, y) => weightOf(y) - weightOf(x));
  const misc = [];
  for (const t of gap) {
    const en = [].concat(v.words.get(t)?.meaning_en ?? []).join("; ");
    const th = THEMES.find((x) => x.re.test(en));
    (th ? th.words : misc).push(t);
  }
  // lõi chủ đề: chia CORE từ/giỏ; phần lẻ (< CORE/2) trả về từ chung
  const banks = [];
  for (const th of THEMES) {
    for (let i = 0; i < th.words.length; i += CORE) {
      const part = th.words.slice(i, i + CORE);
      if (part.length < CORE / 2 && i > 0) misc.push(...part);
      else if (part.length < CORE / 2) misc.push(...part);
      else banks.push({ label: th.label, topic: th.topic, words: part });
    }
  }
  misc.sort((x, y) => weightOf(y) - weightOf(x));
  for (const bk of banks) bk.words.push(...misc.splice(0, SIZE - bk.words.length));
  for (let i = 0; i < misc.length; i += SIZE) banks.push({ label: "tự chọn chủ đề (đời thường)", topic: "daily-life", words: misc.slice(i, i + SIZE) });
  const avg = (bk) => bk.words.reduce((s, t) => s + weightOf(t), 0) / bk.words.length;
  banks.sort((x, y) => avg(y) - avg(x));
  const lines = banks.map((bk, i) => `${lv}-g${String(i + 1).padStart(3, "0")} · ${bk.label} (${bk.topic}) · ${bk.words.map((t) => `${t}(${short(t)})`).join(" · ")}`);
  console.log(`${lv}: ${gap.length} từ chưa gặp bài nào → ${banks.length} giỏ (${SIZE} từ/giỏ, lõi chủ đề ${CORE}) · theo chủ đề: ${THEMES.map((x) => `${x.label.split(",")[0]} ${x.words.length}`).join(", ")}, chung ${gap.length - THEMES.reduce((s, x) => s + x.words.length, 0)}`);
  if (args.includes("--write")) {
    const dir = join(ROOT, "..", "plan", "gap-banks");
    mkdirSync(dir, { recursive: true });
    const head = `# Giỏ từ ${lv.toUpperCase()} — sinh ${new Date().toISOString().slice(0, 10)} bằng \`node scripts/content-kit.mjs banks ${lv} --size ${SIZE} --write\` (giữ cố định, không sinh lại).\n# Mỗi dòng = một bài: dùng ≥ ${SIZE - 2}/${SIZE} từ (dạng biến hình được), chủ đề gợi ý trong ngoặc. Chuẩn viết: plan/gap-plan.md\n`;
    writeFileSync(join(dir, `${lv}.txt`), head + lines.join("\n") + "\n");
    console.log(`→ plan/gap-banks/${lv}.txt`);
  } else console.log(lines.slice(0, 4).join("\n"));
} else if (cmd === "sbanks") {
  const lv = args[1];
  const b = LEVEL_KEYS.indexOf(lv);
  const lot = String(Number(args[2])).padStart(2, "0");
  if (b < 0 || lot === "NaN") throw new Error("dùng: sbanks <cấp> <lô> [--n 6] [--size N] [--write]");
  const N = Number(opt("--n", 6));
  const SIZE = Number(opt("--size", { a1: 12, a2: 14, b1: 20, b2: 26, c1: 26, c2: 16 }[lv]));
  const CORE = Math.round(SIZE * 0.5);
  const v = loadVocab();
  const T = targetWords(b);
  const cnt = ctxCount(contexts(), b);
  const c = (t) => cnt.get(t) ?? 0;
  // thiếu bao nhiêu ngữ cảnh: cùng cách tính "thiếu ngữ cảnh" của content-coverage (từ gần ngưỡng trước)
  const sorted = [...T].sort((x, y) => c(y) - c(x) || weightOf(y) - weightOf(x));
  const def = new Map();
  const tg = TARGETS[lv];
  for (const [need, frac] of [[1, tg.cov1], [3, tg.cov3], [5, tg.cov5]]) {
    const want = Math.ceil(frac * T.length);
    for (let i = 0; i < want; i++) {
      const d = need - c(sorted[i]);
      if (d > 0) def.set(sorted[i], Math.max(def.get(sorted[i]) ?? 0, d));
    }
  }
  const missing = [...def.values()].reduce((x, y) => x + y, 0);
  let pool = [...def.keys()].sort((x, y) => def.get(x) - def.get(y) || weightOf(y) - weightOf(x));
  // đạt mục tiêu rồi: tiếp tục nâng độ lặp (< 3 rồi < 5 bài), từ gần ngưỡng trước
  for (const k of [3, 5]) {
    if (pool.length >= N * SIZE * 1.5) break;
    const more = sorted.filter((t) => c(t) < k && !def.has(t) && !pool.includes(t)).sort((x, y) => c(y) - c(x) || weightOf(y) - weightOf(x));
    pool.push(...more);
  }
  pool = pool.slice(0, Math.ceil(N * SIZE * 1.5));
  const TH = themes();
  const themeOf = new Map();
  for (const t of pool) {
    const en = [].concat(v.words.get(t)?.meaning_en ?? []).join("; ");
    const th = TH.find((x) => x.re.test(en));
    if (th) {
      th.words.push(t);
      themeOf.set(t, th);
    }
  }
  const taken = new Set();
  const banks = [];
  const usedTh = new Set();
  for (let i = 0; i < N; i++) {
    const free = (th) => th.words.filter((t) => !taken.has(t));
    const th = TH.filter((x) => !usedTh.has(x)).sort((x, y) => free(y).length - free(x).length)[0];
    const core = th && free(th).length >= CORE / 2 ? free(th).slice(0, CORE) : [];
    if (core.length) usedTh.add(th);
    core.forEach((t) => taken.add(t));
    const rest = pool.filter((t) => !taken.has(t) && !themeOf.has(t)).concat(pool.filter((t) => !taken.has(t) && themeOf.has(t)));
    const fill = rest.slice(0, SIZE - core.length);
    fill.forEach((t) => taken.add(t));
    banks.push({ label: core.length ? th.label : "tự chọn chủ đề", topic: core.length ? th.topic : "daily-life", words: [...core, ...fill] });
  }
  const short = (t) => String(v.words.get(t)?.meaning_vi ?? "").split(/[;,(]/)[0].trim().slice(0, 22);
  const lines = banks.map((bk, i) => `${lv}-s${lot}${"abcdefghij"[i]} · ${bk.label} (${bk.topic}) · ${bk.words.map((t) => `${t}(${c(t)}: ${short(t)})`).join(" · ")}`);
  console.log(`${lv} lô ${lot}: thiếu ${missing} ngữ cảnh (${def.size} từ) để đạt mục tiêu → ${N} giỏ × ${SIZE} từ (lõi chủ đề ${CORE}); số trong ngoặc = số bài đang có từ`);
  if (args.includes("--write")) {
    const dir = join(ROOT, "..", "plan", "story-banks");
    mkdirSync(dir, { recursive: true });
    const f = join(dir, `${lv}.txt`);
    const old = existsSync(f) ? readFileSync(f, "utf8") : `# Giỏ từ TRUYỆN ${lv.toUpperCase()} — mỗi lô sinh lúc bắt đầu bằng \`node scripts/content-kit.mjs sbanks ${lv} <lô> --write\`, giữ cố định.\n# Mỗi dòng = một truyện: dùng ≥ 80% từ của giỏ (rải qua các chương, dạng gốc), số trong ngoặc = số bài đang có từ lúc sinh. Chuẩn: plan/story-plan.md\n`;
    if (old.includes(`\n${lv}-s${lot}a `)) throw new Error(`lô ${lot} đã có trong ${f} — giỏ giữ cố định, không sinh lại`);
    writeFileSync(f, `${old}\n## lô ${lot} (${new Date().toISOString().slice(0, 10)}, thiếu ${missing} ngữ cảnh)\n${lines.join("\n")}\n`);
    console.log(`→ plan/story-banks/${lv}.txt`);
  }
  console.log(lines.join("\n"));
} else if (cmd === "bankcheck") {
  const want = args.slice(1);
  const ctx = contexts().filter((c) => c.m && want.some((w) => c.m.file.includes(w)));
  const banks = new Map();
  for (const dir of ["gap-banks", "story-banks"])
    for (const lv of LEVEL_KEYS) {
      const f = join(ROOT, "..", "plan", dir, `${lv}.txt`);
      if (!existsSync(f)) continue;
      for (const l of readFileSync(f, "utf8").split("\n").filter((l) => /^\w\w-[gs]\d/.test(l)))
        banks.set(l.split(" · ")[0], l.split(" · ").slice(2).map((x) => x.replace(/\(.*$/, "")));
    }
  let tot = 0, used = 0;
  for (const c of ctx) {
    const raw = readFileSync(join(ROOT, c.m.file), "utf8");
    const blk = raw.split(/^=== /m).find((x) => x.startsWith(c.id + "\n")) ?? "";
    const code = /^\/\/ giỏ (\S+)/m.exec(blk)?.[1];
    const bank = banks.get(code);
    if (!bank) {
      console.log(`${c.id}: chưa ghi "// giỏ …" hoặc giỏ không có`);
      continue;
    }
    const hit = bank.filter((t) => c.lemmas.has(t));
    tot += bank.length;
    used += hit.length;
    const ok = hit.length >= Math.min(bank.length - 4, Math.ceil(bank.length * 0.8));
    console.log(`${ok ? "✓" : "✗"} ${c.id} [${code}] ${hit.length}/${bank.length}${hit.length < bank.length ? ` · thiếu: ${bank.filter((t) => !c.lemmas.has(t)).join(" ")}` : ""}`);
  }
  console.log(`tổng: ${used}/${tot} từ giỏ đã dùng`);
} else {
  console.log("dùng: content-kit.mjs need <cấp> [k] [N] [--re …] | dens <id|file>… [--k 3] | lv <từ>… | banks <cấp> [--size 14] [--write] | sbanks <cấp> <lô> [--n 6] [--size N] [--write] | bankcheck <file>…");
  process.exit(1);
}
