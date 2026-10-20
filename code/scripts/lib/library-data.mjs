// Đọc thư viện đọc ĐANG PHÁT HÀNH (public/data): chỉ mục + file từng bài (lib/library-files.ts), theo đúng thứ tự
// chỉ mục (xếp theo cấp, giữ thứ tự viết trong cấp). Dùng cho build-word-refs, corpus ngữ pháp, độ phủ truyện cũ.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const DATA = join(import.meta.dirname, "..", "..", "public", "data");
const read = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);

/** dir = "readings" | "stories" → [{ meta (mục chỉ mục), doc (chữ bài, null nếu thiếu file) }]. */
export function readLibrary(dir, data = DATA) {
  return (read(join(data, `${dir}-index.json`)) ?? []).map((meta) => ({ meta, doc: read(join(data, dir, `${meta.id}.json`)) }));
}
