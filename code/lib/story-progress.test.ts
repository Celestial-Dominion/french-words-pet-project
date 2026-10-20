import { beforeEach, describe, expect, it, vi } from "vitest";

// localStorage giả (vitest chạy môi trường node) — có key()/length để quét khoá cũ fr.story.<id>.ch.
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
} as Storage;

const load = async () => {
  vi.resetModules(); // cờ "đã chuyển khoá cũ" nằm ở module → nạp lại cho mỗi test
  return import("./story-progress");
};

describe("story-progress", () => {
  beforeEach(() => store.clear());

  it("chuyển khoá cũ từng truyện sang fr.storyPos (mốc 0) rồi xoá khoá cũ", async () => {
    store.set("fr.story.st-a1-x.ch", "2");
    store.set("fr.story.st-a1-y.ch", "abc");
    store.set("fr.other", "1");
    const sp = await load();
    expect(sp.getStoryPositions()).toEqual({ "st-a1-x": { ch: 2, at: 0 } });
    expect([...store.keys()].sort()).toEqual(["fr.other", "fr.storyPos"]);
    expect(sp.savedChapter("st-a1-x", 5)).toBe(2);
    expect(sp.savedChapter("st-a1-x", 2)).toBe(1); // truyện ngắn lại → kẹp về chương cuối
    expect(sp.savedChapter("chua-doc", 5)).toBe(0);
  });

  it("ghi chương khi chuyển chương; cùng chương thì không đẩy mốc", async () => {
    const sp = await load();
    sp.saveChapter("s", 1, 100);
    sp.saveChapter("s", 1, 500);
    expect(sp.getStoryPositions()).toEqual({ s: { ch: 1, at: 100 } });
    sp.saveChapter("s", 3, 600);
    expect(sp.getStoryPositions().s).toEqual({ ch: 3, at: 600 });
  });

  it("hợp nhất từ cloud: bản mới hơn thắng; replace (khôi phục sao lưu) thay hẳn", async () => {
    const sp = await load();
    sp.saveChapter("s", 1, 100);
    sp.saveChapter("t", 2, 300);
    sp.mergeStoryPositions({ s: { ch: 4, at: 200 }, t: { ch: 0, at: 50 } });
    expect(sp.getStoryPositions()).toEqual({ s: { ch: 4, at: 200 }, t: { ch: 2, at: 300 } });
    sp.mergeStoryPositions({ u: { ch: 1, at: 1 } }, true);
    expect(sp.getStoryPositions()).toEqual({ u: { ch: 1, at: 1 } });
  });
});
