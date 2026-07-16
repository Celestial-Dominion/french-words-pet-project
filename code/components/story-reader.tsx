"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { lookupWord, loadExamplesForWords, type StoryDoc, type ExampleSentence } from "@/lib/data";
import { markRead } from "@/lib/db";
import type { Word } from "@/lib/types";
import WordDetail from "@/components/word-detail";
import { Passage, ReaderToolbar, useListenAll } from "@/components/passage";

/** Vị trí chương đang đọc lưu localStorage (như HSK) — mở lại truyện là về đúng chương. */
const chapterKey = (id: string) => `fr.story.${id}.ch`;
export function savedChapter(id: string, max: number): number {
  try {
    const n = Number(localStorage.getItem(chapterKey(id)) ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.min(n, max - 1)) : 0;
  } catch {
    return 0;
  }
}

export default function StoryReader({ doc, onBack }: { doc: StoryDoc; onBack: () => void }) {
  const [ci, setCi] = useState(() => savedChapter(doc.id, doc.chapters.length));
  const [showVi, setShowVi] = useState(true);
  const [selected, setSelected] = useState<Word | null>(null);
  const [examples, setExamples] = useState<ExampleSentence[]>([]);

  const chapter = doc.chapters[ci];
  const last = ci === doc.chapters.length - 1;
  const { activeIdx, playing, toggle, rate, cycleRate, stop } = useListenAll(chapter.sentences);

  useEffect(() => {
    if (last) markRead(doc.id);
    try {
      localStorage.setItem(chapterKey(doc.id), String(ci));
    } catch {
      /* bỏ qua */
    }
  }, [last, doc.id, ci]);

  const goChapter = (n: number) => {
    stop();
    setCi(n);
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
          <h1 className="truncate text-2xl font-bold sm:text-3xl">{doc.title_fr}</h1>
          <div className="truncate text-sm text-muted-foreground">{doc.title_vi}</div>
        </div>
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
              Chương {i + 1}/{doc.chapters.length} · {c.title_vi}
            </option>
          ))}
        </select>
      </div>

      <ReaderToolbar
        playing={playing}
        onToggle={toggle}
        rate={rate}
        onCycleRate={cycleRate}
        showVi={showVi}
        onToggleVi={() => setShowVi((v) => !v)}
      />

      <Passage sentences={chapter.sentences} showVi={showVi} activeIdx={activeIdx} onTapWord={onTapWord} />

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

      {selected && <WordDetail word={selected} examples={examples} onClose={() => setSelected(null)} />}
    </div>
  );
}
