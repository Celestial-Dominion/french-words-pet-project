"use client";

import { useCallback, useEffect, useState } from "react";
import { GraduationCap, Zap, Brain, Plus, ChevronDown } from "lucide-react";
import {
  countDue,
  countAhead,
  countHard,
  getDueReviews,
  getAheadReviews,
  getHardReviews,
  learnedIds,
  newTodayCount,
  getConfig,
  setConfig,
  progressSummary,
} from "@/lib/db";
import { loadWords, loadExamplesForWords, type ExampleSentence } from "@/lib/data";
import { buildQuestions, type Question } from "@/lib/review-session";
import { orderForBeginners } from "@/lib/starter";
import { LEVELS } from "@/lib/levels";
import type { Word, SrsConfig, ReviewRecord } from "@/lib/types";
import ReviewRunner from "@/components/review-runner";

export default function OnTapPage() {
  const [due, setDue] = useState(0);
  const [ahead, setAhead] = useState(0);
  const [hard, setHard] = useState(0);
  const [learned, setLearned] = useState(0);
  const [remainNew, setRemainNew] = useState(0);
  const [cfg, setCfg] = useState<SrsConfig | null>(null);
  const [session, setSession] = useState<{ qs: Question[]; title: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [d, a, h, sum, c, nToday] = await Promise.all([
      countDue(),
      countAhead(),
      countHard(),
      progressSummary(),
      getConfig(),
      newTodayCount(),
    ]);
    setDue(d);
    setAhead(Math.min(a, 20));
    setHard(h);
    setLearned(sum.words);
    setCfg(c);
    setRemainNew(Math.max(0, c.newPerDay - nToday));
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Xáo trộn (Fisher–Yates) — thẻ trong phiên ra ngẫu nhiên như HSK.
  const shuffled = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let k = a.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [a[k], a[j]] = [a[j], a[k]];
    }
    return a;
  };

  // Ghép câu hỏi từ danh sách bản ghi ôn (đến hạn/ôn sớm/hay quên).
  const buildFromRecords = async (records: ReviewRecord[], title: string) => {
    if (!records.length) return;
    setBusy(true);
    const rows = shuffled(records);
    const c = await getConfig();
    const levels = [...new Set(rows.map((r) => r.level))];
    const wordMap = new Map<string, Word>();
    let examples: Record<string, ExampleSentence[]> = {};
    const pool: Word[] = [];
    for (const lv of levels) {
      // chỉ tải shard ví dụ chứa đúng các từ trong phiên (không nạp cả file cấp)
      const idsOfLevel = rows.filter((r) => r.level === lv).map((r) => r.wordId);
      const [ws, ex] = await Promise.all([loadWords(lv), loadExamplesForWords(lv, idsOfLevel)]);
      for (const w of ws) {
        wordMap.set(w.id, w);
        pool.push(w);
      }
      examples = { ...examples, ...ex };
    }
    const words = rows.map((r) => wordMap.get(r.wordId)).filter(Boolean) as Word[];
    const recMap = new Map(rows.map((r) => [r.wordId, r]));
    setSession({ qs: buildQuestions(words, examples, pool, c, false, recMap), title });
    setBusy(false);
  };

  // Đến hạn: cắt theo "số thẻ mỗi phiên" (0 = tất cả) — thẻ còn lại ôn ở phiên sau.
  const startDue = async () => {
    const c = await getConfig();
    let rows = await getDueReviews();
    if (c.reviewPerSession > 0 && rows.length > c.reviewPerSession) {
      rows = rows.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime()).slice(0, c.reviewPerSession);
    }
    return buildFromRecords(rows, "Ôn tập");
  };
  const startAhead = async () => buildFromRecords(await getAheadReviews(new Date(), 20), "Ôn sớm");
  const startHard = async () => buildFromRecords(await getHardReviews(20), "Ôn từ hay quên");

  // Học từ mới: gom từ CHƯA học theo cấp (newLevel cố định, hoặc auto thấp→cao).
  // force = học thêm dù đã hết hạn mức ngày (mặc định lấy 10 từ).
  const startNew = async (force = false) => {
    setBusy(true);
    const c = await getConfig();
    const [learnedSet, nToday] = await Promise.all([learnedIds(), newTodayCount()]);
    const quota = force ? 10 : Math.max(0, c.newPerDay - nToday);
    if (quota <= 0) {
      setBusy(false);
      return;
    }
    const order = c.newLevel ? [c.newLevel] : LEVELS.map((l) => l.level);
    const words: Word[] = [];
    let examples: Record<string, ExampleSentence[]> = {};
    const pool: Word[] = [];
    for (const lv of order) {
      if (words.length >= quota) break;
      const ws = await loadWords(lv);
      pool.push(...ws);
      // người mới (<40 từ) → ưu tiên bộ từ khởi động cụ thể (chào hỏi, gia đình, đồ ăn…)
      const picked: Word[] = [];
      for (const w of orderForBeginners(ws, learnedSet.size)) {
        if (words.length + picked.length >= quota) break;
        if (!learnedSet.has(w.id)) picked.push(w);
      }
      words.push(...picked);
      if (picked.length) {
        const ex = await loadExamplesForWords(lv, picked.map((w) => w.id));
        examples = { ...examples, ...ex };
      }
    }
    if (!words.length) {
      setBusy(false);
      return;
    }
    setSession({ qs: buildQuestions(words, examples, pool, c, true), title: "Học từ mới" });
    setBusy(false);
  };

  const patch = async (p: Partial<SrsConfig>) => {
    const next = await setConfig(p);
    setCfg(next);
    const nToday = await newTodayCount();
    setRemainNew(Math.max(0, next.newPerDay - nToday));
  };

  if (session && cfg) {
    return (
      <ReviewRunner
        questions={session.qs}
        title={session.title}
        config={cfg}
        onExit={() => {
          setSession(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ôn tập</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ôn thẻ đến hạn — hoặc ôn sớm, ôn từ hay quên, học thêm bất cứ lúc nào. Tất cả vẫn theo lịch FSRS.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 sm:p-6">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Đến hạn" value={due} highlight />
          <Stat label="Hay quên" value={hard} />
          <Stat label="Đã học" value={learned} />
        </div>

        <button
          disabled={busy || (due === 0 && ahead === 0)}
          onClick={() => (due > 0 ? startDue() : startAhead())}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          <GraduationCap className="size-5" />
          {busy
            ? "Đang tải…"
            : due > 0
              ? `Ôn tập (${cfg && cfg.reviewPerSession > 0 ? Math.min(due, cfg.reviewPerSession) : due} thẻ)`
              : ahead > 0
                ? `Ôn sớm (${ahead} thẻ)`
                : "Chưa có thẻ để ôn"}
        </button>

        {due > 0 && ahead > 0 && (
          <button
            onClick={startAhead}
            disabled={busy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border bg-background py-3 text-sm font-semibold transition-all hover:bg-muted active:scale-[0.99] disabled:opacity-50"
          >
            <Zap className="size-4" /> Ôn sớm — xem trước ({ahead} thẻ)
          </button>
        )}

        {hard > 0 && (
          <button
            onClick={startHard}
            disabled={busy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 py-3 text-sm font-semibold text-amber-700 transition-all hover:bg-amber-500/20 active:scale-[0.99] disabled:opacity-50 dark:text-amber-400"
          >
            <Brain className="size-4" /> Ôn từ hay quên ({Math.min(hard, 20)})
          </button>
        )}

        <button
          onClick={() => startNew(remainNew <= 0)}
          disabled={busy}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border bg-background py-3 text-sm font-semibold transition-all hover:bg-muted active:scale-[0.99] disabled:opacity-50"
        >
          <Plus className="size-4" />
          {remainNew > 0 ? `Học từ mới (${remainNew})` : "Học thêm 10 từ"}
        </button>
      </div>

      {/* Cài đặt */}
      {cfg && (
        <details className="group rounded-3xl border p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
            ⚙️ Cài đặt
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-5 space-y-5">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Từ mới mỗi ngày</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={cfg.newPerDay}
                onChange={(e) => patch({ newPerDay: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                className="w-20 rounded-xl border bg-background px-3 py-2 text-right text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
            </label>

            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">
                Số thẻ ôn mỗi phiên
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">giới hạn thẻ đến hạn mỗi phiên cho đỡ nản; thẻ còn lại ôn ở phiên sau</span>
              </span>
              <select
                value={cfg.reviewPerSession}
                onChange={(e) => patch({ reviewPerSession: Number(e.target.value) })}
                className="rounded-xl border bg-background px-3 py-2 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
              >
                <option value={0}>Tất cả</option>
                {[10, 20, 30, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} thẻ
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Nguồn từ mới</span>
              <select
                value={cfg.newLevel}
                onChange={(e) => patch({ newLevel: Number(e.target.value) })}
                className="rounded-xl border bg-background px-3 py-2 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
              >
                <option value={0}>Tự động (thấp → cao)</option>
                {LEVELS.map((l) => (
                  <option key={l.level} value={l.level}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">
                Câu ghép mỗi từ
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">luyện sắp xếp câu sau trắc nghiệm</span>
              </span>
              <select
                value={cfg.arrangePerWord}
                onChange={(e) => patch({ arrangePerWord: Number(e.target.value) })}
                className="rounded-xl border bg-background px-3 py-2 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
              >
                <option value={0}>Tắt</option>
                <option value={1}>1 câu</option>
                <option value={2}>2 câu</option>
                <option value={3}>3 câu</option>
                <option value={5}>5 câu</option>
              </select>
            </label>

            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">
                Câu chọn giống (un/une)
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">xen câu hỏi chọn mạo từ cho danh từ</span>
              </span>
              <input
                type="checkbox"
                checked={cfg.genderQuestions}
                onChange={(e) => patch({ genderQuestions: e.target.checked })}
                className="size-5 accent-primary"
              />
            </label>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">
                Hướng hỏi
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">chiều câu trắc nghiệm khi ôn</span>
              </span>
              <div className="inline-flex rounded-full border p-0.5 text-sm">
                {([["fr2vi", "Pháp→nghĩa"], ["vi2fr", "Nghĩa→Pháp"]] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => patch({ direction: val })}
                    className={`rounded-full px-3 py-1.5 transition-colors ${
                      cfg.direction === val ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">
                Nhớ lại trước
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">ẩn đáp án, tự nhớ trong đầu rồi mới bấm hiện (nhớ lâu hơn)</span>
              </span>
              <input
                type="checkbox"
                checked={cfg.recallFirst !== false}
                onChange={(e) => patch({ recallFirst: e.target.checked })}
                className="size-5 accent-primary"
              />
            </label>

            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">
                Tự chuyển khi đúng
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">trả lời đúng → tự sang thẻ kế</span>
              </span>
              <input
                type="checkbox"
                checked={cfg.autoAdvance}
                onChange={(e) => patch({ autoAdvance: e.target.checked })}
                className="size-5 accent-primary"
              />
            </label>
          </div>
        </details>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <div className={`text-3xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
