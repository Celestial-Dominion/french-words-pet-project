"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { lookupWord, loadExamplesForWords, loadQuiz, type ReadingDoc, type ExampleSentence, type QuizQuestion } from "@/lib/data";
import { markRead } from "@/lib/db";
import type { Word } from "@/lib/types";
import WordDetail from "@/components/word-detail";
import { Passage, ReaderToolbar, useListenAll } from "@/components/passage";
import { DoneButton, useIsRead } from "@/components/done-toggle";
import { NextLink, type NextItem } from "@/components/story-reader";
import { Quiz } from "@/components/quiz";
import { SourceNote } from "@/components/source-note";

export default function Reader({ doc, onBack, next }: { doc: ReadingDoc; onBack: () => void; next?: NextItem | null }) {
  const [selected, setSelected] = useState<Word | null>(null);
  const [examples, setExamples] = useState<ExampleSentence[]>([]);
  const [showVi, setShowVi] = useState(true);
  const read = useIsRead(doc.id); // undefined = đang đọc IndexedDB
  const manual = useRef(false); // đã bấm tay ở lần mở này → không tự đánh dấu nữa
  const endRef = useRef<HTMLDivElement>(null);
  const { activeIdx, playing, toggle, playFrom, step, rate, cycleRate } = useListenAll(doc.sentences);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);

  // Câu hỏi đọc hiểu: file riêng, tải sau khi mở bài (bài cũ chưa có thì không hiện).
  useEffect(() => {
    if (!doc.quiz) return;
    let live = true;
    loadQuiz(doc.id)
      .then((q) => live && setQuiz(q))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [doc.id, doc.quiz]);

  // Tự đánh dấu "đã đọc" khi cuộn tới cuối bài (không đánh dấu lúc vừa mở — như app Anh); đã bấm tay thì thôi.
  useEffect(() => {
    const el = endRef.current;
    if (!el || read !== false || manual.current) return;
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
  }, [doc.id, read]);
  const toggleRead = () => {
    manual.current = true;
    void markRead(doc.id, !read).catch(() => {});
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

      <Passage sentences={doc.sentences} paras={doc.paras} showVi={showVi} activeIdx={activeIdx} onTapWord={onTapWord} onPlayFrom={(i) => playFrom(i, true)} />

      {doc.source && <SourceNote source={doc.source} className="mt-6 text-xs leading-relaxed text-muted-foreground" />}

      <div ref={endRef} data-testid="reading-end" aria-hidden className="h-px" />

      {quiz && quiz.length > 0 && <Quiz key={doc.id} questions={quiz} showVi={showVi} onTapWord={onTapWord} />}
      {/* Đánh dấu đã đọc — bật/tắt được (như HSK) */}
      <div className="mt-8 flex justify-center">
        <DoneButton kind="read" done={read === true} onToggle={toggleRead} />
      </div>

      {next && <NextLink next={next} noun="Bài tiếp theo" />}

      {selected && <WordDetail word={selected} examples={examples} onClose={() => setSelected(null)} />}
    </div>
  );
}
