// Chạy scripts/test-grammar.mjs (hàm thuần, mã hoá đồng bộ, curriculum, mọi bài Ngữ pháp đã build) trong `npm test`.
// Script chạy thẳng bằng node (đọc lib/*.ts nhờ type stripping của Node ≥ 22.18) nên gọi qua tiến trình con.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { expect, test } from "vitest";

test("scripts/test-grammar.mjs", () => {
  const root = join(import.meta.dirname, "..");
  let out = "";
  try {
    out = execFileSync(process.execPath, ["--no-warnings", "scripts/test-grammar.mjs"], { cwd: root, encoding: "utf8" });
  } catch (e) {
    out = String(e.stdout ?? "") + String(e.stderr ?? "");
  }
  expect(out).toMatch(/test-grammar: \d+ đạt, 0 lỗi/);
}, 60000);
