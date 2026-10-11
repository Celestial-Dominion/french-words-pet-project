"use client";

// Lưới cấp + danh sách theo cấp cho Bài đọc và Truyện (port app Anh). Chỉ mục truyền từ server component (đọc lúc
// build) — trang không phải fetch; trạng thái đã đọc đọc từ IndexedDB (live) sau mount. Mỗi dòng có ô tích
// đã đọc / chưa đọc + thanh lọc trạng thái (components/done-toggle.tsx); bài đọc lọc thêm theo chủ đề.
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { LEVELS, levelAccent, levelMeta } from "@/lib/levels";
import { markRead } from "@/lib/db";
import type { ReadingMeta, StoryMetaDoc } from "@/lib/data";
import { GENRES, TOPICS, fmtMinutes, libraryHref, libraryLevelHref, type LibraryKind } from "@/lib/library";
import { savedChapter } from "@/lib/story-progress";
import { cn } from "@/lib/utils";
import { DoneFilterBar, EmptyFilter, TickCard, byDone, useReadSet, type DoneFilter } from "@/components/done-toggle";

// Ghi hỏng (riêng tư / hết quota) đã nổi banner StorageAlert — ở đây chỉ chặn unhandled rejection.
const toggleRead = (id: string, done: boolean) => void markRead(id, !done).catch(() => {});

export function LibraryLevelGrid({
  kind,
  items,
  noun,
}: {
  kind: LibraryKind;
  items: { id: string; level: number; title_fr: string; title_vi: string }[];
  noun: string;
}) {
  const read = useReadSet();
  const next = read ? items.find((x) => !read.has(x.id)) : undefined;
  const doneAll = items.filter((x) => read?.has(x.id)).length;
  return (
    <div className="space-y-4">
      {/* Đọc tiếp: bài chưa đọc đầu tiên, cấp thấp trước (như HSK) */}
      {next && (
        <NextCard
          href={libraryHref(kind, next.level, next.id)}
          started={doneAll > 0}
          title={next.title_fr}
          sub={`${next.title_vi} · ${levelMeta(next.level)?.cefr ?? ""}`}
          right={`${doneAll}/${items.length} ${noun}`}
        />
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LEVELS.map((l) => {
          const list = items.filter((x) => x.level === l.level);
          const a = levelAccent(l.level);
          const done = list.filter((x) => read?.has(x.id)).length;
          const pct = list.length ? (done / list.length) * 100 : 0;
          const body = (
            <>
              <div className="flex items-center gap-3">
                <span className={`flex size-11 items-center justify-center rounded-xl text-base font-bold ${a.badge}`}>{l.cefr}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">{l.label.split(" · ")[1]}</span>
                  <span className="block text-sm text-muted-foreground">{list.length ? `${list.length} ${noun}` : "Đang biên soạn"}</span>
                </span>
                {list.length > 0 && done === list.length ? (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${a.badge}`}>✓ Xong</span>
                ) : (
                  <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full transition-all duration-500 ${a.bar}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {done}/{list.length}
                </span>
              </div>
            </>
          );
          const cls = `group overflow-hidden rounded-2xl border bg-gradient-to-br ${a.grad} p-5 text-left transition-all`;
          return list.length ? (
            <Link key={l.level} href={libraryLevelHref(kind, l.level)} className={`${cls} hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]`}>
              {body}
            </Link>
          ) : (
            <div key={l.level} className={`${cls} opacity-45`}>
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReadingList({ level, items }: { level: number; items: ReadingMeta[] }) {
  const read = useReadSet();
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<DoneFilter>("all");
  const topics = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of items) m.set(r.topic, (m.get(r.topic) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [items]);
  const isDone = (r: ReadingMeta) => !!read?.has(r.id);
  const inTopic = topic ? items.filter((r) => r.topic === topic) : items;
  const done = inTopic.filter(isDone).length;
  const shown = byDone(inTopic, status, isDone);
  const nextUnread = read ? inTopic.find((r) => !isDone(r)) : undefined;
  return (
    <div className="space-y-5">
      <LevelHeader level={level} kind="reading" done={done} total={inTopic.length} noun="bài" />
      <DoneFilterBar kind="read" value={status} onChange={setStatus} total={inTopic.length} done={done} />
      {topics.length > 1 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Lọc theo chủ đề">
          <Chip on={!topic} onClick={() => setTopic("")}>
            Tất cả · {items.length}
          </Chip>
          {topics.map(([t, n]) => (
            <Chip key={t} on={topic === t} onClick={() => setTopic(t)}>
              {TOPICS[t] ?? t} · {n}
            </Chip>
          ))}
        </div>
      )}
      {nextUnread && status !== "done" && (
        <NextCard href={libraryHref("reading", level, nextUnread.id)} started={done > 0} title={nextUnread.title_fr} sub={nextUnread.title_vi} />
      )}
      {shown.length ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => {
            const d = isDone(r);
            return (
              <TickCard
                key={r.id}
                href={libraryHref("reading", level, r.id)}
                kind="read"
                done={d}
                onToggle={() => toggleRead(r.id, d)}
                name={r.title_fr}
                cardClass="flex min-h-[4.5rem] items-center gap-3 rounded-2xl border bg-card p-3.5 transition-all group-hover:border-primary/45 group-hover:shadow-md active:scale-[0.99]"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
                  {items.indexOf(r) + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.title_fr}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.title_vi}</span>
                  <span className="block truncate text-[0.7rem] text-muted-foreground/80">
                    {TOPICS[r.topic] ?? r.topic} · {GENRES[r.genre] ?? r.genre} · {fmtMinutes(r.min)}
                  </span>
                </span>
              </TickCard>
            );
          })}
        </div>
      ) : (
        <EmptyFilter kind="read" filter={status} />
      )}
    </div>
  );
}

export function StoryList({ level, items }: { level: number; items: StoryMetaDoc[] }) {
  const read = useReadSet();
  const [status, setStatus] = useState<DoneFilter>("all");
  const isDone = (s: StoryMetaDoc) => !!read?.has(s.id);
  const done = items.filter(isDone).length;
  const shown = byDone(items, status, isDone);
  return (
    <div className="space-y-5">
      <LevelHeader level={level} kind="story" done={done} total={items.length} noun="truyện" />
      <DoneFilterBar kind="read" value={status} onChange={setStatus} total={items.length} done={done} />
      {shown.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {shown.map((s) => {
            const d = isDone(s);
            // chương đang đọc dở (localStorage) — chỉ đọc khi đã biết trạng thái (sau mount) để khớp HTML tĩnh
            const ch = read && !d ? savedChapter(s.id, s.chapters) : 0;
            return (
              <TickCard
                key={s.id}
                href={libraryHref("story", level, s.id)}
                kind="read"
                done={d}
                onToggle={() => toggleRead(s.id, d)}
                name={s.title_fr}
                top
                cardClass="flex gap-3 rounded-2xl border bg-card p-4 transition-all group-hover:border-primary/45 group-hover:shadow-md active:scale-[0.99]"
              >
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums ${levelAccent(level).badge}`}>
                  {items.indexOf(s) + 1}
                </span>
                <span className="min-w-0 flex-1">
                  {/* hai dòng tên nằm cạnh ô tích (đè góc phải thẻ) → chừa lề; tóm tắt bên dưới dùng hết bề ngang */}
                  <span className="block pr-9 font-semibold">{s.title_fr}</span>
                  <span className="block pr-9 text-sm text-muted-foreground">{s.title_vi}</span>
                  {s.summary && <span className="mt-1 line-clamp-2 text-xs text-muted-foreground/90">{s.summary}</span>}
                  <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.7rem] text-muted-foreground">
                    {TOPICS[s.topic] ?? s.topic} · {s.chapters} chương · {fmtMinutes(s.min)}
                    {ch > 0 && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">
                        Đang đọc · ch. {ch + 1}/{s.chapters}
                      </span>
                    )}
                  </span>
                </span>
              </TickCard>
            );
          })}
        </div>
      ) : (
        <EmptyFilter kind="read" filter={status} noun="truyện" />
      )}
    </div>
  );
}

