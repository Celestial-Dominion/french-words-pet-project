// Đăng nhập Google (phần AUTH — nằm trong first-load, giữ nhẹ).
// Đồng bộ dữ liệu Firestore nằm ở lib/sync-data.ts và CHỈ được dynamic-import
// (auth-sync.tsx) để Firestore SDK không vào bundle đầu.
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { getFb, firebaseEnabled } from "./firebase";

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

export { firebaseEnabled };
