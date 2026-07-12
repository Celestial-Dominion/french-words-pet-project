# Kế hoạch xây dựng web học từ vựng tiếng Pháp (build từ đầu, tham chiếu app HSK)

> Xây một web **riêng** học từ vựng tiếng Pháp, **viết mới từ đầu** — KHÔNG copy code app HSK.
> App HSK hiện tại (`/Users/mrfloat/code/chinese_hsk_words/code`) chỉ dùng làm **bản tham chiếu kiến trúc**:
> học lại các quyết định đã được kiểm chứng (offline-first, SRS chặt, pipeline audio…) rồi **dựng lại sạch**
> cho tiếng Pháp, bỏ hẳn mọi thứ đặc thù tiếng Trung ngay từ khâu thiết kế (không có gì để "gỡ").
>
> Người học: **người Việt, chưa học tiếng Pháp bao giờ**, biết tiếng Anh và chút tiếng Trung
> → lộ trình đi **từ vỡ lòng (A1) đến nâng cao (C1/C2)**, có phần **phát âm nền tảng** trước khi học từ.
> Nghĩa chính bằng **tiếng Việt**, kèm nghĩa tiếng Anh phụ (user đọc tốt tiếng Anh — giữ trường `meaning_en`).

---

## 0. Kiến trúc tham chiếu từ app HSK (dựng lại từ đầu, không copy)

App HSK (đã chạy ổn định) là bằng chứng các quyết định dưới đây đúng — app Pháp **viết mới** nhưng theo
cùng nguyên tắc. Cột "Cách làm cho app Pháp" = ta tự code lại, không bê file.

| Tầng | Quyết định đã kiểm chứng ở HSK | Cách làm cho app Pháp (viết mới) |
|---|---|---|
| Frontend | Next.js static export + Tailwind + shadcn | Scaffold Next.js mới, cùng stack, branding Pháp |
| Trạng thái học | IndexedDB là nguồn sự thật (offline-first, PWA) | Tự viết `lib/db.ts` theo cùng mô hình |
| SRS | `ts-fsrs`, lịch **CHẶT**: `request_retention 0.97`, `maximum_interval 120d`, learning steps phút→giờ→12h | Dùng lại **đúng bộ tham số** (đã tinh chỉnh cho người hay quên) — không nới lỏng |
| Ôn tập | **Chỉ trắc nghiệm** (choice-only, chấm tự động) + bài "sắp xếp câu" mặc định **1 câu/từ** (cấu hình 0–5) | Viết mới theo cùng cơ chế; sắp xếp câu hợp tiếng Pháp (trật tự từ quan trọng) |
| Học vs Ôn | **Tách riêng**: Ôn tập = chỉ từ đến hạn; Học từ mới = chỉ từ mới | Giữ nguyên tắc khi thiết kế luồng |
| Gamification | XP (+3/+5/+2) + 30 cảnh giới tu tiên + 135 huy hiệu (`gamify.ts` thuần + `gamify-db.ts`) | Viết lại logic tương đương; **theme cảnh giới → cấp bậc quân đội Pháp** (mục 3.5) |
| Âm thanh | **100% MP3 tải sẵn** bằng edge-tts (từ / câu / bài đọc / truyện), online TTS chỉ fallback | Dựng lại pipeline, giọng `fr-FR-*` |
| Đồng bộ | Firebase Auth + Firestore chỉ sync tiến độ; **không backend, không secret phía client** | Viết lại `lib/sync*.ts`, tạo Firebase project mới |
| UI | Mobile-first, bottom tab bar, font hệ thống, chữ to (20/21px) | Dựng lại; stack font **VN + Latin** (không CJK) |
| Nội dung | Văn phong **tự nhiên bản ngữ**, không "sách giáo khoa" | Giữ nguyên tắc cho truyện/bài đọc Pháp |

### KHÔNG dựng (đặc thù tiếng Trung — vì viết mới nên đơn giản là không tồn tại)
- Không có **giản thể ⇄ phồn thể** (script-mode).
- Không có **Pinyin / âm Hán–Việt** → thay bằng **IPA + audio**.
- Không có **chiết tự** và **thứ tự nét / tập viết** (hanzi-writer) — không có khái niệm tương đương.
- Không có **tách từ** kiểu Trung — tiếng Pháp tách bằng khoảng trắng, nhưng cần **lemma hoá** (mục 3.4).

