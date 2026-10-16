# Truyện B1–C2 (chuẩn chung)

Mục tiêu: số truyện mỗi cấp ngang app Anh, mỗi chương có câu hỏi đọc hiểu và audio, đồng thời dùng truyện để
**lặp lại từ** (bài đọc đã phủ ≥1 ~98% nhưng phủ ≥3 còn thấp). Truyện A1–A2 đã xong (14/10/2026), không làm thêm.

## Hiện trạng (16/10/2026) và mục tiêu

| Cấp | Truyện có / app Anh | Cần viết | Lô (6 truyện) | Phủ ≥3 cả thư viện (mt) | ≥5 (mt) | Giờ đọc (mt) | Thiếu ngữ cảnh |
|---|---|---|---|---|---|---|---|
| B1 | 4 cũ / 79 | 75 mới + viết lại 4 | 14 (lô 14: 1 truyện) | 36,8% (70%) | 23,4% (35%) | 13,9 (20) | 1.411 |
| B2 | 4 cũ / 68 | 64 mới + viết lại 4 | 12 (lô 12: 2) | 27,7% (60%) | 17,3% (30%) | 16,4 (20) | 1.866 |
| C1 | 4 cũ / 67 | 63 mới + viết lại 4 | 12 (lô 12: 1) | 23,5% (50%) | 14,8% (25%) | 16,9 (21) | 1.747 |
| C2 | 4 cũ / 49 | 45 mới + viết lại 4 | 9 (lô 9: 1) | 37,0% (35%) ✓ | 23,9% ✓ | 11,5 (13) | 0 |

"Thiếu ngữ cảnh" = tổng số lần từ đích phải gặp thêm (mỗi lần ở một bài/truyện khác) để đạt cả ba mốc ≥1/≥3/≥5
(`content:coverage`). Chia cho số truyện cần viết: B1 ~19, B2 ~29, C1 ~28 lần/truyện. Đó là cỡ giỏ từ dưới đây.
Một truyện là MỘT ngữ cảnh (không tính từng chương), nên dùng một từ nhiều lần trong cùng truyện không tăng phủ.

Kiểm độ phủ: `npm run content:coverage` (cả thư viện) và `npm run content:coverage -- --stories` (chỉ truyện,
kèm số truyện so với app Anh). App Anh, chỉ tính truyện: phủ ≥1 B1 42,7% · B2 39,3% · C1 39,7% · C2 39,4%.

Thứ tự: B1 → B2 → C1 → C2. Sau mỗi lô đo hạn mức tuần (`get_usage`); **dừng khi hạn mức tuần ≥ 90%**, ghi tiến độ,
làm tiếp sau khi hạn mức reset.

## Phần chung (đã có / làm trước)

- **Giỏ từ truyện**: `node scripts/content-kit.mjs sbanks <cấp> <lô> --write` sinh 6 giỏ cho lô từ độ phủ HIỆN TẠI
  (từ gần ngưỡng trước: đang 2 bài → cần 1 để đạt ≥3; đang 4 → ≥5; rồi tới từ thường gặp hơn), có lõi chủ đề, nối
  vào `plan/story-banks/<cấp>.txt` (mã `b1-s01a` … `b1-s01f`). Sinh lúc bắt đầu lô, sau đó giữ cố định.
  Cỡ giỏ: B1 20 · B2 26 · C1 26 · C2 16 từ. Mỗi truyện dùng **≥ 80% giỏ**, rải qua các chương, ưu tiên dạng gốc
  (giống cái/số nhiều của tính từ đôi khi không được nhận). Kiểm: `content-kit.mjs bankcheck <cấp>/st-NN`.
- **Bộ kiểm**: `node --no-warnings scripts/check-content.mjs --level <cấp> --type story [--draft]`. Lô 01 của mỗi cấp
  bật kiểm chặt cho truyện cấp đó (`STRICT.story` trong `scripts/lib/content-spec.mjs`): tên chương "## FR | VI",
  `summary:`, số chương, độ dài, câu TB, mật độ, vượt cấp, 3 câu hỏi/chương.
- **Dựng + audio**: như bài đọc — `npm run content:build`, rồi `build-audio.py` (venv edge-tts ≥ 7.3.1, CONC=48 rồi
  CONC=8 vét lỗi) tới khi "audio thiếu: 0". Audio gồm mọi câu truyện + câu hỏi + phương án.
