# Bài đọc lấp từ thiếu B1–C2 (chuẩn chung)

Mục tiêu: nâng độ phủ từ vựng (từ của cấp gặp trong ≥ 1 bài) lên gần mục tiêu app Anh. Bài đã có nhắm mật độ chứ
không nhắm từ, nên 50 bài gần nhất mỗi cấp chỉ thêm 0,5–2,2 từ mới/bài. Đợt này **mỗi bài viết quanh một giỏ 14 từ
chưa gặp bài nào**, phần lớn là từ đời thường, khẩu ngữ, đồ vật.

| Cấp | Phủ ≥1 (15/10/2026) | Mục tiêu | Giỏ | Cần làm |
|---|---|---|---|---|
| B1 | 62,1% | 96% | 53 | cả 53 (6 lô) |
| B2 | 51,0% | 90% | 87 | cả 87 (9 lô) |
| C1 | 42,2% | 87% | 123 | cả 123 (13 lô) |
| C2 | 59,3% | 70% | 44 | ~16 giỏ đầu (2 lô) là đạt |

Thứ tự: B1 → B2 → C1 → C2. Mỗi lô 10 bài. Sau mỗi lô ghi hạn mức tuần đã dùng; **dừng khi hạn mức tuần ≥ 85%**.

## Danh sách chuẩn (dùng chung)

- `plan/gap-banks/<cấp>.txt`: mỗi dòng một giỏ = một bài, gồm `mã · chủ đề gợi ý (topic) · từ(nghĩa) …`.
  Sinh một lần bằng `node scripts/content-kit.mjs banks <cấp> --size 14 --write`, **giữ cố định, không sinh lại**
  (sinh lại sẽ đảo thứ tự giỏ). Chủ đề chỉ là gợi ý, đoán theo nghĩa tiếng Anh; nhiều giỏ là "tự chọn chủ đề".
- Từ đích đã lọc (`isTarget` trong `scripts/lib/fr-vocab.mjs`): bỏ chữ cái đơn, viết tắt (etc, mlle, mme) và từ tục.
  Từ lóng/thân mật (nana, marrant, taule, bagarre) vẫn giữ: hợp với lời thoại trong truyện.
- Cuối mỗi cấp: gom các từ bị bỏ qua thành giỏ "vét" nếu độ phủ còn thiếu.

## Quy tắc mỗi bài

- File `code/content/readings/<cấp>/<cấp>-gNN.txt` (lô NN, 10 bài, giỏ (NN−1)·10+1 … NN·10). Câu hỏi:
  `code/content/quiz/<cấp>/<cấp>-gNN.txt`. ID `rd-<cấp>-<slug>`, tiêu đề duy nhất toàn thư viện.
- Ngay dưới `=== id` ghi dòng `// giỏ b1-g001`. Kiểm bằng `node scripts/content-kit.mjs bankcheck <cấp>-gNN`:
  **dùng ≥ 10/14 từ của giỏ** (dạng biến hình được), tự nhiên, không nhồi. Từ quá gượng thì bỏ.
- Độ dài, câu TB, mật độ, vượt cấp theo `SPEC` (`scripts/lib/content-spec.mjs`). B1 180–320 chữ, B2 250–450,
  C1 350–650, C2 450–800.
- Thể loại: ưu tiên narrative, letter, interview (thoại), description, how-to, news, opinion; xoay vòng, không quá
  3 bài cùng thể loại một lô. Có thể kể về cùng một nhóm nhân vật (dưới).
- Từ ngoài giỏ chưa chắc cấp thì tra `node scripts/content-kit.mjs lv w1 w2 …` trước khi viết. Tên riêng khai
  `names:`; từ ngoài từ điển phải diễn đạt lại hoặc khai `gloss:`.
- Câu hỏi: 4 câu/bài, `> Bài đọc: «trích nguyên văn»` (không lồng « »). Đáp án đúng < 1,3 lần phương án sai
  dài nhất. Chỉ dùng từ trong từ điển hoặc names/gloss của bài. Tiếng Việt có dấu đầy đủ.

## Nhân vật dùng chung (tuỳ chọn, cho truyện / thư / thoại)

- Gia đình Moreau ở Lyon (khu Croix-Rousse): Julien (42, thợ sửa ống nước), Claire (40, y tá bệnh viện), Léa (16,
  học sinh), Tom (10), chó Filou.
- Bà Josette (75, mẹ Julien) sống ở làng Saint-Martin, Ardèche: vườn rau, gà, chợ phiên thứ Bảy.
- Hàng xóm: ông Bernard Petit (68, thợ in về hưu, hay càu nhàu), cô Amina Diallo (35, chủ tiệm bánh « Le Fournil »).
- Bạn Léa: Inès, Hugo. Đồng nghiệp Claire: bác sĩ Karim Benali.

## Quy trình một lô

1. Đọc 10 dòng giỏ của lô trong `plan/gap-banks/<cấp>.txt`.
2. Viết 10 bài vào `<cấp>-gNN.txt` (có dòng `// giỏ`), chạy
   `node --no-warnings scripts/check-content.mjs --level <cấp> --draft` và `bankcheck`.
3. Viết 40 câu hỏi, rồi kiểm lại không có `--draft`.
4. `npm run content:build` rồi audio (`build-audio.py` bằng venv có edge-tts ≥ 7.3.1, CONC=48), commit, push.
5. Đánh dấu lô [x] dưới đây, ghi số từ mới và hạn mức tuần.

## Tiến độ

- B1: [x] g01 [x] g02 [x] g03 [x] g04 [x] g05 [x] g06 ✓ đạt mục tiêu
  - g01 (15/10/2026): 130/140 từ giỏ, B1 phủ ≥1 62,1% → 69,3%; tốn ~1% hạn mức 5 giờ, hạn mức tuần không đổi (72%).
  - g02: 131/140 từ giỏ, B1 69,3% → 76,0%; ~1% hạn mức 5 giờ, tuần vẫn 72%.
  - g03: 130/140 từ giỏ, B1 76,0% → 82,6%; ~1% hạn mức 5 giờ, tuần vẫn 72%.
  - g04: 132/140 từ giỏ, B1 82,6% → 89,2%; ~1% hạn mức 5 giờ, tuần vẫn 72%.
  - g05: 132/140 từ giỏ, B1 89,2% → 95,6%; tuần vẫn 72%.
  - g06 (3 bài): 41/42 từ giỏ, B1 95,6% → 97,7% (mục tiêu 96% ✓).
- B2: [x] g01 [x] g02 [x] g03 [ ] g04 … g09
  - g01: 138/140 từ giỏ, B2 51,5% → 57,5%; tuần 73%.
  - g02: 136/140 từ giỏ, B2 57,5% → 63,1%.
  - g03: 138/140 từ giỏ, B2 63,1% → 68,6%.
- C1: [ ] g01 … g13
- C2: [ ] g01 [ ] g02
