// Chuyển ký hiệu ngữ âm Lexique 3.83 (cột phon) sang IPA chuẩn.
// Dùng làm DỰ PHÒNG khi kaikki không có IPA cho lemma. Đã đối chiếu với dữ liệu Lexique thực tế:
//   le=l° manger=m@Ze temps=t@ bon=b§ pain=p5 un=1 deux=d2 gagner=gaNe parking=paRkiG huit=8it nuit=n8i
const MAP = {
  // nguyên âm
  a: "a", A: "ɑ", i: "i", y: "y", u: "u", o: "o", O: "ɔ", e: "e", E: "ɛ",
  "2": "ø", "9": "œ", "°": "ə",
  // nguyên âm mũi
  "@": "ɑ̃", "§": "ɔ̃", "5": "ɛ̃", "1": "œ̃",
  // phụ âm
  p: "p", b: "b", t: "t", d: "d", k: "k", g: "ɡ",
  f: "f", v: "v", s: "s", z: "z", S: "ʃ", Z: "ʒ",
  m: "m", n: "n", N: "ɲ", G: "ŋ", l: "l", R: "ʁ", x: "x",
  // bán nguyên âm
  j: "j", w: "w", "8": "ɥ",
};

/** "m@Ze" -> "/mɑ̃ʒe/". Trả "" nếu chuỗi rỗng. */
export function phonToIpa(phon) {
  if (!phon) return "";
  let out = "";
  for (const ch of phon) out += MAP[ch] ?? ch;
  return `/${out}/`;
}
