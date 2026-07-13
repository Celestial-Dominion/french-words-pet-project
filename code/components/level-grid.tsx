"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { progressSummary } from "@/lib/db";
import { LEVELS, levelAccent } from "@/lib/levels";

export default function LevelGrid() {
  const [byLevel, setByLevel] = useState<Record<number, number>>({});
  useEffect(() => {
    progressSummary().then((s) => setByLevel(s.byLevel));
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {LEVELS.map((l) => {
        const a = levelAccent(l.level);
        const learned = byLevel[l.level] ?? 0;
        const pct = l.words ? Math.min(100, (learned / l.words) * 100) : 0;
        return (
          <Link
            key={l.level}
            href={`/hoc/${l.level}`}
            className={`group overflow-hidden rounded-2xl border bg-gradient-to-br ${a.grad} p-5 transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]`}
          >
            <div className="flex items-center gap-3">
              <span className={`flex size-11 items-center justify-center rounded-xl text-lg font-bold ${a.badge}`}>
                {l.cefr}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold">{l.label.split("·")[1]?.trim()}</div>
                <div className="text-sm text-muted-foreground">{l.words.toLocaleString("vi")} từ</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full transition-all ${a.bar}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {learned}/{l.words.toLocaleString("vi")}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
