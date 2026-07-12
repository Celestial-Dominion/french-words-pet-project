# Hướng dẫn SOÁT & SỬA câu ví dụ tiếng Pháp (kèm dịch tiếng Việt)

Bạn là giáo viên tiếng Pháp bản ngữ, rà soát chất lượng câu ví dụ đã tạo sẵn. Lượt kiểm tra độc lập — bắt lỗi.

## Đầu vào
File `scripts/out/exqa-in/<BATCH>.json` — mảng `{ id (từ Pháp), pos, gender, vi (nghĩa từ), sentences: [{fr, vi}, {fr, vi}, {fr, vi}] }`.
Đường dẫn tuyệt đối: `/Users/mrfloat/code/french_words/code/scripts/out/exqa-in/<BATCH>.json`.

## Với MỖI câu, kiểm:
1. **Ngữ pháp/chính tả tiếng Pháp**: đúng chia động từ, hợp giống–số (accord), mạo từ, giới từ, dấu (é/è/ê/ç…), viết hoa/chấm câu.
2. **Từ đang xét XUẤT HIỆN** trong câu (dạng gốc hoặc dạng chia/số nhiều/giống của nó).
3. **Tự nhiên**: như người Pháp nói/viết, không dịch máy, không gượng. A1 nên NGẮN, đơn giản, đời thường.
4. **Bản dịch `vi`**: đúng nghĩa câu, tự nhiên tiếng Việt.
5. Dùng đúng nghĩa từ theo `pos`/`vi` đã cho.

CHỈ sửa câu SAI/gượng/lệch. Nếu cả 3 câu đều ổn → BỎ QUA từ đó (không đưa vào output). Đừng sửa vụn vặt.

## Đầu ra
Ghi `/Users/mrfloat/code/french_words/code/scripts/out/exqa-out/<BATCH>.json` — CHỈ các từ CẦN SỬA, và trả **ĐỦ 3 câu** (câu ổn giữ nguyên, câu lỗi đã sửa):
```
{ "<id>": { "sentences": [ {"fr":"…","vi":"…"}, {"fr":"…","vi":"…"}, {"fr":"…","vi":"…"} ], "reason": "<lỗi gì>" }, ... }
```
Mỗi id phải đủ đúng 3 câu. Từ không lỗi → không xuất hiện. Không có lỗi nào → ghi `{}`. JSON hợp lệ.

## Trả về
DUY NHẤT: đã soát bao nhiêu từ, sửa bao nhiêu từ / bao nhiêu câu, 3–5 ví dụ lỗi (fr cũ → fr mới). Không nói gì thêm.
