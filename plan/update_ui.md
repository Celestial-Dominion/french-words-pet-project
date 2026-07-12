# Kế hoạch làm lại giao diện — bám design system app HSK

> Mục tiêu: app tiếng Pháp trông **chỉn chu như app HSK** (`/Users/mrfloat/code/chinese_hsk_words/code`).
> Giữ nguyên toàn bộ chức năng/data đã có (F0–F7), CHỈ thay tầng trình bày (theme + component + layout).
> Không đụng tới scripts dữ liệu, lib/db, lib/srs, lib/gamify (logic), pipeline audio.

---

## 0. Chẩn đoán: vì sao đang "xấu"

| Khía cạnh | App Pháp (hiện tại) | App HSK (chuẩn) |
|---|---|---|
| Màu | Hardcode `blue-600`, `black/5`, `neutral-500` rải rác | **Token semantic oklch**: `primary`, `muted-foreground`, `card`, `border`, `ring`… |
| shadcn | Chưa init, không có primitives | Có `components/ui` (Button…), `shadcn/tailwind.css` |
| Dark mode | `@media prefers-color-scheme` (không đổi được tay) | **Class `.dark` + ThemeToggle + localStorage**, script set trước khi paint |
| Layout | Chỉ `max-w-md`, không header | **Header dính** (logo gradient + nav + toggle) + `max-w-5xl` responsive + BottomNav (mobile) |
| Thẻ/card | Phẳng, viền `black/5`, bo `xl` | `rounded-2xl/3xl`, **nền gradient nhẹ**, shadow, hover `-translate-y-0.5`, active `scale` |
| Trang chủ | Grid cấp trơ | **Hero "Hôm nay"** (ôn/học/streak) + LevelGrid (progress+badge) + "Khám phá" ExploreCards |
| Icon | Emoji 🔊 lẫn lucide | Đồng bộ **lucide-react**, strokeWidth động khi active |
| Font/chữ | `font-size:20px` ép cứng ở body | Token `--font-sans`, cỡ chữ theo thang Tailwind |
| Tra từ | Modal tự chế | Sheet mượt, nút Button chuẩn |

Kết luận: thiếu **design system** (token + primitives) và **khung layout** → nhìn "web thô". Sửa gốc = bê nguyên hệ token + patterns của HSK, đổi màu chủ đạo sang **xanh Pháp**.

---

## 1. Nguyên tắc & màu chủ đạo

- **Bê nguyên hệ token oklch của HSK** (neutral, card, muted, border, ring, radius scale, sidebar, chart) — đã cân chỉnh sáng/tối tốt.
- **Đổi hue primary**: HSK dùng tím-indigo `hue 264`. App Pháp dùng **xanh dương** cho khớp cờ Pháp + branding hiện có (`#1d4ed8`).
  - `--primary` (light): `oklch(0.55 0.20 255)`  · (dark): `oklch(0.65 0.19 255)`
  - `--ring` theo `--primary`. `secondary/muted/accent` giữ hue trung tính ngả xanh nhẹ như HSK.
- Giữ `levelAccent` (đã có ở `lib/levels.ts`: text/bar/grad/badge) — đây chính là cách HSK tô màu theo cấp; chỉ cần dùng nhất quán.
- Font: bỏ `font-size:20px` cứng ở `body`; dùng thang chữ Tailwind như HSK. Giữ stack VN + Latin.

---

## 2. Các bước (UI0 → UI6)

### UI0 · Nền tảng: token + shadcn + dark mode
- Viết lại `app/globals.css` theo HSK: `@import "tailwindcss"`, `tw-animate-css`, `shadcn/tailwind.css`; `@custom-variant dark`; khối `@theme inline` map biến; `:root` + `.dark` token oklch (đổi primary sang xanh).
- `npx shadcn@latest init` (tạo `components.json`), thêm primitives cần dùng: **button, card, sheet, tabs, progress, badge, skeleton**.
- `components/theme-toggle.tsx` (localStorage `fr.theme` + toggle class `.dark`, icon Sun/Moon).
- `app/layout.tsx`: thêm script set `.dark` trước paint; `<body class="bg-background text-foreground">`; `suppressHydrationWarning`.
- DoD: đổi sáng/tối bằng nút chạy mượt, không nhấp nháy; màu chủ đạo xanh.

### UI1 · Khung layout: header + nav responsive
- Header dính (`sticky top-0 backdrop-blur border-b`): logo badge **"Fr"** gradient `from-primary to-primary/70` bo `rounded-xl`, tên app "Từ vựng Pháp"; bên phải ThemeToggle (+ LevelChip nếu muốn). `env(safe-area-inset-top)`.
- `main` container `max-w-3xl`/`max-w-5xl`, `px-4 py-6`, `pb-[calc(5rem+safe-area)]` để chừa BottomNav.
- `components/main-nav.tsx` (desktop, md:block) + giữ `bottom-nav` (mobile) — **restyle bottom-nav theo HSK**: pill nền `bg-primary/15` khi active, icon strokeWidth 2.4, chữ `0.65rem`.
- DoD: có header + nav trên/dưới, responsive điện thoại↔desktop.

