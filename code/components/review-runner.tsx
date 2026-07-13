"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Volume2, Check } from "lucide-react";
import { recordAnswer, recordPractice, addXp } from "@/lib/db";
import { XP } from "@/lib/gamify";
import { wordAudioUrl, sentenceAudioUrl } from "@/lib/tts";
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
  const [confirmExit, setConfirmExit] = useState(false);

  const q = questions[i];
  const total = questions.length;

  // Thoát giữa phiên → hỏi xác nhận (giống HSK); đã xong phiên thì thoát thẳng.
  const requestExit = useCallback(() => setConfirmExit(true), []);

  const next = () => {
    setChosen(null);
    if (i + 1 >= total) setDone(true);
    else setI(i + 1);
  };

  // phát âm từ khi hiện thẻ learn/MCQ mới (nghe song song với đọc)
  useEffect(() => {
    if (q?.kind === "mcq" || q?.kind === "learn") play(wordAudioUrl(q.word));
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) {
    const pct = total ? Math.round((right / total) * 100) : 0;
    return (
      <SessionShell title={title} onExit={onExit} progress={1}>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-3xl border bg-gradient-to-br from-primary/10 to-transparent p-8 text-center sm:flex-none sm:p-10">
          <div className="text-6xl">{pct >= 80 ? "🎉" : "💪"}</div>
          <div className="text-2xl font-bold">Xong phiên!</div>
          <div className="text-muted-foreground">
            Đúng {right}/{total} ({pct}%)
          </div>
          <button
            onClick={onExit}
            className="mt-3 w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] sm:w-auto sm:px-10"
          >
            Hoàn tất
          </button>
        </div>
      </SessionShell>
    );
  }

  if (!q) return null;

  // chấm MCQ / gender
  const answerChoice = (idx: number) => {
    if (q.kind === "arrange" || q.kind === "learn" || chosen !== null) return;
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
    <>
    <SessionShell title={title} onExit={requestExit} progress={i / total}>
      {q.kind === "learn" ? (
        /* Thẻ HỌC từ mới: xem/nghe từ + nghĩa + ví dụ trước, rồi mới bị kiểm tra */
        <div className="flex min-h-0 flex-1 flex-col sm:flex-none">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-2 sm:flex-none sm:overflow-visible">
            <div className="flex flex-col items-center gap-3 rounded-3xl border bg-gradient-to-br from-primary/12 via-primary/5 to-transparent p-6 text-center shadow-sm sm:p-8">
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">✨ Từ mới — học trước nhé</span>
              <div className="flex items-center gap-2">
                <span className="text-4xl font-bold tracking-tight sm:text-5xl">
                  {q.word.pos.includes("n") && q.word.gender ? (
                    <span className="text-muted-foreground">{q.word.gender === "m" ? "un " : "une "}</span>
                  ) : null}
                  {q.word.id}
                </span>
                <button
                  onClick={() => play(wordAudioUrl(q.word))}
                  aria-label="Nghe"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-transform active:scale-95"
                >
                  <Volume2 className="h-5 w-5" />
                </button>
              </div>
              <div className="font-mono text-base text-muted-foreground">{q.word.ipa}</div>
              <div className="text-xl font-medium">{q.word.meaning_vi}</div>
            </div>
            {q.example && (
              <div className="rounded-2xl bg-muted/50 p-4">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ví dụ</div>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-base font-medium">{q.example.fr}</div>
                  <button
                    onClick={() => q.example && play(sentenceAudioUrl(q.example.fr))}
                    aria-label="Nghe câu"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary active:scale-95"
                  >
                    <Volume2 className="size-4" />
                  </button>
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">{q.example.vi}</div>
              </div>
            )}
          </div>
          <div className="shrink-0 pt-4">
            <button
              onClick={next}
              className="w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99]"
            >
              Đã xem — Kiểm tra
            </button>
          </div>
        </div>
      ) : q.kind === "arrange" ? (
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
        <div className="flex min-h-0 flex-1 flex-col sm:flex-none">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-2 sm:flex-none sm:overflow-visible">
            {/* đề bài */}
            <div className="flex min-h-[8.5rem] flex-col items-center justify-center gap-3 rounded-3xl border bg-card p-6 text-center shadow-sm sm:min-h-[11rem] sm:p-8">
              {q.kind === "mcq" ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-4xl font-bold tracking-tight sm:text-5xl">{q.prompt}</span>
                    <button
                      onClick={() => play(wordAudioUrl(q.word))}
                      aria-label="Nghe"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-transform active:scale-95"
                    >
                      <Volume2 className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="font-mono text-base text-muted-foreground">{q.word.ipa}</div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Chọn nghĩa đúng</div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-bold tracking-tight sm:text-5xl">… {q.word.id}</div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Danh từ này dùng mạo từ nào?</div>
                </>
              )}
            </div>

            {/* lựa chọn */}
            <div className={cn("grid gap-2.5", q.kind === "gender" ? "grid-cols-2" : "grid-cols-1")}>
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
                      "flex min-h-[3.5rem] items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-base transition-all",
                      !show && "bg-card hover:bg-muted active:scale-[0.99]",
                      show && isAnswer && "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                      show && isChosen && !isAnswer && "border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300",
                      show && !isAnswer && !isChosen && "opacity-50",
                    )}
                  >
                    <span>{opt}</span>
                    {show && isAnswer && <Check className="h-5 w-5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* nút tiếp khi đã trả lời (sai, hoặc không auto-advance) */}
          {chosen !== null && (
            <div className="shrink-0 pt-4">
              <button
                onClick={next}
                className="w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99]"
              >
                {i + 1 >= total ? "Kết thúc" : "Tiếp tục"}
              </button>
            </div>
          )}
        </div>
      )}
    </SessionShell>

    {/* Xác nhận rời phiên (chặn thoát nhầm) — giống HSK */}
    {confirmExit && (
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-[80] flex items-center justify-center p-4 duration-150 animate-in fade-in">
        <button type="button" aria-label="Ở lại" onClick={() => setConfirmExit(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm rounded-3xl border bg-background p-6 shadow-2xl duration-200 animate-in zoom-in-95">
          <h2 className="text-xl font-bold">Thoát phiên?</h2>
          <p className="mt-2 text-base text-muted-foreground">
            Bạn đang trong phiên học/ôn. Thoát bây giờ sẽ kết thúc phiên này. (Các câu đã trả lời vẫn được lưu.)
          </p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
            <button
              onClick={onExit}
              className="w-full rounded-2xl border py-3 text-base font-semibold text-muted-foreground transition-colors hover:bg-muted active:scale-[0.99] sm:flex-1"
            >
              Thoát
            </button>
            <button
              onClick={() => setConfirmExit(false)}
              autoFocus
              className="w-full rounded-2xl bg-primary py-3 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] sm:flex-1"
            >
              Tiếp tục học
            </button>
          </div>
        </div>
      </div>
    )}
    </>
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
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      {/* header: nút thoát + thanh tiến trình (luôn ở trên) */}
      <div className="flex shrink-0 items-center gap-3 px-4 pb-2 pt-3 sm:mx-auto sm:w-full sm:max-w-2xl">
        <button onClick={onExit} aria-label="Thoát" className="grid h-9 w-9 place-items-center rounded-full bg-muted transition-colors hover:bg-muted/70">
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      </div>
      {/* thân: mobile lấp đầy màn hình (cuộn nội bộ, CTA ghim đáy);
          desktop căn giữa một thẻ rộng max-w-2xl, cao tự nhiên */}
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 sm:justify-center sm:pb-6">
        {children}
      </div>
    </div>
  );
}
