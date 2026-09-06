const PAW_TRENDS_SHELL_CACHE = "paw-trends-shell-v2";
const PAW_TRENDS_SHELL_URL = "/_shell.html";
const PAW_TRENDS_CORE_URLS = ["/favicon.svg", "/manifest.webmanifest"];

async function cachePawTrendsUrl(cache, url) {
  const response = await fetch(url, { cache: "reload" });
  if (!response.ok) {
    throw new Error(`Could not cache ${url}: ${response.status}`);
  }
  await cache.put(url, response);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAW_TRENDS_SHELL_CACHE);
      const shellResponse = await fetch(PAW_TRENDS_SHELL_URL, {
        cache: "reload",
      });
      const shellMarkup = await shellResponse.clone().text();
      const linkedUrls = Array.from(
        shellMarkup.matchAll(/(?:href|src)="(\/[^"]+)"/g),
        (match) => match[1]
      );
      await cache.put(PAW_TRENDS_SHELL_URL, shellResponse);
      const urlsToCache = [
        ...new Set([...PAW_TRENDS_CORE_URLS, ...linkedUrls]),
      ];
      await Promise.all(
        urlsToCache.map(async (url) => cachePawTrendsUrl(cache, url))
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== PAW_TRENDS_SHELL_CACHE)
          .map(async (cacheName) => caches.delete(cacheName))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    requestUrl.origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(PAW_TRENDS_SHELL_CACHE);
      const cacheKey = requestUrl.pathname;
      const cachedResponse = await cache.match(cacheKey, { ignoreVary: true });

      if (event.request.mode !== "navigate" && cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse.ok) {
          await cache.put(cacheKey, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.mode === "navigate") {
          return await cache.match(PAW_TRENDS_SHELL_URL, { ignoreVary: true });
        }
        return Response.error();
      }
    })()
  );
});
