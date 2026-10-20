"use client";

// Trang một truyện nhiều chương: nhớ chương đang đọc (lib/story-progress, đồng bộ qua Firebase). Cuộn tới cuối truyện
// KHÔNG tự đánh dấu khi chương cuối có câu hỏi: trả lời xong câu cuối của câu hỏi CHƯƠNG CUỐI, đúng từ 70% (PASS_SCORE
// như Ngữ pháp) mới tự đánh dấu Đã đọc (câu hỏi các chương trước không đổi trạng thái; không bao giờ tự bỏ đánh dấu).
// Chương cuối không có câu hỏi giữ cách cũ: cuộn tới cuối chương cuối là đánh dấu. Nút tay bấm lúc nào cũng được.
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { lookupWord, loadExamplesForWords, loadStoryQuiz, type StoryDoc, type ExampleSentence, type QuizQuestion } from "@/lib/data";
import { markRead } from "@/lib/db";
import type { Word } from "@/lib/types";
import WordDetail from "@/components/word-detail";
import { Passage, ReaderToolbar, useListenAll } from "@/components/passage";
import { DoneButton, useIsRead } from "@/components/done-toggle";
import { savedChapter, saveChapter } from "@/lib/story-progress";
import { Quiz } from "@/components/quiz";
import { SourceNote } from "@/components/source-note";
import { playAudio, sentenceAudioUrl } from "@/lib/tts";
import Link from "next/link";

export interface NextItem {
  href: string;
  title_fr: string;
  title_vi: string;
}

