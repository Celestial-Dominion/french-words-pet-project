# Việc còn lại — app tiếng Pháp

> **Nguồn duy nhất về kế hoạch và tiến độ.** Lập 20/10/2026, thay mọi file kế hoạch cũ.
> Cách viết: bài đọc/truyện `code/docs/CONTENT_PLAYBOOK.md` · ngữ pháp `code/docs/GRAMMAR_PLAYBOOK.md` · deploy `code/DEPLOY.md`.
> `plan/gap-banks/`, `plan/story-banks/` là dữ liệu giỏ từ của `content-kit.mjs`: giữ nguyên, không phải kế hoạch.

## Cách dùng file này (Claude đọc trước khi làm)

1. Người dùng gọi việc theo **mã** (vd. "làm P-A1", "làm G-B1"). Không nói mã thì làm việc *bắt buộc* chưa xong có ước
   tính thấp nhất trong bảng.
2. Đầu phiên: đọc mục của việc + playbook liên quan, rồi **đo lại** vì số trong file có thể đã cũ:
   `cd code && npm run -s content:coverage -- --targets` (bài đọc/truyện) hoặc `npm run -s grammar:state -- --level <cấp>` (ngữ pháp).
3. Làm theo **lô**. Sau MỖI lô, trước khi sang lô sau:
   - thêm một dòng vào **Nhật ký** của việc, dạng: `- 21/10 lô 01: 10 bài (a1-p01), giỏ 85/90; ≥1 93,6→95,1 · ≥3 74,2→77,0; thiếu 226→150; tuần 3→4%; abc1234`;
   - sửa cột **Trạng thái** trong bảng Tổng quan;
   - commit file này **cùng commit của lô**, rồi push.
4. Nháp dài (ý tưởng bài, bước đang dở) ghi vào `plan/.progress-<mã>.md` (git bỏ qua). Xoá file nháp khi xong việc.
5. Xong việc: đổi `[ ]` → `[x]` ở tiêu đề mục, ghi "xong" trong bảng; có bẫy mới thì cập nhật memory; báo người dùng.
6. Hạn mức: chạy `get_usage` sau mỗi lô. Dừng khi tuần ≥ ngưỡng người dùng đặt; người dùng chưa nói thì dừng ở **90%**.
   Ghi chỗ dừng vào Nhật ký để phiên sau làm tiếp.
7. Phong cách: tự làm trọn, không hỏi lại, không dùng subagent, báo cáo tiếng Việt kèm số liệu. Deploy khi người dùng bảo.

## Tổng quan (số đo 20/10/2026)

Xếp theo ước tính tốn token (tăng dần). Ước tính dựa trên đo cũ: lô 6 truyện ≈ 1–2% tuần, lô 10 bài đọc lấp từ ≈ 0–1%.
Ngữ pháp chưa đo lần nào, nên quy theo dung lượng bài app Anh ×1,5 và có thể lệch ±50%.

| Mã | Việc | Loại | Khối lượng | Ước tính % tuần | Trạng thái |
|---|---|---|---|---|---|
| X-skip | Port "bắt đầu từ A1 / bỏ qua cấp" trong Cài đặt | tùy chọn | code nhỏ | ~0,5–1% | chưa làm |
| P-A1 | A1 — nâng độ phủ từ | **bắt buộc** | ~25 bài đọc ngắn (3 lô) | ~1% | chưa làm |
| P-C1 | C1 — nâng độ phủ từ | **bắt buộc** | ~8 truyện (lô 08 + 2 truyện) | ~1,5% | chưa làm (giỏ lô 08 có sẵn) |
| P-A2 | A2 — nâng độ phủ từ | **bắt buộc** | ~40 bài đọc (4 lô) | ~2% | chưa làm |
| S-C2 | C2 — thêm truyện cho đủ 49 như app Anh | tùy chọn | 10 truyện | ~2% | chưa làm (3 giỏ có sẵn) |
| G-C2 | Ngữ pháp C2 (làm sau G-C1) | **bắt buộc** | ~18–23 bài | ~2% | chưa làm |
| X-series | Truyện dài chia phần + chuỗi bài đọc | tùy chọn | code + nội dung | ~2–3% | chưa làm |
| G-B2 | Ngữ pháp B2 (làm sau G-B1) | **bắt buộc** | ~30–36 bài | ~2,5% | chưa làm |
| G-C1 | Ngữ pháp C1 (làm sau G-B2) | **bắt buộc** | ~25–30 bài | ~2,5% | chưa làm |
| S-C1 | C1 — thêm truyện cho đủ 67 như app Anh (sau P-C1) | tùy chọn | ~17 truyện (3 lô) | ~3% | chưa làm |
| G-B1 | Ngữ pháp B1 | **bắt buộc** | ~34–39 bài | ~3% | chưa làm |

