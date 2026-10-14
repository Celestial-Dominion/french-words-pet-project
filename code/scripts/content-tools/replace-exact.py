# replace-exact.py <file> <cặp> — thay chuỗi con xuất hiện đúng 1 lần (dùng cho file câu hỏi).
# Thay chuỗi con duy nhất: file cặp, mỗi cặp "cũ\n=>\nmới", cách nhau dòng "@@". Kiểm tất cả trước khi ghi.
import sys
p, q = sys.argv[1], sys.argv[2]
t = open(p).read()
pairs = [b.strip('\n').split('\n=>\n') for b in open(q).read().split('\n@@\n') if b.strip()]
bad = [a for a, _ in pairs if t.count(a) != 1]
if bad:
    print('LỖI (không khớp đúng 1 lần):', *bad, sep='\n  '); sys.exit(1)
for a, b in pairs: t = t.replace(a, b)
open(p, 'w').write(t); print(f'ok {len(pairs)} thay')
