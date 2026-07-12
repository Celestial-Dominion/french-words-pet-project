"use client";

import { useEffect, useState } from "react";
import { X, Volume2 } from "lucide-react";
import { loadConjugation, type ExampleSentence } from "@/lib/data";
import { posLabel } from "@/lib/pos";
import { wordAudioUrl, sentenceAudioUrl } from "@/lib/tts";
import { cn } from "@/lib/utils";
import type { Word, Conjugation } from "@/lib/types";

function play(url: string) {
  new Audio(url).play().catch(() => {});
}

const PRONOUNS = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"];
const TENSE_LABEL: Record<string, string> = {
  present: "Hiện tại (présent)",
  imparfait: "Quá khứ chưa hoàn thành (imparfait)",
  futur: "Tương lai (futur)",
  passe_compose: "Quá khứ kép (passé composé)",
};
const TENSE_ORDER = ["present", "passe_compose", "imparfait", "futur"];

function article(w: Word): string | null {
  if (!w.pos.includes("n") || !w.gender) return null;
  return w.gender === "m" ? "un" : "une";
}

export default function WordDetail({
  word,
  examples,
  onClose,
}: {
  word: Word;
  examples: ExampleSentence[];
  onClose: () => void;
}) {
  const isVerb = word.pos.includes("v") || word.pos.includes("vaux");
  const isNoun = word.pos.includes("n") && !!word.gender;
  const [tab, setTab] = useState<"info" | "conj">("info");
  const [conj, setConj] = useState<Conjugation | null>(null);

  // khoá cuộn nền khi mở modal
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (isVerb) loadConjugation(word.id).then(setConj);
  }, [word.id, isVerb]);

  const art = article(word);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[88vh] overflow-y-auto rounded-t-3xl border-t bg-background pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* thanh kéo + đóng */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-background/95 px-4 pt-3 pb-2 backdrop-blur">
          <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30" />
          <button onClick={onClose} aria-label="Đóng" className="absolute right-3 top-2 grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
            <X className="size-5" />
          </button>
        </div>

        <div className="px-5">
          {/* tiêu đề */}
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-2xl font-bold">
                {art ? <span className="text-muted-foreground">{art}</span> : null}
                <span>{word.id}</span>
                <button
                  onClick={() => play(wordAudioUrl(word))}
                  aria-label="Phát âm"
                  className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary active:scale-95"
                >
                  <Volume2 className="size-5" />
                </button>
              </div>
              <div className="mt-1 font-mono text-muted-foreground">{word.ipa}</div>
            </div>
          </div>

          {/* nghĩa */}
          <div className="mt-3 text-lg">{word.meaning_vi}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {word.pos.map(posLabel).join(", ")}
            {word.meaning_en.length ? ` · ${word.meaning_en.join(", ")}` : ""}
          </div>

          {/* khối giống / số nhiều cho danh từ */}
          {isNoun && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-lg bg-muted px-2.5 py-1 text-sm">
                Giống: <b>{word.gender === "m" ? "đực (le/un)" : "cái (la/une)"}</b>
              </span>
              {word.plural && (
                <span className="rounded-lg bg-muted px-2.5 py-1 text-sm">
                  Số nhiều bất quy tắc: <b>{word.plural}</b>
                </span>
              )}
            </div>
          )}

          {/* tabs (chỉ verb mới có tab chia động từ) */}
          {isVerb && (
            <div className="mt-4 flex gap-2 border-b">
              <TabBtn active={tab === "info"} onClick={() => setTab("info")}>Ví dụ</TabBtn>
              <TabBtn active={tab === "conj"} onClick={() => setTab("conj")}>Chia động từ</TabBtn>
            </div>
          )}

          {/* nội dung tab */}
          {(!isVerb || tab === "info") && (
            <ExampleList examples={examples} />
          )}

          {isVerb && tab === "conj" && (
            <ConjugationView conj={conj} lemma={word.id} group={word.verb_group} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ExampleList({ examples }: { examples: ExampleSentence[] }) {
  if (!examples.length) return <p className="mt-4 text-sm text-muted-foreground">Chưa có câu ví dụ.</p>;
  return (
    <ul className="mt-4 space-y-3">
      {examples.map((s, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <button
            onClick={() => play(sentenceAudioUrl(s.fr))}
            aria-label="Nghe câu"
            className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary active:scale-95"
          >
            <Volume2 className="size-4" />
          </button>
          <div className="min-w-0">
            <div className="text-base">{s.fr}</div>
            <div className="text-sm text-muted-foreground">{s.vi}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ConjugationView({ conj, lemma, group }: { conj: Conjugation | null; lemma: string; group?: number }) {
  if (conj === null) {
    return <p className="mt-4 text-sm text-muted-foreground">Đang tải bảng chia… (hoặc động từ này chưa có bảng chia).</p>;
  }
  const tenses = TENSE_ORDER.filter((t) => conj.tenses[t]?.some(Boolean));
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        {conj.group && <span className="rounded-lg bg-muted px-2.5 py-1">Nhóm {conj.group}</span>}
        {conj.irregular && <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-amber-700 dark:text-amber-300">Bất quy tắc</span>}
      </div>
      {tenses.map((t) => {
        // passé composé đã kèm chủ ngữ (j'ai mangé) → hiển thị full-width, không cột đại từ.
        const composed = t === "passe_compose";
        return (
          <div key={t}>
            <div className="mb-1.5 text-sm font-semibold text-muted-foreground">{TENSE_LABEL[t] || t}</div>
            {composed ? (
              <div className="space-y-1">
                {conj.tenses[t].map((form, i) => (
                  <div key={i} className="border-b py-1 text-sm font-medium">
                    {form || "—"}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {conj.tenses[t].map((form, i) => (
                  <div key={i} className="flex justify-between gap-2 border-b py-1 text-sm">
                    <span className="text-muted-foreground">{PRONOUNS[i]}</span>
                    <span className="text-right font-medium">{form || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
