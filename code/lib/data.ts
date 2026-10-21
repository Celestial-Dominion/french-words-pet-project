// Truy cập dữ liệu tĩnh trong public/data.
import type { Word, Conjugation, WordIndex } from "./types";
import { levelSlug } from "./levels";
import { libraryDocPath, type LibraryDir } from "./library-files";

// Base path để fetch chạy cả khi deploy dưới sub-path (F7). Rỗng ở local.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Tải danh sách từ của một cấp (1..6). Trả [] nếu file chưa có (các cấp làm dần).
// Cache theo PROMISE: file cấp nặng (C1 ~1,5MB) mà mở phiên học, mở phiên ôn, warm và bấm kết
// quả tìm kiếm đều gọi — không cache thì mỗi lần lại tải + parse lại từ đầu; cache theo promise
// thì lời gọi thứ hai trong lúc lời gọi đầu đang tải cũng dùng chung, không tải trùng.
const wordsCache = new Map<number, Promise<Word[]>>();
export function loadWords(level: number): Promise<Word[]> {
  let p = wordsCache.get(level);
  if (!p) {
    p = fetch(`${BASE}/data/words/${levelSlug(level)}.json`)
      .then((res) => (res.ok ? (res.json() as Promise<Word[]>) : []))
      .catch((e) => {
        wordsCache.delete(level); // lỗi mạng → cho phép thử lại lần sau
        throw e;
      });
    wordsCache.set(level, p);
  }
  return p;
}

