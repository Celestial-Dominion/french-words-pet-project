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
  family?: string[]; // họ từ: id các từ cùng gốc CÓ trong bộ từ (scripts/build-family.mjs), tối đa 8
  collocations?: [string, string][]; // cụm hay đi kèm: [cụm tiếng Pháp, nghĩa tiếng Việt], 1–4 cụm (scripts/build-collocations.mjs)
  register?: string[]; // văn phong: informal | slang | vulgar | offensive | literary | formal | dated (scripts/build-register.mjs)
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
  // "Đã biết sẵn" (markKnown): ms lúc đánh dấu. Còn cờ = chưa từng trả lời sai kể từ khi đánh dấu
  // → lịch NỚI (srs.ts scheduleKnown); sai một lần là bỏ cờ, về lịch chặt như thẻ thường.
  known?: number;
  // "Học lại": phiên ôn kế hiện thẻ HỌC (xem từ + ví dụ) trước câu chấm; bỏ cờ sau lần chấm đó.
  relearn?: boolean;
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
  spelling: boolean; // xen câu GÕ CHÍNH TẢ từ thẻ đang bền (≥3 lần gặp / bền ≥7 ngày) trở đi.
  listenEnabled: boolean; // cho phép dạng NGHE → chọn nghĩa trong bài chính.
  clozeEnabled: boolean; // CŨ: bật/tắt điền câu. Giữ để config đã sync tương thích ngược.
  // Số câu điền mỗi từ (0 = tắt), như arrangePerWord. Không đặt trong DEFAULT:
  // config cũ không có trường này, nơi dùng suy ra từ clozeEnabled (true→1 / false→0).
  clozePerWord?: number;
  autoAdvance: boolean; // trả lời ĐÚNG → tự sang thẻ kế.
  sentenceVi: boolean; // hiện NGHĨA câu ngay từ đầu ở điền từ & ghép câu; TẮT (mặc định) = làm xong mới hiện.
  // Trộn các đợt của mọi từ; cùng một từ được giãn cách ≥3 đợt.
  interleave?: boolean;
  // Tỉ lệ token đã biết tối thiểu khi ưu tiên câu điền/ghép. 0 = tắt.
  // Nếu không có câu đạt ngưỡng, vẫn lấy câu có tỉ lệ cao nhất thay vì bỏ bài.
  sentenceKnownMin: number;
  // 🔊 Công tắc ÂM THANH tổng: tự đọc từ/câu khi hiện thẻ & sau khi trả lời, câu hỏi NGHE, nhạc chúc mừng,
  // bài Nghe & gõ câu. TẮT khi học ở nơi không mở tiếng được — nút loa bấm tay vẫn phát (chủ ý người dùng).
  soundEnabled: boolean;
}

export const DEFAULT_SRS_CONFIG: SrsConfig = {
  newPerDay: 5,
  reviewPerSession: 0,
  direction: "fr2vi",
  newLevel: 0,
  arrangePerWord: 1,
  genderQuestions: true,
  recallFirst: true,
  spelling: true,
  listenEnabled: true,
  clozeEnabled: true,
  autoAdvance: true,
  sentenceVi: false, // ẩn nghĩa lúc đang làm — không bị bản dịch mớm đáp án
  interleave: true,
  sentenceKnownMin: 0.7,
  soundEnabled: true,
};

// ---- Nhật ký từng lượt chấm (revlog — như HSK) ----
// Bảng reviews chỉ giữ trạng thái MỚI NHẤT của thẻ; revlog giữ lịch sử TỪNG lượt —
// nguyên liệu để sau này tối ưu tham số FSRS cá nhân hoá. Chỉ nằm local (không sync),
// có trong tệp sao lưu để đổi máy không mất; giữ 2 năm, phần cũ hơn tự dọn.
export interface RevlogRow {
  id?: number; // ++id tự tăng (Dexie)
  wordId: string;
  at: number; // ms epoch — thời điểm chấm
  rating: number; // 1=Lại 2=Khó 3=Được 4=Dễ
  state: number; // trạng thái thẻ TRƯỚC lượt chấm (New/Learning/Review/Relearning)
  elapsed_days: number;
  scheduled_days: number;
  stability: number; // SAU khi chấm
  difficulty: number;
}

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
  maxCombo?: number; // 💥 chuỗi trả lời đúng liên tiếp dài nhất trong một phiên (max-merge)
  questsDone?: string[]; // nhiệm vụ ngày ĐÃ NHẬN thưởng, khoá "YYYY-MM-DD:qid" (union-merge, dọn >14 ngày)
}
