# Kế hoạch giữ app Pháp ngang tính năng app Anh

> Lập 10/10/2026 · Mốc đồng bộ gần nhất: **app Anh `4bcbbc1`** (app Pháp `6aa88b9`, `b4cdc9b`).
> Đã port xong: phiên học/ôn kiểu HSK, gõ chính tả, đã-biết-sẵn + sàng lọc, ngăn Cài đặt, nhiệm vụ ngày,
> huy hiệu năng lực, Luyện tập tự do, đồng bộ an toàn, deploy nhanh. Phần còn lại dưới đây làm dần;
> đánh `[x]` khi xong, ghi commit vào cuối dòng.

## Cách làm (áp dụng cho MỌI đợt)

**Quy tắc làm việc** (yêu cầu của chủ app):

- Tự làm, **không gọi agent/subagent**; được chạy song song lệnh và tiến trình (lệnh độc lập gửi cùng lúc, việc lâu chạy nền).
- **Không cài phần mềm mới** lên máy. Dùng sẵn: `code/node_modules` (next, tsc, eslint, vitest, Playwright + Chromium đã cài, firebase-tools), `python3` hệ thống, edge-tts trong venv của app Anh.
- **Dùng tối đa nguồn online miễn phí** (WebSearch/WebFetch, tải dữ liệu mở). Chỉ nhận phạm vi công cộng, CC0, CC BY, CC BY-SA, CC BY-NC(-SA); không nhận ND; ghi nguồn + giấy phép vào dữ liệu và mục "Nguồn dữ liệu" trong Cài đặt.
- **Làm phần chung trước, phần riêng sau**: lib thuần / types / db / sync / script pipeline / test → rồi UI từng màn, nội dung.
- **Không giải thích, không hỏi lại** — tự chọn phương án hợp lý, ghi lựa chọn vào báo cáo.
- **Báo cáo ngắn sau mỗi task con** (theo mã việc A1, B2…) và **một báo cáo tổng** cuối đợt; viết tiếng Việt.
- Kết thúc đợt: `npm run check` + `npx playwright test` → commit (tiếng Việt, dòng cuối `Co-Authored-By`) → push → `npm run deploy` → đánh `[x]` + mã commit trong file này, đổi mốc đồng bộ.
- Tiết kiệm token/thời gian: đọc `diff` thay vì cả file; port bằng cách copy file app Anh rồi thay thế có kiểm tra (`python3` + `assert` chuỗi gốc tồn tại); gộp nhiều lệnh vào một lần chạy.

**Kỹ thuật** (giữ lại từ plan cũ đã xoá — thư mục `code/scripts/`):