- **Độ phủ**: `content-coverage.mjs` đếm mỗi truyện một lần (sửa 16/10: trước đó truyện bị đếm hai lần, từ
  `content/` và từ JSON đã dựng). Số mục tiêu truyện: `TARGETS.<cấp>.stories`.

## Chuẩn mỗi truyện (theo `SPEC` trong `scripts/lib/content-spec.mjs`)

| Cấp | Chương | Chữ cả truyện (nhắm) | Câu TB (từ) | Mật độ từ đúng cấp | Câu hỏi ≤ / phương án ≤ | Thì |
|---|---|---|---|---|---|---|
| B1 | 5 | 600–1100 (~800) | 9–16,5 | ≥ 5% | 16 / 13 | passé composé + imparfait (passé simple bị cảnh báo) |
| B2 | 5–6 | 800–1450 (~1050) | 12–20,5 | ≥ 5% | 20 / 16 | tự do |
| C1 | 5–6 | 1000–1800 (~1250) | 15–24,5 | ≥ 4,5% | 24 / 18 | tự do |
| C2 | 5–7 | 1100–2000 (~1300) | 17–28,5 | ≥ 3,5% (nhắm 4%) | 28 / 20 | tự do |

- File: `code/content/stories/<cấp>/st-NN.txt` (lô NN, 6 truyện), câu hỏi `code/content/quiz/<cấp>/st-NN.txt`.
  ID `st-<cấp>-<slug>`; **4 truyện cũ giữ ID** (`b1-story-01` …) để giữ tiến độ "đã đọc" — viết lại trong lô 01
  của cấp, xoá `legacy.txt` (bằng `trash`).
- Đầu truyện:
  ```
  === st-b1-slug
  // giỏ b1-s01a
  title: Tiêu đề FR | Tiêu đề VI        (duy nhất toàn thư viện, mọi cấp, cả bài đọc)
  topic: <TOPICS>
  summary: Tóm tắt tiếng Việt 1–2 câu, không lộ kết.
  names: Tên riêng viết hoa, …
  gloss: từ ngoài từ điển thật cần (≤ 4)
  ## Tên chương FR | VI
  Câu FR | Câu VI          (đoạn cách nhau bằng dòng trống)
  ```
- Nội dung: tự sáng tác (viết tay, không lấy nguồn online). Có thể kể lại tác phẩm phạm vi công cộng (Daudet,
  Maupassant, Verne, Hugo, Mérimée, Zola, Ségur…) tối đa 1 truyện/lô: khai `source:` / `license: public domain` /
  `source-url:` (kiểm URL tồn tại) + thêm tác giả vào dòng ghi công trong `components/settings-panel.tsx`.
- Đa dạng: xoay vòng chủ đề (topic) và kiểu truyện (bí ẩn, phiêu lưu, gia đình, công sở, du lịch, lịch sử, tình
  cảm, hài, xã hội, khoa học viễn tưởng nhẹ); mỗi lô ≥ 4 topic khác nhau. Mở bài và kết bài không lặp khuôn (bộ kiểm
  chặn > 12% truyện cùng kiểu mở/kết). Có thoại, có nút thắt, kết rõ.
- Nhân vật dùng chung của bài đọc (gia đình Moreau, bà Josette…, xem `plan/gap-plan.md`) được phép xuất hiện; có thể
  làm chuỗi truyện `series: <id> <thứ-tự>` nếu một mạch kéo dài 2–3 truyện.
- Câu hỏi: **3 câu/chương**, khối `=== <id> <số chương>`, 4 phương án (1 đúng), `> Trong truyện: «trích nguyên văn»`
  (không lồng « »). Đáp án đúng < 1,3 lần phương án sai dài nhất. Chỉ dùng từ trong từ điển hoặc names/gloss của
  truyện; từ vượt cấp trong câu hỏi phải có trong chương 1..n. Tiếng Việt có dấu đầy đủ.
- Từ chưa chắc cấp: `content-kit.mjs lv w1 w2 …`. Bẫy từ điển đã gặp (ngoài từ điển): ordinal (douzième), plupart,
  tandis, bénévole, narrateur/narratrice, polémique, grillade, éducateur… — xem memory gap-articles.

