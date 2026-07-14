// Nguồn sự thật tiến độ học: IndexedDB (offline-first) qua Dexie.
import Dexie, { type Table } from "dexie";
import type { Grade } from "ts-fsrs";
import type { ReviewRecord, DailyStat, ReadRow, SrsConfig } from "./types";
import { DEFAULT_SRS_CONFIG } from "./types";
import { newCard, schedule, scheduleRated, recordToCard, cardToRecordFields } from "./srs";

class FrDB extends Dexie {
  reviews!: Table<ReviewRecord, string>; // key = wordId
  daily!: Table<DailyStat, string>; // key = date
  reads!: Table<ReadRow, string>; // key = id
  config!: Table<{ key: string; value: SrsConfig }, string>;
  gamify!: Table<{ key: string; xp: number }, string>; // key "state"
  notes!: Table<{ wordId: string; text: string }, string>; // mẹo nhớ tự ghi

  constructor() {
    super("french-words");
    this.version(1).stores({
      reviews: "wordId, due, level, state",
      daily: "date",
      reads: "id",
      config: "key",
    });
    this.version(2).stores({ gamify: "key" });
    this.version(3).stores({ notes: "wordId" });
  }
}

export const db = new FrDB();

// ---- Cấu hình SRS ----
export async function getConfig(): Promise<SrsConfig> {
  const row = await db.config.get("srs");
  return { ...DEFAULT_SRS_CONFIG, ...(row?.value ?? {}) };
}
export async function setConfig(patch: Partial<SrsConfig>): Promise<SrsConfig> {
  const cur = await getConfig();
  const value = { ...cur, ...patch };
  await db.config.put({ key: "srs", value });
  // dấu thời gian đổi cài đặt trên MÁY NÀY (để sync cloud biết bên nào mới hơn)
  try {
    localStorage.setItem("fr.cfgUpdatedAt", new Date().toISOString());
  } catch {
    /* bỏ qua */
  }
  return value;
}

// ---- Ngày địa phương "YYYY-MM-DD" ----
export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---- Truy vấn thẻ ----
export async function getReview(wordId: string): Promise<ReviewRecord | undefined> {
  return db.reviews.get(wordId);
}

/** Các thẻ đến hạn (due <= now). Lọc theo cấp nếu truyền level. */
export async function getDueReviews(now = new Date(), level?: number): Promise<ReviewRecord[]> {
  const rows = await db.reviews.where("due").belowOrEqual(now).toArray();
  return level ? rows.filter((r) => r.level === level) : rows;
}

export async function countDue(now = new Date()): Promise<number> {
  return db.reviews.where("due").belowOrEqual(now).count();
}

/** Ôn sớm: các thẻ CHƯA tới hạn (due > now), sắp tới hạn sớm nhất trước. */
export async function getAheadReviews(now = new Date(), limit = 20): Promise<ReviewRecord[]> {
  const rows = await db.reviews.where("due").above(now).toArray();
  rows.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  return rows.slice(0, limit);
}
export async function countAhead(now = new Date()): Promise<number> {
  return db.reviews.where("due").above(now).count();
}

/** Từ "hay quên" (leech): số lần trả lời sai (lapses) từ 3 trở lên. */
export async function getHardReviews(limit = 30): Promise<ReviewRecord[]> {
  const rows = await db.reviews.toArray();
  return rows
    .filter((r) => (r.lapses ?? 0) >= 3)
    .sort((a, b) => (b.lapses ?? 0) - (a.lapses ?? 0))
    .slice(0, limit);
}
export async function countHard(): Promise<number> {
  const rows = await db.reviews.toArray();
  return rows.filter((r) => (r.lapses ?? 0) >= 3).length;
}

/** Tập wordId đã đưa vào học (để loại khỏi "từ mới"). */
export async function learnedIds(): Promise<Set<string>> {
  const keys = await db.reviews.toCollection().primaryKeys();
  return new Set(keys as string[]);
}

export async function newTodayCount(): Promise<number> {
  const row = await db.daily.get(todayStr());
  return row?.newCount ?? 0;
}

// ---- Ghi kết quả một lượt trả lời ----
/**
 * Cập nhật lịch FSRS cho một từ sau khi trả lời.
 * isNew = true nếu đây là lần đầu đưa từ vào học (đếm vào newCount trong ngày).
 */
export async function recordAnswer(opts: {
  wordId: string;
  level: number;
  correct: boolean;
  isNew: boolean;
  rating?: Grade; // chấm theo tốc độ (Lại/Khó/Được/Dễ); bỏ trống = suy từ correct
  now?: Date;
}): Promise<{ prev: ReviewRecord | undefined; next: ReviewRecord }> {
  const now = opts.now ?? new Date();
  const existing = await db.reviews.get(opts.wordId);
  const card = existing ? recordToCard(existing) : newCard(now);
  const next = opts.rating != null ? scheduleRated(card, opts.rating, now) : schedule(card, opts.correct, now);
  const rec: ReviewRecord = {
    wordId: opts.wordId,
    level: opts.level,
    introducedOn: existing?.introducedOn ?? todayStr(now),
    ...cardToRecordFields(next),
  };
  await db.reviews.put(rec);

  // cập nhật thống kê ngày
  const date = todayStr(now);
  await db.transaction("rw", db.daily, async () => {
    const d = (await db.daily.get(date)) ?? { date, reviews: 0, newCount: 0, again: 0 };
    d.reviews += 1;
    if (opts.isNew) d.newCount += 1;
    if (!opts.correct) d.again += 1;
    await db.daily.put(d);
  });
  return { prev: existing, next: rec };
}