export default function StoryReader({ doc, onBack, next }: { doc: StoryDoc; onBack: () => void; next?: NextItem | null }) {
  const [ci, setCi] = useState(() => savedChapter(doc.id, doc.chapters.length));
  const [showVi, setShowVi] = useState(true);
  const [selected, setSelected] = useState<Word | null>(null);
  const [examples, setExamples] = useState<ExampleSentence[]>([]);

  const chapter = doc.chapters[ci];
  const last = ci === doc.chapters.length - 1;
  const { activeIdx, playing, toggle, playFrom, step, rate, cycleRate, stop } = useListenAll(chapter.sentences);

  // Câu hỏi đọc hiểu cuối mỗi chương (tải lười, một file cho cả truyện)
  const [quiz, setQuiz] = useState<QuizQuestion[][] | null>(null);
  useEffect(() => {
    if (!doc.quiz) return;
    let live = true;
    loadStoryQuiz(doc.id)
      .then((q) => live && setQuiz(q))
      .catch(() => live && setQuiz([]));
    return () => {
      live = false;
    };
  }, [doc.id, doc.quiz]);
  const chQuiz = quiz?.[ci] ?? [];
  // Nghe câu hỏi / phương án: tạm dừng (không xoá vị trí) phần đọc cả chương, cùng tốc độ đọc đang chọn.
  const listen = (fr: string) => {
    if (playing) toggle();
    playAudio(sentenceAudioUrl(fr)).playbackRate = rate;
  };

  const read = useIsRead(doc.id); // undefined = đang đọc IndexedDB
  const manual = useRef(false); // đã bấm tay ở lần mở này → cuộn tới cuối không tự đánh dấu nữa
  const endRef = useRef<HTMLDivElement>(null);

  // Chương cuối có câu hỏi (đang tải cũng tính) → đánh dấu qua câu hỏi; không có → cuộn tới cuối CHƯƠNG CUỐI.
  const byQuiz = !!doc.quiz && (quiz === null || (quiz[doc.chapters.length - 1]?.length ?? 0) > 0);
  useEffect(() => {
    const el = endRef.current;
    if (!el || byQuiz || read !== false || !last || manual.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || manual.current) return;
        io.disconnect();
        void markRead(doc.id, true).catch(() => {});
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [doc.id, read, last, ci, byQuiz]);
  const toggleRead = () => {
    manual.current = true;
    void markRead(doc.id, !read).catch(() => {});
  };
  const quizDone = (passed: boolean) => {
    if (passed && read !== true) void markRead(doc.id, true).catch(() => {});
  };

  const goChapter = (n: number) => {
    stop();
    setCi(n);
    saveChapter(doc.id, n); // chỉ ghi khi người dùng chuyển chương (mở truyện không đẩy mốc đồng bộ lên)
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onTapWord = async (token: string) => {
    const w = await lookupWord(token);
    if (!w) return;
    const ex = await loadExamplesForWords(w.level, [w.id]);
    setExamples(ex[w.id] || []);
    setSelected(w);
  };

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <div className="mb-3 flex items-center gap-2">
        <button onClick={onBack} aria-label="Quay lại" className="grid size-9 shrink-0 place-items-center rounded-full bg-muted transition-colors hover:bg-muted/70">
          <ChevronLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl leading-tight font-bold break-words sm:text-3xl">{doc.title_fr}</h1>
          <div className="mt-0.5 text-sm text-muted-foreground">{doc.title_vi}</div>
        </div>
        <DoneButton kind="read" done={read === true} onToggle={toggleRead} className="h-9" />
      </div>

      {/* chọn chương */}
      <div className="mb-3">
        <select
          value={ci}
          onChange={(e) => goChapter(Number(e.target.value))}
          className="w-full rounded-xl border bg-card px-3 py-2 text-sm font-medium outline-none focus:border-ring"
        >
          {doc.chapters.map((c, i) => (
            <option key={i} value={i}>
              Chương {i + 1}/{doc.chapters.length} · {c.title_fr ?? c.title_vi}
            </option>
          ))}
        </select>
      </div>

      <ReaderToolbar
        playing={playing}
        started={activeIdx >= 0}
        onToggle={toggle}
        onStep={step}
        rate={rate}
        onCycleRate={cycleRate}
        showVi={showVi}
        onToggleVi={() => setShowVi((v) => !v)}
      />

      {chapter.title_fr && (
        <h2 className="mt-5 mb-1 text-lg leading-snug font-bold sm:text-xl">
          <span className="mr-1.5 text-muted-foreground">{ci + 1}.</span>
          {chapter.title_fr}
          {showVi && <span className="mt-0.5 block text-sm font-normal text-muted-foreground">{chapter.title_vi}</span>}
        </h2>
      )}

      <Passage sentences={chapter.sentences} paras={chapter.paras} showVi={showVi} activeIdx={activeIdx} onTapWord={onTapWord} onPlayFrom={(i) => playFrom(i, true)} />
      {last && doc.source && <SourceNote source={doc.source} className="mt-6 text-xs leading-relaxed text-muted-foreground" />}
      <div ref={endRef} data-testid="story-end" aria-hidden className="h-px" />

      {chQuiz.length > 0 && (
        <Quiz
          key={`${doc.id}-${ci}`}
          questions={chQuiz}
          showVi={showVi}
          onTapWord={onTapWord}
          onListen={listen}
          autoMark={last ? { unit: "truyện", done: read, onFinish: quizDone } : undefined}
          title={`Câu hỏi · Chương ${ci + 1}`}
        />
      )}

      {/* điều hướng chương — đếm n/tổng ở giữa (như HSK) */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          onClick={() => goChapter(Math.max(0, ci - 1))}
          disabled={ci === 0}
          className="flex items-center gap-1 rounded-xl bg-muted px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          <ChevronLeft className="size-4" /> Trước
        </button>
        <span className="text-sm tabular-nums text-muted-foreground">
          {ci + 1} / {doc.chapters.length}
        </span>
        <button
          onClick={() => (last ? onBack() : goChapter(ci + 1))}
          className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          {last ? "Xong" : "Chương sau"} {!last && <ChevronRight className="size-4" />}
        </button>
      </div>

      {last && next && <NextLink next={next} noun="Truyện tiếp theo" />}

      {selected && <WordDetail word={selected} examples={examples} onClose={() => setSelected(null)} />}
    </div>
  );
}

export function NextLink({ next, noun }: { next: NextItem; noun: string }) {
  return (
    <Link
      href={next.href}
      className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-primary/35 bg-primary/5 px-4 py-3 transition-colors hover:bg-primary/10"
    >
      <span className="min-w-0">
        <span className="block text-xs font-bold tracking-[0.12em] text-primary uppercase">{noun} →</span>
        <span className="block truncate font-semibold">{next.title_fr}</span>
        <span className="block truncate text-xs text-muted-foreground">{next.title_vi}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-primary" />
    </Link>
  );
}
