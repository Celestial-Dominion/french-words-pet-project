import { notFound } from "next/navigation";
import { StoryScreen } from "@/components/library-screens";
import { levelSlug } from "@/lib/levels";
import { storiesIndex } from "@/lib/library-server";

export function generateStaticParams() {
  return storiesIndex().map((s) => ({ level: levelSlug(s.level), id: s.id }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ level: string; id: string }> }) {
  const { id } = await params;
  const s = storiesIndex().find((x) => x.id === id);
  return { title: s ? `${s.title_fr} · Truyện` : "Truyện" };
}

export default async function StoryPage({ params }: { params: Promise<{ level: string; id: string }> }) {
  const { level, id } = await params;
  const s = storiesIndex().find((x) => x.id === id && levelSlug(x.level) === level);
  if (!s) notFound();
  return <StoryScreen level={s.level} id={s.id} />;
}
