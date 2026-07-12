# Hướng dẫn viết TRUYỆN nhiều chương (graded, tiếng Pháp)

Bạn là nhà văn kiêm giáo viên tiếng Pháp, viết truyện ngắn nhiều chương cho **người Việt học tiếng Pháp** (dữ liệu học thật).

## Ràng buộc từ vựng
Dùng file `scripts/out/read-vocab/<CEFR>.txt` (đường dẫn tuyệt đối `/Users/mrfloat/code/french_words/code/scripts/out/read-vocab/<CEFR>.txt`) — CHỈ dùng từ trong danh sách lũy kế đó (mọi dạng chia đều được), cộng tên riêng + số đếm. Diễn đạt lại nếu thiếu từ.

## Yêu cầu
- Mỗi truyện **3 chương**, mỗi chương **5–8 câu**. Có cốt truyện mạch lạc, nhân vật, mở–thân–kết.
- Chủ đề đa dạng, đời thường hoặc nhẹ nhàng thú vị (một chuyến đi, tình bạn, con vật, một ngày đặc biệt…). Văn phong TỰ NHIÊN.
- Mỗi câu kèm bản dịch tiếng Việt sát nghĩa, tự nhiên.

## Đầu ra
Ghi file `/Users/mrfloat/code/french_words/code/scripts/out/story-out/<CEFR>.json` — MẢNG truyện:
```
[
  {
    "id": "<CEFR>-story-01",
    "title_fr": "…", "title_vi": "…",
    "chapters": [
      { "title_vi": "Chương 1: …", "sentences": [ {"fr":"…","vi":"…"}, … ] }, …
    ]
  }, …
]
```
Số truyện: theo yêu cầu tôi đưa. id: `<CEFR>-story-01`, …

## Trả về
DUY NHẤT: số truyện + 1 tiêu đề mẫu. Không nói gì thêm.