### UI2 · Trang chủ (ấn tượng đầu tiên)
- `components/home-stats.tsx` (Hero "Hôm nay"): thẻ lớn `rounded-3xl` gradient `from-primary/15`, icon GraduationCap trong ô `rounded-2xl bg-primary`, hiển thị **"Cần ôn N thẻ" / "Học từ mới" / streak 🔥**, nút chính đổi theo trạng thái (dùng `countDue`, `learnedIds`, `computeStreak` đã có).
- `components/level-grid.tsx`: mỗi cấp = card gradient `a.grad`, badge số cấp `a.badge`, **thanh progress** `a.bar` + `learned/total`, chip "N đến hạn" (dùng `getDdb().reviews` như HSK).
- Mục **"Khám phá"**: ExploreCards (rounded-3xl, gradient tint) cho **Khóa phát âm / Bài đọc / Truyện**.
- Thay `app/page.tsx` hiện tại (banner + grid trơ) bằng bố cục trên.
- DoD: trang chủ có hero + grid tiến độ + khám phá, giống HSK.

### UI3 · Học & Ôn (word-browser, word-detail, review, arrange)
- `word-browser.tsx`: dùng Card + token; ô tìm dùng input shadcn; nút "Học từ mới" = Button primary bo `rounded-2xl`; hàng từ hover/active.
- `word-detail.tsx`: chuyển sang **Sheet** (shadcn) — bo góc trên `rounded-t-3xl`, thanh kéo, tab dùng **Tabs** shadcn; khối giống/số nhiều = Badge; nút audio = Button ghost tròn.
- `review-runner.tsx`: đáp án = Button lớn `rounded-2xl` trạng thái đúng/sai bằng token (emerald/rose giữ, nhưng nền/viền theo card); thanh tiến độ = Progress; màn tổng kết card gradient.
- `sentence-arrange.tsx`: token hoá; token từ = "chip" bo `rounded-xl` bg-secondary; nút Kiểm tra/Tiếp = Button.
- DoD: 3 luồng học nhìn đồng bộ, dùng primitives.

### UI4 · Đọc & Phát âm (reader, story-reader, sentence-block, phonics)
- `sentence-block.tsx`: câu trong card token; từ chạm-tra highlight `hover:bg-primary/10`; nút nghe Button ghost.
- `reader.tsx` / `story-reader.tsx`: header bài dùng token; nút Dịch = Button outline; điều hướng chương = Button.
- `/bai-doc`, `/truyen`: toggle Bài đọc/Truyện dùng Tabs/SegmentedControl; danh sách = Card có badge cấp `a.badge`, dấu ✓ đã đọc.
- `/phat-am`: card bài đánh số badge tròn; mục phát âm = hàng card có nút Volume2.
- DoD: đọc/phát âm gọn gàng, nhất quán token.

### UI5 · Tiến độ & Binh nghiệp
- `/tien-do`: 3 stat card token; thanh theo cấp dùng `a.bar` + `bg-muted`; **heatmap** ô bo `rounded` thang xanh theo `--primary`; thêm skeleton khi tải.
- `/tu-luyen` (Binh nghiệp): thẻ cấp bậc gradient primary; thang cấp bậc dùng token (đạt/hiện tại/khoá); lưới huy hiệu card token, huy hiệu đạt có ring amber.
- DoD: 2 trang gamify trông "thành tựu", hợp theme.

### UI6 · Đánh bóng + kiểm thử
- Rà toàn bộ: bỏ hết màu hardcode còn sót (`neutral-*`, `black/5`, `blue-600`) → token; bo góc & shadow nhất quán; `active:scale`, `transition` cho nút/thẻ; `tabular-nums` cho số; `env(safe-area-inset-*)`.
- `coming-soon.tsx` (nếu còn) token hoá.
- Kiểm tra sáng/tối ở **390px và desktop**; chạy lại **Playwright** (cập nhật selector nếu đổi text); `next build` sạch; console sạch.
- Cập nhật icon PWA nếu muốn (giữ "Fr").
- DoD: đồng bộ 100% token, đẹp cả 2 theme, E2E xanh.

---

## 3. Rủi ro & lưu ý
- **Next 16 + Tailwind 4 + shadcn**: `shadcn init` phải hợp Tailwind v4 (dùng `@import` CSS, không `tailwind.config.js`). Nếu init lỗi, chép trực tiếp `components/ui/*` + `lib/utils` từ app HSK (đã chạy trên đúng stack) rồi chỉnh import.
- **Static export**: mọi thứ vẫn client/tĩnh — ThemeToggle & script pre-paint chạy phía client, OK với `output: export`.
- **E2E**: một số test bám text ("Chọn cấp độ", "Học N từ mới"…). Đổi UI có thể đổi text → cập nhật `e2e/smoke.spec.ts` cho khớp.
- **Không phá data**: chỉ sửa `app/**`, `components/**`, `app/globals.css`, `lib/levels.ts` (màu), `lib/tts`/`lib/data` không đổi. Tiến độ IndexedDB giữ nguyên.
- Có thể tham chiếu trực tiếp file HSK để bê pattern: `app/globals.css`, `app/layout.tsx`, `components/{home-stats,level-grid,bottom-nav,word-detail,review-session,progress-dashboard,theme-toggle}.tsx` — **đọc để học, viết lại cho tiếng Pháp** (không import chéo repo).

