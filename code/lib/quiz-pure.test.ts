import { describe, expect, it } from "vitest";
import { paragraphs, quizScore, shuffledOrder, splitQuotes } from "./quiz-pure";

describe("quiz-pure", () => {
  it("xáo đủ phương án, không mất/lặp", () => {
    let x = 0.37;
    const rand = () => (x = (x * 9301 + 49297) % 233280 / 233280);
    for (let k = 0; k < 20; k++) expect([...shuffledOrder(4, rand)].sort()).toEqual([0, 1, 2, 3]);
  });
  it("chấm điểm theo chỉ số gốc", () => {
    expect(quizScore([0, 2, 1], [0, 1, undefined])).toEqual({ done: 2, correct: 1, total: 3 });
  });
  it("tách trích dẫn", () => {
    expect(splitQuotes("Bài đọc: «Il pleut.» — rồi «Il fait froid.»")).toEqual([
      { text: "Bài đọc: ", quote: false },
      { text: "Il pleut.", quote: true },
      { text: " — rồi ", quote: false },
      { text: "Il fait froid.", quote: true },
    ]);
  });
  it("nhóm câu theo đoạn", () => {
    expect(paragraphs(5, [0, 2])).toEqual([[0, 1], [2, 3, 4]]);
    expect(paragraphs(3)).toEqual([[0, 1, 2]]);
    expect(paragraphs(3, [1])).toEqual([[0], [1, 2]]);
  });
});
