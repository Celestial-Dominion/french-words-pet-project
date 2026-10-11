"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Volume2, Plus, Check, RotateCcw, ArrowLeft } from "lucide-react";
import { loadConjugation, lookupWord, loadExamplesForWords, type ExampleSentence } from "@/lib/data";
import { posLabel, registerLabel, registerTone } from "@/lib/pos";
import { wordAudioUrl, sentenceAudioUrl, playAudio as play } from "@/lib/tts";
import { cn } from "@/lib/utils";
import { libraryHref } from "@/lib/library";
import { getReview, recordAnswer, addXp, getMnemonic, setMnemonic, markKnown, undoMarkKnown, relearnWord } from "@/lib/db";
import { isKnownPending } from "@/lib/srs-pure";
import { requestSync } from "@/lib/sync";
import { occurrencesOf, type Occurrence } from "@/lib/suggest";
import { XP } from "@/lib/gamify";
import type { Word, Conjugation, ReviewRecord } from "@/lib/types";

type Status = "new" | "due" | "known" | "learned";
function statusOf(rec: ReviewRecord | null | undefined): Status | null {
  if (rec === undefined) return null; // đang tải
  if (!rec) return "new";
  if (isKnownPending(rec)) return "known"; // đã biết sẵn, chờ lần kiểm tra đầu
  if (new Date(rec.due).getTime() <= Date.now()) return "due";
  return "learned";
}
/** "ôn lại sau 3 ngày" — khoảng cách tới hạn ôn kế tiếp (như HSK). */
function intervalLabel(due: Date | string): string {
  const ms = new Date(due).getTime() - Date.now();
  if (ms <= 0) return "bây giờ";
  const h = Math.round(ms / 3_600_000);
  if (h < 48) return `${Math.max(1, h)} giờ`;
  return `${Math.round(h / 24)} ngày`;
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
  word: root,
  examples: rootExamples,
  onClose,
  onChange,
}: {
  word: Word;
  examples: ExampleSentence[];
  onClose: () => void;
  onChange?: () => void;
}) {
  // Điều hướng HỌ TỪ ngay trong ngăn (như app Anh): bấm "décision" khi đang xem "décider" → chồng thẻ mới,
  // giữ đường quay lại. `root` để tự huỷ chồng khi component được tái dùng cho từ khác.
  const [nav, setNav] = useState<{ root: string; stack: { word: Word; examples: ExampleSentence[] }[] }>({
    root: root.id,
    stack: [],
  });
  const stack = useMemo(() => (nav.root === root.id ? nav.stack : []), [nav, root.id]);
  const top = stack[stack.length - 1];
  const word = top?.word ?? root; // từ ĐANG xem (gốc hoặc từ cùng họ vừa mở)
  const examples = top?.examples ?? rootExamples;
  const isVerb = word.pos.includes("v") || word.pos.includes("vaux");
  const isNoun = word.pos.includes("n") && !!word.gender;
  const [tab, setTab] = useState<"info" | "conj">("info");
  const [conj, setConj] = useState<Conjugation | null>(null);
  const [rec, setRec] = useState<ReviewRecord | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [occ, setOcc] = useState<Occurrence[]>([]);
  const [justMarked, setJustMarked] = useState<string | null>(null); // id vừa bấm "Đã biết rồi" (còn Hoàn tác)
  // Mở rộng danh sách nghĩa EN — lưu theo id để chuyển sang từ khác là tự thu lại.
  const [showAllEnFor, setShowAllEnFor] = useState<string | null>(null);

  useEffect(() => {
    getReview(word.id).then((r) => setRec(r ?? null));
    getMnemonic(word.id).then(setNote).catch(() => {});
    occurrencesOf(word.id).then(setOcc).catch(() => {});
  }, [word.id]);

  /** Mở một từ cùng họ (tra qua lemma-map). */
  const openFamily = async (id: string) => {
    const w = await lookupWord(id);
    if (!w) return;
    const ex = await loadExamplesForWords(w.level, [w.id]);
    setTab("info");
    setNav({ root: root.id, stack: [...stack, { word: w, examples: ex[w.id] ?? [] }] });
  };
  const goBack = () => {
    setTab("info");
    setNav({ root: root.id, stack: stack.slice(0, -1) });
  };

  // Esc: đang xem từ cùng họ thì lùi một bước, ở thẻ gốc thì đóng (như HSK)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (stack.length) {
        setTab("info");
        setNav({ root: root.id, stack: stack.slice(0, -1) });
      } else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stack, root.id, onClose]);

  const status = statusOf(rec);
  // Ghi rồi đọc lại thẻ — dùng chung cho Học từ này / Đã biết rồi / Hoàn tác / Học lại.
  const act = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      const r = await getReview(word.id);
      setRec(r ?? null);
      setBusy(false);
      onChange?.();
      requestSync();
    }
  };
  const learn = () => {
    if (rec) return;
    void act(async () => {
      await recordAnswer({ wordId: word.id, level: word.level, correct: true, isNew: true });
      await addXp(XP.newWord);
    });
  };

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
    /* Mobile: bottom-sheet · Desktop (sm+): ngăn kéo phải cao hết màn hình (như HSK) */
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm sm:flex-row" onClick={onClose}>
      <div
        className="max-h-[88vh] overflow-y-auto rounded-t-3xl border-t bg-background pb-8 shadow-2xl duration-200 animate-in slide-in-from-bottom-4 sm:h-full sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0 sm:slide-in-from-right-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* thanh kéo + quay lại (khi đang lần theo họ từ) + đóng */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-background/95 px-4 pt-3 pb-2 backdrop-blur">
          <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30" />
          {stack.length > 0 && (
            <button
              onClick={goBack}
              className="absolute left-3 top-2 inline-flex h-9 items-center gap-1 rounded-full bg-muted px-3 text-sm font-medium text-muted-foreground"
            >
              <ArrowLeft className="size-4" />
              {stack.length > 1 ? stack[stack.length - 2].word.id : root.id}
            </button>
          )}
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
          <div className="mt-3 text-lg font-medium">{word.meaning_vi}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {word.pos.map(posLabel).join(", ")}
            {word.register?.length ? (
              <>
                {" · "}
                {word.register.map((r) => (
                  <span key={r} className={cn("mr-1 rounded px-1.5 py-0.5 text-xs font-medium", registerTone(r))}>
                    {registerLabel(r)}
                  </span>
                ))}
              </>
            ) : null}
            {/* Nghĩa EN: chỉ 2 nghĩa đầu. Wiktionary trả cả nghĩa cực hiếm — đổ hết ra là nhiễu,
                người học tưởng đó là nghĩa chính. */}
            {word.meaning_en.length
              ? ` · ${(showAllEnFor === word.id ? word.meaning_en : word.meaning_en.slice(0, 2)).join(", ")}`
              : ""}
            {word.meaning_en.length > 2 && showAllEnFor !== word.id && (
              <button onClick={() => setShowAllEnFor(word.id)} className="ml-1 whitespace-nowrap text-primary hover:underline">
                +{word.meaning_en.length - 2} nghĩa nữa
              </button>
            )}
          </div>

          {/* trạng thái học + nút thêm vào ôn tập */}
          {status && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {status === "new" ? (
                <>
                  <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold text-muted-foreground">Chưa học</span>
                  <button
                    onClick={learn}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
                  >
                    <Plus className="size-4" /> Học từ này
                  </button>
                  {/* Đã biết sẵn → thẻ hẹn kiểm tra sau 1–3 tháng, khỏi học qua phiên từ mới */}
                  <button
                    onClick={() =>
                      void act(async () => {
                        if (await markKnown(word.id, word.level)) setJustMarked(word.id);
                      })
                    }
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-50"
                  >
                    <Check className="size-4" /> Đã biết rồi
                  </button>
                </>
              ) : status === "known" ? (
                <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sm font-semibold text-sky-700 dark:text-sky-300">
                  Đã biết sẵn · kiểm tra lại sau {rec ? intervalLabel(rec.due) : ""}
                </span>
              ) : status === "due" ? (
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-semibold text-amber-700 dark:text-amber-300">
                  Đến hạn ôn
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Đã học · ôn lại sau {rec ? intervalLabel(rec.due) : ""}
                </span>
              )}
              {/* Vừa bấm nhầm → Hoàn tác (về Chưa học). Đánh dấu từ trước mà giờ thấy chưa chắc → Học lại:
                  thẻ đến hạn ngay, lượt ôn kế hiện thẻ học trước câu hỏi. */}
              {rec?.known && justMarked === word.id ? (
                <button
                  onClick={() =>
                    void act(async () => {
                      await undoMarkKnown(word.id);
                      setJustMarked(null);
                    })
                  }
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted disabled:opacity-50"
                >
                  ↩︎ Hoàn tác
                </button>
              ) : rec?.known ? (
                <button
                  onClick={() => void act(() => relearnWord(word.id))}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-50"
                >
                  <RotateCcw className="size-3.5" /> Chưa chắc? Học lại
                </button>
              ) : null}
            </div>
          )}

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

          {/* cụm hay đi kèm (RL-fr): prendre une décision — kèm nghĩa vì cụm tiếng Pháp khó đoán nghĩa */}
          {word.collocations?.length ? (
            <div className="mt-4">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                🔗 Cụm hay đi kèm
              </div>
              <ul className="space-y-1">
                {word.collocations.map(([fr, vi]) => (
                  <li key={fr} className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-sm">
                    <span className="font-medium text-primary">{fr}</span>
                    <span className="text-muted-foreground"> — {vi}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* họ từ: décider → décision — bấm để mở thẻ từ đó (chỉ gồm từ có trong bộ từ) */}
          {word.family?.length ? (
            <div className="mt-4">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">🌱 Họ từ</div>
              <div className="flex flex-wrap gap-1.5">
                {word.family.map((id) => (
                  <button
                    key={id}
                    onClick={() => void openFamily(id)}
                    className="rounded-full border px-2.5 py-1 text-sm font-medium transition-colors hover:bg-muted active:scale-[0.98]"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* mẹo nhớ tự ghi (tự nghĩ → nhớ lâu nhất) */}
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ✍️ Mẹo nhớ của bạn
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => void setMnemonic(word.id, note)}
              rows={2}
              placeholder="Vd: liên tưởng hình ảnh, câu chuyện, hoặc âm gần giống…"
              className="w-full resize-none rounded-2xl border bg-background p-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
            />
          </div>

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

          {/* Gặp lại trong ngữ cảnh: bài đọc/truyện chứa từ này (như HSK) */}
          {occ.length > 0 && (!isVerb || tab === "info") && (
            <div className="mt-5">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                📖 Gặp lại trong ngữ cảnh
              </div>
              <div className="space-y-1.5">
                {occ.map((o) => (
                  <a
                    key={`${o.type}-${o.id}`}
                    href={libraryHref(o.type, o.level, o.id)}
                    className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <span className="min-w-0 truncate">
                      <b>{o.title_fr}</b> <span className="text-muted-foreground">· {o.title_vi}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{o.type === "reading" ? "bài đọc" : "truyện"}</span>
                  </a>
                ))}
              </div>
            </div>
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
    <div className="mt-4 space-y-2.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ví dụ ({examples.length})</div>
      {examples.map((s, i) => (
        <div key={i} className="rounded-2xl bg-muted/50 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="text-base font-medium">{s.fr}</div>
            <button
              onClick={() => play(sentenceAudioUrl(s.fr))}
              aria-label="Nghe câu"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary active:scale-95"
            >
              <Volume2 className="size-4" />
            </button>
          </div>
          <div className="mt-0.5 text-sm text-muted-foreground">{s.vi}</div>
        </div>
      ))}
    </div>
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
