import { notFound } from "next/navigation";
import { StoryList } from "@/components/library-lists";
import { LEVELS, levelMeta } from "@/lib/levels";
import { levelOfSlug } from "@/lib/library";
import { storiesIndex } from "@/lib/library-server";

export function generateStaticParams() {
  return LEVELS.map((l) => ({ level: l.cefr.toLowerCase() }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  return { title: `Truyện ${levelMeta(levelOfSlug(level) ?? 0)?.cefr ?? ""} · Từ vựng tiếng Pháp` };
}

export default async function StoryLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const n = levelOfSlug(level);
  if (!n) notFound();
  return <StoryList level={n} items={storiesIndex().filter((s) => s.level === n)} />;
}
