// Tách câu ví dụ mỗi cấp thành 8 shard: public/data/examples/{cefr}-{0..7}.json
// (chia theo hash wordId — PHẢI khớp exampleShardOf trong lib/data.ts) và xoá file cấp cũ.
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { levelSlug } from "../lib/levels.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE = join(HERE, "..");
const SHARDS = 8;

export function shardOf(id) {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h * 33) ^ id.charCodeAt(i)) >>> 0;
  return h % SHARDS;
}

export function writeShards() {
  const examples = JSON.parse(readFileSync(join(HERE, "out/examples.json"), "utf8"));
  const levels = JSON.parse(readFileSync(join(CODE, "public/data/word-levels.json"), "utf8"));
  const byLevelShard = {}; // slug -> [8 maps]
  for (const [id, sents] of Object.entries(examples)) {
    const lv = levels[id];
    if (!lv) continue;
    const slug = levelSlug(Number(lv));
    (byLevelShard[slug] ||= Array.from({ length: SHARDS }, () => ({})))[shardOf(id)][id] = sents;
  }
  for (const [slug, shards] of Object.entries(byLevelShard)) {
    shards.forEach((m, n) => writeFileSync(join(CODE, `public/data/examples/${slug}-${n}.json`), JSON.stringify(m)));
    const old = join(CODE, `public/data/examples/${slug}.json`);
    if (existsSync(old)) unlinkSync(old);
    console.log(`${slug}: ${shards.reduce((s, m) => s + Object.keys(m).length, 0)} từ → ${SHARDS} shard`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) writeShards();
