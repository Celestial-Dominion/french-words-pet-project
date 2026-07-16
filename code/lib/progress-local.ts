// Tiến độ các khóa học nhỏ (phát âm, ngữ pháp) lưu localStorage —
// được đưa vào sync cloud + sao lưu (trước đây chỉ nằm trên máy, mất là mất hẳn).

const KEYS = {
  phonics: "fr.phonicsDone",
  grammar: "fr.grammarDone",
} as const;
export type CourseKey = keyof typeof KEYS;

export function getCourseDone(course: CourseKey): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEYS[course]) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function setCourseDone(course: CourseKey, done: Set<string>): void {
  try {
    localStorage.setItem(KEYS[course], JSON.stringify([...done]));
  } catch {
    /* bỏ qua */
  }
}

export function markCourseDone(course: CourseKey, id: string, v: boolean): Set<string> {
  const s = getCourseDone(course);
  if (v) s.add(id);
  else s.delete(id);
  setCourseDone(course, s);
  return s;
}

/** Hợp nhất tiến độ từ cloud (union — đã học ở máy nào cũng tính). */
export function mergeCourseDone(course: CourseKey, remote: string[]): string[] {
  const s = getCourseDone(course);
  for (const id of remote) s.add(id);
  setCourseDone(course, s);
  return [...s];
}

/** Đã học bài ngữ pháp về GIỐNG của danh từ chưa? — câu hỏi chọn un/une chỉ mở sau bài này. */
export function genderTaught(): boolean {
  return getCourseDone("grammar").has("giong-danh-tu");
}
