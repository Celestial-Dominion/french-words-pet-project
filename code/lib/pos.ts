// Nhãn từ loại (part-of-speech) tiếng Việt cho các mã trong dữ liệu tiếng Pháp.
// Mã tham chiếu theo quy ước Lexique / phổ thông (viết tắt tiếng Anh dễ nhớ).
const POS_VI: Record<string, string> = {
  n: "danh từ",
  nm: "danh từ giống đực",
  nf: "danh từ giống cái",
  npr: "danh từ riêng",
  v: "động từ",
  vaux: "trợ động từ", // être, avoir
  vpr: "động từ phản thân", // se laver
  adj: "tính từ",
  adv: "phó từ",
  prep: "giới từ",
  conj: "liên từ",
  pron: "đại từ",
  det: "hạn định từ", // le, la, un, mon…
  art: "mạo từ",
  num: "số từ",
  intj: "thán từ",
  onom: "tượng thanh",
  abbr: "viết tắt",
  phr: "cụm cố định", // "il y a", "est-ce que"
};

export function posLabel(code: string): string {
  return POS_VI[code] ?? code;
}
