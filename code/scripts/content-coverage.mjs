// Độ phủ từ vựng của thư viện đọc theo cấp (port app Anh, docs/CONTENT_PLAYBOOK.md §4, §15).
//   node scripts/content-coverage.mjs              bảng: số bài, chữ, giờ đọc, phủ ≥1/≥3/≥5 bài, so mục tiêu (TARGETS)
//   node scripts/content-coverage.mjs --topics a1  phân bố chủ đề / thể loại / độ dài của cấp
//   node scripts/content-coverage.mjs --stories    độ phủ chỉ tính truyện + số truyện so với app Anh
// "Bài" = một bài đọc (hoặc một truyện cũ ở public/data/stories) ở cấp ≤ L — người học đi từ dưới lên.
import { loadLibrary, profileOf } from "./lib/content-model.mjs";
import { readLibrary } from "./lib/library-data.mjs";
import { LEVEL_KEYS, LEVEL_LABEL, targetWords, profile } from "./lib/fr-vocab.mjs";
import { SPEC, TARGETS, TOPICS } from "./lib/content-spec.mjs";

/** Mọi "ngữ cảnh": bài đọc + truyện ở content/ (+ truyện JSON không có nguồn content/) → [{id, band, type R|S, lemmas:Set, words}].
 *  public/data/stories/{id}.json do build-content dựng TỪ content/ → bỏ id đã có, không đếm một truyện hai lần. */
export function contexts() {
  const { items } = loadLibrary();
  const out = items.map((m) => {
    const p = profileOf(m);
    return { id: m.id, band: m.band, type: m.type === "story" ? "S" : "R", lemmas: new Set(p.counts.keys()), words: p.nWords, m };
  });
  const have = new Set(out.map((c) => c.id));
  for (const { meta, doc: d } of readLibrary("stories")) {
    if (!d || have.has(d.id)) continue;
    const p = profile(d.chapters.flatMap((c) => c.sentences.map((s) => s.fr)));
    out.push({ id: d.id, band: meta.level - 1, type: "S", lemmas: new Set(p.counts.keys()), words: p.nWords });
  }
  return out;
}

/** Số bài (cấp ≤ b) chứa mỗi lemma. */
export function ctxCount(ctx, b) {
  const cnt = new Map();
  for (const c of ctx) if (c.band <= b) for (const l of c.lemmas) cnt.set(l, (cnt.get(l) ?? 0) + 1);
  return cnt;
}

export function coverageRows(ctx = contexts()) {
  return LEVEL_KEYS.map((k, b) => {
    const T = targetWords(b);
    const cnt = ctxCount(ctx, b);
    const own = ctx.filter((c) => c.band === b);
    const words = own.reduce((s, c) => s + c.words, 0);
    const f = (n) => T.filter((t) => (cnt.get(t) ?? 0) >= n).length / Math.max(1, T.length);
    // "thiếu ngữ cảnh" = tổng số lần gặp thêm để đạt cả ba ngưỡng (từ gần ngưỡng trước)
    const tg = TARGETS[k];
    let missing = 0;
    if (tg) {
      const sorted = T.map((t) => cnt.get(t) ?? 0).sort((x, y) => y - x);
      for (const [need, frac] of [[1, tg.cov1], [3, tg.cov3], [5, tg.cov5]]) {
        const want = Math.ceil(frac * T.length);
        for (let i = 0; i < want; i++) missing += Math.max(0, need - sorted[i]);
      }
    }
    return { k, b, targets: T.length, R: own.filter((c) => c.type === "R").length, S: own.filter((c) => c.type === "S").length, words, hours: words / SPEC[k].wpm / 60, c1: f(1), c3: f(3), c5: f(5), missing };
  });
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;
if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const args = process.argv.slice(2);
  if (args[0] === "--topics") {
    const lv = args[1] ?? "a1";
    const { items } = loadLibrary();
    const list = items.filter((m) => m.level === lv);
    const tally = (f) => {
      const m = new Map();
      for (const x of list) m.set(f(x), (m.get(f(x)) ?? 0) + 1);
      return [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`).join(" ");
    };
    console.log(`${lv}: ${list.length} bài`);
    console.log(`chủ đề (${new Set(list.map((m) => m.topic)).size}/${TOPICS.length}): ${tally((m) => m.topic)}`);
    console.log(`thể loại: ${tally((m) => m.genre)}`);
    const ws = list.map((m) => profileOf(m).nWords).sort((a, b) => a - b);
    if (ws.length) console.log(`độ dài: min ${ws[0]} · trung vị ${ws[ws.length >> 1]} · max ${ws.at(-1)} · tổng ${ws.reduce((a, b) => a + b, 0)}`);
  } else if (args[0] === "--stories") {
    // độ phủ CHỈ tính truyện (cấp ≤ L) + số truyện so với app Anh (TARGETS.stories) — plan/story-plan.md
    const ctx = contexts().filter((c) => c.type === "S");
    console.log("Cấp  truyện (app Anh)  chữ     giờ    phủ ≥1   ≥3       ≥5");
    LEVEL_KEYS.forEach((k, b) => {
      const T = targetWords(b);
      const cnt = ctxCount(ctx, b);
      const own = ctx.filter((c) => c.band === b);
      const words = own.reduce((s, c) => s + c.words, 0);
      const f = (n) => pct(T.filter((t) => (cnt.get(t) ?? 0) >= n).length / Math.max(1, T.length)).padEnd(8);
      const want = TARGETS[k]?.stories;
      console.log(`${LEVEL_LABEL[b].padEnd(4)} ${`${own.length} (${want ?? "-"})${want && own.length >= want ? " ✓" : ""}`.padEnd(17)} ${String(words).padEnd(7)} ${(words / SPEC[k].wpm / 60).toFixed(1).padEnd(6)} ${f(1)} ${f(3)} ${f(5)}`);
    });
  } else {
    const rows = coverageRows();
    console.log("Cấp  bài(R/S)  chữ     giờ (mục tiêu)   phủ ≥1 (mt)      ≥3 (mt)          ≥5 (mt)          thiếu ngữ cảnh");
    for (const r of rows) {
      if (!r.R && !r.S) continue;
      const tg = TARGETS[r.k];
      const m = (v, t) => (t === undefined ? pct(v).padEnd(16) : `${pct(v)} (${pct(t)})${v >= t ? " ✓" : ""}`.padEnd(16));
      console.log(
        `${LEVEL_LABEL[r.b].padEnd(4)} ${`${r.R}/${r.S}`.padEnd(9)} ${String(r.words).padEnd(7)} ${`${r.hours.toFixed(1)}${tg ? ` (${tg.hours})` : ""}`.padEnd(16)} ${m(r.c1, tg?.cov1)} ${m(r.c3, tg?.cov3)} ${m(r.c5, tg?.cov5)} ${tg ? r.missing : ""}`,
      );
    }
  }
}
