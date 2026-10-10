import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { freshStart, reviewOf, patchReview, shortSessions, daysUntil, DB_NAME } from "./helpers";

// "Đã biết sẵn" (port từ app Anh): nút Biết rồi trên thẻ học từ mới (gỡ khỏi phiên, Hoàn tác tại chỗ,
// không tốn suất từ mới), thẻ từ (chip · Hoàn tác · Học lại → lượt ôn kế có thẻ học), Sàng lọc theo cấp.

type W = { id: string; meaning_vi: string };
const a1 = JSON.parse(readFileSync(join(process.cwd(), "public", "data", "words", "a1.json"), "utf8")) as W[];
// Người mới (<40 từ) học theo lộ trình khởi động (lib/starter.ts) — từ đầu tiên là "bonjour".
const FIRST_NEW = "bonjour";

test("phiên học: 'Biết rồi' gỡ từ khỏi phiên, Hoàn tác tại chỗ, không tốn suất từ mới", async ({ page }) => {
  await freshStart(page, "/");
  await shortSessions(page);
  await page.goto("/hoc/1");
  await page.getByRole("button", { name: /Học \(1 từ mới\)/ }).click();
  await expect(page.getByText(/Từ mới — học trước nhé/)).toBeVisible();
  // thẻ học hiện mạo từ trước danh từ ("un bonjour")
  await expect(page.getByText(new RegExp(`^(un |une )?${FIRST_NEW}$`)).first()).toBeVisible();

  // Biết rồi → thông báo + Hoàn tác; hoàn tác thì thẻ chưa hề được tạo
  await page.getByRole("button", { name: /Biết rồi — bỏ qua từ này/ }).click();
  await expect(page.getByText(/kiểm tra lại sau 1–3 tháng, không tốn suất từ mới/)).toBeVisible();
  expect((await reviewOf(page, FIRST_NEW))?.known).toBeTruthy();
  await page.getByRole("button", { name: /Hoàn tác — vẫn học từ này/ }).click();
  await expect(page.getByRole("button", { name: /Đã xem — Kiểm tra/ })).toBeVisible();
  expect(await reviewOf(page, FIRST_NEW)).toBeNull();

  // Đánh dấu lại rồi Tiếp tục → phiên chỉ có từ này nên kết thúc ngay, không chấm câu nào
  await page.getByRole("button", { name: /Biết rồi — bỏ qua từ này/ }).click();
  await page.getByRole("button", { name: /Tiếp tục/ }).click();
  await expect(page.getByText("✅ Xong phiên ôn!")).toBeVisible();
  await expect(page.getByText(/1 từ đánh dấu đã biết/)).toBeVisible();
  const rec = await reviewOf(page, FIRST_NEW);
  expect(rec?.reps).toBe(1);
  expect(daysUntil(rec?.due)).toBeGreaterThanOrEqual(30);
  expect(daysUntil(rec?.due)).toBeLessThanOrEqual(90);

  // Suất từ mới hôm nay còn nguyên; thẻ cấp ghi nhận 1 từ đã biết sẵn; bộ lọc ra đúng từ đó
  await page.getByRole("button", { name: "Quay lại" }).click();
  await expect(page.getByRole("button", { name: /Học \(1 từ mới\)/ })).toBeVisible();
  await expect(page.getByText(/1 từ đã biết sẵn/)).toBeVisible();
  await page.locator("select").selectOption("preknown");
  await expect(page.getByText("1 từ", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(FIRST_NEW) })).toBeVisible();

  // Từ đã biết chưa qua kiểm tra: không tính vào "Đã học" của màn ôn (số liệu huy hiệu)
  await page.goto("/on-tap");
  await expect(page.getByText("Đã học", { exact: true }).locator("xpath=preceding-sibling::div[1]")).toHaveText("0");
});

