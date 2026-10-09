// Offline support: serve the app from cache, refresh the cache when online.
const CACHE = "xmastree-v2";
const FILES = ["./", "index.html", "proto.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

const APP_URLS = new Set(FILES.map((f) => new URL(f, self.registration.scope).href));

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  url.search = "";
  // Only the app's own files; anything else goes straight to the network.
  if (e.request.method !== "GET" || !APP_URLS.has(url.href)) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const network = fetch(e.request)
      .then((resp) => { if (resp.ok) cache.put(e.request, resp.clone()); return resp; })
      .catch(() => null);
    if (cached) { e.waitUntil(network); return cached; }   // fast + offline; update in background
    return (await network) || (await cache.match("index.html")) || Response.error();
  }));
});
