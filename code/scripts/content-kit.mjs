// Bộ công cụ soạn nhanh, ít token (port app Anh, docs/CONTENT_PLAYBOOK.md §16).
//   node scripts/content-kit.mjs need <cấp> [k=3] [N=120] [--re <regex nghĩa VI/EN>]
//        từ đích của cấp đang gặp < k bài (cấp ≤ L), thường gặp trước — để gom một bài theo cụm chủ đề.
//        In "từ(số bài) nghĩa" gọn một dòng/từ.
//   node scripts/content-kit.mjs dens <id|đoạn-tên-file>… [--k 3]
//        mỗi bài: số từ · câu TB · % từ đúng cấp · % vượt cấp · số từ "thiếu" (< k bài) bài này phủ.
//   node scripts/content-kit.mjs lv <từ>… — cấp của từng từ (A1…C2, "?" = ngoài bộ từ), để chọn từ trước khi viết.
import { contexts, ctxCount } from "./content-coverage.mjs";
import { LEVEL_KEYS, targetWords, weightOf, loadVocab, analyzeToken } from "./lib/fr-vocab.mjs";
import { profileOf } from "./lib/content-model.mjs";
import { SPEC } from "./lib/content-spec.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const cmd = args[0];

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
} else {
  console.log("dùng: content-kit.mjs need <cấp> [k] [N] [--re …] | dens <id|file>… [--k 3] | lv <từ>…");
  process.exit(1);
}
