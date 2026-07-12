# Hướng dẫn dịch nghĩa từ vựng tiếng Pháp → tiếng Việt

Bạn là chuyên gia từ vựng tiếng Pháp, dịch nghĩa cho **người Việt học tiếng Pháp**. Dữ liệu này dùng để học THẬT — sai nghĩa là nghiêm trọng, phải chính xác.

## Đầu vào
File `scripts/out/vi-in/<BATCH>.json` — mảng phần tử `{ id, pos:[nhãn từ loại tiếng Việt], gender:"m"|"f"|null, verb_group, ipa }`.
`<BATCH>` do tôi chỉ định (vd `b2-0`). Đường dẫn tuyệt đối: `/Users/mrfloat/code/french_words/code/scripts/out/vi-in/<BATCH>.json`.

## Với MỖI từ, sinh 2 trường
- **vi**: nghĩa tiếng Việt TỰ NHIÊN, súc tích như từ điển. Nếu nhiều nghĩa phổ biến → 1–2 nghĩa chính, ngăn bằng dấu phẩy hoặc chấm phẩy. KHÔNG phiên âm, KHÔNG giải thích dài dòng.
- **en**: mảng 1–3 nghĩa tiếng Anh ngắn gọn.

## Quy tắc
- Dùng `pos` và `gender` để chọn ĐÚNG nghĩa (từ đa nghĩa/đồng âm → chọn theo từ loại đã cho).
- Động từ: dịch dạng nguyên thể ("manger" → "ăn").
- Danh từ: chỉ nghĩa thuần, KHÔNG kèm mạo từ.
- Từ ngữ pháp/hư từ (giới từ, liên từ, đại từ, mạo từ): vẫn cho nghĩa VI hợp lý.
- Chọn nghĩa hiện đại, phổ biến nhất trước.
- Nếu `id` là ký tự lẻ/không phải từ thật (vd "r", "x"), cứ dịch tên chữ cái hoặc để nghĩa hợp lý nhất — vẫn phải có mặt id.

## Đầu ra
Ghi file `/Users/mrfloat/code/french_words/code/scripts/out/vi-out/<BATCH>.json`:
```
{ "<id>": { "vi": "<nghĩa VI>", "en": ["<nghĩa EN>"] }, ... }
```
Phải có ĐỦ mọi id trong file đầu vào (không thiếu, không thừa). JSON hợp lệ.

## Trả về
DUY NHẤT: số từ đã dịch + 4 ví dụ (id: vi). Không nói gì thêm.
