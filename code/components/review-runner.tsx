"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Volume2, Check, Sparkles, Undo2 } from "lucide-react";
import { recordAnswer, undoAnswer, recordPractice, addXp, progressSummary } from "@/lib/db";
import { XP, badgeGroups, rankForWords, type Stats, type Badge } from "@/lib/gamify";
import { ratingFromSpeed } from "@/lib/srs";
import { wordAudioUrl, sentenceAudioUrl } from "@/lib/tts";
import { suggestReading, type ReadingSuggestion } from "@/lib/suggest";
import { cn } from "@/lib/utils";
import type { Question } from "@/lib/review-session";
import type { SrsConfig, ReviewRecord } from "@/lib/types";
import SentenceArrange from "@/components/sentence-arrange";

const REQUEUE_GAP = 3; // sai → gặp lại sau ~3 thẻ
const BREAK_EVERY = 22; // mời nghỉ sau mỗi chặng 22 thẻ

function play(url: string) {
  new Audio(url).play().catch(() => {});
}

function statsOf(s: Awaited<ReturnType<typeof progressSummary>>): Stats {
  return {
    words: s.words, xp: s.xp, streak: s.streak, reads: s.reads, reviews: s.reviews,
    correct: s.correct, activeDays: s.activeDays, matured: s.matured,
    maxDayReviews: s.maxDayReviews, weekend: s.weekend, byLevel: s.byLevel,
  };
}
const earnedIds = (s: Stats) => new Set(badgeGroups(s).flatMap((g) => g.badges).filter((b) => b.earned).map((b) => b.id));

interface UndoInfo {
  wordId: string;
  prev: ReviewRecord | undefined;
  correct: boolean;
  isNew: boolean;
  xp: number;
  comboBefore: number;
  requeued: Question | null;
}

interface Summary {
  xpGained: number;
  perfect: boolean;
  maxCombo: number;
  newBadges: Badge[];
  rankUp: { from: string; to: string } | null;
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
  const [qs, setQs] = useState<Question[]>(questions);
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const [undoInfo, setUndoInfo] = useState<UndoInfo | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [suggestion, setSuggestion] = useState<ReadingSuggestion | null>(null);

  const q = qs[i];
  const baseTotal = questions.length;

  // gamify trong phiên
  const xpRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const wrongRef = useRef(false);
  const gradedRef = useRef(0);
  const sinceBreakRef = useRef(0);
  const shownAtRef = useRef(0);
  const beforeRef = useRef<{ ids: Set<string>; rankIndex: number; rankVi: string } | null>(null);
  const finalizedRef = useRef(false);

  useEffect(() => {
    progressSummary().then((s) => {
      const st = statsOf(s);
      beforeRef.current = { ids: earnedIds(st), rankIndex: rankForWords(st.words).index, rankVi: rankForWords(st.words).rank.vi };
    });
  }, []);

