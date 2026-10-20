import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WORD_REF_SHARDS, decodeRefs, pickRefs, wordRefKey, wordRefShardOf } from "./word-refs";

const hit = (code: string, level: number, count = 1) => ({ code, level, count });
const meta = (id: string, level: number) => ({ id, level, title_fr: id.toUpperCase(), title_vi: `vi ${id}` });

describe("word-refs", () => {
  it("shard ổn định, nằm trong khoảng", () => {
    for (const w of ["maison", "être", "l'", "pomme de terre", ""]) {
      const n = wordRefShardOf(w);
      expect(n).toBe(wordRefShardOf(w));
      expect(n >= 0 && n < WORD_REF_SHARDS).toBe(true);
    }
  });

  it("dấu vân tay đổi khi thêm / bớt / đổi thứ tự bài hoặc chuyển bài giữa hai chỉ mục", () => {
    const k = wordRefKey(["a", "b"], ["s"]);
    expect(wordRefKey(["a", "b"], ["s"])).toBe(k);
    expect(wordRefKey(["b", "a"], ["s"])).not.toBe(k);
    expect(wordRefKey(["a", "b", "c"], ["s"])).not.toBe(k);
    expect(wordRefKey(["a"], ["b", "s"])).not.toBe(k);
  });

  it("chọn bài: đủ hai loại trước, rồi cấp thấp, cùng cấp thì bài dùng từ nhiều lần; tối đa max", () => {
    const hits = [hit("r0", 1, 1), hit("r1", 1, 5), hit("r2", 2), hit("r3", 1, 2), hit("s0", 6)];
    expect(pickRefs(hits, 3)).toBe("r1 r3 s0"); // truyện duy nhất (C2) vẫn được giữ một chỗ
    expect(pickRefs(hits)).toBe("r1 r3 r0 r2 s0");
    expect(pickRefs([])).toBe("");
  });

  it("giải mã → bài, bỏ mã hỏng / ngoài chỉ mục", () => {
    const r = [meta("rd-1", 1), meta("rd-2", 3)];
    const s = [meta("st-1", 2)];
    expect(decodeRefs("r1 s0 r9 x0 r", r, s)).toEqual([
      { type: "reading", ...meta("rd-2", 3) },
      { type: "story", ...meta("st-1", 2) },
    ]);
    expect(decodeRefs("", r, s)).toEqual([]);
  });

  it("dữ liệu public/data/word-refs khớp chỉ mục bài hiện tại (lệch → chạy: node scripts/build-word-refs.mjs)", () => {
    const data = (p: string) => JSON.parse(readFileSync(join(process.cwd(), "public", "data", p), "utf8"));
    const ri = data("readings-index.json") as { id: string; level: number; title_fr: string; title_vi: string }[];
    const si = data("stories-index.json") as typeof ri;
    const k = wordRefKey(
      ri.map((x) => x.id),
      si.map((x) => x.id),
    );
    let words = 0;
    for (let n = 0; n < WORD_REF_SHARDS; n++) {
      const sh = data(`word-refs/${n}.json`) as { k: string; w: Record<string, string> };
      expect(sh.k, `word-refs/${n}.json cũ hơn chỉ mục bài — chạy: node scripts/build-word-refs.mjs`).toBe(k);
      for (const [w, codes] of Object.entries(sh.w)) {
        expect(wordRefShardOf(w)).toBe(n);
        expect(decodeRefs(codes, ri, si).length).toBe(codes.split(" ").length);
        words++;
      }
    }
    expect(words).toBeGreaterThan(5000);
    // quy về lemma: dạng chia / lược âm trong bài được tính cho từ gốc
    const refsOf = (w: string) => (data(`word-refs/${wordRefShardOf(w)}.json`) as { w: Record<string, string> }).w[w] ?? "";
    for (const w of ["maison", "manger", "école", "parce"]) expect(refsOf(w).split(" ").length, w).toBeGreaterThanOrEqual(2);
  });
});
