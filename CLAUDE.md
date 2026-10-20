# Bản đồ dự án tiếng Pháp (đọc trước, đỡ phải mò)

- Repo git là thư mục này. App ở `code/`.
- **Việc còn lại + tiến độ: `plan/TASKS.md`** (nguồn duy nhất). Đọc mục "Cách dùng" trong đó trước khi nhận việc nội
  dung / ngữ pháp / port từ app Anh; sau mỗi lô ghi Nhật ký + bảng Tổng quan và commit cùng lô.
- Cách viết: bài đọc/truyện `code/docs/CONTENT_PLAYBOOK.md`, ngữ pháp `code/docs/GRAMMAR_PLAYBOOK.md`.
  `plan/gap-banks/`, `plan/story-banks/` = dữ liệu giỏ từ của `content-kit.mjs` (giữ nguyên).
- App Next.js 16 xuất tĩnh: `code/app`, `code/components`, `code/lib` (logic thuần, kèm unit test `*.test.ts`).
- Pipeline nội dung: `code/scripts/` (Node + Python; Python chạy bằng `code/scripts/.venv`).
- Deploy: chỉ dùng `npm run deploy` (= `code/scripts/deploy.sh`), đọc `code/DEPLOY.md` trước (chi tiết ở `code/CLAUDE.md`).

## Lệnh (chạy trong `code/`)

- Kiểm tra toàn bộ sau khi sửa: `npm run check` (tsc + eslint + vitest).
- Một test: `npx vitest run lib/<tên>.test.ts`.
- E2E: `npm run test:e2e` (Playwright, thư mục `code/e2e`, cần dev server) — chỉ chạy khi được yêu cầu.

## Tránh

- Dữ liệu lớn: `code/public/data` (6,5k file JSON, có trong git; mỗi bài đọc / truyện một file `readings|stories/<id>.json`), `code/public/audio`, `code/scripts/tatoeba`, `code/scripts/out`, `code/out`, `code/.next`.
- Tìm code thì giới hạn thư mục: `rg -n 'X' code/app code/components code/lib code/scripts`.
- File JSON dữ liệu: dùng `jq` lấy đúng phần cần, không Read cả file.
