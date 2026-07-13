# Báo cáo kiểm tra toàn diện — French vs HSK

> Ngày: 13/07/2026 · Phạm vi: (1) khác biệt còn lại so với app HSK, (2) điều tra tốc độ tải, (3) đánh giá độ phù hợp cho người mới bắt đầu học tiếng Pháp.

---

## Tóm tắt cho người bận

1. **Khác biệt còn lại với HSK** tập trung gần như toàn bộ ở **bên trong phiên học/ôn**: HSK có cả một "máy trạng thái học tập" (xem thẻ từ mới trước khi hỏi, ẩn đáp án bắt tự nhớ, học lại trong phiên khi sai, chấm theo tốc độ trả lời, undo, nghỉ giữa chặng, điền từ vào câu, nghe→chọn nghĩa, tổng kết phiên có XP/huy hiệu…). App Pháp mới port phần khung ngoài (giao diện, danh sách, tiến độ, huy hiệu) — phần lõi phiên học vẫn là bản đơn giản.
2. **Tốc độ**: đo thực tế thì app Pháp **nhẹ hơn** HSK cả JS (1,32MB vs 1,44MB) lẫn dữ liệu (21MB vs ~50MB) — bundle và data KHÔNG phải thủ phạm. Nguyên nhân cảm giác chậm: **(a)** Firebase SDK nằm trọn trong first-load và AuthGate chặn render chờ xác thực (cả 2 app đều bị, chi phí lớn nhất); **(b)** điểm khác biệt riêng của app Pháp: **mỗi lần mở app tự chạy đồng bộ ĐỌC TOÀN BỘ + GHI TOÀN BỘ reviews lên Firestore**, trong khi HSK chỉ pull tăng dần phần thay đổi → app Pháp ì hơn đúng lúc đang render.
3. **Cho người mới**: nền tảng nội dung rất ổn (Khóa phát âm 14 bài đầy đủ liaison/nguyên âm mũi/chữ câm + audio thật cho ~11k từ và ~34k câu + bài đọc A1 vừa sức). Lỗ hổng lớn nhất là **luồng học**: người mới bị hỏi trắc nghiệm ngay từ lần đầu thấy từ (không có bước "xem từ + nghĩa + ví dụ" trước), và 30 từ đầu A1 toàn từ chức năng trừu tượng (de, le, la, être…) rất khó học kiểu đoán nghĩa.

---

## Phần 1 — Những gì còn khác app HSK

### Mức CAO — cơ chế học tập trong phiên (thiếu nhiều nhất)

App Pháp: `review-runner.tsx` (~240 dòng, tuyến tính MCQ → sắp xếp câu). HSK: `review-session.tsx` (~1.250 dòng, máy trạng thái `learn → question → answered → arrange → break`). Cụ thể còn thiếu:

| # | Tính năng | HSK làm gì | Trạng thái app Pháp |
|---|-----------|-----------|--------------------|
| 1 | **Bước "learn" cho từ mới** | Hiện từ + nghĩa + ví dụ để ghi nhớ TRƯỚC, rồi mới kiểm tra | Vào thẳng MCQ (lỗ hổng sư phạm lớn nhất — xem Phần 3) |
| 2 | **Recall-first** (ẩn đáp án, tự nhớ trong đầu rồi bấm hiện) | Có gate + nút "Thử nhớ trong đầu" | Config có field `recallFirst` nhưng runner không dùng |
| 3 | **Học lại trong phiên** (requeue) | Sai → chèn lại thẻ sau vài lá để ôn ngay | Sai chỉ đi tiếp, không gặp lại |
| 4 | **Chấm theo tốc độ trả lời** | Suy Lại/Khó/Được/Dễ từ thời gian trả lời → FSRS sát hơn | Chỉ có Đúng/Sai cứng |
| 5 | **Hoàn tác** lần chấm vừa rồi (lỡ bấm nhầm) | Có undo khôi phục lịch FSRS | Không có |
| 6 | **Nghỉ giữa chặng** (sau ~22 thẻ) | Màn nghỉ ☕ | Không có |
| 7 | **Cloze — điền từ vào câu** | 1 trong 4 kiểu câu hỏi | Không có |
| 8 | **Nghe → chọn nghĩa** | Kiểu câu listen (đã sẵn audio) | Không có (dù audio từ đã có đủ) |
| 9 | **Hướng hỏi ngược** (nghĩa → từ) | Setting direction 2 chiều | Config có field nhưng không dùng |
| 10 | **Mẹo nhớ (mnemonic)** tự ghi cho từ hay quên | Ô nhập lưu DB | Không có |
| 11 | **Gợi ý bài đọc sau phiên** ("N từ vừa học có trong bài X") | Có, bắc cầu ôn → đọc | Màn kết chỉ hiện Đúng X/Y |
| 12 | **Tổng kết phiên gamify** (XP kiếm được, lên cấp, huy hiệu mới, combo, thưởng phiên hoàn hảo) | Có đầy đủ | Không có — gamify chỉ tĩnh ở trang Binh nghiệp |

