import { test, expect, type Page } from "@playwright/test";
import { freshStart, openSettings, shortSessions, patchReview } from "./helpers";

// Smoke test các luồng chính (chạy local trên dev, không cần backend —
// AuthGate tự bỏ qua chặn đăng nhập khi chạy máy tự động ngoài production).

/**
 * Trả lời hết một phiên chỉ có 1 thẻ, không cần biết trước đáp án: lần đầu bấm đại phương án
 * 1; sau khi trả lời, UI TÔ XANH phương án đúng (border-emerald-500) → ghi nhớ nội dung đó và
 * bấm trúng ở mọi lần gặp lại. Thẻ mới cần ĐÚNG 2 LẦN mới ra khỏi phiên (đúng lần đầu chấm Good
 * → FSRS hẹn lại 10 phút ≤ cửa sổ 15 phút nên thẻ lặp lại trong phiên).
 */
async function finishOneCardSession(page: Page) {
  const done = page.getByText("✅ Xong phiên ôn!");
  let knownAnswer: string | null = null;
  for (let pass = 0; pass < 8; pass++) {
    await page.getByRole("button", { name: /Thử nhớ trong đầu/ }).click();
    if (knownAnswer) {
      await page.locator("button", { hasText: knownAnswer }).first().click();
    } else {
      await page.keyboard.press("1");
      knownAnswer =
        (await page.locator("button.border-emerald-500").first().textContent())?.replace(/^\d+/, "").trim() ?? null;
    }
    if (await done.waitFor({ state: "visible", timeout: 2500 }).then(() => true, () => false)) return;
    const next = page.getByRole("button", { name: /Kết thúc|Tiếp tục/ }).first();
    if (await next.isVisible().catch(() => false)) await next.click();
    if (await done.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) return;
  }
  await expect(done).toBeVisible();
}

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
  await freshStart(page, "/hoc/1");
  await page.getByRole("button", { name: /Học .* từ mới/ }).click();
  // hàng tiến trình phiên (như HSK): đếm thẻ + pill "từ mới" + nút Thoát chữ
  await expect(page.getByText(/^1\/\d+$/)).toBeVisible();
  await expect(page.getByText("từ mới", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Thoát" })).toBeVisible();
  // thẻ HỌC từ mới hiện trước (không hỏi ngay)
  await expect(page.getByText("Từ mới — học trước nhé")).toBeVisible();
  // XEN KẼ (interleave): sau thẻ học có thể là thẻ học của TỪ KHÁC → bấm qua tới câu hỏi đầu tiên
  const gate = page.getByRole("button", { name: /Thử nhớ trong đầu/ });
  for (let k = 0; k < 8; k++) {
    if (await gate.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) break;
    await page.getByRole("button", { name: /Đã xem — Kiểm tra/ }).click();
  }
  // nhớ-lại-trước: hiện đáp án → hướng dẫn + phương án đánh số → trả lời → badge Đúng/Sai.
  // Câu có cổng đầu tiên có thể là bài chính (chọn nghĩa) hoặc bài điền của từ khác (xen kẽ).
  await gate.click();
  await expect(page.getByText(/Chọn nghĩa đúng|Điền từ còn thiếu/)).toBeVisible();
  await page.keyboard.press("1");
  await expect(page.getByText(/✓ Đúng|✗ Sai/)).toBeVisible();
  // sau khi chấm: lộ nghĩa đầy đủ + từ loại ở thẻ chi tiết
  await expect(page.getByText(/danh từ|động từ|tính từ|phó từ|đại từ|giới từ/).first()).toBeVisible();
});