- **Port code từ app Anh**: giữ đặc thù Pháp (xem mục 0). Kiểu `Example` là `{ fr, vi }` (Anh: `{ en, vi }`); hướng hỏi `fr2vi`/`vi2fr`; cấp 1..6 không có bộ nền level 0.
- **Từ vựng** (khi thêm trường `register`/`family`/`collocations`): `node build-level-assign.mjs` → `node build-enrich-kaikki.mjs` → `node build-words-base.mjs` → `node merge-vi.mjs` → `node build-words-assemble.mjs` → `public/data/words/*.json`. Nguồn thô: `kaikki-fr.jsonl` (544 MB), `Lexique383.tsv` (cả hai không vào git). lemma-map dựng theo ưu tiên TẦN SUẤT (est→être, a→avoir) — đừng phá. Số từ mỗi cấp phải khớp `lib/levels.ts` (unit test khoá).
- **Câu ví dụ**: `node prep-examples-batches.mjs <cefr>` (chỉ tạo lô cho từ còn thiếu, hướng dẫn ở `out/ex-in/INSTRUCTIONS.md`) → tự sinh vào `out/ex-out/` theo lô **100 từ** → `node merge-examples.mjs` (cộng dồn, chạy lại an toàn) → QA: `prep-ex-qa-batches.mjs` / `merge-ex-qa.mjs` → `node shard-examples.mjs` (8 shard/cấp, hash khớp `exampleShardOf` trong `lib/data.ts`). Nghĩa VI cho từ mới: `prep-vi-batches.mjs` / `merge-vi.mjs`, QA: `prep-qa-batches.mjs` / `merge-qa.mjs`.
- **Audio**: `node build-audio-manifest.mjs <cefr...>` → `~/code/english_words/code/scripts/.venv-tts/bin/python build-audio.py out/audio-words.json ../public/audio/words` (câu: `out/audio-sentences.json` → `../public/audio/sentences`); tự resume, bỏ qua file đã có. Tên file dùng chung `lib/slug.ts`: từ = `audioName(chuỗi đọc)` (danh từ đọc kèm un/une), câu = `hashLong(fr).mp3`. Giọng chính `fr-FR-DeniseNeural`; vai nói thứ hai (hội thoại/video) dùng `fr-FR-HenriNeural`. Venv cũ `scripts/.venv` không còn.
- **Bài đọc/truyện hiện có**: `prep-reading-vocab.mjs` (vốn từ lũy kế, `out/read-vocab/`) → nội dung vào `out/read-out/`, `out/story-out/` → `build-readings.mjs` / `build-stories.mjs` (idempotent). Khi làm mục 4 chuyển sang pipeline của app Anh (`content/*.txt` + `build-content.mjs` + `ENGLISH_CONTENT_PLAYBOOK.md`).
- **Kiểm thử thủ công**: preview `fr-qa` (dev :3002, tắt đăng nhập), `fr-prod-qa` (bản build qua `firebase serve` :5055, đủ header/CSP). Playwright chạy dev :3000 — tắt preview server trước (Next khoá `.next/dev`). Bản dev không dùng service worker.
- **Deploy**: xem `code/DEPLOY.md` (`RULES=1` khi đổi `firestore.rules` — thêm field mới vào danh sách `hasOnly`).

## 0. Quy trình mỗi lần cập nhật

- [ ] `cd ~/code/english_words && git log --oneline 4bcbbc1..` → liệt kê commit mới, port phần tính năng (bỏ nội dung riêng của tiếng Anh).
- [ ] Sau mỗi đợt: đổi mốc đồng bộ ở đầu file này (và trong bộ nhớ `sibling-apps`).
- [ ] Giữ đặc thù tiếng Pháp khi port: mạo từ un/une, câu chọn giống (mở sau bài `giong-danh-tu`), chia động từ, lộ trình khởi động `lib/starter.ts`, 6 cấp A1–C2, tiền tố `fr.`/`fr:`, DB `french-words`, backup `fr-words`, test vitest.
- [ ] Kiểm: `npm run check` + `npx playwright test` (tắt dev server khác trước) → `npm run deploy` (xem `code/DEPLOY.md`).

## 1. Mức chênh hiện tại (10/2026)

| Hạng mục | App Anh | App Pháp |
|---|---|---|
| Bài đọc | 1.392 (A1 161, A2 248, B1 301, B2 287, C1 250, C2 145), 28 bài thuộc chuỗi | 1.699 (20/10: A1 160, A2 252, B1 353, B2 372, C1 373, C2 189 — kể cả bài lấp từ thiếu), chưa có chuỗi |
| Truyện | 377 (A1 53, A2 61, B1 79, B2 68, C1 67, C2 49), 46 truyện thuộc 6 tác phẩm dài chia phần | 344 (20/10: A1 54, A2 62, B1 79, B2 68, C1 42, C2 39), chưa có chuỗi |
| Video hội thoại | 160 | 0 |
| Ngữ pháp | 188 bài (A1 28, A2 32, B1 39, B2 36, C1 30, C2 23) | 54 bài A1–A2 cùng bộ máy (18/10; CSS bài giảng bổ sung 20/10 `efab1e5`) |
| Câu ví dụ/từ | 5 câu đã soát | 3 câu |
| Thẻ từ | họ từ, cụm đi kèm, nhãn văn phong | chưa có |
| Độ phủ từ "Mục tiêu 2.0" (20/10) | A1–C2 đạt | B1, B2, C2 đạt; A1 ≥1 93,6/98 ≥3 74,2/90 · A2 ≥1 92,4/97 ≥3 55,6/80 · C1 ≥3 44,5/50 ≥5 24,9/25 |
| Đánh dấu đã đọc | khi làm xong câu hỏi cuối bài (`5f38237`) | khi cuộn tới cuối bài |

