import { notFound } from "next/navigation";
import { LEVELS } from "@/lib/levels";
import WordBrowser from "@/components/word-browser";

// Static export: tạo sẵn trang cho 6 cấp.
export function generateStaticParams() {
  return LEVELS.map((l) => ({ level: String(l.level) }));
}

export default async function Page({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const n = Number(level);
  if (!LEVELS.some((l) => l.level === n)) notFound();
  return <WordBrowser level={n} />;
}
