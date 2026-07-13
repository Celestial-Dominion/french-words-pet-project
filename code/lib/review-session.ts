// Dựng danh sách câu hỏi cho một phiên ôn/học từ dữ liệu từ + ví dụ.
import type { Word, SrsConfig } from "./types";
import type { ExampleSentence } from "./data";

export type Question =
  | { kind: "learn"; word: Word; graded: false; example?: ExampleSentence }
  | { kind: "mcq"; word: Word; graded: true; isNew: boolean; prompt: string; options: string[]; answer: number }
  | { kind: "gender"; word: Word; graded: false; options: string[]; answer: number }
  | { kind: "arrange"; word: Word; graded: false; fr: string; vi: string; tokens: string[] };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Tách câu thành token để "sắp xếp câu" (giữ dấu câu dính vào từ).
export function tokenize(fr: string): string[] {
  return fr.trim().split(/\s+/);
}

/** MCQ nghĩa: hiện từ tiếng Pháp → chọn nghĩa Việt đúng trong 4 lựa chọn. */
function mcqFor(word: Word, pool: Word[], isNew: boolean): Question {
  const distractors = shuffle(pool.filter((w) => w.id !== word.id && w.meaning_vi))
    .slice(0, 3)
    .map((w) => w.meaning_vi);
  const options = shuffle([word.meaning_vi, ...distractors]);
  return {
    kind: "mcq",
    word,
    graded: true,
    isNew,
    prompt: word.id,
    options,
    answer: options.indexOf(word.meaning_vi),
  };
}

/** Câu hỏi chọn giống un/une cho danh từ. */
function genderFor(word: Word): Question {
  const options = ["un", "une"];
  return { kind: "gender", word, graded: false, options, answer: word.gender === "m" ? 0 : 1 };
}

/**
 * Dựng câu hỏi cho một tập từ trong phiên.
 * Từ MỚI: 1 thẻ "learn" (xem từ + nghĩa + ví dụ, không chấm) TRƯỚC khi kiểm tra —
 * người mới không bị hỏi MCQ trên từ chưa từng thấy.
 * Mỗi từ: 1 MCQ (chấm FSRS) + arrangePerWord câu sắp xếp + (tỉ trọng thấp) 1 câu chọn giống nếu là danh từ.
 */
export function buildQuestions(
  words: Word[],
  examplesByWord: Record<string, ExampleSentence[]>,
  pool: Word[],
  config: SrsConfig,
  isNew: boolean,
): Question[] {
  const out: Question[] = [];
  for (const w of words) {
    if (isNew) out.push({ kind: "learn", word: w, graded: false, example: (examplesByWord[w.id] || [])[0] });
    out.push(mcqFor(w, pool, isNew));

    const ex = examplesByWord[w.id] || [];
    for (let i = 0; i < Math.min(config.arrangePerWord, ex.length); i++) {
      const s = ex[i];
      const tokens = tokenize(s.fr);
      if (tokens.length >= 3 && tokens.length <= 12) {
        out.push({ kind: "arrange", word: w, graded: false, fr: s.fr, vi: s.vi, tokens });
      }
    }

    // chọn giống: chỉ danh từ có giống, tỉ trọng thấp (~30%)
    if (config.genderQuestions && w.pos.includes("n") && w.gender && Math.random() < 0.3) {
      out.push(genderFor(w));
    }
  }
  return out;
}
