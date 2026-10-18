# Ngữ pháp — Playbook (app Pháp)

Ngữ pháp = hệ học riêng (ngang Từ vựng · Thư viện), route `/ngu-phap`, sáu cấp A1 → C2. Mỗi bài = **video giảng
giải tương tác** (không phải MP4: `lesson JSON + 1 audio`, bảng / trục thời gian / cảnh hội thoại vẽ ở client bằng
component dùng chung) + luyện tập + liên kết sang Từ vựng, Thư viện và lịch ôn. Port từ app Anh
(`english_words/code/docs/ENGLISH_GRAMMAR_PLAYBOOK.md`, commit 1f39e08 + 92caa54) — bộ máy, định dạng nguồn, player giữ
nguyên (trường `en` trong JSON = câu TIẾNG PHÁP, giữ tên để diff/port tiếp); curriculum, nội dung, giọng đọc, IPA viết
mới cho tiếng Pháp.
Tài liệu này chỉ giữ nguyên tắc lâu dài — số liệu hiện tại: `npm run grammar:check -- --coverage`, checkpoint:
`npm run grammar:state`.

## 1. Curriculum

- Nguồn sự thật: `content/grammar/inventory.json` (điểm ngữ pháp) → `content/grammar/curriculum.json` (bài, thứ tự,
  nhóm) → `content/grammar/{cấp}/{id}.txt` (nội dung bài) → build.
- CEFR không có danh sách ngữ pháp tuyệt đối. Cấp của một điểm là **cấp dạy**, tổng hợp từ: Inventaire linguistique
  des contenus clés des niveaux du CECRL (France Éducation international / Eaquals), danh sách ngữ pháp DELF A1–A2,
  CEFR Companion Volume (2020); cân theo giao tiếp, tần suất, tiên quyết và **tần suất trong thư viện** (`--corpus`).
  Người học là người Việt: ưu tiên chỗ tiếng Việt khác hẳn (giống đực / cái, mạo từ un / le / du, chia động từ theo
  ngôi, hợp giống số tính từ, phủ định hai mảnh ne… pas, “có” = avoir / il y a, tuổi dùng avoir, c'est / il est,
  passé composé avoir / être, quá khứ ≠ “đã”).
- Id 11 bài của khoá chữ cũ giữ nguyên (cau-co-ban, giong-danh-tu, mao-tu-xac-dinh, so-nhieu, etre-avoir, dong-tu-er,
  phu-dinh, cau-hoi, tinh-tu, so-huu, gioi-tu-di-lai): tiến độ cũ + cổng câu chọn un/une (`genderTaught()` mở sau bài
  `giong-danh-tu`) đọc theo id.
- Mỗi điểm: `id` (ổn định), `lv`, `cat`, `name`, `vi`, `pre` (tiên quyết), `vs` (dễ nhầm), `rel` (liên quan), `reg`
  (spoken · written · formal · informal · academic · literary), `pri` (1 cốt lõi · 2 quan trọng · 3 mở rộng).
  **Đồ thị phụ thuộc nằm ở `pre` của điểm**; quan hệ bài ↔ bài (Nên học trước · Dễ nhầm với · Liên quan) suy ra từ
  điểm, `vs` đối xứng. Ví dụ chuỗi: đại từ → être / avoir → -er → passé composé avoir → être → imparfait → PC vs
  imparfait; le / la → du / de la → pronom en; à + lieu → pronom y.
- `probes` trong inventory = mẫu cần canh trong corpus mà chưa phải điểm riêng; `--corpus` in tần suất để soát.
- Id điểm / bài đã phát hành là **ổn định** (tiến độ người học lưu theo id bài): sửa nội dung giữ id; thêm bài = nối
  vào đúng vị trí trong curriculum; không tái dùng id đã bỏ.
- Kiểm (`checkCurriculum`, chặn build): mọi điểm thuộc ≥ 1 bài; điểm không cao hơn cấp bài; tiên quyết không ở cấp
  cao hơn và không nằm ở bài đứng sau; bài xếp theo cấp; nhóm / regex hợp lệ.

## 2. Nhóm và độ hạt của bài