Cộng: bắt buộc ~14,5% (độ phủ ~4,5% + ngữ pháp ~10%) · tùy chọn ~8% · tất cả ~22–23% tuần.
Ngữ pháp phải đi theo thứ tự **G-B1 → G-B2 → G-C1 → G-C2**, vì bài cấp trên dựa vào bài cấp dưới (trường `pre`).

---

## P-A1 — Độ phủ từ A1 [ ]

- **Đích** (`TARGETS.a1`): từ A1 gặp ≥1 bài 98% · ≥3 bài 90% · ≥5 bài 65% → "thiếu ngữ cảnh" về 0.
- **20/10:** ≥1 93,6% (49 từ chưa gặp) · ≥3 74,2% (198 từ < 3 bài) · ≥5 64,0% · thiếu 226 ngữ cảnh (164 từ). Giờ đọc 8,5/8 ✓.
- **Cách làm:** bài đọc A1 (80–150 chữ, 3–4 câu hỏi), mỗi bài quanh một giỏ 9 từ.
  Đầu mỗi lô chạy `node scripts/content-kit.mjs sbanks a1 NN --n 10 --size 9 --write` (giỏ `a1-sNNa…j` →
  `plan/story-banks/a1.txt`). Bài ghi vào `content/readings/a1/a1-pNN.txt`, câu hỏi vào `content/quiz/a1/a1-pNN.txt`.
  Lô 10 bài, khoảng 3 lô.
- **Lưu ý:** chỉ bài cấp A1 tính cho từ A1 (bài A2 không giúp được). Từ còn thiếu phần lớn khó đưa vào bài sơ cấp:
  tuer, cela, dont, ainsi, affaire, ailleurs, agir, doute, seigneur, malgré, esprit… Hợp với ngụ ngôn/cổ tích kể lại,
  thư, hội thoại. Từ tục trong giỏ (foutre, gueule, mec) thì bỏ qua.
- **Nhật ký:**

## P-C1 — Độ phủ từ C1 [ ]

- **Đích:** ≥3 bài 50% · ≥5 bài 25%. Mốc ≥1 (98,0%) và giờ đọc (22,1/21) đã đạt.
- **20/10:** ≥3 44,5% (1.649 từ < 3 bài, cần ≤ ~1.485) · ≥5 24,9% · thiếu 202 ngữ cảnh. C1 có 42 truyện.
- **Cách làm:** truyện C1 theo playbook (5 chương, ≥1.000 từ theo `dens`, mật độ C1 ≥4,6%, 3 câu hỏi/chương).
  - **Lô 08** (`content/stories/c1/st-08.txt`): giỏ `c1-s08a…f` ĐÃ SINH trong `plan/story-banks/c1.txt` (đừng sinh lại),
    mỗi giỏ dùng ≥21/26 từ. Ý tưởng:
    a. psychology: kiến trúc sư orgueilleux, maquette bị chê, amour-propre; dùng lại từ lô 07c (samba, liqueur, étui, bossu, mouchard, virgule, communal, mesdemoiselles, magner).
    b. health: bác sĩ / viện dưỡng lão; từ lô 07d (doyen, hospice, insigne, embuscade, barricade, nounou) + aisselle, tiédeur.
    c. society: phiên toà (comparaître, sursis, courtois, corrompre, purger, dévaliser, assassiné, chargeur) + từ lô 07e (loto, horde, vanne, athlète, brigand, bégayer, archevêque).
    d. culture: hiệu sách / nhà văn (réveillon, poétique, romanesque, arborer, comptabilité) + từ lô 07e/f (ivoire, kit, rubrique, hollandais, aventurier, asperge).
    e. education/environment: từ lô 07f (chômeur, chiot, solo, module, dérive) + persécuter, ridé, brésilien, cloître, indécent.
    f. history/art: múa rối guignol thời độc tài Tây Ban Nha (peseta, dictature, anarchie, baïonnette, meute, clameur, louange, thon, bourbon).
    Bỏ từ rác trong giỏ: couillon, avorter, fi, bé, pet, peloter, eunuque, crève.
  - Đo lại sau lô 08. Còn thiếu thì chạy `sbanks c1 09 --n 2 --write` và viết 2 truyện (`st-09.txt`).
