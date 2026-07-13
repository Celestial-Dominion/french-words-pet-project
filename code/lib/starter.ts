// Lộ trình KHỞI ĐỘNG cho người mới hoàn toàn: ~60 từ A1 cụ thể, dễ hình dung
// (chào hỏi, người, nhà cửa, đồ ăn, con vật, màu sắc, động từ thường gặp) — học TRƯỚC
// danh sách tần suất (vốn toàn từ chức năng trừu tượng de/le/être khó học kiểu đoán nghĩa).
// Đã kiểm tra: mọi id đều tồn tại trong public/data/words/a1.json.
export const STARTER_IDS: string[] = [
  // chào hỏi & phép lịch sự
  "bonjour", "salut", "merci", "oui", "non", "madame", "monsieur",
  // người & gia đình
  "homme", "femme", "enfant", "ami", "famille", "mère", "père", "frère",
  // nhà cửa & đồ vật
  "maison", "table", "chaise", "porte", "fenêtre", "livre", "voiture",
  // đồ ăn thức uống
  "eau", "pain", "lait", "café", "pomme", "poisson",
  // con vật & thiên nhiên
  "chat", "chien", "soleil", "fleur",
  // nơi chốn & thời gian
  "école", "ville", "rue", "jour", "nuit", "matin", "soir", "temps",
  // cơ thể
  "main", "tête",
  // động từ cụ thể
  "manger", "boire", "dormir", "parler", "aimer", "aller", "venir", "voir",
  // tính từ & màu sắc
  "grand", "petit", "bon", "rouge", "bleu", "blanc", "noir",
  // số & danh từ chung
  "deux", "trois", "nom", "chose",
];

/** Số từ đã học dưới ngưỡng này → còn trong giai đoạn khởi động (ưu tiên STARTER_IDS). */
export const STARTER_PHASE_MAX = 40;

/** Sắp lại danh sách ứng viên học mới: giai đoạn khởi động → từ cụ thể trước. */
export function orderForBeginners<T extends { id: string }>(candidates: T[], learnedCount: number): T[] {
  if (learnedCount >= STARTER_PHASE_MAX) return candidates;
  const rank = new Map(STARTER_IDS.map((id, i) => [id, i]));
  const starter = candidates.filter((w) => rank.has(w.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  const rest = candidates.filter((w) => !rank.has(w.id));
  return [...starter, ...rest];
}
