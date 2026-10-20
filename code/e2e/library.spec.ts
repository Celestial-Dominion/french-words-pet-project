import { test, expect } from "@playwright/test";
import { freshStart, publicData } from "./helpers";

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

test("trang bài / truyện chỉ tải file chữ của đúng bài đó, không tải file cả cấp", async ({ page }) => {
  type Meta = { id: string; level: number; title_fr: string };
  const r = publicData<Meta[]>("readings-index.json").find((x) => x.level === 5)!; // C1: file cả cấp từng nặng 2,2 MB
  const s = publicData<Meta[]>("stories-index.json").find((x) => x.level === 5)!;
  const docs: string[] = [];
  page.on("request", (q) => {
    const p = new URL(q.url()).pathname;
    if (/^\/data\/(readings|stories)\//.test(p)) docs.push(p);
  });
  await freshStart(page, `/bai-doc/c1/${r.id}`);
  await expect(page.getByRole("heading", { name: r.title_fr })).toBeVisible();
  await expect(page.getByRole("link", { name: /Bài tiếp theo/ })).toBeVisible();
  await page.goto(`/truyen/c1/${s.id}`);
  await expect(page.getByRole("heading", { name: s.title_fr })).toBeVisible();
  expect([...new Set(docs)]).toEqual([`/data/readings/${r.id}.json`, `/data/stories/${s.id}.json`]);
});

test("truyện theo cấp: tóm tắt + mở truyện qua trang riêng", async ({ page }) => {
  const s = publicData<{ id: string; level: number; title_fr: string; summary: string }[]>("stories-index.json").find((x) => x.level === 3)!; // B1: truyện đầu cấp
  await freshStart(page, "/truyen");
  await page.getByRole("link", { name: /^B1 Trung cấp/ }).click();
  await expect(page).toHaveURL(/\/truyen\/b1$/);
  await expect(page.getByText(s.summary, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: s.title_fr }).last().click();
  await expect(page).toHaveURL(new RegExp(`/truyen/b1/${s.id}$`));
  await expect(page.getByRole("combobox")).toBeVisible(); // chọn chương
});

test("liên kết cũ /bai-doc?open=<id> chuyển sang trang bài mới", async ({ page }) => {
  const title = publicData<{ id: string; title_fr: string }[]>("readings-index.json").find((x) => x.id === "a2-03")!.title_fr;
  await freshStart(page, "/bai-doc?open=a2-03");
  await expect(page).toHaveURL(/\/bai-doc\/a2\/a2-03$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});

// C2: trình đọc — tốc độ nhớ qua lần mở, nghe riêng một câu, câu trước / sau, tạm dừng giữ đúng câu.
test("trình đọc: tốc độ 1→1,25× nhớ qua lần mở; nghe từng câu + câu sau + tạm dừng", async ({ page }) => {
  await freshStart(page, "/bai-doc/a1/a1-01");
  await page.getByRole("button", { name: "Tốc độ nghe: 1×" }).click();
  await expect(page.getByRole("button", { name: "Tốc độ nghe: 1.25×" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Tốc độ nghe: 1.25×" })).toBeVisible();

  await page.getByRole("button", { name: "Nghe câu 2" }).click();
  await expect(page.locator("#psent-1")).toHaveClass(/bg-primary\/10/);
  await page.getByRole("button", { name: "Câu sau" }).click();
  await expect(page.locator("#psent-2")).toHaveClass(/bg-primary\/10/);
  await expect(page.locator("#psent-1")).not.toHaveClass(/bg-primary\/10/);
  await page.getByRole("button", { name: "Tạm dừng" }).click();
  await expect(page.getByRole("button", { name: "Nghe tiếp" })).toBeVisible();
  await expect(page.locator("#psent-2")).toHaveClass(/bg-primary\/10/); // tạm dừng vẫn giữ câu đang dở
});
