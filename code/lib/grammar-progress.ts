// Tiến độ bài Ngữ pháp: localStorage "fr.grammarDone" — mỗi bài một chuỗi mã hoá (lib/grammar.ts encodeGrammarRow),
// đi thẳng qua trường `grammar: string[]` của đồng bộ / sao lưu. Khác app Anh (bảng Dexie): giữ localStorage để cổng
// đồng bộ `genderTaught()` (câu chọn un/une mở sau bài giong-danh-tu) vẫn đọc được tức thì. Mục kiểu cũ "id~mốc[~0]"
// (khoá 11 bài chữ) vẫn đọc được — decodeGrammarRow nhận cả hai. Chạy client.
import { useSyncExternalStore } from "react";
import { addXp, recordPractice } from "./db";
import { XP } from "./gamify";
import { requestSync } from "./sync";
import { courseEntries, saveCourseEntries } from "./progress-local";
import { applyPractice, decodeGrammarRows, encodeGrammarRow, markLearned, mergeGrammarCodes, unmarkLearned, type GrammarRow } from "./grammar";

export const GRAMMAR_EVENT = "fr:grammar";

function readRows(): Map<string, GrammarRow> {
  return new Map(decodeGrammarRows(courseEntries("grammar")).map((r) => [r.id, r]));
}

function writeRow(row: GrammarRow): void {
  saveCourseEntries("grammar", mergeGrammarCodes(courseEntries("grammar").filter((s) => s.split("~")[0] !== row.id), [encodeGrammarRow(row)]));
  window.dispatchEvent(new Event(GRAMMAR_EVENT));
}

export async function grammarRows(): Promise<Map<string, GrammarRow>> {
  return readRows();
}

export async function grammarRow(id: string): Promise<GrammarRow | undefined> {
  return readRows().get(id);
}

// Hook: bảng tiến độ, tự cập nhật khi ghi (sự kiện fr:grammar — cả lúc đồng bộ kéo về) hoặc tab khác đổi localStorage.
// Ảnh chụp giữ theo chuỗi thô để useSyncExternalStore không lặp vô hạn.
let snapRaw: string | null = null;
let snap: Map<string, GrammarRow> | undefined;
function getSnap(): Map<string, GrammarRow> {
  let raw = "";
  try {
    raw = localStorage.getItem("fr.grammarDone") ?? "";
  } catch {
    /* bỏ qua */
  }
  if (raw !== snapRaw || !snap) {
    snapRaw = raw;
    snap = readRows();
  }
  return snap;
}
function subscribe(cb: () => void): () => void {
  window.addEventListener(GRAMMAR_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(GRAMMAR_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
export function useGrammarRows(): Map<string, GrammarRow> | undefined {
  return useSyncExternalStore(subscribe, getSnap, () => undefined);
}

// Một câu luyện tập vừa trả lời: tính vào thống kê ngày (chuỗi ngày, nhiệm vụ) như Luyện tập tự do + XP khi đúng.
export async function recordGrammarAnswer(correct: boolean): Promise<void> {
  await recordPractice(correct).catch(() => {});
  if (correct) await addXp(XP.practice).catch(() => {});
}

// Ghi kết quả một lần luyện tập (điểm 0–100) → cập nhật đã học / lịch ôn, rồi xin đồng bộ.
export async function recordGrammarPractice(id: string, score: number, now = new Date()): Promise<GrammarRow> {
  const next = applyPractice(readRows().get(id), id, score, now);
  writeRow(next);
  requestSync();
  return next;
}

// Tích tay đã học (không xếp lịch ôn — lib/grammar.ts markLearned) / bỏ đánh dấu (giữ điểm cao nhất, mốc mới hơn thắng
// khi đồng bộ).
export async function setGrammarLearned(id: string, learned: boolean, now = new Date()): Promise<void> {
  const cur = readRows().get(id);
  if (learned) writeRow(markLearned(cur, id, now));
  else if (cur) writeRow(unmarkLearned(cur, now));
  requestSync();
}
