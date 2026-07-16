"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Check } from "lucide-react";
import { loadStoriesIndex, loadStories, type StoryMetaDoc, type StoryDoc } from "@/lib/data";
import { readIds } from "@/lib/db";
import { LEVELS, levelAccent } from "@/lib/levels";
import StoryReader, { savedChapter } from "@/components/story-reader";

export default function TruyenPage() {
  const [index, setIndex] = useState<StoryMetaDoc[] | null>(null);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<StoryDoc | null>(null);

  const refresh = () => readIds().then(setRead);
  useEffect(() => {
    loadStoriesIndex().then((idx) => {
      setIndex(idx);
      // deep-link ?open=<id> (từ gợi ý "Đọc ngay để nhớ lâu" sau phiên học)
      const id = new URLSearchParams(window.location.search).get("open");
      const m = id ? idx.find((s) => s.id === id) : null;
      if (m) {
        loadStories(m.level).then((docs) => {
          const doc = docs.find((d) => d.id === m.id);
          if (doc) setActive(doc);
        });
      }
    });
    refresh();
  }, []);

  const open = async (m: StoryMetaDoc) => {
    const docs = await loadStories(m.level);
    const doc = docs.find((d) => d.id === m.id);
    if (doc) setActive(doc);
  };

  if (active) {
    return (
      <StoryReader
        doc={active}
        onBack={() => {
          setActive(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-1">
        <Link href="/doc" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          ← Đọc
        </Link>
      </div>
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Truyện</h1>
        <p className="mt-1 text-sm text-muted-foreground">Truyện nhiều chương theo cấp — chạm từ để tra.</p>
      </header>

      <div className="mb-5 flex gap-2 text-sm">
        <Link href="/bai-doc" className="rounded-lg bg-muted px-3 py-1.5 font-medium">Bài đọc</Link>
        <span className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground">Truyện</span>
      </div>

      {index === null ? (
        <p className="text-muted-foreground">Đang tải…</p>
      ) : index.length === 0 ? (
        <p className="text-muted-foreground">Chưa có truyện.</p>
      ) : (
        <div className="space-y-6">
          {LEVELS.map((lv) => {
            const list = (index ?? []).filter((s) => s.level === lv.level);
            if (!list.length) return null;
            const a = levelAccent(lv.level);
            return (
              <section key={lv.level}>
                <h2 className={`mb-2 text-sm font-bold ${a.text}`}>{lv.cefr} · {list.length} truyện</h2>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => open(m)}
                        className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left active:scale-[0.99]"
                      >
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${a.badge}`}>
                          {read.has(m.id) ? <Check className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{m.title_fr}</span>
                          <span className="block truncate text-xs text-muted-foreground">{m.title_vi} · {m.chapters} chương</span>
                        </span>
                        {/* badge "Đang đọc · ch. x/y" khi đã đọc dở (như HSK) */}
                        {!read.has(m.id) && (() => {
                          const ch = savedChapter(m.id, m.chapters);
                          return ch > 0 ? (
                            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              Đang đọc · ch. {ch + 1}/{m.chapters}
                            </span>
                          ) : null;
                        })()}
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
