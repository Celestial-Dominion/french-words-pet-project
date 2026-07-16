"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GraduationCap, Plus } from "lucide-react";
import { loadWords, loadExamplesForWords, type ExampleSentence } from "@/lib/data";
import { db, learnedIds, newTodayCount, getConfig } from "@/lib/db";
import { buildQuestions, type Question } from "@/lib/review-session";
import { orderForBeginners } from "@/lib/starter";
import { genderTaught } from "@/lib/progress-local";
import { levelMeta, levelAccent } from "@/lib/levels";
import { toSearch } from "@/lib/slug";
import { cn } from "@/lib/utils";
import type { Word, SrsConfig, ReviewRecord } from "@/lib/types";
import WordDetail from "@/components/word-detail";
import ReviewRunner from "@/components/review-runner";

const PAGE = 90; // cuộn vô hạn: mỗi lần hiện thêm 90 dòng (như HSK)

type Status = "new" | "due" | "learned";
const STATUS_DOT: Record<Status, string> = {
  new: "bg-muted-foreground/25",
  due: "bg-amber-500",
  learned: "bg-emerald-500",
};
type FilterKey = "all" | "new" | "due" | "known" | "leech";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "new", label: "Chưa học" },
  { key: "due", label: "Đến hạn" },
  { key: "known", label: "Đã thuộc" },
  { key: "leech", label: "Hay quên" },
];

function statusOf(rec: ReviewRecord | undefined, now: number): Status {
  if (!rec) return "new";
  if (new Date(rec.due).getTime() <= now) return "due";
  return "learned";
}
function matchFilter(rec: ReviewRecord | undefined, now: number, f: FilterKey): boolean {
  if (f === "all") return true;
  if (f === "new") return !rec;
  if (f === "due") return !!rec && new Date(rec.due).getTime() <= now;
  if (f === "known") return !!rec && (rec.stability ?? 0) >= 21;
  return !!rec && (rec.lapses ?? 0) >= 4; // hay quên (leech)
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
  const [filter, setFilter] = useState<FilterKey>("all");
  const [visible, setVisible] = useState(PAGE);
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
    const ex = await loadExamplesForWords(level, [w.id]);
    setExamples((prev) => ({ ...prev, ...ex }));
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
    // người mới (<40 từ) → ưu tiên bộ từ khởi động cụ thể trước danh sách tần suất
    const candidates = orderForBeginners(words, learned.size)
      .filter((w) => !learned.has(w.id))
      .slice(0, quota);
    if (!candidates.length) return;
    const ex = await loadExamplesForWords(level, candidates.map((w) => w.id));
    setExamples((prev) => ({ ...prev, ...ex }));
    const cfgEff = { ...cfg, genderQuestions: cfg.genderQuestions && genderTaught() };
    setConfig(cfgEff);
    setSession(buildQuestions(candidates, ex, words, cfgEff, true, undefined, learned));
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
    if (filter !== "all") list = list.filter((w) => matchFilter(reviews.get(w.id), now, filter));
    return list;
  }, [words, q, filter, reviews, now]);

  const shown = filtered.slice(0, visible);

  // Đang trong phiên học → chỉ hiện phiên (khung nằm dưới topbar như HSK)
  if (session && config) {
    return (
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
    );
  }

  return (
    <div className="flex flex-col">
      <div className="mb-1">
        <Link href="/hoc" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          ← Cấp khác
        </Link>
      </div>
      <div className="mb-4 flex items-center gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold", accent.badge)}>{meta?.cefr}</span>
        <h1 className="text-2xl font-bold sm:text-3xl">{meta?.label.split("·")[1]?.trim()}</h1>
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
          <div className="flex flex-col items-end gap-2">
            {remainingNew && remainingNew > 0 ? (
              <button
                onClick={() => startLearn(false)}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                <GraduationCap className="size-4" /> Học ({remainingNew} từ mới)
              </button>
            ) : learnedCount < totalWords ? (
              <button
                onClick={() => startLearn(true)}
                className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition-all hover:bg-muted active:scale-[0.98]"
              >
                <Plus className="size-4" /> {Math.min(10, totalWords - learnedCount)} từ mới
              </button>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">Đã học hết cấp này 🎉</span>
            )}
            {remainingNew !== null && remainingNew > 0 && learnedCount < totalWords && (
              <button
                onClick={() => startLearn(true)}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:bg-muted active:scale-[0.98]"
              >
                <Plus className="size-3.5" /> Học thêm 10 từ
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {Math.max(0, totalWords - learnedCount).toLocaleString("vi")} từ mới chờ học
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", accent.bar)} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Tìm kiếm + bộ lọc (dính) — select rộng bằng ô tìm (như HSK) */}
      <div className="sticky top-16 z-20 -mx-4 mb-3 bg-background/85 px-4 py-1 backdrop-blur">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setVisible(PAGE);
          }}
          inputMode="search"
          placeholder="Tìm (gõ không dấu được): ecole, an…"
          className="w-full rounded-full border bg-card px-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
        />
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as FilterKey);
            setVisible(PAGE);
          }}
          className="mt-2 w-full rounded-full border bg-card px-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
        >
          {FILTERS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {words === null ? (
        <p className="text-muted-foreground">Đang tải…</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">{filtered.length.toLocaleString("vi")} từ</p>
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Không tìm thấy từ nào.</p>}
          <ul className="grid grid-cols-1 gap-2.5 pb-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((w) => {
              const art = article(w);
              const st = statusOf(reviews.get(w.id), now);
              return (
                <li key={w.id}>
                  <button
                    onClick={() => openWord(w)}
                    className="flex w-full items-start gap-3 rounded-2xl border bg-card p-3.5 text-left transition-all hover:border-ring/40 hover:shadow-sm active:scale-[0.99]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-3">
                        <span className="text-lg font-semibold">
                          {art ? <span className="text-muted-foreground">{art} </span> : null}
                          {w.id}
                        </span>
                        <span className="shrink-0 font-mono text-sm text-muted-foreground">{w.ipa}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{w.meaning_vi}</span>
                    </span>
                    {/* chấm trạng thái bên PHẢI (như HSK) */}
                    <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", STATUS_DOT[st])} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
          {/* cuộn vô hạn: mốc quan sát hiện thêm PAGE dòng */}
          {shown.length < filtered.length && (
            <div
              ref={(el) => {
                if (!el) return;
                const io = new IntersectionObserver((es) => {
                  if (es[0].isIntersecting) setVisible((v) => v + PAGE);
                });
                io.observe(el);
                return () => io.disconnect();
              }}
              className="py-4 text-center text-xs text-muted-foreground"
            >
              Đang tải thêm…
            </div>
          )}
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

    </div>
  );
}
