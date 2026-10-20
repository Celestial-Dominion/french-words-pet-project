// Chữ bài thư viện đọc: mỗi bài đọc / truyện một file public/data/{readings|stories}/<id>.json (như app Anh) — trang
// bài chỉ tải đúng bài đang mở thay vì cả file của cấp (C1 2,2 MB). scripts/build-content.mjs ghi + dọn file mồ côi;
// các script đọc lại dữ liệu đang phát hành qua scripts/lib/library-data.mjs.
export type LibraryDir = "readings" | "stories";

export function libraryDocPath(dir: LibraryDir, id: string): string {
  return `/data/${dir}/${encodeURIComponent(id)}.json`;
}

/** Cấp (a1…c2) đọc từ id: a1-01, rd-c1-…, st-b2-…, c1-story-04, khoá câu hỏi "st-a1-…#2"; tên file cũ theo cấp ("c1"). */
export function levelOfId(id: string): string | undefined {
  return id.match(/(?:^|[-/])(a1|a2|b1|b2|c1|c2)(?:[-/#]|$)/)?.[1];
}

/** File cần xoá sau khi dựng lại: *.json không thuộc bài vừa ghi (keep = id) mà id nằm trong phạm vi đang dựng
 *  (build-content: cấp theo content/, không còn trong content/ thì levelOfId) — gồm cả file cũ theo cấp (c1.json). */
export function staleLibraryFiles(files: string[], keep: ReadonlySet<string>, idInScope: (id: string) => boolean): string[] {
  return files.filter((f) => {
    if (!f.endsWith(".json")) return false;
    const id = f.slice(0, -5);
    return !keep.has(id) && idInScope(id);
  });
}
