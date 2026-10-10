import { expect, type Page } from "@playwright/test";

// Tiện ích dùng chung cho e2e (port từ app Anh). DB IndexedDB của app: "french-words".
export const DB_NAME = "french-words";

/** Xoá IndexedDB + cache + localStorage để mỗi test bắt đầu từ trạng thái sạch, tránh phụ thuộc thứ tự. */
export async function freshStart(page: Page, path = "/") {
  await page.goto(path);
  await page.evaluate(async (name) => {
    for (const k of await caches.keys()) await caches.delete(k);
    await new Promise<void>((r) => {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = req.onerror = req.onblocked = () => r();
    });
    localStorage.clear();
  }, DB_NAME);
  await page.goto(path);
}

/** Bản ghi thẻ ôn của một từ (null = chưa có) — đọc thẳng IndexedDB. */
export async function reviewOf(page: Page, wordId: string) {
  return page.evaluate(
    ([id, name]) =>
      new Promise<Record<string, unknown> | null>((resolve, reject) => {
        const open = indexedDB.open(name);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const get = open.result.transaction("reviews").objectStore("reviews").get(id);
          get.onsuccess = () => {
            open.result.close();
            const r = get.result;
            resolve(r ? { ...r, due: new Date(r.due).getTime() } : null);
          };
          get.onerror = () => reject(get.error);
        };
      }),
    [wordId, DB_NAME] as const,
  );
}

/** Sửa trực tiếp một thẻ ôn trong IndexedDB (dời mốc thời gian, giả lập số lần ôn…). */
export async function patchReview(page: Page, wordId: string, patch: { lastReviewDaysAgo?: number; dueDaysAgo?: number; set?: Record<string, number> }) {
  await page.evaluate(
    ([id, p, name]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(name);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction("reviews", "readwrite");
          const store = tx.objectStore("reviews");
          const get = store.get(id);
          get.onsuccess = () => {
            const r = get.result;
            if (p.lastReviewDaysAgo !== undefined) r.last_review = new Date(Date.now() - p.lastReviewDaysAgo * 86_400_000);
            if (p.dueDaysAgo !== undefined) r.due = new Date(Date.now() - p.dueDaysAgo * 86_400_000);
            Object.assign(r, p.set ?? {});
            store.put(r);
          };
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [wordId, patch, DB_NAME] as const,
  );
}

/** Mở ngăn Cài đặt (nút ⚙️ trên topbar) — dùng được ở mọi trang. */
export async function openSettings(page: Page) {
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Cài đặt" });
  await expect(sheet).toBeVisible();
  return sheet;
}

/** Hạ hạn mức xuống 1 từ/ngày + tắt điền/ghép để phiên học từ mới chỉ còn thẻ học + bài chính. */
export async function shortSessions(page: Page) {
  await page.goto("/on-tap");
  const sheet = await openSettings(page);
  await sheet.getByLabel("Từ mới mỗi ngày").fill("1");
  await expect(sheet.getByLabel("Từ mới mỗi ngày")).toHaveValue("1");
  await sheet.getByLabel("Số câu điền mỗi từ").selectOption("0");
  await sheet.getByLabel("Số câu ghép mỗi từ").selectOption("0");
  await expect(sheet.getByLabel("Số câu ghép mỗi từ")).toHaveValue("0");
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
}

export const daysUntil = (due: unknown) => Math.round(((due as number) - Date.now()) / 86_400_000);
