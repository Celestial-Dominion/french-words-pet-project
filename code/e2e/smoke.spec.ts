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
  await expect(page.getByText("1 từ", { exact: true })).toBeVisible();
  await expect(page.getByText("/mɑ̃ʒe/")).toBeVisible();
});

test("học từ mới: learn-card trước rồi mới MCQ", async ({ page }) => {
  await page.goto("/hoc/1");
  await page.getByRole("button", { name: /Học .* từ mới/ }).click();
  // hàng tiến trình phiên (như HSK): đếm thẻ + pill "từ mới" + nút Thoát chữ
  await expect(page.getByText(/^1\/\d+$/)).toBeVisible();
  await expect(page.getByText("từ mới", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Thoát" })).toBeVisible();
  // thẻ HỌC từ mới hiện trước (không hỏi ngay)
  await expect(page.getByText("Từ mới — học trước nhé")).toBeVisible();
  await page.getByRole("button", { name: /Đã xem — Kiểm tra/ }).click();
  // nhớ-lại-trước: hiện đáp án → hướng dẫn + phương án đánh số → trả lời → badge Đúng/Sai
  await page.getByRole("button", { name: /Thử nhớ trong đầu/ }).click();
  await expect(page.getByText("Chọn nghĩa đúng")).toBeVisible();
  await page.locator("div.grid > button").first().click();
  await expect(page.getByText(/✓ Đúng|✗ Sai/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Tiếp tục|Kết thúc|Ghép câu/ })).toBeVisible();
});

test("đọc hub /doc + học /hoc: trang mới như HSK", async ({ page }) => {
  await page.goto("/doc");
  await expect(page.getByRole("heading", { name: "Đọc" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Bài đọc/ })).toBeVisible();
  await page.goto("/hoc");
  await expect(page.getByRole("heading", { name: "Học từ theo cấp" })).toBeVisible();
});

test("khóa ngữ pháp: danh sách bài + mở bài + đánh dấu xong", async ({ page }) => {
  await page.goto("/ngu-phap");
  await expect(page.getByRole("heading", { name: "Khóa ngữ pháp vỡ lòng" })).toBeVisible();
  await page.getByRole("button", { name: /Giống của danh từ/ }).click();
  await expect(page.getByText("un = một (đực) · une = một (cái)")).toBeVisible();
  await page.getByRole("button", { name: "Đã học xong bài này" }).click();
  await expect(page.getByText("1/11 bài")).toBeVisible();
});

test("cài đặt: trang sao lưu & khôi phục", async ({ page }) => {
  await page.goto("/cai-dat");
  await expect(page.getByRole("heading", { name: "Cài đặt" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Xuất dữ liệu/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Nhập từ tệp/ })).toBeVisible();
});

test("học từ: tìm kiếm toàn app + card khóa học", async ({ page }) => {
  await page.goto("/hoc");
  await expect(page.getByText("Khóa ngữ pháp vỡ lòng")).toBeVisible();
  await page.getByPlaceholder(/Tra nhanh một từ/).fill("bonjour");
  await page.getByRole("button", { name: /bonjour/ }).first().click();
  await expect(page.getByText(/xin chào/).first()).toBeVisible();
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
  await page.getByRole("button", { name: /La famille de Marie/ }).last().click();
  await expect(page.getByRole("button", { name: "Nghe cả bài" })).toBeVisible();
});

test("truyện: danh sách hiển thị", async ({ page }) => {
  await page.goto("/truyen");
  await expect(page.getByRole("heading", { name: "Truyện", exact: true })).toBeVisible();
  await expect(page.getByText(/\d+ truyện/).first()).toBeVisible();
});

test("tiến độ & binh nghiệp render", async ({ page }) => {
  await page.goto("/tien-do");
  await expect(page.getByRole("heading", { name: "Tiến độ", exact: true })).toBeVisible();
  await expect(page.getByText(/Tiến độ theo cấp/)).toBeVisible();
  await page.goto("/tu-luyen");
  await expect(page.getByRole("heading", { name: "Binh nghiệp" })).toBeVisible();
  await expect(page.getByText("Thang cấp bậc")).toBeVisible();
});
