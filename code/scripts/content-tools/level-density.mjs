// level-density.mjs <content/readings/{cấp}/xx-NN.txt> [ngưỡng%=5.3]
// Mỗi bài: số từ, số từ được chấm, số token ĐÚNG cấp (cấp lấy từ đường dẫn), cần thêm bao nhiêu để đạt ngưỡng,
// và danh sách token đúng cấp. Ngưỡng mặc định 5,3% (bộ kiểm đòi ≥5% ở B1/B2) — chừa biên cho lần sửa sau.
// Lưu ý: vài từ tưởng là B2 nhưng từ điển xếp thấp hơn (doué, fascinant, critique, brutal, radicalement) — xem danh sách in ra.
import fs from "node:fs";
const { analyzeSentence, LEVEL_KEYS } = await import(new URL("../lib/fr-vocab.mjs", import.meta.url));
const nameSet = (arr) => {
  const out = new Set();
  for (const x of arr)
    for (const part of x.normalize("NFC").split(/[\s'-]+/).filter(Boolean)) {
      const low = part.toLowerCase();
      out.add(/\p{Lu}/u.test(part) ? `^${low}` : low);
    }
  return out;
};
const f = process.argv[2];
const pct = Number(process.argv[3] ?? 5.3);
const lv = f.match(/\/(a1|a2|b1|b2|c1|c2)\//)?.[1];
const band = LEVEL_KEYS.indexOf(lv);
if (band < 0) throw new Error(`không đoán được cấp từ đường dẫn: ${f}`);
for (const blk of fs.readFileSync(f, "utf8").split(/^=== /m).slice(1)) {
  const lines = blk.split("\n");
  const id = lines[0].trim();
  let names = new Set();
  const sents = [];
  for (const l of lines.slice(1)) {
    if (/^names:/.test(l)) names = nameSet(l.slice(6).split(",").map((x) => x.trim()).filter(Boolean));
    else if (/^(title|topic|genre|gloss):/.test(l) || !l.includes(" | ")) continue;
    else sents.push(l.split(" | ")[0]);
  }
  let nS = 0, nW = 0;
  const hit = [];
  for (const s of sents)
    for (const w of analyzeSentence(s, { names })) {
      if (w.how === "num") continue;
      nW++;
      if (["name", "cap?", "unknown", "free"].includes(w.how)) continue;
      nS++;
      if (w.band === band) hit.push(w.t);
    }
  const need = Math.max(0, Math.ceil((pct / 100) * nS) - hit.length);
  console.log(`${id} ${nW}w scored ${nS} · ${lv.toUpperCase()}=${hit.length} (${((100 * hit.length) / nS).toFixed(1)}%) · cần +${need} · ${hit.join(" ")}`);
}
