"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Check, BookOpenCheck } from "lucide-react";
import { GRAMMAR_LESSONS, type GrammarLesson } from "./lessons";
import { getCourseDone, markCourseDone } from "@/lib/progress-local";
import { requestSync } from "@/lib/sync";
import { cn } from "@/lib/utils";

export default function NguPhapPage() {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<GrammarLesson | null>(null);

  useEffect(() => {
    setDone(getCourseDone("grammar"));
  }, []);

  const toggleDone = (id: string, v: boolean) => {
    setDone(new Set(markCourseDone("grammar", id, v)));
    requestSync();
  };

  if (active) {
    const isDone = done.has(active.id);
    return (
      <div className="mx-auto max-w-2xl pb-16">
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => setActive(null)}
            aria-label="Quay lại"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-muted transition-colors hover:bg-muted/70"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-xl font-bold sm:text-2xl">
            {active.icon} {active.title}
          </h1>
        </div>

        <p className="rounded-2xl bg-primary/5 p-4 text-sm leading-relaxed">{active.intro}</p>

        <div className="mt-4 space-y-5">
          {active.sections.map((sec) => (
            <section key={sec.heading} className="rounded-3xl border p-4 sm:p-5">
              <h2 className="text-sm font-bold">{sec.heading}</h2>
              {sec.body && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{sec.body}</p>}
              {sec.examples && (
                <div className="mt-3 space-y-2">
                  {sec.examples.map((ex) => (
                    <div key={ex.fr} className="rounded-xl bg-muted/50 px-3 py-2">
                      <div className="font-medium">{ex.fr}</div>
                      <div className="text-sm text-muted-foreground">{ex.vi}</div>
                      {ex.note && <div className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">⚠ {ex.note}</div>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {active.tip && (
          <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-800 dark:text-amber-300">
            💡 {active.tip}
          </p>
        )}

        <button
          onClick={() => {
            toggleDone(active.id, !isDone);
            if (!isDone) setActive(null);
          }}
          className={cn(
            "mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold transition-all active:scale-[0.99]",
            isDone
              ? "border text-muted-foreground hover:bg-muted"
              : "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
          )}
        >
          <Check className="size-5" /> {isDone ? "Bỏ đánh dấu đã học" : "Đã học xong bài này"}
        </button>
      </div>
    );
  }

  const doneCount = GRAMMAR_LESSONS.filter((l) => done.has(l.id)).length;
  const pct = Math.round((doneCount / GRAMMAR_LESSONS.length) * 100);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-1">
        <Link href="/hoc" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          ← Học từ
        </Link>
      </div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Khóa ngữ pháp vỡ lòng</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        11 bài nền tảng để các bài tập không còn là đoán mò — mỗi bài 5 phút, học theo thứ tự.
      </p>

      <div className="mt-4 rounded-2xl border p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">
            <BookOpenCheck className="mr-1.5 inline size-4 text-primary" />
            Tiến độ khóa
          </span>
          <span className="text-muted-foreground">
            {doneCount}/{GRAMMAR_LESSONS.length} bài{doneCount === GRAMMAR_LESSONS.length ? " · ✓ Hoàn thành" : ""}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="mt-4 space-y-2 pb-8">
        {GRAMMAR_LESSONS.map((l, i) => {
          const isDone = done.has(l.id);
          return (
            <li key={l.id}>
              <button
                onClick={() => setActive(l)}
                className="flex w-full items-center gap-3 rounded-2xl border bg-card p-3.5 text-left transition-all hover:border-ring/40 hover:shadow-sm active:scale-[0.99]"
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl text-lg",
                    isDone ? "bg-emerald-500/15" : "bg-muted",
                  )}
                >
                  {isDone ? <Check className="size-5 text-emerald-600 dark:text-emerald-400" /> : l.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    Bài {i + 1} · {l.title}
                  </span>
                  <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">{l.intro}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
