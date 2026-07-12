"use client";

import { useEffect, useState } from "react";
import { X, Volume2, Check } from "lucide-react";
import { recordAnswer, recordPractice, addXp } from "@/lib/db";
import { XP } from "@/lib/gamify";
import { wordAudioUrl } from "@/lib/tts";
import { cn } from "@/lib/utils";
import type { Question } from "@/lib/review-session";
import type { SrsConfig } from "@/lib/types";
import SentenceArrange from "@/components/sentence-arrange";

function play(url: string) {
  new Audio(url).play().catch(() => {});
}

export default function ReviewRunner({
  questions,
  title,
  config,
  onExit,
}: {
  questions: Question[];
  title: string;
  config: SrsConfig;
  onExit: () => void;
}) {
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[i];
  const total = questions.length;

  const next = () => {
    setChosen(null);
    if (i + 1 >= total) setDone(true);
    else setI(i + 1);
  };

  // phát âm từ khi hiện thẻ MCQ mới (nghe song song với đọc)
  useEffect(() => {
    if (q?.kind === "mcq") play(wordAudioUrl(q.word));
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) {
    const pct = total ? Math.round((right / total) * 100) : 0;
    return (
      <SessionShell title={title} onExit={onExit} progress={1}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="text-5xl">{pct >= 80 ? "🎉" : "💪"}</div>
          <div className="text-xl font-bold">Xong phiên!</div>
          <div className="text-muted-foreground">
            Đúng {right}/{total} ({pct}%)
          </div>
          <button onClick={onExit} className="mt-4 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground">
            Hoàn tất
          </button>
        </div>
      </SessionShell>
    );
  }

  if (!q) return null;

  // chấm MCQ / gender
  const answerChoice = (idx: number) => {
    if (q.kind === "arrange" || chosen !== null) return;
    setChosen(idx);
    const correct = idx === q.answer;
    if (correct) setRight((r) => r + 1);
    if (q.kind === "mcq") {
      void recordAnswer({ wordId: q.word.id, level: q.word.level, correct, isNew: q.isNew });
      if (correct) void addXp(q.isNew ? XP.newWord : XP.review);
    } else {
      void recordPractice(correct);
      if (correct) void addXp(XP.practice);
    }
    if (correct && config.autoAdvance) setTimeout(next, 850);
  };

  return (
    <SessionShell title={title} onExit={onExit} progress={i / total}>
      {q.kind === "arrange" ? (
        <SentenceArrange
          key={i}
          fr={q.fr}
          vi={q.vi}
          tokens={q.tokens}
          onNext={(correct) => {
            if (correct) {
              setRight((r) => r + 1);
              void addXp(XP.practice);
            }
            void recordPractice(correct);
            next();
          }}
        />
      ) : (
        <div className="flex flex-1 flex-col">
          {/* đề bài */}
          <div className="mb-6 mt-2 text-center">
            {q.kind === "mcq" ? (
              <>
                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="text-3xl font-bold">{q.prompt}</span>
                  <button onClick={() => play(wordAudioUrl(q.word))} aria-label="Nghe" className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                    <Volume2 className="h-5 w-5" />
                  </button>
                </div>
                <div className="font-mono text-muted-foreground">{q.word.ipa}</div>
                <div className="mt-3 text-sm text-muted-foreground">Chọn nghĩa đúng</div>
              </>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">Danh từ này dùng mạo từ nào?</div>
                <div className="mt-2 text-3xl font-bold">… {q.word.id}</div>
              </>
            )}
          </div>

          {/* lựa chọn */}
          <div className={cn("grid gap-2", q.kind === "gender" ? "grid-cols-2" : "grid-cols-1")}>
            {q.options.map((opt, idx) => {
              const isAnswer = idx === q.answer;
              const isChosen = idx === chosen;
              const show = chosen !== null;
              return (
                <button
                  key={idx}
                  onClick={() => answerChoice(idx)}
                  disabled={show}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-base",
                    !show && "border bg-background active:scale-[0.99]",
                    show && isAnswer && "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
                    show && isChosen && !isAnswer && "border-rose-500 bg-rose-500/15 text-rose-800 dark:text-rose-200",
                    show && !isAnswer && !isChosen && "border opacity-50",
                  )}
                >
                  <span>{opt}</span>
                  {show && isAnswer && <Check className="h-5 w-5" />}
                </button>
              );
            })}
          </div>

          {/* nút tiếp khi đã trả lời (sai, hoặc không auto-advance) */}
          {chosen !== null && (
            <div className="mt-auto pt-4">
              <button onClick={next} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground">
                {i + 1 >= total ? "Kết thúc" : "Tiếp tục"}
              </button>
            </div>
          )}
        </div>
      )}
    </SessionShell>
  );
}

function SessionShell({
  title,
  onExit,
  progress,
  children,
}: {
  title: string;
  onExit: () => void;
  progress: number;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 px-4 pb-2 pt-3">
        <button onClick={onExit} aria-label="Thoát" className="grid h-9 w-9 place-items-center rounded-full bg-muted">
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-4 pb-6 pt-2">{children}</div>
    </div>
  );
}
