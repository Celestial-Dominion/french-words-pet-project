// Service worker:
//  - HTML điều hướng: stale-while-revalidate (trả cache ngay, tải bản mới cập nhật nền).
//  - /_next/static (JS/CSS có hash bất biến) + data JSON + audio: cache-first (tải tức thì,
//    không chờ mạng) → mở lại app nhanh như HSK. Deploy mới đổi tên file hash nên không kẹt bản cũ.
const CACHE = "fr-words-v5";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isNavigation(request) {
  return request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // HTML điều hướng → stale-while-revalidate: có cache trả NGAY (mở app không chờ mạng),
  // đồng thời tải bản mới cập nhật cache nền (lần mở sau thấy bản mới).
  if (isNavigation(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fresh = fetch(request)
          .then((res) => {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
            return res;
          })
          .catch(() => cached || caches.match("/"));
        return cached || fresh;
      }),
    );
    return;
  }

  // Còn lại (/_next/static, data JSON, audio) → cache-first: có sẵn thì trả ngay,
  // thiếu thì tải mạng rồi lưu. File hash bất biến nên an toàn & nhanh.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        }),
    ),
  );
});
