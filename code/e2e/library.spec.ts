import { test, expect } from "@playwright/test";
import { freshStart } from "./helpers";

// C1: thư viện theo cấp — trang riêng cho từng cấp / từng bài, lọc chủ đề, bài tiếp theo, liên kết cũ ?open= vẫn chạy.

test("bài đọc theo cấp: lọc chủ đề + nhãn chủ đề/thể loại/thời lượng", async ({ page }) => {
  await freshStart(page, "/bai-doc/a1");
  await expect(page.getByRole("heading", { name: "Vỡ lòng" })).toBeVisible();
  const cards = page.getByRole("checkbox", { name: /^Đã đọc:/ });
  const all = await cards.count();
  await page.getByRole("button", { name: /^Ẩm thực · \d+$/ }).click();
  await expect(page.getByRole("button", { name: /^Ẩm thực · \d+$/ })).toHaveAttribute("aria-pressed", "true");
  const food = await cards.count();
  expect(food).toBeGreaterThan(0);
  expect(food).toBeLessThan(all);
  await expect(page.getByText(/Ẩm thực · (Miêu tả|Tự sự) · \d+ phút/).first()).toBeVisible();
});

test("trang bài: tải theo đường dẫn trực tiếp, có 'Bài tiếp theo' sang bài kế", async ({ page }) => {
  await freshStart(page, "/bai-doc/a1/a1-01");
  await expect(page.getByRole("heading", { name: "La famille de Marie" })).toBeVisible();
  await page.getByRole("link", { name: /Bài tiếp theo/ }).click();
  await expect(page).toHaveURL(/\/bai-doc\/a1\/a1-02$/);
  await expect(page.getByRole("heading", { name: "Le petit-déjeuner" })).toBeVisible();
  await page.getByRole("button", { name: "Quay lại" }).click();
  await expect(page).toHaveURL(/\/bai-doc\/a1$/);
});

test("truyện theo cấp: tóm tắt + mở truyện qua trang riêng", async ({ page }) => {
  await freshStart(page, "/truyen");
  await page.getByRole("link", { name: /^B1 Trung cấp/ }).click();
  await expect(page).toHaveURL(/\/truyen\/b1$/);
  await expect(page.getByText(/Marie và Paul đi biển/)).toBeVisible();
  await page.getByRole("link", { name: /Le voyage à la mer/ }).last().click();
  await expect(page).toHaveURL(/\/truyen\/b1\/b1-story-01$/);
  await expect(page.getByRole("combobox")).toBeVisible(); // chọn chương
});

test("liên kết cũ /bai-doc?open=<id> chuyển sang trang bài mới", async ({ page }) => {
  await freshStart(page, "/bai-doc?open=a2-03");
  await expect(page).toHaveURL(/\/bai-doc\/a2\/a2-03$/);
  await expect(page.getByRole("heading", { name: "Au marché" })).toBeVisible();
});
