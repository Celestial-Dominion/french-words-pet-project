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
    loadReadingsIndex().then((idx) => {
      setIndex(idx);
      // deep-link ?open=<id> (từ gợi ý "Đọc ngay để nhớ lâu" sau phiên học)
      const id = new URLSearchParams(window.location.search).get("open");
      const m = id ? idx.find((r) => r.id === id) : null;
      if (m) {
        loadReadings(m.level).then((docs) => {
          const doc = docs.find((d) => d.id === m.id);
          if (doc) setActive(doc);
        });
      }
    });
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
      <div className="mb-1">
        <Link href="/doc" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          ← Đọc
        </Link>
      </div>
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
          {/* Đọc tiếp: bài chưa đọc đầu tiên (cấp thấp trước) — như HSK */}
          {(() => {
            const next = index.find((m) => !read.has(m.id));
            if (!next) return null;
            return (
              <button
                onClick={() => open(next)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10 active:scale-[0.99]"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-primary">Đọc tiếp →</span>
                  <span className="block truncate font-semibold">{next.title_fr}</span>
                  <span className="block truncate text-xs text-muted-foreground">{next.title_vi}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {read.size}/{index.length} bài
                </span>
              </button>
            );
          })()}
          {LEVELS.map((lv) => {
            const list = byLevel(lv.level);
            if (!list.length) return null;
            const a = levelAccent(lv.level);
            const done = list.filter((m) => read.has(m.id)).length;
            return (
              <section key={lv.level}>
                <h2 className={`mb-1 flex items-baseline justify-between text-sm font-bold ${a.text}`}>
                  <span>
                    {lv.cefr} · {list.length} bài
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {done}/{list.length}
                    {done === list.length ? " · ✓ Xong" : ""}
                  </span>
                </h2>
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${a.bar}`} style={{ width: `${Math.round((done / list.length) * 100)}%` }} />
                </div>
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