### Dựng mới (đặc thù tiếng Pháp)
1. **Khóa phát âm nền tảng** (vì user chưa biết gì): bảng chữ cái, quy tắc đọc chữ→âm (khá đều đặn),
   âm mũi (an/on/in/un), chữ câm cuối từ, **liaison/enchaînement**, elision (l', j', d').
   Dạng bài học ngắn có audio, route `/phat-am`, học TRƯỚC khi vào từ vựng A1.
2. **Giống từ (le/la)** — hiển thị mạo từ kèm danh từ ở mọi nơi; giống là một phần đáp án khi ôn.
3. **Chia động từ** — panel trong word-detail: nhóm 1/2/3, bảng chia các thì cốt lõi
   (présent, passé composé, imparfait, futur), đánh dấu bất quy tắc.
4. **Dạng biến hình → lemma** cho reader bấm-tra (mục 3.4): `mangeons` → `manger`.

---

## 1. Nguồn từ vựng (TRỌNG TÂM) — đi từ cơ bản đến nâng cao

Tiếng Pháp **không có chuẩn từ vựng chính thức kiểu HSK** (danh mục CEFR của France Éducation
International không phát hành dạng máy đọc được). Giải pháp: **tự dựng bộ cấp độ theo CEFR** bằng cách
trộn các nguồn mở, rồi tinh chỉnh bằng agent (đúng pattern nghĩa VI + ví dụ đã dùng cho HSK).

### 1.1. Nguồn dữ liệu

| Nguồn | Cung cấp | Vai trò |
|---|---|---|
| **Lexique 3.83** (lexique.org, mở) | ~140k dạng từ: lemma, tần suất phim + sách, từ loại, **giống**, số nhiều | **Xương sống**: tần suất + hình thái + map dạng→lemma |
| **FLELex** (CENTAL/UCLouvain) | Phân bố **cấp CEFR** của từ theo giáo trình FLE thực tế | Gán cấp A1–C1 (đối chiếu, không lệ thuộc) |
| **FrequencyWords / OpenSubtitles 2018** (Hermit Dave, CC-BY-SA) | Tần suất khẩu ngữ | Đối trọng với Lexique (ưu tiên văn nói) |
| **kaikki.org (Wiktextract, CC BY-SA)** | JSON tiếng Pháp: **IPA**, giống, nghĩa EN, **bảng chia động từ**, số nhiều bất quy tắc | Nguồn IPA + nghĩa EN + conjugation |
| **Français fondamental** (~1.445 từ, kinh điển) | Lõi từ sơ cấp đã kiểm chứng sư phạm | Sanity-check cho A1/A2 |

> Nghĩa **tiếng Việt**: không có nguồn mở chất lượng → sinh bằng agent từ nghĩa EN + ngữ cảnh, QA như đã
> làm với HSK (agent dịch → agent soát). Đây là việc tốn công nhất của Phase 1.

### 1.2. Chia cấp đề xuất (`lib/levels.ts`)

| Cấp | Nhãn UI | Số từ | Tương đương | Tiêu chí chọn |
|---|---|---|---|---|
| 1 | A1 · Vỡ lòng | ~800 | DELF A1 | Français fondamental ∩ top tần suất + bộ chủ đề bắt buộc (số đếm, chào hỏi, gia đình, ăn uống, thời gian, đại từ, ~60 động từ lõi être/avoir/aller/faire…) |
| 2 | A2 · Sơ cấp | ~1.200 | DELF A2 | FLELex A2 + top tần suất tiếp theo |
| 3 | B1 · Trung cấp | ~2.000 | DELF B1 | FLELex B1 + tần suất |
| 4 | B2 · Trung cao | ~2.500 | DELF B2 | FLELex B2 + tần suất |
| 5 | C1 · Cao cấp | ~3.000 | DALF C1 | FLELex C1 + tần suất sách |
| 6 | C2 · Nâng cao | ~1.500 | DALF C2 / mở rộng | Phần còn lại của top ~11k lemma hữu dụng |

Tổng **~11.000 từ** — cùng cỡ 10.969 từ của app HSK, mọi giả định về hiệu năng/kích thước dữ liệu giữ nguyên.

**Quy tắc gán cấp** (script `build-level-assign.mjs` + agent duyệt tay phần biên):
1. Đơn vị là **lemma** (không phải dạng chia). Mỗi lemma xuất hiện đúng 1 cấp.
2. Ưu tiên: chủ đề bắt buộc A1 → FLELex (nếu ≥2 giáo trình đồng thuận) → xếp theo tần suất trộn
   (0.6 × phim/phụ đề + 0.4 × sách) vào cấp còn chỗ.
3. Từ đa nghĩa xếp theo nghĩa phổ biến nhất; nghĩa nâng cao ghi trong `meanings` chứ không tách thẻ.
4. Validate: từ cấp N không được "cơ bản hơn" đại trà cấp N-1 (kiểm tra bằng percentile tần suất, cảnh
   báo lệch >2 band để duyệt tay).

### 1.3. Schema `Word` (`lib/types.ts`)

```ts
export interface Word {
  id: string;            // lemma, NFC (vd "manger", "école")
  ipa: string;           // /ekɔl/
  gender?: "m" | "f";    // danh từ; hiển thị "une école (f)"
  plural?: string;       // chỉ khi bất quy tắc (travail→travaux)
  pos: string[];         // n, v, adj, adv, prep…  (map lib/pos.ts)
  verb_group?: 1 | 2 | 3;
  meaning_vi: string;
  meaning_en: string[];
  level: number;         // 1..6 = A1..C2
  frequency: number;     // hạng tần suất trộn
  forms?: string[];      // các dạng chia/biến hình để tra ngược (sinh từ Lexique)
  search: string;        // chuỗi bỏ dấu ("école"→"ecole") để gõ không dấu vẫn tìm được
}
```

Không có các trường đặc thù Trung (`simplified/traditional/pinyin/pinyin_search/hanviet/classifiers`) —
vì viết mới nên schema sạch từ đầu.

---

## 2. Kiến trúc dữ liệu tĩnh (`public/data/`)

```
public/data/
  words/a1.json … c2.json      # theo cấp, format Word
  words-index.json             # id -> [ipa, meaning_vi]
  word-levels.json             # id -> level
  lemma-map.json               # dạng biến hình -> lemma ("suis"->"être", "l'"->"le"…)
  conjugations/{lemma}.json    # bảng chia động từ (từ kaikki), lazy-load trong word-detail
  examples/…                   # 2+ câu/từ: { wordId, fr, vi }
  readings/… + readings-index  # bài đọc ngắn theo cấp
  stories/…  + stories-index   # truyện dài nhiều chương (route /truyen)
public/audio/
  words/{slug}.mp3             # slug ASCII hoá ("école"→"ecole-<hash4>" khi trùng)
  sentences/{hash}.mp3         # đặt tên theo hash câu (tránh vấn đề dấu/độ dài)
  passages/…
```

> **Lưu ý filename ngay từ đầu**: id tiếng Pháp có dấu (é, à, œ) — KHÔNG dùng thẳng làm tên file.
> Viết `lib/slug.ts` (bỏ dấu + hash chống trùng) dùng chung cho build script và `lib/tts.ts` ngay từ F0.
> (Bài học từ app HSK: từng dùng thẳng chữ Hán làm tên file, gây rắc rối — làm đúng ngay lần này.)

### 2.1. Âm thanh — edge-tts giọng Pháp
- **Một giọng duy nhất**: **`fr-FR-DeniseNeural`** (nữ, rõ, tự nhiên) — thống nhất toàn app, không giọng phụ
  (bài học từ app HSK: từng bị 2 engine khác nhau, phải build lại toàn bộ — làm đúng ngay từ đầu).
- Viết mới các script `build-word-audio.py` / `build-sentence-audio.py` / `build-passage-audio.py`
  theo cùng ý tưởng (resume được), voice `fr-FR-DeniseNeural`, đặt tên qua `slug.ts`/hash.
- Ước lượng: ~11k từ + ~33k câu (3 câu/từ) + passages ≈ lớn hơn HSK (~1.3GB/66k file) một chút → hosting tĩnh vẫn chịu được.
- Danh từ đọc **kèm mạo từ** ("une école") để học giống qua tai — sinh audio theo chuỗi hiển thị.

### 2.2. Câu ví dụ
- **3 câu/từ** (tối thiểu 3, ngữ cảnh phong phú để ghi nhớ tốt), sinh bằng agent theo pipeline `build-examples.mjs` (viết mới).
- QA = ngữ pháp / tự nhiên / bản dịch Việt — **KHÔNG ràng buộc từ vựng theo cấp** (chỉ truyện mới ràng buộc).

### 2.3. Bài đọc & truyện (graded readers)
- Ràng buộc **từ vựng lũy kế theo cấp**, validator chạy trên **lemma** (qua `lemma-map.json`) chứ không
  trên dạng mặt chữ.
- Văn phong tự nhiên, chủ đề đa dạng (giữ nguyên tắc ~25 chủ đề của truyện HSK).
- A1 cần bài đọc CỰC ngắn (3–5 câu) vì người học từ số 0 — khác HSK (chỉ từ HSK3 mới có truyện).

---

## 3. Các module cần build (viết mới, tham chiếu thiết kế HSK)

### 3.1. Dựng lại gần như y hệt HSK (cùng logic, chỉ đổi type Pháp)
`lib/db.ts`, `lib/srs.ts` (config chặt như HSK), `lib/gamify.ts` + `gamify-db.ts` (bảng cấp bậc mới —
mục 3.5), `lib/sync*.ts`, `lib/reading-progress.ts`, các component `review-*`, `sentence-arrange`,
`bottom-nav`, `level-grid`, `progress-dashboard`, `tu-luyen`, PWA/service worker, theme, auth-gate.
→ Đọc bản HSK làm mẫu, viết lại sạch (không import chéo repo).

### 3.2. Viết theo đặc thù Pháp (khác HSK)
- `lib/types.ts`, `lib/levels.ts` (6 cấp A1–C2 + màu), `lib/pos.ts` (từ loại Pháp), `lib/data.ts`,
  `lib/tts.ts` (slug + thư mục audio mới), `lib/slug.ts` (mới).
- `word-detail.tsx`: **tab chia động từ** (nếu verb) + khối giống/số nhiều (nếu noun); ví dụ + audio +
  bài đọc chứa từ (`word-occurrences`). Không có tab chiết tự/tập viết.
- `word-browser.tsx`: cột IPA thay pinyin; search bỏ dấu.
- Trắc nghiệm ôn tập: thêm dạng câu hỏi **chọn giống đúng** (un/une) cho danh từ, tỉ trọng thấp.
- `reader.tsx`/`story-reader.tsx`: token = từ tách khoảng trắng; bấm-tra qua `lemma-map.json`
  (xử lý elision `l'école`, mạo từ rút gọn `au/du/aux/des`, cụm cố định `est-ce que`, `il y a`).

### 3.3. Routes (tiếng Việt, thêm 1 route mới)
`/hoc/[level]`, `/on-tap`, `/bai-doc`, `/truyen`, `/tien-do`, `/tu-luyen` +
**`/phat-am`** (khóa phát âm nền tảng, mục 0).

### 3.4. `lemma-map.json` — thay vai trò tokenize.ts của HSK
Sinh từ Lexique 3.83 (có sẵn cột dạng→lemma), lọc về các lemma trong bộ từ. Ước lượng ~60–80k entry
(mọi dạng chia của 11k lemma) → tách theo chữ cái đầu nếu file quá lớn, lazy-load.

### 3.5. Gamification — theme cấp bậc quân đội Pháp
Viết lại logic `gamify.ts` (XP, huy hiệu, thăng cấp theo **số từ đã học**) tương đương HSK, chỉ thay
danh sách 30 cảnh giới tu tiên bằng **21 cấp bậc Lục quân Pháp**, thấp → cao (giãn ngưỡng số từ trên
thang ~11k cho khớp 21 mốc):

1. Soldat (Binh nhì) → 2. Soldat de 1re classe (Binh nhất) → 3. Caporal (Hạ sĩ) →
4. Caporal-chef (Hạ sĩ nhất) → 5. Sergent (Trung sĩ) → 6. Sergent-chef (Trung sĩ nhất) →
7. Adjudant (Thượng sĩ) → 8. Adjudant-chef (Thượng sĩ nhất) → 9. Major (Thượng sĩ trưởng) →
10. Aspirant (Chuẩn úy) → 11. Sous-lieutenant (Thiếu úy) → 12. Lieutenant (Trung úy) →
13. Capitaine (Đại úy) → 14. Commandant (Thiếu tá) → 15. Lieutenant-colonel (Trung tá) →
16. Colonel (Đại tá) → 17. Général de brigade (Chuẩn tướng) → 18. Général de division (Thiếu tướng) →
19. Général de corps d'armée (Trung tướng) → 20. Général d'armée (Đại tướng) →
21. **Maréchal de France (Thống chế Pháp)** — cấp cao nhất.

UI hiển thị **tên Pháp + nghĩa Việt** (vd "Capitaine · Đại úy") — bảng cấp bậc tự thân cũng là từ vựng.
Route `/tu-luyen` đổi nhãn thành "Binh nghiệp" (hoặc tương đương) cho khớp theme.

---

## 4. Phases (build từ đầu — local trước, deploy sau)

| Phase | Tên | Nội dung chính | DoD |
|---|---|---|---|
| **F0** | Khởi tạo | **Scaffold Next.js mới** trong `code/` (create-next-app + Tailwind + shadcn), dựng khung thư mục, `lib/slug.ts`, `lib/types.ts`, `lib/levels.ts`, `lib/pos.ts`, branding Pháp, PWA cơ bản | `next build` sạch, app chạy với data mẫu ~20 từ A1 |
| **F1** | Dữ liệu từ vựng | Tải Lexique + kaikki + FLELex + tần suất; viết `build-level-assign.mjs`; agent sinh nghĩa VI + QA; `words/*.json` + index + lemma-map + conjugations | 11k từ đủ 6 cấp, spot-check 200 từ/cấp đạt ≥95% |
| **F2** | Ví dụ + audio từ | Viết `build-examples.mjs` (agent, 3 câu/từ, A1→C2 làm dần); script edge-tts audio từ + câu | A1–A2 đủ ví dụ + audio; cấp cao chạy nền |
| **F3** | UI học & tra | Viết word-browser/word-detail (IPA, giống, chia động từ), search bỏ dấu | Duyệt/tìm/tra hoàn chỉnh ở local |
| **F4** | SRS + ôn tập | Viết `lib/db.ts` + `srs.ts` (FSRS config chặt), trắc nghiệm + sắp xếp câu + câu hỏi giống từ | Học mới/ôn tách riêng chạy đủ vòng |
| **F5** | Phát âm nền tảng | Route `/phat-am`: ~15 bài (bảng chữ, nguyên âm mũi, chữ câm, liaison, elision) + audio minh họa | Học được trọn khóa trước khi vào A1 |
| **F6** | Bài đọc + truyện | Readings A1–B1 trước (bài siêu ngắn cho A1), truyện B1+ theo pipeline `build-stories`; audio passages | Validator lemma đạt 100%, đọc-bấm-tra chạy |
| **F7** | Tiến độ + gamify + E2E (LOCAL) | Viết gamify/streak/huy hiệu (21 cấp bậc quân đội Pháp), progress-dashboard, Playwright các luồng chính | Chạy đủ **hoàn toàn ở local**, không cần backend |
| **F8** | Deploy & live (SAU CÙNG) | Firebase project mới (Auth + Firestore) + `lib/sync*.ts` sync tiến độ, hosting tĩnh, PWA production | Production, dùng được trên điện thoại |

> **Chốt lại thứ tự (theo yêu cầu):** làm xong **toàn bộ F0–F7 chạy trên local trước** (kể cả gamify + E2E). F8 (Firebase + deploy + mọi thứ liên quan tới live) **tách riêng, làm sau cùng** khi đã hài lòng với bản local. Đồng bộ đám mây là tùy chọn thêm — app vốn offline-first, IndexedDB là nguồn sự thật.

Thứ tự nghiệm thu trên **~390px** (mobile-first) như app HSK.

> Chiến lược dữ liệu "làm dần": chỉ cần **A1 hoàn chỉnh** (từ + ví dụ + audio + bài đọc) là bắt đầu
> học thật được ngay sau F5 — các cấp B/C bổ sung dần không chặn việc học, vì user học từ số 0.

---

## 5. Rủi ro & quyết định mở

| Rủi ro | Hướng xử lý |
|---|---|
| FLELex khó tải dạng máy đọc | Không lệ thuộc: xương sống là tần suất Lexique + chủ đề A1 tự soạn; FLELex chỉ để đối chiếu |
| Nghĩa VI sinh bằng agent sai | QA 2 lớp như HSK + spot-check theo cấp trước khi build audio (audio đọc tiếng Pháp nên ít bị ảnh hưởng) |
| Đồng âm/đa nghĩa (est, été…) | Thẻ theo lemma phổ biến nhất; reader tra theo lemma-map ưu tiên lemma trong bộ từ |
| Tên file có dấu | `lib/slug.ts` ASCII hoá ngay từ F0 |
| C2 không có danh mục chuẩn | Chấp nhận "top tần suất còn lại", gắn nhãn "Nâng cao" thay vì hứa chuẩn DALF |
| Viết mới tốn công hơn copy | Chấp nhận đánh đổi: code sạch, không kéo theo nợ kỹ thuật đặc thù Trung; app HSK là bản tham chiếu chi tiết nên không phải nghĩ lại kiến trúc |

**Đã chốt:**
- **Build từ đầu**, KHÔNG copy code app HSK — chỉ dùng làm bản tham chiếu kiến trúc.
- Tên repo/thư mục code: **`french-words`** (app nằm trong `french_words/code`).
- Theme cảnh giới → **cấp bậc quân đội Pháp**, cao nhất **Maréchal de France (Thống chế Pháp)** — mục 3.5.
- TTS: **một giọng duy nhất `fr-FR-DeniseNeural`** cho toàn app (từ / câu / bài đọc / truyện), không giọng nam phụ.

---

## 6. Checklist tiến độ (đánh dấu khi làm — dùng để tiếp tục nếu bị ngắt/hết token)

> **Cách dùng**: mỗi lần làm xong một mục, đổi `[ ]` → `[x]`. Khi quay lại phiên mới, đọc mục này để biết
> đang ở đâu. Ghi chú ngắn (đường dẫn file, số liệu, lệnh đã chạy) vào dòng "📝 Ghi chú" cuối mỗi phase để
> phiên sau không phải dò lại. Trạng thái tổng: **F0 ✅ · F1 ✅ · F2 ✅ · F3 ✅ · F4 ✅ · F5 ✅ · F6 ✅ · F7 ✅ · F8 ✅** (⬜ chưa xong / ✅ xong). → **HOÀN THÀNH — production live tại https://french-pet.web.app**

### F0 · Khởi tạo
- [x] `create-next-app` (static export) trong `french_words/code`, cài Tailwind + shadcn
- [x] Dựng khung thư mục (`app/`, `components/`, `lib/`, `public/data/`, `public/audio/`, `scripts/`)
- [x] `lib/slug.ts` (bỏ dấu + hash chống trùng) + test vài case có dấu (é, à, œ, l')
- [x] `lib/types.ts` (interface `Word` theo mục 1.3)
- [x] `lib/levels.ts` (6 cấp A1–C2 + nhãn + màu)
- [x] `lib/pos.ts` (từ loại Pháp: n, v, adj, adv, prep…)
- [x] Branding Pháp (tên app, màu, meta) — bỏ mọi dấu vết CJK
- [x] PWA cơ bản (manifest + service worker skeleton)
- [x] Data mẫu 20 từ A1 (`public/data/words/a1.json`) để app render được
- [x] **DoD:** `next build` sạch, app chạy local với 20 từ mẫu
- 📝 Ghi chú F0: App tại `french_words/code` (Next 16.2.10, static export, Tailwind 4, font hệ thống).
  Deps đã cài: dexie, dexie-react-hooks, ts-fsrs, firebase, lucide-react, cva/clsx/tailwind-merge, tw-animate-css.
  Core lib đã có: `slug.ts` (deburr/toSearch/slug/hash4/audioName — test OK: œ→oe, l'École→lecole, chống trùng e/é),
  `types.ts` (Word + Example + Conjugation + Reading/Story + SRS/DailyStat), `levels.ts`, `pos.ts`, `data.ts` (loadWords), `utils.ts`.
  Trang chủ render 20 từ A1 kèm mạo từ theo giống (une école (f)), IPA, nghĩa VI+EN. Verify browser 390px, console sạch.
  Preview: root `.claude/launch.json` (name "dev" = `cd code && npm run dev`, port 3000). shadcn CLI chưa init (dùng khi cần component đầu tiên ở F3).
  **shadcn chưa cài component nào — F3 chạy `npx shadcn@latest init` trước khi thêm.**

### F1 · Dữ liệu từ vựng
- [x] Tải Lexique 3.83 → `scripts/Lexique383.tsv` (142.695 dòng, 25M)
- [x] Tải kaikki.org (Wiktextract FR) `scripts/kaikki-fr.jsonl` (544MB, 400.845 dòng) — tải xong (resume `-C -`)
- [—] FLELex + Français fondamental: **BỎ QUA** (plan mục 5 "không lệ thuộc"); FrequencyWords fr_50k đã tải nhưng không dùng (tần suất phim của Lexique đã đủ mặt khẩu ngữ)
- [x] `build-level-assign.mjs`: 11.000 lemma, band chuẩn {A1:800,A2:1200,B1:2000,B2:2500,C1:3000,C2:1500}, seed A1 212 từ
- [x] Sửa chất lượng lemma: IPA lấy đúng dạng gốc (être /ɛtʁ/); giống chỉ gán khi từ loại CHÍNH là danh từ (bỏ nhiễu donner/long/surtout); pos xếp theo độ phổ biến; số nhiều bất quy tắc 155 từ
- [x] Sinh `meaning_vi` **toàn bộ 11.000 từ (A1→C2)** — 56 batch subagent (200 từ/batch, dùng `out/vi-in/INSTRUCTIONS.md`), gộp `scripts/out/meanings-vi.json` (kèm meaning_en súc tích). Spot-check rải đều mọi cấp: chính xác cao
- [x] **QA sâu nghĩa VI TOÀN BỘ 11.000 từ (A1→C2)** — 56 subagent soát độc lập lần 2: chỉ **57 lỗi** → đã sửa (faux-amis: major≠thiếu tá, gym≠phòng tập, trèfle=nhép; lặp từ; sắc thái). Đúng ~99,5%. Pipeline `prep-qa-batches.mjs` → `qa-in/INSTRUCTIONS.md` → `merge-qa.mjs`. Đã git commit + deploy live
- [~] Lưu ý QA phát hiện (chưa sửa, ngoài phạm vi nghĩa VI): vài từ sai trường `gender` do đồng âm (mort/bouffe/oasis/coke/aubain…) + vài pos/IPA lẻ — có thể đối chiếu kaikki sửa sau nếu muốn
- [x] Ghép `words/a1..c2.json` — ĐỦ 11k từ, mỗi từ có IPA + meaning_vi + meaning_en. `build-words-base.mjs` + `build-words-assemble.mjs`
- [x] `word-levels.json` (id → level) ✓ ; `words-index.json` ✓ (11k entry)
- [x] `lemma-map.json` (61.445 entry, gồm elision l'/d'/j' + mạo từ rút gọn au/du/aux/des)
- [x] `conjugations/{lemma}.json` ✓ **2.318 bảng chia** (présent/imparfait/futur/passé composé; tự phát hiện trợ động từ être/avoir → venir="je suis venu"); nhóm động từ sửa đúng (venir=3, finir=2, manger=1); giống đối chiếu kaikki (sửa abbé f→m)
- [x] **DoD:** 11k từ đủ 6 cấp, đủ IPA (kaikki 10.422 + phon fallback 578) + nghĩa VI/EN. `next build` sạch, app render 800 từ A1 ở 390px, console sạch. Spot-check các cấp ✓
- 📝 Ghi chú F1: Nguồn xương sống = **Lexique** (freq trộn 0.6 phim+0.4 sách, giống, số nhiều bất quy tắc 155 từ, form→lemma).
  IPA = kaikki (chính) + `phon2ipa.mjs` dựng từ Lexique phon (dự phòng, đã đối chiếu chuẩn). Nghĩa EN + conjugation = kaikki.
  Pipeline file: `build-level-assign.mjs` → `out/lemmas.json`; `build-enrich-kaikki.mjs` → `out/enrich.json` + conjugations;
  `build-words-base.mjs` → `out/words-base.json`; nghĩa VI → `out/meanings-vi.json`; `build-words-assemble.mjs` → `public/data/words/*.json`.
  **Trạng thái: F1 XONG — 11.000 từ đủ IPA + nghĩa VI + EN; 2.318 bảng chia; lemma-map + index đủ.**
  Chạy lại toàn bộ (deterministic, nghĩa VI đã lưu ở `out/meanings-vi.json` + `out/vi-out/*.json`):
  `node build-level-assign.mjs` → `node build-enrich-kaikki.mjs` → `node build-words-base.mjs` → `node merge-vi.mjs` → `node build-words-assemble.mjs`.
  Sinh thêm nghĩa cho từ mới (nếu bổ sung từ): `node prep-vi-batches.mjs <cefr>` (chỉ tạo batch cho từ CHƯA có nghĩa) → subagent → merge → assemble.
  Nguồn thô lớn còn trong `scripts/`: `kaikki-fr.jsonl` (544M), `Lexique383.tsv` (25M) — KHÔNG cần lúc chạy app, chỉ để build lại data; có thể xoá nếu cần chỗ.
  Còn tinh chỉnh về sau (không gấp): QA sâu 200 từ/cấp; từ hư (je, ne…) có pos phụ "danh từ" hơi nhiễu khi hiển thị (primary pos vẫn đứng đầu); duyệt tay biên giới cấp.

### F2 · Ví dụ + audio từ
- [x] Pipeline câu ví dụ (3 câu/từ): `prep-examples-batches.mjs` + `out/ex-in/INSTRUCTIONS.md` → subagent → `out/ex-out/*.json` → `merge-examples.mjs`
- [x] **Câu ví dụ A1+A2: 2000 từ × 3 = 6000 câu** (đúng 3 câu/từ, 0 lỗi định dạng). `public/data/examples/{a1,a2}.json`
- [x] QA ví dụ: spot-check — câu ngắn tự nhiên, đúng ngữ pháp/giống (école: "Les enfants vont à l'école.")
- [x] `lib/tts.ts` (wordSpoken kèm mạo từ, wordAudioUrl, sentenceAudioUrl) + `slug.hashLong` cho tên file câu
- [x] Audio pipeline: `build-audio-manifest.mjs` (JS sinh tên file, khớp frontend) + `build-audio.py` (edge-tts `fr-FR-DeniseNeural`, async, resume, skip file đã có)
- [x] **Audio A1: 800 từ + 2347 câu** (danh từ đọc kèm mạo từ "une école"). Verify browser: phát 206, examples hiện, console sạch
- [x] Audio A2: hoàn tất. A1+A2 = 2000 file từ + 5939 file câu (124M), 0 lỗi
- [x] **Ví dụ B1–C2: xong toàn bộ** → 11.000/11.000 từ có ví dụ, **33.000 câu** (mỗi từ 3 câu). `public/data/examples/{a1..c2}.json`
- [x] Audio B1–C2: hoàn tất. **Tổng cả 6 cấp = 10.986 file từ + 32.926 file câu (43.912 file, 928M), 0 file lỗi/rỗng**
- [x] **DoD:** TOÀN BỘ 11k từ đủ ví dụ (33.000 câu) + audio (từ + câu). Verify browser: phát 206, console sạch ✓
- 📝 Bài học F2 batch ví dụ: 150 từ/batch hay bị rớt kết nối (chạy ~550s) → dùng **100 từ/batch**. `merge-examples.mjs` TÍCH LUỸ vào examples.json (không dựng lại từ đầu) nên an toàn khi tên batch trùng/subagent rớt; chạy lại prep chỉ tạo batch cho từ còn thiếu → lặp merge→prep→spawn đến khi đủ. Từng gặp "session limit reset 7pm" giữa chừng — chờ reset rồi tiếp.
- 📝 Ghi chú F2: edge-tts qua venv `scripts/.venv` (PEP668 chặn pip hệ thống). Giọng DUY NHẤT `fr-FR-DeniseNeural`.
  Tên file: từ = `audioName(chuỗi đọc)` vd `une-ecole-1ln8.mp3`; câu = `hashLong(fr).mp3`. Frontend (`lib/tts.ts`) & manifest DÙNG CHUNG `lib/slug.ts` → luôn khớp.
  Chạy lại/tiếp: `node build-audio-manifest.mjs <cefr...>` → `./.venv/bin/python build-audio.py out/audio-words.json ../public/audio/words` (và audio-sentences → sentences). Resume tự động.
  examples resume: `prep-examples-batches.mjs <cefr>` chỉ tạo batch cho từ chưa có ví dụ. B1–C2 chưa sinh ví dụ/audio.

### F3 · UI học & tra
- [x] `lib/data.ts` (loadWords/loadExamples/loadConjugation lazy + cache/loadWordIndex)
- [x] `lib/tts.ts` (map từ/câu → file audio qua slug — làm ở F2)
- [x] `word-browser.tsx` (cột IPA, **search bỏ dấu** dùng field `search`, cap 300 dòng cho mượt)
- [x] `word-detail.tsx` (modal bottom-sheet: audio từ, khối **giống/số nhiều** cho noun, **tab chia động từ** lazy-load cho verb, ví dụ + audio câu)
- [—] `word-occurrences` (bài đọc chứa từ) — **hoãn tới F6** (chưa có bài đọc)
- [x] Route `/hoc/[level]` (generateStaticParams 6 cấp, SSG), `level-grid` (trang chủ), `bottom-nav` (5 tab) + 4 trang stub "Sắp có"
- [x] **DoD:** duyệt/tìm/tra hoàn chỉnh — verify browser 375px: level-grid → /hoc/1 → tìm "manger" → modal → tab chia động từ (présent/passé composé "j'ai mangé"/imparfait/futur) + noun "travail" (giống đực + số nhiều travaux) + phát audio; console sạch
- 📝 Ghi chú F3: word-detail là **modal client-side** (không route /tu/[id]) để tránh build 11k trang tĩnh. Không dùng shadcn — component Tailwind thuần + lucide-react.
  Sửa passé composé: script `build-enrich-kaikki.mjs` sinh élision "j'ai…"; UI render passé composé full-width (không cột đại từ vì đã kèm chủ ngữ). Đã rebuild 2.318 file conjugation.
  Route stub: /on-tap /bai-doc /tien-do /tu-luyen (component `coming-soon.tsx`). BottomNav gắn ở layout (mọi trang). Trang chủ cũ (list 20 từ) đã thay bằng level-grid.

### F4 · SRS + ôn tập
- [x] `lib/db.ts` (Dexie/IndexedDB offline-first: bảng reviews/daily/reads/config + getDueReviews/countDue/learnedIds/recordAnswer/recordPractice)
- [x] `lib/srs.ts` (ts-fsrs 5.4.1, config CHẶT: retention 0.97, max 120d, learning_steps ['1m','10m','1h','12h'], relearning ['10m','1h']; card↔ReviewRecord; chấm nhị phân Again/Good)
- [x] `review-runner.tsx` (trắc nghiệm choice-only, chấm tự động, auto-advance khi đúng, thanh tiến độ, tổng kết) + `review-session.ts` (dựng câu hỏi + distractor)
- [x] `sentence-arrange.tsx` (sắp xếp câu, mặc định 1 câu/từ qua `config.arrangePerWord`, tự chấm + feedback)
- [x] Câu hỏi **chọn giống un/une** cho danh từ, tỉ trọng ~30% (recordPractice, không đổi lịch FSRS)
- [x] Tách luồng: **Học từ mới** (nút ở /hoc/[level], chỉ từ chưa học, giới hạn newPerDay/ngày) vs **Ôn tập** (/on-tap, chỉ thẻ đến hạn)
- [x] **DoD:** verify browser 375px — Học mới: MCQ (auto-advance) + sắp xếp câu ("C'est la voiture de Paul." ✓); thẻ lưu IndexedDB (state Learning, due tương lai), daily {reviews,newCount}. Ôn tập: seed due→hiện "1 thẻ đến hạn"→ôn→FSRS dời lịch (reps++). Console sạch
- 📝 Ghi chú F4: chấm nhị phân đúng=Good/sai=Again (không nút Khó/Dễ). MCQ là câu **chấm FSRS**; sắp xếp câu + chọn giống là luyện thêm (chỉ tính daily, không đổi lịch) để lịch ôn sạch. Direction mặc định fr2vi. Config lưu ở bảng `config` (DEFAULT_SRS_CONFIG), chưa có UI chỉnh (làm ở F7 cùng cài đặt). Thẻ mới học xong due sau ~10m nên /on-tap trống ngay sau khi học — đúng thiết kế.
- 📝 Ghi chú F4:

### F5 · Phát âm nền tảng
- [x] Soạn **14 bài** `public/data/phonics.json` (105 mục): bảng chữ cái, nguyên âm đơn/dấu, nguyên âm ghép, **nguyên âm mũi**, phụ âm đặc biệt, C&G, **chữ câm cuối từ**, âm e/ø/œ/ə, h câm/bật hơi, **liaison**, **élision**, dấu phụ, trọng âm/ngữ điệu, chào hỏi
- [x] Audio 105 mục (edge-tts `fr-FR-DeniseNeural`, `public/audio/phonics/{hashLong}.mp3`, 0 lỗi). Script `build-phonics-manifest.mjs` + `lib/tts.phonicsAudioUrl`
- [x] Route `/phat-am`: overview đánh số 14 bài → trang bài học (giải thích VN + từng mục say/IPA/ghi chú + nút audio). `lib/data.loadPhonics`
- [x] Gắn onboarding: banner "Bắt đầu: Khóa phát âm" ở trang chủ (trên grid cấp độ)
- [x] **DoD:** verify browser 375px — overview 14 bài, mở "Nguyên âm mũi" (9 mục IPA đúng), phát audio 206, console sạch
- 📝 Ghi chú F5: mỗi mục = 1 đơn vị audio (chữ cái / âm / từ ví dụ / câu). Nội dung dạy chữ→âm + quy tắc then chốt (âm mũi, chữ câm, liaison, élision) cho người Việt từ số 0. Chưa có theo dõi "đã học bài phát âm" (có thể thêm ở F7 nếu cần).

### F6 · Bài đọc + truyện
- [x] `build-readings.mjs` (validate + ghép) + `readings-index.json`: **60 bài đủ 6 cấp** (A1 12 · A2 12 · B1 10 · B2 10 · C1 8 · C2 8), độ dài tăng dần theo cấp. Sinh qua subagent ràng buộc vocab lũy kế (file `read-vocab/{cefr}.txt`)
- [x] `build-stories.mjs` + `stories-index.json`: **16 truyện** (B1/B2/C1/C2 × 4), mỗi truyện 3 chương
- [x] Validator vocab lũy kế **trên lemma** (qua lemma-map): bài đọc **A1 100%**, A2–C2 99.1–99.9%; truyện 98.1–99.3% (số dư = dạng gạch nối / tên riêng dính dấu câu, không phải từ ngoài cấp)
- [x] Audio câu bài đọc + truyện (edge-tts, dùng chung scheme `sentenceAudioUrl`/hashLong): 784 câu passage, 0 lỗi
- [x] `reader.tsx` / `story-reader.tsx` + `sentence-block.tsx` (token khoảng trắng, chạm-tra qua `lookupWord`→lemma-map→WordDetail)
- [x] Route `/bai-doc`, `/truyen` (toggle qua lại) + `reading-progress` (bảng reads, đánh dấu đã đọc)
- [x] **DoD:** verify browser 375px — mở bài đọc, chạm "frère"→un frère /fʁɛʁ/, chạm "a"→avoir (fix freq), nghe audio câu; truyện "Le voyage à la mer" 3 chương điều hướng. Console sạch
- 📝 Ghi chú F6: **Sửa lemma-map quan trọng** — xây theo ưu tiên TẦN SUẤT (lemma phổ biến giành form dùng chung trước) → est→être, a→avoir, pris→prendre… đúng cả ở validator lẫn runtime tra-từ (trước đó bị map về đồng âm hiếm). Rebuild bằng `build-level-assign.mjs`.
  Pipeline: `prep-reading-vocab.mjs` (vocab lũy kế) → subagent (`read-vocab/INSTRUCTIONS.md`, `STORY-INSTRUCTIONS.md`) → `build-readings.mjs`/`build-stories.mjs`. **Đã phủ đủ 6 cấp** (bài đọc A1–C2, truyện B1–C2). Muốn thêm bài: sinh vào `read-out/`/`story-out/` rồi chạy lại build (idempotent).

### F7 · Tiến độ + gamify + E2E (LOCAL)
- [x] `lib/gamify.ts` (XP newWord 5 / review 3 / practice 2; **21 cấp bậc**; **hệ huy hiệu nhiều bậc kiểu HSK — 62 huy hiệu / 9 nhóm**: Chiêu binh/Trực chiến/Quân công/Thao luyện/Cựu binh(từ nhớ bền)/Quân báo/Nhật ký hành quân + Chiến dịch(theo cấp) + Chiến tích(đặc biệt), mỗi nhóm có lore + tier + tiến độ) + db bảng `gamify` (xp) v2, `addXp/getXp`, `computeStreak`, `progressSummary` (thêm activeDays/matured/maxDayReviews/weekend)
- [x] Bảng **21 cấp bậc quân đội Pháp** (Soldat → Maréchal de France), ngưỡng số từ giãn tới ~11k, UI "tên Pháp · nghĩa Việt"
- [x] Route `/tu-luyen` = **"Binh nghiệp"**: thẻ cấp bậc hiện tại + progress → cấp sau, thang 21 cấp, lưới huy hiệu (đạt/khoá)
- [x] Trang `/tien-do`: 3 chỉ số (từ/streak/XP), **từ đã học theo cấp** (thanh màu), **heatmap 30 ngày**, tổng lượt ôn + bài đã đọc
- [x] Nối XP vào `review-runner` (đúng review +3, từ mới +5, sắp xếp/giống +2)
- [x] **Playwright E2E 7 test** (`e2e/smoke.spec.ts`, chromium 390px): trang chủ, phát âm, tra "manger", học mới MCQ, bài đọc bấm-tra, truyện, tiến độ+binh nghiệp — **7/7 pass**. `npm run test:e2e`
- [x] **DoD:** toàn bộ chạy đủ **ở local** (verify seed 130 từ → Caporal-chef, streak 12, 5/16 huy hiệu; heatmap; console sạch). Không cần backend
- 📝 Ghi chú F7: thăng cấp theo **số từ đã học** (= số thẻ trong bảng reviews); XP là điểm động lực riêng. Streak = ngày liên tiếp có `daily.reviews>0` (tính cả "chưa học hôm nay" → đếm từ hôm qua). Huy hiệu suy ra từ stats (words/xp/streak/reads/reviews), chưa lưu "vừa đạt" để bắn thông báo — thêm sau nếu cần. Playwright: chỉ cài `chromium` headless-shell; `tsconfig` loại `e2e/`. Cài lại: `npx playwright install chromium`.

### F8 · Deploy & live (SAU CÙNG — chỉ làm khi bản local đã ổn)
- [x] `lib/firebase.ts` (env NEXT_PUBLIC_FIREBASE_*, lazy client-only như HSK) + `lib/sync.ts` (Google login + đồng bộ 2 chiều: merge reviews theo reps/last_review, daily max, reads union, xp max; reviews chia chunk 1500 trong Firestore)
- [x] `components/auth-sync.tsx` (nút Đăng nhập Google ở header, avatar + menu Đồng bộ/Đăng xuất, tự sync khi đăng nhập). App vẫn offline nếu chưa cấu hình
- [x] `firebase.json` (hosting `out/` + cache headers + firestore rules), `firestore.rules` (mỗi user chỉ ghi users/{uid} của mình; kèm tuỳ chọn khoá 1 UID như HSK), `.env.local.example`, script `npm run deploy`
- [x] **Firebase project** `french-pet` (Spark/free) + Web app + Google Auth + Firestore (asia-southeast1) — user đã tạo
- [x] **Khoá app theo chủ**: `auth-gate.tsx` chặn cả app trừ `NEXT_PUBLIC_OWNER_UID`; `firestore.rules` khoá UID `iHstXW8ew7fIHm5nNXQUPBZppSf1`. `.env.local` đã điền config + OWNER_UID (đã nén vào bundle)
- [x] **Deploy**: `npm run deploy` + `firebase deploy --only firestore:rules` — LIVE (HTTP 200)
- [x] **DoD:** production **https://french-pet.web.app** ✅, chỉ tài khoản chủ đăng nhập được, sync tiến độ đa thiết bị
- 📝 Ghi chú F8: project id `french-pet` · URL `https://french-pet.web.app` · OWNER_UID `iHstXW8ew7fIHm5nNXQUPBZppSf1`. Config Firebase công khai (an toàn). Lấy UID: banner vàng khi OWNER_UID rỗng, hoặc Console → Authentication → Users. Đổi máy: đăng nhập cùng tài khoản → auto-sync.

### Milestone "học thật được"
- [ ] **A1 hoàn chỉnh** (từ + ví dụ + audio + bài đọc) + F5 xong → bắt đầu học thật, các cấp B/C bổ sung dần không chặn.
