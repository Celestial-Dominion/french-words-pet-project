# Cách viết bài đọc & truyện (app Pháp)

Chuẩn chung cho mọi lô bài đọc / truyện. **Việc cần làm + tiến độ: `plan/TASKS.md`** (ở gốc repo).
Ngữ pháp có video viết theo `docs/GRAMMAR_PLAYBOOK.md`. Lệnh dưới đây chạy trong `code/`.

Gộp từ các kế hoạch cũ đã xoá 20/10/2026 (`story-plan.md`, `gap-plan.md`, `readings-*-plan.md`, `english_parity_plan.md`).
Bẫy chi tiết theo cấp nằm trong memory của Claude: `readings-a1a2`, `stories-a1a2`, `readings-b1b2`, `readings-c1c2`,
`gap-articles`, `stories-b1c2`.

## 1. Nguyên tắc

- **Viết tay cả hai dòng `FR | VI`.** Dịch máy (Apple, `content-mt.mjs`) sai khoảng ½ số câu (xưng hô, tên riêng).
  Chỉ dùng `content-mt.mjs fill` để bung các cụm `> ~…` trong câu hỏi.
- **Không lấy văn bản online.** Đã thử quét Gutenberg: nhiều từ ngoài từ điển, mật độ thấp, nên đã bỏ; đừng đề xuất lại.
  Được kể lại tác phẩm phạm vi công cộng (La Fontaine, Perrault, Daudet, Maupassant, Verne, Hugo, Ségur…), tối đa 1 bài/lô:
  khai `source:`, `license: public domain`, `source-url:` (kiểm URL tồn tại), rồi thêm tác giả vào dòng ghi công trong
  `components/settings-panel.tsx`.
- **Mục tiêu là độ phủ từ, không phải số bài.** Mục tiêu nằm ở `TARGETS` trong `scripts/lib/content-spec.mjs`
  (cùng "Mục tiêu 2.0" của app Anh). Số truyện bằng app Anh chỉ là việc tùy chọn.
- Bỏ nội dung tình dục, chính trị, bạo lực. Làm nhẹ đi khi kể lại.

## 2. Đo độ phủ

```bash
npm run -s content:coverage -- --targets   # cả thư viện: giờ đọc, phủ ≥1/≥3/≥5 so với mục tiêu, "thiếu ngữ cảnh"
npm run -s content:coverage -- --stories   # chỉ truyện + số truyện so với app Anh
```

- "Bài" = một bài đọc hoặc một truyện ở cấp **≤ L**. Một truyện chỉ tính MỘT ngữ cảnh: dùng một từ nhiều lần trong cùng
  truyện không làm tăng độ phủ.
- "Thiếu ngữ cảnh" = tổng số lần từ đích phải gặp thêm (mỗi lần ở một bài khác) để đạt cả ba mốc. Khi về 0 là đạt.
- Từ đích lọc bằng `isTarget` (`scripts/lib/fr-vocab.mjs`): đã bỏ chữ cái đơn, viết tắt, từ tục chưa gắn nhãn văn phong.

## 3. Giỏ từ (`scripts/content-kit.mjs`)

| Lệnh | Dùng khi |
|---|---|
| `need <cấp> [k=3] [N]` | liệt kê từ của cấp đang gặp < k bài (dòng đầu in tổng số từ) |
| `banks <cấp> --size 14 --write` | giỏ từ **chưa gặp bài nào** → `plan/gap-banks/<cấp>.txt`. Sinh MỘT lần rồi giữ cố định (sinh lại sẽ đảo thứ tự giỏ) |
| `sbanks <cấp> <lô> [--n 6] [--size N] --write` | giỏ cho một lô theo độ phủ HIỆN TẠI: từ gần ngưỡng trước (đang 2 bài → cần 1 để đạt ≥3; đang 4 → ≥5), rồi tới từ thường gặp hơn → nối vào `plan/story-banks/<cấp>.txt` (mã `c1-s08a`…). Sinh lúc bắt đầu lô. Dùng được cho cả bài đọc |
| `bankcheck <cấp>/<file>` | bài có dòng `// giỏ <mã>` đã dùng bao nhiêu từ của giỏ. Mốc đạt: thiếu ≤ 4 từ hoặc dùng ≥ 80% (lấy mốc thấp hơn) |
| `dens <id>…` | số từ · câu TB · % từ đúng cấp · % vượt cấp · số từ "thiếu" bài này phủ |
| `lv <từ>…` | cấp của từng từ ("?" = ngoài từ điển). **Tra trước khi viết** |

