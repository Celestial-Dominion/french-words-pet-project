// Service worker: network-first cho HTML (tránh giữ trang cũ), cache-first cho asset tĩnh
// (data JSON, audio, _next). Bump CACHE khi đổi chiến lược để xoá cache cũ.
const CACHE = "fr-words-v2";

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

  if (isNavigation(request)) {
    // Network-first: mạng lỗi/offline → rơi về cache.
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request).then((c) => c || caches.match("/"))),
    );
    return;
  }

  // Asset tĩnh (data/audio/_next…): cache-first, nạp nền khi thiếu.
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
