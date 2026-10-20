// Gợi ý bài đọc/truyện sau phiên học + khối "Gặp lại trong ngữ cảnh" ở thẻ từ.
//
// Cả hai tra CHỈ MỤC từ → học liệu (public/data/word-refs/{0..15}.json ~30 KB/shard, dựng bằng
// scripts/build-word-refs.mjs — định dạng ở lib/word-refs.ts) chứ không quét chữ bài: trước đây mỗi lần mở thẻ từ là
// tải chữ cả kho bài đọc + truyện (~12 MB) để dò mặt chữ. Từ đã quy về lemma lúc dựng (mange → manger, l'école → école).
import { loadReadingsIndex, loadStoriesIndex, type ReadingMeta, type StoryMetaDoc } from "./data";
import { readIds } from "./db";
import { decodeRefs, wordRefKey, wordRefShardOf, type WordRef } from "./word-refs";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type Shard = { k: string; w: Record<string, string> };
const shardCache = new Map<number, Promise<Shard | null>>();
function loadShard(n: number): Promise<Shard | null> {
  let p = shardCache.get(n);
  if (!p) {
    p = fetch(`${BASE}/data/word-refs/${n}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Shard>) : null))
      .catch(() => {
        shardCache.delete(n); // lỗi mạng → lần sau thử lại
        return null;
      });
    shardCache.set(n, p);
  }
  return p;
}

let keyMemo: { r: ReadingMeta[]; s: StoryMetaDoc[]; k: string } | null = null;

/** lemma → bài đọc / truyện có từ đó (tối đa 12, cấp thấp trước). Shard lệch chỉ mục đang tải → bỏ qua từ đó. */
export async function loadWordRefs(lemmas: string[]): Promise<Map<string, WordRef[]>> {
  const out = new Map<string, WordRef[]>();
  if (!lemmas.length) return out;
  const [ri, si] = await Promise.all([loadReadingsIndex(), loadStoriesIndex()]);
  if (!keyMemo || keyMemo.r !== ri || keyMemo.s !== si)
    keyMemo = {
      r: ri,
      s: si,
      k: wordRefKey(
        ri.map((x) => x.id),
        si.map((x) => x.id),
      ),
    };
  const shards = [...new Set(lemmas.map(wordRefShardOf))];
  const loaded = await Promise.all(shards.map(loadShard));
  const byShard = new Map(shards.map((n, i) => [n, loaded[i]]));
  for (const id of lemmas) {
    const sh = byShard.get(wordRefShardOf(id));
    if (!sh || sh.k !== keyMemo.k) continue;
    const refs = decodeRefs(sh.w[id] ?? "", ri, si);
    if (refs.length) out.set(id, refs);
  }
  return out;
}

export interface ReadingSuggestion extends WordRef {
  count: number; // số từ vừa học xuất hiện trong bài
}

/** Bài đọc / truyện CHƯA đọc chứa nhiều từ vừa học nhất (≥ 2 từ; hoà thì cấp thấp hơn, rồi bài đọc trước). */
export async function suggestReading(wordIds: string[]): Promise<ReadingSuggestion | null> {
  if (wordIds.length < 2) return null;
  try {
    const [read, refs] = await Promise.all([readIds(), loadWordRefs([...new Set(wordIds)])]);
    const hits = new Map<string, ReadingSuggestion>();
    for (const list of refs.values())
      for (const r of list) {
        const h = hits.get(r.id) ?? { ...r, count: 0 };
        h.count++;
        hits.set(r.id, h);
      }
    let best: ReadingSuggestion | null = null;
    for (const h of hits.values()) {
      if (h.count < 2 || read.has(h.id)) continue;
      if (
        !best ||
        h.count > best.count ||
        (h.count === best.count && (h.level < best.level || (h.level === best.level && h.type === "reading" && best.type !== "reading")))
      )
        best = h;
    }
    return best;
  } catch {
    return null;
  }
}

export type Occurrence = WordRef;

/** "Gặp lại trong ngữ cảnh": bài đọc / truyện có từ này (tối đa `limit`; đủ hai loại trước, rồi cấp thấp trước). */
export async function occurrencesOf(wordId: string, limit = 4): Promise<Occurrence[]> {
  try {
    const refs = (await loadWordRefs([wordId])).get(wordId) ?? [];
    const out: Occurrence[] = [];
    for (const k of ["reading", "story"] as const) {
      const r = refs.find((x) => x.type === k);
      if (r) out.push(r);
    }
    for (const r of refs) if (out.length < limit && !out.includes(r)) out.push(r);
    return out.slice(0, limit).sort((a, b) => a.level - b.level);
  } catch {
    return [];
  }
}
