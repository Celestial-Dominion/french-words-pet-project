import { test, expect, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { freshStart } from "./helpers";

// C4b (port app Anh 5f38237): bài đọc / truyện tự lên Đã đọc khi làm xong câu hỏi cuối bài (chương cuối) đúng từ 70%,
// không phải khi cuộn tới cuối. Bài không tải được câu hỏi thì giữ cách cũ (cuộn tới cuối là đánh dấu).
// C4: "Gặp lại trong ngữ cảnh" ở thẻ từ tra chỉ mục word-refs, không tải chữ cả kho bài.

type Meta = { id: string; level: number; title_fr: string; chapters?: number };
type QuizQ = { opts: { fr: string }[]; a: number };
const data = <T>(p: string) => JSON.parse(readFileSync(join(process.cwd(), "public", "data", p), "utf8")) as T;
const quizOf = <T>(id: string) => data<T>(`quiz/${id}.json`);

const state = (page: Page, name: "Đã đọc" | "Chưa đọc") => page.getByRole("button", { name, exact: true }).first();

// Trả lời lần lượt từng câu: right[i] = chọn đáp án đúng hay một phương án sai. Nút phương án là nút có <span> con
// mang đúng chữ phương án (nút từ bấm-tra trong câu hỏi chỉ có chữ, nút loa chỉ có aria-label).
async function answer(page: Page, quiz: Locator, qs: QuizQ[], right: boolean[]) {
  for (const [i, q] of qs.entries()) {
    const oi = right[i] ? q.a : (q.a + 1) % q.opts.length;
    await quiz
      .getByRole("listitem")
      .nth(i)
      .getByRole("button")
      .filter({ has: page.getByText(q.opts[oi].fr, { exact: true }) })
      .click();
  }
}

test("bài đọc: câu hỏi cuối bài quyết định Đã đọc — cuộn không tính, sai thì nhắc, đạt 3/4 thì đánh dấu, làm lại sai vẫn giữ", async ({ page }) => {
  const r = data<Meta[]>("readings-index.json")
    .filter((x) => x.level === 1)
    .find((x) => quizOf<QuizQ[]>(x.id).length === 4)!;
  const qs = quizOf<QuizQ[]>(r.id);
  await freshStart(page, `/bai-doc/a1/${r.id}`);
  const quiz = page.getByRole("region", { name: "Câu hỏi đọc hiểu" });
  await expect(quiz.getByText("đúng từ 3/4 câu là tính Đã đọc", { exact: false })).toBeVisible();

  // Bài A1 ngắn: cuộn qua hết bài tới câu hỏi mà chưa làm → vẫn Chưa đọc (trước đây tự đánh dấu ngay).
  await quiz.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await expect(state(page, "Chưa đọc")).toHaveAttribute("aria-pressed", "false");

  // 2/4 → chưa đạt: giữ Chưa đọc + lời nhắc.
  await answer(page, quiz, qs, [true, true, false, false]);
  await expect(quiz.getByText("Đúng 2/4 câu")).toBeVisible();
  await expect(quiz.getByText("Cần đúng từ 3/4 câu để tính bài Đã đọc")).toBeVisible();
  await page.waitForTimeout(500);
  await expect(state(page, "Chưa đọc")).toHaveAttribute("aria-pressed", "false");

  // Làm lại 3/4 → đạt: tự đánh dấu.
  await quiz.getByRole("button", { name: "Làm lại" }).click();
  await answer(page, quiz, qs, [true, false, true, true]);
  await expect(state(page, "Đã đọc")).toHaveAttribute("aria-pressed", "true");
  await expect(quiz.getByText("Đã đánh dấu bài: Đã đọc")).toBeVisible();
  await expect(quiz.getByText(/Cần đúng/)).toHaveCount(0);

  // Đã đọc rồi, làm lại sai hết → không tự bỏ đánh dấu; tải lại vẫn giữ.
  await quiz.getByRole("button", { name: "Làm lại" }).click();
  await answer(page, quiz, qs, [false, false, false, false]);
  await expect(quiz.getByText("Đúng 0/4 câu")).toBeVisible();
  await expect(quiz.getByText("Đã đánh dấu bài: Đã đọc")).toBeVisible();
  await expect(state(page, "Đã đọc")).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(state(page, "Đã đọc")).toHaveAttribute("aria-pressed", "true");
});

test("bài đọc không tải được câu hỏi: giữ cách cũ — cuộn tới cuối bài là Đã đọc", async ({ page }) => {
  await freshStart(page, "/bai-doc/a1");
  await page.route("**/data/quiz/a1-01.json", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/bai-doc/a1/a1-01");
  await expect(page.getByRole("heading", { name: "La famille de Marie" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Câu hỏi đọc hiểu" })).toHaveCount(0);
  await page.getByTestId("reading-end").scrollIntoViewIfNeeded();
  await expect(state(page, "Đã đọc")).toHaveAttribute("aria-pressed", "true");
});

test("truyện: câu hỏi chương 1 không đổi trạng thái, chương cuối đạt mới Đã đọc; nhớ chương đang đọc", async ({ page }) => {
  const s = data<Meta[]>("stories-index.json").find((x) => x.level === 1 && (x.chapters ?? 0) >= 2)!;
  const qs = quizOf<QuizQ[][]>(s.id);
  const n = qs.length;
  await freshStart(page, `/truyen/a1/${s.id}`);
  const quiz1 = page.getByRole("region", { name: "Câu hỏi · Chương 1" });
  await expect(quiz1.getByText(/là tính Đã đọc/)).toHaveCount(0);
  await answer(page, quiz1, qs[0], qs[0].map(() => true));
  await expect(quiz1.getByText(/Đúng \d+\/\d+ câu/)).toBeVisible();
  await expect(quiz1.getByText(/Đã đánh dấu|Cần đúng/)).toHaveCount(0);
  await page.waitForTimeout(500);
  await expect(state(page, "Chưa đọc")).toHaveAttribute("aria-pressed", "false");

  await page.getByRole("combobox").selectOption(String(n - 1));
  const quizN = page.getByRole("region", { name: `Câu hỏi · Chương ${n}` });
  const last = qs[n - 1];
  // Cuộn tới cuối chương cuối mà chưa làm câu hỏi → vẫn Chưa đọc.
  await quizN.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await expect(state(page, "Chưa đọc")).toHaveAttribute("aria-pressed", "false");
  // Sai hết → nhắc, chưa đổi; làm lại đúng hết → Đã đọc.
  await answer(page, quizN, last, last.map(() => false));
  await expect(quizN.getByText(/Cần đúng .* để tính truyện Đã đọc/)).toBeVisible();
  await expect(state(page, "Chưa đọc")).toHaveAttribute("aria-pressed", "false");
  await quizN.getByRole("button", { name: "Làm lại" }).click();
  await answer(page, quizN, last, last.map(() => true));
  await expect(state(page, "Đã đọc")).toHaveAttribute("aria-pressed", "true");
  await expect(quizN.getByText("Đã đánh dấu truyện: Đã đọc")).toBeVisible();

  // C5: vị trí chương lưu trong fr.storyPos (đồng bộ được) — mở lại là về chương cuối.
  const pos = JSON.parse((await page.evaluate(() => localStorage.getItem("fr.storyPos")))!);
  expect(pos[s.id]).toEqual({ ch: n - 1, at: expect.any(Number) });
  await page.reload();
  await expect(page.getByRole("region", { name: `Câu hỏi · Chương ${n}` })).toBeVisible();
});

test("thẻ từ: 'Gặp lại trong ngữ cảnh' tra chỉ mục word-refs, không tải chữ cả kho bài", async ({ page }) => {
  await freshStart(page, "/bai-doc/a1/a1-01");
  await expect(page.getByRole("heading", { name: "La famille de Marie" })).toBeVisible(); // trang bài đã tải xong a1.json
  const urls: string[] = [];
  page.on("request", (r) => urls.push(new URL(r.url()).pathname));
  await page.getByRole("button", { name: "famille", exact: true }).first().click();
  const box = page.getByText("📖 Gặp lại trong ngữ cảnh").locator("..");
  await expect(box).toBeVisible();
  const links = box.getByRole("link");
  expect(await links.count()).toBeGreaterThanOrEqual(2);
  await expect(links.filter({ hasText: "bài đọc" }).first()).toBeVisible();
  await expect(links.filter({ hasText: "truyện" }).first()).toBeVisible();
  expect(urls.some((u) => /\/data\/word-refs\/\d+\.json$/.test(u))).toBe(true);
  expect(urls.filter((u) => /\/data\/(readings|stories)\/[abc][12]\.json$/.test(u))).toEqual([]);

  // bấm sang bài trong danh sách → trang bài tương ứng
  const href = await links.first().getAttribute("href");
  await links.first().click();
  await expect(page).toHaveURL(new RegExp(`${href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
});
