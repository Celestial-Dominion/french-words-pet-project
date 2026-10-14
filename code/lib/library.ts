// Thư viện đọc (bài đọc + truyện): nhãn chủ đề / thể loại (cùng bộ khoá với app Anh), đường dẫn trang bài, thời lượng.
// Chủ đề, thể loại, tóm tắt truyện khai ở đầu mỗi bài/truyện trong content/ → scripts/build-content.mjs ghép vào chỉ mục.
import { levelFromCefr, levelSlug, LEVELS } from "./levels";

export { GENRES, LICENSES, TOPICS } from "./library-labels";

export type LibraryKind = "reading" | "story";

/** Trang một bài đọc / truyện: /bai-doc/a1/a1-01, /truyen/b1/b1-story-01. */
export function libraryHref(kind: LibraryKind, level: number, id: string): string {
  return `${kind === "reading" ? "/bai-doc" : "/truyen"}/${levelSlug(level)}/${encodeURIComponent(id)}`;
}

/** Trang danh sách một cấp: /bai-doc/a1. */
export function libraryLevelHref(kind: LibraryKind, level: number): string {
  return `${kind === "reading" ? "/bai-doc" : "/truyen"}/${levelSlug(level)}`;
}

/** "a1" → 1; khoá không hợp lệ → undefined. */
export function levelOfSlug(slug: string): number | undefined {
  return LEVELS.some((l) => l.cefr.toLowerCase() === slug) ? levelFromCefr(slug) : undefined;
}

export function fmtMinutes(min: number): string {
  return `${Math.max(1, Math.round(min))} phút`;
}
