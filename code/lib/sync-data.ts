// Đồng bộ tiến độ IndexedDB ⇄ Firestore. CHỈ dynamic-import module này (không import tĩnh)
// để Firestore SDK (~227KB) không vào bundle đầu.
//
// Sync THÔNG MINH (tránh full đọc-ghi mỗi lần mở như bản cũ):
//  - Lưu "dấu vân tay" local + updatedAt remote của lần sync trước (localStorage).
//  - Mở app: đọc 1 doc user (nhỏ). Remote không đổi + local không đổi → BỎ QUA (0 chunk).
//  - Remote đổi (máy khác ghi) → kéo chunks + merge.
//  - Local đổi → mới ghi chunks lên (không ghi khi không có gì mới).
import { doc, getDoc, collection, getDocs, writeBatch, getFirestore, type Firestore } from "firebase/firestore";
import { getFbApp } from "./firebase";
import { db, getXp, setXp, getConfig } from "./db";
import type { ReviewRecord, DailyStat, ReadRow, SrsConfig } from "./types";

const CHUNK = 1500;
const STATE_KEY = "fr.syncState"; // { remoteUpdatedAt, fp }

let storeInstance: Firestore | null = null;
async function getStore(): Promise<Firestore | null> {
  const app = await getFbApp();
  if (!app) return null;
  if (!storeInstance) storeInstance = getFirestore(app);
  return storeInstance;
}

// ---- serialize Date ⇄ ISO cho Firestore ----
function revToPlain(r: ReviewRecord) {
  return {
    ...r,
    due: r.due instanceof Date ? r.due.toISOString() : r.due,
    last_review: r.last_review ? (r.last_review instanceof Date ? r.last_review.toISOString() : r.last_review) : null,
  };
}
function revFromPlain(p: Record<string, unknown>): ReviewRecord {
  return {
    ...(p as unknown as ReviewRecord),
    due: new Date(p.due as string),
    last_review: p.last_review ? new Date(p.last_review as string) : undefined,
  };
}

const revScore = (r: ReviewRecord) =>
  (r.reps ?? 0) * 1e13 + new Date(r.last_review ?? r.introducedOn ?? 0).getTime();

function mergeReviews(a: ReviewRecord[], b: ReviewRecord[]): ReviewRecord[] {
  const m = new Map<string, ReviewRecord>();
  for (const r of [...a, ...b]) {
    const cur = m.get(r.wordId);
    if (!cur || revScore(r) > revScore(cur)) m.set(r.wordId, r);
  }
  return [...m.values()];
}
function mergeDaily(a: DailyStat[], b: DailyStat[]): DailyStat[] {
  const m = new Map<string, DailyStat>();
  for (const d of [...a, ...b]) {
    const cur = m.get(d.date);
    // cùng ngày trên 2 máy → lấy max từng chỉ số (xấp xỉ, tránh mất dữ liệu)
    m.set(d.date, cur
      ? { date: d.date, reviews: Math.max(cur.reviews, d.reviews), newCount: Math.max(cur.newCount, d.newCount), again: Math.max(cur.again, d.again) }
      : d);
  }
  return [...m.values()];
}
function mergeReads(a: ReadRow[], b: ReadRow[]): ReadRow[] {
  const m = new Map<string, ReadRow>();
  for (const r of [...a, ...b]) {
    const cur = m.get(r.id);
    if (!cur || r.readAt < cur.readAt) m.set(r.id, r); // giữ lần đọc sớm nhất
  }
  return [...m.values()];
}

// ---- dấu vân tay local: đổi bất kỳ đâu (ôn, học, đọc, XP) → fp đổi ----
interface Fp {
  rc: number; // số review
  mlr: number; // max last_review (ms)
  tr: number; // tổng lượt ôn (daily)
  rd: number; // số bài đã đọc
  xp: number;
  cu: string; // thời điểm đổi cài đặt trên máy này
}
function cfgStamp(): string {
  try {
    return localStorage.getItem("fr.cfgUpdatedAt") ?? "";
  } catch {
    return "";
  }
}
function fpOf(reviews: ReviewRecord[], daily: DailyStat[], reads: ReadRow[], xp: number): Fp {
  let mlr = 0;
  for (const r of reviews) {
    const t = r.last_review ? new Date(r.last_review).getTime() : 0;
    if (t > mlr) mlr = t;
  }
  return { rc: reviews.length, mlr, tr: daily.reduce((s, d) => s + d.reviews, 0), rd: reads.length, xp, cu: cfgStamp() };
}
const fpEq = (a: Fp, b: Fp) =>
  a.rc === b.rc && a.mlr === b.mlr && a.tr === b.tr && a.rd === b.rd && a.xp === b.xp && a.cu === b.cu;

function loadState(): { remoteUpdatedAt: string; fp: Fp } | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveState(remoteUpdatedAt: string, fp: Fp): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ remoteUpdatedAt, fp }));
  } catch {
    /* bỏ qua */
  }
}

