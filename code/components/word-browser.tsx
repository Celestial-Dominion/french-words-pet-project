"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Search, GraduationCap, Plus } from "lucide-react";
import { loadWords, loadExamples, type ExampleSentence } from "@/lib/data";
import { db, learnedIds, newTodayCount, getConfig } from "@/lib/db";
import { buildQuestions, type Question } from "@/lib/review-session";
import { levelMeta, levelAccent } from "@/lib/levels";
import { toSearch } from "@/lib/slug";
import { cn } from "@/lib/utils";
import type { Word, SrsConfig, ReviewRecord } from "@/lib/types";
import WordDetail from "@/components/word-detail";
import ReviewRunner from "@/components/review-runner";

const CAP = 300; // giới hạn số dòng hiển thị để mượt trên điện thoại

type Status = "new" | "learning" | "due" | "known";
const STATUS_DOT: Record<Status, string> = {
  new: "bg-muted-foreground/25",
  learning: "bg-sky-500",
  due: "bg-amber-500",
  known: "bg-emerald-500",
};
const FILTERS: { key: "all" | Status; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "new", label: "Chưa học" },
  { key: "due", label: "Đến hạn" },
  { key: "learning", label: "Đang học" },
  { key: "known", label: "Đã thuộc" },
];

function statusOf(rec: ReviewRecord | undefined, now: number): Status {
  if (!rec) return "new";
  if (new Date(rec.due).getTime() <= now) return "due";
  if ((rec.stability ?? 0) >= 21) return "known";
  return "learning";
}

function article(w: Word): string | null {
  if (!w.pos.includes("n") || !w.gender) return null;
  return w.gender === "m" ? "un" : "une";
}

