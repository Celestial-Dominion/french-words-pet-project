// Kiểu dữ liệu dùng chung cho toàn app học từ vựng tiếng Pháp.

export type Gender = "m" | "f";

export interface Word {
  id: string; // lemma, NFC (vd "manger", "école")
  ipa: string; // /ekɔl/
  gender?: Gender; // danh từ; hiển thị "une école (f)"
  plural?: string; // chỉ khi bất quy tắc (travail → travaux)
  pos: string[]; // n, v, adj, adv, prep… (map lib/pos.ts)
  verb_group?: 1 | 2 | 3;
  meaning_vi: string;
  meaning_en: string[];
  level: number; // 1..6 = A1..C2
  frequency: number; // hạng tần suất trộn
  forms?: string[]; // các dạng chia/biến hình để tra ngược (sinh từ Lexique)
  search: string; // chuỗi bỏ dấu ("école" → "ecole") để gõ không dấu vẫn tìm được
}

// Chỉ mục từ rút gọn: id -> [ipa, meaning_vi]
export type WordIndex = Record<string, [string, string]>;

// Câu ví dụ (≥3 câu/từ). public/data/examples/…
export interface Example {
  wordId: string;
  fr: string;
  vi: string;
}

// ---- Chia động từ — public/data/conjugations/{lemma}.json ----
// Bảng chia các thì cốt lõi; mỗi thì là 6 ngôi (je, tu, il/elle, nous, vous, ils/elles).
export interface Conjugation {
  lemma: string;
  group?: 1 | 2 | 3;
  irregular?: boolean;
  // key = tên thì ("present", "passe_compose", "imparfait", "futur"), value = 6 dạng chia.
  tenses: Record<string, string[]>;
}

// ---- Bài đọc & truyện (graded readers) ----
// Token = từ tách theo khoảng trắng; bấm-tra qua lemma-map.
export interface ReadingToken {
  w: string; // dạng mặt chữ hiển thị
  wordId?: string; // lemma tra được trong bộ từ (nếu có)
}

export interface Reading {
  id: string;
  level: number;
  title_fr: string;
  title_vi: string;
  tokens: ReadingToken[];
  vi: string;
}

export interface StoryChapter {
  title_vi: string;
  tokens: ReadingToken[];
  vi: string;
}

export interface Story {
  id: string;
  level: number;
  title_fr: string;
  title_vi: string;
  chapters: StoryChapter[];
}

// Mục trong stories-index.json (không kèm nội dung chương).
export interface StoryMeta {
  id: string;
  level: number;
  title_fr: string;
  title_vi: string;
  chapters: number;
}

// Bài đọc/truyện chứa một từ → bắc cầu "ôn xong đọc trong ngữ cảnh".
export interface WordOccurrence {
  type: "reading" | "story";
  id: string;
  level: number;
  title: string;
}
export type WordOccurrenceMap = Record<string, WordOccurrence[]>;

// ---- SRS (F4) ----

// Bản ghi ôn tập (1 thẻ / mỗi wordId). Lưu đủ tham số FSRS (Card).
export interface ReviewRecord {
  wordId: string;
  level: number;
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  learning_steps: number;
  state: number; // 0 New, 1 Learning, 2 Review, 3 Relearning
  last_review?: Date;
  introducedOn: string; // "YYYY-MM-DD" (giờ địa phương)
}

export type ReviewDirection = "fr2vi" | "vi2fr"; // Pháp→nghĩa / nghĩa→Pháp

export interface SrsConfig {
  newPerDay: number;
  reviewPerSession: number; // giới hạn thẻ đến hạn mỗi phiên ôn (0 = không giới hạn)
  direction: ReviewDirection;
  newLevel: number; // 0 = tự động (cấp thấp nhất còn từ chưa học); 1..6 = cố định
  arrangePerWord: number; // số câu "sắp xếp câu" mỗi từ (0 = tắt). Mặc định 1.
  genderQuestions: boolean; // xen câu hỏi "chọn giống đúng" (un/une) cho danh từ, tỉ trọng thấp.
  recallFirst: boolean; // ẩn đáp án, bắt "nhớ lại" trước khi hiện.
  autoAdvance: boolean; // trả lời ĐÚNG → tự sang thẻ kế.
}

export const DEFAULT_SRS_CONFIG: SrsConfig = {
  newPerDay: 5,
  reviewPerSession: 0,
  direction: "fr2vi",
  newLevel: 0,
  arrangePerWord: 1,
  genderQuestions: true,
  recallFirst: true,
  autoAdvance: true,
};

// ---- Tiến độ & chuỗi ngày (F7) ----

export interface DailyStat {
  date: string; // "YYYY-MM-DD"
  reviews: number;
  newCount: number;
  again: number;
}

export interface ReadRow {
  id: string;
  readAt: string; // ISO
  removedAt?: string; // ISO — bỏ đánh dấu sau khi đã đọc (tombstone để sync không "hồi sinh")
}

export interface NoteRow {
  wordId: string;
  text: string; // "" = đã xoá (tombstone cho sync)
  at?: number; // ms — lần sửa cuối (máy sửa sau thắng khi sync)
}

export interface GamifyRow {
  key: string; // "state"
  xp: number;
  freezes?: number; // 🧊 lượt đóng băng chuỗi còn lại
  frozenDates?: string[]; // các ngày đã được đóng băng (tính như có học)
  grantStreak?: number; // mốc chuỗi đã tặng freeze lần cuối (tặng mỗi mốc 7 ngày)
}
