"use client";

import { useEffect, useState } from "react";
import { Flame, Sparkles, BookText } from "lucide-react";
import { progressSummary, todayStr, type ProgressSummary } from "@/lib/db";
import { LEVELS, levelAccent } from "@/lib/levels";
import { cn } from "@/lib/utils";

// Danh sách 30 ngày gần nhất (cũ → mới), không dùng Date.now trong render tĩnh: ok ở client.
function last30(): string[] {
  const out: string[] = [];
  const d = new Date(todayStr() + "T00:00:00");
  for (let i = 29; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(todayStr(x));
  }
  return out;
}

function heatColor(n: number): string {
  if (n <= 0) return "bg-muted";
  if (n < 10) return "bg-emerald-500/30";
  if (n < 25) return "bg-emerald-500/55";
  if (n < 50) return "bg-emerald-500/80";
  return "bg-emerald-600";
}

export default function TienDoPage() {
  const [sum, setSum] = useState<ProgressSummary | null>(null);
  useEffect(() => {
    progressSummary().then(setSum);
  }, []);

  if (!sum) return <div className="text-center text-muted-foreground">Đang tải…</div>;

  const dailyMap = new Map(sum.daily.map((d) => [d.date, d.reviews]));
  const days = last30();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Tiến độ</h1>

      {/* 3 chỉ số nhanh */}
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<BookText className="h-5 w-5" />} label="Từ đã học" value={sum.words.toLocaleString()} />
        <Stat icon={<Flame className="h-5 w-5 text-orange-500" />} label="Chuỗi ngày" value={`${sum.streak}`} />
        <Stat icon={<Sparkles className="h-5 w-5 text-amber-500" />} label="XP" value={sum.xp.toLocaleString()} />
      </div>

      {/* từ đã học theo cấp */}
      <h2 className="mb-2 mt-6 text-lg font-semibold">Từ đã học theo cấp</h2>
      <div className="space-y-2">
        {LEVELS.map((lv) => {
          const done = sum.byLevel[lv.level] || 0;
          const a = levelAccent(lv.level);
          const pct = Math.min(100, Math.round((done / lv.words) * 100));
          return (
            <div key={lv.level}>
              <div className="mb-0.5 flex justify-between text-xs">
                <span className={a.text}>{lv.cefr}</span>
                <span className="text-muted-foreground">
                  {done.toLocaleString()} / {lv.words.toLocaleString()}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", a.bar)} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* heatmap 30 ngày */}
      <h2 className="mb-2 mt-6 text-lg font-semibold">30 ngày gần đây</h2>
      <div className="grid grid-cols-10 gap-1.5">
        {days.map((d) => {
          const n = dailyMap.get(d) || 0;
          return <div key={d} title={`${d}: ${n} lượt`} className={cn("aspect-square rounded", heatColor(n))} />;
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Tổng {sum.reviews.toLocaleString()} lượt ôn · {sum.reads} bài đã đọc
      </p>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <div className="flex justify-center">{icon}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