## 2. Việc nhỏ — chỉ code, dữ liệu có sẵn trên máy (làm trước)

- [x] **A1. `scripts/deploy-watch.sh`** — in tiến độ deploy mỗi pha + mỗi 5%, tự thoát khi xong/lỗi (từ app Anh `4bcbbc1`; thêm: bỏ báo lỗi giả ở dòng kiểm rules khi `RULES=1`). Dùng: `scripts/deploy.sh` chạy nền + `scripts/deploy-watch.sh` trong Monitor. (`46d6164`)
- [x] **A2. Nhãn văn phong** trong thẻ từ + thẻ học từ mới: 290 từ (thân mật 181, thô tục 33, tiếng lóng 28, văn chương 18, miệt thị 16, cũ 14, trang trọng 13). `scripts/build-register.mjs` đọc tag Wiktionary trong `kaikki-fr.jsonl` theo quy tắc chặt (nhãn ở MỌI nghĩa, hoặc ở đúng nghĩa app dạy + ≥½ số nghĩa) + `OVERRIDES` soát tay ~350 ứng viên (quy tắc "nghĩa đầu" của app Anh gắn sai partir/quitter/gentil). Ghi `out/register.json`, vá `public/data/words/*.json`; `build-words-assemble.mjs` giữ nhãn khi dựng lại. Bỏ nhãn vùng miền (Québec/Bỉ/Thụy Sĩ) vì không còn từ nào đúng sau soát. (`d143966`)
- [x] **A3. Họ từ** trong thẻ từ: 4.935 từ (1–8 từ cùng gốc, chỉ từ có trong bộ 11k) — bấm mở thẻ từ đó, nút quay lại + Esc lùi một bước. `scripts/build-family.mjs` dùng `kaikki-fr.jsonl` có sẵn (derived, mẫu từ nguyên ghép `af/suffix/prefix…|fr`, deverbal, related) + lọc chung gốc chữ (related chặt hơn), bỏ từ ghép có gạch nối/nháy, `STOP` chặn cặp gây hiểu nhầm (main~maintenant, beau~beaucoup…), `EXTRA` bổ sung (libre~liberté). Soát mẫu ~90% đúng. Démonette-2 (CC BY 4.0, OSF) chưa dùng — cần tải file, để dành nếu muốn phủ rộng hơn. (`6ea7dc5`)
- [x] **A4. Cụm hay đi kèm** trong thẻ từ: 4.101 từ, 11.083 cụm (1–4 cụm/từ), mỗi cụm kèm nghĩa tiếng Việt (khác app Anh chỉ có cụm — cụm tiếng Pháp khó đoán nghĩa hơn). Phủ A1 82% · A2 95% · B1 95% (gần hết từ nội dung), B2–C2 chỉ phần RL-fr có. Nguồn: RL-fr 3.2 (ATILF, CC BY 4.0) tải về `scripts/rlfr/` (gitignore) → `prep-col-batches.py` lấy hàm từ vựng "syntagmatic" (Magn, Oper_1, Real_1…) cho 1.228 từ → `out/col-in/00–12`; từ A1–B1 RL-fr không phủ → `prep-col-gap.mjs` → `out/col-in/13–37`. Cụm + nghĩa tự viết vào `out/col-out/NN.json` (`{"id": [["cụm fr","nghĩa vi"]…]}`), bỏ cụm không chứa từ gốc (il pleut des cordes), soát lại A1. `build-collocations.mjs` gộp → `out/collocations.json` + vá `public/data/words/*.json` (cảnh báo cụm không chứa từ gốc — còn lại chỉ là dạng chia bất quy tắc: il faut, je sais…); `build-words-assemble.mjs` giữ khi dựng lại. Khối "🔗 Cụm hay đi kèm" trước "Họ từ"; ghi công RL-fr ở Cài đặt. BEL-RL-fr (ví dụ) chưa dùng. (`5177fad`)
- [x] **A5. Đánh dấu xong + lọc** cho bài đọc, truyện, ngữ pháp, phát âm: `components/done-toggle.tsx` (port app Anh; `TickRow` dùng nút vì danh sách Pháp mở bài tại chỗ, không theo route) — ô tích trên từng dòng, thanh lọc "Tất cả · Chưa … · Đã …" kèm số đếm, nút trạng thái trên đầu trang bài/bài học. Bài đọc/truyện đọc bảng `reads` bằng `useLiveQuery`. Trình đọc thôi tự đánh dấu lúc mở (truyện: lúc mở tới chương cuối) → tự đánh dấu khi cuộn tới cuối bài / cuối chương cuối, bấm tay thì thôi (phần này của C2 coi như xong). Tiến độ phát âm/ngữ pháp đổi sang mục có mốc thời gian `"id~mốc[~0]"` (`mergeCourseEntries` trong `lib/sync-merge.ts`: hành động sau cùng thắng) — trước đây gộp kiểu union nên bỏ tích bị máy khác hồi sinh; mục cũ chỉ có "id" vẫn đọc được. Cờ `man` không áp dụng: ngữ pháp Pháp chưa có luyện tập/lịch ôn — tích tay chỉ là đánh dấu. (`8102e2d`)

