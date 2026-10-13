"use client";

// Câu hỏi đọc hiểu trắc nghiệm cuối bài đọc (port app Anh components/library/quiz.tsx). Chọn là chấm ngay (không đổi
// được): đáp án đúng tô xanh, chọn sai tô đỏ, rồi lộ nghĩa mọi phương án + lời giải thích trích «nguyên văn» câu trong
// bài. Phương án xáo lại mỗi lần mở / Làm lại. Không lưu điểm. Chữ câu hỏi + phương án bấm-tra được.
// Nút loa đọc câu hỏi và từng phương án (MP3 câu như bài đọc: public/audio/sentences/hashLong(fr).mp3).
// Cha đặt key theo bài để đổi bài là trạng thái mới.
import { useState } from "react";
import { Check, RotateCcw, Volume2, X } from "lucide-react";
import { quizScore, shuffledOrder, splitQuotes } from "@/lib/quiz-pure";
import type { QuizQuestion } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Words } from "@/components/passage";

const LETTERS = "ABCD";

function Why({ text }: { text: string }) {
  return (
    <>
      {splitQuotes(text).map((p, i) =>
        p.quote ? (
          <span key={i} className="text-foreground italic">
            «{p.text}»
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function ListenButton({ fr, onListen, className }: { fr: string; onListen: (fr: string) => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => onListen(fr)}
      aria-label={`Nghe: ${fr}`}
      className={cn("grid shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-primary active:scale-95", className)}
    >
      <Volume2 className="size-[1.15rem]" />
    </button>
  );
}

export function Quiz({
  questions,
  showVi,
  onTapWord,
  onListen,
}: {
  questions: QuizQuestion[];
  showVi: boolean;
  onTapWord: (w: string) => void;
  onListen?: (fr: string) => void;
}) {
  const [orders, setOrders] = useState(() => questions.map((q) => shuffledOrder(q.opts.length)));
  const [picks, setPicks] = useState<(number | undefined)[]>(() => questions.map(() => undefined));
  const { done, correct, total } = quizScore(
    questions.map((q) => q.a),
    picks,
  );

  const choose = (i: number, oi: number) => setPicks((p) => (p[i] !== undefined ? p : p.map((v, k) => (k === i ? oi : v))));
  const redo = () => {
    setOrders(questions.map((q) => shuffledOrder(q.opts.length)));
    setPicks(questions.map(() => undefined));
  };

  return (
    <section aria-label="Câu hỏi đọc hiểu" data-testid="quiz" className="mt-10 rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">Câu hỏi đọc hiểu</h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {done}/{total}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Chạm đáp án đúng · bật Dịch để xem tiếng Việt</p>

      <ol className="mt-5 space-y-8">
        {questions.map((q, i) => {
          const pick = picks[i];
          const answered = pick !== undefined;
          const right = pick === q.a;
          return (
            <li key={i}>
              <div className="flex items-start gap-1">
                <p className="min-w-0 flex-1 text-[1.06rem] leading-relaxed font-medium sm:text-[1.12rem]">
                  <span className="mr-1.5 text-base font-semibold text-muted-foreground">{i + 1}.</span>
                  <Words text={q.q.fr} onTap={onTapWord} />
                </p>
                {onListen && <ListenButton fr={q.q.fr} onListen={onListen} className="-mt-1 size-9" />}
              </div>
              {(showVi || answered) && <p className="mt-1 border-l-[3px] border-primary/30 pl-3 text-[0.95rem] text-muted-foreground">{q.q.vi}</p>}
              <div className="mt-3 grid gap-2">
                {(orders[i] ?? []).map((oi, k) => {
                  const o = q.opts[oi];
                  if (!o) return null;
                  let cls = "border-border bg-card hover:bg-muted active:scale-[0.99]";
                  let badge = "bg-muted text-muted-foreground";
                  if (answered && oi === q.a) {
                    cls = "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
                    badge = "bg-emerald-500 text-white";
                  } else if (answered && oi === pick) {
                    cls = "border-destructive bg-destructive/15 text-destructive";
                    badge = "bg-destructive text-white";
                  } else if (answered) {
                    cls = "border-border bg-card opacity-60";
                  }
                  return (
                    <div key={oi} className="flex items-stretch gap-1">
                      <button
                        type="button"
                        disabled={answered}
                        onClick={() => choose(i, oi)}
                        className={cn(
                          "flex min-h-[3.25rem] min-w-0 flex-1 items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition-all focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
                          cls,
                        )}
                      >
                        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold", badge)}>{LETTERS[k] ?? k + 1}</span>
                        <span className="min-w-0">
                          <span className="block text-[1.02rem] leading-snug">{o.fr}</span>
                          {(showVi || answered) && <span className="mt-0.5 block text-sm opacity-75">{o.vi}</span>}
                        </span>
                      </button>
                      {onListen && <ListenButton fr={o.fr} onListen={onListen} className="w-9" />}
                    </div>
                  );
                })}
              </div>
              {answered && (
                <p className="mt-2.5 flex items-start gap-1.5 text-sm leading-relaxed">
                  {right ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> : <X className="mt-0.5 size-4 shrink-0 text-destructive" />}
                  <span>
                    <span className={cn("font-semibold", right ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>{right ? "Đúng." : "Chưa đúng."}</span>
                    {q.why && (
                      <span className="text-muted-foreground">
                        {" "}
                        <Why text={q.why} />
                      </span>
                    )}
                  </span>
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {total > 0 && done === total && (
        <div className="mt-7 flex flex-col items-center gap-2 rounded-2xl bg-muted/40 p-4 text-center">
          <p className="text-base font-semibold">
            Đúng {correct}/{total} câu
          </p>
          <p className="text-sm text-muted-foreground">{correct === total ? "Tuyệt vời — bạn hiểu hết bài!" : "Đọc lại đoạn liên quan rồi làm lại nhé."}</p>
          <button
            type="button"
            onClick={redo}
            className="mt-1 inline-flex items-center gap-1.5 rounded-xl border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <RotateCcw className="size-4" /> Làm lại
          </button>
        </div>
      )}
    </section>
  );
}
