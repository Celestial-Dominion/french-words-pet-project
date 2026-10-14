# Liệt kê câu hỏi có đáp án đúng dài ≥1.3× phương án sai dài nhất (như quiz-check). Dùng: longq.py <quizfile>…
import sys
for p in sys.argv[1:]:
    rid = None; q = None; opts = []
    def flush():
        if q and opts:
            r = [o for ok, o in opts if ok]; w = [o for ok, o in opts if not ok]
            if r and w and len(r[0]) >= 1.3 * max(map(len, w)) and len(r[0]) > 12:
                print(f"{rid} | {q[:50]} | + {r[0]} | max- {max(w, key=len)}")
    for line in open(p, encoding="utf-8"):
        line = line.rstrip("\n")
        if line.startswith("=== "): flush(); rid = line[4:]; q = None; opts = []
        elif line.startswith("? "): flush(); q = line[2:].split(" | ")[0]; opts = []
        elif line.startswith("+ ") or line.startswith("- "): opts.append((line[0] == "+", line[2:].split(" | ")[0]))
    flush()
