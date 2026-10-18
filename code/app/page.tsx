import Link from "next/link";
import type { ReactNode } from "react";
import { Volume2, BookOpenText, Library, ChevronRight, Puzzle } from "lucide-react";
import HomeStats from "@/components/home-stats";
import LevelGrid from "@/components/level-grid";
import DailyQuests from "@/components/daily-quests";
import { grammarIndex } from "@/lib/grammar-server";

export default function Home() {
  const grammar = grammarIndex().lessons.length;
  return (
    <div className="space-y-6 lg:space-y-8">
      <HomeStats />

      <DailyQuests />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Chọn cấp độ học</h2>
        <LevelGrid />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Khám phá</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ExploreCard
            href="/phat-am"
            icon={<Volume2 className="size-6" />}
            tint="bg-primary/15 text-primary"
            grad="from-primary/15"
            title="Khóa phát âm"
            desc="Học cách đọc trước khi vào A1."
          />
          <ExploreCard
            href="/bai-doc"
            icon={<BookOpenText className="size-6" />}
            tint="bg-sky-500/15 text-sky-600 dark:text-sky-400"
            grad="from-sky-500/15"
            title="Bài đọc"
            desc="60 bài đọc phân cấp, bấm từ để tra."
          />
          <ExploreCard
            href="/truyen"
            icon={<Library className="size-6" />}
            tint="bg-violet-500/15 text-violet-600 dark:text-violet-400"
            grad="from-violet-500/15"
            title="Truyện"
            desc="16 truyện nhiều chương, có dịch."
          />
          <ExploreCard
            href="/ngu-phap"
            icon={<Puzzle className="size-6" />}
            tint="bg-amber-500/15 text-amber-600 dark:text-amber-400"
            grad="from-amber-500/15"
            title="Ngữ pháp"
            desc={`${grammar} bài video giảng giải — bảng minh hoạ, ví dụ, luyện tập.`}
          />
        </div>
      </section>
    </div>
  );
}

function ExploreCard({
  href,
  icon,
  tint,
  grad,
  title,
  desc,
}: {
  href: string;
  icon: ReactNode;
  tint: string;
  grad: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-3xl border bg-gradient-to-br ${grad} to-transparent p-5 transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]`}
    >
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${tint}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
