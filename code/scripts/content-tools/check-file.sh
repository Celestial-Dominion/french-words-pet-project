#!/bin/zsh
# check-file.sh <content/readings/{cấp}/xx-NN.txt> [--draft]
# Chỉ in lỗi/cảnh báo của các bài trong file (cấp lấy từ đường dẫn) + cảnh báo toàn cấp + dòng tổng.
# Chạy từ code/. --draft: chưa bắt buộc câu hỏi (dùng khi mới viết bài).
cd "${0:A:h}/../.."
lv=$(echo "$1" | sed -E 's#.*/(a1|a2|b1|b2|c1|c2)/.*#\1#')
ids=$(sed -nE 's/^=== ([^ ]+).*/\1/p' "$1" | sort -u | paste -sd'|' -)
out=$(node --no-warnings scripts/check-content.mjs --level $lv --type reading $2 2>&1)
echo "$out" | awk -v re="^  ($ids)\$" '$0 ~ re {p=1; print; next} /^  [a-z]/{p=0} /^[!✗]/{p=0} p'
echo "$out" | grep -E "^[!✗] " | head -n 8
echo "$out" | tail -n1