## 3. Câu ví dụ 3 → 5 câu/từ

Lý do: phiên mới cho tới 5 câu điền/từ + xoay câu theo lần ôn, nhưng 3 câu không đủ dùng.

- [x] **B1.** Câu ví dụ đủ **5 câu/từ** cho cả 11.000 từ (55.000 câu, thêm 22.000): rà 3 câu gốc (`ex5/audit.mjs`, sửa 16 câu sai qua `out/ex5/fix.txt`), rồi `ex5/pick.mjs` lấy ứng viên Tatoeba theo cấp (độ dài/độ khó, ~ = dạng biến hình) → lô `out/ex5/in/{cefr}-NN.txt` (80 từ) → chọn/viết vào `out/ex5/out/` (`id|chữ|nghĩa` hoặc `id|+|câu|nghĩa`) → `ex5/merge.mjs` (kiểm trùng câu toàn bộ, idempotent; bản 3 câu giữ ở `out/examples-3.json`). Tatoeba 18.313 câu (mang `t` = mã câu, CC BY 2.0 FR) · tự viết 3.687 (từ không có câu hợp nghĩa/từ loại, tên riêng, từ lóng). Theo cấp: A1 +1.600 (18 tự viết) · A2 +2.400 (100) · B1 +4.000 (287) · B2 +5.000 (671) · C1 +6.000 (1.616) · C2 +3.000 (995). Quy ước: bỏ câu tình dục/chính trị/bạo lực; từ xúc phạm/thô tục viết câu meta, nghĩa có "(thô)".
- [x] **B2.** Nghĩa VI tự dịch từng câu khi chọn (không qua agent); sửa kèm 2 nghĩa từ sai (`oublie` = bánh quế, `aubain` = ngoại kiều).
- [x] **B3.** Audio giọng Denise cho mọi câu mới (edge-tts có sẵn ở `~/code/english_words/code/scripts/.venv-tts`), `public/audio/sentences` ~1,2 GB.

## 4. Thư viện mới (lớn nhất)

**Code** (port ~1.800 dòng UI + ~5.400 dòng script; sửa tách từ/lemma cho tiếng Pháp):

