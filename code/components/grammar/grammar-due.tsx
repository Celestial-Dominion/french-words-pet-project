"use client";

// Nhắc ôn Ngữ pháp ở màn Ôn tập: bài đã học tới hạn ôn theo lịch riêng (1·3·7·14·30·60·120 ngày) → làm lại luyện tập.
// Chỉ đọc tiến độ trong localStorage (không tải chỉ mục bài) — tên bài hiện ở trang Ngữ pháp.
import Link from "next/link";
import { ChevronRight, Puzzle } from "lucide-react";
import { isDue } from "@/lib/grammar";
import { useGrammarRows } from "@/lib/grammar-progress";

export function GrammarDueCard() {
  const rows = useGrammarRows();
  const now = new Date();
  const due = rows ? [...rows.values()].filter((r) => isDue(r, now)).length : 0;
  if (!due) return null;
  return (
    <Link
      href="/ngu-phap"
      className="flex items-center gap-3 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-4 transition-colors hover:bg-amber-500/15 active:scale-[0.99]"
    >
      <Puzzle className="size-6 shrink-0 text-amber-600 dark:text-amber-400" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Ngữ pháp đến hạn ôn: {due} bài</span>
        <span className="block text-sm text-muted-foreground">Làm lại phần luyện tập của bài để giữ lịch ôn</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
