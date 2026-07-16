"use client";

// Phần bổ trợ trang /hoc: tìm kiếm từ TOÀN APP + 2 card khóa học (phát âm, ngữ pháp) kèm tiến độ.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Volume2, BookOpenCheck, ChevronRight, Search } from "lucide-react";
import { loadWordLevels, loadWords, loadExamplesForWords, loadPhonics, type ExampleSentence } from "@/lib/data";
import { getCourseDone } from "@/lib/progress-local";
import { GRAMMAR_LESSONS } from "@/app/ngu-phap/lessons";
import { toSearch } from "@/lib/slug";
import { levelMeta } from "@/lib/levels";
import type { Word } from "@/lib/types";
import WordDetail from "@/components/word-detail";

interface Hit {
  id: string;
  level: number;
}

export function GlobalWordSearch() {
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<Record<string, number> | null>(null);
  const [hits, setHits] = useState<Hit[]>([]);
  const [selected, setSelected] = useState<Word | null>(null);
  const [examples, setExamples] = useState<ExampleSentence[]>([]);

  // nạp chỉ mục 11k từ (≈100KB) lần đầu người dùng gõ
  useEffect(() => {
    if (q && !index) loadWordLevels().then(setIndex);
  }, [q, index]);

  useEffect(() => {
    if (!q.trim() || !index) {
      setHits([]);
      return;
    }
    const nq = toSearch(q);
    const out: Hit[] = [];
    for (const [id, level] of Object.entries(index)) {
      const nid = toSearch(id);
      if (nid.startsWith(nq)) out.push({ id, level });
      if (out.length >= 60) break;
    }
    // khớp đầu từ trước, ưu tiên từ ngắn + cấp thấp
    out.sort((a, b) => a.id.length - b.id.length || a.level - b.level);
    setHits(out.slice(0, 12));
  }, [q, index]);

  const open = async (h: Hit) => {
    const words = await loadWords(h.level);
    const w = words.find((x) => x.id === h.id);
    if (!w) return;
    const ex = await loadExamplesForWords(h.level, [w.id]);
    setExamples(ex[w.id] || []);
    setSelected(w);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          inputMode="search"
          placeholder="Tra nhanh một từ bất kỳ (gõ không dấu được)…"
          className="w-full rounded-full border bg-card py-2.5 pl-10 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
        />
      </div>
      {q.trim() && (
        <div className="absolute inset-x-0 top-12 z-30 overflow-hidden rounded-2xl border bg-background shadow-lg">
          {hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">{index ? "Không tìm thấy từ nào." : "Đang tải chỉ mục…"}</p>
          ) : (
            hits.map((h) => (
              <button
                key={h.id}
                onClick={() => void open(h)}
                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted"
              >
                <span className="font-medium">{h.id}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{levelMeta(h.level)?.cefr}</span>
              </button>
            ))
          )}
        </div>
      )}
      {selected && (
        <WordDetail
          word={selected}
          examples={examples}
          onClose={() => {
            setSelected(null);
            setQ("");
          }}
        />
      )}
    </div>
  );
}

export function CourseCards() {
  const [phonics, setPhonics] = useState<{ done: number; total: number } | null>(null);
  const [grammar, setGrammar] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    const g = getCourseDone("grammar");
    setGrammar({ done: GRAMMAR_LESSONS.filter((l) => g.has(l.id)).length, total: GRAMMAR_LESSONS.length });
    loadPhonics().then((lessons) => {
      const p = getCourseDone("phonics");
      setPhonics({ done: lessons.filter((l) => p.has(l.id)).length, total: lessons.length });
    });
  }, []);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CourseCard
        href="/phat-am"
        icon={<Volume2 className="size-5" />}
        tint="bg-primary/15 text-primary"
        title="Khóa phát âm"
        desc="14 bài đọc chuẩn từ bảng chữ cái tới nối âm"
        progress={phonics}
      />
      <CourseCard
        href="/ngu-phap"
        icon={<BookOpenCheck className="size-5" />}
        tint="bg-teal-500/15 text-teal-600 dark:text-teal-400"
        title="Khóa ngữ pháp vỡ lòng"
        desc="11 bài nền tảng: giống, mạo từ, chia động từ…"
        progress={grammar}
      />
    </div>
  );
}

function CourseCard({
  href,
  icon,
  tint,
  title,
  desc,
  progress,
}: {
  href: string;
  icon: React.ReactNode;
  tint: string;
  title: string;
  desc: string;
  progress: { done: number; total: number } | null;
}) {
  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
    >
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tint}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold">{title}</span>
          {progress && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {progress.done}/{progress.total}
            </span>
          )}
        </span>
        <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">{desc}</span>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
