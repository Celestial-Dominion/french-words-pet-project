import { test, expect } from "@playwright/test";

// Smoke test các luồng chính (chạy local trên dev, không cần backend —
// AuthGate tự bỏ qua chặn đăng nhập khi chạy máy tự động ngoài production).

test("trang chủ: hero + grid cấp độ + khám phá", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Hôm nay")).toBeVisible();
  await expect(page.getByText("Chọn cấp độ")).toBeVisible();
  await expect(page.getByText("Khám phá")).toBeVisible();
  await expect(page.getByRole("link", { name: /Vỡ lòng/ })).toBeVisible();
});

test("khóa phát âm: danh sách bài", async ({ page }) => {
  await page.goto("/phat-am");
  await expect(page.getByRole("heading", { name: "Khóa phát âm" })).toBeVisible();
  await expect(page.getByText("Bảng chữ cái")).toBeVisible();
  await expect(page.getByText("Nguyên âm mũi")).toBeVisible();
});

test("tra từ: /hoc/1 tìm không dấu 'manger'", async ({ page }) => {
  await page.goto("/hoc/1");
  await page.getByPlaceholder(/Tìm/).fill("manger");
  await expect(page.getByText("1 kết quả")).toBeVisible();
  await expect(page.getByText("/mɑ̃ʒe/")).toBeVisible();
});

test("học từ mới: learn-card trước rồi mới MCQ", async ({ page }) => {
  await page.goto("/hoc/1");
  await page.getByRole("button", { name: /Học .* từ mới/ }).click();
  await expect(page.getByText("Học từ mới · A1")).toBeVisible();
  // header phiên: đếm thẻ + nhãn loại câu (như HSK)
  await expect(page.getByText(/^1\/\d+$/)).toBeVisible();
  await expect(page.getByText("✨ Từ mới", { exact: true })).toBeVisible();
  // thẻ HỌC từ mới hiện trước (không hỏi ngay)
  await expect(page.getByText("Từ mới — học trước nhé")).toBeVisible();
  await page.getByRole("button", { name: "Đã xem — Kiểm tra" }).click();
  await expect(page.getByText("Chọn nghĩa đúng")).toBeVisible();
  // nhớ-lại-trước: bấm hiện đáp án → chọn 1 phương án → badge Đúng/Sai + thẻ chi tiết + nút tiếp
  await page.getByRole("button", { name: /Thử nhớ trong đầu/ }).click();
  await page.locator("div.grid > button").first().click();
  await expect(page.getByText(/✓ Đúng|✗ Sai/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Tiếp tục|Kết thúc/ })).toBeVisible();
});

test("ôn tập: cài đặt có số thẻ mỗi phiên", async ({ page }) => {
  await page.goto("/on-tap");
  await page.getByText("⚙️ Cài đặt").click();
  await expect(page.getByText("Số thẻ ôn mỗi phiên")).toBeVisible();
  await expect(page.getByText("Nhớ lại trước")).toBeVisible();
});

test("bài đọc: danh sách + mở đọc bấm-tra", async ({ page }) => {
  await page.goto("/bai-doc");
  await expect(page.getByRole("heading", { name: "Bài đọc", exact: true })).toBeVisible();
  await page.getByText("La famille de Marie").click();
  await expect(page.getByRole("button", { name: "Nghe cả bài" })).toBeVisible();
});

test("truyện: danh sách hiển thị", async ({ page }) => {
  await page.goto("/truyen");
  await expect(page.getByRole("heading", { name: "Truyện", exact: true })).toBeVisible();
  await expect(page.getByText(/\d+ truyện/).first()).toBeVisible();
});

test("tiến độ & binh nghiệp render", async ({ page }) => {
  await page.goto("/tien-do");
  await expect(page.getByRole("heading", { name: "Tiến độ" })).toBeVisible();
  await expect(page.getByText("Từ đã học theo cấp")).toBeVisible();
  await page.goto("/tu-luyen");
  await expect(page.getByRole("heading", { name: "Binh nghiệp" })).toBeVisible();
  await expect(page.getByText("Thang cấp bậc")).toBeVisible();
});