- File giỏ trong `plan/gap-banks/` và `plan/story-banks/` là **dữ liệu** của các lệnh trên, không phải kế hoạch: giữ nguyên.
- Giỏ hay lẫn "từ rác" (từ tục, từ lạ: couillon, avorter, fi, pet, peloter…): bỏ qua, chỉ cần đạt mốc `bankcheck`.
- Dạng từ: ưu tiên nguyên mẫu, giống đực số ít. Dạng giống cái / số nhiều / chia ngôi / viết hoa đầu câu, từ nằm trong tên
  riêng hoặc tiêu đề chương thường KHÔNG được tính cho từ giỏ.

## 4. Chuẩn theo cấp (`SPEC` trong `scripts/lib/content-spec.mjs`)

| Cấp | Bài đọc (chữ) | Câu TB (từ) | Mật độ đúng cấp | Truyện: chương · chữ cả truyện | Câu hỏi ≤ / phương án ≤ (từ) | Câu hỏi mỗi bài |
|---|---|---|---|---|---|---|
| A1 | 80–150 | 4–10,5 | – | 3 · 280–520 | 10 / 8 | 3–4 |
| A2 | 120–220 | 6–13,5 | ≥ 7% | 4 · 380–820 | 13 / 10 | 4 |
| B1 | 180–320 | 9–16,5 | ≥ 5% | 5 · 600–1100 (nhắm ~800) | 16 / 13 | 4 |
| B2 | 250–450 | 12–20,5 | ≥ 5% | 5–6 · 800–1450 (~1050) | 20 / 16 | 4 |
| C1 | 350–650 | 15–24,5 | ≥ 4,5% | 5–6 · 1000–1800 (~1250) | 24 / 18 | 4 |
| C2 | 450–800 | 17–28,5 | ≥ 3,5% (nhắm 4%) | 5–7 · 1100–2000 (~1300) | 28 / 20 | 4 |

- Truyện: **3 câu hỏi/chương**. B1 dùng passé composé + imparfait (passé simple bị cảnh báo); từ B2 trở lên tự do.
- Vượt cấp: A1 ≤ 5% (từ xa ≥ 2 cấp ≤ 1,5%), A2 ≤ 4%, B1 ≤ 3%. Cấp từ xếp theo tần suất phụ đề nên nhiều từ "chủ đề A1"
  (boulangerie, supermarché) lại nằm ở B2: phải tra `lv`.
- Mỗi topic ≤ 15% số bài của cấp. Topic hợp lệ: `lib/library-labels.ts` (không có `sport`).

## 5. Định dạng file

Bài đọc `content/readings/<cấp>/<tên-lô>.txt`, truyện `content/stories/<cấp>/st-NN.txt`, câu hỏi cùng tên file trong
`content/quiz/<cấp>/`. Dòng đầu file là chú thích `// <Cấp> <loại> lô NN — ngày. Chuẩn: docs/CONTENT_PLAYBOOK.md`.

```
=== rd-a1-slug                       (truyện: st-<cấp>-slug; id cũ giữ nguyên để giữ tiến độ "đã đọc")
// giỏ a1-s01a                       (nếu bài viết theo giỏ)
title: Tiêu đề FR | Tiêu đề VI       (duy nhất toàn thư viện, mọi cấp — grep trước)
topic: daily-life
genre: narrative                     (bài đọc; thể loại bắt buộc theo cấp: TARGETS.genres)
summary: Tóm tắt VI 1–2 câu, không lộ kết.   (truyện)
names: Tên riêng, …                  (mọi tên dùng trong bài VÀ câu hỏi)
gloss: từ ngoài từ điển thật cần (≤ 4; chỉ cho từ ≥ B2, hoặc từ B1 xuất hiện ≥ 3 lần)
## Tên chương FR | VI                (truyện)
Câu FR | Câu VI                      (đoạn cách nhau bằng dòng trống)
```

Câu hỏi:

```
=== rd-a1-slug                       (truyện: === st-…-slug <số chương>)
? Câu hỏi FR ? | Câu hỏi VI?
+ Đáp án đúng | VI
- Phương án sai | VI                 (3 phương án sai)
> Bài đọc: «trích nguyên văn»        (truyện: > Trong truyện: «…» — đúng chương, đúng hoa/thường, không lồng « »)
```

## 6. Quy tắc câu hỏi (bộ kiểm hay bắt)

- Đáp án đúng phải ngắn hơn 1,3 lần phương án sai dài nhất (viết phương án sai dài ngay từ đầu). Cấm phương án
  "aucune / toutes… / les deux".
- Chỉ dùng từ có trong từ điển hoặc trong `names:`/`gloss:`. Từ vượt cấp trong câu hỏi phải xuất hiện trong bài
  (truyện: trong chương 1..n).
- Tiếng Việt có dấu đầy đủ. Phương án VI quá ngắn hoặc chỉ có tên riêng bị báo "không dấu", nên viết dài hơn.

## 7. Quy trình một lô

