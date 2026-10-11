// Đọc chỉ mục thư viện LÚC BUILD (chỉ dùng trong server component: generateStaticParams, số liệu trên trang tĩnh)
// — trang danh sách không phải fetch, chữ mô tả không bị cũ khi thêm nội dung.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReadingMeta, StoryMetaDoc } from "./data";

function read<T>(name: string): T[] {
  const p = join(process.cwd(), "public", "data", name);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T[]) : [];
}

export const readingsIndex = () => read<ReadingMeta>("readings-index.json");
export const storiesIndex = () => read<StoryMetaDoc>("stories-index.json");
