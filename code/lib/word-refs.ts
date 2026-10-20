// Chỉ mục từ → học liệu (port app Anh public/data/library/word-refs): lemma → các bài đọc / truyện có từ đó, để
// "Gặp lại trong ngữ cảnh" ở thẻ từ và gợi ý sau phiên học (lib/suggest.ts) chỉ tải một shard nhỏ thay vì cả kho bài.
// HÀM THUẦN, không alias "@/" — scripts/build-word-refs.mjs import thẳng file này bằng node (đuôi .ts).
//
// public/data/word-refs/{0..15}.json = { k, w: { lemma: "r12 s3 r40" } }: r/s + vị trí trong readings-index.json /
// stories-index.json lúc dựng. k = dấu vân tay danh sách id của hai chỉ mục; lệch với chỉ mục đang tải = shard cũ hơn
// dữ liệu → bỏ qua (thà không gợi ý còn hơn trỏ nhầm bài).

export const WORD_REF_SHARDS = 16;
export const WORD_REF_MAX = 12; // số bài tối đa mỗi từ

export function wordRefShardOf(lemma: string): number {
  let h = 5381;
  for (let i = 0; i < lemma.length; i++) h = ((h * 33) ^ lemma.charCodeAt(i)) >>> 0;
  return h % WORD_REF_SHARDS;
}

/** Dấu vân tay hai chỉ mục (id theo đúng thứ tự) — đổi thứ tự / thêm / bớt bài là đổi. */
export function wordRefKey(readingIds: readonly string[], storyIds: readonly string[]): string {
  let h1 = 5381;
  let h2 = 52711;
  for (const s of [readingIds.join("\n"), "|", storyIds.join("\n")])
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = ((h1 * 33) ^ c) >>> 0;
      h2 = (Math.imul(h2, 31) + c) >>> 0;
    }
  return `${readingIds.length}.${storyIds.length}.${h1.toString(36)}${h2.toString(36)}`;
}

/** Một lần gặp: mã bài ("r12" / "s3"), cấp bài 1..6, số lần từ xuất hiện trong bài. */
export interface RefHit {
  code: string;
  level: number;
  count: number;
}

/**
 * Chọn tối đa `max` bài cho một từ: mỗi loại (truyện, bài đọc) ít nhất một nếu có, còn lại ưu tiên cấp thấp (đọc dễ
 * hiểu hơn), cùng cấp thì bài dùng từ nhiều lần hơn; kết quả xếp theo cấp. Trả chuỗi mã cách nhau bởi dấu cách.
 */
export function pickRefs(hits: readonly RefHit[], max = WORD_REF_MAX): string {
  const sorted = [...hits].sort((a, b) => a.level - b.level || b.count - a.count);
  const pick: RefHit[] = [];
  for (const k of ["s", "r"]) {
    const x = sorted.find((e) => e.code[0] === k);
    if (x) pick.push(x);
  }
  for (const e of sorted) if (pick.length < max && !pick.includes(e)) pick.push(e);
  return pick
    .sort((a, b) => a.level - b.level || b.count - a.count)
    .map((e) => e.code)
    .join(" ");
}

export type WordRefKind = "reading" | "story";
export interface WordRefMeta {
  id: string;
  level: number;
  title_fr: string;
  title_vi: string;
}
export interface WordRef extends WordRefMeta {
  type: WordRefKind;
}

/** Giải chuỗi mã → bài (bỏ mã trỏ ra ngoài chỉ mục). */
export function decodeRefs(codes: string, readings: readonly WordRefMeta[], stories: readonly WordRefMeta[]): WordRef[] {
  const out: WordRef[] = [];
  for (const c of codes.split(" ")) {
    if (!/^[rs]\d+$/.test(c)) continue;
    const i = Number(c.slice(1));
    const m = c[0] === "r" ? readings[i] : stories[i];
    if (!m) continue;
    out.push({ type: c[0] === "r" ? "reading" : "story", id: m.id, level: m.level, title_fr: m.title_fr, title_vi: m.title_vi });
  }
  return out;
}