test("học từ mới: bài chính vẫn còn trước đợt điền vào câu (tắt xen kẽ)", async ({ page }) => {
  await freshStart(page, "/on-tap");
  const sheet = await openSettings(page);
  await sheet.getByLabel("Từ mới mỗi ngày").fill("1");
  await sheet.getByLabel("Số câu điền mỗi từ").selectOption("1");
  await sheet.getByLabel(/Xáo trộn các đợt/).click();
  await expect(sheet.getByLabel(/Xáo trộn các đợt/)).not.toBeChecked();
  await sheet.getByLabel(/Tự chuyển khi đúng/).click();
  await expect(sheet.getByLabel(/Tự chuyển khi đúng/)).not.toBeChecked();
  await page.keyboard.press("Escape");

  await page.goto("/hoc/1");
  await page.getByRole("button", { name: /Học \(1 từ mới\)/ }).click();
  await page.getByRole("button", { name: /Đã xem — Kiểm tra/ }).click();

  // Đợt ①: bài nhận biết từ vẫn luôn tồn tại, không bị câu điền thay thế.
  await expect(page.getByText("Pháp → nghĩa", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Thử nhớ trong đầu/ }).click();
  await page.keyboard.press("1");
  await page.getByRole("button", { name: /Điền vào câu/ }).click();

  // Đợt ② là luyện tập riêng, không chấm lịch ôn lần nữa; nghĩa câu ẩn tới khi trả lời.
  await expect(page.getByText("Điền vào câu", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Thử nhớ trong đầu/ }).click();
  await expect(page.getByText(/Điền từ còn thiếu/)).toBeVisible();
  await expect(page.getByText("Xin chào bà ạ!")).toHaveCount(0);
  await page.keyboard.press("1");
  // sau khi chấm: lộ nghĩa của cả 4 phương án tiếng Pháp (như HSK)
  await expect(page.locator("button.border-emerald-500 span.opacity-70")).toBeVisible();
});

test("học từ mới: chạy trọn 1 vòng → pháo hoa tổng kết + thẻ vào hàng đợi ôn", async ({ page }) => {
  test.setTimeout(60_000);
  await freshStart(page, "/");
  await shortSessions(page);
  await page.goto("/hoc/1");
  await page.getByRole("button", { name: /Học \(1 từ mới\)/ }).click();
  await page.getByRole("button", { name: /Đã xem — Kiểm tra/ }).click();
  await finishOneCardSession(page);
  await expect(page.locator("canvas")).toBeAttached(); // pháo hoa (tự gỡ khi hết hạt)

  await page.goto("/on-tap");
  await expect(page.getByText("Đã học", { exact: true }).locator("xpath=preceding-sibling::div[1]")).toHaveText("1");
  await expect(page.getByRole("button", { name: "Chưa có thẻ để ôn" })).toBeDisabled();
});

test("gõ chính tả: thẻ đã chín ra bài gõ, quên dấu/lệch 1 ký tự vẫn tính đúng", async ({ page }) => {
  await freshStart(page, "/");
  await shortSessions(page);
  await page.goto("/hoc/1");
  // "Đã biết rồi" tạo thẻ stability 60; giả lập đã QUA lần kiểm tra đầu (reps 2) → thẻ CHÍN, đúng
  // điều kiện ra bài gõ; dời lần ôn về hôm qua để đủ điều kiện "ôn sớm".
  await page.getByPlaceholder(/Tìm/).fill("maison");
  await page.getByRole("button", { name: /maison/ }).first().click();
  await page.getByRole("button", { name: "Đã biết rồi" }).click();
  await expect(page.getByText(/Đã biết sẵn · kiểm tra lại sau/)).toBeVisible();
  await page.keyboard.press("Escape");
  await patchReview(page, "maison", { lastReviewDaysAgo: 1, set: { reps: 2 } });

  await page.goto("/on-tap");
  await expect(page.getByRole("button", { name: /Ôn sớm/ }).first()).toBeVisible();
  // Loại câu hỏi bốc theo Math.random → ghim lại để bài gõ chắc chắn ra (0.5 rơi vào ô "spell").
  await page.evaluate(() => {
    Math.random = () => 0.5;
  });
  await page.getByRole("button", { name: /Ôn sớm/ }).first().click();
  await expect(page.getByText("Gõ chính tả")).toBeVisible();
  await expect(page.getByLabel("Gõ từ tiếng Pháp")).toBeVisible();
  await expect(page.getByRole("button", { name: "é" })).toBeVisible(); // hàng phím dấu

  await page.getByLabel("Gõ từ tiếng Pháp").fill("une maisn"); // gõ kèm mạo từ + thiếu 1 chữ
  await page.getByRole("button", { name: /Kiểm tra/ }).click();
  await expect(page.getByText(/Suýt đúng/)).toBeVisible();
  await expect(page.getByText("une maisn")).toBeVisible(); // hiện lại chỗ gõ sai
  await expect(page.getByText("✅ Xong phiên ôn!")).toBeVisible(); // tính đúng → tự sang tổng kết
});

