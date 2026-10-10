# Build & deploy (cách làm của app HSK / app Anh)

App là static export (Next.js `output: "export"` → `out/`) host trên **Firebase Hosting** project `french-pet`.
Firebase chỉ để đăng nhập + đồng bộ; app chạy offline đầy đủ không cần nó.

## Kiểm tra trước khi deploy

```bash
npm run check        # tsc + eslint + vitest (unit: SRS, gamify, gõ chính tả, sync 2 máy…)
npx playwright test  # e2e trên dev server :3000 (tự bỏ cổng đăng nhập khi chạy tự động)
```

Playwright và `next dev` khác KHÔNG chạy song song được trong cùng thư mục (Next khoá `.next/dev`) —
tắt dev server khác trước khi chạy e2e.

## Deploy

```bash
npm run deploy                    # = scripts/deploy.sh: build → kiểm bundle → giữ mtime → deploy hosting
SKIP_BUILD=1 scripts/deploy.sh    # dùng out/ vừa build
RULES=1 scripts/deploy.sh         # deploy cả firestore.rules
CONC=8 scripts/deploy.sh          # ép số luồng tải
tail -f scripts/.deploy.log       # xem tiến độ "uploading new files [x/y]"
scripts/deploy-watch.sh           # theo dõi gọn: in mỗi pha + mỗi 5% tải, tự thoát khi xong (0) / lỗi (1)
```

`deploy-watch.sh` dùng cho Monitor của Claude Code (chạy `deploy.sh` nền + `deploy-watch.sh` song song): chỉ đọc log của
lần deploy hiện tại, bỏ qua dòng kiểm rules "compilation errors", thoát 1 nếu `deploy.sh` dừng mà chưa thấy "Deploy complete".

Vì sao nhanh:

- **Mã build băm từ mã nguồn** (`next.config.ts` → `generateBuildId`): chỉ thêm dữ liệu thì mã build không đổi,
  Firebase chỉ tải phần thật sự đổi thay vì toàn bộ HTML.
- **`scripts/out-mtime.py`** đặt lại mtime file trong `out/` chép từ `public/` → cache băm của firebase-tools
  (`.firebase/hosting.*.cache`, khoá theo mtime) không phải băm lại ~1 GB audio mỗi lần.
- **Số luồng tải tự chọn**: >100 MP3 mới từ lần deploy trước → 8 luồng (file to dễ quá giờ chờ), còn lại 32.
- Build tĩnh chỉ ~12 giây; phần lâu duy nhất là lần đầu tải audio.

Script DỪNG nếu bundle thiếu `authDomain`/API key Firebase (build thiếu `.env.local` vẫn chạy được nhưng mất đồng bộ
mà không báo lỗi).

## Bản QA tắt đăng nhập

- Dev: `NEXT_PUBLIC_FIREBASE_API_KEY= npx next dev -p 3002` (config `fr-qa` trong `.claude/launch.json`).
- Production: `NEXT_PUBLIC_FIREBASE_API_KEY= npm run build` rồi `npx firebase serve --only hosting --port 5055`
  (áp dụng đủ header/CSP của `firebase.json`). Nhớ build lại bản có Firebase trước khi deploy — deploy.sh tự chặn.

## Khoá tài khoản

`NEXT_PUBLIC_OWNER_UID` (1 hoặc nhiều UID, ngăn cách dấu phẩy) trong `.env.local` + danh sách `allowedUids()` trong
`firestore.rules` phải khớp nhau; đổi xong chạy `RULES=1 scripts/deploy.sh`.
