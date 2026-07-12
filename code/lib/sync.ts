// Đăng nhập Google + đồng bộ tiến độ (IndexedDB ⇄ Firestore). Merge để dùng nhiều thiết bị.
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { getFb, firebaseEnabled } from "./firebase";
import { db, getXp, setXp } from "./db";
import type { ReviewRecord, DailyStat, ReadRow } from "./types";

const CHUNK = 1500;

export function watchAuth(cb: (user: User | null) => void): () => void {
  const fb = getFb();
  if (!fb) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(fb.auth, cb);
}

export async function googleSignIn(): Promise<User | null> {
  const fb = getFb();
  if (!fb) return null;
  const res = await signInWithPopup(fb.auth, new GoogleAuthProvider());
  return res.user;
}

export async function signOutUser(): Promise<void> {
  const fb = getFb();
  if (fb) await signOut(fb.auth);
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

/** Đồng bộ 2 chiều: kéo remote → merge với local → ghi lại cả local lẫn remote. */
export async function syncNow(uid: string): Promise<{ reviews: number; reads: number }> {
  const fb = getFb();
  if (!fb) throw new Error("Firestore chưa cấu hình");
  const store = fb.db;

  // local
  const [localReviews, localDaily, localReads, localXp] = await Promise.all([
    db.reviews.toArray(),
    db.daily.toArray(),
    db.reads.toArray(),
    getXp(),
  ]);

  // remote
  const userRef = doc(store, "users", uid);
  const snap = await getDoc(userRef);
  const remote = snap.exists() ? snap.data() : {};
  const remoteDaily = (remote.daily as DailyStat[]) ?? [];
  const remoteReads = (remote.reads as ReadRow[]) ?? [];
  const remoteXp = (remote.xp as number) ?? 0;
  let remoteReviews: ReviewRecord[] = [];
  const chunkSnap = await getDocs(collection(store, "users", uid, "reviews"));
  chunkSnap.forEach((d) => {
    const items = (d.data().items as Record<string, unknown>[]) ?? [];
    remoteReviews.push(...items.map(revFromPlain));
  });

  // merge
  const reviews = mergeReviews(localReviews, remoteReviews);
  const daily = mergeDaily(localDaily, remoteDaily);
  const reads = mergeReads(localReads, remoteReads);
  const xp = Math.max(localXp, remoteXp);

  // ghi local
  await db.transaction("rw", db.reviews, db.daily, db.reads, db.gamify, async () => {
    await db.reviews.bulkPut(reviews);
    await db.daily.bulkPut(daily);
    await db.reads.bulkPut(reads);
    await setXp(xp);
  });

  // ghi remote (chia chunk reviews)
  const chunks: ReviewRecord[][] = [];
  for (let i = 0; i < reviews.length; i += CHUNK) chunks.push(reviews.slice(i, i + CHUNK));
  const batch = writeBatch(store);
  batch.set(userRef, { daily, reads, xp, reviewChunks: chunks.length, updatedAt: new Date().toISOString() });
  chunks.forEach((c, i) => batch.set(doc(store, "users", uid, "reviews", String(i)), { items: c.map(revToPlain) }));
  // xoá chunk thừa nếu lần này ít hơn lần trước
  const prevChunks = (remote.reviewChunks as number) ?? 0;
  for (let i = chunks.length; i < prevChunks; i++) batch.delete(doc(store, "users", uid, "reviews", String(i)));
  await batch.commit();

  return { reviews: reviews.length, reads: reads.length };
}

export { firebaseEnabled };
