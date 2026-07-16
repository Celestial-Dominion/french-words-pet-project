"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Check } from "lucide-react";
import { lookupWord, loadExamplesForWords, type ReadingDoc, type ExampleSentence } from "@/lib/data";
import { markRead } from "@/lib/db";
import type { Word } from "@/lib/types";
import WordDetail from "@/components/word-detail";
import { Passage, ReaderToolbar, useListenAll } from "@/components/passage";

export default function Reader({ doc, onBack }: { doc: ReadingDoc; onBack: () => void }) {
  const [selected, setSelected] = useState<Word | null>(null);
  const [examples, setExamples] = useState<ExampleSentence[]>([]);
  const [showVi, setShowVi] = useState(true);
  const [read, setRead] = useState(false);
  const { activeIdx, playing, toggle, rate, cycleRate } = useListenAll(doc.sentences);

  useEffect(() => {
    markRead(doc.id).then(() => setRead(true));
  }, [doc.id]);
  const toggleRead = async () => {
    await markRead(doc.id, !read);
    setRead((v) => !v);
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
          <h1 className="truncate text-2xl font-bold sm:text-3xl">{doc.title_fr}</h1>
          <div className="truncate text-sm text-muted-foreground">{doc.title_vi}</div>
        </div>
      </div>

      <ReaderToolbar
        playing={playing}
        onToggle={toggle}
        rate={rate}
        onCycleRate={cycleRate}
        showVi={showVi}
        onToggleVi={() => setShowVi((v) => !v)}
      />

      <Passage sentences={doc.sentences} showVi={showVi} activeIdx={activeIdx} onTapWord={onTapWord} />

      {/* Đánh dấu đã đọc — bật/tắt được (như HSK) */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={() => void toggleRead()}
          className={
            read
              ? "inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-500/25 dark:text-emerald-300"
              : "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          }
        >
          <Check className="size-4" />
          {read ? "Đã đọc — chạm để bỏ đánh dấu" : "Đánh dấu đã đọc"}
        </button>
      </div>

      {selected && <WordDetail word={selected} examples={examples} onClose={() => setSelected(null)} />}
    </div>
  );
}
