// Dựng danh sách câu hỏi cho một phiên ôn/học từ dữ liệu từ + ví dụ.
import type { Word, SrsConfig, ReviewRecord } from "./types";
import type { ExampleSentence } from "./data";
import { isLeech, isMature } from "./srs";

// 4 chế độ câu trắc nghiệm (chấm FSRS): xem từ→chọn nghĩa, nghĩa→chọn từ (ngược),
// điền từ vào câu (cloze), nghe→chọn nghĩa (listen).
export type McqMode = "meaning" | "reverse" | "cloze" | "listen";

export type Question =
  | { kind: "learn"; word: Word; graded: false; examples?: ExampleSentence[]; leech?: boolean }
  | {
      kind: "mcq";
      mode: McqMode;
      word: Word;
      graded: true;
      isNew: boolean;
      prompt: string; // meaning/listen: từ Pháp · reverse: nghĩa VI · cloze: không dùng
      options: string[];
      answer: number;
      exs?: ExampleSentence[]; // 1-2 câu ví dụ cho thẻ chi tiết SAU khi trả lời
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

// Giai đoạn khởi động: chưa đủ vốn từ thì TẮT hẳn bài ghép câu (tránh "đoán mù").
const ARRANGE_MIN_KNOWN = 40;

// Token trong câu ghép có "đã biết" không? Bỏ dấu câu, xử lý viết dính l'/d'/j'/qu'…
// (phần trước dấu ' là từ chức năng bị nuốt âm — coi như biết nếu phần sau đã học).
function tokenKnown(token: string, known: Set<string>, target: string): boolean {
  const clean = token.toLowerCase().replace(/[^a-zà-öø-ÿœæ'’-]/g, "");
  if (!clean) return true; // toàn dấu câu/số
  const parts = clean.split(/['’]/).filter(Boolean);
  const core = parts.length > 1 ? parts[parts.length - 1] : clean;
  return core === target || known.has(core) || known.has(clean);
}

/** Câu ví dụ đủ "vừa sức" để ra bài ghép: mọi từ (trừ chính từ đang học) đều đã học. */
function arrangeReady(tokens: string[], known: Set<string> | undefined, target: string): boolean {
  if (!known || known.size < ARRANGE_MIN_KNOWN) return false;
  const unknown = tokens.filter((t) => !tokenKnown(t, known, target.toLowerCase())).length;
  return unknown === 0 || (tokens.length >= 8 && unknown <= 1); // câu dài cho phép lọt 1 từ lạ
}

/** Nghĩa RÚT GỌN cho phương án trắc nghiệm (phần trước dấu ';') — đỡ ngợp cho người mới. */
export function shortVi(w: Word): string {
  const s = w.meaning_vi.split(";")[0].trim();
  return s || w.meaning_vi;
}

// Phương án nhiễu: ưu tiên CÙNG loại từ (gây nhiễu tốt hơn), không trùng nghĩa nhau — như HSK.
function pickDistractors(word: Word, pool: Word[], n = 3): Word[] {
  const seen = new Set([shortVi(word)]);
  const out: Word[] = [];
  const samePos = shuffle(pool.filter((w) => w.pos === word.pos));
  const rest = shuffle(pool);
  for (const w of [...samePos, ...rest]) {
    if (out.length >= n) break;
    if (w.id === word.id || !w.meaning_vi || out.includes(w)) continue;
    const key = shortVi(w);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  // pool nhỏ / trùng nghĩa nhiều → lượt 2 nới điều kiện (chỉ cần khác đáp án) cho đủ 4 phương án
  if (out.length < n) {
    for (const w of rest) {
      if (out.length >= n) break;
      if (w.id === word.id || !w.meaning_vi || out.includes(w) || shortVi(w) === shortVi(word)) continue;
      out.push(w);
    }
  }
  return out;
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

// Chọn chế độ MCQ theo ĐỘ CHÍN của thẻ (như HSK):
//  - từ mới / lần ôn đầu: nhận diện (theo hướng hỏi đã cài) — vừa xem learn-card xong;
//  - chưa chín (stability <7 ngày) hoặc hay quên: 50% nhận diện + 30% nhớ lại + 20% nghe (KHÔNG cloze);
//  - đã chín: 50% cloze (khi có câu chứa từ) + 30% nhớ lại + 20% nghe.
function gradedFor(w: Word, ex: ExampleSentence[], pool: Word[], config: SrsConfig, isNew: boolean, rec?: ReviewRecord): Question {
  const recog = () => (config.direction === "vi2fr" ? reverseFor(w, pool, isNew) : meaningFor(w, pool, isNew));
  const recall = () => (config.direction === "vi2fr" ? meaningFor(w, pool, isNew) : reverseFor(w, pool, isNew));
  if (isNew || !rec || rec.reps <= 0) return recog();
  const r = Math.random();
  if (!isMature(rec)) {
    if (r < 0.5) return recog();
    if (r < 0.8) return recall();
    return listenFor(w, pool, isNew);
  }
  if (r < 0.5) {
    const c = clozeFor(w, ex, pool, isNew);
    if (c) return c;
  }
  if (r < 0.8) return recall();
  return listenFor(w, pool, isNew);
}

/**
 * Dựng câu hỏi cho một tập từ trong phiên.
 * Từ MỚI: 1 thẻ "learn" (xem từ + nghĩa + ví dụ, không chấm) TRƯỚC khi kiểm tra —
 * người mới không bị hỏi MCQ trên từ chưa từng thấy.
 * Từ HAY QUÊN (leech, quên ≥4 lần): cũng được 1 thẻ "learn" ôn lại kỹ (kèm ô mẹo nhớ) trước khi hỏi.
 * Mỗi từ: 1 MCQ (chấm FSRS, chế độ theo độ chín thẻ) + arrangePerWord câu sắp xếp
 * + (tỉ trọng thấp) 1 câu chọn giống nếu là danh từ.
 */
export function buildQuestions(
  words: Word[],
  examplesByWord: Record<string, ExampleSentence[]>,
  pool: Word[],
  config: SrsConfig,
  isNew: boolean,
  records?: Map<string, ReviewRecord>,
  knownIds?: Set<string>, // từ đã học — bài ghép câu CHỈ dùng câu toàn từ đã biết
): Question[] {
  const out: Question[] = [];
  for (const w of words) {
    const ex = examplesByWord[w.id] || [];
    const rec = records?.get(w.id);
    if (isNew) out.push({ kind: "learn", word: w, graded: false, examples: ex.slice(0, 5) });
    else if (isLeech(rec)) out.push({ kind: "learn", word: w, graded: false, examples: ex.slice(0, 5), leech: true });
    const q = gradedFor(w, ex, pool, config, isNew, rec);
    if (q.kind === "mcq") q.exs = ex.slice(0, 2);
    out.push(q);

    let arranged = 0;
    for (let i = 0; i < ex.length && arranged < config.arrangePerWord; i++) {
      const s = ex[i];
      const tokens = tokenize(s.fr);
      if (tokens.length < 3 || tokens.length > 12) continue;
      if (!arrangeReady(tokens, knownIds, w.id)) continue; // câu còn từ lạ → bỏ, khỏi đoán mù
      out.push({ kind: "arrange", word: w, graded: false, fr: s.fr, vi: s.vi, tokens });
      arranged++;
    }

    // chọn giống: chỉ danh từ có giống, tỉ trọng thấp (~30%)
    if (config.genderQuestions && w.pos.includes("n") && w.gender && Math.random() < 0.3) {
      out.push(genderFor(w));
    }
  }
  return out;
}
