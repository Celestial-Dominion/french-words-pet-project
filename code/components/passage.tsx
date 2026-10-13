"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { sentenceAudioUrl, stopAudio } from "@/lib/tts";
import { cn } from "@/lib/utils";
import { paragraphs } from "@/lib/quiz-pure";

type Sentence = { fr: string; vi: string };

function splitTokens(fr: string): string[] {
  return fr.split(/(\s+)/);
}
const isWord = (t: string) => /[a-zàâäçéèêëîïôöùûüÿœæ'']/i.test(t);

// Nghe cả bài (karaoke): phát tuần tự audio từng câu, tô sáng câu đang đọc + tự cuộn vào giữa — nhường 4 s khi người
// dùng tự cuộn. Tạm dừng / nghe tiếp đúng câu đang dở, câu trước / câu sau, nghe riêng một câu, đổi tốc độ (nhớ qua
// lần mở). Port từ app Anh (components/library/passage-audio.ts) — bên đó một file audio + mốc câu, bên này mỗi câu một file.
const SPEEDS = [1, 1.25, 1.5, 0.75];
const RATE_KEY = "fr.readRate";

export function useListenAll(sentences: Sentence[]) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef(-1);
  const rateRef = useRef(1);
  const lastUser = useRef(0);
  const listRef = useRef(sentences);

  useEffect(() => {
    try {
      const r = Number(localStorage.getItem(RATE_KEY));
      if (SPEEDS.includes(r)) {
        rateRef.current = r;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc lựa chọn đã lưu một lần sau mount
        setRate(r);
      }
    } catch {
      /* không có localStorage */
    }
    const mark = () => (lastUser.current = Date.now());
    window.addEventListener("wheel", mark, { passive: true });
    window.addEventListener("touchmove", mark, { passive: true });
    return () => {
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchmove", mark);
    };
  }, []);

  const setActive = (i: number) => {
    activeRef.current = i;
    setActiveIdx(i);
  };
  const stop = () => {
    const a = audioRef.current;
    audioRef.current = null;
    if (a) {
      a.onended = null;
      a.pause();
    }
    setPlaying(false);
    setActive(-1);
  };
  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps
  // Đổi bài/chương (mảng câu đổi) → dừng; câu mới cho các lần phát sau.
  useEffect(() => {
    listRef.current = sentences;
    return () => stop();
  }, [sentences]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Phát từ câu i; `once` = chỉ câu đó rồi dừng (giữ tô sáng để bấm ▶ nghe tiếp từ đây). */
  const playFrom = (i: number, once = false) => {
    const list = listRef.current;
    if (i < 0 || i >= list.length) return stop();
    stopAudio(); // tiếng từ / câu ví dụ đang phát ở chỗ khác
    const old = audioRef.current;
    if (old) {
      old.onended = null;
      old.pause();
    }
    setActive(i);
    const a = new Audio(sentenceAudioUrl(list[i].fr));
    a.playbackRate = rateRef.current;
    audioRef.current = a;
    a.onended = () => {
      if (once) {
        audioRef.current = null;
        setPlaying(false);
      } else playFrom(i + 1);
    };
    setPlaying(true);
    a.play().catch(() => stop());
  };
  // Câu đang đọc đổi → cuộn vào giữa màn hình, trừ khi người dùng vừa tự cuộn (4 s).
  useEffect(() => {
    if (activeIdx >= 0 && Date.now() - lastUser.current > 4000)
      document.getElementById(`psent-${activeIdx}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIdx]);
  const toggle = () => {
    const a = audioRef.current;
    if (playing && a) {
      a.pause();
      setPlaying(false);
    } else if (a && activeRef.current >= 0) {
      a.play().then(() => setPlaying(true)).catch(() => playFrom(activeRef.current));
    } else playFrom(activeRef.current >= 0 ? activeRef.current : 0);
  };
  const step = (d: number) => playFrom(Math.min(listRef.current.length - 1, Math.max(0, activeRef.current + d)));
  const cycleRate = () => {
    const next = SPEEDS[(SPEEDS.indexOf(rateRef.current) + 1) % SPEEDS.length] ?? 1;
    rateRef.current = next;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
    try {
      localStorage.setItem(RATE_KEY, String(next));
    } catch {
      /* bỏ qua */
    }
  };

  return { activeIdx, playing, toggle, playFrom, step, rate, cycleRate, stop };
}

export function ReaderToolbar({
  playing,
  started,
  onToggle,
  onStep,
  rate,
  onCycleRate,
  showVi,
  onToggleVi,
}: {
  playing: boolean;
  started: boolean; // đã có câu đang dở (đang phát hoặc tạm dừng)
  onToggle: () => void;
  onStep: (d: number) => void;
  rate: number;
  onCycleRate: () => void;
  showVi: boolean;
  onToggleVi: () => void;
}) {
  return (
    <div
      className="sticky z-30 mb-4 flex items-center gap-1 rounded-2xl border bg-background/90 p-1.5 shadow-sm backdrop-blur-md"
      style={{ top: "calc(4rem + env(safe-area-inset-top))" }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? "Tạm dừng" : started ? "Nghe tiếp" : "Nghe cả bài"}
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
          playing ? "bg-primary text-primary-foreground shadow-sm" : "bg-primary/10 text-primary hover:bg-primary/15",
        )}
      >
        {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
      </button>
      <span className="hidden px-1 text-sm font-medium text-muted-foreground min-[420px]:inline">
        {playing ? "Đang đọc…" : started ? "Tạm dừng" : "Nghe cả bài"}
      </span>
      <button type="button" onClick={() => onStep(-1)} aria-label="Câu trước" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
        <SkipBack className="size-4" />
      </button>
      <button type="button" onClick={() => onStep(1)} aria-label="Câu sau" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
        <SkipForward className="size-4" />
      </button>
      <button
        type="button"
        onClick={onCycleRate}
        title="Tốc độ nghe"
        aria-label={`Tốc độ nghe: ${rate}×`}
        className={cn(
          "inline-flex w-12 shrink-0 items-center justify-center rounded-full py-1.5 text-sm font-medium tabular-nums transition-colors",
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

/** Chữ Pháp bấm-tra từng từ (dùng chung cho bài đọc và câu hỏi đọc hiểu). */
export function Words({ text, onTap }: { text: string; onTap: (token: string) => void }) {
  return (
    <>
      {splitTokens(text).map((tok, j) =>
        isWord(tok) ? (
          <button
            key={j}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTap(tok);
            }}
            className="rounded text-left align-bottom transition-colors hover:bg-primary/15 hover:text-primary"
          >
            {tok}
          </button>
        ) : (
          <span key={j}>{tok}</span>
        ),
      )}
    </>
  );
}

export function Passage({
  sentences,
  paras,
  showVi,
  activeIdx,
  onTapWord,
  onPlayFrom,
}: {
  sentences: Sentence[];
  paras?: number[]; // chỉ số câu mở mỗi đoạn
  showVi: boolean;
  activeIdx: number;
  onTapWord: (token: string) => void;
  onPlayFrom?: (i: number) => void; // ▶ nghe riêng câu i (chế độ Dịch)
}) {
  const groups = paragraphs(sentences.length, paras);

  // Tắt Dịch → đọc liền mạch (immersive), giữ ngắt đoạn.
  if (!showVi) {
    return (
      <div className="space-y-5 text-2xl leading-[2.4rem] tracking-wide">
        {groups.map((g, gi) => (
          <p key={gi}>
            {g.map((i) => (
              <span
                key={i}
                id={`psent-${i}`}
                className={cn("rounded-md transition-colors", i === activeIdx && "bg-primary/10 dark:bg-primary/20")}
              >
                <Words text={sentences[i].fr} onTap={onTapWord} />{" "}
              </span>
            ))}
          </p>
        ))}
      </div>
    );
  }

  // Bật Dịch → mỗi câu một khối: dòng Pháp + dòng dịch phụ (viền trái); giữa hai đoạn cách rộng hơn.
  return (
    <div className="space-y-8">
      {groups.map((g, gi) => (
        <div key={gi} className="space-y-5">
          {g.map((i) => {
            const s = sentences[i];
            return (
              <div
                key={i}
                id={`psent-${i}`}
                className={cn("flex gap-1.5 rounded-xl px-1.5 py-1 transition-colors", i === activeIdx && "bg-primary/10 dark:bg-primary/20")}
              >
                {onPlayFrom && (
                  <button
                    type="button"
                    onClick={() => onPlayFrom(i)}
                    aria-label={`Nghe câu ${i + 1}`}
                    className="mt-1.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <Play className="size-3.5" />
                  </button>
                )}
                <div className="min-w-0">
                  <p className="text-2xl leading-relaxed">
                    <Words text={s.fr} onTap={onTapWord} />
                  </p>
                  <p className="mt-1.5 border-l-[3px] border-primary/30 pl-3 text-base text-muted-foreground">{s.vi}</p>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
