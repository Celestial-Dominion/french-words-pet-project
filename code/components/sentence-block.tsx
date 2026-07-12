"use client";

import { Volume2 } from "lucide-react";
import { sentenceAudioUrl } from "@/lib/tts";

function play(url: string) {
  new Audio(url).play().catch(() => {});
}

function splitTokens(fr: string): string[] {
  return fr.split(/(\s+)/);
}
const isWord = (t: string) => /[a-zàâäçéèêëîïôöùûüÿœæ'’]/i.test(t);

// Một câu trong bài đọc/truyện: nút nghe + các từ chạm-tra + (tùy chọn) bản dịch.
export default function SentenceBlock({
  fr,
  vi,
  showVi,
  onTapWord,
}: {
  fr: string;
  vi: string;
  showVi: boolean;
  onTapWord: (token: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-start gap-2">
        <button
          onClick={() => play(sentenceAudioUrl(fr))}
          aria-label="Nghe câu"
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
        >
          <Volume2 className="h-4 w-4" />
        </button>
        <p className="text-lg leading-relaxed">
          {splitTokens(fr).map((tok, j) =>
            isWord(tok) ? (
              <button key={j} onClick={() => onTapWord(tok)} className="rounded hover:bg-primary/10 active:bg-primary/20">
                {tok}
              </button>
            ) : (
              <span key={j}>{tok}</span>
            ),
          )}
        </p>
      </div>
      {showVi && <div className="mt-2 pl-10 text-sm text-muted-foreground">{vi}</div>}
    </div>
  );
}