function LevelHeader({ level, kind, done, total, noun }: { level: number; kind: LibraryKind; done: number; total: number; noun: string }) {
  const lv = levelMeta(level);
  const a = levelAccent(level);
  const pct = total ? (done / total) * 100 : 0;
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${a.badge}`}>{lv?.cefr}</span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold sm:text-2xl">{lv?.label.split(" · ")[1]}</h1>
            <p className="text-sm text-muted-foreground">
              {kind === "reading" ? "Bài đọc" : "Truyện"} · đã đọc{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {done}/{total}
              </span>{" "}
              {noun}
            </p>
          </div>
        </div>
        <Link href={kind === "reading" ? "/bai-doc" : "/truyen"} className="shrink-0 text-sm font-medium text-primary hover:underline">
          ← Cấp khác
        </Link>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all duration-500 ${a.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
        on ? "border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function NextCard({ href, started, title, sub, right }: { href: string; started: boolean; title: string; sub: string; right?: string }) {
  return (
    <Link
      href={href}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-primary/35 bg-primary/5 px-4 py-3 text-left transition-all hover:bg-primary/10 active:scale-[0.99]"
    >
      <span className="min-w-0">
        <span className="block text-xs font-bold tracking-[0.12em] text-primary uppercase">{started ? "Đọc tiếp" : "Bắt đầu đọc"}</span>
        <span className="mt-0.5 block truncate font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{sub}</span>
      </span>
      {right ? <span className="shrink-0 text-xs text-muted-foreground">{right}</span> : <ChevronRight className="size-5 shrink-0 text-primary" />}
    </Link>
  );
}
