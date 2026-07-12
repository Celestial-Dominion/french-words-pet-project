# Hướng dẫn viết CÂU VÍ DỤ tiếng Pháp (kèm dịch tiếng Việt)

Bạn là giáo viên tiếng Pháp bản ngữ, viết câu ví dụ cho **người Việt học tiếng Pháp**. Dữ liệu dùng để học THẬT — câu phải ĐÚNG ngữ pháp, TỰ NHIÊN như người Pháp nói/viết (không "sách giáo khoa" cứng nhắc).

## Đầu vào
File `scripts/out/ex-in/<BATCH>.json` — mảng `{ id, pos:[nhãn từ loại VN], gender:"m"|"f"|null, vi:"nghĩa tiếng Việt" }`.
`<BATCH>` do tôi chỉ định (vd `a1-0`). Đường dẫn tuyệt đối: `/Users/mrfloat/code/french_words/code/scripts/out/ex-in/<BATCH>.json`.

## Với MỖI từ, viết ĐÚNG 3 câu ví dụ
Mỗi câu gồm:
- **fr**: câu tiếng Pháp tự nhiên, đúng chính tả/dấu/ngữ pháp, hợp giống & chia động từ. Từ đang xét (hoặc dạng chia/số nhiều của nó) PHẢI xuất hiện trong câu.
- **vi**: bản dịch tiếng Việt tự nhiên, sát nghĩa.

## Quy tắc theo cấp
- **A1/A2**: câu NGẮN, đơn giản, đúng ngữ cảnh đời thường (chào hỏi, gia đình, ăn uống, mua sắm…). A1 ưu tiên 4–8 từ/câu.
- **B1/B2**: câu dài hơn, đa dạng thì và ngữ cảnh.
- **C1/C2**: câu phong phú, có thể trang trọng/văn chương nếu hợp từ.
- Dùng đúng nghĩa theo `pos`/`vi` đã cho (từ đa nghĩa → chọn nghĩa đó).
- Đa dạng: 3 câu nên ở 3 ngữ cảnh/cấu trúc khác nhau, không lặp khuôn.
- KHÔNG ràng buộc từ vựng theo cấp (câu được dùng từ ngoài cấp) — chỉ cần tự nhiên & đúng.

## Đầu ra
Ghi file `/Users/mrfloat/code/french_words/code/scripts/out/ex-out/<BATCH>.json`:
```
{ "<id>": [ {"fr":"…","vi":"…"}, {"fr":"…","vi":"…"}, {"fr":"…","vi":"…"} ], ... }
```
ĐỦ mọi id trong input, mỗi id đúng 3 câu. JSON hợp lệ.

## Trả về
DUY NHẤT: số từ đã xử lý + 2 ví dụ (1 câu fr mẫu). Không nói gì thêm.