/** Hoàn tác lần chấm vừa rồi: khôi phục bản ghi FSRS cũ + trừ lại thống kê ngày. */
export async function undoAnswer(opts: {
  wordId: string;
  prev: ReviewRecord | undefined;
  correct: boolean;
  isNew: boolean;
  now?: Date;
}): Promise<void> {
  if (opts.prev) await db.reviews.put(opts.prev);
  else await db.reviews.delete(opts.wordId);
  const date = todayStr(opts.now ?? new Date());
  await db.transaction("rw", db.daily, async () => {
    const d = await db.daily.get(date);
    if (!d) return;
    d.reviews = Math.max(0, d.reviews - 1);
    if (opts.isNew) d.newCount = Math.max(0, d.newCount - 1);
    if (!opts.correct) d.again = Math.max(0, d.again - 1);
    await db.daily.put(d);
  });
}

// ---- Mẹo nhớ tự ghi (mnemonic) ----
export async function getMnemonic(wordId: string): Promise<string> {
  return (await db.notes.get(wordId))?.text ?? "";
}
export async function setMnemonic(wordId: string, text: string): Promise<void> {
  const t = text.trim();
  if (t) await db.notes.put({ wordId, text: t });
  else await db.notes.delete(wordId);
}

// ---- Gamify (F7): XP tích luỹ + tổng hợp thống kê ----
export async function addXp(n: number): Promise<void> {
  await db.transaction("rw", db.gamify, async () => {
    const row = (await db.gamify.get("state")) ?? { key: "state", xp: 0 };
    row.xp += n;
    await db.gamify.put(row);
  });
}
export async function getXp(): Promise<number> {
  return (await db.gamify.get("state"))?.xp ?? 0;
}
export async function setXp(xp: number): Promise<void> {
  await db.gamify.put({ key: "state", xp });
}

// Chuỗi ngày liên tiếp có hoạt động (kết thúc hôm nay hoặc hôm qua).
export function computeStreak(dates: string[], today = todayStr()): number {
  const set = new Set(dates);
  // ngày bắt đầu đếm: hôm nay nếu có hoạt động, ngược lại hôm qua (cho phép "chưa học hôm nay")
  const d = new Date(today + "T00:00:00");
  if (!set.has(todayStr(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (set.has(todayStr(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export interface ProgressSummary {
  words: number; // tổng từ đã học
  byLevel: Record<number, number>; // số từ đã học theo cấp
  reviews: number; // tổng lượt ôn mọi ngày
  correct: number; // tổng lượt trả lời đúng (reviews - again)
  reads: number; // số bài đã đọc
  xp: number;
  streak: number;
  activeDays: number; // tổng số ngày có học
  matured: number; // số từ nhớ bền (FSRS stability ≥ 21 ngày)
  maxDayReviews: number; // số lượt ôn cao nhất trong 1 ngày
  weekend: boolean; // từng học vào T7/CN
  daily: DailyStat[]; // sắp theo ngày tăng dần
}

export async function progressSummary(): Promise<ProgressSummary> {
  const [reviews, dailyRows, xp, readsCount] = await Promise.all([
    db.reviews.toArray(),
    db.daily.toArray(),
    getXp(),
    db.reads.count(),
  ]);
  const byLevel: Record<number, number> = {};
  for (const r of reviews) byLevel[r.level] = (byLevel[r.level] || 0) + 1;
  const daily = dailyRows.sort((a, b) => a.date.localeCompare(b.date));
  const reviewsTotal = daily.reduce((s, d) => s + d.reviews, 0);
  const correctTotal = daily.reduce((s, d) => s + Math.max(0, d.reviews - d.again), 0);
  const activeDays = daily.filter((d) => d.reviews > 0).length;
  const matured = reviews.filter((r) => (r.stability ?? 0) >= 21).length;
  const maxDayReviews = daily.reduce((m, d) => Math.max(m, d.reviews), 0);
  const weekend = daily.some((d) => {
    const wd = new Date(d.date + "T00:00:00").getDay();
    return d.reviews > 0 && (wd === 0 || wd === 6);
  });
  return {
    words: reviews.length,
    byLevel,
    reviews: reviewsTotal,
    correct: correctTotal,
    reads: readsCount,
    xp,
    streak: computeStreak(daily.map((d) => d.date)),
    activeDays,
    matured,
    maxDayReviews,
    weekend,
    daily,
  };
}

// ---- Tiến độ đọc (F6): bảng reads, có = đã đọc ----
export async function markRead(id: string): Promise<void> {
  await db.reads.put({ id, readAt: new Date().toISOString() });
}
export async function isRead(id: string): Promise<boolean> {
  return (await db.reads.get(id)) != null;
}
export async function readIds(): Promise<Set<string>> {
  const keys = await db.reads.toCollection().primaryKeys();
  return new Set(keys as string[]);
}

/** Câu luyện thêm (sắp xếp câu / chọn giống): chỉ tính vào thống kê ngày, KHÔNG đổi lịch FSRS. */
export async function recordPractice(correct: boolean, now = new Date()): Promise<void> {
  const date = todayStr(now);
  await db.transaction("rw", db.daily, async () => {
    const d = (await db.daily.get(date)) ?? { date, reviews: 0, newCount: 0, again: 0 };
    d.reviews += 1;
    if (!correct) d.again += 1;
    await db.daily.put(d);
  });
}
