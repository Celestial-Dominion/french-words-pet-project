// Siêu dữ liệu cấp CEFR cho tiếng Pháp: 1..6 = A1..C2.

export interface LevelMeta {
  level: number; // 1..6
  label: string; // nhãn UI
  cefr: string; // A1..C2
  words: number; // số từ dự kiến (mục 1.2 trong plan)
}

export const LEVELS: LevelMeta[] = [
  { level: 1, label: "A1 · Vỡ lòng", cefr: "A1", words: 800 },
  { level: 2, label: "A2 · Sơ cấp", cefr: "A2", words: 1200 },
  { level: 3, label: "B1 · Trung cấp", cefr: "B1", words: 2000 },
  { level: 4, label: "B2 · Trung cao", cefr: "B2", words: 2500 },
  { level: 5, label: "C1 · Cao cấp", cefr: "C1", words: 3000 },
  { level: 6, label: "C2 · Nâng cao", cefr: "C2", words: 1500 },
];

export function levelMeta(level: number): LevelMeta | undefined {
  return LEVELS.find((l) => l.level === level);
}

// Tên file dữ liệu theo cấp: 1 → "a1", … 6 → "c2".
export function levelSlug(level: number): string {
  return levelMeta(level)?.cefr.toLowerCase() ?? "a1";
}

// Cấp từ id file (a1..c2) → số 1..6.
export function levelFromCefr(cefr: string): number {
  const i = LEVELS.findIndex((l) => l.cefr.toLowerCase() === cefr.toLowerCase());
  return i >= 0 ? i + 1 : 1;
}

// Màu nhấn theo cấp (class Tailwind literal để không bị purge).
export interface LevelAccent {
  text: string;
  bar: string;
  grad: string;
  badge: string;
}

const ACCENTS: Record<number, LevelAccent> = {
  1: { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", grad: "from-emerald-500/15 to-transparent", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  2: { text: "text-sky-600 dark:text-sky-400", bar: "bg-sky-500", grad: "from-sky-500/15 to-transparent", badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  3: { text: "text-violet-600 dark:text-violet-400", bar: "bg-violet-500", grad: "from-violet-500/15 to-transparent", badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  4: { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", grad: "from-amber-500/15 to-transparent", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  5: { text: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500", grad: "from-rose-500/15 to-transparent", badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  6: { text: "text-cyan-600 dark:text-cyan-400", bar: "bg-cyan-500", grad: "from-cyan-500/15 to-transparent", badge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" },
};

export function levelAccent(level: number): LevelAccent {
  return ACCENTS[level] ?? ACCENTS[1];
}

// Cấp học liệu theo khoá chuỗi a1..c2 (Ngữ pháp, Thư viện): band 0..5, vocabLevel = cấp từ vựng 1..6 cùng màu.
export interface ContentLevel {
  key: string;
  cefr: string;
  label: string;
  band: number;
  vocabLevel: number;
}
export const CONTENT_LEVELS: ContentLevel[] = LEVELS.map((l, i) => ({
  key: l.cefr.toLowerCase(),
  cefr: l.cefr,
  label: l.label,
  band: i,
  vocabLevel: l.level,
}));

export function contentLevel(key: string): ContentLevel | undefined {
  return CONTENT_LEVELS.find((l) => l.key === key);
}

/** Màu nhấn theo cấp học liệu = màu cấp từ vựng tương ứng. */
export function contentAccent(key: string): LevelAccent {
  return levelAccent(contentLevel(key)?.vocabLevel ?? 1);
}
