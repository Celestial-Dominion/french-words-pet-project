import { describe, it, expect } from "vitest";
import { Rating } from "ts-fsrs";
import { ratingFromSpeed } from "./srs";

// Thang chấm tự động cho câu TRẮC NGHIỆM (nhận-diện): chỉ Again/Hard/Good.
// Xem lý do "không bao giờ Easy" trong doc-comment của ratingFromSpeed.
describe("ratingFromSpeed", () => {
  it("sai → Lại (Again), bất kể nhanh hay chậm", () => {
    expect(ratingFromSpeed(false, 100)).toBe(Rating.Again);
    expect(ratingFromSpeed(false, 30_000)).toBe(Rating.Again);
  });

  it("đúng RẤT NHANH vẫn chỉ là Được (Good) — KHÔNG bao giờ Easy", () => {
    // Với recallFirst bật, đồng hồ chạy từ lúc hiện đáp án nên hay ra ~1s.
    expect(ratingFromSpeed(true, 200)).toBe(Rating.Good);
    expect(ratingFromSpeed(true, 1000)).toBe(Rating.Good);
    expect(ratingFromSpeed(true, 3499, "meaning")).toBe(Rating.Good);
    expect(ratingFromSpeed(true, 10, "cloze")).toBe(Rating.Good);
    expect(ratingFromSpeed(true, 10, "listen")).toBe(Rating.Good);
  });

  it("không bao giờ trả về Easy ở bất kỳ tốc độ/loại câu nào", () => {
    const modes = [undefined, "meaning", "reverse", "cloze", "listen"] as const;
    for (const mode of modes) {
      for (const ms of [0, 500, 2000, 5000, 8000, 12_000, 20_000, 60_000]) {
        expect(ratingFromSpeed(true, ms, mode)).not.toBe(Rating.Easy);
      }
    }
  });

  it("đúng nhưng chậm (≥ ngưỡng theo loại câu) → Khó (Hard)", () => {
    expect(ratingFromSpeed(true, 9000, "meaning")).toBe(Rating.Hard);
    expect(ratingFromSpeed(true, 9000, "reverse")).toBe(Rating.Hard);
    expect(ratingFromSpeed(true, 14_000, "cloze")).toBe(Rating.Hard);
    expect(ratingFromSpeed(true, 12_000, "listen")).toBe(Rating.Hard);
    // ngay dưới ngưỡng "chậm" vẫn là Good
    expect(ratingFromSpeed(true, 8999, "meaning")).toBe(Rating.Good);
    expect(ratingFromSpeed(true, 13_999, "cloze")).toBe(Rating.Good);
  });

  it("cloze/listen có ngưỡng chậm nới hơn câu thường", () => {
    // 10s: câu thường đã là Hard, nhưng cloze/listen vẫn Good (chưa tới ngưỡng)
    expect(ratingFromSpeed(true, 10_000, "meaning")).toBe(Rating.Hard);
    expect(ratingFromSpeed(true, 10_000, "cloze")).toBe(Rating.Good);
    expect(ratingFromSpeed(true, 10_000, "listen")).toBe(Rating.Good);
  });

  it("quá 45s coi như xao nhãng → Được (Good), KHÔNG phạt Khó", () => {
    expect(ratingFromSpeed(true, 45_001, "meaning")).toBe(Rating.Good);
    expect(ratingFromSpeed(true, 60_000, "cloze")).toBe(Rating.Good);
    expect(ratingFromSpeed(true, 120_000, "listen")).toBe(Rating.Good);
  });
});
