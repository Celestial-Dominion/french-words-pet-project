// Service worker tối giản, AN TOÀN cho bản static export (đồng bộ cách làm với HSK).
// - Điều hướng: MẠNG-TRƯỚC (luôn thấy bản mới ngay sau deploy); offline → trang đã cache (hoặc "/").
// - Tài nguyên tĩnh + data JSON: stale-while-revalidate (mở lại nhanh, tự cập nhật ngầm).
// - KHÔNG cache /audio (hàng chục nghìn MP3 — đã có Cache-Control immutable của trình duyệt)
//   và KHÔNG đụng cross-origin (Firebase online).
const CACHE = "fr-words-v6";
const PRECACHE = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function cacheable(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/data/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return; // bỏ qua cross-origin
  if (url.pathname.startsWith("/audio/")) return; // audio: để HTTP cache của trình duyệt tự lo

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("/"))),
    );
    return;
  }

  if (cacheable(url)) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const net = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || net;
      }),
    );
  }
});
