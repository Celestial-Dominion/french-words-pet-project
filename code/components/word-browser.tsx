"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Search, GraduationCap } from "lucide-react";
import { loadWords, loadExamples, type ExampleSentence } from "@/lib/data";
import { learnedIds, newTodayCount, getConfig } from "@/lib/db";
import { buildQuestions, type Question } from "@/lib/review-session";
import { levelMeta, levelAccent } from "@/lib/levels";
import { toSearch } from "@/lib/slug";
import type { Word, SrsConfig } from "@/lib/types";
import WordDetail from "@/components/word-detail";
import ReviewRunner from "@/components/review-runner";

const CAP = 300; // giới hạn số dòng hiển thị để mượt trên điện thoại

function article(w: Word): string | null {
  if (!w.pos.includes("n") || !w.gender) return null;
  return w.gender === "m" ? "un" : "une";
}

export default function WordBrowser({ level }: { level: number }) {
  const [words, setWords] = useState<Word[] | null>(null);
  const [examples, setExamples] = useState<Record<string, ExampleSentence[]>>({});
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Word | null>(null);
  const [remainingNew, setRemainingNew] = useState<number | null>(null);
  const [session, setSession] = useState<Question[] | null>(null);
  const [config, setConfig] = useState<SrsConfig | null>(null);

  useEffect(() => {
    loadWords(level).then(setWords);
    // KHÔNG tải ví dụ ở đây (file lớn) — chỉ tải khi bấm từ / học (mục 'lazy').
  }, [level]);

  // Mở chi tiết: nạp ví dụ theo cấp (cache) rồi hiện.
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

  const startLearn = async () => {
    if (!words) return;
    const [cfg, learned, newToday] = await Promise.all([getConfig(), learnedIds(), newTodayCount()]);
    const quota = Math.max(0, cfg.newPerDay - newToday);
    const candidates = words.filter((w) => !learned.has(w.id)).slice(0, quota);
    if (!candidates.length) return;
    const ex = await loadExamples(level); // nạp ví dụ khi bắt đầu học (cache)
    setExamples(ex);
    setConfig(cfg);
    setSession(buildQuestions(candidates, ex, words, cfg, true));
  };

  const meta = levelMeta(level);
  const accent = levelAccent(level);

  const filtered = useMemo(() => {
    if (!words) return [];
    const nq = toSearch(q);
    if (!nq) return words;
    return words.filter(
      (w) => w.search.includes(nq) || w.meaning_vi.toLowerCase().includes(q.trim().toLowerCase()),
    );
  }, [words, q]);

  const shown = filtered.slice(0, CAP);

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center gap-2">
        <Link href="/" aria-label="Quay lại" className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-bold">
          <span className={accent.text}>{meta?.cefr}</span>{" "}
          <span className="text-muted-foreground">· {meta?.words.toLocaleString("vi")} từ</span>
        </h1>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          inputMode="search"
          placeholder="Tìm (gõ không dấu được): ecole, an…"
          className="w-full rounded-xl border bg-card py-2.5 pl-9 pr-3 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
        />
      </div>

      {remainingNew && remainingNew > 0 ? (
        <button
          onClick={startLearn}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99]"
        >
          <GraduationCap className="size-5" />
          Học {remainingNew} từ mới
        </button>
      ) : null}

      {words === null ? (
        <p className="text-muted-foreground">Đang tải…</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            {filtered.length.toLocaleString("vi")} kết quả
            {filtered.length > CAP ? ` · hiển thị ${CAP} đầu, gõ để lọc` : ""}
          </p>
          <ul className="grid grid-cols-1 gap-2 pb-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((w) => {
              const art = article(w);
              return (
                <li key={w.id}>
                  <button
                    onClick={() => openWord(w)}
                    className="w-full rounded-2xl border bg-card p-3 text-left transition-all hover:border-ring/40 hover:shadow-sm active:scale-[0.99]"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-lg font-semibold">
                        {art ? <span className="text-muted-foreground">{art} </span> : null}
                        {w.id}
                        {w.gender ? <span className="ml-1 text-xs text-muted-foreground">({w.gender})</span> : null}
                      </span>
                      <span className="shrink-0 font-mono text-sm text-muted-foreground">{w.ipa}</span>
                    </div>
                    <div className="mt-0.5 truncate text-sm text-muted-foreground">{w.meaning_vi}</div>
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
          }}
        />
      )}
    </div>
  );
}
