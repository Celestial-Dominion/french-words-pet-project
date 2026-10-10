# Chuẩn bị lô đầu vào cho "Cụm hay đi kèm" (collocations) từ RL-fr — Réseau Lexical du Français v3.2
# (ATILF, CC BY 4.0). Tải bộ dữ liệu về scripts/rlfr/ (không commit, ~13MB):
#   https://repository.ortolang.fr/api/content/lexical-system-fr/v3.2/ls-fr-V3.2/  (01-lsnodes.csv,
#   02-lsentries.csv, 14-lslf-model.xml, 15-lslf-rel.csv)
# Chỉ lấy hàm từ vựng kiểu "syntagmatic" (Magn, Oper_1, Real_1, Bon…) = từ hay đi kèm, cho các từ CÓ trong bộ từ.
# Ghi out/col-in/NN.txt (100 từ/lô, xếp cấp thấp + phổ biến trước), mỗi dòng: id|loại từ(.giống)|nghĩa|[nghĩa RL] LF:từ đi kèm…
# RL-fr chỉ cho từ đi kèm rời rạc → cụm hoàn chỉnh + nghĩa tiếng Việt được viết tay vào out/col-out/NN.json
# ({"id": [["cụm fr", "nghĩa vi"], …]}), rồi build-collocations.mjs gộp và vá bộ từ.
#   cd scripts/rlfr && python3 ../prep-col-batches.py
import csv, json, re, collections, html, os
csv.field_size_limit(10**9)
def rows(f):
    with open(f, encoding="utf-8") as fh:
        r = csv.reader(fh, delimiter="\t"); h = next(r)
        for x in r: yield dict(zip(h, x))
lf = {}
for m in re.finditer(r'<lexicalfunction id="([^"]+)" name="([^"]*)"[^>]*linktype="([^"]*)"', open("14-lslf-model.xml", encoding="utf-8").read()):
    lf[m.group(1)] = (html.unescape(m.group(2)).strip(), m.group(3))
entries = {r["id"]: r["name"] for r in rows("02-lsentries.csv")}
nodes = {r["id"]: (entries.get(r["entry"], ""), r["lexnum"]) for r in rows("01-lsnodes.csv")}
words = {}
for l in ["a1", "a2", "b1", "b2", "c1", "c2"]:
    for w in json.load(open(f"../../public/data/words/{l}.json")): words[w["id"]] = w
cov = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(list)))
for r in rows("15-lslf-rel.csv"):
    name, link = lf.get(r["lf"], ("?", "?"))
    if link != "syntagmatic": continue
    src, num = nodes.get(r["source"], ("", ""))
    if src not in words: continue
    tgt = r["form"] or nodes.get(r["target"], ("", ""))[0]
    if tgt and tgt not in cov[src][num][name]: cov[src][num][name].append(tgt)
os.makedirs("../out/col-in", exist_ok=True)
ids = sorted(cov, key=lambda w: (words[w]["level"], -words[w]["frequency"]))
B = 100
for b in range(0, len(ids), B):
    with open(f"../out/col-in/{b//B:02d}.txt", "w") as f:
        for w in ids[b:b+B]:
            W = words[w]; g = ("m" if W.get("gender") == "m" else "f" if W.get("gender") == "f" else "")
            parts = []
            for num, lfs in cov[w].items():
                items = [f"{k}:{','.join(v[:5])}" for k, v in list(lfs.items())[:8]]
                parts.append(f"[{num}] " + "; ".join(items))
            f.write(f"{w}|{'/'.join(W['pos'])}{('.'+g) if g else ''}|{W['meaning_vi'][:40]}|{' '.join(parts)[:420]}\n")
print("batches", (len(ids) + B - 1) // B, "words", len(ids))
