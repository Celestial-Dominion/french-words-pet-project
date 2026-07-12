"use client";

import { useEffect, useState } from "react";
import { progressSummary, type ProgressSummary } from "@/lib/db";
import { RANKS, rankForWords, badgeGroups, badgeTotals, type Stats } from "@/lib/gamify";
import { cn } from "@/lib/utils";

export default function BinhNghiepPage() {
  const [sum, setSum] = useState<ProgressSummary | null>(null);
  useEffect(() => {
    progressSummary().then(setSum);
  }, []);

  if (!sum) {
    return <div className="text-center text-muted-foreground">Đang tải…</div>;
  }

  const rp = rankForWords(sum.words);
  const stats: Stats = {
    words: sum.words, xp: sum.xp, streak: sum.streak, reads: sum.reads, reviews: sum.reviews,
    activeDays: sum.activeDays, matured: sum.matured, maxDayReviews: sum.maxDayReviews,
    weekend: sum.weekend, byLevel: sum.byLevel,
  };
  const groups = badgeGroups(stats);
  const totals = badgeTotals(stats);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Binh nghiệp</h1>

      {/* thẻ cấp bậc hiện tại */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 to-transparent p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Cấp bậc hiện tại</div>
        <div className="mt-1 text-xl font-bold">{rp.rank.fr}</div>
        <div className="text-sm text-muted-foreground">{rp.rank.vi}</div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{sum.words.toLocaleString()} từ đã học</span>
          <span>{sum.xp.toLocaleString()} XP</span>
        </div>
        {rp.next ? (
          <>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(rp.progress * 100)}%` }} />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Còn {rp.toNext.toLocaleString()} từ → <b>{rp.next.fr}</b> ({rp.next.vi})
            </div>
          </>
        ) : (
          <div className="mt-2 text-sm font-semibold text-amber-600 dark:text-amber-400">Cấp cao nhất — Thống chế Pháp 👑</div>
        )}
      </div>

      {/* thang cấp bậc */}
      <h2 className="mb-2 mt-6 text-lg font-semibold">Thang cấp bậc</h2>
      <ol className="space-y-1.5">
        {RANKS.map((r, i) => {
          const reached = sum.words >= r.minWords;
          const current = i === rp.index;
          return (
            <li
              key={r.fr}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2",
                current
                  ? "border-primary bg-primary/10"
                  : reached
                    ? "border"
                    : "border opacity-50",
              )}
            >
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold", reached ? "bg-primary/20 text-primary" : "bg-muted")}>
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{r.fr}</span>
                <span className="block truncate text-xs text-muted-foreground">{r.vi}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{r.minWords.toLocaleString()}</span>
            </li>
          );
        })}
      </ol>

      {/* huy hiệu — theo nhóm nhiều bậc */}
      <h2 className="mb-1 mt-6 text-lg font-semibold">
        Huy hiệu <span className="text-sm font-normal text-muted-foreground">({totals.earned}/{totals.total})</span>
      </h2>
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.group} className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">{g.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{g.name}</span>
                  <span className="text-xs text-muted-foreground">{g.earned}/{g.total}</span>
                </div>
                <div className="text-xs text-muted-foreground">{g.desc}</div>
              </div>
            </div>
            <p className="mt-2 text-xs italic text-muted-foreground">{g.lore}</p>

            {g.next && (
              <div className="mt-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, Math.round((g.next.value / g.next.threshold) * 100))}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {g.next.value.toLocaleString("vi")} / {g.next.threshold.toLocaleString("vi")} {g.next.unit} → huy hiệu kế
                </div>
              </div>
            )}

            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {g.badges.map((b) => (
                <div
                  key={b.id}
                  title={`${b.name} · ${b.hint}`}
                  className={cn(
                    "flex flex-col items-center rounded-xl border p-2 text-center",
                    b.earned ? "border-amber-500/30 bg-amber-500/10" : "border opacity-40",
                  )}
                >
                  <span className={cn("text-xl", !b.earned && "grayscale")}>{b.icon}</span>
                  <span className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{b.hint}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
