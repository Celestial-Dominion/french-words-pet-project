"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Check, Play, Square } from "lucide-react";
import { lookupWord, loadExamples, type ReadingDoc, type ExampleSentence } from "@/lib/data";
import { markRead } from "@/lib/db";
import { sentenceAudioUrl } from "@/lib/tts";
import { cn } from "@/lib/utils";
import type { Word } from "@/lib/types";
import WordDetail from "@/components/word-detail";
import SentenceBlock from "@/components/sentence-block";

export default function Reader({ doc, onBack }: { doc: ReadingDoc; onBack: () => void }) {
  const [selected, setSelected] = useState<Word | null>(null);
  const [examples, setExamples] = useState<ExampleSentence[]>([]);
  const [showVi, setShowVi] = useState(true);
  const [read, setRead] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    markRead(doc.id).then(() => setRead(true));
  }, [doc.id]);

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setActiveIdx(-1);
  };
  useEffect(() => () => stop(), []);

  // Nghe cả bài: phát tuần tự từng câu, tô sáng câu đang đọc, tự cuộn vào giữa.
  const playFrom = (i: number) => {
    if (i >= doc.sentences.length) return stop();
    setActiveIdx(i);
    const a = new Audio(sentenceAudioUrl(doc.sentences[i].fr));
    audioRef.current = a;
    a.onended = () => playFrom(i + 1);
    a.play().catch(() => stop());
    document.getElementById(`sent-${i}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  const togglePlayAll = () => (activeIdx >= 0 ? stop() : playFrom(0));

  const onTapWord = async (token: string) => {
    const w = await lookupWord(token);
    if (!w) return;
    const ex = await loadExamples(w.level);
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
          <h1 className="truncate text-2xl font-bold sm:text-3xl">{doc.title_fr}</h1>
          <div className="truncate text-sm text-muted-foreground">{doc.title_vi}</div>
        </div>
      </div>

      {/* Thanh công cụ dính: nghe cả bài + bật/tắt dịch */}
      <div className="sticky top-16 z-20 -mx-4 mb-4 flex items-center gap-2 bg-background/85 px-4 py-2 backdrop-blur">
        <button
          onClick={togglePlayAll}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-[0.98]",
            activeIdx >= 0 ? "bg-rose-500 text-white" : "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
          )}
        >
          {activeIdx >= 0 ? <Square className="size-4" /> : <Play className="size-4" />}
          {activeIdx >= 0 ? "Dừng" : "Nghe cả bài"}
        </button>
        <div className="ml-auto flex rounded-full border p-0.5 text-sm font-medium">
          <button
            onClick={() => setShowVi(false)}
            className={cn("rounded-full px-3 py-1 transition-colors", !showVi ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            Ẩn dịch
          </button>
          <button
            onClick={() => setShowVi(true)}
            className={cn("rounded-full px-3 py-1 transition-colors", showVi ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            Hiện dịch
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {doc.sentences.map((s, i) => (
          <div key={i} id={`sent-${i}`}>
            <SentenceBlock fr={s.fr} vi={s.vi} showVi={showVi} active={i === activeIdx} onTapWord={onTapWord} />
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
        <Check className="size-4" />
        {read ? "Đã đánh dấu đã đọc" : "…"}
      </div>

      {selected && <WordDetail word={selected} examples={examples} onClose={() => setSelected(null)} />}
    </div>
  );
}
