// Vị trí chương đang đọc của truyện — localStorage (như HSK): mở lại truyện là về đúng chương.
export const chapterKey = (id: string) => `fr.story.${id}.ch`;

export function savedChapter(id: string, max: number): number {
  try {
    const n = Number(localStorage.getItem(chapterKey(id)) ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.min(n, max - 1)) : 0;
  } catch {
    return 0;
  }
}

export function saveChapter(id: string, ch: number): void {
  try {
    localStorage.setItem(chapterKey(id), String(ch));
  } catch {
    /* bỏ qua */
  }
}
