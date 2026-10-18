// Tiến độ các khóa học nhỏ (phát âm, ngữ pháp) lưu localStorage —
// được đưa vào sync cloud + sao lưu (trước đây chỉ nằm trên máy, mất là mất hẳn).
// Ngữ pháp: mỗi bài một dòng mã hoá (lib/grammar.ts encodeGrammarRow — điểm, lịch ôn riêng; đọc được cả mục cũ).
// Phát âm: mỗi bài một mục "id~mốc[~0]" (lib/sync-merge.ts): tích / bỏ tích đều mang mốc thời gian để đồng bộ
// lấy hành động sau cùng — bỏ tích không bị máy khác hồi sinh. Mục cũ chỉ có "id" vẫn đọc được (= đã học).
import { courseDoneIds, courseEntry, mergeCourseEntries } from "./sync-merge";
import { decodeGrammarRows, isLearned, mergeGrammarCodes } from "./grammar";

const KEYS = {
  phonics: "fr.phonicsDone",
  grammar: "fr.grammarDone",
} as const;
export type CourseKey = keyof typeof KEYS;

/** Mục tiến độ thô (để đồng bộ / sao lưu). */
export function courseEntries(course: CourseKey): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEYS[course]) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveCourseEntries(course: CourseKey, entries: string[]): void {
  try {
    localStorage.setItem(KEYS[course], JSON.stringify(entries));
  } catch {
    /* bỏ qua */
  }
}

export function getCourseDone(course: CourseKey): Set<string> {
  if (course === "grammar") return new Set(decodeGrammarRows(courseEntries(course)).filter(isLearned).map((r) => r.id));
  return new Set(courseDoneIds(courseEntries(course)));
}

/** Tích / bỏ tích một bài phát âm (ghi mốc thời gian hiện tại) — ngữ pháp dùng lib/grammar-progress.ts. */
export function markCourseDone(course: CourseKey, id: string, v: boolean, now = Date.now()): Set<string> {
  saveCourseEntries(course, mergeCourseEntries(courseEntries(course), [courseEntry({ id, t: now, off: !v })]));
  return getCourseDone(course);
}

/** Hợp nhất tiến độ từ cloud / tệp sao lưu (hành động sau cùng thắng). */
export function mergeCourseDone(course: CourseKey, remote: string[]): string[] {
  if (course === "grammar") {
    const merged = mergeGrammarCodes(courseEntries(course), remote);
    saveCourseEntries(course, merged);
    if (typeof window !== "undefined") window.dispatchEvent(new Event("fr:grammar"));
    return merged;
  }
  const merged = mergeCourseEntries(courseEntries(course), remote);
  saveCourseEntries(course, merged);
  return merged;
}

/** Đã học bài ngữ pháp về GIỐNG của danh từ chưa? — câu hỏi chọn un/une chỉ mở sau bài này. */
export function genderTaught(): boolean {
  return getCourseDone("grammar").has("giong-danh-tu");
}
