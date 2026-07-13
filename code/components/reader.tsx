"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Check, Eye, EyeOff } from "lucide-react";
import { lookupWord, loadExamples, type ReadingDoc, type ExampleSentence } from "@/lib/data";
import { markRead } from "@/lib/db";
import type { Word } from "@/lib/types";
import WordDetail from "@/components/word-detail";
import SentenceBlock from "@/components/sentence-block";

export default function Reader({ doc, onBack }: { doc: ReadingDoc; onBack: () => void }) {
  const [selected, setSelected] = useState<Word | null>(null);
  const [examples, setExamples] = useState<ExampleSentence[]>([]);
  const [showVi, setShowVi] = useState(true);
  const [read, setRead] = useState(false);

  useEffect(() => {
    markRead(doc.id).then(() => setRead(true));
  }, [doc.id]);

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
          <h1 className="truncate text-2xl font-bold sm:text-3xl">{doc.title_fr}</h1>
          <div className="truncate text-xs text-muted-foreground">{doc.title_vi}</div>
        </div>
        <button
          onClick={() => setShowVi((v) => !v)}
          className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs"
        >
          {showVi ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          Dịch
        </button>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">Chạm vào từ bất kỳ để tra nghĩa.</p>

      <div className="space-y-4">
        {doc.sentences.map((s, i) => (
          <SentenceBlock key={i} fr={s.fr} vi={s.vi} showVi={showVi} onTapWord={onTapWord} />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
        <Check className="h-4 w-4" />
        {read ? "Đã đánh dấu đã đọc" : "…"}
      </div>

      {selected && <WordDetail word={selected} examples={examples} onClose={() => setSelected(null)} />}
    </div>
  );
}
