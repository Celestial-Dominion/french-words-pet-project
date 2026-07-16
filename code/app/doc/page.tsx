import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpenText, ChevronRight, Library } from "lucide-react";

export const metadata = { title: "Đọc · Từ vựng tiếng Pháp" };

export default function DocHub() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Đọc</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn nội dung để đọc — bài đọc ngắn phân cấp hoặc truyện nhiều chương.
          Bấm vào từ bất kỳ trong bài để tra nghĩa.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DocCard
          href="/bai-doc"
          icon={<BookOpenText className="size-7" />}
          tint="bg-sky-500/15 text-sky-600 dark:text-sky-400"
          grad="from-sky-500/15"
          title="Bài đọc"
          desc="Bài đọc ngắn phân cấp A1–C2, audio thật từng câu. Đánh dấu đã đọc để theo dõi tiến độ."
        />
        <DocCard
          href="/truyen"
          icon={<Library className="size-7" />}
          tint="bg-violet-500/15 text-violet-600 dark:text-violet-400"
          grad="from-violet-500/15"
          title="Truyện"
          desc="Truyện nhiều chương (B1–C2), văn phong tự nhiên, có bản dịch tiếng Việt."
        />
      </div>
    </div>
  );
}

function DocCard({
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
      className={`group flex flex-col gap-3 rounded-3xl border bg-gradient-to-br ${grad} to-transparent p-6 transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]`}
    >
      <div className="flex items-center justify-between">
        <span className={`flex size-14 items-center justify-center rounded-2xl ${tint}`}>{icon}</span>
        <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <div>
        <div className="text-xl font-bold">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
      </div>
    </Link>
  );
}