test("thẻ từ: Đã biết rồi → chip + Hoàn tác; Học lại → đến hạn ngay, lượt ôn có thẻ học trước", async ({ page }) => {
  await freshStart(page, "/");
  await shortSessions(page); // tắt điền/ghép: sau thẻ học chắc chắn là bài chính
  await page.goto("/hoc/1");
  const open = async () => {
    await page.getByPlaceholder(/Tìm/).fill("maison");
    await page.getByRole("button", { name: /maison/ }).first().click();
  };
  await open();
  await page.getByRole("button", { name: "Đã biết rồi" }).click();
  await expect(page.getByText(/Đã biết sẵn · kiểm tra lại sau \d+ ngày/)).toBeVisible();
  await page.getByRole("button", { name: "↩︎ Hoàn tác" }).click();
  await expect(page.getByRole("button", { name: "Đã biết rồi" })).toBeVisible(); // về Chưa học
  expect(await reviewOf(page, "maison")).toBeNull();

  await page.getByRole("button", { name: "Đã biết rồi" }).click();
  await page.keyboard.press("Escape");
  await open(); // mở lại: không còn Hoàn tác, thay bằng Học lại
  await expect(page.getByRole("button", { name: "↩︎ Hoàn tác" })).toHaveCount(0);
  await page.getByRole("button", { name: /Chưa chắc\? Học lại/ }).click();
  await expect(page.getByText("Đến hạn ôn")).toBeVisible();
  const rec = await reviewOf(page, "maison");
  expect(rec?.relearn).toBe(true);
  expect(rec?.known).toBeUndefined();
  await page.keyboard.press("Escape");

  await page.goto("/on-tap");
  await page.getByRole("button", { name: /Ôn tập \(1 thẻ\)/ }).click();
  await expect(page.getByText(/Học lại — xem kỹ trước nhé/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Biết rồi/ })).toHaveCount(0); // đã lộ chưa chắc → không bỏ qua được nữa
  await page.getByRole("button", { name: /Đã xem — Kiểm tra/ }).click();
  await expect(page.getByText("Pháp → nghĩa", { exact: true })).toBeVisible(); // hỏi như từ mới
});

test("sàng lọc: Biết → soát nghĩa → Đúng · Chưa biết · Chưa biết nghĩa · Hoàn tác · lần sau lướt tiếp chỗ cũ", async ({ page }) => {
  await freshStart(page, "/hoc/1");
  await page.getByRole("button", { name: /Sàng lọc từ đã biết/ }).click();
  const word = (w: W) => page.getByText(w.id, { exact: true }).first();
  await expect(page.getByText("Bạn biết nghĩa từ này chưa?")).toBeVisible();
  await expect(word(a1[0])).toBeVisible();

  // Biết → hiện nghĩa trong app để tự soát → Đúng, đã biết
  await page.getByRole("button", { name: /^Biết/ }).click();
  await expect(page.getByText(a1[0].meaning_vi, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Đúng, đã biết/ }).click();
  await expect(word(a1[1])).toBeVisible();
  expect((await reviewOf(page, a1[0].id))?.known).toBeTruthy();

  // Chưa biết (phím ←) → không ghi gì
  await page.keyboard.press("ArrowLeft");
  await expect(word(a1[2])).toBeVisible();
  expect(await reviewOf(page, a1[1].id)).toBeNull();

  // Biết (→) rồi "Chưa biết nghĩa" → không ghi
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: /Chưa biết nghĩa/ }).click();
  await expect(word(a1[3])).toBeVisible();
  expect(await reviewOf(page, a1[2].id)).toBeNull();

  // Hoàn tác quay về từ trước
  await page.getByRole("button", { name: new RegExp(`Hoàn tác “${a1[2].id}”`) }).click();
  await expect(word(a1[2])).toBeVisible();
  await expect(page.getByText(/đã lướt 2 · biết 1/)).toBeVisible();

  // → → bằng phím: đánh dấu a1[2]; rồi Xong → tổng kết
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(word(a1[3])).toBeVisible();
  await page.getByRole("button", { name: "Xong" }).click();
  await expect(page.getByText(/Đã lướt\s*3\s*từ:\s*2\s*từ đánh dấu đã biết/)).toBeVisible();
  await page.getByRole("button", { name: "Quay lại" }).click();
  await expect(page.getByText(/2 từ đã biết sẵn/)).toBeVisible();

  // Mở lại: lướt tiếp từ a1[3], không gặp lại a1[1] vừa bảo chưa biết
  await page.getByRole("button", { name: /Sàng lọc từ đã biết/ }).click();
  await expect(word(a1[3])).toBeVisible();
});

test("sàng lọc: 20 từ liền chủ yếu chưa biết → gợi ý chuyển sang học", async ({ page }) => {
  await freshStart(page, "/hoc/1");
  await page.getByRole("button", { name: /Sàng lọc từ đã biết/ }).click();
  await expect(page.getByText("Bạn biết nghĩa từ này chưa?")).toBeVisible();
  for (let k = 0; k < 20; k++) {
    await expect(page.getByText(a1[k].id, { exact: true }).first()).toBeVisible();
    await page.keyboard.press("ArrowLeft");
  }
  await expect(page.getByText(/20 từ gần nhất bạn chỉ biết 0/)).toBeVisible();
  await page.getByRole("button", { name: "Học từ mới" }).first().click();
  await expect(page.getByText(/Từ mới — học trước nhé/)).toBeVisible();
});

