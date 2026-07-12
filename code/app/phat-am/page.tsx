"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Volume2, Play } from "lucide-react";
import { loadPhonics, type PhonicsLesson } from "@/lib/data";
import { phonicsAudioUrl } from "@/lib/tts";

function play(say: string) {
  new Audio(phonicsAudioUrl(say)).play().catch(() => {});
}

export default function PhatAmPage() {
  const [lessons, setLessons] = useState<PhonicsLesson[] | null>(null);
  const [active, setActive] = useState<PhonicsLesson | null>(null);

  useEffect(() => {
    loadPhonics().then(setLessons);
  }, []);

  // ---- Trang một bài học ----
  if (active) {
    return (
      <div>
        <div className="mb-3 flex items-center gap-2">
          <button onClick={() => setActive(null)} aria-label="Quay lại" className="grid h-9 w-9 place-items-center rounded-full bg-muted">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">{active.title}</h1>
        </div>
        <p className="mb-4 rounded-xl bg-primary/10 p-3 text-sm text-foreground">{active.intro}</p>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {active.items.map((it, i) => (
            <li key={i}>
              <button
                onClick={() => play(it.say)}
                className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left active:scale-[0.99]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Volume2 className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="text-xl font-semibold">{it.say}</span>
                    <span className="font-mono text-sm text-muted-foreground">{it.ipa}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{it.vi}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ---- Trang tổng quan ----
  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Khóa phát âm</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Học cách đọc chữ → âm TRƯỚC khi vào từ vựng A1. Mỗi bài có audio để nghe và bắt chước.
        </p>
      </header>

      {lessons === null ? (
        <p className="text-muted-foreground">Đang tải…</p>
      ) : (
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((l, i) => (
            <li key={l.id}>
              <button
                onClick={() => setActive(l)}
                className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left active:scale-[0.99]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{l.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{l.items.length} mục · {l.intro.split(".")[0]}</span>
                </span>
                <Play className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