// Câu ví dụ theo cấp: map wordId -> [{ fr, vi }]. File mỗi cấp được TÁCH 8 SHARD
// (examples/{cefr}-{0..7}.json, chia theo hash wordId) → màn ôn/tra từ chỉ tải shard
// chứa đúng các từ cần, không phải nguyên file cấp (C1 ~1.5MB). Hash PHẢI khớp
// scripts/shard-examples.mjs.
/** t = mã câu Tatoeba (CC BY 2.0 FR) khi câu lấy từ Tatoeba; không có = câu dự án tự viết. */
export type ExampleSentence = { fr: string; vi: string; t?: number };
export const EXAMPLE_SHARDS = 8;
export function exampleShardOf(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h * 33) ^ id.charCodeAt(i)) >>> 0;
  return h % EXAMPLE_SHARDS;
}
const exShardCache = new Map<string, Promise<Record<string, ExampleSentence[]>>>();
function loadExampleShard(level: number, n: number): Promise<Record<string, ExampleSentence[]>> {
  const key = `${levelSlug(level)}-${n}`;
  let p = exShardCache.get(key);
  if (!p) {
    p = fetch(`${BASE}/data/examples/${key}.json`)
      .then((res) => (res.ok ? (res.json() as Promise<Record<string, ExampleSentence[]>>) : {}))
      .catch((e) => {
        exShardCache.delete(key);
        throw e;
      });
    exShardCache.set(key, p);
  }
  return p;
}
/** Toàn bộ ví dụ một cấp (tải đủ 8 shard — dùng khi thật sự cần cả cấp). */
export async function loadExamples(level: number): Promise<Record<string, ExampleSentence[]>> {
  const parts = await Promise.all(Array.from({ length: EXAMPLE_SHARDS }, (_, n) => loadExampleShard(level, n)));
  return Object.assign({}, ...parts);
}
/** Ví dụ cho ĐÚNG các từ cần (chỉ tải shard chứa chúng — nhẹ hơn nhiều). */
export async function loadExamplesForWords(
  level: number,
  ids: string[],
): Promise<Record<string, ExampleSentence[]>> {
  const shards = [...new Set(ids.map(exampleShardOf))];
  const parts = await Promise.all(shards.map((n) => loadExampleShard(level, n)));
  return Object.assign({}, ...parts);
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
// lemma-map (~1MB) và word-levels: cache theo PROMISE như loadWords (warm + phiên + tra từ dùng chung).
let lemmaMapCache: Promise<Record<string, string>> | null = null;
export function loadLemmaMap(): Promise<Record<string, string>> {
  if (!lemmaMapCache) {
    lemmaMapCache = fetch(`${BASE}/data/lemma-map.json`)
      .then((res) => (res.ok ? (res.json() as Promise<Record<string, string>>) : {}))
      .catch((e) => {
        lemmaMapCache = null;
        throw e;
      });
  }
  return lemmaMapCache;
}

let levelsCache: Promise<Record<string, number>> | null = null;
export function loadWordLevels(): Promise<Record<string, number>> {
  if (!levelsCache) {
    levelsCache = fetch(`${BASE}/data/word-levels.json`)
      .then((res) => (res.ok ? (res.json() as Promise<Record<string, number>>) : {}))
      .catch((e) => {
        levelsCache = null;
        throw e;
      });
  }
  return levelsCache;
}

const wordsByLevelCache = new Map<number, Promise<Map<string, Word>>>();
function wordsMap(level: number): Promise<Map<string, Word>> {
  let m = wordsByLevelCache.get(level);
  if (!m) {
    m = loadWords(level).then((ws) => new Map(ws.map((w) => [w.id, w])));
    m.catch(() => wordsByLevelCache.delete(level));
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
    .replace(/’/g, "'")
    .replace(/œ/g, "oe") // bộ từ ghi "soeur", "oeuf"
    .replace(/æ/g, "ae");
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
// Bài phỏng theo nguồn mở: tên gốc, tác giả/tuyển tập, giấy phép (khoá LICENSES trong lib/library-labels.ts), đường dẫn nguồn.
export interface ContentSource {
  title: string;
  credit: string;
  license: string;
  url: string;
}
export interface ReadingDoc {
  id: string;
  level: number;
  title_fr: string;
  title_vi: string;
  sentences: ReadingSentence[];
  paras?: number[]; // chỉ số câu mở mỗi đoạn (không có = một đoạn)
  source?: ContentSource;
  quiz?: number; // số câu hỏi đọc hiểu (public/data/quiz/{id}.json)
  series?: SeriesPos; // chuỗi bài theo cấp (bậc n/tổng)
}

// Chuỗi (scripts/build-content.mjs): bài đọc cùng chủ đề qua các cấp · các phần của một truyện dài (cùng cấp).
export interface SeriesLink {
  id: string;
  level: number;
  title_fr: string;
  title_vi: string;
}
export interface SeriesPos {
  id: string;
  order: number; // 1..count
  count: number;
  prev?: SeriesLink;
  next?: SeriesLink;
}

// Câu hỏi đọc hiểu cuối bài (content/quiz → scripts/build-content.mjs). a = chỉ số phương án ĐÚNG trong opts
// (giao diện xáo thứ tự hiển thị); why = giải thích tiếng Việt, trích «nguyên văn» câu trong bài.
export interface QuizQuestion {
  q: ReadingSentence;
  opts: ReadingSentence[];
  a: number;
  why: string;
}
export async function loadQuiz(id: string): Promise<QuizQuestion[]> {
  const res = await fetch(`${BASE}/data/quiz/${encodeURIComponent(id)}.json`);
  return res.ok ? ((await res.json()) as QuizQuestion[]) : [];
}
/** Câu hỏi của truyện: một mảng mỗi chương (chương chưa có câu hỏi = mảng rỗng). */
export async function loadStoryQuiz(id: string): Promise<QuizQuestion[][]> {
  const res = await fetch(`${BASE}/data/quiz/${encodeURIComponent(id)}.json`);
  return res.ok ? ((await res.json()) as QuizQuestion[][]) : [];
}
export interface ReadingMeta {
  id: string;
  level: number;
  title_fr: string;
  title_vi: string;
  n: number; // số câu
  topic: string; // khoá TOPICS (lib/library.ts)
  genre: string; // khoá GENRES
  words: number;
  min: number; // phút đọc ước lượng
  series?: string; // id chuỗi bài theo cấp
  src?: 1; // phỏng theo nguồn mở
}

let readingsIndexCache: ReadingMeta[] | null = null;
export async function loadReadingsIndex(): Promise<ReadingMeta[]> {
  if (readingsIndexCache) return readingsIndexCache;
  const res = await fetch(`${BASE}/data/readings-index.json`);
  readingsIndexCache = res.ok ? ((await res.json()) as ReadingMeta[]) : [];
  return readingsIndexCache;
}

// Chữ một bài / một truyện = một file (lib/library-files.ts): trang bài chỉ tải đúng bài đang mở. null = không có bài;
// lỗi mạng thì bỏ khỏi cache để lần sau thử lại.
const libraryDocs = new Map<string, Promise<unknown>>();
function loadLibraryDoc<T>(dir: LibraryDir, id: string): Promise<T | null> {
  const url = BASE + libraryDocPath(dir, id);
  let p = libraryDocs.get(url) as Promise<T | null> | undefined;
  if (!p) {
    p = fetch(url).then((res) => (res.ok ? (res.json() as Promise<T>) : null));
    p.catch(() => libraryDocs.delete(url));
    libraryDocs.set(url, p);
  }
  return p;
}
export const loadReading = (id: string) => loadLibraryDoc<ReadingDoc>("readings", id);

// ---- Truyện nhiều chương ----
export interface StoryChapterDoc {
  title_fr?: string; // truyện cũ B1–C2 chỉ có tên chương tiếng Việt
  title_vi: string;
  sentences: ReadingSentence[];
  paras?: number[]; // chỉ số câu mở mỗi đoạn (không có = một đoạn)
}
export interface StoryDoc {
  id: string;
  level: number;
  title_fr: string;
  title_vi: string;
  chapters: StoryChapterDoc[];
  source?: ContentSource;
  quiz?: number; // tổng số câu hỏi (public/data/quiz/{id}.json, theo chương)
  series?: SeriesPos; // truyện dài chia phần: phần n/tổng
}
export interface StoryMetaDoc {
  id: string;
  level: number;
  title_fr: string;
  title_vi: string;
  chapters: number;
  topic: string; // khoá TOPICS (lib/library.ts)
  summary: string; // tóm tắt tiếng Việt, không lộ kết
  words: number;
  min: number; // phút đọc ước lượng
  series?: string; // truyện dài chia nhiều phần: id chuỗi + phần thứ part/parts
  part?: number;
  parts?: number;
  src?: 1; // phỏng theo nguồn mở
}

let storiesIndexCache: StoryMetaDoc[] | null = null;
export async function loadStoriesIndex(): Promise<StoryMetaDoc[]> {
  if (storiesIndexCache) return storiesIndexCache;
  const res = await fetch(`${BASE}/data/stories-index.json`);
  storiesIndexCache = res.ok ? ((await res.json()) as StoryMetaDoc[]) : [];
  return storiesIndexCache;
}

export const loadStory = (id: string) => loadLibraryDoc<StoryDoc>("stories", id);