- **Nhật ký:**

## P-A2 — Độ phủ từ A2 [ ]

- **Đích** (`TARGETS.a2`): ≥1 97% · ≥3 80% · ≥5 40%.
- **20/10:** ≥1 92,4% (90 từ chưa gặp) · ≥3 55,6% (523 từ < 3 bài, cần ≤ ~237) · ≥5 39,0% · thiếu 481 ngữ cảnh (355 từ). Giờ đọc 14,4/12 ✓.
- **Cách làm:** như P-A1 nhưng bài A2 (120–220 chữ, 4 câu hỏi, mật độ A2 ≥7%) và giỏ 12 từ:
  `sbanks a2 NN --n 10 --size 12 --write`; bài ghi vào `content/readings/a2/a2-pNN.txt` + `content/quiz/a2/a2-pNN.txt`.
  Khoảng 4 lô × 10 bài. Bài A1 viết thêm (P-A1) cũng giúp một phần, nên làm P-A1 trước.
- **Lưu ý:** giỏ A2 nhiều từ pháp luật / tội phạm / chiến tranh / tôn giáo (crime, meurtre, fusil, diable, enfer, preuve,
  avocat). Viết bằng tin tức, truyện trinh thám nhẹ, lịch sử, truyền thuyết; không tả bạo lực.
- **Nhật ký:**

## S-C2 — Truyện C2 cho đủ 49 (tùy chọn) [ ]

- Độ phủ C2 đã đạt hết (≥1 97,9% · ≥3 69,2% · ≥5 30,8% · giờ 16,2/13). Việc này chỉ để số truyện bằng app Anh. Hiện có 39/49.
- **Cách làm:** truyện C2 (5–7 chương, 1.100–2.000 từ theo `dens`, câu TB ≤28,5, mật độ C2 nhắm 3,7–4%).
  - Lô 07 mới viết 3/6: giỏ `c2-s07d/e/f` ĐÃ SINH trong `plan/story-banks/c2.txt` → viết 3 truyện, **nối vào**
    `content/stories/c2/st-07.txt` (+ câu hỏi vào `content/quiz/c2/st-07.txt`).
  - Rồi `sbanks c2 08 --write` (6 truyện, `st-08.txt`), cuối cùng `sbanks c2 09 --n 1 --write` (1 truyện, `st-09.txt`).
- **Nhật ký:**

## S-C1 — Truyện C1 cho đủ 67 (tùy chọn, sau P-C1) [ ]

- Sau P-C1, C1 có khoảng 50/67 truyện. Mỗi lô chạy `sbanks c1 NN --write` (đủ mốc thì tool tự lấy từ < 3 rồi < 5 bài),
  6 truyện/lô, lô cuối lẻ.
- **Nhật ký:**

---

## Ngữ pháp có video B1–C2 (G-B1 → G-B2 → G-C1 → G-C2)

**Cách làm chung** (chi tiết: `code/docs/GRAMMAR_PLAYBOOK.md`; bẫy: memory `grammar-a1a2`):

