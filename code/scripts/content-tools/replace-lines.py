# replace-lines.py <file FR | VI> <cặp> — thay theo DÒNG song ngữ, tất cả hoặc không gì cả.
# File cặp: khối "FRcũ | VIcũ
=>
FRmới | VImới", các khối cách nhau dòng "@@". Phần FR cũ (và VI cũ nếu có) phải khớp
# đúng 1 dòng; chỉ ghi FR thì giữ nguyên VI. Hợp để chèn từ, đổi từ ngoài từ điển mà vẫn sửa kèm bản dịch.
# Thay theo dòng: cặp "FRcũ | VIcũ\n=>\nFRmới | VImới" (VI có thể trống). Tìm đúng 1 dòng có FRcũ trong phần FR và VIcũ trong phần VI,
# thay lần lượt (cặp sau thấy kết quả cặp trước). Lỗi bất kỳ → không ghi gì.
import sys
p, q = sys.argv[1], sys.argv[2]
lines = open(p).read().split('\n')
def sp(s):
    a, b = (s.split(' | ', 1) + [''])[:2] if ' | ' in s else (s.rstrip(' |'), '')
    return a.strip(), b.strip()
bad = []
pairs = [b.strip('\n').split('\n=>\n') for b in open(q).read().split('\n@@\n') if b.strip()]
for old, new in pairs:
    ofr, ovi = sp(old); nfr, nvi = sp(new)
    hit = [i for i, l in enumerate(lines) if ofr in sp(l)[0] and ovi in sp(l)[1]]
    if len(hit) != 1:
        bad.append(f'{len(hit)}× {old[:90]}'); continue
    i = hit[0]; fr, vi = sp(lines[i])
    fr = fr.replace(ofr, nfr, 1)
    if ovi: vi = vi.replace(ovi, nvi, 1)
    lines[i] = f'{fr} | {vi}' if ' | ' in lines[i] else fr
if bad:
    print('LỖI:', *bad, sep='\n  '); sys.exit(1)
open(p, 'w').write('\n'.join(lines)); print(f'ok {len(pairs)} thay')