  // Thoát giữa phiên → hỏi xác nhận; chặn cả back/refresh khi đang trong phiên.
  const requestExit = useCallback(() => setConfirmExit(true), []);
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = !done;
  }, [done]);
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!activeRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onPop = () => {
      if (!activeRef.current) return;
      window.history.pushState(null, ""); // giữ trang, hỏi xác nhận
      setConfirmExit(true);
    };
    window.history.pushState(null, "");
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  // Nhớ-lại-trước (recall-first): ẩn phương án MCQ đến khi bấm hiện. Mốc tính tốc độ
  // trả lời bắt đầu từ lúc HIỆN đáp án (không phạt thời gian đang cố nhớ).
  const gate = config.recallFirst !== false;
  useEffect(() => {
    if (q?.kind === "mcq") {
      setRevealed(!gate);
      if (!gate) shownAtRef.current = Date.now();
    } else {
      setRevealed(true);
      shownAtRef.current = Date.now();
    }
  }, [i, q?.kind, gate]);
  const reveal = () => {
    setRevealed(true);
    shownAtRef.current = Date.now();
  };

  // Tự phát âm khi hiện thẻ: learn + MCQ nghĩa/nghe (KHÔNG phát ở chế độ ngược/cloze — lộ đáp án).
  useEffect(() => {
    if (!q) return;
    if (q.kind === "learn" || (q.kind === "mcq" && (q.mode === "meaning" || q.mode === "listen"))) {
      play(wordAudioUrl(q.word));
    }
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const finalize = useCallback(async () => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    const perfect = !wrongRef.current && gradedRef.current > 0;
    if (perfect) {
      xpRef.current += XP.perfectSession;
      await addXp(XP.perfectSession);
    }
    const after = statsOf(await progressSummary());
    const before = beforeRef.current;
    const afterRank = rankForWords(after.words);
    const newBadges = before
      ? badgeGroups(after).flatMap((g) => g.badges).filter((b) => b.earned && !before.ids.has(b.id))
      : [];
    setSummary({
      xpGained: xpRef.current,
      perfect,
      maxCombo: maxComboRef.current,
      newBadges,
      rankUp: before && afterRank.index > before.rankIndex ? { from: before.rankVi, to: afterRank.rank.vi } : null,
    });
    setDone(true);
    // gợi ý bài đọc chứa nhiều từ vừa học/ôn nhất (chạy nền, có thì hiện)
    const ids = [...new Set(qs.filter((x) => x.kind === "mcq").map((x) => x.word.id))];
    suggestReading(ids).then(setSuggestion).catch(() => {});
  }, [qs]);

  const next = () => {
    setChosen(null);
    setUndoInfo(null);
    if (i + 1 >= qs.length) {
      void finalize();
      return;
    }
    sinceBreakRef.current += 1;
    if (sinceBreakRef.current >= BREAK_EVERY && qs.length - (i + 1) >= 4) {
      sinceBreakRef.current = 0;
      setOnBreak(true);
    }
    setI(i + 1);
  };

  if (done) {
    return (
      <SessionShell title={title} onExit={onExit} progress={1}>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain sm:flex-none sm:overflow-visible">
          <div className="flex flex-col items-center gap-3 rounded-3xl border bg-gradient-to-br from-primary/10 to-transparent p-8 text-center sm:p-10">
            <div className="text-6xl">{summary?.perfect ? "🏆" : right > 0 ? "🎉" : "💪"}</div>
            <div className="text-2xl font-bold">Xong phiên!</div>
            <div className="text-muted-foreground">
              Đúng {right}/{qs.length}
              {summary && summary.maxCombo >= 3 ? ` · chuỗi đúng dài nhất ${summary.maxCombo}` : ""}
            </div>
            {summary && summary.xpGained > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-4 py-2 text-lg font-bold text-amber-600 dark:text-amber-400">
                <Sparkles className="size-5" /> +{summary.xpGained} XP{summary.perfect ? " (phiên hoàn hảo +20)" : ""}
              </div>
            )}
            {summary?.rankUp && (
              <div className="rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
                🎖️ Thăng cấp! <span className="text-muted-foreground">{summary.rankUp.from}</span> →{" "}
                <b>{summary.rankUp.to}</b>
              </div>
            )}
            {summary && summary.newBadges.length > 0 && (
              <div className="w-full">
                <div className="mb-2 text-sm font-semibold">Mở {summary.newBadges.length} huy hiệu mới</div>
                <div className="flex flex-wrap justify-center gap-3">
                  {summary.newBadges.slice(0, 8).map((b) => (
                    <div key={b.id} className="flex w-20 flex-col items-center gap-1">
                      <span className="grid size-11 place-items-center rounded-full bg-amber-500/15 text-xl">{b.icon}</span>
                      <span className="text-[11px] leading-tight text-muted-foreground">{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={onExit}
              className="mt-2 w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] sm:w-auto sm:px-10"
            >
              Hoàn tất
            </button>
          </div>
          {suggestion && (
            <a
              href={`${suggestion.type === "reading" ? "/bai-doc" : "/truyen"}?open=${encodeURIComponent(suggestion.id)}`}
              className="block rounded-2xl border border-primary/40 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
            >
              <div className="text-sm font-semibold text-primary">📖 Đọc ngay để nhớ lâu</div>
              <div className="mt-1 text-sm leading-relaxed">
                <b>{suggestion.count} từ</b> vừa học có trong {suggestion.type === "reading" ? "bài đọc" : "truyện"}{" "}
                <span className="font-semibold">“{suggestion.title_fr}”</span>{" "}
                <span className="text-muted-foreground">· {suggestion.title_vi}</span>
              </div>
            </a>
          )}
        </div>
      </SessionShell>
    );
  }

  if (!q) return null;

  // ---- Màn nghỉ giữa chặng ----
  if (onBreak) {
    return (
      <SessionShell title={title} onExit={requestExit} progress={i / qs.length}>
        <div className="my-auto w-full space-y-5 rounded-3xl border bg-gradient-to-br from-primary/10 to-transparent p-8 text-center sm:p-10">
          <div className="text-5xl">☕</div>
          <p className="text-xl font-bold">Nghỉ một chút nhé</p>
          <p className="text-sm text-muted-foreground">
            Đã làm <b className="text-foreground">{i}</b> thẻ · còn <b className="text-foreground">{qs.length - i}</b> thẻ.
            Nghỉ mắt vài giây rồi tiếp tục.
          </p>
          <button
            onClick={() => setOnBreak(false)}
            className="w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] sm:w-auto sm:px-8"
          >
            Ôn tiếp
          </button>
        </div>
      </SessionShell>
    );
  }

  // chấm MCQ / gender
  const answerChoice = async (idx: number) => {
    if (q.kind === "arrange" || q.kind === "learn" || chosen !== null) return;
    setChosen(idx);
    const correct = idx === q.answer;
    const comboBefore = comboRef.current;
    if (correct) {
      setRight((r) => r + 1);
      comboRef.current += 1;
      if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
    } else {
      comboRef.current = 0;
      wrongRef.current = true;
    }

    if (q.kind === "mcq") {
      gradedRef.current += 1;
      // trả lời xong → nghe lại (cloze đọc CẢ CÂU, còn lại đọc từ)
      if (q.mode === "cloze" && q.clozeFr) play(sentenceAudioUrl(q.clozeFr));
      else play(wordAudioUrl(q.word));
      const rating = ratingFromSpeed(correct, shownAtRef.current ? Date.now() - shownAtRef.current : 99_999);
      const xp = correct ? (q.isNew ? XP.newWord : XP.review) : 0;
      // SAI → chèn lại thẻ sau vài lá để học lại ngay trong phiên (nếu chưa có bản chờ)
      let requeued: Question | null = null;
      if (!correct && !qs.slice(i + 1).some((x) => x.kind === "mcq" && x.word.id === q.word.id)) {
        requeued = { ...q, isNew: false };
        setQs((prev) => {
          const copy = [...prev];
          copy.splice(Math.min(i + 1 + REQUEUE_GAP, copy.length), 0, requeued!);
          return copy;
        });
      }
      const { prev } = await recordAnswer({ wordId: q.word.id, level: q.word.level, correct, isNew: q.isNew, rating });
      if (xp) void addXp(xp);
      xpRef.current += xp;
      setUndoInfo({ wordId: q.word.id, prev, correct, isNew: q.isNew, xp, comboBefore, requeued });
    } else {
      void recordPractice(correct);
      const xp = correct ? XP.practice : 0;
      if (xp) void addXp(xp);
      xpRef.current += xp;
    }
    if (correct && config.autoAdvance) setTimeout(next, 850);
  };

  // Hoàn tác lần chấm vừa rồi (lỡ bấm nhầm) → khôi phục FSRS + làm lại câu này.
  const doUndo = async () => {
    const u = undoInfo;
    if (!u) return;
    setUndoInfo(null);
    await undoAnswer({ wordId: u.wordId, prev: u.prev, correct: u.correct, isNew: u.isNew });
    if (u.xp) {
      await addXp(-u.xp);
      xpRef.current -= u.xp;
    }
    if (u.correct) setRight((r) => Math.max(0, r - 1));
    comboRef.current = u.comboBefore;
    gradedRef.current = Math.max(0, gradedRef.current - 1);
    if (u.requeued) setQs((prev) => prev.filter((x) => x !== u.requeued));
    setChosen(null);
    setRevealed(true);
    shownAtRef.current = Date.now();
  };

  return (
    <>
    <SessionShell title={title} onExit={requestExit} progress={i / qs.length} extra={qs.length > baseTotal ? `+${qs.length - baseTotal} làm lại` : undefined}>
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
              comboRef.current += 1;
              if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
              xpRef.current += XP.practice;
              void addXp(XP.practice);
            } else {
              comboRef.current = 0;
              wrongRef.current = true;
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
              {q.kind === "gender" ? (
                <>
                  <div className="text-4xl font-bold tracking-tight sm:text-5xl">… {q.word.id}</div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Danh từ này dùng mạo từ nào?</div>
                </>
              ) : q.mode === "listen" ? (
                <>
                  <button
                    onClick={() => play(wordAudioUrl(q.word))}
                    aria-label="Nghe lại"
                    className="flex size-24 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform active:scale-95"
                  >
                    <Volume2 className="size-10" />
                  </button>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {chosen === null ? "Nghe rồi chọn nghĩa (chạm loa để nghe lại)" : q.word.id + " " + q.word.ipa}
                  </div>
                </>
              ) : q.mode === "cloze" ? (
                <>
                  <div className="text-xl leading-relaxed sm:text-2xl">
                    {q.clozeBefore}
                    <span className="mx-1 inline-flex min-w-[3ch] justify-center rounded-lg border-2 border-dashed border-primary/60 px-2 align-middle font-bold text-primary">
                      {chosen !== null ? q.word.id : "?"}
                    </span>
                    {q.clozeAfter}
                  </div>
                  {q.clozeVi && <div className="text-sm text-muted-foreground">{q.clozeVi}</div>}
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Điền từ còn thiếu</div>
                </>
              ) : q.mode === "reverse" ? (
                <>
                  <div className="text-2xl font-semibold sm:text-3xl">{q.prompt}</div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Chọn từ tiếng Pháp đúng</div>
                </>
              ) : (
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
              )}
            </div>

            {/* nhớ-lại-trước: ẩn phương án đến khi bấm hiện */}
            {q.kind === "mcq" && !revealed && chosen === null ? (
              <button
                onClick={reveal}
                className="w-full rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 py-4 text-base font-medium text-primary transition-colors hover:bg-primary/10 active:scale-[0.99]"
              >
                🧠 Thử nhớ trong đầu… <span className="opacity-70">bấm để hiện đáp án</span>
              </button>
            ) : (
              <div className={cn("grid gap-2.5", q.kind === "gender" ? "grid-cols-2" : "grid-cols-1")}>
                {q.options.map((opt, idx) => {
                  const isAnswer = idx === q.answer;
                  const isChosen = idx === chosen;
                  const show = chosen !== null;
                  return (
                    <button
                      key={idx}
                      onClick={() => void answerChoice(idx)}
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
            )}
          </div>

          {/* nút tiếp + hoàn tác khi đã trả lời */}
          {chosen !== null && (
            <div className="shrink-0 space-y-2 pt-4">
              <button
                onClick={next}
                className="w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99]"
              >
                {i + 1 >= qs.length ? "Kết thúc" : "Tiếp tục"}
              </button>
              {undoInfo && (
                <button
                  onClick={() => void doUndo()}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Undo2 className="size-4" /> Hoàn tác — lỡ bấm nhầm
                </button>
              )}
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
  extra,
  children,
}: {
  title: string;
  onExit: () => void;
  progress: number;
  extra?: string;
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
          <div className="flex items-baseline gap-2 text-sm font-medium">
            {title}
            {extra && <span className="text-xs text-muted-foreground">{extra}</span>}
          </div>
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
