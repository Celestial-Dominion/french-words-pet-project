// Khởi tạo Firebase (client, lười) — theo cách app HSK.
// Config web Firebase là CÔNG KHAI theo thiết kế; bảo mật đến từ Auth + Firestore Rules.
// Chưa cấu hình (thiếu env) → firebaseEnabled=false → app chạy offline-only, không hiện đăng nhập.
// LƯU Ý: file này CHỈ import firebase/app + firebase/auth. Firestore nằm riêng ở
// lib/sync-data.ts (dynamic import) để không kéo ~227KB Firestore SDK vào first-load.
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId);

// UID chủ sở hữu — CHỈ tài khoản này được vào app. Để trống = cho phép mọi tài khoản
// đã đăng nhập (tiện lúc mới setup để lấy UID); đặt lại sau lần đăng nhập đầu để khoá.
export const OWNER_UID = process.env.NEXT_PUBLIC_OWNER_UID ?? "";

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

/** App Firebase dùng chung (auth ở đây; Firestore tự lấy từ app này trong sync-data). */
export function getFbApp(): FirebaseApp | null {
  if (!firebaseEnabled || typeof window === "undefined") return null;
  if (!app) app = getApps()[0] ?? initializeApp(config);
  return app;
}

// Khởi tạo lười, chỉ phía client (tránh chạy khi prerender static export).
export function getFb(): { auth: Auth } | null {
  const a = getFbApp();
  if (!a) return null;
  if (!authInstance) authInstance = getAuth(a);
  return { auth: authInstance };
}
