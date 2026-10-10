// Tiến độ các khóa học nhỏ (phát âm, ngữ pháp) lưu localStorage —
// được đưa vào sync cloud + sao lưu (trước đây chỉ nằm trên máy, mất là mất hẳn).
// Mỗi bài một mục "id~mốc[~0]" (lib/sync-merge.ts): tích / bỏ tích đều mang mốc thời gian để đồng bộ
// lấy hành động sau cùng — bỏ tích không bị máy khác hồi sinh. Mục cũ chỉ có "id" vẫn đọc được (= đã học).
import { courseDoneIds, courseEntry, mergeCourseEntries } from "./sync-merge";

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

function saveEntries(course: CourseKey, entries: string[]): void {
  try {
    localStorage.setItem(KEYS[course], JSON.stringify(entries));
  } catch {
    /* bỏ qua */
  }
}

export function getCourseDone(course: CourseKey): Set<string> {
  return new Set(courseDoneIds(courseEntries(course)));
}

/** Tích / bỏ tích một bài (ghi mốc thời gian hiện tại). */
export function markCourseDone(course: CourseKey, id: string, v: boolean, now = Date.now()): Set<string> {
  saveEntries(course, mergeCourseEntries(courseEntries(course), [courseEntry({ id, t: now, off: !v })]));
  return getCourseDone(course);
}

/** Hợp nhất tiến độ từ cloud / tệp sao lưu (hành động sau cùng thắng). */
export function mergeCourseDone(course: CourseKey, remote: string[]): string[] {
  const merged = mergeCourseEntries(courseEntries(course), remote);
  saveEntries(course, merged);
  return merged;
}

/** Đã học bài ngữ pháp về GIỐNG của danh từ chưa? — câu hỏi chọn un/une chỉ mở sau bài này. */
export function genderTaught(): boolean {
  return getCourseDone("grammar").has("giong-danh-tu");
}