- [x] **C1.** Trang theo cấp: `/bai-doc` · `/truyen` = lưới 6 cấp + "Đọc tiếp"; `/bai-doc/[a1…c2]` · `/truyen/[cấp]` = danh sách (ô tích + lọc trạng thái từ A5, bài đọc lọc thêm theo chủ đề); `/bai-doc/[cấp]/[id]` · `/truyen/[cấp]/[id]` = trang riêng từng bài, sinh tĩnh (`generateStaticParams` + `dynamicParams = false`, chỉ mục đọc lúc build ở `lib/library-server.ts`), nội dung tải phía client, cuối bài có "Bài/Truyện tiếp theo". Liên kết cũ `?open=<id>` tự chuyển sang trang mới; gợi ý sau phiên học + "Gặp lại trong ngữ cảnh" dẫn thẳng trang bài (`libraryHref`). Chỉ mục có thêm `topic`, `genre` (bài đọc), `summary` (truyện, đối chiếu nội dung), `words`, `min` (wpm theo cấp như app Anh) — soạn tay ở `scripts/out/library-meta.json`, `build-readings/stories.mjs` ghép vào. Truyện chưa lọc chủ đề (4 truyện/cấp — chưa cần). (`8ba8ca2`)
- [x] **C2.** Trình đọc (`components/passage.tsx`, port `passage-audio.ts` app Anh nhưng giữ audio TỪNG CÂU sẵn có — đủ 786/786 câu): nghe cả bài kiểu karaoke (tô sáng + tự cuộn câu đang đọc, nhường 4 s khi người dùng tự cuộn), tạm dừng / nghe tiếp đúng câu đang dở (trước đây bấm lại là phát từ đầu), câu trước / câu sau, tốc độ 1 → 1,25 → 1,5 → 0,75× nhớ qua lần mở (`fr.readRate`), tự đánh dấu khi đọc tới cuối (làm ở A5), nút ▶ trên từng câu khi bật Dịch. (`db876ff`)
- [~] **C3.** Gộp vào C7 (quyết định 11/10/2026): khung câu hỏi đọc hiểu, ghi nguồn (`source-note`), chuỗi truyện dài (`series`) làm cùng lô nội dung đầu tiên để kiểm tra bằng bài thật — xem C7.
- [x] **C4.** Chỉ mục từ → học liệu (`word-refs`): "Gặp lại trong ngữ cảnh" + gợi ý sau phiên đọc theo chỉ mục. `public/data/word-refs/{0..15}.json` (10.732 từ, ~32 KB/shard, tổng 505 KB; quy về lemma bằng `scripts/lib/fr-vocab.mjs`, tối đa 12 bài/từ, đủ hai loại rồi cấp thấp trước, cùng cấp thì bài dùng từ nhiều lần hơn) thay cho tải chữ cả kho bài (~12 MB) để dò mặt chữ. Dựng bằng `scripts/build-word-refs.mjs` (đọc dữ liệu đang phát hành, chạy riêng được; `build-content.mjs` tự gọi, kể cả `ONLY=`); định dạng + dấu vân tay chỉ mục ở `lib/word-refs.ts` (shard lệch chỉ mục → bỏ qua; test kiểm khớp). (`8f904bb`)
- [x] **C4b.** Đánh dấu bài đọc/truyện "đã đọc" khi làm xong câu hỏi cuối bài thay vì khi cuộn tới cuối (app Anh `5f38237`: `quiz.tsx`, `reading-reader`, `story-reader`, `quiz-pure.ts`, e2e `done-marks`). Đạt = đúng từ 70% (`PASS_SCORE`), câu hỏi chương cuối mới tính với truyện, không tự bỏ đánh dấu; bài không tải được câu hỏi giữ cách cuộn tới cuối. (`8f904bb`)
- [x] **C5.** Đồng bộ vị trí đọc truyện (`storyPos`) — nhớ thêm field vào `firestore.rules`. Khoá `fr.storyPos` `{id: {ch, at}}` (tự chuyển khoá cũ `fr.story.<id>.ch`), máy chuyển chương sau thắng, có trong dấu vân tay sync + sao lưu; rules thêm `storyPos` (map), deploy `RULES=1`. (`8f904bb`)
- [ ] **C6.** Pipeline nội dung: `content:check`, `content:coverage --targets`, `content:kit`, `content:build` (+ audio).

**Nội dung** (mục tiêu theo độ phủ từ của cấp như "Mục tiêu 2.0" trong `ENGLISH_CONTENT_PLAYBOOK.md`, không chạy theo số bài):

**Câu hỏi đọc hiểu** (quyết định 11/10/2026): soạn NGAY khi viết từng bài đọc / truyện mới ở C7–C9, không làm thành đợt riêng. Độ phủ như app Anh — 100% bài và chương có câu hỏi (app Anh: 1.377/1.377 bài đọc ~4 câu/bài, 1.740/1.740 chương truyện 3 câu/chương). Mỗi câu: câu hỏi Pháp + dịch Việt, 4 phương án (1 đúng) + dịch, giải thích trích «nguyên văn» câu trong bài; độ dài câu hỏi/phương án theo cấp (`quiz` trong `scripts/lib/content-spec.mjs` app Anh). 60 bài đọc + 16 truyện hiện có: bổ sung câu hỏi khi đợt nội dung đi qua cấp tương ứng, để cả thư viện đạt 100%.