export interface SyncResult {
  reviews: number;
  reads: number;
  skipped: boolean; // true = không có gì thay đổi, không đụng chunks
}

/** Đồng bộ 2 chiều có điều kiện: bỏ qua khi cả 2 phía không đổi; chỉ ghi khi local đổi. */
export async function syncNow(uid: string): Promise<SyncResult> {
  const store = await getStore();
  if (!store) throw new Error("Firestore chưa cấu hình");

  // local + fingerprint
  const [localReviews, localDaily, localReads, localXp] = await Promise.all([
    db.reviews.toArray(),
    db.daily.toArray(),
    db.reads.toArray(),
    getXp(),
  ]);
  const localFp = fpOf(localReviews, localDaily, localReads, localXp);
  const state = loadState();

  // remote: 1 doc nhỏ trước
  const userRef = doc(store, "users", uid);
  const snap = await getDoc(userRef);
  const remote = snap.exists() ? snap.data() : {};
  const remoteUpdatedAt = (remote.updatedAt as string) ?? "";

  const remoteChanged = !state || state.remoteUpdatedAt !== remoteUpdatedAt;
  const localChanged = !state || !fpEq(state.fp, localFp);

  // Không gì đổi → thoát sớm, không đọc/ghi chunk nào.
  if (!remoteChanged && !localChanged) {
    return { reviews: localFp.rc, reads: localFp.rd, skipped: true };
  }

  // Kéo remote đầy đủ khi remote đổi (máy khác ghi) hoặc lần đầu.
  const remoteDaily = (remote.daily as DailyStat[]) ?? [];
  const remoteReads = (remote.reads as ReadRow[]) ?? [];
  const remoteXp = (remote.xp as number) ?? 0;
  let remoteReviews: ReviewRecord[] = [];
  if (remoteChanged) {
    const chunkSnap = await getDocs(collection(store, "users", uid, "reviews"));
    chunkSnap.forEach((d) => {
      const items = (d.data().items as Record<string, unknown>[]) ?? [];
      remoteReviews.push(...items.map(revFromPlain));
    });
  }

  // merge (remote không đổi → merged = local; local đã chứa remote từ lần sync trước)
  const reviews = remoteChanged ? mergeReviews(localReviews, remoteReviews) : localReviews;
  const daily = remoteChanged ? mergeDaily(localDaily, remoteDaily) : localDaily;
  const reads = remoteChanged ? mergeReads(localReads, remoteReads) : localReads;
  const xp = remoteChanged ? Math.max(localXp, remoteXp) : localXp;

  // ghi local (chỉ khi có kéo remote về)
  if (remoteChanged) {
    await db.transaction("rw", db.reviews, db.daily, db.reads, db.gamify, async () => {
      await db.reviews.bulkPut(reviews);
      await db.daily.bulkPut(daily);
      await db.reads.bulkPut(reads);
      await setXp(xp);
    });
    // cài đặt: máy nào đổi sau thì thắng
    const remoteCfg = remote.config as SrsConfig | undefined;
    const remoteCfgAt = (remote.configUpdatedAt as string) ?? "";
    if (remoteCfg && remoteCfgAt && remoteCfgAt > cfgStamp()) {
      await db.config.put({ key: "srs", value: remoteCfg });
      try {
        localStorage.setItem("fr.cfgUpdatedAt", remoteCfgAt);
      } catch {
        /* bỏ qua */
      }
    }
  }

  // ghi remote CHỈ khi local có thay đổi thật (hoặc lần đầu chưa có remote)
  let finalRemoteUpdatedAt = remoteUpdatedAt;
  if (localChanged || !snap.exists()) {
    const chunks: ReviewRecord[][] = [];
    for (let i = 0; i < reviews.length; i += CHUNK) chunks.push(reviews.slice(i, i + CHUNK));
    finalRemoteUpdatedAt = new Date().toISOString();
    const cfg = await getConfig();
    const batch = writeBatch(store);
    batch.set(userRef, {
      daily, reads, xp, reviewChunks: chunks.length, updatedAt: finalRemoteUpdatedAt,
      config: cfg, configUpdatedAt: cfgStamp() || finalRemoteUpdatedAt,
    });
    chunks.forEach((c, i) => batch.set(doc(store, "users", uid, "reviews", String(i)), { items: c.map(revToPlain) }));
    // xoá chunk thừa nếu lần này ít hơn lần trước
    const prevChunks = (remote.reviewChunks as number) ?? 0;
    for (let i = chunks.length; i < prevChunks; i++) batch.delete(doc(store, "users", uid, "reviews", String(i)));
    await batch.commit();
  }

  saveState(finalRemoteUpdatedAt, fpOf(reviews, daily, reads, xp));
  return { reviews: reviews.length, reads: reads.length, skipped: false };
}