### Mức TRUNG

- **Chặn thoát chưa toàn diện**: app Pháp có modal xác nhận nhưng chưa chặn nút back/refresh/click link giữa phiên (HSK chặn cả `beforeunload` + `popstate` + click capture).
- **Đồng bộ cloud hẹp hơn**: app Pháp chỉ sync reviews + bài đã đọc; HSK sync cả daily-stats, settings, gamify, huy hiệu (kèm version-merge tăng dần).
- **Settings thiếu 2 mục**: `recallFirst` và `direction` có trong type nhưng chưa bày ra (vì engine chưa dùng — gắn với mục #2, #9 ở trên).

### Mức THẤP

- HSK có hub "/doc" gộp bài đọc + truyện; app Pháp tách 2 tab (đã có nút chuyển qua lại — chấp nhận được).
- HSK có TTS liền bài + karaoke theo timing file; app Pháp phát tuần tự từng câu (đánh đổi có chủ đích vì dùng audio thật MP3 — chất lượng âm tốt hơn).
- `components/coming-soon.tsx` không còn nơi nào dùng (nên xoá).
- App Pháp CÓ mà HSK không có (điểm cộng riêng): Khóa phát âm, câu hỏi chọn giống un/une, bảng chia động từ.

---

## Phần 2 — Vì sao "cảm giác" tải chậm hơn HSK

### Số đo thực tế (build production của cả hai)

| Chỉ số | French | HSK | Kết luận |
|--------|-------:|----:|----------|
| JS first-load | **1,32 MB** | 1,44 MB | Pháp NHẸ hơn |
| CSS first-load | **58 KB** | 78 KB | Pháp nhẹ hơn |
| Chunk lớn nhất | 585 KB | 690 KB | Pháp nhẹ hơn |
| Tổng dữ liệu tĩnh | **21 MB** | ~50 MB | Pháp nhẹ hơn nhiều |
| Firebase SDK trong first-load | Có (~800 KB gồm Firestore 227 KB) | Có (y hệt) | Ngang nhau |

→ **Bundle và data không phải thủ phạm.** Nguyên nhân thật, xếp theo tác động:

### #1 (chung cả 2 app) — Firebase chặn đường render
Mỗi lần mở: tải + parse ~1,3MB JS (gồm trọn Firebase SDK import tĩnh) → AuthGate chờ `onAuthStateChanged` (đọc IndexedDB + có thể refresh token qua MẠNG) → mới render nội dung. Trước đó chỉ thấy "Đang tải…".
**Sửa đề xuất**: dynamic-import `firebase/auth` trong useEffect (không import tĩnh); render nội dung ngay, chỉ phủ màn chặn khi biết chắc CHƯA đăng nhập; tách `getFirestore()` khỏi đường auth (gỡ 227KB khỏi critical path). Ước tính gỡ ~800KB khỏi đường tải đầu.

### #2 (RIÊNG app Pháp — khác biệt chính so với HSK) — Full-sync Firestore mỗi lần mở
`auth-sync.tsx` tự chạy `syncNow()` ngay khi phát hiện đăng nhập = `getDocs` **toàn bộ** collection reviews + `writeBatch` **ghi lại toàn bộ** — mỗi lần mở app, kể cả không có gì thay đổi. HSK chỉ pull **tăng dần** (`where("last_review" > cutoff)`) và dynamic-import code sync. Sync chạy nền nhưng ngốn mạng + CPU đúng lúc app đang render → giật, ì, tốn quota.
**Sửa đề xuất**: pull tăng dần theo cutoff như HSK; chỉ ghi phần thay đổi (debounce); hoãn sync sau first paint (`requestIdleCallback`); dynamic-import `lib/sync`.

### #3 (chung) — Service worker network-first cho HTML
Mỗi lần mở phải chờ 1 round-trip lấy HTML dù nội dung không đổi.
**Sửa đề xuất**: chuyển navigation sang stale-while-revalidate (trả HTML cache ngay, cập nhật nền). Lưu ý: `_next/static` + data + audio đã cache-first từ SW v4 (đã sửa đợt trước) — phần này ổn rồi.

### #4 (chung) — Màn Ôn tập nạp file examples lớn
`/on-tap` nạp `examples/{cấp}.json` (tới 1,5MB/cấp) cho MỌI cấp có thẻ đến hạn.
**Sửa đề xuất**: chỉ nạp ví dụ của đúng các từ trong phiên (tách per-word hoặc index offset), hoặc preload nền.

### Việc nên làm ngay theo thứ tự
1. Sửa #2 (sync tăng dần + hoãn sau paint) — tác động riêng lớn nhất, làm app Pháp hết ì hơn HSK.
2. Sửa #1 (dynamic-import Firebase + render lạc quan) — cải thiện cold start cho cả cảm giác lẫn số đo.
3. Sửa #3, #4 — mượt thêm.

---

## Phần 3 — Đánh giá cho người mới bắt đầu (chưa biết tiếng Pháp)

### Điểm mạnh (nền tảng nội dung tốt)

- **Khóa phát âm đầy đủ và đúng lộ trình**: 14 bài từ bảng chữ cái → nguyên âm đơn/ghép → **nguyên âm mũi** → phụ âm đặc biệt → C/G cứng-mềm → **chữ câm cuối từ** → e caduc → H câm → **liaison (nối âm)** → élision → dấu phụ → ngữ điệu → chào hỏi. Có IPA + giải thích tiếng Việt + audio thật (105 file).
- **Audio phủ gần như 100%**: ~11.000 file từ + ~34.000 file câu; danh từ đọc kèm mạo từ ("une école") để học giống qua tai.
- **Câu ví dụ A1 vừa sức** (ngắn, thì hiện tại, đời thường — đã QA 100% A1→C2) và **bài đọc A1 phù hợp** (4–5 câu, chủ đề gần gũi, bấm từ để tra).
- Từ điển chi tiết tốt: nghĩa, IPA, audio, ví dụ, giống, bảng chia động từ.

### Lỗ hổng

**CAO — Học từ mới không có bước "xem trước khi bị hỏi".** Người mới thấy từ Pháp lần ĐẦU TIÊN là bị hỏi MCQ chọn nghĩa ngay → học biến thành đoán mò, dễ nản. HSK có bước "learn card" (hiện từ + nghĩa + ví dụ, bấm "Đã xem — kiểm tra") trước.
→ *Đề xuất:* thêm câu loại `learn` (không chấm) chèn trước MCQ cho mỗi từ mới trong `buildQuestions`.

**CAO/TRUNG — 30 từ đầu A1 toàn từ chức năng trừu tượng** (de, le, la, être, ne, à, un…) do xếp theo tần suất. MCQ "de = của; từ" hay phân biệt le/la/les/l' qua nghĩa tiếng Việt cực khó với người chưa có ngữ pháp.
→ *Đề xuất:* lộ trình khởi động theo chủ đề (chào hỏi, số đếm, gia đình, đồ ăn — từ cụ thể dễ hình dung) trước khi vào danh sách tần suất; từ chức năng dạy qua câu sắp xếp thay vì MCQ nghĩa.

**TRUNG — Trang chủ chưa dẫn người mới tới Khóa phát âm.** Thẻ "Khóa phát âm" vẫn còn trong mục Khám phá, nhưng người `words=0` được hero đẩy thẳng vào "Học từ mới" (= MCQ loạt từ chức năng).
→ *Đề xuất:* khi `words=0`, CTA chính trỏ về `/phat-am`: "Chưa biết đọc tiếng Pháp? Bắt đầu Khóa phát âm →".

**TRUNG — Nghĩa đa nghĩa trong MCQ gây ngợp**: option hiển thị nguyên chuỗi "des = (mạo từ không xác định số nhiều); một số".
→ *Đề xuất:* MCQ chỉ hiện nghĩa chính (trước dấu `;`), nghĩa đầy đủ để ở màn chi tiết.

**THẤP** — Khóa phát âm chưa có tiến độ/quiz phân biệt âm (nghe → chọn an/on/in); câu chọn giống un/une xuất hiện trước khi người mới được dạy khái niệm giống.

### Kết luận phần 3
Nội dung đủ tốt để học nghiêm túc từ con số 0 (đặc biệt phát âm + audio). Cần sửa **luồng học** trước khi app thân thiện thật sự với người mới: (1) learn-card trước MCQ, (2) dẫn người mới qua phát âm + khởi động theo chủ đề, (3) rút gọn nghĩa trong MCQ.

---

## Lộ trình đề xuất (gộp cả 3 phần, theo giá trị/công sức)

| Ưu tiên | Việc | Vì sao |
|---------|------|--------|
| P0 | Sync tăng dần + hoãn sau paint (Perf #2) | Hết ì hơn HSK — khác biệt tốc độ chính |
| P0 | Learn-card trước MCQ cho từ mới (Sư phạm #1) | Lỗ hổng học tập lớn nhất, công nhỏ |
| P1 | Dynamic-import Firebase, render lạc quan (Perf #1) | Cold start nhanh cho mọi lần mở |
| P1 | Requeue khi sai + recall-first + nghỉ giữa chặng (HSK #2,3,6) | Lõi phiên học ngang HSK |
| P1 | CTA người mới → Khóa phát âm (Sư phạm #3) | 1 buổi là xong |
| P2 | Cloze + listen + hướng ngược + chấm theo tốc độ (HSK #4,7,8,9) | Đa dạng câu hỏi, nhớ sâu |
| P2 | Tổng kết phiên gamify + gợi ý bài đọc (HSK #11,12) | Giữ chân người dùng |
| P2 | Rút gọn nghĩa MCQ + lộ trình khởi động theo chủ đề | Thân thiện người mới |
| P3 | Undo, mnemonic, chặn back/refresh, sync gamify/settings, SWR cho HTML, tách examples per-word | Hoàn thiện dần |

---

## Checklist thực hiện (đánh dấu khi xong)

### P0 — làm ngay
- [ ] **R1. Sync Firestore tăng dần**: `syncNow` pull theo cutoff (`where("last_review" > …)`) thay vì đọc toàn bộ; chỉ ghi phần thay đổi (debounce); hoãn sync sau first paint (`requestIdleCallback`); dynamic-import `lib/sync` trong `auth-sync.tsx`.
- [ ] **R2. Learn-card trước MCQ**: thêm loại câu `learn` (không chấm) vào `buildQuestions` khi `isNew` — hiện từ + IPA + nghĩa + 1 ví dụ + audio, nút "Đã xem — Kiểm tra"; render trong `review-runner.tsx`.

### P1 — tuần này
- [ ] **R3. Dynamic-import Firebase**: bỏ import tĩnh `firebase/auth`/`firestore` khỏi first-load (`auth-gate.tsx`, `lib/firebase.ts`); render nội dung lạc quan, chỉ phủ màn chặn khi xác định CHƯA đăng nhập.
- [ ] **R4. Requeue khi sai**: trả lời sai → chèn lại thẻ sau ~3 lá trong phiên (`review-runner.tsx`).
- [ ] **R5. Recall-first**: dùng field `recallFirst` sẵn có — ẩn options, bấm/Space để hiện; bày toggle trong Cài đặt `/on-tap`.
- [ ] **R6. Nghỉ giữa chặng**: màn nghỉ ☕ sau mỗi ~22 thẻ, nút "Ôn tiếp".
- [ ] **R7. CTA người mới**: `words === 0` → hero trỏ `/phat-am` ("Chưa biết đọc tiếng Pháp? Bắt đầu Khóa phát âm →").

### P2 — kế tiếp
- [ ] **R8. Câu hỏi cloze** (điền từ vào câu ví dụ).
- [ ] **R9. Câu hỏi nghe → chọn nghĩa** (dùng audio từ sẵn có).
- [ ] **R10. Hướng hỏi ngược** (nghĩa → từ Pháp) + bày setting `direction`.
- [ ] **R11. Chấm theo tốc độ trả lời** (`ratingFromSpeed`: Lại/Khó/Được/Dễ → FSRS).
- [ ] **R12. Tổng kết phiên gamify**: XP kiếm được, combo, thưởng phiên hoàn hảo, lên cấp, huy hiệu mới mở.
- [ ] **R13. Gợi ý bài đọc sau phiên** ("N từ vừa học có trong bài X").
- [ ] **R14. Rút gọn nghĩa trong MCQ** (chỉ phần trước dấu `;`).
- [ ] **R15. Lộ trình khởi động theo chủ đề** cho người mới (chào hỏi, số đếm, gia đình… trước danh sách tần suất).

### P3 — hoàn thiện dần
- [ ] **R16. Undo lần chấm vừa rồi.**
- [ ] **R17. Mẹo nhớ (mnemonic)** tự ghi cho từ hay quên.
- [ ] **R18. Chặn back/refresh/click-link giữa phiên** (beforeunload + popstate + click capture).
- [ ] **R19. Sync mở rộng**: daily-stats, settings, gamify, huy hiệu (version-merge).
- [ ] **R20. SW: stale-while-revalidate cho HTML** (mở app không chờ mạng).
- [ ] **R21. Tách examples per-word** (màn ôn không nạp cả file cấp).
- [ ] **R22. Quiz phân biệt âm trong Khóa phát âm** + tiến độ bài đã học.
- [ ] **R23. Xoá `components/coming-soon.tsx`** (component chết).
