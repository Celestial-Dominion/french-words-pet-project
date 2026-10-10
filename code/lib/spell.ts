// Chấm bài GÕ CHÍNH TẢ — hàm thuần, không đụng React/DB nên unit-test thẳng được.
// Quyết định sư phạm (như app Anh/HSK): chịu SAI 1 KÝ TỰ (gõ trên điện thoại rất dễ trượt phím) —
// vẫn tính đúng nhưng báo "suýt đúng" kèm chính tả chuẩn để người học nhìn lại.
// Riêng tiếng Pháp: QUÊN/SAI DẤU (é/è/ê, ç, œ…) cũng chỉ là "suýt đúng" — bàn phím điện thoại
// nhiều người không gõ được dấu Pháp, phạt "Lại" vì thế là lịch ôn oan. Mạo từ đứng trước danh
// từ (une école, l'école) được chấp nhận: audio đọc kèm mạo từ nên người học hay gõ theo.

/** Bỏ dấu (é → e, ç → c, œ → oe, æ → ae) — để so "chỉ sai dấu". */
export function stripAccents(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae");
}

/** Chuẩn hoá trước khi so: thường hoá, NFC, gộp khoảng trắng, nháy cong → nháy thẳng, bỏ dấu câu cuối. */
export function normalizeSpelling(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\s*'\s*/g, "'")
    .replace(/[.,!?;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Mạo từ người học hay gõ kèm danh từ — bỏ đi trước khi so (chỉ khi đáp án KHÔNG bắt đầu bằng nó).
const ARTICLE = /^(?:(?:une|un|les|le|la|des|du)\s+|l')/;
function dropArticle(input: string, answer: string): string {
  const m = input.match(ARTICLE);
  if (!m || ARTICLE.test(answer)) return input;
  const rest = input.slice(m[0].length);
  return rest || input;
}

/** Khoảng cách Levenshtein, dừng sớm khi đã vượt `max` (không cần tính chính xác phần lớn hơn). */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1; // cả hàng đã vượt ngưỡng → không thể quay lại dưới ngưỡng
    prev = cur;
  }
  return prev[b.length];
}

export type SpellVerdict = "exact" | "close" | "wrong";

/** "exact" = đúng y hệt · "close" = chỉ sai dấu hoặc lệch đúng 1 ký tự (vẫn tính đúng) · "wrong" = sai. */
export function gradeSpelling(input: string, answer: string): SpellVerdict {
  const b = normalizeSpelling(answer);
  const a = dropArticle(normalizeSpelling(input), b);
  if (!a) return "wrong";
  if (a === b) return "exact";
  const sa = stripAccents(a);
  const sb = stripAccents(b);
  if (sa === sb) return "close"; // chỉ sai/thiếu dấu
  return editDistance(sa, sb, 1) <= 1 ? "close" : "wrong";
}

/** Có tính là trả lời đúng cho FSRS không (suýt đúng vẫn tính đúng). */
export const isSpellCorrect = (v: SpellVerdict): boolean => v !== "wrong";

// ---- Độ "nhìn giống nhau" giữa hai TỪ tiếng Pháp (cho distractor trắc nghiệm) ----
// Ý tưởng từ app HSK (distractor chung bộ/nét ép phân biệt MẶT CHỮ): với tiếng Pháp, cặp gây
// nhầm là từ gần giống chính tả — poisson/poison, dessert/désert, cours/court, vers/verre.
// Phương án nhiễu giống mặt chữ buộc phải ĐỌC KỸ từ thay vì nhận mẫu chữ cái đầu.
// Điểm: 0 = không giống (bỏ qua) · càng cao càng dễ nhầm. Chỉ nhận lệch ≤2 ký tự (so KHÔNG
// dấu — é/e trông gần như nhau khi lướt); từ ngắn ≤4 chữ chỉ nhận lệch 1.
export function lookalikeScore(a: string, b: string): number {
  if (a === b) return 0;
  const x = stripAccents(a.toLowerCase());
  const y = stripAccents(b.toLowerCase());
  const la = x.length;
  const lb = y.length;
  if (Math.abs(la - lb) > 2) return 0;
  const maxDist = Math.min(la, lb) <= 4 ? 1 : 2;
  const d = editDistance(x, y, maxDist);
  if (d > maxDist) return 0;
  let s = 3 - d; // lệch 1 ký tự = 2 điểm, lệch 2 = 1 điểm (cùng mặt chữ khác dấu = 3)
  if (la === lb) s += 0.5; // cùng độ dài — nhìn thoáng qua y hệt
  if (x[0] === y[0]) s += 0.5; // cùng chữ cái đầu — mắt lướt hay chỉ bám đầu từ
  return s;
}
