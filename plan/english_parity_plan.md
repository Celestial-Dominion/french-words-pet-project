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
| Bài đọc | 1.377 (A1–C2) | 60 |
| Truyện | 373, có chuỗi truyện dài | 16 |
| Video hội thoại | 160 | 0 |
| Ngữ pháp | 188 bài, video giảng SVG, luyện tập, lịch ôn riêng | 11 bài chữ |
| Câu ví dụ/từ | 5 câu đã soát | 3 câu |
| Thẻ từ | họ từ, cụm đi kèm, nhãn văn phong | chưa có |
| Đánh dấu đã đọc/xem/học + lọc · câu hỏi đọc hiểu · ghi nguồn | có | chưa |

## 2. Việc nhỏ — chỉ code, dữ liệu có sẵn trên máy (làm trước)

- [x] **A1. `scripts/deploy-watch.sh`** — in tiến độ deploy mỗi pha + mỗi 5%, tự thoát khi xong/lỗi (từ app Anh `4bcbbc1`; thêm: bỏ báo lỗi giả ở dòng kiểm rules khi `RULES=1`). Dùng: `scripts/deploy.sh` chạy nền + `scripts/deploy-watch.sh` trong Monitor. (`46d6164`)
- [x] **A2. Nhãn văn phong** trong thẻ từ + thẻ học từ mới: 290 từ (thân mật 181, thô tục 33, tiếng lóng 28, văn chương 18, miệt thị 16, cũ 14, trang trọng 13). `scripts/build-register.mjs` đọc tag Wiktionary trong `kaikki-fr.jsonl` theo quy tắc chặt (nhãn ở MỌI nghĩa, hoặc ở đúng nghĩa app dạy + ≥½ số nghĩa) + `OVERRIDES` soát tay ~350 ứng viên (quy tắc "nghĩa đầu" của app Anh gắn sai partir/quitter/gentil). Ghi `out/register.json`, vá `public/data/words/*.json`; `build-words-assemble.mjs` giữ nhãn khi dựng lại. Bỏ nhãn vùng miền (Québec/Bỉ/Thụy Sĩ) vì không còn từ nào đúng sau soát. (`d143966`)
- [x] **A3. Họ từ** trong thẻ từ: 4.935 từ (1–8 từ cùng gốc, chỉ từ có trong bộ 11k) — bấm mở thẻ từ đó, nút quay lại + Esc lùi một bước. `scripts/build-family.mjs` dùng `kaikki-fr.jsonl` có sẵn (derived, mẫu từ nguyên ghép `af/suffix/prefix…|fr`, deverbal, related) + lọc chung gốc chữ (related chặt hơn), bỏ từ ghép có gạch nối/nháy, `STOP` chặn cặp gây hiểu nhầm (main~maintenant, beau~beaucoup…), `EXTRA` bổ sung (libre~liberté). Soát mẫu ~90% đúng. Démonette-2 (CC BY 4.0, OSF) chưa dùng — cần tải file, để dành nếu muốn phủ rộng hơn. (`6ea7dc5`)
- [x] **A4. Cụm hay đi kèm** trong thẻ từ: 4.101 từ, 11.083 cụm (1–4 cụm/từ), mỗi cụm kèm nghĩa tiếng Việt (khác app Anh chỉ có cụm — cụm tiếng Pháp khó đoán nghĩa hơn). Phủ A1 82% · A2 95% · B1 95% (gần hết từ nội dung), B2–C2 chỉ phần RL-fr có. Nguồn: RL-fr 3.2 (ATILF, CC BY 4.0) tải về `scripts/rlfr/` (gitignore) → `prep-col-batches.py` lấy hàm từ vựng "syntagmatic" (Magn, Oper_1, Real_1…) cho 1.228 từ → `out/col-in/00–12`; từ A1–B1 RL-fr không phủ → `prep-col-gap.mjs` → `out/col-in/13–37`. Cụm + nghĩa tự viết vào `out/col-out/NN.json` (`{"id": [["cụm fr","nghĩa vi"]…]}`), bỏ cụm không chứa từ gốc (il pleut des cordes), soát lại A1. `build-collocations.mjs` gộp → `out/collocations.json` + vá `public/data/words/*.json` (cảnh báo cụm không chứa từ gốc — còn lại chỉ là dạng chia bất quy tắc: il faut, je sais…); `build-words-assemble.mjs` giữ khi dựng lại. Khối "🔗 Cụm hay đi kèm" trước "Họ từ"; ghi công RL-fr ở Cài đặt. BEL-RL-fr (ví dụ) chưa dùng. (`5177fad`)
- [ ] **A5. Đánh dấu xong + lọc** (`done-toggle` app Anh) cho bài đọc, truyện, ngữ pháp, phát âm hiện có; tick tay ngữ pháp KHÔNG vào lịch ôn (cờ `man`).

## 3. Câu ví dụ 3 → 5 câu/từ

Lý do: phiên mới cho tới 5 câu điền/từ + xoay câu theo lần ôn, nhưng 3 câu không đủ dùng.

- [ ] **B1.** Lấy câu thật từ **Tatoeba** (văn bản CC BY 2.0 FR — ghi tác giả), thiếu thì agent sinh theo cấp; ~22.000 câu.
- [ ] **B2.** Nghĩa VI: agent dịch + QA 2 lớp (như đợt 07/2026).
- [ ] **B3.** Audio giọng Denise (~+0,8 GB). edge-tts **đã cài** ở `~/code/english_words/code/scripts/.venv-tts` (có Denise, Henri, Eloise, Remy, Vivienne + giọng CA/BE/CH) — dùng lại, không cài mới.
- [ ] **B4.** Tách lại shard ví dụ, deploy (nhiều MP3 → script tự hạ 8 luồng).

