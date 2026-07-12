"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flame, GraduationCap, Sparkles } from "lucide-react";
import { countDue, getConfig, newTodayCount, progressSummary } from "@/lib/db";

// Hero trang chủ: tách rõ Ôn tập (thẻ đến hạn) và Học từ mới.
export default function HomeStats() {
  const [due, setDue] = useState<number | null>(null);
  const [words, setWords] = useState(0);
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [newRemain, setNewRemain] = useState(0);

  useEffect(() => {
    (async () => {
      const [d, sum, cfg, nToday] = await Promise.all([
        countDue(),
        progressSummary(),
        getConfig(),
        newTodayCount(),
      ]);
      setDue(d);
      setWords(sum.words);
      setStreak(sum.streak);
      setXp(sum.xp);
      setNewRemain(Math.max(0, cfg.newPerDay - nToday));
    })();
  }, []);

  const loading = due === null;
  const cta =
    (due ?? 0) > 0
      ? { href: "/on-tap", label: `Ôn ${due} thẻ` }
      : words === 0
        ? { href: "/phat-am", label: "Bắt đầu: Khóa phát âm" }
        : { href: "/hoc/1", label: "Học từ mới" };

  return (
    <div className="flex flex-col gap-5 rounded-3xl border bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6">
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <GraduationCap className="size-7" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-muted-foreground">Hôm nay</div>
          <div className="text-2xl leading-tight font-bold sm:text-3xl">
            {loading ? "…" : (due ?? 0) > 0 ? (
              <>
                Cần ôn <span className="text-primary">{due}</span> thẻ
              </>
            ) : words === 0 ? (
              "Bắt đầu học nhé 👋"
            ) : (
              "Đã ôn xong 🎉"
            )}
          </div>
          {newRemain > 0 && <div className="mt-1 text-sm text-muted-foreground">+ {newRemain} từ mới có thể học</div>}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Link
          href={cta.href}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          {cta.label}
        </Link>
        <div className="flex gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-background/60 px-3 py-3 text-sm font-medium">
            <Flame className="size-4 text-orange-500" /> {streak}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-background/60 px-3 py-3 text-sm font-medium">
            <Sparkles className="size-4 text-amber-500" /> {xp.toLocaleString("vi")}
          </span>
        </div>
      </div>
    </div>
  );
}
