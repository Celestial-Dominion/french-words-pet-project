"use client";

import { useEffect } from "react";

// Đăng ký service worker sau sự kiện load (không tranh băng thông lúc tải trang) — như HSK.
export default function SwRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    // Bản dev: KHÔNG dùng SW — tên chunk của dev server không băm theo nội dung, SW trả bản cache
    // cũ (stale-while-revalidate) nên sửa code xong tải lại trang vẫn thấy giao diện cũ. Gỡ SW còn sót.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister())).catch(() => {});
      return;
    }
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* bỏ qua lỗi đăng ký SW */
      });
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
