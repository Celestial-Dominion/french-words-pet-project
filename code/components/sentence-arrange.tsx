"use client";

import { useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { sentenceAudioUrl } from "@/lib/tts";
import { cn } from "@/lib/utils";

function play(url: string) {
  new Audio(url).play().catch(() => {});
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export default function SentenceArrange({
  fr,
  vi,
  tokens,
  onNext,
}: {
  fr: string;
  vi: string;
  tokens: string[];
  onNext: (correct: boolean) => void;
}) {
  // bank giữ {token, id} để token trùng nhau vẫn phân biệt
  const initial = useMemo(
    () => shuffle(tokens.map((t, i) => ({ t, id: i }))),
    [tokens],
  );
  const [bank, setBank] = useState(initial);
  const [answer, setAnswer] = useState<{ t: string; id: number }[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);

  const place = (item: { t: string; id: number }) => {
    if (checked !== null) return;
    setBank((b) => b.filter((x) => x.id !== item.id));
    setAnswer((a) => [...a, item]);
  };
  const unplace = (item: { t: string; id: number }) => {
    if (checked !== null) return;
    setAnswer((a) => a.filter((x) => x.id !== item.id));
    setBank((b) => [...b, item]);
  };

  const check = () => {
    const correct = answer.map((x) => x.t).join(" ") === tokens.join(" ");
    setChecked(correct);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <span>Sắp xếp thành câu đúng:</span>
        <button onClick={() => play(sentenceAudioUrl(fr))} aria-label="Nghe" className="text-primary">
          <Volume2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-4 rounded-xl bg-muted p-3 text-base">{vi}</div>

      {/* vùng đáp án */}
      <div className="mb-3 min-h-16 rounded-xl border-2 border-dashed p-2">
        <div className="flex flex-wrap gap-2">
          {answer.map((item) => (
            <button
              key={item.id}
              onClick={() => unplace(item)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-base",
                checked === null ? "bg-primary/15 text-primary" : "bg-muted",
              )}
            >
              {item.t}
            </button>
          ))}
        </div>
      </div>

      {/* kho từ */}
      <div className="flex flex-wrap gap-2">
        {bank.map((item) => (
          <button
            key={item.id}
            onClick={() => place(item)}
            className="rounded-lg border bg-background px-3 py-1.5 text-base active:scale-95"
          >
            {item.t}
          </button>
        ))}
      </div>

      <div className="mt-auto pt-4">
        {checked === null ? (
          <button
            onClick={check}
            disabled={bank.length > 0}
            className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-40"
          >
            Kiểm tra
          </button>
        ) : (
          <div>
            <div
              className={cn(
                "mb-3 rounded-xl p-3 text-center font-medium",
                checked ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
              )}
            >
              {checked ? "Chính xác!" : "Chưa đúng."} Câu đúng: <span className="font-semibold">{fr}</span>
            </div>
            <button onClick={() => onNext(checked)} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground">
              Tiếp tục
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
