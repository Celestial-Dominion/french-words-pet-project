// Truy cập dữ liệu tĩnh trong public/data.
import type { Word, Conjugation, WordIndex } from "./types";
import { levelSlug } from "./levels";

// Base path để fetch chạy cả khi deploy dưới sub-path (F7). Rỗng ở local.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Tải danh sách từ của một cấp (1..6). Trả [] nếu file chưa có (các cấp làm dần).
export async function loadWords(level: number): Promise<Word[]> {
  const res = await fetch(`${BASE}/data/words/${levelSlug(level)}.json`);
  if (!res.ok) return [];
  return (await res.json()) as Word[];
}

// Câu ví dụ theo cấp: map wordId -> [{ fr, vi }]. Trả {} nếu chưa có.
// Cache theo cấp — file ví dụ khá lớn (C1 ~1.5MB), tránh tải lại mỗi lần bấm từ.
export type ExampleSentence = { fr: string; vi: string };
const examplesCache = new Map<number, Record<string, ExampleSentence[]>>();
export async function loadExamples(
  level: number,
): Promise<Record<string, ExampleSentence[]>> {
  const cached = examplesCache.get(level);
  if (cached) return cached;
  const res = await fetch(`${BASE}/data/examples/${levelSlug(level)}.json`);
  const data = res.ok ? ((await res.json()) as Record<string, ExampleSentence[]>) : {};
  examplesCache.set(level, data);
  return data;
}

// Bảng chia động từ, lazy-load theo lemma. null nếu không có (không phải verb hoặc chưa build).
const conjCache = new Map<string, Conjugation | null>();
export async function loadConjugation(lemma: string): Promise<Conjugation | null> {
  if (conjCache.has(lemma)) return conjCache.get(lemma)!;
  let out: Conjugation | null = null;
  try {
    const res = await fetch(`${BASE}/data/conjugations/${encodeURIComponent(lemma)}.json`);
    if (res.ok) out = (await res.json()) as Conjugation;
  } catch {
    out = null;
  }
  conjCache.set(lemma, out);
  return out;
}

// Khóa phát âm nền tảng (/phat-am).
export interface PhonicsItem {
  say: string;
  ipa: string;
  vi: string;
}
export interface PhonicsLesson {
  id: string;
  title: string;
  intro: string;
  items: PhonicsItem[];
}
let phonicsCache: PhonicsLesson[] | null = null;
export async function loadPhonics(): Promise<PhonicsLesson[]> {
  if (phonicsCache) return phonicsCache;
  const res = await fetch(`${BASE}/data/phonics.json`);
  phonicsCache = res.ok ? ((await res.json()).lessons as PhonicsLesson[]) : [];
  return phonicsCache;
}

// Chỉ mục toàn bộ từ: id -> [ipa, meaning_vi]. Dùng cho tìm kiếm nhanh xuyên cấp (F3+).
let indexCache: WordIndex | null = null;
export async function loadWordIndex(): Promise<WordIndex> {
  if (indexCache) return indexCache;
  const res = await fetch(`${BASE}/data/words-index.json`);
  indexCache = res.ok ? ((await res.json()) as WordIndex) : {};
  return indexCache;
}

// ---- Bài đọc & tra ngược lemma (F6) ----
let lemmaMapCache: Record<string, string> | null = null;
export async function loadLemmaMap(): Promise<Record<string, string>> {
  if (lemmaMapCache) return lemmaMapCache;
  const res = await fetch(`${BASE}/data/lemma-map.json`);
  lemmaMapCache = res.ok ? ((await res.json()) as Record<string, string>) : {};
  return lemmaMapCache;
}

let levelsCache: Record<string, number> | null = null;
export async function loadWordLevels(): Promise<Record<string, number>> {
  if (levelsCache) return levelsCache;
  const res = await fetch(`${BASE}/data/word-levels.json`);
  levelsCache = res.ok ? ((await res.json()) as Record<string, number>) : {};
  return levelsCache;
}