- Nhóm (`cats` trong curriculum.json): câu & trật tự từ · động từ · thì & thể · động từ tình thái · danh từ & giống ·
  mạo từ & từ hạn định · đại từ & sở hữu · tính từ & trạng từ · so sánh · giới từ · câu hỏi · phủ định · điều kiện &
  lịch sự · mệnh đề quan hệ · liên từ & mệnh đề (B1+ thêm nhóm khi cần).
- **Điểm ≠ bài.** Gom các mẫu nên học cùng nhau (c'est / il est · passé composé / imparfait · savoir / connaître ·
  meilleur / mieux) thành bài `kind: contrast` khi trọng tâm là CHỌN giữa chúng. Chủ đề
  lớn chia nhiều bài theo cấp (thì & thể, modal, điều kiện, mệnh đề, mạo từ).
- Một bài 1–4 điểm; ưu tiên hiểu sâu + dùng được hơn số bài. Không làm bài cho cấu trúc cực hiếm không có giá trị thật.

## 3. Tiến trình theo cấp

| Cấp | Trọng tâm | Cách giảng |
|---|---|---|
| A1 | đại từ, être / avoir, giống + un / une / le / la, số nhiều, -er, ne… pas, câu hỏi, tính từ, sở hữu, à / en / au, aller / faire / venir, vouloir / pouvoir, mệnh lệnh, il y a, c'est / il est, du / de la, giờ – ngày, futur proche, phản thân | trực quan, ít thuật ngữ, câu ≲ 10 từ, từ ≤ A1 (kề A2 được) |
| A2 | passé composé (avoir / être), imparfait, PC vs imparfait, futur simple, le / la / lui / leur, y, en, đại từ nhấn mạnh, so sánh, -ment, devoir / il faut, ne… jamais / plus / rien, qui / que / où, depuis / il y a, venir de, si + présent, conditionnel lịch sự, quel, savoir / connaître | bắt đầu đối chiếu cặp dễ nhầm |
| B1 | đối chiếu thì, hoàn thành tiếp diễn, quá khứ tiếp diễn / hoàn thành, tương lai, điều kiện 2 / 3, bị động, tường thuật, quan hệ, mẫu động từ, câu hỏi gián tiếp, liên kết | form + meaning, lý do chọn |
| B2 | sắc thái thì / thể, suy đoán, modal perfect, điều kiện hỗn hợp, biến thể bị động, động từ tường thuật, phân từ, rút gọn quan hệ, nhấn mạnh, cụm danh từ, liên từ diễn ngôn, trang trọng / thân mật | form + meaning + **choice** |
| C1 | đảo ngữ, câu chẻ, modal nâng cao, rào đón, lập trường, tỉnh lược / thay thế, danh hoá, điều kiện tinh tế, tường thuật có thái độ, cấu trúc thông tin, liên kết, văn học thuật | nêu sắc thái + văn phong, ví dụ nghề nghiệp / học thuật |
| C2 | lựa chọn thì / thể tinh tế, tình thái, trật tự đánh dấu (fronting, đảo nơi chốn), extraposition, tỉnh lược nâng cao, đóng gói thông tin, văn danh từ vs động từ, cụm danh từ dày, diễn ngôn, chuyển văn phong, nhấn mạnh tu từ, tránh mơ hồ | dạy **cách chọn cách nói**, không thêm công thức hiếm |

## 4. Cấu trúc một bài (dùng phần phù hợp, không ép đủ)

`#hook` mở đầu (cảnh / cặp câu / lỗi hay gặp / câu đố thật) · `#meaning` ý nghĩa · `#form` cấu trúc · `#examples` ví dụ ·
`#real` trong đời sống · `#dialogue` hội thoại · `#contrast` phân biệt · `#natural` tự nhiên hay không · `#pronunciation`
phát âm · `#mistakes` lỗi thường gặp (❌ → ✅ + lý do) · `#recall` thử nhớ lại (video tự dừng, bấm mới hiện đáp án) ·
`#recap` tóm tắt · `#practice` luyện tập.

