// Service worker: network-first cho HTML VÀ mã /_next/ (code luôn khớp HTML mới sau deploy),
// cache-first cho asset nội dung ổn định (data JSON, audio). Bump CACHE để xoá cache cũ.
const CACHE = "fr-words-v3";

self.addEventListener("install", (event) => {
  // Kích hoạt ngay bản mới, không chờ tab cũ đóng.
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

// Điều hướng trang (HTML) = network-first: luôn lấy bản mới nhất, offline mới dùng cache.
function isNavigation(request) {
  return request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const sameOrigin = new URL(request.url).origin === self.location.origin;
  if (!sameOrigin) return;

  const url = new URL(request.url);
  // HTML điều hướng + mã build /_next/ → network-first (code luôn khớp HTML mới nhất).
  if (isNavigation(request) || url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() =>
          caches.match(request).then((c) => c || (isNavigation(request) ? caches.match("/") : undefined)),
        ),
    );
    return;
  }

  // Asset nội dung ổn định (data JSON, audio): cache-first, nạp nền khi thiếu.
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