---

## 4. Checklist tiến độ (tick khi làm)

Trạng thái tổng: **UI0 ✅ · UI1 ✅ · UI2 ✅ · UI3 ✅ · UI4 ✅ · UI5 ✅ · UI6 ✅ · UI7 ✅ (responsive web+mobile) — XONG**

> **UI7 — bố cục cho CẢ web lẫn mobile:** container `max-w-5xl`; lưới nở nhiều cột ở desktop
> (level-grid + Khám phá + danh sách từ/bài đọc/truyện/phát âm: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`),
> nav tự đổi (desktop = thanh trên MainNav, mobile = BottomNav). Vùng ĐỌC (reader/story) giữ hẹp `max-w-2xl`
> và dashboard (tiến độ/binh nghiệp) `max-w-3xl` cho dễ đọc, không kéo giãn. Verify desktop 1280px + mobile 390px đều ổn; E2E 7/7.

> **Kết quả:** đã bê hệ token oklch + patterns của HSK, đổi màu chủ đạo sang **xanh Pháp** (`oklch(0.55 0.2 255)`).
> Header dính (logo "Fr" gradient) + dark mode class + ThemeToggle; trang chủ hero "Hôm nay" + level-grid progress + ExploreCards; toàn bộ component/màn dùng token (`bg-card`, `text-muted-foreground`, `border`, `primary`…).
> Verify: home + Binh nghiệp đẹp cả sáng/tối ở 390px; **0 màu hardcode** còn sót; **Playwright 7/7 pass**; `next build` sạch.
> KHÔNG cần `@base-ui`/`shadcn` CLI — Button tự viết bằng cva; primitives khác dùng Tailwind token trực tiếp (đúng như HSK vốn cũng chỉ có mỗi button.tsx).

### UI0 · Token + shadcn + dark
- [ ] `globals.css` token oklch (primary xanh) + tw-animate-css + shadcn css + `@custom-variant dark`
- [ ] `shadcn init` + primitives: button, card, sheet, tabs, progress, badge, skeleton
- [ ] `theme-toggle.tsx` + script pre-paint trong `layout.tsx` (localStorage `fr.theme`)
- [ ] Bỏ `font-size:20px` cứng; body dùng token
- 📝 Ghi chú UI0:

### UI1 · Layout + nav
- [ ] Header dính (logo "Fr" gradient + tên + ThemeToggle) + safe-area
- [ ] `main` container responsive `max-w-3xl/5xl` + chừa BottomNav
- [ ] `main-nav.tsx` (desktop) + restyle `bottom-nav.tsx` (pill active bg-primary/15)
- 📝 Ghi chú UI1:

### UI2 · Trang chủ
- [ ] `home-stats.tsx` hero "Hôm nay" (ôn/học/streak) dùng db đã có
- [ ] `level-grid.tsx` card gradient + progress + chip đến hạn
- [ ] "Khám phá" ExploreCards (phát âm / bài đọc / truyện)
- 📝 Ghi chú UI2:

### UI3 · Học & Ôn
- [ ] `word-browser.tsx` token + input + Button
- [ ] `word-detail.tsx` → Sheet + Tabs + Badge
- [ ] `review-runner.tsx` Button đáp án + Progress + card tổng kết
- [ ] `sentence-arrange.tsx` chip token + Button
- 📝 Ghi chú UI3:

### UI4 · Đọc & Phát âm
- [ ] `sentence-block.tsx` token + highlight từ
- [ ] `reader.tsx` / `story-reader.tsx` token + Button điều hướng
- [ ] `/bai-doc` `/truyen` Tabs toggle + Card danh sách
- [ ] `/phat-am` card bài + mục phát âm token
- 📝 Ghi chú UI4:

### UI5 · Tiến độ & Binh nghiệp
- [ ] `/tien-do` stat card + heatmap token + skeleton
- [ ] `/tu-luyen` thẻ cấp bậc + thang + huy hiệu token
- 📝 Ghi chú UI5:

### UI6 · Đánh bóng + kiểm thử
- [ ] Quét sạch màu hardcode → token; bo góc/shadow/transition nhất quán
- [ ] Kiểm sáng/tối ở 390px + desktop
- [ ] Cập nhật `e2e/smoke.spec.ts` + chạy Playwright xanh
- [ ] `next build` sạch, console sạch
- 📝 Ghi chú UI6:
