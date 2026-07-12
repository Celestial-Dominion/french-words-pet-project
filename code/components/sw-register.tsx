"use client";

import { useEffect } from "react";

// Đăng ký service worker (chỉ ở production để không phiền khi dev).
export default function SwRegister() {
  useEffect(() => {
    if (
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* bỏ qua lỗi đăng ký SW */
      });
    }
  }, []);
  return null;
}