- Độ dài theo nội dung: A1–A2 ≈ 1,5–2,5 phút · B1–B2 ≈ 2–3 · C1–C2 ≈ 2,5–3,5. Không kéo cho đủ phút.
- Lời giảng tiếng Việt giọng Bắc, như giáo viên nói: ngắn, cụ thể, xưng “mình / bạn” cố định. Mọi chữ tiếng Pháp trong
  lời giảng nằm trong `[[…]]` (giọng Pháp Denise đọc); không đọc ký hiệu (S + V + O, →, /) — nói “chủ ngữ, động từ”, ký
  hiệu để trên bảng. ≤ 3 mảnh tiếng Pháp mỗi đoạn, đặt ở cuối vế; mảnh một chữ cái / một âm (y, à, l') đọc lạc — viết
  cả cụm (`[[j'y vais]]`, `[[à Paris]]`). Nhãn ngữ pháp tiếng Pháp (passé composé, imparfait) cũng để trong `[[…]]`.
- **Chống khuôn**: mỗi bài một cách mở khác (cảnh, câu đố, lỗi, tình huống thật, cặp đối chiếu); hội thoại đổi bối cảnh
  / nhân vật; tóm tắt không lặp một câu mở. `check-grammar` cảnh báo mở bài / câu thoại đầu / lời tóm tắt / kiểu mở lặp
  > 15% bài của cấp và câu ví dụ trùng giữa các bài. Khi nhiều bài bắt đầu “có mùi máy”: **dừng → sửa chiến lược
  chung → viết lại phần bị ảnh hưởng**.
- A1–B1 ưu tiên rõ ràng; B2–C2 tăng dần sắc thái, độ tự nhiên, văn phong, diễn ngôn, lựa chọn phong cách (`#natural`
  với bảng rank: tự nhiên nhất · đúng nhưng ít dùng · đúng ngữ pháp nhưng lạ · sai).

## 5. Ví dụ

- Tự nhiên, đúng cấp (từ ≤ cấp bài — bộ kiểm dùng chung analyzer của Thư viện `fr-vocab.mjs`; tên riêng khai `names:`,
  thuật ngữ `gloss:`), thể hiện rõ mẫu, không nhồi từ khó. **Chính tả Pháp như Thư viện**: một khoảng trắng TRƯỚC ? ! ; :
  (`Tu viens ?`), nháy thẳng ' cho lược âm, « » cho trích dẫn (bộ kiểm chặn sai). Không sinh câu chỉ thay danh từ trong một khuôn; mỗi câu một tình
  huống: gia đình, công việc, trường học, du lịch, công nghệ, mạng xã hội, cuộc họp, phỏng vấn; C1–C2 thêm học thuật /
  chuyên môn.
- Thứ tự: câu cơ bản (thấy khung) → câu đời sống → hội thoại (mẫu xuất hiện tự nhiên ≥ 2 lần).
- Chỗ cần nhấn đánh `{…|vai}`: `k` dạng đang học (mặc định) · `s` chủ ngữ · `v` động từ · `a` trợ động từ · `o` tân
  ngữ · `t` thời gian / nơi chốn · `n` phủ định · `q` từ hỏi · `c` bổ ngữ / mệnh đề. Lời giảng nhắc `[[…]]` trùng một
  chỗ nhấn / ô bảng / mốc trục → chỗ đó sáng lên đúng lúc (cue tính lúc build).
- Câu sai (❌) chỉ hiện, **không đọc**; câu đúng đọc. Câu `odd` / `bad` trên bảng rank cũng không đọc.
- Dùng tình huống / nhân vật quen từ Thư viện khi hợp; không chép nguyên văn hàng loạt. Liên kết corpus thật (≤ 3 câu
  mỗi bài) do build tìm bằng regex `find` — không viết tay.

## 6. Hội thoại, nhân vật, bối cảnh

- Vai dùng chung ở `content/grammar/cast.json` (rig Video + giọng fr-FR / fr-BE / fr-CH, bộ `scripts/lib/grammar-spec.mjs`):
  lea, hugo, nam, linh, chloe, lucas, maman, papa, mamie, papi, zoe, tom, mme-martin, m-dubois, dr-roux, ines, paul,
  karim. `cast: lea nam` (+ `ines:call` người ở đầu dây).
  Chỗ đứng tự xếp theo thứ tự xuất hiện; vai bước vào trước câu đầu và rời sau khúc cuối mình nói.
- Bối cảnh = id của Video (`bg: kitchen`), đạo cụ `prop: mug x=900`; chú thích cuối lượt thoại như Video: biểu cảm,
  cử chỉ, `@đạo-cụ`, `~bong-bóng`, `ai:biểu-cảm`, `pause=`, `ipa=`.
- Cô giáo (rig “woman”, áo xanh, kính) giảng trên bảng; giọng Việt `vi-VN-HoaiMyNeural`, tiếng Pháp của cô
  `fr-FR-DeniseNeural` (cùng giọng của từ / câu ví dụ trong app).

## 7. Nguồn bài (`content/grammar/{cấp}/{id}.txt`)

```text
=== present-simple                                   ← id = tên file
sum: Tóm tắt 1–2 câu (tiếng Việt)
form: I / you / we / they + V | thói quen, sự thật     ← công thức cho bảng Tóm tắt (lặp được)
cast: mia nam · bg: kitchen · prop: mug x=900 · words: work, live (headword → “Từ trong bài”) · names: · gloss:

#hook
mia: I work in a bank. | Mình làm ở ngân hàng. [happy]    ← hội thoại (vai trong cast) → cảnh
> Lời giảng tiếng Việt, tiếng Pháp trong [[I work]].       ← đứng trên bảng hiện tại (mở phần mới → thẻ tên phần)
- He {works|k} at night. | Anh ấy làm ca đêm. || ghi chú  ← câu ví dụ, bảng mới
+ She {works} too. | …                                     ← câu giữ bảng hiện tại (trục, công thức, bảng, phát âm)
f: Chủ ngữ + [V] + tân ngữ || chú thích · f2: …            ← công thức; [..] = chip tiếng Pháp
vs: I work. | … [ipa=…] || thói quen                       ← cặp đối chiếu (các dòng vs liền = một bảng; chú thích trước ||)
x: He work here. => He works here. | … [ipa=…] >> Lời giải thích   ← lỗi thường gặp (chú thích, nếu có, đặt trước >>)
? Nói bằng tiếng Pháp: … => Réponse française | nghĩa          ← thử nhớ lại (tự dừng)
tl: -2..0 have lived | đã sống tới giờ · tl: ~-1 was cooking · tl: -1 rang · tl: now | bây giờ   ← trục thời gian
mv: You are tired . => Are you tired ?                     ← di chuyển từ (FLIP)
th: Chủ ngữ | be · tb: I | am                               ← bảng (th = tiêu đề)
pron: I am | I'm | aɪm · pron: worked | /t/ | wɝkt          ← phát âm (IPA tự tra nếu bỏ trống)
rank: best | EN | VI · rank: odd | EN | VI                  ← tự nhiên hay không

#practice
fill: She ___ tea. | likes* / like / liking || lý do      ← * = đáp án đúng; ` / ` tách phương án
contrast: … ___ … | a* / b · type: I ___ (go) yesterday. | went · choice: đề | … · natural: câu* / câu
fix: câu sai | sửa* / … · transform: yêu cầu | câu gốc >> đáp án* / …
order: Yesterday / I / went / home. | nghĩa || alt: I / went / home / yesterday.
listen: câu có trong bài | câu nghe được* / câu gần giống   (bỏ phương án = chọn nghĩa Việt)
```

- Build tự: IPA theo từ (`scripts/lib/fr-ipa.mjs`: Lexique 3.83 mọi dạng biến hình → IPA bộ từ; lược âm / gạch nối ghép
  từ phần; dạng từ điển, không nối âm), chỗ đứng / vào–ra của vai, bảng tên phần, cue, “nghe rồi
  chọn” và “câu nào tự nhiên” (từ phần lỗi) nếu nguồn chưa có.
- Từ đồng tự khác âm (fils, président, violent… — `HETERONYMS` trong fr-ipa.mjs) phải khai `[ipa=fils:fis]` theo nghĩa
  (hoặc `fils:=`). "plus" mặc định /ply/; câu cần /plys/ thì khai `ipa=plus:plys`.
- Bảng, tóm tắt, trục thời gian, câu di chuyển tự co chữ / né chồng lấn theo nội dung; soát bằng
  `TYPES=table,timeline node scripts/grammar-frames.mjs …` khi thêm bảng dày (≥5 dòng hoặc 3 cột ô dài).

## 8. Audio

- Một track / bài: TTS từng mảnh (cache `scripts/.grammar-tts-cache/`, xoá được), cắt lặng, cân RMS giữa giọng, nghỉ
  0,12 s giữa mảnh Việt ↔ Pháp (0,3 s sau dấu câu), 0,45–0,7 s giữa đoạn, +0,35 s khi sang phần. Tốc độ tiếng Pháp của
  cô = A1 −15% → B2 0 (`grammar-spec.mjs` RATE), hội thoại A1 −12%, A2 −8%; người học còn chỉnh 0,75 / 1,25×.
- **MP3 CBR 48 kbps mono 24 kHz** (như Bài đọc; Video 64 vì trộn nhiều giọng). Đã đo ở app HSK trên cùng nguồn
  edge-tts (vốn là MP3 48k): 64k ≈ 48k về độ méo phổ, 40k tụt hẳn, 32k mất ~½ năng lượng > 5 kHz (s / z / ʃ — đúng
  những âm cuối -s, -es mà bài ngữ pháp dạy). Opus / AAC nhỏ hơn nhưng rủi ro tương thích + tua kém chính xác.
- Không giữ WAV / trung gian; mốc thời gian `scripts/.grammar-audio/{key}.json` (key = hash phần ĐỌC + phiên bản
  thông số → sửa nghĩa, bài tập, bảng không phải TTS lại). Kiểm “✓ đồng bộ” trên bản giải mã.
- `preload="none"`: mở bài không tải audio; bấm phát hoặc “nghe rồi chọn” mới tải — cùng một file nên luyện tập không
  tốn request mới.

## 9. Video giảng giải (không MP4)

- Bảng (`components/grammar/stage.tsx`): `title` (bìa / thẻ tên phần) · `formula` · `line` (câu lớn tô vai + karaoke) ·
  `pair` · `fix` (❌ gạch → ✅ hiện ra) · `timeline` (điểm, khoảng, gợn sóng = tiếp diễn, now) · `move` (FLIP) · `table`
  · `sound` · `rank` · `quiz` (tự dừng) · `recap` · `scene` (sân khấu Video tải lười). Không chuyển động trang trí.
- Player dùng chung đồng hồ với Video (`components/video/use-lesson-audio.ts`: điểm dừng `gate` cho nhớ lại / nói
  theo / nhập vai), transcript tự cuộn (`use-follow-scroll.ts`), lớp Français · IPA · Việt + Luyện nghe
  (`LayerBar`, khoá `fr.grammarLayers`); tua, lặp đoạn, tốc độ (`fr.grammarRate`), phím Space / ← / → / R.
- Mọi chuyển động là hàm của t → xuất MP4 sau này (nếu cần) chỉ việc gọi lại theo khung; không lưu MP4.

## 10. Luyện tập, tiến độ, liên kết

- 6–8 câu / bài, ≥ 4 dạng, có `why` cho câu dễ sai; nhiễu phải **sai rõ** trong ngữ cảnh. `listen` ưu tiên chọn đúng
  câu nghe được giữa các biến thể ngữ pháp (walk / walked, I'd / I'll) — luyện nghe hình thái.
- ≥ 70% → đã học; lịch ôn riêng 1 · 3 · 7 · 14 · 30 · 60 · 120 ngày (không trộn hàng đợi thẻ từ; màn Ôn tập nhắc bài
  tới hạn). Mỗi câu trả lời tính vào thống kê ngày + XP như Luyện tập tự do.
- Tích tay "Đã học" (danh sách hoặc trang bài, không luyện) = đã học nhưng **không xếp lịch ôn** (cờ `man`); lần luyện
  tập sau đó mới là mốc đầu của lịch.
- Tiến độ: localStorage `fr.grammarDone` (KHÁC app Anh dùng Dexie — giữ để `genderTaught()` đọc đồng bộ), mỗi bài một
  chuỗi mã hoá (`encodeGrammarRow`), hook `useGrammarRows` (sự kiện `fr:grammar`) → đồng bộ qua trường `grammar:
  string[]` sẵn có của doc người dùng (hợp nhất giao hoán / idempotent — không đổi Firestore rules) và tệp sao lưu. Mục
  kiểu cũ `id~mốc[~0]` của khoá chữ vẫn đọc được.
- Liên kết (tính lúc build trang, không tải thêm; app Pháp chưa có Video): Vocabulary → Grammar (thẻ từ hiện bài có từ đó là chip tiếng Pháp
  trên bảng công thức — `word-refs.json` vài KB, tải lười); Reading / Story / Video → Grammar (≤ 3 bài có mẫu nổi bật,
  video ưu tiên câu trọng tâm); Grammar → Thư viện (≤ 3 câu corpus thật); Grammar → Từ vựng / SRS (“Từ trong bài” mở
  thẻ từ, “Học từ này”).

## 11. Dữ liệu, Firebase (static-first)

- Hub / cấp / nhóm là HTML tĩnh, danh sách sinh lúc build từ `public/data/grammar/index.json` (client KHÔNG tải chỉ
  mục). Mở bài = HTML + 1 JSON bài (`?v=hash`, ~15–30 KB) + chunk JS dùng chung + asset cảnh tải lười + audio khi phát.
  Link danh sách `prefetch={false}`. Không Firestore cho nội dung; không thêm thư viện runtime; không font mới.
- Trang Ngữ pháp là route riêng → player / bảng / luyện tập chỉ tải khi mở Ngữ pháp; Home và trang khác không kéo.

## 12. Kiểm & build

- `npm run grammar:check [-- id… | --level a1 | --coverage | --corpus]` — curriculum + nguồn (lỗi chặn build: cấu trúc,
  vai / bối cảnh / đạo cụ lạ, bảng không có đoạn, bài tập sai, heteronym chưa khai IPA, ký hiệu TTS trong lời giảng);
  cảnh báo: từ vượt cấp, câu dài, thiếu phần, câu lặp, nghi tiếng Pháp lọt ra ngoài `[[…]]`, khuôn lặp giữa các bài.
- `npm run grammar:build` (= build → `build-grammar-audio.py` → build `--prune`) → `npm test` (gồm
  `test-grammar.mjs` qua `lib/grammar-script.test.mjs`: hàm thuần, mã hoá đồng bộ, curriculum, mọi bài đã build) → soát
  hình `BASE=http://localhost:3002 node scripts/grammar-frames.mjs [id…|--level a1]` (contact sheet giữa từng bảng;
  `VW=390` = điện thoại) trên dev server không Firebase (preview `fr-qa`).
- Audio cần venv `scripts/.venv` (python3.12, `edge-tts==7.3.1 numpy lameenc`; bản edge-tts cũ bị 403).
- Checkpoint `npm run grammar:state -- --level a1 [--validated a1]` → `.french-grammar-state.json` (không commit): mất
  ngữ cảnh thì đọc Playbook → checkpoint → inventory / index → làm tiếp bài `pending`, không làm lại bài đã duyệt.

## 13. Checklist mỗi cấp

- [ ] Pass 1 — curriculum: viết bài theo thứ tự; `grammar:check --level xx` sạch lỗi, cảnh báo đã xử lý hoặc chấp nhận.
- [ ] Pass 2 — gap review: `--coverage` (điểm, trọng số ưu tiên, cặp đối chiếu), `--corpus` (mẫu hay gặp chưa có bài,
      probe), khuôn lặp, trùng lặp; sửa curriculum / bổ sung bài trước khi coi cấp là xong.
- [ ] Review 3 vòng: ngôn ngữ & sư phạm (đúng, tự nhiên, dịch, bài tập) · curriculum (phủ, tiên quyết, trùng, tiến
      trình) · kỹ thuật (schema, audio ✓ đồng bộ, contact sheet, UI 390 px + desktop, dung lượng).
- [ ] `grammar:build` + `npm test`; `grammar:state -- --validated xx`.