test("phiên học: bấm link topbar giữa phiên → hỏi xác nhận thoát", async ({ page }) => {
  await page.goto("/hoc/1");
  await page.getByRole("button", { name: /Học .* từ mới/ }).click();
  await expect(page.getByText("Từ mới — học trước nhé")).toBeVisible();
  // bấm logo (link "/") giữa phiên → modal xác nhận, KHÔNG rời phiên
  await page.getByRole("link", { name: /French/ }).click();
  await expect(page.getByRole("heading", { name: "Thoát phiên ôn?" })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục ôn" }).click();
  await expect(page.getByText("Từ mới — học trước nhé")).toBeVisible(); // vẫn trong phiên
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

test("cài đặt: trang /cai-dat cũ vẫn có đủ cài đặt + sao lưu", async ({ page }) => {
  await page.goto("/cai-dat");
  await expect(page.getByRole("heading", { name: "Cài đặt" })).toBeVisible();
  await expect(page.getByText("Thẻ ôn mỗi phiên")).toBeVisible();
  await expect(page.getByRole("button", { name: /Xuất tệp/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Nhập tệp/ })).toBeVisible();
});

test("cài đặt: nút ⚙️ trên topbar mở thẳng ngăn cài đặt ở mọi trang, đổi xong áp dụng ngay", async ({ page }) => {
  await freshStart(page, "/on-tap");
  await expect(page.getByRole("link", { name: /Học từ mới \(5\)/ })).toBeVisible();
  let sheet = await openSettings(page);
  await sheet.getByRole("button", { name: "Thêm 1" }).click();
  await expect(sheet.getByLabel("Từ mới mỗi ngày")).toHaveValue("6");
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Học từ mới \(6\)/ })).toBeVisible();

  // mở từ trang khác cũng được; hướng hỏi lưu qua lần tải lại
  await page.goto("/doc");
  sheet = await openSettings(page);
  await sheet.getByRole("button", { name: "Nghĩa→Pháp" }).click();
  await expect(sheet.getByRole("button", { name: "Nghĩa→Pháp" })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  sheet = await openSettings(page);
  await expect(sheet.getByRole("button", { name: "Nghĩa→Pháp" })).toHaveAttribute("aria-pressed", "true");
  await expect(sheet.getByRole("button", { name: /Xuất tệp/ })).toBeVisible();
  await page.mouse.click(195, 20); // bấm nền tối bên ngoài → đóng
  await expect(sheet).toHaveCount(0);
});

test("cài đặt: mở được ngay giữa phiên học — không hỏi rời phiên, phím gõ không lọt xuống phiên", async ({ page }) => {
  await freshStart(page, "/hoc/1");
  await page.getByRole("button", { name: /Học \(/ }).click();
  await expect(page.getByText(/Từ mới — học trước nhé/)).toBeVisible();
  const count = page.getByText(/^1\/\d+$/);
  await expect(count).toBeVisible();
  const sheet = await openSettings(page);
  await expect(page.getByText("Thoát phiên ôn?")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await page.keyboard.press(" ");
  await sheet.getByLabel(/Tự chuyển khi đúng/).click();
  await expect(sheet.getByLabel(/Tự chuyển khi đúng/)).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(count).toBeVisible(); // vẫn đứng nguyên ở thẻ đầu
});

test("ôn tập: dòng trạng thái đồng bộ + công tắc âm thanh / dạng câu hỏi", async ({ page }) => {
  await freshStart(page, "/on-tap");
  await expect(page.getByText(/Chưa đăng nhập|Đã đồng bộ lúc|Chưa đồng bộ/)).toBeVisible();
  await page.getByText("⚙️ Cài đặt").click();
  const row = (label: string) => page.locator("label").filter({ hasText: label });
  for (const label of ["🔊 Âm thanh", "Nghe trong bài chính", "② Điền từ vào câu", "③ Câu ghép mỗi từ", "Gõ chính tả", "Câu chọn giống"]) {
    await expect(row(label)).toBeVisible();
  }
  await row("Nghe trong bài chính").locator('input[type="checkbox"]').click();
  await expect(row("Nghe trong bài chính").locator('input[type="checkbox"]')).not.toBeChecked();
  await page.reload();
  await page.getByText("⚙️ Cài đặt").click();
  await expect(row("Nghe trong bài chính").locator('input[type="checkbox"]')).not.toBeChecked();
  // tắt Âm thanh → công tắc "câu hỏi nghe" bị khoá (không có tiếng thì không làm được)
  await row("🔊 Âm thanh").locator('input[type="checkbox"]').click();
  await expect(row("🔊 Âm thanh").locator('input[type="checkbox"]')).not.toBeChecked();
  await expect(row("Nghe trong bài chính").locator('input[type="checkbox"]')).toBeDisabled();
});

test("nhiệm vụ ngày: trang chủ + ôn tập hiện khối 3 nhiệm vụ, 0/3 khi chưa học", async ({ page }) => {
  await freshStart(page, "/");
  await expect(page.getByText(/Nhiệm vụ hôm nay/)).toBeVisible();
  await expect(page.getByText(/· 0\/3/)).toBeVisible();
  await page.goto("/on-tap");
  await expect(page.getByText(/Nhiệm vụ hôm nay/)).toBeVisible();
});

test("luyện tập tự do: mở được; chưa học từ nào → báo rõ + khoá nút bắt đầu", async ({ page }) => {
  await freshStart(page, "/luyen-tap");
  await expect(page.getByRole("heading", { name: "Luyện tập" })).toBeVisible();
  await expect(page.getByText(/Chưa có từ nào được học/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Bắt đầu/ })).toBeDisabled();
});

test("luyện tập tự do: nghe & gõ câu chịu sai dấu, chấm từng từ", async ({ page }) => {
  await freshStart(page, "/hoc/1");
  // 1 từ đã học là đủ để luyện câu của nó
  await page.getByPlaceholder(/Tìm/).fill("bonjour");
  await page.getByRole("button", { name: /bonjour/ }).first().click();
  await page.getByRole("button", { name: "Học từ này" }).click();
  await expect(page.getByText(/Đã học · ôn lại sau|Đến hạn ôn/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/luyen-tap");
  await page.getByRole("button", { name: /Bắt đầu/ }).click();
  await expect(page.getByText("Nghe rồi gõ lại cả câu")).toBeVisible();
  await page.getByPlaceholder(/Gõ câu bạn nghe được/).fill("bonjour");
  await page.getByRole("button", { name: /Kiểm tra/ }).click();
  await expect(page.getByRole("button", { name: /Tiếp tục/ })).toBeVisible();
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
  await expect(page.getByText("Thẻ ôn mỗi phiên")).toBeVisible();
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

test("chọn giống un/une: sau bài ngữ pháp về giống, danh từ có câu chọn mạo từ (không chấm FSRS)", async ({ page }) => {
  await freshStart(page, "/");
  await shortSessions(page);
  // đã học bài "Giống của danh từ" → mở câu chọn giống
  await page.evaluate(() => localStorage.setItem("fr.grammarDone", JSON.stringify(["giong-danh-tu"])));
  await page.goto("/hoc/1");
  await expect(page.getByRole("button", { name: /Học \(1 từ mới\)/ })).toBeVisible();
  // tỉ trọng câu chọn giống ~30% (Math.random < 0.3) → ghim để chắc chắn ra
  await page.evaluate(() => {
    Math.random = () => 0.1;
  });
  await page.getByRole("button", { name: /Học \(1 từ mới\)/ }).click();
  await page.getByRole("button", { name: /Đã xem — Kiểm tra/ }).click();
  const genderPrompt = page.getByText("Danh từ này dùng mạo từ nào?");
  for (let k = 0; k < 6; k++) {
    if (await genderPrompt.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) break;
    const gate = page.getByRole("button", { name: /Thử nhớ trong đầu/ });
    if (await gate.isVisible().catch(() => false)) await gate.click();
    await page.keyboard.press("1");
    const next = page.getByRole("button", { name: /Tiếp tục|Kết thúc/ }).first();
    if (await next.isVisible().catch(() => false)) await next.click();
  }
  await expect(genderPrompt).toBeVisible();
  await expect(page.getByText("Chọn giống", { exact: true })).toBeVisible();
  await page.locator("button", { hasText: /^1un$/ }).click(); // bonjour là danh từ giống đực
  await expect(page.getByText("✓ Đúng")).toBeVisible();
});

test("thẻ từ: nhãn văn phong (thân mật / thô tục) hiện cạnh từ loại", async ({ page }) => {
  await page.goto("/hoc/2");
  await page.getByPlaceholder(/Tìm/).fill("bouffer");
  await page.getByRole("button", { name: /bouffer/ }).first().click();
  await expect(page.getByText("thân mật", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/hoc/1");
  await page.getByPlaceholder(/Tìm/).fill("mec");
  await page.getByRole("button", { name: /\bmec \/mɛk\// }).first().click();
  await expect(page.getByText("thân mật", { exact: true })).toBeVisible();
});

test("thẻ từ: họ từ — bấm từ cùng họ mở thẻ mới, quay lại được (nút + Esc)", async ({ page }) => {
  await page.goto("/hoc/1");
  await page.getByPlaceholder(/Tìm/).fill("chanter");
  await page.getByRole("button", { name: /\bchanter \// }).first().click();
  await expect(page.getByText("🌱 Họ từ")).toBeVisible();
  await page.getByRole("button", { name: "chanteur", exact: true }).click();
  const back = page.getByRole("button", { name: /^chanter$/ }).first(); // nút quay lại nằm trên đầu ngăn
  await expect(back).toBeVisible(); // đang xem "chanteur", nút quay lại mang tên từ gốc
  await expect(page.getByRole("button", { name: "chanter", exact: true }).last()).toBeVisible(); // chanter nằm trong họ của chanteur
  await back.click();
  await expect(page.getByRole("button", { name: "chanteur", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "chanteur", exact: true }).click();
  await page.keyboard.press("Escape"); // Esc lùi một bước, chưa đóng ngăn
  await expect(page.getByRole("button", { name: "chanteur", exact: true })).toBeVisible();
});

test("thẻ từ: cụm hay đi kèm — hiện cụm tiếng Pháp kèm nghĩa", async ({ page }) => {
  await page.goto("/hoc/1");
  await page.getByPlaceholder(/Tìm/).fill("faim");
  await page.getByRole("button", { name: /\bfaim \// }).first().click();
  await expect(page.getByText("🔗 Cụm hay đi kèm")).toBeVisible();
  await expect(page.getByText("avoir faim", { exact: true })).toBeVisible();
  await expect(page.getByText("— đói", { exact: true })).toBeVisible();
});
