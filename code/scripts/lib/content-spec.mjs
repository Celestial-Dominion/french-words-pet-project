// Thông số theo cấp + taxonomy dùng chung cho check/coverage/build học liệu (port app Anh, docs/CONTENT_PLAYBOOK.md).
// Số ở đây là MỐC CẢNH BÁO (không chặn build) — chỉnh khi số liệu thật cho thấy mốc sai.
import { GENRES as G, TOPICS as T, LICENSES as L } from "../../lib/library-labels.ts";

export const TOPICS = Object.keys(T);
export const GENRES = Object.keys(G);
export const LICENSES = L;

// words = số từ bài đọc; sent = câu trung bình (từ/câu) [min, max]; over = tỉ lệ token vượt cấp tối đa;
// density = tỉ lệ token ĐÚNG cấp tối thiểu (bài "dễ hơn cấp" thì cảnh báo); wpm = tốc độ đọc ước lượng (giờ đọc);
// quiz = độ dài tối đa (số từ) của câu hỏi / mỗi phương án; story = số chương [min, max] + số từ CẢ truyện [min, max]
// (mỗi chương 3–4 câu hỏi). Cùng mốc app Anh.
// over = mọi token vượt cấp; far = token vượt từ HAI cấp trở lên (A1 gặp từ B1+). Khác app Anh (over A1 1,2%): cấp từ của
// app Pháp xếp theo TẦN SUẤT phụ đề nên nhiều từ chủ đề A1 kinh điển nằm ở A2 (magasin, bus, professeur) hoặc B2
// (boulangerie, banane, supermarché) → cho phép từ cấp KỀ nhiều hơn, giữ chặt từ xa cấp (khai gloss: nếu thật cần).
export const SPEC = {
  a1: { words: [80, 150], sent: [4, 10.5], over: 0.05, far: 0.015, density: 0, wpm: 70, topics: 12, quiz: { q: 10, opt: 8 }, story: { ch: [3, 3], words: [280, 520] } },
  a2: { words: [120, 220], sent: [6, 13.5], over: 0.04, far: 0.015, density: 0.07, wpm: 90, topics: 12, quiz: { q: 13, opt: 10 }, story: { ch: [4, 4], words: [380, 820] } },
  b1: { words: [180, 320], sent: [9, 16.5], over: 0.03, far: 0.015, density: 0.05, wpm: 110, topics: 18, quiz: { q: 16, opt: 13 }, story: { ch: [5, 5], words: [600, 1100] } },
  b2: { words: [250, 450], sent: [12, 20.5], over: 0.04, far: 0.02, density: 0.05, wpm: 130, topics: 18, quiz: { q: 20, opt: 16 }, story: { ch: [5, 6], words: [800, 1450] } },
  c1: { words: [350, 650], sent: [15, 24.5], over: 0.05, far: 0.05, density: 0.045, wpm: 150, topics: 18, quiz: { q: 24, opt: 18 }, story: { ch: [5, 6], words: [1000, 1800] } },
  c2: { words: [450, 800], sent: [17, 28.5], over: 1, far: 1, density: 0.035, wpm: 170, topics: 18, quiz: { q: 28, opt: 20 }, story: { ch: [5, 7], words: [1100, 2000] } },
};

// Cấp đã soạn theo chuẩn mới (bắt buộc câu hỏi đọc hiểu, kiểm từ vựng/độ dài đầy đủ), theo loại bài đọc / truyện.
// Cấp khác còn bài cũ (legacy.txt) chờ đợt viết lại — chỉ kiểm định dạng.
// c2 bật từ lô c2-01 (đã viết lại các bài C2 cũ)
export const STRICT = { reading: ["a1", "a2", "b1", "b2", "c1", "c2"], story: ["a1", "a2"] };
export const isStrict = (level, type) => STRICT[type]?.includes(level) ?? false;

// Mục tiêu "học hết là đủ lên cấp" (Mục tiêu 2.0 của app Anh) — `npm run content:coverage -- --targets`.
// cov1/cov3/cov5 = tỉ lệ từ của cấp L gặp trong ≥ 1/3/5 bài KHÁC NHAU ở cấp ≤ L; hours = giờ đọc của cấp;
// topic = số bài tối thiểu cho mỗi chủ đề có mặt; genres = thể loại bắt buộc, mỗi loại ≥ genreMin bài.
// stories = số truyện mục tiêu (ngang app Anh, plan/story-plan.md) — `content:coverage -- --stories`.
export const TARGETS = {
  a1: { stories: 53, cov1: 0.98, cov3: 0.9, cov5: 0.65, hours: 8, topic: 2, genreMin: 3, genres: ["narrative", "description", "informational", "practical", "letter", "how-to", "news"] },
  a2: { stories: 61, cov1: 0.97, cov3: 0.8, cov5: 0.4, hours: 12, topic: 2, genreMin: 4, genres: ["narrative", "description", "informational", "practical", "letter", "how-to", "news", "review", "biography"] },
  b1: { stories: 79, cov1: 0.96, cov3: 0.7, cov5: 0.35, hours: 20, topic: 3, genreMin: 5, genres: ["narrative", "explanation", "informational", "news", "opinion", "how-to", "letter", "biography", "review", "interview"] },
  b2: { stories: 68, cov1: 0.9, cov3: 0.6, cov5: 0.3, hours: 20, topic: 3, genreMin: 5, genres: ["narrative", "explanation", "analysis", "argument", "news", "opinion", "review", "interview", "case-study", "biography", "letter", "comparison"] },
  c1: { stories: 67, cov1: 0.87, cov3: 0.5, cov5: 0.25, hours: 21, topic: 3, genreMin: 5, genres: ["narrative", "analysis", "argument", "explanation", "opinion", "review", "case-study", "biography", "interview", "comparison", "description"] },
  c2: { stories: 49, cov1: 0.7, cov3: 0.35, cov5: 0, hours: 13, topic: 3, genreMin: 5, genres: ["narrative", "analysis", "argument", "explanation", "opinion", "review", "case-study", "biography", "interview", "comparison", "description"] },
};

export const minutesOf = (words, level) => Math.round((words / SPEC[level].wpm) * 10) / 10;
