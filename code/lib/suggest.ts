// Gợi ý bài đọc/truyện sau phiên học: tìm bài CHƯA đọc chứa nhiều từ vừa học nhất
// (khớp bề mặt từ trong câu — đủ tốt cho gợi ý; dữ liệu đọc rất nhỏ ~150KB).
import { loadReadings, loadStories, loadReadingsIndex, loadStoriesIndex } from "./data";
import { readIds } from "./db";

export interface ReadingSuggestion {
  type: "reading" | "story";
  id: string;
  level: number;
  title_fr: string;
  title_vi: string;
  count: number; // số từ vừa học xuất hiện trong bài
}

const tokens = (s: string): Set<string> =>
  new Set(
    s
      .toLowerCase()
      .split(/[^a-zà-öø-ÿœæ]+/i)
      .filter(Boolean),
  );

export async function suggestReading(wordIds: string[]): Promise<ReadingSuggestion | null> {
  if (wordIds.length < 2) return null;
  const ids = wordIds.map((w) => w.toLowerCase());
  const read = await readIds();
  let best: ReadingSuggestion | null = null;

  const consider = (s: ReadingSuggestion, text: string) => {
    if (read.has(s.id)) return; // chỉ gợi ý bài CHƯA đọc
    const t = tokens(text);
    const count = ids.filter((w) => t.has(w)).length;
    if (count < 2) return;
    if (!best || count > best.count || (count === best.count && s.level < best.level)) best = { ...s, count };
  };

  try {
    const rIdx = await loadReadingsIndex();
    for (const lv of [...new Set(rIdx.map((r) => r.level))]) {
      for (const d of await loadReadings(lv)) {
        consider(
          { type: "reading", id: d.id, level: d.level, title_fr: d.title_fr, title_vi: d.title_vi, count: 0 },
          d.sentences.map((s) => s.fr).join(" "),
        );
      }
    }
    const sIdx = await loadStoriesIndex();
    for (const lv of [...new Set(sIdx.map((s) => s.level))]) {
      for (const d of await loadStories(lv)) {
        consider(
          { type: "story", id: d.id, level: d.level, title_fr: d.title_fr, title_vi: d.title_vi, count: 0 },
          d.chapters.flatMap((c) => c.sentences.map((s) => s.fr)).join(" "),
        );
      }
    }
  } catch {
    return null;
  }
  return best;
}

export interface Occurrence {
  type: "reading" | "story";
  id: string;
  level: number;
  title_fr: string;
  title_vi: string;
}

/** "Gặp lại trong ngữ cảnh": các bài đọc/truyện có chứa từ này (tối đa `limit` bài, cấp thấp trước). */
export async function occurrencesOf(wordId: string, limit = 4): Promise<Occurrence[]> {
  const w = wordId.toLowerCase();
  const out: Occurrence[] = [];
  try {
    const rIdx = await loadReadingsIndex();
    for (const lv of [...new Set(rIdx.map((r) => r.level))].sort((a, b) => a - b)) {
      for (const d of await loadReadings(lv)) {
        if (tokens(d.sentences.map((s) => s.fr).join(" ")).has(w))
          out.push({ type: "reading", id: d.id, level: d.level, title_fr: d.title_fr, title_vi: d.title_vi });
      }
    }
    const sIdx = await loadStoriesIndex();
    for (const lv of [...new Set(sIdx.map((s) => s.level))].sort((a, b) => a - b)) {
      for (const d of await loadStories(lv)) {
        if (tokens(d.chapters.flatMap((c) => c.sentences.map((s) => s.fr)).join(" ")).has(w))
          out.push({ type: "story", id: d.id, level: d.level, title_fr: d.title_fr, title_vi: d.title_vi });
      }
    }
  } catch {
    return out.slice(0, limit);
  }
  return out.slice(0, limit);
}
