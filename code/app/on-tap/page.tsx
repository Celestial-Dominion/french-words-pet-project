"use client";

import { useCallback, useEffect, useState } from "react";
import { Repeat } from "lucide-react";
import { countDue, getDueReviews, getConfig } from "@/lib/db";
import { loadWords, loadExamples, type ExampleSentence } from "@/lib/data";
import { buildQuestions, type Question } from "@/lib/review-session";
import type { Word, SrsConfig } from "@/lib/types";
import ReviewRunner from "@/components/review-runner";

export default function OnTapPage() {
  const [due, setDue] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [config, setConfig] = useState<SrsConfig | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    countDue().then(setDue);
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const start = async () => {
    setLoading(true);
    const cfg = await getConfig();
    const dueRows = await getDueReviews();
    const levels = [...new Set(dueRows.map((r) => r.level))];
    const wordMap = new Map<string, Word>();
    let examples: Record<string, ExampleSentence[]> = {};
    const pool: Word[] = [];
    for (const lv of levels) {
      const [ws, ex] = await Promise.all([loadWords(lv), loadExamples(lv)]);
      for (const w of ws) {
        wordMap.set(w.id, w);
        pool.push(w);
      }
      examples = { ...examples, ...ex };
    }
    const dueWords = dueRows.map((r) => wordMap.get(r.wordId)).filter(Boolean) as Word[];
    const qs = buildQuestions(dueWords, examples, pool, cfg, false);
    setConfig(cfg);
    setQuestions(qs);
    setLoading(false);
  };

  if (questions && config) {
    return (
      <ReviewRunner
        questions={questions}
        title="Ôn tập"
        config={config}
        onExit={() => {
          setQuestions(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Repeat className="h-8 w-8" />
      </div>
      <h1 className="mt-4 text-xl font-bold">Ôn tập</h1>
      {due === null ? (
        <p className="mt-2 text-sm text-muted-foreground">Đang kiểm tra…</p>
      ) : due === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Không có thẻ nào đến hạn. Hãy vào một cấp và bấm <b>Học từ mới</b> để bắt đầu.
        </p>
      ) : (
        <>
          <p className="mt-2 text-muted-foreground">
            <b className="text-2xl text-primary">{due}</b> thẻ đến hạn
          </p>
          <button
            onClick={start}
            disabled={loading}
            className="mt-6 rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Đang tải…" : "Bắt đầu ôn"}
          </button>
        </>
      )}
    </div>
  );
}
