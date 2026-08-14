// SRS bằng ts-fsrs — cấu hình CHẶT cho người hay quên (giữ đúng tinh thần app HSK).
import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating,
  type Card,
  type Grade,
} from "ts-fsrs";
import type { ReviewRecord } from "./types";

// request_retention 0.97 (giữ 97%), tối đa 120 ngày; learning steps phút→giờ→12h.
export const FSRS_PARAMS = generatorParameters({
  request_retention: 0.97,
  maximum_interval: 120,
  learning_steps: ["1m", "10m", "1h", "12h"],
  relearning_steps: ["10m", "1h"],
  enable_fuzz: true,
  enable_short_term: true,
});

const f = fsrs(FSRS_PARAMS);

// Ôn tập trắc nghiệm tự chấm: đúng = Good, sai = Again (không có nút Khó/Dễ thủ công).
export const RATING = { wrong: Rating.Again as Grade, right: Rating.Good as Grade };

/** Thẻ mới (chưa học). */
export function newCard(now: Date): Card {
  return createEmptyCard(now);
}

/** Lên lịch lại một thẻ sau khi trả lời. */
export function schedule(card: Card, correct: boolean, now: Date): Card {
  const { card: next } = f.next(card, now, correct ? RATING.right : RATING.wrong);
  return next;
}

/** Lên lịch với mức chấm cụ thể (Lại/Khó/Được/Dễ). */
export function scheduleRated(card: Card, rating: Grade, now: Date): Card {
  const { card: next } = f.next(card, now, rating);
  return next;
}

// Từ "hay quên" (leech) và từ "đã chín" — dùng để chọn loại câu hỏi + thẻ ôn lại kỹ.
export const LEECH_LAPSES = 4; // quên ≥4 lần → leech
export const MATURE_STABILITY = 7; // stability ≥7 ngày → đã chín (mới hỏi cloze)
export const isLeech = (r?: ReviewRecord | null) => !!r && (r.lapses ?? 0) >= LEECH_LAPSES;
export const isMature = (r?: ReviewRecord | null) => !!r && r.stability >= MATURE_STABILITY && !isLeech(r);

/**
 * Suy mức chấm tự động từ kết quả + TỐC ĐỘ trả lời (ngưỡng "chậm" theo LOẠI câu):
 *   - sai                     → Lại  (Again)
 *   - đúng nhưng > 45s         → Được (Good) — coi như rời máy/xao nhãng, KHÔNG phạt Khó
 *   - đúng nhưng chậm (≥ slow) → Khó  (Hard)
 *   - còn lại                  → Được (Good)
 * Cloze phải đọc cả câu, listen phải nghe hết audio → ngưỡng "chậm" nới hơn câu thường.
 *
 * ⚠️ KHÔNG BAO GIỜ chấm Dễ (Easy) cho câu ôn tập — và đừng thêm lại nhánh đó:
 * mọi câu ở đây đều là TRẮC NGHIỆM 4 phương án, tức chỉ NHẬN RA đáp án chứ không
 * TỰ NHỚ RA, nên "đúng nhanh" KHÔNG chứng minh trí nhớ bền. Tệ hơn: khi bật "nhớ
 * lại trước" (recallFirst, mặc định bật) đồng hồ chỉ chạy TỪ LÚC HIỆN đáp án nên
 * gần như câu đúng nào cũng 1–2s. Nếu cho ra Easy, FSRS áp hệ số easy_bonus làm
 * stability/khoảng cách phình rất nhanh → lịch ôn "lỏng ngầm": từ vừa học hôm qua
 * bị đẩy vài ngày–vài tuần sau mới gặp lại. Vì vậy thang tự động chỉ có Again/Hard/Good.
 */
export function ratingFromSpeed(correct: boolean, ms: number, mode?: "meaning" | "reverse" | "cloze" | "listen"): Grade {
  if (!correct) return Rating.Again as Grade;
  if (ms > 45_000) return Rating.Good as Grade; // rời máy/xao nhãng, không phạt Khó
  const slow = mode === "cloze" ? 14_000 : mode === "listen" ? 12_000 : 9000;
  if (ms >= slow) return Rating.Hard as Grade;
  return Rating.Good as Grade; // đúng, trong ngưỡng → Được (không thưởng Easy cho nhận-diện)
}

/** ReviewRecord (lưu DB) → Card (ts-fsrs). */
export function recordToCard(r: ReviewRecord): Card {
  return {
    due: new Date(r.due),
    stability: r.stability,
    difficulty: r.difficulty,
    elapsed_days: r.elapsed_days,
    scheduled_days: r.scheduled_days,
    reps: r.reps,
    lapses: r.lapses,
    learning_steps: r.learning_steps,
    state: r.state,
    last_review: r.last_review ? new Date(r.last_review) : undefined,
  } as Card;
}

/** Card → phần FSRS của ReviewRecord (giữ nguyên wordId/level/introducedOn ở nơi gọi). */
export function cardToRecordFields(c: Card) {
  return {
    due: c.due,
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    learning_steps: c.learning_steps ?? 0,
    state: c.state,
    last_review: c.last_review,
  };
}