for (const correct of [true, false]) {
  test(`kiểm tra từ đã biết: câu NHẬN NGHĨA; ${correct ? "đúng → giữ cờ, lịch nới" : "sai → bỏ cờ, về lịch chặt"}`, async ({ page }) => {
    const meaning = "nhà, ngôi nhà"; // nét nghĩa đầu của maison (phương án đúng)
    await freshStart(page, "/");
    await shortSessions(page);
    await page.goto("/hoc/1");
    await page.getByPlaceholder(/Tìm/).fill("maison");
    await page.getByRole("button", { name: /maison/ }).first().click();
    await page.getByRole("button", { name: "Đã biết rồi" }).click();
    await page.keyboard.press("Escape");
    await patchReview(page, "maison", { lastReviewDaysAgo: 45, dueDaysAgo: 1 });

    await page.goto("/on-tap");
    await page.getByRole("button", { name: /Ôn tập \(1 thẻ\)/ }).click();
    await expect(page.getByText("Pháp → nghĩa", { exact: true })).toBeVisible(); // không phải gõ chính tả / hỏi ngược
    await page.getByRole("button", { name: /Thử nhớ trong đầu/ }).click();
    const options = page.locator("button", { hasText: /^\d/ });
    await expect(options).toHaveCount(4);
    const texts = (await options.allTextContents()).map((t) => t.replace(/^\d+/, "").trim());
    const pick = texts.findIndex((t) => (t === meaning) === correct);
    await options.nth(pick).click();

    await expect.poll(async () => (await reviewOf(page, "maison"))?.reps).toBe(2);
    const rec = await reviewOf(page, "maison");
    if (correct) {
      expect(rec?.known).toBeTruthy();
      expect(daysUntil(rec?.due)).toBeGreaterThan(60); // lịch nới (giữ 90%, trần 365) — lịch chặt chỉ ~30 ngày
    } else {
      expect(rec?.known).toBeUndefined();
      expect(rec?.lapses).toBe(1);
      expect(daysUntil(rec?.due)).toBeLessThanOrEqual(1);
    }
  });
}

test("nâng cấp dữ liệu: thẻ 'Đã biết rồi' bản cũ (IndexedDB v3) được gắn cờ đã biết sẵn", async ({ page }) => {
  // Trang tĩnh cùng origin (không nạp app) → dựng DB đúng schema v3 với một thẻ kiểu cũ (S 60, hẹn 60 ngày)
  await page.goto("/data/word-levels.json");
  await page.evaluate(async (name) => {
    await new Promise<void>((r) => {
      const q = indexedDB.deleteDatabase(name);
      q.onsuccess = q.onerror = q.onblocked = () => r();
    });
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open(name, 30); // Dexie version(3) = IndexedDB 30
      open.onupgradeneeded = () => {
        const d = open.result;
        const rv = d.createObjectStore("reviews", { keyPath: "wordId" });
        for (const k of ["due", "level", "state"]) rv.createIndex(k, k);
        d.createObjectStore("daily", { keyPath: "date" });
        d.createObjectStore("reads", { keyPath: "id" });
        d.createObjectStore("config", { keyPath: "key" });
        d.createObjectStore("gamify", { keyPath: "key" });
        d.createObjectStore("notes", { keyPath: "wordId" });
      };
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const now = Date.now();
        const tx = open.result.transaction("reviews", "readwrite");
        const base = { level: 1, difficulty: 5, elapsed_days: 0, lapses: 0, learning_steps: 0, state: 2, introducedOn: "2026-09-28" };
        tx.objectStore("reviews").put({
          ...base, wordId: "maison", due: new Date(now + 50 * 864e5), stability: 60, scheduled_days: 60, reps: 1,
          last_review: new Date(now - 10 * 864e5),
        });
        // thẻ học thật đã chín — không được gắn nhầm
        tx.objectStore("reviews").put({
          ...base, wordId: "chat", due: new Date(now + 20 * 864e5), stability: 31.4, scheduled_days: 20, reps: 6,
          last_review: new Date(now - 3 * 864e5),
        });
        tx.oncomplete = () => {
          open.result.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, DB_NAME);

  await page.goto("/hoc/1");
  await expect.poll(async () => (await reviewOf(page, "maison"))?.known ?? null).not.toBeNull();
  expect((await reviewOf(page, "chat"))?.known).toBeUndefined();
  await page.getByPlaceholder(/Tìm/).fill("maison");
  await page.getByRole("button", { name: /maison/ }).first().click();
  await expect(page.getByText(/Đã biết sẵn · kiểm tra lại sau/)).toBeVisible();
});
