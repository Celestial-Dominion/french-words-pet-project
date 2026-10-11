import { notFound } from "next/navigation";
import { ReadingList } from "@/components/library-lists";
import { LEVELS, levelMeta } from "@/lib/levels";
import { levelOfSlug } from "@/lib/library";
import { readingsIndex } from "@/lib/library-server";

// Sinh tĩnh đủ 6 cấp (cấp chưa có bài hiện danh sách rỗng); cấm param ngoài danh sách (export tĩnh).
export function generateStaticParams() {
  return LEVELS.map((l) => ({ level: l.cefr.toLowerCase() }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  return { title: `Bài đọc ${levelMeta(levelOfSlug(level) ?? 0)?.cefr ?? ""} · Từ vựng tiếng Pháp` };
}

export default async function ReadingLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const n = levelOfSlug(level);
  if (!n) notFound();
  return <ReadingList level={n} items={readingsIndex().filter((r) => r.level === n)} />;
}
