"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookText, Check } from "lucide-react";
import { loadReadingsIndex, loadReadings, type ReadingMeta, type ReadingDoc } from "@/lib/data";
import { readIds } from "@/lib/db";
import { LEVELS, levelAccent } from "@/lib/levels";
import Reader from "@/components/reader";

export default function BaiDocPage() {
  const [index, setIndex] = useState<ReadingMeta[] | null>(null);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<ReadingDoc | null>(null);

  const refresh = () => readIds().then(setRead);
  useEffect(() => {
    loadReadingsIndex().then(setIndex);
    refresh();
  }, []);

  const open = async (m: ReadingMeta) => {
    const docs = await loadReadings(m.level);
    const doc = docs.find((d) => d.id === m.id);
    if (doc) setActive(doc);
  };

  if (active) {
    return (
      <Reader
        doc={active}
        onBack={() => {
          setActive(null);
          refresh();
        }}
      />
    );
  }

  const byLevel = (lv: number) => (index ?? []).filter((r) => r.level === lv);

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Bài đọc</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bài đọc ngắn theo cấp — chạm từ để tra, nghe audio từng câu.
        </p>
      </header>

      <div className="mb-5 flex gap-2 text-sm">
        <span className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground">Bài đọc</span>
        <Link href="/truyen" className="rounded-lg bg-muted px-3 py-1.5 font-medium">Truyện</Link>
      </div>

      {index === null ? (
        <p className="text-muted-foreground">Đang tải…</p>
      ) : index.length === 0 ? (
        <p className="text-muted-foreground">Chưa có bài đọc.</p>
      ) : (
        <div className="space-y-6">
          {LEVELS.map((lv) => {
            const list = byLevel(lv.level);
            if (!list.length) return null;
            const a = levelAccent(lv.level);
            return (
              <section key={lv.level}>
                <h2 className={`mb-2 text-sm font-bold ${a.text}`}>
                  {lv.cefr} · {list.length} bài
                </h2>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => open(m)}
                        className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left active:scale-[0.99]"
                      >
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${a.badge}`}>
                          {read.has(m.id) ? <Check className="h-5 w-5" /> : <BookText className="h-5 w-5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{m.title_fr}</span>
                          <span className="block truncate text-xs text-muted-foreground">{m.title_vi} · {m.n} câu</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