- [ ] **C7.** A1–A2: Storybooks Canada / African Storybook bản Pháp (CC BY 4.0, 40 truyện có audio) + tự soạn. **Làm kèm phần code của C3 ngay ở lô đầu:** giao diện trắc nghiệm cuối bài / cuối chương (port `quiz.tsx` app Anh: chọn là chấm, lộ nghĩa + giải thích trích «nguyên văn», xáo phương án, Làm lại, không lưu điểm), trường `quiz` + kiểm tra định dạng khi dựng dữ liệu, ghi nguồn `source-note` (Storybooks là CC BY 4.0 — bắt buộc ghi tác giả, nguồn, giấy phép, đã chỉnh sửa), chuỗi truyện dài `series` (Phần n/m, nút sang phần sau; chuỗi bài đọc cùng chủ đề qua các cấp).
  - **13/10/2026 — bài đọc A1–A2 xong**: viết lại toàn bộ (24 bài cũ quá ngắn), A1 160 bài (3–4 câu hỏi/bài), A2 252 bài (4 câu hỏi/bài), cả hai dòng FR | VI soạn tay (dịch máy Apple sai ~½ câu), pipeline `content/readings|quiz/{cấp}/*.txt` → `build-content.mjs`, kiểm `check-content.mjs` (0 lỗi), phủ từ A1 92,9% / A2 90,8% (≥1 lần). Nguồn: African Storybook (kể lại), La Fontaine, Ésope, Perrault, Leprince de Beaumont, Andersen (Soldi) — ghi ở cuối bài + Cài đặt. Còn: chuỗi `series`.
  - **14/10/2026 — truyện A1–A2 xong**: A1 54 truyện × 3 chương (486 câu hỏi), A2 62 truyện × 4 chương (744 câu hỏi), 100% chương có 3 câu hỏi + audio câu hỏi/phương án; `content/stories|quiz/{cấp}/st-NN.txt`, kiểm `check-content.mjs --type story` 0 lỗi 0 cảnh báo. Nguồn kể lại thêm: Grimm, Joseph Jacobs, Andrew Lang, Daudet, Verne, Tolstoï, Roman de Renart (Wikisource/Gutenberg) — ghi cuối truyện + Cài đặt.
- [ ] **C8.** Truyện kể lại từ phạm vi công cộng: Wikisource FR, Project Gutenberg, Bibliothèque numérique romande, Gallica — Perrault, La Fontaine, Daudet (*Lettres de mon moulin*), Maupassant, Verne, Hugo, Comtesse de Ségur. Kể lại theo cấp, làm nhẹ bạo lực (playbook §14).
- [ ] **C9.** Bài dữ kiện A2–B1: Vikidia (CC BY-SA 3.0); tin tức: Wikinews FR (CC BY 2.5); B2–C1: Wikipedia FR chỉ làm nguồn dữ kiện, kể lại hoàn toàn.
  - **15/10/2026 — bài đọc B1–B2 xong**: B1 300 bài (1.200 câu hỏi), B2 285 bài (1.140 câu hỏi), soạn tay FR | VI theo kế hoạch `plan/readings-b1b2-plan.md` (lô b1-01…19, b2-01…18; 36 bài cũ viết lại giữ id), B1 10 thể loại × 30 bài, B2 12 thể loại (mỗi loại ≥23 bài), chủ đề ≤15%; `check-content.mjs` 0 lỗi 0 cảnh báo; audio câu + câu hỏi/phương án. Dữ kiện tự kể lại (không chép nguồn). Độ phủ từ ≥1 lần: B1 62,1% (mục tiêu app Anh 96%), B2 51,0% (90%) — còn thiếu, muốn tăng cần lô bài nhắm từ chưa phủ (`content-kit.mjs need`).
  - **15/10/2026 — bài đọc C1–C2 xong**: C1 250 bài (1.000 câu hỏi), C2 145 bài (580 câu hỏi), soạn tay FR | VI theo `plan/readings-c1c2-plan.md` (lô c1-01…25, c2-01…15, 10 bài/lô), mật độ từ đúng cấp ≥4%; `check-content.mjs` 0 lỗi; audio câu + câu hỏi/phương án. Độ phủ từ ≥1 lần: C1 42,2% (mục tiêu 87%), C2 59,3% (70%).
