self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("spc-cache-v1").then((cache) => {
      return cache.addAll([
        "/",
        "/index.html",
        "/manifest.json",
        "/pwa-192x192.png",
        "/pwa-512x512.png",
        "/pwa-maskable-512x512.png"
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
