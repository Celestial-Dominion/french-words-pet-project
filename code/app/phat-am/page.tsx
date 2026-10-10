"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Volume2, Play, Check, Headphones } from "lucide-react";
import { loadPhonics, type PhonicsLesson, type PhonicsItem } from "@/lib/data";
import { phonicsAudioUrl, playAudio } from "@/lib/tts";
import { requestSync, onSyncMerged } from "@/lib/sync";
import { cn } from "@/lib/utils";
import { getCourseDone, markCourseDone } from "@/lib/progress-local";
import { DoneButton, DoneFilterBar, EmptyFilter, TickRow, byDone, type DoneFilter } from "@/components/done-toggle";

function play(say: string) {
  playAudio(phonicsAudioUrl(say)); // một tiếng tại một thời điểm — bấm liên tiếp không chồng tiếng
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// ---- Quiz nghe → chọn cách viết (phân biệt âm) ----
interface QuizRound {
  target: PhonicsItem;
  options: PhonicsItem[];
}
function buildQuiz(lesson: PhonicsLesson, rounds = 5): QuizRound[] {
  const pool = lesson.items.filter((it) => it.say);
  if (pool.length < 2) return [];
  return shuffle(pool)
    .slice(0, Math.min(rounds, pool.length))
    .map((target) => ({
      target,
      options: shuffle([target, ...shuffle(pool.filter((x) => x.say !== target.say)).slice(0, 3)]),
    }));
}

export default function PhatAmPage() {
  const [lessons, setLessons] = useState<PhonicsLesson[] | null>(null);
  const [active, setActive] = useState<PhonicsLesson | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<DoneFilter>("all");
  const [quiz, setQuiz] = useState<QuizRound[] | null>(null);
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    loadPhonics().then(setLessons);
    // tiến độ khoá nằm ở localStorage (hệ thống ngoài React) → đọc sau mount; kéo máy khác về thì đọc lại
    const load = () => setDone(getCourseDone("phonics"));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return onSyncMerged(load);
  }, []);

  const markDone = (id: string, v: boolean) => {
    setDone(markCourseDone("phonics", id, v)); // tích / bỏ tích mang mốc thời gian (đồng bộ: hành động sau cùng thắng)
    requestSync(); // tiến độ phát âm giờ được đồng bộ cloud
  };

  const startQuiz = () => {
    if (!active) return;
    const qz = buildQuiz(active);
    if (!qz.length) return;
    setQuiz(qz);
    setRound(0);
    setPicked(null);
    setScore(0);
    play(qz[0].target.say);
  };

  // ---- Quiz nghe ----
  if (active && quiz) {
    const r = quiz[round];
    const finished = round >= quiz.length;
    if (finished) {
      const pass = score >= Math.ceil(quiz.length * 0.8);
      return (
        <div className="mx-auto max-w-xl">
          <div className="flex flex-col items-center gap-3 rounded-3xl border bg-gradient-to-br from-primary/10 to-transparent p-8 text-center">
            <div className="text-5xl">{pass ? "🎉" : "💪"}</div>
            <div className="text-2xl font-bold">
              {score}/{quiz.length} câu đúng
            </div>
            {pass && !done.has(active.id) && (
              <div className="text-sm text-emerald-600 dark:text-emerald-400">Tuyệt! Bài này được đánh dấu đã học.</div>
            )}
            <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <button onClick={startQuiz} className="rounded-2xl border px-6 py-3 text-sm font-semibold hover:bg-muted">
                Luyện lại
              </button>
              <button
                onClick={() => {
                  if (pass) markDone(active.id, true);
                  setQuiz(null);
                }}
                className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Về bài học
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Luyện nghe · câu {round + 1}/{quiz.length}
          </span>
          <span>Đúng {score}</span>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-3xl border bg-card p-8 text-center">
          <button
            onClick={() => play(r.target.say)}
            aria-label="Nghe lại"
            className="flex size-20 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform active:scale-95"
          >
            <Volume2 className="size-9" />
          </button>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Nghe rồi chọn đúng chữ/âm vừa đọc
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {r.options.map((opt, idx) => {
            const isAnswer = opt.say === r.target.say;
            const isPicked = idx === picked;
            const show = picked !== null;
            return (
              <button
                key={idx}
                disabled={show}
                onClick={() => {
                  setPicked(idx);
                  if (isAnswer) setScore((s) => s + 1);
                }}
                className={cn(
                  "rounded-2xl border p-4 text-center transition-all",
                  !show && "bg-card hover:bg-muted active:scale-[0.99]",
                  show && isAnswer && "border-emerald-500 bg-emerald-500/15",
                  show && isPicked && !isAnswer && "border-rose-500 bg-rose-500/15",
                  show && !isAnswer && !isPicked && "opacity-50",
                )}
              >
                <span className="block text-xl font-semibold">{opt.say}</span>
                {show && <span className="mt-0.5 block font-mono text-xs text-muted-foreground">{opt.ipa}</span>}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <button
            onClick={() => {
              const n = round + 1;
              setRound(n);
              setPicked(null);
              if (n < quiz.length) play(quiz[n].target.say);
            }}
            className="mt-4 w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            {round + 1 >= quiz.length ? "Xem kết quả" : "Câu tiếp"}
          </button>
        )}
      </div>
    );
  }

  // ---- Trang một bài học ----
  if (active) {
    const isDone = done.has(active.id);
    return (
      <div>
        <div className="mb-3 flex items-center gap-2">
          <button onClick={() => setActive(null)} aria-label="Quay lại" className="grid h-9 w-9 place-items-center rounded-full bg-muted">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 text-2xl font-bold sm:text-3xl">{active.title}</h1>
          <DoneButton kind="learn" done={isDone} onToggle={() => markDone(active.id, !isDone)} className="h-9" />
        </div>
        <p className="mb-4 rounded-xl bg-primary/10 p-3 text-sm text-foreground">{active.intro}</p>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={startQuiz}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]"
          >
            <Headphones className="size-4" /> Luyện nghe phân biệt âm
          </button>
          <button
            onClick={() => markDone(active.id, !isDone)}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition-colors",
              isDone ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "hover:bg-muted",
            )}
          >
            <Check className="size-4" /> {isDone ? "Bỏ đánh dấu đã học" : "Đánh dấu đã học"}
          </button>
        </div>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {active.items.map((it, i) => (
            <li key={i}>
              <button
                onClick={() => play(it.say)}
                className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left active:scale-[0.99]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Volume2 className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="text-xl font-semibold">{it.say}</span>
                    <span className="font-mono text-sm text-muted-foreground">{it.ipa}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{it.vi}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ---- Trang tổng quan ----
  const doneCount = lessons ? lessons.filter((l) => done.has(l.id)).length : 0;
  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Khóa phát âm</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Học cách đọc chữ → âm TRƯỚC khi vào từ vựng A1. Mỗi bài có audio để nghe và bắt chước.
        </p>
      </header>

      {lessons === null ? (
        <p className="text-muted-foreground">Đang tải…</p>
      ) : (
        <>
          {/* tiến độ khóa */}
          <div className="mb-4 rounded-2xl border p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Tiến độ khóa</span>
              <span className="text-muted-foreground">
                {doneCount}/{lessons.length} bài
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / lessons.length) * 100}%` }} />
            </div>
          </div>
          <DoneFilterBar kind="learn" value={status} onChange={setStatus} total={lessons.length} done={doneCount} className="mb-3" />
          <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {byDone(lessons, status, (l) => done.has(l.id)).map((l) => {
              const i = lessons.indexOf(l);
              const isDone = done.has(l.id);
              return (
                <li key={l.id}>
                  <TickRow
                    onOpen={() => setActive(l)}
                    cardClass="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left active:scale-[0.99]"
                    kind="learn"
                    done={isDone}
                    onToggle={() => markDone(l.id, !isDone)}
                    name={l.title}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{l.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {l.items.length} mục · {l.intro.split(".")[0]}
                      </span>
                    </span>
                    <Play className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </TickRow>
                </li>
              );
            })}
          </ol>
          {byDone(lessons, status, (l) => done.has(l.id)).length === 0 && <EmptyFilter kind="learn" filter={status} />}
        </>
      )}
    </div>
  );
}
