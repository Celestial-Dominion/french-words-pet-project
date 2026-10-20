import { test, expect } from "@playwright/test";
import { freshStart, grammarLessons } from "./helpers";

// A5: tích / bỏ tích "đã đọc · đã học" ngay trên danh sách + thanh lọc trạng thái + nút trạng thái trong trang bài.

test("bài đọc: tích ngay trên danh sách, lọc Đã đọc / Chưa đọc, bỏ tích", async ({ page }) => {
  await freshStart(page, "/bai-doc/a1");
  const tick = page.getByRole("checkbox", { name: "Đã đọc: La famille de Marie" });
  await expect(tick).toHaveAttribute("aria-checked", "false");
  await tick.click();
  await expect(tick).toHaveAttribute("aria-checked", "true");

  await page.getByRole("radio", { name: /^Đã đọc/ }).click();
  await expect(page.getByRole("radio", { name: /^Đã đọc/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("checkbox", { name: /^Đã đọc:/ })).toHaveCount(1);

  await tick.click(); // bỏ tích → danh sách "Đã đọc" trống
  await expect(page.getByText(/Chưa có bài nào đã đọc/)).toBeVisible();

  await page.getByRole("radio", { name: /^Chưa đọc/ }).click();
  await expect(page.getByRole("checkbox", { name: "Đã đọc: La famille de Marie" })).toBeVisible();
});

test("bài đọc: nút trạng thái trong trang bài bật/tắt được, danh sách đổi theo", async ({ page }) => {
  await freshStart(page, "/bai-doc/a1/a1-01");
  const btn = page.getByRole("button", { name: /^(Đã đọc|Chưa đọc)$/ }).first();
  await page.waitForTimeout(500); // chờ trạng thái đọc từ IndexedDB ổn định (bài có câu hỏi: chỉ tự đánh dấu khi làm đạt)
  const before = await btn.getAttribute("aria-pressed");
  const after = before === "true" ? "false" : "true";
  await btn.click(); // bấm tay → không tự đánh dấu lại nữa ở lần mở này
  await expect(btn).toHaveAttribute("aria-pressed", after);
  await page.getByRole("button", { name: "Quay lại" }).click();
  await expect(page.getByRole("checkbox", { name: "Đã đọc: La famille de Marie" })).toHaveAttribute("aria-checked", after!);
});

test("ngữ pháp: tích trên danh sách, giữ sau tải lại, lọc + nút trong bài", async ({ page }) => {
  const g = grammarLessons().find((l) => l.id === "giong-danh-tu")!; // id cố định: cổng câu chọn un/une đọc đúng bài này
  await freshStart(page, `/ngu-phap/${g.lv}`);
  const tick = page.getByRole("checkbox", { name: `Đã học: ${g.t}`, exact: true });
  await tick.click();
  await expect(page.getByRole("radio", { name: /^Đã học/ })).toHaveText(/^Đã học\s*1$/);
  // lưu kèm mốc thời gian (bỏ tích không bị đồng bộ hồi sinh): mã hoá "id~học~cuối~lần~điểm~~~tích tay"
  const raw = await page.evaluate(() => localStorage.getItem("fr.grammarDone"));
  expect(JSON.parse(raw!)).toEqual([expect.stringMatching(/^giong-danh-tu~[0-9a-z]+~[0-9a-z]+~1~0~~~1$/)]);

  await page.reload();
  await expect(tick).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: /^Chưa học/ }).click();
  await expect(tick).toHaveCount(0);
  await page.getByRole("radio", { name: /^Đã học/ }).click();
  await expect(page.getByRole("checkbox", { name: /^Đã học:/ })).toHaveCount(1);

  await page.getByRole("link", { name: g.t }).click();
  await expect(page).toHaveURL(new RegExp(`/ngu-phap/${g.lv}/${g.id}$`));
  const state = page.getByRole("button", { name: "Đã học", exact: true });
  await expect(state).toHaveAttribute("aria-pressed", "true");
  await state.click();
  await expect(page.getByRole("button", { name: "Chưa học", exact: true })).toHaveAttribute("aria-pressed", "false");
  const raw2 = await page.evaluate(() => localStorage.getItem("fr.grammarDone"));
  expect(JSON.parse(raw2!)).toEqual([expect.stringMatching(/^giong-danh-tu~~[0-9a-z]+~0~0~~1$/)]);
});

test("phát âm: tích bài trên danh sách + lọc", async ({ page }) => {
  await freshStart(page, "/phat-am");
  await page.getByRole("checkbox", { name: "Đã học: Bảng chữ cái" }).click();
  await expect(page.getByText(/^1\/\d+ bài$/)).toBeVisible();
  await page.getByRole("radio", { name: /^Đã học/ }).click();
  await expect(page.getByRole("checkbox", { name: /^Đã học:/ })).toHaveCount(1);
});
