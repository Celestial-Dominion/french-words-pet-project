// Thư viện đọc (bài đọc + truyện): nhãn chủ đề / thể loại (cùng bộ khoá với app Anh), đường dẫn trang bài, thời lượng.
// Chủ đề, thể loại, tóm tắt truyện soạn tay ở scripts/out/library-meta.json → build-readings / build-stories ghép vào chỉ mục.
import { levelFromCefr, levelSlug, LEVELS } from "./levels";

export const TOPICS: Record<string, string> = {
  "daily-life": "Đời sống",
  family: "Gia đình",
  travel: "Du lịch",
  food: "Ẩm thực",
  education: "Giáo dục",
  work: "Công việc",
  technology: "Công nghệ",
  science: "Khoa học",
  health: "Sức khỏe",
  psychology: "Tâm lý",
  history: "Lịch sử",
  geography: "Địa lý",
  environment: "Môi trường",
  society: "Xã hội",
  economics: "Kinh tế",
  business: "Kinh doanh",
  communication: "Giao tiếp",
  culture: "Văn hóa",
  art: "Nghệ thuật",
  literature: "Văn học",
  philosophy: "Triết học",
  ethics: "Đạo đức",
  media: "Truyền thông",
  cities: "Đô thị",
  nature: "Thiên nhiên",
  innovation: "Đổi mới",
};

export const GENRES: Record<string, string> = {
  description: "Miêu tả",
  narrative: "Tự sự",
  informational: "Thông tin",
  explanation: "Giải thích",
  "how-to": "Hướng dẫn",
  comparison: "So sánh",
  "cause-effect": "Nhân – quả",
  biography: "Tiểu sử",
  news: "Tin tức",
  interview: "Phỏng vấn",
  opinion: "Quan điểm",
  review: "Đánh giá",
  argument: "Lập luận",
  analysis: "Phân tích",
  "case-study": "Tình huống",
  practical: "Văn bản thực dụng",
  letter: "Thư / email",
};

export type LibraryKind = "reading" | "story";

/** Trang một bài đọc / truyện: /bai-doc/a1/a1-01, /truyen/b1/b1-story-01. */
export function libraryHref(kind: LibraryKind, level: number, id: string): string {
  return `${kind === "reading" ? "/bai-doc" : "/truyen"}/${levelSlug(level)}/${encodeURIComponent(id)}`;
}

/** Trang danh sách một cấp: /bai-doc/a1. */
export function libraryLevelHref(kind: LibraryKind, level: number): string {
  return `${kind === "reading" ? "/bai-doc" : "/truyen"}/${levelSlug(level)}`;
}

/** "a1" → 1; khoá không hợp lệ → undefined. */
export function levelOfSlug(slug: string): number | undefined {
  return LEVELS.some((l) => l.cefr.toLowerCase() === slug) ? levelFromCefr(slug) : undefined;
}

export function fmtMinutes(min: number): string {
  return `${Math.max(1, Math.round(min))} phút`;
}
