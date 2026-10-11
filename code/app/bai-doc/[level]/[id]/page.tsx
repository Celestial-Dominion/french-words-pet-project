import { notFound } from "next/navigation";
import { ReadingScreen } from "@/components/library-screens";
import { levelSlug } from "@/lib/levels";
import { readingsIndex } from "@/lib/library-server";

// Sinh tĩnh mọi bài trong chỉ mục; nội dung bài (JSON theo cấp) tải phía client khi mở.
export function generateStaticParams() {
  return readingsIndex().map((r) => ({ level: levelSlug(r.level), id: r.id }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ level: string; id: string }> }) {
  const { id } = await params;
  const r = readingsIndex().find((x) => x.id === id);
  return { title: r ? `${r.title_fr} · Bài đọc` : "Bài đọc" };
}

export default async function ReadingPage({ params }: { params: Promise<{ level: string; id: string }> }) {
  const { level, id } = await params;
  const r = readingsIndex().find((x) => x.id === id && levelSlug(x.level) === level);
  if (!r) notFound();
  return <ReadingScreen level={r.level} id={r.id} />;
}