## Quy trình một lô

1. `node scripts/content-kit.mjs sbanks <cấp> <lô> --write` → 6 giỏ (lô 01: dành 4 giỏ cho 4 truyện cũ viết lại).
2. Viết 6 truyện (2–3 truyện mỗi lần ghi file), mỗi truyện có dòng `// giỏ`. Kiểm `--type story --draft`, `bankcheck`,
   `dens <id>` (độ dài, câu TB, mật độ).
3. Viết câu hỏi (3/chương), kiểm lại không có `--draft`: 0 lỗi, 0 cảnh báo.
4. `npm run content:build`, audio tới "audio thiếu: 0", `content:coverage` (+ `--stories`).
5. Đánh dấu lô dưới đây (số truyện, từ giỏ, phủ ≥3/≥5 trước → sau, hạn mức tuần), commit, push.
6. Hết mỗi cấp: `npm run check`, cập nhật memory. Deploy khi được bảo.

## Tiến độ

- B1: [x] 01 (6 truyện, 120/120 từ giỏ; phủ ≥3 36,8% → 41,0%, ≥5 23,4% → 25,7%, thiếu 1.411 → 1.262) [x] 02 (6, 120/120; ≥3 41,0% → 44,7%, ≥5 25,7% → 28,1%, thiếu 1.121) [x] 03 (6, 120/120; ≥3 44,7% → 48,4%, ≥5 28,1% → 29,9%, thiếu 986) [x] 04 (6, 120/120; ≥3 48,4% → 49,8%, ≥5 29,9% → 31,2%, thiếu 846) [x] 05 (6, 120/120; ≥3 49,8% → 52,0%, ≥5 31,2% → 33,4%, thiếu 708) [x] 06 (6, 120/120; ≥3 52,0% → 53,7%, ≥5 33,4% → 34,6%, thiếu 569) [x] 07 (6, 120/120; ≥3 53,7% → 57,7%, ≥5 34,6% → 35,1% ✓, thiếu 439) [x] 08 (6, 120/120; ≥3 57,7% → 59,7%, ≥5 35,1% → 35,2%, thiếu 312) [x] 09 (6, 120/120; ≥3 59,7% → 64,0%, ≥5 35,2% → 35,3%, thiếu 185) [x] 10 (6, 120/120; ≥3 64,0% → 66,2%, ≥5 35,3% → 35,4%, thiếu 75) [x] 11 (6, 120/120; ≥3 66,2% → 70,2% ✓, ≥5 35,4% → 35,6%, thiếu 0 ✓, giờ đọc 20,5 ✓) [x] 12 (6, 120/120; ≥3 70,2% → 72,8%, ≥5 35,6% → 36,0%, giờ đọc 21,1) [x] 13 (6, 120/120; ≥3 72,8% → 76,3%, ≥5 36,0% → 36,2%, giờ đọc 21,6) [x] 14 (1, 20/20; ≥3 76,3% → 77,2%; B1 đủ 79 truyện ✓, npm run check đạt)
- B2: [x] 01 (4 truyện cũ viết lại + 2 mới, 156/156; bật STRICT.story b2; phủ ≥3 28,8% → 33,8%, ≥5 17,6% → 19,6%, thiếu 1.772 → 1.538) [x] 02 (6, 156/156; ≥3 33,8% → 38,9%, ≥5 19,6% → 21,0%, thiếu 1.342) [x] 03 (6, 156/156; ≥3 38,9% → 43,1%, ≥5 21,0% → 22,9%, thiếu 1.148) [x] 04 (6, 156/156; ≥3 43,1% → 43,7%, ≥5 22,9% → 23,9%, thiếu 970) [ ] 05 [ ] 06 [ ] 07 [ ] 08 [ ] 09 [ ] 10 [ ] 11 [ ] 12
- C1: [ ] 01 [ ] 02 [ ] 03 [ ] 04 [ ] 05 [ ] 06 [ ] 07 [ ] 08 [ ] 09 [ ] 10 [ ] 11 [ ] 12
- C2: [ ] 01 [ ] 02 [ ] 03 [ ] 04 [ ] 05 [ ] 06 [ ] 07 [ ] 08 [ ] 09