1. Đo độ phủ (§2), sinh giỏ (`sbanks … --write` hoặc đọc giỏ `banks` có sẵn), ghi ý tưởng bài vào
   `plan/.progress-<mã việc>.md` (không commit, git bỏ qua).
2. Viết bài (2–3 truyện hoặc 5 bài đọc mỗi lần ghi file). Kiểm:
   `node --no-warnings scripts/check-content.mjs --level <cấp> [--type story] --draft` + `bankcheck` + `dens`.
3. Viết câu hỏi, kiểm lại **không** `--draft`: 0 lỗi, 0 cảnh báo.
4. Dựng: `ONLY=<cấp> npm run -s content:build` (chỉ cấp đó, nên lỗi ở cấp khác không chặn). Lệnh in ra "audio thiếu: N" và lệnh audio:
   `cd scripts && timeout 500 env CONC=48 .venv/bin/python build-audio.py out/audio-only-<cấp>.json ../public/audio/sentences`.
   Nếu treo hoặc lỗi thì chạy lại với `CONC=16`, cho tới khi build lại báo "audio thiếu: 0".
   (venv `scripts/.venv` = python 3.12 + edge-tts 7.3.1.)
5. Đo lại độ phủ. Ghi một dòng vào mục việc trong `plan/TASKS.md` (số bài, từ giỏ, độ phủ trước → sau, % tuần).
6. Commit (§9), push, rồi đo hạn mức tuần bằng `get_usage`. Dừng theo ngưỡng người dùng đặt.

## 8. Nhân vật dùng chung (tùy chọn)

- Gia đình Moreau ở Lyon (Croix-Rousse): Julien (42, thợ sửa ống nước), Claire (40, y tá), Léa (16), Tom (10), chó Filou.
- Bà Josette (75, mẹ Julien) ở làng Saint-Martin, Ardèche: vườn rau, gà, chợ phiên thứ Bảy.
- Hàng xóm: ông Bernard Petit (68, thợ in về hưu, hay càu nhàu), cô Amina Diallo (35, tiệm bánh « Le Fournil »).
- Bạn của Léa: Inès, Hugo. Đồng nghiệp của Claire: bác sĩ Karim Benali.

## 9. Commit (nhất là khi nhiều phiên viết song song)

- Build sinh file JSON **mới** (untracked): `public/data/{readings,stories,quiz}/<id>.json`. Phải gom chúng vào commit,
  vì trước đây từng sót JSON câu hỏi và phải commit bù:
  `git status --short --untracked-files=all code/public/data/{readings,stories,quiz} | rg '<cấp hoặc id>'`.
- Song song nhiều phiên: build bằng `ONLY=<cấp>`. Commit bằng pathspec (`git add -- $P; git commit -m … -- $P`; trong zsh
  dùng mảng). Không `git pull --rebase --autostash`: `git fetch` rồi push. Không deploy khi phiên khác đang build dở.
  Mục `stories-index.json` / `readings-index.json` bị nhiều phiên cùng sửa: xem cách dùng index tạm trong memory `stories-b1c2`.
- Commit message tiếng Việt, dòng cuối `Co-Authored-By`. Trước khi deploy kiểm `git status code/public` không còn file
  tracked đang sửa dở.

## 10. Pipeline khác (ít khi đụng)

- **Từ vựng:** `node build-level-assign.mjs` → `build-enrich-kaikki.mjs` → `build-words-base.mjs` → `merge-vi.mjs` →
  `build-words-assemble.mjs` → `public/data/words/*.json`. Nguồn thô `kaikki-fr.jsonl`, `Lexique383.tsv` (không vào git).
  lemma-map ưu tiên tần suất (est→être): đừng phá. Số từ mỗi cấp khoá trong `lib/levels.ts` (unit test).
  Nhãn văn phong / họ từ / cụm đi kèm: `build-register.mjs`, `build-family.mjs`, `build-collocations.mjs`
  (assemble giữ lại khi dựng lại).
- **Câu ví dụ (5 câu/từ):** quy trình `scripts/ex5/` (memory `examples-5-progress`); shard bằng `shard-examples.mjs`
  (8 shard/cấp, khớp `exampleShardOf` trong `lib/data.ts`).
- **Audio từ/câu:** `node build-audio-manifest.mjs <cefr…>` → `.venv/bin/python build-audio.py out/audio-words.json ../public/audio/words`
  (câu: `out/audio-sentences.json` → `../public/audio/sentences`). Tự chạy tiếp, bỏ qua file đã có. Tên file: `lib/slug.ts`.
  Giọng chính `fr-FR-DeniseNeural`, vai thứ hai `fr-FR-HenriNeural`.
- **Chỉ mục từ → bài** (`public/data/word-refs`): `build-content.mjs` tự dựng lại (`build-word-refs.mjs`).
