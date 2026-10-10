"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { loadStoriesIndex, loadStories, type StoryMetaDoc, type StoryDoc } from "@/lib/data";
import { markRead } from "@/lib/db";
import { LEVELS, levelAccent } from "@/lib/levels";
import StoryReader, { savedChapter } from "@/components/story-reader";
import { DoneFilterBar, EmptyFilter, TickRow, byDone, useReadSet, type DoneFilter } from "@/components/done-toggle";

const toggleRead = (id: string, done: boolean) => void markRead(id, !done).catch(() => {});

export default function TruyenPage() {
  const [index, setIndex] = useState<StoryMetaDoc[] | null>(null);
  const read = useReadSet() ?? new Set<string>(); // live: tích ở trình đọc / máy khác cũng cập nhật
  const [status, setStatus] = useState<DoneFilter>("all");
  const [active, setActive] = useState<StoryDoc | null>(null);

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
        onBack={() => setActive(null)}
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
          <DoneFilterBar kind="read" value={status} onChange={setStatus} total={index.length} done={index.filter((m) => read.has(m.id)).length} />
          {byDone(index, status, (m) => read.has(m.id)).length === 0 && <EmptyFilter kind="read" filter={status} noun="truyện" />}
          {LEVELS.map((lv) => {
            const list = index.filter((s) => s.level === lv.level);
            const shown = byDone(list, status, (m) => read.has(m.id));
            if (!shown.length) return null;
            const a = levelAccent(lv.level);
            const done = list.filter((m) => read.has(m.id)).length;
            return (
              <section key={lv.level}>
                <h2 className={`mb-2 flex items-baseline justify-between text-sm font-bold ${a.text}`}>
                  <span>{lv.cefr} · {list.length} truyện</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {done}/{list.length}
                    {done === list.length ? " · ✓ Xong" : ""}
                  </span>
                </h2>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {shown.map((m) => {
                    const d = read.has(m.id);
                    const ch = d ? 0 : savedChapter(m.id, m.chapters);
                    return (
                      <li key={m.id}>
                        <TickRow
                          onOpen={() => open(m)}
                          cardClass="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left active:scale-[0.99]"
                          kind="read"
                          done={d}
                          onToggle={() => toggleRead(m.id, d)}
                          name={m.title_fr}
                        >
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${a.badge}`}>
                            <BookOpen className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{m.title_fr}</span>
                            <span className="block truncate text-xs text-muted-foreground">{m.title_vi} · {m.chapters} chương</span>
                            {/* đọc dở (như HSK) */}
                            {ch > 0 && (
                              <span className="mt-1 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                Đang đọc · ch. {ch + 1}/{m.chapters}
                              </span>
                            )}
                          </span>
                        </TickRow>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
