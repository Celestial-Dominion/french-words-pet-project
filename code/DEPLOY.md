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
npm run deploy                    # = scripts/deploy.sh: build → kiểm → kế hoạch → tải → kiểm live → lịch sử
SKIP_BUILD=1 scripts/deploy.sh    # dùng out/ vừa build
PLAN=1 scripts/deploy.sh          # build + kế hoạch + số luồng đề xuất rồi DỪNG
RULES=1 scripts/deploy.sh         # deploy cả firestore.rules
CONC=150 scripts/deploy.sh        # ép số luồng tải (4–200)
ACCOUNT=<email> scripts/deploy.sh # chỉ rõ tài khoản Firebase (chạy từ bản sao ở thư mục khác)
scripts/deploy-watch.sh           # theo dõi gọn: mỗi pha + mỗi 5% tải + kết quả kiểm live, tự thoát (0 xong / 1 lỗi)
```

`deploy-watch.sh` dùng cho Monitor của Claude Code (chạy `deploy.sh` nền + `deploy-watch.sh` song song): chỉ đọc log của
lần deploy hiện tại, bỏ qua dòng kiểm rules "compilation errors", thoát 1 nếu `deploy.sh` dừng mà chưa thấy "Deploy complete".

Vì sao nhanh:

- **Mã build băm từ mã nguồn** (`next.config.ts` → `generateBuildId`): chỉ thêm dữ liệu thì mã build không đổi,
  Firebase chỉ tải phần thật sự đổi thay vì toàn bộ HTML.
- **`scripts/out-mtime.py`** đặt lại mtime file trong `out/` chép từ `public/` → cache băm của firebase-tools
  (`.firebase/hosting.*.cache`, khoá theo mtime) không phải băm lại ~1 GB audio mỗi lần.
- **Số luồng tải tự chọn theo kế hoạch** (8 / 32 / 100), AI được ép `CONC=…` — xem mục dưới.
- Build tĩnh chỉ ~12 giây; phần lâu duy nhất là lần đầu tải audio.

Script DỪNG nếu bundle thiếu `authDomain`/API key Firebase (build thiếu `.env.local` vẫn chạy được nhưng mất đồng bộ
mà không báo lỗi).

### Deploy nhanh và an toàn — các bước giữ chất lượng (không được bỏ)

Luôn deploy bằng `scripts/deploy.sh` (lệnh ở trên), không gọi thẳng `firebase deploy`.

1. **Config Firebase trong bundle** — phải có cả authDomain lẫn API key; thiếu là DỪNG.
2. **Giữ mtime** (`scripts/out-mtime.py`) — firebase-tools không phải băm lại audio.
3. **Kế hoạch** (`scripts/deploy-plan.mjs`) — so `out/` với bộ nhớ đệm băm của firebase-tools
   (`.firebase/hosting.b3V0.cache`) đúng cách firebase-tools làm (gzip 9 + sha256) → biết trước số file sẽ tải,
   bao nhiêu MB, bao nhiêu file lớn (≥256 KB), số luồng đề xuất. Danh sách file đổi: `scripts/.deploy-changed.txt`.
4. **Tải** — Firebase chỉ phát hành khi đã tải ĐỦ file; lỗi giữa chừng thì bản live không đổi. Gặp lỗi tải
   (timeout, HTTP 5xx/429…), script tự hạ còn ¼ số luồng (tối thiểu 4) và thử lại MỘT lần; file đã lên server
   được giữ. firebase-tools đôi khi báo "Timed out" SAU khi đã "Deploy complete!" → coi là xong.
5. **Kiểm bản live** (`scripts/deploy-verify.mjs`) — tải về trang chủ, trang Ôn tập và 40 file ngẫu nhiên trong
   số file vừa đổi, so sha256 với `out/`. Lệch là báo ✗.
6. **Ghi lịch sử** vào `.firebase/deploy-history.tsv` (chỉ ở máy deploy, không commit): số luồng, file dự
   kiến/đã tải, MB, file lớn, **thử lại**, **lỗi tải**, **HTTP lỗi**, phút tải, **file/giây**, kết quả, kiểm
   live. Số thử lại/lỗi lấy từ thống kê hàng đợi của firebase-tools (chạy với `DEBUG=true`, nên log có dòng
   debug mở đầu `[2026-…Z]`; `deploy-watch.sh` đã bỏ qua chúng).

### Chọn số luồng — AI được tự cân nhắc

Mục tiêu: tải **nhanh nhất mà không làm tăng thử lại/lỗi**. AI (Claude) được tự chọn `CONC` trong khoảng
4–200 mà không cần hỏi, với điều kiện chạy qua `scripts/deploy.sh` (đủ 6 bước trên) và khi báo user thì nói
rõ số luồng đã chọn + lý do + số liệu cuối (file/giây, thử lại, kiểm live).

**Bước 1 — xem kế hoạch:** `PLAN=1 scripts/deploy.sh` (hoặc đọc phần kế hoạch đầu output khi deploy luôn).
Dòng máy đọc: `PLAN files=… mb=… large=… mp3=… conc=… up=…` (up = Mbps tải lên đo được, 0 = không đo), kèm 5 dòng lịch sử gần nhất.

**Bước 2 — mặc định của script** (đủ tốt cho phần lớn lần deploy):

| Khối lượng sắp tải | Luồng | Vì sao |
|---|---|---|
| > 20 file ≥256 KB (MP3 bài đọc/chương, video mới) | tốc độ tải lên (KB/s) ÷ 150, kẹp 4–100 — script tự đo bằng `networkQuality` (~15 s; `UPLINK_MBPS=…` để khỏi đo; không đo được → 8) | Nghẽn **băng thông** tải lên. firebase-tools cho mỗi file thời gian chờ max(30 s, 20 ms/KB) → mỗi luồng cần ≥ 50 KB/s; chia 150 là chừa gấp 3. App HSK 28/09: 200 luồng trên đường ~5,5 MB/s = 27 KB/s mỗi luồng → quá hạn chờ hàng loạt. Mạng 44–57 Mbps (đo 11/10) → 36–47 luồng; trước đây cố định 8 nên cả phần file nhỏ trong đợt (câu ví dụ, trang, JSON) chỉ chạy ~7 file/giây. |
| ≤ 20 file lớn (chủ yếu trang HTML/RSC, JSON nhỏ, MP3 câu ví dụ ~18 KB) | 100 | Nghẽn ở **độ trễ từng file**, không phải băng thông (app HSK 11/10: 16.575 trang ~200 MB ở 32 luồng mất 13 phút, ~21 file/giây; ở 100 luồng 4 phút, 68 file/giây, thử lại 0,05%, 0 lỗi). |

**Bước 3 — điều chỉnh theo lịch sử** (so với lần trước CÙNG loại khối lượng):

- Thử lại < 1% số file đã tải, lỗi tải 0, HTTP lỗi 0 → được tăng ×1,5 (trần 200) để thăm dò.
- Tăng luồng mà file/giây gần như không tăng → đã chạm trần mạng/server: quay về mức trước.
- Thử lại 1–5% → giữ nguyên.
- Thử lại > 5%, có HTTP 429/503, hoặc dòng "lỗi tải" → lần sau giảm còn ½.
- Dưới ~500 file cần tải → không đáng tối ưu, để mặc định.

firebase-tools mặc định 200 luồng; Firebase không công bố giới hạn — lịch sử đo được là căn cứ duy nhất.

### Khi có sự cố

- **✗ deploy lỗi (bản live chưa đổi)** — chạy lại `SKIP_BUILD=1 CONC=<thấp hơn> scripts/deploy.sh`; chỉ phần
  còn thiếu phải tải.
- **✗ bản live khác out/** — chạy lại `node scripts/deploy-verify.mjs 80`. Vẫn lệch → `SKIP_BUILD=1
  scripts/deploy.sh`. Vẫn lệch nữa → xoá `.firebase/hosting.*.cache` (băm lại toàn bộ) rồi deploy.
- **✗ bundle thiếu config Firebase** — kiểm `.env.local`, build lại. Đừng bao giờ deploy bản này.
- **Đang có việc dở chưa commit** trong thư mục (của mình hoặc phiên khác) — đừng build/deploy từ đó: bản
  build sẽ mang theo phần dở. Muốn thử deploy thì dùng `SKIP_BUILD=1` với `out/` đã kiểm bằng `PLAN=1` là 0 file
  đổi, hoặc chạy từ bản sao ngoài thư mục đang làm (`cp -c -p -R out …`, kèm `firebase.json`, `.firebaserc`,
  `.env.local`, `.firebase/`, `.next/BUILD_ID`, `scripts/`, symlink `node_modules`) với `ACCOUNT=<email>` —
  firebase-tools gắn tài khoản Google theo thư mục, bản sao không biết tài khoản của thư mục gốc
  (`npx firebase login:list`).

## Bản QA tắt đăng nhập

- Dev: `NEXT_PUBLIC_FIREBASE_API_KEY= npx next dev -p 3002` (config `fr-qa` trong `.claude/launch.json`).
- Production: `NEXT_PUBLIC_FIREBASE_API_KEY= npm run build` rồi `npx firebase serve --only hosting --port 5055`
  (áp dụng đủ header/CSP của `firebase.json`). Nhớ build lại bản có Firebase trước khi deploy — deploy.sh tự chặn.

## Khoá tài khoản

`NEXT_PUBLIC_OWNER_UID` (1 hoặc nhiều UID, ngăn cách dấu phẩy) trong `.env.local` + danh sách `allowedUids()` trong
`firestore.rules` phải khớp nhau; đổi xong chạy `RULES=1 scripts/deploy.sh`.
