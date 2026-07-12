"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { lookupWord, loadExamples, type StoryDoc, type ExampleSentence } from "@/lib/data";
import { markRead } from "@/lib/db";
import type { Word } from "@/lib/types";
import WordDetail from "@/components/word-detail";
import SentenceBlock from "@/components/sentence-block";

export default function StoryReader({ doc, onBack }: { doc: StoryDoc; onBack: () => void }) {
  const [ci, setCi] = useState(0);
  const [showVi, setShowVi] = useState(true);
  const [selected, setSelected] = useState<Word | null>(null);
  const [examples, setExamples] = useState<ExampleSentence[]>([]);

  const chapter = doc.chapters[ci];
  const last = ci === doc.chapters.length - 1;

  // đánh dấu đã đọc khi xem tới chương cuối
  useEffect(() => {
    if (last) markRead(doc.id);
  }, [last, doc.id]);

  const onTapWord = async (token: string) => {
    const w = await lookupWord(token);
    if (!w) return;
    const ex = await loadExamples(w.level);
    setExamples(ex[w.id] || []);
    setSelected(w);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center gap-2">
        <button onClick={onBack} aria-label="Quay lại" className="grid h-9 w-9 place-items-center rounded-full bg-muted">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{doc.title_fr}</h1>
          <div className="truncate text-xs text-muted-foreground">{doc.title_vi}</div>
        </div>
        <button onClick={() => setShowVi((v) => !v)} className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs">
          {showVi ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          Dịch
        </button>
      </div>

      <div className="mb-3 text-sm font-semibold text-muted-foreground">
        {chapter.title_vi} <span className="text-muted-foreground">· {ci + 1}/{doc.chapters.length}</span>
      </div>

      <div className="space-y-4">
        {chapter.sentences.map((s, i) => (
          <SentenceBlock key={i} fr={s.fr} vi={s.vi} showVi={showVi} onTapWord={onTapWord} />
        ))}
      </div>

      {/* điều hướng chương */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          onClick={() => setCi((c) => Math.max(0, c - 1))}
          disabled={ci === 0}
          className="flex items-center gap-1 rounded-xl bg-muted px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Trước
        </button>
        <button
          onClick={() => (last ? onBack() : setCi((c) => c + 1))}
          className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          {last ? "Xong" : "Chương sau"} {!last && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {selected && <WordDetail word={selected} examples={examples} onClose={() => setSelected(null)} />}
    </div>
  );
}
