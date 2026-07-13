// Dựng danh sách câu hỏi cho một phiên ôn/học từ dữ liệu từ + ví dụ.
import type { Word, SrsConfig } from "./types";
import type { ExampleSentence } from "./data";

// 4 chế độ câu trắc nghiệm (chấm FSRS): xem từ→chọn nghĩa, nghĩa→chọn từ (ngược),
// điền từ vào câu (cloze), nghe→chọn nghĩa (listen).
export type McqMode = "meaning" | "reverse" | "cloze" | "listen";

export type Question =
  | { kind: "learn"; word: Word; graded: false; example?: ExampleSentence }
  | {
      kind: "mcq";
      mode: McqMode;
      word: Word;
      graded: true;
      isNew: boolean;
      prompt: string; // meaning/listen: từ Pháp · reverse: nghĩa VI · cloze: không dùng
      options: string[];
      answer: number;
      clozeBefore?: string;
      clozeAfter?: string;
      clozeVi?: string;
      clozeFr?: string; // câu gốc đầy đủ (phát audio sau khi trả lời)
    }
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

/** Nghĩa RÚT GỌN cho phương án trắc nghiệm (phần trước dấu ';') — đỡ ngợp cho người mới. */
export function shortVi(w: Word): string {
  const s = w.meaning_vi.split(";")[0].trim();
  return s || w.meaning_vi;
}

function pickDistractors(word: Word, pool: Word[], n = 3): Word[] {
  return shuffle(pool.filter((w) => w.id !== word.id && w.meaning_vi)).slice(0, n);
}

/** MCQ nghĩa: hiện từ Pháp → chọn nghĩa Việt đúng. */
function meaningFor(word: Word, pool: Word[], isNew: boolean): Question {
  const options = shuffle([shortVi(word), ...pickDistractors(word, pool).map(shortVi)]);
  return { kind: "mcq", mode: "meaning", word, graded: true, isNew, prompt: word.id, options, answer: options.indexOf(shortVi(word)) };
}

/** MCQ ngược: hiện nghĩa Việt → chọn từ Pháp đúng. */
function reverseFor(word: Word, pool: Word[], isNew: boolean): Question {
  const options = shuffle([word.id, ...pickDistractors(word, pool).map((w) => w.id)]);
  return { kind: "mcq", mode: "reverse", word, graded: true, isNew, prompt: shortVi(word), options, answer: options.indexOf(word.id) };
}

/** MCQ nghe: phát audio từ → chọn nghĩa Việt đúng. */
function listenFor(word: Word, pool: Word[], isNew: boolean): Question {
  const options = shuffle([shortVi(word), ...pickDistractors(word, pool).map(shortVi)]);
  return { kind: "mcq", mode: "listen", word, graded: true, isNew, prompt: word.id, options, answer: options.indexOf(shortVi(word)) };
}

// Tìm vị trí từ (nguyên từ, không phân biệt hoa thường) trong câu ví dụ để khoét chỗ trống.
function findWordInSentence(fr: string, id: string): { before: string; after: string } | null {
  const low = fr.toLowerCase();
  const idx = low.indexOf(id.toLowerCase());
  if (idx < 0) return null;
  const isLetter = (c: string | undefined) => !!c && /[a-zà-öø-ÿœæ]/i.test(c);
  if (isLetter(fr[idx - 1]) || isLetter(fr[idx + id.length])) return null; // dính trong từ khác
  return { before: fr.slice(0, idx), after: fr.slice(idx + id.length) };
}

/** MCQ cloze: khoét từ khỏi câu ví dụ → chọn từ điền đúng. */
function clozeFor(word: Word, ex: ExampleSentence[], pool: Word[], isNew: boolean): Question | null {
  for (const s of ex) {
    const cut = findWordInSentence(s.fr, word.id);
    if (!cut) continue;
    const options = shuffle([word.id, ...pickDistractors(word, pool).map((w) => w.id)]);
    return {
      kind: "mcq", mode: "cloze", word, graded: true, isNew,
      prompt: word.id, options, answer: options.indexOf(word.id),
      clozeBefore: cut.before, clozeAfter: cut.after, clozeVi: s.vi, clozeFr: s.fr,
    };
  }
  return null;
}

/** Câu hỏi chọn giống un/une cho danh từ. */
function genderFor(word: Word): Question {
  const options = ["un", "une"];
  return { kind: "gender", word, graded: false, options, answer: word.gender === "m" ? 0 : 1 };
}

// Chọn chế độ MCQ: từ mới luôn hỏi nghĩa (vừa xem learn-card xong);
// từ ôn lại: trộn cloze (25% khi có câu chứa từ) + nghe (20%) + theo hướng hỏi đã cài.
function gradedFor(w: Word, ex: ExampleSentence[], pool: Word[], config: SrsConfig, isNew: boolean): Question {
  if (!isNew) {
    const r = Math.random();
    if (r < 0.25) {
      const c = clozeFor(w, ex, pool, isNew);
      if (c) return c;
    }
    if (r < 0.45) return listenFor(w, pool, isNew);
    if (config.direction === "vi2fr") return reverseFor(w, pool, isNew);
  }
  return meaningFor(w, pool, isNew);
}

/**
 * Dựng câu hỏi cho một tập từ trong phiên.
 * Từ MỚI: 1 thẻ "learn" (xem từ + nghĩa + ví dụ, không chấm) TRƯỚC khi kiểm tra —
 * người mới không bị hỏi MCQ trên từ chưa từng thấy.
 * Mỗi từ: 1 MCQ (chấm FSRS, 1 trong 4 chế độ) + arrangePerWord câu sắp xếp
 * + (tỉ trọng thấp) 1 câu chọn giống nếu là danh từ.
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
    const ex = examplesByWord[w.id] || [];
    if (isNew) out.push({ kind: "learn", word: w, graded: false, example: ex[0] });
    out.push(gradedFor(w, ex, pool, config, isNew));

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
