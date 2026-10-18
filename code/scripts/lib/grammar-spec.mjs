// Thông số riêng của bài Ngữ pháp (docs/GRAMMAR_PLAYBOOK.md §8) — để file riêng, không đụng content-spec.mjs (bài đọc /
// truyện). rate = tốc độ tiếng Pháp của cô giáo theo cấp (như app Anh: A1 −15% → B2 0); video.rate = tốc độ lượt thoại.
export const RATE = {
  a1: { rate: "-15%", video: { rate: "-12%" } },
  a2: { rate: "-10%", video: { rate: "-8%" } },
  b1: { rate: "-5%", video: { rate: "-4%" } },
  b2: { rate: "+0%", video: { rate: "+0%" } },
  c1: { rate: "+0%", video: { rate: "+0%" } },
  c2: { rate: "+0%", video: { rate: "+0%" } },
};

// Giọng tiếng Pháp cho cô giáo + nhân vật: fr-FR (chuẩn Paris, cùng giọng Denise của từ / câu ví dụ) + fr-BE / fr-CH
// (giọng chuẩn gần Paris) để có đủ giọng khác nhau. Không dùng fr-CA (giọng Québec khác hẳn).
export const VOICES = new Set([
  "fr-FR-DeniseNeural", "fr-FR-EloiseNeural", "fr-FR-HenriNeural", "fr-FR-RemyMultilingualNeural",
  "fr-FR-VivienneMultilingualNeural", "fr-BE-CharlineNeural", "fr-BE-GerardNeural", "fr-CH-ArianeNeural", "fr-CH-FabriceNeural",
]);