const wordsByLevelCache = new Map<number, Map<string, Word>>();
async function wordsMap(level: number): Promise<Map<string, Word>> {
  let m = wordsByLevelCache.get(level);
  if (!m) {
    m = new Map((await loadWords(level)).map((w) => [w.id, w]));
    wordsByLevelCache.set(level, m);
  }
  return m;
}

// Chuẩn hoá dạng mặt chữ khi bấm-tra: bỏ dấu câu 2 đầu, thường hoá, giữ dấu ' bên trong (l', qu'…).
export function normSurface(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^[^a-zàâäçéèêëîïôöùûüÿœæ'’-]+/u, "")
    .replace(/[^a-zàâäçéèêëîïôöùûüÿœæ'’-]+$/u, "")
    .replace(/’/g, "'");
}

/** Tra một dạng mặt chữ → Word (qua lemma-map + word-levels). null nếu không tìm được. */
export async function lookupWord(raw: string): Promise<Word | null> {
  const surface = normSurface(raw);
  if (!surface) return null;
  const [lemmaMap, levels] = await Promise.all([loadLemmaMap(), loadWordLevels()]);
  // thử: mặt chữ có dấu ' (l'école) → tách phần sau '; hoặc trực tiếp
  const lemma =
    lemmaMap[surface] ??
    lemmaMap[surface.split("'").pop() || surface] ??
    (levels[surface] ? surface : undefined);
  if (!lemma) return null;
  const lv = levels[lemma];
  if (!lv) return null;
  return (await wordsMap(lv)).get(lemma) ?? null;
}

// ---- Bài đọc theo cấp ----
export interface ReadingSentence {
  fr: string;
  vi: string;
}
export interface ReadingDoc {
  id: string;
  level: number;
  title_fr: string;
  title_vi: string;
  sentences: ReadingSentence[];
}
export interface ReadingMeta {
  id: string;
  level: number;
  title_fr: string;
  title_vi: string;
  n: number;
}

let readingsIndexCache: ReadingMeta[] | null = null;
export async function loadReadingsIndex(): Promise<ReadingMeta[]> {
  if (readingsIndexCache) return readingsIndexCache;
  const res = await fetch(`${BASE}/data/readings-index.json`);
  readingsIndexCache = res.ok ? ((await res.json()) as ReadingMeta[]) : [];
  return readingsIndexCache;
}

const readingsByLevel = new Map<number, ReadingDoc[]>();
export async function loadReadings(level: number): Promise<ReadingDoc[]> {
  let r = readingsByLevel.get(level);
  if (!r) {
    const res = await fetch(`${BASE}/data/readings/${levelSlug(level)}.json`);
    r = res.ok ? ((await res.json()) as ReadingDoc[]) : [];
    readingsByLevel.set(level, r);
  }
  return r;
}

// ---- Truyện nhiều chương ----
export interface StoryChapterDoc {
  title_vi: string;
  sentences: ReadingSentence[];
}
export interface StoryDoc {
  id: string;
  level: number;
  title_fr: string;
  title_vi: string;
  chapters: StoryChapterDoc[];
}
export interface StoryMetaDoc {
  id: string;
  level: number;
  title_fr: string;
  title_vi: string;
  chapters: number;
}

let storiesIndexCache: StoryMetaDoc[] | null = null;
export async function loadStoriesIndex(): Promise<StoryMetaDoc[]> {
  if (storiesIndexCache) return storiesIndexCache;
  const res = await fetch(`${BASE}/data/stories-index.json`);
  storiesIndexCache = res.ok ? ((await res.json()) as StoryMetaDoc[]) : [];
  return storiesIndexCache;
}

const storiesByLevel = new Map<number, StoryDoc[]>();
export async function loadStories(level: number): Promise<StoryDoc[]> {
  let r = storiesByLevel.get(level);
  if (!r) {
    const res = await fetch(`${BASE}/data/stories/${levelSlug(level)}.json`);
    r = res.ok ? ((await res.json()) as StoryDoc[]) : [];
    storiesByLevel.set(level, r);
  }
  return r;
}
