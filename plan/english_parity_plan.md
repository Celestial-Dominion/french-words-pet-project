# Kế hoạch giữ app Pháp ngang tính năng app Anh

> Lập 10/10/2026 · Mốc đồng bộ gần nhất: **app Anh `4bcbbc1`** (app Pháp `6aa88b9`, `b4cdc9b`).
> Đã port xong: phiên học/ôn kiểu HSK, gõ chính tả, đã-biết-sẵn + sàng lọc, ngăn Cài đặt, nhiệm vụ ngày,
> huy hiệu năng lực, Luyện tập tự do, đồng bộ an toàn, deploy nhanh. Phần còn lại dưới đây làm dần;
> đánh `[x]` khi xong, ghi commit vào cuối dòng.

## 0. Quy trình mỗi lần cập nhật

- [ ] `cd ~/code/english_words && git log --oneline 4bcbbc1..` → liệt kê commit mới, port phần tính năng (bỏ nội dung riêng của tiếng Anh).
- [ ] Sau mỗi đợt: đổi mốc ở đầu file này + mục 6.
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

- [ ] **A1. `scripts/deploy-watch.sh`** — in tiến độ deploy mỗi 5% (copy từ app Anh `4bcbbc1`, đổi tên project). Rất nhỏ.
- [ ] **A2. Nhãn văn phong** trong thẻ từ. Nguồn: `code/scripts/kaikki-fr.jsonl` (đã có) — ~1.300 từ có nhãn: colloquial 282, informal 265, slang 247, dated 140, archaic 117, literary 106, vulgar 66, Québec/Belgique/Suisse 107. Việc: thêm trường `register` lúc dựng dữ liệu (`build-words-assemble.mjs`), hiện badge như `REGISTER_VI` của app Anh (thân mật, khẩu ngữ, tiếng lóng, cũ, văn chương, thô tục, vùng miền).
- [ ] **A3. Họ từ** (décider → décision → décisif). Nguồn: kaikki "derived" (2.992 từ, có sẵn) + **Démonette** (bảng họ từ, Creative Commons — soát biến thể giấy phép). Việc: trường `family` + điều hướng chồng thẻ trong `word-detail` (port từ app Anh).
- [ ] **A4. Cụm hay đi kèm**. Nguồn: **RL-fr** (Réseau Lexical du Français, ATILF, CC BY 4.0, tải qua ORTOLANG) + BEL-RL-fr (ví dụ). Thiếu thì agent sinh + soát. Việc: trường `collocations`, khối "🔗 Cụm hay đi kèm" trong thẻ từ. Ghi công ở mục Nguồn dữ liệu của Cài đặt.
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
