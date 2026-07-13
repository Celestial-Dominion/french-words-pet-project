"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { sentenceAudioUrl } from "@/lib/tts";
import { cn } from "@/lib/utils";

type Sentence = { fr: string; vi: string };

function splitTokens(fr: string): string[] {
  return fr.split(/(\s+)/);
}
const isWord = (t: string) => /[a-zàâäçéèêëîïôöùûüÿœæ'']/i.test(t);

// Nghe cả bài: phát tuần tự từng câu, tô sáng câu đang đọc + tự cuộn vào giữa; đổi tốc độ.
const SPEEDS = [1, 0.75, 1.25];
export function useListenAll(sentences: Sentence[]) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const [rate, setRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rateRef = useRef(1);

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setActiveIdx(-1);
  };
  useEffect(() => () => stop(), []);
  // Đổi bài/chương (mảng câu đổi) → dừng.
  useEffect(() => () => stop(), [sentences]);

  const playFrom = (i: number) => {
    if (i >= sentences.length) return stop();
    setActiveIdx(i);
    const a = new Audio(sentenceAudioUrl(sentences[i].fr));
    a.playbackRate = rateRef.current;
    audioRef.current = a;
    a.onended = () => playFrom(i + 1);
    a.play().catch(() => stop());
    document.getElementById(`psent-${i}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  const toggle = () => (activeIdx >= 0 ? stop() : playFrom(0));
  const cycleRate = () => {
    const next = SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length] ?? 1;
    rateRef.current = next;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  return { activeIdx, playing: activeIdx >= 0, toggle, rate, cycleRate, stop };
}

export function ReaderToolbar({
  playing,
  onToggle,
  rate,
  onCycleRate,
  showVi,
  onToggleVi,
}: {
  playing: boolean;
  onToggle: () => void;
  rate: number;
  onCycleRate: () => void;
  showVi: boolean;
  onToggleVi: () => void;
}) {
  return (
    <div
      className="sticky z-30 mb-4 flex items-center gap-2 rounded-2xl border bg-background/85 px-2 py-1.5 backdrop-blur"
      style={{ top: "calc(4rem + env(safe-area-inset-top))" }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? "Dừng nghe" : "Nghe cả bài"}
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
          playing ? "bg-primary text-primary-foreground shadow-sm" : "bg-primary/10 text-primary hover:bg-primary/15",
        )}
      >
        {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
      </button>
      <span className="text-sm font-medium text-muted-foreground">{playing ? "Đang đọc…" : "Nghe cả bài"}</span>
      <button
        type="button"
        onClick={onCycleRate}
        title="Tốc độ nghe"
        className={cn(
          "inline-flex shrink-0 items-center rounded-full px-2.5 py-1.5 text-sm font-medium tabular-nums transition-colors",
          rate !== 1 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
        )}
      >
        {rate}×
      </button>
      <div className="ml-auto inline-flex items-center rounded-full bg-muted p-0.5">
        <button
          type="button"
          onClick={onToggleVi}
          aria-pressed={showVi}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors",
            showVi ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          Dịch
        </button>
      </div>
    </div>
  );
}

export function Passage({
  sentences,
  showVi,
  activeIdx,
  onTapWord,
}: {
  sentences: Sentence[];
  showVi: boolean;
  activeIdx: number;
  onTapWord: (token: string) => void;
}) {
  const renderWords = (fr: string) =>
    splitTokens(fr).map((tok, j) =>
      isWord(tok) ? (
        <button
          key={j}
          type="button"
          onClick={() => onTapWord(tok)}
          className="rounded align-bottom transition-colors hover:bg-primary/15 hover:text-primary"
        >
          {tok}
        </button>
      ) : (
        <span key={j}>{tok}</span>
      ),
    );

  // Tắt Dịch → đọc liền mạch (immersive).
  if (!showVi) {
    return (
      <div className="text-2xl leading-[2.4rem] tracking-wide">
        {sentences.map((s, i) => (
          <span
            key={i}
            id={`psent-${i}`}
            className={cn("rounded-md transition-colors", i === activeIdx && "bg-primary/10 dark:bg-primary/20")}
          >
            {renderWords(s.fr)}{" "}
          </span>
        ))}
      </div>
    );
  }

  // Bật Dịch → mỗi câu một khối: dòng Pháp + dòng dịch phụ (viền trái).
  return (
    <div className="space-y-5">
      {sentences.map((s, i) => (
        <div
          key={i}
          id={`psent-${i}`}
          className={cn("rounded-xl px-2 py-1 transition-colors", i === activeIdx && "bg-primary/10 dark:bg-primary/20")}
        >
          <p className="text-2xl leading-relaxed">{renderWords(s.fr)}</p>
          <p className="mt-1.5 border-l-[3px] border-primary/30 pl-3 text-base text-muted-foreground">{s.vi}</p>
        </div>
      ))}
    </div>
  );
}
