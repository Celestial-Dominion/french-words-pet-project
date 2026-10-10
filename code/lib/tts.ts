// Ánh xạ từ/câu → file audio MP3 tải sẵn (edge-tts, giọng fr-FR-DeniseNeural).
// Frontend và build script DÙNG CHUNG các hàm này để tên file luôn khớp.
import type { Word } from "./types";
import { audioName, hashLong } from "./slug";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Chuỗi để ĐỌC một từ: danh từ đọc kèm mạo từ không xác định để học giống qua tai
 * ("une école", "un chien"). Từ loại khác đọc nguyên từ.
 */
export function wordSpoken(w: Word): string {
  if (w.pos.includes("n") && w.gender) {
    return `${w.gender === "m" ? "un" : "une"} ${w.id}`;
  }
  return w.id;
}

/** Tên file audio của một từ (không kèm thư mục): "une école" → "une-ecole-xxxx.mp3". */
export function wordAudioFile(w: Word): string {
  return `${audioName(wordSpoken(w))}.mp3`;
}

/** Tên file audio của một câu ví dụ (hash dài chống trùng). */
export function sentenceAudioFile(fr: string): string {
  return `${hashLong(fr)}.mp3`;
}

/** URL phát audio của một từ. */
export function wordAudioUrl(w: Word): string {
  return `${BASE}/audio/words/${wordAudioFile(w)}`;
}

/** URL phát audio của một câu. */
export function sentenceAudioUrl(fr: string): string {
  return `${BASE}/audio/sentences/${sentenceAudioFile(fr)}`;
}

/** URL phát audio cho mục phát âm (bài /phat-am). */
export function phonicsAudioUrl(say: string): string {
  return `${BASE}/audio/phonics/${hashLong(say)}.mp3`;
}

// ---- Phát audio: MỘT tiếng tại một thời điểm ----
// Dùng chung cho cả app: trước đây mỗi component tự `new Audio().play()`, nên bấm loa liên tiếp
// ở thẻ từ là chồng tiếng lên nhau.
let currentAudio: HTMLAudioElement | null = null;

/** Phát một file audio, dừng file đang phát (nếu có). Lỗi tải file được nuốt (audio là phụ trợ). */
export function playAudio(url: string): HTMLAudioElement {
  stopAudio();
  const a = new Audio(url);
  currentAudio = a;
  a.play().catch(() => {});
  return a;
}

export function stopAudio(): void {
  try {
    currentAudio?.pause();
  } catch {
    /* trình duyệt có thể ném khi audio chưa sẵn sàng */
  }
  currentAudio = null;
}
