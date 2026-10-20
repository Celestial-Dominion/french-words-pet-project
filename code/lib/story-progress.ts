// Vị trí chương đang đọc của truyện: mở lại truyện là về đúng chương, ở máy nào cũng vậy.
// Một khoá localStorage `fr.storyPos` = { [id]: { ch, at } } (như app Anh `en.storyPos`) để gói gọn đẩy lên cloud
// (lib/sync-data.ts, trường `storyPos`): mỗi truyện lấy bản có `at` mới hơn — máy đọc sau thắng (mergeStoryPos).
// Khoá cũ từng truyện `fr.story.<id>.ch` (trước khi đồng bộ) tự chuyển sang một lần, mốc 0 = thua mọi bản có mốc.
import { mergeStoryPos, sanitizeStoryPos, type StoryPos } from "./sync-merge";

const KEY = "fr.storyPos";
const LEGACY = /^fr\.story\.(.+)\.ch$/;
let migrated = false;

function migrateLegacy(all: Record<string, StoryPos>): void {
  migrated = true;
  const old: [string, string][] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    const m = k ? LEGACY.exec(k) : null;
    if (k && m) old.push([k, m[1]]);
  }
  if (!old.length) return;
  for (const [k, id] of old) {
    const ch = Number(localStorage.getItem(k));
    if (!all[id] && Number.isInteger(ch) && ch >= 0) all[id] = { ch, at: 0 };
    localStorage.removeItem(k);
  }
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getStoryPositions(): Record<string, StoryPos> {
  try {
    const all = sanitizeStoryPos(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
    if (!migrated) migrateLegacy(all);
    return all;
  } catch {
    return {};
  }
}

export function savedChapter(id: string, max: number): number {
  const n = getStoryPositions()[id]?.ch ?? 0;
  return Math.max(0, Math.min(n, max - 1));
}

/** Ghi chương đang đọc (người dùng chuyển chương). Cùng chương thì thôi — không đẩy mốc thời gian lên vô cớ. */
export function saveChapter(id: string, ch: number, now = Date.now()): void {
  try {
    const all = getStoryPositions();
    if (all[id]?.ch === ch) return;
    all[id] = { ch, at: now };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* bỏ qua */
  }
}

/** Hợp nhất vị trí đọc từ cloud / tệp sao lưu (mỗi truyện lấy bản mới hơn); replace = thay hẳn bằng bản kia. */
export function mergeStoryPositions(remote: Record<string, StoryPos>, replace = false): Record<string, StoryPos> {
  const out = replace ? sanitizeStoryPos(remote) : mergeStoryPos(getStoryPositions(), remote);
  try {
    localStorage.setItem(KEY, JSON.stringify(out));
  } catch {
    /* bỏ qua */
  }
  return out;
}
