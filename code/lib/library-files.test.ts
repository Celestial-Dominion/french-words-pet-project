import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { levelOfId, libraryDocPath, staleLibraryFiles } from "./library-files";

const DATA = join(process.cwd(), "public", "data");
const readJson = <T>(p: string) => JSON.parse(readFileSync(join(DATA, p), "utf8")) as T;
const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"];

describe("library-files", () => {
  it("đường dẫn file từng bài", () => {
    expect(libraryDocPath("readings", "rd-c1-syndrome-de-l-imposteur")).toBe("/data/readings/rd-c1-syndrome-de-l-imposteur.json");
    expect(libraryDocPath("stories", "a b")).toBe("/data/stories/a%20b.json");
  });

  it("cấp đọc từ id ở mọi kiểu đặt tên", () => {
    expect(levelOfId("a1-01")).toBe("a1");
    expect(levelOfId("rd-c1-syndrome-de-l-imposteur")).toBe("c1");
    expect(levelOfId("st-b2-le-phare")).toBe("b2");
    expect(levelOfId("c1-story-04")).toBe("c1");
    expect(levelOfId("st-a2-x#3")).toBe("a2");
    expect(levelOfId("c2")).toBe("c2"); // file cũ theo cấp
    expect(levelOfId("rd-b12-x")).toBeUndefined();
    expect(levelOfId("readme")).toBeUndefined();
  });

  it("dọn file mồ côi: chỉ cấp đang dựng, giữ bài vừa ghi, xoá cả file cũ theo cấp", () => {
    const files = ["a1-01.json", "rd-a1-x.json", "rd-c1-y.json", "rd-c1-old.json", "c1.json", "a1.json", "notes.txt", "lạ.json"];
    const keep = new Set(["a1-01", "rd-a1-x", "rd-c1-y"]);
    expect(staleLibraryFiles(files, keep, () => true)).toEqual(["rd-c1-old.json", "c1.json", "a1.json", "lạ.json"]);
    // ONLY=c1: chỉ đụng cấp C1, file không rõ cấp để nguyên
    expect(staleLibraryFiles(files, keep, (id) => levelOfId(id) === "c1")).toEqual(["rd-c1-old.json", "c1.json"]);
  });

  it("dữ liệu đang phát hành: mỗi mục chỉ mục có đúng một file bài, cấp khớp id, không còn file theo cấp", () => {
    for (const dir of ["readings", "stories"] as const) {
      const index = readJson<{ id: string; level: number }[]>(`${dir}-index.json`);
      expect(index.length).toBeGreaterThan(0);
      for (const m of index) {
        expect(levelOfId(m.id), m.id).toBe(LEVELS[m.level - 1]);
        const doc = readJson<{ id: string; level: number }>(`${dir}/${m.id}.json`);
        expect(doc.id).toBe(m.id);
        expect(doc.level).toBe(m.level);
      }
      for (const lv of LEVELS) expect(existsSync(join(DATA, dir, `${lv}.json`)), `${dir}/${lv}.json`).toBe(false);
    }
  });
});