export default function WordBrowser({ level }: { level: number }) {
  const [words, setWords] = useState<Word[] | null>(null);
  const [examples, setExamples] = useState<Record<string, ExampleSentence[]>>({});
  const [reviews, setReviews] = useState<Map<string, ReviewRecord>>(new Map());
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [selected, setSelected] = useState<Word | null>(null);
  const [remainingNew, setRemainingNew] = useState<number | null>(null);
  const [session, setSession] = useState<Question[] | null>(null);
  const [config, setConfig] = useState<SrsConfig | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    loadWords(level).then(setWords);
  }, [level]);

  const refreshReviews = useCallback(async () => {
    const rows = await db.reviews.where("level").equals(level).toArray();
    setReviews(new Map(rows.map((r) => [r.wordId, r])));
  }, [level]);
  useEffect(() => {
    refreshReviews();
  }, [refreshReviews]);

  const openWord = async (w: Word) => {
    const ex = await loadExamples(level);
    setExamples(ex);
    setSelected(w);
  };

  // số từ mới còn được học hôm nay (theo cấp này)
  const refreshNew = useCallback(async () => {
    if (!words) return;
    const [cfg, learned, newToday] = await Promise.all([getConfig(), learnedIds(), newTodayCount()]);
    const quota = Math.max(0, cfg.newPerDay - newToday);
    const unlearned = words.filter((w) => !learned.has(w.id)).length;
    setRemainingNew(Math.min(quota, unlearned));
  }, [words]);
  useEffect(() => {
    refreshNew();
  }, [refreshNew]);

  const startLearn = async (force = false) => {
    if (!words) return;
    const [cfg, learned, newToday] = await Promise.all([getConfig(), learnedIds(), newTodayCount()]);
    const quota = force ? 10 : Math.max(0, cfg.newPerDay - newToday);
    const candidates = words.filter((w) => !learned.has(w.id)).slice(0, quota);
    if (!candidates.length) return;
    const ex = await loadExamples(level);
    setExamples(ex);
    setConfig(cfg);
    setSession(buildQuestions(candidates, ex, words, cfg, true));
  };

  const meta = levelMeta(level);
  const accent = levelAccent(level);
  const learnedCount = reviews.size;
  const totalWords = words?.length ?? meta?.words ?? 0;
  const pct = totalWords ? Math.min(100, (learnedCount / totalWords) * 100) : 0;

  const filtered = useMemo(() => {
    if (!words) return [];
    const nq = toSearch(q);
    let list = words;
    if (nq) list = list.filter((w) => w.search.includes(nq) || w.meaning_vi.toLowerCase().includes(q.trim().toLowerCase()));
    if (filter !== "all") list = list.filter((w) => statusOf(reviews.get(w.id), now) === filter);
    return list;
  }, [words, q, filter, reviews, now]);

  const shown = filtered.slice(0, CAP);

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/" aria-label="Quay lại" className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70">
          <ChevronLeft className="size-5" />
        </Link>
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold", accent.badge)}>{meta?.cefr}</span>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {meta?.label.split("·")[1]?.trim()}{" "}
          <span className="text-base font-medium text-muted-foreground">· {totalWords.toLocaleString("vi")} từ</span>
        </h1>
      </div>

      {/* Thẻ tiến độ cấp + nút học */}
      <div className={cn("mb-4 rounded-3xl border bg-gradient-to-br p-5", accent.grad)}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Đã học</div>
            <div className="text-2xl font-bold">
              {learnedCount.toLocaleString("vi")}
              <span className="text-base font-medium text-muted-foreground">/{totalWords.toLocaleString("vi")}</span>
            </div>
          </div>
          {remainingNew && remainingNew > 0 ? (
            <button
              onClick={() => startLearn(false)}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              <GraduationCap className="size-4" /> Học {remainingNew} từ mới
            </button>
          ) : learnedCount < totalWords ? (
            <button
              onClick={() => startLearn(true)}
              className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition-all hover:bg-muted active:scale-[0.98]"
            >
              <GraduationCap className="size-4" /> Học thêm 10 từ
            </button>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">Đã học hết cấp này 🎉</span>
          )}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", accent.bar)} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Tìm kiếm (dính) */}
      <div className="sticky top-16 z-20 -mx-4 mb-3 bg-background/85 px-4 py-1 backdrop-blur">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            inputMode="search"
            placeholder="Tìm (gõ không dấu được): ecole, an…"
            className="w-full rounded-full border bg-card py-2.5 pl-10 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
          />
        </div>
        {/* Mobile: ô chọn full-width (bằng ô tìm kiếm). Desktop: hàng chip. */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | Status)}
          className="mt-2 w-full rounded-full border bg-card px-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 sm:hidden"
        >
          {FILTERS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <div className="mt-2 hidden gap-2 overflow-x-auto pb-1 sm:flex">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors",
                filter === f.key ? "bg-primary text-primary-foreground" : "border text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {words === null ? (
        <p className="text-muted-foreground">Đang tải…</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            {filtered.length.toLocaleString("vi")} kết quả
            {filtered.length > CAP ? ` · hiển thị ${CAP} đầu, gõ để lọc` : ""}
          </p>
          <ul className="grid grid-cols-1 gap-2.5 pb-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((w) => {
              const art = article(w);
              const st = statusOf(reviews.get(w.id), now);
              return (
                <li key={w.id}>
                  <button
                    onClick={() => openWord(w)}
                    className="flex w-full items-start gap-2.5 rounded-2xl border bg-card p-3.5 text-left transition-all hover:border-ring/40 hover:shadow-sm active:scale-[0.99]"
                  >
                    <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", STATUS_DOT[st])} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-lg font-semibold">
                          {art ? <span className="text-muted-foreground">{art} </span> : null}
                          {w.id}
                        </span>
                        <span className="shrink-0 font-mono text-sm text-muted-foreground">{w.ipa}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{w.meaning_vi}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {selected && (
        <WordDetail
          word={selected}
          examples={examples[selected.id] || []}
          onClose={() => setSelected(null)}
          onChange={refreshReviews}
        />
      )}

      {session && config && (
        <ReviewRunner
          questions={session}
          title={`Học từ mới · ${meta?.cefr}`}
          config={config}
          onExit={() => {
            setSession(null);
            refreshNew();
            refreshReviews();
          }}
        />
      )}
    </div>
  );
}
