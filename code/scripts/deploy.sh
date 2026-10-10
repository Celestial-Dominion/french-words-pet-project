#!/bin/zsh
# Deploy app lên Firebase Hosting (cách làm của app HSK/Anh): build → kiểm bundle có config Firebase
# → giữ mtime file tĩnh → deploy chỉ phần đổi.
# Tiến trình ghi vào scripts/.deploy.log (dòng "uploading new files [x/y] (p%)") — xem: tail -f scripts/.deploy.log
#
#   npm run deploy                   build lại rồi deploy (= scripts/deploy.sh)
#   SKIP_BUILD=1 scripts/deploy.sh   dùng out/ có sẵn (vừa build xong)
#   CONC=8 scripts/deploy.sh         ép số luồng tải (mặc định: 8 nếu nhiều MP3 mới, còn lại 32)
#   RULES=1 scripts/deploy.sh        deploy cả firestore.rules
#
# Vì sao nhanh:
#  - Mã build lấy từ băm MÃ NGUỒN (next.config.ts) → thêm nội dung không đổi mã build, chỉ trang đổi phải tải.
#  - out-mtime.py giữ mtime gốc của file chép từ public/ → bộ nhớ băm của firebase-tools (.firebase/hosting.*.cache)
#    không phải băm lại ~1 GB audio mỗi lần.
#  - Nhiều luồng tải khi ít MP3 mới; ít luồng khi nhiều MP3 mới (tránh quá thời gian chờ).
set -e
cd "$(dirname "$0")/.."
LOG=scripts/.deploy.log
STAMP=.firebase/last-deploy
mkdir -p .firebase
T0=$(date +%s)

if [[ -z "$SKIP_BUILD" ]]; then
  echo "▸ build…"
  rm -rf .next
  npm run build > scripts/.build.log 2>&1 || { tail -30 scripts/.build.log; echo "✗ build lỗi"; exit 1; }
  echo "  mã build: $(cat .next/BUILD_ID) ($(( $(date +%s) - T0 )) giây)"
fi

# Bắt buộc: bundle phải có authDomain VÀ API key — build thiếu .env.local vẫn chạy được nhưng tắt đồng bộ mà không báo lỗi
grep -rqF "french-pet.firebaseapp.com" out/_next/static/chunks/ || { echo "✗ bundle thiếu authDomain Firebase — DỪNG, kiểm .env.local"; exit 1; }
K=$(grep -E '^NEXT_PUBLIC_FIREBASE_API_KEY=' .env.local | cut -d= -f2-)
[[ -n "$K" ]] && grep -rqF "$K" out/_next/static || { echo "✗ bundle thiếu API key Firebase — DỪNG, kiểm .env.local rồi build lại"; exit 1; }
echo "▸ bundle có config Firebase ✓"

python3 scripts/out-mtime.py

# Nhiều MP3 mới (0,5–2 MB/file) mà nhiều luồng → mỗi file bị chia băng thông, quá thời gian chờ (bài học app HSK 2026-09-28)
if [[ -z "$CONC" ]]; then
  if [[ -f $STAMP ]]; then NEW=$(find public/audio -name '*.mp3' -newer $STAMP | wc -l | tr -d ' '); else NEW=999999; fi
  if (( NEW > 100 )); then CONC=8; else CONC=32; fi
  echo "▸ MP3 mới từ lần deploy trước: $NEW → $CONC luồng"
fi

ONLY=hosting
[[ -n "$RULES" ]] && ONLY=hosting,firestore:rules

START=$(date +%s)
touch .firebase/deploy-start
echo "▸ deploy $ONLY (log: $LOG)…"
# firebase-tools đôi khi ném "Timed out" SAU khi đã "Deploy complete!" (tác vụ phụ sau release, 2026-10-10)
# → bản đã lên rồi; chỉ coi là lỗi khi log KHÔNG có dòng hoàn tất.
if ! FIREBASE_HOSTING_UPLOAD_CONCURRENCY=$CONC npx firebase deploy --only $ONLY --non-interactive > $LOG 2>&1; then
  if grep -q "Deploy complete!" $LOG; then
    echo "⚠ firebase-tools báo lỗi sau khi đã release xong — bỏ qua ($(grep -m1 -o 'Error: .*' $LOG))"
  else
    tail -20 $LOG; echo "✗ deploy lỗi"; exit 1
  fi
fi
mv .firebase/deploy-start $STAMP
grep -E "found [0-9]+ files|uploading new files" $LOG | sed -n '1p;$p'
END=$(date +%s)
echo "✓ deploy xong sau $(( (END - START) / 60 )) phút $(( (END - START) % 60 )) giây (cả build: $(( (END - T0) / 60 )) phút $(( (END - T0) % 60 )) giây)"
