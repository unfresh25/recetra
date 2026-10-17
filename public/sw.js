// Recetra service worker: the app keeps working in the supermarket without signal.
// Pages and RSC payloads: network first, last copy when offline. Static assets: cache first.
const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const CORE = ["/plan", "/shopping", "/recipes"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(ASSETS));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (!key.endsWith(VERSION)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  // Signing out must not leave the household's data readable on the device.
  if (event.data === "clear-pages") event.waitUntil(caches.delete(PAGES));
  // After sign-in the app asks to warm the main tabs so they open offline.
  if (event.data === "warm-pages") event.waitUntil(warm());
});

async function warm() {
  const cache = await caches.open(PAGES);
  await Promise.all(
    CORE.map(async (path) => {
      try {
        const res = await fetch(path, { credentials: "same-origin" });
        if (res.ok && !res.redirected) await cache.put(path, res);
      } catch {}
    }),
  );
}

const isAsset = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  /^\/(illustrations|stores|icons)\//.test(url.pathname) ||
  /\.(woff2?|png|webp|svg|ico)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/auth") || url.pathname.startsWith("/api")) return;

  if (isAsset(url)) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  const isPage = request.mode === "navigate";
  const isRsc = request.headers.get("RSC") === "1";
  if (!isPage && !isRsc) return;

  // RSC requests vary by router state in the query string: key them by path + RSC flag.
  const key = isRsc ? `${url.pathname}?__rsc` : url.pathname;
  event.respondWith(
    (async () => {
      const cache = await caches.open(PAGES);
      try {
        const res = await fetch(request);
        if (res.ok && !res.redirected) cache.put(key, res.clone());
        // Signing out redirects here: drop the cached household pages.
        if (/^\/(login|welcome)/.test(url.pathname)) await caches.delete(PAGES);
        return res;
      } catch (error) {
        const hit = await cache.match(key);
        if (hit) return hit;
        if (isPage) {
          const fallback = (await cache.match("/shopping")) ?? (await cache.match("/plan"));
          if (fallback) return fallback;
        }
        throw error;
      }
    })(),
  );
});
