import { defineConfig } from "vitest/config";

// Unit test (logic thuần, chạy trong Node) — TÁCH khỏi e2e Playwright ở thư mục e2e/
// (những file đó cần trình duyệt + dev server, không chạy bằng vitest).
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