1. **Lập danh sách cấp:** thêm mục vào `code/content/grammar/curriculum.json`. Mỗi mục gồm `id`, `lv`, `cat` (15
   chuyên mục có sẵn trong `cats`), `t`, `en`, `pts`, `find`, có thể thêm `pre`. Không trùng 54 bài A1–A2 đã có.
   Nguồn: *Inventaire linguistique des contenus clés des niveaux du CECRL* (France Éducation international) + danh sách
   ngữ pháp DELF (https://www.digischool.fr/articles/fle/grammaire-delf-a1-a2-b1-b2/). Xem bài app Anh cùng cấp
   (`~/code/english_words/code/content/grammar/<cấp>/`) để lấy độ dài và nhịp bài, không dịch.
   Danh sách gợi ý dưới đây được thêm hoặc bớt; số bài theo nội dung thật của ngữ pháp Pháp, không chạy theo số của app Anh.
2. **Viết** `code/content/grammar/<cấp>/<id>.txt`, mỗi lô 6–8 bài → `npm run -s grammar:check -- <id…>` (0 lỗi).
3. **Dựng + audio:** `npm run grammar:build` (build → audio edge-tts → build `--prune`). Bài chưa có MP3 thì không xuất bản.
   edge-tts dễ lỗi khi tải nặng: tối đa ~7 luồng cộng lại.
4. Xem 2–3 bài bằng preview `fr-qa` (dev :3002, không cần đăng nhập) ở khổ điện thoại và desktop.
5. `npm run check` → commit (`content/grammar`, `public/data/grammar`; audio `public/audio/grammar` không vào git) →
   ghi Nhật ký → push.

### G-B1 — Ngữ pháp B1 [ ] (app Anh 39 bài)

Gợi ý: plus-que-parfait · kể chuyện quá khứ (PC + imparfait + plus-que-parfait) · conditionnel présent (mong muốn,
lời khuyên, giả định) · si + imparfait → conditionnel · subjonctif présent: cách chia · subjonctif sau il faut que /
vouloir que · subjonctif sau cảm xúc, nghi ngờ · penser que / ne pas penser que (indicatif hay subjonctif) · dont · où
(nơi chốn, thời gian) · ce qui / ce que / ce dont · celui, celle, ceux (-ci/-là, qui/que) · le mien, la tienne… ·
hai đại từ trong một câu (je le lui donne) · đại từ trong câu mệnh lệnh (donne-le-moi, n'y va pas) · gérondif (en + -ant)
· câu bị động (être + participe, par/de) · hợp quá khứ phân từ với avoir (COD đứng trước) · động từ phản thân ở quá khứ kép ·
lời nói gián tiếp ở hiện tại (il dit que, il demande si) · nguyên nhân (parce que, puisque, comme, grâce à, à cause de) ·
kết quả (donc, c'est pourquoi, si/tellement… que) · mục đích (pour, afin de, pour que + subjonctif) · đối lập
(pourtant, cependant, alors que, par contre) · nhấn mạnh c'est… qui / c'est… que · câu hỏi đảo ngữ · phủ định B1
(ne… aucun, ni… ni, ne… que, personne ne / rien ne) · từ phiếm chỉ (quelqu'un, chaque, chacun, plusieurs, certains) ·
động từ + à / de + nguyên mẫu · futur simple / futur proche / présent (quand + futur) · so sánh B1 (de plus en plus,
mieux / meilleur) · avant de + inf, après avoir + phân từ · bày tỏ ý kiến (à mon avis, il me semble que).
- **Nhật ký:**

### G-B2 — Ngữ pháp B2 [ ] (app Anh 36 bài)

Gợi ý: subjonctif passé · hoà hợp thì (concordance des temps) · lời nói gián tiếp ở quá khứ · si + plus-que-parfait →
conditionnel passé · conditionnel passé (tiếc nuối, trách, tin chưa xác nhận) · futur antérieur · tương lai trong quá khứ ·
participe présent & adjectif verbal · nguyên mẫu quá khứ · mệnh đề phân từ (Le travail terminé, …) · faire / laisser +
nguyên mẫu · lequel, auquel, duquel · nhượng bộ (bien que, quoique, même si, malgré, avoir beau) · giả thiết (au cas où,
à condition que, pourvu que, à moins que) · trước / sau (avant que, après que, dès que, jusqu'à ce que) · danh từ hoá ·
bị động nâng cao (se faire + inf, on, se + động từ) · ne explétif · vị trí tính từ đổi nghĩa (ancien, cher, propre) ·
hợp phân từ nâng cao · đại từ trung tính le / en / y thay mệnh đề · động từ đổi nghĩa theo giới từ (manquer à/de,
penser à/de, tenir à) · từ nối lập luận (en outre, néanmoins, en revanche) · quan điểm & nghi ngờ nâng cao ·
mise en relief (ce qui…, c'est…) · n'importe qui / quoi / où · so sánh nâng cao (plus… plus, d'autant plus que) ·
câu hỏi gián tiếp (ce que, si, où).
- **Nhật ký:**

### G-C1 — Ngữ pháp C1 [ ] (app Anh 30 bài)

Gợi ý: passé simple (nhận biết khi đọc) · passé antérieur · subjonctif imparfait / plus-que-parfait (nhận biết) · đảo ngữ
sau peut-être, aussi, sans doute, à peine · ne văn chương (ne… guère, ne… point, je ne saurais) · conditionnel báo chí ·
nhượng bộ nâng cao (quel que, quoi que, qui que, si… que) · giả thiết nâng cao (pour peu que, à supposer que, quand bien
même) · mệnh đề quan hệ + subjonctif (le seul qui…, je cherche quelqu'un qui…) · quan hệ nâng cao (giới từ + qui/lequel,
ce à quoi) · phân từ hoàn thành (ayant fini, étant parti) · sắc thái devoir / pouvoir (il a dû, il aurait pu) · cấu trúc
vô nhân xưng (il s'agit de, il importe que) · câu danh từ & tiêu đề báo · nhấn mạnh bằng tách câu (Moi, je… ; Ce livre,
je l'ai lu) · khẩu ngữ vs văn viết (bỏ ne, on = nous, ça) · từ nối lập luận nâng cao (certes… mais, or, dès lors) ·
présent de narration & imparfait narratif · si hỗn hợp · à peine… que, sitôt.
- **Nhật ký:**

### G-C2 — Ngữ pháp C2 [ ] (app Anh 23 bài)

Gợi ý: hệ thì văn chương (passé simple + passé antérieur + subjonctif imparfait) · đảo ngữ văn chương (Ainsi parlait-il ;
Rares sont… ; Telle est…) · si văn chương (eût-il su, n'eût été) · que thay liên từ lặp · ne một mình (je n'ose, si je ne
me trompe) · tỉnh lược & câu không động từ · đồng vị ngữ, phân từ tách rời · hợp giống/số hiếm (gens, amour/délice/orgue,
demi, nu, tính từ màu ghép) · dấu câu & nhịp câu · ngữ pháp thân mật (faut, t'as, câu tách) · lời nói gián tiếp tự do ·
sắc thái (ne pas laisser de, ne pas manquer de, il n'empêche que) · câu cảm thán & câu hỏi tu từ (Que de… !) · từ nối văn
học thuật (force est de, nonobstant, d'aucuns) · nguyên mẫu danh từ hoá (le savoir-faire) · cấu trúc cố định (faire en
sorte que, à force de, tant et si bien que).
- **Nhật ký:**

---

## X-series — Truyện dài chia phần + chuỗi bài đọc (tùy chọn) [ ]

- App Anh có 6 tác phẩm dài chia phần (46 truyện: Oz A2, The Treasure Seekers B1, Around the World in Eighty Days B2,
  The Time Machine C1, Herland và The Age of Innocence C2) và 28 bài đọc theo chuỗi cùng chủ đề (trường `series:`, nút
  "Phần n/m" → phần sau). App Pháp: `lib/data.ts` đã có kiểu `series` cho bài đọc nhưng chưa có nội dung, giao diện chưa kiểm.
- **Cách làm:** port giao diện từ app Anh (`components/library/reading-reader.tsx`, `story-reader.tsx`, `lib/library.ts`), rồi kể lại 1
  tác phẩm/cấp từ phạm vi công cộng. Gợi ý: Ségur *Les Malheurs de Sophie* (A2), Malot *Sans famille* (B1),
  Verne *Le Tour du monde en quatre-vingts jours* (B2), Leroux *Le Mystère de la chambre jaune* (C1), Balzac
  *Eugénie Grandet* (C2). Tránh *Le Petit Prince*, vì ở Pháp chưa thuộc phạm vi công cộng.
- **Nhật ký:**

## X-skip — "Bắt đầu từ A1 / bỏ qua cấp" (tùy chọn) [ ]

- Port commit app Anh `1d0852e` "Let new learners start from A1 and skip levels in settings" (xem `git show --stat 1d0852e`
  trong `~/code/english_words`: chủ yếu `components/level-grid.tsx`, `settings-panel.tsx`, `word-browser.tsx`, `app/hoc/[level]`,
  `app/on-tap`, `app/tien-do`).
  Giữ đặc thù Pháp (lộ trình khởi động `lib/starter.ts`, tiền tố `fr.`). Kiểm `npm run check` + `npx playwright test`.
- **Nhật ký:**

---

## Không làm / ý tưởng chưa lên lịch

- **Video hội thoại** (port bộ máy video + lời thoại 2 giọng): người dùng bảo bỏ qua (20/10/2026).
- Soát cấp độ 11.000 từ với FLELex (https://cental.uclouvain.be/cefrlex/flelex/download/, CC BY-NC 3.0).
- Script so sánh 2 app (liệt kê file mới bên app Anh, diff file chung sau khi chuẩn hoá `en`→`fr`).
- Về lâu dài: tách lõi giống nhau của 3 app (`srs-pure`, `sync-merge`, `db`, `review-runner`…) thành gói dùng chung.

## Đồng bộ tính năng với app Anh

- **Mốc: app Anh `7246f71`** (20/10/2026). Đã port mọi tính năng tới mốc này, trừ `1d0852e` (= X-skip).
- Lần sau: `cd ~/code/english_words && git log --oneline 7246f71..` → thêm việc mới vào file này → port, giữ đặc thù
  Pháp: mạo từ un/une, câu chọn giống (mở sau bài `giong-danh-tu`), chia động từ, `lib/starter.ts`, 6 cấp A1–C2,
  tiền tố `fr.`/`fr:`, DB `french-words`, backup `fr-words`, test vitest → đổi mốc ở dòng trên.

## Đã xong (hiện trạng 20/10/2026)

- Từ vựng 11.000 từ A1–C2: 5 câu ví dụ/từ (55.000 câu, có audio), nhãn văn phong, họ từ, cụm đi kèm.
- Bài đọc 1.699 (A1 160 · A2 252 · B1 353 · B2 372 · C1 373 · C2 189, kể cả bài lấp từ), 3–4 câu hỏi/bài, có audio.
- Truyện 344 (A1 54 · A2 62 · B1 79 · B2 68 · C1 42 · C2 39), 3 câu hỏi/chương, có audio.
- Độ phủ từ đạt "Mục tiêu 2.0" ở B1, B2, C2.
- Ngữ pháp video A1 27 + A2 27 bài (bộ máy port từ app Anh 18/10; CSS bài giảng sửa 20/10 `efab1e5`).
- Thư viện: trang theo cấp, trình đọc karaoke, đánh dấu đã đọc qua câu hỏi cuối bài, đồng bộ vị trí đọc truyện,
  chỉ mục từ → bài, mỗi bài một file JSON (`8f904bb`, `98c7b32`); e2e 46/46 (`90b03d4`).