- [ ] **C10.** Audio thư viện ~1,5 GB (Denise; Henri cho vai thứ hai).

## 5. Video hội thoại (sau mục 4)

- [ ] **D1.** Port bộ máy video (~6.500 dòng SVG nhân vật/cảnh/đạo cụ — gần như không phụ thuộc ngôn ngữ).
- [ ] **D2.** Lời thoại Pháp dựng từ truyện, audio 2 giọng Denise/Henri, transcript, luyện nói theo (`ENGLISH_VIDEO_PLAYBOOK.md`).

## 6. Khoá ngữ pháp có video

- [x] **E1.** Port bộ máy (18/10/2026): bài giảng SVG có tiếng (`components/video`, `components/grammar`, `app/ngu-phap`), luyện tập 9 dạng, lịch ôn riêng, liên kết thẻ từ → bài ngữ pháp (`lib/grammar-refs.ts`), đồng bộ tiến độ mã hoá `id~doneAt~lastAt~reps~best~last~off~man` qua trường `grammar` (vẫn đọc mục cũ "id" / "id~mốc[~0]"). Pipeline: `content/grammar/<cấp>/*.txt` → `npm run grammar:build` (build → `scripts/build-grammar-audio.py` edge-tts: giọng giảng vi-VN-HoaiMy, giọng Pháp Denise + 12 vai → build `--prune`), kiểm `npm run grammar:check`. Cách viết: `docs/GRAMMAR_PLAYBOOK.md`. 11 bài chữ cũ thay bằng khung mới.
- [ ] **E2.** Khung chương trình A1–C2 (~150–180 bài): "Inventaire linguistique des contenus clés des niveaux du CECRL" (France Éducation international, miễn phí, đơn vị ra đề DELF) + đối chiếu danh sách ngữ pháp DELF. Tự viết bài, không chép. **A1 27 bài + A2 27 bài XONG (18/10/2026, audio đủ).** Còn B1–C2: thêm mục vào `content/grammar/curriculum.json` + viết theo playbook.

## 7. Tuỳ chọn

- [ ] **F1.** Soát cấp độ 11.000 từ với **FLELex** (tần suất theo cấp CECRL, CC BY-NC 3.0 — hợp app cá nhân).
- [ ] **F2.** Script so sánh 2 app (liệt kê file mới bên Anh, diff file chung sau khi chuẩn hoá `en`→`fr`) để đợt sau port nhanh.
- [ ] **F3.** Về lâu dài: tách lõi giống hệt nhau (`srs-pure`, `sync-merge`, `db`, `review-runner`…) thành gói dùng chung cho 3 app.

## Thứ tự đề xuất

1. Mục 2 (A1–A5) → 2. C1–C6 (C3 gộp vào C7) + mục 3 → 3. E1, rồi E2 theo cấp → 4. C7–C10 theo lô — mỗi bài/chương mới kèm câu hỏi đọc hiểu, đo độ phủ mỗi lô → 5. Mục 5.

## Nguồn

- RL-fr: https://lexical-systems.atilf.fr/en/downloads/ (CC BY 4.0, ORTOLANG)
- Démonette: https://hal.archives-ouvertes.fr/hal-02054208 · https://lexique.univ-lille.fr/1242
- FLELex: https://cental.uclouvain.be/cefrlex/flelex/download/
- Tatoeba: https://tatoeba.org/downloads (văn bản CC BY 2.0 FR; audio giấy phép riêng từng người)
- Storybooks Canada: https://storybookscanada.ca
- Vikidia: https://fr.vikidia.org/wiki/Vikidia:Principes_fondateurs · Wikinews: https://meta.wikimedia.org/wiki/Wikinews/License
- Wikisource FR: https://fr.wikisource.org · Gutenberg: https://www.gutenberg.org · BNR: https://ebooks-bnr.com · Gallica: https://gallica.bnf.fr
- Ngữ pháp DELF: https://www.digischool.fr/articles/fle/grammaire-delf-a1-a2-b1-b2/ · France Éducation international: https://www.france-education-international.fr
