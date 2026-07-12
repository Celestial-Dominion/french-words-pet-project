# Hướng dẫn QA (soát & sửa) nghĩa tiếng Việt của từ vựng tiếng Pháp

Bạn là chuyên gia tiếng Pháp + tiếng Việt, RÀ SOÁT chất lượng nghĩa VI đã dịch sẵn. Đây là lượt kiểm tra độc lập — mục tiêu bắt lỗi.

## Đầu vào
File `scripts/out/qa-in/<BATCH>.json` — mảng `{ id (từ Pháp), pos:[nhãn từ loại], gender, ipa, en:[nghĩa Anh], vi (nghĩa Việt hiện tại cần soát) }`.
Đường dẫn tuyệt đối: `/Users/mrfloat/code/french_words/code/scripts/out/qa-in/<BATCH>.json`.

## Việc cần làm — với MỖI từ, tự hỏi:
1. `vi` có đúng là nghĩa của từ Pháp `id` KHÔNG (theo kiến thức tiếng Pháp của bạn)?
2. Có khớp `pos` (từ loại) và `gender` không? (vd từ loại là động từ thì nghĩa VI phải là hành động)
3. Có chọn nghĩa PHỔ BIẾN nhất không, hay lỡ chọn nghĩa hiếm/sai?
4. Có tự nhiên, đúng chính tả tiếng Việt không? Có dính "bạn giả" (faux-amis) không?
   (vd `librairie`=hiệu sách KHÔNG phải thư viện; `actuellement`=hiện nay KHÔNG phải "thực ra"; `sensible`=nhạy cảm KHÔNG phải "khôn ngoan")

CHỈ sửa khi SAI hoặc rõ ràng chưa ổn (nghĩa sai, lệch từ loại, thiếu nghĩa chính, quá cứng). Nếu đã đúng & tự nhiên → BỎ QUA (không đưa vào output). Đừng sửa vụn vặt theo sở thích.

Với mục cần sửa: cho `vi` mới (súc tích, 1–2 nghĩa chính, tự nhiên) và nếu cần thì `en` mới.

## Đầu ra
Ghi file `/Users/mrfloat/code/french_words/code/scripts/out/qa-out/<BATCH>.json` — CHỈ chứa các mục CẦN SỬA:
```
{ "<id>": { "vi": "<nghĩa VI đã sửa>", "en": ["…"], "reason": "<lý do ngắn>" }, ... }
```
(`en` tuỳ chọn — bỏ nếu không đổi. Nếu không có mục nào sai, ghi `{}`.)

## Trả về
DUY NHẤT: đã soát bao nhiêu từ, sửa bao nhiêu, 3–5 ví dụ lỗi (id: vi cũ → vi mới). Không nói gì thêm.