## 4. Thư viện mới (lớn nhất)

**Code** (port ~1.800 dòng UI + ~5.400 dòng script; sửa tách từ/lemma cho tiếng Pháp):

- [ ] **C1.** Trang theo cấp `/bai-doc/[cấp]/[id]`, `/truyen/[cấp]/[id]`; lọc chủ đề/thể loại; đánh dấu + lọc trạng thái.
- [ ] **C2.** Trình đọc: nghe cả bài karaoke, tốc độ 1→1,25×, tự đánh dấu khi đọc tới cuối (không đánh dấu lúc mở).
- [ ] **C3.** Câu hỏi đọc hiểu + ghi nguồn (`source-note`), chuỗi truyện dài (`series`).
- [ ] **C4.** Chỉ mục từ → học liệu (`word-refs`): "Gặp lại trong ngữ cảnh" + gợi ý sau phiên đọc theo chỉ mục.
- [ ] **C5.** Đồng bộ vị trí đọc truyện (`storyPos`) — nhớ thêm field vào `firestore.rules`.
- [ ] **C6.** Pipeline nội dung: `content:check`, `content:coverage --targets`, `content:kit`, `content:build` (+ audio).

**Nội dung** (mục tiêu theo độ phủ từ của cấp như "Mục tiêu 2.0" trong `ENGLISH_CONTENT_PLAYBOOK.md`, không chạy theo số bài):

- [ ] **C7.** A1–A2: Storybooks Canada / African Storybook bản Pháp (CC BY 4.0, 40 truyện có audio) + tự soạn.
- [ ] **C8.** Truyện kể lại từ phạm vi công cộng: Wikisource FR, Project Gutenberg, Bibliothèque numérique romande, Gallica — Perrault, La Fontaine, Daudet (*Lettres de mon moulin*), Maupassant, Verne, Hugo, Comtesse de Ségur. Kể lại theo cấp, làm nhẹ bạo lực (playbook §14).
- [ ] **C9.** Bài dữ kiện A2–B1: Vikidia (CC BY-SA 3.0); tin tức: Wikinews FR (CC BY 2.5); B2–C1: Wikipedia FR chỉ làm nguồn dữ kiện, kể lại hoàn toàn.
- [ ] **C10.** Audio thư viện ~1,5 GB (Denise; Henri cho vai thứ hai).

## 5. Video hội thoại (sau mục 4)

- [ ] **D1.** Port bộ máy video (~6.500 dòng SVG nhân vật/cảnh/đạo cụ — gần như không phụ thuộc ngôn ngữ).
- [ ] **D2.** Lời thoại Pháp dựng từ truyện, audio 2 giọng Denise/Henri, transcript, luyện nói theo (`ENGLISH_VIDEO_PLAYBOOK.md`).

## 6. Khoá ngữ pháp có video

- [ ] **E1.** Port bộ máy: bài giảng SVG, luyện tập, lịch ôn riêng, liên kết từ thẻ từ → bài ngữ pháp, đồng bộ tiến độ mã hoá (~2.700 dòng). Chuyển 11 bài hiện có sang định dạng mới.
- [ ] **E2.** Khung chương trình A1–C2 (~150–180 bài): "Inventaire linguistique des contenus clés des niveaux du CECRL" (France Éducation international, miễn phí, đơn vị ra đề DELF) + đối chiếu danh sách ngữ pháp DELF. Tự viết bài, không chép (`ENGLISH_GRAMMAR_PLAYBOOK.md`).

## 7. Tuỳ chọn

- [ ] **F1.** Soát cấp độ 11.000 từ với **FLELex** (tần suất theo cấp CECRL, CC BY-NC 3.0 — hợp app cá nhân).
- [ ] **F2.** Script so sánh 2 app (liệt kê file mới bên Anh, diff file chung sau khi chuẩn hoá `en`→`fr`) để đợt sau port nhanh.
- [ ] **F3.** Về lâu dài: tách lõi giống hệt nhau (`srs-pure`, `sync-merge`, `db`, `review-runner`…) thành gói dùng chung cho 3 app.

## Thứ tự đề xuất

1. Mục 2 (A1–A5) → 2. C1–C6 + mục 3 → 3. E1, rồi E2 theo cấp → 4. C7–C10 theo lô, đo độ phủ mỗi lô → 5. Mục 5.

## Nguồn

- RL-fr: https://lexical-systems.atilf.fr/en/downloads/ (CC BY 4.0, ORTOLANG)
- Démonette: https://hal.archives-ouvertes.fr/hal-02054208 · https://lexique.univ-lille.fr/1242
- FLELex: https://cental.uclouvain.be/cefrlex/flelex/download/
- Tatoeba: https://tatoeba.org/downloads (văn bản CC BY 2.0 FR; audio giấy phép riêng từng người)
- Storybooks Canada: https://storybookscanada.ca
- Vikidia: https://fr.vikidia.org/wiki/Vikidia:Principes_fondateurs · Wikinews: https://meta.wikimedia.org/wiki/Wikinews/License
- Wikisource FR: https://fr.wikisource.org · Gutenberg: https://www.gutenberg.org · BNR: https://ebooks-bnr.com · Gallica: https://gallica.bnf.fr
- Ngữ pháp DELF: https://www.digischool.fr/articles/fle/grammaire-delf-a1-a2-b1-b2/ · France Éducation international: https://www.france-education-international.fr
